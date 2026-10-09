import type { ReactNode } from "react"
import { displayTitleLeadingClasses } from "@/lib/site/surface"
import { cn } from "@/lib/utils"

const eyebrowClasses =
  "w-fit font-mono text-xs font-medium uppercase tracking-wide text-aquamarine"
const titleClasses = cn(
  "max-w-[640px] font-sans text-4xl font-bold text-blue-chalk md:text-5xl",
  displayTitleLeadingClasses
)
const subtitleClasses =
  "max-w-[680px] font-sans text-base leading-relaxed text-prelude"

type SectionHeaderProps = {
  /** Omit on dashboard pages: the heading carries its own weight. */
  eyebrow?: string
  title: ReactNode
  subtitle?: string
  className?: string
  titleClassName?: string
  /** h1 when this is the page's own title, as on the dashboards. */
  level?: "h1" | "h2"
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  className,
  titleClassName,
  level: Heading = "h2",
}: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {eyebrow ? <p className={eyebrowClasses}>{eyebrow}</p> : null}
      <Heading className={cn(titleClasses, titleClassName)}>{title}</Heading>
      {subtitle ? <p className={subtitleClasses}>{subtitle}</p> : null}
    </div>
  )
}
