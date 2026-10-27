// src/town/wallet.js
// ─────────────────────────────────────────────────────────────
// กระเป๋าเงินของหน้าเมือง — ทอง · กระเป๋าของ · ค่าขนมวันนี้ · ราคาสินค้า
//
// สองโหมด:
//   server = เข้าสู่ระบบแล้ว + รัน supabase/town.sql แล้ว → ทุกการซื้อ/แลกให้ฐานข้อมูลตัดสิน (ทองจริงของบัญชี)
//   demo   = ยังไม่ได้เข้าสู่ระบบ / ยังไม่ได้รัน SQL / ไม่มีเน็ต → ทองทดลองในเครื่อง แยกจากทองจริง (ไม่แตะเกม)
// หน้าจอถาม mode/reason ไปบอกผู้เล่นตรง ๆ ว่ากำลังใช้แบบไหน
// ─────────────────────────────────────────────────────────────
import { restoreSession, callRpc, cloudReady } from '../net/cloud.js';
import { loadPref, savePref, saveGold } from '../storage.js';
import { getGold } from '../gacha.js';
import { SHOP_ITEMS, EXCHANGE, shopToday } from '../shop.js';

const DEMO_PREF = 'townDemo';

/** รายการสินค้าจาก shop.js แปลงเป็นรูปเดียวกับ shop_catalog (ใช้ตอนโหมดทดลอง และเป็นค่าเริ่มก่อนเซิร์ฟเวอร์ตอบ) */
function localCatalog() {
  const out = [];
  for (const [tab, list] of Object.entries(SHOP_ITEMS)) {
    for (const it of list) {
      const base = it.pack ? it.icon : it.id;
      out.push({ id: it.id, tab, price: it.price, gives: base, qty: it.pack ? it.pack[0] : 1, max_own: tab === 'toy' || tab === 'home' ? 1 : null });
    }
  }
  return out;
}

const W = {
  mode: 'demo',
  reason: '',
  gold: 0,
  bag: {},
  today: { got: 0, used: 0, cap: EXCHANGE.dailyCap },
  catalog: localCatalog(),
};

function applyServer(d) {
  if (!d) return;
  W.gold = Number(d.gold) || 0;
  W.bag = d.bag || {};
  W.today = { got: Number(d.today?.got) || 0, used: Number(d.today?.used) || 0, cap: Number(d.today?.cap) || EXCHANGE.dailyCap };
  if (Array.isArray(d.catalog) && d.catalog.length) W.catalog = d.catalog;
  // ให้เกมในเครื่องเดียวกันเห็นยอดใหม่ทันที (เปิดเกมใหม่ คลาวด์ก็ชนะอยู่แล้ว — ดู net/sync.js writeLocal)
  saveGold(W.gold);
}

function loadDemo() {
  const d = loadPref(DEMO_PREF, null);
  // ทองทดลองเริ่มจากยอดทองในเครื่องตอนเปิดเมืองครั้งแรก — ใช้จ่ายไปไม่ลดทองจริง
  const demo = d && typeof d === 'object' ? d : { gold: getGold(), bag: {}, day: '', used: 0 };
  const t = shopToday();
  const sameDay = demo.day === new Date().toDateString();
  W.gold = demo.gold | 0;
  W.bag = demo.bag || {};
  W.today = { got: t.got, used: sameDay ? Math.min(t.got, demo.used | 0) : 0, cap: t.cap };
  W.catalog = localCatalog();
}
function saveDemo() {
  savePref(DEMO_PREF, { gold: W.gold, bag: W.bag, day: new Date().toDateString(), used: W.today.used });
}

/** ข้อความ error ของฐานข้อมูล → ข้อความไทยที่ตั้งไว้ในฟังก์ชัน (raise exception '...') */
function errText(e) {
  const m = e?.message || '';
  const th = m.match(/(ทองไม่พอ|มีของชิ้นนี้แล้ว|ไม่มีสินค้านี้|ค่าขนมยังไม่พอแลก|ต้องเข้าสู่ระบบก่อน|ไม่พบข้อมูลผู้เล่น)/);
  return th ? th[1] : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง';
}

/** เริ่มต้น: ลองโหมดเซิร์ฟเวอร์ ไม่ได้ = ตกไปโหมดทดลองพร้อมเหตุผล */
export async function initWallet() {
  // town.html?demo = บังคับโหมดทดลอง (ทดสอบ/ดูหน้าตาโดยไม่แตะทองจริง — สคริปต์ทดสอบต้องใช้ทางนี้เสมอ)
  if (new URLSearchParams(location.search).has('demo')) { loadDemo(); W.mode = 'demo'; W.reason = 'เปิดด้วย ?demo'; return W; }
  if (!cloudReady) { loadDemo(); W.mode = 'demo'; W.reason = 'ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์'; return W; }
  const user = await restoreSession();
  if (!user) { loadDemo(); W.mode = 'demo'; W.reason = 'ยังไม่ได้เข้าสู่ระบบในเกม'; return W; }
  // รายงานค่าขนมที่เก็บได้วันนี้ (ยอดรวม · เซิร์ฟเวอร์เก็บค่าที่มากกว่าและไม่เกินเพดาน)
  await callRpc('town_report_treats', { p_total: shopToday().got });
  const { data, error } = await callRpc('town_state');
  if (error) {
    loadDemo();
    W.mode = 'demo';
    W.reason = error.code === 'PGRST202' || /town_state/.test(error.message || '')
      ? 'ยังไม่ได้รัน supabase/town.sql' : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้';
    return W;
  }
  W.mode = 'server';
  W.reason = '';
  applyServer(data);
  return W;
}

export function wallet() { return W; }

/** ราคา/ของที่ได้ของสินค้าชิ้นนี้ (ตามเซิร์ฟเวอร์ถ้าเชื่อมอยู่) */
export function catalogItem(id) {
  return W.catalog.find((c) => c.id === id) || null;
}

/** ซื้อหนึ่งรายการ → { ok, msg } */
export async function buy(id) {
  const c = catalogItem(id);
  if (!c) return { ok: false, msg: 'ไม่มีสินค้านี้' };
  if (W.mode === 'server') {
    const { data, error } = await callRpc('town_buy', { p_item: id });
    if (error) return { ok: false, msg: errText(error) };
    applyServer(data);
    return { ok: true };
  }
  if (c.max_own && (W.bag[c.gives] || 0) >= c.max_own) return { ok: false, msg: 'มีของชิ้นนี้แล้ว' };
  if (W.gold < c.price) return { ok: false, msg: 'ทองไม่พอ' };
  W.gold -= c.price;
  W.bag[c.gives] = (W.bag[c.gives] || 0) + c.qty;
  saveDemo();
  return { ok: true };
}

/** แลกค่าขนมเป็นทอง → { ok, gold, msg } */
export async function exchange(treats) {
  if (W.mode === 'server') {
    const { data, error } = await callRpc('town_exchange', { p_treats: Math.floor(treats) });
    if (error) return { ok: false, msg: errText(error) };
    applyServer(data);
    return { ok: true, gold: Number(data?.got_gold) || 0 };
  }
  const per = EXCHANGE.treats / EXCHANGE.gold;
  const left = W.today.got - W.today.used;
  const gold = Math.floor(Math.min(treats, left) / per);
  if (gold <= 0) return { ok: false, msg: 'ค่าขนมยังไม่พอแลก' };
  W.today.used += gold * per;
  W.gold += gold;
  saveDemo();
  return { ok: true, gold };
}
