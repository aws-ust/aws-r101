"use client"

import { Expand } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const thumbnailClasses =
  "group relative grid size-36 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-[14px] bg-white p-2 outline-none transition-shadow hover:ring-2 hover:ring-biloba-flower/60 focus-visible:ring-2 focus-visible:ring-aquamarine/60"
const thumbnailImageClasses = "size-full object-contain"
const expandBadgeClasses =
  "absolute right-1.5 bottom-1.5 grid size-6 place-items-center rounded-full bg-haiti/80 text-blue-chalk opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
const captionClasses = "mt-1 text-center font-sans text-[11px] text-prelude"
const dialogClasses = "sm:max-w-lg"
const fullFrameClasses = "mt-2 grid place-items-center rounded-[14px] bg-white p-4"
const fullImageClasses = "max-h-[70svh] w-auto object-contain"
const openLinkClasses =
  "mt-3 inline-flex w-fit font-mono text-xs text-prelude underline-offset-4 hover:text-blue-chalk hover:underline"

type QrPreviewProps = {
  src: string
  label: string
  caption: string
  fileName: string | null
}

/** QR thumbnail that opens a larger view so HR and finance can check or scan it. */
export function QrPreview({ src, label, caption, fileName }: QrPreviewProps) {
  const alt = `${label} payment QR`

  return (
    <figure>
      <Dialog>
        <DialogTrigger className={thumbnailClasses} aria-label={`View ${alt} full size`}>
          {/* Signed S3 and blob URLs are dynamic, so next/image cannot optimize them. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className={thumbnailImageClasses} />
          <span className={expandBadgeClasses} aria-hidden>
            <Expand className="size-3.5" />
          </span>
        </DialogTrigger>
        <DialogContent className={dialogClasses}>
          <DialogHeader>
            <DialogTitle>{label} QR</DialogTitle>
            <DialogDescription>{fileName ?? caption}</DialogDescription>
          </DialogHeader>
          <div className={fullFrameClasses}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className={fullImageClasses} />
          </div>
          <a href={src} target="_blank" rel="noopener noreferrer" className={openLinkClasses}>
            Open in a new tab
          </a>
        </DialogContent>
      </Dialog>
      <figcaption className={captionClasses}>{caption}</figcaption>
    </figure>
  )
}
