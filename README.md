# D0DZ 🌧️

D0DZ is a retro-style arcade dodger game inspired by classic 1980s pixel games. Play as Pixie, a cat who hates water, and help her survive the rainstorm to make it home dry.

---

## 🎮 Gameplay

Dodge falling raindrops by moving left and right.  
The longer Pixie survives, the higher your score climbs.

Be careful, one hit from the rain and it's game over!

---

## ✨ Features

- Retro Game Boy-inspired UI with pixel art visuals
- Animated pixel cat sprite (Pixie!)
- **3 difficulty modes** — Easy, Medium and Hard, each with a unique hand-crafted background
  - 🚉 Easy — rainy Japanese train station
  - 🚗 Medium — busy city street under the full moon
  - 🌲 Hard — chilly forest with thunderstorm
- Dynamic difficulty scaling — drops get faster as your score rises
- Special FX — running dust particles, raindrop splashes, and audio for game start, scoring, and game over
- **High score leaderboard** — top 10 scores saved locally with score, difficulty mode, and date
- **Achievement system** — 10 unlockable achievements 
- Scanline overlay for authentic retro feel

---

## 🕹️ Controls

| Key | Action |
|-----|--------|
| `←` `→` Arrow Keys | Move Pixie |
| `↑` `↓` Arrow Keys | Navigate menus |
| `Spacebar` | Start / Confirm |
| `Esc` | Back |
| `S` (on Game Over) | View Scores |

---

## Play right now from your PC! 

No installation required — D0DZ runs directly in your browser.

**Option 1 — Open directly:**
1. Download or clone this repository
```
git clone https://github.com/20xsammyyy/DODZ.git
```
2. Open the project folder
3. Double-click `index.html` — done!

**Option 2 — Local server (recommended for full audio/sprite support):**
```bash
# Python 3
python -m http.server 8000
```
Then open `http://localhost:8000`

```bash
# Node.js
npx serve .
```
Then open `http://localhost:3000`

> Browsers block local file access for security reasons. A local server ensures sprites and audio load correctly.

---

## Creator

Made by Samantha Brown
