import { OAuth2Client } from "google-auth-library";
import type {
  EmailFileAttachment,
  EmailInlineAttachment,
  SendEmailInput,
  SendEmailResult,
} from "./types";
import { assertRecipientsAllowed, fromHeader, replyToEmail } from "./config";

export type GmailSendError = Error & {
  status?: number;
  /** Gmail's machine-readable reason, e.g. "userRateLimitExceeded". */
  reason?: string;
  /** No answer in time: the email may or may not have been sent. */
  timedOut?: boolean;
};

const SEND_TIMEOUT_MS = 30_000;

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

function encodeHeaderValue(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
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

function buildRelatedBody(input: SendEmailInput): string[] {
  const inline = input.inline ?? [];
  if (inline.length === 0) {
    const boundary = "aws_ust_boundary";
    return [
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      ...buildAlternativePart(boundary, input),
      `--${boundary}--`,
    ];
  }

  const relatedBoundary = "aws_ust_related";
  const altBoundary = "aws_ust_alt";
  return [
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
  ];
}

function buildFileAttachmentParts(
  boundary: string,
  attachments: EmailFileAttachment[],
): string[] {
  const lines: string[] = [];
  for (const file of attachments) {
    const safeName = file.filename.replace(/"/g, "'");
    lines.push(
      `--${boundary}`,
      `Content-Type: ${file.mimeType}; name="${safeName}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${safeName}"`,
      "",
      encodeBase64Body(file.content),
      "",
    );
  }
  return lines;
}

function buildRfc2822Message(input: SendEmailInput): string {
  const attachments = input.attachments ?? [];
  const lines = [
    `From: ${fromHeader()}`,
    `To: ${input.to}`,
    ...(input.cc?.length ?
      [`Cc: ${input.cc.join(", ")}`]
    : []),
    `Reply-To: ${replyToEmail()}`,
    ...(input.messageId ? [`Message-ID: <${input.messageId}>`] : []),
    `Subject: ${encodeHeaderValue(input.subject)}`,
    "MIME-Version: 1.0",
  ];

  const bodyLines = buildRelatedBody(input);

  if (attachments.length === 0) {
    lines.push(...bodyLines);
    return lines.join("\r\n");
  }

  const mixedBoundary = "aws_ust_mixed";
  lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`, "");
  lines.push(`--${mixedBoundary}`, ...bodyLines, "");
  lines.push(...buildFileAttachmentParts(mixedBoundary, attachments));
  lines.push(`--${mixedBoundary}--`);
  return lines.join("\r\n");
}

// One client per process: it keeps the access token and only refreshes it
// when it is about to expire, instead of minting a new token for every email.
let oauthClient: OAuth2Client | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail credentials are not configured");
  }

  if (!oauthClient) {
    oauthClient = new OAuth2Client(clientId, clientSecret);
    oauthClient.setCredentials({ refresh_token: refreshToken });
  }
  const { token } = await oauthClient.getAccessToken();
  if (!token) {
    throw new Error("Failed to obtain Gmail access token");
  }
  return token;
}

function gmailErrorReason(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as {
      error?: { errors?: { reason?: string }[]; status?: string };
    };
    return parsed.error?.errors?.[0]?.reason ?? parsed.error?.status;
  } catch {
    return undefined;
  }
}

export async function sendViaGmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  // Every email in the app goes through here, so this is the one place a test run is held to its list.
  assertRecipientsAllowed([input.to, ...(input.cc ?? [])]);
  const accessToken = await getAccessToken();
  const raw = base64UrlEncode(buildRfc2822Message(input));

  let response: Response;
  try {
    response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      },
    );
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      const timeout = new Error(
        `Gmail did not answer within ${SEND_TIMEOUT_MS / 1000}s`,
      ) as GmailSendError;
      timeout.timedOut = true;
      throw timeout;
    }
    throw err;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const error = new Error(
      `Gmail send failed (${response.status}): ${body.slice(0, 500)}`,
    ) as GmailSendError;
    error.status = response.status;
    error.reason = gmailErrorReason(body);
    throw error;
  }

  const payload = (await response.json()) as { id?: string };
  if (!payload.id) {
    throw new Error("Gmail send succeeded but no message id was returned");
  }
  return { providerMessageId: payload.id };
}
