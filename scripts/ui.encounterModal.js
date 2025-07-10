import { hideCombatBoard } from './ui.combatBoard.js';
import { animateDiceRoll } from './ui.dice.js';

/**
 * Renders a modal-like interface directly within the #combat-area container.
 * This is used for in-game events like finding loot, reference cards, etc.,
 * to provide a more integrated experience than a full-screen overlay.
 *
 * @param {object} options - The configuration for the modal.
 * @param {string} [options.title=''] - The title to display at the top of the modal.
 * @param {string} [options.message=''] - The main text content of the modal.
 * @param {string} [options.image] - An optional image URL to display.
 * @param {Array<object>} [options.choices=[]] - An array of button choices. Each object is { label, value }.
 * @param {function(string)} [options.onChoice] - Callback function executed when a choice is made.
 * @param {boolean} [options.dieRoll=false] - If true, shows dice and a roll button.
 * @param {number} [options.dieCount=1] - The number of dice to roll.
 * @param {function(Array<number>|number)} [options.onRoll] - Callback executed after dice are rolled.
 */
export async function showEncounterModal({ title = '', message = '', image, choices = [], onChoice, dieRoll = false, dieCount = 1, onRoll }) {
    const encounterArea = document.getElementById('combat-area');
    if (!encounterArea) {
        console.error('Encounter area (#combat-area) not found.');
        return;
    }

    // Before clearing, unmount any existing React component (like the combat board)
    await hideCombatBoard();

    // Clear previous content (e.g., combat board or another modal)
    encounterArea.innerHTML = '';

    const modalArea = document.createElement('div');
    modalArea.className = 'encounter-modal-area';

    let choicesHTML = '';
    if (choices && choices.length) {
        choicesHTML = `<div class="encounter-modal-actions">${choices.map(opt => `<button class="choice-btn" data-value="${opt.value}">${opt.label}</button>`).join('')}</div>`;
    }

    let dieRollHTML = '';
    if (dieRoll) {
        dieRollHTML = `
            <div class="encounter-dice-row" style="margin:1em 0;">
                ${Array.from({ length: dieCount || 1 }).map(() => `<span class="encounter-die" style="font-size:2em;display:inline-block;min-width:1.5em;text-align:center;margin-right:0.3em;">?</span>`).join('')}
            </div>
            <div>
                <button id="encounter-roll-btn">${dieCount > 1 ? `Roll ${dieCount} Dice` : 'Roll Die'}</button>
            </div>
        `;
    }

    modalArea.innerHTML = `
        ${title ? `<h2>${title}</h2>` : ''}
        ${image ? `<div class="encounter-modal-image-wrap"><img src="${image}" alt="${title}" class="encounter-modal-image" style="max-width:220px;margin:0.5em auto;display:block;border-radius:12px;"></div>` : ''}
        ${message ? `<div class="encounter-modal-message">${message}</div>` : ''}
        ${dieRollHTML}
        ${choicesHTML}
    `;

    encounterArea.appendChild(modalArea);

    // Add event listeners
    if (choices && choices.length) {
        modalArea.querySelectorAll('.choice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.target.getAttribute('data-value');
                if (onChoice) {
                    onChoice(value);
                }
                hideEncounterModal(); // Automatically close on choice
            });
        });
    }

    if (dieRoll) {
        const rollBtn = document.getElementById('encounter-roll-btn');
        if (rollBtn) {
            rollBtn.onclick = () => {
                rollBtn.disabled = true;
                const rolls = Array.from({ length: dieCount || 1 }, () => Math.floor(Math.random() * 6) + 1);
                const diceEls = modalArea.querySelectorAll('.encounter-die');
                
                animateDiceRoll(diceEls, rolls, () => {
                    diceEls.forEach((el, i) => { el.textContent = rolls[i]; });
                    if (onRoll) {
                        onRoll(dieCount > 1 ? rolls : rolls[0]);
                    }
                    // If there are no choices, close the modal after the roll animation
                    if (!choices || choices.length === 0) {
                        setTimeout(hideEncounterModal, 1000);
                    }
                });
            };
        }
    }
}

/**
 * Clears the content of the #combat-area container.
 */
export function hideEncounterModal() {
    const encounterArea = document.getElementById('combat-area');
    if (encounterArea) {
        encounterArea.innerHTML = '';
    }
}
