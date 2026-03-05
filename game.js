// =========================
// D0DZ
// =========================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const W = canvas.width;
const H = canvas.height;

const GROUND_Y = H - 10;      // where Pixie stands — tune this
const BUILDING_BASE = H - 30; // buildings always anchored near canvas bottom

const PAL = {
  field: "#3c4059",
  border: "#bc8dff",
  text: "#d4faff",
  enemy: "#d4faff",
  accent: "#00ff88",
};

// =========================
// SPRITES
// =========================
const idleImg = new Image();
idleImg.src = "sprites/cat_idle.png";

const runEastImg = new Image();
runEastImg.src = "sprites/cat_run_e.png";

const runWestImg = new Image();
runWestImg.src = "sprites/cat_run_w.png";

const sitImg = new Image();
sitImg.src = "sprites/cat_sit.png";

const FRAME_W = 32;
const FRAME_H = 32;

const IDLE_FRAMES = 8;
const RUN_FRAMES = 4;
const SIT_FRAMES = 6;

const SCALE = 2.2;
const DRAW_W = FRAME_W * SCALE;
const DRAW_H = FRAME_H * SCALE;
const HITBOX_PAD = 10;

// =========================
// INPUT
// =========================
let left = false;
let right = false;
let facing = "east";

let dust = [];   // running puffs
let splash = []; // raindrop splashes

let mouseX = 0;
let mouseY = 0;

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = ((e.clientX - rect.left) / rect.width) * W;
  mouseY = ((e.clientY - rect.top) / rect.height) * H;
});

// =========================
// GAME STATE
// =========================
let state = "title";
let selectedMode = 0; // 0=easy, 1=medium, 2=hard

const MODES = [
  {
    label: "EASY",
    drops: 1,
    speedMult: 1.0,
    spawnBase: 55,
    spawnMin: 30,
    maxEnemies: 4,
    scoreMult: 0.015,
  },
  {
    label: "MEDIUM",
    drops: 2,
    speedMult: 1.4,
    spawnBase: 40,
    spawnMin: 22,
    maxEnemies: 5,
    scoreMult: 0.025,
  },
  {
    label: "HARD",
    drops: 3,
    speedMult: 1.9,
    spawnBase: 28,
    spawnMin: 14,
    maxEnemies: 7,
    scoreMult: 0.035,
  },
];

// =========================
// LOADING SCREEN
// =========================
const LOAD_DURATION = 120;
const LOAD_BLOCKS = 10;
let loadTimer = 0;
let scaredFlicker = 0;
let scaredVisible = true;

function startLoading() {
  loadTimer = 0;
  scaredFlicker = 0;
  scaredVisible = true;
  state = "loading";
}

// =========================
// PLAYER
// =========================
const player = {
  w: DRAW_W - HITBOX_PAD,
  h: DRAW_H - HITBOX_PAD,
  x: W / 2 - (DRAW_W - HITBOX_PAD) / 2,
  y: GROUND_Y - (DRAW_H - HITBOX_PAD),
  speed: 2.6,
};

// =========================
// ENEMIES + SCORING
// =========================
let enemies = [];
let spawnTimer = 0;
let score = 0;
let best = Number(localStorage.getItem("dodz_best") || 0);
let blinkT = 0;
let titleMenuIndex = 0; // 0=start, 1=howtoplay, 2=controls

// =========================
// PLAYER ANIMATION
// =========================
let frame = 0;
let frameTimer = 0;
let anim = "idle";

// =========================
// TITLE SIT ANIMATION
// =========================
let titleFrame = 0;
let titleFrameTimer = 0;

// =========================
// TITLE BACKGROUND TEARDROPS
// =========================
let bgEnemies = [];

function spawnBgEnemy() {
  bgEnemies.push({
    x: Math.random() * W,
    y: -18,
    vy: 0.8 + Math.random() * 0.6,
    r: 6 + Math.random() * 5,
    alpha: 0.15 + Math.random() * 0.18,
  });
}

let bgSpawnT = 0;

// =========================
// CITYSCAPE BUILDINGS
// =========================
const BUILDINGS = generateBuildings();

function generateBuildings() {
  const buildings = [];

  // Back layer — anchored to BUILDING_BASE
  const backCount = 7;
  const backW = Math.floor(W / backCount);
  for (let i = 0; i < backCount; i++) {
    const bw = backW - 4 + Math.floor(Math.random() * 10);
    const bh = 80 + Math.floor(Math.random() * 120);
    buildings.push({
      x: i * backW + Math.floor(Math.random() * 6),
      y: BUILDING_BASE - bh,
      w: bw,
      h: bh,
      layer: 0,
      windows: generateWindows(i * backW, BUILDING_BASE - bh, bw, bh),
    });
  }

  // Front layer — anchored to BUILDING_BASE
  const frontCount = 5;
  const frontW = Math.floor(W / frontCount);
  for (let i = 0; i < frontCount; i++) {
    const bw = frontW - 6 + Math.floor(Math.random() * 14);
    const bh = 50 + Math.floor(Math.random() * 80);
    buildings.push({
      x: i * frontW - 4 + Math.floor(Math.random() * 8),
      y: BUILDING_BASE - bh,
      w: bw,
      h: bh,
      layer: 1,
      windows: generateWindows(i * frontW - 4, BUILDING_BASE - bh, bw, bh),
    });
  }

  return buildings;
}

function generateWindows(bx, by, bw, bh) {
  const wins = [];
  const cols = Math.floor(bw / 10);
  const rows = Math.floor(bh / 12);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() < 0.45) {
        wins.push({
          x: bx + 4 + c * 10,
          y: by + 6 + r * 12,
          lit: Math.random() < 0.6,
          color: Math.random() < 0.5 ? "#ffe89a" : "#a8d8ff",
        });
      }
    }
  }
  return wins;
}

// =========================
// BACKGROUND RAIN STREAKS
// =========================
const RAIN_STREAKS = generateRainStreaks();

function generateRainStreaks() {
  const streaks = [];
  for (let i = 0; i < 60; i++) {
    streaks.push({
      x: Math.random() * W,
      y: Math.random() * H,
      len: 6 + Math.random() * 10,
      vy: 3 + Math.random() * 2,
      alpha: 0.04 + Math.random() * 0.08,
    });
  }
  return streaks;
}

function updateRainStreaks() {
  for (const s of RAIN_STREAKS) {
    s.y += s.vy;
    if (s.y > H + s.len) {
      s.y = -s.len;
      s.x = Math.random() * W;
    }
  }
}

// =========================
// SOUND
// =========================
const SFX = {
  start: "audio/start.wav",
  score: "audio/score.wav",
  hit:   "audio/hit.wav",
};

let audioUnlocked = false;
const sfxVol = 0.6;

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

function hit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// =========================
// ENEMY TUNING
// =========================
const ENEMY_SIZE = 16;
const MAX_ENEMIES = 6;
const SPAWN_COOLDOWN = 45;

function enemySpeed() {
  const mode = MODES[selectedMode];
  const difficulty = 1 + score * mode.scoreMult;
  return (1.6 + Math.random() * 0.9) * mode.speedMult * Math.min(difficulty, 2.8);
}

function spawnEnemy() {
  if (enemies.length >= MODES[selectedMode].maxEnemies) return;
  enemies.push({
    w: ENEMY_SIZE,
    h: ENEMY_SIZE,
    x: Math.floor(Math.random() * (W - ENEMY_SIZE)),
    y: -ENEMY_SIZE,
    vy: enemySpeed(),
  });
}

// =========================
// RESET / START
// =========================
function resetGame() {
  player.x = W / 2 - player.w / 2;
  player.y = GROUND_Y - player.h;
  enemies = [];
  spawnTimer = 0;
  score = 0;
  frame = 0;
  frameTimer = 0;
  anim = "idle";
  facing = "east";
  state = "playing";
}

