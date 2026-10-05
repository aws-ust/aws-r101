import { Hono } from "hono";
import { z } from "zod";
import {
  getApplicantSession,
  requireApplicantAuth,
} from "../applicant-auth";
import {
  completeApplicantMemberPhoto,
  createApplicantMemberPhotoUpload,
  getApplicantPayment,
  submitApplicantPayment,
} from "../lib/membership/applicant-payments";
import {
  MAX_MEMBER_PHOTO_SIZE_BYTES,
  MEMBER_PHOTO_MIME_TYPES,
} from "../lib/membership/member-photo";
import { MembershipPaymentError } from "../lib/membership/errors";

const submissionSchema = z.object({
  method: z.enum(["gcash", "bpi"]).default("gcash"),
  referenceNumber: z.string().trim().min(4).max(100),
  receiptUrl: z.string().trim().min(1).max(2000),
});

const memberPhotoSchema = z.object({
  mimeType: z.enum(MEMBER_PHOTO_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_MEMBER_PHOTO_SIZE_BYTES),
  checksumSha256: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
});
const completeMemberPhotoSchema = memberPhotoSchema.extend({
  key: z.string().trim().min(1).max(500),
});

function paymentError(error: unknown) {
  if (!(error instanceof MembershipPaymentError)) throw error;
  return { body: { error: error.message }, status: error.status } as const;
}

export const applicantPaymentRoutes = new Hono();

applicantPaymentRoutes.use("*", requireApplicantAuth);

applicantPaymentRoutes.get("/payment", async (c) => {
  const session = getApplicantSession(c);
  const payment = await getApplicantPayment(session.applicationId);
  if (!payment) return c.json({ payment: null });
  return c.json({ payment });
});

applicantPaymentRoutes.post("/payment/submit", async (c) => {
  const parsed = submissionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(
      { error: "Enter your reference number and a Google Drive link to your receipt." },
      400,
    );
  }
  try {
    const session = getApplicantSession(c);
    return c.json(
      await submitApplicantPayment(session.applicationId, parsed.data),
      201,
    );
  } catch (error) {
    const result = paymentError(error);
    return c.json(result.body, result.status);
  }
});

applicantPaymentRoutes.post("/payment/member-photo/presign", async (c) => {
  const parsed = memberPhotoSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Choose a JPEG, PNG, or WebP photo up to 5 MB." }, 400);
  }
  try {
    const session = getApplicantSession(c);
    return c.json(
      await createApplicantMemberPhotoUpload(session.applicationId, parsed.data),
      201,
    );
  } catch (error) {
    const result = paymentError(error);
    return c.json(result.body, result.status);
  }
});

applicantPaymentRoutes.post("/payment/member-photo/complete", async (c) => {
  const parsed = completeMemberPhotoSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) {
    return c.json({ error: "Enter valid uploaded photo details." }, 400);
  }
  try {
    const session = getApplicantSession(c);
    return c.json(
      await completeApplicantMemberPhoto(session.applicationId, parsed.data),
    );
  } catch (error) {
    const result = paymentError(error);
    return c.json(result.body, result.status);
  }
});
