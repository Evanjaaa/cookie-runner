// src/town/castle-lounge.js
// ─────────────────────────────────────────────────────────────
// ปราสาทแมวเหมียว ชั้น 2 · COZY LOUNGE (ผู้ใช้ 7 พ.ย. — สเปกใน CASTLE_DESIGN.md)
//   โถงพักผ่อนเปิดโล่ง ไม่แบ่งห้อง · มุมหน้าตรง · สไตล์/สถาปัตยกรรมชุดเดียวกับชั้น 1 (ใช้ชิ้นจาก castle-hall.js)
//   ต่างจากชั้น 1: พื้นไม้ครีมอุ่น + พรมใหญ่ลายอุ้งเท้า · โคมระย้ารูปแมว · เฟอร์นิเจอร์นุ่มขอบมน
//
// เรียงซ้าย → ขวา: ทางลงชั้น 1 · ชั้นหนังสือใหญ่ · มุมอ่านหนังสือ (เก้าอี้นวม + โคมตั้งพื้น) · เบาะนั่งพื้น + โต๊ะน้ำชา (นาฬิกาแมวบนผนัง)
//   · โซฟาใหญ่ชมพู (กลางกลุ่ม · หน้าต่างบานโค้งใหญ่ม่านชมพู) · เต็นท์พักผ่อน · ตู้ขนม/ตู้โชว์ของหวาน · คอนโดแมว (ปีนได้) · บันไดขึ้นชั้น 3
// ของทุกชิ้นชิดผนังหลัง — พื้นเดิน GY..H ว่างตลอดแนว · ไม่มีของหน้าสุดบังตัวละคร
// ที่นั่งหลายคน: โซฟา 4 ที่ · เบาะพื้น 3 ที่ (p.seats → main.js seatX) · ผิวที่ยืนได้: โซฟา โต๊ะน้ำชา ตู้ขนม ชั้นคอนโดแมว
// ─────────────────────────────────────────────────────────────
import { H, GY, flat } from './layout.js';
import { cached, lg, heart, star } from './world.js';
import {
  TAU, hash, LAV, SPUR, PINK, LPINK, CREAM, GOLD, SGOLD, GOLD_D, BAY, CEIL, WALL_B, GRAND,
  rr, archPath, goldV, crownIcon, pawIcon, catFace, label, drawBay, drawPillar, drawPlantArt, drawStairs, drawStairsFront, shaded, drawFloorSegs,
  chandelier, bayKey, drawWindowTwinkles, shaftColors, sparkleHint, stairsSurface, stairsDoor,
} from './castle-hall.js';
import { sky } from './castle-sky.js';

// ── ผัง ───────────────────────────────────────────────────────
export const LW = 3400;                    // สั้นกว่าชั้น 1 (3,600)
const NB = Math.ceil(LW / BAY);            // 9 ช่วงเสา (ช่วงสุดท้ายเห็นครึ่งเดียว — บันได)
const bayC = (i) => i * BAY + BAY / 2;
const BAYS = ['door', 'bare', 'win', 'clock', 'grand', 'paint', 'bare', 'bare', 'bare'];
const X = {
  down: bayC(0), books: bayC(1), chair: 960, lamp: 1062, table: 1440, sofa: bayC(4),
  tent: 2090, tent2: 2290, snack: bayC(6), condo: 2950, stairs: 3080,
};
// เบาะนั่งพื้นสามใบรอบโต๊ะน้ำชา [x, ลาย 0 หัวใจชมพู · 1 ดาวม่วง · 2 อุ้งเท้าพีช]
const CUSHIONS = [[1240, 0], [1312, 1], [1586, 2]];
const SOFA_W = 330, SOFA_SEATS = [-120, -40, 40, 120];
const PLANTS = [[822, 1], [2424, 0], [2780, 1]];
const CHANDELIERS = [800, 1600, 2400];   // โคมระย้าคริสตัลหรู (castle-hall chandelier) ห้อยตรงแนวเสา — ไม่ทับหน้าต่าง/กรอบรูป/ของสูง
const RUG = { x0: 1192, x1: 2030 };
const BOOKS = { w: 220, h: 238 }, SNACK = { w: 170, h: 150 }, TENT = { w: 194, h: 152 }, CONDO = { w: 190, h: 232 };
// ชั้นคอนโดแมว [กลาง x, สูงจากพื้น, ครึ่งกว้าง]: เบาะชมพูบนเสาเตี้ย (ซ้าย) · ชั้นเหนือบ้านแมว (ขวา) · ชั้นซ้าย · ยอด
const PERCH = [[X.condo - 56, 70, 32], [X.condo + 42, 124, 42], [X.condo - 42, 176, 40], [X.condo + 28, 228, 44]];
const HOUSE_X = X.condo + 46;   // บ้านแมวหลังคาหูแมว ตั้งบนฐานชั้นล่างสุด

export const L_PLACES = [
  { id: 'lDown', kind: 'down', act: 'ลงชั้น 1', name: 'ทางลงชั้น 1', x: X.down - 80, w: 160, h: 230 },
  // ชั้นหนังสือเป็นของตกแต่ง (ผู้ใช้ 8 พ.ย. ไม่ต้องหยิบหนังสือได้)
  { id: 'lChair', kind: 'bench', name: 'เก้าอี้อ่านหนังสือ', x: X.chair - 52, w: 104, h: 84, sitDy: 28 },
  // โคมไฟ: แตะที่ตัวโคมเพื่อเปิด/ปิด (ไม่มีปุ่มชมพู — ผู้ใช้ 8 พ.ย.) · tap = ใช้ทันทีไม่ต้องเดินไป (main.js)
  { id: 'lLamp', kind: 'lamp', tap: true, name: 'โคมไฟตั้งพื้น', x: X.lamp - 26, w: 52, h: 168 },
  { id: 'lCushion', kind: 'cushion', name: 'เบาะนั่งพื้น', x: CUSHIONS[0][0] - 30, w: CUSHIONS[2][0] - CUSHIONS[0][0] + 60, h: 30, seats: CUSHIONS.map(([x]) => x), sitDy: 15 },
  { id: 'lTea', kind: 'tea', act: 'จิบชา', name: 'โต๊ะน้ำชา', x: X.table - 80, w: 160, h: 104 },
  { id: 'lSofa', kind: 'bench', name: 'โซฟาใหญ่', x: X.sofa - SOFA_W / 2, w: SOFA_W, h: 76, seats: SOFA_SEATS.map((d) => X.sofa + d), sitDy: 30 },
  { id: 'lTent', kind: 'tent', name: 'เต็นท์พักผ่อน', x: X.tent - TENT.w / 2, w: TENT.w, h: TENT.h, sitDy: 4 },
  { id: 'lTent2', kind: 'tent', name: 'เต็นท์พักผ่อนสีมิ้นต์', x: X.tent2 - TENT.w / 2, w: TENT.w, h: TENT.h, sitDy: 4 },
  { id: 'lSnack', kind: 'snack', act: 'สุ่มขนม', name: 'ตู้ขนมแมว', x: X.snack - SNACK.w / 2, w: SNACK.w, h: SNACK.h },
  { id: 'lStairs', kind: 'stairs', to: 'roof', act: 'ขึ้นชั้น 3', name: 'ประตูขึ้นชั้น 3', ...stairsDoor(X.stairs, LW) },
];
for (const p of L_PLACES) p.door = p.x + p.w / 2;
// ช่องที่นั่งเบาะพื้น: เบาะซ้ายสองใบ + ขวาหนึ่งใบ (โต๊ะน้ำชาอยู่กลาง — ยืนหน้าโต๊ะ = จิบชา)
export const L_SPAWN = X.down + 140;       // ขึ้นมาจากชั้น 1 = ยืนข้างทางลง
export const L_STAIRS_X = X.stairs - 40;   // ลงจากชั้น 3 (ทีหลัง) = ยืนหน้าโคนบันได

function buildSurfaces() {
  const S = [];
  const sofa = L_PLACES.find((p) => p.id === 'lSofa');
  S.push(flat('lSofa:seat', sofa.x + 14, sofa.x + sofa.w - 14, GY - 26, { soft: true }), flat('lSofa:back', sofa.x + 10, sofa.x + sofa.w - 10, GY - 64, { soft: true }));   // โซฟานุ่ม: ยุบเด้ง (main.js)
  S.push(flat('lTea:top', X.table - 84, X.table + 84, GY - 48));
  S.push(flat('lSnack:top', X.snack - SNACK.w / 2 + 6, X.snack + SNACK.w / 2 - 6, GY - SNACK.h - 2));
  for (const [i, [x, h, hw]] of PERCH.entries()) S.push(flat('condo:' + i, x - hw, x + hw, GY - h, { soft: true }));   // ชั้นคอนโดนุ่ม: เหยียบแล้วยุบเด้ง
  S.push(stairsSurface('lounge:stairs', X.stairs, LW));   // เดินขึ้นบันไดได้จริง
  for (const s of S) { s.x0 = s.pts[0][0]; s.x1 = s.pts[s.pts.length - 1][0]; }
  return S;
}
export const L_SURFACES = buildSurfaces();

/** ตู้ขนม: จุดที่ขนมเด้งออกมา (main.js วาดขนมลอยจากตู้เข้ามือน้อง) */
export const SNACK_POP = { x: X.snack - 20, y: GY - SNACK.h + 50 };

// ── โคมไฟตั้งพื้น เปิด/ปิดได้ (ผู้ใช้ 8 พ.ย.) ─────────────────────────
// แตะโคม/กด E หน้าโคม = สลับ · เปิด: ไฟกะพริบติดสองที แล้วแสงอุ่นส่องลงพื้น ฝุ่นแสงลอย · ปิด: แสงหรี่หาย
// ทุกครั้งที่กด โป๊ะเด้งดึ๋ง + ประกายเล็ก ๆ · กลางคืนแสงโคมฟุ้งกว้างขึ้น
const lamp = { on: true, t: -1e4 };
export const lampOn = () => lamp.on;
export function toggleLamp(t) { lamp.on = !lamp.on; lamp.t = t; return lamp.on; }
function lampLevel(t) {
  const u = t - lamp.t;
  if (!lamp.on) return Math.max(0, 1 - u / 7);
  if (u > 22) return 1;
  return u < 4 ? 1 : u < 8 ? 0.15 : u < 12 ? 0.9 : u < 15 ? 0.35 : 1;   // กะพริบติด
}
function drawLamp(c, t) {
  const lx = X.lamp, u = t - lamp.t, L = lampLevel(t), night = sky().night;
  const by = GY - 124;   // ขอบล่างโป๊ะ
  if (L > 0.01) {
    // ลำแสงลงพื้น + วงแสงบนพื้น + แสงฟุ้งรอบโป๊ะ
    c.save(); c.globalAlpha = L;
    c.fillStyle = lg(c, 0, by, 0, GY + 6, [[0, `rgba(255,232,170,${0.3 + 0.12 * night})`], [1, 'rgba(255,232,170,0)']]);
    c.beginPath(); c.moveTo(lx - 22, by); c.lineTo(lx + 22, by); c.lineTo(lx + 66, GY + 6); c.lineTo(lx - 66, GY + 6); c.closePath(); c.fill();
    c.fillStyle = `rgba(255,226,160,${0.22 + 0.1 * night})`; c.beginPath(); c.ellipse(lx, GY + 2, 64, 9, 0, 0, TAU); c.fill();
    const R = 64 * (1 + 0.45 * night);
    const g = c.createRadialGradient(lx, by - 12, 3, lx, by - 12, R);
    g.addColorStop(0, `rgba(255,232,170,${0.55 + 0.15 * night})`); g.addColorStop(1, 'rgba(255,232,170,0)');
    c.fillStyle = g; c.beginPath(); c.arc(lx, by - 12, R, 0, TAU); c.fill();
    // ฝุ่นแสงลอยในลำแสง
    for (let i = 0; i < 5; i++) {
      const p = (t * 0.004 + hash(i * 3.1)) % 1, y = by + 8 + p * (GY - by - 14), x = lx + (hash(i * 7.7) - 0.5) * 30 * (0.4 + p) + Math.sin(t * 0.03 + i) * 4;
      c.globalAlpha = L * Math.sin(p * Math.PI) * 0.8; c.fillStyle = '#FFFFFF';
      c.beginPath(); c.arc(x, y, 1.3, 0, TAU); c.fill();
    }
    c.restore();
  }
  // โป๊ะเด้งดึ๋งตอนกด (ยืด-หด จางลง)
  const bo = u < 40 ? Math.sin(u * 0.55) * Math.exp(-u / 11) : 0;
  c.save();
  c.translate(lx, by); c.scale(1 - bo * 0.06, 1 + bo * 0.14); c.translate(-lx, -by);
  const lit = (a, b) => (L > 0.5 ? a : b);
  c.fillStyle = lg(c, 0, GY - 156, 0, by, [[0, lit('#FFE3EF', '#EBC0D5')], [1, lit('#FFB9D7', '#D795B6')]]);
  c.beginPath(); c.moveTo(lx - 14, GY - 156); c.lineTo(lx + 14, GY - 156); c.quadraticCurveTo(lx + 26, GY - 136, lx + 24, by); c.lineTo(lx - 24, by); c.quadraticCurveTo(lx - 26, GY - 136, lx - 14, GY - 156); c.fill();
  if (L > 0.01) {
    // ไฟเรืองทะลุผ้าโป๊ะ (สว่างกลาง ๆ ล่าง)
    const sg = c.createRadialGradient(lx, by - 6, 1, lx, by - 6, 22);
    sg.addColorStop(0, `rgba(255,250,220,${0.85 * L})`); sg.addColorStop(1, 'rgba(255,250,220,0)');
    c.fillStyle = sg; c.beginPath(); c.moveTo(lx - 14, GY - 156); c.lineTo(lx + 14, GY - 156); c.quadraticCurveTo(lx + 26, GY - 136, lx + 24, by); c.lineTo(lx - 24, by); c.quadraticCurveTo(lx - 26, GY - 136, lx - 14, GY - 156); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.moveTo(lx - 9, GY - 153); c.quadraticCurveTo(lx - 18, GY - 138, lx - 17, by - 3); c.lineTo(lx - 12, by - 3); c.quadraticCurveTo(lx - 12, GY - 140, lx - 6, GY - 153); c.closePath(); c.fill();
  c.fillStyle = GOLD; c.fillRect(lx - 24, by - 2, 48, 2.5); c.fillRect(lx - 14, GY - 157, 28, 2);
  for (let k = -2; k <= 2; k++) { c.fillStyle = L > 0.5 ? '#FFF4D8' : CREAM; c.beginPath(); c.arc(lx + k * 10, by + 3, 2.2, 0, TAU); c.fill(); }
  // ไส้หลอด (เห็นใต้โป๊ะ)
  c.fillStyle = L > 0.5 ? '#FFF6D0' : '#E8DCCB'; c.beginPath(); c.ellipse(lx, by + 2, 5, 3, 0, 0, Math.PI); c.fill();
  c.restore();
  // ประกายตอนกด
  if (u < 30) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.4, d = 14 + u * 1.4;
      c.globalAlpha = 1 - u / 30; c.fillStyle = i % 2 ? '#FFFFFF' : SGOLD;
      star(c, lx + Math.cos(a) * d, GY - 140 + Math.sin(a) * d * 0.8, 3.4 * (1 - u / 40), u * 0.1); c.fill();
    }
    c.globalAlpha = 1;
  }
}

