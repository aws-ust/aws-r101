"use client"

import { LazyMotion, domAnimation, m } from "motion/react"
import type { RefObject } from "react"
import { cn } from "@/lib/utils"
import {
<<<<<<< HEAD
  hurtFaceAnimation,
  hurtTransition,
  layerClasses,
  mouthSnap,
  mouthTransition,
  restingFaceAnimation,
=======
  heroCloudFaceColor,
  heroCloudFaceMotion,
  layerClasses,
  mouthSnap,
  mouthTransition,
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
} from "./constants"

type HeroCloudFaceProps = {
  faceRef: RefObject<HTMLDivElement | null>
  isHurt: boolean
<<<<<<< HEAD
=======
  isRaining: boolean
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
  isUpset: boolean
  mouthPath: string
  reducedMotion: boolean | null
}

<<<<<<< HEAD
export function HeroCloudFace({
  faceRef,
  isHurt,
=======
type HeroCloudFaceFeaturesProps = {
  faceColor: string
  isHurtOnly: boolean
  isRaining: boolean
  isUpset: boolean
  mouthPath: string
  reducedMotion: boolean | null
}

function HeroCloudFaceFeatures({
  faceColor,
  isHurtOnly,
  isRaining,
  isUpset,
  mouthPath,
  reducedMotion,
}: HeroCloudFaceFeaturesProps) {
  return (
    <>
      <m.g
        animate={{ opacity: isUpset ? 0 : 1 }}
        initial={false}
        transition={reducedMotion ? mouthSnap : mouthTransition}
      >
        <circle cx="683" cy="1191" r="51" fill={faceColor} />
        <circle cx="1696" cy="1191" r="51" fill={faceColor} />
      </m.g>
      <m.g
        animate={{ opacity: isHurtOnly ? 1 : 0 }}
        initial={false}
        transition={reducedMotion ? mouthSnap : mouthTransition}
      >
        <path
          d="M 620 1135 L 735 1191 L 620 1247"
          fill="none"
          stroke={faceColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="48"
        />
        <path
          d="M 1760 1135 L 1645 1191 L 1760 1247"
          fill="none"
          stroke={faceColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="48"
        />
      </m.g>
      <m.g
        animate={{ opacity: isRaining ? 1 : 0 }}
        initial={false}
        transition={reducedMotion ? mouthSnap : mouthTransition}
      >
        <path
          d="M 560 1112 L 804 1172"
          fill="none"
          stroke={faceColor}
          strokeLinecap="round"
          strokeWidth="52"
        />
        <path
          d="M 1776 1112 L 1532 1172"
          fill="none"
          stroke={faceColor}
          strokeLinecap="round"
          strokeWidth="52"
        />
        <circle cx="690" cy="1220" r="36" fill={faceColor} />
        <circle cx="1646" cy="1220" r="36" fill={faceColor} />
      </m.g>
      <m.path
        animate={{ d: mouthPath }}
        initial={false}
        transition={reducedMotion ? mouthSnap : mouthTransition}
        fill="none"
        stroke={faceColor}
        strokeLinecap="round"
        strokeWidth="100"
      />
    </>
  )
}

export function HeroCloudFace({
  faceRef,
  isHurt,
  isRaining,
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
  isUpset,
  mouthPath,
  reducedMotion,
}: HeroCloudFaceProps) {
<<<<<<< HEAD
=======
  const isHurtOnly = isHurt && !isRaining
  const faceColor = heroCloudFaceColor(isRaining)
  const motion = heroCloudFaceMotion(isHurt, isRaining, reducedMotion)

>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
  return (
    <div ref={faceRef} className={cn(layerClasses, "will-change-transform")}>
      <LazyMotion features={domAnimation}>
        <m.svg
          aria-hidden="true"
          viewBox="0 0 2380 2380"
          className={layerClasses}
<<<<<<< HEAD
          animate={
            isHurt && !reducedMotion ? hurtFaceAnimation : restingFaceAnimation
          }
          initial={false}
          transition={reducedMotion ? mouthSnap : hurtTransition}
        >
          <m.g
            animate={{ opacity: isUpset ? 0 : 1 }}
            initial={false}
            transition={reducedMotion ? mouthSnap : mouthTransition}
          >
            <circle cx="683" cy="1191" r="51" fill="rgb(93 55 166)" />
            <circle cx="1696" cy="1191" r="51" fill="rgb(93 55 166)" />
          </m.g>
          <m.g
            animate={{ opacity: isUpset ? 1 : 0 }}
            initial={false}
            transition={reducedMotion ? mouthSnap : mouthTransition}
          >
            <path
              d="M 620 1135 L 735 1191 L 620 1247"
              fill="none"
              stroke="rgb(93 55 166)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="48"
            />
            <path
              d="M 1760 1135 L 1645 1191 L 1760 1247"
              fill="none"
              stroke="rgb(93 55 166)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="48"
            />
          </m.g>
          <m.path
            animate={{ d: mouthPath }}
            initial={false}
            transition={reducedMotion ? mouthSnap : mouthTransition}
            fill="none"
            stroke="rgb(93 55 166)"
            strokeLinecap="round"
            strokeWidth="100"
=======
          animate={motion.animation}
          initial={false}
          transition={motion.transition}
        >
          <HeroCloudFaceFeatures
            faceColor={faceColor}
            isHurtOnly={isHurtOnly}
            isRaining={isRaining}
            isUpset={isUpset}
            mouthPath={mouthPath}
            reducedMotion={reducedMotion}
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
          />
        </m.svg>
      </LazyMotion>
    </div>
  )
}
