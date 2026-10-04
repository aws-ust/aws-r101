import Image from "next/image"

const backClasses =
  "absolute inset-0 flex flex-col items-center justify-between overflow-hidden rounded-[24px] border border-biloba-flower/40 bg-gradient-to-br from-haiti via-meteorite to-daisy-bush px-7 py-12 text-blue-chalk shadow-xl backface-hidden rotate-y-180"
const markClasses = "flex flex-1 flex-col items-center justify-center gap-4 text-center"
const logoClasses = "size-28 rounded-[20px] bg-white p-3"
const orgClasses = "font-sans text-xl font-extrabold leading-tight tracking-wide"
const taglineClasses = "font-mono text-[11px] tracking-[0.2em] text-aquamarine"
const signatureClasses = "flex w-full flex-col items-center gap-2"
const ruleClasses = "h-px w-full bg-blue-chalk/40"
const signatureLabelClasses = "font-mono text-[9px] font-bold tracking-[0.18em] text-blue-chalk/80"
const barcodeClasses =
  "flex h-14 w-full items-stretch justify-center gap-[2px] rounded-[6px] bg-white px-3 py-2"
const barcodeIdClasses = "font-mono text-[11px] font-bold tracking-[0.12em]"
const BAR_COUNT = 44

/** Deterministic bar widths (1-3px) so a Member ID always draws the same code. */
function barWidths(memberId: string) {
  const widths: number[] = []
  for (let round = 0; widths.length < BAR_COUNT; round++) {
    for (const char of memberId) {
      if (widths.length === BAR_COUNT) break
      widths.push(((char.charCodeAt(0) + round * 7) % 3) + 1)
    }
  }
  return widths
}

export function MemberIdCardBack({ memberId }: { memberId: string }) {
  return (
    <div className={backClasses}>
      <div className={markClasses}>
        <Image src="/aws-logo.png" alt="" width={96} height={96} className={logoClasses} />
        <p className={orgClasses}>AWS BUILDERS – UST</p>
        <p className={taglineClasses}>IT’S ALWAYS DAY ONE</p>
      </div>
      <div className={signatureClasses}>
        <div className={ruleClasses} />
        <p className={signatureLabelClasses}>MEMBER SIGNATURE</p>
        <div className={barcodeClasses} aria-hidden>
          {barWidths(memberId).map((width, index) => (
            <span
              key={index}
              className="bg-haiti"
              style={{ width: `${width}px`, opacity: index % 5 === 4 ? 0 : 1 }}
            />
          ))}
        </div>
        <p className={barcodeIdClasses}>{memberId}</p>
      </div>
    </div>
  )
}
