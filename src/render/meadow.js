// src/render/meadow.js
// ─────────────────────────────────────────────────────────────
// สวนกลางวัน — ฟ้าใส แดดอุ่น เมฆก้อนกลม เนินเขาสามชั้น เรือนกระจก กังหันลม
//               ดงไม้ใหญ่ ทุ่งดอกไม้ ผีเสื้อ และกลีบดอกที่ปลิวตามลม
//
// ── ทำไมอยู่ที่นี่ ──
// เหตุผลเดียวกับ sea.js / space.js / snow.js / cave.js: ภาพชุดนี้ถูกใช้สองที่
//   1. ทางเข้าสวนกลางวัน (render/gates/garden.js) — วิวที่มองทะลุช่องใบไม้ออกไป
//   2. ฉากหลังของด่านสวนเอง (stages.js ประกาศ backdrop: 'meadow')
// มุดพ้นพุ่มดอกไม้ปุ๊บ เนิน ต้นไม้ และทุ่งดอกไม้จึงเป็นผืนเดิมต่อไป ไม่มีรอยต่อ
//
// ── สองย่านสลับกันตามระยะทาง (ย่านละ 4600px ≈ 11 วินาที) ──
//   0 ทุ่งดอกไม้เปิดโล่ง เห็นเนินไกลและเรือนกระจก
//   1 ดงไม้ใหญ่ ต้นไม้ชิดขึ้น ร่มเงามากขึ้น
//
// ── ประสิทธิภาพ ──
// เนิน ต้นไม้ ทุ่งดอกไม้ เมฆ เรือนกระจก กังหัน = แผ่นแคช/สไปรต์ทั้งหมด
// กลีบดอกกับผีเสื้อเป็นพูลคงที่ (16 + 3 ตัว) ไม่มีการสร้างอ็อบเจกต์ใหม่ระหว่างเล่น
// ใบพัดกังหันเป็นของชิ้นเดียวที่หมุนสด ๆ ต่อเฟรม
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from '../config.js';
import { stageById } from '../stages.js';

const { W, H } = VIEW;
const TAU = Math.PI * 2;
const TILE = 1920;

export const MEADOW_C = {
  trunk: '#8A5A36', trunkDark: '#6B4327',
  leaf: '#4E9E68', leafDark: '#2F7C4E', leafLite: '#7CC08B',
  petalA: '#FF8FB8', petalB: '#FFE38A', petalC: '#FFFFFF', petalD: '#C7A6FF',
  grass: '#5FB06F', grassDark: '#3C8A52',
  glass: 'rgba(214,246,255,.72)', glassLine: '#8FD0E8', frame: '#C9E9F5',
  wood: '#B98A55', woodDark: '#8A6238',
  sun: 'rgba(255,246,204,.95)',
};

const C = MEADOW_C;

export function meadowHash(n) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}
const hash = meadowHash;

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** เศษที่เหลือแบบไม่ติดลบ — ของที่วนซ้ำต้องใช้ตัวนี้ ไม่ใช่ % เปล่า ๆ (ดูบันทึกใน sea.js) */
function wrap(v, m) {
  const r = v % m;
  return r < 0 ? r + m : r;
}

function ease(t) {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
}

const SPR = {};

export function meadowSprite(key, w, h, paint) {
  if (SPR[key]) return SPR[key];
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w);
  cv.height = Math.ceil(h);
  paint(cv.getContext('2d'), w, h);
  SPR[key] = cv;
  return cv;
}

function tileRow(ctx, img, tw, offset, y) {
  const x0 = -wrap(offset, tw);
  for (let x = x0; x < W; x += tw) ctx.drawImage(img, x, y);
}

// ─────────────────────────────────────────────────────────────
// ย่าน — ทุ่งโล่ง ↔ ดงไม้ใหญ่
// ─────────────────────────────────────────────────────────────
const CYCLE = 4600;

function zoneAt(cam) {
  return ease(0.5 + 0.5 * Math.sin((cam / CYCLE) * Math.PI));
}

