// src/render/dailybg.js
//
// ══ พื้นหลัง "เช้าวันใหม่ที่น้องแมวรออยู่" ของหน้าเช็คอินรายวัน ═══════════════
//
// วาดด้วย Canvas 2D ล้วน ไม่มีไฟล์ภาพ — ตัวคุมผ้าใบชุดเดียวกับหน้าอื่น (makeCanvasBg)
// ใช้กับแผง #dailyPanel — main.js เป็นคนปลุก
//
// ── ต่างจากหน้าอื่นยังไง ──
//   หน้านี้ = กิจวัตรอุ่น ๆ ทุกวัน: "วันนี้ก็มาเจอกันอีกแล้วนะ" — นุ่มและสว่างกว่าหน้ารางวัลเลเวลนิดหนึ่ง
//   แสงเช้านวล ๆ ด้านบนกลาง (ไม่ใช่ดวงอาทิตย์) · ลำแสงเช้าโค้งจาง ๆ · เมฆนุ่มลอยช้ามาก
//   ดาวคืนก่อนที่กำลังจางด้านบน + จันทร์เสี้ยวจิ๋ว = กลางคืน → เช้า → วันใหม่
//   แสงอุ่นหลังตัวน้องกับกระดานรางวัล · แสงเน้นช่องของวันนี้ · แสงอุ่นจาง ๆ หลังรางวัลวันสุดท้าย
//   รอยเท้าแมวมารอ · หัวใจ/ปลาจิ๋ว · ละอองลอยขึ้นช้า ๆ
//
// ── จังหวะเปิดหน้า ── พื้นค่อย ๆ สว่างขึ้น: 0.2 วิ แสงเช้าเริ่ม → 0.4 วิ ประกายโผล่ → 0.6 วิ สว่างเต็ม
//
// ── หลักของภาพ ──
//   ตัวน้อง > ช่องวันนี้ > ช่องอื่น > คำทัก > หัวเรื่อง > พื้นหลัง
//   กระดานรางวัลทึบอยู่แล้ว พื้นหลังโผล่รอบกระดาน — แสงที่เกาะของจริงจึงเป็นแสงรั่วรอบขอบ
//   ไม่มีอะไรไปอยู่หลังหัวเรื่อง คำทัก กระดาน หรือปุ่ม — วัดโซนห้ามวาดจากหน้าจริง (trackRect/layoutRect)

import { makeCanvasBg, drawPawPrint, drawHeart } from './dreambg.js';
import { drawMagicGlow, drawSparkle, drawSoftCloud } from './skillbg.js';
import { layoutRect, trackRect } from './event-bg.js';
import { drawDoodle } from './creativebg.js';
import { drawCrescent } from './settingsbg.js';

const TAU = Math.PI * 2;

const PLUM = '54,20,94';
const LAVENDER = '206,178,248';
const ROSE = '247,199,232';
const PEACH = '241,180,177';
const CREAM = '255,246,232';
const BUTTER = '254,224,175';
const CYAN = '170,230,240';
const MINT = '176,240,226';

