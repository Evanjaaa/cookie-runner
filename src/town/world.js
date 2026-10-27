// src/town/world.js
// ─────────────────────────────────────────────────────────────
// เมืองแมวเหมียว — ข้อมูลแผนที่ + ภาพฉาก (มุมข้าง เดินซ้าย–ขวาเส้นเดียว · GAME_PLAN.md ข้อ 11)
//
// รอบ 2 (ผู้ใช้ 27 ต.ค. ส่งภาพแบบ + บรีฟ): ร้านแต่ละร้านมีรูปทรงของตัวเอง ไม่ใช้แม่แบบร่วม
//   ร้านแลกของกิน = เบเกอรีหลังคาโดมขนมปังหูแมว · ร้านขายยา = บ้านหินหลังคาหมวกแม่มด + หม้อปรุงยา
//   ร้านอัปเกรดอุปกรณ์ = โรงช่างไม้-หิน เฟือง ปล่องไฟ เตาหลอม · ร้านของเล่น = หัวแมวยักษ์ + ลูกโป่ง
//   ร้านแลกของรางวัล = เต็นท์ลายทางฟ้า-ขาว ดาวทอง หีบสมบัติ · ลานกลางเมือง = น้ำพุ ม้านั่ง แปลงดอกไม้
//   ปราสาทแมวเหมียว = หอคอยหลายหลัง ตราหน้าแมว มงกุฎ ธง
//
// หน่วยโลก: สูง 420 (เท่าจอเกม) · เท้าน้องอยู่ที่ GY · กว้าง WORLD_W
// ชั้นภาพ (ไกล → ใกล้): ฟ้า+รุ้ง · ปราสาทไกล เกาะลอย เรือเหาะ · เขา/กังหันลม · ต้นไม้กลาง · ถนน + อาคาร · คันหิน + แม่น้ำ
// ของนิ่งวาดครั้งเดียวเก็บเป็นภาพตามความละเอียดจอ (cached) · ของขยับ (ควัน ลูกโป่ง ฟองยา ไฟเตา ธง น้ำ) วาดสด
//
// ── ใส่ภาพจริงแทนภาพวาดด้วยโค้ด ──
// ตั้ง sprite ของที่นั้นใน PLACES เป็นไฟล์ภาพพื้นใส (เช่น './town/food.png' วางไว้ใน public/town/)
// ภาพถูกย่อให้พอดีกรอบ x..x+w สูงไม่เกิน h ฐานอาคารชิดเส้นถนน (GY) · ประตูอยู่ที่ doorK (สัดส่วนจากซ้าย) — ตั้งให้ตรงภาพ
// ภาพยังไม่โหลด/หาไม่เจอ = วาดด้วยโค้ดตามเดิม · ของขยับ (ควัน ลูกโป่ง ฯลฯ) ปิดเองเมื่อใช้ภาพ
// ─────────────────────────────────────────────────────────────
import { drawItemIcon } from '../render/items.js';
import { drawCat2 } from '../render/cat2.js';
import { skinById } from '../skins.js';

export const H = 420;
export const GY = 330;            // เส้นเท้าน้อง = ขอบหลังของถนน
const ROAD_B = 382;               // ขอบหน้าถนน → คันหิน → แม่น้ำ
export const WORLD_W = 3520;
export const START_X = 150;
const TAU = Math.PI * 2;

/**
 * สถานที่ในเมือง — kind: shop (เปิดหน้าร้านหมวด tab) · bench (นั่งพัก) · castle (ยังไม่เปิด) · deco (ตกแต่ง)
 * doorK = ประตูอยู่ที่สัดส่วนนี้ของความกว้าง (น้องยืนตรงนั้นแล้วใช้งาน) · sprite = ไฟล์ภาพแทนภาพวาด (ดูหัวไฟล์)
 */
export const PLACES = [
  // ระยะห่างระหว่างร้าน ~150 หน่วย (ผู้ใช้ 27 ต.ค.: ห่างขึ้น — ช่องว่างโชว์แถวบ้านด้านหลัง เพิ่มความลึก)
  { id: 'food', kind: 'shop', tab: 'food', name: 'ร้านแลกของกิน', x: 300, w: 270, h: 255, doorK: 0.79, sprite: null },
  { id: 'care', kind: 'shop', tab: 'care', name: 'ร้านขายยา', x: 720, w: 235, h: 290, doorK: 0.76, sprite: null },
  { id: 'home', kind: 'shop', tab: 'home', name: 'ร้านอัปเกรดอุปกรณ์', x: 1105, w: 260, h: 270, doorK: 0.78, sprite: null },
  { id: 'bench1', kind: 'bench', name: 'ม้านั่ง', x: 1500, w: 72, h: 46 },
  { id: 'fountain', kind: 'deco', name: 'ลานกลางเมือง', x: 1610, w: 170, h: 150 },
  { id: 'bench2', kind: 'bench', name: 'ม้านั่ง', x: 1820, w: 72, h: 46 },
  { id: 'toy', kind: 'shop', tab: 'toy', name: 'ร้านของเล่น', x: 2060, w: 270, h: 280, doorK: 0.77, sprite: null },
  { id: 'exchange', kind: 'shop', tab: 'exchange', name: 'ร้านแลกของรางวัล', x: 2480, w: 265, h: 270, doorK: 0.78, sprite: null },
  { id: 'castle', kind: 'castle', name: 'ปราสาทแมวเหมียว', x: 2900, w: 540, h: 330, doorK: 0.5, sprite: null },
];
for (const p of PLACES) p.door = p.x + p.w * (p.doorK ?? 0.5);

/** ตะเกียงริมถนน (บางต้นมีธงห้อย) — เว้นหน้าประตูร้าน */
const LAMPS = [[240, 1], [645, 0], [1030, 1], [1430, 0], [1990, 1], [2405, 0], [2822, 1]];
/** ของตกแต่งในช่องระหว่างร้าน (กระถาง พุ่มไม้ ป้ายบอกทาง ถังไม้) */
const PROPS = [['pot', 690], ['bush', 1068], ['sign', 1470], ['bush', 1950], ['pot', 2445], ['barrel', 2862], ['bush', 3470]];

// ── แคชภาพนิ่ง ────────────────────────────────────────────────
const cache = new Map();
export function clearCache() { cache.clear(); }

/** วาดก้อนนิ่งลงภาพแยกตามสเกลจอปัจจุบัน แล้วแปะ (กรอบ x,y,w,h หน่วยโลก) */
function cached(ctx, key, x, y, w, h, draw) {
  const k = ctx.getTransform().a;
  let e = cache.get(key);
  if (!e || Math.abs(e.k - k) > 0.01) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(w * k));
    cv.height = Math.max(1, Math.ceil(h * k));
    const c = cv.getContext('2d');
    c.scale(k, k);
    c.translate(-x, -y);
    draw(c);
    e = { cv, k };
    cache.set(key, e);
  }
  ctx.drawImage(e.cv, x, y, w, h);
}

/**
 * แสงเงาให้ตึกดูมีปริมาตร (ทาเฉพาะพิกเซลของตึกในภาพแคช — source-atop ไม่เลอะฟ้า)
 * แดดมาจากขวาบน (ดวงอาทิตย์ใน drawSky) → ซีกซ้ายมืดอมม่วง ซีกขวาอุ่นขึ้น · โคนตึกมืดลง (เงาพื้น)
 */
function light(c, x, y, w, h) {
  c.save();
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = lg(c, x, 0, x + w, 0, [[0, 'rgba(70,40,110,.22)'], [0.45, 'rgba(70,40,110,0)'], [1, 'rgba(255,240,200,.16)']]);
  c.fillRect(x, y, w, h);
  c.fillStyle = lg(c, 0, y + h, 0, y + h * 0.62, [[0, 'rgba(70,40,110,.24)'], [1, 'rgba(70,40,110,0)']]);
  c.fillRect(x, y, w, h);
  c.restore();
}
/** เงาตึกตกบนถนน (วงรีจางใต้ฐาน) */
function contactShadow(c, x, w) {
  c.fillStyle = 'rgba(80,40,110,.16)';
  c.beginPath(); c.ellipse(x + w / 2, GY + 5, w * 0.56, 9, 0, 0, TAU); c.fill();
}

// ── ภาพจริง (sprite) ──────────────────────────────────────────
const sprites = new Map();
function spriteOf(p) {
  if (!p.sprite) return null;
  let s = sprites.get(p.sprite);
  if (!s) {
    s = { img: new Image(), ok: false };
    s.img.onload = () => { s.ok = true; };
    s.img.src = p.sprite;
    sprites.set(p.sprite, s);
  }
  return s.ok ? s.img : null;
}
function drawSprite(c, p, img) {
  const k = Math.min(p.w / img.width, p.h / img.height);
  const w = img.width * k, h = img.height * k;
  c.drawImage(img, p.x + (p.w - w) / 2, GY - h, w, h);
}

