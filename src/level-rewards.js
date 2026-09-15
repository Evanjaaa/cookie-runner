// src/level-rewards.js
// ─────────────────────────────────────────────────────────────
// รางวัลประจำเลเวล — ขึ้นเลเวลทีได้ของทุกครั้ง
//
// ไฟล์นี้รู้แค่สองเรื่อง: "เลเวลไหนได้อะไร" กับ "กดรับไปแล้วเลเวลไหนบ้าง"
// ไม่รู้จักหน้าจอ ไม่รู้จักเสียง และไม่รู้ว่าตอนนี้ผู้เล่นเลเวลเท่าไหร่
// (คนเรียกเป็นคนบอกเลเวลมา) — แยกแบบนี้เพื่อให้เปลี่ยนตารางของรางวัลทีหลัง
// ได้โดยไม่ต้องแตะโค้ดหน้าจอเลยสักบรรทัด
// ─────────────────────────────────────────────────────────────

import { loadPref, savePref } from './storage.js';
import { LEVEL_CAP } from './progress.js';

/** เลเวลแรกที่มีรางวัล — เลเวล 1 คือจุดเริ่มต้น ไม่ได้ "ขึ้นมา" จึงไม่มีของ */
export const FIRST_REWARD_LEVEL = 2;

/**
 * ตารางของรางวัล — เติมที่นี่ที่เดียว
 *
 * รูปแบบ: <เลเวล>: { gold: 0, gems: 0, note: 'ข้อความพิเศษ' }
 * ใส่เท่าที่มี ช่องที่เป็นศูนย์หรือไม่ใส่จะไม่ขึ้นการ์ด
 *
 * ── ทำไมตอนนี้ว่างทั้งตาราง ──
 * ยังไม่ได้ตกลงกันว่าจะให้อะไรบ้าง (รอเจ้าของเกมบอก) เลเวลที่ยังไม่มีของ
 * จะขึ้นเป็นกล่องปริศนาในหน้ารางวัล และกดรับไม่ได้ ซึ่งตรงกับความจริง
 * ดีกว่าแจกของมั่ว ๆ ไปก่อนแล้วมาแก้ทีหลังตอนผู้เล่นรับไปแล้ว
 *
 * เติมเลเวลไหนแล้ว เลเวลนั้นกดรับได้ทันทีโดยไม่ต้องแก้อะไรอีก
 */
export const REWARDS = {
  // ตัวอย่างรูปแบบ (ยังไม่เปิดใช้):
  // 2:  { gold: 500 },
  // 5:  { gold: 1500, gems: 5 },
  // 10: { gems: 20, note: 'ครบสิบเลเวลแล้ว!' },
};

/** ของรางวัลของเลเวลนั้น — คืน null ถ้ายังไม่ได้กำหนด */
export function rewardFor(lv) {
  const r = REWARDS[lv];
  if (!r) return null;
  // กันตารางที่ใส่ศูนย์ไว้ทั้งคู่ ซึ่งเท่ากับยังไม่ได้กำหนด
  if (!r.gold && !r.gems && !r.note) return null;
  return r;
}

// ── เลเวลไหนกดรับไปแล้วบ้าง ─────────────────────────────────
//
// เก็บเป็นรายการเลเวล ไม่ใช่ "รับถึงเลเวลเท่าไหร่แล้ว" เพราะของรางวัลถูกเติม
// ทีหลังได้ตลอด คนที่เลเวล 40 อยู่แล้วอาจเพิ่งมีของให้รับที่เลเวล 7 ในวันหลัง
// ถ้าเก็บเป็นขีดเดียว การเติมของย้อนหลังจะกลายเป็น "รับไปแล้ว" ทันทีโดยไม่ได้รับจริง

const CLAIM_PREF = 'lvClaim';

/** เลเวลที่กดรับไปแล้วทั้งหมด (เรียงจากน้อยไปมาก) */
export function claimedLevels() {
  const raw = loadPref(CLAIM_PREF, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((n) => Math.floor(Number(n)))
    .filter((n) => Number.isFinite(n) && n >= FIRST_REWARD_LEVEL && n <= LEVEL_CAP)
    .sort((a, b) => a - b);
}

export function isClaimed(lv) {
  return claimedLevels().includes(lv);
}

/** เลเวลนั้นกดรับได้ไหม ณ เลเวลปัจจุบัน */
export function canClaim(lv, level) {
  return lv <= level && !!rewardFor(lv) && !isClaimed(lv);
}

/**
 * ทำเครื่องหมายว่ารับแล้ว
 * คืนของรางวัลให้คนเรียกเอาไปจ่ายจริง (ไฟล์นี้ไม่แตะกระเป๋าเงินเอง —
 * การบวกทอง/เพชรอยู่กับ main.js ที่เดียวเหมือนของรางวัลทางอื่นทั้งหมด)
 */
export function claim(lv, level) {
  if (!canClaim(lv, level)) return null;
  const list = claimedLevels();
  list.push(lv);
  savePref(CLAIM_PREF, list);
  return rewardFor(lv);
}

/** มีของค้างให้กดรับกี่ชิ้น — ตัวเลขบนป้ายแดงของปุ่ม */
export function claimableCount(level) {
  let n = 0;
  for (let lv = FIRST_REWARD_LEVEL; lv <= Math.min(level, LEVEL_CAP); lv++) {
    if (canClaim(lv, level)) n++;
  }
  return n;
}

/**
 * รับรวดเดียวทุกใบที่ค้างอยู่
 * คืนยอดรวมเพื่อให้กล่องฉลองโชว์เป็นก้อนเดียว ไม่ใช่เด้งทีละใบสิบรอบ
 */
export function claimAll(level) {
  const got = { gold: 0, gems: 0, count: 0 };
  for (let lv = FIRST_REWARD_LEVEL; lv <= Math.min(level, LEVEL_CAP); lv++) {
    const r = claim(lv, level);
    if (!r) continue;
    got.gold += r.gold || 0;
    got.gems += r.gems || 0;
    got.count++;
  }
  return got;
}
