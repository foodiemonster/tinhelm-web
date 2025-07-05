// Global game state and save/load functionality
// DataModelAgent & GameLogicAgent will extend this structure as the game grows.

const gameState = {
    player: {
        hp: 10,
        energy: 5,
        food: 2,
        favor: 0,
    },
    level: 1,
    decks: {},
    currentRoom: null,
    inventory: [],
    turn: 0,
    timestamp: Date.now(),
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

function saveGame() {
    if (!supportsLocalStorage()) return;
    gameState.timestamp = Date.now();
    localStorage.setItem('tinhelm-save', JSON.stringify(gameState));
    console.log('Game saved');
}

function loadGame() {
    if (!supportsLocalStorage()) return false;
    const data = localStorage.getItem('tinhelm-save');
    if (!data) {
        console.warn('No saved game found');
        return false;
    }
    try {
        const loaded = JSON.parse(data);
        Object.assign(gameState, loaded);
        console.log('Game loaded');
        updateUIFromState();
        return true;
    } catch (err) {
        console.error('Failed to parse saved game:', err);
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
}

// GameLogicAgent: call saveGame() at the end of turns or after combat.
