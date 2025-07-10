import { drawCard, dungeonDeck, dungeonResultDeck, getCardById, getAllCardsData, resetDungeonDecks } from './data/cards.js';
import { displayRoomCard, displayResultCard, displayRaceCard, displayClassCard, displayEnemyCard, hideEnemyCard, awaitPlayerRoomDecision, updateStatDisplay, displayInventory, displayDiscardPile, displayDeckRoomCard, updateAllTrackerCubes } from './ui.js';
import { gameState, saveGame } from './gameState.js';
import { showCombatBoard, hideCombatBoard } from './ui.combatBoard.js';
import { showChoiceModal } from './ui.choiceModal.js';
import { showEncounterModal } from './ui.encounterModal.js';
import { applyPassiveEffects, promptForActiveAbilities } from './gameLogic.trappings.js';

// Refactored: Use gameState.player and gameState.level instead of local playerStats/currentDungeonLevel

// --- Session Log ---
function logEvent(message) {
    hideCombatBoard(); // Unmount React components before showing new modal
    if (!gameState.log) gameState.log = [];
    const timestamp = new Date().toLocaleTimeString();
    gameState.log.push(`[${timestamp}] ${message}`);
    updateLogUI();
}

function updateLogUI() {
    hideCombatBoard(); // Unmount React components before showing new modal
    const logPanel = document.getElementById('session-log');
    if (!logPanel) return;
    logPanel.innerHTML = gameState.log.slice(-100).map(msg => `<div>${msg}</div>`).join('');
    logPanel.scrollTop = logPanel.scrollHeight;
}

// --- Discard Pile Management ---
// Ensure discard piles exist in gameState
if (!gameState.discardPile) {
    gameState.discardPile = { room: [], result: [] };
}

function discardPreviousRoomAndResult() {
    hideCombatBoard(); // Unmount React components before showing new modal
    const { roomCardId, resultCardId } = gameState.visibleCards || {};
    if (roomCardId) gameState.discardPile.room.push(roomCardId);
    if (resultCardId) gameState.discardPile.result.push(resultCardId);
    // Show last discarded cards in the discard pile slot
    const lastRoom = roomCardId ? getCardById(roomCardId) : null;
    const lastResult = resultCardId ? getCardById(resultCardId) : null;
    displayDiscardPile(lastRoom, lastResult);
}

// Function to initialize player stats based on selected race and class
// Sets up all player stats, inventory, and level in gameState, then updates the UI and saves the game.
function initializePlayer(raceId, classId) {
    hideCombatBoard(); // Unmount React components before showing new modal
    const raceCard = getCardById(raceId);
    const classCard = getCardById(classId);

    if (!raceCard || !classCard) {
        console.error("Failed to initialize player: Invalid race or class ID.");
        return;
    }

    // Track selected race and class IDs in gameState
    gameState.raceId = raceId;
    gameState.classId = classId;

    gameState.player.maxHealth = raceCard.health + classCard.healthModifier;
    gameState.player.hp = gameState.player.maxHealth;
    gameState.player.maxEnergy = raceCard.energy + classCard.energyModifier;
    gameState.player.energy = gameState.player.maxEnergy;
    gameState.player.food = raceCard.rations;
    gameState.player.favor = 0;
    gameState.player.shards = 0;
    gameState.inventory = [];
    gameState.level = 1;

    // Add starting trappings from class
    if (classCard.startingTrapping) {
        const trappings = Array.isArray(classCard.startingTrapping) ? classCard.startingTrapping : [classCard.startingTrapping];
        trappings.forEach(trapId => {
            const card = getCardById(trapId);
            if (card) gameState.inventory.push(card);
        });
    }

    // Special case: Human gets to pick any remaining trapping
    if (raceCard.name === 'Human') {
        // Get all trappings
        const allTrappings = Object.values(getAllCardsData()).filter(card => card.id && card.id.startsWith('TRA'));
        // Remove the one already given by class
        const ownedIds = new Set(gameState.inventory.map(card => card.id));
        const availableTrappings = allTrappings.filter(card => !ownedIds.has(card.id));
        showChoiceModal({
            title: 'Human Bonus',
            message: 'Choose an extra Trapping:',
            isTrappingGrid: true,
            raceCardImage: raceCard.image,
            choices: availableTrappings.map(card => ({ label: card.name, value: card.id, image: card.image })),
            onChoice: (trappingId) => {
                const chosen = getCardById(trappingId);
                if (chosen) {
                    gameState.inventory.push(chosen);
                    displayInventory(gameState.inventory);
                    saveGame();
                }
            }
        });
    }

    // Track visible cards for restoration
    gameState.visibleCards = {
        raceId,
        classId,
        inventory: gameState.inventory.map(card => card.id),
        roomCardId: null,
        resultCardId: null,
        enemyCardId: null
    };

    console.log("Player initialized:", gameState.player);
    updateStatDisplay('hp', gameState.player.hp);
    updateStatDisplay('energy', gameState.player.energy);
    updateStatDisplay('food', gameState.player.food);
    updateStatDisplay('favor', gameState.player.favor);
    updateStatDisplay('level', gameState.level);
    updateStatDisplay('shards', gameState.player.shards);
    displayRaceCard(raceCard);
    displayClassCard(classCard);
    displayInventory(gameState.inventory);
    // Update tracker cubes on game start
    updateAllTrackerCubes({
        hp: gameState.player.hp,
        energy: gameState.player.energy,
        food: gameState.player.food,
        favor: gameState.player.favor,
        level: gameState.level,
        enemyHp: gameState.enemyHp || 1
    });
    logEvent(`Player created: Race = ${raceCard.name}, Class = ${classCard.name}`);
    saveGame();
}

// Function to start a new dungeon level
// Increments dungeon level, resets room counter, shuffles decks, updates UI, and saves state.
function startDungeonLevel() {
    hideCombatBoard(); // Unmount React components before showing new modal
    gameState.level++;
    gameState.currentRoom = 0;
    shuffleDeck(dungeonDeck);
    shuffleDeck(dungeonResultDeck);
    updateStatDisplay('level', gameState.level);
    saveGame();
}

// Function to shuffle a deck (Fisher-Yates algorithm)
// Used for dungeon and result decks at the start of each level.
function shuffleDeck(deck) {
    hideCombatBoard(); // Unmount React components before showing new modal
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j] ] = [deck[j], deck[i]]; // Swap elements
    }
}

// Function to handle a single room in the dungeon
// Advances room counter, draws cards, prompts player for resolve/skip, and processes result.
async function handleRoom() {
    hideCombatBoard(); // Unmount React components before showing new modal
    // --- Always clear Room and Result slots at the very start ---
    displayRoomCard(null);
    displayResultCard(null);
    // Force UI update before proceeding
    await new Promise(r => setTimeout(r, 0));
    // Step 1: Show Deck slot (peek), Room/Result are empty
    const topDeckCard = dungeonDeck.length > 0 ? dungeonDeck[0] : null;
    displayDeckRoomCard(topDeckCard);
    if (!topDeckCard) {
        console.error("No cards left in the dungeon deck.");
        return;
    }
    let playerDecision;
    try {
        playerDecision = await awaitPlayerRoomDecision(); // Wait for the player's decision
    } catch (error) {
        console.error("Error getting player decision:", error);
        return;
    }
    // Step 2: After Choosing Phase
    // Remove the Deck slot card (hide it)
    displayDeckRoomCard(null);
    // Use the peeked card as the first card (remove it from the deck)
    const firstCard = topDeckCard; // Do NOT call drawCard here
    dungeonDeck.shift(); // Actually remove the card from the deck
    let secondCard;
    let roomCard, resultCard;
    if (playerDecision === 'RESOLVE') {
        roomCard = firstCard;
        secondCard = drawCard(dungeonDeck);
        // Use linkedResultId for result card if available
        if (secondCard && secondCard.linkedResultId) {
            resultCard = getCardById(secondCard.linkedResultId) || secondCard;
        } else {
            resultCard = secondCard;
        }
    } else {
        secondCard = drawCard(dungeonDeck);
        if (firstCard && firstCard.linkedResultId) {
            resultCard = getCardById(firstCard.linkedResultId) || firstCard;
        } else {
            resultCard = firstCard;
        }
        roomCard = secondCard;
    }
    displayRoomCard(roomCard);
    displayResultCard(resultCard);
    // Step 3: After Room/Result are set, show the next card in Deck slot (peek, do not draw)
    const nextDeckCard = dungeonDeck.length > 0 ? dungeonDeck[0] : null;
    displayDeckRoomCard(nextDeckCard);
    // Discard slot: unchanged

    // Track visible cards for restoration
    gameState.visibleCards = {
        ...gameState.visibleCards,
        roomCardId: roomCard ? roomCard.id : null,
        resultCardId: resultCard ? resultCard.id : null,
        enemyCardId: null
    };
    if (roomCard && resultCard) {
        logEvent(`Entering Room ${gameState.currentRoom}`);
        logEvent(`Room Card: ${roomCard.name}, Result Card: ${resultCard.name}`);
        try {
            await resolveIcons(roomCard, resultCard);
        } catch (err) {
            console.error("Error resolving room icons:", err);
        } finally {
            gameState.currentRoom++; // Increment room counter after resolving icons

            // After all icons are resolved, check if the level is complete
            if (gameState.currentRoom >= 6) { // Check if 6 or more rooms are cleared
                logEvent("Room complete. Dungeon deck cleared. Click 'Next Room' to proceed to next level.");
            } else {
                logEvent("Room complete. Click 'Next Room' to continue.");
            }
            enableNextRoomButton();
        }
    } else {
        console.error("Could not form the room with two cards.", { roomCard, resultCard });
    }
    // Step 4: Clean Up is handled by Next Room button logic
    // Step 5: Round Restart is handled by calling handleRoom() again
}

