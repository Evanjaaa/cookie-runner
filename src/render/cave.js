// src/render/cave.js
// ─────────────────────────────────────────────────────────────
// โถงถ้ำคริสตัล — เพดานหินย้อย / ผนังสายแร่เรืองแสง / ยอดคริสตัลยักษ์ไกล ๆ
//                 เสาหินกลางถ้ำ / บ่อน้ำเรืองแสงพร้อมเงาสะท้อน / ละอองแร่ลอย
//
// ── ทำไมอยู่ที่นี่ ──
// เหตุผลเดียวกับ sea.js / space.js / snow.js: ภาพชุดนี้ถูกใช้สองที่และต้องต่อกันสนิท
//   1. ทางเข้าถ้ำคริสตัล (render/gates/cavern.js) — วิวที่มองทะลุผนังอุโมงค์ออกไป
//   2. ฉากหลังของด่านถ้ำเอง (stages.js ประกาศ backdrop: 'cave')
// ออกจากอุโมงค์ปุ๊บ ยอดคริสตัล สายแร่ และบ่อน้ำจึงเป็นผืนเดิมต่อไป ไม่มีรอยต่อ
//
// ── โถงถ้ำไม่ใช่ "ฉากเดียวยาว ๆ" ──
// สองย่านสลับกันตามระยะทาง (ย่านละ 4200px ≈ 10 วินาที):
//   0 โถงกว้างมีบ่อน้ำเรืองแสง   1 ดงคริสตัลหนาแน่น เสาหินเยอะ เพดานต่ำลง
// น้ำหนักไล่ทับกันแบบนุ่ม ไม่มีจังหวะไหนที่ภาพตัด และอิงระยะทางล้วนจึงไม่ต้องจำสถานะ
//
// ── ประสิทธิภาพ ──
// ทุกชั้นเป็นแผ่นแคชกว้าง 1920 แปะแบบวนขอบ (ส่วนที่ล้นจอไม่เสียค่าวาด)
// แสงเรืองอบไว้ในสไปรต์ตั้งแต่ตอนสร้าง ไม่มี filter / shadowBlur ตอนเล่นเลย
// ละอองแร่เป็นพูลคงที่ 18 เม็ด ไม่มีการสร้างอ็อบเจกต์ใหม่ระหว่างเล่น
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from '../config.js';
import { placed, minGap } from './scenery.js';
import { stageById } from '../stages.js';

const { W, H } = VIEW;
const TAU = Math.PI * 2;
const TILE = 1920;

export const CAVE_C = {
  rock: '#2C2650', rockLo: '#211B40', rockHi: '#463C78',
  wall: '#332B5E', wallLo: '#241E48',
  crystal: '#7FE8FF', crystalDeep: '#3A9FD8', crystalLite: '#D6F8FF',
  crystalWarm: '#C08BFF', crystalPink: '#FF9BD4',
  pool: '#2AB8D8', poolLite: '#8FF0FF',
  mote: '#BEF0FF',
};

const C = CAVE_C;

export function caveHash(n) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}
const hash = caveHash;

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

export function caveSprite(key, w, h, paint) {
  if (SPR[key]) return SPR[key];
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w);
  cv.height = Math.ceil(h);
  paint(cv.getContext('2d'), w, h);
  SPR[key] = cv;
  return cv;
}

/** แปะแผ่นแบบวนขอบให้เต็มจอ */
function tileRow(ctx, img, tw, offset, y) {
  const x0 = -wrap(offset, tw);
  for (let x = x0; x < W; x += tw) ctx.drawImage(img, x, y);
}

// ─────────────────────────────────────────────────────────────
// ย่านของถ้ำ — โถงกว้าง ↔ ดงคริสตัล
// ─────────────────────────────────────────────────────────────
const CYCLE = 4200;

