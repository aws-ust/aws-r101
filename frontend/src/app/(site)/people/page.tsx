import type { Metadata } from "next"
import { PeopleDirectory } from "@/components/people/people-directory"

export const metadata: Metadata = {
  title: "People – AWS Builders – UST",
}

export default function PeoplePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-10 px-4 pb-16 pt-16 md:px-10">
      <PeopleDirectory />
    </main>
  )
}
