import {
    DungeonCard, EnemyCard, LootCard, TrapCard, RaceCard, ClassCard, TrappingsCard
} from './data/cards.js';

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
    const raceDeck = raceData.map(data => new RaceCard(data));
    const classDeck = classData.map(data => new ClassCard(data));
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
    window.drawDungeonCard = () => dungeonDeck.pop();
    window.drawEnemyCard = () => enemyDeck.pop();
    window.drawLootCard = () => lootDeck.pop();
    window.drawTrapCard = () => trapDeck.pop();
    window.drawRaceCard = () => raceDeck.pop();
    window.drawClassCard = () => classDeck.pop();
    window.drawTrappingsCard = () => trappingsDeck.pop();
}


document.addEventListener('DOMContentLoaded', async () => {
    console.log('Tin Helm Web scaffold loaded');

    await loadCardData();

    // Draw a card from each deck and log the card's name to the console
    const dungeonCard = window.drawDungeonCard();
    if (dungeonCard) {
        console.log('Dungeon Card: ' + dungeonCard.name);
    }

    const enemyCard = window.drawEnemyCard();
    if (enemyCard) {
        console.log('Enemy Card: ' + enemyCard.name);
    }

    const lootCard = window.drawLootCard();
    if (lootCard) {
        console.log('Loot Card: ' + lootCard.name);
    }

    // const trapCard = drawTrapCard();
    // if (trapCard) {
    //     console.log('Trap Card: ' + trapCard.name);
    // }

    const raceCard = window.drawRaceCard();
    if (raceCard) {
        console.log('Race Card: ' + raceCard.name);
    }

    const classCard = window.drawClassCard();
    if (classCard) {
        console.log('Class Card: ' + classCard.name);
    }

    const trappingsCard = window.drawTrappingsCard();
    if (trappingsCard) {
        console.log('Trappings Card: ' + trappingsCard.name);
    }


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