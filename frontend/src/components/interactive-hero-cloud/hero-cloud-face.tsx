"use client"

import { LazyMotion, domAnimation, m } from "motion/react"
import type { RefObject } from "react"
import { cn } from "@/lib/utils"
import {
  hurtFaceAnimation,
  hurtTransition,
  layerClasses,
  mouthSnap,
  mouthTransition,
  restingFaceAnimation,
} from "./constants"

type HeroCloudFaceProps = {
  faceRef: RefObject<HTMLDivElement | null>
  isHurt: boolean
  isUpset: boolean
  mouthPath: string
  reducedMotion: boolean | null
}

export function HeroCloudFace({
  faceRef,
  isHurt,
  isUpset,
  mouthPath,
  reducedMotion,
}: HeroCloudFaceProps) {
  return (
    <div ref={faceRef} className={cn(layerClasses, "will-change-transform")}>
      <LazyMotion features={domAnimation}>
        <m.svg
          aria-hidden="true"
          viewBox="0 0 2380 2380"
          className={layerClasses}
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
          />
        </m.svg>
      </LazyMotion>
    </div>
  )
}
