// ══ ตู้กาช่าหัวแมว (หน้าสุ่มสกิน) ══════════════════════════════
//
// วาดตามแบบของผู้ใช้ 15 ต.ค.: หัวแมวขาวชมพูเกาะขอบตู้ (ตาซ้ายเปิด ตาขวาขยิบ โบว์หัวใจที่หู อุ้งเท้าสองข้างเกาะขอบ)
// ปลอกคอชมพูมีหัวใจ = กรอบบน · ตู้กระจกสี่เหลี่ยมมุมมน (ผู้ใช้ขอ — ไม่เอาโดมกลม) เต็มไปด้วยแคปซูลพาสเทลมีหน้าแมว
// คอตู้ = กรอบล่าง · ฐานชมพูลายอุ้งเท้า ช่องหยอดเหรียญทอง ช่องรับของทรงหัวแมว · เท้าอุ้งเท้า · หางผูกโบว์ · เครื่องหมาย/หัวใจรอบ ๆ
//
// ── ขยับได้ (ผู้ใช้ขอ "อนิเมชั่นน่ารัก ๆ ขยับไปมา") แต่ไม่กินเครื่อง ──
// แยกตู้เป็นชั้น: ชิ้นที่นิ่ง (ฐาน กระจก ปลอกคอ หัว หาง แคปซูลแต่ละสี) วาดครั้งเดียวเป็นภาพเก็บไว้ (createGumball)
// ทุกเฟรมแค่แปะภาพพวกนั้นด้วยมุม/ตำแหน่งใหม่ + วาดของชิ้นเล็กสด (ตา อุ้งเท้า หัวใจลอย เครื่องหมาย)
//   หัวเอียงโยก · ตาซ้ายกะพริบ ตาขวาขยิบสลับลืมตา · หางกระดิก · แคปซูลโยกในตู้ · อุ้งเท้าเคาะสลับ · หัวใจลอยขึ้น · เครื่องหมายเต้น
//
// พิกัดทั้งหมดอยู่ในกรอบ GUMBALL.W × GUMBALL.H — ผู้เรียกตั้ง ctx ให้ 1 หน่วย = k พิกเซลเอง

export const GUMBALL = { W: 300, H: 416 };

const OY = 14;            // เลื่อนทั้งตู้ลง เว้นที่ให้ปลายหู/หัวใจลอยด้านบน
const LINE = '#B5476F';   // เส้นขอบทั้งตู้ (ชมพูเข้มอมม่วง — นุ่มกว่าดำ)
const TAU = Math.PI * 2;
// กระจกตู้ (สี่เหลี่ยมมุมมน ระหว่างปลอกคอกับคอตู้)
const GL = { x: 56, y: 90, w: 188, h: 164, r: 16 };
const HEAD_PIVOT = [150, 96];   // หัวเอียงรอบจุดนี้ (กลางขอบปลอกคอ)
const TAIL_PIVOT = [244, 306];  // หางกระดิกรอบโคนหาง

