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
  return Boolean(
    values.firstName.trim() &&
      values.lastName.trim() &&
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