// =========================
// BACK BUTTON
// =========================
const backBtn = { x: 16, y: 12, w: 90, h: 24 };

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * W;
  const my = ((e.clientY - rect.top) / rect.height) * H;

  if (state === "modeselect") {
    // clicking cards — match exact drawn positions
    const cardW2 = 82, cardH2 = 110, cardGap2 = 8;
    const totalW2 = 3 * cardW2 + 2 * cardGap2;
    const cardStartX2 = W / 2 - totalW2 / 2;
    const cardY2 = H / 2 - 110 / 2 - 10;
    for (let i = 0; i < 3; i++) {
      const cx3 = cardStartX2 + i * (cardW2 + cardGap2);
      if (pointInRect(mx, my, { x: cx3, y: cardY2, w: cardW2, h: cardH2 })) {
        selectedMode = i;
      }
    }
    // confirm button area
    const confirmBtn = { x: W/2 - 80, y: H / 2 + 110 / 2 + 20, w: 160, h: 28 };
    if (pointInRect(mx, my, confirmBtn)) {
      unlockSound();
      playSfx(SFX.start);
      startLoading();
    }
    // back to title
    if (pointInRect(mx, my, backBtn)) {
      state = "title";
      blinkT = 0;
      bgEnemies = [];
    }
    return;
  }

  if (
    (state === "playing" || state === "gameover") &&
    pointInRect(mx, my, backBtn)
  ) {
    state = "title";
    titleFrame = 0;
    titleFrameTimer = 0;
    blinkT = 0;
    bgEnemies = [];
  }
});

// =========================
// INPUT EVENTS
// =========================
addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft")  { left = true;  facing = "west"; }
  if (e.key === "ArrowRight") { right = true; facing = "east"; }

  if (e.key === " " || e.code === "Space") {
    unlockSound();
    if (state === "howtoplay" || state === "controls") {
      state = "title"; blinkT = 0;
    } else if (state === "title" || state === "gameover") {
      if (titleMenuIndex === 0) {
        state = "modeselect";
        selectedMode = 0;
      } else if (titleMenuIndex === 1) {
        state = "howtoplay";
      } else if (titleMenuIndex === 2) {
        state = "controls";
      }
    } else if (state === "modeselect") {
      playSfx(SFX.start);
      startLoading();
    }
  }

  if (state === "modeselect") {
    if (e.key === "ArrowLeft")  selectedMode = (selectedMode + 2) % 3;
    if (e.key === "ArrowRight") selectedMode = (selectedMode + 1) % 3;
  }
  if (state === "title") {
    if (e.key === "ArrowUp")   titleMenuIndex = (titleMenuIndex + 2) % 3;
    if (e.key === "ArrowDown") titleMenuIndex = (titleMenuIndex + 1) % 3;
  }
  if ((state === "howtoplay" || state === "controls") && e.key === "Escape") {
    state = "title"; blinkT = 0;
  }
});

addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft")  left = false;
  if (e.key === "ArrowRight") right = false;
});

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function spawnDust(px) {
  // small burst behind feet while running
  // px is the player's x (hitbox x)
  const amount = 2 + Math.floor(Math.random() * 2); // 2–3 bits
  for (let i = 0; i < amount; i++) {
    dust.push({
      x: px + rand(-2, 6),
      y: BUILDING_BASE - rand(3, 7),
      vx: rand(-0.3, 0.3),
      vy: rand(-0.15, -0.35),
      life: 16 + Math.floor(Math.random() * 8),
      size: 2 + Math.floor(Math.random() * 2),
    });
  }
}

function spawnSplash(x, y) {
  // little splash burst when raindrop hits ground
  const amount = 6 + Math.floor(Math.random() * 4); // 6–9 bits
  for (let i = 0; i < amount; i++) {
    splash.push({
      x,
      y,
      vx: rand(-0.9, 0.9),
      vy: rand(-1.6, -0.7),
      life: 14 + Math.floor(Math.random() * 10),
      size: 2,
    });
  }
}

function updateParticles() {
  // dust
  for (const p of dust) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.02; // tiny gravity
    p.life -= 1;
  }
  dust = dust.filter((p) => p.life > 0);

  // splash
  for (const p of splash) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05; // stronger gravity for splash
    p.life -= 1;
  }
  splash = splash.filter((p) => p.life > 0);
}

function drawParticles() {
  // Dust: subtle, darker/lavender-ish (use palette border a bit transparent-ish by mixing sizes)
  ctx.fillStyle = "#8977c9"; // from your palette
  for (const p of dust) {
    ctx.fillRect((p.x | 0), (p.y | 0), p.size, p.size);
  }

  // Splash: light blue bits
  ctx.fillStyle = "#d4faff"; // from your palette
  for (const p of splash) {
    ctx.fillRect((p.x | 0), (p.y | 0), p.size, p.size);
  }
}

// =========================
// UPDATE
// =========================
function update() {
  blinkT = (blinkT + 1) % 60;

  if (state === "title" || state === "howtoplay" || state === "controls") {
    titleFrameTimer++;
    if (titleFrameTimer >= 10) {
      titleFrameTimer = 0;
      titleFrame = (titleFrame + 1) % SIT_FRAMES;
    }
    bgSpawnT++;
    if (bgSpawnT >= 70) { bgSpawnT = 0; spawnBgEnemy(); }
    for (const e of bgEnemies) e.y += e.vy;
    bgEnemies = bgEnemies.filter((e) => e.y < H + 20);
    return;
  }

  if (state === "modeselect") {
    bgSpawnT++;
    if (bgSpawnT >= 70) { bgSpawnT = 0; spawnBgEnemy(); }
    for (const e of bgEnemies) e.y += e.vy;
    bgEnemies = bgEnemies.filter((e) => e.y < H + 20);
    return;
  }

  if (state === "loading") {
    updateRainStreaks();
    loadTimer++;
    scaredFlicker++;
    if (scaredFlicker >= 4 + Math.floor(Math.random() * 6)) {
      scaredFlicker = 0;
      scaredVisible = !scaredVisible;
    }
    if (loadTimer >= LOAD_DURATION) resetGame();
    return;
  }

  if (state === "playing") {
    updateRainStreaks();
    updateCars();
    updatePetals();
    if (selectedMode === 2) updateLightning();
  }

  if (state !== "playing") return;

  // Lock Pixie to GROUND_Y every frame
  player.y = GROUND_Y - player.h;

  const moving = left || right;
  if (moving && state === "playing") {
  // every few frames so it doesn't spam
    if ((blinkT % 4) === 0) spawnDust(player.x + (player.w * 0.5));
  }
  if (left)  player.x -= player.speed;
  if (right) player.x += player.speed;
  player.x = clamp(player.x, 0, W - player.w);

  const nextAnim = moving ? "run" : "idle";
  if (nextAnim !== anim) {
    anim = nextAnim;
    frame = 0;
    frameTimer = 0;
  }

  frameTimer++;
  const animSpeed = anim === "run" ? 5 : 8;
  if (frameTimer >= animSpeed) {
    frameTimer = 0;
    const maxFrames = anim === "run" ? RUN_FRAMES : IDLE_FRAMES;
    frame = (frame + 1) % maxFrames;
  }

  spawnTimer--;
  if (spawnTimer <= 0) {
    spawnEnemy();
    const mode = MODES[selectedMode];
    const cooldown = Math.max(mode.spawnMin, mode.spawnBase - Math.floor(score * 0.4));
    spawnTimer = cooldown;
  }

  for (const e of enemies) e.y += e.vy;

  enemies = enemies.filter((e) => {
    if (e.y + e.h >= BUILDING_BASE) {
      score += 1;
      playSfx(SFX.score);
      spawnSplash(e.x + e.w / 2, BUILDING_BASE);
      return false;
    }
    return true;
  });

  for (const e of enemies) {
    if (hit(player, e)) {
      playSfx(SFX.hit);
      state = "gameover";
      if (score > best) {
        best = score;
        localStorage.setItem("dodz_best", String(best));
      }
      break;
    }
  }

  updateParticles();
}

