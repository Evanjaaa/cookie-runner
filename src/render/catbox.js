// src/render/catbox.js
// ─────────────────────────────────────────────────────────────
// กล่องน้องแมวระหว่างวิ่ง + ลูกแมวที่วิ่งตามหลังน้อง
//
// กล่องกระดาษใบเก่าตั้งอยู่ริมทาง ฝาเปิดแง้ม มีหูเล็ก ๆ โผล่ออกมา
// ไม่ต้องกดเก็บ — แค่วิ่งผ่าน ลูกแมวก็กระโดดออกมาแล้ววิ่งตาม (ดู game.js)
// ─────────────────────────────────────────────────────────────
import { GROUND_Y } from '../config.js';
import { drawPlayer } from './entities.js';

const LINE = '#5C3B26';
const CARD = '#D8A564';
const CARD_DARK = '#B07D42';
const CARD_LIGHT = '#EBC488';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * กล่องหนึ่งใบ (x = กลางกล่อง, y = พื้น)
 * @param open 0-1 ฝาเปิด — ตอนน้องเพิ่งกระโดดออก ฝาสะบัดกางออก
 */
export function drawCatBox(ctx, x, y, t, open = 0, ears = null) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2.2;

  // เงา
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath(); ctx.ellipse(0, 3, 34, 6, 0, 0, Math.PI * 2); ctx.fill();

  // ข้างใน
  rr(ctx, -28, -40, 56, 14, 3);
  ctx.fillStyle = '#7E5530'; ctx.fill(); ctx.stroke();

  // หูลูกแมวโผล่ขอบกล่อง กระดิกเบา ๆ (ยังไม่ได้พบ)
  if (ears && open < 0.2) {
    const tw = Math.sin(t * 0.12) * 0.12;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 9, -36);
      ctx.rotate(side * (0.2 + tw));
      ctx.beginPath();
      ctx.moveTo(-6, 4); ctx.lineTo(0, -10); ctx.lineTo(6, 4); ctx.closePath();
      ctx.fillStyle = ears.cat; ctx.fill(); ctx.stroke();
      ctx.fillStyle = ears.pink;
      ctx.beginPath(); ctx.moveTo(-3, 3); ctx.lineTo(0, -5); ctx.lineTo(3, 3); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  // ตัวกล่อง
  rr(ctx, -30, -34, 60, 34, 3);
  ctx.fillStyle = CARD; ctx.fill(); ctx.stroke();
  // ฝาสองข้าง
  const a = 0.35 + open * 0.9;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 30, -34);
    ctx.rotate(side * a);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(side * 22, -6); ctx.lineTo(side * 20, 4); ctx.lineTo(0, 6); ctx.closePath();
    ctx.fillStyle = CARD_LIGHT; ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // เทปกับรอยเท้า
  ctx.strokeStyle = CARD_DARK;
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-20, -20); ctx.lineTo(4, -20); ctx.stroke();
  ctx.fillStyle = CARD_DARK;
  ctx.beginPath(); ctx.ellipse(16, -12, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(12 + i * 4, -19, 1.8, 0, Math.PI * 2); ctx.fill();
  }

  // ประกายเรียกสายตา — กล่องหายาก ต้องเห็นตั้งแต่ไกล
  if (open < 0.2) {
    const k = (Math.sin(t * 0.1) + 1) / 2;
    ctx.fillStyle = `rgba(255,236,150,${0.5 + k * 0.5})`;
    for (const [sx, sy, r] of [[-34, -50, 4], [36, -44, 3], [0, -62, 3.5]]) {
      ctx.beginPath();
      ctx.moveTo(sx, sy - r * 2); ctx.lineTo(sx + r * 0.5, sy); ctx.lineTo(sx, sy + r * 2); ctx.lineTo(sx - r * 0.5, sy);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx - r * 2, sy); ctx.lineTo(sx, sy + r * 0.5); ctx.lineTo(sx + r * 2, sy); ctx.lineTo(sx, sy - r * 0.5);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

/** กล่องทั้งหมดในด่าน (พิกัดโลก) */
export function drawCatBoxes(ctx, boxes, camera, t, ears) {
  for (const b of boxes) {
    const sx = b.x - camera;
    if (sx < -80 || sx > 1100) continue;
    drawCatBox(ctx, sx, b.y, t, b.open || 0, ears);
  }
}

/**
 * ลูกแมวที่วิ่งตามหลังน้อง
 * k = { x (จอ), y (เท้า), phase, air } — ใช้ท่าวิ่งด้านข้างตัวเดียวกับน้อง ย่อส่วนลง
 */
export function drawKitten(ctx, k, skin) {
  ctx.save();
  ctx.translate(k.x, k.y - GROUND_Y);
  const fake = {
    box: { x: -20, y: GROUND_Y - 46, w: 40, h: 46 },
    y: GROUND_Y,
    runPhase: k.phase,
    onGround: !k.air,
    vy: k.air ? k.vy : 0,
    tilt: 0, squash: 0, tailLag: Math.sin(k.phase) * 0.3, sliding: false,
  };
  drawPlayer(ctx, fake, false, skin, false, 0, 'happy', 0.62, 1.15);
  ctx.restore();
}
