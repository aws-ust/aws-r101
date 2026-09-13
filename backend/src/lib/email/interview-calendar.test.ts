import assert from "node:assert/strict";
import test from "node:test";
import {
  INTERVIEW_CALENDAR_FILENAME,
  interviewCalendarAttachment,
} from "./interview-calendar";

test("creates an importable interview calendar attachment", () => {
  const attachment = interviewCalendarAttachment({
    applicationCode: "AP-2026-288404",
    committeeName: "Development, Cloud & AI",
    startsAt: new Date("2026-09-14T06:00:00.000Z"),
    endsAt: new Date("2026-09-14T06:30:00.000Z"),
    generatedAt: new Date("2026-09-13T02:03:04.000Z"),
  });
  const calendar = attachment.content.toString("utf8");

  assert.equal(attachment.filename, INTERVIEW_CALENDAR_FILENAME);
  assert.match(attachment.mimeType, /^text\/calendar/);
  assert.match(calendar, /METHOD:PUBLISH\r\n/);
  assert.match(calendar, /UID:AP-2026-288404@aws-ust-recruitment\r\n/);
  assert.match(calendar, /DTSTART:20260914T060000Z\r\n/);
  assert.match(calendar, /DTEND:20260914T063000Z\r\n/);
  assert.match(calendar, /Development\\, Cloud & AI/);
  assert.match(calendar, /Application ID: AP-2026-288404\\nView or update/);
  assert.match(calendar, /END:VCALENDAR\r\n$/);
});
