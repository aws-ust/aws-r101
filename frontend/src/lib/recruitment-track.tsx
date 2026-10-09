"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { RecruitmentTrack } from "@/lib/types/track"

const RecruitmentTrackContext = createContext<RecruitmentTrack>("r101")

/**
 * Tells everything below which round it works in, so the application list, the
 * interview grid and the results page can serve R101 or the officer hunt
 * without each one taking a prop.
 */
export function RecruitmentTrackProvider({
  track,
  children,
}: {
  track: RecruitmentTrack
  children: ReactNode
}) {
  return <RecruitmentTrackContext value={track}>{children}</RecruitmentTrackContext>
}

export function useRecruitmentTrack(): RecruitmentTrack {
  return useContext(RecruitmentTrackContext)
}