function stroke(c, w = 3.2, col = LINE) {
  c.lineWidth = w;
  c.strokeStyle = col;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.stroke();
}
function vgrad(c, y0, y1, a, b) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}
function rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}
function heart(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.3, y - s * 0.05, x - s * 0.6, y - s * 1.05, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.6, y - s * 1.05, x + s * 1.3, y - s * 0.05, x, y + s * 0.9);
  c.closePath();
}
function star5(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.48 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}
function goldStar(c, x, y, r) {
  star5(c, x, y, r);
  c.fillStyle = '#FFE36B';
  c.fill();
  stroke(c, 1.1, '#D8A62A');
}
/** หัวใจอัญมณีขอบทอง (ปลอกคอ / โบว์) */
function gemHeart(c, x, y, s) {
  heart(c, x, y, s * 1.25);
  c.fillStyle = vgrad(c, y - s, y + s, '#FFE79A', '#E9A92C');
  c.fill();
  stroke(c, 1.6, '#A8701E');
  heart(c, x, y + s * 0.02, s * 0.85);
  c.fillStyle = vgrad(c, y - s, y + s, '#FF8AC2', '#E5357F');
  c.fill();
  c.fillStyle = 'rgba(255,255,255,.8)';
  c.beginPath();
  c.ellipse(x - s * 0.32, y - s * 0.25, s * 0.22, s * 0.14, -0.6, 0, TAU);
  c.fill();
}
/** โบว์ชมพูสองห่วง + หัวใจกลาง — a = มุมเอียง */
function bow(c, x, y, s, a = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  for (const d of [-1, 1]) {
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(d * s * 0.5, -s * 0.95, d * s * 1.35, -s * 0.75, d * s * 1.25, 0);
    c.bezierCurveTo(d * s * 1.35, s * 0.75, d * s * 0.5, s * 0.9, 0, 0);
    c.fillStyle = vgrad(c, -s, s, '#FF9CCB', '#F25C9C');
    c.fill();
    stroke(c, 2.2);
    c.beginPath();
    c.moveTo(d * s * 0.35, -s * 0.12);
    c.quadraticCurveTo(d * s * 0.8, -s * 0.05, d * s * 1.0, -s * 0.3);
    stroke(c, 1.4, 'rgba(181,71,111,.55)');
  }
  c.restore();
  gemHeart(c, x, y, s * 0.42);
}
/** อุ้งเท้าขาว (มองจากหน้า) — เกาะขอบตู้ / เท้าตู้ */
function paw(c, x, y, rx, ry, beans = false) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fillStyle = vgrad(c, y - ry, y + ry, '#FFFFFF', '#FBE6EF');
  c.fill();
  stroke(c, 2.6);
  if (beans) {
    c.fillStyle = '#FF9EC2';
    c.beginPath();
    c.ellipse(x, y + ry * 0.22, rx * 0.34, ry * 0.3, 0, 0, TAU);
    c.fill();
    for (const k of [-1, 0, 1]) {
      c.beginPath();
      c.ellipse(x + k * rx * 0.36, y - ry * 0.32 - (k ? 0 : ry * 0.08), rx * 0.13, ry * 0.15, 0, 0, TAU);
      c.fill();
    }
  } else {
    for (const k of [-1, 1]) {
      c.beginPath();
      c.moveTo(x + k * rx * 0.28, y - ry * 0.05);
      c.lineTo(x + k * rx * 0.3, y + ry * 0.55);
      stroke(c, 1.8);
    }
  }
}
/** ลายอุ้งเท้าบนฐาน: ฝ่าเท้าขาวขอบชมพู + นิ้วสี่นิ้ว */
function pawPrint(c, x, y, s) {
  const blob = (bx, by, rx, ry) => {
    c.beginPath();
    c.ellipse(bx, by, rx, ry, 0, 0, TAU);
    c.fillStyle = '#FFFFFF';
    c.fill();
    stroke(c, 1.6, '#E86E9C');
  };
  blob(x, y + s * 0.25, s * 0.55, s * 0.45);
  for (const [dx, dy] of [[-0.62, -0.28], [-0.22, -0.62], [0.22, -0.62], [0.62, -0.28]]) blob(x + dx * s, y + dy * s, s * 0.2, s * 0.24);
  c.fillStyle = '#FF9EC2';
  c.beginPath();
  c.ellipse(x, y + s * 0.3, s * 0.3, s * 0.24, 0, 0, TAU);
  c.fill();
}
/** แคปซูลสีพาสเทล มีหน้าแมวขาวอยู่ข้างใน */
function capsule(c, x, y, r, col) {
  c.save();
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,.95)');
  g.addColorStop(0.45, col.fill);
  g.addColorStop(1, col.deep);
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fillStyle = g;
  c.fill();
  const fy = y + r * 0.12, fw = r * 0.56, fh = r * 0.42;
  c.beginPath();
  c.moveTo(x - fw * 0.95, fy - fh * 0.2);
  c.lineTo(x - fw * 0.78, fy - fh * 1.55);
  c.lineTo(x - fw * 0.25, fy - fh * 0.95);
  c.quadraticCurveTo(x, fy - fh * 1.08, x + fw * 0.25, fy - fh * 0.95);
  c.lineTo(x + fw * 0.78, fy - fh * 1.55);
  c.lineTo(x + fw * 0.95, fy - fh * 0.2);
  c.bezierCurveTo(x + fw * 1.05, fy + fh * 0.9, x - fw * 1.05, fy + fh * 0.9, x - fw * 0.95, fy - fh * 0.2);
  c.closePath();
  c.fillStyle = 'rgba(255,255,255,.88)';
  c.fill();
  c.lineWidth = 1.1;
  c.strokeStyle = col.deep;
  c.stroke();
  c.fillStyle = 'rgba(80,40,70,.75)';
  for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * fw * 0.42, fy - fh * 0.05, r * 0.05, 0, TAU); c.fill(); }
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.lineWidth = 1.8;
  c.strokeStyle = col.deep;
  c.stroke();
  c.beginPath();
  c.ellipse(x - r * 0.42, y - r * 0.48, r * 0.26, r * 0.14, -0.7, 0, TAU);
  c.fillStyle = 'rgba(255,255,255,.75)';
  c.fill();
  c.restore();
}
const CAPS = {
  pink: { fill: '#FFB6D6', deep: '#E9689E' },
  peach: { fill: '#FFD49A', deep: '#E8A048' },
  blue: { fill: '#AEDCFF', deep: '#5D9EE0' },
  purple: { fill: '#D6B8FF', deep: '#9A6FDB' },
  green: { fill: '#BDEBB0', deep: '#6DBB66' },
  rose: { fill: '#FFC2CF', deep: '#E7728C' },
};
// แคปซูลในตู้ (x, y, r, สี) — เรียงเป็นแถวเต็มกล่องสี่เหลี่ยม วาดจากหลัง (บน) ไปหน้า (ล่าง)
const CAP_LIST = [
  [60, 108, 21, 'blue'], [102, 104, 22, 'purple'], [146, 106, 22, 'peach'], [190, 104, 22, 'blue'], [234, 108, 21, 'rose'],
  [80, 146, 22, 'rose'], [124, 144, 23, 'blue'], [168, 146, 23, 'pink'], [212, 144, 22, 'purple'],
  [60, 186, 21, 'green'], [102, 184, 23, 'peach'], [146, 186, 23, 'purple'], [190, 184, 23, 'blue'], [234, 188, 21, 'peach'],
  [80, 228, 22, 'pink'], [124, 230, 23, 'purple'], [168, 228, 23, 'green'], [212, 230, 22, 'pink'],
];

