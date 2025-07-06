// Choice & Dice Roll Modal for Tin Helm Web
// Usage: showChoiceModal({ title, message, choices, onChoice, dieRoll, onRoll })
// - choices: array of { label, value }
// - onChoice: callback(value)
// - dieRoll: if true, show a die and a 'Roll Die' button
// - onRoll: callback(rollValue)

export function showChoiceModal({ title = '', message = '', choices = [], onChoice, dieRoll = false, onRoll, image }) {
    // React modal if available
    if (window.ReactAvailable && window.React && window.ReactDOM) {
        let reactRoot = document.getElementById('choice-modal-react-root');
        if (!reactRoot) {
            reactRoot = document.createElement('div');
            reactRoot.id = 'choice-modal-react-root';
            document.body.appendChild(reactRoot);
        }
        if (!reactRoot._reactRootContainer) {
            reactRoot._reactRootContainer = window.ReactDOM.createRoot(reactRoot);
        }
        // Patch: always check for unmount before rendering
        let isUnmounted = false;
        function safeRender(component) {
            if (!isUnmounted && reactRoot._reactRootContainer) {
                try {
                    reactRoot._reactRootContainer.render(component);
                } catch (e) {
                    // Ignore render on unmounted root
                }
            }
        }
        const ChoiceModal = (props) => {
            const [rolling, setRolling] = window.React.useState(false);
            const [rollValue, setRollValue] = window.React.useState(null);
            const [rolled, setRolled] = window.React.useState(false);
            const isMountedRef = window.React.useRef(true);
            window.React.useEffect(() => {
                isMountedRef.current = true;
                return () => { isMountedRef.current = false; };
            }, []);
            const handleChoice = (val) => {
                isUnmounted = true;
                if (reactRoot._reactRootContainer) reactRoot._reactRootContainer.unmount();
                if (onChoice) onChoice(val);
            };
            const handleRoll = () => {
                setRolling(true);
                setRollValue(null);
                setTimeout(() => {
                    if (isUnmounted) return;
                    const value = Math.floor(Math.random() * 6) + 1;
                    const diceEls = document.querySelectorAll('.choice-die');
                    import('./ui.dice.js').then(({ animateDiceRoll }) => {
                        animateDiceRoll(diceEls, [value], () => {
                            if (isUnmounted || !isMountedRef.current) return;
                            setRollValue(value);
                            setRolling(false);
                            setRolled(true);
                            if (onRoll) onRoll(value);
                            if (!choices || !choices.length) {
                                setTimeout(() => {
                                    isUnmounted = true;
                                    if (reactRoot._reactRootContainer) reactRoot._reactRootContainer.unmount();
                                }, 900);
                            }
                        });
                    });
                }, 200);
            };
            return window.React.createElement(
                'div', { className: 'modal-overlay', role: 'dialog', 'aria-modal': 'true' },
                window.React.createElement('div', { className: 'modal-content choice-modal-content responsive-modal' },
                    title ? window.React.createElement('h2', null, title) : null,
                    image ? window.React.createElement('div', { className: 'choice-modal-image-wrap' },
                        window.React.createElement('img', { src: image, alt: title, className: 'choice-modal-image', style: { maxWidth: '220px', margin: '0.5em auto', display: 'block' } })
                    ) : null,
                    message ? window.React.createElement('div', { className: 'choice-modal-message' }, message) : null,
                    dieRoll ?
                        window.React.createElement('div', { className: 'choice-dice-row', style: { margin: '1em 0' } },
                            window.React.createElement('span', { className: 'choice-die', style: { fontSize: '2em', display: 'inline-block', minWidth: '1.5em', textAlign: 'center' } }, rollValue || '?'),
                            window.React.createElement('div',
                                window.React.createElement('button', { onClick: handleRoll, disabled: rolling || rolled }, rolling ? 'Rolling...' : (rolled ? 'Done' : 'Roll Die'))
                            )
                        ) : null,
                    choices && choices.length ?
                        window.React.createElement('div', { className: 'choice-modal-actions' },
                            choices.map((opt, idx) => window.React.createElement('button', { key: opt.label + '-' + idx, onClick: () => handleChoice(opt.value) }, opt.label))
                        ) : null
                )
            );
        };
        safeRender(window.React.createElement(ChoiceModal));
        reactRoot._unmount = () => {
            isUnmounted = true;
            reactRoot._reactRootContainer.unmount();
        };
        return;
    }
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
        ${dieRoll ? `<div class="choice-dice-row" style="margin:1em 0;"><span class="choice-die" style="font-size:2em;display:inline-block;min-width:1.5em;text-align:center;">?</span><div><button id="choice-roll-btn">Roll Die</button></div></div>` : ''}
        ${choices && choices.length ? `<div class="choice-modal-actions">${choices.map(opt => `<button class="choice-btn" data-value="${opt.value}">${opt.label}</button>`).join('')}</div>` : ''}
      </div>
    `;
    document.body.appendChild(modal);
    if (dieRoll) {
        const rollBtn = document.getElementById('choice-roll-btn');
        let rolled = false;
        rollBtn.onclick = () => {
            if (rolled) return;
            rollBtn.disabled = true;
            setTimeout(() => {
                const value = Math.floor(Math.random() * 6) + 1;
                const diceEls = modal.querySelectorAll('.choice-die');
                import('./ui.dice.js').then(({ animateDiceRoll }) => {
                    animateDiceRoll(diceEls, [value], () => {
                        diceEls[0].textContent = value;
                        rolled = true;
                        rollBtn.disabled = true;
                        if (onRoll) onRoll(value);
                        if (!choices || !choices.length) {
                            setTimeout(() => {
                                if (modal.parentNode) modal.parentNode.removeChild(modal);
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
                document.body.removeChild(modal);
                if (onChoice) onChoice(btn.getAttribute('data-value'));
            };
        });
    }
}
