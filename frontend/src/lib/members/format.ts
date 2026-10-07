import { formatDisplayDate } from "@/lib/datetime/display"

/** "Oct 6" in the organisation's time zone. */
export function shortDate(iso: string) {
  return formatDisplayDate(new Date(iso), { month: "short", day: "numeric" })
}

export const MEMBERS_PAGE_SIZE = 25
