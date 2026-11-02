import { Medal, Shield, Gem, Crown } from 'lucide-react'
export const LEVEL_COLORS: Record<string, string> = { Bronze: '#cd7f32', Silver: '#c0c8d0', Gold: '#ffc107', Platinum: '#5fd4e0', Diamond: '#4fc3ff', Elite: '#d946ef' }
export const levelColor = (l: string) => LEVEL_COLORS[l] ?? '#cd7f32'
const ICON: Record<string, typeof Medal> = { Bronze: Medal, Silver: Medal, Gold: Medal, Platinum: Shield, Diamond: Gem, Elite: Crown }
export default function LevelBadge({ level, size = 18 }: { level: string; size?: number }) {
  const c = levelColor(level), I = ICON[level] ?? Medal
  return <span title={level} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold" style={{ color: c, border: `1px solid ${c}`, background: `${c}22` }}><I size={size} fill={c} fillOpacity={0.35} />{level}</span>
}
