import { eq } from "drizzle-orm";
import { db } from "../../db";
import { applicants, applications, officerSeats } from "../../db/schema";
import {
  isValidSection,
  isValidStudentNumber,
  normalizeSection,
} from "../apply/field-validation";
import { MembershipPaymentError } from "./errors";

export type OfficerDetailsInput = { studentNumber: string; section: string };

/** The student number and section printed on an officer's ID card. */
export async function updateOfficerDetails(
  applicationId: string,
  input: OfficerDetailsInput,
) {
  const studentNumber = input.studentNumber.trim();
  const section = normalizeSection(input.section);
  if (!isValidStudentNumber(studentNumber)) {
    throw new MembershipPaymentError("Student number must be exactly 10 digits.");
  }
  if (!isValidSection(section)) {
    throw new MembershipPaymentError(
      "Section must be four characters: year digit plus three letters (e.g. 4CSC).",
    );
  }
  const [row] = await db
    .select({ applicantId: applications.applicantId, kind: officerSeats.kind })
    .from(applications)
    .leftJoin(officerSeats, eq(officerSeats.applicationId, applications.id))
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!row?.kind) {
    throw new MembershipPaymentError("Only officers can update these details.", 403);
  }
  await db
    .update(applicants)
    .set({ studentNumber, section })
    .where(eq(applicants.id, row.applicantId));
  return { studentNumber, section };
}