// =========================
// DRAW — BACKGROUNDS BY MODE
// =========================
// =========================
// EASY MODE — RAINY JAPANESE TRAIN STATION
// =========================
let petalParticles = []; // reused as rain puddle ripples
let petalSpawnT = 0;

// Puddle ripples
let ripples = [];
let rippleSpawnT = 0;
let trainOffset = 0;

function spawnRipple() {
  ripples.push({
    x: rand(10, W - 10),
    y: BUILDING_BASE + rand(4, 14),
    r: 0,
    maxR: 6 + Math.random() * 5,
    alpha: 0.5,
  });
}

function updatePetals() {
  if (selectedMode !== 0) return;
  rippleSpawnT++;
  if (rippleSpawnT >= 12) { rippleSpawnT = 0; spawnRipple(); }
  for (const r of ripples) {
    r.r += 0.3;
    r.alpha -= 0.018;
  }
  ripples = ripples.filter(r => r.alpha > 0);
  trainOffset = (trainOffset + 0.8) % 312; // 4 cars x 78px
}

function drawBgEasy() {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0a0e18");
  sky.addColorStop(0.5, "#111828");
  sky.addColorStop(1,   "#1a2030");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Rain streaks — drawn early so station is on top
  for (const s of RAIN_STREAKS) {
    ctx.save();
    ctx.globalAlpha = s.alpha * 1.1;
    ctx.strokeStyle = "#8ab0cc";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - 1, s.y + s.len * 1.3);
    ctx.stroke();
    ctx.restore();
  }

  // === STATION BUILDING — brick Japanese station facade ===
  const stationTop = BUILDING_BASE - 140;
  const beamPositions = [W*0.15, W*0.38, W*0.62, W*0.85];

  // Main brick wall — warm dark terracotta
  ctx.fillStyle = "#2a1e18";
  ctx.fillRect(0, stationTop, W, BUILDING_BASE - stationTop);

  // Brick texture rows
  for (let row = 0; row < 9; row++) {
    const by = stationTop + 6 + row * 14;
    const offset = (row % 2) * 10;
    ctx.fillStyle = row % 2 === 0 ? "#321e16" : "#2e1c14";
    for (let col = -1; col < 22; col++) {
      ctx.fillRect((col * 14 + offset)|0, by|0, 12, 11);
    }
    // Mortar line
    ctx.fillStyle = "#1e1410";
    ctx.fillRect(0, (by + 11)|0, W, 3);
  }

  // Peaked roofline — centre gable higher
  ctx.fillStyle = "#1a1008";
  // Left wing
  ctx.beginPath();
  ctx.moveTo(0, stationTop);
  ctx.lineTo(W*0.28, stationTop);
  ctx.lineTo(W*0.28, stationTop - 8);
  ctx.lineTo(0, stationTop - 4);
  ctx.closePath();
  ctx.fill();
  // Centre gable
  ctx.beginPath();
  ctx.moveTo(W*0.28, stationTop);
  ctx.lineTo(W*0.72, stationTop);
  ctx.lineTo(W*0.72, stationTop - 8);
  ctx.lineTo(W*0.5, stationTop - 22);
  ctx.lineTo(W*0.28, stationTop - 8);
  ctx.closePath();
  ctx.fill();
  // Right wing
  ctx.beginPath();
  ctx.moveTo(W*0.72, stationTop);
  ctx.lineTo(W, stationTop);
  ctx.lineTo(W, stationTop - 4);
  ctx.lineTo(W*0.72, stationTop - 8);
  ctx.closePath();
  ctx.fill();
  // Roof edge trim
  ctx.strokeStyle = "#3a2010";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, stationTop - 4);
  ctx.lineTo(W*0.28, stationTop - 8);
  ctx.lineTo(W*0.5, stationTop - 22);
  ctx.lineTo(W*0.72, stationTop - 8);
  ctx.lineTo(W, stationTop - 4);
  ctx.stroke();

  // Station name sign — hung below gable
  ctx.fillStyle = "#0a2010";
  ctx.fillRect(W/2 - 52, stationTop - 2, 104, 14);
  ctx.strokeStyle = "#1a6030";
  ctx.lineWidth = 1;
  ctx.strokeRect(W/2 - 52, stationTop - 2, 104, 14);
  // Kanji-style white blocks
  ctx.fillStyle = "#e8f8e8";
  for (let k = 0; k < 5; k++) {
    ctx.fillRect(W/2 - 36 + k*16, stationTop + 1, 10, 8);
  }

  // Arched windows — tall with rounded tops (the key visual difference from the flat train)
  const archWindows = [
    { x: W*0.05, w: 28 }, { x: W*0.22, w: 28 }, { x: W*0.38, w: 28 },
    { x: W*0.55, w: 28 }, { x: W*0.72, w: 28 }, { x: W*0.88, w: 24 },
  ];
  for (const aw of archWindows) {
    const awY = stationTop + 18;
    const awH = 48;
    const awX = aw.x - aw.w/2;
    const archR = aw.w/2;

    // Warm interior glow
    const wg = ctx.createRadialGradient(aw.x, awY + awH*0.6, 2, aw.x, awY + awH*0.6, aw.w);
    wg.addColorStop(0, "rgba(255,200,120,0.35)");
    wg.addColorStop(1, "rgba(255,140,60,0)");
    ctx.fillStyle = wg;
    ctx.fillRect((awX-8)|0, (awY-4)|0, aw.w+16, awH+8);

    // Arch fill (warm amber glass)
    ctx.fillStyle = "rgba(255,185,80,0.55)";
    ctx.beginPath();
    ctx.moveTo(awX|0, (awY+awH)|0);
    ctx.lineTo(awX|0, (awY+archR)|0);
    ctx.arc(aw.x, awY+archR, archR, Math.PI, 0);
    ctx.lineTo((awX+aw.w)|0, (awY+awH)|0);
    ctx.closePath();
    ctx.fill();

    // Arch frame
    ctx.strokeStyle = "#3a2010";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(awX|0, (awY+awH)|0);
    ctx.lineTo(awX|0, (awY+archR)|0);
    ctx.arc(aw.x, awY+archR, archR, Math.PI, 0);
    ctx.lineTo((awX+aw.w)|0, (awY+awH)|0);
    ctx.stroke();

    // Window divider (cross)
    ctx.strokeStyle = "#3a2010";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(aw.x|0, awY|0);
    ctx.lineTo(aw.x|0, (awY+awH)|0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(awX|0, (awY+awH*0.55)|0);
    ctx.lineTo((awX+aw.w)|0, (awY+awH*0.55)|0);
    ctx.stroke();
  }

  // Horizontal stone band between arch tops and roof
  ctx.fillStyle = "#3a2818";
  ctx.fillRect(0, stationTop + 4, W, 8);

  // Canopy overhang (front awning above train area)
  ctx.fillStyle = "#1a1008";
  ctx.fillRect(0, stationTop + 88, W, 8);
  ctx.strokeStyle = "#3a2010";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, stationTop + 96);
  ctx.lineTo(W, stationTop + 96);
  ctx.stroke();

  // Moving train — behind the yellow line, above platform floor
  const trainY = stationTop + 92;
  const trainH = 36;
  ctx.fillStyle = "#080c14";
  ctx.fillRect(0, trainY, W, trainH);
  for (let i = -1; i < 6; i++) {
    const tx = ((i * 78) - (trainOffset % 78) + 78) % (78 * 5) - 78;
    ctx.fillStyle = "#2a3a5a";
    ctx.fillRect(tx|0, trainY + 1, 74, trainH - 2);
    ctx.fillStyle = "rgba(255,210,130,0.4)";
    for (let j = 0; j < 4; j++) {
      ctx.fillRect((tx + 5 + j * 17)|0, trainY + 6, 12, 12);
    }
    ctx.fillStyle = "#1a3a8a";
    ctx.fillRect(tx|0, (trainY + trainH * 0.6)|0, 74, 5);
    ctx.fillStyle = "#0e1220";
    ctx.fillRect((tx + 73)|0, trainY, 5, trainH);
  }

  // Overhead lights
  for (const bx of beamPositions) {
    const lg = ctx.createRadialGradient(bx, stationTop + 10, 1, bx, stationTop + 10, 38);
    lg.addColorStop(0, "rgba(255,220,140,0.28)");
    lg.addColorStop(1, "rgba(255,180,80,0)");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(bx, stationTop + 10, 38, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "#e8d080";
    ctx.fillRect((bx - 4)|0, (stationTop + 8)|0, 8, 4);
  }

  // Yellow safety line on platform edge
  ctx.fillStyle = "#c8a800";
  ctx.fillRect(0, BUILDING_BASE - 5, W, 4);
  ctx.fillStyle = "#e8c400";
  for (let i = 4; i < W; i += 8) ctx.fillRect(i, BUILDING_BASE - 5, 3, 3);

  // Platform floor — BELOW BUILDING_BASE, where player walks
  const ground = ctx.createLinearGradient(0, BUILDING_BASE, 0, H);
  ground.addColorStop(0, "#1e2230");
  ground.addColorStop(1, "#161a24");
  ctx.fillStyle = ground;
  ctx.fillRect(0, BUILDING_BASE, W, H - BUILDING_BASE);

  // Wet reflections of lights on platform
  ctx.globalAlpha = 0.07;
  for (const bx of beamPositions) {
    ctx.fillStyle = "#ffdd88";
    ctx.fillRect((bx - 14)|0, BUILDING_BASE, 28, H - BUILDING_BASE);
  }
  ctx.globalAlpha = 1;

  // Puddle ripples
  for (const r of ripples) {
    ctx.strokeStyle = "#6a8aaa";
    ctx.lineWidth = 1;
    ctx.globalAlpha = r.alpha;
    ctx.beginPath();
    ctx.ellipse(r.x|0, r.y|0, r.r, r.r * 0.4, 0, 0, Math.PI*2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}


let cars = [];
let carSpawnT = 0;

function spawnCar() {
  const goingRight = Math.random() < 0.5;
  const carColors = ["#e03040", "#e07820", "#3080e0", "#30c060", "#c0c020", "#a030d0"];
  const col = carColors[Math.floor(Math.random() * carColors.length)];
  const carW = 36 + Math.floor(Math.random() * 20);
  const carH = 14;
  const lane = Math.random() < 0.5 ? 0 : 1;
  const laneY = BUILDING_BASE + 8 + lane * 16;
  cars.push({
    x: goingRight ? -carW - 10 : W + 10,
    y: laneY,
    w: carW,
    h: carH,
    vx: (2.5 + Math.random() * 2) * (goingRight ? 1 : -1),
    color: col,
    dir: goingRight ? 1 : -1,
  });
}

function updateCars() {
  if (selectedMode !== 1) return;
  carSpawnT++;
  if (carSpawnT >= 55) { carSpawnT = 0; spawnCar(); }
  for (const c of cars) c.x += c.vx;
  cars = cars.filter(c => c.x > -80 && c.x < W + 80);
}

function drawCar(c) {
  ctx.fillStyle = c.color;
  ctx.fillRect(c.x | 0, c.y | 0, c.w, c.h);

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  const roofX = c.dir === 1 ? c.x + c.w * 0.25 : c.x + c.w * 0.1;
  ctx.fillRect(roofX | 0, (c.y - 7) | 0, (c.w * 0.5) | 0, 8);

  ctx.fillStyle = "rgba(180,230,255,0.6)";
  ctx.fillRect((roofX + 2) | 0, (c.y - 6) | 0, (c.w * 0.2) | 0, 5);
  ctx.fillRect((roofX + c.w * 0.25) | 0, (c.y - 6) | 0, (c.w * 0.18) | 0, 5);

  ctx.fillStyle = "#222";
  ctx.fillRect((c.x + 4) | 0, (c.y + c.h - 2) | 0, 8, 5);
  ctx.fillRect((c.x + c.w - 12) | 0, (c.y + c.h - 2) | 0, 8, 5);

  if (c.dir === 1) {
    ctx.fillStyle = "#ffffaa";
    ctx.fillRect((c.x + c.w - 2) | 0, (c.y + 2) | 0, 3, 4);
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(c.x | 0, (c.y + 2) | 0, 3, 4);
  } else {
    ctx.fillStyle = "#ffffaa";
    ctx.fillRect(c.x | 0, (c.y + 2) | 0, 3, 4);
    ctx.fillStyle = "#ff4444";
    ctx.fillRect((c.x + c.w - 3) | 0, (c.y + 2) | 0, 3, 4);
  }

  ctx.fillStyle = c.color;
  ctx.globalAlpha = 0.12;
  ctx.fillRect((c.x + 4) | 0, (c.y + c.h + 3) | 0, c.w - 8, 4);
  ctx.globalAlpha = 1;
}

function drawBgMedium() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0a0a18");
  sky.addColorStop(0.55, "#12102a");
  sky.addColorStop(1, "#1a1530");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  for (const s of RAIN_STREAKS) {
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.strokeStyle = "#a8d8ff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - 1, s.y + s.len);
    ctx.stroke();
    ctx.restore();
  }

  const lampPositions = [W * 0.15, W * 0.45, W * 0.75];
  for (const lx of lampPositions) {
    const glow = ctx.createRadialGradient(lx, BUILDING_BASE - 60, 2, lx, BUILDING_BASE - 60, 55);
    glow.addColorStop(0, "rgba(255,220,120,0.22)");
    glow.addColorStop(1, "rgba(255,180,60,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lx, BUILDING_BASE - 60, 55, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const b of BUILDINGS.filter(b => b.layer === 0)) {
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    for (const w of b.windows) {
      if (w.lit) {
        ctx.fillStyle = w.color;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(w.x, w.y, 5, 4);
        ctx.globalAlpha = 1;
      }
    }
  }
  for (const b of BUILDINGS.filter(b => b.layer === 1)) {
    ctx.fillStyle = "#111120";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    for (const w of b.windows) {
      if (w.lit) {
        ctx.fillStyle = w.color;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(w.x, w.y, 5, 4);
        ctx.globalAlpha = 1;
      }
    }
  }

  // Road
  const roadTop = BUILDING_BASE;
  const roadH = H - roadTop;
  ctx.fillStyle = "#1a1a24";
  ctx.fillRect(0, roadTop, W, roadH);

  // Lane divider
  ctx.strokeStyle = "#ccaa00";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, roadTop + roadH * 0.5);
  ctx.lineTo(W, roadTop + roadH * 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Sidewalk strip
  ctx.fillStyle = "#2a2a3a";
  ctx.fillRect(0, roadTop, W, 6);
  ctx.strokeStyle = "#888899";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, roadTop + 6);
  ctx.lineTo(W, roadTop + 6);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Street lamps
  for (const lx of lampPositions) {
    ctx.strokeStyle = "#888899";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, roadTop + 5);
    ctx.lineTo(lx, roadTop - 62);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx, roadTop - 62);
    ctx.lineTo(lx + 10, roadTop - 68);
    ctx.stroke();
    ctx.fillStyle = "#ffe87a";
    ctx.globalAlpha = 0.9;
    ctx.fillRect((lx + 4) | 0, (roadTop - 72) | 0, 12, 5);
    ctx.globalAlpha = 1;
    const cone = ctx.createLinearGradient(lx + 10, roadTop - 67, lx + 10, roadTop + 5);
    cone.addColorStop(0, "rgba(255,220,100,0.18)");
    cone.addColorStop(1, "rgba(255,220,100,0)");
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(lx + 10, roadTop - 67);
    ctx.lineTo(lx - 18, roadTop + 5);
    ctx.lineTo(lx + 38, roadTop + 5);
    ctx.closePath();
    ctx.fill();
  }

  // Cars
  for (const c of cars) drawCar(c);

  // Road sheen
  ctx.strokeStyle = "#bc8dff";
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, roadTop);
  ctx.lineTo(W, roadTop);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
