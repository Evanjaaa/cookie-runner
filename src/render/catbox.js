// src/render/catbox.js
// ─────────────────────────────────────────────────────────────
// กล่องน้องแมวระหว่างวิ่ง + ฉากพบน้อง + ลูกแมวในเป้อุ้มบนหลังน้อง
//
// กล่องกระดาษใบเก่าตั้งอยู่ริมทาง ฝาเปิดแง้ม มีหูเล็ก ๆ โผล่ออกมา
// ไม่ต้องกดเก็บ — แค่วิ่งผ่าน ลูกแมวก็กระโดดออกมาแล้ววิ่งตาม (ดู game.js)
// ─────────────────────────────────────────────────────────────
import { GROUND_Y } from '../config.js';
import { drawCatPose } from './entities.js';

/** เส้นขอบกล่องบางลง 30% ให้เท่าเส้นฉากหน้าแรก/บ้านลูกเหมียว (ผู้ใช้ขอ) */
const BOX_K = 0.7;

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
  ctx.lineWidth = 2.2 * BOX_K;

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
  ctx.lineWidth = 1.6 * BOX_K;
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
 * วาดใหม่รอบ 2 (ผู้ใช้ 3 พ.ย. 2026: "วาดใหม่ ไม่ต้องมีแมวในกล่อง") — บ้านกล่องกระดาษทรงหัวแมว
 *   ทรง     = กล่องกระดาษตั้งตรงมุมมน หูแมวสองข้างงอกจากมุมบน (ในหูชมพู) · มีความหนาด้านหลังให้ดูเป็นกล่องจริง
 *   ผิว     = พีชไล่เฉด เงาวาวด้านบน + เงาในล่าง (นูนนุ่มแบบปุ่มวุ้นของหน้าแรก) · เส้นขอบโกโก้มน
 *   หน้ากล่อง = ป้ายครีมขอบชมพู "บ้านลูกเหมียว" · ประตูโค้งข้างในอุ่น ๆ มีเบาะชมพู (บอกว่า "เข้าไปได้")
 *               หนวดแมวสามเส้นสองข้าง · รอยเท้ามุมล่าง
 *   ออร่าเรืองหายใจ + ประกายลอยขึ้น = บอกว่า "แตะได้" (ชุดเดิม) · หูกระดิกเป็นระยะ
 * @param pop 0-1 ตอนเพิ่งถูกแตะ — กล่องเด้ง หูกางออก (ไล่ลงเองจากผู้เรียก)
 */
