"use client"

import dynamic from "next/dynamic"
import { LazyWhenVisible } from "@/components/lazy-when-visible"

const AboutUs = dynamic(() =>
  import("@/components/about-us").then((mod) => mod.AboutUs),
)
const MissionVision = dynamic(() =>
  import("@/components/mission-vision").then((mod) => mod.MissionVision),
)
const OurMoments = dynamic(() =>
  import("@/components/our-moments").then((mod) => mod.OurMoments),
)
const StackSection = dynamic(() =>
  import("@/components/stack-section").then((mod) => mod.StackSection),
)
const Committees = dynamic(() =>
  import("@/components/committees").then((mod) => mod.Committees),
)
const FAQSection = dynamic(() =>
  import("@/components/faq-section").then((mod) => mod.FAQSection),
)
const PeopleDirectory = dynamic(() =>
  import("@/components/people/people-directory").then((mod) => mod.PeopleDirectory),
)
const CareersSection = dynamic(() =>
  import("@/components/careers-section").then((mod) => mod.CareersSection),
)

export function HomeDeferredSections() {
  return (
    <>
      <LazyWhenVisible minHeight="12rem" anchorId="about-us">
        <AboutUs />
      </LazyWhenVisible>
      <LazyWhenVisible minHeight="12rem">
        <MissionVision />
      </LazyWhenVisible>
      <LazyWhenVisible minHeight="28rem" anchorId="our-moments">
        <OurMoments />
      </LazyWhenVisible>
      <LazyWhenVisible minHeight="10rem">
        <StackSection />
      </LazyWhenVisible>
      <LazyWhenVisible minHeight="22rem" anchorId="committees">
        <Committees />
      </LazyWhenVisible>
      <LazyWhenVisible minHeight="14rem">
        <FAQSection />
      </LazyWhenVisible>
      <LazyWhenVisible minHeight="24rem" anchorId="people">
        <PeopleDirectory />
      </LazyWhenVisible>
      <LazyWhenVisible minHeight="14rem" anchorId="careers">
        <CareersSection />
      </LazyWhenVisible>
    </>
  )
}
