# Tin Helm Web Adaptation - Task Roadmap

This file outlines the task roadmap for the Tin Helm web adaptation project, based on the content in `README.md`, `AGENTS.md`, and `GAMERULES.md`.

Tasks are prioritized to focus development on the core gameplay loop.

---

## Must Have (Core Gameplay)

These tasks are essential for a minimally viable product (MVP).

### GameLogicAgent

| Task | Files/Location | Description | Status |
|---|---|---|---|
| 1. Player creation flow | `scripts/gameLogic.js` | Allow selection of race and class from card data. Initialize player stats (HP, energy, food, favor) based on chosen cards. |  |
| 2. Dungeon level loop | `scripts/gameLogic.js` | Implement the six-room turn sequence: draw two cards, decide to resolve or skip, and apply icons in order. |  |
| 3. Icon resolution handlers | `scripts/gameLogic.js` | Implement functions for each icon type (ENEMY, LOOT, TRAP, etc.) that use data from the paired result card.  **Dependency:** DataModelAgent - Card data structures |  |
| 4. Win/loss condition checks | `scripts/gameLogic.js` | After each room or level, verify if the player has collected 3 shards or reached level 6 without success, then end the game. |  |

### DataModelAgent

| Task | Files/Location | Description | Status |
|---|---|---|---|
| 5. Define card type schemas | `scripts/data/cards.js`, `data/` | Create JS classes or factory functions for Dungeon, Enemy, Loot, Trap, Race, Class, and Trappings cards. Supply a few example card entries in JSON for testing. |  |
| 6. Implement deck loading | `scripts/data/cards.js` | Load card data from JSON files or in-memory objects, build shuffled decks, and expose functions for drawing cards. |  |

### CombatAgent

| Task | Files/Location | Description | Status |
|---|---|---|---|
| 7. Dice roll mechanics | `scripts/combat.js` | Implement 2d6 dice rolls with doubles detection and an API for the game logic to call. |  |
| 8. Energy-based attack bonuses | `scripts/combat.js` | Allow the player to spend energy before rolling to gain bonus damage according to class rules. |  |
| 9. Enemy response and HP tracking | `scripts/combat.js` | Process enemy defense, attack values, and special powers, applying damage to the player as needed. |  |

### UIAgent

| Task | Files/Location | Description | Status |
|---|---|---|---|
| 10. Room/result card pairing UI | `index.html`, `style.css`, `scripts/ui.js` | Display the current room card next to its result card. Show card flipping animations when resolving rooms.  **Dependency:** DataModelAgent - Card data structures |  |
| 11. Stat tracking updates | `scripts/gameLogic.js`, `index.html` | Update the displayed stat bars whenever health, energy, food, or favor changes. |  |

---

## Should Have (Enhancements)

These tasks enhance the core gameplay experience.

### GameLogicAgent, UIAgent

| Task | Files/Location | Description | Status |
|---|---|---|---|
| 12. Inventory and loot management | `scripts/gameLogic.js`, `scripts/ui.js` | Track acquired items (trappings, loot) and provide a simple display component for them. |  |

### UIAgent

| Task | Files/Location | Description | Status |
|---|---|---|---|
| 13. Win/loss screen with score | `index.html`, `scripts/ui.js`, `style.css` | Display a final message showing the player's shards, favor, remaining stats, and total score. |  |

---

## Could Have (Polish & Optimization)

These tasks add visual polish and improve performance.

### UIAgent

| Task | Files/Location | Description | Status |
|---|---|---|---|
| 14. Card draw and shuffle animations | `style.css`, `scripts/ui.js` | Animate cards moving from the deck to the play area, and show a shuffle effect between levels. |  |
| 15. Dice roll visualization | `index.html`, `style.css`, `scripts/ui.js` | Add a dice animation or visual indicator for each combat roll. |  |
| 16. Turn/room transitions | `scripts/ui.js`, `style.css` | Fade or slide between rooms and levels to make the gameplay flow smoother. |  |
| 17. Responsive layout adjustments | `style.css`, `scripts/ui.js` | Ensure the game area scales well on smaller screens and orientation changes. |  |
| 18. Asset optimization | `assets/` | Compress image assets and preload key graphics to keep load times low on mobile devices. |  |
| 19. Performance tweaks | `scripts/` | Review animations and script behavior for smooth performance on low‑power devices. |  |

### ScaffoldingAgent

| Task | Files/Location | Description | Status |
|---|---|---|---|
| 20. Create base HTML layout | `index.html` | Ensure the document has placeholders for the dungeon deck, a dummy card, and stat bars. (already complete) | Complete |
| 21. Add initial styles for layout | `style.css` | Provide basic mobile‑first styling so the deck placeholder, dummy card, and stat bars appear centered. (already complete) | Complete |
| 22. Initialize main script | `scripts/main.js` | Add a DOMContentLoaded listener that logs a message, verifying the scaffold loads. (already complete) | Complete |

