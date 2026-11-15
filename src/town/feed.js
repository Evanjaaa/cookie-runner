// src/town/feed.js
// ─────────────────────────────────────────────────────────────
// หน้าเทอาหาร — ห้องเลี้ยงน้องในปราสาท (ผู้ใช้ 15 พ.ย. 2026: "กด E ให้อาหาร → หน้าใหม่ เลือกอาหาร เลือกชาม
//   ชามล็อกไว้เลยว่าเป็นของน้องตัวไหน · ห้าชามเรียงกัน โชว์ว่าน้องตัวนี้เป็นของชามนี้ · น่ารัก เข้าใจง่าย")
//
// หน้าตา: ชาม 5 ใบเรียงกัน (สีเดียวกับชามในห้อง — home.js BOWL_COLS) แต่ละใบมีรูปน้องเจ้าของ + ชื่อ + หลอดอิ่ม
//   ล่าง = ถาดเมนู (ของกินในกระเป๋า: ข้าวเม็ด / ปลาทู / แซลมอน — ซื้อที่ร้านแลกของกินในเมือง) · ปุ่มเทอาหาร
// ขั้นตอน: แตะชาม → แตะเมนู → เทอาหาร = ของในกระเป๋า −1 (wallet.useItem) · นับเป็นการให้อาหาร (cats.js pourBowl)
//   อาหารค้างในชามในห้อง น้องเจ้าของวิ่งมากิน (home-cats.js callToBowl / drawBowlFood)
// น้องตัวอย่าง (?kits) ไม่บันทึกอะไร — เทได้ ดูน้องมากินได้ (ของในกระเป๋ายังหักตามโหมด)
// ─────────────────────────────────────────────────────────────
import { BOWL_MAX, FOODS, needNow, careInfo, expLeftToday, pourBowl, catById } from '../cats.js';
import { SHOP_ITEMS } from '../shop.js';
import { wallet, useItem } from './wallet.js';
import { drawItemIcon } from '../render/items.js';
import { drawChibi } from '../render/chibi.js';
import { BOWL_COLS, BOWL_TOP, bowlArtAt } from './home.js';
import { kitLook, kitDish, drawFoodMound } from './home-cats.js';

const $ = (id) => document.getElementById(id);
const FOOD_IDS = ['kibble', 'fish', 'salmon'];
const SHOP_FOOD = Object.fromEntries((SHOP_ITEMS.food || []).filter((it) => !it.pack).map((it) => [it.id, it]));
const foodInfo = (id) => ({ id, name: SHOP_FOOD[id]?.name || FOODS.find((f) => f.id === id)?.name || id, aff: FOODS.find((f) => f.id === id)?.aff || 1 });

let O = null;          // { kits, toast, sfx, onPour, onClose }
let sel = -1, food = null, busy = false;

/** ผ้าใบคมตามจอ (วาดที่ขนาด CSS × ความละเอียดจอ) */
function sharp(cv, w, h, draw) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  draw(g);
}
/** ชามใบที่ i (รูปเดียวกับชามหูแมวในห้อง — home.js bowlArtAt) + อาหารที่ค้างอยู่ */
function paintBowl(cv, i, dishFood) {
  sharp(cv, 72, 40, (g) => {
    g.save(); g.translate(36, 37); g.scale(1.45, 1.45);
    bowlArtAt(g, 0, 0, i);
    if (dishFood) drawFoodMound(g, 0, -BOWL_TOP, dishFood, 1, 30);
    g.restore();
  });
}
/** รูปน้องเจ้าของชาม (ท่านั่ง สีตามสายพันธุ์) */
function paintCat(cv, k) {
  sharp(cv, 64, 64, (g) => drawChibi(g, 32, 61, 0.165, { view: 'sit', t: 0, act: 'idle', look: kitLook(k.cat) }));
}

/** สถานะชามใบที่ i: เจ้าของ (kit) · ค่าอิ่ม · อาหารค้าง */
function slotOf(i) {
  const k = O.kits.find((q) => q.bowl === i) || null;
  if (!k) return { i, k: null };
  const real = k.cat.demoLv ? null : catById(k.cat.id);
  const full = real ? Math.round(needNow(real, 'food')) : 55;
  const dish = kitDish(k);
  const wants = real ? careInfo(real, 'feed').wants : true;
  const expLeft = real ? expLeftToday(real) : 0;
  return { i, k, real, full, dish, wants, expLeft };
}

