import type { MutableRefObject } from "react"
import type { ApplyFormValues } from "@/components/apply/apply-schema"
import { clearApplyFormDraft } from "@/components/apply/apply-form-draft"
import { toCreateApplicationInput } from "@/components/apply/form-model"
import {
  createApplication,
  createHrApplication,
  createHrUploadSession,
  createUploadSession,
} from "@/lib/api"
import {
  documentUploadMetadata,
  uploadDocumentFiles,
} from "@/lib/apply/document-upload"

type CompletedUploadSession = { fingerprint: string; id: string; expiresAt: string }

export type ApplyFormSubmitSuccess = {
  applicationCode: string
  applicationType: "position" | "member"
  successChoices: {
    firstCommittee: string
    secondCommittee: string
    firstTitle: string
    secondTitle: string
  }
}

export async function submitApplyForm(
  values: ApplyFormValues,
  ustEmailDomain: string,
  completedUploadRef: MutableRefObject<CompletedUploadSession | null>,
  hrMode = false,
): Promise<ApplyFormSubmitSuccess> {
  const files = [
    { documentType: "resume" as const, file: values.upload.resume! },
    { documentType: "registration" as const, file: values.upload.registration! },
  ]
  const documents = await documentUploadMetadata(files)
  const fingerprint = JSON.stringify(documents)
  const cachedUpload = completedUploadRef.current
  let uploadSessionId = cachedUpload?.id
  if (
    !cachedUpload ||
    cachedUpload.fingerprint !== fingerprint ||
    new Date(cachedUpload.expiresAt) <= new Date()
  ) {
    const createSession = hrMode ? createHrUploadSession : createUploadSession
    const session = await createSession({ documents })
    await uploadDocumentFiles(files, session)
    uploadSessionId = session.uploadSessionId
    completedUploadRef.current = {
      fingerprint,
      id: session.uploadSessionId,
      expiresAt: session.sessionExpiresAt,
    }
  }
  const create = hrMode ? createHrApplication : createApplication
  const created = await create(
    toCreateApplicationInput(
      values.privacy,
      values.general,
      values.committee,
      values.upload,
      ustEmailDomain,
      uploadSessionId!,
      hrMode,
    ),
  )
  if (!hrMode) clearApplyFormDraft()
  const createdFirst = created.choices.find((choice) => choice.preferenceRank === 1)
  const createdSecond = created.choices.find((choice) => choice.preferenceRank === 2)
  return {
    applicationCode: created.applicationCode,
    applicationType: created.applicationType,
    successChoices: {
      firstCommittee: createdFirst?.committee ?? values.committee.firstCommittee,
      secondCommittee: createdSecond?.committee ?? values.committee.secondCommittee,
      firstTitle: createdFirst?.title ?? values.committee.firstPositionTitle,
      secondTitle: createdSecond?.title ?? values.committee.secondPositionTitle,
    },
  }
}
