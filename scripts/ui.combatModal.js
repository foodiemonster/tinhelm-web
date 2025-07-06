// Combat modal UI logic for Tin Helm Web
// Pops up during enemy encounters and handles dice rolls and combat feedback

export function showCombatModal({ classCard, enemyCard, onRoll, onClose }) {
    // If React is available, use a React modal (CDN version)
    if (window.ReactAvailable && window.React && window.ReactDOM) {
        let reactRoot = document.getElementById('combat-modal-react-root');
        if (!reactRoot) {
            reactRoot = document.createElement('div');
            reactRoot.id = 'combat-modal-react-root';
            document.body.appendChild(reactRoot);
        }
        // Use a persistent React root for createRoot API
        if (!reactRoot._reactRootContainer) {
            reactRoot._reactRootContainer = window.ReactDOM.createRoot(reactRoot);
        }
        const CombatModal = (props) => {
            const [rolls, setRolls] = window.React.useState([]);
            const [message, setMessage] = window.React.useState("");
            const [showRollBtn, setShowRollBtn] = window.React.useState(true);
            const [isCombatOver, setIsCombatOver] = window.React.useState(false);
            const handleRoll = () => {
                setShowRollBtn(false);
                props.onRoll(({ roll1, roll2, message, showRollBtn, isCombatOver }) => {
                    setRolls([roll1, roll2]);
                    setMessage(message);
                    setShowRollBtn(showRollBtn);
                    setIsCombatOver(isCombatOver);
                });
            };
            return window.React.createElement(
                'div', { className: 'modal-overlay', role: 'dialog', 'aria-modal': 'true' },
                window.React.createElement('div', { className: 'modal-content combat-modal-content responsive-modal' },
                    window.React.createElement('div', { className: 'combat-cards-row responsive-cards-row' },
                        window.React.createElement('div', { className: 'combat-card responsive-card', id: 'combat-class-card' },
                            window.React.createElement('img', { src: props.classCard.image, alt: props.classCard.name, className: 'combat-card-img responsive-card-img' })
                        ),
                        window.React.createElement('div', { className: 'combat-vs' }, 'vs.'),
                        window.React.createElement('div', { className: 'combat-card responsive-card', id: 'combat-enemy-card' },
                            window.React.createElement('img', { src: props.enemyCard.image, alt: props.enemyCard.name, className: 'combat-card-img responsive-card-img' })
                        )
                    ),
                    window.React.createElement('div', { className: 'combat-dice-row', id: 'combat-dice-row', style: { margin: '1em 0' } },
                        rolls.length ? [
                            window.React.createElement('span', { className: 'combat-die', key: 'die1' }, rolls[0]),
                            ' ',
                            window.React.createElement('span', { className: 'combat-die', key: 'die2' }, rolls[1])
                        ] : null
                    ),
                    window.React.createElement('div', { className: 'combat-message', id: 'combat-message' }, message),
                    window.React.createElement('div', { className: 'combat-actions', id: 'combat-actions' },
                        showRollBtn && !isCombatOver ?
                            window.React.createElement('button', { id: 'combat-roll-btn', onClick: handleRoll }, 'Roll Dice') :
                            null,
                        isCombatOver ?
                            window.React.createElement('button', {
                                id: 'combat-close-btn',
                                onClick: () => {
                                    if (reactRoot._reactRootContainer) {
                                        reactRoot._reactRootContainer.unmount();
                                    }
                                    if (props.onClose) props.onClose();
                                }
                            }, 'Close') : null
                    )
                )
            );
        };
        reactRoot._reactRootContainer.render(
            window.React.createElement(CombatModal, { classCard, enemyCard, onRoll, onClose })
        );
        // Clean up on close
        reactRoot._unmount = () => reactRoot._reactRootContainer.unmount();
        return;
    }
    // Fallback: Vanilla JS modal
    // Remove any existing modal
    let oldModal = document.getElementById('combat-modal');
    if (oldModal) oldModal.remove();

    // Modal HTML
    const modal = document.createElement('div');
    modal.id = 'combat-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content combat-modal-content responsive-modal" role="dialog" aria-modal="true">
        <div class="combat-cards-row responsive-cards-row">
          <div class="combat-card responsive-card" id="combat-class-card">
            <img src="${classCard.image}" alt="${classCard.name}" class="combat-card-img responsive-card-img">
          </div>
          <div class="combat-vs">vs.</div>
          <div class="combat-card responsive-card" id="combat-enemy-card">
            <img src="${enemyCard.image}" alt="${enemyCard.name}" class="combat-card-img responsive-card-img">
          </div>
        </div>
        <div class="combat-dice-row" id="combat-dice-row" style="margin:1em 0;"></div>
        <div class="combat-message" id="combat-message"></div>
        <div class="combat-actions" id="combat-actions">
          <button id="combat-roll-btn">Roll Dice</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Roll button logic
    const rollBtn = document.getElementById('combat-roll-btn');
    rollBtn.onclick = () => {
        rollBtn.disabled = true;
        onRoll(updateModalAfterRoll);
    };

    // Function to update modal after a roll
    function updateModalAfterRoll({ roll1, roll2, message, showRollBtn, isCombatOver }) {
        const diceRow = document.getElementById('combat-dice-row');
        diceRow.innerHTML = `<span class="combat-die">${roll1}</span> <span class="combat-die">${roll2}</span>`;
        document.getElementById('combat-message').textContent = message;
        rollBtn.style.display = showRollBtn ? 'inline-block' : 'none';
        rollBtn.disabled = false;
        if (isCombatOver) {
            document.getElementById('combat-actions').innerHTML = `<button id="combat-close-btn">Close</button>`;
            document.getElementById('combat-close-btn').onclick = () => {
                document.body.removeChild(modal);
                if (onClose) onClose();
            };
        }
    }
}
