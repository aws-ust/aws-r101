const ALLOWED_RETURN_PATHS = new Set(["/admin/hr", "/admin/hr/archive"])

/** Allowlisted in-app list URLs for HR detail `returnTo` (blocks open redirects). */
export function sanitizeReturnTo(returnTo: string | null): string | undefined {
  if (!returnTo) return undefined
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return undefined

  const pathname = returnTo.split("?", 1)[0]
  if (!ALLOWED_RETURN_PATHS.has(pathname)) return undefined

  return returnTo
}

export function sanitizeReturnToFromSearchParams(
  searchParams: URLSearchParams,
): string | undefined {
  return sanitizeReturnTo(searchParams.get("returnTo"))
}
