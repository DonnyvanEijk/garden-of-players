import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MEDIUM_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useIsMedium() {
  const [isMedium, setIsMedium] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(
      `(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${MEDIUM_BREAKPOINT - 1}px)`
    )
    const onChange = () => {
      setIsMedium(
        window.innerWidth >= MOBILE_BREAKPOINT &&
        window.innerWidth < MEDIUM_BREAKPOINT
      )
    }
    mql.addEventListener("change", onChange)
    setIsMedium(
      window.innerWidth >= MOBILE_BREAKPOINT &&
      window.innerWidth < MEDIUM_BREAKPOINT
    )
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMedium
}
