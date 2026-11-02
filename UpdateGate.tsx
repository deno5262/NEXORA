import { useEffect, useState } from 'react'
declare const __BUILD__: string
export default function UpdateGate() {
  const [stale, setStale] = useState(false)
  useEffect(() => {
    const check = async () => { try { const r = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' }); const j = await r.json(); if (j.v && j.v !== __BUILD__) setStale(true) } catch { /* offline or dev */ } }
    check(); const id = setInterval(check, 5 * 60 * 1000)
    const vis = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis) }
  }, [])
  const update = async () => {
    try { (await navigator.serviceWorker?.getRegistrations())?.forEach(r => r.unregister()); (await caches.keys()).forEach(k => caches.delete(k)) } catch { /* ignore */ }
    location.reload()
  }
  if (!stale) return null
  return (<div className="fixed inset-0 z-[100] grid place-items-center bg-bg p-6 text-center"><div className="flex max-w-xs flex-col items-center gap-4">
    <img src="/icon-192.png" alt="" className="h-24 w-24 rounded-3xl" /><h1 className="text-xl font-bold">Update available</h1>
    <p className="text-mute">A new version of NEXORA is ready. Please update to continue.</p><button className="btn w-full" onClick={update}>Update now</button></div></div>)
}
