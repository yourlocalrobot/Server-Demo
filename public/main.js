// Socket.io client setup
const socket = io();

// Canvas and context setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const circleRadius = 15; // Assuming you're using a radius of 15

// Set canvas dimensions
canvas.width = window.innerWidth - (2 * circleRadius);
canvas.height = window.innerHeight - (2 * circleRadius);

// If you want to handle window resizing:
window.addEventListener('resize', function(){
    canvas.width = window.innerWidth;// - (2 * circleRadius);
	canvas.height = window.innerHeight;// - (2 * circleRadius);
    drawAllEntities(); // Redraw everything to fit the new size
});

// Initial player configuration
let playerX = 50;
let playerY = 50;

// Data structures to hold other players and NPCs
let otherPlayers = {};
let npcs = [];

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

//click
canvas.addEventListener("click", moveToClickPosition);
document.addEventListener('keydown', handleArrowKeyPress);

let destination = { x: null, y: null };
const speed = 3;
let animationFrameId = null; // To keep track of the animation frame

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
        playerX += speed * Math.cos(angle);
        playerY += speed * Math.sin(angle);

        // Emit the player's new position to the server
        socket.emit('updatePlayerPosition', { x: playerX, y: playerY });

        drawAllEntities();

        // Continue the animation
        animationFrameId = requestAnimationFrame(movePlayer);
    } else {
        // Player has reached or is very close to the destination
        playerX = destination.x;
        playerY = destination.y;
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

// Event handler for keypress
function handleKeydown(event) {
  switch (event.code) {
    case "ArrowUp":
      playerY -= 5;
      break;
    case "ArrowDown":
      playerY += 5;
      break;
    case "ArrowLeft":
      playerX -= 5;
      break;
    case "ArrowRight":
      playerX += 5;
      break;
  }
  socket.emit('updatePlayerPosition', { x: playerX, y: playerY });
  drawAllEntities();
}

// Drawing functions
function drawPlayer(x, y) {
  ctx.fillStyle = "blue";
  ctx.beginPath();
  ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawOtherPlayer(x, y) {
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawNPC(npc) {
  ctx.fillStyle = "green";
  ctx.beginPath();
  ctx.arc(npc.x, npc.y, circleRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawAllEntities() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawPlayer(playerX, playerY);
  
  for (let playerId in otherPlayers) {
    let player = otherPlayers[playerId];
    drawOtherPlayer(player.x, player.y);
  }
  
  for (let npc of npcs) {
    drawNPC(npc);
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

