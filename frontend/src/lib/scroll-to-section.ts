export function scrollToSection(id: string) {
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "instant"
    : "smooth"
  const target = document.getElementById(id)

  if (!target) {
    window.scrollTo({ top: 0, behavior })
    return
  }

  target.scrollIntoView({ behavior, block: "start" })
}
