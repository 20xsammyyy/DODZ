// DODZ - game.js (rewritten + side-facing run animations)

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const W = canvas.width;
const H = canvas.height;


const THEME = {
  bg: "#332b48",
  hudBg: "#3c4059",
  border: "#bc8dff",
  text: "#d4faff",
  textSoft: "#dabaff",
  enemy: "#fc9bd3",
};
// =========================
// SPRITES (spritesheets)
// =========================
const idleImg = new Image();
idleImg.src = "sprites/cat_idle.png"; // 8 frames (row)

const runRightImg = new Image();
runRightImg.src = "sprites/cat_run_e.png"; // 4 frames (row)

const runLeftImg = new Image();
runLeftImg.src = "sprites/cat_run_w.png"; // 4 frames (row)

const FRAME_W = 32;
const FRAME_H = 32;

const IDLE_FRAMES = 8;
const RUN_FRAMES = 4;

let frame = 0;
let frameTimer = 0;

// =========================
// INPUT + STATE
// =========================
let left = false;
let right = false;

let mouseX = 0;
let mouseY = 0;
// 1 = facing right, -1 = facing left (used for idle facing)
let facing = 1;

// Game states: "title" | "playing" | "gameover"
let state = "title";


// =========================
// PLAYER (sprite + hitbox)
// =========================
const SCALE = 2.2;
const SPRITE_W = FRAME_W * SCALE;
const SPRITE_H = FRAME_H * SCALE;

// shrink hitbox so it matches the cat body better
const HITBOX_PAD = 28;

const player = {
  w: SPRITE_W - HITBOX_PAD,
  h: SPRITE_H - HITBOX_PAD,
  x: W / 2 - (SPRITE_W - HITBOX_PAD) / 2,
  y: H - (SPRITE_H - HITBOX_PAD) - 20,
  speed: 2.6,
};

const backBtn = {
  x: 10,
  y: 20,
  w: 70,
  h: 18,
  text: "BACK"
};

const hovering =
  mouseX > backBtn.x &&
  mouseX < backBtn.x + backBtn.w &&
  mouseY > backBtn.y &&
  mouseY < backBtn.y + backBtn.h;

ctx.fillStyle = hovering ? "#8977c9" : "#4c587e";

// =========================
// ENEMIES + SCORING
// =========================
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

  frame = 0;
  frameTimer = 0;

  state = "playing";
}

function startOrRestart() {
  resetGame();
}

// =========================
// INPUT HANDLERS
// =========================
addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") left = true;
  if (e.key === "ArrowRight") right = true;

  if (e.key === " " || e.code === "Space") {
    if (state === "title" || state === "gameover") startOrRestart();
  }
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") left = false;
  if (e.key === "ArrowRight") right = false;
});

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (
    mx > backBtn.x &&
    mx < backBtn.x + backBtn.w &&
    my > backBtn.y &&
    my < backBtn.y + backBtn.h
  ) {
    state = "title";
  }
});

