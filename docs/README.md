Launch Web UI: https://foodiemonster.github.io/tinhelm-web/

# Tin Helm Web Adaptation

This project is a browser-based digital adaptation of the solo dungeon-crawling board game **Tin Helm**, originally designed by Jason Glover. The goal is to recreate the game’s mechanics and flow in an accessible web format, with mobile-friendly design and light visual polish (e.g. card animations, dice rolls, and stat tracking).

The core gameplay loop includes deck-based exploration, turn-based room resolution, card-based enemy combat, and player stat management (health, energy, food, favor). The player wins by collecting 3 shards before reaching the 6th level, and loses if they run out of health or reach level 6 without all shards.

The web app should be playable on desktop and mobile, with intuitive controls (click/tap) and simple UI elements that reflect the current game state. All game art assets are available digitally and can be used for card rendering.

The rules are provided in full in GAMERULES.md, which should be used as the basis for understanding mechanics, state transitions, and card logic.

---

## Save and Load

Starting in the early prototype you can save your progress to the browser's `localStorage` and load it again later. Use the **Save Game** and **Load Game** buttons below the stat bar. The data is stored under the key `tinhelm-save` and includes all values from the global `gameState` object (player stats, level, inventory, etc.).

---

## ✅ Project Roadmap

### Phase 1: Scaffolding & Structure
- [X] Create base file structure:
  - `/index.html`, `/style.css`, `/scripts/main.js`
  - `/assets/cards/` for card images
- [x] Scaffold initial HTML with:
  - A main game area
  - A status bar (health, energy, food, favor, level)
  - A placeholder deck/draw area
- [x] Ensure the app runs locally or via GitHub Pages

### Phase 2: Data Setup
- [x] Define card types: Dungeon, Enemy, Loot, Trap, Class, Race, Trappings
- [x] Create JS object schemas for each card type
- [x] Load deck data from JSON or preload into memory

### Phase 3: Game Logic Core
- [x] Implement player creation flow (select race/class, assign stats)
- [x] Implement dungeon level loop:
  - Draw and resolve 6 rooms using 12 cards
  - Apply icons in correct sequence (ENEMY, TRAP, LOOT, etc.)
- [x] Build stat tracking (health, energy, food, favor)

### Phase 4: Combat System
- [x] Simulate dice rolls (2d6), implement rules for doubles
- [ ] Add energy-expenditure mechanic to boost attack
- [x] Add enemy defense, HP, attack response logic
- [x] Apply damage to player/enemy
- [x] End combat on win/loss

### Phase 5: Card Interactions
- [x] Build UI for room vs result card pairing
- [x] Implement icon resolution handlers (LOOT, ENEMY, etc.)
- [x] Trigger card reveals, add to player inventory, etc.

### Phase 6: Visual Polish
- [ ] Animate card draws/shuffles
- [x] Animate dice rolls
- [ ] Add fading/transition effects for turns and actions

### Phase 7: Endgame & Scoring
- [ ] Check for win/loss conditions each level
- [ ] Score player outcome on win/loss
- [ ] Display result screen

### Phase 8: Mobile Polish
- [ ] Ensure all UI elements scale for small screens
- [ ] Add simple responsive layout behavior
- [ ] Optimize assets and transitions for low power devices
