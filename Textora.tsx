import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageCircleMore, MessageSquarePlus, MoreHorizontal, BellOff, Search as SearchIcon, X, Archive, ArchiveRestore } from 'lucide-react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { useOnline } from './Presence'
import { fetchFriendIds } from './posts'
import { Conv, fetchConvs, startDirect, agoShort, previewOf } from './textora'
import { Av } from './ui'
type P = { id: string; username: string; full_name: string; avatar_url: string | null; show_active?: boolean }
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
  return (<div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}><div className="mx-auto flex h-[80vh] w-full max-w-xl flex-col gap-3 rounded-t-2xl bg-surface p-4 text-ink" onClick={e => e.stopPropagation()}>
    <div className="flex items-center justify-between"><b>New message</b><button onClick={onClose} aria-label="Close"><X /></button></div>
    <label className="flex items-center gap-2 rounded-xl border border-line px-3 py-2"><SearchIcon size={16} className="text-mute" /><input autoFocus className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search people" value={q} onChange={e => setQ(e.target.value)} /></label>
    {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
    <div className="flex-1 overflow-y-auto">{q.trim().length < 2 && <p className="pb-2 text-xs text-mute">Your friends</p>}
      {!list.length && <p className="py-6 text-center text-mute">{q.trim().length >= 2 ? 'No one found.' : 'Search for someone to start a chat.'}</p>}
      {list.map(p => <button key={p.id} onClick={() => open(p.id)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-bg"><Av a={p} /><div className="min-w-0"><b className="block truncate">{p.full_name || p.username}</b><span className="text-xs text-mute">@{p.username}</span></div></button>)}</div></div></div>)
}
export default function Textora() {
  const { session, profile } = useAuth(); const uid = session!.user.id; const online = useOnline(); const nav = useNavigate(); const myShow = profile?.show_active !== false
  const [convs, setConvs] = useState<Conv[] | null>(null); const [q, setQ] = useState(''); const [arch, setArch] = useState(false); const [friends, setFriends] = useState<P[]>([]); const [newOpen, setNewOpen] = useState(false); const [menu, setMenu] = useState<Conv | null>(null)
  const load = () => { fetchConvs().then(setConvs).catch(() => setConvs([])); supabase.from('conversation_members').update({ last_delivered_at: new Date().toISOString() }).eq('user_id', uid).then(() => {}) }
  useEffect(() => {
    load(); fetchFriendIds(uid).then(async ids => { if (ids.size) { const { data } = await supabase.from('profiles').select('id,username,full_name,avatar_url,show_active').in('id', Array.from(ids)); setFriends((data ?? []) as P[]) } })
    const ch = supabase.channel('inbox-' + uid).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => load()).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_members' }, () => load()).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])
  const pool = new Map<string, P>(); (convs ?? []).forEach(c => pool.set(c.other_id, { id: c.other_id, username: c.username, full_name: c.full_name, avatar_url: c.avatar_url, show_active: c.show_active })); friends.forEach(f => pool.set(f.id, f))
  const active = myShow ? Array.from(pool.values()).filter(p => p.show_active !== false && online.has(p.id)) : []
  const shown = (convs ?? []).filter(c => c.archived === arch && (!q.trim() || (c.full_name + ' ' + c.username).toLowerCase().includes(q.trim().toLowerCase())))
  const patch = async (c: Conv, p: { muted?: boolean; archived?: boolean }) => { await supabase.from('conversation_members').update(p).eq('conversation_id', c.id).eq('user_id', uid); setMenu(null); load(); window.dispatchEvent(new Event('textora-unread')) }
  const openWith = async (id: string) => { try { nav('/textora/c/' + await startDirect(id)) } catch { /* shown in chat button elsewhere */ } }
  return (<div className="flex flex-col gap-4">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-black tracking-widest"><span style={{ color: 'var(--accent)' }}>TEXT</span><span style={{ color: 'var(--accent2)' }}>ORA</span></h1>
      <button aria-label="New message" onClick={() => setNewOpen(true)} className="grid h-10 w-10 place-items-center rounded-full text-on" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}><MessageSquarePlus size={20} /></button></div>
    <label className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2.5"><SearchIcon size={18} className="text-mute" /><input className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search conversations" value={q} onChange={e => setQ(e.target.value)} /></label>
    {active.length > 0 && <section><h2 className="mb-2 text-sm font-semibold text-mute">Active now</h2><div className="no-scrollbar flex gap-4 overflow-x-auto">
      {active.map(p => <button key={p.id} onClick={() => openWith(p.id)} className="flex w-16 shrink-0 flex-col items-center gap-1 text-xs"><span className="relative"><span className="block h-14 w-14 overflow-hidden rounded-full border border-line bg-surface">{p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center font-bold">{(p.full_name || p.username)[0]?.toUpperCase()}</span>}</span><i className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-bg bg-green-500" /></span><span className="w-full truncate text-center">{p.full_name || p.username}</span></button>)}</div></section>}
    <div className="flex gap-2">{[[false, 'Chats'], [true, 'Archived']].map(([k, l]) => <button key={String(k)} onClick={() => setArch(k as boolean)} className="rounded-full border px-4 py-1.5 text-sm font-medium" style={arch === k ? { background: 'var(--accent)', color: 'var(--on)', borderColor: 'var(--accent)' } : { borderColor: 'var(--line)', color: 'var(--mute)' }}>{l as string}</button>)}</div>
    {!convs && [0, 1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />)}
    {convs && !shown.length && <p className="py-12 text-center text-mute">{arch ? 'No archived chats.' : q ? 'No match.' : 'No conversations yet. Tap the button above to start one.'}</p>}
    {shown.map(c => <div key={c.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
      <Link to={`/textora/c/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="relative shrink-0"><Av a={c} />{myShow && c.show_active && online.has(c.other_id) && <i className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-green-500" />}</span>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-1"><b className="truncate">{c.full_name || c.username}</b>{c.muted && <BellOff size={12} className="shrink-0 text-mute" />}</div>
          <p className={`truncate text-sm ${c.unread > 0 ? 'font-semibold text-ink' : 'text-mute'}`}>{previewOf(c, uid)}</p></div>
        <div className="flex shrink-0 flex-col items-end gap-1"><span className="text-xs text-mute">{agoShort(c.last_at)}</span>{c.unread > 0 && <span className="min-w-[20px] rounded-full bg-accent px-1.5 text-center text-xs font-bold leading-5 text-on">{c.unread > 99 ? '99+' : c.unread}</span>}</div></Link>
      <button aria-label="Options" onClick={() => setMenu(c)} className="p-1 text-mute"><MoreHorizontal size={18} /></button></div>)}
    {menu && <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => setMenu(null)}><div className="mx-auto w-full max-w-xl rounded-t-2xl bg-surface p-4 text-ink" onClick={e => e.stopPropagation()}>
      <b className="mb-2 block">{menu.full_name || menu.username}</b>
      <button onClick={() => patch(menu, { muted: !menu.muted })} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-bg"><BellOff size={20} className="text-accent" />{menu.muted ? 'Unmute' : 'Mute notifications'}</button>
      <button onClick={() => patch(menu, { archived: !menu.archived })} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-bg">{menu.archived ? <ArchiveRestore size={20} className="text-accent" /> : <Archive size={20} className="text-accent" />}{menu.archived ? 'Move to chats' : 'Archive chat'}</button></div></div>}
    {newOpen && <NewChat friends={friends} onClose={() => setNewOpen(false)} />}
  </div>)
}
