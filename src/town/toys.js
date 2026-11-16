// src/town/toys.js
// ─────────────────────────────────────────────────────────────
// หีบของเล่น ห้องเลี้ยงน้อง (ผู้ใช้ 16 พ.ย. 2026: "ใช้ของจากกระเป๋า — ของเล่น" · แต่ละชิ้นเล่นต่างกัน)
//
// กด E ที่หีบของเล่น → การ์ดของเล่น 3 ชิ้น (หน้าตาชุดเดียวกับเมนูของกิน feed.js — คลาส fd-*)
//   ไม้ตกแมว · บอลกระดิ่ง · หนูของเล่น — ซื้อครั้งเดียวเล่นได้ตลอด (ไม่หักของ) · ยังไม่มี = บอกว่าซื้อได้ที่ร้านของเล่นในเมือง
//   แตะการ์ด → "เล่นเลย" = น้องที่ว่างมาเล่นด้วย ~15 วิ (home-cats.js startToy) · เล่นจบนับเป็นการดูแลแบบเล่น
// มีของ = ในกระเป๋าเมือง (wallet bag) หรือของเล่นเดิมของห้องแมวในเกม (cats.js ownsToy)
// ─────────────────────────────────────────────────────────────
import { ownsToy } from '../cats.js';
import { drawItemIcon } from '../render/items.js';
import { wallet } from './wallet.js';
import { toyNow } from './home-cats.js';

const $ = (id) => document.getElementById(id);
const TOYS = [
  { id: 'feather', name: 'ไม้ตกแมว', how: 'โบกขนนก น้องกระโดดตะปบ' },
  { id: 'ball', name: 'บอลกระดิ่ง', how: 'กลิ้งบอล น้องวิ่งไล่เขี่ย' },
  { id: 'mouse', name: 'หนูของเล่น', how: 'หนูวิ่งวุ่น น้องย่องตะครุบ' },
];
let O = null, sel = null;
const owned = (id) => (wallet().bag[id] || 0) > 0 || ownsToy(id);

function paint() {
  const grid = $('toyList');
  grid.replaceChildren();
  for (const t of TOYS) {
    const has = owned(t.id);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fd-food';
    b.disabled = !has;
    if (sel === t.id) b.classList.add('on');
    const ic = document.createElement('canvas'); ic.className = 'fd-ico';
    const nm = document.createElement('b'); nm.textContent = t.name;
    const hw = document.createElement('small'); hw.className = 'fd-aff'; hw.textContent = has ? t.how : 'ยังไม่มี · ซื้อที่ร้านของเล่น';
    b.append(ic, nm, hw);
    b.setAttribute('aria-pressed', String(sel === t.id));
    b.addEventListener('click', () => { sel = t.id; O.sfx?.('pop'); paint(); });
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    ic.width = 40 * dpr; ic.height = 40 * dpr;
    const g = ic.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); drawItemIcon(g, t.id);
    grid.appendChild(b);
  }
  const none = !TOYS.some((t) => owned(t.id));
  $('toyNone').classList.toggle('hidden', !none);
  const go = $('toyGo'), hint = $('toyHint');
  const t = TOYS.find((x) => x.id === sel);
  if (toyNow()) { hint.textContent = 'กำลังเล่นอยู่ รอรอบนี้จบก่อนนะ'; go.disabled = true; return; }
  if (!O.kits.length) { hint.textContent = 'ยังไม่มีน้องในห้องนี้'; go.disabled = true; return; }
  if (!t || !owned(t.id)) { hint.textContent = none ? 'ไปซื้อของเล่นที่ร้านของเล่นในเมืองก่อนนะ' : 'แตะของเล่นที่จะเล่นก่อนนะ'; go.disabled = true; return; }
  hint.textContent = `เล่น${t.name}กับน้อง ๆ · น้องที่ว่างอยู่จะวิ่งมาเล่นด้วย`;
  go.disabled = false;
}

function doPlay() {
  if (!sel || !owned(sel) || toyNow()) return;
  const n = O.onPlay(sel);
  O.sfx?.('pop');
  closeToys();
  const t = TOYS.find((x) => x.id === sel);
  O.toast(n > 0 ? `หยิบ${t.name}ออกมาแล้ว น้อง ${n} ตัววิ่งมาเล่น!` : `หยิบ${t.name}ออกมาแล้ว แต่น้องยังติดธุระอยู่ ลองใหม่ทีหลังนะ`);
}

/** เปิดหีบของเล่น · opts: { kits, toast, sfx, onPlay(toyId) → จำนวนน้องที่มาเล่น, onClose } */
export function openToys(opts) {
  O = opts;
  if (!sel || !owned(sel)) sel = (TOYS.find((t) => owned(t.id)) || {}).id || null;
  paint();
  $('toyOv').classList.remove('hidden');
}
export function closeToys() {
  if ($('toyOv').classList.contains('hidden')) return false;
  $('toyOv').classList.add('hidden');
  O?.onClose?.();
  return true;
}

$('toyGo').addEventListener('click', doPlay);
$('toyX').addEventListener('click', closeToys);
$('toyOv').addEventListener('click', (e) => { if (e.target === $('toyOv')) closeToys(); });
