
/**
 * Main Program
 */
function main() {
    const mapElement = document.getElementById('map');
    const mapOptions = {
        center: [51.505, -0.09],
        zoom: 13,
        attributionControl: false,
        zoomControl: false,
        closePopupOnClick: false,
        boxZoom: false,
        doubleClickZoom: false,
        dragging: false,
        scrollWheelZoom: false,
        keyboard: false,
        touchZoom: false,
    };
    const map = L.map(mapElement, mapOptions);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    var marker = L.marker([51.5, -0.09]).addTo(map);

    const circle = L.circle([51.508, -0.11], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: 500
    }).addTo(map);

    const polygon = L.polygon([
        [51.509, -0.08],
        [51.503, -0.06],
        [51.51, -0.047]
    ]).addTo(map);

    marker.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup();
    circle.bindPopup("I am a circle.");
    polygon.bindPopup("I am a polygon.");

    const popup = L.popup()


    // map.on('click', (e) => {
    //     popup
    //         .setLatLng(e.latlng)
    //         .setContent("You clicked the map at " + e.latlng.toString())
    //         .openOn(map);
    // });
}

// Start the main program when the DOM is ready
document.addEventListener("DOMContentLoaded", () => main());