// ─────────────────────────────────────────────────────────────
// ฟ้ากับแดด
// ─────────────────────────────────────────────────────────────
function skySprite() {
  return meadowSprite('mdSky', 64, H, (g, w, h) => {
    const pal = stageById('garden').palette.sky;
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, pal[0]);
    sky.addColorStop(0.55, pal[1]);
    sky.addColorStop(1, pal[2]);
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
  });
}

/** ดวงอาทิตย์ + แสงฟุ้ง — ตรึงไว้กับจอ ของที่อยู่ไกลระดับนี้ไม่ควรวนหายไปไหน (ดูบันทึกใน sea.js) */
function sunSprite() {
  return meadowSprite('mdSun', 300, 300, (g, w, h) => {
    const c = w / 2;
    const halo = g.createRadialGradient(c, c, 8, c, c, c);
    halo.addColorStop(0, 'rgba(255,248,214,.95)');
    halo.addColorStop(0.22, 'rgba(255,238,170,.4)');
    halo.addColorStop(0.6, 'rgba(255,226,150,.12)');
    halo.addColorStop(1, 'rgba(255,226,150,0)');
    g.fillStyle = halo;
    g.fillRect(0, 0, w, h);
    g.fillStyle = C.sun;
    g.beginPath();
    g.arc(c, c, 34, 0, TAU);
    g.fill();
  });
}

