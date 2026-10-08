// src/render/profilebg.js
//
// ══ พื้นหลัง "โชว์รูมเล็ก ๆ ของน้องแมวเรา" ของหน้าโปรไฟล์ ═════════════════
//
// วาดด้วย Canvas 2D ล้วน ไม่มีไฟล์ภาพ — ตัวคุมผ้าใบชุดเดียวกับหน้าอื่น (makeCanvasBg)
// ใช้กับแผง #profilePanel ทั้งโปรไฟล์ของเราและตอนส่องโปรไฟล์คนอื่น — main.js เป็นคนปลุก
//
// ── ต่างจากหน้าอื่นยังไง ──
//   หน้านี้ = ตัวตน ความภูมิใจ: "นี่คือน้องแมวของฉัน และนี่คือสิ่งที่เราเล่นมาด้วยกัน"
//   สปอตไลต์นุ่ม ๆ ครอบการ์ดตัวน้อง (ครีมอุ่น → ชมพูม่วง) + วงแสงรีใต้การ์ดเหมือนแท่นโชว์
//   ลำแสงสตูดิโอเฉียงจาง ๆ (ภาษาเดียวกับแถบเฉียงบนการ์ดที่มีอยู่แล้ว) · รอยเท้าเรืองเดินวน
//   หูแมว/หนวด/ปลาเป็นลวดลายจิ๋ว · ประกายความสำเร็จเล็ก ๆ (ข้างคะแนนรวม) · ละอองลอยขึ้นช้า ๆ
//
// ── ข้อจำกัดของหน้านี้ ──
//   การ์ดทึบสามใบกินพื้นที่เกือบทั้งการ์ดใหญ่ พื้นหลังโผล่แค่แถบหัวเรื่อง ขอบซ้ายขวา ช่องระหว่างการ์ด
//   และขอบล่าง — ของตกแต่งจึงอยู่ในแถบเหล่านี้เท่านั้น ที่เหลือเป็นแสงที่ "รั่ว" ออกรอบขอบการ์ด
//   ไม่มีอะไรไปอยู่หลังหัวเรื่อง ปุ่มปิด หรือการ์ด — วัดโซนห้ามวาดจากหน้าจริง
//
// ── แสงที่เกาะของจริง ── (การ์ดน้อง / คะแนนรวม / หัวเรื่อง) ใช้ trackRect ตั้งแต่ต้น
//   เลื่อนขึ้นและจางเข้าพร้อมเนื้อหาตอนเปิดหน้า ไม่มีแสงวาบมาก่อนของจริง
//
// ── ของที่ขยับไม่สร้างใหม่ทุกเฟรม ──
//   ชั้นนิ่ง: ไล่สีพื้น + ขอบพลัม
//   ทุกเฟรม: ลำแสงเฉียง 3 · สปอตไลต์+แท่น · แสงคะแนน · รอยเท้า 5 · ลวดลายแมว 3 · ประกาย 5 · ละออง 10

import { makeCanvasBg, drawPawPrint, drawHeart } from './dreambg.js';
import { drawMagicGlow, drawSparkle } from './skillbg.js';
import { layoutRect, trackRect } from './event-bg.js';
import { drawDoodle } from './creativebg.js';

const TAU = Math.PI * 2;

const PLUM = '56,22,100';
const LAVENDER = '206,178,248';
const ROSE = '247,199,232';
const CREAM = '255,246,232';
const BUTTER = '254,224,175';
const CYAN = '170,230,240';
const MINT = '176,240,226';

/** วัดหน้าใหม่ทุกกี่วินาที (ส่องโปรไฟล์คนอื่น / แก้ไข = หน้าเปลี่ยน) */
const REMEASURE_S = 0.5;

