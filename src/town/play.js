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
import { H, GY, ROAD_B, PLACES, PROPS, TOWER, BLOCKS, ARCH, TRAMPS, YARN, BRIDGE } from './layout.js';
import { cached, lg, ears, catFace, star, bush, flowers, plaque } from './world.js';
import { drawCat2, CAT2_BREEDS } from '../render/cat2.js';
import { skinById } from '../skins.js';
import { drawPortal } from './garden.js';

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
  // v = ความเร็วแกว่ง (ทิศ + แรง) · amp = ความกว้างแกว่งตอนนี้ — ท่านั่งชิงช้าใช้ทำหางห้อยแกว่งตาม/หน้ายิ้ม
  return { px: SWING.door, py: GY - 148, a: swing.amp * Math.sin(swing.ph), v: swing.amp * Math.cos(swing.ph), amp: swing.amp, L: 104 };
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
  // เชือกผูกตายกับคานที่ห่วงสองจุด (ไม่หมุนตาม) แล้วลากลงไปปลายที่นั่งที่แกว่ง — เดิมหมุนทั้งเส้น หัวเชือกหลุดออกจากคานดูเหมือนขาด (ผู้ใช้ 31 ต.ค.)
  const ca = Math.cos(a), sa = Math.sin(a), hy = py - 4;
  c.strokeStyle = '#B08A6A'; c.lineWidth = 1.6; c.lineCap = 'round';
  for (const d of [-17, 17]) {
    c.beginPath(); c.moveTo(px + d, hy); c.lineTo(px + d * ca - L * sa, py + d * sa + L * ca); c.stroke();
  }
  c.strokeStyle = '#7A5BB0'; c.lineWidth = 1.4;
  for (const d of [-17, 17]) { c.beginPath(); c.arc(px + d, hy, 2.2, 0, TAU); c.stroke(); }
  c.save();
  c.translate(px, py);
  c.rotate(a);
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

