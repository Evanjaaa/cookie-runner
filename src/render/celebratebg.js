// src/render/celebratebg.js
//
// ══ พื้นหลัง "งานฉลองเล็ก ๆ ตอนได้ของใหม่" ของหน้ารับรางวัล ═══════════════
//
// วาดด้วย Canvas 2D ล้วน ไม่มีไฟล์ภาพ — ตัวคุมผ้าใบชุดเดียวกับหน้าอื่น (makeCanvasBg)
// ใช้กับทุกหน้าที่มีริบบิ้นโปรยตอนได้ของ:
//   · ผลสุ่มในตู้กาช่า (.gacha-result ลอยทับการ์ดตู้)
//   · กล่องรับของ (#rewardPanel — ของจากจดหมาย กิจกรรม รางวัลเลเวล เช็คอิน ฯลฯ)
//
// ── ภาพ ──
//   พื้นม่วงเข้มขอบมืด · สปอตไลต์นุ่มสามชั้นหลังของที่ได้ (ลาเวนเดอร์ → ครีมอุ่น → แกนทองขาว)
//   ลำแสงจาง ๆ 12 แท่งหมุนช้ามากแผ่ออกจากกลาง (เรียวปลาย จางก่อนถึงขอบ)
//   ประกายสี่แฉกรอบของ · ละอองแสงลอยขึ้น/กระจายออก · กระดาษสีจิ๋วนิดหน่อย · รอยเท้า/หัวใจ/ดาวจิ๋วริมขอบ
//   ริบบิ้นโปรยของเดิม (CSS) ยังอยู่ชั้นบน — พื้นหลังนี้ไม่แทนที่ แค่ทำให้ฉากฉลองมีแสงรองรับ
//
// ── จังหวะเปิด ── (นับจากตอนกล่องเปิด ไม่ใช่ตอนสร้างผ้าใบ)
//   0 → 0.15 วิ พื้นม่วง · 0.15 วิ แสงกลางโผล่ · 0.25 วิ คลื่นแสงขยายออกหนึ่งวง
//   0.4 วิ ประกายโผล่ · 0.6 วิ ละอองเริ่มลอย · 1 วิขึ้นไป หายใจเบา ๆ
//
// ── หลักของภาพ ──
//   ของที่ได้ > หัวเรื่อง > การ์ด > ปุ่มตกลง > พื้นหลัง — ไม่มีประกายหรือละอองไปอยู่หลังการ์ด/ตัวหนังสือ/ปุ่ม
//   ทองใช้แค่แกนกลางกับประกายบางดวง ม่วงยังเป็นหลัก · ไม่มีพลุ ไม่มีกะพริบ ไม่ใช่หน้าคาสิโน
//   ระดับของ (มีอยู่แล้วในการ์ด: legend / epic / rare / high / rank-ss) ปรับแค่สีแสงกลางนิดหน่อย
//
// ── แสงที่เกาะของจริง ── สปอตไลต์ตามแถวการ์ด / แสงใต้หัวเรื่อง ใช้ trackRect (ตามตำแหน่ง+ความทึบที่ตาเห็น)

import { makeCanvasBg, drawPawPrint, drawHeart } from './dreambg.js';
import { drawMagicGlow, drawSparkle, drawTinyStar } from './skillbg.js';
import { trackRect } from './event-bg.js';

const TAU = Math.PI * 2;

const PLUM = '46,17,73';
const LAVENDER = '206,178,248';
const ROSE = '247,199,232';
const CREAM = '255,246,232';
const GOLD = '255,214,120';
const MINT = '176,240,226';
const SKY = '178,214,250';
const CONFETTI = [GOLD, ROSE, LAVENDER, MINT, CREAM];

/** สีแสงกลางตามระดับของที่ได้ (มีอยู่ในคลาสการ์ดอยู่แล้ว ไม่ได้สร้างระบบระดับใหม่) */
const RARITY = {
  common: { mid: LAVENDER, core: CREAM, gold: 0.5 },
  rare: { mid: SKY, core: CREAM, gold: 0.6 },
  epic: { mid: LAVENDER, core: GOLD, gold: 0.85 },
  legend: { mid: ROSE, core: GOLD, gold: 1 },
};

