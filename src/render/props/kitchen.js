// src/render/props/kitchen.js — 🌙 ครัวกลางคืน (nightKitchen_*)
// โทนไม้อุ่น โลหะครัว และแสงไฟจากเตา ให้เข้ากับครัวยามดึกของด่าน
import { TAU, now, rr, vgrad, hgrad, circle, ellipse, poly, line, sparkle, glow, groundShadow, hanger } from './kit.js';

/** ถุงแป้งสาลี 46×40 — ปากถุงมัดเชือก ฝุ่นแป้งลอยเบา ๆ */
function flourSack(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  ctx.fillStyle = vgrad(ctx, y, y + h, '#F4E6CC', '#D9C19A');
  ctx.beginPath();
  ctx.moveTo(x + w * 0.2, y + h * 0.28);
  ctx.quadraticCurveTo(x - 2, y + h * 0.7, x + w * 0.12, y + h);
  ctx.lineTo(x + w * 0.88, y + h);
  ctx.quadraticCurveTo(x + w + 2, y + h * 0.7, x + w * 0.8, y + h * 0.28);
  ctx.closePath();
  ctx.fill();
  // ปากถุง
  poly(ctx, [[x + w * 0.24, y + h * 0.3], [x + w * 0.32, y + 2], [x + w * 0.5, y + h * 0.12], [x + w * 0.68, y + 1], [x + w * 0.76, y + h * 0.3]], '#EAD8B6');
  rr(ctx, x + w * 0.22, y + h * 0.26, w * 0.56, 4, 2, '#A0643A');
  // ป้ายรูปข้าวสาลี
  ellipse(ctx, x + w / 2, y + h * 0.66, w * 0.2, h * 0.17, '#C9A36B');
  line(ctx, x + w / 2, y + h * 0.56, x + w / 2, y + h * 0.78, 1.6, '#8A5A2B');
  // ฝุ่นแป้ง
  for (let i = 0; i < 3; i++) {
    const p = ((t * 0.012 + i / 3) % 1);
    ctx.globalAlpha = (1 - p) * 0.6;
    circle(ctx, x + w * (0.35 + i * 0.15) + Math.sin(t * 0.05 + i) * 3, y - p * 14, 1.6 + p * 1.5, '#FFFFFF');
  }
  ctx.globalAlpha = 1;
}

/** ขวดแยม 3 ใบ 70×50 — แยมเรืองแสงวิบ ๆ ฝาผ้าลายตาราง */
function jamJars(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  const cols = ['#E8436B', '#F29A2E', '#9B5DE5'];
  const hs = [h, h * 0.78, h * 0.9];
  for (let i = 0; i < 3; i++) {
    const jw = w * 0.31, jx = x + i * (w * 0.345), jh = hs[i], jy = y + h - jh;
    rr(ctx, jx, jy + 6, jw, jh - 6, 5, 'rgba(230,240,255,.55)');
    rr(ctx, jx + 2, jy + jh * 0.38, jw - 4, jh * 0.6, 4, cols[i]);
    const pulse = 0.35 + 0.25 * Math.sin(t * 0.08 + i * 2);
    glow(ctx, jx + jw / 2, jy + jh * 0.65, jw * 0.8, '255,200,150', pulse * 0.5);
    rr(ctx, jx - 1, jy, jw + 2, 8, 3, i === 1 ? '#D84B4B' : '#F7F1E3');
    line(ctx, jx + 3, jy + 3, jx + jw - 3, jy + 3, 1.2, i === 1 ? '#FFFFFF' : '#D84B4B');
    rr(ctx, jx + 4, jy + jh * 0.45, 3, jh * 0.3, 2, 'rgba(255,255,255,.45)');
  }
}

