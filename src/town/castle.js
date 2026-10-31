// src/town/castle.js
// ─────────────────────────────────────────────────────────────
// ดินแดนปราสาทแมวเหมียว (ผู้ใช้ 31 ต.ค.) — ปราสาทคือคีย์หลักของเกม: ทำให้อลังการ + แยกเป็นเขตให้เห็นชัดว่า "เข้าดินแดนปราสาทแล้ว"
//   ซุ้มประตูเขต: เสาหินคู่พันกุหลาบ แมวทองนั่งบนยอดเสา คานป้าย "ดินแดนปราสาทแมวเหมียว" หัวแมวโค้ง + มงกุฎ พวงมาลัยดอกไม้
//   ถนนหลวง: ปูกระเบื้องลาเวนเดอร์ขอบทองตั้งแต่ซุ้มจนสุดเมือง · พรมชมพูทอดจากประตูปราสาทลงถนน
//   รั้ว: ซี่เหล็กดัดยอดหัวใจทอง เสาหินหัวแมวทอง แนวพุ่มไม้ดอกหลังรั้ว · สวนหลวงหลังรั้ว (ต้นไม้ตัดรูปแมว ซากุระ)
//   โคมหลวง: เสาทอง โคมยอดมงกุฎ ธงห้อย (เรืองแสงสด)
//   ปราสาท: หอกลางโดมหูแมว + มงกุฎทอง · หอมุมใหญ่สองหอ · หอหลังสองหอ · ป้อมประตูหน้าจั่วตราโล่ ป้อมแขวนสองข้าง
//           กำแพงใบเสมา หน้าต่างเรืองแสง กล่องดอกไม้ ธงยาว · ประตูบานคู่ช่องแสงพัด ขอบหินโค้ง หินหน้าแมว
//           รูปปั้นแมวองครักษ์สวมมงกุฎผ้าคลุมบนแท่นสองข้าง · บันได · ธงโบกทุกยอด ประกายรอบมงกุฎ
// ตำแหน่ง/ผิวยืน: layout.js (REALM · PLACES castle · SURFACES realm:/rlamp:/cas:) — แก้ภาพตรงไหนต้องแก้ตรงนั้นด้วย
// ─────────────────────────────────────────────────────────────

import { GY, ROAD_B, WORLD_W, REALM, placeById } from './layout.js';
import { cached, light, lg, star, heart, ears, catFace, plaque, bush, flowers } from './world.js';

