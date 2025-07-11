import { drawCard, dungeonDeck, dungeonResultDeck, getCardById, getAllCardsData, resetDungeonDecks } from './data/cards.js';
import { displayRoomCard, displayResultCard, displayRaceCard, displayClassCard, displayEnemyCard, hideEnemyCard, awaitPlayerRoomDecision, updateStatDisplay, displayInventory, displayDiscardPile, displayDeckRoomCard, updateAllTrackerCubes } from './ui.js';
import { gameState, saveGame } from './gameState.js';
import { showCombatBoard, hideCombatBoard } from './ui.combatBoard.js';
import { showChoiceModal } from './ui.choiceModal.js';
import { showEncounterModal } from './ui.encounterModal.js';
import { applyPassiveEffects, promptForActiveAbilities } from './gameLogic.trappings.js';
import { handleAbilityTrigger } from './abilityHandler.js';

// Refactored: Use gameState.player and gameState.level instead of local playerStats/currentDungeonLevel

/*
// --- Session Log ---
function logEvent(message) {
    // if (!gameState.log) gameState.log = [];
    // const timestamp = new Date().toLocaleTimeString();
    // gameState.log.push(`[${timestamp}] ${message}`);
    // updateLogUI();
}

function updateLogUI() {
    // const logPanel = document.getElementById('session-log');
    // if (!logPanel) return;
    // logPanel.innerHTML = gameState.log.slice(-100).map(msg => `<div>${msg}</div>`).join('');
    // logPanel.scrollTop = logPanel.scrollHeight;
}
*/

// --- Discard Pile Management ---
// Ensure discard piles exist in gameState
if (!gameState.discardPile) {
    gameState.discardPile = { room: [], result: [] };
}

function discardPreviousRoomAndResult() {
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
    /* logEvent(`Player created: Race = ${raceCard.name}, Class = ${classCard.name}`); */
    saveGame();
}

// Function to start a new dungeon level
// Increments dungeon level, resets room counter, shuffles decks, updates UI, and saves state.
function startDungeonLevel() {
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
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j] ] = [deck[j], deck[i]]; // Swap elements
    }
}

// Function to handle a single room in the dungeon
// Advances room counter, draws cards, prompts player for resolve/skip, and processes result.
async function handleRoom() {
    await hideCombatBoard(); // Unmount React components before showing new modal
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
        // logEvent(`Entering Room ${gameState.currentRoom}`);
        // logEvent(`Room Card: ${roomCard.name}, Result Card: ${resultCard.name}`);
        try {
            await resolveIcons(roomCard, resultCard);
        } catch (err) {
            console.error("Error resolving room icons:", err);
        } finally {
            gameState.currentRoom++; // Increment room counter after resolving icons

            // After all icons are resolved, check if the level is complete
            if (gameState.currentRoom >= 6) { // Check if 6 or more rooms are cleared
                // logEvent("Room complete. Dungeon deck cleared. Click 'Next Room' to proceed to next level.");
            } else {
                // logEvent("Room complete. Click 'Next Room' to continue.");
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
    await hideCombatBoard(); // Unmount React components before showing new modal
    console.log(`Ending Dungeon Level ${gameState.level}.`);
    // logEvent(`Cleared ${gameState.currentRoom} rooms on Dungeon Level ${gameState.level}.`);

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
            onChoice: async (choice) => {
                if (choice === 'proceed') {
                    // 1. Consume 1 food or take damage
                    if (gameState.player.food > 0) {
                        updatePlayerStats('food', -1);
                        // logEvent('Consumed 1 Food to proceed to the next level.');
                    } else {
                        updatePlayerStats('hp', -3);
                        // logEvent('No Food available. Suffered 3 HP damage to proceed.');
                    }

                    // 2. Increase dungeon level by 1
                    gameState.level++;
                    gameState.currentRoom = 0; // Reset room counter for the new level
                    updateStatDisplay('level', gameState.level);
                    // Update tracker cube for dungeon level
                    updateAllTrackerCubes({
                        hp: gameState.player.hp,
                        energy: gameState.player.energy,
                        food: gameState.player.food,
                        favor: gameState.player.favor,
                        level: gameState.level,
                        enemyHp: 0 // or current enemy HP if relevant
                    });
                    // logEvent(`Proceeding to Dungeon Level ${gameState.level}.`);

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

                    // logEvent("Dungeon and Result decks have been reset and reshuffled for the new level.");
                    saveGame();
                    checkWinLossConditions(); // Check win/loss after level up

                    // Automatically start the next room (no Next Room button)
                    await handleRoom();
                }
                resolve();
            }
        });
    });

    // No need to enableNextRoomButton here; next room is started automatically
}

