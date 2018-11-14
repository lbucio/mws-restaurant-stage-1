import * as L from 'leaflet';

/**
 * Common database helper functions.
 */
export class DBHelper {

    /**
   * API URL.
   * Change this to restaurants.json file location on your server.
   */
    static get API_URL() {
        const port = 1337; // Change this to your server port
        return `http://localhost:${port}`;
    }

    /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
    static get DATABASE_URL() {
        const port = 8000; // Change this to your server port
        return `http://localhost:${port}/data/restaurants.json`;
    }


    /**
   * Get the init for the fetch request
   */
    static fetchInit(method, formData = null) {
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
    }

    /**
   * Get all restaurants.
   */
    static getRestaurants() {
        const init = DBHelper.fetchInit('GET');
        const url = `${DBHelper.API_URL}/restaurants`;
        return DBHelper.makeCall(url, init);
    }

    /**
   * Get restaurant by id
   */
    static getRestaurantById(id) {
        const init = DBHelper.fetchInit('GET');
        const url = `${DBHelper.API_URL}/restaurants/${id}`;
        return DBHelper.makeCall(url, init);
    }

    /**
   * Get restaurant by id
   */
    static getReviewsForRestaurant(id) {
        const init = DBHelper.fetchInit('GET');
        const url = `${DBHelper.API_URL}/reviews/?restaurant_id=${id}`;
        return DBHelper.makeCall(url, init);
    }

    /**
   * Create review for restaurant
   */
    static postReview(formData) {
        const init = DBHelper.fetchInit('POST', formData);
        const url = `${DBHelper.API_URL}/reviews`;

        return DBHelper.makeCall(url, init);
    }

    /**
   * Update Restaurant favorite
   */
    static updateRestaurantFavoriteStatus(restaurantId, isFavorite) {
        const init = DBHelper.fetchInit('PUT');
        const url = `${DBHelper.API_URL}/restaurants/${restaurantId}/?is_favorite=${isFavorite}`;

        return DBHelper.makeCall(url, init);
    }

    /**
   * Fetch the resource
   */
    static makeCall(url, init) {
        return new Promise((resolve, reject) => {
            fetch(url, init)
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    reject('Error');
                }).then(restaurants => {
                    resolve(restaurants);
                }).catch(error => {
                    const errorMessage = (`Request failed. ${error}`);
                    reject(errorMessage);
                });
        });
    }

    /**
   * Fetch a restaurant by its ID.
   */
    static fetchRestaurantById(id) {
        const data = {
            restaurant: null,
            reviews: null,
        };
        return new Promise((resolve, reject) => {
            // fetch all restaurants with proper error handling.
            DBHelper.getRestaurantById(id).then(restaurant => {
                if (restaurant) { // Got the restaurant
                    data.restaurant = restaurant;
                    return DBHelper.getReviewsForRestaurant(id);
                } else { // Restaurant does not exist in the database
                    reject('Restaurant does not exist');
                }
            }).then(reviews => {
                if (reviews) {
                    data.reviews = reviews;
                }
                resolve(data);
            }).catch(error => {
                reject(error);
            });
        });
    }

    /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
    static fetchRestaurantByCuisine(cuisine) {
        return new Promise((resolve, reject) => {
            // Fetch all restaurants  with proper error handling
            DBHelper.getRestaurants().then(restaurants => {
                // Filter restaurants to have only given cuisine type
                const results = restaurants.filter(r => r.cuisine_type == cuisine);
                resolve(results);
            }).catch(error => {
                reject(error);
            });
        });
    }

    /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
    static fetchRestaurantByNeighborhood(neighborhood) {
        return new Promise((resolve, reject) => {
            // Fetch all restaurants
            DBHelper.getRestaurants().then(restaurants => {
                // Filter restaurants to have only given neighborhood
                const results = restaurants.filter(r => r.neighborhood == neighborhood);
                resolve(results);
            }).catch(error => {
                reject(error);
            });
        });
    }

    /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
    static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
        return new Promise((resolve, reject) => {
            // Fetch all restaurants
            DBHelper.getRestaurants().then(restaurants => {
                let results = restaurants;
                if (cuisine != 'all') { // filter by cuisine
                    results = results.filter(r => r.cuisine_type == cuisine);
                }
                if (neighborhood != 'all') { // filter by neighborhood
                    results = results.filter(r => r.neighborhood == neighborhood);
                }
                resolve(results);
            }).catch(error => {
                reject(error);
            });
        });
    }

    /**
   * Fetch all neighborhoods with proper error handling.
   */
    static fetchNeighborhoods() {
        return new Promise((resolve, reject) => {
            // Fetch all restaurants
            DBHelper.getRestaurants().then(restaurants => {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
                resolve(uniqueNeighborhoods);
            }).catch(error => {
                reject(error);
            });
        });
    }

    /**
   * Fetch all cuisines with proper error handling.
   */
    static fetchCuisines() {
        return new Promise((resolve, reject) => {
            // Fetch all restaurants
            DBHelper.getRestaurants().then(restaurants => {
                // Get all cuisines from all restaurants
                const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
                // Remove duplicates from cuisines
                const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
                resolve(uniqueCuisines);
            }).catch(error => {
                reject(error);
            });
        });
    }

    /**
   * Restaurant page URL.
   */
    static urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    }

    /**
   * Restaurant image URL.
   */
    static imageUrlForRestaurant(imageName, postfix = '', extension = 'jpg') {
        return (`/img/${imageName}${postfix}.${extension}`);
    }

    /**
   * Map marker for a restaurant.
   */
    static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
        const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
            {title: restaurant.name,
                alt: restaurant.name,
                url: DBHelper.urlForRestaurant(restaurant)
            });
        marker.addTo(map);
        return marker;
    } 
    /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}