// ── ตัวช่วยวาด ────────────────────────────────────────────────
export function lg(c, x0, y0, x1, y1, stops) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  return g;
}
export function star(c, x, y, r, rot = -Math.PI / 2) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}
export function heart(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y + r * 0.9);
  c.bezierCurveTo(x - r * 1.45, y - r * 0.1, x - r * 0.65, y - r * 1.15, x, y - r * 0.38);
  c.bezierCurveTo(x + r * 0.65, y - r * 1.15, x + r * 1.45, y - r * 0.1, x, y + r * 0.9);
  c.closePath();
}
/** หูแมวสามเหลี่ยมคู่ (ฐานกลาง x ห่างกัน gap) */
export function ears(c, x, y, gap, size, col, inner) {
  for (const d of [-1, 1]) {
    const ex = x + d * gap;
    c.fillStyle = col;
    c.beginPath(); c.moveTo(ex - size * 0.8 * d, y + size * 0.3); c.lineTo(ex + size * 0.15 * d, y - size); c.lineTo(ex + size * 0.85 * d, y + size * 0.2); c.closePath(); c.fill();
    c.fillStyle = inner;
    c.beginPath(); c.moveTo(ex - size * 0.35 * d, y + size * 0.1); c.lineTo(ex + size * 0.15 * d, y - size * 0.62); c.lineTo(ex + size * 0.48 * d, y + size * 0.05); c.closePath(); c.fill();
  }
}
/** หน้าแมวการ์ตูน (ตาโค้ง/ตากลม แก้มแดง จมูก ปาก หนวด) — ไม่มีวงหน้า (ผู้เรียกวาดพื้นเอง) */
export function catFace(c, x, y, r, happy = true, ink = '#5A3420') {
  c.save();
  c.strokeStyle = ink;
  c.fillStyle = ink;
  c.lineCap = 'round';
  c.lineWidth = Math.max(1.4, r * 0.09);
  if (happy) {
    for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * r * 0.36, y - r * 0.05, r * 0.15, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
  } else {
    for (const d of [-1, 1]) { c.beginPath(); c.ellipse(x + d * r * 0.36, y - r * 0.08, r * 0.11, r * 0.14, 0, 0, TAU); c.fill(); }
  }
  c.fillStyle = 'rgba(255,120,140,.55)';
  for (const d of [-1, 1]) { c.beginPath(); c.ellipse(x + d * r * 0.55, y + r * 0.2, r * 0.16, r * 0.1, 0, 0, TAU); c.fill(); }
  c.fillStyle = '#F07C93';
  c.beginPath(); c.moveTo(x - r * 0.08, y + r * 0.12); c.lineTo(x + r * 0.08, y + r * 0.12); c.lineTo(x, y + r * 0.22); c.closePath(); c.fill();
  c.lineWidth = Math.max(1.1, r * 0.06);
  c.beginPath(); c.moveTo(x - r * 0.16, y + r * 0.3); c.quadraticCurveTo(x - r * 0.08, y + r * 0.38, x, y + r * 0.26); c.quadraticCurveTo(x + r * 0.08, y + r * 0.38, x + r * 0.16, y + r * 0.3); c.stroke();
  c.lineWidth = Math.max(0.8, r * 0.04);
  for (const d of [-1, 1]) for (const k of [-1, 1]) {
    c.beginPath(); c.moveTo(x + d * r * 0.62, y + r * 0.18 + k * r * 0.05); c.lineTo(x + d * r * 0.95, y + r * 0.12 + k * r * 0.12); c.stroke();
  }
  c.restore();
}
/** ป้ายชื่อร้าน — style: { bg, ink, edge, shape: 'round'|'wood'|'ribbon', size } */
function plaque(c, x, y, text, st) {
  c.save();
  c.font = `700 ${st.size || 14}px Mali, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const w = c.measureText(text).width + 30, h = (st.size || 14) + 13;
  const rad = st.shape === 'round' ? h / 2 : 5;
  c.fillStyle = 'rgba(40,10,40,.22)';
  c.beginPath(); c.roundRect(x - w / 2, y - h / 2 + 3, w, h, rad); c.fill();
  if (st.shape === 'ribbon') {
    c.fillStyle = st.edge;
    for (const d of [-1, 1]) {
      const ex = x + d * (w / 2 + 2);
      c.beginPath(); c.moveTo(ex, y - h / 2 + 4); c.lineTo(ex + d * 16, y - h / 2 + 4); c.lineTo(ex + d * 9, y + 2); c.lineTo(ex + d * 16, y + h / 2 + 6); c.lineTo(ex, y + h / 2 + 6); c.closePath(); c.fill();
    }
  }
  c.fillStyle = st.edge;
  c.beginPath(); c.roundRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, rad + 2); c.fill();
  c.fillStyle = st.bg;
  c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, rad); c.fill();
  if (st.shape === 'wood') {
    c.strokeStyle = 'rgba(90,50,20,.25)';
    c.lineWidth = 1;
    for (const yy of [-h / 4, h / 4]) { c.beginPath(); c.moveTo(x - w / 2 + 4, y + yy); c.lineTo(x + w / 2 - 4, y + yy); c.stroke(); }
    c.fillStyle = '#6B4A2E';
    for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * (w / 2 - 6), y, 1.8, 0, TAU); c.fill(); }
  }
  c.fillStyle = st.ink;
  c.fillText(text, x, y + 1);
  c.restore();
}
/** ประตูโค้ง (กลาง cx กว้าง w สูง h) — deco(cx, ขอบบน) วาดลายบนบานประตู */
function archDoor(c, cx, w, h, frame, top, bottom, deco) {
  const dx = cx - w / 2, dy = GY - h;
  c.fillStyle = frame;
  c.beginPath(); c.moveTo(dx - 5, GY); c.lineTo(dx - 5, dy + w / 2); c.arc(cx, dy + w / 2, w / 2 + 5, Math.PI, 0); c.lineTo(dx + w + 5, GY); c.closePath(); c.fill();
  c.fillStyle = lg(c, 0, dy, 0, GY, [[0, top], [1, bottom]]);
  c.beginPath(); c.moveTo(dx, GY); c.lineTo(dx, dy + w / 2); c.arc(cx, dy + w / 2, w / 2, Math.PI, 0); c.lineTo(dx + w, GY); c.closePath(); c.fill();
  c.fillStyle = '#FFD45A';
  c.beginPath(); c.arc(dx + w - 9, dy + h * 0.6, 3, 0, TAU); c.fill();
  if (deco) deco(cx, dy);
}
/** ขวดยากลมคอยาว (ก้นขวดที่ y สูง h) — glow = เรืองแสงรอบขวด */
export function bottle(c, x, y, h, rgb, glow) {
  if (glow) {
    const g = c.createRadialGradient(x, y - h * 0.35, 1, x, y - h * 0.35, h);
    g.addColorStop(0, `rgba(${rgb},.45)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y - h * 0.35, h, 0, TAU); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,.85)';
  c.fillRect(x - h * 0.12, y - h, h * 0.24, h * 0.32);
  c.fillStyle = '#B07A4A';
  c.fillRect(x - h * 0.14, y - h * 1.08, h * 0.28, h * 0.12);
  c.fillStyle = `rgb(${rgb})`;
  c.beginPath(); c.arc(x, y - h * 0.32, h * 0.34, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)';
  c.beginPath(); c.arc(x - h * 0.12, y - h * 0.42, h * 0.08, 0, TAU); c.fill();
}
export function gear(c, x, y, r, teeth, col, hole) {
  c.fillStyle = col;
  c.beginPath();
  const half = Math.PI / (teeth * 2);
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i * Math.PI) / teeth, rr = i % 2 ? r * 0.82 : r;
    c.lineTo(x + Math.cos(a - half) * rr, y + Math.sin(a - half) * rr);
    c.lineTo(x + Math.cos(a + half) * rr, y + Math.sin(a + half) * rr);
  }
  c.closePath();
  c.fill();
  c.fillStyle = hole;
  c.beginPath(); c.arc(x, y, r * 0.55, 0, TAU); c.fill();
}
export function giftBox(c, x, y, s, box, ribbon) {
  c.fillStyle = box;
  c.fillRect(x - s / 2, y - s * 0.8, s, s * 0.8);
  c.fillStyle = 'rgba(255,255,255,.18)';
  c.fillRect(x - s / 2, y - s * 0.8, s, s * 0.18);
  c.fillStyle = ribbon;
  c.fillRect(x - s * 0.1, y - s * 0.8, s * 0.2, s * 0.8);
  c.fillRect(x - s / 2 - 1, y - s * 0.86, s + 2, s * 0.14);
  c.beginPath(); c.ellipse(x - s * 0.18, y - s * 0.94, s * 0.18, s * 0.1, -0.5, 0, TAU); c.ellipse(x + s * 0.18, y - s * 0.94, s * 0.18, s * 0.1, 0.5, 0, TAU); c.fill();
}
export function coin(c, x, y, r) {
  c.fillStyle = lg(c, x, y - r, x, y + r, [[0, '#FFF2A0'], [1, '#E3A11F']]);
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = 'rgba(160,100,10,.45)';
  c.beginPath(); c.arc(x, y, r * 0.6, 0, TAU); c.fill();
  c.fillStyle = '#FFF6C8';
  c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.22, 0, TAU); c.fill();
}
export function bush(c, x, y, s, col) {
  c.fillStyle = col;
  c.beginPath(); c.arc(x - s * 0.5, y - s * 0.45, s * 0.55, 0, TAU); c.arc(x + s * 0.5, y - s * 0.45, s * 0.55, 0, TAU); c.arc(x, y - s * 0.8, s * 0.65, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.22)';
  c.beginPath(); c.arc(x - s * 0.25, y - s * 0.95, s * 0.25, 0, TAU); c.fill();
}
export function flowers(c, x, y, n, cols) {
  for (let i = 0; i < n; i++) {
    const fx = x + i * 8, fy = y - (i % 2) * 4;
    c.fillStyle = '#7CC67A';
    c.fillRect(fx - 0.8, fy, 1.6, 7);
    c.fillStyle = cols[i % cols.length];
    for (let k = 0; k < 5; k++) { const a = (k * TAU) / 5; c.beginPath(); c.arc(fx + Math.cos(a) * 2.4, fy + Math.sin(a) * 2.4, 1.9, 0, TAU); c.fill(); }
    c.fillStyle = '#FFE680';
    c.beginPath(); c.arc(fx, fy, 1.4, 0, TAU); c.fill();
  }
}
/** กันสาดชายหยัก (ลายทางสลับ cols) จาก x0 ถึง x1 ที่ระดับ y */
function awning(c, x0, x1, y, n, cols, hh = 20) {
  const sw = (x1 - x0) / n;
  c.save();
  c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.lineTo(x1, y + hh);
  for (let i = 0; i < n; i++) { const sx = x1 - i * sw; c.quadraticCurveTo(sx - sw / 2, y + hh + 10, sx - sw, y + hh); }
  c.closePath(); c.clip();
  for (let i = 0; i < n; i++) { c.fillStyle = cols[i % cols.length]; c.fillRect(x0 + i * sw, y, sw + 0.5, hh + 12); }
  c.fillStyle = 'rgba(255,255,255,.25)';
  c.fillRect(x0, y, x1 - x0, 5);
  c.restore();
}

// ══ ร้านแลกของกิน — เบเกอรีหลังคาโดมขนมปังหูแมว ═════════════════
function drawBakery(c, p) {
  const { x, w } = p, cx = x + w / 2;
  const wallTop = GY - 150;
  // ผนังครีม + โครงไม้
  c.fillStyle = lg(c, 0, wallTop, 0, GY, [[0, '#FFF3DE'], [1, '#FBE0C0']]);
  c.fillRect(x + 18, wallTop, w - 36, 150);
  c.fillStyle = '#C98A55';
  for (const bx of [x + 18, x + w / 2 - 4, x + w - 26]) c.fillRect(bx, wallTop, 8, 150);
  c.fillRect(x + 18, GY - 100, w - 36, 6);
  // หลังคาโดมขนมปัง (ครึ่งวงรี) + รอยกรีดขนม
  const dy = wallTop + 4;
  ears(c, cx, dy - 84, 74, 30, '#F2B060', '#FFC9D4');
  c.save();
  c.beginPath(); c.ellipse(cx, dy, w / 2 + 6, 98, 0, Math.PI, TAU); c.closePath(); c.clip();
  c.fillStyle = lg(c, 0, dy - 98, 0, dy, [[0, '#FFE6AE'], [0.6, '#F6BE6E'], [1, '#E09A4E']]);
  c.fillRect(x - 10, dy - 100, w + 20, 100);
  c.strokeStyle = 'rgba(255,255,255,.55)';
  c.lineWidth = 4;
  c.lineCap = 'round';
  for (const k of [-0.62, 0.62]) { const sx = cx + k * w * 0.4; c.beginPath(); c.moveTo(sx - 14, dy - 52); c.quadraticCurveTo(sx, dy - 62, sx + 14, dy - 52); c.stroke(); }
  c.restore();
  // ไอซิ่งย้อยขอบโดม
  c.fillStyle = '#FFF8F2';
  c.beginPath();
  c.moveTo(x - 6, dy);
  for (let i = 1; i <= 12; i++) { const px = x - 6 + (i * (w + 12)) / 12; c.quadraticCurveTo(px - (w + 12) / 24, dy + (i % 2 ? 16 : 9), px, dy); }
  c.lineTo(x + w + 6, dy - 6);
  c.lineTo(x - 6, dy - 6);
  c.closePath();
  c.fill();
  // ตราหน้าแมวบนโดม
  c.fillStyle = '#FFF8EC';
  c.beginPath(); c.arc(cx, dy - 50, 28, 0, TAU); c.fill();
  c.strokeStyle = '#E09A4E'; c.lineWidth = 3; c.stroke();
  catFace(c, cx, dy - 48, 24, true);
  // กันสาดลายทางชมพู-ครีม + ป้ายชื่อ
  awning(c, x - 4, x + w + 4, wallTop + 18, 9, ['#FF8FB3', '#FFF6F0'], 20);
  // ป้ายชื่ออยู่เหนือตู้โชว์ (ซ้ายของประตู) — ตรงกลางร้านโดนน้องกับป้าย "เข้าร้าน" บังตอนยืนหน้าประตู
  plaque(c, x + w * 0.36, GY - 96, p.name, { bg: '#FFF8EC', ink: '#B8652A', edge: '#E9A05A', shape: 'round', size: 13 });
  // ตู้โชว์ขนม (ซ้าย)
  const sx0 = x + 30, sx1 = x + w * 0.6;
  c.fillStyle = '#8E5A34';
  c.fillRect(sx0 - 4, GY - 66, sx1 - sx0 + 8, 8);
  c.fillStyle = lg(c, 0, GY - 58, 0, GY, [[0, '#FFFFFF'], [1, '#F6E6FF']]);
  c.fillRect(sx0, GY - 58, sx1 - sx0, 44);
  c.fillStyle = '#B97A48';
  c.fillRect(sx0 - 4, GY - 14, sx1 - sx0 + 8, 14);
  const step = (sx1 - sx0 - 32) / 3;
  for (let i = 0; i < 4; i++) {
    const bx = sx0 + 16 + i * step;
    c.fillStyle = i % 2 ? '#E8A65A' : '#F2C27A';
    c.beginPath(); c.ellipse(bx, GY - 66, 12, 8, 0, Math.PI, TAU); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(bx - 5, GY - 71); c.lineTo(bx - 2, GY - 67); c.moveTo(bx + 1, GY - 72); c.lineTo(bx + 4, GY - 68); c.stroke();
  }
  const inner = [
    (ix) => { c.fillStyle = '#FFE0EA'; c.fillRect(ix - 11, GY - 36, 22, 16); c.fillStyle = '#FF8FB3'; c.fillRect(ix - 11, GY - 40, 22, 5); c.fillStyle = '#E8334A'; c.beginPath(); c.arc(ix, GY - 43, 3, 0, TAU); c.fill(); },
    (ix) => { c.fillStyle = '#C98A55'; c.beginPath(); c.moveTo(ix - 8, GY - 32); c.lineTo(ix + 8, GY - 32); c.lineTo(ix + 6, GY - 20); c.lineTo(ix - 6, GY - 20); c.closePath(); c.fill(); c.fillStyle = '#FFF0F6'; c.beginPath(); c.arc(ix - 4, GY - 35, 5, 0, TAU); c.arc(ix + 4, GY - 35, 5, 0, TAU); c.arc(ix, GY - 40, 5, 0, TAU); c.fill(); },
    (ix) => { c.save(); c.translate(ix - 12, GY - 46); c.scale(0.6, 0.6); drawItemIcon(c, 'fish'); c.restore(); },
  ];
  for (let i = 0; i < 4; i++) inner[i % 3](sx0 + 16 + i * step);
  c.fillStyle = 'rgba(255,255,255,.45)';
  c.beginPath(); c.moveTo(sx0 + 6, GY - 16); c.lineTo(sx0 + 18, GY - 56); c.lineTo(sx0 + 25, GY - 56); c.lineTo(sx0 + 13, GY - 16); c.closePath(); c.fill();
  // ประตูไม้ + หน้าต่างหัวใจ
  archDoor(c, p.door, 50, 92, '#8E5A34', '#E8A66A', '#B9743E', (dcx, dyy) => {
    c.fillStyle = '#FFE9C8';
    heart(c, dcx, dyy + 30, 9); c.fill();
  });
  // กระดานเมนูตั้งพื้น (หน้าร้านซ้าย)
  const bx = x + 8;
  c.fillStyle = '#8E5A34';
  c.fillRect(bx - 9, GY - 18, 3, 18); c.fillRect(bx + 6, GY - 18, 3, 18);
  c.fillStyle = '#3E4A44';
  c.fillRect(bx - 12, GY - 48, 24, 32);
  c.strokeStyle = '#8E5A34'; c.lineWidth = 2; c.strokeRect(bx - 12, GY - 48, 24, 32);
  c.strokeStyle = '#FFFFFF'; c.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(bx - 8, GY - 41 + i * 7); c.lineTo(bx + (i === 1 ? 4 : 8), GY - 41 + i * 7); c.stroke(); }
  c.fillStyle = '#FF8FB3';
  heart(c, bx + 6, GY - 22, 3); c.fill();
  flowers(c, x + w - 18, GY - 6, 3, ['#FF8FB3', '#FFFFFF', '#FFD45A']);
}

