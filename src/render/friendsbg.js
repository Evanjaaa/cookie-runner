// src/render/friendsbg.js
//
// ══ พื้นหลัง "สวนเล็ก ๆ ที่น้องแมวมาเจอกัน" ของหน้าเพื่อนแมว ═════════════
//
// วาดด้วย Canvas 2D ล้วน ไม่มีไฟล์ภาพ — ตัวคุมผ้าใบชุดเดียวกับหน้าอื่น (makeCanvasBg)
// ใช้กับแผง #friendsPanel ทั้งสามแท็บ (เพื่อนแมว / คำขอเป็นเพื่อน / คำขอที่เราส่งไป) — main.js เป็นคนปลุก
//
// ── ต่างจากหน้าอื่นยังไง ──
//   คลังน้อง = บ้านนุ่ม · สกิล = พลัง · กาช่า = สมบัติ · กิจกรรม = ภารกิจ · สร้างสรรค์ = ศิลปะ
//   เลือกด่าน = การเดินทาง · อันดับ = เกียรติยศ · หน้านี้ = มิตรภาพ
//   แสงอุ่นชมพูพีชกลางหน้า · พุ่มไม้กลม ๆ กับหญ้าโค้งริมล่าง · บ้านแมวจิ๋วไกล ๆ · ดอกไม้จิ๋วไหวเบา ๆ
//   รอยเท้าแมวเดินเข้ามาหากัน · ของเป็น "คู่" (ประกายคู่ จุดคู่ ดอกไม้คู่) = แมวสองตัวมาเจอกัน
//   หัวใจจิ๋วลอยขึ้นจาง ๆ — มิตรภาพ ไม่ใช่ความรัก (ไม่มีหัวใจใหญ่ ไม่ชมพูเกิน)
//
// ── หลักของภาพ ──
//   บัตรแมวน้อยของเรา แท็บ รายชื่อ/คำขอ และข้อความตอนยังไม่มีเพื่อน ต้องอ่านง่ายที่สุด
//   ไม่มีของตกแต่งชิ้นไหนเข้าไปหลังของพวกนี้ — วัดโซนห้ามวาดจากหน้าจริงเป็นระยะ (สลับแท็บแล้วหน้าเปลี่ยน)
//   ตอนยังไม่มีเพื่อน: หัวใจคู่กับรอยเท้าคู่จาง ๆ ข้างข้อความ = "เดี๋ยวก็มีเพื่อนมาแล้วนะ" (ไม่เหงา)
//
// ── แสงที่เกาะของจริง ── (แท็บที่เลือก / พื้นที่หลัก / ข้อความว่าง) ใช้ trackRect ตั้งแต่ต้น
//   เลื่อนขึ้นและจางเข้าพร้อมเนื้อหาตอนเปิดหน้า ไม่มีแสงวาบมาก่อนของจริง
//
// ── ของที่ขยับไม่สร้างใหม่ทุกเฟรม ──
//   ชั้นนิ่ง: ไล่สีพื้น + พุ่มไม้/หญ้าไกล ๆ ริมล่าง + ขอบพลัม (ไม่ขึ้นกับเลย์เอาต์)
//   ทุกเฟรม: แสงอุ่น · แสงแท็บ · เมฆ 3 · บ้านแมว 3 · ดอกไม้ 4 · รอยเท้า 6 · ของคู่ 3 · หัวใจลอย 4
//            · ดูเดิลแมว 2 · ละออง 12 · (ตอนว่าง) หัวใจคู่ + รอยเท้าคู่ข้างข้อความ

import { makeCanvasBg, drawPawPrint, drawHeart } from './dreambg.js';
import { drawMagicGlow, drawSparkle, drawSoftCloud } from './skillbg.js';
import { layoutRect, trackRect } from './event-bg.js';

const TAU = Math.PI * 2;

// ── สี ── ม่วงเป็นหลัก · ชมพู/พีช = มิตรภาพ · มิ้นต์/ฟ้าแต้มเล็กน้อย
const PLUM = '56,22,100';
const LAVENDER = '206,178,248';
const ROSE = '247,199,232';
const PEACH = '241,180,177';
const BUTTER = '254,224,175';
const MINT = '176,240,226';
const CYAN = '170,230,240';
const CREAM = '255,246,232';

