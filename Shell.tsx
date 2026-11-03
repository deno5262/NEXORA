import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Home, CircleDot, Plus, Bell, Search, MessageCircle, ChevronLeft, Settings as Cog, X, Image, Clapperboard, UserCog } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from './AuthContext'
import ThemeMenu from './ThemeMenu'
import Logo from './Logo'
export default function Shell() {
  const { profile } = useAuth(); const { pathname } = useLocation(); const top = ['/', '/stories', '/activity'].includes(pathname); const nav = useNavigate(); const [open, setOpen] = useState(false)
  const item = (to: string, Icon: typeof Home, label: string) => (
    <NavLink to={to} end className={({ isActive }) => `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-accent' : 'text-mute'}`}><Icon size={22} />{label}</NavLink>)
  const go = (to: string) => { setOpen(false); nav(to) }
  return (<div className="mx-auto flex min-h-full max-w-xl flex-col">
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
      {!top && <button aria-label="Back" onClick={() => nav(-1)} className="-ml-1 p-1"><ChevronLeft size={26} /></button>}<Link to="/" className="mr-auto text-xl font-extrabold tracking-widest text-accent"><Logo /></Link>
      <Link to="/search" aria-label="Search" className="p-2"><Search size={22} /></Link>
      <ThemeMenu /><Link to="/textora" aria-label="TEXTORA" className="p-2"><MessageCircle size={22} /></Link>
      {pathname === '/profile' ? <Link to="/settings" aria-label="Settings" className="p-2"><Cog size={22} /></Link> : <Link to="/profile" aria-label="Profile" className="h-8 w-8 overflow-hidden rounded-full border border-accent bg-surface">
        {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-sm font-bold">{(profile?.full_name || profile?.username || '?')[0]?.toUpperCase()}</span>}</Link>}
    </header>
    <main className="flex-1 px-4 pb-28 pt-4"><Outlet /></main>
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-xl grid-cols-4 items-center border-t border-line bg-bg/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      {item('/', Home, 'Home')}{item('/stories', CircleDot, 'Stories')}
      <button aria-label="Create" onClick={() => setOpen(true)} className="mx-auto -mt-6 grid h-14 w-14 place-items-center rounded-full bg-accent text-on shadow-lg"><Plus size={28} /></button>
      {item('/activity', Bell, 'Activity')}
    </nav>
    {open && <div className="fixed inset-0 z-30 flex items-end bg-black/60" onClick={() => setOpen(false)}>
      <div className="mx-auto w-full max-w-xl rounded-t-2xl border-t border-line bg-surface p-4" onClick={e => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between"><b>Create</b><button onClick={() => setOpen(false)} aria-label="Close"><X /></button></div>
        {([['/create/post', Image, 'Create Photo Post'], ['/create/story', Clapperboard, 'Create Story'], ['/edit-profile', UserCog, 'Update Profile Information']] as const).map(([to, I, l]) =>
          <button key={to} onClick={() => go(to)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-bg"><I className="text-accent" />{l}</button>)}
      </div></div>}
  </div>)
}