// ── พื้นไม้ครีมอุ่น + พรมใหญ่ลายอุ้งเท้า (หน้าตรง แถวสูงเท่ากัน) ─────────
const ROW = 26, PLANK = 132;
function drawFloor(c, camX, vw) {
  drawFloorSegs(c, camX, vw, 'lounge:floor', LW, floorRange);
}
/** พื้นไม้ครีมอุ่น: แผ่นไม้ขอบนูน ลายเสี้ยนบาง ๆ + พรมใหญ่ */
function floorRange(c, x0, x1) {
  c.fillStyle = '#E9CDB4'; c.fillRect(x0, WALL_B, x1 - x0, H - WALL_B + 2);
  c.fillStyle = CREAM; c.fillRect(x0, WALL_B, x1 - x0, 6);
  c.fillStyle = GOLD; c.fillRect(x0, WALL_B + 6, x1 - x0, 2);
  for (let r = 0, y = WALL_B + 8; y < H; r++, y += ROW) {
    const off = (r * 53) % PLANK;
    for (let x = Math.floor((x0 - off) / PLANK) * PLANK + off; x < x1; x += PLANK) {
      const n = Math.round((x - off) / PLANK);
      const tone = (n + r) % 3;
      c.fillStyle = lg(c, 0, y, 0, y + ROW, tone === 0 ? [[0, '#F8E6D4'], [1, '#F2DAC4']] : tone === 1 ? [[0, '#FCEEE1'], [1, '#F6E3D0']] : [[0, '#FAEADA'], [1, '#F4DECA']]);
      c.beginPath(); c.roundRect(x + 1, y + 1, PLANK - 2, ROW - 2, 4); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.roundRect(x + 6, y + 2.2, PLANK - 12, 1.5, 0.75); c.fill();
      c.fillStyle = 'rgba(170,120,90,.14)'; c.beginPath(); c.roundRect(x + 6, y + ROW - 3.4, PLANK - 12, 1.3, 0.65); c.fill();
      // เสี้ยนไม้โค้งบาง ๆ
      c.strokeStyle = 'rgba(190,140,105,.16)'; c.lineWidth = 0.9;
      const gx = x + 20 + hash(n * 3.3 + r) * (PLANK - 60);
      c.beginPath(); c.moveTo(gx, y + ROW * 0.42); c.quadraticCurveTo(gx + 18, y + ROW * 0.28, gx + 36, y + ROW * 0.44); c.stroke();
      c.beginPath(); c.moveTo(gx + 8, y + ROW * 0.62); c.quadraticCurveTo(gx + 22, y + ROW * 0.52, gx + 30, y + ROW * 0.64); c.stroke();
    }
  }
  // พรมใหญ่ใต้โซนน้ำชา–โซฟา (ชมพู ขอบม่วง ลายอุ้งเท้า หัวใจ)
  if (RUG.x1 > x0 && RUG.x0 < x1) {
    const ry = GY - 8, rh = 58;
    c.fillStyle = 'rgba(120,60,110,.12)'; c.beginPath(); c.roundRect(RUG.x0 + 4, ry + 5, RUG.x1 - RUG.x0, rh, 24); c.fill();
    c.fillStyle = LAV; c.beginPath(); c.roundRect(RUG.x0, ry, RUG.x1 - RUG.x0, rh, 24); c.fill();
    c.fillStyle = lg(c, 0, ry, 0, ry + rh, [[0, '#FBC6DE'], [1, PINK]]); c.beginPath(); c.roundRect(RUG.x0 + 8, ry + 6, RUG.x1 - RUG.x0 - 16, rh - 12, 18); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.setLineDash([6, 6]);
    c.beginPath(); c.roundRect(RUG.x0 + 16, ry + 13, RUG.x1 - RUG.x0 - 32, rh - 26, 12); c.stroke(); c.setLineDash([]);
    for (let x = RUG.x0 + 60; x < RUG.x1 - 40; x += 80) {
      if (((x - RUG.x0) / 80 | 0) % 2) { c.fillStyle = 'rgba(255,255,255,.65)'; heart(c, x, ry + rh / 2, 6); c.fill(); }
      else pawIcon(c, x, ry + rh / 2 - 1, 1.2, 'rgba(255,255,255,.65)');
    }
  }
}
function drawWalls(c, camX, vw) {
  const i0 = Math.max(0, Math.floor((camX - 40) / BAY)), i1 = Math.min(NB - 1, Math.floor((camX + vw + 40) / BAY));
  for (let i = i0; i <= i1; i++) {
    c.save(); c.translate(i * BAY, 0);
    cached(c, 'lounge:bay:' + BAYS[i] + ':' + (i % 2) + bayKey(BAYS[i]), 0, 0, BAY, WALL_B, (g) => drawBay(g, BAYS[i], i));
    c.restore();
  }
  for (let i = i0; i <= i1 + 1; i++) {
    c.save(); c.translate(i * BAY, 0);
    shaded(c, 'hall:pillar', -40, CEIL - 6, 80, WALL_B - CEIL + 8, drawPillar);
    c.restore();
  }
}
/** นาฬิกาแมว (เข็มตามเวลาจริง) */
/**
 * เข็มนาฬิกาแมว (ผู้ใช้ 8 พ.ย. "ให้เข็มนาฬิกาเดินได้"): เวลาจริงของเครื่อง · เข็มวินาทีชมพูปลายหัวใจ ก้าวทีละวินาทีแบบเด้งนิด ๆ (ติ๊ก)
 *   ลูกตุ้มหัวใจทองแกว่งใต้นาฬิกา ไปกลับหนึ่งรอบต่อสองวินาที (ตรงจังหวะเข็มวินาที)
 */
function clockHands(c) {
  const cx = bayC(3), cy = 120, d = new Date();
  const ms = d.getMilliseconds(), u = Math.min(1, ms / 170);
  const back = 1 + 2.4 * (u - 1) ** 3 + 1.4 * (u - 1) ** 2;   // ease-out-back: เลยไปนิดแล้วเด้งกลับ
  const s = d.getSeconds() - 1 + back;
  const m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
  // ลูกตุ้ม
  const sw = Math.sin(((d.getSeconds() % 2) * 1000 + ms) / 2000 * TAU) * 0.3, L = 46, px = cx + Math.sin(sw) * L, py = cy + 44 + Math.cos(sw) * L;
  c.strokeStyle = GOLD_D; c.lineWidth = 2.4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx, cy + 42); c.lineTo(px, py - 7); c.stroke();
  c.fillStyle = goldV(c, cy + 39, cy + 46); c.beginPath(); c.arc(cx, cy + 43, 3.6, 0, TAU); c.fill();
  c.fillStyle = goldV(c, py - 9, py + 9); heart(c, px, py, 9.5); c.fill();
  c.fillStyle = '#FF8FB3'; heart(c, px, py, 6.5); c.fill();
  c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(px - 2.5, py - 2.5, 1.5, 0, TAU); c.fill();
  // เข็มชั่วโมง · นาที · วินาที
  c.strokeStyle = SPUR; c.lineCap = 'round';
  for (const [a, Lh, w] of [[h / 12 * TAU, 18, 3.4], [m / 60 * TAU, 26, 2.4]]) {
    c.lineWidth = w; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(a) * Lh, cy - Math.cos(a) * Lh); c.stroke();
  }
  const a = s / 60 * TAU;
  c.strokeStyle = '#F06BA0'; c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(cx - Math.sin(a) * 7, cy + Math.cos(a) * 7); c.lineTo(cx + Math.sin(a) * 28, cy - Math.cos(a) * 28); c.stroke();
  c.fillStyle = '#F06BA0'; heart(c, cx + Math.sin(a) * 30, cy - Math.cos(a) * 30, 2.8); c.fill();
  c.fillStyle = GOLD; c.beginPath(); c.arc(cx, cy, 3.6, 0, TAU); c.fill();
  c.fillStyle = '#FF8FB3'; c.beginPath(); c.arc(cx, cy, 1.5, 0, TAU); c.fill();
}
// ── เฟอร์นิเจอร์/ของตกแต่ง ──────────────────────────────────────
/**
 * 0. ทางลงชั้น 1 (ผู้ใช้ 8 พ.ย. "แต่งประตูใหม่ให้สวยขึ้น"): ซุ้มโค้งเสาคู่หัวทอง ผ้าม่านชมพูรวบสองมุม โคมผนังสองข้าง
 *   ข้างในเห็นบันไดปูพรมชมพูลดหลั่นลงไปทางซ้าย ราวทองไล่ลง แสงอุ่นลอยขึ้นมาจากชั้นล่าง
 */
function drawDownArt(c) {
  const cx = X.down, x0 = cx - 80, x1 = cx + 80, top = GY - 230, bot = WALL_B + 2;
  c.save(); c.beginPath(); archPath(c, x0, x1, top, bot); c.clip();
  c.fillStyle = lg(c, 0, top, 0, bot, [[0, '#D9C6F4'], [0.6, '#A98AE0'], [1, '#7E5FC4']]); c.fillRect(x0, top, 160, bot - top);
  // บันไดลดหลั่นลงทางซ้าย (ปูพรมชมพู)
  for (let i = 0; i < 8; i++) {
    const sx = x1 - 10 - i * 20, sy = bot - 64 + i * 10;
    c.fillStyle = i % 2 ? '#F4D2E4' : '#F9DEEC'; c.fillRect(x0, sy, sx - x0, 12);
    c.fillStyle = '#FFFFFF'; c.fillRect(x0, sy, sx - x0, 2);
    c.fillStyle = '#F58CB8'; c.fillRect(Math.max(x0, sx - 70), sy + 2, Math.min(44, sx - x0), 3);
  }
  c.strokeStyle = GOLD; c.lineWidth = 2.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1 - 8, bot - 96); c.lineTo(x0 - 4, bot - 26); c.stroke();
  for (let i = 0; i < 7; i++) { const bx = x1 - 20 - i * 22, by = bot - 96 + ((x1 - 8 - bx) * 70) / (x1 - x0 + 4); c.strokeStyle = 'rgba(255,240,220,.85)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(bx, by + 2); c.lineTo(bx, by + 34); c.stroke(); }
  const g = c.createRadialGradient(x0 + 20, bot - 4, 4, x0 + 20, bot - 4, 120);
  g.addColorStop(0, 'rgba(255,226,170,.6)'); g.addColorStop(1, 'rgba(255,226,170,0)');
  c.fillStyle = g; c.fillRect(x0, top, 160, bot - top);
  c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(x0 + 26, bot); c.lineTo(x0 + 66, top + 30); c.lineTo(x0 + 82, top + 26); c.lineTo(x0 + 42, bot); c.fill();
  c.restore();
  // ม่านชมพูรวบข้าง (ผู้ใช้ 8 พ.ย. "ม่านดูเหมือนผ้าขาด แก้ให้สมส่วน"): ผืนเต็มจากบนซุ้มถึงพื้น รวบสายทองกลางผืนแล้วบานลงพื้น
  //   จีบผ้าตามแนวผืน แสงเงาไล่ข้าง · ระบายโค้งสามลอนขอบทองพาดบนสุด (อยู่ในกรอบซุ้มทั้งหมด ไม่ล้นออกนอกประตู)
  c.save(); c.beginPath(); archPath(c, x0, x1, top, bot); c.clip();
  const tieY = top + 148;
  for (const d of [-1, 1]) {
    const ex = d < 0 ? x0 : x1, k = -d;   // k = ทิศเข้ากลางซุ้ม
    const edge = (f) => {   // ขอบในของผืน (f = 1) / แนวจีบ (f < 1)
      c.moveTo(ex + k * 64 * f, top);
      c.bezierCurveTo(ex + k * 58 * f, top + 70, ex + k * (6 + 14 * f), tieY - 34, ex + k * (4 + 12 * f), tieY);
      c.bezierCurveTo(ex + k * (6 + 14 * f), tieY + 30, ex + k * 40 * f, bot - 34, ex + k * (4 + 32 * f), bot);
    };
    const drape = new Path2D();
    drape.moveTo(ex - k * 4, top); drape.lineTo(ex + k * 64, top);
    drape.bezierCurveTo(ex + k * 58, top + 70, ex + k * 20, tieY - 34, ex + k * 16, tieY);
    drape.bezierCurveTo(ex + k * 20, tieY + 30, ex + k * 40, bot - 34, ex + k * 36, bot);
    drape.lineTo(ex - k * 4, bot); drape.closePath();
    c.fillStyle = lg(c, ex, 0, ex + k * 64, 0, [[0, '#E57BAE'], [0.5, '#F6A6CA'], [1, '#FBC6DD']]);
    c.fill(drape);
    c.save(); c.clip(drape);
    c.lineWidth = 2; c.strokeStyle = 'rgba(190,70,130,.3)';
    for (const f of [0.28, 0.55, 0.8]) { c.beginPath(); edge(f); c.stroke(); }
    c.lineWidth = 1.4; c.strokeStyle = 'rgba(255,255,255,.4)';
    for (const f of [0.4, 0.68, 0.93]) { c.beginPath(); edge(f); c.stroke(); }
    c.restore();
    c.strokeStyle = 'rgba(255,235,244,.9)'; c.lineWidth = 1.6; c.beginPath(); edge(1); c.stroke();   // ขอบผ้าด้านในกุ๊นอ่อน
    // สายรวบทอง + พู่
    const tx = ex + k * 9;
    c.fillStyle = goldV(c, tieY - 4, tieY + 4); c.beginPath(); c.roundRect(Math.min(ex, ex + k * 19) - 1, tieY - 3.5, 21, 7, 3.5); c.fill();
    c.strokeStyle = GOLD_D; c.lineWidth = 1.2; c.beginPath(); c.moveTo(tx + k * 6, tieY + 3); c.lineTo(tx + k * 7, tieY + 13); c.stroke();
    c.fillStyle = goldV(c, tieY + 12, tieY + 26); c.beginPath(); c.moveTo(tx + k * 7, tieY + 12); c.quadraticCurveTo(tx + k * 7 + 5, tieY + 22, tx + k * 7, tieY + 26); c.quadraticCurveTo(tx + k * 7 - 5, tieY + 22, tx + k * 7, tieY + 12); c.fill();
  }
  // ระบายโค้งสามลอนบนสุด
  const vy = top + 50, sw3 = (x1 - x0) / 3;
  const valance = () => { c.moveTo(x0 - 4, top - 4); c.lineTo(x1 + 4, top - 4); c.lineTo(x1, vy); for (let i = 0; i < 3; i++) { const a = x1 - i * sw3; c.quadraticCurveTo(a - sw3 / 2, vy + 28, a - sw3, vy); } };
  c.fillStyle = lg(c, 0, top, 0, vy + 16, [[0, '#F6A6CA'], [1, '#DE6FA4']]); c.beginPath(); valance(); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) { const m = x0 + sw3 * (i + 0.5); c.beginPath(); c.moveTo(m - 12, top + 18); c.quadraticCurveTo(m, vy + 4, m + 12, top + 18); c.stroke(); }
  c.strokeStyle = GOLD; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x1, vy); for (let i = 0; i < 3; i++) { const a = x1 - i * sw3; c.quadraticCurveTo(a - sw3 / 2, vy + 28, a - sw3, vy); } c.stroke();
  for (let i = 1; i < 3; i++) { const px = x0 + i * sw3; c.fillStyle = goldV(c, vy - 3, vy + 9); c.beginPath(); c.moveTo(px, vy - 1); c.quadraticCurveTo(px + 4.5, vy + 6, px, vy + 10); c.quadraticCurveTo(px - 4.5, vy + 6, px, vy - 1); c.fill(); }
  c.restore();
  // กรอบซุ้ม + เสาคู่หัวทอง
  c.strokeStyle = CREAM; c.lineWidth = 14; c.beginPath(); archPath(c, x0 - 4, x1 + 4, top - 4, bot); c.stroke();
  c.strokeStyle = GOLD; c.lineWidth = 3.6; c.beginPath(); archPath(c, x0 - 13, x1 + 13, top - 13, bot); c.stroke();
  for (const d of [-1, 1]) {
    const px = d < 0 ? x0 - 24 : x1 + 24, pt = top + 100;
    c.fillStyle = lg(c, px - 7, 0, px + 7, 0, [[0, '#EADBD0'], [0.5, '#FFFFFF'], [1, '#E3D3C8']]); c.fillRect(px - 6, pt, 12, bot - pt);
    c.fillStyle = goldV(c, pt - 6, pt + 4); c.beginPath(); c.roundRect(px - 9, pt - 6, 18, 8, 2); c.fill();
    c.fillStyle = goldV(c, bot - 10, bot); c.beginPath(); c.roundRect(px - 9, bot - 10, 18, 10, 2); c.fill();
    // โคมผนังกระจกครีม (แสงวาดสดใน drawLoungeWorld)
    const ly = top + 70;
    c.strokeStyle = GOLD_D; c.lineWidth = 2; c.beginPath(); c.moveTo(px, pt - 6); c.quadraticCurveTo(px + d * 2, ly + 14, px, ly + 8); c.stroke();
    c.fillStyle = 'rgba(255,248,226,.95)'; c.beginPath(); c.moveTo(px - 6, ly - 6); c.lineTo(px + 6, ly - 6); c.lineTo(px + 4, ly + 8); c.lineTo(px - 4, ly + 8); c.closePath(); c.fill();
    c.fillStyle = goldV(c, ly - 10, ly - 5); c.beginPath(); c.moveTo(px - 7, ly - 6); c.lineTo(px, ly - 12); c.lineTo(px + 7, ly - 6); c.closePath(); c.fill();
  }
  c.fillStyle = CREAM; c.beginPath(); c.arc(cx, top - 10, 18, 0, TAU); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 2.5; c.stroke();
  pawIcon(c, cx, top - 9, 1, '#FF8FB3');
  crownIcon(c, cx, top - 26, 0.6);
}
/**
 * 1. ชั้นหนังสือใหญ่ (ผู้ใช้ 8 พ.ย. "วาดใหม่"): ตู้ครีมยอดโค้งหน้าบันม้วนทองมงกุฎกลาง เสาข้างลายร่อง ฐานลอน
 *   ผนังด้านในม่วงลายอุ้งเท้าจาง · ไฟเล็กใต้แต่ละชั้น · หนังสือสันมีแถบทอง/ตราดาวหัวใจ กองนอน ลูกโลก กระถางกระบองเพชร
 *   ตุ๊กตาแมว กรอบรูป ลูกแก้ว · บันไดเลื่อนพิงขวา
 */
