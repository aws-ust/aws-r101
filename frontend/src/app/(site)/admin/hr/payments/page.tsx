import { HrPaymentsPage } from "@/components/hr/hr-payments-page"
import { parsePaymentTab } from "@/lib/payments/workspace"

export default async function PaymentsPage({ searchParams }: PageProps<"/admin/hr/payments">) {
  const { tab } = await searchParams
  return <HrPaymentsPage initialTab={parsePaymentTab(tab)} />
}
