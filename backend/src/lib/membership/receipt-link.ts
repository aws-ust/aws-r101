import { MembershipPaymentError } from "./errors";

const DRIVE_HOSTS = new Set(["drive.google.com", "docs.google.com"]);

/** Accepts only https Google Drive / Docs links so HR can open the receipt. */
export function normalizeDriveReceiptUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new MembershipPaymentError("Enter a valid Google Drive link to your receipt.");
  }
  if (url.protocol !== "https:" || !DRIVE_HOSTS.has(url.hostname.toLowerCase())) {
    throw new MembershipPaymentError(
      "Your receipt link must be a Google Drive link (drive.google.com).",
    );
  }
  return url.toString();
}
