"use client"

import { Button } from "@/components/ui/button"
import { glassPanelClasses } from "@/lib/site/surface"

const actionsClasses = `${glassPanelClasses} flex flex-col gap-3 rounded-[20px] px-5 py-5 lg:flex-row lg:items-center lg:justify-between`
const buttonRowClasses = "flex flex-wrap gap-2"
const bodyClasses = "font-sans text-sm leading-relaxed text-prelude"

export function HrPaymentBatchActions({
  role,
  pending,
  verified,
  onRun,
}: {
  role: "hr" | "admin" | "finance"
  pending: boolean
  verified: number
  onRun: (
    kind: "release" | "retry-invitations" | "retry-confirmations",
  ) => Promise<void>
}) {
  const canReleaseConfirmations = role === "hr" || role === "admin"
  const description =
    canReleaseConfirmations
      ? "Member IDs are created after verification. Release confirmations when the batch is ready."
      : "The export contains verified members only."

  return (
    <section className={actionsClasses}>
      <p className={bodyClasses}>{description}</p>
      <div className={buttonRowClasses}>
        {role === "hr" || role === "admin" ? (
          <Button
            type="button"
            color="purple"
            disabled={pending}
            onClick={() => void onRun("retry-invitations")}
          >
            Retry invitation emails
          </Button>
        ) : null}
        {canReleaseConfirmations ? (
          <Button
            type="button"
            color="purple"
            disabled={pending}
            onClick={() => void onRun("retry-confirmations")}
          >
            Retry confirmation emails
          </Button>
        ) : null}
        {canReleaseConfirmations ? (
          <Button
            type="button"
            disabled={pending || !verified}
            onClick={() => void onRun("release")}
          >
            Release membership confirmations
          </Button>
        ) : null}
        <Button
          nativeButton={false}
          render={
            <a href="/api/membership-payments/export" download>
              Export verified members
            </a>
          }
        />
      </div>
    </section>
  )
}