// Function to handle the end of a dungeon level
// Advances level, consumes food or applies starvation damage, shuffles decks, checks win/loss.
async function endDungeonLevel() {
    hideCombatBoard(); // Unmount React components before showing new modal
    console.log(`Ending Dungeon Level ${gameState.level}.`);
    logEvent(`Cleared ${gameState.currentRoom} rooms on Dungeon Level ${gameState.level}.`);

    // Check if we are at the end of the game (Level 5)
    if (gameState.level >= 5) {
        // If at Level 5 and cleared rooms, check final win/loss conditions
        checkWinLossConditions();
        return; // Game ends here, no further level progression
    }

    // Prompt to go up a level
    await new Promise(resolve => {
        showChoiceModal({
            title: 'Dungeon Cleared!',
            message: 'You have cleared all rooms on this level. Do you wish to proceed to the next dungeon level?',
            choices: [
                { label: 'Proceed to Next Level', value: 'proceed' }
            ],
            onChoice: (choice) => {
                if (choice === 'proceed') {
                    // 1. Consume 1 food or take damage
                    if (gameState.player.food > 0) {
                        updatePlayerStats('food', -1);
                        logEvent('Consumed 1 Food to proceed to the next level.');
                    } else {
                        updatePlayerStats('hp', -3);
                        logEvent('No Food available. Suffered 3 HP damage to proceed.');
                    }

                    // 2. Increase dungeon level by 1
                    gameState.level++;
                    gameState.currentRoom = 0; // Reset room counter for the new level
                    updateStatDisplay('level', gameState.level);
                    logEvent(`Proceeding to Dungeon Level ${gameState.level}.`);

                    // 3. Reset and reshuffle the dungeon decks
                    resetDungeonDecks();

                    // 4. Clear discard piles
                    gameState.discardPile.room = [];
                    gameState.discardPile.result = [];
                    displayDiscardPile(null, null); // Clear discard UI

                    // 5. Clear UI slots
                    displayDeckRoomCard(null);
                    displayRoomCard(null);
                    displayResultCard(null);
                    hideEnemyCard();

                    logEvent("Dungeon and Result decks have been reset and reshuffled for the new level.");
                    saveGame();
                    checkWinLossConditions(); // Check win/loss after level up
                }
                resolve();
            }
        });
    });

    // After handling level transition, prepare for the next room
    logEvent("Ready for the next room. Click 'Next Room' to continue.");
    enableNextRoomButton();
}

// Function to check for win or loss conditions
// Shows endgame message and returns true if game is over, otherwise false.
function checkWinLossConditions() {
    hideCombatBoard(); // Unmount React components before showing new modal
    console.log("Checking win/loss conditions...");

    // Loss condition: Health drops to 0 or less
    if (gameState.player.hp <= 0) {
        showEndgameMessage('Defeat! You have perished in the dungeon.');
        return true; // Indicate game is over
    }

    // Win condition: Dungeon Level 5, cleared 6 rooms, and 3 Shards
    if (gameState.level >= 5 && gameState.currentRoom >= 6 && gameState.player.shards >= 3) {
        showEndgameMessage('Victory! You reached Dungeon Level 5, cleared all rooms, and collected 3 Shards of Brahm!');
        return true; // Indicate game is over
    }

    // Loss condition: Reached end of Dungeon Level 5 (cleared 6 rooms) but do not have 3 Shards
    if (gameState.level >= 5 && gameState.currentRoom >= 6 && gameState.player.shards < 3) {
        showEndgameMessage('Defeat! You reached the end of Dungeon Level 5 without enough Shards.');
        return true; // Indicate game is over
    }

    console.log("Game continues.");
    return false; // Indicate game is not over
}

// --- Endgame Modal ---
function showEndgameMessage(message) {
    hideCombatBoard(); // Unmount React components before showing new modal
    const modal = document.getElementById('endgame-message');
    const text = document.getElementById('endgame-text');
    if (modal && text) {
        text.textContent = message;
        modal.style.display = 'block';
    } else {
        alert(message); // Fallback if modal not found
    }
}

// --- Sequential Icon Processing ---
// Kick-off function that extracts icons and processes them in sequence.
async function resolveIcons(iconCard, legendCard) {
    console.log("Inspecting iconCard in resolveIcons:", JSON.stringify(iconCard, null, 2));
    console.log("Using legendCard in resolveIcons:", JSON.stringify(legendCard, null, 2));
    logEvent(`Resolving icons for card: ${iconCard.name} (legend: ${legendCard.name})`);
    if (!iconCard.icons || typeof iconCard.icons !== 'string') {
        console.warn("Icon card has no icons or invalid format:", iconCard);
        return;
    }
    const icons = iconCard.icons.split(',').map(icon => icon.trim());
    for (const icon of icons) {
        await processIcon(icon, legendCard);
    }
}

