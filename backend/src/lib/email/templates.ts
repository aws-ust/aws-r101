import type { RenderedEmail } from "./types";
import { appBaseUrl } from "./config";
import { devExamParagraphs, officerFirstChoiceLinkExtras } from "./choice-email-extras";
import { isExecutiveOfficeCommittee } from "./officer-recipients";
import { officeLabelForCommittee } from "../apply/committee-office-groups";
import {
  applicantOtpSubject,
  applicantInterviewBookingSubject,
  applicantInterviewReminderSubject,
  applicationSubmittedSubject,
  officerApplicationNoticeSubject,
  memberRegistrationSubject,
  membershipVerifiedSubject,
  officerWelcomeSubject,
  paymentDeadlineExtendedSubject,
  paymentResubmissionSubject,
  officerHuntRedirectedSubject,
  officerHuntRejectedSubject,
  officerPaymentInvitationSubject,
  paymentInvitationSubject,
  resultAcceptedSubject,
  resultMemberAcceptedSubject,
  resultRejectedSubject,
  resultRedirectedSubject,
} from "./subjects";
import {
  academicYearLabel,
  APPLICATION_RECEIVED_HEADER_CID,
  brandedEmailHeaderInline,
  ctaButton,
  detailsBox,
  escapeHtmlForEmail,
  formatChoiceLabel,
  formatInterviewSlot,
  wrapBrandedHtml,
} from "./template-kit";

const escapeHtml = escapeHtmlForEmail;

export { APPLICATION_RECEIVED_HEADER_CID };

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

Verification Code: ${input.code}

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
    heading: "Verification Code",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 0;line-height:8px;font-size:8px;">&nbsp;</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">You asked to sign in to your AWS Builders - UST application. Enter the verification code below on your application status page.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f8f5ff;border-radius:8px;">
  <tr>
    <td style="padding:20px 18px;text-align:center;font-family:Arial,Helvetica,sans-serif;color:#170f33;">
      <p style="margin:0 0 10px;font-size:14px;"><strong>Verification Code</strong></p>
      <p style="margin:0;font-size:28px;letter-spacing:0.18em;color:#46258a;font-weight:bold;">${escapeHtml(input.code)}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;">This code expires in ${input.expiresInMinutes} minutes and can only be used once. For your security, do not share it with anyone.</p>
<p style="margin:0 0 16px;">Application ID: <strong>${escapeHtml(input.applicationCode)}</strong></p>
${ctaButton(statusUrl, "Open Your Application")}
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
  const examCopy = devExamParagraphs([input.firstChoice, input.secondChoice]);

  const text = `Greetings from the Clouds!


Good day, ${honorific},

Thank you for applying to AWS Builders - UST. We received your application, and we are excited to meet you.

Please save your Application ID: ${input.applicationCode}

First Choice: ${firstChoice}
Second Choice: ${secondChoice}
Interview: ${interviewTime}
${examCopy.text}
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
    heading: "Application Received",
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
      <p style="margin:0 0 12px;"><strong>First Choice</strong><br>${escapeHtml(firstChoice)}</p>
      <p style="margin:0 0 12px;"><strong>Second Choice</strong><br>${escapeHtml(secondChoice)}</p>
      <p style="margin:0;"><strong>Interview</strong><br>${escapeHtml(interviewTime)}</p>
    </td>
  </tr>
</table>
${examCopy.html}
<p style="margin:0 0 16px;">While the application season is open, you can still change your interview slot from your application page. Keep this Application ID so you can return whenever you need to.</p>
<p style="margin:0 0 16px;">We cannot wait to see you and to build with you.</p>
${ctaButton(statusUrl, "View Your Application")}
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

export function applicantInterviewBookingTemplate(input: {
  lastName: string;
  applicationCode: string;
  committeeName: string;
  interviewStartsAt: Date;
  rescheduled: boolean;
}): RenderedEmail {
  const statusUrl = `${appBaseUrl()}/apply/status`;
  const subject = applicantInterviewBookingSubject(input.applicationCode);
  const honorific = `Mx. ${input.lastName}`;
  const interviewTime = formatInterviewSlot(input.interviewStartsAt);
  const action = input.rescheduled ? "rescheduled" : "confirmed";

  const text = `Greetings from the Clouds!

Good day, ${honorific},