---

**NOTE:** This task roadmap is a living document and may be updated as the project progresses.

---

## Phase 1 – Scaffolding & Structure

| Task | Files/Location | Agent | Description |
|------|----------------|--------|-------------|
| 1. Create base HTML layout | index.html | ScaffoldingAgent | Ensure the document has placeholders for the dungeon deck, a dummy card, and stat bars. (already complete) |
| 2. Add initial styles for layout | style.css | ScaffoldingAgent | Provide basic mobile‑first styling so the deck placeholder, dummy card, and stat bars appear centered. (already complete) |
| 3. Initialize main script | scripts/main.js | ScaffoldingAgent | Add a DOMContentLoaded listener that logs a message, verifying the scaffold loads. (already complete) |

---

## Phase 2 – Data Setup

| Task | Files/Location | Agent | Description |
|------|----------------|--------|-------------|
| 4. Define card type schemas | scripts/data/cards.js, data/ | DataModelAgent | Create JS classes or factory functions for Dungeon, Enemy, Loot, Trap, Race, Class, and Trappings cards. Supply a few example card entries in JSON for testing. |
| 5. Implement deck loading | scripts/data/cards.js | DataModelAgent | Load card data from JSON files or in-memory objects, build shuffled decks, and expose functions for drawing cards. |

---

## Phase 3 – Game Logic Core

| Task | Files/Location | Agent | Description |
|------|----------------|--------|-------------|
| 6. Player creation flow | scripts/gameLogic.js | GameLogicAgent | Allow selection of race and class from the card data. Initialize player stats (HP, energy, food, favor) based on chosen cards. |
| 7. Dungeon level loop | scripts/gameLogic.js | GameLogicAgent | Implement the six-room turn sequence: draw two cards, decide to resolve or skip, and apply icons in order. |
| 8. Stat tracking updates | scripts/gameLogic.js, index.html | GameLogicAgent | Update the displayed stat bars whenever health, energy, food, or favor changes. |

---

## Phase 4 – Combat System

| Task | Files/Location | Agent | Description |
|------|----------------|--------|-------------|
| 9. Dice roll mechanics | scripts/combat.js | CombatAgent | Implement 2d6 dice rolls with doubles detection and an API for the game logic to call. |
| 10. Energy-based attack bonuses | scripts/combat.js | CombatAgent | Allow the player to spend energy before rolling to gain bonus damage according to class rules. |
| 11. Enemy response and HP tracking | scripts/combat.js | CombatAgent | Process enemy defense, attack values, and special powers, applying damage to the player as needed. |

---

## Phase 5 – Card Interactions

| Task | Files/Location | Agent | Description |
|------|----------------|--------|-------------|
| 12. Room/result card pairing UI | index.html, style.css, scripts/ui.js | UIAgent | Display the current room card next to its result card. Show card flipping animations when resolving rooms. |
| 13. Icon resolution handlers | scripts/gameLogic.js | GameLogicAgent | Implement functions for each icon type (ENEMY, LOOT, TRAP, etc.) that use data from the paired result card. |
| 14. Inventory and loot management | scripts/gameLogic.js, scripts/ui.js | GameLogicAgent, UIAgent | Track acquired items (trappings, loot) and provide a simple display component for them. |

---

## Phase 6 – Visual Polish

| Task | Files/Location | Agent | Description |
|------|----------------|--------|-------------|
| 15. Card draw and shuffle animations | style.css, scripts/ui.js | UIAgent | Animate cards moving from the deck to the play area, and show a shuffle effect between levels. |
| 16. Dice roll visualization | index.html, style.css, scripts/ui.js | UIAgent | Add a dice animation or visual indicator for each combat roll. |
| 17. Turn/room transitions | scripts/ui.js, style.css | UIAgent | Fade or slide between rooms and levels to make the gameplay flow smoother. |

---

## Phase 7 – Endgame & Scoring

| Task | Files/Location | Agent | Description |
|------|----------------|--------|-------------|
| 18. Win/loss condition checks | scripts/gameLogic.js | GameLogicAgent | After each room or level, verify if the player has collected 3 shards or reached level 6 without success, then end the game. |
| 19. Result screen with score | index.html, scripts/ui.js, style.css | UIAgent | Display a final message showing the player's shards, favor, remaining stats, and total score. |

---

## Phase 8 – Mobile Polish

| Task | Files/Location | Agent | Description |
|------|----------------|--------|-------------|
| 20. Responsive layout adjustments | style.css, scripts/ui.js | UIAgent | Ensure the game area scales well on smaller screens and orientation changes. |
| 21. Asset optimization | assets/ | UIAgent | Compress image assets and preload key graphics to keep load times low on mobile devices. |
| 22. Performance tweaks | scripts/ | UIAgent | Review animations and script behavior for smooth performance on low‑power devices. |
