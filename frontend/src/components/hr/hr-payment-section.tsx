import type { ReactNode } from "react"
import { formatSubheaderLabel } from "@/lib/site/button-label"

const sectionClasses =
  "flex flex-col gap-5 border-t border-blue-chalk/15 pt-7 first:border-t-0 first:pt-0"
const headingClasses = "flex flex-col gap-2"
const titleClasses = "font-sans text-xl font-bold text-blue-chalk"
const descriptionClasses =
  "mt-1 max-w-3xl font-sans text-sm leading-relaxed text-prelude"

export function HrPaymentSection({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: ReactNode
}) {
  const headingId = `payment-section-${id}`

  return (
    <section
      id={id}
      className={sectionClasses + " scroll-mt-24"}
      aria-labelledby={headingId}
    >
      <div className={headingClasses}>
        <div>
          <h2 id={headingId} className={titleClasses}>
            {formatSubheaderLabel(title)}
          </h2>
          <p className={descriptionClasses}>{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}
