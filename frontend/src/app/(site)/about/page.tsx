import type { Metadata } from "next"
import { AboutUs } from "@/components/about-us"
import { MissionVision } from "@/components/mission-vision"
import { OurMoments } from "@/components/our-moments"

export const metadata: Metadata = {
  title: "About – AWS Builders – UST",
}

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-10 px-4 pb-16 pt-20 md:pt-24">
      <AboutUs />
      <MissionVision />
      <OurMoments />
    </main>
  )
}
