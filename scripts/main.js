import {
    DungeonCard, EnemyCard, LootCard, TrapCard, RaceCard, ClassCard, TrappingsCard
} from './data/cards.js';

let drawDungeonCard, drawEnemyCard, drawLootCard, drawTrapCard, drawTrappingsCard;
let raceDeck, classDeck;
async function loadCardData() {
    const dungeonResultResponse = await fetch('../../../data/dungeonResult.json');
    const dungeonResultData = await dungeonResultResponse.json();

    const dungeonRoomResponse = await fetch('../../../data/dungeonRoom.json');
    const dungeonRoomData = await dungeonRoomResponse.json();

    const enemyResponse = await fetch('../../../data/enemy.json');
    const enemyData = await enemyResponse.json();

    const lootResponse = await fetch('../../../data/loot.json');
    const lootData = await lootResponse.json();

    const raceResponse = await fetch('../../../data/race.json');
    const raceData = await raceResponse.json();

    const referenceResponse = await fetch('../../../data/reference.json');
    const referenceData = await referenceResponse.json();

    const trappingsResponse = await fetch('../../../data/trappings.json');
    const trappingsData = await trappingsResponse.json();

    const classResponse = await fetch('../../../data/class.json');
    const classData = await classResponse.json();

    // Deck Building
    const dungeonDeck = dungeonRoomData.map(data => new DungeonCard(data));
    const enemyDeck = enemyData.map(data => new EnemyCard(data));
    const lootDeck = lootData.map(data => new LootCard(data));
    const trapDeck = []; // No TrapCard objects exist yet
    raceDeck = raceData.map(data => new RaceCard(data));
    classDeck = classData.map(data => new ClassCard(data));
    const trappingsDeck = trappingsData.map(data => new TrappingsCard(data));

    // Shuffle function (Fisher-Yates shuffle)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    shuffleArray(dungeonDeck);
    shuffleArray(enemyDeck);
    shuffleArray(lootDeck);
    //shuffleArray(trapDeck);
    shuffleArray(raceDeck);
    shuffleArray(classDeck);
    shuffleArray(trappingsDeck);

   // Draw card functions
    drawDungeonCard = () => dungeonDeck.pop();
    drawEnemyCard = () => enemyDeck.pop();
    drawLootCard = () => lootDeck.pop();
    drawTrapCard = () => trapDeck.pop();

    drawTrappingsCard = () => trappingsDeck.pop();

    return {
        drawDungeonCard,
        drawEnemyCard,
        drawLootCard,
        drawTrapCard,
        drawTrappingsCard
    };
}


document.addEventListener('DOMContentLoaded', async () => {
    console.log('Tin Helm Web scaffold loaded');

    const { 
        drawDungeonCard: _drawDungeonCard,
        drawEnemyCard: _drawEnemyCard,
        drawLootCard: _drawLootCard,
        drawTrapCard: _drawTrapCard,
        drawTrappingsCard: _drawTrappingsCard
    } = await loadCardData();

    drawDungeonCard = _drawDungeonCard;
    drawEnemyCard = _drawEnemyCard;
    drawLootCard = _drawLootCard;
    drawTrapCard = _drawTrapCard;
    drawTrappingsCard = _drawTrappingsCard;

    function populateCharacterSelect(selectedRace) {
        const raceSelect = document.getElementById('race-select');
        const classSelect = document.getElementById('class-select');

        // Clear existing options
        raceSelect.innerHTML = '<option value=\"\">--Please choose a race--</option>';
        classSelect.innerHTML = '<option value=\"\">--Please choose a class--</option>';

        // Populate race options
        for (let i = 0; i < raceDeck.length; i++) {
            const raceCard = raceDeck[i];
            if (raceCard) {
                const option = document.createElement('option');
                option.value = raceCard.name;
                option.text = raceCard.name;
                raceSelect.add(option);
            }
        }

        // Populate class options
        for (let i = 0; i < classDeck.length; i++) {
            const classCard = classDeck[i];
            let restricted = false;

            const selectedRaceObject = raceDeck.find(element => element.name === selectedRace);
            if (selectedRaceObject) {
                console.log("classCard.name: " + classCard.name);
                console.log("selectedRaceObject.classRestriction: " + selectedRaceObject.classRestriction);
                if (classCard.name === selectedRaceObject.classRestriction) {
                    restricted = true;
                }
            }

            if (classCard && !restricted) {
                const option = document.createElement('option');
                option.value = classCard.name;
                option.text = classCard.name;
                classSelect.add(option);
            }
        }
    }

    function updateCharacterSelect() {
        const selectedRace = document.getElementById('race-select').value;
        populateCharacterSelect(selectedRace);
    }

    const raceSelect = document.getElementById('race-select');
    raceSelect.addEventListener('change', updateCharacterSelect);

    populateCharacterSelect(null);
    updateUIFromState();

    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');

    if (!supportsLocalStorage()) {
        if (saveBtn) saveBtn.disabled = true;
        if (loadBtn) loadBtn.disabled = true;
        return;
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            saveGame();
            if (loadBtn) loadBtn.disabled = false;
        });
    }

    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            if (!loadGame()) {
                alert('No saved game found.');
            }
        });
        if (!localStorage.getItem('tinhelm-save')) {
            loadBtn.disabled = true;
        }
    }
});