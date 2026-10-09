"use client"

import { useState } from "react"
import { ChevronDown, Download, MailCheck, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { dashboardActionTargetClasses } from "@/lib/site/dashboard-surface"
import { cn } from "@/lib/utils"

// End-of-collection tools beside the tabs: export, email retries, and the
// one bulk send, which always asks first.
const rowClasses = "grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center"
const wideOnlyClasses = "max-sm:hidden"
const iconClasses = "size-4 max-sm:hidden"
const dialogButtonClasses = cn("px-4", dashboardActionTargetClasses)
const actionClasses = cn("gap-1.5 px-2 sm:gap-2 sm:px-4", dashboardActionTargetClasses)
const exportClasses = cn(buttonVariants({ color: "purple" }), actionClasses)
const menuTriggerClasses = cn(buttonVariants({ color: "purple" }), actionClasses)
const menuClasses =
  "min-w-[15rem] rounded-[14px] border border-blue-chalk/25 bg-haiti p-1 text-blue-chalk shadow-md ring-1 ring-blue-chalk/15"
const itemClasses =
  "cursor-pointer rounded-md px-2 py-2 font-sans text-sm text-blue-chalk data-highlighted:bg-biloba-flower data-highlighted:text-haiti pointer-coarse:min-h-11"

export type CollectionRun = "release" | "retry-invitations" | "retry-confirmations"

type PaymentsCollectionActionsProps = {
  /** Verified members whose confirmation has not gone out yet. */
  unreleased: number
  pending: boolean
  onRun: (kind: CollectionRun) => Promise<void>
}

export function PaymentsCollectionActions({ unreleased, pending, onRun }: PaymentsCollectionActionsProps) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className={rowClasses}>
      <a href="/api/membership-payments/export" download className={exportClasses}>
        <Download className={iconClasses} aria-hidden />
        Export<span className={wideOnlyClasses}> Verified</span>
      </a>
      <DropdownMenu>
        <DropdownMenuTrigger type="button" className={menuTriggerClasses} disabled={pending}>
          <RotateCcw className={iconClasses} aria-hidden />
          Retry<span className={wideOnlyClasses}> Emails</span>
          <ChevronDown className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={menuClasses}>
          <DropdownMenuItem className={itemClasses} onClick={() => void onRun("retry-invitations")}>
            Failed payment invitations
          </DropdownMenuItem>
          <DropdownMenuItem className={itemClasses} onClick={() => void onRun("retry-confirmations")}>
            Failed membership confirmations
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        color="purple"
        className={actionClasses}
        disabled={pending || unreleased === 0}
        onClick={() => setConfirming(true)}
      >
        <MailCheck className={iconClasses} aria-hidden />
        Release<span className={wideOnlyClasses}> Confirmations</span> ({unreleased})
      </Button>
      <Dialog open={confirming} onOpenChange={(open) => !pending && setConfirming(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release {unreleased} membership confirmations?</DialogTitle>
            <DialogDescription>
              Each verified member who has not had one yet gets their membership confirmation email with their Member
              ID. Emails go out in the background.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" color="purple" className={dialogButtonClasses} disabled={pending} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              color="purple"
              className={dialogButtonClasses}
              disabled={pending}
              onClick={() => void onRun("release").then(() => setConfirming(false))}
            >
              {pending ? "Releasing…" : `Release ${unreleased}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
