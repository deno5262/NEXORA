import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from './AuthContext'
import { fetchGroups, Group } from './stories'
import StoryViewer from './StoryViewer'
export const ring = (unseen: boolean) => ({ background: unseen ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'var(--line)' })
export default function StoryRow() {
  const { profile, session } = useAuth(); const uid = session!.user.id
  const [groups, setGroups] = useState<Group[] | null>(null); const [open, setOpen] = useState<number | null>(null)
  const load = () => fetchGroups(uid).then(setGroups).catch(() => setGroups([]))
  useEffect(() => { load() }, [])
  const mine = groups?.findIndex(g => g.mine) ?? -1
  const av = (a: { avatar_url: string | null; full_name: string; username: string }) => a.avatar_url ? <img src={a.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center font-bold">{(a.full_name || a.username)[0]?.toUpperCase()}</span>
  return (<div className="flex gap-4 overflow-x-auto pb-1">
    <div className="relative flex w-16 shrink-0 flex-col items-center gap-1 text-xs">
      {mine >= 0 ? <button onClick={() => setOpen(mine)} className="h-16 w-16 rounded-full p-[3px]" style={ring(false)}><span className="block h-full w-full overflow-hidden rounded-full bg-surface">{profile && av(profile)}</span></button>
        : <Link to="/create/story" className="h-16 w-16 rounded-full p-[3px]" style={ring(false)}><span className="block h-full w-full overflow-hidden rounded-full bg-surface">{profile && av(profile)}</span></Link>}
      <Link to="/create/story" aria-label="Add story" className="absolute right-0 top-11 grid h-5 w-5 place-items-center rounded-full bg-accent text-on"><Plus size={14} /></Link>Your Story</div>
    {groups?.map((g, i) => g.mine ? null : <button key={g.author.id} onClick={() => setOpen(i)} className="flex w-16 shrink-0 flex-col items-center gap-1 text-xs">
      <span className="h-16 w-16 rounded-full p-[3px]" style={ring(g.unseen)}><span className="block h-full w-full overflow-hidden rounded-full border-2 border-bg bg-surface">{av(g.author)}</span></span>
      <span className="w-full truncate text-center">{g.author.full_name || g.author.username}</span></button>)}
    {open !== null && groups && <StoryViewer groups={groups} start={open} onClose={() => { setOpen(null); load() }} />}</div>)
}
