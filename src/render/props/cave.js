// src/render/props/cave.js — 💎 ถ้ำคริสตัล (crystalCave_*)
// หินม่วงเทา คริสตัลฟ้า/ชมพูเรืองแสงในความมืด แสงตะเกียงอุ่น
import { now, rr, vgrad, circle, ellipse, poly, line, sparkle, glow, groundShadow, hanger } from './kit.js';

const ROCK = ['#6E6A8E', '#4A4668'];

/** ผลึกหนึ่งแท่ง — ฐาน (bx,by) สูง h กว้าง w เอียง a */
function crystal(ctx, bx, by, w, h, a, c1, c2) {
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(a);
  poly(ctx, [[-w / 2, 0], [-w / 2, -h * 0.75], [0, -h], [w / 2, -h * 0.75], [w / 2, 0]], vgrad(ctx, -h, 0, c1, c2));
  poly(ctx, [[0, -h], [w / 2, -h * 0.75], [w / 2, 0], [0, 0]], 'rgba(255,255,255,.18)');
  ctx.restore();
}

function rockBlob(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w * 0.06, y + h * 0.4);
  ctx.lineTo(x + w * 0.3, y + h * 0.08);
  ctx.lineTo(x + w * 0.62, y);
  ctx.lineTo(x + w * 0.9, y + h * 0.3);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
}

/** กลุ่มคริสตัล 46×40 — ผลึกฟ้าห้าแท่งบนฐานหิน ประกายวิบ */
function crystalCluster(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  ellipse(ctx, x + w / 2, y + h - 4, w / 2, 6, ROCK[1]);
  const sets = [[0.2, 0.62, -0.35], [0.38, 0.9, -0.12], [0.55, 1, 0.08], [0.72, 0.72, 0.3], [0.86, 0.5, 0.5]];
  for (const [fx, fh, a] of sets) crystal(ctx, x + w * fx, y + h - 3, 9, h * fh, a, '#BFF3FF', '#4FB6E8');
  const tw = 0.5 + 0.5 * Math.sin(t * 0.12);
  sparkle(ctx, x + w * 0.52, y + 6, 2 + tw * 3, '#FFFFFF');
  glow(ctx, x + w / 2, y + h * 0.5, w * 0.6, '120,220,255', 0.25);
}

/** เห็ดเรืองแสงถ้ำ 70×50 — เห็ดหมวกฟ้าเรืองสามดอก แสงเต้นเป็นจังหวะ */
function glowShrooms(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  const set = [[0.22, 0.7, 13], [0.55, 1, 17], [0.84, 0.55, 11]];
  set.forEach(([fx, fh, r], i) => {
    const cx = x + w * fx, top = y + h - h * fh;
    rr(ctx, cx - 3, top + r * 0.5, 6, h * fh - r * 0.5, 3, '#D8D2F0');
    const p = 0.5 + 0.5 * Math.sin(t * 0.07 + i * 2.1);
    glow(ctx, cx, top + r * 0.3, r * 2.2, '110,240,230', 0.2 + p * 0.3);
    ctx.fillStyle = vgrad(ctx, top - r * 0.4, top + r * 0.6, '#9FFBEF', '#2FB7B0');
    ctx.beginPath();
    ctx.ellipse(cx, top + r * 0.5, r, r * 0.8, 0, Math.PI, 0);
    ctx.fill();
    circle(ctx, cx - r * 0.35, top + r * 0.1, 2, '#E8FFFB');
  });
}

/** รถเหมืองคริสตัล 100×44 — รถเหล็กบนราง ล้อสองข้าง บรรทุกคริสตัลวาว */
function mineCart(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rr(ctx, x - 2, y + h - 4, w + 4, 4, 2, '#5A4632');
  for (let i = 0; i < 4; i++) crystal(ctx, x + 18 + i * 20, y + h * 0.42, 12, h * 0.45 + (i % 2) * 6, (i - 1.5) * 0.18, i % 2 ? '#FFC1EC' : '#BFF3FF', i % 2 ? '#D25BB5' : '#4FB6E8');
  poly(ctx, [[x, y + h * 0.35], [x + w, y + h * 0.35], [x + w - 8, y + h - 10], [x + 8, y + h - 10]], vgrad(ctx, y + h * 0.35, y + h - 10, '#8C7A6B', '#5A4632'));
  rr(ctx, x - 2, y + h * 0.32, w + 4, 5, 2, '#A9978A');
  for (const fx of [0.22, 0.5, 0.78]) circle(ctx, x + w * fx, y + h * 0.58, 2, '#3A2C20');
  for (const fx of [0.2, 0.8]) {
    circle(ctx, x + w * fx, y + h - 8, 7, '#3A3550');
    circle(ctx, x + w * fx, y + h - 8, 2.5, '#9C97BD');
  }
  sparkle(ctx, x + 38, y + 4, 2 + 2 * Math.abs(Math.sin(t * 0.1)), '#FFFFFF');
}

