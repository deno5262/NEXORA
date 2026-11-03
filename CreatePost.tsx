import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, X } from 'lucide-react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { createPost } from './posts'
import MentionInput from './MentionInput'
export default function CreatePost() {
  const { session } = useAuth(); const nav = useNavigate()
  const [files, setFiles] = useState<File[]>([]); const [caption, setCaption] = useState(''); const [audience, setAudience] = useState('friends'); const [fit, setFit] = useState('crop'); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const urls = useMemo(() => files.map(f => URL.createObjectURL(f)), [files])
  useEffect(() => () => urls.forEach(URL.revokeObjectURL), [urls])
  useEffect(() => { supabase.from('user_settings').select('post_audience').eq('user_id', session!.user.id).single().then(({ data }) => data?.post_audience && setAudience(data.post_audience)) }, [])
  const add = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = [...(e.target.files ?? [])]; e.target.value = ''; setErr('')
    const ok = picked.filter(f => f.type.startsWith('image/') && f.size <= 15 * 1024 * 1024)
    if (ok.length < picked.length) setErr('Some files were skipped (images only, max 15 MB each).')
    setFiles([...files, ...ok].slice(0, 10))
  }
  const publish = async (e: FormEvent) => {
    e.preventDefault(); if (!files.length) return setErr('Add at least one photo.')
    setBusy(true); setErr('')
    try { await createPost(session!.user.id, caption.trim(), audience, files, fit); nav('/') } catch (x) { setErr((x as Error).message); setBusy(false) }
  }
  return (<form onSubmit={publish} className="flex flex-col gap-3"><h1 className="text-xl font-bold">Create photo post</h1>
    <div className="grid grid-cols-3 gap-2">{urls.map((u, i) => <div key={u} className="relative aspect-square overflow-hidden rounded-xl border border-line"><img src={u} alt="" className="h-full w-full object-cover" />
      <button type="button" aria-label="Remove" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X size={14} /></button></div>)}
      {files.length < 10 && <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-line text-mute"><ImagePlus /><input type="file" accept="image/*" multiple hidden onChange={add} /></label>}</div>
    <MentionInput multiline rows={3} maxLength={2000} placeholder="Write a caption (optional). Use @ to mention, # for hashtags" value={caption} onChange={setCaption} />
    <select className="input" value={audience} onChange={e => setAudience(e.target.value)}><option value="public">Public</option><option value="friends">Friends</option><option value="only_me">Only me</option></select>
    {err && <p role="alert" className="text-red-400">{err}</p>}
    <button className="btn" disabled={busy}>{busy ? 'Publishing…' : 'Publish'}</button></form>)
}
