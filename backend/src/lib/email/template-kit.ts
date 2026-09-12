import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const APPLICATION_RECEIVED_HEADER_CID =
  "application-received-header@aws-ust";

const EMAIL_TZ = "Asia/Manila";
const INTERVIEW_MINUTES = 30;

export function escapeHtmlForEmail(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applicationReceivedHeaderBytes(): Buffer {
  const path = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "assets/application-received-header.png",
  );
  return readFileSync(path);
}

export function brandedEmailHeaderInline() {
  return {
    cid: APPLICATION_RECEIVED_HEADER_CID,
    mimeType: "image/png",
    filename: "application-received-header.png",
    content: applicationReceivedHeaderBytes(),
  };
}

export function academicYearLabel(applicationCode: string): string {
  const match = /^AP-(\d{4})-/i.exec(applicationCode);
  if (!match) return "";
  const start = Number(match[1]);
  return `A.Y. ${start}–${start + 1}`;
}

export function formatInterviewSlot(startsAt: Date): string {
  const endsAt = new Date(startsAt.getTime() + INTERVIEW_MINUTES * 60 * 1000);
  const date = startsAt.toLocaleDateString("en-PH", {
    timeZone: EMAIL_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const startTime = startsAt.toLocaleTimeString("en-PH", {
    timeZone: EMAIL_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = endsAt.toLocaleTimeString("en-PH", {
    timeZone: EMAIL_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date}, ${startTime} – ${endTime}`;
}

export function formatChoiceLabel(choice: {
  committee: string;
  title: string;
}): string {
  return `${choice.title} (${choice.committee})`;
}

function emailHeaderRow(input: {
  headerImageUrl?: string;
  headerImageAlt?: string;
  eyebrow: string;
  bannerTitle: string;
  bannerSub: string;
}): string {
  if (input.headerImageUrl) {
    const alt = escapeHtmlForEmail(input.headerImageAlt ?? "AWS Builders - UST");
    return `<tr>
          <td style="padding:0;line-height:0;">
            <img src="${escapeHtmlForEmail(input.headerImageUrl)}" alt="${alt}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
          </td>
        </tr>`;
  }
  return `<tr>
          <td style="background:#170f33;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.14em;color:#5af0c0;">${escapeHtmlForEmail(input.eyebrow)}</p>
            <h1 style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.25;color:#f3eeff;">${escapeHtmlForEmail(input.bannerTitle)}</h1>
            ${input.bannerSub ? `<p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#c6b8e8;">${escapeHtmlForEmail(input.bannerSub)}</p>` : ""}
          </td>
        </tr>`;
}

export function wrapBrandedHtml(input: {
  eyebrow: string;
  bannerTitle: string;
  bannerSub: string;
  heading: string;
  inner: string;
  headerImageUrl?: string;
  headerImageAlt?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtmlForEmail(input.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f3eeff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eeff;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-collapse:collapse;">
        ${emailHeaderRow(input)}
        <tr>
          <td style="padding:32px 36px 8px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#170f33;">
            <h2 style="margin:0 0 24px;text-align:center;font-size:22px;color:#46258a;">${escapeHtmlForEmail(input.heading)}</h2>
            ${input.inner}
          </td>
        </tr>
        <tr>
          <td style="background:#46258a;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.1em;color:#f3eeff;">IT&apos;S ALWAYS DAY ONE.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function ctaButton(href: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding:8px 0 24px;">
      <a href="${escapeHtmlForEmail(href)}" style="display:inline-block;background:#46258a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">${escapeHtmlForEmail(label)}</a>
    </td>
  </tr>
</table>`;
}