const TAU = Math.PI * 2;
const GOLD = '#E8C26A';
const CASTLE = placeById('castle');
const h01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ── ตัวช่วยวาด ────────────────────────────────────────────────
/** มงกุฎทอง (y = ฐานมงกุฎ · s = สเกล) */
function crown(c, x, y, s = 1) {
  c.fillStyle = lg(c, 0, y - 20 * s, 0, y, [[0, '#FFE58A'], [1, '#E3A11F']]);
  c.beginPath();
  c.moveTo(x - 14 * s, y); c.lineTo(x - 16 * s, y - 15 * s); c.lineTo(x - 7 * s, y - 8 * s); c.lineTo(x, y - 20 * s);
  c.lineTo(x + 7 * s, y - 8 * s); c.lineTo(x + 16 * s, y - 15 * s); c.lineTo(x + 14 * s, y); c.closePath(); c.fill();
  c.fillStyle = '#FFF6D0';
  for (const [dx, dy] of [[-16, -15], [0, -20], [16, -15]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s - 1.6 * s, 2.3 * s, 0, TAU); c.fill(); }
  c.fillStyle = '#C98A1E';
  c.fillRect(x - 14 * s, y - 3.5 * s, 28 * s, 3.5 * s);
  c.fillStyle = '#FF7FAE';
  c.beginPath(); c.arc(x, y - 8 * s, 2.8 * s, 0, TAU); c.fill();
  c.fillStyle = '#9FD3FF';
  for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * 8 * s, y - 6.5 * s, 1.9 * s, 0, TAU); c.fill(); }
}
/** อิฐหิน (แถวเหลื่อม) ในกรอบ */
function bricks(c, X, Y, W, Hh, a = 0.15) {
  c.save();
  c.beginPath(); c.rect(X, Y, W, Hh); c.clip();
  c.strokeStyle = `rgba(170,120,170,${a})`;
  c.lineWidth = 1;
  for (let yy = Y + 14, r = 0; yy < Y + Hh; yy += 14, r++) {
    c.beginPath(); c.moveTo(X, yy); c.lineTo(X + W, yy); c.stroke();
    for (let xx = X + (r % 2) * 15; xx < X + W; xx += 30) { c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, yy + 14); c.stroke(); }
  }
  c.restore();
}
/** ผนังหิน (ไล่สีแนวตั้ง) + อิฐ */
function wall(c, X, Y, W, Hh, top = '#FFF2F8', bot = '#EFD2E6') {
  c.fillStyle = lg(c, 0, Y, 0, Y + Hh, [[0, top], [1, bot]]);
  c.fillRect(X, Y, W, Hh);
  bricks(c, X, Y, W, Hh);
}
/** ตัวหอทรงกระบอก (เงาซ้าย สว่างกลาง) + อิฐ */
function drum(c, x0, x1, top, bot, tone = 0) {
  const A = tone ? ['#E3D0EC', '#F7EDF8', '#EAD7EE'] : ['#E6CFEB', '#FFF6FB', '#F3DEEE'];
  c.fillStyle = lg(c, x0, 0, x1, 0, [[0, A[0]], [0.58, A[1]], [1, A[2]]]);
  c.fillRect(x0, top, x1 - x0, bot - top);
  bricks(c, x0, top, x1 - x0, bot - top, tone ? 0.1 : 0.15);
}
/** ใบเสมา (เว้นช่องเท่ากัน จัดกลางช่วง x0..x1) */
function merlons(c, x0, x1, y, h = 13, mw = 16, gap = 12, col = '#FFF0F7') {
  const n = Math.max(1, Math.floor((x1 - x0 + gap) / (mw + gap)));
  const s = x0 + (x1 - x0 - (n * mw + (n - 1) * gap)) / 2;
  c.fillStyle = col;
  for (let i = 0; i < n; i++) { c.beginPath(); c.roundRect(s + i * (mw + gap), y - h, mw, h + 1, [3, 3, 0, 0]); c.fill(); }
}
/** หลังคากรวยโค้ง (ฐานกลาง x ที่ base · ครึ่งกว้าง half · สูง h) — เกล็ดกระเบื้อง ขอบทอง ระบายชมพู ลูกแก้วยอด */
function roof(c, x, base, half, h, cols = ['#8C6AD6', '#B79CF0', '#A586EA']) {
  const path = () => {
    c.beginPath();
    c.moveTo(x - half - 6, base);
    c.quadraticCurveTo(x - half * 0.3, base - h * 0.42, x, base - h);
    c.quadraticCurveTo(x + half * 0.3, base - h * 0.42, x + half + 6, base);
    c.closePath();
  };
  path();
  c.fillStyle = lg(c, x - half, 0, x + half, 0, [[0, cols[0]], [0.6, cols[1]], [1, cols[2]]]);
  c.fill();
  c.save();
  path(); c.clip();
  c.strokeStyle = 'rgba(255,255,255,.22)';
  c.lineWidth = 1;
  for (let yy = base - 7, r = 0; yy > base - h; yy -= 9, r++) {
    for (let xx = x - half - 10 + (r % 2) * 5; xx < x + half + 8; xx += 10) { c.beginPath(); c.arc(xx + 5, yy, 5, 0, Math.PI); c.stroke(); }
  }
  c.restore();
  c.fillStyle = GOLD;
  c.beginPath(); c.roundRect(x - half - 8, base - 3, 2 * half + 16, 5, 2.5); c.fill();
  c.fillStyle = '#FFB5CF';
  for (let xx = x - half - 3; xx <= x + half + 3; xx += 8) { c.beginPath(); c.arc(xx, base + 2, 3.2, 0, Math.PI); c.fill(); }
  c.fillStyle = '#F6D77A';
  c.beginPath(); c.arc(x, base - h - 1, 3.4, 0, TAU); c.fill();
}
/** หน้าต่างโค้งเรืองแสง (wx = กลาง · wy = ขอบบน) ขอบทอง ซี่กากบาท */
function win(c, wx, wy, w, h) {
  c.fillStyle = GOLD;
  c.beginPath(); c.roundRect(wx - w / 2 - 3, wy - 3, w + 6, h + 5, [w / 2 + 3, w / 2 + 3, 2, 2]); c.fill();
  c.fillStyle = lg(c, 0, wy, 0, wy + h, [[0, '#FFF6CF'], [1, '#FFC88E']]);
  c.beginPath(); c.roundRect(wx - w / 2, wy, w, h, [w / 2, w / 2, 1, 1]); c.fill();
  c.strokeStyle = 'rgba(176,110,60,.45)';
  c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(wx, wy + 3); c.lineTo(wx, wy + h); c.moveTo(wx - w / 2, wy + h * 0.55); c.lineTo(wx + w / 2, wy + h * 0.55); c.stroke();
}
/** กล่องดอกไม้ใต้หน้าต่าง */
function flowerBox(c, wx, y, w) {
  flowers(c, wx - w / 2 + 2, y - 3, Math.max(2, Math.round(w / 8)), ['#FF8FB3', '#FFFFFF', '#FFD45A']);
  c.fillStyle = '#C9A0E6';
  c.beginPath(); c.roundRect(wx - w / 2 - 4, y, w + 8, 7, 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)';
  c.fillRect(wx - w / 2 - 2, y + 1.5, w + 4, 1.6);
}
/** ธงยาวห้อยกำแพง (ปลายหางนกแซงแซว) — emblem: 'crown' | 'paw' */
function banner(c, bx, top, len, col, emblem) {
  c.fillStyle = col;
  c.beginPath(); c.moveTo(bx - 13, top); c.lineTo(bx + 13, top); c.lineTo(bx + 13, top + len); c.lineTo(bx, top + len - 11); c.lineTo(bx - 13, top + len); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.18)';
  c.fillRect(bx - 13, top, 6, len - 4);
  c.fillStyle = GOLD;
  c.fillRect(bx - 13, top + 4, 26, 2.5);
  c.fillRect(bx - 13, top + len - 22, 26, 2);
  c.beginPath(); c.roundRect(bx - 17, top - 3, 34, 5, 2.5); c.fill();
  const ey = top + len * 0.42;
  if (emblem === 'crown') crown(c, bx, ey + 7, 0.62);
  else {
    c.fillStyle = '#FFFFFF';
    c.beginPath(); c.ellipse(bx, ey + 3, 5, 4, 0, 0, TAU); c.fill();
    for (const [dx, dy] of [[-5, -4], [-2, -8], [2, -8], [5, -4]]) { c.beginPath(); c.arc(bx + dx, ey + 3 + dy, 1.9, 0, TAU); c.fill(); }
  }
}
/** แมวทองนั่ง (ซุ้มประตูเขต) — by = ฐานที่นั่ง · d = หันหน้าไปทาง */
function goldCat(c, x, by, d) {
  const G1 = '#F8DC86', G2 = '#D6A23A';
  c.strokeStyle = G2; c.lineWidth = 4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - d * 9, by - 4); c.quadraticCurveTo(x - d * 22, by - 8, x - d * 16, by - 26); c.stroke();
  c.fillStyle = lg(c, 0, by - 32, 0, by, [[0, G1], [1, G2]]);
  c.beginPath(); c.ellipse(x, by - 14, 12, 15, 0, 0, TAU); c.fill();
  ears(c, x + d * 2, by - 41, 6.5, 6.5, G1, '#FFF0C0');
  c.fillStyle = G1;
  c.beginPath(); c.arc(x + d * 2, by - 34, 10.5, 0, TAU); c.fill();
  catFace(c, x + d * 3, by - 33, 8.5, true, '#9C6A16');
  c.fillStyle = G1;
  for (const k of [-4.5, 4.5]) { c.beginPath(); c.ellipse(x + k, by - 2, 4.2, 3, 0, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,.7)';
  c.beginPath(); c.ellipse(x - 5, by - 20, 2.4, 5, 0.3, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(x - 2 + d * 2, by - 40, 2.6, 1.6, -0.4, 0, TAU); c.fill();
  // ผ้าพันคอชมพู + กระดิ่ง
  c.fillStyle = '#FF8FB3';
  c.beginPath(); c.ellipse(x + d * 1.5, by - 25, 9, 2.6, 0, 0, TAU); c.fill();
  c.fillStyle = '#FFE58A';
  c.beginPath(); c.arc(x + d * 3, by - 22.5, 2.3, 0, TAU); c.fill();
}

// ── ถนนหลวง + พรม (วาดต่อจาก drawGround · ก่อนท่าเรือ/ร้าน) ─────────
export function drawRealmGround(c, camX, vw) {
  // ถนนหลวงเริ่มที่ขอบนอกฐานเสาซ้ายของซุ้ม (กลางซุ้ม −120 −23) — ปูลอดใต้ซุ้มทั้งช่วง (ผู้ใช้ 31 ต.ค.)
  const g = REALM.gate - 143;
  const x0 = Math.max(g, camX - 10), x1 = Math.min(WORLD_W + 10, camX + vw + 10);
  if (x1 <= x0) return;
  c.fillStyle = lg(c, 0, GY, 0, ROAD_B, [[0, '#F5EAFC'], [1, '#E8D6F5']]);
  c.fillRect(x0, GY, x1 - x0, ROAD_B - 4 - GY);
  // กระเบื้องสองแถว สลับขาวมุก/ลาเวนเดอร์ + เม็ดทองตรงรอยต่อ
  const s0 = g + Math.floor((x0 - g) / 40) * 40;
  for (let x = s0; x < x1; x += 40) {
    const i = Math.round((x - g) / 40);
    for (let r = 0; r < 2; r++) {
      c.fillStyle = (i + r) % 2 ? 'rgba(255,255,255,.8)' : 'rgba(208,182,238,.55)';
      c.beginPath(); c.roundRect(x + (r % 2) * 20 + 3, GY + 8 + r * 22, 34, 16, 6); c.fill();
    }
    c.fillStyle = GOLD;
    c.beginPath(); c.arc(x + 1, GY + 27, 1.7, 0, TAU); c.fill();
  }
  c.fillStyle = GOLD;
  c.fillRect(x0, GY + 3, x1 - x0, 2);
  c.fillRect(x0, ROAD_B - 9, x1 - x0, 2);
  c.fillStyle = lg(c, 0, GY, 0, GY + 18, [[0, 'rgba(110,70,120,.16)'], [1, 'rgba(110,70,120,0)']]);
  c.fillRect(x0, GY, x1 - x0, 18);
  // ธรณีประตูเขต: แถบทองขวางถนนตรงต้นถนนหลวง (ใต้เสาซ้าย)
  if (g + 8 > camX - 10 && g - 8 < camX + vw + 10) {
    c.fillStyle = lg(c, g - 7, 0, g + 7, 0, [[0, '#E3A11F'], [0.5, '#FFE58A'], [1, '#E3A11F']]);
    c.beginPath(); c.moveTo(g - 6, GY); c.lineTo(g + 6, GY); c.lineTo(g + 8, ROAD_B - 4); c.lineTo(g - 8, ROAD_B - 4); c.closePath(); c.fill();
    c.fillStyle = '#FF8FB3';
    for (const y of [GY + 14, GY + 34]) { heart(c, g, y, 3.4); c.fill(); }
  }
  // พรมชมพูขอบทองจากประตูปราสาทลงถนน (กว้างขึ้นเมื่อเข้าหาตา)
  const d = CASTLE.door;
  if (d + 70 > camX - 10 && d - 70 < camX + vw + 10) {
    const rug = (a, b, y0, y1) => { c.beginPath(); c.moveTo(d - a, y0); c.lineTo(d + a, y0); c.lineTo(d + b, y1); c.lineTo(d - b, y1); c.closePath(); };
    c.fillStyle = GOLD;
    rug(50, 66, GY - 2, ROAD_B - 4); c.fill();
    c.fillStyle = lg(c, 0, GY, 0, ROAD_B, [[0, '#FF9CC0'], [1, '#EE6E9E']]);
    rug(45, 60, GY - 2, ROAD_B - 6); c.fill();
    c.fillStyle = 'rgba(255,255,255,.4)';
    for (const [dx, y] of [[-16, GY + 14], [14, GY + 26], [-12, GY + 40]]) {
      c.beginPath(); c.ellipse(d + dx, y + 2, 3.4, 2.4, 0, 0, TAU); c.fill();
      for (const [px, py] of [[-3.4, -2.6], [-1.2, -4.4], [1.2, -4.4], [3.4, -2.6]]) { c.beginPath(); c.arc(d + dx + px, y + 2 + py, 1.2, 0, TAU); c.fill(); }
    }
    c.strokeStyle = GOLD; c.lineWidth = 1.6;
    for (let i = -6; i <= 6; i++) { const fx = d + i * 10; c.beginPath(); c.moveTo(fx, ROAD_B - 5); c.lineTo(fx, ROAD_B); c.stroke(); }
  }
}

// ── ซุ้มประตูเขต ─────────────────────────────────────────────
function drawRealmGate(c) {
  const g = REALM.gate;
  c.fillStyle = 'rgba(80,40,110,.16)';
  c.beginPath(); c.ellipse(g, GY + 5, 160, 8, 0, 0, TAU); c.fill();
  // บานประตูเหล็กดัดเปิดแนบเสา
  for (const d of [-1, 1]) {
    const a = g + d * 103, b = g + d * 81;
    c.strokeStyle = '#A98AE8'; c.lineWidth = 2.4; c.lineCap = 'round';
    for (let i = 0; i <= 3; i++) { const bx = a + (b - a) * (i / 3); c.beginPath(); c.moveTo(bx, GY - 2); c.lineTo(bx, GY - 104 + i * 4); c.stroke(); }
    c.lineWidth = 3;
    for (const y of [GY - 92, GY - 54, GY - 14]) { c.beginPath(); c.moveTo(a, y); c.lineTo(b, y + 3); c.stroke(); }
    c.fillStyle = GOLD;
    for (let i = 0; i <= 3; i++) { const bx = a + (b - a) * (i / 3); heart(c, bx, GY - 108 + i * 4, 3); c.fill(); }
  }
  // คานป้าย (ปลายสอดหลังเสา) + หัวแมวโค้งกลาง
  c.fillStyle = '#C9A0E6';
  c.beginPath(); c.ellipse(g, GY - 178, 54, 32, 0, Math.PI, TAU); c.fill();
  c.fillStyle = lg(c, 0, GY - 206, 0, GY - 178, [[0, '#FFF6FB'], [1, '#F0DDF6']]);
  c.beginPath(); c.ellipse(g, GY - 178, 50, 28, 0, Math.PI, TAU); c.fill();
  ears(c, g, GY - 200, 34, 13, '#C9A0E6', '#FFD3E3');
  c.fillStyle = GOLD;
  c.beginPath(); c.arc(g, GY - 190, 12, 0, TAU); c.fill();
  c.fillStyle = '#FFF6DA';
  c.beginPath(); c.arc(g, GY - 190, 10, 0, TAU); c.fill();
  catFace(c, g, GY - 189, 8.5, true, '#B88A2A');
  crown(c, g, GY - 206, 0.9);
  c.fillStyle = GOLD;
  c.beginPath(); c.roundRect(g - 122, GY - 180, 244, 36, 10); c.fill();
  c.fillStyle = '#FFF9EC';
  c.beginPath(); c.roundRect(g - 119, GY - 177, 238, 30, 8); c.fill();
  c.fillStyle = '#C9A0E6';
  c.beginPath(); c.roundRect(g - 119, GY - 177, 238, 7, [8, 8, 0, 0]); c.fill();
  c.font = '700 14px Mali, sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#7A4BB8';
  c.fillText('ดินแดนปราสาทแมวเหมียว', g, GY - 158);
  // พวงมาลัยดอกไม้ใต้คาน
  const sw = (u) => [g - 103 + 206 * u, GY - 144 + 2 * u * (1 - u) * 44];
  c.strokeStyle = '#8FD08A'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(g - 103, GY - 144); c.quadraticCurveTo(g, GY - 100, g + 103, GY - 144); c.stroke();
  for (let i = 0; i <= 18; i++) {
    const [fx, fy] = sw(i / 18);
    c.fillStyle = ['#FF8FB3', '#FFFFFF', '#FFD45A', '#C8A8F5'][i % 4];
    c.beginPath(); c.arc(fx, fy, i % 2 ? 3.2 : 4, 0, TAU); c.fill();
  }
  // เสาหินคู่ (ทรงกระบอก ร่องเสา แหวนทอง เถากุหลาบ) + แมวทองบนยอด
  for (const d of [-1, 1]) {
    const px = g + d * 120;
    c.fillStyle = lg(c, 0, GY - 26, 0, GY, [[0, '#F7ECFB'], [1, '#D9C2EE']]);
    c.beginPath(); c.roundRect(px - 23, GY - 26, 46, 26, [4, 4, 0, 0]); c.fill();
    c.fillStyle = lg(c, px - 17, 0, px + 17, 0, [[0, '#E1CDF1'], [0.55, '#FFFFFF'], [1, '#E6D4F3']]);
    c.fillRect(px - 17, GY - 170, 34, 144);
    c.strokeStyle = 'rgba(160,130,210,.3)'; c.lineWidth = 1;
    for (const dx of [-9, 0, 9]) { c.beginPath(); c.moveTo(px + dx, GY - 160); c.lineTo(px + dx, GY - 32); c.stroke(); }
    c.fillStyle = GOLD;
    c.fillRect(px - 18, GY - 40, 36, 4); c.fillRect(px - 18, GY - 160, 36, 4);
    c.fillStyle = '#F7EEFF';
    c.beginPath(); c.roundRect(px - 23, GY - 182, 46, 13, 3); c.fill();
    c.fillStyle = GOLD;
    c.fillRect(px - 23, GY - 171, 46, 2.5);
    // เถากุหลาบพันเสา
    for (let i = 0; i < 7; i++) {
      const y = GY - 34 - i * 18, rx = px + Math.sin(i * 1.4 + d) * 13;
      c.fillStyle = '#86C98A';
      c.beginPath(); c.ellipse(rx - 4, y + 4, 4, 2.2, -0.5, 0, TAU); c.fill();
      c.fillStyle = i % 2 ? '#FF8FB3' : '#FFC4DC';
      c.beginPath(); c.arc(rx, y, 3.6, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.6)';
      c.beginPath(); c.arc(rx - 1, y - 1, 1.2, 0, TAU); c.fill();
    }
    goldCat(c, px, GY - 182, -d);
  }
}

// ── รั้ว + สวนหลวงหลังรั้ว ────────────────────────────────────
function sakura(c, x) {
  c.fillStyle = '#A97B5A';
  c.beginPath(); c.moveTo(x - 5, GY - 20); c.lineTo(x - 3, GY - 104); c.lineTo(x + 3, GY - 104); c.lineTo(x + 5, GY - 20); c.closePath(); c.fill();
  c.fillStyle = '#FFC4DC';
  c.beginPath(); c.arc(x, GY - 128, 30, 0, TAU); c.arc(x - 26, GY - 108, 22, 0, TAU); c.arc(x + 26, GY - 108, 22, 0, TAU); c.arc(x, GY - 100, 20, 0, TAU); c.fill();
  c.fillStyle = '#FFE0EE';
  for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(x - 30 + h01(x + i) * 60, GY - 140 + h01(x * 3 + i) * 40, 3.2, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,.3)';
  c.beginPath(); c.arc(x - 10, GY - 140, 11, 0, TAU); c.fill();
}
function topcat(c, x) {
  const G = '#86C98A', L = '#A6DDA0';
  c.fillStyle = G;
  c.beginPath(); c.ellipse(x, GY - 46, 22, 26, 0, 0, TAU); c.fill();
  c.strokeStyle = G; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x + 16, GY - 32); c.quadraticCurveTo(x + 36, GY - 40, x + 30, GY - 66); c.stroke();
  ears(c, x, GY - 100, 11, 10, G, L);
  c.fillStyle = G;
  c.beginPath(); c.arc(x, GY - 86, 18, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.25)';
  c.beginPath(); c.arc(x - 7, GY - 93, 6, 0, TAU); c.fill();
  c.beginPath(); c.arc(x - 8, GY - 56, 8, 0, TAU); c.fill();
  // โบว์ชมพูที่คอ
  c.fillStyle = '#FF8FB3';
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x, GY - 68); c.lineTo(x + d * 9, GY - 73); c.lineTo(x + d * 9, GY - 63); c.closePath(); c.fill(); }
  c.beginPath(); c.arc(x, GY - 68, 2.6, 0, TAU); c.fill();
}
function cone(c, x) {
  c.fillStyle = '#7FC48A';
  c.beginPath(); c.moveTo(x - 17, GY - 30); c.quadraticCurveTo(x - 10, GY - 80, x, GY - 122); c.quadraticCurveTo(x + 10, GY - 80, x + 17, GY - 30); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 2;
  for (const y of [GY - 50, GY - 74, GY - 98]) { c.beginPath(); c.moveTo(x - 12 + (GY - y) * 0.06, y + 4); c.quadraticCurveTo(x, y - 4, x + 12 - (GY - y) * 0.06, y + 4); c.stroke(); }
  c.fillStyle = '#FFD45A';
  star(c, x, GY - 124, 5); c.fill();
}
const GARDEN = { sakura, topcat, cone };
/** รั้วช่วง a..b (แคชเป็นท่อน ๆ) — สวนหลวงข้างหลัง → พุ่มไม้ดอก → ซี่เหล็กดัด → เสาหินหัวแมวทอง */
function drawFencePiece(c, a, b, x0, x1) {
  for (const [k, gx] of REALM.garden) if (gx > x0 - 50 && gx < x1 + 50) GARDEN[k](c, gx);
  // พุ่มไม้ดอกแนวหลังรั้ว
  c.fillStyle = '#93D392';
  c.fillRect(Math.max(a, x0 - 4), GY - 26, Math.min(b, x1 + 4) - Math.max(a, x0 - 4), 26);
  for (let x = Math.floor(Math.max(a, x0 - 14) / 14) * 14; x < Math.min(b, x1 + 14); x += 14) {
    if (x < a - 4 || x > b + 4) continue;
    c.fillStyle = '#93D392';
    c.beginPath(); c.arc(x + 7, GY - 26 - (Math.abs(x / 14) % 2) * 4, 12, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.18)';
    c.beginPath(); c.arc(x + 4, GY - 32 - (Math.abs(x / 14) % 2) * 4, 4, 0, TAU); c.fill();
    if (Math.abs(x / 14) % 3 === 0) {
      c.fillStyle = ['#FF8FB3', '#FFFFFF', '#FFD45A'][Math.abs(x / 42) % 3];
      c.beginPath(); c.arc(x + 9, GY - 30, 2.6, 0, TAU); c.fill();
    }
  }
  // ซี่เหล็กดัด (ยอดลูกแก้วทอง · ทุกซี่ที่สามสูงกว่า ยอดหัวใจทอง) + ราวสองเส้น + ห่วงทองแถวล่าง
  const s = Math.ceil(Math.max(a + 6, x0 - 12) / 12) * 12;
  for (let x = s; x < Math.min(b - 4, x1 + 12); x += 12) {
    const tall = (x / 12) % 3 === 0, top = tall ? GY - 80 : GY - 70;
    c.fillStyle = lg(c, x - 1.6, 0, x + 1.6, 0, [[0, '#9C80DD'], [1, '#C4ADF2']]);
    c.fillRect(x - 1.6, top, 3.2, GY - top);
    c.fillStyle = GOLD;
    if (tall) { heart(c, x, top - 2, 4); c.fill(); }
    else { c.beginPath(); c.arc(x, top - 1.5, 2.6, 0, TAU); c.fill(); }
    c.strokeStyle = GOLD; c.lineWidth = 1.2;
    c.beginPath(); c.arc(x + 6, GY - 36, 3.4, 0, TAU); c.stroke();
  }
  c.fillStyle = '#A98AE8';
  for (const y of [GY - 58, GY - 16]) { c.beginPath(); c.roundRect(Math.max(a, x0 - 4), y, Math.min(b, x1 + 4) - Math.max(a, x0 - 4), 4, 2); c.fill(); }
  c.fillStyle = GOLD;
  c.fillRect(Math.max(a, x0 - 4), GY - 57, Math.min(b, x1 + 4) - Math.max(a, x0 - 4), 1.2);
  // เสาหิน: ปลายรั้วสองข้าง + ทุก ~150
  const n = Math.max(1, Math.round((b - a) / 150));
  for (let i = 0; i <= n; i++) {
    const px = a + ((b - a) * i) / n;
    if (px < x0 - 30 || px > x1 + 30) continue;
    c.fillStyle = lg(c, px - 11, 0, px + 11, 0, [[0, '#E3D0F2'], [0.55, '#FFFFFF'], [1, '#E6D4F3']]);
    c.fillRect(px - 11, GY - 90, 22, 90);
    c.fillStyle = '#F7EEFF';
    c.beginPath(); c.roundRect(px - 14, GY - 96, 28, 8, 2.5); c.fill();
    c.fillStyle = GOLD;
    c.fillRect(px - 14, GY - 89, 28, 2); c.fillRect(px - 12, GY - 20, 24, 2.5);
    ears(c, px, GY - 108, 5.5, 5.5, '#F6D77A', '#FFF0C0');
    c.fillStyle = '#F6D77A';
    c.beginPath(); c.arc(px, GY - 103, 8, 0, TAU); c.fill();
    catFace(c, px, GY - 102, 6.5, true, '#A8741E');
    c.fillStyle = '#FF8FB3';
    heart(c, px, GY - 56, 4.5); c.fill();
  }
}

