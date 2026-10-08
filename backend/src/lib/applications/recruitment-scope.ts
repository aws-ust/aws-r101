import { ne } from "drizzle-orm";
import { applications } from "../../db/schema";

/** Application types that go through recruitment: applying, interviews, results. */
export type RecruitmentApplicationType = "position" | "member";

/**
 * Elected officers and advisers have an `officer` application so they can pay
 * and hold a Member ID, but they are never part of recruitment. Every
 * recruitment list, count and result query filters with this.
 */
export const recruitmentApplicationsOnly = () =>
  ne(applications.applicationType, "officer");

export function asRecruitmentType(
  type: RecruitmentApplicationType | "officer",
): RecruitmentApplicationType {
  if (type === "officer") {
    throw new Error("Officer applications are not part of recruitment.");
  }
  return type;
}
