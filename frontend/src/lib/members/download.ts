/** Saves text as a CSV file in the browser, with a BOM so Excel reads UTF-8 names correctly. */
export function downloadCsv(fileName: string, csv: string) {
  downloadBlob(fileName, new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }))
}

/** Hands a file to the browser's download flow. */
export function downloadBlob(fileName: string, blob: Blob) {
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
