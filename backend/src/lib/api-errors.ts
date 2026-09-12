import type { Context } from "hono";

const REDACTED = "[redacted]";

const SENSITIVE_KEY_RE =
  /^(password|token|code|authorization|cookie|set-cookie|hr_token|applicant_token)$/i;

function redactValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.length > 500) return `${value.slice(0, 500)}…`;
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(record)) {
      out[key] = SENSITIVE_KEY_RE.test(key) ? REDACTED : redactValue(entry);
    }
    return out;
  }
  return value;
}

export function redactForLogs(value: unknown): unknown {
  return redactValue(value);
}

export function logApiError(c: Context, err: unknown, context?: string) {
  const label = context ? `[api] ${context}` : "[api] unhandled error";
  const safeErr =
    err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : redactForLogs(err);
  console.error(
    `${label} ${c.req.method} ${c.req.path}`,
    redactForLogs(safeErr),
  );
}

export function internalApiError(
  c: Context,
  err: unknown,
  context: string,
  message = "Something went wrong. Please try again.",
) {
  logApiError(c, err, context);
  return c.json({ error: message }, 500);
}

export function unavailableApiError(
  c: Context,
  err: unknown,
  context: string,
  message = "This feature is temporarily unavailable. Try again in a moment.",
) {
  logApiError(c, err, context);
  return c.json({ error: message }, 503);
}
