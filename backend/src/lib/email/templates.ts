import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RenderedEmail } from "./types";
import { appBaseUrl, messengerGcLink } from "./config";
import { isExecutiveOfficeCommittee } from "./officer-recipients";
import {
  applicantOtpSubject,
  applicationSubmittedSubject,
  officerApplicationNoticeSubject,
  resultAcceptedSubject,
  resultRejectedSubject,
} from "./subjects";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const EMAIL_TZ = "Asia/Manila";
const INTERVIEW_MINUTES = 30;
export const APPLICATION_RECEIVED_HEADER_CID = "application-received-header@aws-ust";

function applicationReceivedHeaderBytes(): Buffer {
  const path = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "assets/application-received-header.png",
  );
  return readFileSync(path);
}

function brandedEmailHeaderInline() {
  return {
    cid: APPLICATION_RECEIVED_HEADER_CID,
    mimeType: "image/png",
    filename: "application-received-header.png",
    content: applicationReceivedHeaderBytes(),
  };
}

function academicYearLabel(applicationCode: string): string {
  const match = /^AP-(\d{4})-/i.exec(applicationCode);
  if (!match) return "";
  const start = Number(match[1]);
  return `A.Y. ${start}–${start + 1}`;
}

function formatInterviewSlot(startsAt: Date): string {
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

function formatChoiceLabel(choice: { committee: string; title: string }): string {
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
    const alt = escapeHtml(input.headerImageAlt ?? "AWS Builders - UST");
    return `<tr>
          <td style="padding:0;line-height:0;">
            <img src="${escapeHtml(input.headerImageUrl)}" alt="${alt}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
          </td>
        </tr>`;
  }
  return `<tr>
          <td style="background:#170f33;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.14em;color:#5af0c0;">${escapeHtml(input.eyebrow)}</p>
            <h1 style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.25;color:#f3eeff;">${escapeHtml(input.bannerTitle)}</h1>
            ${input.bannerSub ? `<p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#c6b8e8;">${escapeHtml(input.bannerSub)}</p>` : ""}
          </td>
        </tr>`;
}

function wrapBrandedHtml(input: {
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
<title>${escapeHtml(input.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f3eeff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eeff;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-collapse:collapse;">
        ${emailHeaderRow(input)}
        <tr>
          <td style="padding:32px 36px 8px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#170f33;">
            <h2 style="margin:0 0 24px;text-align:center;font-size:22px;color:#46258a;">${escapeHtml(input.heading)}</h2>
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

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding:8px 0 24px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;background:#46258a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

export function applicantOtpTemplate(input: {
  lastName: string;
  applicationCode: string;
  code: string;
  expiresInMinutes: number;
}): RenderedEmail {
  const statusUrl = `${appBaseUrl()}/apply/status`;
  const subject = applicantOtpSubject(input.applicationCode);
  const honorific = `Mx. ${input.lastName}`;
  const yearLabel = academicYearLabel(input.applicationCode);

  const text = `Greetings from the Clouds!


Good day, ${honorific},

You asked to sign in to your AWS Builders - UST application. Use the verification code below on your application status page.

Verification code: ${input.code}

This code expires in ${input.expiresInMinutes} minutes and can only be used once. For your security, do not share it with anyone.

Application ID: ${input.applicationCode}

Open your application: ${statusUrl}

If you did not request this code, you can safely ignore this email.

Yours in Thomasian Leadership,
The AWS Builders - UST Executive Board`;

  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "WELCOME, BUILDER!",
    bannerSub: yearLabel,
    heading: "Verification code",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 0;line-height:8px;font-size:8px;">&nbsp;</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">You asked to sign in to your AWS Builders - UST application. Enter the verification code below on your application status page.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f8f5ff;border-radius:8px;">
  <tr>
    <td style="padding:20px 18px;text-align:center;font-family:Arial,Helvetica,sans-serif;color:#170f33;">
      <p style="margin:0 0 10px;font-size:14px;"><strong>Verification code</strong></p>
      <p style="margin:0;font-size:28px;letter-spacing:0.18em;color:#46258a;font-weight:bold;">${escapeHtml(input.code)}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;">This code expires in ${input.expiresInMinutes} minutes and can only be used once. For your security, do not share it with anyone.</p>
<p style="margin:0 0 16px;">Application ID: <strong>${escapeHtml(input.applicationCode)}</strong></p>
${ctaButton(statusUrl, "Open your application")}
<p style="margin:0 0 16px;">If you did not request this code, you can safely ignore this email.</p>
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });

  return { subject, text, html, inline: [brandedEmailHeaderInline()] };
}

export function applicationSubmittedTemplate(input: {
  lastName: string;
  applicationCode: string;
  firstChoice: { committee: string; title: string };
  secondChoice: { committee: string; title: string };
  interviewStartsAt: Date;
}): RenderedEmail {
  const statusUrl = `${appBaseUrl()}/apply/status`;
  const subject = applicationSubmittedSubject(input.applicationCode);
  const honorific = `Mx. ${input.lastName}`;
  const interviewTime = formatInterviewSlot(input.interviewStartsAt);
  const firstChoice = formatChoiceLabel(input.firstChoice);
  const secondChoice = formatChoiceLabel(input.secondChoice);
  const yearLabel = academicYearLabel(input.applicationCode);

  const text = `Greetings from the Clouds!


Good day, ${honorific},

Thank you for applying to AWS Builders - UST. We received your application, and we are excited to meet you.

Please save your Application ID: ${input.applicationCode}

First choice: ${firstChoice}
Second choice: ${secondChoice}
Interview: ${interviewTime}

While the application season is open, you can still change your interview slot from your application page. Keep this Application ID so you can return whenever you need to.

We cannot wait to see you and to build with you.

Check your application: ${statusUrl}

Once again, thank you for taking this first step with us. We look forward to meeting you.

Yours in Thomasian Leadership,
The AWS Builders - UST Executive Board`;

  const headerImageUrl = `cid:${APPLICATION_RECEIVED_HEADER_CID}`;

  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "WELCOME, BUILDER!",
    bannerSub: yearLabel,
    heading: "Application received",
    headerImageUrl,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 0;line-height:8px;font-size:8px;">&nbsp;</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">Thank you for applying to AWS Builders - UST. We received your application, and we are excited to meet you.</p>
<p style="margin:0 0 16px;">Please save your Application ID: <strong>${escapeHtml(input.applicationCode)}</strong></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f8f5ff;border-radius:8px;">
  <tr>
    <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#170f33;">
      <p style="margin:0 0 12px;"><strong>First choice</strong><br>${escapeHtml(firstChoice)}</p>
      <p style="margin:0 0 12px;"><strong>Second choice</strong><br>${escapeHtml(secondChoice)}</p>
      <p style="margin:0;"><strong>Interview</strong><br>${escapeHtml(interviewTime)}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;">While the application season is open, you can still change your interview slot from your application page. Keep this Application ID so you can return whenever you need to.</p>
<p style="margin:0 0 16px;">We cannot wait to see you and to build with you.</p>
${ctaButton(statusUrl, "View your application")}
<p style="margin:0 0 16px;">Once again, thank you for taking this first step with us. We look forward to meeting you.</p>
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });

  return {
    subject,
    text,
    html,
    inline: [brandedEmailHeaderInline()],
  };
}

export function officerApplicationNoticeTemplate(input: {
  officerLastName: string;
  applicantFirstName: string;
  applicantLastName: string;
  studentNumber: string;
  email: string;
  applicationCode: string;
  firstChoice: { committee: string; title: string };
  secondChoice: { committee: string; title: string };
  interviewStartsAt: Date;
}): RenderedEmail {
  const subject = officerApplicationNoticeSubject({
    firstName: input.applicantFirstName,
    lastName: input.applicantLastName,
    firstChoiceCommittee: input.firstChoice.committee,
  });
  const officerHonorific = `Mx. ${input.officerLastName}`;
  const applicantName = `${input.applicantFirstName} ${input.applicantLastName}`;
  const firstChoice = formatChoiceLabel(input.firstChoice);
  const secondChoice = formatChoiceLabel(input.secondChoice);
  const interviewTime = formatInterviewSlot(input.interviewStartsAt);
  const yearLabel = academicYearLabel(input.applicationCode);
  const unitLabel = isExecutiveOfficeCommittee(input.firstChoice.committee)
    ? "office"
    : "committee";

  const text = `Greetings from the Clouds!

Good day, ${officerHonorific},

A new applicant listed your ${unitLabel} as their first choice in R101.

Applicant: ${applicantName}
Student number: ${input.studentNumber}
UST email: ${input.email}
First choice: ${firstChoice}
Second choice: ${secondChoice}
Interview: ${interviewTime}
Application ID: ${input.applicationCode}

You can review their file in the HR applications list when you are ready.

Yours in Thomasian Leadership,
The AWS Builders - UST Executive Board`;

  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "NEW APPLICANT",
    bannerSub: yearLabel,
    heading: "First-choice notice",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 0;line-height:8px;font-size:8px;">&nbsp;</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(officerHonorific)},</p>
<p style="margin:0 0 16px;">A new applicant listed your ${escapeHtml(unitLabel)} as their first choice in R101.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f8f5ff;border-radius:8px;">
  <tr>
    <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#170f33;">
      <p style="margin:0 0 12px;"><strong>Applicant</strong><br>${escapeHtml(applicantName)}</p>
      <p style="margin:0 0 12px;"><strong>Student number</strong><br>${escapeHtml(input.studentNumber)}</p>
      <p style="margin:0 0 12px;"><strong>UST email</strong><br>${escapeHtml(input.email)}</p>
      <p style="margin:0 0 12px;"><strong>First choice</strong><br>${escapeHtml(firstChoice)}</p>
      <p style="margin:0 0 12px;"><strong>Second choice</strong><br>${escapeHtml(secondChoice)}</p>
      <p style="margin:0 0 12px;"><strong>Interview</strong><br>${escapeHtml(interviewTime)}</p>
      <p style="margin:0;"><strong>Application ID</strong><br>${escapeHtml(input.applicationCode)}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;">You can review their file in the HR applications list when you are ready.</p>
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });

  return {
    subject,
    text,
    html,
    inline: [brandedEmailHeaderInline()],
  };
}

export function resultAcceptedTemplate(input: {
  lastName: string;
  position: string;
  memberId: string;
}): RenderedEmail {
  const gcLink = messengerGcLink();
  const subject = resultAcceptedSubject;
  const honorific = `Mx. ${input.lastName}`;

  const text = `Greetings from the Clouds!


Good day, ${honorific},

Congratulations! We are thrilled to welcome you to AWS Builders - UST as our newest ${input.position}. Your passion, skills, and enthusiasm stood out throughout R101, and we cannot wait to build with you.

Please save these details for your records:

Membership ID: ${input.memberId}
Position: ${input.position}

Your Membership ID is how we will recognize you in the org. Keep it somewhere you can find it.

Please join our official Messenger group chat here: ${gcLink}

Welcome to the team, ${honorific}. It is always Day One — and yours starts now.

Yours in Thomasian Leadership,
The AWS Builders - UST Executive Board`;

  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "WELCOME, BUILDER!",
    bannerSub: "R101 Results",
    heading: "You are accepted",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 0;line-height:8px;font-size:8px;">&nbsp;</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">Congratulations! We are thrilled to welcome you to AWS Builders - UST as our newest ${escapeHtml(input.position)}. Your passion, skills, and enthusiasm stood out throughout R101, and we cannot wait to build with you.</p>
<p style="margin:0 0 16px;">Please save these details for your records:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f8f5ff;border-radius:8px;">
  <tr>
    <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#170f33;">
      <p style="margin:0 0 12px;"><strong>Membership ID</strong><br>${escapeHtml(input.memberId)}</p>
      <p style="margin:0;"><strong>Position</strong><br>${escapeHtml(input.position)}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;">Your Membership ID is how we will recognize you in the org. Keep it somewhere you can find it.</p>
${ctaButton(gcLink, "Join the Messenger group chat")}
<p style="margin:0 0 16px;">Welcome to the team, ${escapeHtml(honorific)}. It is always Day One — and yours starts now.</p>
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });

  return {
    subject,
    text,
    html,
    inline: [brandedEmailHeaderInline()],
  };
}

export function resultRejectedTemplate(input: {
  lastName: string;
}): RenderedEmail {
  const subject = resultRejectedSubject;
  const honorific = `Mx. ${input.lastName}`;

  const text = `Greetings from the Clouds!


Good day, ${honorific},

Thank you for applying to AWS Builders - UST and for the time and care you put into R101. We saw the effort you brought to this process, and it meant a lot to us.

After careful deliberation, we regret to inform you that you were not selected to join the organization this term. This was not an easy decision. We had a highly competitive pool of applicants, and choosing among so many strong builders was genuinely difficult.

Please know that this outcome does not take away from what you showed us. We would be glad to see you at our events and workshops, and we hope you will consider applying again in a future cycle.

Thank you again, ${honorific}. We wish you the very best, and we hope our paths still cross in the cloud.

Yours in Thomasian Leadership,
The AWS Builders - UST Executive Board`;

  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "R101 RESULTS",
    bannerSub: "Thank you for applying",
    heading: "Recruitment update",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 0;line-height:8px;font-size:8px;">&nbsp;</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">Thank you for applying to AWS Builders - UST and for the time and care you put into R101. We saw the effort you brought to this process, and it meant a lot to us.</p>
<p style="margin:0 0 16px;">After careful deliberation, we regret to inform you that you were not selected to join the organization this term. This was not an easy decision. We had a highly competitive pool of applicants, and choosing among so many strong builders was genuinely difficult.</p>
<p style="margin:0 0 16px;">Please know that this outcome does not take away from what you showed us. We would be glad to see you at our events and workshops, and we hope you will consider applying again in a future cycle.</p>
<p style="margin:0 0 16px;">Thank you again, ${escapeHtml(honorific)}. We wish you the very best, and we hope our paths still cross in the cloud.</p>
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });

  return {
    subject,
    text,
    html,
    inline: [brandedEmailHeaderInline()],
  };
}
