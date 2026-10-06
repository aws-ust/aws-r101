import assert from "node:assert/strict";
import test from "node:test";
import { classifySendError, retryAfterFromError } from "./retry";

function gmailError(status: number | undefined, message: string, reason?: string) {
  return Object.assign(new Error(message), { status, reason });
}

test("classifies Gmail send errors", () => {
  // The prod release failed mostly with these two: sending too fast.
  assert.equal(
    classifySendError(gmailError(403, "Gmail send failed (403): User-rate limit exceeded", "userRateLimitExceeded")),
    "rate_limited",
  );
  assert.equal(
    classifySendError(gmailError(429, "Gmail send failed (429): Too many concurrent requests for user", "rateLimitExceeded")),
    "rate_limited",
  );
  assert.equal(
    classifySendError(gmailError(403, "Gmail send failed (403): Daily user sending limit exceeded", "dailyLimitExceeded")),
    "daily_limit",
  );
  assert.equal(classifySendError(gmailError(500, "Gmail send failed (500): backend error")), "transient");
  assert.equal(classifySendError(gmailError(undefined, "fetch failed")), "transient");
  assert.equal(classifySendError(gmailError(400, "Gmail send failed (400): Invalid To header", "invalidArgument")), "permanent");
  assert.equal(classifySendError(gmailError(403, "Gmail send failed (403): Insufficient Permission", "insufficientPermissions")), "permanent");
  // No answer from Gmail: it may have sent, so never auto-retry.
  assert.equal(
    classifySendError(Object.assign(new Error("Gmail did not answer within 30s"), { timedOut: true })),
    "unknown_outcome",
  );
});

test("reads Gmail's retry-after time", () => {
  const at = retryAfterFromError(
    new Error("User-rate limit exceeded.  Retry after 2026-10-05T15:30:00.000Z"),
  );
  assert.equal(at?.toISOString(), "2026-10-05T15:30:00.000Z");
  assert.equal(retryAfterFromError(new Error("no hint here")), null);
});
