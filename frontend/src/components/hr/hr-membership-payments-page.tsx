"use client"

import { useCallback, useEffect, useState } from "react"
import { ActionFeedback } from "@/components/shared/action-feedback"
import { SectionHeader } from "@/components/shared/section-header"
import { HrPaymentBatchActions } from "@/components/hr/hr-payment-batch-actions"
import { paymentReviewDescription } from "@/components/hr/hr-payment-copy"
import { HrPaymentList } from "@/components/hr/hr-payment-list"
import { HrPaymentReviewDialog } from "@/components/hr/hr-payment-review-dialog"
import { HrPaymentSection } from "@/components/hr/hr-payment-section"
import { HrSectionNav } from "@/components/hr/hr-section-nav"
import { getSession } from "@/lib/api/client"
import {
  getPaymentDashboard,
  releaseMembershipConfirmations,
  retryMembershipConfirmationEmails,
  retryPaymentInvitationEmails,
  type PaymentDashboard,
  type PaymentListItem,
} from "@/lib/api/payments"
import { glassPanelClasses, pageShellClasses } from "@/lib/site/surface"

const stackClasses = "mt-6 flex flex-col gap-8"
const reviewPanelClasses = `${glassPanelClasses} rounded-[20px] px-5 py-5`
const loadingClasses = "mt-8 font-sans text-sm text-prelude"
type Feedback = { type: "success" | "error"; message: string }

const sectionNavItems = [
  { id: "receipt-review", label: "Receipt review" },
  { id: "membership-completion", label: "Collection" },
]

export function HrMembershipPaymentsPage() {
  const [dashboard, setDashboard] = useState<PaymentDashboard | null>(null)
  const [role, setRole] = useState<"hr" | "admin" | "finance">("hr")
  const [selected, setSelected] = useState<PaymentListItem | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  const refresh = useCallback(async () => {
    setDashboard(await getPaymentDashboard())
  }, [])

  useEffect(() => {
    getSession()
      .then(async (session) => {
        const dashboardResponse = await getPaymentDashboard()
        return { dashboardResponse, session }
      })
      .then(({ dashboardResponse, session }) => {
        setDashboard(dashboardResponse)
        setRole(session.role)
      })
      .catch((caught) =>
        setFeedback({
          type: "error",
          message:
            caught instanceof Error
              ? caught.message
              : "Could not load membership payments.",
        }),
      )
      .finally(() => setLoading(false))
  }, [])

  async function runBatch(
    kind: "release" | "retry-invitations" | "retry-confirmations",
  ) {
    setPending(true)
    setFeedback(null)
    try {
      if (kind === "release") {
        const result = await releaseMembershipConfirmations()
        setFeedback({
          type: "success",
          message: `Released ${result.released} membership confirmations. ${result.emailDelivery.sent} emails sent${result.emailDelivery.failed ? `; ${result.emailDelivery.failed} failed.` : "."}`,
        })
      } else {
        const result =
          kind === "retry-invitations"
            ? await retryPaymentInvitationEmails()
            : await retryMembershipConfirmationEmails()
        const label =
          kind === "retry-invitations" ? "invitation" : "confirmation"
        setFeedback({
          type: "success",
          message: `Retried ${result.retried} ${label} emails. ${result.sent} sent${result.failed ? `; ${result.failed} still failed.` : "."}`,
        })
      }
      await refresh()
    } catch (caught) {
      setFeedback({
        type: "error",
        message:
          caught instanceof Error ? caught.message : "Could not complete the action.",
      })
    } finally {
      setPending(false)
    }
  }

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
