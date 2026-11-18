import test from 'node:test';
import assert from 'node:assert/strict';
import { gestureIntent, SCROLL_SLOP, DRAG_SLOP, MOUSE_SLOP } from '../public/src/gesture.js';

const touch = (dx, dy, opts) => gestureIntent(dx, dy, { pointerType: 'touch', ...opts });
const mouse = (dx, dy, opts) => gestureIntent(dx, dy, { pointerType: 'mouse', ...opts });

test('tiny jitter never commits to a gesture', () => {
  assert.equal(touch(0, 0), null);
  assert.equal(touch(3, -4), null);
  assert.equal(touch(SCROLL_SLOP - 1, 0), null);
  assert.equal(touch(0, -(DRAG_SLOP - 1)), null);
  assert.equal(mouse(0, 0), null);
  assert.equal(mouse(MOUSE_SLOP - 1, 2), null);
});

test('touch: horizontal swipes are handed back to native scrolling', () => {
  assert.equal(touch(-40, 3), 'scroll');
  assert.equal(touch(60, -18), 'scroll');
  assert.equal(touch(SCROLL_SLOP, 4), 'scroll');
  // 横向拇指弧线也要能滚动，不能被判成拖牌
  assert.equal(touch(30, 9), 'scroll');
});

test('touch: vertical movement drags the card', () => {
  assert.equal(touch(2, -40), 'drag');
  assert.equal(touch(-9, 30), 'drag');
  assert.equal(touch(20, 20), 'drag');
  assert.equal(touch(0, DRAG_SLOP), 'drag');
});

test('mouse: any direction drags once past the slop', () => {
  // 桌面上敌人常常在卡片右上方，斜向拖拽必须仍然生效
  assert.equal(mouse(120, -40), 'drag');
  assert.equal(mouse(-30, 18), 'drag');
  assert.equal(mouse(0, MOUSE_SLOP), 'drag');
});

test('thresholds and ratios are configurable', () => {
  assert.equal(touch(20, 15, { dragRatio: 0.9 }), 'scroll');
  assert.equal(touch(5, 0, { scrollSlop: 4 }), 'scroll');
  assert.equal(touch(5, 0, { scrollSlop: 8 }), null);
  assert.equal(touch(0, 5, { dragSlop: 4 }), 'drag');
  assert.equal(mouse(5, 0, { mouseSlop: 4 }), 'drag');
});
