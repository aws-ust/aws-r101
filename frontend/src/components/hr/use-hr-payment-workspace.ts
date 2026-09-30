"use client"

import { useCallback, useEffect, useState } from "react"
import {
  getSession,
  listCommitteeApplicationStatuses,
  type CommitteeApplicationStatus,
} from "@/lib/api/client"
import {
  getPaymentCampaign,
  getPaymentDashboard,
  releaseMembershipConfirmations,
  retryMembershipConfirmationEmails,
  retryPaymentInvitationEmails,
  type PaymentCampaign,
  type PaymentDashboard,
  type PaymentListItem,
} from "@/lib/api/payments"

export type HrPaymentFeedback = { type: "success" | "error"; message: string }

export function useHrPaymentWorkspace() {
  const [campaign, setCampaign] = useState<PaymentCampaign | null>(null)
  const [dashboard, setDashboard] = useState<PaymentDashboard | null>(null)
  const [committees, setCommittees] = useState<CommitteeApplicationStatus[]>([])
  const [role, setRole] = useState<"hr" | "admin">("hr")
  const [selected, setSelected] = useState<PaymentListItem | null>(null)
  const [feedback, setFeedback] = useState<HrPaymentFeedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  const refresh = useCallback(async () => {
    const [campaignResponse, dashboardResponse] = await Promise.all([
      getPaymentCampaign(),
      getPaymentDashboard(),
    ])
    setCampaign(campaignResponse.campaign)
    setDashboard(dashboardResponse)
  }, [])

  useEffect(() => {
    getSession()
      .then(async (session) => {
        const committeeRequest = listCommitteeApplicationStatuses()
        const [campaignResponse, dashboardResponse, committeeRows] =
          await Promise.all([
            getPaymentCampaign(),
            getPaymentDashboard(),
            committeeRequest,
          ])
        return { campaignResponse, dashboardResponse, session, committeeRows }
      })
      .then(({ campaignResponse, dashboardResponse, session, committeeRows }) => {
        setCampaign(campaignResponse.campaign)
        setDashboard(dashboardResponse)
        setRole(session.role)
        setCommittees(committeeRows)
      })
      .catch((caught) =>
        setFeedback({
          type: "error",
          message:
            caught instanceof Error ? caught.message : "Could not load payments.",
        }),
      )
      .finally(() => setLoading(false))
  }, [])

  async function runBatch(
    kind: "release" | "retry-invitations" | "retry-confirmations",
  ) {
    setPending(true)
    setFeedback(null)
    try {
      if (kind === "release") {
        const result = await releaseMembershipConfirmations()
        setFeedback({
          type: "success",
          message: `Released ${result.released} membership confirmations. ${result.emailDelivery.sent} emails sent${result.emailDelivery.failed ? `; ${result.emailDelivery.failed} failed.` : "."}`,
        })
      } else {
        const result =
          kind === "retry-invitations"
            ? await retryPaymentInvitationEmails()
            : await retryMembershipConfirmationEmails()
        const label =
          kind === "retry-invitations" ? "invitation" : "confirmation"
        setFeedback({
          type: "success",
          message: `Retried ${result.retried} ${label} emails. ${result.sent} sent${result.failed ? `; ${result.failed} still failed.` : "."}`,
        })
      }
      await refresh()
    } catch (caught) {
      setFeedback({
        type: "error",
        message:
          caught instanceof Error ? caught.message : "Could not complete the action.",
      })
    } finally {
      setPending(false)
    }
  }

  return {
    campaign,
    setCampaign,
    dashboard,
    committees,
    role,
    selected,
    setSelected,
    feedback,
    setFeedback,
    loading,
    pending,
    setPending,
    refresh,
    runBatch,
  }
}
