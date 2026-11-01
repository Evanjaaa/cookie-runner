// src/town/interior-art.js
// ─────────────────────────────────────────────────────────────
// ภาพฉากในร้านทั้ง 5 ร้าน (ผู้ใช้ 1 พ.ย.: อัปเกรดในร้านให้แต่ละร้านมีเอกลักษณ์ของตัวเอง)
//
//   food      ร้านขนมพาสเทล — กันสาดลายทาง โคมห้อย ชั้นขนมปัง/คัพเค้ก ตู้กระจกโชว์ขนม
//   care      ร้านปรุงยาเวทมนตร์ — หน้าต่างโค้งคืนพระจันทร์ สมุนไพรห้อย ขวดยาเรืองแสง ตู้ลิ้นชักสมุนไพร หม้อยา ลูกแก้ว
//   home      โรงช่าง — ผนังอิฐ บอร์ดแขวนเครื่องมือ พิมพ์เขียวบ้านแมว ชั้นกระป๋องสี โต๊ะช่างมีปากกาจับ โคมไฟแขน
//   toy       ร้านของเล่นสีลูกกวาด — ธงราว รุ้งบนผนัง ชั้นช่องตุ๊กตา เคาน์เตอร์กล่องของขวัญ ตู้กาชาปอง กังหันลม
//   exchange  ห้องสมบัติหรู — ม่านกำมะหยี่ลายดามัสก์ทอง เชิงเทียนติดผนัง ถ้วย/มงกุฎ เคาน์เตอร์หินอ่อนขลิบทอง หีบสมบัติ
//
// แต่ละร้าน = { back, front, live }
//   back(c, vw, K)    ผนัง ชั้นวาง ป้าย (ภาพนิ่ง — วาดครั้งเดียวเก็บแคช) · K = กึ่งกลางเจ้าของร้าน
//   front(c, K)       เคาน์เตอร์ + ของบนเคาน์เตอร์ (ภาพนิ่ง — วาดทับครึ่งล่างเจ้าของร้าน)
//   live(c, vw, K, t) ของขยับทุกเฟรม (น้อยชิ้น)
//
// พื้นที่ที่เห็นจริง: ซ้ายของแผงสินค้า ≈ K±175 (มือถือแนวนอนฝั่งขวาเหลือ ≈ K+120) — ของเด่นวางในช่วงนี้
// ของบนชั้นวางยาวไปทั้งผนัง (จอกว้าง/จอแนวตั้งเห็นส่วนที่เหลือ)
// ─────────────────────────────────────────────────────────────
import { H, lg, star, heart, ears, catFace, gear, giftBox, coin } from './world.js';
import { drawItemIcon } from '../render/items.js';

const TAU = Math.PI * 2;
export const FLOOR = 336;     // ขอบหลังของพื้น
export const COUNTER = 292;   // ขอบบนเคาน์เตอร์
const CW = 300;               // ความกว้างเคาน์เตอร์

