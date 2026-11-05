import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { fetchFollowingIds, fetchFriendIds } from './posts'
import { Av } from './ui'
import LevelBadge from './LevelBadge'
type W = { id: string; username: string; full_name: string; avatar_url: string | null; level: string }
const KINDS: [string, string][] = [['following', 'Following'], ['followers', 'Followers'], ['friends', 'Friends']]
export default function FollowList() {
  const { username, kind = 'following' } = useParams(); const { session } = useAuth(); const uid = session!.user.id
  const [owner, setOwner] = useState<{ id: string; username: string; full_name: string } | null | undefined>(undefined)
  const [people, setPeople] = useState<W[] | null>(null); const [priv, setPriv] = useState(false); const [err, setErr] = useState(''); const [q, setQ] = useState('')
  const [fol, setFol] = useState<Set<string>>(new Set()); const [fr, setFr] = useState<Set<string>>(new Set()); const [pend, setPend] = useState<Set<string>>(new Set()); const [msg, setMsg] = useState('')
  useEffect(() => { setOwner(undefined); supabase.from('profiles').select('id,username,full_name').eq('username', username).maybeSingle().then(({ data }) => setOwner((data as any) ?? null)) }, [username])
  useEffect(() => {
    if (!owner) return
    setPeople(null); setPriv(false); setErr('')
    supabase.rpc('list_people', { uid: owner.id, kind }).then(({ data, error }) => { if (error) { if (error.message.includes('private')) setPriv(true); else setErr(error.message); setPeople([]) } else setPeople((data ?? []) as W[]) })
    ;(async () => {
      const [a, b, c] = await Promise.all([fetchFollowingIds(uid), fetchFriendIds(uid), supabase.from('friend_requests').select('receiver_id').eq('sender_id', uid).eq('status', 'pending')])
      setFol(a); setFr(b); setPend(new Set<string>(((c.data ?? []) as any[]).map(r => r.receiver_id as string)))
    })()
  }, [owner?.id, kind])
  const toggleFollow = async (id: string) => {
    const has = fol.has(id); if (has && !confirm('Unfollow this person?')) return
    const r = has ? await supabase.from('follows').delete().eq('follower_id', uid).eq('following_id', id) : await supabase.from('follows').insert({ follower_id: uid, following_id: id })
    if (r.error) return setMsg(r.error.message); const s = new Set(fol); if (has) s.delete(id); else s.add(id); setFol(s)
  }
  const addFriend = async (id: string) => { const r = await supabase.rpc('send_friend_request', { target: id }); if (r.error) return setMsg(r.error.message); setPend(new Set(pend).add(id)) }
  if (owner === undefined) return <div className="flex flex-col gap-2">{[0, 1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />)}</div>
  if (!owner) return <p className="py-10 text-center text-mute">This profile does not exist.</p>
  const shown = (people ?? []).filter(p => !q.trim() || (p.full_name + ' ' + p.username).toLowerCase().includes(q.trim().toLowerCase()))
  const small = 'rounded-full border border-line px-3 py-1 text-xs font-semibold'
  return (<div className="flex flex-col gap-3">
    <h1 className="truncate text-xl font-bold">{owner.full_name || owner.username}</h1>
    <div className="no-scrollbar flex gap-2 overflow-x-auto">{KINDS.map(([k, l]) => <Link key={k} replace to={`/u/${owner.username}/list/${k}`} className="shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium" style={kind === k ? { background: 'var(--accent)', color: 'var(--on)', borderColor: 'var(--accent)' } : { borderColor: 'var(--line)', color: 'var(--mute)' }}>{l}</Link>)}</div>
    {priv ? <p className="py-10 text-center text-mute">@{owner.username} keeps this list private.</p> : <>
      <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2"><SearchIcon size={16} className="text-mute" /><input className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search in this list" value={q} onChange={e => setQ(e.target.value)} /></label>
      {err && <p role="alert" className="text-red-400">{err}</p>}{msg && <p role="alert" className="text-sm text-red-400">{msg}</p>}
      {!people && [0, 1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />)}
      {people && !shown.length && <p className="py-10 text-center text-mute">{q ? 'No match.' : 'Nobody here yet.'}</p>}
      {shown.map(p => <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
        <Link to={`/u/${p.username}`} className="flex min-w-0 flex-1 items-center gap-3"><Av a={p} /><div className="min-w-0"><b className="block truncate">{p.full_name || p.username}</b><span className="flex items-center gap-2 text-xs text-mute">@{p.username}<LevelBadge level={p.level} size={12} /></span></div></Link>
        {p.id !== uid && <div className="flex shrink-0 flex-col items-end gap-1">
          <button onClick={() => toggleFollow(p.id)} className={fol.has(p.id) ? small : small + ' border-accent text-accent'}>{fol.has(p.id) ? 'Following' : 'Follow'}</button>
          {fr.has(p.id) ? <span className="text-xs text-accent">Friends ✓</span> : pend.has(p.id) ? <span className="text-xs text-mute">Requested</span> : <button onClick={() => addFriend(p.id)} className="text-xs text-mute underline">Add friend</button>}</div>}</div>)}</>}
  </div>)
}
