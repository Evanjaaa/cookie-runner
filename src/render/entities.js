// src/render/entities.js
import { VIEW, GROUND_Y, COLORS as C } from '../config.js';

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

/** วาดของเก็บทั้งแนว ทั้งปลาและเม็ดกลมอยู่ใน array เดียวกัน แยกด้วย kind */
export function drawTreats(ctx, treats, camera) {
  for (const t of treats) {
    if (t.got) continue;
    const x = t.x - camera;
    if (x > W + 30 || x < -30) continue;
    const y = t.y + Math.sin(camera * 0.02 + t.x * 0.01) * 3;
    if (t.kind === 'kibble') drawKibble(ctx, x, y, t.r);
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

// ── ตัวละคร: แมวน้อยสีส้ม ────────────────────────────────────
// จุด (0,0) ของทุกฟังก์ชันข้างล่างคือ "กลางกล่องชน"
// ท่ายืน: เท้าอยู่ y=+23 หัวสุด y=-23  |  ท่าหมอบ: พื้นอยู่ y=+13
// ตัวเลขพวกนี้มาจาก BODY ใน config.js ถ้าแก้ที่นั่นต้องมาขยับที่นี่ด้วย

export function drawPlayer(ctx, player, isDead) {
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

  if (player.sliding) drawCatSlide(ctx, isDead);
  else drawCatStand(ctx, swing, player.runPhase, isDead);

  ctx.restore();
}

function drawCatStand(ctx, swing, phase, isDead) {
  // หางสะบัดสวนจังหวะขา วาดก่อนลำตัวเพื่อให้อยู่ข้างหลัง
  drawTail(ctx, -11, 8, Math.sin(phase * 2 + 0.9));

  // ขาหลัง
  ctx.strokeStyle = C.catDark;
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-4, 13); ctx.lineTo(-4 + swing * 10, 24); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, 13); ctx.lineTo(6 - swing * 10, 24); ctx.stroke();

  // ขาหน้า
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-8, 3); ctx.lineTo(-16, 3 - swing * 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, 3); ctx.lineTo(16, 3 + swing * 8); ctx.stroke();

  // ลำตัว
  ctx.fillStyle = C.cat;
  ctx.beginPath(); ctx.ellipse(0, 6, 14, 13, 0, 0, Math.PI * 2); ctx.fill();

  // พุงสีครีม
  ctx.fillStyle = C.catCream;
  ctx.beginPath(); ctx.ellipse(1, 9, 8, 8, 0, 0, Math.PI * 2); ctx.fill();

  // ลายบนหลัง
  ctx.strokeStyle = C.catDark;
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-11, 3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-7, 1); ctx.stroke();

  drawCatHead(ctx, 1, -12, isDead);
}

