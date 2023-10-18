const socket = io();

// Listen for events and emit actions here

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Create initial elements
ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = "blue";
ctx.arc(50, 50, 25, 0, Math.PI * 2);
ctx.fill();

let playerX = 50;
let playerY = 50;

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

  // Redraw canvas
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "blue";
  ctx.arc(playerX, playerY, 25, 0, Math.PI * 2);
  ctx.fill();
});
