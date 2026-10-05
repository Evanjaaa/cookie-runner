// src/render/catbox.js
// ─────────────────────────────────────────────────────────────
// กล่องน้องแมวระหว่างวิ่ง + ฉากพบน้อง + ลูกแมวในเป้อุ้มบนหลังน้อง
//
// กล่องกระดาษใบเก่าตั้งอยู่ริมทาง ฝาเปิดแง้ม มีหูเล็ก ๆ โผล่ออกมา
// ไม่ต้องกดเก็บ — แค่วิ่งผ่าน ลูกแมวก็กระโดดออกมาแล้ววิ่งตาม (ดู game.js)
// ─────────────────────────────────────────────────────────────
import { GROUND_Y } from '../config.js';
import { drawCatPose } from './entities.js';

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
 * กล่องแมวบนหน้าแรก — ทางเข้า "บ้านลูกเหมียว" (แทนปุ่มบ้านน้องในแถวขวา)
 * กล่องกระดาษเปิดฝา ผ้าห่มชมพูข้างใน หัวใจกับรอยเท้าหน้ากล่อง
 * ออร่าเรืองเป็นจังหวะหายใจ + ประกายลอยขึ้น = บอกว่า "แตะได้"
 * @param pop 0-1 ตอนเพิ่งถูกแตะ — กล่องเด้งขยาย ฝากางออก (ไล่ลงเองจากผู้เรียก)
 */
