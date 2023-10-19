// Socket.io client setup
const socket = io();

// Canvas and context setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const circleRadius = 15; // Assuming you're using a radius of 15

// Set canvas dimensions
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// If you want to handle window resizing:
window.addEventListener('resize', function(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawAllEntities(); // Redraw everything to fit the new size
});

// Initial player configuration
let playerX = 50;
let playerY = 50;

// Data structures to hold other players and NPCs
let otherPlayers = {};
let npcs = [];

// Initialize game with data from the server
socket.on("initializeGame", (data) => {
  npcs = data.npcs;
  otherPlayers = data.otherPlayers;
  drawAllEntities();
});

// Initialize canvas with a black background
ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Initial draw for the player
drawPlayer(playerX, playerY);

// Event listeners
document.addEventListener("keydown", handleKeydown);
document.addEventListener("mousedown", (event) => {
  event.preventDefault();
});

// Click event
canvas.addEventListener("click", moveToClickPosition);
document.addEventListener('keydown', handleArrowKeyPress);

let destination = { x: null, y: null };
const speed = 3;
let animationFrameId = null;

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
		  if (!isInsidePolygon({ x: newX, y: newY }, polygon)) {
		    if (newX >= 0 && newX <= canvas.width) {
		      playerX = newX;
		    }
		    if (newY >= 0 && newY <= canvas.height) {
		      playerY = newY;
		    }
		  }

        // Emit the player's new position to the server
        socket.emit('updatePlayerPosition', { x: playerX, y: playerY });

        drawAllEntities();

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
        
        drawAllEntities();
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
  if (!isInsidePolygon({ x: newX, y: newY }, polygon)) {
    if (newX >= 0 && newX <= canvas.width) {
      playerX = newX;
    }
    if (newY >= 0 && newY <= canvas.height) {
      playerY = newY;
    }
  }

  socket.emit('updatePlayerPosition', { x: playerX, y: playerY });
  drawAllEntities();
}

// Drawing functions
function drawEntity(entity) {
  switch (entity.appearance.shape) {
    case 'circle':
      ctx.fillStyle = entity.appearance.color;
      ctx.beginPath();
      ctx.arc(entity.x, entity.y, entity.appearance.radius, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'square':
      ctx.fillStyle = entity.appearance.color;
      ctx.fillRect(entity.x, entity.y, entity.appearance.size, entity.appearance.size);
      break;
    case 'triangle':
      ctx.fillStyle = entity.appearance.color;
      ctx.beginPath();
      ctx.moveTo(entity.x + entity.appearance.vertices[0].x, entity.y + entity.appearance.vertices[0].y);
      for (let i = 1; i < entity.appearance.vertices.length; i++) {
        ctx.lineTo(entity.x + entity.appearance.vertices[i].x, entity.y + entity.appearance.vertices[i].y);
      }
      ctx.closePath();
      ctx.fill();
      break;
    default:
      console.warn('Unknown shape:', entity.appearance.shape);
  }
}

function drawAllEntities() {
  // Clear the canvas
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw the player
  drawEntity({ x: playerX, y: playerY, appearance: { shape: 'circle', color: 'blue', radius: circleRadius } });

  // Draw other players
  for (let playerId in otherPlayers) {
    let player = otherPlayers[playerId];
    drawEntity(player);
  }

  // Draw NPCs
  for (let npc of npcs) {
    drawEntity(npc);
  }
}


// Socket listeners
socket.on("updatePlayers", (players) => {
  otherPlayers = players;
  delete otherPlayers[socket.id];
  drawAllEntities();
});

socket.on("updatePlayer", (playerData) => {
  otherPlayers[playerData.id] = { x: playerData.x, y: playerData.y };
  drawAllEntities();
});

socket.on("updateNPCs", (updatedNPCs) => {
  npcs = updatedNPCs;
  drawAllEntities();
});

socket.on("playerDisconnected", (playerId) => {
  delete otherPlayers[playerId];
  drawAllEntities();
});

/*const polygon = [
  { x: 400, y: 300 },
  { x: 450, y: 300 },
  { x: 425, y: 250 }
];*/

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

