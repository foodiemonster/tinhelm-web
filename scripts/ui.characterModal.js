// Character selection modal UI logic for Tin Helm Web
// This module handles the modal for race/class selection with card flipping animations

import { RaceCard, ClassCard, getAllCardsData } from './data/cards.js';

let selectedRaceId = null;
let selectedClassId = null;
let raceCards = [];
let classCards = [];

export function showCharacterModal(allRaces, allClasses, onConfirm) {
    // If React is available, use a React modal (CDN version)
    if (window.ReactAvailable && window.React && window.ReactDOM) {
        let reactRoot = document.getElementById('character-modal-react-root');
        if (!reactRoot) {
            reactRoot = document.createElement('div');
            reactRoot.id = 'character-modal-react-root';
            document.body.appendChild(reactRoot);
        }
        // Use a persistent React root for createRoot API
        if (!reactRoot._reactRootContainer) {
            reactRoot._reactRootContainer = window.ReactDOM.createRoot(reactRoot);
        }
        const CharacterModal = (props) => {
            const [step, setStep] = window.React.useState('race');
            const [selectedRace, setSelectedRace] = window.React.useState(null);
            const [selectedClass, setSelectedClass] = window.React.useState(null);
            const [allowedClasses, setAllowedClasses] = window.React.useState(props.allClasses);
            const handleRace = (raceId) => {
                setSelectedRace(raceId);
                setStep('class');
                const race = props.allRaces.find(r => r.id === raceId);
                let filtered = props.allClasses;
                if (race && race.classRestriction) {
                    filtered = props.allClasses.filter(cls => cls.name !== race.classRestriction);
                }
                setAllowedClasses(filtered);
                setSelectedClass(null);
            };
            const handleClass = (classId) => {
                setSelectedClass(classId);
            };
            const handleConfirm = () => {
                if (selectedRace && selectedClass) {
                    if (reactRoot._reactRootContainer) {
                        reactRoot._reactRootContainer.unmount();
                    }
                    props.onConfirm(selectedRace, selectedClass);
                }
            };
            const handleReselect = () => {
                setStep('race');
                setSelectedRace(null);
                setSelectedClass(null);
                setAllowedClasses(props.allClasses);
            };
            return window.React.createElement(
                'div', { className: 'modal-overlay', role: 'dialog', 'aria-modal': 'true' },
                window.React.createElement('div', { className: 'modal-content responsive-modal', id: 'character-modal-content' },
                    window.React.createElement('h2', null, step === 'race' ? 'Choose Your Race' : 'Choose Your Class'),
                    step === 'race' && window.React.createElement('div', { className: 'card-row', id: 'race-card-row' },
                        props.allRaces.map(race =>
                            window.React.createElement('div', {
                                className: 'modal-card race-card' + (selectedRace === race.id ? ' selected' : ''),
                                key: race.id,
                                'data-id': race.id,
                                onClick: () => handleRace(race.id)
                            },
                                window.React.createElement('img', { src: race.image, alt: race.name })
                            )
                        )
                    ),
                    step === 'class' && window.React.createElement('div', { className: 'card-row', id: 'class-card-row' },
                        allowedClasses.map(cls =>
                            window.React.createElement('div', {
                                className: 'modal-card class-card' + (selectedClass === cls.id ? ' selected' : ''),
                                key: cls.id,
                                'data-id': cls.id,
                                onClick: () => handleClass(cls.id)
                            },
                                window.React.createElement('img', { src: cls.image, alt: cls.name })
                            )
                        )
                    ),
                    step === 'class' && window.React.createElement('div', { className: 'modal-actions', id: 'modal-actions', style: { display: 'flex' } },
                        window.React.createElement('button', { id: 'confirm-selection-btn', onClick: handleConfirm, disabled: !selectedClass }, 'Confirm'),
                        window.React.createElement('button', { id: 'reselect-btn', onClick: handleReselect }, 'Reselect Race')
                    )
                )
            );
        };
        reactRoot._reactRootContainer.render(
            window.React.createElement(CharacterModal, { allRaces, allClasses, onConfirm })
        );
        // Clean up on close
        reactRoot._unmount = () => reactRoot._reactRootContainer.unmount();
        return;
    }
    // Fallback: Vanilla JS modal
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
        cardDiv.innerHTML = `<img src="${race.image}" alt="${race.name}">`;
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
            cardDiv.innerHTML = `<img src="${cls.image}" alt="${cls.name}">`;
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
