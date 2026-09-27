import {
  Archive,
  CalendarRange,
  ClipboardList,
  Send,
  Users,
  WalletCards,
} from "lucide-react"

export type HrRole = "hr" | "admin" | "finance"

export type HrNavigationItem = {
  label: string
  href: string
  icon: typeof Archive
  active: (pathname: string, source: string | null) => boolean
}

export type HrNavigationSection = {
  label: string
  visible: (role: HrRole) => boolean
  items: HrNavigationItem[]
}

function isApplicationDetailPath(pathname: string) {
  const match = new RegExp("^/admin/hr/([^/]+)$").exec(pathname)
  return Boolean(
    match &&
      !["season", "results", "archive", "payments", "committees"].includes(
        match[1],
      ),
  )
}

export const hrNavigationSections: HrNavigationSection[] = [
  {
    label: "Recruitment",
    visible: (role) => role !== "finance",
    items: [
      {
        label: "Applications",
        href: "/admin/hr",
        icon: ClipboardList,
        active: (path, source) =>
          path === "/admin/hr" ||
          (isApplicationDetailPath(path) && source !== "archive"),
      },
      {
        label: "Results",
        href: "/admin/hr/results",
        icon: Send,
        active: (path) => path.startsWith("/admin/hr/results"),
      },
      {
        label: "Committees",
        href: "/admin/hr/committees",
        icon: Users,
        active: (path) => path.startsWith("/admin/hr/committees"),
      },
      {
        label: "Recruitment setup",
        href: "/admin/hr/season",
        icon: CalendarRange,
        active: (path) => path.startsWith("/admin/hr/season"),
      },
      {
        label: "Archive",
        href: "/admin/hr/archive",
        icon: Archive,
        active: (path, source) =>
          path.startsWith("/admin/hr/archive") ||
          (source === "archive" && isApplicationDetailPath(path)),
      },
    ],
  },
  {
    label: "Membership",
    visible: () => true,
    items: [
      {
        label: "Payments",
        href: "/admin/hr/payments",
        icon: WalletCards,
        active: (path) => path.startsWith("/admin/hr/payments"),
      },
    ],
  },
]

export function hrWorkspaceTitle(role: HrRole) {
  if (role === "finance") return "Finance Dashboard"
  if (role === "admin") return "Admin Dashboard"
  return "HR Dashboard"
}
