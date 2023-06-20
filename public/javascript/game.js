/* global io, players, curPlayer, gameId */
const messageInput = document.getElementById("usermsg");
const form = document.getElementById("form");
const scoretable = document.querySelector("#scoretable");
const canvas = document.getElementById("game-canvas");
const canvasContainer = document.querySelector(".canvas-container");
const ctx = canvas.getContext("2d");
const warmupBtn = document.getElementById("warmup-btn");
const leaveGameBtn = document.querySelector("#leave-game-btn");
const playerRoundScore = document.getElementById(`#playerRoundScore`);
const roundCounter = document.getElementById(`roundCounter`);

let mode = "warmUp";
let initialCanvasSize = 1000;
let arrowsSVG = new Map();
let scale = 1;

const socket = io({
    query: {
        gameID: gameId,
        userID: curPlayer.userId,
    },
});

socket.on("connect", () => {
    socket.emit("newPlayer", players);
    players.forEach((player) => {
        getArrowSVG(player);
    });
});

socket.on("gameInProgress", (roundNumber) => {
    mode = "game";
    warmupBtn.classList.add("display-none");
    displayRoundNumber(roundNumber);
});

socket.on("chat", (message) => {
    displayMessage(message);
});

socket.on("newPlayer", (player) => {
    displayScoreboard(player);
    getArrowSVG(player);
});

socket.on("leaveGame", (userID) => {
    if (mode === "warmUp") {
        for (let i in players) {
            if (userID === players[i].userId) {
                players.splice(i, 1);
                rerenderScoretable(players);
                break;
            }
        }
    }
    arrowsSVG.delete(userID);
});

socket.on("updatePosition", (updatedPlayers) => {
    updatedPlayers.forEach((updatedPlayer) => {
        if (updatedPlayer.isMoving) {
            updatedPlayer.x *= scale;
            updatedPlayer.y *= scale;
        }
        let i = players.findIndex((el) => el.userId === updatedPlayer.userId);
        if ("path" in updatedPlayer) {
            updatedPlayer.lineWidth *= scale;
            updatedPlayer.synched = true;
            players[i] = updatedPlayer;
        } else {
            updatedPlayer.synched = false;
            for (let key in updatedPlayer) {
                players[i][key] = updatedPlayer[key];
            }
            if (!updatedPlayer.isJumping && !updatedPlayer.isFlying) {
                let pos = { x: updatedPlayer.x, y: updatedPlayer.y };
                players[i].path.push(pos);
            }
        }

        // If the current player collided clear interval
        if (updatedPlayer.userId === curPlayer.userId && mode === "warmUp") {
            if (!players[i].isMoving) {
                warmupBtn.classList.remove("display-none");
            }
        }
    });

    draw(players);
});

socket.on("countdown", (count) => {
    if (mode === "warmUp")
        document.querySelector(".loader").classList.remove("loader");
    mode = "game";
    displayCountdown(count);
});
function displayCountdown(i) {
    if (i === 3) {
        document
            .getElementById("round-win-loader")
            .classList.add("pulse-loader");
        document
            .querySelector(".winner-container")
            .classList.remove("visibility-hidden");
    }
    if (i > 0) document.getElementById("round-win-loader").textContent = i;
    else hideWinner();
}

socket.on("renderScoreTable", (updatedPlayers) => {
    updatedPlayers.forEach((updatedPlayer) => {
        let i = players.findIndex((el) => el.userId === updatedPlayer.userId);
        players[i].leaderboardScore = updatedPlayer.leaderboardScore;
    });
    // Sort leaderboard from highest to lowest
    players.sort((a, b) => b.leaderboardScore - a.leaderboardScore);
    rerenderScoretable(updatedPlayers);
});

socket.on("gameNotFound", function () {
    window.location.href = "/"; // redirects to home page
});

socket.on("gameOver", (winnerName, color) => {
    displayWinner(winnerName, color);
});

socket.on("roundOver", (winnerName, color, roundCounter) => {
    displayRoundWinner(winnerName, color, roundCounter);
});

