import type { MutableRefObject } from "react"
import type { ApplyFormValues } from "@/components/apply/apply-schema"
import { clearApplyFormDraft } from "@/components/apply/apply-form-draft"
import { toCreateApplicationInput } from "@/components/apply/form-model"
import { createApplication, createUploadSession } from "@/lib/api"

type CompletedUploadSession = { fingerprint: string; id: string; expiresAt: string }

function toBase64(bytes: ArrayBuffer): string {
  const chunk = 0x8000
  const view = new Uint8Array(bytes)
  let binary = ""
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function fileChecksum(file: File): Promise<string> {
  return toBase64(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))
}

export type ApplyFormSubmitSuccess = {
  applicationCode: string
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
): Promise<ApplyFormSubmitSuccess> {
  const files = [
    { documentType: "resume" as const, file: values.upload.resume! },
    { documentType: "registration" as const, file: values.upload.registration! },
  ]
  const documents = await Promise.all(
    files.map(async ({ documentType, file }) => ({
      documentType,
      fileName: file.name,
      sizeBytes: file.size,
      checksumSha256: await fileChecksum(file),
    })),
  )
  const fingerprint = JSON.stringify(documents)
  const cachedUpload = completedUploadRef.current
  let uploadSessionId = cachedUpload?.id
  if (
    !cachedUpload ||
    cachedUpload.fingerprint !== fingerprint ||
    new Date(cachedUpload.expiresAt) <= new Date()
  ) {
    const session = await createUploadSession({ documents })
    await Promise.all(
      session.uploads.map(async (signedUpload) => {
        const match = files.find(
          (candidate) => candidate.documentType === signedUpload.documentType,
        )
        if (!match) {
          throw new Error(
            `Missing upload file for document type "${signedUpload.documentType}".`,
          )
        }
        const file = match.file
        const form = new FormData()
        Object.entries(signedUpload.fields).forEach(([name, value]) =>
          form.append(name, value),
        )
        form.append("file", file)
        const response = await fetch(signedUpload.url, { method: "POST", body: form })
        if (!response.ok) throw new Error("Could not upload the PDF files.")
      }),
    )
    uploadSessionId = session.uploadSessionId
    completedUploadRef.current = {
      fingerprint,
      id: session.uploadSessionId,
      expiresAt: session.sessionExpiresAt,
    }
  }
  const created = await createApplication(
    toCreateApplicationInput(
      values.privacy,
      values.general,
      values.committee,
      values.upload,
      ustEmailDomain,
      uploadSessionId!,
    ),
  )
  clearApplyFormDraft()
  const createdFirst = created.choices.find((choice) => choice.preferenceRank === 1)
  const createdSecond = created.choices.find((choice) => choice.preferenceRank === 2)
  return {
    applicationCode: created.applicationCode,
    successChoices: {
      firstCommittee: createdFirst?.committee ?? values.committee.firstCommittee,
      secondCommittee: createdSecond?.committee ?? values.committee.secondCommittee,
      firstTitle: createdFirst?.title ?? values.committee.firstPositionTitle,
      secondTitle: createdSecond?.title ?? values.committee.secondPositionTitle,
    },
  }
}
