import { Hono } from "hono";
import { z } from "zod";
import { getCurrentUser, requireAuth } from "../auth";
import { logHrAudit } from "../lib/hr/audit";
import {
  ensureOfficerHuntSeats,
  listOfficerHuntSeats,
  OfficerHuntSeatError,
  updateOfficerHuntSeat,
} from "../lib/officer-hunt/seats";
import {
  getOfficerHuntSettings,
  OfficerHuntError,
  officerHuntSeasonStatus,
  saveOfficerHuntSettings,
  toSettingsPayload,
} from "../lib/officer-hunt/settings";
import { handleCreateApplication } from "./applications";

export const officerHuntRoutes = new Hono();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const optionalTimestamp = z
  .string()
  .nullable()
  .transform((value) => (value ? new Date(value) : null))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), {
    error: "Enter valid dates.",
  });

const settingsSchema = z.object({
  termYear: z.number().int().min(2000).max(9999),
  applicationsOpenAt: optionalTimestamp,
  applicationsCloseAt: optionalTimestamp,
  interviewsStartAt: optionalTimestamp,
  interviewsEndAt: optionalTimestamp,
});

const seatPatchSchema = z
  .object({
    isOpen: z.boolean().optional(),
    openSlots: z.number().int().min(0).max(50).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { error: "Nothing to change." });

/** Public: whether the hunt is taking applications, and for which term. */
officerHuntRoutes.get("/status", async (c) => {
  const settings = await getOfficerHuntSettings();
  return c.json({
    termYear: settings?.termYear ?? null,
    season: officerHuntSeasonStatus(settings),
  });
});

/** Public: the form posts here, to the same rules as R101 but a different round. */
officerHuntRoutes.post("/applications", (c) => handleCreateApplication(c, false, "officer_hunt"));

officerHuntRoutes.get("/settings", requireAuth, async (c) =>
  c.json(toSettingsPayload(await getOfficerHuntSettings())),
);

officerHuntRoutes.put("/settings", requireAuth, async (c) => {
  const parsed = settingsSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Check the dates and year." }, 400);
  }
  try {
    const user = getCurrentUser(c);
    const saved = await saveOfficerHuntSettings(parsed.data, user.email);
    // The first save also lays out the seats, so there is nothing to seed on the server.
    await ensureOfficerHuntSeats();
    logHrAudit({
      actorEmail: user.email,
      action: "officer_hunt.settings",
      resourceType: "officer_hunt",
    });
    return c.json(saved);
  } catch (error) {
    if (error instanceof OfficerHuntError) return c.json({ error: error.message }, 400);
    throw error;
  }
});

officerHuntRoutes.get("/seats", requireAuth, async (c) => c.json(await listOfficerHuntSeats()));

officerHuntRoutes.patch("/seats/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return c.json({ error: "Invalid seat id." }, 400);
  const parsed = seatPatchSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Open or close the seat, or set how many it takes." }, 400);
  try {
    await updateOfficerHuntSeat(id, parsed.data);
    logHrAudit({
      actorEmail: getCurrentUser(c).email,
      action: "officer_hunt.seat",
      resourceType: "position",
      resourceId: id,
    });
    return c.json(await listOfficerHuntSeats());
  } catch (error) {
    if (error instanceof OfficerHuntSeatError) return c.json({ error: error.message }, 400);
    throw error;
  }
});
