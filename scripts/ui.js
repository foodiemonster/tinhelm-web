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
    }
}

// Function to display result card
export function displayResultCard(card) {
    if (resultCardImage && card && card.image) {
        resultCardImage.src = card.image;
        resultCardImage.style.display = 'block';
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
export function displayEnemyCard(card) {
    if (enemyCardImage && enemyCardDisplay && card && card.image) {
        enemyCardImage.src = card.image;
        enemyCardDisplay.style.display = 'block';
        enemyCardDisplay.style.position = 'absolute';
        enemyCardDisplay.style.top = '50%';
        enemyCardDisplay.style.left = '50%';
        enemyCardDisplay.style.transform = 'translate(-50%, -50%)';
        enemyCardDisplay.style.zIndex = '10';
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

// Function to display the player's inventory
export function displayInventory(inventory) {
    const inventoryCardsContainer = document.getElementById('inventory-cards');

    if (inventoryCardsContainer) {
        // Clear existing inventory display
        inventoryCardsContainer.innerHTML = '';

        // Loop through inventory and create card elements
        inventory.forEach(item => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('card');
            cardElement.textContent = item.name; // Display card name or image, etc.
            inventoryCardsContainer.appendChild(cardElement);
        });
    }
}
