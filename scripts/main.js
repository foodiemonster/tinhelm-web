import {
    loadCardData, getCardById, getAllCardsData, RaceCard, ClassCard
} from './data/cards.js';
import {
    initializePlayer, startDungeonLevel, handleRoom, updatePlayerStats, restoreGameUIFromState, logEvent
} from './gameLogic.js';
import { saveGame, loadGame } from './gameState.js';
import { showCharacterModal } from './ui.characterModal.js';

// Store loaded card data globally in main.js for easy access in UI logic
let allCardsData = {};
let raceCards = [];
let classCards = [];

// Function to display drawn cards in the UI
function displayDrawnCards(roomCard, resultCard) {
    const roomCardImage = document.getElementById('room-card-image');
    const resultCardImage = document.getElementById('result-card-image');

    if (roomCardImage && roomCard && roomCard.image) {
        roomCardImage.src = roomCard.image;
        roomCardImage.alt = roomCard.name;
        roomCardImage.style.display = 'block';
    } else {
        console.warn("Could not display room card.", roomCard);
        if (roomCardImage) roomCardImage.style.display = 'none'; // Clear image on error
    }

     if (resultCardImage && resultCard && resultCard.image) {
        resultCardImage.src = resultCard.image;
        resultCardImage.alt = resultCard.name;
        resultCardImage.style.display = 'block';
    } else {
        console.warn("Could not display result card.", resultCard);
         if (resultCardImage) resultCardImage.style.display = 'none'; // Clear image on error
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Tin Helm Web scaffold loaded');

    // Load card data using the function from cards.js
    await loadCardData();
    // Get the loaded data for UI population
    allCardsData = getAllCardsData(); // Use the exported function
    raceCards = Object.values(allCardsData).filter(card => card instanceof RaceCard);
    classCards = Object.values(allCardsData).filter(card => card instanceof ClassCard);

    // Initially hide dungeon area until game starts
    const dungeonArea = document.getElementById('dungeon-area');
    if (dungeonArea) {
        dungeonArea.classList.add('hidden');
    }

    // Hide old character creation UI
    const characterCreation = document.getElementById('character-creation');
    if (characterCreation) {
        characterCreation.style.display = 'none';
    }
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
        startGameBtn.style.display = 'none';
    }

    // Show new modal for character selection
    showCharacterModal(raceCards, classCards, (selectedRaceId, selectedClassId) => {
        initializePlayer(selectedRaceId, selectedClassId);
        startDungeonLevel();
        handleRoom();
        if (dungeonArea) {
            dungeonArea.classList.remove('hidden');
        }
    });

    // --- Save/Load Logic (Now using gameState.js) ---
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');

    // Sync all relevant UI/game state into gameState before saving
    function syncGameStateFromUI() {
        import('./gameState.js').then(({ gameState }) => {
            // Copy from visibleCards (the real source of truth)
            if (gameState.visibleCards) {
                gameState.raceId = gameState.visibleCards.raceId;
                gameState.classId = gameState.visibleCards.classId;
                gameState.player.race = gameState.visibleCards.raceId;
                gameState.player.class = gameState.visibleCards.classId;
                gameState.inventory = (gameState.visibleCards.inventory || []).map(id => id);
            }
            // Copy player stats directly (already up to date)
            // Copy dungeon/discard/room/result if present in gameState
            // Copy encounter state if present
            // Log is already up to date
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            syncGameStateFromUI();
            setTimeout(() => {
                import('./gameState.js').then(({ gameState, saveGame }) => {
                    console.log('Saving gameState:', JSON.stringify(gameState, null, 2));
                    saveGame(true);
                    if (loadBtn) loadBtn.disabled = false;
                    // Show notification
                    let notif = document.createElement('div');
                    notif.textContent = 'Game saved!';
                    notif.style.position = 'fixed';
                    notif.style.top = '24px';
                    notif.style.right = '24px';
                    notif.style.background = '#23272b';
                    notif.style.color = '#fff';
                    notif.style.padding = '1em 2em';
                    notif.style.borderRadius = '10px';
                    notif.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
                    notif.style.zIndex = 9999;
                    notif.style.fontSize = '1.1em';
                    document.body.appendChild(notif);
                    setTimeout(() => notif.remove(), 1800);
                });
            }, 50); // Allow sync to complete
        });
    }

    if (loadBtn) {
        loadBtn.addEventListener('click', async () => {
            await loadGame();
            // Always re-render UI from gameState after loading
            import('./gameLogic.js').then(mod => mod.restoreGameUIFromState());
            // Show dungeon area and hide character creation after loading
            if (characterCreation) {
                characterCreation.style.display = 'none';
            }
            if (dungeonArea) {
                dungeonArea.classList.remove('hidden');
            }
            // Update session log UI after loading
            if (typeof window.updateLogUI === 'function') window.updateLogUI();
        });
        if (!localStorage.getItem('tinhelm-save')) {
            loadBtn.disabled = true;
        }
    }

    // --- Next Room Button Logic ---
    const nextRoomBtn = document.getElementById('next-room-btn');
    if (nextRoomBtn) {
        nextRoomBtn.addEventListener('click', () => {
            nextRoomBtn.disabled = true;
            nextRoomBtn.style.display = 'none';
            // The logic for advancing to the next room is now handled within gameLogic.js
            // by the endDungeonLevel and handleRoom functions.
            // This button's click listener is no longer needed here.
        });
    }
});

export { displayDrawnCards };
