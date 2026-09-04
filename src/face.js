// src/face.js
// ─────────────────────────────────────────────────────────────
// รูปหน้าที่ผู้เล่นอัปโหลดเอง — เอาไปแทน ตา จมูก ปาก ของน้องแมว
// ส่วนวงกลมหัว หู และหนวด ยังเป็นของน้องเหมือนเดิม
//
// ── ทำไมเก็บในเครื่องอย่างเดียว ไม่ขึ้นคลาวด์ ──
// 1. เป็นรูปคน ไม่ควรออกจากเครื่องโดยที่ผู้เล่นไม่ได้สั่งให้ส่ง
// 2. ตัวซิงก์ push "ทั้งแถว" ทุกครั้งที่มีการเขียนอะไรลงเครื่อง (ดู net/sync.js)
//    ถ้ารูปอยู่ในแถวนั้นด้วย มันจะถูกอัปโหลดซ้ำทุกครั้งที่เก็บเหรียญได้
// จึงเขียน localStorage ตรง ๆ ไม่ผ่าน savePref() ซึ่งจะไปกระตุ้น wrote()
//
// ── ทำไมเก็บเป็น dataURL ไม่ใช่ Blob ──
// localStorage เก็บได้แต่ข้อความ และรูปที่ตัดแล้วมีขนาดคงที่ 256x256
// ซึ่งออกมาราว 15-25KB เป็น base64 — เล็กพอที่จะไม่ต้องไปยุ่งกับ IndexedDB
// ─────────────────────────────────────────────────────────────

const KEY = 'cookie-runner:face';
const ON_KEY = 'cookie-runner:faceOn';

/** ด้านของรูปที่เก็บจริง — ใหญ่พอสำหรับหัวแมวตอนซูมสุดในหน้าเลือกชุด */
export const FACE_SIZE = 256;

/** รูปที่บันทึกไว้ พร้อมวาดแล้วหรือยัง */
let img = null;
let ready = false;

/**
 * รูปตัวอย่างระหว่างกำลังปรับในหน้าตัดรูป — ยังไม่ได้บันทึก
 *
 * มีไว้เพื่อให้ผู้เล่นเห็นผลจริงบนตัวน้องทันทีที่เลื่อน ไม่ใช่ต้องกดบันทึกก่อน
 * ต้องล้างทุกครั้งที่ออกจากหน้านั้นโดยไม่บันทึก ไม่งั้นน้องจะค้างรูปที่ไม่ได้เลือก
 */
let draft = null;

function load(url) {
  ready = false;
  if (!url) {
    img = null;
    return;
  }
  const el = new Image();
  el.onload = () => { ready = true; };
  el.onerror = () => { img = null; ready = false; };
  el.src = url;
  img = el;
}

try {
  if (localStorage.getItem(ON_KEY) !== '0') load(localStorage.getItem(KEY));
} catch {
  /* โหมดส่วนตัวบางตัวห้ามอ่าน localStorage — ถือว่าไม่มีรูป */
}

/**
 * รูปที่ควรวาดบนหน้าน้องตอนนี้ — null = วาดหน้าปกติ
 *
 * ตัวที่กำลังปรับอยู่ชนะตัวที่บันทึกไว้เสมอ ทุกที่ที่วาดแมว (ในเกม ล็อบบี้
 * การ์ดในเมนู ไอคอนปุ่ม) จึงเปลี่ยนตามพร้อมกันหมดโดยไม่ต้องรู้จักหน้าตัดรูป
 */
export function getFace() {
  if (draft) return draft;
  return ready ? img : null;
}

export function hasFace() {
  try {
    return Boolean(localStorage.getItem(KEY));
  } catch {
    return false;
  }
}

/** เปิดใช้รูปอยู่ไหม — เก็บรูปไว้แต่ปิดชั่วคราวได้ ไม่ต้องอัปโหลดใหม่ */
export function faceOn() {
  try {
    return hasFace() && localStorage.getItem(ON_KEY) !== '0';
  } catch {
    return false;
  }
}

export function setFaceOn(on) {
  try {
    localStorage.setItem(ON_KEY, on ? '1' : '0');
    load(on ? localStorage.getItem(KEY) : null);
  } catch {
    /* เขียนไม่ได้ก็ปล่อย */
  }
}

/**
 * บันทึกรูปที่ตัดแล้ว
 * @returns true ถ้าบันทึกสำเร็จ / false ถ้าที่เก็บในเครื่องเต็ม
 */
export function saveFace(dataUrl) {
  try {
    localStorage.setItem(KEY, dataUrl);
    localStorage.setItem(ON_KEY, '1');
    load(dataUrl);
    return true;
  } catch {
    return false;
  }
}

export function clearFace() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(ON_KEY);
  } catch {
    /* ลบไม่ได้ก็ปล่อย */
  }
  load(null);
}

/** @param src canvas/image ที่จะให้ลองใส่ให้ดู หรือ null เพื่อกลับไปใช้รูปที่บันทึกไว้ */
export function setDraft(src) {
  draft = src || null;
}
