// src/shop.js
// ─────────────────────────────────────────────────────────────
// ร้านเหมียว — ข้อมูลร้าน (ผู้ใช้ 25 ต.ค. 2026: "จัดวางหน้า UI รอไว้ก่อน เดี๋ยวมาแก้กัน")
//
// ตอนนี้เป็นหน้าตาอย่างเดียว: ปุ่มแลก/ซื้อยังไม่ทำงาน ราคา อัตราแลก เพดานรายวัน เป็นค่าตั้งไว้ก่อนทั้งหมด
// ของจริงตามแผนใน GAME_PLAN.md (ระบบแต้ม → ทอง · ร้านค้า): การแลกและการซื้อควรให้เซิร์ฟเวอร์ตัดสิน
// ไม่ใช่หักทองในเครื่อง — ทำตอนผู้ใช้สั่งเริ่มระบบนั้น
//
// ที่ทำงานจริงแล้ว: นับค่าขนมที่เก็บได้ "วันนี้" (รวมทุกรอบ) ไว้โชว์เทียบเพดาน — เก็บในเครื่อง
//
// ── แลกทอง: เปิดจริงเฉพาะเซิร์ฟเวอร์ทดสอบ (SHOP_LIVE · ผู้ใช้ 25 ต.ค. 2026 เลือก "แบบ A") ──
// แลกในเครื่อง: หักยอดวันนี้ที่ยังไม่แลก แล้วบวกทองผ่าน addGold (ซิงก์ขึ้นคลาวด์ตามระบบทองเดิม)
// ⚠ โกงได้ (แก้ข้อมูลในเครื่อง) และเซิร์ฟเวอร์ทดสอบใช้ฐานข้อมูลเดียวกับเกมจริง — ทองที่แลกตอนเทสเข้าบัญชีจริง
// ⚠ ก่อนเปิดในเกมจริงต้องย้ายไปให้เซิร์ฟเวอร์ตัดสิน (แบบ B) — เกมจริง (meowzing.vercel.app) ปุ่มยังกดไม่ได้
// ─────────────────────────────────────────────────────────────
import { loadPref, savePref } from './storage.js';
import { todayKey } from './daily.js';
import { addGold } from './gacha.js';

/**
 * แลกทองได้จริงไหมบนเครื่องนี้ — เครื่องพัฒนา (vite dev) · ลิงก์ทดสอบ meowzing-test · ลิงก์ Preview ของ Vercel
 * ลิงก์เกมจริงไม่ตรงทั้งสามแบบ = ปุ่มแลกปิด (ไม่ต้องจำไปปิดเองตอน deploy จริง)
 */
export const SHOP_LIVE = import.meta.env.DEV
  || location.hostname === 'meowzing-test.vercel.app'
  || /^meowzing-[a-z0-9]+-evanjaaas-projects\.vercel\.app$/.test(location.hostname);

/** แลกค่าขนมเปียก → ทอง */
export const EXCHANGE = {
  treats: 1_000_000,     // ค่าขนมเท่านี้
  gold: 10_000,          // แลกได้ทองเท่านี้ (1 ล้าน → 1 หมื่น ตามที่คุยไว้)
  dailyCap: 5_000_000,   // เพดานค่าขนมที่นับได้ต่อวัน (เก็บเกินเพดาน = ไม่นับเพิ่ม)
  steps: [0.25, 0.5, 1], // ปุ่มเลือกจำนวนแลก: ¼ · ½ · ทั้งหมดที่แลกได้
};

/**
 * ของในร้านแต่ละหมวด — icon = id ใน render/items.js (มีภาพวาดอยู่แล้ว) หรืออีโมจิ (ของที่ยังไม่มีภาพ)
 * pack = ซื้อยกแพ็ก (จำนวน · ส่วนลด %) · tag = ป้ายมุมการ์ด
 */
export const SHOP_TABS = [
  { id: 'exchange', ico: '💰', name: 'แลกทอง', title: 'แลกค่าขนมเป็นทอง' },
  { id: 'food', ico: '🍣', name: 'ของกิน', title: 'ของกินน้องแมว' },
  { id: 'toy', ico: '🧶', name: 'ของเล่น', title: 'ของเล่นน้องแมว' },
  { id: 'care', ico: '🧴', name: 'ยา & ดูแล', title: 'ยาและของดูแลน้อง' },
  { id: 'home', ico: '🛁', name: 'แต่งบ้าน', title: 'อัปเกรดบ้านลูกเหมียว' },
];

