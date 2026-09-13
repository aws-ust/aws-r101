export function emailEnabled(): boolean {
  const raw = process.env.EMAIL_ENABLED ?? "true";
  return raw.toLowerCase() !== "false";
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

export function appBaseUrl(): string {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

export function messengerGcLink(): string {
  return process.env.MESSENGER_GC_LINK ?? "";
}

export function membershipPaymentLink(): string {
  const value = process.env.MEMBERSHIP_PAYMENT_LINK?.trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

export function fromHeader(): string {
  return `${senderName()} <${senderEmail()}>`;
}