/** ชามที่ควรเทต่อ = น้องหิวที่สุดที่ชามยังว่าง (ไม่มี = null) */
function hungriest() {
  return [...Array(BOWL_MAX).keys()].map(slotOf).filter((q) => q.k && !q.dish).sort((a, b) => a.full - b.full)[0] || null;
}

function paint() {
  const W = wallet();
  // ── ชาม 5 ใบ ──
  const row = $('feedBowls');
  row.replaceChildren();
  const hasBowlInRoom = (i) => O.bowlCount > i;
  for (let i = 0; i < BOWL_MAX; i++) {
    const s = slotOf(i);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fd-bowl';
    b.style.setProperty('--bc', BOWL_COLS[i % 5][0]);
    b.style.setProperty('--bd', BOWL_COLS[i % 5][1]);
    const num = document.createElement('i'); num.className = 'fd-num'; num.textContent = i + 1;
    if (!s.k) {
      b.classList.add('empty');
      b.disabled = true;
      const sil = document.createElement('span'); sil.className = 'fd-ghost'; sil.textContent = '?';
      const nm = document.createElement('b'); nm.textContent = hasBowlInRoom(i) ? 'ชามว่าง' : 'ยังไม่มีชาม';
      const sm = document.createElement('small'); sm.textContent = hasBowlInRoom(i) ? 'รอน้องตัวใหม่' : 'ซื้อชามเพิ่มที่ร้าน';
      const bw = document.createElement('canvas'); bw.className = 'fd-dish';
      b.append(num, sil, nm, sm, bw);
      paintBowl(bw, i, null);
      row.appendChild(b);
      continue;
    }
    if (i === sel) b.classList.add('on');
    if (s.dish) b.classList.add('served');
    const cv = document.createElement('canvas'); cv.className = 'fd-cat';
    const nm = document.createElement('b'); nm.textContent = s.k.name;
    const bar = document.createElement('span'); bar.className = 'fd-bar';
    const fill = document.createElement('i'); fill.style.width = s.full + '%';
    fill.classList.toggle('low', s.full < 45);
    bar.append(fill);
    const tag = document.createElement('small'); tag.className = 'fd-tag';
    if (s.dish) { tag.textContent = 'มีอาหารในชาม'; tag.classList.add('ok'); }
    else if (s.full < 45) { tag.textContent = 'หิวแล้ว!'; tag.classList.add('hungry'); }
    else tag.textContent = 'อิ่ม ' + s.full + '%';
    const bw = document.createElement('canvas'); bw.className = 'fd-dish';
    const own = document.createElement('small'); own.className = 'fd-own'; own.textContent = 'ชามของ' + s.k.name;
    b.append(num, cv, nm, bar, tag, bw, own);
    b.setAttribute('aria-label', `ชามที่ ${i + 1} ของ${s.k.name} · ${tag.textContent}`);
    b.setAttribute('aria-pressed', String(i === sel));
    b.addEventListener('click', () => { if (busy) return; sel = i; O.sfx?.('tick'); paint(); });
    paintCat(cv, s.k);
    paintBowl(bw, i, s.dish?.food || null);
    row.appendChild(b);
  }
  // ── เมนู (ของกินในกระเป๋า) ──
  const list = $('feedFoods');
  list.replaceChildren();
  for (const id of FOOD_IDS) {
    const it = foodInfo(id), n = W.bag[id] || 0;
    const f = document.createElement('button');
    f.type = 'button';
    f.className = 'fd-food';
    f.disabled = n <= 0;
    if (food === id && n > 0) f.classList.add('on');
    const ic = document.createElement('canvas'); ic.className = 'fd-ico';
    const nm = document.createElement('b'); nm.textContent = it.name;
    const hs = document.createElement('small'); hs.className = 'fd-aff'; hs.textContent = '♥'.repeat(it.aff) + ' ผูกพัน';
    const q = document.createElement('span'); q.className = 'fd-qty'; q.textContent = n > 0 ? '×' + n : 'หมด';
    f.append(ic, nm, hs, q);
    f.setAttribute('aria-pressed', String(food === id));
    f.addEventListener('click', () => { if (busy) return; food = id; O.sfx?.('pop'); paint(); });
    sharp(ic, 40, 40, (g) => drawItemIcon(g, id));
    list.appendChild(f);
  }
  const noFood = FOOD_IDS.every((id) => !(W.bag[id] > 0));
  $('feedNoFood').classList.toggle('hidden', !noFood);
  // ── สรุป + ปุ่มเท ──
  const s = sel >= 0 ? slotOf(sel) : null;
  const pour = $('feedPour'), hint = $('feedHint');
  let msg = '', ok = false;
  if (!s?.k) msg = 'แตะชามของน้องที่จะเทอาหารก่อนนะ';
  else if (s.dish) msg = `ชามของ${s.k.name}ยังมีอาหารอยู่ รอน้องกินให้หมดก่อน`;
  else if (!food || !(W.bag[food] > 0)) msg = `เลือกเมนูให้${s.k.name}เลย`;
  else {
    ok = true;
    const it = foodInfo(food);
    msg = `เท${it.name}ลงชามที่ ${sel + 1} ให้${s.k.name}`;
    if (s.real && !s.wants) msg += ' · ยังอิ่มอยู่ ไม่ได้ EXP';
    else if (s.real && s.expLeft <= 0) msg += ' · วันนี้โตเต็มที่แล้ว';
  }
  hint.textContent = msg;
  pour.disabled = !ok || busy;
}

