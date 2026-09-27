"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DatetimePicker } from "@/components/ui/datetime-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CommitteeApplicationStatus } from "@/lib/api/client"
import {
  savePaymentSchedule,
  type PaymentCampaign,
} from "@/lib/api/payments"
import { formatDatetimeLocal } from "@/lib/datetime/datetime-local"

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
    opensAt: formatDatetimeLocal(opensAt),
    deadlineAt: formatDatetimeLocal(deadlineAt),
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
      const saved = await savePaymentSchedule({
        opensAt: new Date(form.opensAt).toISOString(),
        deadlineAt: new Date(form.deadlineAt).toISOString(),
        generalChatLink: form.generalChatLink || null,
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
          <Label htmlFor="payment-opens">Opening date</Label>
          <DatetimePicker id="payment-opens" value={form.opensAt} onChange={(opensAt) => setForm((current) => ({ ...current, opensAt }))} required />
        </div>
        <div className={fieldClasses}>
          <Label htmlFor="payment-deadline">Deadline</Label>
          <DatetimePicker id="payment-deadline" value={form.deadlineAt} onChange={(deadlineAt) => setForm((current) => ({ ...current, deadlineAt }))} required />
        </div>
      </div>
      <div className={sectionClasses}>
        <div className={fullFieldClasses}>
          <Label htmlFor="general-chat-link">General-members group chat</Label>
          <Input id="general-chat-link" type="url" value={form.generalChatLink} onChange={(event) => setForm((current) => ({ ...current, generalChatLink: event.target.value }))} />
        </div>
        <div className={`${gridClasses} mt-4`}>
          {committees.map((committee) => (
            <div key={committee.id} className={fieldClasses}>
              <Label htmlFor={`chat-${committee.id}`}>{committee.name}</Label>
              <Input id={`chat-${committee.id}`} type="url" value={form.committeeLinks[committee.id] ?? ""} onChange={(event) => setForm((current) => ({ ...current, committeeLinks: { ...current.committeeLinks, [committee.id]: event.target.value } }))} />
            </div>
          ))}
        </div>
        <p className={`${helpClasses} mt-3`}>Accepted committee applicants receive their committee link. General members receive the general-members link.</p>
      </div>
      {error ? <p className={errorClasses} role="alert">{error}</p> : null}
      <Button type="button" className="mt-5" disabled={pending} onClick={() => void save()}>{pending ? "Saving…" : "Save period and links"}</Button>
    </div>
  )
}
