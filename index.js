
/**
 * Main Program
 */
function main() {

    // Goal 1: Display a map in the browser.

    // Get the map element from the page
    const mapElement = document.getElementById('map');

    // Initialize the map options
    // See https://leafletjs.com/reference.html#map-option for more options
    const mapOptions = {
        // Center of YHZ runways
        // Translated from https://www.openstreetmap.org/#map=19/44.887828/-63.505341
        center: [44.887828, -63.505341],
        zoom: 10,
    };

    // Create the map with the element and options constructor
    const map = L.map(mapElement, mapOptions);

    // Add the scale to the map
    L.control.scale().addTo(map);

    // Use OSM Tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Ideas to improve the map in the future
    // -   IDEA: Add pilot overlays to map
    // -   IDEA: Add drone overlays to map

    // TODO: Goal 2: Fetch real-time transit data information data from a publicly available API. (Flight data)

    // TODO: Goal 3: Filter the raw data to a subset with specific criteria.
    // Sub-goals:
    // 1.  Limit to canadian flights (arriving and/or departing)

    // TODO: Goal 4: Convert the filtered API data into GeoJSON format.


    // TODO: Goal 5: Plot markers on the map to display the current position of vehicles.
    // Sub-goals:
    // 1.  Only selected markers are plotted
    // 2.  Use custom images of planes
    // 3.  Plane is facing the correct direction (bearing)
    // 4.  Clicks show pop-up with flight information

    // TODO: Goal 6: Add functionality that will cause the map to auto refresh after a certain interval of time.

}

// Start the main program when the DOM is ready
document.addEventListener("DOMContentLoaded", () => main());
