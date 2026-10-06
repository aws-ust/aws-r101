import type { Metadata } from "next"
import { MemberVerificationCard } from "@/components/site/member-verification-card"
import { verifyMemberServer } from "@/lib/members/verify-server"
import { pageShellClasses } from "@/lib/site/surface"

export const metadata: Metadata = {
  title: "Verify Membership | AWS Builders – UST",
  robots: { index: false },
}

export default async function VerifyMemberPage({ params }: PageProps<"/verify/[memberId]">) {
  const { memberId } = await params
  const result = await verifyMemberServer(decodeURIComponent(memberId))
  return (
    <main className={`${pageShellClasses} items-center justify-center`}>
      <MemberVerificationCard memberId={decodeURIComponent(memberId).toUpperCase()} result={result} />
    </main>
  )
}
