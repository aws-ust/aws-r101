import type { ReactNode } from "react"
import { UserRound } from "lucide-react"
import Image from "next/image"
import { MemberIdCardStub } from "@/components/apply/member-id-card-stub"
import { MemberIdCloud } from "@/components/apply/member-id-cloud"

// "Day One Pass": a flat, ticket-style front. Solid navy, white elements,
// and a white verify stub at the bottom.
const frontClasses =
  "absolute inset-0 flex flex-col overflow-hidden rounded-[22px] bg-haiti text-white shadow-xl backface-hidden"
const contentClasses = "relative flex flex-col"
const headerClasses = "flex items-center gap-2.5 px-5 pt-5"
const logoChipClasses = "grid size-9 shrink-0 place-items-center rounded-[10px] bg-white"
const orgClasses = "min-w-0 flex-1 font-mono text-[10px] font-bold leading-snug tracking-[0.08em]"
const orgSubClasses = "block font-normal tracking-[0.14em] text-prelude"
const ayClasses =
  "shrink-0 whitespace-nowrap rounded-pill border-[1.5px] border-white px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.06em]"
const photoFrameClasses =
  "mx-auto mt-5 grid size-36 place-items-center overflow-hidden rounded-[14px] border-[3px] border-white bg-jacarta"
const nameClasses =
  "mt-4 px-5 text-center font-sans text-[21px] font-extrabold uppercase leading-[1.1] text-balance break-words"
const positionClasses =
  "mt-1.5 px-5 text-center font-sans text-[13px] font-medium leading-snug text-white/85 text-balance"
// Member ID leads on its own row; student number and section share the next.
const gridClasses = "mt-5 grid grid-cols-2 gap-x-3 gap-y-3 px-5 pb-5 text-center"
const memberIdCellClasses = "col-span-2"
const labelClasses = "font-mono text-[9px] tracking-[0.16em] text-prelude"
const valueClasses = "mt-0.5 font-mono text-[13px] font-semibold tracking-[0.04em] tabular-nums"
const memberIdValueClasses = "mt-0.5 font-mono text-[17px] font-bold tracking-[0.12em] tabular-nums"

// Flat purple clouds drifting behind the content, so the face is not bare.
const cloudFill = "bg-daisy-bush/70"
const cloudTopRightClasses = "absolute -right-6 top-16 h-10 w-24"
const cloudLeftClasses = "absolute -left-8 top-44 h-12 w-28"
const cloudLowRightClasses = "absolute -right-4 top-[19rem] h-8 w-20"

type MemberIdCardFrontProps = {
  fullName: string
  studentNumber: string
  section: string
  position: string
  memberId: string
  academicYear: string
  issuedAt: string | null
  photoUrl: string | null
}

function Detail({
  label,
  children,
  className,
  valueClassName = valueClasses,
}: {
  label: string
  children: ReactNode
  className?: string
  valueClassName?: string
}) {
  return (
    <div className={className}>
      <dt className={labelClasses}>{label}</dt>
      <dd className={valueClassName}>{children}</dd>
    </div>
  )
}

export function MemberIdCardFront({
  fullName,
  studentNumber,
  section,
  position,
  memberId,
  academicYear,
  issuedAt,
  photoUrl,
}: MemberIdCardFrontProps) {
  return (
    <div className={frontClasses}>
      <MemberIdCloud className={cloudTopRightClasses} fillClassName={cloudFill} />
      <MemberIdCloud className={cloudLeftClasses} fillClassName={cloudFill} />
      <MemberIdCloud className={cloudLowRightClasses} fillClassName={cloudFill} />
      <div className={contentClasses}>
        <div className={headerClasses}>
          <span className={logoChipClasses}>
            <Image src="/aws-logo.png" alt="AWS Builders – UST logo" width={32} height={32} />
          </span>
          <p className={orgClasses}>
            AWS BUILDERS – UST
            <span className={orgSubClasses}>MEMBER PASS</span>
          </p>
          <span className={ayClasses}>A.Y. {academicYear}</span>
        </div>
        <div className={photoFrameClasses}>
          {photoUrl ? (
            // Signed S3 URLs are dynamic, so next/image cannot optimize them.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={fullName} className="size-full object-cover" />
          ) : (
            <UserRound className="size-14 text-prelude" aria-hidden />
          )}
        </div>
        <p className={nameClasses}>{fullName}</p>
        <p className={positionClasses}>{position}</p>
        <dl className={gridClasses}>
          <Detail label="MEMBER ID" className={memberIdCellClasses} valueClassName={memberIdValueClasses}>
            {memberId}
          </Detail>
          <Detail label="STUDENT NO.">{studentNumber}</Detail>
          <Detail label="SECTION">{section}</Detail>
        </dl>
      </div>
      <MemberIdCardStub memberId={memberId} academicYear={academicYear} issuedAt={issuedAt} />
    </div>
  )
}