// ── ท่าเรือ (ผู้ใช้ 31 ต.ค. อัปเกรดให้เป็นท่าเรือจริง สวยขึ้น — กว้าง 180) ─────────────
// หลังถนน: ศาลาท่าเรือ หลังคาจั่วฟ้าขอบขาว ตราพวงมาลัยเรือทอง ป้ายชื่อท่า ระบายขาว · ผนังไม้ฟ้า หน้าต่างกลมแบบเรือ แผนที่เส้นทางเรือ
//          ห่วงชูชีพบนเสา โคมแขวนชายคา ธงบนยอด (สด) · ถังไม้ + ขดเชือกฝั่งหนึ่ง · เสาโคมท่าเรือฝั่งที่เรือจอด (แทนตะเกียงถนน)
// พื้นท่า: กระดานยื่นจากถนนลงน้ำ คานข้าง หมุด · เสาเข็มคาดขาว บันไดลงน้ำ · หลักผูกเรือ + เชือกโยงไปทางเรือ
// ผิวยืน (หลังคาศาลา · ยอดเสาโคม) อยู่ใน layout.js
const NAVY = '#4F86D8', SKY = '#8CC0F0';
const PIER_S = 1.25;   // ขนาดศาลา/ของประดับ (ผู้ใช้ 31 ต.ค. ขอให้ใหญ่ขึ้น) — ผิวยืนใน layout.js คูณตามนี้
/** วาดชิ้นหลังถนนของท่า (ศาลา โคม ลัง) ขยาย PIER_S รอบโคนกลางท่า */
const grow = (c, d) => { c.translate(d, GY); c.scale(PIER_S, PIER_S); c.translate(-d, -GY); };
function pierSide(p) { return Math.sign(PLACES.find((q) => q.id === p.to).door - p.door); }
function lifebuoy(c, x, y, r) {
  c.strokeStyle = '#E8D2A8'; c.lineWidth = 1.4;
  c.beginPath(); c.arc(x, y, r + 1.5, 0, TAU); c.stroke();
  c.lineWidth = r * 0.55;
  for (let i = 0; i < 8; i++) {
    c.strokeStyle = i % 2 ? '#FF7FAE' : '#FFFFFF';
    c.beginPath(); c.arc(x, y, r * 0.72, (i * TAU) / 8, ((i + 1) * TAU) / 8); c.stroke();
  }
  c.fillStyle = 'rgba(255,255,255,.6)';
  c.beginPath(); c.arc(x - r * 0.45, y - r * 0.5, r * 0.18, 0, TAU); c.fill();
}
function shipWheel(c, x, y, r) {
  c.strokeStyle = '#E3A11F'; c.lineWidth = 2.2; c.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8;
    c.beginPath(); c.moveTo(x + Math.cos(a) * 2, y + Math.sin(a) * 2); c.lineTo(x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3)); c.stroke();
  }
  c.lineWidth = 2.6;
  c.beginPath(); c.arc(x, y, r * 0.78, 0, TAU); c.stroke();
  c.fillStyle = '#FFD45A';
  c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill();
}
function drawPier(c, p) {
  const d = p.door, side = pierSide(p);
  // ── พื้นท่า (กระดานยื่นจากหลังถนนลงน้ำ) ──
  const bx0 = d - 78, bx1 = d + 78, fx0 = d - 95, fx1 = d + 95, fy = ROAD_B + 12;
  // เสาเข็ม (คาดขาว) + บันไดลงน้ำกลางท่า
  for (const px of [d - 85, d - 30, d + 30, d + 85]) {
    c.fillStyle = lg(c, px - 5, 0, px + 5, 0, [[0, '#6B4228'], [0.5, '#93603C'], [1, '#6B4228']]);
    c.fillRect(px - 5, fy, 10, H - fy);
    c.fillStyle = '#FFFFFF';
    c.fillRect(px - 5, fy + 9, 10, 3);
  }
  c.fillStyle = '#C08A5A';
  for (const lx of [d - 10, d + 10]) c.fillRect(lx - 1.5, fy, 3, H - fy);
  for (let y = fy + 5; y < H; y += 6) c.fillRect(d - 10, y, 20, 2);
  // พื้นกระดาน (ลายไม้สลับ หมุด รอยต่อเหลื่อม)
  const deck = () => { c.beginPath(); c.moveTo(bx0, GY + 3); c.lineTo(bx1, GY + 3); c.lineTo(fx1, fy); c.lineTo(fx0, fy); c.closePath(); };
  c.fillStyle = '#C98F5C';
  deck(); c.fill();
  c.save();
  deck(); c.clip();
  for (let y = GY + 3, r = 0; y < fy; y += 7, r++) {
    c.fillStyle = r % 2 ? '#DDA874' : '#D39C66';
    c.fillRect(fx0, y, fx1 - fx0, 6);
    c.fillStyle = 'rgba(90,50,20,.28)';
    for (let x = fx0 + (r % 3) * 22; x < fx1; x += 66) c.fillRect(x, y, 1.2, 6);
    c.fillStyle = 'rgba(90,50,20,.35)';
    for (let x = fx0 + 6 + (r % 2) * 11; x < fx1; x += 22) { c.beginPath(); c.arc(x, y + 3, 0.9, 0, TAU); c.fill(); }
  }
  c.restore();
  c.strokeStyle = '#8E5A34'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(bx0, GY + 3); c.lineTo(fx0, fy); c.moveTo(bx1, GY + 3); c.lineTo(fx1, fy); c.stroke();
  c.fillStyle = '#8E5A34';
  c.beginPath(); c.roundRect(fx0 - 3, fy - 1, fx1 - fx0 + 6, 6, 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,.25)';
  c.fillRect(fx0 - 2, fy - 1, fx1 - fx0 + 4, 1.4);
  // หลักผูกเรือหัวท่าสองข้าง + เชือกโยงไปทางเรือ
  for (const dx of [-1, 1]) {
    const hx = d + dx * 82;
    c.fillStyle = '#5E4A78';
    c.beginPath(); c.roundRect(hx - 5, fy - 14, 10, 14, [5, 5, 1, 1]); c.fill();
    c.fillStyle = '#E8C26A';
    c.beginPath(); c.ellipse(hx, fy - 14, 6, 2.4, 0, 0, TAU); c.fill();
  }
  c.strokeStyle = '#E8D2A8'; c.lineWidth = 1.6;
  const rx = d + side * 82;
  c.beginPath(); c.moveTo(rx, fy - 9); c.quadraticCurveTo(rx + side * 14, fy + 16, rx + side * 34, fy + 10); c.stroke();
  c.beginPath(); c.ellipse(rx - side * 1, fy - 6, 6, 2.6, 0, 0, TAU); c.stroke();
  // ── ศาลาท่าเรือ (หลังถนน · ขยาย PIER_S) ──
  c.save();
  grow(c, d);
  c.fillStyle = 'rgba(60,70,120,.14)';
  c.beginPath(); c.ellipse(d, GY + 3, 76, 5, 0, 0, TAU); c.fill();
  // ผนังไม้ฟ้า + บัวล่าง
  for (let x = d - 50, i = 0; x < d + 50; x += 10, i++) {
    c.fillStyle = i % 2 ? '#E3F1FC' : '#D4E9F8';
    c.fillRect(x, GY - 98, 10, 98);
  }
  c.fillStyle = 'rgba(79,134,216,.18)';
  c.fillRect(d - 50, GY - 98, 100, 6);
  c.fillStyle = '#B9D7F0';
  c.fillRect(d - 50, GY - 14, 100, 14);
  c.fillStyle = '#FFFFFF';
  c.fillRect(d - 50, GY - 15, 100, 2);
  // หน้าต่างกลมแบบเรือ
  for (const dx of [-30, 30]) {
    c.fillStyle = '#E8C26A';
    c.beginPath(); c.arc(d + dx, GY - 64, 10, 0, TAU); c.fill();
    const g = c.createRadialGradient(d + dx - 3, GY - 67, 1, d + dx, GY - 64, 8);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#9ED0F2');
    c.fillStyle = g;
    c.beginPath(); c.arc(d + dx, GY - 64, 7.5, 0, TAU); c.fill();
    c.fillStyle = '#C79A3A';
    for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6; c.beginPath(); c.arc(d + dx + Math.cos(a) * 8.8, GY - 64 + Math.sin(a) * 8.8, 0.9, 0, TAU); c.fill(); }
  }
  // แผนที่เส้นทางเรือ (กลางผนัง)
  c.fillStyle = '#FFFDF6';
  c.beginPath(); c.roundRect(d - 15, GY - 76, 30, 24, 3); c.fill();
  c.strokeStyle = NAVY; c.lineWidth = 1.6;
  c.beginPath(); c.roundRect(d - 15, GY - 76, 30, 24, 3); c.stroke();
  c.strokeStyle = '#7FC4F0'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(d - 11, GY - 60); c.quadraticCurveTo(d - 4, GY - 66, d + 2, GY - 60); c.quadraticCurveTo(d + 7, GY - 55, d + 11, GY - 61); c.stroke();
  c.fillStyle = '#FF7FAE';
  for (const [mx, my] of [[-11, -60], [2, -60], [11, -61]]) { c.beginPath(); c.arc(d + mx, GY + my, 1.8, 0, TAU); c.fill(); }
  c.fillStyle = NAVY;
  c.beginPath(); c.moveTo(d - 6, GY - 70); c.lineTo(d + 4, GY - 70); c.lineTo(d + 2, GY - 67); c.lineTo(d - 4, GY - 67); c.closePath(); c.fill();
  // เสาศาลา (ขาว พันเชือก) + ห่วงชูชีพบนเสาฝั่งตรงข้ามเรือ
  for (const dx of [-54, 54]) {
    c.fillStyle = lg(c, d + dx - 4, 0, d + dx + 4, 0, [[0, '#E6E2F2'], [0.5, '#FFFFFF'], [1, '#E2DDF0']]);
    c.fillRect(d + dx - 4, GY - 100, 8, 100);
    c.strokeStyle = '#D9B98A'; c.lineWidth = 1.6;
    for (let y = GY - 44; y < GY - 22; y += 4) { c.beginPath(); c.moveTo(d + dx - 4, y); c.lineTo(d + dx + 4, y + 3); c.stroke(); }
    c.fillStyle = '#B9D7F0';
    c.fillRect(d + dx - 5.5, GY - 6, 11, 6);
  }
  lifebuoy(c, d - side * 54, GY - 60, 11);
  // ป้ายชื่อท่า (ใต้ชายคา) + ระบายขาว
  c.fillStyle = NAVY;
  c.beginPath(); c.roundRect(d - 66, GY - 106, 132, 22, 5); c.fill();
  c.fillStyle = '#E8C26A';
  for (const dx of [-60, 60]) { c.beginPath(); c.arc(d + dx, GY - 95, 2, 0, TAU); c.fill(); }
  c.font = '700 11px Mali, sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#FFFFFF';
  c.fillText(p.name, d, GY - 94.5);
  for (let x = d - 62; x <= d + 62; x += 8) { c.beginPath(); c.arc(x, GY - 84, 4, 0, Math.PI); c.fill(); }
  // หลังคาจั่วฟ้า (ขอบขาว ลายเส้นชมพู) + ตราพวงมาลัยเรือ
  const gable = () => { c.beginPath(); c.moveTo(d - 74, GY - 104); c.lineTo(d, GY - 142); c.lineTo(d + 74, GY - 104); c.closePath(); };
  c.fillStyle = lg(c, d - 72, 0, d + 72, 0, [[0, '#6E9EE0'], [0.55, SKY], [1, '#76A6E4']]);
  gable(); c.fill();
  c.save();
  gable(); c.clip();
  c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1;
  for (let y = GY - 110; y > GY - 142; y -= 7) { c.beginPath(); c.moveTo(d - 80, y); c.lineTo(d + 80, y); c.stroke(); }
  c.restore();
  c.strokeStyle = '#FFFFFF'; c.lineWidth = 5; c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); c.moveTo(d - 76, GY - 102); c.lineTo(d, GY - 141); c.lineTo(d + 76, GY - 102); c.stroke();
  c.strokeStyle = '#FF9CC0'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(d - 66, GY - 106); c.lineTo(d, GY - 136); c.lineTo(d + 66, GY - 106); c.stroke();
  c.fillStyle = '#FFFDF6';
  c.beginPath(); c.arc(d, GY - 119, 12, 0, TAU); c.fill();
  shipWheel(c, d, GY - 119, 8);
  // ยอดจั่ว: เสาธง (ธงสดวาดใน drawPierLive)
  c.strokeStyle = '#8A6BC8'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(d, GY - 141); c.lineTo(d, GY - 164); c.stroke();
  c.fillStyle = '#FFD45A';
  c.beginPath(); c.arc(d, GY - 165, 2.6, 0, TAU); c.fill();
  // โคมแขวนชายคาฝั่งเรือ
  const lx = d + side * 62;
  c.strokeStyle = '#C79A3A'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(lx, GY - 84); c.lineTo(lx, GY - 76); c.stroke();
  c.fillStyle = '#C79A3A';
  c.beginPath(); c.roundRect(lx - 6, GY - 77, 12, 3, 1.5); c.fill();
  c.fillStyle = lg(c, 0, GY - 74, 0, GY - 62, [[0, '#FFF6CF'], [1, '#FFD08E']]);
  c.beginPath(); c.roundRect(lx - 5, GY - 74, 10, 12, 3); c.fill();
  c.fillStyle = '#C79A3A';
  c.beginPath(); c.roundRect(lx - 4, GY - 62, 8, 2.5, 1); c.fill();
  // ลังไม้สองใบซ้อน (ลายสมอ) + ขดเชือกพิงเสา (ฝั่งตรงข้ามเรือ)
  const bxx = d - side * 80;
  crate(c, bxx - 13, GY - 24, 26, 24);
  crate(c, bxx - 9 + side * 3, GY - 40, 18, 16);
  c.strokeStyle = 'rgba(79,134,216,.75)'; c.lineWidth = 1.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(bxx, GY - 19); c.lineTo(bxx, GY - 7); c.moveTo(bxx - 4, GY - 16); c.lineTo(bxx + 4, GY - 16); c.stroke();
  c.beginPath(); c.arc(bxx, GY - 10, 5, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  c.beginPath(); c.arc(bxx, GY - 20.5, 1.6, 0, TAU); c.stroke();
  const cx2 = d - side * 62;
  c.strokeStyle = '#D9B98A'; c.lineWidth = 2.4;
  for (const r of [8, 5.5, 3]) { c.beginPath(); c.ellipse(cx2, GY - 4, r * 1.25, r * 0.5, 0, 0, TAU); c.stroke(); }
  // กระถางดอกไม้ข้างศาลาฝั่งเรือ
  const fx = d + side * 68;
  flowers(c, fx - 7, GY - 15, 3, ['#FF8FB3', '#FFFFFF', '#FFD45A']);
  c.fillStyle = NAVY;
  c.beginPath(); c.moveTo(fx - 8, GY - 11); c.lineTo(fx + 8, GY - 11); c.lineTo(fx + 6, GY); c.lineTo(fx - 6, GY); c.closePath(); c.fill();
  c.fillStyle = '#FFFFFF';
  c.fillRect(fx - 8, GY - 11, 16, 2);
  // เสาโคมท่าเรือ (ฝั่งเรือ) — ห่วงชูชีพเล็ก + โคมทองเหลือง
  const px = d + side * 84;
  c.fillStyle = NAVY;
  c.beginPath(); c.roundRect(px - 8, GY - 7, 16, 7, [3, 3, 0, 0]); c.fill();
  c.fillStyle = lg(c, px - 2.5, 0, px + 2.5, 0, [[0, '#3E6EBE'], [0.5, '#7FA9EA'], [1, '#3E6EBE']]);
  c.fillRect(px - 2.5, GY - 112, 5, 106);
  c.fillStyle = '#FFFFFF';
  for (const y of [GY - 40, GY - 90]) c.fillRect(px - 3, y, 6, 3);
  c.fillStyle = '#C79A3A';
  c.beginPath(); c.moveTo(px - 9, GY - 112); c.lineTo(px + 9, GY - 112); c.lineTo(px + 6, GY - 108); c.lineTo(px - 6, GY - 108); c.closePath(); c.fill();
  c.fillStyle = lg(c, 0, GY - 126, 0, GY - 112, [[0, '#FFF6CF'], [1, '#FFD08E']]);
  c.beginPath(); c.roundRect(px - 6.5, GY - 126, 13, 14, 3); c.fill();
  c.fillStyle = '#C79A3A';
  c.beginPath(); c.moveTo(px - 8, GY - 125); c.lineTo(px, GY - 133); c.lineTo(px + 8, GY - 125); c.closePath(); c.fill();
  c.beginPath(); c.arc(px, GY - 134, 1.8, 0, TAU); c.fill();
  lifebuoy(c, px, GY - 66, 7);
  c.restore();
}
/** ของสดของท่าเรือ: ธงโบกบนยอดศาลา · แสงโคม · วงคลื่นรอบเสาเข็ม */
function drawPierLive(c, p, t) {
  const d = p.door, side = pierSide(p);
  c.save();
  grow(c, d);
  const s = Math.sin(t * 0.09 + d) * 2.5, s2 = Math.sin(t * 0.09 + d + 1.4) * 2;
  c.fillStyle = '#FF7EB0';
  c.beginPath(); c.moveTo(d + 1, GY - 163); c.quadraticCurveTo(d + 10, GY - 162 + s, d + 19, GY - 158 + s2); c.quadraticCurveTo(d + 10, GY - 154 + s, d + 1, GY - 152); c.closePath(); c.fill();
  for (const [gx, gy, r] of [[d + side * 62, GY - 68, 16], [d + side * 84, GY - 119, 26]]) {
    const g = c.createRadialGradient(gx, gy, 1, gx, gy, r);
    g.addColorStop(0, `rgba(255,236,170,${0.5 + 0.1 * Math.sin(t * 0.13 + gx)})`);
    g.addColorStop(1, 'rgba(255,236,170,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(gx, gy, r, 0, TAU); c.fill();
  }
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.2;
  [-85, -30, 30, 85].forEach((dx, i) => {
    const u = (t * 0.02 + i * 0.27) % 1;
    c.globalAlpha = (1 - u) * 0.8;
    c.beginPath(); c.ellipse(d + dx, ROAD_B + 30, 7 + u * 10, 1.6 + u * 2, 0, 0, TAU); c.stroke();
  });
  c.globalAlpha = 1;
}

// ── เรือแมว ───────────────────────────────────────────────────
export const BOAT_Y = H - 6;   // ระดับน้ำที่เรือลอย
/** ทิศที่เรือของท่านี้หันหัว (ไปหาอีกท่า) · ตำแหน่งจอด = ข้างปลายท่า ฝั่งที่หัวเรือชี้ (ไม่จมใต้พื้นท่า) */
export const pierDir = (p) => Math.sign(PLACES.find((q) => q.id === p.to).door - p.door);
export const mooredX = (p) => p.door + pierDir(p) * 140;   // จอดเลยหัวท่า (พื้นท่ากว้าง ±95)
/** ที่นั่งผู้โดยสาร (กลางลำค่อนหัว) — เท้าน้องตอนนั่ง (ท่านั่งวาดที่ seatTop + 4) */
export function boatSeat(x, dir) { return { x: x + dir * 14, y: BOAT_Y - 12 }; }

// คนพาย (ผู้ใช้ 1 พ.ย.): ลูกแมววิเชียรมาศวัยเด็ก ใส่ชุดกะลาสีน้อย (เดิมน้องแมวส้มตัวโต)
// ลงข้อมูลสายพันธุ์เอง (สีแต้ม/หน้ากาก/ตาฟ้า) เพื่อแต่งตาได้: ประกายในตาจุดเดียวแต่ใหญ่ขึ้น (ผู้ใช้ 1 พ.ย. — สมเป็นแมวเด็ก)
const FERRY = (() => {
  const s = skinById('siamese'), b = CAT2_BREEDS.find((x) => x.id === 'siamese');
  if (!s || !b) return skinById('orange');
  const eye = (e) => ({ ...e, hlK: 1.75 });
  return { ...s, palette: 'siamese', age: 'baby', outfit: { id: 'sailor' }, pal: b.pal, art: b.art, eyeStyle: b.eyeStyle, lashStyle: b.lashStyle,
    eyeDots: b.eyeDots, stripes: b.stripes, sex: b.sex, eyes: { left: eye(b.eyes.left), right: eye(b.eyes.right) } };
})();
/** หัวคนพาย (พิกัดโลก) — ฟองคำพูดลอยเหนือจุดนี้ (main.js) */
export function ferryHead(x, dir, t) {
  return { x: x - dir * 46, y: BOAT_Y + Math.sin(t * 0.05 + x * 0.01) * 1.2 - 62 };
}
/**
 * เรือไม้ทาสีแบบไทย: หัวเรืองอนสูงผูกผ้าแพรสามสี · ท้ายเรือเป็นหางแมวทองม้วน · คนพาย (ลูกแมววิเชียรมาศกะลาสี) ท้ายเรือถือพาย
 * dir = ทางที่หัวเรือชี้ · passenger(c, seat) = วาดผู้โดยสาร (ระหว่างลำเรือกับขอบเรือหน้า)
 * moving = เรือกำลังแล่น → ฟองคลื่นท้ายเรือ + ละอองหัวเรือ · พายจ้วงน้ำทุกจังหวะ = ละอองน้ำกระเซ็น + วงคลื่น (จอดอยู่ก็พายเบา ๆ)
 */
export function drawBoat(c, x, dir, t, passenger, moving = false) {
  const y = BOAT_Y + Math.sin(t * 0.05 + x * 0.01) * 1.2;
  c.save();
  c.translate(x, y);
  c.scale(dir, 1);
  // เงา/คลื่นรอบเรือ
  c.fillStyle = 'rgba(255,255,255,.45)';
  c.beginPath(); c.ellipse(0, 4, 82, 5, 0, 0, TAU); c.fill();
  const row = Math.sin(t * 0.06) * 6;
  boatWater(c, t, row, moving);
  // คนพาย + พาย (ท้ายเรือ)
  c.strokeStyle = '#8E5A34'; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-42 + row * 0.4, -30); c.lineTo(-62 - row, 8); c.stroke();
  c.fillStyle = '#C98A55';
  c.beginPath(); c.ellipse(-63 - row, 9, 4, 8, 0.3, 0, TAU); c.fill();
  if (FERRY) drawCat2(c, -46, -10, 0.86, FERRY, t, { k: 1, shape: { sit: 1, turn: -0.2, noHang: 1 } });   // ก้นจมในลำเรือ (ไม่ลอย) · อกกับปกกะลาสีพ้นขอบเรือ
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
  boatSpray(c, t, row, moving);
  c.restore();
}
/** ผิวน้ำรอบเรือ (หลังลำเรือ): วงคลื่นตรงที่พายจ้วง · แล่นอยู่ = ฟองคลื่นแตกเป็นทางท้ายเรือ + คลื่นรูปตัว V */
function boatWater(c, t, row, moving) {
  c.save();
  for (let j = 0; j < 2; j++) {
    const u = (t * 0.0095 + j * 0.5) % 1;
    c.strokeStyle = `rgba(255,255,255,${0.65 * (1 - u)})`; c.lineWidth = 1.4;
    c.beginPath(); c.ellipse(-64 - row * 0.5, 8, 5 + 24 * u, 1.6 + 3.4 * u, 0, 0, TAU); c.stroke();
  }
  if (moving) {
    c.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const u = (t * 0.02 + i / 10) % 1, side = i % 2 ? 1 : -1;
      c.fillStyle = `rgba(255,255,255,${0.6 * (1 - u)})`;
      c.beginPath(); c.ellipse(-72 - u * 120, 6 + side * u * 7, 3 + 6 * u, 1.4 + 1.6 * u, 0, 0, TAU); c.fill();
    }
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.6;
    const sh = (t * 0.6) % 14;
    for (const s of [-1, 1]) {
      c.setLineDash([8, 6]); c.lineDashOffset = -sh;
      c.beginPath(); c.moveTo(60, 6); c.quadraticCurveTo(-20, 7 + s * 6, -110, 8 + s * 15); c.stroke();
    }
    c.setLineDash([]);
  }
  c.restore();
}
/** ละอองน้ำหน้าเรือ (ทับลำเรือ): หยดน้ำกระเซ็นจากใบพายเป็นวงโค้ง · แล่นอยู่ = ละอองแตกที่หัวเรือ */
function boatSpray(c, t, row, moving) {
  c.save();
  // จังหวะพาย: ใบพายถูกดึงไปท้ายเรือ (row ลดลง) = น้ำกระเซ็นขึ้นตามแรงดึง
  const ph = t * 0.06;
  for (let i = 0; i < 7; i++) {
    const u = (((ph + i * 0.55) % TAU) + TAU) % TAU / TAU;
    if (u > 0.7) continue;
    const k = u / 0.7, sx = -63 - row + (i % 2 ? -1 : 0.4) * (6 + 22 * k), sy = 6 - 26 * k + 34 * k * k;
    c.globalAlpha = 0.85 * (1 - k);
    c.fillStyle = i % 3 ? '#FFFFFF' : '#CDEBFF';
    c.beginPath(); c.arc(sx, sy, 1.2 + (i % 3) * 0.6, 0, TAU); c.fill();
  }
  if (moving) {
    for (let i = 0; i < 8; i++) {
      const u = (t * 0.035 + i / 8) % 1, side = i % 2 ? 1 : -0.6;
      c.globalAlpha = 0.8 * (1 - u);
      c.fillStyle = i % 3 ? '#FFFFFF' : '#CDEBFF';
      c.beginPath(); c.arc(70 + u * 18, 2 - 16 * u + 18 * u * u + side * 3 * u, 1.3 + (i % 3) * 0.5, 0, TAU); c.fill();
    }
    c.globalAlpha = 0.7;
    c.fillStyle = '#FFFFFF';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(64 + i * 5, 4 + Math.sin(t * 0.3 + i) * 1.2, 3 - i * 0.6, 0, TAU); c.fill(); }
  }
  c.restore();
}

