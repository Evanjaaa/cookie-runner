// src/render/creativebg.js
//
// ══ พื้นหลัง "สตูดิโอศิลปะของน้องแมว" ของหน้าโหมดสร้างสรรค์ ═══════════════
//
// วาดด้วย Canvas 2D ล้วน ไม่มีไฟล์ภาพ — ตัวคุมผ้าใบชุดเดียวกับคลังน้อง/สกิล/กาช่า/กิจกรรม (makeCanvasBg)
// ใช้กับแผง #createPanel ทั้งสองแท็บ (ระบายสี / หน้าน้อง) และโหมดขยายเต็มจอ — main.js เป็นคนปลุก
//
// ── ต่างจากหน้าอื่นยังไง ──
//   คลังน้อง = เมฆปุย · สกิล = พลังเวท · กาช่า = สมบัติ · กิจกรรม = ฉลองภารกิจ
//   หน้านี้ = ศิลปะ: ก้อนสีพาสเทล หยดสีกระเซ็นจิ๋ว รอยพู่กัน กระดาษวาดรูปโปร่ง ๆ
//   ลายเส้นดูเดิล (หัวใจ ดาว รอยเท้า ปลา หูแมว พู่กัน ดอกไม้) เหมือนมีคนขีดเล่นไว้บนโต๊ะทำงาน
//   แต้มเวทมนตร์นิดเดียว: "สีเองที่เป็นประกาย" ไม่ใช่วงเวท
//
// ── หลักของภาพ ──
//   ตัวน้องคืองานศิลปะ · เครื่องมือคือกล่องสี · พื้นหลังคือสตูดิโอ (จางที่สุดเสมอ)
//   ห้ามมีอะไรไปอยู่หลังตัวน้อง จานสี ปุ่มเครื่องมือ แถบขนาดหัวแปรง หรือปุ่มสั่งงาน
//   หน้านี้เลย์เอาต์เปลี่ยนบ่อย (สลับแท็บ / ย่อแถบเครื่องมือ / เต็มจอ / มือถือซ้อนคอลัมน์)
//   จึงไม่วางของตามสัดส่วนตายตัว — วัด "โซนห้ามวาง" จากหน้าจริงเป็นระยะ แล้วข้ามชิ้นที่ทับ
//   ไม่ได้เติมของให้เต็มที่ว่าง: ชิ้นที่ไม่มีที่ลงก็แค่ไม่วาด
//
// ── ห้ามเลียนสีที่กดได้ ──
//   ของตกแต่งทุกชิ้นจางและอยู่ห่างจานสี ไม่มีวงกลมสีเรียงกันแบบช่องเลือกสี (ผู้เล่นจะนึกว่ากดได้)
//
// ── ของที่ขยับไม่สร้างใหม่ทุกเฟรม ──
//   ทุกชิ้นวางครั้งเดียวใน layout() ตำแหน่งแต่ละเฟรมคิดจากเวลา t
//   ชั้นนิ่ง: ไล่สีพื้น + ขอบเข้ม (ไม่ขึ้นกับเลย์เอาต์)
//   ทุกเฟรม: แสง 4 (หลังตัวน้อง/จานสีนิ่ง มุมหายใจ) · ก้อนสี 4 · กระดาษ 3 · รอยพู่กัน 3 · กระเซ็น 5 · ดูเดิล 11 · หยดสี 6 · ประกาย 7 · ละอองสี 14

import { makeCanvasBg, drawPawPrint, drawHeart } from './dreambg.js';
import { drawMagicGlow, drawSparkle } from './skillbg.js';
import { layoutRect, trackRect } from './event-bg.js';

const TAU = Math.PI * 2;

// ── สี ── ม่วงเป็นพื้น ที่เหลือเป็นแต้มสีศิลปะพาสเทล (ไม่สด ไม่นีออน)
const PLUM = '56,22,100';
const LAVENDER = '206,178,248';
const ROSE = '247,199,232';
const PEACH = '241,180,177';
const BUTTER = '254,224,175';
const MINT = '176,240,226';
const SKY = '178,214,250';
const CREAM = '255,246,232';
const ART = [ROSE, MINT, BUTTER, SKY, PEACH, LAVENDER];

