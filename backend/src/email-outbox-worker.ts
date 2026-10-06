import { hasDueEmails } from "./lib/email/outbox";
import { kickEmailOutbox } from "./lib/email/outbox-kick";
import { runEmailOutbox } from "./lib/email/queued-emails";

/**
 * Started by the API whenever bulk emails are queued (see lib/email/outbox-kick.ts).
 * Sends until the queue is empty or the 8-minute budget (inside the 10-minute
 * Lambda timeout) runs out, then starts itself again if work remains. There is
 * no polling schedule, so the database can scale to zero between releases.
 */
export async function handler() {
  const result = await runEmailOutbox({ budgetMs: 8 * 60 * 1000 });
  console.info("[email-outbox] run complete", result);
  if (!result.skipped && (await hasDueEmails(60_000))) {
    await kickEmailOutbox(process.env.AWS_LAMBDA_FUNCTION_NAME);
  }
  return result;
}
