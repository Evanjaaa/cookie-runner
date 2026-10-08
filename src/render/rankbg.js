// src/render/rankbg.js
//
// ══ พื้นหลัง "หอเกียรติยศน่ารักของน้องแมว" ของหน้าอันดับ ═══════════════
//
// วาดด้วย Canvas 2D ล้วน ไม่มีไฟล์ภาพ — ตัวคุมผ้าใบชุดเดียวกับหน้าอื่น (makeCanvasBg)
// ใช้กับแผง #rankPanel — main.js เป็นคนปลุก
//
// ── ต่างจากหน้าอื่นยังไง ──
//   คลังน้อง = บ้านนุ่ม · สกิล = พลัง · กาช่า = สมบัติ · กิจกรรม = ภารกิจ · สร้างสรรค์ = ศิลปะ · เลือกด่าน = การเดินทาง
//   หน้านี้ = ความภูมิใจ: สปอตไลต์นุ่ม ๆ จากด้านบน ลำแสงเวทีจาง ๆ กิ่งลอเรลโค้งรอบหัวเรื่อง
//   เหรียญ มงกุฎ ถ้วยรางวัลตัวจิ๋ว รอยเท้าเดินมาหาบอร์ด — "ใครจะได้ที่หนึ่งนะ?"
//   แข่งกันแบบเพื่อน: ไม่มีเปลวไฟ สายฟ้า สีแดงเตือน หรือของดุดัน
//
// ── หลักของภาพ ──
//   แถวอันดับคือพระเอก — หลังรายการอันดับต้องสะอาด ไม่มีของตกแต่งชิ้นไหนเข้าไปได้
//   (มีแค่แสงนวลหลังแถว 1-3: ทอง / เงินลาเวนเดอร์ / ทองแดงพีช โผล่แค่รอบขอบแถว)
//   ทองใช้แค่บอก "ความสำเร็จ" (ที่หนึ่ง เหรียญ มงกุฎ) ม่วงยังเป็นหลักทั้งหน้า
//   ที่ว่างใต้รายการด่านฝั่งซ้ายคือที่ของถ้วย/เหรียญ/รอยเท้า — วัดโซนห้ามวาดจากหน้าจริงเป็นระยะ
//
// ── แสงที่เกาะแถว/การ์ด ── ใช้ trackRect (event-bg.js) ตั้งแต่ต้น:
//   เลื่อนขึ้นและจางเข้าพร้อมเนื้อหาตอนเปิดหน้า · เลื่อนรายการแล้วแสงตามแถวไป (ตัดขอบตามช่องรายการ)
//
// ── ของที่ขยับไม่สร้างใหม่ทุกเฟรม ──
//   ชั้นนิ่ง: ไล่สีพื้น + ลำแสงเวที + ดาวจุดไกล ๆ + หมอกล่าง (ไม่ขึ้นกับเลย์เอาต์)
//   ทุกเฟรม: สปอตไลต์ 3 · วงรัศมี+ลอเรลหลังหัวเรื่อง · แสงแถว 1-3 · แสงด่านที่เลือก
//            ของรางวัลจิ๋ว 7 · รอยเท้า 3 กลุ่ม · ประกาย 7 · ละอองแสง 16

import { makeCanvasBg, drawPawPrint } from './dreambg.js';
import { drawMagicGlow, drawSparkle, drawTinyStar, drawSoftCloud } from './skillbg.js';
import { layoutRect, trackRect } from './event-bg.js';

const TAU = Math.PI * 2;

// ── สี ── ม่วงเป็นหลัก · ทองใช้กับความสำเร็จเท่านั้น
const PLUM = '56,22,100';
const LAVENDER = '206,178,248';
const ROSE = '247,199,232';
const PEACH = '241,180,177';
const CREAM = '255,246,232';
const GOLD = '255,214,120';
const SILVER = '222,214,246';   // เงินอมลาเวนเดอร์ (ที่สอง)
const BRONZE = '242,178,140';   // ทองแดงพีช (ที่สาม)
const MINT = '176,240,226';