Your interview schedule has been ${action}.

Committee: ${input.committeeName}
Interview: ${interviewTime}
Application ID: ${input.applicationCode}

An updated calendar file is attached. Open it to add the interview to your calendar.

View your application: ${statusUrl}

Yours in Thomasian Leadership,
The AWS Builders - UST Executive Board`;

  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "INTERVIEW UPDATE",
    bannerSub: input.applicationCode,
    heading: "Interview Schedule Updated",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 0;line-height:8px;font-size:8px;">&nbsp;</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">Your interview schedule has been ${action}.</p>
${detailsBox([
  { label: "Committee", value: input.committeeName },
  { label: "Interview", value: interviewTime },
  { label: "Application ID", value: input.applicationCode },
])}
<p style="margin:0 0 16px;">An updated calendar file is attached. Open it to add the interview to your calendar.</p>
${ctaButton(statusUrl, "View Your Application")}
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });

  return { subject, text, html, inline: [brandedEmailHeaderInline()] };
}

export function interviewReminderTemplate(input: {
  lastName: string;
  applicationCode: string;
  committeeName: string;
  interviewStartsAt: Date;
  reminder: "24h" | "1h";
}): RenderedEmail {
  const statusUrl = `${appBaseUrl()}/apply/status`;
  const subject = applicantInterviewReminderSubject(input.applicationCode);
  const honorific = `Mx. ${input.lastName}`;
  const interviewTime = formatInterviewSlot(input.interviewStartsAt);
  const timing =
    input.reminder === "24h"
      ? "Your interview is coming up within 24 hours."
      : "Your interview starts within an hour.";

  const text = `Greetings from the Clouds!

Good day, ${honorific},

${timing}

Committee: ${input.committeeName}
Interview: ${interviewTime}
Application ID: ${input.applicationCode}

The calendar file is attached again for convenience.

View your application: ${statusUrl}

Yours in Thomasian Leadership,
The AWS Builders - UST Executive Board`;

  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "INTERVIEW REMINDER",
    bannerSub: input.applicationCode,
    heading: "Your Interview Is Coming Up",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 0;line-height:8px;font-size:8px;">&nbsp;</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">${timing}</p>
${detailsBox([
  { label: "Committee", value: input.committeeName },
  { label: "Interview", value: interviewTime },
  { label: "Application ID", value: input.applicationCode },
])}
<p style="margin:0 0 16px;">The calendar file is attached again for convenience.</p>
${ctaButton(statusUrl, "View Your Application")}
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });

  return { subject, text, html, inline: [brandedEmailHeaderInline()] };
}

export function officerApplicationNoticeTemplate(input: {
  officerLastName: string;
  applicantFirstName: string;
  applicantLastName: string;
  studentNumber: string;
  email: string;
  applicationCode: string;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
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
  const linkExtras = officerFirstChoiceLinkExtras({
    firstChoice: input.firstChoice,
    portfolioUrl: input.portfolioUrl,
    githubUrl: input.githubUrl,
  });

  const text = `Greetings from the Clouds!

Good day, ${officerHonorific},

A new applicant listed your ${unitLabel} as their first choice in R101.

Applicant: ${applicantName}
Student Number: ${input.studentNumber}
UST Email: ${input.email}
${linkExtras.textLines}First Choice: ${firstChoice}
Second Choice: ${secondChoice}
Interview: ${interviewTime}
Application ID: ${input.applicationCode}

You can review their file in the HR applications list when you are ready.

