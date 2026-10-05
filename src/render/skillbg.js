// src/render/skillbg.js
//
// ══ พื้นหลัง "ห้องพลังพิเศษของน้องแมว" ของหน้าสกิล ═══════════════════
//
// วาดด้วย Canvas 2D ล้วน ไม่มีไฟล์ภาพ — ใช้ตัวคุมผ้าใบตัวเดียวกับคลังน้อง (makeCanvasBg ใน dreambg.js)
// ใช้กับแผง #talentPanel ทั้งสองหมวด (สกิล / พรสวรรค์) — main.js เป็นคนเปิดปิด
//
// ── ต่างจากคลังน้องยังไง ──
//   คลังน้อง = บ้าน/โลกของน้อง: เมฆปุย ฟุ้ง อบอุ่น
//   หน้าสกิล = พลังพิเศษของน้อง: ออร่าหายใจเบา ๆ วงเวทน่ารักหมุนช้ามาก ละอองพลังลอยวนเข้าหากลาง
//   ประกายดาว สัญลักษณ์จาง ๆ (จันทร์เสี้ยว หัวใจ รอยเท้า หูแมว) — เมฆเหลือแค่หมอกบาง ๆ ริมขอบ
//
// ── หลักของภาพ ──
//   พื้นหลังต้องจางที่สุดในหน้าเสมอ — ของตกแต่งอยู่ริมขอบกับที่ว่าง หลังการ์ดโปร่งเกือบหมด
//   เวทมนตร์แบบน่ารัก ไม่ใช่ RPG มืด: ไม่มีอักษรรูน ไม่มีวงใหญ่ ไม่มีนีออน
//
// ── ของที่ขยับไม่สร้างใหม่ทุกเฟรม ──
//   ละออง ประกาย วงเวท สัญลักษณ์ ถูกวางครั้งเดียวใน layout() ตำแหน่งแต่ละเฟรมคำนวณจากเวลา
//   (ไม่มีการ new ออบเจกต์ระหว่างวาด) — ราว 22 ละออง / 8 ประกาย / 3 วง / 6 ออร่า
//   ไล่สีพื้นกับหมอกอยู่ในชั้นนิ่ง วาดครั้งเดียวต่อขนาดผ้าใบ

import { makeCanvasBg, drawPawPrint, drawHeart } from './dreambg.js';

const TAU = Math.PI * 2;

// ── สี ── ม่วงเป็นหลัก ขอบเข้มแบบพลัม กลางลาเวนเดอร์อ่อน แต้มชมพู/ฟ้าอ่อน/มิ้นต์/ครีมเหลือง
const PLUM = '58,24,104';
const LAVENDER = '206,178,248';
const ROSE = '247,199,232';    // #F7C7E8
const PEACH = '241,180,177';   // #F1B4B1
const SKY = '186,214,255';
const MINT = '176,240,226';
const BUTTER = '254,224,175';  // #FEE0AF — ใช้แค่แต้มเล็ก ๆ หน้านี้ไม่เอาเหลืองเยอะ
const CREAM = '255,246,232';

/** สุ่มแบบกำหนดผลได้ — เปิดหน้ากี่ครั้งของก็อยู่ที่เดิม */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────
// ชิ้นส่วนพื้นฐาน
// ─────────────────────────────────────────────────────────────

/** แสงฟุ้งวงกลม — จางจากกลางออกไปหมดที่ขอบ */
export function drawMagicGlow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color},${alpha})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** ออร่า = แสงฟุ้งที่หายใจ (ขยาย/หดช้า ๆ) — breath 0..1 */
export function drawAura(ctx, x, y, r, color, alpha, breath) {
  drawMagicGlow(ctx, x, y, r * (0.92 + breath * 0.12), color, alpha * (0.8 + breath * 0.2));
}

