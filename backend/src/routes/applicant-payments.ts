import { Hono } from "hono";
import { z } from "zod";
import {
  getApplicantSession,
  requireApplicantAuth,
} from "../applicant-auth";
import {
  getApplicantPayment,
  submitApplicantPayment,
} from "../lib/membership/applicant-payments";
import { MembershipPaymentError } from "../lib/membership/errors";

const submissionSchema = z.object({
  method: z.enum(["gcash", "bpi"]).default("gcash"),
  referenceNumber: z.string().trim().min(4).max(100),
  receiptUrl: z.string().trim().min(1).max(2000),
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
