import { ApplyFlowTabs } from "@/components/apply-flow-tabs"

export default function ApplyLayout({ children }: LayoutProps<"/apply">) {
  return (
    <>
      <ApplyFlowTabs />
      {children}
    </>
  )
}