export function drawHomeBox(ctx, x, y, t, pop = 0) {
  const breathe = (Math.sin(t * 0.06) + 1) / 2;
  ctx.save();
  ctx.translate(x, y);

  // ── ออร่า: วงแสงอุ่นหลังกล่อง หายใจเข้าออก ──
  const r = 74 + breathe * 10 + pop * 20;
  const g = ctx.createRadialGradient(0, -34, 8, 0, -34, r);
  g.addColorStop(0, `rgba(255,236,160,${0.5 + breathe * 0.25})`);
  g.addColorStop(0.55, `rgba(255,190,225,${0.22 + breathe * 0.12})`);
  g.addColorStop(1, 'rgba(255,190,225,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, -34, r, 0, Math.PI * 2); ctx.fill();

  // ประกายลอยขึ้นจากกล่องวนเรื่อย ๆ
  for (let i = 0; i < 5; i++) {
    const ph = (t * 0.008 + i / 5) % 1;
    const sx = Math.sin(i * 2.3) * 34 + Math.sin(t * 0.03 + i) * 4;
    const sy = -40 - ph * 70;
    const sr = (1 - ph) * 3.6 + 1.2;
    ctx.globalAlpha = Math.sin(ph * Math.PI);
    ctx.fillStyle = i % 2 ? '#FFF3B0' : '#FFD1E6';
    ctx.beginPath();
    ctx.moveTo(sx, sy - sr * 2); ctx.lineTo(sx + sr * 0.5, sy); ctx.lineTo(sx, sy + sr * 2); ctx.lineTo(sx - sr * 0.5, sy); ctx.closePath();
    ctx.moveTo(sx - sr * 2, sy); ctx.lineTo(sx, sy + sr * 0.5); ctx.lineTo(sx + sr * 2, sy); ctx.lineTo(sx, sy - sr * 0.5); ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── กล่อง ── เด้งตามจังหวะหายใจนิดหนึ่ง + เด้งแรงตอนถูกแตะ
  const k = 1 + breathe * 0.02 + Math.sin(pop * Math.PI) * 0.12;
  ctx.scale(k, k);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2.2;
  const W = 46, H = 40, top = -H, back = top - 12;

  // เงา
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath(); ctx.ellipse(0, 3, 52, 8, 0, 0, Math.PI * 2); ctx.fill();
  // ฝาหลังตั้งชัน
  ctx.beginPath();
  ctx.moveTo(-W + 6, back); ctx.lineTo(-W + 12, back - 30 - pop * 6);
  ctx.lineTo(W - 12, back - 30 - pop * 6); ctx.lineTo(W - 6, back); ctx.closePath();
  ctx.fillStyle = CARD_LIGHT; ctx.fill(); ctx.stroke();
  // ปากกล่อง (ด้านในเข้ม) + ผ้าห่มชมพู
  ctx.beginPath();
  ctx.moveTo(-W, top); ctx.lineTo(-W + 6, back); ctx.lineTo(W - 6, back); ctx.lineTo(W, top); ctx.closePath();
  ctx.fillStyle = '#8C6136'; ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-W + 8, back + 2);
  ctx.quadraticCurveTo(-16, back - 6, 0, back + 3);
  ctx.quadraticCurveTo(18, back - 5, W - 8, back + 2);
  ctx.lineTo(W - 4, top); ctx.lineTo(-W + 4, top); ctx.closePath();
  ctx.fillStyle = '#FFD3E1'; ctx.fill();
  ctx.lineWidth = 1.4; ctx.stroke(); ctx.lineWidth = 2.2;
  // ฝาข้างกางออก (กางกว้างขึ้นตอนถูกแตะ)
  for (const side of [-1, 1]) {
    const open = 18 + pop * 10;
    ctx.beginPath();
    ctx.moveTo(side * W, top);
    ctx.lineTo(side * (W + open), top - 16 - pop * 4);
    ctx.lineTo(side * (W + open - 4), top - 26 - pop * 6);
    ctx.lineTo(side * (W - 4), top - 12);
    ctx.closePath();
    ctx.fillStyle = CARD_LIGHT; ctx.fill(); ctx.stroke();
  }
  // ผนังหน้า
  ctx.beginPath();
  ctx.moveTo(-W + 3, top); ctx.lineTo(W - 3, top);
  ctx.arcTo(W, top, W, top + 3, 3); ctx.lineTo(W, -3);
  ctx.arcTo(W, 0, W - 3, 0, 3); ctx.lineTo(-W + 3, 0);
  ctx.arcTo(-W, 0, -W, -3, 3); ctx.lineTo(-W, top + 3);
  ctx.arcTo(-W, top, -W + 3, top, 3); ctx.closePath();
  ctx.fillStyle = CARD; ctx.fill(); ctx.stroke();
  // ฝาหน้าพับห้อย
  ctx.beginPath();
  ctx.moveTo(-W + 2, top); ctx.lineTo(W - 2, top); ctx.lineTo(W - 6, top + 13); ctx.lineTo(-W + 6, top + 13); ctx.closePath();
  ctx.fillStyle = CARD_LIGHT; ctx.fill(); ctx.stroke();
  // เทป + หัวใจ + รอยเท้า
  ctx.fillStyle = 'rgba(255,240,205,.7)';
  ctx.fillRect(-7, top + 13, 14, H - 15);
  ctx.save();
  ctx.translate(-22, top + 26);
  ctx.beginPath();
  ctx.moveTo(0, 7); ctx.bezierCurveTo(-9, 1, -7, -7, 0, -3); ctx.bezierCurveTo(7, -7, 9, 1, 0, 7); ctx.closePath();
  ctx.fillStyle = '#FF8FB8'; ctx.fill(); ctx.lineWidth = 1.6; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = CARD_DARK;
  ctx.beginPath(); ctx.ellipse(24, top + 28, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(20 + i * 4, top + 21, 1.8, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}


/**
 * เป้อุ้มลูกแมวบนหลังน้องตัวหลัก (แบบเป้อุ้มเด็ก) — พิกัดของ "ตัวน้อง" (หน่วยตัวแมว)
 * วาดจากข้างใน drawPlayer (fx.back / fx.front) เป้จึงเอียง หมุน ยืด ตามตัวทุกท่า
 * (เดิมวาดแยกในพิกัดจอ ตอนตัวเอียงหรือหมุนช่วงโบนัส เป้เลยค้างลอยอยู่ที่เดิม)
 * น้องวิ่งไปทางขวา "ข้างหลัง" จึงอยู่ทางซ้าย ลูกแมวนั่งเยื้องซ้าย โผล่หัวพ้นไหล่
 *   feetY    ระดับเท้าในพิกัดตัว (กลางกล่องชน = 0)
 */
function seatLocal(feetY, sliding) {
  // หมอบ: ลำตัวเป็นวงรีนอนกลาง (-2, feetY-11) กว้าง 19 สูง 10 — ลูกแมวนั่งบนแผ่นหลังพอดี
  // ไม่จมกลางตัว (เดิม y = feetY-12 ผ้าห่อไปอยู่กลางลำตัว เห็นเป็นก้อนลอยแปะข้างตัว)
  if (sliding) return { x: -8, y: feetY - 21, chest: { x: 5, y: feetY - 11 }, low: true };
  return { x: -19, y: feetY - 24, chest: { x: 0, y: feetY - 17 }, low: false };
}

/** ตำแหน่งที่นั่งในเป้เป็นพิกัดจอ — ใช้กับฉากพบน้อง (ลูกแมวกระโดดมาหาจุดนี้) */
function carrierSeat(player, scale) {
  const b = player.box;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const L = seatLocal(b.h / 2, player.sliding);
  return { x: cx + L.x * scale, y: cy + L.y * scale };
}

// สายรัดตัวสีเดียวกับผ้าห่อลูกแมว (เดิมเป็นมิ้น ดูเป็นของคนละชิ้นกับผ้า)
const SLING = { cloth: '#FF9EC0', clothDark: '#E0709A', trim: '#FFE3EE', strap: '#FF9EC0', line: '#5C3B26' };

/**
 * ชั้นหลัง: ลูกแมวในผ้าห่อ — วาด "ก่อน" ตัวน้อง ตัวน้องจึงบังช่วงที่อยู่ข้างหลังลำตัวจริง
 * @param land 0-1 ช่วงเพิ่งกระโดดลงเป้ — ตัวยุบลงในผ้าแล้วเด้งขึ้น (1 = เพิ่งถึง)
 */
export function drawCarrierBack(ctx, feetY, sliding, skin, t, runPhase, land = 0) {
  if (!skin) return;
  const seat = seatLocal(feetY, sliding);
  const size = 0.58;
  const bob = Math.sin(runPhase * 2 + 0.6) * 1.8 + Math.sin(land * Math.PI * 2) * 3 * land;
  const y = seat.y + bob;
  drawCatPose(ctx, seat.x, y + 8 * size, size, skin, t, {
    shape: { sit: 1, tilt: -0.1 + Math.sin(t * 0.09) * 0.07, wag: 0.4 + Math.sin(t * 0.15) * 0.4 },
    k: 1,
    mood: 'happy',
  });
  const w = 15;
  const top = y - 6;
  const bot = y + 9;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(seat.x - w, top);
  ctx.quadraticCurveTo(seat.x, top + 3, seat.x + w, top - 1);
  ctx.lineTo(seat.x + w * 0.9, bot - 4);
  ctx.quadraticCurveTo(seat.x, bot + 6, seat.x - w * 0.95, bot - 3);
  ctx.closePath();
  ctx.fillStyle = SLING.cloth;
  ctx.fill();
  ctx.strokeStyle = SLING.line;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = SLING.trim;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(seat.x - w + 2, top + 1.6);
  ctx.quadraticCurveTo(seat.x, top + 4.4, seat.x + w - 2, top + 0.6);
  ctx.stroke();
  ctx.fillStyle = SLING.trim;
  for (const [dx, dy] of [[-7, 4], [1, 6], [-2, 1.5], [6, 3]]) {
    ctx.beginPath(); ctx.arc(seat.x + dx, y + dy, 1.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.translate(seat.x - 6, y + 1);
  ctx.beginPath();
  ctx.moveTo(0, 2.4); ctx.bezierCurveTo(-3.4, 0.4, -2.4, -2.4, 0, -1); ctx.bezierCurveTo(2.4, -2.4, 3.4, 0.4, 0, 2.4);
  ctx.fillStyle = SLING.clothDark;
  ctx.fill();
  ctx.restore();
}

/** ชั้นหน้า: สายเป้พาดหน้าอกน้อง — วาด "หลัง" ตัวน้อง (สายบ่าเฉียง + สายคาดเอว + หัวเข็มขัด) */
export function drawCarrierFront(ctx, feetY, sliding) {
  const seat = seatLocal(feetY, sliding);
  const c = seat.chest;
  ctx.save();
  ctx.lineCap = 'round';
  const band = (x0, y0, cx1, cy1, x1, y1, w) => {
    for (const [col, k] of [[SLING.line, 1], [SLING.strap, 0.72]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w * k;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx1, cy1, x1, y1); ctx.stroke();
    }
  };
  if (seat.low) {
    // ท่าหมอบ: สายวงรอบลำตัวช่วงอก โค้งตามหน้าตัดของลำตัว (บนหลัง → ใต้ท้อง)
    // แนบผิวพอดี ไม่ใช่เส้นตรงพาดลอยกลางตัว · ผ้าห่อนั่งบนหลังจึงต่อกับสายเป็นชิ้นเดียว
    band(c.x - 3, c.y - 9, c.x + 6, c.y + 1, c.x + 1, c.y + 10, 4.2);
    band(c.x - 16, c.y - 6, c.x - 8, c.y - 11, c.x - 2, c.y - 9, 3.6);
    ctx.fillStyle = '#FFE48A';
    ctx.strokeStyle = SLING.line;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(c.x + 3.6, c.y + 1, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else {
    band(c.x - 14, c.y + 6, c.x, c.y + 9, c.x + 13, c.y + 5, 4);
    band(c.x + 10, c.y - 8, c.x + 2, c.y - 1, c.x - 13, c.y + 4, 4.6);
    ctx.fillStyle = '#FFE48A';
    ctx.strokeStyle = SLING.line;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(c.x + 3, c.y - 2.6, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/**
 * ฉากพบน้อง (ก่อนขี่คอ) — ลูกแมวโผล่จากกล่องแล้วกระโดดโค้งไปหาน้อง
 * @param game ตัวเกม (อ่าน boxScene / camera / player)
 */
export function drawBoxScene(ctx, game, skin) {
  const sc = game.boxScene;
  if (!skin || !sc) return;
  const t = sc.t;
  if (t < 40) return;
  const bx = sc.box.x - game.camera;
  const by = GROUND_Y - 30;
  if (t < 130) {
    // โผล่พรวดจากกล่อง เด้งเกินแล้วดึงกลับ (easeOutBack) แล้วโยกตัวดีใจ
    const k = Math.min(1, (t - 40) / 24);
    const back = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
    const rise = 30 * back + (t > 64 ? Math.abs(Math.sin((t - 64) * 0.16)) * 6 : 0);
    // ตัดภาพลูกแมวที่ขอบปากกล่อง — ช่วงล่างยังอยู่ในกล่อง
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx - 60, by - 200, 120, 200 - 4);
    ctx.clip();
    drawCatPose(ctx, bx, by + 30 - rise, 0.95, skin, t, {
      shape: { sit: 1, chirp: t > 70 && t < 120 ? 1 : 0, ear: -0.4, tilt: Math.sin(t * 0.1) * 0.1 },
      k: 1,
      mood: t > 64 ? 'starry' : 'happy',
    });
    ctx.restore();
    // อุ้งเท้าหน้าเกาะขอบกล่อง
    if (t > 56) {
      for (const dx of [-11, 11]) {
        ctx.fillStyle = skin.cream;
        ctx.strokeStyle = skin.line || '#5C3B26';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(bx + dx, by - 3, 5, 3.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
    // หัวใจลอยขึ้น — ดีใจที่มีคนรับเลี้ยง
    if (t > 70) {
      for (let i = 0; i < 3; i++) {
        const ph = ((t - 70) / 60 + i / 3) % 1;
        const hx = bx + Math.sin(i * 2.1 + t * 0.05) * 22;
        const hy = by - 60 - ph * 50;
        ctx.save();
        ctx.globalAlpha = Math.sin(ph * Math.PI);
        ctx.translate(hx, hy);
        ctx.beginPath();
        ctx.moveTo(0, 6); ctx.bezierCurveTo(-8, 1, -6, -6, 0, -2.5); ctx.bezierCurveTo(6, -6, 8, 1, 0, 6); ctx.closePath();
        ctx.fillStyle = '#FF8FB8'; ctx.fill();
        ctx.strokeStyle = '#8E2B57'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();
      }
    }
    return;
  }
  // กระโดดโค้งจากกล่องลงเป้บนหลังน้อง (130-162)
  const k = Math.min(1, (t - 130) / 32);
  const cs = game.catScale || 1;
  const seat = carrierSeat(game.player, cs);
  const fx = bx, fy = by + 4;
  const tx = seat.x, ty = seat.y + 8 * 0.58 * cs;   // ก้นลูกแมวในเป้ (พิกัดจอ)
  const x = fx + (tx - fx) * k;
  const y = fy + (ty - fy) * k - Math.sin(k * Math.PI) * 70;
  drawCatPose(ctx, x, y, 0.58 * cs + (1 - k) * 0.37, skin, t, {
    shape: { puff: 0.3, ear: -0.5, tilt: -0.2 * (1 - k) },
    k: 1,
    mood: 'starry',
  });
}