/** ลูกแก้วพลังจิ๋ว — แกนสว่าง + ขอบฟุ้ง */
export function drawMagicOrb(ctx, x, y, r, color, alpha) {
  drawMagicGlow(ctx, x, y, r * 3, color, alpha * 0.35);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** ประกายสี่แฉกเว้าโค้ง */
export function drawSparkle(ctx, x, y, r, alpha, color = CREAM) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** ดาวจิ๋วห้าแฉกมน ๆ */
export function drawTinyStar(ctx, x, y, r, alpha, color = BUTTER) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.48 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** ละอองพลังหนึ่งเม็ด — วงกลม / ข้าวหลามตัด / บวก ตามชนิด */
export function drawMagicParticle(ctx, x, y, r, kind, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ctx.strokeStyle = `rgb(${color})`;
  ctx.beginPath();
  if (kind === 1) {
    ctx.moveTo(x, y - r * 1.4); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r * 1.4); ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 2) {
    ctx.lineWidth = Math.max(1, r * 0.55);
    ctx.lineCap = 'round';
    ctx.moveTo(x - r * 1.3, y); ctx.lineTo(x + r * 1.3, y);
    ctx.moveTo(x, y - r * 1.3); ctx.lineTo(x, y + r * 1.3);
    ctx.stroke();
  } else {
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** จันทร์เสี้ยว — วงกลมเจาะด้วยวงกลมเยื้อง */
function drawMoon(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0.35 * Math.PI, 1.65 * Math.PI, false);
  ctx.arc(x + r * 0.42, y - r * 0.12, r * 0.78, 1.55 * Math.PI, 0.45 * Math.PI, true);
  ctx.closePath();
  ctx.fill();
}

/** หูแมวสองข้าง (เงาหัวครึ่งบน) */
function drawEars(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y + r * 0.3, r * 0.9, Math.PI, 0);
  for (const side of [-1, 1]) {
    ctx.moveTo(x + side * r * 0.85, y + r * 0.2);
    ctx.lineTo(x + side * r * 0.75, y - r * 0.9);
    ctx.lineTo(x + side * r * 0.2, y - r * 0.45);
  }
  ctx.fill();
}

