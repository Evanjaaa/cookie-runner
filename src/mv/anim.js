// src/mv/anim.js
// ─────────────────────────────────────────────────────────────
// เครื่องมือเล็ก ๆ ของ MV — ทุกอย่างคิดจาก "เวลา" ตัวเดียว (วินาทีนับจากต้นเพลง)
//
// ท่าเดียวกับคลิปเปิดเกม (intro-anim.js): ไม่มีสถานะสะสมข้ามเฟรม
// กรอไปดูวินาทีไหนก็ได้ภาพเดิมเป๊ะ ภาพกับเพลงจึงไม่มีทางคลาดกันสะสม
// ─────────────────────────────────────────────────────────────

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const lerp = (a, b, k) => a + (b - a) * k;

/** ช่วงเวลา a→b แปลงเป็น 0..1 (ก่อน a = 0, หลัง b = 1) */
export const seg = (t, a, b) => clamp01((t - a) / (b - a));

export const EASE = {
  lin: (k) => k,
  io: (k) => k * k * (3 - 2 * k),                              // ช้า-เร็ว-ช้า
  out: (k) => 1 - (1 - k) * (1 - k),                            // พุ่งแล้วค่อย ๆ หยุด
  in: (k) => k * k,                                             // ค่อย ๆ ออกตัว
  back: (k) => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2), // เลยเป้านิดแล้วเด้งคืน
  hold: (k) => (k < 1 ? 0 : 1),                                 // ค้างค่าเดิมจนถึงคีย์ถัดไป = ตัดภาพ
};

/**
 * คีย์เฟรม: keys = [[เวลา, ค่า, ease?], ...] เรียงตามเวลา
 * ค่าเป็นตัวเลข หรืออ็อบเจกต์ของตัวเลข (ผสมทีละช่อง ช่องที่ไม่มีในคีย์ใดคีย์หนึ่งถือเป็น 0)
 * ease ของคีย์ไหน = วิธีเดินทาง "เข้าหา" คีย์นั้นจากคีย์ก่อนหน้า
 */
export function track(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ease = 'io'] = keys[i];
    if (t < t1) {
      const [t0, v0] = keys[i - 1];
      return mix(v0, v1, EASE[ease]((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
}

function mix(a, b, k) {
  if (typeof a === 'number') return lerp(a, b, k);
  const out = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[key] ?? 0, vb = b[key] ?? 0;
    out[key] = typeof va === 'number' && typeof vb === 'number' ? lerp(va, vb, k) : (k < 0.5 ? va : vb);
  }
  return out;
}

/** ตัวเลขสุ่มแต่คงที่ต่อ seed — ฝุ่น กระดาษ ประกาย ต้องอยู่ที่เดิมทุกครั้งที่กรอกลับมาดู */
export function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** จังหวะเพลง — วัดจากไฟล์จริง ราว 102 BPM (ดู STORYBOARD.md) */
export const BEAT = 60 / 101.7;
export const BEAT0 = 0.12;
/** 0..1 ภายในจังหวะปัจจุบัน — 0 = ตรงจังหวะพอดี */
export const beatPhase = (t) => (((t - BEAT0) / BEAT) % 1 + 1) % 1;
