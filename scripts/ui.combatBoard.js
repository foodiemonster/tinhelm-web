// Board-based combat UI for Tin Helm Web (replaces modal)
// Renders combat area in #combat-area
import { animateDiceRoll } from './ui.dice.js';

export function showCombatBoard({ classCard, enemyCard, abilities, canUseAxeReroll, canDiscardAxe, onAxeReroll, onAxeDiscard, onRoll, onClose, playerEnergy }) {
    if (window.ReactAvailable && window.React && window.ReactDOM) {
        let combatRoot = document.getElementById('combat-area');
        if (!combatRoot) {
            combatRoot = document.createElement('div');
            combatRoot.id = 'combat-area';
            document.getElementById('dungeon-area').appendChild(combatRoot);
        }
        if (!combatRoot._reactRootContainer) {
            combatRoot._reactRootContainer = window.ReactDOM.createRoot(combatRoot);
        }
        combatRoot._isUnmounted = false;
        function safeRender(component) {
            if (!combatRoot._isUnmounted && combatRoot._reactRootContainer) {
                try { combatRoot._reactRootContainer.render(component); } catch (e) {}
            }
        }
        const CombatBoard = (props) => {
            const [rolls, setRolls] = window.React.useState([]);
            const [message, setMessage] = window.React.useState("");
            const [showRollBtn, setShowRollBtn] = window.React.useState(true);
            const [isCombatOver, setIsCombatOver] = window.React.useState(false);
            const [selectedEnergy, setSelectedEnergy] = window.React.useState(0); // New state for energy selection
            const isMountedRef = window.React.useRef(true);
            window.React.useEffect(() => {
                isMountedRef.current = true;
                return () => { isMountedRef.current = false; };
            }, []);
            // Animate cards in on mount
            window.React.useEffect(() => {
                const cards = document.querySelectorAll('.combat-card');
                if (cards.length && window.anime) {
                    window.anime.set(cards, { opacity: 0, scale: 0.7, rotate: 0 });
                    window.anime({
                        targets: cards,
                        opacity: [0, 1],
                        scale: [0.7, 1],
                        rotate: [0, 0],
                        delay: window.anime.stagger(60, { start: 0 }),
                        duration: 160,
                        easing: 'easeOutBack',
                    });
                }
            }, []);
            // Dice roll animation using shared utility
            const handleRoll = () => {
                setShowRollBtn(false);
                setMessage('Rolling...');
                setRolls([1, 1]);
                setTimeout(() => {
                    if (combatRoot._isUnmounted) return;
                    props.onRoll(selectedEnergy, ({ roll1, roll2, message, showRollBtn, isCombatOver }) => { // Pass selectedEnergy
                        if (combatRoot._isUnmounted) return;
                        const diceEls = document.querySelectorAll('.combat-die');
                        animateDiceRoll(diceEls, [roll1, roll2], () => {
                            if (!isMountedRef.current || combatRoot._isUnmounted) return;
                            setRolls([roll1, roll2]);
                            setMessage(message);
                            setShowRollBtn(showRollBtn);
                            setIsCombatOver(isCombatOver);
                        });
                    });
                }, 200);
            };
            const canShowAxeReroll = !isCombatOver && props.canUseAxeReroll && props.canUseAxeReroll() && rolls.length === 2 && rolls[0] === rolls[1];
            const canShowAxeDiscard = !isCombatOver && props.canDiscardAxe && props.canDiscardAxe();
            const energyOptions = [0, 1, 2, 3]; // Energy options
            return window.React.createElement(
                'section', { className: 'combat-board-area' },
                window.React.createElement('h2', {}, 'Combat Encounter'),
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
                        window.React.createElement('div', { className: 'energy-selection-container', style: { marginBottom: '1em' } },
                            window.React.createElement('h4', { style: { margin: '0 0 0.5em 0', color: '#eee' } }, 'Energy to Spend:'),
                            energyOptions.map((energyCost) =>
                                window.React.createElement('button', {
                                    key: `energy-${energyCost}`,
                                    className: `energy-select-btn ${selectedEnergy === energyCost ? 'selected' : ''}`,
onClick: () => setSelectedEnergy(Number(energyCost)),
                                    disabled: energyCost > props.playerEnergy, // Disable if not enough energy
                                    style: {
                                        margin: '0 0.2em',
                                        padding: '0.5em 1em',
                                        border: `2px solid ${selectedEnergy === energyCost ? '#FFD700' : '#555'}`,
                                        borderRadius: '5px',
                                        background: energyCost > props.playerEnergy ? '#444' : (selectedEnergy === energyCost ? '#FFD700' : '#777'),
                                        color: energyCost > props.playerEnergy ? '#888' : (selectedEnergy === energyCost ? '#333' : '#fff'),
                                        cursor: energyCost > props.playerEnergy ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold'
                                    }
                                }, `${energyCost} Energy`)
                            )
                        ) : null,
                    showRollBtn && !isCombatOver ?
                        window.React.createElement('button', { id: 'combat-roll-btn', onClick: handleRoll }, 'Roll Dice') :
                        null,
                    showRollBtn && !isCombatOver && props.abilities && props.abilities.length > 0 ?
                        props.abilities.map((ab, idx) =>
                            window.React.createElement('button', {
                                key: 'ability-' + idx,
                                className: 'combat-ability-btn',
                                onClick: () => {
                                    setShowRollBtn(false);
                                    setMessage('Using ability...');
                                    setTimeout(() => {
                                        if (combatRoot._isUnmounted) return;
                                        props.onRoll(0, (result) => { // Abilities don't use skill energy, pass 0
                                            if (combatRoot._isUnmounted) return;
                                            const diceEls = document.querySelectorAll('.combat-die');
                                            animateDiceRoll(diceEls, [result.roll1, result.roll2], () => {
                                                if (!isMountedRef.current || combatRoot._isUnmounted) return;
                                                setRolls([result.roll1, result.roll2]);
                                                setMessage(result.message);
                                                setShowRollBtn(result.showRollBtn);
                                                setIsCombatOver(result.isCombatOver);
                                            });
                                        }, ab);
                                    }, 200);
                                }
                            }, ab.label)
                        ) : null,
                    canShowAxeDiscard ?
                        window.React.createElement('button', {
                            id: 'combat-axe-discard-btn',
                            style: { background: '#b71c1c', color: '#fff', marginLeft: '0.5em' },
                            onClick: () => {
                                setShowRollBtn(false);
                                setMessage('Axe Special Attack...');
                                setTimeout(() => {
                                    if (combatRoot._isUnmounted) return;
                                    props.onAxeDiscard();
                                }, 200);
                            }
                        }, 'Discard Axe for 2d6 Attack') : null,
                    canShowAxeReroll ?
                        window.React.createElement('button', {
                            id: 'combat-axe-reroll-btn',
                            style: { background: '#1976d2', color: '#fff', marginLeft: '0.5em' },
                            onClick: () => {
                                setShowRollBtn(false);
                                setMessage('Axe Reroll...');
                                setTimeout(() => {
                                    if (combatRoot._isUnmounted) return;
                                    props.onAxeReroll();
                                }, 200);
                            }
                        }, 'Axe Reroll (once per level)') : null,
                    isCombatOver ?
                        window.React.createElement('button', {
                            id: 'combat-close-btn',
                            className: 'combat-close-btn',
                            style: { marginLeft: '1em', background: '#333', color: '#fff', fontWeight: 'bold' },
                            onClick: props.onClose
                        }, 'Close') : null
                )
            );
        };
        safeRender(window.React.createElement(CombatBoard, { classCard, enemyCard, abilities, canUseAxeReroll, canDiscardAxe, onAxeReroll, onAxeDiscard, onRoll, onClose, playerEnergy }));
        return () => {
            combatRoot._isUnmounted = true;
            if (combatRoot._reactRootContainer) {
                try {
                    combatRoot._reactRootContainer.render(window.React.createElement('div'));
                } catch (e) {}
            }
        };
    }
    // Fallback: legacy HTML (not implemented here)
}

export function hideCombatBoard() {
    const combatRoot = document.getElementById('combat-area');
    if (combatRoot && combatRoot._reactRootContainer) {
        combatRoot._isUnmounted = true;
        try {
            combatRoot._reactRootContainer.render(window.React.createElement('div'));
        } catch (e) {}
    }
    // Do NOT clear innerHTML or remove the node!
}
