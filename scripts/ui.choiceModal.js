/*
Choice & Dice Roll Modal for Tin Helm Web
Usage: showChoiceModal({ title, message, choices, onChoice, dieRoll, dieCount, onRoll, image })
- choices: array of { label, value }
- onChoice: callback(value)
- dieRoll: if true, show dice and a 'Roll Dice' button
- dieCount: number of dice to roll (default 1)
- onRoll: callback(rollValue or [rolls])
*/

export function showChoiceModal({ title = '', message = '', choices = [], onChoice, dieRoll = false, dieCount = 1, onRoll, image }) {
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
    modal.innerHTML = `
      <div class="modal-content choice-modal-content responsive-modal" role="dialog" aria-modal="true">
        ${title ? `<h2>${title}</h2>` : ''}
        ${image ? `<div class="choice-modal-image-wrap"><img src="${image}" alt="${title}" class="choice-modal-image" style="max-width:220px;margin:0.5em auto;display:block;"></div>` : ''}
        ${message ? `<div class="choice-modal-message">${message}</div>` : ''}
        ${dieRoll ? `<div class="choice-dice-row" style="margin:1em 0;">${
            Array.from({ length: dieCount || 1 }).map(() =>
                `<span class="choice-die" style="font-size:2em;display:inline-block;min-width:1.5em;text-align:center;margin-right:0.3em;">?</span>`
            ).join('')
        }<div><button id="choice-roll-btn">${dieCount > 1 ? `Roll ${dieCount} Dice` : 'Roll Die'}</button></div></div>` : ''}
        ${choices && choices.length ? `<div class="choice-modal-actions">${choices.map(opt => `<button class="choice-btn" data-value="${opt.value}">${opt.label}</button>`).join('')}</div>` : ''}
      </div>
    `;
    document.body.appendChild(modal);
    console.log("Modal element added to DOM");
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
    if (choices && choices.length) {
        modal.querySelectorAll('.choice-btn').forEach(btn => {
            btn.onclick = () => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                    console.log("Modal removed from DOM (choice)");
                }
                if (onChoice) onChoice(btn.getAttribute('data-value'));
            };
        });
    }
}
