// src/render/newsbg.js
//
// ══ พื้นหลัง "บอร์ดข่าวน่ารักของโลกน้องแมว" ของหน้าข่าวสาร ═══════════════
//
// วาดด้วย Canvas 2D ล้วน ไม่มีไฟล์ภาพ — ตัวคุมผ้าใบชุดเดียวกับหน้าอื่น (makeCanvasBg)
// ใช้กับแผง #newsPanel — main.js เป็นคนปลุก
//
// ── ต่างจากหน้าอื่นยังไง ──
//   หน้าอื่นเล่าเรื่องบ้าน พลัง สมบัติ ภารกิจ ศิลปะ การเดินทาง เกียรติยศ มิตรภาพ
//   หน้านี้ = ข่าวสาร: บอร์ดประกาศแบบนามธรรม — โน้ตกระดาษจิ๋วปักหมุดลอยอยู่ริมขอบ
//   หมุดกลมเล็ก ๆ ดูเดิล (ฟองคำพูดมีเครื่องหมายตกใจ ซองจดหมาย กระดิ่ง หน้าแมว ปลา)
//   จุดแจ้งเตือนเต้นเบา ๆ เส้นจุดไข่ปลาจาง ๆ ที่มีกระดาษจิ๋วไหลไปหาบทความ = "ข่าวกำลังส่งมา"
//   เป็นระเบียบกว่าหน้าอื่นนิดหนึ่ง (กระดาษเรียบ เส้นตรง) แต่ยังน่ารัก
//
// ── หลักของภาพ ──
//   กรอบบทความครีม + รูปข่าว (สีจัดอยู่แล้ว) ต้องเด่นที่สุด พื้นหลังม่วงเงียบ ๆ ให้กรอบครีมลอยเด่น
//   โน้ตกระดาษเล็กและจางมาก ไม่หน้าตาเหมือนการ์ดข่าวที่กดได้ · ไม่มีของชิ้นใหญ่
//   ไม่มีอะไรไปอยู่หลังหัวเรื่อง รายการข่าว กรอบบทความ หรือปุ่มปิด — วัดโซนห้ามวาดจากหน้าจริง
//
// ── แสงที่เกาะของจริง ── (หลังกรอบบทความ / ข่าวที่เลือก) ใช้ trackRect ตั้งแต่ต้น
//   เลื่อนขึ้นและจางเข้าพร้อมเนื้อหาตอนเปิดหน้า ไม่มีแสงวาบมาก่อนของจริง
//
// ── ของที่ขยับไม่สร้างใหม่ทุกเฟรม ──
//   ชั้นนิ่ง: ไล่สีพื้น + วงกลมจาง ๆ ไกล ๆ + ขอบพลัม (ไม่ขึ้นกับเลย์เอาต์)
//   ทุกเฟรม: แสง 4 · โน้ตปักหมุด 3 · หมุด 3 · ดูเดิล 4 · รอยเท้า 3 กลุ่ม · จุดแจ้งเตือน 4
//            · ทางข่าวไหล 1 · ประกาย 6 · ละออง 10

import { makeCanvasBg, drawPawPrint } from './dreambg.js';
import { drawMagicGlow, drawSparkle, drawSoftCloud } from './skillbg.js';
import { layoutRect, trackRect } from './event-bg.js';
import { drawDoodle } from './creativebg.js';

const TAU = Math.PI * 2;

// ── สี ── ม่วงเป็นหลัก · ครีม/ชมพู/พีช/มิ้นต์/ฟ้า/เหลืองอุ่น เป็นแต้มเล็ก ๆ
const PLUM = '56,22,100';
const LAVENDER = '206,178,248';
const ROSE = '247,199,232';
const PEACH = '241,180,177';
const BUTTER = '254,224,175';
const MINT = '176,240,226';
const CYAN = '170,230,240';
const CREAM = '255,246,232';

/** วัดหน้าใหม่ทุกกี่วินาที (เลือกข่าวอื่น = ฝั่งอ่านสร้างใหม่ / หมุดจอ) */
const REMEASURE_S = 0.5;

/** โซนห้ามวาด — ของที่ผู้เล่นอ่าน/กดจริง */
const KEEP_OUT = ['.panel-head', '.news-item', '.news-view', '.xbtn'];

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────
// ชิ้นส่วนธีมบอร์ดข่าว (ตัวจิ๋ว จาง)
// ─────────────────────────────────────────────────────────────

