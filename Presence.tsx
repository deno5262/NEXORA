import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
const Ctx = createContext<Set<string>>(new Set())
export const useOnline = () => useContext(Ctx)
export function PresenceProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth(); const uid = session?.user.id; const show = profile?.show_active !== false
  const [online, setOnline] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!uid) return
    const ch = supabase.channel('presence:nexora', { config: { presence: { key: uid } } })
    ch.on('presence', { event: 'sync' }, () => setOnline(new Set(Object.keys(ch.presenceState()))))
    let tracked = false; let last = Date.now(); const act = () => { last = Date.now() }
    const evaluate = async () => {
      const want = show && document.visibilityState === 'visible' && navigator.onLine && Date.now() - last < 5 * 60000
      if (want && !tracked) { tracked = true; await ch.track({ at: Date.now() }) } else if (!want && tracked) { tracked = false; await ch.untrack() }
      if (want) supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', uid).then(() => {})
    }
    ch.subscribe(s => { if (s === 'SUBSCRIBED') evaluate() })
    const id = setInterval(evaluate, 60000); const ev = () => { act(); evaluate() }
    const acts = ['pointerdown', 'keydown', 'touchstart']; acts.forEach(e => window.addEventListener(e, act, { passive: true }))
    const sys = ['visibilitychange', 'online', 'offline', 'focus']; sys.forEach(e => window.addEventListener(e, ev))
    return () => { clearInterval(id); acts.forEach(e => window.removeEventListener(e, act)); sys.forEach(e => window.removeEventListener(e, ev)); supabase.removeChannel(ch) }
  }, [uid, show])
  return <Ctx.Provider value={online}>{children}</Ctx.Provider>
}
