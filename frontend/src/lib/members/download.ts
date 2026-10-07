/** Saves text as a CSV file in the browser, with a BOM so Excel reads UTF-8 names correctly. */
export function downloadCsv(fileName: string, csv: string) {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function csvFileName(kind: "members" | "not-paid") {
  return `r101-${kind}-${new Date().toISOString().slice(0, 10)}.csv`
}
