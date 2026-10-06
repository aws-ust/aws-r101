import { Button } from "@/components/ui/button"
import type { ResultEmailStatus } from "@/lib/api/client"

const sectionClasses = "mt-5 border-t border-blue-chalk/15 pt-4"
const headingClasses = "font-sans text-sm font-semibold text-blue-chalk"
const helpClasses = "mt-1 font-sans text-xs leading-relaxed text-prelude"
const listClasses = "mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto"
const itemClasses = "rounded-[12px] bg-haiti/55 px-3 py-2"
const recipientClasses = "font-sans text-sm text-blue-chalk"
const errorClasses = "mt-0.5 break-words font-mono text-[11px] text-prelude"
const actionClasses = "mt-3"

type Problem = ResultEmailStatus["problems"][number]

function ProblemList({ problems }: { problems: Problem[] }) {
  return (
    <ul className={listClasses}>
      {problems.map((problem) => (
        <li key={problem.id} className={itemClasses}>
          <p className={recipientClasses}>{problem.recipient}</p>
          {problem.error ? <p className={errorClasses}>{problem.error}</p> : null}
        </li>
      ))}
    </ul>
  )
}

/**
 * Failed emails (safe to retry with Retry Failed Emails) and uncertain ones,
 * which may already have reached the applicant and are only resent on request.
 */
export function HrResultEmailProblems({
  problems,
  resending,
  onResendUncertain,
}: {
  problems: Problem[]
  resending: boolean
  onResendUncertain: () => void
}) {
  const failed = problems.filter((problem) => !problem.uncertain)
  const uncertain = problems.filter((problem) => problem.uncertain)

  return (
    <>
      {failed.length > 0 ? (
        <div className={sectionClasses}>
          <p className={headingClasses}>Failed</p>
          <p className={helpClasses}>These were not sent. Use Retry Failed Emails to send them again.</p>
          <ProblemList problems={failed} />
        </div>
      ) : null}
      {uncertain.length > 0 ? (
        <div className={sectionClasses}>
          <p className={headingClasses}>Uncertain</p>
          <p className={helpClasses}>
            Sending stopped partway, so these may already have been delivered. Search the sender
            account&apos;s Sent folder for each address first, and only resend if it&apos;s missing.
          </p>
          <ProblemList problems={uncertain} />
          <Button type="button" color="danger" className={actionClasses} disabled={resending} onClick={onResendUncertain}>
            {resending ? "Resending…" : "Resend Anyway"}
          </Button>
        </div>
      ) : null}
    </>
  )
}
