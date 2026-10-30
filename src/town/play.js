// src/town/play.js
// ─────────────────────────────────────────────────────────────
// ของเล่น + ของตกแต่งตามทาง + ท่าเรือ/เรือทางลัด + สัตว์ตัวเล็ก (ผู้ใช้ 31 ต.ค.)
//
// ของเล่น: คอนโดแมว · กองตัวต่อ · ซุ้มดอกไม้ (ปีนยืนได้ — ผิวอยู่ใน layout.js SURFACES)
//   แทรมโพลีนหัวแมว (ลงแล้วเด้งสูง — bump) · ชิงช้า (นั่งแล้วแกว่ง — swingFrame) · กล่องกระดาษ (มุดได้)
//   ลูกไหมพรม (เดินชนแล้วกลิ้ง — stepPlay)
// ท่าเรือสองฝั่ง: เรือแมวจอดรอ (โบว์ผ้าแพรหัวเรือแบบไทย คนพายเป็นน้องแมว) · ล่องเรือ = เรือลำนี้แล่นไปอีกท่า (main.js)
// เป็ดในแม่น้ำหน้าเมือง · ผีเสื้อบินรอบแปลงดอกไม้
// ─────────────────────────────────────────────────────────────
import { H, GY, ROAD_B, PLACES, PROPS, TOWER, BLOCKS, ARCH, TRAMPS, YARN } from './layout.js';
import { cached, lg, ears, catFace, star, bush, flowers, plaque } from './world.js';
import { drawCat2 } from '../render/cat2.js';
import { skinById } from '../skins.js';

const TAU = Math.PI * 2;
const SWING = PLACES.find((p) => p.kind === 'swing');
const BOX = PLACES.find((p) => p.kind === 'box');
const PIERS = PLACES.filter((p) => p.kind === 'pier');

// ── สถานะของเล่น ──────────────────────────────────────────────
const yarn = { x: YARN.x, v: 0, rot: 0 };
const swing = { amp: 0.05, ph: 0, on: false };
const bumps = new Map();          // แทรมโพลีน id → เวลาที่โดนเหยียบล่าสุด
let playT = 0;

/** แทรมโพลีนโดนเหยียบ (ให้ผ้ายุบแล้วเด้ง) */
export function bump(id) { bumps.set(id, playT); }

/**
 * เดินสถานะของเล่นหนึ่งก้าว — cat = { x, y, dir, moving, speed, onGround, swinging }
 * คืน 'kick' ตอนเตะลูกไหมพรม (ให้ผู้เรียกเล่นเสียง)
 */
export function stepPlay(dt, cat) {
  playT += dt;
  let ev = null;
  // ลูกไหมพรม: น้องเดิน/วิ่งชน (บนพื้นถนน) = กลิ้งไปทางเดียวกัน แรงกว่าความเร็วน้องนิดหน่อย · ชนขอบ = เด้งกลับ
  const near = Math.abs(cat.x - yarn.x) < YARN.r + 16;
  if (near && cat.moving && cat.onGround && cat.y > GY - 4 && Math.sign(yarn.x - cat.x) === cat.dir) {
    const v = cat.dir * cat.speed * 1.45;
    if (Math.abs(yarn.v) < Math.abs(v) - 0.5 || Math.sign(yarn.v) !== cat.dir) ev = 'kick';
    yarn.v = Math.abs(yarn.v) > Math.abs(v) && Math.sign(yarn.v) === cat.dir ? yarn.v : v;
  }
  yarn.x += yarn.v * dt;
  if (yarn.x < YARN.min) { yarn.x = YARN.min; yarn.v = Math.abs(yarn.v) * 0.6; }
  if (yarn.x > YARN.max) { yarn.x = YARN.max; yarn.v = -Math.abs(yarn.v) * 0.6; }
  yarn.v *= Math.pow(0.975, dt);
  if (Math.abs(yarn.v) < 0.03) yarn.v = 0;
  yarn.rot += (yarn.v / YARN.r) * dt;
  // ชิงช้า: มีน้องนั่ง = ค่อย ๆ แกว่งแรงขึ้น · ไม่มี = ไหวเบา ๆ ตามลม
  swing.on = !!cat.swinging;
  swing.amp += ((swing.on ? 0.55 : 0.05) - swing.amp) * Math.min(1, 0.012 * dt);
  swing.ph += 0.055 * dt;
  return ev;
}

/** ชิงช้าตอนนี้: จุดแขวน (px,py) มุมแกว่ง a · ความยาวเชือก L (ที่นั่งอยู่ที่ระยะ L ใต้จุดแขวน) */
export function swingFrame() {
  return { px: SWING.door, py: GY - 148, a: swing.amp * Math.sin(swing.ph), L: 104 };
}

