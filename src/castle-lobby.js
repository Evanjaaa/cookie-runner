// src/castle-lobby.js
// ─────────────────────────────────────────────────────────────
// หน้าเลือกห้องปราสาทออนไลน์ (หน้าแรก — ผู้ใช้ 10 พ.ย. 2026) คุยกับห้องออนไลน์ realtime/ ผ่าน HTTP ธรรมดา
//   /lobby       → { total } คนออนไลน์ในห้องสาธารณะ (ป้ายบนปุ่ม + การ์ดห้องสุ่ม)
//   /room?code=  → { n, max } ห้องส่วนตัวรหัสนี้มีกี่ตัว (สร้างห้อง = หารหัสว่าง · เข้าห้องเพื่อน = เช็คก่อนไป)
// ที่อยู่เดียวกับ src/town/online.js (VITE_CASTLE_WS · ตอนพัฒนา = เครื่องนี้ :8787) · ไม่ตั้ง = ออนไลน์ปิด เข้าปราสาทแบบเล่นคนเดียว
// ─────────────────────────────────────────────────────────────
const WS = (import.meta.env.VITE_CASTLE_WS || (import.meta.env.DEV ? `ws://${location.hostname}:8787` : '')).replace(/\/+$/, '');
const HTTP = WS.replace(/^ws/, 'http');
/** เปิดระบบห้องออนไลน์ได้ไหม */
export const lobbyReady = !!HTTP;

async function get(path) {
  const r = await fetch(HTTP + path, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
/** คนออนไลน์ในห้องสาธารณะ · null = ต่อห้องไม่ได้ */
export async function lobbyCount() {
  if (!lobbyReady) return null;
  try { return (await get('/lobby')).total ?? null; } catch { return null; }
}
/** ห้องส่วนตัวรหัสนี้ → { n, max } · null = ต่อห้องไม่ได้ */
export async function roomInfo(code) {
  if (!lobbyReady) return null;
  try { return await get('/room?code=' + code); } catch { return null; }
}
/** สุ่มรหัส 4 หลักที่ยังไม่มีใครใช้ · null = ต่อห้องไม่ได้ */
export async function newRoomCode() {
  for (let i = 0; i < 8; i++) {
    const c = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const r = await roomInfo(c);
    if (!r) return null;
    if (!r.n) return c;
  }
  return null;
}
