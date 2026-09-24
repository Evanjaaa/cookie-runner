// src/render/props/garden.js — 🌸 สวนกลางวัน (flowerGarden_*)
// ของธรรมชาติในสวน สีเขียวสด ดอกไม้พาสเทล แสงแดดอุ่น
import { TAU, now, rr, vgrad, circle, ellipse, poly, line, sparkle, groundShadow, hanger } from './kit.js';

function flower(ctx, x, y, r, petal, core = '#FFD84D') {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ellipse(ctx, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.55, r * 0.4, petal, a);
  }
  circle(ctx, x, y, r * 0.38, core);
}

function leaf(ctx, x, y, len, ang, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.35, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.35, 0, 0);
  ctx.fill();
  ctx.restore();
}

/** เห็ดจุด 46×40 — หมวกแดงจุดขาว โยกเบา ๆ */
function mushroom(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x + w * 0.34, y + h * 0.45, w * 0.32, h * 0.55, 6, vgrad(ctx, y + h * 0.45, y + h, '#FFF6E6', '#E8D8BE'));
  ctx.save();
  ctx.translate(x + w / 2, y + h * 0.5);
  ctx.rotate(Math.sin(t * 0.05) * 0.06);
  ctx.fillStyle = vgrad(ctx, -h * 0.5, 0, '#FF6B6B', '#D93A4A');
  ctx.beginPath();
  ctx.moveTo(-w / 2, 2);
  ctx.quadraticCurveTo(-w / 2, -h * 0.55, 0, -h * 0.5);
  ctx.quadraticCurveTo(w / 2, -h * 0.55, w / 2, 2);
  ctx.closePath();
  ctx.fill();
  circle(ctx, -w * 0.22, -h * 0.18, 4, '#FFFFFF');
  circle(ctx, w * 0.12, -h * 0.3, 3, '#FFFFFF');
  circle(ctx, w * 0.3, -h * 0.08, 2.6, '#FFFFFF');
  ctx.restore();
  for (let i = 0; i < 3; i++) leaf(ctx, x + 4 + i * 16, y + h, 12, -1.9 + i * 0.4, '#5CB85C');
}

/** กระถางดอกไม้ 70×50 — กระถางดินเผา ดอกไม้หลายสีไหวตามลม */
function flowerPot(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  poly(ctx, [[x + 4, y + h * 0.45], [x + w - 4, y + h * 0.45], [x + w - 12, y + h], [x + 12, y + h]], vgrad(ctx, y + h * 0.45, y + h, '#E07A4F', '#A64A2A'));
  rr(ctx, x, y + h * 0.4, w, 8, 3, '#C7613A');
  const cols = ['#FF8FB5', '#FFD84D', '#B98CFF', '#7FD1FF'];
  for (let i = 0; i < 4; i++) {
    const fx = x + 12 + i * (w - 24) / 3 + Math.sin(t * 0.04 + i) * 2;
    const fy = y + 8 + (i % 2) * 7;
    line(ctx, x + 12 + i * (w - 24) / 3, y + h * 0.42, fx, fy, 2, '#3E8E52');
    flower(ctx, fx, fy, 7, cols[i]);
  }
}

/** รั้วไม้พันดอก 100×44 — รั้วไม้ขาว เถาเล็กพันพร้อมดอก */
function vineFence(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x, y + h * 0.35, w, 7, 3, '#EFE6D6');
  rr(ctx, x, y + h * 0.7, w, 7, 3, '#EFE6D6');
  for (let i = 0; i < 6; i++) {
    const px = x + 2 + i * (w - 12) / 5;
    poly(ctx, [[px, y + 8], [px + 5, y], [px + 10, y + 8], [px + 10, y + h], [px, y + h]], vgrad(ctx, y, y + h, '#FFFFFF', '#D8CDBA'));
  }
  ctx.strokeStyle = '#4CA862';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let k = 0; k <= 20; k++) {
    const vx = x + k * w / 20;
    const vy = y + h * 0.5 + Math.sin(k * 0.9) * 8;
    k ? ctx.lineTo(vx, vy) : ctx.moveTo(vx, vy);
  }
  ctx.stroke();
  for (let k = 0; k < 7; k++) {
    leaf(ctx, x + 6 + k * 14, y + h * 0.5 + Math.sin(k * 1.3) * 8, 9, -0.8 + Math.sin(t * 0.06 + k) * 0.3, '#5CB85C');
    if (k % 2 === 0) flower(ctx, x + 10 + k * 14, y + h * 0.4 + Math.sin(k) * 6, 5, '#FF9EC4');
  }
}

