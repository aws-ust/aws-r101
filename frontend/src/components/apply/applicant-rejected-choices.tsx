import type { ApplicantChoice } from "@/lib/api/applicant"

const listClasses = "mt-5 flex flex-col gap-3"
const itemClasses =
  "flex items-start justify-between gap-3 rounded-[14px] bg-haiti/55 px-4 py-3"
const labelClasses = "font-mono text-[10px] uppercase tracking-wide text-prelude"
const committeeClasses = "mt-1 font-sans text-sm font-semibold text-blue-chalk"
const titleClasses = "mt-1 font-sans text-sm text-prelude"
const tagClasses =
  "shrink-0 rounded-pill border border-rose-blush/45 bg-rose-deep/40 px-3 py-0.5 font-mono text-[11px] text-rose-glow"

const RANK_LABELS: Record<ApplicantChoice["preferenceRank"], string> = {
  1: "1st Choice",
  2: "2nd Choice",
}

/** Lists each position choice as not accepted, for applicants who were not selected. */
export function ApplicantRejectedChoices({ choices }: { choices: ApplicantChoice[] }) {
  if (choices.length === 0) return null
  const ordered = [...choices].sort((a, b) => a.preferenceRank - b.preferenceRank)

  return (
    <ul className={listClasses} aria-label="Your position choices">
      {ordered.map((choice) => (
        <li key={choice.positionId} className={itemClasses}>
          <div className="min-w-0">
            <p className={labelClasses}>{RANK_LABELS[choice.preferenceRank]}</p>
            <p className={committeeClasses}>{choice.committee}</p>
            {choice.title !== choice.committee ? (
              <p className={titleClasses}>{choice.title}</p>
            ) : null}
          </div>
          <span className={tagClasses}>Not Accepted</span>
        </li>
      ))}
    </ul>
  )
}
