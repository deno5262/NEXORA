import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { X, ImagePlus, Heart, Mic, Square } from 'lucide-react'
import { supabase } from './supabase'
import { compress } from './image'
import { useAuth } from './AuthContext'
import { Av, ago } from './ui'
import RichText from './RichText'
import MentionInput from './MentionInput'
type C = { id: string; parent_id: string | null; body: string; created_at: string; image_path: string | null; audio_path: string | null; author_id: string; author: { username: string; full_name: string; avatar_url: string | null }; comment_reactions: { user_id: string }[] }
export default function CommentSheet({ postId, onClose, onCount }: { postId: string; onClose: () => void; onCount: (n: number) => void }) {
  const { session } = useAuth(); const uid = session!.user.id
  const [list, setList] = useState<C[]>([]); const [urls, setUrls] = useState<Record<string, string>>({}); const [body, setBody] = useState(''); const [file, setFile] = useState<File | null>(null)
  const [reply, setReply] = useState<C | null>(null); const [open, setOpen] = useState<Set<string>>(new Set()); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [voice, setVoice] = useState<Blob | null>(null); const [recording, setRecording] = useState(false); const [peek, setPeek] = useState(false)
  const inputRef = useRef<any>(null); const recRef = useRef<MediaRecorder | null>(null); const recTimer = useRef(0)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  const voiceUrl = useMemo(() => (voice ? URL.createObjectURL(voice) : null), [voice])
  useEffect(() => () => { window.clearTimeout(recTimer.current); if (recRef.current?.state === 'recording') recRef.current.stop() }, [])
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mr = new MediaRecorder(stream); const chunks: BlobPart[] = []
      mr.ondataavailable = e => chunks.push(e.data)
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); setVoice(new Blob(chunks, { type: mr.mimeType || 'audio/webm' })); setRecording(false) }
      mr.start(); recRef.current = mr; setRecording(true); setVoice(null); recTimer.current = window.setTimeout(() => { if (mr.state === 'recording') mr.stop() }, 60000)
    } catch { setErr('Microphone permission is needed to record a voice comment.') }
  }
  const stopRec = () => { window.clearTimeout(recTimer.current); if (recRef.current?.state === 'recording') recRef.current.stop() }
  const startReply = (c: C) => { setReply(c); if (!body.trim()) setBody(`@${c.author.username} `); setTimeout(() => inputRef.current?.focus(), 60) }
  const load = async () => {
    const { data, error } = await supabase.from('comments').select('id,parent_id,body,created_at,image_path,audio_path,author_id,author:profiles!comments_author_id_fkey(username,full_name,avatar_url),comment_reactions(user_id)').eq('post_id', postId).order('created_at')
    if (error) return setErr(error.message)
    const rows = (data ?? []) as any as C[]; setList(rows); onCount(rows.length)
    const paths = rows.flatMap(r => [r.image_path, r.audio_path]).filter(Boolean) as string[]
    if (paths.length) { const { data: s } = await supabase.storage.from('posts').createSignedUrls(paths, 3600); const m: Record<string, string> = {}; s?.forEach(x => { if (x.path && x.signedUrl) m[x.path] = x.signedUrl }); setUrls(m) }
  }
  useEffect(() => { load() }, [])
  const send = async (e: FormEvent) => {
    e.preventDefault(); const t = body.trim(); if (!t && !file && !voice) return; setBusy(true); setErr('')
    let image_path: string | null = null; let audio_path: string | null = null
    try {
      if (file) { image_path = `${uid}/c-${crypto.randomUUID()}.jpg`; const { error } = await supabase.storage.from('posts').upload(image_path, await compress(file, 1024), { contentType: 'image/jpeg' }); if (error) throw error }
      if (voice) { const mime = voice.type.split(';')[0] || 'audio/webm'; audio_path = `${uid}/c-${crypto.randomUUID()}.${mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'}`; const { error } = await supabase.storage.from('posts').upload(audio_path, voice, { contentType: mime }); if (error) throw error }
      const { error } = await supabase.from('comments').insert({ post_id: postId, author_id: uid, parent_id: reply ? reply.parent_id ?? reply.id : null, body: t, image_path, audio_path })
      if (error) { const bad = [image_path, audio_path].filter(Boolean) as string[]; if (bad.length) await supabase.storage.from('posts').remove(bad); throw error }
      if (reply) setOpen(new Set(open).add(reply.parent_id ?? reply.id))
      setBody(''); setFile(null); setVoice(null); setReply(null); await load()
    } catch (x) { setErr((x as Error).message) }
    setBusy(false)
  }
  const like = async (c: C) => {
    const has = c.comment_reactions.some(r => r.user_id === uid)
    setList(list.map(x => x.id === c.id ? { ...x, comment_reactions: has ? x.comment_reactions.filter(r => r.user_id !== uid) : [...x.comment_reactions, { user_id: uid }] } : x))
    const r = has ? await supabase.from('comment_reactions').delete().eq('comment_id', c.id).eq('user_id', uid) : await supabase.from('comment_reactions').insert({ comment_id: c.id, user_id: uid })
    if (r.error) load()
  }
  const del = async (c: C) => {
    if (!confirm('Delete this comment?')) return
    const { error } = await supabase.from('comments').delete().eq('id', c.id)
    if (error) return setErr(error.message)
    const gone = [c.image_path, c.audio_path].filter(Boolean) as string[]; if (gone.length) await supabase.storage.from('posts').remove(gone); load()
  }
  const item = (c: C, child = false) => { const liked = c.comment_reactions.some(r => r.user_id === uid)
    return (<div key={c.id} className={`flex gap-2 ${child ? 'ml-10' : ''}`}><Av a={c.author} /><div className="min-w-0 flex-1">
      <b className="text-sm">{c.author.full_name || c.author.username}</b>
      {c.body && <p className="break-words text-sm"><RichText text={c.body} /></p>}
      {c.audio_path && urls[c.audio_path] && <audio controls preload="none" src={urls[c.audio_path]} className="mt-1 h-9 w-full max-w-[240px]" />}
      {c.image_path && urls[c.image_path] && <img src={urls[c.image_path]} alt="" className="mt-1 max-h-60 rounded-xl" />}
      <div className="flex items-center gap-4 text-xs text-mute"><span>{ago(c.created_at)}</span><button onClick={() => startReply(c)}>Reply</button>
        {c.author_id === uid && <button onClick={() => del(c)}>Delete</button>}
        <button onClick={() => like(c)} className={`ml-auto flex items-center gap-1 ${liked ? 'text-accent' : ''}`}><Heart size={14} fill={liked ? 'currentColor' : 'none'} />{c.comment_reactions.length || ''}</button></div></div></div>) }
  const toggle = (id: string) => { const s = new Set(open); s.has(id) ? s.delete(id) : s.add(id); setOpen(s) }
  return (<div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
    <div className="mx-auto flex h-[85vh] w-full max-w-xl flex-col rounded-t-2xl bg-surface text-ink" onClick={e => e.stopPropagation()}>
      <div className="relative flex items-center justify-center border-b border-line p-3"><b>{list.length} comments</b><button onClick={onClose} aria-label="Close" className="absolute right-3"><X /></button></div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {!list.length && <p className="py-10 text-center text-mute">No comments yet. Be the first.</p>}
        {list.filter(c => !c.parent_id).map(c => { const reps = list.filter(r => r.parent_id === c.id); const o = open.has(c.id)
          return <div key={c.id} className="flex flex-col gap-2">{item(c)}{reps.length > 0 && <button className="ml-10 text-left text-xs text-mute" onClick={() => toggle(c.id)}>{o ? 'Hide replies' : `View ${reps.length} ${reps.length === 1 ? 'reply' : 'replies'}`}</button>}{o && reps.map(r => item(r, true))}</div> })}
      </div>
      <div className="border-t border-line p-3">
        {reply && <p className="mb-1 flex justify-between text-xs text-mute">Replying to @{reply.author.username}<button onClick={() => setReply(null)}>Cancel</button></p>}
        {preview && <div className="mb-2 flex items-center gap-2"><button type="button" onClick={() => setPeek(true)}><img src={preview} alt="Selected" className="h-16 w-16 rounded-lg border border-line object-cover" /></button><button type="button" className="text-xs text-mute" onClick={() => setFile(null)}>Remove photo</button></div>}
        {voiceUrl && <div className="mb-2 flex items-center gap-2"><audio controls src={voiceUrl} className="h-9 flex-1" /><button type="button" className="text-xs text-mute" onClick={() => setVoice(null)}>Remove</button></div>}
        {recording && <p className="mb-1 text-sm text-red-400">Recording… tap ■ to stop (max 60s)</p>}
        {busy && <p className="mb-1 text-xs text-mute">Posting comment…</p>}
        {err && <p role="alert" className="mb-1 text-sm text-red-400">{err}</p>}
        <form onSubmit={send} className="flex items-center gap-2">
          <label className="cursor-pointer p-1 text-mute"><ImagePlus /><input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f && f.type.startsWith('image/') && f.size <= 15 * 1024 * 1024) setFile(f) }} /></label>
          <button type="button" aria-label={recording ? 'Stop recording' : 'Record voice'} onClick={recording ? stopRec : startRec} className={`p-1 ${recording ? 'text-red-500' : 'text-mute'}`}>{recording ? <Square /> : <Mic />}</button>
          <MentionInput inputRef={inputRef} value={body} onChange={setBody} maxLength={1000} placeholder="Add comment… use @ to mention" />
          <button className="btn px-3" disabled={busy || recording}>{busy ? '…' : 'Send'}</button></form></div>
      {peek && preview && <div className="fixed inset-0 z-[60] grid place-items-center bg-black" onClick={() => setPeek(false)}><img src={preview} alt="" className="max-h-full max-w-full object-contain" /><button className="absolute right-4 top-4 text-white" aria-label="Close"><X /></button></div>}
    </div></div>)
}
