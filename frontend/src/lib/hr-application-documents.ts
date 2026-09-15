import type { ApplicationDocument } from "@/lib/application-types"
import type { HrApplication } from "@/lib/hr-application-types"

function documentFor(
  application: HrApplication,
  type: ApplicationDocument["documentType"],
) {
  return application.documents.find((document) => document.documentType === type)
}

export function hrApplicationDocuments(application: HrApplication) {
  return {
    resume: documentFor(application, "resume"),
    registration: documentFor(application, "registration"),
  }
}
