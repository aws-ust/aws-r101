"use client"

import { ActionFeedback } from "@/components/shared/action-feedback"
import { SectionHeader } from "@/components/shared/section-header"
import { HrPaymentCampaignPanel } from "@/components/hr/hr-payment-campaign-panel"
import { paymentCampaignDescription } from "@/components/hr/hr-payment-copy"
import { HrPaymentSection } from "@/components/hr/hr-payment-section"
import { HrPaymentSummary } from "@/components/hr/hr-payment-summary"
import { HrSectionNav } from "@/components/hr/hr-section-nav"
import { useHrPaymentWorkspace } from "@/components/hr/use-hr-payment-workspace"
import { pageShellClasses } from "@/lib/site/surface"

const stackClasses = "mt-6 flex flex-col gap-8"
const loadingClasses = "mt-8 font-sans text-sm text-prelude"

const sectionNavItems = [
  { id: "payment-overview", label: "Overview" },
  { id: "payment-setup", label: "Payment setup" },
]

export function HrPaymentsPage() {
  const {
    campaign,
    setCampaign,
    dashboard,
    committees,
    role,
    feedback,
    setFeedback,
    loading,
    pending,
    setPending,
  } = useHrPaymentWorkspace()

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
