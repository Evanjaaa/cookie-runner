// src/render/stagebg.js
//
// ══ พื้นหลัง "ประตูสู่การผจญภัยของน้องแมว" ของหน้าเลือกด่าน ══════════════
//
// วาดด้วย Canvas 2D ล้วน ไม่มีไฟล์ภาพ — ตัวคุมผ้าใบชุดเดียวกับหน้าอื่น (makeCanvasBg)
// ใช้กับแผง #stagePanel — main.js เป็นคนปลุก
//
// ── ต่างจากหน้าอื่นยังไง ──
//   คลังน้อง = เมฆปุยบ้านน้อง · สกิล = พลังเวท · กาช่า = สมบัติ · กิจกรรม = ฉลอง · สร้างสรรค์ = ศิลปะ
//   หน้านี้ = การเดินทาง: ท้องฟ้าฝันม่วงกว้าง ๆ ที่มี "เงาโลกไกล ๆ" ลอยอยู่ (ความทรงจำของแต่ละด่าน)
//   หน้าต่างครัวอุ่น ๆ · เนินสวน · ผลึกถ้ำ · ขอบฟ้าชายหาด · ดาวเคราะห์ · ภูเขาหิมะ — ตัวจิ๋ว จาง ห่างไกล
//   ทางจุดไข่ปลาจากมุมล่างซ้ายลอดหายไปหลังการ์ด = "การเดินทางยังไปต่อ"
//   ฝั่งซ้ายอุ่น (พีช/ชมพู) ฝั่งขวาเย็น (ฟ้าม่วง) จาง ๆ = หลายโลกอยู่ด้วยกัน
//
// ── หลักของภาพ ──
//   การ์ดด่านเด่นที่สุดเสมอ (มีภาพฉากของจริงอยู่แล้ว) พื้นหลังแค่บอกว่า "ยังมีโลกอีกมากรออยู่"
//   ไม่มีแผนที่ ไม่มีถนนโยงการ์ด ไม่มีของชิ้นใหญ่ · ม่วงเป็นหลัก ไม่กลายเป็นอวกาศดำ
//   ไม่มีอะไรไปอยู่หลังหัวเรื่อง คำอธิบาย การ์ด หรือปุ่มล่าง — วัดโซนห้ามวาดจากหน้าจริงเป็นระยะ
//   (การ์ดขึ้นแถวใหม่ตามความกว้างจอ ที่ว่างข้างแถวสุดท้ายคือที่ของเงาโลกไกล ๆ)
//
// ── สองบทเรียนจากหน้าก่อน ๆ (ใช้ตั้งแต่ต้น) ──
//   แสงที่เกาะการ์ดที่เลือกอยู่ วัดตำแหน่ง "ที่ตาเห็น" ทุกเฟรม และจางเข้าพร้อมเนื้อหาตอนเปิดหน้า
//   (เนื้อหาเลื่อนขึ้น 14px + จางเข้า ถ้าแสงวาดที่ตำแหน่งสุดท้ายเต็มความสว่างตั้งแต่เฟรมแรก จะเห็นแสงขยับ/วาบ)
//
// ── ของที่ขยับไม่สร้างใหม่ทุกเฟรม ──
//   ทุกชิ้นวางครั้งเดียวใน layout() ตำแหน่งแต่ละเฟรมคิดจากเวลา t
//   ชั้นนิ่ง: ท้องฟ้าไล่สี + อุ่นซ้าย/เย็นขวา + ดาวจุดไกล ๆ + หมอกล่าง (ไม่ขึ้นกับเลย์เอาต์)
//   ทุกเฟรม: แสงโลก 3 · เมฆลอย 4 · เงาโลกไกล 6 · ทางเดินทาง 1 · ดาวกะพริบ 8 · ละออง 16 · รอยเท้า 3
//            + แสงหลังการ์ดที่เลือก + แสงใต้หัวเรื่อง

import { makeCanvasBg, drawPawPrint } from './dreambg.js';
import { drawMagicGlow, drawSparkle, drawTinyStar, drawSoftCloud } from './skillbg.js';
import { layoutRect, trackRect } from './event-bg.js';

const TAU = Math.PI * 2;

