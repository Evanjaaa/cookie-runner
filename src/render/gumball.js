// ══ ตู้กาช่าหัวแมว (หน้าสุ่มสกิน) ══════════════════════════════
//
// แบบของผู้ใช้ 15 ต.ค.: หัวแมวขาวชมพูเกาะขอบตู้ (ตาซ้ายเปิด ตาขวาขยิบ โบว์หัวใจที่หู อุ้งเท้าสองข้างเกาะขอบ)
// ปลอกคอชมพูมีกระดิ่งหัวใจ = กรอบบน · ตู้กระจกเต็มไปด้วยแคปซูลพาสเทลมีหน้าแมว (ผู้ใช้ขอ — ไม่เอาโดมกลม)
// คอตู้ = กรอบล่าง · ฐานชมพูลายอุ้งเท้า ช่องหยอดเหรียญทอง ช่องรับของทรงหัวแมว · เท้าอุ้งเท้า · หางผูกโบว์
//
// ── วาดใหม่ 4 พ.ย. 2026 (ผู้ใช้: "เส้นดูแข็ง ๆ เหลี่ยม ๆ อยากให้โค้ง กลม น่ารัก ดูมีชีวิต") ──
//   ทุกขอบเป็นเส้นโค้ง ไม่มีเส้นตรงหักมุมเหลืออยู่:
//     หัวกลมแบบโมจิ แก้มป่อง · หูปลายมน (เดิมแหลม) · ตากลมโตมีประกายสองจุด · ตาขยิบเป็นเส้นโค้ง (เดิมเส้นตรงหักมุม)
//     หนวดโค้ง · ตู้กระจกมุมมนมาก ด้านข้างป่องออกนิด ๆ แบบโหลขนม (เดิมสี่เหลี่ยม + เสาเหลี่ยมสองข้าง)
//     ฐานทรงพุดดิ้งป่องข้าง (เดิมคางหมูขอบตรง) · ช่องรับของหูมน · ปลอกคอปลายมนขอบลูกไม้ครึ่งวงกลม
//   เส้นขอบบางลงและสีนุ่มลง · เงาวาวโค้งตามรูปทรง (หัว กระจก ฐาน) ให้ดูนูนนิ่ม
//   มีชีวิตขึ้น: ทั้งตู้หายใจ (ยืด-ยุบเบามาก) · หูกระดิกเป็นพัก ๆ · กระดิ่งหัวใจแกว่ง · อ้าปาก "เหมียว" เป็นพัก ๆ
//                + ของเดิม: หัวเอียงโยก ตากะพริบ/ขยิบ หางกระดิก แคปซูลโยก อุ้งเท้าเคาะ หัวใจลอย
//
// ── ไม่กินเครื่อง ── ชิ้นที่นิ่ง (ฐาน กระจก ปลอกคอ หัว หูสองข้าง หาง แคปซูลแต่ละสี) วาดครั้งเดียวเป็นภาพ (createGumball)
// ทุกเฟรมแค่แปะภาพพวกนั้นด้วยมุม/ตำแหน่งใหม่ + วาดชิ้นเล็กสด (ตา ปาก กระดิ่ง อุ้งเท้า หัวใจลอย เส้นตื่นเต้น)
//
// พิกัดทั้งหมดอยู่ในกรอบ GUMBALL.W × GUMBALL.H — ผู้เรียกตั้ง ctx ให้ 1 หน่วย = k พิกเซลเอง

export const GUMBALL = { W: 300, H: 416 };

const OY = 14;            // เลื่อนทั้งตู้ลง เว้นที่ให้ปลายหู/หัวใจลอยด้านบน
const LINE = '#BF5384';   // เส้นขอบทั้งตู้ (ชมพูเข้มอมม่วง — นุ่มกว่าดำ)
const INK = '#4E2340';    // ตา / ปาก
const TAU = Math.PI * 2;
// ตู้กระจก: มุมมนมาก ด้านข้างป่องออก (bulge) แบบโหลขนม
const JAR = { x: 54, y: 106, w: 192, h: 152, r: 30, bulge: 6 };
const HEAD_PIVOT = [150, 104];  // หัวเอียงรอบคาง
const TAIL_PIVOT = [256, 330];  // หางกระดิกรอบโคนหาง
const EAR_PIVOT = { L: [90, 40], R: [210, 40] };

