import test from 'node:test';
import assert from 'node:assert/strict';
import { newProfile, startRun, enterNode, availableNodes, playCard, cardProblem } from '../public/src/engine.js';
import { PREFIX, loadSlot, saveSlot, parseSave, serializeSave, encodeSaveText, decodeSaveText } from '../public/src/storage.js';
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
test('存档可以导出为字符文本，并能从字符文本原样导入', async () => {
  const p = newProfile(); startRun(p, { seed: 9 }); enterNode(p, availableNodes(p.run)[0].id);
  const raw = serializeSave(p), text = await encodeSaveText(raw);
  assert.match(text, /^IRMINSUL1[ZP]\.[A-Za-z0-9_-]+$/);
  assert.deepEqual((await decodeSaveText(text)).profile, p);
  // 聊天软件、邮件常把长文本折行；导入时应忽略所有空白。
  assert.deepEqual((await decodeSaveText(text.replace(/(.{50})/g, '$1\n'))).profile, p);
  assert.deepEqual((await decodeSaveText(`  ${text}  `)).profile, p);
  // 也接受直接粘贴 JSON 文件内容。
  assert.deepEqual((await decodeSaveText(raw)).profile, p);
  // 有 CompressionStream 时必须真的压缩，否则文本会长到无法粘贴。
  if (text.startsWith('IRMINSUL1Z.')) assert.ok(text.length < raw.length);
});
test('缺失压缩能力时退回未压缩文本，仍可互相导入', async () => {
  const compressed = globalThis.CompressionStream;
  const p = newProfile(), raw = serializeSave(p);
  try {
    globalThis.CompressionStream = undefined;
    const plain = await encodeSaveText(raw);
    assert.match(plain, /^IRMINSUL1P\./);
    assert.deepEqual((await decodeSaveText(plain)).profile, p);
    // 压缩端产出的文本在无压缩能力的运行环境里也必须能解开。
    globalThis.CompressionStream = compressed;
    const packed = await encodeSaveText(raw);
    globalThis.CompressionStream = undefined;
    if (packed.startsWith('IRMINSUL1Z.')) assert.deepEqual((await decodeSaveText(packed)).profile, p);
  } finally { globalThis.CompressionStream = compressed; }
});
test('空、乱码、截断或内容非法的存档文本都会被拒绝', async () => {
  await assert.rejects(() => decodeSaveText(''), /粘贴/);
  await assert.rejects(() => decodeSaveText('   '), /粘贴/);
  await assert.rejects(() => decodeSaveText('随便一段文字'), /存档文本/);
  await assert.rejects(() => decodeSaveText('IRMINSUL1Z.@@@@@@@@'), /存档文本/);
  await assert.rejects(() => decodeSaveText('IRMINSUL1Z.AAAA'), /损坏/);
  await assert.rejects(() => decodeSaveText('IRMINSUL2Z.AAAA'), /存档文本/);
  // 压缩正确但内容不是合法存档：必须走同一套结构校验。
  const bogus = await encodeSaveText('{"format":"other"}');
  await assert.rejects(() => decodeSaveText(bogus), /存档/);
  const text = await encodeSaveText(serializeSave(newProfile()));
  await assert.rejects(() => decodeSaveText(text.slice(0, -12)), /损坏|JSON/);
});
