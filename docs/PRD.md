# Product Requirements Document (PRD)
## Tin Helm Web Adaptation

---

### 1. Executive Summary

**Tin Helm Web** is a faithful, digital-first, browser-based adaptation of Jason Glover’s *Tin Helm* solo dungeon-crawling card game. The experience must fully reflect the mechanics, agency, and flavor of the tabletop game, with a visually rich, mobile-friendly, accessible, and future-proof digital UI.  
The target user can play Tin Helm seamlessly in any modern browser, save and load progress, enjoy polished animations and sounds, and review their game outcome and journey at the end.

---

### 2. Product Goals

- **Faithfully recreate Tin Helm’s rules, card flow, and challenge structure**
- **Mobile-first, desktop compatible, fully browser-based, works offline**
- **Beautiful, responsive, and animated UI with stat trackers, cards, and game area**
- **Full player agency: race/class selection, combat skill/loot choices, dungeon decision-making**
- **Game saves/restores accurately and supports session persistence**
- **Accessible, extensible, and ready for future content expansions**
- **Background music/sounds, toggleable, and performance-optimized**
- **End-of-game record, session log, and scoring per the board game’s rules**
- **Tutorial and accessibility built-in**
- **Developer/tester hooks for robust QA and AI assistance**

---

### 3. Functional Requirements

#### 3.1. Core Gameplay and UI

**3.1.1. Faithful Adaptation**
- All mechanics, icons, card interactions, triggers, and player choices must match the original game as described in the rules and errata.
- Any deviation (e.g., minor UI shortcuts, digital convenience) must be approved and clearly documented.

**3.1.2. Player Agency**
- Players can select their Race and Class in an interactive flow, with visual feedback and stat updates.
- Trappings are granted per chosen Class and visually shown in inventory.
- Each turn, the player sees a dungeonRoom card and can **Resolve** or **Skip** it with a clear UI choice.
- If Resolving: current card slides to Slot2 (Resolved), next card is revealed as Slot3 (Result), and icon parsing flows left-to-right.
- If Skipping: top card is flipped (Result), second card is revealed (Room), icons resolved per the “skip” logic.

**3.1.3. Combat System**
- When combat is triggered, the player chooses:
  - Which skill to use (energy spent for bonus, per Class rules)
  - Whether to use any trappings, loot, or abilities applicable to combat
- Player may preview attack calculation (attack bonus, dice roll modifiers, etc.) before confirming their roll.
- Dice are rolled digitally (visual 2d6, with doubles auto-miss), damage/defense/HP resolved per rules.
- Enemy attacks follow, including defense, shield, and special effects.
- All combat and resolution steps must be visually surfaced, with confirm/cancel affordances and stat animations.

**3.1.4. Decks and Card Flow**
- Visual deck representation for Dungeon, Enemy, Loot (all browsable via “peek” in the UI).
- Card slots: Slot1 (DungeonRoom deck), Slot2 (Resolved), Slot3 (Result/Challenge), Slot4 (Discard, auto-reshuffle at round end).
- Inventory area displays all trappings, loot, and earned items, each with an interactive icon/thumbnail and tooltip.
- All state changes—card movement, discards, stat bar changes—are smoothly animated.

**3.1.5. Stat Tracking and UI**
- Player stats (HP, Energy, Food, Favor) and dungeon level are tracked visually with animated stat bars or counters.
- Enemy stats shown during combat (HP, defense, etc.).
- Race/Class cards and trappings always visible in a sidebar or inventory.
- All game state changes must be reflected in the UI immediately and with animation.

---

#### 3.2. Save/Load & State Management

- **Full autosave** after every meaningful action (card drawn, stat changed, combat completed, etc.) using browser localStorage (`tinhelm-save`).
- **Manual Save/Load** controls must be visible and reliable.
- On load, the entire game state (deck order, discard piles, inventory, stats, dungeon level, card positions, current view) is restored without error.
- Autosave must be robust against power loss, browser close, or crash.
- Session log (internal) should be kept for debugging/QA and optional user download.

---

#### 3.3. Modular & Extensible Content Model

- All card data, deck definitions, icons, abilities, and effects are schema-driven JSON (per effect schema).
- Adding new content (cards, races, expansions, effects, scenarios) requires **no changes** to the underlying engine or UI, only updates to data files.
- Abilities and effects must be parsed dynamically by the engine—future AI modules should be able to generate or interpret new cards without manual JS coding.
- All assets and game data are client-side, supporting offline play and no server dependency.

---

