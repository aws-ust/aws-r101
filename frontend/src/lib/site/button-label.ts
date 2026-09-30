/** Title-style button copy — see DESIGN.md (Button labels). */
export function formatButtonLabel(label: string): string {
  if (!label.trim()) return label
  return label.replace(/\b([a-z])/g, (char) => char.toUpperCase())
}

/** Same title-case rule as buttons — stat cards, section subheads, sidebar groups. */
export const formatSubheaderLabel = formatButtonLabel
