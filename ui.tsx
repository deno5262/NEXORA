export const ago = (d: string) => { const s = (Date.now() - new Date(d).getTime()) / 1000; return s < 60 ? 'now' : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d` }
export const Av = ({ a }: { a: { avatar_url: string | null; full_name: string; username: string } }) => <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface text-sm font-bold">
  {a.avatar_url ? <img src={a.avatar_url} alt="" className="h-full w-full object-cover" /> : (a.full_name || a.username)[0]?.toUpperCase()}</span>
export const soundOn = () => localStorage.getItem('reactionSound') !== 'off'
export function playPop() {
  if (!soundOn()) return
  try {
    const A = window.AudioContext || (window as any).webkitAudioContext; const ctx = new A(); const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(520, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.09)
    g.gain.setValueAtTime(0.18, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16)
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.17); setTimeout(() => ctx.close(), 300)
  } catch { /* sound is optional */ }
}
