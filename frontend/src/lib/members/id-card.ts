// Labels printed on the digital member ID.

export function academicYearLabel(recruitmentYear: number) {
  return `${recruitmentYear}-${recruitmentYear + 1}`
}

/** Membership lasts the academic year, which ends on May 31. */
export function validThroughLabel(recruitmentYear: number) {
  return `May 31, ${recruitmentYear + 1}`
}

export type IdCardValueSize = "lg" | "md" | "sm" | "xs"

/**
 * Long names and positions step down a size so every row stays within two
 * lines and the card never overflows. Short values keep the comp's size.
 */
export function idCardValueSize(value: string): IdCardValueSize {
  if (value.length <= 20) return "lg"
  if (value.length <= 24) return "md"
  if (value.length <= 50) return "sm"
  return "xs"
}

// Fixed time zone so the server render and the browser agree on the date.
const issuedFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  month: "long",
  day: "numeric",
  year: "numeric",
})

export function issuedOnLabel(issuedAt: string | null) {
  return issuedAt ? `Issued on ${issuedFormat.format(new Date(issuedAt))}` : "Issued this term"
}
