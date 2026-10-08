"use client"

import Link from "next/link"
import { PaymentsCollectionActions } from "@/components/hr/payments-collection-actions"
import { PaymentsLoadError } from "@/components/hr/payments-empty"
import { PaymentsListArea } from "@/components/hr/payments-list-area"
import { PaymentsStatusStrip } from "@/components/hr/payments-status-strip"
import { PaymentsTabs } from "@/components/hr/payments-tabs"
import { useHrPaymentWorkspace } from "@/components/hr/use-hr-payment-workspace"
import { usePaymentsView } from "@/components/hr/use-payments-view"
import { ActionFeedback } from "@/components/shared/action-feedback"
import { SectionHeader } from "@/components/shared/section-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PAYMENT_SETUP_HREF, needsPaymentSetup, periodLine, type PaymentTab } from "@/lib/payments/workspace"
import { dashboardActionTargetClasses, dashboardTitleClasses } from "@/lib/site/dashboard-surface"
import { hrPageShellClasses } from "@/lib/site/surface"

const errorWrapClasses = "mt-6"
const retryClasses = `mt-2 px-4 ${dashboardActionTargetClasses}`
// A pointer to Payment Setup, only while the period or the amount is missing.
const setupNoticeClasses =
  "mt-6 flex flex-col gap-2 rounded-xl border border-blue-chalk/15 bg-haiti/60 px-5 py-4 font-sans text-sm text-prelude sm:flex-row sm:items-center sm:justify-between"
const setupLinkClasses =
  "inline-flex w-fit items-center rounded-lg border border-blue-chalk/25 px-4 py-2 font-sans text-sm font-medium text-blue-chalk transition-colors hover:border-biloba-flower/60 hover:bg-blue-chalk/5 pointer-coarse:min-h-11"

function PaymentsSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-4" role="status" aria-label="Loading payments">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-10 w-80 max-w-full" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}

/** Payments: clear the receipt queue, or see everyone. The period itself is set up in Payment Setup. */
export function HrPaymentsPage({ initialTab }: { initialTab: PaymentTab | null }) {
  const workspace = useHrPaymentWorkspace()
  const { campaign, dashboard, feedback, setFeedback, loading, loadError, pending, refresh, runBatch } = workspace
  const view = usePaymentsView(dashboard, initialTab, loading || Boolean(loadError))
  const unreleased = view.payments.filter(
    (payment) => payment.status === "verified" && payment.confirmationStatus !== "released",
  ).length

  return (
    <main className={hrPageShellClasses}>
      <SectionHeader
        eyebrow="// MEMBERSHIP"
        title="Payments"
        titleClassName={dashboardTitleClasses}
        level="h1"
        subtitle={loading || loadError ? undefined : periodLine(campaign)}
      />
      {loading ? (
        <PaymentsSkeleton />
      ) : loadError ? (
        <div className={errorWrapClasses}>
          <PaymentsLoadError
            message={loadError}
            action={
              <Button type="button" color="purple" className={retryClasses} onClick={() => window.location.reload()}>
                Try Again
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {dashboard ? (
            <PaymentsStatusStrip summary={dashboard.summary} active={view.stripActive} onPick={view.pickStatus} />
          ) : null}
          {needsPaymentSetup(campaign) ? (
            <div className={setupNoticeClasses}>
              <p>
                {campaign ? "The payment amount is not set yet." : "There is no payment period yet."} Set it up before
                opening payments.
              </p>
              <Link href={PAYMENT_SETUP_HREF} className={setupLinkClasses}>
                Open Payment Setup
              </Link>
            </div>
          ) : null}
          <PaymentsTabs
            tab={view.tab}
            onTabChange={view.setTab}
            reviewCount={view.queue.length}
            allCount={view.payments.length}
            actions={<PaymentsCollectionActions unreleased={unreleased} pending={pending} onRun={runBatch} />}
          />
          {feedback ? <ActionFeedback type={feedback.type} message={feedback.message} /> : null}
          <PaymentsListArea
            view={view}
            campaign={campaign}
            verified={dashboard?.summary.verified ?? 0}
            refresh={refresh}
            onFeedback={setFeedback}
          />
        </>
      )}
    </main>
  )
}