/** โซนห้ามวาด — การ์ดทั้งสามใบ หัวเรื่อง ปุ่มปิด และกล่องที่ลอยทับ */
const KEEP_OUT = ['.pf-title', '.pf-close', '.pf-card', '.pf-lookup:not(.hidden) > *'];

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function layout() {
  const rand = seeded(20261015);
  const L = {};
  // ลำแสงสตูดิโอเฉียง (จากมุมขวาบนลงซ้ายล่าง) — กว้าง จางมาก หายใจช้า ๆ
  L.bands = [
    { x: 0.62, wd: 0.12, a: 0.06, ph: 0 },
    { x: 0.8, wd: 0.07, a: 0.05, ph: 1.6 },
    { x: 0.3, wd: 0.09, a: 0.04, ph: 3.2 },
  ];
  // รอยเท้าเรืองเดินโค้งริมล่าง/ขอบ (ที่ลงสำรอง — ตัวที่ทับการ์ดไม่วาด)
  L.paws = [
    [0.03, 0.96, -0.6], [0.06, 0.9, -0.4], [0.03, 0.84, -0.6], [0.97, 0.12, 2.6], [0.96, 0.2, 2.8],
  ];
  // ลวดลายแมวจิ๋ว (หูแมว+หนวด / ปลา / หัวใจ)
  L.motifs = [
    { k: 'ears', s: 7, a: 0.2, c: CREAM, spots: [[0.08, 0.07], [0.03, 0.5], [0.3, 0.07]] },
    { k: 'fish', s: 6, a: 0.18, c: CYAN, spots: [[0.97, 0.5], [0.97, 0.75], [0.7, 0.07]] },
    { k: 'heart', s: 4, a: 0.24, c: ROSE, spots: [[0.33, 0.06], [0.03, 0.3], [0.97, 0.88]] },
  ];
  // ประกายความสำเร็จ (ริมขอบ + แถบหัว)
  L.sparkles = Array.from({ length: 5 }, (_, i) => ({
    x: [0.22, 0.72, 0.9, 0.04, 0.97][i], y: [0.05, 0.05, 0.06, 0.68, 0.35][i],
    r: 3 + rand() * 2.5, ph: rand() * TAU, sp: 0.5 + rand() * 0.4,
    c: [CREAM, BUTTER, ROSE, CREAM, BUTTER][i],
  }));
  L.motes = Array.from({ length: 10 }, (_, i) => ({
    x: rand(), y: rand(), v: 0.005 + rand() * 0.006, sw: rand() * TAU, r: 0.9 + rand() * 1.2,
    c: [CREAM, ROSE, LAVENDER, BUTTER, MINT][i % 5],
  }));
  return L;
}

