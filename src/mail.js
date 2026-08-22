// src/mail.js
// ─────────────────────────────────────────────────────────────
// กล่องจดหมาย — ของขวัญกับข้อความที่ส่งถึงผู้เล่น
//
// ── ตอนนี้เก็บในเครื่องอย่างเดียว ──
// ยังไม่มีหลังบ้านให้แอดมินกดส่งจริง ๆ จดหมายทุกฉบับจึงมาจาก SEED ข้างล่าง
// ซึ่งถูกใส่ให้ครั้งเดียวตอนเปิดเกมครั้งแรก
//
// เวลาต่อของจริงทีหลัง แก้ที่เดียวคือ loadInbox(): ให้มันไปดึงจากคลาวด์
// แล้วรวมกับของในเครื่อง ส่วนที่เหลือทั้งไฟล์ทำงานกับ "รายการจดหมาย"
// เฉย ๆ ไม่สนใจว่ามาจากไหน หน้าจอก็ไม่ต้องแก้อะไรเลย
//
// สถานะเก็บแยกสองอย่างโดยตั้งใจ:
//   read    เปิดอ่านแล้วหรือยัง — คุมจุดแดงบนไอคอน
//   claimed กดรับของขวัญแล้วหรือยัง — คุมว่าจะจ่ายของซ้ำได้ไหม
// ถ้ารวมเป็นค่าเดียว คนที่เปิดอ่านแต่ยังไม่กดรับจะเสียของฟรี
// ─────────────────────────────────────────────────────────────
import { loadPref, savePref } from './storage.js';

const KEY = 'inbox';

/**
 * จดหมายตั้งต้น — ใส่ให้ครั้งเดียวตอนเปิดเกมครั้งแรกเท่านั้น
 *
 * ผูก id ไว้กับเนื้อหา ไม่ได้สุ่ม เพราะถ้าสุ่มใหม่ทุกครั้งที่เปิดเกม
 * ของขวัญเดิมจะกลับมาให้รับซ้ำได้เรื่อย ๆ
 */
const SEED = [
  {
    id: 'welcome',
    from: 'ทีมงาน meow sing',
    title: 'ยินดีต้อนรับสู่ meow sing!',
    body: 'ขอบคุณที่มาเล่นกับน้องแมวนะ\n\n'
      + 'นี่เป็นของขวัญเล็ก ๆ น้อย ๆ สำหรับเริ่มต้น เอาไปลองสุ่มชุดกับสมบัติดูได้เลย\n'
      + 'ขอให้สนุกกับการวิ่งเก็บของกินนะ เหมี้ยว~',
    at: '2026-08-01',
    reward: { gold: 20000, gems: 300 },
  },
  {
    id: 'treasure-open',
    from: 'ทีมงาน meow sing',
    title: 'ระบบสมบัติเปิดแล้ว',
    body: 'ตอนนี้เพิ่มระบบสมบัติเข้ามาแล้ว ติดตั้งได้ตาละ 3 ชิ้น\n\n'
      + 'สมบัติแต่ละชิ้นมีเงื่อนไขทำงานต่างกัน บางชิ้นนับเวลา บางชิ้นนับของกินที่เก็บได้\n'
      + 'ลองผสมดูว่าชุดไหนเข้ากับสไตล์การเล่นของเราที่สุด',
    at: '2026-08-15',
    reward: { gems: 450 },
  },
];

/** ค่าเริ่มต้นของจดหมายหนึ่งฉบับ กันข้อมูลเก่าที่ไม่มีบางช่อง */
function normalize(m) {
  return {
    id: String(m.id),
    from: m.from || 'ทีมงาน',
    title: m.title || '(ไม่มีหัวข้อ)',
    body: m.body || '',
    at: m.at || '',
    reward: m.reward || null,
    read: m.read === true,
    claimed: m.claimed === true,
  };
}

let inbox = null;

/**
 * รายการจดหมายทั้งหมด ใหม่สุดอยู่บน
 *
 * ครั้งแรกที่เรียกจะเอา SEED ใส่ให้ ครั้งต่อ ๆ ไปอ่านจากที่เซฟไว้
 * (จุดที่จะต่อคลาวด์ทีหลัง — ดึงของใหม่มาแล้ว merge เข้ากับรายการนี้)
 */
export function loadInbox() {
  if (inbox) return inbox;
  const saved = loadPref(KEY, null);
  const list = Array.isArray(saved) ? saved : SEED;
  inbox = list.map(normalize).sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  if (!Array.isArray(saved)) save();
  return inbox;
}

function save() {
  savePref(KEY, inbox);
}

export function mailById(id) {
  return loadInbox().find((m) => m.id === id) || null;
}

/** ยังไม่ได้เปิดอ่านกี่ฉบับ — ตัวเลขนี้คุมจุดแดงบนไอคอน */
export function unreadCount() {
  return loadInbox().filter((m) => !m.read).length;
}

/** ยังมีของขวัญค้างให้รับไหม — จุดแดงต้องขึ้นด้วยถ้ามี ถึงจะอ่านไปแล้วก็ตาม */
export function unclaimedCount() {
  return loadInbox().filter((m) => m.reward && !m.claimed).length;
}

/** จุดแดงขึ้นเมื่อ "ยังไม่อ่าน" หรือ "ยังมีของค้างรับ" อย่างใดอย่างหนึ่ง */
export function badgeCount() {
  return loadInbox().filter((m) => !m.read || (m.reward && !m.claimed)).length;
}

export function markRead(id) {
  const m = mailById(id);
  if (!m || m.read) return false;
  m.read = true;
  save();
  return true;
}

/**
 * รับของขวัญหนึ่งฉบับ
 *
 * ไม่จ่ายของเอง — คืนจำนวนที่ต้องจ่ายให้ผู้เรียกไปเติมผ่านทางของมันเอง
 * (ทองต้องผ่าน gacha.js เพชรต้องผ่าน vault.js ไม่งั้นตัวเลขบนจอไม่ขยับ
 *  และรอบหน้าที่ระบบนั้นเขียนเซฟจะทับค่าที่เราเพิ่งใส่ไป — เคยพลาดมาแล้ว)
 */
export function claimMail(id) {
  const m = mailById(id);
  if (!m) return { ok: false, reason: 'ไม่พบจดหมายฉบับนี้' };
  if (!m.reward) return { ok: false, reason: 'จดหมายฉบับนี้ไม่มีของขวัญ' };
  if (m.claimed) return { ok: false, reason: 'รับของขวัญนี้ไปแล้ว' };

  m.claimed = true;
  m.read = true;
  save();
  return { ok: true, reward: m.reward };
}

/** รับทุกฉบับที่ยังค้างอยู่ คืนยอดรวมเพื่อให้จอสรุปได้ทีเดียว */
export function claimAll() {
  const got = { gold: 0, gems: 0 };
  let n = 0;
  for (const m of loadInbox()) {
    if (!m.reward || m.claimed) continue;
    const r = claimMail(m.id);
    if (!r.ok) continue;
    got.gold += r.reward.gold || 0;
    got.gems += r.reward.gems || 0;
    n++;
  }
  return { count: n, ...got };
}

/** สำหรับเทสกับตอนต่อคลาวด์ทีหลัง — ยัดจดหมายเข้ากล่องโดยตรง */
export function pushMail(m) {
  const list = loadInbox();
  if (list.some((x) => x.id === String(m.id))) return false;
  list.unshift(normalize(m));
  save();
  return true;
}
