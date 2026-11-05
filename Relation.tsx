import { useEffect, useState } from 'react'
import { UserPlus, UserCheck, Clock } from 'lucide-react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
type Fr = { kind: 'none' | 'friends' | 'sent' | 'received'; id?: string }
export default function RelationButtons({ target, onChange }: { target: string; onChange?: () => void }) {
  const { session } = useAuth(); const uid = session!.user.id
  const [iFollow, setIFollow] = useState(false); const [followsMe, setFollowsMe] = useState(false); const [fr, setFr] = useState<Fr>({ kind: 'none' }); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('')
  const load = async () => {
    const [a, b] = uid < target ? [uid, target] : [target, uid]
    const [f1, f2, fs, rq] = await Promise.all([
      supabase.from('follows').select('follower_id').eq('follower_id', uid).eq('following_id', target).maybeSingle(),
      supabase.from('follows').select('follower_id').eq('follower_id', target).eq('following_id', uid).maybeSingle(),
      supabase.from('friendships').select('user_a').eq('user_a', a).eq('user_b', b).maybeSingle(),
      supabase.from('friend_requests').select('id,sender_id').eq('status', 'pending').or(`and(sender_id.eq.${uid},receiver_id.eq.${target}),and(sender_id.eq.${target},receiver_id.eq.${uid})`).maybeSingle()])
    setIFollow(!!f1.data); setFollowsMe(!!f2.data)
    const q: any = rq.data
    setFr(fs.data ? { kind: 'friends' } : q ? { kind: q.sender_id === uid ? 'sent' : 'received', id: q.id } : { kind: 'none' })
  }
  useEffect(() => { load() }, [target])
  const run = async (fn: () => PromiseLike<any>) => { setBusy(true); setMsg(''); const r = await fn(); if (r?.error) setMsg(r.error.message); await load(); onChange?.(); setBusy(false) }
  const follow = () => { if (iFollow && !confirm('Unfollow this person?')) return; run(() => iFollow ? supabase.from('follows').delete().eq('follower_id', uid).eq('following_id', target) : supabase.from('follows').insert({ follower_id: uid, following_id: target })) }
  const unfriend = () => { if (confirm('Remove this friend?')) run(() => supabase.rpc('remove_friend', { other: target })) }
  const base = 'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 font-semibold disabled:opacity-50'; const outline = base + ' border border-line'
  return (<div className="flex flex-col gap-2"><div className="flex gap-2">
    <button disabled={busy} onClick={follow} className={iFollow ? outline : base + ' bg-accent text-on'}>{iFollow ? 'Following' : followsMe ? 'Follow back' : 'Follow'}</button>
    {fr.kind === 'none' && <button disabled={busy} onClick={() => run(() => supabase.rpc('send_friend_request', { target }))} className={outline}><UserPlus size={16} />Add friend</button>}
    {fr.kind === 'sent' && <button disabled={busy} onClick={() => run(() => supabase.rpc('cancel_friend_request', { req: fr.id }))} className={outline}><Clock size={16} />Cancel request</button>}
    {fr.kind === 'friends' && <button disabled={busy} onClick={unfriend} className={outline}><UserCheck size={16} />Friends</button>}
    {fr.kind === 'received' && <><button disabled={busy} onClick={() => run(() => supabase.rpc('respond_friend_request', { req: fr.id, accept: true }))} className={base + ' bg-accent text-on'}>Accept</button>
      <button disabled={busy} onClick={() => run(() => supabase.rpc('respond_friend_request', { req: fr.id, accept: false }))} className={outline}>Decline</button></>}
  </div>{msg && <p role="alert" className="text-sm text-red-400">{msg}</p>}</div>)
}
