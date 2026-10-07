// src/render/levelbg.js
//
// ══ พื้นหลัง "เส้นทางเติบโตวิเศษของน้องแมว" ของหน้ารางวัลเลเวล ═════════════
//
// วาดด้วย Canvas 2D ล้วน ไม่มีไฟล์ภาพ — ตัวคุมผ้าใบชุดเดียวกับหน้าอื่น (makeCanvasBg)
// ใช้กับแผง #lvPanel — main.js เป็นคนปลุก
//
// ── ต่างจากหน้าอื่นยังไง ──
//   หน้านี้ = การเติบโต: "เดินต่ออีกนิดก็จะได้รางวัลแล้ว!"
//   แสงนวลแนวตั้งตามรางความคืบหน้า (ไม่ได้วาดรางใหม่ — แค่แสงลอดหลังรางจริง)
//   สปอตไลต์นุ่มตรงหมุด "ตอนนี้อยู่ตรงนี้" · แสงบอกความคืบหน้าหลังแถบสรุปเลเวลด้านบน
//   รอยเท้าแมวเดินสลับซ้ายขวาเลียบราง (ข้างนอกช่องรายการ) · ลำแสงเฉียงจาง ๆ
//   ประกายกับละอองลอยขึ้น "ไปหารางวัลถัดไป" — ไม่มีลูกศร ไม่มีตัวหนังสือ
//
// ── หลักของภาพ ──
//   แถบสรุป รางรางวัล การ์ด ปุ่มรับ ต้องเด่นที่สุด — พื้นหลังหลังการ์ดเข้มกว่านิดให้อ่านง่าย
//   ไม่มีอะไรไปอยู่หลังหัวเรื่อง แถบสรุป การ์ด หรือปุ่ม — วัดโซนห้ามวาดจากหน้าจริง
//
// ── แสงที่เกาะของจริง ── ใช้ trackRect (ตามตำแหน่ง+ความทึบที่ตาเห็น) และตัดตามช่องรายการ
//   เลื่อนรายการแล้วแสงตามรางกับหมุดไปด้วย ตอนเปิดหน้าเลื่อนขึ้น/จางเข้าพร้อมเนื้อหา

import { makeCanvasBg, drawPawPrint, drawHeart } from './dreambg.js';
import { drawMagicGlow, drawSparkle } from './skillbg.js';
import { layoutRect, trackRect } from './event-bg.js';
import { drawDoodle } from './creativebg.js';

const TAU = Math.PI * 2;

const PLUM = '50,18,88';
const LAVENDER = '206,178,248';
const ROSE = '247,199,232';
const CREAM = '255,246,232';
const BUTTER = '254,224,175';
const CYAN = '170,230,240';
const MINT = '176,240,226';

const REMEASURE_S = 0.5;

/** โซนห้ามวาด — หัวเรื่อง ป้ายนับ ปุ่ม แถบสรุป และช่องรายการทั้งก้อน */
const KEEP_OUT = ['.lv-head', '.lv-now', '.lv-rail', '.form-msg', '.backbtn'];

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function layout() {
  const rand = seeded(20261016);
  const L = {};
  L.rays = [
    { x: 0.72, wd: 0.1, a: 0.05, ph: 0 },
    { x: 0.86, wd: 0.06, a: 0.045, ph: 1.7 },
    { x: 0.2, wd: 0.08, a: 0.035, ph: 3.3 },
  ];
  // ลวดลายแมวจิ๋ว (หูแมว / ปลา / หัวใจ) — ที่ลงสำรอง
  L.motifs = [
    { k: 'ears', s: 7, a: 0.2, c: CREAM, spots: [[0.08, 0.1], [0.06, 0.45], [0.92, 0.88]] },
    { k: 'fish', s: 6, a: 0.18, c: CYAN, spots: [[0.92, 0.4], [0.94, 0.7], [0.08, 0.8]] },
    { k: 'heart', s: 4, a: 0.24, c: ROSE, spots: [[0.92, 0.15], [0.08, 0.62], [0.9, 0.55]] },
  ];
  // ประกายริมขอบ (ทางขึ้น = "รางวัลรออยู่ข้างหน้า")
  L.sparkles = Array.from({ length: 6 }, (_, i) => ({
    x: [0.06, 0.94, 0.1, 0.9, 0.05, 0.95][i] + (rand() - 0.5) * 0.03,
    y: [0.22, 0.28, 0.5, 0.62, 0.86, 0.92][i] + (rand() - 0.5) * 0.03,
    r: 3 + rand() * 2.5, ph: rand() * TAU, sp: 0.5 + rand() * 0.4,
    c: [CREAM, BUTTER, ROSE, CREAM, BUTTER, ROSE][i],
  }));
  L.tiny = Array.from({ length: 10 }, (_, i) => ({ x: rand(), y: rand(), r: 1 + rand(), ph: rand() * TAU, c: [CREAM, BUTTER, LAVENDER][i % 3] }));
  L.motes = Array.from({ length: 12 }, (_, i) => ({
    x: rand(), y: rand(), v: 0.006 + rand() * 0.007, sw: rand() * TAU, r: 0.9 + rand() * 1.2,
    c: [CREAM, ROSE, LAVENDER, BUTTER, MINT][i % 5],
  }));
  return L;
}

