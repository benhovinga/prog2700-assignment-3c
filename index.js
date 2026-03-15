
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
function main() {
    // Center map on Halifax Stanfield International Airport (YHZ)
    const MAP_CENTER = new LatLong(44.87862, -63.50965);

    // Bounding box around most of mainland Nova Scotia, Canada.
    const MIN_BOUND = new LatLong(MAP_CENTER.lat - 1.5, MAP_CENTER.long - 2.5);
    const MAX_BOUND = new LatLong(MAP_CENTER.lat + 1, MAP_CENTER.long + 2.5);

    // Initialize the map
    const map = L.map('map', {
        // See https://leafletjs.com/reference.html#map-option for more options
        center: MAP_CENTER.toArray(),
        zoom: 8,
    });

    // Add the scale bar to the map
    L.control.scale().addTo(map);

    // Use OSM tiles
    const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Flight data bounding box layer
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

    // Plane popup info
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

    // Plane icon
    const planeIcon = L.icon({
        iconUrl: "plane2.png",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    })

    // GeoJSON layer
    const planeLayer = L.geoJSON(null, {
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {
                icon: planeIcon,
                rotationAngle: feature.properties.trueTrack,
            });
        },
        onEachFeature: (feature, layer) => {
            layer.bindPopup(getPlaneInfo(feature.properties));
        }
    }).addTo(map);

    // Add layer controls
    const layerControl = L.control.layers(
        // Base maps
        {
            "OpenStreetMap": osm
        },
        // Overlay maps
        {
            "Airport marker": hfxAirportMarker,
            "Flight data bounding box": flightDataBoundBox,
            "Planes": planeLayer
        }
    ).addTo(map);

    // Initialize the OSN API
    const osn = new OpenSkyNetwork(MIN_BOUND, MAX_BOUND);

    // Runner to fetch fresh data and display on the map
    async function runner() {
        // Fetch
        const {time, states} = await osn.fetchAllStateVectors();
        // Filter
        const canadianOrigin = states.filter(state => state.originCountry === "Canada");
        // Convert to GeoJSON
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
        // Clear pervious planes
        planeLayer.clearLayers();
        // Add new planes
        planeLayer.addData(geojsonFeatures);
    }

    // Kickstart the runner
    runner();
    // Repeat runner every 15 seconds
    setInterval(runner, 1000 * 15);
}

// Start the main program when the DOM is ready
document.addEventListener("DOMContentLoaded", () => main());
