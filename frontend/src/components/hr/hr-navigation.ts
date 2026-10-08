import {
  Archive,
  CalendarRange,
  ClipboardList,
  IdCard,
  LayoutDashboard,
  MessagesSquare,
  Send,
  Users,
  WalletCards,
} from "lucide-react"

export type HrRole = "hr" | "admin"

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
      ![
        "season",
        "results",
        "archive",
        "payments",
        "membership",
        "committees",
        "groups",
        "members",
        "overview",
      ].includes(match[1]),
  )
}

export const hrNavigationSections: HrNavigationSection[] = [
  {
    label: "Season",
    visible: () => true,
    items: [
      {
        label: "Overview",
        href: "/admin/hr/overview",
        icon: LayoutDashboard,
        active: (path) => path.startsWith("/admin/hr/overview"),
      },
    ],
  },
  {
    label: "People",
    visible: () => true,
    items: [
      {
        label: "Members",
        href: "/admin/hr/members",
        icon: IdCard,
        active: (path) => path.startsWith("/admin/hr/members"),
      },
    ],
  },
  {
    label: "Recruitment",
    visible: () => true,
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
        label: "Recruitment Setup",
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
        // Verification merged into Payments; the old address redirects here.
        active: (path) => path === "/admin/hr/payments" || path.startsWith("/admin/hr/membership"),
      },
      {
        label: "Community Links",
        href: "/admin/hr/groups",
        icon: MessagesSquare,
        active: (path) => path.startsWith("/admin/hr/groups"),
      },
    ],
  },
]

export function hrWorkspaceTitle(role: HrRole) {
  if (role === "admin") return "Admin Dashboard"
  return "HR Dashboard"
}