function drawCatSlide(ctx, isDead) {
  // หางลากยาวไปข้างหลัง
  ctx.strokeStyle = C.cat;
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(-15, 2);
  ctx.quadraticCurveTo(-27, 1, -31, -7);
  ctx.stroke();
  ctx.fillStyle = C.catCream;
  ctx.beginPath(); ctx.arc(-31, -7, 3.4, 0, Math.PI * 2); ctx.fill();

  // ขาหลังเหยียดไปหลัง
  ctx.strokeStyle = C.catDark;
  ctx.lineWidth = 6.5;
  ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-23, 9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(-21, 12); ctx.stroke();

  // ลำตัวแบนราบ
  ctx.fillStyle = C.cat;
  ctx.beginPath(); ctx.ellipse(-2, 2, 19, 10, -0.08, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.catCream;
  ctx.beginPath(); ctx.ellipse(0, 6, 12, 5, -0.05, 0, Math.PI * 2); ctx.fill();

  // ลายบนหลัง
  ctx.strokeStyle = C.catDark;
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(-12, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(-5, -2); ctx.stroke();

  // ขาหน้าเหยียดไปข้างหน้า
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(7, 5); ctx.lineTo(22, 9); ctx.stroke();

  drawCatHead(ctx, 12, -4, isDead, 0.82, true);
}

/**
 * หัวแมวพร้อมหู หน้า หนวด — วาดรอบจุด (hx,hy) ที่ส่งเข้ามา
 * earsBack: ตอนหมอบต้องลู่หูไปหลัง ไม่งั้นปลายหูโผล่ทะลุคานตอนลอด
 */
function drawCatHead(ctx, hx, hy, isDead, scale = 1, earsBack = false) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(scale, scale);

  // [โคนซ้าย, โคนขวา, ปลาย] ของหูสองข้าง
  const ears = earsBack
    ? [[[-11, -4], [-5, -9], [-23, -9]], [[3, -8], [9, -10], [-8, -16]]]
    : [[[-13, -8], [-3, -8], [-14, -20]], [[3, -8], [13, -8], [14, -20]]];

  // หูนอก วาดก่อนหัวเพื่อให้โคนหูถูกกลบ
  ctx.fillStyle = C.cat;
  for (const [a, b, tip] of ears) {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(b[0], b[1]);
    ctx.closePath(); ctx.fill();
  }

  // หูชั้นใน ย่อเข้าหาจุดกึ่งกลางของหูแต่ละข้าง
  ctx.fillStyle = C.catPink;
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
  ctx.fillStyle = C.cat;
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();

  // ลายบนหน้าผาก
  ctx.strokeStyle = C.catDark;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-5, -11); ctx.lineTo(-4, -6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1, -12); ctx.lineTo(2, -7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(7, -10); ctx.lineTo(7, -6); ctx.stroke();

  // ปากสีครีม
  ctx.fillStyle = C.catCream;
  ctx.beginPath(); ctx.ellipse(1, 5, 7.5, 5, 0, 0, Math.PI * 2); ctx.fill();

  // ตา
  if (isDead) {
    ctx.strokeStyle = C.catInk;
    ctx.lineWidth = 2.2;
    for (const ex of [-5, 7]) {
      ctx.beginPath();
      ctx.moveTo(ex - 3, -4); ctx.lineTo(ex + 3, 2);
      ctx.moveTo(ex + 3, -4); ctx.lineTo(ex - 3, 2);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = C.catInk;
    ctx.beginPath(); ctx.arc(-5, -1, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -1, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';   // ประกายตา
    ctx.beginPath(); ctx.arc(-3.9, -2.1, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8.1, -2.1, 1.1, 0, Math.PI * 2); ctx.fill();
  }

  // จมูก
  ctx.fillStyle = C.catPink;
  ctx.beginPath();
  ctx.moveTo(-2, 2.5); ctx.lineTo(4, 2.5); ctx.lineTo(1, 5.5);
  ctx.closePath(); ctx.fill();

  // ปากรูป ω
  ctx.strokeStyle = C.catInk;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(-1.4, 6, 2.6, 0, Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.arc(3.4, 6, 2.6, 0, Math.PI); ctx.stroke();

  // หนวด
  ctx.strokeStyle = 'rgba(255,243,226,.7)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-7, 4); ctx.lineTo(-16, 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-7, 6.5); ctx.lineTo(-16, 7.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9, 4); ctx.lineTo(18, 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9, 6.5); ctx.lineTo(18, 7.5); ctx.stroke();

  ctx.restore();
}

/** หางโค้งพร้อมปลายครีม wag = -1..1 คุมการสะบัด */
function drawTail(ctx, x, y, wag) {
  const tipX = x - 19;
  const tipY = y - 12 + wag * 7;

  ctx.strokeStyle = C.cat;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 17, y + 3 + wag * 5, tipX, tipY);
  ctx.stroke();

  ctx.fillStyle = C.catCream;
  ctx.beginPath(); ctx.arc(tipX, tipY, 3.6, 0, Math.PI * 2); ctx.fill();
}
