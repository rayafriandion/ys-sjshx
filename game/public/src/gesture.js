// 手牌区手势仲裁：同一个指针既可能是在横向滑动浏览手牌，也可能是在纵向拖牌出牌。
// 判定必须在位移还很小的时候一次性定案，之后整段手势沿用同一意图，
// 否则拖牌逻辑会抢走横向滑动，手机上就翻不动手牌了。
//
// 触摸与鼠标的处境不同，所以分开处理：
// - 触摸：横向位移会交给浏览器原生滚动（.hand-cards 是 overflow-x 容器），
//   一旦我们 preventDefault 就再也滚不动了，因此只在纵向明显占优时才接管；
//   横向意图要尽早让路，阈值取得比拖牌小。
// - 鼠标 / 触控笔：没有「斜向拖动会变成滚动」的冲突，位移够了就直接拖牌，
//   保留原先桌面上「按住卡片斜着甩到敌人身上」的手感。
// 任何一项都不满足时不表态，继续观察，避免轻微抖动就被判成拖牌。

export const SCROLL_SLOP = 8;   // 触摸：横向让路的阈值
export const DRAG_SLOP = 14;    // 触摸：起拖的纵向阈值
export const MOUSE_SLOP = 10;   // 鼠标 / 笔：起拖阈值
export const TOUCH_DRAG_RATIO = 0.75; // 触摸起拖要求 |dy| >= |dx| × 该比例（约 37°）

export function gestureIntent(dx, dy, {
  pointerType = 'touch',
  scrollSlop = SCROLL_SLOP,
  dragSlop = DRAG_SLOP,
  mouseSlop = MOUSE_SLOP,
  dragRatio = TOUCH_DRAG_RATIO
} = {}) {
  const adx = Math.abs(dx), ady = Math.abs(dy);
  if (pointerType !== 'touch') return Math.max(adx, ady) >= mouseSlop ? 'drag' : null;
  if (ady >= dragSlop && ady >= adx * dragRatio) return 'drag';
  if (adx >= scrollSlop) return 'scroll';
  return null;
}