/** โซนห้ามวาด — ของที่ผู้เล่นอ่าน/กดจริง */
const KEEP_OUT = ['.got-title', '.got-card', '.got-note:not(.hidden)', '.btn'];

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function layout() {
  const rand = seeded(20261014);
  const L = {};
  L.rays = Array.from({ length: 12 }, (_, i) => ({
    a: (i / 12) * TAU + (rand() - 0.5) * 0.15,
    wd: 0.035 + rand() * 0.035,
    len: 0.55 + rand() * 0.25,
    c: [LAVENDER, ROSE, GOLD][i % 3],
  }));
  // ประกายกลาง: วงรอบของที่ได้ (มุม + ระยะเป็นสัดส่วนของสปอตไลต์)
  L.sparkles = Array.from({ length: 6 }, (_, i) => ({
    a: (i / 6) * TAU + 0.4 + (rand() - 0.5) * 0.4,
    d: 0.85 + rand() * 0.35,
    r: 5 + rand() * 4,
    ph: rand() * TAU,
    c: [GOLD, CREAM, ROSE][i % 3],
  }));
  // ประกายจิ๋วทั่วการ์ด
  L.tiny = Array.from({ length: 12 }, (_, i) => ({ x: rand(), y: rand(), r: 1.6 + rand() * 1.8, ph: rand() * TAU, c: [CREAM, GOLD, LAVENDER][i % 3] }));
  // ละอองแสง: ส่วนหนึ่งลอยขึ้น ส่วนหนึ่งกระจายออกจากกลาง
  L.motes = Array.from({ length: 16 }, (_, i) => ({
    out: i % 3 === 0, a: rand() * TAU, x: rand(), y: rand(), v: 0.012 + rand() * 0.014,
    sw: rand() * TAU, r: 0.9 + rand() * 1.4, c: [CREAM, GOLD, ROSE, LAVENDER][i % 4],
  }));
  // กระดาษสีจิ๋วร่วงช้า ๆ (น้อยมาก — ริบบิ้นหลักเป็นของ CSS อยู่แล้ว)
  L.confetti = Array.from({ length: 8 }, (_, i) => ({
    x: rand(), y: rand(), v: 0.02 + rand() * 0.02, rot: rand() * TAU, vr: (rand() - 0.5) * 1.2,
    s: 3 + rand() * 2.5, c: CONFETTI[i % CONFETTI.length], round: i % 3 === 0,
  }));
  // ของจิ๋วริมขอบ (นิ่ง)
  L.edge = [
    { k: 'paw', x: 0.06, y: 0.9 }, { k: 'heart', x: 0.94, y: 0.12 }, { k: 'star', x: 0.07, y: 0.14 },
    { k: 'paw', x: 0.93, y: 0.9 }, { k: 'heart', x: 0.05, y: 0.55 }, { k: 'star', x: 0.95, y: 0.55 },
  ];
  return L;
}

