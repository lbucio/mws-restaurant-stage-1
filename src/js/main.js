import { DBHelper } from './dbhelper.js';
import * as L from 'leaflet';
import '../css/styles.css';

let restaurants,
    neighborhoods,
    cuisines;
var newMap;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    initMap(); // added 
    getRestuarants();
});

window.addEventListener('load', () => {
    registerServiceWorker();
});

const getRestuarants = () => {
    DBHelper.getRestaurants()
        .then(restaurants => {
        setNeighborhoodsFromRestaurants(restaurants);
        setCuisinesFromRestaurants(restaurants);
        })
        .catch(error => {
        // Got an error!
        console.error(error);
    });
};

const setNeighborhoodsFromRestaurants = (data) => {
    // Get all neighborhoods from all restaurants
    const neighborhoods = data.map((v, i) => data[i].neighborhood);
    // Remove duplicates from neighborhoods
    const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
    self.neighborhoods = uniqueNeighborhoods;
    fillNeighborhoodsHTML(uniqueNeighborhoods);
};

const setCuisinesFromRestaurants = (data) => {
    const cuisines = data.map((v, i) => data[i].cuisine_type);
    // Remove duplicates from cuisines
    const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
    self.cuisines = uniqueCuisines;
    fillCuisinesHTML(uniqueCuisines);
};


/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
    DBHelper.fetchNeighborhoods().then(neighborhoods => {
        self.neighborhoods = neighborhoods;
        fillNeighborhoodsHTML();
    }).catch(error => {
        // Got an error!
        console.error(error);
    });
};

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
    const select = document.getElementById('neighborhoods-select');
    neighborhoods.forEach(neighborhood => {
        const option = document.createElement('option');
        option.innerHTML = neighborhood;
        option.value = neighborhood;
        select.append(option);
    });
};

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
    DBHelper.fetchCuisines().then(cuisines => {
        self.cuisines = cuisines;
        fillCuisinesHTML();
    }).catch(error => {
    // Got an error!
        console.error(error);
    });
};

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
    const select = document.getElementById('cuisines-select');

    cuisines.forEach(cuisine => {
        const option = document.createElement('option');
        option.innerHTML = cuisine;
        option.value = cuisine;
        select.append(option);
    });
};

/**
 * Initialize leaflet map, called from HTML.
 */
const initMap = () => {
    newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
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

    updateRestaurants();
};
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
    const cSelect = document.getElementById('cuisines-select');
    const nSelect = document.getElementById('neighborhoods-select');

    const cIndex = cSelect.selectedIndex;
    const nIndex = nSelect.selectedIndex;

    const cuisine = cSelect[cIndex].value;
    const neighborhood = nSelect[nIndex].value;

    DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood).then(restaurants => {
        resetRestaurants(restaurants);
        fillRestaurantsHTML();
    }).catch(error => {
        // Got an error!
        console.error(error);
    });
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
    // Remove all restaurants
    self.restaurants = [];
    const ul = document.getElementById('restaurants-list');
    ul.innerHTML = '';

    // Remove all map markers
    if (self.markers) {
        self.markers.forEach(marker => marker.remove());
    }
    self.markers = [];
    self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
    const ul = document.getElementById('restaurants-list');
    restaurants.forEach(restaurant => {
        ul.append(createRestaurantHTML(restaurant));
    });
    addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
    const li = document.createElement('li');
    li.className = 'card';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';

    let imageName = 'no-image';
    if (restaurant.photograph) {
        imageName = restaurant.photograph.split('.')[0];
    }
  
    const picture = document.createElement('picture');

    const source = document.createElement('source');
    source.media = '(min-width: 1650px)';
    source.srcset = DBHelper.imageUrlForRestaurant(imageName);
    picture.append(source);

    const source400 = document.createElement('source');
    source400.srcset = `${DBHelper.imageUrlForRestaurant(imageName, '-400w')}, ${DBHelper.imageUrlForRestaurant(imageName, '-400w@2x')} 2x`;
    picture.append(source400);

    const image = document.createElement('img');
    image.className = 'restaurant-img';
    image.src = DBHelper.imageUrlForRestaurant(imageName);
    image.alt = restaurant.name;

    picture.append(image);
    cardHeader.append(picture);
    li.append(cardHeader);

    const content = document.createElement('div');
    content.className = 'card-content';

    const name = document.createElement('h2');
    name.innerHTML = restaurant.name;
    content.append(name);

    const neighborhood = document.createElement('p');
    neighborhood.innerHTML = restaurant.neighborhood;
    content.append(neighborhood);

    const address = document.createElement('p');
    address.innerHTML = restaurant.address;
    content.append(address);

    li.append(content);

    const more = document.createElement('a');
    more.innerHTML = 'View Details';
    more.href = DBHelper.urlForRestaurant(restaurant);
    li.append(more);

    return li;
};

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
    restaurants.forEach(restaurant => {
    // Add marker to the map
        const marker = DBHelper.mapMarkerForRestaurant(restaurant, newMap);
        marker.on('click', onClick);
        function onClick() {
            window.location.href = marker.options.url;
        }
        self.markers.push(marker);
    });

}; 
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */

const registerServiceWorker = () => {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    navigator.serviceWorker.register('../sw.js')
        .then( registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, err => {
            console.log('ServiceWorker registration failed: ', err);
        });
};