Yours in Thomasian Leadership,
The AWS Builders - UST Executive Board`;

  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "NEW APPLICANT",
    bannerSub: yearLabel,
    heading: "First-Choice Notice",
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
      <p style="margin:0 0 12px;"><strong>Student Number</strong><br>${escapeHtml(input.studentNumber)}</p>
      <p style="margin:0 0 12px;"><strong>UST Email</strong><br>${escapeHtml(input.email)}</p>
      ${linkExtras.htmlRows}
      <p style="margin:0 0 12px;"><strong>First Choice</strong><br>${escapeHtml(firstChoice)}</p>
      <p style="margin:0 0 12px;"><strong>Second Choice</strong><br>${escapeHtml(secondChoice)}</p>
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

export function memberRegistrationTemplate(input: {
  lastName: string;
  applicationCode: string;
}): RenderedEmail {
  const statusUrl = `${appBaseUrl()}/apply/status`;
  const honorific = `Mx. ${input.lastName}`;
  const text = `Greetings from the Clouds!\n\nGood day, ${honorific},\n\nThank you for registering to join AWS Builders - UST as a member. Your membership registration has been accepted and does not require an interview.\n\nApplication ID: ${input.applicationCode}\n\nFurther instructions for the membership payment will be sent to you soon. Please do not send a payment yet.\n\nView your application: ${statusUrl}\n\nYours in Thomasian Leadership,\nThe AWS Builders - UST Executive Board`;

  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "MEMBERSHIP REGISTRATION",
    bannerSub: input.applicationCode,
    heading: "Registration Accepted",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">Thank you for registering to join AWS Builders - UST as a member. Your membership registration has been accepted and does not require an interview.</p>
${detailsBox([{ label: "Application ID", value: input.applicationCode }])}
<p style="margin:0 0 16px;">Further instructions for the membership payment will be sent to you soon. Please <strong>do not send a payment yet</strong>.</p>
${ctaButton(statusUrl, "View Your Application")}
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });

  return {
    subject: memberRegistrationSubject(input.applicationCode),
    text,
    html,
    inline: [brandedEmailHeaderInline()],
  };
}
export function resultAcceptedTemplate(input: {
  lastName: string;
  position: string;
}): RenderedEmail {
  const subject = resultAcceptedSubject;
  const honorific = `Mx. ${input.lastName}`;
  const statusUrl = `${appBaseUrl()}/apply/status`;

  const text = `Greetings from the Clouds!


Good day, ${honorific},

Congratulations! We are thrilled to welcome you to AWS Builders - UST as our newest ${input.position}. Your passion, skills, and enthusiasm stood out throughout R101, and we cannot wait to build with you.

Position: ${input.position}

Open your applicant dashboard to view your application details and the group chats you are invited to join.

View your application: ${statusUrl}

Further instructions for the membership payment will be sent to you soon. Please do not send a payment until you receive them.

Your Member ID will be available on your dashboard after your payment is verified.

Yours in Thomasian Leadership,
The AWS Builders - UST Executive Board`;

  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "WELCOME, BUILDER!",
    bannerSub: "R101 Results",
    heading: "You Are Accepted",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 0;line-height:8px;font-size:8px;">&nbsp;</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">Congratulations! We are thrilled to welcome you to AWS Builders - UST as our newest ${escapeHtml(input.position)}. Your passion, skills, and enthusiasm stood out throughout R101, and we cannot wait to build with you.</p>
<p style="margin:0 0 16px;">Please save this detail for your records:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f8f5ff;border-radius:8px;">
  <tr>
    <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#170f33;">
      <p style="margin:0;"><strong>Position</strong><br>${escapeHtml(input.position)}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;">Open your applicant dashboard to view your application details and the group chats you are invited to join.</p>
${ctaButton(statusUrl, "View Your Application")}
<p style="margin:0 0 16px;">Further instructions for the membership payment will be sent to you soon. Please do not send a payment until you receive them.</p>
<p style="margin:0 0 16px;">Your Member ID will be available on your dashboard after your payment is verified.</p>
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

export function resultMemberAcceptedTemplate(input: {
  lastName: string;
}): RenderedEmail {
  const subject = resultMemberAcceptedSubject;
  const honorific = `Mx. ${input.lastName}`;
  const statusUrl = `${appBaseUrl()}/apply/status`;

  const text = `Greetings from the Clouds!


Good day, ${honorific},

Congratulations! Your membership application has been accepted, and we are thrilled to welcome you to AWS Builders - UST as a general member. We cannot wait to see you at our events and workshops.

Further instructions for the membership payment will be sent to you soon. Please do not send a payment until you receive them.

Your Member ID will be available on your dashboard after your payment is verified.

View your application: ${statusUrl}

