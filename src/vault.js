// src/vault.js
// ─────────────────────────────────────────────────────────────
// คลังสมบัติของผู้เล่น — ใครมีอะไร ตีบวกไปกี่ขั้น ติดตั้งชิ้นไหนอยู่
//
// แยกจาก treasures.js ตั้งใจ: ไฟล์นั้นคือ "กติกาที่ไม่มีวันเปลี่ยนตามผู้เล่น"
// ส่วนไฟล์นี้คือ "สถานะของผู้เล่นคนนี้" ซึ่งเปลี่ยนตลอดเวลาและต้องเซฟ
//
// ทุกฟังก์ชันที่เปลี่ยนสถานะจะเซฟลงเครื่องให้เองทันที ผู้เรียกไม่ต้องจำว่า
// ต้องเซฟตอนไหน — เคยพลาดแบบนั้นมาแล้วในระบบอื่นจนของหายตอนปิดแท็บ
// ─────────────────────────────────────────────────────────────
import {
  loadGems, saveGems, loadTreasures, saveTreasures, loadEquip, saveEquip,
} from './storage.js';
// ทองต้องผ่าน gacha.js เท่านั้น ห้ามเรียก saveGold จาก storage.js ตรง ๆ
//
// gacha.js เก็บจำนวนทองไว้ในตัวแปรของโมดูล (let gold) แล้ว getGold() คืนค่านั้น
// ถ้าเขียนลง localStorage ข้ามหลังมัน จะเกิดสองอย่างพร้อมกัน:
//   1 ตัวเลขบนจอไม่ขยับ เพราะ HUD อ่านจากแคชที่ยังเป็นค่าเก่า
//   2 การสุ่มกาช่าครั้งถัดไปคำนวณจากค่าเก่าแล้วเขียนทับ = คืนทองที่เพิ่งเสียไป
// เจอมาแล้วตอนทดสอบหน้าตีบวก ทองไม่ลดสักบาททั้งที่ตีไป 8 ครั้ง
import { getGold, addGold } from './gacha.js';
import { TREASURES, treasureById, GACHA, UPGRADE, SLOTS, T_RARITY } from './treasures.js';

// ── เพชรชมพู ────────────────────────────────────────────────

let gems = loadGems();

export function getGems() {
  return gems;
}

export function addGems(n) {
  gems = Math.max(0, gems + n);
  saveGems(gems);
  return gems;
}

// ── ครอบครองกับขั้นตีบวก ────────────────────────────────────

let owned = loadTreasures();

export function ownsTreasure(id) {
  return Object.prototype.hasOwnProperty.call(owned, id);
}

/** ขั้นตีบวกของชิ้นนั้น — คืน 0 ทั้งกรณียังไม่ตีบวกและกรณียังไม่มี */
export function treasureLevel(id) {
  return owned[id] || 0;
}

export function ownedCount() {
  return Object.keys(owned).length;
}

/**
 * id เรียงตามลำดับที่ได้มา ตัวแรกคือชิ้นที่ได้มานานที่สุด
 *
 * อาศัยกฎของ JS ที่ว่า key ชนิดข้อความในอ็อบเจกต์เรียงตามลำดับที่ใส่เข้าไป
 * และ JSON.parse ก็รักษาลำดับนั้นไว้ ส่วน grant() มีแต่เพิ่มไม่เคยลบ
 * ลำดับนี้จึงเท่ากับลำดับที่สุ่มได้จริง — ไม่ต้องเพิ่มช่องเก็บเวลาแล้วมาแปลงเซฟเก่า
 */
export function ownedOrder() {
  return Object.keys(owned);
}

/** เฉพาะชิ้นที่มีแล้ว เรียงตามลำดับในตาราง ไม่ใช่ตามลำดับที่สุ่มได้ */
export function ownedTreasures() {
  return TREASURES.filter((t) => ownsTreasure(t.id));
}

function grant(id) {
  if (ownsTreasure(id)) return false;
  owned[id] = 0;
  saveTreasures(owned);
  return true;
}

// ── ตู้สุ่มสมบัติ ────────────────────────────────────────────

/**
 * สุ่มระดับก่อน แล้วค่อยสุ่มชิ้นในระดับนั้น
 *
 * เหตุผลเดียวกับตู้ชุด: ถ้าสุ่มจากกองรวมทีเดียว อัตราออกของแต่ละระดับจะเพี้ยน
 * ทันทีที่มีคนเพิ่มสมบัติชิ้นใหม่เข้าไป สัดส่วนต้องคงที่ไม่ว่าจะมีกี่ชิ้น
 */
function rollOne() {
  const r = Math.random();
  let acc = 0;
  let tier = 'rare';
  for (const k of ['legend', 'epic', 'rare']) {
    acc += T_RARITY[k].rate;
    if (r < acc) { tier = k; break; }
  }

  // เผื่อระดับนั้นยังไม่มีสมบัติเลย จะได้ไม่คืน undefined ออกไป
  const pool = TREASURES.filter((t) => t.rarity === tier);
  const list = pool.length ? pool : TREASURES;
  const t = list[Math.floor(Math.random() * list.length)];

  const isNew = grant(t.id);
  return { treasure: t, isNew, gems: isNew ? 0 : GACHA.dupeGems };
}

