import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { UserCog, Lock, Palette, Heart, LogOut, ChevronRight, ThumbsUp, Image as Img, Bookmark, Eye } from 'lucide-react'
import { supabase, THEMES, THEME_COLORS } from './supabase'
import { useAuth } from './AuthContext'
import { soundOn } from './ui'
const Msg = ({ t }: { t: string }) => (t ? <p role="status" className="text-mute">{t}</p> : null)
function Account() {
  const { profile, session, refresh } = useAuth()
  const [name, setName] = useState(profile?.full_name ?? ''); const [un, setUn] = useState(profile?.username ?? ''); const [msg, setMsg] = useState('')
  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^[a-z0-9_]{3,30}$/.test(un)) return setMsg('Username: 3–30 characters, lowercase letters, numbers, underscore.')
    const { error } = await supabase.from('profiles').update({ full_name: name.trim(), username: un, updated_at: new Date().toISOString() }).eq('id', session!.user.id)
    if (!error) await refresh(); setMsg(error ? (error.code === '23505' ? 'That username is already taken.' : error.message) : 'Saved')
  }
  return (<form onSubmit={save} className="flex flex-col gap-3"><h2 className="font-bold">Account information</h2>
    <label className="text-sm text-mute">Display name<input className="input mt-1 text-ink" maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label>
    <label className="text-sm text-mute">Username<input className="input mt-1 text-ink" value={un} onChange={e => setUn(e.target.value.toLowerCase())} /></label>
    <p className="text-sm text-mute">Email: {session?.user.email}<br />Joined: {session ? new Date(session.user.created_at).toLocaleDateString() : ''}</p>
    <button className="btn">Save</button><Msg t={msg} /></form>)
}
function Security() {
  const [pw, setPw] = useState(''); const [msg, setMsg] = useState('')
  const change = async (e: FormEvent) => {
    e.preventDefault(); if (pw.length < 8) return setMsg('Password must be at least 8 characters.')
    const { error } = await supabase.auth.updateUser({ password: pw }); setMsg(error ? error.message : 'Password changed'); if (!error) setPw('')
  }
  return (<form onSubmit={change} className="flex flex-col gap-3"><h2 className="font-bold">Password & security</h2>
    <input className="input" type="password" placeholder="New password" value={pw} onChange={e => setPw(e.target.value)} /><button className="btn">Change password</button><Msg t={msg} /></form>)
}
function Theme() {
  const { theme, setTheme } = useAuth(); const [stats, setStats] = useState<Record<string, number>>({})
  useEffect(() => { supabase.rpc('theme_stats').then(({ data }) => { const m: Record<string, number> = {}; ((data ?? []) as any[]).forEach(r => { m[r.theme] = Number(r.users) }); setStats(m) }) }, [])
  const top = (Object.entries(stats) as [string, number][]).sort((a, b) => b[1] - a[1])[0]?.[0]
  return (<section><h2 className="mb-2 font-bold">Theme</h2><div className="grid grid-cols-1 gap-2">
    {THEMES.map(([k, name]) => <button key={k} onClick={() => setTheme(k)} className={`flex items-center justify-between rounded-xl border p-3 text-left ${theme === k ? 'border-accent text-accent' : 'border-line'}`}>
      <span>{name}{top === k && <small className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-on">🔥 Most popular</small>}{stats[k] ? <small className="ml-2 text-mute">{stats[k]} users</small> : null}</span><span className="flex gap-1">{THEME_COLORS[k].map((c, i) => <i key={i} className="h-5 w-5 rounded-full border border-line" style={{ background: c }} />)}</span></button>)}</div></section>)
}
function Reactions() {
  const { profile, refresh } = useAuth(); const [sound, setSound] = useState(soundOn())
  const pick = async (q: string) => { await supabase.from('profiles').update({ quick_reaction: q }).eq('id', profile!.id); refresh() }
  const q = profile?.quick_reaction === 'love' ? 'love' : 'like'
  return (<div className="flex flex-col gap-5"><section><h2 className="font-bold">Quick reaction on my posts</h2><p className="mb-2 text-sm text-mute">What happens when someone taps the react button on your posts. (They can still hold it to pick any reaction.)</p>
    <div className="grid grid-cols-2 gap-2">
      <button onClick={() => pick('like')} className={`flex items-center justify-center gap-2 rounded-xl border p-3 ${q === 'like' ? 'border-accent' : 'border-line'}`}><ThumbsUp className="text-green-500" fill="currentColor" size={20} />Like</button>
      <button onClick={() => pick('love')} className={`flex items-center justify-center gap-2 rounded-xl border p-3 ${q === 'love' ? 'border-accent' : 'border-line'}`}><Heart className="text-red-500" fill="currentColor" size={20} />Love</button></div></section>
    <label className="flex items-center justify-between rounded-xl border border-line p-3">Reaction sound<input type="checkbox" checked={sound} onChange={e => { localStorage.setItem('reactionSound', e.target.checked ? 'on' : 'off'); setSound(e.target.checked) }} /></label></div>)
}
function Photos() {
  const [m, setM] = useState(localStorage.getItem('photoMode') || 'smart')
  const opts: [string, string, string][] = [['smart', 'Smart preview', 'Very tall photos are cropped in the feed. Tap a photo to see it in full.'], ['original', 'Original ratio', 'Photos keep their own shape (extremely tall ones are capped).'], ['full', 'Full image', 'Every photo is shown completely, never cropped.']]
  return (<div className="flex flex-col gap-2"><h2 className="font-bold">Photo display</h2>
    {opts.map(([k, t, d]) => <button key={k} onClick={() => { localStorage.setItem('photoMode', k); setM(k) }} className={`rounded-xl border p-3 text-left ${m === k ? 'border-accent' : 'border-line'}`}><b className={m === k ? 'text-accent' : ''}>{t}</b><p className="text-sm text-mute">{d}</p></button>)}
    <p className="text-sm text-mute">Small photos are never enlarged.</p></div>)
}
function Privacy() {
  const { profile, refresh } = useAuth()
  const set = async (k: 'show_liked' | 'show_favorites', v: boolean) => { await supabase.from('profiles').update({ [k]: v }).eq('id', profile!.id); refresh() }
  return (<div className="flex flex-col gap-3"><h2 className="font-bold">Privacy</h2>
    <label className="flex items-center justify-between gap-3 rounded-xl border border-line p-3"><span>Show my Liked posts on my profile<small className="block text-mute">Off means only you can see them.</small></span><input type="checkbox" checked={!!profile?.show_liked} onChange={e => set('show_liked', e.target.checked)} /></label>
    <label className="flex items-center justify-between gap-3 rounded-xl border border-line p-3"><span>Show my Favorites (saved posts)<small className="block text-mute">Off means only you can see them.</small></span><input type="checkbox" checked={!!profile?.show_favorites} onChange={e => set('show_favorites', e.target.checked)} /></label>
    <p className="text-sm text-mute">Note: a reaction you give is still visible on that post to people who can see the post.</p></div>)
}
export default function Settings() {
  const { section } = useParams()
  if (section === 'account') return <Account />
  if (section === 'security') return <Security />
  if (section === 'appearance') return <Theme />
  if (section === 'reactions') return <Reactions />
  if (section === 'photos') return <Photos />
  if (section === 'privacy') return <Privacy />
  const rows: [string, typeof Lock, string][] = [['account', UserCog, 'Account information'], ['security', Lock, 'Password & security'], ['appearance', Palette, 'Theme'], ['reactions', Heart, 'Reactions & sounds'], ['photos', Img, 'Photo display'], ['privacy', Eye, 'Privacy']]
  return (<div className="flex flex-col gap-3"><h1 className="text-xl font-bold">Settings</h1>
    {rows.map(([id, I, label]) => <Link key={id} to={`/settings/${id}`} className="flex items-center gap-3 rounded-xl border border-line p-3"><I className="text-accent" /><span className="flex-1">{label}</span><ChevronRight className="text-mute" /></Link>)}
    <Link to="/saved" className="flex items-center gap-3 rounded-xl border border-line p-3"><Bookmark className="text-accent" /><span className="flex-1">Saved posts</span><ChevronRight className="text-mute" /></Link>
    <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 rounded-xl border border-line p-3 text-red-400"><LogOut />Log out</button>
    <p className="text-sm text-mute">Not built yet: privacy, notifications, blocked users, data & storage, account deactivation and deletion.</p></div>)
}
