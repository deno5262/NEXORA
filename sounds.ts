let ctx: AudioContext | null = null
const get = () => { if (!ctx) { const A = (window as any).AudioContext || (window as any).webkitAudioContext; ctx = new A() as AudioContext } if (ctx.state === 'suspended') ctx.resume(); return ctx }
const on = (k: string) => localStorage.getItem(k) !== 'off'
const vol = () => ({ low: 0.3, mid: 0.6, high: 1 } as Record<string, number>)[localStorage.getItem('notifyVol') ?? 'high'] ?? 1
function tone(c: AudioContext, f: number, t0: number, d: number, g: number, type: OscillatorType = 'sine') {
  const o = c.createOscillator(), a = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0)
  a.gain.setValueAtTime(0.0001, t0); a.gain.exponentialRampToValueAtTime(Math.max(0.0002, g), t0 + 0.02); a.gain.exponentialRampToValueAtTime(0.0001, t0 + d)
  o.connect(a); a.connect(c.destination); o.start(t0); o.stop(t0 + d + 0.03)
}
export function playNotify(force = false) {
  if (!force && !on('notifySound')) return
  try { const c = get(), t = c.currentTime, v = vol(); tone(c, 880, t, 0.3, 0.8 * v, 'triangle'); tone(c, 1320, t + 0.17, 0.4, 0.8 * v, 'triangle'); tone(c, 1760, t + 0.32, 0.55, 0.6 * v, 'sine') } catch { /* sound is optional */ }
}
export function playSend() { if (!on('sendSound')) return; try { const c = get(), t = c.currentTime; tone(c, 520, t, 0.1, 0.3, 'sine'); tone(c, 780, t + 0.07, 0.16, 0.3, 'sine') } catch { /* optional */ } }
export function playTyping() { if (!on('typingSound')) return; try { const c = get(), t = c.currentTime; tone(c, 1000, t, 0.06, 0.2, 'sine'); tone(c, 1300, t + 0.06, 0.07, 0.18, 'sine') } catch { /* optional */ } }
