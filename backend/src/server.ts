import { serve } from "@hono/node-server";
import { app } from "./app";
import { emailEnabled, hasGmailCredentials } from "./lib/email/config";
import { retryFailedResultEmails } from "./lib/hr/result-email-delivery";

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`backend listening on http://localhost:${info.port}`);
  console.log(
    `[email] startup: enabled=${emailEnabled()} gmailConfigured=${hasGmailCredentials()}`,
  );
  void retryFailedResultEmails({ includeFreshPending: true })
    .then((result) => {
      if (result.retried > 0) {
        console.log(
          `[email] recovered ${result.retried} result email(s): ${result.sent} sent, ${result.failed} failed`,
        );
      }
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[email] result recovery failed: ${message}`);
    });
});
