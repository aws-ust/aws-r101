"use client"

import { MemberIdCard } from "@/components/apply/member-id-card"
import { Button } from "@/components/ui/button"
import type { ApplicantApplication, ApplicantPayment, MemberCard } from "@/lib/api/applicant"
import { glassPanelClasses } from "@/lib/site/surface"

const panelClasses = `${glassPanelClasses} mt-6 rounded-[22px] px-5 py-6`
const eyebrowClasses = "font-mono text-[10px] uppercase tracking-[0.16em] text-aquamarine"
const titleClasses = "mt-2 font-sans text-2xl font-bold text-blue-chalk"
const bodyClasses = "mt-2 font-sans text-sm leading-relaxed text-prelude"
const cardAreaClasses = "mt-6 flex justify-center"
const groupsClasses = "mt-6 flex flex-col items-center gap-3 border-t border-blue-chalk/15 pt-6"
const groupsTitleClasses = "font-sans text-sm font-semibold text-blue-chalk"
const buttonRowClasses = "flex flex-wrap justify-center gap-3"

type MemberSectionProps = {
  payment: ApplicantPayment
  card: MemberCard
  application: Pick<ApplicantApplication, "firstName" | "lastName" | "studentNumber" | "section">
  onCardChange: (card: MemberCard) => void
}

function GroupLink({ href, label }: { href: string; label: string }) {
  return (
    <Button
      nativeButton={false}
      render={<a href={href} target="_blank" rel="noreferrer">{label}</a>}
    />
  )
}

function JoinGroups({ payment }: { payment: ApplicantPayment }) {
  if (!payment.membersGroupLink) return null
  return (
    <div className={groupsClasses}>
      <p className={groupsTitleClasses}>Join your AWS Builders groups</p>
      <div className={buttonRowClasses}>
        <GroupLink href={payment.membersGroupLink} label="Join the Members Facebook Group" />
        {payment.committeeChatLink ? (
          <GroupLink
            href={payment.committeeChatLink}
            label={`Join the ${payment.committeeName ?? "Committee"} Group Chat`}
          />
        ) : null}
      </div>
    </div>
  )
}

export function ApplicantMemberSection({ payment, card, application, onCardChange }: MemberSectionProps) {
  return (
    <section className={panelClasses} aria-labelledby="member-id-title">
      <p className={eyebrowClasses}>Membership</p>
      <h2 id="member-id-title" className={titleClasses}>You are a member</h2>
      <p className={bodyClasses}>
        Your payment is verified. This is your digital AWS Builders - UST member ID.
      </p>
      <div className={cardAreaClasses}>
        <MemberIdCard
          card={card}
          firstName={application.firstName}
          lastName={application.lastName}
          studentNumber={application.studentNumber}
          section={application.section}
          onCardChange={onCardChange}
        />
      </div>
      <JoinGroups payment={payment} />
    </section>
  )
}
