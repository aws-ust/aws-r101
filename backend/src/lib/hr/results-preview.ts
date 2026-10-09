import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  applicants,
  applicationChoices,
  applications,
  committees,
  officerSeats,
  positions,
} from "../../db/schema";
import {
  asRecruitmentType,
  recruitmentApplicationsOnly,
  resolveScope,
  type RecruitmentTrack,
} from "../applications/recruitment-scope";
import type {
  ApplicationStatus,
  ApplicationType,
} from "../applications/applications";

export type ResultClassification =
  | "accepted"
  | "rejected"
  | "incomplete"
  | "redirected";
export type ChoiceDecisionStatus = "pending" | "approved" | "rejected";

export type ResultPreviewChoice = {
  preferenceRank: 1 | 2;
  positionId: string;
  title: string;
  committeeId: string;
  committee: string;
  decisionStatus: ChoiceDecisionStatus;
};

export type ResultPreviewApplication = {
  id: string;
  applicationCode: string;
  applicationType: ApplicationType;
  applicant: {
    fullName: string;
    email: string;
  };
  applicationStatus: ApplicationStatus;
  submittedAt: string;
  classification: ResultClassification;
  blockingReason: string | null;
  finalPlacement: {
    positionId: string;
    title: string;
    committeeId: string;
    committee: string;
  } | null;
  choices: ResultPreviewChoice[];
  willGenerateMemberId: boolean;
  willSendEmail: boolean;
};

type Classification = {
  classification: ResultClassification;
  blockingReason: string | null;
};

