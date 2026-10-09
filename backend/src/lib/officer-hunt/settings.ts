import { eq } from "drizzle-orm";
import { db } from "../../db";
import { officerHuntSettings, users } from "../../db/schema";
import {
  getRecruitmentSeasonStatus,
  type RecruitmentSeasonStatus,
} from "../recruitment/window";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
/** The connection pool holds one connection, so code inside a transaction must read through it. */
type Database = typeof db | DbTransaction;

export type OfficerHuntSettings = {
  termYear: number;
  applicationsOpenAt: Date | null;
  applicationsCloseAt: Date | null;
  interviewsStartAt: Date | null;
  interviewsEndAt: Date | null;
};

export type OfficerHuntSettingsPayload = {
  termYear: number | null;
  applicationsOpenAt: string | null;
  applicationsCloseAt: string | null;
  interviewsStartAt: string | null;
  interviewsEndAt: string | null;
};

export class OfficerHuntError extends Error {
  constructor(
    public readonly code: "not_configured" | "invalid_range" | "invalid_year",
    message: string,
  ) {
    super(message);
    this.name = "OfficerHuntError";
  }
}

export async function getOfficerHuntSettings(
  database: Database = db,
): Promise<OfficerHuntSettings | null> {
  const [row] = await database
    .select({
      termYear: officerHuntSettings.termYear,
      applicationsOpenAt: officerHuntSettings.applicationsOpenAt,
      applicationsCloseAt: officerHuntSettings.applicationsCloseAt,
      interviewsStartAt: officerHuntSettings.interviewsStartAt,
      interviewsEndAt: officerHuntSettings.interviewsEndAt,
    })
    .from(officerHuntSettings)
    .where(eq(officerHuntSettings.singleton, 1))
    .limit(1);
  return row ?? null;
}

/** The term the hunt is filling. Throws until HR has saved the hunt's setup. */
export async function officerHuntTermYear(database: Database = db): Promise<number> {
  const settings = await getOfficerHuntSettings(database);
  if (!settings) {
    throw new OfficerHuntError("not_configured", "The officer hunt has not been set up yet.");
  }
  return settings.termYear;
}

export function toSettingsPayload(settings: OfficerHuntSettings | null): OfficerHuntSettingsPayload {
  return {
    termYear: settings?.termYear ?? null,
    applicationsOpenAt: settings?.applicationsOpenAt?.toISOString() ?? null,
    applicationsCloseAt: settings?.applicationsCloseAt?.toISOString() ?? null,
    interviewsStartAt: settings?.interviewsStartAt?.toISOString() ?? null,
    interviewsEndAt: settings?.interviewsEndAt?.toISOString() ?? null,
  };
}

/** Whether people can apply right now, in the same shape R101 uses. */
export function officerHuntSeasonStatus(
  settings: OfficerHuntSettings | null,
  now = new Date(),
): RecruitmentSeasonStatus {
  const window =
    settings?.applicationsOpenAt && settings.applicationsCloseAt
      ? { startsAt: settings.applicationsOpenAt, endsAt: settings.applicationsCloseAt }
      : null;
  const status = getRecruitmentSeasonStatus(window, now);
  if (status.code === "recruitment_not_started") {
    return { ...status, message: "The officer hunt has not started." };
  }
  if (status.code === "deadline_passed") {
    return { ...status, message: "The officer hunt has ended. New applications are closed." };
  }
  return status;
}

export type OfficerHuntSettingsInput = {
  termYear: number;
  applicationsOpenAt: Date | null;
  applicationsCloseAt: Date | null;
  interviewsStartAt: Date | null;
  interviewsEndAt: Date | null;
};

function assertOrdered(start: Date | null, end: Date | null, what: string) {
  if (start && end && end.getTime() <= start.getTime()) {
    throw new OfficerHuntError("invalid_range", `${what} must end after it starts.`);
  }
}

export async function saveOfficerHuntSettings(
  input: OfficerHuntSettingsInput,
  updatedByEmail?: string,
): Promise<OfficerHuntSettingsPayload> {
  if (!Number.isInteger(input.termYear) || input.termYear < 2000 || input.termYear > 9999) {
    throw new OfficerHuntError("invalid_year", "Enter a valid term year.");
  }
  assertOrdered(input.applicationsOpenAt, input.applicationsCloseAt, "The application period");
  assertOrdered(input.interviewsStartAt, input.interviewsEndAt, "The interview period");

  let updatedBy: string | null = null;
  if (updatedByEmail) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, updatedByEmail.trim().toLowerCase()))
      .limit(1);
    updatedBy = user?.id ?? null;
  }
  await db
    .insert(officerHuntSettings)
    .values({ singleton: 1, ...input, updatedBy })
    .onConflictDoUpdate({
      target: officerHuntSettings.singleton,
      set: { ...input, updatedBy },
    });
  return toSettingsPayload(await getOfficerHuntSettings());
}
