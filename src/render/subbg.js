// src/render/subbg.js
// ─────────────────────────────────────────────────────────────
// พื้นหลังหน้าย่อย (ภาพนิ่ง) — หน้าย่อยที่ยังไม่มีพื้นหลังของตัวเอง (รายละเอียดสมบัติ ตีบวก อ่านจดหมาย
// เรื่องราวน้อง ตั้งชื่อ พัก ยืนยัน ฯลฯ) ได้พื้นหลังน่ารักชุดเดียวกับหน้าใหญ่ แต่ "ไม่ขยับ"
//
// ── ทำไมเป็นภาพนิ่ง ──
// ผู้ใช้ขอไม่ให้กินแรงเครื่อง: วาดครั้งเดียวตอนแผงเปิด (และตอนเปลี่ยนขนาด) แล้วจบ — ไม่มีลูปเลย
//
// ── หน้าตา ──
// พื้นม่วงไล่สีโทนเดียวกับหน้าอื่น + แสงชมพูนวลด้านบน + เมฆนุ่มมุมล่าง + ประกายดาวโปรย
// + ลายประจำหน้า (theme) จาง ๆ ตามขอบ/มุม — กลางการ์ดโล่งไว้ให้เนื้อหา
// ลายใช้ตัววาดเดิมจากพื้นหลังหน้าอื่น (ซองจดหมาย เพชร เหรียญ ลายเส้นแมว) จึงเป็นภาษาเดียวกันทั้งเกม
// ─────────────────────────────────────────────────────────────
import { drawMagicGlow, drawSparkle, drawSoftCloud } from './skillbg.js';
import { drawDoodle } from './creativebg.js';
import { drawEnvelope } from './mailbg.js';
import { drawDiamond, drawCoin, drawGiftBox } from './gachabg.js';
import { drawCrescent } from './settingsbg.js';
import { drawCrown } from './rankbg.js';

const ROSE = '247,199,232';
const LAVENDER = '206,178,248';
const CREAM = '255,246,232';
const BUTTER = '254,224,175';
const MINT = '176,240,226';
const SKY = '186,214,255';
const TAU = Math.PI * 2;

/** ตัวสุ่มแบบมีเมล็ด — ลายอยู่ที่เดิมทุกครั้งที่เปิดหน้า */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * ลายประจำหน้า — แต่ละลายคือฟังก์ชันวาด (ctx, x, y, u = หน่วยขนาด, rot, a = ความทึบ)
 * ลายเส้น (doodle) จางกว่าลายทึบ เพราะเส้นบาง ๆ ต้องทึบกว่านิดถึงจะเห็น
 */
const MOTIF = {
  paw: (c, x, y, u, r, a) => drawDoodle(c, 'paw', x, y, 7 * u, r, a * 1.3, CREAM),
  heart: (c, x, y, u, r, a) => drawDoodle(c, 'heart', x, y, 7 * u, r, a * 1.3, ROSE),
  star: (c, x, y, u, r, a) => drawDoodle(c, 'star', x, y, 7 * u, r, a * 1.3, BUTTER),
  fish: (c, x, y, u, r, a) => drawDoodle(c, 'fish', x, y, 8 * u, r, a * 1.3, MINT),
  ears: (c, x, y, u, r, a) => drawDoodle(c, 'ears', x, y, 8 * u, r, a * 1.3, LAVENDER),
  envelope: (c, x, y, u, r, a) => drawEnvelope(c, x, y, 22 * u, r, a, CREAM),
  gem: (c, x, y, u, r, a) => drawDiamond(c, x, y, 8 * u, a, ROSE),
  gemBlue: (c, x, y, u, r, a) => drawDiamond(c, x, y, 7 * u, a, SKY),
  coin: (c, x, y, u, r, a) => drawCoin(c, x, y, 6 * u, a),
  gift: (c, x, y, u, r, a) => drawGiftBox(c, x, y, 9 * u, a),
  crown: (c, x, y, u, r, a) => drawCrown(c, x, y, 9 * u, a),
  moon: (c, x, y, u, r, a) => drawCrescent(c, x, y, 9 * u, a * 1.4, CREAM),
};

/** ชุดลายตามหน้า + สีแสงนวล — glow = แสงชมพู/ฟ้า/ทอง ด้านบนกลาง */
const THEMES = {
  cat: { motifs: ['paw', 'heart', 'ears', 'fish'], glow: ROSE },
  mail: { motifs: ['envelope', 'heart', 'star'], glow: ROSE },
  treasure: { motifs: ['gem', 'coin', 'gemBlue', 'star'], glow: BUTTER },
  forge: { motifs: ['gem', 'star', 'coin', 'gemBlue'], glow: BUTTER },
  outfit: { motifs: ['gift', 'heart', 'star', 'gem'], glow: ROSE },
  stage: { motifs: ['star', 'moon', 'paw'], glow: SKY },
  play: { motifs: ['fish', 'paw', 'star', 'heart'], glow: MINT },
  system: { motifs: ['moon', 'star', 'paw'], glow: LAVENDER },
  royal: { motifs: ['crown', 'star', 'gem'], glow: BUTTER },
};

