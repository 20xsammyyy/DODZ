// =========================
// DØDZ — game.js (full)
// =========================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const W = canvas.width;
const H = canvas.height;

// =========================
// PALETTE (Hortensia Diamond)
// =========================
const PAL = {
  field: "#3c4059",
  border: "#bc8dff",
  text: "#d4faff",
  accent: "#00ff88", // your green top logo (if you draw it elsewhere)
  enemy: "#d4faff",  // raindrop light blue
};

// =========================
// SPRITES (spritesheets)
// =========================
const idleImg = new Image();
idleImg.src = "sprites/cat_idle.png"; // 8 frames row

const runEastImg = new Image();
runEastImg.src = "sprites/cat_run_e.png"; // 4 frames row

const runWestImg = new Image();
runWestImg.src = "sprites/cat_run_w.png"; // 4 frames row

const FRAME_W = 32;
const FRAME_H = 32;

const IDLE_FRAMES = 8;
const RUN_FRAMES = 4;

// Sprite scale on canvas
const SCALE = 2.2;
const DRAW_W = FRAME_W * SCALE;
const DRAW_H = FRAME_H * SCALE;

// Hitbox smaller than sprite
const HITBOX_PAD = 10;

// =========================
// INPUT
// =========================
let left = false;
let right = false;
let facing = "east"; // "east" | "west"

// =========================
// GAME STATE
// =========================
let state = "title"; // "title" | "playing" | "gameover"

// =========================
// PLAYER
// =========================
const player = {
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

const ENEMY_SIZE = 14;      // constant small size
const MAX_ENEMIES = 6;      // fewer on screen
const SPAWN_COOLDOWN = 45;  // higher = fewer spawns

// =========================
// UI / BLINK
// =========================
let blinkT = 0;

// =========================
// ANIMATION
// =========================
let frame = 0;
let frameTimer = 0;
let anim = "idle"; // "idle" | "run"

// =========================
// SOUND (SFX)
// =========================
const SFX = {
  start: "audio/start.wav",
  score: "audio/score.wav",
  hit: "audio/hit.wav",
};

let audioUnlocked = false;
let sfxVol = 0.6;

function unlockSound() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  // silent "warm-up" play to satisfy browser rules
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

function rectHit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

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

// =========================
// RESET / START
// =========================
function resetGame() {
  player.x = W / 2 - player.w / 2;
  enemies = [];
  score = 0;

  frame = 0;
  frameTimer = 0;
  anim = "idle";

  spawnTimer = 10; // small delay before first spawn
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
    unlockSound();

    if (state === "title") {
      playSfx(SFX.start);
      startOrRestart();
    } else if (state === "gameover") {
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
// BACK BUTTON
// =========================
const backBtn = { x: 12, y: 12, w: 96, h: 24 };

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * W;
  const my = ((e.clientY - rect.top) / rect.height) * H;

  if ((state === "playing" || state === "gameover") && pointInRect(mx, my, backBtn)) {
    state = "title";
  }
});

// =========================
// UPDATE
// =========================
function update() {
  blinkT = (blinkT + 1) % 60;

  if (state !== "playing") return;

  // Move player
  const moving = left || right;
  if (left) player.x -= player.speed;
  if (right) player.x += player.speed;
  player.x = clamp(player.x, 0, W - player.w);

  // Animation state switching (prevents blank idle)
  const nextAnim = moving ? "run" : "idle";
  if (nextAnim !== anim) {
    anim = nextAnim;
    frame = 0;
    frameTimer = 0;
  }

  // Animate frames
  frameTimer++;
  const animSpeed = anim === "run" ? 5 : 8;
  if (frameTimer >= animSpeed) {
    frameTimer = 0;
    const maxFrames = anim === "run" ? RUN_FRAMES : IDLE_FRAMES;
    frame = (frame + 1) % maxFrames;
  }

  // Spawn enemies
  spawnTimer--;
  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = SPAWN_COOLDOWN;
  }

  // Move enemies
  for (const e of enemies) e.y += e.vy;

  // Passed enemies -> score
  enemies = enemies.filter((e) => {
    if (e.y > H + 30) {
      score += 1;
      playSfx(SFX.score);
      return false;
    }
    return true;
  });

  // Collision
  for (const e of enemies) {
    if (rectHit(player, e)) {
      playSfx(SFX.hit);
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
// DRAW HELPERS
// =========================
function drawBorderAndField() {
  ctx.fillStyle = PAL.field;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = PAL.border;
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, W, H);
  ctx.lineWidth = 1;
}

function drawUI() {
  ctx.fillStyle = PAL.text;
  ctx.font = "10px 'Press Start 2P'";
  ctx.textAlign = "right";

  // more spacing than before
  ctx.fillText(`BEST ${best}`, W - 12, 16);
  ctx.fillText(`SCORE ${score}`, W - 12, 40);

  ctx.textAlign = "left";
}

function drawBackButton() {
  // show during play + gameover
  if (state !== "playing" && state !== "gameover") return;

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

// raindrop enemy
function drawRaindrop(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x, y - r - 3);
  ctx.lineTo(x - r * 0.6, y - r * 0.1);
  ctx.lineTo(x + r * 0.6, y - r * 0.1);
  ctx.closePath();
  ctx.fill();
}

function drawEnemies() {
  ctx.fillStyle = PAL.enemy;
  for (const e of enemies) {
    const r = e.w / 2;
    drawRaindrop(Math.floor(e.x + r), Math.floor(e.y + r), r);
  }
}

function drawPlayer() {
  let sprite = idleImg;

  if (anim === "run") {
    sprite = facing === "west" ? runWestImg : runEastImg;
  } else {
    sprite = idleImg;
  }

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
}

// =========================
// SCREENS
// =========================
function drawTitleScreen() {
  ctx.fillStyle = PAL.text;
  ctx.textAlign = "center";

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
  ctx.fillStyle = PAL.text;
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
  drawBackButton();
  if (state === "title") drawTitleScreen();
  if (state === "playing") drawPlaying();
  if (state === "gameover") {
    drawGameOver();
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