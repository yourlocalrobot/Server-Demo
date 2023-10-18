const socket = io();

// Create canvas context and set initial configurations
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = "blue";

let playerX = 50;
let playerY = 50;

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
  drawPlayer(playerX, playerY);
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
