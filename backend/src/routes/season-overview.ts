import { Hono } from "hono";
import { requireAuth } from "../auth";
import { getSeasonOverview } from "../lib/hr/season-overview";

export const seasonOverviewRoutes = new Hono();

seasonOverviewRoutes.use("*", requireAuth);

seasonOverviewRoutes.get("/", async (c) => c.json(await getSeasonOverview()));
