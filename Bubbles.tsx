import { useBackClose } from './useBackClose'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Maximize2, X, Send } from 'lucide-react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { Avatar } from './ui'
import { Bubble, getBubbles, removeBubble } from './bubbles'
import { playNotify, playSend } from './sounds'
type M = { id: string; sender_id: string; kind: string; body: string; deleted_at: string | null; created_at: string }
const lab = (m: M) => (m.deleted_at ? 'Message deleted' : m.kind === 'image' ? '📷 Photo' : m.kind === 'voice' ? '🎤 Voice message' : m.kind === 'video' ? '🎥 Video' : m.kind === 'file' ? '📎 File' : m.body)
function MiniChat({ b, onClose }: { b: Bubble; onClose: () => void }) {
  useBackClose(true, onClose)
  const { session } = useAuth(); const uid = session!.user.id; const nav = useNavigate(); const [msgs, setMsgs] = useState<M[]>([]); const [text, setText] = useState(''); const [err, setErr] = useState(''); const end = useRef<HTMLDivElement>(null)
  const markRead = () => { const n = new Date().toISOString(); supabase.from('conversation_members').update({ last_read_at: n, last_delivered_at: n }).eq('conversation_id', b.id).eq('user_id', uid).then(() => window.dispatchEvent(new Event('textora-unread'))) }
  useEffect(() => {
    supabase.from('messages').select('id,sender_id,kind,body,deleted_at,created_at').eq('conversation_id', b.id).order('created_at', { ascending: false }).limit(30).then(({ data }) => { setMsgs(((data ?? []) as M[]).reverse()); markRead() })
    const ch = supabase.channel('mini-' + b.id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${b.id}` }, (p: any) => { setMsgs(c => (c.some(x => x.id === p.new.id) ? c : [...c, p.new])); if (p.new.sender_id !== uid) { playNotify(); markRead() } })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${b.id}` }, (p: any) => setMsgs(c => c.map(x => (x.id === p.new.id ? { ...x, ...p.new } : x)))).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [b.id])
  useEffect(() => { end.current?.scrollIntoView() }, [msgs.length])
  const send = async () => {
    const t = text.trim(); if (!t) return; setText(''); setErr('')
    const { data, error } = await supabase.from('messages').insert({ conversation_id: b.id, sender_id: uid, kind: 'text', body: t }).select('id,sender_id,kind,body,deleted_at,created_at').single()
    if (error) { setErr(/row-level security/i.test(error.message) ? "You can't message this chat right now." : error.message); setText(t) } else { playSend(); setMsgs(c => (c.some(x => x.id === (data as M).id) ? c : [...c, data as M])) }
  }
  return (<div className="fixed right-3 z-40 flex h-[55vh] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-2xl" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 6rem)' }}>
    <div className="flex items-center gap-2 border-b border-line p-2"><Avatar a={{ avatar_url: b.avatar_url, full_name: b.name, username: b.name }} s={32} /><b className="min-w-0 flex-1 truncate">{b.name}</b>
      <button aria-label="Open full chat" onClick={() => { onClose(); nav('/textora/c/' + b.id) }} className="p-1.5 text-mute"><Maximize2 size={16} /></button><button aria-label="Close" onClick={onClose} className="p-1.5 text-mute"><X size={18} /></button></div>
    <div className="flex-1 space-y-1 overflow-y-auto p-2">{msgs.map(m => { const mine = m.sender_id === uid; return m.kind === 'system' ? <p key={m.id} className="text-center text-xs text-mute">{m.body}</p> : <div key={m.id} className={`flex ${mine ? 'justify-end' : ''}`}><span className={`max-w-[80%] break-words rounded-2xl px-3 py-1.5 text-sm ${mine ? 'bg-accent text-on' : 'bg-bg'}`}>{lab(m)}</span></div> })}<div ref={end} /></div>
    {err && <p className="px-2 text-xs text-red-400">{err}</p>}
    <div className="flex gap-2 border-t border-line p-2"><input className="min-w-0 flex-1 rounded-full border border-line bg-bg px-3 py-2 text-sm outline-none" placeholder="Message" maxLength={4000} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} /><button aria-label="Send" onClick={send} className="grid h-9 w-9 place-items-center rounded-full bg-accent text-on"><Send size={16} /></button></div></div>)
}
export default function Bubbles() {
  const [list, setList] = useState<Bubble[]>(getBubbles()); const [open, setOpen] = useState<string | null>(null)
  useEffect(() => { const f = () => setList(getBubbles()); window.addEventListener('bubbles', f); return () => window.removeEventListener('bubbles', f) }, [])
  const cur = list.find(b => b.id === open)
  if (!list.length || localStorage.getItem('bubblesOn') === 'off') return null
  return (<><div className="fixed right-3 z-30 flex flex-col gap-3" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 6.5rem)', display: cur ? 'none' : 'flex' }}>
    {list.map(b => <button key={b.id} onClick={() => setOpen(b.id)} aria-label={b.name} className="relative rounded-full shadow-xl"><Avatar a={{ avatar_url: b.avatar_url, full_name: b.name, username: b.name }} s={52} />
      <span role="button" aria-label="Close bubble" onClick={e => { e.stopPropagation(); removeBubble(b.id) }} className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-line bg-bg text-xs">×</span></button>)}</div>
    {cur && <MiniChat b={cur} onClose={() => setOpen(null)} />}</>)
}
