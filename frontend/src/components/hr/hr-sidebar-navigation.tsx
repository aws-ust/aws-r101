"use client"

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

const groupLabelClasses =
  "mb-2.5 px-3 font-mono text-[10px] tracking-[0.16em] text-biloba-flower group-data-[collapsible=icon]:mb-0 group-data-[collapsible=icon]:sr-only"
const navigationWrapperClasses = "flex w-full flex-col"
const recruitmentGroupClasses =
  "pb-4 group-data-[collapsible=icon]:pb-3"
const membershipGroupClasses =
  "border-t border-blue-chalk/15 pt-4 group-data-[collapsible=icon]:pt-3"
const menuClasses = "w-full gap-1.5 group-data-[collapsible=icon]:items-center"
const itemClasses =
  "w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
const buttonClasses =
  "h-10 w-full justify-start gap-3 rounded-pill border border-transparent px-3 text-left text-sm font-medium text-prelude transition-[background-color,border-color,color,box-shadow] duration-200 ease-out hover:border-biloba-flower/35 hover:bg-meteorite/55 hover:text-blue-chalk hover:shadow-[0_0_18px_rgba(183,140,240,0.22)] hover:[&_svg]:text-aquamarine group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-0 motion-reduce:transition-none"
const activeButtonClasses =
  "border-biloba-flower/40 bg-daisy-bush/55 text-blue-chalk shadow-[0_0_16px_rgba(183,140,240,0.18)] [&_svg]:text-aquamarine"
const labelClasses = "truncate text-left group-data-[collapsible=icon]:hidden"
const tooltipClasses =
  "glass rounded-pill border border-biloba-flower/40 bg-haiti/90 px-3 py-1.5 font-sans text-sm text-blue-chalk shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] [&_.cn-tooltip-arrow]:hidden"

function sectionGroupClasses(label: string) {
  if (label === "Recruitment") return recruitmentGroupClasses
  if (label === "Membership") return membershipGroupClasses
  return undefined
}

export function HrSidebarNavigation({ role }: { role: HrRole }) {
  const pathname = usePathname()
  const source = useSearchParams().get("source")
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <div className={navigationWrapperClasses}>
      {hrNavigationSections
        .filter((section) => section.visible(role))
        .map((section) => (
          <SidebarGroup
            key={section.label}
            className={sectionGroupClasses(section.label)}
          >
            <SidebarGroupLabel className={groupLabelClasses}>
              {formatSubheaderLabel(section.label)}
            </SidebarGroupLabel>
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
    </div>
  )
}
