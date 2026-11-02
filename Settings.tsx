import { FormEvent, useState } from 'react'
import { supabase, THEMES } from './supabase'
import { useAuth } from './AuthContext'
export default function Settings() {
  const { profile, session, theme, setTheme, refresh } = useAuth()
  const [f, setF] = useState({ full_name: profile?.full_name ?? '', bio: profile?.bio ?? '', location: profile?.location ?? '', tagline: profile?.tagline ?? '', blood_group: profile?.blood_group ?? '', is_blood_donor: profile?.is_blood_donor ?? false })
  const [msg, setMsg] = useState('')
  const save = async (e: FormEvent) => {
    e.preventDefault(); setMsg('')
    const { error } = await supabase.from('profiles').update({ ...f, blood_group: f.blood_group || null, updated_at: new Date().toISOString() }).eq('id', session!.user.id)
    if (!error) await refresh(); setMsg(error ? error.message : 'Saved')
  }
  return (<div className="flex flex-col gap-6">
    <section><h2 className="mb-2 font-bold">Theme</h2><div className="grid grid-cols-2 gap-2">
      {THEMES.map(([k, l]) => <button key={k} onClick={() => setTheme(k)} className={`rounded-xl border p-3 text-left ${theme === k ? 'border-accent text-accent' : 'border-line'}`}>{l}</button>)}</div></section>
    <form onSubmit={save} className="flex flex-col gap-3"><h2 className="font-bold">Edit profile</h2>
      <input className="input" placeholder="Full name" maxLength={80} value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} />
      <textarea className="input" placeholder="Bio" maxLength={300} value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} />
      <input className="input" placeholder="Location" value={f.location} onChange={e => setF({ ...f, location: e.target.value })} />
      <input className="input" placeholder="Short status line (e.g. Reading)" maxLength={80} value={f.tagline} onChange={e => setF({ ...f, tagline: e.target.value })} />
      <select className="input" value={f.blood_group} onChange={e => setF({ ...f, blood_group: e.target.value })}><option value="">Blood group (optional)</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}</select>
      <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_blood_donor} onChange={e => setF({ ...f, is_blood_donor: e.target.checked })} />I am willing to donate blood</label>
      <button className="btn">Save changes</button>{msg && <p role="status" className="text-mute">{msg}</p>}</form>
    <button className="rounded-xl border border-line p-3" onClick={() => supabase.auth.signOut()}>Log out</button></div>)
}
