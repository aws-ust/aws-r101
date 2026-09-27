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

const gridClasses = "grid gap-4 md:grid-cols-2"
const fieldClasses = "flex flex-col gap-2"
const fullFieldClasses = "flex flex-col gap-2 md:col-span-2"
const sectionClasses = "mt-5 border-t border-blue-chalk/15 pt-5"
const sectionTitleClasses = "mb-3 font-sans text-sm font-semibold text-biloba-flower"
const errorClasses = "mt-3 font-sans text-sm text-rose-glow"

export function HrPaymentDetailsForm({ campaign, onSaved }: { campaign: PaymentCampaign; onSaved: (campaign: PaymentCampaign) => void }) {
  const [form, setForm] = useState(() => ({
    amount: String((campaign.amountCents ?? 25_000) / 100),
    gcashAccountName: campaign.gcashAccountName ?? "",
    gcashAccountNumber: campaign.gcashAccountNumber ?? "",
    bpiAccountName: campaign.bpiAccountName ?? "",
    bpiAccountNumber: campaign.bpiAccountNumber ?? "",
  }))
  const [gcashQr, setGcashQr] = useState<File | null>(null)
  const [bpiQr, setBpiQr] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function save() {
    setPending(true)
    setError("")
    try {
      await Promise.all([
        gcashQr ? uploadPaymentQr("gcash", gcashQr) : Promise.resolve(),
        bpiQr ? uploadPaymentQr("bpi", bpiQr) : Promise.resolve(),
      ])
      const saved = await savePaymentDetails({
        amountCents: Math.round(Number(form.amount) * 100),
        gcashAccountName: form.gcashAccountName || null,
        gcashAccountNumber: form.gcashAccountNumber || null,
        bpiAccountName: form.bpiAccountName || null,
        bpiAccountNumber: form.bpiAccountNumber || null,
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
      <PaymentAccountFields label="GCash" name={form.gcashAccountName} number={form.gcashAccountNumber} hasQr={Boolean(campaign.gcashQrImageKey || campaign.gcashQrImageUrl)} qrFile={gcashQr} onName={(value) => setForm((current) => ({ ...current, gcashAccountName: value }))} onNumber={(value) => setForm((current) => ({ ...current, gcashAccountNumber: value }))} onQr={setGcashQr} />
      <PaymentAccountFields label="BPI" name={form.bpiAccountName} number={form.bpiAccountNumber} hasQr={Boolean(campaign.bpiQrImageKey || campaign.bpiQrImageUrl)} qrFile={bpiQr} onName={(value) => setForm((current) => ({ ...current, bpiAccountName: value }))} onNumber={(value) => setForm((current) => ({ ...current, bpiAccountNumber: value }))} onQr={setBpiQr} />
      {error ? <p className={errorClasses} role="alert">{error}</p> : null}
      <Button type="button" className="mt-5" disabled={pending} onClick={() => void save()}>{pending ? "Saving…" : "Save payment details"}</Button>
    </div>
  )
}

function PaymentAccountFields({ label, name, number, hasQr, qrFile, onName, onNumber, onQr }: { label: string; name: string; number: string; hasQr: boolean; qrFile: File | null; onName: (value: string) => void; onNumber: (value: string) => void; onQr: (value: File | null) => void }) {
  const slug = label.toLowerCase()
  return (
    <div className={sectionClasses}>
      <p className={sectionTitleClasses}>{label}</p>
      <div className={gridClasses}>
        <div className={fieldClasses}><Label htmlFor={`${slug}-name`}>Account name</Label><Input id={`${slug}-name`} value={name} onChange={(event) => onName(event.target.value)} /></div>
        <div className={fieldClasses}><Label htmlFor={`${slug}-number`}>Account number</Label><Input id={`${slug}-number`} value={number} onChange={(event) => onNumber(event.target.value)} /></div>
        <div className={fullFieldClasses}>
          <Label htmlFor={`${slug}-qr`}>Official QR image</Label>
          <Input id={`${slug}-qr`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onQr(event.target.files?.[0] ?? null)} />
          <p className="font-sans text-xs text-prelude">{qrFile ? qrFile.name : hasQr ? "A QR image is already uploaded. Choose another file to replace it." : "JPEG, PNG, or WebP. Maximum size: 5 MB."}</p>
        </div>
      </div>
    </div>
  )
}
