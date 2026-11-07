import { useBackClose } from './useBackClose'
import { useState } from 'react'
import { Bookmark, Link2, Pencil, BarChart3, Trash2, Flag, X } from 'lucide-react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { Post, EMOJI } from './posts'
const REASONS = ['Spam or scam', 'Nudity or sexual content', 'Harassment or hate', 'Violence or dangerous acts', 'False information', 'Something else']
const link = (p: Post) => `${location.origin}/post/${p.id}`
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useBackClose(true, onClose)
  return (
  <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}><div className="mx-auto w-full max-w-xl rounded-t-2xl bg-surface p-4 text-ink" onClick={e => e.stopPropagation()}>
    <div className="mb-3 flex items-center justify-between"><b>{title}</b><button onClick={onClose} aria-label="Close"><X /></button></div>{children}</div></div>)
}
export function ShareSheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const [done, setDone] = useState(''); const u = encodeURIComponent(link(post))
  const copy = async () => { try { await navigator.clipboard.writeText(link(post)); setDone('Link copied') } catch { setDone('Could not copy. Long-press the address bar instead.') } }
  const items: [string, string][] = [['WhatsApp', `https://wa.me/?text=${u}`], ['Messenger', `fb-messenger://share/?link=${u}`], ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`], ['Telegram', `https://t.me/share/url?url=${u}`]]
  return (<Sheet title="Share" onClose={onClose}><div className="grid grid-cols-2 gap-2">
    <button onClick={copy} className="flex items-center gap-2 rounded-xl border border-line p-3"><Link2 size={18} className="text-accent" />Copy link</button>
    {items.map(([n, h]) => <a key={n} href={h} target="_blank" rel="noreferrer" className="rounded-xl border border-line p-3">{n}</a>)}
    {typeof navigator.share === 'function' && <button onClick={() => navigator.share({ url: link(post), text: post.caption.slice(0, 100) }).catch(() => {})} className="col-span-2 rounded-xl border border-line p-3">More apps…</button>}</div>
    {done && <p role="status" className="mt-2 text-sm text-accent">{done}</p>}
    {post.audience !== 'public' && <p className="mt-2 text-xs text-mute">Only people who are allowed to see this post can open the link.</p>}</Sheet>)
}
export function PostMenu({ post, mine, saved, onSave, onClose, onEdited, onDeleted }: { post: Post; mine: boolean; saved: boolean; onSave: () => void; onClose: () => void; onEdited: (p: Partial<Post>) => void; onDeleted: () => void }) {
  const { session } = useAuth(); const [mode, setMode] = useState('menu'); const [caption, setCaption] = useState(post.caption); const [aud, setAud] = useState(post.audience); const [msg, setMsg] = useState('')
  const row = (I: typeof Pencil, label: string, fn: () => void, red = false) => <button key={label} onClick={fn} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-bg ${red ? 'text-red-400' : ''}`}><I size={20} className={red ? '' : 'text-accent'} />{label}</button>
  const saveEdit = async () => {
    const { error } = await supabase.from('posts').update({ caption: caption.trim(), audience: aud, updated_at: new Date().toISOString() }).eq('id', post.id)
    if (error) return setMsg(error.message); onEdited({ caption: caption.trim(), audience: aud }); onClose()
  }
  const del = async () => {
    if (!confirm('Delete this post?')) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id); if (error) return setMsg(error.message)
    await supabase.storage.from('posts').remove(post.media.map(m => m.path)); onDeleted(); onClose()
  }
  const report = async (reason: string) => {
    const { error } = await supabase.from('reports').insert({ reporter_id: session!.user.id, post_id: post.id, reason })
    setMsg(error ? (error.code === '23505' ? 'You already reported this post.' : error.message) : 'Thanks. We will review it.')
  }
  if (mode === 'edit') return (<Sheet title="Edit post" onClose={onClose}><div className="flex flex-col gap-3">
    <textarea className="input" rows={4} maxLength={2000} value={caption} onChange={e => setCaption(e.target.value)} />
    <select className="input" value={aud} onChange={e => setAud(e.target.value)}><option value="public">Public</option><option value="friends">Friends</option><option value="only_me">Only me</option></select>
    {msg && <p className="text-sm text-red-400">{msg}</p>}<button className="btn" onClick={saveEdit}>Save</button></div></Sheet>)
  if (mode === 'stats') { const by: Record<string, number> = {}; post.reactions.forEach(r => { by[r.kind] = (by[r.kind] ?? 0) + 1 })
    return (<Sheet title="Post analytics" onClose={onClose}><div className="grid grid-cols-3 gap-2 text-center">
      {[['Views', post.views], ['Reactions', post.reactions.length], ['Comments', post.comments]].map(([k, v]) => <div key={k} className="rounded-xl border border-line p-3"><b className="text-xl text-accent">{v}</b><div className="text-xs text-mute">{k}</div></div>)}</div>
      <p className="mt-3 flex flex-wrap gap-3">{Object.entries(by).map(([k, v]) => <span key={k}>{EMOJI[k]} {v}</span>)}</p><p className="mt-2 text-xs text-mute">Views count each person once.</p></Sheet>) }
  if (mode === 'report') return (<Sheet title="Report post" onClose={onClose}>{REASONS.map(r => <button key={r} onClick={() => report(r)} className="block w-full rounded-xl p-3 text-left hover:bg-bg">{r}</button>)}{msg && <p role="status" className="mt-2 text-sm text-accent">{msg}</p>}</Sheet>)
  return (<Sheet title="Post options" onClose={onClose}>
    {row(Bookmark, saved ? 'Remove from saved' : 'Save post', () => { onSave(); onClose() })}
    {row(Link2, 'Copy link', async () => { try { await navigator.clipboard.writeText(link(post)) } catch { /* ignore */ } onClose() })}
    {mine && row(Pencil, 'Edit post & privacy', () => setMode('edit'))}{mine && row(BarChart3, 'Analytics', () => setMode('stats'))}
    {!mine && row(Flag, 'Report post', () => setMode('report'), true)}{mine && row(Trash2, 'Delete post', del, true)}
    {msg && <p className="mt-2 text-sm text-red-400">{msg}</p>}</Sheet>)
}
