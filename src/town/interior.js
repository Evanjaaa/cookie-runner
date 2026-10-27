// src/town/interior.js
// ─────────────────────────────────────────────────────────────
// ฉากภายในร้าน (เมืองแมวเหมียว) — วาดบน canvas ตัวเดิมของหน้าเมือง ลูปเดิม ไม่สร้างระบบใหม่
//
// ผู้ใช้ 27 ต.ค. (บรีฟปรับร้าน): แตะร้าน → จางเข้าฉากในร้าน · มีเคาน์เตอร์ ชั้นวาง เจ้าของร้าน ของตกแต่งตามประเภท
// น้องไม่ต้องเดินในร้าน — ฉากเป็นพื้นหลังให้แผงสินค้า (HTML ใน town.html · ควบคุมใน main.js)
//
// ประสิทธิภาพ: ส่วนนิ่งทั้งหมด (ผนัง ชั้นวาง ของบนชั้น เคาน์เตอร์ เจ้าของร้าน) วาดครั้งเดียวต่อร้าน/ขนาดจอ เก็บเป็นภาพ
// ทุกเฟรมแปะภาพเดียว + ของขยับไม่กี่ชิ้น (ฟองยา ไฟเตา ลูกโป่ง ประกาย ไอขนม) · ออกจากร้าน = ทิ้งภาพ (clearInterior)
//
// เจ้าของร้าน = แมว NPC ตัวที่นั่งข้างร้านนั้นในเมือง (world.js NPCS) — ตัววาดน้องตัวเดียวกับเกม
// keepX = กึ่งกลางพื้นที่ว่างทางซ้ายของแผงสินค้า (main.js วัดจากตำแหน่งแผงจริง) — เจ้าของร้านไม่โดนแผงบัง
// ─────────────────────────────────────────────────────────────
import { drawItemIcon } from '../render/items.js';
import { drawCat2 } from '../render/cat2.js';
import { skinById } from '../skins.js';
import { H, lg, star, heart, ears, catFace, bottle, gear, giftBox, coin } from './world.js';

const TAU = Math.PI * 2;
const FLOOR = 336;      // ขอบหลังของพื้น
const COUNTER = 292;    // ขอบบนเคาน์เตอร์

/** ธีมแต่ละร้าน — สีผนัง/พื้น/เคาน์เตอร์ + เจ้าของร้าน (skin) */
export const INTERIOR = {
  food: { keeper: 'snow', wallA: '#FFF1E2', wallB: '#FFE0D0', stripe: 'rgba(255,143,179,.16)', floorA: '#E8B98A', floorB: '#D59E6E', counterA: '#C98A55', counterB: '#9E6638', top: '#F4D2A6', accent: '#FF8FB3' },
  care: { keeper: 'midnight', wallA: '#5E4596', wallB: '#3E2A6E', stripe: 'rgba(255,232,154,.08)', floorA: '#4A3A68', floorB: '#33264E', counterA: '#6E4CB8', counterB: '#4A2C8A', top: '#8E6CD8', accent: '#7CF0A0' },
  home: { keeper: 'grey', wallA: '#C88752', wallB: '#A86B3C', stripe: 'rgba(80,40,15,.18)', floorA: '#9C8A7C', floorB: '#7E6E62', counterA: '#7A4A2A', counterB: '#5E3A22', top: '#9C6A3E', accent: '#FFB347' },
  toy: { keeper: 'calico', wallA: '#FFF0F7', wallB: '#E5F7F0', stripe: 'rgba(255,143,179,.22)', floorA: '#BDEBDD', floorB: '#9ED8C6', counterA: '#FF9FC2', counterB: '#E77FA6', top: '#FFD2E2', accent: '#FFD45A' },
  exchange: { keeper: 'pearl', wallA: '#3E5BB8', wallB: '#2C418E', stripe: 'rgba(231,182,64,.14)', floorA: '#5A4A8A', floorB: '#3E3268', counterA: '#8E5A34', counterB: '#6B3E26', top: '#E7B640', accent: '#FFE680' },
};

// ── แคช (หนึ่งภาพต่อร้าน/ขนาดจอ — ออกจากร้านแล้วทิ้ง) ──
let cache = null;
export function clearInterior() { cache = null; }