// ── ของตกแต่ง ─────────────────────────────────────────────────
function shadow(c, x, w) {
  c.fillStyle = 'rgba(80,40,110,.14)';
  c.beginPath(); c.ellipse(x, GY + 3, w, 4, 0, 0, TAU); c.fill();
}
function crate(c, x0, y0, w, h) {
  c.fillStyle = lg(c, 0, y0, 0, y0 + h, [[0, '#E2AE72'], [1, '#C88E52']]);
  c.fillRect(x0, y0, w, h);
  c.strokeStyle = '#9A6436'; c.lineWidth = 2.4;
  c.strokeRect(x0 + 1.2, y0 + 1.2, w - 2.4, h - 2.4);
  c.beginPath(); c.moveTo(x0 + 3, y0 + 3); c.lineTo(x0 + w - 3, y0 + h - 3); c.moveTo(x0 + w - 3, y0 + 3); c.lineTo(x0 + 3, y0 + h - 3); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.25)';
  c.fillRect(x0 + 2, y0 + 2, w - 4, 3);
}
/** ของตกแต่งชนิดใหม่ใน PROPS (ชนิดเดิมวาดใน world.js) */
function drawDeco(c, k, x) {
  if (k === 'crate') {
    shadow(c, x + 2, 26);
    crate(c, x - 22, GY - 40, 44, 40);
    crate(c, x - 4, GY - 70, 30, 30);
    c.fillStyle = '#FF8FB3';
    c.beginPath(); c.ellipse(x, GY - 17, 5, 4, 0, 0, TAU); c.fill();
    for (const [dx, dy] of [[-5, -6], [0, -8.5], [5, -6]]) { c.beginPath(); c.arc(x + dx, GY - 17 + dy, 2, 0, TAU); c.fill(); }
  } else if (k === 'mailbox') {
    // ตู้ไปรษณีย์หัวแมว
    shadow(c, x, 14);
    c.fillStyle = '#7A5BB0';
    c.fillRect(x - 3, GY - 30, 6, 30);
    ears(c, x, GY - 62, 8, 7, '#FF7EA8', '#FFD0E0');
    c.fillStyle = lg(c, 0, GY - 64, 0, GY - 30, [[0, '#FF9CC0'], [1, '#F06C98']]);
    c.beginPath(); c.roundRect(x - 13, GY - 64, 26, 34, [13, 13, 4, 4]); c.fill();
    c.fillStyle = '#5A2A48';
    c.fillRect(x - 7, GY - 44, 14, 3);
    catFace(c, x, GY - 54, 9, true, '#FFFFFF');
    c.fillStyle = '#FFD45A';
    c.fillRect(x + 13, GY - 58, 2, 14);
    c.beginPath(); c.moveTo(x + 15, GY - 58); c.lineTo(x + 24, GY - 55); c.lineTo(x + 15, GY - 52); c.fill();
  } else if (k === 'cart') {
    // รถเข็นขายดอกไม้
    shadow(c, x, 36);
    c.strokeStyle = '#8E5A34'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + 30, GY - 34); c.lineTo(x + 46, GY - 48); c.stroke();
    c.fillStyle = lg(c, 0, GY - 46, 0, GY - 16, [[0, '#F2D2A4'], [1, '#D9AE78']]);
    c.beginPath(); c.roundRect(x - 34, GY - 46, 64, 28, 4); c.fill();
    c.fillStyle = '#FF9CC0';
    c.fillRect(x - 34, GY - 30, 64, 5);
    for (const wx of [x - 20, x + 16]) {
      c.fillStyle = '#7A5BB0';
      c.beginPath(); c.arc(wx, GY - 10, 10, 0, TAU); c.fill();
      c.fillStyle = '#FFF4FA';
      c.beginPath(); c.arc(wx, GY - 10, 4, 0, TAU); c.fill();
    }
    for (let i = 0; i < 5; i++) {
      const fx = x - 28 + i * 13;
      bush(c, fx + 2, GY - 44, 7, i % 2 ? '#8FD08A' : '#A6DDA0');
      flowers(c, fx - 4, GY - 56 - (i % 2) * 4, 2, [['#FF8FB3', '#FFFFFF'], ['#FFD45A', '#C8A8F5'], ['#FFFFFF', '#FF8FB3']][i % 3]);
    }
  } else if (k === 'endarch') {
    // ซุ้มปลายเมือง
    shadow(c, x, 50);
    c.fillStyle = '#C9A0E6';
    c.fillRect(x - 48, GY - 100, 9, 100); c.fillRect(x + 39, GY - 100, 9, 100);
    c.strokeStyle = '#C9A0E6'; c.lineWidth = 9;
    c.beginPath(); c.ellipse(x, GY - 100, 44, 44, 0, Math.PI, TAU); c.stroke();
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI + (i / 12) * Math.PI;
      c.fillStyle = ['#FF8FB3', '#FFFFFF', '#FFD45A'][i % 3];
      c.beginPath(); c.arc(x + Math.cos(a) * 44, GY - 100 + Math.sin(a) * 44, 4, 0, TAU); c.fill();
    }
    plaque(c, x, GY - 112, 'แล้วพบกันใหม่', { bg: '#FFF9EC', ink: '#8A4BB8', edge: '#FF9CC0', shape: 'round', size: 11 });
  }
}

