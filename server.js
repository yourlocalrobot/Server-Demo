require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mysql = require('mysql');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const port = 3000;

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

// Create an empty array for NPCs and players
let npcs = [];
let players = [];

// Initialize Socket.io events
io.on("connection", (socket) => {
  console.log("New client connected");
  // More logic will go here
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/`);
});