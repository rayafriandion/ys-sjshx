// 战斗与界面动效层。
// 所有特效都渲染在独立叠加层 #fx-root 中，pointer-events 关闭，不触碰正式 DOM、
// 不读写游戏状态，因此全量重渲染与存档完全不受影响。
// 尊重两处开关：设置中的「界面动画」（html[data-motion]）与系统 prefers-reduced-motion。

const REDUCED = '(prefers-reduced-motion: reduce)';
export const motionOn = () =>
  document.documentElement.dataset.motion !== 'off' &&
  !(window.matchMedia && window.matchMedia(REDUCED).matches);

function root() {
  let el = document.querySelector('#fx-root');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fx-root';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  return el;
}
const center = rect => rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
// 浮动数字的字号跟随玩家的「文字大小」设置；特效几何尺寸（扩散距离、光圈直径）保持固定，
// 避免放字后打击特效跟着变形。位置来自 getBoundingClientRect，本身已是 CSS 像素。
const textScale = () => {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--text-scale'));
  return Number.isFinite(value) && value > 0 ? value : 1;
};
const font = value => Math.round(value * textScale());
// 用 animationend 或超时双重保险移除节点，避免残留物堆积。
const expire = (el, ms) => {
  el.addEventListener('animationend', () => el.remove(), { once: true });
  setTimeout(() => el.remove(), ms);
};

// 浮动战斗数字：伤害、治疗、护盾、回合提示等。
export function floatText(rect, text, { color = '#f0ead0', size = 24, rise = 48 } = {}) {
  if (!rect) return;
  const p = center(rect);
  const el = document.createElement('span');
  el.className = 'fx-float';
  el.textContent = text;
  el.style.cssText = `left:${p.x}px;top:${p.y}px;color:${color};font-size:${font(size)}px;--rise:${rise}px`;
  root().appendChild(el);
  expire(el, 1500);
}

// 元素粒子爆发：命中、击破、助战发动等。
export function burst(rect, color = '#d4c49a', count = 12, spread = 60) {
  if (!motionOn() || !rect) return;
  const p = center(rect), dots = [];
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('i');
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = spread * (0.55 + Math.random() * 0.7);
    dot.className = 'fx-particle';
    dot.style.cssText = `left:${p.x}px;top:${p.y}px;color:${color};--dx:${Math.round(Math.cos(angle) * dist)}px;--dy:${Math.round(Math.sin(angle) * dist - 12)}px;animation-delay:${Math.random() * 60}ms`;
    dots.push(dot);
    root().appendChild(dot);
  }
  setTimeout(() => dots.forEach(d => d.remove()), 900);
}

// 命中闪光：白色元素晕圈。
export function flash(rect, color = '#ffffff') {
  if (!motionOn() || !rect) return;
  const p = center(rect), el = document.createElement('i');
  const w = Math.max(rect.width, 90);
  el.className = 'fx-flash';
  el.style.cssText = `left:${p.x}px;top:${p.y}px;width:${w}px;height:${w}px;color:${color}`;
  root().appendChild(el);
  expire(el, 700);
}

// 扩散圆环：助战技能、胜利等大事件。
export function ring(rect, color = '#d4c49a', size = 60) {
  if (!motionOn() || !rect) return;
  const p = center(rect), el = document.createElement('i');
  el.className = 'fx-ring';
  el.style.cssText = `left:${p.x}px;top:${p.y}px;width:${size}px;height:${size}px;color:${color}`;
  root().appendChild(el);
  expire(el, 1000);
}

// 居中横幅：元素反应、回合切换、胜负。
export function banner(text, color = '#d4c49a', at = null, sub = '') {
  if (!motionOn()) return;
  const el = document.createElement('div');
  el.className = 'fx-banner';
  el.style.color = color;
  if (at) el.style.cssText += `left:${at.x}px;top:${at.y}px`;
  el.innerHTML = `<b></b>${sub ? '<small></small>' : ''}<i></i>`;
  el.querySelector('b').textContent = text;
  if (sub) el.querySelector('small').textContent = sub;
  root().appendChild(el);
  expire(el, 1500);
}

// 战斗面板震动：受到攻击、首领败亡。
export function shake(strength = '') {
  if (!motionOn()) return;
  const panel = document.querySelector('.battle-panel') || document.querySelector('.workspace');
  if (!panel) return;
  panel.classList.remove('fx-shake', 'fx-shake-hard');
  void panel.offsetWidth;
  panel.classList.add(strength === 'hard' ? 'fx-shake-hard' : 'fx-shake');
  panel.addEventListener('animationend', event => {
    if (event.target === panel) panel.classList.remove('fx-shake', 'fx-shake-hard');
  }, { once: true });
}

// 出牌飞行：小型卡影从手牌位置飞向目标，用 Web Animations API 计算动态轨迹。
export function flyCard(from, to, color = '#d4c49a', glyph = '◇') {
  if (!motionOn() || !from || !to) return;
  const el = document.createElement('div');
  el.className = 'fx-fly-card';
  el.style.cssText = `left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;--element:${color};font-size:${Math.round(from.height * 0.3)}px`;
  el.innerHTML = glyph; // markup comes from the local, fixed element icon renderer
  root().appendChild(el);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const anim = el.animate([
    { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.55}px,${dy * 0.55 - 26}px) rotate(${dx > 0 ? 9 : -9}deg) scale(.82)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px,${dy}px) rotate(0deg) scale(.4)`, opacity: 0 }
  ], { duration: 380, easing: 'cubic-bezier(.4,.1,.7,1)' });
  anim.onfinish = () => el.remove();
  setTimeout(() => el.remove(), 700);
}

// 反应名称 → 主题色，用于横幅与粒子。
export const REACTION_COLORS = {
  '蒸发': '#ec9d7b', '融化': '#dab56b', '超载': '#d88fb0', '感电': '#bda0ef',
  '冻结': '#a3d8e2', '绽放': '#a1c982', '激化': '#9bcfa8', '扩散': '#82d6b4', '结晶': '#e2c98a'
};
