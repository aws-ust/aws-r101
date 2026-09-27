export type HrRole = "hr" | "admin" | "finance"

export function paymentCampaignDescription(role: HrRole) {
  if (role === "finance") {
    return "Add the official amount, payment accounts, and QR images after HR creates the payment period."
  }
  return "Set the payment dates and group-chat links, then open or close applicant submissions."
}

export function paymentReviewDescription(role: HrRole) {
  if (role === "hr") {
    return "Track payment progress across all eligible applicants."
  }
  return "Filter submissions, open each receipt, and record the manual verification result."
}
