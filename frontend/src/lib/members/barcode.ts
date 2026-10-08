import { CODE128 } from "jsbarcode/bin/barcodes/CODE128"

export type BarcodeBar = { x: number; width: number }

/**
 * Code 128 bars for a member ID, as runs of dark modules. `modules` is the
 * total width in modules, so an SVG viewBox of `0 0 modules 1` fits it.
 */
export function code128Bars(text: string): { bars: BarcodeBar[]; modules: number } {
  const encoder = new CODE128(text, {})
  if (!encoder.valid()) return { bars: [], modules: 0 }

  const { data } = encoder.encode()
  const bars: BarcodeBar[] = []
  for (let index = 0; index < data.length; index += 1) {
    if (data[index] !== "1") continue
    const last = bars.at(-1)
    if (last && last.x + last.width === index) last.width += 1
    else bars.push({ x: index, width: 1 })
  }
  return { bars, modules: data.length }
}
