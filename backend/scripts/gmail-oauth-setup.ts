import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { OAuth2Client } from "google-auth-library";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = "https://developers.google.com/oauthplayground";

if (!clientId || !clientSecret) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first.");
  process.exit(1);
}

const client = new OAuth2Client(clientId, clientSecret, redirectUri);
const authUrl = client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/gmail.send"],
});

console.log("1. Open this URL and authorize as the org mailbox:\n");
console.log(authUrl);
console.log("\n2. Paste the authorization code from OAuth Playground:\n");

const rl = createInterface({ input, output });
const code = (await rl.question("Authorization code: ")).trim();
rl.close();

const { tokens } = await client.getToken(code);
if (!tokens.refresh_token) {
  console.error("No refresh token returned. Revoke prior access and retry with prompt=consent.");
  process.exit(1);
}

console.log("\nAdd to .env:\n");
console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
