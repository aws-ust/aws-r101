import { redirect } from "next/navigation"
import { ApplicantDashboard } from "@/components/apply/applicant-dashboard"
import { SectionHeader } from "@/components/section-header"
import { getApplicantServerSession } from "@/lib/applicant-session-server"
import { pageShellClasses } from "@/lib/surface"

export default async function ApplicantDashboardPage() {
  const session = await getApplicantServerSession()
  if (!session) redirect("/apply/status")
  return (
    <main className={pageShellClasses}>
      <SectionHeader
        eyebrow="// APPLICANT DASHBOARD"
        title="Your application"
        subtitle="Review what you submitted and update committee choices, documents, or your interview while recruitment week is open."
      />
      <ApplicantDashboard />
    </main>
  )
}