// ── ชิ้นส่วนของตู้ (พิกัดเดิม ก่อนเลื่อนลง OY) ──

function drawTail(c) {
  const tail = () => { c.beginPath(); c.moveTo(244, 306); c.bezierCurveTo(286, 300, 290, 256, 276, 226); };
  tail();
  stroke(c, 24);
  tail();
  stroke(c, 18, '#FFF6FA');
  bow(c, 274, 280, 12, -0.9);
}

/** ฐาน คอตู้ (กรอบล่าง) เท้า และพื้นกระจกด้านหลังแคปซูล */
function drawBody(c) {
  // ── ฐาน ──
  c.beginPath();
  c.moveTo(56, 262);
  c.lineTo(244, 262);
  c.quadraticCurveTo(252, 262, 254, 272);
  c.lineTo(262, 344);
  c.quadraticCurveTo(264, 362, 246, 362);
  c.lineTo(54, 362);
  c.quadraticCurveTo(36, 362, 38, 344);
  c.lineTo(46, 272);
  c.quadraticCurveTo(48, 262, 56, 262);
  c.closePath();
  c.fillStyle = vgrad(c, 262, 362, '#FFA9CB', '#F57AAA');
  c.fill();
  stroke(c);
  c.save();
  c.clip();
  c.fillStyle = 'rgba(214,72,128,.18)';
  c.fillRect(30, 262, 240, 10);
  c.fillStyle = 'rgba(255,255,255,.22)';
  c.beginPath();
  c.ellipse(64, 312, 10, 40, 0.1, 0, TAU);
  c.fill();
  c.restore();
  pawPrint(c, 96, 294, 15);
  pawPrint(c, 204, 294, 15);
  // ช่องหยอดเหรียญทอง
  c.beginPath();
  c.arc(150, 287, 19, 0, TAU);
  c.fillStyle = vgrad(c, 268, 306, '#FFE57A', '#EFAE24');
  c.fill();
  stroke(c, 2.6, '#A9701A');
  c.beginPath();
  c.arc(150, 287, 14.5, 0, TAU);
  stroke(c, 1.4, 'rgba(169,112,26,.45)');
  c.save();
  c.translate(150, 287);
  c.rotate(-0.42);
  rrect(c, -12, -3, 24, 6, 3);
  c.fillStyle = '#7A4A18';
  c.fill();
  c.restore();
  heart(c, 66, 322, 6);
  c.fillStyle = '#C9A2FF';
  c.fill();
  stroke(c, 1.4, '#8F64D6');
  for (const [x, y, r] of [[82, 336, 5], [236, 316, 5.5], [222, 340, 3.5]]) goldStar(c, x, y, r);
  // ช่องรับของทรงหัวแมว
  const ox = 150, oy = 341;
  const outlet = (w, h, ear) => {
    c.beginPath();
    c.moveTo(ox - w, oy + h);
    c.lineTo(ox - w, oy - h + 8);
    c.quadraticCurveTo(ox - w, oy - h, ox - w + 8, oy - h);
    c.lineTo(ox - w * 0.62, oy - h);
    c.lineTo(ox - w * 0.5, oy - h - ear);
    c.lineTo(ox - w * 0.3, oy - h);
    c.lineTo(ox + w * 0.3, oy - h);
    c.lineTo(ox + w * 0.5, oy - h - ear);
    c.lineTo(ox + w * 0.62, oy - h);
    c.lineTo(ox + w - 8, oy - h);
    c.quadraticCurveTo(ox + w, oy - h, ox + w, oy - h + 8);
    c.lineTo(ox + w, oy + h);
    c.closePath();
  };
  outlet(38, 20, 8);
  c.fillStyle = vgrad(c, oy - 28, oy + 20, '#FFC2DA', '#FF8DB8');
  c.fill();
  stroke(c, 2.8);
  outlet(29, 14, 6);
  c.fillStyle = vgrad(c, oy - 20, oy + 14, '#B83A6E', '#E5679A');
  c.fill();
  stroke(c, 2);
  paw(c, 66, 362, 27, 17, true);
  paw(c, 234, 362, 27, 17, true);
  // ── คอตู้ = กรอบล่างของกระจก ──
  rrect(c, 44, 246, 212, 24, 12);
  c.fillStyle = vgrad(c, 246, 270, '#FFC6DD', '#FF95BF');
  c.fill();
  stroke(c);
  c.fillStyle = 'rgba(255,255,255,.4)';
  rrect(c, 56, 249, 188, 4, 2);
  c.fill();
  // ── พื้นกระจกด้านหลังแคปซูล ──
  rrect(c, GL.x, GL.y, GL.w, GL.h, GL.r);
  c.fillStyle = vgrad(c, GL.y, GL.y + GL.h, 'rgba(250,238,255,.97)', 'rgba(234,206,248,.97)');
  c.fill();
}

