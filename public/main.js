// Socket.io client setup
const socket = io();

// Canvas and context setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();
}

function drawOtherPlayer(x, y) {
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();
}

function drawNPC(npc) {
  ctx.fillStyle = "green";
  ctx.beginPath();
  ctx.arc(npc.x, npc.y, 25, 0, Math.PI * 2);
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
