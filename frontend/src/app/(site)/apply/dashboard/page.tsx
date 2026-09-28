import { redirect } from "next/navigation"
import { ApplicantDashboard } from "@/components/apply/applicant-dashboard"
import { getApplicantApplicationServer } from "@/lib/auth/applicant-application-server"
import { getApplicantServerSession } from "@/lib/auth/applicant-session-server"
import { applyFlowShellClasses } from "@/lib/site/surface"

export default async function ApplicantDashboardPage() {
  const session = await getApplicantServerSession()
  if (!session) redirect("/apply/status")
  const initialApplication = await getApplicantApplicationServer()
  return (
    <main className={`${applyFlowShellClasses} gap-10`}>
      <ApplicantDashboard initialApplication={initialApplication} />
    </main>
  )
}
