"use client"

import { useEffect, useState } from "react"
import { PaymentsCaughtUp, PaymentsNoMatch, PaymentsNone } from "@/components/hr/payments-empty"
import { PaymentsFilters } from "@/components/hr/payments-filters"
import { PaymentsReviewDock } from "@/components/hr/payments-review-dock"
import { PaymentsReviewPanel } from "@/components/hr/payments-review-panel"
import { PaymentsTable } from "@/components/hr/payments-table"
import type { ReviewDecision } from "@/components/hr/use-payment-review"
import type { HrPaymentFeedback } from "@/components/hr/use-hr-payment-workspace"
import type { PaymentsView } from "@/components/hr/use-payments-view"
import { Button } from "@/components/ui/button"
import type { PaymentCampaign } from "@/lib/api/payments"
import { EMPTY_PAYMENT_FILTERS, fullName, nextAfterDecision } from "@/lib/payments/workspace"
import { dashboardActionTargetClasses } from "@/lib/site/dashboard-surface"
import { cn } from "@/lib/utils"

// The table, with the review panel docked beside it while a row is open.
const areaClasses = "mt-4 grid items-start gap-4"
const dockedClasses = "xl:grid-cols-[minmax(0,1fr)_26rem]"
const clearClasses = cn("mt-2 px-4", dashboardActionTargetClasses)
// Popups own their arrow keys and Esc; the review sheet itself is the exception.
const POPUP_SELECTOR = "[role=menu],[role=listbox],[role=grid],[role=dialog],[role=alertdialog]"

type EmailDelivery = { sent: number; failed: number; queued?: number } | null

function decisionMessage(decision: ReviewDecision, name: string, delivery: EmailDelivery, lastOne: boolean): HrPaymentFeedback {
  const tail = lastOne ? " That was the last receipt. All caught up." : ""
  if (decision === "verified" && delivery && delivery.failed > 0) {
    return { type: "error", message: `Verified ${name}, but their Member ID email could not be sent. Use Retry Emails later.${tail}` }
  }
  if (decision === "verified") {
    return { type: "success", message: `Verified ${name}. Their Member ID email ${delivery?.queued ? "is on its way" : "was sent"}.${tail}` }
  }
  if (decision === "rejected") return { type: "success", message: `Rejected ${name}'s receipt. They can resubmit from their dashboard.${tail}` }
  return { type: "success", message: `Reversed ${name}'s verification.${tail}` }
}

/** True when the key belongs to something else: a field, a popup, or a half-written rejection. */
function keyBelongsElsewhere(event: KeyboardEvent) {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return true
  const target = event.target instanceof HTMLElement ? event.target : null
  if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return true
  const popup = target?.closest(POPUP_SELECTOR)
  if (popup && !popup.querySelector("[data-review-panel]")) return true
  return Boolean(document.querySelector("[data-review-form]"))
}

type PaymentsListAreaProps = {
  view: PaymentsView
  campaign: PaymentCampaign | null
  verified: number
  refresh: () => Promise<void>
  onFeedback: (feedback: HrPaymentFeedback) => void
}

export function PaymentsListArea({ view, campaign, verified, refresh, onFeedback }: PaymentsListAreaProps) {
  const { selected, step, setSelectedId } = view
  const [notice, setNotice] = useState<HrPaymentFeedback | null>(null)

  function close() {
    const id = view.selectedId
    setSelectedId(null)
    setNotice(null)
    // Back to the row the officer opened, so the keyboard picks up where it was.
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-payment-id="${id}"]`)?.focus())
  }

  useEffect(() => {
    if (!selected) return
    function onKeyDown(event: KeyboardEvent) {
      if (keyBelongsElsewhere(event)) return
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault()
        setNotice(null)
        step(event.key === "ArrowDown" ? 1 : -1)
      } else if (event.key === "Escape") {
        close()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  })

  async function onDecided(decision: ReviewDecision, delivery: EmailDelivery) {
    if (!selected) return
    const nextId = view.tab === "review" ? nextAfterDecision(view.queue, selected.paymentId) : selected.paymentId
    const message = decisionMessage(decision, fullName(selected), delivery, view.tab === "review" && nextId === null)
    await refresh()
    setSelectedId(nextId)
    // Said once: in the panel while it stays open, on the page when it closes.
    if (nextId) setNotice(message)
    else onFeedback(message)
  }

  const clearFilters = (
    <Button type="button" color="purple" className={clearClasses} onClick={() => view.setFilters(EMPTY_PAYMENT_FILTERS)}>
      Clear Filters
    </Button>
  )

  return (
    <>
      {view.tab === "all" ? <PaymentsFilters payments={view.payments} filters={view.filters} onFiltersChange={view.setFilters} /> : null}
      <div className={cn(areaClasses, selected && dockedClasses)}>
        {view.payments.length === 0 ? (
          <PaymentsNone campaign={campaign} />
        ) : view.visible.length === 0 ? (
          view.tab === "review" ? <PaymentsCaughtUp verified={verified} /> : <PaymentsNoMatch action={clearFilters} />
        ) : (
          <PaymentsTable
            payments={view.visible}
            selectedId={view.selectedId}
            onSelect={(id) => {
              setNotice(null)
              setSelectedId(id)
            }}
            label={view.tab === "review" ? "Receipts to review, oldest first" : "All payments"}
          />
        )}
        <PaymentsReviewDock open={Boolean(selected)} title={selected ? fullName(selected) : ""} onClose={close}>
          {selected ? (
            <PaymentsReviewPanel
              key={`${selected.paymentId}:${selected.status}`}
              payment={selected}
              position={view.position}
              total={view.visible.length}
              onPrevious={view.canStep(-1) ? () => (setNotice(null), step(-1)) : null}
              onNext={view.canStep(1) ? () => (setNotice(null), step(1)) : null}
              onClose={close}
              notice={notice}
              onDecided={onDecided}
            />
          ) : null}
        </PaymentsReviewDock>
      </div>
    </>
  )
}