/** หมุดกลมจิ๋ว: หัวหมุดกลม + ไฮไลต์ + เงาเล็ก */
export function drawNewsPin(ctx, x, y, r, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha * 0.5;
  ctx.fillStyle = `rgb(${PLUM})`;
  ctx.beginPath();
  ctx.ellipse(x + r * 0.35, y + r * 0.55, r * 0.9, r * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.32, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** โน้ตกระดาษจิ๋วปักหมุด: แผ่นมนเอียงนิด เส้นบรรทัดจาง ๆ มุมพับ หมุดบนกลาง */
export function drawPinnedNote(ctx, x, y, w, h, rot, paper, pin, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${paper})`;
  const f = Math.min(w, h) * 0.22;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 3, -h / 2);
  ctx.lineTo(w / 2 - 3, -h / 2);
  ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + 3);
  ctx.lineTo(w / 2, h / 2 - f);
  ctx.lineTo(w / 2 - f, h / 2);
  ctx.lineTo(-w / 2 + 3, h / 2);
  ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - 3);
  ctx.lineTo(-w / 2, -h / 2 + 3);
  ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + 3, -h / 2);
  ctx.fill();
  // มุมพับล่างขวา (เข้มกว่านิด)
  ctx.globalAlpha = alpha * 0.6;
  ctx.fillStyle = `rgb(${LAVENDER})`;
  ctx.beginPath();
  ctx.moveTo(w / 2, h / 2 - f);
  ctx.lineTo(w / 2 - f, h / 2 - f);
  ctx.lineTo(w / 2 - f, h / 2);
  ctx.closePath();
  ctx.fill();
  // เส้นบรรทัด
  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = `rgb(${PLUM})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const ly = -h * 0.12 + i * h * 0.2;
    ctx.moveTo(-w * 0.32, ly);
    ctx.lineTo(w * (i === 2 ? 0.05 : 0.3), ly);
  }
  ctx.stroke();
  ctx.restore();
  // หมุดบนกลาง (หมุนตามแผ่น)
  const px = x + Math.sin(rot) * h * 0.38;
  const py = y - Math.cos(rot) * h * 0.38;
  drawNewsPin(ctx, px, py, Math.max(2, w * 0.1), pin, Math.min(1, alpha * 2.2));
}

/** ดูเดิลข่าวลายเส้น: ฟองคำพูดมี "!" / ซองจดหมาย / กระดิ่ง */
function drawNewsDoodle(ctx, kind, x, y, s, alpha, color = CREAM) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = `rgb(${color})`;
  ctx.fillStyle = `rgb(${color})`;
  ctx.lineWidth = Math.max(1, s * 0.13);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (kind === 'bubble') {
    ctx.roundRect(-s, -s * 0.75, s * 2, s * 1.3, s * 0.45);
    ctx.moveTo(-s * 0.35, s * 0.55);
    ctx.lineTo(-s * 0.6, s * 0.95);
    ctx.lineTo(-s * 0.05, s * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.42);
    ctx.lineTo(0, s * 0.02);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, s * 0.25, s * 0.08, 0, TAU);
    ctx.fill();
  } else if (kind === 'envelope') {
    ctx.roundRect(-s, -s * 0.65, s * 2, s * 1.3, s * 0.15);
    ctx.moveTo(-s, -s * 0.55);
    ctx.lineTo(0, s * 0.12);
    ctx.lineTo(s, -s * 0.55);
    ctx.stroke();
    // หัวใจเล็กปิดซอง
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s * 0.3, s * 0.08, -s * 0.2, -s * 0.12, 0, 0);
    ctx.bezierCurveTo(s * 0.2, -s * 0.12, s * 0.3, s * 0.08, 0, s * 0.3);
    ctx.fill();
  } else {
    // กระดิ่ง: ตัวระฆัง ขอบล่าง ลูกกระดิ่ง
    ctx.moveTo(-s * 0.75, s * 0.45);
    ctx.quadraticCurveTo(-s * 0.7, -s * 0.85, 0, -s * 0.85);
    ctx.quadraticCurveTo(s * 0.7, -s * 0.85, s * 0.75, s * 0.45);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, s * 0.68, s * 0.16, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.85);
    ctx.lineTo(0, -s * 1.05);
    ctx.stroke();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ตำแหน่งของ (สัดส่วนของการ์ด) — ชิ้นที่ทับโซนห้ามวาดถูกข้ามตอนวัดหน้า
