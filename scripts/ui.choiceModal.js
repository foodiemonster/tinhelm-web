/*
Choice & Dice Roll Modal for Tin Helm Web
Usage: showChoiceModal({ title, message, choices, onChoice, dieRoll, dieCount, onRoll, image })
- choices: array of { label, value }
- onChoice: callback(value)
- dieRoll: if true, show dice and a 'Roll Dice' button
- dieCount: number of dice to roll (default 1)
- onRoll: callback(rollValue or [rolls])
*/

export function showChoiceModal({ title = '', message = '', choices = [], onChoice, dieRoll = false, dieCount = 1, onRoll, image, isTrappingGrid = false, raceCardImage = null }) {
    console.log("showChoiceModal called for", title || message || "modal");
    // --- FORCE VANILLA JS MODAL FOR DEBUGGING ---
    // if (window.ReactAvailable && window.React && window.ReactDOM) {
    //     ... (React modal code skipped for debugging)
    //     return;
    // }
    // Fallback: Vanilla JS modal
    let oldModal = document.getElementById('choice-modal');
    if (oldModal) oldModal.remove();
    const modal = document.createElement('div');
    modal.id = 'choice-modal';
    modal.className = 'modal-overlay';
    if (isTrappingGrid && raceCardImage && choices && choices.length) {
        // Special layout for trapping selection (now 3x3 grid, no labels)
        modal.innerHTML = `
          <div class="modal-content choice-modal-content responsive-modal" role="dialog" aria-modal="true">
            ${title ? `<h2>${title}</h2>` : ''}
            <div class="trapping-modal-flex">
              <div class="trapping-modal-race-card">
                <img src="${raceCardImage}" alt="Race Card" class="trapping-modal-race-img" />
              </div>
              <div class="trapping-modal-grid">
                ${choices.map((opt, i) => `
                  <div class="trapping-modal-card" data-value="${opt.value}">
                    <img src="${opt.image}" alt="${opt.label}" />
                  </div>
                `).join('')}
              </div>
            </div>
            <button class="modal-confirm-btn" style="margin-top:1.2em;min-width:120px;" disabled>Confirm</button>
          </div>
        `;
    } else {
        // Modern layout: Title on top, card art left, text/buttons right
        modal.innerHTML = `
          <div class="modal-content choice-modal-content responsive-modal" role="dialog" aria-modal="true" style="display:flex;flex-direction:column;align-items:stretch;">
            ${title ? `<h2 style=\"margin-bottom:0.7em;\">${title}</h2>` : ''}
            <div style="display:flex;flex-direction:row;gap:1.5em;align-items:flex-start;">
              ${image ? `<div class=\"choice-modal-image-wrap\" style=\"flex:0 0 220px;\"><img src=\"${image}\" alt=\"${title}\" class=\"choice-modal-image\" style=\"max-width:220px;margin:0.5em auto;display:block;border-radius:12px;box-shadow:0 2px 12px #0002;\"></div>` : ''}
              <div style="flex:1;display:flex;flex-direction:column;align-items:flex-start;">
                ${message ? `<div class=\"choice-modal-message\" style=\"margin-bottom:1em;\">${message}</div>` : ''}
                ${dieRoll ? `<div class=\"choice-dice-row\" style=\"margin:1em 0;\">${
                    Array.from({ length: dieCount || 1 }).map(() =>
                        `<span class=\"choice-die\" style=\"font-size:2em;display:inline-block;min-width:1.5em;text-align:center;margin-right:0.3em;\">?</span>`
                    ).join('')
                }<div><button id=\"choice-roll-btn\">${dieCount > 1 ? `Roll ${dieCount} Dice` : 'Roll Die'}</button></div></div>` : ''}
                ${choices && choices.length ? `<div class=\"choice-modal-actions\" style=\"margin-top:1em;\">${choices.map(opt => `<button class=\"choice-btn modal-confirm-btn\" data-value=\"${opt.value}\">${opt.label}</button>`).join('')}</div>` : ''}
              </div>
            </div>
          </div>
        `;
    }
    document.body.appendChild(modal);
    console.log("Modal element added to DOM");
    // Add event listeners for choice buttons (vanilla JS fallback)
    if (choices && choices.length) {
        const btns = modal.querySelectorAll('.choice-btn');
        btns.forEach(btn => {
            btn.onclick = () => {
                const value = btn.getAttribute('data-value');
                if (onChoice) onChoice(value);
                if (modal.parentNode) modal.parentNode.removeChild(modal);
            };
        });
    }
    if (dieRoll) {
        const rollBtn = document.getElementById('choice-roll-btn');
        let rolled = false;
        rollBtn.onclick = () => {
            if (rolled) return;
            rollBtn.disabled = true;
            setTimeout(() => {
                const rolls = [];
                for (let i = 0; i < (dieCount || 1); i++) {
                    rolls.push(Math.floor(Math.random() * 6) + 1);
                }
                const diceEls = modal.querySelectorAll('.choice-die');
                import('./ui.dice.js').then(({ animateDiceRoll }) => {
                    animateDiceRoll(diceEls, rolls, () => {
                        diceEls.forEach((el, i) => { el.textContent = rolls[i]; });
                        rolled = true;
                        rollBtn.disabled = true;
                        if (onRoll) onRoll(dieCount > 1 ? rolls : rolls[0]);
                        if (!choices || !choices.length) {
                            setTimeout(() => {
                                if (modal.parentNode) {
                                    modal.parentNode.removeChild(modal);
                                    console.log("Modal removed from DOM (dieRoll)");
                                }
                            }, 900);
                        }
                    });
                });
            }, 200);
        };
    }
    // --- Trapping grid selection logic ---
    if (isTrappingGrid && raceCardImage && choices && choices.length) {
        let selected = null;
        const cardEls = modal.querySelectorAll('.trapping-modal-card');
        const confirmBtn = modal.querySelector('.modal-confirm-btn');
        cardEls.forEach((card, idx) => {
            card.onclick = () => {
                const wasSelected = card.classList.contains('selected');
                cardEls.forEach((c, i) => {
                    c.classList.remove(
                        'selected',
                        'centered-left', 'centered-center', 'centered-right',
                        'centered-left-top', 'centered-center-top', 'centered-right-top',
                        'centered-left-bottom', 'centered-center-bottom', 'centered-right-bottom'
                    );
                });
                if (wasSelected) {
                    // Deselect if already selected
                    selected = null;
                    confirmBtn.disabled = true;
                } else {
                    card.classList.add('selected');
                    // Determine column: 0 (left), 1 (center), 2 (right)
                    const col = idx % 3;
                    const row = Math.floor(idx / 3); // 0 = top, 1 = bottom
                    let className = '';
                    if (row === 0) {
                        if (col === 0) className = 'centered-left-top';
                        else if (col === 1) className = 'centered-center-top';
                        else className = 'centered-right-top';
                    } else {
                        if (col === 0) className = 'centered-left-bottom';
                        else if (col === 1) className = 'centered-center-bottom';
                        else className = 'centered-right-bottom';
                    }
                    card.classList.add(className);
                    selected = card.getAttribute('data-value');
                    confirmBtn.disabled = false;
                }
            };
        });
        confirmBtn.onclick = () => {
            if (selected && onChoice) onChoice(selected);
            if (modal.parentNode) modal.parentNode.removeChild(modal);
        };
    }
};