function base(c, id, vw, keepX) {
  const T = INTERIOR[id];
  // ผนัง + ลายวอลเปเปอร์
  c.fillStyle = lg(c, 0, 0, 0, FLOOR, [[0, T.wallA], [1, T.wallB]]);
  c.fillRect(0, 0, vw, FLOOR);
  c.fillStyle = T.stripe;
  for (let x = -20; x < vw + 40; x += 40) {
    if (id === 'toy') { for (let y = 20; y < FLOOR; y += 40) { c.beginPath(); c.arc(x + ((y / 40) % 2) * 20, y, 5, 0, TAU); c.fill(); } }
    else if (id === 'care') { for (let y = 26; y < FLOOR; y += 52) { star(c, x + ((y / 52) % 2) * 20, y, 4); c.fill(); } }
    else if (id === 'home') { c.fillRect(0, x, vw, 2); }
    else if (id === 'exchange') { for (let y = 30; y < FLOOR; y += 60) { star(c, x + ((y / 60) % 2) * 20, y, 5); c.fill(); } }
    else c.fillRect(x, 0, 18, FLOOR);
  }
  // บัวผนัง
  c.fillStyle = 'rgba(0,0,0,.08)';
  c.fillRect(0, FLOOR - 26, vw, 26);
  // พื้น
  c.fillStyle = lg(c, 0, FLOOR, 0, H, [[0, T.floorA], [1, T.floorB]]);
  c.fillRect(0, FLOOR, vw, H - FLOOR);
  c.fillStyle = 'rgba(255,255,255,.12)';
  for (let x = 0; x < vw; x += 56) c.fillRect(x, FLOOR, 2, H - FLOOR);
  c.fillStyle = 'rgba(0,0,0,.12)';
  c.fillRect(0, FLOOR, vw, 4);

  // ชั้นวางสามชั้นยาวตลอดผนัง (ของบนชั้นตามประเภทร้าน)
  for (let r = 0; r < 3; r++) {
    const sy = 84 + r * 62;
    c.fillStyle = 'rgba(0,0,0,.14)';
    c.fillRect(0, sy + 6, vw, 6);
    c.fillStyle = id === 'care' || id === 'exchange' ? '#8E5A34' : id === 'home' ? '#5E3A22' : '#C98A55';
    c.fillRect(0, sy, vw, 7);
    for (let x = 24 + (r % 2) * 22; x < vw - 10; x += 46) shelfItem(c, id, x, sy, r, Math.round(x / 46));
  }
  // ของตกแต่งเฉพาะร้าน (ผนังหลังเจ้าของร้าน)
  deco(c, id, vw, keepX, T);
  // เจ้าของร้าน (ยืนหลังเคาน์เตอร์ — เคาน์เตอร์วาดทับครึ่งล่าง)
  const s = skinById(T.keeper);
  // ยืนสูงพอให้เห็นถึงอก (หัวโตแบบชิบิ — จมลึกกว่านี้เห็นแค่หัว)
  if (s) drawCat2(c, keepX, COUNTER + 6, 1.9, s, 0, { k: 1, shape: { turn: 0.1 } });
  // เคาน์เตอร์
  const cw = 300, cx0 = keepX - cw / 2;
  c.fillStyle = 'rgba(0,0,0,.18)';
  c.beginPath(); c.ellipse(keepX, H - 6, cw * 0.6, 10, 0, 0, TAU); c.fill();
  c.fillStyle = lg(c, 0, COUNTER, 0, H, [[0, T.counterA], [1, T.counterB]]);
  c.fillRect(cx0, COUNTER, cw, H - COUNTER);
  c.fillStyle = T.top;
  c.beginPath(); c.roundRect(cx0 - 12, COUNTER - 12, cw + 24, 16, 6); c.fill();
  c.fillStyle = 'rgba(255,255,255,.3)';
  c.fillRect(cx0 - 6, COUNTER - 10, cw + 12, 3);
  counterFront(c, id, cx0, cw, T);
  // ของบนเคาน์เตอร์
  counterTop(c, id, keepX, T);
}

