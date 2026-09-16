"use client"

import Image from "next/image"
<<<<<<< HEAD
import { useReducedMotion } from "motion/react"
import { cloudClasses, layerClasses } from "./interactive-hero-cloud/constants"
=======
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react"
import {
  cloudClasses,
  cloudImageClasses,
  layerClasses,
  mouthSnap,
  restingStormAnimation,
  stormShakeAnimation,
  stormShakeTransition,
} from "./interactive-hero-cloud/constants"
import { cn } from "@/lib/utils"
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
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
<<<<<<< HEAD
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
=======
      <LazyMotion features={domAnimation}>
        <m.div
          className={cn(layerClasses, "will-change-transform")}
          animate={
            isRaining && !reducedMotion
              ? stormShakeAnimation
              : restingStormAnimation
          }
          initial={false}
          transition={
            isRaining && !reducedMotion ? stormShakeTransition : mouthSnap
          }
        >
          <Image
            src="/hero/cloud.png"
            alt=""
            fill
            loading="lazy"
            quality={85}
            sizes="(max-width: 640px) 58vw, (max-width: 768px) 34vw, 540px"
            className={cn(
              cloudImageClasses,
              isRaining && "grayscale brightness-[.65] contrast-125",
            )}
            draggable={false}
          />
        </m.div>
      </LazyMotion>
      <HeroCloudFace
        faceRef={faceRef}
        isHurt={isHurt}
        isRaining={isRaining}
        isUpset={isUpset}
        mouthPath={mouthPath}
        reducedMotion={reducedMotion}
      />
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
    </button>
  )
}
