// src/render/gachabg.js
//
// ══ พื้นหลัง "ร้านเซอร์ไพรส์เวทมนตร์" ของหน้าตู้กาช่า ═══════════════════
//
// วาดด้วย Canvas 2D ล้วน ไม่มีไฟล์ภาพ — ใช้ตัวคุมผ้าใบตัวเดียวกับคลังน้อง/หน้าสกิล (makeCanvasBg)
// ใช้กับแผง #gachaPanel ทั้งสองตู้ (สุ่มสมบัติ / สุ่มสกิน) — main.js เป็นคนเปิดปิด
//
// ── ต่างจากหน้าอื่นยังไง ──
//   คลังน้อง = เมฆปุยอบอุ่น · หน้าสกิล = วงเวท ละอองพลัง
//   ตู้กาช่า = ร้านของขวัญเวทมนตร์: แสงทองนวลหลังตัวตู้ ละอองทองลอยวนรอบตู้
//   ของตกแต่งจิ๋วจาง ๆ ธีมเซอร์ไพรส์ (กล่องของขวัญ ริบบิ้น แคปซูล เหรียญ เพชร หัวใจ รอยเท้า)
//
// ── หลักของภาพ ──
//   ตัวตู้กับของรางวัลต้องเด่นที่สุดเสมอ — พื้นหลังจางที่สุดในหน้า ของตกแต่งอยู่ริมขอบ
//   ทองใช้น้อย ๆ แทน "ของมีค่า" ไม่ใช่ไฟคาสิโน · ไม่มีของชิ้นใหญ่ ไม่มีตู้กาช่าตัวที่สอง
//
// ── ของที่ขยับไม่สร้างใหม่ทุกเฟรม ──
//   ทุกชิ้นวางครั้งเดียวใน layout() ตำแหน่งแต่ละเฟรมคำนวณจากเวลา
//   ไล่สีพื้น + หมอกริมล่าง อยู่ในชั้นนิ่ง (วาดครั้งเดียวต่อขนาดผ้าใบ)
//   ทุกเฟรม: แสงหายใจ 4 ก้อน · ละอองทอง 10 · ละอองลอยขึ้น 12 · ประกาย 7 · ของตกแต่ง 11

import { makeCanvasBg, drawPawPrint, drawHeart } from './dreambg.js';
import { drawMagicGlow, drawSparkle, drawSoftCloud, drawTinyStar } from './skillbg.js';

const TAU = Math.PI * 2;

// ── สี ── ม่วงเป็นหลัก ชมพู = ของขวัญ/เซอร์ไพรส์ · ทอง = ของมีค่า (ใช้น้อย) · มิ้นต์แต้มเล็ก
const PLUM = '56,22,100';
const LAVENDER = '206,178,248';
const ROSE = '247,199,232';
const PEACH = '241,180,177';
const GOLD = '255,214,120';
const CREAM = '255,246,232';
const MINT = '176,240,226';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────
// ชิ้นส่วนธีมกาช่า (ตัวจิ๋ว จาง — ของตกแต่งพื้นหลังเท่านั้น)
// ─────────────────────────────────────────────────────────────