/** ของหนึ่งชิ้นบนชั้นวาง (ฐานที่ x, sy) */
function shelfItem(c, id, x, sy, r, n) {
  if (id === 'food') {
    const k = n % 4;
    if (k === 0) { c.fillStyle = '#F2C27A'; c.beginPath(); c.ellipse(x, sy - 8, 14, 9, 0, Math.PI, TAU); c.fill(); }
    else if (k === 1) { c.fillStyle = '#FFE0EA'; c.fillRect(x - 10, sy - 18, 20, 18); c.fillStyle = '#FF8FB3'; c.fillRect(x - 10, sy - 22, 20, 5); }
    else if (k === 2) { c.save(); c.translate(x - 14, sy - 26); c.scale(0.7, 0.7); drawItemIcon(c, n % 3 ? 'fish' : 'kibble'); c.restore(); }
    else { c.fillStyle = '#C98A55'; c.beginPath(); c.moveTo(x - 7, sy - 12); c.lineTo(x + 7, sy - 12); c.lineTo(x + 5, sy); c.lineTo(x - 5, sy); c.closePath(); c.fill(); c.fillStyle = '#FFF0F6'; c.beginPath(); c.arc(x - 3, sy - 15, 4.5, 0, TAU); c.arc(x + 3, sy - 15, 4.5, 0, TAU); c.arc(x, sy - 19, 4.5, 0, TAU); c.fill(); }
  } else if (id === 'care') {
    const cols = ['255,120,170', '120,220,255', '160,240,140', '255,214,90', '200,150,255'];
    bottle(c, x, sy, 18 + (n % 3) * 4, cols[(n + r) % 5], true);
  } else if (id === 'home') {
    const k = n % 3;
    if (k === 0) gear(c, x, sy - 14, 12, 8, '#B9B2A8', '#7E766E');
    else if (k === 1) { c.fillStyle = '#8E5A34'; c.fillRect(x - 2, sy - 26, 4, 26); c.fillStyle = '#6F7882'; c.fillRect(x - 9, sy - 28, 18, 8); }
    else { c.fillStyle = '#9C6A3E'; c.fillRect(x - 12, sy - 16, 24, 16); c.fillStyle = '#6F7882'; c.fillRect(x - 12, sy - 10, 24, 3); }
  } else if (id === 'toy') {
    const k = n % 4;
    if (k === 0 || k === 2) { c.save(); c.translate(x - 14, sy - 28); c.scale(0.7, 0.7); drawItemIcon(c, k ? 'ball' : 'yarn'); c.restore(); }
    else {
      const col = k === 1 ? '#FFE6A8' : '#E6D6FF';
      c.fillStyle = col;
      c.beginPath(); c.ellipse(x, sy - 9, 10, 9, 0, 0, TAU); c.fill();
      c.beginPath(); c.arc(x, sy - 24, 10, 0, TAU); c.fill();
      ears(c, x, sy - 31, 6, 5, col, '#FFB5CF');
      catFace(c, x, sy - 23, 8, true);
    }
  } else if (id === 'exchange') {
    const k = n % 3;
    if (k === 0) giftBox(c, x, sy, 20, n % 2 ? '#FF8FB3' : '#8EE0C2', '#FFE680');
    else if (k === 1) { for (let i = 0; i < 3; i++) coin(c, x - 6 + i * 6, sy - 6 - (i % 2) * 5, 6); }
    else { c.fillStyle = '#FFE680'; star(c, x, sy - 14, 11); c.fill(); }
  }
}

/** ของตกแต่งผนัง (แต่ละร้าน) */
function deco(c, id, vw, keepX, T) {
  // ป้ายหน้าแมวเหนือหัวเจ้าของร้าน
  const sx = keepX, sy = 44;
  c.fillStyle = 'rgba(0,0,0,.15)';
  c.beginPath(); c.arc(sx, sy + 3, 26, 0, TAU); c.fill();
  c.fillStyle = '#FFF9EC';
  c.beginPath(); c.arc(sx, sy, 26, 0, TAU); c.fill();
  ears(c, sx, sy - 18, 13, 9, '#FFF9EC', '#FFC9D4');
  catFace(c, sx, sy + 2, 20, true, id === 'care' ? '#4A2C8A' : '#5A3420');
  if (id === 'food') {
    // ไฟห้อยโคมกลม
    for (const lx of [keepX - 190, keepX + 190]) {
      c.strokeStyle = 'rgba(120,80,60,.6)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(lx, 0); c.lineTo(lx, 40); c.stroke();
      c.fillStyle = '#FFE9A8';
      c.beginPath(); c.arc(lx, 48, 10, 0, TAU); c.fill();
    }
  } else if (id === 'care') {
    // หน้าต่างดาว + สมุนไพรห้อย
    c.fillStyle = '#2E1D5A';
    c.beginPath(); c.roundRect(keepX + 120, 20, 70, 50, [35, 35, 4, 4]); c.fill();
    c.fillStyle = '#FFE89A';
    for (const [dx, dy] of [[140, 40], [165, 34], [178, 52]]) { star(c, keepX + dx, dy, 3); c.fill(); }
    for (const hx of [keepX - 170, keepX - 130]) {
      c.fillStyle = '#7CC67A';
      for (let k2 = 0; k2 < 5; k2++) { c.beginPath(); c.ellipse(hx + (k2 % 2 ? 4 : -4), 14 + k2 * 6, 4, 2.4, k2 % 2 ? 0.5 : -0.5, 0, TAU); c.fill(); }
    }
  } else if (id === 'home') {
    // เฟืองใหญ่บนผนัง + ประแจไขว้
    gear(c, keepX - 170, 52, 30, 10, '#B9B2A8', '#7E766E');
    gear(c, keepX - 128, 72, 18, 8, '#A8A196', '#6E665E');
  } else if (id === 'toy') {
    // ธงราวสีรุ้ง
    const cols = ['#FF8FB3', '#FFD45A', '#8EE0C2', '#9FD3FF', '#C8A8F5'];
    c.strokeStyle = 'rgba(160,110,140,.6)'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(0, 8); c.quadraticCurveTo(vw / 2, 34, vw, 8); c.stroke();
    for (let i = 0; i < 18; i++) {
      const u = (i + 0.5) / 18, x = u * vw, y = 8 + 26 * 4 * u * (1 - u) * 0.98;
      c.fillStyle = cols[i % cols.length];
      c.beginPath(); c.moveTo(x - 9, y); c.lineTo(x + 9, y); c.lineTo(x, y + 16); c.closePath(); c.fill();
    }
  } else if (id === 'exchange') {
    // ม่านทองสองข้าง + ถ้วยใหญ่บนแท่น
    for (const d of [-1, 1]) {
      const mx = keepX + d * 200;
      c.fillStyle = '#C24F7E';
      c.beginPath(); c.moveTo(mx, 0); c.quadraticCurveTo(mx + d * 30, 120, mx + d * 8, 240); c.lineTo(mx + d * 40, 240); c.lineTo(mx + d * 40, 0); c.closePath(); c.fill();
      c.fillStyle = '#E7B640';
      c.fillRect(mx + d * 8 - 3, 120, 6, 18);
    }
  }
}

