// src/render/hud.js
import { VIEW, SPEED, SCORING, HEALTH, COLORS as C } from '../config.js';
import { drawJelly } from './entities.js';

const { W, H } = VIEW;

export function drawHUD(ctx, game) {
  ctx.save();
  ctx.textBaseline = 'top';

  ctx.globalAlpha = 0.62;
  ctx.font = "500 11px 'IBM Plex Sans Thai', sans-serif";
  ctx.fillStyle = C.cream;
  ctx.fillText('คะแนน', 24, 22);
  ctx.fillText('ระยะทาง', 150, 22);
  ctx.globalAlpha = 1;

  ctx.font = '600 24px Mitr, sans-serif';
  ctx.fillText(String(game.score).padStart(5, '0'), 24, 36);

  ctx.font = '600 20px Mitr, sans-serif';
  ctx.fillText(Math.floor(game.distance / SCORING.pxPerMeter) + ' ม.', 150, 39);

  drawJelly(ctx, W - 78, 44, 10);
  ctx.fillStyle = C.cream;
  ctx.font = '600 20px Mitr, sans-serif';
  ctx.fillText('× ' + game.jelly, W - 60, 33);

  // มาตรวัดความเร็ว
  const p = (game.speed - SPEED.start) / (SPEED.max - SPEED.start);
  ctx.fillStyle = 'rgba(255,243,226,.16)';
  ctx.fillRect(24, 72, 180, 5);
  ctx.fillStyle = p > 0.8 ? C.danger : C.mint;
  ctx.fillRect(24, 72, 180 * p, 5);

  ctx.restore();

  drawHealthBar(ctx, game);

  // แฟลชแดงทั้งจอตอนโดนชน วาดท้ายสุดเพื่อให้ทับทุกอย่าง
  if (game.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255,92,110,${0.3 * game.hurtFlash})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/** หลอดพลังกลางจอบน — ตัวเดียวที่ผู้เล่นต้องจ้องตลอดเวลา เลยวางไว้กลาง */
function drawHealthBar(ctx, game) {
  const w = 300;
  const h = 16;
  const x = (W - w) / 2;
  const y = 38;
  const p = Math.max(0, Math.min(1, game.hp / HEALTH.max));
  const low = p <= HEALTH.lowAt;

  ctx.save();
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  ctx.globalAlpha = 0.62;
  ctx.font = "500 11px 'IBM Plex Sans Thai', sans-serif";
  ctx.fillStyle = C.cream;
  ctx.fillText('พลัง', W / 2, 22);
  ctx.globalAlpha = 1;

  // ขอบนอกกับราง
  ctx.fillStyle = 'rgba(27,15,43,.55)';
  ctx.beginPath(); ctx.roundRect(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,243,226,.14)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();

  const fw = w * p;
  if (fw > 0.5) {
    // กะพริบเฉพาะตอนใกล้หมด ให้รู้ตัวโดยไม่ต้องละสายตาจากตัวละคร
    ctx.globalAlpha = low ? 0.55 + Math.sin(game.tick * 0.28) * 0.45 : 1;
    ctx.fillStyle = low ? C.danger : C.mint;
    ctx.beginPath();
    ctx.roundRect(x, y, fw, h, Math.min(h / 2, fw / 2));
    ctx.fill();

    // ไฮไลต์บนให้ดูเป็นหลอดแก้วแทนที่จะเป็นแถบแบน
    if (fw > 10) {
      ctx.globalAlpha *= 0.32;
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 3.5, fw - 8, 4, 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
