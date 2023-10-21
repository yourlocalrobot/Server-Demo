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
let playerX = 50;
let playerY = 50;

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
const speed = 3;
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
	const x = event.clientX - rect.left;
	const y = event.clientY - rect.top;

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

function handleKeydown(event) {
	let dx = 0,
		dy = 0;
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
}

function drawOtherPlayer(x, y) {
	ctx.fillStyle = humanObj.appearance.color;
	ctx.beginPath();
	ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
	ctx.fill();
}

function drawNPC(npc) {
	ctx.fillStyle = npc.appearance.color;
	ctx.beginPath();
	ctx.arc(npc.x, npc.y, npc.appearance.radius, 0, Math.PI * 2);
	ctx.fill();
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