/** หน้ากระจก: แสงสะท้อน เงาขอบ และกรอบ (วาดทับแคปซูล) */
function drawGlassFront(c) {
  c.save();
  rrect(c, GL.x, GL.y, GL.w, GL.h, GL.r);
  c.clip();
  // เงาใต้ปลอกคอ + ขอบขวามืดลงนิด ให้กระจกดูเป็นกล่องลึก
  c.fillStyle = vgrad(c, GL.y, GL.y + 26, 'rgba(160,80,170,.28)', 'rgba(160,80,170,0)');
  c.fillRect(GL.x, GL.y, GL.w, 26);
  const side = c.createLinearGradient(GL.x + GL.w - 30, 0, GL.x + GL.w, 0);
  side.addColorStop(0, 'rgba(190,120,220,0)');
  side.addColorStop(1, 'rgba(190,120,220,.38)');
  c.fillStyle = side;
  c.fillRect(GL.x + GL.w - 30, GL.y, 30, GL.h);
  // แถบแสงตั้งสองเส้นฝั่งซ้าย + หัวใจขาวสะท้อน
  c.fillStyle = 'rgba(255,255,255,.55)';
  rrect(c, GL.x + 10, GL.y + 18, 9, GL.h - 40, 4.5);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)';
  rrect(c, GL.x + 24, GL.y + 26, 4, GL.h - 64, 2);
  c.fill();
  heart(c, GL.x + GL.w - 26, GL.y + 26, 8);
  c.fillStyle = 'rgba(255,255,255,.75)';
  c.fill();
  c.restore();
  rrect(c, GL.x, GL.y, GL.w, GL.h, GL.r);
  stroke(c, 3.4);
  // เสามุมสองข้าง (ระหว่างกรอบบนกับกรอบล่าง) — กระจกดูเป็นตู้ที่มีกรอบครอบจริง
  for (const x of [GL.x - 3, GL.x + GL.w - 5]) {
    rrect(c, x, GL.y + 6, 8, GL.h - 6, 4);
    c.fillStyle = vgrad(c, GL.y, GL.y + GL.h, '#FFC6DD', '#FF9CC3');
    c.fill();
    stroke(c, 2.2);
  }
}

