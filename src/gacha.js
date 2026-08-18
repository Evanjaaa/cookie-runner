// src/gacha.js
// ─────────────────────────────────────────────────────────────
// ตู้กาช่า — สุ่มชุดหรือเหรียญทองด้วยเหรียญทอง
//
// สุ่ม "ประเภทรางวัล" ก่อน แล้วค่อยสุ่มของในประเภทนั้น ไม่ใช่สุ่มจากกองรวมทีเดียว
// เพราะถ้าสุ่มจากกองรวม อัตราออกของแต่ละระดับจะเพี้ยนไปตามจำนวนชุด
// ในระดับนั้นทันทีที่มีคนเพิ่มชุดใหม่ — สัดส่วนต้องคงที่ไม่ว่ามีกี่ชุด
//
// อัตราชุดอยู่ใน RARITY (outfits.js) ส่วนเหรียญทองคือ "ที่เหลือจาก 100%"
// จึงไม่มีทางที่ผลรวมจะเกินหรือขาด ไม่ว่าจะไปแก้ตัวเลขไหน
// ─────────────────────────────────────────────────────────────
import { RARITY, pullPool, grantOutfit, OUTFIT_COST } from './outfits.js';
import { loadGold, saveGold } from './storage.js';

export const DUPE_REFUND = 1200;   // ได้ชุดซ้ำ = คืนทองบางส่วน ไม่ให้รู้สึกเสียเปล่า
export const MULTI_PULLS = 5;

/** ส่วนที่เหลือจากชุดทั้งหมด = โอกาสได้เหรียญทอง */
export const GOLD_RATE = Math.max(0, 1 - RARITY.high.rate - RARITY.normal.rate);

/**
 * ช่วงเงินรางวัล เรียงจากออกง่ายไปออกยาก
 * น้ำหนักรวม 100 — ช่วง 500-5,000 กินไป 85 จึงเป็นก้อนที่เจอบ่อยที่สุด
 * ส่วน 5,000-10,000 เหลือ 15 ให้รู้สึกว่าเจอทีเป็นโชค
 */
const GOLD_BANDS = [
  { weight: 55, min: 500, max: 2000 },
  { weight: 30, min: 2000, max: 5000 },
  { weight: 15, min: 5000, max: 10000 },
];

const GOLD_TOTAL_WEIGHT = GOLD_BANDS.reduce((sum, b) => sum + b.weight, 0);

let gold = loadGold();

export function getGold() {
  return gold;
}

export function addGold(n) {
  gold = Math.max(0, gold + n);
  saveGold(gold);
  return gold;
}

/** ปัดเป็นหลักร้อย ตัวเลขรางวัลจะได้อ่านง่ายไม่ใช่ 3,847 */
function rollGold() {
  let pick = Math.random() * GOLD_TOTAL_WEIGHT;
  const band = GOLD_BANDS.find((b) => (pick -= b.weight) < 0) || GOLD_BANDS[0];
  const raw = band.min + Math.random() * (band.max - band.min);
  return Math.round(raw / 100) * 100;
}

function rollOutfit(tier) {
  // เผื่อกรณีระดับนั้นยังไม่มีชุดเลย จะได้ไม่คืน undefined ออกไป
  const pool = pullPool().filter((o) => o.rarity === tier);
  const list = pool.length ? pool : pullPool();

  const outfit = list[Math.floor(Math.random() * list.length)];
  const isNew = grantOutfit(outfit.id);
  return { kind: 'outfit', outfit, isNew, refund: isNew ? 0 : DUPE_REFUND };
}

function rollOne() {
  const r = Math.random();
  if (r < RARITY.high.rate) return rollOutfit('high');
  if (r < RARITY.high.rate + RARITY.normal.rate) return rollOutfit('normal');
  return { kind: 'gold', gold: rollGold(), refund: 0 };
}

/**
 * สุ่ม times ครั้ง หักทองครั้งเดียวตอนต้น
 * คืน { ok:false, need } ถ้าทองไม่พอ เพื่อให้ฝั่ง UI บอกได้ว่าขาดเท่าไหร่
 */
export function pull(times = 1) {
  const cost = OUTFIT_COST * times;
  if (gold < cost) return { ok: false, need: cost - gold };

  addGold(-cost);

  const results = [];
  for (let i = 0; i < times; i++) results.push(rollOne());

  // ทองที่ได้จากรางวัลกับที่คืนจากชุดซ้ำ จ่ายรวมทีเดียวตอนจบ
  const refund = results.reduce((sum, r) => sum + r.refund, 0);
  const won = results.reduce((sum, r) => sum + (r.gold || 0), 0);
  if (refund + won) addGold(refund + won);

  return { ok: true, cost, refund, won, results };
}
