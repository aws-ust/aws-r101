import { randomUUID } from "node:crypto";
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
} from "../applications/documents";
import { MembershipPaymentError } from "./errors";

export const MAX_PAYMENT_QR_SIZE_BYTES = 5_000_000;
export const PAYMENT_QR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type PaymentQrMimeType = (typeof PAYMENT_QR_MIME_TYPES)[number];
export type PaymentQrProvider = "gcash" | "bpi";

const EXTENSIONS: Record<PaymentQrMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function incomingQrKey(
  campaignId: string,
  provider: PaymentQrProvider,
  mimeType: PaymentQrMimeType,
) {
  return [
    "incoming/payment-qrs",
    campaignId,
    provider,
    randomUUID() + "." + EXTENSIONS[mimeType],
  ].join("/");
}

function storedQrKey(campaignId: string, provider: PaymentQrProvider) {
  return "payment-qrs/" + campaignId + "/" + provider;
}

function hasExpectedSignature(
  bytes: Uint8Array,
  mimeType: PaymentQrMimeType,
) {
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

export async function createPaymentQrUpload(input: {
  campaignId: string;
  provider: PaymentQrProvider;
  mimeType: PaymentQrMimeType;
  sizeBytes: number;
  checksumSha256: string;
}) {
  const bucket = configuredBucket();
  const key = incomingQrKey(input.campaignId, input.provider, input.mimeType);
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

export async function persistPaymentQr(input: {
  campaignId: string;
  provider: PaymentQrProvider;
  key: string;
  mimeType: PaymentQrMimeType;
  sizeBytes: number;
  checksumSha256: string;
}) {
  const expectedPrefix =
    "incoming/payment-qrs/" + input.campaignId + "/" + input.provider + "/";
  if (!input.key.startsWith(expectedPrefix)) {
    throw new MembershipPaymentError(
      "QR upload does not belong to this payment period.",
      400,
    );
  }
  const bucket = configuredBucket();
  const client = s3Client();
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
    throw new MembershipPaymentError(
      "Uploaded QR image does not match the request.",
      400,
    );
  }
  const object = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Range: "bytes=0-15",
    }),
  );
  const bytes = await object.Body?.transformToByteArray();
  if (!bytes || !hasExpectedSignature(bytes, input.mimeType)) {
    throw new MembershipPaymentError(
      "Uploaded QR must be a JPEG, PNG, or WebP image.",
      400,
    );
  }
  const storedKey = storedQrKey(input.campaignId, input.provider);
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: storedKey,
      CopySource: [bucket, input.key].join("/"),
      MetadataDirective: "COPY",
      ServerSideEncryption: "AES256",
    }),
  );
  await deleteKeys([input.key]);
  return storedKey;
}

export function createPaymentQrDownload(key: string) {
  return getSignedUrl(
    s3Client(),
    new GetObjectCommand({
      Bucket: configuredBucket(),
      Key: key,
      ResponseCacheControl: "private, max-age=300",
    }),
    { expiresIn: 10 * 60 },
  );
}

type CampaignQrFields = {
  gcashQrImageKey: string | null;
  gcashQrImageUrl: string | null;
  bpiQrImageKey: string | null;
  bpiQrImageUrl: string | null;
};

/** Adds short-lived download URLs so HR can preview the saved QR images. */
export async function withQrPreviewUrls<T extends CampaignQrFields>(campaign: T) {
  const [gcashQrPreviewUrl, bpiQrPreviewUrl] = await Promise.all([
    campaign.gcashQrImageKey
      ? createPaymentQrDownload(campaign.gcashQrImageKey)
      : campaign.gcashQrImageUrl,
    campaign.bpiQrImageKey
      ? createPaymentQrDownload(campaign.bpiQrImageKey)
      : campaign.bpiQrImageUrl,
  ]);
  return { ...campaign, gcashQrPreviewUrl, bpiQrPreviewUrl };
}
