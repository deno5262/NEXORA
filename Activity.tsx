import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { Av, ago } from './ui'
import { EMOJI } from './posts'
type Item = { id: string; at: string; who: { username: string; full_name: string; avatar_url: string | null }; text: string; postId: string; open?: boolean }
export default function Activity() {
  const { session } = useAuth(); const uid = session!.user.id
  const [items, setItems] = useState<Item[] | null>(null); const [err, setErr] = useState('')
  useEffect(() => {
    (async () => {
      const out: Item[] = []
      const rx = await supabase.from('post_reactions').select('post_id,user_id,kind,created_at,who:profiles!post_reactions_user_id_fkey(username,full_name,avatar_url),post:posts!inner(author_id)').eq('post.author_id', uid).neq('user_id', uid).order('created_at', { ascending: false }).limit(30)
      if (rx.error) throw rx.error
      ;(rx.data as any[]).forEach(r => out.push({ id: 'r' + r.post_id + r.user_id, at: r.created_at, who: r.who, text: `reacted ${EMOJI[r.kind] ?? ''} to your post`, postId: r.post_id }))
      const cm = await supabase.from('comments').select('id,post_id,body,created_at,parent_id,audio_path,image_path,who:profiles!comments_author_id_fkey(username,full_name,avatar_url),post:posts!inner(author_id)').eq('post.author_id', uid).neq('author_id', uid).order('created_at', { ascending: false }).limit(30)
      if (cm.error) throw cm.error
      ;(cm.data as any[]).forEach(c => out.push({ id: 'c' + c.id, at: c.created_at, who: c.who, open: true, postId: c.post_id, text: `${c.parent_id ? 'replied' : 'commented'}: ${c.body || (c.audio_path ? '🎤 voice comment' : '📷 photo')}` }))
      const mine = await supabase.from('comments').select('id').eq('author_id', uid).limit(200)
      const mids = (mine.data ?? []).map((r: any) => r.id as string)
      if (mids.length) {
        const rp = await supabase.from('comments').select('id,post_id,body,created_at,who:profiles!comments_author_id_fkey(username,full_name,avatar_url)').in('parent_id', mids).neq('author_id', uid).order('created_at', { ascending: false }).limit(30)
        ;(rp.data as any[] ?? []).forEach(c => { if (!out.some(o => o.id === 'c' + c.id)) out.push({ id: 'p' + c.id, at: c.created_at, who: c.who, open: true, postId: c.post_id, text: `replied to your comment: ${c.body || '…'}` }) })
      }
      const cl = await supabase.from('comment_reactions').select('comment_id,user_id,created_at,who:profiles!comment_reactions_user_id_fkey(username,full_name,avatar_url),comment:comments!inner(author_id,post_id)').eq('comment.author_id', uid).neq('user_id', uid).order('created_at', { ascending: false }).limit(30)
      ;(cl.data as any[] ?? []).forEach(r => out.push({ id: 'l' + r.comment_id + r.user_id, at: r.created_at, who: r.who, open: true, postId: r.comment.post_id, text: '❤️ liked your comment' }))
      out.sort((a, b) => +new Date(b.at) - +new Date(a.at)); setItems(out.slice(0, 50))
    })().catch(e => setErr(e.message))
  }, [])
  if (err) return <p role="alert" className="text-red-400">{err}</p>
  if (!items) return <p className="py-10 text-center text-mute">Loading…</p>
  return (<div className="flex flex-col gap-2"><h1 className="mb-1 text-xl font-bold">Activity</h1>
    {!items.length && <p className="py-10 text-center text-mute">No activity yet. Reactions, comments and replies on your posts will show up here.</p>}
    {items.map(i => <Link key={i.id} to={`/post/${i.postId}${i.open ? '?c=1' : ''}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
      <Av a={i.who} /><p className="min-w-0 flex-1 break-words text-sm"><b>{i.who.full_name || i.who.username}</b> {i.text}</p><span className="text-xs text-mute">{ago(i.at)}</span></Link>)}
    <p className="pt-2 text-center text-xs text-mute">Follows and unfollows will appear here once the follow system is added.</p></div>)
}