// =========================
// HARD MODE — DARK FOREST
// =========================
let lightningTimer = 0;
let lightningFlash = 0;
let lightningBolt = null;

function triggerLightning() {
  lightningFlash = 10 + Math.floor(Math.random() * 8);
  // Generate a jagged bolt from top to ground
  const bx = W * 0.2 + Math.random() * W * 0.6;
  const segments = [];
  let cx = bx, cy = 0;
  while (cy < BUILDING_BASE - 20) {
    const nx = cx + rand(-18, 18);
    const ny = cy + 20 + Math.random() * 20;
    segments.push([cx, cy, nx, ny]);
    cx = nx; cy = ny;
  }
  lightningBolt = segments;
}

function updateLightning() {
  lightningTimer++;
  if (lightningTimer > 90 + Math.random() * 120) {
    lightningTimer = 0;
    triggerLightning();
  }
  if (lightningFlash > 0) lightningFlash--;
  else lightningBolt = null;
}

// Pre-generate forest trees
const FOREST_TREES = generateForest();
function generateForest() {
  const trees = [];
  // Back layer — tall dark pines
  for (let i = 0; i < 12; i++) {
    const x = (i / 12) * W + rand(-8, 8);
    const h = 120 + Math.random() * 100;
    trees.push({ x, h, layer: 0, w: 18 + Math.random() * 14 });
  }
  // Mid layer
  for (let i = 0; i < 9; i++) {
    const x = (i / 9) * W + rand(-6, 6);
    const h = 80 + Math.random() * 70;
    trees.push({ x, h, layer: 1, w: 22 + Math.random() * 16 });
  }
  // Front layer — closest, widest
  for (let i = 0; i < 7; i++) {
    const x = (i / 7) * W + rand(-10, 10);
    const h = 55 + Math.random() * 40;
    trees.push({ x, h, layer: 2, w: 28 + Math.random() * 20 });
  }
  return trees;
}