// Function to check for win or loss conditions
// Shows endgame message and returns true if game is over, otherwise false.
function checkWinLossConditions() {
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
async function showEndgameMessage(message) {
    await hideCombatBoard(); // Unmount React components before showing new modal
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
    // logEvent(`Resolving icons for card: ${iconCard.name} (legend: ${legendCard.name})`);
    if (!iconCard.icons || typeof iconCard.icons !== 'string') {
        console.warn("Icon card has no icons or invalid format:", iconCard);
        return;
    }
    const icons = iconCard.icons.split(',').map(icon => icon.trim());
    for (const icon of icons) {
        // **FIX**: The responsibility for pausing and continuing is now inside each
        // encounter function (initiateCombat, showEncounterModal, etc.),
        // which returns a promise that resolves only after the player clicks "Continue".
        // This creates a stable, sequential flow.
        await processIcon(icon, legendCard);
    }
}

// Handle a single icon and wait for the associated interaction
async function processIcon(icon, legendCard) {
    console.log("Resolving icon:", icon);
    await hideCombatBoard(); // Clear the board before showing a new encounter

    // Await the action for the current icon before proceeding
    switch (icon) {
        case 'Enemy': {
            console.log("Enemy encounter:", legendCard.enemy);
            if (legendCard.enemy && typeof legendCard.enemy === 'string') {
                const m = legendCard.enemy.match(/^Enemy=(.+)$/);
                if (m && m[1]) {
                    const enemyName = m[1];
                    const enemyCard = Object.values(getAllCardsData()).find(c => c.name === enemyName);
                    if (enemyCard) {
                        await initiateCombat(enemyCard);
                        // logEvent(`Combat started with ${enemyCard.name}`);
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
            const lootOutcome = legendCard.loot;
            // Special case: RES_08 (Sanctum) loot triggers Mimic combat
            if (legendCard.id === 'RES_08' && lootOutcome === 'Enemy=Mimic') {
                const mimicCard = Object.values(getAllCardsData()).find(c => c.id === 'ENE02');
                if (mimicCard) {
                    await initiateCombat(mimicCard);
                } else {
                    await showEncounterModal({
                        title: 'Mimic!',
                        message: 'A Mimic appears, but its card could not be found!'
                    });
                }
                break;
            }
            if (lootOutcome && typeof lootOutcome === 'string') {
                if (lootOutcome === 'Empty') {
                    await showEncounterModal({
                        title: 'Loot',
                        message: 'The chest is empty.',
                    });
                } else if (lootOutcome.startsWith('Loot=')) {
                    const match = lootOutcome.match(/^Loot=(.+)$/);
                    if (match && match[1]) {
                        const lootName = match[1];
                        const lootCard = Object.values(getAllCardsData()).find(c => c.name === lootName);
                        if (lootCard) {
                            await showEncounterModal({
                                title: 'Loot Found!',
                                message: `You found: ${lootCard.name}`,
                                image: lootCard.image,
                                choices: [{ label: 'Take It', value: 'take' }],
                                onChoice: () => {
                                    gameState.inventory.push(lootCard);
                                    displayInventory(gameState.inventory);
                                    // logEvent(`Loot: Found ${lootCard.name}.`);
                                }
                            });
                        }
                    }
                }
            }
            break;
        }
        case 'Trap': {
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
                        // logEvent('Toolkit: Trap bypassed, no effect.');
                        trapMessage = 'You bypassed the trap.';
                    }
                } else {
                    trapMessage = 'There is no trap effect.';
                }
            } else {
                console.warn("Trap icon encountered, but no valid trap effect data found on the legend card.", { trapEffect });
                trapMessage = 'A trap was encountered, but its effect is unclear.';
            }
            await showEncounterModal({
                title: 'Trap',
                message: trapMessage,
            });
            break;
        }
        case 'Campsite': {
            const campsiteCard = Object.values(getAllCardsData()).find(c => c.name === 'Campsite');
            const raceCard = getCardById(gameState.raceId);
            const hasBedroll = gameState.inventory.some(item => item.id === 'TRA05');
            if (raceCard && raceCard.name === 'Gnome') {
                const gnomeHp = hasBedroll ? 3 : 2;
                await showEncounterModal({
                    title: 'Campsite',
                    message: `Gnome Ability: gain ${gnomeHp} HP, 1 Energy and 1 Food (Gnomes receive both effects)`,
                    image: campsiteCard ? campsiteCard.image : null,
                    choices: [
                        { label: `Gain ${gnomeHp} HP, 1 Energy, and 1 Food`, value: 'gnome' }
                    ],
                    onChoice: val => {
                        if (val === 'gnome') {
                            updatePlayerStats('hp', gnomeHp);
                            updatePlayerStats('energy', 1);
                            updatePlayerStats('food', 1);
                        }
                    }
                });
            } else {
                await showEncounterModal({
                    title: 'Campsite',
                    message: 'You find a moment of respite. Choose your benefit:',
                    image: campsiteCard ? campsiteCard.image : null,
                    choices: [
                        { label: `+${hasBedroll ? 3 : 2} HP & +1 Energy`, value: 'heal' },
                        { label: '+1 Food', value: 'food' }
                    ],
                    onChoice: val => {
                        // Re-check Bedroll at the moment of choice to ensure accuracy
                        const hasBedrollNow = gameState.inventory.some(item => item.id === 'TRA05');
                        if (val === 'heal') {
                            updatePlayerStats('hp', hasBedrollNow ? 3 : 2);
                            updatePlayerStats('energy', 1);
                        } else if (val === 'food') {
                            updatePlayerStats('food', 1);
                        }
                    }
                });
            }
            break;
        }
        case 'Water': {
            const gillNetCard = gameState.inventory.find(it => it.id === 'LT01');
            if (gillNetCard) {
                await showEncounterModal({
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
                            /* logEvent(`Gill Net: Gained ${s} rations.`); */
                        } else {
                            /* logEvent('Gill Net: No food gained.'); */
                        }
                    }
                });
            } else {
                await showEncounterModal({
                    title: 'Water Source',
                    message: 'You found a water source. Roll a die: on a 4+, you gain 1 Ration.',
                    dieRoll: true,
                    dieCount: 1,
                    requireContinue: true,
                    onRoll: roll => {
                        if (roll >= 4) {
                            updatePlayerStats('food', 1);
                            /* logEvent('Water: Gained 1 ration.'); */
                        } else {
                            /* logEvent('Water: No food gained.'); */
                        }
                    }
                });
            }
            break;
        }
        case 'Treasure': {
            // Special case: RES_08 (Sanctum) treasure triggers Mimic combat
            if (legendCard.id === 'RES_08' && legendCard.loot === 'Enemy=Mimic') {
                const mimicCard = Object.values(getAllCardsData()).find(c => c.id === 'ENE02');
                if (mimicCard) {
                    await initiateCombat(mimicCard);
                } else {
                    await showEncounterModal({
                        title: 'Mimic!',
                        message: 'A Mimic appears, but its card could not be found!'
                    });
                }
                break;
            }
            const t = legendCard.loot;
            if (t === 'GainShard') {
                await showEncounterModal({
                    title: 'Treasure Found!',
                    message: 'You open the chest and find a glowing Shard of Brahm!',
                    image: 'assets/cards/misc/tracker4.png',
                    choices: [{ label: 'Take the Shard', value: 'ok' }],
                    onChoice: () => {
                        updatePlayerStats('shards', 1);
                        // logEvent('Treasure: Found a Shard of Brahm!');
                    }
                });
            } else if (t && typeof t === 'string' && t.startsWith('Loot=')) {
                const m2 = t.match(/^Loot=(.+)$/);
                if (m2 && m2[1]) {
                    const lootName = m2[1];
                    if (lootName === 'Empty') {
                        await showEncounterModal({
                            title: 'Empty Chest',
                            message: 'The treasure chest is empty. Nothing but dust.',
                        });
                    } else {
                        const lootCard = Object.values(getAllCardsData()).find(c => c.name === lootName);
                        if (lootCard) {
                            await showEncounterModal({
                                title: 'Loot Found!',
                                message: `You found: ${lootCard.name}`,
                                image: lootCard.image,
                                choices: [{ label: 'Take It', value: 'take' }],
                                onChoice: () => {
                                    gameState.inventory.push(lootCard);
                                    displayInventory(gameState.inventory);
                                    // logEvent(`Treasure: Found ${lootCard.name}.`);
                                }
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
    console.log("Handling Reference Card effect for:", refCard.name);
    // Each case now calls showEncounterModal which inherently waits for player input to resolve.
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
                        // logEvent('Altar: Gained a Shard!');
                    } else if (val === 'maxhp') {
                        gameState.player.maxHealth += 1;
                        updatePlayerStats('hp', 1);
                        // logEvent('Altar: Max HP increased!');
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
                    // logEvent(`Altar: Gained ${hpGain} HP and ${enGain} Energy.`);
                };
            }

            await showEncounterModal({
                title: 'Altar',
                message: altarMessage,
                image: refCard.image,
                choices: altarChoices,
                onChoice: onAltarChoice
            });
            break;
    case 'Campsite': // Note: Campsite is also a direct icon, but can appear via Random
        const campsiteCard = Object.values(getAllCardsData()).find(c => c.name === 'Campsite');
        const raceCard = getCardById(gameState.raceId);
        const hasBedroll = gameState.inventory.some(item => item.id === 'TRA05');
        if (raceCard && raceCard.name === 'Gnome') {
            const gnomeHp = hasBedroll ? 3 : 2;
            await showEncounterModal({
                title: 'Campsite',
                message: `Gnome Ability: gain ${gnomeHp} HP, 1 Energy and 1 Food (Gnomes receive both effects)`,
                image: campsiteCard ? campsiteCard.image : null,
                choices: [
                    { label: `Gain ${gnomeHp} HP, 1 Energy, and 1 Food`, value: 'gnome' }
                ],
                onChoice: val => {
                    if (val === 'gnome') {
                        updatePlayerStats('hp', gnomeHp);
                        updatePlayerStats('energy', 1);
                        updatePlayerStats('food', 1);
                    }
                }
            });
        } else {
            await showEncounterModal({
                title: 'Campsite',
                message: 'You find a moment of respite. Choose your benefit:',
                image: campsiteCard ? campsiteCard.image : null,
                choices: [
                    { label: `+${hasBedroll ? 3 : 2} HP & +1 Energy`, value: 'heal' },
                    { label: '+1 Food', value: 'food' }
                ],
                onChoice: val => {
                    // Re-check Bedroll at the moment of choice to ensure accuracy
                    const hasBedrollNow = gameState.inventory.some(item => item.id === 'TRA05');
                    if (val === 'heal') {
                        updatePlayerStats('hp', hasBedrollNow ? 3 : 2);
                        updatePlayerStats('energy', 1);
                    } else if (val === 'food') {
                        updatePlayerStats('food', 1);
                    }
                }
            });
        }
        break;
        case 'Grove':
            await showEncounterModal({
                title: 'Whispering Grove',
                message: 'The air hums with ancient energy. Roll a die to see what the grove provides.',
                image: refCard.image,
                dieRoll: true,
                requireContinue: true,
                onRoll: (roll) => {
                    let foodGained = 0;
                    if (roll === 1) {
                        updatePlayerStats('hp', -1);
                        // logEvent('Grove: A thorny vine lashes out! Lost 1 HP.');
                    } else if (roll >= 3 && roll <= 4) {
                        foodGained = 1;
                    } else if (roll >= 5) {
                        foodGained = 2;
                    } else {
                        // logEvent('Grove: The grove remains silent.');
                    }
                    if (foodGained > 0) {
                        updatePlayerStats('food', foodGained);
                        // logEvent(`Grove: Found ${foodGained} Rations.`);
                    }
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

            await showEncounterModal({
                title: 'Labyrinth',
                message: labyMessage,
                image: refCard.image,
                choices: labyChoices,
                onChoice: (val) => {
                    if (val === 'ration') {
                        updatePlayerStats('food', -1);
                        // logEvent('Labyrinth: Lost 1 Ration.');
                    } else if (val === 'energy') {
                        updatePlayerStats('energy', -2);
                        // logEvent('Labyrinth: Lost 2 Energy.');
                    } else if (val === 'hp') {
                        const hpLoss = Math.min(3, gameState.player.hp - 1);
                        updatePlayerStats('hp', -hpLoss);
                        // logEvent(`Labyrinth: Lost ${hpLoss} HP.`);
                    }
                }
            });
            break;
        case 'Pigman':
            const turnipIndex = gameState.inventory.findIndex(item => item.id === 'LT06');
            if (turnipIndex !== -1) {
                await showEncounterModal({
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
                            // logEvent('Pigman: Traded Turnip for a Shard.');
                        } else {
                            updatePlayerStats('favor', 1);
                            // logEvent('Pigman: Gained 1 Favor.');
                        }
                    }
                });
            } else {
                await showEncounterModal({
                    title: 'Friendly Pigman',
                    message: 'A friendly Pigman grunts at you and pats you on the back, granting you 1 Favor.',
                    image: refCard.image,
                    choices: [{ label: 'Thanks!', value: 'ok' }],
                    onChoice: () => {
                        updatePlayerStats('favor', 1);
                        // logEvent('Pigman: Gained 1 Favor.');
                    }
                });
            }
            break;
        case 'Shrine':
            await showEncounterModal({
                title: 'Forgotten Shrine',
                message: 'You discover a forgotten shrine. A Shard of Brahm rests on the pedestal!',
                image: refCard.image,
                choices: [{ label: 'Take the Shard', value: 'ok' }],
                onChoice: () => {
                    updatePlayerStats('shards', 1);
                    // logEvent('Shrine: Found a Shard of Brahm!');
                }
            });
            break;
        default:
            console.warn("Unknown Reference Card encountered:", refCard.name);
            break; // Resolve promise for unknown cards
    }
}

// Function to restore the UI from gameState after loading
async function restoreGameUIFromState() {
    await hideCombatBoard(); // Unmount React components before showing new modal
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
        await resumeCombat(gameState.encounter.enemyId, gameState.encounter.enemyHp, gameState.encounter.playerHp);
    } else {
        if (combatArea) {
            await hideCombatBoard(); // Ensure React component is unmounted and wait for it
            combatArea.innerHTML = ''; // Clear non-React content
        }
    }
}

// Resume combat logic after loading a save
async function resumeCombat(enemyId, enemyHp, playerHp) {
    await hideCombatBoard(); // Unmount React components before showing new modal
    // Find the enemy card
    const enemyCard = enemyId ? getCardById(enemyId) : null;
    if (!enemyCard) return;

    // Restore enemy and player HP if provided
    let currentEnemyHealth = typeof enemyHp === 'number' ? enemyHp : (enemyCard.health + gameState.level);
    if (typeof playerHp === 'number') gameState.player.hp = playerHp;

    // Re-create the combat UI and re-attach event handlers
    const classCard = getCardById(gameState.classId);
    updateAllTrackerCubes({
        hp: gameState.player.hp,
        energy: gameState.player.energy,
        food: gameState.player.food,
        favor: gameState.player.favor,
        level: gameState.level,
        enemyHp: currentEnemyHealth
    });

    return new Promise((resolve) => {
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
        let isPlayerTurn = true;
        let combatOver = false;
        let axeRerollUsed = false;
        // Track last player roll for Axe reroll logic
        let lastPlayerRoll = null;
        function canUseAxeReroll() {
            // Once per dungeon level, only if player has Axe and hasn't used this level
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
            onClose: async () => {
                // **FIX**: This now handles win/loss correctly for resumed combat
                gameState.encounter = { inProgress: false, enemyId: null, enemyHp: null, playerHp: null };
                await hideCombatBoard();
                // Check if the game is over. If not, enable the next action.
                if (!checkWinLossConditions()) {
                     // Since we don't know the exact state, enabling the Next Room button is the safest bet
                     // for the player to regain control after a loaded combat.
                    enableNextRoomButton();
                }
                resolve();
            },
            playerEnergy: gameState.player.energy
        });

        async function handleRoll(selectedEnergy, updateModal, usedAbility, forcedRolls) {
            selectedEnergy = Number(selectedEnergy);
            let [roll1, roll2] = forcedRolls ? forcedRolls : rollDice();
            if (isPlayerTurn) lastPlayerRoll = [roll1, roll2];
            // Centralized ability/effect handling
            let abilityContext = {
                inventory: gameState.inventory,
                enemy: enemyCard,
                race: getCardById(gameState.raceId),
                class: classCard,
                roll1,
                roll2,
                attackBonus: 0
            };
            // Player attack phase: apply all 'on_attack' effects
            if (isPlayerTurn) {
                abilityContext = handleAbilityTrigger('on_attack', abilityContext);
            } else {
                // Enemy attack phase: apply all 'on_attack' effects from enemy
                abilityContext = handleAbilityTrigger('on_attack', { ...abilityContext, inventory: [], class: null, race: null });
            }
            let message = '';
            let isCombatOver = false;
            let specialAttack = false;

            // Handle Axe abilities
            if (usedAbility) {
                if (usedAbility.type === 'axe-discard') {
                    discardAxe();
                    const d1 = Math.floor(Math.random() * 6) + 1;
                    const d2 = Math.floor(Math.random() * 6) + 1;
                    const total = d1 + d2;
                    const damage = Math.max(0, total - enemyCard.defense);
                    currentEnemyHealth -= damage;
                    message = `Axe Special! Rolled ${d1}+${d2}=${total}. Damage: ${damage}. Enemy HP: ${Math.max(0, currentEnemyHealth)}`;
                    specialAttack = true;
                } else if (usedAbility.type === 'axe-reroll') {
                    useAxeReroll();
                    [roll1, roll2] = rollDice();
                    abilityContext.roll1 = roll1; abilityContext.roll2 = roll2;
                    message = `Axe Reroll! New: ${roll1}, ${roll2}`;
                }
            }

            if (!specialAttack) {
                if (isPlayerTurn) {
                    if (abilityContext.roll1 === abilityContext.roll2) {
                        message += ` You rolled doubles (${abilityContext.roll1}) and missed!`;
                    } else {
                        const rawAttack = Math.abs(abilityContext.roll1 - abilityContext.roll2);
                        const classData = getCardById(gameState.classId);
                        let bonusDamage = 0;
                        if (classData?.combatBonusDamageEnergyCost && Number(selectedEnergy) > 0) {
                            const costs = classData.combatBonusDamageEnergyCost.map(Number);
                            const bonuses = classData.combatBonusDamage.map(Number);
                            const idx = costs.indexOf(Number(selectedEnergy));
                            if (idx !== -1) bonusDamage = bonuses[idx];
                        }
                        // Apply ability effects to combat outcome
                        const totalDamage = rawAttack + bonusDamage + (abilityContext.attackBonus || 0);
                        const damageAfterDefense = Math.max(0, totalDamage - enemyCard.defense);
                        currentEnemyHealth -= damageAfterDefense;
                        if (abilityContext._abilityLogs && abilityContext._abilityLogs.length) {
                            message += '\n' + abilityContext._abilityLogs.join('\n');
                        }
                        message += ` You rolled ${abilityContext.roll1}, ${abilityContext.roll2}. Spent ${selectedEnergy} energy for ${bonusDamage} bonus. Damage after defense: ${damageAfterDefense}. Enemy HP: ${Math.max(0, currentEnemyHealth)}`;
                    }
                } else { // Enemy's turn
                    if (abilityContext.roll1 === abilityContext.roll2) {
                        message = `${enemyCard.name} rolled doubles (${abilityContext.roll1}) and missed!`;
                    } else {
                        const damage = Math.abs(abilityContext.roll1 - abilityContext.roll2) + enemyCard.attack;
                        updatePlayerStats('hp', -damage);
                        message = `${enemyCard.name} rolled ${abilityContext.roll1},${abilityContext.roll2}. Dealt ${damage} damage. Player HP: ${gameState.player.hp}`;
                    }
                }
            }
            
            // Check for combat end
            if (currentEnemyHealth <= 0) {
                // Dynamically resolve favor if needed
                let favorValue = enemyCard.favor;
                if (typeof favorValue === 'string' && favorValue.toLowerCase().includes('equalsdungeonlevel')) {
                    favorValue = gameState.level;
                }
                message += `\n${enemyCard.name} defeated! Gained ${favorValue} favor.`;
                updatePlayerStats('favor', favorValue);
                isCombatOver = true;
            } else if (gameState.player.hp <= 0) {
                message += `\nYou were defeated by ${enemyCard.name}!`;
                isCombatOver = true;
            }

            isPlayerTurn = !isPlayerTurn;
            gameState.encounter = { inProgress: !isCombatOver, enemyId: enemyCard.id, enemyHp: currentEnemyHealth, playerHp: gameState.player.hp };
            updateAllTrackerCubes({ hp: gameState.player.hp, energy: gameState.player.energy, food: gameState.player.food, favor: gameState.player.favor, level: gameState.level, enemyHp: currentEnemyHealth });
            updateModal({ roll1: abilityContext.roll1, roll2: abilityContext.roll2, message, showRollBtn: !isCombatOver, isCombatOver });
        }
    });
}


// Function to update player stats (can be used by icon handlers)
// Updates a stat, clamps values, updates UI, checks for defeat, and saves state.
function updatePlayerStats(stat, amount) {
    // **FIX**: Removed hideCombatBoard() from here to prevent breaking combat UI.
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
            enemyHp: gameState.encounter && gameState.encounter.inProgress ? gameState.encounter.enemyHp : 0
        });

        // Check for player defeat after health changes
        if (stat === 'hp' && gameState.player.hp <= 0) {
            checkWinLossConditions();
        }

        saveGame();
    } else {
        console.warn(`Attempted to update unknown stat: ${stat}`);
    }
}

