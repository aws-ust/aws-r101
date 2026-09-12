import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const shellClasses =
  "grid min-w-0 w-full max-w-full grid-cols-2 gap-x-3 gap-y-3 sm:flex sm:items-center sm:gap-2"
const labelClasses =
  "col-span-2 min-w-0 text-balance text-center font-sans text-xs leading-snug text-blue-chalk sm:order-2 sm:flex-1 sm:px-2 sm:text-sm"
const navButtonClasses = "h-9 px-4 text-xs"
const prevButtonClasses = "justify-self-start sm:order-1"
const nextButtonClasses = "justify-self-end sm:order-3"

export type InterviewWeekNavProps = {
  weekLabel: string
  prevDisabled?: boolean
  nextDisabled?: boolean
  onPrev: () => void
  onNext: () => void
  className?: string
}

export function InterviewWeekNav({
  weekLabel,
  prevDisabled = false,
  nextDisabled = false,
  onPrev,
  onNext,
  className,
}: InterviewWeekNavProps) {
  return (
    <div className={cn(shellClasses, className)}>
      <p className={labelClasses}>{weekLabel}</p>
      <Button
        type="button"
        color="purple"
        className={cn(navButtonClasses, prevButtonClasses)}
        disabled={prevDisabled}
        onClick={onPrev}
      >
        ← Prev
      </Button>
      <Button
        type="button"
        color="purple"
        className={cn(navButtonClasses, nextButtonClasses)}
        disabled={nextDisabled}
        onClick={onNext}
      >
        Next →
      </Button>
    </div>
  )
}
