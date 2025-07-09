// Get references to the card images
const roomCardImage = document.getElementById('room-card-image');
const resultCardImage = document.getElementById('result-card-image');
const raceCardImage = document.getElementById('race-card-image');
const classCardImage = document.getElementById('class-card-image');
const enemyCardImage = document.getElementById('enemy-card-image');
const enemyCardDisplay = document.getElementById('enemy-card-display');
const deckCardImage = document.getElementById('deck-card-image'); // Added for deck slot

// Function to display room card
export function displayRoomCard(card) {
    if (roomCardImage && card && card.image) {
        roomCardImage.src = card.image;
        roomCardImage.style.display = 'block';
    } else if (roomCardImage) {
        roomCardImage.src = '';
        roomCardImage.style.display = 'none';
    }
}

// Function to display result card
export function displayResultCard(card) {
    if (resultCardImage && card && card.image) {
        resultCardImage.src = card.image;
        resultCardImage.style.display = 'block';
    } else if (resultCardImage) {
        resultCardImage.src = '';
        resultCardImage.style.display = 'none';
    }
}

// Function to display race card
export function displayRaceCard(card) {
    const raceCardDisplay = document.getElementById('race-card-display');
    if (raceCardDisplay) {
        if (card && card.image) {
            raceCardDisplay.innerHTML = `<img src="${card.image}" alt="${card.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            raceCardDisplay.innerHTML = 'Race';
        }
    }
}

// Function to display class card
export function displayClassCard(card) {
    const classCardDisplay = document.getElementById('class-card-display');
    if (classCardDisplay) {
        if (card && card.image) {
            classCardDisplay.innerHTML = `<img src="${card.image}" alt="${card.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            classCardDisplay.innerHTML = 'Class';
        }
    }
}

// Function to display enemy card
export function displayEnemyCard(card, defeated = false) {
    if (enemyCardImage && enemyCardDisplay && card && card.image) {
        enemyCardImage.src = card.image;
        enemyCardDisplay.style.display = 'block';
        enemyCardDisplay.style.position = 'absolute';
        enemyCardDisplay.style.top = '50%';
        enemyCardDisplay.style.left = '50%';
        enemyCardDisplay.style.transform = 'translate(-50%, -50%)';
        enemyCardDisplay.style.zIndex = '10';
        if (defeated) {
            enemyCardImage.style.filter = 'grayscale(100%) brightness(0.5) sepia(1) hue-rotate(-50deg) saturate(6)';
            enemyCardImage.style.boxShadow = '0 0 16px 4px #a00, 0 0 32px 8px #000 inset';
        } else {
            enemyCardImage.style.filter = '';
            enemyCardImage.style.boxShadow = '';
        }
    }
}

// Function to hide enemy card
export function hideEnemyCard() {
    if (enemyCardDisplay) {
        enemyCardDisplay.style.display = 'none';
    }
}

// Get references to the room decision buttons and container
const roomDecisionButtons = document.getElementById('room-decision-buttons');
const resolveButton = document.getElementById('resolve-button');
const skipButton = document.getElementById('skip-button');

// Function to show the room decision buttons
export function showRoomDecisionButtons() {
    if (roomDecisionButtons) {
        roomDecisionButtons.style.display = 'flex';
        if (resolveButton) resolveButton.style.display = 'inline-block';
        if (skipButton) skipButton.style.display = 'inline-block';
        const nextRoomBtn = document.getElementById('next-room-btn');
        if (nextRoomBtn) nextRoomBtn.style.display = 'none';
    }
}

// Function to hide the room decision buttons
export function hideRoomDecisionButtons() {
    if (roomDecisionButtons) {
        roomDecisionButtons.style.display = 'none';
    }
}

// Function to wait for the player's room decision (Resolve or Skip)
export function awaitPlayerRoomDecision() {
    return new Promise((resolve) => {
        // Event listener for the Resolve button
        function resolveHandler() {
            hideRoomDecisionButtons();
            resolve('RESOLVE');
            // Clean up listeners
            resolveButton.removeEventListener('click', resolveHandler);
            skipButton.removeEventListener('click', skipHandler);
        }

        // Event listener for the Skip button
        function skipHandler() {
            hideRoomDecisionButtons();
            resolve('SKIP');
            // Clean up listeners
            resolveButton.removeEventListener('click', resolveHandler);
            skipButton.removeEventListener('click', skipHandler);
        }

        // Add event listeners
        if (resolveButton) resolveButton.addEventListener('click', resolveHandler);
        if (skipButton) skipButton.addEventListener('click', skipHandler);

        // Show the buttons to the player
        showRoomDecisionButtons();
    });
}

// Function to update the stat values in the UI
export function updateStatDisplay(stat, value) {
    const statElement = document.getElementById(`stat-${stat}`);
    if (statElement) {
        const valueElement = statElement.querySelector('.value');
        if (valueElement) {
            valueElement.textContent = value;
        }
    }
}

