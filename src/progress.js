// src/progress.js
// ─────────────────────────────────────────────────────────────
// เลเวลผู้เล่น — สะสมจากคะแนนที่ทำได้ทุกตา ไม่รีเซ็ต
//
// ตัวเลขทั้งหมดในไฟล์นี้ตั้งจากของที่วัดจากเกมจริง ไม่ได้เดา:
//   วัดแล้วได้ราว 20,000 คะแนน/วินาที ตอนวิ่งเก็บของไปเรื่อย ๆ
//   หลอดพลังเต็มหนึ่งหลอดอยู่ได้ 79 วินาทีถ้าไม่เก็บขวดยาเลย
//
// จึงประมาณคะแนนต่อตาได้เป็น:
//   มือใหม่ตายเร็ว (~15 วิ)      ~300,000
//   เล่นจนหลอดหมดพอดี (79 วิ)    ~1,500,000
//   เก็บขวดยาต่อชีวิต (2-3 นาที)  ~3,000,000 ขึ้นไป
// ซึ่งตรงกับคะแนนจริงบนกระดานที่มีตั้งแต่ 50,000 ถึง 12,700,000
// ─────────────────────────────────────────────────────────────

export const LEVEL_CAP = 99;

/**
 * คะแนนกี่แต้มได้ 1 XP
 *
 * หาร 1,000 เพื่อให้ "หนึ่งตาได้ XP เป็นหลักร้อยถึงหลักพัน" ซึ่งเป็นช่วงที่
 * ตัวเลขบนหลอดอ่านแล้วรู้สึกได้ว่าขยับ ถ้าไม่หารเลย XP จะเป็นหลักล้าน
 * แล้วเลขบนการ์ดจะยาวจนอ่านไม่ทัน
 */
const SCORE_PER_XP = 1000;

/**
 * XP ที่ต้องใช้เพื่อขึ้นจากเลเวล lv ไป lv+1
 *
 * 250 คือส่วนคงที่ กันไม่ให้เลเวลต้น ๆ ผ่านเร็วจนไม่ทันรู้ตัวว่าได้เลเวล
 * (ถ้าใช้สูตรยกกำลังล้วน เลเวล 1→2 จะใช้แค่ ~25 XP ซึ่งจบในสามวินาทีแรก)
 *
 * ยกกำลัง 1.5 คือความชันที่ทำให้ช่วงต้นไว ช่วงปลายหนัก โดยไม่พุ่งเกินจริง
 * ปัดเป็นหลักสิบให้เลขบนการ์ดอ่านง่าย ไม่ใช่ 272 / 1,946
 */
export function xpToNext(lv) {
  if (lv >= LEVEL_CAP) return 0;   // ตันแล้ว ไม่มีขั้นถัดไป
  return Math.round((250 + 22 * Math.pow(lv, 1.5)) / 10) * 10;
}

/** XP รวมที่ต้องมีเพื่อ "เพิ่งถึง" เลเวลนั้นพอดี */
export function xpAtLevel(lv) {
  let sum = 0;
  for (let i = 1; i < lv; i++) sum += xpToNext(i);
  return sum;
}

/**
 * แปลง XP สะสมเป็นสถานะเลเวลที่เอาไปโชว์ได้ทันที
 * คืน into/need เป็น "ความคืบหน้าในเลเวลปัจจุบัน" ไม่ใช่ยอดรวม
 * เพราะหลอดบนการ์ดต้องการแค่สองค่านี้
 */
export function levelFromXp(totalXp) {
  const xp = Math.max(0, Math.floor(totalXp) || 0);
  let lv = 1;
  let left = xp;

  while (lv < LEVEL_CAP) {
    const need = xpToNext(lv);
    if (left < need) break;
    left -= need;
    lv++;
  }

  // ตันแล้วให้หลอดเต็มค้างไว้ ดีกว่าโชว์ 0/0 ซึ่งอ่านเหมือนระบบพัง
  if (lv >= LEVEL_CAP) return { level: LEVEL_CAP, into: 1, need: 1, ratio: 1, maxed: true };
  return { level: lv, into: left, need: xpToNext(lv), ratio: left / xpToNext(lv), maxed: false };
}

/** คะแนนที่จบตาหนึ่ง → XP ที่ได้จริง */
export function xpFromScore(score) {
  return Math.max(0, Math.floor((Number(score) || 0) / SCORE_PER_XP));
}

// ── เก็บใน localStorage ──────────────────────────────────────
// การอ่าน/เขียนจริงอยู่ใน storage.js เพราะที่นั่นมีตะขอ onStorageWrite
// ที่ปลุกชั้นซิงก์ให้ดันขึ้นคลาวด์ ไฟล์นี้รับผิดชอบแค่ "สูตรคำนวณเลเวล"
import { loadXp, saveXp } from './storage.js';

// ส่งต่อให้คนที่เคย import loadXp จากไฟล์นี้ ไม่ต้องไล่แก้ที่เรียกทุกจุด
export { loadXp };

/**
 * จบหนึ่งตาแล้วบวก XP
 * คืนสรุปให้หน้าจบรอบเอาไปโชว์ว่าได้เท่าไหร่และเลเวลขึ้นรึเปล่า
 */
export function awardRun(score) {
  const gained = xpFromScore(score);
  const before = levelFromXp(loadXp());
  saveXp(loadXp() + gained);
  const after = levelFromXp(loadXp());
  return { gained, before: before.level, after: after.level, leveledUp: after.level > before.level };
}