// ── เป็ด / ผีเสื้อ ────────────────────────────────────────────
const DUCKS = [{ x: 820, r: 160, v: 0.22 }, { x: 2470, r: 220, v: 0.18 }, { x: 4300, r: 180, v: 0.24 }, { x: 5615, r: 150, v: 0.2 }, { x: 6635, r: 200, v: 0.19 }];
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
const FLIES = [[640, 250, '#FF9CC0'], [2000, 262, '#FFD45A'], [2540, 240, '#C8A8F5'], [3855, 236, '#9FD3FF'], [4020, 256, '#FF9CC0'], [5190, 252, '#FFD45A']];
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
export function drawWater(c, camX, vw, t, boat) {
  for (const d of DUCKS) drawDuck(c, d, t, camX, vw);
  for (const p of PIERS) {
    if (!vis(camX, vw, p.x - 200, p.w + 400)) continue;
    cached(c, 'pier:' + p.id, p.door - 150, GY - 215, 300, H - GY + 215, (cc) => drawPier(cc, p));
    drawPierLive(c, p, t);
  }
  // เรือมีลำเดียวทั้งเมือง (ผู้ใช้ 31 ต.ค.) — boat = ตอนไม่มีคนนั่ง (จอดที่ท่า / กำลังพายมารับ) · ตอนน้องนั่ง main.js วาดเอง
  // ตรงนี้วาดเฉพาะช่วงลอดใต้สะพาน (ต้องอยู่หลังเสาตอม่อ/ซุ้ม) · ที่อื่นวาดทีหลังใน drawBoatFront
  if (boat && underBridge(boat.x) && vis(camX, vw, boat.x - 120, 240)) drawBoat(c, boat.x, boat.dir, t, null, !!boat.trip);
}
const underBridge = (x) => Math.abs(x - BRIDGE.rx) < BRIDGE.half + 110;
/**
 * เรือเปล่านอกช่วงสะพาน — วาดหลังถนน/ลานน้ำพุ/ตัวน้อง (ผู้ใช้ 1 พ.ย.: หัวคนพายโดนขอบลานน้ำพุทับ)
 * แม่น้ำหน้าเมืองอยู่ใกล้สายตากว่าถนน เรือจึงต้องทับของบนถนนเสมอ
 */
