// src/net/sync.js
// ─────────────────────────────────────────────────────────────
// สะพานระหว่าง localStorage กับคลาวด์
//
// เกมทั้งเกมยังอ่านเขียน localStorage แบบทันที (synchronous) เหมือนเดิมทุกจุด
// ไม่มีตรงไหนต้องรอเน็ต ไม่มีตรงไหนต้องเปลี่ยนเป็น async — ไฟล์นี้ทำสองอย่าง:
//
//   ตอนเปิดเกม  ดึงข้อมูลจากคลาวด์มาเทลง localStorage ก่อนที่โมดูลเกมจะอ่าน
//   ระหว่างเล่น  เห็นว่ามีการเขียนลงเครื่องเมื่อไหร่ ก็ทยอยส่งขึ้นคลาวด์ตามหลัง
//
// ผลคือถ้าเน็ตหลุดหรือยังไม่ได้ตั้งคีย์ Supabase เกมทำงานเหมือนเดิมเป๊ะ
// แค่ไม่มีสำเนาบนคลาวด์เท่านั้น
// ─────────────────────────────────────────────────────────────
import { KEYS, onStorageWrite } from '../storage.js';
import {
  cloudReady, signIn, fetchPlayer, fetchBests, pushPlayer, pushScore, pushPulls,
} from './cloud.js';

const GOLD_KEY = 'cookie-runner:gold';
const OWNED_KEY = 'cookie-runner:owned';
const GOLD_START = 999999;

const PUSH_DELAY = 900;   // ms รอรวมการเขียนหลาย ๆ ครั้งให้เป็นครั้งเดียว

const get = (k, d = '') => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? d : v;
  } catch {
    return d;
  }
};
const set = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* โหมดส่วนตัวเขียนไม่ได้ ปล่อยผ่าน */
  }
};

/** รวบข้อมูลผู้เล่นทั้งหมดจากเครื่อง ให้อยู่ในรูปเดียวกับคอลัมน์ในตาราง */
function readLocal() {
  let owned = [];
  try {
    const raw = JSON.parse(get(OWNED_KEY, '[]'));
    if (Array.isArray(raw)) owned = raw;
  } catch {
    owned = [];
  }
  return {
    gold: Number(get(GOLD_KEY, String(GOLD_START))) || 0,
    owned,
    outfit: get(KEYS.outfit, 'none') || 'none',
    skin: get(KEYS.skin, 'orange') || 'orange',
    stage: get(KEYS.stage, 'night') || 'night',
  };
}

/** สถิติทุกด่านที่มีอยู่ในเครื่อง อ่านจากชื่อคีย์ตรง ๆ จะได้ไม่ต้องรู้จักรายชื่อด่าน */
function readLocalBests() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEYS.bestPrefix)) {
        out[k.slice(KEYS.bestPrefix.length)] = Number(localStorage.getItem(k)) || 0;
      }
    }
  } catch {
    /* อ่านไม่ได้ก็ถือว่าไม่มี */
  }
  return out;
}

function writeLocal(row) {
  set(GOLD_KEY, String(Math.max(0, Math.floor(Number(row.gold) || 0))));
  set(OWNED_KEY, JSON.stringify(Array.isArray(row.owned) ? row.owned : []));
  if (row.outfit) set(KEYS.outfit, row.outfit);
  if (row.skin) set(KEYS.skin, row.skin);
  if (row.stage) set(KEYS.stage, row.stage);
}

/**
 * แถวบนคลาวด์ยังเป็นของใหม่เอี่ยมรึเปล่า
 *
 * ใช้ตัดสินตอนเปิดครั้งแรกว่าจะ "ดึงลง" หรือ "ดันขึ้น" — ถ้าดึงลงมั่ว ๆ
 * คนที่เล่นมานานในเครื่องก่อนมีระบบคลาวด์จะโดนล้างความคืบหน้าทิ้งทันที
 */
function cloudUntouched(row, bests) {
  return (!row.owned || row.owned.length === 0)
    && Number(row.gold) === GOLD_START
    && Object.keys(bests).length === 0;
}

function localHasProgress(local, bests) {
  return local.owned.length > 0
    || local.gold !== GOLD_START
    || Object.values(bests).some((v) => v > 0);
}

// ── ดันข้อมูลขึ้น แบบหน่วงรวบ ────────────────────────────────

let timer = null;
let online = false;

function flush() {
  clearTimeout(timer);
  timer = null;
  if (online) pushPlayer(readLocal());
}

function schedule() {
  if (!online) return;
  clearTimeout(timer);
  timer = setTimeout(flush, PUSH_DELAY);
}

/** ให้ฝั่งกาช่าเรียกบันทึกประวัติได้ ไม่บังคับ ล้มเหลวก็ไม่กระทบอะไร */
export function recordPulls(results) {
  if (!online || !results?.length) return;
  pushPulls(results.map((r) => ({
    outfit_id: r.kind === 'gold' ? null : r.outfit.id,
    rarity: r.kind === 'gold' ? 'gold' : r.outfit.rarity,
    gold_won: r.gold || 0,
    is_new: Boolean(r.isNew),
  })));
}

/**
 * เรียกครั้งเดียวก่อนโหลดตัวเกม
 * คืน true ถ้าต่อคลาวด์ได้จริง เพื่อให้ผู้เรียกเอาไปแสดงสถานะได้
 */
export async function connect() {
  if (!cloudReady) return false;

  const id = await signIn();
  if (!id) return false;

  const [row, bests] = await Promise.all([fetchPlayer(), fetchBests()]);
  const local = readLocal();
  const localBests = readLocalBests();

  if (!row) {
    // ทริกเกอร์ยังสร้างแถวไม่ทัน หรือสร้างไม่สำเร็จ — ดันของในเครื่องขึ้นไปตั้งต้น
    online = true;
    await pushPlayer(local);
  } else if (cloudUntouched(row, bests) && localHasProgress(local, localBests)) {
    // ครั้งแรกของบัญชีนี้ แต่เครื่องมีความคืบหน้าอยู่ก่อนแล้ว → ย้ายขึ้นไป
    online = true;
    await pushPlayer(local);
    for (const [stageId, score] of Object.entries(localBests)) {
      if (score > 0) await pushScore(stageId, score, 0);
    }
  } else {
    // กรณีปกติ: คลาวด์คือความจริง เทลงเครื่องก่อนเกมจะเริ่มอ่าน
    writeLocal(row);
    for (const [stageId, score] of Object.entries(bests)) {
      set(KEYS.best(stageId), String(score));
    }
    online = true;
  }

  onStorageWrite((kind, arg) => {
    if (kind === 'best') {
      // สถิติส่งทันที ไม่ต้องรอรวบ เพราะเกิดตอนจบรอบซึ่งนาน ๆ ที
      pushScore(arg.stageId, arg.value, arg.distance);
      return;
    }
    schedule();
  });

  // ปิดแท็บหรือสลับแอปตอนยังรวบไม่ครบ ต้องรีบส่งก่อน ไม่งั้นตกหล่น
  for (const ev of ['pagehide', 'visibilitychange']) {
    window.addEventListener(ev, () => {
      if (ev === 'visibilitychange' && !document.hidden) return;
      if (timer) flush();
    });
  }

  return true;
}
