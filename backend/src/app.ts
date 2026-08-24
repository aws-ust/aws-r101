import { Hono } from "hono";
import { cors } from "hono/cors";
import type { LambdaEvent, LambdaContext } from "hono/aws-lambda";

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

// ponytail: hardcoded until the positions schema exists, matches PDF's committee shape
app.get("/positions", (c) =>
  c.json([
    {
      id: "web-dev",
      committee: "Technical",
      title: "Web Development",
      description: "Build and maintain AWS UST's web presence.",
    },
    {
      id: "marketing",
      committee: "Marketing",
      title: "Marketing Officer",
      description: "Run campaigns and manage social media.",
    },
    {
      id: "logistics",
      committee: "Logistics",
      title: "Logistics Officer",
      description: "Coordinate event operations.",
    },
  ])
);

app.get("/applications", (c) => c.json({ applications: [], total: 0 }));

app.post("/applications", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json(
    { id: crypto.randomUUID(), status: "submitted", ...body },
    201
  );
});

app.get("/applications/:id", (c) => {
  const id = c.req.param("id");
  return c.json({ id, status: "submitted" });
});

app.patch("/applications/:id/status", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  return c.json({ id, status: body.status ?? "unknown" });
});

// ponytail: stubbed 501, add real S3 presign when the upload step is built
app.post("/uploads/presign", (c) =>
  c.json({ error: "not implemented" }, 501)
);

export type AppType = typeof app;
