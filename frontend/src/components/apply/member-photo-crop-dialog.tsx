"use client"

import { useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { cropToSquareFile } from "@/lib/apply/crop-image"

const contentClasses = "sm:max-w-md"
const cropAreaClasses = "relative mt-2 aspect-square w-full overflow-hidden rounded-[16px] bg-haiti"
const zoomRowClasses = "mt-4 flex items-center gap-3"
const zoomLabelClasses = "font-mono text-[10px] tracking-[0.14em] text-prelude"
const errorClasses = "mt-2 font-sans text-xs text-rose-glow"
const MIN_ZOOM = 1
const MAX_ZOOM = 3

type MemberPhotoCropDialogProps = {
  imageSrc: string
  fileName: string
  onCancel: () => void
  onCropped: (file: File) => void
}

/** Lets a member drag and zoom their photo into the square ID frame before upload. */
export function MemberPhotoCropDialog({
  imageSrc,
  fileName,
  onCancel,
  onCropped,
}: MemberPhotoCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [area, setArea] = useState<Area | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function confirm() {
    if (!area) return
    setPending(true)
    setError("")
    try {
      onCropped(await cropToSquareFile(imageSrc, area, fileName))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not crop the photo.")
      setPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onCancel() }}>
      <DialogContent className={contentClasses}>
        <DialogHeader>
          <DialogTitle>Adjust your ID photo</DialogTitle>
          <DialogDescription>Drag to position your photo and use the slider to zoom.</DialogDescription>
        </DialogHeader>
        <div className={cropAreaClasses}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            aspect={1}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
          />
        </div>
        <div className={zoomRowClasses}>
          <span className={zoomLabelClasses}>ZOOM</span>
          <Slider
            aria-label="Zoom"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onValueChange={(value) => setZoom(Array.isArray(value) ? value[0] : value)}
          />
        </div>
        {error ? <p className={errorClasses} role="alert">{error}</p> : null}
        <DialogFooter>
          <Button type="button" color="purple" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" color="cyan" disabled={pending || !area} onClick={() => void confirm()}>
            {pending ? "Saving…" : "Use photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