function cloudSprite(i) {
  return meadowSprite(`mdCloud${i}`, 300, 120, (g, w, h) => {
    const lobes = [[0.22, 0.68, 0.3], [0.44, 0.46, 0.4], [0.66, 0.6, 0.33], [0.85, 0.7, 0.23]];
    g.fillStyle = '#FFFFFF';
    for (const [lx, ly, lr] of lobes) {
      g.beginPath();
      g.arc(w * lx, h * ly, h * lr, 0, TAU);
      g.fill();
    }
    g.fillRect(w * 0.2, h * 0.68, w * 0.66, h * 0.28);
    g.globalCompositeOperation = 'source-atop';
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(206,232,246,.85)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

// ─────────────────────────────────────────────────────────────
// เนินเขา — สามชั้น ชั้นละแผ่น ใช้สีจากจานสีของด่านจริง
// ─────────────────────────────────────────────────────────────
function hillBand(key, level, amp, flowers) {
  return meadowSprite(key, TILE, 220, (g, w, h) => {
    const pal = stageById('garden').palette.hills;
    g.fillStyle = pal[level];
    g.beginPath();
    g.moveTo(0, h);
    // ไซน์ที่ครบรอบพอดีในหนึ่งแผ่น ลายจึงต่อกันไม่มีรอยตัด
    for (let x = 0; x <= w; x += 12) {
      g.lineTo(x, 110 - Math.sin((x / w) * Math.PI * 6 + level) * amp - Math.sin((x / w) * Math.PI * 2) * amp * 0.6);
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
    if (!flowers) return;
    // ดอกไม้จุด ๆ บนสันเนินใกล้
    const dots = [C.petalA, C.petalB, C.petalC, C.petalD];
    for (let i = 0; i < 150; i++) {
      const x = hash(i * 3.1) * w;
      const top = 110 - Math.sin((x / w) * Math.PI * 6 + level) * amp - Math.sin((x / w) * Math.PI * 2) * amp * 0.6;
      const y = top + 8 + hash(i * 7.7) * 70;
      g.fillStyle = dots[i % 4];
      g.globalAlpha = 0.85;
      g.beginPath();
      g.arc(x, y, 2 + hash(i * 5.5) * 1.6, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  });
}

// ─────────────────────────────────────────────────────────────
// ต้นไม้ทรงกลม — แผ่นเดียวมีหลายขนาด สุ่มตำแหน่ง ไม่ใช่เรียงเท่ากัน
// ─────────────────────────────────────────────────────────────
function treeBand(key, n, scale) {
  return meadowSprite(key, TILE, 240, (g, w, h) => {
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => hash(a * 1.7) - hash(b * 1.7));
    for (const i of order) {
      const x = hash(i * 3.1) * w;
      const s = scale * (0.6 + hash(i * 7.3) * 0.7);
      tree(g, x, h - 10, s, i);
    }
  });
}

function tree(g, x, baseY, s, seed) {
  g.fillStyle = C.trunkDark;
  g.fillRect(x - 7 * s, baseY - 54 * s, 14 * s, 56 * s);
  g.fillStyle = C.trunk;
  g.fillRect(x - 7 * s, baseY - 54 * s, 5 * s, 56 * s);
  const puff = (dx, dy, r, col) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(x + dx * s, baseY - 54 * s + dy * s, r * s, 0, TAU);
    g.fill();
  };
  puff(0, -30, 40, C.leafDark);
  puff(-30, -12, 27, C.leafDark);
  puff(30, -12, 27, C.leafDark);
  puff(-8, -42, 30, C.leaf);
  puff(20, -30, 22, C.leaf);
  puff(-14, -50, 16, C.leafLite);
  // ผลไม้/ดอกบนต้น ให้ต้นไม้ไม่ใช่ก้อนเขียวเปล่า ๆ
  if (seed % 3 === 0) {
    g.fillStyle = C.petalA;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.arc(x + (hash(seed * 2.2 + k) - 0.5) * 60 * s, baseY - 84 * s + (hash(seed + k) - 0.5) * 40 * s, 3.4 * s, 0, TAU);
      g.fill();
    }
  }
}

// ─────────────────────────────────────────────────────────────
// เรือนกระจก + กังหันลม — หมุดหมายของสวน โผล่รอบละครั้งตามระยะทาง
// ─────────────────────────────────────────────────────────────
function greenhouse() {
  return meadowSprite('mdGlass', 260, 180, (g, w, h) => {
    const base = h - 6;
    g.fillStyle = C.frame;
    g.fillRect(24, base - 92, 212, 92);
    g.fillStyle = C.glass;
    g.fillRect(32, base - 84, 196, 80);
    // หลังคาจั่วกระจก
    g.fillStyle = C.frame;
    g.beginPath();
    g.moveTo(16, base - 92);
    g.lineTo(130, base - 156);
    g.lineTo(244, base - 92);
    g.closePath();
    g.fill();
    g.fillStyle = C.glass;
    g.beginPath();
    g.moveTo(34, base - 96);
    g.lineTo(130, base - 146);
    g.lineTo(226, base - 96);
    g.closePath();
    g.fill();
    // เส้นโครงกระจก
    g.strokeStyle = C.glassLine;
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 52; x < 228; x += 34) {
      g.moveTo(x, base - 84);
      g.lineTo(x, base - 4);
    }
    g.moveTo(32, base - 44);
    g.lineTo(228, base - 44);
    g.moveTo(130, base - 150);
    g.lineTo(130, base - 96);
    g.stroke();
    // ต้นไม้ในเรือนกระจก
    g.fillStyle = 'rgba(79,158,104,.65)';
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(58 + i * 48, base - 26, 15, 0, TAU);
      g.fill();
    }
  });
}

function millTower() {
  return meadowSprite('mdMill', 130, 220, (g, w, h) => {
    const base = h - 4;
    g.fillStyle = C.woodDark;
    g.beginPath();
    g.moveTo(40, base);
    g.lineTo(54, base - 150);
    g.lineTo(76, base - 150);
    g.lineTo(90, base);
    g.closePath();
    g.fill();
    g.fillStyle = C.wood;
    g.beginPath();
    g.moveTo(40, base);
    g.lineTo(54, base - 150);
    g.lineTo(63, base - 150);
    g.lineTo(56, base);
    g.closePath();
    g.fill();
    g.fillStyle = '#C96B6B';
    g.beginPath();
    g.moveTo(48, base - 150);
    g.lineTo(65, base - 182);
    g.lineTo(82, base - 150);
    g.closePath();
    g.fill();
    g.fillStyle = C.frame;
    g.fillRect(58, base - 92, 14, 18);
  });
}

/** ใบพัดกังหัน — ชิ้นเดียวที่หมุนสดต่อเฟรม (ที่เหลือแคชหมด) */
function millBlades(ctx, x, y, tick) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tick * 0.012);
  ctx.fillStyle = '#F7EBD6';
  ctx.strokeStyle = C.woodDark;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(46, -10);
    ctx.lineTo(46, 6);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = C.woodDark;
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ทุ่งดอกไม้ชั้นหน้าสุด — หญ้าสูงกับดอกไม้ที่พื้น
// ─────────────────────────────────────────────────────────────
const FIELD_H = 96;