/** วัดหน้าใหม่ทุกกี่วินาที (เปลี่ยนด่าน = รายการอันดับสร้างใหม่ / หมุนจอ) */
const REMEASURE_S = 0.5;

/** โซนห้ามวาด — หลังรายการอันดับทั้งก้อนต้องสะอาด (ชื่อ คะแนน เลขอันดับ รูปน้อง) */
const KEEP_OUT = ['.skin-title', '.rank-stage', '.rank-list', '.backbtn'];

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────
// ของรางวัลจิ๋ว (ลวดลายพื้นหลัง ไม่ใช่ไอคอนที่กดได้) — วาดรอบ (0,0) ขนาด s
// ─────────────────────────────────────────────────────────────

/** เหรียญรางวัล: ริบบิ้นสองแถบ + เหรียญกลม + ดาวกลางเหรียญ — shimmer = 0..1 ประกายวิ่งผ่าน */
export function drawMedal(ctx, x, y, s, alpha, color = GOLD, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${ROSE})`;
  ctx.beginPath();
  ctx.moveTo(-s * 0.55, -s * 1.5);
  ctx.lineTo(-s * 0.1, -s * 1.5);
  ctx.lineTo(s * 0.15, -s * 0.5);
  ctx.lineTo(-s * 0.25, -s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgb(${LAVENDER})`;
  ctx.beginPath();
  ctx.moveTo(s * 0.55, -s * 1.5);
  ctx.lineTo(s * 0.1, -s * 1.5);
  ctx.lineTo(-s * 0.15, -s * 0.5);
  ctx.lineTo(s * 0.25, -s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.62, 0, TAU);
  ctx.fill();
  ctx.restore();
  drawTinyStar(ctx, x, y, s * 0.32, alpha * 0.9, CREAM);
}

