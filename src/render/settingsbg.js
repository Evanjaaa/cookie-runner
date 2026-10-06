// src/render/settingsbg.js
//
// ══ พื้นหลัง "มุมสงบ ๆ ของน้องแมว" ของหน้าตั้งค่า ═══════════════════════
//
// วาดด้วย Canvas 2D ล้วน ไม่มีไฟล์ภาพ — ตัวคุมผ้าใบชุดเดียวกับหน้าอื่น (makeCanvasBg)
// ใช้กับแผง #settingsPanel ทั้งสี่หมวด (ทั่วไป / เสียง / การแสดงผล / ช่วยเหลือ) — main.js เป็นคนปลุก
//
// ── ต่างจากหน้าอื่นยังไง ──
//   หน้านี้เงียบที่สุดในเกม — ช่วงหัวค่ำในบ้านน้องแมว หลังเล่นเหนื่อยแล้วมานั่งพัก
//   แสงจันทร์ลอดหน้าต่างเป็นลำแสงจาง ๆ สองแท่ง · ม่านโค้งเงา ๆ ริมขอบ · จันทร์เสี้ยวเล็กมุมบน
//   ดาวจิ๋วไม่กี่ดวง · เบาะ/ที่นอนแมว/กระถางต้นไม้เป็นเงาไกล ๆ มุมล่าง · ฝุ่นในแสงลอยช้า ๆ
//   ดูเดิลแมวกับรอยเท้าจางมาก — มืดและสงบกว่าหน้ากาช่า/กิจกรรม/ข่าว/เพื่อน
//
// ── หลักของภาพ ──
//   ปุ่มตั้งค่าทุกตัวเด่นที่สุด ไม่มีของตกแต่งชิ้นไหนไปอยู่หลังแท็บ แถวตั้งค่า หรือปุ่มปิด
//   ไม่มีอะไรเด้ง ไม่มีประกายระยิบ — ทุกอย่างหายใจช้ามากหรือนิ่ง
//
// ── แสงที่เกาะของจริง ── (หลังหมวดที่เปิดอยู่) ใช้ trackRect: เลื่อนขึ้น/จางเข้าพร้อมเนื้อหา
//
// ── ของที่ขยับไม่สร้างใหม่ทุกเฟรม ──
//   ชั้นนิ่ง: ไล่สีพื้น + ม่าน + เงาเบาะ/ที่นอน/ต้นไม้ + ขอบพลัม
//   ทุกเฟรม: ลำแสงหน้าต่าง 2 · แสงจันทร์ · ดาว 4 · ดูเดิล 3 · รอยเท้า 2 กลุ่ม · ฝุ่น 8 · แสงหลังหมวด

import { makeCanvasBg, drawPawPrint } from './dreambg.js';
import { drawMagicGlow, drawSparkle } from './skillbg.js';
import { layoutRect, trackRect } from './event-bg.js';
import { drawDoodle } from './creativebg.js';

const TAU = Math.PI * 2;

// ── สี ── ม่วงเป็นหลัก แต้มสีอื่นเบามาก
const PLUM = '56,22,100';
const LAVENDER = '206,178,248';
const ROSE = '247,199,232';
const BUTTER = '254,224,175';
const SKY = '190,210,250';
const CREAM = '255,246,232';
const MINT = '176,240,226';

/** วัดหน้าใหม่ทุกกี่วินาที (สลับหมวด = แถวตั้งค่าเปลี่ยน) */
const REMEASURE_S = 0.5;

/** โซนห้ามวาด — ของที่ผู้เล่นอ่าน/กดจริง */
const KEEP_OUT = ['.stab', '.panel-head', '.setrow', '.set-sec > :not(.setrow)', '.xbtn', '.backbtn'];

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────
// ชิ้นส่วนมุมสงบ (จาง ๆ)
// ─────────────────────────────────────────────────────────────

