import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, Mic, X, Clock, Hash } from 'lucide-react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { fetchPosts, Post } from './posts'
import { Av } from './ui'
import LevelBadge from './LevelBadge'
import RichText from './RichText'
import RelationButtons from './Relation'
type W = { id: string; username: string; full_name: string; avatar_url: string | null; level: string }
const RECENT = 'recentSearches'
function VoiceOverlay({ lang, setLang, onResult, onClose }: { lang: string; setLang: (l: string) => void; onResult: (t: string) => void; onClose: () => void }) {
  const [heard, setHeard] = useState(''); const [state, setState] = useState('listening'); const [msg, setMsg] = useState(''); const rec = useRef<any>(null)
  const start = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setState('error'); setMsg('Voice search is not supported in this browser. Please use Chrome.'); return }
    try { rec.current?.abort() } catch { /* ignore */ }
    const r = new SR(); r.lang = lang; r.interimResults = true; r.continuous = false; let finalText = ''
    r.onresult = (e: any) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; finalText = t; setHeard(t) }
    r.onerror = (e: any) => { setState('error'); setMsg(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Microphone permission is needed for voice search.' : e.error === 'no-speech' ? "I didn't hear anything. Tap the mic to try again." : e.error === 'network' ? 'Voice search needs an internet connection.' : 'Voice search failed (' + e.error + ').') }
    r.onend = () => { if (finalText.trim()) onResult(finalText.trim()); else setState(s => (s === 'error' ? s : 'idle')) }
    rec.current = r; setState('listening'); setMsg(''); setHeard('')
    try { r.start() } catch { setState('error'); setMsg('Could not start the microphone.') }
  }
  useEffect(() => { start(); return () => { try { rec.current?.abort() } catch { /* ignore */ } } }, [lang])
  const chip = (k: string, l: string) => <button key={k} onClick={() => { localStorage.setItem('voiceLang', k); setLang(k) }} className="rounded-full border px-4 py-1.5 text-sm" style={lang === k ? { background: 'var(--accent)', color: 'var(--on)', borderColor: 'var(--accent)' } : { borderColor: 'rgba(255,255,255,.3)' }}>{l}</button>
  return (<div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-6 bg-black/90 p-6 text-center text-white backdrop-blur">
    <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 p-2" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}><X /></button>
    <div className="flex gap-2">{chip('bn-BD', 'বাংলা')}{chip('en-US', 'English')}</div>
    <p className="text-lg font-semibold">{state === 'listening' ? 'Listening…' : state === 'idle' ? "Didn't catch that" : 'Voice search'}</p>
    <button onClick={start} aria-label="Start listening" className="relative grid h-28 w-28 place-items-center rounded-full text-on" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
      {state === 'listening' && <><span className="absolute inset-0 animate-ping rounded-full opacity-40" style={{ background: 'var(--accent)' }} /><span className="absolute -inset-3 animate-pulse rounded-full border-2 opacity-50" style={{ borderColor: 'var(--accent2)' }} /></>}<Mic size={44} className="relative" /></button>
    <div className="flex h-12 items-center gap-1.5" aria-hidden>{Array.from({ length: 11 }, (_, i) => <i key={i} className={`h-full w-1.5 rounded-full ${state === 'listening' ? 'eq-bar' : ''}`} style={{ background: 'var(--accent)', animationDelay: `${i * 90}ms`, transform: state === 'listening' ? undefined : 'scaleY(.2)' }} />)}</div>
    <p className="min-h-[3rem] max-w-sm break-words text-2xl font-medium">{heard || (state === 'listening' ? 'Say a name, a word or a #hashtag' : '')}</p>
    {msg && <p role="alert" className="max-w-xs text-sm text-red-300">{msg}</p>}</div>)
}
export default function Search() {
  const { session } = useAuth(); const uid = session!.user.id
  const [q, setQ] = useState(''); const [people, setPeople] = useState<W[]>([]); const [posts, setPosts] = useState<Post[]>([]); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [err, setErr] = useState('')
  const [tab, setTab] = useState('All'); const [voice, setVoice] = useState(false); const [lang, setLang] = useState(localStorage.getItem('voiceLang') || 'bn-BD')
  const [recent, setRecent] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(RECENT) || '[]') } catch { return [] } }); const [tags, setTags] = useState<string[]>([])
  const remember = (t: string) => { const n = [t, ...recent.filter(x => x !== t)].slice(0, 8); setRecent(n); localStorage.setItem(RECENT, JSON.stringify(n)) }
  useEffect(() => {
    supabase.from('posts').select('caption').order('created_at', { ascending: false }).limit(150).then(({ data }) => {
      const m = new Map<string, number>(); ((data ?? []) as any[]).forEach(p => (String(p.caption).match(/#[\w\u0980-\u09FF]+/g) ?? []).forEach((t: string) => m.set(t.toLowerCase(), (m.get(t.toLowerCase()) ?? 0) + 1)))
      setTags(Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]))
    })
  }, [])
  useEffect(() => {
    const term = q.trim().replace(/[%_,()\\]/g, ' ').trim()
    if (term.length < 2) { setPeople([]); setPosts([]); setDone(false); return }
    const t = setTimeout(async () => {
      setBusy(true); setErr('')
      try {
        const tag = term.startsWith('#')
        const [pp, ps] = await Promise.all([
          tag ? Promise.resolve([] as W[]) : supabase.from('profiles').select('id,username,full_name,avatar_url,level').or(`username.ilike.%${term}%,full_name.ilike.%${term}%`).neq('id', uid).limit(8).then((r: any) => (r.data ?? []) as W[]),
          fetchPosts({ search: term, limit: 30 })])
        setPeople(pp); setPosts(ps); setDone(true); if (pp.length || ps.length) remember(q.trim())
      } catch (e) { setErr((e as Error).message) }
      setBusy(false)
    }, 350)
    return () => clearTimeout(t)
  }, [q])
  const showPeople = tab !== 'Posts' && people.length > 0; const showPosts = tab !== 'People' && posts.length > 0
  return (<div className="flex flex-col gap-4">
    <label className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2.5"><SearchIcon size={18} className="text-mute" />
      <input autoFocus className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search people, posts, #hashtags" value={q} onChange={e => setQ(e.target.value)} />
      {q && <button aria-label="Clear" onClick={() => setQ('')} className="text-mute"><X size={18} /></button>}
      <button aria-label="Voice search" onClick={() => setVoice(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-on" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}><Mic size={18} /></button></label>
    {voice && <VoiceOverlay lang={lang} setLang={setLang} onClose={() => setVoice(false)} onResult={t => { setQ(t); setVoice(false) }} />}
    {q.trim().length < 2 ? <>
      {recent.length > 0 && <section className="flex flex-col gap-2"><div className="flex items-center justify-between"><h2 className="font-bold">Recent</h2><button className="text-sm text-mute" onClick={() => { setRecent([]); localStorage.removeItem(RECENT) }}>Clear</button></div>
        <div className="flex flex-wrap gap-2">{recent.map(r => <button key={r} onClick={() => setQ(r)} className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm"><Clock size={14} className="text-mute" />{r}</button>)}</div></section>}
      {tags.length > 0 && <section className="flex flex-col gap-2"><h2 className="font-bold">Trending hashtags</h2>
        <div className="flex flex-wrap gap-2">{tags.map(t => <button key={t} onClick={() => setQ(t)} className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm text-accent"><Hash size={14} />{t.slice(1)}</button>)}</div></section>}
      {!recent.length && !tags.length && <p className="py-10 text-center text-mute">Search for people, posts and hashtags. Tap the mic to search with your voice.</p>}</> : <>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">{['All', 'People', 'Posts'].map(k => <button key={k} onClick={() => setTab(k)} className="shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium" style={tab === k ? { background: 'var(--accent)', color: 'var(--on)', borderColor: 'var(--accent)' } : { borderColor: 'var(--line)', color: 'var(--mute)' }}>{k}</button>)}</div>
      {err && <p role="alert" className="text-red-400">{err}</p>}
      {busy && [0, 1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />)}
      {done && !busy && !showPeople && !showPosts && <p className="py-8 text-center text-mute">Nothing found for "{q.trim()}".</p>}
      {showPeople && <section className="flex flex-col gap-2"><h2 className="font-bold">People</h2>
        {people.map(w => <div key={w.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
          <Link to={`/u/${w.username}`} className="flex items-center gap-3"><Av a={w} /><div className="min-w-0 flex-1"><b className="block truncate">{w.full_name || w.username}</b><span className="text-xs text-mute">@{w.username}</span></div><LevelBadge level={w.level} size={14} /></Link>
          <RelationButtons target={w.id} /></div>)}</section>}
      {showPosts && <section className="flex flex-col gap-2"><h2 className="font-bold">Posts</h2>
        {posts.map(p => <Link key={p.id} to={`/post/${p.id}`} className="flex gap-3 rounded-xl border border-line bg-surface p-2">
          {p.media[0]?.url && <img src={p.media[0].url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
          <div className="min-w-0"><p className="line-clamp-2 break-words text-sm"><RichText text={p.caption} /></p><span className="text-xs text-mute">@{p.author.username}</span></div></Link>)}</section>}</>}
  </div>)
}
