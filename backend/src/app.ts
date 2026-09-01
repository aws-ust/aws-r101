import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq } from "drizzle-orm";
import type { LambdaEvent, LambdaContext } from "hono/aws-lambda";
import { db } from "./db";
import { committees, positions } from "./db/schema";
import { applicationsRoutes } from "./routes/applications";

type Bindings = {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
};

export const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  })
);

app.get("/health", (c) => c.json({ ok: true, service: "aws-ust-api" }));

app.get("/positions", async (c) => {
  const rows = await db
    .select({
      id: positions.id,
      committee: committees.name,
      title: positions.name,
      description: positions.description,
    })
    .from(positions)
    .innerJoin(committees, eq(positions.committeeId, committees.id))
    .where(eq(positions.isOpen, true));

  return c.json(rows);
});

app.route("/applications", applicationsRoutes);

app.post("/uploads/presign", (c) =>
  c.json({ error: "not implemented" }, 501)
);

export type AppType = typeof app;
