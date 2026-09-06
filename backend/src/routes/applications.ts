import { Hono } from "hono";
import {
  createApplication,
  deleteApplication,
  getApplicationDocument,
  getApplicationById,
  listApplications,
  positionsExist,
  updateApplicationStatus,
  type CreateApplicationInput,
} from "../lib/applications";
import { requireAuth } from "../auth";
import { createDocumentDownload } from "../lib/documents";
import { freePlanEndDate } from "../lib/free-plan";

export const applicationsRoutes = new Hono();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseCreateBody(
  body: unknown,
): { ok: true; value: CreateApplicationInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const input = body as Record<string, unknown>;
  if (
    !isNonEmptyString(input.firstName) ||
    !isNonEmptyString(input.lastName) ||
    !isNonEmptyString(input.email) ||
    !isNonEmptyString(input.section) ||
    !isNonEmptyString(input.motivation)
  ) {
    return {
      ok: false,
      error: "firstName, lastName, email, section, and motivation are required.",
    };
  }

  if (!Number.isInteger(input.age) || (input.age as number) <= 0) {
    return { ok: false, error: "age must be a positive integer." };
  }

  if (!Array.isArray(input.choices) || input.choices.length !== 2) {
    return { ok: false, error: "choices must contain exactly two items." };
  }

  const choices: CreateApplicationInput["choices"] = [];
  for (const choice of input.choices) {
    if (!choice || typeof choice !== "object") {
      return { ok: false, error: "Each choice must be an object." };
    }
    const row = choice as Record<string, unknown>;
    if (!isNonEmptyString(row.positionId) || !isUuid(row.positionId)) {
      return { ok: false, error: "Each choice needs a valid positionId UUID." };
    }
    if (row.preferenceRank !== 1 && row.preferenceRank !== 2) {
      return { ok: false, error: "preferenceRank must be 1 or 2." };
    }
    choices.push({
      positionId: row.positionId,
      preferenceRank: row.preferenceRank,
    });
  }

  const ranks = new Set(choices.map((choice) => choice.preferenceRank));
  if (ranks.size !== 2) {
    return { ok: false, error: "choices must include ranks 1 and 2." };
  }
  if (choices[0].positionId === choices[1].positionId) {
    return { ok: false, error: "choices must use two different positions." };
  }

  if (!isNonEmptyString(input.uploadSessionId) || !isUuid(input.uploadSessionId)) {
    return { ok: false, error: "uploadSessionId must be a valid UUID." };
  }

  return {
    ok: true,
    value: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim(),
      age: input.age as number,
      section: input.section.trim(),
      motivation: input.motivation.trim(),
      choices,
      uploadSessionId: input.uploadSessionId,
    },
  };
}

applicationsRoutes.get("/", requireAuth, async (c) => {
  const committee = c.req.query("committee") ?? "";
  const position = c.req.query("position") ?? "";
  const section = c.req.query("section") ?? "";

  if (committee && !isUuid(committee)) {
    return c.json({ error: "committee must be a UUID." }, 400);
  }
  if (position && !isUuid(position)) {
    return c.json({ error: "position must be a UUID." }, 400);
  }

  const result = await listApplications({
    committee: committee || undefined,
    position: position || undefined,
    section: section || undefined,
  });
  return c.json(result);
});

applicationsRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = parseCreateBody(body);
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, 400);
  }

  const known = await positionsExist(
    parsed.value.choices.map((choice) => choice.positionId),
  );
  if (!known) {
    return c.json({ error: "One or more positions do not exist." }, 400);
  }

  try {
    const result = await createApplication(parsed.value);
    return c.json(result.application, result.created ? 201 : 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create application.";
    if (message.includes("was not found")) return c.json({ error: message }, 404);
    if (message.includes("has expired")) return c.json({ error: message }, 410);
    if (message.includes("metadata") || message.includes("not a PDF")) {
      return c.json({ error: message }, 400);
    }
    console.error("Could not create application", error);
    return c.json({ error: "Could not create application." }, 503);
  }
});

applicationsRoutes.patch("/:id/status", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) {
    return c.json({ error: "Invalid application id." }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const status =
    body && typeof body === "object"
      ? (body as Record<string, unknown>).status
      : undefined;
  if (status !== "approved" && status !== "rejected") {
    return c.json({ error: "status must be approved or rejected." }, 400);
  }

  const updated = await updateApplicationStatus(id, status);
  if (!updated) {
    return c.json({ error: "Application not found." }, 404);
  }
  return c.json(updated);
});

applicationsRoutes.get("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) {
    return c.json({ error: "Invalid application id." }, 400);
  }

  const application = await getApplicationById(id);
  if (!application) {
    return c.json({ error: "Application not found." }, 404);
  }
  return c.json(application);
});

applicationsRoutes.get("/:id/documents/:type", requireAuth, async (c) => {
  const id = c.req.param("id");
  const type = c.req.param("type");
  if (!isUuid(id)) return c.json({ error: "Invalid application id." }, 400);
  if (type !== "resume" && type !== "transcript") {
    return c.json({ error: "Document type must be resume or transcript." }, 400);
  }
  const document = await getApplicationDocument(id, type);
  if (!document) return c.json({ error: "Document not found." }, 404);
  const availableUntil = document.availableUntil ?? freePlanEndDate();
  if (availableUntil && availableUntil <= new Date()) {
    return c.json({ error: "Document files have expired." }, 410);
  }
  const disposition = c.req.query("disposition") ?? "inline";
  if (disposition !== "inline" && disposition !== "attachment") {
    return c.json({ error: "disposition must be inline or attachment." }, 400);
  }
  try {
    const url = await createDocumentDownload(
      document.s3Key,
      document.fileName,
      disposition,
    );
    c.header("Cache-Control", "no-store");
    return c.redirect(url, 302);
  } catch (error) {
    console.error("Could not load application document", error);
    return c.json({ error: "Document storage is unavailable." }, 503);
  }
});

applicationsRoutes.delete("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) {
    return c.json({ error: "Invalid application id." }, 400);
  }

  const deleted = await deleteApplication(id);
  if (!deleted) {
    return c.json({ error: "Application not found." }, 404);
  }
  return c.body(null, 204);
});
