// src/render/props/beach.js — 🌅 ชายหาดยามเย็น (sunsetBeach_*)
// ไม้ท่าเรือ ทรายส้มอุ่น ของทะเล แสงอาทิตย์ตกอมชมพู
import { TAU, now, rr, vgrad, circle, ellipse, poly, line, sparkle, glow, groundShadow, hanger } from './kit.js';

const WOOD = ['#C98B55', '#8A5A33'];

function plank(ctx, x, y, w, h) {
  rr(ctx, x, y, w, h, 3, vgrad(ctx, y, y + h, WOOD[0], WOOD[1]));
  line(ctx, x + 4, y + h * 0.5, x + w - 4, y + h * 0.5, 1, 'rgba(90,50,25,.35)');
}

/** กองทรายปักธง 46×40 — กองทรายโค้ง พลั่วปัก ธงสามเหลี่ยมสะบัด */
function sandMound(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  ctx.fillStyle = vgrad(ctx, y + h * 0.3, y + h, '#FFD9A0', '#E0A865');
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.1, x + w, y + h);
  ctx.fill();
  for (let i = 0; i < 4; i++) circle(ctx, x + 10 + i * 8, y + h * 0.75 - (i % 2) * 4, 1.4, '#C98B55');
  line(ctx, x + w * 0.6, y + h * 0.35, x + w * 0.6, y, 2, '#6B4226');
  const f = Math.sin(t * 0.15) * 3;
  poly(ctx, [[x + w * 0.6, y], [x + w * 0.6 + 14, y + 4 + f * 0.3], [x + w * 0.6, y + 9]], '#FF6B6B');
  poly(ctx, [[x + w * 0.2, y + h * 0.5], [x + w * 0.32, y + h * 0.3], [x + w * 0.36, y + h * 0.36], [x + w * 0.25, y + h * 0.55]], '#4FB6E8');
}

/** กล่องคูลเลอร์ 70×50 — กล่องแดงขาว ฝาเปิดแง้ม มีน้ำแข็งกับขวดโผล่ */
function cooler(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x, y + 14, w, h - 14, 6, vgrad(ctx, y + 14, y + h, '#FF6B6B', '#C8384A'));
  rr(ctx, x + 4, y + h * 0.55, w - 8, 6, 3, '#FFFFFF');
  const lift = 3 + Math.sin(t * 0.05) * 2;
  circle(ctx, x + 18, y + 14, 5, '#DFF4FF');
  circle(ctx, x + 30, y + 13, 4, '#DFF4FF');
  rr(ctx, x + w * 0.62, y + 2, 7, 16, 2, '#6FD3A8');
  ctx.save();
  ctx.translate(x, y + 14 - lift);
  ctx.rotate(-0.08);
  rr(ctx, -1, -6, w + 2, 9, 4, '#FFFFFF');
  ctx.restore();
  rr(ctx, x + w / 2 - 10, y + h * 0.3, 20, 5, 2, '#FFFFFF');
}

/** ขอนไม้ลอยน้ำ 100×44 — ขอนไม้ยาวผิวซีด กิ่งสั้น เปลือกหอยวาว สาหร่ายพันนิดหน่อย */
function driftwood(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x, y + h * 0.3, w, h * 0.7, h * 0.35, vgrad(ctx, y + h * 0.3, y + h, '#D9C2A3', '#9C7B58'));
  ellipse(ctx, x + 8, y + h * 0.65, 7, h * 0.33, '#C9AE8A');
  ctx.strokeStyle = '#8A6A48'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x + 8, y + h * 0.65, 4, h * 0.2, 0, 0, TAU); ctx.stroke();
  line(ctx, x + w * 0.6, y + h * 0.35, x + w * 0.72, y + 2, 5, '#9C7B58');
  for (let i = 0; i < 4; i++) line(ctx, x + 22 + i * 18, y + h * 0.55, x + 34 + i * 18, y + h * 0.58, 1.2, 'rgba(110,80,50,.45)');
  line(ctx, x + w * 0.3, y + h * 0.35, x + w * 0.34, y + h, 3, '#4CA862');
  ctx.fillStyle = '#FFE0EA';
  ctx.beginPath(); ctx.arc(x + w * 0.45, y + h * 0.36, 7, Math.PI, 0); ctx.fill();
  const tw = Math.abs(Math.sin(t * 0.09));
  sparkle(ctx, x + w * 0.45, y + h * 0.24, 1.5 + tw * 2.5, '#FFFFFF');
  circle(ctx, x + w * 0.82, y + h * 0.36, 4, '#FFB38A');
}

