"use client"

import { ApplicantChoiceCards } from "@/components/apply/applicant-choice-cards"
import { ApplicantInterviewScheduler } from "@/components/apply/applicant-interview-scheduler"
import { ApplicantResultPanel } from "@/components/apply/applicant-result-panel"
import { ApplicantChoiceEditor } from "@/components/apply/applicant-choice-editor"
import { ApplicantEditBanner } from "@/components/apply/applicant-edit-banner"
import { ApplicantDashboardProfile } from "@/components/apply/applicant-dashboard-profile"
import type { ApplicantApplication } from "@/lib/applicant-api"
import { ApplicantDocumentEditor } from "@/components/apply/applicant-document-editor"

const docsClasses = "mt-8 font-sans text-sm text-prelude"

type ApplicantDashboardContentProps = {
  application: ApplicantApplication
  pending: boolean
  saveError: string
  saveSuccess: string
  previewPositionId: string | undefined
  previewSlotId: string
  onPreviewSlotIdChange: (slotId: string) => void
  onPreviewPositionIdChange: (positionId: string | undefined) => void
  onSave: (input: {
    choices: { positionId: string; preferenceRank: 1 | 2 }[]
    slotId?: string
    portfolioUrl?: string
    githubUrl?: string
  }) => void
  onApplicationUpdated: (application: ApplicantApplication) => void
}

function ApplicantDashboardDocuments({
  application,
  onApplicationUpdated,
}: {
  application: ApplicantApplication
  onApplicationUpdated: (application: ApplicantApplication) => void
}) {
  const resume = application.documents.find((doc) => doc.documentType === "resume")
  const transcript = application.documents.find(
    (doc) => doc.documentType === "transcript",
  )
  const registration = application.documents.find(
    (doc) => doc.documentType === "registration",
  )

  if (application.canEdit) {
    return (
      <ApplicantDocumentEditor
        application={application}
        onUpdated={onApplicationUpdated}
      />
    )
  }

  return (
    <div className={docsClasses}>
      <p>CV: {resume?.fileName ?? "—"}</p>
      <p className="mt-1">TOR: {transcript?.fileName ?? "—"}</p>
      <p className="mt-1">RegForm: {registration?.fileName ?? "—"}</p>
    </div>
  )
}

export function ApplicantDashboardContent({
  application,
  pending,
  saveError,
  saveSuccess,
  previewPositionId,
  previewSlotId,
  onPreviewSlotIdChange,
  onPreviewPositionIdChange,
  onSave,
  onApplicationUpdated,
}: ApplicantDashboardContentProps) {
  const first = application.choices.find((choice) => choice.preferenceRank === 1)
  const second = application.choices.find((choice) => choice.preferenceRank === 2)

  return (
    <>
      <ApplicantDashboardProfile application={application} />

      {application.result ? (
        <ApplicantResultPanel
          result={application.result}
          choices={application.choices}
        />
      ) : null}

      <div className="mt-6">
        <ApplicantEditBanner
          canEdit={application.canEdit}
          editDeadline={application.editDeadline}
          lockReason={application.lockReason}
        />
      </div>

      <div className="mt-8">
        <ApplicantChoiceCards first={first} second={second} />
      </div>

      <ApplicantInterviewScheduler
        key={`${previewPositionId ?? "current-booking"}:${first?.committee ?? ""}`}
        positionId={previewPositionId}
        previewMode={Boolean(previewPositionId)}
        selectedSlotId={previewPositionId ? previewSlotId : undefined}
        onSelectedSlotIdChange={
          previewPositionId ? onPreviewSlotIdChange : undefined
        }
      />

      {application.canEdit ? (
        <ApplicantChoiceEditor
          application={application}
          pending={pending}
          error={saveError}
          success={saveSuccess}
          slotId={previewSlotId}
          onPreviewPositionIdChange={onPreviewPositionIdChange}
          onSave={onSave}
        />
      ) : null}

      <ApplicantDashboardDocuments
        application={application}
        onApplicationUpdated={onApplicationUpdated}
      />
    </>
  )
}
