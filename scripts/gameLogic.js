import { drawCard, dungeonDeck, dungeonResultDeck, getCardById, getAllCardsData } from './data/cards.js';
import { displayDrawnCards } from './main.js';

// Player stats
let playerStats = {
    health: 0,
    maxHealth: 0,
    energy: 0,
    maxEnergy: 0,
    rations: 0,
    favor: 0,
    shards: 0,
    inventory: []
};

// Game state variables
let currentDungeonLevel = 1;
let currentRoom = 0;

// Function to initialize player stats based on selected race and class
function initializePlayer(raceId, classId) {
    const raceCard = getCardById(raceId);
    const classCard = getCardById(classId);

    if (!raceCard || !classCard) {
        console.error("Failed to initialize player: Invalid race or class ID.");
        return;
    }

    playerStats.maxHealth = raceCard.health + classCard.healthModifier;
    playerStats.health = playerStats.maxHealth; // Start with full health
    playerStats.maxEnergy = raceCard.energy + classCard.energyModifier;
    playerStats.energy = playerStats.maxEnergy; // Start with full energy
    playerStats.rations = raceCard.rations;
    playerStats.favor = 0; // Start with 0 favor
    playerStats.shards = 0; // Start with 0 shards
    playerStats.inventory = []; // Start with empty inventory

    // Add starting trapping from class
    if (classCard.startingTrapping) {
        playerStats.inventory.push(getCardById(classCard.startingTrapping));
    }

    console.log("Player initialized:", playerStats);
    // TODO: Update UI with initial stats
}

// Function to start a new dungeon level
function startDungeonLevel() {
    currentDungeonLevel++;
    currentRoom = 0;
    console.log(`Starting Dungeon Level ${currentDungeonLevel}`);
    // Shuffle dungeon and result decks for the new level
    shuffleDeck(dungeonDeck); // Added shuffling
    shuffleDeck(dungeonResultDeck); // Added shuffling
    console.log("Dungeon and Result decks shuffled.");
    // TODO: Start the first room
}

// Function to shuffle a deck (Fisher-Yates algorithm)
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]]; // Swap elements
    }
}

// Function to handle a single room in the dungeon
function handleRoom() {
    currentRoom++;
    console.log(`Entering Room ${currentRoom}`);

    if (currentRoom > 6) {
        console.log("End of dungeon level.");
        // TODO: Check for win/loss conditions and potentially start next level or end game
        return;
    }

    // Draw the first card (the potential room card)
    const firstCard = drawCard(dungeonDeck);

    if (!firstCard) {
        console.error("Could not draw the first card for the room.");
        // TODO: Handle error or end game?
        return;
    }

    console.log("First card drawn:", firstCard.name);
    // TODO: Display the first card to the player and ask for RESOLVE or SKIP decision
    // This will require UI interaction. For now, we will simulate the decision.

    // --- Simulate Player Decision (REPLACE WITH UI INTERACTION LATER) ---
    const playerDecision = Math.random() < 0.5 ? 'RESOLVE' : 'SKIP'; // 50/50 chance for now
    console.log(`Player decides to ${playerDecision}.`);
    // --- End Simulate Player Decision ---

    let roomCard, resultCard;

    if (playerDecision === 'RESOLVE') {
        console.log("Resolving the first card.");
        roomCard = firstCard;
        // Draw the second card as the result card from the result deck
        resultCard = drawCard(dungeonResultDeck); // Corrected: Draw from dungeonResultDeck
        if (!resultCard) {
            console.error("Could not draw the result card after resolving.");
             // TODO: Handle error or end game?
            return;
        }
        console.log("Second card drawn as Result Card:", resultCard.name);

    } else { // playerDecision === 'SKIP'
        console.log("Skipping the first card.");
        // The first card becomes the result card (flipped)
        resultCard = firstCard;
        // Draw the second card as the room card from the dungeon deck
        roomCard = drawCard(dungeonDeck); // Corrected: Draw from dungeonDeck
         if (!roomCard) {
            console.error("Could not draw the room card after skipping.");
             // TODO: Handle error or end game?
            return;
        }
        console.log("Second card drawn as Room Card:", roomCard.name);
         // When skipping, the result card's linked result is not used directly, but its icons are resolved.
         // The icons to resolve are from the *first* card drawn (now the resultCard).
    }

    if (roomCard && resultCard) {
        console.log("Room formed:", roomCard.name, "(Room) and", resultCard.name, "(Result).");
        // TODO: Pass these paired cards to a UI function for display
        displayDrawnCards(roomCard, resultCard); // This UI function needs to handle displaying two cards in the correct roles

        // Resolve icons on the designated result card
        resolveIcons(resultCard);

        // After resolving icons, check if the level is over
        if (currentRoom === 6) {
            console.log("End of level detected.");
            endDungeonLevel();
        } else {
            // If level is not over, prompt for next room or wait for player action
            console.log("Room complete. Preparing for next room...");
             // TODO: Implement logic to proceed to the next room (likely waiting for player input or a delay)
        }

    } else {
        console.error("Could not form the room with two cards.", { roomCard, resultCard });
        // TODO: Handle error or end game?
    }

    // Note: The game flow after a room (proceeding to the next room or ending the level) needs to be carefully managed,
    // potentially with async/await and UI interactions to pause the game for player input.
}

