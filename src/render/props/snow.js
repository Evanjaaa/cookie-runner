// src/render/props/snow.js — ❄️ ทุ่งหิมะ (snowfield_*)
// น้ำแข็งฟ้าใส หิมะขาวอมฟ้า ขอบเข้มพอให้อ่านออกบนพื้นหิมะขาวทั้งจอ
import { TAU, now, rr, vgrad, circle, ellipse, poly, line, sparkle, glow, groundShadow, hanger } from './kit.js';

const ICE = ['#E6F7FF', '#6FB8E6'];

/** ฝาหิมะหยัก ๆ วางบนขอบบนของชิ้น */
function snowCap(ctx, x, y, w, drip = 5) {
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(x - 2, y + 4);
  ctx.quadraticCurveTo(x + w / 2, y - 7, x + w + 2, y + 4);
  for (let k = 5; k >= 0; k--) ctx.quadraticCurveTo(x + (k + 0.5) * w / 6, y + 4 + (k % 2 ? drip : drip * 0.3), x + k * w / 6, y + 4);
  ctx.fill();
}

/** ต้นสนเล็กมีหิมะ */
function pine(ctx, cx, by, s) {
  rr(ctx, cx - 3 * s, by - 8 * s, 6 * s, 8 * s, 2, '#7A4A2A');
  for (let i = 0; i < 3; i++) {
    const yy = by - 8 * s - i * 11 * s, hw = (15 - i * 4) * s;
    poly(ctx, [[cx - hw, yy], [cx, yy - 16 * s], [cx + hw, yy]], i % 2 ? '#2E7D5B' : '#3A9A6E');
    poly(ctx, [[cx - hw * 0.5, yy - 7 * s], [cx, yy - 16 * s], [cx + hw * 0.5, yy - 7 * s]], '#FFFFFF');
  }
}

/** ตุ๊กตาหิมะจิ๋ว 46×40 — สองก้อน จมูกแครอท ผ้าพันคอปลิว */
function snowman(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  circle(ctx, x + w / 2, y + h - 12, 13, '#FFFFFF');
  circle(ctx, x + w / 2, y + 12, 10, '#FFFFFF');
  ellipse(ctx, x + w / 2 + 4, y + h - 8, 6, 5, 'rgba(160,200,230,.45)');
  circle(ctx, x + w / 2 - 3, y + 10, 1.4, '#2A2A3A');
  circle(ctx, x + w / 2 + 3, y + 10, 1.4, '#2A2A3A');
  poly(ctx, [[x + w / 2, y + 13], [x + w / 2 + 8, y + 14.5], [x + w / 2, y + 16]], '#FF8A3D');
  rr(ctx, x + w / 2 - 10, y + 20, 20, 5, 2, '#E8434F');
  const f = Math.sin(t * 0.1) * 3;
  poly(ctx, [[x + w / 2 + 6, y + 22], [x + w / 2 + 16, y + 26 + f], [x + w / 2 + 14, y + 30 + f], [x + w / 2 + 4, y + 25]], '#E8434F');
  for (let i = 0; i < 2; i++) circle(ctx, x + w / 2, y + h - 16 + i * 7, 1.5, '#2A2A3A');
}

/** ก้อนน้ำแข็งแตก 70×50 — ก้อนน้ำแข็งเหลี่ยมสามก้อนเอียง รอยร้าว ประกาย */
function iceChunks(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  const blocks = [[0, 0.36, 0.42, 0.64, -0.1], [0.34, 0, 0.4, 1, 0.05], [0.66, 0.3, 0.34, 0.7, 0.14]];
  for (const [fx, fy, fw, fh, a] of blocks) {
    ctx.save();
    ctx.translate(x + w * (fx + fw / 2), y + h);
    ctx.rotate(a);
    rr(ctx, -w * fw / 2, -h * fh, w * fw, h * fh, 4, vgrad(ctx, -h * fh, 0, ICE[0], ICE[1]));
    poly(ctx, [[-w * fw / 2 + 3, -h * fh + 3], [0, -h * fh + 3], [-w * fw / 2 + 3, -h * fh * 0.4]], 'rgba(255,255,255,.55)');
    line(ctx, -2, -h * fh * 0.7, 3, -h * fh * 0.4, 1.2, 'rgba(60,120,170,.5)');
    ctx.restore();
  }
  snowCap(ctx, x + w * 0.34, y + 1, w * 0.4, 3);
  sparkle(ctx, x + w * 0.55, y + h * 0.3, 1.5 + 2 * Math.abs(Math.sin(t * 0.1)), '#FFFFFF');
}

