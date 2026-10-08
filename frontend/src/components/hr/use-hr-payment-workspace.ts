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
} from "@/lib/api/payments"

export type HrPaymentFeedback = { type: "success" | "error"; message: string }

export function useHrPaymentWorkspace() {
  const [campaign, setCampaign] = useState<PaymentCampaign | null>(null)
  const [dashboard, setDashboard] = useState<PaymentDashboard | null>(null)
  const [committees, setCommittees] = useState<CommitteeApplicationStatus[]>([])
  const [role, setRole] = useState<"hr" | "admin">("hr")
  const [feedback, setFeedback] = useState<HrPaymentFeedback | null>(null)
  const [loading, setLoading] = useState(true)
  // Kept apart from action feedback: a failed load must not read as "not set up".
  const [loadError, setLoadError] = useState("")
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
        setLoadError(caught instanceof Error ? caught.message : "Could not load payments."),
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
          message: `Released ${result.released} membership confirmations. ${result.emailDelivery.queued} emails are being sent in the background.`,
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
          message:
            result.retried === 0
              ? `There were no failed ${label} emails to retry.`
              : `Queued ${result.retried} ${label} emails to send again in the background.`,
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
    feedback,
    setFeedback,
    loading,
    loadError,
    pending,
    setPending,
    refresh,
    runBatch,
  }
}
