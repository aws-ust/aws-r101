"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type ChromeVisibilityContextValue = {
  hideChrome: boolean
  setHideChrome: (hide: boolean) => void
}

const ChromeVisibilityContext = createContext<ChromeVisibilityContextValue | null>(
  null
)

export function ChromeVisibilityProvider({ children }: { children: ReactNode }) {
  const [hideChrome, setHideChrome] = useState(false)

  return (
    <ChromeVisibilityContext.Provider value={{ hideChrome, setHideChrome }}>
      {children}
    </ChromeVisibilityContext.Provider>
  )
}

const defaultChromeVisibility: ChromeVisibilityContextValue = {
  hideChrome: false,
  setHideChrome: () => {},
}

export function useChromeVisibility() {
  const context = useContext(ChromeVisibilityContext)
  return context ?? defaultChromeVisibility
}
