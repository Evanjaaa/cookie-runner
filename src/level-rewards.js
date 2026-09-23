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
 * การ์ดพรสวรรค์ที่แจกเป็นรางวัลเลเวล — { เลเวล: id การ์ด }
 *
 * การ์ดพรสวรรค์หาได้จากทางนี้ทางเดียว (ชุด = กาช่าทอง / สมบัติ = กาช่าเพชร / สกิล = ภารกิจด่าน)
 * เรียงตามระดับ: A ก่อน (เลเวล 5-12) → S (16-20) → SS (24-50)
 * ผู้เล่นได้ใบแรกภายในไม่กี่ตา และมีเป้าให้ไล่เป็นช่วง ๆ ไปจนถึงเลเวล 50 (~190 ตา)
 * แทนที่จะเจอกำแพงเดียวที่ไกลมาก
 *
 * ── ตัวเลขชุดนี้เป็นร่างแรก ── ย้ายเลเวลได้อิสระ แต่หนึ่งเลเวลต่อหนึ่งใบ
 * (การ์ดปลดเมื่อ "กดรับรางวัลเลเวลนั้นแล้ว" — ดู isUnlocked ใน talents.js)
 */
export const TALENT_AT = {
  5: 'A1', 8: 'A2', 10: 'A3', 12: 'A4',
  16: 'S1', 20: 'S2',
  24: 'SS5', 28: 'SS2', 32: 'SS7', 36: 'SS1', 40: 'SS6', 45: 'SS3', 50: 'SS4',
};

/** การ์ดพรสวรรค์ใบนี้ได้จากเลเวลไหน — null ถ้าไม่มีในตาราง */
export function talentLevel(id) {
  for (const [lv, tid] of Object.entries(TALENT_AT)) if (tid === id) return Number(lv);
  return null;
}

/**
 * ตารางของรางวัล — ทอง/เพชรคำนวณจากสูตร ส่วนการ์ดมาจาก TALENT_AT
 *
 * ── ร่างแรก (เจ้าของเกมบอกให้ใส่อะไรก็ได้ไปก่อน) ──
 *   ทอง   ทุกเลเวล 300 + เลเวล×50 (เลเวล 2 = 400, 50 = 2,800, 99 = 5,250)
 *   เพชร  ทุก 5 เลเวล 10 เม็ด ครบสิบเลเวลได้ 20
 *   การ์ด ตาม TALENT_AT
 * ปรับทั้งตารางได้ที่ฟังก์ชันนี้ที่เดียว หน้าจอไม่ต้องแก้
 *
 * รูปแบบแต่ละเลเวล: { gold, gems, talent: 'A1', note }
 */
function buildRewards() {
  const out = {};
  for (let lv = FIRST_REWARD_LEVEL; lv <= LEVEL_CAP; lv++) {
    const r = { gold: 300 + lv * 50 };
    if (lv % 10 === 0) r.gems = 20;
    else if (lv % 5 === 0) r.gems = 10;
    if (TALENT_AT[lv]) r.talent = TALENT_AT[lv];
    out[lv] = r;
  }
  return out;
}
export const REWARDS = buildRewards();

/** ของรางวัลของเลเวลนั้น — คืน null ถ้ายังไม่ได้กำหนด */
export function rewardFor(lv) {
  const r = REWARDS[lv];
  if (!r) return null;
  // กันตารางที่ใส่ศูนย์ไว้ทุกช่อง ซึ่งเท่ากับยังไม่ได้กำหนด
  if (!r.gold && !r.gems && !r.note && !r.talent) return null;
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
  const got = { gold: 0, gems: 0, count: 0, talents: [] };
  for (let lv = FIRST_REWARD_LEVEL; lv <= Math.min(level, LEVEL_CAP); lv++) {
    const r = claim(lv, level);
    if (!r) continue;
    got.gold += r.gold || 0;
    got.gems += r.gems || 0;
    if (r.talent) got.talents.push(r.talent);
    got.count++;
  }
  return got;
}
