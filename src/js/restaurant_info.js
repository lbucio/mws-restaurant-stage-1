import idb from 'idb';
import { DBHelper } from './dbhelper.js';
import * as L from 'leaflet';

let currentRestaurant;
let currentReviews;
let newMap;
let reviewsForm;
let connectionStatusTimeoutId;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {  
    initMap();
});

window.addEventListener('load', () => {
    reviewsForm = document.querySelector('#reviews-form');
    registerServiceWorker();

    isOnline();
window.addEventListener('online', isOnline);
window.addEventListener('offline', isOnline);
});

/**
 * Initialize leaflet map
 */
const initMap = () => {
    fetchRestaurantFromURL()
        .then(({restaurant, reviews }) => {
            newMap = L.map('map', {
                center: [restaurant.latlng.lat, restaurant.latlng.lng],
                zoom: 16,
                scrollWheelZoom: false
            });

            L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
                mapboxToken: 'pk.eyJ1IjoibGFyczQiLCJhIjoiY2ppeGUybmZrMHAxeDNxbjNocDY4dndybiJ9.tGzAhqkV-7kQNBGsxb_ktQ',
                maxZoom: 18,
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                    '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                    'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
                id: 'mapbox.streets'
            }).addTo(newMap);
            fillBreadcrumb();
            fillForm();
            DBHelper.mapMarkerForRestaurant(restaurant, newMap);
        })
        .catch(error => {
            console.error(error);
        });
};  

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = () => {
    return new Promise((resolve, reject) => {
        // restaurant already fetched!
        if (currentRestaurant) {
            resolve(currentRestaurant);
        }

        const id = getParameterByName('id');
        // no id found in URL
        if (!id) {
            reject('No restaurant id in URL');
        } else {
            DBHelper.fetchRestaurantById(id).then(data => {
                currentRestaurant = data.restaurant;
                currentReviews = data.reviews;
                fillRestaurantHTML(currentRestaurant);
                resolve(data);
            }).catch(error => {
                console.error(error);
                reject(error);
            });
        }
    });
};

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = currentRestaurant) => {
    const name = document.getElementById('restaurant-name');
    name.innerHTML = restaurant.name;

    const address = document.getElementById('restaurant-address');
    address.innerHTML = restaurant.address;

    const picture = document.getElementById('restaurant-picture');

    const sources = getPictureSources(restaurant);
    picture.append(...sources);

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = restaurant.cuisine_type;

    // fill operating hours
    if (restaurant.operating_hours) {
        fillRestaurantHoursHTML();
    }
    // fill reviews
    fillReviewsHTML();
};