/** คอนโดแมว: เสาพันเชือก ชั้นเบาะนุ่ม 3 ชั้น บ้านหูแมวบนสุด (ชั้นตรงกับ SURFACES tw:*) */
function drawTower(c) {
  const t = TOWER.x;
  shadow(c, t, 52);
  c.fillStyle = '#B79CF0';
  c.beginPath(); c.roundRect(t - 50, GY - 8, 100, 8, 4); c.fill();
  c.fillStyle = lg(c, t - 6, 0, t + 6, 0, [[0, '#E8CFA6'], [1, '#CFAF80']]);
  c.fillRect(t - 6, GY - 186, 12, 180);
  c.strokeStyle = 'rgba(140,100,60,.4)'; c.lineWidth = 1;
  for (let y = GY - 182; y < GY - 8; y += 4) { c.beginPath(); c.moveTo(t - 6, y); c.lineTo(t + 6, y + 2); c.stroke(); }
  for (const [a, b, y, col] of [[-44, 6, 48, '#FFB3CF'], [-6, 46, 96, '#C8E8FF'], [-42, 8, 144, '#FFE7A0']]) {
    c.fillStyle = '#9C7FD8';
    c.beginPath(); c.roundRect(t + a - 2, GY - y, b - a + 4, 10, 5); c.fill();
    c.fillStyle = col;
    c.beginPath(); c.roundRect(t + a, GY - y - 4, b - a, 9, 5); c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.fillRect(t + a + 6, GY - y - 3, b - a - 12, 2);
  }
  // บ้านหูแมว
  const hy = GY - 186;
  ears(c, t, hy - 2, 15, 9, '#C9A0E6', '#FFC9D4');
  c.fillStyle = lg(c, 0, hy, 0, hy + 40, [[0, '#E0C8F8'], [1, '#C9A8EE']]);
  c.beginPath(); c.roundRect(t - 22, hy, 44, 40, 8); c.fill();
  c.fillStyle = '#6E4CB8';
  c.beginPath(); c.arc(t, hy + 24, 10, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)';
  c.fillRect(t - 18, hy + 3, 36, 3);
  // ปอมปอมห้อยใต้ชั้นสอง
  c.strokeStyle = '#8A6BC8'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(t + 36, GY - 87); c.lineTo(t + 36, GY - 66); c.stroke();
  c.fillStyle = '#FF8FB3';
  c.beginPath(); c.arc(t + 36, GY - 62, 5, 0, TAU); c.fill();
}

/** กองตัวต่อ MEOW (บล็อกตรงกับ SURFACES blk:*) */
function drawBlocks(c) {
  const b = BLOCKS.x;
  shadow(c, b, 50);
  const rows = [[[-45, 'M', '#FF9CC0'], [-15, 'E', '#9FD3FF'], [15, 'O', '#FFD45A']], [[-30, 'W', '#8EE0C2'], [0, '♥', '#C8A8F5']], [[-15, '★', '#FFB547']]];
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  rows.forEach((row, r) => {
    for (const [dx, ch, col] of row) {
      const x0 = b + dx, y0 = GY - 30 * (r + 1);
      c.fillStyle = col;
      c.beginPath(); c.roundRect(x0 + 0.5, y0 + 0.5, 29, 29, 5); c.fill();
      c.fillStyle = 'rgba(255,255,255,.75)';
      c.beginPath(); c.roundRect(x0 + 5, y0 + 5, 20, 20, 4); c.fill();
      c.fillStyle = 'rgba(70,40,110,.18)';
      c.fillRect(x0 + 24, y0 + 2, 4, 26);
      c.fillStyle = '#7A4BB8';
      c.font = '700 15px Mali, sans-serif';
      c.fillText(ch, x0 + 15, y0 + 16);
    }
  });
}