/** จันทร์เสี้ยวเล็ก (วงกลมหักด้วยวงกลมอีกวง) */
export function drawCrescent(ctx, x, y, r, alpha, color = CREAM) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x + r * 0.45, y - r * 0.25, r * 0.85, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** ม่านโค้งเงา ๆ ห้อยจากขอบบน (side = -1 ขอบซ้าย / 1 ขอบขวา) — ไหวเบามาก */
export function drawCurtainSilhouette(ctx, w, h, side, alpha, sway) {
  const x0 = side < 0 ? 0 : w;
  const d = side < 0 ? 1 : -1;
  const wd = w * 0.07;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${LAVENDER})`;
  ctx.beginPath();
  ctx.moveTo(x0, 0);
  ctx.lineTo(x0 + d * wd * 1.4, 0);
  // ผ้าโค้งเข้ามาแล้วรวบที่ราว 60% ของความสูง (เหมือนผูกม่านไว้)
  ctx.bezierCurveTo(x0 + d * wd * (1.1 + sway), h * 0.25, x0 + d * wd * 0.35, h * 0.45, x0 + d * wd * 0.5, h * 0.6);
  ctx.bezierCurveTo(x0 + d * wd * 0.8, h * 0.75, x0 + d * wd * (0.9 + sway * 0.5), h * 0.9, x0 + d * wd * 0.6, h);
  ctx.lineTo(x0, h);
  ctx.closePath();
  ctx.fill();
  // ริ้วผ้าสองเส้น
  ctx.globalAlpha = alpha * 0.8;
  ctx.strokeStyle = `rgb(${PLUM})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const k of [0.45, 0.85]) {
    ctx.moveTo(x0 + d * wd * k, 0);
    ctx.quadraticCurveTo(x0 + d * wd * k * 0.6, h * 0.35, x0 + d * wd * 0.42, h * 0.6);
  }
  ctx.stroke();
  ctx.restore();
}

