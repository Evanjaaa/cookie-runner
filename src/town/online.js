// src/town/online.js
// ─────────────────────────────────────────────────────────────
// ห้องออนไลน์ปราสาทแมวเหมียว — ฝั่งเกม (เซิร์ฟเวอร์อยู่ที่ realtime/ · Cloudflare Durable Object)
//
//   เข้าปราสาท = ต่อห้อง castle-1 (เต็ม 20 ตัว → castle-2 …) · ออกจากปราสาท = ตัดสาย
//   ที่อยู่เซิร์ฟเวอร์: VITE_CASTLE_WS (เช่น wss://meowzing-castle.<ชื่อ>.workers.dev)
//     ไม่ตั้ง = ตอนพัฒนา (vite dev) ต่อ ws://<เครื่องนี้>:8787 (cd realtime && npm run dev) · เว็บจริงไม่ตั้ง = ปิดออนไลน์ เล่นคนเดียวเหมือนเดิม
//   สายหลุด = ต่อใหม่เอง (รอนานขึ้นทีละเท่า ไม่เกิน 15 วิ) · ส่ง "ping" ทุก 25 วิ กันสายเงียบโดนตัด
//
// ไฟล์นี้แค่รับ-ส่งข้อความ — การเดินของแมวตัวอื่น/การวาดอยู่ใน main.js (หัวข้อ "ออนไลน์ในปราสาท")
// ─────────────────────────────────────────────────────────────
const BASE = (import.meta.env.VITE_CASTLE_WS || (import.meta.env.DEV ? `ws://${location.hostname}:8787` : '')).replace(/\/+$/, '');
/** เปิดระบบออนไลน์ได้ไหม (มีที่อยู่เซิร์ฟเวอร์) */
export const onlineReady = !!BASE;

let ws = null, want = false, room = 1, backoff = 1000, retry = null, ping = null;
let myId = null;
let hello = () => ({});
let on = { reset() {}, join() {}, state() {}, look() {}, leave() {} };

/** ตัวรับเหตุการณ์จาก main.js: reset() · join(p) · state(id, st) · look(id, look) · leave(id) */
export function onlineHandlers(h) { on = { ...on, ...h }; }
/** ต่อห้องแล้วหรือยัง (ได้ welcome แล้ว) */
export const online = () => !!myId;

/** เข้าปราสาท — hi() คืนข้อมูลตัวเรา (ชื่อ ตัว ชุด สถานะ) ตอนต่อสาย/ต่อใหม่ทุกครั้ง */
export function joinCastle(hi) {
  if (!onlineReady) return;
  hello = hi;
  if (want) return;
  want = true;
  connect();
}
/** ออกจากปราสาท — ตัดสาย ไม่ต่อใหม่ */
export function leaveCastle() {
  if (!want) return;
  want = false;
  clearTimeout(retry);
  const s = ws;
  ws = null;
  if (s) { s.onclose = null; try { s.close(1000, 'bye'); } catch { /* ปิดอยู่แล้ว */ } }
  drop();
}
function drop() {
  clearInterval(ping);
  if (myId) { myId = null; on.reset(); }
}
function connect() {
  if (!want) return;
  let s;
  try { s = new WebSocket(`${BASE}/castle?room=castle-${room}`); } catch { schedule(); return; }
  ws = s;
  s.onopen = () => {
    backoff = 1000;
    s.send(JSON.stringify({ t: 'hi', ...hello() }));
    clearInterval(ping);
    ping = setInterval(() => { if (s.readyState === 1) s.send('ping'); }, 25000);
  };
  s.onmessage = (e) => {
    if (e.data === 'pong') return;
    let m;
    try { m = JSON.parse(e.data); } catch { return; }
    if (m.t === 'full') { room = (room % 9) + 1; backoff = 200; return; }   // ห้องเต็ม → ลองห้องถัดไป (เซิร์ฟเวอร์ปิดสายให้เอง)
    if (m.t === 'welcome') { myId = m.id; on.reset(); for (const p of m.peers || []) on.join(p); }
    else if (m.t === 'join' && m.p) on.join(m.p);
    else if (m.t === 'st') on.state(m.id, m);
    else if (m.t === 'look') on.look(m.id, m);
    else if (m.t === 'leave') on.leave(m.id);
  };
  s.onerror = () => {};
  s.onclose = () => {
    if (ws === s) ws = null;
    drop();
    schedule();
  };
}
function schedule() {
  if (!want) return;
  clearTimeout(retry);
  retry = setTimeout(connect, backoff);
  backoff = Math.min(15000, backoff * 2);
}
function send(obj) {
  if (ws?.readyState === 1 && myId) ws.send(JSON.stringify(obj));
}
/** สถานะตัวเราเปลี่ยน (เดิน/หยุด/หัน/กระโดด/นั่ง/ทำท่า/เปลี่ยนชั้น) */
export const sendState = (st) => send({ t: 'st', ...st });
/** เปลี่ยนชื่อ/ตัว/ชุด */
export const sendLook = (look) => send({ t: 'look', ...look });
