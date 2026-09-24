"use client"

import { useEffect, useState } from "react"
import { ActionFeedback } from "@/components/shared/action-feedback"
import { HrPositionApprovalTargetRow } from "@/components/hr/hr-position-approval-target-row"
import {
  listPositionApprovalTargets,
  patchPositionApprovalTarget,
  type PositionApprovalTarget,
} from "@/lib/api"
import { glassPanelClasses } from "@/lib/site/surface"

const panelClasses = `${glassPanelClasses} px-5 py-5`
const listClasses = "mt-4 grid gap-3 md:grid-cols-2"
const loadingClasses = "mt-4 font-sans text-sm text-prelude"

export function HrPositionApprovalTargets() {
  const [positions, setPositions] = useState<PositionApprovalTarget[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    let cancelled = false
    listPositionApprovalTargets()
      .then((rows) => {
        if (cancelled) return
        setPositions(rows)
        setDrafts(
          Object.fromEntries(rows.map((row) => [row.id, String(row.openSlots)])),
        )
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load approval targets.",
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function saveTarget(position: PositionApprovalTarget) {
    const openSlots = Number(drafts[position.id])
    setError("")
    setMessage("")
    if (!Number.isInteger(openSlots) || openSlots < 0) {
      setError("Applicants wanted must be a whole number of 0 or more.")
      return
    }
    setPendingId(position.id)
    try {
      const updated = await patchPositionApprovalTarget(position.id, openSlots)
      setPositions((current) =>
        current.map((row) => (row.id === updated.id ? updated : row)),
      )
      setDrafts((current) => ({
        ...current,
        [updated.id]: String(updated.openSlots),
      }))
      setMessage(`${updated.title} target saved.`)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not save approval target.",
      )
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className={panelClasses}>
      <h2 className="font-sans text-lg font-semibold text-blue-chalk">
        Approval Targets
      </h2>
      <p className="mt-1 font-sans text-sm text-prelude">
        Set how many applicants HR plans to approve for each position. These
        targets do not decrease automatically or limit approval decisions.
      </p>
      {loading ? <p className={loadingClasses}>Loading positions…</p> : null}
      {!loading ? (
        <div className={listClasses}>
          {positions.map((position) => (
            <HrPositionApprovalTargetRow
              key={position.id}
              position={position}
              value={drafts[position.id] ?? ""}
              disabled={pendingId !== null}
              pending={pendingId === position.id}
              onChange={(value) =>
                setDrafts((current) => ({ ...current, [position.id]: value }))
              }
              onSave={() => void saveTarget(position)}
            />
          ))}
        </div>
      ) : null}
      {error ? <ActionFeedback type="error" message={error} /> : null}
      {!error && message ? (
        <ActionFeedback type="success" message={message} />
      ) : null}
    </section>
  )
}
