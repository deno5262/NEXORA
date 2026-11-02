import { FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase, configured } from './supabase'
import { useAuth } from './AuthContext'
export default function Auth({ mode }: { mode: 'login' | 'signup' | 'reset' }) {
  const { session } = useAuth()
  const [f, setF] = useState({ email: '', password: '', name: '', username: '' })
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [busy, setBusy] = useState(false)
  if (session) return <Navigate to="/" replace />
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null)
    if (!configured) return setMsg({ ok: false, t: 'Supabase is not configured. Add your keys to .env (see .env.example).' })
    if (mode !== 'reset' && f.password.length < 8) return setMsg({ ok: false, t: 'Password must be at least 8 characters.' })
    if (mode === 'signup' && !/^[a-z0-9_]{3,24}$/.test(f.username)) return setMsg({ ok: false, t: 'Username: 3–24 characters, lowercase letters, numbers, underscore.' })
    setBusy(true)
    const r = mode === 'login' ? await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
      : mode === 'signup' ? await supabase.auth.signUp({ email: f.email, password: f.password, options: { data: { full_name: f.name, username: f.username }, emailRedirectTo: location.origin } })
      : await supabase.auth.resetPasswordForEmail(f.email, { redirectTo: location.origin + '/settings/security' })
    setBusy(false)
    if (r.error) return setMsg({ ok: false, t: r.error.message })
    if (mode === 'signup') setMsg({ ok: true, t: 'Check your email to verify your account, then log in.' })
    if (mode === 'reset') setMsg({ ok: true, t: 'Password reset link sent. Check your email.' })
  }
  return (<div className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-4 p-6">
    <div><h1 className="text-3xl font-extrabold tracking-widest text-accent">NEXORA</h1><p className="text-mute">One World. One Connection.</p></div>
    <form onSubmit={submit} className="flex flex-col gap-3">
      {mode === 'signup' && <><input className="input" placeholder="Full name" value={f.name} onChange={set('name')} required />
        <input className="input" placeholder="Username" value={f.username} onChange={set('username')} required /></>}
      <input className="input" type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
      {mode !== 'reset' && <input className="input" type="password" placeholder="Password" value={f.password} onChange={set('password')} required />}
      {msg && <p role="alert" className={msg.ok ? 'text-accent' : 'text-red-400'}>{msg.t}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset link'}</button>
    </form>
    <div className="flex justify-between text-sm text-mute">
      {mode === 'login' ? <><Link to="/signup">Create account</Link><Link to="/reset">Forgot password?</Link></> : <Link to="/login">Back to log in</Link>}
    </div></div>)
}