const getPictureSources = (restaurant) => {
    const sources = [];

    let imageName = 'no-image';
    if (restaurant.photograph) {
        imageName = restaurant.photograph.split('.')[0];
    }

    const source = document.createElement('source');
    source.media = '(min-width: 1650px)';
    source.srcset = DBHelper.imageUrlForRestaurant(imageName);
    sources.push(source);

    const source400 = document.createElement('source');
    source400.srcset = `${DBHelper.imageUrlForRestaurant(imageName, '-400w')}, ${DBHelper.imageUrlForRestaurant(imageName, '-400w@2x')} 2x`;
    sources.push(source400);

    const image = document.createElement('img');

    image.className = 'restaurant-img';
    image.alt = restaurant.name;
    image.src = DBHelper.imageUrlForRestaurant(imageName);
    sources.push(image);
    
    return sources;
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = currentRestaurant.operating_hours) => {
    const hours = document.getElementById('restaurant-hours');
    for (let key in operatingHours) {
        const row = document.createElement('tr');

        const day = document.createElement('td');
        day.innerHTML = key;
        row.appendChild(day);

        const time = document.createElement('td');
        time.innerHTML = operatingHours[key];
        row.appendChild(time);

        hours.appendChild(row);
    }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = currentReviews) => {
    const container = document.getElementById('reviews-container');
    const title = document.createElement('h3');
    title.innerHTML = 'Reviews';
    container.appendChild(title);

    if (!reviews) {
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet!';
        container.appendChild(noReviews);
        return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
        ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
    const li = document.createElement('li');
    const name = document.createElement('p');
    name.innerHTML = review.name;
    li.appendChild(name);

    const date = document.createElement('p');
    let reviewDate = new Date();
    if (review.createdAt) {
        reviewDate = new Date(review.createdAt);
    }
    
    date.innerHTML = `${reviewDate.getMonth()}/${reviewDate.getFullYear()}`;
    li.appendChild(date);

    const rating = document.createElement('p');
    rating.innerHTML = `Rating: ${review.rating}`;
    li.appendChild(rating);

    const comments = document.createElement('p');
    comments.innerHTML = review.comments;
    li.appendChild(comments);

    return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant = currentRestaurant) => {
    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.innerHTML = restaurant.name;
    a.setAttribute('aria-current', 'page');
    a.href = window.location.href;
    li.appendChild(a);
    breadcrumb.appendChild(li);
};

/**
 * Set restaurant id to reviews form
 */
const fillForm = (restaurant = currentRestaurant) => {
    const restaurantIdHiddenInput = document.querySelector("input[name='restaurant_id'");
    restaurantIdHiddenInput.value = restaurant.id;
};

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
    if (!url)
        url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
        results = regex.exec(url);
    if (!results)
        return null;
    if (!results[2])
        return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

const registerServiceWorker = () => {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    navigator.serviceWorker.register('../sw.js')
        .then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
            reviewsForm.addEventListener('submit', (event) => {
                syncRestaurantReview(event, registration);
            });
            // return registration.sync.register('sync-reviews');            
        }, err => {
            console.log('ServiceWorker registration failed: ', err);
        });
};

// const submitRestaurantReview = (event) => {
//     event.preventDefault();
//     const form = document.forms.namedItem('review-form');
//     const formData = new FormData(form);
//     DBHelper.postReview(formData).then(response => {
//         clearForm(form);
//         addReview(response);
//     });
// };

const syncRestaurantReview = (event, registration) => {
    event.preventDefault();
    console.log('Here!!!');
    const form = document.forms.namedItem('review-form');
    const formData = new FormData(form);
    clearForm(form);
    addReview(formData, registration);
};

const clearForm = (form) => {
    form.reset();
};

const addReview = (formData, registration) => {

    // If can't do a background sync just make the call
    if (!window.SyncManager || !navigator.serviceWorker) {
        DBHelper.postReview(formData).then(response => {
            addReviewHTML(response);
        });
    }

    return openDatabase().then(db => {
        const transaction = db.transaction('offlineReviews', 'readwrite');
        const offlineReviewStore = transaction.objectStore('offlineReviews');
        
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        offlineReviewStore.add({ restaurant_id: data.restaurant_id, data });
        return transaction.complete;
    }).then(() => {
        // register background sync if transaction was successful
        console.log('review saved to iDB successfully!');
        return registration.sync.register('sync-reviews');
    }).catch(err => {
        return DBHelper.postReview(formData).then(response => {
            addReviewHTML(response);
        });
    });
};

const addReviewHTML = (review) => {
    const reviewHTML = createReviewHTML(review);
    const ul = document.getElementById('reviews-list');
    ul.appendChild(reviewHTML);
};

const openDatabase = () => {
    const dbPromise = idb.open('restaurant-reviews-store', 3, upgradeDb => {
        switch (upgradeDb.oldVersion) {
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

const isOnline = () => {
    var connectionStatus = document.querySelector('#connection-status');

    if (navigator.onLine) {
        if (!connectionStatus.classList.contains('offline')) {
            return;
        }
        connectionStatus.innerHTML = 'You are back online';
        connectionStatus.classList.remove('offline');
        connectionStatus.classList.add('online');
        connectionStatusTimeoutId = window.setTimeout(_ => {
        connectionStatus.innerHTML = '';
        }, 1500);
    } else {
        if (connectionStatusTimeoutId) {
            window.clearTimeout(connectionStatusTimeoutId);
            connectionStatusTimeoutId = null;
        }
        connectionStatus.innerHTML = 'You are currently offline. Any requests made will be queued and synced as soon as you are connected again.';
        connectionStatus.classList.remove('online');
        connectionStatus.classList.add('offline');
    }
}