/** ชั้นนิ่ง — บนลาเวนเดอร์ กลางม่วงสว่าง ล่างพลัม + ขอบพลัม */
export function drawProfileBackground(ctx, w, h) {
  const R = Math.max(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#A072DC');
  g.addColorStop(0.45, '#8A58CB');
  g.addColorStop(1, '#58308F');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const v = ctx.createRadialGradient(w * 0.4, h * 0.45, R * 0.3, w * 0.4, h * 0.45, R * 0.8);
  v.addColorStop(0, `rgba(${PLUM},0)`);
  v.addColorStop(1, `rgba(${PLUM},0.34)`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** ลำแสงสตูดิโอเฉียงจาง ๆ — แถบกว้างโปร่ง เคลื่อน/หายใจช้ามาก */
export function drawProfileLightShapes(ctx, w, h, L, t) {
  for (const b of L.bands) {
    const br = 0.7 + 0.3 * Math.sin(t * 0.22 + b.ph);
    const x = (b.x + Math.sin(t * 0.05 + b.ph) * 0.01) * w;
    const bw = b.wd * w;
    const lg = ctx.createLinearGradient(x, 0, x - h * 0.55, h);
    lg.addColorStop(0, `rgba(${CREAM},${b.a * br})`);
    lg.addColorStop(1, `rgba(${CREAM},0)`);
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + bw, 0);
    ctx.lineTo(x + bw - h * 0.55, h);
    ctx.lineTo(x - h * 0.55, h);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * สปอตไลต์ตัวน้อง — วงแสงนุ่มครอบการ์ดน้อง (ครีมอุ่นกลาง → ชมพูม่วง → โปร่ง)
 * การ์ดทึบ แสงจึงรั่วออกรอบขอบการ์ดเป็นรัศมี + วงแสงรีใต้การ์ดเหมือนแท่นโชว์
 */
export function drawProfileSpotlight(ctx, r, breathe) {
  const cx = r.x + r.w / 2, cy = r.y + r.h * 0.55;
  const R = Math.max(r.w, r.h) * 0.85;
  drawMagicGlow(ctx, cx, cy, R * (0.97 + breathe * 0.05), ROSE, 0.42 * r.a);
  drawMagicGlow(ctx, cx, cy, R * 0.75, CREAM, 0.3 * r.a);
  // แท่นแสงใต้การ์ด
  ctx.save();
  ctx.translate(cx, r.y + r.h + 4);
  ctx.scale(1, 0.22);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r.w * 0.62);
  g.addColorStop(0, `rgba(${CREAM},${0.45 * r.a * (0.85 + breathe * 0.15)})`);
  g.addColorStop(0.55, `rgba(${LAVENDER},${0.16 * r.a})`);
  g.addColorStop(1, `rgba(${LAVENDER},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r.w * 0.62, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function blocked(M, x, y, r) {
  for (const z of M.zones) if (x + r > z.x && x - r < z.x + z.w && y + r > z.y && y - r < z.y + z.h) return true;
  return false;
}

/** รอยเท้าเรือง (นิ่ง) */
export function drawProfilePawDecorations(ctx, w, h, M, L) {
  const u = Math.min(w, h) / 400;
  L.paws.forEach(([x, y, rot], i) => {
    if (!M.pawOk[i]) return;
    drawMagicGlow(ctx, x * w, y * h, 9 * u, ROSE, 0.1);
    drawPawPrint(ctx, x * w, y * h, 4 * u, rot, 0.22, i % 2 ? ROSE : CREAM);
  });
}

/** ลวดลายแมวจิ๋ว (นิ่ง) */
export function drawProfileCatMotifs(ctx, w, h, M, L) {
  const u = Math.min(w, h) / 400;
  L.motifs.forEach((m, i) => {
    const at = M.motifAt[i];
    if (!at) return;
    if (m.k === 'heart') drawHeart(ctx, at[0] * w, at[1] * h, m.s * u, m.a, m.c);
    else drawDoodle(ctx, m.k, at[0] * w, at[1] * h, m.s * u, 0, m.a, m.c);
  });
}

/** ประกายความสำเร็จกะพริบช้า ๆ */
export function drawProfileStars(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  L.sparkles.forEach((s, i) => {
    if (!M.sparkOk[i]) return;
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    drawSparkle(ctx, s.x * w, s.y * h, s.r * u * (0.8 + tw * 0.3), 0.14 + tw * 0.36, s.c);
  });
}

/** ละอองลอยขึ้นช้า ๆ — ผ่านหลังการ์ด/หัวเรื่อง = ไม่วาดเฟรมนั้น */
export function drawProfileParticles(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  for (const m of L.motes) {
    const y = 1.05 - ((m.y + t * m.v) % 1.1);
    const x = m.x + Math.sin(t * 0.45 + m.sw) * 0.01;
    if (blocked(M, x * w, y * h, 4)) continue;
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

/**
 * พื้นหลังโชว์รูมน้องแมวของหน้าโปรไฟล์
 * @param canvas   ผ้าใบลูกคนแรกของการ์ดใหญ่
 * @param isActive แผงเปิดอยู่ไหม
 * @param pop      การ์ดใหญ่ (#pfPop)
 */
export function makeProfileBg(canvas, isActive, pop) {
  const L = layout();
  const M = {
    w: 0, h: 0, at: -Infinity, zones: [],
    pawOk: L.paws.map(() => false), motifAt: L.motifs.map(() => null), sparkOk: L.sparkles.map(() => false),
    catEl: null, titleEl: null,
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
    L.paws.forEach(([x, y], i) => { M.pawOk[i] = !blocked(M, x * w, y * h, 6 * u); });
    const taken = [];
    L.motifs.forEach((m, i) => {
      M.motifAt[i] = m.spots.find(([x, y]) => !blocked(M, x * w, y * h, m.s * u * 1.5)
        && !taken.some(([tx, ty]) => Math.hypot((tx - x) * w, (ty - y) * h) < 26 * u)) || null;
      if (M.motifAt[i]) taken.push(M.motifAt[i]);
    });
    L.sparkles.forEach((s, i) => { M.sparkOk[i] = !blocked(M, s.x * w, s.y * h, s.r * u * 1.5); });
    M.catEl = pop.querySelector('.pf-cat');
    M.titleEl = pop.querySelector('.pf-title');
  }

  const catBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const titleBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };

  function live(ctx, w, h, _L, t) {
    if (t - M.at > REMEASURE_S || t < M.at || w !== M.w || h !== M.h) {
      measure(w, h);
      M.at = t;
    }
    const breathe = 0.5 + 0.5 * Math.sin(t * 0.5);
    drawProfileLightShapes(ctx, w, h, L, t);
    // แสงนวลใต้หัวเรื่อง
    const tb = trackRect(canvas, pop, M.titleEl, w, titleBox);
    if (tb) drawMagicGlow(ctx, tb.x + tb.w / 2, tb.y + tb.h * 0.6, Math.max(tb.w * 0.7, 80), ROSE, 0.16 * tb.a);
    // สปอตไลต์ + แท่นใต้การ์ดน้อง (ตามตำแหน่ง/ความทึบที่ตาเห็น)
    const cb = trackRect(canvas, pop, M.catEl, w, catBox);
    if (cb && cb.w) drawProfileSpotlight(ctx, cb, breathe);
    drawProfilePawDecorations(ctx, w, h, M, L);
    drawProfileCatMotifs(ctx, w, h, M, L);
    drawProfileStars(ctx, w, h, M, L, t);
    drawProfileParticles(ctx, w, h, M, L, t);
  }

  const bg = makeCanvasBg(canvas, isActive, { layout: () => L, still: drawProfileBackground, live });
  pop.addEventListener('click', () => { M.at = -Infinity; }, true);
  if (import.meta.env.DEV) window.__profileBgM = M;
  return { kick: () => { M.at = -Infinity; bg.kick(); } };
}