/** สัญลักษณ์ลอยจาง ๆ — kind: moon / heart / paw / star / ears */
export function drawFloatingSymbol(ctx, x, y, r, kind, alpha, rot = 0) {
  if (kind === 'heart') { drawHeart(ctx, x, y, r, alpha, ROSE); return; }
  if (kind === 'paw') { drawPawPrint(ctx, x, y, r, rot, alpha, CREAM); return; }
  if (kind === 'star') { drawTinyStar(ctx, x, y, r, alpha, BUTTER); return; }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${kind === 'moon' ? BUTTER : LAVENDER})`;
  if (kind === 'moon') drawMoon(ctx, x, y, r);
  else drawEars(ctx, x, y, r);
  ctx.globalAlpha = 1;
}

/**
 * วงเวทน่ารัก — วงบางสองชั้น + จุด/ดาว/หัวใจ/รอยเท้าเล็ก ๆ เรียงรอบวง หมุนช้ามาก
 * ไม่มีอักษรรูนหรือเส้นซับซ้อน ตั้งใจให้เหมือนของตกแต่งเกมน่ารัก ไม่ใช่วงอาคม
 */
export function drawMagicRing(ctx, x, y, r, rot, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = `rgb(${CREAM})`;
  ctx.lineWidth = Math.max(1, r * 0.018);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([r * 0.05, r * 0.07]);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.8, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  // ของรอบวง: แปดตำแหน่ง สลับดาว / จุด / หัวใจ / รอยเท้า
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * TAU) / 8;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    const k = i % 4;
    if (k === 0) drawTinyStar(ctx, px, py, r * 0.07, alpha * 1.6, BUTTER);
    else if (k === 2) drawHeart(ctx, px, py, r * 0.05, alpha * 1.5, ROSE);
    else if (k === 3 && r > 40) drawPawPrint(ctx, px, py, r * 0.05, a, alpha * 1.4, CREAM);
    else {
      ctx.globalAlpha = alpha * 1.6;
      ctx.fillStyle = `rgb(${CREAM})`;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1, r * 0.022), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

/** หมอกบาง ๆ (เมฆจาง) — วงรีฟุ้งซ้อนสามก้อน ไม่มีขอบ */
export function drawSoftCloud(ctx, x, y, w, alpha, color = LAVENDER) {
  for (const [dx, dy, s] of [[-0.3, 0.05, 0.42], [0, -0.06, 0.55], [0.32, 0.04, 0.4]]) {
    drawMagicGlow(ctx, x + dx * w, y + dy * w, s * w, color, alpha);
  }
}

// ─────────────────────────────────────────────────────────────
// ฉาก
// ─────────────────────────────────────────────────────────────

function layout() {
  const rand = seeded(20261005);
  const L = {};
  // ออร่าหายใจ: บนกลาง / หลังการ์ดที่ติดตั้ง (ซ้าย) / กลางขวา / มุมล่างขวา
  // ชมพูเป็นตัวเล่นสีหลัก (บนกลาง + มุมล่างซ้าย) พีชมุมล่างขวา ฟ้า/มิ้นต์เป็นแต้มพลังเย็น ๆ เหลืองแต้มเดียวจาง ๆ
  L.auras = [
    { x: 0.5, y: 0.0, r: 0.46, c: ROSE, a: 0.36, ph: 0 },
    { x: 0.17, y: 0.42, r: 0.28, c: MINT, a: 0.13, ph: 1.7 },
    { x: 0.84, y: 0.46, r: 0.34, c: SKY, a: 0.14, ph: 3.1 },
    { x: 0.92, y: 1.0, r: 0.34, c: PEACH, a: 0.3, ph: 4.4 },
    { x: 0.06, y: 1.0, r: 0.3, c: ROSE, a: 0.26, ph: 2.3 },
    { x: 0.08, y: 0.04, r: 0.2, c: BUTTER, a: 0.12, ph: 5.2 },
  ];
  // วงเวท: เล็ก จาง หมุนช้ามาก (ราวหนึ่งรอบต่อ 3-5 นาที) — สองวงริมขอบ หนึ่งวงจางมากครึ่งหลังกริด
  L.rings = [
    { x: 0.1, y: 0.86, r: 0.15, a: 0.13, v: 0.022 },
    { x: 0.93, y: 0.14, r: 0.11, a: 0.12, v: -0.03 },
    { x: 0.64, y: 0.6, r: 0.3, a: 0.05, v: 0.012 },
  ];
  // หมอก: มุมล่างกับริมซ้ายขวา — อยู่ในชั้นนิ่ง (แสงฟุ้งก้อนใหญ่สิบกว่าก้อน วาดทุกเฟรมแล้วมือถือร้อน
  // ส่วนการลอยช้า ๆ ของมันแทบมองไม่เห็นอยู่แล้ว จึงไม่คุ้มค่าวาดใหม่)
  L.mists = [
    { x: 0.04, y: 1.02, w: 0.36, a: 0.2, c: ROSE },
    { x: 0.96, y: 1.04, w: 0.34, a: 0.2, c: PEACH },
    { x: -0.04, y: 0.45, w: 0.22, a: 0.12, c: LAVENDER },
    { x: 1.04, y: 0.62, w: 0.22, a: 0.12, c: ROSE },
  ];
  // สัญลักษณ์ลอยจาง ๆ (ขยับขึ้นลงเบามาก)
  L.symbols = [
    { x: 0.05, y: 0.2, r: 7, k: 'moon', a: 0.22 },
    { x: 0.96, y: 0.36, r: 6, k: 'heart', a: 0.22 },
    { x: 0.04, y: 0.62, r: 7, k: 'paw', a: 0.14, rot: -0.4 },
    { x: 0.97, y: 0.8, r: 7, k: 'ears', a: 0.16 },
    { x: 0.42, y: 0.04, r: 5, k: 'star', a: 0.24 },
    { x: 0.75, y: 0.97, r: 7, k: 'paw', a: 0.12, rot: 0.3 },
    { x: 0.28, y: 0.97, r: 6, k: 'heart', a: 0.16 },
  ];
  // ประกาย: ห่าง ๆ ส่วนใหญ่ริมขอบ กะพริบช้า
  L.sparkles = Array.from({ length: 8 }, (_, i) => ({
    x: i % 2 ? (rand() < 0.5 ? 0.02 + rand() * 0.1 : 0.88 + rand() * 0.1) : 0.15 + rand() * 0.7,
    y: i % 2 ? 0.1 + rand() * 0.8 : 0.02 + rand() * 0.08,
    r: 3 + rand() * 4,
    ph: rand() * TAU,
    sp: 0.5 + rand() * 0.7,
    c: [CREAM, ROSE, SKY, ROSE][i % 4],
  }));
  // ละอองพลัง: เกิดริมขอบ แล้ววนโค้งเข้าหากลางช้า ๆ จางหายก่อนถึงกลาง (ไม่ไปกองหลังการ์ด)
  L.motes = Array.from({ length: 22 }, (_, i) => ({
    a0: rand() * TAU,
    spin: (rand() < 0.5 ? -1 : 1) * (0.25 + rand() * 0.35),
    period: 14 + rand() * 12,      // วินาทีต่อรอบ (ขอบ → ใกล้กลาง)
    off: rand(),
    r: 1 + rand() * 1.6,
    kind: i % 6 === 0 ? 1 : i % 7 === 0 ? 2 : 0,
    c: [CREAM, ROSE, PEACH, SKY, ROSE, MINT, BUTTER][i % 7],
  }));
  return L;
}

/** ชั้นนิ่ง: ไล่สีพื้น ขอบเข้ม-กลางสว่าง หมอกริมขอบ */
export function drawSkillBackground(ctx, w, h, L) {
  const R = Math.max(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#9A6BDA');
  g.addColorStop(0.55, '#8457C9');
  g.addColorStop(1, '#6A3DAE');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // กลางสว่างนวล (สปอตไลต์หลังกริด) — รัศมีใหญ่มาก ขอบจึงไม่เห็นเป็นวง
  drawMagicGlow(ctx, w * 0.58, h * 0.5, R * 0.62, LAVENDER, 0.32);
  // ขอบเข้มแบบพลัม — ไล่จากใสกลางจอไปเข้มที่มุม
  const v = ctx.createRadialGradient(w * 0.55, h * 0.5, R * 0.25, w * 0.55, h * 0.5, R * 0.78);
  v.addColorStop(0, `rgba(${PLUM},0)`);
  v.addColorStop(1, `rgba(${PLUM},0.42)`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  for (const m of L.mists) drawSoftCloud(ctx, m.x * w, m.y * h, m.w * w, m.a, m.c);
}

/** ของที่ขยับทั้งหมด — t เป็นวินาที (ลดการเคลื่อนไหว = 0) */
export function updateSkillBackgroundAnimation(ctx, w, h, L, t) {
  const u = Math.min(w, h) / 400;
  const R = Math.max(w, h);
  for (const a of L.auras) {
    drawAura(ctx, a.x * w, a.y * h, a.r * R, a.c, a.a, 0.5 + 0.5 * Math.sin(t * 0.5 + a.ph));
  }
  for (const r of L.rings) {
    drawMagicRing(ctx, r.x * w, r.y * h, r.r * Math.min(w, h), t * r.v, r.a);
  }
  for (const [i, s] of L.symbols.entries()) {
    drawFloatingSymbol(ctx, s.x * w, (s.y + Math.sin(t * 0.4 + i) * 0.006) * h, s.r * u, s.k, s.a, s.rot || 0);
  }
  for (const s of L.sparkles) {
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    drawSparkle(ctx, s.x * w, s.y * h, s.r * u * (0.8 + tw * 0.3), 0.14 + tw * 0.4, s.c);
  }
  drawMagicParticles(ctx, w, h, L, t);
}

/**
 * ละอองพลังวนโค้งเข้าหากลาง — ระยะจากกลางลดจาก 0.62 → 0.3 ของจอ แล้วจางหาย เกิดใหม่ที่ขอบ
 * จางทั้งตอนเกิด (ขอบ) และตอนใกล้กลาง จึงไม่มีเม็ดไหนไปกองหลังตัวหนังสือบนการ์ด
 */
export function drawMagicParticles(ctx, w, h, L, t) {
  const u = Math.min(w, h) / 400;
  const cx = w * 0.56, cy = h * 0.52;
  for (const m of L.motes) {
    const p = ((t / m.period) + m.off) % 1;               // 0 = ขอบ → 1 = ใกล้กลาง
    const d = 0.62 - p * 0.32;
    const ang = m.a0 + m.spin * p * Math.PI;
    const x = cx + Math.cos(ang) * d * w * 0.62;
    const y = cy + Math.sin(ang) * d * h * 0.95;
    const a = 0.5 * Math.min(1, p * 5) * Math.min(1, (1 - p) * 3);
    if (a > 0.02) drawMagicParticle(ctx, x, y, m.r * u, m.kind, m.c, a);
  }
}

/** พื้นหลังห้องพลังพิเศษของหน้าสกิล */
export function makeSkillBg(canvas, isActive) {
  return makeCanvasBg(canvas, isActive, {
    layout,
    still: drawSkillBackground,
    live: updateSkillBackgroundAnimation,
  });
}
