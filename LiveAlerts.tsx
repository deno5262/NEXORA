import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { Av } from './ui'
import { EMOJI } from './posts'
type W = { username: string; full_name: string; avatar_url: string | null }
type Toast = { who: W; text: string; postId?: string; commentId?: string; followerId?: string }
export default function LiveAlerts() {
  const { session } = useAuth(); const uid = session!.user.id; const nav = useNavigate(); const [t, setT] = useState<Toast | null>(null); const timer = useRef(0)
  const show = (x: Toast) => { setT(x); window.dispatchEvent(new Event('activity-new')); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setT(null), 5000) }
  const who = async (id: string) => (await supabase.from('profiles').select('username,full_name,avatar_url').eq('id', id).single()).data as W | null
  useEffect(() => {
    const ch = supabase.channel('live-' + uid)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (p: any) => {
        const n = p.new; if (n.author_id === uid) return
        const post = await supabase.from('posts').select('author_id').eq('id', n.post_id).maybeSingle(); let rel = post.data?.author_id === uid
        if (!rel && n.parent_id) { const par = await supabase.from('comments').select('author_id').eq('id', n.parent_id).maybeSingle(); rel = par.data?.author_id === uid }
        if (!rel) return; const w = await who(n.author_id)
        if (w) show({ who: w, postId: n.post_id, commentId: n.id, text: `${n.parent_id ? 'replied' : 'commented'}: ${n.body || (n.audio_path ? '🎤 voice comment' : '📷 photo')}` })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_reactions' }, async (p: any) => {
        const n = p.new; if (n.user_id === uid) return
        const post = await supabase.from('posts').select('author_id').eq('id', n.post_id).maybeSingle(); if (post.data?.author_id !== uid) return
        const w = await who(n.user_id); if (w) show({ who: w, postId: n.post_id, text: `reacted ${EMOJI[n.kind] ?? ''} to your post` })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follows', filter: `following_id=eq.${uid}` }, async (p: any) => {
        const n = p.new; const w = await who(n.follower_id); if (w) show({ who: w, followerId: n.follower_id, text: 'started following you' })
      }).subscribe()
    return () => { supabase.removeChannel(ch); window.clearTimeout(timer.current) }
  }, [uid])
  if (!t) return null
  const go = () => { setT(null); nav(t.followerId ? `/u/${t.who.username}` : `/post/${t.postId}${t.commentId ? '?c=1' : ''}`) }
  const act = (fn: () => Promise<unknown>) => async (e: { stopPropagation: () => void }) => { e.stopPropagation(); await fn(); setT(null) }
  const btn = 'rounded-full border border-line px-3 py-1 text-xs font-semibold'
  return (<div onClick={go} className="pop-in fixed inset-x-3 z-[70] mx-auto flex max-w-xl cursor-pointer items-center gap-3 rounded-2xl border border-accent bg-surface p-3 text-ink shadow-xl" style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}>
    <Av a={{ ...t.who }} /><div className="min-w-0 flex-1"><p className="truncate text-sm"><b>{t.who.full_name || t.who.username}</b> {t.text}</p>
      <div className="mt-1 flex gap-2">
        {t.commentId && <button className={btn} onClick={act(() => supabase.from('comment_reactions').insert({ comment_id: t.commentId, user_id: uid }))}>❤️ Like</button>}
        {t.commentId && <button className={btn}>Reply</button>}
        {t.followerId && <button className={btn} onClick={act(() => supabase.from('follows').insert({ follower_id: uid, following_id: t.followerId }))}>Follow back</button>}</div></div></div>)
}
