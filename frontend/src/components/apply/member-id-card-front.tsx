import { UserRound } from "lucide-react"
import Image from "next/image"

const frontClasses =
  "absolute inset-0 flex flex-col overflow-hidden rounded-[24px] border border-biloba-flower/40 bg-gradient-to-b from-meteorite to-haiti text-blue-chalk shadow-xl backface-hidden"
const headerClasses =
  "flex items-center gap-3 border-b border-blue-chalk/15 bg-haiti/60 px-6 py-5"
const logoClasses = "size-12 shrink-0 rounded-[12px] bg-white p-1.5"
const orgClasses = "min-w-0 flex-1 font-mono text-xs font-semibold leading-snug tracking-wide"
const ayClasses =
  "shrink-0 whitespace-nowrap rounded-pill bg-blue-chalk px-3 py-1 font-mono text-[10px] font-bold text-haiti"
const bodyClasses = "flex flex-1 flex-col items-center gap-4 px-6 py-5"
const titleClasses =
  "w-full border-b border-blue-chalk/15 pb-2 font-mono text-xs font-bold tracking-[0.14em] text-aquamarine"
const photoFrameClasses =
  "relative grid size-36 shrink-0 place-items-center overflow-hidden rounded-[10px] border-2 border-aquamarine bg-haiti/70"
const detailsClasses =
  "flex w-full flex-1 flex-col justify-center gap-1.5 rounded-[14px] bg-haiti/55 px-4 py-4 text-center"
const nameClasses = "break-words font-sans text-lg font-bold leading-tight tracking-wide"
const lineClasses = "font-sans text-sm text-blue-chalk/85"
const positionClasses = "font-sans text-sm font-semibold leading-snug text-aquamarine"
const idClasses = "font-mono text-sm font-bold tracking-wider text-biloba-flower"
const dividerClasses = "my-1 h-px w-full bg-blue-chalk/15"

type MemberIdCardFrontProps = {
  fullName: string
  studentNumber: string
  section: string
  position: string
  memberId: string
  academicYear: string
  photoUrl: string | null
}

export function MemberIdCardFront({
  fullName,
  studentNumber,
  section,
  position,
  memberId,
  academicYear,
  photoUrl,
}: MemberIdCardFrontProps) {
  return (
    <div className={frontClasses}>
      <div className={headerClasses}>
        <Image src="/aws-logo.png" alt="" width={40} height={40} className={logoClasses} />
        <p className={orgClasses}>AWS BUILDERS – UST</p>
        <span className={ayClasses}>A.Y. {academicYear}</span>
      </div>
      <div className={bodyClasses}>
        <p className={titleClasses}>OFFICIAL MEMBER PASS</p>
        <div className={photoFrameClasses}>
          {photoUrl ? (
            // Signed S3 URLs are dynamic, so next/image cannot optimize them.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={fullName} className="size-full object-cover" />
          ) : (
            <UserRound className="size-12 text-prelude" aria-hidden />
          )}
        </div>
        <div className={detailsClasses}>
          <p className={nameClasses}>{fullName}</p>
          <p className={lineClasses}>{studentNumber}</p>
          <div className={dividerClasses} />
          <p className={positionClasses}>{position}</p>
          <div className={dividerClasses} />
          <p className={lineClasses}>{section}</p>
          <div className={dividerClasses} />
          <p className={idClasses}>{memberId}</p>
        </div>
      </div>
    </div>
  )
}
