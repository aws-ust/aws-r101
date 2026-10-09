// Sends sample copies of the payment emails to ONE address, so the design can be checked in a real inbox.
//   pnpm --filter backend exec tsx --env-file=../.env scripts/send-sample-emails.ts you@ust.edu.ph
// Subjects are prefixed "[Sample]". It honours EMAIL_ALLOWED_RECIPIENTS like every other send.
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
    subject: `[Sample] ${email.subject}`,
    text: email.text,
    html: email.html,
    inline: email.inline,
  });
  console.log(`sent "${email.subject}" (${result.providerMessageId})`);
}