async function doPour() {
  const s = sel >= 0 ? slotOf(sel) : null;
  if (!s?.k || s.dish || !food || busy) return;
  busy = true; paint();
  const it = foodInfo(food);
  const res = await useItem(food);
  if (!res.ok) { busy = false; O.toast(res.msg || 'เทอาหารไม่ได้'); paint(); return; }
  let txt = 'อร่อย!';
  if (s.real) {
    const r = pourBowl(s.k.cat.id, food, it.aff);
    txt = r?.exp > 0 ? `+${r.exp} EXP` : 'ดีใจ!';
  }
  O.onPour?.(s.k.cat.id, food);
  O.sfx?.('nom');
  // อาหารร่วงลงชาม + ตัวเลขลอยบนชามใบนั้น
  const card = $('feedBowls').children[sel];
  if (card) {
    const drop = document.createElement('span'); drop.className = 'fd-drop'; drop.setAttribute('aria-hidden', 'true');
    const dc = document.createElement('canvas'); drop.append(dc); sharp(dc, 34, 34, (g) => { g.scale(0.85, 0.85); drawItemIcon(g, food); });
    const fl = document.createElement('span'); fl.className = 'fd-float'; fl.textContent = txt;
    card.append(drop, fl);
    await new Promise((r) => setTimeout(r, 650));
    O.sfx?.('yum');
  }
  busy = false;
  // เลือกชามใบถัดไปให้เลย = ตัวที่หิวที่สุดที่ชามยังว่าง · เมนูที่เลือกหมด = เปลี่ยนเป็นเมนูที่ยังมี (เทต่อได้ไว ๆ)
  const next = hungriest();
  if (next) sel = next.i;
  if (!(wallet().bag[food] > 0)) food = FOOD_IDS.find((id) => wallet().bag[id] > 0) || null;
  paint();
  O.toast(`เท${it.name}ให้${s.k.name}แล้ว น้องกำลังมากินนะ`);
}

/** เปิดหน้าเทอาหาร · opts: { kits, bowlCount, toast, sfx, onPour(catId, food), onClose } */
export function openFeed(opts) {
  O = opts;
  busy = false;
  // เลือกชามแรกที่หิวไว้ให้ · เมนู = ของที่มีในกระเป๋าชิ้นแรก
  const slots = [...Array(BOWL_MAX).keys()].map(slotOf).filter((q) => q.k);
  sel = (hungriest() || slots[0] || { i: -1 }).i;
  const W = wallet();
  if (!(W.bag[food] > 0)) food = FOOD_IDS.find((id) => W.bag[id] > 0) || null;
  $('feedSub').textContent = slots.length
    ? 'แตะชามของน้อง เลือกเมนูวันนี้ แล้วกดเทอาหาร — ชามแต่ละใบเป็นของน้องตัวเดียว'
    : 'ยังไม่มีน้องในห้องนี้ ไปเปิดตู้กาช่าหรือรับเลี้ยงน้องที่หน้าแรกของเกมก่อนนะ';
  paint();
  $('feedOv').classList.remove('hidden');
}
export function closeFeed() {
  if ($('feedOv').classList.contains('hidden')) return false;
  $('feedOv').classList.add('hidden');
  O?.onClose?.();
  return true;
}
export const feedOpen = () => !$('feedOv').classList.contains('hidden');

$('feedPour').addEventListener('click', doPour);
$('feedX').addEventListener('click', closeFeed);
$('feedOv').addEventListener('click', (e) => { if (e.target === $('feedOv')) closeFeed(); });
