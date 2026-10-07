export type EmailMessageType =
  | "application_submitted"
  | "applicant_otp"
  | "interview_booking"
  | "interview_reminder_24h"
  | "interview_reminder_1h"
  | "officer_application_notice"
  | "officer_first_choice_left"
  | "officer_first_choice_joined"
  | "officer_interview_rescheduled"
  | "applicant_dev_exam"
  | "member_registration"
  | "result_accepted"
  | "result_rejected"
  | "result_redirected"
  | "payment_invitation"
  | "membership_confirmation"
  | "membership_verified";

export type EmailFileAttachment = {
  filename: string;
  mimeType: string;
  content: Buffer;
};

/** "sending" means a worker has claimed the row and the Gmail call may be in flight. */
export type EmailDeliveryStatus = "pending" | "sending" | "sent" | "failed";

export type EmailInlineAttachment = {
  cid: string;
  mimeType: string;
  content: Buffer;
  filename?: string;
};

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
  cc?: string[];
  inline?: EmailInlineAttachment[];
  attachments?: EmailFileAttachment[];
};

export type SendEmailInput = {
  to: string;
  cc?: string[];
  subject: string;
  text: string;
  html: string;
  inline?: EmailInlineAttachment[];
  attachments?: EmailFileAttachment[];
  /** Stable Message-ID so a resent copy of the same notification is recognisable. */
  messageId?: string;
};

export type SendEmailResult = {
  providerMessageId: string;
};

export type EmailNotificationJson = {
  id: string;
  applicationId: string | null;
  messageType: EmailMessageType;
  recipient: string;
  status: EmailDeliveryStatus;
  attempts: number;
  providerMessageId: string | null;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
};
