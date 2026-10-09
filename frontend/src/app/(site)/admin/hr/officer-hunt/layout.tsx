import { RecruitmentTrackProvider } from "@/lib/recruitment-track"

/** Everything under here is the officer hunt, so lists, grids and results serve that round. */
export default function OfficerHuntLayout({
  children,
}: LayoutProps<"/admin/hr/officer-hunt">) {
  return (
    <RecruitmentTrackProvider track="officer_hunt">
      {children}
    </RecruitmentTrackProvider>
  )
}
