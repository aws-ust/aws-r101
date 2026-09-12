import { Suspense } from "react"
import { PositionsBrowser } from "@/components/positions-browser"
import { PositionsBrowserSkeleton } from "@/components/positions-browser-skeleton"
import { listServerBrowserPositions } from "@/lib/positions-server"

async function PositionsContent() {
  const positions = await listServerBrowserPositions().catch(() => null)
  return positions ? <PositionsBrowser positions={positions} /> : <PositionsBrowser positions={[]} loadError />
}

export default function PositionsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-10 px-4 pb-16 pt-4 md:px-10">
      <Suspense fallback={<PositionsBrowserSkeleton />}>
        <PositionsContent />
      </Suspense>
    </main>
  )
}
