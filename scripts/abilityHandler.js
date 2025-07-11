// Centralized ability/effect handler for Tinhelm
// Handles abilities/effects from inventory, enemy, race, class
// Usage: handleAbilityTrigger(trigger, context)

export function handleAbilityTrigger(trigger, context) {
  const sources = [
    ...(context.inventory || []),
    context.enemy,
    context.race,
    context.class
  ].filter(Boolean);

  let result = { ...context };
  let logs = [];

  for (const source of sources) {
    const abilities = (source.abilities || []).filter(a => !a.trigger || a.trigger === trigger);
    const effects = (source.effects || []).filter(e => !e.trigger || e.trigger === trigger);

    [...abilities, ...effects].forEach(effect => {
      switch (effect.action) {
        case 'damage':
          if (effect.target === 'enemy') {
            result.attackBonus = (result.attackBonus || 0) + (effect.amount || 0);
            logs.push(`${source.name || source.id}: +${effect.amount} damage to enemy`);
          }
          break;
        case 'heal':
          if (effect.target === 'player') {
            result.heal = (result.heal || 0) + (effect.amount || 0);
            logs.push(`${source.name || source.id}: +${effect.amount} heal to player`);
          }
          break;
        case 'gain_resource':
          if (effect.target && effect.amount) {
            result.gain = result.gain || [];
            result.gain.push({ resource: effect.target, amount: effect.amount });
            logs.push(`${source.name || source.id}: gain ${effect.amount} ${effect.target}`);
          }
          break;
        case 'lose_resource':
          if (effect.target && effect.amount) {
            result.lose = result.lose || [];
            result.lose.push({ resource: effect.target, amount: effect.amount });
            logs.push(`${source.name || source.id}: lose ${effect.amount} ${effect.target}`);
          }
          break;
        case 'attack_first':
          result.attackFirst = true;
          logs.push(`${source.name || source.id}: attacks first`);
          break;
        case 'ignore_miss':
          result.ignoreMiss = true;
          logs.push(`${source.name || source.id}: ignore miss`);
          break;
        case 'reroll_dice':
        case 'reroll':
          result.reroll = true;
          logs.push(`${source.name || source.id}: reroll dice`);
          break;
        case 'defeat':
          if (effect.target === 'enemy') {
            result.defeatEnemy = true;
            logs.push(`${source.name || source.id}: auto-defeat enemy`);
          }
          break;
        case 'bypass':
        case 'bypass_encounter':
          result.bypass = true;
          logs.push(`${source.name || source.id}: bypass encounter`);
          break;
        // Add more actions as needed
        default:
          logs.push(`${source.name || source.id}: unhandled action ${effect.action}`);
          break;
      }
    });
  }

  result._abilityLogs = logs;
  return result;
}
