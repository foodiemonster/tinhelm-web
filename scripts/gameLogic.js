import { drawCard, dungeonDeck, dungeonResultDeck, getCardById, getAllCardsData } from './data/cards.js';
import { displayRoomCard, displayResultCard, displayRaceCard, displayClassCard, displayEnemyCard, hideEnemyCard, awaitPlayerRoomDecision, updateStatDisplay, displayInventory, displayDiscardPile, displayDeckRoomCard, updateAllTrackerCubes } from './ui.js';
import { gameState, saveGame } from './gameState.js';
import { showCombatBoard, hideCombatBoard } from './ui.combatBoard.js';
import { showChoiceModal } from './ui.choiceModal.js';
import { applyPassiveEffects, promptForActiveAbilities } from './gameLogic.trappings.js';

// Refactored: Use gameState.player and gameState.level instead of local playerStats/currentDungeonLevel

// --- Session Log ---
function logEvent(message) {
    if (!gameState.log) gameState.log = [];
    const timestamp = new Date().toLocaleTimeString();
    gameState.log.push(`[${timestamp}] ${message}`);
    updateLogUI();
}

function updateLogUI() {
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
            image: raceCard.image,
            choices: availableTrappings.map(card => ({ label: card.name, value: card.id })),
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
        await resolveIcons(roomCard, resultCard);
        if (gameState.currentRoom === 6) {
            endDungeonLevel();
        } else {
            logEvent("Room complete. Click 'Next Room' to continue.");
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
function endDungeonLevel() {
    console.log(`Ending Dungeon Level ${gameState.level}.`);

    // 1. Move to the next level
    gameState.level++;
    console.log(`Proceeding to Dungeon Level ${gameState.level}.`);
     // TODO: Update UI to show new dungeon level

    // 2. Consume 1 food
    console.log("Consuming 1 food.");
    if (gameState.player.food > 0) {
        updatePlayerStats('food', -1);
    } else {
        updatePlayerStats('hp', -3);
         // TODO: Check for player defeat after taking damage
    }

    // 3. Shuffle the dungeon deck for the next level
     // We need access to the original room data to recreate and shuffle the deck
     // Refactor card loading/deck management to allow re-shuffling the main dungeonDeck
     // Instead of recreating, we will shuffle the existing decks here as part of ending the level.
    console.log("Re-shuffling Dungeon and Result decks for the next level.");
    shuffleDeck(dungeonDeck); // Added shuffling
    shuffleDeck(dungeonResultDeck); // Added shuffling

    // 4. Check win/loss conditions after ending the level
    checkWinLossConditions();

    // TODO: Prepare for the next level (e.g., show start of level UI, prompt for first room)
}

// Function to check for win or loss conditions
// Shows endgame message and returns true if game is over, otherwise false.
function checkWinLossConditions() {
    console.log("Checking win/loss conditions...");

    // Win condition: Gain 3 Shards
    if (gameState.player.shards >= 3) {
        showEndgameMessage('Victory! You collected 3 Shards of Brahm and escaped the dungeon!');
        return true; // Indicate game is over
    }

    // Loss condition 1: Health drops to 0 or less (already handled in updatePlayerStats, but good to check here too)
    if (gameState.player.hp <= 0) {
        showEndgameMessage('Defeat! You have perished in the dungeon.');
        return true; // Indicate game is over
    }

    // Loss condition 2: Complete the 5th level without 3 Shards
    if (gameState.level > 5 && gameState.player.shards < 3) {
        showEndgameMessage('Defeat! You reached the end without enough Shards.');
        return true; // Indicate game is over
    }

    console.log("Game continues.");
    return false; // Indicate game is not over
}

// --- Endgame Modal ---
function showEndgameMessage(message) {
    const modal = document.getElementById('endgame-message');
    const text = document.getElementById('endgame-text');
    if (modal && text) {
        text.textContent = message;
        modal.style.display = 'block';
    } else {
        alert(message); // Fallback if modal not found
    }
}

// Function to resolve icons on a result card
// Handles all icon types (Enemy, Loot, Trap, etc.) and applies their effects to gameState.
function resolveIcons(iconCard, legendCard) {
    // iconCard: the card whose icons are to be resolved (chosen room card)
    // legendCard: the card whose fields (enemy, loot, trap, etc.) are used for icon resolution
    console.log("Inspecting iconCard in resolveIcons:", JSON.stringify(iconCard, null, 2));
    console.log("Using legendCard in resolveIcons:", JSON.stringify(legendCard, null, 2));
    logEvent(`Resolving icons for card: ${iconCard.name} (legend: ${legendCard.name})`);
    if (!iconCard.icons || typeof iconCard.icons !== 'string') {
        console.warn("Icon card has no icons or invalid format:", iconCard);
        return;
    }
    const icons = iconCard.icons.split(',').map(icon => icon.trim());
    icons.forEach(icon => {
        console.log("Resolving icon:", icon);
        switch (icon) {
            case 'Enemy':
                console.log("Enemy encounter:", legendCard.enemy);
                if (legendCard.enemy && typeof legendCard.enemy === 'string') {
                    const enemyMatch = legendCard.enemy.match(/^Enemy=(.+)$/);
                    if (enemyMatch && enemyMatch[1]) {
                        const enemyName = enemyMatch[1];
                        const enemyCard = Object.values(getAllCardsData()).find(card => card.name === enemyName);
                        if (enemyCard) {
                            console.log("Found enemy card:", enemyCard);
                            initiateCombat(enemyCard);
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
            case 'Loot':
                console.log("Loot found:", legendCard.loot);
                const lootOutcome = legendCard.loot;
                if (lootOutcome && typeof lootOutcome === 'string') {
                    if (lootOutcome === 'Empty') {
                        console.log("The loot chest is empty.");
                    } else if (lootOutcome === 'GainShard') {
                        console.log("Found a Shard of Brahm!");
                        updatePlayerStats('shards', 1);
                    } else if (lootOutcome.startsWith('Loot=')) {
                        const lootMatch = lootOutcome.match(/^Loot=(.+)$/);
                        if (lootMatch && lootMatch[1]) {
                            const lootName = lootMatch[1];
                            const lootCard = Object.values(getAllCardsData()).find(card => card.name === lootName);
                            if (lootCard) {
                                console.log("Gained loot item from treasure:", lootCard.name);
                                gameState.inventory.push(lootCard);
                                displayInventory(gameState.inventory);
                            } else {
                                console.warn(`Loot card not found for name: ${lootName}`);
                            }
                        } else {
                            console.warn("Could not parse loot information from legend card:", lootOutcome);
                        }
                    } else {
                        console.warn("Unknown loot outcome format:", lootOutcome);
                    }
                } else {
                    console.warn("Loot icon encountered, but no valid loot data found on the legend card.", { lootOutcome });
                }
                break;
            case 'Trap':
                console.log("Trap encountered:", legendCard.trap);
                const trapEffect = legendCard.trap;
                if (trapEffect && typeof trapEffect === 'string') {
                    if (trapEffect === 'None') {
                        console.log("No trap triggered.");
                    } else {
                        const hpMatch = trapEffect.match(/^HP -(\d+)$/);
                        const enMatch = trapEffect.match(/^EN -(\d+)$/);
                        if (hpMatch && hpMatch[1]) {
                            const damage = parseInt(hpMatch[1], 10);
                            console.log(`Taking ${damage} damage from a trap.`);
                            updatePlayerStats('hp', -damage);
                        } else if (enMatch && enMatch[1]) {
                            const energyLoss = parseInt(enMatch[1], 10);
                            console.log(`Losing ${energyLoss} energy from a trap.`);
                            updatePlayerStats('energy', -energyLoss);
                        } else {
                            console.warn("Could not parse trap effect:", trapEffect);
                        }
                    }
                } else {
                    console.warn("Trap icon encountered, but no valid trap effect data found on the legend card.", { trapEffect });
                }
                break;
            case 'Campsite':
                console.log("Campsite found.");
                // Find the reference card for Campsite to get the image
                const campsiteCard = Object.values(getAllCardsData()).find(card => card.name === 'Campsite');
                showChoiceModal({
                    title: 'Campsite',
                    message: 'Choose your benefit:',
                    image: campsiteCard && campsiteCard.image,
                    choices: [
                        { label: '+2 HP & +1 Energy', value: 'heal' },
                        { label: '+1 Food', value: 'food' }
                    ],
                    onChoice: (val) => {
                        if (val === 'heal') {
                            updatePlayerStats('hp', 2);
                            updatePlayerStats('energy', 1);
                        } else if (val === 'food') {
                            updatePlayerStats('food', 1);
                        }
                    }
                });
                break;
            case 'Water':
                console.log("Water encountered.");
                const gillNetCard = gameState.inventory.find(item => item.id === 'LT01');
                if (gillNetCard) {
                    console.log("Using Gill Net.");
                    let successes = 0;
                    const rolls = [];
                    for (let i = 0; i < 3; i++) {
                        const [roll1] = rollDice();
                        rolls.push(roll1);
                        if (roll1 >= 4) {
                            successes++;
                        }
                    }
                    console.log(`Gill Net rolls: ${rolls.join(', ')}. Successes: ${successes}`);
                    if (successes > 0) {
                        console.log(`Gaining ${successes} food from Gill Net.`);
                        updatePlayerStats('food', successes);
                    } else {
                        console.log("No food gained from Gill Net.");
                    }
                } else {
                    console.log("No Gill Net to use.");
                }
                break;
            case 'Treasure':
                console.log("Treasure found.");
                const treasureOutcome = legendCard.loot;
                if (treasureOutcome === 'GainShard') {
                    console.log("Found a Shard of Brahm!");
                    updatePlayerStats('shards', 1);
                } else if (treasureOutcome && typeof treasureOutcome === 'string' && treasureOutcome.startsWith('Loot=')) {
                    console.log("Treasure contains loot.");
                    const lootMatch = treasureOutcome.match(/^Loot=(.+)$/);
                    if (lootMatch && lootMatch[1]) {
                        const lootName = lootMatch[1];
                        if (lootName === 'Empty') {
                            console.log("The treasure chest is empty.");
                        } else {
                            const lootCard = Object.values(getAllCardsData()).find(card => card.name === lootName);
                            if (lootCard) {
                                console.log("Gained loot item from treasure:", lootCard.name);
                                gameState.inventory.push(lootCard);
                                displayInventory(gameState.inventory);
                            } else {
                                console.warn(`Loot card not found for name in treasure: ${lootName}`);
                            }
                        }
                    } else {
                        console.warn("Could not parse treasure outcome as loot:", treasureOutcome);
                    }
                } else {
                    console.warn("Unknown treasure outcome format:", treasureOutcome);
                }
                break;
            case 'Random':
                console.log("Random event:", legendCard.random);
                const randomEvent = legendCard.random;
                if (randomEvent && typeof randomEvent === 'string') {
                    const refMatch = randomEvent.match(/^Ref=(.+)$/);
                    if (refMatch && refMatch[1]) {
                        const refName = refMatch[1];
                        const refCard = Object.values(getAllCardsData()).find(card => card.name === refName);
                        if (refCard) {
                            console.log("Encountered Reference Card:", refCard.name);
                            handleReferenceCard(refCard);
                        } else {
                            console.warn(`Reference card not found for name: ${refName}`);
                        }
                    } else if (randomEvent.startsWith('Enemy=')) {
                        console.log("Random event is an enemy encounter.");
                        const enemyMatch = randomEvent.match(/^Enemy=(.+)$/);
                        if (enemyMatch && enemyMatch[1]) {
                            const enemyName = enemyMatch[1];
                            const enemyCard = Object.values(getAllCardsData()).find(card => card.name === enemyName);
                            if (enemyCard) {
                                console.log("Found enemy card:", enemyCard);
                                initiateCombat(enemyCard);
                            } else {
                                console.warn(`Enemy card not found for name: ${enemyName}`);
                            }
                        }
                    } else {
                        console.warn("Could not parse random event format:", randomEvent);
                    }
                } else {
                    console.warn("Random icon encountered, but no valid random event data found on the legend card.", { randomEvent });
                }
                break;
            default:
                console.warn("Unknown icon encountered:", icon);
        }
    });
    // TODO: After all icons are resolved, proceed with the game turn (e.g., offer resolve/skip for next room)
}

// Function to handle Reference Card effects
// Applies special effects based on reference card name (Altar, Grove, etc.).
function handleReferenceCard(refCard) {
    console.log("Handling Reference Card effect for:", refCard.name);
    // Implement logic based on refCard.name and GAMERULES.md
    switch (refCard.name) {
        case 'Altar':
            console.log("Resolving Altar effect. Checking player Favor...");
            const currentFavor = gameState.player.favor;
            const altarCard = Object.values(getAllCardsData()).find(card => card.name === 'Altar');
            if (currentFavor >= 10) {
                showChoiceModal({
                    title: 'Altar',
                    message: 'Favor 10+: Choose your reward:',
                    image: altarCard && altarCard.image,
                    choices: [
                        { label: 'Gain a Shard', value: 'shard' },
                        { label: 'Increase Max HP', value: 'maxhp' }
                    ],
                    onChoice: (val) => {
                        if (val === 'shard') {
                            updatePlayerStats('shards', 1);
                        } else if (val === 'maxhp') {
                            gameState.player.maxHealth += 1;
                            updatePlayerStats('hp', 1);
                            updateStatDisplay('hp', gameState.player.hp);
                        }
                    }
                });
            } else if (currentFavor >= 8) {
                updatePlayerStats('hp', 4);
                updatePlayerStats('energy', 3);
            } else if (currentFavor >= 6) {
                updatePlayerStats('hp', 3);
                updatePlayerStats('energy', 2);
            } else if (currentFavor >= 4) {
                updatePlayerStats('hp', 2);
                updatePlayerStats('energy', 1);
            } else if (currentFavor >= 0) {
                updatePlayerStats('hp', 1);
            }
            break;
        case 'Campsite': // Note: Campsite is also a direct icon, but can appear via Random
            console.log("Resolving Campsite effect via Random.");
             console.log("Campsite Options: 1. Gain +2 HP and +1 Energy, or 2. Gain +1 Food.");
            // TODO: Implement player choice for Campsite benefit
            break;
        case 'Grove':
            console.log("Resolving Grove effect.");
            showChoiceModal({
                title: 'Grove',
                message: 'Roll a die for the Grove effect!',
                dieRoll: true,
                image: 'assets/cards/reference/REF03.png',
                onRoll: (groveRoll) => {
                    if (groveRoll === 1) {
                        updatePlayerStats('hp', -1);
                        logEvent('Grove: Lose 1 HP.');
                    } else if (groveRoll === 2) {
                        logEvent('Grove: No effect.');
                    } else if (groveRoll >= 3 && groveRoll <= 4) {
                        updatePlayerStats('food', 1);
                        logEvent('Grove: Gain 1 Ration.');
                    } else if (groveRoll >= 5 && groveRoll <= 6) {
                        updatePlayerStats('food', 2);
                        logEvent('Grove: Gain 2 Rations.');
                    }
                    // Explicitly close the modal if still open (vanilla JS fallback)
                    const modal = document.getElementById('choice-modal');
                    if (modal && modal.parentNode) {
                        setTimeout(() => {
                            if (modal.parentNode) modal.parentNode.removeChild(modal);
                        }, 900);
                    }
                }
            });
            break;
        case 'Labyrinth':
            console.log("Resolving Labyrinth effect.");
            const labyrinthCard = Object.values(getAllCardsData()).find(card => card.name === 'Labyrinth');
            showChoiceModal({
                title: 'Labyrinth',
                message: 'Lose 1 Ration, or if you have none, lose 2 Energy, or if you have neither, lose up to 3 HP.',
                image: labyrinthCard && labyrinthCard.image,
                choices: [
                    { label: 'Lose 1 Ration', value: 'ration', disabled: !(gameState.player.food >= 1) },
                    { label: 'Lose 2 Energy', value: 'energy', disabled: !(gameState.player.food < 1 && gameState.player.energy >= 2) },
                    { label: 'Lose up to 3 HP', value: 'hp', disabled: !(gameState.player.food < 1 && gameState.player.energy < 2 && gameState.player.hp > 0) }
                ].filter(opt => !opt.disabled),
                onChoice: (val) => {
                    if (val === 'ration') {
                        updatePlayerStats('food', -1);
                    } else if (val === 'energy') {
                        updatePlayerStats('energy', -2);
                    } else if (val === 'hp') {
                        const damageToTake = Math.min(gameState.player.hp, 3);
                        updatePlayerStats('hp', -damageToTake);
                    }
                }
            });
            break;
        case 'Pigman':
            console.log("Resolving Pigman effect.");
            const pigmanCard = Object.values(getAllCardsData()).find(card => card.name === 'Pigman');
            const turnipIndex = gameState.inventory.findIndex(item => item.id === 'LT06');
            if (turnipIndex !== -1) {
                showChoiceModal({
                    title: 'Pigman',
                    message: 'You have a Turnip! Choose:',
                    image: pigmanCard && pigmanCard.image,
                    choices: [
                        { label: 'Gain 1 Favor', value: 'favor' },
                        { label: 'Discard Turnip for 1 Shard', value: 'shard' }
                    ],
                    onChoice: (val) => {
                        if (val === 'favor') {
                            updatePlayerStats('favor', 1);
                        } else if (val === 'shard') {
                            gameState.inventory.splice(turnipIndex, 1);
                            displayInventory(gameState.inventory);
                            updatePlayerStats('shards', 1);
                        }
                    }
                });
            } else {
                updatePlayerStats('favor', 1);
            }
            break;
        case 'Shrine':
            console.log("Resolving Shrine effect.");
            // TODO: Implement Shrine effect (gain shard) based on GAMERULES.md section 4.4
             updatePlayerStats('shards', 1);
            console.log("Gained a Shard of Brahm from the Shrine!");
            // TODO: Check for win condition after gaining a shard
            break;
        default:
            console.warn("Unknown Reference Card encountered:", refCard.name);
        }
       // TODO: After all icons are resolved, proceed with the game turn (e.g., offer resolve/skip for next room)
    }

// Function to restore the UI from gameState after loading
function restoreGameUIFromState() {
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
        combatArea.innerHTML = '';
    }
}

// Resume combat logic after loading a save
function resumeCombat(enemyId, enemyHp, playerHp) {
    // Find the enemy card
    const enemyCard = enemyId ? getCardById(enemyId) : null;
    if (!enemyCard) return;

    // Restore enemy and player HP if provided
    if (typeof enemyHp === 'number') enemyCard.health = enemyHp;
    if (typeof playerHp === 'number') gameState.player.hp = playerHp;

    // Re-create the combat UI and re-attach event handlers
    // This is similar to initiateCombat, but skips the intro and uses the saved HPs
    const raceCard = getCardById(gameState.raceId);
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
    let currentEnemyHealth = typeof enemyHp === 'number' ? enemyHp : enemyCard.health;
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
        classCard: raceCard,
        enemyCard,
        abilities: availableAbilities,
        canUseAxeReroll,
        canDiscardAxe,
        onAxeReroll: () => handleRoll(() => {}, { type: 'axe-reroll' }),
        onAxeDiscard: () => handleRoll(() => {}, { type: 'axe-discard' }),
        onRoll: (cb, ab, forcedRolls) => handleRoll(cb, ab, forcedRolls),
        onClose: () => { hideCombatBoard(); }
    });

    async function handleRoll(updateModal, usedAbility, forcedRolls) {
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
                    const rawAttackValue = Math.abs(context.roll1 - context.roll2);
                    const totalAttackDamage = rawAttackValue + (context.attackBonus || 0);
                    const damageAfterDefense = Math.max(0, totalAttackDamage - enemyCard.defense);
                    currentEnemyHealth -= damageAfterDefense;
                    message = message || `You rolled ${context.roll1}, ${context.roll2}. Damage after defense: ${damageAfterDefense}. Enemy HP: ${Math.max(0, currentEnemyHealth)}`;
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
            playerHp: gameState.player.hp,
            html: document.getElementById('combat-area')?.innerHTML || ""
        };

        updateModal({ roll1: context.roll1, roll2: context.roll2, message, showRollBtn, isCombatOver });
    }
}

// Function to update player stats (can be used by icon handlers)
// Updates a stat, clamps values, updates UI, checks for defeat, and saves state.
function updatePlayerStats(stat, amount) {
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
            enemyHp: gameState.enemyHp || 1 // fallback if not set
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
 * Process loot abilities and effects for all loot cards in player inventory.
 * Call this function at relevant game events (combat, encounter, discard, altar, etc.).
 * Handles all actions/triggers/targets from data/loot.json.
 */
function processLootAbilitiesAndEffects(eventContext) {
    // Ensure loot discard pile exists
    if (!gameState.lootDiscardPile) gameState.lootDiscardPile = [];
    // eventContext: { trigger, encounterType, discardItemId, altarContext, combatContext, etc. }
    const lootItems = gameState.inventory.filter(item => item.id && item.id.startsWith('LT'));
    for (const loot of lootItems) {
        // Passive effects
        if (loot.effects && loot.effects.length) {
            for (const effect of loot.effects) {
                if (effect.action === "damage_reduction" && eventContext.trigger === "on_receive_damage") {
                    // Shield: Reduce damage by 1 if single attack damage is 6 or more
                    if (eventContext.damage >= 6) {
                        eventContext.damage = Math.max(0, eventContext.damage - (effect.amount || 1));
                        logEvent("Shield reduced damage by 1.");
                    }
                }
            }
        }
        // Abilities
        if (loot.abilities && loot.abilities.length) {
            for (const ability of loot.abilities) {
                switch (ability.action) {
                    case "roll_dice":
                        if (eventContext.trigger === "on_water_encounter") {
                            // GillNet: Roll 3 dice instead of 1, gain 1 ration per success (4+)
                            let successes = 0;
                            for (let i = 0; i < (ability.amount || 3); i++) {
                                const [roll] = rollDice();
                                if (roll >= 4) successes++;
                            }
                            if (successes > 0) {
                                updatePlayerStats('food', successes);
                                logEvent(`GillNet: Gained ${successes} rations.`);
                            }
                        }
                        break;
                    case "bypass_encounter":
                        if (eventContext.trigger === "on_encounter" && eventContext.encounterType === "enemy") {
                            // Ring: Spend 1 favor to bypass enemy encounter (once per dungeon level)
                            if (gameState.player.favor > 0 && !loot._bypassedThisLevel) {
                                gameState.player.favor -= 1;
                                loot._bypassedThisLevel = true;
                                logEvent("Ring: Enemy encounter bypassed by spending 1 favor.");
                                // Skip encounter logic here
                                eventContext.bypassed = true;
                            }
                        }
                        break;
                    case "discard_item":
                        if (eventContext.trigger === "on_discard" && eventContext.discardItemId === loot.id) {
                            // Shield: Discard to activate (handled elsewhere)
                            logEvent("Shield discarded.");
                        }
                        break;
                    case "apply_damage":
                        if (eventContext.trigger === "on_attack" && eventContext.combatContext) {
                            // Sword: Deal 5 damage to enemy
                            eventContext.combatContext.enemyHp -= (ability.amount || 5);
                            logEvent("Sword: Dealt 5 damage to enemy.");
                        }
                        break;
                    case "ignore_miss":
                        if (eventContext.trigger === "on_roll_double" && eventContext.combatContext) {
                            // Sword: Ignore miss on doubles
                            eventContext.combatContext.ignoreMiss = true;
                            logEvent("Sword: Ignored miss on doubles.");
                        }
                        break;
                    case "modify_altar_reward":
                        if (eventContext.trigger === "on_altar") {
                            // Symbol: Reward level = current favor + 1
                            eventContext.altarContext.rewardLevel = gameState.player.favor + 1;
                            logEvent("Symbol: Altar reward level increased by 1.");
                        }
                        break;
                    case "discard_to_gain":
                        if (eventContext.trigger === "during_ref_pigman" && eventContext.discardItemId === loot.id) {
                            // Turnip: Discard to gain shard
                            updatePlayerStats('shards', 1);
                            // Remove from inventory handled elsewhere
                            logEvent("Turnip: Discarded for 1 shard.");
                        }
                        break;
                    case "gain_resource":
                        if (eventContext.trigger === "on_discard" && eventContext.discardItemId === loot.id) {
                            // Potion: Discard to gain health/energy, then move to loot discard pile
                            if (ability.target === "health") updatePlayerStats('hp', ability.amount || 2);
                            if (ability.target === "energy") updatePlayerStats('energy', ability.amount || 2);
                            logEvent(`Potion: Gained ${ability.amount} ${ability.target}.`);
                            // Remove from inventory and add to loot discard pile
                            const idx = gameState.inventory.findIndex(i => i.id === loot.id);
                            if (idx !== -1) {
                                gameState.lootDiscardPile.push(gameState.inventory[idx]);
                                gameState.inventory.splice(idx, 1);
                                displayInventory(gameState.inventory);
                            }
                        }
                        if (eventContext.trigger === "on_activate" && loot.id === "LT06") {
                            // Turnip: Discard anytime to gain +3 energy
                            updatePlayerStats('energy', ability.amount || 3);
                            // Remove from inventory handled elsewhere
                            logEvent("Turnip: Discarded for +3 energy.");
                        }
                        break;
                    case "avoid_encounter":
                        if (eventContext.trigger === "on_encounter" && eventContext.encounterType === "combat") {
                            // Wedge: Avoid combat encounter
                            eventContext.avoided = true;
                            logEvent("Wedge: Combat encounter avoided.");
                        }
                        break;
                    case "use_scroll":
                        if (eventContext.trigger === "on_use_scroll" && eventContext.scrollItemId === loot.id) {
                            // Scroll: Defeat undead enemy (e.g., Skelepede)
                            // Find current enemy in combat
                            const undeadEnemies = ["Skelepede", "Skeleton", "Ghoul", "Wraith", "Lich"]; // Add more as needed
                            const encounter = gameState.encounter;
                            if (encounter && encounter.inProgress) {
                                const enemyCard = getCardById(encounter.enemyId);
                                if (enemyCard && undeadEnemies.some(name => enemyCard.name === name || (enemyCard.traits && enemyCard.traits.includes("Undead")))) {
                                    // Defeat the enemy
                                    encounter.enemyHp = 0;
                                    logEvent("Scroll: Undead enemy instantly defeated!");
                                    // Remove Scroll from inventory and add to loot discard pile
                                    const idx = gameState.inventory.findIndex(i => i.id === loot.id);
                                    if (idx !== -1) {
                                        gameState.lootDiscardPile.push(gameState.inventory[idx]);
                                        gameState.inventory.splice(idx, 1);
                                        displayInventory(gameState.inventory);
                                    }
                                } else {
                                    logEvent("Scroll: No undead enemy to defeat.");
                                }
                            } else {
                                logEvent("Scroll: No enemy encounter in progress.");
                            }
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
    console.log('initiateCombat: gameState.raceId =', gameState.raceId);
    const raceCard = getCardById(gameState.raceId); // Use race card instead of class card
    console.log('initiateCombat: raceCard =', raceCard);
    if (!raceCard) {
        console.error('initiateCombat: raceCard is undefined for raceId:', gameState.raceId);
        const allCardIds = Object.keys(getAllCardsData());
        console.error('Available card IDs:', allCardIds);
        alert('Error: Player race card not found. Please restart the game.');
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
    let currentEnemyHealth = enemyCard.health;
    let isPlayerTurn = true;
    let combatOver = false;
    let axeRerollUsed = false;

    // --- UPDATE ENCOUNTER STATE ON COMBAT START ---
    gameState.encounter = {
        inProgress: true,
        enemyId: enemyCard.id,
        enemyHp: currentEnemyHealth,
        playerHp: gameState.player.hp,
        html: document.getElementById('combat-area')?.innerHTML || ""
    };

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
        async function handleRoll(updateModal, usedAbility, forcedRolls) {
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
                // Axe discard special attack
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
                        const rawAttackValue = Math.abs(context.roll1 - context.roll2);
                        const totalAttackDamage = rawAttackValue + (context.attackBonus || 0);
                        const damageAfterDefense = Math.max(0, totalAttackDamage - enemyCard.defense);
                        currentEnemyHealth -= damageAfterDefense;
                        message = message || `You rolled ${context.roll1}, ${context.roll2}. Damage after defense: ${damageAfterDefense}. Enemy HP: ${Math.max(0, currentEnemyHealth)}`;
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
                playerHp: gameState.player.hp,
                html: document.getElementById('combat-area')?.innerHTML || ""
            };

            updateModal({ roll1: context.roll1, roll2: context.roll2, message, showRollBtn, isCombatOver });
            if (isCombatOver) setTimeout(resolve, 500);
        }
        showCombatBoard({
            classCard: raceCard,
            enemyCard,
            abilities: availableAbilities,
            canUseAxeReroll,
            canDiscardAxe,
            onAxeReroll: () => handleRoll(() => {}, { type: 'axe-reroll' }),
            onAxeDiscard: () => handleRoll(() => {}, { type: 'axe-discard' }),
            onRoll: (cb, ab, forcedRolls) => handleRoll(cb, ab, forcedRolls),
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
            }
        });
    });
}

// --- Next Room Button Logic ---
function enableNextRoomButton() {
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
    const btn = document.getElementById('next-room-btn');
    if (btn && !btn.dataset.bound) {
        btn.addEventListener('click', async () => {
            if (!gameState.discardPile) gameState.discardPile = { room: [], result: [] };
            const { roomCardId, resultCardId } = gameState.visibleCards || {};
            if (roomCardId) gameState.discardPile.room.push(roomCardId);
            if (resultCardId) gameState.discardPile.result.push(resultCardId);
            const lastRoomId = gameState.discardPile.room.length > 0 ? gameState.discardPile.room[gameState.discardPile.room.length - 1] : null;
            const lastRoomCard = lastRoomId ? getCardById(lastRoomId) : null;
            displayDiscardPile(lastRoomCard);
            // Hide the enemy card when advancing to the next round
            hideEnemyCard();
            // Only clear visible cards/state, do NOT call displayRoomCard(null) or displayResultCard(null) here
            gameState.visibleCards = {
                ...gameState.visibleCards,
                roomCardId: null,
                resultCardId: null,
                enemyCardId: null
            };
            gameState.currentRoom = (gameState.currentRoom || 0) + 1;
            saveGame();
            // Now start the next round (handleRoom will clear the slots and show the Deck slot only)
            await handleRoom();
        });
        btn.dataset.bound = 'true';
        disableNextRoomButton();
    }
})();

// Function to advance to the next room (round)
function advanceToNextRoom() {
    // Move previous room and result cards to the discard pile
    if (!gameState.discardPile) gameState.discardPile = { room: [], result: [] };
    const { roomCardId, resultCardId } = gameState.visibleCards || {};
    if (roomCardId) gameState.discardPile.room.push(roomCardId);
    if (resultCardId) gameState.discardPile.result.push(resultCardId);

    // Clear visible cards for the next round
    gameState.visibleCards = {
        ...gameState.visibleCards,
        roomCardId: null,
        resultCardId: null,
        enemyCardId: null
    };
    saveGame();
    // Start the next room
    handleRoom();
}

/**
 * Simulate rolling two six-sided dice.
 * @returns {[number, number]}
 */
function rollDice() {
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

window.processLootAbilitiesAndEffects = processLootAbilitiesAndEffects;
window.processTrappingUse = processTrappingUse;

export { initializePlayer, startDungeonLevel, handleRoom, updatePlayerStats, restoreGameUIFromState, logEvent, advanceToNextRoom };
