"use client"

import { useEffect, useState } from "react"
import { PositionsBrowser } from "@/components/positions-browser"
import { listBrowserPositions, peekBrowserPositions } from "@/lib/api-client"
import type { Position } from "@/lib/positions"

const loadingPanelClasses =
  "glass flex min-h-72 items-center justify-center rounded-[28px] border border-blue-chalk/20 bg-haiti/30 px-6"
const loadingTextClasses =
  "font-mono text-xs uppercase tracking-wide text-aquamarine"

export function PositionsPageClient() {
  const cached = peekBrowserPositions()
  const [positions, setPositions] = useState<Position[]>(cached ?? [])
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    let cancelled = false
    listBrowserPositions()
      .then((rows) => {
        if (cancelled) return
        setPositions(rows)
        setLoadError(false)
      })
      .catch(() => {
        if (cancelled) return
        setPositions([])
        setLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading && positions.length === 0) {
    return (
      <div role="status" className={loadingPanelClasses}>
        <p className={loadingTextClasses}>Loading open positions…</p>
      </div>
    )
  }

  return <PositionsBrowser positions={positions} loadError={loadError} />
}
