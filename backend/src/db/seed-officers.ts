import { db } from "./index";
import { kickEmailOutbox } from "../lib/email/outbox-kick";
import { isLoopbackUrl } from "../lib/core/site-url";
import { appBaseUrl } from "../lib/email/config";
import { runEmailOutbox } from "../lib/email/queued-emails";
import {
  releaseHeldWelcomeEmails,
  seedOfficers,
} from "../lib/membership/officer-seeding";

// Options (all read from the environment):
//   OFFICER_SEED_ONLY=a@ust.edu.ph,b@ust.edu.ph  only those seats / people
//   OFFICER_SEED_WELCOME=false                   do not queue welcome emails
//   OFFICER_SEED_HOLD=true                       queue them, but hold them back
//   OFFICER_SEED_RELEASE=true                    release held emails and send them
//   OFFICER_SEED_RESEND=true                     queue a fresh email for existing seats
//   SEND_OFFICER_WELCOME=true                    send from this machine instead of the worker
const onlyEmails = (process.env.OFFICER_SEED_ONLY ?? "")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);

/** Emails rendered on this machine link to this machine's APP_BASE_URL. */
function assertLinksWillWork() {
  const database = process.env.DATABASE_URL ?? "";
  let remote = false;
  try {
    remote = !isLoopbackUrl(`http://${new URL(database).host}`);
  } catch {
    // An unreadable DATABASE_URL fails later, where it is used.
  }
  if (remote && isLoopbackUrl(appBaseUrl())) {
    throw new Error(
      "These emails would link to localhost, but DATABASE_URL is not a local database. Set APP_BASE_URL to the real website, or send through the deployed worker by setting EMAIL_OUTBOX_FUNCTION_NAME instead of SEND_OFFICER_WELCOME.",
    );
  }
}

async function sendQueued() {
  if (process.env.SEND_OFFICER_WELCOME === "true") {
    assertLinksWillWork();
    console.log(await runEmailOutbox({ budgetMs: 60_000 }));
  } else if (process.env.EMAIL_OUTBOX_FUNCTION_NAME) {
    // Production: the worker Lambda only starts when something kicks it.
    await kickEmailOutbox();
    console.log("Started the email worker.");
  } else {
    console.log("They send with the running email worker, or rerun with SEND_OFFICER_WELCOME=true.");
  }
}

async function main() {
  if (process.env.OFFICER_SEED_RELEASE === "true") {
    const released = await releaseHeldWelcomeEmails(onlyEmails);
    console.log(`Released ${released.length} held welcome emails.`);
    if (released.length > 0) await sendQueued();
    return;
  }

  const hold = process.env.OFFICER_SEED_HOLD === "true";
  const result = await seedOfficers(undefined, {
    onlyEmails,
    queueWelcome: process.env.OFFICER_SEED_WELCOME !== "false",
    resendWelcome: process.env.OFFICER_SEED_RESEND === "true",
    holdWelcome: hold,
  });
  console.log(`Created ${result.created.length} officer seats.`);
  for (const seat of result.created) {
    console.log(`  ${seat.seatKey}: ${seat.applicationCode}${seat.memberId ? ` (${seat.memberId})` : ""}`);
  }
  if (result.existing.length > 0) console.log(`Already seeded: ${result.existing.length}.`);
  for (const skipped of result.skipped) console.warn(`Skipped ${skipped.seatKey}: ${skipped.reason}`);
  const queued = result.welcomeNotificationIds.length + result.paymentInvitationIds.length;
  if (queued > 0) {
    console.log(
      `Queued ${result.welcomeNotificationIds.length} welcome emails and ${result.paymentInvitationIds.length} payment invitations.`,
    );
    if (hold) console.log("They are on hold and will not send. Release them with OFFICER_SEED_RELEASE=true.");
    else await sendQueued();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
