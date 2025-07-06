import { drawCard, dungeonDeck, dungeonResultDeck, getCardById, getAllCardsData } from './data/cards.js';
import { displayRoomCard, displayResultCard, displayRaceCard, displayClassCard, displayEnemyCard, hideEnemyCard, awaitPlayerRoomDecision, updateStatDisplay, displayInventory, displayDiscardPile, displayDeckRoomCard } from './ui.js';
import { gameState, saveGame } from './gameState.js';

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

    // Add starting trapping from class
    if (classCard.startingTrapping) {
        gameState.inventory.push(getCardById(classCard.startingTrapping));
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
        [deck[i], deck[j]] = [deck[j], deck[i]]; // Swap elements
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
                console.log("Campsite Options: 1. Gain +2 HP and +1 Energy, or 2. Gain +1 Food.");
                // TODO: Implement player choice for Campsite benefit
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
            console.log(`Current Favor: ${currentFavor}`);

            if (currentFavor >= 10) {
                console.log("Favor is 10 or more. Gain a Shard or increase Max HP.");
                // TODO: Implement player choice between gaining a shard or increasing max HP
                // For now, let's default to gaining a shard.
                 console.log("Defaulting to gaining a Shard (until UI choice is implemented).");
                updatePlayerStats('shards', 1);
                 // TODO: Check for win condition
            } else if (currentFavor >= 8) {
                console.log("Favor is 8-9. Gain +4 HP and +3 Energy.");
                updatePlayerStats('hp', 4);
                updatePlayerStats('energy', 3);
            } else if (currentFavor >= 6) {
                console.log("Favor is 6-7. Gain +3 HP and +2 Energy.");
                updatePlayerStats('hp', 3);
                updatePlayerStats('energy', 2);
            } else if (currentFavor >= 4) {
                console.log("Favor is 4-5. Gain +2 HP and +1 Energy.");
                updatePlayerStats('hp', 2);
                updatePlayerStats('energy', 1);
            } else if (currentFavor >= 0) {
                 console.log("Favor is 0-3. Gain +1 HP.");
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
            // TODO: Implement Grove effect (d6 roll for rations or damage) based on GAMERULES.md section 8.0 Errata
            console.log("Resolving Grove effect. Rolling a d6...");
            const [groveRoll] = rollDice(); // Use one die from the rollDice function
            console.log(`Grove roll result: ${groveRoll}`);

            if (groveRoll === 1) {
                console.log("Grove effect: Lose 1 HP.");
                updatePlayerStats('hp', -1);
            } else if (groveRoll === 2) {
                console.log("Grove effect: No effect.");
            } else if (groveRoll >= 3 && groveRoll <= 4) {
                console.log("Grove effect: Gain 1 Ration.");
                updatePlayerStats('food', 1);
            } else if (groveRoll >= 5 && groveRoll <= 6) {
                console.log("Grove effect: Gain 2 Rations.");
                updatePlayerStats('food', 2);
            }
            break;
        case 'Labyrinth':
            console.log("Resolving Labyrinth effect.");
            // TODO: Implement Labyrinth effect (lose resource) based on GAMERULES.md section 8.0 Errata
            console.log("Resolving Labyrinth effect. Must lose a resource.");
            // Priority: 1 Ration, then 2 Energy, then 3 Health

            if (gameState.player.food >= 1) {
                console.log("Labyrinth effect: Losing 1 Ration.");
                updatePlayerStats('food', -1);
            } else if (gameState.player.energy >= 2) {
                 console.log("Labyrinth effect: Losing 2 Energy.");
                 updatePlayerStats('energy', -2);
            } else if (gameState.player.hp > 0) { // Corrected: Apply damage as long as health is above 0
                 const damageToTake = Math.min(gameState.player.hp, 3); // Take max 3 damage, not more than current health
                 console.log(`Labyrinth effect: Losing ${damageToTake} HP.`);
                 updatePlayerStats('hp', -damageToTake);
                 // TODO: Check for player defeat after losing health (handled by updatePlayerStats)
            } else {
                 // Player health is already 0 or less, no further health loss
                console.log("Labyrinth effect: Player health already low, no further health loss from Labyrinth.");
            }
            break;
        case 'Pigman':
            console.log("Resolving Pigman effect.");
            // Pigman effect: gain 1 favor or discard Turnip to gain shard
            const turnipIndex = gameState.inventory.findIndex(item => item.id === 'LT06'); // Find Turnip by ID

            if (turnipIndex !== -1) {
                console.log("You have a Turnip. Pigman offers: 1. Gain 1 Favor, or 2. Discard Turnip to gain 1 Shard.");
                // TODO: Implement player choice here
                // For now, let's default to gaining favor if Turnip is available, or always offer both and log the choice needed
                 // Let's log both options and mark the need for UI choice.
                 console.log("Player needs to choose: Gain 1 Favor OR Discard Turnip (LT06) to gain 1 Shard.");
                 // For now, apply the default outcome if no choice is implemented: Gain 1 Favor if no Turnip, or just log if Turnip is present.

                 console.log("Defaulting to gaining 1 Favor (until UI choice is implemented).");
                 updatePlayerStats('favor', 1);

            } else {
                console.log("You do not have a Turnip. Gaining 1 Favor from Pigman.");
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
    if (raceId) {
        const raceCard = getCardById(raceId);
        if (raceCard) displayRaceCard(raceCard);
    }
    if (classId) {
        const classCard = getCardById(classId);
        if (classCard) displayClassCard(classCard);
    }
    if (Array.isArray(inventory)) {
        const invCards = inventory.map(id => getCardById(id)).filter(Boolean);
        displayInventory(invCards);
    }
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

        // Check for player defeat after health changes
        if (stat === 'hp' && gameState.player.hp <= 0) {
            checkWinLossConditions(); // Check for loss due to health depletion
        }

        saveGame();
    } else {
        console.warn(`Attempted to update unknown stat: ${stat}`);
    }
}

// Function to simulate rolling two six-sided dice
// Returns an array [roll1, roll2].
function rollDice() {
    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;
    console.log(`Dice rolled: ${roll1}, ${roll2}`);
    return [roll1, roll2];
}

// Full combat logic for enemy encounters
async function initiateCombat(enemyCard) {
    logEvent(`Combat started with ${enemyCard.name}`);
    displayEnemyCard(enemyCard); // Show enemy card in UI
    let currentEnemyHealth = enemyCard.health;
    let isPlayerTurn = true;
    let enemyDefeated = false;

    while (currentEnemyHealth > 0 && gameState.player.hp > 0) {
        if (isPlayerTurn) {
            logEvent(`Player's turn to attack...`);
            const [roll1, roll2] = rollDice();
            if (roll1 === roll2) {
                logEvent(`Player rolled doubles (${roll1}, ${roll2}) and missed!`);
            } else {
                const rawAttackValue = Math.abs(roll1 - roll2);
                const totalAttackDamage = rawAttackValue; // Add player bonuses here if needed
                const damageAfterDefense = Math.max(0, totalAttackDamage - enemyCard.defense);
                currentEnemyHealth -= damageAfterDefense;
                logEvent(`Player rolled ${roll1}, ${roll2}. Damage after defense: ${damageAfterDefense}. Enemy HP: ${Math.max(0, currentEnemyHealth)}`);
            }
            if (currentEnemyHealth <= 0) {
                logEvent(`${enemyCard.name} defeated! Gained ${enemyCard.favor} favor.`);
                updatePlayerStats('favor', enemyCard.favor);
                enemyDefeated = true;
                // Tint the enemy card to indicate defeat
                displayEnemyCard(enemyCard, true);
                break;
            }
        } else {
            logEvent(`${enemyCard.name}'s turn to attack...`);
            const [roll1, roll2] = rollDice();
            if (roll1 === roll2) {
                logEvent(`${enemyCard.name} rolled doubles (${roll1}, ${roll2}) and missed!`);
            } else {
                let damageDealt = Math.abs(roll1 - roll2) + enemyCard.attack;
                updatePlayerStats('hp', -damageDealt);
                logEvent(`${enemyCard.name} rolled ${roll1}, ${roll2}. Damage dealt: ${damageDealt}. Player HP: ${gameState.player.hp}`);
            }
            if (gameState.player.hp <= 0) {
                logEvent(`Player defeated by ${enemyCard.name}!`);
                break;
            }
        }
        isPlayerTurn = !isPlayerTurn;
        // Optionally add a delay here for UI pacing
    }
    // Do not hide the enemy card automatically; it will be hidden on next round
    logEvent(`Combat with ${enemyCard.name} ended.`);
}

// --- Next Room Button Logic ---
function enableNextRoomButton() {
    const btn = document.getElementById('next-room-btn');
    if (btn) {
        btn.disabled = false;
        btn.style.display = 'inline-block';
    }
}

function disableNextRoomButton() {
    const btn = document.getElementById('next-room-btn');
    if (btn) {
        btn.disabled = true;
        btn.style.display = 'none';
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

export { initializePlayer, startDungeonLevel, handleRoom, updatePlayerStats, restoreGameUIFromState, logEvent, advanceToNextRoom };
