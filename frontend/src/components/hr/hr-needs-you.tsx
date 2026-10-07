import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { AttentionItem } from "@/lib/hr/overview"
import {
  dashboardDividerClasses,
  dashboardPanelClasses,
  dashboardRowTargetClasses,
} from "@/lib/site/dashboard-surface"
import { cn } from "@/lib/utils"

const headingClasses = "font-sans text-lg font-semibold text-blue-chalk"
const listClasses = cn(dashboardPanelClasses, dashboardDividerClasses, "mt-3 overflow-hidden")
const rowClasses = cn(
  dashboardRowTargetClasses,
  "flex items-center gap-4 px-4 py-3 text-blue-chalk outline-none transition-colors hover:bg-blue-chalk/5 focus-visible:bg-blue-chalk/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-aquamarine/60"
)
const countClasses =
  "w-12 shrink-0 text-right font-mono text-base tabular-nums text-aquamarine"
const textClasses = "min-w-0 flex-1 font-sans text-sm leading-snug"
const chevronClasses = "size-4 shrink-0 text-prelude"
const calmClasses = cn(dashboardPanelClasses, "mt-3 px-4 py-4 font-sans text-sm text-prelude")

export function HrNeedsYou({ items }: { items: AttentionItem[] }) {
  return (
    <section aria-labelledby="needs-you-heading">
      <h3 id="needs-you-heading" className={headingClasses}>
        Needs you
      </h3>
      {items.length === 0 ? (
        <p className={calmClasses}>Nothing is waiting on an officer right now.</p>
      ) : (
        <ul className={listClasses}>
          {items.map((item) => (
            <li key={item.key}>
              <Link href={item.href} className={rowClasses}>
                <span className={countClasses}>{item.count}</span>
                <span className={textClasses}>{item.text}</span>
                <ChevronRight className={chevronClasses} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
