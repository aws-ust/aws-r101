"use client"

import { useRef, useState } from "react"
import { flushSync } from "react-dom"
import { downloadBlob } from "@/lib/members/download"
import {
  captureIdCard,
  idCardFileName,
  photoAsDataUrl,
  type IdCardExportSide,
} from "@/lib/members/id-card-export"

type ExportJob = { side: IdCardExportSide; photoUrl: string | null }

/**
 * Saves the member ID as a PNG: mounts the off-screen stage for the chosen
 * side, captures it, downloads it, then unmounts the stage.
 */
export function useMemberIdExport(memberId: string, photoUrl: string | null) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [job, setJob] = useState<ExportJob | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(side: IdCardExportSide) {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const inlinedPhoto = photoUrl && side !== "back" ? await photoAsDataUrl(photoUrl) : null
      // Mount the stage now so its node exists for the capture below.
      flushSync(() => setJob({ side, photoUrl: inlinedPhoto }))
      const node = stageRef.current
      if (!node) throw new Error("The card is not ready.")
      downloadBlob(idCardFileName(memberId, side), await captureIdCard(node))
      if (photoUrl && side !== "back" && !inlinedPhoto) {
        setError("Saved without your photo because it could not be loaded. Try again in a moment.")
      }
    } catch {
      setError("The image could not be saved. Try again.")
    } finally {
      setJob(null)
      setPending(false)
    }
  }

  return { stageRef, job, pending, error, save }
}
