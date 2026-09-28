import type { PaymentDashboard } from "@/lib/api/payments"
import { formatSubheaderLabel } from "@/lib/site/button-label"
import { glassPanelClasses, subheaderLabelClasses } from "@/lib/site/surface"

const gridClasses = "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
const cardClasses = `${glassPanelClasses} rounded-[20px] px-5 py-4`
const valueClasses = "mt-2 font-sans text-3xl font-bold text-blue-chalk"

export function HrPaymentSummary({ summary }: { summary: PaymentDashboard["summary"] }) {
  const stats = [
    ["Eligible", summary.totalEligible],
    ["Awaiting payment", summary.awaitingPayment],
    ["Pending verification", summary.pendingVerification],
    ["Verified members", summary.verified],
    ["Needs resubmission", summary.needsResubmission],
    ["Expired", summary.expired],
  ] as const
  return (
    <div className={gridClasses}>
      {stats.map(([label, value]) => (
        <div key={label} className={cardClasses}>
          <p className={subheaderLabelClasses}>{formatSubheaderLabel(label)}</p>
          <p className={valueClasses}>{value}</p>
        </div>
      ))}
    </div>
  )
}
