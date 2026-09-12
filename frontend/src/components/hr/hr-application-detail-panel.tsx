"use client"

import { Button } from "@/components/ui/button"
import { ChoiceCards } from "@/components/hr/choice-cards"
import { HrCommitteeDecisionPanel } from "@/components/hr/hr-committee-decision-panel"
import {
  formatAppliedDate,
} from "@/lib/api"
import type { ApplicationDocument } from "@/lib/application-types"
import type { HrApplication } from "@/lib/hr-application-types"
import { formatApplicantGender } from "@/lib/applicant-gender"
import { formatDateDisplay } from "@/lib/date-local"
import { safeExternalHref } from "@/lib/safe-external-href"
import { HrApplicationDocumentActions } from "@/components/hr/hr-application-document-actions"

const metaRowClasses =
  "flex flex-wrap gap-x-8 gap-y-3 font-sans text-sm text-blue-chalk"
const metaLabelClasses = "mr-2 text-prelude"
const whyLabelClasses =
  "mt-8 font-sans text-sm font-semibold text-biloba-flower"
const whyBodyClasses = "mt-2 font-sans text-sm leading-relaxed text-blue-chalk"
const downloadsClasses = "mt-8 flex flex-wrap justify-center gap-4"
const archiveRowClasses = "mt-8 flex justify-center"
const archiveActionClasses = "h-9 rounded-pill px-5 font-mono text-xs"
const archivedNoticeClasses =
  "mt-8 rounded-[14px] border border-biloba-flower/35 bg-daisy-bush/20 px-4 py-3 font-sans text-sm text-blue-chalk"
const linkClasses =
  "text-aquamarine underline-offset-2 hover:text-blue-chalk hover:underline"

function documentFor(
  application: HrApplication,
  type: ApplicationDocument["documentType"],
) {
  return application.documents.find((doc) => doc.documentType === type)
}

type HrApplicationDetailPanelProps = {
  application: HrApplication
  onUpdated: (application: HrApplication) => void
  onArchiveClick: () => void
}

export function HrApplicationDetailPanel({
  application,
  onUpdated,
  onArchiveClick,
}: HrApplicationDetailPanelProps) {
  const first = application.choices.find((choice) => choice.preferenceRank === 1)
  const second = application.choices.find((choice) => choice.preferenceRank === 2)
  const resume = documentFor(application, "resume")
  const transcript = documentFor(application, "transcript")
  const registration = documentFor(application, "registration")
  const facebookHref = safeExternalHref(application.facebookUrl, "facebook")
  const portfolioHref = safeExternalHref(application.portfolioUrl, "portfolio")
  const githubHref = safeExternalHref(application.githubUrl, "github")

  return (
    <>
      <div className={metaRowClasses}>
        <p>
          <span className={metaLabelClasses}>Application ID:</span>
          {application.applicationCode}
        </p>
        <p>
          <span className={metaLabelClasses}>Year & Section:</span>
          {application.section ?? "—"}
        </p>
        <p>
          <span className={metaLabelClasses}>Age:</span>
          {application.age ?? "—"}
        </p>
        <p>
          <span className={metaLabelClasses}>Birthday:</span>
          {application.birthday
            ? formatDateDisplay(application.birthday, "—")
            : "—"}
        </p>
        <p>
          <span className={metaLabelClasses}>Gender:</span>
          {formatApplicantGender(application.gender)}
        </p>
        <p>
          <span className={metaLabelClasses}>Email:</span>
          {application.email}
        </p>
        <p>
          <span className={metaLabelClasses}>Student No.:</span>
          {application.studentNumber ?? "—"}
        </p>
        <p>
          <span className={metaLabelClasses}>Contact:</span>
          {application.contactNumber ?? "—"}
        </p>
        <p>
          <span className={metaLabelClasses}>Facebook:</span>
          {facebookHref ? (
            <a
              href={facebookHref}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClasses}
            >
              Profile
            </a>
          ) : (
            "—"
          )}
        </p>
        {portfolioHref ? (
          <p>
            <span className={metaLabelClasses}>Portfolio:</span>
            <a
              href={portfolioHref}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClasses}
            >
              Google Drive
            </a>
          </p>
        ) : null}
        {githubHref ? (
          <p>
            <span className={metaLabelClasses}>GitHub:</span>
            <a
              href={githubHref}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClasses}
            >
              Profile
            </a>
          </p>
        ) : null}
        <p>
          <span className={metaLabelClasses}>Applied:</span>
          {formatAppliedDate(application.submittedAt)}
        </p>
      </div>
      <ChoiceCards first={first} second={second} />
      {application.archivedAt ? (
        <p className={archivedNoticeClasses}>
          This application is archived. Restore it before changing committee
          decisions.
        </p>
      ) : (
        <HrCommitteeDecisionPanel
          application={application}
          onUpdated={onUpdated}
        />
      )}
      <p className={whyLabelClasses}>
        Why do you want to join AWS Builders - UST?
      </p>
      <p className={whyBodyClasses}>{application.motivation || "—"}</p>
      <div className={downloadsClasses}>
        <HrApplicationDocumentActions applicationId={application.id} document={resume} />
        <HrApplicationDocumentActions applicationId={application.id} document={transcript} />
        <HrApplicationDocumentActions applicationId={application.id} document={registration} />
      </div>
      <div className={archiveRowClasses}>
        <Button
          color={application.archivedAt ? "cyan" : "danger"}
          className={archiveActionClasses}
          onClick={onArchiveClick}
        >
          {application.archivedAt ? "Restore applicant" : "Archive applicant"}
        </Button>
      </div>
    </>
  )
}