// ══ ร้านขายยา — บ้านหินม่วง หลังคาหมวกแม่มด ขวดยาเรือง หม้อปรุงยา ═══════
function drawPotion(c, p) {
  const { x, w } = p, cx = x + w / 2;
  const wallTop = GY - 158;
  // หอกลมข้างซ้าย
  c.fillStyle = lg(c, 0, GY - 190, 0, GY, [[0, '#7E62B8'], [1, '#5A3F92']]);
  c.beginPath(); c.roundRect(x + 2, GY - 190, 54, 190, [27, 27, 0, 0]); c.fill();
  c.fillStyle = '#3E2A6E';
  c.beginPath(); c.moveTo(x - 6, GY - 184); c.lineTo(x + 29, GY - 232); c.lineTo(x + 64, GY - 184); c.closePath(); c.fill();
  c.fillStyle = '#FFE89A';
  c.beginPath(); c.roundRect(x + 21, GY - 160, 16, 24, [8, 8, 2, 2]); c.fill();
  // ผนังหิน
  c.fillStyle = lg(c, 0, wallTop, 0, GY, [[0, '#8A6CC4'], [1, '#61449C']]);
  c.fillRect(x + 30, wallTop, w - 46, 158);
  c.strokeStyle = 'rgba(40,20,80,.25)';
  c.lineWidth = 1.2;
  for (let r = 0; r < 7; r++) {
    const yy = wallTop + 12 + r * 22;
    c.beginPath(); c.moveTo(x + 30, yy); c.lineTo(x + w - 16, yy); c.stroke();
    for (let bx = x + 30 + (r % 2) * 18; bx < x + w - 16; bx += 36) { c.beginPath(); c.moveTo(bx, yy); c.lineTo(bx, yy + 22); c.stroke(); }
  }
  // หมวกแม่มด (ปีกหมวก + กรวยงอปลาย)
  c.fillStyle = '#3B2370';
  c.beginPath(); c.ellipse(cx + 6, wallTop + 2, w / 2 + 12, 16, 0, 0, TAU); c.fill();
  c.fillStyle = lg(c, cx - 60, 0, cx + 70, 0, [[0, '#5B3A9E'], [0.5, '#4A2C8A'], [1, '#33195F']]);
  c.beginPath();
  c.moveTo(cx - 70, wallTop - 2);
  c.quadraticCurveTo(cx - 30, wallTop - 70, cx - 6, wallTop - 112);
  c.quadraticCurveTo(cx + 10, wallTop - 138, cx + 56, wallTop - 124);
  c.quadraticCurveTo(cx + 24, wallTop - 114, cx + 30, wallTop - 80);
  c.quadraticCurveTo(cx + 44, wallTop - 30, cx + 82, wallTop - 2);
  c.closePath();
  c.fill();
  // แถบทอง + ตราหน้าแมว + ดาว
  c.fillStyle = '#E7B640';
  c.beginPath(); c.moveTo(cx - 62, wallTop - 14); c.quadraticCurveTo(cx + 6, wallTop - 26, cx + 74, wallTop - 14); c.lineTo(cx + 78, wallTop - 2); c.quadraticCurveTo(cx + 6, wallTop - 14, cx - 66, wallTop - 2); c.closePath(); c.fill();
  c.fillStyle = '#FFF4C0';
  c.beginPath(); c.arc(cx + 6, wallTop - 48, 21, 0, TAU); c.fill();
  c.fillStyle = '#6A4CB0';
  c.beginPath(); c.arc(cx + 6, wallTop - 48, 17, 0, TAU); c.fill();
  catFace(c, cx + 6, wallTop - 47, 14, false, '#FFF4C0');
  c.fillStyle = '#FFE89A';
  for (const [sx, sy, r] of [[cx - 34, wallTop - 70, 4], [cx + 30, wallTop - 96, 3], [cx - 8, wallTop - 100, 3.5]]) { star(c, sx, sy, r); c.fill(); }
  // หน้าต่างโค้งชั้นวางยาเรือง
  const wx = x + 44, wy = GY - 128, ww = w * 0.42, wh = 84;
  c.fillStyle = '#3E2A6E';
  c.beginPath(); c.roundRect(wx - 5, wy - 5, ww + 10, wh + 10, [40, 40, 6, 6]); c.fill();
  c.fillStyle = lg(c, 0, wy, 0, wy + wh, [[0, '#2E1D5A'], [1, '#4A2F86']]);
  c.beginPath(); c.roundRect(wx, wy, ww, wh, [36, 36, 4, 4]); c.fill();
  const cols = ['255,120,170', '120,220,255', '160,240,140', '255,214,90', '200,150,255'];
  for (let r = 0; r < 2; r++) {
    const sy = wy + 44 + r * 34;
    c.fillStyle = '#8E5A34';
    c.fillRect(wx + 4, sy, ww - 8, 4);
    for (let i = 0; i < 4; i++) bottle(c, wx + 14 + i * ((ww - 28) / 3), sy, 15 + ((i + r) % 3) * 3, cols[(i + r * 2) % 5], true);
  }
  // สมุนไพรห้อยใต้ปีกหมวก
  for (const hx of [x + 50, x + w * 0.52, x + w - 30]) {
    c.strokeStyle = '#6B4A2E'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(hx, wallTop + 14); c.lineTo(hx, wallTop + 24); c.stroke();
    c.fillStyle = '#7CC67A';
    for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(hx + (k % 2 ? 3 : -3), wallTop + 26 + k * 4, 3.4, 2, k % 2 ? 0.5 : -0.5, 0, TAU); c.fill(); }
  }
  // ประตูม่วงที่เคาะรูปดาว
  archDoor(c, p.door, 46, 88, '#3E2A6E', '#A889E6', '#6E4CB8', (dcx, dyy) => {
    c.fillStyle = '#FFE89A';
    star(c, dcx, dyy + 32, 8); c.fill();
  });
  // หม้อปรุงยา (หน้าร้านซ้าย)
  const kx = x + 18;
  c.fillStyle = '#5A4A6A';
  c.fillRect(kx - 14, GY - 6, 4, 6); c.fillRect(kx + 10, GY - 6, 4, 6);
  c.fillStyle = '#2E2638';
  c.beginPath(); c.ellipse(kx, GY - 20, 20, 17, 0, 0, TAU); c.fill();
  c.fillStyle = '#4A3E58';
  c.beginPath(); c.ellipse(kx, GY - 34, 21, 5, 0, 0, TAU); c.fill();
  c.fillStyle = '#7CF0A0';
  c.beginPath(); c.ellipse(kx, GY - 34, 17, 3.6, 0, 0, TAU); c.fill();
  plaque(c, cx + 8, wallTop + 26 + 8, p.name, { bg: '#FFF4C0', ink: '#4A2C8A', edge: '#E7B640', shape: 'round', size: 13 });
}
/** ฟองยาลอยจากหม้อ (สด) */
function drawPotionLive(c, p, t) {
  const kx = p.x + 18;
  for (let i = 0; i < 4; i++) {
    const u = ((t * 0.012 + i / 4) % 1);
    c.globalAlpha = 1 - u;
    c.fillStyle = i % 2 ? '#B6FFCB' : '#E2C9FF';
    c.beginPath(); c.arc(kx + Math.sin(t * 0.05 + i * 2) * 6, GY - 38 - u * 40, 2 + u * 3, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
}

// ══ ร้านอัปเกรดอุปกรณ์ — โรงช่างไม้-หิน เฟือง ค้อน ปล่องไฟ เตาหลอม ══════
function drawWorkshop(c, p) {
  const { x, w } = p, cx = x + w / 2;
  const wallTop = GY - 160;
  // ปล่องไฟ (ซ้าย)
  c.fillStyle = '#8C8076';
  c.fillRect(x + 34, GY - 252, 28, 70);
  c.fillStyle = '#6E635A';
  c.fillRect(x + 30, GY - 258, 36, 10);
  // ฐานหิน
  c.fillStyle = lg(c, 0, GY - 46, 0, GY, [[0, '#B8AFA6'], [1, '#948A80']]);
  c.fillRect(x + 8, GY - 46, w - 16, 46);
  c.strokeStyle = 'rgba(60,50,40,.3)';
  c.lineWidth = 1.2;
  for (let r = 0; r < 2; r++) for (let bx = x + 8 + (r % 2) * 16; bx < x + w - 24; bx += 32) c.strokeRect(bx, GY - 46 + r * 23, 32, 23);
  // ผนังไม้กระดาน
  c.fillStyle = lg(c, 0, wallTop, 0, GY - 46, [[0, '#C88752'], [1, '#A86B3C']]);
  c.fillRect(x + 12, wallTop, w - 24, 114);
  c.strokeStyle = 'rgba(80,40,15,.35)';
  for (let yy = wallTop + 14; yy < GY - 46; yy += 14) { c.beginPath(); c.moveTo(x + 12, yy); c.lineTo(x + w - 12, yy); c.stroke(); }
  c.fillStyle = '#6B3E26';
  for (const bx of [x + 12, x + w - 22]) c.fillRect(bx, wallTop, 10, 114);
  // หลังคาจั่วกระเบื้อง
  c.fillStyle = '#6B3E26';
  c.beginPath(); c.moveTo(x - 10, wallTop + 4); c.lineTo(cx, GY - 262); c.lineTo(x + w + 10, wallTop + 4); c.closePath(); c.fill();
  c.save();
  c.beginPath(); c.moveTo(x - 4, wallTop); c.lineTo(cx, GY - 254); c.lineTo(x + w + 4, wallTop); c.closePath(); c.clip();
  for (let r = 0; r < 8; r++) {
    const yy = wallTop - 8 - r * 13;
    c.fillStyle = r % 2 ? '#8A5234' : '#9C603E';
    for (let bx = x - 20 + (r % 2) * 9; bx < x + w + 20; bx += 18) { c.beginPath(); c.roundRect(bx, yy, 17, 14, [0, 0, 7, 7]); c.fill(); }
  }
  c.restore();
  // เฟืองใหญ่ + ค้อนไขว้ประแจ
  const gx = cx, gyy = GY - 196;
  gear(c, gx, gyy, 36, 10, '#B9B2A8', '#7E766E');
  c.fillStyle = '#D8D2CA';
  c.beginPath(); c.arc(gx, gyy, 16, 0, TAU); c.fill();
  c.save();
  c.translate(gx, gyy);
  for (const d of [-1, 1]) {
    c.save();
    c.rotate(d * 0.7);
    c.fillStyle = '#8E5A34';
    c.fillRect(-3, -30, 6, 56);
    c.fillStyle = '#5E6670';
    if (d < 0) c.fillRect(-12, -36, 24, 12);
    else { c.beginPath(); c.arc(0, -32, 9, 0, TAU); c.fill(); c.fillStyle = '#D8D2CA'; c.fillRect(-3, -42, 6, 10); }
    c.restore();
  }
  c.restore();
  // ป้ายไม้ตอกตะปู
  plaque(c, cx, wallTop + 18, p.name, { bg: '#F2D2A4', ink: '#5A3218', edge: '#7A4A2A', shape: 'wood', size: 12.5 });
  // ชั้นเครื่องมือบนผนัง
  c.fillStyle = '#5E3A22';
  c.fillRect(x + w * 0.38, GY - 112, 58, 4);
  for (let i = 0; i < 4; i++) {
    const tx = x + w * 0.38 + 9 + i * 13;
    c.fillStyle = '#8E5A34'; c.fillRect(tx - 1.5, GY - 108, 3, 22);
    c.fillStyle = '#6F7882';
    if (i % 2) c.fillRect(tx - 6, GY - 110, 12, 6);
    else { c.beginPath(); c.arc(tx, GY - 86, 4.5, 0, TAU); c.fill(); }
  }
  // เตาหลอม (ซ้ายล่าง) + ทั่ง
  const fx = x + 52;
  c.fillStyle = '#6E635A';
  c.beginPath(); c.roundRect(fx - 34, GY - 92, 68, 92, [34, 34, 0, 0]); c.fill();
  c.fillStyle = '#2E2420';
  c.beginPath(); c.roundRect(fx - 24, GY - 70, 48, 58, [24, 24, 0, 0]); c.fill();
  c.fillStyle = '#4E555E';
  c.beginPath(); c.moveTo(fx + 36, GY - 30); c.lineTo(fx + 72, GY - 30); c.lineTo(fx + 66, GY - 22); c.lineTo(fx + 60, GY - 22); c.lineTo(fx + 62, GY); c.lineTo(fx + 46, GY); c.lineTo(fx + 48, GY - 22); c.lineTo(fx + 40, GY - 22); c.closePath(); c.fill();
  // ประตูไม้หนาคาดเหล็ก
  archDoor(c, p.door, 48, 90, '#5E3A22', '#B07040', '#8A5230', (dcx, dyy) => {
    c.fillStyle = '#5E6670';
    c.fillRect(dcx - 24, dyy + 44, 48, 5);
    c.fillRect(dcx - 24, dyy + 70, 48, 5);
  });
  // ถังไม้ (ขวาหน้าร้าน)
  const bx = x + w - 6;
  c.fillStyle = '#9C6A3E';
  c.beginPath(); c.ellipse(bx, GY - 15, 12, 16, 0, 0, TAU); c.fill();
  c.fillStyle = '#6F7882';
  c.fillRect(bx - 12, GY - 22, 24, 3); c.fillRect(bx - 12, GY - 10, 24, 3);
}
/** ไฟเตาหลอม + ควันปล่องไฟ (สด) */
function drawWorkshopLive(c, p, t) {
  const fx = p.x + 52;
  const f = 0.8 + 0.2 * Math.sin(t * 0.23) + 0.1 * Math.sin(t * 0.61);
  const g = c.createRadialGradient(fx, GY - 30, 2, fx, GY - 30, 40 * f);
  g.addColorStop(0, 'rgba(255,230,140,.95)');
  g.addColorStop(0.4, 'rgba(255,140,60,.75)');
  g.addColorStop(1, 'rgba(255,90,40,0)');
  c.fillStyle = g;
  c.beginPath(); c.roundRect(fx - 24, GY - 70, 48, 58, [24, 24, 0, 0]); c.fill();
  c.fillStyle = '#FFB347';
  for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(fx - 10 + i * 10, GY - 22 - Math.abs(Math.sin(t * 0.2 + i)) * 10, 5, 10 * f, 0, 0, TAU); c.fill(); }
  for (let i = 0; i < 4; i++) {
    const u = ((t * 0.006 + i / 4) % 1);
    c.globalAlpha = 0.55 * (1 - u);
    c.fillStyle = '#F4EEF8';
    c.beginPath(); c.arc(p.x + 48 + u * 26 + Math.sin(t * 0.03 + i) * 4, GY - 262 - u * 50, 7 + u * 12, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
}

// ══ ร้านของเล่น — ตึกนุ่มสีพาสเทล หัวแมวยักษ์บนหลังคา ลูกโป่ง ══════════
function drawToy(c, p) {
  const { x, w } = p, cx = x + w / 2;
  const wallTop = GY - 138;
  c.fillStyle = lg(c, 0, wallTop, 0, GY, [[0, '#FFF0F7'], [1, '#FFD8EA']]);
  c.beginPath(); c.roundRect(x + 14, wallTop, w - 28, 138, [26, 26, 0, 0]); c.fill();
  c.fillStyle = '#BDEBDD';
  c.fillRect(x + 14, GY - 18, w - 28, 18);
  c.fillStyle = 'rgba(255,255,255,.5)';
  for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(x + 30 + i * ((w - 60) / 8), GY - 9, 3, 0, TAU); c.fill(); }
  // หัวแมวยักษ์บนหลังคา
  const hy = wallTop - 44, hr = 72;
  ears(c, cx, hy - hr * 0.55, hr * 0.66, 34, '#FFB5CF', '#FF8FB3');
  c.fillStyle = lg(c, 0, hy - hr, 0, hy + hr, [[0, '#FFD2E2'], [1, '#FFAACA']]);
  c.beginPath(); c.ellipse(cx, hy, hr * 1.1, hr * 0.84, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)';
  c.beginPath(); c.ellipse(cx - hr * 0.42, hy - hr * 0.45, hr * 0.3, hr * 0.14, -0.4, 0, TAU); c.fill();
  catFace(c, cx, hy + 2, hr * 0.62, true, '#8A2E5A');
  // ป้ายชื่อ + กันสาดลายลูกกวาดสีรุ้ง
  awning(c, x + 10, x + w - 10, wallTop + 22, 9, ['#FF8FB3', '#FFFFFF', '#FFD45A', '#FFFFFF', '#8EE0C2', '#FFFFFF', '#9FD3FF', '#FFFFFF', '#C8A8F5'], 18);
  plaque(c, x + w * 0.4, wallTop + 4, p.name, { bg: '#FFFFFF', ink: '#D2447E', edge: '#FF8FB3', shape: 'round', size: 13 });
  // หน้าต่างโชว์ของเล่น
  const wx = x + 26, wy = GY - 92, ww = w * 0.5, wh = 66;
  c.fillStyle = '#FF8FB3';
  c.beginPath(); c.roundRect(wx - 5, wy - 5, ww + 10, wh + 10, 16); c.fill();
  c.fillStyle = lg(c, 0, wy, 0, wy + wh, [[0, '#FFFFFF'], [1, '#FFF0F8']]);
  c.beginPath(); c.roundRect(wx, wy, ww, wh, 12); c.fill();
  for (const [ix, id] of [[0.18, 'yarn'], [0.82, 'ball']]) { c.save(); c.translate(wx + ww * ix - 14, wy + 30); c.scale(0.7, 0.7); drawItemIcon(c, id); c.restore(); }
  // ตุ๊กตาแมวนั่งกลางหน้าต่าง
  const dx = wx + ww * 0.5;
  c.fillStyle = '#FFE6A8';
  c.beginPath(); c.ellipse(dx, wy + 50, 11, 10, 0, 0, TAU); c.fill();
  c.beginPath(); c.arc(dx, wy + 32, 12, 0, TAU); c.fill();
  ears(c, dx, wy + 23, 7, 6, '#FFE6A8', '#FFB5CF');
  catFace(c, dx, wy + 33, 10, true);
  // ประตูชมพูหน้าต่างหัวใจ
  archDoor(c, p.door, 48, 86, '#FF8FB3', '#FFD2E2', '#FF9FC2', (dcx, dyy) => {
    c.fillStyle = '#FFFFFF';
    heart(c, dcx, dyy + 30, 9); c.fill();
  });
  flowers(c, x + 6, GY - 4, 3, ['#FFD45A', '#9FD3FF', '#FF8FB3']);
}
/** ลูกโป่งสองช่อ ลอยโยก (สด) */
function drawToyLive(c, p, t) {
  const sets = [[p.x + 2, GY - 150, -1], [p.x + p.w - 2, GY - 160, 1]];
  const cols = ['#FF8FB3', '#FFD45A', '#8EE0C2', '#9FD3FF', '#C8A8F5'];
  for (const [bx, by, d] of sets) {
    for (let i = 0; i < 4; i++) {
      const sx = bx + d * (i % 2 ? 14 : -4) + Math.sin(t * 0.03 + i + bx) * 3;
      const sy = by - i * 18 - (i % 2) * 6 + Math.sin(t * 0.04 + i) * 2;
      c.strokeStyle = 'rgba(120,80,110,.5)';
      c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(sx, sy + 13); c.quadraticCurveTo(sx + 3, (sy + by + 60) / 2, bx, by + 60); c.stroke();
      c.fillStyle = cols[(i + (d > 0 ? 2 : 0)) % cols.length];
      c.beginPath(); c.ellipse(sx, sy, 11, 13, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)';
      c.beginPath(); c.ellipse(sx - 4, sy - 5, 3, 4.5, -0.4, 0, TAU); c.fill();
    }
  }
}

// ══ ร้านแลกของรางวัล — เต็นท์ลายทางฟ้า-ขาว ดาวทอง หีบสมบัติ ══════════
function drawReward(c, p) {
  const { x, w } = p, cx = x + w / 2;
  const wallTop = GY - 132;
  // ผนังผ้าใต้เต็นท์ (กรมท่า ขอบทอง)
  c.fillStyle = lg(c, 0, wallTop, 0, GY, [[0, '#3E5BB8'], [1, '#2C418E']]);
  c.fillRect(x + 14, wallTop, w - 28, 132);
  c.fillStyle = '#E7B640';
  c.fillRect(x + 14, GY - 10, w - 28, 4);
  // หลังคาเต็นท์ทรงโค้ง ลายทางลู่เข้ายอด
  const peakY = GY - 245;
  c.save();
  c.beginPath();
  c.moveTo(x - 6, wallTop + 6);
  c.quadraticCurveTo(cx - w * 0.2, wallTop - 40, cx, peakY);
  c.quadraticCurveTo(cx + w * 0.2, wallTop - 40, x + w + 6, wallTop + 6);
  c.closePath();
  c.clip();
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a0 = x - 6 + (i * (w + 12)) / n, a1 = x - 6 + ((i + 1) * (w + 12)) / n;
    c.fillStyle = i % 2 ? '#F4F7FF' : '#4E78E0';
    c.beginPath(); c.moveTo(cx, peakY); c.lineTo(a0, wallTop + 8); c.lineTo(a1, wallTop + 8); c.closePath(); c.fill();
  }
  c.restore();
  // ระบายชายเต็นท์ (ฟ้า/ทอง)
  for (let i = 0; i < 10; i++) {
    const vx = x - 6 + (i * (w + 12)) / 10, vw2 = (w + 12) / 10;
    c.fillStyle = i % 2 ? '#E7B640' : '#4E78E0';
    c.beginPath(); c.moveTo(vx, wallTop + 4); c.lineTo(vx + vw2, wallTop + 4); c.quadraticCurveTo(vx + vw2 / 2, wallTop + 26, vx, wallTop + 4); c.fill();
  }
  // ตราโล่ดาวบนยอด
  const sy = peakY + 32;
  c.fillStyle = '#E7B640';
  c.beginPath(); c.moveTo(cx - 22, sy - 22); c.lineTo(cx + 22, sy - 22); c.lineTo(cx + 22, sy + 4); c.quadraticCurveTo(cx, sy + 26, cx - 22, sy + 4); c.closePath(); c.fill();
  c.fillStyle = '#3E5BB8';
  c.beginPath(); c.moveTo(cx - 17, sy - 17); c.lineTo(cx + 17, sy - 17); c.lineTo(cx + 17, sy + 2); c.quadraticCurveTo(cx, sy + 19, cx - 17, sy + 2); c.closePath(); c.fill();
  c.fillStyle = '#FFE680';
  star(c, cx, sy - 2, 11); c.fill();
  // ป้ายริบบิ้น
  plaque(c, cx, wallTop - 34, p.name, { bg: '#FFF4D0', ink: '#2C418E', edge: '#E7B640', shape: 'ribbon', size: 12.5 });
  // ตู้โชว์รางวัล: กล่องของขวัญ ถ้วย เหรียญ ดาว
  const dx0 = x + 24, dx1 = x + w * 0.6;
  c.fillStyle = '#E7B640';
  c.fillRect(dx0 - 4, GY - 74, dx1 - dx0 + 8, 5);
  c.fillStyle = 'rgba(220,235,255,.9)';
  c.fillRect(dx0, GY - 69, dx1 - dx0, 50);
  c.fillStyle = '#8E5A34';
  c.fillRect(dx0 - 4, GY - 19, dx1 - dx0 + 8, 19);
  giftBox(c, dx0 + 16, GY - 75, 18, '#FF8FB3', '#FFFFFF');
  giftBox(c, dx0 + 42, GY - 75, 14, '#8EE0C2', '#E7B640');
  const tx = dx0 + (dx1 - dx0) * 0.72;
  c.fillStyle = '#FFD45A';
  c.beginPath(); c.moveTo(tx - 11, GY - 98); c.lineTo(tx + 11, GY - 98); c.quadraticCurveTo(tx + 10, GY - 84, tx, GY - 82); c.quadraticCurveTo(tx - 10, GY - 84, tx - 11, GY - 98); c.fill();
  c.fillRect(tx - 2, GY - 82, 4, 6);
  c.fillRect(tx - 7, GY - 77, 14, 3);
  c.strokeStyle = '#FFD45A'; c.lineWidth = 2;
  c.beginPath(); c.arc(tx - 11, GY - 93, 4, Math.PI * 0.5, Math.PI * 1.5); c.stroke();
  c.beginPath(); c.arc(tx + 11, GY - 93, 4, -Math.PI * 0.5, Math.PI * 0.5); c.stroke();
  for (let i = 0; i < 4; i++) coin(c, dx0 + 14 + i * 13, GY - 34 - (i % 2) * 6, 6);
  c.fillStyle = '#FFE680';
  star(c, dx1 - 14, GY - 40, 8); c.fill();
  // ม่านทางเข้า
  archDoor(c, p.door, 50, 92, '#E7B640', '#8E2E5A', '#5E1E40', (dcx, dyy) => {
    c.fillStyle = '#C24F7E';
    c.beginPath(); c.moveTo(dcx - 25, dyy + 25); c.quadraticCurveTo(dcx - 8, dyy + 50, dcx - 22, GY); c.lineTo(dcx - 25, GY); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(dcx + 25, dyy + 25); c.quadraticCurveTo(dcx + 8, dyy + 50, dcx + 22, GY); c.lineTo(dcx + 25, GY); c.closePath(); c.fill();
  });
  // หีบสมบัติหน้าร้าน (ซ้าย)
  const kx = x + 4;
  c.fillStyle = '#9C5E34';
  c.fillRect(kx - 14, GY - 20, 28, 20);
  c.beginPath(); c.roundRect(kx - 14, GY - 30, 28, 12, [8, 8, 0, 0]); c.fill();
  c.fillStyle = '#E7B640';
  c.fillRect(kx - 14, GY - 20, 28, 3); c.fillRect(kx - 2, GY - 24, 4, 8);
  coin(c, kx + 8, GY - 31, 4);
}
function drawRewardLive(c, p, t) {
  const cx = p.x + p.w / 2, fy = GY - 245;
  c.strokeStyle = '#8A6BC8'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(cx, fy + 2); c.lineTo(cx, fy - 26); c.stroke();
  const s = Math.sin(t * 0.09) * 3;
  c.fillStyle = '#FF7EB0';
  c.beginPath(); c.moveTo(cx + 1, fy - 26); c.quadraticCurveTo(cx + 11, fy - 23 + s, cx + 22, fy - 20); c.quadraticCurveTo(cx + 11, fy - 17 + s, cx + 1, fy - 14); c.closePath(); c.fill();
  for (let i = 0; i < 3; i++) {
    const a = t * 0.04 + (i * TAU) / 3;
    c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 0.1 + i);
    c.fillStyle = '#FFF4B0';
    star(c, cx + Math.cos(a) * 34, fy + 30 + Math.sin(a) * 16, 3); c.fill();
  }
  c.globalAlpha = 1;
}

