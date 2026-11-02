import { FormEvent, useState } from 'react'
import { supabase, THEMES, THEME_COLORS } from './supabase'
import { useAuth } from './AuthContext'
export default function Settings() {
  const { theme, setTheme } = useAuth()
  const [pw, setPw] = useState(''); const [msg, setMsg] = useState('')
  const change = async (e: FormEvent) => {
    e.preventDefault()
    if (pw.length < 8) return setMsg('Password must be at least 8 characters.')
    const { error } = await supabase.auth.updateUser({ password: pw })
    setMsg(error ? error.message : 'Password changed'); if (!error) setPw('')
  }
  return (<div className="flex flex-col gap-6"><h1 className="text-xl font-bold">Settings</h1>
    <section><h2 className="mb-2 font-bold">Theme</h2><div className="grid grid-cols-2 gap-2">
      {THEMES.map(([k, name]) => <button key={k} onClick={() => setTheme(k)} className={`flex items-center justify-between rounded-xl border p-3 text-left ${theme === k ? 'border-accent text-accent' : 'border-line'}`}>
        <span>{name}</span><span className="flex gap-1">{THEME_COLORS[k].map((c, i) => <i key={i} className="h-3.5 w-3.5 rounded-full border border-line" style={{ background: c }} />)}</span></button>)}</div></section>
    <form onSubmit={change} className="flex flex-col gap-3"><h2 className="font-bold">Security</h2>
      <input className="input" type="password" placeholder="New password" value={pw} onChange={e => setPw(e.target.value)} />
      <button className="btn">Change password</button>{msg && <p role="status" className="text-mute">{msg}</p>}</form>
    <section><h2 className="mb-2 font-bold">Account</h2>
      <button className="w-full rounded-xl border border-line p-3 text-left" onClick={() => supabase.auth.signOut()}>Log out</button>
      <p className="mt-2 text-sm text-mute">Add / switch account, privacy, notification and blocked-user settings are not built yet.</p></section></div>)
}
