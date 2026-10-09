/** Which recruitment round something belongs to: R101, or the officer hunt for the next board. */
export type RecruitmentTrack = "r101" | "officer_hunt"

/** `?track=officer_hunt`, or nothing for R101, which every endpoint assumes. */
export function trackQuery(track: RecruitmentTrack | undefined): URLSearchParams {
  const query = new URLSearchParams()
  if (track === "officer_hunt") query.set("track", track)
  return query
}

/** Adds the track to a path that may already carry a query string. */
export function withTrack(path: string, track: RecruitmentTrack | undefined): string {
  const query = trackQuery(track).toString()
  if (!query) return path
  return `${path}${path.includes("?") ? "&" : "?"}${query}`
}