// ─────────────────────────────────────────────────────────────

function layout() {
  const rand = seeded(20261011);
  const L = {};
  // วงกลมจาง ๆ ไกล ๆ (ชั้นนิ่ง) — ความลึกแบบเงียบ ๆ
  L.halos = [
    { x: 0.08, y: 0.18, r: 0.12 }, { x: 0.94, y: 0.82, r: 0.14 }, { x: 0.3, y: 0.95, r: 0.08 },
  ];
  // โน้ตปักหมุดจิ๋ว — ที่ลงสำรองหลายจุด ลอยขึ้นลงช้ามาก
  L.notes = [
    { w: 18, h: 22, rot: -0.16, paper: CREAM, pin: ROSE, a: 0.22, spots: [[0.06, 0.82], [0.05, 0.4], [0.3, 0.06]] },
    { w: 15, h: 18, rot: 0.14, paper: ROSE, pin: CYAN, a: 0.2, spots: [[0.97, 0.22], [0.97, 0.6], [0.6, 0.06]] },
    { w: 14, h: 16, rot: -0.08, paper: LAVENDER, pin: BUTTER, a: 0.22, spots: [[0.97, 0.9], [0.22, 0.95], [0.05, 0.6]] },
  ];
  // หมุดเดี่ยว ๆ
  L.pins = [
    { c: BUTTER, spots: [[0.04, 0.2], [0.18, 0.06]] },
    { c: MINT, spots: [[0.97, 0.45], [0.82, 0.06]] },
    { c: ROSE, spots: [[0.15, 0.92], [0.04, 0.95]] },
  ];
  // ดูเดิลข่าว + ดูเดิลแมว (ลายเส้น)
  L.doodles = [
    { k: 'bubble', s: 8, a: 0.22, c: CREAM, spots: [[0.97, 0.36], [0.04, 0.3], [0.62, 0.95]] },
    { k: 'envelope', s: 8, a: 0.2, c: ROSE, spots: [[0.07, 0.68], [0.97, 0.75], [0.4, 0.95]] },
    { k: 'bell', s: 7, a: 0.2, c: BUTTER, spots: [[0.97, 0.08], [0.05, 0.08], [0.88, 0.95]] },
    { k: 'ears', s: 7, a: 0.18, c: CREAM, spots: [[0.26, 0.06], [0.04, 0.5], [0.72, 0.95]] },
  ];
  // รอยเท้าเดินเป็นคู่ ๆ (สามกลุ่ม)
  L.paws = [
    [[0.08, 0.97, -0.5], [0.12, 0.93, -0.35]],
    [[0.92, 0.96, -2.6], [0.95, 0.92, -2.8]],
    [[0.03, 0.5, -1.4], [0.05, 0.45, -1.2]],
  ];
  // จุดแจ้งเตือนเต้นเบา ๆ
  L.dots = [
    { x: 0.11, y: 0.11, c: ROSE, ph: 0 }, { x: 0.96, y: 0.55, c: MINT, ph: 1.6 },
    { x: 0.5, y: 0.97, c: BUTTER, ph: 3.1 }, { x: 0.03, y: 0.75, c: CYAN, ph: 4.4 },
  ];
  // ทางข่าวไหล: เส้นจุดไข่ปลาจากมุมล่างซ้ายโค้งไปหากรอบบทความ (จุดที่ลอดหลังของจริงไม่วาด)
  L.flow = [{ x: 0.02, y: 0.88 }, { x: 0.18, y: 0.99 }, { x: 0.32, y: 0.98 }, { x: 0.42, y: 0.86 }];
  L.flowDots = 30;
  // ประกาย
  L.sparkles = Array.from({ length: 6 }, (_, i) => ({
    x: [0.05, 0.25, 0.96, 0.98, 0.7, 0.03][i] + (rand() - 0.5) * 0.02,
    y: [0.26, 0.04, 0.28, 0.68, 0.04, 0.88][i] + (rand() - 0.5) * 0.02,
    r: 2.6 + rand() * 2.4,
    ph: rand() * TAU,
    sp: 0.45 + rand() * 0.45,
    c: [CREAM, BUTTER, ROSE, CREAM, MINT, CREAM][i],
  }));
  // ละอองกระดาษจิ๋วลอยขึ้นช้า ๆ (สี่เหลี่ยมเล็ก ๆ หมุนช้า)
  L.motes = Array.from({ length: 10 }, (_, i) => ({
    x: rand(),
    y: rand(),
    v: 0.004 + rand() * 0.006,
    sw: rand() * TAU,
    r: 1.2 + rand() * 1.2,
    c: [CREAM, ROSE, LAVENDER, MINT, BUTTER][i % 5],
  }));
  return L;
}

