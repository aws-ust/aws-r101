"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  savePaymentDetails,
  type PaymentCampaign,
} from "@/lib/api/payments"
import { uploadPaymentQr } from "@/lib/payments/payment-qr-upload"

const fieldClasses = "flex flex-col gap-2"
const fullFieldClasses = "flex flex-col gap-2"
const sectionClasses = "mt-5 border-t border-blue-chalk/15 pt-5"
const sectionTitleClasses = "mb-3 font-sans text-sm font-semibold text-biloba-flower"
const errorClasses = "mt-3 font-sans text-sm text-rose-glow"

export function HrPaymentDetailsForm({ campaign, onSaved }: { campaign: PaymentCampaign; onSaved: (campaign: PaymentCampaign) => void }) {
  const [form, setForm] = useState(() => ({
    amount: String((campaign.amountCents ?? 25_000) / 100),
  }))
  const [gcashQr, setGcashQr] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function save() {
    setPending(true)
    setError("")
    try {
      if (gcashQr) await uploadPaymentQr("gcash", gcashQr)
      const saved = await savePaymentDetails({
        amountCents: Math.round(Number(form.amount) * 100),
        gcashAccountName: campaign.gcashAccountName,
        gcashAccountNumber: campaign.gcashAccountNumber,
        bpiAccountName: campaign.bpiAccountName,
        bpiAccountNumber: campaign.bpiAccountNumber,
      })
      onSaved(saved)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save payment details.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <div className={fieldClasses}>
        <Label htmlFor="payment-amount">Fixed amount (PHP)</Label>
        <Input id="payment-amount" type="number" min="1" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
      </div>
      <PaymentQrField label="GCash" hasQr={Boolean(campaign.gcashQrImageKey || campaign.gcashQrImageUrl)} qrFile={gcashQr} onQr={setGcashQr} />
      {error ? <p className={errorClasses} role="alert">{error}</p> : null}
      <Button type="button" className="mt-5" disabled={pending} onClick={() => void save()}>{pending ? "Saving…" : "Save payment details"}</Button>
    </div>
  )
}

function PaymentQrField({ label, hasQr, qrFile, onQr }: { label: string; hasQr: boolean; qrFile: File | null; onQr: (value: File | null) => void }) {
  const id = `${label.toLowerCase()}-qr`
  return (
    <div className={sectionClasses}>
      <p className={sectionTitleClasses}>{label}</p>
      <div className={fullFieldClasses}>
        <Label htmlFor={id}>Official QR image</Label>
        <Input id={id} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onQr(event.target.files?.[0] ?? null)} />
        <p className="font-sans text-xs text-prelude">{qrFile ? qrFile.name : hasQr ? "A QR image is already uploaded. Choose another file to replace it." : "JPEG, PNG, or WebP. Maximum size: 5 MB."}</p>
      </div>
    </div>
  )
}
