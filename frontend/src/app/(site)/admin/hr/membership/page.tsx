import { redirect } from "next/navigation"

/** Verification now lives in Payments, on the To review tab. */
export default function MembershipPaymentsPage() {
  redirect("/admin/hr/payments?tab=review")
}
