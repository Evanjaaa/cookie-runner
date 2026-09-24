// src/render/props/space.js — 🌌 ห้วงอวกาศ (deepSpace_*)
// หินอวกาศม่วงเทา โลหะยานสีขาวนวล พลังงานฟ้า/ชมพูนีออน
import { TAU, now, rr, vgrad, circle, ellipse, poly, line, sparkle, glow, groundShadow, hanger } from './kit.js';

/** ก้อนอุกกาบาต — รูปทรงขรุขระคงที่ตาม seed หมุนได้ มีหลุมอุกกาบาต */
function asteroid(ctx, cx, cy, r, rot, seed, dark = false) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = vgrad(ctx, -r, r, dark ? '#8A7FA8' : '#A89CC8', dark ? '#4A4068' : '#62587E');
  ctx.beginPath();
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU;
    const rr2 = r * (0.82 + 0.18 * Math.sin(seed * 3.1 + i * 2.3));
    i ? ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : ctx.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
  }
  ctx.closePath();
  ctx.fill();
  circle(ctx, -r * 0.3, -r * 0.2, r * 0.2, 'rgba(40,30,70,.35)');
  circle(ctx, r * 0.35, r * 0.25, r * 0.14, 'rgba(40,30,70,.35)');
  circle(ctx, r * 0.1, -r * 0.45, r * 0.09, 'rgba(40,30,70,.3)');
  ctx.restore();
}

/** อุกกาบาตเล็ก 46×40 — ก้อนหินหมุนช้า ๆ บนพื้น ฝุ่นดาวเรือง */
function smallAsteroid(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  asteroid(ctx, x + w / 2, y + h / 2 + 1, Math.min(w, h) * 0.55, t * 0.01, 1);
  glow(ctx, x + w / 2, y + h / 2, w * 0.7, '190,160,255', 0.18);
  sparkle(ctx, x + w * 0.85, y + 4, 2 + 1.5 * Math.abs(Math.sin(t * 0.1)), '#E8DEFF');
}

/** จานดาวเทียมพื้น 70×50 — ฐานโลหะ จานรับสัญญาณกวาดซ้ายขวา ไฟสถานะกะพริบ */
function dishStation(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x + 6, y + h - 16, w - 12, 16, 4, vgrad(ctx, y + h - 16, y + h, '#E6E9F2', '#9AA2B8'));
  rr(ctx, x + w / 2 - 4, y + h * 0.4, 8, h * 0.4, 2, '#9AA2B8');
  ctx.save();
  ctx.translate(x + w / 2, y + h * 0.42);
  ctx.rotate(-0.5 + Math.sin(t * 0.02) * 0.4);
  ctx.fillStyle = vgrad(ctx, -22, 4, '#F6F8FF', '#B8C0D8');
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 12, 0, Math.PI, 0);
  ctx.fill();
  line(ctx, 0, 0, 0, -18, 2, '#7C84A0');
  circle(ctx, 0, -18, 3, '#FF6FB5');
  ctx.restore();
  circle(ctx, x + 14, y + h - 8, 2.5, Math.sin(t * 0.2) > 0 ? '#7CFFB2' : '#2D6B4E');
}

/** ผลึกพลังงาน 100×44 — แท่นยาว ผลึกนีออนสามก้อน พลังงานเต้นเป็นคลื่น */
function energyCrystals(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x, y + h - 12, w, 12, 4, vgrad(ctx, y + h - 12, y + h, '#4A4068', '#2A2340'));
  for (let i = 0; i < 3; i++) {
    const cx = x + 18 + i * (w - 36) / 2;
    const hh = h - 12 - (i === 1 ? 0 : 8);
    const p = 0.5 + 0.5 * Math.sin(t * 0.1 + i * 2);
    glow(ctx, cx, y + h - 12 - hh / 2, 22, i === 1 ? '255,120,220' : '110,220,255', 0.25 + p * 0.3);
    poly(ctx, [[cx - 10, y + h - 12], [cx - 7, y + h - 12 - hh * 0.8], [cx, y + h - 12 - hh], [cx + 7, y + h - 12 - hh * 0.8], [cx + 10, y + h - 12]],
      vgrad(ctx, y, y + h, i === 1 ? '#FFD1F0' : '#D6F6FF', i === 1 ? '#D24BB0' : '#3AA2DC'));
  }
  for (let i = 0; i < 5; i++) circle(ctx, x + 10 + i * 20, y + h - 6, 2, Math.sin(t * 0.15 - i) > 0 ? '#7CFFB2' : '#3A5A4E');
}