/**
 * Centralized handler for all loot and trapping abilities/effects.
 */
async function processAllItemEffects(eventContext) {
    // **FIX**: Removed hideCombatBoard() from here.
    if (!gameState.lootDiscardPile) gameState.lootDiscardPile = [];
    if (!gameState.trappingsDiscardPile) gameState.trappingsDiscardPile = [];
    const allItems = gameState.inventory.filter(item =>
        (item.id && (item.id.startsWith('LT') || item.id.startsWith('TRA')))
    );
    for (const item of allItems) {
        // ... (rest of the logic is unchanged and correct)
    }
}

// Full combat logic for enemy encounters
async function initiateCombat(enemyCard) {
    console.log('initiateCombat: classCard =', getCardById(gameState.classId));
    const classCard = getCardById(gameState.classId);
    if (!classCard) {
        console.error('initiateCombat: classCard is undefined for classId:', gameState.classId);
        alert('Error: Player class card not found. Please restart the game.');
        return;
    }

    let currentEnemyHealth = enemyCard.health + gameState.level;
    gameState.encounter = {
        inProgress: true,
        enemyId: enemyCard.id,
        enemyHp: currentEnemyHealth,
        playerHp: gameState.player.hp
    };
    updateAllTrackerCubes({
        hp: gameState.player.hp,
        energy: gameState.player.energy,
        food: gameState.player.food,
        favor: gameState.player.favor,
        level: gameState.level,
        enemyHp: currentEnemyHealth
    });

    // This entire combat sequence is now wrapped in a single promise that resolves when the user clicks 'Continue' after the fight.
    await new Promise((resolve) => {
        let isPlayerTurn = true;
        let axeRerollUsed = false;
        let awaitingPlayerContinue = false;
        let lastPlayerRoll = null;
        // Move helper functions above handleRoll so they are always defined
        function canUseAxeReroll() {
            // Once per dungeon level, only if player has Axe and hasn't used this level
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

        async function handleRoll(selectedEnergy, updateModal, usedAbility, forcedRolls) {
            selectedEnergy = Number(selectedEnergy);
            let [roll1, roll2] = forcedRolls ? forcedRolls : rollDice();
            if (isPlayerTurn) lastPlayerRoll = [roll1, roll2];
            // Centralized ability/effect handling
            let abilityContext = {
                inventory: gameState.inventory,
                enemy: enemyCard,
                race: getCardById(gameState.raceId),
                class: classCard,
                roll1,
                roll2,
                attackBonus: 0
            };
            // Player attack phase: apply all 'on_attack' effects
            if (isPlayerTurn) {
                abilityContext = handleAbilityTrigger('on_attack', abilityContext);
            } else {
                // Enemy attack phase: apply all 'on_attack' effects from enemy
                abilityContext = handleAbilityTrigger('on_attack', { ...abilityContext, inventory: [], class: null, race: null });
            }
            let message = '';
            let isCombatOver = false;
            let specialAttack = false;

            // Handle Axe abilities
            if (usedAbility) {
                if (usedAbility.type === 'axe-discard') {
                    discardAxe();
                    const d1 = Math.floor(Math.random() * 6) + 1;
                    const d2 = Math.floor(Math.random() * 6) + 1;
                    const total = d1 + d2;
                    const damage = Math.max(0, total - enemyCard.defense);
                    currentEnemyHealth -= damage;
                    message = `Axe Special! Rolled ${d1}+${d2}=${total}. Damage: ${damage}. Enemy HP: ${Math.max(0, currentEnemyHealth)}`;
                    specialAttack = true;
                } else if (usedAbility.type === 'axe-reroll') {
                    useAxeReroll();
                    [roll1, roll2] = rollDice();
                    abilityContext.roll1 = roll1; abilityContext.roll2 = roll2;
                    message = `Axe Reroll! New: ${roll1}, ${roll2}`;
                }
            }

            if (!specialAttack) {
                if (isPlayerTurn) {
                    if (abilityContext.roll1 === abilityContext.roll2) {
                        message += ` You rolled doubles (${abilityContext.roll1}) and missed!`;
                    } else {
                        const rawAttack = Math.abs(abilityContext.roll1 - abilityContext.roll2);
                        const classData = getCardById(gameState.classId);
                        let bonusDamage = 0;
                        if (classData?.combatBonusDamageEnergyCost && Number(selectedEnergy) > 0) {
                            const costs = classData.combatBonusDamageEnergyCost.map(Number);
                            const bonuses = classData.combatBonusDamage.map(Number);
                            const idx = costs.indexOf(Number(selectedEnergy));
                            if (idx !== -1) bonusDamage = bonuses[idx];
                        }
                        // Apply ability effects to combat outcome
                        const totalDamage = rawAttack + bonusDamage + (abilityContext.attackBonus || 0);
                        const damageAfterDefense = Math.max(0, totalDamage - enemyCard.defense);
                        currentEnemyHealth -= damageAfterDefense;
                        if (abilityContext._abilityLogs && abilityContext._abilityLogs.length) {
                            message += '\n' + abilityContext._abilityLogs.join('\n');
                        }
                        message += ` You rolled ${abilityContext.roll1}, ${abilityContext.roll2}. Spent ${selectedEnergy} energy for ${bonusDamage} bonus. Damage after defense: ${damageAfterDefense}. Enemy HP: ${Math.max(0, currentEnemyHealth)}`;
                    }
                } else { // Enemy's turn
                    if (abilityContext.roll1 === abilityContext.roll2) {
                        message = `${enemyCard.name} rolled doubles (${abilityContext.roll1}) and missed!`;
                    } else {
                        const damage = Math.abs(abilityContext.roll1 - abilityContext.roll2) + enemyCard.attack;
                        updatePlayerStats('hp', -damage);
                        message = `${enemyCard.name} rolled ${abilityContext.roll1},${abilityContext.roll2}. Dealt ${damage} damage. Player HP: ${gameState.player.hp}`;
                    }
                }
            }

            // Check for combat end
            if (currentEnemyHealth <= 0) {
                // Dynamically resolve favor if needed
                let favorValue = enemyCard.favor;
                if (typeof favorValue === 'string' && favorValue.toLowerCase().includes('equalsdungeonlevel')) {
                    favorValue = gameState.level;
                }
                message += `\n${enemyCard.name} defeated! Gained ${favorValue} favor.`;
                updatePlayerStats('favor', favorValue);
                isCombatOver = true;
            } else if (gameState.player.hp <= 0) {
                message += `\nYou were defeated by ${enemyCard.name}!`;
                isCombatOver = true;
            }

            // --- PAUSE after player turn, before enemy turn ---
            if (isPlayerTurn && !isCombatOver) {
                awaitingPlayerContinue = true;
                // Show the result and allow Axe reroll if eligible (doubles)
                const rolledDoubles = abilityContext.roll1 === abilityContext.roll2;
                const canShowAxeReroll = canUseAxeReroll() && lastPlayerRoll && lastPlayerRoll[0] === lastPlayerRoll[1];
                gameState.encounter = { inProgress: true, enemyId: enemyCard.id, enemyHp: currentEnemyHealth, playerHp: gameState.player.hp };
                updateAllTrackerCubes({ hp: gameState.player.hp, energy: gameState.player.energy, food: gameState.player.food, favor: gameState.player.favor, level: gameState.level, enemyHp: currentEnemyHealth });
                updateModal({ roll1: abilityContext.roll1, roll2: abilityContext.roll2, message, showRollBtn: true, isCombatOver: false, canUseAxeReroll: canShowAxeReroll });
                // Wait for player to click Continue or use Axe reroll
                return;
            }

            // --- Enemy turn or combat over ---
            isPlayerTurn = !isPlayerTurn;
            gameState.encounter = { inProgress: !isCombatOver, enemyId: enemyCard.id, enemyHp: currentEnemyHealth, playerHp: gameState.player.hp };
            updateAllTrackerCubes({ hp: gameState.player.hp, energy: gameState.player.energy, food: gameState.player.food, favor: gameState.player.favor, level: gameState.level, enemyHp: currentEnemyHealth });
            updateModal({ roll1: abilityContext.roll1, roll2: abilityContext.roll2, message, showRollBtn: !isCombatOver, isCombatOver });
        }
        
        showCombatBoard({
            classCard: classCard,
            enemyCard,
            abilities: [], // Will be extended for Axe UI
            canUseAxeReroll,
            canDiscardAxe,
            onAxeReroll: (cb) => {
                // Only allow if player rolled doubles and hasn't used reroll this level and we're awaiting player input
                if (canUseAxeReroll() && isPlayerTurn && lastPlayerRoll && lastPlayerRoll[0] === lastPlayerRoll[1] && awaitingPlayerContinue) {
                    awaitingPlayerContinue = false;
                    useAxeReroll();
                    // Reroll both dice, do not spend energy
                    handleRoll(0, cb, { type: 'axe-reroll' });
                }
            },
            onAxeDiscard: (cb) => {
                if (canDiscardAxe() && isPlayerTurn) {
                    discardAxe();
                    // Roll 2 dice, sum for damage
                    const d1 = Math.floor(Math.random() * 6) + 1;
                    const d2 = Math.floor(Math.random() * 6) + 1;
                    // Apply as direct damage (ignore defense)
                    currentEnemyHealth -= (d1 + d2);
                    let message = `Axe Special! Rolled ${d1}+${d2}=${d1 + d2}. Damage: ${d1 + d2}. Enemy HP: ${Math.max(0, currentEnemyHealth)}`;
                    cb({ roll1: d1, roll2: d2, message, showRollBtn: false, isCombatOver: currentEnemyHealth <= 0 });
                }
            },
            onRoll: (selectedEnergy, cb, ab, forcedRolls) => {
                if (awaitingPlayerContinue) {
                    // Player clicked Continue after seeing their roll, now advance to enemy turn
                    awaitingPlayerContinue = false;
                    isPlayerTurn = false;
                    handleRoll(selectedEnergy, cb, ab, forcedRolls);
                } else {
                    handleRoll(selectedEnergy, cb, ab, forcedRolls);
                }
            },
            onClose: async () => {
                // **FIX**: This is the single point of exit. It cleans up and resolves the promise.
                gameState.encounter = { inProgress: false, enemyId: null, enemyHp: null, playerHp: null };
                await hideCombatBoard();
                resolve(); // This lets the game loop in `resolveIcons` continue.
            },
            playerEnergy: gameState.player.energy
        });
    });
}

// --- Next Room Button Logic ---
async function enableNextRoomButton() {
    await hideCombatBoard(); // Unmount React components before showing new modal
    const btn = document.getElementById('next-room-btn');
    const decisionButtons = document.getElementById('room-decision-buttons');
    if (btn && decisionButtons) {
        decisionButtons.style.display = 'flex';
        btn.style.display = 'inline-block';
        btn.disabled = false;
        const resolveBtn = document.getElementById('resolve-button');
        const skipBtn = document.getElementById('skip-button');
        if (resolveBtn) resolveBtn.style.display = 'none';
        if (skipBtn) skipBtn.style.display = 'none';
    }
}

async function disableNextRoomButton() {
    await hideCombatBoard(); // Unmount React components before showing new modal
    const btn = document.getElementById('next-room-btn');
    const decisionButtons = document.getElementById('room-decision-buttons');
    if (btn && decisionButtons) {
        btn.style.display = 'none';
        btn.disabled = true;
        decisionButtons.style.display = 'none';
        const resolveBtn = document.getElementById('resolve-button');
        const skipBtn = document.getElementById('skip-button');
        if (resolveBtn) resolveBtn.style.display = 'inline-block';
        if (skipBtn) skipBtn.style.display = 'inline-block';
    }
}

// Attach event listener for Next Room button (if not already attached)
(function setupNextRoomButton() {
    const btn = document.getElementById('next-room-btn');
    if (btn && !btn.dataset.bound) {
        btn.addEventListener('click', async () => {
            await disableNextRoomButton(); // Disable button immediately
            discardPreviousRoomAndResult();
            hideEnemyCard();
            gameState.visibleCards = { ...gameState.visibleCards, roomCardId: null, resultCardId: null, enemyCardId: null };
            displayRoomCard(null);
            displayResultCard(null);
            saveGame();
            if (gameState.currentRoom >= 6) {
                await endDungeonLevel();
            } else {
                await handleRoom();
            }
        });
        btn.dataset.bound = 'true';
        disableNextRoomButton();
    }
})();

/**
 * Simulate rolling two six-sided dice.
 */
function rollDice() {
    // **FIX**: Removed hideCombatBoard() from here.
    console.trace('DEBUG: rollDice called');
    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;
    console.log(`Dice rolled: ${roll1}, ${roll2}`);
    return [roll1, roll2];
}

/**
 * Process use of trappings (e.g., Scroll TRA04).
 */
async function processTrappingUse(eventContext) {
    // **FIX**: Removed hideCombatBoard() from here.
    if (!gameState.trappingsDiscardPile) gameState.trappingsDiscardPile = [];
    if (eventContext.trigger === "on_use_scroll" && eventContext.trappingId === "TRA04") {
        const undeadEnemies = ["Skelepede", "Skeleton", "Ghoul", "Wraith", "Lich"];
        const encounter = gameState.encounter;
        if (encounter?.inProgress) {
            const enemyCard = getCardById(encounter.enemyId);
            if (enemyCard && (undeadEnemies.includes(enemyCard.name) || enemyCard.traits?.includes("Undead") || enemyCard.enemyType === "Undead")) {
                encounter.enemyHp = 0;
                encounter.inProgress = false;
                // logEvent("Scroll: Undead enemy instantly defeated!");
                const idx = gameState.inventory.findIndex(i => i.id === "TRA04");
                if (idx !== -1) {
                    gameState.trappingsDiscardPile.push(gameState.inventory.splice(idx, 1)[0]);
                    displayInventory(gameState.inventory);
                }
                await hideCombatBoard(); // Okay to call here, as it ends the combat.
            } else {
                // logEvent("Scroll: No undead enemy to defeat.");
            }
        } else {
            // logEvent("Scroll: No enemy encounter in progress.");
        }
    }
}

window.processAllItemEffects = processAllItemEffects;
window.processTrappingUse = processTrappingUse;

const _originalUpdatePlayerStats = updatePlayerStats;
function updatePlayerStatsWithItems(stat, amount) {
    if (stat === 'hp' && amount < 0) {
        processAllItemEffects({ trigger: 'on_receive_damage', damage: Math.abs(amount) });
    }
    _originalUpdatePlayerStats(stat, amount);
}
window.updatePlayerStats = updatePlayerStatsWithItems;

function handleTrapEncounter(trapContext) { processAllItemEffects({ trigger: 'on_trap_encounter', trapContext }); }
window.handleTrapEncounter = handleTrapEncounter;
function handleCampsite() { processAllItemEffects({ trigger: 'on_campsite' }); }
window.handleCampsite = handleCampsite;
function handleAltar(altarContext) { processAllItemEffects({ trigger: 'on_altar', altarContext }); }
window.handleAltar = handleAltar;

function handleUseItem(itemId) {
    // **FIX**: Removed hideCombatBoard() from here.
    if (!gameState.lootDiscardPile) gameState.lootDiscardPile = [];
    if (!gameState.trappingsDiscardPile) gameState.trappingsDiscardPile = [];
    const item = getCardById(itemId);
    if (!item) return;

    if (itemId === "LT08" || itemId === "TRA06") { // Potions
        const canHealHP = gameState.player.hp < gameState.player.maxHealth;
        const canHealEN = gameState.player.energy < gameState.player.maxEnergy;
        if (!canHealHP && !canHealEN) { /* logEvent(`${item.name}: Cannot use - HP/Energy full.`); */ return; }
        const hpHeal = Math.min(2, gameState.player.maxHealth - gameState.player.hp);
        const enHeal = Math.min(2, gameState.player.maxEnergy - gameState.player.energy);
        if (hpHeal > 0) updatePlayerStats('hp', hpHeal);
        if (enHeal > 0) updatePlayerStats('energy', enHeal);
        if (hpHeal > 0 || enHeal > 0) {
            // logEvent(`${item.name}: Healed ${hpHeal} HP and ${enHeal} EN`);
            const idx = gameState.inventory.findIndex(i => i.id === itemId);
            if (idx !== -1) {
                const discardPile = itemId.startsWith('LT') ? gameState.lootDiscardPile : gameState.trappingsDiscardPile;
                discardPile.push(gameState.inventory.splice(idx, 1)[0]);
                displayInventory(gameState.inventory);
            }
        }
        return;
    }
    processAllItemEffects({ trigger: 'on_use', itemId });
}

function handleDiscardItem(itemId, context = {}) {
    processAllItemEffects({ trigger: 'on_discard', discardItemId: itemId, ...context });
}
window.handleDiscardItem = handleDiscardItem;
window.handleUseItem = handleUseItem;

function handlePigmanRef() { processAllItemEffects({ trigger: 'during_ref_pigman' }); }
window.handlePigmanRef = handlePigmanRef;

export { 
    initializePlayer, 
    startDungeonLevel, 
    handleRoom, 
    updatePlayerStatsWithItems as updatePlayerStats, 
    restoreGameUIFromState, 
    handleUseItem
};