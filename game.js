// =========================
// DODZ — game.js (full)
// =========================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Keep pixel art crisp
ctx.imageSmoothingEnabled = false;

const W = canvas.width;
const H = canvas.height;

// =========================
// PALETTE (Hortensia Diamond)
// =========================
const PAL = {
  bgOuter: "#332b48",    // optional page bg if you use it elsewhere
  field:   "#3c4059",    // playfield fill
  border:  "#bc8dff",    // border
  text:    "#d4faff",    // HUD + UI text
  enemy:   "#fc9bd3",    // enemies (pink)
  accent:  "#00ff88",    // keep your green DODZ title at the top
};

// =========================
// SPRITES (spritesheets)
// =========================
const idleImg = new Image();
idleImg.src = "sprites/cat_idle.png";   // 8 frames (row)

const runEastImg = new Image();
runEastImg.src = "sprites/cat_run_e.png"; // 4 frames (row)

const runWestImg = new Image();
runWestImg.src = "sprites/cat_run_w.png"; // 4 frames (row)

const FRAME_W = 32;
const FRAME_H = 32;

const IDLE_FRAMES = 8;
const RUN_FRAMES = 4;

// Sprite scale on canvas
const SCALE = 2.2;
const DRAW_W = FRAME_W * SCALE;
const DRAW_H = FRAME_H * SCALE;

// Player hitbox smaller than sprite (feels fair)
const HITBOX_PAD = 10;

// =========================
// INPUT
// =========================
let left = false;
let right = false;

// Remember last direction so idle can face that way if you ever want it later
let facing = "east"; // "east" | "west"

// =========================
// GAME STATE
// =========================
let state = "title"; // "title" | "playing" | "gameover"

// =========================
// PLAYER
// =========================
const player = {
  // hitbox size (NOT draw size)
  w: DRAW_W - HITBOX_PAD,
  h: DRAW_H - HITBOX_PAD,
  x: W / 2 - (DRAW_W - HITBOX_PAD) / 2,
  y: H - (DRAW_H - HITBOX_PAD) - 20,
  speed: 2.6,
};

// =========================
// ENEMIES + SCORING
// =========================
let enemies = [];
let spawnTimer = 0;
let score = 0;
let best = Number(localStorage.getItem("dodz_best") || 0);

// Blink timer for "PRESS SPACE"
let blinkT = 0;

// =========================
// ANIMATION
// =========================
let frame = 0;
let frameTimer = 0;

// IMPORTANT: Keep separate “which animation we’re on” so idle doesn’t go blank
let anim = "idle"; // "idle" | "run"

// =========================
// SOUND (SFX)
// =========================
const SFX = {
  start: "audio/start.wav",
  score: "audio/score.wav",
  hit: "audio/hit.wav"
};

let audioUnlocked = false;
let sfxVol = 0.6;

function unlockSound() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  try {
    const a = new Audio();
    a.volume = 0;
    a.play().catch(() => {});
  } catch {}
}

function playSfx(src) {
  if (!audioUnlocked || !src) return;

  const a = new Audio(src);
  a.volume = sfxVol;
  a.play().catch(() => {});
}

// =========================
// HELPERS
// =========================
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

const ENEMY_SIZE = 14;      // small size you like
const MAX_ENEMIES = 7;      // caps how many can exist at once
const SPAWN_COOLDOWN = 40;  // higher = fewer spawns (try 40–55)

function spawnEnemy() {
  if (enemies.length >= MAX_ENEMIES) return;

  enemies.push({
    w: ENEMY_SIZE,
    h: ENEMY_SIZE,
    x: Math.floor(Math.random() * (W - ENEMY_SIZE)),
    y: -ENEMY_SIZE,
    vy: 1.6 + Math.random() * 0.9,
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

// =========================
// RESET / START
// =========================
function resetGame() {
  player.x = W / 2 - player.w / 2;
  enemies = [];
  spawnTimer = 0;
  score = 0;

  // Reset animation cleanly
  frame = 0;
  frameTimer = 0;
  anim = "idle";

  state = "playing";
}

function startOrRestart() {
  resetGame();
}

// =========================
// INPUT EVENTS
// =========================
addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") {
    left = true;
    facing = "west";
  }
  if (e.key === "ArrowRight") {
    right = true;
    facing = "east";
  }

  if (e.key === " " || e.code === "Space") {
    // Unlock audio on the first user gesture
    unlockSound();

    if (state === "title" || state === "gameover") {
      playSfx(SFX.start);
      startOrRestart();
    }
  }
});

addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") left = false;
  if (e.key === "ArrowRight") right = false;
});