function drawPineTree(x, baseY, w, h, col) {
  // Draw a pixel pine — stacked triangles
  const layers = Math.max(3, Math.floor(h / 22));
  for (let i = 0; i < layers; i++) {
    const t = i / layers;
    const layerW = w * (0.3 + 0.7 * (i / layers));
    const layerY = baseY - h + (h * 0.15 * i);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, layerY);
    ctx.lineTo(x - layerW / 2, layerY + h / layers * 1.2);
    ctx.lineTo(x + layerW / 2, layerY + h / layers * 1.2);
    ctx.closePath();
    ctx.fill();
  }
  // Trunk
  ctx.fillStyle = "#1a1008";
  ctx.fillRect((x - 3) | 0, (baseY - 14) | 0, 6, 14);
}

function drawBgHard() {
  const lit = lightningFlash > 0;

  // Sky — near black, with lightning tint
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  if (lit) {
    sky.addColorStop(0, "#1a2a1a");
    sky.addColorStop(0.5, "#1a3010");
    sky.addColorStop(1, "#060e06");
  } else {
    sky.addColorStop(0, "#0a1a0a");
    sky.addColorStop(0.5, "#0e1e0e");
    sky.addColorStop(1, "#060e06");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Atmospheric fog/mist rays when lightning flashes
  if (lit) {
    for (let i = 0; i < 3; i++) {
      const rx = W * 0.1 + i * W * 0.35;
      const mist = ctx.createLinearGradient(rx, 0, rx + 30, BUILDING_BASE);
      mist.addColorStop(0, "rgba(180,255,180,0.10)");
      mist.addColorStop(1, "rgba(180,255,180,0)");
      ctx.fillStyle = mist;
      ctx.beginPath();
      ctx.moveTo(rx - 20, 0);
      ctx.lineTo(rx + 50, BUILDING_BASE);
      ctx.lineTo(rx + 80, BUILDING_BASE);
      ctx.lineTo(rx + 20, 0);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Heavy rain
  for (const s of RAIN_STREAKS) {
    ctx.save();
    ctx.globalAlpha = lit ? s.alpha * 2.2 : s.alpha * 1.4;
    ctx.strokeStyle = lit ? "#ccffcc" : "#4a6a4a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - 2, s.y + s.len * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Back trees — very dark
  for (const t of FOREST_TREES.filter(t => t.layer === 0)) {
    drawPineTree(t.x, BUILDING_BASE, t.w, t.h, lit ? "#0d2210" : "#0f2210");
  }

  // Mid trees
  for (const t of FOREST_TREES.filter(t => t.layer === 1)) {
    drawPineTree(t.x, BUILDING_BASE, t.w, t.h, lit ? "#112a14" : "#142814");
  }

  // Glowing fireflies (tiny sparkling dots)
  const time = Date.now() * 0.001;
  for (let i = 0; i < 12; i++) {
    const fx = (Math.sin(time * 0.3 + i * 1.7) * 0.5 + 0.5) * W;
    const fy = BUILDING_BASE * 0.4 + Math.sin(time * 0.5 + i * 2.3) * BUILDING_BASE * 0.35;
    const alpha = (Math.sin(time * 2 + i * 3.1) * 0.5 + 0.5) * 0.7;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#aaff66";
    ctx.fillRect(fx | 0, fy | 0, 2, 2);
    // tiny cross sparkle
    ctx.fillRect((fx - 1) | 0, (fy + 1) | 0, 1, 1);
    ctx.fillRect((fx + 2) | 0, (fy + 1) | 0, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Front trees
  for (const t of FOREST_TREES.filter(t => t.layer === 2)) {
    drawPineTree(t.x, BUILDING_BASE, t.w, t.h, lit ? "#163018" : "#1a301a");
  }

  // Ground — dark mossy forest floor
  const ground = ctx.createLinearGradient(0, BUILDING_BASE, 0, H);
  ground.addColorStop(0, lit ? "#0d1e0d" : "#0f1e0f");
  ground.addColorStop(1, lit ? "#111a0a" : "#121a08");
  ctx.fillStyle = ground;
  ctx.fillRect(0, BUILDING_BASE, W, H - BUILDING_BASE);

  // Grass tufts on ground
  ctx.fillStyle = lit ? "#1a3a1a" : "#1a3010";
  for (let i = 0; i < 18; i++) {
    const gx = (i / 18) * W + 8;
    ctx.fillRect(gx | 0, BUILDING_BASE | 0, 4, 4);
    ctx.fillRect((gx + 2) | 0, (BUILDING_BASE - 2) | 0, 3, 3);
  }

  // Lightning bolt
  if (lit && lightningBolt) {
    ctx.strokeStyle = lightningFlash > 6 ? "#ffffff" : "#aaffaa";
    ctx.lineWidth = lightningFlash > 6 ? 2 : 1;
    ctx.globalAlpha = lightningFlash / 14;
    for (const [x1, y1, x2, y2] of lightningBolt) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Ground flash
    ctx.fillStyle = "rgba(180,255,180,0.06)";
    ctx.fillRect(0, 0, W, H);
  }

  // Ground edge line
  ctx.strokeStyle = lit ? "#2a4a2a" : "#1e2e1e";
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, BUILDING_BASE);
  ctx.lineTo(W, BUILDING_BASE);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// =========================
// DRAW — MODE SELECT SCREEN
// =========================
function drawModeSelect() {
  // Background preview of selected mode
  if (selectedMode === 0) drawBgEasy();
  else if (selectedMode === 1) drawBgMedium();
  else drawBgHard();

  // Dark overlay
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;

  // Title
  ctx.textAlign = "center";
  ctx.fillStyle = PAL.accent;
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillText("SELECT MODE", cx, H / 2 - 110 / 2 - 28);

  // Mode cards
  const cardW = 82;
  const cardH = 110;
  const cardGap = 8;
  const totalW = 3 * cardW + 2 * cardGap;
  const cardStartX = cx - totalW / 2;
  const cardY = H / 2 - cardH / 2 - 10;

  const modeColors = ["#00ff88", "#ffaa44", "#ff4466"];
  const modeBgs   = ["rgba(0,255,136,0.08)", "rgba(255,170,68,0.08)", "rgba(255,68,102,0.08)"];
  const modeBorders = ["#00ff88", "#ffaa44", "#ff4466"];
  const modeDescriptions = [
    ["SLOW DROPS", "FEW ENEMIES"],
    ["FASTER", "MORE DROPS"],
    ["CHAOS!", "MAX SPEED"],
  ];

  for (let i = 0; i < 3; i++) {
    const mode = MODES[i];
    const cx2 = cardStartX + i * (cardW + cardGap) + cardW / 2;
    const selected = i === selectedMode;

    // Card bg — always same dark fill
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(cardStartX + i * (cardW + cardGap), cardY, cardW, cardH);

    // Card border
    ctx.strokeStyle = selected ? modeBorders[i] : "rgba(255,255,255,0.15)";
    ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeRect(cardStartX + i * (cardW + cardGap), cardY, cardW, cardH);

    // Mode label
    ctx.fillStyle = selected ? modeColors[i] : "rgba(255,255,255,0.4)";
    ctx.font = "7px 'Press Start 2P'";
    ctx.fillText(mode.label, cx2, cardY + 18);

    // Raindrop icons
    const dropR = 5;
    const dropSpacing = 14;
    const dropsStartX = cx2 - ((mode.drops - 1) * dropSpacing) / 2;
    for (let d = 0; d < mode.drops; d++) {
      ctx.fillStyle = selected ? modeColors[i] : "rgba(255,255,255,0.3)";
      ctx.globalAlpha = selected ? 1 : 0.5;
      drawRaindrop(dropsStartX + d * dropSpacing, cardY + 42, dropR);
    }
    ctx.globalAlpha = 1;

    // Description lines
    ctx.fillStyle = selected ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)";
    ctx.font = "5px 'Press Start 2P'";
    for (let l = 0; l < modeDescriptions[i].length; l++) {
      ctx.fillText(modeDescriptions[i][l], cx2, cardY + 70 + l * 14);
    }

    // Selected indicator — small triangle above card
    if (selected) {
      ctx.fillStyle = modeColors[i];
      ctx.font = "8px 'Press Start 2P'";
      ctx.fillText("▲", cx2, cardY - 4);
    }
  }

  // Confirm prompt
  ctx.textAlign = "center";
  if (blinkT < 30) {
    ctx.fillStyle = modeColors[selectedMode];
    ctx.font = "7px 'Press Start 2P'";
    ctx.fillText("PRESS SPACE TO PLAY", cx, H / 2 + 110 / 2 + 30);
  }

  // Nav hint
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "5px 'Press Start 2P'";
  ctx.fillText("← → TO BROWSE", cx, H / 2 + 110 / 2 + 48);

  ctx.textAlign = "left";
}

// =========================
// DRAW — CITYSCAPE
// =========================
function drawCityscape() {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0d0d1a");
  sky.addColorStop(0.6, "#1a1a2e");
  sky.addColorStop(1, "#2a2040");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Rain streaks
  // Moon
  const moonX = W * 0.75;
  const moonY = 52;
  const moonR = 18;

  // Outer glow
  const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 2.5);
  moonGlow.addColorStop(0, "rgba(218,186,255,0.18)");
  moonGlow.addColorStop(1, "rgba(218,186,255,0)");
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Moon body
  ctx.fillStyle = "#dabaff";
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();

  // Crescent shadow to make it a crescent moon
  ctx.fillStyle = "#13112a";
  ctx.beginPath();
  ctx.arc(moonX + moonR * 0.45, moonY - moonR * 0.1, moonR * 0.82, 0, Math.PI * 2);
  ctx.fill();

  // Rain streaks
  for (const s of RAIN_STREAKS) {
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.strokeStyle = "#a8d8ff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - 1, s.y + s.len);
    ctx.stroke();
    ctx.restore();
  }

  // Back layer buildings
  for (const b of BUILDINGS.filter(b => b.layer === 0)) {
    ctx.fillStyle = "#111120";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    for (const w of b.windows) {
      if (w.lit) {
        ctx.fillStyle = w.color;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(w.x, w.y, 5, 4);
        ctx.globalAlpha = 1;
      }
    }
  }

  // Front layer buildings
  for (const b of BUILDINGS.filter(b => b.layer === 1)) {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    for (const w of b.windows) {
      if (w.lit) {
        ctx.fillStyle = w.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(w.x, w.y, 5, 4);
        ctx.globalAlpha = 1;
      }
    }
  }

  // Wet street — anchored to BUILDING_BASE
  const ground = ctx.createLinearGradient(0, BUILDING_BASE, 0, H);
  ground.addColorStop(0, "#0d0d1a");
  ground.addColorStop(1, "#1a1530");
  ctx.fillStyle = ground;
  ctx.fillRect(0, BUILDING_BASE, W, H - BUILDING_BASE);

  // Street sheen
  ctx.strokeStyle = "#bc8dff";
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, BUILDING_BASE);
  ctx.lineTo(W, BUILDING_BASE);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// =========================
// DRAW — LOADING SCREEN
// =========================
function drawLoadingScreen() {
  drawCityscape();

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;

  if (scaredVisible) {
    ctx.fillStyle = PAL.border;
    ctx.font = "9px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillText("PIXIE IS SCARED...", cx, cy - 40);
  }

  const barW = 200;
  const barH = 16;
  const barX = cx - barW / 2;
  const barY = cy - 8;
  const blockW = Math.floor(barW / LOAD_BLOCKS);
  const filledBlocks = Math.floor((loadTimer / LOAD_DURATION) * LOAD_BLOCKS);

  ctx.strokeStyle = PAL.text;
  ctx.lineWidth = 2;
  ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

  for (let i = 0; i < LOAD_BLOCKS; i++) {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(barX + i * blockW + 1, barY + 1, blockW - 2, barH - 2);
  }

  for (let i = 0; i < filledBlocks; i++) {
    const t = i / (LOAD_BLOCKS - 1);
    const r = Math.round(188 + (0   - 188) * t);
    const g = Math.round(141 + (255 - 141) * t);
    const b = Math.round(255 + (136 - 255) * t);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(barX + i * blockW + 1, barY + 1, blockW - 2, barH - 2);
  }

  if (filledBlocks >= LOAD_BLOCKS - 1) {
    ctx.fillStyle = PAL.accent;
    ctx.font = "10px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillText("GET READY!", cx, cy + 40);
  }

  ctx.textAlign = "left";
}

// =========================
// DRAW — TEARDROP
// =========================
function drawRaindrop(cx, cy, r) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 1.6);
  ctx.bezierCurveTo(
    cx + r * 0.6, cy - r * 0.6,
    cx + r,       cy + r * 0.4,
    cx,           cy + r
  );
  ctx.bezierCurveTo(
    cx - r,       cy + r * 0.4,
    cx - r * 0.6, cy - r * 0.6,
    cx,           cy - r * 1.6
  );
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = ctx.globalAlpha * 0.45;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(
    cx - r * 0.28,
    cy - r * 0.55,
    r * 0.22,
    r * 0.32,
    -0.5, 0, Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

// =========================
// DRAW — ENEMIES
// =========================
function drawEnemies() {
  ctx.fillStyle = PAL.enemy;
  for (const e of enemies) {
    const r = e.w / 2;
    drawRaindrop(Math.floor(e.x + r), Math.floor(e.y + r), r);
  }
}

// =========================
// DRAW — BG TEARDROPS (title)
// =========================
function drawBgEnemies() {
  ctx.fillStyle = PAL.enemy;
  for (const e of bgEnemies) {
    ctx.globalAlpha = e.alpha;
    drawRaindrop(Math.floor(e.x), Math.floor(e.y), e.r);
  }
  ctx.globalAlpha = 1;
}

// =========================
// DRAW — PLAYER
// =========================
function drawPlayer() {
  let sprite = idleImg;
  if (anim === "run") sprite = facing === "west" ? runWestImg : runEastImg;

  const feetY = GROUND_Y;
  const drawX = Math.floor(player.x - (DRAW_W - player.w) / 2);
  const drawY = Math.floor(feetY - DRAW_H);

  ctx.drawImage(
    sprite,
    frame * FRAME_W, 0, FRAME_W, FRAME_H,
    drawX, drawY, DRAW_W, DRAW_H
  );
}

// =========================
// DRAW — BORDER + UI
// =========================
function drawBorder() {
  ctx.strokeStyle = PAL.border;
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, W, H);
  ctx.lineWidth = 1;
}

function drawScanlines() {
  for (let y = 0; y < H; y += 2) {
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    ctx.fillRect(0, y, W, 1);
  }
}

function drawUI() {
  if (state === "loading") return;

  ctx.font = "8px 'Press Start 2P'";

  // BEST stays top right — only during gameplay/gameover
  if (state === "playing" || state === "gameover") {
    ctx.fillStyle = PAL.text;
    ctx.textAlign = "right";
    ctx.fillText(`BEST: ${best}`, W - 12, 22);
  }

  // SCORE in the strip between ground and canvas bottom
  if (state === "playing") {
    ctx.fillStyle = PAL.accent;
    ctx.textAlign = "right";
    ctx.fillText(`SCORE: ${score}`, W - 12, H - 6);
  }

  ctx.textAlign = "left";
}

function drawBackButton() {
  if (!(state === "playing" || state === "gameover" || state === "modeselect")) return;

  const hovered = pointInRect(mouseX, mouseY, backBtn);

  ctx.font = "8px 'Press Start 2P'";
  ctx.fillStyle = hovered ? PAL.border : "#8977c9";
  ctx.textAlign = "left";
  ctx.fillText("<< BACK", backBtn.x, backBtn.y + 18);

  ctx.textAlign = "left";
  canvas.style.cursor = hovered ? "pointer" : "default";
}

// =========================
// DRAW — SCREENS
// =========================
function drawTitleScreen() {
  // === SKY — dusk purple/blue gradient ===
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0,    "#1a0e30");
  sky.addColorStop(0.35, "#2a1848");
  sky.addColorStop(0.65, "#4a2258");
  sky.addColorStop(1,    "#6a2a40");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars
  const t = Date.now() * 0.0004;
  for (let i = 0; i < 30; i++) {
    const sx = ((i * 137.5) % W);
    const sy = ((i * 61.3) % (H * 0.45));
    const tw = (Math.sin(t + i * 1.9) * 0.5 + 0.5) * 0.7 + 0.1;
    ctx.globalAlpha = tw;
    ctx.fillStyle = "#fffbe8";
    ctx.fillRect(sx|0, sy|0, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Moon
  const moonX = W * 0.8, moonY = 55, moonR = 16;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, 2, moonX, moonY, moonR * 2.5);
  moonGlow.addColorStop(0, "rgba(220,200,255,0.3)");
  moonGlow.addColorStop(1, "rgba(180,140,255,0)");
  ctx.fillStyle = moonGlow;
  ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 2.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#ddc8ff";
  ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#2a1848";
  ctx.beginPath(); ctx.arc(moonX + moonR*0.4, moonY - moonR*0.1, moonR*0.8, 0, Math.PI*2); ctx.fill();

  // Far background hills — dark silhouette
  ctx.fillStyle = "#180e28";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.62);
  ctx.bezierCurveTo(W*0.1, H*0.48, W*0.2, H*0.52, W*0.35, H*0.50);
  ctx.bezierCurveTo(W*0.45, H*0.48, W*0.55, H*0.56, W*0.65, H*0.50);
  ctx.bezierCurveTo(W*0.78, H*0.44, W*0.88, H*0.52, W, H*0.55);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

  // Mid hills
  ctx.fillStyle = "#120a1e";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.72);
  ctx.bezierCurveTo(W*0.15, H*0.60, W*0.28, H*0.65, W*0.42, H*0.60);
  ctx.bezierCurveTo(W*0.55, H*0.55, W*0.68, H*0.63, W*0.82, H*0.60);
  ctx.bezierCurveTo(W*0.92, H*0.57, W*0.97, H*0.63, W, H*0.65);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

  // Trees on hills — small pixel pines
  const treeLine = H * 0.62;
  const treeData = [[W*0.05,treeLine],[W*0.12,treeLine-8],[W*0.19,treeLine+2],[W*0.55,treeLine-4],[W*0.62,treeLine-10],[W*0.68,treeLine+2],[W*0.88,treeLine-6],[W*0.93,treeLine],[W*0.98,treeLine-4]];
  for (const [tx, ty] of treeData) {
    ctx.fillStyle = "#0d0818";
    ctx.beginPath(); ctx.moveTo(tx, ty-18); ctx.lineTo(tx-7, ty); ctx.lineTo(tx+7, ty); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(tx, ty-26); ctx.lineTo(tx-5, ty-14); ctx.lineTo(tx+5, ty-14); ctx.closePath(); ctx.fill();
  }

  // Ground / grass strip
  ctx.fillStyle = "#0e0c1a";
  ctx.fillRect(0, H * 0.73, W, H - H*0.73);
  ctx.fillStyle = "#1a1428";
  ctx.fillRect(0, H * 0.73, W, 6);

  // Rain streaks (light)
  for (const s of RAIN_STREAKS) {
    ctx.save();
    ctx.globalAlpha = s.alpha * 0.5;
    ctx.strokeStyle = "#9988cc";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - 1, s.y + s.len);
    ctx.stroke();
    ctx.restore();
  }

  // Pixie sitting on ground
  const catX = Math.floor(W * 0.15);
  const catY = Math.floor(H * 0.73) - DRAW_H + 10;
  ctx.drawImage(sitImg, titleFrame * FRAME_W, 0, FRAME_W, FRAME_H, catX, catY, DRAW_W, DRAW_H);

  // === TITLE TEXT — big, centred-right ===
  ctx.textAlign = "center";
  ctx.font = "22px 'Press Start 2P'";
  // Drop shadow
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillText("D0DZ", W/2 + 2, 52);
  ctx.fillStyle = PAL.accent;
  ctx.fillText("D0DZ", W/2, 50);

  ctx.font = "6px 'Press Start 2P'";
  ctx.fillStyle = "#cc88ff";
  ctx.fillText("PIXIE HATES WATER", W/2, 66);
  ctx.fillStyle = "rgba(212,250,255,0.5)";
  ctx.fillText("HIGH SCORE: " + best, W/2, 80);

  // === MENU BOX ===
  const menuItems = ["START GAME", "HOW TO PLAY", "CONTROLS"];
  const boxW = 190, boxH = 90;
  const boxX = W/2 - boxW/2, boxY = H * 0.38;

  // Box shadow
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(boxX + 3, boxY + 3, boxW, boxH);
  // Box bg
  ctx.fillStyle = "#0e0a1e";
  ctx.fillRect(boxX, boxY, boxW, boxH);
  // Box border (double pixel style like the ref image)
  ctx.strokeStyle = "#cc88ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = "rgba(200,140,255,0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX + 4, boxY + 4, boxW - 8, boxH - 8);

  for (let i = 0; i < menuItems.length; i++) {
    const itemY = boxY + 24 + i * 24;
    const selected = i === titleMenuIndex;
    ctx.font = "7px 'Press Start 2P'";
    if (selected) {
      // Highlight row
      ctx.fillStyle = "rgba(200,100,255,0.18)";
      ctx.fillRect(boxX + 6, itemY - 10, boxW - 12, 14);
      ctx.fillStyle = PAL.accent;
      ctx.fillText("▶ " + menuItems[i], W/2, itemY);
    } else {
      ctx.fillStyle = "rgba(212,250,255,0.45)";
      ctx.fillText(menuItems[i], W/2, itemY);
    }
  }

  // Nav hint
  ctx.font = "5px 'Press Start 2P'";
  ctx.fillStyle = "rgba(200,140,255,0.4)";
  ctx.fillText("↑↓ NAVIGATE   SPACE SELECT", W/2, boxY + boxH + 14);

  // Blinking press space
  if (blinkT < 30) {
    ctx.font = "6px 'Press Start 2P'";
    ctx.fillStyle = PAL.accent;
    ctx.fillText("PRESS SPACE TO START", W/2, boxY + boxH + 28);
  }

  ctx.textAlign = "left";
}

