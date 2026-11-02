import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserCog } from 'lucide-react'
import { supabase } from './supabase'
export default function Settings() {
  const [pw, setPw] = useState(''); const [msg, setMsg] = useState('')
  const change = async (e: FormEvent) => {
    e.preventDefault()
    if (pw.length < 8) return setMsg('Password must be at least 8 characters.')
    const { error } = await supabase.auth.updateUser({ password: pw })
    setMsg(error ? error.message : 'Password changed'); if (!error) setPw('')
  }
  return (<div className="flex flex-col gap-6"><h1 className="text-xl font-bold">Settings</h1>
    <Link to="/edit-profile" className="flex items-center gap-3 rounded-xl border border-line p-3"><UserCog className="text-accent" />Edit profile</Link>
    <form onSubmit={change} className="flex flex-col gap-3"><h2 className="font-bold">Change password</h2>
      <input className="input" type="password" placeholder="New password" value={pw} onChange={e => setPw(e.target.value)} />
      <button className="btn">Update password</button>{msg && <p role="status" className="text-mute">{msg}</p>}</form>
    <p className="text-sm text-mute">Privacy, notification and blocked-user settings arrive with the features they control.</p>
    <button className="rounded-xl border border-line p-3" onClick={() => supabase.auth.signOut()}>Log out</button></div>)
}
