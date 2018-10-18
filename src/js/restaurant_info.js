import { DBHelper } from './dbhelper.js';
import * as L from 'leaflet';

let currentRestaurant;
let newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {  
    initMap();
});

window.addEventListener('load', () => {
    registerServiceWorker();
});

/**
 * Initialize leaflet map
 */
const initMap = () => {
    fetchRestaurantFromURL()
        .then(restaurant => {
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
        DBHelper.fetchRestaurantById(id).then(restaurant => {
                currentRestaurant = restaurant;
            fillRestaurantHTML();
                resolve(restaurant);
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

    let imageName = 'no-image';
    if (restaurant.photograph) {
        imageName = restaurant.photograph.split('.')[0];
    }
    const picture = document.getElementById('restaurant-picture');

    const source400 = document.createElement('source');
    source400.srcset = `${DBHelper.imageUrlForRestaurant(imageName, '-400w')}, ${DBHelper.imageUrlForRestaurant(imageName, '-400w@2x')} 2x`;
    picture.prepend(source400);

    const source = document.createElement('source');
    source.media = '(min-width: 1650px)';
    source.srcset = DBHelper.imageUrlForRestaurant(imageName);
    picture.prepend(source);


    const image = document.getElementById('restaurant-img');

    image.className = 'restaurant-img';
    image.alt = restaurant.name;
    image.src = DBHelper.imageUrlForRestaurant(imageName);

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = restaurant.cuisine_type;

    // fill operating hours
    if (restaurant.operating_hours) {
        fillRestaurantHoursHTML();
    }
    // fill reviews
    fillReviewsHTML();
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
const fillReviewsHTML = (reviews = currentRestaurant.reviews) => {
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
    date.innerHTML = review.date;
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
        }, err => {
            console.log('ServiceWorker registration failed: ', err);
        });
};