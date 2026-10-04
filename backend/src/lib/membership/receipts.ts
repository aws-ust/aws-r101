import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  configuredBucket,
  s3Client,
  sanitizeFileName,
} from "../applications/documents";

/**
 * Receipts are now submitted as Google Drive links. This still serves
 * submissions made before that, which stored an uploaded image in S3.
 */
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
