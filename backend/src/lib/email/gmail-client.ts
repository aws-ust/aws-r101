import { OAuth2Client } from "google-auth-library";
import type { SendEmailInput, SendEmailResult } from "./types";
import { fromHeader, replyToEmail } from "./config";

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildRfc2822Message(input: SendEmailInput): string {
  const lines = [
    `From: ${fromHeader()}`,
    `To: ${input.to}`,
    `Reply-To: ${replyToEmail()}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="aws_ust_boundary"',
    "",
    "--aws_ust_boundary",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    input.text,
    "",
    "--aws_ust_boundary",
    "Content-Type: text/html; charset=UTF-8",
    "",
    input.html,
    "",
    "--aws_ust_boundary--",
  ];
  return lines.join("\r\n");
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail credentials are not configured");
  }

  const client = new OAuth2Client(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  const { token } = await client.getAccessToken();
  if (!token) {
    throw new Error("Failed to obtain Gmail access token");
  }
  return token;
}

export async function sendViaGmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const accessToken = await getAccessToken();
  const raw = base64UrlEncode(buildRfc2822Message(input));

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const error = new Error(
      `Gmail send failed (${response.status}): ${body.slice(0, 500)}`,
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const payload = (await response.json()) as { id?: string };
  if (!payload.id) {
    throw new Error("Gmail send succeeded but no message id was returned");
  }
  return { providerMessageId: payload.id };
}