/** เลื่อนหิมะขนของขวัญ 100×44 — เลื่อนไม้แดง กล่องของขวัญสองกล่อง กระดิ่งไหว */
function sled(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  ctx.strokeStyle = '#C8A24A';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + h - 3);
  ctx.lineTo(x + w - 10, y + h - 3);
  ctx.quadraticCurveTo(x + w + 2, y + h - 3, x + w - 2, y + h - 14);
  ctx.stroke();
  rr(ctx, x + 2, y + h - 20, w - 12, 12, 4, vgrad(ctx, y + h - 20, y + h - 8, '#E8434F', '#A82032'));
  rr(ctx, x + 10, y + 6, 30, h - 26, 3, '#6FB8E6');
  rr(ctx, x + 23, y + 6, 4, h - 26, 1, '#FFFFFF');
  rr(ctx, x + 46, y + 14, 26, h - 34, 3, '#6FD3A8');
  rr(ctx, x + 57, y + 14, 4, h - 34, 1, '#FFE08A');
  ellipse(ctx, x + 25, y + 5, 6, 3, '#FFFFFF');
  const sw = Math.sin(t * 0.12) * 0.4;
  ctx.save();
  ctx.translate(x + w - 14, y + h - 22);
  ctx.rotate(sw);
  line(ctx, 0, 0, 0, 5, 1.2, '#8A6A2A');
  circle(ctx, 0, 8, 4, '#FFD24D');
  ctx.restore();
}

/** ยอดน้ำแข็งแหลม 60×100 — ภูเขาน้ำแข็งเล็กยอดแหลม แสงสะท้อนวิ่งขึ้น */
function iceSpire(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  poly(ctx, [[x, y + h], [x + w * 0.25, y + h * 0.35], [x + w * 0.5, y], [x + w * 0.72, y + h * 0.4], [x + w, y + h]], vgrad(ctx, y, y + h, ICE[0], '#4E97C8'));
  poly(ctx, [[x + w * 0.5, y], [x + w * 0.72, y + h * 0.4], [x + w, y + h], [x + w * 0.55, y + h]], 'rgba(40,90,140,.18)');
  poly(ctx, [[x + w * 0.35, y + h * 0.3], [x + w * 0.5, y], [x + w * 0.62, y + h * 0.28], [x + w * 0.5, y + h * 0.22]], '#FFFFFF');
  const p = (t * 0.01) % 1;
  ctx.save();
  ctx.globalAlpha = Math.sin(Math.PI * p) * 0.8;
  line(ctx, x + w * 0.3, y + h * (1 - p), x + w * 0.5, y + h * (0.8 - p), 3, '#FFFFFF');
  ctx.restore();
  snowCap(ctx, x - 2, y + h - 12, w + 4, 2);
}

/** กองหิมะสูงกับต้นสน 120×80 — เนินหิมะใหญ่ ต้นสนสองต้นโผล่ หิมะร่วงจากกิ่ง */
function snowDrift(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  pine(ctx, x + w * 0.3, y + h * 0.55, 1.15);
  pine(ctx, x + w * 0.72, y + h * 0.6, 0.95);
  ctx.fillStyle = vgrad(ctx, y + h * 0.35, y + h, '#FFFFFF', '#CFE6F5');
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.quadraticCurveTo(x + w * 0.1, y + h * 0.4, x + w * 0.45, y + h * 0.48);
  ctx.quadraticCurveTo(x + w * 0.85, y + h * 0.36, x + w, y + h);
  ctx.fill();
  const p = (t * 0.015) % 1;
  ctx.globalAlpha = 1 - p;
  circle(ctx, x + w * 0.36, y + h * 0.1 + p * h * 0.35, 2.2, '#FFFFFF');
  circle(ctx, x + w * 0.66, y + h * 0.25 + p * h * 0.3, 1.8, '#FFFFFF');
  ctx.globalAlpha = 1;
}

/** เสาผลึกน้ำแข็ง 44×126 — แท่งน้ำแข็งหกเหลี่ยมสูง เกล็ดน้ำแข็งลอยวนรอบ */
function icePillar(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  poly(ctx, [[x + 4, y + h], [x + 4, y + 18], [x + w / 2, y], [x + w - 4, y + 18], [x + w - 4, y + h]], vgrad(ctx, y, y + h, ICE[0], ICE[1]));
  poly(ctx, [[x + w / 2, y], [x + w - 4, y + 18], [x + w - 4, y + h], [x + w / 2, y + h]], 'rgba(40,90,140,.16)');
  rr(ctx, x + 9, y + 24, 4, h - 36, 2, 'rgba(255,255,255,.6)');
  for (let i = 0; i < 3; i++) line(ctx, x + 6, y + 40 + i * 28, x + w - 6, y + 46 + i * 28, 1.2, 'rgba(60,120,170,.35)');
  for (let i = 0; i < 4; i++) {
    const a = t * 0.03 + (i / 4) * TAU;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(a);
    sparkle(ctx, x + w / 2 + Math.cos(a) * (w * 0.7), y + h * 0.3 + i * 18, 2.5, '#FFFFFF');
  }
  ctx.globalAlpha = 1;
  snowCap(ctx, x + 2, y + 10, w - 4, 3);
}