function zoneAt(cam) {
  // 0 = โถงกว้าง, 1 = ดงคริสตัล (ไล่ขึ้นลงเป็นคลื่นนุ่ม ๆ ไม่ใช่สลับทันที)
  return ease(0.5 + 0.5 * Math.sin((cam / CYCLE) * Math.PI));
}

// ── คริสตัลที่พื้นถ้ำ ──
//
// เดิมทั้งหกแท่งจางเข้า-ออกพร้อมกันตามย่าน (0.58 ↔ 0.99) ทั้งที่ตัวมันไม่ได้ไปไหน
// ผลคือแท่งคริสตัลค่อย ๆ ปรากฏขึ้นตรงที่มันยืนอยู่ แทนที่จะไหลเข้ามาจากขอบจอ
//
// ตอนนี้แต่ละแท่งมีที่ของมันในโลก ความเข้มคงที่ตลอดชีวิต และ "ความหนาแน่น"
// ของย่านมาจากการที่บางช่องว่าง บางช่องมีแท่ง — ตัดสินจากย่านของช่องนั้นเอง
// ไม่ใช่ย่านที่กล้องอยู่ ค่าจึงไม่เปลี่ยนระหว่างที่มันอยู่ในจอ
const CRYSTAL_DEPTH = 0.5;
const CRYSTAL_GAP = 300;

// ─────────────────────────────────────────────────────────────
// เพดาน/ผนังพื้นหลัง — ใช้จานสีของด่านถ้ำจริง
// ─────────────────────────────────────────────────────────────
function backWall() {
  return caveSprite('cvWall', 64, H, (g, w, h) => {
    const pal = stageById('cavern').palette;
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, pal.sky[0]);
    bg.addColorStop(0.55, pal.sky[1]);
    bg.addColorStop(1, pal.sky[2]);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
  });
}

// ─────────────────────────────────────────────────────────────
// คริสตัลหนึ่งแท่ง (อบแสงเรืองไว้ในสไปรต์แล้ว) — ใช้ทั้งชั้นไกลและชั้นใกล้
// ─────────────────────────────────────────────────────────────
function crystalSprite(i) {
  const cols = [
    [C.crystal, C.crystalDeep], [C.crystalWarm, '#6B3FB8'], [C.crystalPink, '#C05799'],
  ][i % 3];
  return caveSprite(`cvCry${i}`, 120, 220, (g, w, h) => {
    const cx = w / 2;
    const tipY = 14 + hash(i * 3.3) * 20;
    const halfW = 20 + hash(i * 5.5) * 16;
    // แสงฟุ้งรอบแท่ง อบไว้ก่อน
    const glow = g.createRadialGradient(cx, h * 0.55, 6, cx, h * 0.55, w * 0.62);
    glow.addColorStop(0, `${cols[0]}55`);
    glow.addColorStop(0.5, `${cols[0]}1E`);
    glow.addColorStop(1, `${cols[0]}00`);
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);

    g.fillStyle = cols[1];
    g.beginPath();
    g.moveTo(cx, tipY);
    g.lineTo(cx + halfW, h - 8);
    g.lineTo(cx - halfW, h - 8);
    g.closePath();
    g.fill();
    g.fillStyle = cols[0];
    g.beginPath();
    g.moveTo(cx, tipY);
    g.lineTo(cx + halfW * 0.3, h - 8);
    g.lineTo(cx - halfW * 0.55, h - 8);
    g.closePath();
    g.fill();
    g.fillStyle = C.crystalLite;
    g.globalAlpha = 0.75;
    g.beginPath();
    g.moveTo(cx - halfW * 0.08, tipY + 16);
    g.lineTo(cx + halfW * 0.14, h - 50);
    g.lineTo(cx - halfW * 0.3, h - 50);
    g.closePath();
    g.fill();
  });
}

