import { CARDS, CHAPTERS, ARCHONS, RELICS, TALENTS, ELEMENTS, NODE_TYPES, REACTIONS, EVENT_EFFECTS, rarityLabel, mechanicalName, cardStats } from './data.js';
import * as E from './engine.js';
import { PREFIX, loadSlot, saveSlot, slotSummary, parseSave, serializeSave, validateProfile, encodeSaveText, decodeSaveText, TEXT_TAG, SAVE_LIMIT } from './storage.js';
import * as FX from './fx.js';
import { targetKind, resolveTarget, cycleTarget } from './targeting.js';

let copy = {};
try { const response = await fetch('./content/zh-CN.json'); if (response.ok) copy = await response.json(); } catch { /* Mechanical labels remain playable offline. */ }
let slot = 1, profile, saveError = '', conflict = false, unsaved = false;
try { slot = Number(localStorage.getItem(PREFIX + 'active')) || 1; if (![1, 2, 3].includes(slot)) slot = 1; const result = loadSlot(slot); profile = result.profile; if (result.recovered) saveError = '已从上一份有效备份恢复存档。'; }
catch (error) { profile = E.newProfile(); saveError = error.message; if (error.message.includes('损坏')) conflict = true; }
const preview = E.newProfile(); E.startRun(preview, { seed: 884920 });
const ui = { view: 'route', modal: null, selectedNode: null, selectedCard: null, target: null, filter: 'all', collection: 'cards', importData: null, importFrom: '', importError: '', importText: '', exportText: '', toastTimer: null, log: false, viewKey: '', lastBattleKey: null, lastHandIds: new Set(), reenterUid: null };
const app = document.querySelector('#app'), modalRoot = document.querySelector('#modal-root');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cn = id => copy.cards?.[id]?.name || mechanicalName(id);
const an = id => copy.archons?.[id]?.name || `${ELEMENTS[ARCHONS[id].element].label}元素助战`;
const rn = id => copy.relics?.[id]?.name || `圣遗物 ${String(Object.keys(RELICS).indexOf(id) + 1).padStart(2, '0')}`;
const title = () => copy.game?.title || '世界树回响';
const liveRun = () => profile.run && profile.run.phase !== 'finished';
const rview = () => profile.run || preview.run;
const chapterText = r => copy.chapters?.[CHAPTERS[r.floor].id] || {};
const glyph = element => `<span class="element-glyph" style="--element:${ELEMENTS[element].color}"><svg class="element-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="./assets/elements.svg#${element}"></use></svg></span>`;
const button = (action, label, cls = '', attrs = '') => `<button type="button" class="button ${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const smallLabel = (top, bottom) => `<span class="stat-text"><small>${top}</small><strong>${bottom}</strong></span>`;
const paths = {
  route: '<path d="M4 18c0-7 16-5 16-12M4 6h.01M20 18h.01"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="6" r="2"/><circle cx="4" cy="5" r="2"/><circle cx="20" cy="19" r="2"/>',
  cards: '<rect x="6" y="3" width="14" height="18" rx="2"/><path d="M4 6H2v13a2 2 0 0 0 2 2m8-13 3 4-3 4-3-4Z"/>',
  leaf: '<path d="M20 3C7 3 2 8 5 15s15 4 15-12ZM4 21 16 8m-7 7-1-5m5 2h5"/>',
  star: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/><path d="M12 7v10M7 12h10"/>',
  swords: '<path d="m4 3 13 13m-2-1 3-3m-5 6 3-3 5 5-2 2-5-5M20 3 7 16m2-1-3-3m5 6-3-3-5 5 2 2 5-5"/>',
  flame: '<path d="M12 2c0 7-7 6-7 13a7 7 0 0 0 14 0c0-4-3-6-3-6 0 4-3 4-3 4 1-5-1-11-1-11Z"/><path d="M12 15c-6 7 6 7 0 0Z"/>',
  sparkles: '<path d="m13 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3ZM4 2v5M1.5 4.5h5M3 18v4M1 20h4"/>',
  shop: '<path d="m3 8 2-5h14l2 5v3a3 3 0 0 1-5 2 3 3 0 0 1-4 0 3 3 0 0 1-4 0 3 3 0 0 1-5-2ZM5 14v7h14v-7M9 21v-6h6v6M3 8h18"/>',
  camp: '<path d="M12 2 3 15h18ZM8 10l-5 5M12 6v5M7 21l10-4m-10 0 10 4M12 15v3"/>',
  crown: '<path d="m3 6 4 4 5-7 5 7 4-4-3 13H6ZM7 22h10M8 14h8"/>',
  heart: '<path d="M20 5a5 5 0 0 0-8 2 5 5 0 0 0-8-2c-6 6 8 16 8 16S26 11 20 5Z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="m12 6 4 6-4 6-4-6Z"/>',
  shield: '<path d="m12 2 8 4v6c0 6-8 10-8 10S4 18 4 12V6ZM8 12l3 3 5-6"/>',
  archive: '<path d="M4 8h16v13H4ZM3 3h18v5H3ZM9 12h6"/>',
  settings: '<path d="M10 2h4l.7 2.4 2 .8 2.2-1.2 2.8 2.8-1.2 2.2.8 2L23 12v2l-2.4.7-.8 2 1.2 2.2-2.8 2.8-2.2-1.2-2 .8L14 23h-4l-.7-2.4-2-.8-2.2 1.2-2.8-2.8 1.2-2.2-.8-2L1 14v-2l2.4-.7.8-2L3 7.1l2.8-2.8L8 5.5l2-.8Z"/><circle cx="12" cy="12.5" r="3.2"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9ZM17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  book: '<path d="M12 5v16M2 3c5-1 7 0 10 2 3-2 5-3 10-2v16c-5-1-7 0-10 2-3-2-5-3-10-2Z"/>',
  refresh: '<path d="M20 8a8 8 0 1 0 0 8M20 2v6h-6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 4h.01"/>',
  bolt: '<path d="m14 2-9 12h7l-2 8 9-12h-7Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>'
};
// ---- 文字大小（只影响字号，不影响布局）----
// settings.textScale：0（或缺失）表示自适应，按窗口宽度计算；否则为 90–140 的手动百分比。
// 界面尺寸仍是固定 px，只有 font-size / font 简写接入 --text-scale，因此放字不会改变盒子大小。
const SCALE_MIN = 90, SCALE_MAX = 130, SCALE_STEP = 5;
let textScale = 1;
function adaptiveTextScale() {
  const w = window.innerWidth || 1440;
  if (w <= 620) return 1;                                  // 手机端已按 390px 排版，保持 100%
  const t = Math.min(1, Math.max(0, (w - 1080) / 840));    // 1080 → 0，1920 → 1
  return Math.round((1.12 + 0.08 * t) * 100) / 100;        // 112% ~ 120%
}
const clampScale = value => Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round(value / SCALE_STEP) * SCALE_STEP));
const scaleSetting = () => Number(profile?.settings?.textScale) || 0;
const currentScale = () => { const manual = scaleSetting(); return manual ? manual / 100 : adaptiveTextScale(); };
const scalePercent = () => Math.round(currentScale() * 100);
function applyScale() {
  textScale = currentScale();
  document.documentElement.style.setProperty('--text-scale', String(textScale));
  // 超过 120% 时卡面放不下风味引文，交给 CSS 隐藏，避免文字被卡片边缘裁断。
  document.documentElement.dataset.textScale = textScale > 1.2 ? 'lg' : 'md';
  return textScale;
}
function icon(name, size = 20) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.star}</svg>`; }
function art(element, variant = 0) {
  const motifs = {
    physical: '<path d="m49 14-7 59 7 9 7-9-7-59Zm-15 54h30M43 88h12M49 82v11"/>',
    anemo: '<path d="M49 77C7 67 13 39 38 42c-12 8-6 21 11 23 17-2 23-15 11-23 25-3 31 25-11 35ZM49 62C20 48 35 27 49 17c14 10 29 31 0 45ZM27 83l22 11 22-11"/>',
    geo: '<path d="m49 15 24 32-24 39-24-39Zm0 16L36 49l13 22 13-22ZM26 65l-7 13 30 25 30-25-7-13"/>',
    electro: '<path d="m57 12-35 47h26l-7 35 36-49H51ZM26 25l-8 13m55 40 8-13M30 94l6-9"/>',
    dendro: '<path d="M49 88V52m0 20C18 71 17 49 20 35c21 0 33 17 29 37Zm0-12c29-1 30-24 28-38-23 1-31 18-28 38ZM21 91c13-5 43-5 56 0M49 40c-20-13-13-27 0-34 13 7 20 21 0 34Z"/>',
    hydro: '<path d="M49 13C43 29 22 48 22 65a27 27 0 0 0 54 0c0-17-21-36-27-52ZM37 53c-10 13-5 23 5 27m-23 17c20-7 40-7 60 0"/>',
    pyro: '<path d="M49 94C11 90 22 53 35 42c-1 18 9 17 10 10C60 31 49 13 49 13c28 11 14 37 26 43 7-9 5-17 5-17 15 35-6 53-31 55Zm0-8c-19-9-5-24 4-33-1 20 13 20-4 33Z"/>',
    cryo: '<path d="M49 12v82M14 32l70 41M14 73l70-41M38 20l11 10 11-10M38 86l11-10 11 10M17 45l14-3-2-15m40 59-2-15 14-3M17 60l14 3-2 15m40-59-2 15 14 3"/>',
    lunar: '<path d="M61 16C9 21 13 83 60 88 31 71 29 39 61 16ZM70 41l3 10 10 3-10 3-3 10-3-10-10-3 10-3Z"/>'
  };
  return `<svg class="card-art" viewBox="0 0 100 112" fill="none" stroke="currentColor" stroke-width="1.1"><circle cx="49" cy="55" r="43" opacity=".2"/><circle cx="49" cy="55" r="37" opacity=".12"/><path d="M49 1 95 55 49 110 3 55Z" opacity=".18"/>${motifs[element]}<circle cx="${15 + variant % 3 * 9}" cy="19" r="1.4" fill="currentColor" stroke="none"/><circle cx="87" cy="92" r="1" fill="currentColor" stroke="none"/></svg>`;
}
function effectsText(c) {
  const s = cardStats(c), d = CARDS[c.cardId ?? c.id], parts = [];
  if (s.damage) parts.push(`${d.aoe ? '全体' : ''}${s.damage}${d.hits ? `×${d.hits}` : ''} ${ELEMENTS[d.element].label}伤`);
  if (s.trueDamage) parts.push(`${s.trueDamage} 真实伤害`);
  if (s.shield) parts.push(`护盾 +${s.shield}`);
  if (s.heal) parts.push(`治疗 ${s.heal}`);
  if (s.draw) parts.push(`抽 ${s.draw} 张`);
  if (s.energy) parts.push(`能量 +${s.energy}`);
  if (s.cores) parts.push(`草原核 +${s.cores}`);
  if (s.resonance) parts.push(`每次反应后伤害 +${s.resonance + (c.upgraded ? 1 : 0)}`);
  if (s.cleanse) parts.push('清除全部负面状态');
  if (s.purge) parts.push('净化此牌');
  return parts.join(' / ');
}
function cardHTML(c, { action = '', disabled = false, compact = false, selected = false, attrs = '' } = {}) {
  if (typeof c === 'string') c = { cardId: c, upgraded: false };
  const d = CARDS[c.cardId], color = ELEMENTS[d.element].color;
  const cost = profile.run?.battle && profile.run.phase === 'combat' ? E.cardCost(profile, c) : Math.max(0, d.cost - (c.upgraded && ['resonance', 'focus'].includes(d.id) ? 1 : 0));
  return `<${action ? 'button type="button"' : 'article'} class="game-card ${compact ? 'compact' : ''} ${selected ? 'selected' : ''} rarity-${d.rarity}" style="--element:${color}" ${action ? `data-action="${action}" data-uid="${esc(c.uid || '')}" data-card="${d.id}" ${disabled ? 'disabled' : ''}` : ''} ${attrs}>
    <div class="card-top"><span class="cost">${cost}</span><span>${ELEMENTS[d.element].label} ${glyph(d.element)}</span></div>
    <div class="card-illustration">${art(d.element, Object.keys(CARDS).indexOf(d.id))}<span class="art-orbit"></span></div>
    <div class="card-copy"><div class="card-rarity">${rarityLabel[d.rarity]}${d.exhaust ? ' · 消耗' : ''}${d.retain ? ' · 保留' : ''}${d.arkhe ? ' · 荒芒' : ''}</div><h3>${esc(cn(d.id))}${c.upgraded ? '<em>＋</em>' : ''}</h3><p>${esc(effectsText(c))}</p>${(c.upgraded ? copy.cards?.[d.id]?.upgradedFlavor : copy.cards?.[d.id]?.flavor) ? `<q>${esc(c.upgraded ? copy.cards[d.id].upgradedFlavor : copy.cards[d.id].flavor)}</q>` : ''}</div>
    <span class="card-corner"></span>
  </${action ? 'button' : 'article'}>`;
}
function navItem(view, name, ico, extra = '') {
  return `<button type="button" class="nav-item ${ui.view === view ? 'active' : ''}" data-action="view" data-view="${view}" aria-label="${name}" title="${name}">${icon(ico)}<span>${name}</span>${extra}</button>`;
}
function sidebar() {
  return `<aside class="sidebar">
    <button class="brand" type="button" data-action="view" data-view="route"><img src="./assets/mark.svg" alt=""><span><b>${esc(title())}</b><small>${esc(copy.game?.subtitle || 'ECHOES OF IRMINSUL')}</small></span></button>
    <div class="sidebar-rule"><span>轮回终端</span><i>01</i></div>
    <nav aria-label="游戏导航">
      ${navItem('route', '轮回路线', 'route', '<i class="nav-dot"></i>')}
      ${navItem('codex', '卡牌图鉴', 'cards', `<small>${profile.meta.unlockedCards.length}</small>`)}
      ${navItem('archons', '魔神助战', 'star')}
      ${navItem('talents', '世界树枝干', 'leaf')}
    </nav>
    <div class="sidebar-subtitle">当前轮回</div>
    <div class="traveler-mini"><div class="mini-avatar">✧</div><span><b>旅行者</b><small>第四降临者</small></span><span class="online-dot"></span></div>
    <div class="sidebar-run"><span>探索进度</span><b>${liveRun() ? String(profile.run.floor + 1).padStart(2, '0') : '00'}<i> / 08</i></b><div class="thin-progress"><span style="width:${liveRun() ? (profile.run.floor * 8 + profile.run.row + 1) / 64 * 100 : 0}%"></span></div></div>
    <div class="sidebar-bottom">
      <div class="local-note">${icon('shield', 15)}<span>仅本地存档</span><i></i></div>
      <button class="nav-item" data-action="saves" aria-label="存档管理" title="存档管理">${icon('archive')}<span>存档管理</span><kbd>${slot.toString().padStart(2, '0')}</kbd></button>
      <button class="nav-item" data-action="settings" aria-label="游戏设置" title="游戏设置">${icon('settings')}<span>游戏设置</span></button>
      <div class="build-label">PROJECT IRMINSUL <span>v0.1</span></div>
    </div>
  </aside>`;
}
function header() {
  const r = rview(), active = !!profile.run;
  return `<header class="topbar">
    <div class="breadcrumb">${icon('globe', 16)}<span>世界树终端</span><span class="slash">/</span><strong>${({ route: '轮回路线', codex: '卡牌图鉴', archons: '魔神助战', talents: '世界树枝干' })[ui.view]}</strong></div>
    <div class="resource-bar"><div class="resource hp">${icon('heart', 18)}${smallLabel('生命', active ? `${r.hp}<i> / ${r.maxHp}</i>` : '80<i> / 80</i>')}</div><div class="resource gold">${icon('coin', 18)}${smallLabel('摩拉', active ? r.gold : '100')}</div><button class="resource" data-action="deck">${icon('cards', 18)}${smallLabel('卡组', `${r.deck.length}<i> 张</i>`)}</button><div class="resource echoes">${icon('sparkles', 18)}${smallLabel('记忆残响', profile.meta.echoes)}</div></div>
    <button class="icon-button help-trigger" data-action="help" aria-label="玩法帮助" title="玩法帮助">${icon('help', 20)}</button>
  </header>`;
}
function saveIndicator() {
  return `<span class="save-indicator ${unsaved || conflict ? 'warning' : ''}">${icon(unsaved || conflict ? 'help' : 'check', 13)}${conflict ? '存档已锁定' : unsaved ? '尚未保存 · 请导出' : '本地自动存档'}</span>`;
}
function routeView() {
  if (profile.run?.phase === 'finished') return summaryView();
  const r = rview();
  if (profile.run && r.phase !== 'map') {
    if (r.phase === 'combat') return combatView();
    if (r.phase === 'reward') return rewardView();
    if (['rest', 'event', 'shop', 'upgrade', 'duplicate', 'remove'].includes(r.phase)) return encounterView();
  }
  const ch = CHAPTERS[r.floor], ct = chapterText(r), available = E.availableNodes(r);
  const selected = available.find(n => n.id === ui.selectedNode) || available[0];
  const nt = NODE_TYPES[selected?.type || 'battle'];
  return `<section class="page-heading"><div><p class="eyebrow">THE JOURNEY WITHIN</p><h1>轮回路线 <span>Journey</span></h1></div><div class="heading-side">${saveIndicator()}<button class="text-button" data-action="help">玩法指南 ${icon('arrow', 15)}</button></div></section>
    ${saveError ? `<div class="notice">${icon('help', 16)}<span>${esc(saveError)}</span><button data-action="saves">查看存档</button></div>` : ''}
    <section class="journey-panel">
      <div class="scene-image"></div><div class="scene-shade"></div><div class="scene-grain"></div>
      <div class="chapter-intro">
        <div class="chapter-eyebrow"><span class="tiny-diamond"></span> CHAPTER ${String(r.floor + 1).padStart(2, '0')} <span> / 08</span></div>
        <div class="region-seal">${art(ch.element)}</div>
        <h2>${esc(ch.region)}</h2><div class="chapter-english">${ch.id.toUpperCase()}</div>
        ${ct.title ? `<h3 class="story-title">${esc(ct.title)}</h3>` : ''}
        ${ct.introduction ? `<p class="story-body">${esc(ct.introduction)}</p>` : `<div class="chapter-mechanics">${glyph(ch.element)}<span>${ELEMENTS[ch.element].label}元素共鸣<span class="separator">·</span>8 个探索节点</span></div>`}
        <div class="chapter-progress"><span>本章探索</span><b>${Math.max(0, r.row + 1)} <small>/ 8</small></b><div class="chapter-steps">${Array.from({ length: 8 }, (_, i) => `<i class="${i <= r.row ? 'done' : ''}"></i>`).join('')}</div></div>
        <div class="next-node"><div class="next-node-label"><span>${profile.run ? '下一处目的地' : '你的第一场探索'}</span><i>${nt.tag}</i></div><div class="next-node-title"><span class="node-icon">${icon(nt.icon, 23)}</span><h3>${nt.label}</h3><span class="node-tier">${String(r.row + 2).padStart(2, '0')}</span></div><p>${nt.detail}</p>${button(profile.run ? 'enter-node' : 'start-direct', `${profile.run ? '前往节点' : '开启轮回'} ${icon('arrow', 17)}`, 'primary wide', `data-node="${selected?.id || ''}"`)}</div>
        <div class="chapter-footnote">${icon('leaf', 15)}<span>${r.spiral ? `渊月难度 ${r.spiral} · 敌人强度 +${r.spiral * 6}%` : '标准难度'}<i> · </i>种子 ${r.seed}</span><button class="text-button" data-action="new-run" aria-label="配置新轮回" title="配置新轮回">${icon('settings', 14)}</button></div>
      </div>
      <div class="route-area"><div class="map-title"><span>记忆航路</span><small>选择相连的节点向上探索</small></div>${mapHTML(r, selected)}<div class="map-bottom"><span class="compass-mark">N <i>✧</i></span><span>${icon('route', 14)} 路线选择后，本章内无法回退</span></div></div>
      <div class="scene-caption"><span class="caption-line"></span> IRMINSUL / MEMORY STREAM <span class="scene-coordinates">08° 17′ N</span></div>
    </section>
    <div class="map-legend">${Object.entries(NODE_TYPES).map(([key, n]) => `<span class="legend-${key}">${icon(n.icon, 16)} ${n.label}</span>`).join('')}<span class="legend-note">✧ 随机路线 · 每局不同</span></div>
    <section class="below-grid"><div class="panel current-deck"><div class="section-title"><h2>${icon('cards', 18)} 当前卡组 <span>${r.deck.length} 张</span></h2><button class="text-button" data-action="deck">查看全部 ${icon('chevron', 14)}</button></div><div class="deck-strip">${r.deck.slice(0, 5).map(c => `<button class="deck-chip" data-action="card-detail" data-card="${c.cardId}">${glyph(CARDS[c.cardId].element)}<span>${esc(cn(c.cardId))}${c.upgraded ? '＋' : ''}</span><small>${CARDS[c.cardId].cost}</small></button>`).join('')}</div></div>
    <div class="panel relic-panel"><div class="section-title"><h2>${icon('star', 18)} 圣遗物 <span>${r.relics.length} 件</span></h2><button class="text-button" data-action="relics">查看 ${icon('chevron', 14)}</button></div><div class="relic-strip">${r.relics.slice(0, 6).map(id => `<button class="relic-token" data-action="relic-detail" data-relic="${id}" style="--element:${ELEMENTS[RELICS[id].element].color}" title="${esc(rn(id))} · ${esc(RELICS[id].effect)}">${art(RELICS[id].element)}</button>`).join('')}<span class="relic-hint">被动效果<br>本局持续生效</span></div></div></section>
    ${chapterTrack(r)}`;
}
function point(n) { return { x: [98, 270, 442][n.lane] + (n.row > 0 && n.row < 6 ? (n.row % 2 ? 10 : -7) : 0), y: 492 - n.row * 61 }; }
function mapHTML(r, selected) {
  const available = E.availableNodes(r).map(n => n.id);
  let links = '';
  for (let row = 0; row < 7; row++) for (const n of r.map[row]) for (const next of r.map[row + 1]) {
    if (r.map[row].length !== 1 && r.map[row + 1].length !== 1 && Math.abs(n.lane - next.lane) > 1) continue;
    const a = point(n), b = point(next), done = n.done && next.done, active = n.done && available.includes(next.id);
    links += `<path d="M${a.x} ${a.y - 17} C${a.x} ${a.y - 38} ${b.x} ${b.y + 38} ${b.x} ${b.y + 17}" class="${done ? 'traveled' : active ? 'reachable' : ''}"/>`;
  }
  return `<div class="route-map"><svg class="map-lines" viewBox="0 0 540 550" preserveAspectRatio="none" aria-hidden="true">${links}<path d="M270 550v-40" class="reachable"/></svg>${r.map.flat().map(n => {
    const p = point(n), can = available.includes(n.id), nt = NODE_TYPES[n.type];
    return `<button type="button" class="map-node type-${n.type} ${n.done ? 'completed' : ''} ${can ? 'available' : ''} ${selected?.id === n.id ? 'chosen' : ''}" style="left:${p.x / 540 * 100}%;top:${p.y / 550 * 100}%" data-action="select-node" data-node="${n.id}" ${!can ? 'disabled' : ''} aria-label="第 ${n.row + 1} 步 ${nt.label}${n.done ? ' 已完成' : can ? ' 可前往' : ' 尚未到达'}" aria-pressed="${selected?.id === n.id}" title="${nt.label} · 第 ${n.row + 1} 步"><span class="node-shape">${n.done ? icon('check', 17) : icon(nt.icon, n.type === 'boss' ? 24 : 18)}</span><span class="node-label">${nt.label}</span>${selected?.id === n.id ? '<i class="selection-caret"></i>' : ''}</button>`;
  }).join('')}<div class="map-start">轮回起点 <span>◇</span></div><div class="boss-annotation"><span>CHAPTER BOSS</span><strong>${esc(chapterText(r).bossName || '本章守关首领')}</strong></div></div>`;
}
function chapterTrack(r) {
  return `<section class="chapter-track">${CHAPTERS.map((ch, i) => `<div class="${r.floor === i ? 'current' : r.floor > i ? 'past' : ''}"><span style="--element:${ELEMENTS[ch.element].color}">${r.floor > i ? icon('check', 14) : glyph(ch.element)}</span><p>${ch.region}</p><small>${String(i + 1).padStart(2, '0')}</small></div>`).join('')}</section>`;
}
function combatView() {
  const r = profile.run, b = r.battle, ch = CHAPTERS[r.floor];
  const selected = b.hand.find(c => c.uid === ui.selectedCard);
  const isSelf = selected && targetKind(selected) === 'player';
  if (selected) ui.target = resolveTarget(selected, b, ui.target);
  const target = !isSelf && (b.enemies.find(e => e.id === ui.target && e.hp > 0) || b.enemies.find(e => e.hp > 0));
  // Compare card instance IDs, not hand length or cloned battle objects. This also
  // catches draw-on-play, temporary cards and inspect choices without replaying old cards.
  const battleKey = `${r.id}:${r.floor}:${r.nodeId}`;
  const previous = ui.lastBattleKey === battleKey ? ui.lastHandIds : new Set();
  const newCards = new Set(b.hand.filter(c => !previous.has(c.uid) || c.uid === ui.reenterUid).map(c => c.uid));
  ui.lastBattleKey = battleKey; ui.lastHandIds = new Set(b.hand.map(c => c.uid)); ui.reenterUid = null;
  return `<section class="page-heading compact-heading"><div><p class="eyebrow">ELEMENTAL ENCOUNTER / ${NODE_TYPES[b.kind].tag}</p><h1>${NODE_TYPES[b.kind].label}<span>${ch.region} · 第 ${r.row + 2} 步</span></h1></div><div class="heading-side">${saveIndicator()}${button('reactions', `${icon('sparkles', 15)} 反应手册`, 'secondary small')}</div></section>
    <section class="battle-panel"><div class="battle-backdrop"></div>
      <div class="battle-top"><span class="turn-label">${icon('clock', 16)} 回合 <b>${String(b.turn).padStart(2, '0')}</b></span><div class="battle-effects">${b.cores ? `<span>${glyph('dendro')} 草原核 ×${b.cores}</span>` : ''}${b.doubleCards ? `<span>✧ 双重结算 ×${b.doubleCards}</span>` : ''}${b.fanfare ? `<span>${glyph('hydro')} 气氛 ${b.fanfare}</span>` : ''}${b.bond ? `<span class="danger">生命契约 ${b.bond} / ${Math.ceil(r.maxHp * .5)}</span>` : ''}${b.blackhole ? '<span>黑洞 · 能量 −1</span>' : ''}${b.kind === 'boss' && r.floor === 6 ? `<span>${glyph('lunar')} ${['新月', '满月', '蚀月'][b.moon]}</span>` : ''}</div><button class="text-button" data-action="toggle-log">战斗记录 ${icon('book', 15)}</button></div>
      <div class="combatants"><button type="button" class="player-unit ${isSelf ? 'targeted' : ''}" data-action="target" data-target="player" aria-label="选择己方目标：旅行者" aria-pressed="${!!isSelf}"><div class="player-status">${b.shield ? `<span>${icon('shield', 15)} ${b.shield}</span>` : ''}${b.undying ? `<span>${glyph('pyro')} 免死</span>` : ''}</div><img src="./assets/traveler.svg" alt="旅行者，披风剑士"><div class="unit-label"><strong>旅行者</strong><small>TRAVELER</small></div><div class="health-bar"><i style="width:${r.hp / r.maxHp * 100}%"></i>${b.bond ? `<em style="width:${Math.min(100, b.bond / r.maxHp * 100)}%"></em>` : ''}<span>${r.hp} / ${r.maxHp}</span></div><span class="player-target-indicator">${isSelf ? '◇ 己方目标' : ''}</span></button>
        <div class="battle-center-sigil"><span>${b.reactionBanner || '✧'}</span><small>${b.reactionBanner ? 'ELEMENTAL REACTION' : 'ELEMENTAL RESONANCE'}</small></div>
        <div class="enemy-group count-${b.enemies.filter(e => e.hp > 0).length}">${b.enemies.filter(e => e.hp > 0).map((e, i) => `<button type="button" class="enemy-unit ${target?.id === e.id ? 'targeted' : ''} ${e.boss ? 'boss' : ''}" data-action="target" data-target="${e.id}" aria-label="选择目标 ${i + 1}，生命 ${e.hp}，${intentText(e.intent)}" aria-pressed="${target?.id === e.id}" style="--element:${ELEMENTS[e.element].color}"><div class="enemy-intent intent-${e.intent.type}">${icon(e.intent.type === 'defend' ? 'shield' : 'swords', 16)}<b>${e.intent.type === 'execute' ? '斩杀' : e.intent.damage ?? e.intent.shield}</b><small>${e.stun ? '已打断' : e.frozen && !e.boss ? '冻结中' : e.intent.type === 'charge' ? '蓄力' : e.intent.type === 'defend' ? '防御' : '攻击'}</small></div><div class="enemy-status">${e.aura ? glyph(e.aura) : ''}${e.shield ? `<span>${icon('shield', 13)} ${e.shield}</span>` : ''}${e.armor ? `<span>护甲 ${e.armor}</span>` : ''}${e.quicken ? '<span>激化</span>' : ''}${e.vulnerable ? '<span>易伤</span>' : ''}${e.frozen ? '<span>冻结</span>' : ''}${e.flying ? '<span>升空</span>' : ''}</div><img src="./assets/enemy.svg" alt="${e.boss ? '首领' : e.cannon ? '浮游炮' : '元素守卫'}"><div class="unit-label"><strong>${esc(e.boss ? chapterText(r).bossName || `第 ${r.floor + 1} 章首领` : `${ELEMENTS[e.element].label} · ${e.cannon ? '浮游炮' : e.elite ? '精英守卫' : '记忆守卫'}`)}</strong><small>${e.boss ? 'CHAPTER BOSS' : 'MEMORY SENTINEL'}</small></div><div class="health-bar enemy-health"><i style="width:${e.hp / e.maxHp * 100}%"></i><span>${e.hp} / ${e.maxHp}</span></div><span class="target-indicator">${target?.id === e.id ? '◇ 当前目标' : '选择目标'}</span></button>`).join('')}</div>
      </div>
      ${b.kind === 'boss' && chapterText(r).bossDialogue ? `<blockquote class="boss-dialogue">${esc(chapterText(r).bossDialogue)}</blockquote>` : ''}
      ${b.kind === 'boss' ? `<div class="boss-mechanic">${icon('help', 14)} ${esc(ch.mechanic)}</div>` : ''}
      <div class="support-bar"><span class="support-label">${icon('star', 16)} 魔神助战</span>${r.archons.length ? r.archons.map(a => `<button class="support-button" data-action="archon" data-archon="${a.id}" ${a.cooldown || b.inspect ? 'disabled' : ''} title="${esc(an(a.id))}：${esc(ARCHONS[a.id].active)}">${glyph(ARCHONS[a.id].element)}<span>${esc(an(a.id))}</span><small>${a.cooldown ? `${a.cooldown} 回合` : '可发动'}</small></button>`).join('') : '<small class="muted">击败本章首领后解锁首位助战</small>'}</div>
      ${ui.log ? `<div class="combat-log"><div><b>战斗记录</b><button class="icon-button" data-action="toggle-log" aria-label="关闭战斗记录">${icon('close', 16)}</button></div>${b.log.slice(0, 12).map(t => `<p>${esc(t)}</p>`).join('')}</div>` : ''}
    </section>
    <section class="hand-panel"><div class="hand-header"><div class="energy-orb"><strong>${b.energy}</strong><span> / ${b.maxEnergy}</span>${icon('bolt', 15)}</div><div class="hand-instruction"><strong>${selected ? `已选择 ${esc(cn(selected.cardId))}` : '你的回合'}</strong><span>${selected ? '← → 选择目标 · Enter 确认 · 也可拖拽卡牌至目标' : '数字键选牌 · 点击或拖拽卡牌至目标'}</span></div><div class="pile-buttons"><button data-action="pile" data-pile="draw">${icon('cards', 18)}<span>抽牌堆 <b>${b.draw.length}</b></span></button><button data-action="pile" data-pile="discard">${icon('archive', 18)}<span>弃牌堆 <b>${b.discard.length}</b></span></button><button data-action="pile" data-pile="exhaust">${icon('flame', 18)}<span>消耗 <b>${b.exhaust.length}</b></span></button></div></div>
      <div class="hand-cards">${b.hand.map((c, i) => `<div class="hand-card-wrap${newCards.has(c.uid) ? ' fx-stagger' : ''}" style="--fx-i:${i}"><span class="card-key">${i < 9 ? i + 1 : i === 9 ? '0' : ''}</span>${cardHTML(c, { action: 'select-card', selected: ui.selectedCard === c.uid, disabled: !!E.cardProblem(profile, c), attrs: `title="${esc(E.cardProblem(profile, c) || effectsText(c))}"` })}</div>`).join('') || '<div class="empty-hand">手牌已用尽 · 结束回合以抽取新手牌</div>'}</div>
      <div class="hand-footer"><span>${selected ? `${esc(cn(selected.cardId))} → ${isSelf ? '旅行者' : esc(target?.boss ? chapterText(r).bossName || '首领' : '当前敌人')}` : '护盾于敌人行动后清空；未打出的牌进入弃牌堆。'}</span><div>${selected ? button('play-selected', `打出卡牌 <kbd>Enter</kbd>`, 'primary', b.inspect ? 'disabled' : '') : ''}${button('end-turn', `结束回合 <kbd>E</kbd>`, 'end-turn', b.inspect ? 'disabled' : '')}</div></div>
    </section>${b.inspect ? inspectOverlay(b) : ''}`;
}
function intentText(intent) { return intent.type === 'defend' ? `准备获得 ${intent.shield} 护盾` : intent.type === 'execute' ? '准备斩杀' : `准备造成 ${intent.damage} 伤害`; }
function inspectOverlay(b) {
  const s = b.inspect;
  return `<div class="inspect-overlay"><div class="inspect-panel"><p class="eyebrow">ARCHON ASSISTANCE</p><h2>检视牌库 · 选择 ${Math.min(2, s.cards.length)} 张</h2><p>已选择 ${s.selected.length} 张，选中的牌本回合费用为 0。</p><div class="card-grid">${s.cards.filter(c => !s.selected.includes(c.uid)).map(c => cardHTML(c, { action: 'inspect' })).join('')}</div></div></div>`;
}
function rewardView() {
  const r = profile.run, q = r.rewards;
  return `<section class="reward-screen"><div class="reward-aura"></div><p class="eyebrow">${q.boss ? 'CHAPTER COMPLETE' : 'ENCOUNTER COMPLETE'}</p><div class="victory-emblem">${icon('star', 42)}</div><h1>${q.boss ? '章节完成' : '战斗胜利'}</h1><p class="reward-subtitle">选择一张卡牌，完善你的构筑。</p><div class="reward-badges"><span>${icon('coin', 18)} 摩拉 +${q.gold}</span>${q.relic ? `<span>${icon('star', 18)} ${esc(rn(q.relic))} · 已获得</span>` : ''}${q.archon ? `<span>${glyph(ARCHONS[q.archon].element)} ${esc(an(q.archon))} · 已解锁</span>` : ''}</div>${q.boss ? `<p class="muted">已加入元素爆发牌 · 恢复 20% 生命</p>${chapterText(r).ending ? `<p class="chapter-ending">${esc(chapterText(r).ending)}</p>` : ''}` : ''}<div class="reward-cards">${q.cards.map(id => cardHTML(id, { action: 'take-reward' })).join('')}</div><div class="reward-actions">${button('reroll', `${icon('refresh', 16)} 重掷 <small>${q.rerolls}</small>`, 'secondary', q.rerolls ? '' : 'disabled')}${button('skip-reward', `跳过卡牌 ${icon('arrow', 16)}`, 'text-button')}</div>${saveIndicator()}</section>`;
}
function encounterView() {
  const r = profile.run;
  if (['upgrade', 'duplicate', 'remove'].includes(r.phase)) {
    return `<section class="collection-page"><p class="eyebrow">DECK MANAGEMENT</p><div class="page-heading"><h1>${({ upgrade: '选择升级卡牌', duplicate: '选择复制卡牌', remove: '选择移除卡牌' })[r.phase]}</h1>${button('cancel-selection', '返回', 'secondary')}</div><p class="muted">${r.phase === 'upgrade' ? '升级伤害、护盾或治疗数值；部分策略牌降低费用。' : r.phase === 'remove' ? '移除费用：75 摩拉。卡组至少保留 5 张牌。' : '复制将保留原牌的升级状态。'}</p><div class="card-grid">${r.deck.filter(c => r.phase !== 'upgrade' || !c.upgraded && CARDS[c.cardId].rarity !== 'curse').map(c => cardHTML(c, { action: 'select-deck' })).join('')}</div></section>`;
  }
  if (r.phase === 'shop') return shopView();
  const isRest = r.phase === 'rest', ev = isRest ? null : copy.events?.[r.event.id];
  return `<section class="encounter-screen"><div class="encounter-art"></div><div class="encounter-content"><p class="eyebrow">${isRest ? 'REST & RESTORE' : 'MEMORY ENCOUNTER'}</p><div class="encounter-symbol">${icon(isRest ? 'camp' : 'sparkles', 60)}</div><h1>${isRest ? '七天神像' : esc(ev?.title || `奇遇 ${String(Object.keys(EVENT_EFFECTS).indexOf(r.event.id) + 1).padStart(2, '0')}`)}</h1>${!isRest && ev?.body ? `<p class="event-body">${esc(ev.body)}</p>` : '<div class="narrative-space" aria-hidden="true"><i></i>◇<i></i></div>'}<div class="event-choices">${isRest ? `<button data-action="rest-heal">${icon('heart', 25)}<span><b>恢复生命</b><small>恢复 ${Math.ceil(r.maxHp * (r.spiral >= 6 ? .2 : .3))} 生命 · 当前 ${r.hp} / ${r.maxHp}</small></span>${icon('chevron', 18)}</button><button data-action="rest-upgrade" ${r.deck.every(c => c.upgraded || CARDS[c.cardId].rarity === 'curse') ? 'disabled' : ''}>${icon('sparkles', 25)}<span><b>升级卡牌</b><small>选择一张卡牌，永久强化本局效果</small></span>${icon('chevron', 18)}</button>` : EVENT_EFFECTS[r.event.id].map((o, i) => `<button data-action="event-choice" data-index="${i}" ${o.cost && r.gold < o.cost || o.hp && r.hp <= o.hp || o.effect === 'forest' && !r.deck.some(c => CARDS[c.cardId].rarity === 'rare') ? 'disabled' : ''}><span class="choice-index">0${i + 1}</span><span>${ev?.choices?.[i]?.label ? `<b>${esc(ev.choices[i].label)}</b>` : ''}<small>${esc(o.label)}</small></span>${icon('chevron', 18)}</button>`).join('')}</div><p class="muted">${isRest ? '每个休息点仅能选择一次。' : '选择立即结算，结果会保存到当前槽位。'}</p></div></section>`;
}
function shopView() {
  const r = profile.run, s = r.shop;
  return `<section class="shop-screen"><p class="eyebrow">THE TRAVELING MERCHANT</p><div class="page-heading"><div><h1>行旅商会</h1><p class="muted">购买即加入卡组，离开后无法返回。</p></div><span class="shop-gold">${icon('coin', 24)} ${r.gold}</span></div><div class="shop-grid">${s.cards.map((c, i) => `<div class="shop-item ${c.sold ? 'sold' : ''}">${cardHTML(c.id)}${button('buy-card', c.sold ? '已购买' : `${icon('coin', 16)} ${c.price}`, 'secondary wide', `data-index="${i}" ${c.sold || r.gold < c.price ? 'disabled' : ''}`)}</div>`).join('')}<div class="shop-services">${s.relic ? `<div class="shop-relic"><div class="large-relic" style="--element:${ELEMENTS[RELICS[s.relic].element].color}">${art(RELICS[s.relic].element)}</div><h3>${esc(rn(s.relic))}</h3><p>${esc(RELICS[s.relic].effect)}</p>${button('buy-relic', s.relicSold ? '已购买' : `${icon('coin', 16)} 140`, 'secondary wide', s.relicSold || r.gold < 140 ? 'disabled' : '')}</div>` : ''}<div class="remove-service">${icon('cards', 24)}<b>精简卡组</b><p>选择移除一张卡牌</p>${button('shop-remove', s.removed ? '已使用' : `${icon('coin', 16)} 75`, 'secondary wide', s.removed || r.gold < 75 || r.deck.length <= 5 ? 'disabled' : '')}</div></div></div><div class="center">${button('leave-shop', `继续探索 ${icon('arrow', 16)}`, 'primary')}</div></section>`;
}
function codexView() {
  const tabs = [['cards', '卡牌'], ['relics', '圣遗物']];
  const cardIds = Object.keys(CARDS).filter(id => !CARDS[id].transient && (ui.filter === 'all' || CARDS[id].element === ui.filter));
  return `<section class="page-heading"><div><p class="eyebrow">THE MEMORY ARCHIVE</p><h1>卡牌图鉴 <span>Collection</span></h1></div><span class="collection-count">${profile.meta.unlockedCards.length} / ${Object.keys(CARDS).length} <small>已发现卡牌</small></span></section><div class="collection-toolbar"><div class="tabs">${tabs.map(([id, text]) => `<button data-action="collection-tab" data-tab="${id}" class="${ui.collection === id ? 'active' : ''}">${text}</button>`).join('')}</div>${ui.collection === 'cards' ? `<div class="element-filters"><button class="${ui.filter === 'all' ? 'active' : ''}" data-action="filter" data-filter="all">全部</button>${Object.entries(ELEMENTS).map(([id, el]) => `<button class="${ui.filter === id ? 'active' : ''}" data-action="filter" data-filter="${id}" title="${el.label}" aria-label="筛选${el.label}元素" style="--element:${el.color}">${glyph(id)}</button>`).join('')}</div>` : ''}</div><p class="muted collection-description">图鉴展示全部机制。亮起的印记表示已在本地记录中发现。</p>${ui.collection === 'cards' ? `<div class="card-grid collection-grid">${cardIds.map(id => `<div class="collection-entry ${profile.meta.unlockedCards.includes(id) ? 'discovered' : ''}">${cardHTML(id, { action: 'card-detail' })}<span class="discovery-label">${profile.meta.unlockedCards.includes(id) ? '✧ 已发现' : '◇ 未发现'}</span></div>`).join('')}</div>` : relicGrid(Object.keys(RELICS))}`;
}
function relicGrid(ids) {
  return `<div class="relic-grid">${ids.map(id => `<article class="relic-entry"><div style="--element:${ELEMENTS[RELICS[id].element].color}">${art(RELICS[id].element)}</div><h3>${esc(rn(id))}</h3><p>${esc(RELICS[id].effect)}</p><small>${profile.meta.unlockedRelics.includes(id) ? '✧ 已发现' : '◇ 未发现'}</small></article>`).join('')}</div>`;
}
function archonView() {
  return `<section class="page-heading"><div><p class="eyebrow">ARCHON RESONANCE</p><h1>魔神助战 <span>Blessings</span></h1></div><span class="collection-count">${profile.meta.unlockedArchons.length} / 8 <small>已解锁</small></span></section><p class="muted collection-description">每击败一章首领，对应助战将在本局加入，并永久记录于图鉴。</p><div class="archon-grid">${Object.entries(ARCHONS).map(([id, a], i) => {
    const unlocked = profile.meta.unlockedArchons.includes(id), inRun = profile.run?.archons.some(a => a.id === id);
    return `<article class="archon-entry ${unlocked ? 'unlocked' : ''}" style="--element:${ELEMENTS[a.element].color}"><div class="archon-art">${art(a.element)}<span>0${i + 1}</span></div><div class="archon-copy"><span class="archon-status">${inRun ? '本局助战' : unlocked ? '已解锁' : `第 ${i + 1} 章解锁`}</span><h2>${esc(an(id))}</h2><small>${CHAPTERS[i].region} · ${ELEMENTS[a.element].label}元素</small>${copy.archons?.[id]?.biography ? `<p class="archon-biography">${esc(copy.archons[id].biography)}</p>` : ''}<div><b>被动加护</b><p>${esc(a.passive)}</p></div><div><b>${esc(copy.archons?.[id]?.skillName || '主动援护')} <span>CD ${a.cd}</span></b><p>${esc(a.active)}</p></div></div></article>`;
  }).join('')}</div>`;
}
function talentView() {
  return `<section class="page-heading"><div><p class="eyebrow">ROOTS OF REMEMBRANCE</p><h1>世界树枝干 <span>Growth</span></h1></div><span class="echoes-total">${icon('sparkles', 24)} ${profile.meta.echoes} <small>记忆残响</small></span></section><div class="talent-intro"><div class="talent-tree">${art('dendro')}</div><div><h2>永久天赋</h2><p>轮回结束后获得记忆残响，可用于永久天赋。<br>天赋在下一次轮回开始时生效。</p><div class="talent-stats"><span><b>${profile.meta.runs}</b> 轮回次数</span><span><b>${profile.meta.bestFloor}</b> 最深章节</span><span><b>${profile.meta.victories}</b> 通关次数</span></div></div></div><div class="talent-grid">${Object.entries(TALENTS).map(([id, t]) => {
    const level = profile.meta.talents[id], maxed = level >= t.max, cost = t.base * (level + 1);
    return `<article class="talent-card" style="--element:${ELEMENTS[t.element].color}"><div class="talent-icon">${art(t.element)}</div><span class="talent-level">Lv. ${level} <small>/ ${t.max}</small></span><h2>${t.label}</h2><p>${t.effect}</p><div class="talent-pips">${Array.from({ length: t.max }, (_, i) => `<i class="${i < level ? 'lit' : ''}"></i>`).join('')}</div>${button('buy-talent', maxed ? `${icon('check', 16)} 已点亮` : `${icon('sparkles', 16)} ${cost} 残响 · 点亮`, 'secondary wide', `data-talent="${id}" ${maxed || profile.meta.echoes < cost ? 'disabled' : ''}`)}</article>`;
  }).join('')}</div>`;
}
function summaryView() {
  const r = profile.run, s = r.summary;
  return `<section class="summary-screen"><p class="eyebrow">${s.victory ? 'THE CYCLE IS COMPLETE' : 'MEMORY CONNECTION ENDED'}</p><div class="summary-sigil">${art(s.victory ? 'lunar' : 'anemo')}</div><h1>${s.victory ? '轮回完成' : '本次轮回结束'}</h1>${(s.victory ? copy.game?.victory : copy.game?.defeat) ? `<p>${esc(s.victory ? copy.game.victory : copy.game.defeat)}</p>` : ''}<div class="summary-stats"><div><small>抵达章节</small><b>${s.floor}<i> / 8</i></b></div><div><small>战斗胜利</small><b>${s.fights}</b></div><div><small>元素反应</small><b>${s.reactions}</b></div><div><small>记忆残响</small><b class="gold-text">+${s.echoes}</b></div></div>${s.victory ? '<p class="muted">新的渊月难度已解锁。</p>' : ''}<div class="summary-actions">${button('new-run', `再次轮回 ${icon('arrow', 17)}`, 'primary')}${button('view-talents', '点亮世界树枝干', 'secondary')}</div>${chapterTrack(r)}</section>`;
}
function render() {
  applyScale();
  document.documentElement.dataset.motion = profile.settings.motion ? 'on' : 'off';
  // 视图或阶段变化时，为工作区加入一次性入场动画类。
  const viewKey = `${ui.view}:${profile.run?.phase || 'meta'}:${profile.run?.floor ?? ''}`;
  const enter = viewKey !== ui.viewKey;
  ui.viewKey = viewKey;
  app.innerHTML = `${sidebar()}<main class="main" data-chapter="${CHAPTERS[rview().floor].id}">${header()}<div class="workspace${enter ? ' fx-enter' : ''}">${({ route: routeView, codex: codexView, archons: archonView, talents: talentView })[ui.view]()}</div><footer class="footer"><span>✧ ${esc(title())}<i> · </i>元素策略卡牌 Roguelike</span><span>LOCAL SESSION <i> / </i> SLOT 0${slot}</span><button class="text-button" data-action="help">操作说明 ${icon('help', 13)}</button></footer></main>`;
  renderModal();
}
function dialog(title, body, cls = '', subtitle = '') {
  return `<div class="modal-backdrop" data-action="backdrop"><section class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}" tabindex="-1"><div class="modal-heading"><div>${subtitle ? `<p class="eyebrow">${subtitle}</p>` : ''}<h2>${title}</h2></div><button class="icon-button" data-action="close-modal" aria-label="关闭弹窗">${icon('close', 22)}</button></div>${body}</section></div>`;
}
function renderModal() {
  const r = rview(); let html = '';
  if (ui.modal === 'saves') {
    html = dialog('本地存档', `<p class="modal-description">进度仅存储于此浏览器、此网站地址。建议定期导出备份。</p><div class="save-slots">${[1, 2, 3].map(i => {
      const s = slotSummary(i), sr = s?.profile?.run;
      return `<div class="save-slot ${slot === i ? 'current' : ''}"><span class="slot-number">0${i}</span><div><b>${slot === i ? '当前槽位' : `存档槽位 ${i}`}</b><p>${s?.damaged ? '存档损坏 · 可导入备份替换' : sr ? `${CHAPTERS[sr.floor].region} · ${sr.phase === 'finished' ? '轮回已结束' : `第 ${sr.row + 2} 步`} · ${sr.deck.length} 张卡牌` : s ? '局外记录 · 尚未开始轮回' : '空白槽位'}</p><small>${s?.savedAt ? new Date(s.savedAt).toLocaleString('zh-CN', { hour12: false }) : '尚无保存记录'}</small></div>${slot === i ? '<span class="slot-active">使用中</span>' : button('switch-slot', '载入', 'secondary small', `data-slot="${i}"`)}</div>`;
    }).join('')}</div>${saveError ? `<div class="notice">${esc(saveError)}</div>` : ''}<div class="save-actions">${button('export', `${icon('download', 17)} 导出存档文件`, 'secondary')}${button('import', `${icon('upload', 17)} 导入存档文件`, 'secondary')}</div><div class="save-actions">${button('export-text', `${icon('archive', 17)} 导出为文本`, 'secondary')}${button('import-text', `${icon('book', 17)} 粘贴文本导入`, 'secondary')}</div>${conflict ? `<div class="save-actions">${button('reload-slot', '重新载入当前槽位', 'primary')}</div>` : ''}<input id="import-file" type="file" accept=".json,application/json" hidden><p class="fine-print">文件与文本保存的是同一份数据：文本可直接存进备忘录或聊天记录，换浏览器、换设备粘贴即可还原。每次操作自动保存，同时保留上一份有效备份。清除浏览器网站数据会移除本地存档。</p>`, 'save-modal', 'LOCAL SAVE / 3 SLOTS');
  }
  if (ui.modal === 'export-text') {
    const value = ui.exportText || '';
    html = dialog('存档文本', `<p class="modal-description">下面整段字符就是完整存档。复制后可粘进备忘录、聊天记录或任意文本文件；导入时粘贴回「粘贴文本导入」即可还原。</p><textarea class="save-text" id="save-text" readonly spellcheck="false" aria-label="存档文本">${esc(value)}</textarea><p class="fine-print">共 ${value.length} 个字符 · 包含局外记录与当前轮回 · 换行与空格在导入时会被忽略。${value.includes(`${TEXT_TAG}P.`) ? '当前环境不支持压缩，文本较长但仍可正常导入。' : ''}</p><div class="save-actions">${button('copy-save-text', `${icon('archive', 16)} 复制全部`, 'secondary')}${button('saves', '返回存档', 'secondary')}</div>`, 'save-modal', 'TEXT SAVE');
  }
  if (ui.modal === 'import-text') {
    html = dialog('粘贴存档文本', `<p class="modal-description">把之前保存的存档字符整段粘贴进来，读取后会先预览再替换当前槽位。</p><textarea class="save-text" id="import-text" spellcheck="false" placeholder="IRMINSUL1Z…" aria-label="粘贴存档文本">${esc(ui.importText)}</textarea>${ui.importError ? `<div class="notice">${esc(ui.importError)}</div>` : ''}<div class="save-actions">${button('confirm-import-text', '读取并预览', 'primary')}${button('saves', '返回存档', 'secondary')}</div>`, 'save-modal', 'IMPORT TEXT');
  }
  if (ui.modal === 'import-preview') {
    const p = ui.importData?.profile, r = p?.run;
    html = dialog('导入存档预览', `<div class="import-preview"><p>目标：<b>槽位 0${slot}</b></p><p>记录时间：${esc(new Date(ui.importData.savedAt).toLocaleString('zh-CN'))}</p><p>探索：${r ? `${CHAPTERS[r.floor].region} · ${r.deck.length} 张牌` : '局外记录'}</p><p>记忆残响：${p.meta.echoes} · 轮回次数：${p.meta.runs}</p></div><p class="modal-description">导入会替换当前槽位；现有有效存档会保留一份本地备份。</p><div class="save-actions">${button('confirm-import', '导入并替换当前槽位', 'primary')}${button('import-back', '返回', 'secondary')}</div>`);
  }
  if (ui.modal === 'settings') html = dialog('游戏设置', `<div class="setting-row"><span><b>文字大小</b><small>只放大文字，界面尺寸与布局不变 · 当前 ${scalePercent()}%（右侧开关切换自适应）</small></span><button class="toggle ${scaleSetting() ? '' : 'on'}" role="switch" aria-checked="${!scaleSetting()}" aria-label="自适应字号" title="开启后按窗口宽度自动计算" data-action="toggle-autoscale"><i></i></button></div><div class="scale-slider"><span class="scale-caption">${scaleSetting() ? '手动' : '自适应'}</span><input type="range" id="text-scale" min="${SCALE_MIN}" max="${SCALE_MAX}" step="${SCALE_STEP}" value="${scalePercent()}" ${scaleSetting() ? '' : 'disabled'} aria-label="文字大小百分比"><output for="text-scale">${scalePercent()}%</output></div><div class="setting-row"><span><b>界面音效</b><small>合成的轻量交互音，无背景音乐</small></span><button class="toggle ${profile.settings.sound ? 'on' : ''}" role="switch" aria-checked="${profile.settings.sound}" aria-label="界面音效" data-action="toggle-sound"><i></i></button></div><div class="setting-row"><span><b>界面动画</b><small>同时尊重系统的减少动态效果设置</small></span><button class="toggle ${profile.settings.motion ? 'on' : ''}" role="switch" aria-checked="${profile.settings.motion}" aria-label="界面动画" data-action="toggle-motion"><i></i></button></div><div class="setting-row"><span><b>当前轮回</b><small>结束后按本局探索进度结算记忆残响</small></span>${button('abandon-confirm', '结束轮回', 'danger-button small', liveRun() ? '' : 'disabled')}</div><p class="fine-print">自适应按窗口宽度取 112%–120%；关闭后可用滑块在 90%–130% 之间固定字号（超过 120% 时卡面的风味引文会自动隐藏）。<br>推荐使用桌面浏览器。移动端支持横向浏览手牌与路线。<br>无需账号，游戏运行期间不请求第三方资源。</p>`, '', 'PREFERENCES');
  if (ui.modal === 'abandon') html = dialog('结束当前轮回', `<p class="modal-description">将结算当前获得的记忆残响。本局卡组与路线将结束。</p><div class="save-actions">${button('abandon', '结束并结算', 'danger-button')}${button('settings', '继续探索', 'secondary')}</div>`);
  if (ui.modal === 'new-run') html = dialog(liveRun() ? '开启新的轮回' : '轮回准备', `<p class="modal-description">${liveRun() ? '开启后会结算当前轮回，并建立新的卡组与路线。' : '12 张初始卡牌 · 3 点行动能量 · 8 章探索'}</p><label class="field-label" for="seed">路线种子 <span>留空随机生成；相同种子生成相同路线</span></label><input id="seed" class="input" inputmode="numeric" placeholder="例如 884920" maxlength="10"><label class="field-label" for="spiral">渊月难度</label><select class="input" id="spiral">${Array.from({ length: profile.meta.maxSpiral + 1 }, (_, i) => `<option value="${i}">${i === 0 ? '标准难度' : `渊月 ${i} · 敌人强度 +${i * 6}%`}</option>`).join('')}</select><label class="field-label" for="blessing">初始助战</label><select class="input" id="blessing" ${profile.meta.talents.blessing ? '' : 'disabled'}><option value="">无初始助战${profile.meta.talents.blessing ? '' : ' · 需点亮「古神遗泽」'}</option>${profile.meta.talents.blessing ? profile.meta.unlockedArchons.map(id => `<option value="${id}">${esc(an(id))}</option>`).join('') : ''}</select><div class="save-actions">${button('confirm-start', `进入轮回 ${icon('arrow', 17)}`, 'primary wide')}</div>`, '', 'A NEW CYCLE');
  if (ui.modal === 'deck') html = dialog(`当前卡组 <span class="muted">${r.deck.length} 张</span>`, `<div class="card-grid modal-card-grid">${r.deck.map(c => cardHTML(c)).join('')}</div>`, 'wide-modal', 'YOUR DECK');
  if (ui.modal === 'card') {
    const id = ui.detailId, c = { cardId: id, upgraded: false };
    html = dialog(esc(cn(id)), `<div class="card-detail-pair"><div>${cardHTML(c)}<small>基础</small></div><div>${cardHTML({ ...c, upgraded: true })}<small>升级</small></div></div><p class="modal-description">${CARDS[id].onSwirlDraw ? '触发扩散时额外抽牌。' : ''}${CARDS[id].returnOnAmplify ? '触发蒸发或融化后回到手牌，本回合费用 −1；升级后返回时费用为 0。' : ''}${CARDS[id].endDamage ? '回合末仍在手牌中时造成 15 点穿甲伤害。' : ''}${CARDS[id].onDrawDamage ? '抽到时失去 3 生命。' : ''}</p>`, '', 'CARD ARCHIVE');
  }
  if (ui.modal === 'relics') html = dialog('本局圣遗物', relicGrid(r.relics), 'wide-modal');
  if (ui.modal === 'relic') { const id = ui.detailId; html = dialog(esc(rn(id)), `<div class="relic-detail" style="--element:${ELEMENTS[RELICS[id].element].color}">${art(RELICS[id].element)}<p>${esc(RELICS[id].effect)}</p>${copy.relics?.[id]?.flavor ? `<q>${esc(copy.relics[id].flavor)}</q>` : ''}</div>`); }
  if (ui.modal === 'pile') { const piles = { draw: '抽牌堆', discard: '弃牌堆', exhaust: '消耗堆' }; const cards = profile.run.battle[ui.pile]; html = dialog(`${piles[ui.pile]} · ${cards.length} 张`, `<p class="modal-description">${ui.pile === 'draw' ? '按卡牌类型排列，不代表实际抽牌顺序。' : ui.pile === 'exhaust' ? '本场战斗中无法再次抽到这些牌。' : '抽牌堆耗尽后，将弃牌堆洗入抽牌堆。'}</p><div class="card-grid modal-card-grid">${[...cards].sort((a, b) => a.cardId.localeCompare(b.cardId)).map(c => cardHTML(c)).join('') || '<p class="muted">这里暂时没有卡牌。</p>'}</div>`, 'wide-modal'); }
  if (ui.modal === 'event-result') html = dialog(esc(ui.eventTitle || '奇遇结算'), `<p class="event-body">${esc(ui.eventResult)}</p>${button('close-modal', '继续探索', 'primary wide')}`, '', 'ENCOUNTER RESULT');
  if (ui.modal === 'help' || ui.modal === 'reactions') html = dialog(ui.modal === 'help' ? '轮回指南' : '元素反应手册', `${ui.modal === 'help' ? `${copy.game?.introduction ? `<p class="event-body">${esc(copy.game.introduction)}</p>` : ''}<div class="help-steps"><div><span>01</span><b>选择航路</b><p>从下方向上探索相连节点。普通战、精英、奇遇和商店会改变卡组构筑。</p></div><div><span>02</span><b>安排元素顺序</b><p>每回合 3 能量、抽 5 张牌。点击或按数字键选择卡牌，用方向键选择敌人或己方，按 Enter 出牌；也可将卡牌拖到目标上。</p></div><div><span>03</span><b>留下永久成长</b><p>败退或通关都获得记忆残响。在世界树枝干中点亮天赋，并于下次轮回生效。</p></div></div>` : ''}<div class="reaction-table">${REACTIONS.map(([a, b, name, effect]) => `<div><span>${a === 'aura' ? '<span class="aura-label">附着</span>' : glyph(a)}<i>＋</i>${glyph(b)}</span><b>${name}</b><p>${effect}</p></div>`).join('')}</div><p class="fine-print">基础元素附着持续 2 回合。风与岩不独立附着。草原核在回合末造成 6 真实伤害，遇火或雷提前引爆造成 12 真实伤害。<br>快捷键：1–9 / 0 选择手牌，← / → 选择目标，Enter 出牌，E 结束回合，Esc 取消选择或关闭弹窗。</p>${ui.modal === 'help' ? `<div class="save-actions">${button('settings', `${icon('settings', 15)} 游戏设置`, 'secondary')}</div>` : ''}`, 'help-modal', 'HOW TO PLAY');
  modalRoot.innerHTML = html;
  document.body.classList.toggle('modal-open', !!html);
  app.inert = !!html;
  if (html) {
    const modal = modalRoot.querySelector('.modal');
    queueMicrotask(() => modal?.focus({ preventScroll: true }));
  }
}
function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message; el.classList.add('visible');
  clearTimeout(ui.toastTimer); ui.toastTimer = setTimeout(() => el.classList.remove('visible'), 3800);
}
// ---- 文本存档 ----
async function exportSaveText() {
  try {
    ui.exportText = await encodeSaveText(serializeSave(profile));
    ui.modal = 'export-text'; renderModal();
    // 打开就把整段字符选中，用户可直接 Ctrl+C；必须排在 renderModal 自己的聚焦之后。
    const box = modalRoot.querySelector('#save-text');
    if (box) queueMicrotask(() => { box.focus(); box.select(); });
  } catch (error) { toast(error.message); }
}
async function copySaveText() {
  const value = ui.exportText || '';
  let copied = false;
  if (value && navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(value); copied = true; } catch { /* 非安全上下文时回退到选区复制 */ }
  }
  if (!copied && value) {
    const box = modalRoot.querySelector('#save-text');
    if (box) { box.focus(); box.select(); try { copied = document.execCommand('copy'); } catch { copied = false; } }
  }
  toast(copied ? '存档文本已复制。' : '复制失败，请手动选中文本后复制。');
}
async function importSaveText() {
  const raw = modalRoot.querySelector('#import-text')?.value ?? ui.importText;
  try {
    ui.importData = await decodeSaveText(raw);
    // 保留粘贴内容：从预览返回时用户还能看到原文，直到真正导入成功才清空。
    ui.importError = ''; ui.importFrom = 'import-text';
    ui.modal = 'import-preview'; renderModal();
  } catch (error) {
    // 解析失败时保留已粘贴内容，方便用户对照修改，而不是清空重来。
    ui.importText = raw; ui.importError = error.message; renderModal();
  }
}
let audio;
function sound(type = 'tap') {
  if (!profile.settings.sound) return;
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); const o = audio.createOscillator(), g = audio.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(type === 'card' ? 392 : 660, audio.currentTime); o.frequency.exponentialRampToValueAtTime(type === 'card' ? 784 : 440, audio.currentTime + .12); g.gain.setValueAtTime(.025, audio.currentTime); g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + .2); o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + .21); } catch { /* Audio is optional. */ }
}
// 动效钩子：在重渲染前捕获旧 DOM 矩形，重渲染后根据前后状态差异播放特效。
// 只读视觉坐标与状态快照，不影响引擎结算与存档。
function snapshotRects() {
  const rects = { enemies: {}, player: null, panel: null, card: null };
  for (const el of document.querySelectorAll('.enemy-unit')) rects.enemies[el.dataset.target] = el.getBoundingClientRect();
  const player = document.querySelector('.player-unit'), panel = document.querySelector('.battle-panel'), card = document.querySelector('.hand-cards .game-card.selected');
  rects.player = player?.getBoundingClientRect() || null;
  rects.panel = panel?.getBoundingClientRect() || null;
  rects.card = card?.getBoundingClientRect() || null;
  return rects;
}
const rectCenter = rect => rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
function playCombatFx(before, after, rects, playedUi) {
  const pb = before.run?.battle, pa = after.run?.battle;
  const wasCombat = before.run?.phase === 'combat';
  const panelC = rectCenter(rects.panel);
  const bannerAt = rects.panel ? { x: panelC.x, y: panelC.y - rects.panel.height * 0.14 } : null;
  if (pb && pa && after.run.phase === 'combat') {
    for (const e of pa.enemies) {
      const o = pb.enemies.find(x => x.id === e.id), rect = rects.enemies[e.id];
      if (!o) { FX.flash(rect, '#e6ecd8'); continue; }
      const delta = o.hp - e.hp;
      if (delta > 0) {
        FX.floatText(rect, `-${Math.round(delta)}`, { color: '#fff0d1', size: delta >= 18 ? 48 : 40, rise: delta >= 18 ? 82 : 66 });
        FX.flash(rect, '#f6ecd2');
        FX.burst(rect, '#e6c8a2', delta >= 18 ? 14 : 7, delta >= 18 ? 74 : 44);
      } else if (delta === 0 && o.shield > e.shield && e.hp > 0) {
        FX.floatText(rect, `护盾 −${o.shield - e.shield}`, { color: '#c5e4ff', size: 27, rise: 48 });
      }
      if (o.hp > 0 && e.hp <= 0) {
        FX.burst(rect, '#f2dfae', 20, 92);
        FX.flash(rect, '#f2dfae');
      }
    }
    const hpDelta = after.run.hp - before.run.hp;
    if (hpDelta < 0) {
      FX.floatText(rects.player, `-${-hpDelta}`, { color: '#ffb4a4', size: hpDelta <= -12 ? 46 : 38, rise: 58 });
      FX.shake(hpDelta <= -12 ? 'hard' : '');
    } else if (hpDelta > 0) {
      FX.floatText(rects.player, `+${hpDelta}`, { color: '#b5d8a0', size: 20, rise: 38 });
    }
    const shieldDelta = (pa.shield || 0) - (pb.shield || 0);
    if (shieldDelta > 0) FX.floatText(rects.player, `护盾 +${shieldDelta}`, { color: '#b9c9d6', size: 13, rise: 66 });
    if (pa.reactionBanner && pa.reactionBanner !== pb.reactionBanner) {
      FX.banner(pa.reactionBanner, FX.REACTION_COLORS[pa.reactionBanner] || '#d4c49a', bannerAt, 'ELEMENTAL REACTION');
    }
    if (pa.turn > pb.turn && after.run.phase === 'combat') {
      FX.banner(`回合 ${pa.turn}`, '#c9d0b0', rects.panel ? { x: panelC.x, y: rects.panel.top + 46 } : null, 'TURN');
    }
    for (const a of pa.archons || []) {
      const o = (pb.archons || []).find(x => x.id === a.id);
      if (o && !o.cooldown && a.cooldown > 0) {
        const color = ELEMENTS[ARCHONS[a.id].element].color;
        FX.ring(rects.player, color, 76);
        FX.burst(rects.player, color, 16, 84);
      }
    }
    const flyUid = playedUi.selectedCard, played = flyUid && pb.hand.find(c => c.uid === flyUid);
    if (played && rects.card && !pa.hand.some(c => c.uid === flyUid)) {
      const el = ELEMENTS[CARDS[played.cardId].element];
      const to = playedUi.target === 'player' ? rects.player : (rects.enemies[playedUi.target] || rects.enemies[Object.keys(rects.enemies)[0]] || rects.panel);
      FX.flyCard(rects.card, to, el.color, glyph(CARDS[played.cardId].element));
    }
    if (pa.energy !== pb.energy) {
      const orb = document.querySelector('.energy-orb');
      if (orb) { orb.classList.add('fx-pop'); orb.addEventListener('animationend', () => orb.classList.remove('fx-pop'), { once: true }); }
    }
  }
  if (wasCombat && after.run?.phase === 'reward') {
    // The reward screen already names the victory; avoid overlaying a second title.
    FX.shake('hard');
  }
  if (wasCombat && after.run?.phase === 'finished') {
    FX.banner('连接中断', '#e89585', bannerAt, 'CONNECTION LOST');
    FX.shake('hard');
  }
}
function act(fn, type = 'tap', afterCommit = null) {
  if (conflict) { toast('此存档已锁定，请在存档管理中重新载入或切换槽位。'); return false; }
  const rects = snapshotRects();
  const playedUi = { selectedCard: ui.selectedCard, target: ui.target };
  const before = profile;
  const next = E.clone(profile);
  try { fn(next); validateProfile(next); } catch (error) { toast(error.message); console.error(error); return false; }
  try { saveSlot(slot, next); unsaved = false; saveError = ''; }
  catch (error) {
    if (error.message.includes('标签页') || error.message.includes('现有存档')) { conflict = true; saveError = error.message; toast(error.message); render(); return false; }
    unsaved = true; saveError = '浏览器无法写入本地存档。当前进度仍在内存，请导出备份。';
    toast(saveError);
  }
  const phaseChanged = profile.run?.phase !== next.run?.phase || profile.run?.floor !== next.run?.floor;
  if (type === 'card' && playedUi.selectedCard && next.run?.phase === 'combat' && next.run.battle.hand.some(c => c.uid === playedUi.selectedCard)) ui.reenterUid = playedUi.selectedCard;
  profile = next; afterCommit?.(); sound(type); render();
  playCombatFx(before, profile, rects, playedUi);
  if (phaseChanged) window.scrollTo({ top: 0, behavior: 'instant' });
  return true;
}
function closeModal() { ui.modal = null; ui.importData = null; renderModal(); }
function start(options = {}) {
  const ok = act(p => { if (p.run && p.run.phase !== 'finished') E.finishRun(p, false); E.startRun(p, options); });
  if (ok) { ui.modal = null; ui.selectedCard = null; ui.selectedNode = null; ui.view = 'route'; render(); }
}
function playSelected(targetId = ui.target) {
  if (!ui.selectedCard) return;
  const uid = ui.selectedCard;
  act(p => E.playCard(p, uid, targetId === 'player' ? null : targetId), 'card', () => { ui.selectedCard = null; ui.target = null; });
}
// Pointer events support mouse, pen and touch. Horizontal touch swipes remain
// available to scroll the hand; a vertical drag carries the card to a target.
let drag = null, suppressCardClick = false;
function clearDrag() {
  drag?.ghost?.remove();
  document.querySelectorAll('.drag-over, .drag-source').forEach(el => el.classList.remove('drag-over', 'drag-source'));
}
document.addEventListener('pointerdown', event => {
  const card = event.target.closest('.hand-cards [data-action="select-card"]');
  if (!card || card.disabled || ui.modal || event.button !== 0 || profile.run?.battle?.inspect) return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, card, uid: card.dataset.uid, started: false, ghost: null };
  card.setPointerCapture(event.pointerId);
});
document.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  if (!drag.started && Math.hypot(dx, dy) < 10) return;
  if (!drag.started) {
    const rect = drag.card.getBoundingClientRect();
    drag.started = true;
    drag.ghost = drag.card.cloneNode(true);
    drag.ghost.classList.remove('selected');
    drag.ghost.classList.add('drag-ghost');
    Object.assign(drag.ghost.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    document.body.appendChild(drag.ghost);
    drag.card.classList.add('drag-source', 'selected');
    ui.selectedCard = drag.uid;
  }
  event.preventDefault();
  drag.ghost.style.transform = `translate(${dx}px, ${dy}px) rotate(3deg)`;
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.enemy-unit, .player-unit');
  const card = profile.run.battle.hand.find(c => c.uid === drag.uid);
  if (target && card && (targetKind(card) === 'player') === (target.dataset.target === 'player')) target.classList.add('drag-over');
});
function finishDrag(event, cancelled = false) {
  if (!drag || event.pointerId !== drag.id) return;
  const state = drag;
  drag = null;
  if (!state.started) return;
  suppressCardClick = true;
  setTimeout(() => { suppressCardClick = false; }, 0);
  const card = profile.run?.battle?.hand.find(c => c.uid === state.uid);
  const target = !cancelled && document.elementFromPoint(event.clientX, event.clientY)?.closest('.enemy-unit, .player-unit');
  clearDrag(); state.ghost?.remove();
  if (card && target && (targetKind(card) === 'player') === (target.dataset.target === 'player')) {
    ui.target = target.dataset.target;
    playSelected(ui.target);
  } else {
    ui.target = null;
    render();
    if (!cancelled) toast(card && targetKind(card) === 'player' ? '将此牌拖到旅行者身上。' : '将此牌拖到敌人身上。');
  }
}
document.addEventListener('pointerup', event => finishDrag(event));
document.addEventListener('pointercancel', event => finishDrag(event, true));
document.addEventListener('click', async event => {
  const el = event.target.closest('[data-action]');
  if (suppressCardClick && el?.dataset.action === 'select-card') { event.preventDefault(); return; }
  if (!el || el.disabled) return;
  const a = el.dataset.action;
  try {
    if (a === 'view') { ui.view = el.dataset.view; ui.selectedCard = null; ui.modal = null; render(); window.scrollTo({ top: 0, behavior: 'instant' }); }
    if (a === 'view-talents') { ui.view = 'talents'; render(); }
    if (['saves', 'settings', 'help', 'reactions', 'deck', 'relics'].includes(a)) { ui.modal = a; renderModal(); }
    if (a === 'close-modal' || a === 'backdrop' && event.target === el) closeModal();
    if (a === 'start-direct') start();
    if (a === 'new-run') { ui.modal = 'new-run'; renderModal(); }
    if (a === 'confirm-start') {
      const raw = document.querySelector('#seed').value.trim();
      if (raw && (!/^\d+$/.test(raw) || Number(raw) > 0xffffffff)) { toast('请输入 0–4294967295 之间的整数种子。'); return; }
      start({ seed: raw ? Number(raw) : Date.now() >>> 0, blessing: document.querySelector('#blessing').value || null, spiral: Number(document.querySelector('#spiral').value) });
    }
    if (a === 'select-node') { ui.selectedNode = el.dataset.node; render(); }
    if (a === 'enter-node') { ui.selectedCard = null; ui.target = null; act(p => E.enterNode(p, el.dataset.node)); }
    if (a === 'select-card') { ui.selectedCard = ui.selectedCard === el.dataset.uid ? null : el.dataset.uid; ui.target = null; render(); }
    if (a === 'target') {
      const card = profile.run?.battle?.hand.find(c => c.uid === ui.selectedCard);
      if (card && ((targetKind(card) === 'player') !== (el.dataset.target === 'player'))) { toast(targetKind(card) === 'player' ? '此卡牌作用于旅行者。' : '请选择敌方目标。'); return; }
      ui.target = el.dataset.target; if (card) playSelected(ui.target); else render();
    }
    if (a === 'play-selected') playSelected();
    if (a === 'end-turn') { ui.selectedCard = null; act(E.endTurn); }
    if (a === 'take-reward') { ui.selectedNode = null; act(p => E.takeReward(p, el.dataset.card)); }
    if (a === 'skip-reward') { ui.selectedNode = null; act(p => E.takeReward(p)); }
    if (a === 'reroll') act(E.rerollRewards);
    if (a === 'archon') act(p => E.useArchon(p, el.dataset.archon), 'card');
    if (a === 'inspect') act(p => E.chooseInspect(p, el.dataset.uid));
    if (a === 'toggle-log') { ui.log = !ui.log; render(); }
    if (a === 'rest-heal') act(p => E.rest(p, 'heal'));
    if (a === 'rest-upgrade') act(p => E.rest(p, 'upgrade'));
    if (a === 'select-deck') act(p => E.selectDeckCard(p, el.dataset.uid));
    if (a === 'cancel-selection') act(E.cancelSelection);
    if (a === 'event-choice') {
      const id = profile.run.event.id, index = Number(el.dataset.index), result = copy.events?.[id]?.choices?.[index]?.result;
      if (act(p => E.chooseEvent(p, index)) && result) { ui.eventTitle = copy.events[id].title; ui.eventResult = result; ui.modal = 'event-result'; renderModal(); }
    }
    if (a === 'buy-card') act(p => E.shopAction(p, 'card', Number(el.dataset.index)));
    if (a === 'buy-relic') act(p => E.shopAction(p, 'relic'));
    if (a === 'shop-remove') act(p => E.shopAction(p, 'remove'));
    if (a === 'leave-shop') act(p => E.shopAction(p, 'leave'));
    if (a === 'card-detail') { ui.detailId = el.dataset.card; ui.modal = 'card'; renderModal(); }
    if (a === 'relic-detail') { ui.detailId = el.dataset.relic; ui.modal = 'relic'; renderModal(); }
    if (a === 'pile') { ui.pile = el.dataset.pile; ui.modal = 'pile'; renderModal(); }
    if (a === 'collection-tab') { ui.collection = el.dataset.tab; render(); }
    if (a === 'filter') { ui.filter = el.dataset.filter; render(); }
    if (a === 'buy-talent') { if (act(p => E.buyTalent(p, el.dataset.talent))) toast('天赋已点亮，将于下次轮回生效。'); }
    if (a === 'toggle-sound') act(p => p.settings.sound = !p.settings.sound);
    if (a === 'toggle-motion') act(p => p.settings.motion = !p.settings.motion);
    if (a === 'toggle-autoscale') {
      // 关闭自适应时，把当前的自适应尺寸固定为手动值，避免画面突然变化。
      act(p => p.settings.textScale = Number(p.settings.textScale) ? 0 : clampScale(currentScale() * 100));
    }
    if (a === 'abandon-confirm') { ui.modal = 'abandon'; renderModal(); }
    if (a === 'abandon') { if (act(p => E.finishRun(p, false))) { ui.modal = null; ui.view = 'route'; render(); } }
    if (a === 'switch-slot') {
      if (unsaved) { toast('当前进度尚未保存，请先导出备份再切换。'); return; }
      const target = Number(el.dataset.slot), result = loadSlot(target);
      slot = target; profile = result.profile; conflict = false; unsaved = false; saveError = result.recovered ? '已从上一份有效备份恢复。' : '';
      try { localStorage.setItem(PREFIX + 'active', String(slot)); } catch { /* Slot still works in the active tab. */ }
      ui.selectedNode = null; ui.selectedCard = null; ui.view = 'route'; render(); toast(`已载入槽位 0${slot}`);
    }
    if (a === 'reload-slot') { const result = loadSlot(slot); profile = result.profile; conflict = false; unsaved = false; saveError = ''; ui.selectedCard = null; ui.selectedNode = null; render(); toast('已载入最新本地存档。'); }
    if (a === 'export') {
      const data = serializeSave(profile), url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `irminsul-slot${slot}-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('存档已导出。');
    }
    if (a === 'import') { ui.importFrom = 'saves'; document.querySelector('#import-file').click(); }
    if (a === 'export-text') exportSaveText();
    if (a === 'copy-save-text') copySaveText();
    if (a === 'import-text') { ui.importText = ''; ui.importError = ''; ui.modal = 'import-text'; renderModal(); }
    if (a === 'confirm-import-text') importSaveText();
    if (a === 'import-back') { ui.modal = ui.importFrom || 'saves'; renderModal(); }
    if (a === 'confirm-import') {
      const imported = E.clone(ui.importData.profile); saveSlot(slot, imported, localStorage, true); profile = imported; conflict = false; unsaved = false; saveError = ''; ui.modal = null; ui.importData = null; ui.importText = ''; ui.importError = ''; ui.exportText = ''; ui.view = 'route'; ui.selectedCard = null; ui.selectedNode = null; render(); toast('已导入存档。');
    }
  } catch (error) { toast(error.message); }
});
document.addEventListener('input', event => {
  // 记住粘贴内容：重绘弹窗（例如解析失败后显示错误）时不能把用户输入清空。
  if (event.target.id === 'import-text') { ui.importText = event.target.value; return; }
  if (event.target.id !== 'text-scale') return;
  // 拖动时先改 CSS 变量即时预览，松手（change）再写入存档。
  const value = clampScale(Number(event.target.value));
  textScale = value / 100;
  document.documentElement.style.setProperty('--text-scale', String(textScale));
  document.documentElement.dataset.textScale = textScale > 1.2 ? 'lg' : 'md';
  const output = event.target.parentElement?.querySelector('output');
  if (output) output.textContent = `${value}%`;
});
document.addEventListener('change', async event => {
  if (event.target.id === 'text-scale') {
    const value = clampScale(Number(event.target.value));
    act(p => p.settings.textScale = value);   // 手动调整即退出自适应
    return;
  }
  if (event.target.id !== 'import-file') return;
  const file = event.target.files[0]; if (!file) return;
  try { if (file.size > SAVE_LIMIT) throw new Error('存档文件最大为 2 MB。'); ui.importData = parseSave(await file.text()); ui.importFrom = 'saves'; ui.modal = 'import-preview'; renderModal(); }
  catch (error) { toast(error.message); event.target.value = ''; }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { if (ui.modal) closeModal(); else { ui.selectedCard = null; ui.log = false; render(); } return; }
  if (ui.modal) {
    if (event.key === 'Tab') {
      const items = [...modalRoot.querySelectorAll('button:not(:disabled), input:not(:disabled):not([hidden]), select:not(:disabled), [tabindex="0"]')];
      if (items.length && !items.includes(document.activeElement)) { event.preventDefault(); (event.shiftKey ? items.at(-1) : items[0]).focus(); }
      else if (items.length && event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      else if (items.length && !event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    }
    return;
  }
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (ui.view !== 'route' || profile.run?.phase !== 'combat' || profile.run.battle.inspect) return;
  if (/^[0-9]$/.test(event.key)) {
    const i = event.key === '0' ? 9 : Number(event.key) - 1, c = profile.run.battle.hand[i];
    if (c && !E.cardProblem(profile, c)) { ui.selectedCard = c.uid; ui.target = null; render(); }
  }
  if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && ui.selectedCard) {
    const c = profile.run.battle.hand.find(card => card.uid === ui.selectedCard);
    if (c) { event.preventDefault(); ui.target = cycleTarget(c, profile.run.battle, ui.target, event.key === 'ArrowLeft' ? -1 : 1); render(); }
  }
  const focusedAction = event.target.closest('button')?.dataset.action;
  if (event.key === 'Enter' && ui.selectedCard && (!focusedAction || ['select-card', 'target', 'play-selected'].includes(focusedAction))) { event.preventDefault(); playSelected(); }
  if (event.key.toLowerCase() === 'e' && !event.repeat) { event.preventDefault(); ui.selectedCard = null; act(E.endTurn); }
});
window.addEventListener('storage', event => {
  if (event.key === PREFIX + slot) { conflict = true; saveError = '另一标签页更新了此存档，请重新载入后继续。'; render(); toast(saveError); }
});
window.addEventListener('beforeunload', event => { if (unsaved) { event.preventDefault(); event.returnValue = ''; } });
// 自适应模式下窗口变化只需重算字号变量，不必重渲染（布局尺寸没变）。
let scaleTimer = 0;
window.addEventListener('resize', () => {
  if (scaleSetting()) return;
  clearTimeout(scaleTimer);
  scaleTimer = setTimeout(applyScale, 180);
});
render();