/** ปลอกคอชมพูขอบหยัก = กรอบบนของกระจก + หัวใจอัญมณี */
function drawCollar(c) {
  c.beginPath();
  c.moveTo(46, 92);
  c.quadraticCurveTo(46, 80, 58, 80);
  c.lineTo(242, 80);
  c.quadraticCurveTo(254, 80, 254, 92);
  c.lineTo(254, 98);
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const x = 254 - (208 * i) / n;
    c.quadraticCurveTo(x + 208 / n / 2, 108, x, 99);
  }
  c.closePath();
  c.fillStyle = vgrad(c, 80, 106, '#FF9DC6', '#F06A9F');
  c.fill();
  stroke(c);
  c.fillStyle = 'rgba(255,255,255,.35)';
  rrect(c, 62, 83, 176, 4, 2);
  c.fill();
  gemHeart(c, 150, 95, 10);
}

/** หัวแมว (หู หัว แก้ม จมูก ปาก หนวด โบว์) — ตาวาดสดแยก (กะพริบ/ขยิบ) */
function drawHead(c) {
  for (const [bx, tx, ty, ix] of [[70, 84, 2, 118], [230, 216, 2, 182]]) {
    const L = tx < 150;
    c.beginPath();
    c.moveTo(bx, 56);
    c.quadraticCurveTo(tx - (L ? 6 : -6), ty + 4, tx, ty);
    c.quadraticCurveTo(tx + (L ? 10 : -10), ty + 2, ix, 30);
    c.closePath();
    c.fillStyle = '#FFF2F7';
    c.fill();
    stroke(c);
    c.beginPath();
    c.moveTo(bx + (L ? 9 : -9), 46);
    c.quadraticCurveTo(tx, ty + 14, tx + (L ? 4 : -4), ty + 12);
    c.quadraticCurveTo(tx + (L ? 12 : -12), ty + 16, ix - (L ? 8 : -8), 32);
    c.closePath();
    c.fillStyle = '#FFB5D0';
    c.fill();
  }
  c.beginPath();
  c.moveTo(66, 92);
  c.bezierCurveTo(54, 40, 96, 20, 150, 20);
  c.bezierCurveTo(204, 20, 246, 40, 234, 92);
  c.closePath();
  c.fillStyle = vgrad(c, 20, 92, '#FFFAFC', '#FFE6F0');
  c.fill();
  stroke(c);
  c.fillStyle = 'rgba(255,150,185,.55)';
  for (const x of [102, 198]) { c.beginPath(); c.ellipse(x, 72, 11, 6.5, 0, 0, TAU); c.fill(); }
  c.beginPath();
  c.moveTo(146.5, 62.5);
  c.lineTo(153.5, 62.5);
  c.lineTo(150, 66.5);
  c.closePath();
  c.fillStyle = '#FF8DB2';
  c.fill();
  c.beginPath();
  c.moveTo(141, 69);
  c.quadraticCurveTo(145.5, 74, 150, 68.5);
  c.quadraticCurveTo(154.5, 74, 159, 69);
  stroke(c, 2.2, '#7A3A4E');
  for (const [x0, y0, x1, y1] of [[76, 56, 90, 59], [76, 66, 90, 65], [224, 56, 210, 59], [224, 66, 210, 65]]) {
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); stroke(c, 2.2, '#7A3A4E');
  }
  bow(c, 206, 32, 15, 0.25);
}

