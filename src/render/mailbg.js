// src/render/mailbg.js
//
// ══ พื้นหลัง "กล่องจดหมายวิเศษของน้องแมว" ของหน้ากล่องจดหมาย ═════════════
//
// วาดด้วย Canvas 2D ล้วน ไม่มีไฟล์ภาพ — ตัวคุมผ้าใบชุดเดียวกับหน้าอื่น (makeCanvasBg)
// ใช้กับแผง #inboxPanel — main.js เป็นคนปลุก
//
// ── ต่างจากหน้าอื่นยังไง ──
//   ข่าวสาร = บอร์ดประกาศ (เป็นระเบียบ เป็นทางการ) · หน้านี้ = ของส่งถึง "เรา" (อุ่น เป็นส่วนตัว)
//   ซองจดหมายจิ๋วลอยโยกช้า ๆ · กล่องของขวัญจิ๋ว · แสตมป์ขอบหยัก (หัวใจ/รอยเท้า/ดาว/หน้าแมว/ปลา)
//   ริบบิ้นบาง ๆ ปลิว · รอยเท้าแมวเดินมาเช็คกล่องจดหมาย · ประกายรางวัลจาง ๆ
//   แสงอุ่นกลางหน้า "มีของพิเศษมาถึงแล้ว"
//
// ── หลักของภาพ ──
//   การ์ดจดหมาย รางวัล และปุ่มรับของ ต้องเด่นที่สุด — ไม่มีของตกแต่งชิ้นไหนไปอยู่หลังของพวกนี้
//   ซองจดหมายเล็กและจางมาก ไม่หน้าตาเหมือนจดหมายที่กดได้ · ไม่ชมพูเกิน ม่วงเป็นหลัก
//   วัดโซนห้ามวาดจากหน้าจริงเป็นระยะ (รับของ/ล้างจดหมาย = รายการสั้นลง พื้นที่ว่างเปลี่ยน)
//
// ── แสงที่เกาะของจริง ── (หลังรายการจดหมาย) ใช้ trackRect ตั้งแต่ต้น
//   เลื่อนขึ้นและจางเข้าพร้อมเนื้อหาตอนเปิดหน้า ไม่มีแสงวาบมาก่อนของจริง
//
// ── ของที่ขยับไม่สร้างใหม่ทุกเฟรม ──
//   ชั้นนิ่ง: ไล่สีพื้น + หมอกล่าง + ขอบพลัม
//   ทุกเฟรม: แสง 3 · ซอง 4 · ของขวัญ 2 · ริบบิ้น 2 · แสตมป์ 3 · รอยเท้า 2 กลุ่ม · หัวใจ 2 · ประกาย 6 · ละออง 9

import { makeCanvasBg, drawPawPrint, drawHeart } from './dreambg.js';
import { drawMagicGlow, drawSparkle, drawSoftCloud } from './skillbg.js';
import { drawGiftBox, drawRibbon } from './gachabg.js';
import { layoutRect, trackRect } from './event-bg.js';
import { drawDoodle } from './creativebg.js';

const TAU = Math.PI * 2;

// ── สี ── ม่วงเป็นหลัก · เหลืองอุ่น = ของขวัญ/ดาว · ชมพูนิดเดียว
const PLUM = '56,22,100';
const LAVENDER = '206,178,248';
const ROSE = '247,199,232';
const PEACH = '241,180,177';
const BUTTER = '254,224,175';
const MINT = '176,240,226';
const CREAM = '255,246,232';

/** วัดหน้าใหม่ทุกกี่วินาที (รับของ/ล้างจดหมาย = รายการเปลี่ยน) */
const REMEASURE_S = 0.5;

/** โซนห้ามวาด — ของที่ผู้เล่นอ่าน/กดจริง */
const KEEP_OUT = ['.panel-head', '.mail-item', '.mail-list > .grid-empty', '.btnrow', '#inboxMsg', '.xbtn'];

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────
// ชิ้นส่วนธีมกล่องจดหมาย (ตัวจิ๋ว จาง)
// ─────────────────────────────────────────────────────────────