// ── โคมหลวง ────────────────────────────────────────────────────
function drawRoyalLamp(c, x, i) {
  c.fillStyle = 'rgba(80,40,110,.16)';
  c.beginPath(); c.ellipse(x, GY + 3, 16, 3.5, 0, 0, TAU); c.fill();
  c.fillStyle = '#7A5BB0';
  c.beginPath(); c.roundRect(x - 10, GY - 9, 20, 9, [4, 4, 0, 0]); c.fill();
  c.fillStyle = lg(c, x - 3, 0, x + 3, 0, [[0, '#6E4CB8'], [0.5, '#9C80DD'], [1, '#6E4CB8']]);
  c.fillRect(x - 3, GY - 132, 6, 124);
  c.fillStyle = GOLD;
  for (const y of [GY - 30, GY - 100]) c.fillRect(x - 4.5, y, 9, 3);
  // แขนห้อยธง
  c.strokeStyle = GOLD; c.lineWidth = 2.4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, GY - 112); c.lineTo(x + 24, GY - 112); c.quadraticCurveTo(x + 30, GY - 112, x + 28, GY - 120); c.stroke();
  banner(c, x + 15, GY - 109, 46, i % 2 ? '#B79CF0' : '#FF8FB3', i % 2 ? 'crown' : 'paw');
  // ตัวโคม (กระจกเรือง ขอบทอง ยอดมงกุฎ)
  c.fillStyle = GOLD;
  c.beginPath(); c.moveTo(x - 11, GY - 132); c.lineTo(x + 11, GY - 132); c.lineTo(x + 8, GY - 126); c.lineTo(x - 8, GY - 126); c.closePath(); c.fill();
  c.fillStyle = lg(c, 0, GY - 152, 0, GY - 132, [[0, '#FFF6CF'], [1, '#FFD08E']]);
  c.beginPath(); c.roundRect(x - 8, GY - 152, 16, 21, 3); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 1.6;
  c.beginPath(); c.roundRect(x - 8, GY - 152, 16, 21, 3); c.moveTo(x, GY - 152); c.lineTo(x, GY - 131); c.stroke();
  crown(c, x, GY - 151, 0.55);
}