/** ตา — open 0..1 = ตาซ้ายลืม (กะพริบ) · wink 0..1 = ตาขวาขยิบ (1) ↔ ลืม (0) */
function drawEyes(c, open, wink) {
  // ตาซ้าย: วงกลมเข้มหดตามแนวตั้งตอนกะพริบ (ปิดสนิท = เส้นโค้ง)
  const eye = (x, y, o) => {
    if (o < 0.2) {
      c.beginPath();
      c.moveTo(x - 9, y + 1);
      c.quadraticCurveTo(x, y + 6, x + 9, y + 1);
      stroke(c, 3.2, '#4A2430');
      return;
    }
    c.save();
    c.translate(x, y);
    c.scale(1, o);
    c.beginPath();
    c.arc(0, 0, 10, 0, TAU);
    c.fillStyle = '#4A2430';
    c.fill();
    c.fillStyle = '#FFFFFF';
    c.beginPath(); c.arc(3, -4, 3.6, 0, TAU); c.fill();
    c.beginPath(); c.arc(-3.5, 4, 1.8, 0, TAU); c.fill();
    c.restore();
  };
  eye(118, 58, open);
  if (wink > 0.5) {
    c.beginPath();
    c.moveTo(186, 50);
    c.lineTo(173, 57);
    c.lineTo(186, 64);
    stroke(c, 3.4, '#4A2430');
  } else eye(180, 58, open);
}

/** เครื่องหมายตกใจสีชมพูรอบหัว — s = ขนาด (เต้นตามจังหวะ) */
function drawMarks(c, s) {
  const marks = [[44, 51, 38, 44, 50, 58], [38, 74, 30, 74, 46, 74], [257, 48, 262, 40, 252, 56], [262, 71, 270, 70, 254, 72]];
  for (const [cx, cy, x0, y0, x1, y1] of marks) {
    c.beginPath();
    c.moveTo(cx + (x0 - cx) * s, cy + (y0 - cy) * s);
    c.lineTo(cx + (x1 - cx) * s, cy + (y1 - cy) * s);
    stroke(c, 5.5, '#FF6FA8');
  }
}

/** สร้างภาพชั้นต่าง ๆ ของตู้ที่ความละเอียด k พิกเซลต่อหน่วย — แปะซ้ำทุกเฟรมด้วย drawGumballFrame */
export function createGumball(k) {
  const layer = (x0, y0, w, h, fn) => {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(w * k));
    cv.height = Math.max(1, Math.ceil(h * k));
    const g = cv.getContext('2d');
    g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
    fn(g);
    return { cv, x0, y0, w, h };
  };
  const caps = {};
  for (const [key, col] of Object.entries(CAPS)) caps[key] = layer(-25, -25, 50, 50, (g) => capsule(g, 0, 0, 23, col));
  return {
    k,
    tail: layer(222, 200, 78, 124, drawTail),
    body: layer(26, 84, 248, 300, drawBody),
    glass: layer(46, 84, 208, 178, drawGlassFront),
    collar: layer(42, 76, 216, 36, drawCollar),
    head: layer(50, -6, 200, 102, drawHead),
    caps,
  };
}

const blit = (c, L) => c.drawImage(L.cv, L.x0, L.y0, L.w, L.h);

/**
 * วาดตู้หนึ่งเฟรม (ctx ตั้งให้ 1 หน่วย = k พิกเซลแล้ว) — t = วินาที · drop 0..1 = แคปซูลหล่นตอนสุ่ม
 * ทุกอย่างขยับเป็นวงรอบ (sin) ไม่สุ่ม ภาพจึงนุ่มต่อเนื่อง
 */