export function drawHomeBox(ctx, x, y, t, pop = 0) {
  const breathe = (Math.sin(t * 0.06) + 1) / 2;
  const TAU = Math.PI * 2;
  ctx.save();
  ctx.translate(x, y);

  // ── ออร่า: วงแสงอุ่นหลังกล่อง หายใจเข้าออก ──
  const r = 78 + breathe * 10 + pop * 20;
  const g = ctx.createRadialGradient(0, -44, 8, 0, -44, r);
  g.addColorStop(0, `rgba(255,236,170,${0.42 + breathe * 0.2})`);
  g.addColorStop(0.55, `rgba(255,190,225,${0.2 + breathe * 0.1})`);
  g.addColorStop(1, 'rgba(255,190,225,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, -44, r, 0, TAU); ctx.fill();

  // ประกายลอยขึ้นจากกล่องวนเรื่อย ๆ
  for (let i = 0; i < 5; i++) {
    const ph = (t * 0.008 + i / 5) % 1;
    const sx = Math.sin(i * 2.3) * 44 + Math.sin(t * 0.03 + i) * 4;
    const sy = -70 - ph * 60;
    const sr = (1 - ph) * 3.6 + 1.2;
    ctx.globalAlpha = Math.sin(ph * Math.PI);
    ctx.fillStyle = i % 2 ? '#FFF3B0' : '#FFD1E6';
    ctx.beginPath();
    ctx.moveTo(sx, sy - sr * 2); ctx.lineTo(sx + sr * 0.5, sy); ctx.lineTo(sx, sy + sr * 2); ctx.lineTo(sx - sr * 0.5, sy); ctx.closePath();
    ctx.moveTo(sx - sr * 2, sy); ctx.lineTo(sx, sy + sr * 0.5); ctx.lineTo(sx + sr * 2, sy); ctx.lineTo(sx, sy - sr * 0.5); ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── ตัวกล่อง ── ยืด-ยุบแบบวุ้นตามจังหวะหายใจ (ฐานติดพื้น) + เด้งแรงตอนถูกแตะ
  const sq = Math.sin(t * 0.06) * 0.018;
  const kp = Math.sin(pop * Math.PI) * 0.12;
  ctx.scale(1 + kp - sq, 1 + kp + sq);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const INK = '#6B4128';
  const W = 50, TOP = -76, EAR = 26, R = 12;
  // หูกระดิก: ทุก ~5 วิ หูข้างหนึ่งกระดิกสองที · ถูกแตะ = หูกางออกทั้งคู่
  const tw = t % 300;
  const twitch = tw < 22 ? Math.sin(tw / 22 * Math.PI * 2) * 3 : 0;
  const earL = pop * 5, earR = pop * 5 + twitch;

  /** ทรงกล่องหัวแมว (มุมมน หูสองข้างงอกจากมุมบน) — เลื่อน ox/oy ได้ (ใช้วาดความหนาด้านหลัง) */
  const body = (ox = 0, oy = 0) => {
    ctx.beginPath();
    ctx.moveTo(-W + R + ox, oy);
    ctx.lineTo(W - R + ox, oy);
    ctx.quadraticCurveTo(W + ox, oy, W + ox, -R + oy);
    ctx.lineTo(W + ox, TOP + 8 + oy);
    ctx.lineTo(W - 1 + earR + ox, TOP - EAR + 7 + oy);
    ctx.quadraticCurveTo(W - 2 + earR + ox, TOP - EAR - 2 + oy, W - 10 + earR * 0.6 + ox, TOP - EAR + 3 + oy);
    ctx.lineTo(W - 32 + ox, TOP + oy);
    ctx.lineTo(-W + 32 + ox, TOP + oy);
    ctx.lineTo(-W + 10 - earL * 0.6 + ox, TOP - EAR + 3 + oy);
    ctx.quadraticCurveTo(-W + 2 - earL + ox, TOP - EAR - 2 + oy, -W + 1 - earL + ox, TOP - EAR + 7 + oy);
    ctx.lineTo(-W + ox, TOP + 8 + oy);
    ctx.lineTo(-W + ox, -R + oy);
    ctx.quadraticCurveTo(-W + ox, oy, -W + R + ox, oy);
    ctx.closePath();
  };

  // เงานุ่มใต้กล่อง
  ctx.fillStyle = 'rgba(70,30,60,.2)';
  ctx.beginPath(); ctx.ellipse(4, 3, 60, 8, 0, 0, TAU); ctx.fill();

  // ความหนาด้านหลัง (กล่องจริงมีมิติ) — ทรงเดียวกัน เลื่อนขึ้นขวา สีเข้มกว่า
  body(8, -6);
  ctx.fillStyle = '#D9935A'; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();

  // หน้ากล่อง: ไล่สีพีช · เงาวาวบน · เงาในล่าง
  const wg = ctx.createLinearGradient(0, TOP - EAR, 0, 0);
  wg.addColorStop(0, '#FDD7A8'); wg.addColorStop(0.55, '#F3B57A'); wg.addColorStop(1, '#E6A062');
  body(); ctx.fillStyle = wg; ctx.fill();
  ctx.save();
  body(); ctx.clip();
  const sh = ctx.createLinearGradient(0, -16, 0, 0);
  sh.addColorStop(0, 'rgba(150,70,30,0)'); sh.addColorStop(1, 'rgba(150,70,30,.26)');
  ctx.fillStyle = sh; ctx.fillRect(-W, -16, W * 2, 16);
  ctx.fillStyle = 'rgba(255,255,255,.42)';
  ctx.beginPath(); ctx.ellipse(-W * 0.36, TOP + 7, W * 0.42, 4.2, -0.05, 0, TAU); ctx.fill();
  ctx.restore();
  body(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();

  // ในหูชมพู
  ctx.fillStyle = '#FFB8D2';
  ctx.beginPath(); ctx.moveTo(-W + 7, TOP + 2); ctx.lineTo(-W + 6 - earL * 0.8, TOP - EAR + 11); ctx.lineTo(-W + 24, TOP + 1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W - 7, TOP + 2); ctx.lineTo(W - 6 + earR * 0.8, TOP - EAR + 11); ctx.lineTo(W - 24, TOP + 1); ctx.closePath(); ctx.fill();

  // หนวดแมวสามเส้นสองข้าง (ลายพิมพ์บนกล่อง)
  ctx.strokeStyle = 'rgba(120,60,30,.45)';
  ctx.lineWidth = 1.2;
  for (const d of [-1, 1]) {
    for (const [dy, tilt] of [[-3, -2.5], [1, 0], [5, 2.5]]) {
      ctx.beginPath(); ctx.moveTo(d * (W - 4), -24 + dy + tilt); ctx.lineTo(d * (W - 15), -24 + dy); ctx.stroke();
    }
  }

  // ป้ายหน้ากล่อง "บ้านลูกเหมียว" — ครีมขอบชมพู
  const pw = 84, ph = 19, py = TOP + 12;
  ctx.beginPath(); ctx.roundRect(-pw / 2, py, pw, ph, ph / 2);
  ctx.fillStyle = '#FFF6EA'; ctx.fill();
  ctx.strokeStyle = '#FF9CC0'; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath(); ctx.roundRect(-pw / 2 + 7, py + 2.5, pw - 14, 3, 1.5); ctx.fill();
  let fs = 11.5;
  ctx.font = `700 ${fs}px Mali, sans-serif`;
  const label = 'บ้านลูกเหมียว';
  const tw2 = ctx.measureText(label).width;
  if (tw2 > pw - 14) { fs *= (pw - 14) / tw2; ctx.font = `700 ${fs}px Mali, sans-serif`; }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8A4B2A';
  ctx.fillText(label, 0, py + ph / 2 + 1);

  // ประตูโค้ง: ขอบกระดาษอ่อน · ข้างในอุ่น ๆ · เบาะชมพู · หัวใจเล็กเหนือประตู
  const dw = 17, dTop = -36;
  const door = (pad) => {
    ctx.beginPath();
    ctx.moveTo(-dw - pad, -1);
    ctx.lineTo(-dw - pad, dTop + dw);
    ctx.arc(0, dTop + dw, dw + pad, Math.PI, 0);
    ctx.lineTo(dw + pad, -1);
    ctx.closePath();
  };
  door(3.5); ctx.fillStyle = '#FBD3A2'; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
  const dg = ctx.createLinearGradient(0, dTop, 0, 0);
  dg.addColorStop(0, '#7A4A2A'); dg.addColorStop(1, '#5A3420');
  door(0); ctx.fillStyle = dg; ctx.fill();
  ctx.save();
  door(0); ctx.clip();
  ctx.fillStyle = '#FFB3CE';
  ctx.beginPath(); ctx.ellipse(0, -2, dw + 2, 7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath(); ctx.ellipse(-5, -6, 6, 1.8, 0, 0, TAU); ctx.fill();
  // แสงอุ่นในบ้าน
  const lg2 = ctx.createRadialGradient(0, dTop + 10, 1, 0, dTop + 10, 22);
  lg2.addColorStop(0, `rgba(255,220,150,${0.35 + breathe * 0.15})`); lg2.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = lg2; ctx.fillRect(-dw, dTop, dw * 2, 40);
  ctx.restore();
  door(0); ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.stroke();
  // หัวใจเล็กเหนือประตู
  ctx.save();
  ctx.translate(0, dTop - 7);
  ctx.beginPath();
  ctx.moveTo(0, 4); ctx.bezierCurveTo(-5.5, 0.5, -4.4, -4.6, 0, -1.8); ctx.bezierCurveTo(4.4, -4.6, 5.5, 0.5, 0, 4); ctx.closePath();
  ctx.fillStyle = '#FF7FB0'; ctx.fill();
  ctx.restore();

  // รอยเท้าแมวสองมุมล่าง
  ctx.fillStyle = 'rgba(160,80,30,.35)';
  for (const [px, py2] of [[-W + 14, -9], [W - 14, -9]]) {
    ctx.beginPath(); ctx.ellipse(px, py2, 3.6, 3, 0, 0, TAU); ctx.fill();
    for (const [dx, dy] of [[-3.6, -3.8], [0, -5.4], [3.6, -3.8]]) { ctx.beginPath(); ctx.arc(px + dx, py2 + dy, 1.4, 0, TAU); ctx.fill(); }
  }
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
  ctx.lineWidth = 1.6 * BOX_K;
  ctx.stroke();
  ctx.strokeStyle = SLING.trim;
  ctx.lineWidth = 2.2 * BOX_K;
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
      ctx.lineWidth = w * k * BOX_K;
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
    ctx.lineWidth = 1.2 * BOX_K;
    ctx.beginPath(); ctx.arc(c.x + 3.6, c.y + 1, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else {
    band(c.x - 14, c.y + 6, c.x, c.y + 9, c.x + 13, c.y + 5, 4);
    band(c.x + 10, c.y - 8, c.x + 2, c.y - 1, c.x - 13, c.y + 4, 4.6);
    ctx.fillStyle = '#FFE48A';
    ctx.strokeStyle = SLING.line;
    ctx.lineWidth = 1.2 * BOX_K;
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
        ctx.lineWidth = 1.4 * BOX_K;
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
        ctx.strokeStyle = '#8E2B57'; ctx.lineWidth = 1.2 * BOX_K; ctx.stroke();
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
