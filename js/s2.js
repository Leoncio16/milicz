/**
 * S2 Cell utility functions for Pokémon GO map
 */

class S2Utility {
    constructor() {
        this.level14Cells = [];
        this.level17Cells = [];
        this.level14Layer = null;
        this.level17Layer = null;
    }

    // Generuj siatkę S2 tylko raz dla powiatu milickiego
    generateS2CellsForMilicz(level) {
        const area = {
            north: 51.68,
            south: 51.40,
            east: 17.50,
            west: 17.10
        };
        const cells = new Map();
        const startCell = S2.S2Cell.FromLatLng(S2.L.LatLng(area.south, area.west), level);
        const stepCell = startCell.getNeighbors()[2];
        const cellSizeLat = Math.abs(stepCell.getLatLng().lat - startCell.getLatLng().lat);
        const cellSizeLng = Math.abs(stepCell.getLatLng().lng - startCell.getLatLng().lng);
        for (let lat = area.south; lat <= area.north; lat += cellSizeLat) {
            for (let lng = area.west; lng <= area.east; lng += cellSizeLng) {
                const cell = S2.S2Cell.FromLatLng(S2.L.LatLng(lat, lng), level);
                const cellId = cell.toHilbertQuadkey();
                if (!cells.has(cellId)) {
                    const corners = cell.getCornerLatLngs().map(c => [c.lat, c.lng]);
                    corners.push(corners[0]);
                    cells.set(cellId, corners);
                }
            }
        }
        return Array.from(cells.values());
    }

    // Dodaję funkcję do liczenia punktów w komórkach S2
    countPointsInCells(points, level) {
        const cellCounts = {};
        points.forEach(point => {
            const cell = S2.S2Cell.FromLatLng(S2.L.LatLng(point.lat, point.lng), level);
            const cellId = cell.toHilbertQuadkey();
            if (!cellCounts[cellId]) cellCounts[cellId] = [];
            cellCounts[cellId].push(point);
        });
        return cellCounts;
    }

    // Funkcja do generowania porady dla komórki level 14
    getAdviceForCell14(pokestopCount) {
        if (pokestopCount <= 1) return '0 gymów (za mało PokéStopów)';
        if (pokestopCount <= 5) return '1 gym (2-5 PokéStopów)';
        if (pokestopCount <= 19) return '2 gymy (6-19 PokéStopów)';
        if (pokestopCount <= 34) return '3 gymy (20-34 PokéStopów)';
        return '4 gymy (35+ PokéStopów)';
    }

    // Funkcja do generowania popupów dla komórek S2
    createS2CellLayers(map) {
        if (!this.level14Cells.length) {
            this.level14Cells = this.generateS2CellsForMilicz(14);
        }
        if (!this.level17Cells.length) {
            this.level17Cells = this.generateS2CellsForMilicz(17);
        }
        if (!this.level14Layer) {
            this.level14Layer = L.layerGroup(
                this.level14Cells.map(vertices =>
                    L.polygon(vertices, {
                        color: '#FF9800',
                        weight: 2,
                        opacity: 0.7,
                        fill: true,
                        fillColor: '#FF9800',
                        fillOpacity: 0.1
                    })
                )
            );
        }
        if (!this.level17Layer) {
            this.level17Layer = L.layerGroup(
                this.level17Cells.map(vertices =>
                    L.polygon(vertices, {
                        color: '#4CAF50',
                        weight: 1,
                        opacity: 0.7,
                        fill: true,
                        fillColor: '#4CAF50',
                        fillOpacity: 0.1
                    })
                )
            );
        }
        this.level14Layer.addTo(map);
        this.level17Layer.addTo(map);
    }

    // Wyłączone dynamiczne aktualizowanie siatki
    updateS2CellLayers(map) {}

    toggleS2CellLayer(level, visible, map) {
        if (level === 14 && this.level14Layer) {
            if (visible) {
                map.addLayer(this.level14Layer);
            } else {
                map.removeLayer(this.level14Layer);
            }
        }
        if (level === 17 && this.level17Layer) {
            if (visible) {
                map.addLayer(this.level17Layer);
            } else {
                map.removeLayer(this.level17Layer);
            }
        }
    }
}