// src/render/event-bg.js
// ─────────────────────────────────────────────────────────────
// พื้นหลังหน้ากิจกรรม — "บอร์ดกิจกรรมพาสเทล" วาดสดด้วย Canvas 2D (ไม่มีภาพสำเร็จรูป)
//
// ── ความรู้สึกที่ต้องการ ──
// "วันนี้มีภารกิจสนุก ๆ ให้น้องแมวทำ และมีรางวัลรออยู่!" — คึกคักแบบงานฉลองเล็ก ๆ
// ต่างจากหน้าอื่น: คลังน้อง = ห้องนุ่มฟู / สกิล = พลังเวท / กาช่า = สมบัติ / หน้านี้ = ภารกิจ ความคืบหน้า รางวัล
//
// ── กฎที่ห้ามลืม ──
// พื้นหลังคือชั้นที่อ่อนที่สุดในหน้า การ์ดภารกิจต้องเด่นที่สุดเสมอ
// ของตกแต่งทุกชิ้นอยู่ "ขอบจอ / ช่องว่างระหว่างการ์ด / มุมล่าง / แถบหัวที่ว่าง" เท่านั้น
// ไม่มีอะไรวิ่งผ่านหลังข้อความ หลอดความคืบหน้า ตัวเลขรางวัล หรือปุ่ม (ตำแหน่งวัดจากหน้าจริงทุกครั้ง)
// ว่างตรงไหนก็ปล่อยว่าง — หรูเพราะยั้งมือ ไม่ใช่เพราะเติมจนเต็ม
//
// ── ชั้นที่วาด (ล่าง → บน) ──
//   1 drawEventBackground  ไล่สีลาเวนเดอร์ กลางสว่าง ขอบเข้ม
//   2 drawEventGlow        แสงนุ่มสี่จุด หายใจช้า ๆ (หลังหัวเรื่อง มุมล่างซ้าย/ขวา มุมขวาบน)
//   3 drawEventCloud       หมอกเมฆบาง ๆ มุมล่าง
//   4 drawEventPath        ทางจุดไข่ปลาจากมุมล่างขึ้นไปหาดาว = "ภารกิจมีทางไปต่อ"
//   5 drawEventMotifs      รอยเท้า ปลา หัวใจ กล่องของขวัญ หน้าแมว ตัวเล็กจาง ๆ ตามมุม
//   6 ไฮไลต์การ์ด          ข้อที่รับรางวัลได้ = แสงมินต์อุ่น ๆ รอบการ์ด / ข้อที่รับแล้ว = ดาวทองจิ๋ว
//   7 drawEventRibbon      โบเล็ก + ดาวสองดวงข้างหัวเรื่อง
//   8 drawEventSparkles    ประกายกะพริบช้า ๆ
//   9 drawEventConfetti    กระดาษสีชิ้นจิ๋วร่วงช้า ๆ ตามขอบ
//  10 drawEventParticles   จุดแสงลอยขึ้นช้า ๆ
// ─────────────────────────────────────────────────────────────
import { quality } from '../graphics.js';

const TAU = Math.PI * 2;
const COLORS = {
  lavender: '#E3CCFF',
  violet: '#B49CFF',
  pink: '#FFB9E1',
  cream: '#FFF3E2',
  yellow: '#FFE48A',
  mint: '#9FF5E4',
  sky: '#A8DCFF',
};
const CONFETTI_COLORS = [COLORS.pink, COLORS.mint, COLORS.yellow, COLORS.lavender, COLORS.sky];

/** สุ่มแบบมีเมล็ด — ตำแหน่งของตกแต่งคงที่ทุกครั้งที่เปิดหน้า ไม่กระโดดไปมา */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────
// ชิ้นส่วนวาด (ใช้ซ้ำได้ — ทุกตัวรับพิกัดเป็นพิกเซล CSS)
// ─────────────────────────────────────────────────────────────

