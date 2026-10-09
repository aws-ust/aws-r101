import { getOfficerHuntSettings } from "../officer-hunt/settings";
import { getRecruitmentWindow, type RecruitmentWindow } from "../recruitment/window";
import type { RecruitmentTrack } from "./recruitment-scope";

type RecruitmentWindowDatabase = NonNullable<
  Parameters<typeof getRecruitmentWindow>[0]
>;

type ApplicationState = {
  /** Which round's dates apply; R101's when absent. */
  track?: RecruitmentTrack;
  status: "pending" | "approved" | "rejected";
  archivedAt: Date | null;
  resultsReleasedAt: Date | null;
};

type ChoiceState = {
  decisionStatus: "pending" | "approved" | "rejected";
};

export type ApplicantEditBlockCode =
  | "archived"
  | "results_released"
  | "application_closed"
  | "review_started"
  | "choices_incomplete"
  | "deadline_unavailable"
  | "recruitment_not_started"
  | "deadline_passed";

export type ApplicantEditEligibility = {
  canEdit: boolean;
  editDeadline: string | null;
  lockReason: string | null;
  blockCode: ApplicantEditBlockCode | null;
};

export function getApplicantEditEligibility(
  application: ApplicationState,
  choices: ChoiceState[],
  window: RecruitmentWindow | null,
  now = new Date(),
): ApplicantEditEligibility {
  const editDeadline = window?.endsAt.toISOString() ?? null;
  const blocked = (
    blockCode: ApplicantEditBlockCode,
    lockReason: string,
  ): ApplicantEditEligibility => ({
    canEdit: false,
    editDeadline,
    lockReason,
    blockCode,
  });

  if (application.archivedAt) {
    return blocked("archived", "This application is archived.");
  }
  if (application.resultsReleasedAt) {
    return blocked(
      "results_released",
      "This application can no longer be edited because results were released.",
    );
  }
  if (application.status !== "pending") {
    return blocked(
      "application_closed",
      "This application can no longer be edited.",
    );
  }
  if (choices.length !== 2) {
    return blocked(
      "choices_incomplete",
      "Application editing is unavailable because its choices are incomplete.",
    );
  }
  if (choices.some((choice) => choice.decisionStatus !== "pending")) {
    return blocked(
      "review_started",
      "Application editing is locked because HR review has started.",
    );
  }
  if (!window) {
    return blocked(
      "deadline_unavailable",
      "Application editing is not configured.",
    );
  }
  if (now.getTime() < window.startsAt.getTime()) {
    return blocked(
      "recruitment_not_started",
      "Recruitment has not started.",
    );
  }
  if (now.getTime() >= window.endsAt.getTime()) {
    return blocked(
      "deadline_passed",
      "Recruitment week has ended. You can no longer edit your application.",
    );
  }

  return {
    canEdit: true,
    editDeadline,
    lockReason: null,
    blockCode: null,
  };
}

/** The officer hunt's application period, in the same shape as R101's window. */
async function getOfficerHuntApplicationWindow(): Promise<RecruitmentWindow | null> {
  const settings = await getOfficerHuntSettings();
  return settings?.applicationsOpenAt && settings.applicationsCloseAt
    ? { startsAt: settings.applicationsOpenAt, endsAt: settings.applicationsCloseAt }
    : null;
}

export async function resolveApplicantEditEligibility(
  application: ApplicationState,
  choices: ChoiceState[],
  options: {
    database?: RecruitmentWindowDatabase;
    now?: Date;
  } = {},
) {
  return getApplicantEditEligibility(
    application,
    choices,
    application.track === "officer_hunt"
      ? await getOfficerHuntApplicationWindow()
      : await getRecruitmentWindow(options.database),
    options.now,
  );
}
