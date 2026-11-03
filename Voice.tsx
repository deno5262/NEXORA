import { MouseEvent, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'
export async function computePeaks(blob: Blob): Promise<{ peaks: number[] | null; ms: number }> {
  try {
    const A = window.AudioContext || (window as any).webkitAudioContext; const ctx = new A()
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer()); ctx.close()
    const ch = buf.getChannelData(0); const N = 48; const step = Math.max(1, Math.floor(ch.length / N)); const raw: number[] = []
    for (let i = 0; i < N; i++) { let m = 0; for (let j = i * step; j < Math.min(ch.length, (i + 1) * step); j += 8) m = Math.max(m, Math.abs(ch[j])); raw.push(m) }
    const top = Math.max(...raw, 0.0001)
    return { peaks: raw.map(v => Math.round((v / top) * 100) / 100), ms: buf.duration * 1000 }
  } catch { return { peaks: null, ms: 0 } }
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
export function VoicePlayer({ src, peaks, ms }: { src: string; peaks: number[] | null; ms: number | null }) {
  const a = useRef<HTMLAudioElement>(null); const [playing, setPlaying] = useState(false); const [t, setT] = useState(0); const [dur, setDur] = useState((ms ?? 0) / 1000)
  const bars = peaks && peaks.length ? peaks : Array.from({ length: 40 }, () => 0.35)
  const progress = dur ? Math.min(1, t / dur) : 0; const cur = Math.floor(progress * bars.length)
  const toggle = () => { const el = a.current; if (!el) return; if (el.paused) el.play().catch(() => {}); else el.pause() }
  const seek = (e: MouseEvent<HTMLDivElement>) => { const el = a.current; if (!el || !dur) return; const r = e.currentTarget.getBoundingClientRect(); el.currentTime = ((e.clientX - r.left) / r.width) * dur }
  return (<div className="flex w-full max-w-[280px] items-center gap-2 rounded-full border border-line bg-bg px-2 py-1.5">
    <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-on">{playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button>
    <div onClick={seek} className="flex h-8 flex-1 cursor-pointer items-center gap-[2px]">
      {bars.map((p, i) => <i key={i} className="w-[3px] shrink-0 rounded-full transition-transform" style={{ height: `${12 + p * 88}%`, background: i < cur || (i === cur && progress > 0) ? 'var(--accent)' : 'var(--mute)', opacity: i <= cur && progress > 0 ? 1 : 0.45, transform: playing && i === cur ? 'scaleY(1.3)' : undefined }} />)}</div>
    <span className="w-9 shrink-0 text-right text-xs text-mute">{fmt(playing || t > 0 ? t : dur)}</span>
    <audio ref={a} src={src} preload="metadata" onTimeUpdate={e => setT(e.currentTarget.currentTime)} onLoadedMetadata={e => { if (isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) setDur(e.currentTarget.duration) }}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setT(0) }} /></div>)
}