/** กล่องของขวัญจิ๋ว — ตัวกล่อง ฝา ริบบิ้นไขว้ โบว์สองห่วง */
export function drawGiftBox(ctx, x, y, s, alpha, body = ROSE, ribbon = CREAM) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${body})`;
  ctx.beginPath();
  ctx.roundRect(x - s * 0.8, y - s * 0.35, s * 1.6, s * 1.15, s * 0.16);
  ctx.roundRect(x - s * 0.95, y - s * 0.68, s * 1.9, s * 0.42, s * 0.12);
  ctx.fill();
  ctx.fillStyle = `rgb(${ribbon})`;
  ctx.fillRect(x - s * 0.13, y - s * 0.68, s * 0.26, s * 1.48);
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.ellipse(x + side * s * 0.32, y - s * 0.86, s * 0.32, s * 0.2, side * 0.5, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

/** ริบบิ้นปลิว — เส้นโค้งคลื่นปลายมน */
export function drawRibbon(ctx, x, y, s, alpha, color = ROSE, t = 0) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = `rgb(${color})`;
  ctx.lineWidth = Math.max(1.5, s * 0.22);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 1.4, y);
  const wob = Math.sin(t) * s * 0.15;
  ctx.bezierCurveTo(x - s * 0.7, y - s * 0.9 - wob, x - s * 0.2, y + s * 0.9 + wob, x + s * 0.4, y);
  ctx.quadraticCurveTo(x + s * 0.9, y - s * 0.7, x + s * 1.4, y - s * 0.1);
  ctx.stroke();
  ctx.restore();
}

/** แคปซูลกาช่าจิ๋ว — ครึ่งบนสี ครึ่งล่างครีม เส้นคาดกลาง */
export function drawCapsule(ctx, x, y, r, rot, alpha, top = ROSE) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${top})`;
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = `rgb(${CREAM})`;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI);
  ctx.fill();
  ctx.globalAlpha = alpha * 0.8;
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.26, r * 0.14, -0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** เหรียญจิ๋ว — วงทอง ขอบในจาง (ไม่มีตัวเลข ไม่ใช่ตัวนับเงิน) */
export function drawCoin(ctx, x, y, r, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${GOLD})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,248,220,.85)';
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/** เพชรจิ๋วสีชมพู — ทรงเพชรเจียระไนตัดมุมบน */
export function drawDiamond(ctx, x, y, s, alpha, color = ROSE) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.55, y - s * 0.32);
  ctx.lineTo(x - s * 0.28, y - s * 0.62);
  ctx.lineTo(x + s * 0.28, y - s * 0.62);
  ctx.lineTo(x + s * 0.55, y - s * 0.32);
  ctx.lineTo(x, y + s * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.28, y - s * 0.62);
  ctx.lineTo(x, y - s * 0.32);
  ctx.lineTo(x - s * 0.55, y - s * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ชั้นของฉาก
// ─────────────────────────────────────────────────────────────

/** ตำแหน่งตัวตู้ในการ์ด (สัดส่วน) — แผ่นขวาของหน้ากาช่า แสงทอง/ละอองทองโคจรรอบจุดนี้ */
const MACHINE = { x: 0.77, y: 0.52 };

function layout() {
  const rand = seeded(20261006);
  const L = {};
  // แสงหายใจ: หลังแถบเลือกตู้ (ซ้าย) / บนกลาง / หลังตัวตู้ (ทองนวล) / มุมล่างซ้าย
  L.lights = [
    { x: 0.1, y: 0.42, r: 0.26, c: LAVENDER, a: 0.2, ph: 0 },
    { x: 0.5, y: 0.0, r: 0.42, c: ROSE, a: 0.3, ph: 1.4 },
    { x: MACHINE.x, y: MACHINE.y, r: 0.3, c: GOLD, a: 0.14, ph: 2.6 },
    { x: 0.02, y: 1.0, r: 0.3, c: PEACH, a: 0.24, ph: 3.9 },
  ];
  // หมอกริมล่างกับมุม (ชั้นนิ่ง)
  L.mists = [
    { x: 0.06, y: 1.04, w: 0.34, a: 0.2, c: ROSE },
    { x: 0.95, y: 1.05, w: 0.32, a: 0.18, c: LAVENDER },
    { x: 0.5, y: 1.1, w: 0.3, a: 0.1, c: PEACH },
  ];
  // ของตกแต่งธีมเซอร์ไพรส์ — ริมขอบ ส่วนใหญ่ซ่อนครึ่งหลังแผ่น ขยับขึ้นลงเบา ๆ
  L.decor = [
    { k: 'gift', x: 0.06, y: 0.82, s: 9, a: 0.2, c: ROSE },
    { k: 'gift', x: 0.96, y: 0.88, s: 8, a: 0.16, c: LAVENDER },
    { k: 'ribbon', x: 0.3, y: 0.06, s: 10, a: 0.18, c: ROSE },
    { k: 'capsule', x: 0.04, y: 0.2, s: 6, a: 0.24, c: ROSE },
    { k: 'capsule', x: 0.97, y: 0.3, s: 5, a: 0.2, c: MINT },
    { k: 'coin', x: 0.62, y: 0.05, s: 5, a: 0.22 },
    { k: 'coin', x: 0.93, y: 0.62, s: 4, a: 0.18 },
    { k: 'diamond', x: 0.16, y: 0.06, s: 8, a: 0.24, c: ROSE },
    { k: 'diamond', x: 0.97, y: 0.12, s: 7, a: 0.2, c: PEACH },
    { k: 'heart', x: 0.14, y: 0.96, s: 6, a: 0.2 },
    { k: 'paw', x: 0.44, y: 0.97, s: 7, a: 0.12 },
  ];
  // ประกาย: ห่าง ๆ ริมขอบ กะพริบช้า
  L.sparkles = Array.from({ length: 7 }, (_, i) => ({
    x: i % 2 ? (rand() < 0.5 ? 0.02 + rand() * 0.1 : 0.9 + rand() * 0.08) : 0.2 + rand() * 0.6,
    y: i % 2 ? 0.15 + rand() * 0.7 : 0.02 + rand() * 0.07,
    r: 3 + rand() * 4,
    ph: rand() * TAU,
    sp: 0.5 + rand() * 0.6,
    c: [CREAM, GOLD, ROSE][i % 3],
  }));
  // ละอองทอง: โคจรวงรีกว้างรอบตัวตู้ช้า ๆ (อยู่ริมแผ่นตู้ ไม่ทับปุ่มสุ่ม — จางลงตอนผ่านครึ่งล่าง)
  L.gold = Array.from({ length: 10 }, () => ({
    a0: rand() * TAU,
    v: (0.05 + rand() * 0.05) * (rand() < 0.5 ? -1 : 1),
    rx: 0.17 + rand() * 0.05,
    ry: 0.36 + rand() * 0.08,
    r: 1 + rand() * 1.3,
    ph: rand() * TAU,
  }));
  // ละอองลอยขึ้น: ทั่วจอ จางเข้าออก (ชมพู/ครีม/ลาเวนเดอร์ แต้มทองนิดเดียว)
  L.motes = Array.from({ length: 12 }, (_, i) => ({
    x: rand(),
    y: rand(),
    v: 0.006 + rand() * 0.008,
    sw: rand() * TAU,
    r: 1 + rand() * 1.5,
    c: [ROSE, CREAM, LAVENDER, ROSE, GOLD, PEACH][i % 6],
  }));
  return L;
}

/** ไล่สีพื้น: ขอบม่วงเข้ม กลางลาเวนเดอร์นวล (เอียงไปทางตัวตู้) */
export function drawBackgroundGradient(ctx, w, h) {
  const R = Math.max(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#9D6CDA');
  g.addColorStop(0.55, '#8656C8');
  g.addColorStop(1, '#6B3CAE');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  drawMagicGlow(ctx, w * 0.6, h * 0.5, R * 0.6, LAVENDER, 0.3);
  const v = ctx.createRadialGradient(w * 0.58, h * 0.5, R * 0.26, w * 0.58, h * 0.5, R * 0.78);
  v.addColorStop(0, `rgba(${PLUM},0)`);
  v.addColorStop(1, `rgba(${PLUM},0.4)`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** หมอกนุ่ม ๆ ริมล่าง (ชั้นนิ่ง) */
export function drawSoftClouds(ctx, w, h, L) {
  for (const m of L.mists) drawSoftCloud(ctx, m.x * w, m.y * h, m.w * w, m.a, m.c);
}

/** แสงเวทมนตร์หายใจ (ขยาย/หดช้า ๆ) */
export function drawMagicalLight(ctx, w, h, L, t) {
  const R = Math.max(w, h);
  for (const l of L.lights) {
    const b = 0.5 + 0.5 * Math.sin(t * 0.45 + l.ph);
    drawMagicGlow(ctx, l.x * w, l.y * h, l.r * R * (0.93 + b * 0.1), l.c, l.a * (0.82 + b * 0.18));
  }
}

/** ของตกแต่งธีมกาช่า — ขยับขึ้นลงเบามาก */
export function drawGiftDecorations(ctx, w, h, L, t) {
  const u = Math.min(w, h) / 400;
  for (const [i, d] of L.decor.entries()) {
    const x = d.x * w;
    const y = (d.y + Math.sin(t * 0.4 + i * 1.3) * 0.006) * h;
    const s = d.s * u;
    if (d.k === 'gift') drawGiftBox(ctx, x, y, s, d.a, d.c);
    else if (d.k === 'ribbon') drawRibbon(ctx, x, y, s, d.a, d.c, t * 0.5 + i);
    else if (d.k === 'capsule') drawCapsule(ctx, x, y, s, Math.sin(t * 0.3 + i) * 0.4, d.a, d.c);
    else if (d.k === 'coin') drawCoin(ctx, x, y, s, d.a);
    else if (d.k === 'diamond') drawDiamond(ctx, x, y, s, d.a, d.c);
    else if (d.k === 'heart') drawHeart(ctx, x, y, s, d.a, ROSE);
    else drawPawPrint(ctx, x, y, s, -0.3, d.a, CREAM);
  }
}

/** ประกายกะพริบช้า */
export function drawFloatingSparkles(ctx, w, h, L, t) {
  const u = Math.min(w, h) / 400;
  for (const s of L.sparkles) {
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    if (s.c === GOLD) drawTinyStar(ctx, s.x * w, s.y * h, s.r * u * (0.8 + tw * 0.3), 0.12 + tw * 0.32, GOLD);
    else drawSparkle(ctx, s.x * w, s.y * h, s.r * u * (0.8 + tw * 0.3), 0.14 + tw * 0.38, s.c);
  }
}

/** ละอองทองโคจรรอบตัวตู้ — จางลงตอนอยู่ครึ่งล่าง (โซนปุ่มสุ่ม) และกะพริบเบา ๆ */
export function drawGoldenParticles(ctx, w, h, L, t) {
  const u = Math.min(w, h) / 400;
  const cx = MACHINE.x * w, cy = MACHINE.y * h;
  ctx.fillStyle = `rgb(${GOLD})`;
  for (const p of L.gold) {
    const a = p.a0 + t * p.v;
    const x = cx + Math.cos(a) * p.rx * w;
    const y = cy + Math.sin(a) * p.ry * h;
    const low = Math.max(0, Math.sin(a));                     // 0 = ครึ่งบน → 1 = ล่างสุด
    const alpha = (0.32 + 0.22 * Math.sin(t * 1.1 + p.ph)) * (1 - low * 0.8);
    if (alpha < 0.03) continue;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, p.r * u, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** ละอองลอยขึ้นช้า ๆ จางเข้าออก */
export function drawMagicStars(ctx, w, h, L, t) {
  const u = Math.min(w, h) / 400;
  for (const m of L.motes) {
    const y = 1.05 - ((m.y + t * m.v) % 1.1);
    const x = m.x + Math.sin(t * 0.5 + m.sw) * 0.01;
    const a = 0.3 * Math.min(1, (1.05 - y) * 6) * Math.min(1, y * 4);
    if (a <= 0.02) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = `rgb(${m.c})`;
    ctx.beginPath();
    ctx.arc(x * w, y * h, m.r * u, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** ชั้นนิ่งทั้งหมด */
export function drawGachaBackground(ctx, w, h, L) {
  drawBackgroundGradient(ctx, w, h);
  drawSoftClouds(ctx, w, h, L);
}

/** ของที่ขยับทั้งหมด — t เป็นวินาที (ลดการเคลื่อนไหว = 0) */
function drawGachaLive(ctx, w, h, L, t) {
  drawMagicalLight(ctx, w, h, L, t);
  drawGiftDecorations(ctx, w, h, L, t);
  drawFloatingSparkles(ctx, w, h, L, t);
  drawGoldenParticles(ctx, w, h, L, t);
  drawMagicStars(ctx, w, h, L, t);
}

/** พื้นหลังร้านเซอร์ไพรส์ของหน้าตู้กาช่า */
export function makeGachaBg(canvas, isActive) {
  return makeCanvasBg(canvas, isActive, { layout, still: drawGachaBackground, live: drawGachaLive });
}
