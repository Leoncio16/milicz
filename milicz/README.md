# Milicz County Pokémon GO Map

An interactive web application for managing PokéStop and Gym locations in Milicz County for Pokémon GO players.

## Features

- Interactive map centered on Milicz County
- Add and visualize PokéStops and Gyms with custom icons
- Display S2 Cell grids at levels 14 and 17
- Save point data to both JSON and text files
- Click on map to automatically fill coordinates

## Installation

1. Make sure you have [Node.js](https://nodejs.org/) installed (version 14 or higher recommended)

2. Clone this repository or download the files

3. Install dependencies:
   ```
   npm install
   ```

4. Start the server:
   ```
   npm start
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

### Adding Points

1. Click on the map to automatically fill the latitude and longitude fields, or manually enter coordinates
2. Select the point type (PokéStop or Gym)
3. Enter a name for the point
4. Click "Add Point" to save the point

### Viewing S2 Cells

- Use the checkboxes in the "Map Layers" section to toggle the visibility of S2 cells
- Level 14 cells are displayed in orange
- Level 17 cells are displayed in green

### Data Storage

All points are saved in two formats:
- `points.json`: JSON format for application use
- `points.txt`: Text format for easy reading

## Technologies Used

- Frontend: HTML, CSS, JavaScript, Leaflet.js
- Backend: Node.js, Express
- S2 Geometry: s2-geometry.js library

## License

This project is open source and available under the MIT License.