socket.on("gameMode", () => {
    warmupBtn.classList.add("display-none");
});

socket.on("round", (roundNumber) => {
    displayRoundNumber(roundNumber);
});

function displayRoundNumber(roundNumber) {
    roundCounter.textContent = "Round " + roundNumber;
}

async function getArrowSVG(player) {
    let imgPath = (plural = "s") =>
        `/assets/icons/arrow${plural}_${player.color.replace("#", "")}.svg`;
    let src = player.userId === curPlayer.userId ? imgPath("s") : imgPath("");
    let arrow = await loadImage(src);
    arrowsSVG.set(player.userId, arrow);
}

// Load an image and return a Promise that resolves when the image has loaded
function loadImage(src) {
    return new Promise((resolve) => {
        let img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

function displayWinner(winnerName, color) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let winner = document.querySelector("#winner");
    winner.textContent = winnerName;
    winner.style.color = color;
    document.querySelector("#new-round").classList.add("display-none");
    document.querySelector("#game").textContent = "the game!";
    document.querySelector("#round-win-loader").classList.add("display-none");
    document.querySelector("#leave-game-btn").classList.remove("display-none");
    document
        .querySelector(".winner-container")
        .classList.remove("visibility-hidden");
    confetti();
}

function displayRoundWinner(winnerName, color, roundCounter) {
    if (roundCounter === 1) {
        let element = document.querySelector(".winner-text");
        element.classList.remove("display-none");
    }
    let winner = document.querySelector("#winner");
    winner.textContent = winnerName;
    winner.style.color = color;
    document.querySelector("#game").textContent = `round ${roundCounter}`;
    document
        .querySelector(".winner-container")
        .classList.remove("visibility-hidden");
}

function hideWinner() {
    document
        .querySelector(".winner-container")
        .classList.add("visibility-hidden");
    let winner = document.querySelector("#winner");
    winner.textContent = "";
    winner.style.color = "";
    document.querySelector("#game").textContent = "";
    let element = document.getElementById("round-win-loader");
    element.classList.remove("pulse-loader");
}

leaveGameBtn.addEventListener("click", () => {
    window.location.href = "/";
});

window.addEventListener("resize", resizeCanvas);
function resizeCanvas() {
    let width = canvasContainer.clientWidth;
    let height = canvasContainer.clientHeight;
    let size = width < height ? width : height;
    canvas.width = canvas.height = size;
    scale = size / initialCanvasSize; // scale as a ratio
    canvasContainer.classList.remove("visibility-hidden");
    document.querySelector(".winner-wrapper").style.width = `${size}px`;
}
resizeCanvas();

function draw(players) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    players.forEach((player) => {
        if (player.isMoving) {
            ctx.strokeStyle = player.color;
            ctx.fillStyle = player.color;
            ctx.lineWidth = player.lineWidth;
            ctx.lineCap = "round";
            const radius = player.lineWidth / 2;

            if (player.isFlying || player.path.length === 1) {
                drawDot(player, radius);
                drawArrowSvg(player);
            } else if (player.path.length > 1) {
                drawLine(player, radius);
            }
        }
    });
}

function drawLine(player, radius) {
    // Draws the entire path for every animation frame so the line is smooth
    ctx.beginPath();
    if (player.synched) scalePathVal(player, 0);
    ctx.moveTo(player.path[0].x, player.path[0].y);
    for (let i = 1, j = 0; i < player.path.length; i++) {
        if (player.synched) scalePathVal(player, i);
        if (i == player.jumps[j]) {
            // Draws the gaps in the line. Checks if last jump
            if (player.jumps.length > j) {
                // If the position in the path is equal to the current player position after a jump then there is not enough points to make a line, therefore we need to draw a dot instead
                if (
                    player.path[i].x === player.x &&
                    player.path[i].y === player.y
                ) {
                    ctx.stroke();
                    drawDot(player, radius);
                    return;
                }
                j++;
                ctx.moveTo(player.path[i].x, player.path[i].y);
            } else break;
        } else {
            ctx.lineTo(player.path[i].x, player.path[i].y);
        }
    }
    ctx.stroke();
    if (player.isJumping) drawDot(player, radius);
}

function scalePathVal(player, i) {
    player.path[i].x *= scale;
    player.path[i].y *= scale;
}

function drawArrowSvg(player) {
    let imgScale = scale * 0.75;
    let img = arrowsSVG.get(player.userId);
    if (img) {
        let newWidth = img.width * imgScale;
        let newHeight = img.height * imgScale;

        ctx.save(); // save the current transformation matrix

        // translate the context to the center point and rotate
        ctx.translate(player.x, player.y);
        ctx.rotate(player.direction + Math.PI / 2); // Turn direction by 90 degrees in radians

        // draw the image centered on the point and rotated
        ctx.drawImage(
            img,
            -newWidth / 2,
            -newHeight - player.lineWidth,
            newWidth,
            newHeight
        );
        ctx.restore(); // restore the saved transformation matrix
    }
}

function drawDot(player, radius) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, 2 * Math.PI);
    ctx.fill();
}

