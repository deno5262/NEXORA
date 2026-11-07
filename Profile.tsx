import { useRefresh } from './useRefresh'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Camera, Droplet, MapPin, Home, Globe, Heart, GraduationCap, Briefcase, Cake, Calendar, UserPlus, UserCheck, LayoutGrid, List, Eye, Lock, Image as ImageIcon, Play, Star, Repeat2, ChevronDown, ChevronLeft, ChevronRight, Facebook, Instagram, Youtube, Twitter, Music2, Phone, Send } from 'lucide-react'
import { supabase, Profile as P } from './supabase'
import { useAuth } from './AuthContext'
import { uploadProfileImage } from './image'
import { REL } from './EditProfile'
import { countryName, countryFlag } from './countries'
import LevelBadge, { levelColor } from './LevelBadge'
import Feed from './Feed'
import { fetchPosts, Post } from './posts'
import { short } from './ui'
import RelationButtons from './Relation'
import { MessageButton } from './Textora'
import { ProfileStories } from './Stories'
import { SOC, safeUrl } from './socials'
const LEVELS: [string, number][] = [['Bronze', 0], ['Silver', 100], ['Gold', 300], ['Platinum', 700], ['Diamond', 1500], ['Elite', 3000]]
const TABS: [string, typeof LayoutGrid][] = [['Posts', LayoutGrid], ['Photos', ImageIcon], ['Stories', Play], ['Private', Lock], ['Favorites', Star], ['Reposts', Repeat2], ['Liked', Heart]]
const SOC_ICON: Record<string, typeof Globe> = { facebook: Facebook, instagram: Instagram, youtube: Youtube, tiktok: Music2, x: Twitter, whatsapp: Phone, telegram: Send, website: Globe }
type Mode = 'public' | 'private' | undefined
function Grid({ authorId, ids, mode }: { authorId?: string; ids?: string[]; mode?: Mode }) {
  const [ps, setPs] = useState<Post[] | null>(null)
  useEffect(() => { setPs(null); fetchPosts({ authorId, ids }).then(r => setPs(mode === 'private' ? r.filter(p => p.audience === 'only_me') : mode === 'public' ? r.filter(p => p.audience !== 'only_me') : r)).catch(() => setPs([])) }, [authorId, ids?.join(','), mode])
  if (!ps) return <p className="py-8 text-center text-mute">Loading…</p>
  if (!ps.length) return <p className="py-8 text-center text-mute">Nothing here yet.</p>
  return <div className="grid grid-cols-3 gap-1">{ps.map(p => <Link key={p.id} to={`/post/${p.id}`} className="relative aspect-square overflow-hidden rounded-lg bg-surface">
    {p.media[0]?.url && <img src={p.media[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />}
    <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/60 px-1.5 text-xs text-white"><Eye size={12} />{short(p.views)}</span></Link>)}</div>
}
function PhotoGrid({ authorId }: { authorId: string }) {
  const [t, setT] = useState<{ key: string; url?: string; id: string }[] | null>(null)
  useEffect(() => { fetchPosts({ authorId }).then(r => setT(r.filter(p => p.audience !== 'only_me').flatMap(p => p.media.map(m => ({ key: m.path, url: m.url, id: p.id }))))).catch(() => setT([])) }, [authorId])
  if (!t) return <p className="py-8 text-center text-mute">Loading…</p>
  if (!t.length) return <p className="py-8 text-center text-mute">No photos yet.</p>
  return <div className="grid grid-cols-3 gap-1">{t.map(x => <Link key={x.key} to={`/post/${x.id}`} className="aspect-square overflow-hidden rounded-lg bg-surface">{x.url && <img src={x.url} alt="" loading="lazy" className="h-full w-full object-cover" />}</Link>)}</div>
}
const Collection = ({ authorId, ids, view, mode }: { authorId?: string; ids?: string[]; view: string; mode?: Mode }) => (view === 'grid' ? <Grid authorId={authorId} ids={ids} mode={mode} /> : <Feed authorId={authorId} ids={ids} mode={mode} />)
export default function Profile() {
  const { profile: me, session, refresh } = useAuth(); const { username } = useParams(); const uid = session!.user.id
  const own = !username || username === me?.username
  const [other, setOther] = useState<P | null | undefined>(undefined)
  const [tab, setTab] = useState('Posts'); const [view, setView] = useState('grid'); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [c, setC] = useState({ posts: 0, photos: 0, followers: 0, following: 0, likes: 0, views: 0, friends: 0 })
  const [iFollow, setIFollow] = useState(false); const [followsMe, setFollowsMe] = useState(false); const [ids, setIds] = useState<string[] | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false); const [socOpen, setSocOpen] = useState(false); const [moreStats, setMoreStats] = useState(false)
  const av = useRef<HTMLInputElement>(null); const cv = useRef<HTMLInputElement>(null)
  useEffect(() => { setOther(undefined); if (own) return; supabase.from('profiles').select('*').eq('username', username).maybeSingle().then(({ data }) => setOther((data as P) ?? null)) }, [username, own])
  const profile = own ? me : other; const pid = profile?.id
  const count = (q: any) => q.then((r: any) => (r.count as number) ?? 0)
  const loadCounts = async () => {
    if (!pid) return
    const [po, ph, li, vw, pc]: any[] = await Promise.all([
      count(supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', pid).neq('audience', 'only_me')),
      count(supabase.from('post_media').select('id,post:posts!inner(author_id,audience)', { count: 'exact', head: true }).eq('post.author_id', pid).neq('post.audience', 'only_me')),
      count(supabase.from('post_reactions').select('post_id,post:posts!inner(author_id)', { count: 'exact', head: true }).eq('post.author_id', pid)),
      supabase.from('posts').select('view_count').eq('author_id', pid).limit(1000).then((r: any) => ((r.data ?? []) as any[]).reduce((a: number, x: any) => a + (x.view_count ?? 0), 0)),
      supabase.rpc('profile_counts', { uid: pid }).then((r: any) => (r.data?.[0] ?? { followers: 0, following: 0, friends: 0 }))])
    setC({ posts: po, photos: ph, followers: Number(pc.followers), following: Number(pc.following), likes: li, views: vw, friends: Number(pc.friends) })
  }
  useEffect(() => { loadCounts() }, [pid])
  useRefresh(loadCounts)
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
  const socials = Object.entries((profile.socials ?? {}) as Record<string, string>).filter(([k, v]) => safeUrl(v) && SOC.some(s => s[0] === k))
  const mapLink = profile.lat != null && profile.lng != null ? `https://www.openstreetmap.org/?mlat=${profile.lat}&mlon=${profile.lng}#map=13/${profile.lat}/${profile.lng}` : profile.living_in ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(profile.living_in + ' ' + countryName(profile.country))}` : ''
  const rows = ([[MapPin, 'Lives in', profile.living_in || profile.location || '', mapLink], [Home, 'From', profile.hometown || ''], [Globe, 'Country', profile.country ? `${countryFlag(profile.country)} ${countryName(profile.country)}` : ''],
    [Heart, 'Relationship', profile.relationship_status ? REL[profile.relationship_status] : ''], [GraduationCap, 'Education', profile.education || ''], [Briefcase, 'Work', profile.work || ''],
    [Cake, 'Born', profile.birth_year ? String(profile.birth_year) : ''], [Droplet, 'Blood group', profile.blood_group ? profile.blood_group + (profile.is_blood_donor ? ' · donor' : '') : ''],
    [Calendar, 'Joined', profile.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : '']] as [typeof Home, string, string, string?][]).filter(r => r[2])
  const R = 54, C = 2 * Math.PI * R; const name = profile.full_name || profile.username
  const tabs = own ? TABS : TABS.filter(t => t[0] !== 'Private'); const tabCount: Record<string, number> = { Posts: c.posts, Photos: c.photos }
  const statLink = (n: number, l: string, kind: string) => <Link to={`/u/${profile.username}/list/${kind}`} className="active:opacity-60"><b className="text-ink">{short(n)}</b> <span className="text-mute">{l}</span></Link>
  const stat = (n: number, l: string) => <span><b className="text-ink">{short(n)}</b> <span className="text-mute">{l}</span></span>
  return (<div className="-mx-4 -mt-4">
    <div className="relative h-44 bg-surface">{profile.cover_url && <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--bg), transparent 55%)' }} />
      {own && <button onClick={() => cv.current?.click()} className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-bg/80 px-3 py-1.5 text-sm"><Camera size={16} />Edit Cover</button>}</div>
    <div className="px-4">
      <div className="-mt-14 flex items-end gap-3">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90"><circle cx="60" cy="60" r={R} fill="none" stroke="var(--line)" strokeWidth="5" />
            <circle cx="60" cy="60" r={R} fill="none" stroke={levelColor(profile.level)} strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} /></svg>
          <div className="absolute inset-2 overflow-hidden rounded-full border-2 border-bg bg-surface">{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-3xl font-bold">{name[0]?.toUpperCase()}</span>}</div>
          {own && <button onClick={() => av.current?.click()} aria-label="Change photo" className="absolute bottom-0 right-0 rounded-full bg-accent p-1.5 text-on"><Camera size={16} /></button>}</div>
        <div className="min-w-0 flex-1 pb-1"><h1 className="flex items-center gap-2 truncate text-xl font-bold">{name}{profile.is_blood_donor && <Droplet size={16} className="shrink-0 fill-red-500 text-red-500" aria-label="Blood donor" />}</h1>
          <p className="truncate text-sm text-mute">@{profile.username}</p><div className="mt-1"><LevelBadge level={profile.level} size={14} /></div></div>
        <div className="flex shrink-0 items-center gap-2 pb-2">
          <button onClick={() => setAboutOpen(!aboutOpen)} className="flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-sm">About<ChevronDown size={16} className={aboutOpen ? 'rotate-180' : ''} /></button>
          {socials.length > 0 && <div className="flex items-center gap-1 rounded-full border border-line bg-surface px-1 py-1">
            <button aria-label="Social links" onClick={() => setSocOpen(!socOpen)} className="p-1">{socOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
            {!socOpen && (() => { const Ic = SOC_ICON[socials[0][0]] ?? Globe; return <Ic size={16} className="mr-1 text-accent" /> })()}
            {socOpen && socials.map(([k, v]) => { const Ic = SOC_ICON[k] ?? Globe; return <a key={k} href={safeUrl(v)} target="_blank" rel="noopener noreferrer" aria-label={k} className="p-1 text-accent"><Ic size={18} /></a> })}</div>}</div></div>
      <input ref={av} type="file" accept="image/*" hidden onChange={pick('avatar')} /><input ref={cv} type="file" accept="image/*" hidden onChange={pick('cover')} />
      {busy && <p className="text-sm text-mute">Uploading…</p>}{err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">{statLink(c.following, 'Following', 'following')}{statLink(c.followers, 'Followers', 'followers')}
        <span className="flex items-center gap-1"><Heart size={14} className="text-red-500" fill="currentColor" />{stat(c.likes, 'Likes')}<button aria-label="More stats" onClick={() => setMoreStats(!moreStats)} className="text-mute"><ChevronRight size={16} className={moreStats ? 'rotate-180' : ''} /></button></span>
        {moreStats && <>{statLink(c.friends, 'Friends', 'friends')}<span className="flex items-center gap-1"><Eye size={14} className="text-mute" />{stat(c.views, 'Views')}</span></>}</div>
      {profile.bio && <p className="mt-2">{profile.bio}</p>}
      {(profile.living_in || profile.location || profile.tagline) && <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-mute">{(profile.living_in || profile.location) && <span className="flex items-center gap-1"><MapPin size={14} />{profile.living_in || profile.location}</span>}{profile.tagline && <span className="italic">{profile.tagline}</span>}</p>}
      {aboutOpen && <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3"><b>About</b>
        {rows.length ? <ul className="flex flex-col gap-2">{rows.map(([I, k, v, href]) => <li key={k} className="flex items-center gap-3"><I size={18} className="shrink-0 text-accent" /><span className="text-mute">{k}:</span>{href ? <a href={href} target="_blank" rel="noreferrer" className="min-w-0 break-words underline decoration-accent">{v}</a> : <span className="min-w-0 break-words">{v}</span>}</li>)}</ul> : <p className="text-mute">No details added yet.</p>}
        {profile.lat != null && profile.lng != null && <iframe title="Map" className="h-44 w-full rounded-xl border border-line" src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(profile.lng) - 0.03},${Number(profile.lat) - 0.03},${Number(profile.lng) + 0.03},${Number(profile.lat) + 0.03}&layer=mapnik&marker=${profile.lat},${profile.lng}`} />}</div>}
      <div className="my-3">{own ? <div className="flex gap-2"><Link to="/create/story" className="btn flex-1 text-center">Add to story</Link><Link to="/edit-profile" className="flex-1 rounded-xl border border-line px-4 py-2.5 text-center">Edit profile</Link></div>
        : <div className="flex flex-col gap-2"><RelationButtons target={profile.id} onChange={loadCounts} /><MessageButton target={profile.id} /></div>}</div>
      <div className="flex overflow-x-auto rounded-2xl border border-line bg-surface">{tabs.map(([k, I]) => <button key={k} onClick={() => setTab(k)} className={`flex w-1/3 shrink-0 flex-col items-center gap-0.5 py-2 text-sm ${tab === k ? 'text-accent' : 'text-mute'}`} style={tab === k ? { borderBottom: '2px solid var(--accent)' } : undefined}>
        <I size={20} />{k}{tabCount[k] !== undefined && <small className="text-xs">{short(tabCount[k])}</small>}</button>)}</div>
      <div className="py-3">
        {tab === 'Photos' ? <PhotoGrid authorId={profile.id} />
          : tab === 'Stories' ? <ProfileStories authorId={profile.id} />
          : tab === 'Reposts' ? <p className="py-10 text-center text-mute">Reposts are not built yet. They arrive in an upcoming update.</p>
          : (<><div className="mb-3 flex justify-end gap-2">{([['grid', LayoutGrid], ['feed', List]] as [string, typeof List][]).map(([k, I]) => <button key={k} aria-label={k} onClick={() => setView(k)} className="rounded-lg border p-2" style={view === k ? { background: 'var(--accent)', color: 'var(--on)', borderColor: 'var(--accent)' } : { borderColor: 'var(--line)' }}><I size={18} /></button>)}</div>
            {tab === 'Posts' ? <Collection authorId={profile.id} view={view} mode="public" /> : tab === 'Private' ? <Collection authorId={profile.id} view={view} mode="private" />
              : !canSee ? <p className="flex items-center justify-center gap-2 py-10 text-mute"><Lock size={16} />{name} keeps this private.</p> : ids ? <Collection ids={ids} view={view} /> : <p className="py-8 text-center text-mute">Loading…</p>}</>)}</div>
    </div></div>)
}
