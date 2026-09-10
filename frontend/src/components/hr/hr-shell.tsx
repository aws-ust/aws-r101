"use client"

import type { ReactNode } from "react"
import { HrSidebar } from "@/components/hr/hr-sidebar"
import { chromeBarClasses } from "@/lib/surface"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

const insetHeaderClasses = `flex h-14 shrink-0 items-center gap-2 border-b px-4 ${chromeBarClasses}`

export function HrShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <HrSidebar />
        <SidebarInset className="min-h-svh bg-jacarta">
          <header className={insetHeaderClasses}>
            <SidebarTrigger className="text-blue-chalk" />
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
