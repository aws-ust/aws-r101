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
      const activationLine = navigationOffset + 120
      let nextActiveId = sectionIds[0] ?? null
      let bestTop = Number.NEGATIVE_INFINITY

      for (const id of sectionIds) {
        const section = document.getElementById(id)
        if (!section) continue
        const top = section.getBoundingClientRect().top
        if (top <= activationLine && top > bestTop) {
          bestTop = top
          nextActiveId = id
        }
      }

      const atPageEnd =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2

      if (atPageEnd) {
        for (let index = sectionIds.length - 1; index >= 0; index -= 1) {
          const id = sectionIds[index]
          if (document.getElementById(id)) {
            nextActiveId = id
            break
          }
        }
      }

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
