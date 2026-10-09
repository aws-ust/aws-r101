"use client"

import type { ReactNode } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { PaymentTab } from "@/lib/payments/workspace"

const rowClasses = "mt-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
const countClasses = "rounded-pill bg-blue-chalk/10 px-2 py-0.5 font-sans text-xs tabular-nums text-prelude"

type PaymentsTabsProps = {
  tab: PaymentTab
  onTabChange: (tab: PaymentTab) => void
  reviewCount: number
  allCount: number
  actions: ReactNode
}

export function PaymentsTabs({ tab, onTabChange, reviewCount, allCount, actions }: PaymentsTabsProps) {
  return (
    <div className={rowClasses}>
      <Tabs value={tab} onValueChange={(next) => onTabChange(next as PaymentTab)}>
        <TabsList variant="line" aria-label="Payments view">
          <TabsTrigger value="review">
            To review <span className={countClasses}>{reviewCount}</span>
          </TabsTrigger>
          <TabsTrigger value="all">
            All payments <span className={countClasses}>{allCount}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {actions}
    </div>
  )
}
