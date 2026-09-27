"use client"

import { useEffect, useState } from "react"
import { ActionFeedback } from "@/components/shared/action-feedback"
import { SectionHeader } from "@/components/shared/section-header"
import { HrPaymentCampaignPanel } from "@/components/hr/hr-payment-campaign-panel"
import { paymentCampaignDescription } from "@/components/hr/hr-payment-copy"
import { HrPaymentSection } from "@/components/hr/hr-payment-section"
import { HrPaymentSummary } from "@/components/hr/hr-payment-summary"
import { HrSectionNav } from "@/components/hr/hr-section-nav"
import {
  getSession,
  listCommitteeApplicationStatuses,
  type CommitteeApplicationStatus,
} from "@/lib/api/client"
import {
  getPaymentCampaign,
  getPaymentDashboard,
  type PaymentCampaign,
  type PaymentDashboard,
} from "@/lib/api/payments"
import { pageShellClasses } from "@/lib/site/surface"

const stackClasses = "mt-6 flex flex-col gap-8"
const loadingClasses = "mt-8 font-sans text-sm text-prelude"
type Feedback = { type: "success" | "error"; message: string }

const sectionNavItems = [
  { id: "payment-overview", label: "Overview" },
  { id: "payment-setup", label: "Payment setup" },
]

export function HrPaymentsPage() {
  const [campaign, setCampaign] = useState<PaymentCampaign | null>(null)
  const [dashboard, setDashboard] = useState<PaymentDashboard | null>(null)
  const [committees, setCommittees] = useState<CommitteeApplicationStatus[]>([])
  const [role, setRole] = useState<"hr" | "admin" | "finance">("hr")
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

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
      .catch((caught) =>
        setFeedback({
          type: "error",
          message:
            caught instanceof Error ? caught.message : "Could not load payments.",
        }),
      )
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className={pageShellClasses}>
      <SectionHeader
        eyebrow="// PAYMENTS"
        title="Membership Payments"
        subtitle="Configure the payment period, official accounts, and track high-level payment status."
      />
      {feedback ? <ActionFeedback type={feedback.type} message={feedback.message} /> : null}
      {loading ? (
        <p className={loadingClasses}>Loading payments…</p>
      ) : (
        <>
          <HrSectionNav items={sectionNavItems} />
          <div className={stackClasses}>
            {dashboard ? (
              <HrPaymentSection
                id="payment-overview"
                number="01"
                title="Payment overview"
                description="Track applicants at every stage of the payment process."
              >
                <HrPaymentSummary summary={dashboard.summary} />
              </HrPaymentSection>
            ) : null}
            <HrPaymentSection
              id="payment-setup"
              number="02"
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
          </div>
        </>
      )}
    </main>
  )
}