// --- Card Zoom Overlay Logic ---
const cardZoomOverlay = document.getElementById('card-zoom-overlay');
const cardZoomImg = document.getElementById('card-zoom-img');

function showCardZoom(imageUrl, anchorElem) {
  if (cardZoomOverlay && cardZoomImg && anchorElem) {
    const rect = anchorElem.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    // Set overlay position and size to match the card
    cardZoomOverlay.style.left = (rect.left + scrollX) + 'px';
    cardZoomOverlay.style.top = (rect.top + scrollY) + 'px';
    cardZoomOverlay.style.width = rect.width + 'px';
    cardZoomOverlay.style.height = rect.height + 'px';
    cardZoomImg.src = imageUrl;
    cardZoomOverlay.classList.add('active');
    cardZoomOverlay.style.display = 'block';
    // Scale up from the center of the card
    cardZoomImg.style.transform = 'scale(2.3)';
    cardZoomImg.style.transition = 'transform 0.18s';
  }
}
function hideCardZoom() {
  if (cardZoomOverlay && cardZoomImg) {
    cardZoomOverlay.classList.remove('active');
    cardZoomOverlay.style.display = 'none';
    cardZoomImg.src = '';
    cardZoomImg.style.transform = '';
  }
}
if (cardZoomOverlay) {
  cardZoomOverlay.addEventListener('mouseenter', hideCardZoom);
  cardZoomOverlay.addEventListener('click', hideCardZoom);
}

// Function to display the player's inventory
export function displayInventory(inventory) {
    const inventorySection = document.getElementById('inventory-section');
    if (inventorySection) {
        // Clear existing inventory display
        inventorySection.innerHTML = '';

        // Loop through inventory and create card elements
            inventory.forEach(item => {
                const cardElement = document.createElement('div');
                cardElement.classList.add('inventory-card');
                if (item.image) {
                    const img = document.createElement('img');
                    img.src = item.image;
                    img.alt = item.name;
                    // --- Card Zoom Mouseover ---
                    img.addEventListener('mouseenter', (e) => showCardZoom(item.image, img));
                    img.addEventListener('mouseleave', hideCardZoom);
                    img.addEventListener('touchstart', (e) => showCardZoom(item.image, img), {passive:true});
                    img.addEventListener('touchend', hideCardZoom, {passive:true});
                    cardElement.appendChild(img);
                } else {
                    cardElement.textContent = item.name;
                }
                // Add "Use" button for anytime-usable loot (Potion, Turnip) and Scroll (TRA04)
                if (item.id === "LT08" || item.id === "LT06" || item.id === "TRA04" || item.id === "TRA06") {
                    const useBtn = document.createElement('button');
                    useBtn.textContent = 'Use';
                    useBtn.className = 'inventory-use-btn';
                    useBtn.onclick = () => {
                        // Backend: processLootAbilitiesAndEffects with correct context
                        if (item.id === "LT08") {
                            // Potion (Loot): Use to gain health/energy
                            window.handleUseItem &&
                                window.handleUseItem(item.id);
                        } else if (item.id === "LT06") {
                            // Turnip (Loot): Discard anytime to gain +3 energy
                            window.handleDiscardItem &&
                                window.handleDiscardItem(item.id);
                        } else if (item.id === "TRA04") {
                            // Scroll (Trapping): Use to defeat undead enemy
                            window.processTrappingUse &&
                                window.processTrappingUse({
                                    trigger: "on_use_scroll",
                                    trappingId: item.id
                                });
                        } else if (item.id === "TRA06") {
                            // Potion (Trapping): Use to gain health/energy (handled by handleUseItem)
                            window.handleUseItem &&
                                window.handleUseItem(item.id);
                        }
                    };
                    cardElement.appendChild(useBtn);
                }
                inventorySection.appendChild(cardElement);
            });
    }
}

// Function to display the discard pile (last discarded room and result cards)
export function displayDiscardPile(roomCard, resultCard) {
    const discardRoomImg = document.getElementById('discard-room-image');
    const discardResultImg = document.getElementById('discard-result-image');
    if (discardRoomImg) {
        if (roomCard && roomCard.image) {
            discardRoomImg.src = roomCard.image;
            discardRoomImg.style.display = 'inline-block';
        } else {
            discardRoomImg.style.display = 'none';
        }
    }
    if (discardResultImg) {
        if (resultCard && resultCard.image) {
            discardResultImg.src = resultCard.image;
            discardResultImg.style.display = 'inline-block';
        } else {
            discardResultImg.style.display = 'none';
        }
    }
}

// Function to show the current dungeonRoom card in the deck slot (Slot 1)
export function displayDeckRoomCard(card) {
    if (deckCardImage && card && card.image) {
        deckCardImage.src = card.image;
        deckCardImage.style.display = 'block';
    } else if (deckCardImage) {
        deckCardImage.src = '';
        deckCardImage.style.display = 'none';
    }
}