/** ซุ้มดอกไม้ทางเข้าสวน (โค้งตรงกับ SURFACES arch) */
function drawArch(c) {
  const x = ARCH.x, w = ARCH.w, cx = x + w / 2, cy = GY - 96;
  for (const px of [x, x + w - 10]) {
    c.fillStyle = '#FFF4FA';
    c.fillRect(px, cy, 10, GY - cy);
    c.strokeStyle = 'rgba(160,120,200,.45)'; c.lineWidth = 1;
    for (let y = cy + 6; y < GY; y += 8) { c.beginPath(); c.moveTo(px, y); c.lineTo(px + 10, y + 6); c.stroke(); }
    bush(c, px + 5, GY, 9, '#9ED79A');
  }
  c.strokeStyle = '#FFF4FA'; c.lineWidth = 10;
  c.beginPath(); c.ellipse(cx, cy, w / 2 - 5, 51, 0, Math.PI, TAU); c.stroke();
  c.strokeStyle = '#8FCB8A'; c.lineWidth = 4;
  c.beginPath(); c.ellipse(cx, cy, w / 2 - 5, 51, 0, Math.PI, TAU); c.stroke();
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI, r = i % 2 ? 4.5 : 3.6;
    const fx = cx + Math.cos(a) * (w / 2 - 5), fy = cy + Math.sin(a) * 51;
    c.fillStyle = ['#FF8FB3', '#FFFFFF', '#FFD45A', '#C8A8F5'][i % 4];
    c.beginPath(); c.arc(fx, fy, r, 0, TAU); c.fill();
  }
  for (const [px, py] of [[x + 5, cy + 14], [x + w - 5, cy + 24], [x + 5, cy + 50]]) flowers(c, px - 6, py, 2, ['#FF8FB3', '#FFFFFF']);
  plaque(c, cx, cy - 20, 'สวนดอกไม้', { bg: '#FFF9EC', ink: '#C24F7E', edge: '#FF9CC0', shape: 'round', size: 10.5 });
}

/** แทรมโพลีนหัวแมว — ผ้ายุบแล้วเด้งตอนโดนเหยียบ */
function drawTramp(c, tr) {
  const x = tr.x;
  const u = playT - (bumps.get(tr.id) ?? -999);
  const dip = u < 60 ? 9 * Math.exp(-u * 0.09) * Math.cos(u * 0.45) : 0;
  shadow(c, x, 34);
  c.strokeStyle = '#7A5BB0'; c.lineWidth = 3.5; c.lineCap = 'round';
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x + d * 24, GY - 20); c.lineTo(x + d * 30, GY); c.stroke(); }
  // ผ้ากระโดด
  c.fillStyle = '#5A3F92';
  c.beginPath(); c.moveTo(x - 30, GY - 24); c.quadraticCurveTo(x, GY - 24 + dip * 2, x + 30, GY - 24); c.lineTo(x + 30, GY - 20); c.quadraticCurveTo(x, GY - 20 + dip * 2, x - 30, GY - 20); c.closePath(); c.fill();
  // ขอบสปริง + หน้าแมว
  c.fillStyle = '#FF9CC0';
  c.beginPath(); c.roundRect(x - 33, GY - 22, 66, 9, 4.5); c.fill();
  c.fillStyle = '#FFFFFF';
  for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(x - 27 + i * 9, GY - 17.5, 1.6, 0, TAU); c.fill(); }
  ears(c, x, GY - 26, 22, 6, '#FF9CC0', '#FFD0E0');
}

/** ชิงช้า: โครงไม้ทาสีม่วง ที่นั่งชมพูแกว่งตามมุม (swingFrame) */
function drawSwingFrame(c) {
  const p = SWING, x = p.x, w = p.w;
  shadow(c, x + w / 2, 56);
  c.strokeStyle = '#8C6AD6'; c.lineWidth = 6; c.lineCap = 'round';
  for (const lx of [x + 8, x + w - 8]) {
    c.beginPath(); c.moveTo(lx - 14, GY); c.lineTo(lx, GY - 152); c.lineTo(lx + 14, GY); c.stroke();
  }
  c.fillStyle = '#A98AE8';
  c.beginPath(); c.roundRect(x - 4, GY - 156, w + 8, 9, 4.5); c.fill();
  c.fillStyle = '#FFE680';
  for (let i = 0; i < 5; i++) { star(c, x + 10 + i * ((w - 20) / 4), GY - 151.5, 3); c.fill(); }
  flowers(c, x + 2, GY - 6, 2, ['#FF8FB3', '#FFD45A']);
  flowers(c, x + w - 12, GY - 6, 2, ['#FFFFFF', '#C8A8F5']);
}
function drawSwingSeat(c) {
  const { px, py, a, L } = swingFrame();
  c.save();
  c.translate(px, py);
  c.rotate(a);
  c.strokeStyle = '#B08A6A'; c.lineWidth = 1.6;
  for (const d of [-17, 17]) { c.beginPath(); c.moveTo(d, 0); c.lineTo(d, L); c.stroke(); }
  c.fillStyle = '#E9A2C2';
  c.beginPath(); c.roundRect(-22, L - 2, 44, 7, 3.5); c.fill();
  c.fillStyle = '#FF8FB3';
  c.beginPath(); c.roundRect(-22, L - 4, 44, 4, 2); c.fill();
  c.restore();
}

