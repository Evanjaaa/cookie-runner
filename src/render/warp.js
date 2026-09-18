// src/render/warp.js
// ─────────────────────────────────────────────────────────────
// เวทวาร์ปขึ้นฟ้าตอนเข้าโบนัส — ช่วง rise ของ updateBonus (ดู game.js)
//
// ── ทำไมต้องมี ──
// ตั้งแต่ด่านข้างล่างหยุดนิ่งตลอดโบนัส ช่วงที่ปลาพาทะยานขึ้นก็ไม่มีอะไรไหลผ่านจอ
// ภาพที่ได้คือแมวเลื่อนขึ้นบนพื้นหลังนิ่ง ๆ ซึ่งอ่านไม่ออกว่า "กำลังจะไปไหน"
// วงเวทกับประกายทำหน้าที่นั้นแทนการเลื่อนฉาก: รวมพลัง → ลำแสงพุ่งขึ้น → วาบขาวตัดไปฟ้า
//
// ── แบ่งสองชั้น ──
//   back   หลังปลากับแมว: วงเวท ลำแสง แสงฟุ้ง
//   front  หน้าแมว: ประกายพุ่งขึ้น วงแหวนพลัง เส้นรวมพลังตอนท้าย
//
// ── งบประมาณความหนัก ──
// วงรี เส้น และเกรเดียนต์ล้วน ๆ ไม่มี filter/shadowBlur เลย (กฎเดียวกับ talent-fx.js)
// และโผล่แค่ราว 1.7 วินาทีต่อหนึ่งโบนัส ไม่ได้วาดตลอดตา
// ─────────────────────────────────────────────────────────────
import { GROUND_Y, COLORS as C } from '../config.js';

// สีของเวท — ใช้ชุดเดียวกับตัวอักษรสะสม (ม่วง/ม่วงอ่อน) บวกมิ้นต์กับครีมเป็นประกาย
// เพราะโบนัสเกิดจากการเก็บตัวอักษรครบ สีจึงควรเป็นภาษาเดียวกับของที่ทำให้มันเกิด
const RUNE = C.letter;
const RUNE_LITE = C.letterLite;
const SPARK = [C.cream, C.mintLite, C.letterLite, '#FFDF8A'];

/** ตัวเลขสุ่มแบบคงที่ — เลขชุดเดิมทุกครั้ง ภาพจึงไม่กระตุกเวลาเฟรมตก */
function rnd(i, salt = 0) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** 0→1 แบบเข้านุ่มออกนุ่ม ใช้คุมความเข้มของทุกชั้น */
function ease(k) {
  return k * k * (3 - 2 * k);
}

/** ดาวสี่แฉกหนึ่งดวง (ทรงเดียวกับประกายโบนัสใน entities.js) */
function star(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/**
 * วงเวทใต้เท้า — วงรีแบนเหมือนมองจากมุมสูง หมุนสวนทางกันสองวง
 * เริ่มกว้างตอนอยู่ติดพื้นแล้วหดตามแมวที่ลอยสูงขึ้น เหมือนถูกดูดตามขึ้นไป
 */
function runeRing(ctx, x, y, r, t, alpha) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = RUNE_LITE;
  ctx.lineWidth = 2;
  for (const [k, dir] of [[1, 1], [0.62, -1]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.05 * dir);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * k, r * k * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ขีดรูนรอบวง — ขีดสั้น ๆ เอียงตามวง อ่านเป็น "อักขระ" โดยไม่ต้องวาดตัวอักษรจริง
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-t * 0.03);
  ctx.strokeStyle = RUNE;
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const cx = Math.cos(a) * r * 0.82;
    const cy = Math.sin(a) * r * 0.82 * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 3);
    ctx.lineTo(cx, cy + 3);
    ctx.stroke();
  }
  // ดาวประจำทิศบนเส้นวง — ตัวที่ทำให้อ่านเป็น "วงเวท" ไม่ใช่วงรีเปล่า ๆ
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = C.cream;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t * 0.03;
    const pulse = 0.6 + 0.4 * Math.sin(t * 0.14 + i);
    ctx.globalAlpha = alpha * pulse;
    star(ctx, Math.cos(a) * r, Math.sin(a) * r * 0.3, 2.2 + pulse * 1.8);
  }
  ctx.restore();
}

