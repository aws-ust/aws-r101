"use client"

import { Button } from "@/components/ui/button"
import { formatAppliedDate } from "@/lib/api"
import type { ApplicationDocument } from "@/lib/application-types"

const missingClasses = "font-sans text-sm text-prelude"
const documentCardClasses =
  "flex min-w-64 flex-1 flex-col gap-3 rounded-[14px] border border-blue-chalk/20 bg-haiti/35 p-4 text-left"
const documentNameClasses = "font-sans text-sm font-semibold text-blue-chalk"
const documentMetaClasses = "font-sans text-xs text-prelude"
const documentActionsClasses = "flex flex-wrap gap-2"
const documentButtonClasses = "h-9 px-4 text-xs"

function formatFileSize(bytes: number) {
  return `${(bytes / 1_000_000).toFixed(bytes < 1_000_000 ? 2 : 1)} MB`
}

export function HrApplicationDocumentActions({
  applicationId,
  document,
}: {
  applicationId: string
  document: ApplicationDocument | undefined
}) {
  if (!document) {
    return <p className={missingClasses}>Document metadata is not available.</p>
  }
  const expired = new Date(document.availableUntil) <= new Date()
  const baseUrl = `/api/applications/${applicationId}/documents/${document.documentType}`
  return (
    <div className={documentCardClasses}>
      <p className={documentNameClasses}>{document.fileName}</p>
      <p className={documentMetaClasses}>{formatFileSize(document.fileSizeBytes)}</p>
      <p className={documentMetaClasses}>
        Available until {formatAppliedDate(document.availableUntil)}
      </p>
      <div className={documentActionsClasses}>
        {expired ? (
          <>
            <Button color="cyan" className={documentButtonClasses} disabled>View</Button>
            <Button color="purple" className={documentButtonClasses} disabled>Download</Button>
          </>
        ) : (
          <>
          <Button
            color="cyan"
            className={documentButtonClasses}
            nativeButton={false}
            render={
              <a
                href={baseUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${document.fileName}`}
              />
            }
          >
            View
          </Button>
          <Button
            color="purple"
            className={documentButtonClasses}
            nativeButton={false}
            render={
              <a
                href={`${baseUrl}?disposition=attachment`}
                aria-label={`Download ${document.fileName}`}
              />
            }
          >
            Download
          </Button>
          </>
        )}
      </div>
      {expired ? <p className={documentMetaClasses}>This file has expired. The application metadata remains available.</p> : null}
    </div>
  )
}
