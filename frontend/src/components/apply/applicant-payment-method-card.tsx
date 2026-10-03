"use client"

import { useState } from "react"
import type { ApplicantPayment } from "@/lib/api/applicant"

const cardClasses =
  "grid gap-4 rounded-[14px] border border-blue-chalk/15 bg-haiti/45 p-4 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center"
const titleClasses = "font-sans text-sm font-semibold text-blue-chalk"
const bodyClasses = "mt-2 font-sans text-sm leading-relaxed text-prelude"
const qrFrameClasses =
  "grid size-40 place-items-center overflow-hidden rounded-[10px] bg-white p-2"
const qrClasses = "size-full object-contain"
const fallbackClasses =
  "max-w-32 text-center font-sans text-xs leading-relaxed text-haiti"

export function ApplicantPaymentMethodCard({
  label,
  details,
}: {
  label: string
  details: NonNullable<ApplicantPayment["paymentMethods"]["gcash"]>
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const qrImageUrl = details.qrImageUrl

  return (
    <div className={cardClasses}>
      <div>
        <p className={titleClasses}>{label}</p>
        <p className={bodyClasses}>
          {details.accountName ?? "AWS Builders - UST"}
        </p>
        {details.accountNumber ? (
          <p className={bodyClasses}>{details.accountNumber}</p>
        ) : (
          <p className={bodyClasses}>Scan the QR code to pay.</p>
        )}
      </div>
      <div className={qrFrameClasses}>
        {qrImageUrl && qrImageUrl !== failedUrl ? (
          // Signed S3 URLs are dynamic and cannot be configured as static image hosts.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrImageUrl}
            alt={`${label} payment QR`}
            width={144}
            height={144}
            className={qrClasses}
            onError={() => setFailedUrl(qrImageUrl)}
          />
        ) : (
          <p className={fallbackClasses}>
            QR unavailable. Contact HR for payment details.
          </p>
        )}
      </div>
    </div>
  )
}