/** ถาดขนมปังร้อน 100×44 — ขาตั้งเตี้ย ขนมปังสามก้อน ไอร้อนลอยขึ้น */
function breadTray(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x + 4, y + h - 12, 5, 12, 2, '#6E7584');
  rr(ctx, x + w - 9, y + h - 12, 5, 12, 2, '#6E7584');
  rr(ctx, x, y + h - 18, w, 8, 3, vgrad(ctx, y + h - 18, y + h - 10, '#C9CED8', '#8C93A3'));
  for (let i = 0; i < 3; i++) {
    const bx = x + 8 + i * (w - 16) / 3, bw = (w - 16) / 3 - 4;
    ctx.fillStyle = vgrad(ctx, y + 8, y + h - 18, '#E9A15A', '#B8672C');
    ctx.beginPath();
    ctx.ellipse(bx + bw / 2, y + h - 18, bw / 2, h * 0.5, 0, Math.PI, 0);
    ctx.fill();
    for (let k = 1; k < 3; k++) line(ctx, bx + bw * k / 3, y + h * 0.35, bx + bw * k / 3 - 3, y + h * 0.5, 1.5, '#F5CE8E');
  }
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.01 + i / 4) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${(1 - p) * 0.8})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const sx = x + 15 + i * 22;
    ctx.moveTo(sx, y + 6 - p * 18);
    ctx.quadraticCurveTo(sx + 6 * Math.sin(t * 0.06 + i), y - 4 - p * 18, sx, y - 12 - p * 18);
    ctx.stroke();
  }
  ctx.restore();
}

/** เครื่องตีแป้ง 60×100 — ตัวเครื่องสีพาสเทล ชามโลหะ หัวตีหมุน */
function standMixer(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x + 2, y + h - 12, w - 4, 12, 4, '#F28AA6');
  rr(ctx, x + w * 0.62, y + 18, w * 0.3, h - 26, 8, vgrad(ctx, y, y + h, '#FFB3C7', '#E77394'));
  rr(ctx, x + 2, y + 6, w - 4, 26, 12, vgrad(ctx, y + 6, y + 32, '#FFC6D5', '#F28AA6'));
  circle(ctx, x + w * 0.2, y + 19, 4, '#FFFFFF');
  // ชามโลหะ
  ctx.fillStyle = vgrad(ctx, y + h * 0.55, y + h - 12, '#E7EBF2', '#9AA3B5');
  ctx.beginPath();
  ctx.moveTo(x + 2, y + h * 0.55);
  ctx.lineTo(x + w * 0.64, y + h * 0.55);
  ctx.quadraticCurveTo(x + w * 0.6, y + h - 12, x + w * 0.33, y + h - 12);
  ctx.quadraticCurveTo(x + 6, y + h - 12, x + 2, y + h * 0.55);
  ctx.fill();
  // หัวตี (หมุน = บีบกว้างตามคลื่น)
  const s = Math.abs(Math.cos(t * 0.35));
  ctx.strokeStyle = '#C3CAD6';
  ctx.lineWidth = 2;
  for (let k = -1; k <= 1; k += 2) {
    ctx.beginPath();
    ctx.ellipse(x + w * 0.33, y + h * 0.5, 7 * s + 1, 12, 0, 0, TAU);
    ctx.stroke();
  }
  line(ctx, x + w * 0.33, y + 32, x + w * 0.33, y + h * 0.42, 3, '#C3CAD6');
  ellipse(ctx, x + w * 0.33, y + h * 0.56, w * 0.25, 3, '#FFF3E0');
}

/** เตาอบ 120×80 — หน้าต่างไฟแดงกะพริบ ปุ่มหมุน ถาดขนมข้างใน */
function oven(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x, y, w, h, 8, vgrad(ctx, y, y + h, '#5B6477', '#394152'));
  rr(ctx, x + 4, y + 4, w - 8, 14, 4, '#2B3140');
  for (let i = 0; i < 4; i++) circle(ctx, x + 16 + i * 14, y + 11, 4, i === 1 ? '#FF7A59' : '#AEB6C6');
  const flick = 0.75 + 0.25 * Math.sin(t * 0.21) * Math.sin(t * 0.13);
  rr(ctx, x + 10, y + 24, w - 20, h - 36, 6, '#1C1F29');
  rr(ctx, x + 14, y + 28, w - 28, h - 44, 4, `rgba(255,${Math.round(110 + 40 * flick)},60,${0.55 + 0.35 * flick})`);
  glow(ctx, x + w / 2, y + h * 0.55, w * 0.45, '255,120,60', 0.35 * flick);
  for (let i = 0; i < 3; i++) ellipse(ctx, x + 32 + i * 28, y + h * 0.62, 9, 5, '#C47A3A');
  rr(ctx, x + 18, y + 20, w - 36, 4, 2, '#D6DBE5');
  rr(ctx, x + 6, y + h - 8, 12, 8, 2, '#2B3140');
  rr(ctx, x + w - 18, y + h - 8, 12, 8, 2, '#2B3140');
}

