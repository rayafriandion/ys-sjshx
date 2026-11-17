import { VERSION, CARDS, CHAPTERS, ARCHONS, RELICS, NODE_TYPES, EVENT_IDS } from './data.js';
import { newProfile } from './engine.js';

export const PREFIX = 'irminsul:v1:';
export const SAVE_LIMIT = 2_000_000;
const phases = ['map', 'combat', 'reward', 'event', 'shop', 'rest', 'upgrade', 'duplicate', 'remove', 'finished'];
const expectedRevisions = new Map();
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const assert = (condition, message = '存档结构不完整或包含非法数据。') => { if (!condition) throw new Error(message); };
const num = (v, min = 0, max = 1_000_000) => Number.isFinite(v) && Number.isInteger(v) && v >= min && v <= max;
const text = (v, max = 500) => typeof v === 'string' && v.length <= max;
const list = (v, max = 1000) => Array.isArray(v) && v.length <= max;
const known = (id, dict) => typeof id === 'string' && Object.hasOwn(dict, id);
const member = (v, values) => values.includes(v);
function cards(cards) {
  assert(list(cards, 600));
  const ids = new Set();
  for (const c of cards) { assert(object(c) && known(c.cardId, CARDS) && text(c.uid, 64) && typeof c.upgraded === 'boolean' && !ids.has(c.uid)); ids.add(c.uid); }
}
export function validateProfile(p) {
  assert(object(p) && p.version === VERSION, '存档版本不兼容。');
  assert(object(p.settings) && typeof p.settings.sound === 'boolean' && typeof p.settings.motion === 'boolean');
  // textScale 是后加的设置项：旧存档没有该字段时按自适应（0）处理，不能因此判为损坏。
  assert(p.settings.textScale === undefined || num(p.settings.textScale, 0, 300));
  const m = p.meta;
  assert(object(m) && object(m.talents));
  for (const k of ['echoes', 'runs', 'victories', 'bestFloor', 'maxSpiral']) assert(num(m[k]));
  assert(m.bestFloor <= 8 && m.maxSpiral <= 12);
  for (const [k, max] of Object.entries({ vitality: 5, energy: 1, reroll: 3, blessing: 1 })) assert(num(m.talents[k], 0, max));
  for (const [key, dict] of [['unlockedArchons', ARCHONS], ['unlockedCards', CARDS], ['unlockedRelics', RELICS]]) assert(list(m[key], 100) && m[key].every(id => known(id, dict)) && new Set(m[key]).size === m[key].length);
  assert(list(m.completedEvents, 20) && m.completedEvents.every(id => EVENT_IDS.includes(id)));
  assert(p.updatedAt === null || text(p.updatedAt, 100));
  if (p.run === null) return p;
  const r = p.run;
  assert(object(r) && text(r.id, 100) && member(r.phase, phases));
  assert(object(r.talents));
  for (const [k, max] of Object.entries({ vitality: 5, energy: 1, reroll: 3, blessing: 1 })) assert(num(r.talents[k], 0, max));
  for (const k of ['seed', 'rng']) assert(num(r[k], 0, 0xffffffff));
  for (const k of ['nextUid', 'gold', 'fights', 'elites', 'reactions', 'nodesCleared', 'revive', 'futureEnergy']) assert(num(r[k]));
  assert(num(r.floor, 0, 7) && num(r.row, -1, 7) && num(r.spiral, 0, 12));
  assert(num(r.maxHp, 1, 10000) && num(r.hp, 0, r.maxHp) && (r.hp > 0 || r.phase === 'finished'));
  assert(typeof r.night === 'boolean');
  cards(r.deck); assert(r.deck.length >= 1);
  assert(list(r.relics, 32) && r.relics.every(id => known(id, RELICS)) && new Set(r.relics).size === r.relics.length);
  assert(list(r.archons, 8) && new Set(r.archons.map(a => a.id)).size === r.archons.length && r.archons.every(a => object(a) && known(a.id, ARCHONS) && num(a.cooldown, 0, 10)));
  assert(list(r.map, 8) && r.map.length === 8);
  const nodeIds = new Set();
  r.map.forEach((row, i) => {
    assert(list(row, 3) && row.length === ([0, 6, 7].includes(i) ? 1 : 3));
    for (const n of row) {
      assert(object(n) && text(n.id, 64) && !nodeIds.has(n.id) && n.row === i && num(n.lane, 0, 2) && known(n.type, NODE_TYPES) && typeof n.done === 'boolean');
      nodeIds.add(n.id);
    }
  });
  assert(r.nodeId === null || nodeIds.has(r.nodeId));
  if (r.phase !== 'map' && r.phase !== 'finished') assert(r.nodeId !== null);
  if (r.battle !== null) {
    const b = r.battle;
    assert(object(b) && member(b.kind, ['battle', 'elite', 'boss']) && num(b.turn, 1, 100000));
    for (const k of ['energy', 'maxEnergy', 'shield', 'reactions', 'cardsPlayed', 'cores', 'doubleCards', 'damageBonus', 'resonance', 'fanfare', 'salon', 'undying', 'bond', 'moon']) assert(num(b[k]));
    for (const k of ['anemoUsed', 'pyroDouble', 'electroInfusion', 'riptide', 'blackhole']) assert(typeof b[k] === 'boolean');
    const uids = new Set();
    for (const k of ['hand', 'draw', 'discard', 'exhaust']) {
      cards(b[k]); for (const c of b[k]) { assert(!uids.has(c.uid)); uids.add(c.uid); }
    }
    assert(list(b.log, 30) && b.log.every(v => text(v)));
    for (const k of ['freeUids', 'discountedUids']) assert(list(b[k], 600) && b[k].every(v => text(v, 64)));
    if (b.inspect !== null) { assert(object(b.inspect)); cards(b.inspect.cards); assert(list(b.inspect.selected, 2) && b.inspect.selected.every(id => b.inspect.cards.some(c => c.uid === id))); }
    assert(list(b.enemies, 12) && b.enemies.length >= 1);
    assert(new Set(b.enemies.map(e => e.id)).size === b.enemies.length);
    for (const e of b.enemies) {
      assert(object(e) && text(e.id, 64) && member(e.element, ['physical', 'anemo', 'geo', 'pyro', 'hydro', 'cryo', 'electro', 'dendro', 'lunar']));
      assert(num(e.maxHp, 1) && num(e.hp, 0, e.maxHp));
      for (const k of ['shield', 'auraTurns', 'frozen', 'stun', 'vulnerable', 'quicken', 'armor']) assert(num(e[k]));
      assert(e.aura === null || member(e.aura, ['pyro', 'hydro', 'cryo', 'electro', 'dendro']));
      assert(object(e.intent) && member(e.intent.type, ['execute', 'charge', 'attack', 'defend', 'buff']));
      if (e.intent.type === 'defend') assert(num(e.intent.shield)); else assert(num(e.intent.damage));
    }
  }
  if (['combat', 'reward'].includes(r.phase)) assert(r.battle !== null);
  if (r.rewards !== null) {
    const q = r.rewards;
    assert(object(q) && list(q.cards, 3) && q.cards.length === 3 && q.cards.every(id => known(id, CARDS)) && num(q.gold) && num(q.rerolls, 0, 3) && typeof q.boss === 'boolean');
    assert(q.relic === null || known(q.relic, RELICS)); assert(q.archon === null || known(q.archon, ARCHONS));
  }
  if (r.phase === 'reward') assert(r.rewards !== null);
  if (r.event !== null) assert(object(r.event) && EVENT_IDS.includes(r.event.id));
  if (['event', 'duplicate'].includes(r.phase)) assert(r.event !== null);
  if (r.shop !== null) {
    assert(object(r.shop) && list(r.shop.cards, 3));
    for (const c of r.shop.cards) assert(object(c) && known(c.id, CARDS) && num(c.price) && typeof c.sold === 'boolean');
    assert(r.shop.relic === null || known(r.shop.relic, RELICS));
    assert(typeof r.shop.relicSold === 'boolean' && typeof r.shop.removed === 'boolean');
  }
  if (['shop', 'remove'].includes(r.phase)) assert(r.shop !== null);
  if (r.summary !== null) {
    assert(object(r.summary) && typeof r.summary.victory === 'boolean');
    for (const k of ['echoes', 'floor', 'fights', 'reactions']) assert(num(r.summary[k]));
  }
  if (r.phase === 'finished') assert(r.summary !== null);
  return p;
}
export function parseSave(raw) {
  assert(typeof raw === 'string' && raw.length <= SAVE_LIMIT, '存档文件过大，最大 2 MB。');
  let envelope;
  try { envelope = JSON.parse(raw); } catch { throw new Error('无法读取 JSON 存档。'); }
  assert(object(envelope) && envelope.format === 'irminsul-save' && envelope.version === VERSION, '这不是兼容的世界树回响存档。');
  assert(num(envelope.revision) && text(envelope.savedAt, 100));
  validateProfile(envelope.profile);
  return envelope;
}
export function serializeSave(profile, revision = 0) {
  validateProfile(profile);
  return JSON.stringify({ format: 'irminsul-save', version: VERSION, revision, savedAt: new Date().toISOString(), profile }, null, 2);
}
export function loadSlot(slot, storage = localStorage) {
  const key = PREFIX + slot, raw = storage.getItem(key);
  if (!raw) { expectedRevisions.set(key, 0); return { profile: newProfile(), recovered: false }; }
  try {
    const save = parseSave(raw); expectedRevisions.set(key, save.revision);
    return { profile: save.profile, recovered: false };
  } catch {
    const backup = storage.getItem(key + ':backup');
    if (backup) {
      try {
        const saved = parseSave(backup);
        // Preserve the unreadable file for manual recovery; never silently discard it.
        storage.setItem(key + ':damaged', raw);
        storage.setItem(key, backup);
        expectedRevisions.set(key, saved.revision);
        return { profile: saved.profile, recovered: true };
      } catch { /* Surface recovery failure with the original data still intact. */ }
    }
    throw new Error('此槽位存档损坏。请导入备份，或切换另一槽位；原始数据已保留。');
  }
}
export function saveSlot(slot, profile, storage = localStorage, replace = false) {
  const key = PREFIX + slot, raw = storage.getItem(key);
  let actual = 0;
  if (raw) { try { actual = parseSave(raw).revision; } catch { if (!replace) throw new Error('现有存档无法读取，请先导出或更换槽位。'); } }
  if (!replace && actual !== (expectedRevisions.get(key) ?? 0)) throw new Error('另一标签页更新了此存档。请重新载入后继续。');
  const savedAt = new Date().toISOString();
  const next = { ...profile, updatedAt: savedAt };
  const serialized = serializeSave(next, actual + 1);
  if (raw) {
    try { parseSave(raw); storage.setItem(key + ':backup', raw); } catch { storage.setItem(key + ':damaged', raw); }
  }
  storage.setItem(key, serialized);
  profile.updatedAt = savedAt;
  expectedRevisions.set(key, actual + 1);
}
export function slotSummary(slot, storage = localStorage) {
  try { const raw = storage.getItem(PREFIX + slot); if (!raw) return null; return parseSave(raw); }
  catch { return { damaged: true }; }
}
