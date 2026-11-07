import { useEffect, useRef } from 'react'
export function useRefresh(fn: () => void) {
  const r = useRef(fn); r.current = fn
  useEffect(() => { const h = () => r.current(); window.addEventListener('app-refresh', h); return () => window.removeEventListener('app-refresh', h) }, [])
}
