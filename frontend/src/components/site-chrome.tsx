"use client"

import { usePathname } from "next/navigation"
import { ApplyAdminChrome } from "@/components/apply-admin-chrome"
import { useChromeVisibility } from "@/components/chrome-visibility"
import { Navbar } from "@/components/navbar"

function isSlimPath(pathname: string) {
  return pathname.startsWith("/apply") || pathname.startsWith("/admin")
}

export function SiteChrome() {
  const pathname = usePathname()
  const { hideChrome } = useChromeVisibility()

  if (hideChrome) return null

  return isSlimPath(pathname) ? <ApplyAdminChrome /> : <Navbar />
}
