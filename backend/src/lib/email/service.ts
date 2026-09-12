import type { ApplicationJson } from "../applications";
import type { ChoiceRef } from "../committee-apply";
import { applicationRequiresDevExam } from "../committee-apply";
import { getBookedInterviewStartsAt } from "../interview-scheduling";
import { emailEnabled, hasGmailCredentials } from "./config";
import { awsDevAssessmentAttachment } from "./email-assets";
import { sendViaGmail } from "./gmail-client";
import {
  loadApplicantEditEmailSnapshot,
  notifyOfficerAfterInterviewReschedule,
  notifyOfficersAfterApplicantChoiceEdit,
  type ApplicantEditEmailSnapshot,
} from "./officer-edit-notifications";
import { loadOfficerApplicantAttachments } from "./officer-email-attachments";
import * as notifications from "./notifications";
import { withRetry } from "./retry";
import { lookupOfficerRecipient } from "./officer-recipients";
import { applicantDevExamTemplate } from "./officer-edit-templates";
import {
  applicantOtpTemplate,
  applicationSubmittedTemplate,
  officerApplicationNoticeTemplate,
  resultAcceptedTemplate,
  resultRejectedTemplate,
} from "./templates";
import type {
  EmailDeliveryStatus,
  EmailMessageType,
  RenderedEmail,
} from "./types";

function isLikelyAttachmentSizeError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("too large") ||
    lower.includes("message size") ||
    lower.includes("413") ||
    lower.includes("max")
  );
}

async function deliverNotification(input: {
  notificationId: string;
  messageType: EmailMessageType;
  recipient: string;
  rendered: RenderedEmail;
}): Promise<EmailDeliveryStatus> {
  const enabled = emailEnabled();
  const configured = hasGmailCredentials();
  const canSend = enabled && configured;
  if (!canSend) {
    const reason = !enabled ? "EMAIL_ENABLED=false" : "missing Gmail credentials";
    console.info(
      `[email] skipped ${input.messageType} to ${input.recipient} (${reason})`,
      input.rendered.subject,
    );
    await notifications.markFailed(input.notificationId, reason);
    return "failed";
  }

  const sendOnce = async (rendered: RenderedEmail) => {
    await notifications.incrementAttempts(input.notificationId);
    return sendViaGmail({
      to: input.recipient,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      inline: rendered.inline,
      attachments: rendered.attachments,
    });
  };

  try {
    const result = await withRetry(async () => sendOnce(input.rendered));
    await notifications.markSent(input.notificationId, result.providerMessageId);
    return "sent";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      input.rendered.attachments?.length &&
      isLikelyAttachmentSizeError(message)
    ) {
      console.warn(
        `[email] retrying ${input.messageType} without attachments after size error`,
      );
      try {
        const stripped: RenderedEmail = {
          ...input.rendered,
          attachments: undefined,
        };
        const result = await withRetry(async () => sendOnce(stripped));
        await notifications.markSent(
          input.notificationId,
          result.providerMessageId,
        );
        return "sent";
      } catch (retryErr) {
        const retryMessage =
          retryErr instanceof Error ? retryErr.message : String(retryErr);
        await notifications.markFailed(input.notificationId, retryMessage);
        throw retryErr;
      }
    }
    await notifications.markFailed(input.notificationId, message);
    throw err;
  }
}

async function deliverEmail(input: {
  applicationId?: string | null;
  messageType: EmailMessageType;
  recipient: string;
  rendered: RenderedEmail;
}): Promise<void> {
  const pending = await notifications.createPending({
    applicationId: input.applicationId,
    messageType: input.messageType,
    recipient: input.recipient,
  });
  await deliverNotification({
    notificationId: pending.id,
    messageType: input.messageType,
    recipient: input.recipient,
    rendered: input.rendered,
  });
}

