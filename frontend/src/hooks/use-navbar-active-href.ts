<<<<<<< HEAD
import { useEffect, useState } from "react"
=======
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
import { useSectionSpy } from "@/hooks/use-section-spy"
import { SITE_NAV_ITEMS } from "@/lib/site-nav"

const NAV_ITEMS = SITE_NAV_ITEMS
const HOME_SECTION_IDS = NAV_ITEMS.flatMap((item) =>
  item.path === "/" && "sectionId" in item ? [item.sectionId] : [],
)

export function useNavbarActiveHref(pathname: string) {
<<<<<<< HEAD
  const [pendingSectionHref, setPendingSectionHref] = useState<string | null>(
    null,
  )
=======
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
  const activeSectionId = useSectionSpy(pathname, HOME_SECTION_IDS)
  const spyActiveHref =
    pathname === "/"
      ? NAV_ITEMS.find((item) => "sectionId" in item && item.sectionId === activeSectionId)?.href ?? "/"
      : NAV_ITEMS.find((item) => item.path === pathname)?.href ?? ""
<<<<<<< HEAD
  const activeHref = pendingSectionHref ?? spyActiveHref

  useEffect(() => {
    if (pendingSectionHref && pendingSectionHref === spyActiveHref) {
      setPendingSectionHref(null)
    }
  }, [pendingSectionHref, spyActiveHref])

  return { activeHref, setPendingSectionHref, navItems: NAV_ITEMS }
=======
  return { activeHref: spyActiveHref, navItems: NAV_ITEMS }
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
}
