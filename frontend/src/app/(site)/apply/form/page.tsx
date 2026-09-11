import { ApplyForm } from "@/components/apply/apply-form"

export default async function ApplyFormPage({
  searchParams,
}: PageProps<"/apply/form">) {
  const { position } = await searchParams
  const initialPositionId = typeof position === "string" ? position : undefined

  return <ApplyForm initialPositionId={initialPositionId} />
}
