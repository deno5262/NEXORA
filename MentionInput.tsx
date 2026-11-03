import { useEffect, useState } from 'react'
import { supabase } from './supabase'
type Props = { value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string; maxLength?: number; rows?: number }
export default function MentionInput({ value, onChange, multiline, ...rest }: Props) {
  const [sug, setSug] = useState<{ username: string; full_name: string }[]>([])
  const m = /@([a-z0-9_]{1,24})$/i.exec(value)
  useEffect(() => {
    if (!m) { setSug([]); return }
    let off = false
    supabase.from('profiles').select('username,full_name').ilike('username', m[1] + '%').limit(5).then(({ data }) => { if (!off) setSug((data ?? []) as any) })
    return () => { off = true }
  }, [m?.[1]])
  const Tag: any = multiline ? 'textarea' : 'input'
  return (<div className="relative min-w-0 flex-1">
    <Tag className="input" value={value} onChange={(e: { target: { value: string } }) => onChange(e.target.value)} {...rest} />
    {sug.length > 0 && <ul className="absolute bottom-full z-30 mb-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
      {sug.map(s => <li key={s.username}><button type="button" className="block w-full px-3 py-2 text-left" onClick={() => onChange(value.replace(/@([a-z0-9_]{1,24})$/i, '@' + s.username + ' '))}>@{s.username} <span className="text-mute">{s.full_name}</span></button></li>)}</ul>}
  </div>)
}
