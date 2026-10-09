"use client"

import type { PaymentReviewState } from "@/components/hr/use-payment-review"
import { Button } from "@/components/ui/button"
import { DatetimePicker } from "@/components/ui/datetime-picker"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { dashboardActionTargetClasses } from "@/lib/site/dashboard-surface"
import { cn } from "@/lib/utils"

// The decision sits at the foot of the panel. Verify is the one aquamarine
// action; reject and reverse need a reason and a new deadline first.
const rowClasses = "flex flex-wrap gap-2"
const buttonClasses = cn("px-4", dashboardActionTargetClasses)
const formClasses = "flex flex-col gap-3"
const fieldClasses = "flex flex-col gap-1.5"
const hintClasses = "font-sans text-xs text-prelude"

export function PaymentsReviewDecision({ review }: { review: PaymentReviewState }) {
  const { details, form, pending } = review
  if (!details) return null
  const status = details.status

  if (form) {
    const reversing = form === "reverse"
    return (
      <div className={formClasses} data-review-form>
        <div className={fieldClasses}>
          <Label htmlFor="payment-review-reason">{reversing ? "Why reverse it?" : "What is wrong with the receipt?"}</Label>
          <Textarea
            id="payment-review-reason"
            value={review.reason}
            onChange={(event) => review.setReason(event.target.value)}
            placeholder={reversing ? "e.g. The transfer was refunded" : "e.g. The reference does not match GCash"}
          />
          <p className={hintClasses}>The applicant sees this note on their dashboard.</p>
        </div>
        <div className={fieldClasses}>
          <Label htmlFor="payment-resubmit-deadline">Resubmit by</Label>
          <DatetimePicker id="payment-resubmit-deadline" value={review.deadline} onChange={review.setDeadline} required />
        </div>
        <div className={rowClasses}>
          <Button type="button" color="purple" className={buttonClasses} disabled={pending} onClick={() => review.setForm(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            color="danger"
            className={buttonClasses}
            disabled={pending || !review.reason.trim()}
            onClick={() => void (reversing ? review.reverse() : review.reject())}
          >
            {pending ? "Saving…" : reversing ? "Confirm Reversal" : "Confirm Rejection"}
          </Button>
        </div>
      </div>
    )
  }

  if (status === "pending_verification") {
    return (
      <div className={rowClasses}>
        <Button type="button" color="cyan" className={buttonClasses} disabled={pending} onClick={() => void review.verify()}>
          {pending ? "Verifying…" : "Verify Payment"}
        </Button>
        <Button type="button" color="purple" className={buttonClasses} disabled={pending} onClick={() => review.setForm("reject")}>
          Reject Receipt
        </Button>
      </div>
    )
  }

  if (status === "verified") {
    return (
      <Button type="button" color="danger" className={buttonClasses} disabled={pending} onClick={() => review.setForm("reverse")}>
        Reverse Verification
      </Button>
    )
  }

  return <p className={hintClasses}>Nothing to decide until a receipt is submitted.</p>
}
