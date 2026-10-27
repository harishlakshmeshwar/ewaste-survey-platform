/*
 * Service worker for the MSRIT E-Waste Survey PWA.
 *
 * Policy:
 *  - /api/* is NEVER cached: live survey results must not be served stale.
 *    Offline, API calls fail cleanly and the UI shows its error/retry states.
 *  - Navigations are network-first with a cached app-shell fallback.
 *  - Static assets are cache-first (Vite hashes filenames per build).
 *  - All paths are relative to the SW location so the app works both at the
 *    domain root and under a subpath (GitHub Pages project hosting).
 */
const CACHE = 'ewaste-shell-v2'

const SHELL = [
  './',
  './manifest.webmanifest',
  './images/icon-192.png',
  './images/icon-512.png',
  './images/msrit-ewaste-banner.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Never intercept API calls — no caching of survey data, ever.
  if (url.pathname.startsWith('/api/')) return

  // Page navigations: network first, fall back to the cached shell offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('./', copy)).catch(() => {})
          return response
        })
        .catch(() => caches.match('./').then((cached) => cached || Response.error())),
    )
    return
  }

  // Static assets: cache first, fill from network.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.ok && (response.type === 'basic' || response.type === 'default')) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {})
          }
          return response
        })
      }),
    )
  }
})
