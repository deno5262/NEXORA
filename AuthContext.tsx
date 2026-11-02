import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, Profile } from './supabase'
type Ctx = { session: Session | null; profile: Profile | null; theme: string; loading: boolean; setTheme: (t: string) => Promise<void>; refresh: () => Promise<void> }
const C = createContext<Ctx>(null as unknown as Ctx)
export const useAuth = () => useContext(C)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [theme, setThemeState] = useState(localStorage.getItem('theme') || 'neon_cyan')
  const [loading, setLoading] = useState(true)
  const apply = (t: string) => { document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); setThemeState(t) }
  const load = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); return }
    const [p, st] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', s.user.id).single(),
      supabase.from('user_settings').select('theme').eq('user_id', s.user.id).single()])
    if (p.data) setProfile(p.data as Profile)
    if (st.data?.theme) apply(st.data.theme)
  }, [])
  useEffect(() => {
    apply(theme)
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); load(data.session).finally(() => setLoading(false)) }).catch(() => setLoading(false))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); load(s) })
    return () => sub.subscription.unsubscribe()
  }, [])
  const setTheme = async (t: string) => {
    apply(t)
    if (session) await supabase.from('user_settings').update({ theme: t, updated_at: new Date().toISOString() }).eq('user_id', session.user.id)
  }
  return <C.Provider value={{ session, profile, theme, loading, setTheme, refresh: () => load(session) }}>{children}</C.Provider>
}
