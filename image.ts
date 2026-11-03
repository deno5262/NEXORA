import { supabase } from './supabase'
async function decode(file: File): Promise<{ src: CanvasImageSource; w: number; h: number; done: () => void }> {
  try { const b = await createImageBitmap(file); return { src: b, w: b.width, h: b.height, done: () => b.close() } } catch { /* try the <img> path */ }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image(); img.src = url; await img.decode()
    return { src: img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) }
  } catch (e) { URL.revokeObjectURL(url); throw e }
}
export async function compress(file: File, max: number): Promise<Blob> {
  try {
    const d = await decode(file)
    const r = Math.min(1, max / Math.max(d.w, d.h))
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(d.w * r)); c.height = Math.max(1, Math.round(d.h * r))
    c.getContext('2d')!.drawImage(d.src, 0, 0, c.width, c.height); d.done()
    return await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/jpeg', 0.82))
  } catch {
    if (file.type === 'image/jpeg' && file.size <= 10 * 1024 * 1024) return file
    throw new Error('This photo could not be processed. Please choose a JPG or PNG photo (not HEIC) or take a screenshot of it.')
  }
}
export async function uploadProfileImage(uid: string, kind: 'avatar' | 'cover', file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > 15 * 1024 * 1024) throw new Error('Image is too large (max 15 MB).')
  const blob = await compress(file, kind === 'avatar' ? 512 : 1280)
  const path = `${uid}/${kind}.jpg`
  const { error } = await supabase.storage.from('media').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
  if (error) throw error
  const url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl + '?v=' + Date.now()
  const { error: e2 } = await supabase.from('profiles').update({ [kind === 'avatar' ? 'avatar_url' : 'cover_url']: url }).eq('id', uid)
  if (e2) throw e2
  return url
}