function drawBooksArt(c) {
  const { w, h } = BOOKS, x0 = X.books - w / 2, top = GY - h, cx = X.books;
  c.fillStyle = 'rgba(80,40,110,.18)'; c.beginPath(); c.ellipse(cx, GY - 2, w * 0.58, 7, 0, 0, TAU); c.fill();
  const shell = () => { c.beginPath(); c.moveTo(x0, GY - 4); c.lineTo(x0, top + 30); c.quadraticCurveTo(cx, top - 20, x0 + w, top + 30); c.lineTo(x0 + w, GY - 4); c.closePath(); };
  c.fillStyle = lg(c, x0, 0, x0 + w, 0, [[0, '#EFE0D2'], [0.5, '#FFF8F2'], [1, '#E8D6C6']]); shell(); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 3; shell(); c.stroke();
  // หน้าบันม้วนทอง + มงกุฎ
  c.strokeStyle = GOLD; c.lineWidth = 2.4;
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(cx, top + 4); c.bezierCurveTo(cx + d * 30, top - 2, cx + d * 46, top + 16, cx + d * 36, top + 22); c.stroke(); c.beginPath(); c.arc(cx + d * 34, top + 18, 3.4, 0, TAU); c.stroke(); }
  crownIcon(c, cx, top + 4, 0.85);
  // เสาข้าง
  for (const px of [x0 + 7, x0 + w - 7]) {
    c.fillStyle = lg(c, px - 6, 0, px + 6, 0, [[0, '#E6D3C2'], [0.5, '#FFFFFF'], [1, '#E0CCBA']]); c.fillRect(px - 6, top + 34, 12, GY - 18 - top - 34);
    c.strokeStyle = 'rgba(201,155,62,.4)'; c.lineWidth = 1; for (const dx of [-2.5, 2.5]) { c.beginPath(); c.moveTo(px + dx, top + 40); c.lineTo(px + dx, GY - 24); c.stroke(); }
    c.fillStyle = GOLD; c.fillRect(px - 7, top + 33, 14, 3);
  }
  // ฐานลอน
  c.fillStyle = lg(c, 0, GY - 18, 0, GY - 2, [[0, '#F2E4D6'], [1, '#DCC7B4']]); c.beginPath(); c.roundRect(x0 - 4, GY - 18, w + 8, 15, 4); c.fill();
  c.fillStyle = GOLD; c.fillRect(x0 - 4, GY - 18, w + 8, 2);
  for (let k = 0; k < 9; k++) { c.fillStyle = 'rgba(201,155,62,.35)'; c.beginPath(); c.arc(x0 + 10 + k * (w - 20) / 8, GY - 8, 3, 0, TAU); c.fill(); }
  // ช่องวาง 4 ชั้น (ผนังม่วงลายอุ้งเท้า + ไฟใต้ชั้น)
  const ix0 = x0 + 15, iw = w - 30, rows = [top + 36, top + 86, top + 136, top + 184], rh = 44;
  const cols = ['#F5A9D0', '#C5A4E8', '#A9D6FF', '#FFE08A', '#9ED7B0', '#F7B6D2', '#B996E0', '#FFC8A8'];
  for (const [r, ry] of rows.entries()) {
    c.fillStyle = lg(c, 0, ry, 0, ry + rh, [[0, '#D8C6EE'], [1, '#E6DAF4']]); c.fillRect(ix0, ry, iw, rh);
    for (let k = 0; k < 5; k++) pawIcon(c, ix0 + 18 + k * 40, ry + 16 + (k % 2) * 14, 0.6, 'rgba(255,255,255,.2)');
    const lgw = c.createRadialGradient(ix0 + iw / 2, ry + 2, 2, ix0 + iw / 2, ry + 2, iw * 0.55);
    lgw.addColorStop(0, 'rgba(255,240,200,.45)'); lgw.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = lgw; c.fillRect(ix0, ry, iw, rh);
    let bx = ix0 + 4;
    const deco = [[0.5, 'stack'], [0.78, 'globe']][r % 2], deco2 = [[0.3, 'cat'], [0.62, 'plant'], [0.3, 'frame'], [0.7, 'ball']][r];
    while (bx < ix0 + iw - 8) {
      const u = (bx - ix0) / iw;
      const put = Math.abs(u - deco[0]) < 0.05 ? deco[1] : Math.abs(u - deco2[0]) < 0.05 ? deco2[1] : null;
      if (put) {
        const fx = bx + 13, fy = ry + rh;
        if (put === 'stack') { for (let k = 0; k < 4; k++) rr(c, fx - 12 + (k % 2) * 2, fy - 6 - k * 6, 24 - k * 2, 6, 2, cols[(k * 3 + r) % 8]); }
        else if (put === 'globe') { c.fillStyle = GOLD_D; c.fillRect(fx - 1, fy - 10, 2, 10); rr(c, fx - 7, fy - 3, 14, 3, 1.5, GOLD); c.fillStyle = '#9ED2FF'; c.beginPath(); c.arc(fx, fy - 20, 10, 0, TAU); c.fill(); c.fillStyle = '#9ED7B0'; c.beginPath(); c.ellipse(fx - 3, fy - 22, 4, 3, 0.4, 0, TAU); c.ellipse(fx + 4, fy - 16, 3, 2, 0, 0, TAU); c.fill(); c.strokeStyle = GOLD; c.lineWidth = 1.4; c.beginPath(); c.arc(fx, fy - 20, 12, Math.PI * 0.7, Math.PI * 2.3); c.stroke(); }
        else if (put === 'cat') catFace(c, fx, fy - 13, 10, '#FFFFFF', 1);
        else if (put === 'plant') { c.fillStyle = '#86CB8E'; for (const [dx, dy] of [[-5, -18], [0, -22], [5, -17]]) { c.beginPath(); c.ellipse(fx + dx, fy + dy, 4, 7, dx * 0.08, 0, TAU); c.fill(); } rr(c, fx - 8, fy - 12, 16, 12, 3, '#F7A8CB'); }
        else if (put === 'frame') { rr(c, fx - 11, fy - 28, 22, 26, 3, GOLD); rr(c, fx - 8, fy - 25, 16, 20, 2, '#FFE6F1'); c.fillStyle = '#FF8FB3'; heart(c, fx, fy - 15, 5); c.fill(); }
        else { rr(c, fx - 6, fy - 4, 12, 4, 2, GOLD); const bg = c.createRadialGradient(fx - 3, fy - 15, 1, fx, fy - 12, 9); bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(0.6, '#E6D8FF'); bg.addColorStop(1, '#B596EE'); c.fillStyle = bg; c.beginPath(); c.arc(fx, fy - 12, 8, 0, TAU); c.fill(); }
        bx += 28; continue;
      }
      const bw = 8 + hash(bx * 0.7 + r) * 7, bh = rh - 5 - hash(bx + r * 3) * 13, lean = hash(bx * 1.3) > 0.9;
      c.save();
      if (lean) { c.translate(bx, ry + rh); c.rotate(-0.16); c.translate(-bx, -(ry + rh)); }
      const col = cols[(bx * 13 + r * 7 | 0) % cols.length];
      c.fillStyle = lg(c, bx, 0, bx + bw, 0, [[0, col], [0.6, col], [1, 'rgba(90,60,120,.25)']]);
      c.beginPath(); c.roundRect(bx, ry + rh - bh, bw, bh, 1.5); c.fill();
      c.fillStyle = 'rgba(235,198,111,.9)'; c.fillRect(bx + 1, ry + rh - bh + 4, bw - 2, 1.4); c.fillRect(bx + 1, ry + rh - 6, bw - 2, 1.4);
      if (bw > 11) { c.fillStyle = 'rgba(255,255,255,.75)'; if (hash(bx) > 0.5) heart(c, bx + bw / 2, ry + rh - bh / 2, 2.2); else star(c, bx + bw / 2, ry + rh - bh / 2, 2.4, -Math.PI / 2); c.fill(); }
      c.restore();
      bx += bw + 1.4;
    }
    c.fillStyle = goldV(c, ry + rh, ry + rh + 4); c.fillRect(ix0 - 4, ry + rh, iw + 8, 4);
  }
  // บันไดเลื่อนพิงขวา
  c.save(); c.translate(x0 + w - 18, GY - 4); c.rotate(-0.14);
  c.strokeStyle = '#C49474'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-8, 0); c.lineTo(-8, -150); c.moveTo(8, 0); c.lineTo(8, -150); c.stroke();
  c.lineWidth = 2; for (let y = -14; y > -150; y -= 20) { c.beginPath(); c.moveTo(-8, y); c.lineTo(8, y); c.stroke(); }
  c.fillStyle = GOLD; c.beginPath(); c.arc(-8, -150, 3, 0, TAU); c.arc(8, -150, 3, 0, TAU); c.fill();
  c.restore();
}
/**
 * 2. มุมอ่านหนังสือ (ผู้ใช้ 8 พ.ย. "เก้าอี้วาดให้สวยขึ้น"): เก้าอี้ปีกพนักสูงม่วงดึงกระดุมข้าวหลามตัด ขอบทอง
 *   เบาะชมพูกุ๊นขอบ ที่วางแขนม้วน ขาทองโค้ง หมอนหัวใจ · โต๊ะข้างกลมทองผ้าลูกไม้ กองหนังสือ ถ้วยชา · โคมตั้งพื้น (โป๊ะวาดสด)
 */