// Handle a single icon and wait for the associated interaction
async function processIcon(icon, legendCard) {
    console.log("Resolving icon:", icon);

    // Await the action for the current icon before proceeding
    switch (icon) {
        case 'Enemy': {
            await hideCombatBoard();
            console.log("Enemy encounter:", legendCard.enemy);
            if (legendCard.enemy && typeof legendCard.enemy === 'string') {
                const m = legendCard.enemy.match(/^Enemy=(.+)$/);
                if (m && m[1]) {
                    const enemyName = m[1];
                    const enemyCard = Object.values(getAllCardsData()).find(c => c.name === enemyName);
                    if (enemyCard) {
                        await initiateCombat(enemyCard);
                        logEvent(`Combat started with ${enemyCard.name}`);
                    } else {
                        console.warn(`Enemy card not found for name: ${enemyName}`);
                    }
                } else {
                    console.warn("Could not parse enemy information from legend card:", legendCard.enemy);
                }
            } else {
                console.warn("Enemy icon encountered, but no valid enemy data found on the legend card.", { enemy: legendCard.enemy });
            }
            break;
        }
        case 'Loot': {
            await hideCombatBoard();
            const lootOutcome = legendCard.loot;
            if (lootOutcome && typeof lootOutcome === 'string') {
                if (lootOutcome === 'Empty') {
                    await new Promise(resolve => {
                        showEncounterModal({
                            title: 'Loot',
                            message: 'The chest is empty.',
                            choices: [{ label: 'Continue', value: 'ok' }],
                            onChoice: resolve
                        });
                    });
                } else if (lootOutcome.startsWith('Loot=')) {
                    const match = lootOutcome.match(/^Loot=(.+)$/);
                    if (match && match[1]) {
                        const lootName = match[1];
                        const lootCard = Object.values(getAllCardsData()).find(c => c.name === lootName);
                        if (lootCard) {
                            await new Promise(resolve => {
                                showEncounterModal({
                                    title: 'Loot Found!',
                                    message: `You found: ${lootCard.name}`,
                                    image: lootCard.image,
                                    choices: [{ label: 'Take It', value: 'take' }],
                                    onChoice: () => {
                                        gameState.inventory.push(lootCard);
                                        displayInventory(gameState.inventory);
                                        logEvent(`Loot: Found ${lootCard.name}.`);
                                        resolve();
                                    }
                                });
                            });
                        }
                    }
                }
            }
            break;
        }
        case 'Trap': {
            await hideCombatBoard();
            const trapEffect = legendCard.trap;
            let trapMessage = '';
            if (trapEffect && typeof trapEffect === 'string') {
                if (trapEffect !== 'None') {
                    let trapContext = { bypassed: false, effect: trapEffect };
                    await processAllItemEffects({ trigger: 'on_trap_encounter', trapContext });
                    if (!trapContext.bypassed) {
                        const hpMatch = trapEffect.match(/^HP -(\d+)$/);
                        const enMatch = trapEffect.match(/^EN -(\d+)$/);
                        if (hpMatch && hpMatch[1]) {
                            updatePlayerStats('hp', -parseInt(hpMatch[1], 10));
                            trapMessage = `A trap was triggered! You lost ${hpMatch[1]} HP.`;
                        } else if (enMatch && enMatch[1]) {
                            updatePlayerStats('energy', -parseInt(enMatch[1], 10));
                            trapMessage = `A trap was triggered! You lost ${enMatch[1]} Energy.`;
                        } else {
                            console.warn("Could not parse trap effect:", trapEffect);
                            trapMessage = 'A trap was triggered.';
                        }
                    } else {
                        logEvent('Toolkit: Trap bypassed, no effect.');
                        trapMessage = 'You bypassed the trap.';
                    }
                } else {
                    trapMessage = 'There is no trap effect.';
                }
            } else {
                console.warn("Trap icon encountered, but no valid trap effect data found on the legend card.", { trapEffect });
                trapMessage = 'A trap was encountered, but its effect is unclear.';
            }
            await new Promise(resolve => {
                showEncounterModal({
                    title: 'Trap',
                    message: trapMessage,
                    choices: [{ label: 'Continue', value: 'ok' }],
                    onChoice: resolve
                });
            });
            break;
        }
        case 'Campsite': {
            await hideCombatBoard();
            const campsiteCard = Object.values(getAllCardsData()).find(c => c.name === 'Campsite');
            await new Promise(resolve => {
                showEncounterModal({
                    title: 'Campsite',
                    message: 'You find a moment of respite. Choose your benefit:',
                    image: campsiteCard ? campsiteCard.image : null,
                    choices: [
                        { label: '+2 HP & +1 Energy', value: 'heal' },
                        { label: '+1 Food', value: 'food' }
                    ],
                    onChoice: val => {
                        if (val === 'heal') {
                            updatePlayerStats('hp', 2);
                            updatePlayerStats('energy', 1);
                            logEvent('Campsite: Gained +2 HP and +1 Energy.');
                        } else if (val === 'food') {
                            updatePlayerStats('food', 1);
                            logEvent('Campsite: Gained +1 Food.');
                        }
                        resolve();
                    }
                });
            });
            break;
        }
        case 'Water': {
            await hideCombatBoard();
            const gillNetCard = gameState.inventory.find(it => it.id === 'LT01');
            if (gillNetCard) {
                await new Promise(resolve => {
                    showEncounterModal({
                        title: 'Water Source',
                        message: 'You can use your Gill Net. Roll 3 dice, and gain 1 Ration for each 4+.',
                        image: gillNetCard.image,
                        dieRoll: true,
                        dieCount: 3,
                        requireContinue: true,
                        onRoll: rolls => {
                            const s = rolls.filter(r => r >= 4).length;
                            if (s > 0) {
                                updatePlayerStats('food', s);
                                logEvent(`Gill Net: Gained ${s} rations.`);
                            } else {
                                logEvent('Gill Net: No food gained.');
                            }
                            resolve();
                        }
                    });
                });
            } else {
                await new Promise(resolve => {
                    showEncounterModal({
                        title: 'Water Source',
                        message: 'You found a water source. Roll a die: on a 4+, you gain 1 Ration.',
                        dieRoll: true,
                        dieCount: 1,
                        requireContinue: true,
                        onRoll: roll => {
                            if (roll >= 4) {
                                updatePlayerStats('food', 1);
                                logEvent('Water: Gained 1 ration.');
                            } else {
                                logEvent('Water: No food gained.');
                            }
                            resolve();
                        }
                    });
                });
            }
            break;
        }
        case 'Treasure': {
            await hideCombatBoard();
            const t = legendCard.loot;
            if (t === 'GainShard') {
                await new Promise(resolve => {
                    showEncounterModal({
                        title: 'Treasure Found!',
                        message: 'You open the chest and find a glowing Shard of Brahm!',
                        image: 'assets/cards/misc/tracker4.png',
                        choices: [{ label: 'Take the Shard', value: 'ok' }],
                        onChoice: () => {
                            updatePlayerStats('shards', 1);
                            logEvent('Treasure: Found a Shard of Brahm!');
                            resolve();
                        }
                    });
                });
            } else if (t && typeof t === 'string' && t.startsWith('Loot=')) {
                const m2 = t.match(/^Loot=(.+)$/);
                if (m2 && m2[1]) {
                    const lootName = m2[1];
                    if (lootName === 'Empty') {
                        await new Promise(resolve => {
                            showEncounterModal({
                                title: 'Empty Chest',
                                message: 'The treasure chest is empty. Nothing but dust.',
                                choices: [{ label: 'Continue', value: 'ok' }],
                                onChoice: resolve
                            });
                        });
                    } else {
                        const lootCard = Object.values(getAllCardsData()).find(c => c.name === lootName);
                        if (lootCard) {
                            await new Promise(resolve => {
                                showEncounterModal({
                                    title: 'Loot Found!',
                                    message: `You found: ${lootCard.name}`,
                                    image: lootCard.image,
                                    choices: [{ label: 'Take It', value: 'take' }],
                                    onChoice: () => {
                                        gameState.inventory.push(lootCard);
                                        displayInventory(gameState.inventory);
                                        logEvent(`Treasure: Found ${lootCard.name}.`);
                                        resolve();
                                    }
                                });
                            });
                        } else {
                            console.warn(`Loot card not found for name in treasure: ${lootName}`);
                        }
                    }
                }
            }
            break;
        }
        case 'Random': {
            await hideCombatBoard();
            const r = legendCard.random;
            if (r && typeof r === 'string') {
                const refMatch = r.match(/^Ref=(.+)$/);
                if (refMatch && refMatch[1]) {
                    const refName = refMatch[1];
                    const refCard = Object.values(getAllCardsData()).find(c => c.name === refName);
                    if (refCard) {
                        await handleReferenceCard(refCard);
                    } else {
                        console.warn(`Reference card not found for name: ${refName}`);
                    }
                } else if (r.startsWith('Enemy=')) {
                    const em = r.match(/^Enemy=(.+)$/);
                    if (em && em[1]) {
                        const enemyName = em[1];
                        const enemyCard = Object.values(getAllCardsData()).find(c => c.name === enemyName);
                        if (enemyCard) {
                            await initiateCombat(enemyCard);
                        } else {
                            console.warn(`Enemy card not found for name: ${enemyName}`);
                        }
                    }
                } else {
                    console.warn("Could not parse random event format:", r);
                }
            } else {
                console.warn("Random icon encountered, but no valid random event data found on the legend card.", { r });
            }
            break;
        }
        default:
            console.warn("Unknown icon encountered:", icon);
    }
}
// Applies special effects based on reference card name (Altar, Grove, etc.).
async function handleReferenceCard(refCard) {
    hideCombatBoard(); // Unmount React components before showing new modal
    console.log("Handling Reference Card effect for:", refCard.name);
    await new Promise(async resolve => {
        switch (refCard.name) {
            case 'Altar':
                const currentFavor = gameState.player.favor;
                let altarMessage = 'You pray at the altar and feel a faint warmth.';
                let altarChoices = [];
                let onAltarChoice = () => {};

                if (currentFavor >= 10) {
                    altarMessage = 'Your devotion is recognized! The altar offers a powerful blessing. Choose your reward:';
                    altarChoices = [
                        { label: 'Gain a Shard', value: 'shard' },
                        { label: 'Increase Max HP by 1', value: 'maxhp' }
                    ];
                    onAltarChoice = (val) => {
                        if (val === 'shard') {
                            updatePlayerStats('shards', 1);
                            logEvent('Altar: Gained a Shard!');
                        } else if (val === 'maxhp') {
                            gameState.player.maxHealth += 1;
                            updatePlayerStats('hp', 1);
                            logEvent('Altar: Max HP increased!');
                        }
                    };
                } else {
                    let hpGain = 0;
                    let enGain = 0;
                    if (currentFavor >= 8) { hpGain = 4; enGain = 3; }
                    else if (currentFavor >= 6) { hpGain = 3; enGain = 2; }
                    else if (currentFavor >= 4) { hpGain = 2; enGain = 1; }
                    else { hpGain = 1; }
                    
                    altarMessage = `Your prayer is answered. You gain +${hpGain} HP and +${enGain} Energy.`;
                    altarChoices = [{ label: 'Accept Blessing', value: 'ok' }];
                    onAltarChoice = () => {
                        updatePlayerStats('hp', hpGain);
                        updatePlayerStats('energy', enGain);
                        logEvent(`Altar: Gained ${hpGain} HP and ${enGain} Energy.`);
                    };
                }

                showEncounterModal({
                    title: 'Altar',
                    message: altarMessage,
                    image: refCard.image,
                    choices: altarChoices,
                    onChoice: (val) => {
                        onAltarChoice(val);
                        resolve();
                    }
                });
                break;
        case 'Campsite': // Note: Campsite is also a direct icon, but can appear via Random
            console.log("Resolving Campsite effect via Random.");
             console.log("Campsite Options: 1. Gain +2 HP and +1 Energy, or 2. Gain +1 Food.");
            // TODO: Implement player choice for Campsite benefit
            break;
            case 'Grove':
                showEncounterModal({
                    title: 'Whispering Grove',
                    message: 'The air hums with ancient energy. Roll a die to see what the grove provides.',
                    image: refCard.image,
                    dieRoll: true,
                    requireContinue: true,
                    onRoll: (roll) => {
                        let foodGained = 0;
                        if (roll === 1) {
                            updatePlayerStats('hp', -1);
                            logEvent('Grove: A thorny vine lashes out! Lost 1 HP.');
                        } else if (roll >= 3 && roll <= 4) {
                            foodGained = 1;
                        } else if (roll >= 5) {
                            foodGained = 2;
                        } else {
                            logEvent('Grove: The grove remains silent.');
                        }
                        if (foodGained > 0) {
                            updatePlayerStats('food', foodGained);
                            logEvent(`Grove: Found ${foodGained} Rations.`);
                        }
                        resolve();
                    }
                });
                break;
            case 'Labyrinth':
                let labyMessage = 'You are lost in a bewildering labyrinth!';
                let labyChoices = [];
                if (gameState.player.food > 0) {
                    labyMessage += ' You must consume 1 Ration to find your way.';
                    labyChoices.push({ label: 'Lose 1 Ration', value: 'ration' });
                } else if (gameState.player.energy >= 2) {
                    labyMessage += ' With no food, you must expend 2 Energy to escape.';
                    labyChoices.push({ label: 'Lose 2 Energy', value: 'energy' });
                } else {
                    const hpLoss = Math.min(3, gameState.player.hp - 1);
                    labyMessage += ` Weak and hungry, you suffer ${hpLoss} HP damage finding an exit.`;
                    labyChoices.push({ label: `Lose ${hpLoss} HP`, value: 'hp' });
                }

                showEncounterModal({
                    title: 'Labyrinth',
                    message: labyMessage,
                    image: refCard.image,
                    choices: labyChoices,
                    onChoice: (val) => {
                        if (val === 'ration') {
                            updatePlayerStats('food', -1);
                            logEvent('Labyrinth: Lost 1 Ration.');
                        } else if (val === 'energy') {
                            updatePlayerStats('energy', -2);
                            logEvent('Labyrinth: Lost 2 Energy.');
                        } else if (val === 'hp') {
                            const hpLoss = Math.min(3, gameState.player.hp - 1);
                            updatePlayerStats('hp', -hpLoss);
                            logEvent(`Labyrinth: Lost ${hpLoss} HP.`);
                        }
                        resolve();
                    }
                });
                break;
            case 'Pigman':
                const turnipIndex = gameState.inventory.findIndex(item => item.id === 'LT06');
                if (turnipIndex !== -1) {
                    showEncounterModal({
                        title: 'Friendly Pigman',
                        message: 'A Pigman gestures towards your Turnip. He is willing to trade.',
                        image: refCard.image,
                        choices: [
                            { label: 'Trade Turnip for a Shard', value: 'shard' },
                            { label: 'Keep Turnip, Gain 1 Favor', value: 'favor' }
                        ],
                        onChoice: (val) => {
                            if (val === 'shard') {
                                // Discard turnip and gain a shard
                                handleDiscardItem('LT06');
                                updatePlayerStats('shards', 1);
                                logEvent('Pigman: Traded Turnip for a Shard.');
                            } else {
                                updatePlayerStats('favor', 1);
                                logEvent('Pigman: Gained 1 Favor.');
                            }
                            resolve();
                        }
                    });
                } else {
                    showEncounterModal({
                        title: 'Friendly Pigman',
                        message: 'A friendly Pigman grunts at you and pats you on the back, granting you 1 Favor.',
                        image: refCard.image,
                        choices: [{ label: 'Thanks!', value: 'ok' }],
                        onChoice: () => {
                            updatePlayerStats('favor', 1);
                            logEvent('Pigman: Gained 1 Favor.');
                            resolve();
                        }
                    });
                }
                break;
            case 'Shrine':
                showEncounterModal({
                    title: 'Forgotten Shrine',
                    message: 'You discover a forgotten shrine. A Shard of Brahm rests on the pedestal!',
                    image: refCard.image,
                    choices: [{ label: 'Take the Shard', value: 'ok' }],
                    onChoice: () => {
                        updatePlayerStats('shards', 1);
                        logEvent('Shrine: Found a Shard of Brahm!');
                        resolve();
                    }
                });
                break;
            default:
                console.warn("Unknown Reference Card encountered:", refCard.name);
                resolve(); // Resolve promise for unknown cards
        }
    });
}

