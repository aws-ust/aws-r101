"use client"

import { useEffect, useMemo, useRef } from "react"
import { QrPreview } from "@/components/shared/qr-preview"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

const sectionClasses = "mt-5 border-t border-blue-chalk/15 pt-5"
const sectionTitleClasses = "mb-3 font-sans text-sm font-semibold text-biloba-flower"
const rowClasses = "flex flex-col gap-4 sm:flex-row sm:items-start"
const fieldClasses = "flex min-w-0 flex-1 flex-col gap-2"
const fileNameClasses = "truncate font-sans text-sm font-medium text-blue-chalk"
const helpClasses = "font-sans text-xs text-prelude"
const actionsClasses = "mt-1 flex flex-wrap gap-2"
const actionButtonClasses = "h-9 px-4 text-xs"

type PaymentQrFieldProps = {
  label: string
  savedPreviewUrl: string | null
  savedFileName: string | null
  hasSavedQr: boolean
  qrFile: File | null
  onQr: (value: File | null) => void
}

function useFilePreviewUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => {
    if (!url) return
    return () => URL.revokeObjectURL(url)
  }, [url])
  return url
}

export function PaymentQrField({
  label,
  savedPreviewUrl,
  savedFileName,
  hasSavedQr,
  qrFile,
  onQr,
}: PaymentQrFieldProps) {
  const id = `${label.toLowerCase()}-qr`
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingPreviewUrl = useFilePreviewUrl(qrFile)
  const previewUrl = pendingPreviewUrl ?? savedPreviewUrl
  const fileName = qrFile?.name ?? (hasSavedQr ? savedFileName ?? `${label} QR` : null)
  const help = qrFile
    ? "Not saved yet. Press Save Payment Details to upload it."
    : hasSavedQr
      ? "This QR is saved and shown to applicants."
      : "JPEG, PNG, or WebP. Maximum size: 5 MB."

  return (
    <div className={sectionClasses}>
      <p className={sectionTitleClasses}>{label}</p>
      <div className={rowClasses}>
        {previewUrl ? (
          <QrPreview
            src={previewUrl}
            label={label}
            caption={qrFile ? "New (unsaved)" : "Saved QR"}
            fileName={fileName}
          />
        ) : null}
        <div className={fieldClasses}>
          <Label htmlFor={id}>Official QR image</Label>
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              onQr(event.target.files?.[0] ?? null)
              event.target.value = ""
            }}
          />
          {fileName ? <p className={fileNameClasses}>{fileName}</p> : null}
          <p className={helpClasses}>{help}</p>
          <div className={actionsClasses}>
            <Button type="button" color="purple" className={actionButtonClasses} onClick={() => inputRef.current?.click()}>
              {qrFile || hasSavedQr ? "Replace QR" : "Upload QR"}
            </Button>
            {qrFile ? (
              <Button type="button" color="purple" className={actionButtonClasses} onClick={() => onQr(null)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
