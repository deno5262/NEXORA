import { FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase, configured } from './supabase'
import { useAuth } from './AuthContext'
import Logo from './Logo'
export default function Auth({ mode }: { mode: 'login' | 'signup' | 'reset' }) {
  const { session } = useAuth()
  const [f, setF] = useState({ email: '', password: '', name: '', username: '', code: '' })
  const [sent, setSent] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [busy, setBusy] = useState(false)
  if (session) return <Navigate to="/" replace />
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null)
    if (!configured) return setMsg({ ok: false, t: 'Supabase is not configured.' })
    if (mode === 'login' || mode === 'signup') { if (f.password.length < 8) return setMsg({ ok: false, t: 'Password must be at least 8 characters.' }) }
    if (mode === 'signup' && !/^[a-z0-9_]{3,24}$/.test(f.username)) return setMsg({ ok: false, t: 'Username: 3–24 characters, lowercase letters, numbers, underscore.' })
    setBusy(true)
    if (mode === 'login') {
      const r = await supabase.auth.signInWithPassword({ email: f.email, password: f.password }); if (r.error) setMsg({ ok: false, t: r.error.message })
    } else if (mode === 'signup') {
      const r = await supabase.auth.signUp({ email: f.email, password: f.password, options: { data: { full_name: f.name, username: f.username }, emailRedirectTo: location.origin } })
      setMsg(r.error ? { ok: false, t: r.error.message } : { ok: true, t: 'Check your email to verify your account, then log in.' })
    } else if (!sent) {
      const r = await supabase.auth.resetPasswordForEmail(f.email)
      if (r.error) setMsg({ ok: false, t: r.error.message }); else { setSent(true); setMsg({ ok: true, t: 'We sent a code to your email. Enter it below with your new password.' }) }
    } else {
      if (!/^\d{6,8}$/.test(f.code.trim())) setMsg({ ok: false, t: 'Enter the numeric code from your email.' })
      else if (f.password.length < 8) setMsg({ ok: false, t: 'New password must be at least 8 characters.' })
      else {
        const v = await supabase.auth.verifyOtp({ email: f.email, token: f.code.trim(), type: 'recovery' })
        if (v.error) setMsg({ ok: false, t: v.error.message })
        else { const u = await supabase.auth.updateUser({ password: f.password }); if (u.error) setMsg({ ok: false, t: u.error.message }) }
      }
    }
    setBusy(false)
  }
  return (<div className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-4 p-6">
    <div><h1 className="text-3xl font-extrabold tracking-widest"><Logo /></h1><p className="text-mute">{mode === 'reset' ? 'Reset your password' : 'One World. One Connection.'}</p></div>
    <form onSubmit={submit} className="flex flex-col gap-3">
      {mode === 'signup' && <><input className="input" placeholder="Full name" value={f.name} onChange={set('name')} required /><input className="input" placeholder="Username" value={f.username} onChange={set('username')} required /></>}
      <input className="input" type="email" placeholder="Email" value={f.email} onChange={set('email')} disabled={sent} required />
      {mode === 'reset' && sent && <input className="input" inputMode="numeric" placeholder="Code from email" value={f.code} onChange={set('code')} />}
      {(mode !== 'reset' || sent) && <input className="input" type="password" placeholder={mode === 'reset' ? 'New password' : 'Password'} value={f.password} onChange={set('password')} required />}
      {msg && <p role="alert" className={msg.ok ? 'text-accent' : 'text-red-400'}>{msg.t}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : sent ? 'Reset password' : 'Send code'}</button>
    </form>
    <div className="flex justify-between text-sm text-mute">
      {mode === 'login' ? <><Link to="/signup">Create account</Link><Link to="/reset">Forgot password?</Link></> : <Link to="/login">Back to log in</Link>}
      {mode === 'reset' && sent && <button type="button" onClick={() => { setSent(false); setMsg(null) }}>Resend code</button>}</div></div>)
}
