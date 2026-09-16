"use client"

import { LazyMotion, domAnimation, m } from "motion/react"
import {
<<<<<<< HEAD
=======
  lightningAnimation,
  lightningBoltClasses,
  lightningBolts,
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
  mouthSnap,
  rainContainerClasses,
  rainDropAnimation,
  rainDropClasses,
  rainDrops,
<<<<<<< HEAD
=======
  reducedMotionLightningAnimation,
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
  reducedMotionRainDropAnimation,
} from "./constants"

type HeroCloudRainProps = {
  reducedMotion: boolean | null
}

export function HeroCloudRain({ reducedMotion }: HeroCloudRainProps) {
  return (
    <LazyMotion features={domAnimation}>
      <div aria-hidden className={rainContainerClasses}>
<<<<<<< HEAD
=======
        {lightningBolts.map((lightningBolt) => (
          <m.svg
            key={lightningBolt.left}
            viewBox="0 0 100 160"
            className={lightningBoltClasses}
            style={{ left: lightningBolt.left }}
            animate={
              reducedMotion
                ? reducedMotionLightningAnimation
                : lightningAnimation
            }
            transition={
              reducedMotion
                ? mouthSnap
                : {
                    duration: lightningBolt.duration,
                    delay: lightningBolt.delay,
                    ease: "easeOut",
                    repeat: 2,
                  }
            }
          >
            <path d="M56 0 10 78h33L28 160 90 66H56Z" fill="currentColor" />
          </m.svg>
        ))}
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
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
