import { FormEvent, useState } from 'react'
import { MapPin } from 'lucide-react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { countries, countryFlag } from './countries'
export const REL: Record<string, string> = { single: 'Single', in_relationship: 'In a relationship', engaged: 'Engaged', married: 'Married', complicated: "It's complicated" }
export default function EditProfile() {
  const { profile, session, refresh } = useAuth()
  const p = profile
  const [f, setF] = useState({ full_name: p?.full_name ?? '', tagline: p?.tagline ?? '', bio: p?.bio ?? '', living_in: p?.living_in ?? p?.location ?? '', hometown: p?.hometown ?? '',
    country: p?.country ?? '', relationship_status: p?.relationship_status ?? '', education: p?.education ?? '', work: p?.work ?? '', birth_year: p?.birth_year ? String(p.birth_year) : '',
    blood_group: p?.blood_group ?? '', is_blood_donor: p?.is_blood_donor ?? false })
  const [pos, setPos] = useState<{ lat: number | null; lng: number | null }>({ lat: p?.lat ?? null, lng: p?.lng ?? null })
  const [msg, setMsg] = useState('')
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const locate = () => {
    if (!navigator.geolocation) return setMsg('Location is not supported on this device.')
    navigator.geolocation.getCurrentPosition(
      r => { setPos({ lat: Math.round(r.coords.latitude * 100) / 100, lng: Math.round(r.coords.longitude * 100) / 100 }); setMsg('Location set (rounded to about 1 km for privacy). Press Save.') },
      () => setMsg('Could not get location. Please allow location access.'), { enableHighAccuracy: false, timeout: 10000 })
  }
  const save = async (e: FormEvent) => {
    e.preventDefault(); setMsg('')
    const by = f.birth_year ? Number(f.birth_year) : null
    if (by !== null && (by < 1900 || by > new Date().getFullYear())) return setMsg('Birth year is not valid.')
    const { birth_year: _b, ...rest } = f
    const { error } = await supabase.from('profiles').update({ ...rest, country: f.country || null, relationship_status: f.relationship_status || null, blood_group: f.blood_group || null,
      birth_year: by, lat: pos.lat, lng: pos.lng, updated_at: new Date().toISOString() }).eq('id', session!.user.id)
    if (!error) await refresh(); setMsg(error ? error.message : 'Saved')
  }
  return (<form onSubmit={save} className="flex flex-col gap-3"><h1 className="text-xl font-bold">Edit profile</h1>
    <input className="input" placeholder="Full name" maxLength={80} value={f.full_name} onChange={set('full_name')} />
    <input className="input" placeholder="Short status line" maxLength={80} value={f.tagline} onChange={set('tagline')} />
    <textarea className="input" placeholder="Bio" maxLength={300} value={f.bio} onChange={set('bio')} />
    <select className="input" value={f.country} onChange={set('country')}><option value="">Country</option>{countries().map(c => <option key={c.code} value={c.code}>{countryFlag(c.code)} {c.name}</option>)}</select>
    <input className="input" placeholder="Lives in (city / area)" maxLength={80} value={f.living_in} onChange={set('living_in')} />
    <button type="button" onClick={locate} className="flex items-center justify-center gap-2 rounded-xl border border-line p-2.5"><MapPin size={18} />{pos.lat !== null ? `Map location set (${pos.lat}, ${pos.lng})` : 'Use my current location for the map'}</button>
    {pos.lat !== null && <button type="button" onClick={() => setPos({ lat: null, lng: null })} className="text-sm text-mute">Remove map location</button>}
    <input className="input" placeholder="From (hometown)" maxLength={80} value={f.hometown} onChange={set('hometown')} />
    <input className="input" placeholder="Education (school / college / university)" maxLength={120} value={f.education} onChange={set('education')} />
    <input className="input" placeholder="Work" maxLength={120} value={f.work} onChange={set('work')} />
    <select className="input" value={f.relationship_status} onChange={set('relationship_status')}><option value="">Relationship status</option>{Object.entries(REL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
    <input className="input" inputMode="numeric" placeholder="Birth year (e.g. 2004)" maxLength={4} value={f.birth_year} onChange={e => setF({ ...f, birth_year: e.target.value.replace(/\D/g, '') })} />
    <select className="input" value={f.blood_group} onChange={set('blood_group')}><option value="">Blood group (optional)</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}</select>
    <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_blood_donor} onChange={e => setF({ ...f, is_blood_donor: e.target.checked })} />I am willing to donate blood</label>
    <button className="btn">Save changes</button>{msg && <p role="status" className="text-mute">{msg}</p>}</form>)
}