function drawHowToPlay() {
  // Reuse bg
  ctx.fillStyle = "#0e0a1e";
  ctx.fillRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#1a0e30"); sky.addColorStop(1, "#6a2a40");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.font = "9px 'Press Start 2P'";
  ctx.fillStyle = PAL.accent;
  ctx.fillText("HOW TO PLAY", W/2, 40);

  const lines = [
    ["GOAL", "SURVIVE AS LONG AS"],
    ["",     "POSSIBLE!"],
    ["",     ""],
    ["MOVE", "LEFT / RIGHT ARROWS"],
    ["",     ""],
    ["DODGE", "AVOID THE RAINDROPS"],
    ["",      "PIXIE HATES WATER!"],
    ["",     ""],
    ["SCORE", "EACH DROP THAT HITS"],
    ["",      "THE GROUND = +POINTS"],
    ["",     ""],
    ["MODES", "EASY / MED / HARD"],
    ["",      "HARDER = MORE DROPS"],
    ["",      "+ FASTER SPEED"],
  ];

  ctx.textAlign = "left";
  ctx.font = "5px 'Press Start 2P'";
  let y = 68;
  for (const [label, text] of lines) {
    if (label) {
      ctx.fillStyle = "#cc88ff";
      ctx.fillText(label + ":", 20, y);
    }
    if (text) {
      ctx.fillStyle = "rgba(212,250,255,0.8)";
      ctx.fillText(text, label ? 82 : 20, y);
    }
    y += 14;
  }

  ctx.textAlign = "center";
  if (blinkT < 30) {
    ctx.font = "6px 'Press Start 2P'";
    ctx.fillStyle = PAL.accent;
    ctx.fillText("SPACE TO GO BACK", W/2, H - 16);
  }
  ctx.textAlign = "left";
}