// ── ตัวช่วย ──────────────────────────────────────────────────
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function paint(c, fill, line, w = 1.3) {
  c.fillStyle = fill; c.fill();
  if (line) { c.strokeStyle = line; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
}
function glowAt(c, x, y, r, rgb, a = 0.5) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
function blob(c, x, y, rx, ry, a = 0.16) { c.fillStyle = `rgba(30,10,30,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
/** แผ่นชั้นวาง: ผิวบน + หน้าแผ่น + เงาบนผนัง (ของวางที่ y − 3) */
function plank(c, x0, x1, y, top, front) {
  c.fillStyle = 'rgba(30,10,20,.16)'; c.fillRect(x0, y + 7, x1 - x0, 6);
  c.fillStyle = front; c.fillRect(x0, y, x1 - x0, 7);
  c.fillStyle = top; c.fillRect(x0, y - 3, x1 - x0, 3);
  c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(x0, y, x1 - x0, 1.2);
}
/** ชั้นวางยาวตลอดผนัง + ของ (items = ตัววาดของ (c, x, y, i) วนตามลำดับ) */
function shelfRow(c, vw, y, top, front, bracket, items, row) {
  plank(c, 0, vw, y, top, front);
  if (bracket) for (let x = 30; x < vw; x += 140) { c.fillStyle = bracket; c.beginPath(); c.moveTo(x, y + 7); c.lineTo(x + 3, y + 7); c.lineTo(x + 3, y + 20); c.closePath(); c.fill(); c.fillRect(x - 1, y + 7, 4, 3); }
  let i = row * 3;
  for (let x = 26 + (row % 2) * 24; x < vw - 8; x += 50, i++) items[i % items.length](c, x, y - 3, i);
}
/** พื้นห้อง (ส่วนใหญ่อยู่หลังเคาน์เตอร์ — เห็นริมจอ) */
function floorTiles(c, vw, a, b, checker) {
  c.fillStyle = a; c.fillRect(0, FLOOR, vw, H - FLOOR);
  if (checker) {
    c.fillStyle = b;
    for (let y = FLOOR, r = 0; y < H; y += 21, r++) for (let x = (r % 2) * 28; x < vw; x += 56) c.fillRect(x, y, 28, 21);
  } else {
    c.fillStyle = b;
    for (let x = 0; x < vw; x += 56) c.fillRect(x, FLOOR, 2, H - FLOOR);
  }
  c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(0, FLOOR, vw, 4);
}
/** สายแขวนป้ายสองเส้นจากเพดาน */
function hangers(c, x, y, half, col = 'rgba(90,60,40,.7)') {
  c.strokeStyle = col; c.lineWidth = 1.4;
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x + d * half * 0.6, 0); c.lineTo(x + d * half, y); c.stroke(); }
}
/** ประกายสี่แฉก (ของวิบวับ) */
function twinkle(c, x, y, r, col, a) {
  c.globalAlpha = a; c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
  c.fill();
  c.globalAlpha = 1;
}
/** ฝุ่นแสงลอยช้า ๆ ทั่วร้าน (ทุกร้าน — สีตามร้าน) */
function motes(c, vw, t, col, n = 7) {
  for (let i = 0; i < n; i++) {
    const a = 0.22 + 0.3 * Math.sin(t * 0.05 + i * 1.7);
    twinkle(c, (i * 173 + t * 0.15) % vw, 70 + ((i * 97) % 190), 3.2, col, Math.max(0, a));
  }
}
const OUT = 'rgba(70,35,30,.55)';   // เส้นขอบของชิ้นเล็ก (นุ่ม ไม่ดำ)

// ══ ร้านของกิน: ร้านขนมพาสเทล ═════════════════════════════════
function cupcake(c, x, y, s, cream, cup = '#FF9FBF') {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.moveTo(-8, -10); c.lineTo(8, -10); c.lineTo(6, 0); c.lineTo(-6, 0); c.closePath(); paint(c, cup, OUT, 1);
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1;
  for (const u of [-4, 0, 4]) { c.beginPath(); c.moveTo(u, -9); c.lineTo(u * 0.8, -1); c.stroke(); }
  c.beginPath(); c.moveTo(-10, -10); c.quadraticCurveTo(-11, -17, -4, -18); c.quadraticCurveTo(-2, -24, 3, -22); c.quadraticCurveTo(10, -21, 10, -10); c.closePath(); paint(c, cream, OUT, 1);
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-3, -17, 3, 1.6, -0.3, 0, TAU); c.fill();
  c.fillStyle = '#E8334A'; c.beginPath(); c.arc(1, -24, 2.6, 0, TAU); c.fill();
  c.restore();
}
function croissant(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const seg = [[-11, -4, 5], [-5, -7, 6.5], [2, -8, 7], [8, -6, 5.5], [12, -3, 4]];
  for (const [sx, sy, r] of seg) { c.beginPath(); c.ellipse(sx, sy, r, r * 0.85, 0, 0, TAU); paint(c, '#E9A752', OUT, 1); }
  c.fillStyle = 'rgba(255,240,200,.55)';
  for (const [sx, sy, r] of seg) { c.beginPath(); c.ellipse(sx - 1, sy - r * 0.35, r * 0.45, r * 0.25, 0, 0, TAU); c.fill(); }
  c.restore();
}
function donut(c, x, y, glaze) {
  c.beginPath(); c.ellipse(x, y - 6, 11, 7, 0, 0, TAU); paint(c, '#E2A45E', OUT, 1);
  c.beginPath(); c.ellipse(x, y - 7.5, 9.5, 5.5, 0, 0, TAU); c.fillStyle = glaze; c.fill();
  c.fillStyle = '#E2A45E'; c.beginPath(); c.ellipse(x, y - 7.5, 3, 1.8, 0, 0, TAU); c.fill();
  const sp = ['#FFFFFF', '#8EE0C2', '#FFD45A', '#9FD3FF'];
  for (let i = 0; i < 7; i++) { const a = i * 0.9; c.fillStyle = sp[i % 4]; c.fillRect(x + Math.cos(a) * 6.5 - 1, y - 7.5 + Math.sin(a) * 3.5 - 0.5, 2.2, 1.1); }
}
function macaron(c, x, y, col, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.ellipse(0, -3, 7, 3, 0, 0, TAU); paint(c, col, OUT, 0.9);
  c.fillStyle = '#FFF6E8'; c.fillRect(-6, -7, 12, 2);
  c.beginPath(); c.ellipse(0, -8, 7, 3, 0, 0, TAU); paint(c, col, OUT, 0.9);
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-2, -9, 2.5, 1, 0, 0, TAU); c.fill();
  c.restore();
}
function cakeSlice(c, x, y) {
  c.beginPath(); c.moveTo(x - 13, y); c.lineTo(x + 13, y); c.lineTo(x + 13, y - 15); c.lineTo(x - 13, y - 19); c.closePath(); paint(c, '#F7D894', OUT, 1);
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(x - 13, y - 8); c.lineTo(x + 13, y - 6); c.lineTo(x + 13, y - 9); c.lineTo(x - 13, y - 11); c.closePath(); c.fill();
  c.fillStyle = '#F2566A'; for (const u of [-8, 0, 8]) { c.beginPath(); c.arc(x + u, y - 8 + u * -0.08, 1.8, 0, TAU); c.fill(); }
  c.beginPath(); c.moveTo(x - 14, y - 19); c.quadraticCurveTo(x, y - 22, x + 14, y - 15); c.lineTo(x + 14, y - 13); c.quadraticCurveTo(x, y - 18, x - 14, y - 16); c.closePath(); c.fillStyle = '#FFFFFF'; c.fill();
  c.beginPath(); c.moveTo(x - 3, y - 19); c.quadraticCurveTo(x - 4, y - 27, x + 1, y - 27); c.quadraticCurveTo(x + 5, y - 26, x + 3, y - 19); c.closePath(); paint(c, '#F2566A', OUT, 0.9);
  c.fillStyle = '#5DBB63'; c.beginPath(); c.ellipse(x, y - 27.5, 2.5, 1, 0, 0, TAU); c.fill();
}
const FOOD_SHELF = [
  // ตะกร้าขนมปัง: บาแก็ตสองแท่ง + ขนมปังกลม
  (c, x, y) => {
    c.save(); c.translate(x, y);
    for (const [a, dx] of [[-0.35, -3], [0.3, 4]]) { c.save(); c.translate(dx, -12); c.rotate(a); rr(c, -3.5, -14, 7, 24, 3.5); paint(c, '#E7A65A', OUT, 1); c.strokeStyle = 'rgba(255,240,200,.8)'; c.lineWidth = 1; for (const v of [-8, -2, 4]) { c.beginPath(); c.moveTo(-2, v); c.lineTo(2, v - 2); c.stroke(); } c.restore(); }
    c.beginPath(); c.ellipse(-8, -10, 7, 5.5, 0, 0, TAU); paint(c, '#D98E44', OUT, 1);
    c.beginPath(); c.moveTo(-15, -10); c.lineTo(15, -10); c.lineTo(12, 0); c.lineTo(-12, 0); c.closePath(); paint(c, '#C98A4E', OUT, 1);
    c.strokeStyle = 'rgba(120,70,30,.45)'; c.lineWidth = 1;
    for (const v of [-7, -3.5]) { c.beginPath(); c.moveTo(-14, v); c.lineTo(14, v); c.stroke(); }
    for (let u = -12; u <= 12; u += 4) { c.beginPath(); c.moveTo(u, -10); c.lineTo(u * 0.85, 0); c.stroke(); }
    c.restore();
  },
  // ขาตั้งเค้กสองคัพเค้ก
  (c, x, y) => {
    c.fillStyle = '#FFFFFF'; c.fillRect(x - 1.5, y - 8, 3, 8);
    c.beginPath(); c.ellipse(x, y, 7, 2, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(x, y - 8, 17, 3, 0, 0, TAU); paint(c, '#FFFFFF', 'rgba(200,140,160,.6)', 1);
    cupcake(c, x - 7, y - 9, 0.75, '#FFE0EC');
    cupcake(c, x + 8, y - 9, 0.75, '#FFF3C4', '#8EE0C2');
  },
  // โหลคุกกี้
  (c, x, y) => {
    rr(c, x - 11, y - 24, 22, 24, 6); paint(c, 'rgba(225,245,255,.55)', 'rgba(120,150,170,.6)', 1.1);
    for (const [cx, cy] of [[-5, -5], [4, -6], [-1, -12], [5, -16], [-5, -18]]) { c.beginPath(); c.arc(x + cx, y + cy, 4.2, 0, TAU); paint(c, '#D9A066', OUT, 0.8); c.fillStyle = '#6B3E26'; c.fillRect(x + cx - 1.5, y + cy - 1, 1.6, 1.6); c.fillRect(x + cx + 1, y + cy + 1, 1.4, 1.4); }
    rr(c, x - 12, y - 28, 24, 5, 2.5); paint(c, '#FF9FBF', OUT, 1);
    c.beginPath(); c.arc(x, y - 30, 2.5, 0, TAU); paint(c, '#FF9FBF', OUT, 1);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x - 8, y - 21, 2, 14);
  },
  // ครัวซองต์บนจาน
  (c, x, y) => { c.beginPath(); c.ellipse(x, y - 2, 16, 3, 0, 0, TAU); paint(c, '#FFFFFF', 'rgba(200,140,160,.6)', 1); croissant(c, x, y - 4, 0.95); },
  // หอคอยมาการง
  (c, x, y) => {
    const cols = ['#FFB3C7', '#BFF0D4', '#FFE9A0', '#D9C6FF'];
    const rows = [[-9, 0], [0, 0], [9, 0], [-4.5, -7], [4.5, -7], [0, -14]];
    rows.forEach(([dx, dy], i) => macaron(c, x + dx, y + dy, cols[i % 4], 0.68));
  },
  // ขวดนมฝาชมพู ป้ายหน้าแมว
  (c, x, y) => {
    c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x - 7, y - 16); c.quadraticCurveTo(x - 7, y - 21, x - 4, y - 22); c.lineTo(x - 4, y - 26); c.lineTo(x + 4, y - 26); c.lineTo(x + 4, y - 22); c.quadraticCurveTo(x + 7, y - 21, x + 7, y - 16); c.lineTo(x + 7, y); c.closePath(); paint(c, '#FFFFFF', 'rgba(120,120,140,.6)', 1);
    rr(c, x - 5, y - 30, 10, 5, 2); paint(c, '#FF8FB3', OUT, 0.9);
    c.beginPath(); c.arc(x, y - 9, 4.5, 0, TAU); c.fillStyle = '#FFE0EA'; c.fill();
    ears(c, x, y - 12, 2.6, 2.5, '#FFE0EA', '#FF9FBF');
    c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(x - 5, y - 18, 1.6, 12);
  },
];
function foodBack(c, vw, K) {
  c.fillStyle = lg(c, 0, 0, 0, FLOOR, [[0, '#FFF7EE'], [1, '#FFE8DD']]);
  c.fillRect(0, 0, vw, FLOOR);
  for (let x = 0; x < vw; x += 44) {
    c.fillStyle = 'rgba(255,160,190,.2)'; c.fillRect(x, 0, 20, FLOOR);
    c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(x + 31, 0, 2, FLOOR);
  }
  // บัวผนังไม้ทาสีมิ้นต์ (ล่าง) + ราวขาว
  c.fillStyle = lg(c, 0, 248, 0, FLOOR, [[0, '#CFEFE2'], [1, '#AEDCCB']]); c.fillRect(0, 248, vw, FLOOR - 248);
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2;
  for (let x = 10; x < vw; x += 58) { rr(c, x, 262, 44, 62, 6); c.stroke(); }
  c.fillStyle = '#FFFFFF'; c.fillRect(0, 243, vw, 6);
  c.fillStyle = 'rgba(200,120,140,.25)'; c.fillRect(0, 249, vw, 2);
  floorTiles(c, vw, '#FFF1E6', '#F6D3D3', true);
  // ชั้นวางไม้ครีมสองชั้น
  shelfRow(c, vw, 118, '#F4D2A6', '#D9A066', '#B07440', FOOD_SHELF, 0);
  shelfRow(c, vw, 190, '#F4D2A6', '#D9A066', '#B07440', FOOD_SHELF, 1);
  // โคมห้อยสองดวง
  for (const lx of [K - 128, K + 128]) {
    c.strokeStyle = 'rgba(120,80,60,.7)'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(lx, 30); c.lineTo(lx, 56); c.stroke();
    glowAt(c, lx, 70, 34, '255,230,160', 0.35);
    c.beginPath(); c.moveTo(lx - 15, 70); c.quadraticCurveTo(lx - 14, 54, lx, 54); c.quadraticCurveTo(lx + 14, 54, lx + 15, 70); c.closePath(); paint(c, '#9BDDC8', OUT, 1.2);
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(lx - 6, 61, 3, 5, 0.4, 0, TAU); c.fill();
    c.fillStyle = '#FFF4C2'; c.beginPath(); c.arc(lx, 72, 4.5, 0, TAU); c.fill();
  }
  // กันสาดลายทางขอบหยัก (เงาก่อน แล้วผ้า)
  const aw = 30, ay = 22;
  c.fillStyle = 'rgba(150,60,80,.14)';
  for (let x = 0; x < vw + aw; x += aw) { c.beginPath(); c.arc(x + aw / 2, ay + 4, aw / 2, 0, Math.PI); c.fill(); }
  for (let i = 0, x = 0; x < vw + aw; i++, x += aw) {
    c.fillStyle = i % 2 ? '#FFFFFF' : '#FF9FBF';
    c.fillRect(x, 0, aw, ay);
    c.beginPath(); c.arc(x + aw / 2, ay, aw / 2, 0, Math.PI); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(0, 3, vw, 3);
  c.fillStyle = 'rgba(160,60,90,.18)'; c.fillRect(0, ay - 3, vw, 2);
  // ป้ายร้าน: วงรีครีมขอบชมพู หูแมว + คัพเค้ก
  const sx = K, sy = 56;
  hangers(c, sx, sy - 16, 18);
  ears(c, sx, sy - 16, 16, 9, '#FF9FBF', '#FFE0EA');
  c.beginPath(); c.ellipse(sx, sy + 2, 36, 21, 0, 0, TAU); c.fillStyle = 'rgba(120,40,60,.18)'; c.fill();
  c.beginPath(); c.ellipse(sx, sy, 36, 21, 0, 0, TAU); paint(c, '#FF9FBF');
  c.beginPath(); c.ellipse(sx, sy, 31, 16.5, 0, 0, TAU); paint(c, '#FFF8EE');
  c.strokeStyle = '#FF9FBF'; c.lineWidth = 1; c.setLineDash([2, 3]);
  c.beginPath(); c.ellipse(sx, sy, 27, 13, 0, 0, TAU); c.stroke(); c.setLineDash([]);
  cupcake(c, sx, sy + 9, 0.85, '#FFD0E0');
  for (const d of [-1, 1]) { c.fillStyle = '#FFC94A'; star(c, sx + d * 18, sy - 2, 3.5); c.fill(); }
}
function foodFront(c, K) {
  const x0 = K - CW / 2;
  blob(c, K, H - 4, CW * 0.62, 10, 0.2);
  // ตัวตู้ไม้คาราเมล
  c.fillStyle = lg(c, 0, COUNTER, 0, H, [[0, '#DDA56C'], [1, '#B07440']]);
  c.fillRect(x0, COUNTER, CW, H - COUNTER);
  // ตู้กระจกโชว์ขนม (สองชั้น)
  const gx = x0 + 14, gy = COUNTER + 10, gw = CW - 28, gh = 84;
  rr(c, gx - 5, gy - 5, gw + 10, gh + 10, 9); paint(c, '#FFF6EA');
  rr(c, gx, gy, gw, gh, 6);
  c.fillStyle = lg(c, 0, gy, 0, gy + gh, [[0, '#FFF3F6'], [1, '#FFDCE6']]); c.fill();
  c.save(); rr(c, gx, gy, gw, gh, 6); c.clip();
  glowAt(c, K, gy, 120, '255,255,240', 0.5);
  c.fillStyle = '#FFFFFF'; c.fillRect(gx, gy + 41, gw, 3); c.fillRect(gx, gy + gh - 5, gw, 5);
  c.fillStyle = 'rgba(200,120,150,.25)'; c.fillRect(gx, gy + 44, gw, 2);
  // ชั้นบน: เค้กสตรอว์เบอร์รี่สามชิ้น + มาการง
  for (const u of [0.13, 0.33]) cakeSlice(c, gx + gw * u, gy + 41);
  ['#FFB3C7', '#BFF0D4', '#FFE9A0', '#D9C6FF', '#FFB3C7'].forEach((col, i) => macaron(c, gx + gw * 0.52 + i * 13, gy + 41, col, 0.8));
  cakeSlice(c, gx + gw * 0.88, gy + 41);
  // ชั้นล่าง: ครัวซองต์ โดนัท คัพเค้ก
  croissant(c, gx + gw * 0.12, gy + gh - 5, 1.05);
  donut(c, gx + gw * 0.32, gy + gh - 5, '#FFB3C7');
  donut(c, gx + gw * 0.46, gy + gh - 5, '#8A5634');
  cupcake(c, gx + gw * 0.62, gy + gh - 5, 0.95, '#FFE0EC');
  cupcake(c, gx + gw * 0.75, gy + gh - 5, 0.95, '#E8DAFF', '#FFD45A');
  croissant(c, gx + gw * 0.9, gy + gh - 5, 1.05);
  // แสงสะท้อนบนกระจก
  c.fillStyle = 'rgba(255,255,255,.4)';
  for (const [sx, w] of [[30, 26], [70, 8], [190, 18]]) { c.beginPath(); c.moveTo(gx + sx, gy); c.lineTo(gx + sx + w, gy); c.lineTo(gx + sx + w - 34, gy + gh); c.lineTo(gx + sx - 34, gy + gh); c.closePath(); c.fill(); }
  c.restore();
  c.strokeStyle = 'rgba(176,116,64,.6)'; c.lineWidth = 1.5; rr(c, gx, gy, gw, gh, 6); c.stroke();
  // ฐานล่าง: ระบายครีมขอบหยัก + อุ้งเท้ากลาง
  const by = gy + gh + 8;
  c.fillStyle = '#FFF6EA';
  for (let x = x0; x < x0 + CW; x += 15) { c.beginPath(); c.arc(x + 7.5, by, 7.5, 0, Math.PI); c.fill(); }
  c.fillStyle = '#FF9FBF';
  c.beginPath(); c.ellipse(K, by + 15, 6, 5, 0, 0, TAU); c.fill();
  for (const [dx, dy] of [[-7, -5], [-2.5, -9], [2.5, -9], [7, -5]]) { c.beginPath(); c.arc(K + dx, by + 15 + dy, 2.3, 0, TAU); c.fill(); }
  // ท็อปหินอ่อนชมพู
  rr(c, x0 - 12, COUNTER - 12, CW + 24, 16, 6);
  c.fillStyle = lg(c, 0, COUNTER - 12, 0, COUNTER + 4, [[0, '#FFEFF3'], [1, '#F7C9D6']]); c.fill();
  c.fillStyle = 'rgba(255,255,255,.65)'; c.fillRect(x0 - 6, COUNTER - 10, CW + 12, 2.5);
  // ของบนเคาน์เตอร์: ตะกร้าขนมปังอบใหม่ (มีไอ — live) · เค้กทั้งก้อนบนขาตั้ง
  const ty = COUNTER - 10;
  c.save(); c.translate(K - 112, ty); c.scale(1.45, 1.45); FOOD_SHELF[0](c, 0, 0); c.restore();
  c.fillStyle = '#FFFFFF'; c.fillRect(K + 109, ty - 12, 6, 12);
  c.beginPath(); c.ellipse(K + 112, ty, 11, 3, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(K + 112, ty - 12, 26, 4, 0, 0, TAU); paint(c, '#FFFFFF', 'rgba(200,140,160,.6)', 1);
  rr(c, K + 92, ty - 34, 40, 22, 5); paint(c, '#FFF3E0', OUT, 1.1);
  c.fillStyle = '#FFB3C7'; c.fillRect(K + 92.5, ty - 24, 39, 4);
  c.beginPath(); c.moveTo(K + 91, ty - 33); for (let i = 0; i <= 8; i++) c.quadraticCurveTo(K + 91 + i * 5.25 - 2.6, ty - 27 + (i % 2) * 3, K + 91 + i * 5.25, ty - 33); c.lineTo(K + 133, ty - 36); c.lineTo(K + 91, ty - 36); c.closePath(); c.fillStyle = '#FFFFFF'; c.fill();
  for (const dx of [-12, 0, 12]) { c.beginPath(); c.moveTo(K + 112 + dx - 3, ty - 36); c.quadraticCurveTo(K + 112 + dx - 4, ty - 44, K + 112 + dx, ty - 44); c.quadraticCurveTo(K + 112 + dx + 4, ty - 43, K + 112 + dx + 3, ty - 36); c.closePath(); paint(c, '#F2566A', OUT, 0.9); }
}
function foodLive(c, vw, K, t) {
  // ไอขนมปังอบใหม่
  for (let i = 0; i < 3; i++) {
    const u = (t * 0.008 + i / 3) % 1;
    c.globalAlpha = 0.55 * Math.sin(u * Math.PI);
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 2.2; c.lineCap = 'round';
    const bx = K - 120 + i * 9, by = COUNTER - 50 - u * 30;
    c.beginPath(); c.moveTo(bx, by + 10); c.quadraticCurveTo(bx + 5, by + 5, bx, by); c.quadraticCurveTo(bx - 5, by - 5, bx, by - 10); c.stroke();
  }
  c.globalAlpha = 1;
  motes(c, vw, t, '#FFFFFF');
}

// ══ ร้านขายยา: ร้านปรุงยาเวทมนตร์ ══════════════════════════════
function glassPath(kind) {
  const p = new Path2D();
  if (kind === 'round') { p.arc(0, -10, 10, 0, TAU); p.rect(-3, -27, 6, 9); }
  else if (kind === 'tall') { p.roundRect(-5, -30, 10, 30, 4); }
  else if (kind === 'square') { p.roundRect(-8, -21, 16, 21, 3); p.rect(-3, -27, 6, 7); }
  else { // heart
    p.moveTo(0, 0); p.bezierCurveTo(-14, -9, -10, -22, 0, -15); p.bezierCurveTo(10, -22, 14, -9, 0, 0); p.rect(-2.5, -25, 5, 9);
  }
  return p;
}
function potion(c, x, y, kind, rgb, s = 1, glow = true) {
  c.save(); c.translate(x, y); c.scale(s, s);
  if (glow) glowAt(c, 0, -11, 20, rgb, 0.32);
  const g = glassPath(kind);
  c.fillStyle = 'rgba(235,225,255,.28)'; c.fill(g);
  c.save(); c.clip(g);
  const lv = kind === 'tall' ? -20 : kind === 'heart' ? -13 : kind === 'square' ? -15 : -14;
  c.fillStyle = lg(c, 0, lv, 0, 0, [[0, `rgba(${rgb},.95)`], [1, `rgba(${rgb},.7)`]]);
  c.fillRect(-15, lv, 30, 20 - lv);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-15, lv, 30, 1.5);
  c.restore();
  c.strokeStyle = 'rgba(40,20,70,.6)'; c.lineWidth = 1.1; c.stroke(g);
  const top = kind === 'tall' ? -30 : kind === 'heart' ? -25 : -27;
  rr(c, -3.5, top - 5, 7, 6, 2); paint(c, '#C08A58', 'rgba(60,30,20,.6)', 0.8);
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(kind === 'tall' ? -2 : -4, kind === 'tall' ? -20 : -12, 1.4, 3.2, 0.3, 0, TAU); c.fill();
  if (kind === 'square') { rr(c, -5.5, -14, 11, 7, 1.5); paint(c, '#F2E2BC'); c.fillStyle = `rgb(${rgb})`; star(c, 0, -10.5, 2.4); c.fill(); }
  c.restore();
}
const CARE_SHELF = [
  (c, x, y) => potion(c, x, y, 'round', '124,240,170'),
  (c, x, y) => potion(c, x, y, 'tall', '255,130,190'),
  // หนังสือตั้ง + เทียน
  (c, x, y) => {
    const bk = [['#7E4CC9', 22], ['#3FA88E', 18], ['#C24F7E', 24]];
    bk.forEach(([col, w], i) => { rr(c, x - w / 2 + i * 1.5, y - 6 - i * 6, w, 6, 1.5); paint(c, col, 'rgba(30,10,40,.5)', 0.8); c.fillStyle = '#E7B640'; c.fillRect(x - w / 2 + i * 1.5 + 3, y - 4.5 - i * 6, w - 6, 1); });
    rr(c, x + 1, y - 30, 5, 12, 1.5); paint(c, '#FFF3D6', 'rgba(60,30,20,.4)', 0.7);
    c.fillStyle = '#FFC94A'; c.beginPath(); c.ellipse(x + 3.5, y - 33, 1.8, 3, 0, 0, TAU); c.fill();
  },
  (c, x, y) => potion(c, x, y, 'square', '160,200,255'),
  // คริสตัลม่วง
  (c, x, y) => {
    const cr = [[-6, 16, -0.25, '#B48BF0'], [5, 13, 0.3, '#9C6CE6'], [0, 22, 0, '#C9A6FF']];
    for (const [dx, h, a, col] of cr) {
      c.save(); c.translate(x + dx, y); c.rotate(a);
      c.beginPath(); c.moveTo(-4, 0); c.lineTo(-4, -h + 5); c.lineTo(0, -h); c.lineTo(4, -h + 5); c.lineTo(4, 0); c.closePath(); paint(c, col, 'rgba(40,20,70,.55)', 0.9);
      c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.moveTo(-2.5, -1); c.lineTo(-2.5, -h + 5); c.lineTo(0, -h + 1.5); c.lineTo(0, -1); c.closePath(); c.fill();
      c.restore();
    }
    glowAt(c, x, y - 12, 18, '200,160,255', 0.25);
  },
  (c, x, y) => potion(c, x, y, 'heart', '255,110,150'),
  // โหลเห็ดแดง
  (c, x, y) => {
    rr(c, x - 9, y - 20, 18, 20, 5); paint(c, 'rgba(230,240,255,.35)', 'rgba(40,20,70,.55)', 1);
    for (const [dx, h] of [[-3, 9], [3.5, 12]]) { c.fillStyle = '#FFF3E0'; c.fillRect(x + dx - 1.2, y - h, 2.4, h - 1); c.beginPath(); c.ellipse(x + dx, y - h, 4.5, 3, 0, Math.PI, TAU); c.fillStyle = '#E8334A'; c.fill(); c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(x + dx - 1.5, y - h - 1.2, 0.9, 0, TAU); c.fill(); }
    rr(c, x - 10, y - 24, 20, 5, 2); paint(c, '#8E5A34', 'rgba(40,20,20,.5)', 0.8);
  },
  (c, x, y) => potion(c, x, y, 'round', '255,214,90', 0.85),
];
function careBack(c, vw, K) {
  c.fillStyle = lg(c, 0, 0, 0, FLOOR, [[0, '#4F3889'], [1, '#2E1F5C']]);
  c.fillRect(0, 0, vw, FLOOR);
  // ลายดาวจาง ๆ
  for (let y = 22, r = 0; y < 240; y += 44, r++) for (let x = (r % 2) * 26; x < vw; x += 52) {
    c.fillStyle = 'rgba(255,232,154,.12)';
    if ((x + y) % 3 === 0) { c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill(); }
    else { star(c, x, y, 3.2); c.fill(); }
  }
  // คานไม้บนเพดาน
  c.fillStyle = lg(c, 0, 0, 0, 14, [[0, '#6B4433'], [1, '#4A2C22']]); c.fillRect(0, 0, vw, 14);
  c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(0, 14, vw, 3);
  // ผนังไม้ล่าง + ราวทอง
  c.fillStyle = lg(c, 0, 244, 0, FLOOR, [[0, '#4B2D3E'], [1, '#33192A']]); c.fillRect(0, 244, vw, FLOOR - 244);
  c.strokeStyle = 'rgba(160,110,140,.35)'; c.lineWidth = 2;
  for (let x = 10; x < vw; x += 58) { rr(c, x, 258, 44, 66, 4); c.stroke(); }
  c.fillStyle = '#C9A24A'; c.fillRect(0, 242, vw, 3);
  floorTiles(c, vw, '#4A3A68', 'rgba(255,255,255,.08)', false);
  // หน้าต่างโค้ง: ท้องฟ้ากลางคืน พระจันทร์เสี้ยว ดาว
  const wx = K - 122, wy = 24, ww = 62, wh = 94;
  const arch = new Path2D();
  arch.moveTo(wx - ww / 2, wy + wh); arch.lineTo(wx - ww / 2, wy + ww / 2); arch.arc(wx, wy + ww / 2, ww / 2, Math.PI, 0); arch.lineTo(wx + ww / 2, wy + wh); arch.closePath();
  c.save(); c.translate(0, 4); c.fillStyle = 'rgba(10,0,30,.3)'; c.fill(arch); c.restore();
  c.lineWidth = 10; c.strokeStyle = '#5E3A2C'; c.stroke(arch);
  c.fillStyle = lg(c, 0, wy, 0, wy + wh, [[0, '#1B1140'], [1, '#41308A']]); c.fill(arch);
  c.save(); c.clip(arch);
  glowAt(c, wx + 10, wy + 26, 30, '255,240,190', 0.35);
  c.save();
  c.beginPath(); c.rect(wx - 20, wy, 50, 50); c.arc(wx + 15, wy + 22, 9.5, 0, TAU); c.clip('evenodd');
  c.fillStyle = '#FFF2C2'; c.beginPath(); c.arc(wx + 10, wy + 26, 11, 0, TAU); c.fill();
  c.restore();
  c.fillStyle = '#FFE89A';
  for (const [dx, dy, r] of [[-16, 18, 2.4], [-8, 44, 1.8], [18, 56, 2.2], [-18, 70, 1.6], [8, 80, 2]]) { star(c, wx + dx, wy + dy, r * 1.4); c.fill(); }
  c.restore();
  c.strokeStyle = '#5E3A2C'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx, wy + wh); c.moveTo(wx - ww / 2, wy + 52); c.lineTo(wx + ww / 2, wy + 52); c.stroke();
  c.lineWidth = 1.5; c.strokeStyle = '#C9A24A'; c.stroke(arch);
  rr(c, wx - ww / 2 - 8, wy + wh, ww + 16, 7, 2); paint(c, '#6B4433');
  // สมุนไพรห้อยจากคาน (ใบเขียว · ลาเวนเดอร์ · ใบแดง)
  const herbs = [[K + 96, '#6FC27A', 34], [K + 124, '#B48BF0', 42], [K + 152, '#E07A5A', 30]];
  for (const [hx, col, len] of herbs) {
    c.strokeStyle = 'rgba(230,200,150,.75)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(hx, 14); c.lineTo(hx, 24); c.stroke();
    c.fillStyle = '#C9A24A'; c.fillRect(hx - 4, 23, 8, 3);
    for (let k = 0; k < 6; k++) {
      const yy = 28 + k * (len / 6), sp = 3 + k * 0.9;
      c.fillStyle = col;
      for (const d of [-1, 1]) { c.beginPath(); c.ellipse(hx + d * sp, yy, 3.6, 2, d * 0.6, 0, TAU); c.fill(); }
    }
    c.strokeStyle = 'rgba(60,90,40,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(hx, 26); c.lineTo(hx, 26 + len); c.stroke();
  }
  // ชั้นไม้เข้ม ขายึดทองเหลือง
  shelfRow(c, vw, 150, '#8A6048', '#5E3A2C', '#C9A24A', CARE_SHELF, 0);
  shelfRow(c, vw, 214, '#8A6048', '#5E3A2C', '#C9A24A', CARE_SHELF, 1);
  // ป้ายร้าน: พระจันทร์เสี้ยวทอง + ขวดยา + ดาวห้อย
  const sx = K, sy = 52;
  hangers(c, sx, sy - 18, 16, 'rgba(201,162,74,.8)');
  glowAt(c, sx, sy, 40, '255,220,140', 0.22);
  // เสี้ยวจันทร์: ตัดวงในออกด้วย clip (ไม่ทาสีทับ — ผนังไล่สี)
  c.save();
  c.beginPath(); c.rect(sx - 40, sy - 40, 80, 80); c.arc(sx + 10, sy - 7, 20, 0, TAU); c.clip('evenodd');
  c.beginPath(); c.arc(sx, sy, 24, 0, TAU);
  c.fillStyle = lg(c, sx - 24, sy - 24, sx + 24, sy + 24, [[0, '#FFF0A8'], [1, '#D99A2B']]); c.fill();
  c.restore();
  potion(c, sx + 6, sy + 13, 'round', '124,240,170', 0.75, false);
  for (const [dx, len] of [[-14, 30], [-2, 38]]) {
    c.strokeStyle = 'rgba(201,162,74,.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(sx + dx, sy + 18); c.lineTo(sx + dx, sy + len - 4); c.stroke();
  }
  c.fillStyle = '#FFE89A'; star(c, sx - 14, sy + 30, 4); c.fill(); star(c, sx - 2, sy + 38, 3.2); c.fill();
}
function careFront(c, K) {
  const x0 = K - CW / 2;
  blob(c, K, H - 4, CW * 0.62, 10, 0.25);
  // ตู้ลิ้นชักสมุนไพรไม้มะฮอกกานี
  c.fillStyle = lg(c, 0, COUNTER, 0, H, [[0, '#76432E'], [1, '#4A2618']]);
  c.fillRect(x0, COUNTER, CW, H - COUNTER);
  const cols = 6, rows = 3, dx0 = x0 + 12, dy0 = COUNTER + 14, dw = (CW - 24) / cols, dh = (H - 14 - dy0) / rows;
  const marks = ['leaf', 'drop', 'star', 'moon'];
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const x = dx0 + q * dw, y = dy0 + r * dh;
    rr(c, x + 3, y + 3, dw - 6, dh - 6, 3);
    c.fillStyle = lg(c, 0, y, 0, y + dh, [[0, '#8A5338'], [1, '#633823']]); c.fill();
    c.strokeStyle = 'rgba(30,10,5,.45)'; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = 'rgba(255,220,180,.15)'; c.fillRect(x + 4, y + 4, dw - 8, 1.5);
    // ป้ายกระดาษ + สัญลักษณ์
    const lx = x + dw / 2, ly = y + 11;
    rr(c, lx - 10, ly - 5, 20, 10, 1.5); paint(c, '#F2E2BC', 'rgba(120,80,40,.6)', 0.8);
    const m = marks[(r * cols + q) % 4];
    c.fillStyle = m === 'leaf' ? '#4E9A5A' : m === 'drop' ? '#4E7FD0' : m === 'star' ? '#C9922A' : '#7E4CC9';
    if (m === 'leaf') { c.beginPath(); c.ellipse(lx, ly, 4, 2, -0.5, 0, TAU); c.fill(); }
    else if (m === 'drop') { c.beginPath(); c.moveTo(lx, ly - 3.5); c.quadraticCurveTo(lx + 3.5, ly + 1, lx, ly + 3); c.quadraticCurveTo(lx - 3.5, ly + 1, lx, ly - 3.5); c.fill(); }
    else if (m === 'star') { star(c, lx, ly, 3.5); c.fill(); }
    else { c.beginPath(); c.arc(lx, ly, 3.2, 0, TAU); c.fill(); c.fillStyle = '#F2E2BC'; c.beginPath(); c.arc(lx + 1.5, ly - 1, 2.6, 0, TAU); c.fill(); }
    // ปุ่มจับทองเหลือง
    c.fillStyle = lg(c, 0, y + dh - 14, 0, y + dh - 6, [[0, '#FFE08A'], [1, '#B07A2A']]);
    c.beginPath(); c.arc(lx, y + dh - 11, 3.4, 0, TAU); c.fill();
  }
  // ท็อปหินม่วงขอบทอง
  rr(c, x0 - 12, COUNTER - 12, CW + 24, 16, 6);
  c.fillStyle = lg(c, 0, COUNTER - 12, 0, COUNTER + 4, [[0, '#A587E6'], [1, '#6E4CB8']]); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x0 - 6, COUNTER - 10, CW + 12, 2.5);
  c.fillStyle = '#C9A24A'; c.fillRect(x0 - 10, COUNTER + 3, CW + 20, 2);
  // หม้อยาเหล็กดำ (ซ้าย) — ฟองเดือดใน live
  const px = K - 112, py = COUNTER - 12;
  glowAt(c, px, py - 26, 34, '124,240,170', 0.35);
  c.fillStyle = '#2A2233';
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(px + d * 14, py - 6); c.lineTo(px + d * 18, py); c.lineTo(px + d * 11, py); c.closePath(); c.fill(); }
  c.beginPath(); c.ellipse(px, py - 18, 22, 15, 0, 0, TAU); c.fillStyle = lg(c, px - 22, 0, px + 22, 0, [[0, '#4A4058'], [0.4, '#2E2638'], [1, '#18121F']]); c.fill();
  c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(px - 10, py - 22, 4, 7, 0.4, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(px, py - 30, 20, 5, 0, 0, TAU); c.fillStyle = '#3C3348'; c.fill();
  c.beginPath(); c.ellipse(px, py - 30, 16.5, 3.6, 0, 0, TAU); c.fillStyle = '#7CF0A0'; c.fill();
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(px - 5, py - 31, 5, 1.2, 0, 0, TAU); c.fill();
  // ลูกแก้วบนขาทอง (ขวา)
  const bx = K + 110, by = COUNTER - 12;
  c.beginPath(); c.moveTo(bx - 12, by); c.lineTo(bx - 8, by - 9); c.lineTo(bx + 8, by - 9); c.lineTo(bx + 12, by); c.closePath(); c.fillStyle = lg(c, bx - 12, 0, bx + 12, 0, [[0, '#B07A2A'], [0.5, '#FFE08A'], [1, '#B07A2A']]); c.fill();
  glowAt(c, bx, by - 24, 30, '200,170,255', 0.4);
  c.beginPath(); c.arc(bx, by - 24, 15, 0, TAU);
  const cg = c.createRadialGradient(bx - 5, by - 30, 2, bx, by - 24, 15); cg.addColorStop(0, '#FFFFFF'); cg.addColorStop(0.3, '#E2D2FF'); cg.addColorStop(1, '#8E6CD8'); c.fillStyle = cg; c.fill();
  c.strokeStyle = 'rgba(60,30,110,.5)'; c.lineWidth = 1; c.stroke();
  // เทียนเล่มเล็ก (ขวาสุด — เปลวไฟใน live)
  rr(c, K + 136, COUNTER - 30, 8, 18, 2); paint(c, '#FFF3D6', 'rgba(60,30,20,.4)', 0.8);
  c.fillStyle = 'rgba(255,240,210,.9)'; c.beginPath(); c.ellipse(K + 140, COUNTER - 30, 4, 1.2, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(K + 140, COUNTER - 12, 9, 2.5, 0, 0, TAU); c.fillStyle = '#C9A24A'; c.fill();
}
function flame(c, x, y, t, s = 1) {
  const f = 1 + Math.sin(t * 0.35) * 0.12 + Math.sin(t * 0.83) * 0.06;
  glowAt(c, x, y - 4 * s, 18 * s, '255,200,110', 0.35);
  c.fillStyle = '#FFB347';
  c.beginPath(); c.moveTo(x, y - 9 * s * f); c.quadraticCurveTo(x + 3.4 * s, y - 2 * s, x, y); c.quadraticCurveTo(x - 3.4 * s, y - 2 * s, x, y - 9 * s * f); c.fill();
  c.fillStyle = '#FFF4C2';
  c.beginPath(); c.ellipse(x, y - 2.5 * s, 1.4 * s, 2.6 * s * f, 0, 0, TAU); c.fill();
}
function careLive(c, vw, K, t) {
  // ฟองหม้อยา
  for (let i = 0; i < 6; i++) {
    const u = (t * 0.012 + i / 6) % 1;
    c.globalAlpha = 0.85 * (1 - u);
    c.fillStyle = i % 2 ? '#B6FFCB' : '#E2C9FF';
    c.beginPath(); c.arc(K - 112 + Math.sin(t * 0.05 + i * 2) * 7, COUNTER - 44 - u * 46, 1.8 + u * 3.2, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
  // ลูกแก้ว: หมอกม่วงหมุนวนข้างใน
  c.save(); c.beginPath(); c.arc(K + 110, COUNTER - 36, 14, 0, TAU); c.clip();
  for (let i = 0; i < 3; i++) {
    const a = t * 0.03 + i * 2.1;
    c.globalAlpha = 0.35; c.fillStyle = i === 1 ? '#FFFFFF' : '#B48BF0';
    c.beginPath(); c.ellipse(K + 110 + Math.cos(a) * 5, COUNTER - 36 + Math.sin(a) * 4, 6, 3, a, 0, TAU); c.fill();
  }
  c.restore(); c.globalAlpha = 1;
  flame(c, K + 140, COUNTER - 31, t);
  motes(c, vw, t, '#FFE89A');
}

// ══ ร้านอัปเกรดอุปกรณ์: โรงช่าง ═════════════════════════════════
function tool(c, kind, x, y) {
  c.save(); c.translate(x, y);
  c.fillStyle = '#7A5A3A'; c.beginPath(); c.arc(0, -2, 1.6, 0, TAU); c.fill();   // หมุดแขวน
  if (kind === 'hammer') {
    rr(c, -2, 0, 4, 30, 2); paint(c, '#C98A4E', OUT, 1);
    rr(c, -9, -1, 18, 7, 2); paint(c, '#8C96A2', 'rgba(30,30,40,.6)', 1);
    c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-8, 0, 16, 1.5);
  } else if (kind === 'wrench') {
    rr(c, -2.5, 2, 5, 26, 2.5); paint(c, '#A9B2BC', 'rgba(30,30,40,.6)', 1);
    c.beginPath(); c.arc(0, 2, 6, 0, TAU); paint(c, '#A9B2BC', 'rgba(30,30,40,.6)', 1);
    c.fillStyle = '#E2B97E'; c.fillRect(-2, -5, 4, 6);
    c.beginPath(); c.arc(0, 29, 4.5, 0, TAU); paint(c, '#A9B2BC', 'rgba(30,30,40,.6)', 1);
  } else if (kind === 'saw') {
    c.beginPath(); c.moveTo(-3, 6); c.lineTo(5, 6); c.lineTo(5, 34); c.lineTo(-3, 30); c.closePath(); paint(c, '#C7D0DA', 'rgba(30,30,40,.6)', 1);
    c.fillStyle = 'rgba(30,30,40,.5)'; for (let v = 8; v < 32; v += 3) { c.beginPath(); c.moveTo(-3, v); c.lineTo(-5, v + 1.5); c.lineTo(-3, v + 3); c.fill(); }
    rr(c, -5, -2, 12, 10, 3); paint(c, '#E8584A', OUT, 1);
    c.fillStyle = '#E2B97E'; rr(c, -1.5, 1, 5, 4, 1.5); c.fill();
  } else if (kind === 'driver') {
    rr(c, -3, 0, 6, 12, 2.5); paint(c, '#FFC94A', OUT, 1);
    c.fillStyle = 'rgba(160,100,10,.4)'; c.fillRect(-1, 1, 1, 10); c.fillRect(1, 1, 1, 10);
    c.fillStyle = '#A9B2BC'; c.fillRect(-1, 12, 2, 16);
  } else if (kind === 'tape') {
    c.beginPath(); c.arc(0, 8, 8, 0, TAU); paint(c, '#FFC94A', OUT, 1);
    c.beginPath(); c.arc(0, 8, 3.5, 0, TAU); paint(c, '#5E5E66');
    c.fillStyle = '#FFF3C4'; c.fillRect(6, 13, 8, 3);
  }
  c.restore();
}
const HOME_SHELF = [
  // กระป๋องสีมีหยดย้อย
  (c, x, y, i) => {
    const col = ['#FF8FB3', '#8EE0C2', '#9FD3FF', '#FFD45A'][i % 4];
    rr(c, x - 9, y - 18, 18, 18, 2); paint(c, '#C7D0DA', 'rgba(30,30,40,.55)', 1);
    c.fillStyle = col; c.fillRect(x - 9, y - 18, 18, 5);
    c.beginPath(); c.moveTo(x - 4, y - 13); c.quadraticCurveTo(x - 3, y - 7, x - 1.5, y - 13); c.fill();
    c.beginPath(); c.moveTo(x + 3, y - 13); c.quadraticCurveTo(x + 4, y - 9.5, x + 5, y - 13); c.fill();
    rr(c, x - 6, y - 10, 12, 6, 1); c.fillStyle = '#FFFFFF'; c.fill();
    c.fillStyle = col; c.beginPath(); c.arc(x, y - 7, 1.8, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(30,30,40,.6)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y - 18, 8, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  },
  // กล่องเครื่องมือแดง
  (c, x, y) => {
    rr(c, x - 14, y - 15, 28, 15, 2.5); paint(c, '#E8584A', OUT, 1);
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x - 14, y - 9, 28, 2);
    c.strokeStyle = '#5E5E66'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x - 6, y - 15); c.lineTo(x - 6, y - 20); c.lineTo(x + 6, y - 20); c.lineTo(x + 6, y - 15); c.stroke();
    c.fillStyle = '#FFD45A'; c.fillRect(x - 2, y - 11, 4, 3);
  },
  // บ้านแมวจำลอง (สินค้าตัวอย่าง)
  (c, x, y) => {
    rr(c, x - 12, y - 16, 24, 16, 2); paint(c, '#FFE6C7', OUT, 1);
    c.beginPath(); c.moveTo(x - 15, y - 15); c.lineTo(x, y - 28); c.lineTo(x + 15, y - 15); c.closePath(); paint(c, '#E07A5A', OUT, 1);
    ears(c, x, y - 26, 6, 4, '#E07A5A', '#FFB3C7');
    c.beginPath(); c.moveTo(x - 4.5, y); c.lineTo(x - 4.5, y - 7); c.arc(x, y - 7, 4.5, Math.PI, 0); c.lineTo(x + 4.5, y); c.closePath(); c.fillStyle = '#6B4A2E'; c.fill();
  },
  // โหลตะปู
  (c, x, y) => {
    rr(c, x - 8, y - 18, 16, 18, 4); paint(c, 'rgba(225,240,255,.4)', 'rgba(40,40,60,.55)', 1);
    c.fillStyle = '#8C96A2'; for (let k = 0; k < 9; k++) { const a = hash(k + x) * TAU; c.save(); c.translate(x - 4 + (k % 3) * 4, y - 4 - Math.floor(k / 3) * 4); c.rotate(a); c.fillRect(-2.5, -0.6, 5, 1.2); c.restore(); }
    rr(c, x - 9, y - 22, 18, 5, 1.5); paint(c, '#5E5E66');
  },
  // ท่อนไม้ซ้อน
  (c, x, y) => {
    for (const [dx, dy, w, col] of [[-10, -8, 20, '#E2B97E'], [-6, -16, 14, '#D9A066'], [2, -8, 12, '#C98A4E']]) { rr(c, x + dx, y + dy, w, 8, 1.5); paint(c, col, OUT, 0.9); c.strokeStyle = 'rgba(120,70,30,.35)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x + dx + 2, y + dy + 4); c.lineTo(x + dx + w - 2, y + dy + 4); c.stroke(); }
  },
  // เฟืองตั้ง
  (c, x, y) => { gear(c, x, y - 13, 12, 8, '#B9B2A8', '#7E6E62'); c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.arc(x - 3, y - 16, 3, 0, TAU); c.fill(); },
];
function homeBack(c, vw, K) {
  // ผนังอิฐส้มอุ่น
  c.fillStyle = '#E6C3A0'; c.fillRect(0, 0, vw, FLOOR);
  const bricks = ['#C7744A', '#B8653D', '#CF8156', '#BE6C44', '#C97B50'];
  for (let y = 0, r = 0; y < 244; y += 16, r++) for (let x = (r % 2) ? -16 : 0, q = 0; x < vw; x += 34, q++) {
    rr(c, x + 1, y + 1, 32, 14, 2); c.fillStyle = bricks[Math.floor(hash(r * 31 + q) * bricks.length)]; c.fill();
    c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x + 2, y + 2, 30, 2);
  }
  // ผนังไม้ล่าง + ราว
  c.fillStyle = lg(c, 0, 244, 0, FLOOR, [[0, '#9A6A44'], [1, '#7A4E30']]); c.fillRect(0, 244, vw, FLOOR - 244);
  c.fillStyle = 'rgba(40,20,10,.3)'; for (let x = 0; x < vw; x += 22) c.fillRect(x, 244, 2, FLOOR - 244);
  c.fillStyle = '#5E3A22'; c.fillRect(0, 240, vw, 5);
  floorTiles(c, vw, '#9C8A7C', 'rgba(255,255,255,.1)', false);
  // บอร์ดแขวนเครื่องมือ (ซ้าย)
  const px = K - 176, py = 22, pw = 102, ph = 100;
  c.fillStyle = 'rgba(40,20,10,.25)'; rr(c, px + 3, py + 4, pw, ph, 4); c.fill();
  rr(c, px, py, pw, ph, 4); paint(c, '#E2B97E', '#A97B45', 3);
  c.fillStyle = 'rgba(140,90,40,.35)';
  for (let y = py + 8; y < py + ph - 4; y += 9) for (let x = px + 8; x < px + pw - 4; x += 9) { c.beginPath(); c.arc(x, y, 1.1, 0, TAU); c.fill(); }
  tool(c, 'hammer', px + 18, py + 12);
  tool(c, 'wrench', px + 38, py + 14);
  tool(c, 'saw', px + 58, py + 10);
  tool(c, 'driver', px + 78, py + 14);
  tool(c, 'tape', px + 90, py + 62);
  tool(c, 'driver', px + 22, py + 60);
  // พิมพ์เขียวบ้านแมว (ขวา) ปักหมุดแดง
  c.save(); c.translate(K + 112, 60); c.rotate(0.05);
  c.fillStyle = 'rgba(30,20,10,.25)'; c.fillRect(-38, -32, 80, 70);
  c.fillStyle = lg(c, 0, -34, 0, 34, [[0, '#4C82C8'], [1, '#3566A8']]); c.fillRect(-40, -34, 80, 68);
  c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 0.8;
  for (let v = -34; v <= 34; v += 8) { c.beginPath(); c.moveTo(-40, v); c.lineTo(40, v); c.stroke(); }
  for (let v = -40; v <= 40; v += 8) { c.beginPath(); c.moveTo(v, -34); c.lineTo(v, 34); c.stroke(); }
  c.strokeStyle = '#FFFFFF'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-18, 22); c.lineTo(-18, -2); c.lineTo(0, -18); c.lineTo(18, -2); c.lineTo(18, 22); c.closePath(); c.stroke();
  c.beginPath(); c.moveTo(-9, -10); c.lineTo(-6, -20); c.lineTo(-2, -15); c.moveTo(9, -10); c.lineTo(6, -20); c.lineTo(2, -15); c.stroke();
  c.beginPath(); c.moveTo(-6, 22); c.lineTo(-6, 12); c.arc(0, 12, 6, Math.PI, 0); c.lineTo(6, 22); c.stroke();
  c.setLineDash([2, 2]); c.beginPath(); c.moveTo(-28, 22); c.lineTo(-28, -2); c.moveTo(-18, 28); c.lineTo(18, 28); c.stroke(); c.setLineDash([]);
  c.restore();
  for (const [dx, dy] of [[K + 76, 28], [K + 150, 32]]) { c.fillStyle = '#E8334A'; c.beginPath(); c.arc(dx, dy, 3, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(dx - 1, dy - 1, 1, 0, TAU); c.fill(); }
  // ชั้นไม้ ขายึดเหล็ก
  shelfRow(c, vw, 152, '#B98552', '#8E5A34', '#3E3E46', HOME_SHELF, 0);
  shelfRow(c, vw, 214, '#B98552', '#8E5A34', '#3E3E46', HOME_SHELF, 1);
  // ป้ายไม้ห้อยโซ่: ค้อนไขว้ประแจ + เฟือง
  const sx = K, sy = 50;
  hangers(c, sx, sy - 15, 34, 'rgba(70,70,80,.8)');
  c.fillStyle = 'rgba(40,20,10,.25)'; rr(c, sx - 40, sy - 13, 80, 30, 5); c.fill();
  rr(c, sx - 40, sy - 16, 80, 30, 5); paint(c, '#C98A4E', '#7A4A2A', 2);
  c.strokeStyle = 'rgba(120,70,30,.4)'; c.lineWidth = 1; for (const v of [-7, 2, 9]) { c.beginPath(); c.moveTo(sx - 36, sy + v); c.lineTo(sx + 36, sy + v); c.stroke(); }
  gear(c, sx, sy - 1, 11, 8, '#FFC94A', '#C98A4E');
  c.save(); c.translate(sx, sy - 1); c.rotate(-0.7); rr(c, -1.5, -14, 3, 26, 1.5); paint(c, '#8E5A34'); rr(c, -7, -16, 14, 5, 1.5); paint(c, '#5E5E66'); c.restore();
  c.save(); c.translate(sx, sy - 1); c.rotate(0.7); rr(c, -1.8, -12, 3.6, 24, 1.8); paint(c, '#A9B2BC'); c.beginPath(); c.arc(0, -13, 4, 0, TAU); paint(c, '#A9B2BC'); c.restore();
  for (const d of [-1, 1]) { c.fillStyle = '#5E5E66'; c.beginPath(); c.arc(sx + d * 33, sy - 9, 1.8, 0, TAU); c.fill(); }
}
function homeFront(c, K) {
  const x0 = K - CW / 2;
  blob(c, K, H - 4, CW * 0.62, 10, 0.22);
  // โต๊ะช่าง: แผ่นไม้ตั้งเรียง + แผ่นเหล็กมุม
  for (let x = x0, i = 0; x < x0 + CW; x += 30, i++) {
    c.fillStyle = lg(c, 0, COUNTER, 0, H, [[0, i % 2 ? '#93603A' : '#8A5733'], [1, '#5E3A22']]);
    c.fillRect(x, COUNTER, Math.min(30, x0 + CW - x), H - COUNTER);
    c.fillStyle = 'rgba(30,15,5,.35)'; c.fillRect(x, COUNTER, 1.5, H - COUNTER);
    c.fillStyle = 'rgba(60,30,10,.25)'; c.beginPath(); c.ellipse(x + 12 + hash(i) * 8, COUNTER + 60 + hash(i + 9) * 50, 2.5, 4, 0, 0, TAU); c.fill();
  }
  // ลิ้นชักสองช่อง
  for (const dx of [26, CW / 2 + 14]) {
    const w = CW / 2 - 40;
    rr(c, x0 + dx, COUNTER + 18, w, 38, 3);
    c.fillStyle = lg(c, 0, COUNTER + 18, 0, COUNTER + 56, [[0, '#B98552'], [1, '#93603A']]); c.fill();
    c.strokeStyle = 'rgba(40,20,10,.5)'; c.lineWidth = 1.4; c.stroke();
    rr(c, x0 + dx + w / 2 - 12, COUNTER + 33, 24, 6, 3); paint(c, '#A9B2BC', 'rgba(30,30,40,.6)', 1);
  }
  // ชั้นล่าง: ม้วนเชือก + ถังตะปู
  c.fillStyle = '#5E3A22'; c.fillRect(x0 + 10, H - 30, CW - 20, 5);
  for (const [cx, r] of [[x0 + 60, 12], [x0 + 236, 10]]) { c.beginPath(); c.arc(cx, H - 42, r, 0, TAU); paint(c, '#D9B784', OUT, 1); c.strokeStyle = 'rgba(140,100,50,.6)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, H - 42, r * 0.6, 0, TAU); c.stroke(); }
  // แผ่นเหล็กมุม + หมุดย้ำ
  for (const [mx, my, sx, sy] of [[x0, COUNTER, 1, 1], [x0 + CW, COUNTER, -1, 1], [x0, H, 1, -1], [x0 + CW, H, -1, -1]]) {
    c.beginPath(); c.moveTo(mx, my); c.lineTo(mx + sx * 22, my); c.lineTo(mx, my + sy * 22); c.closePath(); c.fillStyle = '#6F7882'; c.fill();
    c.fillStyle = '#C7D0DA'; c.beginPath(); c.arc(mx + sx * 6, my + sy * 6, 1.8, 0, TAU); c.fill();
  }
  // ท็อปไม้ต่อลาย (บุชเชอร์บล็อก)
  rr(c, x0 - 14, COUNTER - 14, CW + 28, 18, 4);
  c.fillStyle = '#D6A66A'; c.fill();
  c.save(); rr(c, x0 - 14, COUNTER - 14, CW + 28, 18, 4); c.clip();
  for (let x = x0 - 14, i = 0; x < x0 + CW + 14; x += 13, i++) { c.fillStyle = i % 2 ? '#E3B77C' : '#CF9C5E'; c.fillRect(x, COUNTER - 14, 13, 18); }
  c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x0 - 14, COUNTER - 13, CW + 28, 2.5);
  c.fillStyle = 'rgba(60,30,10,.25)'; c.fillRect(x0 - 14, COUNTER + 1, CW + 28, 3);
  c.restore();
  // ปากกาจับชิ้นงาน (ปลายซ้าย)
  const vx = x0 - 4, vy = COUNTER - 14;
  rr(c, vx - 6, vy - 16, 26, 16, 2); paint(c, '#4E7FD0', 'rgba(20,30,60,.6)', 1.2);
  rr(c, vx - 6, vy - 22, 10, 8, 1.5); paint(c, '#A9B2BC', 'rgba(30,30,40,.6)', 1);
  rr(c, vx + 10, vy - 22, 10, 8, 1.5); paint(c, '#A9B2BC', 'rgba(30,30,40,.6)', 1);
  c.strokeStyle = '#5E5E66'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(vx - 14, vy - 9); c.lineTo(vx - 6, vy - 9); c.stroke();
  c.fillStyle = '#5E5E66'; c.beginPath(); c.arc(vx - 15, vy - 9, 3, 0, TAU); c.fill();
  // กล่องเครื่องมือใหญ่ + โคมไฟแขน (แสงใน live)
  c.save(); c.translate(K - 104, COUNTER - 13); c.scale(1.5, 1.5); HOME_SHELF[1](c, 0, 0); c.restore();
  const lx = K + 108, ly = COUNTER - 13;
  c.beginPath(); c.ellipse(lx, ly - 2, 12, 3.5, 0, 0, TAU); paint(c, '#3E3E46');
  c.strokeStyle = '#3E3E46'; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(lx, ly - 3); c.lineTo(lx - 8, ly - 30); c.lineTo(lx + 8, ly - 48); c.stroke();
  c.fillStyle = '#C7D0DA'; for (const [jx, jy] of [[lx - 8, ly - 30], [lx, ly - 3]]) { c.beginPath(); c.arc(jx, jy, 2.4, 0, TAU); c.fill(); }
  c.save(); c.translate(lx + 8, ly - 48); c.rotate(0.6);
  c.beginPath(); c.moveTo(-5, -3); c.lineTo(5, -3); c.lineTo(12, 12); c.lineTo(-12, 12); c.closePath(); paint(c, '#FFC94A', OUT, 1.2);
  c.fillStyle = '#FFF6D0'; c.beginPath(); c.ellipse(0, 12, 11, 3, 0, 0, TAU); c.fill();
  c.restore();
}
function homeLive(c, vw, K, t) {
  // แสงโคมไฟแขนอุ่น ๆ (กะพริบเบา)
  const f = 0.8 + 0.2 * Math.sin(t * 0.13) * Math.sin(t * 0.07);
  glowAt(c, K + 120, COUNTER - 30, 46, '255,200,110', 0.45 * f);
  // ฝุ่นขี้เลื่อยในลำแสง
  for (let i = 0; i < 6; i++) {
    const u = (t * 0.004 + i / 6) % 1;
    c.globalAlpha = 0.6 * Math.sin(u * Math.PI);
    c.fillStyle = '#FFE6B0';
    c.beginPath(); c.arc(K + 112 + Math.sin(t * 0.02 + i * 3) * 14, COUNTER - 22 - u * 30, 1.3, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
  motes(c, vw, t, '#FFE6B0', 5);
}

// ══ ร้านของเล่น: ร้านสีลูกกวาด ══════════════════════════════════
function teddy(c, x, y, col, inner) {
  for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * 7, y - 25, 4, 0, TAU); paint(c, col, OUT, 1); c.fillStyle = inner; c.beginPath(); c.arc(x + d * 7, y - 25, 2, 0, TAU); c.fill(); }
  c.beginPath(); c.ellipse(x, y - 8, 9, 8, 0, 0, TAU); paint(c, col, OUT, 1);
  c.beginPath(); c.arc(x, y - 20, 8.5, 0, TAU); paint(c, col, OUT, 1);
  c.fillStyle = inner; c.beginPath(); c.ellipse(x, y - 17.5, 4, 3, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(x, y - 7, 5, 4.5, 0, 0, TAU); c.fill();
  c.fillStyle = '#4A2A18'; for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * 3.2, y - 21.5, 1.1, 0, TAU); c.fill(); }
  c.beginPath(); c.arc(x, y - 18.5, 1.2, 0, TAU); c.fill();
  c.fillStyle = '#FF8FB3'; c.beginPath(); c.moveTo(x - 4, y - 13); c.lineTo(x, y - 11.5); c.lineTo(x + 4, y - 13); c.lineTo(x + 4, y - 10); c.lineTo(x, y - 11.5); c.lineTo(x - 4, y - 10); c.closePath(); c.fill();
}
function catPlush(c, x, y, col) {
  c.beginPath(); c.ellipse(x, y - 7, 9, 7, 0, 0, TAU); paint(c, col, OUT, 1);
  c.beginPath(); c.arc(x, y - 19, 9, 0, TAU); paint(c, col, OUT, 1);
  ears(c, x, y - 26, 5, 4.5, col, '#FFB5CF');
  catFace(c, x, y - 18, 8, true);
  c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 8, y - 4); c.quadraticCurveTo(x + 15, y - 6, x + 13, y - 14); c.stroke();
}
const TOY_CUBBY = [
  (c, x, y) => teddy(c, x, y, '#E0A86E', '#F7D9B5'),
  (c, x, y) => catPlush(c, x, y, '#FFE6A8'),
  // บล็อกตัวอักษร
  (c, x, y) => {
    const B = [[-9, 0, '#FF8FB3', 'A'], [3, 0, '#9FD3FF', 'B'], [-3, -12, '#FFD45A', 'C']];
    c.font = '700 8px Mali, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const [dx, dy, col, ch] of B) { rr(c, x + dx - 6, y + dy - 12, 12, 12, 2); paint(c, col, OUT, 1); c.fillStyle = '#FFFFFF'; c.fillText(ch, x + dx, y + dy - 5.5); }
  },
  // เป็ดยาง
  (c, x, y) => {
    c.beginPath(); c.ellipse(x, y - 7, 11, 7, 0, 0, TAU); paint(c, '#FFD45A', OUT, 1);
    c.beginPath(); c.arc(x - 4, y - 16, 6, 0, TAU); paint(c, '#FFD45A', OUT, 1);
    c.fillStyle = '#FF9A3C'; c.beginPath(); c.ellipse(x - 11, y - 15, 3.5, 1.8, 0, 0, TAU); c.fill();
    c.fillStyle = '#4A2A18'; c.beginPath(); c.arc(x - 6, y - 17, 1, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(x + 3, y - 9, 4, 2, -0.3, 0, TAU); c.fill();
  },
  // จรวดของเล่น
  (c, x, y) => {
    c.beginPath(); c.moveTo(x, y - 28); c.quadraticCurveTo(x + 7, y - 20, x + 6, y - 6); c.lineTo(x - 6, y - 6); c.quadraticCurveTo(x - 7, y - 20, x, y - 28); c.closePath(); paint(c, '#FFFFFF', OUT, 1);
    c.fillStyle = '#E8584A'; c.beginPath(); c.moveTo(x, y - 28); c.quadraticCurveTo(x + 4, y - 25, x + 5, y - 21); c.lineTo(x - 5, y - 21); c.quadraticCurveTo(x - 4, y - 25, x, y - 28); c.fill();
    c.beginPath(); c.arc(x, y - 15, 2.8, 0, TAU); paint(c, '#9FD3FF', OUT, 0.8);
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x + d * 5, y - 12); c.lineTo(x + d * 10, y - 2); c.lineTo(x + d * 5, y - 6); c.closePath(); paint(c, '#E8584A', OUT, 0.8); }
    c.fillStyle = '#FFC94A'; c.beginPath(); c.moveTo(x - 3, y - 6); c.lineTo(x, y); c.lineTo(x + 3, y - 6); c.fill();
  },
  (c, x, y) => { c.save(); c.translate(x - 13, y - 27); c.scale(0.68, 0.68); drawItemIcon(c, 'ball'); c.restore(); },
  (c, x, y) => teddy(c, x, y, '#C8A8F5', '#EEE2FF'),
  (c, x, y) => { c.save(); c.translate(x - 13, y - 27); c.scale(0.68, 0.68); drawItemIcon(c, 'yarn'); c.restore(); },
  (c, x, y) => catPlush(c, x, y, '#FFFFFF'),
];
const CUBBY_COLS = ['#FFD3E2', '#FFF0B8', '#C9F0E0', '#CFE6FF', '#E6D9FF'];
/** ชั้นช่องสีลูกกวาดหนึ่งตู้ (กว้าง 50 · 3 ช่องซ้อน) */
function cubby(c, x, n) {
  const w = 50, y0 = 56, ch = 62;
  c.fillStyle = 'rgba(120,60,90,.16)'; rr(c, x + 3, y0 + 4, w, ch * 3, 6); c.fill();
  rr(c, x, y0, w, ch * 3, 6); paint(c, '#FFFFFF', 'rgba(220,150,180,.7)', 1.2);
  for (let r = 0; r < 3; r++) {
    const cy = y0 + r * ch;
    rr(c, x + 4, cy + 4, w - 8, ch - 8, 4);
    c.fillStyle = CUBBY_COLS[(n + r * 2) % CUBBY_COLS.length]; c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + 4, cy + ch - 9, w - 8, 5);
    TOY_CUBBY[(n * 3 + r) % TOY_CUBBY.length](c, x + w / 2, cy + ch - 9);
  }
}
function toyBack(c, vw, K) {
  c.fillStyle = lg(c, 0, 0, 0, FLOOR, [[0, '#FFF3F8'], [1, '#EAF8F3']]);
  c.fillRect(0, 0, vw, FLOOR);
  for (let y = 18, r = 0; y < 244; y += 30, r++) for (let x = (r % 2) * 15; x < vw; x += 30) { c.fillStyle = r % 2 ? 'rgba(142,224,194,.25)' : 'rgba(255,143,179,.2)'; c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fill(); }
  // รุ้งบนผนังหลังเจ้าของร้าน + ก้อนเมฆปลายรุ้ง
  const rc = ['#FFB3C7', '#FFD3A0', '#FFF0A0', '#BFF0D4', '#B8DDFF', '#D9C6FF'];
  rc.forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 9; c.beginPath(); c.arc(K, 252, 124 - i * 9, Math.PI, 0); c.stroke(); });
  for (const d of [-1, 1]) {
    c.fillStyle = '#FFFFFF';
    for (const [dx, dy, r] of [[-12, 0, 11], [0, -7, 13], [13, 0, 11], [0, 4, 11]]) { c.beginPath(); c.arc(K + d * 102 + dx, 240 + dy, r, 0, TAU); c.fill(); }
  }
  // ผนังล่าง: แผ่นลายทางมิ้นต์ + ราวชมพู
  c.fillStyle = '#D6F3E8'; c.fillRect(0, 248, vw, FLOOR - 248);
  c.fillStyle = 'rgba(255,255,255,.6)'; for (let x = 0; x < vw; x += 24) c.fillRect(x, 248, 10, FLOOR - 248);
  c.fillStyle = '#FF9FC2'; c.fillRect(0, 244, vw, 6);
  floorTiles(c, vw, '#BDEBDD', '#A6E0CE', true);
  // ตู้ชั้นช่องตุ๊กตา สองข้าง (ยาวออกไปถึงขอบจอ)
  let n = 0;
  for (let x = K - 178; x > -52; x -= 54) cubby(c, x, n++);
  for (let x = K + 128; x < vw; x += 54) cubby(c, x, n++);
  // ธงราว
  const cols = ['#FF8FB3', '#FFD45A', '#8EE0C2', '#9FD3FF', '#C8A8F5'];
  c.strokeStyle = 'rgba(160,110,140,.7)'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(vw / 2, 30, vw, 6); c.stroke();
  const nf = Math.ceil(vw / 26);
  for (let i = 0; i < nf; i++) {
    const u = (i + 0.5) / nf, x = u * vw, y = 6 + 24 * 4 * u * (1 - u) * 0.98;
    c.fillStyle = cols[i % cols.length];
    c.beginPath(); c.moveTo(x - 9, y); c.lineTo(x + 9, y); c.lineTo(x, y + 17); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 0.9; c.setLineDash([1.5, 1.5]);
    c.beginPath(); c.moveTo(x - 6, y + 2); c.lineTo(x + 6, y + 2); c.lineTo(x, y + 12.5); c.closePath(); c.stroke(); c.setLineDash([]);
  }
  // ป้ายร้าน: ก้อนเมฆ ดาว หน้าแมว
  const sx = K, sy = 58;
  hangers(c, sx, sy - 14, 22, 'rgba(160,110,140,.7)');
  c.fillStyle = 'rgba(120,60,90,.15)';
  for (const [dx, dy, r] of [[-22, 3, 14], [0, -6, 19], [22, 3, 14], [0, 8, 14]]) { c.beginPath(); c.arc(sx + dx, sy + dy + 3, r, 0, TAU); c.fill(); }
  c.fillStyle = '#FFFFFF';
  for (const [dx, dy, r] of [[-22, 3, 14], [0, -6, 19], [22, 3, 14], [0, 8, 14]]) { c.beginPath(); c.arc(sx + dx, sy + dy, r, 0, TAU); c.fill(); }
  c.fillStyle = '#FFE6A8'; c.beginPath(); c.arc(sx, sy, 11, 0, TAU); c.fill();
  ears(c, sx, sy - 9, 7, 6, '#FFE6A8', '#FFB5CF');
  catFace(c, sx, sy + 1, 10, true);
  c.fillStyle = '#FFD45A'; star(c, sx - 24, sy - 2, 6); c.fill();
  c.fillStyle = '#FF8FB3'; heart(c, sx + 24, sy, 6); c.fill();
}
function toyFront(c, K) {
  const x0 = K - CW / 2;
  blob(c, K, H - 4, CW * 0.62, 10, 0.18);
  // กล่องของขวัญยักษ์: ชมพูลายจุด ริบบิ้นมิ้นต์ โบว์ใหญ่หน้ากล่อง
  c.fillStyle = lg(c, 0, COUNTER, 0, H, [[0, '#FFA6C6'], [1, '#EE7AA4']]);
  c.fillRect(x0, COUNTER, CW, H - COUNTER);
  c.fillStyle = 'rgba(255,255,255,.55)';
  for (let y = COUNTER + 16, r = 0; y < H; y += 22, r++) for (let x = x0 + 12 + (r % 2) * 14; x < x0 + CW; x += 28) { c.beginPath(); c.arc(x, y, 3.4, 0, TAU); c.fill(); }
  const rb = (x, y, w, h) => { c.fillStyle = lg(c, x, 0, x + w, 0, [[0, '#7FD8B8'], [0.5, '#B6F2DC'], [1, '#7FD8B8']]); c.fillRect(x, y, w, h); };
  rb(K - 13, COUNTER, 26, H - COUNTER);
  c.fillStyle = lg(c, 0, COUNTER + 52, 0, COUNTER + 70, [[0, '#7FD8B8'], [0.5, '#B6F2DC'], [1, '#7FD8B8']]); c.fillRect(x0, COUNTER + 52, CW, 18);
  // โบว์
  const bx = K, by = COUNTER + 61;
  for (const d of [-1, 1]) {
    c.beginPath(); c.moveTo(bx, by); c.bezierCurveTo(bx + d * 18, by - 26, bx + d * 46, by - 16, bx + d * 34, by + 2); c.bezierCurveTo(bx + d * 26, by + 10, bx + d * 10, by + 6, bx, by); c.closePath();
    paint(c, '#9BE3C8', 'rgba(40,120,90,.55)', 1.2);
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(bx + d * 24, by - 9, 7, 3, d * -0.5, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(bx + d * 3, by + 4); c.lineTo(bx + d * 20, by + 40); c.lineTo(bx + d * 12, by + 36); c.lineTo(bx + d * 8, by + 44); c.lineTo(bx - d * 2, by + 6); c.closePath(); paint(c, '#9BE3C8', 'rgba(40,120,90,.55)', 1.2);
  }
  c.beginPath(); c.ellipse(bx, by, 8, 9, 0, 0, TAU); paint(c, '#B6F2DC', 'rgba(40,120,90,.55)', 1.2);
  // ฝากล่อง (กว้างกว่าตัวกล่องนิด)
  rr(c, x0 - 12, COUNTER - 14, CW + 24, 20, 6);
  c.fillStyle = lg(c, 0, COUNTER - 14, 0, COUNTER + 6, [[0, '#FFC4DA'], [1, '#FF9FC2']]); c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(x0 - 6, COUNTER - 12, CW + 12, 2.5);
  rb(K - 15, COUNTER - 14, 30, 20);
  c.fillStyle = 'rgba(200,60,110,.25)'; c.fillRect(x0 - 12, COUNTER + 4, CW + 24, 2);
  // ตู้กาชาปอง (ซ้าย)
  const gx = K - 114, gy = COUNTER - 14;
  rr(c, gx - 13, gy - 22, 26, 22, 4); paint(c, '#E8584A', OUT, 1.2);
  rr(c, gx - 5, gy - 14, 10, 8, 2); paint(c, '#5E2A2A');
  c.beginPath(); c.arc(gx + 7, gy - 17, 2.6, 0, TAU); paint(c, '#FFD45A', OUT, 0.8);
  c.beginPath(); c.arc(gx, gy - 40, 19, 0, TAU); c.fillStyle = 'rgba(225,245,255,.45)'; c.fill();
  c.save(); c.beginPath(); c.arc(gx, gy - 40, 19, 0, TAU); c.clip();
  const bc = ['#FF8FB3', '#FFD45A', '#8EE0C2', '#9FD3FF', '#C8A8F5', '#FF9A3C'];
  for (let i = 0; i < 16; i++) { const a = hash(i * 7) * TAU, r = 4 + hash(i * 3) * 11; c.beginPath(); c.arc(gx + Math.cos(a) * r, gy - 34 + Math.abs(Math.sin(a)) * 8 - (i > 9 ? 10 : 0), 4.3, 0, TAU); c.fillStyle = bc[i % bc.length]; c.fill(); }
  c.restore();
  c.strokeStyle = 'rgba(80,110,140,.6)'; c.lineWidth = 1.2; c.beginPath(); c.arc(gx, gy - 40, 19, 0, TAU); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(gx - 8, gy - 48, 3.5, 6, 0.5, 0, TAU); c.fill();
  rr(c, gx - 6, gy - 62, 12, 5, 2); paint(c, '#E8584A', OUT, 1);
  // โหลอมยิ้ม (ขวา — กังหันลมใน live ปักอยู่ข้างหลัง)
  const jx = K + 120, jy = COUNTER - 14;
  const lol = [['#FF8FB3', -6, -40], ['#8EE0C2', 4, -44], ['#FFD45A', 0, -34]];
  for (const [col, dx, top] of lol) {
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 2; c.beginPath(); c.moveTo(jx + dx, jy - 12); c.lineTo(jx + dx, top + jy); c.stroke();
    c.beginPath(); c.arc(jx + dx, top + jy - 5, 6, 0, TAU); paint(c, col, OUT, 1);
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.2; c.beginPath(); c.arc(jx + dx, top + jy - 5, 3.2, 0, Math.PI * 1.4); c.stroke();
  }
  rr(c, jx - 12, jy - 20, 24, 20, 5); paint(c, 'rgba(225,245,255,.5)', 'rgba(80,110,140,.6)', 1.1);
  c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(jx - 8, jy - 17, 2, 13);
}
function toyLive(c, vw, K, t) {
  // ลูกโป่งผูกมุมเคาน์เตอร์ (ลอยโยก)
  const cols = ['#FF8FB3', '#FFD45A', '#8EE0C2', '#9FD3FF'];
  const ax = K + 146, ay = COUNTER - 12;
  for (let i = 0; i < 4; i++) {
    const bx = ax - 4 + (i % 2) * 18 + Math.sin(t * 0.03 + i) * 3, by = 150 - i * 20 + Math.sin(t * 0.04 + i * 1.3) * 3;
    c.strokeStyle = 'rgba(120,80,110,.5)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(bx, by + 14); c.quadraticCurveTo(bx - 4, (by + ay) / 2, ax, ay); c.stroke();
    c.fillStyle = cols[i];
    c.beginPath(); c.ellipse(bx, by, 11, 13, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(bx - 2.5, by + 15); c.lineTo(bx + 2.5, by + 15); c.lineTo(bx, by + 12); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(bx - 4, by - 5, 2.5, 4, 0.4, 0, TAU); c.fill();
  }
  // กังหันลมหมุน (ปักในโหลอมยิ้ม)
  const px = K + 132, py = COUNTER - 66;
  c.strokeStyle = '#FFFFFF'; c.lineWidth = 2; c.beginPath(); c.moveTo(px, py); c.lineTo(px - 4, COUNTER - 30); c.stroke();
  c.save(); c.translate(px, py); c.rotate(t * 0.05);
  ['#FF8FB3', '#FFD45A', '#8EE0C2', '#9FD3FF'].forEach((col, i) => {
    c.rotate(Math.PI / 2);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -11); c.quadraticCurveTo(8, -9, 9, 0); c.closePath(); c.fillStyle = col; c.fill();
  });
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(0, 0, 2, 0, TAU); c.fill();
  c.restore();
  // ฟองสบู่ลอย
  for (let i = 0; i < 5; i++) {
    const u = (t * 0.0035 + i / 5) % 1;
    const x = K - 150 + ((i * 67) % 300) + Math.sin(t * 0.02 + i) * 10, y = 270 - u * 220;
    c.globalAlpha = 0.6 * Math.sin(u * Math.PI);
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, 5 + (i % 3) * 2, 0, TAU); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x - 2, y - 2, 1.4, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
}

// ══ ร้านแลกของรางวัล: ห้องสมบัติหรู ══════════════════════════════
const GOLD = [[0, '#FFF2B0'], [0.5, '#F2C24A'], [1, '#B4842A']];
function trophy(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  rr(c, -9, -6, 18, 6, 1.5); paint(c, '#5A2D8A', 'rgba(40,10,60,.6)', 0.9);
  c.fillStyle = lg(c, -8, 0, 8, 0, GOLD); c.fillRect(-3, -12, 6, 6);
  c.beginPath(); c.moveTo(-11, -28); c.lineTo(11, -28); c.quadraticCurveTo(10, -14, 0, -12); c.quadraticCurveTo(-10, -14, -11, -28); c.closePath();
  c.fillStyle = lg(c, -11, 0, 11, 0, GOLD); c.fill(); c.strokeStyle = 'rgba(120,80,20,.7)'; c.lineWidth = 0.9; c.stroke();
  c.strokeStyle = '#E3A93A'; c.lineWidth = 2;
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * 10, -25); c.quadraticCurveTo(d * 17, -24, d * 9, -16); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-6, -26, 2, 9);
  c.fillStyle = '#B48BF0'; star(c, 0, -21, 3.5); c.fill();
  c.restore();
}
function crownOnCushion(c, x, y) {
  rr(c, x - 15, y - 9, 30, 9, 4); paint(c, '#7E3FB8', 'rgba(40,10,60,.6)', 0.9);
  c.fillStyle = '#F2C24A'; for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * 14, y - 2, 2, 0, TAU); c.fill(); }
  c.beginPath(); c.moveTo(x - 10, y - 9); c.lineTo(x - 11, y - 22); c.lineTo(x - 5, y - 15); c.lineTo(x, y - 25); c.lineTo(x + 5, y - 15); c.lineTo(x + 11, y - 22); c.lineTo(x + 10, y - 9); c.closePath();
  c.fillStyle = lg(c, x - 11, 0, x + 11, 0, GOLD); c.fill(); c.strokeStyle = 'rgba(120,80,20,.7)'; c.lineWidth = 0.9; c.stroke();
  c.fillStyle = '#E8334A'; c.beginPath(); c.arc(x, y - 13, 2, 0, TAU); c.fill();
  c.fillStyle = '#9FD3FF'; for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * 6, y - 12, 1.4, 0, TAU); c.fill(); }
}
function gemBox(c, x, y) {
  rr(c, x - 12, y - 11, 24, 11, 2); paint(c, '#5A2D8A', 'rgba(40,10,60,.6)', 0.9);
  c.beginPath(); c.moveTo(x - 12, y - 11); c.lineTo(x - 9, y - 22); c.lineTo(x + 9, y - 22); c.lineTo(x + 12, y - 11); c.closePath(); paint(c, '#7E3FB8', 'rgba(40,10,60,.6)', 0.9);
  c.fillStyle = '#F2C24A'; c.fillRect(x - 12, y - 7, 24, 1.6);
  c.beginPath(); c.moveTo(x - 5, y - 11); c.lineTo(x, y - 17); c.lineTo(x + 5, y - 11); c.lineTo(x, y - 7); c.closePath(); c.fillStyle = '#5FD0F0'; c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(x - 2, y - 12); c.lineTo(x, y - 15); c.lineTo(x + 1, y - 12); c.closePath(); c.fill();
}
function coinStack(c, x, y) {
  for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(x - 5, y - 2 - i * 3.4, 7, 2.6, 0, 0, TAU); c.fillStyle = lg(c, x - 12, 0, x + 2, 0, GOLD); c.fill(); c.strokeStyle = 'rgba(120,80,20,.6)'; c.lineWidth = 0.7; c.stroke(); }
  for (let i = 0; i < 2; i++) { c.beginPath(); c.ellipse(x + 7, y - 2 - i * 3.4, 7, 2.6, 0, 0, TAU); c.fillStyle = lg(c, x, 0, x + 14, 0, GOLD); c.fill(); c.stroke(); }
  coin(c, x + 4, y - 15, 6);
}
const XR_SHELF = [
  (c, x, y) => trophy(c, x, y),
  (c, x, y) => crownOnCushion(c, x, y),
  (c, x, y) => coinStack(c, x, y),
  (c, x, y) => gemBox(c, x, y),
  (c, x, y, i) => giftBox(c, x, y, 20, i % 2 ? '#B48BF0' : '#FF8FB3', '#FFE680'),
  (c, x, y) => trophy(c, x, y, 0.8),
];
function xrBack(c, vw, K) {
  c.fillStyle = lg(c, 0, 0, 0, FLOOR, [[0, '#3B2C7C'], [1, '#231A52']]);
  c.fillRect(0, 0, vw, FLOOR);
  // ลายดามัสก์ทองจาง
  c.fillStyle = 'rgba(242,194,74,.1)';
  for (let y = 40, r = 0; y < 236; y += 46, r++) for (let x = (r % 2) * 26; x < vw; x += 52) {
    c.beginPath(); c.moveTo(x, y - 11); c.quadraticCurveTo(x + 7, y - 2, x, y + 11); c.quadraticCurveTo(x - 7, y - 2, x, y - 11); c.fill();
    for (const d of [-1, 1]) { c.beginPath(); c.ellipse(x + d * 7, y + 2, 4, 2, d * 0.6, 0, TAU); c.fill(); }
    c.beginPath(); c.arc(x, y - 14, 1.6, 0, TAU); c.fill();
  }
  // ผนังล่างกรอบทอง
  c.fillStyle = lg(c, 0, 238, 0, FLOOR, [[0, '#251C58'], [1, '#18123C']]); c.fillRect(0, 238, vw, FLOOR - 238);
  c.strokeStyle = 'rgba(242,194,74,.45)'; c.lineWidth = 1.5;
  for (let x = 10; x < vw; x += 58) { rr(c, x, 252, 44, 70, 3); c.stroke(); }
  c.fillStyle = lg(c, 0, 234, 0, 240, GOLD); c.fillRect(0, 234, vw, 5);
  floorTiles(c, vw, '#4A3E7E', '#352A66', true);
  // ชั้นวางขอบทอง
  shelfRow(c, vw, 128, '#FFE08A', '#C9932E', null, XR_SHELF, 0);
  shelfRow(c, vw, 196, '#FFE08A', '#C9932E', null, XR_SHELF, 1);
  // เชิงเทียนติดผนังสองข้าง (เปลวไฟใน live)
  for (const sx of [K - 102, K + 102]) {
    c.strokeStyle = '#E3A93A'; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx, 108); c.quadraticCurveTo(sx, 96, sx + (sx < K ? 8 : -8), 92); c.stroke();
    c.beginPath(); c.ellipse(sx, 108, 4, 6, 0, 0, TAU); c.fillStyle = lg(c, sx - 4, 0, sx + 4, 0, GOLD); c.fill();
    c.beginPath(); c.ellipse(sx + (sx < K ? 8 : -8), 92, 7, 2.2, 0, 0, TAU); c.fill();
    rr(c, sx + (sx < K ? 8 : -8) - 2.5, 78, 5, 14, 1.5); paint(c, '#FFF6E8', 'rgba(120,80,40,.4)', 0.7);
  }
  // ม่านกำมะหยี่ม่วงแดงสองข้าง + สายรัดพู่ทอง
  for (const d of [-1, 1]) {
    const ex = K + d * 182, ix = K + d * 132;
    c.beginPath(); c.moveTo(ex, 0); c.lineTo(ix, 0); c.quadraticCurveTo(ix - d * 6, 120, ix + d * 18, 170); c.quadraticCurveTo(ix + d * 6, 220, ix - d * 2, 272); c.lineTo(ex, 272); c.closePath();
    c.fillStyle = lg(c, ix, 0, ex, 0, [[0, '#B03A78'], [0.35, '#8A2A62'], [0.7, '#A8366F'], [1, '#6E1E4E']]); c.fill();
    c.strokeStyle = 'rgba(40,0,30,.3)'; c.lineWidth = 2;
    for (const k of [0.3, 0.6]) { const fx = ix + (ex - ix) * k; c.beginPath(); c.moveTo(fx, 0); c.quadraticCurveTo(fx + d * 4, 170, fx - d * 2, 272); c.stroke(); }
    c.fillStyle = '#F2C24A'; c.fillRect(Math.min(ix, ex), 268, Math.abs(ex - ix), 4);
    const tx = ix + d * 18, ty = 170;
    c.fillStyle = lg(c, tx - 8, 0, tx + 8, 0, GOLD); rr(c, tx - 9 + d * 3, ty - 4, 18, 8, 3); c.fill();
    c.beginPath(); c.arc(tx + d * 4, ty + 8, 4, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(tx + d * 4 - 4, ty + 10); c.lineTo(tx + d * 4 + 4, ty + 10); c.lineTo(tx + d * 4 + 5, ty + 26); c.lineTo(tx + d * 4 - 5, ty + 26); c.closePath(); c.fill();
  }
  // ระบายม่านด้านบน (สแวก) + ชายพู่ทอง
  for (let x = -20, i = 0; x < vw + 60; x += 60, i++) {
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 60, 0); c.lineTo(x + 60, 10); c.quadraticCurveTo(x + 30, 42, x, 10); c.closePath();
    c.fillStyle = lg(c, 0, 0, 0, 34, [[0, '#B03A78'], [1, '#7A2458']]); c.fill();
    c.strokeStyle = '#F2C24A'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x + 60, 10); c.quadraticCurveTo(x + 30, 42, x, 10); c.stroke();
    c.fillStyle = '#F2C24A'; for (let k = 1; k < 6; k++) { const u = k / 6, fx = x + 60 - 60 * u, fy = 10 + 4 * 32 * u * (1 - u) * 0.75; c.fillRect(fx - 1, fy, 2, 5); }
  }
  // ตราประจำร้าน: เหรียญม่วงในพวงช่อมะกอกทอง + มงกุฎ
  const sx = K, sy = 58;
  glowAt(c, sx, sy, 44, '255,220,140', 0.25);
  c.strokeStyle = '#E3A93A'; c.lineWidth = 2;
  for (const d of [-1, 1]) {
    c.beginPath(); c.arc(sx, sy + 2, 25, Math.PI / 2 + d * 0.25, Math.PI / 2 + d * 2.3, d < 0); c.stroke();
    for (let k = 0; k < 6; k++) { const a = Math.PI / 2 + d * (0.5 + k * 0.33); c.fillStyle = '#F2C24A'; c.beginPath(); c.ellipse(sx + Math.cos(a) * 25, sy + 2 + Math.sin(a) * 25, 4.5, 2, a + d * 0.9, 0, TAU); c.fill(); }
  }
  c.beginPath(); c.arc(sx, sy + 2, 18, 0, TAU); c.fillStyle = lg(c, 0, sy - 16, 0, sy + 20, GOLD); c.fill();
  c.beginPath(); c.arc(sx, sy + 2, 14, 0, TAU); c.fillStyle = lg(c, 0, sy - 12, 0, sy + 16, [[0, '#B48BF0'], [1, '#5A2D8A']]); c.fill();
  c.fillStyle = '#FFE680'; star(c, sx, sy + 3, 8); c.fill();
  c.beginPath(); c.moveTo(sx - 11, sy - 14); c.lineTo(sx - 12, sy - 26); c.lineTo(sx - 5, sy - 19); c.lineTo(sx, sy - 29); c.lineTo(sx + 5, sy - 19); c.lineTo(sx + 12, sy - 26); c.lineTo(sx + 11, sy - 14); c.closePath();
  c.fillStyle = lg(c, sx - 12, 0, sx + 12, 0, GOLD); c.fill(); c.strokeStyle = 'rgba(120,80,20,.7)'; c.lineWidth = 0.9; c.stroke();
  c.fillStyle = '#E8334A'; c.beginPath(); c.arc(sx, sy - 18, 2, 0, TAU); c.fill();
}
function xrFront(c, K) {
  const x0 = K - CW / 2;
  blob(c, K, H - 4, CW * 0.62, 10, 0.3);
  // เคาน์เตอร์หินอ่อนขาวอมม่วง ลายเส้นแร่
  c.fillStyle = lg(c, 0, COUNTER, 0, H, [[0, '#F7F2FF'], [1, '#D9CCF0']]);
  c.fillRect(x0, COUNTER, CW, H - COUNTER);
  c.save(); c.beginPath(); c.rect(x0, COUNTER, CW, H - COUNTER); c.clip();
  c.strokeStyle = 'rgba(140,110,180,.28)'; c.lineWidth = 1.1;
  for (let i = 0; i < 7; i++) {
    const sx = x0 + (i + hash(i * 3) * 0.8) * (CW / 7), sy = COUNTER + hash(i * 5) * 40;
    c.beginPath(); c.moveTo(sx, sy);
    c.bezierCurveTo(sx + 30, sy + 20 + hash(i) * 20, sx - 10, sy + 60, sx + 40 * (hash(i + 7) - 0.3), sy + 110); c.stroke();
  }
  c.restore();
  // แผงกรอบทองสามช่อง + เหรียญตรากลาง
  c.strokeStyle = '#E3A93A'; c.lineWidth = 2;
  for (const [px, pw] of [[x0 + 14, 82], [x0 + CW - 96, 82]]) { rr(c, px, COUNTER + 22, pw, H - COUNTER - 48, 4); c.stroke(); }
  c.lineWidth = 1; for (const [px, pw] of [[x0 + 20, 70], [x0 + CW - 90, 70]]) { rr(c, px, COUNTER + 28, pw, H - COUNTER - 60, 3); c.stroke(); }
  const mx = K, my = COUNTER + 62;
  glowAt(c, mx, my, 40, '255,220,140', 0.3);
  c.beginPath(); c.arc(mx, my, 26, 0, TAU); c.fillStyle = lg(c, 0, my - 26, 0, my + 26, GOLD); c.fill();
  c.strokeStyle = 'rgba(120,80,20,.6)'; c.lineWidth = 1; c.stroke();
  c.beginPath(); c.arc(mx, my, 20, 0, TAU); c.fillStyle = lg(c, 0, my - 20, 0, my + 20, [[0, '#9C6CE6'], [1, '#4A1C80']]); c.fill();
  c.beginPath(); c.moveTo(mx - 11, my + 6); c.lineTo(mx - 12, my - 8); c.lineTo(mx - 5, my - 1); c.lineTo(mx, my - 12); c.lineTo(mx + 5, my - 1); c.lineTo(mx + 12, my - 8); c.lineTo(mx + 11, my + 6); c.closePath();
  c.fillStyle = lg(c, mx - 12, 0, mx + 12, 0, GOLD); c.fill();
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; c.fillStyle = '#FFF6D0'; c.beginPath(); c.arc(mx + Math.cos(a) * 23, my + Math.sin(a) * 23, 1.1, 0, TAU); c.fill(); }
  // ฐานทอง
  c.fillStyle = lg(c, 0, H - 22, 0, H - 14, GOLD); c.fillRect(x0, H - 22, CW, 6);
  // ท็อปหินอ่อน + ขอบทอง
  rr(c, x0 - 12, COUNTER - 12, CW + 24, 16, 5);
  c.fillStyle = lg(c, 0, COUNTER - 12, 0, COUNTER + 4, [[0, '#FFFFFF'], [1, '#E2D6F5']]); c.fill();
  c.fillStyle = lg(c, 0, COUNTER + 2, 0, COUNTER + 7, GOLD); c.fillRect(x0 - 10, COUNTER + 2, CW + 20, 4);
  c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(x0 - 6, COUNTER - 10, CW + 12, 2);
  // หีบสมบัติเปิด เหรียญล้น (ซ้าย)
  const hx = K - 110, hy = COUNTER - 12;
  glowAt(c, hx, hy - 22, 40, '255,220,120', 0.5);
  // ฝาเปิดอ้าไปข้างหลัง (เห็นด้านในสีเข้ม ขอบทอง)
  c.beginPath(); c.moveTo(hx - 21, hy - 24); c.lineTo(hx - 24, hy - 46); c.quadraticCurveTo(hx, hy - 56, hx + 24, hy - 46); c.lineTo(hx + 21, hy - 24); c.closePath();
  paint(c, lg(c, 0, hy - 54, 0, hy - 24, [[0, '#5A2D8A'], [1, '#2E1650']]), 'rgba(40,10,60,.7)', 1);
  c.strokeStyle = '#F2C24A'; c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(hx - 24, hy - 46); c.quadraticCurveTo(hx, hy - 56, hx + 24, hy - 46); c.stroke();
  // เหรียญพูนในหีบ + อัญมณี
  c.beginPath(); c.moveTo(hx - 19, hy - 22); c.quadraticCurveTo(hx - 12, hy - 38, hx, hy - 37); c.quadraticCurveTo(hx + 12, hy - 38, hx + 19, hy - 22); c.closePath();
  c.fillStyle = lg(c, 0, hy - 38, 0, hy - 22, GOLD); c.fill();
  for (const [dx, dy] of [[-12, -27], [-5, -32], [3, -33], [10, -28], [-8, -24], [6, -24], [0, -27], [14, -24]]) coin(c, hx + dx, hy + dy, 4);
  c.beginPath(); c.moveTo(hx - 4, hy - 36); c.lineTo(hx, hy - 41); c.lineTo(hx + 4, hy - 36); c.lineTo(hx, hy - 32); c.closePath(); c.fillStyle = '#5FD0F0'; c.fill();
  c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.moveTo(hx - 2, hy - 36.5); c.lineTo(hx, hy - 39); c.lineTo(hx + 0.8, hy - 36.5); c.closePath(); c.fill();
  // ตัวหีบ: ม่วง คาดทอง มุมทอง กุญแจ
  rr(c, hx - 21, hy - 24, 42, 24, 3); paint(c, lg(c, 0, hy - 24, 0, hy, [[0, '#9A58C2'], [1, '#6E3496']]), 'rgba(40,10,60,.6)', 1);
  c.fillStyle = lg(c, 0, hy - 24, 0, hy, GOLD);
  c.fillRect(hx - 21, hy - 24, 42, 3.5); c.fillRect(hx - 21, hy - 4, 42, 3);
  for (const d of [-1, 1]) c.fillRect(hx + d * 14 - 2.5, hy - 24, 5, 24);
  rr(c, hx - 4.5, hy - 17, 9, 10, 2); c.fill();
  c.fillStyle = '#4A1C80'; c.beginPath(); c.arc(hx, hy - 13, 1.6, 0, TAU); c.fill(); c.fillRect(hx - 0.8, hy - 13, 1.6, 3.5);
  // ถ้วยรางวัลบนเบาะกำมะหยี่ (ขวา)
  rr(c, K + 92, COUNTER - 22, 40, 10, 5); paint(c, '#7E3FB8', 'rgba(40,10,60,.6)', 0.9);
  c.fillStyle = '#F2C24A'; for (const d of [-1, 1]) { c.beginPath(); c.arc(K + 112 + d * 19, COUNTER - 14, 2.2, 0, TAU); c.fill(); }
  trophy(c, K + 112, COUNTER - 20, 1.45);
}
function xrLive(c, vw, K, t) {
  for (const sx of [K - 102, K + 102]) flame(c, sx + (sx < K ? 8 : -8), 78, t + sx);
  // ประกายวิบบนทอง
  const pts = [[K - 122, COUNTER - 40], [K - 98, COUNTER - 34], [K + 104, COUNTER - 58], [K + 120, COUNTER - 46], [K, 46], [K - 18, COUNTER + 50]];
  pts.forEach(([x, y], i) => {
    const a = Math.max(0, Math.sin(t * 0.06 + i * 1.9));
    twinkle(c, x, y, 3 + a * 3, '#FFF6C8', a * 0.95);
  });
  motes(c, vw, t, '#FFE89A');
}

export const SHOP_ART = {
  food: { back: foodBack, front: foodFront, live: foodLive },
  care: { back: careBack, front: careFront, live: careLive },
  home: { back: homeBack, front: homeFront, live: homeLive },
  toy: { back: toyBack, front: toyFront, live: toyLive },
  exchange: { back: xrBack, front: xrFront, live: xrLive },
};
