import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
export default function Guard() {
  const { session, loading } = useAuth()
  if (loading) return <div className="grid h-full place-items-center text-mute">Loading…</div>
  return session ? <Outlet /> : <Navigate to="/login" replace />
}