/** ต้นทานตะวัน 60×100 — ลำต้นสูง ใบใหญ่ ดอกโยกตามแดด */
function sunflower(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  const cx = x + w / 2;
  rr(ctx, cx - 3, y + 26, 6, h - 26, 3, '#3E8E52');
  leaf(ctx, cx, y + h * 0.6, 26, -0.5, '#4CA862');
  leaf(ctx, cx, y + h * 0.75, 24, Math.PI + 0.5, '#5CB85C');
  ctx.save();
  ctx.translate(cx, y + 26);
  ctx.rotate(Math.sin(t * 0.03) * 0.12);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    ellipse(ctx, Math.cos(a) * 17, Math.sin(a) * 17, 9, 4.5, '#FFC93C', a);
  }
  circle(ctx, 0, 0, 13, '#7A4A2A');
  for (let i = 0; i < 8; i++) circle(ctx, Math.cos(i) * 6, Math.sin(i * 1.7) * 6, 1.4, '#4A2A16');
  ctx.restore();
}

/** พุ่มกุหลาบใหญ่ 120×80 — พุ่มกลมสามก้อน ดอกกุหลาบ ผีเสื้อบินวน */
function roseBush(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  ellipse(ctx, x + w * 0.25, y + h * 0.62, w * 0.26, h * 0.38, '#3E8E52');
  ellipse(ctx, x + w * 0.75, y + h * 0.62, w * 0.26, h * 0.38, '#3E8E52');
  ellipse(ctx, x + w * 0.5, y + h * 0.48, w * 0.32, h * 0.48, '#4CA862');
  rr(ctx, x + 2, y + h * 0.7, w - 4, h * 0.3, 10, '#3E8E52');
  for (let i = 0; i < 7; i++) {
    const rx = x + 14 + (i * 37) % (w - 28), ry = y + 14 + ((i * 23) % (h - 34));
    circle(ctx, rx, ry, 6, '#F2557A');
    ctx.strokeStyle = '#C23456'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(rx, ry, 3, 0, 4.5); ctx.stroke();
  }
  // ผีเสื้อ
  const bx = x + w / 2 + Math.cos(t * 0.03) * w * 0.45, by = y - 6 + Math.sin(t * 0.06) * 8;
  const flap = Math.abs(Math.sin(t * 0.4));
  ellipse(ctx, bx - 4 * flap, by, 5 * flap + 1, 4, '#B98CFF');
  ellipse(ctx, bx + 4 * flap, by, 5 * flap + 1, 4, '#B98CFF');
  circle(ctx, bx, by, 1.5, '#4A2A5E');
}

/** บ้านนกบนเสา 44×126 — เสาไม้สูง บ้านนกหลังคาแดง นกโผล่หน้าต่าง */
function birdhouse(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x + w / 2 - 5, y + 40, 10, h - 40, 3, vgrad(ctx, y, y + h, '#B87C4A', '#7A4A2A'));
  rr(ctx, x + 4, y + 18, w - 8, 30, 4, '#F5D7A1');
  poly(ctx, [[x - 2, y + 20], [x + w / 2, y], [x + w + 2, y + 20]], '#E8436B');
  circle(ctx, x + w / 2, y + 32, 7, '#4A2A16');
  // นกโผล่เป็นระยะ
  const peek = Math.max(0, Math.sin(t * 0.03));
  if (peek > 0.2) {
    circle(ctx, x + w / 2, y + 32 - 2 * peek, 5, '#6EC1FF');
    circle(ctx, x + w / 2 + 1.5, y + 30 - 2 * peek, 1.2, '#1C1F29');
    poly(ctx, [[x + w / 2 + 4, y + 32 - 2 * peek], [x + w / 2 + 8, y + 33 - 2 * peek], [x + w / 2 + 4, y + 34 - 2 * peek]], '#FFB347');
  }
  rr(ctx, x + w / 2 - 8, y + 44, 16, 3, 1.5, '#7A4A2A');
  for (let i = 0; i < 3; i++) leaf(ctx, x + w / 2, y + h - 10 - i * 18, 13, i % 2 ? -0.6 : Math.PI + 0.6, '#5CB85C');
}

