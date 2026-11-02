import { useRef, useState } from 'react'
import { Palette } from 'lucide-react'
import { THEMES, THEME_COLORS } from './supabase'
import { useAuth } from './AuthContext'
export default function ThemeMenu() {
  const { theme, setTheme, preview } = useAuth()
  const [open, setOpen] = useState(false)
  const start = useRef(theme), moved = useRef(false), closing = useRef(false), last = useRef<string | null>(null)
  const at = (x: number, y: number) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-theme-key]')?.dataset.themeKey ?? null
  const cancel = () => { preview(start.current); setOpen(false) }
  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (open) { closing.current = true; cancel(); return }
    start.current = theme; moved.current = false; last.current = null; setOpen(true); e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    if (!open || closing.current) return
    const k = at(e.clientX, e.clientY)
    if (k) { moved.current = true; if (k !== last.current) { last.current = k; preview(k) } }
  }
  const up = (e: React.PointerEvent) => {
    if (closing.current) { closing.current = false; return }
    if (!moved.current) return
    const k = at(e.clientX, e.clientY)
    if (k) { setTheme(k); setOpen(false) } else cancel()
  }
  return (<div className="relative">
    <button aria-label="Themes" className="p-2" style={{ touchAction: 'none' }} onContextMenu={e => e.preventDefault()} onPointerDown={down} onPointerMove={move} onPointerUp={up}><Palette size={22} /></button>
    {open && <><div className="fixed inset-0 z-10" onClick={cancel} />
      <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-xl">
        <p className="px-2 pb-1 text-xs text-mute">Tap a theme, or hold and slide to preview</p>
        {THEMES.map(([k, name]) => <button key={k} data-theme-key={k} onClick={() => { setTheme(k); setOpen(false) }}
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left ${theme === k ? 'bg-bg text-accent' : ''}`}>
          <span>{name}</span><span className="flex gap-1">{THEME_COLORS[k].map((c, i) => <i key={i} className="h-4 w-4 rounded-full border border-line" style={{ background: c }} />)}</span></button>)}
      </div></>}
  </div>)
}
