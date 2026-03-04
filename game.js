const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

let left = false, right = false;
let running = false;
let gameOver = false;

const player = { w: 18, h: 18, x: W / 2 - 9, y: H - 30, speed: 2.6 };
let enemies = [];
let spawnTimer = 0;
let score = 0;

function resetGame() {
  player.x = W / 2 - player.w / 2;
  enemies = [];
  spawnTimer = 0;
  score = 0;
  gameOver = false;
  running = true;
}

addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") left = true;
  if (e.key === "ArrowRight") right = true;

  if (e.key === " " || e.code === "Space") {
    if (!running || gameOver) resetGame();
    else running = !running; // pause/unpause
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
  if (!running || gameOver) return;

  if (left) player.x -= player.speed;
  if (right) player.x += player.speed;
  player.x = Math.max(0, Math.min(W - player.w, player.x));

  spawnTimer -= 1;
  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = 22; // lower = harder
  }

  for (const e of enemies) e.y += e.vy;

  // remove off-screen + score
  enemies = enemies.filter((e) => {
    if (e.y > H + 30) { score += 1; return false; }
    return true;
  });

  for (const e of enemies) {
    if (hit(player, e)) {
      gameOver = true;
      running = false;
      break;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // player
  ctx.fillStyle = "#00ff88";
  ctx.fillRect(Math.floor(player.x), Math.floor(player.y), player.w, player.h);

  // enemies
  ctx.fillStyle = "#ff2d55";
  for (const e of enemies) {
    ctx.fillRect(Math.floor(e.x), Math.floor(e.y), e.w, e.h);
  }

  // UI
  ctx.fillStyle = "#ffffff";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText(`SCORE ${score}`, 10, 18);

  if (!running && !gameOver) {
    ctx.fillText("PRESS SPACE", 70, H / 2);
  }
  if (gameOver) {
    ctx.fillText("GAME OVER", 80, H / 2 - 10);
    ctx.fillText("SPACE TO RESTART", 30, H / 2 + 20);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

running = false; // start on title screen
loop();