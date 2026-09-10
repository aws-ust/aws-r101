import type { GeneralInfoValues } from "@/components/apply/general-info-step"
import type { CommitteeValues } from "@/components/apply/committee-step"
import type { UploadValues } from "@/components/apply/upload-step"
import type { CreateApplicationInput, DocumentType } from "@/lib/application-types"
import { isValidBirthdayYmd } from "@/lib/date-local"
import { isApplicantGender } from "@/lib/applicant-gender"

export const emptyGeneral: GeneralInfoValues = {
  firstName: "",
  lastName: "",
  age: "",
  birthday: "",
  gender: "",
  section: "",
  emailLocal: "",
}

export const emptyCommittee: CommitteeValues = {
  firstCommittee: "",
  firstPositionId: "",
  secondCommittee: "",
  secondPositionId: "",
  motivation: "",
  slotId: "",
}

export const emptyUpload: UploadValues = {
  resume: null,
  transcript: null,
}

export function generalValid(values: GeneralInfoValues) {
  const age = Number(values.age)
  const nameOk = (value: string) =>
    Boolean(value.trim()) && !/\d/.test(value) && /^[\p{L}\s'-]+$/u.test(value)

  return Boolean(
    nameOk(values.firstName) &&
      nameOk(values.lastName) &&
      values.section.trim() &&
      values.emailLocal.trim() &&
      Number.isInteger(age) &&
      age > 0 &&
      isValidBirthdayYmd(values.birthday) &&
      isApplicantGender(values.gender)
  )
}

export function committeeValid(values: CommitteeValues) {
  return Boolean(
    values.firstPositionId &&
      values.secondPositionId &&
      values.firstPositionId !== values.secondPositionId &&
      values.motivation.trim() &&
      values.slotId
  )
}

export function generalStepError(values: GeneralInfoValues) {
  const age = Number(values.age)
  const missing =
    !values.firstName.trim() ||
    !values.lastName.trim() ||
    !values.section.trim() ||
    !values.emailLocal.trim() ||
    !values.age.trim() ||
    !values.birthday.trim() ||
    !values.gender.trim()
  if (missing) {
    return "Please complete all the required fields."
  }
  if (!Number.isInteger(age) || age <= 0) {
    return "Age must be a positive number so we can confirm your eligibility for R101."
  }
  if (!isValidBirthdayYmd(values.birthday)) {
    return "Pick a valid birthday that is not in the future."
  }
  if (!isApplicantGender(values.gender)) {
    return "Select your gender."
  }
  return "Please use letters only for your name so we can match it to your application."
}

export function committeeStepError(values: CommitteeValues) {
  if (
    values.firstPositionId &&
    values.secondPositionId &&
    values.firstPositionId === values.secondPositionId
  ) {
    return "Pick two different positions so we can rank your committee preferences."
  }
  if (
    values.firstPositionId &&
    values.secondPositionId &&
    values.motivation.trim() &&
    !values.slotId
  ) {
    return "Pick an interview time slot for your first-choice committee."
  }
  return "Please complete all the required fields."
}

export const uploadStepError =
  "Please attach your Resume and Transcript of Records."

export const uploadPdfStepError =
  "Please attach both files as PDFs (.pdf), then try again."

export function toCreateApplicationInput(
  general: GeneralInfoValues,
  committee: CommitteeValues,
  upload: UploadValues,
  emailDomain: string
): Omit<CreateApplicationInput, "documents"> & {
  documents: { documentType: DocumentType; fileName: string }[]
} {
  return {
    firstName: general.firstName.trim(),
    lastName: general.lastName.trim(),
    email: `${general.emailLocal.trim()}${emailDomain}`,
    age: Number(general.age),
    birthday: general.birthday,
    gender: general.gender,
    section: general.section.trim(),
    motivation: committee.motivation.trim(),
    slotId: committee.slotId,
    choices: [
      { positionId: committee.firstPositionId, preferenceRank: 1 },
      { positionId: committee.secondPositionId, preferenceRank: 2 },
    ],
    documents: [
      { documentType: "resume", fileName: upload.resume!.name },
      { documentType: "transcript", fileName: upload.transcript!.name },
    ],
  }
}

/** Step 3 blockers — only messages that belong on the upload step. */
export function submitBlockedMessage(
  general: GeneralInfoValues,
  committee: CommitteeValues,
  upload: UploadValues
): string | null {
  if (!upload.resume || !upload.transcript) {
    return uploadStepError
  }
  if (upload.resume.type !== "application/pdf" || upload.transcript.type !== "application/pdf") {
    return uploadPdfStepError
  }
  if (!generalValid(general)) {
    return "Your answers from Step 1 are missing. Go back and complete your name, age, birthday, gender, year & section, and UST email."
  }
  if (!committee.motivation.trim()) {
    return "Your answer from Step 2 is missing. Go back and tell us why you want to join AWS Builders - UST."
  }
  if (
    committee.firstPositionId &&
    committee.secondPositionId &&
    committee.firstPositionId === committee.secondPositionId
  ) {
    return committeeStepError(committee)
  }
  if (!committee.slotId) {
    return "Go back to Step 2 and pick an interview time slot for your first-choice committee."
  }
  if (!committeeValid(committee)) {
    return "Your committee choices from Step 2 are incomplete. Go back and pick two different positions."
  }
  return null
}

/** Turn API validation text into something useful on the upload step. */
export function mapApplyApiError(message: string): string {
  const lower = message.toLowerCase()
  if (message.includes("firstName, lastName, email, section, and motivation")) {
    return "Some required answers from Step 1 or Step 2 did not come through. Use Back to review those steps, then submit again."
  }
  if (lower.includes("document") || lower.includes("resume") || lower.includes("transcript") || lower.includes("s3key")) {
    return uploadStepError
  }
  if (lower.includes("choice") || lower.includes("position")) {
    return "Go back to Step 2 and choose two different open positions."
  }
  if (lower.includes("slot") || lower.includes("interview")) {
    return "Go back to Step 2 and pick an open interview slot for your first-choice committee."
  }
  if (lower.includes("age")) {
    return "Go back to Step 1 and enter a valid age."
  }
  if (lower.includes("birthday")) {
    return "Go back to Step 1 and pick a valid birthday."
  }
  if (lower.includes("gender")) {
    return "Go back to Step 1 and select your gender."
  }
  if (lower.includes("email")) {
    return "Go back to Step 1 and check your UST email."
  }
  if (
    lower.includes("already submitted") ||
    lower.includes("one application per year") ||
    lower.includes("recruitment cycle")
  ) {
    return "You already applied for this recruitment cycle with this UST email. Only one application per year is allowed."
  }
  return message
}
