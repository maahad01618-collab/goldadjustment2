// GoldAdjustment Service Worker
const CACHE_NAME = 'goldadjustment-v3';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Install — cache app shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL).catch(err => console.warn('Cache addAll error:', err)))
            .then(() => self.skipWaiting())
    );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch — network-first for HTML, cache-first for assets
self.addEventListener('fetch', event => {
    const req = event.request;
    const url = new URL(req.url);

    if (req.method !== 'GET') return;
    if (url.origin !== location.origin) return;

    // HTML — network first, fallback cache
    if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(req)
                .then(res => {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(req, copy));
                    return res;
                })
                .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
        );
        return;
    }

    // Other assets — cache first
    event.respondWith(
        caches.match(req).then(cached => {
            if (cached) return cached;
            return fetch(req).then(res => {
                const copy = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(req, copy));
                return res;
            }).catch(() => cached);
        })
    );
});
