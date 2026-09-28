"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DatetimePicker } from "@/components/ui/datetime-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  getPaymentDetails,
  getPaymentReceiptUrl,
  rejectPayment,
  reversePayment,
  verifyPayment,
  type PaymentDetails,
  type PaymentListItem,
} from "@/lib/api/payments"
import { formatDisplayDateTime } from "@/lib/datetime/display"
import { formatDatetimeLocal } from "@/lib/datetime/datetime-local"
import { formatSubheaderLabel } from "@/lib/site/button-label"
import { subheaderLabelClasses } from "@/lib/site/surface"

const contentClasses = "max-h-[85svh] overflow-y-auto sm:max-w-2xl"
const detailGridClasses = "grid gap-3 sm:grid-cols-2"
const detailClasses = "rounded-[14px] bg-haiti/45 px-4 py-3"
const valueClasses = "mt-1 font-sans text-sm text-blue-chalk"
const historyClasses = "mt-3 flex flex-col gap-2"
const actionFormClasses = "mt-4 flex flex-col gap-3 rounded-[14px] border border-blue-chalk/20 p-4"
const errorClasses = "font-sans text-sm text-rose-glow"
type ReviewAction = "reject" | "reverse" | null

export function HrPaymentReviewDialog({ selected, role, onClose, onChanged }: { selected: PaymentListItem; role: "hr" | "admin"; onClose: () => void; onChanged: () => Promise<void> }) {
  const [details, setDetails] = useState<PaymentDetails | null>(null)
  const [action, setAction] = useState<ReviewAction>(null)
  const [reason, setReason] = useState("")
  const [deadline, setDeadline] = useState(() => formatDatetimeLocal(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getPaymentDetails(selected.paymentId)
      .then((payment) => {
        if (active) setDetails(payment)
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load payment.")
      })
    return () => {
      active = false
    }
  }, [selected])

  async function finish(operation: () => Promise<unknown>) {
    setPending(true)
    setError("")
    try {
      await operation()
      await onChanged()
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not review payment.")
    } finally {
      setPending(false)
    }
  }

  async function openReceipt(submissionId: string) {
    try {
      const { url } = await getPaymentReceiptUrl(selected.paymentId, submissionId)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open receipt.")
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose() }}>
      <DialogContent className={contentClasses}>
        <DialogHeader>
          <DialogTitle>{selected.firstName} {selected.lastName}</DialogTitle>
          <DialogDescription>Review the submitted receipt manually before verifying membership.</DialogDescription>
        </DialogHeader>
        {details ? <PaymentReviewBody details={details} action={action} reason={reason} deadline={deadline} onReason={setReason} onDeadline={setDeadline} onReceipt={openReceipt} /> : null}
        {error ? <p className={errorClasses} role="alert">{error}</p> : null}
        <DialogFooter>
          <PaymentDialogActions details={details} role={role} action={action} reason={reason} deadline={deadline} pending={pending} onAction={setAction} onFinish={finish} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PaymentReviewBody({ details, action, reason, deadline, onReason, onDeadline, onReceipt }: { details: PaymentDetails; action: ReviewAction; reason: string; deadline: string; onReason: (value: string) => void; onDeadline: (value: string) => void; onReceipt: (submissionId: string) => Promise<void> }) {
  return (
    <>
      <div className={detailGridClasses}>
        <Detail label="Application ID" value={details.applicationCode} />
        <Detail label="Applicant type" value={details.applicationType === "member" ? "General Member" : details.committee ?? "Committee"} />
        <Detail label="Payment status" value={formatSubheaderLabel(details.status.replaceAll("_", " "))} />
        <Detail label="Member ID" value={details.memberId ?? "Not generated"} />
      </div>
      <div className={historyClasses}>
        {details.submissions.map((submission) => (
          <div key={submission.id} className={detailClasses}>
            <p className={subheaderLabelClasses}>
              {formatSubheaderLabel(
                `Attempt ${submission.attemptNumber} · ${submission.status.replaceAll("_", " ")}`,
              )}
            </p>
            <p className={valueClasses}>{submission.method.toUpperCase()} · Reference {submission.referenceNumber}</p>
            <p className={valueClasses}>Submitted {formatDisplayDateTime(new Date(submission.submittedAt), { dateStyle: "medium", timeStyle: "short" })}</p>
            {submission.reviewReason ? <p className={valueClasses}>Reviewer note: {submission.reviewReason}</p> : null}
            <Button type="button" color="purple" className="mt-3" onClick={() => void onReceipt(submission.id)}>View receipt</Button>
          </div>
        ))}
      </div>
      {action ? <PaymentReviewActionForm action={action} reason={reason} deadline={deadline} onReason={onReason} onDeadline={onDeadline} /> : null}
    </>
  )
}

function PaymentReviewActionForm({ action, reason, deadline, onReason, onDeadline }: { action: Exclude<ReviewAction, null>; reason: string; deadline: string; onReason: (value: string) => void; onDeadline: (value: string) => void }) {
  return (
    <div className={actionFormClasses}>
      <Label htmlFor="payment-review-reason">{action === "reject" ? "Rejection" : "Reversal"} reason</Label>
      <Textarea id="payment-review-reason" value={reason} onChange={(event) => onReason(event.target.value)} />
      <Label htmlFor="payment-resubmit-deadline">Resubmission deadline</Label>
      <DatetimePicker id="payment-resubmit-deadline" value={deadline} onChange={onDeadline} required />
    </div>
  )
}

function PaymentDialogActions({ details, role, action, reason, deadline, pending, onAction, onFinish }: { details: PaymentDetails | null; role: "hr" | "admin"; action: ReviewAction; reason: string; deadline: string; pending: boolean; onAction: (action: ReviewAction) => void; onFinish: (operation: () => Promise<unknown>) => Promise<void> }) {
  const canReview = role === "hr" || role === "admin"
  if (canReview && details?.status === "pending_verification") {
    if (action === "reject") return <Button type="button" color="danger" disabled={pending || !reason.trim()} onClick={() => void onFinish(() => rejectPayment(details.paymentId, { reason, resubmissionDeadlineAt: new Date(deadline).toISOString() }))}>Confirm rejection</Button>
    return <><Button type="button" color="purple" disabled={pending} onClick={() => onAction("reject")}>Reject receipt</Button><Button type="button" color="cyan" disabled={pending} onClick={() => void onFinish(() => verifyPayment(details.paymentId))}>Verify payment</Button></>
  }
  if (canReview && details?.status === "verified") {
    if (action === "reverse") return <Button type="button" color="danger" disabled={pending || !reason.trim()} onClick={() => void onFinish(() => reversePayment(details.paymentId, { reason, resubmissionDeadlineAt: new Date(deadline).toISOString() }))}>Confirm reversal</Button>
    return <Button type="button" color="danger" disabled={pending} onClick={() => onAction("reverse")}>Reverse verification</Button>
  }
  return null
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className={detailClasses}>
      <p className={subheaderLabelClasses}>{formatSubheaderLabel(label)}</p>
      <p className={valueClasses}>{value}</p>
    </div>
  )
}
