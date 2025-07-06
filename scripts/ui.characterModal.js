// Character selection modal UI logic for Tin Helm Web
// This module handles the modal for race/class selection with card flipping animations

import { RaceCard, ClassCard, getAllCardsData } from './data/cards.js';

let selectedRaceId = null;
let selectedClassId = null;
let raceCards = [];
let classCards = [];

export function showCharacterModal(allRaces, allClasses, onConfirm) {
    // Create modal overlay
    let modal = document.createElement('div');
    modal.id = 'character-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" id="character-modal-content">
        <h2>Choose Your Race</h2>
        <div class="card-row" id="race-card-row"></div>
        <div class="card-row" id="class-card-row" style="display:none;"></div>
        <div class="modal-actions" id="modal-actions" style="display:none;">
          <button id="confirm-selection-btn">Confirm</button>
          <button id="reselect-btn">Reselect Race</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Populate race cards
    const raceRow = modal.querySelector('#race-card-row');
    raceRow.innerHTML = '';
    allRaces.forEach(race => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'modal-card race-card';
        cardDiv.setAttribute('data-id', race.id);
        cardDiv.innerHTML = `<img src="${race.image}" alt="${race.name}"><div class="card-label">${race.name}</div>`;
        cardDiv.onclick = () => selectRace(race.id);
        raceRow.appendChild(cardDiv);
    });

    // Class row is empty initially
    const classRow = modal.querySelector('#class-card-row');
    classRow.innerHTML = '';

    let currentAllowedClasses = allClasses;

    function selectRace(raceId) {
        selectedRaceId = raceId;
        // Animate out race cards, animate in class cards
        raceRow.style.display = 'none';
        classRow.style.display = 'flex';
        modal.querySelector('h2').textContent = 'Choose Your Class';
        // Filter class cards by race restriction
        classRow.innerHTML = '';
        const race = allRaces.find(r => r.id === raceId);
        let allowedClasses = allClasses;
        if (race && race.classRestriction) {
            allowedClasses = allClasses.filter(cls => cls.name !== race.classRestriction);
        }
        allowedClasses.forEach(cls => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'modal-card class-card';
            cardDiv.setAttribute('data-id', cls.id); // Store the id string from class.json
            cardDiv.innerHTML = `<img src="${cls.image}" alt="${cls.name}"><div class="card-label">${cls.name}</div>`;
            cardDiv.onclick = () => selectClass(cls.id);
            classRow.appendChild(cardDiv);
        });
        Array.from(classRow.children).forEach(cardDiv => {
            cardDiv.classList.remove('selected');
        });
        selectedClassId = null;
        document.getElementById('modal-actions').style.display = 'none';
    }

    function selectClass(classId) {
        selectedClassId = classId;
        Array.from(classRow.children).forEach(cardDiv => {
            cardDiv.classList.remove('selected');
            if (cardDiv.getAttribute('data-id') === classId) {
                cardDiv.classList.add('selected');
            }
        });
        document.getElementById('modal-actions').style.display = 'flex';
    }

    // Confirm and Reselect logic
    modal.querySelector('#confirm-selection-btn').onclick = () => {
        // Always get the selected class from the selected card's data-id
        const selectedCard = classRow.querySelector('.modal-card.selected');
        const confirmedClassId = selectedCard ? selectedCard.getAttribute('data-id') : null;
        if (selectedRaceId && confirmedClassId) {
            // Debug log to verify correct class id
            const debugClass = allClasses.find(cls => cls.id === confirmedClassId);
            console.log('CONFIRM: Race ID:', selectedRaceId, 'Class ID:', confirmedClassId, 'Class Name:', debugClass ? debugClass.name : 'NOT FOUND');
            document.body.removeChild(modal);
            // Always use the class ID (absolute, from class.json) for the callback
            onConfirm(selectedRaceId, confirmedClassId);
        }
    };
    modal.querySelector('#reselect-btn').onclick = () => {
        classRow.style.display = 'none';
        raceRow.style.display = 'flex';
        modal.querySelector('h2').textContent = 'Choose Your Race';
        selectedRaceId = null;
        selectedClassId = null;
        document.getElementById('modal-actions').style.display = 'none';
    };
}