// Function to restore the UI from gameState after loading
async function restoreGameUIFromState() {
    hideCombatBoard(); // Unmount React components before showing new modal
    if (!gameState.visibleCards) return;
    const { raceId, classId, inventory, roomCardId, resultCardId, enemyCardId } = gameState.visibleCards;

    // Restore player cards
    if (raceId) {
        const raceCard = getCardById(raceId);
        if (raceCard) displayRaceCard(raceCard);
    }
    if (classId) {
        const classCard = getCardById(classId);
        if (classCard) displayClassCard(classCard);
    }

    // Restore inventory as objects
    if (Array.isArray(inventory)) {
        const invCards = inventory.map(id => getCardById(id)).filter(Boolean);
        gameState.inventory = invCards; // Ensure gameState.inventory is objects
        displayInventory(invCards);
    }

    // Restore room/result/enemy cards
    if (roomCardId) {
        const roomCard = getCardById(roomCardId);
        if (roomCard) displayRoomCard(roomCard);
    }
    if (resultCardId) {
        const resultCard = getCardById(resultCardId);
        if (resultCard) displayResultCard(resultCard);
    }
    if (enemyCardId) {
        const enemyCard = getCardById(enemyCardId);
        if (enemyCard) displayEnemyCard(enemyCard);
    } else {
        hideEnemyCard();
    }

    // Restore stat bars
    updateStatDisplay('hp', gameState.player.hp);
    updateStatDisplay('energy', gameState.player.energy);
    updateStatDisplay('food', gameState.player.food);
    updateStatDisplay('favor', gameState.player.favor);
    updateStatDisplay('level', gameState.level);
    updateStatDisplay('shards', gameState.player.shards);

    // Restore discard pile
    const lastRoomId = (gameState.discardPile && gameState.discardPile.room.length > 0) ? gameState.discardPile.room[gameState.discardPile.room.length-1] : null;
    const lastResultId = (gameState.discardPile && gameState.discardPile.result.length > 0) ? gameState.discardPile.result[gameState.discardPile.result.length-1] : null;
    const lastRoom = lastRoomId ? getCardById(lastRoomId) : null;
    const lastResult = lastResultId ? getCardById(lastResultId) : null;
    displayDiscardPile(lastRoom, lastResult);

    // --- Restore all in-memory decks from gameState.dungeon ---
    if (gameState.dungeon) {
        // Main dungeon deck
        if (Array.isArray(gameState.dungeon.deck)) {
            dungeonDeck.length = 0;
            gameState.dungeon.deck.forEach(id => {
                const card = getCardById(id);
                if (card) dungeonDeck.push(card);
            });
            if (dungeonDeck.length > 0) {
                displayDeckRoomCard(dungeonDeck[0]);
            }
        }
        // Result deck (if you use it)
        if (Array.isArray(gameState.dungeon.resultDeck)) {
            dungeonResultDeck.length = 0;
            gameState.dungeon.resultDeck.forEach(id => {
                const card = getCardById(id);
                if (card) dungeonResultDeck.push(card);
            });
        }
        // Optionally: restore discard piles for decks if you use them
    }

    // Restore current room/turn
    if (typeof gameState.currentRoom === 'number') {
        // If you have a UI element for current room, update it here
        // document.getElementById('current-room-num').textContent = gameState.currentRoom;
    }

    // Restore encounter/combat area if needed
    const combatArea = document.getElementById('combat-area');
    if (gameState.encounter && gameState.encounter.inProgress) {
        // Do NOT restore innerHTML, let React render the combat board
        resumeCombat(gameState.encounter.enemyId, gameState.encounter.enemyHp, gameState.encounter.playerHp);
    } else {
        if (combatArea) {
            await hideCombatBoard(); // Ensure React component is unmounted and wait for it
            combatArea.innerHTML = ''; // Clear non-React content
        }
    }
}

