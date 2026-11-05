import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { fetchPosts, Post } from './posts'
import { Av } from './ui'
import LevelBadge from './LevelBadge'
import RichText from './RichText'
import RelationButtons from './Relation'
type W = { id: string; username: string; full_name: string; avatar_url: string | null; level: string }
export default function Search() {
  const { session } = useAuth(); const uid = session!.user.id
  const [q, setQ] = useState(''); const [people, setPeople] = useState<W[]>([]); const [posts, setPosts] = useState<Post[]>([]); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [err, setErr] = useState('')
  useEffect(() => {
    const term = q.trim().replace(/[%_,()\\]/g, ' ').trim()
    if (term.length < 2) { setPeople([]); setPosts([]); setDone(false); return }
    const t = setTimeout(async () => {
      setBusy(true); setErr('')
      try {
        const tag = term.startsWith('#')
        const [pp, ps] = await Promise.all([
          tag ? Promise.resolve([] as W[]) : supabase.from('profiles').select('id,username,full_name,avatar_url,level').or(`username.ilike.%${term}%,full_name.ilike.%${term}%`).neq('id', uid).limit(8).then((r: any) => (r.data ?? []) as W[]),
          fetchPosts({ search: term, limit: 30 })])
        setPeople(pp); setPosts(ps); setDone(true)
      } catch (e) { setErr((e as Error).message) }
      setBusy(false)
    }, 350)
    return () => clearTimeout(t)
  }, [q])
  return (<div className="flex flex-col gap-4">
    <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5"><SearchIcon size={18} className="text-mute" />
      <input autoFocus className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search people, posts, #hashtags" value={q} onChange={e => setQ(e.target.value)} /></label>
    {err && <p role="alert" className="text-red-400">{err}</p>}{busy && <p className="text-center text-mute">Searching…</p>}
    {done && !busy && !people.length && !posts.length && <p className="py-8 text-center text-mute">Nothing found.</p>}
    {people.length > 0 && <section className="flex flex-col gap-2"><h2 className="font-bold">People</h2>
      {people.map(w => <div key={w.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
        <Link to={`/u/${w.username}`} className="flex items-center gap-3"><Av a={w} /><div className="min-w-0 flex-1"><b className="block truncate">{w.full_name || w.username}</b><span className="text-xs text-mute">@{w.username}</span></div><LevelBadge level={w.level} size={14} /></Link>
        <RelationButtons target={w.id} /></div>)}</section>}
    {posts.length > 0 && <section className="flex flex-col gap-2"><h2 className="font-bold">Posts</h2>
      {posts.map(p => <Link key={p.id} to={`/post/${p.id}`} className="flex gap-3 rounded-xl border border-line bg-surface p-2">
        {p.media[0]?.url && <img src={p.media[0].url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
        <div className="min-w-0"><p className="line-clamp-2 break-words text-sm"><RichText text={p.caption} /></p><span className="text-xs text-mute">@{p.author.username}</span></div></Link>)}</section>}
  </div>)
}