const REMEASURE_S = 0.5;
const KEEP_OUT = ['.dl-head', '.dl-lead', '.dl-board', '.form-msg', '.backbtn'];

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function layout() {
  const rand = seeded(20261017);
  const L = {};
  L.clouds = [
    { x: 0.12, y: 0.05, w: 0.24, a: 0.16, c: ROSE, v: 0.003 },
    { x: 0.8, y: 0.03, w: 0.26, a: 0.14, c: CREAM, v: -0.0025 },
    { x: 0.05, y: 1.02, w: 0.3, a: 0.16, c: LAVENDER, v: 0.002 },
    { x: 0.95, y: 1.03, w: 0.28, a: 0.14, c: PEACH, v: -0.002 },
  ];
  // ลำแสงเช้าโค้ง ๆ แผ่ลงจากด้านบนกลาง
  L.rays = [-0.55, -0.2, 0.2, 0.55].map((a, i) => ({ a, wd: 0.06 + (i % 2) * 0.03, ph: i * 1.3 }));
  // ดาวคืนก่อนที่กำลังจาง (แถบบน) + จันทร์เสี้ยว
  L.stars = Array.from({ length: 5 }, (_, i) => ({
    x: [0.08, 0.22, 0.7, 0.88, 0.95][i], y: [0.1, 0.04, 0.05, 0.12, 0.3][i], r: 2 + rand() * 1.8, ph: rand() * TAU,
  }));
  L.moon = { r: 6, spots: [[0.06, 0.26], [0.93, 0.08], [0.3, 0.06]] };
  L.motifs = [
    { k: 'heart', s: 4, a: 0.26, c: ROSE, spots: [[0.95, 0.5], [0.05, 0.6], [0.6, 0.05]] },
    { k: 'fish', s: 6, a: 0.18, c: CYAN, spots: [[0.05, 0.78], [0.95, 0.72], [0.4, 0.95]] },
    { k: 'ears', s: 6, a: 0.18, c: CREAM, spots: [[0.95, 0.88], [0.05, 0.45], [0.75, 0.95]] },
  ];
  // รอยเท้าแมวเดินมารอ (สองกลุ่ม)
  L.paws = [
    [[0.03, 0.97, -0.5], [0.06, 0.92, -0.35], [0.03, 0.87, -0.5]],
    [[0.97, 0.4, 2.7], [0.95, 0.46, 2.85]],
  ];
  L.sparkles = Array.from({ length: 4 }, (_, i) => ({
    x: [0.04, 0.96, 0.15, 0.85][i], y: [0.4, 0.6, 0.95, 0.94][i], r: 3 + rand() * 2.5, ph: rand() * TAU, sp: 0.5 + rand() * 0.4,
    c: [BUTTER, CREAM, ROSE, BUTTER][i],
  }));
  L.motes = Array.from({ length: 10 }, (_, i) => ({
    x: rand(), y: rand(), v: 0.005 + rand() * 0.006, sw: rand() * TAU, r: 0.9 + rand() * 1.2,
    c: [CREAM, BUTTER, ROSE, LAVENDER, MINT][i % 5],
  }));
  return L;
}

