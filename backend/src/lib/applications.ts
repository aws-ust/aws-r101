import { and, desc, eq, exists, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import {
  applicants,
  applicationChoices,
  applicationDocuments,
  applications,
  committees,
  positions,
  uploadSessions,
} from "../db/schema";
import {
  applicationKey,
  copyIncomingDocuments,
  deleteKeys,
  incomingKey,
  validateIncomingDocument,
} from "./documents";
import { freePlanEndDate } from "./free-plan";
import {
  generateApplicationCode,
  recruitmentYearInt,
} from "./application-code";

export type ApplicationStatus = "pending" | "approved" | "rejected";
export type DocumentType = "resume" | "transcript";

export type ApplicationChoiceJson = {
  preferenceRank: 1 | 2;
  positionId: string;
  committee: string;
  title: string;
};

export type ApplicationDocumentJson = {
  documentType: DocumentType;
  fileName: string;
  fileSizeBytes: number;
  uploadedAt: string;
  availableUntil: string;
};

export type ApplicationJson = {
  id: string;
  applicationCode: string;
  status: ApplicationStatus;
  submittedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  age: number | null;
  section: string | null;
  motivation: string;
  choices: ApplicationChoiceJson[];
  documents: ApplicationDocumentJson[];
};

export type CreateApplicationInput = {
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  section: string;
  motivation: string;
  choices: { positionId: string; preferenceRank: 1 | 2 }[];
  uploadSessionId: string;
};

export type ListFilters = {
  committee?: string;
  position?: string;
  section?: string;
};

export class ApplicationAlreadySubmittedError extends Error {
  constructor() {
    super(
      "You already submitted an application for this recruitment cycle. Only one application per year is allowed.",
    );
    this.name = "ApplicationAlreadySubmittedError";
  }
}

function isApplicationCodeCollision(err: unknown): boolean {
  const inspect = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false;
    const record = value as Record<string, unknown>;
    if (
      record.constraint_name === "applications_application_code_key" ||
      record.constraint_name === "applications_application_code_unique"
    ) {
      return true;
    }
    if (typeof record.message === "string") {
      const message = record.message.toLowerCase();
      return (
        message.includes("application_code") &&
        (message.includes("unique") || message.includes("duplicate"))
      );
    }
    return false;
  };

  if (inspect(err)) return true;
  if (err instanceof Error) {
    if (inspect(err.cause)) return true;
    const message = err.message.toLowerCase();
    return (
      message.includes("application_code") &&
      (message.includes("unique") || message.includes("duplicate"))
    );
  }
  return false;
}

type ApplicationRow = {
  id: string;
  applicationCode: string;
  status: ApplicationStatus;
  submittedAt: Date;
  firstName: string;
  lastName: string;
  email: string;
  age: number | null;
  section: string | null;
  motivation: string;
};

function iso(value: Date): string {
  return value.toISOString();
}

async function attachRelations(
  rows: ApplicationRow[],
): Promise<ApplicationJson[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);

  const choiceRows = await db
    .select({
      applicationId: applicationChoices.applicationId,
      preferenceRank: applicationChoices.preferenceRank,
      positionId: applicationChoices.positionId,
      committee: committees.name,
      title: positions.name,
    })
    .from(applicationChoices)
    .innerJoin(positions, eq(applicationChoices.positionId, positions.id))
    .innerJoin(committees, eq(positions.committeeId, committees.id))
    .where(inArray(applicationChoices.applicationId, ids));

  const documentRows = await db
    .select({
      applicationId: applicationDocuments.applicationId,
      documentType: applicationDocuments.documentType,
      fileName: applicationDocuments.fileName,
      fileSizeBytes: applicationDocuments.fileSizeBytes,
      uploadedAt: applicationDocuments.uploadedAt,
      availableUntil: applicationDocuments.availableUntil,
    })
    .from(applicationDocuments)
    .where(inArray(applicationDocuments.applicationId, ids));

  const choicesByApp = new Map<string, ApplicationChoiceJson[]>();
  for (const choice of choiceRows) {
    const list = choicesByApp.get(choice.applicationId) ?? [];
    list.push({
      preferenceRank: choice.preferenceRank as 1 | 2,
      positionId: choice.positionId,
      committee: choice.committee,
      title: choice.title,
    });
    choicesByApp.set(choice.applicationId, list);
  }

  const documentsByApp = new Map<string, ApplicationDocumentJson[]>();
  for (const doc of documentRows) {
    const list = documentsByApp.get(doc.applicationId) ?? [];
    list.push({
      documentType: doc.documentType,
      fileName: doc.fileName,
      fileSizeBytes: doc.fileSizeBytes,
      uploadedAt: iso(doc.uploadedAt),
      availableUntil: iso(doc.availableUntil ?? freePlanEndDate() ?? new Date(0)),
    });
    documentsByApp.set(doc.applicationId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    applicationCode: row.applicationCode,
    status: row.status,
    submittedAt: iso(row.submittedAt),
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    age: row.age,
    section: row.section,
    motivation: row.motivation,
    choices: (choicesByApp.get(row.id) ?? []).sort(
      (a, b) => a.preferenceRank - b.preferenceRank,
    ),
    documents: documentsByApp.get(row.id) ?? [],
  }));
}

