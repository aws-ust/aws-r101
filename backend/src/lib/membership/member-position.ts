const OFFICE_PREFIX = "Office of the ";

/**
 * The title printed on a member's ID. Executive office staff are shown as
 * "Executive Assistant to the <Officer>", committee staff by their position
 * name, and everyone else as a general member.
 */
export function memberPositionLabel(input: {
  applicationType: "position" | "member" | "officer";
  /** The seat title of an officer or adviser, e.g. "Chief Executive Officer". */
  officerTitle?: string | null;
  applicationStatus: "pending" | "approved" | "rejected";
  positionName: string | null;
  committeeName: string | null;
}) {
  if (input.applicationType === "officer") return input.officerTitle ?? "Officer";
  const acceptedIntoPosition =
    input.applicationType === "position" &&
    input.applicationStatus === "approved" &&
    input.positionName;
  if (!acceptedIntoPosition) return "General Member";
  if (input.committeeName?.startsWith(OFFICE_PREFIX)) {
    return `Executive Assistant to the ${input.committeeName.slice(OFFICE_PREFIX.length)}`;
  }
  return input.positionName ?? "General Member";
}
