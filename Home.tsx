import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Flame, TrendingUp } from 'lucide-react'
import Feed from './Feed'
import { useAuth } from './AuthContext'
export default function Home() {
  const { profile } = useAuth(); const [tab, setTab] = useState('foryou')
  const tabs: [string, string, typeof Flame][] = [['foryou', 'For You', Flame], ['trending', 'Trending', TrendingUp]]
  return (<div className="flex flex-col gap-5">
    <Link to="/search" className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-mute"><Search size={18} />Search people, posts, hashtags</Link>
    <div className="flex gap-2">{tabs.map(([k, l, I]) => <button key={k} onClick={() => setTab(k)} className="flex items-center gap-2 rounded-full border px-4 py-2 font-semibold"
      style={tab === k ? { background: 'var(--accent)', color: 'var(--on)', borderColor: 'var(--accent)' } : { borderColor: 'var(--line)', color: 'var(--mute)' }}><I size={16} />{l}</button>)}</div>
    <div className="flex gap-4 overflow-x-auto pb-1">
      <Link to="/create/story" className="flex w-16 shrink-0 flex-col items-center gap-1 text-xs">
        <span className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-line bg-surface font-bold">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : (profile?.full_name || '?')[0]?.toUpperCase()}
          <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full bg-accent text-on"><Plus size={14} /></span></span>Your Story</Link>
    </div>
    <Feed tab={tab} />
  </div>)
}
