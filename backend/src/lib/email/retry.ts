const RETRY_DELAYS_MS = [1000, 2000, 4000];

/**
 * How a failed Gmail send should be handled:
 * - rate_limited: sending too fast (429, or 403 userRateLimitExceeded); wait and try again.
 * - daily_limit: the account's daily sending cap is used up; wait much longer.
 * - transient: Gmail or network hiccup (5xx, fetch failure); try again later.
 * - permanent: anything else (e.g. an invalid recipient); retrying won't help.
 * - unknown_outcome: Gmail never answered, so the email may have been sent.
 */
export type SendErrorKind =
  | "rate_limited"
  | "daily_limit"
  | "transient"
  | "permanent"
  /** Gmail never answered, so the email may already be on its way. */
  | "unknown_outcome";

const RATE_LIMIT_REASONS = new Set([
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "RESOURCE_EXHAUSTED",
]);

export function classifySendError(err: unknown): SendErrorKind {
  if (!(err instanceof Error)) return "transient";
  const { status, reason, timedOut } = err as Error & { status?: number; reason?: string; timedOut?: boolean };
  if (timedOut) return "unknown_outcome";
  const message = err.message.toLowerCase();
  if (reason === "dailyLimitExceeded" || message.includes("daily user sending limit")) {
    return "daily_limit";
  }
  if (
    status === 429 ||
    (status === 403 &&
      ((reason !== undefined && RATE_LIMIT_REASONS.has(reason)) ||
        message.includes("rate limit") ||
        message.includes("too many concurrent requests")))
  ) {
    return "rate_limited";
  }
  if (typeof status === "number" && status >= 500) return "transient";
  if (status === undefined && (message.includes("fetch failed") || message.includes("network"))) {
    return "transient";
  }
  return "permanent";
}

/** Gmail sometimes says exactly when to retry ("Retry after 2026-10-05T15:30:00.000Z"). */
export function retryAfterFromError(err: unknown): Date | null {
  if (!(err instanceof Error)) return null;
  const match = err.message.match(/Retry after (\d{4}-\d{2}-\d{2}T[\d:.]+Z)/);
  if (!match) return null;
  const at = new Date(match[1]);
  return Number.isNaN(at.getTime()) ? null : at;
}

function isRetryableError(err: unknown): boolean {
  const kind = classifySendError(err);
  return kind === "rate_limited" || kind === "transient";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !isRetryableError(err)) {
        throw err;
      }
      await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 4000);
    }
  }
  throw lastError;
}