// ─────────────────────────────────────────────────────────────
// ชั้นของฉาก
// ─────────────────────────────────────────────────────────────

/** ชั้นนิ่ง — บนลาเวนเดอร์ กลางม่วง ล่างพลัม + วงกลมจางไกล ๆ + ขอบพลัม (ไม่ขาว — ให้กรอบครีมเด่น) */
export function drawNewsBackground(ctx, w, h, L) {
  const R = Math.max(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#9D6DDA');
  g.addColorStop(0.5, '#8253C4');
  g.addColorStop(1, '#5C3197');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = `rgba(${LAVENDER},0.08)`;
  ctx.lineWidth = 1.2;
  for (const c of L.halos) {
    ctx.beginPath();
    ctx.arc(c.x * w, c.y * h, c.r * R, 0, TAU);
    ctx.stroke();
  }
  drawSoftCloud(ctx, w * 0.05, h * 1.04, w * 0.28, 0.14, LAVENDER);
  drawSoftCloud(ctx, w * 0.95, h * 1.05, w * 0.26, 0.12, ROSE);
  const v = ctx.createRadialGradient(w * 0.6, h * 0.5, R * 0.3, w * 0.6, h * 0.5, R * 0.8);
  v.addColorStop(0, `rgba(${PLUM},0)`);
  v.addColorStop(1, `rgba(${PLUM},0.36)`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** โน้ตปักหมุด หมุด ดูเดิล รอยเท้า — ชิ้นที่ไม่มีที่ลงไม่วาด */
export function drawNewsBoardAtmosphere(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const [i, n] of L.notes.entries()) {
    const at = M.noteAt[i];
    if (!at) continue;
    const bob = Math.sin(t * 0.35 + i * 1.9) * 2 * u;
    drawPinnedNote(ctx, at[0] * w, at[1] * h + bob, n.w * u, n.h * u, n.rot + Math.sin(t * 0.25 + i) * 0.03, n.paper, n.pin, n.a);
  }
  for (const [i, p] of L.pins.entries()) {
    const at = M.pinAt[i];
    if (at) drawNewsPin(ctx, at[0] * w, at[1] * h, 2.6 * u, p.c, 0.4);
  }
  for (const [i, d] of L.doodles.entries()) {
    const at = M.doodleAt[i];
    if (!at) continue;
    if (d.k === 'ears') drawDoodle(ctx, 'ears', at[0] * w, at[1] * h, d.s * u, 0, d.a, d.c);
    else drawNewsDoodle(ctx, d.k, at[0] * w, at[1] * h, d.s * u, d.a, d.c);
  }
  for (const [g, group] of L.paws.entries()) {
    if (!M.pawOk[g]) continue;
    for (const [x, y, rot] of group) drawPawPrint(ctx, x * w, y * h, 3.8 * u, rot, 0.15, CREAM);
  }
}

/** จุดแจ้งเตือนเต้นเบามาก (ขยาย/จางช้า ๆ ไม่กะพริบ) */
export function drawNotificationDots(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const [i, d] of L.dots.entries()) {
    if (!M.dotOk[i]) continue;
    const p = 0.5 + 0.5 * Math.sin(t * 1.1 + d.ph);
    drawMagicGlow(ctx, d.x * w, d.y * h, 7 * u * (1 + p * 0.4), d.c, 0.18 * p);
    ctx.globalAlpha = 0.34 + 0.16 * p;
    ctx.fillStyle = `rgb(${d.c})`;
    ctx.beginPath();
    ctx.arc(d.x * w, d.y * h, 2.2 * u, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** ทางข่าวไหล: จุดไข่ปลาจาง ๆ + กระดาษจิ๋วหนึ่งแผ่นเดินตามทางช้า ๆ ไปหาบทความ */
export function drawNewsFlow(ctx, w, h, M, L, t) {
  const [p0, p1, p2, p3] = L.flow;
  const u = Math.min(w, h) / 400;
  const at = (k) => {
    const q = 1 - k;
    return [
      (q * q * q * p0.x + 3 * q * q * k * p1.x + 3 * q * k * k * p2.x + k * k * k * p3.x) * w,
      (q * q * q * p0.y + 3 * q * q * k * p1.y + 3 * q * k * k * p2.y + k * k * k * p3.y) * h,
    ];
  };
  ctx.fillStyle = `rgb(${CREAM})`;
  for (let i = 0; i <= L.flowDots; i++) {
    const k = i / L.flowDots;
    const [x, y] = at(k);
    if (blocked(M, x, y, 3)) continue;
    ctx.globalAlpha = 0.16 * (1 - k * 0.4);
    ctx.beginPath();
    ctx.arc(x, y, 1.1 * u, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // กระดาษจิ๋วเดินทาง: รอบละ ~14 วินาที จางเข้า-ออกที่ปลายทาง
  const k = (t / 14) % 1;
  const [x, y] = at(k);
  if (!blocked(M, x, y, 5 * u)) {
    const a = 0.32 * Math.min(1, k * 6) * Math.min(1, (1 - k) * 4);
    ctx.save();
    ctx.translate(x, y - 3 * u);
    ctx.rotate(Math.sin(t * 1.4) * 0.25);
    ctx.globalAlpha = a;
    ctx.fillStyle = `rgb(${CREAM})`;
    ctx.fillRect(-3 * u, -2.2 * u, 6 * u, 4.4 * u);
    ctx.restore();
  }
}

/** ประกายกะพริบช้า ๆ */
export function drawNewsSparkles(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const [i, s] of L.sparkles.entries()) {
    if (!M.sparkOk[i]) continue;
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    drawSparkle(ctx, s.x * w, s.y * h, s.r * u * (0.8 + tw * 0.3), 0.12 + tw * 0.34, s.c);
  }
}

/** ละอองกระดาษจิ๋วลอยขึ้นช้า ๆ — ผ่านหลังของจริง = ไม่วาดเฟรมนั้น */
export function drawNewsParticles(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const m of L.motes) {
    const y = 1.05 - ((m.y + t * m.v) % 1.1);
    const x = m.x + Math.sin(t * 0.4 + m.sw) * 0.01;
    if (blocked(M, x * w, y * h, 5)) continue;
    const a = 0.28 * Math.min(1, (1.05 - y) * 6) * Math.min(1, y * 4);
    if (a <= 0.02) continue;
    ctx.save();
    ctx.translate(x * w, y * h);
    ctx.rotate(t * 0.3 + m.sw);
    ctx.globalAlpha = a;
    ctx.fillStyle = `rgb(${m.c})`;
    ctx.fillRect(-m.r * u, -m.r * u * 0.7, m.r * u * 2, m.r * u * 1.4);
    ctx.restore();
  }
}

/** จุดนี้ (วงรัศมี r) ทับโซนห้ามวาดไหม */
function blocked(M, x, y, r) {
  for (const z of M.zones) {
    if (x + r > z.x && x - r < z.x + z.w && y + r > z.y && y - r < z.y + z.h) return true;
  }
  return false;
}

/**
 * พื้นหลังบอร์ดข่าวของหน้าข่าวสาร
 * @param canvas   ผ้าใบลูกคนแรกของการ์ดใหญ่
 * @param isActive แผงเปิดอยู่ไหม
 * @param pop      การ์ดใหญ่ (.pop) — วัดหัวเรื่อง รายการข่าว กรอบบทความ ปุ่มปิด
 */
export function makeNewsBg(canvas, isActive, pop) {
  const L = layout();
  const M = {
    w: 0, h: 0, at: -Infinity, zones: [],
    noteAt: L.notes.map(() => null), pinAt: L.pins.map(() => null), doodleAt: L.doodles.map(() => null),
    pawOk: L.paws.map(() => false), dotOk: L.dots.map(() => false), sparkOk: L.sparkles.map(() => false),
    viewEl: null, pickEl: null,
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
      && !taken.some(([tx, ty]) => Math.hypot((tx - x) * w, (ty - y) * h) < r * 2.4)) || null;
    L.notes.forEach((n, i) => { M.noteAt[i] = pick(n.spots, Math.max(n.w, n.h) * u * 0.8); if (M.noteAt[i]) taken.push(M.noteAt[i]); });
    L.doodles.forEach((d, i) => { M.doodleAt[i] = pick(d.spots, d.s * u * 1.5); if (M.doodleAt[i]) taken.push(M.doodleAt[i]); });
    L.pins.forEach((p, i) => { M.pinAt[i] = pick(p.spots, 6 * u); if (M.pinAt[i]) taken.push(M.pinAt[i]); });
    L.paws.forEach((g, i) => {
      M.pawOk[i] = g.every(([x, y]) => !blocked(M, x * w, y * h, 6 * u)
        && !taken.some(([tx, ty]) => Math.hypot((tx - x) * w, (ty - y) * h) < 18 * u));
    });
    L.dots.forEach((d, i) => { M.dotOk[i] = !blocked(M, d.x * w, d.y * h, 8 * u); });
    L.sparkles.forEach((s, i) => { M.sparkOk[i] = !blocked(M, s.x * w, s.y * h, s.r * u * 1.5); });
    M.viewEl = pop.querySelector('.news-view');
    M.pickEl = pop.querySelector('.news-item.on');
  }

  // ก้อนผลลัพธ์ของ trackRect — ใช้ซ้ำทุกเฟรม
  const viewBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const pickBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const track = (el, w, out) => trackRect(canvas, pop, el, w, out);

  function live(ctx, w, h, _L, t) {
    // เลือกข่าวอื่น = รายการสร้างใหม่ทั้งชุด → วัดใหม่ทันที
    const stale = M.pickEl && !M.pickEl.isConnected;
    if (stale || t - M.at > REMEASURE_S || t < M.at || w !== M.w || h !== M.h) {
      measure(w, h);
      M.at = t;
    }
    const b = 0.5 + 0.5 * Math.sin(t * 0.4);
    const R = Math.max(w, h);
    // แสงนวลมุมบน (ลาเวนเดอร์) / ล่างซ้าย (พีช)
    drawMagicGlow(ctx, w * 0.45, 0, R * 0.36, LAVENDER, 0.18 + b * 0.04);
    drawMagicGlow(ctx, 0, h, R * 0.3, PEACH, 0.14 + (1 - b) * 0.04);
    // แสงหลังกรอบบทความ: ลาเวนเดอร์ + ชมพู + ครีมอุ่น — กรอบครีมลอยเด่นจากพื้นม่วง (จางเข้าพร้อมเนื้อหา)
    const vb = track(M.viewEl, w, viewBox);
    if (vb) {
      const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2, r = Math.max(vb.w, vb.h) * 0.72;
      drawMagicGlow(ctx, cx, cy, r, LAVENDER, (0.2 + b * 0.03) * vb.a);
      drawMagicGlow(ctx, cx, cy + vb.h * 0.1, r * 0.8, ROSE, 0.12 * vb.a);
      drawMagicGlow(ctx, cx, cy, r * 0.6, CREAM, 0.08 * vb.a);
    }
    // แสงอุ่นจาง ๆ หลังข่าวที่เลือก (นิ่ง ไม่กะพริบ)
    const pb = track(M.pickEl, w, pickBox);
    if (pb) drawMagicGlow(ctx, pb.x + pb.w / 2, pb.y + pb.h / 2, pb.w * 0.62, BUTTER, 0.16 * pb.a);

    drawNewsFlow(ctx, w, h, M, L, t);
    drawNewsBoardAtmosphere(ctx, w, h, M, L, t);
    drawNotificationDots(ctx, w, h, M, L, t);
    drawNewsSparkles(ctx, w, h, M, L, t);
    drawNewsParticles(ctx, w, h, M, L, t);
  }

  const bg = makeCanvasBg(canvas, isActive, { layout: () => L, still: drawNewsBackground, live });
  // แตะเลือกข่าว = แสงย้ายตามทันที
  pop.querySelector('.news-list')?.addEventListener('click', () => { M.at = -Infinity; }, true);
  if (import.meta.env.DEV) window.__newsBgM = M;   // สคริปต์ทดสอบอ่านผลการวัดหน้า
  return { kick: () => { M.at = -Infinity; bg.kick(); } };
}
