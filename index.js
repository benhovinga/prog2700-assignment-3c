
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
        console.debug(`Making fetch request to URL: ${url}`);
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
        return await response.json();
    }

    #getBoundingBoxURLParams() {
        if (this.minBound && this.maxBound)
            return `lamin=${this.minBound.lat}&lomin=${this.minBound.long}&lamax=${this.maxBound.lat}&lomax=${this.maxBound.long}`;
        else
            return "";
    }

    async fetchAllStateVectors() {
        const url = `${this.#ROOT_URL}/states/all?${this.#getBoundingBoxURLParams()}`;
        const {time, states} = await this.#fetchJSON(url);
        return {
            time,
            states: Array(...states).map(vectors => {
                return {
                    icao24: String(vectors[0]),
                    callsign: String(vectors[1]),
                    originCountry: String(vectors[2]),
                    timePosition: Number(vectors[3]),
                    lastContact: Number(vectors[4]),
                    longitude: Number(vectors[5]),
                    latitude: Number(vectors[6]),
                    baroAltitude: (vectors[7]),
                    onGround: Boolean(vectors[8]),
                    velocity: Number(vectors[9]),
                    trueTrack: Number(vectors[10]),
                    verticalRate: Number(vectors[11]),
                    sensors: vectors[12] ? Array(vectors[12]).map(i => Number(i)) : null,
                    geoAltitude: Number(vectors[13]),
                    squawk: String(vectors[14]),
                    spi: Boolean(vectors[15]),
                    positionSource: Number(vectors[16]),
                    category: vectors[17] ? Number(vectors[17]) : null,
                }
            }),
        };
    }
}

/**
 * Main Program
 */
async function main() {

    // Goal 1: Display a map in the browser.

    // Center map on Halifax Stanfield International Airport (YHZ)
    const MAP_CENTER = new LatLong(44.87862, -63.50965);

    // Bounding box around most of mainland Nova Scotia, Canada.
    const MIN_BOUND = new LatLong(MAP_CENTER.lat - 1.5, MAP_CENTER.long - 2.5);
    const MAX_BOUND = new LatLong(MAP_CENTER.lat + 1, MAP_CENTER.long + 2.5);

    // Debug
    console.debug(`MAP_CENTER=${MAP_CENTER}`);
    console.debug(`MIN_BOUND=${MIN_BOUND}`);
    console.debug(`MAX_BOUND=${MAX_BOUND}`);

    // Initialize the map
    const map = L.map('map', {
        // See https://leafletjs.com/reference.html#map-option for more options
        center: MAP_CENTER.toArray(),
        zoom: 8,
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

    // Goal 2: Fetch real-time transit data information data from a publicly available API.
    const osn = new OpenSkyNetwork(MIN_BOUND, MAX_BOUND);
    const {time, states} = await osn.fetchAllStateVectors();
    console.log(`Fetched ${states.length} states.`);


    // Goal 3: Filter the raw data to a subset with specific criteria.
    // const canadianOrigin = states.filter(state => state.originCountry === "Canada");
    const canadianOrigin = states.filter(state => state);
    console.log(`Reduced to ${canadianOrigin.length} states.`);
    console.log(canadianOrigin);

    // Goal 4: Convert the filtered API data into GeoJSON format.
    const geojsonFeatures = canadianOrigin.map(state => {
        return {
            "type": "Feature",
            "properties": state,
            "geometry": {
                "type": "Point",
                "coordinates": [state.longitude, state.latitude]
            }
        };
    });
    console.debug(geojsonFeatures);

    // Goal 5: Plot markers on the map to display the current position of vehicles.

    function getPlaneInfo(plane) {
        let output = "";
        output += `<h4>${plane.callsign || "unknown"}</h4>`;
        output += "<table><tr><th>Property</th><th>Value</th></tr>";
        Object.entries(plane).forEach(([key, value]) => {
            output += `<tr><td>${key}</td><td>${value}</td></tr>`;
        })
        output += "</table>";
        return output;
    }

    const planeIcon = L.icon({
        iconUrl: "plane2.png",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    })

    L.geoJSON(geojsonFeatures, {
        pointToLayer: function (feature, latlng) {
            console.log(feature)
            console.log(latlng)
            return L.marker(latlng, {
                icon: planeIcon,
                rotationAngle: feature.properties.trueTrack,
            });
        },
        onEachFeature: (feature, layer) => {
            layer.bindPopup(getPlaneInfo(feature.properties));
        }
    }).addTo(map);

    // TODO: Goal 6: Add functionality that will cause the map to auto refresh after a certain interval of time.

}

// Start the main program when the DOM is ready
document.addEventListener("DOMContentLoaded", () => main());
