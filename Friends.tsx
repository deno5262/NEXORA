import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { Av } from './ui'
type W = { id: string; username: string; full_name: string; avatar_url: string | null }
type Req = { id: string; who: W }
export default function Friends() {
  const { session } = useAuth(); const uid = session!.user.id
  const [rec, setRec] = useState<Req[] | null>(null); const [sent, setSent] = useState<Req[]>([]); const [friends, setFriends] = useState<W[]>([]); const [msg, setMsg] = useState('')
  const load = async () => {
    const [r, s, f] = await Promise.all([
      supabase.from('friend_requests').select('id,who:profiles!friend_requests_sender_id_fkey(id,username,full_name,avatar_url)').eq('receiver_id', uid).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('friend_requests').select('id,who:profiles!friend_requests_receiver_id_fkey(id,username,full_name,avatar_url)').eq('sender_id', uid).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('friendships').select('user_a,user_b')])
    setRec((r.data ?? []) as any); setSent((s.data ?? []) as any)
    const ids = ((f.data ?? []) as any[]).map(x => (x.user_a === uid ? x.user_b : x.user_a) as string)
    if (ids.length) { const p = await supabase.from('profiles').select('id,username,full_name,avatar_url').in('id', ids); setFriends((p.data ?? []) as any) } else setFriends([])
  }
  useEffect(() => { load() }, [])
  const act = async (fn: () => PromiseLike<any>) => { setMsg(''); const r = await fn(); if (r?.error) setMsg(r.error.message); load() }
  const row = (w: W, right: React.ReactNode) => <div key={w.id + (right ? '' : 'x')} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
    <Link to={`/u/${w.username}`} className="flex min-w-0 flex-1 items-center gap-3"><Av a={w} /><div className="min-w-0"><b className="block truncate">{w.full_name || w.username}</b><span className="text-xs text-mute">@{w.username}</span></div></Link>{right}</div>
  const btn = 'rounded-xl border border-line px-3 py-1.5 text-sm'
  if (!rec) return <p className="py-10 text-center text-mute">Loading…</p>
  return (<div className="flex flex-col gap-3"><h1 className="text-xl font-bold">Friends</h1>{msg && <p role="alert" className="text-red-400">{msg}</p>}
    <h2 className="font-bold">Requests ({rec.length})</h2>{!rec.length && <p className="text-sm text-mute">No new requests.</p>}
    {rec.map(r => <div key={r.id}>{row(r.who, <span className="flex gap-1"><button onClick={() => act(() => supabase.rpc('respond_friend_request', { req: r.id, accept: true }))} className="btn px-3 py-1.5 text-sm">Accept</button><button onClick={() => act(() => supabase.rpc('respond_friend_request', { req: r.id, accept: false }))} className={btn}>Decline</button></span>)}</div>)}
    {sent.length > 0 && <><h2 className="font-bold">Sent ({sent.length})</h2>{sent.map(r => <div key={r.id}>{row(r.who, <button onClick={() => act(() => supabase.rpc('cancel_friend_request', { req: r.id }))} className={btn}>Cancel</button>)}</div>)}</>}
    <h2 className="font-bold">Your friends ({friends.length})</h2>{!friends.length && <p className="text-sm text-mute">No friends yet. Find people with search and tap Add friend.</p>}
    {friends.map(w => <div key={w.id}>{row(w, <button onClick={() => { if (confirm('Remove this friend?')) act(() => supabase.rpc('remove_friend', { other: w.id })) }} className={btn}>Remove</button>)}</div>)}</div>)
}
