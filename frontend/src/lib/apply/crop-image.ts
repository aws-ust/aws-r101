export type PixelCrop = { x: number; y: number; width: number; height: number }

const OUTPUT_SIZE = 800
const JPEG_QUALITY = 0.9

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not read that image."))
    image.src = src
  })
}

/** Draws the cropped area onto a square canvas and returns it as a JPEG file. */
export async function cropToSquareFile(
  imageSrc: string,
  crop: PixelCrop,
  fileName: string,
): Promise<File> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement("canvas")
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Could not prepare the photo.")
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  )
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  )
  if (!blob) throw new Error("Could not prepare the photo.")
  const baseName = fileName.replace(/\.[^.]+$/, "") || "photo"
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" })
}
