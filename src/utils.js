// src/utils.js

/** ตรวจว่าสี่เหลี่ยมสองอันซ้อนกันไหม (AABB collision) */
export function rectHit(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function randInt(n) {
  return Math.floor(Math.random() * n);
}

export function pick(arr) {
  return arr[randInt(arr.length)];
}
