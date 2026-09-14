"use client"



import { useState } from "react"

import Link from "next/link"

import { useParams, useRouter, useSearchParams } from "next/navigation"

import { StatusPill } from "@/components/hr/status-pill"

import { HrApplicationDetailSkeleton } from "@/components/hr/application-detail-skeleton"

import { HrArchiveApplicantDialog } from "@/components/hr/hr-archive-applicant-dialog"

import { HrDeleteApplicantDialog } from "@/components/hr/hr-delete-applicant-dialog"

import { HrApplicationDetailPanel } from "@/components/hr/hr-application-detail-panel"

import { useApplication } from "@/lib/api"

import {

  displayTitleLeadingClasses,

  glassPanelClasses,

  pageShellClasses,

} from "@/lib/surface"

import { cn } from "@/lib/utils"



const eyebrowClasses =

  "w-fit font-mono text-xs font-medium uppercase tracking-wide text-aquamarine"

const backClasses =

  "mb-3 mt-3 inline-flex font-mono text-xs text-prelude hover:text-blue-chalk"

const headingRowClasses = "flex flex-wrap items-center gap-3"

const titleClasses = `max-w-full font-sans text-4xl font-bold text-balance break-words text-blue-chalk md:text-5xl ${displayTitleLeadingClasses}`

const panelClasses = `${glassPanelClasses} mt-8 min-w-0 overflow-x-clip px-4 py-8 sm:px-6 md:px-10`

const archivedPillClasses =

  "rounded-pill bg-daisy-bush/55 px-3 py-1 font-mono text-xs text-blue-chalk"

const missingClasses = "font-sans text-sm text-prelude"



export function HrApplicationDetail() {

  const { id } = useParams<{ id: string }>()

  const router = useRouter()
  const searchParams = useSearchParams()

  const { application, setApplication, loading, error, notFound } =

    useApplication(id)

  const [archiveOpen, setArchiveOpen] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)



  if (loading) {

    return <HrApplicationDetailSkeleton />

  }



  if (error) {

    return (

      <main className={pageShellClasses}>

        <Link href="/admin/hr" className={backClasses}>

          ← Back to Applications

        </Link>

        <p className={missingClasses}>{error}</p>

      </main>

    )

  }



  if (notFound || !application) {

    return (

      <main className={pageShellClasses}>

        <Link href="/admin/hr" className={backClasses}>

          ← Back to Applications

        </Link>

        <p className={missingClasses}>That application was not found.</p>

      </main>

    )

  }



  const fromArchive = searchParams.get("source") === "archive"
  const viewingArchive = Boolean(application.archivedAt) || fromArchive
  const listHref = viewingArchive ? "/admin/hr/archive" : "/admin/hr"
  const backLabel = viewingArchive
    ? "← Back to Archive"
    : "← Back to Applications"



  return (

    <main className={cn(pageShellClasses, "min-w-0 max-w-full overflow-x-clip")}>

      <p className={eyebrowClasses}>

        {viewingArchive ? "// ARCHIVE" : "// APPLICATIONS"}

      </p>

      <Link href={listHref} className={backClasses}>

        {backLabel}

      </Link>

      <div className={headingRowClasses}>

        <h2 className={titleClasses}>

          {application.firstName} {application.lastName}

        </h2>

        <StatusPill status={application.status} />

        {viewingArchive ? (

          <span className={archivedPillClasses}>Archived</span>

        ) : null}

      </div>

      <div className={panelClasses}>

        <HrApplicationDetailPanel

          application={application}

          onUpdated={setApplication}

          onArchiveClick={() => setArchiveOpen(true)}

          onDeleteClick={() => setDeleteOpen(true)}

        />

      </div>

      <HrArchiveApplicantDialog

        application={archiveOpen ? application : null}

        onOpenChange={setArchiveOpen}

        onChanged={(updated) => {

          router.replace(

            updated.archivedAt
              ? "/admin/hr/archive?notice=archived"
              : "/admin/hr?notice=restored"

          )

        }}

      />

      <HrDeleteApplicantDialog

        application={deleteOpen ? application : null}

        onOpenChange={setDeleteOpen}

        onDeleted={() => {

          router.replace("/admin/hr/archive?notice=deleted")

        }}

      />

    </main>

  )

}