/** วัดตำแหน่งการ์ดใหม่ทุกกี่วินาที (สลับแท็บ / ย่อแถบเครื่องมือ / เต็มจอ) */
const REMEASURE_S = 0.5;

/**
 * โซนห้ามวาด — ของที่ผู้เล่นใช้งานจริง (ที่มองไม่เห็นอยู่ ไม่นับ)
 * ตัวน้อง/กรอบตัดรูปยังได้แสงฟุ้งข้างหลัง (วาดแยก) แต่ไม่มีของตกแต่งชิ้นไหนเข้าไปได้
 */
const KEEP_OUT = [
  '.paint-canvas', '.paint-hint', '.paint-tools-col', '.paint-color-col', '.pcol-fold',
  // แถบเลือกโหมดซ้ายกันเฉพาะตัวปุ่ม — คอลัมน์สูงเต็มการ์ดแต่ปุ่มอยู่แค่กลาง ที่ว่างบน/ล่างวางของได้
  '.stab', '.panel-head', '.face-main', '.face-side', '.backbtn',
];

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────
// ชิ้นส่วนธีมศิลปะ (ตัวจิ๋ว จาง — ของตกแต่งพื้นหลังเท่านั้น)
// ─────────────────────────────────────────────────────────────

/** ก้อนสีนุ่ม ๆ ทรงไม่สมมาตร (เหมือนสีน้ำที่ซึมบนกระดาษ) — breath ขยายหดเบามาก */
export function drawPaintBlob(ctx, x, y, r, color, alpha, seed = 0, breath = 0) {
  const n = 7;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 0.82 + 0.18 * Math.sin(seed * 3.1 + i * 2.3) + breath * 0.04 * Math.sin(i * 1.7);
    pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.86]);
  }
  // ลากเส้นโค้งผ่านจุดกึ่งกลางระหว่างจุด — ได้ขอบมนลื่นไม่มีมุม
  for (let i = 0; i <= n; i++) {
    const p = pts[i % n];
    const q = pts[(i + 1) % n];
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.quadraticCurveTo(p[0], p[1], mx, my);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** สีกระเซ็นจิ๋ว: แต้มกลางมนหนึ่งก้อน + หยดรอบ ๆ 3-5 หยด */
export function drawPaintSplash(ctx, x, y, s, color, alpha, seed = 0) {
  drawPaintBlob(ctx, x, y, s, color, alpha, seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color})`;
  const drops = 3 + Math.floor((Math.sin(seed * 7.7) * 0.5 + 0.5) * 3);
  for (let i = 0; i < drops; i++) {
    const a = seed * 1.9 + i * (TAU / drops) + Math.sin(i * 3.3) * 0.5;
    const d = s * (1.45 + 0.5 * Math.abs(Math.sin(seed + i * 2.1)));
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s * (0.16 + 0.1 * Math.abs(Math.cos(i * 1.7 + seed))), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** รอยพู่กันโค้งนุ่ม ๆ ปลายมน — กว้างกลาง เรียวสองปลาย (วาดซ้อนสามชั้นความกว้าง) */
export function drawBrushStroke(ctx, x, y, len, rot, width, color, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = `rgb(${color})`;
  ctx.lineCap = 'round';
  for (const [k, a] of [[1, 0.45], [0.7, 0.35], [0.4, 0.3]]) {
    ctx.globalAlpha = alpha * a;
    ctx.lineWidth = width * k;
    ctx.beginPath();
    ctx.moveTo(-len / 2 * (0.6 + k * 0.4), 0);
    ctx.bezierCurveTo(-len / 6, -width * 0.9, len / 6, width * 0.9, len / 2 * (0.6 + k * 0.4), -width * 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

/** แผ่นกระดาษวาดรูปโปร่ง ๆ เอียงนิด มุมพับหนึ่งมุม */
export function drawPaperShape(ctx, x, y, w, h, rot, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${CREAM})`;
  const f = Math.min(w, h) * 0.18;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 4, -h / 2);
  ctx.lineTo(w / 2 - f, -h / 2);
  ctx.lineTo(w / 2, -h / 2 + f);
  ctx.lineTo(w / 2, h / 2 - 4);
  ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - 4, h / 2);
  ctx.lineTo(-w / 2 + 4, h / 2);
  ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - 4);
  ctx.lineTo(-w / 2, -h / 2 + 4);
  ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + 4, -h / 2);
  ctx.fill();
  // มุมพับเข้มกว่านิดหนึ่ง
  ctx.globalAlpha = alpha * 1.6;
  ctx.beginPath();
  ctx.moveTo(w / 2 - f, -h / 2);
  ctx.lineTo(w / 2 - f, -h / 2 + f);
  ctx.lineTo(w / 2, -h / 2 + f);
  ctx.closePath();
  ctx.fill();
  // เส้นร่างดินสอจาง ๆ สองเส้นบนกระดาษ
  ctx.globalAlpha = alpha * 1.2;
  ctx.strokeStyle = `rgb(${LAVENDER})`;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, h * 0.05);
  ctx.quadraticCurveTo(-w * 0.05, -h * 0.15, w * 0.25, h * 0.08);
  ctx.moveTo(-w * 0.25, h * 0.25);
  ctx.quadraticCurveTo(0, h * 0.12, w * 0.18, h * 0.27);
  ctx.stroke();
  ctx.restore();
}

