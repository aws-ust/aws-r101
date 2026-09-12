import { OAuth2Client } from "google-auth-library";
import type { EmailInlineAttachment, SendEmailInput, SendEmailResult } from "./types";
import { fromHeader, replyToEmail } from "./config";

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function encodeBase64Body(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/.{1,76}/g, "$&\r\n")
    .replace(/\r\n$/, "");
}

function buildAlternativePart(boundary: string, input: SendEmailInput): string[] {
  return [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    input.text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    input.html,
    "",
  ];
}

function buildInlineParts(relatedBoundary: string, inline: EmailInlineAttachment[]): string[] {
  const lines: string[] = [];
  for (const attachment of inline) {
    lines.push(
      `--${relatedBoundary}`,
      `Content-Type: ${attachment.mimeType}`,
      "Content-Transfer-Encoding: base64",
      `Content-ID: <${attachment.cid}>`,
      `Content-Disposition: inline; filename="${attachment.filename ?? "image.png"}"`,
      "",
      encodeBase64Body(attachment.content),
      "",
    );
  }
  return lines;
}

function buildRfc2822Message(input: SendEmailInput): string {
  const inline = input.inline ?? [];
  const lines = [
    `From: ${fromHeader()}`,
    `To: ${input.to}`,
    `Reply-To: ${replyToEmail()}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
  ];

  if (inline.length === 0) {
    const boundary = "aws_ust_boundary";
    lines.push(
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      ...buildAlternativePart(boundary, input),
      `--${boundary}--`,
    );
    return lines.join("\r\n");
  }

  const relatedBoundary = "aws_ust_related";
  const altBoundary = "aws_ust_alt";
  lines.push(
    `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
    "",
    `--${relatedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    "",
    ...buildAlternativePart(altBoundary, input),
    `--${altBoundary}--`,
    "",
    ...buildInlineParts(relatedBoundary, inline),
    `--${relatedBoundary}--`,
  );
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
