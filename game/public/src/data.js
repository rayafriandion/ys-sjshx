export const VERSION = 1;
export const ELEMENTS = {
  physical: { label: '物理', color: '#cfccb9' },
  anemo: { label: '风', color: '#82d6b4' },
  geo: { label: '岩', color: '#dab56b' },
  electro: { label: '雷', color: '#bda0ef' },
  dendro: { label: '草', color: '#a1c982' },
  hydro: { label: '水', color: '#7bbbe7' },
  pyro: { label: '火', color: '#ec9d7b' },
  cryo: { label: '冰', color: '#a3d8e2' },
  lunar: { label: '月', color: '#ddd3f3' }
};
const card = (id, element, cost, effects, rarity = 'common', extra = {}) => ({ id, element, cost, effects, rarity, ...extra });
export const CARDS = Object.fromEntries([
  card('strike', 'physical', 1, { damage: 6 }, 'basic'),
  card('guard', 'physical', 1, { shield: 6 }, 'basic'),
  card('focus', 'physical', 0, { draw: 2, energy: 1 }, 'rare', { exhaust: true }),
  card('anemo_slash', 'anemo', 1, { damage: 7 }, 'basic', { onSwirlDraw: 1 }),
  card('geo_wall', 'geo', 1, { damage: 5, shield: 5 }, 'basic'),
  card('pyro_spark', 'pyro', 1, { damage: 7 }, 'basic'),
  card('hydro_edge', 'hydro', 1, { damage: 5, heal: 2 }, 'basic'),
  card('electro_edge', 'electro', 1, { damage: 6, draw: 1 }, 'basic'),
  card('cryo_edge', 'cryo', 1, { damage: 6, shield: 2 }, 'basic'),
  card('dendro_edge', 'dendro', 1, { damage: 6 }, 'basic'),
  card('anemo_gale', 'anemo', 1, { damage: 6 }, 'common', { aoe: true }),
  card('anemo_step', 'anemo', 0, { shield: 4, draw: 1 }),
  card('anemo_burst', 'anemo', 2, { damage: 12, draw: 2 }, 'rare', { aoe: true, exhaust: true }),
  card('geo_star', 'geo', 2, { damage: 14, shield: 9 }),
  card('geo_keep', 'geo', 1, { shield: 12 }, 'rare', { retain: true }),
  card('geo_burst', 'geo', 2, { damage: 18, shield: 15 }, 'rare', { aoe: true, exhaust: true }),
  card('electro_chain', 'electro', 1, { damage: 8, energy: 1 }, 'rare', { exhaust: true }),
  card('electro_storm', 'electro', 2, { damage: 11 }, 'common', { aoe: true }),
  card('electro_burst', 'electro', 2, { damage: 24 }, 'rare', { exhaust: true }),
  card('dendro_seed', 'dendro', 1, { damage: 4, cores: 1 }, 'common', { aoe: true }),
  card('dendro_grow', 'dendro', 1, { heal: 7, shield: 5 }),
  card('dendro_burst', 'dendro', 2, { damage: 12, cores: 3 }, 'rare', { aoe: true, exhaust: true }),
  card('hydro_mend', 'hydro', 1, { damage: 3, heal: 9 }, 'rare'),
  card('hydro_tide', 'hydro', 2, { damage: 12, draw: 1 }, 'common', { aoe: true, arkhe: true }),
  card('hydro_burst', 'hydro', 2, { damage: 15, heal: 14 }, 'rare', { aoe: true, exhaust: true, arkhe: true }),
  card('pyro_flare', 'pyro', 2, { damage: 17 }, 'rare', { returnOnAmplify: true }),
  card('pyro_dance', 'pyro', 1, { damage: 4 }, 'common', { hits: 3 }),
  card('pyro_burst', 'pyro', 2, { damage: 26 }, 'rare', { aoe: true, exhaust: true }),
  card('cryo_mirror', 'cryo', 1, { damage: 7, shield: 7 }),
  card('cryo_snow', 'cryo', 2, { damage: 13 }, 'common', { aoe: true }),
  card('cryo_burst', 'cryo', 2, { damage: 22 }, 'rare', { aoe: true, exhaust: true }),
  card('lunar_cleanse', 'lunar', 1, { cleanse: 1, heal: 8 }, 'rare', { exhaust: true }),
  card('lunar_blade', 'lunar', 0, { damage: 12 }, 'rare', { exhaust: true }),
  card('resonance', 'physical', 2, { resonance: 2 }, 'legendary', { exhaust: true }),
  card('terminal', 'physical', 0, { trueDamage: 20 }, 'rare', { exhaust: true, transient: true }),
  card('redtide', 'physical', 0, { trueDamage: 60, interrupt: 1 }, 'legendary', { exhaust: true, transient: true }),
  card('fragment', 'physical', 1, { purge: 1 }, 'curse', { exhaust: true, transient: true, endDamage: 15 }),
  card('wither', 'physical', 1, { purge: 1 }, 'curse', { exhaust: true, onDrawDamage: 3 })
].map(c => [c.id, c]));

