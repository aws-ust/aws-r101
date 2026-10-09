import { domToBlob } from "modern-screenshot"

export type IdCardExportSide = "front" | "back" | "both"

export function idCardFileName(memberId: string, side: IdCardExportSide) {
  return `${memberId}-${side === "both" ? "front-and-back" : side}.png`
}

/**
 * The member photo is a signed S3 URL on another origin. Inlining it as a data
 * URL lets the capture read its pixels. `no-store` skips the copy the card
 * already loaded without CORS headers. Returns null when it cannot be read.
 */
export async function photoAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/** Waits for fonts and images inside `node`, then renders it to a PNG at 2x. */
export async function captureIdCard(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready
  const images = Array.from(node.querySelectorAll("img"))
  await Promise.all(images.map((image) => image.decode().catch(() => undefined)))
  const blob = await domToBlob(node, { scale: 2, type: "image/png" })
  if (!blob) throw new Error("The card could not be drawn.")
  return blob
}
