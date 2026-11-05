import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Archive as ArchiveIcon, Play } from 'lucide-react'
import { useAuth } from './AuthContext'
import { fetchGroups, Group, Story, BG } from './stories'
import StoryViewer from './StoryViewer'
import { ring } from './StoryRow'
const Thumb = ({ s }: { s: Story }) => s.kind === 'photo' ? <img src={s.url} alt="" className="h-full w-full object-cover" />
  : s.kind === 'video' ? <div className="relative h-full w-full bg-black"><video src={s.url} muted playsInline preload="metadata" className="h-full w-full object-cover" /><Play className="absolute inset-0 m-auto text-white" /></div>
  : <div className="grid h-full w-full place-items-center p-2 text-center text-sm font-bold text-white" style={{ background: BG[s.bg ?? 'g1'] }}><span className="line-clamp-4 break-words">{s.text_body}</span></div>
export function ProfileStories({ authorId }: { authorId: string }) {
  const { session } = useAuth(); const [g, setG] = useState<Group | null | undefined>(undefined); const [open, setOpen] = useState(false)
  useEffect(() => { fetchGroups(session!.user.id).then(a => setG(a.find(x => x.author.id === authorId) ?? null)).catch(() => setG(null)) }, [authorId])
  if (g === undefined) return <p className="py-8 text-center text-mute">Loading…</p>
  if (!g) return <p className="py-8 text-center text-mute">No active stories.</p>
  return (<><div className="grid grid-cols-3 gap-1">{g.stories.map(s => <button key={s.id} onClick={() => setOpen(true)} className="aspect-[9/16] overflow-hidden rounded-lg"><Thumb s={s} /></button>)}</div>
    {open && <StoryViewer groups={[g]} start={0} onClose={() => setOpen(false)} />}</>)
}
export default function Stories() {
  const { session } = useAuth(); const uid = session!.user.id
  const [groups, setGroups] = useState<Group[] | null>(null); const [open, setOpen] = useState<number | null>(null); const [err, setErr] = useState('')
  const load = () => fetchGroups(uid).then(setGroups).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  return (<div className="flex flex-col gap-4"><div className="flex items-center justify-between"><h1 className="text-xl font-bold">Stories</h1>
    <Link to="/stories/archive" className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm"><ArchiveIcon size={16} />Archive</Link></div>
    {err && <p role="alert" className="text-red-400">{err}</p>}
    <div className="grid grid-cols-2 gap-3">
      <Link to="/create/story" className="relative grid aspect-[9/16] place-items-center rounded-2xl border border-dashed border-line text-mute"><span className="flex flex-col items-center gap-1"><Plus size={28} className="text-accent" />Add story</span></Link>
      {groups?.map((g, i) => { const last = g.stories[g.stories.length - 1]
        return <button key={g.author.id} onClick={() => setOpen(i)} className="relative aspect-[9/16] overflow-hidden rounded-2xl p-[3px]" style={ring(g.unseen)}>
          <span className="block h-full w-full overflow-hidden rounded-[13px] bg-surface"><Thumb s={last} /></span>
          <span className="absolute inset-x-2 bottom-2 truncate rounded-full bg-black/60 px-2 py-1 text-center text-xs text-white">{g.mine ? 'Your Story' : g.author.full_name || g.author.username} · {g.stories.length}</span></button> })}</div>
    {groups && !groups.some(g => !g.mine) && <p className="text-center text-sm text-mute">No stories from other people yet. Stories from friends, people you follow and public stories appear here for 24 hours.</p>}
    {open !== null && groups && <StoryViewer groups={groups} start={open} onClose={() => { setOpen(null); load() }} />}</div>)
}