function drawControls() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#1a0e30"); sky.addColorStop(1, "#6a2a40");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.font = "9px 'Press Start 2P'";
  ctx.fillStyle = PAL.accent;
  ctx.fillText("CONTROLS", W/2, 40);

  const controls = [
    ["← →", "MOVE PIXIE"],
    ["SPACE", "START / CONFIRM"],
    ["ESC", "BACK TO TITLE"],
    ["", ""],
    ["TIPS:", ""],
    ["", "STAY NEAR CENTRE"],
    ["", "TO HAVE MORE TIME"],
    ["", "TO REACT!"],
    ["", ""],
    ["", "DROPS SPEED UP"],
    ["", "AS SCORE RISES!"],
  ];

  ctx.textAlign = "left";
  ctx.font = "5px 'Press Start 2P'";
  let y = 72;
  for (const [key, desc] of controls) {
    if (key && key !== "TIPS:") {
      ctx.fillStyle = "#cc88ff";
      ctx.fillRect(20, y - 8, 58, 12);
      ctx.fillStyle = "#0e0a1e";
      ctx.font = "5px 'Press Start 2P'";
      ctx.fillText(key, 22, y);
      ctx.fillStyle = "rgba(212,250,255,0.8)";
      ctx.fillText(desc, 88, y);
    } else if (key === "TIPS:") {
      ctx.fillStyle = PAL.accent;
      ctx.font = "5px 'Press Start 2P'";
      ctx.fillText("TIPS:", 20, y);
    } else if (desc === "") {
      // spacer
    } else {
      ctx.fillStyle = "rgba(212,250,255,0.65)";
      ctx.font = "5px 'Press Start 2P'";
      ctx.fillText(desc, 20, y);
    }
    y += 16;
  }

  ctx.textAlign = "center";
  if (blinkT < 30) {
    ctx.font = "6px 'Press Start 2P'";
    ctx.fillStyle = PAL.accent;
    ctx.fillText("SPACE TO GO BACK", W/2, H - 16);
  }
  ctx.textAlign = "left";
}
function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;

  ctx.textAlign = "center";

  // GAME OVER title
  ctx.fillStyle = "#fc9bd3";
  ctx.font = "20px 'Press Start 2P'";
  ctx.fillText("GAME OVER", cx, cy - 80);

  // Subtitle
  ctx.fillStyle = PAL.text;
  ctx.font = "8px 'Press Start 2P'";
  ctx.fillText("PIXIE GOT WET!", cx, cy - 40);

  // Score
  ctx.fillStyle = PAL.text;
  ctx.fillText(`SCORE: ${score}`, cx, cy);

  // Best
  ctx.fillStyle = PAL.border;
  ctx.fillText(`BEST: ${best}`, cx, cy + 28);

  // New best!
  if (score === best && score > 0) {
    ctx.fillStyle = PAL.accent;
    ctx.fillText("NEW BEST!", cx, cy + 56);
  }

  // Difficulty drops
  const diffLevel = best >= 25 ? 3 : best >= 10 ? 2 : 1;
  const dropR = 5;
  const dropSpacing = 18;
  const dropStartX = cx - dropSpacing;
  const dropY = cy + 72;

  ctx.font = "6px 'Press Start 2P'";
  ctx.fillStyle = PAL.text;
  ctx.fillText("DIFFICULTY", cx, dropY - 10);

  for (let i = 0; i < 3; i++) {
    const filled = i < diffLevel;
    ctx.globalAlpha = filled ? 1 : 0.2;
    ctx.fillStyle = filled ? "#d4faff" : PAL.text;
    drawRaindrop(dropStartX + i * dropSpacing, dropY, dropR);
  }
  ctx.globalAlpha = 1;

  // Restart prompt
  if (blinkT < 30) {
    ctx.fillStyle = PAL.accent;
    ctx.fillText("PRESS SPACE TO RETRY", cx, cy + 115);
  }

  ctx.textAlign = "left";
}

// =========================
// MAIN DRAW
// =========================
function draw() {
  ctx.clearRect(0, 0, W, H);

  if (state === "howtoplay") {
    drawHowToPlay();
  } else if (state === "controls") {
    drawControls();
  } else if (state === "title") {
    drawTitleScreen();
  } else if (state === "modeselect") {
    drawModeSelect();
  } else if (state === "loading") {
    drawLoadingScreen();
  } else if (state === "playing") {
    if (selectedMode === 0) drawBgEasy();
    else if (selectedMode === 1) drawBgMedium();
    else drawBgHard();
    drawEnemies();
    drawParticles();
    drawPlayer();
  } else if (state === "gameover") {
    if (selectedMode === 0) drawBgEasy();
    else if (selectedMode === 1) drawBgMedium();
    else drawBgHard();
    drawGameOver();
  }

  drawUI();
  drawBackButton();
  drawBorder();
  drawScanlines();
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