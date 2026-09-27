import type { ReactNode } from "react"

const sectionClasses =
  "flex flex-col gap-5 border-t border-blue-chalk/15 pt-7 first:border-t-0 first:pt-0"
const headingClasses =
  "grid gap-2 md:grid-cols-[3rem_minmax(0,1fr)] md:items-start"
const numberClasses =
  "font-mono text-xs font-semibold tracking-[0.16em] text-aquamarine"
const titleClasses = "font-sans text-xl font-bold text-blue-chalk"
const descriptionClasses =
  "mt-1 max-w-3xl font-sans text-sm leading-relaxed text-prelude"

export function HrPaymentSection({
  number,
  title,
  description,
  children,
}: {
  number: string
  title: string
  description: string
  children: ReactNode
}) {
  const headingId = `payment-section-${number}`

  return (
    <section className={sectionClasses} aria-labelledby={headingId}>
      <div className={headingClasses}>
        <span className={numberClasses} aria-hidden>
          {number}
        </span>
        <div>
          <h2 id={headingId} className={titleClasses}>
            {title}
          </h2>
          <p className={descriptionClasses}>{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}
