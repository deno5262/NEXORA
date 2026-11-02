import { FormEvent, useState } from 'react'
import { supabase, THEMES } from './supabase'
import { useAuth } from './AuthContext'
export default function Settings() {
  const { profile, session, theme, setTheme, refresh } = useAuth()
  const [f, setF] = useState({ full_name: profile?.full_name ?? '', bio: profile?.bio ?? '', location: profile?.location ?? '' })
  const [msg, setMsg] = useState('')
  const save = async (e: FormEvent) => {
    e.preventDefault(); setMsg('')
    const { error } = await supabase.from('profiles').update({ ...f, updated_at: new Date().toISOString() }).eq('id', session!.user.id)
    if (!error) await refresh(); setMsg(error ? error.message : 'Saved')
  }
  return (<div className="flex flex-col gap-6">
    <section><h2 className="mb-2 font-bold">Theme</h2><div className="grid grid-cols-2 gap-2">
      {THEMES.map(([k, l]) => <button key={k} onClick={() => setTheme(k)} className={`rounded-xl border p-3 text-left ${theme === k ? 'border-accent text-accent' : 'border-line'}`}>{l}</button>)}</div></section>
    <form onSubmit={save} className="flex flex-col gap-3"><h2 className="font-bold">Edit profile</h2>
      <input className="input" placeholder="Full name" maxLength={80} value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} />
      <textarea className="input" placeholder="Bio" maxLength={300} value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} />
      <input className="input" placeholder="Location" value={f.location} onChange={e => setF({ ...f, location: e.target.value })} />
      <button className="btn">Save changes</button>{msg && <p role="status" className="text-mute">{msg}</p>}</form>
    <button className="rounded-xl border border-line p-3" onClick={() => supabase.auth.signOut()}>Log out</button></div>)
}
