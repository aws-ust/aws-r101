import type { ReactNode } from "react"

const sectionClasses =
  "rounded-[16px] border border-blue-chalk/15 bg-haiti/35 p-4 sm:p-5"
const headingClasses = "mb-4 flex items-start gap-3"
const numberClasses =
  "grid size-8 shrink-0 place-items-center rounded-full border border-aquamarine/35 bg-aquamarine/10 font-mono text-[10px] font-semibold text-aquamarine"
const titleClasses = "font-sans text-base font-bold text-blue-chalk"
const descriptionClasses =
  "mt-1 font-sans text-sm leading-relaxed text-prelude"

export function ApplicantPaymentSection({
  number,
  title,
  description,
  children,
}: {
  number: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className={sectionClasses}>
      <div className={headingClasses}>
        <span className={numberClasses} aria-hidden>
          {number}
        </span>
        <div>
          <h3 className={titleClasses}>{title}</h3>
          <p className={descriptionClasses}>{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}
