import { requestSectionReveal } from "@/lib/reveal-section-event"

function scrollBehavior() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "instant"
    : "smooth"
}

function scrollToElement(id: string) {
  const target = document.getElementById(id)
  if (!target) return false
  target.scrollIntoView({ behavior: scrollBehavior(), block: "start" })
  return true
}

export function scrollToSection(id: string) {
  requestSectionReveal(id)

  if (scrollToElement(id)) return

  window.requestAnimationFrame(() => {
    if (scrollToElement(id)) return
    window.setTimeout(() => {
      if (!scrollToElement(id)) {
        window.scrollTo({ top: 0, behavior: scrollBehavior() })
      }
    }, 120)
  })
}
