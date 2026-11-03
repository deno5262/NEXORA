import { createClient } from '@supabase/supabase-js'
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://elevphxcpixaqwsemgkd.supabase.co'
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZXZwaHhjcGl4YXF3c2VtZ2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NzE5NTQsImV4cCI6MjEwOTE0Nzk1NH0.4idnLgEYSVrmCuvJVPtQUWURAbv_C-XZ4Gf10gACpvM'
export const configured = Boolean(url && key)
export const supabase = createClient(url || 'http://localhost', key || 'missing')
export type Profile = { quick_reaction?: string; country?: string | null; relationship_status?: string | null; living_in?: string | null; hometown?: string | null; education?: string | null; work?: string | null; birth_year?: number | null; lat?: number | null; lng?: number | null; cover_url?: string | null; tagline?: string | null; is_blood_donor?: boolean; blood_group?: string | null; id: string; username: string; full_name: string; bio: string | null; location: string | null; avatar_url: string | null; level: string; xp: number }
export const THEMES = [['comfortable_dark','Comfort Dark'],['pure_dark','Pure Dark'],['full_black','Pure Black (AMOLED)'],['light_green','Light (White & Green)'],['midnight_blue','Midnight Blue'],['royal_purple','Royal Purple'],['crimson_red','Crimson Red'],['neon_cyan','Neon Cyan'],['cyber_purple','Cyber Purple'],['toxic_green','Toxic Green'],['crimson','Crimson'],['ice_blue','Ice Blue'],['pure_white','White'],['sunset_orange','Sunset Orange'],['royal_gold','Royal Gold'],['rose_pink','Rose Pink']] as const
export const THEME_COLORS: Record<string, [string, string, string]> = {
  neon_cyan: ['#0b0f14', '#00e5ff', '#e6edf3'], cyber_purple: ['#0d0a14', '#b36bff', '#e6edf3'], toxic_green: ['#09100b', '#39ff6a', '#e6edf3'],
  crimson: ['#120a0c', '#ff3b5c', '#e6edf3'], ice_blue: ['#0a0f16', '#7cc4ff', '#e6edf3'], comfortable_dark: ['#17181b', '#8fa8a0', '#cfd2d6'],
  pure_white: ['#ffffff', '#0a66ff', '#111827'], full_black: ['#000000', '#e8e8e8', '#f2f2f2'], sunset_orange: ['#130c07', '#ff8a3d', '#f5ece4'],
  royal_gold: ['#0e0c07', '#f5c542', '#f6f0dc'], rose_pink: ['#130a10', '#ff6fb5', '#f8e9f1'] }
Object.assign(THEME_COLORS, { light_green: ['#f4faf6', '#16a34a', '#0f766e'], pure_dark: ['#0d0d10', '#7c9cff', '#c084fc'], midnight_blue: ['#070d1f', '#3b82f6', '#22d3ee'], royal_purple: ['#0f0a1e', '#8b5cf6', '#f472b6'], crimson_red: ['#120709', '#e11d48', '#fb923c'] })
