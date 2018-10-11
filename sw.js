self.importScripts('./js/libs/idb.min.js');

let dbPromise;
const STATIC_CACHE_NAME = 'mws_restaurant_cache_v1';
const URLS_TO_CACHE = [
    '/',
    '/restaurant.html',
    '/css/styles.css',
    '/js/dbhelper.js',
    '/js/main.js',
    '/js/restaurant_info.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(async function() {
        dbPromise = openDatabase();
        const cache = await caches.open(STATIC_CACHE_NAME);
        return cache.addAll(URLS_TO_CACHE);
    }());
});


self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.filter(function (cacheName) {
                    return cacheName.startsWith('mws_restaurant_') &&
                        cacheName != STATIC_CACHE_NAME;
                }).map(function (cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request).then(function (response) {
            return response || fetch(event.request);
        })
    );

    const request = event.request;
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(function (cache) {
            return fetch(request).then(function (response) {
                return cache.put(request, response);
            });
        })
    );

const openDatabase = () => {
    const dbPromise = idb.open('restaurant-reviews-store', 1, upgradeDb => {
        const store = upgradeDb.createObjectStore('restaurant-reviews', { keyPath: 'id' });
        store.createIndex('by-cuisine', 'cuisine_type')
        store.createIndex('by-neighborhood', 'neighborhood')
    });
    return dbPromise;
};
});