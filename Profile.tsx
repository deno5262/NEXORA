import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
export default function Profile() {
  const { profile } = useAuth()
  if (!profile) return <p className="text-mute">Loading profile…</p>
  return (<div className="flex flex-col items-center gap-2 text-center">
    <div className="grid h-24 w-24 place-items-center rounded-full border-2 border-accent bg-surface text-3xl font-bold">{(profile.full_name || profile.username)[0]?.toUpperCase()}</div>
    <h1 className="text-xl font-bold">{profile.full_name || profile.username}</h1><p className="text-mute">@{profile.username}</p>
    <span className="rounded-full border border-accent px-3 py-0.5 text-sm text-accent">{profile.level} · {profile.xp} XP</span>
    {profile.bio && <p>{profile.bio}</p>}
    <Link to="/settings" className="btn mt-2">Settings &amp; edit profile</Link></div>)
}