// Resume combat logic after loading a save
function resumeCombat(enemyId, enemyHp, playerHp) {
    hideCombatBoard(); // Unmount React components before showing new modal
    // Find the enemy card
    const enemyCard = enemyId ? getCardById(enemyId) : null;
    if (!enemyCard) return;

    // Restore enemy and player HP if provided
    if (typeof enemyHp === 'number') enemyCard.health = enemyHp;
    if (typeof playerHp === 'number') gameState.player.hp = playerHp;

    // Re-create the combat UI and re-attach event handlers
    // This is similar to initiateCombat, but skips the intro and uses the saved HPs
const classCard = getCardById(gameState.classId);
// Initialize enemy HP tracker on resume
updateAllTrackerCubes({
    hp: gameState.player.hp,
    energy: gameState.player.energy,
    food: gameState.player.food,
    favor: gameState.player.favor,
    level: gameState.level,
    enemyHp: currentEnemyHealth // Use currentEnemyHealth from loaded state
});
const availableAbilities = [];
for (const item of gameState.inventory) {
    if (item.abilities && item.abilities.length > 0) {
        for (const ability of item.abilities) {
            if (ability.trigger === 'on_attack') {
                availableAbilities.push({
                    label: `${item.name}: ${ability.details || ability.action}`,
                    itemId: item.id,
                    ability
                });
            }
        }
    }
}
let currentEnemyHealth = typeof enemyHp === 'number' ? enemyHp : enemyCard.health + gameState.level;
let isPlayerTurn = true;
let combatOver = false;
let axeRerollUsed = false;
function canUseAxeReroll() {
    return gameState.inventory.some(item => item.id === 'TRA01') && !axeRerollUsed;
}
function useAxeReroll() { axeRerollUsed = true; }
function canDiscardAxe() {
    return gameState.inventory.some(item => item.id === 'TRA01');
}
function discardAxe() {
    const idx = gameState.inventory.findIndex(item => item.id === 'TRA01');
    if (idx !== -1) gameState.inventory.splice(idx, 1);
    displayInventory(gameState.inventory);
}

showCombatBoard({
    classCard: classCard,
    enemyCard,
    abilities: availableAbilities,
    canUseAxeReroll,
    canDiscardAxe,
    onAxeReroll: (cb) => handleRoll(0, cb, { type: 'axe-reroll' }),
    onAxeDiscard: (cb) => handleRoll(0, cb, { type: 'axe-discard' }),
    onRoll: (selectedEnergy, cb, ab, forcedRolls) => handleRoll(selectedEnergy, cb, ab, forcedRolls),
    onClose: () => { 
        // --- CLEAR ENCOUNTER STATE ON CLOSE ---
        gameState.encounter = {
            inProgress: false,
            enemyId: null,
            enemyHp: null,
            playerHp: null,
            html: ""
        };
        hideCombatBoard(); 
        resolve(); 
    },
    playerEnergy: gameState.player.energy
});

    async function handleRoll(selectedEnergy, updateModal, usedAbility, forcedRolls) {
        console.log('DEBUG: handleRoll args', arguments);
        let roll1, roll2;
        if (forcedRolls) {
            [roll1, roll2] = forcedRolls;
        } else {
            [roll1, roll2] = rollDice();
        }
        let context = { inventory: gameState.inventory, roll1, roll2, attackBonus: 0 };
        context = applyPassiveEffects('on_attack', context);
        let message = '';
        let showRollBtn = true;
        let isCombatOver = false;
        let specialAttack = false;
        if (usedAbility && usedAbility.type === 'axe-discard') {
            discardAxe();
            const d6_1 = Math.floor(Math.random() * 6) + 1;
            const d6_2 = Math.floor(Math.random() * 6) + 1;
            const total = d6_1 + d6_2;
            const damageAfterDefense = Math.max(0, total - enemyCard.defense);
            currentEnemyHealth -= damageAfterDefense;
            message = `Axe Special Attack! Rolled ${d6_1} + ${d6_2} = ${total}. Damage after defense: ${damageAfterDefense}. Enemy HP: ${Math.max(0, currentEnemyHealth)}`;
            specialAttack = true;
        } else if (usedAbility && usedAbility.type === 'axe-reroll') {
            useAxeReroll();
            [roll1, roll2] = rollDice();
            context.roll1 = roll1;
            context.roll2 = roll2;
            message = `Axe Reroll! New roll: ${roll1}, ${roll2}`;
        }
if (!specialAttack) {
    if (isPlayerTurn) {
        if (context.roll1 === context.roll2) {
            message = message || `You rolled doubles (${context.roll1}, ${context.roll2}) and missed!`;
        } else {
            let totalDamage = 0;
            if (selectedEnergy === 0) {
                // Zero cost: 1 point of unblockable damage
                totalDamage = 1;
                currentEnemyHealth -= totalDamage;
                message = message || `You rolled ${context.roll1}, ${context.roll2}. Dealt 1 unblockable damage. Enemy HP: ${Math.max(0, currentEnemyHealth)}`;
            } else {
                // Non-zero cost: rawAttackPower + bonusDamage - enemyDefense
                const rawAttackValue = Math.abs(context.roll1 - context.roll2);
                const classData = getCardById(gameState.classId);
                console.log('DEBUG: classData FULL', classData);
                let bonusDamage = 0;
                console.log('DEBUG: classData before bonus check', classData);
                console.log('DEBUG: classData.combatBonusDamageEnergyCost', classData && classData.combatBonusDamageEnergyCost);
                console.log('DEBUG: classData.combatBonusDamage', classData && classData.combatBonusDamage);
                if (classData && classData.combatBonusDamageEnergyCost && classData.combatBonusDamage) {
                    const energyCosts = classData.combatBonusDamageEnergyCost.map(Number);
                    const bonusArray = classData.combatBonusDamage.map(Number);
                    console.log('DEBUG: classData', classData);
                    console.log('DEBUG: selectedEnergy', selectedEnergy, typeof selectedEnergy);
                    console.log('DEBUG: energyCosts', energyCosts);
                    console.log('DEBUG: bonusArray', bonusArray);
                    let energyIndex = energyCosts.indexOf(Number(selectedEnergy));
                    console.log('DEBUG: energyIndex', energyIndex);
                    if (energyIndex === -1 && Number.isInteger(selectedEnergy) && selectedEnergy >= 0 && selectedEnergy < bonusArray.length) {
                        // fallback: use selectedEnergy as index if indexOf fails
                        energyIndex = selectedEnergy;
                        console.log('DEBUG: fallback energyIndex', energyIndex);
                    }
                    if (energyIndex !== -1) {
                        bonusDamage = bonusArray[energyIndex];
                        console.log('DEBUG: bonusDamage', bonusDamage);
                    }
                }
                totalDamage = rawAttackValue + bonusDamage + (context.attackBonus || 0);
                const damageAfterDefense = Math.max(0, totalDamage - enemyCard.defense);
                currentEnemyHealth -= damageAfterDefense;
                message = message || `You rolled ${context.roll1}, ${context.roll2}. Spent ${selectedEnergy} energy for ${bonusDamage} bonus damage. Damage after defense: ${damageAfterDefense}. Enemy HP: ${Math.max(0, currentEnemyHealth)}`;
            }
        }
        if (currentEnemyHealth <= 0) {
            message += `\n${enemyCard.name} defeated! Gained ${enemyCard.favor} favor.`;
            updatePlayerStats('favor', enemyCard.favor);
            showRollBtn = false;
            isCombatOver = true;
            combatOver = true;
        }
    } else {
        if (context.roll1 === context.roll2) {
            message = `${enemyCard.name} rolled doubles (${context.roll1}, ${context.roll2}) and missed!`;
        } else {
            let damageDealt = Math.abs(context.roll1 - context.roll2) + enemyCard.attack;
            updatePlayerStats('hp', -damageDealt);
            message = `${enemyCard.name} rolled ${context.roll1}, ${context.roll2}. Damage dealt: ${damageDealt}. Player HP: ${gameState.player.hp}`;
        }
        if (gameState.player.hp <= 0) {
            message += `\nYou were defeated by ${enemyCard.name}!`;
            showRollBtn = false;
            isCombatOver = true;
            combatOver = true;
        }
    }
}
        isPlayerTurn = !isPlayerTurn;

            // --- UPDATE ENCOUNTER STATE ON EACH ROLL ---
            gameState.encounter = {
                inProgress: !isCombatOver,
                enemyId: enemyCard.id,
                enemyHp: currentEnemyHealth,
                playerHp: gameState.player.hp
            };
            // Update tracker cubes after any stat change
            updateAllTrackerCubes({
                hp: gameState.player.hp,
                energy: gameState.player.energy,
                food: gameState.player.food,
                favor: gameState.player.favor,
                level: gameState.level,
                enemyHp: gameState.encounter.enemyHp // Use the value from gameState.encounter
            });

            updateModal({ roll1: context.roll1, roll2: context.roll2, message, showRollBtn, isCombatOver });
    }
}

// Function to update player stats (can be used by icon handlers)
// Updates a stat, clamps values, updates UI, checks for defeat, and saves state.
function updatePlayerStats(stat, amount) {
    hideCombatBoard(); // Unmount React components before showing new modal
    if (gameState.player.hasOwnProperty(stat)) {
        gameState.player[stat] += amount;
        // Ensure stats don't go below zero or above max (for health and energy)
        if (stat === 'hp') {
            gameState.player.hp = Math.max(0, Math.min(gameState.player.hp, gameState.player.maxHealth));
        } else if (stat === 'energy') {
            gameState.player.energy = Math.max(0, Math.min(gameState.player.energy, gameState.player.maxEnergy));
        }
        updateStatDisplay(stat, gameState.player[stat]);
        if (stat === 'shards') {
            updateStatDisplay('shards', gameState.player.shards);
        }
        displayInventory(gameState.inventory);

        // Update tracker cubes after any stat change
        updateAllTrackerCubes({
            hp: gameState.player.hp,
            energy: gameState.player.energy,
            food: gameState.player.food,
            favor: gameState.player.favor,
            level: gameState.level,
            enemyHp: gameState.encounter && gameState.encounter.inProgress ? gameState.encounter.enemyHp : 0 // Use encounter enemyHp if in combat, else 0
        });

        // Check for player defeat after health changes
        if (stat === 'hp' && gameState.player.hp <= 0) {
            checkWinLossConditions(); // Check for loss due to health depletion
        }

        saveGame();
    } else {
        console.warn(`Attempted to update unknown stat: ${stat}`);
    }
}

/**
 * Centralized handler for all loot and trapping abilities/effects.
 * Call this function at relevant game events (combat, encounter, discard, altar, trap, etc.).
 * Handles all actions/triggers/targets from data/loot.json and data/trappings.json.
 * 
 * eventContext: {
 *   trigger: string,
 *   encounterType?: string,
 *   discardItemId?: string,
 *   altarContext?: object,
 *   combatContext?: object,
 *   trapContext?: object,
 *   ...etc
 * }
 */
