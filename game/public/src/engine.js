import { VERSION, CARDS, CHAPTERS, ARCHONS, RELICS, TALENTS, STARTER, BURSTS, EVENT_EFFECTS, cardStats } from './data.js';

// All gameplay is deterministic from run.rng. The complete state is plain JSON.
export const clone = value => structuredClone(value);
export function newProfile() {
  return { version: VERSION, updatedAt: null, settings: { sound: false, motion: true, textScale: 0 }, meta: { echoes: 0, unlockedArchons: [], unlockedCards: [...new Set(STARTER)], unlockedRelics: [], completedEvents: [], talents: { vitality: 0, energy: 0, reroll: 0, blessing: 0 }, runs: 0, victories: 0, bestFloor: 0, maxSpiral: 0 }, run: null };
}
export function random(run) {
  let t = run.rng = (run.rng + 0x6D2B79F5) >>> 0;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
const pick = (run, arr) => arr[Math.floor(random(run) * arr.length)];
export function shuffle(run, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random(run) * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
export function makeMap(run) {
  return Array.from({ length: 8 }, (_, row) => {
    const count = [0, 6, 7].includes(row) ? 1 : 3;
    return Array.from({ length: count }, (_, lane) => ({
      id: `${run.floor}-${row}-${lane}`, row, lane: count === 1 ? 1 : lane,
      type: row === 0 ? 'battle' : row === 6 ? 'rest' : row === 7 ? 'boss' : row === 4 && lane === 1 ? 'elite' : pick(run, ['battle', 'battle', 'event', 'event', 'shop', ...(run.spiral >= 1 ? ['elite', 'elite'] : ['elite'])]),
      done: false
    }));
  });
}
export function availableNodes(run) {
  if (run.phase !== 'map') return [];
  const nodes = run.map[run.row + 1] || [];
  const prev = run.map.flat().find(n => n.id === run.nodeId);
  return nodes.filter(n => !prev || nodes.length === 1 || run.map[run.row].length === 1 || Math.abs(n.lane - prev.lane) <= 1);
}
export function addCard(profile, cardId, upgraded = false) {
  const c = { uid: `c${profile.run.nextUid++}`, cardId, upgraded };
  profile.run.deck.push(c);
  if (!profile.meta.unlockedCards.includes(cardId)) profile.meta.unlockedCards.push(cardId);
  return c;
}
function tempCard(run, cardId) { return { uid: `t${run.nextUid++}`, cardId, upgraded: false }; }
export function startRun(profile, { seed = Date.now() >>> 0, blessing = null, spiral = 0 } = {}) {
  const maxHp = 80 + profile.meta.talents.vitality * 10;
  profile.run = { id: `${Date.now()}-${seed}`, seed: seed >>> 0, rng: seed >>> 0, nextUid: 1, talents: { ...profile.meta.talents }, spiral: Math.min(profile.meta.maxSpiral, Math.max(0, Math.floor(spiral))), floor: 0, row: -1, nodeId: null, phase: 'map', hp: maxHp, maxHp, gold: 100, deck: [], relics: ['compass'], archons: [], map: [], battle: null, rewards: null, event: null, shop: null, fights: 0, elites: 0, reactions: 0, nodesCleared: 0, revive: 0, night: false, futureEnergy: 0, summary: null, history: [] };
  for (const id of STARTER) addCard(profile, id);
  if (profile.meta.talents.blessing && profile.meta.unlockedArchons.includes(blessing)) profile.run.archons.push({ id: blessing, cooldown: 0 });
  profile.run.map = makeMap(profile.run);
  profile.meta.runs++;
  if (!profile.meta.unlockedRelics.includes('compass')) profile.meta.unlockedRelics.push('compass');
  return profile.run;
}
export function enterNode(profile, nodeId) {
  const r = profile.run, node = availableNodes(r).find(n => n.id === nodeId);
  if (!node) throw new Error('请选择相连且尚未探索的节点。');
  r.nodeId = node.id;
  if (['battle', 'elite', 'boss'].includes(node.type)) beginBattle(profile, node.type);
  else if (node.type === 'rest') r.phase = 'rest';
  else if (node.type === 'shop') { r.phase = 'shop'; r.shop = { cards: rewardPool(r, 3).map(id => ({ id, price: CARDS[id].rarity === 'rare' ? 95 : 60, sold: false })), relic: pick(r, Object.keys(RELICS).filter(id => !r.relics.includes(id))) || null, relicSold: false, removed: false }; }
  else {
    const pools = [['bard', 'nail'], ['bard', 'nail'], ['night', 'forest', 'desert'], ['night', 'forest', 'desert'], ['formula', 'tea'], ['formula', 'tea', 'totem'], ['lantern', 'witch', 'totem'], ['lantern', 'witch']];
    r.phase = 'event'; r.event = { id: pick(r, pools[r.floor]), choice: null };
  }
}
function completeNode(profile) {
  const r = profile.run, node = r.map.flat().find(n => n.id === r.nodeId);
  if (node) { node.done = true; r.row = node.row; r.nodesCleared++; }
  r.phase = 'map'; r.battle = null; r.rewards = null; r.event = null; r.shop = null; r.selection = null;
  profile.meta.bestFloor = Math.max(profile.meta.bestFloor, r.floor + 1);
}
function energyMax(profile) { return 3 + profile.run.talents.energy + (profile.run.relics.includes('sigil') ? 1 : 0); }
export function beginBattle(profile, kind = 'battle') {
  const r = profile.run, floor = r.floor;
  const count = kind === 'boss' ? 1 : kind === 'elite' ? 2 : floor === 0 ? 1 : Math.min(3, 1 + Math.floor(floor / 3) + (random(r) > 0.65 ? 1 : 0));
  const b = r.battle = { kind, turn: 1, energy: energyMax(profile), maxEnergy: energyMax(profile), shield: 0, hand: [], draw: shuffle(r, r.deck.map(clone)), discard: [], exhaust: [], enemies: [], log: [], reactions: 0, cardsPlayed: 0, anemoUsed: false, cores: 0, doubleCards: 0, damageBonus: 0, resonance: 0, fanfare: 0, salon: 0, pyroDouble: false, electroInfusion: false, undying: 0, bond: 0, riptide: false, moon: 0, blackhole: floor === 4 && kind === 'boss', inspect: null, freeUids: [], discountedUids: [], eventBonus: r.event?.choice === 'eye' ? 'eye' : r.event?.choice === 'elite' ? 'desert' : null, reactionBanner: null };
  for (let i = 0; i < count; i++) {
    const hp = Math.round((kind === 'boss' ? CHAPTERS[floor].hp : kind === 'elite' ? 42 + floor * 14 : 30 + floor * 10) * (1 + r.spiral * 0.06));
    b.enemies.push({ id: `e${i}`, element: kind === 'boss' ? CHAPTERS[floor].element : pick(r, ['pyro', 'hydro', 'electro', 'cryo', 'dendro']), hp, maxHp: hp, shield: kind === 'elite' ? 6 : 0, boss: kind === 'boss', elite: kind === 'elite', aura: null, auraTurns: 0, frozen: 0, stun: 0, vulnerable: 0, quicken: 0, armor: kind === 'boss' && floor === 5 ? 30 : 0, flying: false, intent: null });
  }
  if (floor === 7 && kind === 'boss' && r.relics.includes('eye')) { const e = b.enemies[0]; e.maxHp = Math.round(e.maxHp * 0.85); e.hp = e.maxHp; }
  if (floor === 7 && kind === 'boss' && r.spiral >= 10) b.bond = Math.ceil(r.maxHp * 0.2);
  for (const a of r.archons) a.cooldown = 0;
  if (hasArchon(r, 'nahida')) for (const e of b.enemies) { e.aura = 'dendro'; e.auraTurns = 3; }
  r.phase = 'combat';
  setIntents(profile);
  if (r.relics.includes('sword')) hurtPlayer(profile, Math.ceil(r.hp * 0.1), true);
  beginTurn(profile, true);
  log(b, '战斗开始 · 选择卡牌，再选择目标。');
}
const hasArchon = (r, id) => r.archons.some(a => a.id === id);
const alive = b => b.enemies.filter(e => e.hp > 0);
function log(b, text) { b.log.unshift(text); b.log = b.log.slice(0, 30); }
function beginTurn(profile, first = false) {
  const r = profile.run, b = r.battle;
  if (r.phase !== 'combat') return;
  b.maxEnergy = energyMax(profile);
  b.energy = b.maxEnergy - (b.blackhole ? 1 : 0) + (first ? r.futureEnergy + (r.relics.includes('prism') ? 1 : 0) : 0);
  if (first) r.futureEnergy = 0;
  b.cardsPlayed = 0; b.anemoUsed = false; b.pyroDouble = false; b.electroInfusion = false; b.doubleCards = 0;
  b.freeUids = []; b.discountedUids = [];
  if (r.relics.includes('amber')) gainShield(r, 3);
  if (r.relics.includes('seed')) gainShield(r, 5);
  const electroSet = r.relics.filter(id => RELICS[id].element === 'electro').length >= 2 && b.maxEnergy >= 4;
  drawCards(profile, 5 + (first && r.relics.includes('compass') ? 1 : 0) + (electroSet ? 1 : 0));
  if (!first) for (const a of r.archons) a.cooldown = Math.max(0, a.cooldown - 1);
  if (b.kind === 'boss') {
    const boss = b.enemies[0];
    if (r.floor === 0 && b.turn % 2 === 0) { boss.shield += 20; boss.flying = true; log(b, '首领升空 · 获得 20 护盾。'); }
    if (r.floor === 3 && b.turn > 1) {
      for (let i = 0; i < 2 && alive(b).length < 4; i++) {
        const element = pick(r, ['pyro', 'hydro', 'electro', 'cryo']);
        b.enemies.push({ id: `cannon${r.nextUid++}`, element, hp: 20, maxHp: 20, shield: 0, aura: element, auraTurns: 99, frozen: 0, stun: 0, vulnerable: 0, quicken: 0, armor: 0, cannon: true, intent: { type: 'attack', damage: 9 } });
      }
    }
    if (r.floor === 6 && !hasArchon(r, 'columbina')) {
      b.moon = (b.turn - 1) % 3;
      if (b.moon === 2) { b.hand.push(tempCard(r, 'fragment')); log(b, '蚀月 · 净化碎片以避免 15 点伤害。'); }
    }
  }
}
export function drawCards(profile, count) {
  const r = profile.run, b = r.battle;
  for (let i = 0; i < count && b.hand.length < 10 && r.phase === 'combat'; i++) {
    if (!b.draw.length && b.discard.length) { b.draw = shuffle(r, b.discard); b.discard = []; }
    if (!b.draw.length) break;
    const c = b.draw.pop();
    b.hand.push(c);
    if (CARDS[c.cardId].onDrawDamage) hurtPlayer(profile, CARDS[c.cardId].onDrawDamage, true);
  }
}
export function cardCost(profile, c) {
  const r = profile.run, b = r.battle, d = CARDS[c.cardId];
  if (b?.freeUids.includes(c.uid)) return 0;
  return Math.max(0, d.cost - (c.upgraded && ['resonance', 'focus'].includes(c.cardId) ? 1 : 0) - (b?.discountedUids.includes(c.uid) ? (c.upgraded ? d.cost : 1) : 0) - (b && d.element === 'anemo' && hasArchon(r, 'venti') && !b.anemoUsed ? 1 : 0));
}
export function cardProblem(profile, c) {
  const r = profile.run, b = r.battle;
  if (r.phase !== 'combat' || !b) return '当前无法出牌';
  if (b.inspect) return '请先选择检视的卡牌';
  if (b.kind === 'boss' && r.floor === 2 && b.turn <= 2 && CARDS[c.cardId].cost >= 2) return '眼狩令：高费牌封印中';
  return cardCost(profile, c) > b.energy ? '能量不足' : null;
}
function gainShield(r, amount) { r.battle.shield += amount + (r.relics.includes('crown') ? 2 : 0); }
function trackHp(r, before) { if (hasArchon(r, 'furina') && before !== r.hp) r.battle.fanfare = Math.min(30, r.battle.fanfare + 1); }
function heal(profile, amount) {
  const r = profile.run, b = r.battle, before = r.hp;
  let healing = amount + (r.relics.includes('goblet') ? 3 : 0);
  if (b?.bond) {
    const removed = Math.min(healing, b.bond);
    b.bond -= removed; healing -= removed;
    if (b.bond === 0) { b.hand.push(tempCard(r, 'redtide')); log(b, '生命契约清除 · 获得 0 费真实伤害牌。'); }
    if (b.bond < r.maxHp * 0.5 && b.enemies.some(e => e.intent?.type === 'execute')) setIntents(profile);
  }
  r.hp = Math.min(r.maxHp, r.hp + healing);
  if (b) trackHp(r, before);
}
export function hurtPlayer(profile, amount, pierce = false) {
  const r = profile.run, b = r.battle, before = r.hp;
  let value = Math.max(0, Math.round(amount));
  if (!pierce) { const blocked = Math.min(b.shield, value); b.shield -= blocked; value -= blocked; }
  r.hp = Math.max(0, r.hp - value);
  trackHp(r, before);
  if (r.hp <= 0) {
    if (b.undying > 0) { b.undying = 0; r.hp = Math.ceil(r.maxHp * 0.3); log(b, '免死生效 · 恢复 30% 生命。'); }
    else if (r.revive > 0) { r.revive--; r.hp = Math.ceil(r.maxHp * 0.5); log(b, '复活生效 · 恢复 50% 生命。'); }
    else finishRun(profile, false);
  }
}
function rawDamage(enemy, amount, { pierce = false, halfShield = false } = {}) {
  if (enemy.hp <= 0) return 0;
  let value = Math.max(0, Math.round(amount));
  if (!pierce && enemy.armor) value = Math.max(1, Math.round(value * Math.max(0.35, 1 - enemy.armor * 0.02)));
  if (!pierce) {
    const blocked = Math.min(enemy.shield, halfShield ? Math.floor(value * 0.5) : value);
    enemy.shield -= blocked; value -= blocked;
  }
  const actual = Math.min(enemy.hp, value);
  enemy.hp -= actual;
  if (enemy.flying && enemy.shield === 0) { enemy.flying = false; enemy.stun = Math.max(enemy.stun, 1); enemy.vulnerable = 2; }
  return actual;
}
function reactionBoost(r) { return (hasArchon(r, 'columbina') ? 1.4 : 1) * (r.relics.includes('sword') ? 1.5 : 1); }
export function elementalHit(profile, enemy, element, base, { trueDamage = false, noReaction = false } = {}) {
  const r = profile.run, b = r.battle;
  if (enemy.hp <= 0) return;
  if (trueDamage) { rawDamage(enemy, base, { pierce: true }); return; }
  if (enemy.boss && enemy.flying && element === 'physical') { log(b, '首领升空中 · 物理攻击无效。'); return; }
  const oldAura = enemy.aura;
  let damage = base + b.damageBonus + (element === 'pyro' && r.relics.includes('ember') ? 2 : 0) + (element === 'anemo' && r.relics.includes('leaf') ? 2 : 0);
  if (enemy.quicken > 0 && ['dendro', 'electro'].includes(element)) damage += 5;
  if (enemy.vulnerable > 0) damage *= 1.25;
  if (hasArchon(r, 'tsaritsa') && enemy.frozen > 0) damage *= 2.5;
  if (b.pyroDouble && element === 'pyro') damage *= 2;
  if (b.electroInfusion && enemy.quicken > 0) damage *= 2;
  damage *= 1 + b.fanfare * 0.02;
  let reaction = null, halfShield = false;
  const pair = [oldAura, element].sort().join('/');
  if (!noReaction && oldAura && oldAura !== element && element !== 'physical' && element !== 'lunar') {
    if (element === 'geo') { reaction = '结晶'; gainShield(r, 6); b.riptide = false; }
    else if (element === 'anemo') {
      reaction = '扩散';
      const extra = (4 + (hasArchon(r, 'venti') ? 3 : 0) + (r.relics.includes('feather') ? 3 : 0)) * reactionBoost(r);
      rawDamage(enemy, extra, { pierce: hasArchon(r, 'columbina') });
      for (const e of alive(b).filter(e => e !== enemy)) { e.aura = oldAura; e.auraTurns = 3; rawDamage(e, extra, { pierce: hasArchon(r, 'columbina') }); }
      if (enemy.flying) { enemy.flying = false; enemy.shield = 0; enemy.stun = 1; enemy.vulnerable = 2; }
      if (r.relics.filter(id => RELICS[id].element === 'anemo').length >= 2) enemy.vulnerable = 3;
    } else if (pair === 'hydro/pyro' || pair === 'cryo/pyro') {
      reaction = pair === 'hydro/pyro' ? '蒸发' : '融化';
      damage *= 1.75 + (r.relics.filter(id => RELICS[id].element === 'pyro').length >= 2 ? 0.35 : 0);
      damage *= reactionBoost(r);
      halfShield = reaction === '融化';
    } else if (pair === 'electro/pyro') {
      reaction = '超载'; rawDamage(enemy, 8 * reactionBoost(r), { pierce: true });
      if (['charge', 'buff', 'execute'].includes(enemy.intent?.type)) enemy.stun = 1;
    } else if (pair === 'electro/hydro') {
      reaction = '感电';
      for (const e of alive(b)) rawDamage(e, 5 * reactionBoost(r), { pierce: hasArchon(r, 'columbina') });
      drawCards(profile, 1);
    } else if (pair === 'cryo/hydro') { reaction = '冻结'; enemy.frozen = 1; if (enemy.boss) enemy.vulnerable = 3; }
    else if (pair === 'dendro/hydro') { reaction = '绽放'; b.cores = Math.min(3, b.cores + 1); }
    else if (pair === 'dendro/electro') { reaction = '激化'; enemy.quicken = 3; }
    if (reaction && element !== 'geo') { enemy.aura = null; enemy.auraTurns = 0; }
  }
  if (!reaction && ['pyro', 'hydro', 'cryo', 'electro', 'dendro'].includes(element)) { enemy.aura = element; enemy.auraTurns = 3; }
  if (b.cores && ['pyro', 'electro'].includes(element)) {
    const seeds = b.cores; b.cores = 0;
    for (let i = 0; i < seeds; i++) if (element === 'pyro') for (const e of alive(b)) rawDamage(e, 12 * reactionBoost(r), { pierce: true }); else rawDamage(enemy, 12 * reactionBoost(r), { pierce: true });
    log(b, `${element === 'pyro' ? '烈' : '超'}绽放 · 引爆 ${seeds} 枚草原核。`);
  }
  if (enemy.armor && !['physical', 'lunar'].includes(element)) enemy.armor--;
  const actual = rawDamage(enemy, damage, { pierce: !!reaction && hasArchon(r, 'columbina'), halfShield });
  if (reaction) {
    b.reactions++; r.reactions++; b.reactionBanner = reaction;
    b.damageBonus += b.resonance;
    log(b, `${reaction} · ${Math.round(damage)} 点伤害`);
    if (hasArchon(r, 'raiden') && b.reactions % 3 === 0) b.energy++;
    if (hasArchon(r, 'nahida')) for (const e of alive(b).filter(e => e !== enemy)) rawDamage(e, actual * 0.5, { pierce: true });
    if (b.kind === 'boss' && r.floor === 3 && b.hand.length < 10) b.hand.push(tempCard(r, 'terminal'));
  }
  return reaction;
}
function checkVictory(profile) {
  const r = profile.run, b = r.battle;
  if (r.phase !== 'combat') return;
  if (b.enemies.filter(e => !e.cannon).every(e => e.hp <= 0)) {
    for (const e of b.enemies) e.hp = 0;
    r.fights++;
    if (b.kind === 'elite') r.elites++;
    const gold = (b.kind === 'boss' ? 100 : b.kind === 'elite' ? 55 : 28 + Math.floor(random(r) * 15)) * (r.night ? 2 : 1);
    r.gold += gold;
    if (r.relics.includes('pearl')) heal(profile, 5);
    let relic = null;
    if (b.kind !== 'battle' || random(r) < 0.12) relic = grantRandomRelic(profile);
    if (b.eventBonus === 'desert') { r.gold += 150; grantRandomRelic(profile); }
    if (b.eventBonus === 'eye') giveRelic(profile, 'eye');
    if (b.kind === 'boss') {
      const archon = CHAPTERS[r.floor].archon;
      if (!r.archons.some(a => a.id === archon)) r.archons.push({ id: archon, cooldown: 0 });
      if (!profile.meta.unlockedArchons.includes(archon)) profile.meta.unlockedArchons.push(archon);
      addCard(profile, BURSTS[r.floor]);
      heal(profile, Math.ceil(r.maxHp * 0.2));
    }
    r.rewards = { cards: rewardPool(r, 3), gold, relic, rerolls: r.talents.reroll, boss: b.kind === 'boss', archon: b.kind === 'boss' ? CHAPTERS[r.floor].archon : null };
    r.phase = 'reward';
  }
}
export function playCard(profile, uid, enemyId) {
  const r = profile.run, b = r.battle, c = b?.hand.find(c => c.uid === uid);
  if (!c) throw new Error('这张牌不在手牌中。');
  const problem = cardProblem(profile, c);
  if (problem) throw new Error(problem);
  const d = CARDS[c.cardId], stats = cardStats(c);
  const enemy = alive(b).find(e => e.id === enemyId) || alive(b)[0];
  if ((stats.damage || stats.trueDamage) && !enemy) throw new Error('没有可选目标。');
  b.energy -= cardCost(profile, c);
  if (d.element === 'anemo') b.anemoUsed = true;
  b.hand = b.hand.filter(x => x.uid !== uid);
  b.cardsPlayed++;
  b.reactionBanner = null;
  const repeats = b.doubleCards > 0 ? 2 : 1;
  if (b.doubleCards > 0) b.doubleCards--;
  let amplified = false;
  for (let n = 0; n < repeats && r.phase === 'combat'; n++) {
    if (stats.shield) gainShield(r, stats.shield);
    if (stats.heal) heal(profile, stats.heal);
    if (stats.draw) drawCards(profile, stats.draw);
    if (stats.energy) b.energy += stats.energy;
    if (stats.cores) b.cores = Math.min(3, b.cores + stats.cores);
    if (stats.resonance) b.resonance += stats.resonance + (c.upgraded ? 1 : 0);
    if (stats.cleanse) cleanse(profile);
    if (stats.damage || stats.trueDamage) {
      for (let h = 0; h < (d.hits || 1); h++) for (const target of d.aoe ? alive(b) : [enemy]) {
        const reaction = elementalHit(profile, target, b.electroInfusion && stats.damage ? 'electro' : d.element, stats.damage || stats.trueDamage, { trueDamage: !!stats.trueDamage });
        if (reaction === '扩散' && d.onSwirlDraw) drawCards(profile, d.onSwirlDraw + (c.upgraded ? 1 : 0));
        if (['蒸发', '融化'].includes(reaction)) amplified = true;
        if (stats.interrupt) target.stun = 1;
      }
    }
    if (d.arkhe && b.blackhole) { b.blackhole = false; b.enemies[0].stun = 1; log(b, '黑洞被击碎。'); }
  }
  if (d.returnOnAmplify && amplified && b.hand.length < 10) { b.hand.push(c); if (!b.discountedUids.includes(uid)) b.discountedUids.push(uid); }
  else (d.exhaust ? b.exhaust : b.discard).push(c);
  if (hasArchon(r, 'mavuika') && b.cardsPlayed === 4 && alive(b).length) elementalHit(profile, pick(r, alive(b)), 'pyro', 10);
  log(b, `打出卡牌 · 剩余 ${b.energy} 能量`);
  checkVictory(profile);
}
function setIntents(profile) {
  const r = profile.run, b = r.battle;
  for (const e of alive(b)) {
    const damage = Math.round((e.boss ? 12 + r.floor * 2 : e.elite ? 9 + r.floor : e.cannon ? 9 : 6 + r.floor) * (r.night ? 1.25 : 1) * (1 + r.spiral * 0.06));
    e.intent = e.boss && r.floor === 7 && b.bond >= r.maxHp * 0.5 ? { type: 'execute', damage: 9999 }
      : e.boss && r.floor === 2 && b.turn % 4 === 0 ? { type: 'charge', damage: 45 }
      : b.turn % 3 === 0 && !e.boss ? { type: 'defend', shield: 8 + r.floor * 2 }
      : b.turn % 4 === 0 && e.boss ? { type: 'charge', damage: Math.round(damage * 1.7) }
      : { type: 'attack', damage };
  }
}
export function endTurn(profile) {
  const r = profile.run, b = r.battle;
  if (r.phase !== 'combat' || b.inspect) throw new Error('请先完成当前选择。');
  for (const c of b.hand) if (CARDS[c.cardId].endDamage) hurtPlayer(profile, CARDS[c.cardId].endDamage, true);
  if (r.phase !== 'combat') return;
  const retained = b.hand.filter(c => CARDS[c.cardId].retain);
  b.discard.push(...b.hand.filter(c => !CARDS[c.cardId].retain));
  b.hand = retained;
  while (b.cores > 0 && alive(b).length) { b.cores--; rawDamage(pick(r, alive(b)), 6 * reactionBoost(r), { pierce: true }); }
  if (b.salon > 0) { b.salon--; for (const e of alive(b)) elementalHit(profile, e, 'hydro', 12); }
  checkVictory(profile);
  if (r.phase !== 'combat') return;
  for (const e of alive(b)) {
    if (e.stun > 0 || e.frozen > 0 && !e.boss && ['attack', 'charge'].includes(e.intent.type)) { if (e.stun) e.stun--; log(b, '敌人行动被打断。'); }
    else if (e.intent.type === 'defend') e.shield += e.intent.shield;
    else if (e.intent.type === 'execute') { hurtPlayer(profile, 9999, true); }
    else {
      let damage = e.intent.damage;
      if (e.boss && r.floor === 2 && b.turn % 4 === 0 && b.reactions >= 3) { damage = 0; log(b, '愿望护罩生效 · 抵挡蓄力攻击。'); }
      if (e.boss && r.floor === 1 && b.riptide) damage *= 2;
      hurtPlayer(profile, damage);
      if (r.phase !== 'combat') return;
      if (e.boss && r.floor === 1) b.riptide = true;
      if (e.boss && r.floor === 7 && damage > 0) { b.bond += Math.ceil(r.maxHp * 0.13); log(b, `生命契约 ${b.bond} / ${Math.ceil(r.maxHp * 0.5)}`); }
    }
    for (const key of ['frozen', 'vulnerable', 'quicken']) e[key] = Math.max(0, e[key] - 1);
    if (e.auraTurns > 0 && --e.auraTurns === 0) e.aura = null;
  }
  if (b.undying > 0) b.undying--;
  b.shield = hasArchon(r, 'zhongli') ? Math.floor(b.shield * 0.5) : 0;
  b.turn++;
  setIntents(profile);
  beginTurn(profile);
  log(b, `回合 ${b.turn} · 能量恢复，抽取手牌。`);
}
function cleanse(profile) {
  const b = profile.run.battle, hadBond = b.bond > 0;
  b.bond = 0; b.riptide = false;
  if (b.enemies.some(e => e.intent?.type === 'execute')) setIntents(profile);
  if (hadBond) b.hand.push(tempCard(profile.run, 'redtide'));
  for (const zone of ['hand', 'draw', 'discard']) {
    b.exhaust.push(...b[zone].filter(c => CARDS[c.cardId].rarity === 'curse'));
    b[zone] = b[zone].filter(c => CARDS[c.cardId].rarity !== 'curse');
  }
}
export function useArchon(profile, id) {
  const r = profile.run, b = r.battle, a = r.archons.find(a => a.id === id);
  if (r.phase !== 'combat' || !a || a.cooldown > 0 || b.inspect) throw new Error('助战技能尚不可用。');
  a.cooldown = ARCHONS[id].cd;
  if (id === 'venti') { drawCards(profile, 2); b.doubleCards += 2; }
  if (id === 'zhongli') { for (const e of alive(b)) { elementalHit(profile, e, 'geo', 15); e.stun = 1; } gainShield(r, 15); }
  if (id === 'raiden') b.electroInfusion = true;
  if (id === 'nahida') {
    if (b.draw.length < 5 && b.discard.length) { b.draw.unshift(...shuffle(r, b.discard)); b.discard = []; }
    b.inspect = { cards: b.draw.splice(-5), selected: [] };
    if (!b.inspect.cards.length) b.inspect = null;
  }
  if (id === 'furina') { hurtPlayer(profile, Math.max(1, Math.floor(r.hp * 0.15)), true); b.salon = 3; }
  if (id === 'mavuika') { b.undying = 2; b.pyroDouble = true; }
  if (id === 'columbina') { cleanse(profile); for (let i = 0; i < 3; i++) b.hand.push(tempCard(r, 'lunar_blade')); }
  if (id === 'tsaritsa') { for (const e of alive(b)) { e.aura = 'cryo'; e.auraTurns = 3; } gainShield(r, 20); }
  log(b, '助战技能已发动。');
  checkVictory(profile);
}
export function chooseInspect(profile, uid) {
  const b = profile.run.battle, s = b?.inspect;
  if (profile.run.phase !== 'combat' || !s || s.selected.includes(uid)) throw new Error('无法选择这张牌。');
  const c = s.cards.find(c => c.uid === uid);
  if (!c) throw new Error('卡牌不存在。');
  s.selected.push(uid); b.hand.push(c); b.freeUids.push(uid);
  if (s.selected.length >= Math.min(2, s.cards.length)) { b.draw.push(...s.cards.filter(c => !s.selected.includes(c.uid))); b.inspect = null; }
}
function rewardPool(r, count) {
  const elems = ['physical', 'pyro', 'hydro', 'cryo', 'electro', 'dendro', ...CHAPTERS.slice(0, r.floor + 1).map(c => c.element)];
  return shuffle(r, Object.keys(CARDS).filter(id => !CARDS[id].transient && CARDS[id].rarity !== 'curse' && elems.includes(CARDS[id].element) && !BURSTS.includes(id))).slice(0, count);
}
export function rerollRewards(profile) {
  const r = profile.run;
  if (r.phase !== 'reward' || r.rewards.rerolls <= 0) throw new Error('没有剩余重掷次数。');
  r.rewards.cards = rewardPool(r, 3); r.rewards.rerolls--;
}
export function takeReward(profile, cardId = null) {
  const r = profile.run;
  if (r.phase !== 'reward' || cardId && !r.rewards.cards.includes(cardId)) throw new Error('无效的奖励。');
  if (cardId) addCard(profile, cardId);
  const boss = r.rewards.boss;
  completeNode(profile);
  if (boss) {
    if (r.floor === 7) { finishRun(profile, true); return; }
    r.floor++; r.row = -1; r.nodeId = null; r.night = false; r.map = makeMap(r);
  }
}
export function giveRelic(profile, id) {
  const r = profile.run;
  if (!RELICS[id] || r.relics.includes(id)) return;
  r.relics.push(id);
  if (!profile.meta.unlockedRelics.includes(id)) profile.meta.unlockedRelics.push(id);
  if (id === 'flower') { r.maxHp += 15; r.hp += 15; }
}
function grantRandomRelic(profile) {
  const r = profile.run, pool = Object.keys(RELICS).filter(id => !r.relics.includes(id) && !['eye', 'sword', 'seed'].includes(id));
  if (!pool.length) { r.gold += 40; return null; }
  const id = pick(r, pool); giveRelic(profile, id); return id;
}
export function chooseEvent(profile, index) {
  const r = profile.run;
  if (r.phase !== 'event') throw new Error('当前没有待处理的奇遇。');
  const option = EVENT_EFFECTS[r.event.id][index];
  if (!option || option.cost && r.gold < option.cost || option.hp && r.hp <= option.hp) throw new Error('资源不足。');
  if (option.effect === 'forest' && !r.deck.some(c => CARDS[c.cardId].rarity === 'rare')) throw new Error('需要一张稀有牌。');
  if (option.cost) r.gold -= option.cost;
  if (option.hp) r.hp -= option.hp;
  const effect = option.effect;
  r.event.choice = effect;
  if (!profile.meta.completedEvents.includes(r.event.id)) profile.meta.completedEvents.push(r.event.id);
  if (effect === 'upgrade') shuffle(r, r.deck.filter(c => !c.upgraded)).slice(0, 2).forEach(c => c.upgraded = true);
  if (effect === 'transform') { const c = r.deck.find(c => CARDS[c.cardId].rarity === 'basic'); if (c) { c.cardId = 'anemo_burst'; if (!profile.meta.unlockedCards.includes(c.cardId)) profile.meta.unlockedCards.push(c.cardId); } }
  if (effect === 'sigil') giveRelic(profile, 'sigil');
  if (effect === 'remove') { r.gold += 120; const c = r.deck.find(c => CARDS[c.cardId].rarity === 'basic'); if (c) r.deck = r.deck.filter(x => x.uid !== c.uid); }
  if (effect === 'night') r.night = true;
  if (effect === 'day') { heal(profile, 25); grantRandomRelic(profile); }
  if (effect === 'forest') { const c = r.deck.find(c => CARDS[c.cardId].rarity === 'rare'); r.deck = r.deck.filter(x => x.uid !== c.uid); r.maxHp += 20; r.hp += 20; giveRelic(profile, 'seed'); }
  if (effect === 'curse') { r.hp = r.maxHp; addCard(profile, 'wither'); }
  if (['elite', 'eye'].includes(effect)) { beginBattle(profile, 'elite'); return; }
  if (effect === 'sword') { r.maxHp = Math.ceil(r.maxHp * 0.75); r.hp = Math.min(r.hp, r.maxHp); giveRelic(profile, 'sword'); }
  if (effect === 'purify') { r.gold += 100; r.deck = r.deck.filter(c => CARDS[c.cardId].rarity !== 'curse'); }
  if (effect === 'gamble') { if (random(r) < 0.5) r.gold += 200; else r.hp = Math.max(1, r.hp - Math.floor(r.hp * 0.2)); }
  if (effect === 'duplicate') { r.phase = 'duplicate'; return; }
  if (effect === 'revive') r.revive = 1;
  if (effect === 'mora') r.gold += 60;
  if (effect === 'heal') heal(profile, Math.ceil(r.maxHp * 0.3));
  if (effect === 'relic') grantRandomRelic(profile);
  if (effect === 'future') { r.futureEnergy = 2; for (const a of r.archons) a.cooldown = 0; }
  completeNode(profile);
}
export function rest(profile, type) {
  const r = profile.run;
  if (r.phase !== 'rest') throw new Error('当前不在休息点。');
  if (type === 'heal') { heal(profile, Math.ceil(r.maxHp * (r.spiral >= 6 ? 0.2 : 0.3))); completeNode(profile); }
  else if (type === 'upgrade') r.phase = 'upgrade';
  else throw new Error('请选择恢复或升级。');
}
export function selectDeckCard(profile, uid) {
  const r = profile.run, c = r.deck.find(c => c.uid === uid);
  if (!c) throw new Error('卡牌不存在。');
  if (r.phase === 'upgrade') { if (c.upgraded || CARDS[c.cardId].rarity === 'curse') throw new Error('这张牌无法升级。'); c.upgraded = true; completeNode(profile); }
  else if (r.phase === 'duplicate') { addCard(profile, c.cardId, c.upgraded); completeNode(profile); }
  else if (r.phase === 'remove') { if (r.gold < 75 || r.deck.length <= 5 || r.shop.removed) throw new Error('无法移除此卡牌。'); r.deck = r.deck.filter(x => x.uid !== uid); r.gold -= 75; r.shop.removed = true; r.phase = 'shop'; }
  else throw new Error('当前无需选择卡牌。');
}
export function shopAction(profile, type, index) {
  const r = profile.run;
  if (r.phase !== 'shop') throw new Error('当前不在商店。');
  if (type === 'card') { const item = r.shop.cards[index]; if (!item || item.sold || r.gold < item.price) throw new Error('摩拉不足或商品已售出。'); r.gold -= item.price; item.sold = true; addCard(profile, item.id); }
  else if (type === 'relic') { if (!r.shop.relic || r.shop.relicSold || r.gold < 140) throw new Error('无法购买此圣遗物。'); r.gold -= 140; r.shop.relicSold = true; giveRelic(profile, r.shop.relic); }
  else if (type === 'remove') { if (r.gold < 75 || r.shop.removed || r.deck.length <= 5) throw new Error('摩拉不足，或卡组至少需保留 5 张牌。'); r.phase = 'remove'; }
  else if (type === 'leave') completeNode(profile);
}
export function cancelSelection(profile) {
  const r = profile.run;
  if (r.phase === 'remove') r.phase = 'shop';
  else if (r.phase === 'upgrade') r.phase = 'rest';
  else if (r.phase === 'duplicate') completeNode(profile);
}
export function finishRun(profile, victory = false) {
  const r = profile.run;
  if (!r || r.summary) return;
  const echoes = Math.max(5, Math.floor(r.nodesCleared * 2 + r.fights * 3 + r.elites * 8 + r.floor * 12 + (victory ? 120 : 0)));
  profile.meta.echoes += echoes;
  if (victory) { profile.meta.victories++; profile.meta.maxSpiral = Math.max(profile.meta.maxSpiral, Math.min(12, r.spiral + 1)); }
  r.summary = { victory, echoes, floor: r.floor + 1, fights: r.fights, reactions: r.reactions };
  r.phase = 'finished';
}
export function buyTalent(profile, id) {
  const t = TALENTS[id], level = profile.meta.talents[id];
  if (!t || level >= t.max) throw new Error('天赋已达到上限。');
  const cost = t.base * (level + 1);
  if (profile.meta.echoes < cost) throw new Error('记忆残响不足。');
  profile.meta.echoes -= cost; profile.meta.talents[id]++;
}
