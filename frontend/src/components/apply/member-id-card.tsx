"use client"

import { useState } from "react"
import { RotateCw } from "lucide-react"
import { MemberIdCardBack } from "@/components/apply/member-id-card-back"
import { MemberIdCardFront } from "@/components/apply/member-id-card-front"
import { useMemberPhotoUpload } from "@/components/apply/use-member-photo-upload"
import { Button } from "@/components/ui/button"
import type { MemberCard } from "@/lib/api/applicant"
import { cn } from "@/lib/utils"

const wrapperClasses = "flex flex-col items-center gap-4"
// Portrait CR80 ID proportions (54 x 85.6 mm), at a comfortable on-screen width.
const sceneClasses = "aspect-[54/85.6] w-[22rem] max-w-full perspective-distant"
const flipperBaseClasses =
  "relative size-full transition-transform duration-700 ease-in-out transform-3d motion-reduce:transition-none"
const flippedClasses = "rotate-y-180"
const flipButtonClasses = "gap-2 px-4"

type MemberIdCardProps = {
  card: MemberCard
  firstName: string
  lastName: string
  studentNumber: string | null
  section: string | null
  onCardChange: (card: MemberCard) => void
}

function academicYearLabel(recruitmentYear: number) {
  return `${recruitmentYear}-${recruitmentYear + 1}`
}

export function MemberIdCard({
  card,
  firstName,
  lastName,
  studentNumber,
  section,
  onCardChange,
}: MemberIdCardProps) {
  const [flipped, setFlipped] = useState(false)
  const photo = useMemberPhotoUpload(onCardChange)

  return (
    <div className={wrapperClasses}>
      <div className={sceneClasses}>
        <div className={cn(flipperBaseClasses, flipped && flippedClasses)}>
          <MemberIdCardFront
            fullName={`${firstName} ${lastName}`.toUpperCase()}
            studentNumber={studentNumber ?? "—"}
            section={section ?? "—"}
            position={card.position}
            memberId={card.memberId}
            academicYear={academicYearLabel(card.recruitmentYear)}
            photoUrl={card.photoUrl}
            photoPending={photo.pending}
            photoError={photo.error}
            onChoosePhoto={(file) => void photo.upload(file)}
          />
          <MemberIdCardBack memberId={card.memberId} />
        </div>
      </div>
      <Button
        type="button"
        color="purple"
        className={flipButtonClasses}
        aria-pressed={flipped}
        onClick={() => setFlipped((current) => !current)}
      >
        <RotateCw className="size-4" aria-hidden />
        {flipped ? "Show front" : "Show back"}
      </Button>
    </div>
  )
}
