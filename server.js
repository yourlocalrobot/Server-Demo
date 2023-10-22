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

// Define canvas dimensions
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Dynamic Entity Loading
const npcs = loadEntities('./src/entities/npcs');
const newplayerObj = loadEntities('./src/entities/player');
const otherPlayersObj = loadEntities('./src/entities/other-players');
const allPolygons = loadEntities('./src/entities/polygons');
//delete this
const polygon = [];
const players = {};
const allEntities = [npcs, newplayerObj, otherPlayersObj, allPolygons];
const stoppedNPCs = [];

// Initialize MySQL connection pool using environment variables
const pool = mysql.createPool({
	connectionLimit: 10, // Adjust the number as needed
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

//socket actions
io.on("connection", (socket) => {

	console.log("New client connected");

	socket.emit("updateEntities", allEntities);

	socket.emit("updatePlayerObj", newplayerObj);

	socket.emit("otherPlayerObj", otherPlayersObj);

	socket.emit("updatePolygons", allPolygons);

	// Send initial NPC data to connected client
	socket.emit("updateNPCs", npcs);

	// Update player position on move event
	socket.on("playerMove", (data) => {

		players[socket.id] = {
			x: data.x,
			y: data.y
		};

	});
	
	  // Broadcast updated player's position to others
	  socket.on("updatePlayerPosition", (data) => {
	    players[socket.id] = { x: data.x, y: data.y };
	    socket.broadcast.emit("updatePlayer", { id: socket.id, x: data.x, y: data.y });
	  });

	socket.on('npcInteraction', async (data) => {

		let index;

		switch (data.action) {
			
			case 'start':
			
				makeNpcGlow(data.npc, 'start');
				
				console.log('player interacted with ' + data.npc.npc_name);
				
				// Freeze the npc
				stoppedNPCs.push(data.npc);

				// Wait for 10 seconds
				await sleep(10000);
				
				// Remove the NPC from the stoppedNPCs array
				index = stoppedNPCs.findIndex(npc => npc.npc_name === data.npc.npc_name);
				
				if (index !== -1) {
					
					stoppedNPCs.splice(index, 1);
					
				}
				
				makeNpcGlow(data.npc, 'stop');

				// Emit event to resume NPC (if needed)
				// io.emit('resumeNPC');
				break;

			case 'complete':
				// Remove the NPC from the stoppedNPCs array
				index = stoppedNPCs.findIndex(npc => npc.npc_name === data.clickedNPC.npc_name);
				
				if (index !== -1) {
					
					stoppedNPCs.splice(index, 1);
					
				}

				// Emit event to resume NPC (if needed)
				// io.emit('resumeNPC');
				break;

			default:
				// Handle other cases or do nothing
				break;
		}

	});

	//To-do: build a chat window?
	/* Broadcast chat messages to all clients
	socket.on("chatMessage", (message) => {
	  io.emit("newChatMessage", message);
	});*/

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
		const isStopped = stoppedNPCs.some(stoppedNpc => stoppedNpc.npc_name === npc.npc_name);
		if (!isStopped) {
			let dx = Math.floor(Math.random() * 11) - 5;
			let dy = Math.floor(Math.random() * 11) - 5;

			// Initialize canMove to true for each NPC
			let canMove = true;

			// Check for collision with the polygons
			for (let polygon of allPolygons) {
				if (isInsidePolygon({
						x: npc.x + dx,
						y: npc.y + dy
					}, polygon)) {
					canMove = false;
					break;
				}
			}

			// Update NPC position if no collision is detected
			if (canMove) {
				if (npc.x + dx >= 0 && npc.x + dx <= CANVAS_WIDTH) {
					npc.x += dx;
				}
				if (npc.y + dy >= 0 && npc.y + dy <= CANVAS_HEIGHT) {
					npc.y += dy;
				}
			}
		}
	});

	// Emit updated NPCs to all connected clients
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

//Functions
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

function isInsidePolygon(point, polygon) {
	let x = point.x,
		y = point.y;
	let inside = false;
	let vertices = polygon.vertices;

	for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
		let xi = vertices[i].x,
			yi = vertices[i].y;
		let xj = vertices[j].x,
			yj = vertices[j].y;
		let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
		if (intersect) inside = !inside;
	}
	return inside;
}

function increaseNPCAttribute(npc, attribute, incrementValue) {
	if (npc.hasOwnProperty(attribute)) {
		npc[attribute] += incrementValue;
	} else {
		console.error(`Attribute ${attribute} does not exist on the NPC.`);
	}
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function makeNpcGlow(npc, action) {
	
  // Find the index of the NPC in the npcs array
  const npcIndex = npcs.findIndex(existingNpc => existingNpc.npc_name === npc.npc_name);

  if (npcIndex === -1) {
    console.error("NPC not found in npcs array");
    return;
  }

  if (action === 'start') {
    // Start the glow
    npcs[npcIndex].isGlowing = true;

    // Emit the updated NPC data to all connected clients
    io.emit("updateNPCs", npcs);

    // Set a timeout to stop the glow after 3 seconds
    setTimeout(() => {
      npcs[npcIndex].isGlowing = false;
      io.emit("updateNPCs", npcs);
    }, 3000);
  } else if (action === 'stop') {
    // Stop the glow immediately
    npcs[npcIndex].isGlowing = false;

    // Emit the updated NPC data to all connected clients
    io.emit("updateNPCs", npcs);
  }
}

function breedNPCs(npc1, npc2, npcs) {
  // Extract the color attributes from both NPCs
  const color1 = npc1.appearance.color;
  const color2 = npc2.appearance.color;

  // Combine the colors (use your chosen blending algorithm here)
  const newColor = color1 + color2; // Replace with actual blending logic

  // Create a new NPC with the combined color
  const newNPC = {
    npc_name: `NPC_${Date.now()}`,
    stats: { Happiness: "maximum" },
    x: Math.floor(Math.random() * 800),
    y: Math.floor(Math.random() * 600),
    skill: 0,
    isGlowing: false,
    appearance: { color: newColor, shape: "circle", radius: 10 },
    parents: [npc1.npc_name, npc2.npc_name],
    children: []
  };

  // Update the parent NPCs to include this new child
  npc1.children.push(newNPC.npc_name);
  npc2.children.push(newNPC.npc_name);

  // Convert the newNPC object to a string
  const npcString = `module.exports = ${JSON.stringify(newNPC, null, 2)};`;

  // Define the path where the new NPC file will be saved
  const npcFilePath = path.join(__dirname, 'src/entities/npcs', `${newNPC.npc_name}.js`);

  // Write the new NPC to a file
  fs.writeFileSync(npcFilePath, npcString);

  // Add the new NPC to the npcs array
  npcs.push(newNPC);

  return newNPC;
}

// Your existing npcs array and breedNPCs function here

// Helper function to check if two NPCs are related
function areRelated(npc1, npc2) {
  // Check for parent-child relationship
  if (npc1.parents.includes(npc2.npc_name) || npc2.parents.includes(npc1.npc_name)) {
    return true;
  }

  // Check for sibling relationship
  if (npc1.parents.some(parent => npc2.parents.includes(parent))) {
    return true;
  }

  // Check for grandparent relationship
  const grandparents1 = npc1.parents.map(parent => npcs.find(npc => npc.npc_name === parent).parents).flat();
  const grandparents2 = npc2.parents.map(parent => npcs.find(npc => npc.npc_name === parent).parents).flat();
  if (grandparents1.some(grandparent => grandparents2.includes(grandparent))) {
    return true;
  }

  return false;
}

// Function to randomly breed two NPCs
function randomBreeding(npcs) {
  // Generate a random number between 0 and 1
  const randomChance = Math.random();

  // Set a threshold for breeding to occur (e.g., 5% chance)
  const breedingThreshold = 0.05;

  // Check if breeding should occur
  if (randomChance < breedingThreshold) {
    // Randomly select two parent NPCs
    const parent1Index = Math.floor(Math.random() * npcs.length);
    let parent2Index;
    do {
      parent2Index = Math.floor(Math.random() * npcs.length);
    } while (parent1Index === parent2Index || areRelated(npcs[parent1Index], npcs[parent2Index]));

    const parent1 = npcs[parent1Index];
    const parent2 = npcs[parent2Index];

    // Call the breedNPCs function
    const newNPC = breedNPCs(parent1, parent2, npcs);

    // Log the new NPC for debugging
    console.log(`New NPC created: ${newNPC.npc_name}`);
  }
}

// Set an interval to run the randomBreeding function every few minutes
// (e.g., every 3 minutes or 180000 milliseconds)
setInterval(() => randomBreeding(npcs), 180000);
