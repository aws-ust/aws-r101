"use client"

import { useState } from "react"
import { RotateCw } from "lucide-react"
import { MemberIdCardBack } from "@/components/apply/member-id-card-back"
import { MemberIdCardFront } from "@/components/apply/member-id-card-front"
import { MemberPhotoButton } from "@/components/apply/member-photo-button"
import { MemberPhotoCropDialog } from "@/components/apply/member-photo-crop-dialog"
import { useMemberPhotoUpload } from "@/components/apply/use-member-photo-upload"
import { Button } from "@/components/ui/button"
import type { MemberCard } from "@/lib/api/applicant"
import { cn } from "@/lib/utils"

const wrapperClasses = "flex flex-col items-center gap-4"
// Portrait CR80 ID proportions (54 x 85.6 mm), at a comfortable on-screen width.
const sceneClasses = "relative aspect-[54/85.6] w-[22rem] max-w-full perspective-distant"
const flipperBaseClasses =
  "relative size-full transition-transform duration-700 ease-in-out transform-3d motion-reduce:transition-none"
const flippedClasses = "rotate-y-180"
// Invisible click target over the whole card, so a mouse click anywhere flips it.
const flipOverlayClasses = "absolute inset-0 z-10 cursor-pointer rounded-[24px] outline-none"
const flipButtonClasses = "gap-2 px-4"
const actionsClasses = "flex flex-wrap items-center justify-center gap-3"
const errorClasses = "text-center font-sans text-xs text-rose-glow"

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
  const [chosenPhoto, setChosenPhoto] = useState<{ src: string; name: string } | null>(null)
  const photo = useMemberPhotoUpload(onCardChange)

  function closeCrop() {
    if (chosenPhoto) URL.revokeObjectURL(chosenPhoto.src)
    setChosenPhoto(null)
  }

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
          />
          <MemberIdCardBack memberId={card.memberId} />
        </div>
        {/* Mouse shortcut only: the Show back button below is the keyboard and
            screen-reader control, so this stays out of the tab order. */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          className={flipOverlayClasses}
          onClick={() => setFlipped((current) => !current)}
        />
      </div>
      <div className={actionsClasses}>
        <MemberPhotoButton
          hasPhoto={card.photoUrl !== null}
          pending={photo.pending}
          onChoosePhoto={(file) => setChosenPhoto({ src: URL.createObjectURL(file), name: file.name })}
        />
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
      {photo.error ? <p className={errorClasses} role="alert">{photo.error}</p> : null}
      {chosenPhoto ? (
        <MemberPhotoCropDialog
          imageSrc={chosenPhoto.src}
          fileName={chosenPhoto.name}
          onCancel={closeCrop}
          onCropped={(file) => {
            closeCrop()
            void photo.upload(file)
          }}
        />
      ) : null}
    </div>
  )
}
