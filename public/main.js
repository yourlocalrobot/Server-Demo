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
window.addEventListener('resize', function() {
	canvas.width = window.innerWidth; // - (2 * circleRadius);
	canvas.height = window.innerHeight; // - (2 * circleRadius);
	drawAllEntities(); // Redraw everything to fit the new size
});

// Initial player configuration
let playerX = Math.floor(Math.random() * 301);
let playerY = Math.floor(Math.random() * 301);

// Data structures to hold other players and NPCs
let otherPlayers = {};
let npcs = [];
let allEntities = [];
let playerObj = [];
let humanObj = [];
let polygons = [];
let entities = [];

//movement info
let destination = {
	x: null,
	y: null
};
const speed = 5;
let animationFrameId = null; // To keep track of the animation frame

//npc click info
let clickedNPC = null;

// Initialize canvas with a black background
ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Event listeners
document.addEventListener("keydown", handleKeydown);
document.addEventListener("mousedown", (event) => {
	event.preventDefault();
});

//click
canvas.addEventListener("click", moveToClickPosition);
document.addEventListener('keydown', handleArrowKeyPress);

// Socket listeners
socket.on("updatePlayers", (players) => {
	otherPlayers = players;
	delete otherPlayers[socket.id];
	drawAllEntities();
});

socket.on("updatePlayer", (playerData) => {
	otherPlayers[playerData.id] = {
		x: playerData.x,
		y: playerData.y
	};
	drawAllEntities();
});

socket.on("updatePlayerObj", (newplayerObj) => {
	
	socket.emit('updatePlayerPosition', {
		x: playerX,
		y: playerY
	});
	
	playerObj = newplayerObj[0];
	drawAllEntities();
});

socket.on("otherPlayerObj", (otherPlayersObj) => {
	humanObj = otherPlayersObj[0];
	drawAllEntities();
});

socket.on("updateNPCs", (updatedNPCs) => {
	npcs = updatedNPCs;
	drawAllEntities();
});

socket.on("updatePolygons", (allPolygons) => {
	polygons = allPolygons;
	drawAllEntities();
});

socket.on("playerDisconnected", (playerId) => {
	delete otherPlayers[playerId];
	drawAllEntities();
});

function moveToClickPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left + playerX - canvas.width / 2;
  const y = event.clientY - rect.top + playerY - canvas.height / 2;

  destination.x = x;
  destination.y = y;

  if (clickedNPC) {
    socket.emit('npcInteraction', {
      action: 'complete',
      clickedNPC
    });
  }

  npcs.forEach((npc) => {
    const dx = Math.abs(npc.x - x);
    const dy = Math.abs(npc.y - y);
    if (dx <= npc.appearance.radius && dy <= npc.appearance.radius) {
      clickedNPC = npc;
      socket.emit('npcInteraction', {
        action: 'start',
        npc
      });
    }
  });

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
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
		let canMove = true;
		for (let polygon of polygons) {
			if (isInsidePolygon({
					x: newX,
					y: newY
				}, polygon)) {
				canMove = false;
				break;
			}
		}

		if (canMove) {
			if (newX >= 0 && newX <= canvas.width) {
				playerX = newX;
			}
			if (newY >= 0 && newY <= canvas.height) {
				playerY = newY;
			}
		}

		// Emit the player's new position to the server
		socket.emit('updatePlayerPosition', {
			x: playerX,
			y: playerY
		});

		drawAllEntities();

		// Continue the animation
		animationFrameId = requestAnimationFrame(movePlayer);
	} else {
		// Player has reached or is very close to the destination
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

// Create an object to keep track of key states
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

// Update key states on keydown and keyup
document.addEventListener('keydown', (event) => {
  if (keys.hasOwnProperty(event.code)) {
    keys[event.code] = true;
  }
  handleKeydown();
});

document.addEventListener('keyup', (event) => {
  if (keys.hasOwnProperty(event.code)) {
    keys[event.code] = false;
  }
});

function handleKeydown() {
  let dx = 0,
      dy = 0;

  if (keys.ArrowUp) dy -= 5;
  if (keys.ArrowDown) dy += 5;
  if (keys.ArrowLeft) dx -= 5;
  if (keys.ArrowRight) dx += 5;

  // Collision detection for player using arrow keys
  const newX = playerX + dx;
  const newY = playerY + dy;
  let canMove = true;

  for (let polygon of polygons) {
    if (isInsidePolygon({ x: newX, y: newY }, polygon)) {
      canMove = false;
      break;
    }
  }

  if (canMove) {
    if (newX >= 0 && newX <= canvas.width) {
      playerX = newX;
    }
    if (newY >= 0 && newY <= canvas.height) {
      playerY = newY;
    }
  }

  socket.emit('updatePlayerPosition', {
    x: playerX,
    y: playerY
  });
  drawAllEntities();
}

// Drawing functions
function drawPlayer(x, y) {
	ctx.fillStyle = playerObj.appearance.color;
	ctx.beginPath();
	ctx.arc(x, y, playerObj.appearance.radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.font = '16px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('Player', x, y - playerObj.appearance.radius - 10);
}

function drawOtherPlayer(x, y) {
	ctx.fillStyle = humanObj.appearance.color;
	ctx.beginPath();
	ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
	ctx.fill();
	ctx.font = '16px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('Human', x, y - humanObj.appearance.radius - 10);
}

function drawNPC(npc) {
  // Reset shadow properties
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Check if the NPC is glowing
  if (npc.isGlowing && npc.npc_name) {
    console.log(npc.npc_name + ' is glowing');
    // Set shadow properties for glow effect
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 15;
  }

  // Draw the NPC
  ctx.fillStyle = npc.appearance.color;
  ctx.beginPath();
  ctx.arc(npc.x, npc.y, npc.appearance.radius, 0, Math.PI * 2);
  ctx.fill();

  // Reset shadow properties for text
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Draw NPC name above the NPC
  if (npc.npc_name) {
    ctx.font = '16px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(npc.npc_name, npc.x, npc.y - npc.appearance.radius - 10);
  }
}

function drawPolygon(polygon) {
	const {
		vertices,
		appearance
	} = polygon;
	ctx.beginPath();
	ctx.moveTo(vertices[0].x, vertices[0].y);
	for (let i = 1; i < vertices.length; i++) {
		ctx.lineTo(vertices[i].x, vertices[i].y);
	}
	ctx.closePath();
	ctx.fillStyle = appearance.color;
	ctx.fill();
}

function translateCanvasToPlayer(x, y) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(-x + canvas.width / 2, -y + canvas.height / 2);
}

function drawAllEntities() {
  translateCanvasToPlayer(playerX, playerY);
  
  ctx.fillStyle = "black";
  ctx.fillRect(playerX - canvas.width / 2, playerY - canvas.height / 2, canvas.width, canvas.height);

  drawPlayer(playerX, playerY);
	
	for (let playerId in otherPlayers) {
		let player = otherPlayers[playerId];
		console.log(player);
		drawOtherPlayer(player.x, player.y);
	}

	for (let npc of npcs) {
		drawNPC(npc);
	}
	
	// Reset shadow properties after drawing all NPCs
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

	for (let polygon of polygons) {

		drawPolygon(polygon);

	}

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

// Hard refresh the page every 30 seconds (30000 milliseconds)
setInterval(function() {
  location.reload(true);
}, 6000000);
