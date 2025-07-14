/**
 * Main application functionality for Pokémon GO map
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - JS działa!');
    // Initialize map
    const pokeMap = new PokeMap();
    pokeMap.initMap();
    
    // Load existing points
    loadPointsFromServer();
    
    // Set up form submission
    const pointForm = document.getElementById('point-form');
    pointForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Pobierz i sparsuj koordynaty
        const coordStr = document.getElementById('coordinates').value.trim();
        const match = coordStr.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
        if (!match) {
            alert('Wklej poprawne koordynaty w formacie: 51.51660034800902, 17.268122925543906');
            return;
        }
        const latitude = parseFloat(match[1]);
        const longitude = parseFloat(match[2]);
        const pointType = document.getElementById('point-type').value;
        const pointName = document.getElementById('point-name').value;
        if (!isValidCoordinate(latitude, longitude)) {
            alert('Podaj poprawne wartości współrzędnych.');
            return;
        }
        const point = {
            type: pointType,
            name: pointName,
            lat: latitude,
            lng: longitude
        };
        pokeMap.addMarker(point);
        savePoint(point);
        pointForm.reset();
    });

    // Kliknięcie na mapie uzupełnia pole koordynatów
    pokeMap.map.on('click', (e) => {
        const lat = e.latlng.lat.toFixed(8);
        const lng = e.latlng.lng.toFixed(8);
        document.getElementById('coordinates').value = `${lat}, ${lng}`;
    });
    
    // Obsługa przycisku lokalizacji
    document.getElementById('locate-btn').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    pokeMap.map.setView([lat, lng], 16);
                    const marker = L.marker([lat, lng]).addTo(pokeMap.map);
                    marker.bindPopup('Twoja lokalizacja').openPopup();
                },
                (err) => {
                    alert('Nie udało się pobrać lokalizacji: ' + err.message);
                }
            );
        } else {
            alert('Twoja przeglądarka nie obsługuje geolokalizacji.');
        }
    });
    
    /**
     * Validate coordinates
     * @param {Number} lat - Latitude
     * @param {Number} lng - Longitude
     * @returns {Boolean} - Whether coordinates are valid
     */
    function isValidCoordinate(lat, lng) {
        return !isNaN(lat) && !isNaN(lng) && 
               lat >= -90 && lat <= 90 && 
               lng >= -180 && lng <= 180;
    }
    
    /**
     * Load points from server
     */
    function loadPointsFromServer() {
        db.collection("points").get().then(snapshot => {
            const points = [];
            snapshot.forEach(doc => points.push(doc.data()));
            pokeMap.loadPoints(points);
        }).catch(error => {
            console.error('Error loading points:', error);
        });
    }
    
    /**
     * Save point to server
     * @param {Object} point - Point data
     */
    function savePoint(point) {
        db.collection("points").add(point)
            .then(() => {
                console.log("Point saved!");
            })
            .catch(error => {
                console.error("Error saving point:", error);
            });
    }
});