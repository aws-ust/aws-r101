import {
  completePaymentQrUpload,
  createPaymentQrUpload,
  type PaymentQrMimeType,
  type PaymentQrProvider,
} from "@/lib/api/payments"
import { fileChecksum } from "@/lib/apply/document-upload"

const QR_MIME_TYPES: PaymentQrMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
]
const MAX_QR_SIZE_BYTES = 5_000_000

export async function uploadPaymentQr(
  provider: PaymentQrProvider,
  file: File,
) {
  if (!QR_MIME_TYPES.includes(file.type as PaymentQrMimeType)) {
    throw new Error("QR image must be a JPEG, PNG, or WebP file.")
  }
  if (file.size > MAX_QR_SIZE_BYTES) {
    throw new Error("QR image must be 5 MB or smaller.")
  }
  const mimeType = file.type as PaymentQrMimeType
  const checksumSha256 = await fileChecksum(file)
  const metadata = {
    provider,
    mimeType,
    sizeBytes: file.size,
    checksumSha256,
  }
  const signed = await createPaymentQrUpload(metadata)
  const form = new FormData()
  Object.entries(signed.fields).forEach(([name, value]) =>
    form.append(name, value),
  )
  form.append("file", file)
  const response = await fetch(signed.url, { method: "POST", body: form })
  if (!response.ok) throw new Error("Could not upload the QR image.")
  return completePaymentQrUpload({ ...metadata, key: signed.key })
}