function stroke(c, w = 2.8, col = LINE) {
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
/** ดาวห้าแฉก มุมเว้าเป็นโค้ง (ไม่ใช่ดาวเหลี่ยมแข็ง) */
function star5(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i <= 5; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 5;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) { c.moveTo(px, py); continue; }
    const am = a - Math.PI / 5;
    c.quadraticCurveTo(x + Math.cos(am) * r * 0.36, y + Math.sin(am) * r * 0.36, px, py);
  }
  c.closePath();
}
function goldStar(c, x, y, r) {
  star5(c, x, y, r);
  c.fillStyle = '#FFE36B';
  c.fill();
  stroke(c, 1, '#D8A62A');
}
/** ประกายสี่แฉกเว้าโค้ง */
function sparkle(c, x, y, r, col = '#FFFFFF') {
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.fillStyle = col;
  c.fill();
}
/** หัวใจอัญมณีขอบทอง (กระดิ่งปลอกคอ / โบว์) */
function gemHeart(c, x, y, s) {
  heart(c, x, y, s * 1.25);
  c.fillStyle = vgrad(c, y - s, y + s, '#FFE79A', '#E9A92C');
  c.fill();
  stroke(c, 1.5, '#A8701E');
  heart(c, x, y + s * 0.02, s * 0.85);
  c.fillStyle = vgrad(c, y - s, y + s, '#FF8AC2', '#E5357F');
  c.fill();
  c.fillStyle = 'rgba(255,255,255,.85)';
  c.beginPath();
  c.ellipse(x - s * 0.32, y - s * 0.25, s * 0.22, s * 0.14, -0.6, 0, TAU);
  c.fill();
}
/** โบว์ชมพูสองห่วงกลมป่อง + หัวใจกลาง — a = มุมเอียง */
function bow(c, x, y, s, a = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  for (const d of [-1, 1]) {
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(d * s * 0.35, -s * 1.05, d * s * 1.5, -s * 0.95, d * s * 1.3, 0.05 * s);
    c.bezierCurveTo(d * s * 1.45, s * 0.85, d * s * 0.4, s * 0.95, 0, 0);
    c.fillStyle = vgrad(c, -s, s, '#FFA6D0', '#F2619F');
    c.fill();
    stroke(c, 2);
    // เงาวาวบนห่วง
    c.beginPath();
    c.ellipse(d * s * 0.78, -s * 0.38, s * 0.3, s * 0.14, d * -0.35, 0, TAU);
    c.fillStyle = 'rgba(255,255,255,.6)';
    c.fill();
  }
  c.restore();
  gemHeart(c, x, y, s * 0.4);
}
/** อุ้งเท้าขาวกลมป่อง (มองจากหน้า) — beans = มีถั่วชมพูใต้เท้า · ไม่มี = เส้นนิ้วโค้งสองเส้น */
function paw(c, x, y, rx, ry, beans = false) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fillStyle = vgrad(c, y - ry, y + ry, '#FFFFFF', '#FBE3EE');
  c.fill();
  stroke(c, 2.4);
  c.beginPath();
  c.ellipse(x - rx * 0.32, y - ry * 0.42, rx * 0.34, ry * 0.2, -0.2, 0, TAU);
  c.fillStyle = 'rgba(255,255,255,.9)';
  c.fill();
  if (beans) {
    c.fillStyle = '#FF9EC2';
    c.beginPath();
    c.ellipse(x, y + ry * 0.24, rx * 0.34, ry * 0.3, 0, 0, TAU);
    c.fill();
    for (const k of [-1, 0, 1]) {
      c.beginPath();
      c.ellipse(x + k * rx * 0.36, y - ry * 0.3 - (k ? 0 : ry * 0.1), rx * 0.13, ry * 0.15, 0, 0, TAU);
      c.fill();
    }
  } else {
    for (const k of [-1, 1]) {
      c.beginPath();
      c.moveTo(x + k * rx * 0.3, y + ry * 0.05);
      c.quadraticCurveTo(x + k * rx * 0.36, y + ry * 0.4, x + k * rx * 0.28, y + ry * 0.62);
      stroke(c, 1.6);
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
    stroke(c, 1.4, '#E86E9C');
  };
  blob(x, y + s * 0.25, s * 0.55, s * 0.45);
  for (const [dx, dy] of [[-0.62, -0.28], [-0.22, -0.62], [0.22, -0.62], [0.62, -0.28]]) blob(x + dx * s, y + dy * s, s * 0.2, s * 0.24);
  c.fillStyle = '#FF9EC2';
  c.beginPath();
  c.ellipse(x, y + s * 0.3, s * 0.3, s * 0.24, 0, 0, TAU);
  c.fill();
}
/** แคปซูลสีพาสเทล มีหน้าแมวขาวอยู่ข้างใน (หูมน) */
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
  // หน้าแมว — หูปลายมน หัวกลม
  const fy = y + r * 0.12, fw = r * 0.56, fh = r * 0.42;
  c.beginPath();
  c.moveTo(x - fw * 0.95, fy - fh * 0.2);
  c.quadraticCurveTo(x - fw * 1.02, fy - fh * 1.4, x - fw * 0.74, fy - fh * 1.5);
  c.quadraticCurveTo(x - fw * 0.5, fy - fh * 1.5, x - fw * 0.28, fy - fh * 0.98);
  c.quadraticCurveTo(x, fy - fh * 1.12, x + fw * 0.28, fy - fh * 0.98);
  c.quadraticCurveTo(x + fw * 0.5, fy - fh * 1.5, x + fw * 0.74, fy - fh * 1.5);
  c.quadraticCurveTo(x + fw * 1.02, fy - fh * 1.4, x + fw * 0.95, fy - fh * 0.2);
  c.bezierCurveTo(x + fw * 1.05, fy + fh * 0.9, x - fw * 1.05, fy + fh * 0.9, x - fw * 0.95, fy - fh * 0.2);
  c.closePath();
  c.fillStyle = 'rgba(255,255,255,.9)';
  c.fill();
  c.lineWidth = 1.1;
  c.strokeStyle = col.deep;
  c.stroke();
  c.fillStyle = 'rgba(80,40,70,.75)';
  for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * fw * 0.42, fy - fh * 0.05, r * 0.055, 0, TAU); c.fill(); }
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.lineWidth = 1.6;
  c.strokeStyle = col.deep;
  c.stroke();
  c.beginPath();
  c.ellipse(x - r * 0.42, y - r * 0.48, r * 0.26, r * 0.14, -0.7, 0, TAU);
  c.fillStyle = 'rgba(255,255,255,.78)';
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
// แคปซูลในโหล (x, y, r, สี) — แถวห้า/สี่สลับกัน วาดจากหลัง (บน) ไปหน้า (ล่าง)
const CAP_LIST = [
  [64, 126, 21, 'blue'], [106, 122, 22, 'purple'], [150, 124, 22, 'peach'], [194, 122, 22, 'blue'], [236, 126, 21, 'rose'],
  [84, 160, 22, 'rose'], [128, 158, 23, 'blue'], [172, 160, 23, 'pink'], [216, 158, 22, 'purple'],
  [64, 196, 21, 'green'], [106, 196, 23, 'peach'], [150, 198, 23, 'purple'], [194, 196, 23, 'blue'], [236, 198, 21, 'peach'],
  [84, 234, 22, 'pink'], [128, 236, 23, 'purple'], [172, 234, 23, 'green'], [216, 236, 22, 'pink'],
];

