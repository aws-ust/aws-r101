import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { EmailFileAttachment } from "./types";

const ASSETS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "assets");

export const AWS_DEV_ASSESSMENT_FILENAME = "AWS Dev Assessment.pdf";

export function awsDevAssessmentAttachment(): EmailFileAttachment {
  const path = resolve(ASSETS_DIR, AWS_DEV_ASSESSMENT_FILENAME);
  return {
    filename: AWS_DEV_ASSESSMENT_FILENAME,
    mimeType: "application/pdf",
    content: readFileSync(path),
  };
}
