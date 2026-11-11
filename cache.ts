const P = 'nx:'
export function cacheGet<T>(k: string): T | null { try { const v = localStorage.getItem(P + k); return v ? (JSON.parse(v) as T) : null } catch { return null } }
export function cacheSet(k: string, v: unknown) { try { localStorage.setItem(P + k, JSON.stringify(v)) } catch { /* storage full: skip caching */ } }