function fieldBand() {
  return meadowSprite('mdField', TILE, FIELD_H, (g, w, h) => {
    g.fillStyle = C.grassDark;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 24) g.lineTo(x, h - 26 - hash(x * 0.011) * 10);
    g.lineTo(w, h);
    g.closePath();
    g.fill();
    // หญ้าสูงเป็นกอ
    g.strokeStyle = C.grass;
    g.lineWidth = 2.5;
    g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i < 220; i++) {
      const x = hash(i * 2.9) * w;
      const y = h - 22 - hash(i * 5.1) * 10;
      const tall = 14 + hash(i * 7.3) * 20;
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 4, y - tall * 0.6, x + 9 - hash(i) * 18, y - tall);
    }
    g.stroke();
    // ดอกไม้
    const dots = [C.petalA, C.petalB, C.petalC, C.petalD];
    for (let i = 0; i < 90; i++) {
      const x = hash(i * 4.4) * w;
      const y = h - 30 - hash(i * 8.8) * 22;
      const col = dots[i % 4];
      g.strokeStyle = C.grassDark;
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(x, y + 14);
      g.lineTo(x, y);
      g.stroke();
      g.fillStyle = col;
      for (let k = 0; k < 5; k++) {
        const an = (k / 5) * TAU;
        g.beginPath();
        g.arc(x + Math.cos(an) * 3.4, y + Math.sin(an) * 3.4, 2.6, 0, TAU);
        g.fill();
      }
      g.fillStyle = '#FFD86B';
      g.beginPath();
      g.arc(x, y, 1.8, 0, TAU);
      g.fill();
    }
  });
}

// ─────────────────────────────────────────────────────────────
// กลีบดอกปลิว + ผีเสื้อ — พูลคงที่
// ─────────────────────────────────────────────────────────────
const PETALS = Array.from({ length: 16 }, (_, i) => ({
  x: hash(i * 2.3) * W,
  y: hash(i * 5.1) * GROUND_Y,
  r: 2.4 + hash(i * 7.7) * 2.6,
  vy: 0.25 + hash(i * 3.3) * 0.45,
  ph: hash(i * 9.1) * TAU,
  col: [C.petalA, C.petalB, C.petalC, C.petalD][i % 4],
}));

const FLIES = Array.from({ length: 3 }, (_, i) => ({
  x: hash(i * 3.7) * W,
  y: 120 + hash(i * 6.1) * 120,
  ph: hash(i * 2.2) * TAU,
  col: [C.petalA, C.petalB, C.petalD][i],
}));