// ══ ลานกลางเมือง — ลานกระเบื้อง น้ำพุสองชั้นแมวหิน แปลงดอกไม้ ต้นไม้ดอก ══
function drawPlaza(c, p) {
  const cx = p.x + p.w / 2;
  for (const [tx, s] of [[cx - 180, 1], [cx + 180, 0.92]]) {
    c.fillStyle = '#A97B5A';
    c.fillRect(tx - 4, GY - 70 * s, 8, 70 * s);
    c.fillStyle = '#FFC4DC';
    c.beginPath(); c.arc(tx, GY - 92 * s, 30 * s, 0, TAU); c.arc(tx - 22 * s, GY - 76 * s, 22 * s, 0, TAU); c.arc(tx + 22 * s, GY - 76 * s, 22 * s, 0, TAU); c.fill();
    c.fillStyle = '#FFE0EE';
    for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(tx - 18 * s + i * 7 * s, GY - (96 - (i % 2) * 12) * s, 3.4 * s, 0, TAU); c.fill(); }
  }
  c.fillStyle = '#F1E3FF';
  c.beginPath(); c.ellipse(cx, GY + 12, 250, 20, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(160,130,210,.35)';
  c.lineWidth = 1;
  for (const r of [0.45, 0.75]) { c.beginPath(); c.ellipse(cx, GY + 12, 250 * r, 20 * r, 0, 0, TAU); c.stroke(); }
  for (const fx of [cx - 122, cx + 96]) {
    c.fillStyle = '#C9A0E6';
    c.beginPath(); c.roundRect(fx, GY - 12, 26, 12, 4); c.fill();
    flowers(c, fx + 5, GY - 15, 3, ['#FF8FB3', '#FFFFFF', '#FFD45A']);
  }
  c.fillStyle = lg(c, 0, GY - 46, 0, GY, [[0, '#FFFFFF'], [1, '#D8C6F2']]);
  c.beginPath(); c.roundRect(cx - 86, GY - 44, 172, 44, 16); c.fill();
  c.strokeStyle = 'rgba(150,120,200,.35)';
  for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(cx - 86 + i * 29, GY - 40); c.lineTo(cx - 86 + i * 29, GY - 4); c.stroke(); }
  c.fillStyle = '#8FD3FF';
  c.beginPath(); c.ellipse(cx, GY - 42, 78, 8, 0, 0, TAU); c.fill();
  c.fillStyle = '#EADCFB';
  c.fillRect(cx - 10, GY - 104, 20, 62);
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.ellipse(cx, GY - 104, 44, 10, 0, 0, TAU); c.fill();
  c.fillStyle = '#9FDCFF';
  c.beginPath(); c.ellipse(cx, GY - 106, 36, 6, 0, 0, TAU); c.fill();
  c.fillStyle = '#F6EEFF';
  c.beginPath(); c.ellipse(cx, GY - 120, 13, 15, 0, 0, TAU); c.fill();
  ears(c, cx, GY - 148, 8, 7, '#F6EEFF', '#E9D8FF');
  c.fillStyle = '#F6EEFF';
  c.beginPath(); c.arc(cx, GY - 140, 13, 0, TAU); c.fill();
  catFace(c, cx, GY - 140, 11, true, '#9C80D8');
}
function drawFountainWater(c, p, t) {
  const cx = p.x + p.w / 2;
  c.save();
  c.strokeStyle = 'rgba(160,220,255,.85)';
  c.lineWidth = 2.4;
  c.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    if (!i) continue;
    const s = i * 16;
    c.beginPath();
    c.moveTo(cx + i * 3, GY - 128);
    c.quadraticCurveTo(cx + s * 1.6, GY - 150 - Math.sin(t * 0.08 + i) * 3, cx + s * 2.7, GY - 106);
    c.stroke();
  }
  c.fillStyle = 'rgba(255,255,255,.9)';
  for (let i = 0; i < 6; i++) {
    const u = ((t * 0.02 + i / 6) % 1);
    c.globalAlpha = 1 - u;
    c.beginPath(); c.arc(cx + (i - 2.5) * 24 * u, GY - 46 + u * 3, 1.6 + u * 3, 0, TAU); c.fill();
  }
  c.restore();
}
function drawBench(c, p) {
  const x = p.x, y = GY;
  c.fillStyle = '#9A6A42';
  c.fillRect(x + 6, y - 20, 6, 20); c.fillRect(x + p.w - 12, y - 20, 6, 20);
  c.fillStyle = '#E3A86E';
  c.beginPath(); c.roundRect(x, y - 26, p.w, 8, 3); c.fill();
  c.beginPath(); c.roundRect(x + 2, y - 48, p.w - 4, 7, 3); c.fill();
  c.beginPath(); c.roundRect(x + 2, y - 38, p.w - 4, 5, 2); c.fill();
  c.fillStyle = '#7A5BB0';
  c.fillRect(x + 4, y - 50, 4, 30); c.fillRect(x + p.w - 8, y - 50, 4, 30);
}

