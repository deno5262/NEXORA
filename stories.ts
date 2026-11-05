import { supabase } from './supabase'
export type Author = { id: string; username: string; full_name: string; avatar_url: string | null }
export type Story = { id: string; kind: 'photo' | 'video' | 'text'; media_path: string | null; url?: string; text_body: string | null; bg: string | null; caption: string | null; audience: string; allow_replies: boolean; created_at: string }
export type Group = { author: Author; stories: Story[]; unseen: boolean; mine: boolean }
export const BG: Record<string, string> = { g1: 'linear-gradient(135deg,#ff2d55,#ff7a3d)', g2: 'linear-gradient(135deg,#6a11cb,#2575fc)', g3: 'linear-gradient(135deg,#00c6ff,#0072ff)', g4: 'linear-gradient(135deg,#f953c6,#b91d73)', g5: 'linear-gradient(135deg,#232526,#414345)', g6: 'linear-gradient(135deg,#f7971e,#ffb200)' }
export const SEL = 'id,kind,media_path,text_body,bg,caption,audience,allow_replies,created_at,author:profiles!stories_author_id_fkey(id,username,full_name,avatar_url)'
export async function signed(paths: string[]): Promise<Record<string, string>> {
  const urls: Record<string, string> = {}
  if (paths.length) { const { data: s } = await supabase.storage.from('stories').createSignedUrls(paths, 3600); s?.forEach(x => { if (x.path && x.signedUrl) urls[x.path] = x.signedUrl }) }
  return urls
}
export const toStory = (r: any, urls: Record<string, string>): Story => ({ id: r.id, kind: r.kind, media_path: r.media_path, url: r.media_path ? urls[r.media_path] : undefined, text_body: r.text_body, bg: r.bg, caption: r.caption, audience: r.audience, allow_replies: r.allow_replies, created_at: r.created_at })
export async function fetchGroups(uid: string): Promise<Group[]> {
  const since = new Date(Date.now() - 864e5).toISOString()
  const { data, error } = await supabase.from('stories').select(SEL).gt('created_at', since).order('created_at', { ascending: true })
  if (error) throw error
  const rows = (data ?? []) as any[]
  const urls = await signed(rows.map(r => r.media_path).filter(Boolean) as string[])
  const seen = new Set<string>(); const ids = rows.map(r => r.id as string)
  if (ids.length) { const { data: v } = await supabase.from('story_views').select('story_id').eq('viewer_id', uid).in('story_id', ids); (v ?? []).forEach((x: any) => seen.add(x.story_id as string)) }
  const map = new Map<string, Group>()
  rows.forEach(r => { const g: Group = map.get(r.author.id) ?? { author: r.author, stories: [], unseen: false, mine: r.author.id === uid }; g.stories.push(toStory(r, urls)); if (!seen.has(r.id) && !g.mine) g.unseen = true; map.set(r.author.id, g) })
  const last = (g: Group) => +new Date(g.stories[g.stories.length - 1].created_at)
  return Array.from(map.values()).sort((a, b) => (a.mine ? -1 : b.mine ? 1 : 0) || Number(b.unseen) - Number(a.unseen) || last(b) - last(a))
}