#### 3.4. Endgame & Outcome

- At the end of a game, show a detailed summary:
  - Dungeon level reached
  - Number of shards collected
  - Victory/defeat reason (cleared, killed by X, starved, etc.)
  - Session log (actions taken, key rolls, loot found)
  - Final score, per rules: 10 pts/shard, 2 pts/favor, sum of stats, minus double dungeon level
- Optionally, allow the player to export or share their game record (JSON/text/clipboard).

---

#### 3.5. Audio & Animation

- **Background music and sound effects** for card actions, combat, victory/loss, with on/off/mute controls.
- Audio must be performant and compatible with desktop/mobile browsers.
- **Animations** for all card draws, flips, stat changes, dice rolls, and transitions between game states.
- Animation system must be consistent, performant, and not block input on lower-powered devices.
- All visual effects must enhance, not slow, gameplay.

---

#### 3.6. Accessibility

- **Keyboard support** for all controls (tab, arrows, enter/space).
- **ARIA roles** and labels for screen readers; all interactive elements labeled.
- **Color-blind-friendly** UI (test against major color-blindness types).
- **Scalable fonts** (support browser zoom and larger text).
- Logical tab order; skip-to-content options.

---

#### 3.7. Tutorial/Onboarding

- Optional tutorial overlay for first-time users (can be skipped/hidden).
- Contextual tooltips/hints for race/class selection, first dungeon room, first combat, and inventory.

---

#### 3.8. Undo/Redo

- One-step Undo for any *non-random* action before roll confirmation (e.g., misclick before resolving/skipping or starting a roll).
- Redo or “confirm/cancel” UI before all random events (dice, loot draws).

---

#### 3.9. Error Handling & Debug/AI Hooks

- All errors (failed save/load, asset errors, data corruption) should show user-friendly messages and attempt graceful recovery.
- **Developer/debug mode** (toggleable by secret, URL param, or build flag):
  - View deck and discard contents
  - Set player/enemy stats
  - Fast-forward dungeon levels
  - Display random seed (if deterministic shuffling is used)
  - View and export session log

---

#### 3.10. PWA/Offline Support

- The game should be installable (PWA manifest), load and play entirely offline, and prompt users for install where supported.

---

### 4. Technical Requirements

- **Pure client-side app.** No server required for core play.  
- **Vanilla JavaScript** preferred. Any libraries (e.g., for animation, sound, state management) must be lightweight and justified.
- **All code modular** (per agent responsibility: Scaffolding, DataModel, GameLogic, Combat, UI).
- **All assets in `/assets/` and `/data/` directories**.
- **Code must be readable, well-commented, and consistent** in naming and structure.
- **Mobile-first responsive design.**  
- **Full documentation** for card schema, game state model, and extensibility.

---

### 5. Non-Functional Requirements

- **Performance:** 60fps animations where possible, never locks up on mobile.
- **Reliability:** No loss of data/progress; robust to reloads, interruptions, or browser crashes.
- **Security:** No personal data, analytics, or tracking of users.
- **Accessibility:** Meets at least WCAG AA standards.
- **Testability:** Expose hooks for AI agent QA and manual testing, including random seed/step-through.

---

### 6. Deliverables

- Full web app, installable and playable via browser (desktop/mobile)
- Source code, modularized per agent/files as described
- Schema-driven card/data files for core game and test expansions
- UI, audio, and animation assets (all optimized and open license/owned)
- Documentation: code, schemas, extension process, user onboarding/help

---

### 7. Acceptance Criteria

- User can play from start to finish, following Tin Helm rules precisely
- All UI elements responsive and animated, stats tracked
- Game saves/loads at any point without error, restoring state perfectly
- Audio/visual polish (music, sounds, animations) present and toggleable
- Game accessible (keyboard, screen reader, color-blind)
- Endgame screen shows correct outcome and scoring
- Modular for new cards/expansions with no code change
- All core and “should have” features delivered

---

### 8. Out-of-Scope

- Multiplayer (for this release)
- Server-hosted features or leaderboards
- In-app purchases or ads
- Analytics, tracking, or cloud storage

---

### 9. Future Considerations

- Support for custom scenarios, user-generated content, or multiplayer (in future releases)
- Full rulebook/help overlay
- Optional cosmetic themes or cardbacks

---

**This PRD is to be considered the single source of truth for all agent-driven development and product review of Tin Helm Web. Any open question, ambiguity, or scope creep must be resolved against this document, the official rulebook, or with the Product Owner’s written approval.**

---

