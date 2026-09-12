import { Suspense } from "react"
import { PositionsBrowser } from "@/components/positions-browser"
import { PositionsBrowserSkeleton } from "@/components/positions-browser-skeleton"
import { listServerBrowserPositions } from "@/lib/positions-server"
import { applyFlowInsetClasses } from "@/lib/surface"

async function PositionsContent() {
  const positions = await listServerBrowserPositions().catch(() => null)
  return positions ? <PositionsBrowser positions={positions} /> : <PositionsBrowser positions={[]} loadError />
}

export default function PositionsPage() {
  return (
    <main
      className={`mx-auto flex w-full min-w-0 max-w-[1180px] flex-1 flex-col gap-10 overflow-x-clip pb-16 pt-4 ${applyFlowInsetClasses}`}
    >
      <Suspense fallback={<PositionsBrowserSkeleton />}>
        <PositionsContent />
      </Suspense>
    </main>
  )
}