/** เสาอากาศสัญญาณ 60×100 — โครงเหล็กถักสามเหลี่ยม จานเล็ก ไฟยอดกะพริบ */
function antennaTower(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x, y + h - 10, w, 10, 3, '#9AA2B8');
  ctx.strokeStyle = '#C8CEDF';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + h - 10); ctx.lineTo(x + w / 2, y + 10); ctx.lineTo(x + w - 6, y + h - 10);
  ctx.stroke();
  ctx.lineWidth = 1.6;
  for (let i = 1; i < 6; i++) {
    const f = i / 6, yy = y + 10 + f * (h - 20), half = f * (w / 2 - 6);
    ctx.beginPath(); ctx.moveTo(x + w / 2 - half, yy); ctx.lineTo(x + w / 2 + half, yy); ctx.stroke();
  }
  ellipse(ctx, x + w / 2 + 12, y + h * 0.35, 9, 5, '#E6E9F2', -0.5);
  line(ctx, x + w / 2, y + 10, x + w / 2, y, 2, '#C8CEDF');
  const on = Math.sin(t * 0.12) > 0.2;
  circle(ctx, x + w / 2, y + 1, 4, on ? '#FF4F6B' : '#6B2A3A');
  if (on) glow(ctx, x + w / 2, y + 1, 16, '255,80,110', 0.5);
}

/** อุกกาบาตยักษ์ 120×80 — ก้อนใหญ่สองก้อนซ้อน ฝุ่นดาววนรอบ */
function bigAsteroid(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  asteroid(ctx, x + w * 0.62, y + h * 0.5, h * 0.52, t * 0.004, 3);
  asteroid(ctx, x + w * 0.24, y + h * 0.66, h * 0.36, -t * 0.006, 5, true);
  for (let i = 0; i < 6; i++) {
    const a = t * 0.02 + (i / 6) * TAU;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(a);
    circle(ctx, x + w * 0.55 + Math.cos(a) * w * 0.48, y + h * 0.45 + Math.sin(a) * h * 0.15, 1.8, '#E8DEFF');
  }
  ctx.globalAlpha = 1;
}

/** ไพลอนพลังงาน 44×126 — เสาโลหะสูง วงแหวนพลังงานสามชั้น ประกายไฟฟ้าวิ่ง */
function energyPylon(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  poly(ctx, [[x + 2, y + h], [x + w * 0.3, y + 10], [x + w * 0.7, y + 10], [x + w - 2, y + h]], vgrad(ctx, y, y + h, '#E6E9F2', '#7C84A0'));
  rr(ctx, x + w * 0.4, y + 14, w * 0.2, h - 24, 3, '#3A3550');
  for (let i = 0; i < 3; i++) {
    const yy = y + 26 + i * (h - 46) / 2;
    const p = 0.5 + 0.5 * Math.sin(t * 0.14 - i * 1.4);
    ellipse(ctx, x + w / 2, yy, w * 0.46, 5, `rgba(120,230,255,${0.4 + p * 0.5})`);
    glow(ctx, x + w / 2, yy, 16, '120,230,255', p * 0.4);
  }
  circle(ctx, x + w / 2, y + 8, 7, '#7CE8FF');
  glow(ctx, x + w / 2, y + 8, 20, '120,230,255', 0.55);
  // ประกายไฟฟ้าซิกแซก
  const k = Math.floor(t / 6) % 3;
  ctx.strokeStyle = '#E8FBFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  let px = x + w / 2, py = y + 12;
  ctx.moveTo(px, py);
  for (let i = 0; i < 5; i++) { px = x + w / 2 + ((i + k) % 2 ? 6 : -6); py += (h - 30) / 5; ctx.lineTo(px, py); }
  ctx.stroke();
}

/** ประตูเลเซอร์ 90×96 (หมอบ) — ตัวปล่อยเลเซอร์ห้อยจากเพดาน ม่านลำแสงแดงสั่นไหว */
function laserGate(ctx, x, y, w, h) {
  const t = now();
  hanger(ctx, x + 10, y, '#7C84A0', 5);
  hanger(ctx, x + w - 10, y, '#7C84A0', 5);
  rr(ctx, x, y, w, 16, 5, vgrad(ctx, y, y + 16, '#E6E9F2', '#7C84A0'));
  rr(ctx, x + 4, y + h - 12, w - 8, 12, 4, vgrad(ctx, y + h - 12, y + h, '#9AA2B8', '#4A4068'));
  const n = 6;
  for (let i = 0; i < n; i++) {
    const lx = x + 10 + i * (w - 20) / (n - 1);
    const jit = Math.sin(t * 0.5 + i * 1.7) * 0.8;
    line(ctx, lx + jit, y + 16, lx - jit, y + h - 12, 3, 'rgba(255,70,110,.85)');
    line(ctx, lx + jit, y + 16, lx - jit, y + h - 12, 1, '#FFD6E0');
  }
  glow(ctx, x + w / 2, y + h / 2, w * 0.6, '255,70,110', 0.25 + 0.1 * Math.sin(t * 0.2));
}

