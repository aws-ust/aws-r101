import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Hero } from "@/components/hero"
import { Committees } from "@/components/committees"
import { StackSection } from "@/components/stack-section"
import { FAQSection } from "@/components/faq-section"

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-10 px-4 pb-12 pt-16 md:pb-16">
      <Hero />
      <StackSection />
      <Committees />
      <FAQSection />
    </main>
  )
}