async function processAllItemEffects(eventContext) {
    hideCombatBoard(); // Unmount React components before showing new modal
    // Ensure discard piles exist
    if (!gameState.lootDiscardPile) gameState.lootDiscardPile = [];
    if (!gameState.trappingsDiscardPile) gameState.trappingsDiscardPile = [];

    // Gather all loot and trappings in inventory
    const allItems = gameState.inventory.filter(item =>
        (item.id && (item.id.startsWith('LT') || item.id.startsWith('TRA')))
    );

    for (const item of allItems) {
        // --- Effects (passive, triggered) ---
        if (item.effects && item.effects.length) {
            for (const effect of item.effects) {
                // --- Shield: damage reduction ---
                if (effect.action === "damage_reduction" && eventContext.trigger === "on_receive_damage") {
                    if (eventContext.damage >= 6) {
                        eventContext.damage = Math.max(0, eventContext.damage - (effect.amount || 1));
                        logEvent(`${item.name}: Reduced damage by ${effect.amount || 1}.`);
                    }
                }
                // --- Bedroll: +1 HP at campsite ---
                if (effect.trigger === "on_campsite" && eventContext.trigger === "on_campsite" && effect.action === "heal") {
                    updatePlayerStats('hp', effect.amount || 1);
                    logEvent(`${item.name}: Gained ${effect.amount || 1} HP at campsite.`);
                }
                // --- Books: +1 EN at campsite ---
                if (effect.trigger === "on_campsite" && eventContext.trigger === "on_campsite" && effect.action === "recover") {
                    updatePlayerStats('energy', effect.amount || 1);
                    logEvent(`${item.name}: Gained ${effect.amount || 1} EN at campsite.`);
                }
                // --- Dagger: +1 damage on first room card combat ---
                if (effect.trigger === "on_attack" && eventContext.trigger === "on_attack" && effect.condition === "first_room_card") {
                    if (eventContext.combatContext && eventContext.combatContext.isFirstRoomCard) {
                        eventContext.combatContext.attackBonus = (eventContext.combatContext.attackBonus || 0) + (effect.amount || 1);
                        logEvent(`${item.name}: +${effect.amount || 1} damage (first room card).`);
                    }
                }
                // --- Mace: +1 damage vs undead ---
                if (effect.trigger === "on_attack" && eventContext.trigger === "on_attack" && effect.condition === "enemy_type_undead") {
                    if (eventContext.combatContext && eventContext.combatContext.enemyType === "Undead") {
                        eventContext.combatContext.attackBonus = (eventContext.combatContext.attackBonus || 0) + (effect.amount || 1);
                        logEvent(`${item.name}: +${effect.amount || 1} damage vs Undead.`);
                    }
                }
            }
        }

        // --- Abilities (active, triggered) ---
        if (item.abilities && item.abilities.length) {
            for (const ability of item.abilities) {
                switch (ability.action) {
                    // --- GillNet: Water encounter, roll 3 dice, gain food per success ---
                    case "roll_dice":
                        if (eventContext.trigger === "on_water_encounter" && item.id === "LT01") {
                            let successes = 0;
                            for (let i = 0; i < (ability.amount || 3); i++) {
                                const [roll] = rollDice();
                                if (roll >= 4) successes++;
                            }
                            if (successes > 0) {
                                updatePlayerStats('food', successes);
                                logEvent(`${item.name}: Gained ${successes} rations.`);
                            }
                        }
                        break;
                    // --- Ring: Spend 1 favor to bypass enemy encounter (once per dungeon level) ---
                    case "bypass_encounter":
                        if (eventContext.trigger === "on_encounter" && eventContext.encounterType === "enemy" && item.id === "LT02") {
                            if (gameState.player.favor > 0 && !item._bypassedThisLevel) {
                                gameState.player.favor -= 1;
                                item._bypassedThisLevel = true;
                                logEvent(`${item.name}: Enemy encounter bypassed by spending 1 favor.`);
                                eventContext.bypassed = true;
                            }
                        }
                        break;
                    // --- Shield: Discard to activate (handled elsewhere) ---
                    case "discard_item":
                        if (eventContext.trigger === "on_discard" && eventContext.discardItemId === item.id) {
                            logEvent(`${item.name}: Discarded.`);
                        }
                        break;
                    // --- Sword: Deal 5 damage to enemy (active) ---
                    case "apply_damage":
                        if (eventContext.trigger === "on_attack" && eventContext.combatContext && item.id === "LT04") {
                            eventContext.combatContext.enemyHp -= (ability.amount || 5);
                            logEvent(`${item.name}: Dealt ${ability.amount || 5} damage to enemy.`);
                        }
                        break;
                    // --- Sword: Ignore miss on doubles ---
                    case "ignore_miss":
                        if (eventContext.trigger === "on_roll_double" && eventContext.combatContext && item.id === "LT04") {
                            eventContext.combatContext.ignoreMiss = true;
                            logEvent(`${item.name}: Ignored miss on doubles.`);
                        }
                        break;
                    // --- Symbol: Altar reward level = current favor + 1 ---
                    case "modify_altar_reward":
                        if (eventContext.trigger === "on_altar" && item.id === "LT05") {
                            eventContext.altarContext.rewardLevel = gameState.player.favor + 1;
                            logEvent(`${item.name}: Altar reward level increased by 1.`);
                        }
                        break;
                    // --- Turnip: Discard during Pigman for a shard ---
                    case "discard_to_gain":
                        if (eventContext.trigger === "during_ref_pigman" && eventContext.discardItemId === item.id && item.id === "LT06") {
                            updatePlayerStats('shards', 1);
                            logEvent(`${item.name}: Discarded for 1 shard.`);
                        }
                        break;
                    // --- Turnip: Discard anytime for +3 energy ---
                    case "gain_resource":
                        if (eventContext.trigger === "on_discard" && eventContext.discardItemId === item.id && item.id === "LT06") {
                            updatePlayerStats('energy', ability.amount || 3);
                            logEvent(`${item.name}: Discarded for +${ability.amount || 3} energy.`);
                            // Remove from inventory and add to loot discard pile
                            const idx = gameState.inventory.findIndex(i => i.id === item.id);
                            if (idx !== -1) {
                                gameState.lootDiscardPile.push(gameState.inventory[idx]);
                                gameState.inventory.splice(idx, 1);
                                displayInventory(gameState.inventory);
                            }
                        }
                        break;
                    // --- Potion: Use to gain health/energy ---
                    case "gain_resource":
                        if (eventContext.trigger === "on_use" && eventContext.itemId === item.id && item.id === "LT08") {
                            if (ability.target === "health") updatePlayerStats('hp', ability.amount || 2);
                            if (ability.target === "energy") updatePlayerStats('energy', ability.amount || 2);
                            logEvent(`${item.name}: Gained ${ability.amount} ${ability.target}.`);
                            // Remove from inventory and add to loot discard pile
                            const idx = gameState.inventory.findIndex(i => i.id === item.id);
                            if (idx !== -1) {
                                gameState.lootDiscardPile.push(gameState.inventory[idx]);
                                gameState.inventory.splice(idx, 1);
                                displayInventory(gameState.inventory);
                            }
                        }
                        break;
                    // --- Wedge: Avoid combat encounter ---
                    case "avoid_encounter":
                        if (eventContext.trigger === "on_encounter" && eventContext.encounterType === "combat" && item.id === "LT07") {
                            eventContext.avoided = true;
                            logEvent(`${item.name}: Combat encounter avoided.`);
                        }
                        break;
                    // --- Scroll: Defeat undead enemy (trapping) ---
                    case "defeat":
                        if (eventContext.trigger === "on_discard" && eventContext.discardItemId === item.id && item.id === "TRA04") {
                            // Find current enemy in combat
                            const encounter = gameState.encounter;
                            if (encounter && encounter.inProgress) {
                                const enemyCard = getCardById(encounter.enemyId);
                                if (enemyCard && (enemyCard.enemyType === "Undead" || (enemyCard.traits && enemyCard.traits.includes("Undead")))) {
                                    encounter.enemyHp = 0;
                                    encounter.inProgress = false;
                                    logEvent(`${item.name}: Undead enemy instantly defeated!`);
                                    // Remove Scroll from inventory and add to trappings discard pile
                                    const idx = gameState.inventory.findIndex(i => i.id === item.id);
                                    if (idx !== -1) {
                                        gameState.trappingsDiscardPile.push(gameState.inventory[idx]);
                                        gameState.inventory.splice(idx, 1);
                                        displayInventory(gameState.inventory);
                                    }
                                } else {
                                    logEvent(`${item.name}: No undead enemy to defeat.`);
                                }
                            }
                        }
                        break;
                    // --- Axe: Reroll on doubles (once per dungeon level) ---
                    case "reroll":
                        if (eventContext.trigger === "on_attack" && eventContext.combatContext && item.id === "TRA01") {
                            if (eventContext.combatContext.rolledDoubles && !item._rerolledThisLevel) {
                                item._rerolledThisLevel = true;
                                eventContext.combatContext.allowReroll = true;
                                logEvent(`${item.name}: Reroll allowed (once per level).`);
                            }
                        }
                        break;
                    // --- Axe: Discard to deal 2d6 damage to enemy ---
                    case "damage":
                        if (eventContext.trigger === "on_discard" && eventContext.discardItemId === item.id && item.id === "TRA01") {
                            // Discard to deal 2d6 damage to enemy
                            const d6_1 = Math.floor(Math.random() * 6) + 1;
                            const d6_2 = Math.floor(Math.random() * 6) + 1;
                            const total = d6_1 + d6_2;
                            if (eventContext.combatContext) {
                                eventContext.combatContext.enemyHp -= total;
                                logEvent(`${item.name}: Discarded for ${total} damage to enemy.`);
                            }
                            // Remove from inventory and add to trappings discard pile
                            const idx = gameState.inventory.findIndex(i => i.id === item.id);
                            if (idx !== -1) {
                                gameState.trappingsDiscardPile.push(gameState.inventory[idx]);
                                gameState.inventory.splice(idx, 1);
                                displayInventory(gameState.inventory);
                            }
                        }
                        break;
                    // --- Potion (trapping): Use for +2 HP and +2 EN ---
                    case "heal":
                        if (eventContext.trigger === "on_use" && eventContext.itemId === item.id && item.id === "TRA06") {
                            if (ability.target === "health") updatePlayerStats('hp', ability.amount || 2);
                            if (ability.target === "energy") updatePlayerStats('energy', ability.amount || 2);
                            logEvent(`${item.name}: Gained ${ability.amount} ${ability.target}.`);
                            // Remove from inventory and add to trappings discard pile
                            const idx = gameState.inventory.findIndex(i => i.id === item.id);
                            if (idx !== -1) {
                                gameState.trappingsDiscardPile.push(gameState.inventory[idx]);
                                gameState.inventory.splice(idx, 1);
                                displayInventory(gameState.inventory);
                            }
                        }
                        break;
                    // --- Toolkit: May optionally disarm a trap when encountered ---
                    case "bypass":
                        if (eventContext.trigger === "on_trap_encounter" && item.id === "TRA08") {
                            await new Promise(resolve => {
                                showEncounterModal({
                                    title: 'Toolkit',
                                    message: 'You can use your Toolkit to try and disarm the trap. Roll a die: a 4+ means you succeed!',
                                    image: item.image,
                                    dieRoll: true,
                                    requireContinue: true,
                                    onRoll: (roll) => {
                                        if (roll >= 4) {
                                            eventContext.trapContext.bypassed = true;
                                            logEvent(`${item.name}: Trap successfully disarmed!`);
                                        } else {
                                            eventContext.trapContext.bypassed = false;
                                            logEvent(`${item.name}: Disarm attempt failed. The trap triggers!`);
                                        }
                                        resolve();
                                    }
                                });
                            });
                        }
                        break;
                    default:
                        break;
                }
            }
        }
    }
}