function drawReadArt(c) {
  const x = X.chair, x0 = x - 54, w = 108;
  // โต๊ะข้าง
  const sx = x - 94;
  c.fillStyle = goldV(c, GY - 44, GY); c.beginPath(); c.moveTo(sx - 2, GY - 40); c.quadraticCurveTo(sx - 6, GY - 14, sx - 10, GY - 2); c.lineTo(sx - 6, GY - 2); c.quadraticCurveTo(sx - 1, GY - 14, sx + 2, GY - 40); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(sx + 2, GY - 40); c.quadraticCurveTo(sx + 6, GY - 14, sx + 10, GY - 2); c.lineTo(sx + 6, GY - 2); c.quadraticCurveTo(sx + 1, GY - 14, sx - 2, GY - 40); c.closePath(); c.fill();
  c.fillStyle = goldV(c, GY - 48, GY - 40); c.beginPath(); c.ellipse(sx, GY - 44, 24, 4.5, 0, 0, TAU); c.fill();
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(sx - 24, GY - 45); c.lineTo(sx + 24, GY - 45);
  for (let k = 0; k < 6; k++) { const a = sx + 24 - k * 8, b = a - 8; c.quadraticCurveTo((a + b) / 2, GY - 33, b, GY - 37); }
  c.closePath(); c.fill();
  for (const [i, col] of ['#C5A4E8', '#F5A9D0', '#A9D6FF'].entries()) rr(c, sx - 18 + i * 2, GY - 54 - i * 7, 28 - i * 4, 7, 2, col);
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(sx + 8, GY - 75); c.lineTo(sx + 18, GY - 75); c.quadraticCurveTo(sx + 17, GY - 68, sx + 13, GY - 68); c.quadraticCurveTo(sx + 9, GY - 68, sx + 8, GY - 75); c.fill();
  c.fillStyle = '#F58CB8'; c.fillRect(sx + 8, GY - 73, 10, 1.4);
  // เก้าอี้
  c.fillStyle = 'rgba(80,40,110,.18)'; c.beginPath(); c.ellipse(x, GY - 2, 62, 6, 0, 0, TAU); c.fill();
  for (const lx of [x0 + 14, x0 + w - 14]) {
    c.fillStyle = goldV(c, GY - 14, GY);
    c.beginPath(); c.moveTo(lx - 4, GY - 13); c.quadraticCurveTo(lx - 7, GY - 6, lx - 2, GY - 2); c.lineTo(lx + 3, GY - 2); c.quadraticCurveTo(lx, GY - 6, lx + 4, GY - 13); c.closePath(); c.fill();
  }
  const back = () => { c.beginPath(); c.moveTo(x0 + 8, GY - 26); c.lineTo(x0 + 4, GY - 74); c.quadraticCurveTo(x0 + 2, GY - 100, x, GY - 102); c.quadraticCurveTo(x0 + w - 2, GY - 100, x0 + w - 4, GY - 74); c.lineTo(x0 + w - 8, GY - 26); c.closePath(); };
  c.fillStyle = lg(c, 0, GY - 102, 0, GY - 24, [[0, '#C7A9F0'], [1, '#9A74DA']]); back(); c.fill();
  c.save(); back(); c.clip();
  c.strokeStyle = 'rgba(80,40,140,.18)'; c.lineWidth = 1;
  for (let k = -6; k < 8; k++) { const bx = x0 + k * 18; c.beginPath(); c.moveTo(bx, GY - 26); c.lineTo(bx + 60, GY - 106); c.moveTo(bx + 60, GY - 26); c.lineTo(bx, GY - 106); c.stroke(); }
  for (let k = -6; k < 8; k++) for (const yy of [GY - 44, GY - 68, GY - 92]) { c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x0 + k * 18 + (yy === GY - 68 ? 9 : 0) + 6, yy, 1.5, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.ellipse(x - 16, GY - 84, 12, 24, 0.3, 0, TAU); c.fill();
  c.restore();
  c.strokeStyle = GOLD; c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(x0 + 4, GY - 74); c.quadraticCurveTo(x0 + 2, GY - 100, x, GY - 102); c.quadraticCurveTo(x0 + w - 2, GY - 100, x0 + w - 4, GY - 74); c.stroke();
  crownIcon(c, x, GY - 101, 0.5);
  c.fillStyle = lg(c, 0, GY - 58, 0, GY - 34, [[0, '#FFD3E6'], [1, '#F58CB8']]); heart(c, x, GY - 46, 12); c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(x - 4, GY - 52, 3, 1.8, -0.6, 0, TAU); c.fill();
  c.fillStyle = lg(c, 0, GY - 31, 0, GY - 12, [[0, '#FFE3EF'], [0.5, '#FBB8D5'], [1, '#EE8FBD']]);
  c.beginPath(); c.roundRect(x0 + 8, GY - 30, w - 16, 18, 8); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.2; c.beginPath(); c.roundRect(x0 + 11, GY - 28, w - 22, 14, 6); c.stroke();
  for (const [d, ax] of [[-1, x0 + 5], [1, x0 + w - 5]]) {
    c.fillStyle = lg(c, 0, GY - 50, 0, GY - 12, [[0, '#C9AEEF'], [1, '#8E66CF']]); c.beginPath(); c.roundRect(ax - 9, GY - 46, 18, 34, 9); c.fill();
    c.fillStyle = lg(c, ax - 11, 0, ax + 11, 0, [[0, '#D9C4F7'], [1, '#A985E2']]); c.beginPath(); c.ellipse(ax, GY - 44, 11, 8, 0, 0, TAU); c.fill();
    c.fillStyle = goldV(c, GY - 50, GY - 38); c.beginPath(); c.arc(ax + d * 2, GY - 44, 4.4, 0, TAU); c.fill();
    c.fillStyle = '#FF8FB3'; c.beginPath(); c.arc(ax + d * 2, GY - 44, 1.7, 0, TAU); c.fill();
  }
  // โคมตั้งพื้น: ฐาน + เสา (โป๊ะวาดสดใน drawLamp — เปิด/ปิด เด้งได้)
  const lx = X.lamp;
  rr(c, lx - 14, GY - 8, 28, 6, 3, GOLD_D);
  c.fillStyle = goldV(c, GY - 12, GY - 4); c.beginPath(); c.ellipse(lx, GY - 9, 9, 3, 0, 0, TAU); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 3.5; c.beginPath(); c.moveTo(lx, GY - 8); c.lineTo(lx, GY - 124); c.stroke();
  c.fillStyle = GOLD_D; c.beginPath(); c.arc(lx, GY - 70, 3.6, 0, TAU); c.fill();
}
/**
 * 3. เบาะนั่งพื้นกลมพอง (ผู้ใช้ 8 พ.ย. "ปรับให้เด่นขึ้น"): สีสด ขอบกุ๊นสว่าง พู่ทองสองมุม กระดุมกลางจีบรัศมี ลายประจำใบ
 *   kind 0 หัวใจขาวบนชมพู · 1 ดาวทองบนม่วง · 2 อุ้งเท้าชมพูบนครีมพีช
 */
const CUSH_COL = [['#FFB3D2', '#F27FAE', '#D9628F'], ['#CDB4F6', '#A983E8', '#8A63CF'], ['#FFE6C8', '#FFC79A', '#E8A473']];
function drawCushionArt(c, x, kind) {
  const [lt, mid, dk] = CUSH_COL[kind], cy = GY - 9, rx = 33, ry = 13;
  c.fillStyle = 'rgba(80,40,110,.18)'; c.beginPath(); c.ellipse(x, GY + 2, rx + 2, 5, 0, 0, TAU); c.fill();
  // พู่ทองสองมุม
  for (const d of [-1, 1]) {
    c.fillStyle = goldV(c, cy, cy + 12);
    c.beginPath(); c.moveTo(x + d * (rx - 2), cy + 1); c.lineTo(x + d * (rx + 7), cy + 9); c.lineTo(x + d * (rx + 2), cy + 11); c.closePath(); c.fill();
  }
  c.fillStyle = lg(c, 0, cy - ry, 0, cy + ry, [[0, lt], [0.55, mid], [1, dk]]);
  c.beginPath(); c.ellipse(x, cy, rx, ry, 0, 0, TAU); c.fill();
  // ขอบกุ๊น
  c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.6;
  c.beginPath(); c.ellipse(x, cy - 0.5, rx - 2, ry - 2, 0, Math.PI * 1.02, Math.PI * 1.98); c.stroke();
  // จีบรัศมีเข้าหากระดุม
  c.strokeStyle = 'rgba(120,50,100,.2)'; c.lineWidth = 1.2;
  for (const a of [0.35, 1.2, 1.95, 2.8, 3.6, 4.4, 5.2, 5.95]) { c.beginPath(); c.moveTo(x + Math.cos(a) * 6, cy - 1 + Math.sin(a) * 2.4); c.quadraticCurveTo(x + Math.cos(a) * 14, cy - 1 + Math.sin(a) * 7, x + Math.cos(a) * (rx - 7), cy - 1 + Math.sin(a) * (ry - 4)); c.stroke(); }
  // ลายประจำใบ
  c.fillStyle = 'rgba(255,255,255,.85)';
  if (kind === 0) for (const dx of [-17, 17]) { heart(c, x + dx, cy - 2, 3.6); c.fill(); }
  else if (kind === 1) for (const dx of [-17, 17]) { c.fillStyle = '#FFE48A'; star(c, x + dx, cy - 2, 4, -Math.PI / 2); c.fill(); }
  else for (const dx of [-17, 17]) pawIcon(c, x + dx, cy - 1, 0.55, '#F58CB8');
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(x - 10, cy - 7, 11, 3, -0.12, 0, TAU); c.fill();
  c.fillStyle = goldV(c, cy - 4, cy + 2); c.beginPath(); c.arc(x, cy - 1, 3.2, 0, TAU); c.fill();
}
/**
 * 4. โต๊ะน้ำชา (ผู้ใช้ 8 พ.ย. "ให้เด่นขึ้น กาน้ำม่วงกลืนกำแพง") — โต๊ะกลมผ้าปูลูกไม้ขาวชายหยัก ขาทองโค้ง
 *   กาน้ำชาพอร์ซเลนชมพูขอบทอง (ไม่ใช่ม่วงแล้ว) · ถ้วยบนจานรองสองใบ · ชั้นวางขนมสามชั้น (มาการง สตรอว์เบอร์รี เค้ก) · แจกันกุหลาบ
 */
const TEA_W = 88;   // ครึ่งความกว้างโต๊ะ
function drawTeaArt(c) {
  const x = X.table, top = GY - 46;
  c.fillStyle = 'rgba(80,40,110,.2)'; c.beginPath(); c.ellipse(x, GY - 1, TEA_W + 10, 7, 0, 0, TAU); c.fill();
  // ขาทองโค้ง
  c.fillStyle = goldV(c, top, GY);
  for (const d of [-1, 1]) {
    const lx = x + d * (TEA_W - 26);
    c.beginPath(); c.moveTo(lx - 3, top + 10); c.bezierCurveTo(lx - 3 + d * 2, GY - 22, lx + d * 12, GY - 12, lx + d * 8, GY - 2); c.lineTo(lx + d * 13, GY - 2);
    c.bezierCurveTo(lx + d * 16, GY - 14, lx + 4 + d * 4, GY - 22, lx + 4, top + 10); c.closePath(); c.fill();
    c.beginPath(); c.arc(lx + d * 10.5, GY - 3, 3.4, 0, TAU); c.fill();
  }
  // ท็อปโต๊ะครีมขอบทอง + ผ้าปูลูกไม้ขาวชายหยัก
  c.fillStyle = goldV(c, top - 2, top + 6); c.beginPath(); c.roundRect(x - TEA_W - 3, top - 2, 2 * TEA_W + 6, 8, 4); c.fill();
  c.fillStyle = lg(c, 0, top, 0, top + 22, [[0, '#FFFFFF'], [1, '#FBE8F1']]);
  c.beginPath(); c.moveTo(x - TEA_W, top + 2); c.lineTo(x + TEA_W, top + 2); c.lineTo(x + TEA_W, top + 14);
  const sc = 11;
  for (let i = 0; i < sc; i++) { const a = x + TEA_W - (i * 2 * TEA_W) / sc, b = a - (2 * TEA_W) / sc; c.quadraticCurveTo((a + b) / 2, top + 26, b, top + 14); }
  c.closePath(); c.fill();
  c.fillStyle = 'rgba(245,169,208,.55)';
  for (let i = 0; i < sc; i++) { const mx = x + TEA_W - ((i + 0.5) * 2 * TEA_W) / sc; c.beginPath(); c.arc(mx, top + 18, 2, 0, TAU); c.fill(); }
  c.fillStyle = PINK; c.fillRect(x - TEA_W, top + 7, 2 * TEA_W, 2.5);
  for (let k = -3; k <= 3; k++) { c.fillStyle = '#FF9CC0'; heart(c, x + k * 24, top + 11, 2.4); c.fill(); }
  // ชั้นวางขนมสามชั้น (ขวา)
  const kx = x + 52;
  c.fillStyle = GOLD; c.fillRect(kx - 1.2, top - 52, 2.4, 52);
  c.beginPath(); c.arc(kx, top - 55, 3, 0, TAU); c.fill();
  for (const [y, hw] of [[top - 2, 22], [top - 20, 17], [top - 37, 12]]) {
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(kx, y - 1, hw, 2.6, 0, 0, TAU); c.fill();
    c.fillStyle = GOLD; c.beginPath(); c.ellipse(kx, y + 0.8, hw, 1.4, 0, 0, Math.PI); c.fill();
    const items = hw > 20 ? [[-13, 'mac', '#F5A9D0'], [-4, 'berry'], [6, 'mac', '#FFE08A'], [15, 'mac', '#C5A4E8']]
      : hw > 15 ? [[-9, 'mac', '#A8E6CF'], [1, 'cake'], [10, 'mac', '#F5A9D0']] : [[-5, 'berry'], [5, 'mac', '#FFFFFF']];
    for (const [dx, k, col] of items) {
      const ix = kx + dx, iy = y - 4;
      if (k === 'mac') { c.fillStyle = col; c.beginPath(); c.ellipse(ix, iy - 2, 4.6, 2.4, 0, 0, TAU); c.ellipse(ix, iy + 1.6, 4.6, 2.2, 0, 0, TAU); c.fill(); c.fillStyle = '#FFF6EC'; c.fillRect(ix - 4, iy - 0.5, 8, 1.2); }
      else if (k === 'berry') { c.fillStyle = '#FF5E8E'; c.beginPath(); c.moveTo(ix, iy + 4); c.quadraticCurveTo(ix - 5, iy - 2, ix, iy - 4); c.quadraticCurveTo(ix + 5, iy - 2, ix, iy + 4); c.fill(); c.fillStyle = '#7CC67E'; c.fillRect(ix - 2, iy - 5, 4, 1.6); }
      else { c.fillStyle = '#FFF0F6'; c.fillRect(ix - 5, iy - 4, 10, 7); c.fillStyle = '#F58CB8'; c.fillRect(ix - 5, iy - 4, 10, 2); c.fillStyle = '#FF5E8E'; c.beginPath(); c.arc(ix, iy - 6, 1.8, 0, TAU); c.fill(); }
    }
  }
  // ถ้วยชาบนจานรองสองใบ (กลาง)
  for (const cx of [x - 2, x + 22]) {
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(cx, top - 1, 10, 2.6, 0, 0, TAU); c.fill();
    c.fillStyle = GOLD; c.beginPath(); c.ellipse(cx, top - 0.2, 10, 1.4, 0, 0, Math.PI); c.fill();
    c.fillStyle = lg(c, cx - 7, 0, cx + 7, 0, [[0, '#F3E7F7'], [0.4, '#FFFFFF'], [1, '#EBDDF3']]);
    c.beginPath(); c.moveTo(cx - 7, top - 12); c.lineTo(cx + 7, top - 12); c.quadraticCurveTo(cx + 6.5, top - 2, cx, top - 2); c.quadraticCurveTo(cx - 6.5, top - 2, cx - 7, top - 12); c.fill();
    c.fillStyle = '#F58CB8'; c.fillRect(cx - 7, top - 9, 14, 2);
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 1.8; c.beginPath(); c.arc(cx + 8, top - 8, 3, -1.3, 1.3); c.stroke();
    c.fillStyle = '#E2AE84'; c.beginPath(); c.ellipse(cx, top - 12, 6.4, 1.5, 0, 0, TAU); c.fill();
    c.strokeStyle = GOLD; c.lineWidth = 0.9; c.beginPath(); c.ellipse(cx, top - 12, 7, 1.8, 0, 0, TAU); c.stroke();
  }
  // กาน้ำชาพอร์ซเลนชมพูขอบทอง (ซ้าย)
  const tx = x - 46, ty = top - 17;
  c.strokeStyle = '#F07FB0'; c.lineWidth = 4.5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(tx + 15, ty + 2); c.quadraticCurveTo(tx + 26, ty - 2, tx + 29, ty - 13); c.stroke();
  c.strokeStyle = GOLD; c.lineWidth = 1.4; c.beginPath(); c.moveTo(tx + 26, ty - 11); c.lineTo(tx + 31, ty - 14); c.stroke();
  c.strokeStyle = '#F07FB0'; c.lineWidth = 4;
  c.beginPath(); c.arc(tx - 17, ty, 8, Math.PI * 0.45, Math.PI * 1.55); c.stroke();
  c.fillStyle = lg(c, tx - 18, ty - 16, tx + 18, ty + 16, [[0, '#FFE1EE'], [0.45, '#FBA9CC'], [1, '#E2729F']]);
  c.beginPath(); c.ellipse(tx, ty, 18, 15.5, 0, 0, TAU); c.fill();
  c.fillStyle = goldV(c, ty + 12, ty + 17); c.beginPath(); c.ellipse(tx, ty + 14, 12, 3, 0, 0, TAU); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 1.6; c.beginPath(); c.ellipse(tx, ty - 1, 17, 4, 0, 0.1, Math.PI - 0.1); c.stroke();
  c.fillStyle = '#FFFFFF'; heart(c, tx, ty + 4, 5.5); c.fill();
  c.fillStyle = '#FF8FB3'; heart(c, tx, ty + 4, 3.6); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(tx - 7, ty - 7, 5, 3, -0.6, 0, TAU); c.fill();
  // ฝากาครีม + จุกทอง
  c.fillStyle = '#FFF4F0'; c.beginPath(); c.ellipse(tx, ty - 14, 10, 4, 0, Math.PI, TAU); c.fill();
  c.fillStyle = GOLD; c.fillRect(tx - 10, ty - 14.5, 20, 1.8);
  c.fillStyle = goldV(c, ty - 24, ty - 16); c.beginPath(); c.arc(tx, ty - 20, 3.6, 0, TAU); c.fill();
  // แจกันกุหลาบเล็ก (ระหว่างกาน้ำกับถ้วย)
  const vx = x - 22;
  c.fillStyle = 'rgba(220,240,255,.8)'; c.beginPath(); c.moveTo(vx - 4, top - 2); c.quadraticCurveTo(vx - 6, top - 9, vx - 2, top - 13); c.lineTo(vx + 2, top - 13); c.quadraticCurveTo(vx + 6, top - 9, vx + 4, top - 2); c.fill();
  c.strokeStyle = '#7FBF86'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(vx, top - 12); c.lineTo(vx - 1, top - 22); c.moveTo(vx, top - 12); c.lineTo(vx + 4, top - 19); c.stroke();
  c.fillStyle = '#FF7EAB'; c.beginPath(); c.arc(vx - 1, top - 24, 3.6, 0, TAU); c.fill();
  c.fillStyle = '#FFC4DA'; c.beginPath(); c.arc(vx + 4.5, top - 20, 2.6, 0, TAU); c.fill();
}
/**
 * 5. โซฟาใหญ่ชมพู 4 ที่นั่ง (ผู้ใช้ 8 พ.ย. วาดให้สวยขึ้น): พนักทรงอูฐโค้งขอบทอง บุกำมะหยี่ดึงกระดุมข้าวหลามตัด หูแมวบนพนัก
 *   เบาะแยกที่นั่งพองกุ๊นขอบ · ที่วางแขนม้วนจีบดอกกุหลาบทอง · ระบายพู่ใต้เบาะ · ขาทองโค้ง · หมอนตุ๊กตาหน้าแมว/หัวใจ (เบาะ GY-26 · พนัก GY-64)
 */
function drawSofaArt(c) {
  const x = X.sofa, w = SOFA_W, x0 = x - w / 2;
  c.fillStyle = 'rgba(80,40,110,.2)'; c.beginPath(); c.ellipse(x, GY - 1, w * 0.54, 7, 0, 0, TAU); c.fill();
  for (const lx of [x0 + 20, x - 2, x0 + w - 20]) {
    c.fillStyle = goldV(c, GY - 16, GY);
    c.beginPath(); c.moveTo(lx - 5, GY - 15); c.quadraticCurveTo(lx - 8, GY - 7, lx - 2, GY - 2); c.lineTo(lx + 3, GY - 2); c.quadraticCurveTo(lx, GY - 7, lx + 5, GY - 15); c.closePath(); c.fill();
    c.beginPath(); c.arc(lx, GY - 2, 2.8, 0, TAU); c.fill();
  }
  // พนักทรงอูฐ + หูแมว
  const back = () => {
    c.beginPath(); c.moveTo(x0 + 10, GY - 26); c.lineTo(x0 + 10, GY - 60); c.quadraticCurveTo(x0 + 16, GY - 86, x - 70, GY - 84);
    c.quadraticCurveTo(x, GY - 98, x + 70, GY - 84); c.quadraticCurveTo(x0 + w - 16, GY - 86, x0 + w - 10, GY - 60); c.lineTo(x0 + w - 10, GY - 26); c.closePath();
  };
  for (const d of [-1, 1]) {
    c.fillStyle = lg(c, 0, GY - 112, 0, GY - 82, [[0, '#E987B6'], [1, '#C9558F']]);
    c.beginPath(); c.moveTo(x + d * 90, GY - 84); c.quadraticCurveTo(x + d * 100, GY - 104, x + d * 108, GY - 112); c.quadraticCurveTo(x + d * 116, GY - 98, x + d * 124, GY - 82); c.closePath(); c.fill();
    c.fillStyle = '#FFC9DF'; c.beginPath(); c.moveTo(x + d * 100, GY - 86); c.quadraticCurveTo(x + d * 104, GY - 98, x + d * 108, GY - 103); c.quadraticCurveTo(x + d * 112, GY - 95, x + d * 116, GY - 85); c.closePath(); c.fill();
  }
  c.fillStyle = lg(c, 0, GY - 98, 0, GY - 24, [[0, '#F29BC3'], [0.55, '#DE6AA0'], [1, '#C4508A']]); back(); c.fill();
  c.save(); back(); c.clip();
  c.strokeStyle = 'rgba(130,25,85,.28)'; c.lineWidth = 1;
  for (let k = -16; k < 18; k++) { const bx = x0 + k * 26; c.beginPath(); c.moveTo(bx, GY - 26); c.lineTo(bx + 70, GY - 100); c.moveTo(bx + 70, GY - 26); c.lineTo(bx, GY - 100); c.stroke(); }
  for (let k = -16; k < 18; k++) for (const yy of [GY - 39, GY - 64, GY - 89]) { c.fillStyle = 'rgba(255,226,240,.9)'; c.beginPath(); c.arc(x0 + k * 26 + (yy === GY - 64 ? 13 : 0) + 22, yy, 1.6, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(x0, GY - 98, w, 10);
  c.restore();
  c.strokeStyle = GOLD; c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(x0 + 10, GY - 60); c.quadraticCurveTo(x0 + 16, GY - 86, x - 70, GY - 84); c.quadraticCurveTo(x, GY - 98, x + 70, GY - 84); c.quadraticCurveTo(x0 + w - 16, GY - 86, x0 + w - 10, GY - 60); c.stroke();
  crownIcon(c, x, GY - 92, 0.55);
  // หมอนตุ๊กตา: แมวส้ม · หัวใจม่วง · แมวขาว · หัวใจทอง
  for (const [j, d] of SOFA_SEATS.entries()) {
    const px = x + d, py = GY - 46;
    if (j % 2 === 0) plushCat(c, px, py, 14, j ? ['#FFFFFF', '#EFE4F6'] : ['#FFE1C2', '#F5C18F'], j ? '#B9A6E8' : '#FF9CC0');
    else plushHeart(c, px, py + 1, 14, j === 1 ? ['#DCC6F7', '#B897E6'] : ['#FFEFB0', '#F2CC6A']);
  }
  // ระบายพู่ใต้เบาะ
  c.fillStyle = lg(c, 0, GY - 16, 0, GY - 6, [[0, '#D45E98'], [1, '#B4467E']]); c.fillRect(x0 + 10, GY - 16, w - 20, 7);
  c.strokeStyle = GOLD; c.lineWidth = 1;
  for (let k = 0; k <= 44; k++) { const fx = x0 + 12 + k * (w - 24) / 44; c.beginPath(); c.moveTo(fx, GY - 9); c.lineTo(fx, GY - 5); c.stroke(); }
  c.fillStyle = GOLD; c.fillRect(x0 + 10, GY - 16, w - 20, 1.4);
  // เบาะแยกที่นั่งพองกุ๊นขอบ
  for (const d of SOFA_SEATS) {
    const sx = x + d;
    c.fillStyle = lg(c, 0, GY - 33, 0, GY - 14, [[0, '#F9B0CF'], [0.5, '#E57AAC'], [1, '#C85891']]);
    c.beginPath(); c.roundRect(sx - 39, GY - 33, 78, 19, 9); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.2; c.beginPath(); c.roundRect(sx - 36, GY - 31, 72, 15, 7); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.roundRect(sx - 28, GY - 31, 44, 3, 1.5); c.fill();
  }
  // ที่วางแขนม้วนจีบ + ดอกกุหลาบทอง
  for (const [d, ax] of [[-1, x0 + 8], [1, x0 + w - 8]]) {
    c.fillStyle = lg(c, 0, GY - 58, 0, GY - 12, [[0, '#EC8DBA'], [1, '#BC4C85']]); c.beginPath(); c.roundRect(ax - 13, GY - 54, 26, 42, 12); c.fill();
    c.fillStyle = lg(c, ax - 14, 0, ax + 14, 0, [[0, '#F5A3C8'], [1, '#CF5E97']]); c.beginPath(); c.ellipse(ax, GY - 50, 14, 11, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(130,25,85,.4)'; c.lineWidth = 1;
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; c.beginPath(); c.moveTo(ax + d * 2, GY - 50); c.lineTo(ax + d * 2 + Math.cos(a) * 9, GY - 50 + Math.sin(a) * 7); c.stroke(); }
    c.fillStyle = goldV(c, GY - 56, GY - 44); c.beginPath(); c.arc(ax + d * 2, GY - 50, 4.6, 0, TAU); c.fill();
    c.fillStyle = '#FF8FB3'; c.beginPath(); c.arc(ax + d * 2, GY - 50, 1.8, 0, TAU); c.fill();
  }
}
/**
 * หมอนตุ๊กตาหน้าแมว (ผู้ใช้ 8 พ.ย. "หน้าแมวบนโซฟาดูแปลก ปรับให้สวยขึ้น"):
 *   หัวกลมแป้นผ้านุ่มไล่เงา หูมนมีในหูชมพู ตะเข็บประรอบขอบ หน้าปักยิ้มตาหยี แก้มชมพู โบว์เล็กที่หู
 */
function plushCat(c, x, y, r, [fur, furD], bow) {
  for (const d of [-1, 1]) {
    c.fillStyle = furD;
    c.beginPath(); c.moveTo(x + d * r * 0.98, y - r * 0.12); c.quadraticCurveTo(x + d * r * 1.08, y - r * 1.18, x + d * r * 0.72, y - r * 1.16);
    c.quadraticCurveTo(x + d * r * 0.42, y - r * 1.02, x + d * r * 0.16, y - r * 0.8); c.closePath(); c.fill();
    c.fillStyle = '#FFC4DA';
    c.beginPath(); c.moveTo(x + d * r * 0.86, y - r * 0.36); c.quadraticCurveTo(x + d * r * 0.92, y - r * 0.98, x + d * r * 0.7, y - r * 0.98);
    c.quadraticCurveTo(x + d * r * 0.5, y - r * 0.88, x + d * r * 0.36, y - r * 0.72); c.closePath(); c.fill();
  }
  c.fillStyle = lg(c, 0, y - r, 0, y + r, [[0, fur], [0.65, fur], [1, furD]]);
  c.beginPath(); c.ellipse(x, y, r * 1.14, r * 0.94, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(x - r * 0.42, y - r * 0.5, r * 0.36, r * 0.16, -0.35, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(160,110,150,.4)'; c.lineWidth = 0.9; c.setLineDash([1.8, 2]);
  c.beginPath(); c.ellipse(x, y, r * 1.02, r * 0.82, 0, 0, TAU); c.stroke(); c.setLineDash([]);
  // หน้าปัก: ตาหยียิ้ม · จมูกชมพู · ปาก w · แก้ม
  c.strokeStyle = '#6E4F86'; c.lineWidth = 1.5; c.lineCap = 'round';
  for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * r * 0.42, y + r * 0.02, r * 0.17, Math.PI * 1.12, Math.PI * 1.88); c.stroke(); }
  c.fillStyle = '#FF8FB3'; c.beginPath(); c.moveTo(x - r * 0.1, y + r * 0.14); c.lineTo(x + r * 0.1, y + r * 0.14); c.lineTo(x, y + r * 0.26); c.closePath(); c.fill();
  c.lineWidth = 1.1; c.beginPath(); c.arc(x - r * 0.09, y + r * 0.28, r * 0.09, 0.1, Math.PI - 0.1); c.arc(x + r * 0.09, y + r * 0.28, r * 0.09, 0.1, Math.PI - 0.1); c.stroke();
  c.fillStyle = 'rgba(255,143,179,.5)'; c.beginPath(); c.ellipse(x - r * 0.66, y + r * 0.24, r * 0.17, r * 0.11, 0, 0, TAU); c.ellipse(x + r * 0.66, y + r * 0.24, r * 0.17, r * 0.11, 0, 0, TAU); c.fill();
  // โบว์เล็กที่โคนหูซ้าย
  const bx = x - r * 0.62, by = y - r * 0.82;
  c.fillStyle = bow;
  c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx - r * 0.36, by - r * 0.3, bx - r * 0.34, by + r * 0.06); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + r * 0.36, by - r * 0.3, bx + r * 0.34, by + r * 0.06); c.closePath(); c.fill();
  c.beginPath(); c.arc(bx, by - r * 0.03, r * 0.1, 0, TAU); c.fill();
}
/** หมอนหัวใจผ้านุ่ม (ไล่เงา · ตะเข็บประ · เงาวาว) */
function plushHeart(c, x, y, r, [col, colD]) {
  c.fillStyle = lg(c, 0, y - r, 0, y + r, [[0, col], [0.6, col], [1, colD]]);
  heart(c, x, y, r); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 0.9; c.setLineDash([1.8, 2]);
  heart(c, x, y + r * 0.04, r * 0.8); c.stroke(); c.setLineDash([]);
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(x - r * 0.4, y - r * 0.38, r * 0.2, r * 0.12, -0.6, 0, TAU); c.fill();
}
/**
 * 6. เต็นท์พักผ่อนสองหลัง (ผู้ใช้ 8 พ.ย. "วาดใหม่ให้สวย ดูแพงขึ้น") — ม่วงชมพู · มิ้นต์ครีม
 *   ผ้าซาตินลายทางมีเงาวาว · ยอดมงกุฎทองธงจิ๋ว · ระบายลอนรอบเต็นท์ช่วงบนขอบทองลูกปัด พู่ทองสองข้าง
 *   ผ้าหน้ารวบด้วยโบว์ซาตินพู่ห้อย ขอบลูกไม้ขาว · ไฟประดับพาดปากเต็นท์ · ข้างในฟูกนุ่มหมอนลูกไม้ ตุ๊กตากระต่าย โคมดาว · พรมขนฟูหน้าเต็นท์
 *   แยกสองชั้น: ข้างในวาดหลังตัวน้อง · ผ้าหน้าเต็นท์วาดซ้ำทับตัวน้องตอนนอนอยู่ในเต็นท์
 */
const TENT_OPEN = 66;   // ครึ่งความกว้างปากเต็นท์ที่พื้น
const TENTS = {
  lTent: { x: X.tent, stripe: ['#FBD9EA', '#CDB4F3'], sheen: '#FFFFFF', inner: ['#9E78D6', '#7553BC'], val: ['#F7A8CB', '#E07AAE'], pillow: '#D5C2F7', blanket: ['#FFC4DA', '#F29CC0'], bow: '#F27FAE', rug: '#F6E7FF' },
  lTent2: { x: X.tent2, stripe: ['#FFF6EA', '#A6E3CC'], sheen: '#FFFFFF', inner: ['#7CC6B2', '#4F9C8A'], val: ['#FFE08A', '#E9B94E'], pillow: '#FFE7A8', blanket: ['#FFD9B8', '#F7B48A'], bow: '#F58CB8', rug: '#EAFBF3' },
};
function drawTentBack(c, T) {
  const x = T.x, hw = TENT.w / 2, top = GY - TENT.h;
  // พรมขนฟูกลมหน้าเต็นท์
  c.fillStyle = 'rgba(80,40,110,.16)'; c.beginPath(); c.ellipse(x, GY + 2, hw + 14, 8, 0, 0, TAU); c.fill();
  c.fillStyle = T.rug; c.beginPath(); c.ellipse(x, GY, hw + 6, 6.5, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.9)';
  for (let k = 0; k < 22; k++) { const a = (k / 22) * TAU; c.beginPath(); c.arc(x + Math.cos(a) * (hw + 6), GY + Math.sin(a) * 6.5, 2, 0, TAU); c.fill(); }
  const inner = () => { c.beginPath(); c.moveTo(x, top + 12); c.lineTo(x + hw - 8, GY - 2); c.lineTo(x - hw + 8, GY - 2); c.closePath(); };
  c.fillStyle = lg(c, 0, top, 0, GY, [[0, T.inner[0]], [1, T.inner[1]]]); inner(); c.fill();
  const g = c.createRadialGradient(x, GY - 52, 4, x, GY - 52, 80);
  g.addColorStop(0, 'rgba(255,226,180,.6)'); g.addColorStop(1, 'rgba(255,226,180,0)');
  c.fillStyle = g; inner(); c.fill();
  // โคมดาวแขวนในเต็นท์
  c.strokeStyle = 'rgba(247,222,156,.85)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, top + 20); c.lineTo(x, GY - 86); c.stroke();
  c.fillStyle = '#FFE48A'; star(c, x, GY - 80, 6, -Math.PI / 2); c.fill();
  // ฟูกนุ่ม + หมอนลูกไม้ + ตุ๊กตากระต่าย + ผ้าห่ม
  c.fillStyle = lg(c, 0, GY - 18, 0, GY - 2, [[0, '#FFF6EC'], [1, '#F3D9C6']]);
  c.beginPath(); c.roundRect(x - 64, GY - 18, 128, 16, 8); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.roundRect(x - 56, GY - 17, 112, 3, 1.5); c.fill();
  c.fillStyle = T.pillow; c.beginPath(); c.roundRect(x - 56, GY - 31, 36, 16, 8); c.fill();
  c.fillStyle = '#FFFFFF';
  for (let k = 0; k < 7; k++) { c.beginPath(); c.arc(x - 54 + k * 5.4, GY - 31, 2.2, Math.PI, 0); c.fill(); c.beginPath(); c.arc(x - 54 + k * 5.4, GY - 15, 2.2, 0, Math.PI); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x - 42, GY - 26, 8, 2.4, 0, 0, TAU); c.fill();
  // กระต่ายตุ๊กตา
  const rx = x + 34, ry = GY - 24;
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(rx - 3, ry - 16, 2.6, 7, -0.15, 0, TAU); c.ellipse(rx + 3, ry - 16, 2.6, 7, 0.15, 0, TAU); c.fill();
  c.fillStyle = '#FFC4DA'; c.beginPath(); c.ellipse(rx - 3, ry - 16, 1.2, 4.6, -0.15, 0, TAU); c.ellipse(rx + 3, ry - 16, 1.2, 4.6, 0.15, 0, TAU); c.fill();
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(rx, ry - 7, 6, 0, TAU); c.ellipse(rx, ry + 2, 7, 6, 0, 0, TAU); c.fill();
  c.fillStyle = '#5E4378'; c.beginPath(); c.arc(rx - 2.2, ry - 7.5, 0.9, 0, TAU); c.arc(rx + 2.2, ry - 7.5, 0.9, 0, TAU); c.fill();
  c.fillStyle = '#FF8FB3'; c.beginPath(); c.arc(rx, ry - 5.5, 0.9, 0, TAU); c.fill();
  c.fillStyle = lg(c, 0, GY - 20, 0, GY - 6, [[0, T.blanket[0]], [1, T.blanket[1]]]);
  c.beginPath(); c.roundRect(x - 6, GY - 19, 58, 14, 5); c.fill();
  for (const dx of [6, 22, 38]) { c.fillStyle = 'rgba(255,255,255,.85)'; heart(c, x + dx, GY - 12, 2.8); c.fill(); }
}
function drawTentFront(c, T) {
  const x = T.x, hw = TENT.w / 2, top = GY - TENT.h;
  const flap = (d) => { c.beginPath(); c.moveTo(x, top); c.lineTo(x + d * hw, GY - 2); c.lineTo(x + d * TENT_OPEN, GY - 2); c.quadraticCurveTo(x + d * 40, GY - 80, x, top + 16); c.closePath(); };
  for (const d of [-1, 1]) {
    c.save(); flap(d); c.clip();
    for (let k = -6; k < 12; k++) {
      const x1 = x + k * 17 * d, x2 = x + (k + 1) * 17 * d;
      c.fillStyle = k % 2 ? T.stripe[0] : T.stripe[1];
      c.beginPath(); c.moveTo(x1, top - 10); c.lineTo(x2, top - 10); c.lineTo(x2 + d * 66, GY); c.lineTo(x1 + d * 66, GY); c.fill();
    }
    // เงาวาวซาติน (แถบสว่างเฉียง) + เงาพับใกล้ปาก
    c.fillStyle = 'rgba(255,255,255,.28)';
    c.beginPath(); c.moveTo(x + d * 8, top + 4); c.lineTo(x + d * 18, top + 4); c.lineTo(x + d * 70, GY); c.lineTo(x + d * 52, GY); c.closePath(); c.fill();
    c.fillStyle = lg(c, x + d * 22, 0, x + d * 70, 0, [[0, 'rgba(90,60,130,.3)'], [1, 'rgba(90,60,130,0)']]);
    c.fillRect(x - hw, top, 2 * hw, TENT.h);
    c.fillStyle = lg(c, 0, top, 0, GY, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(90,60,130,.18)']]); c.fillRect(x - hw, top, 2 * hw, TENT.h);
    c.restore();
    // ขอบลูกไม้ขาวตามปากเต็นท์
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(x + d * TENT_OPEN, GY - 2); c.quadraticCurveTo(x + d * 40, GY - 80, x, top + 16); c.stroke();
    c.fillStyle = '#FFFFFF';
    for (let k = 1; k < 12; k++) { const u = k / 12, px = (1 - u) * (1 - u) * (x + d * TENT_OPEN) + 2 * u * (1 - u) * (x + d * 40) + u * u * x, py = (1 - u) * (1 - u) * (GY - 2) + 2 * u * (1 - u) * (GY - 80) + u * u * (top + 16); c.beginPath(); c.arc(px - d * 2, py, 2.2, 0, TAU); c.fill(); }
    // โบว์ซาตินรวบผ้า + พู่ห้อย
    const bx = x + d * 47, by = GY - 60;
    c.fillStyle = T.bow;
    c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx - 9, by - 9, bx - 10, by + 1); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + 9, by - 9, bx + 10, by + 1); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(bx - 1, by + 1); c.lineTo(bx - 5, by + 12); c.lineTo(bx - 2, by + 11); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(bx + 1, by + 1); c.lineTo(bx + 5, by + 12); c.lineTo(bx + 2, by + 11); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(bx - 5, by - 3, 2.4, 1.2, -0.6, 0, TAU); c.fill();
    c.fillStyle = goldV(c, by - 2, by + 3); c.beginPath(); c.arc(bx, by, 2.4, 0, TAU); c.fill();
  }
  // ระบายลอนรอบเต็นท์ช่วงบน + ลูกปัดทอง + พู่สองข้าง
  const vy = top + 44, vhw = hw * (44 / TENT.h) + 6;
  c.fillStyle = lg(c, 0, vy - 6, 0, vy + 12, [[0, T.val[0]], [1, T.val[1]]]);
  c.beginPath(); c.moveTo(x - vhw, vy - 4); c.quadraticCurveTo(x, vy + 2, x + vhw, vy - 4); c.lineTo(x + vhw, vy + 2);
  const nS = 6;
  for (let k = 0; k < nS; k++) { const a = x + vhw - (k * 2 * vhw) / nS, b = a - (2 * vhw) / nS; c.quadraticCurveTo((a + b) / 2, vy + 16, b, vy + 2 + Math.sin(((k + 1) / nS) * Math.PI) * 4); }
  c.closePath(); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - vhw, vy - 4); c.quadraticCurveTo(x, vy + 2, x + vhw, vy - 4); c.stroke();
  for (let k = 0; k <= nS; k++) { const px = x - vhw + (k * 2 * vhw) / nS; c.fillStyle = GOLD; c.beginPath(); c.arc(px, vy + 3 + Math.sin((k / nS) * Math.PI) * 4, 1.8, 0, TAU); c.fill(); }
  for (const d of [-1, 1]) tasselT(c, x + d * vhw, vy, 0.7);
  // ยอดมงกุฎทอง + ธงจิ๋ว
  c.fillStyle = lg(c, 0, top - 16, 0, top + 2, [[0, '#FFE58A'], [1, '#E3A11F']]);
  c.beginPath(); c.moveTo(x - 9, top + 2); c.lineTo(x - 10, top - 9); c.lineTo(x - 4.5, top - 5); c.lineTo(x, top - 13); c.lineTo(x + 4.5, top - 5); c.lineTo(x + 10, top - 9); c.lineTo(x + 9, top + 2); c.closePath(); c.fill();
  c.fillStyle = '#FF8FB3'; c.beginPath(); c.arc(x, top - 3, 1.8, 0, TAU); c.fill();
  c.strokeStyle = GOLD_D; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, top - 13); c.lineTo(x, top - 30); c.stroke();
  c.fillStyle = T.bow; c.beginPath(); c.moveTo(x, top - 30); c.lineTo(x + 13, top - 26); c.lineTo(x, top - 22); c.closePath(); c.fill();
  // ไฟประดับพาดปากเต็นท์ (หลอดกลมนวล)
  c.strokeStyle = 'rgba(201,155,62,.75)'; c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(x - 40, GY - 92); c.quadraticCurveTo(x, GY - 70, x + 40, GY - 92); c.stroke();
  for (let k = 0; k < 7; k++) {
    const u = (k + 0.5) / 7, fx = x - 40 + u * 80, fy = GY - 92 + Math.sin(u * Math.PI) * 11 + 3;
    c.fillStyle = 'rgba(255,236,170,.45)'; c.beginPath(); c.arc(fx, fy, 4.4, 0, TAU); c.fill();
    c.fillStyle = k % 2 ? '#FFF2B8' : '#FFD6EA'; c.beginPath(); c.arc(fx, fy, 2, 0, TAU); c.fill();
  }
}
/** พู่ทองเล็ก (ห้อยจาก x,y) */
function tasselT(c, x, y, s) {
  c.fillStyle = goldV(c, y, y + 8 * s); c.beginPath(); c.arc(x, y + 3 * s, 3.4 * s, 0, TAU); c.fill();
  c.fillStyle = goldV(c, y + 5 * s, y + 22 * s);
  c.beginPath(); c.moveTo(x - 3 * s, y + 6 * s); c.lineTo(x + 3 * s, y + 6 * s); c.lineTo(x + 5 * s, y + 21 * s); c.quadraticCurveTo(x, y + 24 * s, x - 5 * s, y + 21 * s); c.closePath(); c.fill();
}
const tentBox = (T) => [T.x - TENT.w / 2 - 16, GY - TENT.h - 36, TENT.w + 32, TENT.h + 46];
function drawTent(c, id) {
  const T = TENTS[id], [bx, by, bw, bh] = tentBox(T);
  shaded(c, 'lounge:tentB2:' + id, bx, by, bw, bh, (g) => drawTentBack(g, T));
  shaded(c, 'lounge:tentF2:' + id, bx, by, bw, bh, (g) => drawTentFront(g, T));
}
/** ผ้าหน้าเต็นท์ทับตัวน้อง (main.js เรียกหลังวาดน้อง) · tentId = เต็นท์ที่น้องนอนอยู่ (null = ไม่ได้อยู่ในเต็นท์) */
export function drawLoungeFront(c, camX, vw, t, tentId) {
  drawStairsFront(c, X.stairs, 'lounge:stairs');   // น้องเดินบนบันได = อยู่หลังราว
  const T = TENTS[tentId];
  if (!T) return;
  const [bx, by, bw, bh] = tentBox(T);
  shaded(c, 'lounge:tentF2:' + tentId, bx, by, bw, bh, (g) => drawTentFront(g, T));
}
/**
 * 7. ตู้ขนมสุ่ม (ผู้ใช้ 8 พ.ย. "ให้เด่นขึ้น ให้รู้ว่ากดเล่นได้"): ตู้กระจกหัวโค้งหูแมว ป้ายไฟหลอดกลมรอบป้าย (หลอดกะพริบวาดสด)
 *   กันสาดลอนชมพู-ครีมขอบทองพู่ห้อย · ชั้นกระจกไฟอุ่นสามชั้น (คัพเค้ก มาการง ปลาคุกกี้ โดนัท) · ด้ามหมุนสุ่มสีทองข้างตู้ + ปุ่มหัวใจ
 */
