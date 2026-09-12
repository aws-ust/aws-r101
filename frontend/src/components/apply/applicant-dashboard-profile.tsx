import { formatDateDisplay } from "@/lib/date-local"
import { formatApplicantGender } from "@/lib/applicant-gender"
import type { ApplicantApplication } from "@/lib/applicant-api"
import { safeExternalHref } from "@/lib/safe-external-href"

const metaRowClasses =
  "mt-6 flex flex-wrap gap-x-8 gap-y-3 font-sans text-sm text-blue-chalk"
const metaLabelClasses = "mr-2 text-prelude"
const whyLabelClasses = "mt-8 font-sans text-sm font-semibold text-biloba-flower"
const whyBodyClasses =
  "mt-2 font-sans text-sm leading-relaxed text-pretty text-justify text-blue-chalk"
const linkClasses =
  "text-aquamarine underline-offset-2 hover:text-blue-chalk hover:underline"
const headingClasses = "font-sans text-3xl font-bold text-blue-chalk md:text-4xl"
const codeClasses = "mt-2 font-mono text-sm text-aquamarine"

export function ApplicantDashboardProfile({
  application,
}: {
  application: ApplicantApplication
}) {
  const facebookHref = safeExternalHref(application.facebookUrl, "facebook")
  const portfolioHref = safeExternalHref(application.portfolioUrl, "portfolio")
  const githubHref = safeExternalHref(application.githubUrl, "github")

  return (
    <>
      <h1 className={headingClasses}>
        {application.firstName} {application.lastName}
      </h1>
      <p className={codeClasses}>{application.applicationCode}</p>

      <div className={metaRowClasses}>
        <p>
          <span className={metaLabelClasses}>Email</span>
          {application.email}
        </p>
        <p>
          <span className={metaLabelClasses}>Age</span>
          {application.age ?? "—"}
        </p>
        <p>
          <span className={metaLabelClasses}>Birthday</span>
          {application.birthday
            ? formatDateDisplay(application.birthday, "—")
            : "—"}
        </p>
        <p>
          <span className={metaLabelClasses}>Gender</span>
          {formatApplicantGender(application.gender)}
        </p>
        <p>
          <span className={metaLabelClasses}>Section</span>
          {application.section ?? "—"}
        </p>
        <p>
          <span className={metaLabelClasses}>Student no.</span>
          {application.studentNumber ?? "—"}
        </p>
        <p>
          <span className={metaLabelClasses}>Contact</span>
          {application.contactNumber ?? "—"}
        </p>
        <p>
          <span className={metaLabelClasses}>Facebook</span>
          {facebookHref ? (
            <a
              href={facebookHref}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClasses}
            >
              Profile
            </a>
          ) : (
            "—"
          )}
        </p>
        {portfolioHref ? (
          <p>
            <span className={metaLabelClasses}>Portfolio</span>
            <a
              href={portfolioHref}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClasses}
            >
              Google Drive
            </a>
          </p>
        ) : null}
        {githubHref ? (
          <p>
            <span className={metaLabelClasses}>GitHub</span>
            <a
              href={githubHref}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClasses}
            >
              Profile
            </a>
          </p>
        ) : null}
      </div>

      <p className={whyLabelClasses}>Why AWS Builders – UST?</p>
      <p className={whyBodyClasses}>{application.motivation}</p>
    </>
  )
}
