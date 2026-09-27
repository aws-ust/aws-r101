"use client"

import { useEffect, useMemo, useState } from "react"
import { ActionFeedback } from "@/components/shared/action-feedback"
import { Button } from "@/components/ui/button"
import {
  listPositionApprovalTargets,
  patchApplicationRedirectPlacement,
  patchApplicationRedirectResponse,
  type PositionApprovalTarget,
} from "@/lib/api"
import type { HrApplication } from "@/lib/types/hr-application"
import { comparePositionHierarchy } from "@/lib/apply/committee-groups"

const panelClasses =
  "mt-8 min-w-0 overflow-x-clip rounded-[22px] border border-biloba-flower/30 bg-haiti/55 px-4 py-5 sm:px-5"
const headerClasses = "font-sans text-lg font-semibold text-blue-chalk"
const helpClasses = "mt-1 font-sans text-sm leading-relaxed text-pretty text-prelude"
const fieldClasses = "mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end"
const selectClasses =
  "h-10 min-w-0 flex-1 rounded-[14px] border border-blue-chalk/20 bg-meteorite/50 px-3 font-sans text-sm text-blue-chalk"
const actionsClasses = "mt-4 flex flex-wrap gap-2"
const tagClasses =
  "inline-flex w-fit items-center rounded-pill bg-daisy-bush/70 px-3 py-0.5 font-mono text-[11px] text-blue-chalk"

type Props = {
  application: HrApplication
  onUpdated: (application: HrApplication) => void
}

export function redirectPlacementLabel(application: HrApplication): string | null {
  if (!application.redirectPlacement) return null
  if (!application.resultsReleasedAt) return "Redirect configured"
  if (!application.redirectResponse) return "Redirected"
  if (application.redirectResponse === "accepted") return "Accepted redirect"
  return "Declined — member"
}

export function HrRedirectPlacementPanel({ application, onUpdated }: Props) {
  const [positions, setPositions] = useState<PositionApprovalTarget[]>([])
  const [selectedId, setSelectedId] = useState(
    application.redirectPlacement?.positionId ?? "",
  )
  const [pending, setPending] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  useEffect(() => {
    setSelectedId(application.redirectPlacement?.positionId ?? "")
  }, [application.redirectPlacement?.positionId])

  useEffect(() => {
    let cancelled = false
    void listPositionApprovalTargets()
      .then((rows) => {
        if (!cancelled) setPositions(rows)
      })
      .catch(() => {
        if (!cancelled) {
          setFeedback({
            type: "error",
            message: "Could not load positions for redirect placement.",
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sortedPositions = useMemo(
    () =>
      [...positions].sort((a, b) =>
        comparePositionHierarchy(
          { committee: a.committee, title: a.title },
          { committee: b.committee, title: b.title },
        ),
      ),
    [positions],
  )

  const tag = redirectPlacementLabel(application)
  const canEditPlacement = !application.redirectResponse
  const canRecordResponse =
    Boolean(application.redirectPlacement) &&
    Boolean(application.resultsReleasedAt) &&
    !application.redirectResponse

  async function savePlacement(clear: boolean) {
    setPending("placement")
    setFeedback(null)
    try {
      onUpdated(
        await patchApplicationRedirectPlacement(
          application.id,
          clear ? null : selectedId || null,
        ),
      )
      setFeedback({
        type: "success",
        message: clear ? "Redirect placement cleared." : "Redirect placement saved.",
      })
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Could not save redirect placement.",
      })
    } finally {
      setPending(null)
    }
  }

  async function recordResponse(response: "accepted" | "declined") {
    setPending(response)
    setFeedback(null)
    try {
      onUpdated(await patchApplicationRedirectResponse(application.id, response))
      setFeedback({
        type: "success",
        message:
          response === "accepted"
            ? "Recorded acceptance of the redirected role."
            : "Recorded decline — applicant continues as a general member.",
      })
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Could not record the redirect response.",
      })
    } finally {
      setPending(null)
    }
  }

  return (
    <section className={panelClasses} aria-labelledby="redirect-placement-title">
      <div className="flex flex-wrap items-center gap-3">
        <h3 id="redirect-placement-title" className={headerClasses}>
          Redirected placement
        </h3>
        {tag ? <span className={tagClasses}>{tag}</span> : null}
      </div>
      <p className={helpClasses}>
        Offer a committee position outside the applicant&apos;s choices. Results release
        sends the redirected-placement email. Record their email reply here when it
        arrives.
      </p>
      {feedback ? (
        <div className="mt-4">
          <ActionFeedback type={feedback.type} message={feedback.message} />
        </div>
      ) : null}
      {canEditPlacement ? (
        <div className={fieldClasses}>
          <label className="min-w-0 flex-1 font-sans text-sm text-prelude">
            Destination position
            <select
              className={`${selectClasses} mt-1.5 w-full`}
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              disabled={Boolean(pending)}
            >
              <option value="">Not redirected</option>
              {sortedPositions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.committee} — {position.title}
                </option>
              ))}
            </select>
          </label>
          <Button
            color="cyan"
            className="h-10 shrink-0 rounded-pill px-4 font-mono text-xs"
            disabled={Boolean(pending) || !selectedId}
            onClick={() => void savePlacement(false)}
          >
            Save redirect
          </Button>
          {application.redirectPlacement ? (
            <Button
              color="purple"
              className="h-10 shrink-0 rounded-pill px-4 font-mono text-xs"
              disabled={Boolean(pending)}
              onClick={() => void savePlacement(true)}
            >
              Clear
            </Button>
          ) : null}
        </div>
      ) : application.redirectPlacement ? (
        <p className="mt-4 font-sans text-sm text-blue-chalk">
          {application.redirectPlacement.committee} —{" "}
          {application.redirectPlacement.title}
        </p>
      ) : null}
      {canRecordResponse ? (
        <div className={actionsClasses}>
          <Button
            color="cyan"
            className="h-9 rounded-pill px-4 font-mono text-xs"
            disabled={Boolean(pending)}
            onClick={() => void recordResponse("accepted")}
          >
            Record accepted redirect
          </Button>
          <Button
            color="purple"
            className="h-9 rounded-pill px-4 font-mono text-xs"
            disabled={Boolean(pending)}
            onClick={() => void recordResponse("declined")}
          >
            Record declined — member
          </Button>
        </div>
      ) : null}
    </section>
  )
}