/**
 * สุ่ม times ครั้ง หักเพชรครั้งเดียวตอนต้น
 * คืน { ok:false, need } ถ้าเพชรไม่พอ เพื่อให้ฝั่งจอบอกได้ว่าขาดเท่าไหร่
 */
export function pullTreasure(times = 1) {
  const cost = GACHA.cost * times;
  if (gems < cost) return { ok: false, need: cost - gems };

  addGems(-cost);

  const results = [];
  for (let i = 0; i < times; i++) results.push(rollOne());

  // เพชรที่คืนจากของซ้ำ จ่ายรวมทีเดียวตอนจบ
  const back = results.reduce((sum, r) => sum + r.gems, 0);
  if (back) addGems(back);

  return { ok: true, cost, back, results };
}

// ── ตีบวก ───────────────────────────────────────────────────

/**
 * ตีบวกหนึ่งครั้ง — หักทองก่อนเสมอ แล้วค่อยสุ่มว่าสำเร็จไหม
 *
 * ล้มเหลวแล้ว "ไม่ลดขั้น" ตั้งใจ: เสียแค่ทอง ขั้นที่ได้มาแล้วไม่หายไปไหน
 * ระบบที่ลดขั้นตอนล้มเหลวทำให้คนไม่กล้าตีต่อ ซึ่งขัดกับจุดประสงค์ของระบบนี้
 */
export function upgradeTreasure(id) {
  if (!ownsTreasure(id)) return { ok: false, reason: 'ยังไม่มีสมบัติชิ้นนี้' };

  const level = treasureLevel(id);
  if (level >= UPGRADE.maxLevel) return { ok: false, reason: 'ตีบวกสูงสุดแล้ว' };

  const gold = getGold();
  if (gold < UPGRADE.cost) {
    return { ok: false, reason: 'ทองไม่พอ', need: UPGRADE.cost - gold };
  }

  addGold(-UPGRADE.cost);

  const win = Math.random() < UPGRADE.chance;
  if (win) {
    owned[id] = level + 1;
    saveTreasures(owned);
  }
  return { ok: true, win, from: level, to: win ? level + 1 : level, spent: UPGRADE.cost };
}

// ── ช่องติดตั้ง ─────────────────────────────────────────────

/**
 * รายการที่ติดตั้งอยู่ ความยาวเท่ากับ SLOTS เสมอ ช่องว่างเป็น null
 *
 * กรองชิ้นที่ "ไม่มีแล้ว" ออกทุกครั้งที่อ่าน กันข้อมูลเก่าค้างใน localStorage
 * (เช่นเคยติดตั้งไว้แล้วไปล้างข้อมูลสมบัติทิ้ง) ไม่งั้นเกมจะพยายามใช้ฤทธิ์
 * ของสมบัติที่ผู้เล่นไม่มีอยู่จริง
 */
export function getEquipped() {
  const raw = loadEquip();
  const out = [];
  const seen = new Set();
  for (const id of raw) {
    if (out.length >= SLOTS) break;
    if (!id || seen.has(id) || !ownsTreasure(id) || !treasureById(id)) continue;
    seen.add(id);
    out.push(id);
  }
  while (out.length < SLOTS) out.push(null);
  return out;
}

/** สมบัติที่ติดตั้งอยู่จริง พร้อมขั้นตีบวก — รูปแบบที่ตัวรันในเกมใช้ได้เลย */
export function equippedTreasures() {
  return getEquipped()
    .filter(Boolean)
    .map((id) => ({ treasure: treasureById(id), level: treasureLevel(id) }));
}

export function isEquipped(id) {
  return getEquipped().includes(id);
}

/**
 * สลับติดตั้ง/ถอด — คืนผลว่าทำอะไรไป เพื่อให้จอบอกผู้เล่นได้
 * ช่องเต็มแล้วกดชิ้นใหม่จะไม่เงียบหาย แต่บอกว่าเต็มแล้วให้ถอดก่อน
 */
export function toggleEquip(id) {
  if (!ownsTreasure(id)) return { ok: false, reason: 'ยังไม่มีสมบัติชิ้นนี้' };

  const cur = getEquipped().filter(Boolean);
  const at = cur.indexOf(id);

  if (at >= 0) {
    cur.splice(at, 1);
    saveEquip(cur);
    return { ok: true, equipped: false };
  }

  if (cur.length >= SLOTS) {
    return { ok: false, reason: 'ติดตั้งได้ครั้งละ ' + SLOTS + ' ชิ้น ถอดชิ้นเดิมออกก่อน', full: true };
  }

  cur.push(id);
  saveEquip(cur);
  return { ok: true, equipped: true };
}
