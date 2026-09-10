"use client"

import {
  interviewTimeLabels,
  INTERVIEW_GRID_END_HOUR,
  INTERVIEW_GRID_START_HOUR,
  slotKey,
  slotStartsAt,
} from "@/lib/interview-season"

export type SlotGridCellState =
  | "hidden"
  | "unavailable"
  | "available"
  | "booked"
  | "selected"
  | "current"

export type SlotGridCell = {
  key: string
  startsAt: Date
  state: SlotGridCellState
  slotId?: string
  detail?: string
}

type SlotGridProps = {
  days: Date[]
  cells: Map<string, SlotGridCell>
  onCellClick?: (cell: SlotGridCell) => void
  loading?: boolean
  sparse?: boolean
  emptyMessage?: string
}

const shellClasses = "overflow-x-auto rounded-[20px] border border-biloba-flower/25"
const tableClasses = "min-w-full border-collapse text-left"
const headerClasses =
  "sticky left-0 z-10 bg-meteorite/95 px-2 py-2 font-mono text-[0.65rem] uppercase tracking-wide text-prelude"
const dayHeaderClasses =
  "min-w-[5.5rem] px-2 py-2 text-center font-sans text-xs font-semibold text-blue-chalk"
const daySubheaderClasses = "block font-mono text-[0.65rem] font-normal text-prelude"
const timeLabelClasses =
  "sticky left-0 z-10 bg-meteorite/95 px-2 py-1 font-mono text-[0.65rem] text-prelude whitespace-nowrap"
const cellBaseClasses =
  "h-9 min-w-[5.5rem] border border-haiti/40 px-1 transition-colors"
const unavailableClasses = "bg-haiti/30 cursor-pointer hover:bg-haiti/50"
const availableClasses =
  "cursor-pointer bg-aquamarine/25 hover:bg-aquamarine/40"
const bookedClasses = "cursor-not-allowed bg-biloba-flower/35 text-prelude"
const selectedClasses = "cursor-pointer bg-aquamarine ring-2 ring-aquamarine/70"
const currentClasses = "cursor-pointer bg-aquamarine/50 ring-2 ring-aquamarine"
const hiddenClasses = "bg-transparent border-transparent"
const legendClasses = "mt-3 flex flex-wrap gap-4 font-sans text-xs text-prelude"
const legendSwatchClasses = "mr-2 inline-block size-3 rounded-sm align-middle"
const skeletonClasses = "h-48 animate-pulse rounded-[20px] bg-haiti/40"
const emptyClasses = "px-4 py-8 text-center font-sans text-sm text-prelude"

function cellClasses(state: SlotGridCellState): string {
  switch (state) {
    case "unavailable":
      return `${cellBaseClasses} ${unavailableClasses}`
    case "available":
      return `${cellBaseClasses} ${availableClasses}`
    case "booked":
      return `${cellBaseClasses} ${bookedClasses}`
    case "selected":
      return `${cellBaseClasses} ${selectedClasses}`
    case "current":
      return `${cellBaseClasses} ${currentClasses}`
    default:
      return `${cellBaseClasses} ${hiddenClasses}`
  }
}

function formatDayHeader(day: Date) {
  return {
    weekday: day.toLocaleDateString(undefined, { weekday: "short" }),
    date: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }
}

export function SlotGrid({
  days,
  cells,
  onCellClick,
  loading = false,
  sparse = false,
  emptyMessage = "No slots to show.",
}: SlotGridProps) {
  const timeLabels = interviewTimeLabels()
  const rowCount =
    (INTERVIEW_GRID_END_HOUR - INTERVIEW_GRID_START_HOUR) * 2

  if (loading) {
    return <div className={skeletonClasses} aria-busy="true" />
  }

  if (days.length === 0) {
    return <p className={emptyClasses}>{emptyMessage}</p>
  }

  const visibleCells = sparse
    ? [...cells.values()].filter((cell) => cell.state !== "hidden")
    : null

  if (sparse && visibleCells && visibleCells.length === 0) {
    return <p className={emptyClasses}>{emptyMessage}</p>
  }

  return (
    <div>
      <div className={shellClasses}>
        <table className={tableClasses}>
          <thead>
            <tr>
              <th className={headerClasses} scope="col">Time</th>
              {days.map((day) => {
                const { weekday, date } = formatDayHeader(day)
                return (
                  <th key={day.toISOString()} className={dayHeaderClasses} scope="col">
                    {weekday}
                    <span className={daySubheaderClasses}>{date}</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, rowIndex) => (
              <tr key={rowIndex}>
                <th className={timeLabelClasses} scope="row">
                  {timeLabels[rowIndex]}
                </th>
                {days.map((day) => {
                  const startsAt = slotStartsAt(day, rowIndex)
                  const cell = cells.get(slotKey(startsAt))
                  if (!cell || (sparse && cell.state === "hidden")) {
                    if (sparse) {
                      return (
                        <td
                          key={`${day.toISOString()}-${rowIndex}`}
                          className={`${cellBaseClasses} ${hiddenClasses}`}
                        />
                      )
                    }
                    const fallback: SlotGridCell = {
                      key: slotKey(startsAt),
                      startsAt,
                      state: "unavailable",
                    }
                    return (
                      <td key={fallback.key} className={cellClasses("unavailable")}>
                        <button
                          type="button"
                          className="size-full cursor-pointer"
                          onClick={() => onCellClick?.(fallback)}
                          aria-label={`Unavailable ${startsAt.toLocaleString()}`}
                        />
                      </td>
                    )
                  }

                  const clickable =
                    cell.state === "unavailable" ||
                    cell.state === "available" ||
                    cell.state === "selected" ||
                    cell.state === "current"

                  return (
                    <td key={cell.key} className={cellClasses(cell.state)}>
                      {clickable ? (
                        <button
                          type="button"
                          className="flex size-full flex-col items-center justify-center px-1 text-[0.65rem] leading-tight text-blue-chalk"
                          onClick={() => onCellClick?.(cell)}
                          aria-label={cell.detail ?? cell.startsAt.toLocaleString()}
                          title={cell.detail}
                        >
                          {cell.detail ? (
                            <span className="line-clamp-2">{cell.detail}</span>
                          ) : null}
                        </button>
                      ) : (
                        <span
                          className="flex size-full items-center justify-center px-1 text-[0.65rem] leading-tight"
                          title={cell.detail}
                        >
                          {cell.detail ? (
                            <span className="line-clamp-2">{cell.detail}</span>
                          ) : null}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={legendClasses} aria-hidden="true">
        <span>
          <span className={`${legendSwatchClasses} bg-haiti/50`} />
          Unavailable
        </span>
        <span>
          <span className={`${legendSwatchClasses} bg-aquamarine/30`} />
          Available
        </span>
        <span>
          <span className={`${legendSwatchClasses} bg-biloba-flower/40`} />
          Booked
        </span>
        <span>
          <span className={`${legendSwatchClasses} bg-aquamarine`} />
          Selected
        </span>
      </div>
    </div>
  )
}
