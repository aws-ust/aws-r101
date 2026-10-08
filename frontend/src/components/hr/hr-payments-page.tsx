"use client"

import { HrPaymentCampaignPanel } from "@/components/hr/hr-payment-campaign-panel"
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
import { periodLine, type PaymentTab } from "@/lib/payments/workspace"
import { dashboardActionTargetClasses, dashboardTitleClasses } from "@/lib/site/dashboard-surface"
import { hrPageShellClasses } from "@/lib/site/surface"

const setupClasses = "mt-6"
const errorWrapClasses = "mt-6"
const retryClasses = `mt-2 px-4 ${dashboardActionTargetClasses}`

function PaymentsSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-4" role="status" aria-label="Loading payments">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-10 w-80 max-w-full" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}

/** Payments: clear the receipt queue, see everyone, set up the period. */
export function HrPaymentsPage({ initialTab }: { initialTab: PaymentTab | null }) {
  const workspace = useHrPaymentWorkspace()
  const { campaign, dashboard, feedback, setFeedback, loading, loadError, pending, refresh, runBatch } = workspace
  const view = usePaymentsView(dashboard, campaign, initialTab, loading || Boolean(loadError))
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
          <PaymentsTabs
            tab={view.tab}
            onTabChange={view.setTab}
            reviewCount={view.queue.length}
            allCount={view.payments.length}
            setupIncomplete={!campaign || campaign.amountCents === null}
            actions={<PaymentsCollectionActions unreleased={unreleased} pending={pending} onRun={runBatch} />}
          />
          {feedback ? <ActionFeedback type={feedback.type} message={feedback.message} /> : null}
          {view.tab === "setup" ? (
            <div className={setupClasses}>
              <HrPaymentCampaignPanel
                campaign={campaign}
                committees={workspace.committees}
                role={workspace.role}
                pending={pending}
                onCampaign={workspace.setCampaign}
                onPending={workspace.setPending}
                onFeedback={setFeedback}
              />
            </div>
          ) : (
            <PaymentsListArea
              view={view}
              campaign={campaign}
              verified={dashboard?.summary.verified ?? 0}
              refresh={refresh}
              onFeedback={setFeedback}
            />
          )}
        </>
      )}
    </main>
  )
}
