import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Camera, Droplet, MapPin, Home, Globe, Heart, GraduationCap, Briefcase, Cake, UserPlus, UserCheck, LayoutGrid, List, Eye, Lock } from 'lucide-react'
import { supabase, Profile as P } from './supabase'
import { useAuth } from './AuthContext'
import { uploadProfileImage } from './image'
import { REL } from './EditProfile'
import { countryName, countryFlag } from './countries'
import LevelBadge, { levelColor } from './LevelBadge'
import Feed from './Feed'
import { fetchPosts, Post } from './posts'
import { short } from './ui'
const LEVELS: [string, number][] = [['Bronze', 0], ['Silver', 100], ['Gold', 300], ['Platinum', 700], ['Diamond', 1500], ['Elite', 3000]]
const TABS = ['Posts', 'About', 'Favorites', 'Liked']
function Grid({ authorId, ids }: { authorId?: string; ids?: string[] }) {
  const [ps, setPs] = useState<Post[] | null>(null)
  useEffect(() => { setPs(null); fetchPosts({ authorId, ids }).then(setPs).catch(() => setPs([])) }, [authorId, ids?.join(',')])
  if (!ps) return <p className="py-8 text-center text-mute">Loading…</p>
  if (!ps.length) return <p className="py-8 text-center text-mute">Nothing here yet.</p>
  return <div className="grid grid-cols-3 gap-1">{ps.map(p => <Link key={p.id} to={`/post/${p.id}`} className="relative aspect-square overflow-hidden rounded-lg bg-surface">
    {p.media[0]?.url && <img src={p.media[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />}
    <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/60 px-1.5 text-xs text-white"><Eye size={12} />{short(p.views)}</span></Link>)}</div>
}
const Collection = ({ authorId, ids, view }: { authorId?: string; ids?: string[]; view: string }) => (view === 'grid' ? <Grid authorId={authorId} ids={ids} /> : <Feed authorId={authorId} ids={ids} />)
export default function Profile() {
  const { profile: me, session, refresh } = useAuth(); const { username } = useParams(); const uid = session!.user.id
  const own = !username || username === me?.username
  const [other, setOther] = useState<P | null | undefined>(undefined)
  const [tab, setTab] = useState('Posts'); const [view, setView] = useState('grid'); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [counts, setCounts] = useState({ posts: 0, followers: 0, following: 0 }); const [iFollow, setIFollow] = useState(false); const [followsMe, setFollowsMe] = useState(false); const [ids, setIds] = useState<string[] | null>(null)
  const av = useRef<HTMLInputElement>(null); const cv = useRef<HTMLInputElement>(null)
  useEffect(() => { setOther(undefined); if (own) return; supabase.from('profiles').select('*').eq('username', username).maybeSingle().then(({ data }) => setOther((data as P) ?? null)) }, [username, own])
  const profile = own ? me : other; const pid = profile?.id
  const count = (q: any) => q.then((r: any) => (r.count as number) ?? 0)
  const loadCounts = async () => {
    if (!pid) return
    const [po, fo, fi]: number[] = await Promise.all([count(supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', pid)), count(supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', pid)), count(supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('follower_id', pid))])
    setCounts({ posts: po, followers: fo, following: fi })
    if (!own) { const [a, b]: number[] = await Promise.all([count(supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('follower_id', uid).eq('following_id', pid)), count(supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('follower_id', pid).eq('following_id', uid))]); setIFollow(a > 0); setFollowsMe(b > 0) }
  }
  useEffect(() => { loadCounts() }, [pid])
  const canSee = tab === 'Favorites' ? own || !!profile?.show_favorites : tab === 'Liked' ? own || !!profile?.show_liked : true
  useEffect(() => {
    setIds(null); if (!pid || !canSee || (tab !== 'Favorites' && tab !== 'Liked')) return
    const q = tab === 'Favorites' ? supabase.from('saved_posts').select('post_id').eq('user_id', pid).order('created_at', { ascending: false }) : supabase.from('post_reactions').select('post_id').eq('user_id', pid).order('created_at', { ascending: false })
    q.then(({ data }) => setIds((data ?? []).map((r: any) => r.post_id as string)))
  }, [pid, tab, canSee])
  if (!own && other === undefined) return <p className="py-10 text-center text-mute">Loading…</p>
  if (!profile) return <p className="py-10 text-center text-mute">{own ? 'Loading profile…' : 'This profile does not exist.'}</p>
  const i = Math.max(0, LEVELS.findIndex(l => l[0] === profile.level)); const next = LEVELS[i + 1]; const pct = next ? Math.min(100, ((profile.xp - LEVELS[i][1]) / (next[1] - LEVELS[i][1])) * 100) : 100
  const pick = (kind: 'avatar' | 'cover') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return
    setErr(''); setBusy(true)
    try { await uploadProfileImage(uid, kind, f); await refresh() } catch (x) { setErr((x as Error).message) }
    setBusy(false)
  }
  const toggleFollow = async () => {
    if (iFollow && !confirm('Unfollow this person?')) return
    const r = iFollow ? await supabase.from('follows').delete().eq('follower_id', uid).eq('following_id', profile.id) : await supabase.from('follows').insert({ follower_id: uid, following_id: profile.id })
    if (!r.error) loadCounts()
  }
  const mapLink = profile.lat != null && profile.lng != null ? `https://www.openstreetmap.org/?mlat=${profile.lat}&mlon=${profile.lng}#map=13/${profile.lat}/${profile.lng}` : profile.living_in ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(profile.living_in + ' ' + countryName(profile.country))}` : ''
  const rows = ([[MapPin, 'Lives in', profile.living_in || profile.location || '', mapLink], [Home, 'From', profile.hometown || ''], [Globe, 'Country', profile.country ? `${countryFlag(profile.country)} ${countryName(profile.country)}` : ''],
    [Heart, 'Relationship', profile.relationship_status ? REL[profile.relationship_status] : ''], [GraduationCap, 'Education', profile.education || ''], [Briefcase, 'Work', profile.work || ''],
    [Cake, 'Born', profile.birth_year ? String(profile.birth_year) : ''], [Droplet, 'Blood group', profile.blood_group ? profile.blood_group + (profile.is_blood_donor ? ' · donor' : '') : '']] as [typeof Home, string, string, string?][]).filter(r => r[2])
  const Rows = ({ list }: { list: typeof rows }) => <ul className="flex flex-col gap-2 text-left">{list.map(([I, k, v, href]) => <li key={k} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
    <I size={20} className="shrink-0 text-accent" /><div className="min-w-0"><div className="text-xs text-mute">{k}</div>{href ? <a href={href} target="_blank" rel="noreferrer" className="text-ink underline decoration-accent">{v}</a> : <div className="text-ink">{v}</div>}</div></li>)}</ul>
  const R = 54, C = 2 * Math.PI * R; const name = profile.full_name || profile.username
  return (<div className="-mx-4 -mt-4">
    <div className="relative h-40 bg-surface">{profile.cover_url && <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />}
      {own && <button onClick={() => cv.current?.click()} className="absolute bottom-2 right-3 flex items-center gap-1 rounded-full bg-bg/80 px-3 py-1.5 text-sm"><Camera size={16} />Edit Cover</button>}</div>
    <div className="px-4">
      <div className="relative -mt-14 mb-2 h-28 w-28">
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90"><circle cx="60" cy="60" r={R} fill="none" stroke="var(--line)" strokeWidth="5" />
          <circle cx="60" cy="60" r={R} fill="none" stroke={levelColor(profile.level)} strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} /></svg>
        <div className="absolute inset-2 overflow-hidden rounded-full border-2 border-bg bg-surface">{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-3xl font-bold">{name[0]?.toUpperCase()}</span>}</div>
        {own && <button onClick={() => av.current?.click()} aria-label="Change photo" className="absolute bottom-0 right-0 rounded-full bg-accent p-1.5 text-on"><Camera size={16} /></button>}</div>
      <input ref={av} type="file" accept="image/*" hidden onChange={pick('avatar')} /><input ref={cv} type="file" accept="image/*" hidden onChange={pick('cover')} />
      {busy && <p className="text-sm text-mute">Uploading…</p>}{err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      <h1 className="flex items-center gap-2 text-xl font-bold">{name}{profile.is_blood_donor && <Droplet size={16} className="fill-red-500 text-red-500" aria-label="Blood donor" />}</h1>
      <p className="text-mute">@{profile.username}</p>
      <div className="mt-1 flex items-center gap-2"><LevelBadge level={profile.level} /><span className="text-xs text-mute">{next ? `${next[1] - profile.xp} XP to ${next[0]}` : 'Top level'}</span></div>
      {profile.tagline && <p className="mt-2 italic">{profile.tagline}</p>}{profile.bio && <p className="mt-1">{profile.bio}</p>}
      {rows.length > 0 && tab !== 'About' && <div className="my-3"><Rows list={rows.slice(0, 3)} /></div>}
      <div className="my-3 grid grid-cols-3 rounded-xl border border-line bg-surface py-2 text-center">
        {([['Posts', counts.posts], ['Followers', counts.followers], ['Following', counts.following]] as [string, number][]).map(([k, v]) => <div key={k}><b className="text-accent">{short(v)}</b><div className="text-xs text-mute">{k}</div></div>)}</div>
      {own ? <div className="mb-3 flex gap-2"><Link to="/create/story" className="btn flex-1 text-center">Add to story</Link><Link to="/edit-profile" className="flex-1 rounded-xl border border-line px-4 py-2.5 text-center">Edit profile</Link></div>
        : <div className="mb-3"><button onClick={toggleFollow} className={iFollow ? 'flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 font-semibold' : 'btn flex w-full items-center justify-center gap-2'}>
          {iFollow ? <><UserCheck size={18} />Following</> : <><UserPlus size={18} />{followsMe ? 'Follow back' : 'Follow'}</>}</button></div>}
      <div className="flex gap-4 overflow-x-auto border-b border-line">{TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap pb-2 ${tab === t ? 'border-b-2 border-accent text-accent' : 'text-mute'}`}>{t}</button>)}</div>
      {tab === 'About' ? <div className="flex flex-col gap-3 py-4">{rows.length ? <Rows list={rows} /> : <p className="text-center text-mute">No details added yet.</p>}
        {profile.lat != null && profile.lng != null && <iframe title="Map" className="h-56 w-full rounded-xl border border-line" src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(profile.lng) - 0.03},${Number(profile.lat) - 0.03},${Number(profile.lng) + 0.03},${Number(profile.lat) + 0.03}&layer=mapnik&marker=${profile.lat},${profile.lng}`} />}</div>
      : (<div className="py-3"><div className="mb-3 flex justify-end gap-2">
          {([['grid', LayoutGrid], ['feed', List]] as [string, typeof List][]).map(([k, I]) => <button key={k} aria-label={k} onClick={() => setView(k)} className="rounded-lg border p-2" style={view === k ? { background: 'var(--accent)', color: 'var(--on)', borderColor: 'var(--accent)' } : { borderColor: 'var(--line)' }}><I size={18} /></button>)}</div>
        {tab === 'Posts' ? <Collection authorId={profile.id} view={view} /> : !canSee ? <p className="flex items-center justify-center gap-2 py-10 text-mute"><Lock size={16} />{name} keeps this private.</p> : ids ? <Collection ids={ids} view={view} /> : <p className="py-8 text-center text-mute">Loading…</p>}</div>)}
    </div></div>)
}