/**
 * ดูเดิลลายเส้น — วาดด้วยเส้นอย่างเดียว เหมือนมีคนขีดเล่นไว้ (ไม่ใช่ไอคอนทึบที่ดูกดได้)
 * kind: heart / star / paw / fish / ears / brush / flower / swirl
 */
export function drawDoodle(ctx, kind, x, y, s, rot, alpha, color = CREAM) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = `rgb(${color})`;
  ctx.lineWidth = Math.max(1, s * 0.13);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (kind === 'heart') {
    ctx.moveTo(0, s * 0.8);
    ctx.bezierCurveTo(-s * 1.2, 0, -s * 0.8, -s, 0, -s * 0.35);
    ctx.bezierCurveTo(s * 0.8, -s, s * 1.2, 0, 0, s * 0.8);
  } else if (kind === 'star') {
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? s * 0.45 : s;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  } else if (kind === 'paw') {
    ctx.ellipse(0, s * 0.3, s * 0.55, s * 0.42, 0, 0, TAU);
    for (const [dx, dy] of [[-0.6, -0.3], [-0.2, -0.65], [0.2, -0.65], [0.6, -0.3]]) {
      ctx.moveTo(dx * s + s * 0.18, dy * s);
      ctx.arc(dx * s, dy * s, s * 0.18, 0, TAU);
    }
  } else if (kind === 'fish') {
    ctx.moveTo(-s, 0);
    ctx.quadraticCurveTo(-s * 0.2, -s * 0.7, s * 0.55, 0);
    ctx.quadraticCurveTo(-s * 0.2, s * 0.7, -s, 0);
    ctx.moveTo(s * 0.55, 0);
    ctx.lineTo(s, -s * 0.45);
    ctx.lineTo(s, s * 0.45);
    ctx.closePath();
  } else if (kind === 'ears') {
    // หัวแมวลายเส้น: เส้นโค้งหัว หูสองข้าง หนวดข้างละเส้น
    ctx.moveTo(-s, s * 0.2);
    ctx.lineTo(-s * 0.75, -s * 0.85);
    ctx.lineTo(-s * 0.25, -s * 0.45);
    ctx.quadraticCurveTo(0, -s * 0.55, s * 0.25, -s * 0.45);
    ctx.lineTo(s * 0.75, -s * 0.85);
    ctx.lineTo(s, s * 0.2);
    ctx.moveTo(-s * 1.35, s * 0.05);
    ctx.lineTo(-s * 0.7, s * 0.15);
    ctx.moveTo(s * 1.35, s * 0.05);
    ctx.lineTo(s * 0.7, s * 0.15);
  } else if (kind === 'brush') {
    // พู่กัน: ด้ามยาว ปลอกโลหะ ขนแปรงทรงหยดน้ำ
    ctx.moveTo(-s * 1.1, s * 0.12);
    ctx.lineTo(s * 0.2, s * 0.06);
    ctx.moveTo(-s * 1.1, -s * 0.12);
    ctx.lineTo(s * 0.2, -s * 0.06);
    ctx.moveTo(s * 0.2, -s * 0.16);
    ctx.lineTo(s * 0.2, s * 0.16);
    ctx.moveTo(s * 0.2, -s * 0.16);
    ctx.quadraticCurveTo(s * 0.9, -s * 0.18, s * 1.15, 0);
    ctx.quadraticCurveTo(s * 0.9, s * 0.18, s * 0.2, s * 0.16);
  } else if (kind === 'flower') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.moveTo(Math.cos(a) * s * 0.3 + s * 0.38, Math.sin(a) * s * 0.3);
      ctx.ellipse(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.32, s * 0.32, 0, 0, TAU);
    }
    ctx.moveTo(s * 0.18, 0);
    ctx.arc(0, 0, s * 0.18, 0, TAU);
  } else {
    // ขดก้นหอย — เส้นขีดเล่นเพลิน ๆ
    for (let i = 0; i <= 26; i++) {
      const a = i * 0.42;
      const r = s * (0.12 + i * 0.034);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/** หยดสีหยดน้ำ (ปลายแหลมด้านบน) */
function drawPaintDrop(ctx, x, y, r, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.6);
  ctx.bezierCurveTo(x + r * 0.2, y - r * 0.9, x + r, y - r * 0.4, x + r, y + r * 0.15);
  ctx.arc(x, y + r * 0.15, r, 0, Math.PI);
  ctx.bezierCurveTo(x - r, y - r * 0.4, x - r * 0.2, y - r * 0.9, x, y - r * 1.6);
  ctx.fill();
  // ไฮไลต์มันวาวเล็ก ๆ
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y - r * 0.05, r * 0.18, r * 0.3, -0.4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ตำแหน่งของ (สัดส่วนของการ์ด) — ตัวที่ไปทับโซนห้ามวาดจะถูกข้ามตอนวัดหน้า
// ─────────────────────────────────────────────────────────────

function layout() {
  const rand = seeded(20261007);
  const L = {};
  // ก้อนสีใหญ่จาง ๆ ตามมุมการ์ด (ส่วนใหญ่ล้นขอบออกไป เห็นแค่โค้งเข้ามา)
  L.blobs = [
    { x: 0.03, y: 0.97, r: 0.13, c: ROSE, a: 0.22, ph: 0 },
    { x: 0.98, y: 0.03, r: 0.1, c: MINT, a: 0.18, ph: 1.7 },
    { x: 0.985, y: 0.97, r: 0.09, c: BUTTER, a: 0.18, ph: 3.1 },
    { x: 0.44, y: -0.01, r: 0.07, c: SKY, a: 0.16, ph: 4.4 },
  ];
  // กระดาษวาดรูปโปร่ง ๆ — "ที่นี่คือโต๊ะทำงานศิลปะ"
  L.papers = [
    { x: 0.08, y: 0.86, w: 0.11, h: 0.15, rot: -0.22, a: 0.08 },
    { x: 0.93, y: 0.18, w: 0.09, h: 0.12, rot: 0.18, a: 0.07 },
    { x: 0.55, y: 0.95, w: 0.1, h: 0.1, rot: 0.08, a: 0.06 },
  ];
  // รอยพู่กันโค้งนุ่ม
  L.strokes = [
    { x: 0.3, y: 0.95, len: 0.16, rot: -0.12, wd: 9, c: LAVENDER, a: 0.2 },
    { x: 0.8, y: 0.06, len: 0.12, rot: 0.1, wd: 7, c: ROSE, a: 0.18 },
    // ใต้แถบเลือกโหมดซ้าย (ที่ว่างกว้างที่สุดของหน้า)
    { x: 0.13, y: 0.88, len: 0.1, rot: -0.3, wd: 8, c: MINT, a: 0.2 },
  ];
  // สีกระเซ็นจิ๋ว
  L.splashes = [
    { x: 0.16, y: 0.07, s: 6, c: ROSE, a: 0.3, seed: 1.3 },
    { x: 0.96, y: 0.5, s: 5, c: MINT, a: 0.28, seed: 2.7 },
    { x: 0.66, y: 0.97, s: 5.5, c: BUTTER, a: 0.28, seed: 4.1 },
    { x: 0.15, y: 0.24, s: 6.5, c: BUTTER, a: 0.26, seed: 5.6 },
    { x: 0.08, y: 0.76, s: 5, c: SKY, a: 0.26, seed: 6.9 },
  ];
  // ดูเดิลลายเส้น
  L.doodles = [
    { k: 'heart', x: 0.05, y: 0.62, s: 7, rot: -0.2, a: 0.3, c: ROSE },
    { k: 'star', x: 0.27, y: 0.05, s: 6, rot: 0.2, a: 0.3, c: BUTTER },
    { k: 'paw', x: 0.45, y: 0.94, s: 6, rot: -0.35, a: 0.2, c: CREAM },
    { k: 'fish', x: 0.97, y: 0.36, s: 8, rot: -0.3, a: 0.26, c: SKY },
    { k: 'ears', x: 0.7, y: 0.05, s: 7, rot: 0.05, a: 0.24, c: CREAM },
    { k: 'brush', x: 0.88, y: 0.94, s: 9, rot: -0.5, a: 0.26, c: LAVENDER },
    { k: 'flower', x: 0.04, y: 0.3, s: 6, rot: 0, a: 0.26, c: PEACH },
    { k: 'swirl', x: 0.96, y: 0.75, s: 7, rot: 0.4, a: 0.22, c: MINT },
    { k: 'star', x: 0.6, y: 0.04, s: 4, rot: -0.3, a: 0.24, c: CREAM },
    { k: 'brush', x: 0.16, y: 0.42, s: 9, rot: 0.6, a: 0.22, c: CREAM },
    { k: 'ears', x: 0.13, y: 0.95, s: 6, rot: -0.1, a: 0.2, c: ROSE },
  ];
  // หยดสีเด้งเบา ๆ
  L.drops = Array.from({ length: 6 }, (_, i) => ({
    x: [0.03, 0.97, 0.22, 0.75, 0.5, 0.12][i],
    y: [0.45, 0.62, 0.96, 0.95, 0.06, 0.15][i],
    r: 2.2 + rand() * 1.4,
    c: ART[i % ART.length],
    ph: rand() * TAU,
  }));
  // ประกาย: "สีเองที่เป็นประกาย"
  L.sparkles = Array.from({ length: 7 }, (_, i) => ({
    x: i % 2 ? (rand() < 0.5 ? 0.02 + rand() * 0.06 : 0.92 + rand() * 0.06) : 0.15 + rand() * 0.7,
    y: i % 2 ? 0.12 + rand() * 0.76 : (rand() < 0.5 ? 0.02 + rand() * 0.06 : 0.92 + rand() * 0.06),
    r: 3 + rand() * 3,
    ph: rand() * TAU,
    sp: 0.5 + rand() * 0.5,
    c: [CREAM, ROSE, BUTTER, MINT][i % 4],
  }));
  // ละอองสีลอยขึ้น — ข้ามเฟรมที่ลอยเข้าโซนห้ามวาด
  L.motes = Array.from({ length: 14 }, (_, i) => ({
    x: rand(),
    y: rand(),
    v: 0.006 + rand() * 0.008,
    sw: rand() * TAU,
    r: 1 + rand() * 1.4,
    c: ART[i % ART.length],
  }));
  return L;
}

// ─────────────────────────────────────────────────────────────
// ชั้นของฉาก
// ─────────────────────────────────────────────────────────────

/** ไล่สีพื้น: ม่วงลาเวนเดอร์ ขอบพลัมจาง ๆ (ชั้นนิ่ง — ไม่ขึ้นกับเลย์เอาต์) */
export function drawCreativeBackground(ctx, w, h) {
  const R = Math.max(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#9F6EDB');
  g.addColorStop(0.55, '#8858C9');
  g.addColorStop(1, '#6E3FB0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // ชมพูนวลมุมซ้ายบน มิ้นต์นวลมุมขวาล่าง — สตูดิโอมีสีสันกว่าหน้าอื่นนิดหนึ่ง แต่ม่วงยังเป็นหลัก
  drawMagicGlow(ctx, w * 0.12, 0, R * 0.42, ROSE, 0.22);
  drawMagicGlow(ctx, w, h, R * 0.4, MINT, 0.1);
  const v = ctx.createRadialGradient(w * 0.45, h * 0.5, R * 0.28, w * 0.45, h * 0.5, R * 0.8);
  v.addColorStop(0, `rgba(${PLUM},0)`);
  v.addColorStop(1, `rgba(${PLUM},0.36)`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/**
 * แสงหลังตัวน้อง (ผืนผ้าใบหลัก) สว่างที่สุด · หลังจานสีลาเวนเดอร์ · มุมบน/ล่างหายใจช้า ๆ
 * แสงหลังตัวน้องกับจานสี "นิ่ง" ไม่หายใจ — อยู่ติดกับของที่ผู้เล่นจ้องอยู่ ขยับนิดเดียวก็เห็นเป็นหมอกไหวไปมา
 * ตำแหน่งมาจาก M.stageNow / M.paletteNow (ตำแหน่งที่ตาเห็นทุกเฟรม — ดู track ใน makeCreativeBg)
 */
export function drawCreativeGlow(ctx, w, h, M, t) {
  const b = 0.5 + 0.5 * Math.sin(t * 0.5);
  const R = Math.max(w, h);
  if (M.stageNow) {
    const s = M.stageNow;
    const r = Math.max(s.w, s.h) * 0.78;
    drawMagicGlow(ctx, s.x + s.w / 2, s.y + s.h / 2, r, CREAM, 0.22 * s.a);
    drawMagicGlow(ctx, s.x + s.w / 2, s.y + s.h * 0.55, r * 0.75, LAVENDER, 0.22 * s.a);
  }
  if (M.paletteNow) {
    const p = M.paletteNow;
    drawMagicGlow(ctx, p.x + p.w / 2, p.y + p.h / 2, Math.max(p.w, p.h) * 0.7, LAVENDER, 0.12 * p.a);
  }
  drawMagicGlow(ctx, w * 0.5, 0, R * 0.3, ROSE, 0.1 + b * 0.04);
  drawMagicGlow(ctx, 0, h, R * 0.3, PEACH, 0.12 + (1 - b) * 0.04);
}

/** ก้อนสีพาสเทลตามมุม (หายใจช้ามาก) */
export function drawPaintBlobs(ctx, w, h, M, L, t) {
  const R = Math.min(w, h);
  for (const [i, bl] of L.blobs.entries()) {
    if (!M.ok.blobs[i]) continue;
    drawPaintBlob(ctx, bl.x * w, bl.y * h, bl.r * R * 1.4, bl.c, bl.a, bl.ph, Math.sin(t * 0.35 + bl.ph));
  }
}

/** กระดาษ รอยพู่กัน สีกระเซ็น (นิ่ง) */
export function drawPaintSplashes(ctx, w, h, M, L) {
  const u = Math.min(w, h) / 400;
  for (const [i, p] of L.papers.entries()) {
    if (M.ok.papers[i]) drawPaperShape(ctx, p.x * w, p.y * h, p.w * w, p.h * w, p.rot, p.a);
  }
  for (const [i, s] of L.strokes.entries()) {
    if (M.ok.strokes[i]) drawBrushStroke(ctx, s.x * w, s.y * h, s.len * w, s.rot, s.wd * u, s.c, s.a);
  }
  for (const [i, s] of L.splashes.entries()) {
    if (M.ok.splashes[i]) drawPaintSplash(ctx, s.x * w, s.y * h, s.s * u, s.c, s.a, s.seed);
  }
}

/** ดูเดิลลายเส้น (นิ่ง) — รอยเท้าใช้ทรงทึบของคลังน้องให้เข้าชุดกัน */
export function drawCreativeDoodles(ctx, w, h, M, L) {
  const u = Math.min(w, h) / 400;
  for (const [i, d] of L.doodles.entries()) {
    if (!M.ok.doodles[i]) continue;
    if (d.k === 'paw') drawPawPrint(ctx, d.x * w, d.y * h, d.s * u, d.rot, d.a, d.c);
    else drawDoodle(ctx, d.k, d.x * w, d.y * h, d.s * u, d.rot, d.a, d.c);
  }
}

/** หยดสีเด้งเบา ๆ + ละอองสีลอยขึ้น */
export function drawPaintParticles(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const [i, d] of L.drops.entries()) {
    if (!M.ok.drops[i]) continue;
    const bob = Math.abs(Math.sin(t * 0.9 + d.ph)) * 3 * u;
    drawPaintDrop(ctx, d.x * w, d.y * h - bob, d.r * u, d.c, 0.36);
  }
  for (const m of L.motes) {
    const y = 1.05 - ((m.y + t * m.v) % 1.1);
    const x = m.x + Math.sin(t * 0.5 + m.sw) * 0.01;
    // ลอยผ่านตัวน้อง/จานสี/ปุ่ม = ไม่วาดเฟรมนั้น (ไม่มีจุดสีแปลก ๆ ไปอยู่ข้างหลังช่องเลือกสี)
    if (blocked(M, x * w, y * h, 6)) continue;
    const a = 0.32 * Math.min(1, (1.05 - y) * 6) * Math.min(1, y * 4);
    if (a <= 0.02) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = `rgb(${m.c})`;
    ctx.beginPath();
    ctx.arc(x * w, y * h, m.r * u, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** ประกายกะพริบช้า ๆ */
export function drawCreativeSparkles(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const [i, s] of L.sparkles.entries()) {
    if (!M.ok.sparkles[i]) continue;
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    drawSparkle(ctx, s.x * w, s.y * h, s.r * u * (0.8 + tw * 0.3), 0.1 + tw * 0.36, s.c);
  }
}

/** จุดนี้ (วงรัศมี r) ทับโซนห้ามวาดไหม */
function blocked(M, x, y, r) {
  if (x < -r || y < -r || x > M.w + r || y > M.h + r) return false;
  for (const z of M.zones) {
    if (x + r > z.x && x - r < z.x + z.w && y + r > z.y && y - r < z.y + z.h) return true;
  }
  return false;
}

/**
 * พื้นหลังสตูดิโอศิลปะของหน้าโหมดสร้างสรรค์
 * @param canvas   ผ้าใบลูกคนแรกของการ์ดใหญ่
 * @param isActive แผงเปิดอยู่ไหม
 * @param pop      การ์ดใหญ่ (.pop) — ใช้วัดตำแหน่งตัวน้อง จานสี ปุ่ม (โซนห้ามวาด)
 */
export function makeCreativeBg(canvas, isActive, pop) {
  const L = layout();
  // ผลการวัดหน้า — ก้อนเดียวใช้ซ้ำ (ไม่สร้างใหม่ทุกเฟรม)
  const M = {
    w: 0, h: 0, at: -Infinity, stageEl: null, paletteEl: null, stageNow: null, paletteNow: null, zones: [],
    ok: {
      blobs: L.blobs.map(() => false), papers: L.papers.map(() => false), strokes: L.strokes.map(() => false),
      splashes: L.splashes.map(() => false), doodles: L.doodles.map(() => false), drops: L.drops.map(() => false),
      sparkles: L.sparkles.map(() => false),
    },
  };
  // แตะเลือกสีใหม่ = แสงหลังตัวน้องเรืองเป็นสีนั้นแวบหนึ่ง (ภาพล้วน ไม่แตะระบบเลือกสี)
  let pulse = null;   // { c: 'r,g,b', at: performance.now() }

  function measure(w, h) {
    const fullW = pop.offsetWidth;
    if (!fullW) return;
    const k = w / fullW;
    const sc = (r) => r && { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k };
    M.w = w;
    M.h = h;
    M.zones.length = 0;
    for (const sel of KEEP_OUT) {
      for (const el of pop.querySelectorAll(sel)) {
        if (!el.offsetParent || !el.offsetWidth) continue;   // ซ่อนอยู่ (แท็บอื่น / โหมดเต็มจอ)
        const r = layoutRect(pop, el, false);
        if (r) M.zones.push(sc({ x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12 }));
      }
    }
    // ผืนผ้าใบหลัก = ตัวน้อง (แท็บระบายสี) หรือกรอบตัดรูป (แท็บหน้าน้อง) — จำตัว element ไว้ให้ track วัดทุกเฟรม
    M.stageEl = [...pop.querySelectorAll('.paint-canvas, .face-crop')].find((el) => el.offsetParent) || null;
    const palEl = pop.querySelector('.paint-color-col');
    M.paletteEl = palEl && palEl.offsetParent ? palEl : null;
    // ของแต่ละชิ้นลงได้ไหม (เผื่อขนาดของชิ้นนั้น)
    const u = Math.min(w, h) / 400;
    const fit = (arr, key, size) => arr.forEach((o, i) => { M.ok[key][i] = !blocked(M, o.x * w, o.y * h, size(o)); });
    fit(L.blobs, 'blobs', () => 0);   // ก้อนสีอยู่มุมการ์ด ล้นออกนอก — เช็คแค่จุดกลาง
    fit(L.papers, 'papers', (p) => Math.max(p.w, p.h) * w * 0.5);
    fit(L.strokes, 'strokes', (s) => s.len * w * 0.5);
    fit(L.splashes, 'splashes', (s) => s.s * u * 2.2);
    fit(L.doodles, 'doodles', (d) => d.s * u * 1.4);
    fit(L.drops, 'drops', (d) => d.r * u * 3);
    fit(L.sparkles, 'sparkles', (s) => s.r * u);
  }

  /** แสงหลังตัวน้อง/จานสีเกาะตำแหน่งที่ตาเห็น + จางเข้าพร้อมเนื้อหา (ดู trackRect ใน event-bg.js) */
  const track = (el, w, out) => trackRect(canvas, pop, el, w, out);
  const stageBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const paletteBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };

  function live(ctx, w, h, _L, t) {
    // สลับแท็บ (ระบายสี ⇄ หน้าน้อง) = กรอบที่จำไว้ถูกซ่อน/เพิ่งโผล่ — วัดใหม่ทันที ไม่รอรอบ 0.5 วิ
    // ไม่งั้นแสงหลังตัวน้องหายไปครู่หนึ่งแล้ววาบขึ้นมาทีหลังตอนกลับมาแท็บระบายสี
    const stale = M.stageEl && !M.stageEl.offsetParent;
    if (stale || t - M.at > REMEASURE_S || t < M.at || w !== M.w || h !== M.h) {
      measure(w, h);
      M.at = t;
    }
    M.stageNow = track(M.stageEl, w, stageBox);
    M.paletteNow = track(M.paletteEl, w, paletteBox);
    drawCreativeGlow(ctx, w, h, M, t);
    if (pulse && M.stageNow) {
      const k = (performance.now() - pulse.at) / 1200;
      if (k >= 1) pulse = null;
      else {
        const s = M.stageNow;
        drawMagicGlow(ctx, s.x + s.w / 2, s.y + s.h / 2, Math.max(s.w, s.h) * 0.7, pulse.c, 0.28 * (1 - k) * Math.min(1, k * 6) * s.a);
      }
    }
    drawPaintBlobs(ctx, w, h, M, L, t);
    drawPaintSplashes(ctx, w, h, M, L);
    drawCreativeDoodles(ctx, w, h, M, L);
    drawPaintParticles(ctx, w, h, M, L, t);
    drawCreativeSparkles(ctx, w, h, M, L, t);
  }

  const bg = makeCanvasBg(canvas, isActive, { layout: () => L, still: drawCreativeBackground, live });
  // กดอะไรในการ์ด (แท็บ/ปุ่มโหมด) = วัดใหม่เฟรมถัดไป หลังหน้าเปลี่ยนแล้ว
  pop.addEventListener('click', () => { M.at = -Infinity; }, true);
  if (import.meta.env.DEV) window.__createBgM = M;   // สคริปต์ทดสอบอ่านผลการวัดหน้า

  /** สีจากผู้เล่น (#rrggbb หรือ rgb(...)) → 'r,g,b' แล้วเรือง */
  function colorPulse(color) {
    const s = String(color || '');
    let rgb = null;
    const hex = s.match(/^#?([0-9a-f]{6})$/i);
    if (hex) rgb = [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).join(',');
    const fn = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (fn) rgb = `${fn[1]},${fn[2]},${fn[3]}`;
    if (!rgb) return;
    pulse = { c: rgb, at: performance.now() };
    bg.kick();
  }

  return { kick: () => { M.at = -Infinity; bg.kick(); }, colorPulse };
}
