import { Button } from "@/components/ui/button"

const groupsClasses = "mt-6 flex flex-col items-center gap-3 border-t border-blue-chalk/15 pt-6"
const groupsTitleClasses = "font-sans text-sm font-semibold text-blue-chalk"
const buttonRowClasses = "flex flex-wrap justify-center gap-3"

export type ApplicantGroupLinksProps = {
  membersGroupLink: string | null
  committeeChatLink: string | null
  committeeName: string | null
}

function GroupLink({ href, label }: { href: string; label: string }) {
  return (
    <Button
      nativeButton={false}
      render={<a href={href} target="_blank" rel="noreferrer">{label}</a>}
    />
  )
}

/** Join buttons for the Members Facebook Group and the committee group chat. */
export function ApplicantGroupLinks({
  membersGroupLink,
  committeeChatLink,
  committeeName,
}: ApplicantGroupLinksProps) {
  if (!membersGroupLink && !committeeChatLink) return null
  return (
    <div className={groupsClasses}>
      <p className={groupsTitleClasses}>Join your AWS Builders groups</p>
      <div className={buttonRowClasses}>
        {membersGroupLink ? (
          <GroupLink href={membersGroupLink} label="Join the Members Facebook Group" />
        ) : null}
        {committeeChatLink ? (
          <GroupLink
            href={committeeChatLink}
            label={`Join the ${committeeName ?? "Committee"} Group Chat`}
          />
        ) : null}
      </div>
    </div>
  )
}
