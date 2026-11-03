import { supabase } from './supabase'
import { compress } from './image'
export type Author = { id: string; username: string; full_name: string; avatar_url: string | null; level: string }
export type Post = { id: string; caption: string; audience: string; created_at: string; author: Author; media: { path: string; url?: string }[]; likes: string[]; comments: number }
export async function fetchPosts(authorId?: string): Promise<Post[]> {
  let q = supabase.from('posts').select('id,caption,audience,created_at,author:profiles!posts_author_id_fkey(id,username,full_name,avatar_url,level),post_media(path,position),post_reactions(user_id),comments(count)').order('created_at', { ascending: false }).limit(30)
  if (authorId) q = q.eq('author_id', authorId)
  const { data, error } = await q
  if (error) throw error
  const rows = (data ?? []) as any[]
  const paths: string[] = rows.flatMap(r => r.post_media.map((m: any) => m.path))
  const urls: Record<string, string> = {}
  if (paths.length) { const { data: s } = await supabase.storage.from('posts').createSignedUrls(paths, 3600); s?.forEach(x => { if (x.path && x.signedUrl) urls[x.path] = x.signedUrl }) }
  return rows.map(r => ({ id: r.id, caption: r.caption, audience: r.audience, created_at: r.created_at, author: r.author,
    media: [...r.post_media].sort((a: any, b: any) => a.position - b.position).map((m: any) => ({ path: m.path, url: urls[m.path] })),
    likes: r.post_reactions.map((x: any) => x.user_id), comments: r.comments?.[0]?.count ?? 0 }))
}
export async function createPost(uid: string, caption: string, audience: string, files: File[]) {
  const { data: post, error } = await supabase.from('posts').insert({ author_id: uid, caption, audience }).select('id').single()
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