// ══ ปราสาทแมวเหมียว — หอคอยหลายหลัง ตราหน้าแมว มงกุฎ ธง ════════════
function drawCastle(c, p) {
  const { x, w } = p, cx = x + w / 2;
  const stone = (X, Y, W, Hh, a, b) => {
    c.fillStyle = lg(c, 0, Y, 0, Y + Hh, [[0, a], [1, b]]);
    c.fillRect(X, Y, W, Hh);
    c.strokeStyle = 'rgba(170,120,170,.18)';
    c.lineWidth = 1;
    for (let yy = Y + 16; yy < Y + Hh; yy += 16) { c.beginPath(); c.moveTo(X, yy); c.lineTo(X + W, yy); c.stroke(); }
  };
  const cone = (tx, ty, tw, th) => {
    c.fillStyle = '#A98AE8';
    c.beginPath(); c.moveTo(tx - 10, ty); c.quadraticCurveTo(tx + tw / 2 - 6, ty - th * 0.5, tx + tw / 2, ty - th); c.quadraticCurveTo(tx + tw / 2 + 6, ty - th * 0.5, tx + tw + 10, ty); c.closePath(); c.fill();
    c.fillStyle = '#8C6AD6';
    c.beginPath(); c.moveTo(tx + tw / 2, ty - th); c.quadraticCurveTo(tx + tw / 2 + 6, ty - th * 0.5, tx + tw + 10, ty); c.lineTo(tx + tw / 2 + 6, ty); c.closePath(); c.fill();
    c.fillStyle = '#FFE680';
    c.fillRect(tx - 10, ty - 3, tw + 20, 4);
  };
  const tower = (tx, top, tw, th, win) => {
    stone(tx, top, tw, GY - top, '#FFF4FA', '#F2D3E8');
    cone(tx, top, tw, th);
    if (win) {
      const wx = tx + tw / 2;
      c.fillStyle = '#6E4CB8';
      c.beginPath(); c.roundRect(wx - 8, top + 30, 16, 24, [8, 8, 2, 2]); c.fill();
      c.fillStyle = '#FFE89A';
      c.beginPath(); c.roundRect(wx - 5, top + 33, 10, 19, [5, 5, 1, 1]); c.fill();
    }
  };
  stone(x + 30, GY - 176, w - 60, 176, '#FFEFF7', '#F0CEE4');
  c.fillStyle = '#FFEFF7';
  for (let bx = x + 30; bx < x + w - 40; bx += 30) c.fillRect(bx, GY - 190, 18, 15);
  // หอคอย 5 หลัง — ยอดสูงสุดต้องอยู่ในจอ (ฟ้าเหนือถนนมี GY หน่วย)
  tower(x, GY - 210, 66, 64, true);
  tower(x + w - 66, GY - 210, 66, 64, true);
  tower(x + 92, GY - 236, 58, 62, true);
  tower(x + w - 150, GY - 236, 58, 62, true);
  tower(cx - 62, GY - 246, 124, 70, false);
  // ตราโล่หน้าแมว + มงกุฎ (หอกลาง)
  const sy = GY - 200;
  c.fillStyle = '#E7B640';
  c.beginPath(); c.moveTo(cx - 32, sy - 26); c.lineTo(cx + 32, sy - 26); c.lineTo(cx + 32, sy + 8); c.quadraticCurveTo(cx, sy + 38, cx - 32, sy + 8); c.closePath(); c.fill();
  c.fillStyle = '#8C6AD6';
  c.beginPath(); c.moveTo(cx - 26, sy - 20); c.lineTo(cx + 26, sy - 20); c.lineTo(cx + 26, sy + 6); c.quadraticCurveTo(cx, sy + 30, cx - 26, sy + 6); c.closePath(); c.fill();
  ears(c, cx, sy - 8, 10, 8, '#FFF4FA', '#FFC9D4');
  c.fillStyle = '#FFF4FA';
  c.beginPath(); c.arc(cx, sy + 2, 15, 0, TAU); c.fill();
  catFace(c, cx, sy + 3, 13, true, '#6E4CB8');
  c.fillStyle = '#FFD45A';
  c.beginPath(); c.moveTo(cx - 16, sy - 30); c.lineTo(cx - 16, sy - 44); c.lineTo(cx - 8, sy - 36); c.lineTo(cx, sy - 48); c.lineTo(cx + 8, sy - 36); c.lineTo(cx + 16, sy - 44); c.lineTo(cx + 16, sy - 30); c.closePath(); c.fill();
  // ธงห้อยชมพูลายอุ้งเท้าบนกำแพง
  for (const bx of [x + 168, x + w - 194]) {
    c.fillStyle = '#FF8FB3';
    c.beginPath(); c.moveTo(bx, GY - 168); c.lineTo(bx + 26, GY - 168); c.lineTo(bx + 26, GY - 112); c.lineTo(bx + 13, GY - 122); c.lineTo(bx, GY - 112); c.closePath(); c.fill();
    c.fillStyle = '#FFFFFF';
    c.beginPath(); c.ellipse(bx + 13, GY - 140, 5, 4, 0, 0, TAU); c.fill();
    for (const [dx, dy] of [[-5, -7], [0, -10], [5, -7]]) { c.beginPath(); c.arc(bx + 13 + dx, GY - 140 + dy, 2, 0, TAU); c.fill(); }
  }
  // ประตูใหญ่ + ซี่ประตูเหล็ก
  const gw = 112, gh = 140;
  const gate = (r) => { c.beginPath(); c.moveTo(cx - gw / 2 - r, GY); c.lineTo(cx - gw / 2 - r, GY - gh + gw / 2); c.arc(cx, GY - gh + gw / 2, gw / 2 + r, Math.PI, 0); c.lineTo(cx + gw / 2 + r, GY); c.closePath(); };
  c.fillStyle = '#C9A0E6';
  gate(9); c.fill();
  c.fillStyle = lg(c, 0, GY - gh, 0, GY, [[0, '#8E5BC8'], [1, '#5E3A96']]);
  gate(0); c.fill();
  c.save();
  gate(0); c.clip();
  c.strokeStyle = 'rgba(255,230,160,.4)';
  c.lineWidth = 2.4;
  for (let gx = cx - gw / 2 + 12; gx < cx + gw / 2; gx += 14) { c.beginPath(); c.moveTo(gx, GY - gh); c.lineTo(gx, GY); c.stroke(); }
  for (let gy = GY - gh + 40; gy < GY; gy += 26) { c.beginPath(); c.moveTo(cx - gw / 2, gy); c.lineTo(cx + gw / 2, gy); c.stroke(); }
  c.restore();
  plaque(c, cx, GY - 152, p.name, { bg: '#FFF9EC', ink: '#7A4BB8', edge: '#C9A0E6', shape: 'round', size: 15 });
  plaque(c, cx, GY - 58, 'เปิดเร็ว ๆ นี้', { bg: '#FFF9EC', ink: '#8A4BB8', edge: '#E7B640', shape: 'round', size: 12 });
  for (const bx of [x + 50, x + 180, x + w - 180, x + w - 50]) bush(c, bx, GY, 16, '#A6DDA0');
}
function drawCastleLive(c, p, t) {
  const { x, w } = p, cx = x + w / 2;
  for (const [fx, fy] of [[x + 33, GY - 274], [x + 121, GY - 298], [cx, GY - 316], [x + w - 121, GY - 298], [x + w - 33, GY - 274]]) {
    c.strokeStyle = '#8A6BC8';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(fx, fy + 4); c.lineTo(fx, fy - 12); c.stroke();
    const s = Math.sin(t * 0.09 + fx) * 2.5;
    c.fillStyle = '#FF7EB0';
    c.beginPath(); c.moveTo(fx + 1, fy - 12); c.quadraticCurveTo(fx + 9, fy - 10 + s, fx + 17, fy - 7); c.quadraticCurveTo(fx + 9, fy - 4 + s, fx + 1, fy - 2); c.closePath(); c.fill();
  }
}