/**
 * ชั้นหลัง: วงเวท ลำแสง และแสงฟุ้งหลังตัวแมว
 * k = ความคืบหน้าของช่วง rise (0 = เพิ่งเริ่มถูกยกขึ้น, 1 = กำลังจะวาบขาว)
 */
export function drawWarpBack(ctx, x, y, k, t) {
  const e = ease(Math.min(1, k));

  ctx.save();
  // บวกสีแทนทับสี แสงที่ซ้อนกันจึงสว่างขึ้นเหมือนแสงจริง (กฎเดียวกับประกายบนฟ้า)
  ctx.globalCompositeOperation = 'lighter';

  // ── ลำแสงพุ่งขึ้นจากพื้นถึงขอบบนจอ ──
  // จางที่ปลายบนเสมอ ไม่งั้นจะเห็นเป็นแท่งสี่เหลี่ยมตัดขอบจอ
  const beamW = 26 + e * 54;
  const g = ctx.createLinearGradient(0, GROUND_Y, 0, -20);
  g.addColorStop(0, RUNE_LITE);
  g.addColorStop(0.45, RUNE);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.06 + e * 0.3;
  ctx.fillStyle = g;
  // ปลายล่างกว้างกว่าปลายบนเล็กน้อย ได้ทรงลำแสงที่สอบขึ้น ไม่ใช่แท่งตรง
  ctx.beginPath();
  ctx.moveTo(x - beamW * 0.62, GROUND_Y);
  ctx.lineTo(x + beamW * 0.62, GROUND_Y);
  ctx.lineTo(x + beamW * 0.34, -20);
  ctx.lineTo(x - beamW * 0.34, -20);
  ctx.closePath();
  ctx.fill();

  // ── แสงฟุ้งหลังตัวแมว ── สว่างขึ้นเรื่อย ๆ จนกลืนตัวแมวตอนจะวาบ
  const glowR = 40 + e * 90;
  const rg = ctx.createRadialGradient(x, y, 0, x, y, glowR);
  rg.addColorStop(0, RUNE_LITE);
  rg.addColorStop(0.55, RUNE);
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.12 + e * 0.5;
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // ── วงเวท ── อยู่นอกโหมดบวกสี เส้นจะได้คมไม่จมไปกับแสง
  ctx.save();
  // ลอยตามแมวขึ้นไปนิดเดียว (25%) ที่เหลือค้างอยู่กับพื้น จึงอ่านว่า "วงเวทผุดจากพื้น"
  // แล้วแมวถูกดูดขึ้นไปจากมัน ไม่ใช่ "ห่วงคล้องตัวแมว" ที่ลอยตามขึ้นไปทั้งวง
  const ringY = GROUND_Y - 8 - (GROUND_Y - 8 - y) * 0.25;
  runeRing(ctx, x, ringY, 84 - e * 16, t, 0.9 * (1 - e * 0.3));
  ctx.restore();
}

/**
 * ชั้นหน้า: ประกายพุ่งขึ้น วงแหวนพลัง และเส้นรวมพลังช่วงท้าย
 * วาดทับตัวแมวได้ เพราะเป็นของบาง ๆ ไม่ได้บังหน้าน้อง
 */
