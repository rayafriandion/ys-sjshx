import test from 'node:test';
import assert from 'node:assert/strict';
import { targetKind, availableTargets, resolveTarget, cycleTarget } from '../public/src/targeting.js';
const card = cardId => ({ cardId, upgraded: false });
const battle = { enemies: [{ id: 'one', hp: 30 }, { id: 'dead', hp: 0 }, { id: 'two', hp: 20 }] };
test('target selection follows card effects and cycles only living enemies', () => {
  assert.equal(targetKind(card('strike')), 'enemy');
  assert.equal(targetKind(card('hydro_edge')), 'enemy'); // mixed heal + damage
  assert.equal(targetKind(card('terminal')), 'enemy');
  assert.equal(targetKind(card('guard')), 'player');
  assert.equal(targetKind(card('focus')), 'player');
  assert.deepEqual(availableTargets(card('strike'), battle), ['one', 'two']);
  assert.equal(resolveTarget(card('strike'), battle, 'dead'), 'one');
  assert.equal(cycleTarget(card('strike'), battle, 'one', 1), 'two');
  assert.equal(cycleTarget(card('strike'), battle, 'one', -1), 'two');
  assert.equal(cycleTarget(card('guard'), battle, 'one', 1), 'player');
  assert.equal(resolveTarget(card('guard'), battle, 'one'), 'player');
});
