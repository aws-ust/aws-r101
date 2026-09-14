import { HrApplicationList } from "@/components/hr/application-list"

export default async function HrArchiveApplicationsPage({
  searchParams,
}: PageProps<"/admin/hr/archive">) {
  const { notice } = await searchParams
  return (
    <HrApplicationList
      variant="archived"
      notice={typeof notice === "string" ? notice : undefined}
    />
  )
}
