import { supabase } from './supabase'
import { compress } from './image'
export type Author = { id: string; username: string; full_name: string; avatar_url: string | null; level: string; quick_reaction?: string }
export type Post = { id: string; caption: string; audience: string; created_at: string; author: Author; media: { path: string; url?: string }[]; reactions: { user_id: string; kind: string }[]; comments: number; fit: string; views: number }
export async function fetchPosts(o: { authorId?: string; postId?: string; ids?: string[]; limit?: number } = {}): Promise<Post[]> {
  let q = supabase.from('posts').select('id,caption,audience,fit,view_count,created_at,author:profiles!posts_author_id_fkey(id,username,full_name,avatar_url,level,quick_reaction),post_media(path,position),post_reactions(user_id,kind),comments(count)').order('created_at', { ascending: false }).limit(o.limit ?? 60)
  if (o.authorId) q = q.eq('author_id', o.authorId)
  if (o.postId) q = q.eq('id', o.postId)
  if (o.ids) q = q.in('id', o.ids.length ? o.ids : ['00000000-0000-0000-0000-000000000000'])
  const { data, error } = await q
  if (error) throw error
  const rows = (data ?? []) as any[]
  const paths: string[] = rows.flatMap(r => r.post_media.map((m: any) => m.path))
  const urls: Record<string, string> = {}
  if (paths.length) { const { data: s } = await supabase.storage.from('posts').createSignedUrls(paths, 3600); s?.forEach(x => { if (x.path && x.signedUrl) urls[x.path] = x.signedUrl }) }
  return rows.map(r => ({ id: r.id, caption: r.caption, audience: r.audience, created_at: r.created_at, author: r.author,
    media: [...r.post_media].sort((a: any, b: any) => a.position - b.position).map((m: any) => ({ path: m.path, url: urls[m.path] })),
    reactions: r.post_reactions, fit: r.fit ?? 'crop', views: r.view_count ?? 0, comments: r.comments?.[0]?.count ?? 0 }))
}
export async function fetchSavedIds(): Promise<Set<string>> {
  const { data } = await supabase.from('saved_posts').select('post_id')
  return new Set<string>((data ?? []).map((r: any) => r.post_id as string))
}
export async function createPost(uid: string, caption: string, audience: string, files: File[], fit = 'crop') {
  const { data: post, error } = await supabase.from('posts').insert({ author_id: uid, caption, audience, fit }).select('id').single()
  if (error) throw error
  const up: string[] = []
  try {
    const rows = []
    for (let i = 0; i < files.length; i++) {
      const path = `${uid}/${post.id}-${i}.jpg`
      const { error: e } = await supabase.storage.from('posts').upload(path, await compress(files[i], 1280), { contentType: 'image/jpeg' })
      if (e) throw e
      up.push(path); rows.push({ post_id: post.id, path, position: i })
    }
    const { error: e2 } = await supabase.from('post_media').insert(rows)
    if (e2) throw e2
  } catch (e) {
    await supabase.from('posts').delete().eq('id', post.id)
    if (up.length) await supabase.storage.from('posts').remove(up)
    throw e
  }
}
export const EMOJI: Record<string, string> = { like: '👍', love: '❤️', fire: '🔥', haha: '😂', wow: '😮', clap: '👏', perfect: '💯', care: '🥰', sad: '😢', angry: '😡' }
export const PICKER = ['like', 'love', 'fire', 'haha', 'wow', 'clap', 'perfect']
export async function fetchFollowingIds(uid: string): Promise<Set<string>> {
  const { data } = await supabase.from('follows').select('following_id').eq('follower_id', uid)
  return new Set<string>((data ?? []).map((r: any) => r.following_id as string))
}
