import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EmailFileAttachment } from "./types";

export function emailAssetPath(filename: string): string {
  const lambdaRoot = process.env.LAMBDA_TASK_ROOT?.trim();
  const candidates = [
    ...(lambdaRoot ? [resolve(lambdaRoot, "assets")] : []),
    resolve(process.cwd(), "src/lib/email/assets"),
    resolve(process.cwd(), "backend/src/lib/email/assets"),
  ];
  const assetsDirectory = candidates.find((candidate) => existsSync(candidate));
  return resolve(assetsDirectory ?? candidates[0], filename);
}

export const AWS_DEV_ASSESSMENT_FILENAME = "AWS Dev Assessment.pdf";

export function awsDevAssessmentAttachment(): EmailFileAttachment {
  const path = emailAssetPath(AWS_DEV_ASSESSMENT_FILENAME);
  return {
    filename: AWS_DEV_ASSESSMENT_FILENAME,
    mimeType: "application/pdf",
    content: readFileSync(path),
  };
}
