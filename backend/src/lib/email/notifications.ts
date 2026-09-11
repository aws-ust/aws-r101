import { asc, eq } from "drizzle-orm";
import { db } from "../../db";
import { emailNotifications } from "../../db/schema";
import type {
  EmailDeliveryStatus,
  EmailMessageType,
  EmailNotificationJson,
} from "./types";

function toJson(row: {
  id: string;
  applicationId: string | null;
  messageType: EmailMessageType;
  recipient: string;
  status: EmailDeliveryStatus;
  attempts: number;
  providerMessageId: string | null;
  lastError: string | null;
  createdAt: Date;
  sentAt: Date | null;
}): EmailNotificationJson {
  return {
    id: row.id,
    applicationId: row.applicationId,
    messageType: row.messageType,
    recipient: row.recipient,
    status: row.status,
    attempts: row.attempts,
    providerMessageId: row.providerMessageId,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt ? row.sentAt.toISOString() : null,
  };
}

export async function createPending(input: {
  applicationId?: string | null;
  messageType: EmailMessageType;
  recipient: string;
}): Promise<EmailNotificationJson> {
  const [row] = await db
    .insert(emailNotifications)
    .values({
      applicationId: input.applicationId ?? null,
      messageType: input.messageType,
      recipient: input.recipient,
      status: "pending",
      attempts: 0,
    })
    .returning();
  return toJson(row as typeof row & { messageType: EmailMessageType });
}

export async function incrementAttempts(id: string): Promise<void> {
  const [current] = await db
    .select({ attempts: emailNotifications.attempts })
    .from(emailNotifications)
    .where(eq(emailNotifications.id, id))
    .limit(1);
  if (!current) return;
  await db
    .update(emailNotifications)
    .set({ attempts: current.attempts + 1 })
    .where(eq(emailNotifications.id, id));
}

export async function markSent(
  id: string,
  providerMessageId: string,
): Promise<void> {
  await db
    .update(emailNotifications)
    .set({
      status: "sent",
      providerMessageId,
      lastError: null,
      sentAt: new Date(),
    })
    .where(eq(emailNotifications.id, id));
}

export async function markFailed(id: string, lastError: string): Promise<void> {
  await db
    .update(emailNotifications)
    .set({
      status: "failed",
      lastError,
    })
    .where(eq(emailNotifications.id, id));
}

export async function listByApplicationId(
  applicationId: string,
): Promise<EmailNotificationJson[]> {
  const rows = await db
    .select()
    .from(emailNotifications)
    .where(eq(emailNotifications.applicationId, applicationId))
    .orderBy(asc(emailNotifications.createdAt));
  return rows.map((row) =>
    toJson(row as typeof row & { messageType: EmailMessageType }),
  );
}