Yours in Thomasian Leadership,
The AWS Builders - UST Executive Board`;

  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "WELCOME, BUILDER!",
    bannerSub: "Membership Results",
    heading: "You Are Now a Member",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 0;line-height:8px;font-size:8px;">&nbsp;</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">Congratulations! Your membership application has been accepted, and we are thrilled to welcome you to AWS Builders - UST as a general member. We cannot wait to see you at our events and workshops.</p>
<p style="margin:0 0 16px;">Further instructions for the membership payment will be sent to you soon. Please do not send a payment until you receive them.</p>
<p style="margin:0 0 16px;">Your Member ID will be available on your dashboard after your payment is verified.</p>
${ctaButton(statusUrl, "View Your Application")}
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
  const statusUrl = `${appBaseUrl()}/apply/status`;

  const text = `Greetings from the Clouds!


Good day, ${honorific},

Thank you for applying to AWS Builders - UST and for the time and care you put into R101. We saw the effort you brought to this process, and it meant a lot to us.

After careful deliberation, we regret to inform you that you were not selected for a committee position this term. We had a highly competitive pool of applicants, and choosing among so many strong builders was genuinely difficult.

You are still eligible to join AWS Builders - UST as a general member. Further instructions for the membership payment will be sent to you soon. Please do not send a payment yet.

You can view your application and results on your applicant dashboard.

View your application: ${statusUrl}

Please know that this outcome does not take away from what you showed us. We would be glad to see you at our events and workshops, and we hope you will consider applying again in a future cycle.

Thank you again, ${honorific}. We wish you the very best, and we hope our paths still cross in the cloud.

Yours in Thomasian Leadership,
The AWS Builders - UST Executive Board`;

  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "R101 RESULTS",
    bannerSub: "Thank you for applying",
    heading: "Recruitment Update",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 0;line-height:8px;font-size:8px;">&nbsp;</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">Thank you for applying to AWS Builders - UST and for the time and care you put into R101. We saw the effort you brought to this process, and it meant a lot to us.</p>
<p style="margin:0 0 16px;">After careful deliberation, we regret to inform you that you were not selected for a committee position this term. We had a highly competitive pool of applicants, and choosing among so many strong builders was genuinely difficult.</p>
<p style="margin:0 0 16px;"><strong>You are still eligible to join AWS Builders - UST as a general member.</strong> Further instructions for the membership payment will be sent to you soon. Please do not send a payment yet.</p>
<p style="margin:0 0 16px;">You can view your application and results on your applicant dashboard.</p>
${ctaButton(statusUrl, "View Your Application")}
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

export function resultRedirectedTemplate(input: {
  lastName: string;
  position: string;
  committee: string;
}): RenderedEmail {
  const subject = resultRedirectedSubject;
  const honorific = `Mx. ${input.lastName}`;
  const office = officeLabelForCommittee(input.committee);
  const dashboardUrl = `${appBaseUrl()}/apply/status`;

  const text = `Greetings from the Clouds!


Good day, ${honorific},

Thank you for applying to AWS Builders - UST and for the time and care you put into R101.

After deliberation, we would like to offer you a place on a committee other than the choices on your application. This is a redirected placement. You may accept this role or decline it.

Redirected position: ${input.position}
Committee: ${input.committee}
Office: ${office}

Please open your applicant dashboard to accept or decline this redirected position. Your choice is final once confirmed.

Open your dashboard: ${dashboardUrl}

If you decline this role, you may still continue with AWS Builders - UST as a general member.

After you respond—whether you accept or decline the redirected position—we will send you separate instructions for paying the membership fee. Please do not send a payment until you receive that message.