export const SHOP_ITEMS = {
  food: [
    { id: 'kibble', icon: 'kibble', name: 'ข้าวเม็ดกรุบกรอบ', desc: 'อิ่มท้อง ความผูกพัน +1', price: 100 },
    { id: 'kibble10', icon: 'kibble', name: 'ข้าวเม็ด ยกแพ็ก', desc: '10 ถุง คุ้มกว่า', price: 900, pack: [10, 10], tag: 'คุ้ม' },
    { id: 'fish', icon: 'fish', name: 'ปลาทูนึ่ง', desc: 'อิ่มท้อง ความผูกพัน +3', price: 400 },
    { id: 'fish5', icon: 'fish', name: 'ปลาทู ยกแพ็ก', desc: '5 ตัว คุ้มกว่า', price: 1800, pack: [5, 10] },
    { id: 'salmon', icon: 'salmon', name: 'แซลมอนชิ้นโต', desc: 'อิ่มท้อง ความผูกพัน +5', price: 900, tag: 'โปรวันนี้' },
  ],
  toy: [
    { id: 'feather', icon: 'feather', name: 'ไม้ตกแมว', desc: 'ซื้อครั้งเดียวเล่นได้ตลอด', price: 1500 },
    { id: 'ball', icon: 'ball', name: 'บอลกระดิ่ง', desc: 'ซื้อครั้งเดียวเล่นได้ตลอด', price: 2500 },
    { id: 'mouse', icon: 'mouse', name: 'หนูของเล่น', desc: 'ซื้อครั้งเดียวเล่นได้ตลอด', price: 4000, tag: 'ใหม่' },
  ],
  care: [
    { id: 'grow', icon: '🧪', name: 'ยาเร่งโต', desc: 'น้องโตเร็วขึ้น 1 ขั้น', price: 3000 },
    { id: 'shampoo', icon: '🧴', name: 'แชมพูหอม', desc: 'อาบน้ำแล้วสะอาดนานขึ้น', price: 500 },
    { id: 'vitamin', icon: '💊', name: 'วิตามินขนสวย', desc: 'ความผูกพัน +2 วันละครั้ง', price: 800 },
  ],
  home: [
    { id: 'tub', icon: '🛁', name: 'อ่างอาบน้ำใหญ่', desc: 'อาบน้ำเร็วขึ้น', price: 8000 },
    { id: 'bed', icon: '🛏️', name: 'เบาะนุ่มพิเศษ', desc: 'นอนพักฟื้นเร็วขึ้น', price: 6000 },
    { id: 'tree', icon: 'tree', name: 'คอนโดแมวสูง', desc: 'เล่นสนุกขึ้น ความผูกพัน +1', price: 10000 },
  ],
};

// ── ค่าขนมที่เก็บได้วันนี้ (รวมทุกรอบ ไม่เกินเพดาน) ──
const DAY_PREF = 'shopDay';

/** { got: เก็บแล้ววันนี้ (ไม่เกินเพดาน), used: แลกไปแล้ว, left: ยังแลกได้, cap: เพดานต่อวัน } */
export function shopToday() {
  const d = loadPref(DAY_PREF, null);
  const today = d && d.day === todayKey();
  const got = Math.min(today ? d.got | 0 : 0, EXCHANGE.dailyCap);
  const used = Math.min(got, today ? d.used | 0 : 0);
  return { got, used, left: got - used, cap: EXCHANGE.dailyCap };
}

/** จบรอบ (showGameOver) — บวกค่าขนมของรอบนี้เข้ายอดวันนี้ */
export function addTodayTreats(n) {
  if (!(n > 0)) return;
  const { got, used } = shopToday();
  savePref(DAY_PREF, { day: todayKey(), got: Math.min(EXCHANGE.dailyCap, got + Math.floor(n)), used });
}

/**
 * แลกค่าขนมที่ยังไม่แลกของวันนี้เป็นทอง (เฉพาะ SHOP_LIVE) — คืนทองที่ได้ (0 = แลกไม่ได้)
 * ปัดค่าขนมลงให้ลงตัวกับทองเต็มเหรียญ เศษที่เหลือยังอยู่ให้แลกรอบหน้า
 */
export function exchangeTreats(treats) {
  if (!SHOP_LIVE) return 0;
  const { got, used, left } = shopToday();
  const per = EXCHANGE.treats / EXCHANGE.gold;   // ค่าขนมต่อทอง 1 เหรียญ
  const gold = Math.floor(Math.min(treats, left) / per);
  if (gold <= 0) return 0;
  savePref(DAY_PREF, { day: todayKey(), got, used: used + gold * per });
  addGold(gold);
  return gold;
}

/** ค่าขนมจำนวนนี้แลกได้ทองเท่าไหร่ */
export function treatsToGold(treats) {
  return Math.floor((treats / EXCHANGE.treats) * EXCHANGE.gold);
}