// ══ ตะเกียงริมถนน (ธงห้อยบางต้น) ═════════════════════════════════
function drawLamp(c, x, flag, t) {
  c.fillStyle = '#6E4CB8';
  c.fillRect(x - 2.5, GY - 104, 5, 104);
  c.beginPath(); c.roundRect(x - 9, GY - 6, 18, 6, 2); c.fill();
  if (flag) {
    c.fillRect(x, GY - 92, 20, 3);
    c.fillStyle = '#C9A0E6';
    c.beginPath(); c.moveTo(x + 4, GY - 89); c.lineTo(x + 20, GY - 89); c.lineTo(x + 20, GY - 56); c.lineTo(x + 12, GY - 62); c.lineTo(x + 4, GY - 56); c.closePath(); c.fill();
    c.fillStyle = '#FFFFFF';
    heart(c, x + 12, GY - 74, 4.5); c.fill();
  }
  const flick = 0.85 + 0.15 * Math.sin(t * 0.13 + x);
  const g = c.createRadialGradient(x, GY - 114, 2, x, GY - 114, 34);
  g.addColorStop(0, `rgba(255,236,170,${0.55 * flick})`);
  g.addColorStop(1, 'rgba(255,236,170,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, GY - 114, 34, 0, TAU); c.fill();
  c.fillStyle = '#6E4CB8';
  c.beginPath(); c.moveTo(x - 11, GY - 104); c.lineTo(x + 11, GY - 104); c.lineTo(x + 7, GY - 126); c.lineTo(x - 7, GY - 126); c.closePath(); c.fill();
  c.fillStyle = '#FFE9A8';
  c.beginPath(); c.roundRect(x - 6, GY - 123, 12, 16, 3); c.fill();
  c.fillStyle = '#6E4CB8';
  c.beginPath(); c.moveTo(x - 8, GY - 126); c.lineTo(x - 5, GY - 134); c.lineTo(x - 1, GY - 126); c.fill();
  c.beginPath(); c.moveTo(x + 8, GY - 126); c.lineTo(x + 5, GY - 134); c.lineTo(x + 1, GY - 126); c.fill();
}

/** ซุ้มทางเข้าเมือง (ต้นแผนที่) */
function drawWelcome(c) {
  const x = 30, w = 150;
  c.fillStyle = '#C9A0E6';
  c.fillRect(x, GY - 150, 12, 150); c.fillRect(x + w - 12, GY - 150, 12, 150);
  bush(c, x + 6, GY, 13, '#A6DDA0');
  bush(c, x + w - 6, GY, 13, '#A6DDA0');
  ears(c, x + w / 2, GY - 176, 46, 14, '#FF9CC0', '#FFD3E3');
  c.fillStyle = '#FFF9EC';
  c.beginPath(); c.roundRect(x - 14, GY - 176, w + 28, 40, 14); c.fill();
  c.fillStyle = '#FF9CC0';
  c.beginPath(); c.roundRect(x - 14, GY - 176, w + 28, 10, [14, 14, 0, 0]); c.fill();
  c.font = '700 14px Mali, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#8A4BB8';
  c.fillText('เมืองแมวเหมียว', x + w / 2, GY - 150);
}

// ══ แมวเจ้าของร้าน (NPC) — ตัววาดน้องตัวเดียวกับเกม ท่านั่ง วาดครั้งเดียวเก็บเป็นภาพ ══
const NPCS = [
  { skin: 'snow', x: 600, flip: true },       // ข้างร้านแลกของกิน
  { skin: 'midnight', x: 985, flip: true },   // ข้างร้านขายยา
  { skin: 'grey', x: 1395, flip: true },      // ข้างร้านอัปเกรดอุปกรณ์
  { skin: 'calico', x: 2030, flip: false },   // ข้างร้านของเล่น
  { skin: 'pearl', x: 2780, flip: true },     // ข้างร้านแลกของรางวัล
];
const NPC_SC = 0.6;
function drawNpc(c, n) {
  const s = skinById(n.skin);
  if (!s) return;
  c.save();
  c.translate(n.x, 0);
  if (n.flip) c.scale(-1, 1);
  drawCat2(c, 0, GY - 1, NPC_SC, s, 0, { k: 1, shape: { sit: 1, turn: -0.35 } });
  c.restore();
}

// ── ฉากหลัง ───────────────────────────────────────────────────
export function drawSky(c, vw) {
  c.fillStyle = lg(c, 0, 0, 0, H, [[0, '#BCD8FF'], [0.45, '#E2D8FF'], [1, '#FFE9F3']]);
  c.fillRect(0, 0, vw, H);
  const sg = c.createRadialGradient(vw * 0.8, 64, 8, vw * 0.8, 64, 90);
  sg.addColorStop(0, 'rgba(255,250,220,.95)');
  sg.addColorStop(0.35, 'rgba(255,236,190,.45)');
  sg.addColorStop(1, 'rgba(255,236,190,0)');
  c.fillStyle = sg;
  c.beginPath(); c.arc(vw * 0.8, 64, 90, 0, TAU); c.fill();
}

/** รุ้ง · ปราสาทไกล · เกาะลอยมีน้ำตก · เรือเหาะหัวแมว (เลื่อนช้ามาก — พิกัดจอ) */
export function drawFar(c, camX, vw, t) {
  const rx = 520 - camX * 0.05, ry = 300;
  c.save();
  c.globalAlpha = 0.3;
  c.lineWidth = 7;
  ['#FF9CC0', '#FFD45A', '#9FE0A8', '#9FD3FF', '#C8A8F5'].forEach((col, i) => {
    c.strokeStyle = col;
    c.beginPath(); c.arc(rx, ry, 200 - i * 7, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  });
  c.restore();
  const fx = 1000 - camX * 0.1;
  if (fx > -260 && fx < vw + 260) {
    c.fillStyle = '#DCCCF6';
    c.fillRect(fx - 90, 160, 180, 120);
    for (const [tx, tt, tw] of [[fx - 110, 130, 34], [fx - 40, 104, 30], [fx + 10, 90, 36], [fx + 80, 126, 32]]) {
      c.fillStyle = '#DCCCF6';
      c.fillRect(tx, tt, tw, 280 - tt);
      c.fillStyle = '#C3AEEE';
      c.beginPath(); c.moveTo(tx - 5, tt); c.lineTo(tx + tw / 2, tt - 38); c.lineTo(tx + tw + 5, tt); c.closePath(); c.fill();
    }
  }
  const ix = 2000 - camX * 0.1, iy = 92;
  if (ix > -160 && ix < vw + 160) {
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.fillRect(ix - 8, iy + 10, 16, 120);
    c.fillStyle = 'rgba(200,235,255,.7)';
    for (let i = 0; i < 4; i++) c.fillRect(ix - 6 + i * 4, iy + 12 + ((t * 1.2 + i * 17) % 110), 2, 10);
    c.fillStyle = '#C9B39A';
    c.beginPath(); c.moveTo(ix - 70, iy + 6); c.lineTo(ix + 70, iy + 6); c.quadraticCurveTo(ix + 30, iy + 60, ix, iy + 70); c.quadraticCurveTo(ix - 30, iy + 60, ix - 70, iy + 6); c.fill();
    c.fillStyle = '#A6DDA0';
    c.beginPath(); c.ellipse(ix, iy + 6, 72, 12, 0, 0, TAU); c.fill();
    c.fillStyle = '#EADCFB';
    c.fillRect(ix - 16, iy - 30, 32, 34);
    c.fillStyle = '#B79CF0';
    c.beginPath(); c.moveTo(ix - 21, iy - 30); c.lineTo(ix, iy - 56); c.lineTo(ix + 21, iy - 30); c.closePath(); c.fill();
    bush(c, ix - 44, iy + 4, 10, '#8FD08A');
    bush(c, ix + 46, iy + 4, 9, '#8FD08A');
  }
  const span = vw + 500;
  const ax = ((t * 0.18 - camX * 0.06) % span + span) % span - 250, ay = 72 + Math.sin(t * 0.02) * 5;
  ears(c, ax, ay - 20, 22, 10, '#F3E6FF', '#FFC9D4');
  c.fillStyle = '#F3E6FF';
  c.beginPath(); c.ellipse(ax, ay, 44, 26, 0, 0, TAU); c.fill();
  catFace(c, ax + 6, ay + 2, 16, true, '#8C6AD6');
  c.strokeStyle = '#B79CF0'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(ax - 14, ay + 24); c.lineTo(ax - 10, ay + 36); c.moveTo(ax + 14, ay + 24); c.lineTo(ax + 10, ay + 36); c.stroke();
  c.fillStyle = '#C9A0E6';
  c.beginPath(); c.roundRect(ax - 16, ay + 34, 32, 10, 4); c.fill();
}

export function drawClouds(c, camX, vw, t) {
  c.fillStyle = 'rgba(255,255,255,.88)';
  for (let i = 0; i < 7; i++) {
    const span = vw + 400;
    const x = ((i * 377 - camX * 0.08 + t * 0.12) % span + span) % span - 200;
    const y = 36 + (i % 3) * 30;
    const s = 0.7 + (i % 3) * 0.25;
    c.beginPath();
    c.arc(x, y, 22 * s, 0, TAU); c.arc(x + 26 * s, y - 8 * s, 26 * s, 0, TAU); c.arc(x + 54 * s, y, 20 * s, 0, TAU);
    c.roundRect(x - 4 * s, y - 2 * s, 64 * s, 20 * s, 10 * s);
    c.fill();
  }
}

export function drawHills(c, camX, vw, t = 0) {
  const layer = (par, base, amp, col, step) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, H);
    const off = camX * par;
    for (let x = -step; x <= vw + step; x += 8) {
      const wx = x + off;
      c.lineTo(x, base - amp * (0.55 + 0.45 * Math.sin(wx / step)) - amp * 0.25 * Math.sin(wx / (step * 0.37)));
    }
    c.lineTo(vw, H);
    c.closePath();
    c.fill();
  };
  layer(0.15, 250, 46, '#D3C4F2', 160);
  haze(c, vw, 150, 300, 0.38);
  const off = camX * 0.22;
  for (let i = -1; i < vw / 150 + 2; i++) {
    const wx = Math.floor(off / 150) + i;
    const x = wx * 150 - off + 40 + (Math.abs(wx) % 3) * 20;
    const y = 262 - (Math.abs(wx * 37) % 3) * 6;
    c.fillStyle = '#E9DCFF';
    c.fillRect(x, y - 22, 26, 26);
    c.fillStyle = Math.abs(wx) % 2 ? '#C5ADF0' : '#F4B8D2';
    c.beginPath(); c.moveTo(x - 4, y - 22); c.lineTo(x + 13, y - 38); c.lineTo(x + 30, y - 22); c.closePath(); c.fill();
  }
  // กังหันลมบนเนิน (ใบพัดหมุน)
  const mx = 330 - camX * 0.22;
  if (mx > -60 && mx < vw + 60) {
    c.fillStyle = '#F4E6D6';
    c.beginPath(); c.moveTo(mx - 12, 268); c.lineTo(mx - 7, 222); c.lineTo(mx + 7, 222); c.lineTo(mx + 12, 268); c.closePath(); c.fill();
    c.fillStyle = '#C08A68';
    c.beginPath(); c.moveTo(mx - 10, 224); c.lineTo(mx, 210); c.lineTo(mx + 10, 224); c.closePath(); c.fill();
    c.save();
    c.translate(mx, 222);
    c.rotate(t * 0.02);
    c.fillStyle = '#FFF8EE';
    for (let i = 0; i < 4; i++) { c.rotate(TAU / 4); c.fillRect(-2, -30, 8, 28); }
    c.restore();
  }
  layer(0.3, 298, 34, '#C4E8C4', 120);
  haze(c, vw, 230, GY, 0.22);
}