// ─────────────────────────────────────────────────────────────
// ยอดคริสตัลยักษ์ไกล ๆ — เงาทึบบอกว่าถ้ำยังลึกต่อไปอีก
// ─────────────────────────────────────────────────────────────
function farSpires() {
  return caveSprite('cvSpires', TILE, 260, (g, w, h) => {
    for (let i = 0; i < 16; i++) {
      const x = i * (w / 16) + hash(i * 2.7) * 60;
      const tall = 90 + hash(i * 3.7) * 150;
      const wide = 34 + hash(i * 5.3) * 40;
      g.fillStyle = i % 4 === 0 ? 'rgba(58,48,110,.9)' : 'rgba(34,28,68,.92)';
      g.beginPath();
      g.moveTo(x, h);
      g.lineTo(x + wide / 2, h - tall);
      g.lineTo(x + wide, h);
      g.closePath();
      g.fill();
      // ยอดเรืองจาง ๆ ให้รู้ว่าเป็นคริสตัลไม่ใช่หิน
      g.fillStyle = 'rgba(127,232,255,.25)';
      g.beginPath();
      g.moveTo(x + wide / 2, h - tall);
      g.lineTo(x + wide * 0.62, h - tall * 0.62);
      g.lineTo(x + wide * 0.38, h - tall * 0.62);
      g.closePath();
      g.fill();
    }
  });
}

// ─────────────────────────────────────────────────────────────
// สายแร่เรืองแสงบนผนัง
// ─────────────────────────────────────────────────────────────
function veinBand() {
  return caveSprite('cvVein', TILE, 240, (g, w, h) => {
    for (let i = 0; i < 9; i++) {
      const x = 60 + i * (w / 9) + hash(i * 4.4) * 70;
      const y = 40 + hash(i * 8.1) * 120;
      const s = 0.45 + hash(i * 6.2) * 0.5;
      g.globalAlpha = 0.7;
      g.drawImage(crystalSprite(i), x - 60 * s, y - 110 * s, 120 * s, 220 * s);
    }
    g.globalAlpha = 1;
    // เส้นแร่บาง ๆ พาดผนัง เชื่อมกลุ่มคริสตัลเข้าด้วยกัน
    g.strokeStyle = 'rgba(127,232,255,.22)';
    g.lineWidth = 2.5;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const y = 30 + i * 34 + hash(i) * 20;
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 120) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 16);
    }
    g.stroke();
  });
}

// ─────────────────────────────────────────────────────────────
// เพดานหินย้อย — แผ่นเดียวใช้ทั้งชั้นไกลและชั้นใกล้ (คนละสเกล)
// ─────────────────────────────────────────────────────────────
function ceilingBand(key, n, tall, col) {
  return caveSprite(key, TILE, 190, (g, w, h) => {
    g.fillStyle = col;
    // เพดานหนาเป็นแถบ แล้วมีหินย้อยห้อยลงมา
    g.fillRect(0, 0, w, 26);
    g.beginPath();
    g.moveTo(0, 26);
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * (w / n) + (hash(i * 3.1) - 0.5) * 40;
      const len = tall * (0.45 + hash(i * 7.7) * 0.9);
      const wide = 16 + hash(i * 2.3) * 26;
      g.lineTo(x - wide / 2, 26);
      g.lineTo(x, 26 + len);
      g.lineTo(x + wide / 2, 26);
    }
    g.lineTo(w, 26);
    g.lineTo(w, 0);
    g.closePath();
    g.fill();
  });
}

