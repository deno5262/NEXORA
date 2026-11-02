import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Droplet, MapPin, Settings as Cog, Home, Globe, Heart, GraduationCap, Briefcase, Cake } from 'lucide-react'
import { useAuth } from './AuthContext'
import { uploadProfileImage } from './image'
import { REL } from './EditProfile'
import { countryName, countryFlag } from './countries'
import LevelBadge, { levelColor } from './LevelBadge'
const LEVELS: [string, number][] = [['Bronze', 0], ['Silver', 100], ['Gold', 300], ['Platinum', 700], ['Diamond', 1500], ['Elite', 3000]]
const TABS = ['Posts', 'Photos', 'Stories', 'About', 'Friends']
export default function Profile() {
  const { profile, session, refresh } = useAuth()
  const [tab, setTab] = useState('Posts'); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const av = useRef<HTMLInputElement>(null); const cv = useRef<HTMLInputElement>(null)
  if (!profile || !session) return <p className="text-mute">Loading profile…</p>
  const i = Math.max(0, LEVELS.findIndex(l => l[0] === profile.level))
  const next = LEVELS[i + 1]; const pct = next ? Math.min(100, ((profile.xp - LEVELS[i][1]) / (next[1] - LEVELS[i][1])) * 100) : 100
  const pick = (kind: 'avatar' | 'cover') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return
    setErr(''); setBusy(true)
    try { await uploadProfileImage(session.user.id, kind, f); await refresh() } catch (x) { setErr((x as Error).message) }
    setBusy(false)
  }
  const mapLink = profile.lat != null && profile.lng != null ? `https://www.openstreetmap.org/?mlat=${profile.lat}&mlon=${profile.lng}#map=13/${profile.lat}/${profile.lng}`
    : profile.living_in ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(profile.living_in + ' ' + countryName(profile.country))}` : ''
  const rows: [typeof Home, string, string, string?][] = ([
    [MapPin, 'Lives in', profile.living_in || profile.location || '', mapLink],
    [Home, 'From', profile.hometown || ''], [Globe, 'Country', profile.country ? `${countryFlag(profile.country)} ${countryName(profile.country)}` : ''],
    [Heart, 'Relationship', profile.relationship_status ? REL[profile.relationship_status] : ''], [GraduationCap, 'Education', profile.education || ''],
    [Briefcase, 'Work', profile.work || ''], [Cake, 'Born', profile.birth_year ? String(profile.birth_year) : ''],
    [Droplet, 'Blood group', profile.blood_group ? profile.blood_group + (profile.is_blood_donor ? ' · donor' : '') : '']] as [typeof Home, string, string, string?][]).filter(r => r[2])
  const Rows = ({ list }: { list: typeof rows }) => <ul className="flex flex-col gap-2 text-left">{list.map(([I, k, v, href]) => <li key={k} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
    <I size={20} className="shrink-0 text-accent" /><div className="min-w-0"><div className="text-xs text-mute">{k}</div>{href ? <a href={href} target="_blank" rel="noreferrer" className="text-ink underline decoration-accent">{v}</a> : <div className="text-ink">{v}</div>}</div></li>)}</ul>
  const R = 54, C = 2 * Math.PI * R
  return (<div className="-mx-4 -mt-4">
    <div className="relative h-40 bg-surface"><Link to="/settings" aria-label="Settings" className="absolute right-3 top-2 rounded-full bg-bg/80 p-2"><Cog size={18} /></Link>
      {profile.cover_url && <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />}
      <button onClick={() => cv.current?.click()} aria-label="Change cover" className="absolute bottom-2 right-3 rounded-full bg-bg/80 p-2"><Camera size={18} /></button>
    </div>
    <div className="px-4">
      <div className="relative -mt-14 mb-2 h-28 w-28">
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90"><circle cx="60" cy="60" r={R} fill="none" stroke="var(--line)" strokeWidth="5" />
          <circle cx="60" cy="60" r={R} fill="none" stroke={levelColor(profile.level)} strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} /></svg>
        <div className="absolute inset-2 overflow-hidden rounded-full border-2 border-bg bg-surface">
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-3xl font-bold">{(profile.full_name || profile.username)[0]?.toUpperCase()}</span>}</div>
        <button onClick={() => av.current?.click()} aria-label="Change photo" className="absolute bottom-0 right-0 rounded-full bg-accent p-1.5 text-on"><Camera size={16} /></button>
      </div>
      <input ref={av} type="file" accept="image/*" hidden onChange={pick('avatar')} /><input ref={cv} type="file" accept="image/*" hidden onChange={pick('cover')} />
      {busy && <p className="text-sm text-mute">Uploading…</p>}{err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      <h1 className="flex items-center gap-2 text-xl font-bold">{profile.full_name || profile.username}{profile.is_blood_donor && <Droplet size={16} className="fill-red-500 text-red-500" aria-label="Blood donor" />}</h1>
      <p className="text-mute">@{profile.username}</p>
      <div className="mt-1 flex items-center gap-2"><LevelBadge level={profile.level} /><span className="text-xs text-mute">{next ? `${next[1] - profile.xp} XP to ${next[0]}` : 'Top level'}</span></div>
      {profile.tagline && <p className="mt-2 italic">{profile.tagline}</p>}
      {profile.bio && <p className="mt-1">{profile.bio}</p>}
      
      {rows.length > 0 && <div className="my-3"><Rows list={rows.slice(0, 3)} /></div>}<div className="my-3 grid grid-cols-4 rounded-xl border border-line bg-surface py-2 text-center">
        {['Posts', 'Connections', 'Followers', 'Following'].map(k => <div key={k}><b className="text-accent">0</b><div className="text-xs text-mute">{k}</div></div>)}</div>
      <div className="mb-3 flex gap-2"><Link to="/create/story" className="btn flex-1 text-center">Add to story</Link><Link to="/edit-profile" className="flex-1 rounded-xl border border-line px-4 py-2.5 text-center">Edit profile</Link></div>
      <div className="flex gap-4 overflow-x-auto border-b border-line">{TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap pb-2 ${tab === t ? 'border-b-2 border-accent text-accent' : 'text-mute'}`}>{t}</button>)}</div>
      <div className="py-6 text-center text-mute">
        {tab === 'About' ? <div className="flex flex-col gap-3">{rows.length ? <Rows list={rows} /> : <p>No details added yet.</p>}
          {profile.lat != null && profile.lng != null && <iframe title="Map" className="h-56 w-full rounded-xl border border-line" src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(profile.lng) - 0.03},${Number(profile.lat) - 0.03},${Number(profile.lng) + 0.03},${Number(profile.lat) + 0.03}&layer=mapnik&marker=${profile.lat},${profile.lng}`} />}</div>
          : `${tab} are not built yet (next part of Phase 2).`}</div>
    </div></div>)
}