function fireAndForget(promise: Promise<void>, label: string): void {
  void promise.catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[email] ${label} failed:`, message);
  });
}

const officerEditDeliverer = async (input: {
  applicationId: string;
  messageType: EmailMessageType;
  recipient: string;
  rendered: RenderedEmail;
}) => {
  await deliverEmail({
    applicationId: input.applicationId,
    messageType: input.messageType,
    recipient: input.recipient,
    rendered: input.rendered,
  });
};

async function sendApplicantDevExamEmail(
  applicationId: string,
  applicant: {
    lastName: string;
    email: string;
    applicationCode: string;
  },
  choices: ChoiceRef[],
): Promise<void> {
  const rendered = applicantDevExamTemplate({
    lastName: applicant.lastName,
    applicationCode: applicant.applicationCode,
    choices,
  });
  rendered.attachments = [awsDevAssessmentAttachment()];
  await deliverEmail({
    applicationId,
    messageType: "applicant_dev_exam",
    recipient: applicant.email,
    rendered,
  });
}

export function fireApplicantChoiceEditNotifications(
  applicationId: string,
  snapshot: ApplicantEditEmailSnapshot,
): void {
  fireAndForget(
    notifyOfficersAfterApplicantChoiceEdit(applicationId, snapshot, {
      officerEmail: officerEditDeliverer,
      applicantDevExam: sendApplicantDevExamEmail,
    }),
    "officer choice-edit notifications",
  );
}

export function fireInterviewRescheduleNotification(
  applicationId: string,
  previousInterviewStartsAt: Date | null,
): void {
  fireAndForget(
    notifyOfficerAfterInterviewReschedule(
      applicationId,
      previousInterviewStartsAt,
      officerEditDeliverer,
    ),
    "officer interview reschedule notification",
  );
}

export { loadApplicantEditEmailSnapshot };

export async function sendApplicantOtp(input: {
  applicationId: string;
  applicationCode: string;
  lastName: string;
  email: string;
  code: string;
  expiresInMinutes: number;
}): Promise<void> {
  const rendered = applicantOtpTemplate({
    lastName: input.lastName,
    applicationCode: input.applicationCode,
    code: input.code,
    expiresInMinutes: input.expiresInMinutes,
  });
  await deliverEmail({
    applicationId: input.applicationId,
    messageType: "applicant_otp",
    recipient: input.email,
    rendered,
  });
}

export async function sendApplicationSubmitted(
  application: ApplicationJson,
): Promise<void> {
  const firstChoice = application.choices.find((choice) => choice.preferenceRank === 1);
  const secondChoice = application.choices.find((choice) => choice.preferenceRank === 2);
  const interviewStartsAt = await getBookedInterviewStartsAt(application.id);
  if (!firstChoice || !secondChoice || !interviewStartsAt) {
    throw new Error(
      "Cannot send the application received email without choices and an interview slot.",
    );
  }

  const choiceRefs = [
    { committee: firstChoice.committee, title: firstChoice.title },
    { committee: secondChoice.committee, title: secondChoice.title },
  ];

  const rendered = applicationSubmittedTemplate({
    lastName: application.lastName,
    applicationCode: application.applicationCode,
    firstChoice: choiceRefs[0],
    secondChoice: choiceRefs[1],
    interviewStartsAt,
  });
  if (applicationRequiresDevExam(choiceRefs)) {
    rendered.attachments = [awsDevAssessmentAttachment()];
  }
  await deliverEmail({
    applicationId: application.id,
    messageType: "application_submitted",
    recipient: application.email,
    rendered,
  });
}

export async function sendOfficerApplicationNotice(
  application: ApplicationJson,
): Promise<void> {
  const firstChoice = application.choices.find((choice) => choice.preferenceRank === 1);
  const secondChoice = application.choices.find((choice) => choice.preferenceRank === 2);
  if (!firstChoice || !secondChoice) {
    console.info(
      `[email] skipped officer_application_notice for application ${application.id} (missing choices)`,
    );
    return;
  }

  const officer = lookupOfficerRecipient(firstChoice.committee);
  if (!officer) {
    console.info(
      `[email] skipped officer_application_notice for application ${application.id} (unknown committee: ${firstChoice.committee})`,
    );
    return;
  }

  const interviewStartsAt = await getBookedInterviewStartsAt(application.id);
  if (!interviewStartsAt) {
    console.info(
      `[email] skipped officer_application_notice for application ${application.id} (no interview slot)`,
    );
    return;
  }

  if (!application.studentNumber?.trim()) {
    console.info(
      `[email] skipped officer_application_notice for application ${application.id} (missing student number)`,
    );
    return;
  }

  const attachments = await loadOfficerApplicantAttachments(application.id);
  const rendered = officerApplicationNoticeTemplate({
    officerLastName: officer.lastName,
    applicantFirstName: application.firstName,
    applicantLastName: application.lastName,
    studentNumber: application.studentNumber.trim(),
    email: application.email,
    applicationCode: application.applicationCode,
    portfolioUrl: application.portfolioUrl,
    githubUrl: application.githubUrl,
    firstChoice: { committee: firstChoice.committee, title: firstChoice.title },
    secondChoice: { committee: secondChoice.committee, title: secondChoice.title },
    interviewStartsAt,
  });
  if (attachments.length) {
    rendered.attachments = attachments;
  }
  await deliverEmail({
    applicationId: application.id,
    messageType: "officer_application_notice",
    recipient: officer.email,
    rendered,
  });
}

export async function sendResultAccepted(input: {
  applicationId: string;
  lastName: string;
  email: string;
  position: string;
  memberId: string;
}): Promise<void> {
  const rendered = resultAcceptedTemplate({
    lastName: input.lastName,
    position: input.position,
    memberId: input.memberId,
  });
  await deliverEmail({
    applicationId: input.applicationId,
    messageType: "result_accepted",
    recipient: input.email,
    rendered,
  });
}

export async function sendResultRejected(input: {
  applicationId: string;
  lastName: string;
  email: string;
}): Promise<void> {
  const rendered = resultRejectedTemplate({ lastName: input.lastName });
  await deliverEmail({
    applicationId: input.applicationId,
    messageType: "result_rejected",
    recipient: input.email,
    rendered,
  });
}

export function deliverQueuedResultEmail(input: {
  notificationId: string;
  messageType: "result_accepted" | "result_rejected";
  recipient: string;
  lastName: string;
  position: string | null;
  memberId: string | null;
}): Promise<EmailDeliveryStatus> {
  const rendered =
    input.messageType === "result_accepted"
      ? resultAcceptedTemplate({
          lastName: input.lastName,
          position: input.position ?? "",
          memberId: input.memberId ?? "",
        })
      : resultRejectedTemplate({ lastName: input.lastName });
  return deliverNotification({
    notificationId: input.notificationId,
    messageType: input.messageType,
    recipient: input.recipient,
    rendered,
  });
}

export { listByApplicationId as listEmailNotificationsByApplicationId } from "./notifications";