// ─────────────────────────────────────────────────────────────
// เสาหินกลางถ้ำ — หินงอกจากพื้นชนหินย้อยจากเพดาน
// ─────────────────────────────────────────────────────────────
function pillarBand() {
  return caveSprite('cvPillar', TILE, 300, (g, w, h) => {
    for (let i = 0; i < 6; i++) {
      const x = 140 + i * (w / 6) + hash(i * 5.9) * 120;
      const wide = 40 + hash(i * 3.3) * 40;
      g.fillStyle = C.rockLo;
      g.beginPath();
      g.moveTo(x - wide * 0.7, h);
      g.lineTo(x - wide * 0.3, 0);
      g.lineTo(x + wide * 0.3, 0);
      g.lineTo(x + wide * 0.7, h);
      g.closePath();
      g.fill();
      g.fillStyle = C.rock;
      g.beginPath();
      g.moveTo(x - wide * 0.7, h);
      g.lineTo(x - wide * 0.3, 0);
      g.lineTo(x - wide * 0.02, 0);
      g.lineTo(x - wide * 0.1, h);
      g.closePath();
      g.fill();
      // แร่เรืองฝังในเสา
      g.fillStyle = 'rgba(127,232,255,.35)';
      for (let k = 0; k < 3; k++) {
        const ky = 60 + k * 74 + hash(i * 2.2 + k) * 30;
        g.fillRect(x - 6, ky, 12, 5);
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────
// บ่อน้ำเรืองแสงที่พื้นถ้ำ — แถบน้ำกับเงาสะท้อนที่ไหวช้า ๆ
// ─────────────────────────────────────────────────────────────
const POOL_H = 78;

function poolBand() {
  return caveSprite('cvPool', TILE, POOL_H, (g, w, h) => {
    // ตลิ่งหิน
    g.fillStyle = C.rockLo;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) {
      const x = 120 + i * (w / 5) + hash(i * 4.1) * 120;
      const ww = 220 + hash(i * 6.6) * 260;
      const grad = g.createLinearGradient(0, 10, 0, h - 6);
      grad.addColorStop(0, C.poolLite);
      grad.addColorStop(0.45, C.pool);
      grad.addColorStop(1, '#155C86');
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(x, h - 16, ww / 2, 26, 0, 0, TAU);
      g.fill();
      // ขอบน้ำเรือง
      g.strokeStyle = 'rgba(143,240,255,.6)';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(x, h - 16, ww / 2, 26, 0, Math.PI, TAU);
      g.stroke();
    }
  });
}

// ─────────────────────────────────────────────────────────────
// ละอองแร่ลอย — พูลคงที่ ลอยขึ้นช้า ๆ
// ─────────────────────────────────────────────────────────────
const MOTES = Array.from({ length: 18 }, (_, i) => ({
  x: hash(i * 2.3) * W,
  y: hash(i * 5.1) * GROUND_Y,
  r: 1 + hash(i * 7.7) * 2,
  vy: -(0.12 + hash(i * 3.3) * 0.3),
  ph: hash(i * 9.1) * TAU,
}));

/** ละอองแร่ — ลอยอยู่ในถ้ำ จึงต้องไหลไปกับถ้ำด้วย ไม่ใช่ลอยติดจอ (ดูหมายเหตุใน bakery.js) */
function drawMotes(ctx, cam, tick, a) {
  const drift = (x) => wrap(x - cam * 0.4, W + 120) - 60;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = C.mote;
  for (const p of MOTES) {
    p.y += p.vy;
    if (p.y < -6) { p.y = GROUND_Y + 6; p.x = hash(p.x * 0.31 + tick) * W; }
    ctx.globalAlpha = a * (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(tick * 0.05 + p.ph)));
    ctx.beginPath();
    ctx.arc(drift(p.x) + Math.sin(tick * 0.02 + p.ph) * 6, p.y, p.r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ฉากหลังโถงถ้ำเต็มจอ
//
// @param opts.deep  0 = ปากถ้ำยังมีแสงข้างนอก / 1 = ลึกเต็มที่ (ด่านจริงใช้ 1)
// ทุกอย่างอิง cam ล้วน ทางเข้ากับด่านจริงจึงวาดภาพเดียวกันเป๊ะที่กล้องเดียวกัน
// ─────────────────────────────────────────────────────────────
export function drawCaveBackdrop(ctx, cam, tick, opts = {}) {
  const deep = clamp01(opts.deep ?? 1);
  const z = zoneAt(cam);          // 0 โถงกว้าง → 1 ดงคริสตัล

  ctx.drawImage(backWall(), 0, 0, W, H);

  // 1) ยอดคริสตัลยักษ์ไกลสุด
  ctx.save();
  ctx.globalAlpha = 0.9;
  tileRow(ctx, farSpires(), TILE, cam * 0.06, GROUND_Y - 236);
  ctx.restore();

  // 2) สายแร่บนผนัง — ดงคริสตัลยิ่งเข้มยิ่งสว่าง
  ctx.save();
  ctx.globalAlpha = 0.85;
  tileRow(ctx, veinBand(), TILE, cam * 0.14, GROUND_Y - 250);
  ctx.restore();

  // 3) เพดานหินย้อยสองชั้น — ชั้นในต่ำลงเมื่อเข้าดงคริสตัล (ถ้ำบีบแคบ)
  ctx.save();
  ctx.globalAlpha = 0.85;
  tileRow(ctx, ceilingBand('cvCeilFar', 22, 70, C.wallLo), TILE, cam * 0.1, -46);
  ctx.globalAlpha = 1;
  tileRow(ctx, ceilingBand('cvCeilNear', 14, 116, C.wall), TILE, cam * 0.26, -70 + z * 24);
  ctx.restore();

  // 4) เสาหิน — ความเข้มคงที่ (เดิมสว่างตามย่าน = ทั้งแถวค่อย ๆ สว่างขึ้นเองทั้งที่ไม่ได้ขยับ)
  ctx.save();
  ctx.globalAlpha = 0.85;
  tileRow(ctx, pillarBand(), TILE, cam * 0.34, GROUND_Y - 300);
  ctx.restore();

  // 5) คริสตัลชั้นกลางที่พื้น — กลุ่มเด่นที่สุดของฉาก
  placed(cam, CRYSTAL_DEPTH, CRYSTAL_GAP, 160, (i, x) => {
    // ช่องนี้มีคริสตัลไหม — ย่านของช่องตัวเอง ไม่ใช่ย่านที่กล้องอยู่
    const camHere = (i * CRYSTAL_GAP - W * 0.5) / CRYSTAL_DEPTH;
    const dense = zoneAt(camHere);
    if (hash(i * 3.7) > 0.25 + dense * 0.55) return;     // ดงคริสตัล = ช่องว่างน้อยลง
    const s = 0.5 + hash(i * 6.1) * 0.7;
    ctx.globalAlpha = deep;
    ctx.drawImage(crystalSprite(i), x, GROUND_Y - 220 * s + 18, 120 * s, 220 * s);
    // ประกายวับที่ยอด — ดวงเดียวต่อแท่ง สลับจังหวะกันไป
    const tw = Math.sin(tick * 0.05 + i * 2.1);
    if (tw > 0.75) {
      ctx.globalAlpha = (tw - 0.75) * 4 * deep;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x + 60 * s, GROUND_Y - 220 * s + 34, 2.6, 0, TAU);
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;

  // 6) บ่อน้ำเรืองแสงที่พื้นถ้ำ — ปูต่อกันทั้งแนว ความเข้มคงที่
  // เดิมทั้งแถวจางหายตอนเข้าดงคริสตัล ซึ่งเห็นเป็นน้ำระเหยหายไปกับที่
  ctx.save();
  ctx.globalAlpha = 0.62;
  tileRow(ctx, poolBand(), TILE, cam * 0.56, GROUND_Y - POOL_H + 22);
  ctx.restore();

  drawMotes(ctx, cam, tick, deep);
}

export function warmCaveArt() {
  backWall();
  for (let i = 0; i < 6; i++) crystalSprite(i);
  farSpires();
  veinBand();
  ceilingBand('cvCeilFar', 22, 70, C.wallLo);
  ceilingBand('cvCeilNear', 14, 116, C.wall);
  pillarBand();
  poolBand();
}
