// src/stats.js
// ─────────────────────────────────────────────────────────────
// สถิติสะสมตลอดชีพของผู้เล่นคนนี้ — วิ่งไปกี่ตา กี่นาที ได้กี่คะแนน สุ่มไปกี่ครั้ง
//
// แยกจาก progress.js ตั้งใจ: ไฟล์นั้นคือ "เลเวลกับ XP" ซึ่งเป็นตัวเลขที่เกมใช้
// ตัดสินอะไรบางอย่าง ส่วนไฟล์นี้คือตัวนับดิบที่ไม่มีความหมายในตัวเอง
// จนกว่าจะมีใครมาถาม (ตอนนี้คือหน้ากิจกรรม — quests.js)
//
// เก็บเป็นก้อนเดียวใน pref ก้อนเดียว ไม่แยกคีย์ทีละตัว เพราะทุกตัวถูกเขียน
// พร้อมกันตอนจบตาเสมอ แยกคีย์แล้วจะกลายเป็นเขียน localStorage สี่รอบต่อหนึ่งตา
// โดยไม่ได้อะไรกลับมา
//
// ── กติกาเดียวที่ห้ามแหก ──
// ตัวนับพวกนี้ "เพิ่มอย่างเดียว ไม่เคยลด" หน้ากิจกรรมจึงเทียบกับเป้าหมายได้ตรง ๆ
// โดยไม่ต้องกลัวว่าภารกิจที่เคยทำสำเร็จแล้วจะกลับไปไม่สำเร็จอีก
// ─────────────────────────────────────────────────────────────
import { loadPref, savePref } from './storage.js';

const KEY = 'stats';

const EMPTY = {
  runs: 0,        // จบตาไปกี่รอบ
  seconds: 0,     // เวลาที่วิ่งจริงรวมกี่วินาที (ไม่นับเวลาที่อยู่ในเมนู)
  meters: 0,      // ระยะทางรวมเป็นเมตร
  score: 0,       // คะแนนรวมทุกตาบวกกัน
  pulls: 0,       // กดสุ่มกาช่าไปกี่ครั้ง (นับทั้งช่องสมบัติและช่องสกิน)
  upgrades: 0,    // ตีบวกสำเร็จไปกี่ครั้ง
};

let stats = null;

/** อ่านค่าที่เซฟไว้ เติมช่องที่ขาดด้วยศูนย์ เผื่อเซฟเก่าที่บันทึกไว้ก่อนมีช่องนั้น */
export function loadStats() {
  if (stats) return stats;
  const saved = loadPref(KEY, null);
  stats = { ...EMPTY };
  if (saved && typeof saved === 'object') {
    for (const k of Object.keys(EMPTY)) {
      const v = Number(saved[k]);
      if (Number.isFinite(v) && v > 0) stats[k] = v;
    }
  }
  return stats;
}

function save() {
  savePref(KEY, stats);
}

/**
 * บันทึกผลของหนึ่งตาที่เพิ่งจบ
 *
 * เรียกที่เดียวตอนหน้าจบรอบโผล่ — จุดเดียวที่การันตีว่า "ตาหนึ่งจบแล้วจริง"
 * เหมือนที่ awardRun() ของ progress.js ทำ ถ้าไปเรียกตอนตายจะโดนนับซ้ำ
 * เพราะตายถูกเรียกจากหลายทาง
 */
export function recordRun({ seconds = 0, meters = 0, score = 0 } = {}) {
  const s = loadStats();
  s.runs += 1;
  s.seconds += Math.max(0, Math.round(seconds));
  s.meters += Math.max(0, Math.round(meters));
  s.score += Math.max(0, Math.round(score));
  save();
  return s;
}

/** นับจำนวนครั้งที่กดสุ่ม ไม่ใช่จำนวนของที่ได้ — สุ่มทีละ 5 ก็คือ 5 ครั้ง */
export function recordPulls(n = 1) {
  const s = loadStats();
  s.pulls += Math.max(0, n | 0);
  save();
  return s;
}

export function recordUpgrade() {
  const s = loadStats();
  s.upgrades += 1;
  save();
  return s;
}
