import { createClient } from '@supabase/supabase-js'
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://elevphxcpixaqwsemgkd.supabase.co'
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZXZwaHhjcGl4YXF3c2VtZ2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NzE5NTQsImV4cCI6MjEwOTE0Nzk1NH0.4idnLgEYSVrmCuvJVPtQUWURAbv_C-XZ4Gf10gACpvM'
export const configured = Boolean(url && key)
export const supabase = createClient(url || 'http://localhost', key || 'missing')
export type Profile = { cover_url?: string | null; tagline?: string | null; is_blood_donor?: boolean; blood_group?: string | null; id: string; username: string; full_name: string; bio: string | null; location: string | null; avatar_url: string | null; level: string; xp: number }
export const THEMES = [['neon_cyan','Neon Cyan'],['cyber_purple','Cyber Purple'],['toxic_green','Toxic Green'],['crimson','Crimson'],['ice_blue','Ice Blue'],['comfortable_dark','Comfortable Dark'],['pure_white','White'],['full_black','Full Black'],['sunset_orange','Sunset Orange'],['royal_gold','Royal Gold'],['rose_pink','Rose Pink']] as const
