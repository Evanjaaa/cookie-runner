// src/gacha.js
// ─────────────────────────────────────────────────────────────
// ตู้กาช่า — สุ่มชุดด้วยเหรียญทอง
//
// สุ่มระดับก่อน แล้วค่อยสุ่มชุดในระดับนั้น ไม่ใช่สุ่มจากกองรวมทีเดียว
// เพราะถ้าสุ่มจากกองรวม อัตราออกของแต่ละระดับจะเพี้ยนไปตามจำนวนชุด
// ในระดับนั้นทันทีที่มีคนเพิ่มชุดใหม่ — 20/80 ต้องคงที่ไม่ว่ามีกี่ชุด
// ─────────────────────────────────────────────────────────────
import { RARITY, pullPool, grantOutfit, OUTFIT_COST } from './outfits.js';
import { loadGold, saveGold } from './storage.js';

export const DUPE_REFUND = 1200;   // ได้ชุดซ้ำ = คืนทองบางส่วน ไม่ให้รู้สึกเสียเปล่า
export const MULTI_PULLS = 5;

let gold = loadGold();

export function getGold() {
  return gold;
}

export function addGold(n) {
  gold = Math.max(0, gold + n);
  saveGold(gold);
  return gold;
}

function rollOne() {
  const tier = Math.random() < RARITY.high.rate ? 'high' : 'normal';
  // เผื่อกรณีระดับนั้นยังไม่มีชุดเลย จะได้ไม่คืน undefined ออกไป
  const pool = pullPool().filter((o) => o.rarity === tier);
  const list = pool.length ? pool : pullPool();

  const outfit = list[Math.floor(Math.random() * list.length)];
  const isNew = grantOutfit(outfit.id);
  return { outfit, isNew, refund: isNew ? 0 : DUPE_REFUND };
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

  const refund = results.reduce((sum, r) => sum + r.refund, 0);
  if (refund) addGold(refund);

  return { ok: true, cost, refund, results };
}