/** ซองจดหมายจิ๋ว: ตัวซองมน ฝาสามเหลี่ยม ไฮไลต์บาง ๆ */
export function drawEnvelope(ctx, x, y, w, rot, alpha, color = CREAM) {
  const h = w * 0.66;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.1);
  ctx.fill();
  ctx.strokeStyle = `rgb(${PLUM})`;
  ctx.globalAlpha = alpha * 0.45;
  ctx.lineWidth = Math.max(0.8, w * 0.05);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-w / 2 + w * 0.06, -h / 2 + h * 0.1);
  ctx.lineTo(0, h * 0.1);
  ctx.lineTo(w / 2 - w * 0.06, -h / 2 + h * 0.1);
  ctx.stroke();
  ctx.restore();
}

/**
 * แสตมป์จิ๋วขอบหยัก — รูปตรงกลาง: heart / paw / star / cat / fish
 * ขอบหยักทำจากจุดกลมสีพื้นเรียงรอบขอบ (ไม่ต้องใช้ mask)
 */
export function drawMailStamp(ctx, kind, x, y, s, rot, alpha, ink) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${CREAM})`;
  ctx.beginPath();
  ctx.rect(-s, -s * 1.15, s * 2, s * 2.3);
  ctx.fill();
  // ขอบหยัก: เจาะรูกลมเล็ก ๆ ตามขอบด้วย destination-out
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  const r = s * 0.16;
  for (let i = 0; i <= 6; i++) {
    const px = -s + (i / 6) * s * 2;
    ctx.moveTo(px + r, -s * 1.15); ctx.arc(px, -s * 1.15, r, 0, TAU);
    ctx.moveTo(px + r, s * 1.15); ctx.arc(px, s * 1.15, r, 0, TAU);
  }
  for (let i = 1; i < 7; i++) {
    const py = -s * 1.15 + (i / 7) * s * 2.3;
    ctx.moveTo(-s + r, py); ctx.arc(-s, py, r, 0, TAU);
    ctx.moveTo(s + r, py); ctx.arc(s, py, r, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
  // รูปกลางแสตมป์
  const a = alpha * 1.4;
  if (kind === 'heart') drawHeart(ctx, x, y, s * 0.5, a, ink);
  else if (kind === 'paw') drawPawPrint(ctx, x, y, s * 0.6, rot, a, ink);
  else if (kind === 'star') drawSparkle(ctx, x, y, s * 0.7, a, ink);
  else drawDoodle(ctx, kind === 'cat' ? 'ears' : 'fish', x, y + (kind === 'cat' ? s * 0.15 : 0), s * 0.5, rot, a, ink);
}

// ─────────────────────────────────────────────────────────────
// ตำแหน่งของ (สัดส่วนของการ์ด) — ชิ้นที่ทับโซนห้ามวาดถูกข้ามตอนวัดหน้า
// ─────────────────────────────────────────────────────────────

function layout() {
  const rand = seeded(20261012);
  const L = {};
  // ซองจดหมายลอยโยกซ้าย-ขวาช้า ๆ (ที่ลงสำรองหลายจุด)
  L.envelopes = [
    { w: 18, rot: -0.2, c: CREAM, a: 0.34, spots: [[0.08, 0.2], [0.05, 0.5], [0.2, 0.06]] },
    { w: 15, rot: 0.18, c: LAVENDER, a: 0.32, spots: [[0.93, 0.32], [0.95, 0.6], [0.8, 0.06]] },
    { w: 13, rot: 0.1, c: ROSE, a: 0.3, spots: [[0.07, 0.62], [0.12, 0.9], [0.04, 0.35]] },
    { w: 12, rot: -0.12, c: CREAM, a: 0.28, spots: [[0.9, 0.78], [0.96, 0.15], [0.85, 0.92]] },
  ];
  // กล่องของขวัญจิ๋ว (ลอยขึ้นลงเบามาก)
  L.gifts = [
    { s: 10, body: BUTTER, ribbon: ROSE, a: 0.32, spots: [[0.14, 0.82], [0.05, 0.75], [0.25, 0.92]] },
    { s: 9, body: MINT, ribbon: CREAM, a: 0.3, spots: [[0.88, 0.55], [0.94, 0.45], [0.75, 0.92]] },
  ];
  // ริบบิ้นบาง ๆ ปลิวช้า ๆ
  L.ribbons = [
    { s: 12, c: ROSE, a: 0.16, spots: [[0.24, 0.12], [0.06, 0.4], [0.3, 0.93]] },
    { s: 11, c: LAVENDER, a: 0.18, spots: [[0.82, 0.88], [0.95, 0.9], [0.7, 0.06]] },
  ];
  // แสตมป์จิ๋วขอบหยัก (นิ่ง)
  L.stamps = [
    { k: 'paw', s: 6, rot: 0.15, ink: ROSE, a: 0.24, spots: [[0.04, 0.08], [0.06, 0.95], [0.3, 0.05]] },
    { k: 'heart', s: 5.5, rot: -0.12, ink: ROSE, a: 0.22, spots: [[0.96, 0.92], [0.97, 0.08], [0.7, 0.95]] },
    { k: 'cat', s: 5.5, rot: 0.08, ink: LAVENDER, a: 0.22, spots: [[0.96, 0.1], [0.04, 0.45], [0.94, 0.7]] },
  ];
  // รอยเท้าแมวเดินมาเช็คกล่องจดหมาย (จางลงเรื่อย ๆ)
  L.paws = [
    [[0.03, 0.97, -0.6], [0.06, 0.92, -0.4], [0.09, 0.87, -0.6], [0.12, 0.82, -0.4]],
    [[0.97, 0.98, -2.6], [0.94, 0.94, -2.8], [0.91, 0.9, -2.6]],
  ];
  // หัวใจจิ๋วลอยนิ่ง ๆ ใกล้หัวเรื่อง/มุม
  L.hearts = [
    { s: 4, c: ROSE, a: 0.26, spots: [[0.36, 0.06], [0.2, 0.2], [0.05, 0.3]] },
    { s: 3.2, c: PEACH, a: 0.24, spots: [[0.66, 0.06], [0.8, 0.2], [0.95, 0.25]] },
  ];
  // ประกายรางวัล (เหลืองอุ่น/ครีม)
  L.sparkles = Array.from({ length: 6 }, (_, i) => ({
    x: [0.15, 0.04, 0.85, 0.97, 0.28, 0.72][i] + (rand() - 0.5) * 0.02,
    y: [0.3, 0.7, 0.18, 0.5, 0.95, 0.94][i] + (rand() - 0.5) * 0.02,
    r: 2.6 + rand() * 2.4,
    ph: rand() * TAU,
    sp: 0.45 + rand() * 0.45,
    c: [BUTTER, CREAM, BUTTER, CREAM, ROSE, BUTTER][i],
  }));
  // ละอองแสงลอยขึ้นช้า ๆ
  L.motes = Array.from({ length: 9 }, (_, i) => ({
    x: rand(),
    y: rand(),
    v: 0.004 + rand() * 0.006,
    sw: rand() * TAU,
    r: 0.9 + rand() * 1.2,
    c: [CREAM, BUTTER, LAVENDER, ROSE, MINT][i % 5],
  }));
  return L;
}

// ─────────────────────────────────────────────────────────────
// ชั้นของฉาก
// ─────────────────────────────────────────────────────────────

/** ชั้นนิ่ง — บนลาเวนเดอร์ กลางม่วงอุ่น ล่างพลัม + หมอกล่าง + ขอบพลัม */
export function drawMailboxBackground(ctx, w, h) {
  const R = Math.max(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#A070DC');
  g.addColorStop(0.5, '#8856C6');
  g.addColorStop(1, '#5E3299');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  drawSoftCloud(ctx, w * 0.06, h * 1.04, w * 0.3, 0.15, LAVENDER);
  drawSoftCloud(ctx, w * 0.94, h * 1.05, w * 0.28, 0.13, ROSE);
  const v = ctx.createRadialGradient(w * 0.5, h * 0.48, R * 0.3, w * 0.5, h * 0.48, R * 0.8);
  v.addColorStop(0, `rgba(${PLUM},0)`);
  v.addColorStop(1, `rgba(${PLUM},0.36)`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** ซอง ของขวัญ ริบบิ้น แสตมป์ รอยเท้า หัวใจ — ชิ้นที่ไม่มีที่ลงไม่วาด */
export function drawMailAtmosphere(ctx, w, h, M, L, t) {
  const u = Math.max(1, Math.min(w, h) / 400);   // การ์ดหน้านี้เล็ก — ไม่ย่อของตกแต่งจนมองไม่ออก
  for (const [i, r] of L.ribbons.entries()) {
    const at = M.ribbonAt[i];
    if (at) drawRibbon(ctx, at[0] * w, at[1] * h, r.s * u, r.a, r.c, t * 0.5 + i * 2);
  }
  for (const [i, e] of L.envelopes.entries()) {
    const at = M.envAt[i];
    if (!at) continue;
    const sway = Math.sin(t * 0.3 + i * 1.7);
    drawEnvelope(ctx, at[0] * w + sway * 3 * u, at[1] * h + Math.sin(t * 0.45 + i) * 1.5 * u, e.w * u, e.rot + sway * 0.06, e.a, e.c);
  }
  for (const [i, gf] of L.gifts.entries()) {
    const at = M.giftAt[i];
    if (at) drawGiftBox(ctx, at[0] * w, at[1] * h + Math.sin(t * 0.4 + i * 2.3) * 2 * u, gf.s * u, gf.a, gf.body, gf.ribbon);
  }
  for (const [i, st] of L.stamps.entries()) {
    const at = M.stampAt[i];
    if (at) drawMailStamp(ctx, st.k, at[0] * w, at[1] * h, st.s * u, st.rot, st.a, st.ink);
  }
  for (const [i, ht] of L.hearts.entries()) {
    const at = M.heartAt[i];
    if (at) drawHeart(ctx, at[0] * w, at[1] * h + Math.sin(t * 0.6 + i) * 1.5 * u, ht.s * u, ht.a, ht.c);
  }
  for (const [g, group] of L.paws.entries()) {
    if (!M.pawOk[g]) continue;
    group.forEach(([x, y, rot], i) => drawPawPrint(ctx, x * w, y * h, 3.8 * u, rot, 0.17 * (1 - i * 0.18), CREAM));
  }
}

/** ประกายรางวัลกะพริบช้า ๆ */
export function drawMailSparkles(ctx, w, h, M, L, t) {
  const u = Math.max(1, Math.min(w, h) / 400);   // การ์ดหน้านี้เล็ก — ไม่ย่อของตกแต่งจนมองไม่ออก
  for (const [i, s] of L.sparkles.entries()) {
    if (!M.sparkOk[i]) continue;
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    drawSparkle(ctx, s.x * w, s.y * h, s.r * u * (0.8 + tw * 0.3), 0.12 + tw * 0.34, s.c);
  }
}

/** ละอองแสงลอยขึ้น — ผ่านหลังของจริง = ไม่วาดเฟรมนั้น */
export function drawMagicParticles(ctx, w, h, M, L, t) {
  const u = Math.max(1, Math.min(w, h) / 400);   // การ์ดหน้านี้เล็ก — ไม่ย่อของตกแต่งจนมองไม่ออก
  for (const m of L.motes) {
    const y = 1.05 - ((m.y + t * m.v) % 1.1);
    const x = m.x + Math.sin(t * 0.45 + m.sw) * 0.01;
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
 * พื้นหลังกล่องจดหมายวิเศษ
 * @param canvas   ผ้าใบลูกคนแรกของการ์ดใหญ่
 * @param isActive แผงเปิดอยู่ไหม
 * @param pop      การ์ดใหญ่ (.pop) — วัดหัวเรื่อง รายการจดหมาย ปุ่มล่าง ปุ่มปิด
 */
export function makeMailBg(canvas, isActive, pop) {
  const L = layout();
  const M = {
    w: 0, h: 0, at: -Infinity, zones: [],
    envAt: L.envelopes.map(() => null), giftAt: L.gifts.map(() => null), ribbonAt: L.ribbons.map(() => null),
    stampAt: L.stamps.map(() => null), heartAt: L.hearts.map(() => null),
    pawOk: L.paws.map(() => false), sparkOk: L.sparkles.map(() => false),
    listEl: null,
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
    const u = Math.max(1, Math.min(w, h) / 400);   // การ์ดหน้านี้เล็ก — ไม่ย่อของตกแต่งจนมองไม่ออก
    const taken = [];
    const pick = (spots, r) => spots.find(([x, y]) => !blocked(M, x * w, y * h, r)
      && !taken.some(([tx, ty]) => Math.hypot((tx - x) * w, (ty - y) * h) < r * 2.4)) || null;
    const place = (arr, key, size) => arr.forEach((o, i) => { M[key][i] = pick(o.spots, size(o)); if (M[key][i]) taken.push(M[key][i]); });
    place(L.envelopes, 'envAt', (e) => e.w * u * 0.7);
    place(L.gifts, 'giftAt', (g) => g.s * u * 1.3);
    place(L.stamps, 'stampAt', (s) => s.s * u * 1.5);
    place(L.ribbons, 'ribbonAt', (r) => r.s * u * 1.5);
    place(L.hearts, 'heartAt', (ht) => ht.s * u * 1.6);
    L.paws.forEach((g, i) => {
      M.pawOk[i] = g.every(([x, y]) => !blocked(M, x * w, y * h, 6 * u)
        && !taken.some(([tx, ty]) => Math.hypot((tx - x) * w, (ty - y) * h) < 16 * u));
    });
    L.sparkles.forEach((s, i) => { M.sparkOk[i] = !blocked(M, s.x * w, s.y * h, s.r * u * 1.5); });
    M.listEl = pop.querySelector('.mail-list');
  }

  const listBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };

  function live(ctx, w, h, _L, t) {
    if (t - M.at > REMEASURE_S || t < M.at || w !== M.w || h !== M.h) {
      measure(w, h);
      M.at = t;
    }
    const b = 0.5 + 0.5 * Math.sin(t * 0.4);
    const R = Math.max(w, h);
    drawMagicGlow(ctx, w * 0.5, 0, R * 0.34, ROSE, 0.16 + b * 0.04);
    drawMagicGlow(ctx, 0, h, R * 0.3, PEACH, 0.13 + (1 - b) * 0.04);
    // แสงอุ่นหลังรายการจดหมาย "มีของพิเศษมาถึงแล้ว" — ลาเวนเดอร์ + ครีมอุ่น + เหลืองนิด ๆ (จางเข้าพร้อมเนื้อหา)
    const lb = trackRect(canvas, pop, M.listEl, w, listBox);
    if (lb && lb.h > 0) {
      const cx = lb.x + lb.w / 2, cy = lb.y + lb.h / 2, r = Math.max(lb.w, lb.h) * 0.66;
      drawMagicGlow(ctx, cx, cy, r, LAVENDER, (0.18 + b * 0.03) * lb.a);
      drawMagicGlow(ctx, cx, cy, r * 0.7, BUTTER, (0.07 + b * 0.02) * lb.a);
    }
    drawMailAtmosphere(ctx, w, h, M, L, t);
    drawMailSparkles(ctx, w, h, M, L, t);
    drawMagicParticles(ctx, w, h, M, L, t);
  }

  const bg = makeCanvasBg(canvas, isActive, { layout: () => L, still: drawMailboxBackground, live });
  // รับของ/ล้างจดหมาย = รายการเปลี่ยน — วัดใหม่ทันที
  pop.addEventListener('click', () => { M.at = -Infinity; }, true);
  if (import.meta.env.DEV) window.__mailBgM = M;   // สคริปต์ทดสอบอ่านผลการวัดหน้า
  return { kick: () => { M.at = -Infinity; bg.kick(); } };
}
