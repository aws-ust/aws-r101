"use client"

import { useEffect, useState } from "react"
import { ApplicantPaymentForm } from "@/components/apply/applicant-payment-form"
import { ApplicantPaymentMethodCard } from "@/components/apply/applicant-payment-method-card"
import { ApplicantPaymentSection } from "@/components/apply/applicant-payment-section"
import { Button } from "@/components/ui/button"
import {
  getApplicantPayment,
  type ApplicantPayment,
} from "@/lib/api/applicant"
import { formatDisplayDateTime } from "@/lib/datetime/display"
import { glassPanelClasses } from "@/lib/site/surface"

const panelClasses = `${glassPanelClasses} mt-6 rounded-[22px] px-5 py-5`
const eyebrowClasses = "font-mono text-[10px] uppercase tracking-[0.16em] text-aquamarine"
const titleClasses = "mt-2 font-sans text-2xl font-bold text-blue-chalk"
const bodyClasses = "mt-2 font-sans text-sm leading-relaxed text-prelude"
const summaryClasses = "mt-5 grid gap-3 sm:grid-cols-2"
const summaryItemClasses = "rounded-[12px] border border-blue-chalk/15 bg-haiti/30 px-4 py-3"
const summaryLabelClasses = "font-mono text-[10px] uppercase tracking-[0.14em] text-prelude"
const summaryValueClasses = "mt-1 font-sans text-sm font-semibold text-blue-chalk"
const sectionStackClasses = "mt-6 flex flex-col gap-4"
const methodGridClasses = "grid gap-3 xl:grid-cols-2"
const methodTitleClasses = "font-sans text-sm font-semibold text-blue-chalk"
const errorClasses = "mt-3 font-sans text-sm text-rose-glow"
const successClasses = "rounded-[14px] border border-aquamarine/35 bg-aquamarine/10 p-4"
const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
})

const STATUS_LABELS: Record<ApplicantPayment["paymentStatus"], string> = {
  awaiting_payment: "Awaiting payment",
  pending_verification: "Pending verification",
  verified: "Verified",
  needs_resubmission: "Needs resubmission",
  expired: "Expired",
}

export function ApplicantPaymentPanel() {
  const [payment, setPayment] = useState<ApplicantPayment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function refresh() {
    const response = await getApplicantPayment()
    setPayment(response.payment)
  }

  useEffect(() => {
    let active = true
    getApplicantPayment()
      .then((response) => {
        if (active) setPayment(response.payment)
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load payment details.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) return <p className={bodyClasses}>Loading membership payment…</p>
  if (error) return <p className={errorClasses}>{error}</p>
  if (!payment) return null

  return <ApplicantPaymentDetails payment={payment} onSubmitted={refresh} />
}

function ApplicantPaymentDetails({ payment, onSubmitted }: { payment: ApplicantPayment; onSubmitted: () => Promise<void> }) {
  const amount = pesoFormatter.format(payment.amountCents / 100)
  const deadline = formatDisplayDateTime(
    new Date(payment.resubmissionDeadlineAt ?? payment.deadlineAt),
    { dateStyle: "medium", timeStyle: "short" },
  )
  return (
    <section className={panelClasses} aria-labelledby="membership-payment-title">
      <p className={eyebrowClasses}>Membership payment</p>
      <h2 id="membership-payment-title" className={titleClasses}>{STATUS_LABELS[payment.paymentStatus]}</h2>
      <div className={summaryClasses}>
        <PaymentSummaryItem label="Amount" value={amount} />
        <PaymentSummaryItem label="Deadline" value={deadline} />
      </div>
      <div className={sectionStackClasses}>
        <PaymentSubmissionSection payment={payment} onSubmitted={onSubmitted} />
        <PaymentStatusMessage payment={payment} />
        <MembershipConfirmation payment={payment} />
      </div>
    </section>
  )
}

function PaymentSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={summaryItemClasses}>
      <p className={summaryLabelClasses}>{label}</p>
      <p className={summaryValueClasses}>{value}</p>
    </div>
  )
}

function PaymentSubmissionSection({ payment, onSubmitted }: { payment: ApplicantPayment; onSubmitted: () => Promise<void> }) {
  if (payment.paymentStatus !== "awaiting_payment" && payment.paymentStatus !== "needs_resubmission") return null
  return (
    <>
      <ApplicantPaymentSection
        number="01"
        title="Payment instructions"
        description="Pay using one of the official accounts below before submitting your receipt."
      >
        {payment.latestSubmission?.reviewReason ? <p className={errorClasses}>Reviewer note: {payment.latestSubmission.reviewReason}</p> : null}
        <div className={methodGridClasses}>
          {payment.paymentMethods.gcash ? <ApplicantPaymentMethodCard label="GCash" details={payment.paymentMethods.gcash} /> : null}
          {payment.paymentMethods.bpi ? <ApplicantPaymentMethodCard label="BPI" details={payment.paymentMethods.bpi} /> : null}
        </div>
      </ApplicantPaymentSection>
      <ApplicantPaymentSection
        number="02"
        title="Submit proof of payment"
        description="Enter the reference number and upload a clear receipt image for manual verification."
      >
        {payment.canSubmit ? <ApplicantPaymentForm payment={payment} onSubmitted={onSubmitted} /> : <p className={bodyClasses}>Payment submission is currently closed.</p>}
      </ApplicantPaymentSection>
    </>
  )
}

function PaymentStatusMessage({ payment }: { payment: ApplicantPayment }) {
  let message = ""
  if (payment.paymentStatus === "pending_verification") message = "Your receipt is waiting for manual review. It does not count as paid until Finance verifies it."
  if (payment.paymentStatus === "expired") message = "The payment deadline has passed. Contact the organization if you need help."
  if (payment.paymentStatus === "verified" && payment.confirmationStatus !== "released") message = "Your payment is verified. Final membership details will appear after confirmations are released."
  if (!message) return null
  return <ApplicantPaymentSection number="01" title="Payment status" description={message} />
}

function MembershipConfirmation({ payment }: { payment: ApplicantPayment }) {
  if (payment.confirmationStatus !== "released") return null
  return (
    <ApplicantPaymentSection number="01" title="Membership confirmed" description="Your membership is active and your final details are ready.">
      <div className={successClasses}>
        <p className={methodTitleClasses}>Member ID: {payment.memberId}</p>
        {payment.chatLink ? <Button nativeButton={false} className="mt-3" render={<a href={payment.chatLink} target="_blank" rel="noreferrer">Join the group chat</a>} /> : null}
      </div>
    </ApplicantPaymentSection>
  )
}
