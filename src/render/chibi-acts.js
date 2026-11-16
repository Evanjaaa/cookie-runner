// src/render/chibi-acts.js
// ─────────────────────────────────────────────────────────────
// ท่าทางของลูกแมวจิบิ (ผู้ใช้ 15 พ.ย. 2026: "ทำท่าน้องแมวต่าง ๆ ใน cat-lab — วิ่ง (พุ่งตัวไปข้างหน้าแล้ววิ่งจู๊ดน่ารัก ๆ)
//   กินข้าว · ลงอ่างอาบน้ำแล้วอาบ · กระโดด · ท่ามือดูจากแมวตัวโต") — ยังอยู่แค่ cat-lab (แท็บ 🐣 ลูกแมว)
//
// ทุกท่า = ตัวน้องจิบิตัวเดิม (drawChibi) + ตัวปรับ opt.fx (ยืดยุบ หัวก้ม หูลู่ หางชี้ ตา/ปาก) + เอียงทั้งตัวรอบเท้า
//   + แขนท่อ (chibiTube — แบบแขนท่อของแมวตัวโต เส้นรอบนอกเส้นเดียว) + ของประกอบ (ชาม อ่าง ฟอง ฝุ่น ประกาย)
// คิดจากเวลาอย่างเดียว (t = เฟรม 60fps) ลากหลอดเวลาย้อนได้ภาพเดิม · ท่าที่มีช่วงเข้า (intro) เล่นครั้งเดียวแล้ววนช่วง loop
// พิกัด = หน่วยชีทของน้องจิบิ (เท้า y 0 · ขึ้น = ลบ) หันซ้าย (หน้า = −x) · faceRight = กลับทั้งท่ารวมของประกอบ
// ─────────────────────────────────────────────────────────────
import { drawChibi, chibiWalk4At, CHIBI_INK } from './chibi.js';   // chibiTube (แขนท่อ) มีใน chibi.js ไว้ใช้กับท่าที่ต้องใช้มือ

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
const easeOut = (u) => 1 - (1 - clamp01(u)) ** 3;
/** เด้งหนึบแล้วนิ่ง (ลงพื้น/ยุบตัว) */
const spring = (u, n = 2.5) => (u <= 0 ? 0 : Math.exp(-4 * u) * Math.sin(u * Math.PI * 2 * n));
/**
 * ยืด/ยุบตอนกระโดด (แบบแมวตัวโต CAT_ANIM.squash — ถีบ = ยืดสูงแล้วคลาย · ลงพื้น = แบนแล้วเด้งหนึบ)
 * a = เฟรมนับจากเท้าพ้นพื้น · dur = เฟรมที่ลอย · คืน ลบ = ยืดสูง (−1 สุด) · บวก = แบนกว้าง (1 สุด)
 */
export function jumpSquash(a, dur) {
  if (a < 0) return 0;
  if (a < dur) {
    const u = a / dur;
    const takeoff = Math.exp(-u * 7) * (u < 0.06 ? u / 0.06 : 1);   // ถีบ = ยืดสุดแล้วคลายเร็ว
    const reach = u > 0.72 ? ((u - 0.72) / 0.28) * 0.45 : 0;          // ใกล้ถึงพื้น = ยืดเท้าลงหาพื้นนิด ๆ
    return -(takeoff + reach);
  }
  const l = (a - dur) / 26;   // ลงพื้น: แบน → เด้งยืดนิด → นิ่ง
  return l > 1 ? 0 : Math.exp(-3.2 * l) * Math.cos(l * Math.PI * 2.6);
}
/** สุ่มคงที่ตามเลข (เม็ดฝุ่น/ฟองเดิมทุกครั้งที่ย้อนเวลา) */
const rnd = (k) => { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

/**
 * รายการท่า · intro = ช่วงเข้า (เฟรม เล่นครั้งเดียว) · loop = ช่วงวน (เฟรม) · scroll = พื้นเลื่อนใต้เท้า (หน่วยชีทต่อเฟรม — หน้าทดลองใช้)
 */
export const CHIBI_ACTS = {
  run: { name: 'วิ่ง', icon: '🏃', intro: 40, loop: 28, scroll: 34 / 7 },
  jump: { name: 'กระโดด', icon: '🦘', intro: 0, loop: 130 },
  eat: { name: 'กินข้าว', icon: '🍚', intro: 0, loop: 220 },
  bath: { name: 'อาบน้ำ', icon: '🛁', intro: 74, loop: 320 },
  // เล่นของเล่น (ผู้ใช้ 16 พ.ย. 2026: "เพิ่มท่าน้องเล่นของเล่นในหน้า cat-lab — ปรับทีละช็อต") — ของชุดเดียวกับหีบของเล่นในห้องเลี้ยง
  ball: { name: 'เล่นบอลกระดิ่ง', icon: '🎾', intro: 0, loop: 210 },
  mouse: { name: 'ตะครุบหนูของเล่น', icon: '🐭', intro: 0, loop: 230 },
  feather: { name: 'ตะปบไม้ตกแมว', icon: '🪶', intro: 0, loop: 360 },
};
/** t ทั้งหมด → เวลาในท่า: ช่วงเข้า = t เดิม · หลังจากนั้นวน loop */
const phase = (A, t) => (t < A.intro ? { intro: true, u: t } : { intro: false, u: (t - A.intro) % A.loop });

// ═════════════════════════ ของประกอบ ═════════════════════════
function shadow(ctx, x, rx, a = 0.22) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = '#4A2A5A';
  ctx.beginPath(); ctx.ellipse(x, 4, rx, rx * 0.16, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
/** ฝุ่นก้อนนุ่ม (กลุ่มวงกลมขาวครีม ขอบเส้นจาง) */
export function puff(ctx, x, y, r, a) {
  if (a <= 0.01 || r <= 0.5) return;
  ctx.save();
  ctx.globalAlpha = a;
  const P = new Path2D();
  for (const [dx, dy, k] of [[0, 0, 1], [-0.75, 0.25, 0.7], [0.75, 0.2, 0.75], [0.1, -0.55, 0.65]]) P.moveTo(x + dx * r + k * r, y + dy * r), P.arc(x + dx * r, y + dy * r, k * r, 0, TAU);
  ctx.strokeStyle = 'rgba(170,130,100,.55)'; ctx.lineWidth = 3; ctx.stroke(P);
  ctx.fillStyle = '#FFF7EC'; ctx.fill(P);
  ctx.restore();
}
/** ประกายสี่แฉก */
export function sparkle(ctx, x, y, r, a, col = '#FFE48A') {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a; ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}
export function heart(ctx, x, y, r, a, col = '#FF8FB8') {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a; ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.4, x, y - r * 0.5);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
  ctx.fill();
  ctx.restore();
}
/** เส้นความเร็ว (ขีดมนจาง ๆ หลังตัว) */
function speedLine(ctx, x, y, len, a) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a; ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
  ctx.restore();
}
/** ฟองสบู่ใส (วงขอบฟ้า + แสงวาว) */
export function bubble(ctx, x, y, r, a) {
  // ฟองสบู่ใส (ผู้ใช้ 15 พ.ย. 2026 "ใสเป็นฟอง นุ่มนวลน่ารัก"): ข้างในเกือบใส ขอบเรืองสีรุ้งพาสเทล ไล่จากฟ้า→ชมพู→เหลือง · แสงวาวโค้งบนซ้าย + จุดแสงล่างขวา
  if (a <= 0.01 || r <= 0.3) return;
  ctx.save();
  ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,.06)');
  g.addColorStop(0.72, 'rgba(225,238,255,.16)');
  g.addColorStop(0.9, 'rgba(255,214,240,.42)');
  g.addColorStop(1, 'rgba(190,220,255,.7)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  const rim = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  rim.addColorStop(0, 'rgba(150,200,255,.85)'); rim.addColorStop(0.5, 'rgba(255,170,220,.75)'); rim.addColorStop(1, 'rgba(255,225,150,.8)');
  ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = Math.max(1, r * 0.14); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, r * 0.7, Math.PI * 1.08, Math.PI * 1.42); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.arc(x + r * 0.42, y + r * 0.4, r * 0.1, 0, TAU); ctx.fill();
  ctx.restore();
}
/**
 * ก้อนฟองแชมพู (ผู้ใช้ 15 พ.ย. 2026 วาดใหม่: "ใส ดูเป็นฟอง นุ่มนวลน่ารัก") — ฟองกลมหลายลูกซ้อนเป็นก้อนนุ่ม
 *   ฐานขาวขุ่นโปร่ง (รวมเป็นก้อนเดียว ขอบฟ้าอ่อนบาง) + ฟองใสแต่ละลูกบนผิว (ขอบสีรุ้งจาง แสงวาว) → ดูฟู เบา ใส
 */