// ── รูปทรงหลัก ──

/** โหลกระจก: มุมมนมาก ด้านซ้าย/ขวาป่องออกนิด ๆ — ins = หดเข้าทุกด้าน */
function jarPath(c, ins = 0) {
  const x0 = JAR.x + ins, x1 = JAR.x + JAR.w - ins, y0 = JAR.y + ins, y1 = JAR.y + JAR.h - ins;
  const r = JAR.r - ins * 0.5, b = JAR.bulge, hh = y1 - y0;
  c.beginPath();
  c.moveTo(x0 + r, y0);
  c.lineTo(x1 - r, y0);
  c.bezierCurveTo(x1 - r * 0.35, y0, x1 + b * 0.3, y0 + r * 0.4, x1 + b * 0.55, y0 + r);
  c.bezierCurveTo(x1 + b, y0 + hh * 0.42, x1 + b, y1 - hh * 0.42, x1 + b * 0.55, y1 - r);
  c.bezierCurveTo(x1 + b * 0.3, y1 - r * 0.4, x1 - r * 0.35, y1, x1 - r, y1);
  c.lineTo(x0 + r, y1);
  c.bezierCurveTo(x0 + r * 0.35, y1, x0 - b * 0.3, y1 - r * 0.4, x0 - b * 0.55, y1 - r);
  c.bezierCurveTo(x0 - b, y1 - hh * 0.42, x0 - b, y0 + hh * 0.42, x0 - b * 0.55, y0 + r);
  c.bezierCurveTo(x0 - b * 0.3, y0 + r * 0.4, x0 + r * 0.35, y0, x0 + r, y0);
  c.closePath();
}

/** หัวกลมแบบโมจิ แก้มป่องสองข้าง คางมน */
function headPath(c) {
  c.beginPath();
  c.moveTo(150, 14);
  c.bezierCurveTo(207, 14, 249, 34, 247, 70);
  c.bezierCurveTo(246, 97, 211, 109, 150, 109);
  c.bezierCurveTo(89, 109, 54, 97, 53, 70);
  c.bezierCurveTo(51, 34, 93, 14, 150, 14);
  c.closePath();
}

/** ฐานทรงพุดดิ้ง: ขอบบนตรง (ซ่อนใต้คอตู้) ข้างป่องออกแล้วโค้งเข้าหาก้นมน ๆ */
function basePath(c) {
  c.beginPath();
  c.moveTo(58, 262);
  c.lineTo(242, 262);
  c.bezierCurveTo(262, 262, 270, 298, 268, 330);
  c.bezierCurveTo(266, 356, 250, 367, 230, 367);
  c.lineTo(70, 367);
  c.bezierCurveTo(50, 367, 34, 356, 32, 330);
  c.bezierCurveTo(30, 298, 38, 262, 58, 262);
  c.closePath();
}

/** หู (side = -1 ซ้าย / 1 ขวา) — ปลายมน · inner = ด้านในชมพู */
function earPath(c, side, inner = false) {
  const X = (x) => (side < 0 ? x : 300 - x);
  c.beginPath();
  if (!inner) {
    c.moveTo(X(58), 58);
    c.bezierCurveTo(X(53), 32, X(59), 10, X(72), 6);
    c.bezierCurveTo(X(85), 2, X(106), 13, X(122), 26);
    c.quadraticCurveTo(X(86), 28, X(58), 58);
  } else {
    c.moveTo(X(66), 48);
    c.bezierCurveTo(X(63), 32, X(67), 18, X(76), 15);
    c.bezierCurveTo(X(86), 12, X(100), 20, X(111), 29);
    c.quadraticCurveTo(X(86), 31, X(66), 48);
  }
  c.closePath();
}

