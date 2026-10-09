export function emailEnabled(): boolean {
  const raw = process.env.EMAIL_ENABLED ?? "true";
  return raw.toLowerCase() !== "false";
}

/**
 * A test-run safety net: when `EMAIL_ALLOWED_RECIPIENTS` lists addresses, those
 * are the only ones ever emailed. Unset (the deployed default) it allows everyone.
 */
export function allowedRecipients(): Set<string> | null {
  const raw = process.env.EMAIL_ALLOWED_RECIPIENTS?.trim();
  if (!raw) return null;
  return new Set(raw.split(",").map((address) => address.trim().toLowerCase()).filter(Boolean));
}

/** Throws, without sending, if the allow list is set and an address is not on it. */
export function assertRecipientsAllowed(addresses: readonly string[]): void {
  const allowed = allowedRecipients();
  if (!allowed) return;
  const blocked = addresses.filter((address) => !allowed.has(address.trim().toLowerCase()));
  if (blocked.length > 0) {
    throw new Error(
      `Blocked by EMAIL_ALLOWED_RECIPIENTS: ${blocked.join(", ")} is not on the test recipient list, so nothing was sent.`,
    );
  }
}

export function hasGmailCredentials(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN,
  );
}

export function senderName(): string {
  return process.env.GOOGLE_SENDER_NAME ?? "AWS Builders - UST";
}

export function senderEmail(): string {
  return process.env.GOOGLE_SENDER_EMAIL ?? "aws.cics@ust.edu.ph";
}

export function replyToEmail(): string {
  return process.env.GOOGLE_REPLY_TO_EMAIL ?? senderEmail();
}

export function signatoryName(): string {
  return process.env.GOOGLE_SIGNATORY_NAME ?? "Claire";
}

/**
 * The website's address, which every button and link in an email points at.
 * `APP_BASE_URL` wins; the site's CORS origin is the same address, so it
 * covers a deploy that forgot to set it. Only a local run may fall back to
 * localhost: on Lambda a missing address is an error, because an email that
 * links to localhost can never work for the person who receives it.
 */
export function appBaseUrl(): string {
  const configured = (process.env.APP_BASE_URL?.trim() || process.env.CORS_ORIGIN?.trim() || "").replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error("APP_BASE_URL is not set, so email links would point at localhost.");
  }
  return "http://localhost:3000";
}

export function fromHeader(): string {
  return `${senderName()} <${senderEmail()}>`;
}
