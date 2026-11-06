import { FormEvent, useEffect, useRef, useState } from 'react'
import { X, Volume2, VolumeX, Eye, Trash2, Send } from 'lucide-react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { Av, ago, playPop } from './ui'
import { Group, BG } from './stories'
const QUICK: [string, string][] = [['love', '❤️'], ['fire', '🔥'], ['haha', '😂'], ['wow', '😮'], ['clap', '👏'], ['sad', '😢']]
const EM: Record<string, string> = Object.fromEntries(QUICK)
const stop = { onPointerDown: (e: any) => e.stopPropagation(), onPointerUp: (e: any) => e.stopPropagation() }
function Viewers({ storyId, audience, onClose, onDelete }: { storyId: string; audience: string; onClose: () => void; onDelete: () => void }) {
  const [views, setViews] = useState<any[]>([]); const [reacts, setReacts] = useState<Record<string, string>>({}); const [replies, setReplies] = useState<any[]>([]); const [aud, setAud] = useState(audience); const [msg, setMsg] = useState('')
  useEffect(() => {
    supabase.from('story_views').select('viewer_id,created_at,viewer:profiles!story_views_viewer_id_fkey(username,full_name,avatar_url)').eq('story_id', storyId).order('created_at', { ascending: false }).then(({ data }) => setViews(data ?? []))
    supabase.from('story_reactions').select('user_id,kind').eq('story_id', storyId).then(({ data }) => { const m: Record<string, string> = {}; (data ?? []).forEach((r: any) => { m[r.user_id] = r.kind }); setReacts(m) })
    supabase.from('story_replies').select('id,body,created_at,sender:profiles!story_replies_sender_id_fkey(username,full_name,avatar_url)').eq('story_id', storyId).order('created_at').then(({ data }) => setReplies(data ?? []))
  }, [storyId])
  const changeAud = async (v: string) => { setAud(v); const { error } = await supabase.from('stories').update({ audience: v }).eq('id', storyId); setMsg(error ? error.message : 'Privacy updated') }
  return (<div className="absolute inset-x-0 bottom-0 z-10 max-h-[75%] overflow-y-auto rounded-t-2xl bg-surface p-4 text-ink" {...stop}>
    <div className="mb-3 flex items-center justify-between"><b>{views.length} views</b><button onClick={onClose} aria-label="Close"><X /></button></div>
    <div className="mb-3 flex gap-2"><select className="input" value={aud} onChange={e => changeAud(e.target.value)}><option value="public">Public</option><option value="friends">Friends</option><option value="followers">Followers</option><option value="only_me">Only me</option></select>
      <button onClick={onDelete} className="flex items-center gap-1 rounded-xl border border-line px-3 text-red-400"><Trash2 size={16} />Delete</button></div>{msg && <p className="mb-2 text-sm text-mute">{msg}</p>}
    {views.map(v => <div key={v.viewer_id} className="flex items-center gap-3 py-1.5"><Av a={v.viewer} /><div className="min-w-0 flex-1"><b className="block truncate">{v.viewer.full_name || v.viewer.username}</b><span className="text-xs text-mute">{ago(v.created_at)}</span></div><span className="text-xl">{EM[reacts[v.viewer_id]] ?? ''}</span></div>)}
    {replies.length > 0 && <><b className="mt-3 block">Replies</b>{replies.map(r => <div key={r.id} className="flex items-start gap-3 py-1.5"><Av a={r.sender} /><p className="min-w-0 break-words text-sm"><b>{r.sender.full_name || r.sender.username}</b> {r.body}</p></div>)}</>}
    {!views.length && <p className="text-center text-mute">No views yet.</p>}</div>)
}
export default function StoryViewer({ groups, start, onClose }: { groups: Group[]; start: number; onClose: () => void }) {
  const { session } = useAuth(); const uid = session!.user.id
  const [list, setList] = useState<Group[]>(groups); const [gi, setGi] = useState(start); const [si, setSi] = useState(0); const [prog, setProg] = useState(0); const [paused, setPaused] = useState(false); const [muted, setMuted] = useState(false)
  const [sheet, setSheet] = useState(false); const [reply, setReply] = useState(''); const [myReact, setMyReact] = useState<string | null>(null); const [msg, setMsg] = useState('')
  const g = list[gi]; const s = g?.stories[si]
  const vid = useRef<HTMLVideoElement>(null); const hold = useRef(0); const held = useRef(false); const y0 = useRef(0); const seen = useRef(new Set<string>())
  const next = () => { if (si < g.stories.length - 1) setSi(si + 1); else if (gi < list.length - 1) { setGi(gi + 1); setSi(0) } else { onClose(); return } setProg(0) }
  const prev = () => { if (si > 0) setSi(si - 1); else if (gi > 0) { setGi(gi - 1); setSi(list[gi - 1].stories.length - 1) } setProg(0) }
  useEffect(() => {
    if (!s || s.kind === 'video' || paused || sheet) return
    let raf = 0; const t0 = performance.now() - prog * 5000
    const tick = (now: number) => { const p = (now - t0) / 5000; if (p >= 1) { next(); return } setProg(p); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [gi, si, paused, sheet])
  useEffect(() => { const v = vid.current; if (!v) return; if (paused || sheet) v.pause(); else v.play().catch(() => setMuted(true)) }, [paused, sheet, gi, si])
  useEffect(() => {
    if (!s || !g) return; setMyReact(null); setMsg(''); setReply('')
    if (g.mine) return
    if (!seen.current.has(s.id)) { seen.current.add(s.id); supabase.from('story_views').insert({ story_id: s.id, viewer_id: uid }).then(() => {}) }
    supabase.from('story_reactions').select('kind').eq('story_id', s.id).eq('user_id', uid).maybeSingle().then(({ data }) => setMyReact((data as any)?.kind ?? null))
  }, [gi, si])
  const react = async (k: string) => {
    if (!s) return; const same = myReact === k; setMyReact(same ? null : k); if (!same) playPop()
    const r = same ? await supabase.from('story_reactions').delete().eq('story_id', s.id).eq('user_id', uid) : await supabase.from('story_reactions').upsert({ story_id: s.id, user_id: uid, kind: k }, { onConflict: 'story_id,user_id' })
    if (r.error) setMsg(r.error.message)
  }
  const sendReply = async (e: FormEvent) => {
    e.preventDefault(); const t = reply.trim(); if (!t || !s) return
    const r = await supabase.from('story_replies').insert({ story_id: s.id, sender_id: uid, body: t }); if (r.error) setMsg(r.error.message); else { setReply(''); setMsg('Reply sent'); try { const cid = await supabase.rpc('start_direct', { other: g.author.id }); if (!cid.error && cid.data) await supabase.from('messages').insert({ conversation_id: cid.data, sender_id: uid, kind: 'text', body: `↩ Replied to your story: ${t}` }) } catch { /* chat is optional */ } }
  }
  const del = async () => {
    if (!s || !confirm('Delete this story?')) return
    const { error } = await supabase.from('stories').delete().eq('id', s.id); if (error) return setMsg(error.message)
    if (s.media_path) await supabase.storage.from('stories').remove([s.media_path])
    const nl = list.map(x => ({ ...x, stories: x.stories.filter(y => y.id !== s.id) })).filter(x => x.stories.length)
    setSheet(false); if (!nl.length) return onClose()
    const ng = Math.min(gi, nl.length - 1); setList(nl); setGi(ng); setSi(Math.min(si, nl[ng].stories.length - 1)); setProg(0)
  }
  const down = (e: any) => { held.current = false; y0.current = e.clientY; hold.current = window.setTimeout(() => { held.current = true; setPaused(true) }, 220) }
  const up = (e: any) => {
    window.clearTimeout(hold.current); if (e.clientY - y0.current > 110) { onClose(); return }
    if (held.current) { setPaused(false); return }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); if (e.clientX - r.left < r.width * 0.35) prev(); else next()
  }
  if (!g || !s) return null
  return (<div className="fixed inset-0 z-[80] select-none overflow-hidden bg-black text-white" style={{ touchAction: 'none' }} onPointerDown={down} onPointerUp={up} onPointerCancel={() => { window.clearTimeout(hold.current); setPaused(false) }}>
    <div className="absolute inset-0 grid place-items-center">
      {s.kind === 'photo' && <img src={s.url} alt="" className="h-full w-full object-contain" />}
      {s.kind === 'video' && <video ref={vid} src={s.url} playsInline muted={muted} className="h-full w-full object-contain" onTimeUpdate={e => setProg(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)} onEnded={next} />}
      {s.kind === 'text' && <div className="grid h-full w-full place-items-center p-8 text-center text-3xl font-bold" style={{ background: BG[s.bg ?? 'g1'] }}><p className="break-words">{s.text_body}</p></div>}
      {s.caption && <p className="absolute inset-x-0 bottom-32 bg-black/40 px-4 py-2 text-center">{s.caption}</p>}</div>
    <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
      <div className="flex gap-1">{g.stories.map((x, i) => <div key={x.id} className="h-1 flex-1 overflow-hidden rounded bg-white/30"><div className="h-full" style={{ width: `${i < si ? 100 : i === si ? prog * 100 : 0}%`, background: 'var(--accent)' }} /></div>)}</div>
      <div className="mt-2 flex items-center gap-2" {...stop}><Av a={g.author} /><div className="min-w-0 flex-1"><b className="block truncate">{g.author.full_name || g.author.username}</b><span className="text-xs text-white/70">{ago(s.created_at)}</span></div>
        {s.kind === 'video' && <button onClick={() => setMuted(!muted)} aria-label="Sound" className="p-2">{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>}
        <button onClick={onClose} aria-label="Close" className="p-2"><X /></button></div></div>
    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/70 to-transparent p-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }} {...stop}>
      {msg && <p className="text-center text-sm">{msg}</p>}
      {g.mine ? <button onClick={() => setSheet(true)} className="mx-auto flex items-center gap-2 rounded-full bg-white/15 px-4 py-2"><Eye size={18} />Views & options</button> : <>
        <div className="flex justify-center gap-3">{QUICK.map(([k, e]) => <button key={k} aria-label={k} onClick={() => react(k)} className={`text-2xl transition-transform ${myReact === k ? 'scale-125' : 'opacity-80'}`}>{e}</button>)}</div>
        {s.allow_replies ? <form onSubmit={sendReply} className="flex gap-2"><input className="min-w-0 flex-1 rounded-full border border-white/40 bg-transparent px-4 py-2 outline-none" placeholder="Send a reply…" maxLength={500} value={reply} onChange={e => setReply(e.target.value)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} />
          <button aria-label="Send" className="rounded-full bg-accent p-2.5 text-on"><Send size={18} /></button></form> : <p className="text-center text-xs text-white/60">Replies are turned off for this story.</p>}</>}</div>
    {sheet && g.mine && <Viewers storyId={s.id} audience={s.audience} onClose={() => setSheet(false)} onDelete={del} />}
  </div>)
}
