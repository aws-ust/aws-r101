// Local testing only: sends copies of the payment emails, exactly as applicants get them, to ONE address so
// the design can be checked in a real inbox.
//   pnpm --filter backend exec tsx --env-file=../.env scripts/send-sample-emails.ts you@ust.edu.ph
// It is not part of any deployed bundle and refuses to run anywhere but a local setup. It honours
// EMAIL_ALLOWED_RECIPIENTS like every other send.
import { isLoopbackUrl } from "../src/lib/core/site-url";
import { appBaseUrl } from "../src/lib/email/config";
import { sendViaGmail } from "../src/lib/email/gmail-client";
import {
  officerPaymentInvitationTemplate,
  paymentInvitationTemplate,
  paymentResubmissionTemplate,
} from "../src/lib/email/templates";

const recipient = process.argv[2]?.trim();
if (!recipient) {
  console.error("Usage: send-sample-emails.ts <address>");
  process.exit(1);
}
// Local only: not on a server, not in production, and only while email links point at this machine.
if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === "production" || !isLoopbackUrl(appBaseUrl())) {
  console.error("Refusing to send sample emails outside a local setup (APP_BASE_URL must be localhost).");
  process.exit(1);
}

const deadlineAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
const samples = [
  paymentResubmissionTemplate({
    lastName: "Olmedo",
    applicationCode: "AP-2026-003406",
    amountCents: 25000,
    deadlineAt,
    reason: "The reference number does not match the GCash transfer. Please upload the receipt that shows the full reference.",
    reversed: false,
  }),
  officerPaymentInvitationTemplate({
    lastName: "Olmedo",
    title: "Chief Relations Officer",
    memberId: "AWS-2627-0003",
    applicationCode: "AP-2026-003406",
    amountCents: 25000,
    deadlineAt,
  }),
  paymentInvitationTemplate({
    lastName: "Olmedo",
    applicationCode: "AP-2026-661759",
    amountCents: 25000,
    deadlineAt,
  }),
];

for (const email of samples) {
  const result = await sendViaGmail({
    to: recipient,
    subject: email.subject,
    text: email.text,
    html: email.html,
    inline: email.inline,
  });
  console.log(`sent "${email.subject}" (${result.providerMessageId})`);
}
