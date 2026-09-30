"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createApplicantPaymentReceiptUpload,
  submitApplicantPayment,
  type ApplicantPayment,
} from "@/lib/api/applicant"
import { fileChecksum } from "@/lib/apply/document-upload"

const formClasses = "flex flex-col gap-4"
const fieldClasses = "flex flex-col gap-2"
const helpClasses = "font-sans text-xs leading-relaxed text-prelude"
const errorClasses = "font-sans text-sm text-rose-glow"
const buttonClasses = "w-fit px-5"

async function uploadReceipt(file: File) {
  const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp"
  const checksumSha256 = await fileChecksum(file)
  const signed = await createApplicantPaymentReceiptUpload({
    mimeType,
    sizeBytes: file.size,
    checksumSha256,
  })
  const form = new FormData()
  Object.entries(signed.fields).forEach(([name, value]) => form.append(name, value))
  form.append("file", file)
  const response = await fetch(signed.url, { method: "POST", body: form })
  if (!response.ok) throw new Error("Could not upload the receipt image.")
  return { mimeType, checksumSha256, receiptKey: signed.key }
}

export function ApplicantPaymentForm({
  payment,
  onSubmitted,
}: {
  payment: ApplicantPayment
  onSubmitted: () => Promise<void>
}) {
  const firstMethod = payment.paymentMethods.gcash ? "gcash" : "bpi"
  const [method, setMethod] = useState<"gcash" | "bpi">(firstMethod)
  const [referenceNumber, setReferenceNumber] = useState("")
  const [receipt, setReceipt] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function submit() {
    setError("")
    if (!receipt) {
      setError("Choose a receipt image.")
      return
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(receipt.type)) {
      setError("Receipt must be a JPEG, PNG, or WebP image.")
      return
    }
    if (receipt.size > 10_000_000) {
      setError("Receipt image must be 10 MB or smaller.")
      return
    }
    setPending(true)
    try {
      const upload = await uploadReceipt(receipt)
      await submitApplicantPayment({
        method,
        referenceNumber,
        receiptFileName: receipt.name,
        sizeBytes: receipt.size,
        ...upload,
      })
      await onSubmitted()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not submit payment.",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={formClasses}>
      <div className={fieldClasses}>
        <Label htmlFor="payment-method">Payment method</Label>
        <Select value={method} onValueChange={(value) => setMethod(value as "gcash" | "bpi")}>
          <SelectTrigger id="payment-method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {payment.paymentMethods.gcash ? <SelectItem value="gcash">GCash</SelectItem> : null}
            {payment.paymentMethods.bpi ? <SelectItem value="bpi">BPI</SelectItem> : null}
          </SelectContent>
        </Select>
      </div>
      <div className={fieldClasses}>
        <Label htmlFor="payment-reference">Reference number</Label>
        <Input
          id="payment-reference"
          value={referenceNumber}
          maxLength={100}
          required
          onChange={(event) => setReferenceNumber(event.target.value)}
        />
      </div>
      <div className={fieldClasses}>
        <Label htmlFor="payment-receipt">Receipt image</Label>
        <Input
          id="payment-receipt"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
        />
        <p className={helpClasses}>JPEG, PNG, or WebP. Maximum size: 10 MB.</p>
      </div>
      {error ? <p className={errorClasses} role="alert">{error}</p> : null}
      <Button
        type="button"
        color="cyan"
        className={buttonClasses}
        disabled={pending || referenceNumber.trim().length < 4 || !receipt}
        onClick={() => void submit()}
      >
        {pending ? "Submitting…" : "Submit for verification"}
      </Button>
    </div>
  )
}