/** หินจีโอดผ่าซีก 60×100 — เปลือกหินหยาบ แกนในเป็นผลึกม่วงเรือง */
function geode(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  ctx.fillStyle = vgrad(ctx, y, y + h, ROCK[0], ROCK[1]);
  ctx.beginPath();
  ctx.moveTo(x + 2, y + h);
  ctx.quadraticCurveTo(x - 4, y + h * 0.2, x + w * 0.5, y);
  ctx.quadraticCurveTo(x + w + 4, y + h * 0.2, x + w - 2, y + h);
  ctx.closePath();
  ctx.fill();
  ellipse(ctx, x + w / 2, y + h * 0.52, w * 0.3, h * 0.34, '#2A1F45');
  const p = 0.5 + 0.5 * Math.sin(t * 0.05);
  glow(ctx, x + w / 2, y + h * 0.52, w * 0.55, '200,140,255', 0.25 + p * 0.25);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    crystal(ctx, x + w / 2 + Math.cos(a) * w * 0.22, y + h * 0.52 + Math.sin(a) * h * 0.26, 7, 12, a - Math.PI / 2, '#F1D9FF', '#9B5DE5');
  }
}

/** กองหินใหญ่ 120×80 — ก้อนหินซ้อนสามก้อน ตะไคร่เรืองนิด ๆ ฝุ่นหินร่วง */
function boulderPile(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rockBlob(ctx, x, y + h * 0.35, w * 0.55, h * 0.65, vgrad(ctx, y, y + h, ROCK[0], ROCK[1]));
  rockBlob(ctx, x + w * 0.42, y + h * 0.3, w * 0.58, h * 0.7, vgrad(ctx, y, y + h, '#7C789C', ROCK[1]));
  rockBlob(ctx, x + w * 0.2, y, w * 0.5, h * 0.55, vgrad(ctx, y, y + h * 0.6, '#8A86AA', '#5A5678'));
  for (let i = 0; i < 5; i++) ellipse(ctx, x + 20 + i * 20, y + h * (0.3 + (i % 3) * 0.2), 5, 2.5, 'rgba(140,230,190,.55)');
  crystal(ctx, x + w * 0.78, y + h * 0.34, 8, 14, 0.4, '#BFF3FF', '#4FB6E8');
  const p = (t * 0.02) % 1;
  ctx.globalAlpha = 1 - p;
  circle(ctx, x + w * 0.35, y + h * 0.55 + p * h * 0.4, 2, '#A9A4C8');
  ctx.globalAlpha = 1;
}

/** เสาคริสตัล 44×126 — ผลึกแท่งยาวโผล่จากฐานหิน แสงไหลขึ้นเสา */
function crystalPillar(ctx, x, y, w, h) {
  const t = now();
  groundShadow(ctx, x, y, w, h);
  rockBlob(ctx, x - 2, y + h - 22, w + 4, 22, ROCK[1]);
  crystal(ctx, x + w * 0.5, y + h - 8, w * 0.62, h - 8, 0, '#E3FBFF', '#3FA4DA');
  crystal(ctx, x + w * 0.2, y + h - 10, 10, h * 0.4, -0.25, '#BFF3FF', '#4FB6E8');
  crystal(ctx, x + w * 0.82, y + h - 10, 9, h * 0.3, 0.3, '#FFC1EC', '#D25BB5');
  const p = (t * 0.012) % 1;
  glow(ctx, x + w / 2, y + h * (1 - p), 18, '170,240,255', 0.5 * Math.sin(Math.PI * p));
}

