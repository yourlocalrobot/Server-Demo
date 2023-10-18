const socket = io();

// Create canvas context and set initial configurations
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = "blue";

let playerX = 50;
let playerY = 50;

let otherPlayers = {};

let npcs = [];

socket.on("updateNPCs", (updatedNPCs) => {
  npcs = updatedNPCs;
  drawAllEntities();  // We'll define this function to redraw everything.
});

function drawNPC(npc) {
  ctx.beginPath();
  ctx.fillStyle = "green";  // For example, NPCs can be in green.
  ctx.arc(npc.x, npc.y, 25, 0, Math.PI * 2);  // Assuming the NPCs are also represented as circles.
  ctx.fill();
}

// Draw the initial player position
drawPlayer(playerX, playerY);

document.addEventListener("keydown", (event) => {
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

  // Emit the new player position to the server
  socket.emit('updatePlayerPosition', { x: playerX, y: playerY });

  // Redraw canvas
   drawAllEntities();
});

document.addEventListener("mousedown", function(event){
  event.preventDefault();
});

function drawPlayer(x, y) {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();  // Start a new path
  ctx.fillStyle = "blue";
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();
}

// Listen for other players' position updates
socket.on("updatePlayers", (players) => {
  otherPlayers = players;
  // Exclude own player data using socket.id, if needed
  delete otherPlayers[socket.id];
  drawAllEntities();
});

socket.on("updatePlayer", (playerData) => {
  otherPlayers[playerData.id] = { x: playerData.x, y: playerData.y };
  drawAllEntities();
});

function drawAllPlayers() {
  // Clear canvas
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw main player
  drawPlayer(playerX, playerY);

  // Draw other players
  for (let playerId in otherPlayers) {
    let player = otherPlayers[playerId];
    drawOtherPlayer(player.x, player.y);
  }
}

function drawOtherPlayer(x, y) {
  ctx.beginPath();
  ctx.fillStyle = "red";  // You can choose a different color for other players
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();
}

function drawAllEntities() {
  // Clear canvas
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw main player
  drawPlayer(playerX, playerY);

  // Draw other players
  for (let playerId in otherPlayers) {
    let player = otherPlayers[playerId];
    drawOtherPlayer(player.x, player.y);
  }

  // Draw NPCs
  for (let npc of npcs) {
    drawNPC(npc);
  }
}