/** หมอกจาง ๆ อมฟ้าม่วงแถบหนึ่ง (ไกลกว่า = ผู้เรียกใส่ k มากกว่า) — ทำให้ชั้นหลังถอยห่างออกไป */
function haze(c, vw, y0, y1, k) {
  c.fillStyle = lg(c, 0, y0, 0, y1, [[0, 'rgba(232,226,255,0)'], [0.6, `rgba(232,226,255,${k})`], [1, `rgba(240,232,255,${k * 0.7})`]]);
  c.fillRect(0, y0, vw, y1 - y0);
}

/**
 * แถวบ้านด้านหลังถนน (เลื่อน 0.72 เท่าของกล้อง) — โผล่ให้เห็นในช่องระหว่างร้าน = ความลึก
 * สีจางกว่าร้านหน้า + หมอกทับนิด ๆ · หลังคาสีต่างกัน บางหลังมีหูแมว/ปล่องไฟ
 */
export function drawBackRow(c, camX, vw) {
  const par = 0.72, step = 150;
  const off = camX * par;
  // สีจางอมม่วงกว่าร้านหน้า (อยู่ไกลกว่า) — ผนังไม่ขาวจั๊วะ ไม่งั้นอ่านเป็นส่วนหนึ่งของร้านหน้า
  const roofs = ['#D9AECB', '#B7A6E0', '#A8C2E2', '#D9BFA2', '#AFCDBC'];
  const walls = ['#EBDDF0', '#E3DCF5', '#DDE3F4', '#EDE0E6', '#DDE9E6'];
  for (let i = -1; i < vw / step + 2; i++) {
    const n = Math.floor(off / step) + i;
    const k = ((n % 5) + 5) % 5;
    const w = 92 + (Math.abs(n * 37) % 4) * 12;
    const h = 104 + (Math.abs(n * 53) % 4) * 16;
    const x = n * step - off + (Math.abs(n * 29) % 30);
    const top = GY - h;
    c.fillStyle = walls[k];
    c.fillRect(x, top, w, h);
    c.fillStyle = 'rgba(120,90,160,.12)';
    c.fillRect(x, top, w * 0.18, h);
    // หลังคา: จั่ว / ทรงโค้ง สลับกัน
    c.fillStyle = roofs[k];
    c.beginPath();
    if (n % 2) { c.moveTo(x - 8, top + 2); c.lineTo(x + w / 2, top - 46); c.lineTo(x + w + 8, top + 2); }
    else { c.moveTo(x - 6, top + 2); c.quadraticCurveTo(x + w / 2, top - 52, x + w + 6, top + 2); }
    c.closePath();
    c.fill();
    if (n % 3 === 0) ears(c, x + w / 2, top - 30, 24, 10, roofs[k], '#FFE0EA');
    else if (n % 3 === 1) { c.fillStyle = '#C8B6DE'; c.fillRect(x + w * 0.7, top - 34, 12, 26); }
    // หน้าต่างอุ่น ๆ
    for (let r = 0; r < 2; r++) for (let q = 0; q < 2; q++) {
      const wx = x + w * (0.25 + q * 0.38), wy = top + 26 + r * 40;
      if (wy > GY - 30) continue;
      c.fillStyle = '#C9B8E6';
      c.beginPath(); c.roundRect(wx - 9, wy, 18, 22, [9, 9, 2, 2]); c.fill();
      c.fillStyle = (n + r + q) % 3 ? '#FFF1C9' : '#E9F3FF';
      c.beginPath(); c.roundRect(wx - 6, wy + 3, 12, 17, [6, 6, 1, 1]); c.fill();
    }
  }
  haze(c, vw, 120, GY, 0.34);
}

/**
 * ชั้นหน้าสุด (เลื่อน 1.3 เท่าของกล้อง วาดหลังตัวน้อง) — กอหญ้า พุ่มดอกไม้ ใบบัวริมน้ำ
 * อยู่ต่ำกว่าเท้าน้องเสมอ (ยอดไม่เกิน ~y366) จึงไม่บังตัวน้อง/ประตูร้าน · สีเข้มกว่าเพราะอยู่ใกล้ตา
 */
