
/**
 * LatLong - Represents coordinates based on latitude and longitude.
 */
class LatLong {
    latitude;
    longitude;

    /**
     * 
     * @param {number | number[]} latOrArray 
     * @param {number | undefined} longitude 
     * @returns 
     */
    constructor(latOrArray, longitude) {
        if (arguments.length === 1) {
            if (!Array.isArray(latOrArray) || typeof latOrArray[0] !== "number" || typeof latOrArray[1] !== "number")
                throw Error("LatLong: latLong must be a 2 item array of numbers");
            this.latitude = latOrArray[0];
            this.longitude = latOrArray[1];
        } else {
            if (typeof latOrArray !== "number" || typeof longitude !== "number")
                throw Error("LatLong: latitude and longitude must be a number");
            this.latitude = latOrArray;
            this.longitude = longitude;
        }

        return new Proxy(this, {
            get(target, prop) {
                if (prop === "0") return target.latitude;
                if (prop === "1") return target.longitude;
                return target[prop];
            }
        });
    }

    toString() {
        return `LatLong(${this.latitude}, ${this.longitude})`;
    }

    toArray() {
        return [this.latitude, this.longitude];
    }

    get lat() {
        return this.latitude;
    }

    get long() {
        return this.longitude;
    }
}


class OpenSkyNetwork {
    minBound;
    maxBound;

    constructor(minBound, maxBound) {
        if (minBound && maxBound && minBound instanceof LatLong && maxBound instanceof LatLong) {
            this.minBound = minBound;
            this.maxBound = maxBound;
        } else {
            this.minBound = null;
            this.maxBound = null;
        }
    }

    #ROOT_URL = "https://opensky-network.org/api"

    async #fetchJSON(url) {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
        return await response.json();
    }

    #getBoundingParams() {
        if (this.minBound && this.maxBound)
            return `lamin=${this.minBound.lat}&lomin=${this.minBound.long}&lamax=${this.maxBound.lat}&lomax${this.maxBound.long}`;
        else
            return "";
    }

    async fetchAllStateVectors() {
        const url = `${this.#ROOT_URL}/states/all?${this.#getBoundingParams()}`;
        const json = await this.#fetchJSON(url);
        return json;
    }
}


/**
 * Main Program
 */
async function main() {

    // Goal 1: Display a map in the browser.

    // Define map center and data collection bounding box
    const MAP_CENTER = new LatLong(44.87862, -63.50965);
    const MIN_BOUND = new LatLong(MAP_CENTER.lat - 2, MAP_CENTER.long - 3);
    const MAX_BOUND = new LatLong(MAP_CENTER.lat + 2, MAP_CENTER.long + 3);

    // Initialize the map
    // See https://leafletjs.com/reference.html#map-option for options
    const map = L.map('map', {
        center: MAP_CENTER.toArray(),
        zoom: 10,
    });

    // Add the scale bar to the map
    L.control.scale().addTo(map);

    // Use OSM Tiles
    const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Flight data bounding box
    const flightDataBoundBox = L.rectangle(
        [
            MIN_BOUND.toArray(),
            MAX_BOUND.toArray()
        ],
        {
            color: "#c0ffee",
            weight: 1,
            opacity: 1,
            fillOpacity: 0,
            interactive: false,
        }
    ).addTo(map);

    // MARKER: Halifax Airport (YHZ)
    const hfxAirportMarker = L.marker(MAP_CENTER.toArray())
        .bindPopup("<strong>Halifax Stanfield International Airport</strong><br/>ICAO: CYHZ<br/>IATA: YHZ")
        .addTo(map);

    // Add layer controls
    const layerControl = L.control.layers(
        // Base maps
        {
            "OpenStreetMap": osm
        },
        // Overlay maps
        {
            "Airport marker": hfxAirportMarker,
            "Flight data bounding box": flightDataBoundBox
        }).addTo(map);

    // Ideas to improve the map in the future
    // -   IDEA: Add pilot overlays to map
    // -   IDEA: Add drone overlays to map

    // TODO: Goal 2: Fetch real-time transit data information data from a publicly available API. (Flight data)
    // API Docs: https://openskynetwork.github.io/opensky-api/rest.html
    const osn = new OpenSkyNetwork(MIN_BOUND, MAX_BOUND);
    console.log(await osn.fetchAllStateVectors());

    // TODO: Goal 3: Filter the raw data to a subset with specific criteria.
    // Sub-goals:
    // 1.  Limit to flights originating from Canada

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
