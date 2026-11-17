import { cardStats } from './data.js';

// Only cards dealing damage need an enemy. Other effects act on the traveler.
export function targetKind(card) {
  const stats = cardStats(card);
  return stats.damage || stats.trueDamage ? 'enemy' : 'player';
}
export function availableTargets(card, battle) {
  return targetKind(card) === 'player' ? ['player'] : battle.enemies.filter(enemy => enemy.hp > 0).map(enemy => enemy.id);
}
export function resolveTarget(card, battle, current) {
  const targets = availableTargets(card, battle);
  return targets.includes(current) ? current : targets[0] ?? null;
}
export function cycleTarget(card, battle, current, direction) {
  const targets = availableTargets(card, battle);
  if (!targets.length) return null;
  const index = targets.indexOf(current);
  return targets[(index < 0 ? 0 : (index + direction + targets.length) % targets.length)];
}
