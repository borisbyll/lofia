// Service Worker — LOFIA. PWA
const CACHE_NAME = 'lofia-immo-v1'

// Install
self.addEventListener('install', event => {
  self.skipWaiting()
})

// Activate — purge vieux caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — Network first pour assets statiques seulement
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Ne pas intercepter :
  // - Domaines externes (Supabase, FedaPay, Google Fonts…)
  if (url.origin !== self.location.origin) return
  // - Routes Next.js internes
  if (url.pathname.startsWith('/_next/')) return
  if (url.pathname.startsWith('/api/')) return
  // - Navigations HTML (App Router gère lui-même le routing)
  if (request.mode === 'navigate') return
  // - Requêtes non-GET
  if (request.method !== 'GET') return

  // Network first avec fallback cache pour assets statiques (images, polices, icons)
  const isStaticAsset = /\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf|css|js)(\?.*)?$/.test(url.pathname)
  if (!isStaticAsset) return

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const cloned = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, cloned))
        }
        return response
      })
      .catch(() => caches.match(request).then(cached => cached || Response.error()))
  )
})

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.titre ?? 'LOFIA.', {
      body: data.corps ?? '',
      icon: '/icons/icon.svg',
      data: { url: data.lien ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url ?? '/')
  )
})
