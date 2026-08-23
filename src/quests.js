// src/quests.js
// ─────────────────────────────────────────────────────────────
// กิจกรรม — ภารกิจสะสมที่ทำครบแล้วกดรับรางวัลได้
//
// นี่คือทางหาเพชรทางแรกในเกม (ก่อนหน้านี้เพชรมีแค่ก้อนตั้งต้นกับในจดหมาย)
// ตัวเลขรางวัลจึงตั้งให้ "พอสุ่มได้จริง" ไม่ใช่เศษเงิน — 300 เพชร = สุ่มสมบัติ 2 ครั้ง
//
// ── ภารกิจหนึ่งข้อประกอบด้วย ──
//   stat  ชื่อตัวนับใน stats.js ที่ใช้วัด — ไม่มีภารกิจไหนนับเองแยก
//   goal  ถึงเท่านี้ถือว่าครบ
//   show  แปลงค่าดิบเป็นตัวเลขที่คนอ่านรู้เรื่อง (วินาที → นาที ฯลฯ)
//
// ที่ผูกทุกข้อไว้กับตัวนับใน stats.js แทนที่จะให้แต่ละข้อนับเอง เพราะตัวนับ
// พวกนั้นเพิ่มอย่างเดียวไม่เคยลด ภารกิจที่เคยครบแล้วจึงไม่มีทางกลับไปไม่ครบ
// ต่อให้เพิ่มภารกิจใหม่ทีหลัง ของเก่าที่ทำไว้แล้วก็นับให้ย้อนหลังเองทันที
//
// ── เพิ่มภารกิจใหม่ยังไง ──
// เติมอ็อบเจกต์ในอาเรย์ข้างล่างพอ หน้าจอสร้างรายการจาก QUESTS ตรง ๆ
// ห้ามใช้ id ซ้ำกับของเก่า เพราะ id คือกุญแจที่จำว่ารับรางวัลไปแล้วหรือยัง
// ─────────────────────────────────────────────────────────────
import { loadPref, savePref } from './storage.js';
import { loadStats } from './stats.js';

const KEY = 'questsClaimed';

export const QUESTS = [
  {
    id: 'run-30min',
    name: 'นักวิ่งอึด',
    note: 'วิ่งสะสมครบ 30 นาที',
    icon: '⏱️',
    stat: 'seconds',
    goal: 30 * 60,
    show: (v) => Math.floor(v / 60),
    unit: 'นาที',
    reward: { gems: 300 },
  },
  {
    id: 'runs-10',
    name: 'ลงสนามสิบตา',
    note: 'เล่นจบครบ 10 ตา',
    icon: '🏃',
    stat: 'runs',
    goal: 10,
    unit: 'ตา',
    reward: { gold: 5000 },
  },
  {
    id: 'meters-10k',
    name: 'ระยะทางหมื่นเมตร',
    note: 'วิ่งสะสมครบ 10,000 เมตร',
    icon: '🐾',
    stat: 'meters',
    goal: 10000,
    unit: 'ม.',
    reward: { gems: 250 },
  },
  {
    id: 'score-1m',
    name: 'ล้านแรกของเจ้าเหมียว',
    note: 'ทำคะแนนสะสมครบ 1,000,000',
    icon: '⭐',
    stat: 'score',
    goal: 1000000,
    unit: 'คะแนน',
    reward: { gems: 500 },
  },
  {
    id: 'pulls-20',
    name: 'ขาประจำตู้กาช่า',
    note: 'กดสุ่มกาช่าครบ 20 ครั้ง',
    icon: '🎰',
    stat: 'pulls',
    goal: 20,
    unit: 'ครั้ง',
    reward: { gold: 12000 },
  },
  {
    id: 'upgrade-5',
    name: 'ช่างตีบวกมือใหม่',
    note: 'ตีบวกสมบัติสำเร็จ 5 ครั้ง',
    icon: '🔨',
    stat: 'upgrades',
    goal: 5,
    unit: 'ครั้ง',
    reward: { gems: 200 },
  },
];

let claimed = null;

function loadClaimed() {
  if (claimed) return claimed;
  const saved = loadPref(KEY, null);
  claimed = Array.isArray(saved) ? saved.map(String) : [];
  return claimed;
}

export function isClaimed(id) {
  return loadClaimed().includes(String(id));
}

/**
 * สถานะของภารกิจหนึ่งข้อ ณ ตอนนี้
 *
 * cur ถูกตัดไม่ให้เกิน goal เพราะเลข "42/30" อ่านแล้วสะดุด
 * ส่วน ratio ใช้กับความยาวหลอด จึงต้องอยู่ในช่วง 0-1 เสมอ
 */
export function questState(q) {
  const raw = loadStats()[q.stat] || 0;
  const cur = Math.min(raw, q.goal);
  const done = raw >= q.goal;
  return {
    raw,
    cur,
    done,
    claimed: isClaimed(q.id),
    ratio: q.goal > 0 ? cur / q.goal : 0,
  };
}

/** เรียงของที่กดรับได้ขึ้นก่อน แล้วค่อยของที่ยังทำอยู่ ปิดท้ายด้วยของที่รับไปแล้ว */
export function questList() {
  return QUESTS.map((q) => ({ q, st: questState(q) })).sort((a, b) => {
    const rank = (x) => (x.st.claimed ? 2 : x.st.done ? 0 : 1);
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    // ในกลุ่มเดียวกัน เอาข้อที่ใกล้ครบที่สุดขึ้นก่อน — เห็นแล้วอยากไปทำต่อ
    return b.st.ratio - a.st.ratio;
  });
}

/** มีของค้างให้กดรับกี่ข้อ — ตัวเลขนี้คุมจุดแดงบนปุ่มกิจกรรม */
export function claimableCount() {
  return QUESTS.filter((q) => {
    const st = questState(q);
    return st.done && !st.claimed;
  }).length;
}

/**
 * รับรางวัลหนึ่งข้อ
 *
 * ไม่จ่ายของเอง — คืนจำนวนที่ต้องจ่ายให้ผู้เรียกไปเติมผ่านทางของมันเอง
 * (ทองต้องผ่าน gacha.js เพชรต้องผ่าน vault.js) ท่าเดียวกับ claimMail()
 * ถ้าเขียนลง localStorage ข้ามหลังสองไฟล์นั้น ตัวเลขบนจอจะไม่ขยับ
 * แล้วการเขียนเซฟครั้งถัดไปของมันจะทับค่าที่เราเพิ่งใส่ไป
 */
export function claimQuest(id) {
  const q = QUESTS.find((x) => x.id === id);
  if (!q) return { ok: false, reason: 'ไม่พบภารกิจนี้' };

  const st = questState(q);
  if (!st.done) return { ok: false, reason: 'ยังทำไม่ครบ' };
  if (st.claimed) return { ok: false, reason: 'รับรางวัลนี้ไปแล้ว' };

  loadClaimed().push(String(id));
  savePref(KEY, claimed);
  return { ok: true, quest: q, reward: q.reward };
}
