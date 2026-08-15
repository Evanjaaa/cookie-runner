// src/render/entities.js
import { VIEW, GROUND_Y, BODY, SHRIMP, COLORS as C } from '../config.js';

const { W } = VIEW;

// ── สิ่งกีดขวาง ──────────────────────────────────────────────

export function drawObstacles(ctx, obstacles, camera) {
  for (const o of obstacles) {
    const x = o.x - camera;
    if (x > W + 40 || x + o.w < -40) continue;
    if (o.kind === 'bar') drawBar(ctx, x, o.y, o.w, o.h);
    else if (o.kind === 'crate') drawCrateStack(ctx, x, o.y, o.w, o.h, o.rows);
    else drawSpike(ctx, x, o.y, o.w, o.h);
  }
}

// ── กล่องลัง ─────────────────────────────────────────────────
// ใช้โทนไม้อ่อน (dough) ตัดขอบเข้ม ไม่ใช้ crust/crustTop เพราะเป็นสีเดียว
// กับแถบพื้น กล่องจะจมหายไปกับพื้นจนมองไม่ออกว่ามีสิ่งกีดขวางอยู่

function drawCrateStack(ctx, x, y, w, h, rows = 1) {
  const rh = h / rows;
  for (let i = 0; i < rows; i++) drawCrate(ctx, x, y + i * rh, w, rh);
}

function drawCrate(ctx, x, y, w, h) {
  ctx.fillStyle = C.dough;
  ctx.fillRect(x, y, w, h);

  // ขอบบนสว่าง ให้ดูมีความหนา
  ctx.fillStyle = '#FFE6B0';
  ctx.fillRect(x, y, w, 4);

  // ไม้ตีขวางบนล่าง
  ctx.fillStyle = C.doughDark;
  ctx.fillRect(x + 3, y + 6, w - 6, 5);
  ctx.fillRect(x + 3, y + h - 11, w - 6, 5);

  // ไม้ค้ำกากบาท
  ctx.strokeStyle = C.doughDark;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 5, y + 10); ctx.lineTo(x + w - 5, y + h - 10);
  ctx.moveTo(x + w - 5, y + 10); ctx.lineTo(x + 5, y + h - 10);
  ctx.stroke();

  // กรอบนอก วาดท้ายสุดให้ทับปลายไม้ทุกเส้น
  ctx.strokeStyle = C.choc;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

function drawSpike(ctx, x, y, w, h) {
  ctx.fillStyle = C.danger;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,243,226,.35)';
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w * 0.66, y + h);
  ctx.lineTo(x + w / 2, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(27,15,43,.35)';
  ctx.fillRect(x - 3, y + h - 4, w + 6, 5);
}

function drawBar(ctx, x, y, w, h) {
  ctx.fillStyle = C.berry;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.danger;
  ctx.fillRect(x, y + h - 8, w, 8);
  ctx.fillStyle = 'rgba(255,243,226,.16)';
  ctx.fillRect(x, y, w, 5);
  // เสาค้ำขึ้นไปนอกจอ
  ctx.fillStyle = 'rgba(58,29,80,.9)';
  ctx.fillRect(x + 10, 0, 12, y);
  ctx.fillRect(x + w - 22, 0, 12, y);
}

// ── เม็ดอาหารแมวรูปปลา ───────────────────────────────────────
// ทุกสัดส่วนคูณจาก r เพื่อให้ตัวเดียวกันนี้ใช้ได้ทั้งในด่านและบน HUD
// หันหน้าไปทางขวา (ทิศที่แมววิ่ง) หางอยู่ซ้าย