/** 1 · พื้น: แสงลาเวนเดอร์กลางจอ + ขอบเข้มลงนิดหน่อยให้มีมิติ (ทับบนพื้นม่วงเดิมของการ์ดใหญ่) */
export function drawEventBackground(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, Math.max(w, h) * 0.65);
  g.addColorStop(0, 'rgba(214,180,255,.16)');
  g.addColorStop(0.55, 'rgba(170,120,230,.06)');
  g.addColorStop(1, 'rgba(40,14,66,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.78);
  v.addColorStop(0, 'rgba(26,8,44,0)');
  v.addColorStop(1, 'rgba(26,8,44,.32)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** 2 · แสงนุ่มวงกลม — a คือความเข้มสูงสุด */
export function drawEventGlow(ctx, x, y, r, color, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** 3 · ก้อนเมฆบาง ๆ (วงกลมซ้อนกันห้าลูก) — s = ขนาด */
export function drawEventCloud(ctx, x, y, s, a, tint = COLORS.lavender) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = tint;
  ctx.beginPath();
  for (const [dx, dy, r] of [[-1.1, 0.15, 0.55], [-0.45, -0.25, 0.75], [0.35, -0.35, 0.85], [1.05, 0.05, 0.6], [0, 0.3, 0.7]]) {
    ctx.moveTo(x + dx * s + r * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

/** จุดบนเส้นโค้งเบซิเยร์สามจุดควบคุม (หาตำแหน่งจุดไข่ปลา) */
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/**
 * 4 · ทางภารกิจ: จุดไข่ปลาไล่จากล่างขึ้นบน มีจุดแวะ (วงแหวน) แล้วจบที่ดาว
 * pts = [p0, p1, p2, p3] โค้งเบซิเยร์ / stops = ตำแหน่งจุดแวะบนเส้น (0-1)
 */
export function drawEventPath(ctx, pts, a, t, stops = [0.3, 0.62]) {
  const [p0, p1, p2, p3] = pts;
  ctx.save();
  ctx.fillStyle = COLORS.cream;
  const n = 34;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const p = bez(p0, p1, p2, p3, k);
    // จุดค่อย ๆ ชัดขึ้นเมื่อเข้าใกล้ดาวปลายทาง = "เดินหน้าไปหารางวัล"
    ctx.globalAlpha = a * (0.35 + 0.65 * k);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.1 + k * 0.5, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = COLORS.lavender;
  ctx.lineWidth = 1.4;
  for (const s of stops) {
    const p = bez(p0, p1, p2, p3, s);
    ctx.globalAlpha = a * 1.3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.6, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  const tw = 0.75 + 0.25 * Math.sin(t * 1.4);
  drawEventStar(ctx, p3.x, p3.y, 6.5, Math.min(1, a * 2.6) * tw, COLORS.yellow);
}

/** ดาวห้าแฉกมน ๆ */
export function drawEventStar(ctx, x, y, r, a, color = COLORS.yellow, rot = -Math.PI / 2) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.translate(x, y);
  ctx.rotate(rot + Math.PI / 2);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.48 : r;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
  }
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.25;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** ประกายสี่แฉก (เส้นโค้งเว้า) */
export function drawEventSparkle(ctx, x, y, r, a, color = COLORS.cream) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

/** รอยเท้าแมว — ฝ่าเท้ากลม + นิ้วสามนิ้ว */
export function drawEventPaw(ctx, x, y, s, rot, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = COLORS.cream;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.ellipse(0, s * 0.35, s * 0.55, s * 0.45, 0, 0, TAU);
  for (const [dx, dy] of [[-0.55, -0.3], [0, -0.55], [0.55, -0.3]]) {
    ctx.moveTo(dx * s + s * 0.2, dy * s);
    ctx.arc(dx * s, dy * s, s * 0.2, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

/** หัวใจเล็ก */
export function drawEventHeart(ctx, x, y, s, a, color = COLORS.pink) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.translate(x, y);
  ctx.scale(s / 10, s / 10);
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(-7, -1, -5, -8, 0, -4);
  ctx.bezierCurveTo(5, -8, 7, -1, 0, 4);
  ctx.fill();
  ctx.restore();
}

/** ปลาเงา ๆ */
function drawEventFish(ctx, x, y, s, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = COLORS.sky;
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, 0, s, s * 0.55, 0, 0, TAU);
  ctx.moveTo(s * 0.8, 0);
  ctx.lineTo(s * 1.6, -s * 0.55);
  ctx.lineTo(s * 1.6, s * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** กล่องของขวัญเงา ๆ + ริบบิ้น */
function drawEventGift(ctx, x, y, s, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.fillStyle = COLORS.pink;
  ctx.beginPath();
  ctx.roundRect(-s, -s * 0.7, s * 2, s * 1.5, s * 0.25);
  ctx.fill();
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(-s * 0.16, -s * 0.7, s * 0.32, s * 1.5);
  ctx.beginPath();
  ctx.ellipse(-s * 0.4, -s * 0.85, s * 0.38, s * 0.22, -0.4, 0, TAU);
  ctx.ellipse(s * 0.4, -s * 0.85, s * 0.38, s * 0.22, 0.4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** หน้าแมวเงา ๆ (หัวกลม + หูสองข้าง) */
function drawEventCatFace(ctx, x, y, s, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = COLORS.lavender;
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, 0, s, s * 0.82, 0, 0, TAU);
  ctx.moveTo(-s * 0.9, -s * 0.2);
  ctx.lineTo(-s * 0.75, -s * 1.15);
  ctx.lineTo(-s * 0.2, -s * 0.7);
  ctx.moveTo(s * 0.9, -s * 0.2);
  ctx.lineTo(s * 0.75, -s * 1.15);
  ctx.lineTo(s * 0.2, -s * 0.7);
  ctx.fill();
  ctx.restore();
}

/** 7 · โบริบบิ้นเล็ก (ข้างหัวเรื่อง) */
export function drawEventRibbon(ctx, x, y, s, a, t) {
  const sway = Math.sin(t * 0.9) * 0.06;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.rotate(-0.18 + sway);
  ctx.fillStyle = COLORS.pink;
  ctx.beginPath();
  // ปีกโบสองข้าง
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-s * 1.2, -s * 0.9, -s * 1.3, s * 0.7, 0, 0);
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(s * 1.2, -s * 0.9, s * 1.3, s * 0.7, 0, 0);
  ctx.fill();
  // หางริบบิ้น
  ctx.beginPath();
  ctx.moveTo(-s * 0.12, 0);
  ctx.lineTo(-s * 0.55, s * 1.1);
  ctx.lineTo(-s * 0.3, s * 0.95);
  ctx.lineTo(-s * 0.18, s * 1.15);
  ctx.closePath();
  ctx.moveTo(s * 0.12, 0);
  ctx.lineTo(s * 0.55, s * 1.1);
  ctx.lineTo(s * 0.3, s * 0.95);
  ctx.lineTo(s * 0.18, s * 1.15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.cream;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** 9 · กระดาษสีชิ้นเดียว (สี่เหลี่ยมมนหมุนพลิก) */
export function drawEventConfettiPiece(ctx, c, x, y, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = c.color;
  ctx.translate(x, y);
  ctx.rotate(c.rot);
  // พลิกตัว = ย่อด้านกว้างตามเวลา เหมือนกระดาษหมุนกลางอากาศ
  ctx.scale(Math.max(0.25, Math.abs(Math.cos(c.flip))), 1);
  ctx.beginPath();
  if (c.round) ctx.arc(0, 0, c.s * 0.5, 0, TAU);
  else ctx.roundRect(-c.s * 0.5, -c.s * 0.3, c.s, c.s * 0.6, 1);
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ตัวคุมฉาก — วัดหน้าจริง วางของตามช่องว่าง เดินอนิเมชันเฉพาะตอนหน้าเปิดอยู่
// ─────────────────────────────────────────────────────────────

/**
 * ผูกพื้นหลังเข้ากับการ์ดใหญ่ของหน้ากิจกรรม
 * @param canvas ผ้าใบที่วางเป็นชั้นล่างสุดในการ์ด (CSS ยืดเต็มการ์ด)
 * @param pop    การ์ดใหญ่ (.pop) — ใช้วัดตำแหน่งหัวเรื่อง รายการ และการ์ดภารกิจ
 * คืน { start, stop } — start ตอนเปิดหน้า / ลูปหยุดเองเมื่อหน้าถูกซ่อน
 */
export function createEventBackground(canvas, pop) {
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let last = 0;
  let t = 0;
  let frame = 0;
  // พื้นที่ที่ห้ามวางของ / ช่องว่างที่วางได้ (วัดใหม่ทุก ๆ ไม่กี่เฟรม — รายการเลื่อนได้)
  let L = 0, R = 0, top = 0, bottom = 0;
  let title = null;
  let hot = [];        // การ์ดที่รับรางวัลได้ (ready) — กรอบสัมพัทธ์กับการ์ดใหญ่
  let done = [];       // การ์ดที่รับแล้ว

  // ── ของที่เคลื่อนไหว — สร้างครั้งเดียว ใช้ซ้ำตลอด ไม่สร้างใหม่ทุกเฟรม ──
  const rnd = seeded(20261005);
  const confetti = Array.from({ length: 8 }, (_, i) => ({
    side: i % 2, u: rnd(), y: rnd(), s: 4 + rnd() * 3, rot: rnd() * TAU, flip: rnd() * TAU,
    vy: 0.012 + rnd() * 0.012, vr: (rnd() - 0.5) * 0.6, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: i % 3 === 0,
  }));
  const motes = Array.from({ length: 14 }, (_, i) => ({
    side: i % 2, u: rnd(), y: rnd(), r: 0.8 + rnd() * 1.4, vy: 0.008 + rnd() * 0.01, ph: rnd() * TAU,
    color: i % 3 === 0 ? COLORS.yellow : i % 3 === 1 ? COLORS.lavender : COLORS.cream,
  }));
  const sparkles = Array.from({ length: 7 }, (_, i) => ({
    side: i % 2, u: 0.2 + rnd() * 0.6, y: 0.15 + rnd() * 0.75, r: 3 + rnd() * 3, ph: rnd() * TAU, sp: 0.5 + rnd() * 0.6,
  }));

  /** อยู่ในช่องว่างข้างไหน → พิกัด x จริง (u = 0-1 ภายในช่อง) */
  const sideX = (side, u) => (side ? w - R + u * R : u * L);

  function measure() {
    const box = pop.getBoundingClientRect();
    if (!box.width) return false;
    const list = pop.querySelector('.quest-list');
    const lb = list ? list.getBoundingClientRect() : box;
    L = Math.max(0, lb.left - box.left);
    R = Math.max(0, box.right - lb.right);
    top = Math.max(0, lb.top - box.top);
    bottom = Math.max(0, box.bottom - lb.bottom);
    const tb = pop.querySelector('.quest-title')?.getBoundingClientRect();
    title = tb ? { x: tb.left - box.left, y: tb.top - box.top, w: tb.width, h: tb.height } : null;
    hot = [];
    done = [];
    for (const row of pop.querySelectorAll('.quest-row')) {
      const r = row.getBoundingClientRect();
      // ข้อที่เลื่อนพ้นช่องรายการไปแล้วไม่ต้องเรือง
      if (r.bottom < lb.top || r.top > lb.bottom) continue;
      const rect = { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height, clipTop: lb.top - box.top, clipBot: lb.bottom - box.top };
      if (row.classList.contains('ready')) hot.push(rect);
      else if (row.classList.contains('done')) done.push(rect);
    }
    const nd = Math.min(window.devicePixelRatio || 1, quality().scale);
    if (box.width !== w || box.height !== h || nd !== dpr) {
      w = box.width;
      h = box.height;
      dpr = nd;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    return true;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const breathe = 0.85 + 0.15 * Math.sin(t * 0.7);

    // 1-2 · พื้น + แสงนุ่ม
    drawEventBackground(ctx, w, h);
    if (title) drawEventGlow(ctx, title.x + title.w / 2, title.y + title.h / 2, Math.max(120, title.w * 0.9), COLORS.lavender, 0.16 * breathe);
    drawEventGlow(ctx, w * 0.06, h * 0.96, Math.min(w, h) * 0.42, COLORS.pink, 0.13 * breathe);
    drawEventGlow(ctx, w * 0.95, h * 0.94, Math.min(w, h) * 0.4, COLORS.violet, 0.14 * (1.7 - breathe));
    drawEventGlow(ctx, w * 0.92, h * 0.12, Math.min(w, h) * 0.3, COLORS.mint, 0.07 * breathe);

    // 3 · หมอกเมฆมุมล่าง (ส่วนใหญ่อยู่นอกการ์ดภารกิจ ตัวการ์ดทึบบังส่วนที่ล้ำเข้ามาอยู่แล้ว)
    const cs = Math.min(w, h) * 0.075;
    drawEventCloud(ctx, w * 0.03, h - cs * 0.3, cs * 1.3, 0.07, COLORS.pink);
    drawEventCloud(ctx, w * 0.13, h + cs * 0.15, cs, 0.06);
    drawEventCloud(ctx, w * 0.97, h - cs * 0.2, cs * 1.25, 0.07);
    drawEventCloud(ctx, w * 0.86, h + cs * 0.25, cs * 0.9, 0.05, COLORS.pink);

    // 4 · ทางภารกิจ — เฉพาะตอนขอบข้างกว้างพอ (มือถือแนวนอนขอบแคบ ทางจะโดนการ์ดบังหมด ไม่ต้องวาด)
    if (L > 34) {
      drawEventPath(ctx, [
        { x: L * 0.55, y: h - Math.max(bottom, 18) * 0.5 },
        { x: L * 0.15, y: h * 0.72 },
        { x: L * 0.85, y: h * 0.45 },
        { x: L * 0.45, y: top + 26 },
      ], 0.2, t);
    }
    if (R > 34) {
      drawEventPath(ctx, [
        { x: w - R * 0.5, y: h - Math.max(bottom, 18) * 0.45 },
        { x: w - R * 0.9, y: h * 0.78 },
        { x: w - R * 0.15, y: h * 0.6 },
        { x: w - R * 0.55, y: h * 0.4 },
      ], 0.14, t + 2, [0.45]);
    }

    // 5 · ลวดลายแมวจิ๋ว ตามมุมและขอบ (นิ่ง ไม่ขยับ)
    if (L > 26) {
      drawEventPaw(ctx, L * 0.35, h * 0.86, 4.5, -0.5, 0.12);
      drawEventPaw(ctx, L * 0.62, h * 0.8, 4.5, -0.3, 0.1);
      drawEventFish(ctx, L * 0.45, h * 0.3, 6, 0.1);
    }
    if (R > 26) {
      drawEventHeart(ctx, w - R * 0.5, h * 0.24, 9, 0.16);
      drawEventGift(ctx, w - R * 0.5, h * 0.76, 7, 0.11);
    }
    if (bottom > 14) drawEventCatFace(ctx, w * 0.5, h - bottom * 0.5, Math.min(7, bottom * 0.3), 0.08);

    // 6 · ไฮไลต์การ์ด — แสงอุ่น ๆ "รอบ" การ์ดที่รับได้ (ตัวการ์ดทึบ แสงจึงโผล่แค่ขอบนอก ไม่ลอดหลังข้อความ)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top - 4, w, Math.max(0, h - top - bottom + 8));
    ctx.clip();
    for (const r of hot) {
      const g = 0.6 + 0.4 * Math.sin(t * 1.6);
      drawEventGlow(ctx, r.x + r.w * 0.5, r.y + r.h * 0.5, r.w * 0.55, COLORS.mint, 0.12 + 0.08 * g);
      drawEventGlow(ctx, r.x + r.w * 0.85, r.y + r.h * 0.5, r.h * 1.2, COLORS.yellow, 0.1 + 0.08 * g);
      // ประกายเล็กสองดวงนอกมุมการ์ด
      drawEventSparkle(ctx, r.x - 6, r.y + 6, 5, 0.5 * g, COLORS.yellow);
      drawEventSparkle(ctx, r.x + r.w + 6, r.y + r.h - 6, 4, 0.5 * (1 - g + 0.3), COLORS.mint);
    }
    // ข้อที่รับแล้ว — ดาวทองจิ๋วนิ่ง ๆ ข้างนอกขอบขวา (ฉลองเบา ๆ ไม่กะพริบ ไม่รบกวน)
    for (const r of done) {
      if (R < 14) break;
      drawEventStar(ctx, r.x + r.w + Math.min(10, R * 0.4), r.y + r.h * 0.35, 2.6, 0.32, COLORS.yellow);
      drawEventStar(ctx, r.x + r.w + Math.min(16, R * 0.6), r.y + r.h * 0.6, 1.8, 0.24, COLORS.yellow);
    }
    ctx.restore();

    // 7 · หัวเรื่อง: โบเล็กทางซ้าย ดาวสองดวงเหนือมุมขวา — ไม่ทับตัวหนังสือ
    if (title) {
      drawEventRibbon(ctx, title.x - 20, title.y + title.h * 0.42, 9, 0.75, t);
      const tw = (k) => 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + k));
      drawEventStar(ctx, title.x + title.w + 10, title.y + 2, 3.4, tw(0), COLORS.yellow);
      drawEventStar(ctx, title.x + title.w + 22, title.y + title.h * 0.35, 2.2, tw(2), COLORS.cream);
    }

    // 8 · ประกายกะพริบช้า ๆ ตามขอบ
    for (const s of sparkles) {
      const room = s.side ? R : L;
      if (room < 18) continue;
      const a = Math.max(0, Math.sin(t * s.sp + s.ph)) * 0.5;
      drawEventSparkle(ctx, sideX(s.side, s.u), s.y * h, s.r, a);
    }

    // 9 · กระดาษสีร่วงช้า ๆ ตามขอบ
    for (const c of confetti) {
      const room = c.side ? R : L;
      if (room < 18) continue;
      drawEventConfettiPiece(ctx, c, sideX(c.side, 0.15 + c.u * 0.7), c.y * h, 0.4);
    }

    // 10 · จุดแสงลอยขึ้นช้า ๆ
    for (const m of motes) {
      const room = m.side ? R : L;
      if (room < 14) continue;
      const x = sideX(m.side, 0.1 + m.u * 0.8) + Math.sin(t * 0.6 + m.ph) * 4;
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.14 * Math.sin(t + m.ph);
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(x, m.y * h, m.r, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  /** ขยับของหนึ่งก้าว (dt = วินาที) — ช้ามากโดยตั้งใจ */
  function step(dt) {
    t += dt;
    for (const c of confetti) {
      c.y += c.vy * dt;
      c.rot += c.vr * dt;
      c.flip += dt * 1.2;
      if (c.y > 1.05) { c.y = -0.05; c.u = (c.u + 0.37) % 1; }
    }
    for (const m of motes) {
      m.y -= m.vy * dt;
      if (m.y < -0.03) { m.y = 1.03; m.u = (m.u + 0.53) % 1; }
    }
  }

  const visible = () => !!pop.offsetParent && !pop.closest('.panel')?.classList.contains('hidden');

  function loop(now) {
    if (!visible()) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
    // 30 เฟรมต่อวินาทีพอ — ของทุกชิ้นขยับช้า วาดถี่กว่านี้ไม่ได้อะไรเพิ่มนอกจากเปลืองแบต
    if (now - last < 32) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (frame++ % 12 === 0 && !measure()) return;
    step(dt);
    draw();
  }

  function start() {
    last = 0;
    frame = 0;
    if (!measure()) {
      requestAnimationFrame(() => start());
      return;
    }
    // ผู้เล่นขอลดการเคลื่อนไหว = วาดภาพนิ่งครั้งเดียว (วาดใหม่เมื่อเลื่อนรายการ)
    if (reduce.matches) { draw(); return; }
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  // รายการเลื่อน = การ์ดที่ต้องเรืองย้ายที่ — วัดใหม่ทันที (ภาพนิ่งก็วาดใหม่ด้วย)
  pop.querySelector('.quest-list')?.addEventListener('scroll', () => {
    if (!visible()) return;
    measure();
    if (reduce.matches) draw();
  }, { passive: true });
  window.addEventListener('resize', () => { if (visible()) { measure(); if (reduce.matches) draw(); } });

  return { start, stop, refresh: () => { if (visible()) { measure(); if (reduce.matches || !raf) draw(); } } };
}
