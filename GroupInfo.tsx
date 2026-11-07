import { useBackClose } from './useBackClose'
import { useState } from 'react'
import { X, Crown, UserMinus, UserPlus, LogOut, Flag } from 'lucide-react'
import { supabase } from './supabase'
import { compress } from './image'
import { fetchFriendIds } from './posts'
import { Avatar } from './ui'
type Prof = { id: string; username: string; full_name: string; avatar_url: string | null }
export type GMem = { user_id: string; role: string; profile: Prof }
type Conv = { title: string | null; avatar_url: string | null; only_admins_add: boolean; created_by: string | null }
const REASONS = ['Spam or scam', 'Harassment or hate', 'Nudity or sexual content', 'Violence or threats', 'Something else']
export default function GroupInfo({ cid, conv, members, uid, onChanged, onClose, onLeft }: { cid: string; conv: Conv; members: GMem[]; uid: string; onChanged: () => void; onClose: () => void; onLeft: () => void }) {
  useBackClose(true, onClose)
  const admin = members.find(m => m.user_id === uid)?.role === 'admin'
  const [title, setTitle] = useState(conv.title ?? ''); const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [adding, setAdding] = useState(false); const [cands, setCands] = useState<Prof[]>([]); const [pick, setPick] = useState<Set<string>>(new Set()); const [reporting, setReporting] = useState(false)
  const run = async (fn: () => PromiseLike<any>, ok = '') => { setErr(''); setMsg(''); const r = await fn(); if (r?.error) { setErr(r.error.message); return false } if (ok) setMsg(ok); onChanged(); return true }
  const startAdd = async () => {
    setAdding(true); const ids = await fetchFriendIds(uid); const have = new Set(members.map(m => m.user_id)); const list = Array.from(ids).filter(i => !have.has(i))
    if (!list.length) return setCands([]); const { data } = await supabase.from('profiles').select('id,username,full_name,avatar_url').in('id', list); setCands((data ?? []) as Prof[])
  }
  const addPicked = async () => { if (await run(() => supabase.rpc('add_group_members', { p_cid: cid, p_members: Array.from(pick) }), 'People added')) { setAdding(false); setPick(new Set()) } }
  const avatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return
    try { const path = `${uid}/group-${crypto.randomUUID()}.jpg`; const { error } = await supabase.storage.from('media').upload(path, await compress(f, 512), { contentType: 'image/jpeg' }); if (error) throw error
      const url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl; await run(() => supabase.rpc('update_group', { p_cid: cid, p_title: null, p_avatar: url, p_only_admins: null }), 'Group photo updated') } catch (x) { setErr((x as Error).message) }
  }
  const leave = async () => { if (!confirm('Leave this group?')) return; if (await run(() => supabase.rpc('leave_group', { p_cid: cid }))) onLeft() }
  const report = async (r: string) => { const { error } = await supabase.from('user_reports').insert({ reporter_id: uid, target_id: conv.created_by ?? members[0].user_id, conversation_id: cid, reason: ('Group: ' + r).slice(0, 200) }); setMsg(error ? error.message : 'Thanks. We will review this group.'); setReporting(false) }
  return (<div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}><div className="mx-auto flex max-h-[85vh] w-full max-w-xl flex-col gap-3 overflow-y-auto rounded-t-2xl bg-surface p-4 text-ink" onClick={e => e.stopPropagation()}>
    <div className="flex items-center justify-between"><b>Group info</b><button onClick={onClose} aria-label="Close"><X /></button></div>
    <div className="flex items-center gap-3"><label className={admin ? 'cursor-pointer' : ''}><Avatar a={{ avatar_url: conv.avatar_url, full_name: conv.title ?? 'G', username: 'group' }} s={64} />{admin && <input type="file" accept="image/*" hidden onChange={avatar} />}</label>
      <div className="min-w-0 flex-1">{admin ? <div className="flex gap-2"><input className="input" maxLength={60} value={title} onChange={e => setTitle(e.target.value)} /><button className="btn px-3" disabled={!title.trim() || title === conv.title} onClick={() => run(() => supabase.rpc('update_group', { p_cid: cid, p_title: title, p_avatar: null, p_only_admins: null }), 'Name updated')}>Save</button></div> : <b className="text-lg">{conv.title}</b>}
        <p className="text-sm text-mute">{members.length} members{admin ? ' · tap the photo to change it' : ''}</p></div></div>
    {admin && <label className="flex items-center justify-between gap-3 rounded-xl border border-line p-3"><span>Only admins can add people</span><input type="checkbox" checked={conv.only_admins_add} onChange={e => run(() => supabase.rpc('update_group', { p_cid: cid, p_title: null, p_avatar: null, p_only_admins: e.target.checked }))} /></label>}
    {err && <p role="alert" className="text-sm text-red-400">{err}</p>}{msg && <p role="status" className="text-sm text-accent">{msg}</p>}
    {(admin || !conv.only_admins_add) && !adding && <button onClick={startAdd} className="flex items-center gap-3 rounded-xl border border-line p-3"><UserPlus className="text-accent" />Add people</button>}
    {adding && <div className="rounded-xl border border-line p-2">{!cands.length && <p className="p-3 text-center text-sm text-mute">No more friends to add.</p>}
      {cands.map(p => <button key={p.id} onClick={() => { const s = new Set(pick); if (s.has(p.id)) s.delete(p.id); else s.add(p.id); setPick(s) }} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-bg"><Avatar a={p} s={40} /><b className="min-w-0 flex-1 truncate">{p.full_name || p.username}</b><input type="checkbox" readOnly checked={pick.has(p.id)} /></button>)}
      <button className="btn mt-2 w-full" disabled={!pick.size} onClick={addPicked}>Add {pick.size || ''}</button></div>}
    <h3 className="font-semibold">Members</h3>
    {members.map(m => <div key={m.user_id} className="flex items-center gap-3"><Avatar a={m.profile} s={44} /><div className="min-w-0 flex-1"><b className="block truncate">{m.profile.full_name || m.profile.username}{m.user_id === uid ? ' (you)' : ''}</b>{m.role === 'admin' && <span className="flex items-center gap-1 text-xs text-accent"><Crown size={12} />Admin</span>}</div>
      {admin && m.user_id !== uid && <div className="flex gap-1"><button onClick={() => run(() => supabase.rpc('set_group_role', { p_cid: cid, p_user: m.user_id, p_role: m.role === 'admin' ? 'member' : 'admin' }))} className="rounded-full border border-line px-2 py-1 text-xs">{m.role === 'admin' ? 'Remove admin' : 'Make admin'}</button>
        <button aria-label="Remove" onClick={() => { if (confirm('Remove this person from the group?')) run(() => supabase.rpc('remove_group_member', { p_cid: cid, p_user: m.user_id })) }} className="rounded-full border border-line p-1.5 text-red-400"><UserMinus size={14} /></button></div>}</div>)}
    {reporting ? <div className="rounded-xl border border-line p-2">{REASONS.map(r => <button key={r} onClick={() => report(r)} className="block w-full rounded-xl p-2 text-left hover:bg-bg">{r}</button>)}</div>
      : <button onClick={() => setReporting(true)} className="flex items-center gap-3 rounded-xl p-3 text-left text-red-400 hover:bg-bg"><Flag size={20} />Report group</button>}
    <button onClick={leave} className="flex items-center gap-3 rounded-xl p-3 text-left text-red-400 hover:bg-bg"><LogOut size={20} />Leave group</button></div></div>)
}