/** กล่องกระดาษ — ฝาหลัง/ด้านใน (ก่อนตัวน้อง) · ผนังหน้า (หลังตัวน้องตอนมุดอยู่) */
function boxBack(c) {
  const p = BOX, x = p.x, w = p.w;
  shadow(c, x + w / 2, 40);
  c.fillStyle = '#C8925A';
  c.beginPath(); c.moveTo(x + 4, GY - 44); c.lineTo(x + 10, GY - 66); c.lineTo(x + w - 10, GY - 66); c.lineTo(x + w - 4, GY - 44); c.closePath(); c.fill();
  c.fillStyle = '#6E4A2A';
  c.fillRect(x + 4, GY - 46, w - 8, 6);
}
function boxFront(c) {
  const p = BOX, x = p.x, w = p.w;
  c.fillStyle = lg(c, 0, GY - 44, 0, GY, [[0, '#E8B87C'], [1, '#D29C5E']]);
  c.fillRect(x, GY - 44, w, 44);
  c.fillStyle = 'rgba(255,255,255,.2)';
  c.fillRect(x, GY - 44, w, 4);
  c.fillStyle = '#F2D9A8';
  c.fillRect(x + w / 2 - 6, GY - 44, 12, 44);
  // ฝาหน้าพับลง
  c.fillStyle = '#DDA86A';
  c.beginPath(); c.moveTo(x, GY - 44); c.lineTo(x + w, GY - 44); c.lineTo(x + w - 6, GY - 34); c.lineTo(x + 6, GY - 34); c.closePath(); c.fill();
  c.fillStyle = '#B07A44';
  c.beginPath(); c.ellipse(x + 16, GY - 18, 5, 4, 0, 0, TAU); c.fill();
  for (const [dx, dy] of [[-5, -6], [0, -8.5], [5, -6]]) { c.beginPath(); c.arc(x + 16 + dx, GY - 18 + dy, 2, 0, TAU); c.fill(); }
  c.fillStyle = '#C24F7E';
  c.font = '700 9px Mali, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('เหมียว', x + w - 18, GY - 14);
}

// ── ท่าเรือ ───────────────────────────────────────────────────
function drawPier(c, p) {
  const x0 = p.x + 14, x1 = p.x + p.w - 14;
  // เสาท่า (ปักลงน้ำ)
  c.fillStyle = '#7A4E30';
  for (const px of [x0 + 4, (x0 + x1) / 2, x1 - 4]) c.fillRect(px - 3, ROAD_B + 6, 6, H - ROAD_B);
  // พื้นไม้ยื่นจากถนนลงน้ำ
  c.fillStyle = lg(c, 0, GY + 6, 0, ROAD_B + 14, [[0, '#D9A26C'], [1, '#B87C48']]);
  c.beginPath(); c.moveTo(x0 + 6, GY + 6); c.lineTo(x1 - 6, GY + 6); c.lineTo(x1, ROAD_B + 14); c.lineTo(x0, ROAD_B + 14); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(90,50,20,.3)'; c.lineWidth = 1;
  for (let y = GY + 14; y < ROAD_B + 14; y += 8) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
  c.fillStyle = '#9A6436';
  c.fillRect(x0, ROAD_B + 12, x1 - x0, 5);
  // หลักผูกเรือ + เชือก
  c.fillStyle = '#6B4A2E';
  c.beginPath(); c.roundRect(x1 - 10, ROAD_B - 6, 8, 18, 3); c.fill();
  c.strokeStyle = '#E8D2A8'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x1 - 6, ROAD_B); c.quadraticCurveTo(x1 + 12, ROAD_B + 22, x1 + 26, ROAD_B + 18); c.stroke();
  // ป้ายท่าเรือ (ฝั่งหลัง) + โคม
  const sx = p.x + 10;
  c.fillStyle = '#8E5A34';
  c.fillRect(sx - 2, GY - 70, 4, 70);
  c.fillStyle = '#F2D2A4';
  c.beginPath(); c.roundRect(sx - 2, GY - 78, 58, 24, 6); c.fill();
  c.strokeStyle = '#8E5A34'; c.lineWidth = 2;
  c.beginPath(); c.roundRect(sx - 2, GY - 78, 58, 24, 6); c.stroke();
  // เรือใบเล็กบนป้าย
  c.fillStyle = '#4E78E0';
  c.beginPath(); c.moveTo(sx + 6, GY - 63); c.lineTo(sx + 22, GY - 63); c.lineTo(sx + 19, GY - 59); c.lineTo(sx + 9, GY - 59); c.closePath(); c.fill();
  c.fillStyle = '#FF8FB3';
  c.beginPath(); c.moveTo(sx + 14, GY - 64); c.lineTo(sx + 14, GY - 74); c.lineTo(sx + 21, GY - 65); c.closePath(); c.fill();
  c.fillStyle = '#7A4BB8';
  c.font = '700 10px Mali, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('ท่าเรือ', sx + 38, GY - 65.5);
}

