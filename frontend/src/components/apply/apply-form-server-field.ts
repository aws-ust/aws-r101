import type { UseFormSetError } from "react-hook-form"
import type { ApplyFormValues } from "@/components/apply/apply-schema"
import { mapApplyApiError } from "@/components/apply/form-model"

type FormStep = 1 | 2 | 3 | 4 | 5 | 6

type ServerFieldName =
  | "privacy.dataPrivacyAgreed"
  | "general.firstName"
  | "general.studentNumber"
  | "general.contactDigits"
  | "general.facebookUrl"
  | "general.age"
  | "general.birthday"
  | "general.gender"
  | "general.section"
  | "general.emailLocal"
  | "committee.portfolioUrl"
  | "committee.githubUrl"
  | "committee.firstPositionId"
  | "committee.slotId"
  | "upload.resume"

function serverFieldForMessage(message: string): {
  name: ServerFieldName
  step: FormStep
} | null {
  const lower = message.toLowerCase()
  if (lower.includes("dataprivacy") || lower.includes("data privacy")) {
    return { name: "privacy.dataPrivacyAgreed", step: 1 }
  }
  if (lower.includes("firstname") || lower.includes("lastname")) {
    return { name: "general.firstName", step: 2 }
  }
  if (lower.includes("studentnumber")) {
    return { name: "general.studentNumber", step: 2 }
  }
  if (lower.includes("contactnumber")) {
    return { name: "general.contactDigits", step: 2 }
  }
  if (lower.includes("facebookurl")) {
    return { name: "general.facebookUrl", step: 2 }
  }
  if (lower.includes("age")) return { name: "general.age", step: 2 }
  if (lower.includes("birthday")) return { name: "general.birthday", step: 2 }
  if (lower.includes("gender")) return { name: "general.gender", step: 2 }
  if (lower.includes("section")) return { name: "general.section", step: 2 }
  if (lower.includes("email")) return { name: "general.emailLocal", step: 2 }
  if (lower.includes("portfolio")) {
    return { name: "committee.portfolioUrl", step: 3 }
  }
  if (lower.includes("github")) return { name: "committee.githubUrl", step: 3 }
  if (lower.includes("choice") || lower.includes("position")) {
    return { name: "committee.firstPositionId", step: 3 }
  }
  if (lower.includes("slot") || lower.includes("interview")) {
    return { name: "committee.slotId", step: 3 }
  }
  if (
    lower.includes("document") ||
    lower.includes("resume") ||
    lower.includes("registration")
  ) {
    return { name: "upload.resume", step: 4 }
  }
  return null
}

export function applyMappedServerError(
  message: string,
  setError: UseFormSetError<ApplyFormValues>,
  setStep: (step: FormStep) => void,
  setServerError: (message: string) => void,
) {
  const target = serverFieldForMessage(message)
  if (target) {
    setError(target.name, { type: "server", message })
    setStep(target.step)
    return
  }
  setServerError(mapApplyApiError(message))
}