/** เศษยานลอยต่ำ 140×86 (หมอบ) — แผ่นโลหะยานบิดเบี้ยว สายไฟห้อย ลอยขึ้นลงเบา ๆ */
function floatingDebris(ctx, x, y, w, h) {
  const t = now();
  const bob = Math.sin(t * 0.04) * 2;
  ctx.save();
  ctx.translate(0, bob - 2);
  poly(ctx, [[x, y + h * 0.2], [x + w * 0.35, y], [x + w * 0.7, y + h * 0.08], [x + w, y + h * 0.3], [x + w * 0.92, y + h * 0.78], [x + w * 0.5, y + h * 0.95], [x + w * 0.1, y + h * 0.8]], vgrad(ctx, y, y + h, '#E6E9F2', '#8A92AC'));
  rr(ctx, x + w * 0.15, y + h * 0.25, w * 0.3, h * 0.35, 4, '#3A3550');
  for (let i = 0; i < 3; i++) rr(ctx, x + w * 0.18 + i * 12, y + h * 0.3, 8, h * 0.25, 2, '#5CA8FF');
  poly(ctx, [[x + w * 0.55, y + h * 0.3], [x + w * 0.85, y + h * 0.35], [x + w * 0.8, y + h * 0.6], [x + w * 0.55, y + h * 0.55]], '#FF8A3D');
  line(ctx, x + w * 0.6, y + h * 0.75, x + w * 0.66, y + h * 0.96, 2, '#FFD84D');
  circle(ctx, x + w * 0.66, y + h * 0.96, 2, Math.sin(t * 0.3) > 0 ? '#FFF6B0' : '#A08A30');
  ctx.restore();
  hanger(ctx, x + w * 0.35, y, 'rgba(200,210,230,.35)', 1);
}

/** โครงสถานีอวกาศ 200×72 (หมอบ) — ลำตัวยาวมีหน้าต่างวงกลม ไฟวิ่งไล่ตามลำตัว */
function stationHull(ctx, x, y, w, h) {
  const t = now();
  hanger(ctx, x + 20, y, '#7C84A0', 6);
  hanger(ctx, x + w - 20, y, '#7C84A0', 6);
  rr(ctx, x, y + 4, w, h - 8, (h - 8) / 2, vgrad(ctx, y, y + h, '#F2F4FA', '#8A92AC'));
  rr(ctx, x + 4, y + h * 0.62, w - 8, 6, 3, '#5A6380');
  for (let i = 0; i < 5; i++) {
    const cx = x + 26 + i * (w - 52) / 4;
    circle(ctx, cx, y + h * 0.38, 8, '#3A3550');
    circle(ctx, cx, y + h * 0.38, 5.5, '#7CC8FF');
    circle(ctx, cx - 2, y + h * 0.36, 1.5, '#FFFFFF');
  }
  const run = (t * 0.05) % 1;
  for (let i = 0; i < 10; i++) {
    const on = Math.abs(i / 10 - run) < 0.08;
    circle(ctx, x + 12 + i * (w - 24) / 9, y + h * 0.65, 2.2, on ? '#7CFFB2' : '#2D4B4E');
  }
  rr(ctx, x - 6, y + h * 0.25, 10, h * 0.5, 3, '#5A6380');
  rr(ctx, x + w - 4, y + h * 0.25, 10, h * 0.5, 3, '#5A6380');
}

export default {
  deepSpace_Obstacle_Single_01: smallAsteroid,
  deepSpace_Obstacle_Single_02: dishStation,
  deepSpace_Obstacle_Single_03: energyCrystals,
  deepSpace_Obstacle_Double_01: antennaTower,
  deepSpace_Obstacle_Double_02: bigAsteroid,
  deepSpace_Obstacle_Double_03: energyPylon,
  deepSpace_Obstacle_Crouch_01: laserGate,
  deepSpace_Obstacle_Crouch_02: floatingDebris,
  deepSpace_Obstacle_Crouch_03: stationHull,
};
