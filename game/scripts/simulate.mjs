// Development-only greedy player. Never imported by the browser or granted bonuses.
// This is a smoke / balance probe, not an estimate of human win rates.
import * as E from '../public/src/engine.js';
import { CARDS, EVENT_EFFECTS } from '../public/src/data.js';
import { validateProfile } from '../public/src/storage.js';
const value = id => {
  const c = CARDS[id], s = c.effects;
  return (s.damage || 0) * (c.aoe ? 1.5 : c.hits || 1) + (s.heal || 0) * 2 + (s.shield || 0) * .6 + (s.draw || 0) * 4 + (s.energy || 0) * 6 + (s.resonance || 0) * 9 - c.cost * 3;
};
const incoming = p => p.run.battle.enemies.filter(e => e.hp > 0 && !e.stun && (!e.frozen || e.boss)).reduce((sum, e) => sum + (e.intent.damage || 0), 0);
function choosePlay(p) {
  const r = p.run, b = r.battle, candidates = [];
  for (const c of b.hand.filter(c => !E.cardProblem(p, c))) for (const enemy of b.enemies.filter(e => e.hp > 0)) {
    const next = E.clone(p); E.playCard(next, c.uid, enemy.id);
    if (next.run.phase === 'finished') continue;
    const nb = next.run.battle;
    const damage = b.enemies.reduce((n, e) => n + e.hp, 0) - nb.enemies.reduce((n, e) => n + e.hp, 0);
    const kills = b.enemies.filter(e => e.hp > 0).length - nb.enemies.filter(e => e.hp > 0).length;
    const block = Math.min(nb.shield, incoming(next)) - Math.min(b.shield, incoming(p));
    const score = damage + kills * 8 + (next.run.hp - r.hp) * 1.4 + block * .8 + (incoming(p) - incoming(next)) + (nb.hand.length - b.hand.length + 1) * 2 + (nb.energy - b.energy + E.cardCost(p, c)) * 4 + (CARDS[c.cardId].effects.resonance ? 10 : 0);
    candidates.push({ c, enemy, score });
  }
  return candidates.sort((a, b) => b.score - a.score)[0];
}
function simulate(seed, developed = false) {
  const p = E.newProfile();
  if (developed) { p.meta.talents = { vitality: 5, energy: 1, reroll: 3, blessing: 1 }; p.meta.unlockedArchons = ['venti']; }
  E.startRun(p, { seed, blessing: developed ? 'venti' : null });
  const r = p.run;
  let steps = 0;
  while (r.phase !== 'finished' && steps++ < 4000) {
    if (r.phase === 'map') {
      const weights = { rest: 10, event: 9, shop: r.gold >= 75 ? 8 : 3, battle: 5, elite: 1, boss: 0 };
      E.enterNode(p, [...E.availableNodes(r)].sort((a, b) => weights[b.type] - weights[a.type])[0].id);
    } else if (r.phase === 'combat') {
      const b = r.battle;
      if (b.inspect) {
        const c = b.inspect.cards.filter(c => !b.inspect.selected.includes(c.uid)).sort((a, b) => value(b.cardId) - value(a.cardId))[0];
        E.chooseInspect(p, c.uid);
      } else {
        const archon = r.archons.find(a => !a.cooldown);
        if (archon) { E.useArchon(p, archon.id); continue; }
        const play = choosePlay(p);
        if (play && play.score > 0) E.playCard(p, play.c.uid, play.enemy.id);
        else E.endTurn(p);
      }
    } else if (r.phase === 'reward') {
      const best = [...r.rewards.cards].sort((a, b) => value(b) - value(a))[0];
      E.takeReward(p, value(best) >= 8 ? best : null);
    } else if (r.phase === 'rest') E.rest(p, 'heal');
    else if (r.phase === 'event') {
      const preferred = { bard: 1, nail: r.relics.includes('sigil') ? 1 : 0, night: 1, forest: r.deck.some(c => CARDS[c.cardId].rarity === 'rare') ? 0 : 1, desert: 1, formula: 1, tea: 1, totem: 0, lantern: 1, witch: 0 }[r.event.id];
      const option = EVENT_EFFECTS[r.event.id][preferred];
      E.chooseEvent(p, option.hp && r.hp <= option.hp ? 1 : preferred);
    } else if (r.phase === 'duplicate') {
      E.selectDeckCard(p, [...r.deck].sort((a, b) => value(b.cardId) - value(a.cardId))[0].uid);
    } else if (r.phase === 'shop') {
      const card = r.shop.cards.map((c, i) => ({ ...c, i })).filter(c => !c.sold && r.gold >= c.price && value(c.id) >= 12).sort((a, b) => value(b.id) - value(a.id))[0];
      if (r.shop.relic === 'sigil' && !r.shop.relicSold && r.gold >= 140) E.shopAction(p, 'relic');
      else if (card) E.shopAction(p, 'card', card.i);
      else E.shopAction(p, 'leave');
    } else throw new Error(`Unhandled phase ${r.phase}`);
    validateProfile(p);
  }
  return { seed, developed, victory: !!r.summary?.victory, floor: r.floor + 1, nodes: r.nodesCleared, hp: r.hp, steps };
}
const count = Number(process.argv[2] || 5);
for (let i = 1; i <= count; i++) console.log(JSON.stringify(simulate(i * 8849, process.argv.includes('--developed'))));
