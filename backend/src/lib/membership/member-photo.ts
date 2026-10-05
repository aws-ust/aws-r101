import { randomUUID } from "node:crypto";
import {
  CopyObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { configuredBucket, deleteKeys, s3Client } from "../applications/documents";
import { MembershipPaymentError } from "./errors";
import {
  hasExpectedSignature,
  MAX_PAYMENT_QR_SIZE_BYTES,
  PAYMENT_QR_MIME_TYPES,
  type PaymentQrMimeType,
} from "./payment-qr";

export const MAX_MEMBER_PHOTO_SIZE_BYTES = MAX_PAYMENT_QR_SIZE_BYTES;
export const MEMBER_PHOTO_MIME_TYPES = PAYMENT_QR_MIME_TYPES;
export type MemberPhotoMimeType = PaymentQrMimeType;

const EXTENSIONS: Record<MemberPhotoMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type MemberPhotoMetadata = {
  mimeType: MemberPhotoMimeType;
  sizeBytes: number;
  checksumSha256: string;
};

function incomingPhotoKey(applicationId: string, mimeType: MemberPhotoMimeType) {
  return `incoming/member-photos/${applicationId}/${randomUUID()}.${EXTENSIONS[mimeType]}`;
}

function storedPhotoKey(applicationId: string) {
  return `member-photos/${applicationId}`;
}

export async function createMemberPhotoUpload(
  applicationId: string,
  input: MemberPhotoMetadata,
) {
  const key = incomingPhotoKey(applicationId, input.mimeType);
  const upload = await createPresignedPost(s3Client(), {
    Bucket: configuredBucket(),
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

/** Validates the uploaded photo and moves it to its permanent key. */
export async function persistMemberPhoto(
  applicationId: string,
  input: MemberPhotoMetadata & { key: string },
) {
  const expectedPrefix = `incoming/member-photos/${applicationId}/`;
  if (!input.key.startsWith(expectedPrefix)) {
    throw new MembershipPaymentError(
      "Photo upload does not belong to this member.",
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
      "Uploaded photo does not match the request.",
      400,
    );
  }
  const object = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: input.key, Range: "bytes=0-15" }),
  );
  const bytes = await object.Body?.transformToByteArray();
  if (!bytes || !hasExpectedSignature(bytes, input.mimeType)) {
    throw new MembershipPaymentError(
      "Your photo must be a JPEG, PNG, or WebP image.",
      400,
    );
  }
  const storedKey = storedPhotoKey(applicationId);
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

export function createMemberPhotoDownload(key: string) {
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
