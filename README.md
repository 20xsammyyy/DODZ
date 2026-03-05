# D0DZ 🌧️

**D0DZ** is a retro-style arcade dodger game inspired by classic 1980s pixel games. Play as Pixie, a cat who *hates* water; help her survive the rainstorm in her city and find her way home.

---

## 🎮 Gameplay

Dodge falling raindrops by moving left and right. The longer Pixie survives, the higher your score. One hit from the rain and it's game over!

---

## Features

- Retro Game Boy-inspired UI with pixel art visuals
- Animated pixel cat sprite (Pixie!)
- Rainy night cityscape background with moon
- Dust particles when running, splash effects when raindrops hit the ground
- Score tracking with persistent high score
- Loading screen with arcade-style progress bar
- Scanline overlay for authentic retro feel

---

## 🕹️ Controls

| Key | Action |
|-----|--------|
| `←` Left Arrow | Move Left |
| `→` Right Arrow | Move Right |
| `Spacebar` | Start / Restart Game |

---

## Play right from your PC!

No installation or downloads required, D0DZ runs directly in your browser.

**Option 1 — Play from the files directly:**
1. Download or clone this repository
   ```
   git clone https://github.com/20xsammyyy/DODZ.git
   ```
2. Open the project folder
3. Double-click `index.html` — it will open in your browser and you're ready to play!

**Option 2 — Use a local server (recommended for full audio/sprite support):**

If sprites or sounds aren't loading, run a simple local server instead:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```
Then open your browser and go to `http://localhost:8000`

*With Node.js:*
```bash
npx serve .
```
Then open `http://localhost:3000`

> **Why a local server?** Browsers block local file access for security reasons. A local server bypasses this so sprites and audio load correctly.

---

## Creator

Made by **Samantha Brown**
