import { ReactNode, useEffect, useRef, useState } from 'react'
import { MessageCircle, Trash2, Globe, Users, Lock, X, ThumbsUp } from 'lucide-react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { fetchPosts, Post, EMOJI } from './posts'
import { Av, ago } from './ui'
import RichText from './RichText'
import CommentSheet from './Comments'
function ImageBox({ url, onOpen }: { url?: string; onOpen: () => void }) {
  const [nat, setNat] = useState<[number, number] | null>(null)
  const ratio = nat ? Math.max(nat[0] / nat[1], 0.8) : 1
  return <button type="button" onClick={onOpen} className="mx-auto block w-full shrink-0 snap-center overflow-hidden bg-black" style={{ maxWidth: nat ? nat[0] : undefined, aspectRatio: String(ratio) }}>
    <img src={url} alt="" loading="lazy" onLoad={e => setNat([e.currentTarget.naturalWidth, e.currentTarget.naturalHeight])} className="h-full w-full object-cover" /></button>
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
function PostCard({ post, onDeleted }: { post: Post; onDeleted: () => void }) {
  const { session } = useAuth(); const uid = session!.user.id
  const [reactions, setReactions] = useState(post.reactions); const [picker, setPicker] = useState(false); const [sheet, setSheet] = useState(false)
  const [viewer, setViewer] = useState<number | null>(null); const [n, setN] = useState(post.comments)
  const timer = useRef(0); const long = useRef(false)
  const mine = reactions.find(r => r.user_id === uid)?.kind
  const kinds: string[] = Array.from(new Set<string>(reactions.map(r => r.kind))).slice(0, 3)
  const AIcon = post.audience === 'public' ? Globe : post.audience === 'friends' ? Users : Lock
  const setReaction = async (kind: string | null) => {
    const prev = reactions; const rest = reactions.filter(r => r.user_id !== uid)
    setReactions(kind ? [...rest, { user_id: uid, kind }] : rest)
    const r = kind ? await supabase.from('post_reactions').upsert({ post_id: post.id, user_id: uid, kind }, { onConflict: 'post_id,user_id' }) : await supabase.from('post_reactions').delete().eq('post_id', post.id).eq('user_id', uid)
    if (r.error) setReactions(prev)
  }
  const down = () => { long.current = false; timer.current = window.setTimeout(() => { long.current = true; setPicker(true) }, 450) }
  const up = () => { window.clearTimeout(timer.current); if (!long.current) setReaction(mine ? null : 'like') }
  const cancel = () => window.clearTimeout(timer.current)
  const del = async () => {
    if (!confirm('Delete this post?')) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) return alert(error.message)
    await supabase.storage.from('posts').remove(post.media.map(m => m.path)); onDeleted()
  }
  const bar = (<div className="relative flex items-center gap-5 p-3">
    {picker && <><div className="fixed inset-0 z-30" onClick={() => setPicker(false)} />
      <div className="absolute bottom-full left-2 z-40 flex gap-1 rounded-full border border-line bg-surface p-1.5 shadow-xl">
        {Object.entries(EMOJI).map(([k, e]) => <button key={k} aria-label={k} onClick={() => { setReaction(k); setPicker(false) }} className="text-2xl transition-transform active:scale-125">{e}</button>)}</div></>}
    <button onPointerDown={down} onPointerUp={up} onPointerLeave={cancel} onPointerCancel={cancel} onContextMenu={e => e.preventDefault()} className={`flex select-none items-center gap-1 ${mine ? 'text-accent' : 'text-mute'}`}>
      {mine ? <span className="text-xl">{EMOJI[mine]}</span> : <ThumbsUp size={20} />}
      <span className="flex">{kinds.map(k => <span key={k} className="-ml-0.5 text-sm">{EMOJI[k]}</span>)}</span>{reactions.length}</button>
    <button onClick={() => setSheet(true)} className="flex items-center gap-1 text-mute"><MessageCircle size={20} />{n}</button>
    <span className="ml-auto text-xs text-mute">Hold 👍 to react</span></div>)
  return (<article className="overflow-hidden rounded-2xl border border-line bg-surface">
    <header className="flex items-center gap-2 p-3"><Av a={post.author} /><div className="min-w-0 flex-1"><b className="block truncate">{post.author.full_name || post.author.username}</b>
      <span className="flex items-center gap-1 text-xs text-mute">@{post.author.username} · {ago(post.created_at)} · <AIcon size={12} /></span></div>
      {post.author.id === uid && <button aria-label="Delete post" onClick={del} className="p-2 text-mute"><Trash2 size={18} /></button>}</header>
    {post.caption && <p className="whitespace-pre-wrap break-words px-3 pb-2"><RichText text={post.caption} /></p>}
    <div className="flex snap-x snap-mandatory overflow-x-auto">{post.media.map((m, i) => <ImageBox key={m.path} url={m.url} onOpen={() => setViewer(i)} />)}</div>
    {post.media.length > 1 && <p className="pt-1 text-center text-xs text-mute">{post.media.length} photos — swipe</p>}
    {bar}
    {sheet && <CommentSheet postId={post.id} onClose={() => setSheet(false)} onCount={setN} />}
    {viewer !== null && <Viewer post={post} start={viewer} onClose={() => setViewer(null)} bar={bar} />}</article>)
}
export default function Feed({ authorId }: { authorId?: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null); const [err, setErr] = useState('')
  useEffect(() => { setPosts(null); fetchPosts(authorId).then(setPosts).catch(e => setErr(e.message)) }, [authorId])
  if (err) return <p role="alert" className="text-red-400">{err}</p>
  if (!posts) return <p className="py-10 text-center text-mute">Loading…</p>
  if (!posts.length) return <p className="py-10 text-center text-mute">No photo posts yet. Tap + to create one.</p>
  return <div className="flex flex-col gap-5 text-ink">{posts.map(p => <PostCard key={p.id} post={p} onDeleted={() => setPosts(posts.filter(x => x.id !== p.id))} />)}</div>
}