export function drawFront(c, camX, vw, t) {
  const par = 1.3, step = 230;
  const off = camX * par;
  for (let i = -1; i < vw / step + 2; i++) {
    const n = Math.floor(off / step) + i;
    const x = n * step - off + (Math.abs(n * 41) % 70);
    const k = ((n % 4) + 4) % 4;
    if (k === 0 || k === 2) {
      // กอหญ้าริมตลิ่ง + ดอกไม้
      c.fillStyle = '#6FBF7A';
      for (let b = 0; b < 7; b++) {
        const bx = x + b * 6, sway = Math.sin(t * 0.04 + b + n) * 2;
        c.beginPath(); c.moveTo(bx - 3, H); c.quadraticCurveTo(bx + sway, H - 30, bx + 2 + sway * 1.5, H - 46 + (b % 3) * 8); c.lineTo(bx + 3, H); c.closePath(); c.fill();
      }
      c.fillStyle = k ? '#FF8FB3' : '#FFFFFF';
      for (const [dx, dy] of [[4, -40], [24, -44], [36, -36]]) { c.beginPath(); c.arc(x + dx, H + dy, 4, 0, TAU); c.fill(); }
      c.fillStyle = '#FFE680';
      for (const [dx, dy] of [[4, -40], [24, -44], [36, -36]]) { c.beginPath(); c.arc(x + dx, H + dy, 1.6, 0, TAU); c.fill(); }
    } else if (k === 1) {
      // ใบบัวลอยน้ำ + ดอกบัว
      const bob = Math.sin(t * 0.03 + n) * 1.5;
      c.fillStyle = '#7FCB8C';
      c.beginPath(); c.ellipse(x + 20, H - 10 + bob, 24, 7, 0, 0.25, TAU - 0.25); c.lineTo(x + 20, H - 10 + bob); c.closePath(); c.fill();
      c.fillStyle = '#FFB5CF';
      for (const a of [-0.6, 0, 0.6]) { c.beginPath(); c.ellipse(x + 30 + a * 8, H - 18 + bob, 4, 8, a, 0, TAU); c.fill(); }
    } else {
      // พุ่มไม้กลม
      bush(c, x + 20, H + 6, 30, '#79C487');
      c.fillStyle = '#FFC4DC';
      for (const [dx, dy] of [[8, -30], [30, -38], [22, -22]]) { c.beginPath(); c.arc(x + dx, H + dy, 3.4, 0, TAU); c.fill(); }
    }
  }
}

/** ของตกแต่งในช่องระหว่างร้าน */
function drawProp(c, k, x) {
  c.fillStyle = 'rgba(80,40,110,.14)';
  c.beginPath(); c.ellipse(x, GY + 3, 18, 4, 0, 0, TAU); c.fill();
  if (k === 'bush') { bush(c, x, GY, 18, '#9ED79A'); flowers(c, x - 10, GY - 22, 3, ['#FF8FB3', '#FFFFFF', '#FFD45A']); }
  else if (k === 'pot') {
    c.fillStyle = '#E39A72';
    c.beginPath(); c.moveTo(x - 12, GY - 22); c.lineTo(x + 12, GY - 22); c.lineTo(x + 9, GY); c.lineTo(x - 9, GY); c.closePath(); c.fill();
    c.fillStyle = '#C97E58'; c.fillRect(x - 13, GY - 25, 26, 5);
    bush(c, x, GY - 22, 11, '#8FD08A');
    flowers(c, x - 8, GY - 38, 3, ['#FF8FB3', '#FFD45A', '#C8A8F5']);
  } else if (k === 'barrel') {
    c.fillStyle = '#9C6A3E';
    c.beginPath(); c.ellipse(x, GY - 16, 13, 17, 0, 0, TAU); c.fill();
    c.fillStyle = '#6F7882';
    c.fillRect(x - 13, GY - 23, 26, 3); c.fillRect(x - 13, GY - 11, 26, 3);
  } else if (k === 'sign') {
    c.fillStyle = '#9A6A42';
    c.fillRect(x - 2.5, GY - 60, 5, 60);
    c.fillStyle = '#F2D2A4';
    c.beginPath(); c.moveTo(x - 26, GY - 56); c.lineTo(x + 20, GY - 56); c.lineTo(x + 28, GY - 48); c.lineTo(x + 20, GY - 40); c.lineTo(x - 26, GY - 40); c.closePath(); c.fill();
    c.fillStyle = '#FFE0EA';
    c.beginPath(); c.moveTo(x + 26, GY - 34); c.lineTo(x - 20, GY - 34); c.lineTo(x - 28, GY - 26); c.lineTo(x - 20, GY - 18); c.lineTo(x + 26, GY - 18); c.closePath(); c.fill();
    c.fillStyle = '#C24F7E';
    heart(c, x - 6, GY - 26, 3.4); c.fill();
    c.fillStyle = '#8A5A2A';
    star(c, x - 2, GY - 48, 4); c.fill();
  }
}

export function drawMidTrees(c, camX, vw) {
  const off = camX * 0.55;
  for (let i = -1; i < vw / 110 + 2; i++) {
    const wx = Math.floor(off / 110) + i;
    const x = wx * 110 - off + (Math.abs(wx * 53) % 40);
    const s = 0.8 + (Math.abs(wx * 29) % 4) * 0.08;
    const kind = Math.abs(wx * 7) % 4;
    c.fillStyle = '#A97B5A';
    c.fillRect(x - 3, GY - 40 * s, 6, 40 * s);
    if (kind === 1) {
      c.fillStyle = '#8FCB9A';
      for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x - (24 - k * 5) * s, GY - (30 + k * 18) * s); c.lineTo(x, GY - (62 + k * 18) * s); c.lineTo(x + (24 - k * 5) * s, GY - (30 + k * 18) * s); c.closePath(); c.fill(); }
    } else {
      c.fillStyle = kind === 2 ? '#FFCDE2' : kind === 3 ? '#B9E3A6' : '#A3DCA6';
      c.beginPath();
      c.arc(x, GY - 52 * s, 22 * s, 0, TAU); c.arc(x - 14 * s, GY - 40 * s, 16 * s, 0, TAU); c.arc(x + 14 * s, GY - 40 * s, 16 * s, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,.25)';
      c.beginPath(); c.arc(x - 6 * s, GY - 60 * s, 8 * s, 0, TAU); c.fill();
    }
  }
}

/** ถนน + ขอบถนน + คันหิน + แม่น้ำ (พิกัดโลก — ผู้เรียก translate กล้องแล้ว) */
export function drawGround(c, camX, vw, t = 0) {
  c.fillStyle = '#B7E3A8';
  c.fillRect(camX - 10, GY - 8, vw + 20, 10);
  c.fillStyle = lg(c, 0, GY, 0, ROAD_B, [[0, '#F6DDC4'], [1, '#ECCBAE']]);
  c.fillRect(camX - 10, GY, vw + 20, ROAD_B - GY);
  c.fillStyle = 'rgba(255,255,255,.38)';
  const x0 = Math.floor((camX - 40) / 40) * 40;
  for (let x = x0; x < camX + vw + 40; x += 40) {
    for (let r = 0; r < 2; r++) {
      const y = GY + 8 + r * 22;
      c.beginPath(); c.roundRect(x + (r % 2) * 20 + 3, y, 34, 16, 6); c.fill();
    }
  }
  c.fillStyle = lg(c, 0, GY, 0, GY + 18, [[0, 'rgba(110,70,120,.16)'], [1, 'rgba(110,70,120,0)']]);
  c.fillRect(camX - 10, GY, vw + 20, 18);
  c.fillStyle = '#E2D2F2';
  c.fillRect(camX - 10, ROAD_B - 4, vw + 20, 8);
  c.fillStyle = 'rgba(150,120,200,.3)';
  const e0 = Math.floor((camX - 30) / 30) * 30;
  for (let x = e0; x < camX + vw + 30; x += 30) c.fillRect(x, ROAD_B - 4, 1.4, 8);
  c.fillStyle = lg(c, 0, ROAD_B + 4, 0, ROAD_B + 16, [[0, '#BBA7DA'], [1, '#9C86C4']]);
  c.fillRect(camX - 10, ROAD_B + 4, vw + 20, 12);
  c.fillStyle = lg(c, 0, ROAD_B + 16, 0, H, [[0, '#8FD0F5'], [1, '#6AB4EA']]);
  c.fillRect(camX - 10, ROAD_B + 16, vw + 20, H - ROAD_B - 16);
  c.strokeStyle = 'rgba(255,255,255,.55)';
  c.lineWidth = 1.6;
  c.lineCap = 'round';
  const w0 = Math.floor((camX - 60) / 60) * 60;
  for (let x = w0; x < camX + vw + 60; x += 60) {
    const sx = x + ((t * 0.3) % 60);
    const sy = ROAD_B + 24 + (Math.abs(x / 60) % 2) * 9;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + 16, sy); c.stroke();
  }
}

/** ทุกอย่างบนถนน (ร้าน ปราสาท ลาน ม้านั่ง ตะเกียง ซุ้ม แมว NPC) ที่อยู่ในจอ */
export function drawStreet(c, camX, vw, t) {
  const inView = (x, w) => x + w > camX - 80 && x < camX + vw + 80;
  if (inView(0, 220)) cached(c, 'welcome', 0, GY - 200, 220, 202, drawWelcome);
  const ART = { food: drawBakery, care: drawPotion, home: drawWorkshop, toy: drawToy, exchange: drawReward };
  const LIVE = { care: drawPotionLive, home: drawWorkshopLive, toy: drawToyLive, exchange: drawRewardLive };
  for (const p of PLACES) {
    if (!inView(p.x - 60, p.w + 120)) continue;
    const img = spriteOf(p);
    if (img) { drawSprite(c, p, img); continue; }
    if (p.kind === 'shop') {
      contactShadow(c, p.x, p.w);
      cached(c, 'shop:' + p.id, p.x - 40, GY - p.h - 10, p.w + 80, p.h + 12, (cc) => { ART[p.id](cc, p); light(cc, p.x - 40, GY - p.h - 10, p.w + 80, p.h + 12); });
      LIVE[p.id]?.(c, p, t);
    } else if (p.kind === 'castle') {
      contactShadow(c, p.x, p.w);
      cached(c, 'castle', p.x - 14, 0, p.w + 28, GY + 2, (cc) => { drawCastle(cc, p); light(cc, p.x - 14, GY - 330, p.w + 28, 332); });
      drawCastleLive(c, p, t);
    } else if (p.kind === 'bench') cached(c, 'bench:' + p.id, p.x - 2, GY - 52, p.w + 4, 54, (cc) => drawBench(cc, p));
    else if (p.id === 'fountain') {
      cached(c, 'plaza', p.x - 260, GY - 170, p.w + 520, 204, (cc) => drawPlaza(cc, p));
      drawFountainWater(c, p, t);
    }
  }
  for (const [k, x] of PROPS) if (inView(x - 40, 80)) drawProp(c, k, x);
  for (const [x, flag] of LAMPS) if (inView(x - 40, 80)) drawLamp(c, x, flag, t);
  for (const n of NPCS) if (inView(n.x - 40, 80)) cached(c, 'npc:' + n.skin, n.x - 40, GY - 90, 80, 92, (cc) => drawNpc(cc, n));
}

/** ป้ายลอยเหนือที่ที่ใช้งานได้ตอนน้องยืนใกล้ ("เข้าร้าน") */
export function drawPrompt(c, p, text, t) {
  // เหนือหัวน้อง (ตัวน้องสูงราว 110 หน่วย) — ไม่บังหน้า
  const x = p.door, y = (p.kind === 'bench' ? GY - 150 : GY - 140) + Math.sin(t * 0.12) * 3;
  c.save();
  c.font = '700 13px Mali, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const w = c.measureText(text).width + 22;
  c.fillStyle = 'rgba(60,20,90,.25)';
  c.beginPath(); c.roundRect(x - w / 2, y - 13 + 2, w, 26, 13); c.fill();
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.roundRect(x - w / 2, y - 13, w, 26, 13); c.moveTo(x - 6, y + 12); c.lineTo(x, y + 19); c.lineTo(x + 6, y + 12); c.fill();
  c.fillStyle = '#8A4BB8';
  c.fillText(text, x, y + 1);
  c.restore();
}
