import {
    loadCardData, getCardById, getAllCardsData, RaceCard, ClassCard
} from './data/cards.js';
import {
    initializePlayer, startDungeonLevel, handleRoom, updatePlayerStats, restoreGameUIFromState, logEvent, advanceToNextRoom
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

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            saveGame();
            if (loadBtn) loadBtn.disabled = false;
        });
    }

    if (loadBtn) {
        loadBtn.addEventListener('click', async () => {
            await loadGame();
            restoreGameUIFromState();
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
            advanceToNextRoom();
        });
    }
});

export { displayDrawnCards };
