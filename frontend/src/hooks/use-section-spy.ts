"use client"

import { useEffect, useState } from "react"

const navigationOffset = 80

export function useSectionSpy(pathname: string, sectionIds: readonly string[]) {
  const [activeId, setActiveId] = useState<string | null>(
    sectionIds[0] ?? null,
  )

  useEffect(() => {
    if (pathname !== "/") {
      return
    }

    let animationFrame: number | null = null

    function updateActiveSection() {
      animationFrame = null
      const nextActiveId = sectionIds.reduce<string | null>((activeId, id) => {
        const section = document.getElementById(id)
        return section && section.getBoundingClientRect().top <= navigationOffset
          ? id
          : activeId
      }, sectionIds[0] ?? null)

      setActiveId((currentActiveId) =>
        currentActiveId === nextActiveId ? currentActiveId : nextActiveId
      )
    }

    function scheduleUpdate() {
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(updateActiveSection)
      }
    }

    scheduleUpdate()
    window.addEventListener("scroll", scheduleUpdate, { passive: true })
    window.addEventListener("resize", scheduleUpdate)

    return () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
      window.removeEventListener("scroll", scheduleUpdate)
      window.removeEventListener("resize", scheduleUpdate)
    }
  }, [pathname, sectionIds])

  return pathname === "/" ? activeId : null
}
