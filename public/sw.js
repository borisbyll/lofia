// Service Worker — LOFIA. PWA
// Optimisé pour mobile + connexion lente (Togo)

const CACHE_NAME    = 'lofia-immo-v2'
const IMG_CACHE     = 'lofia-images-v2'   // cache long-terme pour images biens
const STATIC_CACHE  = 'lofia-static-v2'   // cache pour assets Next.js

// Install — skip waiting pour activation immédiate
self.addEventListener('install', event => {
  self.skipWaiting()
})

// Activate — purge tous les vieux caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => ![CACHE_NAME, IMG_CACHE, STATIC_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // ── 1. Images Supabase Storage → Cache First (long-terme)
  // Les photos de biens ne changent pratiquement pas → cache agressif
  if (
    (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.com')) &&
    url.pathname.includes('/storage/')
  ) {
    event.respondWith(cacheFirst(request, IMG_CACHE))
    return
  }

  // Ne pas intercepter les autres domaines externes (API Supabase, FedaPay…)
  if (url.origin !== self.location.origin) return

  // ── 2. Assets Next.js statiques (_next/static) → Cache First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // ── 3. Assets publics (icônes, PWA, fonts) → Cache First
  const isLocalAsset = /\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf)(\?.*)?$/.test(url.pathname)
  if (isLocalAsset) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // ── 4. Navigations HTML → Network Only (Next.js SSR gère)
  if (request.mode === 'navigate') return

  // ── 5. Tout le reste → Network Only
})

// ── Cache First : cache d'abord, réseau si absent, met en cache si nouveau
async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      // Ne pas cacher les requêtes opaques (cross-origin sans CORS)
      if (response.type !== 'opaque') {
        cache.put(request, response.clone())
      }
    }
    return response
  } catch {
    return cached || new Response('', { status: 408 })
  }
}

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.titre ?? 'LOFIA.', {
      body:    data.corps ?? '',
      icon:    '/icons/icon.svg',
      badge:   '/icons/icon-96x96.png',
      data:    { url: data.lien ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url ?? '/'))
})
