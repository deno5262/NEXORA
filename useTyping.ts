import { useEffect, useState } from 'react'
import { supabase } from './supabase'
export function useTypingView(active = true) {
  const [map, setMap] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!active) return
    let stop = false
    const run = async () => { const { data } = await supabase.rpc('typing_view'); if (stop) return; const m: Record<string, string> = {}; ((data ?? []) as any[]).forEach(r => { m[r.user_id] = r.label }); setMap(m) }
    run(); const id = setInterval(run, 4000)
    return () => { stop = true; clearInterval(id) }
  }, [active])
  return map
}
