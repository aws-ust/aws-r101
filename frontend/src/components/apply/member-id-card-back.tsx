import Image from "next/image"
import { MemberIdCloud } from "@/components/apply/member-id-cloud"

// The brand side: Espi on a flat white cloud with the wordmark, centred as one
// group, and flat purple clouds around them. No gradients.
const backClasses =
  "absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[22px] bg-haiti px-6 py-8 text-center text-white shadow-xl backface-hidden rotate-y-180"
const heroClasses = "relative grid w-full place-items-center pt-2"
const espiCloudClasses = "absolute bottom-1 h-28 w-[92%]"
const espiClasses = "relative h-auto w-[82%]"
const brandClasses = "relative mt-6 flex flex-col gap-2"
const wordmarkClasses = "font-sans text-xl font-extrabold tracking-[0.04em]"
const taglineClasses = "font-mono text-[10px] tracking-[0.28em] text-prelude"

const cloudFill = "bg-daisy-bush/70"
const cloudTopLeftClasses = "absolute -left-6 top-6 h-10 w-24"
const cloudTopRightClasses = "absolute -right-8 top-24 h-12 w-28"
const cloudLowLeftClasses = "absolute -left-4 bottom-24 h-8 w-20"
const cloudBottomRightClasses = "absolute -right-6 bottom-8 h-10 w-24"

export function MemberIdCardBack() {
  return (
    <div className={backClasses}>
      <MemberIdCloud className={cloudTopLeftClasses} fillClassName={cloudFill} />
      <MemberIdCloud className={cloudTopRightClasses} fillClassName={cloudFill} />
      <MemberIdCloud className={cloudLowLeftClasses} fillClassName={cloudFill} />
      <MemberIdCloud className={cloudBottomRightClasses} fillClassName={cloudFill} />
      <div className={heroClasses}>
        <MemberIdCloud className={espiCloudClasses} fillClassName="bg-white" />
        <Image src="/espi.png" alt="Espi, the AWS Builders – UST mascot" width={1080} height={1080} className={espiClasses} />
      </div>
      <div className={brandClasses}>
        <p className={wordmarkClasses}>AWS BUILDERS – UST</p>
        <p className={taglineClasses}>IT’S ALWAYS DAY ONE</p>
      </div>
    </div>
  )
}