// ── ชิ้นส่วนของตู้ (พิกัดเดิม ก่อนเลื่อนลง OY) ──

function drawTail(c) {
  // อยู่ในกรอบกว้าง 300 ทั้งตอนกระดิกสุด (ปลายหางเดิมเลยขอบขวา ผ้าใบตัดหางแหว่ง)
  const tail = () => { c.beginPath(); c.moveTo(256, 330); c.bezierCurveTo(287, 330, 291, 282, 276, 246); };
  tail();
  stroke(c, 24);
  tail();
  stroke(c, 18.6, '#FFF4F9');
  // ปลายหางชมพู (ทาสีเส้นเดิมเฉพาะในวงปลายหาง — ขอบกลืนกับตัวหางพอดี)
  c.save();
  c.beginPath();
  c.arc(276, 246, 15, 0, TAU);
  c.clip();
  tail();
  stroke(c, 18.6, '#FFC4DC');
  c.restore();
  // เงาวาวยาวตามหาง
  c.beginPath();
  c.moveTo(266, 323);
  c.bezierCurveTo(280, 318, 284, 288, 274, 262);
  stroke(c, 3.2, 'rgba(255,255,255,.85)');
  bow(c, 274, 294, 11, -0.9);
}

/** ฐาน เท้า และพื้นกระจกด้านหลังแคปซูล */
function drawBody(c) {
  // ── ฐานพุดดิ้ง ──
  basePath(c);
  c.fillStyle = vgrad(c, 262, 367, '#FFB3D1', '#F47DAD');
  c.fill();
  stroke(c);
  c.save();
  basePath(c);
  c.clip();
  // เงาใต้คอตู้ + เงาวาวโค้งตามข้างซ้าย + แสงนวลกลางฐาน
  c.fillStyle = vgrad(c, 262, 286, 'rgba(206,64,124,.22)', 'rgba(206,64,124,0)');
  c.fillRect(30, 262, 240, 24);
  c.beginPath();
  c.moveTo(48, 290);
  c.bezierCurveTo(42, 312, 44, 336, 56, 352);
  stroke(c, 7, 'rgba(255,255,255,.45)');
  c.beginPath();
  c.moveTo(250, 300);
  c.bezierCurveTo(256, 318, 255, 338, 246, 352);
  stroke(c, 4, 'rgba(206,64,124,.18)');
  const glow = c.createRadialGradient(150, 316, 4, 150, 316, 90);
  glow.addColorStop(0, 'rgba(255,236,246,.35)');
  glow.addColorStop(1, 'rgba(255,236,246,0)');
  c.fillStyle = glow;
  c.fillRect(60, 262, 180, 105);
  c.restore();
  pawPrint(c, 92, 300, 13);
  pawPrint(c, 208, 300, 13);
  // ช่องหยอดเหรียญทอง
  c.beginPath();
  c.arc(150, 294, 17.5, 0, TAU);
  c.fillStyle = vgrad(c, 276, 312, '#FFE882', '#EEAC26');
  c.fill();
  stroke(c, 2.4, '#A9701A');
  c.beginPath();
  c.arc(150, 294, 13, 0, TAU);
  stroke(c, 1.3, 'rgba(169,112,26,.45)');
  c.beginPath();
  c.ellipse(144, 287, 5, 2.6, -0.6, 0, TAU);
  c.fillStyle = 'rgba(255,255,255,.75)';
  c.fill();
  c.save();
  c.translate(150, 294);
  c.rotate(-0.42);
  rrect(c, -10.5, -2.8, 21, 5.6, 2.8);
  c.fillStyle = '#7A4A18';
  c.fill();
  c.restore();
  heart(c, 62, 326, 5.5);
  c.fillStyle = '#C9A2FF';
  c.fill();
  stroke(c, 1.3, '#8F64D6');
  for (const [x, y, r] of [[80, 344, 5], [238, 322, 5.5], [224, 346, 3.6]]) goldStar(c, x, y, r);
  // ช่องรับของทรงหัวแมว — หูมน มุมมน
  const ox = 150, oy = 343;
  const outlet = (w, h, ear) => {
    c.beginPath();
    c.moveTo(ox - w, oy + h);
    c.lineTo(ox - w, oy - h + 10);
    c.quadraticCurveTo(ox - w, oy - h, ox - w + 10, oy - h);
    c.lineTo(ox - w * 0.68, oy - h);
    c.quadraticCurveTo(ox - w * 0.62, oy - h - ear * 1.2, ox - w * 0.48, oy - h - ear);
    c.quadraticCurveTo(ox - w * 0.36, oy - h - ear * 0.6, ox - w * 0.28, oy - h);
    c.quadraticCurveTo(ox, oy - h - ear * 0.25, ox + w * 0.28, oy - h);
    c.quadraticCurveTo(ox + w * 0.36, oy - h - ear * 0.6, ox + w * 0.48, oy - h - ear);
    c.quadraticCurveTo(ox + w * 0.62, oy - h - ear * 1.2, ox + w * 0.68, oy - h);
    c.lineTo(ox + w - 10, oy - h);
    c.quadraticCurveTo(ox + w, oy - h, ox + w, oy - h + 10);
    c.lineTo(ox + w, oy + h);
    c.closePath();
  };
  outlet(36, 19, 9);
  c.fillStyle = vgrad(c, oy - 28, oy + 19, '#FFC6DC', '#FF8FB9');
  c.fill();
  stroke(c, 2.6);
  outlet(27, 13, 6.5);
  c.fillStyle = vgrad(c, oy - 20, oy + 13, '#B83A6E', '#E86C9E');
  c.fill();
  stroke(c, 1.8);
  // ฝาพับใสครึ่งบนของช่อง
  c.save();
  outlet(27, 13, 6.5);
  c.clip();
  c.fillStyle = 'rgba(255,220,236,.32)';
  c.fillRect(ox - 30, oy - 22, 60, 16);
  c.restore();
  // ── เท้า ──
  paw(c, 74, 367, 27, 16, true);
  paw(c, 226, 367, 27, 16, true);
  // ── พื้นกระจกด้านหลังแคปซูล ──
  jarPath(c);
  c.fillStyle = vgrad(c, JAR.y, JAR.y + JAR.h, 'rgba(252,242,255,.97)', 'rgba(236,210,250,.97)');
  c.fill();
}

