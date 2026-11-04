import { ReactNode, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Globe, Users, Lock, X, Heart, ThumbsUp, ChevronDown, Share2, Bookmark, MoreHorizontal, Eye } from 'lucide-react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { fetchPosts, fetchSavedIds, fetchFollowingIds, Post, EMOJI, PICKER } from './posts'
import { Av, ago, playPop, short } from './ui'
import RichText from './RichText'
import CommentSheet from './Comments'
import { PostMenu, ShareSheet } from './PostMenu'
function ImageBox({ url, onOpen, onDouble }: { url?: string; onOpen: () => void; onDouble: () => void }) {
  const [nat, setNat] = useState<[number, number] | null>(null); const last = useRef(0); const tm = useRef(0)
  const mode = localStorage.getItem('photoMode') || 'smart'; const r = nat ? nat[0] / nat[1] : 1; const ratio = mode === 'smart' ? Math.max(r, 0.8) : r
  const tap = () => { const now = Date.now(); if (now - last.current < 300) { window.clearTimeout(tm.current); last.current = 0; onDouble() } else { last.current = now; tm.current = window.setTimeout(onOpen, 300) } }
  return <button type="button" onClick={tap} className="mx-auto block w-full shrink-0 snap-center overflow-hidden bg-black" style={{ maxWidth: nat ? nat[0] : undefined, aspectRatio: String(ratio), maxHeight: mode === 'original' ? '85vh' : undefined }}>
    <img src={url} alt="" loading="lazy" onLoad={e => setNat([e.currentTarget.naturalWidth, e.currentTarget.naturalHeight])} className={`h-full w-full ${mode === 'smart' ? 'object-cover' : 'object-contain'}`} /></button>
}
function Viewer({ post, start, onClose, bar }: { post: Post; start: number; onClose: () => void; bar: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollTo({ left: start * ref.current.clientWidth }) }, [])
  return (<div className="fixed inset-0 z-40 flex flex-col bg-black text-white">
    <div className="flex items-center gap-3 p-3"><button onClick={onClose} aria-label="Close"><X /></button><b className="truncate">{post.author.full_name || post.author.username}</b></div>
    <div ref={ref} className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto">{post.media.map(m => <img key={m.path} src={m.url} alt="" className="h-full w-full shrink-0 snap-center object-contain" />)}</div>
    {post.caption && <p className="max-h-24 overflow-y-auto px-3 pt-2 text-sm"><RichText text={post.caption} /></p>}
    <div className="bg-surface text-ink">{bar}</div></div>)
}
export function PostCard({ post, saved, onSaved, onDeleted, autoOpen, following, onFollow }: { post: Post; saved: boolean; onSaved: (v: boolean) => void; onDeleted: () => void; autoOpen?: boolean; following?: boolean; onFollow?: () => void }) {
  const { session } = useAuth(); const uid = session!.user.id
  const [p, setP] = useState(post); const [reactions, setReactions] = useState(post.reactions); const [picker, setPicker] = useState(false); const [sheet, setSheet] = useState(!!autoOpen)
  const [viewer, setViewer] = useState<number | null>(null); const [n, setN] = useState(post.comments); const [idx, setIdx] = useState(0); const [menu, setMenu] = useState(false); const [share, setShare] = useState(false); const [burst, setBurst] = useState(0)
  const timer = useRef(0); const long = useRef(false); const root = useRef<HTMLElement>(null)
  const quick = p.author.quick_reaction === 'love' ? 'love' : 'like'
  const mine = reactions.find(r => r.user_id === uid)?.kind
  const kinds: string[] = Array.from(new Set<string>(reactions.map(r => r.kind))).slice(0, 3)
  const AIcon = p.audience === 'public' ? Globe : p.audience === 'friends' ? Users : Lock
  useEffect(() => {
    if (p.author.id === uid || !root.current) return
    const key = 'v:' + p.id; if (sessionStorage.getItem(key)) return
    let t = 0
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { t = window.setTimeout(async () => { sessionStorage.setItem(key, '1'); await supabase.from('post_views').insert({ post_id: p.id, user_id: uid }); io.disconnect() }, 1200) } else window.clearTimeout(t) }, { threshold: 0.6 })
    io.observe(root.current); return () => { io.disconnect(); window.clearTimeout(t) }
  }, [])
  const setReaction = async (kind: string | null) => {
    const prev = reactions; const rest = reactions.filter(r => r.user_id !== uid)
    setReactions(kind ? [...rest, { user_id: uid, kind }] : rest); if (kind) playPop()
    const r = kind ? await supabase.from('post_reactions').upsert({ post_id: p.id, user_id: uid, kind }, { onConflict: 'post_id,user_id' }) : await supabase.from('post_reactions').delete().eq('post_id', p.id).eq('user_id', uid)
    if (r.error) setReactions(prev)
  }
  const toggleSave = async () => {
    const next = !saved; onSaved(next)
    const r = next ? await supabase.from('saved_posts').insert({ user_id: uid, post_id: p.id }) : await supabase.from('saved_posts').delete().eq('user_id', uid).eq('post_id', p.id)
    if (r.error) onSaved(!next)
  }
  const down = () => { long.current = false; timer.current = window.setTimeout(() => { long.current = true; setPicker(true) }, 450) }
  const up = () => { window.clearTimeout(timer.current); if (!long.current) setReaction(mine ? null : quick) }
  const cancel = () => window.clearTimeout(timer.current)
  const dbl = () => { setBurst(Date.now()); if (!mine) setReaction(quick) }
  const follow = async () => { const r = await supabase.from('follows').insert({ follower_id: uid, following_id: p.author.id }); if (!r.error) onFollow?.() }
  const followBadge = !following && p.author.id !== uid ? <button type="button" aria-label="Follow" onClick={e => { e.preventDefault(); follow() }} className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-accent text-xs font-bold leading-none text-on">+</button> : null
  const icon = mine ? <span className="text-xl">{EMOJI[mine]}</span> : quick === 'love' ? <Heart size={18} /> : <ThumbsUp size={18} />
  const pill = 'flex flex-1 items-center justify-center gap-2 rounded-2xl border border-line py-2.5 font-medium'
  const bar = (<div>
    <div className="flex items-center gap-3 px-3 py-2 text-sm text-mute">
      <span className="flex items-center gap-1">{kinds.map(k => <span key={k}>{EMOJI[k]}</span>)}<b className="text-ink">{short(reactions.length)}</b></span><span>|</span>
      <span>{short(n)} comments</span><span>|</span><span className="flex items-center gap-1"><Eye size={14} />{short(p.views)}</span></div>
    <div className="relative flex gap-2 px-3 pb-3">
      {picker && <><div className="fixed inset-0 z-30" onClick={() => setPicker(false)} />
        <div className="absolute bottom-full left-3 z-40 flex gap-1 rounded-full border border-line bg-surface p-1.5 shadow-xl">
          {PICKER.map((k, i) => <button key={k} aria-label={k} style={{ animationDelay: `${i * 35}ms` }} onClick={() => { setReaction(k); setPicker(false) }} className="pop-in text-2xl active:scale-125">{EMOJI[k]}</button>)}</div></>}
      <div className="flex flex-1 items-stretch overflow-hidden rounded-2xl border" style={mine ? { borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 14%, transparent)' } : { borderColor: 'var(--line)' }}>
        <button onPointerDown={down} onPointerUp={up} onPointerLeave={cancel} onPointerCancel={cancel} onContextMenu={e => e.preventDefault()} className="flex flex-1 select-none items-center justify-center gap-2 py-2.5 font-medium">{icon}{mine ? mine[0].toUpperCase() + mine.slice(1) : 'React'}</button>
        <button aria-label="More reactions" onClick={() => setPicker(true)} className="px-2 text-mute"><ChevronDown size={16} /></button></div>
      <button onClick={() => setSheet(true)} className={pill}><MessageCircle size={18} />Comment</button>
      <button onClick={() => setShare(true)} className={pill}><Share2 size={18} />Share</button></div></div>)
  return (<article ref={root} className="overflow-hidden rounded-2xl border border-line bg-surface">
    <header className="flex items-center gap-2 p-3"><Link to={`/u/${p.author.username}`} className="relative shrink-0"><Av a={p.author} />{followBadge}</Link><div className="min-w-0 flex-1"><Link to={`/u/${p.author.username}`} className="block truncate font-bold">{p.author.full_name || p.author.username}</Link>
      <span className="flex items-center gap-1 text-xs text-mute">@{p.author.username} · {ago(p.created_at)} · <AIcon size={12} /></span></div>
      <button aria-label="Menu" onClick={() => setMenu(true)} className="p-1.5 text-mute"><MoreHorizontal size={20} /></button>
      <button aria-label={saved ? 'Unsave' : 'Save'} onClick={toggleSave} className={`p-1.5 ${saved ? 'text-accent' : 'text-mute'}`}><Bookmark size={20} fill={saved ? 'currentColor' : 'none'} /></button></header>
    {p.caption && <p className="whitespace-pre-wrap break-words px-3 pb-2"><RichText text={p.caption} /></p>}
    <div className="relative">
      <div className="flex snap-x snap-mandatory overflow-x-auto" onScroll={e => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {p.media.map((m, i) => <ImageBox key={m.path} url={m.url} onOpen={() => setViewer(i)} onDouble={dbl} />)}</div>
      {burst > 0 && <span key={burst} className="heart-burst pointer-events-none absolute inset-0 grid place-items-center text-7xl">{EMOJI[quick]}</span>}
      {p.media.length > 1 && <><span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{idx + 1}/{p.media.length}</span>
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">{p.media.map((m, i) => <i key={m.path} className={`h-1.5 rounded-full bg-white transition-all ${i === idx ? 'w-4' : 'w-1.5 opacity-50'}`} />)}</div></>}
    </div>
    {bar}
    {sheet && <CommentSheet postId={p.id} onClose={() => setSheet(false)} onCount={setN} />}
    {viewer !== null && <Viewer post={p} start={viewer} onClose={() => setViewer(null)} bar={bar} />}
    {menu && <PostMenu post={{ ...p, reactions, comments: n }} mine={p.author.id === uid} saved={saved} onSave={toggleSave} onClose={() => setMenu(false)} onEdited={x => setP({ ...p, ...x })} onDeleted={onDeleted} />}
    {share && <ShareSheet post={p} onClose={() => setShare(false)} />}</article>)
}
function rank(ps: Post[], tab: string, plain: boolean, fol: Set<string>): Post[] {
  if (plain) return ps
  if (tab === 'following') return ps.filter(p => fol.has(p.author.id))
  const now = Date.now(); const per: Record<string, number> = {}; ps.forEach(p => { per[p.author.id] = (per[p.author.id] ?? 0) + 1 })
  const age = (p: Post) => (now - new Date(p.created_at).getTime()) / 3.6e6
  const eng = (p: Post) => p.reactions.length + p.comments * 3 + p.views * 0.2
  if (tab === 'trending') return ps.filter(p => age(p) <= 72).sort((a, b) => eng(b) - eng(a))
  const score = (p: Post) => (eng(p) + 1) / Math.pow(age(p) + 2, 1.3) + (per[p.author.id] <= 2 ? 0.4 : 0)
  const sorted = [...ps].sort((a, b) => score(b) - score(a)); const out: Post[] = []
  while (sorted.length) { const i = Math.max(0, sorted.findIndex(p => p.author.id !== out[out.length - 1]?.author.id)); out.push(sorted.splice(i, 1)[0]) }
  return out
}
export default function Feed({ authorId, ids, tab = 'foryou' }: { authorId?: string; ids?: string[]; tab?: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null); const [saved, setSaved] = useState<Set<string>>(new Set()); const [err, setErr] = useState(''); const { session } = useAuth(); const uid = session!.user.id; const [fol, setFol] = useState<Set<string>>(new Set())
  useEffect(() => {
    setPosts(null); setErr('')
    Promise.all([fetchPosts({ authorId, ids }), fetchSavedIds(), fetchFollowingIds(uid)]).then(([ps, s, f2]) => { setFol(f2); setPosts(rank(ps, tab, !!authorId || !!ids, f2)); setSaved(s) }).catch(e => setErr(e.message))
  }, [authorId, ids?.join(','), tab])
  if (err) return <p role="alert" className="text-red-400">{err}</p>
  if (!posts) return <p className="py-10 text-center text-mute">Loading…</p>
  if (!posts.length) return <p className="py-10 text-center text-mute">{authorId || ids ? 'No photo posts yet.' : tab === 'trending' ? 'Nothing is trending yet.' : tab === 'following' ? 'Follow people to see their posts here.' : 'No photo posts yet. Tap + to create one.'}</p>
  return <div className="flex flex-col gap-5 text-ink">{posts.map(p => <PostCard key={p.id} post={p} saved={saved.has(p.id)}
    onSaved={v => setSaved(prev => { const s = new Set(prev); if (v) s.add(p.id); else s.delete(p.id); return s })} onDeleted={() => setPosts(posts.filter(x => x.id !== p.id))} following={fol.has(p.author.id)} onFollow={() => setFol(prev => new Set(prev).add(p.author.id))} />)}</div>
}
