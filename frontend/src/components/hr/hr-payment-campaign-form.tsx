"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DatetimePicker } from "@/components/ui/datetime-picker"
import { Input } from "@/components/ui/input"
import type { CommitteeApplicationStatus } from "@/lib/api/client"
import {
  savePaymentSchedule,
  type PaymentCampaign,
} from "@/lib/api/payments"
import {
  dateYmdFromDate,
  endOfDayIsoFromYmd,
  paymentOpensAtIsoFromYmd,
} from "@/lib/datetime/date-local"
import { formatSubheaderLabel } from "@/lib/site/button-label"
import { subheaderLabelClasses } from "@/lib/site/surface"

const gridClasses = "grid gap-4 md:grid-cols-2"
const fieldClasses = "flex flex-col gap-2"
const fullFieldClasses = "flex flex-col gap-2 md:col-span-2"
const sectionClasses = "mt-5 border-t border-blue-chalk/15 pt-5"
const helpClasses = "font-sans text-xs leading-relaxed text-prelude"
const errorClasses = "mt-3 font-sans text-sm text-rose-glow"

function defaults(campaign: PaymentCampaign | null) {
  const opensAt = campaign ? new Date(campaign.opensAt) : new Date()
  const deadlineAt = campaign
    ? new Date(campaign.deadlineAt)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  return {
    opensAt: dateYmdFromDate(opensAt),
    deadlineAt: dateYmdFromDate(deadlineAt),
    generalChatLink: campaign?.generalChatLink ?? "",
    committeeLinks: Object.fromEntries(
      campaign?.committeeChatLinks.map((link) => [link.committeeId, link.chatLink]) ?? [],
    ) as Record<string, string>,
  }
}

export function HrPaymentScheduleForm({ campaign, committees, onSaved }: { campaign: PaymentCampaign | null; committees: CommitteeApplicationStatus[]; onSaved: (campaign: PaymentCampaign) => void }) {
  const [form, setForm] = useState(() => defaults(campaign))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function save() {
    setPending(true)
    setError("")
    try {
      const opensAt = paymentOpensAtIsoFromYmd(form.opensAt)
      const deadlineAt = endOfDayIsoFromYmd(form.deadlineAt)
      if (!opensAt || !deadlineAt) {
        setError("Choose valid opening and deadline dates.")
        return
      }
      const saved = await savePaymentSchedule({
        opensAt,
        deadlineAt,
        generalChatLink: form.generalChatLink.trim() || null,
        committeeChatLinks: committees.flatMap((committee) => {
          const chatLink = form.committeeLinks[committee.id]?.trim()
          return chatLink ? [{ committeeId: committee.id, chatLink }] : []
        }),
      })
      onSaved(saved)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the payment period.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <div className={gridClasses}>
        <div className={fieldClasses}>
          <FieldLabel htmlFor="payment-opens">Opening date</FieldLabel>
          <DatetimePicker
            id="payment-opens"
            dateOnly
            value={form.opensAt}
            onChange={(opensAt) => setForm((current) => ({ ...current, opensAt }))}
            required
          />
        </div>
        <div className={fieldClasses}>
          <FieldLabel htmlFor="payment-deadline">Deadline</FieldLabel>
          <DatetimePicker
            id="payment-deadline"
            dateOnly
            value={form.deadlineAt}
            onChange={(deadlineAt) => setForm((current) => ({ ...current, deadlineAt }))}
            required
          />
        </div>
        <div className={fullFieldClasses}>
          <FieldLabel htmlFor="members-fb-group">Members Facebook group</FieldLabel>
          <Input
            id="members-fb-group"
            type="url"
            inputMode="url"
            placeholder="https://www.facebook.com/groups/…"
            value={form.generalChatLink}
            onChange={(event) =>
              setForm((current) => ({ ...current, generalChatLink: event.target.value }))
            }
          />
        </div>
      </div>
      <div className={sectionClasses}>
        <div className={`${gridClasses} mt-4`}>
          {committees.map((committee) => (
            <div key={committee.id} className={fieldClasses}>
              <FieldLabel htmlFor={`chat-${committee.id}`}>{committee.name}</FieldLabel>
              <Input id={`chat-${committee.id}`} type="url" value={form.committeeLinks[committee.id] ?? ""} onChange={(event) => setForm((current) => ({ ...current, committeeLinks: { ...current.committeeLinks, [committee.id]: event.target.value } }))} />
            </div>
          ))}
        </div>
        <p className={`${helpClasses} mt-3`}>
          Accepted committee applicants receive their committee Facebook group link.
        </p>
      </div>
      {error ? <p className={errorClasses} role="alert">{error}</p> : null}
      <Button type="button" className="mt-5" disabled={pending} onClick={() => void save()}>{pending ? "Saving…" : "Save period and links"}</Button>
    </div>
  )
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className={subheaderLabelClasses}>
      {formatSubheaderLabel(children)}
    </label>
  )
}