// Full combat logic for enemy encounters
async function initiateCombat(enemyCard) {
    hideCombatBoard(); // Unmount React components before showing new modal
    console.log('initiateCombat: gameState.raceId =', gameState.raceId);
const classCard = getCardById(gameState.classId); // Use class card for combat logic
console.log('initiateCombat: classCard =', classCard);
if (!classCard) {
    console.error('initiateCombat: classCard is undefined for classId:', gameState.classId);
    const allCardIds = Object.keys(getAllCardsData());
    console.error('Available card IDs:', allCardIds);
    alert('Error: Player class card not found. Please restart the game.');
    return;
}
// Collect available abilities for this combat round
const availableAbilities = [];
for (const item of gameState.inventory) {
    if (item.abilities && item.abilities.length > 0) {
        for (const ability of item.abilities) {
            if (ability.trigger === 'on_attack') {
                availableAbilities.push({
                    label: `${item.name}: ${ability.details || ability.action}`,
                    itemId: item.id,
                    ability
                });
            }
        }
    }
}
let currentEnemyHealth = enemyCard.health + gameState.level;
let isPlayerTurn = true;
let combatOver = false;
let axeRerollUsed = false;

// --- UPDATE ENCOUNTER STATE ON COMBAT START ---
gameState.encounter = {
    inProgress: true,
    enemyId: enemyCard.id,
    enemyHp: currentEnemyHealth,
    playerHp: gameState.player.hp
};
// Initialize enemy HP tracker
updateAllTrackerCubes({
    hp: gameState.player.hp,
    energy: gameState.player.energy,
    food: gameState.player.food,
    favor: gameState.player.favor,
    level: gameState.level,
    enemyHp: currentEnemyHealth
});

function canUseAxeReroll() {
    // Only allow once per dungeon level
    return gameState.inventory.some(item => item.id === 'TRA01') && !axeRerollUsed;
}
function useAxeReroll() { axeRerollUsed = true; }
function canDiscardAxe() {
    return gameState.inventory.some(item => item.id === 'TRA01');
}
function discardAxe() {
    const idx = gameState.inventory.findIndex(item => item.id === 'TRA01');
    if (idx !== -1) gameState.inventory.splice(idx, 1);
    displayInventory(gameState.inventory);
}

await new Promise((resolve) => {
    async function handleRoll(selectedEnergy, updateModal, usedAbility, forcedRolls) {
            console.log('DEBUG: handleRoll (initiateCombat) args', arguments);
            selectedEnergy = Number(selectedEnergy);
            console.log('DEBUG: selectedEnergy (coerced)', selectedEnergy, typeof selectedEnergy);
            let roll1, roll2;
            if (forcedRolls) {
                [roll1, roll2] = forcedRolls;
            } else {
                [roll1, roll2] = rollDice();
            }
            let context = { inventory: gameState.inventory, roll1, roll2, attackBonus: 0 };
            context = applyPassiveEffects('on_attack', context);
            let message = '';
            let showRollBtn = true;
            let isCombatOver = false;
            let specialAttack = false;

            // Deduct energy at the start of the player's turn
            if (isPlayerTurn && selectedEnergy > 0) {
                updatePlayerStats('energy', -selectedEnergy);
                logEvent(`Spent ${selectedEnergy} energy for skill usage.`);
            }

            if (usedAbility && usedAbility.type === 'axe-discard') {
                // Axe discard special attack
                discardAxe();
                const d6_1 = Math.floor(Math.random() * 6) + 1;
                const d6_2 = Math.floor(Math.random() * 6) + 1;
                context.roll1 = d6_1;
                context.roll2 = d6_2;
                const total = d6_1 + d6_2;
                const damageAfterDefense = Math.max(0, total - enemyCard.defense);
                currentEnemyHealth -= damageAfterDefense;
                message = `Axe Special Attack! Rolled ${d6_1} + ${d6_2} = ${total}. Damage after defense: ${damageAfterDefense}. Enemy HP: ${Math.max(0, currentEnemyHealth)}`;
                specialAttack = true;

                if (currentEnemyHealth <= 0) {
                    message += `\n${enemyCard.name} defeated! Gained ${enemyCard.favor} favor.`
                    updatePlayerStats('favor', enemyCard.favor);
                    showRollBtn = false;
                    isCombatOver = true;
                    combatOver = true;
                }
            } else if (usedAbility && usedAbility.type === 'axe-reroll') {
                useAxeReroll();
                // Reroll dice
                [roll1, roll2] = rollDice();
                context.roll1 = roll1;
                context.roll2 = roll2;
                message = `Axe Reroll! New roll: ${roll1}, ${roll2}`;
            }
            if (!specialAttack) {
                if (isPlayerTurn) {
                    if (context.roll1 === context.roll2) {
                        message = message || `You rolled doubles (${context.roll1}, ${context.roll2}) and missed!`;
                    } else {
                        let totalDamage = 0;
                        if (selectedEnergy === 0) {
                            // Zero cost: 1 point of unblockable damage
                            totalDamage = 1;
                            currentEnemyHealth -= totalDamage;
                            message = message || `You rolled ${context.roll1}, ${context.roll2}. Dealt 1 unblockable damage. Enemy HP: ${Math.max(0, currentEnemyHealth)}`;
                        } else {
                            // Non-zero cost: rawAttackPower + bonusDamage - enemyDefense
                            const rawAttackValue = Math.abs(context.roll1 - context.roll2);
                            const classData = getCardById(gameState.classId);
let bonusDamage = 0;
if (classData && classData.combatBonusDamageEnergyCost && classData.combatBonusDamage) {
    const energyCosts = classData.combatBonusDamageEnergyCost.map(Number);
    const bonusArray = classData.combatBonusDamage.map(Number);
    console.log('DEBUG: classData', classData);
    console.log('DEBUG: selectedEnergy', selectedEnergy, typeof selectedEnergy);
    console.log('DEBUG: energyCosts', energyCosts);
    console.log('DEBUG: bonusArray', bonusArray);
    let energyIndex = energyCosts.indexOf(Number(selectedEnergy));
    console.log('DEBUG: energyIndex', energyIndex);
    if (energyIndex === -1 && Number.isInteger(selectedEnergy) && selectedEnergy >= 0 && selectedEnergy < bonusArray.length) {
        // fallback: use selectedEnergy as index if indexOf fails
        energyIndex = selectedEnergy;
        console.log('DEBUG: fallback energyIndex', energyIndex);
    }
    if (energyIndex !== -1) {
        bonusDamage = bonusArray[energyIndex];
        console.log('DEBUG: bonusDamage', bonusDamage);
    }
}
                            totalDamage = rawAttackValue + bonusDamage + (context.attackBonus || 0);
                            const damageAfterDefense = Math.max(0, totalDamage - enemyCard.defense);
                            currentEnemyHealth -= damageAfterDefense;
                            message = message || `You rolled ${context.roll1}, ${context.roll2}. Spent ${selectedEnergy} energy for ${bonusDamage} bonus damage. Damage after defense: ${damageAfterDefense}. Enemy HP: ${Math.max(0, currentEnemyHealth)}`;
                        }
                    }
                    if (currentEnemyHealth <= 0) {
                        message += `\n${enemyCard.name} defeated! Gained ${enemyCard.favor} favor.`;
                        updatePlayerStats('favor', enemyCard.favor);
                        showRollBtn = false;
                        isCombatOver = true;
                        combatOver = true;
                    }
                } else {
                    if (context.roll1 === context.roll2) {
                        message = `${enemyCard.name} rolled doubles (${context.roll1}, ${context.roll2}) and missed!`;
                    } else {
                        let damageDealt = Math.abs(context.roll1 - context.roll2) + enemyCard.attack;
                        updatePlayerStats('hp', -damageDealt);
                        message = `${enemyCard.name} rolled ${context.roll1}, ${context.roll2}. Damage dealt: ${damageDealt}. Player HP: ${gameState.player.hp}`;
                    }
                    if (gameState.player.hp <= 0) {
                        message += `\nYou were defeated by ${enemyCard.name}!`;
                        showRollBtn = false;
                        isCombatOver = true;
                        combatOver = true;
                    }
                }
            }
            isPlayerTurn = !isPlayerTurn;

            // --- UPDATE ENCOUNTER STATE ON EACH ROLL ---
            gameState.encounter = {
                inProgress: !isCombatOver,
                enemyId: enemyCard.id,
                enemyHp: currentEnemyHealth,
                playerHp: gameState.player.hp
            };

            updateModal({ roll1: context.roll1, roll2: context.roll2, message, showRollBtn, isCombatOver });
        }
showCombatBoard({
    classCard: classCard,
    enemyCard,
    abilities: availableAbilities,
    canUseAxeReroll,
    canDiscardAxe,
    onAxeReroll: (cb) => handleRoll(0, cb, { type: 'axe-reroll' }), // Pass 0 for energy
    onAxeDiscard: (cb) => handleRoll(0, cb, { type: 'axe-discard' }), // Pass 0 for energy
    onRoll: (selectedEnergy, cb, ab, forcedRolls) => handleRoll(selectedEnergy, cb, ab, forcedRolls),
    onClose: () => { 
        // --- CLEAR ENCOUNTER STATE ON CLOSE ---
        gameState.encounter = {
            inProgress: false,
            enemyId: null,
            enemyHp: null,
            playerHp: null,
            html: ""
        };
        hideCombatBoard(); 
        resolve(); 
    },
    playerEnergy: gameState.player.energy // Pass player's current energy
});
    });
}

