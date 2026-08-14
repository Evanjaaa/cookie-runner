// src/render/background.js
import { VIEW, GROUND_Y, COLORS as C } from '../config.js';

const { W, H } = VIEW;

export function drawSky(ctx, camera) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, C.night);
  sky.addColorStop(0.55, C.plum);
  sky.addColorStop(1, C.berry);
  ctx.fillStyle = sky;
  ctx.fillRect(-20, -20, W + 40, GROUND_Y + 20);

  // แสงเตาอบเรืองที่ขอบฟ้า
  const glow = ctx.createRadialGradient(
    W * 0.72, GROUND_Y - 10, 10,
    W * 0.72, GROUND_Y - 10, 300
  );
  glow.addColorStop(0, 'rgba(255,166,87,.42)');
  glow.addColorStop(1, 'rgba(255,166,87,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, GROUND_Y + 10);

  // เกล็ดน้ำตาลลอยในอากาศ
  ctx.fillStyle = 'rgba(255,243,226,.55)';
  for (let i = 0; i < 34; i++) {
    let sx = ((i * 137.5 - camera * 0.06) % (W + 40)) - 20;
    if (sx < 0) sx += W + 40;
    const sy = 24 + ((i * 73) % 150);
    ctx.globalAlpha = 0.25 + (0.6 + Math.sin(camera * 0.01 + i) * 0.4) * 0.35;
    ctx.fillRect(sx, sy, 2.2, 2.2);
  }
  ctx.globalAlpha = 1;
}

function hillLayer(ctx, offset, amp, baseY, color, step) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += step) {
    const t = (x + offset) * 0.0032;
    ctx.lineTo(x, baseY - Math.sin(t) * amp - Math.sin(t * 2.3) * amp * 0.4);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

/** parallax: ยิ่งไกลยิ่งเลื่อนช้า = สมองตีความว่ามีความลึก */
export function drawHills(ctx, camera) {
  hillLayer(ctx, camera * 0.12, 46, 268, C.hillFar, 20);
  hillLayer(ctx, camera * 0.28 + 500, 34, 292, C.hillMid, 16);
  hillLayer(ctx, camera * 0.52 + 1200, 22, 312, C.hillNear, 12);
}

export function drawGround(ctx, pits, camera) {
  // เริ่มจากพื้นเต็มจอ แล้ว "เจาะ" ช่วงที่เป็นหลุมออกทีละอัน
  let solids = [[-40, W + 40]];
  for (const p of pits) {
    const a = p.x - camera;
    const b = a + p.w;
    const next = [];
    for (const [s, e] of solids) {
      if (b <= s || a >= e) { next.push([s, e]); continue; }
      if (a > s) next.push([s, a]);
      if (b < e) next.push([b, e]);
    }
    solids = next;
  }

  for (const [s, e] of solids) {
    const w = e - s;
    ctx.fillStyle = C.ground;   ctx.fillRect(s, GROUND_Y, w, H - GROUND_Y);
    ctx.fillStyle = C.crust;    ctx.fillRect(s, GROUND_Y, w, 22);
    ctx.fillStyle = C.crustTop; ctx.fillRect(s, GROUND_Y, w, 6);

    // เศษคุกกี้บนพื้น
    ctx.fillStyle = 'rgba(91,48,24,.5)';
    for (let x = Math.ceil((s + camera) / 54) * 54; x - camera < e; x += 54) {
      const px = x - camera;
      if (px > s + 8 && px < e - 8) ctx.fillRect(px, GROUND_Y + 11, 7, 5);
    }

    // ขอบหลุม
    ctx.fillStyle = 'rgba(27,15,43,.45)';
    ctx.fillRect(s, GROUND_Y, 4, H - GROUND_Y);
    ctx.fillRect(e - 4, GROUND_Y, 4, H - GROUND_Y);
  }
}
