import { Hono } from "hono";
import { z } from "zod";
import {
  getApplicantSession,
  requireApplicantAuth,
} from "../applicant-auth";
import {
  createApplicantReceiptUpload,
  getApplicantPayment,
  submitApplicantPayment,
} from "../lib/membership/applicant-payments";
import { MembershipPaymentError } from "../lib/membership/errors";

const receiptSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(10_000_000),
  checksumSha256: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
});

const submissionSchema = receiptSchema.extend({
  method: z.enum(["gcash", "bpi"]),
  referenceNumber: z.string().trim().min(4).max(100),
  receiptKey: z.string().trim().min(1).max(500),
  receiptFileName: z.string().trim().min(1).max(255),
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

applicantPaymentRoutes.post("/payment/receipt/presign", async (c) => {
  const parsed = receiptSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Enter valid receipt image details." }, 400);
  }
  try {
    const session = getApplicantSession(c);
    return c.json(
      await createApplicantReceiptUpload(session.applicationId, parsed.data),
      201,
    );
  } catch (error) {
    const result = paymentError(error);
    return c.json(result.body, result.status);
  }
});

applicantPaymentRoutes.post("/payment/submit", async (c) => {
  const parsed = submissionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Enter valid payment and receipt details." }, 400);
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
