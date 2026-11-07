import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Home, CircleDot, Plus, Bell, Search, MessageCircleMore, ChevronLeft, Settings as Cog, X, Image, Clapperboard, UserCog } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import ThemeMenu from './ThemeMenu'
import Logo from './Logo'
import Bubbles from './Bubbles'
import PullRefresh from './PullRefresh'
import { useBackClose } from './useBackClose'
import LiveAlerts from './LiveAlerts'
import { countActivity } from './activityApi'
import { textoraUnread } from './textora'
export default function Shell() {
  const { profile, session } = useAuth(); const [unread, setUnread] = useState(0); const [tUnread, setTUnread] = useState(0); const [offline, setOffline] = useState(!navigator.onLine); const { pathname } = useLocation(); const top = ['/', '/stories', '/activity'].includes(pathname); const nav = useNavigate(); const [open, setOpen] = useState(false)
  useBackClose(open, () => setOpen(false))
  useEffect(() => {
    const on = () => setOffline(false), off = () => setOffline(true); window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  useEffect(() => {
    if (!session) return
    const run = () => { textoraUnread().then(setTUnread).catch(() => {}) }
    run(); const id = setInterval(run, 45000); window.addEventListener('textora-unread', run); window.addEventListener('focus', run)
    return () => { clearInterval(id); window.removeEventListener('textora-unread', run); window.removeEventListener('focus', run) }
  }, [session?.user.id])
  useEffect(() => {
    const uid = session?.user.id; if (!uid) return
    const run = () => { countActivity(uid).then(setUnread).catch(() => {}) }
    run(); const id = setInterval(run, 60000)
    window.addEventListener('activity-new', run); window.addEventListener('activity-seen', run); window.addEventListener('focus', run)
    return () => { clearInterval(id); window.removeEventListener('activity-new', run); window.removeEventListener('activity-seen', run); window.removeEventListener('focus', run) }
  }, [session?.user.id])
  const item = (to: string, Icon: typeof Home, label: string, badge = 0) => (
    <NavLink to={to} end className={({ isActive }) => `relative flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-accent' : 'text-mute'}`}><Icon size={22} />{label}{badge > 0 && <span className="absolute -top-1 left-1/2 ml-1 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white">{badge > 99 ? '99+' : badge}</span>}</NavLink>)
  const go = (to: string) => { setOpen(false); nav(to) }
  if (pathname.startsWith('/textora')) return (<div className="mx-auto max-w-xl"><LiveAlerts /><PullRefresh /><Outlet /></div>)
  return (<div className="mx-auto flex min-h-full max-w-xl flex-col">
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
      {!top && <button aria-label="Back" onClick={() => nav(-1)} className="-ml-1 p-1"><ChevronLeft size={26} /></button>}<Link to="/" className="mr-auto text-xl font-extrabold tracking-widest text-accent"><Logo /></Link>
      <Link to="/search" aria-label="Search" className="p-2"><Search size={22} /></Link>
      <ThemeMenu /><Link to="/textora" aria-label="TEXTORA" className="relative p-2"><MessageCircleMore size={22} />{tUnread > 0 && <span className="absolute right-0 top-0 min-w-[16px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{tUnread > 99 ? '99+' : tUnread}</span>}</Link>
      {pathname === '/profile' ? <Link to="/settings" aria-label="Settings" className="p-2"><Cog size={22} /></Link> : <Link to="/profile" aria-label="Profile" className="h-8 w-8 overflow-hidden rounded-full border border-accent bg-surface">
        {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-sm font-bold">{(profile?.full_name || profile?.username || '?')[0]?.toUpperCase()}</span>}</Link>}
    </header>
    <LiveAlerts /><PullRefresh /><Bubbles />{offline && <div className="fixed inset-x-0 top-0 z-[60] bg-red-600 py-1 text-center text-sm text-white">You're offline. Some features need an internet connection.</div>}<main className="flex-1 px-4 pb-28 pt-4"><Outlet /></main>
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-xl grid-cols-4 items-center border-t border-line bg-bg/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      {item('/', Home, 'Home')}{item('/stories', CircleDot, 'Stories')}
      <button aria-label="Create" onClick={() => setOpen(true)} className="mx-auto -mt-6 grid h-14 w-14 place-items-center rounded-full bg-accent text-on shadow-lg"><Plus size={28} /></button>
      {item('/activity', Bell, 'Activity', unread)}
    </nav>
    {open && <div className="fixed inset-0 z-30 flex items-end bg-black/60" onClick={() => setOpen(false)}>
      <div className="mx-auto w-full max-w-xl rounded-t-2xl border-t border-line bg-surface p-4" onClick={e => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between"><b>Create</b><button onClick={() => setOpen(false)} aria-label="Close"><X /></button></div>
        {([['/create/post', Image, 'Create Photo Post'], ['/create/story', Clapperboard, 'Create Story'], ['/edit-profile', UserCog, 'Update Profile Information']] as const).map(([to, I, l]) =>
          <button key={to} onClick={() => go(to)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-bg"><I className="text-accent" />{l}</button>)}
      </div></div>}
  </div>)
}
