import dynamic from "next/dynamic"

const PageTransition = dynamic(() =>
  import("@/components/page-transition").then((mod) => mod.PageTransition),
)

export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