// =========================
// UPDATE
// =========================
function update() {
  // Always update blink timer so title/gameover animates
  blinkT = (blinkT + 1) % 60;

  if (state !== "playing") return;

  // Move player
  const moving = left || right;

  if (left) player.x -= player.speed;
  if (right) player.x += player.speed;
  player.x = clamp(player.x, 0, W - player.w);

  // ---- Animation state switching (prevents “blank” on stop) ----
  const nextAnim = moving ? "run" : "idle";
  if (nextAnim !== anim) {
    anim = nextAnim;
    frame = 0;
    frameTimer = 0;
  }

  // Animate
  frameTimer++;
  const animSpeed = anim === "run" ? 5 : 8; // lower = faster
  if (frameTimer >= animSpeed) {
    frameTimer = 0;
    const maxFrames = anim === "run" ? RUN_FRAMES : IDLE_FRAMES;
    frame = (frame + 1) % maxFrames;
  }

  // Spawn enemies
  spawnTimer -= 1;
  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = SPAWN_COOLDOWN;
  }

  // Move enemies
  for (const e of enemies) e.y += e.vy;

  // Remove enemies that passed + score
  enemies = enemies.filter((e) => {
    if (e.y > H + 30) {
      score += 1;
      playSfx(SFX.score);   // 🔊 score sound
      return false;
    }
    return true;
});

  // Collision
  for (const e of enemies) {
    if (hit(player, e)) {
      playSfx(SFX.hit);   // 🔊 hit sound
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
// DRAW — UI
// =========================
function drawBorderAndField() {
  // Field background
  ctx.fillStyle = PAL.field;
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = PAL.border;
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, W, H);
  ctx.lineWidth = 1;
}

function drawUI() {
  ctx.fillStyle = PAL.text;
  ctx.font = "10px 'Press Start 2P'";
  ctx.textAlign = "right";

  // Add a bit more vertical spacing than before
  ctx.fillText(`BEST ${best}`, W - 12, 16);
  ctx.fillText(`SCORE ${score}`, W - 12, 34);

  ctx.textAlign = "left";
}

// Simple clickable BACK button (top-left)
const backBtn = { x: 12, y: 12, w: 96, h: 24 };

function drawBackButton() {
  // Only show on gameover (change this if you want it during play too)
  if (state !== "gameover") return;

  ctx.fillStyle = "#00000033";
  ctx.fillRect(backBtn.x, backBtn.y, backBtn.w, backBtn.h);

  ctx.strokeStyle = PAL.border;
  ctx.strokeRect(backBtn.x, backBtn.y, backBtn.w, backBtn.h);

  ctx.fillStyle = PAL.text;
  ctx.font = "10px 'Press Start 2P'";
  ctx.textAlign = "center";
  ctx.fillText("BACK", backBtn.x + backBtn.w / 2, backBtn.y + 16);
  ctx.textAlign = "left";
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// Mouse click for BACK
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * W;
  const my = ((e.clientY - rect.top) / rect.height) * H;

  if (state === "gameover" && pointInRect(mx, my, backBtn)) {
    state = "title";
  }
});

// =========================
// DRAW — SCREENS
// =========================
function drawTitleScreen() {
  // Keep green title outside the field
  // (If your title is drawn elsewhere in HTML/CSS, remove this section)
  ctx.fillStyle = PAL.accent;
  ctx.textAlign = "center";
  ctx.font = "16px 'Press Start 2P'";
  // If you draw title outside canvas, ignore this.
  // ctx.fillText("DODZ", W / 2, 70);

  // In-field text
  ctx.fillStyle = PAL.text;
  ctx.font = "16px 'Press Start 2P'";
  ctx.fillText("DØDZ", W / 2, 120);

  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("DODGE THE FALLING", W / 2, 170);
  ctx.fillText("ENEMIES", W / 2, 195);

  ctx.fillText("KEYS:  ←  →", W / 2, 240);

  if (blinkT < 30) {
    ctx.fillText("PRESS SPACE TO START", W / 2, 300);
  }

  ctx.textAlign = "left";
}

function drawGameOver() {
  ctx.fillStyle = "#d4faff";
  ctx.textAlign = "center";

  const cx = W / 2;
  const cy = H / 2;

  ctx.font = "14px 'Press Start 2P'";
  ctx.fillText("GAME OVER", cx, cy - 40);

  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText(`SCORE ${score}`, cx, cy);
  ctx.fillText(`BEST ${best}`, cx, cy + 30);

  if (blinkT < 30) {
    ctx.fillText("SPACE TO RESTART", cx, cy + 80);
  }

  ctx.textAlign = "left";
}

// =========================
// DRAW — PLAYING
// =========================
function drawPlayer() {
  // Choose sprite based on anim + direction
  let sprite = idleImg;

  if (anim === "run") {
    sprite = facing === "west" ? runWestImg : runEastImg;
  } else {
    // idle always uses idle sheet (prevents blank)
    sprite = idleImg;
  }

  // Draw sprite centered over hitbox
  const drawX = Math.floor(player.x - (DRAW_W - player.w) / 2);
  const drawY = Math.floor(player.y - (DRAW_H - player.h) / 2);

  ctx.drawImage(
    sprite,
    frame * FRAME_W,
    0,
    FRAME_W,
    FRAME_H,
    drawX,
    drawY,
    DRAW_W,
    DRAW_H
  );

  // (Optional) debug hitbox:
  // ctx.strokeStyle = "#ffff00";
  // ctx.strokeRect(Math.floor(player.x), Math.floor(player.y), player.w, player.h);
}

function drawRaindrop(x, y, r) {
  // droplet body
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // tiny “tip” to look more droplet-like
  ctx.beginPath();
  ctx.moveTo(x, y - r - 3);
  ctx.lineTo(x - r * 0.6, y - r * 0.1);
  ctx.lineTo(x + r * 0.6, y - r * 0.1);
  ctx.closePath();
  ctx.fill();
}

function drawPlaying() {
  drawEnemies();
  drawPlayer();
}

// =========================
// MAIN DRAW
// =========================
function draw() {
  ctx.clearRect(0, 0, W, H);

  drawBorderAndField();
  drawUI();

  if (state === "title") drawTitleScreen();
  if (state === "playing") drawPlaying();
  if (state === "gameover") {
    drawGameOver();
    drawBackButton();
  }
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