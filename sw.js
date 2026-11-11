const C = 'nexora-v2'
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(['/offline.html', '/manifest.webmanifest', '/icon-192.png']))); self.skipWaiting() })
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))); self.clients.claim() })
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return
  const u = new URL(r.url); if (u.origin !== location.origin || u.pathname === '/version.json') return
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { const copy = res.clone(); caches.open(C).then(c => c.put('/index.html', copy)); return res }).catch(() => caches.match('/index.html').then(m => m || caches.match('/offline.html'))))
    return
  }
  if (u.pathname.startsWith('/assets/') || /\.(png|webp|jpg|jpeg|svg|css|js|woff2?)$/.test(u.pathname)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const copy = res.clone(); caches.open(C).then(c => c.put(r, copy)); return res })))
  }
})
