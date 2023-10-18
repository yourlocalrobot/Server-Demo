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

// Initialize MySQL connection pool using environment variables
const pool = mysql.createPool({
  connectionLimit: 10,  // Adjust the number as needed
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true
});

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

// Initialize game data
const npcs = [
  { name: "NPC1", stats: { Happiness: "maximum" }, x: 100, y: 100 },
  { name: "NPC2", stats: { Happiness: "maximum" }, x: 150, y: 150 },
  { name: "NPC3", stats: { Happiness: "maximum" }, x: 200, y: 200 }
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