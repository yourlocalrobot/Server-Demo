// Socket.io client setup
const socket = io();

// Canvas and context setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const circleRadius = 15;

// Set canvas dimensions
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// If you want to handle window resizing:
window.addEventListener('resize', function(){
    canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
    drawAllEntities( entities );
});

// Initial player configuration
let playerX = 50;
let playerY = 50;

// Data structures to hold other players and NPCs
let otherPlayers = {};
let npcs = [];
let allEntities = [];
let playerObj = [];
let polygons = [];
let entities = [];

//movement info
let destination = { x: null, y: null };
const speed = 3;
let animationFrameId = null; // To keep track of the animation frame

// Event listeners
document.addEventListener("keydown", handleKeydown);
document.addEventListener("mousedown", (event) => {
  event.preventDefault();
});

canvas.addEventListener("click", moveToClickPosition);
document.addEventListener('keydown', handleArrowKeyPress);

//Socket Events
socket.on('updateEntities', (allEntities) => {
	
  entities = allEntities;
  polygons = allEntities[3];

  // Draw all entities (or any other actions you want to take)
  drawAllEntities( entities );
  
});

socket.on("updatePlayer", (playerData) => {
	
  otherPlayers[playerData.id] = { x: playerData.x, y: playerData.y };
  
  drawAllEntities( entities );
  
});

socket.on("updatePlayers", (players) => {
	
  otherPlayers = players;
  
  delete otherPlayers[socket.id];
  
  drawAllEntities( entities );
  
});

socket.on("playerDisconnected", (playerId) => {
	
  delete otherPlayers[playerId];
  
  drawAllEntities( entities );
  
});

socket.on("newUser", (playerId) => {
	
	alert('new user connected');
	  
});

//Draw Functions
function drawPlayer(x, y, object) {
  ctx.fillStyle = object.appearance.color;
  ctx.beginPath();
  ctx.arc(x, y, object.appearance.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawOtherPlayer(x, y, object) {
  ctx.fillStyle = object.appearance.color;
  ctx.beginPath();
  ctx.arc(x, y, object.appearance.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawNPC( object ) {
  ctx.fillStyle = object.appearance.color;
  ctx.beginPath();
  ctx.arc(object.x, object.y, object.appearance.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawPolygon(polygon) {
    const { vertices, appearance } = polygon;
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for(let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = appearance.color;
    ctx.fill();
}

function drawAllEntities( entities ) {
	
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	// Initialize canvas with a black background
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	//Draw The Player
	drawPlayer( playerX, playerY, entities[1][0] );
	
	//Draw Other Players
	for ( let playerId in otherPlayers ) {
		
    	let player = otherPlayers[playerId];
    	
		drawOtherPlayer( player.x, player.y, entities[2][0] );
		
  	}
  	
  	//Draw NPCs
  	for ( let npc of entities[0] ) {
	  		  	
   		drawNPC(npc);
   		
  	}
  	
  	for ( let polygon of entities[3] ) {
	  		  	
   		drawPolygon(polygon);
   		
  	}
  
}

//movement functions
function moveToClickPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    destination.x = x;
    destination.y = y;

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId); // Clear any existing animation frame
    }

    requestAnimationFrame(movePlayer);
}

function movePlayer() {
    const dx = destination.x - playerX;
    const dy = destination.y - playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > speed) {
        const angle = Math.atan2(dy, dx);
        
        // Calculate the new positions
        const newX = playerX + speed * Math.cos(angle);
        const newY = playerY + speed * Math.sin(angle);

	          // Collision detection for player
		  if (!isInsidePolygon({ x: newX, y: newY }, polygons)) {
		    if (newX >= 0 && newX <= canvas.width) {
		      playerX = newX;
		    }
		    if (newY >= 0 && newY <= canvas.height) {
		      playerY = newY;
		    }
		  }

        // Emit the player's new position to the server
        socket.emit('updatePlayerPosition', { x: playerX, y: playerY });

        drawAllEntities( entities );

        // Continue the animation
        animationFrameId = requestAnimationFrame(movePlayer);
    } else {
        // Player has reached or is very close to the destination
        // Collision detection for player at destination
        if (destination.x >= 0 && destination.x <= canvas.width) {
            playerX = destination.x;
        }
        if (destination.y >= 0 && destination.y <= canvas.height) {
            playerY = destination.y;
        }
        
        drawAllEntities( entities );
    }
}

function handleArrowKeyPress(event) {
    const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

    if (ARROW_KEYS.includes(event.key)) {
        // Cancel the movement towards the clicked position
        destination.x = playerX;
        destination.y = playerY;
    }
}

// Event handler for arrow keypress
function handleKeydown(event) {
  let dx = 0, dy = 0;
  switch (event.code) {
    case "ArrowUp":
      dy = -5;
      break;
    case "ArrowDown":
      dy = 5;
      break;
    case "ArrowLeft":
      dx = -5;
      break;
    case "ArrowRight":
      dx = 5;
      break;
  }

  // Collision detection for player using arrow keys
  const newX = playerX + dx;
  const newY = playerY + dy;
  if (!isInsidePolygon({ x: newX, y: newY }, polygons)) {
    if (newX >= 0 && newX <= canvas.width) {
      playerX = newX;
    }
    if (newY >= 0 && newY <= canvas.height) {
      playerY = newY;
    }
  }

  socket.emit('updatePlayerPosition', { x: playerX, y: playerY });
  
  drawAllEntities( entities );
}

//out-dated colision detection function to-do: make this work with all polygons/Volumes/MAC%20HD/Users/ben/Repositories/ServerGameDemo/Server-Demo/public/main.js
function isInsidePolygon(point, polygon) {
	
/*	
  let x = point.x, y = point.y;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i].x, yi = polygon[i].y;
    let xj = polygon[j].x, yj = polygon[j].y;
    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;*/
  
  return false;
}