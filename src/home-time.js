// src/home-time.js
// ─────────────────────────────────────────────────────────────
// เวลาของฉากหน้าแรก (ผู้ใช้ 16 พ.ย. 2026): ผู้เล่นเลือกเองได้ "เฉพาะหน้าแรก"
//   อัตโนมัติ (ค่าเริ่มต้น) = ตามเวลาไทยจริง ชุดเดียวกับฟ้าในปราสาท (town/castle-sky.js)
//   กลางวัน / แดดเย็น / กลางคืน = ตรึงไว้ — เมือง ปราสาท บ้าน และที่อื่นยังเป็นเวลาจริงเสมอ (บอกผู้เล่นในหน้าตั้งค่า)
// จำในเครื่องนี้ · ใช้กับฉากริมแม่น้ำ (render/riverside.js) + ชั้นแสง/แสงขอบบนน้อง (game.drawHome)
// ─────────────────────────────────────────────────────────────
import { sky } from './town/castle-sky.js';

const KEY = 'cookie-runner:home:time';
export const HOME_TIMES = ['auto', 'day', 'dusk', 'night'];
let MODE = 'auto';
try { const v = localStorage.getItem(KEY); if (HOME_TIMES.includes(v)) MODE = v; } catch { /* ค่าเริ่มต้น */ }

export const homeTimeMode = () => MODE;
export function setHomeTimeMode(m) {
  if (!HOME_TIMES.includes(m)) return MODE;
  MODE = m;
  try { localStorage.setItem(KEY, m); } catch { /* รอบนี้ยังใช้ได้ */ }
  return MODE;
}

// ฟ้าตรึงเวลา — รูปแบบเดียวกับ castle-sky sky(): น้ำหนัก day/dusk/night รวม 1 · sunU = ตำแหน่งดวงอาทิตย์ 0..1 (เช้า → เย็น)
const FIX = {
  day: { h: 11, day: 1, dusk: 0, night: 0, sunU: 0.72, key: 'fix-day' },
  dusk: { h: 17.6, day: 0.08, dusk: 0.92, night: 0, sunU: 0.95, key: 'fix-dusk' },
  night: { h: 21, day: 0, dusk: 0, night: 1, sunU: 1, key: 'fix-night' },
};
/** สภาพฟ้าของหน้าแรกตอนนี้ */
export function homeSky() {
  const real = sky();
  if (MODE === 'auto') return real;
  return { ...FIX[MODE], am: false, moon: real.moon };
}
