import { serve } from "@hono/node-server";
import { app } from "./app";
import { emailEnabled, hasGmailCredentials } from "./lib/email/config";

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`backend listening on http://localhost:${info.port}`);
  console.log(
    `[email] startup: enabled=${emailEnabled()} gmailConfigured=${hasGmailCredentials()}`,
  );
});
