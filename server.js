require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mysql = require('mysql');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Initialize MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true
});

// Connect to MySQL
db.connect((err) => {
  if (err) throw err;
  console.log('Connected to the database.');

  // Create database if it doesn't exist
  let createDbQuery = 'CREATE DATABASE IF NOT EXISTS gameDB;';
  db.query(createDbQuery, (err, result) => {
    if (err) throw err;

    // Use the database for future queries
    db.query('USE gameDB', (err, result) => {
      if (err) throw err;

      // Create tables if they don't exist
      let createTableQuery = `
        CREATE TABLE IF NOT EXISTS npc (
          id INT AUTO_INCREMENT,
          name VARCHAR(50),
          stats JSON,
          sprite_url VARCHAR(255),
          PRIMARY KEY(id)
        );`;
      db.query(createTableQuery, (err, result) => {
        if (err) throw err;
      });
    });
  });
});

// Empty arrays for NPCs and players
let npcs = [
  { name: "NPC1", stats: {}, x: 100, y: 100 }
  // Add more NPCs here
];
let players = {};

// Initialize Socket.io events
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.emit("updateNPCs", npcs);

  socket.on("playerMove", (data) => {
    players[socket.id] = { x: data.x, y: data.y };
  });

  socket.on("chatMessage", (message) => {
    io.emit("newChatMessage", message);
  });
});

// Update NPC positions periodically
setInterval(() => {
  npcs.forEach((npc) => {
    npc.x += Math.floor(Math.random() * 11) - 5;
    npc.y += Math.floor(Math.random() * 11) - 5;
  });
  io.emit("updateNPCs", npcs);
}, 1000);

// Update players periodically
setInterval(() => {
  io.emit("updatePlayers", players);
}, 1000);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/`);
});