"use client"

import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react"
import { SectionHeader } from "@/components/section-header"
import { cn } from "@/lib/utils"

type Moment = {
  id: string
  date: string
  label: string
}

const MOMENTS: Moment[] = [
  { id: "kickoff", date: "August 2024", label: "Org kickoff and first builders meetup" },
  { id: "ga", date: "October 2024", label: "First general assembly of the academic year" },
  { id: "workshop", date: "January 2025", label: "AWS cloud workshop series" },
  { id: "recruitment", date: "March 2025", label: "Recruitment season opens to campus" },
  { id: "outreach", date: "June 2025", label: "Community outreach and partner events" },
  { id: "builders-night", date: "August 2025", label: "Year-end builders night celebration" },
]

const sectionClasses = "flex w-full flex-col gap-[clamp(2rem,4vw,3.5rem)]"
const timelineShellClasses = "relative mx-auto w-full max-w-5xl"
const lineClasses =
  "pointer-events-none absolute top-2 bottom-2 left-1/2 w-px -translate-x-1/2 bg-biloba-flower/25"
const timelineClasses = "flex flex-col"
const entryClasses = "relative pb-14 last:pb-0 md:pb-16"
const dotShellClasses =
  "absolute top-1.5 left-1/2 z-10 -translate-x-1/2"
const dotClasses = "size-3 rounded-full border-2 bg-haiti"
const cardClasses = cn(
  "relative pt-9 md:max-w-[calc(50%-1.5rem)]",
  "md:pt-0"
)
const cardRightClasses = "md:ml-[calc(50%+1.25rem)]"
const cardLeftClasses = "md:mr-[calc(50%+1.25rem)] md:text-right"
const dateClasses = "font-mono text-sm font-medium text-aquamarine"
const labelClasses = "mt-1 font-sans text-sm leading-relaxed text-prelude"
const mediaClasses =
  "glass mt-4 aspect-[4/3] w-full rounded-[14px] border border-blue-chalk/20 bg-meteorite/45"

const revealSnap = { duration: 0 }
const revealEase = { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }

const dotRest = {
  scale: 0.6,
  opacity: 0.4,
  borderColor: "rgba(90,240,192,0.35)",
  backgroundColor: "rgba(23,15,51,1)",
  boxShadow: "0 0 0 4px rgba(23,15,51,1)",
}

const dotActive = {
  scale: 1,
  opacity: 1,
  borderColor: "rgba(90,240,192,1)",
  backgroundColor: "rgba(90,240,192,1)",
  boxShadow: "0 0 16px rgba(90,240,192,0.55)",
}

type TimelineEntryProps = {
  moment: Moment
  index: number
  reducedMotion: boolean | null
}

function TimelineEntry({ moment, index, reducedMotion }: TimelineEntryProps) {
  const onRight = index % 2 === 0
  const enterX = onRight ? 28 : -28

  return (
    <li className={entryClasses}>
      <div className={dotShellClasses}>
        <m.div
          className={dotClasses}
          initial={reducedMotion ? false : dotRest}
          whileInView={reducedMotion ? undefined : dotActive}
          viewport={{ once: true, amount: 0.45 }}
          transition={reducedMotion ? revealSnap : { ...revealEase, delay: 0.08 }}
          aria-hidden
        />
      </div>

      <m.article
        className={cn(
          cardClasses,
          onRight ? cardRightClasses : cardLeftClasses
        )}
        initial={reducedMotion ? false : { opacity: 0, y: 24, x: enterX }}
        whileInView={reducedMotion ? undefined : { opacity: 1, y: 0, x: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={reducedMotion ? revealSnap : revealEase}
      >
        <time dateTime={moment.date} className={dateClasses}>{moment.date}</time>
        <p className={labelClasses}>{moment.label}</p>
        <m.div
          className={mediaClasses}
          initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={reducedMotion ? revealSnap : { ...revealEase, delay: 0.12 }}
          aria-hidden
        />
      </m.article>
    </li>
  )
}

export function OurMoments() {
  const reducedMotion = useReducedMotion()

  return (
    <section
      id="our-moments"
      aria-labelledby="our-moments-title"
      className={sectionClasses}
    >
      <SectionHeader
        eyebrow="// our moments"
        title={
          <span id="our-moments-title">
            A lookback at what we&apos;ve built together
          </span>
        }
      />

      <LazyMotion features={domAnimation}>
        <div className={timelineShellClasses}>
          <div className={lineClasses} aria-hidden />
          <ol className={timelineClasses}>
            {MOMENTS.map((moment, index) => (
              <TimelineEntry
                key={moment.id}
                moment={moment}
                index={index}
                reducedMotion={reducedMotion}
              />
            ))}
          </ol>
        </div>
      </LazyMotion>
    </section>
  )
}
