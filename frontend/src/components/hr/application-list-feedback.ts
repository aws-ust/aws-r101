export function hrApplicationListNoticeFeedback(notice?: string) {
  if (notice === "archived") {
    return { type: "success" as const, message: "Applicant archived." }
  }
  if (notice === "restored") {
    return { type: "success" as const, message: "Applicant restored." }
  }
  return null
}
