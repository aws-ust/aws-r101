"use client"

import Image from "next/image"
import { useReducedMotion } from "motion/react"
import { cloudClasses, layerClasses } from "./interactive-hero-cloud/constants"
import { HeroCloudClickHint } from "./interactive-hero-cloud/hero-cloud-click-hint"
import { HeroCloudFace } from "./interactive-hero-cloud/hero-cloud-face"
import { HeroCloudRain } from "./interactive-hero-cloud/hero-cloud-rain"
import { useInteractiveHeroCloud } from "./interactive-hero-cloud/use-interactive-hero-cloud"

export function InteractiveHeroCloud() {
  const reducedMotion = useReducedMotion()
  const {
    cloudRef,
    faceRef,
    handleCloudClick,
    isHurt,
    isRaining,
    isUpset,
    mouthPath,
    showClickHint,
  } = useInteractiveHeroCloud()

  return (
    <button
      ref={cloudRef}
      type="button"
      data-interactive-hero-cloud
      className={cloudClasses}
      aria-label="Click the cloud for a reaction"
      onClick={handleCloudClick}
    >
      {showClickHint ? <HeroCloudClickHint /> : null}
      {isRaining ? <HeroCloudRain reducedMotion={reducedMotion} /> : null}
      <Image
        src="/hero/cloud.png"
        alt=""
        fill
        loading="lazy"
        quality={85}
        sizes="(max-width: 640px) 58vw, (max-width: 768px) 34vw, 540px"
        className={layerClasses}
        draggable={false}
      />
      <HeroCloudFace
        faceRef={faceRef}
        isHurt={isHurt}
        isUpset={isUpset}
        mouthPath={mouthPath}
        reducedMotion={reducedMotion}
      />
    </button>
  )
}
