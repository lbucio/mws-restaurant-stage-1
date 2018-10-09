const STATIC_CACHE_NAME = 'mws_restaurant_cache_v1';
const URLS_TO_CACHE = [
    '/',
    '/restaurant.html',
    '/css/styles.css',
    '/js/dbhelper.js',
    '/js/main.js',
    '/js/restaurant_info.js',
    '/data/restaurants.json',
];

self.addEventListener('install', (event) => {
    event.waitUntil(async function() {
        const cache = await caches.open(STATIC_CACHE_NAME);
        return cache.addAll(URLS_TO_CACHE);
    }());
});
