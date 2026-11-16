// src/town/bath.js
// ─────────────────────────────────────────────────────────────
// หน้าพาน้องไปอาบน้ำ — ห้องเลี้ยงน้องในปราสาท (ผู้ใช้ 15 พ.ย. 2026: "วางระบบอาบน้ำ ส่งน้องไปอาบน้ำได้ · ระบบอื่นค่อยเพิ่มทีหลัง")
//
// กด E ที่อ่างอาบน้ำ → การ์ดน้องเรียงกัน (หน้าตาชุดเดียวกับหน้าเทอาหาร feed.js — คลาส fd-*) รูปน้อง ชื่อ หลอดความสะอาด
//   แตะการ์ด → "พาไปอาบน้ำ" = น้องวิ่งจู๊ดไปอ่าง กระโดดลงแช่ ฟองแชมพูฟู สะบัดหัว กระโดดออก สะบัดตัว (home-cats.js callToTub)
//   อาบเสร็จ = นับเป็นการดูแล (cats.js care 'bathe' — EXP/ความสะอาดตามระบบเดิม) · อ่างใช้ได้ทีละตัว
// ยังไม่ใช้ของ (แชมพูหอมในร้าน — ค่อยต่อทีหลัง) · น้องตัวอย่าง (?kits) อาบได้ ไม่บันทึก
// ─────────────────────────────────────────────────────────────
import { needNow, careInfo, catById } from '../cats.js';
import { drawChibi } from '../render/chibi.js';
import { kitLook, tubBusy } from './home-cats.js';
import { wallet, useItem } from './wallet.js';
import { drawItemIcon } from '../render/items.js';

// แชมพูหอมจากร้าน (ผู้ใช้ 16 พ.ย. 2026): เลือกไว้ = ใช้ 1 ขวดตอนกดพาไปอาบ · ฟองหอมหัวใจลอย · ผูกพัน +3 · สะอาดนานขึ้นเท่าตัว (cats.js cleanSlow)
let soap = false;
const soapN = () => wallet().bag.shampoo || 0;
function paintSoap() {
  const n = soapN(), b = $('bathSoap');
  if (n <= 0) soap = false;
  b.disabled = n <= 0;
  b.classList.toggle('on', soap);
  b.setAttribute('aria-pressed', String(soap));
  $('bathSoapN').textContent = n > 0 ? '×' + n : 'หมด';
  b.title = n > 0 ? '' : 'ซื้อแชมพูหอมได้ที่ร้านในเมือง หมวดยา & ดูแล';
}

const $ = (id) => document.getElementById(id);
// สีการ์ด (ฟ้า-ลาเวนเดอร์ โทนน้ำ) — ตัวแปรเดียวกับการ์ดชามในหน้าเทอาหาร
const CARD = [['#D6ECFB', '#8FBBDC'], ['#E4DAFA', '#A587D8'], ['#D3F1EE', '#6FC4B8'], ['#FBE0EE', '#E58AB2'], ['#FFF1CF', '#E9B867']];
let O = null, sel = -1;

function sharp(cv, w, h, draw) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  draw(g);
}
function slot(k) {
  const real = k.cat.demoLv ? null : catById(k.cat.id);
  const clean = real ? Math.round(needNow(real, 'clean')) : 50;
  return { k, real, clean, wants: real ? careInfo(real, 'bathe').wants : true, busy: k.bathing || k.wantBath };
}

