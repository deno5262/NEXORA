import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { fetchFollowingIds, fetchPosts, fetchSavedIds, Post } from './posts'
import { useAuth } from './AuthContext'
import { PostCard } from './Feed'
export default function PostPage() {
  const { id } = useParams(); const [sp] = useSearchParams(); const nav = useNavigate(); const { session } = useAuth()
  const [post, setPost] = useState<Post | null | undefined>(undefined); const [saved, setSaved] = useState(false); const [fol, setFol] = useState(false)
  useEffect(() => {
    setPost(undefined)
    Promise.all([fetchPosts({ postId: id }), fetchSavedIds(), fetchFollowingIds(session!.user.id)]).then(([ps, s, f]) => { setPost(ps[0] ?? null); setSaved(s.has(id!)); setFol(!!ps[0] && f.has(ps[0].author.id)) }).catch(() => setPost(null))
  }, [id])
  if (post === undefined) return <p className="py-10 text-center text-mute">Loading…</p>
  if (post === null) return <p className="py-10 text-center text-mute">This post is not available. It may have been deleted or is private.</p>
  return <PostCard post={post} saved={saved} onSaved={setSaved} onDeleted={() => nav('/')} autoOpen={sp.get('c') === '1'} following={fol} onFollow={() => setFol(true)} />
}
