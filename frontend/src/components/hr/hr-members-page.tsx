"use client"

import { useEffect, useMemo, useState } from "react"
import { ApplicationPagination } from "@/components/hr/application-pagination"
import { pageCount, pageSlice } from "@/components/hr/application-pagination-utils"
import { HrMemberList } from "@/components/hr/hr-member-list"
import { SectionHeader } from "@/components/shared/section-header"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getDirectoryMembers, type DirectoryMember } from "@/lib/api/payments"
import {
  buildMemberEntries,
  countByFilter,
  FILTER_LABELS,
  filterMemberEntries,
  type MemberFilter,
} from "@/lib/members/directory"
import { fieldControlClasses, hrFilterSelectClasses, hrPageShellClasses } from "@/lib/site/surface"
import { cn } from "@/lib/utils"

const toolbarClasses = "mt-8 grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]"
const searchClasses = cn(fieldControlClasses, "border border-blue-chalk/20")
const filterSelectClasses = cn(hrFilterSelectClasses, "w-full")
const listClasses = "mt-6"
const statusClasses = "mt-8 font-sans text-sm text-prelude"
const errorClasses = "mt-8 font-sans text-sm text-rose-glow"
const FILTER_ORDER: MemberFilter[] = ["all", "eb", "ea", "director", "staff", "general"]

export function HrMembersPage() {
  const [verified, setVerified] = useState<DirectoryMember[] | null>(null)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<MemberFilter>("all")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    getDirectoryMembers()
      .then((result) => {
        if (!cancelled) setVerified(result.members)
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load the members.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const entries = useMemo(() => buildMemberEntries(verified ?? []), [verified])
  const counts = useMemo(() => countByFilter(entries), [entries])
  const visible = useMemo(() => filterMemberEntries(entries, filter, query), [entries, filter, query])
  const safePage = Math.min(page, pageCount(visible.length))

  return (
    <main className={hrPageShellClasses}>
      <SectionHeader eyebrow="// MEMBERSHIP" title="Members" />
      {error ? (
        <p className={errorClasses} role="alert">
          {error}
        </p>
      ) : verified === null ? (
        <p className={statusClasses}>Loading members…</p>
      ) : (
        <>
          <div className={toolbarClasses}>
            <Input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Search by name, position, member ID or student number"
              aria-label="Search members"
              className={searchClasses}
            />
            <Select
              value={filter}
              onValueChange={(next) => {
                setFilter(next as MemberFilter)
                setPage(1)
              }}
            >
              <SelectTrigger className={filterSelectClasses} aria-label="Filter by role">
                <SelectValue placeholder="Everyone">
                  {FILTER_LABELS[filter]} ({counts[filter]})
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FILTER_ORDER.map((option) => (
                  <SelectItem key={option} value={option}>
                    {FILTER_LABELS[option]} ({counts[option]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={listClasses}>
            <HrMemberList entries={pageSlice(visible, safePage)} />
          </div>
          <ApplicationPagination total={visible.length} page={safePage} onPageChange={setPage} noun="members" />
        </>
      )}
    </main>
  )
}
