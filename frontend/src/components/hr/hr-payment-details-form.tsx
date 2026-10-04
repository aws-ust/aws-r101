"use client"

import { useState } from "react"
import { PaymentQrField } from "@/components/hr/hr-payment-qr-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  savePaymentDetails,
  type PaymentCampaign,
} from "@/lib/api/payments"
import { uploadPaymentQr } from "@/lib/payments/payment-qr-upload"

const fieldClasses = "flex flex-col gap-2"
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
      setGcashQr(null)
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
      <PaymentQrField
        label="GCash"
        savedPreviewUrl={campaign.gcashQrPreviewUrl ?? null}
        hasSavedQr={Boolean(campaign.gcashQrImageKey || campaign.gcashQrImageUrl)}
        qrFile={gcashQr}
        savedFileName={campaign.gcashQrFileName ?? null}
        onQr={setGcashQr}
      />
      {error ? <p className={errorClasses} role="alert">{error}</p> : null}
      <Button type="button" className="mt-5" disabled={pending} onClick={() => void save()}>{pending ? "Saving…" : "Save payment details"}</Button>
    </div>
  )
}
