"use client"

import { useMemo, useState } from "react"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  birthdayYearOptions,
  formatDateDisplay,
  partsFromDateYmd,
  partsToDateYmd,
  type DateParts,
} from "@/lib/date-local"
import {
  calendarDays,
  monthLabel,
  WEEKDAY_LABELS,
} from "@/lib/datetime-local"
import { fieldControlClasses } from "@/lib/surface"
import { cn } from "@/lib/utils"

const panelClasses = "flex flex-col gap-4 p-1"
const calendarSectionClasses = "min-w-[17rem]"
const headerClasses = "mb-3 flex items-center justify-between gap-2"
const monthClasses = "font-sans text-sm font-semibold text-blue-chalk"
const navButtonClasses =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-[10px] text-prelude transition-colors hover:bg-biloba-flower/15 hover:text-aquamarine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aquamarine/40"
const yearSelectClasses =
  "h-8 min-w-[5rem] cursor-pointer rounded-[10px] border border-blue-chalk/20 bg-haiti/70 px-2 font-mono text-xs text-blue-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aquamarine/40"
const weekdayRowClasses =
  "mb-1 grid grid-cols-7 gap-1 font-mono text-[0.65rem] uppercase tracking-wide text-prelude"
const dayGridClasses = "grid grid-cols-7 gap-1"
const dayButtonClasses =
  "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] font-sans text-sm text-blue-chalk transition-colors hover:bg-biloba-flower/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aquamarine/40"
const daySelectedClasses = "bg-aquamarine font-semibold text-haiti hover:bg-aquamarine"
const footerClasses = "mt-3 flex items-center justify-between gap-3"
const footerActionClasses =
  "cursor-pointer font-mono text-xs text-aquamarine transition-colors hover:text-blue-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aquamarine/40"
const triggerClasses = cn(
  fieldControlClasses,
  "flex items-center justify-between gap-3 text-left"
)
const triggerValueClasses = "min-w-0 flex-1 truncate"
const triggerPlaceholderClasses = "text-prelude/70"
const iconClasses = "size-4 shrink-0 text-aquamarine"

type DatePickerProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  className?: string
  placeholder?: string
}

export function DatePicker({
  id,
  value,
  onChange,
  required,
  className,
  placeholder = "Select birthday",
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [parts, setParts] = useState<DateParts>(() => partsFromDateYmd(value))
  const yearOptions = useMemo(() => birthdayYearOptions(), [])

  function handleOpenChange(next: boolean) {
    if (next) {
      setParts(partsFromDateYmd(value))
    }
    setOpen(next)
  }

  const days = useMemo(
    () => calendarDays(parts.year, parts.month),
    [parts.month, parts.year]
  )

  function updateParts(next: DateParts) {
    setParts(next)
    onChange(partsToDateYmd(next))
  }

  function shiftMonth(delta: number) {
    const next = new Date(parts.year, parts.month + delta, 1)
    setParts((current) => ({
      ...current,
      year: next.getFullYear(),
      month: next.getMonth(),
    }))
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        id={id}
        type="button"
        className={cn(triggerClasses, className)}
        aria-required={required}
      >
        <span
          className={cn(
            triggerValueClasses,
            !value && triggerPlaceholderClasses
          )}
        >
          {formatDateDisplay(value, placeholder)}
        </span>
        <CalendarIcon className={iconClasses} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="p-4" align="start">
        <div className={panelClasses}>
          <section className={calendarSectionClasses}>
            <div className={headerClasses}>
              <button
                type="button"
                className={navButtonClasses}
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                <p className={monthClasses}>
                  {monthLabel(parts.year, parts.month).split(" ")[0]}
                </p>
                <select
                  className={yearSelectClasses}
                  aria-label="Year"
                  value={parts.year}
                  onChange={(event) =>
                    setParts((current) => ({
                      ...current,
                      year: Number(event.target.value),
                    }))
                  }
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className={navButtonClasses}
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className={weekdayRowClasses}>
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="text-center">
                  {label}
                </span>
              ))}
            </div>
            <div className={dayGridClasses}>
              {days.map((day, index) =>
                day ? (
                  <button
                    key={`${parts.year}-${parts.month}-${day}`}
                    type="button"
                    className={cn(
                      dayButtonClasses,
                      parts.day === day && daySelectedClasses
                    )}
                    onClick={() => updateParts({ ...parts, day })}
                  >
                    {day}
                  </button>
                ) : (
                  <span key={`empty-${index}`} className="h-9 w-9" />
                )
              )}
            </div>
            <div className={footerClasses}>
              <button
                type="button"
                className={footerActionClasses}
                onClick={() => {
                  onChange("")
                  setOpen(false)
                }}
              >
                Clear
              </button>
            </div>
          </section>
        </div>
      </PopoverContent>
    </Popover>
  )
}
