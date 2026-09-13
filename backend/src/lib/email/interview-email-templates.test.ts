import assert from "node:assert/strict";
import test from "node:test";
import {
  applicantInterviewBookingTemplate,
  interviewReminderTemplate,
} from "./templates";

const interviewStartsAt = new Date("2026-09-14T06:00:00.000Z");

test("renders applicant interview schedule updates", () => {
  const email = applicantInterviewBookingTemplate({
    lastName: "Olmedo",
    applicationCode: "AP-2026-288404",
    committeeName: "Development Committee",
    interviewStartsAt,
    rescheduled: true,
  });

  assert.match(email.subject, /Interview Schedule Updated/);
  assert.match(email.text, /has been rescheduled/);
  assert.match(email.text, /Development Committee/);
  assert.match(email.text, /calendar file is attached/);
  assert.match(email.html, />View your application</);
});

test("renders both interview reminder windows", () => {
  const dayReminder = interviewReminderTemplate({
    lastName: "Olmedo",
    applicationCode: "AP-2026-288404",
    committeeName: "Development Committee",
    interviewStartsAt,
    reminder: "24h",
  });
  const hourReminder = interviewReminderTemplate({
    lastName: "Olmedo",
    applicationCode: "AP-2026-288404",
    committeeName: "Development Committee",
    interviewStartsAt,
    reminder: "1h",
  });

  assert.match(dayReminder.text, /within 24 hours/);
  assert.match(hourReminder.text, /within an hour/);
  assert.match(hourReminder.text, /calendar file is attached again/);
});
