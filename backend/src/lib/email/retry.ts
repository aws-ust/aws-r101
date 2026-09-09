const RETRY_DELAYS_MS = [1000, 2000, 4000];

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return true;
  const status = (err as Error & { status?: number }).status;
  if (status === 429) return true;
  if (typeof status === "number" && status >= 500) return true;
  if (err.message.includes("fetch failed") || err.message.includes("network")) {
    return true;
  }
  return false;
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
