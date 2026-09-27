"use client"

import { useCallback, useEffect, useState } from "react"
import { ActionFeedback } from "@/components/shared/action-feedback"
import { SectionHeader } from "@/components/shared/section-header"
import { HrPaymentBatchActions } from "@/components/hr/hr-payment-batch-actions"
import { HrPaymentCampaignPanel } from "@/components/hr/hr-payment-campaign-panel"
import {
  paymentCampaignDescription,
  paymentReviewDescription,
} from "@/components/hr/hr-payment-copy"
import { HrPaymentList } from "@/components/hr/hr-payment-list"
import { HrPaymentReviewDialog } from "@/components/hr/hr-payment-review-dialog"
import { HrPaymentSection } from "@/components/hr/hr-payment-section"
import { HrPaymentSummary } from "@/components/hr/hr-payment-summary"
import {
  getSession,
  listCommitteeApplicationStatuses,
  type CommitteeApplicationStatus,
} from "@/lib/api/client"
import {
  getPaymentCampaign,
  getPaymentDashboard,
  releaseMembershipConfirmations,
  retryMembershipConfirmationEmails,
  retryPaymentInvitationEmails,
  type PaymentCampaign,
  type PaymentDashboard,
  type PaymentListItem,
} from "@/lib/api/payments"
import { glassPanelClasses, pageShellClasses } from "@/lib/site/surface"

const stackClasses = "mt-8 flex flex-col gap-8"
const reviewPanelClasses = `${glassPanelClasses} rounded-[20px] px-5 py-5`
const loadingClasses = "mt-8 font-sans text-sm text-prelude"
type Feedback = { type: "success" | "error"; message: string }

export function HrPaymentsPage() {
  const [campaign, setCampaign] = useState<PaymentCampaign | null>(null)
  const [dashboard, setDashboard] = useState<PaymentDashboard | null>(null)
  const [committees, setCommittees] = useState<CommitteeApplicationStatus[]>([])
  const [role, setRole] = useState<"hr" | "admin" | "finance">("hr")
  const [selected, setSelected] = useState<PaymentListItem | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  const refresh = useCallback(async () => {
    const [campaignResponse, dashboardResponse] = await Promise.all([
      getPaymentCampaign(),
      getPaymentDashboard(),
    ])
    setCampaign(campaignResponse.campaign)
    setDashboard(dashboardResponse)
  }, [])

  useEffect(() => {
    getSession()
      .then(async (session) => {
        const committeeRequest =
          session.role === "finance"
            ? Promise.resolve([] as CommitteeApplicationStatus[])
            : listCommitteeApplicationStatuses()
        const [campaignResponse, dashboardResponse, committeeRows] =
          await Promise.all([
            getPaymentCampaign(),
            getPaymentDashboard(),
            committeeRequest,
          ])
        return { campaignResponse, dashboardResponse, session, committeeRows }
      })
      .then(({ campaignResponse, dashboardResponse, session, committeeRows }) => {
        setCampaign(campaignResponse.campaign)
        setDashboard(dashboardResponse)
        setRole(session.role)
        setCommittees(committeeRows)
      })
      .catch((caught) => setFeedback({ type: "error", message: caught instanceof Error ? caught.message : "Could not load payments." }))
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
        setFeedback({ type: "success", message: `Released ${result.released} membership confirmations. ${result.emailDelivery.sent} emails sent${result.emailDelivery.failed ? `; ${result.emailDelivery.failed} failed.` : "."}` })
      } else {
        const result =
          kind === "retry-invitations"
            ? await retryPaymentInvitationEmails()
            : await retryMembershipConfirmationEmails()
        const label =
          kind === "retry-invitations" ? "invitation" : "confirmation"
        setFeedback({ type: "success", message: `Retried ${result.retried} ${label} emails. ${result.sent} sent${result.failed ? `; ${result.failed} still failed.` : "."}` })
      }
      await refresh()
    } catch (caught) {
      setFeedback({ type: "error", message: caught instanceof Error ? caught.message : "Could not complete the action." })
    } finally {
      setPending(false)
    }
  }

  return (
    <main className={pageShellClasses}>
      <SectionHeader
        eyebrow="// PAYMENTS"
        title="Membership Payments"
        subtitle="Configure payment collection, review receipts, and activate verified memberships."
      />
      {feedback ? <ActionFeedback type={feedback.type} message={feedback.message} /> : null}
      {loading ? <p className={loadingClasses}>Loading payments…</p> : (
        <div className={stackClasses}>
          <HrPaymentSection
            number="01"
            title={role === "finance" ? "Payment details" : "Payment setup"}
            description={paymentCampaignDescription(role)}
          >
            <HrPaymentCampaignPanel
              campaign={campaign}
              committees={committees}
              role={role}
              pending={pending}
              onCampaign={setCampaign}
              onPending={setPending}
              onFeedback={setFeedback}
            />
          </HrPaymentSection>
          {dashboard ? (
            <HrPaymentSection
              number="02"
              title="Payment overview"
              description="Track applicants at every stage of the payment process."
            >
              <HrPaymentSummary summary={dashboard.summary} />
            </HrPaymentSection>
          ) : null}
          {dashboard ? (
            <HrPaymentSection
              number="03"
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
            number="04"
            title="Membership completion"
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
      )}
      {selected ? <HrPaymentReviewDialog key={selected.paymentId} selected={selected} role={role} onClose={() => setSelected(null)} onChanged={refresh} /> : null}
    </main>
  )
}
