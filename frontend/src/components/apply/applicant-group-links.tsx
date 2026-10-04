import type { ReactNode } from "react"
import { ArrowUpRight, MessagesSquare, UsersRound } from "lucide-react"

const groupsClasses = "mt-6 flex flex-col gap-4 border-t border-blue-chalk/15 pt-6"
const groupsTitleClasses = "font-sans text-sm font-semibold text-blue-chalk"
const groupsHelpClasses = "mt-1 font-sans text-xs text-prelude"
const gridClasses = "grid gap-3 sm:grid-cols-2"
const linkClasses =
  "group flex min-w-0 items-center gap-3 rounded-[16px] border border-aquamarine/35 bg-aquamarine/10 px-4 py-3 text-left outline-none transition-colors hover:border-aquamarine/60 hover:bg-aquamarine/20 focus-visible:ring-2 focus-visible:ring-aquamarine/50"
const iconClasses =
  "grid size-10 shrink-0 place-items-center rounded-full bg-aquamarine/20 text-aquamarine"
const linkTextClasses = "min-w-0 flex-1"
const linkTitleClasses = "block truncate font-sans text-sm font-semibold text-blue-chalk"
const linkSubtitleClasses = "block truncate font-sans text-xs text-prelude"
const arrowClasses =
  "size-4 shrink-0 text-prelude transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-aquamarine"

export type ApplicantGroupLinksProps = {
  membersGroupLink: string | null
  committeeChatLink: string | null
  committeeName: string | null
}

function GroupLink({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string
  icon: ReactNode
  title: string
  subtitle: string
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={linkClasses}>
      <span className={iconClasses} aria-hidden>
        {icon}
      </span>
      <span className={linkTextClasses}>
        <span className={linkTitleClasses}>{title}</span>
        <span className={linkSubtitleClasses}>{subtitle}</span>
      </span>
      <ArrowUpRight className={arrowClasses} aria-hidden />
    </a>
  )
}

/** Join links for the Members Facebook Group and the committee group chat. */
export function ApplicantGroupLinks({
  membersGroupLink,
  committeeChatLink,
  committeeName,
}: ApplicantGroupLinksProps) {
  if (!membersGroupLink && !committeeChatLink) return null
  return (
    <div className={groupsClasses}>
      <div>
        <p className={groupsTitleClasses}>Join your AWS Builders groups</p>
        <p className={groupsHelpClasses}>
          Stay updated with announcements and meet your fellow Builders.
        </p>
      </div>
      <div className={gridClasses}>
        {membersGroupLink ? (
          <GroupLink
            href={membersGroupLink}
            icon={<UsersRound className="size-5" />}
            title="Members Facebook Group"
            subtitle="Join all AWS Builders members"
          />
        ) : null}
        {committeeChatLink ? (
          <GroupLink
            href={committeeChatLink}
            icon={<MessagesSquare className="size-5" />}
            title={`${committeeName ?? "Committee"} Group Chat`}
            subtitle="Join your committee"
          />
        ) : null}
      </div>
    </div>
  )
}
