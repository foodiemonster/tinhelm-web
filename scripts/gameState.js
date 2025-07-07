// Global game state and save/load functionality
// DataModelAgent & GameLogicAgent will extend this structure as the game grows.

const gameState = {
    // Player stats and identity
    player: {
        hp: 10,
        energy: 5,
        food: 2,
        favor: 0,
        shards: 0,
        maxHealth: 10,
        maxEnergy: 5,
        race: null,
        class: null
    },
    // Progression
    level: 1,
    currentRoom: 0,
    turn: 0,
    timestamp: Date.now(),
    // Inventory (array of card objects or IDs)
    inventory: [],
    // Decks and dungeon state
    dungeon: {
        deck: [],         // Array of card IDs for the main dungeon deck
        resultDeck: [],   // Array of card IDs for the result deck (if used)
        discard: [],      // Array of card IDs for the discard pile
        room: null,       // Current room card ID
        result: null      // Current result card ID
    },
    // Discard piles for room/result (legacy, for compatibility)
    discardPile: {
        room: [],
        result: []
    },
    // Cards currently visible in the UI
    visibleCards: {
        raceId: null,
        classId: null,
        inventory: [],
        roomCardId: null,
        resultCardId: null,
        enemyCardId: null
    },
    // Encounter/combat state
    encounter: {
        inProgress: false,
        enemyId: null,
        enemyHp: null,
        playerHp: null,
        html: "",
        // Add any other combat state you need to persist
    },
    // Session log for game events
    log: [],
};

// Check if localStorage is available
function supportsLocalStorage() {
    try {
        const key = '__tinhelm_test__';
        localStorage.setItem(key, '1');
        localStorage.removeItem(key);
        return true;
    } catch (err) {
        console.warn('Local storage unavailable:', err);
        return false;
    }
}

function saveGame(manual = false) {
    if (!supportsLocalStorage()) return;
    gameState.timestamp = Date.now();
    if (manual) {
        localStorage.setItem('tinhelm-save', JSON.stringify(gameState));
        console.log('Game saved (manual)');
    } else {
        localStorage.setItem('tinhelm-autosave', JSON.stringify(gameState));
        console.log('Game autosaved');
    }
}

function loadGame() {
    if (!supportsLocalStorage()) return false;
    const data = localStorage.getItem('tinhelm-save');
    if (!data) {
        console.warn('No manual saved game found');
        return false;
    }
    try {
        const loaded = JSON.parse(data);
        // Deep copy: replace all keys in gameState with loaded, including nested objects
        for (const key of Object.keys(gameState)) {
            if (typeof loaded[key] === 'object' && loaded[key] !== null && !Array.isArray(loaded[key])) {
                gameState[key] = { ...loaded[key] };
            } else if (Array.isArray(loaded[key])) {
                gameState[key] = [...loaded[key]];
            } else {
                gameState[key] = loaded[key];
            }
        }
        console.log('Game loaded (manual)');
        updateUIFromState();
        return true;
    } catch (err) {
        console.error('Failed to parse saved game:', err);
        return false;
    }
}

// Optionally, for crash recovery, you can add:
function loadAutoSave() {
    if (!supportsLocalStorage()) return false;
    const data = localStorage.getItem('tinhelm-autosave');
    if (!data) {
        console.warn('No autosave found');
        return false;
    }
    try {
        const loaded = JSON.parse(data);
        Object.assign(gameState, loaded);
        console.log('Game loaded (autosave)');
        updateUIFromState();
        return true;
    } catch (err) {
        console.error('Failed to parse autosave:', err);
        return false;
    }
}

// Update the displayed stats from gameState
function updateUIFromState() {
    const { hp, energy, food, favor } = gameState.player;
    document.getElementById('hp-value').textContent = hp;
    document.getElementById('energy-value').textContent = energy;
    document.getElementById('food-value').textContent = food;
    document.getElementById('favor-value').textContent = favor;
    document.getElementById('level-value').textContent = gameState.level;
    // Add: update tracker cubes
    import('./ui.js').then(ui => {
      ui.updateAllTrackerCubes({
        hp,
        energy,
        food,
        favor,
        level: gameState.level,
        enemyHp: gameState.enemyHp || 1 // fallback if not set
      });
    });
}

// GameLogicAgent: call saveGame() at the end of turns or after combat.

export { gameState, saveGame, loadGame, updateUIFromState };
