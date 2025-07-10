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
            const [selectedEnergy, setSelectedEnergy] = window.React.useState(0);
            const [isPlayerTurn, setIsPlayerTurn] = window.React.useState(true); // Track turn
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
            const updateCallback = ({ roll1, roll2, message, showRollBtn, isCombatOver }) => {
                if (combatRoot._isUnmounted) return;
                const diceEls = document.querySelectorAll('.combat-die');
                animateDiceRoll(diceEls, [roll1, roll2], () => {
                    if (!isMountedRef.current || combatRoot._isUnmounted) return;
                    setRolls([roll1, roll2]);
                    setMessage(message);
                    setShowRollBtn(showRollBtn);
                    setIsCombatOver(isCombatOver);
                    // Toggle turn unless combat is over
                    if (!isCombatOver) setIsPlayerTurn(turn => !turn);
                });
            };
            const handlePlayerRoll = () => {
                setShowRollBtn(false);
                setMessage('Rolling...');
                setRolls([1, 1]);
                setTimeout(() => {
                    if (combatRoot._isUnmounted) return;
                    props.onRoll(selectedEnergy, updateCallback);
                }, 200);
            };
            const handleEnemyRoll = () => {
                setShowRollBtn(false);
                setMessage('Enemy rolling...');
                setRolls([1, 1]);
                setTimeout(() => {
                    if (combatRoot._isUnmounted) return;
                    props.onRoll(selectedEnergy, updateCallback);
                }, 200);
            };
            const handleEndCombat = () => {
                if (props.onClose) props.onClose();
            };
            return window.React.createElement(
                'section', { className: 'combat-board-area' },
                window.React.createElement('h2', {}, 'An enemy has appeared!'),
                window.React.createElement('div', { className: 'combat-cards-row responsive-cards-row', style: { justifyContent: 'center', alignItems: 'flex-start' } },
                    window.React.createElement('div', { className: 'combat-card responsive-card', id: 'combat-enemy-card' },
                        window.React.createElement('img', { src: props.enemyCard.image, alt: props.enemyCard.name, className: 'combat-card-img responsive-card-img' })
                    ),
                    window.React.createElement('div', { className: 'combat-actions combat-actions-vertical', id: 'combat-actions', style: { marginLeft: '2em', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1.2em', height: '100%', justifyContent: 'center', minWidth: '180px' } },
                        window.React.createElement('div', { className: 'combat-dice-area', style: { marginBottom: '0.5em' } },
                            rolls.length ? [
                                window.React.createElement('span', { className: 'combat-die', key: 'die1' }, rolls[0]),
                                window.React.createElement('span', { className: 'combat-die', key: 'die2' }, rolls[1])
                            ] : null
                        ),
                        // Stacked buttons, only one visible at a time
                        window.React.createElement('button', {
                            id: 'combat-player-roll-btn',
                            className: 'combat-btn-player',
                            style: { display: isCombatOver ? 'none' : (isPlayerTurn ? 'block' : 'none'), alignSelf: 'stretch', marginTop: '1.2em' },
                            onClick: handlePlayerRoll,
                            disabled: isCombatOver
                        }, 'Player Roll'),
                        window.React.createElement('button', {
                            id: 'combat-enemy-roll-btn',
                            className: 'combat-btn-enemy',
                            style: { display: isCombatOver ? 'none' : (!isPlayerTurn ? 'block' : 'none'), alignSelf: 'stretch', marginTop: '1.2em' },
                            onClick: handleEnemyRoll,
                            disabled: isCombatOver
                        }, 'Enemy Roll'),
                        window.React.createElement('button', {
                            id: 'combat-end-btn',
                            className: 'combat-btn-end',
                            style: { display: isCombatOver ? 'block' : 'none', alignSelf: 'stretch', marginTop: '1.2em' },
                            onClick: handleEndCombat
                        }, 'End Combat'),
                        window.React.createElement('div', {
                            className: 'combat-energy-row' + (isPlayerTurn ? ' energy-row-active' : ' energy-row-inactive'),
                            style: { marginBottom: '0.5em', transition: 'opacity 0.2s, transform 0.2s' }
                        },
                            [1, 2, 3].map((energyCost) =>
                                window.React.createElement('button', {
                                    key: `energy-${energyCost}`,
                                    className: `combat-energy-btn${selectedEnergy === energyCost ? ' selected' : ''}`,
                                    onClick: () => setSelectedEnergy(selectedEnergy === energyCost ? 0 : energyCost),
                                    disabled: !isPlayerTurn || energyCost > props.playerEnergy,
                                    style: {
                                        opacity: isPlayerTurn ? 1 : 0.5,
                                        transform: isPlayerTurn ? 'scale(1)' : 'scale(0.92)',
                                        transition: 'opacity 0.2s, transform 0.2s'
                                    }
                                }, energyCost)
                            )
                        )
                    )
                ),
                window.React.createElement('div', { className: 'combat-message', id: 'combat-message' }, message)
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
    return new Promise(resolve => {
        const combatRoot = document.getElementById('combat-area');
        if (combatRoot && combatRoot._reactRootContainer) {
            combatRoot._reactRootContainer.unmount();
            combatRoot._reactRootContainer = null;
            // Give React a moment to clean up before resolving
            setTimeout(resolve, 50); 
        } else {
            resolve(); // Resolve immediately if nothing to unmount
        }
    });
}