const applicationSelect = {
  id: applications.id,
  applicationCode: applications.applicationCode,
  status: applications.status,
  submittedAt: applications.submittedAt,
  firstName: applicants.firstName,
  lastName: applicants.lastName,
  email: applicants.email,
  age: applicants.age,
  section: applicants.section,
  motivation: applications.motivation,
};

export async function getApplicationById(
  id: string,
): Promise<ApplicationJson | null> {
  const rows = await db
    .select(applicationSelect)
    .from(applications)
    .innerJoin(applicants, eq(applications.applicantId, applicants.id))
    .where(eq(applications.id, id))
    .limit(1);

  if (rows.length === 0) return null;
  const [mapped] = await attachRelations(rows);
  return mapped;
}

export async function getApplicationDocument(
  applicationId: string,
  type: DocumentType,
): Promise<{
  fileName: string;
  s3Key: string;
  availableUntil: Date | null;
} | null> {
  const [document] = await db
    .select({
      fileName: applicationDocuments.fileName,
      s3Key: applicationDocuments.s3Key,
      availableUntil: applicationDocuments.availableUntil,
    })
    .from(applicationDocuments)
    .where(
      and(
        eq(applicationDocuments.applicationId, applicationId),
        eq(applicationDocuments.documentType, type),
      ),
    )
    .limit(1);
  return document ?? null;
}

