// Environment variables setup
require('dotenv').config();

// Imports
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mysql = require('mysql');
const path = require('path');
const fs = require('fs');

// Express setup
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const port = 3000;

// Define canvas dimensions at the top of your server.js
const CANVAS_WIDTH = 800;  // Replace with your actual canvas width
const CANVAS_HEIGHT = 600; // Replace with your actual canvas height

// Dynamic Entity Loading
const npcs = loadEntities('./src/entities/npcs');
const players = loadEntities('./src/entities/player');
const otherPlayers = loadEntities('./src/entities/other-players');
const polygons = loadEntities('./src/entities/polygons');

// Define the yellow triangle vertices
const polygon = [
  { x: 400, y: 300 },
  { x: 450, y: 300 },
  { x: 425, y: 250 }
];

// Function to check if a point is inside the polygon
function isInsidePolygon(point, polygon) {
  let x = point.x, y = point.y;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i].x, yi = polygon[i].y;
    let xj = polygon[j].x, yj = polygon[j].y;
    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Initialize MySQL connection pool using environment variables
const pool = mysql.createPool({
  connectionLimit: 10,  // Adjust the number as needed
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true
});

function loadEntities(folderPath) {
  const entities = [];
  const absoluteFolderPath = path.join(__dirname, folderPath);
  const files = fs.readdirSync(absoluteFolderPath);

  files.forEach((file) => {
    const entity = require(path.join(absoluteFolderPath, file));
    entities.push(entity);
  });

  return entities;
}

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MySQL and set up the database/table
pool.getConnection((err, connection) => {
  if (err) throw err;

  console.log('Connected to the database.');

  connection.query('CREATE DATABASE IF NOT EXISTS gameDB;', (err) => {
    if (err) throw err;

    connection.query('USE gameDB', (err) => {
      if (err) throw err;

      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS npc (
          id INT AUTO_INCREMENT,
          name VARCHAR(50),
          stats JSON,
          sprite_url VARCHAR(255),
          PRIMARY KEY(id)
        );`;

      connection.query(createTableQuery, (err) => {
        if (err) throw err;
        connection.release();
      });
    });
  });
});

/*// Initialize game data
const npcs = [
  { name: "NPC1", stats: { Happiness: "maximum" }, x: 100, y: 100 },
  { name: "NPC2", stats: { Happiness: "maximum" }, x: 150, y: 150 },
  { name: "NPC3", stats: { Happiness: "maximum" }, x: 200, y: 200 }
];
const players = {};*/

// Socket.io event handling
io.on("connection", (socket) => {
  console.log("New client connected");

  // Send initial NPC data to connected client
  socket.emit("updateNPCs", npcs);

  // Update player position on move event
  socket.on("playerMove", (data) => {
    players[socket.id] = { x: data.x, y: data.y };
  });

  // Broadcast updated player's position to others
  socket.on("updatePlayerPosition", (data) => {
    players[socket.id] = { x: data.x, y: data.y };
    socket.broadcast.emit("updatePlayer", { id: socket.id, x: data.x, y: data.y });
  });

  // Broadcast chat messages to all clients
  socket.on("chatMessage", (message) => {
    io.emit("newChatMessage", message);
  });
  
  // Remove players when they disconnect
  socket.on('disconnect', () => {
	  console.log(`Client with ID ${socket.id} disconnected`);
	  
	  // Remove the player from the players object
	  delete players[socket.id];
	
	  // Inform other clients about the disconnection
	  socket.broadcast.emit('playerDisconnected', socket.id);
	});

  
});

// Periodically update NPC positions
setInterval(() => {
  npcs.forEach((npc) => {
    let dx = Math.floor(Math.random() * 11) - 5;
    let dy = Math.floor(Math.random() * 11) - 5;

    // Check for collision with the yellow polygon
    if (!isInsidePolygon({ x: npc.x + dx, y: npc.y + dy }, polygon)) {
      if (npc.x + dx >= 0 && npc.x + dx <= CANVAS_WIDTH) {
        npc.x += dx;
      }
      if (npc.y + dy >= 0 && npc.y + dy <= CANVAS_HEIGHT) {
        npc.y += dy;
      }
    }
  });
  io.emit("updateNPCs", npcs);
}, 1000);

// Periodically update players to clients
setInterval(() => {
  io.emit("updatePlayers", players);
}, 1000);

// Default route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/`);
});