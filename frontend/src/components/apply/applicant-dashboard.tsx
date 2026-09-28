"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ApplicantDashboardContent } from "@/components/apply/applicant-dashboard-content"
import { ApiError } from "@/lib/api/client"
import {
  getApplicantApplication,
  updateApplicantChoices,
  type ApplicantApplication,
} from "@/lib/api/applicant"
import {
  ApplicantDashboardHeaderSkeleton,
  ApplicantDashboardSkeleton,
} from "@/components/apply/applicant-dashboard-skeleton"
import { SectionHeader } from "@/components/shared/section-header"
import { glassPanelClasses } from "@/lib/site/surface"

const panelClasses = `${glassPanelClasses} min-w-0 w-full max-w-full overflow-x-clip px-4 py-8 md:px-10`
const missingClasses = "mt-8 font-sans text-sm text-prelude"

function ApplicantDashboardSectionHeader({ resultsReleased }: { resultsReleased: boolean }) {
  return (
    <SectionHeader
      eyebrow="// APPLICANT DASHBOARD"
      title={resultsReleased ? "Your Results" : "Your application"}
      titleClassName="max-w-none text-balance"
      subtitle={
        resultsReleased
          ? undefined
          : "Review what you submitted and update committee choices, documents, or your interview while recruitment week is open."
      }
    />
  )
}

type ApplicantDashboardProps = {
  initialApplication?: ApplicantApplication | null
}

export function ApplicantDashboard({
  initialApplication = null,
}: ApplicantDashboardProps) {
  const router = useRouter()
  const [application, setApplication] = useState<ApplicantApplication | null>(
    initialApplication,
  )
  const [loading, setLoading] = useState(initialApplication === null)
  const [error, setError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState("")
  const [pending, setPending] = useState(false)
  const [previewPositionId, setPreviewPositionId] = useState<string>()
  const [previewSlotId, setPreviewSlotId] = useState("")

  useEffect(() => {
    let cancelled = false
    getApplicantApplication()
      .then((payload) => {
        if (cancelled) return
        setApplication(payload)
        setError("")
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) {
          setError(
            "Your session expired. Open the application status page to sign in again."
          )
          return
        }
        setError(
          err instanceof Error ? err.message : "Could not load your application."
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function onSave(input: {
    choices: { positionId: string; preferenceRank: 1 | 2 }[]
    slotId?: string
    portfolioUrl?: string
    githubUrl?: string
  }) {
    setSaveError("")
    setSaveSuccess("")
    setPending(true)
    try {
      setApplication(await updateApplicantChoices(input))
      setPreviewPositionId(undefined)
      setPreviewSlotId("")
      setSaveSuccess("Committee choices saved.")
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/apply/status")
        return
      }
      setSaveError(
        err instanceof Error ? err.message : "Could not update committee choices."
      )
    } finally {
      setPending(false)
    }
  }

  const handlePreviewPositionIdChange = useCallback(
    (positionId: string | undefined) => {
      setPreviewPositionId(positionId)
      setPreviewSlotId("")
    },
    [],
  )

  if (loading) {
    return (
      <>
        <ApplicantDashboardHeaderSkeleton />
        <ApplicantDashboardSkeleton />
      </>
    )
  }

  if (error || !application) {
    return (
      <>
        <ApplicantDashboardSectionHeader resultsReleased={false} />
        <p className={missingClasses}>{error || "Application not found."}</p>
      </>
    )
  }

  const resultsReleased = Boolean(application.result)

  return (
    <>
      <ApplicantDashboardSectionHeader resultsReleased={resultsReleased} />
    <section className={panelClasses}>
      <ApplicantDashboardContent
        application={application}
        pending={pending}
        saveError={saveError}
        saveSuccess={saveSuccess}
        previewPositionId={previewPositionId}
        previewSlotId={previewSlotId}
        onPreviewSlotIdChange={setPreviewSlotId}
        onPreviewPositionIdChange={handlePreviewPositionIdChange}
        onSave={onSave}
        onApplicationUpdated={setApplication}
      />
    </section>
    </>
  )
}
