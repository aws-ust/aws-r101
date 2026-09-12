"use client"

import { useEffect, useState } from "react"

export function useSectionSpy(pathname: string, sectionIds: readonly string[]) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (pathname !== "/") {
      return
    }

    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        setActiveId(sectionIds.find((id) => visible.has(id)) ?? null)
      },
      { rootMargin: "-80px 0px -55% 0px" }
    )

    for (const id of sectionIds) {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    }

    return () => observer.disconnect()
  }, [pathname, sectionIds])

  return pathname === "/" ? activeId : null
}