/** เค้กสี่ชั้น 44×126 — ครีมไหลย้อย สตรอว์เบอร์รี่ เทียนบนยอดไฟไหว */
function tallCake(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x - 2, y + h - 6, w + 4, 6, 3, '#D6DBE5');
  const tiers = 4, th = (h - 26) / tiers;
  const cols = ['#F6B8C8', '#FFF1DA', '#C9E7FF', '#F6B8C8'];
  for (let i = 0; i < tiers; i++) {
    const tw = w - i * 4, tx = x + i * 2, ty = y + h - 6 - th * (i + 1);
    rr(ctx, tx, ty, tw, th, 5, cols[i]);
    ctx.fillStyle = '#FFFDF7';
    ctx.beginPath();
    ctx.moveTo(tx, ty + 4);
    for (let k = 0; k <= 4; k++) ctx.quadraticCurveTo(tx + tw * (k - 0.5) / 4, ty + 10 + (k % 2) * 4, tx + tw * k / 4, ty + 4);
    ctx.lineTo(tx + tw, ty);
    ctx.lineTo(tx, ty);
    ctx.fill();
    circle(ctx, tx + tw * 0.25, ty + th * 0.6, 2.6, '#E8436B');
    circle(ctx, tx + tw * 0.72, ty + th * 0.6, 2.6, '#E8436B');
  }
  const top = y + h - 6 - th * tiers;
  rr(ctx, x + w / 2 - 3, top - 18, 6, 18, 2, '#9ED9FF');
  const f = Math.sin(t * 0.3) * 1.5;
  ellipse(ctx, x + w / 2 + f * 0.4, top - 23, 3.2, 5.5, '#FFB73D');
  ellipse(ctx, x + w / 2 + f * 0.4, top - 22, 1.6, 3, '#FFF1B0');
  glow(ctx, x + w / 2, top - 23, 14, '255,190,90', 0.5);
}

/** ชุดท่อไอน้ำ 90×96 (หมอบ) — ท่อทองแดงสองชั้นต่อกันด้วยข้อต่อ วาล์วพวงมาลัย ไอพ่นออกข้อต่อ */
function steamPipe(ctx, x, y, w, h) {
  const t = now();
  hanger(ctx, x + 12, y, '#7A4A2A', 4);
  hanger(ctx, x + w - 12, y, '#7A4A2A', 4);
  const pipe = (py, ph) => rr(ctx, x, py, w, ph, ph / 2, vgrad(ctx, py, py + ph, '#E9A266', '#9C5A2C'));
  pipe(y, h * 0.36);
  pipe(y + h * 0.58, h * 0.42);
  // ข้อต่อแนวตั้งเชื่อมสองท่อ
  rr(ctx, x + w * 0.12, y + h * 0.2, 14, h * 0.6, 4, vgrad(ctx, y, y + h, '#C9793F', '#7A4A2A'));
  rr(ctx, x + w * 0.72, y + h * 0.2, 14, h * 0.6, 4, vgrad(ctx, y, y + h, '#C9793F', '#7A4A2A'));
  for (const px of [x + 2, x + w - 10]) {
    rr(ctx, px, y - 2, 8, h * 0.4, 3, '#7A4A2A');
    rr(ctx, px, y + h * 0.55, 8, h * 0.46, 3, '#7A4A2A');
  }
  // วาล์วพวงมาลัยตรงกลาง หมุนช้า ๆ
  ctx.save();
  ctx.translate(x + w * 0.5, y + h * 0.47);
  ctx.rotate(t * 0.02);
  ctx.strokeStyle = '#D84B4B';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.stroke();
  line(ctx, -10, 0, 10, 0, 2.5, '#D84B4B');
  line(ctx, 0, -10, 0, 10, 2.5, '#D84B4B');
  ctx.restore();
  circle(ctx, x + w * 0.3, y + h * 0.12, 3, '#F5D2A8');
  circle(ctx, x + w * 0.62, y + h * 0.7, 3, '#F5D2A8');
  // ไอพ่นลงข้างล่าง — บอกว่าช่องใต้ท่อคือที่ที่ต้องมุด
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.03 + i / 4) % 1;
    ctx.globalAlpha = (1 - p) * 0.55;
    circle(ctx, x + w * 0.5 + 6 + p * 16, y + h * 0.95 + p * 6, 3 + p * 5, '#FFFFFF');
  }
  ctx.globalAlpha = 1;
}

