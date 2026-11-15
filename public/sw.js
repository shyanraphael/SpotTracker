// App-shell cache. Only same-origin GETs are handled; Spotify/LRCLIB requests are cross-origin and pass through untouched.
const CACHE = 'tracker-v2'
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/favicon.svg']
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())) })
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return
  if (req.mode === 'navigate') {
    // network first so OAuth redirects (?code=) and updates always work; fall back to cached shell offline
    e.respondWith(fetch(req).catch(() => caches.match('/')))
    return
  }
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) } return r }).catch(() => hit)
    return hit || net
  }))
})