// ── เรือแมว ───────────────────────────────────────────────────
export const BOAT_Y = H - 6;   // ระดับน้ำที่เรือลอย
/** ทิศที่เรือของท่านี้หันหัว (ไปหาอีกท่า) · ตำแหน่งจอด = ข้างปลายท่า ฝั่งที่หัวเรือชี้ (ไม่จมใต้พื้นท่า) */
export const pierDir = (p) => Math.sign(PLACES.find((q) => q.id === p.to).door - p.door);
export const mooredX = (p) => p.door + pierDir(p) * 100;
/** ที่นั่งผู้โดยสาร (กลางลำค่อนหัว) — เท้าน้องตอนนั่ง (ท่านั่งวาดที่ seatTop + 4) */
export function boatSeat(x, dir) { return { x: x + dir * 14, y: BOAT_Y - 12 }; }

const FERRY = skinById('orange');
/**
 * เรือไม้ทาสีแบบไทย: หัวเรืองอนสูงผูกผ้าแพรสามสี · ท้ายเรือเป็นหางแมวทองม้วน · คนพาย (น้องแมวส้ม) ท้ายเรือถือพาย
 * dir = ทางที่หัวเรือชี้ · passenger(c, seat) = วาดผู้โดยสาร (ระหว่างลำเรือกับขอบเรือหน้า)
 */
export function drawBoat(c, x, dir, t, passenger) {
  const y = BOAT_Y + Math.sin(t * 0.05 + x * 0.01) * 1.2;
  c.save();
  c.translate(x, y);
  c.scale(dir, 1);
  // เงา/คลื่นรอบเรือ
  c.fillStyle = 'rgba(255,255,255,.45)';
  c.beginPath(); c.ellipse(0, 4, 82, 5, 0, 0, TAU); c.fill();
  // คนพาย + พาย (ท้ายเรือ)
  c.strokeStyle = '#8E5A34'; c.lineWidth = 3; c.lineCap = 'round';
  const row = Math.sin(t * 0.06) * 6;
  c.beginPath(); c.moveTo(-44 + row * 0.4, -46); c.lineTo(-62 - row, 8); c.stroke();
  c.fillStyle = '#C98A55';
  c.beginPath(); c.ellipse(-63 - row, 9, 4, 8, 0.3, 0, TAU); c.fill();
  if (FERRY) drawCat2(c, -46, -12, 0.78, FERRY, t, { k: 1, shape: { sit: 1, turn: -0.2, noHang: 1 } });
  // ด้านในลำเรือ (ขอบหลัง)
  c.fillStyle = '#6E3A2A';
  c.beginPath(); c.moveTo(-64, -16); c.quadraticCurveTo(0, -10, 62, -18); c.lineTo(62, -12); c.quadraticCurveTo(0, -4, -64, -10); c.closePath(); c.fill();
  if (passenger) { c.save(); c.scale(dir, 1); passenger(c); c.restore(); }
  // ลำเรือ
  c.fillStyle = lg(c, 0, -16, 0, 10, [[0, '#B8664C'], [1, '#7E3E30']]);
  c.beginPath();
  c.moveTo(-70, -22);
  c.quadraticCurveTo(-60, 8, 0, 8);
  c.quadraticCurveTo(58, 8, 74, -26);
  c.quadraticCurveTo(40, -10, 0, -10);
  c.quadraticCurveTo(-40, -10, -70, -22);
  c.closePath();
  c.fill();
  c.strokeStyle = '#FFD45A'; c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(-62, -12); c.quadraticCurveTo(0, -2, 64, -14); c.stroke();
  c.strokeStyle = '#FF9CC0'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-56, -6); c.quadraticCurveTo(0, 3, 58, -8); c.stroke();
  c.fillStyle = '#FFE680';
  for (let i = -2; i <= 2; i++) { star(c, i * 20, -3 + Math.abs(i) * -0.6, 2.6); c.fill(); }
  // หัวเรืองอน + ผ้าแพรปลิว
  c.strokeStyle = '#7E3E30'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(70, -22); c.quadraticCurveTo(80, -36, 76, -50); c.stroke();
  c.fillStyle = '#FFD45A';
  c.beginPath(); c.arc(76, -51, 3.5, 0, TAU); c.fill();
  ['#FF8FB3', '#FFD45A', '#8EE0C2'].forEach((col, i) => {
    const fl = Math.sin(t * 0.12 + i * 1.3) * 3;
    c.strokeStyle = col; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(77, -44 + i * 3); c.quadraticCurveTo(68 - i * 2, -36 + fl, 62 - i * 4, -30 + i * 2 + fl); c.stroke();
  });
  c.fillStyle = '#FFFFFF';
  for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(73 + Math.cos(i * 1.6) * 3, -40 + i * 3, 1.6, 0, TAU); c.fill(); }
  // ท้ายเรือ: หางแมวทองม้วน
  c.strokeStyle = '#E7B640'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(-68, -20); c.bezierCurveTo(-82, -24, -84, -42, -72, -44); c.stroke();
  c.fillStyle = '#FFD45A';
  c.beginPath(); c.arc(-72, -44, 3, 0, TAU); c.fill();
  c.restore();
}