// ── สี ── ม่วงเป็นหลัก แต้มสีของแต่ละโลกใช้จาง ๆ เท่านั้น
const PLUM = '56,22,100';
const LAVENDER = '206,178,248';
const ROSE = '247,199,232';
const PEACH = '241,180,177';
const BUTTER = '254,224,175';
const MINT = '176,240,226';
const SKY = '178,214,250';
const CYAN = '160,236,246';
const CREAM = '255,246,232';
const TEAL = '127,227,218';   // สีขอบการ์ดที่เลือกอยู่ (มิ้นต์ฟ้า) — แสงหลังการ์ดใช้โทนเดียวกัน

/** วัดหน้าใหม่ทุกกี่วินาที (หมุนจอ / การ์ดขึ้นแถวใหม่ / เปลี่ยนด่านที่เลือก) */
const REMEASURE_S = 0.5;

/** โซนห้ามวาด — ของที่ผู้เล่นอ่าน/กดจริง */
const KEEP_OUT = ['.skin-title', '.stage-lead', '.stage-card', '#loadoutOpen', '.backbtn'];

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────
// เงาโลกไกล ๆ (ตัวจิ๋ว จาง — "ความทรงจำของแต่ละด่าน" ไม่ใช่ภาพฉาก)
// ทุกตัววาดรอบจุด (0,0) ขนาด s ≈ ครึ่งความกว้างของชิ้น
// ─────────────────────────────────────────────────────────────

/** ครัวกลางคืน: หลังคาบ้านเงา ๆ หน้าต่างอุ่นสองบาน */
function worldKitchen(ctx, s, t) {
  ctx.fillStyle = `rgb(${LAVENDER})`;
  ctx.beginPath();
  ctx.moveTo(-s, s * 0.6);
  ctx.lineTo(-s, -s * 0.1);
  ctx.lineTo(0, -s * 0.75);
  ctx.lineTo(s, -s * 0.1);
  ctx.lineTo(s, s * 0.6);
  ctx.closePath();
  ctx.fill();
  const glow = 0.85 + 0.15 * Math.sin(t * 0.8);
  ctx.fillStyle = `rgba(${BUTTER},${glow})`;
  ctx.beginPath();
  ctx.roundRect(-s * 0.62, s * 0.02, s * 0.42, s * 0.36, s * 0.06);
  ctx.roundRect(s * 0.2, s * 0.02, s * 0.42, s * 0.36, s * 0.06);
  ctx.fill();
}

/** สวนกลางวัน: เนินกลมสองลูก ต้นไม้จิ๋วสองต้น */
function worldGarden(ctx, s) {
  ctx.fillStyle = `rgb(${MINT})`;
  ctx.beginPath();
  ctx.ellipse(-s * 0.35, s * 0.5, s * 0.85, s * 0.45, 0, Math.PI, 0);
  ctx.ellipse(s * 0.5, s * 0.5, s * 0.7, s * 0.32, 0, Math.PI, 0);
  ctx.fill();
  for (const [x, y, r] of [[-s * 0.45, -s * 0.05, s * 0.2], [s * 0.45, s * 0.12, s * 0.15]]) {
    ctx.fillRect(x - s * 0.03, y, s * 0.06, s * 0.25);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
}

/** ถ้ำคริสตัล: ผลึกแหลมสามแท่ง เรืองฟ้าอ่อน */
function worldCrystal(ctx, s, t) {
  ctx.fillStyle = `rgb(${CYAN})`;
  for (const [dx, hgt, wd, tilt] of [[-0.45, 0.9, 0.24, -0.15], [0, 1.25, 0.3, 0], [0.42, 0.75, 0.22, 0.18]]) {
    ctx.save();
    ctx.translate(dx * s, s * 0.6);
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.moveTo(-wd * s, 0);
    ctx.lineTo(-wd * s * 0.8, -hgt * s * 0.7);
    ctx.lineTo(0, -hgt * s);
    ctx.lineTo(wd * s * 0.8, -hgt * s * 0.7);
    ctx.lineTo(wd * s, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  drawMagicGlow(ctx, 0, s * 0.1, s * 1.1, CYAN, 0.25 + 0.08 * Math.sin(t * 0.9));
}

/** ชายหาดยามเย็น: ครึ่งดวงอาทิตย์บนขอบฟ้า + ต้นมะพร้าวเงา */
function worldBeach(ctx, s) {
  ctx.fillStyle = `rgb(${PEACH})`;
  ctx.beginPath();
  ctx.arc(s * 0.15, s * 0.35, s * 0.55, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-s, s * 0.35, s * 2, s * 0.06);
  // ต้นมะพร้าว: ลำต้นโค้ง + ใบห้าแฉก
  ctx.strokeStyle = `rgb(${ROSE})`;
  ctx.lineWidth = s * 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.6, s * 0.38);
  ctx.quadraticCurveTo(-s * 0.72, -s * 0.1, -s * 0.5, -s * 0.5);
  ctx.stroke();
  ctx.lineWidth = s * 0.06;
  for (const a of [-2.6, -2.0, -1.2, -0.5, 0.1]) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.5);
    ctx.quadraticCurveTo(-s * 0.5 + Math.cos(a) * s * 0.3, -s * 0.5 + Math.sin(a) * s * 0.35 - s * 0.05,
      -s * 0.5 + Math.cos(a) * s * 0.5, -s * 0.5 + Math.sin(a) * s * 0.3 + s * 0.12);
    ctx.stroke();
  }
}

