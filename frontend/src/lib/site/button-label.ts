/** Title-style button copy — see DESIGN.md (Button labels). */
const minorWords = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to"])

export function formatButtonLabel(label: string): string {
  if (!label.trim()) return label
  let first = true
  return label.replace(/\b[A-Za-z][\w'’]*/g, (word) => {
    const isFirst = first
    first = false
    if (!isFirst && minorWords.has(word.toLowerCase())) return word.toLowerCase()
    return word[0].toUpperCase() + word.slice(1)
  })
}

/** Same title-case rule as buttons — stat cards, section subheads, sidebar groups. */
export const formatSubheaderLabel = formatButtonLabel
