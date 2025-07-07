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
    {left:133, top:204}, // 0
    {left:133, top:167}, // 1
    {left:133, top:131}, // 2
    {left:133, top:94},  // 3
    {left:133, top:58},  // 4
    {left:58,  top:204}, // 5
    {left:58,  top:167}, // 6
    {left:58,  top:131}, // 7
    {left:58,  top:94},  // 8
    {left:58,  top:58},  // 9
    {left:36,  top:204}, // 10
    {left:36,  top:167}, // 11
    {left:36,  top:131}, // 12
    {left:36,  top:94},  // 13
    {left:36,  top:58}   // 14
  ],
  energy: [
    {left:38,top:38},{left:88,top:38},{left:138,top:38},{left:38,top:88},{left:88,top:88},{left:138,top:88}
  ],
  rations: [
    {left:38,top:188},{left:88,top:188},{left:138,top:188},{left:38,top:238},{left:88,top:238},{left:138,top:238}
  ],
  favor: [
    {left:38,top:38},{left:88,top:38},{left:138,top:38},{left:38,top:88},{left:88,top:88},{left:138,top:88},
    {left:38,top:138},{left:88,top:138},{left:138,top:138},{left:38,top:188},{left:88,top:188},{left:138,top:188}
  ],
  dungeon: [
    {left:30,top:38},{left:60,top:38},{left:90,top:38},{left:120,top:38},{left:150,top:38},{left:180,top:38},
    {left:30,top:68},{left:60,top:68},{left:90,top:68},{left:120,top:68},{left:150,top:68},{left:180,top:68}
  ],
  enemy: [
    {left:30,top:188},{left:60,top:188},{left:90,top:188},{left:120,top:188},{left:150,top:188},{left:180,top:188},
    {left:30,top:218},{left:60,top:218},{left:90,top:218},{left:120,top:218},{left:150,top:218},{left:180,top:218}
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
  let idx = Math.max(0, Math.min(posArr.length-1, value-1));
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
