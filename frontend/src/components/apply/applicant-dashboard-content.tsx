"use client"

import dynamic from "next/dynamic"
import { ApplicantChoiceCards } from "@/components/apply/applicant-choice-cards"
import { LazyWhenVisible } from "@/components/shared/lazy-when-visible"

const ApplicantInterviewScheduler = dynamic(() =>
  import("@/components/apply/applicant-interview-scheduler").then(
    (mod) => mod.ApplicantInterviewScheduler,
  ),
)
import { ApplicantResultPanel } from "@/components/apply/applicant-result-panel"
import { ApplicantMembershipStatus } from "@/components/apply/applicant-membership-status"
import { ApplicantChoiceEditor } from "@/components/apply/applicant-choice-editor"
import { ApplicantEditBanner } from "@/components/apply/applicant-edit-banner"
import { ApplicantDashboardProfile } from "@/components/apply/applicant-dashboard-profile"
import type { ApplicantApplication } from "@/lib/api/applicant"
import { ApplicantDocumentEditor } from "@/components/apply/applicant-document-editor"
import { ApplicantPaymentPanel } from "@/components/apply/applicant-payment-panel"

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
      <p className="mt-1">RegForm: {registration?.fileName ?? "—"}</p>
    </div>
  )
}

function ApplicantPendingSections({
  application,
  pending,
  saveError,
  saveSuccess,
  previewPositionId,
  previewSlotId,
  onPreviewSlotIdChange,
  onPreviewPositionIdChange,
  onSave,
}: Omit<ApplicantDashboardContentProps, "onApplicationUpdated">) {
  const first = application.choices.find((choice) => choice.preferenceRank === 1)
  const second = application.choices.find((choice) => choice.preferenceRank === 2)

  return (
    <>
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
      <LazyWhenVisible minHeight="18rem" className="mt-8">
        <ApplicantInterviewScheduler
          key={`${previewPositionId ?? "current-booking"}:${first?.committee ?? ""}`}
          positionId={previewPositionId}
          previewMode={Boolean(previewPositionId)}
          selectedSlotId={previewPositionId ? previewSlotId : undefined}
          onSelectedSlotIdChange={
            previewPositionId ? onPreviewSlotIdChange : undefined
          }
        />
      </LazyWhenVisible>
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
    </>
  )
}

export function ApplicantDashboardContent({
  onApplicationUpdated,
  ...props
}: ApplicantDashboardContentProps) {
  const { application } = props

  return (
    <>
      <ApplicantDashboardProfile application={application} />

      {application.applicationType !== "position" ? (
        <ApplicantMembershipStatus application={application} />
      ) : application.result ? (
        <ApplicantResultPanel
          result={application.result}
          choices={application.choices}
          onApplicationUpdated={onApplicationUpdated}
        />
      ) : (
        <ApplicantPendingSections {...props} />
      )}

      <ApplicantPaymentPanel application={application} />

      {application.result ? null : (
        <ApplicantDashboardDocuments
          application={application}
          onApplicationUpdated={onApplicationUpdated}
        />
      )}
    </>
  )
}
