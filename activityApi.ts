import { supabase } from './supabase'
const key = (uid: string) => 'activitySeenAt:' + uid
const seenAt = (uid: string) => localStorage.getItem(key(uid)) || new Date(Date.now() - 864e5).toISOString()
export const markSeen = (uid: string) => { localStorage.setItem(key(uid), new Date().toISOString()); window.dispatchEvent(new Event('activity-seen')) }
export async function countActivity(uid: string): Promise<number> {
  const since = seenAt(uid); const c = (q: any) => q.then((r: any) => (r.count as number) ?? 0)
  const mine = await supabase.from('comments').select('id').eq('author_id', uid).limit(200); const mids = (mine.data ?? []).map((r: any) => r.id as string)
  const parts: number[] = await Promise.all([
    c(supabase.from('post_reactions').select('post_id,post:posts!inner(author_id)', { count: 'exact', head: true }).eq('post.author_id', uid).neq('user_id', uid).gt('created_at', since)),
    c(supabase.from('comments').select('id,post:posts!inner(author_id)', { count: 'exact', head: true }).eq('post.author_id', uid).neq('author_id', uid).gt('created_at', since)),
    mids.length ? c(supabase.from('comments').select('id,post:posts!inner(author_id)', { count: 'exact', head: true }).in('parent_id', mids).neq('author_id', uid).neq('post.author_id', uid).gt('created_at', since)) : Promise.resolve(0),
    c(supabase.from('comment_reactions').select('comment_id,comment:comments!inner(author_id)', { count: 'exact', head: true }).eq('comment.author_id', uid).neq('user_id', uid).gt('created_at', since)),
    c(supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', uid).gt('created_at', since))])
  return parts.reduce((a, b) => a + b, 0)
}
