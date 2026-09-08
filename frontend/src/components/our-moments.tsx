"use client"

import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react"
import { SectionHeader } from "@/components/section-header"

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
const timelineShellClasses = "relative"
const timelineClasses = "flex flex-col gap-14 md:gap-16"
const lineClasses =
  "pointer-events-none absolute top-3 bottom-3 left-[0.34375rem] w-px bg-biloba-flower/25 md:left-[0.4375rem]"
const entryClasses = "relative pl-8 md:pl-10"
const dotClasses =
  "absolute top-1.5 left-0 size-3 rounded-full border-2 bg-haiti"
const dateClasses = "font-mono text-sm font-medium text-aquamarine"
const labelClasses = "mt-1 max-w-md font-sans text-sm leading-relaxed text-prelude"
const mediaClasses =
  "glass mt-4 aspect-[4/3] w-full max-w-xl rounded-[14px] border border-blue-chalk/20 bg-meteorite/45"

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
  reducedMotion: boolean | null
}

function TimelineEntry({ moment, reducedMotion }: TimelineEntryProps) {
  return (
    <m.article
      className={entryClasses}
      initial={reducedMotion ? false : { opacity: 0, y: 28 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.45 }}
      transition={reducedMotion ? revealSnap : revealEase}
    >
      <m.div
        className={dotClasses}
        initial={reducedMotion ? false : dotRest}
        whileInView={reducedMotion ? undefined : dotActive}
        viewport={{ once: true, amount: 0.45 }}
        transition={reducedMotion ? revealSnap : { ...revealEase, delay: 0.08 }}
        aria-hidden
      />
      <time dateTime={moment.date} className={dateClasses}>{moment.date}</time>
      <p className={labelClasses}>{moment.label}</p>
      <m.div
        className={mediaClasses}
        initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
        whileInView={reducedMotion ? undefined : { opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.45 }}
        transition={reducedMotion ? revealSnap : { ...revealEase, delay: 0.14 }}
        aria-hidden
      />
    </m.article>
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
            {MOMENTS.map((moment) => (
              <li key={moment.id}>
                <TimelineEntry moment={moment} reducedMotion={reducedMotion} />
              </li>
            ))}
          </ol>
        </div>
      </LazyMotion>
    </section>
  )
}
