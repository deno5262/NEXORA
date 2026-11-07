import { useRefresh } from './useRefresh'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { Av, ago } from './ui'
import { EMOJI, fetchFollowingIds } from './posts'
import { markSeen } from './activityApi'
type W = { username: string; full_name: string; avatar_url: string | null }
type Item = { id: string; at: string; who: W; text: string; to: string; followerId?: string; reqId?: string }
export default function Activity() {
  const { session } = useAuth(); const uid = session!.user.id
  const [items, setItems] = useState<Item[] | null>(null); const [err, setErr] = useState(''); const [fol, setFol] = useState<Set<string>>(new Set()); const [tick, setTick] = useState(0); useRefresh(() => setTick(t => t + 1))
  useEffect(() => {
    (async () => {
      const out: Item[] = []
      const rx = await supabase.from('post_reactions').select('post_id,user_id,kind,created_at,who:profiles!post_reactions_user_id_fkey(username,full_name,avatar_url),post:posts!inner(author_id)').eq('post.author_id', uid).neq('user_id', uid).order('created_at', { ascending: false }).limit(30)
      if (rx.error) throw rx.error
      ;(rx.data as any[]).forEach(r => out.push({ id: 'r' + r.post_id + r.user_id, at: r.created_at, who: r.who, text: `reacted ${EMOJI[r.kind] ?? ''} to your post`, to: `/post/${r.post_id}` }))
      const cm = await supabase.from('comments').select('id,post_id,body,created_at,parent_id,audio_path,who:profiles!comments_author_id_fkey(username,full_name,avatar_url),post:posts!inner(author_id)').eq('post.author_id', uid).neq('author_id', uid).order('created_at', { ascending: false }).limit(30)
      if (cm.error) throw cm.error
      ;(cm.data as any[]).forEach(c => out.push({ id: 'c' + c.id, at: c.created_at, who: c.who, to: `/post/${c.post_id}?c=1`, text: `${c.parent_id ? 'replied' : 'commented'}: ${c.body || (c.audio_path ? '🎤 voice comment' : '📷 photo')}` }))
      const mine = await supabase.from('comments').select('id').eq('author_id', uid).limit(200); const mids = (mine.data ?? []).map((r: any) => r.id as string)
      if (mids.length) {
        const rp = await supabase.from('comments').select('id,post_id,body,created_at,who:profiles!comments_author_id_fkey(username,full_name,avatar_url)').in('parent_id', mids).neq('author_id', uid).order('created_at', { ascending: false }).limit(30)
        ;((rp.data ?? []) as any[]).forEach(c => { if (!out.some(o => o.id === 'c' + c.id)) out.push({ id: 'p' + c.id, at: c.created_at, who: c.who, to: `/post/${c.post_id}?c=1`, text: `replied to your comment: ${c.body || '…'}` }) })
      }
      const cl = await supabase.from('comment_reactions').select('comment_id,user_id,created_at,who:profiles!comment_reactions_user_id_fkey(username,full_name,avatar_url),comment:comments!inner(author_id,post_id)').eq('comment.author_id', uid).neq('user_id', uid).order('created_at', { ascending: false }).limit(30)
      ;((cl.data ?? []) as any[]).forEach(r => out.push({ id: 'l' + r.comment_id + r.user_id, at: r.created_at, who: r.who, to: `/post/${r.comment.post_id}?c=1`, text: '❤️ liked your comment' }))
      const fl = await supabase.from('follows').select('follower_id,created_at,who:profiles!follows_follower_id_fkey(username,full_name,avatar_url)').eq('following_id', uid).order('created_at', { ascending: false }).limit(30)
      ;((fl.data ?? []) as any[]).forEach(r => out.push({ id: 'f' + r.follower_id, at: r.created_at, who: r.who, to: `/u/${r.who.username}`, text: 'started following you', followerId: r.follower_id }))
      const rq = await supabase.from('friend_requests').select('id,created_at,who:profiles!friend_requests_sender_id_fkey(username,full_name,avatar_url)').eq('receiver_id', uid).eq('status', 'pending').order('created_at', { ascending: false }).limit(30)
      ;((rq.data ?? []) as any[]).forEach(r => out.push({ id: 'q' + r.id, at: r.created_at, who: r.who, to: `/u/${r.who.username}`, text: 'sent you a friend request', reqId: r.id }))
      const ac = await supabase.from('friend_requests').select('id,responded_at,who:profiles!friend_requests_receiver_id_fkey(username,full_name,avatar_url)').eq('sender_id', uid).eq('status', 'accepted').order('responded_at', { ascending: false }).limit(20)
      ;((ac.data ?? []) as any[]).forEach(r => out.push({ id: 'a' + r.id, at: r.responded_at, who: r.who, to: `/u/${r.who.username}`, text: 'accepted your friend request' }))
      setFol(await fetchFollowingIds(uid))
      out.sort((a, b) => +new Date(b.at) - +new Date(a.at)); setItems(out.slice(0, 60)); markSeen(uid)
    })().catch(e => setErr(e.message))
  }, [tick])
  const followBack = async (id: string) => { const r = await supabase.from('follows').insert({ follower_id: uid, following_id: id }); if (!r.error) setFol(new Set(fol).add(id)) }
  const answer = async (i: Item, accept: boolean) => { const r = await supabase.rpc('respond_friend_request', { req: i.reqId, accept }); if (!r.error) setItems(items!.filter(x => x.id !== i.id)) }
  if (err) return <p role="alert" className="text-red-400">{err}</p>
  if (!items) return <p className="py-10 text-center text-mute">Loading…</p>
  return (<div className="flex flex-col gap-2"><h1 className="mb-1 text-xl font-bold">Activity</h1>
    {!items.length && <p className="py-10 text-center text-mute">No activity yet. Reactions, comments, replies and new followers will show up here.</p>}
    {items.map(i => <div key={i.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
      <Link to={i.to} className="flex min-w-0 flex-1 items-center gap-3"><Av a={i.who} /><p className="min-w-0 flex-1 break-words text-sm"><b>{i.who.full_name || i.who.username}</b> {i.text}</p></Link>
      {i.reqId ? <span className="flex gap-1"><button onClick={() => answer(i, true)} className="btn px-3 py-1.5 text-sm">Accept</button><button onClick={() => answer(i, false)} className="rounded-xl border border-line px-3 py-1.5 text-sm">Decline</button></span> : i.followerId && !fol.has(i.followerId) ? <button onClick={() => followBack(i.followerId!)} className="btn px-3 py-1.5 text-sm">Follow back</button> : <span className="text-xs text-mute">{ago(i.at)}</span>}</div>)}</div>)
}
