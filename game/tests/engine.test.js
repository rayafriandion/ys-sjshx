import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../public/src/engine.js';
import { CARDS, ARCHONS, CHAPTERS, EVENT_EFFECTS, STARTER } from '../public/src/data.js';
import { validateProfile, parseSave, serializeSave } from '../public/src/storage.js';

function setup(kind = 'battle', floor = 0) {
  const p = E.newProfile(); E.startRun(p, { seed: 884920 }); p.run.floor = floor;
  p.run.map = E.makeMap(p.run); p.run.nodeId = p.run.map[0][0].id;
  E.beginBattle(p, kind); return p;
}
function hand(p, ids) {
  p.run.battle.hand = ids.map((id, i) => ({ uid: `test${i}`, cardId: id, upgraded: false }));
  p.run.battle.draw = []; p.run.battle.discard = []; p.run.battle.exhaust = [];
}
test('seeded map generation is stable and every available route is connected', () => {
  const a = E.newProfile(), b = E.newProfile();
  E.startRun(a, { seed: 44 }); E.startRun(b, { seed: 44 });
  assert.deepEqual(a.run.map, b.run.map); assert.equal(a.run.deck.length, 12);
  assert.equal(E.availableNodes(a.run).length, 1);
  assert.throws(() => E.enterNode(a, a.run.map[3][0].id));
  for (let row = -1; row < 7; row++) {
    a.run.row = row;
    if (row >= 0) a.run.nodeId = a.run.map[row][0].id;
    assert.ok(E.availableNodes(a.run).length >= 1);
  }
});
test('all nine reactions settle their distinct effects', async t => {
  const cases = [
    ['pyro', 'hydro', '蒸发', (p, e) => assert.equal(e.hp, 82)],
    ['pyro', 'cryo', '融化', (p, e) => { assert.equal(e.hp, 82); }],
    ['pyro', 'electro', '超载', (p, e) => { assert.equal(e.hp, 82); assert.equal(e.stun, 1); }],
    ['hydro', 'electro', '感电', (p, e) => { assert.equal(e.hp, 85); assert.equal(p.run.battle.enemies[1].hp, 95); }],
    ['hydro', 'cryo', '冻结', (p, e) => assert.equal(e.frozen, 1)],
    ['dendro', 'hydro', '绽放', (p, e) => assert.equal(p.run.battle.cores, 1)],
    ['dendro', 'electro', '激化', (p, e) => assert.equal(e.quicken, 3)],
    ['pyro', 'anemo', '扩散', (p, e) => { assert.equal(p.run.battle.enemies[1].aura, 'pyro'); assert.equal(p.run.battle.enemies[1].hp, 96); }],
    ['hydro', 'geo', '结晶', (p, e) => { assert.equal(p.run.battle.shield, 6); assert.equal(e.aura, 'hydro'); }]
  ];
  for (const [aura, element, name, verify] of cases) await t.test(name, () => {
    const p = setup('elite'), b = p.run.battle;
    for (const e of b.enemies) { e.hp = e.maxHp = 100; e.shield = 0; }
    const enemy = b.enemies[0]; enemy.aura = aura; enemy.auraTurns = 3; enemy.intent = { type: 'charge', damage: 10 };
    assert.equal(E.elementalHit(p, enemy, element, 10), name);
    assert.equal(b.reactions, 1); verify(p, enemy);
  });
});
test('shield absorbs damage, melt partially bypasses it, and freeze skips one attack', () => {
  const p = setup(); const e = p.run.battle.enemies[0];
  e.hp = e.maxHp = 100; e.aura = 'pyro'; e.shield = 20;
  E.elementalHit(p, e, 'cryo', 10);
  assert.equal(e.hp, 91); assert.equal(e.shield, 11);
  const hp = p.run.hp; e.frozen = 1;
  E.endTurn(p); assert.equal(p.run.hp, hp);
  E.endTurn(p); assert.ok(p.run.hp < hp);
});
test('hand, energy, reshuffle, retain and exhaust obey their zones', () => {
  const p = setup(); hand(p, ['focus', 'geo_keep', 'strike']); const b = p.run.battle;
  b.draw = [{ uid: 'd1', cardId: 'guard', upgraded: false }];
  E.playCard(p, 'test0'); assert.equal(b.energy, 4); assert.equal(b.exhaust[0].cardId, 'focus');
  assert.equal(b.hand.length, 3);
  E.endTurn(p);
  assert.ok(b.hand.some(c => c.cardId === 'geo_keep'));
  assert.ok(!b.hand.some(c => c.cardId === 'focus'));
  assert.equal(b.energy, 3);
});
test('card cost validation prevents overspending and sealed cards', () => {
  const p = setup('boss', 2); hand(p, ['pyro_burst']); const b = p.run.battle;
  assert.match(E.cardProblem(p, b.hand[0]), /封印/);
  assert.throws(() => E.playCard(p, b.hand[0].uid));
  b.turn = 3; b.energy = 1;
  assert.match(E.cardProblem(p, b.hand[0]), /能量/);
});
test('live turn, RNG, hand and reaction state survive a JSON export roundtrip', () => {
  const p = setup(); hand(p, ['hydro_edge', 'cryo_edge', 'guard']);
  p.run.battle.draw = p.run.deck.map(E.clone);
  E.playCard(p, 'test0'); E.playCard(p, 'test1');
  const restored = parseSave(serializeSave(p)).profile;
  assert.deepEqual(restored, p);
  E.endTurn(p); E.endTurn(restored); assert.deepEqual(restored, p);
});
test('all eight archon skills and cooldowns can run and serialize', () => {
  for (const id of Object.keys(ARCHONS)) {
    const p = setup('boss'); const b = p.run.battle;
    b.enemies[0].hp = b.enemies[0].maxHp = 1000;
    p.run.archons = [{ id, cooldown: 0 }];
    E.useArchon(p, id);
    assert.equal(p.run.archons[0].cooldown, ARCHONS[id].cd);
    if (b.inspect) for (const c of [...b.inspect.cards].slice(0, 2)) E.chooseInspect(p, c.uid);
    validateProfile(p);
    E.endTurn(p);
    assert.equal(p.run.archons[0].cooldown, ARCHONS[id].cd - 1);
  }
});
test('healing pays bond first and a completed cleanse produces a finisher', () => {
  const p = setup('boss', 7); hand(p, ['hydro_mend', 'lunar_cleanse']);
  p.run.hp = 40; p.run.battle.bond = 6;
  E.playCard(p, 'test0');
  assert.equal(p.run.battle.bond, 0); assert.equal(p.run.hp, 43);
  assert.ok(p.run.battle.hand.some(c => c.cardId === 'redtide'));
  p.run.battle.bond = 30;
  E.playCard(p, 'test1'); assert.equal(p.run.battle.bond, 0);
  E.endTurn(p); assert.ok(p.run.battle.bond > 0);
});
test('cleansing a pending execution removes the lethal intent immediately', () => {
  const p = setup('boss', 7); hand(p, ['lunar_cleanse']);
  p.run.battle.bond = 50;
  p.run.battle.enemies[0].intent = { type: 'execute', damage: 9999 };
  E.playCard(p, 'test0');
  assert.equal(p.run.battle.enemies[0].intent.type, 'attack');
  E.endTurn(p); assert.equal(p.run.phase, 'combat');
});
test('death pays echoes exactly once, revival resolves before settlement', () => {
  const p = setup(); p.run.nodesCleared = 3; p.run.revive = 1;
  E.hurtPlayer(p, 999, true); assert.equal(p.run.hp, 40); assert.equal(p.run.phase, 'combat');
  E.hurtPlayer(p, 999, true); assert.equal(p.run.phase, 'finished');
  const echoes = p.meta.echoes; assert.ok(echoes > 0);
  E.finishRun(p); assert.equal(p.meta.echoes, echoes);
  validateProfile(p);
});
test('purchased talents are snapshotted for the next run', () => {
  const p = setup(); p.meta.echoes = 500;
  E.buyTalent(p, 'energy'); E.endTurn(p);
  assert.equal(p.run.battle.maxEnergy, 3);
  E.finishRun(p); E.startRun(p, { seed: 1 }); E.enterNode(p, E.availableNodes(p.run)[0].id);
  assert.equal(p.run.battle.maxEnergy, 4);
});
test('every event option has a working, serializable transition', () => {
  for (const [id, options] of Object.entries(EVENT_EFFECTS)) for (let i = 0; i < options.length; i++) {
    const p = E.newProfile(); E.startRun(p, { seed: 3 });
    const r = p.run; r.gold = 500; r.nodeId = r.map[0][0].id; r.phase = 'event'; r.event = { id, choice: null };
    E.addCard(p, 'pyro_flare');
    E.chooseEvent(p, i);
    if (r.phase === 'duplicate') E.selectDeckCard(p, r.deck[0].uid);
    validateProfile(p); assert.ok(p.meta.completedEvents.includes(id));
  }
});
test('shop purchases are single use, removals cost gold, rest upgrades persist', () => {
  const p = E.newProfile(); E.startRun(p, { seed: 1 });
  const r = p.run; r.map[0][0].type = 'shop'; E.enterNode(p, r.map[0][0].id); r.gold = 1000;
  E.shopAction(p, 'card', 0); assert.equal(r.deck.length, STARTER.length + 1);
  assert.throws(() => E.shopAction(p, 'card', 0));
  E.shopAction(p, 'remove'); E.selectDeckCard(p, r.deck[0].uid); assert.equal(r.deck.length, STARTER.length);
  E.shopAction(p, 'leave'); assert.equal(r.row, 0);
  r.phase = 'rest'; E.rest(p, 'upgrade'); const c = r.deck[0]; E.selectDeckCard(p, c.uid); assert.ok(c.upgraded);
  validateProfile(p);
});
test('all 64 nodes can be completed through the real state machine and unlock all chapters', () => {
  const p = E.newProfile(); E.startRun(p, { seed: 851 });
  const r = p.run; r.maxHp = r.hp = 5000;
  let steps = 0;
  while (r.phase !== 'finished' && steps++ < 5000) {
    if (r.phase === 'map') {
      const node = E.availableNodes(r)[0];
      if (node.row > 0 && node.row < 6) node.type = 'battle';
      E.enterNode(p, node.id);
    } else if (r.phase === 'combat') {
      r.battle.energy = 100;
      const c = E.addCard(p, 'redtide');
      r.battle.hand.push(E.clone(c));
      E.playCard(p, c.uid, r.battle.enemies.find(e => e.hp > 0).id);
    } else if (r.phase === 'reward') E.takeReward(p, r.rewards.cards[0]);
    else if (r.phase === 'rest') E.rest(p, 'heal');
    else throw new Error(`Unexpected phase ${r.phase}`);
    validateProfile(p);
  }
  assert.equal(r.phase, 'finished'); assert.equal(r.summary.victory, true);
  assert.equal(r.nodesCleared, 64); assert.equal(p.meta.unlockedArchons.length, 8);
  assert.equal(p.meta.maxSpiral, 1); assert.equal(p.meta.victories, 1);
});
test('boss mechanics have real counters', () => {
  const dragon = setup('boss', 0); E.endTurn(dragon);
  assert.ok(dragon.run.battle.enemies[0].flying);
  const e = dragon.run.battle.enemies[0]; e.aura = 'hydro';
  E.elementalHit(dragon, e, 'anemo', 7); assert.equal(e.flying, false); assert.ok(e.stun);
  const whale = setup('boss', 4); hand(whale, ['hydro_tide']);
  assert.ok(whale.run.battle.blackhole); E.playCard(whale, 'test0'); assert.equal(whale.run.battle.blackhole, false);
  const armor = setup('boss', 5); assert.equal(armor.run.battle.enemies[0].armor, 30);
  E.elementalHit(armor, armor.run.battle.enemies[0], 'pyro', 10); assert.equal(armor.run.battle.enemies[0].armor, 29);
  const moon = setup('boss', 6); E.endTurn(moon); E.endTurn(moon);
  assert.ok(moon.run.battle.hand.some(c => c.cardId === 'fragment'));
});
