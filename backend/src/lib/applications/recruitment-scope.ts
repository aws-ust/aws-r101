import { and, eq, ne, or } from "drizzle-orm";
import { applications } from "../../db/schema";
import { recruitmentYearInt } from "./application-code";
import { officerHuntTermYear } from "../officer-hunt/settings";

/** Application types that go through recruitment: applying, interviews, results. */
export type RecruitmentApplicationType = "position" | "member";

/** R101 recruits staff and members; the officer hunt fills the board, directors and EAs. */
export type RecruitmentTrack = "r101" | "officer_hunt";

export type RecruitmentScope = { track: RecruitmentTrack; year: number };

export function isRecruitmentTrack(value: unknown): value is RecruitmentTrack {
  return value === "r101" || value === "officer_hunt";
}

/** A `?track=` query value: R101 when absent, null when it is not a known track. */
export function parseTrackParam(raw: string | undefined): RecruitmentTrack | null {
  if (raw === undefined || raw === "") return "r101";
  return isRecruitmentTrack(raw) ? raw : null;
}

/**
 * The year a track works in: R101 follows the recruitment year, the officer
 * hunt follows the term its winners will serve (saved in the hunt's setup).
 */
export async function resolveScope(
  track: RecruitmentTrack,
  database?: Parameters<typeof officerHuntTermYear>[0],
): Promise<RecruitmentScope> {
  return {
    track,
    year: track === "officer_hunt" ? await officerHuntTermYear(database) : recruitmentYearInt(),
  };
}

/**
 * Elected officers seeded straight into a seat and advisers have an `officer`
 * application so they can pay and hold a Member ID, but they never took part
 * in recruitment. A hunt winner is also `officer` once results are released,
 * but they came through the hunt, so they stay in its lists. Every recruitment
 * list, count and result query filters with this.
 */
export const recruitmentApplicationsOnly = (track?: RecruitmentTrack) => {
  const recruited = or(
    ne(applications.applicationType, "officer"),
    eq(applications.track, "officer_hunt"),
  );
  return track ? and(eq(applications.track, track), recruited) : recruited;
};

/** A hunt winner is `officer` once released, but it is still the position application they applied with. */
export function asRecruitmentType(
  type: RecruitmentApplicationType | "officer",
  track: RecruitmentTrack = "r101",
): RecruitmentApplicationType {
  if (type === "officer") {
    if (track === "officer_hunt") return "position";
    throw new Error("Officer applications are not part of recruitment.");
  }
  return type;
}