/** หน้าเคาน์เตอร์ (ลายประจำร้าน) */
function counterFront(c, id, x0, w, T) {
  const cy = COUNTER + 34;
  if (id === 'food') {
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.beginPath(); c.roundRect(x0 + 20, COUNTER + 12, w - 40, 58, 8); c.fill();
    const it = ['kibble', 'fish', 'salmon'];
    it.forEach((k, i) => { c.save(); c.translate(x0 + 52 + i * 84 - 16, COUNTER + 24); c.scale(0.8, 0.8); drawItemIcon(c, k); c.restore(); });
  } else if (id === 'care') {
    c.fillStyle = '#E7B640';
    c.fillRect(x0, COUNTER + 6, w, 4);
    c.fillStyle = '#FFE89A';
    star(c, x0 + w / 2, cy + 6, 14); c.fill();
    for (const d of [-1, 1]) { star(c, x0 + w / 2 + d * 70, cy + 10, 6); c.fill(); }
  } else if (id === 'home') {
    c.strokeStyle = 'rgba(40,20,10,.35)'; c.lineWidth = 1.5;
    for (let y = COUNTER + 18; y < H; y += 18) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + w, y); c.stroke(); }
    gear(c, x0 + w / 2, cy + 10, 20, 9, '#B9B2A8', T.counterB);
  } else if (id === 'toy') {
    for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#FFFFFF' : '#FFE680'; c.beginPath(); c.arc(x0 + 30 + i * 48, cy + 6, 9, 0, TAU); c.fill(); }
    c.fillStyle = '#FFFFFF';
    heart(c, x0 + w / 2, cy + 34, 10); c.fill();
  } else if (id === 'exchange') {
    c.fillStyle = '#E7B640';
    c.fillRect(x0, COUNTER + 6, w, 4);
    c.fillRect(x0, H - 20, w, 4);
    for (let i = 0; i < 4; i++) coin(c, x0 + 60 + i * 60, cy + 12, 10);
  }
}

