import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { and, eq, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { applicants, applications, applicationChoices, applicationDocuments, committees, positions } from "../src/db/schema";
import { generateApplicationCode, recruitmentYearInt } from "../src/lib/applications/application-code";
import { applicationKey, configuredBucket, deleteKeys, MAX_DOCUMENT_SIZE_BYTES, s3Client } from "../src/lib/applications/documents";
import { freePlanEndDate } from "../src/lib/core/free-plan";

async function main() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
    },
  });
  // Details transcribed from the CVs and registration forms in applicants/.
  // Missing age, birthday, gender, Facebook, motivation and consent remain unset.
  const records = [
    {
      token: "Gonzales",
      profile: {
        firstName: "Zyro C",
        lastName: "Gonzales",
        email: "zyro.gonzales.cics@ust.edu.ph",
        studentNumber: "2023188641",
        section: "4CSA",
        contactNumber: "+639216052640",
      },
      applicationType: "member" as const,
      portfolioUrl: "https://zyraw-visuals.vercel.app/",
    },
    {
      token: "Agulto",
      profile: {
        firstName: "Delfin Thaddeus C",
        lastName: "Agulto",
        email: "delfinthaddeus.agulto.cics@ust.edu.ph",
        studentNumber: "2024195987",
        section: "3ISB",
        contactNumber: "+639560967725",
      },
      applicationType: "position" as const,
      portfolioUrl: null,
    },
  ];
  const directory = new URL("../../applicants/", import.meta.url);
  const expectedFiles = records.flatMap(({ token }) => [`CV_${token}.pdf`, `Regform_${token}.pdf`]);
  const foundFiles = await readdir(directory);
  const extraFiles = foundFiles.filter((file) => !expectedFiles.includes(file));
  if (extraFiles.length) {
    throw new Error(`Unmapped applicant files: ${extraFiles.join(", ")}. Add their profiles and assignments before importing.`);
  }
  const prepared = await Promise.all(records.map(async (record) => ({
    ...record,
    documents: await Promise.all((["resume", "registration"] as const).map(async (documentType) => {
      const fileName = `${documentType === "resume" ? "CV" : "Regform"}_${record.token}.pdf`;
      const body = await readFile(new URL(fileName, directory));
      if (body.subarray(0, 5).toString() !== "%PDF-" || body.length > MAX_DOCUMENT_SIZE_BYTES) {
        throw new Error(`${fileName} must be a PDF no larger than ${MAX_DOCUMENT_SIZE_BYTES} bytes.`);
      }
      return { documentType, fileName, body };
    })),
  })));
  const recruitmentYear = recruitmentYearInt();
  if (values["dry-run"]) {
    console.log(JSON.stringify({
      directory: fileURLToPath(directory),
      recruitmentYear,
      applicants: prepared.map(({ documents, token, ...record }) => ({
        ...record,
        status: record.applicationType === "member" ? "approved" : "pending",
        firstChoice: record.applicationType === "position" ? "Media Committee Staff" : null,
        documents: documents.map(({ body, ...document }) => ({ ...document, fileSizeBytes: body.length })),
      })),
    }, null, 2));
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const bucket = configuredBucket();
  const storage = s3Client();
  const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  const database = drizzle(client);
  const uploadedKeys: string[] = [];
  try {
    const results = await database.transaction(async (tx) => {
      // Serialize reruns: applicant email/student number have no unique constraint.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(2026, 1003)`);
      const mediaPositions = await tx.select({ id: positions.id }).from(positions)
        .innerJoin(committees, eq(positions.committeeId, committees.id))
        .where(and(eq(committees.name, "Media Committee"), eq(positions.name, "Media Committee Staff")));
      if (mediaPositions.length !== 1) throw new Error("Expected one Media Committee Staff position. Configure it before importing.");
      const results: string[] = [];
      for (const record of prepared) {
        const matches = await tx.select().from(applicants).where(or(
          eq(applicants.studentNumber, record.profile.studentNumber),
          sql`lower(${applicants.email}) = ${record.profile.email}`,
        ));
        if (matches.length > 1) throw new Error(`Multiple applicant records match ${record.token}; resolve them before importing.`);
        const existing = matches[0];
        if (existing) {
          const [application] = await tx.select().from(applications).where(and(
            eq(applications.applicantId, existing.id), eq(applications.recruitmentYear, recruitmentYear),
          ));
          if (application) {
            results.push(`Skipped ${record.token}: existing application ${application.applicationCode}`);
            continue;
          }
        }
        const applicantId = existing?.id ?? randomUUID();
        if (!existing) await tx.insert(applicants).values({ id: applicantId, ...record.profile });
        const applicationId = randomUUID();
        let applicationCode = generateApplicationCode();
        while ((await tx.select({ id: applications.id }).from(applications).where(eq(applications.applicationCode, applicationCode))).length) {
          applicationCode = generateApplicationCode();
        }
        await tx.insert(applications).values({
          id: applicationId, applicantId, applicationCode, recruitmentYear,
          applicationType: record.applicationType,
          status: record.applicationType === "member" ? "approved" : "pending",
          portfolioUrl: record.portfolioUrl,
        });
        if (record.applicationType === "position") {
          await tx.insert(applicationChoices).values({ applicationId, positionId: mediaPositions[0].id, preferenceRank: 1 });
        }
        for (const document of record.documents) {
          const key = applicationKey(applicationId, document.documentType);
          uploadedKeys.push(key);
          await storage.send(new PutObjectCommand({
            Bucket: bucket, Key: key, Body: document.body,
            ContentType: "application/pdf", ServerSideEncryption: "AES256",
          }));
          await tx.insert(applicationDocuments).values({
            applicationId, documentType: document.documentType, fileName: document.fileName,
            fileSizeBytes: document.body.length, s3Key: key, availableUntil: freePlanEndDate(),
          });
        }
        results.push(`Imported ${record.token}: ${applicationCode} (${record.applicationType === "member" ? "member" : "Media Committee Staff"})`);
      }
      return results;
    });
    console.log(results.join("\n"));
  } catch (error) {
    await deleteKeys(uploadedKeys).catch((cleanupError) => console.error("Failed to clean up uploaded PDFs:", cleanupError));
    throw error;
  } finally {
    storage.destroy();
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