// --- Next Room Button Logic ---
function enableNextRoomButton() {
    hideCombatBoard(); // Unmount React components before showing new modal
    const btn = document.getElementById('next-room-btn');
    const decisionButtons = document.getElementById('room-decision-buttons');
    if (btn && decisionButtons) {
        decisionButtons.style.display = 'flex';
        btn.style.display = 'inline-block';
        btn.disabled = false;
        // Hide resolve and skip buttons
        const resolveBtn = document.getElementById('resolve-button');
        const skipBtn = document.getElementById('skip-button');
        if (resolveBtn) resolveBtn.style.display = 'none';
        if (skipBtn) skipBtn.style.display = 'none';
    }
}

function disableNextRoomButton() {
    hideCombatBoard(); // Unmount React components before showing new modal
    const btn = document.getElementById('next-room-btn');
    const decisionButtons = document.getElementById('room-decision-buttons');
    if (btn && decisionButtons) {
        btn.style.display = 'none';
        btn.disabled = true;
        decisionButtons.style.display = 'none';
        // Show resolve and skip buttons for next round
        const resolveBtn = document.getElementById('resolve-button');
        const skipBtn = document.getElementById('skip-button');
        if (resolveBtn) resolveBtn.style.display = 'inline-block';
        if (skipBtn) skipBtn.style.display = 'inline-block';
    }
}

// Attach event listener for Next Room button (if not already attached)
(function setupNextRoomButton() {
    hideCombatBoard(); // Unmount React components before showing new modal
    const btn = document.getElementById('next-room-btn');
    if (btn && !btn.dataset.bound) {
        btn.addEventListener('click', async () => {
            disableNextRoomButton(); // Disable button immediately to prevent double clicks

            // Discard previous room and result cards
            discardPreviousRoomAndResult();
            hideEnemyCard(); // Hide the enemy card when advancing to the next round

            // Clear visible cards/state for the next round/level
            gameState.visibleCards = {
                ...gameState.visibleCards,
                roomCardId: null,
                resultCardId: null,
                enemyCardId: null
            };
            displayRoomCard(null); // Explicitly clear UI for room/result
            displayResultCard(null);

            saveGame();

            if (gameState.currentRoom >= 6) {
                // If 6 rooms are cleared, it's time to end the level
                await endDungeonLevel();
            } else {
                // Otherwise, just proceed to the next room within the same level
                await handleRoom();
            }
        });
        btn.dataset.bound = 'true';
        disableNextRoomButton();
    }
})();

/**
 * Simulate rolling two six-sided dice.
 * @returns {[number, number]}
 */
function rollDice() {
    hideCombatBoard(); // Unmount React components before showing new modal
    console.trace('DEBUG: rollDice called');
    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;
    console.log(`Dice rolled: ${roll1}, ${roll2}`);
    return [roll1, roll2];
}

/**
 * Process use of trappings (e.g., Scroll TRA04).
 * @param {object} eventContext - { trigger, trappingId }
 */
function processTrappingUse(eventContext) {
    hideCombatBoard(); // Unmount React components before showing new modal
    // Ensure trappings discard pile exists
    if (!gameState.trappingsDiscardPile) gameState.trappingsDiscardPile = [];
    // Only handle Scroll (TRA04) for now
    if (eventContext.trigger === "on_use_scroll" && eventContext.trappingId === "TRA04") {
        // Find current enemy in combat
        const undeadEnemies = ["Skelepede", "Skeleton", "Ghoul", "Wraith", "Lich"]; // Add more as needed
        const encounter = gameState.encounter;
        if (encounter && encounter.inProgress) {
            const enemyCard = getCardById(encounter.enemyId);
            if (enemyCard && (
                undeadEnemies.includes(enemyCard.name) ||
                (enemyCard.traits && enemyCard.traits.includes("Undead")) ||
                enemyCard.enemyType === "Undead"
            )) {
                // Defeat the enemy and end combat
                encounter.enemyHp = 0;
                encounter.inProgress = false;
                logEvent("Scroll: Undead enemy instantly defeated!");
                // Remove Scroll from inventory and add to trappings discard pile
                const idx = gameState.inventory.findIndex(i => i.id === "TRA04");
                if (idx !== -1) {
                    gameState.trappingsDiscardPile.push(gameState.inventory[idx]);
                    gameState.inventory.splice(idx, 1);
                    displayInventory(gameState.inventory);
                }
                // Hide combat board if visible
                if (typeof hideCombatBoard === "function") hideCombatBoard();
            } else {
                logEvent("Scroll: No undead enemy to defeat.");
            }
        } else {
            logEvent("Scroll: No enemy encounter in progress.");
        }
    }
}

window.processAllItemEffects = processAllItemEffects;
window.processTrappingUse = processTrappingUse;

// --- INTEGRATION: Call processAllItemEffects at key game flow points ---

// Example: Call after updating player stats (for passive triggers like on_receive_damage)
const _originalUpdatePlayerStats = updatePlayerStats;
function updatePlayerStatsWithItems(stat, amount) {
    hideCombatBoard(); // Unmount React components before showing new modal
    // Before stat update: check for on_receive_damage
    if (stat === 'hp' && amount < 0) {
        processAllItemEffects({ trigger: 'on_receive_damage', damage: Math.abs(amount) });
    }
    _originalUpdatePlayerStats(stat, amount);
}
window.updatePlayerStats = updatePlayerStatsWithItems;

// Example: Call after combat roll (for on_attack, on_roll_double, etc.)
// (You may need to call processAllItemEffects in your combat logic, e.g., in initiateCombat and resumeCombat)

// Example: Call after trap encounter
function handleTrapEncounter(trapContext) {
    hideCombatBoard(); // Unmount React components before showing new modal
    processAllItemEffects({ trigger: 'on_trap_encounter', trapContext });
    // ...rest of trap logic
}
window.handleTrapEncounter = handleTrapEncounter;

// Example: Call after campsite
function handleCampsite() {
    hideCombatBoard(); // Unmount React components before showing new modal
    processAllItemEffects({ trigger: 'on_campsite' });
    // ...rest of campsite logic
}
window.handleCampsite = handleCampsite;

// Example: Call after altar
function handleAltar(altarContext) {
    hideCombatBoard(); // Unmount React components before showing new modal
    processAllItemEffects({ trigger: 'on_altar', altarContext });
    // ...rest of altar logic
}
window.handleAltar = handleAltar;

            // Handle using items (like potions)
            function handleUseItem(itemId) {
                hideCombatBoard(); // Unmount React components before showing new modal
                if (!gameState.lootDiscardPile) gameState.lootDiscardPile = [];
                if (!gameState.trappingsDiscardPile) gameState.trappingsDiscardPile = [];
                const item = getCardById(itemId);
                if (!item) return;

                // Potion handling (LT08 and TRA06)
                if (itemId === "LT08" || itemId === "TRA06") {
                    // First check if any healing is possible
                    const canHealHP = gameState.player.hp < gameState.player.maxHealth;
                    const canHealEN = gameState.player.energy < gameState.player.maxEnergy;

                    if (!canHealHP && !canHealEN) {
                        logEvent(`${item.name}: Cannot use - both HP and Energy are already at maximum.`);
                        return;
                    }

                    // Calculate actual heals without exceeding max
                    const hpHeal = Math.min(2, gameState.player.maxHealth - gameState.player.hp);
                    const enHeal = Math.min(2, gameState.player.maxEnergy - gameState.player.energy);

                    // Apply heals
                    if (hpHeal > 0) updatePlayerStats('hp', hpHeal);
                    if (enHeal > 0) updatePlayerStats('energy', enHeal);
                    
                    // Discard only if any healing occurred
                    if (hpHeal > 0 || enHeal > 0) {
                        logEvent(`${item.name}: Healed ${hpHeal} HP and ${enHeal} EN`);
                        const idx = gameState.inventory.findIndex(i => i.id === itemId);
                        if (idx !== -1) {
                            const discardPile = itemId.startsWith('LT') ? 
                                gameState.lootDiscardPile : 
                                gameState.trappingsDiscardPile;
                            discardPile.push(gameState.inventory[idx]);
                            gameState.inventory.splice(idx, 1);
                            displayInventory(gameState.inventory);
                        }
                    } else {
                        logEvent(`${item.name}: Cannot use - both HP and Energy are already at maximum.`);
                    }
                    return;
                }

                // Default behavior for other items
                processAllItemEffects({ trigger: 'on_use', itemId });
            }

            // Handle discarding items (separate from using them)
            function handleDiscardItem(itemId, context = {}) {
                hideCombatBoard(); // Unmount React components before showing new modal
                processAllItemEffects({ trigger: 'on_discard', discardItemId: itemId, ...context });
            }
window.handleDiscardItem = handleDiscardItem;
window.handleUseItem = handleUseItem;

// Example: Call after pigman reference
function handlePigmanRef() {
    hideCombatBoard(); // Unmount React components before showing new modal
    processAllItemEffects({ trigger: 'during_ref_pigman' });
    // ...rest of pigman logic
}
window.handlePigmanRef = handlePigmanRef;

export { 
    initializePlayer, 
    startDungeonLevel, 
    handleRoom, 
    updatePlayerStatsWithItems as updatePlayerStats, 
    restoreGameUIFromState, 
    logEvent, 
    handleUseItem
};