/** เสาห่วงชูชีพ 60×100 — เสาไม้สูง ห่วงแดงขาวแขวน ห่วงแกว่ง */
function lifebuoyPost(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x + w / 2 - 6, y, 12, h, 3, vgrad(ctx, y, y + h, WOOD[0], WOOD[1]));
  rr(ctx, x + 4, y + 4, w - 8, 12, 3, '#F5E6C8');
  line(ctx, x + w / 2, y + 16, x + w / 2, y + 30, 2, '#6B4226');
  ctx.save();
  ctx.translate(x + w / 2, y + 30);
  ctx.rotate(Math.sin(t * 0.04) * 0.08);
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = i % 2 ? '#FFFFFF' : '#E8434F';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(0, 22, 18, (i / 4) * TAU, ((i + 1) / 4) * TAU);
    ctx.stroke();
  }
  ctx.restore();
  plank(ctx, x, y + h - 10, w, 10);
}

/** เรือพายคว่ำ 120×80 — เรือไม้ลายทางคว่ำบนขาตั้ง ไม้พายพาด คลื่นเลียข้างเรือ */
function rowboat(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x + 12, y + h * 0.6, 8, h * 0.4, 2, WOOD[1]);
  rr(ctx, x + w - 20, y + h * 0.6, 8, h * 0.4, 2, WOOD[1]);
  ctx.fillStyle = vgrad(ctx, y, y + h * 0.7, '#6EC1FF', '#2F7FC0');
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.66);
  ctx.quadraticCurveTo(x + w * 0.1, y, x + w * 0.5, y);
  ctx.quadraticCurveTo(x + w * 0.9, y, x + w, y + h * 0.66);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  rr(ctx, x, y + h * 0.3, w, 8, 0, '#FFFFFF');
  rr(ctx, x, y + h * 0.5, w, 5, 0, '#FF6B6B');
  ctx.restore();
  rr(ctx, x - 2, y + h * 0.62, w + 4, 7, 3, '#F5E6C8');
  line(ctx, x + 10, y + h * 0.85, x + w - 6, y + h * 0.45, 4, WOOD[0]);
  ellipse(ctx, x + w - 8, y + h * 0.45, 8, 4, WOOD[0], -0.35);
  const wv = Math.sin(t * 0.06) * 3;
  ctx.fillStyle = 'rgba(210,240,255,.8)';
  ctx.beginPath();
  ctx.moveTo(x - 4, y + h);
  for (let k = 0; k <= 6; k++) ctx.quadraticCurveTo(x + (k - 0.5) * w / 6, y + h - 10 - wv, x + k * w / 6, y + h - 4);
  ctx.lineTo(x + w + 4, y + h);
  ctx.fill();
}

/** เสาไฟท่าเรือ 44×126 — เสาไม้สูงพันเชือก โคมไฟยอดเสากะพริบ */
function dockLamp(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x + w / 2 - 7, y + 24, 14, h - 24, 4, vgrad(ctx, y, y + h, WOOD[0], WOOD[1]));
  for (let i = 0; i < 4; i++) rr(ctx, x + w / 2 - 9, y + h * 0.55 + i * 6, 18, 3, 1.5, '#E8D3A6');
  rr(ctx, x + 6, y + 6, w - 12, 20, 5, '#3A3550');
  const on = 0.6 + 0.4 * Math.abs(Math.sin(t * 0.06));
  rr(ctx, x + 10, y + 9, w - 20, 14, 3, `rgba(255,214,120,${on})`);
  glow(ctx, x + w / 2, y + 16, 34, '255,200,110', 0.45 * on);
  poly(ctx, [[x + 4, y + 7], [x + w / 2, y - 2], [x + w - 4, y + 7]], '#3A3550');
  plank(ctx, x - 4, y + h - 10, w + 8, 10);
}