/** หน้ากระจก: เงาด้านใน แสงสะท้อนโค้ง ขอบโหล และคอตู้ (วาดทับแคปซูล) */
function drawGlassFront(c) {
  c.save();
  jarPath(c);
  c.clip();
  // เงาใต้ปลอกคอ + ขอบขวามืดลงนิด ให้โหลดูมีความลึก
  c.fillStyle = vgrad(c, JAR.y, JAR.y + 30, 'rgba(160,80,170,.3)', 'rgba(160,80,170,0)');
  c.fillRect(JAR.x - 10, JAR.y, JAR.w + 20, 30);
  const side = c.createLinearGradient(JAR.x + JAR.w - 34, 0, JAR.x + JAR.w + 6, 0);
  side.addColorStop(0, 'rgba(190,120,220,0)');
  side.addColorStop(1, 'rgba(190,120,220,.36)');
  c.fillStyle = side;
  c.fillRect(JAR.x + JAR.w - 34, JAR.y, 40, JAR.h);
  // แสงสะท้อนโค้งตามขอบซ้ายของโหล (เส้นยาว + เส้นสั้น) + หัวใจ/ประกายขาวมุมขวาบน
  c.beginPath();
  c.moveTo(JAR.x + 14, JAR.y + 30);
  c.bezierCurveTo(JAR.x + 6, JAR.y + 62, JAR.x + 6, JAR.y + 104, JAR.x + 16, JAR.y + 128);
  stroke(c, 8, 'rgba(255,255,255,.55)');
  c.beginPath();
  c.moveTo(JAR.x + 28, JAR.y + 38);
  c.bezierCurveTo(JAR.x + 22, JAR.y + 58, JAR.x + 22, JAR.y + 78, JAR.x + 26, JAR.y + 92);
  stroke(c, 3.4, 'rgba(255,255,255,.4)');
  heart(c, JAR.x + JAR.w - 28, JAR.y + 34, 7.5);
  c.fillStyle = 'rgba(255,255,255,.78)';
  c.fill();
  sparkle(c, JAR.x + JAR.w - 44, JAR.y + 50, 5, 'rgba(255,255,255,.85)');
  c.restore();
  // ขอบโหล: เส้นนอก → ขอบชมพูหนา → เส้นวาวบนขอบ
  jarPath(c);
  stroke(c, 9);
  jarPath(c);
  c.lineWidth = 5.6;
  c.strokeStyle = vgrad(c, JAR.y, JAR.y + JAR.h, '#FFCFE2', '#FF9CC4');
  c.stroke();
  c.beginPath();
  c.moveTo(JAR.x + 6, JAR.y + 44);
  c.bezierCurveTo(JAR.x + 2, JAR.y + 22, JAR.x + 14, JAR.y + 2, JAR.x + 34, JAR.y + 1);
  stroke(c, 1.8, 'rgba(255,255,255,.85)');
  // ── คอตู้ = กรอบล่างของโหล (แคปซูลยาวมุมมน) ──
  rrect(c, 42, 250, 216, 22, 11);
  c.fillStyle = vgrad(c, 250, 272, '#FFC9DF', '#FF95BF');
  c.fill();
  stroke(c);
  c.fillStyle = 'rgba(255,255,255,.5)';
  rrect(c, 58, 253.5, 150, 4, 2);
  c.fill();
}

/** ปลอกคอชมพูปลายมน ขอบล่างลูกไม้ครึ่งวงกลม = กรอบบนของโหล */
function drawCollar(c) {
  const lace = () => {
    c.beginPath();
    c.moveTo(56, 111);
    const n = 13, x0 = 58, x1 = 242, step = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const a = x0 + step * i;
      c.arc(a + step / 2, 111, step / 2, Math.PI, 0, false);   // ครึ่งวงกลมห้อยลง
    }
    c.lineTo(244, 104);
    c.lineTo(56, 104);
    c.closePath();
  };
  lace();
  c.fillStyle = '#FFE2EE';
  c.fill();
  stroke(c, 1.8);
  rrect(c, 48, 94, 204, 18, 9);
  c.fillStyle = vgrad(c, 94, 112, '#FFA2CA', '#F26CA2');
  c.fill();
  stroke(c);
  c.fillStyle = 'rgba(255,255,255,.45)';
  rrect(c, 60, 97, 180, 3.6, 1.8);
  c.fill();
}

