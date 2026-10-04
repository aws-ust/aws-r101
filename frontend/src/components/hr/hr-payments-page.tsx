"use client"

import { HrFeedbackBanner } from "@/components/hr/hr-feedback-banner"
import { SectionHeader } from "@/components/shared/section-header"
import { HrPaymentCampaignPanel } from "@/components/hr/hr-payment-campaign-panel"
import { paymentCampaignDescription } from "@/components/hr/hr-payment-copy"
import { HrPaymentSection } from "@/components/hr/hr-payment-section"
import { HrPaymentSummary } from "@/components/hr/hr-payment-summary"
import { useHrPaymentWorkspace } from "@/components/hr/use-hr-payment-workspace"
import { hrPageShellClasses } from "@/lib/site/surface"

const stackClasses = "mt-6 flex flex-col gap-8"
const loadingClasses = "mt-8 font-sans text-sm text-prelude"

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
    <main className={hrPageShellClasses}>
      <SectionHeader
        eyebrow="// PAYMENTS"
        title="Membership Payments"
        subtitle="Configure the payment period, official accounts, and track high-level payment status."
      />
      {loading ? (
        <p className={loadingClasses}>Loading payments…</p>
      ) : (
        <div className={stackClasses}>
            {dashboard ? (
              <HrPaymentSection
                id="payment-overview"
                title="Payment overview"
                description="Track applicants at every stage of the payment process."
              >
                <HrPaymentSummary summary={dashboard.summary} />
              </HrPaymentSection>
            ) : null}
            <HrPaymentSection
              id="payment-setup"
              title="Payment setup"
              description={paymentCampaignDescription()}
            >
              <HrFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
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
      )}
    </main>
  )
}
