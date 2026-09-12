"use client"

import { useEffect, useState } from "react"

/** Fixed nav height + breathing room. */
const NAV_OFFSET_PX = 120

function activeSectionFromScroll(sectionIds: readonly string[]): string | null {
  if (sectionIds.length === 0) return null

  const scrollAnchor = window.scrollY + NAV_OFFSET_PX
  const viewportHeight = window.innerHeight

  let current = sectionIds[0]
  for (const id of sectionIds) {
    const section = document.getElementById(id)
    if (!section) continue

    const { top, bottom } = section.getBoundingClientRect()
    const reachedByScroll = section.offsetTop <= scrollAnchor
    const enteredViewport = top < viewportHeight && bottom > NAV_OFFSET_PX

    if (reachedByScroll || enteredViewport) {
      current = id
    }
  }
  return current
}

export function useSectionSpy(pathname: string, sectionIds: readonly string[]) {
  const [activeId, setActiveId] = useState<string | null>(
    sectionIds[0] ?? null,
  )

  useEffect(() => {
    if (pathname !== "/") {
      return
    }

    function updateActive() {
      setActiveId(activeSectionFromScroll(sectionIds))
    }

    updateActive()
    window.addEventListener("scroll", updateActive, { passive: true })
    window.addEventListener("resize", updateActive)
    return () => {
      window.removeEventListener("scroll", updateActive)
      window.removeEventListener("resize", updateActive)
    }
  }, [pathname, sectionIds])

  return pathname === "/" ? activeId : null
}
