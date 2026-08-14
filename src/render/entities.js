// src/render/entities.js
import { VIEW, GROUND_Y, COLORS as C } from '../config.js';

const { W } = VIEW;

// ── สิ่งกีดขวาง ──────────────────────────────────────────────

export function drawObstacles(ctx, obstacles, camera) {
  for (const o of obstacles) {
    const x = o.x - camera;
    if (x > W + 40 || x + o.w < -40) continue;
    if (o.bar) drawBar(ctx, x, o.y, o.w, o.h);
    else drawSpike(ctx, x, o.y, o.w, o.h);
  }
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

// ── เจลลี่ ───────────────────────────────────────────────────

export function drawJelly(ctx, x, y, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(78,205,196,.85)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = C.mint;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = C.mintLite;
  ctx.beginPath();
  ctx.arc(x - r * 0.28, y - r * 0.32, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCoins(ctx, coins, camera) {
  for (const c of coins) {
    if (c.got) continue;
    const x = c.x - camera;
    if (x > W + 30 || x < -30) continue;
    drawJelly(ctx, x, c.y + Math.sin(camera * 0.02 + c.x * 0.01) * 3, c.r);
  }
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
