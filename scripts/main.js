import {
    loadCardData, getCardById, getAllCardsData, RaceCard, ClassCard
} from './data/cards.js';
import {
    initializePlayer, startDungeonLevel, handleRoom, updatePlayerStats, restoreGameUIFromState, logEvent, advanceToNextRoom
} from './gameLogic.js';
import { saveGame, loadGame } from './gameState.js';

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
    } else {
        console.warn("Could not display room card.", roomCard);
        if (roomCardImage) roomCardImage.src = ''; // Clear image on error
    }

     if (resultCardImage && resultCard && resultCard.image) {
        resultCardImage.src = resultCard.image;
        resultCardImage.alt = resultCard.name;
    } else {
        console.warn("Could not display result card.", resultCard);
         if (resultCardImage) resultCardImage.src = ''; // Clear image on error
    }

    // TODO: Add logic to show the card display area and hide character creation
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Tin Helm Web scaffold loaded');

    // Load card data using the function from cards.js
    await loadCardData();
    // Get the loaded data for UI population
    allCardsData = getAllCardsData(); // Use the exported function
    raceCards = Object.values(allCardsData).filter(card => card instanceof RaceCard);
    classCards = Object.values(allCardsData).filter(card => card instanceof ClassCard);

    function populateCharacterSelect(selectedRaceId) {
        const raceSelect = document.getElementById('race-select');
        const classSelect = document.getElementById('class-select');

        // Clear existing options
        raceSelect.innerHTML = '<option value=\"\">--Please choose a race--</option>';
        classSelect.innerHTML = '<option value=\"\">--Please choose a class--</option>';

        // Populate race options
        raceCards.forEach(raceCard => {
            const option = document.createElement('option');
            option.value = raceCard.id; // Use ID as value
            option.text = raceCard.name;
            raceSelect.add(option);
             if (raceCard.id === selectedRaceId) {
                option.selected = true;
            }
        });

        // Populate class options
        const selectedRaceCard = raceCards.find(card => card.id === selectedRaceId);

        classCards.forEach(classCard => {
            let restricted = false;
            if (selectedRaceCard && selectedRaceCard.classRestriction) {
                 // Find the class card object for the restriction name
                 const restrictionClassCard = classCards.find(card => card.name === selectedRaceCard.classRestriction);
                 if (restrictionClassCard && classCard.id === restrictionClassCard.id) {
                     restricted = true;
                 }
            }

            if (!restricted) {
                const option = document.createElement('option');
                option.value = classCard.id; // Use ID as value
                option.text = classCard.name;
                classSelect.add(option);
            }
        });
    }

    function updateCharacterSelect() {
        const selectedRaceId = document.getElementById('race-select').value;
        populateCharacterSelect(selectedRaceId);
    }

    const raceSelect = document.getElementById('race-select');
    raceSelect.addEventListener('change', updateCharacterSelect);

    // Initial population with no race selected
    populateCharacterSelect(null);

    // --- Start Game Button Logic ---
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            const selectedRaceId = document.getElementById('race-select').value;
            const selectedClassId = document.getElementById('class-select').value;

            if (!selectedRaceId || !selectedClassId) {
                alert('Please select a race and class to start the game.');
                return;
            }

            initializePlayer(selectedRaceId, selectedClassId);
            startDungeonLevel();
            handleRoom(); // Draw and display the first room

             // TODO: Hide character selection UI and show game UI
             document.getElementById('character-creation').style.display = 'none';
             document.getElementById('dungeon-area').style.display = 'flex'; // Assuming flex for layout
        });
    }

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
            document.getElementById('character-creation').style.display = 'none';
            document.getElementById('dungeon-area').style.display = 'flex';
            // Update session log UI after loading
            if (typeof window.updateLogUI === 'function') window.updateLogUI();
        });
        if (!localStorage.getItem('tinhelm-save')) {
            loadBtn.disabled = true;
        }
    }

    // Initially hide dungeon area until game starts
    document.getElementById('dungeon-area').style.display = 'none';

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
