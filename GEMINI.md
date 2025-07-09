# Gemini Agent Context for Tin Helm Web

This document provides essential context for the AI agent working on the Tin Helm Web project.

## 1. Project Overview

This project is a browser-based, solo-playable web game adaptation of the **Tin Helm** board game by Jason Glover. The primary goal is to create a faithful digital recreation of the physical card game's mechanics, including deck management, character progression, room exploration, and turn-based combat.

- **Platform:** Purely client-side (HTML, CSS, vanilla JavaScript). No server-side components.
- **Target:** Desktop and mobile browsers, with a mobile-first responsive design.
- **Core Gameplay:** The player explores a dungeon by drawing and resolving card pairs, fighting enemies, collecting loot, and managing stats (Health, Energy, Food, Favor).
- **Winning/Losing:** The player wins by collecting 3 "Shards of Brahm" before reaching the 6th dungeon level. The player loses if their health drops to zero or they fail to find the shards in time.
- **Persistence:** Game state is saved to the browser's `localStorage`.

## 2. File Structure

- `index.html`: The main entry point for the application. Contains the basic UI structure.
- `style.css`: Main stylesheet for the application.
- `assets/`: Contains all image assets for the game, primarily the card faces.
- `data/`: Contains JSON files that define the data for all game cards (enemies, loot, classes, etc.).
- `docs/`: Contains project documentation, including game rules, product requirements, and agent responsibilities.
- `scripts/`: Contains all the JavaScript code for the game.
  - `main.js`: The main script that initializes the game.
  - `gameState.js`: Manages the game's state, including saving and loading from `localStorage`.
  - `gameLogic.js`: Contains the core logic for the game loop, room resolution, and player actions.
  - `ui.js` (and other `ui.*.js` files): Manages all UI updates, animations, and user interactions.
  - `data/cards.js`: Loads and manages the card data from the `data/` directory.

## 3. Core Technologies & Conventions

- **JavaScript:** The project uses **vanilla JavaScript**. Avoid introducing libraries or frameworks unless absolutely necessary and justified.
- **Modularity:** The JavaScript code is organized into modules based on functionality (UI, game logic, data, etc.). Adhere to this separation of concerns.
- **Data-Driven Design:** The game is data-driven. All card properties, abilities, and effects are defined in JSON files in the `data/` directory. Game logic should read from these data files and not contain hardcoded card information.
- **State Management:** The global `gameState` object is the single source of truth. All game state modifications should be handled through the functions in `gameState.js`.

## 4. Card Ability & Effect Schema

A critical convention is the JSON schema for defining card abilities and effects, found in `docs/tin_helm_ability_effect_schema_prompt.md`. All new card effects and logic must conform to this schema.

**Key fields:** `trigger`, `action`, `target`, `amount`, `condition`.

Example:
```json
{
  "trigger": "on_defeat",
  "action": "gain",
  "target": "ration",
  "amount": 1
}
```

When implementing logic that parses these effects, the system should be able to dynamically execute them based on the JSON definition.

## 5. Development Roadmap & Tasks

The project's development is broken down into phases and agent responsibilities as detailed in `docs/TASKS.md` and `docs/AGENTS.md`.

- **Current Focus:** Implementing the core gameplay loop, combat system, and card interactions.
- **Agent Roles:**
  - `DataModelAgent`: Defines data structures and loads card data.
  - `GameLogicAgent`: Implements the core game loop and state management.
  - `CombatAgent`: Implements combat mechanics.
  - `UIAgent`: Builds and animates the user interface.

Review `docs/TASKS.md` for a detailed list of "Must Have," "Should Have," and "Could Have" features.

## 6. How to Contribute

- **Follow Existing Patterns:** Before writing new code, examine the existing code in the `scripts/` directory to understand the established patterns for state management, UI updates, and game logic.
- **Use the Data Schema:** When adding or modifying cards, ensure the JSON in the `data/` directory is valid and uses the correct ability/effect schema.
- **Update Documentation:** If any significant changes are made to the architecture or conventions, update the relevant documents in the `docs/` directory.
- **Test Thoroughly:** After making changes, manually test the game flow to ensure no regressions have been introduced. Key areas to test are character creation, room resolution, combat, and state persistence (save/load).