/** หูข้างหนึ่ง — แยกชั้นจากหัวเพื่อให้กระดิกได้ (โบว์อยู่ในชั้นหัว ไม่งั้นหัวบังโบว์ครึ่งหนึ่ง) */
function drawEar(c, side) {
  earPath(c, side);
  c.fillStyle = vgrad(c, 4, 58, '#FFFFFF', '#FFEAF2');
  c.fill();
  stroke(c);
  earPath(c, side, true);
  c.fillStyle = vgrad(c, 14, 48, '#FFB0CE', '#FFD3E4');
  c.fill();
}

/** หัวแมว (แก้ม จมูก หนวด เงาวาว) — ตาและปากวาดสดแยก (กะพริบ/ขยิบ/อ้าปาก) */
function drawHead(c) {
  headPath(c);
  c.fillStyle = vgrad(c, 14, 109, '#FFFFFF', '#FFE6F1');
  c.fill();
  c.save();
  headPath(c);
  c.clip();
  // เงานุ่มใต้คาง ให้หัวดูกลมป่อง
  const chin = c.createRadialGradient(150, 112, 10, 150, 112, 92);
  chin.addColorStop(0, 'rgba(240,150,190,.22)');
  chin.addColorStop(1, 'rgba(240,150,190,0)');
  c.fillStyle = chin;
  c.fillRect(50, 60, 200, 52);
  c.restore();
  stroke(c);
  // เงาวาวหน้าผาก
  c.beginPath();
  c.ellipse(116, 31, 22, 7.5, -0.22, 0, TAU);
  c.fillStyle = 'rgba(255,255,255,.95)';
  c.fill();
  c.beginPath();
  c.arc(145, 25, 3, 0, TAU);
  c.fill();
  // แก้มชมพูฟุ้ง
  for (const x of [96, 204]) {
    const g = c.createRadialGradient(x, 80, 1, x, 80, 15);
    g.addColorStop(0, 'rgba(255,128,174,.6)');
    g.addColorStop(1, 'rgba(255,128,174,0)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x, 80, 15, 9.5, 0, 0, TAU);
    c.fill();
    c.beginPath();
    c.arc(x + 4, 77, 1.6, 0, TAU);
    c.fillStyle = 'rgba(255,255,255,.9)';
    c.fill();
  }
  // จมูกหัวใจกลมมน
  c.beginPath();
  c.moveTo(145, 70.5);
  c.quadraticCurveTo(150, 68, 155, 70.5);
  c.quadraticCurveTo(154, 74.5, 150, 75.5);
  c.quadraticCurveTo(146, 74.5, 145, 70.5);
  c.closePath();
  c.fillStyle = '#FF8DB2';
  c.fill();
  // หนวดโค้ง สองเส้นต่อข้าง
  for (const d of [-1, 1]) {
    const X = (x) => 150 + d * (x - 150);
    c.beginPath();
    c.moveTo(X(78), 70);
    c.quadraticCurveTo(X(66), 65.5, X(54), 66.5);
    stroke(c, 1.9, '#A04E72');
    c.beginPath();
    c.moveTo(X(78), 77);
    c.quadraticCurveTo(X(66), 78.5, X(56), 83);
    stroke(c, 1.9, '#A04E72');
  }
  // โบว์หัวใจที่โคนหูขวา (ทับขอบหัว)
  bow(c, 210, 27, 14, 0.3);
}

/** ตาโตวาว — open 0..1 = ลืมตา (กะพริบ) · wink 0..1 = ตาขวาขยิบ (1) ↔ ลืม (0) */
function drawEyes(c, open, wink) {
  const eye = (x, y, o, side) => {
    if (o < 0.2) {
      // หลับตา = โค้งยิ้มลง
      c.beginPath();
      c.moveTo(x - 10, y + 1);
      c.quadraticCurveTo(x, y + 7, x + 10, y + 1);
      stroke(c, 3.2, INK);
      return;
    }
    c.save();
    c.translate(x, y);
    c.scale(1, o);
    c.beginPath();
    c.ellipse(0, 0, 10.5, 12, 0, 0, TAU);
    const g = c.createLinearGradient(0, -12, 0, 12);
    g.addColorStop(0, '#3E1A34');
    g.addColorStop(0.62, '#5A2A52');
    g.addColorStop(1, '#9A5098');
    c.fillStyle = g;
    c.fill();
    // ประกายในตา: ใหญ่บนขวา · เล็กล่างซ้าย · แสงชมพูโค้งใต้ตา
    c.fillStyle = '#FFFFFF';
    c.beginPath(); c.ellipse(3.6, -4.6, 4.2, 4.6, 0, 0, TAU); c.fill();
    c.beginPath(); c.arc(-4, 4.8, 2, 0, TAU); c.fill();
    c.beginPath();
    c.ellipse(0, 7.5, 5.5, 2.2, 0, 0, Math.PI);
    c.fillStyle = 'rgba(255,170,220,.55)';
    c.fill();
    c.restore();
    // ขนตางอนหางตา
    c.beginPath();
    c.moveTo(x + side * 9.5, y - 6 * o);
    c.quadraticCurveTo(x + side * 14, y - 9 * o, x + side * 15.5, y - 13 * o);
    stroke(c, 2.2, INK);
  };
  eye(115, 60, open, -1);
  if (wink > 0.5) {
    // ตาขยิบ: เส้นโค้งรูป "<" ปลายมน ชี้เข้าหาจมูก
    c.beginPath();
    c.moveTo(195, 51);
    c.quadraticCurveTo(170, 60, 195, 69);
    stroke(c, 3.6, INK);
  } else eye(185, 60, open, 1);
}

/** ปาก ω — meow 0..1 = อ้าปากเหมียว (วงรีชมพูเล็ก ๆ ใต้ ω) */
function drawMouth(c, meow) {
  if (meow > 0.02) {
    c.beginPath();
    c.ellipse(150, 82.5, 5.4, 5 * meow + 0.5, 0, 0, TAU);
    c.fillStyle = '#FF7FA8';
    c.fill();
    stroke(c, 1.8, INK);
  }
  c.beginPath();
  c.moveTo(141, 77.5);
  c.quadraticCurveTo(145.5, 83, 150, 77.5);
  c.quadraticCurveTo(154.5, 83, 159, 77.5);
  stroke(c, 2.2, INK);
}

/** เส้นตื่นเต้นโค้ง ๆ สองข้างหัว (แทนขีดตรงเดิม) — s = ขนาด (เต้นตามจังหวะ) */
function drawMarks(c, s) {
  for (const d of [-1, 1]) {
    const X = (x) => 150 + d * (x - 150);
    for (const [x, y, len, bend] of [[36, 46, 13, 5], [28, 66, 11, 4]]) {
      const cx = X(x), L = len * s;
      c.beginPath();
      c.moveTo(cx + d * 3, y - L / 2);
      c.quadraticCurveTo(cx - d * bend, y, cx + d * 3, y + L / 2);
      stroke(c, 4.6, '#FF78AA');
    }
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
    tail: layer(228, 214, 82, 132, drawTail),
    body: layer(24, 100, 252, 290, drawBody),
    glass: layer(38, 98, 224, 180, drawGlassFront),
    collar: layer(44, 90, 212, 30, drawCollar),
    earL: layer(48, 0, 80, 64, (g) => drawEar(g, -1)),
    earR: layer(172, 0, 80, 64, (g) => drawEar(g, 1)),
    head: layer(48, 4, 204, 110, drawHead),
    caps,
  };
}

const blit = (c, L) => c.drawImage(L.cv, L.x0, L.y0, L.w, L.h);
/** วาดภาพชั้นหมุนรอบจุด (px, py) */
function blitRot(c, L, px, py, a) {
  c.save();
  c.translate(px, py);
  c.rotate(a);
  c.translate(-px, -py);
  blit(c, L);
  c.restore();
}
/** จังหวะเป็นพัก ๆ: คืน 0..1..0 (ขึ้นลงนุ่ม) ในช่วง dur วินาที ทุก period วินาที เริ่มที่ at */
function pulse(t, period, at, dur) {
  const p = (t % period) - at;
  return p > 0 && p < dur ? Math.sin((p / dur) * Math.PI) : 0;
}

/**
 * วาดตู้หนึ่งเฟรม (ctx ตั้งให้ 1 หน่วย = k พิกเซลแล้ว) — t = วินาที · drop 0..1 = แคปซูลหล่นตอนสุ่ม
 * ทุกอย่างขยับเป็นวงรอบ (sin) ไม่สุ่ม ภาพจึงนุ่มต่อเนื่อง
 */
export function drawGumballFrame(c, G, t, drop = 0) {
  c.save();
  c.translate(0, OY);

  // เงานุ่มใต้ตู้ (หดขยายตามจังหวะหายใจ)
  const breath = Math.sin(t * 2.2);
  c.save();
  c.translate(150, 384);
  c.scale(1 + 0.02 * breath, 0.12);
  const sg = c.createRadialGradient(0, 0, 8, 0, 0, 132);
  sg.addColorStop(0, 'rgba(70,20,110,.34)');
  sg.addColorStop(1, 'rgba(70,20,110,0)');
  c.fillStyle = sg;
  c.beginPath();
  c.arc(0, 0, 132, 0, TAU);
  c.fill();
  c.restore();

  // ── ทั้งตู้หายใจ: ยืดขึ้น-ยุบลงเบามาก ยึดฐานไว้กับพื้น ──
  c.save();
  c.translate(150, 382);
  c.scale(1 - 0.006 * breath, 1 + 0.012 * breath);
  c.translate(-150, -382);

  // หัวใจลอยขึ้นจากข้างหัวแล้วจางหาย (สามดวงเหลื่อมจังหวะกัน)
  for (let i = 0; i < 3; i++) {
    const p = (t / 2.6 + i / 3) % 1;
    const a = Math.sin(Math.PI * p);
    if (a < 0.03) continue;
    c.globalAlpha = a;
    heart(c, 266 - i * 8 + Math.sin(t * 2 + i) * 5, 112 - p * 74, 4 + i * 1.6);
    c.fillStyle = i === 1 ? '#FFA3C8' : '#FF7FB2';
    c.fill();
    stroke(c, 1.2);
    c.globalAlpha = 1;
  }
  drawMarks(c, 1 + 0.16 * Math.sin(t * 4.2));
  // ประกายวิบรอบหัว
  for (const [x, y, ph] of [[30, 30, 0], [272, 84, 2.1], [40, 98, 4]]) {
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + ph);
    c.globalAlpha = 0.35 + tw * 0.6;
    sparkle(c, x, y, 3.5 + tw * 2.5, '#FFF6D8');
    c.globalAlpha = 1;
  }

  // หางกระดิกรอบโคน
  blitRot(c, G.tail, TAIL_PIVOT[0], TAIL_PIVOT[1], 0.1 * Math.sin(t * 2.3));

  blit(c, G.body);

  // แคปซูลโยกเบา ๆ ในโหล (ตัดตามรูปโหล)
  c.save();
  jarPath(c, 3);
  c.clip();
  CAP_LIST.forEach(([x, y, r, key], i) => {
    const dx = 1.1 * Math.cos(t * 1.7 + i * 0.9), dy = 1.8 * Math.sin(t * 2.1 + i * 1.3);
    const s = r / 23;
    c.drawImage(G.caps[key].cv, x + dx - 25 * s, y + dy - 25 * s, 50 * s, 50 * s);
  });
  // ดาวระยิบระหว่างแคปซูล
  for (const [x, y, r, ph] of [[84, 142, 5.5, 0], [194, 178, 5, 1.7], [128, 216, 5, 3.1], [230, 144, 4.5, 4.4], [172, 252, 5, 2.2]]) {
    goldStar(c, x, y, r * (0.75 + 0.3 * Math.sin(t * 3 + ph)));
  }
  c.restore();
  blit(c, G.glass);
  blit(c, G.collar);

  // กระดิ่งหัวใจห้อยใต้ปลอกคอ แกว่งเบา ๆ (เหลื่อมจังหวะกับหัว)
  c.save();
  c.translate(150, 110);
  c.rotate(0.16 * Math.sin(t * 2.6 + 0.6));
  c.beginPath();
  c.arc(0, 4, 3.6, 0, TAU);
  stroke(c, 2.2, '#C99428');
  gemHeart(c, 0, 16, 9.5);
  c.restore();

  // หัวเอียงโยก + เด้งเบา ๆ · หูกระดิกเป็นพัก ๆ · ตาซ้ายกะพริบทุก ~3.2 วิ · ขวาขยิบ แล้วลืมตาสั้น ๆ ทุก ~6 วิ · อ้าปากเหมียวทุก ~7 วิ
  const tilt = 0.06 * Math.sin(t * 1.25), bob = -1.6 * Math.abs(Math.sin(t * 1.25));
  c.save();
  c.translate(HEAD_PIVOT[0], HEAD_PIVOT[1] + bob);
  c.rotate(tilt);
  c.translate(-HEAD_PIVOT[0], -HEAD_PIVOT[1]);
  const twL = -0.2 * pulse(t, 4.4, 1.2, 0.36), twR = 0.22 * pulse(t, 5.3, 3.4, 0.36);
  blitRot(c, G.earL, EAR_PIVOT.L[0], EAR_PIVOT.L[1], twL);
  blitRot(c, G.earR, EAR_PIVOT.R[0], EAR_PIVOT.R[1], twR);
  blit(c, G.head);
  const bt = t % 3.2;
  const open = bt < 0.16 ? Math.abs(bt - 0.08) / 0.08 : 1;
  const wt = t % 6;
  drawEyes(c, open, wt > 4.6 && wt < 5.5 ? 0 : 1);
  drawMouth(c, pulse(t, 7, 2.2, 0.7));
  c.restore();

  // อุ้งเท้าเกาะขอบ เคาะสลับซ้ายขวา (ไปกับหัวนิดหน่อย)
  const tap = (ph) => -2.6 * Math.max(0, Math.sin(t * 3.4 + ph));
  paw(c, 80, 104 + tap(0) + bob * 0.4, 19, 13);
  paw(c, 220, 104 + tap(Math.PI) + bob * 0.4, 19, 13);

  // แคปซูลที่ตกออกจากช่องรับของตอนสุ่ม — ไหลออกแล้วเด้งหนึ่งที
  if (drop > 0) {
    const e = Math.min(1, drop / 0.6);
    const y = 336 + 22 * e - (drop > 0.6 ? Math.sin(((drop - 0.6) / 0.4) * Math.PI) * 12 : 0);
    const s = (12 + 4 * e) / 23;
    c.drawImage(G.caps.pink.cv, 150 - 25 * s, y - 25 * s, 50 * s, 50 * s);
  }
  c.restore();
  c.restore();
}