/** ห้วงอวกาศ: ดาวเคราะห์มีวงแหวน + ดวงจันทร์จิ๋ว (ยังอยู่บนฟ้าม่วง ไม่ใช่อวกาศดำ) */
function worldSpace(ctx, s, t) {
  ctx.fillStyle = `rgb(${SKY})`;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = `rgb(${LAVENDER})`;
  ctx.lineWidth = s * 0.08;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.9, s * 0.26, -0.35, 0, TAU);
  ctx.stroke();
  const a = t * 0.15;
  ctx.fillStyle = `rgb(${CREAM})`;
  ctx.beginPath();
  ctx.arc(Math.cos(a) * s * 1.1, Math.sin(a) * s * 0.5 - s * 0.2, s * 0.12, 0, TAU);
  ctx.fill();
}

/** ทุ่งหิมะ: ภูเขาสองยอด ปลายยอดขาว */
function worldSnow(ctx, s) {
  ctx.fillStyle = `rgb(${SKY})`;
  ctx.beginPath();
  ctx.moveTo(-s, s * 0.55);
  ctx.lineTo(-s * 0.35, -s * 0.55);
  ctx.lineTo(0, -s * 0.05);
  ctx.lineTo(s * 0.35, -s * 0.35);
  ctx.lineTo(s, s * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgb(${CREAM})`;
  ctx.beginPath();
  ctx.moveTo(-s * 0.35, -s * 0.55);
  ctx.lineTo(-s * 0.52, -s * 0.24);
  ctx.lineTo(-s * 0.36, -s * 0.3);
  ctx.lineTo(-s * 0.2, -s * 0.22);
  ctx.closePath();
  ctx.moveTo(s * 0.35, -s * 0.35);
  ctx.lineTo(s * 0.22, -s * 0.13);
  ctx.lineTo(s * 0.36, -s * 0.17);
  ctx.lineTo(s * 0.48, -s * 0.12);
  ctx.closePath();
  ctx.fill();
}

const WORLDS = { kitchen: worldKitchen, garden: worldGarden, crystal: worldCrystal, beach: worldBeach, space: worldSpace, snow: worldSnow };

/** เงาโลกหนึ่งชิ้น — แสงนวลรองหลัง แล้วตัวเงาจาง ๆ ลอยขึ้นลงช้ามาก */
export function drawDistantWorld(ctx, kind, x, y, s, alpha, t, glow) {
  drawMagicGlow(ctx, x, y, s * 2.2, glow, alpha * 0.55);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  WORLDS[kind](ctx, s, t);
  ctx.restore();
}

/** เข็มทิศจิ๋วลายเส้น (ของตกแต่ง ไม่ใช่ปุ่ม) */
function drawCompass(ctx, x, y, s, alpha, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = `rgb(${CREAM})`;
  ctx.lineWidth = Math.max(1, s * 0.12);
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, TAU);
  ctx.stroke();
  ctx.rotate(rot);
  ctx.fillStyle = `rgb(${ROSE})`;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.75);
  ctx.lineTo(s * 0.2, 0);
  ctx.lineTo(-s * 0.2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgb(${CREAM})`;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.75);
  ctx.lineTo(s * 0.2, 0);
  ctx.lineTo(-s * 0.2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** ธงจิ๋วปักต้นทาง */
function drawFlag(ctx, x, y, s, alpha, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = `rgb(${CREAM})`;
  ctx.lineWidth = Math.max(1, s * 0.1);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -s * 1.6);
  ctx.stroke();
  const wave = Math.sin(t * 1.2) * s * 0.08;
  ctx.fillStyle = `rgb(${ROSE})`;
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.6);
  ctx.quadraticCurveTo(s * 0.5, -s * 1.5 + wave, s * 0.95, -s * 1.3);
  ctx.quadraticCurveTo(s * 0.5, -s * 1.15 - wave, 0, -s * 1.05);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ตำแหน่งของ (สัดส่วนของการ์ด) — ชิ้นที่ทับโซนห้ามวาดถูกข้ามตอนวัดหน้า
// ─────────────────────────────────────────────────────────────

function layout() {
  const rand = seeded(20261008);
  const L = {};
  // แสงโลก: กลางหลังการ์ด (ลาเวนเดอร์) · ซ้ายอุ่น · ขวาเย็น — หายใจช้ามาก
  L.lights = [
    { x: 0.5, y: 0.5, r: 0.5, c: LAVENDER, a: 0.14, ph: 0 },
    { x: 0.0, y: 0.62, r: 0.34, c: PEACH, a: 0.16, ph: 1.9 },
    { x: 1.0, y: 0.45, r: 0.36, c: SKY, a: 0.15, ph: 3.6 },
  ];
  // เมฆลอยช้า ๆ ตามขอบบนและมุมล่าง (ล้นขอบออกไป ไม่ไปกองหลังการ์ด)
  L.clouds = [
    { x: 0.1, y: -0.02, w: 0.22, a: 0.16, c: ROSE, v: 0.004 },
    { x: 0.7, y: -0.03, w: 0.26, a: 0.14, c: LAVENDER, v: -0.003 },
    { x: 0.04, y: 1.02, w: 0.3, a: 0.18, c: LAVENDER, v: 0.002 },
    { x: 0.96, y: 1.03, w: 0.28, a: 0.16, c: SKY, v: -0.002 },
  ];
  // เงาโลกไกล ๆ — แต่ละชิ้นมีที่ลงสำรองหลายจุด เลือกจุดแรกที่ว่างจริง (การ์ดขึ้นแถวต่างกันตามจอ)
  // ที่ลงแรกของทุกชิ้นคือข้าง ๆ แถวสุดท้ายของการ์ด / ขอบซ้ายขวา / มุมล่าง
  L.worlds = [
    { k: 'kitchen', s: 11, a: 0.22, glow: BUTTER, spots: [[0.22, 0.7], [0.035, 0.36], [0.2, 0.9]] },
    { k: 'garden', s: 13, a: 0.2, glow: MINT, spots: [[0.33, 0.78], [0.04, 0.58], [0.3, 0.92]] },
    { k: 'crystal', s: 11, a: 0.22, glow: CYAN, spots: [[0.12, 0.8], [0.965, 0.6], [0.4, 0.93]] },
    { k: 'beach', s: 12, a: 0.2, glow: PEACH, spots: [[0.67, 0.78], [0.965, 0.36], [0.7, 0.92]] },
    { k: 'space', s: 11, a: 0.24, glow: SKY, spots: [[0.88, 0.14], [0.78, 0.68], [0.95, 0.14]] },
    { k: 'snow', s: 13, a: 0.2, glow: SKY, spots: [[0.88, 0.8], [0.8, 0.9], [0.04, 0.82]] },
  ];
  // ทางเดินทาง: จุดไข่ปลาจากมุมล่างซ้ายโค้งเข้าหากลาง แล้วลอดหายหลังการ์ด
  L.path = [{ x: 0.03, y: 0.97 }, { x: 0.16, y: 0.8 }, { x: 0.3, y: 0.98 }, { x: 0.47, y: 0.74 }];
  L.pathDots = 46;
  // รอยเท้าเดินตามทางช่วงต้น
  L.paws = [0.1, 0.17, 0.24];
  // ดาวกะพริบ (สี่แฉก/ห้าแฉกสลับกัน) — ห่าง ๆ
  L.stars = Array.from({ length: 8 }, (_, i) => ({
    x: [0.08, 0.2, 0.36, 0.64, 0.8, 0.94, 0.03, 0.97][i] + (rand() - 0.5) * 0.03,
    y: [0.06, 0.12, 0.05, 0.06, 0.12, 0.25, 0.45, 0.72][i] + (rand() - 0.5) * 0.03,
    r: 2.4 + rand() * 2.4,
    ph: rand() * TAU,
    sp: 0.4 + rand() * 0.5,
    five: i % 2 === 1,
    c: [CREAM, BUTTER, ROSE, CYAN][i % 4],
  }));
  // ดาวจุดไกล ๆ ชั้นนิ่ง (แถบบน) — จางมาก ไม่กะพริบ
  L.farStars = Array.from({ length: 26 }, () => ({ x: rand(), y: rand() * 0.22, r: 0.5 + rand() * 0.8, a: 0.1 + rand() * 0.14 }));
  // ละอองลอย: บางตัวขึ้น บางตัวไปทางข้าง
  L.motes = Array.from({ length: 16 }, (_, i) => ({
    x: rand(),
    y: rand(),
    vx: i % 3 === 0 ? (rand() - 0.5) * 0.006 : 0,
    vy: i % 3 === 0 ? 0.002 : 0.005 + rand() * 0.007,
    sw: rand() * TAU,
    r: 0.9 + rand() * 1.3,
    c: [CREAM, LAVENDER, ROSE, CYAN, BUTTER, MINT][i % 6],
  }));
  return L;
}

// ─────────────────────────────────────────────────────────────
// ชั้นของฉาก
// ─────────────────────────────────────────────────────────────

/**
 * ชั้นนิ่ง — ท้องฟ้าฝันม่วง: บนลาเวนเดอร์ กลางม่วง ล่างพลัม
 * อุ่นจาง ๆ ฝั่งซ้าย เย็นจาง ๆ ฝั่งขวา (หลายโลกอยู่ด้วยกัน) + ดาวจุดไกล ๆ + หมอกล่าง
 */
export function drawStageSelectionBackground(ctx, w, h, L) {
  const R = Math.max(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#A274DD');
  g.addColorStop(0.5, '#8556C7');
  g.addColorStop(1, '#5F339C');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // อุ่นซ้าย → เย็นขวา (บางมาก)
  const side = ctx.createLinearGradient(0, 0, w, 0);
  side.addColorStop(0, `rgba(${PEACH},0.1)`);
  side.addColorStop(0.45, `rgba(${PEACH},0)`);
  side.addColorStop(0.55, `rgba(${SKY},0)`);
  side.addColorStop(1, `rgba(${SKY},0.1)`);
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, w, h);
  // ดาวจุดไกล ๆ
  ctx.fillStyle = `rgb(${CREAM})`;
  for (const s of L.farStars) {
    ctx.globalAlpha = s.a;
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // หมอกบาง ๆ ริมล่าง
  const mist = ctx.createLinearGradient(0, h * 0.78, 0, h);
  mist.addColorStop(0, `rgba(${LAVENDER},0)`);
  mist.addColorStop(1, `rgba(${LAVENDER},0.14)`);
  ctx.fillStyle = mist;
  ctx.fillRect(0, h * 0.78, w, h * 0.22);
  // ขอบพลัมจาง ๆ
  const v = ctx.createRadialGradient(w / 2, h * 0.5, R * 0.3, w / 2, h * 0.5, R * 0.8);
  v.addColorStop(0, `rgba(${PLUM},0)`);
  v.addColorStop(1, `rgba(${PLUM},0.34)`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** แสงโลกหายใจช้ามาก */
export function drawWorldGlow(ctx, w, h, L, t) {
  const R = Math.max(w, h);
  for (const l of L.lights) {
    const b = 0.5 + 0.5 * Math.sin(t * 0.35 + l.ph);
    drawMagicGlow(ctx, l.x * w, l.y * h, l.r * R * (0.95 + b * 0.06), l.c, l.a * (0.85 + b * 0.15));
  }
}

/** เมฆนุ่มลอยไปทางข้างช้ามาก (วนรอบตามขอบ) */
export function drawDreamyClouds(ctx, w, h, L, t) {
  for (const c of L.clouds) {
    const x = ((c.x + c.v * t) % 1.3 + 1.3) % 1.3 - 0.15;
    drawSoftCloud(ctx, x * w, c.y * h, c.w * w, c.a, c.c);
  }
}

/** เงาโลกไกล ๆ — ชิ้นที่ไม่มีที่ลงไม่วาด */
export function drawDistantWorlds(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const [i, wd] of L.worlds.entries()) {
    const spot = M.worldAt[i];
    if (!spot) continue;
    const bob = Math.sin(t * 0.3 + i * 1.7) * 1.5 * u;
    drawDistantWorld(ctx, wd.k, spot[0] * w, spot[1] * h + bob, wd.s * u, wd.a, t, wd.glow);
  }
}

/** ทางเดินทาง: จุดไข่ปลาจาง ๆ กระพริบไล่ไปทีละจุด จุดที่อยู่หลังการ์ด/ปุ่มไม่วาด (ลอดหายไป) */
export function drawJourneyPath(ctx, w, h, M, L, t) {
  const [p0, p1, p2, p3] = L.path;
  const u = Math.min(w, h) / 400;
  ctx.fillStyle = `rgb(${CREAM})`;
  for (let i = 0; i <= L.pathDots; i++) {
    const k = i / L.pathDots;
    const q = 1 - k;
    const x = (q * q * q * p0.x + 3 * q * q * k * p1.x + 3 * q * k * k * p2.x + k * k * k * p3.x) * w;
    const y = (q * q * q * p0.y + 3 * q * q * k * p1.y + 3 * q * k * k * p2.y + k * k * k * p3.y) * h;
    if (blocked(M, x, y, 3)) continue;
    // คลื่นแสงเดินไปตามทางช้า ๆ (ชีพจรเบามาก) — ปลายทางจางลงเหมือนไกลออกไป
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.1 - k * 9);
    ctx.globalAlpha = (0.12 + 0.12 * pulse) * (1 - k * 0.45);
    ctx.beginPath();
    ctx.arc(x, y, (1 + 0.5 * (1 - k)) * u, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // ต้นทาง: ธงจิ๋ว + รอยเท้าเดินตามทาง + เข็มทิศจาง ๆ
  if (!blocked(M, p0.x * w + 6 * u, p0.y * h - 10 * u, 10 * u)) drawFlag(ctx, p0.x * w + 6 * u, p0.y * h - 4 * u, 7 * u, 0.3, t);
  for (const k of L.paws) {
    const q = 1 - k;
    const x = (q * q * q * p0.x + 3 * q * q * k * p1.x + 3 * q * k * k * p2.x + k * k * k * p3.x) * w;
    const y = (q * q * q * p0.y + 3 * q * q * k * p1.y + 3 * q * k * k * p2.y + k * k * k * p3.y) * h;
    if (!blocked(M, x, y - 8 * u, 6 * u)) drawPawPrint(ctx, x + 4 * u, y - 8 * u, 3.6 * u, -0.6, 0.16, CREAM);
  }
  if (M.compassAt) drawCompass(ctx, M.compassAt[0] * w, M.compassAt[1] * h, 7 * u, 0.22, Math.sin(t * 0.25) * 0.4);
}

/** ดาวกะพริบ — ที่ทับโซนห้ามวาดถูกข้ามตอนวัดหน้า */
export function drawAdventureStars(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const [i, s] of L.stars.entries()) {
    if (!M.starOk[i]) continue;
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    const a = 0.12 + tw * 0.34;
    if (s.five) drawTinyStar(ctx, s.x * w, s.y * h, s.r * u * 0.9, a, s.c);
    else drawSparkle(ctx, s.x * w, s.y * h, s.r * u * (0.8 + tw * 0.3), a, s.c);
  }
}

/** ละอองลอยช้า ๆ — ลอยผ่านหลังการ์ด/ข้อความ = ไม่วาดเฟรมนั้น */
export function drawAdventureParticles(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const m of L.motes) {
    const y = 1.05 - ((m.y + t * m.vy) % 1.1);
    const x = (((m.x + t * m.vx + Math.sin(t * 0.4 + m.sw) * 0.008) % 1) + 1) % 1;
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
 * พื้นหลังประตูสู่การผจญภัยของหน้าเลือกด่าน
 * @param canvas   ผ้าใบลูกคนแรกของการ์ดใหญ่
 * @param isActive แผงเปิดอยู่ไหม
 * @param pop      การ์ดใหญ่ (.pop) — วัดหัวเรื่อง คำอธิบาย การ์ดด่าน ปุ่มล่าง
 */
export function makeStageBg(canvas, isActive, pop) {
  const L = layout();
  // ผลการวัดหน้า — ก้อนเดียวใช้ซ้ำ
  const M = {
    w: 0, h: 0, at: -Infinity, zones: [],
    worldAt: L.worlds.map(() => null), starOk: L.stars.map(() => false), compassAt: null,
    selEl: null, titleEl: null,
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
    // เงาโลกแต่ละชิ้น: จุดสำรองจุดแรกที่ว่าง และไม่ชนเงาโลกชิ้นที่ลงไปก่อน
    const taken = [];
    L.worlds.forEach((wd, i) => {
      const r = wd.s * u * 2;
      M.worldAt[i] = wd.spots.find(([x, y]) => !blocked(M, x * w, y * h, r)
        && !taken.some(([tx, ty]) => Math.hypot((tx - x) * w, (ty - y) * h) < r * 3)) || null;
      if (M.worldAt[i]) taken.push(M.worldAt[i]);
    });
    L.stars.forEach((s, i) => { M.starOk[i] = !blocked(M, s.x * w, s.y * h, s.r * u * 1.5); });
    M.compassAt = [[0.94, 0.9], [0.06, 0.12], [0.5, 0.94]].find(([x, y]) => !blocked(M, x * w, y * h, 10 * u)
      && !taken.some(([tx, ty]) => Math.hypot((tx - x) * w, (ty - y) * h) < 40 * u)) || null;
    M.selEl = pop.querySelector('.stage-card.on');
    M.titleEl = pop.querySelector('.skin-title');
  }

  /** แสงหลังการ์ดที่เลือก/หัวเรื่องเกาะตำแหน่งที่ตาเห็น + จางเข้าพร้อมเนื้อหา (ดู trackRect ใน event-bg.js) */
  const track = (el, w, out) => trackRect(canvas, pop, el, w, out);
  const selBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const titleBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };

  function live(ctx, w, h, _L, t) {
    // การ์ดถูกสร้างใหม่ (เปลี่ยนด่าน/เปิดหน้าใหม่) = วัดใหม่ทันที ไม่รอรอบ
    const stale = M.selEl && !M.selEl.isConnected;
    if (stale || t - M.at > REMEASURE_S || t < M.at || w !== M.w || h !== M.h) {
      measure(w, h);
      M.at = t;
    }
    // ชั้นไกล → ใกล้
    drawWorldGlow(ctx, w, h, L, t);
    drawDreamyClouds(ctx, w, h, L, t);
    drawDistantWorlds(ctx, w, h, M, L, t);
    drawJourneyPath(ctx, w, h, M, L, t);

    // แสงนวลใต้หัวเรื่อง
    const tb = track(M.titleEl, w, titleBox);
    if (tb) drawMagicGlow(ctx, tb.x + tb.w / 2, tb.y + tb.h * 0.6, Math.max(tb.w, 90) * 0.9, ROSE, 0.16 * tb.a);
    // แสงหลังการ์ดที่เลือก — มิ้นต์ฟ้า/ลาเวนเดอร์ นิ่ง ไม่กะพริบ (ขอบมิ้นต์ของการ์ดเองยังเป็นตัวบอกหลัก)
    const sb = track(M.selEl, w, selBox);
    if (sb) {
      const r = Math.max(sb.w, sb.h) * 0.85;
      drawMagicGlow(ctx, sb.x + sb.w / 2, sb.y + sb.h / 2, r, TEAL, 0.32 * sb.a);
      drawMagicGlow(ctx, sb.x + sb.w / 2, sb.y + sb.h * 0.6, r * 1.15, LAVENDER, 0.18 * sb.a);
    }

    drawAdventureStars(ctx, w, h, M, L, t);
    drawAdventureParticles(ctx, w, h, M, L, t);
  }

  const bg = makeCanvasBg(canvas, isActive, { layout: () => L, still: drawStageSelectionBackground, live });
  // แตะเลือกด่าน = แสงย้ายไปหาการ์ดใหม่ทันที (ไม่ต้องรอรอบวัด)
  pop.querySelector('.stage-grid')?.addEventListener('click', () => { M.at = -Infinity; }, true);
  if (import.meta.env.DEV) window.__stageBgM = M;   // สคริปต์ทดสอบอ่านผลการวัดหน้า
  return { kick: () => { M.at = -Infinity; bg.kick(); } };
}
