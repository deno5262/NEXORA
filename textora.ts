import { supabase } from './supabase'
export type Conv = { id: string; kind: string; title: string | null; avatar_url: string | null; other_id: string | null; username: string | null; full_name: string | null; show_active: boolean | null; last_active_at: string | null; last_body: string | null; last_kind: string | null; last_sender: string | null; last_sender_name: string | null; last_at: string; last_deleted: boolean; unread: number; muted: boolean; archived: boolean; member_count: number; other_read_at: string | null }
export const convAv = (c: Conv) => ({ avatar_url: c.avatar_url, full_name: c.title ?? '', username: c.username ?? 'group' })
export async function fetchConvs(): Promise<Conv[]> {
  const { data, error } = await supabase.rpc('conversation_list'); if (error) throw error
  return ((data ?? []) as any[]).map(r => ({ ...r, unread: Number(r.unread), member_count: Number(r.member_count) }))
}
export async function textoraUnread(): Promise<number> { const { data } = await supabase.rpc('textora_unread'); return Number(data ?? 0) }
export async function startDirect(other: string): Promise<string> { const { data, error } = await supabase.rpc('start_direct', { other }); if (error) throw error; return data as string }
export function agoShort(iso: string) { const s = (Date.now() - new Date(iso).getTime()) / 1000; return s < 60 ? 'now' : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d` }
export function statusOf(online: boolean, show: boolean, last: string | null) {
  if (!show) return ''
  if (online) return 'Active now'
  if (!last) return 'Offline'
  const m = Math.floor((Date.now() - new Date(last).getTime()) / 60000)
  return m < 30 ? `Last active ${Math.max(m, 1)} min ago` : `Offline · Last seen ${agoShort(last)} ago`
}
export const ge = (a: string | null, b: string) => !!a && new Date(a).getTime() >= new Date(b).getTime()
export function dayLabel(iso: string) {
  const d = new Date(iso); const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  return same(d, new Date()) ? 'Today' : same(d, new Date(Date.now() - 864e5)) ? 'Yesterday' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
export function previewOf(c: Conv, uid: string) {
  if (!c.last_kind) return c.kind === 'group' ? 'Group created' : 'Say hi 👋'
  if (c.last_kind === 'system') return (c.last_sender_name ?? 'Someone') + ' ' + (c.last_body ?? '')
  const who = c.last_sender === uid ? 'You: ' : c.kind === 'group' && c.last_sender_name ? c.last_sender_name.split(' ')[0] + ': ' : ''
  return who + (c.last_deleted ? 'Message deleted' : c.last_kind === 'image' ? '📷 Photo' : c.last_kind === 'voice' ? '🎤 Voice message' : c.last_kind === 'video' ? '🎥 Video' : c.last_kind === 'file' ? '📎 File' : c.last_body ?? '')
}
