import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, Type, Video } from 'lucide-react'
import { supabase } from './supabase'
import { compress } from './image'
import { useAuth } from './AuthContext'
import { BG } from './stories'
export default function CreateStory() {
  const { session } = useAuth(); const uid = session!.user.id; const nav = useNavigate()
  const [mode, setMode] = useState<'photo' | 'video' | 'text'>('photo'); const [files, setFiles] = useState<File[]>([]); const [text, setText] = useState(''); const [bg, setBg] = useState('g1')
  const [caption, setCaption] = useState(''); const [aud, setAud] = useState('friends'); const [replies, setReplies] = useState(true); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const urls = useMemo(() => files.map(f => URL.createObjectURL(f)), [files])
  useEffect(() => () => urls.forEach(URL.revokeObjectURL), [urls])
  useEffect(() => { supabase.from('user_settings').select('story_audience').eq('user_id', uid).single().then(({ data }) => data?.story_audience && setAud(data.story_audience)) }, [])
  const pickPhotos = (e: React.ChangeEvent<HTMLInputElement>) => { const p = [...(e.target.files ?? [])].filter(f => f.type.startsWith('image/') && f.size <= 15 * 1024 * 1024); e.target.value = ''; setErr(''); setFiles([...files, ...p].slice(0, 10)) }
  const pickVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''; setErr(''); if (!f) return
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(f.type)) return setErr('Please choose an MP4, WebM or MOV video.')
    if (f.size > 25 * 1024 * 1024) return setErr('Video is too large (max 25 MB).')
    const v = document.createElement('video'); const u = URL.createObjectURL(f); v.preload = 'metadata'
    v.onloadedmetadata = () => { URL.revokeObjectURL(u); if (v.duration > 30) setErr('Video is too long (max 30 seconds).'); else setFiles([f]) }
    v.onerror = () => { URL.revokeObjectURL(u); setErr('This video could not be read.') }; v.src = u
  }
  const publish = async (e: FormEvent) => {
    e.preventDefault(); setErr('')
    if (mode === 'text' ? !text.trim() : !files.length) return setErr(mode === 'text' ? 'Write something first.' : 'Choose a file first.')
    setBusy(true); const common = { author_id: uid, caption: caption.trim() || null, audience: aud, allow_replies: replies }
    try {
      if (mode === 'text') { const { error } = await supabase.from('stories').insert({ ...common, kind: 'text', text_body: text.trim(), bg, caption: null }); if (error) throw error }
      else for (const f of files) {
        const photo = mode === 'photo'; const ext = photo ? 'jpg' : f.type === 'video/webm' ? 'webm' : f.type === 'video/quicktime' ? 'mov' : 'mp4'
        const path = `${uid}/${crypto.randomUUID()}.${ext}`
        const { error: e1 } = await supabase.storage.from('stories').upload(path, photo ? await compress(f, 1080) : f, { contentType: photo ? 'image/jpeg' : f.type }); if (e1) throw e1
        const { error: e2 } = await supabase.from('stories').insert({ ...common, kind: mode, media_path: path }); if (e2) { await supabase.storage.from('stories').remove([path]); throw e2 }
      }
      nav('/stories')
    } catch (x) { setErr((x as Error).message); setBusy(false) }
  }
  const tab = (k: 'photo' | 'video' | 'text', I: typeof Type, l: string) => <button type="button" key={k} onClick={() => { setMode(k); setFiles([]); setErr('') }} className="flex flex-1 flex-col items-center gap-1 rounded-xl border py-2 text-sm" style={mode === k ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : { borderColor: 'var(--line)' }}><I size={20} />{l}</button>
  return (<form onSubmit={publish} className="flex flex-col gap-3"><h1 className="text-xl font-bold">Create story</h1>
    <div className="flex gap-2">{tab('photo', ImagePlus, 'Photo')}{tab('video', Video, 'Video')}{tab('text', Type, 'Text')}</div>
    {mode === 'photo' && <div className="grid grid-cols-3 gap-2">{urls.map((u, i) => <div key={u} className="relative aspect-[9/16] overflow-hidden rounded-xl border border-line"><img src={u} alt="" className="h-full w-full object-cover" />
      <button type="button" aria-label="Remove" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-white">×</button></div>)}
      {files.length < 10 && <label className="grid aspect-[9/16] cursor-pointer place-items-center rounded-xl border border-dashed border-line text-mute"><ImagePlus /><input type="file" accept="image/*" multiple hidden onChange={pickPhotos} /></label>}</div>}
    {mode === 'video' && (urls[0] ? <video src={urls[0]} controls playsInline className="max-h-80 w-full rounded-xl bg-black" /> : <label className="grid h-40 cursor-pointer place-items-center rounded-xl border border-dashed border-line text-mute"><span className="flex flex-col items-center gap-1"><Video />Choose a video (max 30s, 25 MB)</span><input type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={pickVideo} /></label>)}
    {mode === 'text' && <><div className="grid min-h-48 place-items-center rounded-xl p-6 text-center text-2xl font-bold text-white" style={{ background: BG[bg] }}>{text || 'Your text'}</div>
      <textarea className="input" rows={3} maxLength={500} placeholder="Write your story…" value={text} onChange={e => setText(e.target.value)} />
      <div className="flex gap-2">{Object.keys(BG).map(k => <button type="button" key={k} aria-label={k} onClick={() => setBg(k)} className="h-8 w-8 rounded-full border-2" style={{ background: BG[k], borderColor: bg === k ? 'var(--ink)' : 'transparent' }} />)}</div></>}
    {mode !== 'text' && <input className="input" maxLength={200} placeholder="Caption (optional)" value={caption} onChange={e => setCaption(e.target.value)} />}
    <select className="input" value={aud} onChange={e => setAud(e.target.value)}><option value="public">Public</option><option value="friends">Friends</option><option value="followers">Followers</option><option value="only_me">Only me</option></select>
    <label className="flex items-center justify-between rounded-xl border border-line p-3">Allow replies<input type="checkbox" checked={replies} onChange={e => setReplies(e.target.checked)} /></label>
    {err && <p role="alert" className="text-red-400">{err}</p>}<button className="btn" disabled={busy}>{busy ? 'Publishing…' : 'Publish story'}</button>
    <p className="text-xs text-mute">Stories disappear after 24 hours and move to your private archive.</p></form>)
}