export async function listApplications(filters: ListFilters): Promise<{
  applications: ApplicationJson[];
  total: number;
}> {
  const conditions = [];

  if (filters.section) {
    conditions.push(eq(applicants.section, filters.section));
  }

  if (filters.committee) {
    conditions.push(
      exists(
        db
          .select({ id: applicationChoices.id })
          .from(applicationChoices)
          .innerJoin(positions, eq(applicationChoices.positionId, positions.id))
          .where(
            and(
              eq(applicationChoices.applicationId, applications.id),
              eq(positions.committeeId, filters.committee),
            ),
          ),
      ),
    );
  }

  if (filters.position) {
    conditions.push(
      exists(
        db
          .select({ id: applicationChoices.id })
          .from(applicationChoices)
          .where(
            and(
              eq(applicationChoices.applicationId, applications.id),
              eq(applicationChoices.positionId, filters.position),
            ),
          ),
      ),
    );
  }

  const rows = await db
    .select(applicationSelect)
    .from(applications)
    .innerJoin(applicants, eq(applications.applicantId, applicants.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(applications.submittedAt));

  const mapped = await attachRelations(rows);
  return { applications: mapped, total: mapped.length };
}

export async function positionsExist(positionIds: string[]): Promise<boolean> {
  if (positionIds.length === 0) return false;
  const uniqueIds = [...new Set(positionIds)];
  const rows = await db
    .select({ id: positions.id })
    .from(positions)
    .where(inArray(positions.id, uniqueIds));
  return rows.length === uniqueIds.length;
}

export async function createApplication(
  input: CreateApplicationInput,
): Promise<{ application: ApplicationJson; created: boolean }> {
  let copiedApplicationId: string | null = null;
  let transactionComplete = false;
  try {
    const result = await db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(uploadSessions)
        .where(eq(uploadSessions.id, input.uploadSessionId))
        .for("update");

      if (!session) throw new Error("Upload session was not found.");
      if (session.status === "consumed" && session.applicationId) {
        return { id: session.applicationId, created: false };
      }
      if (session.status !== "active" || session.expiresAt <= new Date()) {
        if (session.status === "active") {
          await tx
            .update(uploadSessions)
            .set({ status: "expired" })
            .where(eq(uploadSessions.id, session.id));
        }
        throw new Error("Upload session has expired.");
      }

      const documents = [
        {
          documentType: "resume" as const,
          fileName: session.resumeFileName,
          sizeBytes: session.resumeSizeBytes,
          checksumSha256: session.resumeChecksumSha256,
        },
        {
          documentType: "transcript" as const,
          fileName: session.transcriptFileName,
          sizeBytes: session.transcriptSizeBytes,
          checksumSha256: session.transcriptChecksumSha256,
        },
      ];
      await Promise.all(
        documents.map((document) => validateIncomingDocument(session.id, document)),
      );

      const applicationId = randomUUID();
      copiedApplicationId = applicationId;
      await copyIncomingDocuments(session.id, applicationId);

    const existing = await tx
      .select({ id: applicants.id })
      .from(applicants)
      .where(eq(applicants.email, input.email))
      .limit(1);

    let applicantId = existing[0]?.id;
    if (!applicantId) {
      const [inserted] = await tx
        .insert(applicants)
        .values({
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          age: input.age,
          section: input.section,
        })
        .returning({ id: applicants.id });
      applicantId = inserted.id;
    }

    const recruitmentYear = recruitmentYearInt();
    const [existingForCycle] = await tx
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.applicantId, applicantId),
          eq(applications.recruitmentYear, recruitmentYear),
        ),
      )
      .limit(1);

    if (existingForCycle) {
      throw new ApplicationAlreadySubmittedError();
    }

    const [application] = await (async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          return await tx
            .insert(applications)
            .values({
              id: applicationId,
              applicantId,
              applicationCode: generateApplicationCode(),
              recruitmentYear,
              status: "pending",
              motivation: input.motivation,
            })
            .returning({ id: applications.id });
        } catch (err) {
          if (!isApplicationCodeCollision(err)) {
            throw err;
          }
        }
      }
      throw new Error("Could not generate a unique application code");
    })();

    await tx.insert(applicationChoices).values(
      input.choices.map((choice) => ({
        applicationId: application.id,
        positionId: choice.positionId,
        preferenceRank: choice.preferenceRank,
      })),
    );

    await tx.insert(applicationDocuments).values(
      documents.map((doc) => ({
        applicationId: application.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileSizeBytes: doc.sizeBytes,
        s3Key: applicationKey(application.id, doc.documentType),
        availableUntil: freePlanEndDate(),
      })),
    );

      await tx
        .update(uploadSessions)
        .set({
          status: "consumed",
          applicationId: application.id,
          consumedAt: new Date(),
        })
        .where(eq(uploadSessions.id, session.id));

      return { id: application.id, created: true };
    });
    transactionComplete = true;

    if (result.created) {
      await deleteKeys([
        incomingKey(input.uploadSessionId, "resume"),
        incomingKey(input.uploadSessionId, "transcript"),
      ]).catch((error) => console.error("Could not remove incoming documents", error));
    }
    const application = await getApplicationById(result.id);
    if (!application) throw new Error("Created application could not be loaded.");
    return { application, created: result.created };
  } catch (error) {
    if (!transactionComplete && copiedApplicationId) {
      await deleteKeys([
        applicationKey(copiedApplicationId, "resume"),
        applicationKey(copiedApplicationId, "transcript"),
      ]).catch(() => undefined);
    }
    throw error;
  }
}

export async function updateApplicationStatus(
  id: string,
  status: "approved" | "rejected",
): Promise<ApplicationJson | null> {
  const [updated] = await db
    .update(applications)
    .set({ status, reviewedAt: new Date() })
    .where(eq(applications.id, id))
    .returning({ id: applications.id });

  if (!updated) return null;
  return getApplicationById(updated.id);
}

export async function deleteApplication(id: string): Promise<boolean> {
  const documents = await db
    .select({ s3Key: applicationDocuments.s3Key })
    .from(applicationDocuments)
    .where(eq(applicationDocuments.applicationId, id));
  const deleted = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: applications.id,
        applicantId: applications.applicantId,
      })
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);
    if (!row) return false;

    await tx.delete(applications).where(eq(applications.id, id));

    const remaining = await tx
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.applicantId, row.applicantId))
      .limit(1);
    if (remaining.length === 0) {
      await tx.delete(applicants).where(eq(applicants.id, row.applicantId));
    }
    return true;
  });
  if (deleted && documents.length > 0) {
    await deleteKeys(documents.map((document) => document.s3Key));
  }
  return deleted;
}
