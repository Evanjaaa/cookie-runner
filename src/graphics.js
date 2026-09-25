// src/graphics.js
// ─────────────────────────────────────────────────────────────
// ระดับกราฟิก — ตัวเดียวที่ตอบว่า "เครื่องนี้ควรทำงานหนักแค่ไหน"
//
// ── ทำไมต้องมี ──
// การวาดหนึ่งเฟรมคือของที่แพงที่สุดในเกม (ผ้าใบเต็มจอ + แสงฟุ้งทั้งเฟรม)
// มือถือบางรุ่นเล่นไปสิบนาทีแล้วร้อนจนเครื่องหรี่ความเร็วลงเอง ซึ่งเป็นการลดคุณภาพ
// แบบที่ผู้เล่นคุมไม่ได้เลย สู้ให้เขาเลือกเองว่าจะยอมแลกอะไรดีกว่า
//
// ── สามระดับต่างกันตรงไหน ──
//   scale   เพดานความละเอียดผ้าใบ (เท่าของ 960x420) — ตัวที่กินแรงที่สุด
//   fps     เพดานเฟรมต่อวินาที — จอ 120Hz ไม่ต้องวาดสองเท่าโดยเปล่าประโยชน์
//   bloom   แสงฟุ้งทั้งเฟรม: 1 = ทุกเฟรม, 2 = เฟรมเว้นเฟรม, 0 = ปิด
//   parts   ตัวคูณจำนวนอนุภาค
//
// ไฟล์นี้ไม่รู้จักหน้าจอและไม่วาดอะไรเอง — ใครอยากรู้ค่าก็เรียก quality()
// และถ้าอยากรู้ตอนค่าเปลี่ยนให้ลงทะเบียนผ่าน onQuality()
// ─────────────────────────────────────────────────────────────
import { loadPref, savePref } from './storage.js';

export const LEVELS = {
  high: { scale: 2, fps: 60, bloom: 2, parts: 1 },
  mid: { scale: 1.5, fps: 60, bloom: 2, parts: 0.7 },
  save: { scale: 1.15, fps: 30, bloom: 0, parts: 0.45 },
};

export const LEVEL_IDS = ['high', 'mid', 'save'];

/**
 * เพดานความละเอียดบนมือถือ — ทับค่า scale ของระดับนั้นเฉพาะเครื่องที่เป็นมือถือ
 * จอ 6 นิ้วที่ 1.6 เท่ายังละเอียดเกินกว่าตาแยกออก (เทียบภาพกันแล้ว) แต่วาดพิกเซลน้อยลง 36%
 * ทุกเฟรม ซึ่งเป็นตัวที่ทำให้มือถือร้อนที่สุด คอมกับแท็บเล็ตยังได้ 2 เท่าเต็มเหมือนเดิม
 */
const PHONE_SCALE = { high: 1.6 };

/** มือถือ = จอสัมผัส และด้านสั้นของจอไม่เกิน 500 จุด (แท็บเล็ตด้านสั้น 700+ จึงไม่นับ) */
const IS_PHONE = typeof window !== 'undefined'
  && window.matchMedia?.('(pointer: coarse)').matches
  && Math.min(window.screen.width, window.screen.height) <= 500;

/** ค่าจริงที่ใช้บนเครื่องนี้ — คิดครั้งเดียว (quality() ถูกเรียกหลายครั้งต่อเฟรม) */
const ACTIVE = Object.fromEntries(Object.entries(LEVELS).map(([id, q]) => [
  id, IS_PHONE && PHONE_SCALE[id] ? { ...q, scale: PHONE_SCALE[id] } : q,
]));

const PREF = 'gfx';
let level = LEVEL_IDS.includes(loadPref(PREF, '')) ? loadPref(PREF, '') : 'high';
const listeners = [];

/** ค่าของระดับที่เลือกอยู่ */
export function quality() {
  return ACTIVE[level];
}

export function gfxLevel() {
  return level;
}

/** เปลี่ยนระดับ — เรียกผู้ที่ลงทะเบียนไว้ทุกคนให้ปรับตาม (เช่นตั้งขนาดผ้าใบใหม่) */
export function setGfxLevel(next) {
  if (!LEVEL_IDS.includes(next) || next === level) return;
  level = next;
  savePref(PREF, level);
  for (const fn of listeners) fn(quality());
}

export function onQuality(fn) {
  listeners.push(fn);
}

/**
 * จำนวนอนุภาคหลังหักตามระดับ — อย่างน้อยหนึ่งชิ้นเสมอถ้าเดิมมีมากกว่าศูนย์
 * (ศูนย์ชิ้น = เอฟเฟกต์หายไปทั้งอัน ซึ่งอ่านเป็นบั๊คมากกว่าอ่านเป็นการประหยัด)
 */
export function partCount(n) {
  const k = quality().parts;
  return k >= 1 ? n : Math.max(1, Math.round(n * k));
}
