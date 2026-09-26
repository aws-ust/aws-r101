"use client"

import { useEffect, useState } from "react"
import { ActionFeedback } from "@/components/shared/action-feedback"
import { Button } from "@/components/ui/button"
import {
  listCommitteeApplicationStatuses,
  patchCommitteeApplicationStatus,
  type CommitteeApplicationStatus,
} from "@/lib/api"
import {
  compareCommitteeNames,
  groupedOfficesForCommitteeNames,
  isExecutiveOfficeCommittee,
} from "@/lib/apply/committee-groups"
import { glassPanelClasses } from "@/lib/site/surface"
import { cn } from "@/lib/utils"

const panelClasses = `${glassPanelClasses} px-5 py-5`
const officeStackClasses = "mt-4 flex flex-col gap-5"
const officeSectionClasses =
  "rounded-[16px] border border-blue-chalk/15 bg-meteorite/20 p-4 sm:p-5"
const officeHeadingClasses =
  "border-b border-blue-chalk/15 pb-3 font-sans text-sm font-semibold text-blue-chalk"
const listClasses = "mt-4 flex flex-col gap-3"
const tierClasses =
  "font-mono text-[0.65rem] uppercase tracking-wide text-prelude"
const rowClasses =
  "flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-blue-chalk/15 bg-haiti/45 p-4"
const nameClasses = "min-w-0 flex-1 font-sans text-sm font-semibold text-blue-chalk"
const statusClasses =
  "rounded-pill border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wide"
const openStatusClasses = "border-aquamarine/40 bg-aquamarine/10 text-aquamarine"
const closedStatusClasses = "border-rose-blush/45 bg-rose-deep/20 text-rose-glow"
const loadingClasses = "mt-4 font-sans text-sm text-prelude"

export function HrCommitteeApplicationControls() {
  const [committees, setCommittees] = useState<CommitteeApplicationStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    let cancelled = false
    listCommitteeApplicationStatuses()
      .then((rows) => {
        if (!cancelled) {
          setCommittees(
            [...rows].sort((a, b) => compareCommitteeNames(a.name, b.name)),
          )
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load committee availability.",
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

  async function toggleCommittee(committee: CommitteeApplicationStatus) {
    const acceptingApplications = !committee.acceptingApplications
    setPendingId(committee.id)
    setError("")
    setMessage("")
    try {
      const updated = await patchCommitteeApplicationStatus(
        committee.id,
        acceptingApplications,
      )
      setCommittees((current) =>
        current.map((row) => (row.id === updated.id ? updated : row)),
      )
      setMessage(
        acceptingApplications
          ? `${committee.name} is accepting applications again.`
          : `${committee.name} is closed to new applications.`,
      )
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update committee availability.",
      )
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className={panelClasses}>
      <h2 className="font-sans text-lg font-semibold text-blue-chalk">
        Committee Applications
      </h2>
      <p className="mt-1 font-sans text-sm text-prelude">
        Stop or reopen new applications per committee. Existing applications
        and interview bookings are not changed.
      </p>
      {loading ? <p className={loadingClasses}>Loading committees…</p> : null}
      {!loading ? (
        <div className={officeStackClasses}>
          {groupedOfficesForCommitteeNames(committees.map((row) => row.name)).map(
            (group) => (
              <section key={group.office} className={officeSectionClasses}>
                <h3 className={officeHeadingClasses}>{group.office}</h3>
                <div className={listClasses}>
                  {group.committees.map((committeeName) => {
                    const committee = committees.find(
                      (row) => row.name === committeeName,
                    )
                    if (!committee) return null
                    const officeRow = isExecutiveOfficeCommittee(committee.name)
                    return (
                      <div key={committee.id} className={rowClasses}>
                        <div className="min-w-0 flex-1">
                          <p className={tierClasses}>
                            {officeRow ? "Office" : "Committee"}
                          </p>
                          <p className={nameClasses}>{committee.name}</p>
                        </div>
                        <span
                          className={cn(
                            statusClasses,
                            committee.acceptingApplications
                              ? openStatusClasses
                              : closedStatusClasses,
                          )}
                        >
                          {committee.acceptingApplications ? "Open" : "Closed"}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          color={
                            committee.acceptingApplications ? "danger" : "cyan"
                          }
                          disabled={pendingId !== null}
                          onClick={() => void toggleCommittee(committee)}
                        >
                          {pendingId === committee.id
                            ? "Saving…"
                            : committee.acceptingApplications
                              ? "Stop applications"
                              : "Reopen applications"}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </section>
            ),
          )}
        </div>
      ) : null}
      {error ? <ActionFeedback type="error" message={error} /> : null}
      {!error && message ? (
        <ActionFeedback type="success" message={message} />
      ) : null}
    </section>
  )
}
