import idb from 'idb';

let dbPromise;
const STATIC_CACHE_NAME = 'mws_restaurant_cache_v1';
const URLS_TO_CACHE = [
    '/',
    '/restaurant.html',
    '/css/styles.css',
    '/js/main.js',
    '/js/restaurant_info.js',
    '/img/icons/icons-192.png',
    '/img/icons/icons-512.png',
    '/manifest.json',
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
    const request = event.request;
    const requestURL = new URL(request.url);

    // Don't cache map tiles
    if (requestURL.origin.includes('api.tiles.mapbox')) {
        return fetch(request);
    }

    // Fix issue for restaurant html thinking they are all different pages because of params
    if (requestURL.pathname.startsWith('/restaurant.html')) {
        return event.respondWith(caches.match('/restaurant.html'));
    }

    const isJsonRequest = request.headers.has('Accept') ? request.headers.get('Accept') === 'application/json' : false;

    if (isJsonRequest && request.url.match(/(\/restaurants\/\d)/g) !== null) {
        event.respondWith(
            fetch(request).then(function (response) {
                saveRestaurant(response.clone());
                return response;
            }).catch(_ => {
                const string = '/restaurants/';
                const index = request.url.indexOf(string);
                const id = Number(request.url.slice(index + string.length));
                return getRestaurant(id);
            })
        );
    } else if (isJsonRequest && request.url.includes('/restaurants')) {
        event.respondWith(
            fetch(request).then(function (response) {
                saveRestaurants(response.clone());
                return response;
            }).catch(_ => {
                return getRestaurants();
            })
        );
    } else if (isJsonRequest && request.url.includes('/reviews/?restaurant_id=')) {
        event.respondWith(
            fetch(request).then(function (response) {
                saveReviews(response.clone());
                return response;
            }).catch(_ => {
                const string = '/reviews/?restaurant_id=';
                const index = request.url.indexOf(string);
                const id = Number(request.url.slice(index + string.length));
                return getReviews(id);
            })
        );
    } 

    if (!isJsonRequest)
    {
        event.respondWith(
            caches.match(event.request).then(function (response) {
                return response || fetch(request);
            })
        );

        event.waitUntil(
            caches.open(STATIC_CACHE_NAME).then(function (cache) {
                return fetch(request).then(function (response) {
                    return cache.put(request, response);
                });
            })
        );
    }

});

self.addEventListener('sync', event => {
    if (event.tag === 'sync-reviews') {
        event.waitUntil(
            syncReviews().then(response => {
                clearOfflineReviews();
            })
        );
    }
});

const openDatabase = () => {
    const dbPromise = idb.open('restaurant-reviews-store', 3, upgradeDb => {
        switch(upgradeDb.oldVersion) {
            case 0:
                const store = upgradeDb.createObjectStore('restaurant-reviews', { keyPath: 'id' });
                store.createIndex('by-cuisine', 'cuisine_type');
                store.createIndex('by-neighborhood', 'neighborhood');
            case 1:
                const reviewStore = upgradeDb.createObjectStore('reviews', { keyPath: 'id' });
                reviewStore.createIndex('restaurant_id', 'restaurant_id');
            case 2:
                const offlineReviewStore = upgradeDb.createObjectStore('offlineReviews', { keyPath: 'id', autoIncrement: true });
                offlineReviewStore.createIndex('restaurant_id', 'restaurant_id');
        }
    });
    return dbPromise;
};

const getRestaurantStore = async () => {
    const db = await dbPromise;
    if (!db) {
        return Promise.resolve(null);
    }

    const transaction = db.transaction('restaurant-reviews', 'readwrite');
    return transaction.objectStore('restaurant-reviews');
};

const saveRestaurant = async (response) => {
    const restaurant = await response.json();
    const store = await getRestaurantStore();
    store.put(restaurant);
};

const saveRestaurants = async (response) => {
    const restaurants = await response.json();
    const store = await getRestaurantStore();
    restaurants.forEach(restaurant => {
        store.put(restaurant);
    });
};

const getRestaurants = async () => {
    const store = await getRestaurantStore();
    const restaurants = await store.getAll();
    const restaurantsJson = JSON.stringify(restaurants);
    return new Response(restaurantsJson);
};

const getRestaurant = async (id) => {
    const store = await getRestaurantStore();
    const restaurant = await store.get(id);
    const restaurantJson = JSON.stringify(restaurant);
    return new Response(restaurantJson);
};

const syncReviews = () => {
    return new Promise((resolve, reject) => {
        console.log('Hello from sync 2');
        resolve('hello');
    });
};