/** ชั้นนิ่ง — ม่วงเข้ม ขอบมืด (สปอตไลต์วาดในชั้นเคลื่อนไหว เพราะต้องตามของที่ได้) */
export function drawRewardBackground(ctx, w, h) {
  const R = Math.max(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#7A3FB0');
  g.addColorStop(0.5, '#5A2A8C');
  g.addColorStop(1, '#341457');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const v = ctx.createRadialGradient(w / 2, h * 0.45, R * 0.2, w / 2, h * 0.45, R * 0.75);
  v.addColorStop(0, `rgba(${PLUM},0)`);
  v.addColorStop(1, `rgba(${PLUM},0.55)`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** สปอตไลต์สามชั้นหลังของที่ได้ — k = ความสว่างตามจังหวะเปิด (0..1) */
export function drawRewardSpotlight(ctx, cx, cy, r, tone, k, breathe) {
  drawMagicGlow(ctx, cx, cy, r * 1.7, tone.mid, 0.34 * k * breathe);
  drawMagicGlow(ctx, cx, cy, r * 1.05, CREAM, 0.26 * k * breathe);
  drawMagicGlow(ctx, cx, cy, r * 0.45, tone.core, 0.34 * k * tone.gold);
}

/** ลำแสงเรียวแผ่ออกจากกลาง หมุนช้ามาก จางก่อนถึงขอบ */
export function drawRewardRays(ctx, cx, cy, R, L, t, k) {
  const spin = t * 0.04;
  for (const r of L.rays) {
    const a = r.a + spin;
    const len = Math.min(R * r.len, Math.min(R, 900) * 0.42);   // จางก่อนถึงขอบ — การ์ดใหญ่ไม่ยาวเป็นไฟฉาย
    const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    g.addColorStop(0, `rgba(${r.c},${0.085 * k})`);
    g.addColorStop(1, `rgba(${r.c},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - r.wd) * len, cy + Math.sin(a - r.wd) * len);
    ctx.lineTo(cx + Math.cos(a + r.wd) * len, cy + Math.sin(a + r.wd) * len);
    ctx.closePath();
    ctx.fill();
  }
}

function blocked(zones, x, y, r) {
  for (const z of zones) if (x + r > z.x && x - r < z.x + z.w && y + r > z.y && y - r < z.y + z.h) return true;
  return false;
}

/**
 * พื้นหลังฉลองของกล่องรับของ
 * @param canvas   ผ้าใบลูกคนแรกของกล่อง (ใต้ริบบิ้นโปรยกับเนื้อหา)
 * @param isActive กล่องเปิดอยู่ไหม
 * @param host     กล่อง (.pop.reward-pop / .gacha-result) — วัดแถวการ์ด หัวเรื่อง ปุ่ม
 * คืน { kick } — เรียกตอนกล่องเปิด (ตัวเฝ้าคลาส) จังหวะเปิดจะเริ่มนับใหม่
 */
export function makeCelebrateBg(canvas, isActive, host) {
  const L = layout();
  let openAt = performance.now();
  let wasActive = false;
  const zones = [];
  let measuredAt = 0;
  const rowBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const titleBox = { x: 0, y: 0, w: 0, h: 0, a: 1 };
  const edgeOk = L.edge.map(() => true);
  let tone = RARITY.common;

  function measure(w) {
    const cr = canvas.getBoundingClientRect();
    if (!cr.width) return;
    const k = w / cr.width;
    zones.length = 0;
    for (const sel of KEEP_OUT) {
      for (const el of host.querySelectorAll(sel)) {
        if (!el.offsetParent || !el.offsetWidth) continue;
        const r = el.getBoundingClientRect();
        zones.push({ x: (r.left - cr.left - 6) * k, y: (r.top - cr.top - 6) * k, w: (r.width + 12) * k, h: (r.height + 12) * k });
      }
    }
    const cards = host.querySelector('.got-row');
    tone = cards?.querySelector('.legend, .high, .rank-ss') ? RARITY.legend
      : cards?.querySelector('.epic, .rank-s') ? RARITY.epic
        : cards?.querySelector('.rare, .rank-a') ? RARITY.rare : RARITY.common;
  }

  function live(ctx, w, h, _L, t) {
    const now = performance.now();
    if (now - measuredAt > 400) {
      measure(w);
      measuredAt = now;
      L.edge.forEach((e, i) => { edgeOk[i] = !blocked(zones, e.x * w, e.y * h, 10); });
    }
    const since = (now - openAt) / 1000;
    const R = Math.max(w, h);
    const u = Math.min(w, h) / 400;
    // ── จังหวะเปิด ──
    const kLight = Math.min(1, Math.max(0, (since - 0.15) / 0.3));
    const kSpark = Math.min(1, Math.max(0, (since - 0.4) / 0.35));
    const kMote = Math.min(1, Math.max(0, (since - 0.6) / 0.5));
    const breathe = 0.9 + 0.1 * Math.sin(t * 1.1);

    // ศูนย์กลางแสง = กลางแถวการ์ดที่ตาเห็น (ไม่มีการ์ด = กลางกล่องค่อนบน)
    const rb = trackRect(canvas, host, host.querySelector('.got-row'), w, rowBox);
    const hasRow = rb && rb.w > 0 && rb.h > 0;
    const cx = hasRow ? rb.x + rb.w / 2 : w / 2;
    const cy = hasRow ? rb.y + Math.min(rb.h, h * 0.4) / 2 : h * 0.45;
    const sr = hasRow ? Math.max(Math.min(rb.w, w * 0.5), rb.h) * 0.55 : Math.min(w, h) * 0.25;
    const fade = hasRow ? Math.max(0.35, rb.a) : 1;

    drawRewardRays(ctx, cx, cy, R, L, t, kLight * fade);
    drawRewardSpotlight(ctx, cx, cy, sr, tone, kLight * fade, breathe);
    // คลื่นแสงขยายออกหนึ่งวงตอนเปิด (0.25 → ~1.1 วิ)
    const wave = (since - 0.25) / 0.85;
    if (wave > 0 && wave < 1) {
      ctx.save();
      ctx.globalAlpha = 0.35 * (1 - wave);
      ctx.strokeStyle = `rgb(${CREAM})`;
      ctx.lineWidth = 3 * (1 - wave) + 1;
      ctx.beginPath();
      ctx.arc(cx, cy, sr * (0.4 + wave * 1.6), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    // แสงทองนวลใต้หัวเรื่อง
    const tb = trackRect(canvas, host, host.querySelector('.got-title'), w, titleBox);
    if (tb) drawMagicGlow(ctx, tb.x + tb.w / 2, tb.y + tb.h / 2, Math.max(tb.w * 0.6, 70), GOLD, 0.14 * kLight * tb.a);

    // ประกายสี่แฉกรอบของที่ได้ (ข้ามตัวที่ตกบนการ์ด/ตัวหนังสือ)
    for (const s of L.sparkles) {
      const x = cx + Math.cos(s.a + t * 0.05) * sr * s.d * 1.5;
      const y = cy + Math.sin(s.a + t * 0.05) * sr * s.d;
      if (blocked(zones, x, y, s.r * u)) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * 1.3 + s.ph);
      drawSparkle(ctx, x, y, s.r * u * (0.75 + tw * 0.35), (0.25 + tw * 0.45) * kSpark, s.c);
    }
    for (const s of L.tiny) {
      const x = s.x * w, y = s.y * h;
      if (blocked(zones, x, y, 4)) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * 1.6 + s.ph);
      ctx.globalAlpha = (0.15 + tw * 0.35) * kSpark;
      ctx.fillStyle = `rgb(${s.c})`;
      ctx.beginPath();
      ctx.arc(x, y, s.r * u * 0.7, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ละอองแสง
    for (const m of L.motes) {
      let x, y, a;
      if (m.out) {
        const p = ((since * 0.12 + m.y) % 1);
        x = cx + Math.cos(m.a) * p * R * 0.55;
        y = cy + Math.sin(m.a) * p * R * 0.4;
        a = 0.4 * Math.sin(p * Math.PI);
      } else {
        const yy = 1.05 - ((m.y + t * m.v) % 1.1);
        x = (m.x + Math.sin(t * 0.6 + m.sw) * 0.015) * w;
        y = yy * h;
        a = 0.32 * Math.min(1, (1.05 - yy) * 6) * Math.min(1, yy * 4);
      }
      if (a <= 0.02 || blocked(zones, x, y, 4)) continue;
      ctx.globalAlpha = a * kMote;
      ctx.fillStyle = `rgb(${m.c})`;
      ctx.beginPath();
      ctx.arc(x, y, m.r * u, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // กระดาษสีจิ๋ว
    for (const c of L.confetti) {
      const y = ((c.y + t * c.v) % 1.1) - 0.05;
      const x = (c.x + Math.sin(t * 0.8 + c.rot) * 0.02) * w;
      if (blocked(zones, x, y * h, 5)) continue;
      ctx.save();
      ctx.translate(x, y * h);
      ctx.rotate(c.rot + t * c.vr);
      ctx.scale(Math.max(0.3, Math.abs(Math.cos(t * 1.4 + c.rot))), 1);
      ctx.globalAlpha = 0.45 * kMote;
      ctx.fillStyle = `rgb(${c.c})`;
      ctx.beginPath();
      if (c.round) ctx.arc(0, 0, c.s * u * 0.5, 0, TAU);
      else ctx.rect(-c.s * u * 0.5, -c.s * u * 0.3, c.s * u, c.s * u * 0.6);
      ctx.fill();
      ctx.restore();
    }

    // ของจิ๋วริมขอบ (รอยเท้า หัวใจ ดาว)
    L.edge.forEach((e, i) => {
      if (!edgeOk[i]) return;
      const x = e.x * w, y = e.y * h;
      if (e.k === 'paw') drawPawPrint(ctx, x, y, 4 * u, -0.4, 0.16 * kSpark, CREAM);
      else if (e.k === 'heart') drawHeart(ctx, x, y, 3.5 * u, 0.22 * kSpark, ROSE);
      else drawTinyStar(ctx, x, y, 3.5 * u, 0.24 * kSpark, GOLD);
    });
  }

  const bg = makeCanvasBg(canvas, isActive, { layout: () => L, still: drawRewardBackground, live });
  return {
    kick() {
      const on = isActive();
      if (on && !wasActive) { openAt = performance.now(); measuredAt = 0; }
      wasActive = on;
      bg.kick();
    },
  };
}