/** หินย้อยกลุ่ม 90×96 (หมอบ) — เพดานหินหนา หินย้อยแหลมเรียงลงมา หยดน้ำหยด */
function stalactites(ctx, x, y, w, h) {
  const t = now();
  rr(ctx, x - 4, y, w + 8, h * 0.36, 10, vgrad(ctx, y, y + h * 0.36, ROCK[1], ROCK[0]));
  if (y > 2) rr(ctx, x + 6, 0, w - 12, y + 4, 0, ROCK[1]);
  const n = 5;
  for (let i = 0; i < n; i++) {
    const sx = x + 4 + i * (w - 8) / (n - 1);
    const len = h * (i % 2 ? 0.95 : 0.72);
    poly(ctx, [[sx - 9, y + h * 0.3], [sx + 9, y + h * 0.3], [sx, y + len]], vgrad(ctx, y, y + len, '#7C789C', '#524E72'));
    if (i % 2) crystal(ctx, sx + 4, y + h * 0.32, 5, 10, Math.PI, '#BFF3FF', '#4FB6E8');
  }
  const p = (t * 0.02) % 1;
  ellipse(ctx, x + w * 0.5, y + h * 0.95 + p * 18, 2, 3, `rgba(170,230,255,${1 - p})`);
}

/** คานเหมืองกับตะเกียง 140×86 (หมอบ) — คานไม้สองชั้น เสาค้ำเฉียง ตะเกียงแกว่ง */
function mineBeam(ctx, x, y, w, h) {
  const t = now();
  hanger(ctx, x + 8, y, '#6B4226', 8);
  hanger(ctx, x + w - 8, y, '#6B4226', 8);
  rr(ctx, x, y, w, h * 0.3, 4, vgrad(ctx, y, y + h * 0.3, '#B08455', '#6B4226'));
  rr(ctx, x + 6, y + h * 0.36, w - 12, h * 0.22, 4, vgrad(ctx, y, y + h, '#9C6A3E', '#6B4226'));
  line(ctx, x + 12, y + h * 0.3, x + 34, y + h * 0.36, 7, '#6B4226');
  line(ctx, x + w - 12, y + h * 0.3, x + w - 34, y + h * 0.36, 7, '#6B4226');
  for (const fx of [0.2, 0.5, 0.8]) circle(ctx, x + w * fx, y + h * 0.15, 2.5, '#3A2C20');
  // ตะเกียงแกว่ง
  const sw = Math.sin(t * 0.05) * 0.25;
  ctx.save();
  ctx.translate(x + w / 2, y + h * 0.58);
  ctx.rotate(sw);
  line(ctx, 0, 0, 0, 10, 1.6, '#3A3550');
  rr(ctx, -8, 10, 16, 18, 4, '#3A3550');
  rr(ctx, -5, 13, 10, 12, 3, '#FFD37A');
  glow(ctx, 0, 19, 30, '255,200,110', 0.45);
  ctx.restore();
}

/** ซุ้มคริสตัลยาว 200×72 (หมอบ) — เพดานหินยาว คริสตัลห้อยเรียงกันกะพริบไล่เป็นคลื่น */
function crystalArch(ctx, x, y, w, h) {
  const t = now();
  if (y > 2) rr(ctx, x + 10, 0, w - 20, y + 4, 0, ROCK[1]);
  rr(ctx, x - 4, y, w + 8, h * 0.42, 12, vgrad(ctx, y, y + h * 0.42, ROCK[1], ROCK[0]));
  const n = 10;
  for (let i = 0; i < n; i++) {
    const cx = x + 8 + i * (w - 16) / (n - 1);
    // ปลายผลึกต้องไม่ต่ำกว่าท้องกล่อง (y + h) — ต่ำกว่านั้นตาจะอ่านว่าช่องลอดแคบกว่าจริง
    const len = h * (0.34 + 0.08 * ((i * 7) % 4));
    const pink = i % 3 === 1;
    crystal(ctx, cx, y + h * 0.36, 11, len, Math.PI, pink ? '#FFC1EC' : '#BFF3FF', pink ? '#D25BB5' : '#4FB6E8');
    const p = 0.5 + 0.5 * Math.sin(t * 0.1 - i * 0.6);
    glow(ctx, cx, y + h * 0.36 + len * 0.8, 14, pink ? '255,150,230' : '130,220,255', p * 0.35);
  }
}

export default {
  crystalCave_Obstacle_Single_01: crystalCluster,
  crystalCave_Obstacle_Single_02: glowShrooms,
  crystalCave_Obstacle_Single_03: mineCart,
  crystalCave_Obstacle_Double_01: geode,
  crystalCave_Obstacle_Double_02: boulderPile,
  crystalCave_Obstacle_Double_03: crystalPillar,
  crystalCave_Obstacle_Crouch_01: stalactites,
  crystalCave_Obstacle_Crouch_02: mineBeam,
  crystalCave_Obstacle_Crouch_03: crystalArch,
};