export function foam(ctx, list, a = 1, unit = 1) {   // unit = ขนาด 1 หน่วยของ ctx บนฉาก — วาดในพิกัดที่ย่อ (ตัวน้อง) เส้น/เงาเท่าฟองที่วาดเต็มขนาด (ขอบอ่าง)
  // ใสแบบฟองที่กระเด็นตอนเหยียบอ่าง (ผู้ใช้ 15 พ.ย. 2026): ฐานขาวโปร่งมาก · แต่ละลูกข้างในเกือบใส ขอบเรืองสีรุ้งพาสเทล + แสงวาว
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  const P = new Path2D();
  for (const [x, y, r] of list) { P.moveTo(x + r, y); P.arc(x, y, r, 0, TAU); }
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fill(P);   // ขุ่นขึ้นนิด (ผู้ใช้ 15 พ.ย.: เดิม .22 ใสจนเห็นหน้าทะลุ)
  for (const [x, y, r] of list) {
    ctx.save();
    const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,.2)');
    g.addColorStop(0.7, 'rgba(232,242,255,.3)');
    g.addColorStop(0.9, 'rgba(255,214,240,.42)');
    g.addColorStop(1, 'rgba(190,220,255,.66)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    const rim = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    rim.addColorStop(0, 'rgba(150,200,255,.85)'); rim.addColorStop(0.5, 'rgba(255,170,220,.7)'); rim.addColorStop(1, 'rgba(255,225,150,.75)');
    ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1.1 / unit, r * 0.09);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = Math.max(1.1 / unit, r * 0.13); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, r * 0.68, Math.PI * 1.1, Math.PI * 1.43); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(x + r * 0.42, y + r * 0.4, r * 0.1, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** ฟองแชมพูบนหัว (พิกัดตัวน้องจิบิ) · k = ฟูแค่ไหน 0..1 · rot = หัวสะบัด — ท่าอาบน้ำ + ห้องเลี้ยง (home-cats.js) ใช้ร่วม */
export function foamHead(c, k, rot = 0, unit = 1) {
  if (k <= 0.01) return;
  c.save();
  c.translate(0, -219); c.rotate(rot); c.translate(0, 219);
  foam(c, [[-96, -298, 17], [86, -296, 16], [-70, -318, 26], [58, -318, 25], [-30, -336, 30], [16, -334, 29], [-6, -310, 22], [-52, -352, 15], [38, -356, 14], [-8, -366, 12]].map(([x, y, r]) => [x, y + 30 * (1 - k), r * (0.6 + 0.4 * k)]), k, unit);
  c.restore();
}
/**
 * ท่าวิ่งจู๊ด (ช่วงวิ่งวนของท่าวิ่ง) จากจังหวะก้าว ph (0..4 วน) → ตัวเลือกของ drawChibi + เอน/ลอย
 * ห้องเลี้ยงใช้ตอนน้องรีบไปกินข้าว/อาบน้ำ (home-cats.js) — rot ติดลบ = เอนไปข้างหน้า (ตอนหันซ้าย)
 */
export function chibiRunPose(ph) {
  const hop = Math.abs(Math.sin(Math.PI * ph + Math.PI / 2));
  return {
    opt: { view: 'q', act: 'idle', walk4: Math.floor(ph) % 4, walkPhase: ph, fx: { ear: -0.32, mouth: 0.42 + 0.18 * hop, tailRot: 0.42 + 0.12 * Math.sin(ph * 3), sy: 1 + 0.04 * hop, sx: 1 - 0.03 * hop, head: { dy: -2 * hop } } },
    rot: -0.17, lift: 5 * hop,
  };
}

// ── ชามข้าว (หน้าตัว) ──
const BOWL = { w: 86, rim: -58, base: 14 };   // ผู้ใช้ 15 พ.ย.: หน้าต้องจุ่มลงชามจริง — ชามใหญ่ ปากชามสูงกว่าคาง
function bowlBack(ctx, food) {
  // ขอบปากชามด้านใน + กองข้าวเม็ด (food 0..1)
  ctx.save();
  ctx.fillStyle = '#E58AB2';
  ctx.beginPath(); ctx.ellipse(0, BOWL.rim, BOWL.w, 13, 0, 0, TAU); ctx.fill();
  if (food > 0.02) {
    const h = 6 + 16 * food, w = BOWL.w * (0.7 + 0.25 * food);
    const g = ctx.createLinearGradient(0, BOWL.rim - h, 0, BOWL.rim + 6);
    g.addColorStop(0, '#F2BE84'); g.addColorStop(1, '#C88A50');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, BOWL.rim + 2, w, h, 0, Math.PI, TAU); ctx.ellipse(0, BOWL.rim + 2, w, 6, 0, 0, Math.PI); ctx.fill();
    for (let i = 0; i < 16; i++) {
      const u = rnd(i + 3), v = rnd(i + 40);
      const px = (u - 0.5) * 2 * w * 0.82, py = BOWL.rim + 2 - Math.sqrt(Math.max(0, 1 - (px / w) ** 2)) * h * (0.35 + 0.6 * v);
      ctx.fillStyle = i % 3 ? '#B5773F' : '#E8A866';
      ctx.beginPath(); ctx.ellipse(px, py, 4.5, 3.4, u * 3, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}
function bowlFront(ctx) {
  ctx.save();
  const P = new Path2D();
  P.moveTo(-BOWL.w - 4, BOWL.rim);
  P.bezierCurveTo(-BOWL.w + 2, BOWL.base - 2, -BOWL.w * 0.55, BOWL.base + 4, 0, BOWL.base + 4);
  P.bezierCurveTo(BOWL.w * 0.55, BOWL.base + 4, BOWL.w - 2, BOWL.base - 2, BOWL.w + 4, BOWL.rim);
  P.bezierCurveTo(BOWL.w * 0.6, BOWL.rim + 15, -BOWL.w * 0.6, BOWL.rim + 15, -BOWL.w - 4, BOWL.rim);
  P.closePath();
  ctx.strokeStyle = CHIBI_INK; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.stroke(P);
  const g = ctx.createLinearGradient(0, BOWL.rim, 0, BOWL.base);
  g.addColorStop(0, '#FFD1E4'); g.addColorStop(1, '#F29CC2');
  ctx.fillStyle = g; ctx.fill(P);
  // ขอบปากชาม (วงรีด้านหน้า)
  ctx.beginPath(); ctx.ellipse(0, BOWL.rim, BOWL.w + 4, 13, 0, 0.05, Math.PI - 0.05);
  ctx.lineWidth = 3.5; ctx.stroke();
  // อุ้งเท้าขาวกลางชาม + แสงวาว
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath(); ctx.ellipse(6, -16, 11, 9, 0, 0, TAU); ctx.fill();
  for (const [dx, dy] of [[-12, -11], [-5, -17], [5, -17], [12, -11]]) { ctx.beginPath(); ctx.arc(6 + dx, -16 + dy, 3.6, 0, TAU); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath(); ctx.ellipse(-54, -30, 9, 5, -0.5, 0, TAU); ctx.fill();
  ctx.restore();
}

// ── อ่างอาบน้ำ (ตัวน้องนั่งอยู่ข้างใน) ──
const TUB = { w: 196, rim: -84, base: 30 };   // ใหญ่พอให้น้องนั่งแช่ทั้งตัว (ปากอ่างสูงกว่ายอดตัวที่จมลง)
function tubBack(ctx, t) {
  ctx.save();
  // ผนังในด้านหลัง + ผิวน้ำ
  ctx.fillStyle = '#E9F3FB';
  ctx.beginPath(); ctx.ellipse(0, TUB.rim, TUB.w, 26, 0, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = '#BFE2F7';
  ctx.beginPath(); ctx.ellipse(0, TUB.rim + 6, TUB.w - 8, 20, 0, 0, TAU); ctx.fill();
  // ระลอกน้ำ
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const r = ((t * 0.6 + i * 30) % 90) / 90;
    ctx.globalAlpha = 1 - r;
    ctx.beginPath(); ctx.ellipse(-20, TUB.rim + 6, 30 + r * 70, 6 + r * 12, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  }
  ctx.restore();
}
function tubFront(ctx, t) {
  ctx.save();
  const P = new Path2D();
  P.moveTo(-TUB.w - 6, TUB.rim);
  P.bezierCurveTo(-TUB.w, TUB.base - 6, -TUB.w * 0.6, TUB.base, 0, TUB.base);
  P.bezierCurveTo(TUB.w * 0.6, TUB.base, TUB.w, TUB.base - 6, TUB.w + 6, TUB.rim);
  P.bezierCurveTo(TUB.w * 0.6, TUB.rim + 24, -TUB.w * 0.6, TUB.rim + 24, -TUB.w - 6, TUB.rim);
  P.closePath();
  ctx.strokeStyle = CHIBI_INK; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.stroke(P);
  const g = ctx.createLinearGradient(0, TUB.rim, 0, TUB.base);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#DCCBF5');
  ctx.fillStyle = g; ctx.fill(P);
  ctx.beginPath(); ctx.ellipse(0, TUB.rim, TUB.w + 6, 26, 0, 0.04, Math.PI - 0.04); ctx.lineWidth = 3.5; ctx.stroke();
  // ขาอ่างทองสองข้าง + อุ้งเท้าชมพูกลางอ่าง + แสงวาว
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#F2C45A'; ctx.strokeStyle = CHIBI_INK; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.ellipse(sx * (TUB.w - 44), TUB.base + 6, 16, 10, 0, 0, TAU); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#F7A9C8';
  ctx.beginPath(); ctx.ellipse(0, -14, 16, 13, 0, 0, TAU); ctx.fill();
  for (const [dx, dy] of [[-17, -16], [-6, -24], [6, -24], [17, -16]]) { ctx.beginPath(); ctx.arc(dx, -14 + dy, 5.2, 0, TAU); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath(); ctx.ellipse(-124, -50, 18, 7, -0.3, 0, TAU); ctx.fill();
  // ฟองล้นขอบอ่าง (ขยับนิด ๆ)
  const rim = [];
  for (let i = 0; i < 14; i++) {
    const u = i / 13, x = -TUB.w + 12 + u * (TUB.w * 2 - 24);
    rim.push([x, TUB.rim + 4 + Math.sin(u * 9) * 3, 13 + 6 * rnd(i) + Math.sin(t * 0.06 + i) * 1.4]);
  }
  foam(ctx, rim);
  ctx.restore();
}
/** เป็ดยางลอยน้ำ (ข้างน้อง) */
// ── ของเล่น (หน่วยชีท · เส้นหมึกเดียวกับตัวน้อง) ──
/** บอลกระดิ่งชมพู (กลาง x,y รัศมี r) หมุน rot */
function toyBall(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#FFE6F0'); g.addColorStop(0.55, '#FF98BE'); g.addColorStop(1, '#E85E95');
  ctx.fillStyle = g; ctx.strokeStyle = CHIBI_INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-r * 0.85, r * 0.2); ctx.quadraticCurveTo(0, r * 0.75, r * 0.85, r * 0.2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.62, -2.4, -1.2); ctx.stroke();
  ctx.rotate(-rot);
  ctx.fillStyle = '#FFD45A'; ctx.strokeStyle = CHIBI_INK; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, -r - 6, 9, 0, TAU); ctx.fill(); ctx.stroke();   // กระดิ่งทอง
  ctx.fillStyle = CHIBI_INK; ctx.beginPath(); ctx.arc(0, -r - 3, 2.4, 0, TAU); ctx.fill();
  ctx.restore();
}
/** หนูของเล่นสีเทาหูชมพู (กลางลำตัว x · พื้น 0) หันซ้าย (−x) · run = ขาหางสะบัดตอนวิ่ง · squish = โดนตะครุบแบน */
function toyMouse(ctx, x, run, squish = 0) {
  ctx.save();
  ctx.translate(x, 0); ctx.scale(1 + 0.25 * squish, 1 - 0.35 * squish);
  ctx.strokeStyle = '#E79AB5'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(30, -12); ctx.bezierCurveTo(56, -16 + run * 8, 64, 6, 84, -4 - run * 8); ctx.stroke();   // หาง
  const g = ctx.createLinearGradient(0, -40, 0, 0);
  g.addColorStop(0, '#B8ADCB'); g.addColorStop(1, '#8C7FA6');
  ctx.fillStyle = g; ctx.strokeStyle = CHIBI_INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, -18, 38, 19, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-34, -16, 15, 12, -0.2, 0, TAU); ctx.fill(); ctx.stroke();   // หัว
  ctx.fillStyle = '#FFB7CF';
  ctx.beginPath(); ctx.arc(-26, -32, 10, 0, TAU); ctx.fill(); ctx.stroke();   // หู
  ctx.fillStyle = CHIBI_INK; ctx.beginPath(); ctx.arc(-40, -19, 2.8, 0, TAU); ctx.fill();   // ตา
  ctx.fillStyle = '#FF8FB3'; ctx.beginPath(); ctx.arc(-50, -14, 3.6, 0, TAU); ctx.fill();   // จมูก
  ctx.restore();
}
/** ไม้ตกแมว: เชือกห้อยจากบนจอลงมาถึงขนนก (x, y) แกว่ง rot */
function toyFeather(ctx, x, y, rot) {
  ctx.save();
  ctx.strokeStyle = 'rgba(160,120,90,.85)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x + 40, -760); ctx.quadraticCurveTo(x + 30, (y - 760) / 2, x, y); ctx.stroke();
  ctx.translate(x, y); ctx.rotate(rot);
  for (const [col, a, l] of [['#FF8FB8', -0.45, 70], ['#C8A8F5', 0, 82], ['#FFD45A', 0.45, 62]]) {
    ctx.save(); ctx.rotate(a);
    ctx.fillStyle = col; ctx.strokeStyle = CHIBI_INK; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, l / 2, 13, l / 2, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, l - 6); ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = CHIBI_INK; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function duck(ctx, x, y, a) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  const B = new Path2D();
  B.ellipse(0, 0, 24, 14, 0, 0, TAU);
  B.moveTo(-6 + 13, -18); B.arc(-6, -18, 13, 0, TAU);
  ctx.strokeStyle = CHIBI_INK; ctx.lineWidth = 6; ctx.stroke(B);
  ctx.fillStyle = '#FFD84D'; ctx.fill(B);
  ctx.fillStyle = '#FF9F45';
  ctx.beginPath(); ctx.ellipse(-20, -16, 8, 4.5, 0.2, 0, TAU); ctx.fill();
  ctx.fillStyle = CHIBI_INK; ctx.beginPath(); ctx.arc(-9, -21, 2.4, 0, TAU); ctx.fill();
  ctx.restore();
}

// ═════════════════════════ ท่า ═════════════════════════
/**
 * วาดท่า · (x, y) = จุดกลางเท้าบนพื้น · s = ขนาด (หน่วยชีท → หน่วย ctx) · look = หน้าตาน้อง (chibiLookFor)
 * คืน { scroll } = พื้นควรเลื่อนเท่าไรตอนนี้ (หน่วยชีทต่อเฟรม — วิ่ง)
 */
export function drawChibiAct(ctx, x, y, s, { act, t = 0, look, faceRight = false } = {}) {
  const A = CHIBI_ACTS[act];
  if (!A) return { scroll: 0 };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (faceRight) ctx.scale(-1, 1);
  const out = ACT_DRAW[act](ctx, phase(A, t), t, look, A) || {};
  ctx.restore();
  return { scroll: 0, ...out };
}

/** น้องทั้งตัวเอียงรอบเท้า (rot บวก = หัวไปหลัง) + ลอย (lift) แล้ววาด */
function kit(ctx, look, o, { rot = 0, lift = 0, dx = 0, dy = 0 } = {}) {
  ctx.save();
  ctx.translate(dx, dy - lift);
  if (rot) ctx.rotate(rot);
  drawChibi(ctx, 0, 0, 1, { look, ...o });
  ctx.restore();
}

const ACT_DRAW = {
  // ── วิ่ง: ย่อตัวเตรียมพุ่ง (ตาแน่วแน่ หางชี้) → พุ่งทะยาน (ยืดตัว ฝุ่นฟุ้ง) → วิ่งจู๊ดก้าวถี่ ตัวเอนหน้า หูลู่ หางสะบัดตามหลัง ──
  run(ctx, P, t, look, A) {
    if (P.intro) {
      const u = P.u;
      const crouch = ease(u / 22) * (1 - ease((u - 24) / 8));
      const burst = u >= 24 ? 1 - ease((u - 24) / 16) : 0;
      shadow(ctx, -8 * burst, 50 + 8 * crouch);
      // ฝุ่นตอนพุ่งออก (หลังเท้า)
      if (u >= 24) for (let i = 0; i < 4; i++) { const a = (u - 24) / 16; puff(ctx, 40 + i * 16 + a * 60, -8 - i * 6, 10 + a * 14 + i * 2, 0.9 * (1 - a)); }
      if (u >= 24) for (let i = 0; i < 3; i++) speedLine(ctx, 70 + i * 10 - (u - 24) * 2, -70 - i * 50, 50 + i * 12, burst * 0.9);
      const pose = u < 24 ? { view: 'q', act: 'idle' } : { view: 'q', act: 'idle', ...chibiWalk4At(0) };
      kit(ctx, look, {
        ...pose, t,
        fx: {
          sy: 1 - 0.13 * crouch + 0.07 * burst, sx: 1 + 0.09 * crouch - 0.05 * burst,
          ear: -0.28 * crouch - 0.3 * burst, open: 1 - 0.25 * crouch, mouth: burst * 0.5, tailRot: 0.3 * crouch + 0.35 * burst,
          head: { dy: 10 * crouch, rot: 0 },
        },
      }, { rot: 0.07 * crouch - 0.2 * burst, lift: 6 * burst });
      return { scroll: A.scroll * ease((u - 24) / 12) };
    }
    // วิ่งวน: ท่าก้าว 4 จังหวะชุดเดิม เร็วขึ้น 2 เท่า + ตัวลอยสูงกว่าเดิน + เอนหน้า + ขาแตะพื้น = ฝุ่นจิ๋ว
    const beat = 7, ph = (P.u / beat) % 4;
    const hop = Math.abs(Math.sin((Math.PI / 2) * ph * 2 + Math.PI / 2));
    shadow(ctx, -6, 50 - hop * 6, 0.2);
    for (let k = 0; k < 3; k++) {
      // ฝุ่นจากเท้าทุกจังหวะลง (1 · 3) ลอยไปทางหลังตามพื้น
      const born = Math.floor((P.u - k * beat * 2) / (beat * 2)) * beat * 2 + beat;
      const age = P.u - born;
      if (age >= 0 && age < 24) puff(ctx, 28 + age * A.scroll, -6 - age * 0.6, 7 + age * 0.55, 0.85 * (1 - age / 24));
    }
    for (let i = 0; i < 3; i++) {
      const sl = ((P.u * 4 + i * 37) % 120) / 120;
      speedLine(ctx, 80 + sl * 90, -60 - i * 55, 46 - i * 8, 0.75 * Math.sin(sl * Math.PI));
    }
    kit(ctx, look, {
      view: 'q', act: 'idle', t, walk4: Math.floor(ph), walkPhase: ph,
      fx: { ear: -0.32, mouth: 0.42 + 0.18 * hop, tailRot: 0.42 + 0.12 * Math.sin(P.u * 0.45), sy: 1 + 0.04 * hop, sx: 1 - 0.03 * hop, head: { dy: -2 * hop } },
    }, { rot: -0.17, lift: 5 * hop });
    return { scroll: A.scroll };
  },

  // ── กระโดด: ย่อตัว (ยุบ ตาหรี่ หูพับ) → ดีดตัวยืด → ลอยโค้ง (หน้าเชิดตอนขึ้น ก้มตอนลง หูปลิว) → ลงยุบเด้งหนึบ ฝุ่นวง → ประกาย ──
  jump(ctx, P, t, look) {
    const u = P.u;
    const crouch = u < 26 ? ease(u / 22) : 0;
    const air = u >= 26 && u < 74 ? (u - 26) / 48 : -1;
    const h = air >= 0 ? 118 * Math.sin(Math.PI * air) : 0;
    const landU = u >= 74 ? (u - 74) / 46 : -1;
    const sq = jumpSquash(u - 26, 48);
    const squash = Math.max(0, sq), take = Math.max(0, -sq);
    const wob = 0;
    shadow(ctx, 0, 50 * (1 - 0.45 * Math.min(1, h / 118)) + 8 * crouch, 0.22 * (1 - 0.5 * Math.min(1, h / 118)));
    // ฝุ่นตอนลงพื้น (วงสองข้าง)
    if (landU >= 0 && landU < 0.6) for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) { const a = landU / 0.6; puff(ctx, sd * (48 + a * 50 + i * 16), -4 - i * 8 - a * 6, 9 + a * 10, 0.9 * (1 - a)); }
    // ประกายหลังลง
    if (landU >= 0.25) for (let i = 0; i < 4; i++) { const a = clamp01((landU - 0.25 - i * 0.08) / 0.5); sparkle(ctx, (i - 1.5) * 52, -260 - 30 * rnd(i) - a * 30, 10 + 6 * rnd(i + 9), Math.sin(a * Math.PI)); }
    const inAir = air >= 0;
    const o = inAir ? { view: 'q', act: 'idle', ...chibiWalk4At(air < 0.5 ? 0 : 15) } : { view: 'q', act: landU > 0.2 ? 'idle' : 'idle' };
    kit(ctx, look, {
      ...o, t,
      fx: {
        sy: 1 - 0.18 * crouch + 0.24 * take - 0.24 * squash, sx: 1 + 0.12 * crouch - 0.13 * take + 0.17 * squash,
        ear: inAir ? 0.18 * Math.sin(air * Math.PI) - 0.12 : -0.22 * crouch - 0.1 * squash * 5,
        open: inAir ? 1 : 1 - 0.4 * crouch, mouth: inAir ? 0.55 : landU >= 0 && landU < 0.7 ? 0.35 : 0,
        tailRot: inAir ? 0.25 - 0.5 * air : 0.2 * crouch,
        head: { dy: 8 * crouch + squash * 25 },
      },
    }, { lift: h, rot: inAir ? 0.12 - 0.26 * air : 0 });
    return {};
  },

  // ── กินข้าว: นั่งหน้าชาม ก้มหน้าลงกิน (หัวผงกงับ ๆ เศษข้าวกระเด็น) → เงยหน้าเคี้ยวตาหลับพริ้ม หางกระดิก หัวใจลอย → วน ──
  eat(ctx, P, t, look) {
    const u = P.u;
    const down = ease(u / 24) * (1 - ease((u - 118) / 18));
    const nibbling = u >= 24 && u < 118;
    const nib = nibbling ? Math.abs(Math.sin(((u - 24) / 18) * Math.PI)) : 0;
    const chew = u >= 136 && u < 210 ? Math.abs(Math.sin(((u - 136) / 9) * Math.PI)) : 0;
    const food = 1 - 0.35 * clamp01((u - 24) / 94);
    shadow(ctx, 0, 62);
    ctx.save(); ctx.translate(0, 30); bowlBack(ctx, food); ctx.restore();   // ปากชามระดับอุ้งเท้า — นั่งตรงไม่บังตัว
    kit(ctx, look, {
      view: 'sit', act: 'idle', t,
      fx: {
        open: down > 0.4 ? 0 : chew > 0 ? 0 : 1, mouth: nibbling ? 0.35 * nib : 0.42 * chew,
        sy: 1 - 0.12 * down, sx: 1 + 0.05 * down, ear: 0.05 * nib - 0.04 * down,   // ย่อตัวโน้มลงหาชาม
        head: { dy: 66 * down + 6 * nib * down, rot: 0.03 * Math.sin(u * 0.2) * chew },   // ปากแตะยอดกองข้าวพอดี (ผู้ใช้ 15 พ.ย.: หน้าไม่ต่ำเกินข้าว)
      },
    }, { dy: -4 });
    ctx.save(); ctx.translate(0, 30); bowlFront(ctx); ctx.restore();
    // เศษข้าวเม็ดกระเด็นตอนงับ
    if (nibbling) for (let i = 0; i < 3; i++) {
      const born = 24 + Math.floor((u - 24 - i * 6) / 18) * 18 + i * 6, a = (u - born) / 20;
      if (a >= 0 && a < 1) {
        const sd = rnd(born + i) < 0.5 ? -1 : 1, vx = sd * (14 + 20 * rnd(born * 3 + i));
        ctx.fillStyle = '#C88A50'; ctx.strokeStyle = CHIBI_INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(vx * a * 2.2, -30 - 40 * Math.sin(a * Math.PI), 4, 3, a * 4, 0, TAU); ctx.fill(); ctx.stroke();
      }
    }
    // เคี้ยวอร่อย: หัวใจ + ประกายลอยจากข้างหัว
    if (u >= 140) for (let i = 0; i < 3; i++) {
      const a = clamp01((u - 140 - i * 18) / 50);
      heart(ctx, [-165, 165, -150][i] + Math.sin(u * 0.08 + i) * 6, -230 - i * 30 - a * 70, 11 + i * 2, Math.sin(a * Math.PI) * 0.95);   // ข้างหัว ไม่ทับหน้า
    }
    return {};
  },

  // ── อาบน้ำ: ย่อตัวข้างอ่าง → กระโดดลงอ่าง น้ำกระเซ็น → นั่งแช่ ฟองแชมพูฟูบนหัว โยกตัวไปมา ฟองลอย → สะบัดหัว น้ำกระเด็น → แช่สบายกับเป็ดยาง ──
  //   (ผู้ใช้ 15 พ.ย.: ไม่ต้องยกมือถูหัว — ฟองขึ้นเองแล้วโยกตัวพอ)
  bath(ctx, P, t, look) {
    const tt = P.intro ? P.u : P.u + 74;
    tubBack(ctx, t);
    // เข้าอ่าง (ช่วงเข้า): ย่อ → ลอยโค้งจากข้างอ่างลงกลางอ่าง → นั่งจม
    if (P.intro) {
      const u = P.u, crouch = u < 22 ? ease(u / 18) : 0, air = u >= 20 && u < 50 ? (u - 20) / 30 : -1;
      if (air < 0 && u < 20) {
        shadow(ctx, 300, 46);
        kit(ctx, look, { view: 'q', act: 'idle', t, fx: { sy: 1 - 0.14 * crouch, sx: 1 + 0.09 * crouch, ear: -0.2 * crouch, open: 1 - 0.3 * crouch } }, { dx: 300 });
        tubFront(ctx, t);
        return {};
      }
      if (air >= 0) {
        const x = 300 * (1 - easeOut(air)), lift = 170 * Math.sin(Math.PI * air) - 30 * air;
        tubFront(ctx, t);
        kit(ctx, look, { view: 'q', act: 'idle', t, ...chibiWalk4At(0), fx: { mouth: 0.5, ear: 0.15, tailRot: 0.2 - 0.4 * air } }, { dx: x, lift, rot: 0.1 - 0.25 * air });
        return {};
      }
    }
    // ในอ่าง
    const L = P.intro ? P.u - 50 : P.u + 24;   // เวลานับจากลงน้ำ
    const splash = P.intro ? (P.u - 50) / 24 : 2;
    const loopU = P.intro ? 0 : P.u;
    const scrub = !P.intro && loopU < 150;
    const shake = !P.intro && loopU >= 160 && loopU < 214 ? (loopU - 160) / 54 : -1;
    const relax = !P.intro && loopU >= 214;
    const foamK = P.intro ? 0 : clamp01(loopU / 40) * (shake >= 0 ? 1 - shake : relax ? 0 : 1);
    const shakeRot = shake >= 0 ? 0.24 * Math.sin(shake * Math.PI * 9) * Math.sin(shake * Math.PI) : 0;
    // ฟองลอยขึ้นจากน้ำ
    for (let i = 0; i < 11; i++) {   // ฟองลอยเยอะขึ้น (ผู้ใช้ 15 พ.ย.: ให้รู้ว่ากำลังอาบน้ำ)
      const a = ((tt * 0.7 + i * 29) % 160) / 160;
      bubble(ctx, -100 + 200 * rnd(i + 4) + Math.sin(a * 6 + i) * 10, TUB.rim - 10 - a * 230, 7 + 7 * rnd(i + 1), Math.sin(a * Math.PI) * 0.9);
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(-400, -700, 800, 700 + TUB.rim + 20); ctx.clip();   // ใต้ปากอ่าง = จมน้ำ (ไม่โผล่ใต้อ่าง)
    kit(ctx, look, {
      view: 'sit', act: 'idle', t,
      fx: {
        open: scrub || shake >= 0 ? 0 : relax ? 0.6 : 1,
        mouth: shake >= 0 ? 0.3 : relax && loopU > 250 && loopU < 300 ? 0.5 * Math.abs(Math.sin((loopU - 250) / 25 * Math.PI)) : scrub ? 0.12 : 0,
        ear: shake >= 0 ? 0.2 * Math.sin(shake * 40) : scrub ? -0.12 : 0,
        head: { rot: shakeRot + (scrub ? 0.04 * Math.sin(loopU * 0.32) : 0) },
        tilt: scrub ? 0.035 * Math.sin(loopU * 0.09) : 0,   // โยกตัวไปมาเบา ๆ ระหว่างฟองฟู (ผู้ใช้ 15 พ.ย.: ไม่ต้องเอามือถูหัว)
      },
      // ฟองแชมพูบนหัว + มือถูหัว (วาดบนหัว)
      over: (c) => {
        foamHead(c, foamK, shakeRot);
      },
    }, { dy: 40 });
    ctx.restore();
    tubFront(ctx, t);
    duck(ctx, 150 + Math.sin(tt * 0.04) * 8, TUB.rim - 4 + Math.sin(tt * 0.09) * 3, 1);
    // น้ำกระเซ็นตอนลงอ่าง · หยดน้ำตอนสะบัดหัว
    if (splash < 1) for (let i = 0; i < 8; i++) {
      const a = splash, ang = Math.PI * (1.08 + 0.84 * (i / 7));
      const r = 40 + 110 * a, px = Math.cos(ang) * r * 1.25, py = TUB.rim - 10 + Math.sin(ang) * r - 60 * a * a * -1;
      ctx.save(); ctx.globalAlpha = 1 - a; ctx.fillStyle = '#9FD3F0'; ctx.strokeStyle = 'rgba(70,140,200,.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(px, py, 7, 10, ang + Math.PI / 2, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    if (shake >= 0) for (let i = 0; i < 10; i++) {
      const a = ((shake * 3 + rnd(i) ) % 1), ang = -Math.PI * (0.05 + 0.9 * rnd(i + 20));
      const r = 120 + 90 * a, px = Math.cos(ang) * r, py = -230 + Math.sin(ang) * r * 0.8 + 50 * a * a;
      ctx.save(); ctx.globalAlpha = Math.sin(a * Math.PI); ctx.fillStyle = '#9FD3F0'; ctx.strokeStyle = 'rgba(70,140,200,.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(px, py, 5.5, 8, ang + Math.PI / 2, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    if (relax) for (let i = 0; i < 2; i++) { const a = clamp01((loopU - 230 - i * 25) / 60); heart(ctx, -60 + i * 120, -300 - a * 60, 12, Math.sin(a * Math.PI)); }
    void L;
    return {};
  },

  // ── เล่นบอลกระดิ่ง: บอลกลิ้งเข้ามาเด้งดึ๋ง → น้องหมอบมองตาม (หางส่าย หูตั้ง) → พุ่งตัวเขี่ย → บอลกลิ้งหนีไป กระดิ่งดังวิ้ง → มองตามดีใจ ──
  ball(ctx, P, t, look) {
    const u = P.u;
    // บอล: 0–60 กลิ้งเข้ามาจากหน้า (−x) · 60–84 นิ่งตรงหน้า · 84 โดนเขี่ย → กลิ้งออกไปทางหน้า
    let bx, bz = 0, rot;
    if (u < 60) { const a = easeOut(u / 60); bx = -420 + 300 * a; bz = 40 * Math.abs(Math.sin(a * Math.PI * 2)) * (1 - a); rot = -a * 6; }
    else if (u < 84) { bx = -120; rot = -6; }
    else { const a = (u - 84) / 120; bx = -120 - 460 * easeOut(a); bz = 60 * Math.abs(Math.sin(a * Math.PI * 3)) * (1 - a); rot = -6 - a * 9; }
    const crouch = u < 84 ? ease(u / 30) : 1 - ease((u - 92) / 20);
    const swat = u >= 74 && u < 96 ? Math.sin(((u - 74) / 22) * Math.PI) : 0;   // พุ่งเขี่ย
    const watch = u >= 96 ? ease((u - 96) / 20) : 0;
    shadow(ctx, -10 * swat, 52 + 6 * crouch);
    ctx.save(); ctx.globalAlpha = 0.22 * (1 - Math.min(0.6, bz / 80)); ctx.fillStyle = '#4A2A5A';
    ctx.beginPath(); ctx.ellipse(bx, 4, 30, 5, 0, 0, TAU); ctx.fill(); ctx.restore();
    toyBall(ctx, bx, -34 - bz, 34, rot);
    // กระดิ่งดัง: ประกายรอบบอลตอนโดนเขี่ย
    if (u >= 84 && u < 130) for (let i = 0; i < 3; i++) { const a = clamp01((u - 84 - i * 6) / 30); sparkle(ctx, bx + (i - 1) * 34, -100 - bz - a * 40, 10, Math.sin(a * Math.PI)); }
    kit(ctx, look, {
      view: 'q', act: 'idle', t, ...(swat > 0.3 ? chibiWalk4At(0) : {}),
      fx: {
        sy: 1 - 0.16 * crouch + 0.06 * swat, sx: 1 + 0.1 * crouch,
        ear: 0.12 * (1 - crouch) - 0.18 * crouch * (1 - swat), open: 1, mouth: swat > 0 ? 0.4 : watch * 0.35,
        tailRot: 0.25 * Math.sin(u * 0.35) * crouch + 0.3 * swat,
        head: { dy: 12 * crouch - 2 * swat, rot: watch * -0.08 },   // พุ่งเขี่ย: หัวไม่ยกแยกจากตัว (คอไม่ขาด)
      },
    }, { rot: -0.18 * swat + 0.06 * crouch * (1 - swat), dx: -30 * swat, lift: 18 * swat });
    if (u >= 110) for (let i = 0; i < 2; i++) { const a = clamp01((u - 110 - i * 20) / 60); heart(ctx, -150 + i * 300, -260 - a * 60, 12, Math.sin(a * Math.PI) * 0.9); }
    return {};
  },

  // ── ตะครุบหนูของเล่น: หนูวิ่งเข้ามาหยุด → น้องหมอบต่ำ ก้นส่ายเตรียมกระโจน → กระโจนโค้งลงทับหนู (หนูแบน ร้องจี๊ด) → หนูวิ่งหนี น้องดีใจ ──
  mouse(ctx, P, t, look) {
    const u = P.u;
    // หนู: 0–40 วิ่งเข้ามาหยุดที่ −230 · 118 โดนทับ · 140 วิ่งหนีไปทางหน้า
    let mx, run = 0, squish = 0;
    if (u < 40) { mx = -520 + 290 * easeOut(u / 40); run = Math.sin(u * 0.9); }
    else if (u < 140) { mx = -230; squish = u >= 112 ? Math.max(0, 1 - (u - 112) / 28) : 0; }
    else { const a = (u - 140) / 70; mx = -230 - 420 * ease(a); run = Math.sin(u * 0.9); }
    const crouch = u < 40 ? 0 : u < 84 ? ease((u - 40) / 18) : 0;
    const wiggle = u >= 58 && u < 84 ? Math.sin((u - 58) * 0.9) : 0;   // ก้นส่ายก่อนกระโจน
    const air = u >= 84 && u < 112 ? (u - 84) / 28 : -1;
    const land = u >= 112 ? (u - 112) / 40 : -1;
    const x = air >= 0 ? -200 * easeOut(air) : u >= 112 ? -200 : 0;
    const h = air >= 0 ? 90 * Math.sin(Math.PI * air) : 0;
    const sq = land >= 0 && land < 1 ? Math.exp(-3 * land) * Math.cos(land * Math.PI * 2.4) : 0;
    shadow(ctx, x, 54 * (1 - 0.35 * Math.min(1, h / 90)));
    toyMouse(ctx, mx, run, squish);
    if (u >= 112 && u < 150) { const a = (u - 112) / 38; ctx.save(); ctx.globalAlpha = 1 - a; ctx.fillStyle = '#FF8FB3'; ctx.font = '700 34px Mali, sans-serif'; ctx.fillText('จี๊ด!', mx - 40, -90 - a * 40); ctx.restore(); }
    kit(ctx, look, {
      view: 'q', act: 'idle', t, ...(air >= 0 ? chibiWalk4At(air < 0.5 ? 0 : 15) : {}),
      fx: {
        sy: 1 - 0.2 * crouch - 0.2 * Math.max(0, sq) + (air >= 0 ? 0.12 : 0), sx: 1 + 0.14 * crouch + 0.14 * Math.max(0, sq),
        ear: -0.28 * crouch + (air >= 0 ? 0.15 : 0), open: 1, mouth: air >= 0 ? 0.5 : land >= 0 && land < 1.5 ? 0.35 : 0,
        tailRot: 0.45 * wiggle + 0.2 * crouch + (air >= 0 ? 0.3 - 0.5 * air : 0),
        head: { dy: 18 * crouch + 20 * Math.max(0, sq) },
      },
    }, { dx: x + 8 * wiggle, lift: h, rot: (air >= 0 ? -0.2 + 0.3 * air : 0) + 0.05 * wiggle * crouch });
    if (land >= 0.4) for (let i = 0; i < 3; i++) { const a = clamp01((land - 0.4 - i * 0.12) / 0.9); heart(ctx, x - 140 + i * 140, -270 - a * 70, 12, Math.sin(a * Math.PI) * 0.9); }
    return {};
  },

  // ── ตะปบไม้ตกแมว (ผู้ใช้ 16 พ.ย. 2026 รอบ 2) ──
  //   0–150   ไม้นิ่ง ขนนกแกว่งเบา ๆ: นั่งมอง ตาแป๊ว ลูกตาข้างในกรอกตามขนนก หัวเอียงไปมาน่ารัก
  //   150–250 ไม้ขยับไปมา (เหมือนผู้เล่นเดินถือ): ลุกยืนเอียงตัวตามขนนก ก้าวตามนิด ๆ ตาตาม
  //   250–330 ย่อตัว → กระโดดตะปบ (ขนนกสะบัดหนี) → ลงยุบเด้ง ประกาย → 330–360 กลับนั่งมอง
  feather(ctx, P, t, look) {
    const u = P.u;
    const walkK = u >= 150 && u < 250 ? Math.sin(((u - 150) / 100) * Math.PI) : 0;   // ช่วงไม้ขยับ (เข้า-ออกนุ่ม ๆ)
    const crouch = u >= 250 && u < 272 ? ease((u - 250) / 18) : 0;
    const air = u >= 270 && u < 310 ? (u - 270) / 40 : -1;
    const land = u >= 310 ? (u - 310) / 40 : -1;
    const sq = land >= 0 && land < 1 ? Math.exp(-3 * land) * Math.cos(land * Math.PI * 2.4) : 0;
    const h = air >= 0 ? 150 * Math.sin(Math.PI * air) : 0;
    const flick = air >= 0 ? Math.sin(Math.PI * Math.min(1, air * 1.4)) : 0;
    // ขนนก: นิ่ง = แกว่งเล็ก ๆ ตรงหน้า · ช่วงเดินถือ = ส่ายกว้างซ้ายขวา · ตอนน้องกระโดด = ถูกกระตุกขึ้น
    const fx = -40 + 26 * Math.sin(u * 0.045) + 190 * walkK * Math.sin((u - 150) * 0.06);
    const fy = -470 - 120 * flick + 12 * Math.sin(u * 0.09) + 40 * walkK;
    toyFeather(ctx, fx, fy, 0.3 * Math.sin(u * 0.13) + 0.6 * flick + 0.25 * walkK * Math.sin(u * 0.2));
    // ตัวน้องตามขนนก (ช่วงเดิน = ก้าวตามไปทางขนนก)
    const bodyX = walkK * Math.max(-70, Math.min(70, fx * 0.35));
    const stand = Math.max(walkK > 0.15 ? 1 : 0, air >= 0 ? 1 : 0);
    // ลูกตา: ทิศจากหัว (≈ −200 เหนือเท้า) ไปหาขนนก
    const hx = bodyX, hy = -200 - h;
    const gl = Math.hypot(fx - hx, fy - hy) || 1;
    const gaze = { x: Math.max(-1, Math.min(1, ((fx - hx) / gl) * 1.6)), y: Math.max(-1, Math.min(1, ((fy - hy) / gl) * 1.3)) };
    const tiltHead = stand ? 0 : -0.16 * Math.max(-1, Math.min(1, (fx - hx) / 90)) + 0.05 * Math.sin(u * 0.04);   // นั่ง = เอียงหน้าไปทางขนนก
    shadow(ctx, bodyX, 52 * (1 - 0.4 * Math.min(1, h / 150)) + 6 * crouch);
    const step = walkK > 0.15 ? chibiWalk4At(Math.floor(u / 10) % 4 === 1 ? 15 : 0) : {};
    kit(ctx, look, {
      view: stand ? 'q' : 'sit', act: 'idle', t, ...(air >= 0 ? chibiWalk4At(air < 0.5 ? 0 : 15) : step),
      fx: {
        sy: 1 - 0.15 * crouch - 0.2 * Math.max(0, sq) + (air >= 0 ? 0.1 : 0), sx: 1 + 0.1 * crouch + 0.14 * Math.max(0, sq),
        ear: 0.2 - 0.25 * crouch, open: 1, mouth: air >= 0 ? 0.55 : 0.12,
        tailRot: 0.22 * Math.sin(u * 0.3) + (air >= 0 ? 0.35 : 0) + 0.2 * walkK,
        // หัวติดตัวเสมอ (ผู้ใช้ 16 พ.ย.: "อย่าให้คอน้องเหมือนจะขาด") — ยืน/กระโดด/เดินตาม = ไม่ยกหัวแยกจากตัว · นั่ง = เงยได้นิดเดียว
        head: { dy: (stand ? 3 : -4) + 14 * crouch, rot: tiltHead },
        gaze, puppy: air >= 0 ? 0.4 : 1,
      },
    }, { lift: h, dx: bodyX, rot: air >= 0 ? 0.15 - 0.3 * air : -0.14 * walkK * Math.sign(fx - bodyX || 1) });   // เดินตาม = เอนตัวไปทางขนนก
    if (land >= 0.3) for (let i = 0; i < 3; i++) { const a = clamp01((land - 0.3 - i * 0.1) / 0.8); sparkle(ctx, (i - 1) * 110, -300 - a * 50, 12, Math.sin(a * Math.PI)); }
    return {};
  },
};