// ── ตัวปราสาท ────────────────────────────────────────────────
// เรขาคณิตร่วม (ภาพนิ่ง + ของสด) — ตัวเลขผิวยืนใน layout.js ต้องตรงกับชุดนี้
function geo() {
  const { x, w } = CASTLE, cx = x + w / 2;
  return {
    x, w, cx,
    wallTop: GY - 180,
    corners: [x + 52, x + w - 52],         // หอมุม (กว้าง 104) · ตัวหอถึง GY-226 · หลังคาสูง 70
    backs: [cx - 196, cx + 196],           // หอหลัง (กว้าง 60) · ถึง GY-226 · หลังคาสูง 62
    turrets: [cx - 112, cx + 112],         // ป้อมแขวนข้างป้อมประตู (กว้าง 32) · ถึง GY-250 · หลังคาสูง 44
    guards: [cx - 168, cx + 168],          // รูปปั้นองครักษ์บนแท่น (แท่นกว้าง ±22)
    gw: 124, gh: 150,                      // ประตูใหญ่
  };
}
/** หน้าต่างทั้งหมด { x กลาง, y ขอบบน, w, h, k: 'corner'|'back'|'wall' } — ภาพนิ่งวาดกรอบ · ของสดวาดแสงเรือง */
function castleWindows() {
  const { cx, corners, backs } = geo();
  const W = [];
  for (const x of corners) W.push({ x, y: GY - 200, w: 22, h: 32, k: 'corner' }, { x, y: GY - 122, w: 18, h: 28, k: 'corner' });
  for (const x of backs) W.push({ x, y: GY - 220, w: 14, h: 22, k: 'back' });
  for (const d of [-1, 1]) for (const o of [148, 246]) W.push({ x: cx + d * o, y: GY - 156, w: 20, h: 30, k: 'wall' });
  return W;
}
function drawCastleArt(c) {
  const { x, w, cx, wallTop, corners, backs, turrets, guards, gw, gh } = geo();
  // เงาบนถนน
  c.fillStyle = 'rgba(80,40,110,.16)';
  c.beginPath(); c.ellipse(cx, GY + 5, w * 0.54, 10, 0, 0, TAU); c.fill();
  // ── หอหลังสองหอ (ไกลกว่า สีจางกว่า) ──
  for (const bx of backs) {
    drum(c, bx - 30, bx + 30, GY - 226, GY - 150, 1);
    roof(c, bx, GY - 226, 30, 62, ['#9C86DA', '#C2ABF2', '#AE97EA']);
  }
  // ── หอกลาง + โดมหูแมว + มงกุฎ ──
  drum(c, cx - 88, cx + 88, GY - 268, GY - 170, 1);
  c.fillStyle = GOLD;
  c.fillRect(cx - 90, GY - 236, 180, 3);
  for (const d of [-1, 1]) {
    c.fillStyle = GOLD; c.beginPath(); c.arc(cx + d * 70, GY - 248, 8, 0, TAU); c.fill();
    c.fillStyle = '#FFE9B0'; c.beginPath(); c.arc(cx + d * 70, GY - 248, 6, 0, TAU); c.fill();
    c.fillStyle = '#FF9CC0'; heart(c, cx + d * 70, GY - 248, 3); c.fill();
  }
  ears(c, cx, GY - 292, 56, 17, '#9C7FE0', '#FFC9D4');
  c.fillStyle = lg(c, cx - 92, 0, cx + 92, 0, [[0, '#8C6AD6'], [0.62, '#C0A6F4'], [1, '#A586EA']]);
  c.beginPath(); c.ellipse(cx, GY - 266, 92, 36, 0, Math.PI, TAU); c.fill();
  c.strokeStyle = 'rgba(255,230,150,.75)'; c.lineWidth = 1.4;
  for (const r of [30, 62]) { c.beginPath(); c.ellipse(cx, GY - 266, r, 36, 0, Math.PI, TAU); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.25)';
  c.beginPath(); c.ellipse(cx + 26, GY - 288, 22, 6, -0.2, 0, TAU); c.fill();
  c.fillStyle = GOLD;
  c.beginPath(); c.roundRect(cx - 95, GY - 269, 190, 5, 2.5); c.fill();
  crown(c, cx, GY - 300, 1.05);
  // ── กำแพงหน้า + ใบเสมา + แถบทอง ──
  wall(c, x + 80, wallTop, w - 160, GY - wallTop);
  merlons(c, x + 104, cx - 100, wallTop);
  merlons(c, cx + 100, x + w - 104, wallTop);
  c.fillStyle = GOLD;
  c.fillRect(x + 80, wallTop, w - 160, 3);
  c.fillRect(x + 80, GY - 34, w - 160, 2.5);
  // หน้าต่างกำแพง + กล่องดอกไม้ · ธงยาวใต้หอหลัง
  for (const o of castleWindows()) if (o.k === 'wall') { win(c, o.x, o.y, o.w, o.h); flowerBox(c, o.x, o.y + o.h + 3, o.w); }
  backs.forEach((bx, i) => banner(c, bx, wallTop + 6, 72, i ? '#FF8FB3' : '#A586EA', i ? 'paw' : 'crown'));
  // ── ป้อมแขวนสองข้างป้อมประตู ──
  for (const tx of turrets) {
    drum(c, tx - 16, tx + 16, GY - 250, GY - 130);
    c.fillStyle = lg(c, tx - 16, 0, tx + 16, 0, [[0, '#E6CFEB'], [0.58, '#FFF6FB'], [1, '#F3DEEE']]);
    c.beginPath(); c.moveTo(tx - 16, GY - 130); c.lineTo(tx + 16, GY - 130); c.lineTo(tx, GY - 106); c.closePath(); c.fill();
    c.fillStyle = GOLD;
    c.fillRect(tx - 17, GY - 132, 34, 3);
    c.fillStyle = '#6E4CB8';
    c.beginPath(); c.roundRect(tx - 3, GY - 214, 6, 18, 3); c.fill();
    roof(c, tx, GY - 250, 18, 44, ['#8C6AD6', '#B79CF0', '#A586EA']);
  }
  // ── ป้อมประตู + หน้าจั่วโค้งตราโล่ ──
  wall(c, cx - 100, GY - 224, 200, 224, '#FFF6FB', '#F2D6E9');
  merlons(c, cx - 100, cx - 52, GY - 224, 12, 14, 10);
  merlons(c, cx + 52, cx + 100, GY - 224, 12, 14, 10);
  c.fillStyle = lg(c, 0, GY - 264, 0, GY - 224, [[0, '#FFFFFF'], [1, '#F3E0F3']]);
  c.beginPath(); c.ellipse(cx, GY - 224, 52, 40, 0, Math.PI, TAU); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 2.4;
  c.beginPath(); c.ellipse(cx, GY - 224, 51, 39, 0, Math.PI, TAU); c.stroke();
  c.fillStyle = GOLD;
  c.fillRect(cx - 100, GY - 226, 200, 3);
  // ตราโล่หน้าแมว
  const sy = GY - 232;
  c.fillStyle = '#E7B640';
  c.beginPath(); c.moveTo(cx - 24, sy - 20); c.lineTo(cx + 24, sy - 20); c.lineTo(cx + 24, sy + 6); c.quadraticCurveTo(cx, sy + 30, cx - 24, sy + 6); c.closePath(); c.fill();
  c.fillStyle = '#8C6AD6';
  c.beginPath(); c.moveTo(cx - 19, sy - 15); c.lineTo(cx + 19, sy - 15); c.lineTo(cx + 19, sy + 4); c.quadraticCurveTo(cx, sy + 24, cx - 19, sy + 4); c.closePath(); c.fill();
  ears(c, cx, sy - 5, 7.5, 6, '#FFF4FA', '#FFC9D4');
  c.fillStyle = '#FFF4FA';
  c.beginPath(); c.arc(cx, sy + 3, 11, 0, TAU); c.fill();
  catFace(c, cx, sy + 4, 9.5, true, '#6E4CB8');
  crown(c, cx, sy - 20, 0.62);
  // ── ประตูใหญ่: ขอบหินโค้ง → ขอบทอง → ช่องแสงพัด + บานคู่ ──
  const spring = GY - gh + gw / 2;
  const arch = (r) => { c.beginPath(); c.moveTo(cx - gw / 2 - r, GY); c.lineTo(cx - gw / 2 - r, spring); c.arc(cx, spring, gw / 2 + r, Math.PI, 0); c.lineTo(cx + gw / 2 + r, GY); c.closePath(); };
  c.fillStyle = '#EBDDFB';
  arch(16); c.fill();
  c.strokeStyle = 'rgba(150,120,200,.35)'; c.lineWidth = 1;
  for (let i = 1; i < 11; i++) {
    const a = Math.PI + (i / 11) * Math.PI;
    c.beginPath(); c.moveTo(cx + Math.cos(a) * (gw / 2 + 5), spring + Math.sin(a) * (gw / 2 + 5)); c.lineTo(cx + Math.cos(a) * (gw / 2 + 16), spring + Math.sin(a) * (gw / 2 + 16)); c.stroke();
  }
  c.fillStyle = GOLD;
  arch(5); c.fill();
  c.save();
  arch(0); c.clip();
  c.fillStyle = lg(c, 0, GY - gh, 0, spring, [[0, '#FFF6D2'], [1, '#FFC98E']]);
  c.fillRect(cx - gw / 2, GY - gh, gw, gw / 2 + 2);
  c.strokeStyle = GOLD; c.lineWidth = 2;
  for (let i = 1; i < 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    c.beginPath(); c.moveTo(cx + Math.cos(a) * 16, spring + Math.sin(a) * 16); c.lineTo(cx + Math.cos(a) * gw, spring + Math.sin(a) * gw); c.stroke();
  }
  c.beginPath(); c.arc(cx, spring, 16, Math.PI, TAU); c.stroke();
  c.beginPath(); c.arc(cx, spring, 40, Math.PI, TAU); c.stroke();
  c.fillStyle = '#FF8FB3';
  heart(c, cx, spring - 7, 6); c.fill();
  // บานประตูคู่
  c.fillStyle = lg(c, 0, spring, 0, GY, [[0, '#B98AE2'], [1, '#8350BE']]);
  c.fillRect(cx - gw / 2, spring, gw, GY - spring);
  c.strokeStyle = 'rgba(70,30,110,.25)'; c.lineWidth = 1.2;
  for (let px = cx - gw / 2 + 15; px < cx + gw / 2; px += 15.5) { c.beginPath(); c.moveTo(px, spring + 4); c.lineTo(px, GY); c.stroke(); }
  c.strokeStyle = 'rgba(60,20,100,.55)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(cx, spring); c.lineTo(cx, GY); c.stroke();
  c.fillStyle = GOLD;
  c.fillRect(cx - gw / 2, spring - 2, gw, 5);
  for (const y of [spring + 16, GY - 24]) {
    c.fillRect(cx - gw / 2, y, gw, 4);
    c.fillStyle = '#FFE58A';
    for (let px = cx - gw / 2 + 8; px < cx + gw / 2; px += 14) { c.beginPath(); c.arc(px, y + 2, 1.6, 0, TAU); c.fill(); }
    c.fillStyle = GOLD;
  }
  c.strokeStyle = GOLD; c.lineWidth = 2.2;
  for (const d of [-1, 1]) {
    c.beginPath(); c.arc(cx + d * 11, GY - 50, 6, 0, TAU); c.stroke();
    c.fillStyle = GOLD; heart(c, cx + d * 11, GY - 58, 3.4); c.fill();
  }
  c.restore();
  // หินหน้าแมวกลางโค้ง
  c.fillStyle = '#F7EEFF';
  c.beginPath(); c.moveTo(cx - 13, GY - gh - 18); c.lineTo(cx + 13, GY - gh - 18); c.lineTo(cx + 9, GY - gh + 4); c.lineTo(cx - 9, GY - gh + 4); c.closePath(); c.fill();
  c.fillStyle = GOLD;
  c.beginPath(); c.arc(cx, GY - gh - 6, 8.5, 0, TAU); c.fill();
  c.fillStyle = '#FFF6DA';
  c.beginPath(); c.arc(cx, GY - gh - 6, 7, 0, TAU); c.fill();
  catFace(c, cx, GY - gh - 5, 6, true, '#B88A2A');
  plaque(c, cx, GY - 190, CASTLE.name, { bg: '#FFF9EC', ink: '#7A4BB8', edge: GOLD, shape: 'ribbon', size: 15 });
  plaque(c, cx, GY - 58, 'เปิดเร็ว ๆ นี้', { bg: '#FFF9EC', ink: '#8A4BB8', edge: '#E7B640', shape: 'round', size: 12 });
  // บันไดหน้าประตู
  for (const [hw, y0, y1] of [[gw / 2 + 30, GY - 6, GY + 2], [gw / 2 + 20, GY - 12, GY - 6]]) {
    c.fillStyle = lg(c, 0, y0, 0, y1, [[0, '#FFFFFF'], [1, '#E2D0F2']]);
    c.beginPath(); c.roundRect(cx - hw, y0, hw * 2, y1 - y0, 2); c.fill();
    c.fillStyle = GOLD; c.fillRect(cx - hw, y0, hw * 2, 1.4);
  }
  // ── หอมุมใหญ่สองหอ ──
  for (const tx of corners) {
    drum(c, tx - 52, tx + 52, GY - 226, GY);
    c.fillStyle = '#F7EEFF';
    c.beginPath(); c.roundRect(tx - 57, GY - 232, 114, 9, 3); c.fill();
    c.fillStyle = GOLD;
    c.fillRect(tx - 57, GY - 224, 114, 2.5); c.fillRect(tx - 52, GY - 36, 104, 2.5);
    roof(c, tx, GY - 232, 56, 70);
    c.fillStyle = '#6E4CB8';
    for (const sx of [tx - 30, tx + 30]) { c.beginPath(); c.roundRect(sx - 3, GY - 170, 6, 20, 3); c.fill(); }
  }
  for (const o of castleWindows()) {
    if (o.k === 'corner') { win(c, o.x, o.y, o.w, o.h); if (o.w > 20) flowerBox(c, o.x, o.y + o.h + 3, o.w); }
    else if (o.k === 'back') win(c, o.x, o.y, o.w, o.h);
  }
  // หัวใจกลางหอมุม
  for (const tx of corners) { c.fillStyle = '#FF9CC0'; heart(c, tx, GY - 66, 9); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(tx - 3, GY - 69, 2, 0, TAU); c.fill(); }
  // ── รูปปั้นแมวองครักษ์บนแท่น (หันออกจากประตู) ──
  guards.forEach((gx, i) => guard(c, gx, i ? 1 : -1));
  // พุ่มไม้ดอกโคนกำแพง
  for (const [bx, s] of [[x + 118, 15], [cx - 232, 13], [cx + 232, 13], [x + w - 118, 15]]) {
    bush(c, bx, GY, s, '#A6DDA0');
    flowers(c, bx - 10, GY - s * 1.25, 3, ['#FF8FB3', '#FFFFFF', '#FFD45A']);
  }
}
/** รูปปั้นแมวหินอ่อนสวมมงกุฎ ผ้าคลุมชมพู บนแท่น — d = หันไปทาง */
function guard(c, x, d) {
  c.fillStyle = lg(c, 0, GY - 50, 0, GY, [[0, '#FBF4FF'], [1, '#DCC8EE']]);
  c.beginPath(); c.roundRect(x - 18, GY - 44, 36, 44, 3); c.fill();
  c.fillStyle = '#F7EEFF';
  c.beginPath(); c.roundRect(x - 22, GY - 50, 44, 8, 3); c.fill();
  c.fillStyle = GOLD;
  c.fillRect(x - 22, GY - 43, 44, 2); c.fillRect(x - 18, GY - 9, 36, 2);
  c.fillStyle = '#C9A0E6';
  c.beginPath(); c.ellipse(x, GY - 22, 4.5, 3.6, 0, 0, TAU); c.fill();
  for (const [dx, dy] of [[-4.5, -3.6], [-1.6, -6.6], [1.6, -6.6], [4.5, -3.6]]) { c.beginPath(); c.arc(x + dx, GY - 22 + dy, 1.7, 0, TAU); c.fill(); }
  const by = GY - 50, M = '#F7F0FF', MS = '#E0D0F4';
  c.strokeStyle = MS; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - d * 10, by - 4); c.quadraticCurveTo(x - d * 26, by - 10, x - d * 20, by - 32); c.stroke();
  c.fillStyle = '#FF8FB3';
  c.beginPath(); c.moveTo(x - 11, by - 38); c.quadraticCurveTo(x - 19, by - 18, x - 17, by - 3); c.lineTo(x + 17, by - 3); c.quadraticCurveTo(x + 19, by - 18, x + 11, by - 38); c.closePath(); c.fill();
  c.fillStyle = GOLD;
  c.fillRect(x - 17, by - 5, 34, 2.4);
  c.fillStyle = lg(c, 0, by - 36, 0, by, [[0, M], [1, MS]]);
  c.beginPath(); c.ellipse(x + d * 1, by - 18, 11, 17, 0, 0, TAU); c.fill();
  for (const k of [-4.5, 4.5]) { c.fillStyle = M; c.beginPath(); c.ellipse(x + d * 2 + k, by - 2, 4.4, 3.2, 0, 0, TAU); c.fill(); }
  ears(c, x + d * 2, by - 53, 7, 7.5, M, '#FFD3E3');
  c.fillStyle = M;
  c.beginPath(); c.arc(x + d * 2, by - 44, 12, 0, TAU); c.fill();
  catFace(c, x + d * 3, by - 43, 10, true, '#9C80D8');
  c.fillStyle = GOLD;
  c.beginPath(); c.ellipse(x + d * 1.5, by - 33, 7, 2.6, 0, 0, TAU); c.fill();
  crown(c, x + d * 2, by - 54, 0.52);
}

