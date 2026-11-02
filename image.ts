import { supabase } from './supabase'
export async function compress(file: File, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Could not process image'))), 'image/jpeg', 0.82))
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
