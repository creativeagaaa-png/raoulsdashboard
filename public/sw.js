const CACHE_NAME = 'health-os-v7';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // Never cache Supabase API/storage requests — always fetch fresh data
    const url = event.request.url;
    if (url.includes('supabase.co')) return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// Allow the app to clear the cache via postMessage
self.addEventListener('message', (event) => {
    if (event.data === 'CLEAR_CACHE') {
        caches.keys().then(keys =>
            Promise.all(keys.map(k => caches.delete(k)))
        );
    }
});
