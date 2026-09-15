"use client"

import Image from "next/image"
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react"
import { useEffect, useEffectEvent, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const interactiveElementSelector = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  "summary",
  '[role="button"]:not([aria-disabled="true"])',
  '[role="link"]:not([aria-disabled="true"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",")

const primaryNavigationLinkSelector = 'a[data-href]'
const cloudSelector = '[data-interactive-hero-cloud]'
const cloudClasses =
  "hero-cloud-float relative z-20 -mt-[clamp(5rem,12vw,10rem)] aspect-square w-[clamp(260px,30vw,400px)] cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aquamarine/70 max-md:w-[clamp(210px,58vw,320px)] max-[700px]:-mt-[clamp(4rem,12vw,5.5rem)] max-[700px]:w-[clamp(190px,56vw,280px)]"
const layerClasses = "absolute inset-0 h-full w-full object-contain"
const cloudImageClasses =
  `${layerClasses} transition-[filter] duration-300 motion-reduce:transition-none`
const clickHintClasses =
  "pointer-events-none absolute -right-6 top-[12%] z-30 animate-pulse rounded-pill border border-biloba-flower/40 bg-meteorite/85 px-3 py-1 font-mono text-[0.625rem] text-blue-chalk shadow-[0_6px_16px_rgba(23,15,51,0.35)] before:absolute before:-bottom-2 before:left-4 before:size-2 before:rounded-full before:border before:border-biloba-flower/40 before:bg-meteorite/85 after:absolute after:-bottom-4 after:left-2.5 after:size-1 after:rounded-full after:bg-meteorite/85 max-md:-right-4 max-md:px-2 max-md:text-[0.55rem]"
const rainContainerClasses =
  "pointer-events-none absolute inset-x-[15%] top-[62%] z-[-1] h-[70%] overflow-hidden"
const rainDropClasses =
  "absolute top-0 h-6 w-px rounded-pill bg-blue-chalk/85 shadow-[0_0_6px_rgba(183,140,240,0.8)]"
const lightningBoltClasses =
  "absolute top-[4%] h-28 w-14 text-blue-chalk drop-shadow-[0_0_12px_rgba(90,240,192,0.9)]"
const rainDrops = [
  { left: "5%", delay: 0.12, duration: 0.68 },
  { left: "14%", delay: 0.36, duration: 0.76 },
  { left: "25%", delay: 0.04, duration: 0.72 },
  { left: "36%", delay: 0.28, duration: 0.82 },
  { left: "47%", delay: 0.18, duration: 0.7 },
  { left: "58%", delay: 0.42, duration: 0.78 },
  { left: "68%", delay: 0.08, duration: 0.74 },
  { left: "78%", delay: 0.32, duration: 0.8 },
  { left: "89%", delay: 0.22, duration: 0.7 },
] as const
const lightningBolts = [
  { left: "24%", delay: 0.18, duration: 0.82 },
  { left: "62%", delay: 0.72, duration: 0.9 },
] as const
const neutralMouthPath = "M 918 1190 Q 1168 1190 1418 1190"
const smilingMouthPath = "M 910 1158 Q 1168 1420 1428 1158"
const frowningMouthPath = "M 910 1222 Q 1168 960 1428 1222"
const hurtReactionDuration = 650
const rapidClickThreshold = 4
const rapidClickWindow = 2_000
const rainDuration = 2_800
const rainCooldownDuration = 6_000
const rainDropAnimation = {
  y: ["0%", "1800%"],
  opacity: [0, 1, 0],
}
const reducedMotionRainDropAnimation = { opacity: 0.7 }
const lightningAnimation = {
  opacity: [0, 1, 0, 0.85, 0],
  scale: [0.9, 1, 1, 1.08, 0.9],
}
const reducedMotionLightningAnimation = { opacity: 0.8 }
const normalFaceColor = "rgb(93 55 166)"
const stormFaceColor = "rgb(31 41 55)"
const hurtFaceAnimation = {
  x: [0, -4, 3, -2, 1, 0],
  y: [0, 2, -2, 1, 0],
  scaleX: [1, 1.08, 0.97, 1.03, 1],
  scaleY: [1, 0.92, 1.04, 0.98, 1],
  rotate: 0,
}
const restingFaceAnimation = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 }
const stormShakeAnimation = {
  x: [0, -3, 3, -3, 3, -2, 2, 0],
  rotate: [0, -1, 1, -1, 1, -0.5, 0.5, 0],
}
const restingStormAnimation = { x: 0, rotate: 0 }
const stormFaceAnimation = {
  ...stormShakeAnimation,
  y: 0,
  scaleX: 1,
  scaleY: 1,
}
const stormShakeTransition = {
  duration: 0.4,
  ease: "linear" as const,
  repeat: 6,
}
const hurtTransition = {
  type: "tween" as const,
  duration: 0.5,
  ease: [0.36, 0, 0.66, -0.56] as const,
}
const mouthTransition = {
  type: "tween" as const,
  duration: 0.35,
  ease: [0.4, 0, 0.2, 1] as const,
}
const mouthSnap = { duration: 0 }

