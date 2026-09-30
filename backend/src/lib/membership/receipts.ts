import {
  CopyObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  configuredBucket,
  deleteKeys,
  s3Client,
  sanitizeFileName,
} from "../applications/documents";

export const MAX_RECEIPT_SIZE_BYTES = 10_000_000;
export const RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type ReceiptMimeType = (typeof RECEIPT_MIME_TYPES)[number];

const EXTENSIONS: Record<ReceiptMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function paymentReceiptKey(
  applicationId: string,
  uploadId: string,
  mimeType: ReceiptMimeType,
): string {
  return `incoming/payment-receipts/${applicationId}/${uploadId}.${EXTENSIONS[mimeType]}`;
}

export function isPaymentReceiptKeyForApplication(
  key: string,
  applicationId: string,
): boolean {
  return key.startsWith(`incoming/payment-receipts/${applicationId}/`);
}

export function storedPaymentReceiptKey(
  paymentId: string,
  submissionId: string,
  mimeType: ReceiptMimeType,
) {
  return `payment-receipts/${paymentId}/${submissionId}.${EXTENSIONS[mimeType]}`;
}

export async function createPaymentReceiptUpload(input: {
  applicationId: string;
  uploadId: string;
  mimeType: ReceiptMimeType;
  sizeBytes: number;
  checksumSha256: string;
}) {
  const bucket = configuredBucket();
  const key = paymentReceiptKey(
    input.applicationId,
    input.uploadId,
    input.mimeType,
  );
  const upload = await createPresignedPost(s3Client(), {
    Bucket: bucket,
    Key: key,
    Expires: 10 * 60,
    Fields: {
      "Content-Type": input.mimeType,
      "x-amz-checksum-algorithm": "SHA256",
      "x-amz-checksum-sha256": input.checksumSha256,
      "x-amz-server-side-encryption": "AES256",
      success_action_status: "204",
    },
    Conditions: [
      ["eq", "$key", key],
      ["eq", "$Content-Type", input.mimeType],
      ["eq", "$x-amz-checksum-algorithm", "SHA256"],
      ["eq", "$x-amz-checksum-sha256", input.checksumSha256],
      ["eq", "$x-amz-server-side-encryption", "AES256"],
      ["content-length-range", input.sizeBytes, input.sizeBytes],
    ],
  });
  return { ...upload, key };
}

function matchesImageSignature(bytes: Uint8Array, mimeType: ReceiptMimeType) {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  return (
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  );
}

export async function validatePaymentReceipt(input: {
  key: string;
  applicationId: string;
  mimeType: ReceiptMimeType;
  sizeBytes: number;
  checksumSha256: string;
}) {
  if (!isPaymentReceiptKeyForApplication(input.key, input.applicationId)) {
    throw new Error("Receipt upload does not belong to this application.");
  }
  const client = s3Client();
  const bucket = configuredBucket();
  const head = await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: input.key,
      ChecksumMode: "ENABLED",
    }),
  );
  if (
    head.ContentLength !== input.sizeBytes ||
    head.ContentType !== input.mimeType ||
    head.ChecksumSHA256 !== input.checksumSha256
  ) {
    throw new Error("Uploaded receipt metadata does not match the request.");
  }
  const object = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Range: "bytes=0-15",
    }),
  );
  const bytes = await object.Body?.transformToByteArray();
  if (!bytes || !matchesImageSignature(bytes, input.mimeType)) {
    throw new Error("Uploaded receipt is not a supported image.");
  }
}

export async function persistPaymentReceipt(input: {
  incomingKey: string;
  paymentId: string;
  submissionId: string;
  mimeType: ReceiptMimeType;
}) {
  const bucket = configuredBucket();
  const storedKey = storedPaymentReceiptKey(
    input.paymentId,
    input.submissionId,
    input.mimeType,
  );
  await s3Client().send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: storedKey,
      CopySource: `${bucket}/${input.incomingKey}`,
      MetadataDirective: "COPY",
      ServerSideEncryption: "AES256",
    }),
  );
  await deleteKeys([input.incomingKey]);
  return storedKey;
}

export async function createPaymentReceiptDownload(
  key: string,
  fileName: string,
): Promise<string> {
  const bucket = configuredBucket();
  await s3Client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  return getSignedUrl(
    s3Client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `inline; filename="${sanitizeFileName(fileName)}"`,
      ResponseCacheControl: "no-store",
    }),
    { expiresIn: 60 },
  );
}
