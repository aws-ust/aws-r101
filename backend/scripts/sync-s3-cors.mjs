/**
 * Re-applies S3 bucket CORS on the running LocalStack container.
 * Init scripts only run on first bucket create; run this after changing CORS_ORIGIN.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketEncryptionCommand,
  PutBucketLifecycleConfigurationCommand,
  PutPublicAccessBlockCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const envPath = resolve(root, ".env");

function loadEnv() {
  try {
    const text = readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // optional .env
  }
}

/** LocalStack dev bucket only — matches localstack-init/01-s3.sh */
function corsOrigins() {
  return ["*"];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

loadEnv();

const bucket = process.env.S3_BUCKET ?? "aws-ust-recruitment-documents";
const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:4566";

const client = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test",
  },
});

async function ensureBucket() {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    const code = error?.name ?? error?.Code;
    if (code !== "NotFound" && code !== "NoSuchBucket") throw error;
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    await client.send(
      new PutPublicAccessBlockCommand({
        Bucket: bucket,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: true,
          RestrictPublicBuckets: true,
        },
      }),
    );
    await client.send(
      new PutBucketEncryptionCommand({
        Bucket: bucket,
        ServerSideEncryptionConfiguration: {
          Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" } }],
        },
      }),
    );
    await client.send(
      new PutBucketLifecycleConfigurationCommand({
        Bucket: bucket,
        LifecycleConfiguration: {
          Rules: [
            {
              ID: "expire-incoming-after-one-day",
              Filter: { Prefix: "incoming/" },
              Status: "Enabled",
              Expiration: { Days: 1 },
            },
          ],
        },
      }),
    );
    console.log(`Created LocalStack bucket "${bucket}".`);
  }
}

const origins = corsOrigins();
let lastError;
for (let attempt = 1; attempt <= 12; attempt++) {
  try {
    await ensureBucket();
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["POST"],
              AllowedOrigins: origins,
              ExposeHeaders: ["ETag"],
              MaxAgeSeconds: 300,
            },
          ],
        },
      }),
    );
    console.log(`LocalStack S3 ready: bucket "${bucket}", CORS origins: ${origins.join(", ")}`);
    lastError = undefined;
    break;
  } catch (error) {
    lastError = error;
    if (attempt < 12) await sleep(2000);
  }
}
if (lastError) throw lastError;
