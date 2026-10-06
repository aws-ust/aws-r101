import { serve } from "@hono/node-server";
import { app } from "./app";
import { emailEnabled, hasGmailCredentials } from "./lib/email/config";
import { runEmailOutbox } from "./lib/email/queued-emails";

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`backend listening on http://localhost:${info.port}`);
  console.log(
    `[email] startup: enabled=${emailEnabled()} gmailConfigured=${hasGmailCredentials()}`,
  );
  // In production a scheduled Lambda sends queued bulk emails; locally this
  // loop does the same job.
  let running = false;
  setInterval(() => {
    if (running) return;
    running = true;
    void runEmailOutbox({ budgetMs: 10_000 })
      .then((result) => {
        if (result.sent || result.failed || result.deferred || result.uncertain) {
          console.log("[email-outbox]", result);
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[email-outbox] run failed: ${message}`);
      })
      .finally(() => {
        running = false;
      });
  }, 15_000);
});
