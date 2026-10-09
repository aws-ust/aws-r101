"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  hrNavigationSections,
  type HrRole,
} from "@/components/hr/hr-navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { formatSubheaderLabel } from "@/lib/site/button-label"

// Group names are 10px mono (the one place that size is kept); calm prelude
// instead of violet, so the labels sort the list without competing with it.
const groupLabelClasses =
  "mb-1.5 h-auto px-3 font-mono text-[10px] tracking-[0.16em] text-prelude/70 group-data-[collapsible=icon]:mb-0 group-data-[collapsible=icon]:sr-only"
// Every group below the first is set off by a hairline, expanded or collapsed,
// so the grouping reads at a glance. Setup is pushed to the foot.
const navigationWrapperClasses =
  "flex min-h-full w-full flex-col gap-4 group-data-[collapsible=icon]:gap-3"
const groupClasses = "p-0"
const groupDividerClasses =
  "border-t border-blue-chalk/15 pt-4 group-data-[collapsible=icon]:pt-3"
const endGroupClasses = "mt-auto"
const menuClasses = "w-full gap-0.5 group-data-[collapsible=icon]:items-center"
const itemClasses =
  "w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
const buttonClasses =
  "h-9 w-full justify-start gap-3 rounded-pill border border-transparent px-3 text-left text-sm font-medium text-prelude transition-[background-color,border-color,color] duration-200 ease-out hover:bg-blue-chalk/8 hover:text-blue-chalk focus-visible:ring-2 focus-visible:ring-aquamarine/60 pointer-coarse:h-11 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-0 motion-reduce:transition-none"
// The current page is the one lit thing: a filled pill and an aquamarine icon.
const activeButtonClasses =
  "border-biloba-flower/40 bg-daisy-bush/55 text-blue-chalk hover:bg-daisy-bush/55 [&_svg]:text-aquamarine"
const labelClasses = "truncate text-left group-data-[collapsible=icon]:hidden"
const tooltipClasses =
  "glass rounded-pill border border-biloba-flower/40 bg-haiti/90 px-3 py-1.5 font-sans text-sm text-blue-chalk shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] [&_.cn-tooltip-arrow]:hidden"

export function HrSidebarNavigation({ role }: { role: HrRole }) {
  const pathname = usePathname()
  const source = useSearchParams().get("source")
  const { isMobile, setOpenMobile } = useSidebar()

  // On a short window the list scrolls; keep the current page in view.
  useEffect(() => {
    document.querySelector('[data-sidebar="content"] [aria-current="page"]')?.scrollIntoView({ block: "nearest" })
  }, [pathname])

  return (
    <nav className={navigationWrapperClasses} aria-label="Dashboard">
      {hrNavigationSections
        .filter((section) => section.visible(role))
        .map((section) => (
          <SidebarGroup
            key={section.label ?? "home"}
            className={cn(
              groupClasses,
              section.label && groupDividerClasses,
              section.placement === "end" && endGroupClasses,
            )}
          >
            {section.label ? (
              <SidebarGroupLabel className={groupLabelClasses}>
                {formatSubheaderLabel(section.label)}
              </SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu className={menuClasses}>
                {section.items.map((item) => {
                  const active = item.active(pathname, source)
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.href} className={itemClasses}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={{
                          children: item.label,
                          className: tooltipClasses,
                          side: "right",
                          sideOffset: 10,
                        }}
                        className={cn(buttonClasses, active && activeButtonClasses)}
                        render={
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            onClick={() => {
                              if (isMobile) setOpenMobile(false)
                            }}
                          />
                        }
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className={labelClasses}>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
    </nav>
  )
}
