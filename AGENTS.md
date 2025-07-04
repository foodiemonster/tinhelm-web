# AGENTS.md

## 🔍 Project Overview

This project is a browser-based, solo-playable web game adaptation of the board game Tin Helm. The final product will simulate the full gameplay loop of the physical card game, including deck handling, character progression, room exploration, and turn-based combat.

The game must be visually appealing, mobile-friendly, and require no server-side components (pure frontend). All game logic and UI will run in-browser.

---

## 🧠 Agent Roles

### 1. `ScaffoldingAgent`
**Goal**: Set up the initial file structure and baseline files for the project.  
**Responsibilities**:
- Create `/index.html`, `/style.css`, and `/scripts/main.js`
- Add folder structure: `/assets/cards/`, `/data/`
- Ensure code runs in the browser from a fresh clone

---

### 2. `DataModelAgent`
**Goal**: Define data structures and load card/game data.  
**Responsibilities**:
- Create data schemas for all card types: Dungeon, Loot, Enemy, Trappings, Race, Class
- Define how decks are shuffled, drawn, and resolved
- Create sample JSON data for testing

---

### 3. `GameLogicAgent`
**Goal**: Implement core game loop logic.  
**Responsibilities**:
- Manage player state (HP, energy, food, favor)
- Handle level progression, room resolution, icon interpretation
- Implement shard collection and win/loss conditions

---

### 4. `CombatAgent`
**Goal**: Handle all combat-related interactions.  
**Responsibilities**:
- Dice rolling, doubles detection
- Energy use → attack bonus mapping
- Enemy response logic and stat calculations

---

### 5. `UIAgent`
**Goal**: Build and animate the UI.  
**Responsibilities**:
- Display player stats and current room
- Animate card transitions (draw, reveal, discard)
- Visualize dice rolls and enemy attacks
- Ensure mobile responsiveness

---

## 📜 Shared Context for All Agents

- All data and logic must be implemented in **vanilla JavaScript**, with optional use of lightweight libraries if required.
- All assets must be client-side and work without a server.
- Code must be readable, modular, and documented where helpful.
- All visual elements must support mobile-first design.

---

## 🗨️ Communication Style

Agents do not need to speak to each other explicitly. Instead, they contribute their responsibilities into separate files, leaving comments for the next agent where handoff is expected.

Example:
```js
// GameLogicAgent: call CombatAgent here when an enemy icon is resolved
startCombat(enemyCard);
```

---

## ✅ End State

The project is complete when:
- A user can play through all 5 dungeon levels
- Shards are tracked and collected
- Stat bars and UI update dynamically
- Game ends with a win or loss screen
