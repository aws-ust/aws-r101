"use client"

import { useSyncExternalStore } from "react"
import { QRCodeSVG } from "qrcode.react"

// White tear-off stub at the bottom of the card. The two "punches" are the
// card's own colour, so they read as notches cut into the stub's top edge.
const stubClasses =
  "relative mt-auto flex items-center gap-3 bg-white px-5 pb-4 pt-4 text-haiti"
const perforationClasses =
  "absolute inset-x-4 top-0 border-t-2 border-dashed border-haiti/25"
const punchClasses = "absolute -top-2.5 size-5 rounded-full bg-haiti"
const qrClasses = "size-[76px] shrink-0"
const qrPlaceholderClasses = "size-[76px] shrink-0 rounded-[6px] bg-haiti/10"
const headingClasses = "font-mono text-[10px] font-bold tracking-[0.16em]"
const metaClasses = "mt-1 font-sans text-[11px] leading-snug text-haiti/70"

// Fixed time zone so the server render and the browser agree on the date.
const issuedFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
  year: "numeric",
})

// The QR needs the site's own address, which only exists in the browser.
const subscribeToNothing = () => () => {}
const browserOrigin = () => window.location.origin
const serverOrigin = () => null

type MemberIdCardStubProps = {
  memberId: string
  academicYear: string
  issuedAt: string | null
}

export function MemberIdCardStub({ memberId, academicYear, issuedAt }: MemberIdCardStubProps) {
  const origin = useSyncExternalStore(subscribeToNothing, browserOrigin, serverOrigin)

  return (
    <div className={stubClasses}>
      <span className={perforationClasses} aria-hidden />
      <span className={`${punchClasses} -left-2.5`} aria-hidden />
      <span className={`${punchClasses} -right-2.5`} aria-hidden />
      {origin ? (
        <QRCodeSVG
          value={`${origin}/verify/${memberId}`}
          size={76}
          level="M"
          bgColor="#ffffff"
          fgColor="#170f33"
          className={qrClasses}
          title="Scan to verify this membership"
        />
      ) : (
        <span className={qrPlaceholderClasses} aria-hidden />
      )}
      <div className="min-w-0">
        <p className={headingClasses}>SCAN TO VERIFY</p>
        <p className={metaClasses}>
          {issuedAt ? `Issued ${issuedFormat.format(new Date(issuedAt))}` : "Issued this term"}
          <br />
          Valid for A.Y. {academicYear}
        </p>
      </div>
    </div>
  )
}
