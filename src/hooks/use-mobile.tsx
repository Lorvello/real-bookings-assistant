import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Resolve the correct value on the FIRST synchronous render (Vite SPA, no SSR, so
// `window` always exists in the browser). Initialising to `undefined`/`false`
// made every phone load paint the DESKTOP shell (open w-64 sidebar, desktop
// AuthenticatedPageWrapper zoom branch, no mobile header) for one frame before a
// passive effect flipped it to mobile: a visible layout flash on every load and
// navigation, and it briefly mounted the desktop sidebar's children (firing their
// queries). A synchronous initial value removes the flash by construction; desktop
// is unchanged because innerWidth >= breakpoint resolves to false either way.
function getIsMobile() {
  if (typeof window === "undefined") return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(getIsMobile)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Re-sync in case the width changed between first render and this effect.
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
