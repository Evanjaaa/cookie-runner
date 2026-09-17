// src/friends.js
// ─────────────────────────────────────────────────────────────
// ระบบเพื่อนฝั่งเกม — รหัสเพื่อน สถานะออนไลน์ และภาพรวมโปรไฟล์ที่คนอื่นส่องได้
//
// ไฟล์นี้ไม่รู้จักหน้าจอ รู้แค่ "ข้อมูลของเพื่อน" ส่วนหน้าโปรไฟล์อยู่ใน main.js
// ทุกอย่างพังได้โดยไม่กระทบการเล่น: ไม่มีเน็ต / ยังไม่ได้รัน friends.sql = แค่ส่องใครไม่ได้
// ─────────────────────────────────────────────────────────────
import {
  cloudReady, userId, touchPresence, pushPublicProfile,
} from './net/cloud.js';

export const FRIEND_CODE_LEN = 8;

/** ช่องกรอกรหัส: ตัวพิมพ์ใหญ่ ตัดช่องว่าง/ขีด ตัดเกินความยาว — พิมพ์ "ab12-cd34" ก็ใช้ได้ */
export function normalizeCode(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, FRIEND_CODE_LEN);
}

/** เหตุผลที่ทำไม่สำเร็จ → ข้อความให้ผู้เล่นอ่าน (รหัสมาจาก cloud.js) */
export function reasonText(reason) {
  switch (reason) {
    case 'offline': return 'ต้องเข้าสู่ระบบและต่อเน็ตก่อน ถึงจะใช้ระบบเพื่อนได้';
    case 'schema': return 'ระบบเพื่อนยังไม่พร้อม (ยังไม่ได้ตั้งค่าฐานข้อมูล)';
    case 'notfound': return 'ไม่พบผู้เล่นที่ใช้รหัสนี้';
    case 'self': return 'นี่คือรหัสของเราเอง';
    case 'short': return `รหัสแมวน้อยมี ${FRIEND_CODE_LEN} ตัว`;
    case 'limit': return 'ส่งคำขอค้างไว้เยอะเกินไป รอให้อีกฝ่ายตอบก่อนนะ';
    case 'full': return 'เพื่อนเต็มแล้ว ลบเพื่อนบางคนก่อนถึงจะเพิ่มได้';
    case 'gone': return 'คำขอนี้ถูกยกเลิกไปแล้ว';
    default: return 'ต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง';
  }
}

// ── สถานะออนไลน์ ─────────────────────────────────────────────
//
// เกมส่ง "ยังอยู่" ทุก PRESENCE_EVERY ตอนที่หน้าเกมเปิดอยู่บนจอ
// ถือว่าออนไลน์ถ้าเห็นล่าสุดไม่เกิน ONLINE_WITHIN — เผื่อไว้สองรอบครึ่ง
// รอบหนึ่งหลุดเพราะเน็ตกระตุกยังไม่ควรโดนตีว่าออฟไลน์
const PRESENCE_EVERY = 2 * 60 * 1000;
const ONLINE_WITHIN = 5 * 60 * 1000;

/** เวลาเห็นล่าสุด → { on, text } สำหรับป้ายมุมการ์ด */
export function onlineInfo(lastSeen, now = Date.now()) {
  const t = lastSeen ? Date.parse(lastSeen) : NaN;
  if (!Number.isFinite(t)) return { on: false, text: 'ออฟไลน์' };
  const ago = Math.max(0, now - t);
  if (ago <= ONLINE_WITHIN) return { on: true, text: 'ใช้งานอยู่' };
  const min = Math.floor(ago / 60000);
  if (min < 60) return { on: false, text: `ออนไลน์เมื่อ ${min} นาทีที่แล้ว` };
  const hr = Math.floor(min / 60);
  if (hr < 24) return { on: false, text: `ออนไลน์เมื่อ ${hr} ชม.ที่แล้ว` };
  return { on: false, text: `ออนไลน์เมื่อ ${Math.floor(hr / 24)} วันที่แล้ว` };
}

let presenceTimer = 0;

async function presenceTick() {
  if (!cloudReady || !userId() || document.hidden) return;
  await touchPresence();
}

/**
 * เริ่มส่งสถานะออนไลน์ — เรียกครั้งเดียวตอนเปิดเกม
 * ตัวมันเช็คเองทุกรอบว่าเข้าสู่ระบบแล้วหรือยัง จึงเรียกได้ก่อนล็อกอินเสร็จ
 * กลับมาที่แท็บเมื่อไหร่ส่งทันที ไม่รอให้ครบรอบ (เพื่อนจะได้เห็นว่ากลับมาแล้ว)
 */
export function startPresence() {
  if (presenceTimer || !cloudReady) return;
  presenceTimer = setInterval(presenceTick, PRESENCE_EVERY);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) presenceTick(); });
  setTimeout(presenceTick, 4000);
}

// ── ภาพรวมโปรไฟล์ที่คนอื่นเห็น ───────────────────────────────
//
// ส่งเฉพาะเมื่อเนื้อหาเปลี่ยนจริง — หน้าโปรไฟล์เรียกทุกครั้งที่เปิด/แก้
// ถ้าส่งทุกครั้งจะยิงฐานข้อมูลถี่โดยไม่ได้อะไรใหม่
let lastSent = '';

export async function publishProfile(snapshot) {
  if (!cloudReady || !userId()) return { ok: false, reason: 'offline' };
  const json = JSON.stringify(snapshot);
  if (json === lastSent) return { ok: true, same: true };
  const r = await pushPublicProfile(snapshot);
  if (r.ok) lastSent = json;
  return r;
}
