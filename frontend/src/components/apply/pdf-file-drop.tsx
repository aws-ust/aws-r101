"use client"

import { useId, useState } from "react"
import { Field } from "@/components/shared/field"
import {
  APPLICATION_DOCUMENT_PDF_MAX_SIZE_LABEL,
  applicationDocumentPdfSizeLimitMessage,
  isApplicationDocumentPdfWithinSizeLimit,
} from "@/lib/apply/field-validation"
import { cn } from "@/lib/utils"

const hintClasses = "font-sans text-xs text-prelude"
const dropErrorClasses = "font-sans text-xs text-rose-glow"
const dropClasses =
  "flex min-h-24 cursor-pointer items-center justify-center rounded-[20px] border border-dashed border-biloba-flower/50 bg-haiti/35 px-4 py-6 text-center font-sans text-sm text-prelude transition-colors"
const dropActiveClasses = "border-aquamarine/70 bg-haiti/55 text-blue-chalk"
// One-line row for replacing a file that is already on record (dashboard).
const compactDropClasses =
  "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-blue-chalk/20 bg-haiti/40 px-4 py-2 text-left font-sans text-sm text-blue-chalk transition-colors hover:border-blue-chalk/40"
const compactActiveClasses = "border-biloba-flower/60 bg-haiti/60"
const compactNameClasses = "min-w-0 truncate"
const compactActionClasses = "shrink-0 font-sans text-xs text-prelude underline underline-offset-4"
const inputClasses = "sr-only"
export const pdfDropPlaceholder = `Drag and drop or browse (.pdf, max ${APPLICATION_DOCUMENT_PDF_MAX_SIZE_LABEL})`

type PdfFileDropProps = {
  label: string
  hint?: string
  file: File | null
  displayName?: string
  required?: boolean
  error?: string
  /** A one-line row with a Replace action instead of the tall drop zone. */
  compact?: boolean
  onFile: (file: File | null) => void
}

export function PdfFileDrop({
  label,
  hint,
  file,
  displayName,
  required = true,
  error,
  compact = false,
  onFile,
}: PdfFileDropProps) {
  const id = useId()
  const [active, setActive] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  function takeFile(list: FileList | null) {
    const next = list?.[0]
    if (!next) return
    if (next.type !== "application/pdf") {
      setRejectReason("Only PDF files (.pdf) are accepted.")
      return
    }
    if (!isApplicationDocumentPdfWithinSizeLimit(next)) {
      setRejectReason(applicationDocumentPdfSizeLimitMessage())
      return
    }
    setRejectReason("")
    onFile(next)
  }

  return (
    <Field label={label} htmlFor={id} required={required} error={error}>
      {hint ? <p className={hintClasses}>{hint}</p> : null}
      <label
        htmlFor={id}
        className={
          compact
            ? cn(compactDropClasses, (active || file) && compactActiveClasses)
            : cn(dropClasses, (active || file) && dropActiveClasses)
        }
        onDragOver={(event) => {
          event.preventDefault()
          setActive(true)
        }}
        onDragLeave={() => setActive(false)}
        onDrop={(event) => {
          event.preventDefault()
          setActive(false)
          takeFile(event.dataTransfer.files)
        }}
      >
        {compact ? (
          <>
            <span className={compactNameClasses}>{file?.name ?? displayName ?? pdfDropPlaceholder}</span>
            <span className={compactActionClasses}>{file ? "Change" : "Replace"}</span>
          </>
        ) : (
          (file?.name ?? displayName ?? pdfDropPlaceholder)
        )}
      </label>
      <input
        id={id}
        type="file"
        accept="application/pdf"
        required={required && !file && !displayName}
        className={inputClasses}
        onChange={(event) => takeFile(event.target.files)}
      />
      {rejectReason ? (
        <p className={dropErrorClasses} role="alert">
          {rejectReason}
        </p>
      ) : null}
    </Field>
  )
}