/** ของวางบนเคาน์เตอร์ */
function counterTop(c, id, kx, T) {
  const y = COUNTER - 12;
  if (id === 'food') {
    c.fillStyle = '#FFFFFF';
    c.beginPath(); c.ellipse(kx - 96, y, 26, 6, 0, 0, TAU); c.fill();
    c.fillStyle = '#FFE0EA'; c.fillRect(kx - 112, y - 26, 32, 22); c.fillStyle = '#FF8FB3'; c.fillRect(kx - 112, y - 30, 32, 6);
    c.fillStyle = '#E8334A'; c.beginPath(); c.arc(kx - 96, y - 34, 4, 0, TAU); c.fill();
  } else if (id === 'care') {
    bottle(c, kx - 100, y, 30, '124,240,160', true);
    bottle(c, kx + 104, y, 24, '255,120,170', true);
  } else if (id === 'home') {
    c.fillStyle = '#4E555E';
    c.beginPath(); c.moveTo(kx + 76, y - 18); c.lineTo(kx + 126, y - 18); c.lineTo(kx + 118, y - 8); c.lineTo(kx + 84, y - 8); c.closePath(); c.fill();
    c.fillRect(kx + 92, y - 8, 18, 8);
  } else if (id === 'toy') {
    c.save(); c.translate(kx - 124, y - 30); drawItemIcon(c, 'mouse'); c.restore();
  } else if (id === 'exchange') {
    c.fillStyle = '#FFD45A';
    c.beginPath(); c.moveTo(kx + 86, y - 40); c.lineTo(kx + 122, y - 40); c.quadraticCurveTo(kx + 120, y - 16, kx + 104, y - 12); c.quadraticCurveTo(kx + 88, y - 16, kx + 86, y - 40); c.fill();
    c.fillRect(kx + 100, y - 12, 8, 8);
    c.fillRect(kx + 92, y - 4, 24, 4);
    giftBox(c, kx - 100, y, 26, '#FF8FB3', '#FFFFFF');
  }
}

/** ของขยับในร้าน (ทุกเฟรม — น้อยชิ้น) */
function live(c, id, vw, kx, t) {
  if (id === 'care') {
    for (let i = 0; i < 5; i++) {
      const u = ((t * 0.01 + i / 5) % 1);
      c.globalAlpha = 0.8 * (1 - u);
      c.fillStyle = i % 2 ? '#B6FFCB' : '#E2C9FF';
      c.beginPath(); c.arc(kx - 100 + Math.sin(t * 0.04 + i) * 5, COUNTER - 44 - u * 50, 2 + u * 3, 0, TAU); c.fill();
    }
  } else if (id === 'home') {
    const f = 0.7 + 0.3 * Math.sin(t * 0.2);
    const g = c.createRadialGradient(kx + 101, COUNTER - 30, 2, kx + 101, COUNTER - 30, 40);
    g.addColorStop(0, `rgba(255,170,80,${0.5 * f})`);
    g.addColorStop(1, 'rgba(255,170,80,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(kx + 101, COUNTER - 30, 40, 0, TAU); c.fill();
  } else if (id === 'toy') {
    const cols = ['#FF8FB3', '#FFD45A', '#8EE0C2', '#9FD3FF'];
    for (let i = 0; i < 4; i++) {
      const bx = kx + 130 + (i % 2) * 22, by = 140 - i * 22 + Math.sin(t * 0.04 + i) * 3;
      c.strokeStyle = 'rgba(120,80,110,.45)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(bx, by + 13); c.lineTo(kx + 140, COUNTER - 12); c.stroke();
      c.fillStyle = cols[i];
      c.beginPath(); c.ellipse(bx, by, 11, 13, 0, 0, TAU); c.fill();
    }
  } else if (id === 'food') {
    for (let i = 0; i < 3; i++) {
      const u = ((t * 0.008 + i / 3) % 1);
      c.globalAlpha = 0.5 * (1 - u);
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(kx - 104 + i * 8, COUNTER - 46 - u * 30); c.quadraticCurveTo(kx - 98 + i * 8, COUNTER - 54 - u * 30, kx - 104 + i * 8, COUNTER - 62 - u * 30); c.stroke();
    }
  }
  // ประกายลอยในอากาศ (ทุกร้าน — 6 จุด)
  c.fillStyle = id === 'care' || id === 'exchange' ? '#FFE89A' : '#FFFFFF';
  for (let i = 0; i < 6; i++) {
    c.globalAlpha = 0.25 + 0.35 * Math.sin(t * 0.05 + i * 1.7);
    star(c, ((i * 173 + t * 0.15) % vw), 60 + ((i * 97) % 200), 2.6);
    c.fill();
  }
  c.globalAlpha = 1;
}

/** วาดฉากในร้าน (พิกัดจอ: กว้าง vw สูง H) — ภาพนิ่งจากแคช + ของขยับ */
export function drawInterior(c, id, vw, keepX, t) {
  const k = c.getTransform().a;
  const key = `${id}|${Math.round(vw)}|${Math.round(keepX)}|${k.toFixed(3)}`;
  if (!cache || cache.key !== key) {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(vw * k);
    cv.height = Math.ceil(H * k);
    const cc = cv.getContext('2d');
    cc.scale(k, k);
    base(cc, id, vw, keepX);
    cache = { key, cv };
  }
  c.drawImage(cache.cv, 0, 0, vw, H);
  live(c, id, vw, keepX, t);
}
