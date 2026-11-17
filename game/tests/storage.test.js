import test from 'node:test';
import assert from 'node:assert/strict';
import { newProfile, startRun, enterNode, availableNodes, playCard, cardProblem } from '../public/src/engine.js';
import { PREFIX, loadSlot, saveSlot, parseSave, serializeSave } from '../public/src/storage.js';
function memory() { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }; }
test('slots remain independent and preserve a validated previous backup', () => {
  const s = memory(), p = loadSlot(1, s).profile; startRun(p, { seed: 4 });
  saveSlot(1, p, s); p.run.gold = 500; saveSlot(1, p, s);
  assert.equal(loadSlot(1, s).profile.run.gold, 500);
  assert.equal(parseSave(s.getItem(PREFIX + '1:backup')).profile.run.gold, 100);
  assert.equal(loadSlot(2, s).profile.run, null);
});
test('corrupted current slot recovers from backup and preserves damaged bytes', () => {
  const s = memory(), p = newProfile(); loadSlot(1, s);
  saveSlot(1, p, s); p.meta.echoes = 20; saveSlot(1, p, s);
  s.setItem(PREFIX + '1', '{broken');
  const result = loadSlot(1, s);
  assert.equal(result.recovered, true); assert.equal(result.profile.meta.echoes, 0);
  assert.equal(s.getItem(PREFIX + '1:damaged'), '{broken');
  saveSlot(1, result.profile, s); // Recovered state stays writable.
});
test('a stale writer cannot overwrite a newer revision', () => {
  const s = memory(), p = loadSlot(3, s).profile; saveSlot(3, p, s);
  const raw = JSON.parse(s.getItem(PREFIX + '3')); raw.revision += 1; s.setItem(PREFIX + '3', JSON.stringify(raw));
  assert.throws(() => saveSlot(3, p, s), /标签页/);
});
test('invalid, incompatible, incomplete, oversized and malicious states are rejected', () => {
  assert.throws(() => parseSave('{'));
  assert.throws(() => parseSave(JSON.stringify({ format: 'other' })));
  assert.throws(() => parseSave(' '.repeat(2_000_001)));
  const p = newProfile(); startRun(p, { seed: 9 }); enterNode(p, availableNodes(p.run)[0].id);
  const envelope = JSON.parse(serializeSave(p));
  const mutations = [
    x => x.profile.version = 999,
    x => x.profile.run.deck[0].cardId = '__proto__',
    x => x.profile.run.hp = -1,
    x => x.profile.run.battle.energy = null,
    x => x.profile.run.battle.enemies[0].intent = {},
    x => x.profile.run.map = [],
    x => x.profile.meta.unlockedRelics = ['not-a-relic'],
    x => x.profile.run.battle.hand.push(x.profile.run.battle.hand[0])
  ];
  for (const mutate of mutations) { const raw = structuredClone(envelope); mutate(raw); assert.throws(() => parseSave(JSON.stringify(raw))); }
});
test('full battle export preserves state after a played card', () => {
  const p = newProfile(); startRun(p, { seed: 9 }); enterNode(p, availableNodes(p.run)[0].id);
  const c = p.run.battle.hand.find(c => !cardProblem(p, c)); playCard(p, c.uid);
  assert.deepEqual(parseSave(serializeSave(p)).profile, p);
});
test('文字大小设置会被保存校验，旧存档缺少该字段仍可读取', () => {
  const s = memory(), p = newProfile();
  assert.equal(p.settings.textScale, 0);        // 0 表示自适应
  p.settings.textScale = 130;
  loadSlot(1, s);                               // 先读取一次，建立修订号基线
  saveSlot(1, p, s);
  assert.equal(loadSlot(1, s).profile.settings.textScale, 130);
  const saved = JSON.parse(s.getItem(PREFIX + '1'));
  saved.profile.settings.textScale = 999;
  assert.throws(() => parseSave(JSON.stringify(saved)), /存档结构/);
  // 升级前写入的存档没有 textScale，必须继续视为有效（按自适应处理）。
  delete saved.profile.settings.textScale;
  assert.equal(parseSave(JSON.stringify(saved)).profile.settings.textScale, undefined);
});