// --- Tracker Cube Overlay Logic ---
// Map stat to cube id and card wrapper
const trackerCubeMap = {
  hp: { cube: 'cube-hp', wrapper: 'tracker-hp-wrapper', card: 'tracker-hp' },
  energy: { cube: 'cube-energy', wrapper: 'tracker-en-ration-wrapper', card: 'tracker-en-ration' },
  rations: { cube: 'cube-rations', wrapper: 'tracker-en-ration-wrapper', card: 'tracker-en-ration' },
  favor: { cube: 'cube-favor', wrapper: 'tracker-favor-wrapper', card: 'tracker-favor' },
  dungeon: { cube: 'cube-dungeon', wrapper: 'tracker-enemyhp-dungeonlevel-wrapper', card: 'tracker-enemyhp-dungeonlevel' },
  enemy: { cube: 'cube-enemy', wrapper: 'tracker-enemyhp-dungeonlevel-wrapper', card: 'tracker-enemyhp-dungeonlevel' },
};

// Position maps: for each stat, map value to {left, top} in px (relative to wrapper)
// These should be tuned to match the visual track positions on the PNGs
const trackerCubePositions = {
  hp: [
    {left:133, top:202}, // 0
    {left:133, top:167}, // 1
    {left:133, top:131}, // 2
    {left:133, top:94},  // 3
    {left:133, top:58},  // 4
    {left:83,  top:204}, // 5
    {left:83,  top:167}, // 6
    {left:83,  top:131}, // 7
    {left:83,  top:94},  // 8
    {left:83,  top:58},  // 9
    {left:36,  top:204}, // 10
    {left:36,  top:167}, // 11
    {left:36,  top:131}, // 12
    {left:36,  top:94},  // 13
    {left:36,  top:58}   // 14
  ],
  energy: [
    {left:76, top:274}, // 0
    {left:76, top:242}, // 1
    {left:76, top:206}, // 2
    {left:76, top:170},  // 3
    {left:76, top:133},  // 4
    {left:76,  top:96}, // 5
    {left:76,  top:62}, // 6
    {left:76,  top:23}, // 7
    {left:42,  top:242},  // 8
    {left:42,  top:58},  // 9
    {left:42,  top:170}, // 10
    {left:42,  top:133}, // 11
    {left:42,  top:96}, // 12
    {left:42,  top:61},  // 13
  ],
  rations: [
    {left:131, top:242}, // 0
    {left:131, top:206}, // 1
    {left:131, top:170}, // 2
    {left:131, top:133},  // 3
    {left:131, top:96},  // 4
    {left:131, top:62}, // 5
  ],
  favor: [
    {left:133, top:240}, // 0
    {left:133, top:203}, // 1
    {left:133, top:167}, // 2
    {left:133, top:131}, // 3
    {left:133, top:94},  // 4
    {left:133, top:58},  // 5
    {left:83,  top:204}, // 6
    {left:83,  top:167}, // 7
    {left:83,  top:131}, // 8
    {left:83,  top:94},  // 9
    {left:83,  top:58},  // 10
    {left:36,  top:204}, // 11
    {left:36,  top:167}, // 12
    {left:36,  top:131}, // 13
    {left:36,  top:94},  // 14
    {left:36,  top:58}   // 15
  ],
  dungeon: [
    {left:32, top:47}, // 0
    {left:32, top:47}, // 1
    {left:76, top:23}, // 2
    {left:127, top:27}, // 3
    {left:98, top:60},  // 4
    {left:138, top:78},  // 5
  ],
  enemy: [
    {left:129, top:244}, // 0
    {left:129, top:244}, // 1
    {left:129, top:208}, // 2
    {left:129, top:171},  // 3
    {left:129, top:135},  // 4
    {left:85,  top:244}, // 5
    {left:85,  top:208}, // 6
    {left:85,  top:171}, // 7
    {left:85,  top:135},  // 8
    {left:38,  top:244},  // 9
    {left:38,  top:208}, // 10
    {left:38,  top:171}, // 11
    {left:38,  top:135}, // 12
  ]
};

export function updateTrackerCube(stat, value) {
  const map = trackerCubeMap[stat];
  if (!map) return;
  const cube = document.getElementById(map.cube);
  const wrapper = document.getElementById(map.wrapper);
  if (!cube || !wrapper) return;
  // Clamp value to available positions
  const posArr = trackerCubePositions[stat];
  if (!posArr) return;
  let idx = Math.max(0, Math.min(posArr.length-1, value));
  const pos = posArr[idx];
  cube.style.left = pos.left + 'px';
  cube.style.top = pos.top + 'px';
  cube.style.display = 'block';
  // Set tooltip for accessibility and hover
  cube.title = value;
  cube.setAttribute('aria-label', value);
}

export function updateAllTrackerCubes(stats) {
  console.log('[updateAllTrackerCubes] stats:', stats);
  updateTrackerCube('hp', stats.hp);
  updateTrackerCube('energy', stats.energy);
  updateTrackerCube('rations', stats.food);
  updateTrackerCube('favor', stats.favor);
  updateTrackerCube('dungeon', stats.level);
  updateTrackerCube('enemy', stats.enemyHp);
}
