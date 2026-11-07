import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
export default function PullRefresh() {
  const [pull, setPull] = useState(0); const [busy, setBusy] = useState(false)
  useEffect(() => {
    let y0 = 0, active = false, cur = 0
    const ts = (e: TouchEvent) => { if (window.scrollY <= 0 && !(e.target as HTMLElement | null)?.closest?.('.fixed')) { y0 = e.touches[0].clientY; active = true; cur = 0 } }
    const tm = (e: TouchEvent) => { if (!active) return; const dy = e.touches[0].clientY - y0; if (dy <= 0 || window.scrollY > 0) { cur = 0; setPull(0); if (window.scrollY > 0) active = false; return } cur = Math.min(dy * 0.5, 90); setPull(cur) }
    const te = () => { if (!active) return; active = false; if (cur >= 60) { setBusy(true); window.dispatchEvent(new Event('app-refresh')); setTimeout(() => { setBusy(false); setPull(0) }, 900) } else setPull(0) }
    window.addEventListener('touchstart', ts, { passive: true }); window.addEventListener('touchmove', tm, { passive: true }); window.addEventListener('touchend', te)
    return () => { window.removeEventListener('touchstart', ts); window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', te) }
  }, [])
  if (!pull && !busy) return null
  return <div className="pointer-events-none fixed inset-x-0 top-16 z-[55] flex justify-center" style={{ transform: `translateY(${busy ? 16 : pull / 2}px)`, opacity: busy ? 1 : Math.min(1, pull / 60) }}><span className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface shadow"><RefreshCw size={18} className={busy ? 'animate-spin' : ''} style={{ color: 'var(--accent)' }} /></span></div>
}