/** ชั้นนิ่ง — บนม่วงกลาง กลางม่วงสว่าง ล่างพลัม มุมล่างเข้ม */
export function drawLevelRewardBackground(ctx, w, h) {
  const R = Math.max(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#9264D4');
  g.addColorStop(0.45, '#8657C8');
  g.addColorStop(1, '#4F2A86');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  drawMagicGlow(ctx, w / 2, h * 0.42, R * 0.45, LAVENDER, 0.16);
  const v = ctx.createRadialGradient(w / 2, h * 0.45, R * 0.28, w / 2, h * 0.45, R * 0.78);
  v.addColorStop(0, `rgba(${PLUM},0)`);
  v.addColorStop(1, `rgba(${PLUM},0.42)`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** ลำแสงเฉียงจาง ๆ หายใจช้า ๆ */
export function drawLevelLightRays(ctx, w, h, L, t) {
  for (const b of L.rays) {
    const br = 0.7 + 0.3 * Math.sin(t * 0.22 + b.ph);
    const x = b.x * w, bw = b.wd * w;
    const lg = ctx.createLinearGradient(x, 0, x - h * 0.4, h);
    lg.addColorStop(0, `rgba(${ROSE},${b.a * br})`);
    lg.addColorStop(0.8, `rgba(${ROSE},0)`);
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + bw, 0);
    ctx.lineTo(x + bw - h * 0.4, h);
    ctx.lineTo(x - h * 0.4, h);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * แสงแนวตั้งตามรางความคืบหน้า (ช่วงที่มองเห็นในช่องรายการ) — หลายวงรีโปร่งเรียงตามราง
 * ส่วนที่เดินมาแล้ว (เหนือหมุดปัจจุบัน) อุ่นกว่า ส่วนข้างหน้าเป็นลาเวนเดอร์นวล
 */
export function drawLevelPathGlow(ctx, rail, track, here, t) {
  const x = track.x + track.w / 2;
  const top = Math.max(rail.y, track.y), bot = Math.min(rail.y + rail.h, track.y + track.h);
  if (bot <= top) return;
  const pulse = 0.85 + 0.15 * Math.sin(t * 0.8);
  const step = 26;
  for (let y = top; y <= bot; y += step) {
    const passed = here ? y < here.y + here.h / 2 : true;
    drawMagicGlow(ctx, x, y, track.w * 3.2, passed ? ROSE : LAVENDER, (passed ? 0.12 : 0.09) * pulse * rail.a);
  }
}

function blocked(M, x, y, r) {
  for (const z of M.zones) if (x + r > z.x && x - r < z.x + z.w && y + r > z.y && y - r < z.y + z.h) return true;
  return false;
}

/**
 * พื้นหลังเส้นทางเติบโตของหน้ารางวัลเลเวล
 * @param canvas   ผ้าใบลูกคนแรกของการ์ดใหญ่
 * @param isActive แผงเปิดอยู่ไหม
 * @param pop      การ์ดใหญ่ (.pop)
 */
export function makeLevelBg(canvas, isActive, pop) {
  const L = layout();
  const M = {
    w: 0, h: 0, at: -Infinity, zones: [],
    motifAt: L.motifs.map(() => null), sparkOk: L.sparkles.map(() => false), tinyOk: L.tiny.map(() => false),
    railEl: null, trackEl: null, hereEl: null, nowEl: null, railLeft: 0, railRight: 0,
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
    const taken = [];
    L.motifs.forEach((m, i) => {
      M.motifAt[i] = m.spots.find(([x, y]) => !blocked(M, x * w, y * h, m.s * u * 1.5)
        && !taken.some(([tx, ty]) => Math.hypot((tx - x) * w, (ty - y) * h) < 26 * u)) || null;
      if (M.motifAt[i]) taken.push(M.motifAt[i]);
    });
    L.sparkles.forEach((s, i) => { M.sparkOk[i] = !blocked(M, s.x * w, s.y * h, s.r * u * 1.5); });
    L.tiny.forEach((s, i) => { M.tinyOk[i] = !blocked(M, s.x * w, s.y * h, 4); });
    M.railEl = pop.querySelector('.lv-rail');
    M.trackEl = pop.querySelector('.lv-track');
    M.hereEl = pop.querySelector('.lv-here');
    M.nowEl = pop.querySelector('.lv-now');
  }

  const railBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const trackBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const hereBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const nowBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const track = (el, w, out) => trackRect(canvas, pop, el, w, out);

  function live(ctx, w, h, _L, t) {
    const stale = (M.trackEl && !M.trackEl.isConnected) || (!M.trackEl && pop.querySelector('.lv-track'));
    if (stale || t - M.at > REMEASURE_S || t < M.at || w !== M.w || h !== M.h) {
      measure(w, h);
      M.at = t;
    }
    const u = Math.min(w, h) / 400;
    drawLevelLightRays(ctx, w, h, L, t);

    // แสงบอกความคืบหน้าหลังแถบสรุปเลเวล — รั่วออกรอบขอบแถบ
    const nb = track(M.nowEl, w, nowBox);
    if (nb && nb.w) {
      drawMagicGlow(ctx, nb.x + nb.w / 2, nb.y + nb.h / 2, nb.w * 0.6, ROSE, 0.2 * nb.a);
      drawMagicGlow(ctx, nb.x + nb.w / 2, nb.y + nb.h / 2, nb.w * 0.4, BUTTER, 0.08 * nb.a);
    }

    const rb = track(M.railEl, w, railBox);
    const tb = track(M.trackEl, w, trackBox);
    const hb = track(M.hereEl, w, hereBox);
    if (rb && tb && rb.w) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, rb.y, w, rb.h);
      ctx.clip();
      // แสงตามราง (ลอดผ่านช่องระหว่างการ์ด)
      drawLevelPathGlow(ctx, rb, tb, hb && hb.w ? hb : null, t);
      // สปอตไลต์ตรงหมุด "ตอนนี้อยู่ตรงนี้"
      if (hb && hb.w && hb.y + hb.h > rb.y && hb.y < rb.y + rb.h) {
        const cx = tb.x + tb.w / 2, cy = hb.y + hb.h / 2;
        const br = 0.9 + 0.1 * Math.sin(t * 0.9);
        drawMagicGlow(ctx, cx + hb.w * 0.25, cy, hb.w * 0.55 * br, LAVENDER, 0.26 * hb.a);
        drawMagicGlow(ctx, cx, cy, tb.w * 3.5, CREAM, 0.3 * hb.a * br);
      }
      ctx.restore();
      // รอยเท้าเดินสลับซ้ายขวาเลียบราง — นอกช่องรายการด้านซ้าย ไล่จากล่างขึ้นบน จางลงไปข้างหน้า
      const px = rb.x - 14 * u;
      if (px > 10 * u) {
        const n = Math.max(3, Math.floor(rb.h / (34 * u)));
        for (let i = 0; i < n; i++) {
          const y = rb.y + rb.h - (i + 0.5) * (rb.h / n);
          const x = px + (i % 2 ? -5 : 5) * u;
          if (blocked(M, x, y, 5 * u)) continue;
          drawPawPrint(ctx, x, y, 3.6 * u, -0.08 + (i % 2 ? -0.2 : 0.2), (0.24 - i * 0.012) * rb.a, i % 3 === 0 ? ROSE : CREAM);
        }
      }
    }

    // ลวดลายแมวจิ๋ว
    L.motifs.forEach((m, i) => {
      const at = M.motifAt[i];
      if (!at) return;
      if (m.k === 'heart') drawHeart(ctx, at[0] * w, at[1] * h, m.s * u, m.a, m.c);
      else drawDoodle(ctx, m.k, at[0] * w, at[1] * h, m.s * u, 0, m.a, m.c);
    });
    // ประกายกับจุดแสงจิ๋ว
    L.sparkles.forEach((s, i) => {
      if (!M.sparkOk[i]) return;
      const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
      drawSparkle(ctx, s.x * w, s.y * h, s.r * u * (0.8 + tw * 0.3), 0.14 + tw * 0.36, s.c);
    });
    L.tiny.forEach((s, i) => {
      if (!M.tinyOk[i]) return;
      ctx.globalAlpha = 0.12 + 0.2 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.ph));
      ctx.fillStyle = `rgb(${s.c})`;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r * u, 0, TAU);
      ctx.fill();
    });
    // ละอองลอยขึ้น — "ไปหารางวัลถัดไป"
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

  const bg = makeCanvasBg(canvas, isActive, { layout: () => L, still: drawLevelRewardBackground, live });
  pop.addEventListener('click', () => { M.at = -Infinity; }, true);
  if (import.meta.env.DEV) window.__levelBgM = M;
  return { kick: () => { M.at = -Infinity; bg.kick(); } };
}
