import { Hono } from "hono";
import { MEMBER_ID_PATTERN, verifyMember } from "../lib/membership/member-verification";

/** Public, read-only: backs the "Scan to verify" QR on member IDs. */
export const memberVerificationRoutes = new Hono();

memberVerificationRoutes.get("/verify/:memberId", async (c) => {
  const memberId = c.req.param("memberId").toUpperCase();
  if (!MEMBER_ID_PATTERN.test(memberId)) {
    return c.json({ error: "That is not a valid member ID." }, 400);
  }
  const member = await verifyMember(memberId);
  if (!member) return c.json({ error: "No member has this ID." }, 404);
  c.header("Cache-Control", "no-store");
  return c.json(member);
});
