// Service worker d'Ironlog. Le build préfixe ce fichier avec VERSION et ASSETS (voir vite.config.ts).
/* global VERSION, ASSETS */

const CACHE = `ironlog-${VERSION}`

self.addEventListener('install', (event) => {
  // Tout ou rien : une version n'est installée que si tous ses fichiers sont en cache.
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ironlog-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// L'app attend que l'utilisateur accepte la mise à jour, pour ne pas recharger en pleine saisie.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  // Navigation : la page d'accueil en cache, pour démarrer même sans réseau.
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./', { cacheName: CACHE }).then((r) => r ?? fetch(req)))
    return
  }

  // Fichiers du build : noms versionnés, le cache fait foi.
  event.respondWith(caches.match(req, { cacheName: CACHE }).then((r) => r ?? fetch(req)))
})
