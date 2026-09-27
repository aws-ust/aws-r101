"use client"

import { Button } from "@/components/ui/button"
import { HrPaymentScheduleForm } from "@/components/hr/hr-payment-campaign-form"
import { HrPaymentDetailsForm } from "@/components/hr/hr-payment-details-form"
import type { CommitteeApplicationStatus } from "@/lib/api/client"
import {
  closePaymentCampaign,
  openPaymentCampaign,
  type PaymentCampaign,
} from "@/lib/api/payments"
import { glassPanelClasses } from "@/lib/site/surface"

const panelClasses = `${glassPanelClasses} rounded-[20px] px-5 py-5`
const headingRowClasses = "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
const titleClasses = "font-sans text-lg font-bold text-blue-chalk"
const bodyClasses = "mt-1 font-sans text-sm leading-relaxed text-prelude"
const buttonRowClasses = "flex flex-wrap gap-2"

type Feedback = { type: "success" | "error"; message: string }
type CampaignPanelProps = {
  campaign: PaymentCampaign | null
  committees: CommitteeApplicationStatus[]
  role: "hr" | "admin" | "finance"
  pending: boolean
  onCampaign: (campaign: PaymentCampaign) => void
  onPending: (pending: boolean) => void
  onFeedback: (feedback: Feedback) => void
}

export function HrPaymentCampaignPanel(props: CampaignPanelProps) {
  return (
    <section className={panelClasses}>
      <PaymentCampaignHeader {...props} />
      <PaymentCampaignForms {...props} />
    </section>
  )
}

function PaymentCampaignHeader({ campaign, role, pending, onCampaign, onPending, onFeedback }: CampaignPanelProps) {
  const canManagePeriod = role === "hr" || role === "admin"
  return (
    <div className={headingRowClasses}>
      <div>
        <h2 className={titleClasses}>Payment period</h2>
        <p className={bodyClasses}>{campaignStatus(campaign)}</p>
      </div>
      {canManagePeriod && campaign ? (
        <div className={buttonRowClasses}>
          <Button type="button" color={campaign.isOpen ? "danger" : "cyan"} disabled={pending} onClick={() => void updatePaymentPeriod(!campaign.isOpen, campaign, onCampaign, onPending, onFeedback)}>
            {campaign.isOpen ? "Close payments" : "Open and send invitations"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function PaymentCampaignForms({ campaign, committees, role, onCampaign, onFeedback }: CampaignPanelProps) {
  const canManagePeriod = role === "hr" || role === "admin"
  const canManageDetails = role === "finance" || role === "admin"
  return (
    <>
      {canManagePeriod ? (
        <div className="mt-6">
          <HrPaymentScheduleForm campaign={campaign} committees={committees} onSaved={(saved) => { onCampaign(saved); onFeedback({ type: "success", message: "Payment period and links saved." }) }} />
        </div>
      ) : null}
      {canManageDetails ? (
        <div className="mt-6">
          {campaign ? <HrPaymentDetailsForm campaign={campaign} onSaved={(saved) => { onCampaign(saved); onFeedback({ type: "success", message: "Payment amount and accounts saved." }) }} /> : <p className={bodyClasses}>HR must configure the payment period before Finance can add payment details.</p>}
        </div>
      ) : null}
    </>
  )
}

function campaignStatus(campaign: PaymentCampaign | null) {
  if (!campaign) return "HR configures the period first, then Finance adds the official payment details."
  const financeStatus = campaign.amountCents === null ? " · Waiting for Finance details" : ""
  return `${campaign.isOpen ? "Open" : "Closed"} · Recruitment year ${campaign.recruitmentYear}${financeStatus}`
}

async function updatePaymentPeriod(open: boolean, campaign: PaymentCampaign, onCampaign: CampaignPanelProps["onCampaign"], onPending: CampaignPanelProps["onPending"], onFeedback: CampaignPanelProps["onFeedback"]) {
  onPending(true)
  try {
    if (open) {
      const result = await openPaymentCampaign()
      onFeedback({ type: "success", message: `Payment period opened for ${result.eligible} eligible applicants. ${result.emailDelivery.sent} invitation emails sent${result.emailDelivery.failed ? `; ${result.emailDelivery.failed} failed.` : "."}` })
      onCampaign({ ...campaign, isOpen: true })
    } else {
      onCampaign(await closePaymentCampaign())
      onFeedback({ type: "success", message: "Payment submissions closed." })
    }
  } catch (caught) {
    onFeedback({ type: "error", message: caught instanceof Error ? caught.message : "Could not update the payment period." })
  } finally {
    onPending(false)
  }
}
