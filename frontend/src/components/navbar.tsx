"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Hamburger from "hamburger-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "People", href: "/people" },
  { label: "Careers", href: "/careers" },
  { label: "Events", href: "/events" },
  { label: "Shop", href: "/shop" },
]

const barClasses = "glass border-b border-blue-chalk/15 bg-haiti/20"
const barInnerClasses =
  "mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-2.5"
const desktopLinksClasses =
  "hidden items-center gap-1 rounded-pill font-mono text-sm text-prelude md:flex"
const navLinkClasses =
  "rounded-pill px-3 py-1.5 transition-colors hover:text-blue-chalk"
const activeNavLinkClasses = "bg-aquamarine text-haiti hover:text-haiti"
const mobilePanelClasses = "glass bg-haiti/20 md:hidden"
const mobilePanelInnerClasses =
  "mx-auto flex max-w-[1180px] flex-col gap-1 px-4 py-4 font-mono text-sm text-prelude"
const mobileNavLinkClasses =
  "rounded-pill px-3 py-2 transition-colors hover:bg-biloba-flower/15 hover:text-blue-chalk"

export function Navbar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 flex flex-col gap-2">
      <nav aria-label="Primary" className={barClasses}>
        <div className={barInnerClasses}>
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Image src="/aws-logo.png" alt="AWS Builders – UST" width={117} height={66} className="h-8 w-auto" />
            <span className="hidden sm:inline">AWS Builders – UST</span>
          </Link>

          <div className={desktopLinksClasses}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  navLinkClasses,
                  pathname === item.href && activeNavLinkClasses
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:block">
            <Button color="cyan">Apply now!</Button>
          </div>

          <div className="md:hidden">
            <Hamburger
              toggled={open}
              toggle={setOpen}
              size={20}
              color="#F3EEFF"
              rounded
              label="Show menu"
            />
          </div>
        </div>
      </nav>

      {open && (
        <div className={mobilePanelClasses}>
          <div className={mobilePanelInnerClasses}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  mobileNavLinkClasses,
                  pathname === item.href && activeNavLinkClasses
                )}
              >
                {item.label}
              </Link>
            ))}
            <Button color="cyan" className="mt-2 w-full" onClick={() => setOpen(false)}>
              Apply now!
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
