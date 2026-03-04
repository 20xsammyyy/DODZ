const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

// Input
let left = false, right = false;

// Game states: "title" | "playing" | "gameover"
let state = "title";

// Player
const player = { w: 18, h: 18, x: W / 2 - 9, y: H - 30, speed: 2.6 };

// Enemies + scoring
let enemies = [];
let spawnTimer = 0;
let score = 0;
let best = Number(localStorage.getItem("dodz_best") || 0);

// Blink timer for "PRESS SPACE"
let blinkT = 0;

function resetGame() {
  player.x = W / 2 - player.w / 2;
  enemies = [];
  spawnTimer = 0;
  score = 0;
  state = "playing";
}

function startOrRestart() {
  resetGame();
}

addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") left = true;
  if (e.key === "ArrowRight") right = true;

  if (e.key === " " || e.code === "Space") {
    if (state === "title" || state === "gameover") {
      startOrRestart();
    }
  }
});

addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") left = false;
  if (e.key === "ArrowRight") right = false;
});

function spawnEnemy() {
  const size = 14 + Math.floor(Math.random() * 8);
  enemies.push({
    w: size,
    h: size,
    x: Math.floor(Math.random() * (W - size)),
    y: -size,
    vy: 1.4 + Math.random() * 1.6,
  });
}

function hit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function update() {
  // Always update blink timer so title screen animates
  blinkT = (blinkT + 1) % 60;

  if (state !== "playing") return;

  // Move player
  if (left) player.x -= player.speed;
  if (right) player.x += player.speed;
  player.x = Math.max(0, Math.min(W - player.w, player.x));

  // Spawn enemies
  spawnTimer -= 1;
  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = 22; // lower = harder
  }

  // Move enemies
  for (const e of enemies) e.y += e.vy;

  // Remove enemies that passed + score
  enemies = enemies.filter((e) => {
    if (e.y > H + 30) {
      score += 1;
      return false;
    }
    return true;
  });

  // Collision
  for (const e of enemies) {
    if (hit(player, e)) {
      state = "gameover";
      if (score > best) {
        best = score;
        localStorage.setItem("dodz_best", String(best));
      }
      break;
    }
  }
}

function drawUI() {
  // Top HUD bar (simple)
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, 26);

  ctx.fillStyle = "#00ff88";
  ctx.font = "10px 'Press Start 2P'";

  ctx.fillText(`SCORE ${score}`, 10, 18);

  // Right aligned BEST
  const bestText = `BEST ${best}`;
  const textW = ctx.measureText(bestText).width;
  ctx.fillText(bestText, W - textW - 10, 18);
}

function drawTitleScreen() {
  ctx.fillStyle = "#00ff88";
  ctx.textAlign = "center";

  // Title
  ctx.font = "16px 'Press Start 2P'";
  ctx.fillText("DODZ", W / 2, 120);

  // Instructions
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("DODGE THE FALLING", W / 2, 170);
  ctx.fillText("ENEMIES", W / 2, 195);

  ctx.fillText("MOVE:  ←  →", W / 2, 240);

  // Blinking start message
  if (blinkT < 30) {
    ctx.fillText("PRESS SPACE TO START", W / 2, 300);
  }

  // Reset alignment for other UI elements
  ctx.textAlign = "left";
}

function drawGameOver() {
  ctx.fillStyle = "#00ff88";
  ctx.textAlign = "center";

  ctx.font = "14px 'Press Start 2P'";
  ctx.fillText("GAME OVER", W / 2, 220);

  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText(`SCORE ${score}`, W / 2, 260);
  ctx.fillText(`BEST ${best}`, W / 2, 290);

  if (blinkT < 30) {
    ctx.fillText("SPACE TO RESTART", W / 2, 340);
  }

  // restore default alignment
  ctx.textAlign = "left";
}

function drawPlaying() {
  // Player
  ctx.fillStyle = "#00ff88";
  ctx.fillRect(Math.floor(player.x), Math.floor(player.y), player.w, player.h);

  // Enemies
  ctx.fillStyle = "#ff2d55";
  for (const e of enemies) {
    ctx.fillRect(Math.floor(e.x), Math.floor(e.y), e.w, e.h);
  }
}

function draw() {
  // Clear background
  ctx.clearRect(0, 0, W, H);

  // Draw game "field"
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // UI always visible
  drawUI();

  if (state === "title") drawTitleScreen();
  if (state === "playing") drawPlaying();
  if (state === "gameover") drawGameOver();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();