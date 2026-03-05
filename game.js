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
    // clicking left/right thirds selects mode, center confirms
    if (my > H * 0.35 && my < H * 0.75) {
      if (mx < W / 3) selectedMode = 0;
      else if (mx < W * 2 / 3) selectedMode = 1;
      else selectedMode = 2;
    }
    // confirm button area
    const confirmBtn = { x: W/2 - 80, y: H * 0.78, w: 160, h: 28 };
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
    if (state === "title" || state === "gameover") {
      state = "modeselect";
      selectedMode = 0;
    } else if (state === "modeselect") {
      playSfx(SFX.start);
      startLoading();
    }
  }

  if (state === "modeselect") {
    if (e.key === "ArrowLeft")  selectedMode = (selectedMode + 2) % 3;
    if (e.key === "ArrowRight") selectedMode = (selectedMode + 1) % 3;
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

  if (state === "title") {
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
function drawBgEasy() {
  // Night city — existing cityscape (unchanged)
  drawCityscape();
}

function drawBgMedium() {
  // Dusk / sunset city
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#1a0a2e");
  sky.addColorStop(0.3, "#3d1a4a");
  sky.addColorStop(0.6, "#7a2d3e");
  sky.addColorStop(1, "#c45c2a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Dusk rain streaks — warmer tint
  for (const s of RAIN_STREAKS) {
    ctx.save();
    ctx.globalAlpha = s.alpha * 0.7;
    ctx.strokeStyle = "#ffb88a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - 1, s.y + s.len);
    ctx.stroke();
    ctx.restore();
  }

  // Sun low on horizon
  const sunX = W * 0.25;
  const sunY = BUILDING_BASE - 10;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 60);
  sunGlow.addColorStop(0, "rgba(255,160,60,0.6)");
  sunGlow.addColorStop(0.4, "rgba(255,100,30,0.25)");
  sunGlow.addColorStop(1, "rgba(255,60,0,0)");
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffb347";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 12, 0, Math.PI * 2);
  ctx.fill();

  // Buildings — silhouetted warm
  for (const b of BUILDINGS.filter(b => b.layer === 0)) {
    ctx.fillStyle = "#1a0a1e";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    for (const w of b.windows) {
      if (w.lit) {
        ctx.fillStyle = "#ffcc66";
        ctx.globalAlpha = 0.55;
        ctx.fillRect(w.x, w.y, 5, 4);
        ctx.globalAlpha = 1;
      }
    }
  }
  for (const b of BUILDINGS.filter(b => b.layer === 1)) {
    ctx.fillStyle = "#0d0510";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    for (const w of b.windows) {
      if (w.lit) {
        ctx.fillStyle = "#ffaa44";
        ctx.globalAlpha = 0.7;
        ctx.fillRect(w.x, w.y, 5, 4);
        ctx.globalAlpha = 1;
      }
    }
  }

  // Ground
  const ground = ctx.createLinearGradient(0, BUILDING_BASE, 0, H);
  ground.addColorStop(0, "#1a0a10");
  ground.addColorStop(1, "#2a1020");
  ctx.fillStyle = ground;
  ctx.fillRect(0, BUILDING_BASE, W, H - BUILDING_BASE);

  ctx.strokeStyle = "#c45c2a";
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, BUILDING_BASE);
  ctx.lineTo(W, BUILDING_BASE);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBgHard() {
  // Thunderstorm — dark, electric, heavy rain
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#050508");
  sky.addColorStop(0.5, "#0a0a14");
  sky.addColorStop(1, "#0f0a18");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Heavy rain streaks — more dense and longer
  for (const s of RAIN_STREAKS) {
    ctx.save();
    ctx.globalAlpha = s.alpha * 1.8;
    ctx.strokeStyle = "#8ab4cc";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - 2, s.y + s.len * 1.8);
    ctx.stroke();
    ctx.restore();
  }

  // Lightning flash (random subtle ambient)
  if (Math.random() < 0.003) {
    ctx.fillStyle = "rgba(180,180,255,0.06)";
    ctx.fillRect(0, 0, W, H);
  }

  // Storm clouds at top
  ctx.fillStyle = "rgba(20,15,35,0.7)";
  ctx.fillRect(0, 0, W, 60);

  // Buildings — nearly pitch black, few lights
  for (const b of BUILDINGS.filter(b => b.layer === 0)) {
    ctx.fillStyle = "#050508";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    for (const w of b.windows) {
      if (w.lit && Math.random() < 0.3) {
        ctx.fillStyle = "#6699cc";
        ctx.globalAlpha = 0.4;
        ctx.fillRect(w.x, w.y, 5, 4);
        ctx.globalAlpha = 1;
      }
    }
  }
  for (const b of BUILDINGS.filter(b => b.layer === 1)) {
    ctx.fillStyle = "#080810";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    for (const w of b.windows) {
      if (w.lit && Math.random() < 0.25) {
        ctx.fillStyle = "#aaccff";
        ctx.globalAlpha = 0.45;
        ctx.fillRect(w.x, w.y, 5, 4);
        ctx.globalAlpha = 1;
      }
    }
  }

  // Ground
  const ground = ctx.createLinearGradient(0, BUILDING_BASE, 0, H);
  ground.addColorStop(0, "#05050a");
  ground.addColorStop(1, "#0a0a15");
  ctx.fillStyle = ground;
  ctx.fillRect(0, BUILDING_BASE, W, H - BUILDING_BASE);

  ctx.strokeStyle = "#3a4aff";
  ctx.globalAlpha = 0.25;
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
  if (selectedMode === 0) drawCityscape();
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
  ctx.fillText("SELECT MODE", cx, 38);

  // Mode cards
  const cardW = 82;
  const cardH = 110;
  const cardGap = 8;
  const totalW = 3 * cardW + 2 * cardGap;
  const cardStartX = cx - totalW / 2;
  const cardY = 58;

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

    // Card bg
    ctx.fillStyle = selected ? modeBgs[i] : "rgba(0,0,0,0.3)";
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

    // Selected indicator arrow
    if (selected) {
      ctx.fillStyle = modeColors[i];
      ctx.font = "8px 'Press Start 2P'";
      ctx.fillText("▼", cx2, cardY + cardH + 14);
    }
  }

  // Confirm prompt
  ctx.textAlign = "center";
  if (blinkT < 30) {
    ctx.fillStyle = modeColors[selectedMode];
    ctx.font = "7px 'Press Start 2P'";
    ctx.fillText("PRESS SPACE TO PLAY", cx, H * 0.82);
  }

  // Nav hint
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "5px 'Press Start 2P'";
  ctx.fillText("← → TO BROWSE", cx, H * 0.88);

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

  // Shadow under feet
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(drawX + DRAW_W / 4, GROUND_Y - 2, DRAW_W / 2, 3);

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
  ctx.fillStyle = PAL.field;
  ctx.fillRect(0, 0, W, H);

  drawBgEnemies();

  ctx.fillStyle = PAL.text;
  ctx.textAlign = "center";

  // ✅ Move the whole block down by changing this ONE number
  const baseY = 140; // try 140–160

  // Title
  ctx.font = "16px 'Press Start 2P'";
  ctx.fillStyle = PAL.accent;
  ctx.fillText("DØDZ", W / 2, baseY);
  ctx.fillStyle = PAL.text;

  // Body text
  ctx.font = "8px 'Press Start 2P'";
  ctx.fillText("PIXIE HATES WATER!", W / 2, baseY + 48);
  ctx.fillText("HELP HER DODGE THE", W / 2, baseY + 72);
  ctx.fillText("RAINDROPS", W / 2, baseY + 96);
  ctx.fillText("KEYS:  ←  → ", W / 2, baseY + 134);

  // High score
  ctx.fillStyle = PAL.border;
  ctx.fillText(`HIGH SCORE: ${best}`, W / 2, baseY + 168);

  // Difficulty indicator — based on best score
  const diffLevel = best >= 25 ? 3 : best >= 10 ? 2 : 1;
  const diffLabel = diffLevel === 1 ? "EASY" : diffLevel === 2 ? "MEDIUM" : "HARD";
  const dropR = 5;
  const dropSpacing = 18;
  const totalDropW = diffLevel * dropSpacing - (dropSpacing - dropR * 2);
  const dropStartX = W / 2 - totalDropW / 2 - dropR + dropSpacing / 2;
  const dropY = baseY + 193;

  ctx.fillStyle = PAL.text;
  ctx.font = "6px 'Press Start 2P'";
  ctx.fillText(diffLabel, W / 2, dropY - 10);

  for (let i = 0; i < 3; i++) {
    const filled = i < diffLevel;
    ctx.globalAlpha = filled ? 1 : 0.2;
    ctx.fillStyle = filled ? "#d4faff" : PAL.text;
    drawRaindrop(dropStartX + i * dropSpacing, dropY, dropR);
  }
  ctx.globalAlpha = 1;

  // Start prompt
  if (blinkT < 30) {
    ctx.fillStyle = PAL.accent;
    ctx.font = "8px 'Press Start 2P'";
    ctx.fillText("PRESS SPACE TO START", W / 2, baseY + 222);
  }

  // Sitting cat (keep “a lil under press space”)
  const catX = Math.floor(W / 2 - DRAW_W / 2);
  const catY = baseY + 232;
  ctx.drawImage(
    sitImg,
    titleFrame * FRAME_W, 0, FRAME_W, FRAME_H,
    catX, catY, DRAW_W, DRAW_H
  );

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

  if (state === "title") {
    drawTitleScreen();
  } else if (state === "modeselect") {
    drawModeSelect();
  } else if (state === "loading") {
    drawLoadingScreen();
  } else if (state === "playing") {
    if (selectedMode === 0) drawCityscape();
    else if (selectedMode === 1) drawBgMedium();
    else drawBgHard();
    drawEnemies();
    drawParticles();
    drawPlayer();
  } else if (state === "gameover") {
    if (selectedMode === 0) drawCityscape();
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