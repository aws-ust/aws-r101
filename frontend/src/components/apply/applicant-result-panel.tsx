import { StatusPill } from "@/components/hr/status-pill"
import type {
  ApplicantChoice,
  ApplicantResult,
} from "@/lib/api/applicant"
import { formatDatetimeDisplay } from "@/lib/datetime/datetime-local"
import { glassPanelClasses } from "@/lib/site/surface"

const panelClasses = `${glassPanelClasses} mt-6 rounded-[22px] px-5 py-5`
const eyebrowClasses =
  "font-mono text-[10px] uppercase tracking-[0.16em] text-aquamarine"
const headingClasses = "mt-2 font-sans text-2xl font-bold text-blue-chalk"
const bodyClasses = "mt-2 font-sans text-sm leading-relaxed text-prelude"
const detailGridClasses = "mt-5 grid gap-3 sm:grid-cols-2"
const detailClasses = "rounded-[14px] bg-haiti/55 px-4 py-3"
const detailLabelClasses =
  "font-mono text-[10px] uppercase tracking-wide text-prelude"
const detailValueClasses = "mt-1 font-sans text-sm font-semibold text-blue-chalk"
const choiceListClasses = "mt-5 flex flex-col gap-2"
const choiceRowClasses =
  "flex items-center justify-between gap-3 rounded-[14px] bg-haiti/55 px-4 py-3"
const choiceNameClasses = "font-sans text-sm text-blue-chalk"
const tagClasses =
  "mt-3 inline-flex w-fit rounded-pill bg-daisy-bush/70 px-3 py-0.5 font-mono text-[11px] text-blue-chalk"

export function ApplicantResultPanel({
  result,
  choices,
}: {
  result: ApplicantResult
  choices: ApplicantChoice[]
}) {
  const redirectPending =
    result.redirectPlacement !== null && result.redirectResponse === null
  const accepted =
    result.redirectResponse === "accepted" ||
    (result.status === "approved" && !redirectPending)
  const placement =
    result.redirectResponse === "accepted" && result.finalPlacement
      ? result.finalPlacement
      : result.redirectPlacement && redirectPending
        ? result.redirectPlacement
        : result.finalPlacement

  return (
    <section className={panelClasses} aria-labelledby="application-result-title">
      <p className={eyebrowClasses}>Final result</p>
      <h2 id="application-result-title" className={headingClasses}>
        {redirectPending
          ? "Redirected placement offer"
          : accepted
            ? "Welcome to AWS Builders – UST"
            : "Application update"}
      </h2>
      <p className={bodyClasses}>
        {redirectPending
          ? "You have been offered a redirected committee placement. Reply to the placement email with your decision. Membership payment instructions will be sent after HR records your reply."
          : accepted
            ? "Your application was accepted. Your final placement is shown below. Payment instructions will appear separately when the payment period opens."
            : "Thank you for applying. You were not selected for a committee position this term. You may still continue as a general member when payment opens."}
      </p>

      {redirectPending ? (
        <span className={tagClasses}>Redirected — awaiting your reply</span>
      ) : null}

      {placement ? (
        <div className={detailGridClasses}>
          <div className={detailClasses}>
            <p className={detailLabelClasses}>
              {redirectPending ? "Offered placement" : "Final placement"}
            </p>
            <p className={detailValueClasses}>
              {`${placement.committee} — ${placement.title}`}
            </p>
          </div>
        </div>
      ) : null}

      <div className={choiceListClasses}>
        {result.choices.map((decision) => {
          const choice = choices.find(
            (item) => item.preferenceRank === decision.preferenceRank
          )
          return (
            <div key={decision.preferenceRank} className={choiceRowClasses}>
              <p className={choiceNameClasses}>
                {decision.preferenceRank === 1 ? "First" : "Second"} choice:{" "}
                {choice?.committee ?? "Committee"}
              </p>
              <StatusPill status={decision.decisionStatus} />
            </div>
          )
        })}
      </div>

      <p className={bodyClasses}>
        Released {formatDatetimeDisplay(result.releasedAt)}
      </p>
    </section>
  )
}
