import assert from "node:assert/strict";
import test from "node:test";
import {
  applicantOtpTemplate,
  applicationSubmittedTemplate,
  officerApplicationNoticeTemplate,
  resultAcceptedTemplate,
  resultRejectedTemplate,
} from "./templates";

test("applicant email templates use compact, plain formatting", async (t) => {
  await t.test("renders the OTP in the branded application email style", () => {
    const email = applicantOtpTemplate({
      lastName: "Olmedo",
      applicationCode: "AP-2026-288404",
      code: "076027",
      expiresInMinutes: 10,
    });

    assert.match(email.html, /Greetings from the Clouds!/);
    assert.match(email.html, /Good day, Mx\. Olmedo/);
    assert.match(email.html, /cid:application-received-header@aws-ust/);
    assert.equal(email.inline?.length, 1);
    assert.match(email.html, /076027/);
    assert.match(email.html, /Application ID: <strong>AP-2026-288404<\/strong>/);
    assert.match(email.html, />Open your application</);
    assert.match(email.html, /Yours in Thomasian Leadership,/);
    assert.doesNotMatch(email.html, /Hi /);
    assert.doesNotMatch(email.html, /Recruitment Team/);
  });

  await t.test("links the confirmation email to applicant status", () => {
    const email = applicationSubmittedTemplate({
      lastName: "Olmedo",
      applicationCode: "AP-2026-288404",
      firstChoice: {
        committee: "Development",
        title: "Development Committee Staff",
      },
      secondChoice: {
        committee: "Technical",
        title: "Technical Committee Staff",
      },
      interviewStartsAt: new Date("2026-09-12T06:00:00.000Z"),
    });

    assert.match(email.html, /<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!<\/p>/);
    assert.match(email.html, /cid:application-received-header@aws-ust/);
    assert.equal(email.inline?.length, 1);
    assert.equal(email.inline?.[0]?.mimeType, "image/png");
    assert.match(email.html, /<strong>First choice<\/strong>/);
    assert.match(email.html, /<strong>Interview<\/strong>/);
    assert.match(email.html, /Good day, Mx\. Olmedo/);
    assert.match(email.text, /Greetings from the Clouds!\n\n\nGood day/);
    assert.match(email.text, /Good day, Mx\. Olmedo/);
    assert.doesNotMatch(email.html, /Hi /);
    assert.doesNotMatch(email.text, /Hi /);
    assert.match(email.html, /<strong>AP-2026-288404<\/strong>/);
    assert.match(email.text, /Application ID: AP-2026-288404/);
    assert.match(email.html, /Development Committee Staff/);
    assert.match(email.html, /Technical Committee Staff/);
    assert.match(email.text, /change your interview slot/);
    assert.match(email.html, /Yours in Thomasian Leadership,/);
    assert.match(
      email.html,
      /<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board<\/p>/,
    );
    assert.match(email.html, /http:\/\/localhost:3000\/apply\/status/);
    assert.match(email.html, />View your application</);
    assert.doesNotMatch(email.html, /once that feature is available/);
    assert.doesNotMatch(email.html, /Recruitment Team/);
  });

  await t.test("notifies the first-choice officer with applicant details", () => {
    const email = officerApplicationNoticeTemplate({
      officerLastName: "Padua",
      applicantFirstName: "Alden",
      applicantLastName: "Olmedo",
      studentNumber: "2023123456",
      email: "alden@ust.edu.ph",
      applicationCode: "AP-2026-288404",
      firstChoice: {
        committee: "Office of the Chief Executive Officer",
        title: "Chief Executive Officer",
      },
      secondChoice: {
        committee: "Development Committee",
        title: "Development Committee Staff",
      },
      interviewStartsAt: new Date("2026-09-12T06:00:00.000Z"),
    });

    assert.match(email.subject, /New EA applicant for your office — Alden Olmedo \| R101/);
    assert.match(email.text, /Good day, Mx\. Padua/);
    assert.match(email.text, /Student number: 2023123456/);
    assert.match(email.text, /UST email: alden@ust.edu.ph/);
    assert.match(email.text, /First choice:/);
    assert.match(email.text, /Second choice:/);
    assert.match(email.text, /Interview:/);
    assert.match(email.html, /cid:application-received-header@aws-ust/);
    assert.match(email.html, /<strong>Interview<\/strong>/);
    assert.equal(email.inline?.length, 1);
  });

  await t.test("personalizes accepted and rejected result emails", () => {
    const accepted = resultAcceptedTemplate({
      lastName: "Dela Cruz",
      position: "Development Committee Staff",
      memberId: "AWS-2026-0001",
    });
    const rejected = resultRejectedTemplate({ lastName: "Dela Cruz" });

    assert.match(accepted.text, /Mx\. Dela Cruz/);
    assert.match(accepted.subject, /R101/);
    assert.doesNotMatch(accepted.subject, /R1O1/);
    assert.match(accepted.text, /Development Committee Staff/);
    assert.match(accepted.html, /Development Committee Staff/);
    assert.match(accepted.text, /Membership ID: AWS-2026-0001/);
    assert.match(accepted.html, /AWS-2026-0001/);
    assert.match(accepted.html, /cid:application-received-header@aws-ust/);
    assert.match(accepted.html, />Join the Messenger group chat</);
    assert.doesNotMatch(accepted.html, /Best regards/);
    assert.match(rejected.text, /Mx\. Dela Cruz/);
    assert.match(rejected.subject, /R101/);
    assert.match(rejected.text, /were not selected/);
    assert.doesNotMatch(rejected.text, /Membership ID/);
    assert.match(rejected.html, /Yours in Thomasian Leadership,/);
  });
});
