import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { SEL, signed, toStory, Story, BG } from './stories'
export default function StoryArchive() {
  const { session } = useAuth(); const uid = session!.user.id; const [items, setItems] = useState<Story[] | null>(null); const [err, setErr] = useState('')
  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 864e5).toISOString()
      const { data, error } = await supabase.from('stories').select(SEL).eq('author_id', uid).lt('created_at', since).order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      const rows = (data ?? []) as any[]; const urls = await signed(rows.map(r => r.media_path).filter(Boolean) as string[]); setItems(rows.map(r => toStory(r, urls)))
    })().catch(e => setErr(e.message))
  }, [])
  const del = async (s: Story) => {
    if (!confirm('Delete this story for good?')) return
    const { error } = await supabase.from('stories').delete().eq('id', s.id); if (error) return setErr(error.message)
    if (s.media_path) await supabase.storage.from('stories').remove([s.media_path]); setItems((items ?? []).filter(x => x.id !== s.id))
  }
  if (err) return <p role="alert" className="text-red-400">{err}</p>
  if (!items) return <p className="py-10 text-center text-mute">Loading…</p>
  return (<div className="flex flex-col gap-3"><h1 className="text-xl font-bold">Story archive</h1><p className="text-sm text-mute">Your stories stay here, only visible to you, after their 24 hours end.</p>
    {!items.length && <p className="py-10 text-center text-mute">Nothing archived yet.</p>}
    <div className="grid grid-cols-3 gap-1">{items.map(s => <div key={s.id} className="relative aspect-[9/16] overflow-hidden rounded-lg bg-surface">
      {s.kind === 'photo' && <img src={s.url} alt="" className="h-full w-full object-cover" />}{s.kind === 'video' && <video src={s.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />}
      {s.kind === 'text' && <div className="grid h-full place-items-center p-2 text-center text-xs font-bold text-white" style={{ background: BG[s.bg ?? 'g1'] }}>{s.text_body}</div>}
      <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">{new Date(s.created_at).toLocaleDateString()}</span>
      <button onClick={() => del(s)} className="absolute bottom-1 right-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white">Delete</button></div>)}</div></div>)
}
