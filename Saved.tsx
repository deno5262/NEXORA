import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Feed from './Feed'
export default function Saved() {
  const [ids, setIds] = useState<string[] | null>(null)
  useEffect(() => { supabase.from('saved_posts').select('post_id').order('created_at', { ascending: false }).then(({ data }) => setIds((data ?? []).map((r: any) => r.post_id as string))) }, [])
  if (!ids) return <p className="py-10 text-center text-mute">Loading…</p>
  return (<div className="flex flex-col gap-4"><h1 className="text-xl font-bold">Saved posts</h1>{ids.length ? <Feed ids={ids} /> : <p className="py-10 text-center text-mute">Nothing saved yet. Tap the bookmark on a post.</p>}</div>)
}
