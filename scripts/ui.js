// Get references to the card images
const roomCardImage = document.getElementById('room-card-image');
const resultCardImage = document.getElementById('result-card-image');
const raceCardImage = document.getElementById('race-card-image');
const classCardImage = document.getElementById('class-card-image');
const enemyCardImage = document.getElementById('enemy-card-image');
const enemyCardDisplay = document.getElementById('enemy-card-display');

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
    if (raceCardImage && card && card.image) {
        raceCardImage.src = card.image;
        raceCardImage.style.display = 'block';
    }
}

// Function to display class card
export function displayClassCard(card) {
    if (classCardImage && card && card.image) {
        classCardImage.src = card.image;
        classCardImage.style.display = 'block';
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
        roomDecisionButtons.style.display = 'flex'; // Or 'block', depending on desired layout
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
    const deckPlaceholder = document.getElementById('deck-placeholder');
    if (deckPlaceholder && card && card.image) {
        deckPlaceholder.innerHTML = `<img src="${card.image}" alt="Dungeon Room Card" style="width:100px;height:150px;object-fit:cover;border-radius:12px;">`;
    } else if (deckPlaceholder) {
        deckPlaceholder.innerHTML = 'Dungeon Deck';
    }
}
