"use client"

import { ActionFeedback } from "@/components/shared/action-feedback"
import { SectionHeader } from "@/components/shared/section-header"
import { HrPaymentBatchActions } from "@/components/hr/hr-payment-batch-actions"
import { paymentReviewDescription } from "@/components/hr/hr-payment-copy"
import { HrPaymentList } from "@/components/hr/hr-payment-list"
import { HrPaymentReviewDialog } from "@/components/hr/hr-payment-review-dialog"
import { HrPaymentSection } from "@/components/hr/hr-payment-section"
import { HrSectionNav } from "@/components/hr/hr-section-nav"
import { useHrPaymentWorkspace } from "@/components/hr/use-hr-payment-workspace"
import { glassPanelClasses, pageShellClasses } from "@/lib/site/surface"

const stackClasses = "mt-6 flex flex-col gap-8"
const reviewPanelClasses = `${glassPanelClasses} rounded-[20px] px-5 py-5`
const loadingClasses = "mt-8 font-sans text-sm text-prelude"

const sectionNavItems = [
  { id: "receipt-review", label: "Receipt review" },
  { id: "membership-completion", label: "Collection" },
]

export function HrMembershipPaymentsPage() {
  const {
    dashboard,
    role,
    selected,
    setSelected,
    feedback,
    loading,
    pending,
    refresh,
    runBatch,
  } = useHrPaymentWorkspace()

  return (
    <main className={pageShellClasses}>
      <SectionHeader
        eyebrow="// MEMBERSHIP"
        title="Verification & Collection"
        subtitle="Review submitted receipts and release verified memberships when collection is complete."
      />
      {feedback ? <ActionFeedback type={feedback.type} message={feedback.message} /> : null}
      {loading ? (
        <p className={loadingClasses}>Loading membership payments…</p>
      ) : (
        <>
          <HrSectionNav items={sectionNavItems} />
          <div className={stackClasses}>
            {dashboard ? (
              <HrPaymentSection
                id="receipt-review"
                number="01"
                title="Receipt review"
                description={paymentReviewDescription(role)}
              >
                <div className={reviewPanelClasses}>
                  <HrPaymentList
                    payments={dashboard.payments}
                    onSelect={setSelected}
                  />
                </div>
              </HrPaymentSection>
            ) : null}
            <HrPaymentSection
              id="membership-completion"
              number="02"
              title="Membership collection"
              description="Export verified members and release final membership details when review is complete."
            >
              <HrPaymentBatchActions
                role={role}
                pending={pending}
                verified={dashboard?.summary.verified ?? 0}
                onRun={runBatch}
              />
            </HrPaymentSection>
          </div>
        </>
      )}
      {selected ? (
        <HrPaymentReviewDialog
          key={selected.paymentId}
          selected={selected}
          role={role}
          onClose={() => setSelected(null)}
          onChanged={refresh}
        />
      ) : null}
    </main>
  )
}
