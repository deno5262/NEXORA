import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Paperclip, Send, X, Check, CheckCheck, MoreHorizontal, Reply, Copy, Pencil, Trash2, FileText, BellOff } from 'lucide-react'
import { supabase } from './supabase'
import { compress } from './image'
import { useAuth } from './AuthContext'
import { useOnline } from './Presence'
import { statusOf, ge, dayLabel } from './textora'
import { Av, playPop } from './ui'
type R = { user_id: string; emoji: string }
type Msg = { id: string; conversation_id: string; sender_id: string; kind: string; body: string; reply_to: string | null; attachment_path: string | null; attachment_name: string | null; attachment_type: string | null; attachment_size: number | null; edited_at: string | null; deleted_at: string | null; created_at: string; reactions: R[] }
type Other = { id: string; username: string; full_name: string; avatar_url: string | null; show_active: boolean; last_active_at: string | null }
const FILE_TYPES = ['application/pdf', 'text/plain', 'text/csv', 'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
const QUICK = ['👍', '❤️', '😂', '😮', '😢', '🙏']
const size = (n: number | null) => (n ? (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB') : '')
export default function Chat() {
  const { id } = useParams(); const cid = id!; const nav = useNavigate(); const { session, profile } = useAuth(); const uid = session!.user.id; const online = useOnline()
  const [other, setOther] = useState<Other | null | undefined>(undefined); const [rc, setRc] = useState<{ read: string | null; dlv: string | null }>({ read: null, dlv: null }); const [muted, setMuted] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([]); const [urls, setUrls] = useState<Record<string, string>>({}); const [text, setText] = useState(''); const [replyTo, setReplyTo] = useState<Msg | null>(null); const [editing, setEditing] = useState<Msg | null>(null)
  const [sheet, setSheet] = useState<Msg | null>(null); const [typing, setTyping] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [peek, setPeek] = useState<string | null>(null)
  const chan = useRef<any>(null); const typingT = useRef(0); const lastSent = useRef(0); const endRef = useRef<HTMLDivElement>(null); const msgsRef = useRef<Msg[]>([]); msgsRef.current = msgs
  const sign = async (paths: string[]) => {
    if (!paths.length) return
    const { data } = await supabase.storage.from('chat').createSignedUrls(paths, 3600)
    setUrls(u => { const n = { ...u }; data?.forEach(x => { if (x.path && x.signedUrl) n[x.path] = x.signedUrl }); return n })
  }
  const addMsg = (m: Msg) => { setMsgs(cur => (cur.some(x => x.id === m.id) ? cur : [...cur, m])); if (m.attachment_path) sign([m.attachment_path]) }
  const patchMsg = (m: Partial<Msg> & { id: string }) => setMsgs(cur => cur.map(x => (x.id === m.id ? { ...x, ...m } : x)))
  const markRead = () => { const n = new Date().toISOString(); supabase.from('conversation_members').update({ last_read_at: n, last_delivered_at: n }).eq('conversation_id', cid).eq('user_id', uid).then(() => window.dispatchEvent(new Event('textora-unread'))) }
  const reloadReactions = async () => {
    const ids = msgsRef.current.map(m => m.id); if (!ids.length) return
    const { data } = await supabase.from('message_reactions').select('message_id,user_id,emoji').in('message_id', ids)
    const by: Record<string, R[]> = {}; ((data ?? []) as any[]).forEach(r => { if (!by[r.message_id]) by[r.message_id] = []; by[r.message_id].push({ user_id: r.user_id, emoji: r.emoji }) })
    setMsgs(cur => cur.map(m => ({ ...m, reactions: by[m.id] ?? [] })))
  }
  useEffect(() => {
    (async () => {
      const { data: mem } = await supabase.from('conversation_members').select('user_id,last_read_at,last_delivered_at,muted,profile:profiles!conversation_members_user_id_fkey(id,username,full_name,avatar_url,show_active,last_active_at)').eq('conversation_id', cid)
      const rows = (mem ?? []) as any[]; const o = rows.find(m => m.user_id !== uid); const me = rows.find(m => m.user_id === uid)
      if (!o) return setOther(null)
      setOther(o.profile); setRc({ read: o.last_read_at, dlv: o.last_delivered_at }); setMuted(!!me?.muted)
      const { data } = await supabase.from('messages').select('*, reactions:message_reactions(user_id,emoji)').eq('conversation_id', cid).order('created_at', { ascending: false }).limit(80)
      const list = ((data ?? []) as Msg[]).reverse(); setMsgs(list); sign(list.map(m => m.attachment_path).filter(Boolean) as string[]); markRead()
    })().catch(e => setErr(e.message))
    const ch = supabase.channel('chat-' + cid)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${cid}` }, (p: any) => { addMsg({ ...p.new, reactions: [] }); if (p.new.sender_id !== uid) { playPop(); setTyping(false); markRead() } })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${cid}` }, (p: any) => patchMsg(p.new))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => { reloadReactions() })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_members', filter: `conversation_id=eq.${cid}` }, (p: any) => { if (p.new.user_id !== uid) setRc({ read: p.new.last_read_at, dlv: p.new.last_delivered_at }) })
      .on('broadcast', { event: 'typing' }, (p: any) => { if (p.payload?.uid !== uid) { setTyping(true); window.clearTimeout(typingT.current); typingT.current = window.setTimeout(() => setTyping(false), 4000) } })
      .subscribe()
    chan.current = ch
    return () => { window.clearTimeout(typingT.current); supabase.removeChannel(ch) }
  }, [cid])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length, typing])
  const onType = (v: string) => { setText(v); const now = Date.now(); if (v && now - lastSent.current > 2500) { lastSent.current = now; chan.current?.send({ type: 'broadcast', event: 'typing', payload: { uid } }) } }
  const send = async () => {
    const t = text.trim(); if (!t) return; setErr('')
    if (editing) {
      const { error } = await supabase.from('messages').update({ body: t, edited_at: new Date().toISOString() }).eq('id', editing.id)
      if (error) return setErr(error.message); patchMsg({ id: editing.id, body: t, edited_at: new Date().toISOString() }); setEditing(null); setText(''); return
    }
    setText(''); const { data, error } = await supabase.from('messages').insert({ conversation_id: cid, sender_id: uid, kind: 'text', body: t, reply_to: replyTo?.id ?? null }).select('*').single()
    if (error) { setErr(error.message); setText(t) } else { addMsg({ ...(data as Msg), reactions: [] }); setReplyTo(null) }
  }
  const attach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setErr('')
    const img = f.type.startsWith('image/'); if (!img && !FILE_TYPES.includes(f.type)) return setErr('This file type is not supported. Use images, PDF, Office files, TXT, CSV or ZIP.')
    if (f.size > 20 * 1024 * 1024) return setErr('File is too large (max 20 MB).')
    setBusy(true)
    try {
      const blob = img ? await compress(f, 1280) : f; const ext = img ? 'jpg' : ((f.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin')
      const path = `${uid}/${cid}/${crypto.randomUUID()}.${ext}`
      const { error: e1 } = await supabase.storage.from('chat').upload(path, blob, { contentType: img ? 'image/jpeg' : f.type }); if (e1) throw e1
      const { data, error: e2 } = await supabase.from('messages').insert({ conversation_id: cid, sender_id: uid, kind: img ? 'image' : 'file', attachment_path: path, attachment_name: f.name.slice(0, 120), attachment_type: img ? 'image/jpeg' : f.type, attachment_size: blob.size, reply_to: replyTo?.id ?? null }).select('*').single()
      if (e2) { await supabase.storage.from('chat').remove([path]); throw e2 }
      addMsg({ ...(data as Msg), reactions: [] }); setReplyTo(null)
    } catch (x) { setErr((x as Error).message) }
    setBusy(false)
  }
  const react = async (m: Msg, emoji: string) => {
    const mine = m.reactions.find(r => r.user_id === uid); const same = mine?.emoji === emoji
    patchMsg({ id: m.id, reactions: same ? m.reactions.filter(r => r.user_id !== uid) : [...m.reactions.filter(r => r.user_id !== uid), { user_id: uid, emoji }] })
    const r = same ? await supabase.from('message_reactions').delete().eq('message_id', m.id).eq('user_id', uid) : await supabase.from('message_reactions').upsert({ message_id: m.id, user_id: uid, emoji }, { onConflict: 'message_id,user_id' })
    if (r.error) setErr(r.error.message); setSheet(null)
  }
  const del = async (m: Msg) => {
    setSheet(null); if (!confirm('Delete this message for everyone?')) return
    const at = new Date().toISOString(); const { error } = await supabase.from('messages').update({ body: '', deleted_at: at }).eq('id', m.id); if (error) return setErr(error.message)
    if (m.attachment_path) await supabase.storage.from('chat').remove([m.attachment_path]); patchMsg({ id: m.id, body: '', deleted_at: at })
  }
  const toggleMute = async () => { const v = !muted; setMuted(v); await supabase.from('conversation_members').update({ muted: v }).eq('conversation_id', cid).eq('user_id', uid) }
  if (other === undefined) return <div className="fixed inset-0 z-40 grid place-items-center bg-bg text-mute">{err || 'Loading…'}</div>
  if (!other) return <div className="fixed inset-0 z-40 grid place-items-center bg-bg p-6 text-center"><div><p className="mb-3 text-mute">Conversation not found.</p><button className="btn" onClick={() => nav('/textora')}>Back to TEXTORA</button></div></div>
  const myShow = profile?.show_active !== false; const status = typing ? 'Typing…' : myShow ? statusOf(online.has(other.id), other.show_active, other.last_active_at) : ''
  const quote = (m: Msg) => { const q = m.reply_to ? msgs.find(x => x.id === m.reply_to) : null; return q ? { who: q.sender_id === uid ? 'You' : other.full_name || other.username, text: q.deleted_at ? 'Deleted message' : q.kind === 'image' ? '📷 Photo' : q.kind === 'file' ? '📎 ' + (q.attachment_name ?? 'File') : q.body } : { who: '', text: 'Original message' } }
  let lastDay = ''; const lastMine = [...msgs].reverse().find(m => m.sender_id === uid)?.id
  return (<div className="fixed inset-0 z-40 mx-auto flex max-w-xl flex-col bg-bg text-ink">
    <header className="flex items-center gap-2 border-b border-line bg-surface px-2 pb-2" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
      <button onClick={() => nav('/textora')} aria-label="Back" className="p-2"><ArrowLeft /></button>
      <button onClick={() => nav('/u/' + other.username)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="relative"><Av a={other} />{myShow && other.show_active && online.has(other.id) && <i className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-green-500" />}</span>
        <div className="min-w-0"><b className="block truncate">{other.full_name || other.username}</b><span className={`block truncate text-xs ${typing ? 'text-accent' : 'text-mute'}`}>{status}</span></div></button>
      <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className={`p-2 ${muted ? 'text-accent' : 'text-mute'}`}><BellOff size={20} /></button></header>
    <div className="flex-1 overflow-y-auto px-3 py-2">
      {!msgs.length && <p className="py-16 text-center text-mute">No messages yet. Say hello 👋</p>}
      {msgs.map(m => { const mine = m.sender_id === uid; const d = dayLabel(m.created_at); const showDay = d !== lastDay; lastDay = d; const qt = m.reply_to ? quote(m) : null
        const counts: Record<string, number> = {}; m.reactions.forEach(r => { counts[r.emoji] = (counts[r.emoji] ?? 0) + 1 })
        return (<div key={m.id}>{showDay && <p className="my-3 text-center text-xs text-mute">{d}</p>}
          <div className={`mb-1 flex items-end gap-1 ${mine ? 'flex-row-reverse' : ''}`}>
            <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${mine ? 'rounded-br-md bg-accent text-on' : 'rounded-bl-md border border-line bg-surface'}`}>
              {qt && <div className="mb-1 rounded-lg border-l-2 border-current bg-black/10 px-2 py-1 text-xs opacity-80"><b>{qt.who}</b><p className="line-clamp-2 break-words">{qt.text}</p></div>}
              {m.deleted_at ? <p className="italic opacity-70">This message was deleted</p> : m.kind === 'image' ? (urls[m.attachment_path ?? ''] ? <button onClick={() => setPeek(urls[m.attachment_path!])}><img src={urls[m.attachment_path!]} alt="" className="max-h-64 rounded-xl" /></button> : <div className="h-32 w-40 animate-pulse rounded-xl bg-black/10" />)
                : m.kind === 'file' ? <a href={urls[m.attachment_path ?? '']} target="_blank" rel="noreferrer" download={m.attachment_name ?? undefined} className="flex items-center gap-2"><FileText size={28} /><span className="min-w-0"><b className="block truncate text-sm">{m.attachment_name}</b><small>{size(m.attachment_size)}</small></span></a>
                : <p className="whitespace-pre-wrap break-words">{m.body}</p>}
              <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? 'opacity-80' : 'text-mute'}`}>{m.edited_at && !m.deleted_at && <span>edited</span>}<span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {mine && !m.deleted_at && (ge(rc.read, m.created_at) ? <CheckCheck size={14} style={{ color: '#38bdf8' }} /> : ge(rc.dlv, m.created_at) ? <CheckCheck size={14} /> : <Check size={14} />)}</div>
              {Object.keys(counts).length > 0 && <div className="mt-1 flex flex-wrap gap-1">{Object.entries(counts).map(([e, n]) => <span key={e} className="rounded-full bg-black/15 px-1.5 text-xs">{e} {n}</span>)}</div>}</div>
            {!m.deleted_at && <button onClick={() => setSheet(m)} aria-label="Message options" className="p-1 text-mute opacity-60"><MoreHorizontal size={16} /></button>}</div>
          {mine && m.id === lastMine && !m.deleted_at && <p className="mb-1 text-right text-[10px] text-mute">{ge(rc.read, m.created_at) ? 'Read' : ge(rc.dlv, m.created_at) ? 'Delivered' : 'Sent'}</p>}</div>) })}
      {typing && <p className="px-1 text-sm text-accent">Typing…</p>}<div ref={endRef} /></div>
    <div className="border-t border-line bg-surface p-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      {err && <p role="alert" className="px-2 pb-1 text-sm text-red-400">{err}</p>}
      {(replyTo || editing) && <div className="mb-2 flex items-center justify-between rounded-xl bg-bg px-3 py-1.5 text-sm"><span className="min-w-0 truncate text-mute">{editing ? 'Editing message' : 'Replying to ' + quote(replyTo!).text}</span><button aria-label="Cancel" onClick={() => { setReplyTo(null); setEditing(null); setText('') }}><X size={16} /></button></div>}
      <div className="flex items-center gap-2">
        <label className="cursor-pointer p-2 text-mute"><Paperclip size={22} /><input type="file" hidden disabled={busy || !!editing} onChange={attach} /></label>
        <input className="min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-2.5 outline-none" maxLength={4000} placeholder={busy ? 'Sending…' : 'Message'} value={text} onChange={e => onType(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
        <button onClick={send} aria-label="Send" disabled={!text.trim()} className="grid h-11 w-11 place-items-center rounded-full bg-accent text-on disabled:opacity-40"><Send size={20} /></button></div></div>
    {sheet && <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => setSheet(null)}><div className="mx-auto w-full max-w-xl rounded-t-2xl bg-surface p-4 text-ink" onClick={e => e.stopPropagation()}>
      <div className="mb-3 flex justify-around">{QUICK.map(e => <button key={e} onClick={() => react(sheet, e)} className="text-3xl active:scale-125">{e}</button>)}</div>
      {[[Reply, 'Reply', () => { setReplyTo(sheet); setSheet(null) }, true], [Copy, 'Copy text', () => { navigator.clipboard?.writeText(sheet.body).catch(() => {}); setSheet(null) }, sheet.kind === 'text'],
        [Pencil, 'Edit', () => { setEditing(sheet); setText(sheet.body); setSheet(null) }, sheet.sender_id === uid && sheet.kind === 'text'], [Trash2, 'Delete for everyone', () => del(sheet), sheet.sender_id === uid]].map(([I, l, fn, ok]: any) => ok && <button key={l} onClick={fn} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-bg ${l.startsWith('Delete') ? 'text-red-400' : ''}`}><I size={20} />{l}</button>)}</div></div>}
    {peek && <div className="fixed inset-0 z-[60] grid place-items-center bg-black" onClick={() => setPeek(null)}><img src={peek} alt="" className="max-h-full max-w-full object-contain" /><button className="absolute right-4 top-4 text-white" aria-label="Close"><X /></button></div>}
  </div>)
}
