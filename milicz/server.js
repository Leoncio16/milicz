/**
 * Server for Pokémon GO map application
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(__dirname)); // Serve static files
app.use(express.json()); // Parse JSON request bodies

// Data file path
const dataFilePath = path.join(__dirname, 'points.json');

// Ensure data file exists
if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([]));
}

// API endpoint to get all points
app.get('/api/points', (req, res) => {
    try {
        const data = fs.readFileSync(dataFilePath, 'utf8');
        const points = JSON.parse(data);
        res.json(points);
    } catch (error) {
        console.error('Error reading points:', error);
        res.status(500).json({ error: 'Failed to read points data' });
    }
});

// API endpoint to add a new point
app.post('/api/points', (req, res) => {
    try {
        const newPoint = req.body;
        
        // Validate point data
        if (!newPoint.type || !newPoint.name || !newPoint.lat || !newPoint.lng) {
            return res.status(400).json({ error: 'Missing required point data' });
        }
        
        // Read existing points
        const data = fs.readFileSync(dataFilePath, 'utf8');
        const points = JSON.parse(data);
        
        // Add new point
        points.push(newPoint);
        
        // Write updated points back to file
        fs.writeFileSync(dataFilePath, JSON.stringify(points, null, 2));
        
        // Also write to text file for easier reading
        const txtFilePath = path.join(__dirname, 'points.txt');
        const txtContent = points.map(p => 
            `Type: ${p.type}, Name: ${p.name}, Lat: ${p.lat}, Lng: ${p.lng}`
        ).join('\n');
        
        fs.writeFileSync(txtFilePath, txtContent);
        
        res.json({ success: true, point: newPoint });
    } catch (error) {
        console.error('Error saving point:', error);
        res.status(500).json({ error: 'Failed to save point data' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});