function paint() {
  const row = $('bathCats');
  row.replaceChildren();
  const busy = tubBusy(O.kits);
  O.kits.forEach((k, i) => {
    const s = slot(k);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fd-bowl';
    b.style.setProperty('--bc', CARD[i % 5][0]);
    b.style.setProperty('--bd', CARD[i % 5][1]);
    if (i === sel) b.classList.add('on');
    const cv = document.createElement('canvas'); cv.className = 'fd-cat';
    const nm = document.createElement('b'); nm.textContent = k.name;
    const bar = document.createElement('span'); bar.className = 'fd-bar';
    const fill = document.createElement('i'); fill.style.width = s.clean + '%'; fill.classList.toggle('low', s.clean < 45);
    bar.append(fill);
    const tag = document.createElement('small'); tag.className = 'fd-tag';
    if (s.busy) { tag.textContent = 'กำลังอาบน้ำ'; tag.classList.add('ok'); }
    else if (s.clean < 45) { tag.textContent = 'ตัวมอมแล้ว!'; tag.classList.add('hungry'); }
    else tag.textContent = 'สะอาด ' + s.clean + '%';
    b.append(cv, nm, bar, tag);
    b.setAttribute('aria-pressed', String(i === sel));
    b.setAttribute('aria-label', `${k.name} · ${tag.textContent}`);
    b.addEventListener('click', () => { sel = i; O.sfx?.('tick'); paint(); });
    sharp(cv, 64, 64, (g) => drawChibi(g, 32, 61, 0.165, { view: 'sit', t: 0, act: 'idle', look: kitLook(k.cat) }));
    row.appendChild(b);
  });
  const k = O.kits[sel], go = $('bathGo'), hint = $('bathHint');
  let msg = '', ok = false;
  if (!k) msg = O.kits.length ? 'แตะน้องที่จะพาไปอาบน้ำก่อนนะ' : 'ยังไม่มีน้องในห้องนี้';
  else if (busy) msg = 'อ่างไม่ว่าง รอน้องที่อาบอยู่อาบเสร็จก่อนนะ';
  else {
    ok = true;
    const s = slot(k);
    msg = soap ? `พา${k.name}ไปอาบด้วยแชมพูหอม (ใช้ 1 ขวด)` : `พา${k.name}ไปแช่น้ำอุ่น ฟองแชมพูฟู ๆ`;
    if (s.real && !s.wants) msg += ' · ยังสะอาดอยู่ ไม่ได้ EXP';
  }
  hint.textContent = msg;
  go.disabled = !ok;
  paintSoap();
}

let going = false;
async function doBathe() {
  const k = O.kits[sel];
  if (!k || tubBusy(O.kits) || going) return;
  const withSoap = soap && soapN() > 0;
  if (withSoap) {   // หักแชมพูก่อน (เซิร์ฟเวอร์ตัดสิน) — หักไม่ได้ = ไม่พาไปอาบ ผู้เล่นเลือกใหม่ได้
    going = true;
    const r = await useItem('shampoo');
    going = false;
    if (!r.ok) { O.toast(r.msg || 'ใช้แชมพูไม่ได้'); paint(); return; }
  }
  if (!O.onBathe(k.cat.id, { shampoo: withSoap })) { O.toast('อ่างไม่ว่าง ลองใหม่อีกทีนะ'); paint(); return; }
  O.sfx?.('pop');
  closeBath();
  O.toast(withSoap ? `${k.name}ได้อาบแชมพูหอม ไปดูที่อ่างได้เลย` : `${k.name}วิ่งไปอาบน้ำแล้ว ไปดูที่อ่างได้เลย`);
}

/** เปิดหน้าพาไปอาบน้ำ · opts: { kits, toast, sfx, onBathe(catId) → true/false, onClose } */
export function openBath(opts) {
  O = opts;
  // เลือกตัวที่มอมที่สุดไว้ให้
  const order = O.kits.map((k, i) => ({ i, c: slot(k).clean })).sort((a, b) => a.c - b.c);
  sel = order.length ? order[0].i : -1;
  $('bathSub').textContent = O.kits.length
    ? 'เลือกน้องที่จะพาไปอาบน้ำ น้องจะวิ่งไปกระโดดลงอ่างเอง (อ่างใช้ได้ทีละตัว)'
    : 'ยังไม่มีน้องในห้องนี้ ไปเปิดตู้กาช่าหรือรับเลี้ยงน้องที่หน้าแรกของเกมก่อนนะ';
  paint();
  $('bathOv').classList.remove('hidden');
}
export function closeBath() {
  if ($('bathOv').classList.contains('hidden')) return false;
  $('bathOv').classList.add('hidden');
  O?.onClose?.();
  return true;
}

$('bathGo').addEventListener('click', doBathe);
$('bathSoap').addEventListener('click', () => { if (soapN() <= 0) return; soap = !soap; O?.sfx?.('pop'); paint(); });
{
  const cv = $('bathSoapIco'), dpr = Math.min(3, window.devicePixelRatio || 1);
  cv.width = 40 * dpr; cv.height = 40 * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); drawItemIcon(g, 'shampoo');
}
$('bathX').addEventListener('click', closeBath);
$('bathOv').addEventListener('click', (e) => { if (e.target === $('bathOv')) closeBath(); });
