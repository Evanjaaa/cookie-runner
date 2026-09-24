// src/fresh.js
// ─────────────────────────────────────────────────────────────
// ของใหม่ที่ยังไม่ได้ดู — จุดแดงบนการ์ด บนแท็บหมวด และบนปุ่มล็อบบี้
//
// "ใหม่" = มีแล้ว แต่ยังไม่เคยแตะการ์ดใบนั้น ไม่ว่าจะได้มาทางไหน
// (กาช่า รางวัลเลเวล ภารกิจด่าน ซื้อ ของขวัญในจดหมาย ปุ่มทดสอบ ...)
// ไฟล์นี้จึงไม่ผูกกับทางได้ของทางไหนเลย แค่เทียบ "ของที่มีตอนนี้" กับ "ของที่เคยดูแล้ว"
// ทางได้ของใหม่ในอนาคตไม่ต้องจำมาเรียกอะไรที่นี่ จุดแดงขึ้นเอง
//
// ── ใครรู้ว่ามีอะไรบ้าง ──
// แต่ละหมวดลงทะเบียนฟังก์ชัน "คืน id ของที่มีตอนนี้" ไว้ (main.js ทำตอนเริ่ม)
// ไฟล์นี้จึงไม่ต้อง import ระบบของทุกหมวด และไม่มีวง import วนกัน
//
// ── ครั้งแรกที่เจอหมวดหนึ่ง ──
// ถือว่าทุกอย่างที่มีอยู่แล้ว "ดูแล้ว" — ผู้เล่นเก่าที่เพิ่งได้ระบบนี้จะไม่เจอจุดแดงเต็มจอ
// มีแต่ของที่ได้มาหลังจากนี้เท่านั้นที่เป็นของใหม่
// ─────────────────────────────────────────────────────────────

import { loadPref, savePref } from './storage.js';

const PREF = 'seenNew';
const owners = {};
const listeners = new Set();
let seen = null;

/** ลงทะเบียนหมวด — fn คืนรายการ id ของที่มีอยู่ตอนนี้ */
export function registerFresh(cat, fn) {
  owners[cat] = fn;
}

function owned(cat) {
  try { return owners[cat] ? owners[cat]() : []; } catch { return []; }
}

function state() {
  if (!seen) {
    const saved = loadPref(PREF, null);
    seen = saved && typeof saved === 'object' ? saved : {};
  }
  return seen;
}

/** รายการที่ดูแล้วของหมวดหนึ่ง — หมวดที่เพิ่งเจอครั้งแรกตั้งฐานจากของที่มีตอนนี้ */
function seenList(cat) {
  const s = state();
  if (!Array.isArray(s[cat])) {
    s[cat] = owned(cat);
    savePref(PREF, s);
  }
  return s[cat];
}

/** ของชิ้นนี้ใหม่ไหม (มีแล้ว + ยังไม่เคยดู) */
export function isFresh(cat, id) {
  return !seenList(cat).includes(id) && owned(cat).includes(id);
}

/** มีของใหม่ในหมวดไหนบ้างไหม */
export function hasFresh(...cats) {
  return cats.some((cat) => {
    const list = seenList(cat);
    return owned(cat).some((id) => !list.includes(id));
  });
}

/** ดูแล้ว — จุดแดงของชิ้นนี้หาย แจ้งทุกคนที่ฟังอยู่ (ปุ่มล็อบบี้ แท็บหมวด) */
export function markSeen(cat, id) {
  const list = seenList(cat);
  if (list.includes(id)) return;
  list.push(id);
  savePref(PREF, state());
  for (const fn of listeners) fn(cat, id);
}

/** ฟังการเปลี่ยนแปลง (ใช้วาดจุดแดงบนแท็บ/ปุ่มใหม่) */
export function onFresh(fn) {
  listeners.add(fn);
}

/** ใส่/ถอดจุดแดงบน element (การ์ดหรือแท็บ) — สร้าง <i class="new-dot"> ตัวเดียวต่อ element */
export function setDot(el, on) {
  if (!el) return;
  let dot = el.querySelector(':scope > .new-dot');
  if (on && !dot) {
    dot = document.createElement('i');
    dot.className = 'new-dot';
    dot.setAttribute('aria-hidden', 'true');
    el.appendChild(dot);
  } else if (!on && dot) {
    dot.remove();
  }
}