// Object to store the state of the arrow keys
const keyState = {
    ArrowLeft: 0,
    ArrowRight: 0,
};

warmupBtn.addEventListener("click", startWarmup);
function startWarmup() {
    socket.emit("warmUp");
    warmupBtn.classList.add("display-none");
}

// Update keyState based on keydown and keyup events
document.addEventListener("keydown", (event) => {
    let key = event.key;
    if (!keyState[key]) {
        if (key == "ArrowLeft") {
            keyState[key] = keyState.ArrowRight + 1;
            socket.emit("keyState", keyState);
        } else if (key == "ArrowRight") {
            keyState[key] = keyState.ArrowLeft + 1;
            socket.emit("keyState", keyState);
        }
    }
});

document.addEventListener("keyup", (event) => {
    if (event.key in keyState) {
        keyState[event.key] = 0;
        socket.emit("keyState", keyState);
    }
});

form.addEventListener("submit", (e) => {
    e.preventDefault();
    let message = messageInput.value;
    if (message === "") return;
    message = `<span style="color: ${curPlayer.color}">${curPlayer.username}:</span> ${message}`;
    socket.emit("chat", message);
    displayMessage(message);
    messageInput.value = "";
});

function displayMessage(message) {
    const li = document.createElement("li");
    const p = document.createElement("p");
    p.innerHTML = message;
    li.appendChild(p);
    document.getElementById("textbox").appendChild(li);
    const textbox = document.getElementById("textbox");
    textbox.scrollTop = textbox.scrollHeight;
}

function displayScoreboard(newPlayer) {
    let html = scoretable.innerHTML;
    players.push(newPlayer);
    html += `<div id="player${newPlayer.color}" class="player">
                    <div id="playerRoundScore" class="playerRoundScore"></div>
                    <div class="playerIcon">${players.length}</div>
                    <div class="playerName" style="color: ${newPlayer.color}">${newPlayer.username}</div>
                    <div class="playerScore">0</</div>
            </div>`;
    scoretable.innerHTML = html;
}

function rerenderScoretable(updatedPlayers) {
    let html = "";
    for (let i = 0; i < updatedPlayers.length; i++) {
        // Add some function to hide playerRoundScore when player.collided is false and vice versa
        html += `<div id="player${updatedPlayers[i].color}" class="player">  
                    <div id="playerRoundScore" class="playerRoundScore" style="background-color: ${
                        updatedPlayers[i].color
                    }">+${updatedPlayers[i].roundScore}</div>
                    <div class="playerIcon">${i + 1}</div>
                    <div class="playerName" style="color: ${
                        updatedPlayers[i].color
                    };">${updatedPlayers[i].username}</div>
                    <div class="playerScore">${
                        updatedPlayers[i].leaderboardScore
                    }</div>
            </div>`;
        scoretable.innerHTML = html;
    }
}