function classifyApplication(
  choices: ResultPreviewChoice[],
  finalPositionId: string | null,
): Classification {
  if (choices.length !== 2) {
    return {
      classification: "incomplete",
      blockingReason: "Application must have exactly two position choices.",
    };
  }

  const approvedChoices = choices.filter(
    (choice) => choice.decisionStatus === "approved",
  );

  if (approvedChoices.length === 1) {
    if (!finalPositionId) {
      return {
        classification: "incomplete",
        blockingReason:
          "Final placement is required after a committee approves the applicant.",
      };
    }
    if (approvedChoices[0].positionId === finalPositionId) {
      return { classification: "accepted", blockingReason: null };
    }
    return {
      classification: "incomplete",
      blockingReason: "Final placement must match an approved position choice.",
    };
  }

  if (approvedChoices.length > 1) {
    return {
      classification: "incomplete",
      blockingReason: "Only one committee choice may be approved.",
    };
  }

  if (choices.some((choice) => choice.decisionStatus === "pending")) {
    return {
      classification: "incomplete",
      blockingReason: "All committee decisions must be completed.",
    };
  }

  if (finalPositionId) {
    return {
      classification: "incomplete",
      blockingReason:
        "Final placement must be empty when all choices are rejected.",
    };
  }

  return { classification: "rejected", blockingReason: null };
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A board or director seat has one holder: two winners for it, or a seat that
 * is already filled for the term, would leave the release with nobody to seat.
 */
async function holdSeatConflicts(
  database: typeof db | DbTransaction,
  year: number,
  rows: { id: string; finalPositionId: string | null }[],
  accepted: ResultPreviewApplication[],
) {
  const finalIds = [...new Set(rows.flatMap((row) => (row.finalPositionId ? [row.finalPositionId] : [])))];
  if (finalIds.length === 0) return;
  const seats = await database
    .select({ id: positions.id, kind: positions.seatKind, committee: committees.name })
    .from(positions)
    .innerJoin(committees, eq(positions.committeeId, committees.id))
    .where(inArray(positions.id, finalIds));
  const seatByPosition = new Map(seats.map((seat) => [seat.id, seat]));
  const filled = new Set(
    (
      await database
        .select({ seatKey: officerSeats.seatKey })
        .from(officerSeats)
        .where(eq(officerSeats.recruitmentYear, year))
    ).map((seat) => seat.seatKey),
  );
  const finalByApplication = new Map(rows.map((row) => [row.id, row.finalPositionId]));
  const claimed = new Map<string, number>();
  for (const application of accepted) {
    const seat = seatByPosition.get(finalByApplication.get(application.id) ?? "");
    if (!seat?.kind || seat.kind === "ea" || seat.kind === "adviser") continue;
    claimed.set(seat.committee, (claimed.get(seat.committee) ?? 0) + 1);
  }
  for (const application of accepted) {
    const seat = seatByPosition.get(finalByApplication.get(application.id) ?? "");
    if (!seat?.kind) {
      application.classification = "incomplete";
      application.blockingReason = "The final placement is not an officer seat.";
    } else if (seat.kind !== "ea" && seat.kind !== "adviser") {
      if (filled.has(seat.committee)) {
        application.classification = "incomplete";
        application.blockingReason = "That seat is already filled for this term.";
      } else if ((claimed.get(seat.committee) ?? 0) > 1) {
        application.classification = "incomplete";
        application.blockingReason = "Another accepted applicant holds the same seat.";
      }
    }
    application.willSendEmail = application.classification !== "incomplete";
  }
}

async function queryResultsPreview(
  database: typeof db | DbTransaction,
  lockRows: boolean,
  track: RecruitmentTrack,
) {
  const scope = await resolveScope(track, database);
  const recruitmentYear = scope.year;
  const rowsQuery = database
    .select({
      id: applications.id,
      applicationCode: applications.applicationCode,
      status: applications.status,
      applicationType: applications.applicationType,
      track: applications.track,
      finalPositionId: applications.finalPositionId,
      redirectPositionId: applications.redirectPositionId,
      memberId: applications.memberId,
      resultsReleasedAt: applications.resultsReleasedAt,
      archivedAt: applications.archivedAt,
      submittedAt: applications.submittedAt,
      firstName: applicants.firstName,
      lastName: applicants.lastName,
      email: applicants.email,
    })
    .from(applications)
    .innerJoin(applicants, eq(applications.applicantId, applicants.id))
    .where(
      and(
        eq(applications.recruitmentYear, recruitmentYear),
        recruitmentApplicationsOnly(track),
      ),
    )
    .orderBy(desc(applications.submittedAt));
  const rows = lockRows ? await rowsQuery.for("update") : await rowsQuery;

  const archived = rows.filter((row) => row.archivedAt !== null).length;
  const alreadyReleased = rows.filter(
    (row) => row.archivedAt === null && row.resultsReleasedAt !== null,
  ).length;
  const pendingRows = rows.filter(
    (row) => row.archivedAt === null && row.resultsReleasedAt === null,
  );
  const pendingIds = pendingRows.map((row) => row.id);

  const choiceQuery = database
    .select({
      applicationId: applicationChoices.applicationId,
      preferenceRank: applicationChoices.preferenceRank,
      positionId: applicationChoices.positionId,
      title: positions.name,
      committeeId: committees.id,
      committee: committees.name,
      decisionStatus: applicationChoices.decisionStatus,
    })
    .from(applicationChoices)
    .innerJoin(positions, eq(applicationChoices.positionId, positions.id))
    .innerJoin(committees, eq(positions.committeeId, committees.id))
    .where(inArray(applicationChoices.applicationId, pendingIds));
  const choiceRows =
    pendingIds.length === 0
      ? []
      : lockRows
        ? await choiceQuery.for("update")
        : await choiceQuery;

  const redirectPositionIds = [
    ...new Set(
      pendingRows
        .map((row) => row.redirectPositionId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const redirectPositionQuery = database
    .select({
      id: positions.id,
      title: positions.name,
      committeeId: committees.id,
      committee: committees.name,
    })
    .from(positions)
    .innerJoin(committees, eq(positions.committeeId, committees.id))
    .where(inArray(positions.id, redirectPositionIds));
  const redirectPositionRows =
    redirectPositionIds.length === 0
      ? []
      : lockRows
        ? await redirectPositionQuery.for("update")
        : await redirectPositionQuery;
  const redirectPlacementByPositionId = new Map(
    redirectPositionRows.map((row) => [row.id, row]),
  );

  const choicesByApplication = new Map<string, ResultPreviewChoice[]>();
  for (const row of choiceRows) {
    const choices = choicesByApplication.get(row.applicationId) ?? [];
    choices.push({
      preferenceRank: row.preferenceRank as 1 | 2,
      positionId: row.positionId,
      title: row.title,
      committeeId: row.committeeId,
      committee: row.committee,
      decisionStatus: row.decisionStatus,
    });
    choicesByApplication.set(row.applicationId, choices);
  }

  const previewApplications: ResultPreviewApplication[] = pendingRows.map(
    (row) => {
      const choices = (choicesByApplication.get(row.id) ?? []).sort(
        (a, b) => a.preferenceRank - b.preferenceRank,
      );
      const redirectPlacement = row.redirectPositionId
        ? (redirectPlacementByPositionId.get(row.redirectPositionId) ?? null)
        : null;
      const result: Classification =
        row.applicationType === "member"
          ? row.status === "approved"
            ? { classification: "accepted", blockingReason: null }
            : row.status === "rejected"
              ? { classification: "rejected", blockingReason: null }
              : {
                  classification: "incomplete",
                  blockingReason: "Member-only application must be approved before release.",
                }
          : row.redirectPositionId
            ? redirectPlacement
              ? { classification: "redirected", blockingReason: null }
              : {
                  classification: "incomplete",
                  blockingReason: "Redirect placement position is missing.",
                }
            : classifyApplication(choices, row.finalPositionId);
      const finalChoice = redirectPlacement
        ? {
            positionId: redirectPlacement.id,
            title: redirectPlacement.title,
            committeeId: redirectPlacement.committeeId,
            committee: redirectPlacement.committee,
          }
        : choices.find((choice) => choice.positionId === row.finalPositionId);

      return {
        id: row.id,
        applicationCode: row.applicationCode,
        applicationType: asRecruitmentType(row.applicationType, row.track),
        applicant: {
          fullName: `${row.firstName} ${row.lastName}`,
          email: row.email,
        },
        applicationStatus: row.status,
        submittedAt: row.submittedAt.toISOString(),
        classification: result.classification,
        blockingReason: result.blockingReason,
        finalPlacement: finalChoice
          ? {
              positionId: finalChoice.positionId,
              title: finalChoice.title,
              committeeId: finalChoice.committeeId,
              committee: finalChoice.committee,
            }
          : null,
        choices,
        willGenerateMemberId: false,
        willSendEmail: result.classification !== "incomplete",
      };
    },
  );

  if (track === "officer_hunt") {
    await holdSeatConflicts(
      database,
      recruitmentYear,
      pendingRows,
      previewApplications.filter((application) => application.classification === "accepted"),
    );
  }
  const count = (classification: ResultClassification) =>
    previewApplications.filter((application) => application.classification === classification).length;
  const accepted = count("accepted");
  const rejected = count("rejected");
  const redirected = count("redirected");
  const incomplete = count("incomplete");

  return {
    recruitmentYear,
    summary: {
      pendingRelease: previewApplications.length,
      accepted,
      rejected,
      redirected,
      incomplete,
      alreadyReleased,
      archived,
      canRelease: previewApplications.length > 0 && incomplete === 0,
    },
    applications: previewApplications,
  };
}

export function getResultsPreview(track: RecruitmentTrack = "r101") {
  return queryResultsPreview(db, false, track);
}

export function getResultsPreviewForUpdate(
  transaction: DbTransaction,
  track: RecruitmentTrack = "r101",
) {
  return queryResultsPreview(transaction, true, track);
}
