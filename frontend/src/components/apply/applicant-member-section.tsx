"use client"

import { ApplicantGroupLinks } from "@/components/apply/applicant-group-links"
import { MemberIdCard } from "@/components/apply/member-id-card"
import type { ApplicantApplication, ApplicantPayment, MemberCard } from "@/lib/api/applicant"
import { glassPanelClasses } from "@/lib/site/surface"

const panelClasses = `${glassPanelClasses} mt-6 rounded-[22px] px-5 py-6`
const eyebrowClasses = "font-mono text-[10px] uppercase tracking-[0.16em] text-aquamarine"
const titleClasses = "mt-2 font-sans text-2xl font-bold text-blue-chalk"
const cardAreaClasses = "mt-6 flex justify-center"

type MemberSectionProps = {
  payment: ApplicantPayment
  card: MemberCard
  application: Pick<ApplicantApplication, "firstName" | "lastName" | "studentNumber" | "section">
  onCardChange: (card: MemberCard) => void
}

export function ApplicantMemberSection({ payment, card, application, onCardChange }: MemberSectionProps) {
  return (
    <section className={panelClasses} aria-labelledby="member-id-title">
      <p className={eyebrowClasses}>Membership</p>
      <h2 id="member-id-title" className={titleClasses}>Official Digital Membership ID</h2>
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
      <ApplicantGroupLinks
        membersGroupLink={payment.membersGroupLink}
        committeeChatLink={payment.committeeChatLink}
        committeeName={payment.committeeName}
        coreTeamChatLink={payment.coreTeamChatLink}
      />
    </section>
  )
}
