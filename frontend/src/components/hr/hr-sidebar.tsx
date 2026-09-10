"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { CalendarRange, ClipboardList, LogOut } from "lucide-react"

import { logout } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const brandClasses = "font-sans text-sm font-semibold text-blue-chalk"
const eyebrowClasses =
  "font-mono text-[10px] uppercase tracking-widest text-prelude/80"
const groupLabelClasses =
  "font-mono text-[11px] tracking-wide text-prelude/70"
const navButtonIdleClasses =
  "h-10 gap-3 rounded-[14px] border border-transparent px-3 text-sm font-medium text-prelude transition-colors hover:bg-meteorite/45 hover:text-blue-chalk"
const navButtonActiveClasses =
  "border-biloba-flower/40 bg-daisy-bush/55 text-blue-chalk"
const activeBarClasses =
  "pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-full bg-aquamarine opacity-0 transition-opacity group-data-[active=true]/menu-item:opacity-100"
const logoutButtonClasses =
  "flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-medium text-prelude transition-colors hover:bg-meteorite/45 hover:text-blue-chalk"

function isApplicationsActive(pathname: string) {
  if (pathname === "/admin/hr") return true
  const match = /^\/admin\/hr\/([^/]+)$/.exec(pathname)
  if (!match) return false
  return match[1] !== "season"
}

const navItems = [
  {
    label: "Applications",
    href: "/admin/hr",
    icon: ClipboardList,
    isActive: isApplicationsActive,
  },
  {
    label: "Season",
    href: "/admin/hr/season",
    icon: CalendarRange,
    isActive: (pathname: string) => pathname.startsWith("/admin/hr/season"),
  },
] as const

export function HrSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function onLogout() {
    await logout()
    router.replace("/login")
  }

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="gap-2 p-4 pb-3">
        <Link href="/" className={brandClasses}>
          AWS Builders - UST
        </Link>
        <p className={eyebrowClasses}>{"// HR"}</p>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className={groupLabelClasses}>
            $ hr
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const active = item.isActive(pathname)
                const Icon = item.icon
                return (
                  <SidebarMenuItem
                    key={item.href}
                    className="group/menu-item"
                    data-active={active ? "true" : undefined}
                  >
                    <span className={activeBarClasses} aria-hidden />
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      className={cn(
                        navButtonIdleClasses,
                        active && navButtonActiveClasses
                      )}
                      render={
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                        />
                      }
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 pb-8">
        <button
          type="button"
          className={logoutButtonClasses}
          onClick={() => void onLogout()}
        >
          <LogOut className="size-4 shrink-0" />
          Logout
        </button>
      </SidebarFooter>
    </Sidebar>
  )
}