type CloudExpression = "neutral" | "smile" | "frown"

function isPrimaryNavigationTab(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest(primaryNavigationLinkSelector))
  )
}

function getExpression(target: EventTarget | null): CloudExpression {
  if (!(target instanceof Element)) return "neutral"
  if (target.closest(cloudSelector)) return "neutral"
  if (isPrimaryNavigationTab(target)) return "frown"
  return target.closest(interactiveElementSelector) ? "smile" : "neutral"
}

export function InteractiveHeroCloud() {
  const reducedMotion = useReducedMotion()
  const cloudRef = useRef<HTMLButtonElement>(null)
  const faceRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const hurtTimeoutRef = useRef<number | null>(null)
  const rainTimeoutRef = useRef<number | null>(null)
  const rainCooldownTimeoutRef = useRef<number | null>(null)
  const recentClickTimesRef = useRef<number[]>([])
  const rainOnCooldownRef = useRef(false)
  const currentPositionRef = useRef({ x: 0, y: 0 })
  const targetPositionRef = useRef({ x: 0, y: 0 })
  const pointerExpressionRef = useRef<CloudExpression>("neutral")
  const focusExpressionRef = useRef<CloudExpression>("neutral")
  const [expression, setExpression] = useState<CloudExpression>("neutral")
  const [isHurt, setIsHurt] = useState(false)
  const [isRaining, setIsRaining] = useState(false)
  const [showClickHint, setShowClickHint] = useState(true)
  const isUpset = isHurt || isRaining
  const isHurtOnly = isHurt && !isRaining
  const faceColor = isRaining ? stormFaceColor : normalFaceColor
  const mouthPath = isUpset
    ? frowningMouthPath
    : expression === "smile"
      ? smilingMouthPath
      : expression === "frown"
        ? frowningMouthPath
        : neutralMouthPath

  function syncExpression() {
    setExpression(
      pointerExpressionRef.current !== "neutral"
        ? pointerExpressionRef.current
        : focusExpressionRef.current
    )
  }

  function animateFace() {
    const face = faceRef.current
    if (!face) {
      animationFrameRef.current = null
      return
    }

    const current = currentPositionRef.current
    const target = targetPositionRef.current
    current.x += (target.x - current.x) * 0.16
    current.y += (target.y - current.y) * 0.16

    face.style.transform =
      "translate3d(" + current.x + "px, " + current.y + "px, 0)"

    if (
      Math.abs(target.x - current.x) < 0.1 &&
      Math.abs(target.y - current.y) < 0.1
    ) {
      current.x = target.x
      current.y = target.y
      face.style.transform =
        "translate3d(" + target.x + "px, " + target.y + "px, 0)"
      animationFrameRef.current = null
      return
    }

    animationFrameRef.current = requestAnimationFrame(animateFace)
  }

  function queueFaceAnimation() {
    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(animateFace)
    }
  }

  const resetFace = useEffectEvent(() => {
    targetPositionRef.current = { x: 0, y: 0 }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      currentPositionRef.current = { x: 0, y: 0 }
      if (faceRef.current) {
        faceRef.current.style.transform = "translate3d(0, 0, 0)"
      }
      return
    }

    queueFaceAnimation()
  })

  function triggerHurtReaction() {
    if (hurtTimeoutRef.current !== null) {
      window.clearTimeout(hurtTimeoutRef.current)
    }
    setShowClickHint(false)
    setIsHurt(true)
    hurtTimeoutRef.current = window.setTimeout(() => {
      setIsHurt(false)
      hurtTimeoutRef.current = null
    }, hurtReactionDuration)
  }

  function triggerRain() {
    rainOnCooldownRef.current = true
    setIsRaining(true)
    rainTimeoutRef.current = window.setTimeout(() => {
      setIsRaining(false)
      rainTimeoutRef.current = null
    }, rainDuration)
    rainCooldownTimeoutRef.current = window.setTimeout(() => {
      rainOnCooldownRef.current = false
      rainCooldownTimeoutRef.current = null
    }, rainCooldownDuration)
  }

  function handleCloudClick() {
    triggerHurtReaction()

    const now = Date.now()
    const recentClickTimes = recentClickTimesRef.current.filter(
      (time) => now - time < rapidClickWindow
    )
    recentClickTimes.push(now)
    recentClickTimesRef.current = recentClickTimes

    if (
      !rainOnCooldownRef.current &&
      recentClickTimes.length >= rapidClickThreshold
    ) {
      recentClickTimesRef.current = []
      triggerRain()
    }
  }

  const handlePointerMove = useEffectEvent(
    (event: globalThis.PointerEvent) => {
      const pointerExpression =
        event.pointerType === "touch" ? "neutral" : getExpression(event.target)
      if (pointerExpressionRef.current !== pointerExpression) {
        pointerExpressionRef.current = pointerExpression
        syncExpression()
      }

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches

      if (event.pointerType === "touch" || reducedMotion) {
        if (reducedMotion) resetFace()
        return
      }

      const cloud = cloudRef.current
      if (!cloud) return

      const bounds = cloud.getBoundingClientRect()
      const centerX = bounds.left + bounds.width / 2
      const centerY = bounds.top + bounds.height / 2
      const horizontalRatio =
        (event.clientX - centerX) / (bounds.width * 0.5)
      const verticalRatio =
        (event.clientY - centerY) / (bounds.height * 0.5)
      const horizontalLimit = Math.min(40, Math.max(25, bounds.width * 0.074))
      const downwardLimit = Math.min(60, Math.max(30, bounds.width * 0.11))
      const upwardLimit = Math.min(24, Math.max(14, bounds.width * 0.045))
      const clampedHorizontal = Math.max(-1, Math.min(1, horizontalRatio))
      const clampedVertical = Math.max(-1, Math.min(1, verticalRatio))
      const isUpperRight = clampedHorizontal > 0 && clampedVertical < 0
      const upperRightHorizontalLimit = Math.min(
        28,
        Math.max(18, bounds.width * 0.052)
      )
      const upperRightUpwardLimit = Math.min(
        20,
        Math.max(12, bounds.width * 0.038)
      )

      targetPositionRef.current = {
        x:
          clampedHorizontal *
          (isUpperRight ? upperRightHorizontalLimit : horizontalLimit),
        y:
          clampedVertical < 0
            ? clampedVertical *
              (isUpperRight ? upperRightUpwardLimit : upwardLimit)
            : clampedVertical * downwardLimit,
      }
      queueFaceAnimation()
    }
  )

  const handlePointerLeave = useEffectEvent(() => {
    pointerExpressionRef.current = "neutral"
    syncExpression()
    resetFace()
  })

  const handleNavigationClick = useEffectEvent(
    (event: globalThis.MouseEvent) => {
      if (!isPrimaryNavigationTab(event.target)) return
      pointerExpressionRef.current = "neutral"
      focusExpressionRef.current = "neutral"
      syncExpression()
    }
  )

  const handleFocusIn = useEffectEvent((event: globalThis.FocusEvent) => {
    focusExpressionRef.current = getExpression(event.target)
    syncExpression()
  })

  const handleFocusOut = useEffectEvent((event: globalThis.FocusEvent) => {
    focusExpressionRef.current = getExpression(event.relatedTarget)
    syncExpression()
  })

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerleave", handlePointerLeave)
    window.addEventListener("click", handleNavigationClick)
    window.addEventListener("focusin", handleFocusIn)
    window.addEventListener("focusout", handleFocusOut)
    window.addEventListener("resize", handlePointerLeave)
    window.addEventListener("scroll", handlePointerLeave, { passive: true })

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerleave", handlePointerLeave)
      window.removeEventListener("click", handleNavigationClick)
      window.removeEventListener("focusin", handleFocusIn)
      window.removeEventListener("focusout", handleFocusOut)
      window.removeEventListener("resize", handlePointerLeave)
      window.removeEventListener("scroll", handlePointerLeave)
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (hurtTimeoutRef.current !== null) {
        window.clearTimeout(hurtTimeoutRef.current)
      }
      if (rainTimeoutRef.current !== null) {
        window.clearTimeout(rainTimeoutRef.current)
      }
      if (rainCooldownTimeoutRef.current !== null) {
        window.clearTimeout(rainCooldownTimeoutRef.current)
      }
    }
  }, [])

  return (
    <button
      ref={cloudRef}
      type="button"
      data-interactive-hero-cloud
      className={cloudClasses}
      aria-label="Click the cloud for a reaction"
      onClick={handleCloudClick}
    >
      {showClickHint ? (
        <span aria-hidden className={clickHintClasses}>
          click me!
        </span>
      ) : null}
      {isRaining ? (
        <LazyMotion features={domAnimation}>
          <div aria-hidden className={rainContainerClasses}>
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
                <path
                  d="M56 0 10 78h33L28 160 90 66H56Z"
                  fill="currentColor"
                />
              </m.svg>
            ))}
            {rainDrops.map((rainDrop) => (
              <m.span
                key={rainDrop.left}
                className={rainDropClasses}
                style={{ left: rainDrop.left }}
                animate={
                  reducedMotion
                    ? reducedMotionRainDropAnimation
                    : rainDropAnimation
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
      ) : null}
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
      <div
        ref={faceRef}
        className={cn(layerClasses, "will-change-transform")}
      >
        <LazyMotion features={domAnimation}>
          <m.svg
            aria-hidden="true"
            viewBox="0 0 2380 2380"
            className={layerClasses}
            animate={
              isRaining && !reducedMotion
                ? stormFaceAnimation
                : isHurt && !reducedMotion
                  ? hurtFaceAnimation
                  : restingFaceAnimation
            }
            initial={false}
            transition={
              isRaining && !reducedMotion
                ? stormShakeTransition
                : isHurt && !reducedMotion
                  ? hurtTransition
                  : mouthSnap
            }
          >
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
          </m.svg>
        </LazyMotion>
      </div>
    </button>
  )
}