export function drawWarpFront(ctx, x, y, k, t) {
  const e = ease(Math.min(1, k));

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // ── ประกายพุ่งขึ้น ──
  // แต่ละดวงวนรอบตัวแมวเป็นเกลียว แล้ววิ่งขึ้นเร็วกว่าตัวแมว
  // ใช้เศษของเวลา (loop) แทนการเก็บอายุไว้ในตัวแปร ประกายจึงไหลต่อเนื่องโดยไม่ต้องจัดการ state
  for (let i = 0; i < 26; i++) {
    const seed = rnd(i);
    const speed = 2.4 + seed * 2.6;
    const life = ((t * speed * 0.02 + seed) % 1);
    const swirl = t * 0.06 + i * 0.9;
    const spread = 26 + rnd(i, 3) * 46;
    const sx = x + Math.cos(swirl) * spread * (1 - life * 0.55);
    // เกิดต่ำกว่าตัวแมวแล้ววิ่งพ้นหัวไป ระยะทางรวมราว 160px
    const sy = y + 40 - life * 170 - rnd(i, 7) * 20;
    const r = (1.2 + rnd(i, 5) * 2.4) * (0.5 + e * 0.9);
    ctx.globalAlpha = (1 - life) * (0.25 + e * 0.6);
    ctx.fillStyle = SPARK[i % SPARK.length];
    star(ctx, sx, sy, r);
  }

  // ── วงแหวนพลังสามวง วิ่งขึ้นตามตัวแมว ──
  // บอกทิศทางว่า "ขึ้น" ชัดกว่าประกายที่กระจายรอบตัว
  ctx.strokeStyle = RUNE_LITE;
  for (let i = 0; i < 3; i++) {
    const life = ((t * 0.022 + i / 3) % 1);
    const ry = y + 46 - life * 150;
    const rw = 16 + life * 46;
    ctx.globalAlpha = (1 - life) * (0.2 + e * 0.5);
    ctx.lineWidth = 2.4 * (1 - life * 0.6);
    ctx.beginPath();
    ctx.ellipse(x, ry, rw, rw * 0.28, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ── ช่วงท้าย: เส้นแสงพุ่งเข้าหาตัวแมวจากรอบทิศ ──
  // "รวมพลังก่อนวาร์ป" — เริ่มที่ 55% ของช่วง ให้ต่อกับแสงขาวที่ตามมาพอดี
  const gather = Math.max(0, (k - 0.55) / 0.45);
  if (gather > 0) {
    ctx.strokeStyle = C.cream;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 0.03;
      const far = 150 * (1 - gather) + 26;
      const near = far - 34 * gather;
      ctx.globalAlpha = gather * 0.65;
      ctx.lineWidth = 1.6 + gather * 1.6;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * far, y + Math.sin(a) * far * 0.7);
      ctx.lineTo(x + Math.cos(a) * near, y + Math.sin(a) * near * 0.7);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * ประกายที่หลงเหลืออยู่บนฟ้าทันทีหลังวาร์ป — ใช้ช่วงต้นของ fly
 * ให้รู้สึกว่า "โผล่มา" ไม่ใช่ "อยู่ตรงนี้มาตั้งแต่แรก"
 * ค่อย ๆ จางหมดใน q = 0→1 (ราวครึ่งวินาทีแรก)
 */
export function drawWarpArrive(ctx, x, y, q) {
  const fade = 1 - ease(Math.min(1, q));
  if (fade <= 0.01) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // วงคลื่นสองชั้นบานออกจากจุดที่โผล่มา ชั้นในตามหลังชั้นนอกนิดหน่อย
  ctx.strokeStyle = C.cream;
  for (const [scale, a] of [[1, 0.55], [0.58, 0.4]]) {
    ctx.globalAlpha = fade * a;
    ctx.lineWidth = 3.4 * fade * scale;
    ctx.beginPath();
    ctx.arc(x, y, (30 + (1 - fade) * 150) * scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ประกายกระเด็นออกรอบทิศแล้วช้าลง
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + rnd(i, 11) * 0.6;
    const d = (1 - fade) * (70 + rnd(i, 13) * 90);
    ctx.globalAlpha = fade * 0.8;
    ctx.fillStyle = SPARK[i % SPARK.length];
    star(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 1.8 + fade * 2.8);
  }

  ctx.restore();
}