/** กิ่งไม้พาดต่ำ 90×96 (หมอบ) — กิ่งหนาห้อยจากต้นด้านบน ใบดกเต็มช่อง ใบปลิว */
function lowBranch(ctx, x, y, w, h) {
  const t = now();
  hanger(ctx, x + w * 0.2, y, '#7A4A2A', 7);
  ctx.fillStyle = vgrad(ctx, y, y + h, '#9C6A3E', '#6B4226');
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.3);
  ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.15, x + w, y + h * 0.35);
  ctx.lineTo(x + w, y + h * 0.5);
  ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.32, x, y + h * 0.48);
  ctx.fill();
  ellipse(ctx, x + w * 0.3, y + h * 0.62, w * 0.3, h * 0.36, '#4CA862');
  ellipse(ctx, x + w * 0.7, y + h * 0.6, w * 0.3, h * 0.38, '#3E8E52');
  ellipse(ctx, x + w * 0.5, y + h * 0.18, w * 0.4, h * 0.2, '#5CB85C');
  for (let i = 0; i < 6; i++) leaf(ctx, x + 8 + i * 15, y + h - 8, 12, 1.2 + Math.sin(t * 0.05 + i) * 0.3, '#5CB85C');
  const p = (t * 0.008) % 1;
  ctx.globalAlpha = 1 - p;
  leaf(ctx, x + w * 0.6 + p * 20, y + h + p * 20, 8, t * 0.1, '#8BD17C');
  ctx.globalAlpha = 1;
}

/** ม่านวิสทีเรีย 140×86 (หมอบ) — คานไม้ ช่อดอกม่วงห้อยลงเป็นพวง แกว่งตามลม */
function wisteria(ctx, x, y, w, h) {
  const t = now();
  hanger(ctx, x + 10, y, '#8A5A2B', 5);
  hanger(ctx, x + w - 10, y, '#8A5A2B', 5);
  rr(ctx, x, y, w, 12, 5, vgrad(ctx, y, y + 12, '#B87C4A', '#7A4A2A'));
  ellipse(ctx, x + w / 2, y + 12, w * 0.5, 8, '#4CA862');
  const n = 7;
  for (let i = 0; i < n; i++) {
    const cx = x + 10 + i * (w - 20) / (n - 1);
    const sw = Math.sin(t * 0.04 + i * 0.8) * 3;
    const len = h - 14 - (i % 2) * 10;
    for (let k = 0; k < 7; k++) {
      const f = k / 6;
      const r = 7 * (1 - f * 0.6);
      circle(ctx, cx + sw * f, y + 16 + f * (len - 10), r, k % 2 ? '#B98CFF' : '#9B6FE0');
    }
  }
}

/** ซุ้มเถาวัลย์ยาว 200×72 (หมอบ) — ซุ้มไม้โค้งยาว เถาพันหนา ดอกไม้ไหว */
function vineArch(ctx, x, y, w, h) {
  const t = now();
  for (const px of [x + 14, x + w / 2, x + w - 14]) hanger(ctx, px, y, '#7A4A2A', 5);
  rr(ctx, x, y + 6, w, h * 0.3, 8, vgrad(ctx, y, y + h * 0.4, '#B87C4A', '#7A4A2A'));
  ctx.fillStyle = '#3E8E52';
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.25);
  for (let k = 0; k <= 16; k++) ctx.quadraticCurveTo(x + (k - 0.5) * w / 16, y + h + (k % 2 ? 4 : -8), x + k * w / 16, y + h * 0.7);
  ctx.lineTo(x + w, y + h * 0.25);
  ctx.fill();
  ellipse(ctx, x + w / 2, y + 4, w * 0.5, 9, '#4CA862');
  const cols = ['#FF8FB5', '#FFD84D', '#FFFFFF', '#B98CFF'];
  for (let i = 0; i < 11; i++) {
    const fx = x + 10 + i * (w - 20) / 10;
    const fy = y + h * 0.55 + Math.sin(i * 1.7) * 8 + Math.sin(t * 0.05 + i) * 1.5;
    flower(ctx, fx, fy, 5, cols[i % 4]);
  }
  sparkle(ctx, x + w * 0.3, y + h * 0.3, 2.5, 'rgba(255,255,255,.7)');
}

export default {
  flowerGarden_Obstacle_Single_01: mushroom,
  flowerGarden_Obstacle_Single_02: flowerPot,
  flowerGarden_Obstacle_Single_03: vineFence,
  flowerGarden_Obstacle_Double_01: sunflower,
  flowerGarden_Obstacle_Double_02: roseBush,
  flowerGarden_Obstacle_Double_03: birdhouse,
  flowerGarden_Obstacle_Crouch_01: lowBranch,
  flowerGarden_Obstacle_Crouch_02: wisteria,
  flowerGarden_Obstacle_Crouch_03: vineArch,
};