// ── ของสด: ธงโบก · แสงหน้าต่าง/โคม · ประกายรอบมงกุฎ · ละอองดาวลอยขึ้น ──
function flag(c, fx, fy, t, col) {
  c.strokeStyle = '#8A6BC8'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy - 16); c.stroke();
  const s = Math.sin(t * 0.09 + fx) * 2.5, s2 = Math.sin(t * 0.09 + fx + 1.4) * 2;
  c.fillStyle = col;
  c.beginPath(); c.moveTo(fx + 1, fy - 16); c.quadraticCurveTo(fx + 10, fy - 15 + s, fx + 19, fy - 11 + s2); c.quadraticCurveTo(fx + 10, fy - 7 + s, fx + 1, fy - 5); c.closePath(); c.fill();
}
function glow(c, x, y, r, a) {
  const g = c.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, `rgba(255,236,170,${a})`);
  g.addColorStop(1, 'rgba(255,236,170,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
function drawCastleLive(c, t) {
  const { cx, w, corners, backs, turrets } = geo();
  for (const tx of corners) flag(c, tx, GY - 304, t, '#FF7EB0');
  for (const bx of backs) flag(c, bx, GY - 290, t, '#B79CF0');
  for (const tx of turrets) flag(c, tx, GY - 296, t, '#FFD45A');
  c.save();
  castleWindows().forEach((o, i) => glow(c, o.x, o.y + o.h * 0.5, o.w * 1.4, 0.28 + 0.1 * Math.sin(t * 0.05 + i * 1.7)));
  glow(c, cx, GY - 112, 70, 0.16 + 0.05 * Math.sin(t * 0.04));
  // ประกายรอบมงกุฎโดม
  for (let i = 0; i < 4; i++) {
    const a = Math.max(0, Math.sin(t * 0.07 + i * 1.6));
    if (a < 0.08) continue;
    c.globalAlpha = a;
    c.fillStyle = '#FFFFFF';
    star(c, cx + [-22, 20, -12, 26][i], GY - [316, 312, 296, 300][i], 2 + a * 2.4); c.fill();
  }
  // ละอองดาวทอง/ชมพูลอยขึ้นรอบปราสาท
  for (let i = 0; i < 12; i++) {
    const T = 260, u = ((t + h01(i) * T) % T) / T;
    const px = cx + (h01(i + 7) - 0.5) * w * 0.95 + Math.sin(t * 0.03 + i) * 6;
    const py = GY - 120 - u * 190;
    c.globalAlpha = Math.sin(u * Math.PI) * 0.85;
    c.fillStyle = i % 3 ? '#FFF1B0' : '#FFC4DC';
    if (i % 4 === 0) { heart(c, px, py, 3); c.fill(); }
    else { star(c, px, py, 2.6); c.fill(); }
  }
  c.restore();
}

/** แสงเรืองนุ่มหลังปราสาท + ลำแสงจาง ๆ หมุนช้า (ให้ปราสาทดูศักดิ์สิทธิ์ อลังการ) */
function aura(c, cx, t) {
  const y = GY - 250;
  c.save();
  const g = c.createRadialGradient(cx, y, 20, cx, y, 420);
  g.addColorStop(0, 'rgba(255,246,214,.55)');
  g.addColorStop(0.45, 'rgba(255,226,240,.22)');
  g.addColorStop(1, 'rgba(255,226,240,0)');
  c.fillStyle = g;
  c.fillRect(cx - 420, 0, 840, GY);
  c.globalAlpha = 0.1;
  c.fillStyle = '#FFF6D8';
  for (let i = 0; i < 14; i++) {
    const a = t * 0.0015 + (i * TAU) / 14;
    c.beginPath(); c.moveTo(cx, y);
    c.arc(cx, y, 460, a, a + 0.09);
    c.closePath(); c.fill();
  }
  c.restore();
}

// ── วาดทั้งเขต (ผู้เรียก translate กล้องแล้ว) ──────────────────────
export function drawRealm(c, camX, vw, t) {
  const inView = (x0, x1) => x1 > camX - 60 && x0 < camX + vw + 60;
  if (inView(CASTLE.x - 420, CASTLE.x + CASTLE.w + 420)) aura(c, CASTLE.door, t);   // แสงเรืองหลังทุกอย่างในเขต
  // รั้ว (แคชท่อนละไม่เกิน ~480)
  for (const [a, b] of REALM.fence) {
    const n = Math.ceil((b - a) / 480);
    for (let i = 0; i < n; i++) {
      const x0 = a + ((b - a) * i) / n, x1 = a + ((b - a) * (i + 1)) / n;
      if (!inView(x0 - 60, x1 + 60)) continue;
      cached(c, `fence:${a}:${i}`, x0 - 60, GY - 175, x1 - x0 + 120, 178, (cc) => {
        cc.save(); cc.beginPath(); cc.rect(x0 - (i ? 0 : 60), GY - 175, x1 - x0 + (i ? 0 : 60) + (i === n - 1 ? 60 : 0), 178); cc.clip();
        drawFencePiece(cc, a, b, x0, x1);
        cc.restore();
      });
    }
  }
  const g = REALM.gate;
  if (inView(g - 170, g + 170)) cached(c, 'realm:gate', g - 170, GY - 240, 340, 246, drawRealmGate);
  REALM.lanterns.forEach((lx, i) => {
    if (!inView(lx - 30, lx + 50)) return;
    cached(c, 'rlamp:' + lx, lx - 24, GY - 176, 72, 180, (cc) => drawRoyalLamp(cc, lx, i));
    glow(c, lx, GY - 142, 30, 0.42 + 0.12 * Math.sin(t * 0.13 + lx));
  });
  const { x, w } = CASTLE;
  if (inView(x - 20, x + w + 20)) {
    cached(c, 'castle', x - 20, 0, w + 40, GY + 8, (cc) => { drawCastleArt(cc); light(cc, x - 20, 0, w + 40, GY + 8); });
    drawCastleLive(c, t);
  }
}