// ── เป็ด / ผีเสื้อ ────────────────────────────────────────────
const DUCKS = [{ x: 820, r: 160, v: 0.22 }, { x: 2350, r: 220, v: 0.18 }, { x: 4180, r: 180, v: 0.24 }, { x: 5400, r: 150, v: 0.2 }];
function drawDuck(c, d, t, camX, vw) {
  const ph = (t * d.v) / d.r;
  const x = d.x + Math.sin(ph) * d.r;
  if (x < camX - 40 || x > camX + vw + 40) return;
  const dir = Math.cos(ph) >= 0 ? 1 : -1;
  const y = H - 9 + Math.sin(t * 0.08 + d.x) * 0.8;
  c.save();
  c.translate(x, y);
  c.scale(dir, 1);
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(-22, 3); c.lineTo(-12, 3); c.moveTo(-26, 6); c.lineTo(-16, 6); c.stroke();
  c.fillStyle = '#FFF6D8';
  c.beginPath(); c.ellipse(0, 0, 11, 6.5, 0, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(-9, -2); c.lineTo(-15, -6); c.lineTo(-10, 2); c.fill();
  c.beginPath(); c.arc(7, -8, 5, 0, TAU); c.fill();
  c.fillStyle = '#FFB547';
  c.beginPath(); c.moveTo(11, -8.5); c.lineTo(16, -7); c.lineTo(11, -5.5); c.fill();
  c.fillStyle = '#4A2A3A';
  c.beginPath(); c.arc(8.5, -9.2, 0.9, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,140,170,.5)';
  c.beginPath(); c.arc(9, -6.8, 1.4, 0, TAU); c.fill();
  c.restore();
}
const FLIES = [[640, 250, '#FF9CC0'], [1880, 262, '#FFD45A'], [2420, 240, '#C8A8F5'], [3735, 236, '#9FD3FF'], [3900, 256, '#FF9CC0'], [4975, 252, '#FFD45A']];
function drawButterflies(c, t, camX, vw) {
  FLIES.forEach(([bx, by, col], i) => {
    const x = bx + Math.sin(t * 0.013 + i * 2) * 46 + Math.sin(t * 0.031 + i) * 12;
    if (x < camX - 30 || x > camX + vw + 30) return;
    const y = by + Math.sin(t * 0.022 + i * 3) * 22;
    const f = Math.abs(Math.sin(t * 0.32 + i));
    c.save();
    c.translate(x, y);
    c.fillStyle = col;
    for (const d of [-1, 1]) {
      c.beginPath(); c.ellipse(d * 4 * f, -2, 4.5 * f + 0.6, 5, d * 0.5, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(d * 3 * f, 3, 3 * f + 0.4, 3.4, d * -0.4, 0, TAU); c.fill();
    }
    c.fillStyle = '#5A3A6A';
    c.fillRect(-0.7, -4, 1.4, 9);
    c.restore();
  });
}

/** ลูกไหมพรม (หมุนตามที่กลิ้ง + ปลายด้ายลาก) */
function drawYarn(c) {
  const { x, rot } = yarn, r = YARN.r, y = GY - r + 2;
  c.fillStyle = 'rgba(80,40,110,.16)';
  c.beginPath(); c.ellipse(x, GY + 3, r + 2, 3.5, 0, 0, TAU); c.fill();
  c.strokeStyle = '#FF8FB3'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(x - Math.sign(yarn.v || 1) * r * 0.6, GY - 2); c.quadraticCurveTo(x - Math.sign(yarn.v || 1) * (r + 14), GY + 2, x - Math.sign(yarn.v || 1) * (r + 26), GY - 1); c.stroke();
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#FF9CC0';
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.3;
  for (const a of [-0.6, 0, 0.6]) { c.beginPath(); c.ellipse(0, 0, r * 0.95, r * 0.42, a + 0.8, 0, TAU); c.stroke(); }
  c.restore();
  c.fillStyle = 'rgba(255,255,255,.4)';
  c.beginPath(); c.arc(x - r * 0.35, y - r * 0.4, r * 0.25, 0, TAU); c.fill();
}

// ── วาด ────────────────────────────────────────────────────────
const vis = (camX, vw, x, w) => x + w > camX - 60 && x < camX + vw + 60;

/** ในน้ำ (ก่อนตัวสะพาน): ท่าเรือ · เรือจอด · เป็ด · ride = เรือที่น้องนั่งอยู่ ไม่วาดตรงนี้ (main วาดทับทุกชั้นทีหลัง) */
export function drawWater(c, camX, vw, t, ride) {
  for (const d of DUCKS) drawDuck(c, d, t, camX, vw);
  for (const p of PIERS) {
    if (!vis(camX, vw, p.x - 200, p.w + 400)) continue;
    cached(c, 'pier:' + p.id, p.x - 4, GY - 82, p.w + 50, H - GY + 82, (cc) => drawPier(cc, p));
    const busy = ride && (ride.from === p || ride.to === p);
    if (!busy) drawBoat(c, mooredX(p), pierDir(p), t, null);
  }
}

/** บนถนน (หลังร้าน ก่อนตัวน้อง): ของเล่น ของตกแต่ง · inBox = น้องมุดกล่องอยู่ (ผนังหน้ากล่องรอวาดทับตัวน้อง) */
export function drawPlay(c, camX, vw, t, inBox) {
  for (const [k, x] of PROPS) if (vis(camX, vw, x - 60, 120) && k !== 'pot' && k !== 'bush' && k !== 'sign' && k !== 'barrel') cached(c, 'deco:' + k + x, x - 60, GY - 150, 120, 154, (cc) => drawDeco(cc, k, x));
  if (vis(camX, vw, TOWER.x - 60, 120)) cached(c, 'tower', TOWER.x - 56, GY - 210, 112, 214, drawTower);
  if (vis(camX, vw, BLOCKS.x - 60, 120)) cached(c, 'blocks', BLOCKS.x - 56, GY - 96, 112, 100, drawBlocks);
  if (vis(camX, vw, ARCH.x - 20, ARCH.w + 40)) cached(c, 'arch', ARCH.x - 14, GY - 160, ARCH.w + 28, 164, drawArch);
  for (const tr of TRAMPS) if (vis(camX, vw, tr.x - 40, 80)) drawTramp(c, tr);
  if (vis(camX, vw, SWING.x - 30, SWING.w + 60)) {
    cached(c, 'swing', SWING.x - 30, GY - 162, SWING.w + 60, 166, drawSwingFrame);
    drawSwingSeat(c);
  }
  if (vis(camX, vw, BOX.x - 20, BOX.w + 40)) {
    cached(c, 'boxB', BOX.x - 20, GY - 70, BOX.w + 40, 74, boxBack);
    if (!inBox) cached(c, 'boxF', BOX.x - 2, GY - 46, BOX.w + 4, 48, boxFront);
  }
  if (vis(camX, vw, YARN.min - 30, YARN.max - YARN.min + 60)) drawYarn(c);
}

/** ทับตัวน้อง: ผนังหน้ากล่อง (ตอนมุดอยู่) · ผีเสื้อ */
export function drawPlayFront(c, camX, vw, t, inBox) {
  if (inBox && vis(camX, vw, BOX.x - 20, BOX.w + 40)) cached(c, 'boxF', BOX.x - 2, GY - 46, BOX.w + 4, 48, boxFront);
  drawButterflies(c, t, camX, vw);
}

