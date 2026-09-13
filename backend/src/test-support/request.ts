export const TEST_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

export function originHeaders(extra: Record<string, string> = {}) {
  return { Origin: TEST_ORIGIN, ...extra };
}
