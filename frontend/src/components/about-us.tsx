import { SectionHeader } from "@/components/section-header"

const INTRO =
  "AWS Builders – UST is a chapter of a global, student-led network of AWS User Groups — we don't stay inside campus walls. We're part of a thriving cloud and AI community spread across chapters in the Philippines and around the world."

const STORY =
  "Our story starts small — a handful of students who wanted UST to have a real seat at the cloud computing table, without gatekeeping who got to learn. What began as a few builders in a room grew into a full org with its own committees, its own mascot, and its own yearly recruitment cycle."

const STORY_PLACEHOLDER =
  "Placeholder — full origin story from Kuya Marc & Ate Syd goes here once finalized."

const CHAPTER_TAGS = [
  "Manila",
  "Cebu",
  "Davao",
  "+ chapters nationwide",
  "+ chapters worldwide",
] as const

const sectionClasses = "flex w-full flex-col gap-4"
const headerWidthClasses = "[&>h2]:max-w-[46rem] [&>p:last-child]:max-w-[60rem]"
const tagsClasses = "flex flex-wrap gap-2"
const tagClasses =
  "rounded-pill border border-blue-chalk/25 px-4 py-1.5 font-mono text-xs text-blue-chalk"
const storyClasses =
  "flex max-w-[52rem] flex-col gap-4 border-l border-biloba-flower/25 pl-5"
const storyBodyClasses = "font-sans text-base leading-relaxed text-prelude"
const storyPlaceholderClasses = "font-sans text-sm leading-relaxed text-prelude/70"

export function AboutUs() {
  return (
    <section
      id="about-us"
      aria-labelledby="about-us-title"
      className={sectionClasses}
    >
      <SectionHeader
        className={headerWidthClasses}
        eyebrow="// about us"
        title={
          <span id="about-us-title">Here in AWS, it&apos;s always day one!</span>
        }
        subtitle={INTRO}
      />

      <div className={tagsClasses}>
        {CHAPTER_TAGS.map((tag) => (
          <span key={tag} className={tagClasses}>{tag}</span>
        ))}
      </div>

      <blockquote className={storyClasses}>
        <p className={storyBodyClasses}>{STORY}</p>
        <p className={storyPlaceholderClasses}>{STORY_PLACEHOLDER}</p>
      </blockquote>
    </section>
  )
}
