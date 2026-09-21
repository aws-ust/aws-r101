"use client"

import { useState } from "react"
import { SectionHeader } from "@/components/shared/section-header"
import { BoardToggle, type PeopleView } from "@/components/people/board-toggle"
import { PersonCard } from "@/components/people/person-card"
import {
  ADVISERS,
  COMMITTEE_DIRECTORS,
  EXECUTIVE_BOARD,
  type AdviserSeat,
  type DirectorSeat,
} from "@/lib/people"
import { cn } from "@/lib/utils"

const shellClasses = "flex flex-col gap-10"
const boardGridClasses =
  "grid auto-rows-fr grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4"
const adviserGridClasses =
  "grid auto-rows-fr grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3"
const lonelyDirectorWrapperClasses =
  "w-full sm:col-span-2 sm:flex sm:justify-center lg:col-span-4"
const lonelyDirectorInnerClasses =
  "w-full sm:max-w-[calc((100%-1.25rem)/2)] lg:max-w-[calc((100%-3.75rem)/4)]"
const lonelyAdviserWrapperClasses =
  "w-full sm:col-span-2 sm:flex sm:justify-center lg:col-span-1 lg:block"
const lonelyAdviserInnerClasses =
  "w-full sm:max-w-[calc((100%-1.25rem)/2)] lg:max-w-none"

function renderDirectorCard(seat: DirectorSeat, index: number) {
  const isLast = index === COMMITTEE_DIRECTORS.length - 1
  const lonelyOnSm = isLast && COMMITTEE_DIRECTORS.length % 2 === 1
  const lonelyOnLg = isLast && COMMITTEE_DIRECTORS.length % 4 === 1

  if (!lonelyOnSm && !lonelyOnLg) {
    return <PersonCard key={seat.id} terms={[seat.current]} />
  }

  return (
    <div key={seat.id} className={lonelyDirectorWrapperClasses}>
      <div className={lonelyDirectorInnerClasses}>
        <PersonCard terms={[seat.current]} />
      </div>
    </div>
  )
}

function renderAdviserCard(seat: AdviserSeat, index: number) {
  const isLast = index === ADVISERS.length - 1
  const lonelyOnSm = isLast && ADVISERS.length % 2 === 1

  if (!lonelyOnSm) {
    return <PersonCard key={seat.id} terms={[seat.current]} />
  }

  return (
    <div key={seat.id} className={lonelyAdviserWrapperClasses}>
      <div className={lonelyAdviserInnerClasses}>
        <PersonCard terms={[seat.current]} />
      </div>
    </div>
  )
}

export function PeopleDirectory() {
  const [view, setView] = useState<PeopleView>("executive-board")

  return (
    <section id="people" className={`${shellClasses} scroll-mt-20`}>
      <SectionHeader
        eyebrow="// THE PEOPLE"
        title="Meet the People behind our org!"
        subtitle="Meet the members of our organization! Click a photo for a better view of our faces."
      />

      <BoardToggle value={view} onChange={setView} />

      <div
        className={cn(
          view === "advisers" ? adviserGridClasses : boardGridClasses,
        )}
        role="tabpanel"
        aria-label={
          view === "executive-board"
            ? "Executive Boards"
            : view === "committee-directors"
              ? "Committee Directors"
              : "Advisers"
        }
      >
        {view === "executive-board"
          ? EXECUTIVE_BOARD.map((seat) => (
              <PersonCard
                key={seat.id}
                terms={[seat.current, seat.previous]}
                showPager
              />
            ))
          : view === "committee-directors"
            ? COMMITTEE_DIRECTORS.map(renderDirectorCard)
            : ADVISERS.map(renderAdviserCard)}
      </div>
    </section>
  )
}
