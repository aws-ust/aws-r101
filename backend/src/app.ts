import { Hono } from "hono";
import { cors } from "hono/cors";
import type { LambdaEvent, LambdaContext } from "hono/aws-lambda";
<<<<<<< HEAD
import { db } from "./db";
import { committees, positions } from "./db/schema";
import { applicationsRoutes } from "./routes/applications";
=======
import { applicationsRoutes } from "./routes/applications";
import { positionsRoutes } from "./routes/positions";
>>>>>>> 48bd77d4fd932f5f42a682bc8865030cfe5bd4ba

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

app.route("/positions", positionsRoutes);

<<<<<<< HEAD
  return c.json(rows);
});

=======
>>>>>>> 48bd77d4fd932f5f42a682bc8865030cfe5bd4ba
app.route("/applications", applicationsRoutes);

app.post("/uploads/presign", (c) =>
  c.json({ error: "not implemented" }, 501)
);

export type AppType = typeof app;