Yours in Thomasian Leadership,
The AWS Builders - UST Executive Board`;

  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "R101 RESULTS",
    bannerSub: "Redirected placement",
    heading: "A New Placement Offer",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 0;line-height:8px;font-size:8px;">&nbsp;</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">Thank you for applying to AWS Builders - UST and for the time and care you put into R101.</p>
<p style="margin:0 0 16px;">After deliberation, we would like to offer you a place on a committee other than the choices on your application. This is a redirected placement. You may accept this role or decline it.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f8f5ff;border-radius:8px;">
  <tr>
    <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#170f33;">
      <p style="margin:0 0 8px;"><strong>Redirected position</strong><br>${escapeHtml(input.position)}</p>
      <p style="margin:0 0 8px;"><strong>Committee</strong><br>${escapeHtml(input.committee)}</p>
      <p style="margin:0;"><strong>Office</strong><br>${escapeHtml(office)}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;">Please open your applicant dashboard to accept or decline this redirected position. Your choice is final once confirmed.</p>
${ctaButton(dashboardUrl, "Open your dashboard")}
<p style="margin:0 0 16px;"><strong>If you decline this role, you may still continue with AWS Builders - UST as a general member.</strong></p>
<p style="margin:0 0 16px;">After you respond—whether you accept or decline the redirected position—we will send you separate instructions for paying the membership fee. Please do not send a payment until you receive that message.</p>
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

const officerHuntSignoff = "Yours in Thomasian Leadership,\nThe AWS Builders - UST Executive Board";

/** Officer hunt: the applicant was not seated. They can still apply to R101. */
export function officerHuntRejectedTemplate(input: { lastName: string }): RenderedEmail {
  const honorific = `Mx. ${input.lastName}`;
  const statusUrl = `${appBaseUrl()}/apply/status`;
  const paragraphs = [
    "Thank you for putting yourself forward in the AWS Builders - UST Officer Hunt, and for the time and care you gave the process.",
    "After careful deliberation, we regret to inform you that you were not selected for a seat this term. It was a strong field, and the choice was genuinely difficult.",
    "You can still join us as a member: R101 recruitment is separate from the Officer Hunt, and you are welcome to apply when it opens.",
  ];
  const text = `Greetings from the Clouds!\n\nGood day, ${honorific},\n\n${paragraphs.join("\n\n")}\n\nView your application: ${statusUrl}\n\n${officerHuntSignoff}`;
  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "OFFICER HUNT RESULTS",
    bannerSub: "Thank you for applying",
    heading: "Officer Hunt Update",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
${paragraphs.map((paragraph) => `<p style="margin:0 0 16px;">${escapeHtml(paragraph)}</p>`).join("\n")}
${ctaButton(statusUrl, "View Your Application")}
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });
  return { subject: officerHuntRejectedSubject, text, html, inline: [brandedEmailHeaderInline()] };
}

/** Officer hunt: another seat is offered, to accept or decline on the dashboard. */
export function officerHuntRedirectedTemplate(input: {
  lastName: string;
  position: string;
  committee: string;
}): RenderedEmail {
  const honorific = `Mx. ${input.lastName}`;
  const dashboardUrl = `${appBaseUrl()}/apply/status`;
  const intro =
    "Thank you for putting yourself forward in the AWS Builders - UST Officer Hunt. After deliberation, we would like to offer you a different seat than the choices on your application. You may accept or decline it.";
  const closing =
    "Open your applicant dashboard to respond. Your answer is final once confirmed, and the seat is yours as soon as you accept.";
  const text = `Greetings from the Clouds!\n\nGood day, ${honorific},\n\n${intro}\n\nOffered seat: ${input.position}\nCommittee: ${input.committee}\n\n${closing}\n\nOpen your dashboard: ${dashboardUrl}\n\n${officerHuntSignoff}`;
  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "OFFICER HUNT RESULTS",
    bannerSub: "A new seat offer",
    heading: "A New Seat Offer",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">${escapeHtml(intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f8f5ff;border-radius:8px;">
  <tr>
    <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#170f33;">
      <p style="margin:0 0 8px;"><strong>Offered seat</strong><br>${escapeHtml(input.position)}</p>
      <p style="margin:0;"><strong>Committee</strong><br>${escapeHtml(input.committee)}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;">${escapeHtml(closing)}</p>
${ctaButton(dashboardUrl, "Open your dashboard")}
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });
  return { subject: officerHuntRedirectedSubject, text, html, inline: [brandedEmailHeaderInline()] };
}

function manilaDeadline(deadlineAt: Date) {
  return deadlineAt.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "long",
    timeStyle: "short",
  });
}

function pesoAmount(amountCents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amountCents / 100);
}

// One message for everyone invited to pay: accepted committee members,
// member-only applicants, and anyone joining as a general member.
const paymentInvitationMessage =
  "The membership payment period for AWS Builders - UST is now open. To complete your membership, please pay the membership fee using the official payment details on your applicant dashboard.";
const paymentVerificationNote =
  "Your payment is only marked as paid after our Finance team verifies your receipt.";

export function paymentInvitationTemplate(input: {
  lastName: string;
  applicationCode: string;
  amountCents: number;
  deadlineAt: Date;
}): RenderedEmail {
  const honorific = `Mx. ${input.lastName}`;
  const amount = pesoAmount(input.amountCents);
  const deadline = manilaDeadline(input.deadlineAt);
  const statusUrl = `${appBaseUrl()}/apply/status`;
  const message = paymentInvitationMessage;
  const text = `Greetings from the Clouds!\n\nGood day, ${honorific},\n\n${message}\n\nAmount: ${amount}\nDeadline: ${deadline}\nApplication ID: ${input.applicationCode}\n\nOpen payment instructions: ${statusUrl}\n\n${paymentVerificationNote}\n\nYours in Thomasian Leadership,\nThe AWS Builders - UST Executive Board`;
  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "MEMBERSHIP PAYMENT",
    bannerSub: input.applicationCode,
    heading: "Payment Period Is Open",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">${escapeHtml(message)}</p>
${detailsBox([
  { label: "Amount", value: amount },
  { label: "Deadline", value: deadline },
  { label: "Application ID", value: input.applicationCode },
])}
${ctaButton(statusUrl, "Open payment instructions")}
<p style="margin:0 0 16px;">${escapeHtml(paymentVerificationNote)}</p>
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });
  return {
    subject: paymentInvitationSubject(input.applicationCode),
    text,
    html,
    inline: [brandedEmailHeaderInline()],
  };
}

const officerPaymentInvitationNote =
  "Sign in to the applicant dashboard with the Application ID below and this email address. You will receive a one-time code.";

/** Payment invitation for an elected officer: same payment steps, plus their reserved Member ID. */
export function officerPaymentInvitationTemplate(input: {
  lastName: string;
  title: string;
  /** The seat's reserved number, or null when it is issued from a block at verification (EAs). */
  memberId: string | null;
  applicationCode: string;
  amountCents: number;
  deadlineAt: Date;
}): RenderedEmail {
  const honorific = `Mx. ${input.lastName}`;
  const amount = pesoAmount(input.amountCents);
  const deadline = manilaDeadline(input.deadlineAt);
  const statusUrl = `${appBaseUrl()}/apply/status`;
  const intro = `The membership payment period for AWS Builders - UST is now open. As ${input.title}, please pay the membership fee to complete your membership.`;
  const idLine = input.memberId
    ? `Your Member ID ${input.memberId} is reserved for you. It is released, together with your digital member ID, once your payment is verified.`
    : "Your Member ID is issued, together with your digital member ID, once your payment is verified.";
  const text = `Greetings from the Clouds!

