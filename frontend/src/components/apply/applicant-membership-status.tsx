import { ApplicantGroupLinks } from "@/components/apply/applicant-group-links"
import type { ApplicantApplication } from "@/lib/api/applicant"
import { glassPanelClasses } from "@/lib/site/surface"

const panelClasses = `${glassPanelClasses} mt-6 rounded-[22px] px-5 py-5`
const eyebrowClasses =
  "font-mono text-[10px] uppercase tracking-[0.16em] text-aquamarine"
const headingClasses = "mt-2 font-sans text-2xl font-bold text-blue-chalk"
const bodyClasses = "mt-2 font-sans text-sm leading-relaxed text-prelude"

const registeredMessage =
  "No interview is required. Membership payment opens after R101, so please wait for the official instructions and do not send a payment yet."
const acceptedMessage =
  "Welcome to AWS Builders - UST as a general member! Membership payment instructions will be sent to your email. Your Member ID will appear here once your payment is verified."

export function ApplicantMembershipStatus({
  application,
}: {
  application: ApplicantApplication
}) {
  const result = application.result
  const accepted = result?.status === "approved"

  return (
    <section className={panelClasses} aria-labelledby="membership-status-title">
      <p className={eyebrowClasses}>Member-Only Application</p>
      <h2 id="membership-status-title" className={headingClasses}>
        {accepted ? "You Are Now a Member" : "Membership Registration Accepted"}
      </h2>
      <p className={bodyClasses}>{accepted ? acceptedMessage : registeredMessage}</p>
      {accepted && result.groupLinks ? <ApplicantGroupLinks {...result.groupLinks} /> : null}
    </section>
  )
}