/** ราวแขวนกระทะ 140 (หมอบ) — ราวเหล็ก กระทะ/หม้อห้อยแกว่ง */
function panRack(ctx, x, y, w, h) {
  const t = now();
  hanger(ctx, x + 10, y, '#4B5263', 3);
  hanger(ctx, x + w - 10, y, '#4B5263', 3);
  rr(ctx, x, y, w, 10, 5, vgrad(ctx, y, y + 10, '#8C94A6', '#4B5263'));
  const n = 4;
  for (let i = 0; i < n; i++) {
    const hx = x + 18 + i * (w - 36) / (n - 1);
    const sw = Math.sin(t * 0.05 + i * 1.3) * 0.12;
    ctx.save();
    ctx.translate(hx, y + 8);
    ctx.rotate(sw);
    line(ctx, 0, 0, 0, 16, 2, '#4B5263');
    if (i % 2) {
      rr(ctx, -2, 12, 4, 22, 2, '#3A2A22');
      ellipse(ctx, 0, h - 26, 18, 18, '#4A5061');
      ellipse(ctx, -2, h - 29, 12, 12, '#6C7486');
    } else {
      rr(ctx, -16, 20, 32, h - 34, 6, vgrad(ctx, 20, h - 14, '#E0916B', '#A0522D'));
      rr(ctx, -19, 20, 38, 6, 3, '#C06B3F');
    }
    ctx.restore();
  }
}

/** ฮูดดูดควันยาว 200 (หมอบ) — ฮูดสแตนเลส ช่องระบาย ไฟส่องลงเป็นกรวย */
function rangeHood(ctx, x, y, w, h) {
  const t = now();
  rr(ctx, x + w * 0.35, 0, w * 0.3, y + 6, 2, vgrad(ctx, 0, y, '#AEB6C6', '#8C94A6'));
  ctx.fillStyle = vgrad(ctx, y, y + h, '#DDE2EA', '#8C94A6');
  ctx.beginPath();
  ctx.moveTo(x + w * 0.3, y);
  ctx.lineTo(x + w * 0.7, y);
  ctx.lineTo(x + w, y + h - 16);
  ctx.lineTo(x, y + h - 16);
  ctx.closePath();
  ctx.fill();
  rr(ctx, x, y + h - 18, w, 18, 4, vgrad(ctx, y + h - 18, y + h, '#C3CAD6', '#6C7486'));
  for (let i = 0; i < 9; i++) line(ctx, x + w * 0.38 + i * w * 0.028, y + 12, x + w * 0.36 + i * w * 0.032, y + h * 0.45, 1.5, 'rgba(60,68,84,.5)');
  for (let i = 0; i < 3; i++) {
    const lx = x + w * (0.2 + i * 0.3);
    const on = 0.7 + 0.3 * Math.sin(t * 0.07 + i);
    circle(ctx, lx, y + h - 6, 4, `rgba(255,236,170,${on})`);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = vgrad(ctx, y + h, y + h + 34, `rgba(255,230,150,${0.22 * on})`, 'rgba(255,230,150,0)');
    ctx.beginPath();
    ctx.moveTo(lx - 5, y + h);
    ctx.lineTo(lx + 5, y + h);
    ctx.lineTo(lx + 18, y + h + 34);
    ctx.lineTo(lx - 18, y + h + 34);
    ctx.fill();
    ctx.restore();
  }
  sparkle(ctx, x + w * 0.55, y + h * 0.3, 3, 'rgba(255,255,255,.8)');
}

export default {
  nightKitchen_Obstacle_Single_01: flourSack,
  nightKitchen_Obstacle_Single_02: jamJars,
  nightKitchen_Obstacle_Single_03: breadTray,
  nightKitchen_Obstacle_Double_01: standMixer,
  nightKitchen_Obstacle_Double_02: oven,
  nightKitchen_Obstacle_Double_03: tallCake,
  nightKitchen_Obstacle_Crouch_01: steamPipe,
  nightKitchen_Obstacle_Crouch_02: panRack,
  nightKitchen_Obstacle_Crouch_03: rangeHood,
};
