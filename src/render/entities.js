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

// ── ตัวละคร ──────────────────────────────────────────────────

export function drawPlayer(ctx, player, isDead) {
  const b = player.box;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const sliding = player.sliding;

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

  // ขา
  ctx.strokeStyle = C.doughDark;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  if (sliding) {
    ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(24, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, 9); ctx.lineTo(22, 4); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-4, 12); ctx.lineTo(-4 + swing * 10, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, 12); ctx.lineTo(6 - swing * 10, 24); ctx.stroke();
  }

  // แขน
  ctx.lineWidth = 6;
  if (sliding) {
    ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-22, 6); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-18, -2 - swing * 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(18, -2 + swing * 8); ctx.stroke();
  }

  // ลำตัวคุกกี้
  ctx.fillStyle = C.dough;
  ctx.beginPath();
  if (sliding) ctx.ellipse(0, 0, 24, 14, -0.12, 0, Math.PI * 2);
  else ctx.ellipse(0, -2, 19, 21, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(168,94,46,.55)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // ช็อกชิป
  ctx.fillStyle = C.choc;
  const chips = sliding
    ? [[-12, -3], [6, -6], [13, 3]]
    : [[-11, -12], [9, -9], [-6, 7], [11, 6]];
  for (const [dx, dy] of chips) {
    ctx.beginPath();
    ctx.arc(dx, dy, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // หน้า
  if (isDead) {
    ctx.strokeStyle = C.choc;
    ctx.lineWidth = 2.2;
    for (const [ex, ey] of [[-6, -6], [7, -6]]) {
      ctx.beginPath();
      ctx.moveTo(ex - 3, ey - 3); ctx.lineTo(ex + 3, ey + 3);
      ctx.moveTo(ex + 3, ey - 3); ctx.lineTo(ex - 3, ey + 3);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = C.choc;
    ctx.beginPath();
    ctx.arc(sliding ? 4 : -6, sliding ? -3 : -7, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sliding ? 14 : 7, sliding ? -4 : -7, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.choc;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sliding ? 9 : 0, sliding ? -1 : -2, 5, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}
