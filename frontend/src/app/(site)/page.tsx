import { Hero } from "@/components/hero"
import { HomeDeferredSections } from "@/components/home-deferred-sections"

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-10 px-4 pb-12 pt-16 md:pb-16">
      <Hero />
      <HomeDeferredSections />
    </main>
  )
}