/** วัดหน้าใหม่ทุกกี่วินาที (สลับแท็บ / รายชื่อโหลดเสร็จ / หมุนจอ) */
const REMEASURE_S = 0.5;

/** โซนห้ามวาด — ของที่ผู้เล่นอ่าน/กดจริง */
const KEEP_OUT = [
  '.skin-title', '.fr-tabs', '.tl-side-label', '.fr-me', '.fr-copy-msg', '.tl-side-note',
  '.fr-grid > *', '.fr-search', '.xbtn', '#frMsg',
];

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────
// ชิ้นส่วนธีมสวนเพื่อน (ตัวจิ๋ว จาง)
// ─────────────────────────────────────────────────────────────

/** บ้านแมวจิ๋ว: ตัวบ้านมน หลังคาหูแมวสองข้าง ประตูโค้ง หน้าต่างกลมเรืองอุ่น */
export function drawCatHouse(ctx, x, y, s, alpha, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${LAVENDER})`;
  ctx.beginPath();
  ctx.roundRect(-s, -s * 0.7, s * 2, s * 1.4, s * 0.3);
  ctx.fill();
  // หลังคาเป็นหัวแมว: โค้งบน + หูสองข้าง
  ctx.fillStyle = `rgb(${ROSE})`;
  ctx.beginPath();
  ctx.moveTo(-s * 1.2, -s * 0.55);
  ctx.quadraticCurveTo(0, -s * 1.55, s * 1.2, -s * 0.55);
  ctx.closePath();
  ctx.moveTo(-s * 0.95, -s * 0.9);
  ctx.lineTo(-s * 0.7, -s * 1.45);
  ctx.lineTo(-s * 0.35, -s * 1.08);
  ctx.closePath();
  ctx.moveTo(s * 0.95, -s * 0.9);
  ctx.lineTo(s * 0.7, -s * 1.45);
  ctx.lineTo(s * 0.35, -s * 1.08);
  ctx.closePath();
  ctx.fill();
  // ประตูโค้ง
  ctx.fillStyle = `rgb(${PLUM})`;
  ctx.beginPath();
  ctx.moveTo(-s * 0.32, s * 0.7);
  ctx.lineTo(-s * 0.32, s * 0.12);
  ctx.arc(0, s * 0.12, s * 0.32, Math.PI, 0);
  ctx.lineTo(s * 0.32, s * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // หน้าต่างเรืองอุ่น (หายใจช้า ๆ)
  drawMagicGlow(ctx, x + s * 0.62, y - s * 0.15, s * 0.6, BUTTER, alpha * (1.1 + 0.3 * Math.sin(t * 0.7)));
}

/** ดอกไม้จิ๋ว 5 กลีบ (หรือ 4) — ไหวเบา ๆ ตามลม */
export function drawTinyFlower(ctx, x, y, s, alpha, color, sway = 0, petals = 5) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  // ก้านโค้ง
  ctx.strokeStyle = `rgb(${MINT})`;
  ctx.lineWidth = Math.max(1, s * 0.18);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, s * 2.2);
  ctx.quadraticCurveTo(sway * s * 0.4, s * 1.1, sway * s, 0);
  ctx.stroke();
  ctx.translate(sway * s, 0);
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * TAU - Math.PI / 2;
    ctx.moveTo(Math.cos(a) * s * 0.55 + s * 0.4, Math.sin(a) * s * 0.55);
    ctx.arc(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.4, 0, TAU);
  }
  ctx.fill();
  ctx.fillStyle = `rgb(${BUTTER})`;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** ดูเดิลแมวลายเส้น: หูแมว+หนวด หรือ ปลา (จาง ๆ เหมือนขีดเล่นไว้) */
function drawCatDoodle(ctx, kind, x, y, s, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = `rgb(${CREAM})`;
  ctx.lineWidth = Math.max(1, s * 0.13);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (kind === 'ears') {
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
  } else {
    ctx.moveTo(-s, 0);
    ctx.quadraticCurveTo(-s * 0.2, -s * 0.7, s * 0.55, 0);
    ctx.quadraticCurveTo(-s * 0.2, s * 0.7, -s, 0);
    ctx.moveTo(s * 0.55, 0);
    ctx.lineTo(s, -s * 0.45);
    ctx.lineTo(s, s * 0.45);
    ctx.closePath();
  }
  ctx.stroke();
  ctx.restore();
}

/** ของ "คู่": ประกายสองดวงชิดกัน / จุดสองจุดมีเส้นโค้งจาง ๆ เชื่อม — แมวสองตัวมาเจอกัน */
function drawPair(ctx, kind, x, y, s, alpha, t, ph) {
  if (kind === 'sparkles') {
    const tw = 0.5 + 0.5 * Math.sin(t * 0.8 + ph);
    drawSparkle(ctx, x - s * 0.7, y, s * (0.8 + tw * 0.25), alpha * (0.6 + tw * 0.4), CREAM);
    drawSparkle(ctx, x + s * 0.7, y - s * 0.3, s * 0.6 * (0.8 + (1 - tw) * 0.25), alpha * (0.6 + (1 - tw) * 0.4), ROSE);
    return;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = `rgb(${LAVENDER})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.quadraticCurveTo(x, y - s * 0.8, x + s, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = `rgb(${PEACH})`;
  ctx.beginPath();
  ctx.arc(x - s, y, s * 0.28, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `rgb(${MINT})`;
  ctx.beginPath();
  ctx.arc(x + s, y, s * 0.28, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ตำแหน่งของ (สัดส่วนของการ์ด) — ชิ้นที่ทับโซนห้ามวาดถูกข้ามตอนวัดหน้า
// ─────────────────────────────────────────────────────────────

function layout() {
  const rand = seeded(20261010);
  const L = {};
  // เมฆลอยช้า ๆ: บนกลาง (ข้างหัวเรื่อง) / ขอบขวากลาง / มุมล่างซ้าย — ไม่ไปอยู่หลังแท็บ
  L.clouds = [
    { x: 0.36, y: 0.04, w: 0.2, a: 0.14, c: ROSE, v: 0.0025 },
    { x: 0.99, y: 0.5, w: 0.16, a: 0.12, c: LAVENDER, v: 0 },
    { x: 0.02, y: 0.99, w: 0.26, a: 0.16, c: LAVENDER, v: 0.0015 },
  ];
  // บ้านแมวจิ๋วไกล ๆ (ที่ลงสำรองหลายจุด)
  L.houses = [
    { s: 10, a: 0.28, spots: [[0.88, 0.88], [0.97, 0.7], [0.5, 0.93]] },
    { s: 8, a: 0.24, spots: [[0.95, 0.9], [0.75, 0.92], [0.04, 0.5]] },
    { s: 7, a: 0.2, spots: [[0.62, 0.94], [0.3, 0.94], [0.97, 0.3]] },
  ];
  // ดอกไม้จิ๋วริมล่าง (สองคู่)
  L.flowers = [
    { x: 0.24, y: 0.93, s: 3.6, c: ROSE, n: 5, ph: 0 },
    { x: 0.265, y: 0.95, s: 2.8, c: BUTTER, n: 4, ph: 1.2 },
    { x: 0.78, y: 0.93, s: 3.4, c: MINT, n: 5, ph: 2.4 },
    { x: 0.805, y: 0.955, s: 2.6, c: CREAM, n: 4, ph: 3.6 },
  ];
  // รอยเท้าแมวเดินจากมุมขวาล่างเข้าหากลาง จางลงเรื่อย ๆ (หายไปตรงกลาง)
  L.paws = [
    [0.96, 0.97, -2.2], [0.92, 0.94, -2.0], [0.88, 0.95, -2.3],
    [0.84, 0.91, -2.0], [0.8, 0.92, -2.25], [0.76, 0.88, -2.0],
  ];
  // ของคู่
  L.pairs = [
    { k: 'sparkles', x: 0.42, y: 0.08, s: 5, a: 0.5, ph: 0 },
    { k: 'dots', x: 0.13, y: 0.97, s: 8, a: 0.3, ph: 0 },
    { k: 'sparkles', x: 0.97, y: 0.2, s: 4, a: 0.42, ph: 2 },
  ];
  // หัวใจจิ๋วลอยขึ้นช้า ๆ แล้วจาง
  L.hearts = Array.from({ length: 4 }, (_, i) => ({
    x: [0.06, 0.94, 0.5, 0.18][i],
    y: rand(),
    v: 0.012 + rand() * 0.008,
    s: 3 + rand() * 1.5,
    sw: rand() * TAU,
    c: [ROSE, PEACH, ROSE, LAVENDER][i],
  }));
  // ดูเดิลแมว
  L.doodles = [
    { k: 'ears', s: 7, a: 0.2, spots: [[0.05, 0.08], [0.48, 0.05], [0.97, 0.94]] },
    { k: 'fish', s: 7, a: 0.18, spots: [[0.97, 0.62], [0.05, 0.72], [0.4, 0.95]] },
  ];
  // ละอองลอย (ชมพู/ครีม/ลาเวนเดอร์ แต้มมิ้นต์/ฟ้า)
  L.motes = Array.from({ length: 12 }, (_, i) => ({
    x: rand(),
    y: rand(),
    v: 0.004 + rand() * 0.006,
    sw: rand() * TAU,
    r: 0.9 + rand() * 1.2,
    c: [ROSE, CREAM, LAVENDER, PEACH, MINT, CYAN][i % 6],
  }));
  return L;
}

// ─────────────────────────────────────────────────────────────
// ชั้นของฉาก
// ─────────────────────────────────────────────────────────────

/** ชั้นนิ่ง — บนลาเวนเดอร์ กลางม่วงอุ่น ล่างพลัม + พุ่มไม้กลม/หญ้าโค้งไกล ๆ ริมล่าง + ขอบพลัม */
export function drawFriendsBackground(ctx, w, h) {
  const R = Math.max(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#A072DC');
  g.addColorStop(0.5, '#8957C6');
  g.addColorStop(1, '#5E3299');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // พุ่มไม้กลม ๆ เรียงริมล่าง (ไกลมาก จาง) — สวนแบบนามธรรม ไม่ใช่ฉากสวน
  ctx.fillStyle = `rgba(${LAVENDER},0.08)`;
  ctx.beginPath();
  for (let i = 0; i <= 9; i++) {
    const x = (i / 9) * w;
    const r = h * (0.07 + 0.03 * Math.sin(i * 2.3));
    ctx.moveTo(x + r, h);
    ctx.arc(x, h + r * 0.25, r, Math.PI, 0);
  }
  ctx.fill();
  ctx.fillStyle = `rgba(${MINT},0.05)`;
  ctx.beginPath();
  for (let i = 0; i <= 7; i++) {
    const x = ((i + 0.5) / 7) * w;
    const r = h * (0.05 + 0.02 * Math.cos(i * 1.7));
    ctx.moveTo(x + r, h);
    ctx.arc(x, h + r * 0.4, r, Math.PI, 0);
  }
  ctx.fill();
  // หญ้าโค้งสั้น ๆ ริมล่าง
  ctx.strokeStyle = `rgba(${MINT},0.12)`;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 26; i++) {
    const x = ((i * 37) % 100) / 100 * w;
    const hh = h * (0.018 + ((i * 13) % 7) * 0.003);
    ctx.moveTo(x, h);
    ctx.quadraticCurveTo(x + 2, h - hh * 0.6, x + (i % 2 ? 4 : -3), h - hh);
  }
  ctx.stroke();
  const v = ctx.createRadialGradient(w * 0.55, h * 0.48, R * 0.3, w * 0.55, h * 0.48, R * 0.8);
  v.addColorStop(0, `rgba(${PLUM},0)`);
  v.addColorStop(1, `rgba(${PLUM},0.34)`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** เมฆนุ่มลอยช้ามาก */
export function drawSoftClouds(ctx, w, h, L, t) {
  for (const c of L.clouds) {
    const x = c.v ? ((((c.x + c.v * t) % 1.3) + 1.3) % 1.3) - 0.15 : c.x;
    drawSoftCloud(ctx, x * w, c.y * h, c.w * w, c.a, c.c);
  }
}

/** บ้านแมวจิ๋ว ดอกไม้ รอยเท้า ของคู่ ดูเดิล — ชิ้นที่ไม่มีที่ลงไม่วาด */
export function drawSocialGarden(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const [i, hs] of L.houses.entries()) {
    const at = M.houseAt[i];
    if (at) drawCatHouse(ctx, at[0] * w, at[1] * h, hs.s * u, hs.a, t + i);
  }
  for (const [i, f] of L.flowers.entries()) {
    if (M.flowerOk[i]) drawTinyFlower(ctx, f.x * w, f.y * h - f.s * u * 2.2, f.s * u, 0.52, f.c, Math.sin(t * 0.6 + f.ph) * 0.35, f.n);
  }
  // รอยเท้า: จางลงเรื่อย ๆ ตามทางเดิน (ตัวท้าย ๆ เหมือนเดินลับไป)
  for (const [i, [x, y, rot]] of L.paws.entries()) {
    if (M.pawOk[i]) drawPawPrint(ctx, x * w, y * h, 4 * u, rot, 0.17 * (1 - i * 0.12), CREAM);
  }
  for (const [i, p] of L.pairs.entries()) {
    if (M.pairOk[i]) drawPair(ctx, p.k, p.x * w, p.y * h, p.s * u, p.a, t, p.ph);
  }
  for (const [i, d] of L.doodles.entries()) {
    const at = M.doodleAt[i];
    if (at) drawCatDoodle(ctx, d.k, at[0] * w, at[1] * h, d.s * u, d.a);
  }
}

/** หัวใจจิ๋วลอยขึ้นช้า ๆ แล้วจาง — ผ่านหลังของจริง = ไม่วาดเฟรมนั้น */
export function drawFriendshipHearts(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const ht of L.hearts) {
    const y = 1.05 - ((ht.y + t * ht.v) % 1.1);
    const x = ht.x + Math.sin(t * 0.5 + ht.sw) * 0.012;
    if (blocked(M, x * w, y * h, ht.s * u * 1.5)) continue;
    const a = 0.32 * Math.min(1, (1.05 - y) * 5) * Math.min(1, y * 2.5);
    if (a > 0.02) drawHeart(ctx, x * w, y * h, ht.s * u, a, ht.c);
  }
}

/** ละอองลอยช้า ๆ */
export function drawSocialParticles(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const m of L.motes) {
    const y = 1.05 - ((m.y + t * m.v) % 1.1);
    const x = m.x + Math.sin(t * 0.45 + m.sw) * 0.012;
    if (blocked(M, x * w, y * h, 5)) continue;
    const a = 0.28 * Math.min(1, (1.05 - y) * 6) * Math.min(1, y * 4);
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
 * พื้นหลังสวนเพื่อนแมว
 * @param canvas   ผ้าใบลูกคนแรกของการ์ดใหญ่
 * @param isActive แผงเปิดอยู่ไหม
 * @param pop      การ์ดใหญ่ (.pop) — วัดหัวเรื่อง แท็บ บัตรของเรา รายชื่อ ข้อความว่าง
 */
export function makeFriendsBg(canvas, isActive, pop) {
  const L = layout();
  const M = {
    w: 0, h: 0, at: -Infinity, zones: [],
    houseAt: L.houses.map(() => null), flowerOk: L.flowers.map(() => false), pawOk: L.paws.map(() => false),
    pairOk: L.pairs.map(() => false), doodleAt: L.doodles.map(() => null),
    tabEl: null, mainEl: null, emptyEl: null,
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
    const pick = (spots, r) => spots.find(([x, y]) => !blocked(M, x * w, y * h, r)
      && !taken.some(([tx, ty]) => Math.hypot((tx - x) * w, (ty - y) * h) < r * 2.6)) || null;
    L.houses.forEach((hs, i) => { M.houseAt[i] = pick(hs.spots, hs.s * u * 1.8); if (M.houseAt[i]) taken.push(M.houseAt[i]); });
    L.doodles.forEach((d, i) => { M.doodleAt[i] = pick(d.spots, d.s * u * 1.6); if (M.doodleAt[i]) taken.push(M.doodleAt[i]); });
    L.flowers.forEach((f, i) => { M.flowerOk[i] = !blocked(M, f.x * w, f.y * h - f.s * u * 2, f.s * u * 3); });
    L.paws.forEach(([x, y], i) => { M.pawOk[i] = !blocked(M, x * w, y * h, 6 * u); });
    L.pairs.forEach((p, i) => { M.pairOk[i] = !blocked(M, p.x * w, p.y * h, p.s * u * 1.6); });
    M.tabEl = pop.querySelector('.fr-tabs .fchip.on');
    M.mainEl = pop.querySelector('.fr-main');
    // ข้อความตอนยังไม่มีเพื่อน/คำขอ (ของหน้าที่เปิดอยู่เท่านั้น)
    M.emptyEl = [...pop.querySelectorAll('.fr-grid .grid-empty')].find((el) => el.offsetParent) || null;
  }

  // ก้อนผลลัพธ์ของ trackRect — ใช้ซ้ำทุกเฟรม
  const tabBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const mainBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const emptyBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const track = (el, w, out) => trackRect(canvas, pop, el, w, out);

  function live(ctx, w, h, _L, t) {
    // สลับแท็บ / รายชื่อเพิ่งโหลด (ปุ่มแท็บหรือข้อความว่างถูกสร้างใหม่) = วัดใหม่ทันที
    const stale = (M.tabEl && !M.tabEl.classList.contains('on')) || (M.emptyEl && !M.emptyEl.isConnected);
    if (stale || t - M.at > REMEASURE_S || t < M.at || w !== M.w || h !== M.h) {
      measure(w, h);
      M.at = t;
    }
    const b = 0.5 + 0.5 * Math.sin(t * 0.4);
    const R = Math.max(w, h);

    // แสงอุ่นมิตรภาพกลางพื้นที่หลัก (ลาเวนเดอร์ + ชมพูพีช) — จางเข้าพร้อมเนื้อหา
    const mb = track(M.mainEl, w, mainBox);
    if (mb) {
      drawMagicGlow(ctx, mb.x + mb.w / 2, mb.y + mb.h * 0.5, Math.max(mb.w, mb.h) * 0.62, LAVENDER, (0.16 + b * 0.03) * mb.a);
      drawMagicGlow(ctx, mb.x + mb.w / 2, mb.y + mb.h * 0.55, Math.max(mb.w, mb.h) * 0.42, PEACH, (0.1 + b * 0.03) * mb.a);
    }
    // มุม: ชมพูซ้ายบน (หลังหัวเรื่อง) / พีชขวาล่าง
    drawMagicGlow(ctx, w * 0.1, 0, R * 0.32, ROSE, 0.2 + b * 0.04);
    drawMagicGlow(ctx, w, h, R * 0.32, PEACH, 0.16 + (1 - b) * 0.04);
    // แสงนวลหลังแท็บที่เลือก
    const tb = track(M.tabEl, w, tabBox);
    if (tb) drawMagicGlow(ctx, tb.x + tb.w / 2, tb.y + tb.h / 2, tb.w * 0.75, ROSE, 0.2 * tb.a);

    drawSoftClouds(ctx, w, h, L, t);
    drawSocialGarden(ctx, w, h, M, L, t);

    // ตอนยังไม่มีเพื่อน/คำขอ: หัวใจคู่ลอยเหนือข้อความ + รอยเท้าคู่ใต้ข้อความ — "เดี๋ยวก็มีเพื่อนมานะ"
    const eb = track(M.emptyEl, w, emptyBox);
    if (eb && eb.a > 0.02) {
      const u = Math.min(w, h) / 400;
      const cx = eb.x + eb.w / 2;
      const bob = Math.sin(t * 0.9) * 2 * u;
      drawHeart(ctx, cx - 9 * u, eb.y - 16 * u + bob, 4.2 * u, 0.4 * eb.a, ROSE);
      drawHeart(ctx, cx + 9 * u, eb.y - 20 * u - bob, 3.4 * u, 0.34 * eb.a, PEACH);
      drawPawPrint(ctx, cx - 12 * u, eb.y + eb.h + 18 * u, 4 * u, -0.35, 0.2 * eb.a, CREAM);
      drawPawPrint(ctx, cx + 12 * u, eb.y + eb.h + 22 * u, 4 * u, 0.35, 0.2 * eb.a, CREAM);
    }

    drawFriendshipHearts(ctx, w, h, M, L, t);
    drawSocialParticles(ctx, w, h, M, L, t);
  }

  const bg = makeCanvasBg(canvas, isActive, { layout: () => L, still: drawFriendsBackground, live });
  // แตะแท็บ = แสงแท็บ/ข้อความว่างย้ายตามทันที
  pop.querySelector('.fr-tabs')?.addEventListener('click', () => { M.at = -Infinity; }, true);
  if (import.meta.env.DEV) window.__friendsBgM = M;   // สคริปต์ทดสอบอ่านผลการวัดหน้า
  return { kick: () => { M.at = -Infinity; bg.kick(); } };
}