Good day, ${honorific},

${intro}

${idLine}

${input.memberId ? `Reserved Member ID: ${input.memberId}
` : ""}Application ID: ${input.applicationCode}
Amount: ${amount}
Deadline: ${deadline}

${officerPaymentInvitationNote}

Open payment instructions: ${statusUrl}

${paymentVerificationNote}

Yours in Thomasian Leadership,
The AWS Builders - UST Executive Board`;
  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "MEMBERSHIP PAYMENT",
    bannerSub: input.memberId ?? input.applicationCode,
    heading: "Payment Period Is Open",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">${escapeHtml(intro)}</p>
<p style="margin:0 0 16px;">${escapeHtml(idLine)}</p>
${detailsBox([
  ...(input.memberId ? [{ label: "Reserved Member ID", value: input.memberId }] : []),
  { label: "Application ID", value: input.applicationCode },
  { label: "Amount", value: amount },
  { label: "Deadline", value: deadline },
])}
<p style="margin:0 0 16px;">${escapeHtml(officerPaymentInvitationNote)}</p>
${ctaButton(statusUrl, "Open payment instructions")}
<p style="margin:0 0 16px;">${escapeHtml(paymentVerificationNote)}</p>
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });
  return {
    subject: officerPaymentInvitationSubject(input.memberId ?? input.applicationCode),
    text,
    html,
    inline: [brandedEmailHeaderInline()],
  };
}

const paymentDeadlineExtendedMessage =
  "Good news: we have extended the membership payment deadline for AWS Builders - UST. You still have time to pay the membership fee and upload your receipt on your applicant dashboard.";

/** Sent to everyone who still owes a payment when HR moves the deadline later. */
export function paymentDeadlineExtendedTemplate(input: {
  lastName: string;
  applicationCode: string;
  amountCents: number;
  deadlineAt: Date;
}): RenderedEmail {
  const honorific = `Mx. ${input.lastName}`;
  const amount = pesoAmount(input.amountCents);
  const deadline = manilaDeadline(input.deadlineAt);
  const statusUrl = `${appBaseUrl()}/apply/status`;
  const message = paymentDeadlineExtendedMessage;
  const text = `Greetings from the Clouds!\n\nGood day, ${honorific},\n\n${message}\n\nNew deadline: ${deadline}\nAmount: ${amount}\nApplication ID: ${input.applicationCode}\n\nOpen payment instructions: ${statusUrl}\n\n${paymentVerificationNote}\n\nYours in Thomasian Leadership,\nThe AWS Builders - UST Executive Board`;
  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "MEMBERSHIP PAYMENT",
    bannerSub: input.applicationCode,
    heading: "Payment Deadline Extended",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">${escapeHtml(message)}</p>
${detailsBox([
  { label: "New deadline", value: deadline },
  { label: "Amount", value: amount },
  { label: "Application ID", value: input.applicationCode },
])}
${ctaButton(statusUrl, "Open payment instructions")}
<p style="margin:0 0 16px;">${escapeHtml(paymentVerificationNote)}</p>
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });
  return {
    subject: paymentDeadlineExtendedSubject(input.applicationCode),
    text,
    html,
    inline: [brandedEmailHeaderInline()],
  };
}

const paymentResubmissionIntro =
  "We could not verify the payment receipt you submitted for your AWS Builders - UST membership. Please read the note from our Finance team below, then submit a new receipt on your applicant dashboard before the deadline.";
const paymentReversalIntro =
  "We had to undo the verification of your AWS Builders - UST membership payment. Please read the note from our Finance team below, then submit a new receipt on your applicant dashboard before the deadline.";

/** Sent when Finance rejects a receipt, or reverses a verification, and the person has to pay or upload again. */
export function paymentResubmissionTemplate(input: {
  lastName: string;
  applicationCode: string;
  amountCents: number;
  /** The deadline to submit a new receipt by. */
  deadlineAt: Date;
  /** Finance's note, as the applicant sees it on their dashboard. */
  reason: string;
  /** True when a payment that was verified is being undone, rather than a receipt turned down. */
  reversed: boolean;
}): RenderedEmail {
  const honorific = `Mx. ${input.lastName}`;
  const amount = pesoAmount(input.amountCents);
  const deadline = manilaDeadline(input.deadlineAt);
  const statusUrl = `${appBaseUrl()}/apply/status`;
  const intro = input.reversed ? paymentReversalIntro : paymentResubmissionIntro;
  const text = `Greetings from the Clouds!\n\nGood day, ${honorific},\n\n${intro}\n\nNote from Finance: ${input.reason}\nResubmit by: ${deadline}\nAmount: ${amount}\nApplication ID: ${input.applicationCode}\n\nResubmit your payment: ${statusUrl}\n\n${paymentVerificationNote}\n\nYours in Thomasian Leadership,\nThe AWS Builders - UST Executive Board`;
  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "MEMBERSHIP PAYMENT",
    bannerSub: input.applicationCode,
    heading: "Payment Needs Resubmission",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">${escapeHtml(intro)}</p>
${detailsBox([
  { label: "Note from Finance", value: input.reason },
  { label: "Resubmit by", value: deadline },
  { label: "Amount", value: amount },
  { label: "Application ID", value: input.applicationCode },
])}
${ctaButton(statusUrl, "Resubmit your payment")}
<p style="margin:0 0 16px;">${escapeHtml(paymentVerificationNote)}</p>
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });
  return {
    subject: paymentResubmissionSubject(input.applicationCode),
    text,
    html,
    inline: [brandedEmailHeaderInline()],
  };
}

export function membershipVerifiedTemplate(input: {
  lastName: string;
  memberId: string;
  position: string;
}): RenderedEmail {
  const honorific = `Mx. ${input.lastName}`;
  const dashboardUrl = `${appBaseUrl()}/apply/dashboard`;
  const text = `Greetings from the Clouds!\n\nGood day, ${honorific},\n\nYour membership payment has been verified. You are now a bona fide member of AWS Builders - UST!\n\nMember ID: ${input.memberId}\nMembership: ${input.position}\n\nPlease keep your Member ID for your records. You will use it for events, attendance, and other member services. You can view your digital member ID anytime on your applicant dashboard, where your Members Facebook Group and committee group chat links are also waiting for you: ${dashboardUrl}\n\nYours in Thomasian Leadership,\nThe AWS Builders - UST Executive Board`;
  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: "WELCOME, BUILDER!",
    bannerSub: input.memberId,
    heading: "You Are Now a Member",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">Your membership payment has been verified. You are now a bona fide member of AWS Builders - UST!</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f8f5ff;border-radius:8px;">
  <tr>
    <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#170f33;">
      <p style="margin:0 0 8px;"><strong>Member ID</strong><br>${escapeHtml(input.memberId)}</p>
      <p style="margin:0;"><strong>Membership</strong><br>${escapeHtml(input.position)}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;">Please keep your Member ID for your records. You will use it for events, attendance, and other member services. You can view your digital member ID anytime on your applicant dashboard, where your Members Facebook Group and committee group chat links are also waiting for you.</p>
${ctaButton(dashboardUrl, "Open your dashboard")}
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });
  return {
    subject: membershipVerifiedSubject(input.memberId),
    text,
    html,
    inline: [brandedEmailHeaderInline()],
  };
}

/** Sent once to each elected officer: their reserved Member ID and how to sign in and pay. */
export function officerWelcomeTemplate(input: {
  lastName: string;
  title: string;
  /** Where the seat sits, e.g. the office an executive assistant joins. */
  committee?: string | null;
  /** The seat's reserved number; null for executive assistants, who are numbered at payment. */
  memberId: string | null;
  applicationCode: string;
}): RenderedEmail {
  const honorific = `Mx. ${input.lastName}`;
  const statusUrl = `${appBaseUrl()}/apply/status`;
  const intro = input.memberId
    ? `As ${input.title} of AWS Builders - UST, your official Member ID has been reserved for you. It is released, together with your digital member ID, once your membership payment is verified.`
    : `Congratulations! You are joining AWS Builders - UST as ${input.title}${input.committee ? ` in the ${input.committee}` : ""}. Your Member ID is issued, together with your digital member ID, once your membership payment is verified.`;
  const how =
    "Sign in to the applicant dashboard with the Application ID below and this email address. You will receive a one-time code. The payment details appear there when the payment period opens.";
  const text = `Greetings from the Clouds!

