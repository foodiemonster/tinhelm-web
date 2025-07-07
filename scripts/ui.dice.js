// Shared Anime.js-powered dice roll animation utility for Tin Helm Web
// Usage: animateDiceRoll(diceEls, finalValues, cb)
// diceEls: NodeList or array of dice DOM elements
// finalValues: array of final values (e.g., [4, 6])
// cb: callback to run after animation completes
export function animateDiceRoll(diceEls, finalValues, cb) {
    if (!diceEls || !diceEls.length || !window.anime) {
        // fallback: just set the final values
        diceEls.forEach((el, i) => { el.textContent = finalValues[i] || 1; });
        if (cb) cb();
        return;
    }
    const rollDuration = 700; // ms
    const rollSteps = 14;
    let step = 0;
    function rollStep() {
        step++;
        diceEls.forEach((el, i) => {
            const val = Math.floor(Math.random() * 6) + 1;
            el.textContent = val;
            window.anime({
                targets: el,
                scale: [1, 1.4, 1],
                rotate: [0, Math.random() * 360],
                duration: 80,
                easing: 'easeInOutCubic',
            });
        });
        if (step < rollSteps) {
            setTimeout(rollStep, rollDuration / rollSteps);
        } else {
            // Final value and big pop
            diceEls.forEach((el, i) => {
                el.textContent = finalValues[i] || 1;
                window.anime({
                    targets: el,
                    scale: [1, 1.7, 1],
                    rotate: [0, 0],
                    duration: 220,
                    easing: 'easeOutBack',
                });
            });
            if (cb) setTimeout(cb, 250);
        }
    }
    rollStep();
}
