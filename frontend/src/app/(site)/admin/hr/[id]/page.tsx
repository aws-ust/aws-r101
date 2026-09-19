import { Suspense } from "react"
import { HrApplicationDetail } from "@/components/hr/application-detail"
import { HrApplicationDetailSkeleton } from "@/components/hr/application-detail-skeleton"

export default function HrApplicationDetailPage() {
  return (
    <Suspense fallback={<HrApplicationDetailSkeleton />}>
      <HrApplicationDetail />
    </Suspense>
  )
}