/** วาดทั้งผืน (ภาพนิ่ง) ขนาด w×h หน่วย CSS */
export function drawSubBackground(ctx, w, h, themeName = 'cat', seed = 7) {
  const th = THEMES[themeName] || THEMES.cat;
  const R = Math.max(w, h);
  const u = Math.max(0.8, Math.min(w, h) / 320);

  // พื้นม่วงไล่ (บนลาเวนเดอร์ → ล่างพลัม) — โทนเดียวกับหน้าอื่นในเกม
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#A06FDC');
  base.addColorStop(0.55, '#8656C8');
  base.addColorStop(1, '#6A3BAE');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // แสงนวลด้านบนกลาง (สีตามหน้า) + กลางการ์ดสว่างอ่อน ๆ
  drawMagicGlow(ctx, w / 2, 0, R * 0.5, th.glow, 0.34);
  drawMagicGlow(ctx, w / 2, h * 0.45, R * 0.5, LAVENDER, 0.18);
  // ขอบพลัมจาง ๆ ให้ภาพมีน้ำหนักตรงขอบ
  const v = ctx.createRadialGradient(w / 2, h / 2, R * 0.28, w / 2, h / 2, R * 0.78);
  v.addColorStop(0, 'rgba(56,22,100,0)');
  v.addColorStop(1, 'rgba(56,22,100,.34)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);

  // เมฆนุ่มมุมล่างสองข้าง (ส่วนใหญ่ล้นออกนอกการ์ด)
  const cs = Math.min(w, h) * 0.32;
  drawSoftCloud(ctx, w * 0.04, h + cs * 0.05, cs * 1.5, 0.16, ROSE);
  drawSoftCloud(ctx, w * 0.18, h + cs * 0.22, cs * 1.1, 0.12, LAVENDER);
  drawSoftCloud(ctx, w * 0.96, h + cs * 0.08, cs * 1.4, 0.15, LAVENDER);
  drawSoftCloud(ctx, w * 0.8, h + cs * 0.24, cs * 1.0, 0.11, ROSE);

  const rnd = seeded(seed * 9973 + themeName.length * 131);
  // ── ลายประจำหน้า: ไล่ตามขอบสองข้าง + มุมบน (เว้นกลางการ์ดกับแถบหัวเรื่องกลางบน) ──
  const spots = [];
  const edge = Math.min(w * 0.14, 90);
  for (let i = 0; i < 5; i++) {
    spots.push([edge * (0.35 + rnd() * 0.5), h * (0.18 + i * 0.17 + rnd() * 0.06)]);
    spots.push([w - edge * (0.35 + rnd() * 0.5), h * (0.18 + i * 0.17 + rnd() * 0.06)]);
  }
  spots.push([w * 0.2 + rnd() * w * 0.08, h * 0.06 + rnd() * 10]);
  spots.push([w * 0.72 + rnd() * w * 0.08, h * 0.06 + rnd() * 10]);
  spots.forEach(([x, y], i) => {
    const kind = th.motifs[i % th.motifs.length];
    MOTIF[kind](ctx, x, y, u * (0.8 + rnd() * 0.5), (rnd() - 0.5) * 0.9, 0.22 + rnd() * 0.1);
  });

  // ── ประกายดาวโปรยทั่ว (เล็ก จาง) ──
  for (let i = 0; i < 14; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const big = rnd() < 0.25;
    drawSparkle(ctx, x, y, (big ? 5 : 2.6) * u, big ? 0.3 : 0.22, i % 3 ? CREAM : BUTTER);
  }
  // จุดแสงกลม ๆ ไม่กี่จุด
  ctx.save();
  for (let i = 0; i < 10; i++) {
    ctx.globalAlpha = 0.12 + rnd() * 0.12;
    ctx.fillStyle = `rgb(${i % 2 ? CREAM : ROSE})`;
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, (1 + rnd() * 1.8) * u, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * ติดพื้นหลังภาพนิ่งให้แผงหนึ่ง — ใส่ผ้าใบเป็นลูกคนแรกของ .pop แล้ววาดตอนแผงเปิด/เปลี่ยนขนาดเท่านั้น
 * @param panel  .panel
 * @param theme  ชื่อชุดลาย (ดู THEMES)
 */
export function attachSubBg(panel, theme, seed = 7) {
  const pop = panel.querySelector(':scope > .pop');
  if (!pop || pop.querySelector(':scope > .sub-bg')) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'sub-bg';
  canvas.setAttribute('aria-hidden', 'true');
  pop.prepend(canvas);
  pop.classList.add('has-subbg');
  let drawnW = 0, drawnH = 0;
  const paint = () => {
    if (panel.classList.contains('hidden')) return;
    const w = pop.offsetWidth, h = pop.offsetHeight;
    if (!w || !h || (w === drawnW && h === drawnH)) return;
    drawnW = w;
    drawnH = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSubBackground(ctx, w, h, theme, seed);
  };
  new MutationObserver(paint).observe(panel, { attributes: true, attributeFilter: ['class'] });
  if (window.ResizeObserver) new ResizeObserver(paint).observe(pop);
  paint();
}
