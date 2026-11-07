import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Paperclip, Send, X, Check, CheckCheck, MoreHorizontal, MoreVertical, Reply, Copy, Pencil, Trash2, FileText, BellOff, Bell, Mic, Search, Forward, Pin, PinOff, Ban, Flag, Minimize2, Users } from 'lucide-react'
import { supabase } from './supabase'
import { compress } from './image'
import { useAuth } from './AuthContext'
import { useOnline } from './Presence'
import { useTypingView } from './useTyping'
import { useBackClose } from './useBackClose'
import { fetchConvs, Conv, convAv, statusOf, ge, dayLabel } from './textora'
import { playNotify, playSend, playTyping } from './sounds'
import { addBubble } from './bubbles'
import { Avatar } from './ui'
import { VoicePlayer, computePeaks } from './Voice'
import GroupInfo from './GroupInfo'
type R = { user_id: string; emoji: string }
type Msg = { id: string; conversation_id: string; sender_id: string; kind: string; body: string; reply_to: string | null; attachment_path: string | null; attachment_name: string | null; attachment_type: string | null; attachment_size: number | null; audio_peaks: number[] | null; audio_ms: number | null; forwarded: boolean; pinned_at: string | null; edited_at: string | null; deleted_at: string | null; created_at: string; reactions: R[] }
type Prof = { id: string; username: string; full_name: string; avatar_url: string | null; show_active: boolean; last_active_at: string | null }
type Mem = { user_id: string; role: string; last_read_at: string; last_delivered_at: string; muted: boolean; profile: Prof }
type Info = { kind: string; title: string | null; avatar_url: string | null; only_admins_add: boolean; created_by: string | null }
const FILE_TYPES = ['application/pdf', 'text/plain', 'text/csv', 'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const QUICK = ['👍', '❤️', '😂', '😮', '😢', '🙏']
const REASONS = ['Spam or scam', 'Harassment or bullying', 'Nudity or sexual content', 'Threats or violence', 'Something else']
const size = (n: number | null) => (n ? (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB') : '')
const human = (m: string) => (/row-level security/i.test(m) ? "You can't send messages in this chat right now." : m)
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const GRAD = { background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: 'var(--on)' }
function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useBackClose(true, onClose)
  return <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}><div className="mx-auto max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-surface p-4 text-ink" onClick={e => e.stopPropagation()}>{children}</div></div>
}
export default function Chat() {
  const { id } = useParams(); const cid = id!; const nav = useNavigate(); const { session, profile } = useAuth(); const uid = session!.user.id; const online = useOnline()
  const [conv, setConv] = useState<Info | null | undefined>(undefined); const [members, setMembers] = useState<Mem[]>([]); const [muted, setMuted] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([]); const [urls, setUrls] = useState<Record<string, string>>({}); const [text, setText] = useState(''); const [replyTo, setReplyTo] = useState<Msg | null>(null); const [editing, setEditing] = useState<Msg | null>(null)
  const [sheet, setSheet] = useState<Msg | null>(null); const [typing, setTyping] = useState<string | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [peek, setPeek] = useState<string | null>(null)
  const [menu, setMenu] = useState(false); const [fwd, setFwd] = useState<Msg | null>(null); const [fwdList, setFwdList] = useState<Conv[]>([]); const [rep, setRep] = useState<{ msg: Msg | null } | null>(null); const [repDone, setRepDone] = useState(''); const [groupInfo, setGroupInfo] = useState(false)
  const [searchOn, setSearchOn] = useState(false); const [sq, setSq] = useState(''); const [sres, setSres] = useState<Msg[]>([]); const [iBlocked, setIBlocked] = useState(false); const [blockedMe, setBlockedMe] = useState(false); const [recSecs, setRecSecs] = useState<number | null>(null)
  const chan = useRef<any>(null); const typingT = useRef(0); const lastSent = useRef(0); const lastPub = useRef(0); const endRef = useRef<HTMLDivElement>(null); const msgsRef = useRef<Msg[]>([]); msgsRef.current = msgs; const typingRef = useRef<string | null>(null); typingRef.current = typing
  const rec = useRef<{ mr: MediaRecorder; chunks: BlobPart[]; discard: boolean; timer: number; secs: number } | null>(null)
  useBackClose(peek !== null, () => setPeek(null))
  const isGroup = conv?.kind === 'group'; const other = !isGroup ? members.find(m => m.user_id !== uid)?.profile : undefined; const typingMap = useTypingView(!isGroup)
  const prof = (pid: string) => members.find(m => m.user_id === pid)?.profile; const nameOf = (pid: string) => (pid === uid ? 'You' : prof(pid)?.full_name || prof(pid)?.username || 'Someone')
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
  const loadBlocks = async (oid: string) => {
    const { data } = await supabase.from('blocks').select('blocker_id,blocked_id').or(`and(blocker_id.eq.${uid},blocked_id.eq.${oid}),and(blocker_id.eq.${oid},blocked_id.eq.${uid})`)
    const rows = (data ?? []) as any[]; setIBlocked(rows.some(r => r.blocker_id === uid)); setBlockedMe(rows.some(r => r.blocker_id === oid))
  }
  const loadInfo = async () => {
    const [c, m] = await Promise.all([
      supabase.from('conversations').select('kind,title,avatar_url,only_admins_add,created_by').eq('id', cid).maybeSingle(),
      supabase.from('conversation_members').select('user_id,role,last_read_at,last_delivered_at,muted,profile:profiles!conversation_members_user_id_fkey(id,username,full_name,avatar_url,show_active,last_active_at)').eq('conversation_id', cid)])
    if (!c.data) return setConv(null)
    const rows = (m.data ?? []) as any as Mem[]; setConv(c.data as Info); setMembers(rows); setMuted(!!rows.find(r => r.user_id === uid)?.muted)
    const o = rows.find(r => r.user_id !== uid); if ((c.data as any).kind === 'direct' && o) loadBlocks(o.user_id)
  }
  useEffect(() => {
    (async () => {
      await loadInfo()
      const { data } = await supabase.from('messages').select('*, reactions:message_reactions(user_id,emoji)').eq('conversation_id', cid).order('created_at', { ascending: false }).limit(80)
      const list = ((data ?? []) as Msg[]).reverse(); setMsgs(list); sign(list.map(m => m.attachment_path).filter(Boolean) as string[]); markRead()
    })().catch(e => setErr(e.message))
    const ch = supabase.channel('chat-' + cid)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${cid}` }, (p: any) => { addMsg({ ...p.new, reactions: [] }); if (p.new.kind === 'system') loadInfo(); if (p.new.sender_id !== uid) { playNotify(); setTyping(null); markRead() } })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${cid}` }, (p: any) => patchMsg(p.new))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => { reloadReactions() })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_members', filter: `conversation_id=eq.${cid}` }, (p: any) => setMembers(cur => cur.map(x => (x.user_id === p.new.user_id ? { ...x, last_read_at: p.new.last_read_at, last_delivered_at: p.new.last_delivered_at, role: p.new.role } : x))))
      .on('broadcast', { event: 'typing' }, (p: any) => { const who = p.payload?.uid; if (who && who !== uid) { if (!typingRef.current) playTyping(); setTyping(who); window.clearTimeout(typingT.current); typingT.current = window.setTimeout(() => setTyping(null), 4000) } })
      .subscribe()
    chan.current = ch
    return () => { window.clearTimeout(typingT.current); supabase.removeChannel(ch); supabase.from('typing_status').delete().eq('user_id', uid).then(() => {}); if (rec.current) { rec.current.discard = true; window.clearInterval(rec.current.timer); if (rec.current.mr.state === 'recording') rec.current.mr.stop() } }
  }, [cid])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length, typing])
  useEffect(() => {
    const term = sq.trim().replace(/[%_\\]/g, ' ').trim(); if (!searchOn || term.length < 2) { setSres([]); return }
    const t = setTimeout(() => { supabase.from('messages').select('*').eq('conversation_id', cid).is('deleted_at', null).ilike('body', `%${term}%`).order('created_at', { ascending: false }).limit(30).then(({ data }) => setSres(((data ?? []) as any[]).map(m => ({ ...m, reactions: [] })))) }, 300)
    return () => clearTimeout(t)
  }, [sq, searchOn])
  const jump = (mid: string) => { setSearchOn(false); setSq(''); setTimeout(() => { const el = document.getElementById('m-' + mid); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('ring-2'); setTimeout(() => el.classList.remove('ring-2'), 1500) } }, 50) }
  const onType = (v: string) => {
    setText(v); const now = Date.now()
    if (v && now - lastSent.current > 2500) { lastSent.current = now; chan.current?.send({ type: 'broadcast', event: 'typing', payload: { uid } }) }
    if (v && profile?.typing_status_enabled && !isGroup && other && now - lastPub.current > 3000) { lastPub.current = now; supabase.from('typing_status').upsert({ user_id: uid, with_user: other.id, updated_at: new Date().toISOString() }).then(() => {}) }
  }
  const clearTypingStatus = () => { lastPub.current = 0; if (profile?.typing_status_enabled) supabase.from('typing_status').delete().eq('user_id', uid).then(() => {}) }
  const insert = async (row: Record<string, any>) => {
    const { data, error } = await supabase.from('messages').insert({ conversation_id: cid, sender_id: uid, reply_to: replyTo?.id ?? null, ...row }).select('*').single()
    if (error) throw error; addMsg({ ...(data as Msg), reactions: [] }); setReplyTo(null); playSend(); clearTypingStatus()
  }
  const send = async () => {
    const t = text.trim(); if (!t) return; setErr('')
    if (editing) {
      const { error } = await supabase.from('messages').update({ body: t, edited_at: new Date().toISOString() }).eq('id', editing.id)
      if (error) return setErr(human(error.message)); patchMsg({ id: editing.id, body: t, edited_at: new Date().toISOString() }); setEditing(null); setText(''); return
    }
    setText(''); try { await insert({ kind: 'text', body: t }) } catch (e) { setErr(human((e as Error).message)); setText(t) }
  }
  const upload = async (blob: Blob | File, ext: string, type: string) => {
    const path = `${uid}/${cid}/${crypto.randomUUID()}.${ext}`; const { error } = await supabase.storage.from('chat').upload(path, blob, { contentType: type }); if (error) throw error; return path
  }
  const attach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setErr('')
    const img = f.type.startsWith('image/'); const vid = VIDEO_TYPES.includes(f.type)
    if (!img && !vid && !FILE_TYPES.includes(f.type)) return setErr('This file type is not supported. Use images, videos, PDF, Office files, TXT, CSV or ZIP.')
    if (f.size > 20 * 1024 * 1024) return setErr('File is too large (max 20 MB).')
    setBusy(true); let path = ''
    try {
      const blob = img ? await compress(f, 1280) : f; const ext = img ? 'jpg' : ((f.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'); const type = img ? 'image/jpeg' : f.type
      path = await upload(blob, ext, type)
      await insert({ kind: img ? 'image' : vid ? 'video' : 'file', attachment_path: path, attachment_name: f.name.slice(0, 120), attachment_type: type, attachment_size: blob.size })
    } catch (x) { if (path) await supabase.storage.from('chat').remove([path]); setErr(human((x as Error).message)) }
    setBusy(false)
  }
  const finishVoice = async (blob: Blob, secs: number) => {
    if (blob.size < 1500) return setErr('Recording was too short.')
    setBusy(true); let path = ''
    try {
      const wf = await computePeaks(blob); const mime = blob.type.split(';')[0] || 'audio/webm'; const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'
      path = await upload(blob, ext, mime)
      await insert({ kind: 'voice', attachment_path: path, attachment_type: mime, attachment_size: blob.size, audio_peaks: wf.peaks, audio_ms: Math.round(wf.ms) || secs * 1000 })
    } catch (x) { if (path) await supabase.storage.from('chat').remove([path]); setErr(human((x as Error).message)) }
    setBusy(false)
  }
  const startRec = async () => {
    setErr('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mr = new MediaRecorder(stream); const r = { mr, chunks: [] as BlobPart[], discard: false, timer: 0, secs: 0 }
      mr.ondataavailable = e => r.chunks.push(e.data)
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); window.clearInterval(r.timer); setRecSecs(null); if (!r.discard) finishVoice(new Blob(r.chunks, { type: mr.mimeType || 'audio/webm' }), r.secs) }
      mr.start(); rec.current = r; setRecSecs(0); r.timer = window.setInterval(() => { r.secs += 1; setRecSecs(r.secs); if (r.secs >= 180 && mr.state === 'recording') mr.stop() }, 1000)
    } catch { setErr('Microphone permission is needed to record a voice message.') }
  }
  const stopRec = (discard: boolean) => { const r = rec.current; if (!r) return; r.discard = discard; if (r.mr.state === 'recording') r.mr.stop() }
  const react = async (m: Msg, emoji: string) => {
    const mine = m.reactions.find(r => r.user_id === uid); const same = mine?.emoji === emoji
    patchMsg({ id: m.id, reactions: same ? m.reactions.filter(r => r.user_id !== uid) : [...m.reactions.filter(r => r.user_id !== uid), { user_id: uid, emoji }] })
    const r = same ? await supabase.from('message_reactions').delete().eq('message_id', m.id).eq('user_id', uid) : await supabase.from('message_reactions').upsert({ message_id: m.id, user_id: uid, emoji }, { onConflict: 'message_id,user_id' })
    if (r.error) setErr(r.error.message); setSheet(null)
  }
  const del = async (m: Msg) => {
    setSheet(null); if (!confirm('Delete this message for everyone?')) return
    const at = new Date().toISOString(); const { error } = await supabase.from('messages').update({ body: '', deleted_at: at }).eq('id', m.id); if (error) return setErr(error.message)
    if (m.attachment_path) await supabase.storage.from('chat').remove([m.attachment_path]); patchMsg({ id: m.id, body: '', deleted_at: at, pinned_at: null })
  }
  const pin = async (m: Msg) => { setSheet(null); const { error } = await supabase.rpc('pin_message', { mid: m.id, pin: !m.pinned_at }); if (error) setErr(error.message) }
  const openFwd = async (m: Msg) => { setSheet(null); setFwd(m); setFwdList(await fetchConvs().catch(() => [])) }
  const forwardTo = async (target: string) => {
    const m = fwd!; let path: string | null = null
    try {
      if (m.attachment_path) { path = `${uid}/${target}/${crypto.randomUUID()}.${m.attachment_path.split('.').pop() ?? 'bin'}`; const { error } = await supabase.storage.from('chat').copy(m.attachment_path, path); if (error) throw error }
      const { error } = await supabase.from('messages').insert({ conversation_id: target, sender_id: uid, kind: m.kind, body: m.kind === 'text' ? m.body : '', attachment_path: path, attachment_name: m.attachment_name, attachment_type: m.attachment_type, attachment_size: m.attachment_size, audio_peaks: m.audio_peaks, audio_ms: m.audio_ms, forwarded: true })
      if (error) throw error; setFwd(null); playSend()
    } catch (x) { if (path) await supabase.storage.from('chat').remove([path]); setErr(human((x as Error).message)); setFwd(null) }
  }
  const toggleMute = async () => { const v = !muted; setMuted(v); setMenu(false); await supabase.from('conversation_members').update({ muted: v }).eq('conversation_id', cid).eq('user_id', uid) }
  const toggleBlock = async () => {
    setMenu(false); if (!other) return
    if (iBlocked) { await supabase.from('blocks').delete().eq('blocker_id', uid).eq('blocked_id', other.id) } else { if (!confirm(`Block ${other.full_name || other.username}? They won't be able to message you.`)) return; const { error } = await supabase.from('blocks').insert({ blocker_id: uid, blocked_id: other.id }); if (error) return setErr(error.message) }
    loadBlocks(other.id)
  }
  const report = async (reason: string) => {
    if (!rep) return; const target = rep.msg ? rep.msg.sender_id : other?.id ?? conv?.created_by
    if (!target) return setRepDone('Could not send the report.')
    const { error } = await supabase.from('user_reports').insert({ reporter_id: uid, target_id: target, conversation_id: cid, message_id: rep.msg?.id ?? null, reason })
    setRepDone(error ? error.message : 'Thanks. We will review this report.')
  }
  const minimize = () => { if (!conv) return; addBubble({ id: cid, name: isGroup ? conv.title ?? 'Group' : other?.full_name || other?.username || 'Chat', avatar_url: isGroup ? conv.avatar_url : other?.avatar_url ?? null }); nav('/') }
  if (conv === undefined) return <div className="fixed inset-0 z-40 grid place-items-center bg-bg text-mute">{err || 'Loading…'}</div>
  if (!conv || (!isGroup && !other)) return <div className="fixed inset-0 z-40 grid place-items-center bg-bg p-6 text-center"><div><p className="mb-3 text-mute">Conversation not found.</p><button className="btn" onClick={() => nav('/textora')}>Back to TEXTORA</button></div></div>
  const myShow = profile?.show_active !== false; const typer = typing ? nameOf(typing).split(' ')[0] : ''
  const status = typing ? (isGroup ? `${typer} is typing…` : 'Typing…') : isGroup ? `${members.length} members` : other && typingMap[other.id] ? typingMap[other.id] : myShow && other ? statusOf(online.has(other.id), other.show_active, other.last_active_at) : ''
  const headName = isGroup ? conv.title ?? 'Group' : other!.full_name || other!.username
  const headAv = isGroup ? { avatar_url: conv.avatar_url, full_name: conv.title ?? 'G', username: 'group' } : other!
  const label = (q: Msg) => (q.deleted_at ? 'Deleted message' : q.kind === 'image' ? '📷 Photo' : q.kind === 'video' ? '🎥 Video' : q.kind === 'voice' ? '🎤 Voice message' : q.kind === 'file' ? '📎 ' + (q.attachment_name ?? 'File') : q.body)
  const quote = (m: Msg) => { const q = m.reply_to ? msgs.find(x => x.id === m.reply_to) : null; return q ? { who: nameOf(q.sender_id), text: label(q) } : { who: '', text: 'Original message' } }
  const pinned = [...msgs].filter(m => m.pinned_at && !m.deleted_at).sort((a, b) => b.pinned_at!.localeCompare(a.pinned_at!))[0]
  const readers = (m: Msg) => members.filter(x => x.user_id !== uid && ge(x.last_read_at, m.created_at)); const delivered = (m: Msg) => members.some(x => x.user_id !== uid && ge(x.last_delivered_at, m.created_at))
  const lastMine = [...msgs].reverse().find(m => m.sender_id === uid && m.kind !== 'system')?.id
  const actions: [typeof Reply, string, () => void, boolean][] = sheet ? [[Reply, 'Reply', () => { setReplyTo(sheet); setSheet(null) }, true], [Copy, 'Copy text', () => { navigator.clipboard?.writeText(sheet.body).catch(() => {}); setSheet(null) }, sheet.kind === 'text'],
    [Forward, 'Forward', () => openFwd(sheet), true], [sheet.pinned_at ? PinOff : Pin, sheet.pinned_at ? 'Unpin' : 'Pin', () => pin(sheet), true],
    [Pencil, 'Edit', () => { setEditing(sheet); setText(sheet.body); setSheet(null) }, sheet.sender_id === uid && sheet.kind === 'text'], [Trash2, 'Delete for everyone', () => del(sheet), sheet.sender_id === uid],
    [Flag, 'Report message', () => { setRep({ msg: sheet }); setRepDone(''); setSheet(null) }, sheet.sender_id !== uid]] : []
  return (<div className="fixed inset-0 z-40 mx-auto flex max-w-xl flex-col bg-bg text-ink">
    <header className="flex items-center gap-1 border-b border-line bg-bg px-2 pb-2" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
      <button onClick={() => nav('/textora')} aria-label="Back" className="p-2"><ArrowLeft /></button>
      <button onClick={() => (isGroup ? setGroupInfo(true) : nav('/u/' + other!.username))} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="relative"><Avatar a={headAv} s={40} />{!isGroup && myShow && other!.show_active && online.has(other!.id) && <i className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-bg bg-green-500" />}</span>
        <div className="min-w-0"><b className="flex items-center gap-1 truncate">{headName}{isGroup && <Users size={13} className="shrink-0 text-mute" />}</b><span className={`block truncate text-xs ${typing || (other && typingMap[other.id]) ? 'text-accent' : 'text-mute'}`}>{status}</span></div></button>
      <button onClick={minimize} aria-label="Minimize to bubble" className="p-2 text-mute"><Minimize2 size={20} /></button>
      <button onClick={() => setSearchOn(!searchOn)} aria-label="Search in chat" className="p-2 text-mute"><Search size={20} /></button>
      <button onClick={() => setMenu(true)} aria-label="Menu" className="p-2 text-mute"><MoreVertical size={20} /></button></header>
    {searchOn && <div className="border-b border-line bg-surface p-2"><input autoFocus className="w-full rounded-full border border-line bg-bg px-4 py-2 outline-none" placeholder="Search in this chat" value={sq} onChange={e => setSq(e.target.value)} />
      <div className="max-h-48 overflow-y-auto">{sres.map(m => <button key={m.id} onClick={() => jump(m.id)} className="block w-full border-b border-line px-2 py-2 text-left text-sm"><span className="text-xs text-mute">{dayLabel(m.created_at)} · {nameOf(m.sender_id)}</span><p className="truncate">{m.body}</p></button>)}
        {sq.trim().length >= 2 && !sres.length && <p className="p-3 text-center text-sm text-mute">No messages found.</p>}</div></div>}
    {pinned && <button onClick={() => jump(pinned.id)} className="flex items-center gap-2 border-b border-line bg-surface px-3 py-1.5 text-left text-sm"><Pin size={14} className="shrink-0 text-accent" /><span className="truncate"><b>Pinned</b> · {label(pinned)}</span></button>}
    <div className="flex-1 overflow-y-auto px-3 py-2">
      {!msgs.length && <p className="py-16 text-center text-mute">No messages yet. Say hello 👋</p>}
      {msgs.map((m, i) => {
        const prev = msgs[i - 1], next = msgs[i + 1]; const d = dayLabel(m.created_at); const showDay = !prev || dayLabel(prev.created_at) !== d
        const dayEl = showDay ? <p className="my-3 text-center text-xs text-mute">{d}</p> : null
        if (m.kind === 'system') return <div key={m.id}>{dayEl}<p className="my-2 text-center text-xs text-mute">{nameOf(m.sender_id)} {m.body}</p></div>
        const mine = m.sender_id === uid; const near = (a?: Msg) => !!a && a.kind !== 'system' && a.sender_id === m.sender_id && dayLabel(a.created_at) === d && Math.abs(new Date(a.created_at).getTime() - new Date(m.created_at).getTime()) < 300000
        const sameP = near(prev), sameN = near(next); const qt = m.reply_to ? quote(m) : null; const src = urls[m.attachment_path ?? '']; const sender = prof(m.sender_id)
        const counts: Record<string, number> = {}; m.reactions.forEach(r => { counts[r.emoji] = (counts[r.emoji] ?? 0) + 1 })
        const rad = mine ? `rounded-[20px] ${sameP ? 'rounded-tr-[6px]' : ''} ${sameN ? 'rounded-br-[6px]' : ''}` : `rounded-[20px] ${sameP ? 'rounded-tl-[6px]' : ''} ${sameN ? 'rounded-bl-[6px]' : ''}`
        const rd = m.id === lastMine ? readers(m) : []
        return (<div key={m.id}>{dayEl}
          {isGroup && !mine && !sameP && <p className="ml-9 mt-1 text-xs text-mute">{nameOf(m.sender_id)}</p>}
          <div id={'m-' + m.id} className={`${sameP ? 'mt-0.5' : 'mt-2'} flex items-end gap-1 rounded-2xl ring-accent ${mine ? 'flex-row-reverse' : ''}`}>
            {!mine && <div className="w-7 shrink-0">{!sameN && <Avatar a={sender ?? { avatar_url: null, full_name: '?', username: '?' }} s={28} />}</div>}
            <div className={`max-w-[76%] px-3 py-2 ${rad} ${mine ? '' : 'bg-surface'}`} style={mine ? GRAD : undefined}>
              {m.forwarded && !m.deleted_at && <p className="mb-0.5 text-[10px] italic opacity-70">↪ Forwarded</p>}
              {qt && <div className="mb-1 rounded-lg border-l-2 border-current bg-black/10 px-2 py-1 text-xs opacity-80"><b>{qt.who}</b><p className="line-clamp-2 break-words">{qt.text}</p></div>}
              {m.deleted_at ? <p className="italic opacity-70">This message was deleted</p>
                : m.kind === 'image' ? (src ? <button onClick={() => setPeek(src)}><img src={src} alt="" className="max-h-64 rounded-xl" /></button> : <div className="h-32 w-40 animate-pulse rounded-xl bg-black/10" />)
                : m.kind === 'video' ? (src ? <video src={src} controls playsInline preload="metadata" className="max-h-64 rounded-xl" /> : <div className="h-32 w-40 animate-pulse rounded-xl bg-black/10" />)
                : m.kind === 'voice' ? (src ? <div className="text-ink"><VoicePlayer src={src} peaks={m.audio_peaks} ms={m.audio_ms} /></div> : <div className="h-10 w-48 animate-pulse rounded-full bg-black/10" />)
                : m.kind === 'file' ? <a href={src} target="_blank" rel="noreferrer" download={m.attachment_name ?? undefined} className="flex items-center gap-2"><FileText size={28} /><span className="min-w-0"><b className="block truncate text-sm">{m.attachment_name}</b><small>{size(m.attachment_size)}</small></span></a>
                : <p className="whitespace-pre-wrap break-words">{m.body}</p>}
              {(m.pinned_at || m.edited_at) && !m.deleted_at && <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] opacity-70">{m.pinned_at && <Pin size={10} />}{m.edited_at && <span>edited</span>}</div>}
              {Object.keys(counts).length > 0 && <div className="mt-1 flex flex-wrap gap-1">{Object.entries(counts).map(([e, n]) => <span key={e} className="rounded-full bg-black/15 px-1.5 text-xs">{e} {n}</span>)}</div>}</div>
            {!m.deleted_at && <button onClick={() => setSheet(m)} aria-label="Message options" className="p-1 text-mute opacity-50"><MoreHorizontal size={16} /></button>}</div>
          {!sameN && <p className={`mt-0.5 flex items-center gap-1 text-[10px] text-mute ${mine ? 'justify-end' : 'ml-9'}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {mine && !m.deleted_at && m.id !== lastMine && (delivered(m) ? <CheckCheck size={12} /> : <Check size={12} />)}</p>}
          {m.id === lastMine && !m.deleted_at && <div className="mt-0.5 flex justify-end gap-0.5">{rd.length ? <>{rd.slice(0, 5).map(r => <Avatar key={r.user_id} a={r.profile} s={14} />)}{rd.length > 5 && <span className="text-[10px] text-mute">+{rd.length - 5}</span>}</> : <span className="text-[10px] text-mute">{delivered(m) ? 'Delivered' : 'Sent'}</span>}</div>}</div>) })}
      {typing && <p className="mt-2 px-1 text-sm text-accent">{isGroup ? `${typer} is typing…` : 'Typing…'}</p>}<div ref={endRef} /></div>
    <div className="border-t border-line bg-bg p-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      {err && <p role="alert" className="px-2 pb-1 text-sm text-red-400">{err}</p>}
      {!isGroup && iBlocked ? <div className="flex items-center justify-between px-2 py-1 text-sm"><span className="text-mute">You blocked this person.</span><button onClick={toggleBlock} className="rounded-full border border-line px-3 py-1">Unblock</button></div>
        : !isGroup && blockedMe ? <p className="px-2 py-2 text-center text-sm text-mute">You can't reply to this conversation.</p>
        : recSecs !== null ? <div className="flex items-center gap-3 px-2 py-1"><i className="h-3 w-3 animate-pulse rounded-full bg-red-500" /><b className="w-12">{mmss(recSecs)}</b><span className="flex-1 text-sm text-mute">Recording…</span>
          <button onClick={() => stopRec(true)} className="rounded-full border border-line px-3 py-1.5 text-sm">Cancel</button><button onClick={() => stopRec(false)} aria-label="Send voice message" className="grid h-11 w-11 place-items-center rounded-full" style={GRAD}><Send size={20} /></button></div>
        : <>{(replyTo || editing) && <div className="mb-2 flex items-center justify-between rounded-xl bg-surface px-3 py-1.5 text-sm"><span className="min-w-0 truncate text-mute">{editing ? 'Editing message' : 'Replying to ' + quote(replyTo!).text}</span><button aria-label="Cancel" onClick={() => { setReplyTo(null); setEditing(null); setText('') }}><X size={16} /></button></div>}
          <div className="flex items-center gap-2">
            <label className="cursor-pointer p-2 text-accent"><Paperclip size={22} /><input type="file" hidden disabled={busy || !!editing} onChange={attach} /></label>
            <input className="min-w-0 flex-1 rounded-full bg-surface px-4 py-2.5 outline-none" maxLength={4000} placeholder={busy ? 'Sending…' : 'Message'} value={text} onChange={e => onType(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
            {text.trim() ? <button onClick={send} aria-label="Send" className="grid h-11 w-11 place-items-center rounded-full" style={GRAD}><Send size={20} /></button>
              : <button onClick={startRec} disabled={busy || !!editing} aria-label="Record voice message" className="grid h-11 w-11 place-items-center rounded-full disabled:opacity-40" style={GRAD}><Mic size={20} /></button>}</div></>}</div>
    {sheet && <Sheet onClose={() => setSheet(null)}><div className="mb-3 flex justify-around">{QUICK.map(e => <button key={e} onClick={() => react(sheet, e)} className="text-3xl active:scale-125">{e}</button>)}</div>
      {actions.map(([I, l, fn, ok]) => ok && <button key={l} onClick={fn} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-bg ${l.startsWith('Delete') || l.startsWith('Report') ? 'text-red-400' : ''}`}><I size={20} />{l}</button>)}</Sheet>}
    {menu && <Sheet onClose={() => setMenu(false)}>
      {isGroup && <button onClick={() => { setMenu(false); setGroupInfo(true) }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-bg"><Users size={20} className="text-accent" />Group info & members</button>}
      <button onClick={toggleMute} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-bg">{muted ? <Bell size={20} className="text-accent" /> : <BellOff size={20} className="text-accent" />}{muted ? 'Unmute notifications' : 'Mute notifications'}</button>
      {!isGroup && <button onClick={toggleBlock} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-red-400 hover:bg-bg"><Ban size={20} />{iBlocked ? 'Unblock' : 'Block'}</button>}
      {!isGroup && <button onClick={() => { setMenu(false); setRep({ msg: null }); setRepDone('') }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-red-400 hover:bg-bg"><Flag size={20} />Report</button>}</Sheet>}
    {rep && <Sheet onClose={() => setRep(null)}><b className="mb-2 block">Report</b>{repDone ? <p role="status" className="text-accent">{repDone}</p> : REASONS.map(r => <button key={r} onClick={() => report(r)} className="block w-full rounded-xl p-3 text-left hover:bg-bg">{r}</button>)}</Sheet>}
    {fwd && <Sheet onClose={() => setFwd(null)}><b className="mb-2 block">Forward to…</b>{!fwdList.length && <p className="py-4 text-center text-mute">No other conversations yet.</p>}
      {fwdList.map(c => <button key={c.id} onClick={() => forwardTo(c.id)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-bg"><Avatar a={convAv(c)} s={40} /><b className="truncate">{c.title}</b></button>)}</Sheet>}
    {groupInfo && isGroup && <GroupInfo cid={cid} conv={conv} members={members.map(m => ({ user_id: m.user_id, role: m.role, profile: m.profile }))} uid={uid} onChanged={loadInfo} onClose={() => setGroupInfo(false)} onLeft={() => nav('/textora')} />}
    {peek && <div className="fixed inset-0 z-[60] grid place-items-center bg-black" onClick={() => setPeek(null)}><img src={peek} alt="" className="max-h-full max-w-full object-contain" /><button className="absolute right-4 top-4 text-white" aria-label="Close"><X /></button></div>}
  </div>)
}
