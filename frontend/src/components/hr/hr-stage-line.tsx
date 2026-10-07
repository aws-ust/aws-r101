import Link from "next/link"
import type { StageStation } from "@/lib/hr/overview"
import { cn } from "@/lib/utils"

const listClasses = "grid lg:grid-cols-6"
const stationClasses =
  "relative flex gap-4 pb-5 last:pb-0 before:absolute before:left-[5px] before:top-4 before:h-full before:w-px before:bg-blue-chalk/15 last:before:hidden lg:block lg:pb-0 lg:pr-4 lg:before:left-4 lg:before:top-[5px] lg:before:h-px lg:before:w-[calc(100%-1rem)]"
const markerClasses =
  "relative z-10 mt-1.5 block size-3 shrink-0 rounded-full border-2 border-prelude/50 bg-haiti lg:mt-0"
const markerLitClasses = "border-aquamarine bg-aquamarine"
const linkClasses =
  "-my-1 flex min-h-11 flex-1 items-baseline justify-between gap-3 rounded-md py-1 text-blue-chalk outline-none transition-colors hover:text-aquamarine focus-visible:ring-2 focus-visible:ring-aquamarine/60 lg:mt-3 lg:block lg:min-h-0"
const labelClasses = "font-sans text-sm text-prelude"
const labelLitClasses = "text-aquamarine"
const countClasses = "font-sans text-xl font-semibold tabular-nums lg:mt-1 lg:block"

export function HrStageLine({ stations }: { stations: StageStation[] }) {
  return (
    <nav aria-label="Recruitment stages">
      <ol className={listClasses}>
        {stations.map((station) => (
          <li key={station.key} className={stationClasses}>
            <span
              aria-hidden
              className={cn(markerClasses, station.needsWork && markerLitClasses)}
            />
            <Link href={station.href} className={linkClasses}>
              <span className={cn(labelClasses, station.needsWork && labelLitClasses)}>
                {station.label}
                {station.needsWork ? <span className="sr-only"> (needs work)</span> : null}
              </span>
              <span className={countClasses}>{station.count}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}
