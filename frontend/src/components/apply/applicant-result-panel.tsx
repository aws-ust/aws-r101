import type { ApplicantResult } from "@/lib/api/applicant"
import { glassPanelClasses } from "@/lib/site/surface"
const panelClasses = `${glassPanelClasses} mt-6 rounded-[22px] px-5 py-5`
const eyebrowClasses =
  "font-mono text-xs font-medium uppercase tracking-[0.12em] text-aquamarine md:text-sm"
const headingClasses = "mt-2 font-sans text-2xl font-bold text-blue-chalk"
const bodyClasses = "mt-2 font-sans text-sm leading-relaxed text-prelude"
const detailClasses = "mt-5 rounded-[14px] bg-haiti/55 px-4 py-3"
const detailLabelClasses =
  "font-mono text-[10px] uppercase tracking-wide text-prelude"
const detailValueClasses = "mt-1 font-sans text-sm font-semibold text-blue-chalk"
const tagClasses =
  "mt-3 inline-flex w-fit rounded-pill bg-daisy-bush/70 px-3 py-0.5 font-mono text-[11px] text-blue-chalk"
type Placement = NonNullable<ApplicantResult["finalPlacement"]>

function PlacementDetail({
  label,
  placement,
  titleId,
}: {
  label: string
  placement: Placement
  titleId?: string
}) {
  return (
    <div className={detailClasses}>
      <p className={detailLabelClasses}>{label}</p>
      <p id={titleId} className={detailValueClasses}>
        {placement.committee}
      </p>
      {placement.title !== placement.committee ? (
        <p className="mt-1 font-sans text-sm text-prelude">{placement.title}</p>
      ) : null}
    </div>
  )
}

function RedirectOfferBody({ placement }: { placement: Placement | null }) {
  return (
    <>
      <h2 id="application-result-title" className={headingClasses}>
        Redirected placement offer
      </h2>
      <p className={bodyClasses}>
        You have been offered a redirected committee placement. Reply to the
        placement email with your decision. Membership payment instructions
        will be sent after HR records your reply.
      </p>
      <span className={tagClasses}>Redirected — awaiting your reply</span>
      {placement ? (
        <PlacementDetail label="Offered placement" placement={placement} />
      ) : null}
    </>
  )
}

function NotSelectedBody() {
  return (
    <>
      <h2 id="application-result-title" className={headingClasses}>
        Application update
      </h2>
      <p className={bodyClasses}>
        Thank you for applying. You were not selected for a committee position
        this term. You may still continue as a general member when payment
        opens.
      </p>
    </>
  )
}

function resolvePlacement(result: ApplicantResult, redirectPending: boolean) {
  if (result.redirectResponse === "accepted" && result.finalPlacement) {
    return result.finalPlacement
  }
  if (result.redirectPlacement && redirectPending) return result.redirectPlacement
  return result.finalPlacement
}

export function ApplicantResultPanel({ result }: { result: ApplicantResult }) {
  const redirectPending =
    result.redirectPlacement !== null && result.redirectResponse === null
  const accepted =
    result.redirectResponse === "accepted" ||
    (result.status === "approved" && !redirectPending)
  const placement = resolvePlacement(result, redirectPending)

  return (
    <section className={panelClasses} aria-labelledby="application-result-title">
      <p className={eyebrowClasses}>Final Result</p>
      {redirectPending ? (
        <RedirectOfferBody placement={placement} />
      ) : accepted && placement ? (
        <PlacementDetail
          label="Accepted committee"
          placement={placement}
          titleId="application-result-title"
        />
      ) : (
        <NotSelectedBody />
      )}
    </section>
  )
}