export function drawGumballFrame(c, G, t, drop = 0) {
  c.save();
  c.translate(0, OY);

  // เงานุ่มใต้ตู้ (แทน CSS drop-shadow ที่ต้องคิดใหม่ทุกภาพ)
  c.save();
  c.translate(150, 378);
  c.scale(1, 0.12);
  const sg = c.createRadialGradient(0, 0, 8, 0, 0, 130);
  sg.addColorStop(0, 'rgba(70,20,110,.34)');
  sg.addColorStop(1, 'rgba(70,20,110,0)');
  c.fillStyle = sg;
  c.beginPath();
  c.arc(0, 0, 130, 0, TAU);
  c.fill();
  c.restore();

  // หัวใจลอยขึ้นจากข้างหัวแล้วจางหาย (สามดวงเหลื่อมจังหวะกัน)
  for (let i = 0; i < 3; i++) {
    const p = (t / 2.6 + i / 3) % 1;
    const a = Math.sin(Math.PI * p);
    if (a < 0.03) continue;
    c.globalAlpha = a;
    heart(c, 262 - i * 8 + Math.sin(t * 2 + i) * 5, 104 - p * 70, 4 + i * 1.6);
    c.fillStyle = i === 1 ? '#FFA3C8' : '#FF7FB2';
    c.fill();
    stroke(c, 1.3);
    c.globalAlpha = 1;
  }
  drawMarks(c, 1 + 0.16 * Math.sin(t * 4.2));

  // หางกระดิกรอบโคน
  c.save();
  c.translate(TAIL_PIVOT[0], TAIL_PIVOT[1]);
  c.rotate(0.13 * Math.sin(t * 2.3));
  c.translate(-TAIL_PIVOT[0], -TAIL_PIVOT[1]);
  blit(c, G.tail);
  c.restore();

  blit(c, G.body);

  // แคปซูลโยกเบา ๆ ในตู้ (ตัดขอบกระจก)
  c.save();
  rrect(c, GL.x, GL.y, GL.w, GL.h, GL.r);
  c.clip();
  CAP_LIST.forEach(([x, y, r, key], i) => {
    const dx = 1.1 * Math.cos(t * 1.7 + i * 0.9), dy = 1.8 * Math.sin(t * 2.1 + i * 1.3);
    const s = r / 23;
    c.drawImage(G.caps[key].cv, x + dx - 25 * s, y + dy - 25 * s, 50 * s, 50 * s);
  });
  // ดาวระยิบระหว่างแคปซูล
  for (const [x, y, r, ph] of [[80, 124, 5.5, 0], [190, 166, 5, 1.7], [124, 206, 5, 3.1], [228, 128, 4.5, 4.4], [168, 250, 5, 2.2]]) {
    goldStar(c, x, y, r * (0.75 + 0.3 * Math.sin(t * 3 + ph)));
  }
  c.restore();
  blit(c, G.glass);
  blit(c, G.collar);

  // หัวเอียงโยก + เด้งเบา ๆ · ตา: ซ้ายกะพริบทุก ~3.2 วิ · ขวาขยิบ แล้วลืมตาสั้น ๆ ทุก ~6 วิ
  const tilt = 0.06 * Math.sin(t * 1.25), bob = -1.6 * Math.abs(Math.sin(t * 1.25));
  c.save();
  c.translate(HEAD_PIVOT[0], HEAD_PIVOT[1] + bob);
  c.rotate(tilt);
  c.translate(-HEAD_PIVOT[0], -HEAD_PIVOT[1]);
  blit(c, G.head);
  const bt = t % 3.2;
  const open = bt < 0.16 ? Math.abs(bt - 0.08) / 0.08 : 1;
  const wt = t % 6;
  drawEyes(c, open, wt > 4.6 && wt < 5.5 ? 0 : 1);
  c.restore();

  // อุ้งเท้าเกาะขอบ เคาะสลับซ้ายขวา (ไปกับหัวนิดหน่อย)
  const tap = (ph) => -2.6 * Math.max(0, Math.sin(t * 3.4 + ph));
  paw(c, 94, 82 + tap(0) + bob * 0.4, 19, 13);
  paw(c, 206, 82 + tap(Math.PI) + bob * 0.4, 19, 13);

  // แคปซูลที่ตกออกจากช่องรับของตอนสุ่ม — ไหลออกแล้วเด้งหนึ่งที
  if (drop > 0) {
    const e = Math.min(1, drop / 0.6);
    const y = 332 + 22 * e - (drop > 0.6 ? Math.sin(((drop - 0.6) / 0.4) * Math.PI) * 12 : 0);
    const s = (12 + 4 * e) / 23;
    c.drawImage(G.caps.pink.cv, 150 - 25 * s, y - 25 * s, 50 * s, 50 * s);
  }
  c.restore();
}
