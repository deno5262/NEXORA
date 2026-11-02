import { FormEvent, useEffect, useState } from 'react'
import { Heart, MessageCircle, Trash2, Globe, Users, Lock } from 'lucide-react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { fetchPosts, Post } from './posts'
const ago = (d: string) => { const s = (Date.now() - new Date(d).getTime()) / 1000; return s < 60 ? 'now' : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d` }
const Av = ({ a }: { a: { avatar_url: string | null; full_name: string; username: string } }) => <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface text-sm font-bold">
  {a.avatar_url ? <img src={a.avatar_url} alt="" className="h-full w-full object-cover" /> : (a.full_name || a.username)[0]?.toUpperCase()}</span>
type C = { id: string; parent_id: string | null; body: string; created_at: string; author: { username: string; full_name: string; avatar_url: string | null } }
function Comments({ postId, onCount }: { postId: string; onCount: (n: number) => void }) {
  const { session } = useAuth(); const [list, setList] = useState<C[]>([]); const [body, setBody] = useState(''); const [reply, setReply] = useState<C | null>(null); const [err, setErr] = useState('')
  const load = async () => { const { data } = await supabase.from('comments').select('id,parent_id,body,created_at,author:profiles(username,full_name,avatar_url)').eq('post_id', postId).order('created_at'); setList((data ?? []) as any); onCount((data ?? []).length) }
  useEffect(() => { load() }, [])
  const send = async (e: FormEvent) => {
    e.preventDefault(); const t = body.trim(); if (!t) return; setErr('')
    const { error } = await supabase.from('comments').insert({ post_id: postId, author_id: session!.user.id, parent_id: reply ? reply.parent_id ?? reply.id : null, body: t })
    if (error) return setErr(error.message); setBody(''); setReply(null); load()
  }
  const item = (c: C, child = false) => <div key={c.id} className={`flex gap-2 ${child ? 'ml-10' : ''}`}><Av a={c.author} />
    <div className="min-w-0 flex-1"><div className="rounded-2xl bg-bg px-3 py-1.5"><b className="text-sm">{c.author.full_name || c.author.username}</b><p className="break-words text-sm">{c.body}</p></div>
      <button className="px-2 text-xs text-mute" onClick={() => setReply(c)}>Reply · {ago(c.created_at)}</button></div></div>
  return (<div className="mt-3 flex flex-col gap-2">
    {list.filter(c => !c.parent_id).map(c => <div key={c.id} className="flex flex-col gap-2">{item(c)}{list.filter(r => r.parent_id === c.id).map(r => item(r, true))}</div>)}
    <form onSubmit={send} className="flex gap-2">
      <input className="input" maxLength={1000} placeholder={reply ? `Reply to ${reply.author.username}…` : 'Write a comment…'} value={body} onChange={e => setBody(e.target.value)} />
      <button className="btn px-3">Send</button></form>
    {reply && <button className="text-left text-xs text-mute" onClick={() => setReply(null)}>Cancel reply</button>}{err && <p className="text-sm text-red-400">{err}</p>}</div>)
}
function PostCard({ post, onDeleted }: { post: Post; onDeleted: () => void }) {
  const { session } = useAuth(); const uid = session!.user.id
  const [likes, setLikes] = useState(post.likes); const [open, setOpen] = useState(false); const [n, setN] = useState(post.comments); const mine = likes.includes(uid)
  const AIcon = post.audience === 'public' ? Globe : post.audience === 'friends' ? Users : Lock
  const like = async () => {
    setLikes(mine ? likes.filter(x => x !== uid) : [...likes, uid])
    const r = mine ? await supabase.from('post_reactions').delete().eq('post_id', post.id).eq('user_id', uid) : await supabase.from('post_reactions').insert({ post_id: post.id, user_id: uid })
    if (r.error) setLikes(post.likes)
  }
  const del = async () => {
    if (!confirm('Delete this post?')) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) return alert(error.message)
    await supabase.storage.from('posts').remove(post.media.map(m => m.path)); onDeleted()
  }
  return (<article className="overflow-hidden rounded-2xl border border-line bg-surface">
    <header className="flex items-center gap-2 p-3"><Av a={post.author} /><div className="min-w-0 flex-1"><b className="block truncate">{post.author.full_name || post.author.username}</b>
      <span className="flex items-center gap-1 text-xs text-mute">@{post.author.username} · {ago(post.created_at)} · <AIcon size={12} /></span></div>
      {post.author.id === uid && <button aria-label="Delete post" onClick={del} className="p-2 text-mute"><Trash2 size={18} /></button>}</header>
    <div className="flex snap-x snap-mandatory overflow-x-auto">{post.media.map(m => <img key={m.path} src={m.url} alt="" loading="lazy" className="max-h-[70vh] w-full shrink-0 snap-center object-contain bg-black" />)}</div>
    {post.media.length > 1 && <p className="pt-1 text-center text-xs text-mute">{post.media.length} photos — swipe</p>}
    {post.caption && <p className="whitespace-pre-wrap break-words px-3 pt-2">{post.caption}</p>}
    <div className="flex gap-5 p-3"><button onClick={like} className={`flex items-center gap-1 ${mine ? 'text-accent' : 'text-mute'}`}><Heart size={20} fill={mine ? 'currentColor' : 'none'} />{likes.length}</button>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-mute"><MessageCircle size={20} />{n}</button></div>
    {open && <div className="px-3 pb-3"><Comments postId={post.id} onCount={setN} /></div>}</article>)
}
export default function Feed({ authorId }: { authorId?: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null); const [err, setErr] = useState('')
  useEffect(() => { setPosts(null); fetchPosts(authorId).then(setPosts).catch(e => setErr(e.message)) }, [authorId])
  if (err) return <p role="alert" className="text-red-400">{err}</p>
  if (!posts) return <p className="py-10 text-center text-mute">Loading…</p>
  if (!posts.length) return <p className="py-10 text-center text-mute">No photo posts yet. Tap + to create one.</p>
  return <div className="flex flex-col gap-5 text-ink">{posts.map(p => <PostCard key={p.id} post={p} onDeleted={() => setPosts(posts.filter(x => x.id !== p.id))} />)}</div>
}
