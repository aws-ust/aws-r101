/** Title-style button copy — see DESIGN.md (Button labels). */
export function formatButtonLabel(label: string): string {
  if (!label.trim()) return label
  return label.replace(/\b([a-z])/g, (char) => char.toUpperCase())
}