/** ชั้นนิ่ง — บนลาเวนเดอร์ กลางม่วงสว่าง ล่างพลัม ขอบเข้มนิด ๆ */
export function drawDailyCheckinBackground(ctx, w, h) {
  const R = Math.max(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#9766D4');
  g.addColorStop(0.5, '#8C5ACB');
  g.addColorStop(1, '#5A3196');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const v = ctx.createRadialGradient(w / 2, h * 0.45, R * 0.3, w / 2, h * 0.45, R * 0.8);
  v.addColorStop(0, `rgba(${PLUM},0)`);
  v.addColorStop(1, `rgba(${PLUM},0.32)`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** แสงเช้านวล ๆ ด้านบนกลาง + ลำแสงโค้งจาง ๆ — k = ความสว่างตามจังหวะเปิด */
export function drawDailyMorningGlow(ctx, w, h, L, t, k) {
  const R = Math.max(w, h);
  const b = 0.5 + 0.5 * Math.sin(t * 0.35);
  const sx = w / 2, sy = -h * 0.08;
  drawMagicGlow(ctx, sx, sy, R * 0.55 * (0.96 + b * 0.05), BUTTER, 0.1 * k);
  drawMagicGlow(ctx, sx, sy, R * 0.38, ROSE, 0.1 * k);
  for (const r of L.rays) {
    const br = 0.7 + 0.3 * Math.sin(t * 0.25 + r.ph);
    const len = R * 0.75;
    const a0 = Math.PI / 2 + r.a;
    const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(a0) * len, sy + Math.sin(a0) * len);
    g.addColorStop(0, `rgba(${CREAM},${0.022 * k * br})`);
    g.addColorStop(1, `rgba(${CREAM},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + Math.cos(a0 - r.wd) * len * 0.5, sy + Math.sin(a0 - r.wd) * len * 0.5 + 10,
      sx + Math.cos(a0 - r.wd) * len, sy + Math.sin(a0 - r.wd) * len);
    ctx.lineTo(sx + Math.cos(a0 + r.wd) * len, sy + Math.sin(a0 + r.wd) * len);
    ctx.closePath();
    ctx.fill();
  }
}

function blocked(M, x, y, r) {
  for (const z of M.zones) if (x + r > z.x && x - r < z.x + z.w && y + r > z.y && y - r < z.y + z.h) return true;
  return false;
}

/**
 * พื้นหลังเช้าวันใหม่ของหน้าเช็คอินรายวัน
 * @param canvas   ผ้าใบลูกคนแรกของการ์ดใหญ่
 * @param isActive แผงเปิดอยู่ไหม
 * @param pop      การ์ดใหญ่ (.pop.daily-pop)
 */
export function makeDailyBg(canvas, isActive, pop) {
  const L = layout();
  const M = {
    w: 0, h: 0, at: -Infinity, zones: [], moonAt: null,
    starOk: L.stars.map(() => false), motifAt: L.motifs.map(() => null), pawOk: L.paws.map(() => false),
    sparkOk: L.sparkles.map(() => false), boardEl: null, catEl: null, todayEl: null, bigEl: null,
  };
  let openAt = performance.now();
  let wasActive = false;

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
      && !taken.some(([tx, ty]) => Math.hypot((tx - x) * w, (ty - y) * h) < 24 * u)) || null;
    M.moonAt = pick(L.moon.spots, L.moon.r * u * 2);
    if (M.moonAt) taken.push(M.moonAt);
    L.motifs.forEach((m, i) => { M.motifAt[i] = pick(m.spots, m.s * u * 1.5); if (M.motifAt[i]) taken.push(M.motifAt[i]); });
    L.stars.forEach((s, i) => { M.starOk[i] = !blocked(M, s.x * w, s.y * h, 6); });
    L.paws.forEach((g, i) => { M.pawOk[i] = g.every(([x, y]) => !blocked(M, x * w, y * h, 6 * u)); });
    L.sparkles.forEach((s, i) => { M.sparkOk[i] = !blocked(M, s.x * w, s.y * h, s.r * u * 1.5); });
    M.boardEl = pop.querySelector('.dl-board');
    M.catEl = pop.querySelector('.dl-cat');
    M.todayEl = pop.querySelector('.dl-card.today');
    M.bigEl = pop.querySelector('.dl-card.big');
  }

  const boardBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const catBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const todayBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const bigBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const track = (el, w, out) => trackRect(canvas, pop, el, w, out);

  function live(ctx, w, h, _L, t) {
    const stale = (M.todayEl && !M.todayEl.isConnected) || (M.bigEl && !M.bigEl.isConnected);
    if (stale || t - M.at > REMEASURE_S || t < M.at || w !== M.w || h !== M.h) {
      measure(w, h);
      M.at = t;
    }
    const u = Math.min(w, h) / 400;
    // ── จังหวะเปิด: พื้นสว่างเต็มตั้งแต่เฟรมแรก (ไม่ไล่สว่างวาบ) มีแค่ประกายที่ค่อย ๆ โผล่ ──
    const since = (performance.now() - openAt) / 1000;
    const kGlow = 1;
    const kSpark = Math.min(1, Math.max(0, (since - 0.4) / 0.4));

    drawDailyMorningGlow(ctx, w, h, L, t, kGlow);
    // เมฆนุ่มลอยช้ามาก
    for (const c of L.clouds) {
      const x = ((((c.x + c.v * t) % 1.3) + 1.3) % 1.3) - 0.15;
      drawSoftCloud(ctx, x * w, c.y * h, c.w * w, c.a * kGlow, c.c);
    }
    // ดาวคืนก่อนที่กำลังจาง + จันทร์เสี้ยวจิ๋ว (กลางคืน → เช้า)
    L.stars.forEach((s, i) => {
      if (!M.starOk[i]) return;
      drawSparkle(ctx, s.x * w, s.y * h, s.r * u, (0.12 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.4 + s.ph))) * (1.3 - kGlow * 0.5), CREAM);
    });
    if (M.moonAt) drawCrescent(ctx, M.moonAt[0] * w, M.moonAt[1] * h, L.moon.r * u, 0.28 * (1.2 - kGlow * 0.5), CREAM);

    // แสงอุ่นรอบกระดานรางวัล (ไล่จากวันแรกไปวันสุดท้าย: ลาเวนเดอร์ → อุ่นขึ้นทางขวา)
    const bb = track(M.boardEl, w, boardBox);
    if (bb && bb.w) {
      drawMagicGlow(ctx, bb.x + bb.w * 0.3, bb.y + bb.h / 2, bb.w * 0.45, LAVENDER, 0.1 * bb.a * kGlow);
      drawMagicGlow(ctx, bb.x + bb.w * 0.75, bb.y + bb.h / 2, bb.w * 0.4, PEACH, 0.07 * bb.a * kGlow);
    }
    // แสงนวลหลังตัวน้อง (รั่วออกรอบขอบกระดานฝั่งตัวน้อง)
    const cb = track(M.catEl, w, catBox);
    if (cb && cb.w) {
      const br = 0.9 + 0.1 * Math.sin(t * 0.6);
      drawMagicGlow(ctx, cb.x + cb.w / 2, cb.y + cb.h / 2, Math.max(cb.w, cb.h) * 0.9 * br, CREAM, 0.14 * cb.a * kGlow);
    }
    // ช่องของวันนี้ / รางวัลวันสุดท้าย — แสงจาง ๆ รั่วจากหลังกระดานตรงแนวช่องนั้น
    const tb = track(M.todayEl, w, todayBox);
    if (tb && tb.w) drawMagicGlow(ctx, tb.x + tb.w / 2, tb.y + tb.h / 2, Math.max(tb.w, tb.h) * 1.1, BUTTER, 0.16 * tb.a * kGlow);
    const gb = track(M.bigEl, w, bigBox);
    if (gb && gb.w) drawMagicGlow(ctx, gb.x + gb.w / 2, gb.y + gb.h / 2, Math.max(gb.w, gb.h) * 0.9, BUTTER, 0.12 * gb.a * kGlow);

    // รอยเท้า ลวดลายแมว ประกาย
    L.paws.forEach((g, i) => {
      if (!M.pawOk[i]) return;
      g.forEach(([x, y, rot], j) => drawPawPrint(ctx, x * w, y * h, 3.8 * u, rot, (0.2 - j * 0.03) * kSpark, j % 2 ? ROSE : CREAM));
    });
    L.motifs.forEach((m, i) => {
      const at = M.motifAt[i];
      if (!at) return;
      if (m.k === 'heart') drawHeart(ctx, at[0] * w, at[1] * h, m.s * u, m.a * kSpark, m.c);
      else drawDoodle(ctx, m.k, at[0] * w, at[1] * h, m.s * u, 0, m.a * kSpark, m.c);
    });
    L.sparkles.forEach((s, i) => {
      if (!M.sparkOk[i]) return;
      const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
      drawSparkle(ctx, s.x * w, s.y * h, s.r * u * (0.8 + tw * 0.3), (0.14 + tw * 0.34) * kSpark, s.c);
    });
    // ละอองลอยขึ้นช้า ๆ
    for (const m of L.motes) {
      const y = 1.05 - ((m.y + t * m.v) % 1.1);
      const x = m.x + Math.sin(t * 0.45 + m.sw) * 0.01;
      if (blocked(M, x * w, y * h, 4)) continue;
      const a = 0.28 * Math.min(1, (1.05 - y) * 6) * Math.min(1, y * 4) * kSpark;
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgb(${m.c})`;
      ctx.beginPath();
      ctx.arc(x * w, y * h, m.r * u, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const bg = makeCanvasBg(canvas, isActive, { layout: () => L, still: drawDailyCheckinBackground, live });
  pop.addEventListener('click', () => { M.at = -Infinity; }, true);
  if (import.meta.env.DEV) window.__dailyBgM = M;
  return {
    kick() {
      const on = isActive();
      if (on && !wasActive) openAt = performance.now();
      wasActive = on;
      M.at = -Infinity;
      bg.kick();
    },
  };
}
