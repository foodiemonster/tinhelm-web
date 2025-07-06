// Utility for applying passive effects and prompting for active abilities from inventory trappings
// Usage: import and call from gameLogic.js at the appropriate event windows

import { showChoiceModal } from './ui.choiceModal.js';

// Apply all passive effects for a given trigger (e.g., 'on_attack')
export function applyPassiveEffects(trigger, context) {
  const { inventory } = context;
  let result = { ...context };
  for (const item of inventory) {
    if (item.effects && item.effects.length > 0) {
      for (const effect of item.effects) {
        if (effect.trigger === trigger) {
          // Example: apply damage bonus, healing, etc.
          // You may need to expand this logic for each effect type
          if (effect.action === 'damage' && effect.target === 'enemy') {
            result.attackBonus = (result.attackBonus || 0) + (effect.amount || 0);
          }
          if (effect.action === 'heal' && effect.target === 'player') {
            result.heal = (result.heal || 0) + (effect.amount || 0);
          }
          // Add more effect types as needed
        }
      }
    }
  }
  return result;
}

// Prompt the player to activate any abilities for a given trigger
export async function promptForActiveAbilities(trigger, context) {
  const { inventory } = context;
  const availableAbilities = [];
  for (const item of inventory) {
    if (item.abilities && item.abilities.length > 0) {
      for (const ability of item.abilities) {
        if (ability.trigger === trigger) {
          availableAbilities.push({
            label: `${item.name}: ${ability.details || ability.action}`,
            value: { itemId: item.id, ability }
          });
        }
      }
    }
  }
  console.log('promptForActiveAbilities:', { trigger, availableAbilities, inventory });
  if (availableAbilities.length === 0) return null;
  // Show modal for player to choose an ability to activate
  return new Promise((resolve) => {
    showChoiceModal({
      title: 'Activate Ability',
      message: 'Choose a trapping ability to activate:',
      choices: [
        ...availableAbilities,
        { label: 'Skip', value: null }
      ],
      onChoice: (choice) => resolve(choice)
    });
    // Fallback: auto-resolve after 30 seconds if user does nothing
    setTimeout(() => resolve(null), 30000);
  });
}