/** มงกุฎจิ๋ว: ฐานโค้ง ยอดสามแฉก ลูกกลมปลายยอด */
export function drawCrown(ctx, x, y, s, alpha, color = GOLD) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.moveTo(-s, s * 0.45);
  ctx.lineTo(-s * 1.05, -s * 0.45);
  ctx.lineTo(-s * 0.5, 0);
  ctx.lineTo(0, -s * 0.7);
  ctx.lineTo(s * 0.5, 0);
  ctx.lineTo(s * 1.05, -s * 0.45);
  ctx.lineTo(s, s * 0.45);
  ctx.quadraticCurveTo(0, s * 0.62, -s, s * 0.45);
  ctx.fill();
  for (const [px, py] of [[-s * 1.05, -s * 0.45], [0, -s * 0.7], [s * 1.05, -s * 0.45]]) {
    ctx.beginPath();
    ctx.arc(px, py, s * 0.17, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** ถ้วยรางวัลจิ๋ว: ตัวถ้วยโค้ง หูสองข้าง ก้าน ฐาน */
export function drawTrophy(ctx, x, y, s, alpha, color = GOLD) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.moveTo(-s * 0.7, -s);
  ctx.lineTo(s * 0.7, -s);
  ctx.quadraticCurveTo(s * 0.7, s * 0.05, 0, s * 0.15);
  ctx.quadraticCurveTo(-s * 0.7, s * 0.05, -s * 0.7, -s);
  ctx.fill();
  ctx.fillRect(-s * 0.1, s * 0.1, s * 0.2, s * 0.45);
  ctx.beginPath();
  ctx.roundRect(-s * 0.45, s * 0.52, s * 0.9, s * 0.26, s * 0.08);
  ctx.fill();
  ctx.strokeStyle = `rgb(${color})`;
  ctx.lineWidth = s * 0.14;
  ctx.beginPath();
  ctx.arc(-s * 0.72, -s * 0.62, s * 0.28, Math.PI * 0.5, Math.PI * 1.5);
  ctx.moveTo(s * 0.72, -s * 0.9);
  ctx.arc(s * 0.72, -s * 0.62, s * 0.28, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();
  ctx.restore();
}

/**
 * กิ่งลอเรลหนึ่งข้าง (พวงช่อชัย) — โค้งจากโคนใต้หัวเรื่องขึ้นไปด้านข้าง ใบรีเรียงสลับสองฝั่งของกิ่ง
 * วาดเป็นเงาจาง ๆ โอบหัวเรื่อง ไม่ใช่ตราสัญลักษณ์ทองละเอียด
 *   (x, y)  โคนกิ่ง (ใต้มุมหัวเรื่อง) · side = -1 กิ่งซ้าย (โค้งไปซ้าย) / 1 กิ่งขวา · len = ความสูงกิ่ง
 */
export function drawLaurel(ctx, x, y, len, side, alpha, color = GOLD) {
  // กิ่งเป็นเส้นโค้งกำลังสอง: โคน → ป่องออกด้านข้าง → ปลายชี้ขึ้นเข้าหาหัวเรื่องนิด ๆ
  const p0 = { x, y };
  const p1 = { x: x + side * len * 0.62, y: y - len * 0.05 };
  const p2 = { x: x + side * len * 0.42, y: y - len * 0.95 };
  const at = (k) => ({
    x: (1 - k) * (1 - k) * p0.x + 2 * (1 - k) * k * p1.x + k * k * p2.x,
    y: (1 - k) * (1 - k) * p0.y + 2 * (1 - k) * k * p1.y + k * k * p2.y,
  });
  const dir = (k) => Math.atan2(
    2 * (1 - k) * (p1.y - p0.y) + 2 * k * (p2.y - p1.y),
    2 * (1 - k) * (p1.x - p0.x) + 2 * k * (p2.x - p1.x),
  );
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = `rgb(${color})`;
  ctx.fillStyle = `rgb(${color})`;
  ctx.lineWidth = Math.max(1, len * 0.04);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
  ctx.stroke();
  // ใบ: ห้าคู่ ชี้ไปทางปลายกิ่ง เล็กลงเรื่อย ๆ + ใบยอดหนึ่งใบ
  for (let i = 1; i <= 5; i++) {
    const k = i / 6;
    const q = at(k);
    const d = dir(k);
    const ls = len * 0.13 * (1 - k * 0.3);
    for (const off of [-0.55, 0.55]) {
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(d + off);
      ctx.beginPath();
      ctx.ellipse(ls * 0.85, 0, ls, ls * 0.42, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  const tip = at(1);
  ctx.translate(tip.x, tip.y);
  ctx.rotate(dir(1));
  ctx.beginPath();
  ctx.ellipse(len * 0.07, 0, len * 0.1, len * 0.042, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ตำแหน่งของ (สัดส่วนของการ์ด) — ชิ้นที่ทับโซนห้ามวาดถูกข้ามตอนวัดหน้า
// ─────────────────────────────────────────────────────────────

function layout() {
  const rand = seeded(20261009);
  const L = {};
  // สปอตไลต์นุ่ม ๆ: บนกลาง (ชมพูครีม) · มุมขวาบน (ลาเวนเดอร์) · ซ้ายล่าง (พีชจาง ๆ) — หายใจช้ามาก
  L.spots = [
    { x: 0.55, y: -0.05, r: 0.5, c: ROSE, a: 0.3, ph: 0 },
    { x: 0.95, y: 0.08, r: 0.32, c: LAVENDER, a: 0.2, ph: 2.1 },
    { x: 0.05, y: 0.98, r: 0.32, c: PEACH, a: 0.18, ph: 4.0 },
  ];
  // ลำแสงเวทีจาง ๆ จากบนกลางแผ่ลงมา (ชั้นนิ่ง)
  L.rays = [-0.5, -0.18, 0.15, 0.46].map((a, i) => ({ a, wd: 0.07 + (i % 2) * 0.03, al: 0.05 + (i % 2) * 0.02 }));
  // ของรางวัลจิ๋ว — แต่ละชิ้นมีที่ลงสำรองหลายจุด (ใต้รายการด่านซ้ายว่างที่สุด)
  L.prizes = [
    { k: 'trophy', s: 13, a: 0.24, spots: [[0.14, 0.82], [0.04, 0.6], [0.95, 0.85]] },
    { k: 'medal', s: 9, a: 0.26, c: GOLD, spots: [[0.23, 0.76], [0.96, 0.45], [0.05, 0.4]] },
    { k: 'medal', s: 7, a: 0.22, c: SILVER, spots: [[0.07, 0.72], [0.96, 0.62], [0.04, 0.85]] },
    { k: 'crown', s: 8, a: 0.24, spots: [[0.95, 0.24], [0.2, 0.92], [0.05, 0.2]] },
    { k: 'medal', s: 7, a: 0.2, c: BRONZE, spots: [[0.3, 0.88], [0.96, 0.75], [0.12, 0.95]] },
    { k: 'star', s: 7, a: 0.26, spots: [[0.88, 0.06], [0.06, 0.08], [0.33, 0.06]] },
    { k: 'crown', s: 6, a: 0.18, c: LAVENDER, spots: [[0.3, 0.07], [0.04, 0.5], [0.97, 0.95]] },
  ];
  // รอยเท้าเดินมาหาบอร์ด — สามกลุ่ม (นิ่ง) ทุกตัวต้องว่างทั้งกลุ่มถึงจะวาด
  L.paws = [
    [[0.05, 0.96, -0.5], [0.09, 0.91, -0.35], [0.12, 0.86, -0.45]],
    [[0.93, 0.98, -2.6], [0.96, 0.93, -2.8]],
    [[0.34, 0.97, -0.9], [0.38, 0.93, -0.8]],
  ];
  // ประกายกะพริบ (บางดวงทอง)
  L.sparkles = Array.from({ length: 7 }, (_, i) => ({
    x: [0.04, 0.18, 0.28, 0.72, 0.9, 0.97, 0.03][i] + (rand() - 0.5) * 0.03,
    y: [0.3, 0.68, 0.94, 0.07, 0.15, 0.55, 0.88][i] + (rand() - 0.5) * 0.03,
    r: 2.6 + rand() * 2.6,
    ph: rand() * TAU,
    sp: 0.4 + rand() * 0.5,
    c: [CREAM, GOLD, ROSE, CREAM, GOLD, LAVENDER, CREAM][i],
  }));
  // ดาวจุดไกล ๆ (ชั้นนิ่ง)
  L.farStars = Array.from({ length: 22 }, () => ({ x: rand(), y: rand(), r: 0.5 + rand() * 0.7, a: 0.08 + rand() * 0.12 }));
  // ละอองแสงลอยขึ้นช้า ๆ (ครีม/ทองนิด ๆ/ลาเวนเดอร์)
  L.motes = Array.from({ length: 16 }, (_, i) => ({
    x: rand(),
    y: rand(),
    v: 0.005 + rand() * 0.007,
    sw: rand() * TAU,
    r: 0.9 + rand() * 1.3,
    c: [CREAM, LAVENDER, GOLD, ROSE, CREAM, MINT][i % 6],
  }));
  return L;
}

// ─────────────────────────────────────────────────────────────
// ชั้นของฉาก
// ─────────────────────────────────────────────────────────────

/** ชั้นนิ่ง — บนลาเวนเดอร์ กลางม่วง ล่างพลัม + ลำแสงเวทีจาง ๆ + ดาวจุดไกล + หมอกล่าง + ขอบพลัม */
export function drawLeaderboardBackground(ctx, w, h, L) {
  const R = Math.max(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#A070DC');
  g.addColorStop(0.5, '#8455C6');
  g.addColorStop(1, '#5D3299');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // ลำแสงเวที: สามเหลี่ยมยาวจากจุดเดียวบนกลาง จางลงไปทางล่าง
  const ox = w * 0.55, oy = -h * 0.12;
  for (const r of L.rays) {
    const len = R * 1.1;
    const ax = ox + Math.sin(r.a - r.wd) * len, ay = oy + Math.cos(r.a - r.wd) * len;
    const bx = ox + Math.sin(r.a + r.wd) * len, by = oy + Math.cos(r.a + r.wd) * len;
    const lg = ctx.createLinearGradient(ox, oy, ox + Math.sin(r.a) * len, oy + Math.cos(r.a) * len);
    lg.addColorStop(0, `rgba(${CREAM},${r.al})`);
    lg.addColorStop(0.7, `rgba(${CREAM},0)`);
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = `rgb(${CREAM})`;
  for (const s of L.farStars) {
    ctx.globalAlpha = s.a;
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawSoftCloud(ctx, w * 0.08, h * 1.04, w * 0.3, 0.16, LAVENDER);
  drawSoftCloud(ctx, w * 0.94, h * 1.05, w * 0.28, 0.14, ROSE);
  const v = ctx.createRadialGradient(w * 0.55, h * 0.45, R * 0.3, w * 0.55, h * 0.45, R * 0.8);
  v.addColorStop(0, `rgba(${PLUM},0)`);
  v.addColorStop(1, `rgba(${PLUM},0.36)`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** สปอตไลต์นุ่ม ๆ หายใจช้ามาก */
export function drawHallOfFameGlow(ctx, w, h, L, t) {
  const R = Math.max(w, h);
  for (const s of L.spots) {
    const b = 0.5 + 0.5 * Math.sin(t * 0.35 + s.ph);
    drawMagicGlow(ctx, s.x * w, s.y * h, s.r * R * (0.95 + b * 0.06), s.c, s.a * (0.85 + b * 0.15));
  }
}

/** ของรางวัลจิ๋ว — เหรียญแกว่งนิด ๆ มงกุฎ/ถ้วยนิ่ง ดาวกะพริบ */
export function drawAchievementDecorations(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const [i, p] of L.prizes.entries()) {
    const at = M.prizeAt[i];
    if (!at) continue;
    const x = at[0] * w, y = at[1] * h, s = p.s * u;
    if (p.k === 'medal') drawMedal(ctx, x, y, s, p.a, p.c, Math.sin(t * 0.6 + i) * 0.12);
    else if (p.k === 'crown') drawCrown(ctx, x, y, s, p.a, p.c || GOLD);
    else if (p.k === 'trophy') drawTrophy(ctx, x, y, s, p.a);
    else drawTinyStar(ctx, x, y, s, p.a * (0.7 + 0.3 * Math.sin(t * 0.8 + i)), GOLD);
  }
}

/** รอยเท้าเดินมาหาบอร์ด (นิ่ง) */
export function drawPawPrints(ctx, w, h, M, L) {
  const u = Math.min(w, h) / 400;
  for (const [g, group] of L.paws.entries()) {
    if (!M.pawOk[g]) continue;
    for (const [x, y, rot] of group) drawPawPrint(ctx, x * w, y * h, 4 * u, rot, 0.15, CREAM);
  }
}

/** ประกายกะพริบช้า ๆ */
export function drawLeaderboardSparkles(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const [i, s] of L.sparkles.entries()) {
    if (!M.sparkOk[i]) continue;
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    drawSparkle(ctx, s.x * w, s.y * h, s.r * u * (0.8 + tw * 0.3), 0.12 + tw * 0.36, s.c);
  }
}

/** ละอองแสงลอยขึ้น — ผ่านหลังรายการ/การ์ด = ไม่วาดเฟรมนั้น */
export function drawLeaderboardParticles(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const m of L.motes) {
    const y = 1.05 - ((m.y + t * m.v) % 1.1);
    const x = m.x + Math.sin(t * 0.45 + m.sw) * 0.01;
    if (blocked(M, x * w, y * h, 5)) continue;
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

/** จุดนี้ (วงรัศมี r) ทับโซนห้ามวาดไหม */
function blocked(M, x, y, r) {
  for (const z of M.zones) {
    if (x + r > z.x && x - r < z.x + z.w && y + r > z.y && y - r < z.y + z.h) return true;
  }
  return false;
}

/**
 * พื้นหลังหอเกียรติยศของหน้าอันดับ
 * @param canvas   ผ้าใบลูกคนแรกของการ์ดใหญ่
 * @param isActive แผงเปิดอยู่ไหม
 * @param pop      การ์ดใหญ่ (.pop) — วัดหัวเรื่อง รายการด่าน รายการอันดับ
 */
export function makeRankBg(canvas, isActive, pop) {
  const L = layout();
  const M = {
    w: 0, h: 0, at: -Infinity, zones: [], listRect: null,
    prizeAt: L.prizes.map(() => null), pawOk: L.paws.map(() => false), sparkOk: L.sparkles.map(() => false),
    titleEl: null, stageEl: null, listEl: null, topEls: [null, null, null],
  };

  function measure(w, h) {
    const fullW = pop.offsetWidth;
    if (!fullW) return;
    const k = w / fullW;
    M.w = w;
    M.h = h;
    M.zones.length = 0;
    for (const sel of KEEP_OUT) {
      for (const el of pop.querySelectorAll(sel)) {
        if (!el.offsetParent || !el.offsetWidth) continue;
        const r = layoutRect(pop, el, false);
        if (r) M.zones.push({ x: (r.x - 6) * k, y: (r.y - 6) * k, w: (r.w + 12) * k, h: (r.h + 12) * k });
      }
    }
    const u = Math.min(w, h) / 400;
    const taken = [];
    L.prizes.forEach((p, i) => {
      const r = p.s * u * 2;
      M.prizeAt[i] = p.spots.find(([x, y]) => !blocked(M, x * w, y * h, r)
        && !taken.some(([tx, ty]) => Math.hypot((tx - x) * w, (ty - y) * h) < r * 2.6)) || null;
      if (M.prizeAt[i]) taken.push(M.prizeAt[i]);
    });
    L.paws.forEach((g, i) => {
      M.pawOk[i] = g.every(([x, y]) => !blocked(M, x * w, y * h, 6 * u)
        && !taken.some(([tx, ty]) => Math.hypot((tx - x) * w, (ty - y) * h) < 20 * u));
    });
    L.sparkles.forEach((s, i) => { M.sparkOk[i] = !blocked(M, s.x * w, s.y * h, s.r * u * 1.5); });
    M.titleEl = pop.querySelector('.skin-title');
    M.stageEl = pop.querySelector('.rank-stage.on');
    M.listEl = pop.querySelector('.rank-list');
    for (let i = 0; i < 3; i++) M.topEls[i] = pop.querySelector(`.rank-row.top${i + 1}`);
  }

  // ก้อนผลลัพธ์ของ trackRect — ใช้ซ้ำทุกเฟรม
  const titleBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const stageBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const listBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const topBoxes = [0, 1, 2].map(() => ({ x: 0, y: 0, w: 0, h: 0, a: 1 }));
  const track = (el, w, out) => trackRect(canvas, pop, el, w, out);
  const TOP_GLOW = [GOLD, SILVER, BRONZE];

  function live(ctx, w, h, _L, t) {
    // รายการอันดับ/การ์ดด่านถูกสร้างใหม่ (เปลี่ยนด่าน) = วัดใหม่ทันที
    const stale = (M.topEls[0] && !M.topEls[0].isConnected) || (M.stageEl && !M.stageEl.isConnected)
      || (!M.topEls[0] && pop.querySelector('.rank-row.top1'));
    if (stale || t - M.at > REMEASURE_S || t < M.at || w !== M.w || h !== M.h) {
      measure(w, h);
      M.at = t;
    }
    drawHallOfFameGlow(ctx, w, h, L, t);

    // ── หัวเรื่อง: วงรัศมีจาง ๆ + กิ่งลอเรลสองข้าง (เลื่อน/จางตามหัวเรื่อง) ──
    const tb = track(M.titleEl, w, titleBox);
    if (tb) {
      const cx = tb.x + tb.w / 2, cy = tb.y + tb.h / 2;
      drawMagicGlow(ctx, cx, cy + tb.h * 0.2, Math.max(tb.w * 0.7, 80), GOLD, 0.12 * tb.a);
      ctx.save();
      ctx.globalAlpha = 0.14 * tb.a;
      ctx.strokeStyle = `rgb(${CREAM})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, tb.w * 0.62, tb.h * 1.05, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      // พวงช่อชัยสองกิ่ง: โคนอยู่ใต้มุมหัวเรื่อง โค้งออกแล้วชี้ขึ้น โอบหัวเรื่องไว้ (ไม่ทับตัวหนังสือ)
      const lr = Math.max(tb.h * 1.5, 26);
      drawLaurel(ctx, tb.x + 4, tb.y + tb.h + lr * 0.12, lr, -1, 0.32 * tb.a);
      drawLaurel(ctx, tb.x + tb.w - 4, tb.y + tb.h + lr * 0.12, lr, 1, 0.32 * tb.a);
      drawSparkle(ctx, tb.x + tb.w + lr * 0.7, tb.y - lr * 0.05, 4, (0.25 + 0.2 * Math.sin(t * 1.1)) * tb.a, GOLD);
    }

    // ── ด่านที่เลือกในรายการซ้าย: แสงลาเวนเดอร์นวล ๆ ──
    const sb = track(M.stageEl, w, stageBox);
    if (sb) drawMagicGlow(ctx, sb.x + sb.w / 2, sb.y + sb.h / 2, sb.w * 0.65, MINT, 0.12 * sb.a);

    // ── แถวอันดับ 1-3: แสงนวลหลังแถว (ทอง / เงินลาเวนเดอร์ / ทองแดงพีช) ตัดตามช่องรายการ ──
    const lb = track(M.listEl, w, listBox);
    if (lb) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(lb.x - 30, lb.y - 4, lb.w + 60, lb.h + 8);
      ctx.clip();
      for (let i = 2; i >= 0; i--) {
        const r = track(M.topEls[i], w, topBoxes[i]);
        if (!r || r.y + r.h < lb.y || r.y > lb.y + lb.h) continue;
        const b = i === 0 ? 0.85 + 0.15 * Math.sin(t * 0.7) : 1;
        drawMagicGlow(ctx, r.x + r.w / 2, r.y + r.h / 2, r.w * 0.58, TOP_GLOW[i], [0.24, 0.16, 0.14][i] * b * r.a);
        if (i === 0) {
          // ที่หนึ่ง: ประกายทองเล็ก ๆ นอกมุมแถว + มงกุฎจางมากเหนือมุมซ้าย
          drawSparkle(ctx, r.x - 7, r.y + 5, 4.5, (0.3 + 0.25 * Math.sin(t * 1.3)) * r.a, GOLD);
          drawSparkle(ctx, r.x + r.w + 7, r.y + r.h - 5, 3.5, (0.3 + 0.25 * Math.sin(t * 1.3 + 2)) * r.a, CREAM);
        }
      }
      ctx.restore();
      const top1 = topBoxes[0];
      if (M.topEls[0] && top1.a > 0 && top1.y >= lb.y - 2 && top1.y - 12 > 0) {
        drawCrown(ctx, top1.x + 16, top1.y - 9, 6, 0.28 * top1.a);
      }
    }

    drawAchievementDecorations(ctx, w, h, M, L, t);
    drawPawPrints(ctx, w, h, M, L);
    drawLeaderboardSparkles(ctx, w, h, M, L, t);
    drawLeaderboardParticles(ctx, w, h, M, L, t);
  }

  const bg = makeCanvasBg(canvas, isActive, { layout: () => L, still: drawLeaderboardBackground, live });
  // เลือกด่านอื่น = รายการอันดับสร้างใหม่ — วัดใหม่ทันที
  pop.querySelector('.rank-stages')?.addEventListener('click', () => { M.at = -Infinity; }, true);
  if (import.meta.env.DEV) window.__rankBgM = M;   // สคริปต์ทดสอบอ่านผลการวัดหน้า
  return { kick: () => { M.at = -Infinity; bg.kick(); } };
}