Good day, ${honorific},

${intro}

${input.memberId ? `Reserved Member ID: ${input.memberId}\n` : ""}Application ID: ${input.applicationCode}

${how}

Sign in: ${statusUrl}

Yours in Thomasian Leadership,
The AWS Builders - UST Executive Board`;
  const html = wrapBrandedHtml({
    eyebrow: "AWS BUILDERS – UST",
    bannerTitle: input.memberId ? "MEMBER ID RESERVED" : "WELCOME TO THE TEAM",
    bannerSub: input.memberId ?? input.applicationCode,
    heading: input.memberId ? "Your Member ID Is Reserved" : "Welcome To The Team",
    headerImageUrl: `cid:${APPLICATION_RECEIVED_HEADER_CID}`,
    headerImageAlt: "AWS Builders - UST — It's Always Day One",
    inner: `<p style="margin:0 0 8px;font-weight:bold;">Greetings from the Clouds!</p>
<p style="margin:0 0 20px;font-weight:bold;">Good day, ${escapeHtml(honorific)},</p>
<p style="margin:0 0 16px;">${escapeHtml(intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f8f5ff;border-radius:8px;">
  <tr>
    <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#170f33;">
      ${input.memberId ? `<p style="margin:0 0 8px;"><strong>Reserved Member ID</strong><br>${escapeHtml(input.memberId)}</p>` : ""}
      <p style="margin:0;"><strong>Application ID</strong><br>${escapeHtml(input.applicationCode)}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;">${escapeHtml(how)}</p>
${ctaButton(statusUrl, "Sign in to your dashboard")}
<p style="margin:24px 0 0;">Yours in Thomasian Leadership,</p>
<p style="margin:4px 0 28px;font-weight:bold;">The AWS Builders - UST Executive Board</p>`,
  });
  return {
    subject: officerWelcomeSubject(input.memberId, input.applicationCode),
    text,
    html,
    inline: [brandedEmailHeaderInline()],
  };
}
