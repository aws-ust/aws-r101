import { ChoiceCards } from "@/components/hr/choice-cards"
import { HrCommitteeDecisionPanel } from "@/components/hr/hr-committee-decision-panel"
import type { HrApplication } from "@/lib/hr-application-types"

const archivedNoticeClasses =
  "mt-8 rounded-[14px] border border-biloba-flower/35 bg-daisy-bush/20 px-4 py-3 font-sans text-sm text-blue-chalk"
const membershipNoticeClasses =
  "mt-8 rounded-[14px] border border-biloba-flower/35 bg-daisy-bush/20 px-4 py-3 font-sans text-sm leading-relaxed text-blue-chalk"

type HrApplicationCommitteeSectionProps = {
  application: HrApplication
  onUpdated: (application: HrApplication) => void
}

export function HrApplicationCommitteeSection({
  application,
  onUpdated,
}: HrApplicationCommitteeSectionProps) {
  if (application.applicationType === "member") {
    return (
      <p className={membershipNoticeClasses}>
        This Member-only registration is accepted automatically and does not need
        a committee decision or interview. Membership payment opens after R101,
        so do not record a payment yet.
      </p>
    )
  }

  const first = application.choices.find((choice) => choice.preferenceRank === 1)
  const second = application.choices.find((choice) => choice.preferenceRank === 2)

  return (
    <>
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
    </>
  )
}
