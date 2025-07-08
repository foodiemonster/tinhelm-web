I understand the new "Skill Usage" feature for combat. This involves a pre-roll decision on energy expenditure (0, 1, 2, or 3 points) which affects the damage calculation.

Here's my plan to implement this:

__Phase 1: Information Gathering & UI Integration__

1. __Examine `data/class.json`__: I will read this file to understand the exact structure of `combatBonusDamage` and `combatBonusDamageEnergyCost` arrays for each class. This is crucial for correctly mapping energy cost to bonus damage.
2. __Examine `scripts/ui.combatModal.js`__: I will review this file to understand the current combat UI structure. This will help determine the best way to integrate the energy selection mechanism.
3. __Examine `scripts/ui.js`__: I will check this file for existing modal or UI helper functions that could be repurposed or extended for the energy selection.
4. __Design Energy Selection UI__: I will propose a UI element (likely a set of buttons or a dropdown within the combat modal) that allows the player to choose 0, 1, 2, or 3 energy to spend, considering their current energy. This choice must happen *before* the dice roll.

__Phase 2: Core Combat Logic Modification__

1. __Modify `scripts/gameLogic.js` (`handleRoll` function)__:

   - __Capture Energy Choice__: The `handleRoll` function will need to receive the player's chosen energy expenditure.

   - __Energy Deduction__: Deduct the chosen energy from `gameState.player.energy` at the start of the player's turn in `handleRoll`. This energy will be lost even on a miss.

   - __Damage Calculation (Non-Zero Cost)__:

     - If dice are doubles, the attack misses, and no damage is dealt.
     - If dice are different, calculate `rawAttackPower = abs(roll1 - roll2)`.
     - Retrieve the `bonusDamage` from the current class's `combatBonusDamage` array based on the `energyCost` (1, 2, or 3).
     - Calculate `totalDamage = rawAttackPower + bonusDamage`.
     - Subtract `enemyCard.defense` from `totalDamage`.
     - Apply `totalDamage` to `currentEnemyHealth`.

   - __Damage Calculation (Zero Cost)__:

     - If dice are doubles, the attack misses, and no damage is dealt.
     - If dice are different, apply `1` point of damage to `currentEnemyHealth`. This damage will bypass `enemyCard.defense` and any shield effects.

   - __Update UI__: Ensure `updateAllTrackerCubes` is called with the new `currentEnemyHealth` after damage is applied.

This phased approach will allow me to first understand the existing data and UI, then implement the necessary UI changes, and finally integrate the complex combat logic.

Please let me know if this plan aligns with your expectations, and if you'd like me to proceed with the first steps of reading the specified files.

I have reviewed the new "Skill Usage" feature for combat. My plan is to first gather information from `data/class.json`, `scripts/ui.combatModal.js`, and `scripts/ui.js` to understand the existing structure. Then, I will design and implement the UI for energy selection (0, 1, 2, or 3 energy) within the combat modal. Finally, I will modify the `handleRoll` function in `scripts/gameLogic.js` to incorporate the energy deduction, implement the conditional damage calculations for both non-zero and zero-cost attacks (including handling misses and unblockable damage), and ensure all trackers update correctly.
