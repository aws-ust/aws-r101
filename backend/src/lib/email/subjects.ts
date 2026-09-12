/** Applicant access code — sent only after matching an Application ID and email. */
export function applicantOtpSubject(applicationCode: string): string {
  return `AWS Builders - UST | Verification code (${applicationCode})`;
}

/** Application submitted — includes the public Application ID. */
export function applicationSubmittedSubject(applicationCode: string): string {
  return `AWS Builders - UST | Application received (${applicationCode})`;
}

export function officerApplicationNoticeSubject(input: {
  firstName: string;
  lastName: string;
  firstChoiceCommittee: string;
}): string {
  const applicant = `${input.firstName} ${input.lastName}`;
  if (input.firstChoiceCommittee.startsWith("Office of the ")) {
    return `New EA applicant for your office — ${applicant} | R101`;
  }
  return `New ${input.firstChoiceCommittee} staff applicant — ${applicant} | R101`;
}

/** Accepted result (Marc #10 Release Results). */
export const resultAcceptedSubject =
  "Welcome Aboard! Your AWS Builders - UST R101 Results";

/** Rejected result (Marc #10 Release Results). */
export const resultRejectedSubject =
  "AWS Builders - UST R101 Recruitment Results";
