/**
 * Map functionality for Pokémon GO map
 */

class PokeMap {
    constructor() {
        // Milicz County coordinates (approximate center)
        this.miliczCenter = [51.5267, 17.2775];
        this.map = null;
        this.markers = [];
        this.s2Utility = new S2Utility();
        
        // Custom icons
        this.pokestopIcon = L.icon({
            iconUrl: 'pokestop.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });
        this.gymIcon = L.icon({
            iconUrl: 'gym.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });
    }

    /**
     * Initialize the map
     */
    initMap() {
        console.log('Inicjalizacja mapy...');
        // Create map centered on Milicz County
        this.map = L.map('map').setView(this.miliczCenter, 13);
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.map);
        
        // Initialize S2 cells
        const bounds = this.map.getBounds();
        const mapBounds = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
        };
        
        this.s2Utility.createS2CellLayers(this.map, mapBounds);
        
        // Update S2 cells when map view changes
        this.map.on('moveend', () => {
            this.s2Utility.updateS2CellLayers(this.map);
        });
        
        // Set up layer control event listeners
        document.getElementById('s2-level-14').addEventListener('change', (e) => {
            this.s2Utility.toggleS2CellLayer(14, e.target.checked, this.map);
        });
        
        document.getElementById('s2-level-17').addEventListener('change', (e) => {
            this.s2Utility.toggleS2CellLayer(17, e.target.checked, this.map);
        });
        
        // Add click event to get coordinates
        this.map.on('click', (e) => {
            const lat = e.latlng.lat.toFixed(5);
            const lng = e.latlng.lng.toFixed(5);
            
            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lng;
        });
    }

    /**
     * Add a marker to the map
     * @param {Object} point - Point data {type, name, lat, lng}
     * @returns {Object} - Leaflet marker object
     */
    addMarker(point) {
        const icon = point.type === 'PokéStop' ? this.pokestopIcon : this.gymIcon;
        
        // Dodaj cień jako okrąg o promieniu 20m, jasnoszary, bez obramowania
        const shadowCircle = L.circle([point.lat, point.lng], {
            radius: 20, // metry
            color: null,
            fillColor: '#e0e0e0',
            fillOpacity: 0.35,
            weight: 0 // brak obramowania
        }).addTo(this.map);

        const marker = L.marker([point.lat, point.lng], {
            icon: icon,
            title: point.name
        }).addTo(this.map);
        
        let popupHtml = `<strong>${point.name}</strong><br>Type: ${point.type}`;
        if (point._id) {
            popupHtml += `<br><button class="delete-point-btn" data-id="${point._id}">Usuń</button>`;
        }
        marker.bindPopup(popupHtml);
        
        this.markers.push({
            marker: marker,
            shadow: shadowCircle,
            data: point
        });
        
        return marker;
    }

    /**
     * Load points from data and add them to the map
     * @param {Array} points - Array of point objects
     */
    loadPoints(points) {
        // Clear existing markers
        this.clearMarkers();
        
        // Add new markers
        points.forEach(point => {
            this.addMarker(point);
        });
    }

    /**
     * Clear all markers from the map
     */
    clearMarkers() {
        this.markers.forEach(item => {
            this.map.removeLayer(item.marker);
            if (item.shadow) {
                this.map.removeLayer(item.shadow);
            }
        });
        
        this.markers = [];
    }

    /**
     * Get all marker data
     * @returns {Array} - Array of point data objects
     */
    getMarkerData() {
        return this.markers.map(item => item.data);
    }
}