// Function to handle the end of a dungeon level
function endDungeonLevel() {
    console.log(`Ending Dungeon Level ${currentDungeonLevel}.`);

    // 1. Move to the next level
    currentDungeonLevel++;
    console.log(`Proceeding to Dungeon Level ${currentDungeonLevel}.`);
     // TODO: Update UI to show new dungeon level

    // 2. Consume 1 food
    console.log("Consuming 1 food.");
    if (playerStats.rations > 0) {
        updatePlayerStats('rations', -1);
    } else {
        console.log("No food to consume. Taking 3 damage.");
        updatePlayerStats('health', -3);
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
function checkWinLossConditions() {
    console.log("Checking win/loss conditions...");

    // Win condition: Gain 3 Shards
    if (playerStats.shards >= 3) {
        console.log("Win condition met: Player has 3 or more Shards!");
        // TODO: Implement win game logic (show win screen, calculate score)
        return true; // Indicate game is over
    }

    // Loss condition 1: Health drops to 0 or less (already handled in updatePlayerStats, but good to check here too)
    if (playerStats.health <= 0) {
        console.log("Loss condition met: Player health is 0 or less.");
        // TODO: Implement lose game logic (show lose screen, calculate score)
        return true; // Indicate game is over
    }

    // Loss condition 2: Complete the 5th level without 3 Shards
    if (currentDungeonLevel > 5 && playerStats.shards < 3) {
        console.log(`Loss condition met: Completed level ${currentDungeonLevel} without 3 Shards.`);
        // TODO: Implement lose game logic (show lose screen, calculate score)
        return true; // Indicate game is over
    }

    console.log("Game continues.");
    return false; // Indicate game is not over
}

// Function to resolve icons on a result card
function resolveIcons(resultCard) {
    console.log("Resolving icons for result card:", resultCard.name);
    // Assuming icons are stored as a comma-separated string in resultCard.icons
    if (!resultCard.icons || typeof resultCard.icons !== 'string') {
        console.warn("Result card has no icons or invalid format:", resultCard);
        return;
    }

    const icons = resultCard.icons.split(',').map(icon => icon.trim());

    icons.forEach(icon => {
        console.log("Resolving icon:", icon);
        switch (icon) {
            case 'Enemy':
                console.log("Enemy encounter:", resultCard.enemy);
                // The format is typically "Enemy=EnemyName"
                if (resultCard.enemy && typeof resultCard.enemy === 'string') { // Added check
                    const enemyMatch = resultCard.enemy.match(/^Enemy=(.+)$/);
                    if (enemyMatch && enemyMatch[1]) {
                        const enemyName = enemyMatch[1];
                        // Find the enemy card by name (assuming names are unique for now)
                        // A more robust approach might involve mapping names to IDs during data loading
                         // For now, let's search through all cards to find the enemy by name
                         const enemyCard = Object.values(getAllCardsData()).find(card => card.name === enemyName);

                    if (enemyCard) {
                        console.log("Found enemy card:", enemyCard);
                        initiateCombat(enemyCard); // Call a new function to handle combat
                    } else {
                        console.warn(`Enemy card not found for name: ${enemyName}`);
                    }

                } else {
                    console.warn("Could not parse enemy information from result card:", resultCard.enemy);
                    }
                } else {
                    console.warn("Enemy icon encountered, but no valid enemy data found on the card.", { enemy: resultCard.enemy });
                }
                break;
            case 'Loot':
                console.log("Loot found:", resultCard.loot);
                const lootOutcome = resultCard.loot; // Renamed for clarity

                if (lootOutcome && typeof lootOutcome === 'string') { // Added check for existence and type
                    if (lootOutcome === 'Empty') {
                         console.log("The loot chest is empty.");
                    } else if (lootOutcome === 'GainShard') {
                        console.log("Found a Shard of Brahm!");
                        updatePlayerStats('shards', 1);
                        // TODO: Check for win condition after gaining a shard
                    } else if (lootOutcome.startsWith('Loot=')) { // Check format for specific loot items
                        const lootMatch = lootOutcome.match(/^Loot=(.+)$/);
                        if (lootMatch && lootMatch[1]) {
                            const lootName = lootMatch[1];
                            // Attempt to find the loot card by name
                            const lootCard = Object.values(getAllCardsData()).find(card => card.name === lootName);
                            if (lootCard) {
                                console.log("Gained loot item from treasure:", lootCard.name);
                                playerStats.inventory.push(lootCard);
                                console.log("Player Inventory:", playerStats.inventory);
                                // TODO: Update UI to show new inventory item
                            } else {
                                console.warn(`Loot card not found for name: ${lootName}`);
                            }
                        } else {
                            console.warn("Could not parse loot information from result card:", lootOutcome);
                        }
                    } else {
                        console.warn("Unknown loot outcome format:", lootOutcome);
                    }
                } else {
                    console.warn("Loot icon encountered, but no valid loot data found on the card.", { lootOutcome });
                }
                break;
            case 'Trap':
                console.log("Trap encountered:", resultCard.trap);
                const trapEffect = resultCard.trap;

                if (trapEffect && typeof trapEffect === 'string') { // Added check for existence and type
                    if (trapEffect === 'None') {
                        console.log("No trap triggered.");
                    } else {
                        const hpMatch = trapEffect.match(/^HP -(\d+)$/);
                        const enMatch = trapEffect.match(/^EN -(\\d+)$/);

                        if (hpMatch && hpMatch[1]) {
                            const damage = parseInt(hpMatch[1], 10);
                            console.log(`Taking ${damage} damage from a trap.`);
                            updatePlayerStats('health', -damage);
                        } else if (enMatch && enMatch[1]) {
                            const energyLoss = parseInt(enMatch[1], 10);
                            console.log(`Losing ${energyLoss} energy from a trap.`);
                            updatePlayerStats('energy', -energyLoss);
                        } else {
                            console.warn("Could not parse trap effect:", trapEffect);
                        }
                    }
                } else {
                     console.warn("Trap icon encountered, but no valid trap effect data found on the card.", { trapEffect });
                }
                break;
                case 'Campsite':
                    console.log("Campsite found.");
                    console.log("Campsite Options: 1. Gain +2 HP and +1 Energy, or 2. Gain +1 Food.");
                    // TODO: Implement player choice for Campsite benefit
                    // For now, no effect is applied automatically
                    break;
            case 'Water':
                console.log("Water encountered.");
                // Check if the player has the Gill Net trapping (LT01)
                const gillNetCard = playerStats.inventory.find(item => item.id === 'LT01'); // Using ID based on loot.json

                if (gillNetCard) {
                    console.log("Using Gill Net.");
                    let successes = 0;
                    const rolls = [];
                    // Roll 3 dice for Gill Net
                    for (let i = 0; i < 3; i++) {
                        const [roll1] = rollDice(); // rollDice returns [roll1, roll2], we only need one for a d6
                        rolls.push(roll1);
                        // Assuming a success is rolling a 4, 5, or 6 on a d6
                        if (roll1 >= 4) {
                            successes++;
                        }
                    }
                    console.log(`Gill Net rolls: ${rolls.join(', ')}. Successes: ${successes}`);
                    if (successes > 0) {
                        console.log(`Gaining ${successes} food from Gill Net.`);
                        updatePlayerStats('rations', successes);
                    } else {
                        console.log("No food gained from Gill Net.");
                    }
                } else {
                    console.log("No Gill Net to use.");
                    // TODO: Implement default Water icon resolution if any
                }
                break; // Added break statement
            case 'Treasure':
                console.log("Treasure found.");
                // Treasure icon resolution often involves gaining loot or a shard
                const treasureOutcome = resultCard.loot; // Assuming treasure outcome is in the loot field for now

                if (treasureOutcome === 'GainShard') {
                    console.log("Found a Shard of Brahm!");
                    updatePlayerStats('shards', 1);
                    // TODO: Check for win condition after gaining a shard
                } else if (treasureOutcome && typeof treasureOutcome === 'string' && treasureOutcome.startsWith('Loot=')) {
                    // If it starts with 'Loot=', use the loot handling logic
                    console.log("Treasure contains loot.");
                    const lootMatch = treasureOutcome.match(/^Loot=(.+)$/);
                    if (lootMatch && lootMatch[1]) {
                        const lootName = lootMatch[1];
                         if (lootName === 'Empty') {
                            console.log("The treasure chest is empty.");
                         } else {
                             // Attempt to find the loot card by name
                             const lootCard = Object.values(getAllCardsData()).find(card => card.name === lootName);
                            if (lootCard) {
                                console.log("Gained loot item from treasure:", lootCard.name);
                                playerStats.inventory.push(lootCard);
                                console.log("Player Inventory:", playerStats.inventory);
                                // TODO: Update UI to show new inventory item
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
                console.log("Random event:", resultCard.random);
                const randomEvent = resultCard.random;

                if (randomEvent && typeof randomEvent === 'string') { // Added check for existence and type
                    const refMatch = randomEvent.match(/^Ref=(.+)$/);

                    if (refMatch && refMatch[1]) {
                        const refName = refMatch[1];
                        // Find the reference card by name
                         const refCard = Object.values(getAllCardsData()).find(card => card.name === refName);

                        if (refCard) {
                            console.log("Encountered Reference Card:", refCard.name);
                            // TODO: Implement specific logic for each Reference Card type based on GAMERULES.md section 8.0 Errata
                            handleReferenceCard(refCard); // Call a new function to handle reference card effects
                        } else {
                            console.warn(`Reference card not found for name: ${refName}`);
                        }
                    } else if (randomEvent.startsWith('Enemy=')) {
                         // Some random events are directly enemy encounters
                        console.log("Random event is an enemy encounter.");
                         const enemyMatch = randomEvent.match(/^Enemy=(.+)$/);
                        if (enemyMatch && enemyMatch[1]) {
                            const enemyName = enemyMatch[1];
                            const enemyCard = Object.values(getAllCardsData()).find(card => card.name === enemyName);
                             if (enemyCard) {
                                console.log("Found enemy card:", enemyCard);
                                initiateCombat(enemyCard); // Initiate combat with this enemy
                            } else {
                                console.warn(`Enemy card not found for name: ${enemyName}`);
                            }
                        }
                    } else {
                        console.warn("Could not parse random event format:", randomEvent);
                    }
                } else {
                    console.warn("Random icon encountered, but no valid random event data found on the card.", { randomEvent });
                }
                break;
            default:
                console.warn("Unknown icon encountered:", icon);
        }
    });
     // TODO: After all icons are resolved, proceed with the game turn (e.g., offer resolve/skip for next room)
}

// Function to handle Reference Card effects
function handleReferenceCard(refCard) {
    console.log("Handling Reference Card effect for:", refCard.name);
    // Implement logic based on refCard.name and GAMERULES.md
    switch (refCard.name) {
        case 'Altar':
            console.log("Resolving Altar effect. Checking player Favor...");
            const currentFavor = playerStats.favor;
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
                updatePlayerStats('health', 4);
                updatePlayerStats('energy', 3);
            } else if (currentFavor >= 6) {
                console.log("Favor is 6-7. Gain +3 HP and +2 Energy.");
                updatePlayerStats('health', 3);
                updatePlayerStats('energy', 2);
            } else if (currentFavor >= 4) {
                console.log("Favor is 4-5. Gain +2 HP and +1 Energy.");
                updatePlayerStats('health', 2);
                updatePlayerStats('energy', 1);
            } else if (currentFavor >= 0) {
                 console.log("Favor is 0-3. Gain +1 HP.");
                 updatePlayerStats('health', 1);
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
                updatePlayerStats('health', -1);
            } else if (groveRoll === 2) {
                console.log("Grove effect: No effect.");
            } else if (groveRoll >= 3 && groveRoll <= 4) {
                console.log("Grove effect: Gain 1 Ration.");
                updatePlayerStats('rations', 1);
            } else if (groveRoll >= 5 && groveRoll <= 6) {
                console.log("Grove effect: Gain 2 Rations.");
                updatePlayerStats('rations', 2);
            }
            break;
        case 'Labyrinth':
            console.log("Resolving Labyrinth effect.");
            // TODO: Implement Labyrinth effect (lose resource) based on GAMERULES.md section 8.0 Errata
            console.log("Resolving Labyrinth effect. Must lose a resource.");
            // Priority: 1 Ration, then 2 Energy, then 3 Health

            if (playerStats.rations >= 1) {
                console.log("Labyrinth effect: Losing 1 Ration.");
                updatePlayerStats('rations', -1);
            } else if (playerStats.energy >= 2) {
                 console.log("Labyrinth effect: Losing 2 Energy.");
                 updatePlayerStats('energy', -2);
            } else if (playerStats.health > 0) { // Corrected: Apply damage as long as health is above 0
                 const damageToTake = Math.min(playerStats.health, 3); // Take max 3 damage, not more than current health
                 console.log(`Labyrinth effect: Losing ${damageToTake} HP.`);
                 updatePlayerStats('health', -damageToTake);
                 // TODO: Check for player defeat after losing health (handled by updatePlayerStats)
            } else {
                 // Player health is already 0 or less, no further health loss
                console.log("Labyrinth effect: Player health already low, no further health loss from Labyrinth.");
            }
            break;
        case 'Pigman':
            console.log("Resolving Pigman effect.");
            // Pigman effect: gain 1 favor or discard Turnip to gain shard
            const turnipIndex = playerStats.inventory.findIndex(item => item.id === 'LT06'); // Find Turnip by ID

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


// Function to update player stats (can be used by icon handlers)
function updatePlayerStats(stat, amount) {
    if (playerStats.hasOwnProperty(stat)) {
        playerStats[stat] += amount;
        // Ensure stats don't go below zero or above max (for health and energy)
        if (stat === 'health') {
            playerStats.health = Math.max(0, Math.min(playerStats.health, playerStats.maxHealth));
        } else if (stat === 'energy') {
             playerStats.energy = Math.max(0, Math.min(playerStats.energy, playerStats.maxEnergy));
        }
        console.log(`${stat} updated by ${amount}. New value: ${playerStats[stat]}`);
        // TODO: Update UI display for the specific stat

        // Check for player defeat after health changes
        if (stat === 'health' && playerStats.health <= 0) {
            checkWinLossConditions(); // Check for loss due to health depletion
        }

    } else {
        console.warn(`Attempted to update unknown stat: ${stat}`);
    }
}


// Function to simulate rolling two six-sided dice
function rollDice() {
    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;
    console.log(`Dice rolled: ${roll1}, ${roll2}`);
    return [roll1, roll2];
}


// Placeholder for combat initiation (will be expanded)
async function initiateCombat(enemyCard) {
    console.log("Initiating combat with", enemyCard.name);
    // We need to track the enemy's current health during combat
    let currentEnemyHealth = enemyCard.health;
    let isPlayerTurn = true; // Player always attacks first

    console.log(`Enemy Stats - Initial Health: ${currentEnemyHealth}, Attack: ${enemyCard.attack}, Defense: ${enemyCard.defense}, Favor: ${enemyCard.favor}`);

    // Basic combat loop
    while (currentEnemyHealth > 0 && playerStats.health > 0) {
        if (isPlayerTurn) {
            console.log("Player's turn to attack...");
            // TODO: Implement player energy expenditure decision (for now, assume 0 energy spent)
            const energySpent = 0; // Placeholder
            let playerBonusDamage = 0; // Placeholder based on energySpent and class abilities

            const [roll1, roll2] = rollDice();

            if (roll1 === roll2) {
                console.log("Doubles rolled! Player attack misses.");
                // Doubles result in a miss (zero damage)
                playerBonusDamage = 0; // Ensure no bonus damage is added on a miss
            }
             else {
                const rawAttackValue = Math.abs(roll1 - roll2);
                console.log(`Raw attack value: ${rawAttackValue}`);
                // TODO: Apply player abilities that affect raw attack or damage before defense

                const totalAttackDamage = rawAttackValue + playerBonusDamage;
                console.log(`Total attack damage before defense: ${totalAttackDamage}`);

                const damageAfterDefense = Math.max(0, totalAttackDamage - enemyCard.defense);
                console.log(`Damage after enemy defense: ${damageAfterDefense}`);

                currentEnemyHealth -= damageAfterDefense;
                console.log(`Enemy health remaining: ${currentEnemyHealth}`);
            }

            // Check if enemy is defeated after player attack
            if (currentEnemyHealth <= 0) {
                console.log(`${enemyCard.name} defeated!`);
                // TODO: Handle enemy defeat (gain favor, etc. according to GAMERULES.md section 5.2 and card abilities)
                // For now, just log favor gain
                console.log(`Gaining ${enemyCard.favor} favor from defeating ${enemyCard.name}.`);
                updatePlayerStats('favor', enemyCard.favor);
                checkWinLossConditions(); // Check for win after gaining favor (potentially from Possessor)
                break; // Exit combat loop
            }

        } else {
            console.log(`${enemyCard.name}'s turn to attack...`);

            const [roll1, roll2] = rollDice();

            if (roll1 === roll2) {
                console.log("Doubles rolled! Enemy attack misses.");
                // Doubles result in a miss (zero damage)
            }
             else {
                // Damage dealt is the difference between the two dice results + enemy attack value
                let damageDealt = Math.abs(roll1 - roll2) + enemyCard.attack;
                console.log(`Raw enemy damage: ${Math.abs(roll1 - roll2)}, Enemy Attack Bonus: ${enemyCard.attack}`);
                console.log(`Total enemy damage before defense: ${damageDealt}`);

                // TODO: Apply player defense/abilities that reduce incoming damage (e.g., Shield)
                // For now, directly apply damage
                 console.log(`Player health before taking damage: ${playerStats.health}`);
                updatePlayerStats('health', -damageDealt);
                console.log(`Player health after taking damage: ${playerStats.health}`);
            }

            // Check if player is defeated after enemy attack (handled in updatePlayerStats now)
             if (playerStats.health <= 0) {
                 break; // Exit combat loop if player is defeated
             }
        }

        // Switch turns
        isPlayerTurn = !isPlayerTurn;
         // TODO: Add a small delay or wait for player action in a real game loop
    }

    // Combat ended. Determine outcome and proceed.
    if (currentEnemyHealth <= 0) {
        console.log("Combat ended: Enemy defeated.");
        // TODO: Continue resolving other icons in the room or proceed to next step
    } else if (playerStats.health <= 0) {
        console.log("Combat ended: Player defeated.");
        // Player defeat is now handled by checkWinLossConditions called from updatePlayerStats
    }
     // TODO: After combat, the game flow needs to continue (e.g., resolve next icon or proceed to next room)
}

export { initializePlayer, startDungeonLevel, handleRoom, updatePlayerStats, playerStats };
