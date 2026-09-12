export type EmailMessageType =
  | "application_submitted"
  | "applicant_otp"
  | "interview_booking"
  | "officer_application_notice"
  | "result_accepted"
  | "result_rejected";

export type EmailDeliveryStatus = "pending" | "sent" | "failed";

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
  inline?: EmailInlineAttachment[];
};

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  inline?: EmailInlineAttachment[];
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