// =========================
// GAME LOGIC
// =========================
function spawnEnemy() {
  const size = 18 + Math.floor(Math.random() * 10);

  // Avoid spawning directly above/near player (feels fairer)
  let x = 0;
  for (let tries = 0; tries < 10; tries++) {
    x = Math.floor(Math.random() * (W - size));
    const tooClose =
      x < player.x + player.w + 25 &&
      x + size > player.x - 25;
    if (!tooClose) break;
  }

  enemies.push({
    w: size,
    h: size,
    x,
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
  // blink timer always updates so title/gameover animates
  blinkT = (blinkT + 1) % 60;

  if (state !== "playing") return;

  // ---- movement
  if (left) {
    player.x -= player.speed;
    facing = -1;
  }
  if (right) {
    player.x += player.speed;
    facing = 1;
  }

  player.x = Math.max(0, Math.min(W - player.w, player.x));

  // ---- animation
  const moving = left || right;

  frameTimer++;
  const animSpeed = moving ? 5 : 8; // lower = faster
  if (frameTimer >= animSpeed) {
    frameTimer = 0;
    const maxFrames = moving ? RUN_FRAMES : IDLE_FRAMES;
    frame = (frame + 1) % maxFrames;
  }

  // ---- enemies spawn
  spawnTimer -= 1;
  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = 22;
  }

  // ---- enemies move
  for (const e of enemies) e.y += e.vy;

  // ---- score when enemies leave screen
  enemies = enemies.filter((e) => {
    if (e.y > H + 30) {
      score += 1;
      return false;
    }
    return true;
  });

  // ---- collisions
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

// =========================
// DRAWING
// =========================
function drawUI() {

  // HUD background
  ctx.fillStyle = "#332b48";
  ctx.fillRect(0, 0, W, 40);

  ctx.font = "10px 'Press Start 2P'";
  ctx.textAlign = "right";

  ctx.fillStyle = "#dabaff";
  ctx.fillText(`BEST ${best}`, W - 10, 16);

  ctx.fillStyle = "#dabaff";
  ctx.fillText(`SCORE ${score}`, W - 10, 34);

  ctx.textAlign = "left";
}

function drawTitleScreen() {
  ctx.fillStyle = THEME.text;
  ctx.textAlign = "center";

  ctx.font = "16px 'Press Start 2P'";
  ctx.fillText("DØDZ", W / 2, 120);

  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("DODGE THE FALLING", W / 2, 170);
  ctx.fillText("ENEMIES", W / 2, 195);
  ctx.fillText("Keys:  ←  →", W / 2, 240);

  if (blinkT < 30) ctx.fillText("PRESS SPACE TO START", W / 2, 300);

  ctx.textAlign = "left";
}

function drawGameOver() {
  ctx.fillStyle = THEME.text;
  ctx.textAlign = "center";

  ctx.font = "14px 'Press Start 2P'";
  ctx.fillText("GAME OVER", W / 2, 220);

  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText(`SCORE ${score}`, W / 2, 260);
  ctx.fillText(`BEST ${best}`, W / 2, 290);

  if (blinkT < 30) ctx.fillText("SPACE TO RESTART", W / 2, 340);

  ctx.textAlign = "left";
}

function drawPlaying() {
  // ---- choose sprite
  const moving = left || right;

  let sprite;

  if (moving) {
    sprite = right ? runRightImg : runLeftImg;
  } else {
    sprite = idleImg;
  }

  // ---- sprite placement (centered on hitbox)
  const drawW = SPRITE_W;
  const drawH = SPRITE_H;

  const drawX = Math.floor(player.x - (drawW - player.w) / 2);
  const drawY = Math.floor(player.y - (drawH - player.h) / 2);

  ctx.drawImage(
    sprite,
    frame * FRAME_W, 0,
    FRAME_W, FRAME_H,
    drawX, drawY,
    drawW, drawH
  );

  // ---- enemies
  ctx.fillStyle = THEME.enemy;
  for (const e of enemies) {
    ctx.fillRect(Math.floor(e.x), Math.floor(e.y), e.w, e.h);
  }

  // ---- (optional) debug hitbox
  // ctx.strokeStyle = "yellow";
  // ctx.strokeRect(Math.floor(player.x), Math.floor(player.y), player.w, player.h);
}

function drawBackButton() {
  if (state === "title") return;

  ctx.fillStyle = "#4c587e";
  ctx.fillRect(backBtn.x, backBtn.y, backBtn.w, backBtn.h);

  ctx.strokeStyle = "#bc8dff";
  ctx.strokeRect(backBtn.x, backBtn.y, backBtn.w, backBtn.h);

  ctx.fillStyle = "#d4faff";
  ctx.font = "8px 'Press Start 2P'";
  ctx.textAlign = "center";

  ctx.fillText(
    backBtn.text,
    backBtn.x + backBtn.w / 2,
    backBtn.y + 12
  );

  ctx.textAlign = "left";
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, W, H);

  drawUI();
  drawBackButton();

  if (state === "title") drawTitleScreen();
  if (state === "playing") drawPlaying();
  if (state === "gameover") drawGameOver();
}


// =========================
// LOOP
// =========================
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();