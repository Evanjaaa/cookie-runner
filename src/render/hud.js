// src/render/hud.js
import { VIEW, SPEED, SCORING, COLORS as C } from '../config.js';
import { drawJelly } from './entities.js';

const { W } = VIEW;

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
}