function drawSnackArt(c) {
  const x = X.snack, { w, h } = SNACK, x0 = x - w / 2, top = GY - h;
  c.fillStyle = 'rgba(80,40,110,.2)'; c.beginPath(); c.ellipse(x, GY - 1, w * 0.58, 7, 0, 0, TAU); c.fill();
  // ตัวตู้ + หูแมวบนหัวตู้
  for (const d of [-1, 1]) {
    c.fillStyle = '#F7A8CB'; c.beginPath(); c.moveTo(x + d * 30, top - 18); c.lineTo(x + d * 46, top - 46); c.lineTo(x + d * 58, top - 14); c.closePath(); c.fill();
    c.fillStyle = '#FFE3EF'; c.beginPath(); c.moveTo(x + d * 38, top - 18); c.lineTo(x + d * 46, top - 36); c.lineTo(x + d * 52, top - 16); c.closePath(); c.fill();
  }
  c.fillStyle = lg(c, x0, 0, x0 + w, 0, [[0, '#F3E4D6'], [0.5, '#FFF8F2'], [1, '#EBD8C6']]);
  c.beginPath(); c.roundRect(x0, top + 12, w, h - 14, [6, 6, 12, 12]); c.fill();
  c.fillStyle = goldV(c, top - 4, top + 14); c.beginPath(); c.roundRect(x0 - 10, top - 4, w + 20, 16, 7); c.fill();
  // ป้ายไฟ (พื้นชมพู) — ตัวหนังสือ/หลอดไฟวาดสด
  c.fillStyle = lg(c, 0, top - 30, 0, top - 4, [[0, '#FFB3D2'], [1, '#F27FAE']]); c.beginPath(); c.roundRect(x - 50, top - 30, 100, 28, 12); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 2; c.beginPath(); c.roundRect(x - 50, top - 30, 100, 28, 12); c.stroke();
  // กันสาดลอนสลับสี + พู่
  for (let k = 0; k < 8; k++) {
    const sw = (w + 16) / 8, sx = x0 - 8 + k * sw;
    c.fillStyle = k % 2 ? '#FFF4F0' : '#F58CB8';
    c.beginPath(); c.moveTo(sx, top + 12); c.lineTo(sx + sw, top + 12); c.lineTo(sx + sw, top + 24); c.arc(sx + sw / 2, top + 24, sw / 2, 0, Math.PI); c.closePath(); c.fill();
    c.fillStyle = GOLD; c.beginPath(); c.arc(sx + sw / 2, top + 24 + sw / 2 + 2, 2, 0, TAU); c.fill();
  }
  // ชั้นกระจกไฟอุ่น
  const gx = x0 + 12, gw = w - 24;
  for (const [r, gy] of [[0, top + 44], [1, top + 86]]) {
    c.fillStyle = lg(c, 0, gy, 0, gy + 36, [[0, 'rgba(255,240,215,.95)'], [1, 'rgba(255,224,236,.9)']]); c.fillRect(gx, gy, gw, 36);
    const lgw = c.createRadialGradient(x, gy + 2, 2, x, gy + 2, gw * 0.6);
    lgw.addColorStop(0, 'rgba(255,236,180,.6)'); lgw.addColorStop(1, 'rgba(255,236,180,0)');
    c.fillStyle = lgw; c.fillRect(gx, gy, gw, 36);
    c.fillStyle = goldV(c, gy + 36, gy + 40); c.fillRect(gx - 2, gy + 36, gw + 4, 4);
    if (r === 0) {
      for (const [k, col] of ['#F5A9D0', '#C5A4E8', '#FFE08A', '#A8E6CF'].entries()) {
        const cx = gx + 18 + k * 34;
        c.fillStyle = '#E7B98F'; c.beginPath(); c.moveTo(cx - 9, gy + 22); c.lineTo(cx + 9, gy + 22); c.lineTo(cx + 7, gy + 35); c.lineTo(cx - 7, gy + 35); c.fill();
        c.fillStyle = 'rgba(160,100,60,.3)'; for (let s = -6; s <= 6; s += 4) c.fillRect(cx + s, gy + 23, 1, 11);
        c.fillStyle = col; c.beginPath(); c.arc(cx - 4, gy + 20, 6, 0, TAU); c.arc(cx + 4, gy + 20, 6, 0, TAU); c.arc(cx, gy + 14, 6, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(cx - 2, gy + 13, 2, 0, TAU); c.fill();
        c.fillStyle = '#FF5E8E'; c.beginPath(); c.arc(cx, gy + 8, 2.4, 0, TAU); c.fill();
      }
    } else {
      // มาการงเรียง · คุกกี้ปลา · โดนัท
      for (let k = 0; k < 4; k++) { const mx = gx + 12 + k * 10, col = ['#F5A9D0', '#C5A4E8', '#FFE08A', '#A8E6CF'][k]; c.fillStyle = col; c.beginPath(); c.ellipse(mx, gy + 28, 5, 2.6, 0, 0, TAU); c.ellipse(mx, gy + 32, 5, 2.4, 0, 0, TAU); c.fill(); c.fillStyle = '#FFF6EC'; c.fillRect(mx - 4.4, gy + 29.5, 8.8, 1.2); }
      for (let k = 0; k < 2; k++) { const fx = gx + 64 + k * 4, fy = gy + 22 + k * 8; c.fillStyle = '#F2C38E'; c.beginPath(); c.ellipse(fx, fy, 9, 5, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(fx + 8, fy); c.lineTo(fx + 13, fy - 4); c.lineTo(fx + 13, fy + 4); c.fill(); c.fillStyle = '#FF9CC0'; c.fillRect(fx - 4, fy - 1, 7, 1.6); }
      const dx = gx + gw - 24, dy = gy + 26;
      c.fillStyle = '#E9B57E'; c.beginPath(); c.arc(dx, dy, 10, 0, TAU); c.fill();
      c.fillStyle = '#F9B6D4'; c.beginPath(); c.arc(dx, dy - 1, 9, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(dx + 8, dy + 2); c.quadraticCurveTo(dx, dy + 6, dx - 8, dy + 2); c.closePath(); c.fill();
      c.fillStyle = '#FFF4E6'; c.beginPath(); c.arc(dx, dy, 3.4, 0, TAU); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(gx + 8, gy + 36); c.lineTo(gx + 24, gy); c.lineTo(gx + 32, gy); c.lineTo(gx + 16, gy + 36); c.fill();
  }
  // ช่องรับขนม + ด้ามหมุนสุ่มสีทองข้างตู้ + ปุ่มหัวใจ
  c.fillStyle = '#8E66CF'; c.beginPath(); c.roundRect(x - 26, GY - 24, 52, 14, 6); c.fill();
  c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x - 22, GY - 22, 44, 2);
  pawIcon(c, x + 44, GY - 18, 0.9, 'rgba(201,155,62,.75)');
  c.fillStyle = goldV(c, top + 96, top + 116); c.beginPath(); c.arc(x0 + w + 4, top + 104, 9, 0, TAU); c.fill();
  c.strokeStyle = GOLD_D; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0 + w + 4, top + 104); c.lineTo(x0 + w + 16, top + 92); c.stroke();
  c.fillStyle = '#FF7EAB'; c.beginPath(); c.arc(x0 + w + 17, top + 90, 4.6, 0, TAU); c.fill();
  c.fillStyle = '#FF8FB3'; heart(c, x - 44, GY - 18, 6); c.fill();
}
/** ส่วนสดของตู้ขนม: หลอดไฟรอบป้ายกะพริบไล่กัน · ชื่อตู้ · ขนมลอยบอกว่ากดสุ่มได้ · ประกาย */
function drawSnackLive(c, t) {
  const x = X.snack, top = GY - SNACK.h;
  const n = 14;
  for (let k = 0; k < n; k++) {
    const u = k / n, a = u * TAU;
    const bx = x + Math.cos(a) * 56, by = top - 16 + Math.sin(a) * 18;
    const on = (Math.floor(t / 8) + k) % 3 !== 0;
    c.fillStyle = on ? 'rgba(255,236,170,.55)' : 'rgba(255,236,170,.1)'; c.beginPath(); c.arc(bx, by, 4.6, 0, TAU); c.fill();
    c.fillStyle = on ? '#FFF6D6' : '#E8C98A'; c.beginPath(); c.arc(bx, by, 2.2, 0, TAU); c.fill();
  }
  c.font = '700 11px Mali, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(150,40,90,.35)'; c.fillText('ขนมสุ่ม', x + 0.6, top - 15.2);
  c.fillStyle = '#FFFFFF'; c.fillText('ขนมสุ่ม', x, top - 16);
  // คัพเค้กจิ๋วลอยขึ้นลงเหนือตู้ (บอกว่ากดได้)
  const by = top - 62 + Math.sin(t * 0.06) * 4;
  c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.arc(x - 30, by, 13, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(x - 33, by + 11); c.lineTo(x - 26, by + 18); c.lineTo(x - 25, by + 10); c.fill();
  c.fillStyle = '#E7B98F'; c.beginPath(); c.moveTo(x - 36, by + 1); c.lineTo(x - 24, by + 1); c.lineTo(x - 26, by + 8); c.lineTo(x - 34, by + 8); c.fill();
  c.fillStyle = '#F5A9D0'; c.beginPath(); c.arc(x - 33, by, 4, 0, TAU); c.arc(x - 27, by, 4, 0, TAU); c.arc(x - 30, by - 4, 4, 0, TAU); c.fill();
  c.fillStyle = '#FF5E8E'; c.beginPath(); c.arc(x - 30, by - 8, 1.8, 0, TAU); c.fill();
  sparkleHint(c, x, GY - 80, 74, t);
}
/**
 * 8. คอนโดแมวธีมปราสาท (ผู้ใช้ 8 พ.ย.: เบาะชมพูโดนเสาทะลุ → ยกเบาะขึ้นนั่งบนหัวเสา · บ้านแมวหลังคาม่วงย้ายลงชั้นล่างสุด)
 *   ชั้นล่าง: บ้านแมวหลังคาหูแมวตั้งบนฐาน (ขวา) · เบาะกลมชมพูบนเสาเตี้ย (ซ้าย)
 *   เสากลางลับเล็บสูงถึงยอด → ชั้นกระโดดม่วงสลับซ้ายขวา (ตรงกับผิวที่ยืนได้ PERCH) · ของเล่นแขวนไม่ห้อยทับบ้าน
 */
function drawCondoArt(c) {
  const x = X.condo;
  c.fillStyle = 'rgba(80,40,110,.16)'; c.beginPath(); c.ellipse(x, GY - 1, CONDO.w * 0.52, 7, 0, 0, TAU); c.fill();
  rr(c, x - CONDO.w / 2 + 4, GY - 12, CONDO.w - 8, 12, 6, '#F7D9E8');
  c.fillStyle = GOLD; c.fillRect(x - CONDO.w / 2 + 8, GY - 12, CONDO.w - 16, 1.6);
  c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.roundRect(x - CONDO.w / 2 + 12, GY - 11, CONDO.w - 24, 2.5, 1.2); c.fill();
  // เสาลับเล็บ (เชือกเบจพัน) — ยอดเสาซ่อนใต้ชั้นที่รองรับ
  const post = (px, top) => {
    c.fillStyle = lg(c, px - 7, 0, px + 7, 0, [[0, '#D9C09B'], [0.5, '#F1E0C4'], [1, '#D3B891']]); c.fillRect(px - 7, top, 14, GY - 10 - top);
    c.strokeStyle = 'rgba(160,120,80,.45)'; c.lineWidth = 1.2;
    for (let y = GY - 12; y > top + 2; y -= 5) { c.beginPath(); c.moveTo(px - 7, y); c.lineTo(px + 7, y - 2); c.stroke(); }
  };
  const [cush, rightP, leftP, topP] = PERCH;
  post(x - 6, GY - topP[1] + 4);
  post(cush[0], GY - cush[1] + 6);
  // บ้านแมวชั้นล่าง (หลังคาหูแมวม่วง)
  const hx = HOUSE_X, hb = GY - 12;
  c.fillStyle = lg(c, hx - 30, 0, hx + 30, 0, [[0, '#F4C6DB'], [0.5, LPINK], [1, '#F0BCD3']]);
  c.beginPath(); c.roundRect(hx - 30, hb - 44, 60, 44, [8, 8, 2, 2]); c.fill();
  c.fillStyle = '#8E66CF'; c.beginPath(); archPath(c, hx - 13, hx + 13, hb - 32, hb); c.fill();
  c.fillStyle = 'rgba(255,214,236,.35)'; c.beginPath(); c.ellipse(hx, hb - 4, 10, 3, 0, 0, TAU); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 2; c.beginPath(); archPath(c, hx - 13, hx + 13, hb - 32, hb); c.stroke();
  c.fillStyle = SPUR;
  c.beginPath(); c.moveTo(hx - 37, hb - 40); c.lineTo(hx, hb - 70); c.lineTo(hx + 37, hb - 40); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(hx - 28, hb - 48); c.lineTo(hx - 23, hb - 74); c.lineTo(hx - 10, hb - 60); c.fill();
  c.beginPath(); c.moveTo(hx + 28, hb - 48); c.lineTo(hx + 23, hb - 74); c.lineTo(hx + 10, hb - 60); c.fill();
  c.fillStyle = '#FFC4DA';
  c.beginPath(); c.moveTo(hx - 24, hb - 52); c.lineTo(hx - 22, hb - 67); c.lineTo(hx - 14, hb - 59); c.fill();
  c.beginPath(); c.moveTo(hx + 24, hb - 52); c.lineTo(hx + 22, hb - 67); c.lineTo(hx + 14, hb - 59); c.fill();
  c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.moveTo(hx - 4, hb - 66); c.lineTo(hx - 30, hb - 42); c.lineTo(hx - 20, hb - 42); c.closePath(); c.fill();
  rr(c, hx - 38, hb - 42, 76, 5, 2.5, GOLD);
  c.fillStyle = CREAM; c.beginPath(); c.arc(hx, hb - 53, 5, 0, TAU); c.fill();
  c.fillStyle = '#FF8FB3'; heart(c, hx, hb - 52.5, 3); c.fill();
}

// ── ของเล่นแขวนคอนโดแมว แกว่งได้ (ผู้ใช้ 8 พ.ย.) ─────────────────────
// ลูกตุ้มสปริงหน่วง: แกว่งเบา ๆ ตามลมเอง · น้องเดิน/กระโดดผ่านใกล้ ๆ = ปัดให้แกว่งแรง (main.js ส่งตำแหน่งน้องผ่าน setLoungeCat)
let catPos = { x: -1e4, y: 0, on: null };
/** ตำแหน่งน้องตอนนี้ (main.js เรียกทุกเฟรมตอนอยู่ชั้น 2) */
export function setLoungeCat(x, y, on = null) { catPos = { x, y, on }; }
const TOYS = (() => {
  const [, rightP, leftP, topP] = PERCH;
  return [
    { x: leftP[0] - 26, y: GY - leftP[1] + 10, kind: 'fish', len: 24, a: 0, w: 0, ph: 0.3 },
    { x: topP[0] + 32, y: GY - topP[1] + 10, kind: 'pom', len: 22, a: 0, w: 0, ph: 1.7 },
    { x: rightP[0] + 34, y: GY - rightP[1] + 10, kind: 'pom', len: 16, a: 0, w: 0, ph: 3.1 },
  ];
})();
let toyT = null;
function drawCondoToys(c, t) {
  const dt = toyT == null ? 1 : Math.max(0, Math.min(3, t - toyT));
  toyT = t;
  for (const T of TOYS) {
    const ex = T.x + Math.sin(T.a) * T.len, ey = T.y + Math.cos(T.a) * T.len;
    // น้องอยู่ใกล้ลูกตุ้ม (ช่วงตัวน้อง ~ 0..70 หน่วยเหนือเท้า) = ปัด
    const dx = ex - catPos.x, dy = ey - (catPos.y - 40);
    if (Math.abs(dx) < 18 && Math.abs(dy) < 42 && !T.hit) { T.w += (dx >= 0 ? 1 : -1) * 0.09; T.hit = true; }
    else if (Math.abs(dx) > 30 || Math.abs(dy) > 60) T.hit = false;
    const wind = Math.sin(t * 0.02 + T.ph) * 0.0016;
    T.w += (-0.012 * T.a - 0.035 * T.w + wind) * dt;
    T.a += T.w * dt;
    T.a = Math.max(-1.1, Math.min(1.1, T.a));
    c.save(); c.translate(T.x, T.y); c.rotate(-T.a);
    c.strokeStyle = 'rgba(160,120,80,.75)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, T.len); c.stroke();
    if (T.kind === 'pom') {
      c.fillStyle = '#FF8FB3'; c.beginPath(); c.arc(0, T.len + 5, 6.4, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.65)'; c.beginPath(); c.arc(-2, T.len + 3, 2, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,200,225,.9)'; c.lineWidth = 1;
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; c.beginPath(); c.moveTo(Math.cos(a) * 5, T.len + 5 + Math.sin(a) * 5); c.lineTo(Math.cos(a) * 7.6, T.len + 5 + Math.sin(a) * 7.6); c.stroke(); }
    } else {
      c.fillStyle = '#A9D6FF'; c.beginPath(); c.ellipse(0, T.len + 6, 7, 4, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(6, T.len + 6); c.lineTo(11, T.len + 2); c.lineTo(11, T.len + 10); c.fill();
      c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(-3.5, T.len + 5, 1.2, 0, TAU); c.fill();
    }
    c.restore();
  }
}

// ── ชั้นคอนโดแมวนุ่มเด้ง (ผู้ใช้ 8 พ.ย. "เหยียบแล้วเด้ง ๆ นุ่ม ๆ เหมือนเหยียบจริง · เปลี่ยนสีพรมไม่ให้กลืนผนังม่วง") ──
// แต่ละชั้นเป็นสปริงหน่วง: ลงจอด = ยุบตามแรงตกแล้วเด้งกลับ · ยืนอยู่ = ยุบค้างนิดหนึ่ง · ผิวที่ยืน (s.dy) ขยับตามชั้น น้องเลยยุบ-เด้งไปด้วย
// สีพรมสลับ: เบาะชมพู · มิ้นต์ · พีช · เหลืองเนย
const PERCH_COL = [['#FFD6E8', '#F08DBA'], ['#CFF3E2', '#78CBA6'], ['#FFE6CC', '#F2AE78'], ['#FFF4BF', '#EAC65C']];
const perchSoft = PERCH.map(() => ({ dy: 0, v: 0 }));
let perchT = null;
/** ลงจอดบนชั้นคอนโด (main.js land) — fall = แรงตก */
export function condoBounce(id, fall) {
  const i = Number(String(id).split(':')[1]);
  if (perchSoft[i]) perchSoft[i].v += Math.min(3.6, 0.8 + Math.abs(fall) * 0.32);
}
function stepPerches(t) {
  const dt = perchT == null ? 1 : Math.max(0, Math.min(3, t - perchT));
  perchT = t;
  for (const [i, P] of perchSoft.entries()) {
    const rest = catPos.on === 'condo:' + i ? 2.2 : 0;
    P.v += (-0.2 * (P.dy - rest) - 0.17 * P.v) * dt;
    P.dy += P.v * dt;
    P.dy = Math.max(-4, Math.min(8, P.dy));
    const s = L_SURFACES.find((q) => q.id === 'condo:' + i);
    if (s) s.dy = P.dy;
  }
}
function drawPerches(c, t) {
  stepPerches(t);
  for (const [i, [px, h, hw]] of PERCH.entries()) {
    const dy = perchSoft[i].dy, k = Math.max(-0.4, Math.min(1, dy / 6));
    const y = GY - h + dy, ww = hw * (1 + 0.06 * k), th = 11 * (1 - 0.3 * k);
    const [lt, dk] = PERCH_COL[i];
    c.fillStyle = 'rgba(80,40,110,.14)'; c.beginPath(); c.ellipse(px, GY - h + 11, ww, 4, 0, 0, TAU); c.fill();
    if (i === 0) {
      // เบาะกลมฟูนั่งบนหัวเสาเตี้ย
      c.fillStyle = lg(c, 0, y - 6, 0, y + 10, [[0, lt], [1, dk]]);
      c.beginPath(); c.ellipse(px, y + 3, ww, 8 * (1 - 0.25 * k), 0, 0, TAU); c.fill();
      c.fillStyle = lg(c, 0, y - 3, 0, y + 4, [[0, '#FFF0F6'], [1, '#FFC4DA']]);
      c.beginPath(); c.ellipse(px, y + 1, ww - 6, 4.5 * (1 - 0.3 * k), 0, 0, TAU); c.fill();
      pawIcon(c, px, y + 6.5, 0.55, 'rgba(255,255,255,.8)');
      continue;
    }
    c.fillStyle = lg(c, 0, y - 2, 0, y + th, [[0, lt], [1, dk]]);
    c.beginPath(); c.roundRect(px - ww, y - 1, ww * 2, th, th / 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.roundRect(px - ww + 6, y, ww * 2 - 12, 2, 1); c.fill();
    c.fillStyle = GOLD; c.fillRect(px - ww + 4, y + th - 3, ww * 2 - 8, 1.6);
    // ลายพรมเม็ดจุด
    c.fillStyle = 'rgba(255,255,255,.55)';
    for (let k2 = -2; k2 <= 2; k2++) { c.beginPath(); c.arc(px + k2 * ww * 0.36, y + th * 0.5, 1.3, 0, TAU); c.fill(); }
  }
  const topP = PERCH[3];
  crownIcon(c, topP[0], GY - topP[1] - 4 + perchSoft[3].dy, 0.6);
}

// ── ส่วนที่ main.js เรียก ───────────────────────────────────────
/** เพดาน พื้น ผนัง เสา โคมระย้ารูปแมว นาฬิกา (พิกัดโลก) */
export function drawLoungeBack(c, camX, vw, t) {
  c.fillStyle = SPUR; c.fillRect(camX - 10, -400, vw + 20, 400);
  drawFloor(c, camX, vw);
  drawWalls(c, camX, vw);
  if (Math.abs(bayC(3) - (camX + vw / 2)) < vw / 2 + 60) clockHands(c);
  drawWindowTwinkles(c, camX, vw, t, BAYS, (i, kind) => (kind === 'grand' ? 0.5 : i * 0.37));
  // แสงจากหน้าต่างใหญ่หลังโซฟา (แดด · แสงเย็น · แสงจันทร์ ตามเวลาจริง)
  const gx = X.sofa;
  if (gx > camX - 300 && gx < camX + vw + 300) {
    c.save(); c.globalAlpha = 0.8 + 0.2 * Math.sin(t * 0.012);
    const [s0, , s2] = shaftColors();
    c.fillStyle = lg(c, 0, GRAND.top + 60, 0, H, [[0, s0], [1, s2]]);
    c.beginPath(); c.moveTo(gx - GRAND.w / 2 + 8, GRAND.top + 70); c.lineTo(gx + GRAND.w / 2 - 8, GRAND.top + 70);
    c.lineTo(gx + GRAND.w / 2 - 110, H); c.lineTo(gx - GRAND.w / 2 - 170, H); c.closePath(); c.fill();
    c.restore();
  }
  const glow = 1 + 0.5 * sky().night + 0.25 * sky().dusk;
  for (const [i, x] of CHANDELIERS.entries()) if (x > camX - 120 && x < camX + vw + 120) chandelier(c, x, t, i, 1, glow);
}
/** ของในชั้น (ชิดผนัง หลังตัวน้องทั้งหมด) */
export function drawLoungeWorld(c, camX, vw, t) {
  const vis = (x0, x1) => x1 > camX - 40 && x0 < camX + vw + 40;
  if (vis(X.down - 120, X.down + 120)) {
    shaded(c, 'lounge:down:v3', X.down - 116, GY - 276, 232, 278, drawDownArt);
    // แสงโคมผนังสองข้างซุ้ม
    for (const d of [-1, 1]) {
      const px = X.down + d * 104, ly = GY - 230 + 70, gl = 0.4 + 0.08 * Math.sin(t * 0.06 + d);
      const g = c.createRadialGradient(px, ly, 1, px, ly, 30);
      g.addColorStop(0, `rgba(255,232,170,${gl.toFixed(3)})`); g.addColorStop(1, 'rgba(255,232,170,0)');
      c.fillStyle = g; c.beginPath(); c.arc(px, ly, 30, 0, TAU); c.fill();
    }
    label(c, X.down, GY - 186, 'ลงชั้น 1', 'rgba(255,255,255,.94)', SPUR, 11);
  }
  if (vis(X.books - 130, X.books + 130)) shaded(c, 'lounge:books:v2', X.books - 126, GY - BOOKS.h - 26, 252, BOOKS.h + 28, drawBooksArt);
  if (vis(X.chair - 130, X.lamp + 100)) {
    shaded(c, 'lounge:read:v2', X.chair - 130, GY - 162, X.lamp - X.chair + 170, 164, drawReadArt);
    drawLamp(c, t);
  }
  for (const [x, kd] of CUSHIONS) if (vis(x - 46, x + 46)) shaded(c, 'lounge:cush:' + x, x - 46, GY - 26, 92, 34, (g) => drawCushionArt(g, x, kd));
  if (vis(X.table - 110, X.table + 110)) {
    // แสงอุ่นนวลรอบมุมน้ำชา (บอกว่าตรงนี้เล่นได้) + ประกายวิบ
    const gg = c.createRadialGradient(X.table, GY - 40, 10, X.table, GY - 40, 120);
    gg.addColorStop(0, `rgba(255,236,200,${(0.28 + 0.08 * Math.sin(t * 0.04)).toFixed(3)})`); gg.addColorStop(1, 'rgba(255,236,200,0)');
    c.fillStyle = gg; c.beginPath(); c.arc(X.table, GY - 40, 120, 0, TAU); c.fill();
    shaded(c, 'lounge:tea', X.table - TEA_W - 14, GY - 112, 2 * TEA_W + 28, 114, drawTeaArt);
    // ไอน้ำจากปากกากับถ้วยชา (เกลียวบาง ๆ ลอยขึ้น)
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.7; c.lineCap = 'round';
    for (const [k, sx, sy0] of [[0, X.table - 17, GY - 77], [1, X.table - 2, GY - 60], [2, X.table + 22, GY - 60]]) {
      const u = (t * 0.011 + k * 0.33) % 1, sy = sy0 - u * 24;
      c.globalAlpha = Math.sin(u * Math.PI) * 0.85;
      c.beginPath(); c.moveTo(sx, sy + 9); c.quadraticCurveTo(sx + 6 * Math.sin(t * 0.05 + k), sy + 4, sx, sy); c.stroke();
    }
    c.globalAlpha = 1;
    sparkleHint(c, X.table, GY - 70, 86, t);
  }
  for (const [x, kd] of PLANTS) if (vis(x - 40, x + 40)) { c.save(); c.translate(x, GY); shaded(c, 'hall:plant3:' + kd, -40, -130, 80, 132, (g) => drawPlantArt(g, kd)); c.restore(); }
  if (vis(X.sofa - SOFA_W / 2 - 30, X.sofa + SOFA_W / 2 + 30)) shaded(c, 'lounge:sofa:v3', X.sofa - SOFA_W / 2 - 22, GY - 118, SOFA_W + 44, 120, drawSofaArt);
  for (const id of ['lTent', 'lTent2']) if (vis(TENTS[id].x - 120, TENTS[id].x + 120)) drawTent(c, id);
  if (vis(X.snack - 120, X.snack + 130)) {
    shaded(c, 'lounge:snack:v2', X.snack - SNACK.w / 2 - 16, GY - SNACK.h - 52, SNACK.w + 44, SNACK.h + 54, drawSnackArt);
    drawSnackLive(c, t);
  }
  if (vis(X.condo - 110, X.condo + 110)) {
    shaded(c, 'lounge:condo:v3', X.condo - CONDO.w / 2 - 10, GY - CONDO.h - 24, CONDO.w + 20, CONDO.h + 26, drawCondoArt);
    drawPerches(c, t);
    drawCondoToys(c, t);
  }
  if (vis(X.stairs - 30, LW)) drawStairs(c, t, X.stairs, LW, 'lounge:stairs', 'ชั้น 3');
}
