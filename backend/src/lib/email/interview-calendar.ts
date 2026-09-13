import { appBaseUrl } from "./config";
import type { EmailFileAttachment } from "./types";

export const INTERVIEW_CALENDAR_FILENAME =
  "aws-builders-ust-interview.ics";

function formatUtcTimestamp(value: Date): string {
  return value
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeCalendarText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function interviewCalendarAttachment(input: {
  applicationCode: string;
  committeeName: string;
  startsAt: Date;
  endsAt: Date;
  generatedAt?: Date;
}): EmailFileAttachment {
  const generatedAt = input.generatedAt ?? new Date();
  const statusUrl = `${appBaseUrl()}/apply/status`;
  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//AWS Builders UST//R101 Interview//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.applicationCode}@aws-ust-recruitment`,
    `DTSTAMP:${formatUtcTimestamp(generatedAt)}`,
    `LAST-MODIFIED:${formatUtcTimestamp(generatedAt)}`,
    `SEQUENCE:${Math.floor(generatedAt.getTime() / 1000)}`,
    `DTSTART:${formatUtcTimestamp(input.startsAt)}`,
    `DTEND:${formatUtcTimestamp(input.endsAt)}`,
    `SUMMARY:${escapeCalendarText(`AWS Builders - UST Interview - ${input.committeeName}`)}`,
    `DESCRIPTION:${escapeCalendarText(`Application ID: ${input.applicationCode}\nView or update your application: ${statusUrl}`)}`,
    `URL:${statusUrl}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ];

  return {
    filename: INTERVIEW_CALENDAR_FILENAME,
    mimeType: "text/calendar; charset=UTF-8; method=PUBLISH",
    content: Buffer.from(lines.join("\r\n"), "utf8"),
  };
}
