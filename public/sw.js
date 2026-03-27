const CACHE_NAME = 'traction-v1';

// Essential assets to pre-cache during install
const PRE_CACHE_URLS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            cache.addAll(PRE_CACHE_URLS).catch(() => {
                // Pre-cache best-effort; don't block install
            })
        ).then(() => self.skipWaiting())
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

// Push Notifications
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    event.waitUntil(
        self.registration.showNotification(data.title || 'TrAction', {
            body: data.body || 'Hast du heute schon gewogen? Trag dein Gewicht ein!',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: 'traction-reminder',
            data: { url: '/' }
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            const existing = clients.find(c => c.url.includes(self.location.origin));
            if (existing) {
                return existing.focus();
            }
            return self.clients.openWindow(event.notification.data?.url || '/');
        })
    );
});