export function drawBoatFront(c, camX, vw, t, boat) {
  if (boat && !underBridge(boat.x) && vis(camX, vw, boat.x - 120, 240)) drawBoat(c, boat.x, boat.dir, t, null, !!boat.trip);
}

/** บนถนน (หลังร้าน ก่อนตัวน้อง): ของเล่น ของตกแต่ง · inBox = น้องมุดกล่องอยู่ (ผนังหน้ากล่องรอวาดทับตัวน้อง) */
export function drawPlay(c, camX, vw, t, inBox) {
  for (const [k, x] of PROPS) if (vis(camX, vw, x - 60, 120) && k !== 'pot' && k !== 'bush' && k !== 'sign' && k !== 'barrel') cached(c, 'deco:' + k + x, x - 60, GY - 150, 120, 154, (cc) => drawDeco(cc, k, x));
  if (vis(camX, vw, TOWER.x - 60, 120)) cached(c, 'tower', TOWER.x - 56, GY - 210, 112, 214, drawTower);
  if (vis(camX, vw, BLOCKS.x - 60, 120)) cached(c, 'blocks', BLOCKS.x - 56, GY - 96, 112, 100, drawBlocks);
  if (vis(camX, vw, ARCH.x - 20, ARCH.w + 40)) {
    cached(c, 'arch', ARCH.x - 14, GY - 160, ARCH.w + 28, 164, drawArch);
    drawPortal(c, ARCH.x + ARCH.w / 2, GY - 56, ARCH.w / 2 - 16, 54, t, 0.7);   // ประตูวาปไปสวนดอกไม้ (garden.js)
  }
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

/**
 * ของในเมืองชิ้นเดียว (ภาพเดียวกับในเมือง) วางที่ไหนก็ได้ — แผนที่โลกเหมียว (src/render/world-map.js)
 * kind: 'pierA' / 'pierB' ท่าเรือ (cx = กลางท่า) · 'arch' ซุ้มสวนดอกไม้ · 'tower' คอนโดแมว · 'blocks' กองตัวต่อ
 *       'swing' ชิงช้า · 'tramp' แทรมโพลีน · 'box' กล่องกระดาษ
 * ฐาน baseY (ระดับถนน GY) · สเกล s · ภาพนิ่ง
 */
export function drawPlayPieceAt(c, kind, cx, baseY, s) {
  c.save();
  c.translate(cx, baseY);
  c.scale(s, s);
  const at = (x) => c.translate(-x, -GY);
  if (kind === 'pierA' || kind === 'pierB') {
    const p = PIERS.find((q) => q.id === kind);
    at(p.door);
    cached(c, 'pier:' + p.id, p.door - 150, GY - 215, 300, H - GY + 215, (cc) => drawPier(cc, p));
  } else if (kind === 'arch') { at(ARCH.x + ARCH.w / 2); cached(c, 'arch', ARCH.x - 14, GY - 160, ARCH.w + 28, 164, drawArch); }
  else if (kind === 'tower') { at(TOWER.x); cached(c, 'tower', TOWER.x - 56, GY - 210, 112, 214, drawTower); }
  else if (kind === 'blocks') { at(BLOCKS.x); cached(c, 'blocks', BLOCKS.x - 56, GY - 96, 112, 100, drawBlocks); }
  else if (kind === 'swing') { at(SWING.x + SWING.w / 2); cached(c, 'swing', SWING.x - 30, GY - 162, SWING.w + 60, 166, drawSwingFrame); drawSwingSeat(c); }
  else if (kind === 'tramp') { at(TRAMPS[0].x); drawTramp(c, TRAMPS[0]); }
  else if (kind === 'box') {
    at(BOX.x + BOX.w / 2);
    cached(c, 'boxB', BOX.x - 20, GY - 70, BOX.w + 40, 74, boxBack);
    cached(c, 'boxF', BOX.x - 2, GY - 46, BOX.w + 4, 48, boxFront);
  }
  c.restore();
}

/** ทับตัวน้อง: ผนังหน้ากล่อง (ตอนมุดอยู่) · ผีเสื้อ */
export function drawPlayFront(c, camX, vw, t, inBox) {
  if (inBox && vis(camX, vw, BOX.x - 20, BOX.w + 40)) cached(c, 'boxF', BOX.x - 2, GY - 46, BOX.w + 4, 48, boxFront);
  drawButterflies(c, t, camX, vw);
}

