const roomCardImage = document.getElementById('room-card-image');
const resultCardImage = document.getElementById('result-card-image');
const raceCardImage = document.getElementById('race-card-image');
const classCardImage = document.getElementById('class-card-image');
const enemyCardImage = document.getElementById('enemy-card-image');
const enemyCardDisplay = document.getElementById('enemy-card-display');

export function displayRoomCard(card) {
    if (roomCardImage && card && card.image) {
        roomCardImage.src = card.image;
        roomCardImage.style.display = 'block'; // Ensure the image is visible
    }
}

export function displayResultCard(card) {
    if (resultCardImage && card && card.image) {
        resultCardImage.src = card.image;
        resultCardImage.style.display = 'block'; // Ensure the image is visible
    }
}

export function displayRaceCard(card) {
    if (raceCardImage && card && card.image) {
        raceCardImage.src = card.image;
        raceCardImage.style.display = 'block'; // Ensure the image is visible
    }
}

export function displayClassCard(card) {
    if (classCardImage && card && card.image) {
        classCardImage.src = card.image;
        classCardImage.style.display = 'block'; // Ensure the image is visible
    }
}

export function displayEnemyCard(card) {
    if (enemyCardImage && enemyCardDisplay && card && card.image) {
        enemyCardImage.src = card.image;
        enemyCardDisplay.style.display = 'block'; // Show the enemy card container
        // Temporary styles to ensure visibility during testing
        enemyCardDisplay.style.position = 'absolute';
        enemyCardDisplay.style.top = '50%';
        enemyCardDisplay.style.left = '50%';
        enemyCardDisplay.style.transform = 'translate(-50%, -50%)';
        enemyCardDisplay.style.zIndex = '10'; // Ensure it's on top
    }
}

export function hideEnemyCard() {
    if (enemyCardDisplay) {
        enemyCardDisplay.style.display = 'none'; // Hide the enemy card container
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
        const resolveHandler = () => {
            hideRoomDecisionButtons();
            resolve('RESOLVE');
            // Clean up listeners
            resolveButton.removeEventListener('click', resolveHandler);
            skipButton.removeEventListener('click', skipHandler);
        };

        // Event listener for the Skip button
        const skipHandler = () => {
            hideRoomDecisionButtons();
            resolve('SKIP');
            // Clean up listeners
            resolveButton.removeEventListener('click', resolveHandler);
            skipButton.removeEventListener('click', skipHandler);
        };

        // Add event listeners
        if (resolveButton) resolveButton.addEventListener('click', resolveHandler);
        if (skipButton) skipButton.addEventListener('click', skipHandler);

        // Show the buttons to the player
        showRoomDecisionButtons();
    });
}