// Environment variables setup
require('dotenv').config();

// Imports
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mysql = require('mysql');
const path = require('path');

// Express setup
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const port = 3000;

// Initialize MySQL connection using environment variables
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true
});

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MySQL
db.connect((err) => {
  if (err) throw err;
  console.log('Connected to the database.');

  // Ensure the database 'gameDB' exists
  db.query('CREATE DATABASE IF NOT EXISTS gameDB;', (err) => {
    if (err) throw err;

    // Switch to the 'gameDB' database
    db.query('USE gameDB', (err) => {
      if (err) throw err;

      // Ensure the 'npc' table exists within 'gameDB'
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS npc (
          id INT AUTO_INCREMENT,
          name VARCHAR(50),
          stats JSON,
          sprite_url VARCHAR(255),
          PRIMARY KEY(id)
        );`;
      db.query(createTableQuery, (err) => {
        if (err) throw err;
      });
    });
  });
});

// Initialize game data
const npcs = [
  { name: "NPC1", stats: {}, x: 100, y: 100 }
];
const players = {};

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
});

// Periodically update NPC positions
setInterval(() => {
  npcs.forEach((npc) => {
    npc.x += Math.floor(Math.random() * 11) - 5;
    npc.y += Math.floor(Math.random() * 11) - 5;
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