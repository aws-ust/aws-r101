export const HOME_SPLASH_SEEN_KEY = "aws-ust-home-splash-seen"
/** Set by beforeInteractive bootstrap; avoids mutating `<html>` (hydration-safe). */
export const HOME_SPLASH_SKIP_GLOBAL = "__awsUstHomeSplashSkip"

export const HOME_SPLASH_MIN_HOLD_MS = 1100
export const HOME_SPLASH_MAX_WAIT_MS = 3500
export const HOME_SPLASH_EXIT_MS = 1200

type HomeSplashWindow = Window &
  typeof globalThis & {
    [HOME_SPLASH_SKIP_GLOBAL]?: 1
  }

export function homeSplashSkipBootstrapScript(): string {
  return `try{if(sessionStorage.getItem("${HOME_SPLASH_SEEN_KEY}"))window.${HOME_SPLASH_SKIP_GLOBAL}=1}catch(e){}`
}

export function markHomeSplashSeen() {
  try {
    sessionStorage.setItem(HOME_SPLASH_SEEN_KEY, "1")
    if (typeof window !== "undefined") {
      (window as HomeSplashWindow)[HOME_SPLASH_SKIP_GLOBAL] = 1
    }
  } catch {
    // sessionStorage may be unavailable in private mode
  }
}

export function shouldSkipHomeSplashClient(): boolean {
  if (typeof window === "undefined") return true
  const win = window as HomeSplashWindow
  if (win[HOME_SPLASH_SKIP_GLOBAL] === 1) return true
  try {
    return sessionStorage.getItem(HOME_SPLASH_SEEN_KEY) === "1"
  } catch {
    return false
  }
}
