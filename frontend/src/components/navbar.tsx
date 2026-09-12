"use client"

import { useState, type MouseEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DesktopNavLinks, type DesktopNavItem } from "@/components/desktop-nav-links"
import { useSectionSpy } from "@/hooks/use-section-spy"
import { logoutApplicant } from "@/lib/applicant-api"
import { scrollToSection } from "@/lib/scroll-to-section"
import { SITE_NAV_ITEMS } from "@/lib/site-nav"
import { chromeBarClasses, chromeInsetClasses } from "@/lib/surface"
import { cn } from "@/lib/utils"

const NAV_ITEMS = SITE_NAV_ITEMS
const HOME_SECTION_IDS = NAV_ITEMS.flatMap((item) =>
  item.path === "/" && "sectionId" in item ? [item.sectionId] : []
)

const headerClasses = "fixed inset-x-0 top-0 z-50"
const barInnerClasses =
  `mx-auto flex max-w-[1180px] items-center justify-between gap-4 py-2.5 ${chromeInsetClasses}`
const mobileOverlayClasses =
  "fixed inset-0 z-40 transition-[opacity,visibility] duration-300 md:hidden"
const mobileOverlayOpenClasses = "visible pointer-events-auto opacity-100"
const mobileOverlayClosedClasses = "invisible pointer-events-none opacity-0"
const mobileBackdropClasses = "absolute inset-0 glass bg-haiti/80"
const mobilePanelInnerClasses =
  "relative mx-auto flex h-full max-w-[1180px] flex-col items-center justify-center gap-3 px-4 font-mono text-2xl text-prelude"
const mobileCloseButtonClasses =
  "absolute top-4 right-4 inline-flex size-10 cursor-pointer items-center justify-center rounded-pill text-blue-chalk transition-colors hover:bg-biloba-flower/15 hover:text-aquamarine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aquamarine"
const mobileNavLinkClasses =
  "rounded-pill px-5 py-2 transition-colors hover:bg-biloba-flower/15 hover:text-blue-chalk"
const activeNavLinkClasses = "bg-aquamarine text-haiti hover:text-haiti"
const logoLinkClasses = "flex items-center gap-2 font-bold"

export function Navbar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const activeSectionId = useSectionSpy(pathname, HOME_SECTION_IDS)
  const activeHref =
    pathname === "/"
      ? NAV_ITEMS.find((item) => "sectionId" in item && item.sectionId === activeSectionId)?.href ?? "/"
      : NAV_ITEMS.find((item) => item.path === pathname)?.href ?? ""
  const isApplicantSignedIn = pathname.startsWith("/apply/dashboard")

  if (pathname.startsWith("/admin") || pathname === "/login") return null

  function navigateToSection(
    event: MouseEvent<HTMLAnchorElement>,
    item: DesktopNavItem
  ) {
    if (pathname !== item.path || !item.sectionId) return
    event.preventDefault()
    scrollToSection(item.sectionId)
    window.history.replaceState(null, "", item.href)
  }

  async function onApplicantSignOut() {
    await logoutApplicant()
    router.replace("/apply/status")
  }

  return (
    <header className={headerClasses}>
      <nav aria-label="Primary" className={chromeBarClasses}>
        <div className={barInnerClasses}>
          <Link
            href="/"
            className={logoLinkClasses}
            onClick={(event) => navigateToSection(event, NAV_ITEMS[0])}
          >
            <Image src="/aws-logo.png" alt="AWS Builders – UST" width={117} height={66} className="h-8 w-auto" />
            <span className="hidden sm:inline">AWS Builders – UST</span>
          </Link>

          {isApplicantSignedIn ? null : (
            <DesktopNavLinks
              items={NAV_ITEMS}
              activeHref={activeHref}
              onNavigate={navigateToSection}
            />
          )}

          <div className={cn(isApplicantSignedIn ? "flex" : "hidden md:block")}>
            {isApplicantSignedIn ? (
              <Button type="button" color="purple" onClick={() => void onApplicantSignOut()}>
                Sign out
              </Button>
            ) : (
              <Button color="cyan" nativeButton={false} render={<Link href="/apply/positions" />}>
                Apply now!
              </Button>
            )}
          </div>

          {isApplicantSignedIn ? null : (
            <div className="md:hidden">
              <button
                type="button"
                aria-label="Show menu"
                aria-expanded={open}
                className="inline-flex size-10 items-center justify-center rounded-pill text-blue-chalk hover:bg-biloba-flower/15"
                onClick={() => setOpen((current) => !current)}
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          )}
        </div>
      </nav>

      <div
        className={cn(
          mobileOverlayClasses,
          open && !isApplicantSignedIn ? mobileOverlayOpenClasses : mobileOverlayClosedClasses,
        )}
      >
        <button type="button" className={mobileBackdropClasses} aria-label="Close menu" onClick={() => setOpen(false)} />
        <div className={mobilePanelInnerClasses}>
          <button type="button" className={mobileCloseButtonClasses} aria-label="Close menu" onClick={() => setOpen(false)}>
            <X aria-hidden="true" className="size-6" />
          </button>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(event) => {
                navigateToSection(event, item)
                setOpen(false)
              }}
              className={cn(mobileNavLinkClasses, activeHref === item.href && activeNavLinkClasses)}
            >
              {item.label}
            </Link>
          ))}
          <Button
            color="cyan"
            className="mt-2"
            nativeButton={false}
            render={<Link href="/apply/positions" onClick={() => setOpen(false)} />}
          >
            Apply now!
          </Button>
        </div>
      </div>
    </header>
  )
}