export function drawFish(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);

  // เรืองแสงรอบตัว วาดลำตัวกับหางในรอบเดียวกันเพื่อให้ได้ขอบเรืองรูปปลา
  ctx.save();
  ctx.shadowColor = 'rgba(78,205,196,.85)';
  ctx.shadowBlur = 12;

  ctx.fillStyle = C.fishFin;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, 0);
  ctx.lineTo(-r * 1.38, -r * 0.64);
  ctx.lineTo(-r * 1.38, r * 0.64);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = C.fish;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ครีบบน วาดหลังลำตัวเพื่อให้โคนครีบถูกกลบ
  ctx.fillStyle = C.fishFin;
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.6);
  ctx.lineTo(r * 0.16, -r * 1.02);
  ctx.lineTo(r * 0.4, -r * 0.5);
  ctx.closePath();
  ctx.fill();

  // พุงสีอ่อน เยื้องไปทางหัวเล็กน้อย
  ctx.fillStyle = C.fishLite;
  ctx.beginPath();
  ctx.ellipse(r * 0.12, r * 0.22, r * 0.6, r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  // ตากลมโต = ตัวชี้ขาดความน่ารัก
  ctx.fillStyle = C.catInk;
  ctx.beginPath();
  ctx.arc(r * 0.46, -r * 0.14, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath();
  ctx.arc(r * 0.53, -r * 0.23, r * 0.075, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── เม็ดกลม ──────────────────────────────────────────────────

export function drawKibble(ctx, x, y, r) {
  const rr = r * 0.86;   // เล็กกว่าปลาเล็กน้อย แต่รัศมี "เก็บ" ยังเท่าเดิม

  ctx.save();
  ctx.shadowColor = 'rgba(255,140,58,.9)';
  ctx.shadowBlur = 13;
  ctx.fillStyle = C.kibble;
  ctx.beginPath();
  ctx.arc(x, y, rr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // เงาขอบล่าง ทำให้ดูกลมมีน้ำหนักแทนที่จะเป็นจานแบน
  ctx.strokeStyle = C.kibbleDark;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(x, y, rr - 0.9, 0.12 * Math.PI, 0.88 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = C.kibbleLite;
  ctx.beginPath();
  ctx.arc(x - rr * 0.3, y - rr * 0.34, rr * 0.34, 0, Math.PI * 2);
  ctx.fill();
}

// ── กุ้งทอง ──────────────────────────────────────────────────

/** ประกายสี่แฉก ปลายเรียวด้วยเส้นโค้ง ไม่ใช่สามเหลี่ยมแหลม ๆ */
function glint(ctx, x, y, size, alpha) {
  if (size <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = C.glint;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.16, y - size * 0.16, x + size, y);
  ctx.quadraticCurveTo(x + size * 0.16, y + size * 0.16, x, y + size);
  ctx.quadraticCurveTo(x - size * 0.16, y + size * 0.16, x - size, y);
  ctx.quadraticCurveTo(x - size * 0.16, y - size * 0.16, x, y - size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** ตำแหน่งกับจังหวะของประกายแต่ละดวง วนคนละเฟส จะได้ไม่วิบตรงกันทั้งสามดวง */
const GLINTS = [
  { dx: 0.95, dy: -0.85, size: 0.42, phase: 0 },
  { dx: -1.05, dy: 0.6, size: 0.32, phase: 2.1 },
  { dx: 0.25, dy: 0.95, size: 0.26, phase: 4.2 },
];

export function drawShrimp(ctx, x, y, r, t = 0) {
  ctx.save();
  ctx.translate(x, y);

  // เรืองทองรอบตัว เข้มกว่าของกินอื่นเพราะต้องอ่านออกว่า "ของพิเศษ"
  ctx.save();
  ctx.shadowColor = 'rgba(255,193,69,.95)';
  ctx.shadowBlur = 18;

  // ลำตัวโค้งแบบกุ้ง: หลังโก่งขึ้น หัวมนอยู่ขวา ท้องเว้าเข้า
  ctx.fillStyle = C.shrimp;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.1);
  ctx.quadraticCurveTo(-r * 0.15, -r * 0.92, r * 0.7, -r * 0.5);
  ctx.quadraticCurveTo(r * 1.25, r * 0.02, r * 0.58, r * 0.46);
  ctx.quadraticCurveTo(-r * 0.05, r * 0.62, -r * 0.5, r * 0.22);
  ctx.closePath();
  ctx.fill();

  // หางพัด สามแฉกที่ปลายซ้าย
  for (const a of [-0.42, 0, 0.42]) {
    ctx.save();
    ctx.translate(-r * 0.46, r * 0.06);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.16);
    ctx.lineTo(-r * 0.78, -r * 0.3);
    ctx.lineTo(-r * 0.78, r * 0.3);
    ctx.lineTo(0, r * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // ปล้องลำตัว วาดหลังตัวเพื่อให้ทับบนสีพื้น
  ctx.strokeStyle = C.shrimpDark;
  ctx.lineWidth = r * 0.11;
  ctx.lineCap = 'round';
  for (const [sx, sy, ex, ey] of [
    [-r * 0.2, -r * 0.55, -r * 0.26, r * 0.34],
    [r * 0.1, -r * 0.66, r * 0.04, r * 0.44],
    [r * 0.4, -r * 0.66, r * 0.34, r * 0.46],
  ]) {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + ex) / 2 - r * 0.12, (sy + ey) / 2, ex, ey);
    ctx.stroke();
  }

  // แสงตกกระทบบนหลัง ทำให้ดูมันวาวเป็นของพรีเมียม
  ctx.strokeStyle = C.shrimpLite;
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.5);
  ctx.quadraticCurveTo(r * 0.2, -r * 0.72, r * 0.62, -r * 0.42);
  ctx.stroke();

  // ขาเล็ก ๆ ใต้ท้อง
  ctx.strokeStyle = C.shrimpDark;
  ctx.lineWidth = r * 0.075;
  for (const lx of [-r * 0.16, r * 0.06, r * 0.28]) {
    ctx.beginPath();
    ctx.moveTo(lx, r * 0.42);
    ctx.lineTo(lx - r * 0.1, r * 0.68);
    ctx.stroke();
  }

  // หนวดยาวสองเส้นสะบัดไปข้างหน้า
  ctx.strokeStyle = C.shrimpLite;
  ctx.lineWidth = r * 0.07;
  const sway = Math.sin(t * 0.08) * r * 0.12;
  ctx.beginPath();
  ctx.moveTo(r * 0.9, r * 0.06);
  ctx.quadraticCurveTo(r * 1.4, -r * 0.2 + sway, r * 1.75, -r * 0.5 + sway);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.9, r * 0.2);
  ctx.quadraticCurveTo(r * 1.45, r * 0.3 - sway, r * 1.8, r * 0.14 - sway);
  ctx.stroke();

  // ตา
  ctx.fillStyle = C.catInk;
  ctx.beginPath();
  ctx.arc(r * 0.72, -r * 0.16, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath();
  ctx.arc(r * 0.77, -r * 0.22, r * 0.055, 0, Math.PI * 2);
  ctx.fill();

  // ประกายวิบวับ วาดท้ายสุดให้ลอยอยู่เหนือทุกชั้น
  for (const g of GLINTS) {
    const pulse = Math.sin(t * 0.075 + g.phase);
    if (pulse > 0) glint(ctx, r * g.dx, r * g.dy, r * g.size * pulse, pulse * 0.95);
  }

  ctx.restore();
}

// ── แม่เหล็ก ─────────────────────────────────────────────────

export function drawMagnet(ctx, x, y, r, t = 0) {
  ctx.save();
  ctx.translate(x, y);

  // เอียงไปมาเบา ๆ ให้ดูมีชีวิต ไม่ใช่ป้ายติดผนัง
  ctx.rotate(Math.sin(t * 0.05) * 0.16);

  const lw = r * 0.46;          // ความหนาของแท่งแม่เหล็ก
  const rad = r * 0.6;          // รัศมีของส่วนโค้งเกือกม้า
  const legTop = r * 0.1;       // ระดับที่ขาเริ่มตรง
  const legBottom = r * 0.82;   // ปลายขา

  ctx.lineWidth = lw;
  ctx.lineCap = 'butt';

  // ตัวเกือกม้าสีแดง วาดเป็นครึ่งวงกลมคว่ำ + ขาสองข้าง
  ctx.save();
  ctx.shadowColor = 'rgba(232,67,79,.9)';
  ctx.shadowBlur = 15;
  ctx.strokeStyle = C.magnet;
  ctx.beginPath();
  ctx.arc(0, legTop, rad, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-rad, legTop); ctx.lineTo(-rad, legBottom);
  ctx.moveTo(rad, legTop); ctx.lineTo(rad, legBottom);
  ctx.stroke();
  ctx.restore();

  // ไฮไลต์บนส่วนโค้ง ทำให้ดูเป็นโลหะมันแทนที่จะเป็นเส้นแบน
  ctx.strokeStyle = C.magnetLite;
  ctx.lineWidth = lw * 0.3;
  ctx.beginPath();
  ctx.arc(0, legTop, rad + lw * 0.22, Math.PI * 1.12, Math.PI * 1.62);
  ctx.stroke();

  // ปลายขั้วสีเงิน — ตัวบอกว่านี่คือแม่เหล็ก ไม่ใช่เกือกม้าเฉย ๆ
  ctx.strokeStyle = C.magnetSteel;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-rad, legBottom - r * 0.26); ctx.lineTo(-rad, legBottom);
  ctx.moveTo(rad, legBottom - r * 0.26); ctx.lineTo(rad, legBottom);
  ctx.stroke();

  ctx.restore();
}

export function drawMagnets(ctx, magnets, camera, tick) {
  for (const m of magnets) {
    if (m.got) continue;
    const x = m.x - camera;
    if (x > W + 50 || x < -50) continue;
    drawMagnet(ctx, x, m.y + Math.sin(tick * 0.05 + m.x * 0.01) * 5, m.r, tick);
  }
}

/**
 * คลื่นดูดหน้าปากแมวตอนแม่เหล็กทำงาน
 * วาดเป็นส่วนโค้งเปิดไปข้างหน้า ไล่ออกจากปากแล้วจางหาย
 * บอกทั้งว่า "กำลังดูดอยู่" และ "ดูดไปทางไหน" ในภาพเดียว
 */
export function drawSuction(ctx, player, tick) {
  const b = player.box;
  const cx = b.x + b.w / 2 + 14;
  const cy = b.y + b.h / 2 - 6;

  ctx.save();
  ctx.strokeStyle = C.mintLite;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    // แต่ละคลื่นวิ่งเข้าหาปากแล้ววนใหม่ เฟสห่างกันหนึ่งในสาม
    const p = ((tick * 0.035 + i / 3) % 1);
    const rad = 16 + p * 30;
    ctx.globalAlpha = (1 - p) * 0.55;
    ctx.lineWidth = 2.6 * (1 - p * 0.5);
    ctx.beginPath();
    ctx.arc(cx, cy, rad, -0.62, 0.62);
    ctx.stroke();
  }
  ctx.restore();
}

/** วาดของเก็บทั้งแนว ทุกชนิดอยู่ใน array เดียวกัน แยกด้วย kind */
export function drawTreats(ctx, treats, camera, tick = 0) {
  for (const t of treats) {
    if (t.got) continue;
    const x = t.x - camera;
    if (x > W + 50 || x < -50) continue;
    const y = t.y + Math.sin(camera * 0.02 + t.x * 0.01) * 3;
    if (t.kind === 'shrimp') drawShrimp(ctx, x, y, t.r * SHRIMP.scale, tick);
    else if (t.kind === 'kibble') drawKibble(ctx, x, y, t.r);
    else drawFish(ctx, x, y, t.r);
  }
}

// ── ขวดพลังใหญ่ ──────────────────────────────────────────────

export function drawPotions(ctx, potions, camera, tick) {
  for (const p of potions) {
    if (p.got) continue;
    const x = p.x - camera;
    if (x > W + 60 || x < -60) continue;
    drawPotion(ctx, x, p.y + Math.sin(tick * 0.05 + p.x * 0.01) * 5, tick);
  }
}

function drawPotion(ctx, x, y, tick) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 + Math.sin(tick * 0.09) * 0.06, 1 + Math.sin(tick * 0.09) * 0.06);

  // แสงเรืองสีแดง มองเห็นได้แต่ไกลตั้งแต่ยังไม่เข้าจอเต็มตัว
  ctx.save();
  ctx.shadowColor = 'rgba(255,92,110,.9)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'rgba(255,243,226,.3)';
  ctx.beginPath();
  ctx.arc(0, 6, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // น้ำยาข้างใน — clip เป็นวงกลมแล้วเทสี่เหลี่ยมทับ จะได้ผิวน้ำเป็นเส้นตรง
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 6, 12.5, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = C.danger;
  ctx.fillRect(-14, -1, 28, 24);
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.fillRect(-14, -1, 28, 3);
  ctx.restore();

  // คอขวดกับจุกไม้
  ctx.fillStyle = 'rgba(255,243,226,.5)';
  ctx.fillRect(-4.5, -12, 9, 10);
  ctx.fillStyle = C.crustTop;
  ctx.beginPath();
  ctx.roundRect(-6, -18.5, 12, 7, 3);
  ctx.fill();

  // ขอบแก้ว
  ctx.strokeStyle = 'rgba(255,243,226,.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 6, 13.5, 0, Math.PI * 2);
  ctx.stroke();

  // ไฮไลต์แสงสะท้อนบนแก้ว
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath();
  ctx.ellipse(-6, 1.5, 2.4, 4.4, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // หัวใจ บอกว่านี่คือของฟื้นพลัง ไม่ใช่ไอเทมอย่างอื่น
  ctx.fillStyle = C.cream;
  ctx.beginPath();
  ctx.moveTo(0, 11);
  ctx.bezierCurveTo(-7.2, 5.9, -2.8, 1.4, 0, 5.1);
  ctx.bezierCurveTo(2.8, 1.4, 7.2, 5.9, 0, 11);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ── โล่ ──────────────────────────────────────────────────────

/** ไอเทมโล่ที่ลอยอยู่ในด่าน */
export function drawShields(ctx, shields, camera) {
  for (const s of shields) {
    if (s.got) continue;
    const x = s.x - camera;
    if (x > W + 40 || x < -40) continue;
    const y = s.y + Math.sin(camera * 0.02 + s.x * 0.01) * 4;

    ctx.save();
    ctx.shadowColor = 'rgba(255,243,226,.9)';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = C.cream;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(255,243,226,.28)';
    ctx.beginPath();
    ctx.arc(x, y, s.r - 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** วงแหวนหมุนรอบตัวละครตอนมีโล่ */
export function drawShieldRing(ctx, player, tick) {
  const b = player.box;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const pulse = 1 + Math.sin(tick * 0.12) * 0.06;

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = C.cream;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([9, 7]);
  ctx.lineDashOffset = -tick * 0.9;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 32 * pulse, 34 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ── ตัวละคร: แมวน้อย ─────────────────────────────────────────
// จุด (0,0) ของทุกฟังก์ชันข้างล่างคือ "กลางกล่องชน"
// ท่ายืน: เท้าอยู่ y=+23 หัวสุด y=-23  |  ท่าหมอบ: พื้นอยู่ y=+13
// ตัวเลขพวกนี้มาจาก BODY ใน config.js ถ้าแก้ที่นั่นต้องมาขยับที่นี่ด้วย
//
// ทุกฟังก์ชันรับ `s` = ชุดสีจาก skins.js ไม่มีสีแมวฝังตายในโค้ดวาดเลย
// แมวทุกตัวจึงใช้โครงเดียวกัน เพิ่มตัวใหม่ = เพิ่มจานสี ไม่ต้องวาดใหม่

export function drawPlayer(ctx, player, isDead, s, mouthOpen = false) {
  const b = player.box;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;

  ctx.save();

  // เงาใต้ตัว จางลงตามความสูง
  if (!isDead) {
    const air = Math.max(0, GROUND_Y - player.y);
    ctx.globalAlpha = Math.max(0, 0.32 - air / 500);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, GROUND_Y + 4, 22 - air * 0.02, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.translate(cx, cy);
  if (isDead) {
    ctx.rotate(player.tilt);
  } else {
    ctx.rotate(
      player.onGround
        ? Math.sin(player.runPhase * 2) * 0.04
        : Math.max(-0.3, Math.min(0.3, player.vy * 0.016))
    );
  }

  const swing = Math.sin(player.runPhase * 2) * (player.onGround ? 1 : 0.25);
  ctx.lineCap = 'round';

  if (player.sliding) drawCatSlide(ctx, s, { isDead });
  else drawCatStand(ctx, s, { swing, wag: Math.sin(player.runPhase * 2 + 0.9), isDead });

  ctx.restore();
}

/**
 * แมวยืนนิ่ง ๆ สำหรับหน้าแรกและรูปตัวอย่างในเมนู
 * หายใจขึ้นลง หางแกว่งช้า ๆ แล้วกะพริบตาเป็นระยะ — ไม่ใช่ภาพนิ่ง
 * x คือกึ่งกลางตัว ส่วน feetY คือระดับที่เท้าเหยียบ
 */
export function drawCatPose(ctx, x, feetY, scale, s, t = 0) {
  ctx.save();
  ctx.translate(x, feetY - (BODY.standH / 2) * scale + Math.sin(t * 0.045) * 1.8);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  drawCatStand(ctx, s, {
    swing: 0,
    wag: Math.sin(t * 0.038),
    blink: t % 200 < 9,   // กะพริบสั้น ๆ ทุก ~3.3 วินาที
  });
  ctx.restore();
}

/** เฉพาะหัว ใช้เป็นไอคอนในเมนู ซึ่งเล็กเกินกว่าจะเห็นรายละเอียดตัวเต็ม */
export function drawCatFace(ctx, x, y, scale, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  drawCatHead(ctx, 0, 0, s, {});
  ctx.restore();
}

function drawCatStand(ctx, s, { swing = 0, wag = 0, isDead = false, blink = false, mouthOpen = false } = {}) {
  // หางสะบัดสวนจังหวะขา วาดก่อนลำตัวเพื่อให้อยู่ข้างหลัง
  drawTail(ctx, -11, 8, wag, s);

  // ขาหลัง
  ctx.strokeStyle = s.dark;
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-4, 13); ctx.lineTo(-4 + swing * 10, 24); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, 13); ctx.lineTo(6 - swing * 10, 24); ctx.stroke();

  // ขาหน้า
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-8, 3); ctx.lineTo(-16, 3 - swing * 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, 3); ctx.lineTo(16, 3 + swing * 8); ctx.stroke();

  // ลำตัว
  ctx.fillStyle = s.cat;
  ctx.beginPath(); ctx.ellipse(0, 6, 14, 13, 0, 0, Math.PI * 2); ctx.fill();

  // พุงสีครีม
  ctx.fillStyle = s.cream;
  ctx.beginPath(); ctx.ellipse(1, 9, 8, 8, 0, 0, Math.PI * 2); ctx.fill();

  if (s.stripes) {
    ctx.strokeStyle = s.dark;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-11, 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-7, 1); ctx.stroke();
  }

  drawCatHead(ctx, 1, -12, s, { isDead, blink, mouthOpen });
}

function drawCatSlide(ctx, s, { isDead = false, mouthOpen = false } = {}) {
  // หางลากยาวไปข้างหลัง
  ctx.strokeStyle = s.cat;
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(-15, 2);
  ctx.quadraticCurveTo(-27, 1, -31, -7);
  ctx.stroke();
  ctx.fillStyle = s.cream;
  ctx.beginPath(); ctx.arc(-31, -7, 3.4, 0, Math.PI * 2); ctx.fill();

  // ขาหลังเหยียดไปหลัง
  ctx.strokeStyle = s.dark;
  ctx.lineWidth = 6.5;
  ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-23, 9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(-21, 12); ctx.stroke();

  // ลำตัวแบนราบ
  ctx.fillStyle = s.cat;
  ctx.beginPath(); ctx.ellipse(-2, 2, 19, 10, -0.08, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = s.cream;
  ctx.beginPath(); ctx.ellipse(0, 6, 12, 5, -0.05, 0, Math.PI * 2); ctx.fill();

  if (s.stripes) {
    ctx.strokeStyle = s.dark;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(-12, -1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(-5, -2); ctx.stroke();
  }

  // ขาหน้าเหยียดไปข้างหน้า
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(7, 5); ctx.lineTo(22, 9); ctx.stroke();

  drawCatHead(ctx, 12, -4, s, { isDead, scale: 0.82, earsBack: true, mouthOpen });
}

/**
 * หัวแมวพร้อมหู หน้า หนวด — วาดรอบจุด (hx,hy) ที่ส่งเข้ามา
 * earsBack: ตอนหมอบต้องลู่หูไปหลัง ไม่งั้นปลายหูโผล่ทะลุคานตอนลอด
 */
function drawCatHead(ctx, hx, hy, s, { isDead = false, scale = 1, earsBack = false, blink = false, mouthOpen = false } = {}) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(scale, scale);

  // [โคนซ้าย, โคนขวา, ปลาย] ของหูสองข้าง
  const ears = earsBack
    ? [[[-11, -4], [-5, -9], [-23, -9]], [[3, -8], [9, -10], [-8, -16]]]
    : [[[-13, -8], [-3, -8], [-14, -20]], [[3, -8], [13, -8], [14, -20]]];

  // หูนอก วาดก่อนหัวเพื่อให้โคนหูถูกกลบ
  ctx.fillStyle = s.cat;
  for (const [a, b, tip] of ears) {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(b[0], b[1]);
    ctx.closePath(); ctx.fill();
  }

  // หูชั้นใน ย่อเข้าหาจุดกึ่งกลางของหูแต่ละข้าง
  ctx.fillStyle = s.pink;
  for (const [a, b, tip] of ears) {
    const mx = (a[0] + b[0] + tip[0]) / 3;
    const my = (a[1] + b[1] + tip[1]) / 3;
    ctx.beginPath();
    for (const [px, py] of [a, tip, b]) {
      ctx.lineTo(mx + (px - mx) * 0.55, my + (py - my) * 0.55);
    }
    ctx.closePath(); ctx.fill();
  }

  // หัว
  ctx.fillStyle = s.cat;
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();

  if (s.stripes) {
    ctx.strokeStyle = s.dark;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-5, -11); ctx.lineTo(-4, -6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1, -12); ctx.lineTo(2, -7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -10); ctx.lineTo(7, -6); ctx.stroke();
  }

  // ปากสีครีม
  ctx.fillStyle = s.cream;
  ctx.beginPath(); ctx.ellipse(1, 5, 7.5, 5, 0, 0, Math.PI * 2); ctx.fill();

  // แก้มชมพู วาดก่อนตาเพื่อให้อยู่ชั้นล่างสุดของใบหน้า
  if (s.blush) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = s.pink;
    ctx.beginPath(); ctx.ellipse(-9, 3, 3.6, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(11, 3, 3.6, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ตา
  if (isDead) {
    ctx.strokeStyle = s.ink;
    ctx.lineWidth = 2.2;
    for (const ex of [-5, 7]) {
      ctx.beginPath();
      ctx.moveTo(ex - 3, -4); ctx.lineTo(ex + 3, 2);
      ctx.moveTo(ex + 3, -4); ctx.lineTo(ex - 3, 2);
      ctx.stroke();
    }
  } else if (blink) {
    // ตาหลับเป็นรูปโค้งคว่ำ อ่านเป็น "หลับตายิ้ม" ไม่ใช่หลับตาเฉย ๆ
    ctx.strokeStyle = s.ink;
    ctx.lineWidth = 2;
    for (const ex of [-5, 7]) {
      ctx.beginPath(); ctx.arc(ex, 0, 3.2, Math.PI, 0, true); ctx.stroke();
    }
  } else {
    ctx.fillStyle = s.ink;
    ctx.beginPath(); ctx.arc(-5, -1, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -1, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';   // ประกายตา
    ctx.beginPath(); ctx.arc(-3.9, -2.1, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8.1, -2.1, 1.1, 0, Math.PI * 2); ctx.fill();
  }

  // จมูก
  ctx.fillStyle = s.pink;
  ctx.beginPath();
  ctx.moveTo(-2, 2.5); ctx.lineTo(4, 2.5); ctx.lineTo(1, 5.5);
  ctx.closePath(); ctx.fill();

  if (mouthOpen) {
    // อ้าปากกว้างตอนแม่เหล็กทำงาน — ช่องปากเข้มพร้อมลิ้น
    // วาดทับปากสีครีมได้เลย เพราะปากที่อ้าอยู่บังส่วนนั้นจริง ๆ
    ctx.fillStyle = s.ink;
    ctx.beginPath(); ctx.ellipse(1, 7.5, 6.8, 5.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = s.pink;
    ctx.beginPath(); ctx.ellipse(1, 10, 4.2, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    // ปากรูป ω
    ctx.strokeStyle = s.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-1.4, 6, 2.6, 0, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(3.4, 6, 2.6, 0, Math.PI); ctx.stroke();
  }

  // หนวด — สีมาจากสกิน เพราะหนวดครีมบนหน้าแมวขาวจะมองไม่เห็นเลย
  ctx.strokeStyle = s.whisker;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-7, 4); ctx.lineTo(-16, 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-7, 6.5); ctx.lineTo(-16, 7.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9, 4); ctx.lineTo(18, 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9, 6.5); ctx.lineTo(18, 7.5); ctx.stroke();

  ctx.restore();
}

/** หางโค้งพร้อมปลายครีม wag = -1..1 คุมการสะบัด */
function drawTail(ctx, x, y, wag, s) {
  const tipX = x - 19;
  const tipY = y - 12 + wag * 7;

  ctx.strokeStyle = s.cat;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 17, y + 3 + wag * 5, tipX, tipY);
  ctx.stroke();

  ctx.fillStyle = s.cream;
  ctx.beginPath(); ctx.arc(tipX, tipY, 3.6, 0, Math.PI * 2); ctx.fill();
}