function drawPetals(ctx, tick) {
  ctx.save();
  for (const p of PETALS) {
    p.y += p.vy;
    p.x -= 0.5;
    if (p.y > GROUND_Y + 8) { p.y = -8; p.x = hash(p.x * 0.29 + tick) * W; }
    if (p.x < -8) p.x = W + 8;
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = p.col;
    ctx.save();
    ctx.translate(p.x + Math.sin(tick * 0.03 + p.ph) * 10, p.y);
    ctx.rotate(Math.sin(tick * 0.05 + p.ph) * 0.9);
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawFlies(ctx, tick) {
  for (const f of FLIES) {
    const x = f.x + Math.sin(tick * 0.014 + f.ph) * 120;
    const y = f.y + Math.sin(tick * 0.045 + f.ph) * 22;
    const flap = 0.5 + 0.5 * Math.sin(tick * 0.35 + f.ph);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = f.col;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.scale(s * (0.4 + flap * 0.6), 1);
      ctx.beginPath();
      ctx.ellipse(5, -2, 6, 4.4, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(4, 3, 4.4, 3.2, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#4A3A2A';
    ctx.fillRect(-1, -4, 2, 9);
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────
// ฉากหลังสวนกลางวันเต็มจอ
//
// @param opts.open  0 = ยังอยู่ในพุ่ม มองทะลุออกไป / 1 = อยู่ในสวนเต็มตัว (ด่านจริงใช้ 1)
// ─────────────────────────────────────────────────────────────
export function drawMeadowBackdrop(ctx, cam, tick, opts = {}) {
  const open = clamp01(opts.open ?? 1);
  const z = zoneAt(cam);      // 0 ทุ่งโล่ง → 1 ดงไม้ใหญ่

  ctx.drawImage(skySprite(), 0, 0, W, H);
  ctx.drawImage(sunSprite(), W * 0.68, -60, 300, 300);

  // เมฆสองชั้นความเร็ว
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const depth = i % 2 ? 0.05 : 0.09;
    const x = wrap(i * 560 - cam * depth, W + 1000) - 300;
    const y = 18 + hash(i * 4.4) * 70;
    const s = 0.65 + hash(i * 2.2) * 0.7;
    ctx.globalAlpha = 0.6 + hash(i) * 0.3;
    ctx.drawImage(cloudSprite(i % 2), x, y, 300 * s, 120 * s);
  }
  ctx.restore();

  // เนินไกล → กังหัน/เรือนกระจก → เนินกลาง → ต้นไม้ไกล → เนินใกล้ (มีดอกไม้) → ต้นไม้ใกล้
  tileRow(ctx, hillBand('mdHill0', 0, 22, false), TILE, cam * 0.08, GROUND_Y - 214);

  landmarks(ctx, cam, tick, 1 - z * 0.55);

  tileRow(ctx, hillBand('mdHill1', 1, 16, false), TILE, cam * 0.16, GROUND_Y - 178);

  ctx.save();
  ctx.globalAlpha = 0.65 + z * 0.35;
  tileRow(ctx, treeBand('mdTreeFar', 14, 0.62), TILE, cam * 0.24, GROUND_Y - 206);
  ctx.restore();

  tileRow(ctx, hillBand('mdHill2', 2, 12, true), TILE, cam * 0.34, GROUND_Y - 150);

  ctx.save();
  ctx.globalAlpha = 0.7 + z * 0.3;
  tileRow(ctx, treeBand('mdTreeNear', 9, 1.1), TILE, cam * 0.46, GROUND_Y - 226);
  ctx.restore();

  // ทุ่งดอกไม้ชั้นหน้าสุด
  tileRow(ctx, fieldBand(), TILE, cam * 0.62, GROUND_Y - FIELD_H + 16);

  if (open > 0.4) drawFlies(ctx, tick);
  drawPetals(ctx, tick);
}

/** เรือนกระจกกับกังหันลม — โผล่รอบละครั้งพอดีตามระยะ (ช่วงวน = หนึ่งย่าน × depth) */
function landmarks(ctx, cam, tick, a) {
  if (a <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = a;
  const span = CYCLE * 0.12;
  const gx = wrap(520 - cam * 0.12, span) - 260;
  ctx.drawImage(greenhouse(), gx, GROUND_Y - 236, 260, 180);

  const mx = wrap(520 + span * 0.55 - cam * 0.12, span) - 130;
  ctx.drawImage(millTower(), mx, GROUND_Y - 262, 130, 220);
  millBlades(ctx, mx + 65, GROUND_Y - 262 + 38, tick);
  ctx.restore();
}

export function warmMeadowArt() {
  skySprite();
  sunSprite();
  cloudSprite(0);
  cloudSprite(1);
  hillBand('mdHill0', 0, 22, false);
  hillBand('mdHill1', 1, 16, false);
  hillBand('mdHill2', 2, 12, true);
  treeBand('mdTreeFar', 14, 0.62);
  treeBand('mdTreeNear', 9, 1.1);
  greenhouse();
  millTower();
  fieldBand();
}
