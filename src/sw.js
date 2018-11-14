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
                clearStore('offline-reviews');
            })
        );
    } else if (event.tag === 'sync-favorites') {
        event.waitUntil(
            syncFavorites().then(response => {
                clearStore('offline-favorites');
            })
        );
    }
});

const openDatabase = () => {
    const dbPromise = idb.open('restaurant-reviews-store', 4, upgradeDb => {
        switch(upgradeDb.oldVersion) {
            case 0:
                const store = upgradeDb.createObjectStore('restaurant-reviews', { keyPath: 'id' });
                store.createIndex('by-cuisine', 'cuisine_type');
                store.createIndex('by-neighborhood', 'neighborhood');
            case 1:
                const reviewStore = upgradeDb.createObjectStore('reviews', { keyPath: 'id' });
                reviewStore.createIndex('restaurant_id', 'restaurant_id');
            case 2:
                const offlineReviewStore = upgradeDb.createObjectStore('offline-reviews', { keyPath: 'id', autoIncrement: true });
                offlineReviewStore.createIndex('restaurant_id', 'restaurant_id');
            case 3:
                const offlineFavoritesStore = upgradeDb.createObjectStore('offline-favorites', { keyPath: 'id', autoIncrement: true });
                offlineFavoritesStore.createIndex('restaurant_id', 'restaurant_id');
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

const getReviewsStore = async () => {
    const db = await dbPromise;
    if (!db) {
        return Promise.resolve(null);
    }

    const transaction = db.transaction('reviews', 'readwrite');
    return transaction.objectStore('reviews');
};

const getOfflineReviewsStore = async () => {
    const db = await dbPromise;
    if (!db) {
        return Promise.resolve(null);
    }

    const transaction = db.transaction('offline-reviews', 'readwrite');
    return transaction.objectStore('offline-reviews');
};

const getOfflineFavoritesStore = async () => {
    const db = await dbPromise;
    if (!db) {
        return Promise.resolve(null);
    }

    const transaction = db.transaction('offline-favorites', 'readwrite');
    return transaction.objectStore('offline-favorites');
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

const saveReviews = async (response) => {
    const reviews = await response.json();
    const store = await getReviewsStore();
    reviews.forEach(review => {
        store.put(review);
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

const getReviews = async (id) => {
    const store = await getReviewsStore();
    const reviews = await store.getAll();
    const filteredReviews = reviews.filter(review => review.restaurant_id == id);
    const reviewsJson = JSON.stringify(filteredReviews);
    return new Response(reviewsJson);
};

const syncReviews = () => {
    return getOfflineReviewsStore().then(store => {
        return store.getAll().then(reviews => {
            return Promise.all(reviews.map(review => {
                const port = 1337; // Change this to your server port
                const url = `http://localhost:${port}/reviews`;
                const formData = new FormData();
                const data = review.data;
                
                formData.set('name', data.name);
                formData.set('comments', data.comments);
                formData.set('rating', Number(data.rating));
                formData.set('restaurant_id', Number(data.restaurant_id));

                const init = fetchInit('POST', formData);
                return fetch(url, init);
            }));
        });
    });
};

const syncFavorites = () => {
    return getOfflineFavoritesStore().then(store => {
        return store.getAll().then(favorites => {
            return Promise.all(favorites.map(favorite => {
                const port = 1337; // Change this to your server port
                const url = `http://localhost:${port}/restaurants/${favorite.restaurant_id}/?is_favorite=${favorite.is_favorite}`;
                const init = fetchInit('PUT');
                return fetch(url, init);
            }));
        });
    });
};

const fetchInit = (method, formData = null) => {
    const headers = new Headers();

    headers.append('Accept', 'application/json');
    const init = {
        headers,
        method
    };

    if (formData) {
        init.body = formData;
    }

    return init;
};

const clearStore = async (store) => {
    const db = await dbPromise;
    if (!db) {
        return Promise.resolve(null);
    }

    const transaction = db.transaction(store, 'readwrite');
    const objectStore = await transaction.objectStore(store);
    objectStore.clear();
};