/** คานน้ำแข็งย้อย 90×96 (หมอบ) — คานน้ำแข็งหนามีหิมะด้านบน หยาดน้ำแข็งย้อยยาวลงมา */
function icicleBeam(ctx, x, y, w, h) {
  const t = now();
  hanger(ctx, x + 10, y, '#9CC9E8', 6);
  hanger(ctx, x + w - 10, y, '#9CC9E8', 6);
  rr(ctx, x, y + 4, w, h * 0.34, 8, vgrad(ctx, y, y + h * 0.4, ICE[0], ICE[1]));
  snowCap(ctx, x, y, w, 5);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const cx = x + 6 + i * (w - 12) / (n - 1);
    const len = h * (i % 2 ? 0.98 : 0.74);
    poly(ctx, [[cx - 7, y + h * 0.34], [cx + 7, y + h * 0.34], [cx, y + len]], vgrad(ctx, y, y + len, '#DDF3FF', '#7FC0EA'));
  }
  sparkle(ctx, x + w * 0.4, y + h * 0.6, 1.5 + 2 * Math.abs(Math.sin(t * 0.09)), '#FFFFFF');
}

/** กิ่งสนหิมะ 140×86 (หมอบ) — กิ่งสนหนาพาดยาว ใบสนเป็นชั้น หิมะทับ หิมะโปรยจากกิ่ง */
function pineBranch(ctx, x, y, w, h) {
  const t = now();
  hanger(ctx, x + 6, y, '#6B4226', 10);
  rr(ctx, x, y + h * 0.18, w, 10, 5, '#7A4A2A');
  for (let i = 0; i < 7; i++) {
    const cx = x + 10 + i * (w - 20) / 6;
    poly(ctx, [[cx - 18, y + h * 0.22], [cx + 18, y + h * 0.22], [cx, y + h * (i % 2 ? 0.95 : 0.8)]], i % 2 ? '#2E7D5B' : '#3A9A6E');
  }
  snowCap(ctx, x - 4, y + h * 0.05, w + 8, 6);
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.012 + i / 3) % 1;
    ctx.globalAlpha = 1 - p;
    circle(ctx, x + 30 + i * 40 + Math.sin(t * 0.05 + i) * 4, y + h * 0.9 + p * 26, 2, '#FFFFFF');
  }
  ctx.globalAlpha = 1;
}

/** ซุ้มน้ำแข็งยาว 200×72 (หมอบ) — แผ่นน้ำแข็งยาวใสมีแสงออโรราสะท้อน หยาดน้ำแข็งสั้นเรียง */
function iceArch(ctx, x, y, w, h) {
  const t = now();
  for (const px of [x + 16, x + w - 16]) hanger(ctx, px, y, '#9CC9E8', 8);
  rr(ctx, x, y + 4, w, h * 0.55, 10, vgrad(ctx, y, y + h * 0.6, ICE[0], ICE[1]));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y + 4, w, h * 0.55, 10);
  ctx.clip();
  const shift = (t * 0.6) % (w + 80);
  const g = ctx.createLinearGradient(x + shift - 80, 0, x + shift, 0);
  g.addColorStop(0, 'rgba(140,255,200,0)');
  g.addColorStop(0.5, 'rgba(140,255,200,.4)');
  g.addColorStop(1, 'rgba(190,150,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  snowCap(ctx, x - 2, y, w + 4, 4);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const cx = x + 8 + i * (w - 16) / (n - 1);
    const len = h * (0.75 + 0.2 * ((i * 5) % 3) / 2);
    poly(ctx, [[cx - 5, y + h * 0.55], [cx + 5, y + h * 0.55], [cx, y + Math.min(h, len)]], vgrad(ctx, y, y + h, '#DDF3FF', '#7FC0EA'));
  }
}

export default {
  snowfield_Obstacle_Single_01: snowman,
  snowfield_Obstacle_Single_02: iceChunks,
  snowfield_Obstacle_Single_03: sled,
  snowfield_Obstacle_Double_01: iceSpire,
  snowfield_Obstacle_Double_02: snowDrift,
  snowfield_Obstacle_Double_03: icePillar,
  snowfield_Obstacle_Crouch_01: icicleBeam,
  snowfield_Obstacle_Crouch_02: pineBranch,
  snowfield_Obstacle_Crouch_03: iceArch,
};
