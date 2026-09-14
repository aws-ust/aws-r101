"use client"

import { LazyMotion, domAnimation, m } from "motion/react"
import {
  mouthSnap,
  rainContainerClasses,
  rainDropAnimation,
  rainDropClasses,
  rainDrops,
  reducedMotionRainDropAnimation,
} from "./constants"

type HeroCloudRainProps = {
  reducedMotion: boolean | null
}

export function HeroCloudRain({ reducedMotion }: HeroCloudRainProps) {
  return (
    <LazyMotion features={domAnimation}>
      <div aria-hidden className={rainContainerClasses}>
        {rainDrops.map((rainDrop) => (
          <m.span
            key={rainDrop.left}
            className={rainDropClasses}
            style={{ left: rainDrop.left }}
            animate={
              reducedMotion ? reducedMotionRainDropAnimation : rainDropAnimation
            }
            transition={
              reducedMotion
                ? mouthSnap
                : {
                    duration: rainDrop.duration,
                    delay: rainDrop.delay,
                    ease: "linear",
                    repeat: 3,
                  }
            }
          />
        ))}
      </div>
    </LazyMotion>
  )
}
