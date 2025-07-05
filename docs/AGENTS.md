# Tin Helm Web Game - Agent Responsibilities

## 🔍 Project Overview

This project is a browser-based, solo-playable web game adaptation of the board game Tin Helm. It simulates the full gameplay loop of the physical card game, including deck handling, character progression, room exploration, and turn-based combat.

**Key Requirements:**

*   **Platform:** Browser-based (pure frontend)
*   **Playability:** Solo
*   **Dependencies:** None (vanilla JavaScript preferred, lightweight libraries acceptable)
*   **Responsiveness:** Mobile-friendly
*   **Persistence:** No server-side components required

---

## 🧠 Agent Roles and Responsibilities

This project is divided into several key agents, each responsible for a specific area of functionality.

### 1. ScaffoldingAgent

**Goal:** Initialize the project structure and core files.

**Responsibilities:**

*   Create the following files:
    *   `index.html` (entry point)
    *   `style.css` (styling)
    *   `scripts/main.js` (main application logic)
*   Create the following directories:
    *   `assets/cards/` (card assets)
    *   `data/` (game data, e.g., card definitions)
*   Ensure the basic structure allows the code to run in the browser after a fresh clone. (e.g., a basic "Hello, world!" in `index.html` and `main.js`).

**Deliverables:**

*   A functional project skeleton that can be opened in a browser.
*   Basic HTML, CSS, and JavaScript files in place.

---

### 2. DataModelAgent

**Goal:** Define data structures for game elements and load card data.

**Responsibilities:**

*   **Data Schemas:** Design JavaScript data structures (objects/classes) to represent the following card types:
    *   Dungeon
    *   Loot
    *   Enemy
    *   Trappings
    *   Race
    *   Class
    *   Example:
        ```javascript
        const DungeonCard = {
            id: String,
            name: String,
            description: String,
            roomIcon: String, // e.g., "monster", "treasure"
            resultText: String,
        };
        ```
*   **Deck Management:** Implement functions for:
    *   Shuffling decks (using a suitable randomization algorithm)
    *   Drawing cards from decks
    *   Resolving card effects
*   **Sample Data:** Create JSON files containing sample data for each card type to facilitate testing.  Place these files in the `/data/` directory.

**Deliverables:**

*   JavaScript data structure definitions for all card types.
*   Functions for shuffling, drawing, and resolving cards.
*   Sample JSON data files for testing.

---

### 3. GameLogicAgent

**Goal:** Implement the core game loop and game state management.

**Responsibilities:**

*   **Player State:** Manage player attributes:
    *   HP (Health Points)
    *   Energy
    *   Food
    *   Favor
*   **Level Progression:** Implement logic for advancing through dungeon levels.
*   **Room Resolution:** Interpret and apply the effects of room cards, including triggering combat or other events.
*   **Shard Collection:** Track the collection of Shards of Brahm.
*   **Win/Loss Conditions:** Implement the game's win and loss conditions based on shard collection and dungeon level completion.
*   **Game State Persistence:** Implement functions to save and load the game state (e.g., using local storage - see `scripts/gameState.js`).

**Deliverables:**

*   Functions for managing player state, level progression, and room resolution.
*   Implementation of win/loss conditions.
*   Integration with `scripts/gameState.js` for saving/loading game state.

---

### 4. CombatAgent

**Goal:** Implement combat mechanics.

**Responsibilities:**

*   **Dice Rolling:** Simulate dice rolls (using `Math.random()`).
*   **Doubles Detection:** Detect when doubles are rolled.
*   **Energy Consumption:** Map energy expenditure to attack bonus (as defined in `GAMERULES.md`).
*   **Enemy AI:** Implement basic enemy response logic (attack, defend).
*   **Stat Calculations:** Calculate attack and damage values, factoring in energy, defense, and other modifiers.

**Deliverables:**

*   Functions for dice rolling, hit detection, and damage calculation.
*   Basic enemy AI.
*   Integration with `GameLogicAgent` to trigger and resolve combat encounters.

---

### 5. UIAgent

**Goal:** Build and animate the user interface.

**Responsibilities:**

*   **Display Game State:** Display player stats (HP, energy, food, favor), current room, and other relevant information.
*   **Card Animations:** Animate card transitions (drawing, revealing, discarding).
*   **Visual Feedback:** Visualize dice rolls, enemy attacks, and other game events.
*   **Mobile Responsiveness:** Ensure the UI is responsive and adapts to different screen sizes.
*   **User Input:** Implement UI elements for player actions (e.g., choosing to resolve or skip a room).

**Deliverables:**

*   A visually appealing and intuitive user interface.
*   Smooth animations for card transitions and game events.
*   A responsive layout that works on both desktop and mobile devices.

---

## 📜 Shared Context for All Agents

*   **Language:** All code must be implemented in **vanilla JavaScript**, with optional use of lightweight libraries if required (e.g., for animation or UI components).  Any library usage must be justified.
*   **Assets:** All assets must be client-side and work without a server.
*   **Code Quality:** Code must be readable, modular, well-commented, and follow consistent naming conventions.
*   **Mobile-First:** All visual elements must support a mobile-first design approach.
*    **Data Driven:** Use the data structures defined by `DataModelAgent` to drive the game logic and UI.

---

## 🗨️ Communication Style

Agents should minimize direct dependencies on each other. Instead, they should rely on well-defined data structures and clear interfaces. Use comments to indicate where handoffs are expected and to document the expected input and output of functions.

**Example:**

```javascript
// GameLogicAgent: Call CombatAgent to handle combat encounter.
// Input: Enemy card object (defined by DataModelAgent).
const combatResult = CombatAgent.startCombat(enemyCard);

// Process the combat result (e.g., update player HP, gain rewards).
if (combatResult.playerWon) {
  // ...
}

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
