import type { GeneralInfoValues } from "@/components/apply/general-info-step"
import type { CommitteeValues } from "@/components/apply/committee-step"
import type { UploadValues } from "@/components/apply/upload-step"

export const emptyGeneral: GeneralInfoValues = {
  firstName: "",
  lastName: "",
  age: "",
  section: "",
  emailLocal: "",
}

export const emptyCommittee: CommitteeValues = {
  firstCommittee: "",
  firstPositionId: "",
  secondCommittee: "",
  secondPositionId: "",
  motivation: "",
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
      age > 0
  )
}

export function committeeValid(values: CommitteeValues) {
  return Boolean(
    values.firstPositionId &&
      values.secondPositionId &&
      values.firstPositionId !== values.secondPositionId &&
      values.motivation.trim()
  )
}

export function generalStepError(values: GeneralInfoValues) {
  const age = Number(values.age)
  const missing =
    !values.firstName.trim() ||
    !values.lastName.trim() ||
    !values.section.trim() ||
    !values.emailLocal.trim() ||
    !values.age.trim()
  if (missing) {
    return "Please complete all the required fields."
  }
  if (!Number.isInteger(age) || age <= 0) {
    return "Age must be a positive number so we can confirm your eligibility for R101."
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
  return "Please complete all the required fields."
}

export const uploadStepError =
  "Please attach your Resume and Transcript of Records."
