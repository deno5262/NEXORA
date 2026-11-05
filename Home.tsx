import { useState } from 'react'
import { Flame, TrendingUp, Users, UserCheck } from 'lucide-react'
import Feed from './Feed'
import StoryRow from './StoryRow'
const TABS: [string, string, typeof Flame][] = [['foryou', 'For You', Flame], ['following', 'Following', Users], ['friends', 'Friends', UserCheck], ['trending', 'Trending', TrendingUp]]
export default function Home() {
  const [tab, setTab] = useState('foryou')
  return (<div className="flex flex-col gap-4">
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">{TABS.map(([k, l, I]) => <button key={k} onClick={() => setTab(k)} className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium"
      style={tab === k ? { background: 'var(--accent)', color: 'var(--on)', borderColor: 'var(--accent)' } : { borderColor: 'var(--line)', color: 'var(--mute)' }}><I size={14} />{l}</button>)}</div>
    <StoryRow />
    <Feed tab={tab} />
  </div>)
}
