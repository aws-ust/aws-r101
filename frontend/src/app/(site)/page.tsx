import { Hero } from "@/components/hero"
import { AboutUs } from "@/components/about-us"
import { MissionVision } from "@/components/mission-vision"
import { OurMoments } from "@/components/our-moments"
import { Committees } from "@/components/committees"
import { StackSection } from "@/components/stack-section"
import { PeopleDirectory } from "@/components/people/people-directory"
import { FAQSection } from "@/components/faq-section"
import { CareersSection } from "@/components/careers-section"

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-10 px-4 pb-12 pt-16 md:pb-16">
      <Hero />
      <AboutUs />
      <MissionVision />
      <OurMoments />
      <StackSection />
      <PeopleDirectory />
      <Committees />
      <FAQSection />
      <CareersSection />
    </main>
  )
}
