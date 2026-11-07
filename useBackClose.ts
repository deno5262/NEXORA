import { useEffect, useRef } from 'react'
let depth = 0
export function useBackClose(open: boolean, onClose: () => void) {
  const cb = useRef(onClose); cb.current = onClose
  useEffect(() => {
    if (!open) return
    const my = ++depth; let popped = false
    history.pushState({ ...(history.state ?? {}), __d: my }, '')
    const onPop = () => { if ((history.state?.__d ?? 0) < my) { popped = true; depth = my - 1; cb.current() } }
    window.addEventListener('popstate', onPop)
    return () => { window.removeEventListener('popstate', onPop); if (!popped) { depth = my - 1; if ((history.state?.__d ?? 0) === my) history.back() } }
  }, [open])
}