/** ตาข่ายจับปลา 90×96 (หมอบ) — ไม้ขึงสองข้าง ตาข่ายหย่อน ลูกทุ่นสีส้ม ไหวตามลม */
function fishingNet(ctx, x, y, w, h) {
  const t = now();
  hanger(ctx, x + 6, y, WOOD[1], 6);
  hanger(ctx, x + w - 6, y, WOOD[1], 6);
  rr(ctx, x, y, w, 10, 4, vgrad(ctx, y, y + 10, WOOD[0], WOOD[1]));
  const sway = Math.sin(t * 0.04) * 4;
  ctx.fillStyle = 'rgba(245,230,200,.35)';
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 8);
  ctx.lineTo(x + w - 2, y + 8);
  ctx.quadraticCurveTo(x + w + sway, y + h * 0.7, x + w * 0.5 + sway, y + h - 4);
  ctx.quadraticCurveTo(x + sway, y + h * 0.7, x + 2, y + 8);
  ctx.fill();
  ctx.strokeStyle = '#E8D3A6';
  ctx.lineWidth = 1.3;
  for (let i = 1; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * w / 7, y + 10);
    ctx.quadraticCurveTo(x + i * w / 7 + sway, y + h * 0.6, x + w * 0.5 + sway, y + h - 6);
    ctx.stroke();
  }
  for (let k = 1; k < 5; k++) {
    const yy = y + 10 + k * (h - 16) / 5;
    ctx.beginPath();
    ctx.moveTo(x + k * 6 + sway * k / 5, yy);
    ctx.quadraticCurveTo(x + w / 2 + sway, yy + 8, x + w - k * 6 + sway * k / 5, yy);
    ctx.stroke();
  }
  for (const [fx, fy] of [[0.25, 0.4], [0.7, 0.55], [0.48, 0.85]]) circle(ctx, x + w * fx + sway * fy, y + h * fy, 5, '#FF8A3D');
}

/** คานท่าเรือพันเชือก 140×86 (หมอบ) — คานไม้หนาสองชั้น เชือกพันและห้อย ห่วงเหล็ก */
function pierBeam(ctx, x, y, w, h) {
  const t = now();
  hanger(ctx, x + 12, y, WOOD[1], 10);
  hanger(ctx, x + w - 12, y, WOOD[1], 10);
  plank(ctx, x, y, w, h * 0.34);
  plank(ctx, x + 8, y + h * 0.4, w - 16, h * 0.3);
  for (const fx of [0.3, 0.7]) {
    for (let i = 0; i < 4; i++) rr(ctx, x + w * fx - 8 + i * 4, y - 2, 3, h * 0.74, 1.5, '#E8D3A6');
  }
  const sw = Math.sin(t * 0.05) * 5;
  ctx.strokeStyle = '#E8D3A6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.3, y + h * 0.7);
  ctx.quadraticCurveTo(x + w * 0.5 + sw, y + h, x + w * 0.7, y + h * 0.7);
  ctx.stroke();
  ctx.strokeStyle = '#8C94A6';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x + w * 0.5 + sw * 0.5, y + h * 0.84, 6, 0, TAU); ctx.stroke();
}

/** ซุ้มป้ายชายหาด 200×72 (หมอบ) — ป้ายไม้ยาว "SUNSET BEACH" ธงราวสามเหลี่ยมสะบัดใต้ป้าย */
function beachSign(ctx, x, y, w, h) {
  const t = now();
  hanger(ctx, x + 14, y, WOOD[1], 8);
  hanger(ctx, x + w - 14, y, WOOD[1], 8);
  rr(ctx, x, y, w, h * 0.55, 8, vgrad(ctx, y, y + h * 0.55, '#FFB86B', '#D9763A'));
  rr(ctx, x + 6, y + 5, w - 12, h * 0.55 - 10, 5, 'rgba(255,240,210,.35)');
  ctx.fillStyle = '#6B2E1A';
  ctx.font = `700 ${Math.round(h * 0.26)}px Mali, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SUNSET BEACH', x + w / 2, y + h * 0.28);
  const cols = ['#FF6B6B', '#FFD84D', '#4FB6E8', '#6FD3A8', '#FF8FB5'];
  const n = 12;
  for (let i = 0; i < n; i++) {
    const fx = x + 6 + i * (w - 12) / n;
    const flap = Math.sin(t * 0.12 + i * 0.7) * 3;
    poly(ctx, [[fx, y + h * 0.55], [fx + (w - 12) / n, y + h * 0.55], [fx + (w - 12) / n / 2 + flap, y + h - 2]], cols[i % cols.length]);
  }
  circle(ctx, x + w - 18, y + h * 0.28, 7, '#FFE08A');
  glow(ctx, x + w - 18, y + h * 0.28, 16, '255,220,130', 0.35);
}

export default {
  sunsetBeach_Obstacle_Single_01: sandMound,
  sunsetBeach_Obstacle_Single_02: cooler,
  sunsetBeach_Obstacle_Single_03: driftwood,
  sunsetBeach_Obstacle_Double_01: lifebuoyPost,
  sunsetBeach_Obstacle_Double_02: rowboat,
  sunsetBeach_Obstacle_Double_03: dockLamp,
  sunsetBeach_Obstacle_Crouch_01: fishingNet,
  sunsetBeach_Obstacle_Crouch_02: pierBeam,
  sunsetBeach_Obstacle_Crouch_03: beachSign,
};
