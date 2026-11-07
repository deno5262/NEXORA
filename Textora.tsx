import { useRefresh } from './useRefresh'
import { useBackClose } from './useBackClose'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, MessageCircle, MessageCircleMore, MessageSquarePlus, Users, UserCircle, MoreHorizontal, BellOff, Search as SearchIcon, X, Archive, ArchiveRestore, Check } from 'lucide-react'
import { supabase } from './supabase'
import { compress } from './image'
import { useAuth } from './AuthContext'
import { useOnline } from './Presence'
import { useTypingView } from './useTyping'
import { fetchFriendIds } from './posts'
import { Conv, convAv, fetchConvs, startDirect, agoShort, previewOf, statusOf, ge } from './textora'
import { Avatar } from './ui'
import { TextoraPrefs } from './TextoraSettings'
type P = { id: string; username: string; full_name: string; avatar_url: string | null; show_active?: boolean }
type Note = { user_id: string; body: string; audience: string; created_at: string }
function Sheet({ onClose, children, tall }: { onClose: () => void; children: React.ReactNode; tall?: boolean }) {
  useBackClose(true, onClose)
  return <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}><div className={`mx-auto flex w-full max-w-xl flex-col gap-3 overflow-y-auto rounded-t-2xl bg-surface p-4 text-ink ${tall ? 'h-[80vh]' : 'max-h-[80vh]'}`} onClick={e => e.stopPropagation()}>{children}</div></div>
}
export function MessageButton({ target }: { target: string }) {
  const nav = useNavigate(); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const go = async () => { setBusy(true); setErr(''); try { nav('/textora/c/' + await startDirect(target)) } catch (e) { setErr((e as Error).message); setBusy(false) } }
  return <><button disabled={busy} onClick={go} className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-3 py-2.5 font-semibold disabled:opacity-50"><MessageCircleMore size={18} />Message</button>{err && <p role="alert" className="text-sm text-red-400">{err}</p>}</>
}
function NewChat({ friends, onClose }: { friends: P[]; onClose: () => void }) {
  const { session } = useAuth(); const uid = session!.user.id; const nav = useNavigate(); const [q, setQ] = useState(''); const [res, setRes] = useState<P[]>([]); const [err, setErr] = useState('')
  useEffect(() => {
    const term = q.trim().replace(/[%_,()\\]/g, ' ').trim(); if (term.length < 2) { setRes([]); return }
    const t = setTimeout(() => { supabase.from('profiles').select('id,username,full_name,avatar_url').or(`username.ilike.%${term}%,full_name.ilike.%${term}%`).neq('id', uid).limit(10).then((r: any) => setRes((r.data ?? []) as P[])) }, 300)
    return () => clearTimeout(t)
  }, [q])
  const open = async (id: string) => { setErr(''); try { nav('/textora/c/' + await startDirect(id)) } catch (e) { setErr((e as Error).message) } }
  const list = q.trim().length >= 2 ? res : friends
  return (<Sheet onClose={onClose} tall><div className="flex items-center justify-between"><b>New message</b><button onClick={onClose} aria-label="Close"><X /></button></div>
    <label className="flex items-center gap-2 rounded-full border border-line px-3 py-2"><SearchIcon size={16} className="text-mute" /><input autoFocus className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search people" value={q} onChange={e => setQ(e.target.value)} /></label>
    {err && <p role="alert" className="text-sm text-red-400">{err}</p>}{q.trim().length < 2 && <p className="text-xs text-mute">Your friends</p>}
    {!list.length && <p className="py-6 text-center text-mute">{q.trim().length >= 2 ? 'No one found.' : 'Search for someone to start a chat.'}</p>}
    {list.map(p => <button key={p.id} onClick={() => open(p.id)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-bg"><Avatar a={p} s={44} /><div className="min-w-0"><b className="block truncate">{p.full_name || p.username}</b><span className="text-xs text-mute">@{p.username}</span></div></button>)}</Sheet>)
}
function NewGroup({ friends, onClose }: { friends: P[]; onClose: () => void }) {
  const { session } = useAuth(); const uid = session!.user.id; const nav = useNavigate(); const [title, setTitle] = useState(''); const [pick, setPick] = useState<Set<string>>(new Set()); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const create = async () => {
    setErr(''); setBusy(true)
    try {
      let avatar: string | null = null
      if (file) { const path = `${uid}/group-${crypto.randomUUID()}.jpg`; const { error } = await supabase.storage.from('media').upload(path, await compress(file, 512), { contentType: 'image/jpeg' }); if (error) throw error; avatar = supabase.storage.from('media').getPublicUrl(path).data.publicUrl }
      const { data, error } = await supabase.rpc('create_group', { p_title: title, p_members: Array.from(pick), p_avatar: avatar }); if (error) throw error
      nav('/textora/c/' + data)
    } catch (e) { setErr((e as Error).message); setBusy(false) }
  }
  return (<Sheet onClose={onClose} tall><div className="flex items-center justify-between"><b>New group</b><button onClick={onClose} aria-label="Close"><X /></button></div>
    <div className="flex items-center gap-3"><label className="grid h-14 w-14 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-line text-mute">{file ? <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" /> : <Users />}<input type="file" accept="image/*" hidden onChange={e => { setFile(e.target.files?.[0] ?? null); e.target.value = '' }} /></label>
      <input className="input" maxLength={60} placeholder="Group name" value={title} onChange={e => setTitle(e.target.value)} /></div>
    <p className="text-xs text-mute">Add friends ({pick.size} selected)</p>
    {!friends.length && <p className="py-4 text-center text-mute">You need friends to start a group. Add some first.</p>}
    <div className="flex-1 overflow-y-auto">{friends.map(p => <button key={p.id} onClick={() => { const s = new Set(pick); if (s.has(p.id)) s.delete(p.id); else s.add(p.id); setPick(s) }} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-bg"><Avatar a={p} s={44} /><b className="min-w-0 flex-1 truncate">{p.full_name || p.username}</b>{pick.has(p.id) && <Check className="text-accent" />}</button>)}</div>
    {err && <p role="alert" className="text-sm text-red-400">{err}</p>}<button className="btn" disabled={busy || !title.trim() || !pick.size} onClick={create}>{busy ? 'Creating…' : 'Create group'}</button></Sheet>)
}
const EMO = ['😊', '😂', '❤️', '🔥', '😴', '🎵', '🤝']
function NoteSheet({ mine, uid, onClose, onSaved }: { mine: Note | undefined; uid: string; onClose: () => void; onSaved: () => void }) {
  const [body, setBody] = useState(mine?.body ?? ''); const [aud, setAud] = useState(mine?.audience ?? 'friends'); const [err, setErr] = useState('')
  const save = async () => { const { error } = await supabase.from('notes').upsert({ user_id: uid, body: body.trim(), audience: aud, created_at: new Date().toISOString() }, { onConflict: 'user_id' }); if (error) return setErr(error.message); onSaved(); onClose() }
  const del = async () => { await supabase.from('notes').delete().eq('user_id', uid); onSaved(); onClose() }
  return (<Sheet onClose={onClose}><div className="flex items-center justify-between"><b>Your note</b><button onClick={onClose} aria-label="Close"><X /></button></div>
    <textarea autoFocus className="input" rows={2} maxLength={60} placeholder="Share a thought…" value={body} onChange={e => setBody(e.target.value)} />
    <div className="flex gap-2">{EMO.map(e => <button key={e} type="button" onClick={() => setBody((body + e).slice(0, 60))} className="text-2xl">{e}</button>)}<span className="ml-auto text-xs text-mute">{body.length}/60</span></div>
    <select className="input" value={aud} onChange={e => setAud(e.target.value)}><option value="friends">Friends</option><option value="everyone">Everyone</option><option value="only_me">Only me</option></select>
    <p className="text-xs text-mute">Notes disappear after 24 hours and show only in TEXTORA.</p>{err && <p role="alert" className="text-sm text-red-400">{err}</p>}
    <div className="flex gap-2"><button className="btn flex-1" disabled={!body.trim()} onClick={save}>{mine ? 'Update note' : 'Share note'}</button>{mine && <button className="rounded-xl border border-line px-4 text-red-400" onClick={del}>Delete</button>}</div></Sheet>)
}
function NoteReply({ note, who, uid, onClose }: { note: Note; who: P; uid: string; onClose: () => void }) {
  const [text, setText] = useState(''); const [msg, setMsg] = useState('')
  const send = async () => {
    const t = text.trim(); if (!t) return
    try { const cid = await startDirect(who.id); const { error } = await supabase.from('messages').insert({ conversation_id: cid, sender_id: uid, kind: 'text', body: `💬 Replied to your note “${note.body}”: ${t}` }); if (error) throw error; setMsg('Sent'); setText('') } catch (e) { setMsg((e as Error).message) }
  }
  return (<Sheet onClose={onClose}><div className="flex items-center gap-3"><Avatar a={who} s={44} /><div className="min-w-0 flex-1"><b className="block truncate">{who.full_name || who.username}</b><span className="text-xs text-mute">{agoShort(note.created_at)} ago</span></div><button onClick={onClose} aria-label="Close"><X /></button></div>
    <p className="rounded-2xl bg-bg p-3 text-lg">{note.body}</p>
    <div className="flex gap-2"><input autoFocus className="input" placeholder="Reply to this note…" maxLength={500} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} /><button className="btn px-4" onClick={send}>Send</button></div>
    {msg && <p role="status" className="text-sm text-mute">{msg}</p>}</Sheet>)
}
export default function Textora({ tab = 'chats' }: { tab?: string }) {
  const { session, profile } = useAuth(); const uid = session!.user.id; const online = useOnline(); const nav = useNavigate(); const myShow = profile?.show_active !== false; const typingMap = useTypingView(tab === 'chats')
  const [offline, setOffline] = useState(!navigator.onLine); const [convs, setConvs] = useState<Conv[] | null>(null); const [q, setQ] = useState(''); const [arch, setArch] = useState(false); const [friends, setFriends] = useState<P[]>([]); const [notes, setNotes] = useState<Note[]>([])
  const [compose, setCompose] = useState(false); const [newOpen, setNewOpen] = useState(false); const [groupOpen, setGroupOpen] = useState(false); const [menu, setMenu] = useState<Conv | null>(null); const [noteSheet, setNoteSheet] = useState(false); const [noteReply, setNoteReply] = useState<{ note: Note; who: P } | null>(null)
  useEffect(() => { const on = () => setOffline(false), off = () => setOffline(true); window.addEventListener('online', on); window.addEventListener('offline', off); return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) } }, [])
  const load = () => { fetchConvs().then(setConvs).catch(() => setConvs([])); supabase.from('conversation_members').update({ last_delivered_at: new Date().toISOString() }).eq('user_id', uid).then(() => {}) }
  const loadNotes = () => supabase.from('notes').select('user_id,body,audience,created_at').gt('created_at', new Date(Date.now() - 864e5).toISOString()).then(({ data }) => setNotes((data ?? []) as Note[]))
  useRefresh(() => { load(); loadNotes() })
  useEffect(() => {
    load(); loadNotes(); const nid = setInterval(loadNotes, 60000)
    fetchFriendIds(uid).then(async ids => { if (ids.size) { const { data } = await supabase.from('profiles').select('id,username,full_name,avatar_url,show_active,last_active_at').in('id', Array.from(ids)); setFriends((data ?? []) as P[]) } })
    const ch = supabase.channel('inbox-' + uid).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => load()).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_members' }, () => load()).subscribe()
    return () => { clearInterval(nid); supabase.removeChannel(ch) }
  }, [])
  const pool = new Map<string, P>(); (convs ?? []).forEach(c => { if (c.kind === 'direct' && c.other_id) pool.set(c.other_id, { id: c.other_id, username: c.username ?? '', full_name: c.full_name ?? '', avatar_url: c.avatar_url, show_active: c.show_active ?? true }) }); friends.forEach(f => pool.set(f.id, f))
  const noteOf = (id: string) => notes.find(n => n.user_id === id); const myNote = noteOf(uid)
  const tiles = Array.from(pool.values()).filter(p => noteOf(p.id) || (myShow && p.show_active !== false && online.has(p.id)))
  const shown = (convs ?? []).filter(c => c.archived === arch && (!q.trim() || ((c.title ?? '') + ' ' + (c.username ?? '')).toLowerCase().includes(q.trim().toLowerCase())))
  const unreadTotal = (convs ?? []).reduce((n, c) => n + (c.muted ? 0 : c.unread), 0)
  const patch = async (c: Conv, p: { muted?: boolean; archived?: boolean }) => { await supabase.from('conversation_members').update(p).eq('conversation_id', c.id).eq('user_id', uid); setMenu(null); load(); window.dispatchEvent(new Event('textora-unread')) }
  const openWith = async (id: string) => { try { nav('/textora/c/' + await startDirect(id)) } catch { /* privacy errors show on the profile button */ } }
  const tabLink = (to: string, k: string, I: typeof MessageCircle, l: string, badge = 0) => <Link key={k} to={to} className="relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs" style={{ color: tab === k ? 'var(--accent)' : 'var(--mute)' }}><I size={24} />{l}{badge > 0 && <span className="absolute left-1/2 top-0.5 ml-2 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white">{badge > 99 ? '99+' : badge}</span>}</Link>
  return (<div className="flex min-h-screen flex-col bg-bg text-ink">
    <header className="sticky top-0 z-10 bg-bg px-4 pb-2" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
      <div className="flex items-center gap-3"><Link to="/" aria-label="Back to NEXORA" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-on" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}><ArrowLeftRight size={20} /></Link>
        <h1 className="flex-1 text-3xl font-black tracking-tight"><span style={{ color: 'var(--accent)' }}>TEXT</span><span style={{ color: 'var(--accent2)' }}>ORA</span></h1>
        {tab === 'chats' && <button aria-label="New" onClick={() => setCompose(true)} className="grid h-10 w-10 place-items-center rounded-full bg-surface"><MessageSquarePlus size={22} /></button>}</div>
      {offline && <p className="mt-1 text-center text-xs text-mute">Waiting for network…</p>}</header>
    <main className="flex-1 px-4 pb-28">
      {tab === 'chats' && <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 rounded-full bg-surface px-4 py-3"><SearchIcon size={18} className="text-mute" /><input className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} /></label>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 pt-6">
          <button onClick={() => setNoteSheet(true)} className="flex w-[72px] shrink-0 flex-col items-center gap-1 text-xs"><span className="relative"><span className="absolute -top-5 left-1/2 w-[76px] -translate-x-1/2 rounded-2xl border border-line bg-surface px-2 py-1 text-center text-[10px] leading-tight text-mute shadow"><span className="line-clamp-2 break-words">{myNote?.body ?? 'Share a note'}</span></span>{profile && <Avatar a={profile} s={60} />}</span><span className="mt-1">Your note</span></button>
          {tiles.map(p => { const n = noteOf(p.id); return <button key={p.id} onClick={() => (n ? setNoteReply({ note: n, who: p }) : openWith(p.id))} className="flex w-[72px] shrink-0 flex-col items-center gap-1 text-xs">
            <span className="relative">{n && <span className="absolute -top-5 left-1/2 w-[76px] -translate-x-1/2 rounded-2xl border border-line bg-surface px-2 py-1 text-center text-[10px] leading-tight shadow"><span className="line-clamp-2 break-words">{n.body}</span></span>}<Avatar a={p} s={60} />{myShow && p.show_active !== false && online.has(p.id) && <i className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-bg bg-green-500" />}</span>
            <span className="mt-1 w-full truncate text-center">{(p.full_name || p.username).split(' ')[0]}</span></button> })}</div>
        <div className="flex gap-2">{([[false, 'Chats'], [true, 'Archived']] as [boolean, string][]).map(([k, l]) => <button key={l} onClick={() => setArch(k)} className="rounded-full px-4 py-1.5 text-sm font-medium" style={arch === k ? { background: 'var(--accent)', color: 'var(--on)' } : { background: 'var(--surface)', color: 'var(--mute)' }}>{l}</button>)}</div>
        {!convs && [0, 1, 2, 3, 4].map(i => <div key={i} className="flex items-center gap-3 py-2"><div className="h-14 w-14 animate-pulse rounded-full bg-surface" /><div className="flex-1 space-y-2"><div className="h-3 w-1/3 animate-pulse rounded bg-surface" /><div className="h-3 w-2/3 animate-pulse rounded bg-surface" /></div></div>)}
        {convs && !shown.length && <p className="py-12 text-center text-mute">{arch ? 'No archived chats.' : q ? 'No match.' : 'No conversations yet. Tap the button at the top to start one.'}</p>}
        {shown.map(c => { const seen = c.kind === 'direct' && c.last_sender === uid && c.last_kind !== 'system' && ge(c.other_read_at, c.last_at); const tl = c.kind === 'direct' && c.other_id ? typingMap[c.other_id] : undefined
          return (<div key={c.id} className="flex items-center gap-2">
            <Link to={`/textora/c/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-2">
              <span className="relative shrink-0"><Avatar a={convAv(c)} s={56} />{c.kind === 'group' ? <i className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-bg bg-surface text-mute"><Users size={10} /></i> : myShow && c.show_active && c.other_id && online.has(c.other_id) && <i className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-bg bg-green-500" />}</span>
              <div className="min-w-0 flex-1"><div className="flex items-center gap-1"><b className={`truncate text-base ${c.unread > 0 ? '' : 'font-medium'}`}>{c.title}</b>{c.muted && <BellOff size={12} className="shrink-0 text-mute" />}</div>
                <p className={`truncate text-sm ${tl ? 'italic text-accent' : c.unread > 0 ? 'font-bold text-ink' : 'text-mute'}`}>{tl ?? previewOf(c, uid)}</p></div>
              <div className="flex shrink-0 flex-col items-end gap-1.5"><span className="text-xs text-mute">{agoShort(c.last_at)}</span>
                {c.unread > 0 ? <i className="h-3 w-3 rounded-full bg-accent" /> : seen ? <Avatar a={convAv(c)} s={16} /> : <i className="h-3 w-3" />}</div></Link>
            <button aria-label="Options" onClick={() => setMenu(c)} className="p-1 text-mute"><MoreHorizontal size={18} /></button></div>) })}</div>}
      {tab === 'people' && <div className="flex flex-col gap-2"><h2 className="text-xl font-bold">People</h2>
        {!friends.length && <p className="py-10 text-center text-mute">Your friends appear here. Add friends in NEXORA to chat with them.</p>}
        {[...friends].sort((a, b) => Number(online.has(b.id)) - Number(online.has(a.id))).map(p => <button key={p.id} onClick={() => openWith(p.id)} className="flex items-center gap-3 rounded-xl py-2 text-left"><span className="relative"><Avatar a={p} s={52} />{myShow && p.show_active !== false && online.has(p.id) && <i className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-bg bg-green-500" />}</span>
          <div className="min-w-0 flex-1"><b className="block truncate">{p.full_name || p.username}</b><span className="text-sm text-mute">{myShow ? statusOf(online.has(p.id), p.show_active !== false, (p as any).last_active_at ?? null) : ''}</span></div><MessageCircle className="text-accent" size={20} /></button>)}</div>}
      {tab === 'me' && <div className="flex flex-col gap-5"><div className="flex items-center gap-3">{profile && <Avatar a={profile} s={64} />}<div className="min-w-0"><b className="block truncate text-xl">{profile?.full_name || profile?.username}</b><span className="text-sm text-mute">@{profile?.username}</span></div></div><TextoraPrefs /></div>}
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-xl border-t border-line bg-bg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabLink('/textora', 'chats', MessageCircle, 'Chats', unreadTotal)}{tabLink('/textora/people', 'people', Users, 'People')}{tabLink('/textora/me', 'me', UserCircle, 'Me')}</nav>
    {compose && <Sheet onClose={() => setCompose(false)}><button onClick={() => { setCompose(false); setNewOpen(true) }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-bg"><MessageSquarePlus className="text-accent" />New message</button>
      <button onClick={() => { setCompose(false); setGroupOpen(true) }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-bg"><Users className="text-accent" />New group</button></Sheet>}
    {menu && <Sheet onClose={() => setMenu(null)}><b>{menu.title}</b>
      <button onClick={() => patch(menu, { muted: !menu.muted })} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-bg"><BellOff size={20} className="text-accent" />{menu.muted ? 'Unmute' : 'Mute notifications'}</button>
      <button onClick={() => patch(menu, { archived: !menu.archived })} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-bg">{menu.archived ? <ArchiveRestore size={20} className="text-accent" /> : <Archive size={20} className="text-accent" />}{menu.archived ? 'Move to chats' : 'Archive chat'}</button></Sheet>}
    {newOpen && <NewChat friends={friends} onClose={() => setNewOpen(false)} />}{groupOpen && <NewGroup friends={friends} onClose={() => setGroupOpen(false)} />}
    {noteSheet && <NoteSheet mine={myNote} uid={uid} onClose={() => setNoteSheet(false)} onSaved={loadNotes} />}{noteReply && <NoteReply note={noteReply.note} who={noteReply.who} uid={uid} onClose={() => setNoteReply(null)} />}
  </div>)
}