export const CHAPTERS = [
  { id: 'mondstadt', region: '蒙德', element: 'anemo', archon: 'venti', hp: 120, mechanic: '每 2 回合获得 20 护盾；扩散或击破护盾使其瘫痪。' },
  { id: 'liyue', region: '璃月', element: 'geo', archon: 'zhongli', hp: 180, mechanic: '攻击施加断流；再次命中伤害翻倍。结晶清除断流。' },
  { id: 'inazuma', region: '稻妻', element: 'electro', archon: 'raiden', hp: 240, mechanic: '前 2 回合封印高费牌；第 4 回合造成 45 伤害，3 次反应可抵挡。' },
  { id: 'sumeru', region: '须弥', element: 'dendro', archon: 'nahida', hp: 300, mechanic: '生成元素浮游炮；触发反应会生成 0 费、20 真实伤害的临时牌。' },
  { id: 'fontaine', region: '枫丹', element: 'hydro', archon: 'furina', hp: 380, mechanic: '黑洞每回合吸取 1 能量；荒芒牌可击碎黑洞并使其眩晕。' },
  { id: 'natlan', region: '纳塔', element: 'pyro', archon: 'mavuika', hp: 450, mechanic: '30 层护甲降低伤害；每次元素命中削减 1 层。' },
  { id: 'nodkrai', region: '挪德卡莱', element: 'lunar', archon: 'columbina', hp: 520, mechanic: '月相每回合轮换；蚀月生成的碎片需要 1 能量净化，否则回合末失去 15 生命。' },
  { id: 'snezhnaya', region: '至冬', element: 'cryo', archon: 'tsaritsa', hp: 666, mechanic: '攻击叠加生命契约；契约达到最大生命的 50% 后下次行动斩杀。治疗优先清除契约。' }
];
export const ARCHONS = {
  venti: { element: 'anemo', cd: 3, passive: '每回合首张风牌费用 −1，扩散伤害 +3。', active: '抽 2 张牌；接下来 2 张牌效果结算两次。' },
  zhongli: { element: 'geo', cd: 4, passive: '每回合护盾保留 50%。', active: '15 群体岩伤、15 护盾；所有敌人暂停行动 1 次。' },
  raiden: { element: 'electro', cd: 3, passive: '每触发 3 次元素反应，恢复 1 能量。', active: '本回合攻击附雷；激化目标伤害翻倍。' },
  nahida: { element: 'dendro', cd: 3, passive: '反应伤害的 50% 传导至其他敌人。', active: '检视牌库顶 5 张，选择 2 张加入手牌，本回合费用为 0。' },
  furina: { element: 'hydro', cd: 3, passive: '生命变化时伤害 +2%，至多 30 层。', active: '消耗当前生命 15%；接下来 3 回合末造成 12 水伤。' },
  mavuika: { element: 'pyro', cd: 4, passive: '每回合第 4 张牌追加 10 火伤。', active: '2 回合内可免死 1 次并回复 30% 生命；本回合火伤翻倍。' },
  columbina: { element: 'lunar', cd: 3, passive: '反应额外伤害 +40%，反应无视护盾。', active: '清除全部负面状态与生命契约，生成 3 张 0 费月元素攻击牌。' },
  tsaritsa: { element: 'cryo', cd: 4, passive: '对冻结目标的伤害倍率为 2.5。', active: '所有敌人附冰；获得 20 护盾。' }
};
export const RELICS = {
  compass: { element: 'anemo', effect: '每场战斗首回合多抽 1 张。' },
  feather: { element: 'anemo', effect: '扩散额外伤害 +3。' },
  leaf: { element: 'anemo', effect: '风元素伤害 +2；与另一风遗物共鸣时扩散使目标易伤。' },
  amber: { element: 'geo', effect: '每回合开始获得 3 护盾。' },
  crown: { element: 'geo', effect: '护盾获取量 +2。' },
  goblet: { element: 'hydro', effect: '治疗效果 +3。' },
  pearl: { element: 'hydro', effect: '战斗结束恢复 5 生命。' },
  ember: { element: 'pyro', effect: '火元素伤害 +2。' },
  witch: { element: 'pyro', effect: '与另一火遗物共鸣时，蒸发与融化倍率 +0.35。' },
  sigil: { element: 'electro', effect: '能量上限 +1。' },
  hourglass: { element: 'electro', effect: '与另一雷遗物共鸣且能量上限 ≥4 时，每回合额外抽 1 张。' },
  seed: { element: 'dendro', effect: '每回合开始获得 5 护盾。' },
  flower: { element: 'dendro', effect: '最大生命 +15，获得时回复 15 生命。' },
  prism: { element: 'cryo', effect: '每场战斗首回合额外获得 1 能量。' },
  eye: { element: 'lunar', effect: '第八章首领最大生命削减 15%。' },
  sword: { element: 'hydro', effect: '反应额外伤害 +50%；战斗开始失去 10% 当前生命。' }
};
export const TALENTS = {
  vitality: { max: 5, base: 25, label: '根系稳固', effect: '初始最大生命 +10 / 级', element: 'dendro' },
  energy: { max: 1, base: 120, label: '降临者权能', effect: '每回合能量上限 +1', element: 'electro' },
  reroll: { max: 3, base: 40, label: '虚空检索', effect: '每次战后奖励重掷 +1 / 级', element: 'anemo' },
  blessing: { max: 1, base: 80, label: '古神遗泽', effect: '开局可携带一位已解锁助战', element: 'geo' }
};
export const NODE_TYPES = {
  battle: { label: '征讨领域', icon: 'swords', tag: 'COMBAT', detail: '战斗胜利后获得摩拉，并从 3 张卡牌中选择 1 张。' },
  elite: { label: '祝圣秘境', icon: 'flame', tag: 'ELITE', detail: '挑战强化敌人，必定获得一件圣遗物。' },
  event: { label: '世界树奇遇', icon: 'sparkles', tag: 'ENCOUNTER', detail: '在不同收益与代价之间作出选择。' },
  shop: { label: '行旅商会', icon: 'shop', tag: 'MERCHANT', detail: '使用摩拉购买卡牌、圣遗物，或移除卡组中的卡牌。' },
  rest: { label: '七天神像', icon: 'camp', tag: 'REST', detail: '恢复 30% 最大生命，或升级一张卡牌。' },
  boss: { label: '魔神决战', icon: 'crown', tag: 'BOSS', detail: '击败本章首领，获得元素爆发牌并解锁助战。' }
};
export const REACTIONS = [
  ['pyro', 'hydro', '蒸发', '本次伤害 ×1.75'],
  ['pyro', 'cryo', '融化', '伤害 ×1.75，穿透 50% 护盾'],
  ['pyro', 'electro', '超载', '+8 真实伤害，打断蓄力'],
  ['hydro', 'electro', '感电', '全体敌人受到 5 伤害，抽 1 张'],
  ['hydro', 'cryo', '冻结', '跳过下次攻击；首领改为易伤 25%'],
  ['dendro', 'hydro', '绽放', '生成 1 草原核，上限 3'],
  ['dendro', 'electro', '激化', '2 回合内草 / 雷伤害 +5'],
  ['aura', 'anemo', '扩散', '向其他敌人传播附着，追加 4 伤害'],
  ['aura', 'geo', '结晶', '获得 6 护盾，保留附着']
];
export const EVENT_IDS = ['bard', 'nail', 'night', 'forest', 'desert', 'formula', 'tea', 'totem', 'lantern', 'witch'];
export const EVENT_EFFECTS = {
  bard: [{ label: '消耗 50 摩拉 · 随机升级 2 张牌', cost: 50, effect: 'upgrade' }, { label: '转化 1 张基础牌为稀有风牌', effect: 'transform' }],
  nail: [{ label: '失去 15 生命 · 获得能量圣遗物', hp: 15, effect: 'sigil' }, { label: '获得 120 摩拉 · 移除 1 张基础牌', effect: 'remove' }],
  night: [{ label: '本章敌人伤害 +25% · 摩拉奖励翻倍', effect: 'night' }, { label: '恢复 25 生命 · 获得随机圣遗物', effect: 'day' }],
  forest: [{ label: '移除 1 张稀有牌 · 最大生命 +20 · 每回合 5 护盾', effect: 'forest' }, { label: '生命回满 · 获得 1 张诅咒', effect: 'curse' }],
  desert: [{ label: '挑战精英 · 额外获得 150 摩拉与 1 件圣遗物', effect: 'elite' }, { label: '继续前进', effect: 'leave' }],
  formula: [{ label: '最大生命 −25% · 反应额外伤害 +50%', effect: 'sword' }, { label: '获得 100 摩拉 · 移除所有诅咒', effect: 'purify' }],
  tea: [{ label: '50% 获得 200 摩拉，50% 失去 20% 当前生命', effect: 'gamble' }, { label: '选择并复制 1 张卡牌', effect: 'duplicate' }],
  totem: [{ label: '获得本局 1 次复活机会，恢复 50% 最大生命', effect: 'revive' }, { label: '获得 60 摩拉', effect: 'mora' }],
  lantern: [{ label: '挑战精英 · 获得削弱最终首领的圣遗物', effect: 'eye' }, { label: '恢复 30% 最大生命', effect: 'heal' }],
  witch: [{ label: '获得 1 件未持有的圣遗物', effect: 'relic' }, { label: '下场战斗初始能量 +2，重置全部助战冷却', effect: 'future' }]
};
export const STARTER = ['strike', 'strike', 'guard', 'guard', 'guard', 'anemo_slash', 'geo_wall', 'pyro_spark', 'hydro_edge', 'electro_edge', 'cryo_edge', 'dendro_edge'];
export const BURSTS = ['anemo_burst', 'geo_burst', 'electro_burst', 'dendro_burst', 'hydro_burst', 'pyro_burst', 'lunar_cleanse', 'cryo_burst'];
export const rarityLabel = { basic: '基础', common: '普通', rare: '稀有', legendary: '传说', curse: '诅咒' };
export function cardStats(c) {
  const d = CARDS[c.cardId ?? c.id];
  const out = { ...d.effects };
  if (c.upgraded) for (const k of ['damage', 'shield', 'heal', 'trueDamage']) if (out[k]) out[k] += k === 'trueDamage' ? 8 : 3;
  return out;
}
export function mechanicalName(cardId) {
  const c = CARDS[cardId];
  return `${ELEMENTS[c.element].label} · ${c.effects.damage || c.effects.trueDamage ? '攻击' : c.effects.shield ? '防御' : c.effects.heal ? '恢复' : c.rarity === 'curse' ? '净化' : '策略'} ${Object.keys(CARDS).filter(id => CARDS[id].element === c.element).indexOf(cardId) + 1}`;
}
