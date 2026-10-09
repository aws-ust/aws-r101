"use client"

import { useCallback, useEffect, useState } from "react"
import {
  getOfficerHuntSettings,
  type OfficerHuntSettings,
} from "@/lib/api/officer-hunt"
import {
  interviewSeasonBoundsFromPayload,
  type InterviewSeasonBounds,
} from "@/lib/season/interview"

/** The officer hunt's saved setup, with the interview dates in the shape the interview grid reads. */
export function useOfficerHuntSettings() {
  const [settings, setSettings] = useState<OfficerHuntSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    getOfficerHuntSettings()
      .then((payload) => {
        if (cancelled) return
        setSettings(payload)
        setError("")
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Could not load the officer hunt setup.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const bounds: InterviewSeasonBounds = settings
    ? interviewSeasonBoundsFromPayload({
        startsAt: settings.interviewsStartAt,
        endsAt: settings.interviewsEndAt,
      })
    : null
  const apply = useCallback((saved: OfficerHuntSettings) => setSettings(saved), [])

  return { settings, bounds, loading, error, configured: bounds !== null, apply }
}