/** เงาของในบ้านไกล ๆ: เบาะกลม / ที่นอนแมวทรงชาม / กระถางต้นไม้ */
function drawCozySilhouette(ctx, kind, x, y, s, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${LAVENDER})`;
  ctx.beginPath();
  if (kind === 'cushion') {
    ctx.ellipse(0, 0, s * 1.4, s * 0.6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgb(${PLUM})`;
    ctx.globalAlpha = alpha * 0.5;
    ctx.beginPath();
    ctx.arc(0, -s * 0.05, s * 0.12, 0, TAU);
    ctx.fill();
  } else if (kind === 'bed') {
    ctx.moveTo(-s * 1.6, -s * 0.5);
    ctx.quadraticCurveTo(-s * 1.6, s * 0.7, 0, s * 0.7);
    ctx.quadraticCurveTo(s * 1.6, s * 0.7, s * 1.6, -s * 0.5);
    ctx.quadraticCurveTo(0, s * 0.1, -s * 1.6, -s * 0.5);
    ctx.fill();
  } else {
    // กระถาง + ใบสามใบ
    ctx.moveTo(-s * 0.5, 0);
    ctx.lineTo(s * 0.5, 0);
    ctx.lineTo(s * 0.38, s * 0.8);
    ctx.lineTo(-s * 0.38, s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgb(${MINT})`;
    for (const [a, l] of [[-0.6, 1.1], [0, 1.4], [0.6, 1.0]]) {
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, -s * l * 0.55, s * 0.22, s * l * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ตำแหน่งของ (สัดส่วนของการ์ด)
// ─────────────────────────────────────────────────────────────

function layout() {
  const rand = seeded(20261013);
  const L = {};
  // ลำแสงจันทร์จากหน้าต่าง: สองแท่งเอียงลงจากมุมขวาบน
  L.beams = [{ x: 0.74, wd: 0.06, ph: 0 }, { x: 0.84, wd: 0.045, ph: 1.4 }];
  // จันทร์เสี้ยว — ที่ลงสำรอง (มุมขวาบนมักเป็นปุ่มปิด)
  L.moon = { r: 8, spots: [[0.9, 0.1], [0.84, 0.08], [0.62, 0.08], [0.35, 0.08]] };
  L.stars = Array.from({ length: 4 }, (_, i) => ({
    x: [0.8, 0.95, 0.62, 0.72][i], y: [0.05, 0.22, 0.04, 0.16][i],
    r: 2 + rand() * 1.6, ph: rand() * TAU,
  }));
  // เงาของในบ้านมุมล่าง (ชั้นนิ่ง)
  L.cozy = [
    { k: 'bed', x: 0.08, y: 0.95, s: 14, a: 0.12 },
    { k: 'cushion', x: 0.94, y: 0.96, s: 11, a: 0.11 },
    { k: 'plant', x: 0.985, y: 0.82, s: 10, a: 0.1 },
  ];
  // ดูเดิลแมว (ที่ลงสำรอง)
  L.doodles = [
    { k: 'ears', s: 7, a: 0.16, spots: [[0.06, 0.12], [0.3, 0.06], [0.05, 0.5]] },
    { k: 'swirl', s: 6, a: 0.14, spots: [[0.97, 0.45], [0.95, 0.65], [0.6, 0.95]] },
    { k: 'fish', s: 6, a: 0.13, spots: [[0.05, 0.7], [0.4, 0.95], [0.97, 0.3]] },
  ];
  L.paws = [
    [[0.18, 0.97, -0.5], [0.22, 0.93, -0.3]],
    [[0.82, 0.95, -2.6], [0.78, 0.92, -2.8]],
  ];
  // ฝุ่นในแสง: ลอยขึ้นช้ามาก ส่วนใหญ่อยู่แถวลำแสงจันทร์
  L.dust = Array.from({ length: 8 }, (_, i) => ({
    x: i < 5 ? 0.66 + rand() * 0.26 : rand(),
    y: rand(),
    v: 0.0025 + rand() * 0.003,
    sw: rand() * TAU,
    r: 0.8 + rand() * 0.9,
  }));
  return L;
}

/** ชั้นนิ่ง — บนลาเวนเดอร์ กลางม่วง ล่างพลัม (มืดกว่าหน้าอื่นนิดหนึ่ง) + ม่าน + เงาของในบ้าน + ขอบพลัม */
export function drawSettingsBackground(ctx, w, h, L) {
  const R = Math.max(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#9466D2');
  g.addColorStop(0.5, '#7A4CBB');
  g.addColorStop(1, '#552D8E');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  drawCurtainSilhouette(ctx, w, h, -1, 0.07, 0);
  drawCurtainSilhouette(ctx, w, h, 1, 0.06, 0);
  const u = Math.min(w, h) / 400;
  for (const c of L.cozy) drawCozySilhouette(ctx, c.k, c.x * w, c.y * h, c.s * u, c.a);
  const v = ctx.createRadialGradient(w * 0.55, h * 0.5, R * 0.28, w * 0.55, h * 0.5, R * 0.8);
  v.addColorStop(0, `rgba(${PLUM},0)`);
  v.addColorStop(1, `rgba(${PLUM},0.4)`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** ลำแสงจันทร์ลอดหน้าต่าง — สองแท่งเอียง หายใจช้ามาก */
export function drawSoftWindowGlow(ctx, w, h, L, t) {
  for (const b of L.beams) {
    const br = 0.75 + 0.25 * Math.sin(t * 0.25 + b.ph);
    const x = b.x * w, bw = b.wd * w;
    const lg = ctx.createLinearGradient(x, 0, x - w * 0.18, h);
    lg.addColorStop(0, `rgba(${CREAM},${0.08 * br})`);
    lg.addColorStop(0.75, `rgba(${CREAM},0)`);
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + bw, 0);
    ctx.lineTo(x + bw - w * 0.2, h);
    ctx.lineTo(x - w * 0.2, h);
    ctx.closePath();
    ctx.fill();
  }
}

/** จันทร์เสี้ยว + แสงจันทร์ + ดาวจิ๋วกะพริบช้ามาก */
export function drawMoonDecorations(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  if (M.moonAt) {
    const [mx, my] = M.moonAt;
    drawMagicGlow(ctx, mx * w, my * h, L.moon.r * u * 4, BUTTER, 0.14 + 0.03 * Math.sin(t * 0.3));
    drawCrescent(ctx, mx * w, my * h, L.moon.r * u, 0.42, CREAM);
  }
  for (const [i, s] of L.stars.entries()) {
    if (!M.starOk[i]) continue;
    const tw = 0.5 + 0.5 * Math.sin(t * 0.35 + s.ph);
    drawSparkle(ctx, s.x * w, s.y * h, s.r * u, 0.12 + tw * 0.2, i % 2 ? SKY : CREAM);
  }
}

/** ดูเดิลแมว + รอยเท้า (นิ่ง) */
export function drawCatDoodles(ctx, w, h, M, L) {
  const u = Math.min(w, h) / 400;
  for (const [i, d] of L.doodles.entries()) {
    const at = M.doodleAt[i];
    if (at) drawDoodle(ctx, d.k, at[0] * w, at[1] * h, d.s * u, 0, d.a, CREAM);
  }
  for (const [g, group] of L.paws.entries()) {
    if (!M.pawOk[g]) continue;
    for (const [x, y, rot] of group) drawPawPrint(ctx, x * w, y * h, 3.6 * u, rot, 0.12, CREAM);
  }
}

/** ฝุ่นในแสงลอยขึ้นช้ามาก — ผ่านหลังของจริง = ไม่วาดเฟรมนั้น */
export function drawSoftParticles(ctx, w, h, M, L, t) {
  const u = Math.min(w, h) / 400;
  ctx.fillStyle = `rgb(${CREAM})`;
  for (const d of L.dust) {
    const y = 1.05 - ((d.y + t * d.v) % 1.1);
    const x = d.x + Math.sin(t * 0.3 + d.sw) * 0.008;
    if (blocked(M, x * w, y * h, 4)) continue;
    const a = 0.22 * Math.min(1, (1.05 - y) * 6) * Math.min(1, y * 4);
    if (a <= 0.02) continue;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(x * w, y * h, d.r * u, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function blocked(M, x, y, r) {
  for (const z of M.zones) {
    if (x + r > z.x && x - r < z.x + z.w && y + r > z.y && y - r < z.y + z.h) return true;
  }
  return false;
}

/**
 * พื้นหลังมุมสงบของหน้าตั้งค่า
 * @param canvas   ผ้าใบลูกคนแรกของการ์ดใหญ่
 * @param isActive แผงเปิดอยู่ไหม
 * @param pop      การ์ดใหญ่ (.pop)
 */
export function makeSettingsBg(canvas, isActive, pop) {
  const L = layout();
  const M = {
    w: 0, h: 0, at: -Infinity, zones: [], moonAt: null,
    starOk: L.stars.map(() => false), doodleAt: L.doodles.map(() => null), pawOk: L.paws.map(() => false),
    secEl: null, tabsEl: null,
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
        const r = layoutRect(pop, el);
        if (r) M.zones.push({ x: (r.x - 6) * k, y: (r.y - 6) * k, w: (r.w + 12) * k, h: (r.h + 12) * k });
      }
    }
    const u = Math.min(w, h) / 400;
    M.moonAt = L.moon.spots.find(([x, y]) => !blocked(M, x * w, y * h, L.moon.r * u * 2)) || null;
    L.stars.forEach((s, i) => { M.starOk[i] = !blocked(M, s.x * w, s.y * h, s.r * u * 1.5); });
    const taken = [];
    L.doodles.forEach((d, i) => {
      M.doodleAt[i] = d.spots.find(([x, y]) => !blocked(M, x * w, y * h, d.s * u * 1.5)
        && !taken.some(([tx, ty]) => Math.hypot((tx - x) * w, (ty - y) * h) < 30 * u)) || null;
      if (M.doodleAt[i]) taken.push(M.doodleAt[i]);
    });
    L.paws.forEach((g, i) => { M.pawOk[i] = g.every(([x, y]) => !blocked(M, x * w, y * h, 6 * u)); });
    M.secEl = [...pop.querySelectorAll('.set-sec')].find((el) => el.offsetParent) || null;
    M.tabsEl = pop.querySelector('.stab.on');
  }

  const secBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const tabBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };

  function live(ctx, w, h, _L, t) {
    const stale = (M.tabsEl && !M.tabsEl.classList.contains('on')) || (M.secEl && !M.secEl.offsetParent);
    if (stale || t - M.at > REMEASURE_S || t < M.at || w !== M.w || h !== M.h) {
      measure(w, h);
      M.at = t;
    }
    drawSoftWindowGlow(ctx, w, h, L, t);
    // แสงนวลหลังหมวดที่เปิดอยู่ — ลาเวนเดอร์อุ่น ๆ นิ่ง (จางเข้าพร้อมเนื้อหา)
    const sb = trackRect(canvas, pop, M.secEl, w, secBox);
    if (sb && sb.h > 0) drawMagicGlow(ctx, sb.x + sb.w / 2, sb.y + sb.h / 2, Math.max(sb.w, sb.h) * 0.7, LAVENDER, 0.14 * sb.a);
    const tb = trackRect(canvas, pop, M.tabsEl, w, tabBox);
    if (tb) drawMagicGlow(ctx, tb.x + tb.w / 2, tb.y + tb.h / 2, tb.w * 0.6, ROSE, 0.1 * tb.a);
    drawMoonDecorations(ctx, w, h, M, L, t);
    drawCatDoodles(ctx, w, h, M, L);
    drawSoftParticles(ctx, w, h, M, L, t);
  }

  const bg = makeCanvasBg(canvas, isActive, { layout: () => L, still: drawSettingsBackground, live });
  pop.addEventListener('click', () => { M.at = -Infinity; }, true);
  if (import.meta.env.DEV) window.__settingsBgM = M;
  return { kick: () => { M.at = -Infinity; bg.kick(); } };
}
