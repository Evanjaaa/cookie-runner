// src/render/entities.js
import { VIEW, GROUND_Y, BODY, SHRIMP, WORD, SKILL, POTION, LETTER_COLORS, COLORS as C } from '../config.js';
import { getFace } from '../face.js';
import { LAYER } from '../paint.js';

const { W } = VIEW;

// ── สิ่งกีดขวาง ──────────────────────────────────────────────

/**
 * theme เปลี่ยนได้แค่ "ภาพ" ที่วาด — กล่องชนที่ส่งเข้ามาเหมือนกันทุกด่านเสมอ
 * เพราะระยะกระโดดกับตำแหน่งอาหารทั้งเกมคำนวณจากขนาดพวกนั้น
 * ถ้าธีมไหนวาดใหญ่กว่ากล่องชนจริง ผู้เล่นจะรู้สึกว่า "ชนทั้งที่ยังไม่โดน"
 */
/**
 * ทะเบียนภาพสิ่งกีดขวางแยกตามธีม
 *
 * เดิมเป็นบูลีน `theme === 'garden'` ซึ่งรองรับได้แค่สองธีม พอจะเพิ่มด่านที่สาม
 * ต้องไล่แก้ ?: ทุกบรรทัด ย้ายมาเป็นตารางแทน — เพิ่มธีมใหม่ = เติมคีย์เดียว
 * ไม่ต้องแตะฟังก์ชันที่วาดอยู่แล้วเลย
 */
const THEME_ART = {
  bakery: { bar: drawBar, crate: drawCrateStack, spike: drawSpike },
  garden: { bar: drawFlowerArch, crate: drawGiftStack, spike: drawCactus },
  cavern: { bar: drawRockArch, crate: drawCrystalStack, spike: drawStalagmite },
  beach: { bar: drawAwning, crate: drawSandCastle, spike: drawCoral },
  space: { bar: drawSolarPanel, crate: drawCargoPod, spike: drawAsteroid },
  snow: { bar: drawSnowBranch, crate: drawIceBlockStack, spike: drawIcicle },
};

function drawOneObstacle(ctx, o, x, y, theme) {
  const art = THEME_ART[theme] || THEME_ART.bakery;
  if (o.kind === 'bar') art.bar(ctx, x, y, o.w, o.h);
  else if (o.kind === 'crate') art.crate(ctx, x, y, o.w, o.h, o.rows);
  else art.spike(ctx, x, y, o.w, o.h);
}

/**
 * แต่ละชิ้นจำธีมของตัวเองไว้ตอนถูกสร้าง (o.theme) ไม่ได้ใช้ธีมของด่านปัจจุบัน
 *
 * จำเป็นเพราะตอนเปลี่ยนฉากกลางตา สิ่งกีดขวางที่ถูกวางล่วงหน้าไปแล้วยังเป็นของ
 * ฉากเก่า ถ้าวาดด้วยธีมปัจจุบันทั้งหมด ของที่อยู่บนจอจะเปลี่ยนหน้าตาพรึบทั้งแถว
 * พอแยกตามชิ้น ภาพที่ได้คือ "วิ่งออกจากฉากเก่าเข้าฉากใหม่" ซึ่งตรงกับที่เกิดขึ้นจริง
 */
export function drawObstacles(ctx, obstacles, camera, theme = 'bakery') {
  for (const o of obstacles) {
    const x = o.x - camera;
    // เผื่อขอบกว้างกว่าเดิม ชิ้นที่กระเด็นอยู่จะได้ไม่หายวับตอนยังเห็นได้
    if (x > W + 130 || x + o.w < -130) continue;

    const t = o.theme || theme;
    if (!o.smashed) {
      drawOneObstacle(ctx, o, x, o.y, t);
      continue;
    }

    // ชิ้นที่ถูกชน: หมุนรอบจุดกึ่งกลางตัวเอง แล้วจางหายไป
    //
    // ส่ง y = 0 เข้าไปแทนพิกัดจริง ซึ่งทำให้เสาค้ำของคานหายไปเองพอดี
    // (เสาวาดจาก y=0 ลงมาถึงตัวคาน พอ y เป็น 0 ความสูงเสาจึงเป็น 0)
    // คานที่ปลิวอยู่กลางอากาศจะได้ไม่ลากเสาติดไปด้วย
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, o.life / 20));
    ctx.translate(x + o.w / 2, o.y + o.h / 2);
    ctx.rotate(o.rot);
    ctx.translate(-o.w / 2, -o.h / 2);
    drawOneObstacle(ctx, o, 0, 0, t);
    ctx.restore();
  }
}

// ── ชุดภาพธีมสวนกลางวัน ──────────────────────────────────────
// กินพื้นที่เท่ากับหนาม/คาน/กล่องลังของธีมกลางคืนทุกมิติ

/** กระบองเพชร แทนหนาม — w32 h38 ยืนบนพื้น */
function drawCactus(ctx, x, y, w, h) {
  const cx = x + w / 2;

  ctx.fillStyle = '#3E8E52';
  // แขนสองข้าง วาดก่อนลำต้นเพื่อให้โคนแขนถูกกลบ
  ctx.beginPath();
  ctx.roundRect(x + 1, y + h * 0.42, w * 0.26, h * 0.3, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + w - 1 - w * 0.26, y + h * 0.34, w * 0.26, h * 0.34, 4);
  ctx.fill();

  // ลำต้น
  ctx.fillStyle = '#4CA862';
  ctx.beginPath();
  ctx.roundRect(cx - w * 0.24, y + h * 0.06, w * 0.48, h * 0.94, 6);
  ctx.fill();

  // ร่องกลางลำต้น
  ctx.strokeStyle = 'rgba(30,90,48,.5)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx, y + h * 0.2);
  ctx.lineTo(cx, y + h * 0.86);
  ctx.stroke();

  // หนามเล็ก ๆ — ตัวบอกว่าแตะไม่ได้
  ctx.strokeStyle = '#E8F5D8';
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 3; i++) {
    const sy = y + h * (0.28 + i * 0.22);
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.24, sy); ctx.lineTo(cx - w * 0.36, sy - 2);
    ctx.moveTo(cx + w * 0.24, sy); ctx.lineTo(cx + w * 0.36, sy - 2);
    ctx.stroke();
  }

  // ดอกชมพูบนยอด
  ctx.fillStyle = '#FF7EA8';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * 4, y + 3 + Math.sin(a) * 4, 3.4, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#FFE071';
  ctx.beginPath(); ctx.arc(cx, y + 3, 2.6, 0, Math.PI * 2); ctx.fill();

  // เงาที่โคน ทำให้ดูตั้งอยู่บนพื้นจริง
  ctx.fillStyle = 'rgba(38,72,44,.28)';
  ctx.fillRect(x - 2, y + h - 4, w + 4, 5);
}

/** ซุ้มดอกไม้ แทนคาน — ต้องหมอบลอด ขอบล่างต้องอ่านว่า "อันตราย" */
function drawFlowerArch(ctx, x, y, w, h) {
  // คานไม้
  ctx.fillStyle = '#A9713F';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.fillRect(x, y, w, 5);

  // ใบไม้เลื้อยคลุมคาน
  ctx.fillStyle = '#4CA862';
  for (let i = 0; i < w; i += 17) {
    ctx.beginPath();
    ctx.ellipse(x + i + 8, y + 12, 9, 6, i % 34 ? 0.4 : -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // แถวดอกไม้ตรงขอบล่าง = เส้นที่ห้ามแตะ ตำแหน่งเดียวกับแถบแดงของธีมกลางคืน
  ctx.fillStyle = '#F2565F';
  ctx.fillRect(x, y + h - 8, w, 8);
  for (let i = 0; i < w; i += 22) {
    const fx = x + i + 11;
    ctx.fillStyle = '#FFD36E';
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(fx + Math.cos(a) * 4.2, y + h - 4 + Math.sin(a) * 4.2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#FF8FB0';
    ctx.beginPath(); ctx.arc(fx, y + h - 4, 2.8, 0, Math.PI * 2); ctx.fill();
  }

  // เสาค้ำขึ้นไปนอกจอ
  ctx.fillStyle = '#8C5A31';
  ctx.fillRect(x + 10, 0, 12, y);
  ctx.fillRect(x + w - 22, 0, 12, y);
}

/** กล่องของขวัญซ้อน แทนกล่องลัง — สีสลับชั้นให้เห็นว่าซ้อนกี่ใบ */
const GIFT_COLORS = [
  ['#FF8FB0', '#FFD36E'],   // ชมพู + ริบบิ้นเหลือง
  ['#7FD1F0', '#FF8FB0'],
  ['#FFD36E', '#7FD1F0'],
];

function drawGiftStack(ctx, x, y, w, h, rows = 1) {
  const rh = h / rows;
  for (let i = 0; i < rows; i++) {
    // ไล่สีจากล่างขึ้นบน กล่องบนสุดได้โบว์
    const [box, ribbon] = GIFT_COLORS[(rows - 1 - i) % GIFT_COLORS.length];
    drawGift(ctx, x, y + i * rh, w, rh, box, ribbon, i === 0);
  }
}

function drawGift(ctx, x, y, w, h, box, ribbon, topBox) {
  ctx.fillStyle = box;
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, w - 2, h - 2, 5);
  ctx.fill();

  // เงาด้านล่างให้ดูมีปริมาตร
  ctx.fillStyle = 'rgba(0,0,0,.13)';
  ctx.fillRect(x + 1, y + h - 7, w - 2, 6);

  // ริบบิ้นกากบาท
  ctx.fillStyle = ribbon;
  ctx.fillRect(x + w / 2 - 4, y + 1, 8, h - 2);
  ctx.fillRect(x + 1, y + h / 2 - 4, w - 2, 8);

  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x + 2.5, y + 2.5, w - 5, h - 5, 4);
  ctx.stroke();

  if (topBox) {
    // โบว์บนกล่องใบบนสุด วาดล้นขึ้นไปเล็กน้อยได้ เพราะเป็นแค่ภาพ
    ctx.fillStyle = ribbon;
    ctx.beginPath();
    ctx.ellipse(x + w / 2 - 7, y - 1, 6, 4.5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w / 2 + 7, y - 1, 6, 4.5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = box;
    ctx.beginPath(); ctx.arc(x + w / 2, y, 3.4, 0, Math.PI * 2); ctx.fill();
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

// ── ชุดภาพธีมถ้ำคริสตัล ──────────────────────────────────────
// กินพื้นที่เท่ากับหนาม/คาน/กล่องลังของธีมกลางคืนทุกมิติ ตามกฎในหัว stages.js
// โทนหินม่วงเทา + คริสตัลฟ้าเรืองแสง ต่างจากทั้งครัวกลางคืนและสวนกลางวันชัดเจน

/** หินงอก แทนหนาม — w32 h38 ยืนบนพื้น ปลายแหลมเอียงเล็กน้อยให้ดูเป็นหินธรรมชาติ */
function drawStalagmite(ctx, x, y, w, h) {
  const cx = x + w / 2;

  // ตัวหิน — ฐานกว้างสอบขึ้นไปหายอดที่เยื้องขวานิดหนึ่ง
  ctx.fillStyle = '#6E5A87';
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w * 0.22, y + h * 0.42);
  ctx.lineTo(cx + w * 0.06, y);
  ctx.lineTo(x + w * 0.82, y + h * 0.5);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  // ด้านรับแสงซ้าย
  ctx.fillStyle = '#8E79A8';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.22, y + h * 0.42);
  ctx.lineTo(cx + w * 0.06, y);
  ctx.lineTo(cx - w * 0.02, y + h);
  ctx.lineTo(x + w * 0.3, y + h);
  ctx.closePath();
  ctx.fill();

  // แร่คริสตัลเรืองแสงฝังอยู่ ตัวที่บอกว่า "อันตราย" แทนสีแดงของหนาม
  ctx.fillStyle = '#7FE8FF';
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.04, y + h * 0.16);
  ctx.lineTo(cx + w * 0.2, y + h * 0.44);
  ctx.lineTo(cx + w * 0.02, y + h * 0.66);
  ctx.lineTo(cx - w * 0.12, y + h * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.04, y + h * 0.16);
  ctx.lineTo(cx + w * 0.12, y + h * 0.42);
  ctx.lineTo(cx + w * 0.02, y + h * 0.46);
  ctx.closePath();
  ctx.fill();

  // เงาที่โคน ให้ยืนติดพื้นไม่ลอย
  ctx.fillStyle = 'rgba(20,10,32,.4)';
  ctx.fillRect(x - 3, y + h - 4, w + 6, 5);
}

/** เพดานหินย้อย แทนคาน — w170 h54 ห้อยลงมาจากขอบบนจอ ต้องหมอบลอด */
function drawRockArch(ctx, x, y, w, h) {
  // เนื้อหินของคาน
  ctx.fillStyle = '#5B4A73';
  ctx.fillRect(x, y, w, h);
  // ขอบบนสว่าง ให้ดูเป็นก้อนหนา
  ctx.fillStyle = 'rgba(200,180,225,.22)';
  ctx.fillRect(x, y, w, 5);

  // หินย้อยห้อยจากใต้คาน — ความสูงต่างกันให้ดูเป็นธรรมชาติ
  // วาดอยู่ในความสูง h เท่านั้น ไม่ยื่นต่ำกว่ากล่องชน
  ctx.fillStyle = '#4A3B60';
  const tips = [0.1, 0.26, 0.42, 0.58, 0.74, 0.9];
  const drop = [0.5, 0.8, 0.36, 0.7, 0.46, 0.62];
  for (let i = 0; i < tips.length; i++) {
    const tx = x + w * tips[i];
    ctx.beginPath();
    ctx.moveTo(tx - 9, y + h - 10);
    ctx.lineTo(tx + 9, y + h - 10);
    ctx.lineTo(tx, y + h - 10 + drop[i] * 10);
    ctx.closePath();
    ctx.fill();
  }

  // แถบคริสตัลเรืองใต้คาน = เส้นเตือนว่าต่ำแค่ไหน (แทนแถบแดงของธีมเดิม)
  ctx.fillStyle = 'rgba(127,232,255,.85)';
  ctx.fillRect(x, y + h - 13, w, 3);

  // เสาหินค้ำขึ้นไปนอกจอ ตำแหน่งเดียวกับธีมอื่นเป๊ะ
  ctx.fillStyle = 'rgba(38,28,54,.9)';
  ctx.fillRect(x + 10, 0, 12, y);
  ctx.fillRect(x + w - 22, 0, 12, y);
}

/** กองคริสตัล แทนกล่องลัง — ชั้นละ w46 h44 ซ้อนได้หลายชั้น */
function drawCrystalStack(ctx, x, y, w, h, rows = 1) {
  const rh = h / rows;
  for (let i = 0; i < rows; i++) drawCrystalBlock(ctx, x, y + i * rh, w, rh, i === 0);
}

function drawCrystalBlock(ctx, x, y, w, h, topBlock) {
  // ก้อนหินหุ้ม — ตัดมุมบนสองข้างให้ดูเป็นผลึกไม่ใช่กล่องเหลี่ยม
  ctx.fillStyle = '#5F4E7A';
  ctx.beginPath();
  ctx.moveTo(x + 6, y);
  ctx.lineTo(x + w - 6, y);
  ctx.lineTo(x + w, y + 9);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + 9);
  ctx.closePath();
  ctx.fill();

  // แกนคริสตัลกลางก้อน
  ctx.fillStyle = '#4FC9E8';
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 6);
  ctx.lineTo(x + w - 10, y + h / 2);
  ctx.lineTo(x + w / 2, y + h - 6);
  ctx.lineTo(x + 10, y + h / 2);
  ctx.closePath();
  ctx.fill();

  // เหลี่ยมรับแสงซ้ายบน
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 6);
  ctx.lineTo(x + w / 2, y + h / 2);
  ctx.lineTo(x + 10, y + h / 2);
  ctx.closePath();
  ctx.fill();

  // ขอบก้อน วาดท้ายสุดให้ทับปลายทุกเหลี่ยม
  ctx.strokeStyle = '#392C4E';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x + 6, y);
  ctx.lineTo(x + w - 6, y);
  ctx.lineTo(x + w, y + 9);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + 9);
  ctx.closePath();
  ctx.stroke();

  if (topBlock) {
    // ผลึกเล็กงอกบนก้อนบนสุด วาดล้นขึ้นไปได้เพราะเป็นแค่ภาพ
    ctx.fillStyle = '#7FE8FF';
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 7, y);
    ctx.lineTo(x + w / 2 - 3, y - 9);
    ctx.lineTo(x + w / 2 + 1, y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w / 2 + 2, y);
    ctx.lineTo(x + w / 2 + 6, y - 6);
    ctx.lineTo(x + w / 2 + 10, y);
    ctx.closePath();
    ctx.fill();
  }
}

// ── ของร่วงจากเพดาน ──────────────────────────────────────────
//
// วาดสองช่วงคนละแบบ:
//   warn > 0  เงาวงรีบนพื้นที่เข้มขึ้นเรื่อย ๆ = "ตรงนี้กำลังจะมีของตก"
//   warn = 0  ตัวของจริงที่กำลังร่วง พร้อมเงาใต้ตัวที่หดลงตามระยะใกล้พื้น
//
// เงาต้องอยู่ "บนพื้น" ไม่ใช่ใต้ตัวของ ผู้เล่นจึงรู้จุดตกตั้งแต่ของยังอยู่นอกจอ
export function drawFallers(ctx, fallers, camera, theme = 'cavern') {
  const tint = FALLER_TINT[theme] || FALLER_TINT.cavern;

  for (const f of fallers) {
    const x = f.x - camera;
    if (x > W + 80 || x + f.w < -80) continue;

    if (f.warn > 0) {
      // เงาเตือน — เข้มขึ้นเมื่อใกล้ถึงเวลาตก
      const t = 1 - f.warn / 45;
      ctx.save();
      ctx.globalAlpha = 0.25 + t * 0.5;
      ctx.fillStyle = tint.warn;
      ctx.beginPath();
      ctx.ellipse(x + f.w / 2, GROUND_Y - 3, f.w * (0.5 + t * 0.5), 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }

    // เงาใต้ตัวขณะร่วง — ยิ่งใกล้พื้นยิ่งเล็กและเข้ม
    const near = Math.max(0, Math.min(1, (f.y + f.h) / GROUND_Y));
    ctx.save();
    ctx.globalAlpha = 0.2 + near * 0.4;
    ctx.fillStyle = tint.warn;
    ctx.beginPath();
    ctx.ellipse(x + f.w / 2, GROUND_Y - 3, f.w * (0.75 - near * 0.25), 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ตัวของ — ผลึกหัวแหลมลงล่าง สื่อว่ากำลังพุ่งลง
    ctx.fillStyle = tint.body;
    ctx.beginPath();
    ctx.moveTo(x + f.w / 2, f.y + f.h);
    ctx.lineTo(x + f.w, f.y + f.h * 0.3);
    ctx.lineTo(x + f.w * 0.72, f.y);
    ctx.lineTo(x + f.w * 0.28, f.y);
    ctx.lineTo(x, f.y + f.h * 0.3);
    ctx.closePath();
    ctx.fill();

    // เหลี่ยมรับแสงด้านซ้าย
    ctx.fillStyle = tint.lit;
    ctx.beginPath();
    ctx.moveTo(x + f.w / 2, f.y + f.h);
    ctx.lineTo(x + f.w * 0.28, f.y);
    ctx.lineTo(x + f.w * 0.5, f.y);
    ctx.closePath();
    ctx.fill();
  }
}

/** สีของของร่วงตามธีม — ชิ้นส่วนเดียวกัน เปลี่ยนแค่สีให้เข้าแมพ */
const FALLER_TINT = {
  cavern: { body: '#4FC9E8', lit: 'rgba(255,255,255,.7)', warn: 'rgba(127,232,255,.85)' },
  space:  { body: '#9DFF6B', lit: 'rgba(255,255,255,.6)', warn: 'rgba(157,255,107,.8)' },
  snow:   { body: '#A8DCF2', lit: 'rgba(255,255,255,.85)', warn: 'rgba(110,150,175,.8)' },
};

// ── อันตรายที่ขยับได้ ────────────────────────────────────────
//
// สามชนิดใช้ระบบเดียวกัน (ดู HAZARD ใน config.js) ต่างกันแค่ภาพกับการเคลื่อนที่
// สิ่งที่ทุกชนิดต้องมีเหมือนกันคือ "อ่านสถานะได้ก่อนถึงตัว"
export function drawHazards(ctx, hazards, camera, tick, pal) {
  for (const h of hazards) {
    const x = h.x - camera;
    // เผื่อขอบกว้างกว่าเดิม ชิ้นที่กระเด็นอยู่จะได้ไม่หายวับตอนยังเห็นได้
    if (x > W + 130 || x + h.w < -130) continue;

    // ── ชิ้นที่โดนพุ่งชน ──
    // ผึ้งกับลูกบอลวาดจากพิกัดของตัวเองอยู่แล้ว จึงหมุนรอบจุดกึ่งกลางแล้วจางหายได้
    // ด้วยท่าเดียวกับสิ่งกีดขวาง
    if (h.smashed) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, h.life / 20));
      ctx.translate(x + h.w / 2, h.y + h.h / 2);
      ctx.rotate(h.rot || 0);
      ctx.translate(-h.w / 2, -h.h / 2);
      if (h.kind === 'bee') drawBee(ctx, { ...h, y: 0 }, 0, tick);
      else drawBall(ctx, { ...h, y: 0 }, 0, pal);
      ctx.restore();
      continue;
    }

    if (h.kind === 'bee') drawBee(ctx, h, x, tick);
    else drawBall(ctx, h, x, pal);
  }
}

/** ผึ้ง — แกว่งขึ้นลง ปีกกระพือถี่ให้รู้ว่าเป็นของมีชีวิตที่ขยับเอง */
function drawBee(ctx, h, x, tick) {
  const cx = x + h.w / 2;
  const cy = h.y + h.h / 2;

  // ปีกใส กระพือเร็วกว่าการแกว่งมาก
  // ปีกขาวโปร่งล้วนจะจมหายไปกับฟ้าสว่างของสวน ต้องตีเส้นขอบเข้มไว้ด้วย
  const flap = Math.abs(Math.sin(tick * 0.7)) * 5 + 3;
  ctx.strokeStyle = 'rgba(60,50,20,.45)';
  ctx.lineWidth = 1.2;
  for (const dx of [-6, 6]) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(cx + dx, cy - 9, 7, flap, dx < 0 ? -0.4 : 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
  }

  // ตัว
  ctx.fillStyle = '#F5B31E';
  ctx.beginPath(); ctx.ellipse(cx, cy, h.w / 2, h.h / 2, 0, 0, Math.PI * 2); ctx.fill();
  // ลายขวางสองเส้น ตัดด้วย clip ให้อยู่ในลำตัว
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#3A2A12';
  ctx.fillRect(cx - 4, cy - h.h, 5, h.h * 2);
  ctx.fillRect(cx + 5, cy - h.h, 5, h.h * 2);
  ctx.restore();
  // ตา
  ctx.fillStyle = '#2A1E0C';
  ctx.beginPath(); ctx.arc(cx - h.w * 0.3, cy - 2, 2.6, 0, Math.PI * 2); ctx.fill();
}

/** ลูกบอลชายหาด — หมุนตามที่กลิ้ง ผู้เล่นจึงเห็นว่ามันเคลื่อนที่เข้าหาจริง ๆ */
function drawBall(ctx, h, x, pal) {
  const r = h.w / 2;
  const cx = x + r;
  const cy = h.y + r;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(h.spin);
  // เสี้ยวสลับสี — ตัวที่ทำให้เห็นการหมุน ถ้าเป็นวงกลมสีเดียวจะดูเหมือนลอยนิ่ง
  const cols = ['#FF7E6B', '#FFF1DC', '#4FC9E8', '#FFF1DC'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = cols[i];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(90,40,60,.4)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  // เงาบนพื้น ให้อ่านว่ากลิ้งอยู่บนพื้นไม่ใช่ลอย
  ctx.fillStyle = 'rgba(90,50,30,.28)';
  ctx.beginPath();
  ctx.ellipse(cx, GROUND_Y - 2, r * 0.9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ── ชุดภาพธีมชายหาดยามเย็น ───────────────────────────────────
// กินพื้นที่เท่ากับหนาม/คาน/กล่องลังของธีมกลางคืนทุกมิติ ตามกฎในหัว stages.js

/** ปะการัง แทนหนาม — w32 h38 ยืนบนพื้น แตกกิ่งสามแฉก */
function drawCoral(ctx, x, y, w, h) {
  const cx = x + w / 2;

  ctx.strokeStyle = '#FF7E6B';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // ลำต้นกลาง
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(cx, y + h);
  ctx.lineTo(cx, y + h * 0.3);
  ctx.stroke();

  // กิ่งซ้าย-ขวา แยกจากลำต้นคนละระดับ ให้ดูเป็นปะการังไม่ใช่ส้อม
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx, y + h * 0.62);
  ctx.lineTo(x + w * 0.14, y + h * 0.3);
  ctx.moveTo(cx, y + h * 0.48);
  ctx.lineTo(x + w * 0.88, y + h * 0.12);
  ctx.stroke();

  // ปลายกิ่งสีอ่อน = ส่วนที่รับแสงอาทิตย์ตก
  ctx.fillStyle = '#FFC0A8';
  for (const p of [[cx, y + h * 0.3], [x + w * 0.14, y + h * 0.3], [x + w * 0.88, y + h * 0.12]]) {
    ctx.beginPath(); ctx.arc(p[0], p[1], 4.4, 0, Math.PI * 2); ctx.fill();
  }

  // เงาที่โคน
  ctx.fillStyle = 'rgba(90,40,60,.3)';
  ctx.fillRect(x - 3, y + h - 4, w + 6, 5);
}

/** ผ้าใบร่มชายหาด แทนคาน — w170 h54 ห้อยจากขอบบน ต้องหมอบลอด */
function drawAwning(ctx, x, y, w, h) {
  // เสาค้ำขึ้นไปนอกจอ ตำแหน่งเดียวกับธีมอื่นเป๊ะ
  ctx.fillStyle = 'rgba(120,72,44,.92)';
  ctx.fillRect(x + 10, 0, 12, y);
  ctx.fillRect(x + w - 22, 0, 12, y);

  // ผ้าใบลายทางส้ม-ครีม
  const stripe = 6;
  for (let i = 0; i * stripe < w; i++) {
    ctx.fillStyle = i % 2 ? '#FFF1DC' : '#FF8A5C';
    ctx.fillRect(x + i * stripe, y, Math.min(stripe, w - i * stripe), h - 12);
  }
  // ขอบบนเข้มให้ดูเป็นผ้าที่ขึงตึง
  ctx.fillStyle = 'rgba(120,60,36,.35)';
  ctx.fillRect(x, y, w, 5);

  // ชายผ้าหยักเป็นคลื่น = เส้นบอกความต่ำ (แทนแถบแดงของธีมเดิม)
  ctx.fillStyle = '#E2603C';
  const teeth = 10;
  for (let i = 0; i < teeth; i++) {
    const tw = w / teeth;
    const tx = x + i * tw;
    ctx.beginPath();
    ctx.moveTo(tx, y + h - 12);
    ctx.lineTo(tx + tw, y + h - 12);
    ctx.lineTo(tx + tw / 2, y + h - 1);
    ctx.closePath();
    ctx.fill();
  }
}

/** ปราสาททราย แทนกล่องลัง — ชั้นละ w46 h44 ซ้อนได้หลายชั้น */
function drawSandCastle(ctx, x, y, w, h, rows = 1) {
  const rh = h / rows;
  for (let i = 0; i < rows; i++) drawSandBlock(ctx, x, y + i * rh, w, rh, i === 0);
}

function drawSandBlock(ctx, x, y, w, h, topBlock) {
  ctx.fillStyle = '#E8C08A';
  ctx.fillRect(x, y, w, h);
  // ผิวบนสว่าง = ทรายที่โดนแดด
  ctx.fillStyle = '#F7DDB2';
  ctx.fillRect(x, y, w, 5);
  // ร่องอิฐทราย
  ctx.strokeStyle = 'rgba(150,104,54,.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.45); ctx.lineTo(x + w, y + h * 0.45);
  ctx.moveTo(x + w / 2, y + h * 0.45); ctx.lineTo(x + w / 2, y + h);
  ctx.stroke();
  // กรอบนอก
  ctx.strokeStyle = '#A87A42';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);

  if (topBlock) {
    // ใบเสาธงบนยอด วาดล้นขึ้นไปได้เพราะเป็นแค่ภาพ
    ctx.fillStyle = '#8A5A2E';
    ctx.fillRect(x + w / 2 - 1.5, y - 11, 3, 12);
    ctx.fillStyle = '#FF7E6B';
    ctx.beginPath();
    ctx.moveTo(x + w / 2 + 1.5, y - 11);
    ctx.lineTo(x + w / 2 + 13, y - 7.5);
    ctx.lineTo(x + w / 2 + 1.5, y - 4);
    ctx.closePath();
    ctx.fill();
  }
}

// ── ชุดภาพธีมห้วงอวกาศ ───────────────────────────────────────

/** สะเก็ดดาว แทนหนาม — w32 h38 ปลายแหลมมีขอบเรืองนีออน */
function drawAsteroid(ctx, x, y, w, h) {
  const cx = x + w / 2;

  ctx.fillStyle = '#3E3A5C';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.06, y + h);
  ctx.lineTo(x + w * 0.24, y + h * 0.36);
  ctx.lineTo(cx, y);
  ctx.lineTo(x + w * 0.8, y + h * 0.44);
  ctx.lineTo(x + w * 0.96, y + h);
  ctx.closePath();
  ctx.fill();

  // ด้านรับแสงซ้าย
  ctx.fillStyle = '#57527E';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.24, y + h * 0.36);
  ctx.lineTo(cx, y);
  ctx.lineTo(cx, y + h);
  ctx.lineTo(x + w * 0.2, y + h);
  ctx.closePath();
  ctx.fill();

  // ขอบเรืองนีออนตามสันบน = ตัวบอกอันตราย
  ctx.strokeStyle = '#9DFF6B';
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.24, y + h * 0.36);
  ctx.lineTo(cx, y);
  ctx.lineTo(x + w * 0.8, y + h * 0.44);
  ctx.stroke();

  ctx.fillStyle = 'rgba(10,8,26,.45)';
  ctx.fillRect(x - 3, y + h - 4, w + 6, 5);
}

/** แผงโซลาร์สถานีอวกาศ แทนคาน — w170 h54 */
function drawSolarPanel(ctx, x, y, w, h) {
  // เสายึดขึ้นไปนอกจอ
  ctx.fillStyle = 'rgba(58,54,86,.95)';
  ctx.fillRect(x + 10, 0, 12, y);
  ctx.fillRect(x + w - 22, 0, 12, y);

  // โครงโลหะ
  ctx.fillStyle = '#4A4668';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.2)';
  ctx.fillRect(x, y, w, 4);

  // ช่องเซลล์สุริยะสีน้ำเงิน
  const cols = 7;
  const pad = 4;
  const cw = (w - pad * (cols + 1)) / cols;
  for (let i = 0; i < cols; i++) {
    ctx.fillStyle = '#2E5BD8';
    ctx.fillRect(x + pad + i * (cw + pad), y + 8, cw, h - 26);
    ctx.fillStyle = 'rgba(150,200,255,.35)';
    ctx.fillRect(x + pad + i * (cw + pad), y + 8, cw, 3);
  }

  // แถบไฟนีออนใต้แผง = เส้นบอกความต่ำ
  ctx.fillStyle = '#9DFF6B';
  ctx.fillRect(x, y + h - 12, w, 3);
  ctx.fillStyle = 'rgba(157,255,107,.28)';
  ctx.fillRect(x, y + h - 9, w, 6);
}

/** ลังขนส่งอวกาศ แทนกล่องลัง — ชั้นละ w46 h44 */
function drawCargoPod(ctx, x, y, w, h, rows = 1) {
  const rh = h / rows;
  for (let i = 0; i < rows; i++) drawPod(ctx, x, y + i * rh, w, rh);
}

function drawPod(ctx, x, y, w, h) {
  ctx.fillStyle = '#565274';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#6E6A90';
  ctx.fillRect(x, y, w, 5);

  // แถบนีออนกลางลัง
  ctx.fillStyle = '#9DFF6B';
  ctx.fillRect(x + 4, y + h / 2 - 3, w - 8, 6);
  ctx.fillStyle = 'rgba(157,255,107,.25)';
  ctx.fillRect(x + 4, y + h / 2 - 7, w - 8, 14);

  // หมุดยึดสี่มุม
  ctx.fillStyle = '#39355A';
  for (const [px, py] of [[6, 7], [w - 6, 7], [6, h - 7], [w - 6, h - 7]]) {
    ctx.beginPath(); ctx.arc(x + px, y + py, 2.4, 0, Math.PI * 2); ctx.fill();
  }

  ctx.strokeStyle = '#2C2947';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

// ── ชุดภาพธีมทุ่งหิมะ ────────────────────────────────────────

/** แท่งน้ำแข็ง แทนหนาม — w32 h38 ปลายแหลมขึ้น */
function drawIcicle(ctx, x, y, w, h) {
  const cx = x + w / 2;

  ctx.fillStyle = '#8FD4F5';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.1, y + h);
  ctx.lineTo(cx, y);
  ctx.lineTo(x + w * 0.9, y + h);
  ctx.closePath();
  ctx.fill();

  // เหลี่ยมสว่างด้านซ้าย
  ctx.fillStyle = '#D6F1FF';
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(cx, y + h);
  ctx.lineTo(x + w * 0.32, y + h);
  ctx.closePath();
  ctx.fill();

  // ขอบเงาขวาให้ดูเป็นแท่งไม่ใช่สามเหลี่ยมแบน
  ctx.fillStyle = 'rgba(70,130,175,.45)';
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(x + w * 0.9, y + h);
  ctx.lineTo(x + w * 0.68, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(60,100,140,.28)';
  ctx.fillRect(x - 3, y + h - 4, w + 6, 5);
}

/** กิ่งไผ่มีหิมะเกาะ แทนคาน — w170 h54 */
function drawSnowBranch(ctx, x, y, w, h) {
  // เสาไผ่ขึ้นไปนอกจอ
  ctx.fillStyle = 'rgba(92,116,84,.95)';
  ctx.fillRect(x + 10, 0, 12, y);
  ctx.fillRect(x + w - 22, 0, 12, y);

  // ลำไผ่แนวนอน
  ctx.fillStyle = '#7C9A66';
  ctx.fillRect(x, y + 10, w, h - 22);
  // ข้อไผ่
  ctx.fillStyle = 'rgba(60,80,52,.5)';
  for (let i = 1; i < 5; i++) ctx.fillRect(x + (w / 5) * i, y + 10, 3, h - 22);

  // หิมะกองบนลำไผ่ ขอบล่างหยักเหมือนหิมะเกาะจริง
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(x, y + 12);
  ctx.lineTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + 12);
  for (let i = 10; i >= 0; i--) {
    const bx = x + (w / 10) * i;
    ctx.quadraticCurveTo(bx + w / 20, y + 18, bx, y + 12);
  }
  ctx.closePath();
  ctx.fill();

  // แถบน้ำแข็งใต้กิ่ง = เส้นบอกความต่ำ
  ctx.fillStyle = '#6FC9EE';
  ctx.fillRect(x, y + h - 12, w, 3);
}

/** ก้อนน้ำแข็ง แทนกล่องลัง — ชั้นละ w46 h44 */
function drawIceBlockStack(ctx, x, y, w, h, rows = 1) {
  const rh = h / rows;
  for (let i = 0; i < rows; i++) drawIceBlock(ctx, x, y + i * rh, w, rh, i === 0);
}

function drawIceBlock(ctx, x, y, w, h, topBlock) {
  ctx.fillStyle = '#A8DCF2';
  ctx.fillRect(x, y, w, h);
  // ผิวบนขาวเหมือนหิมะเกาะ
  ctx.fillStyle = '#EAF8FF';
  ctx.fillRect(x, y, w, 6);
  // รอยแตกในเนื้อน้ำแข็ง
  ctx.strokeStyle = 'rgba(255,255,255,.65)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.28, y + 8); ctx.lineTo(x + w * 0.46, y + h * 0.55);
  ctx.lineTo(x + w * 0.3, y + h - 6);
  ctx.moveTo(x + w * 0.62, y + 10); ctx.lineTo(x + w * 0.74, y + h * 0.6);
  ctx.stroke();
  // กรอบนอก
  ctx.strokeStyle = '#5E9EBE';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);

  if (topBlock) {
    // กองหิมะเล็กบนก้อนบนสุด
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y, w * 0.3, 5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }
}

// ── เม็ดอาหารแมวรูปปลา ───────────────────────────────────────
// ทุกสัดส่วนคูณจาก r เพื่อให้ตัวเดียวกันนี้ใช้ได้ทั้งในด่านและบน HUD
// หันหน้าไปทางขวา (ทิศที่แมววิ่ง) หางอยู่ซ้าย

/**
 * แคชภาพปลาสำเร็จรูป — หนึ่งภาพต่อหนึ่งรัศมี
 *
 * ── ทำไมต้องแคช ──
 * ปลาเป็นของที่มีเยอะที่สุดบนจอ (วัดได้ราวยี่สิบสองตัวพร้อมกัน) และแต่ละตัว
 * วาดด้วยคำสั่งราวสิบคำสั่ง โดยสองคำสั่งในนั้นเปิด shadowBlur ไว้
 * shadowBlur คือคำสั่งที่แพงที่สุดตัวหนึ่งของ canvas — เบราว์เซอร์ต้องเปิดผิวชั่วคราว
 * แล้ววิ่ง blur หนึ่งรอบต่อการวาดหนึ่งครั้ง วัดได้ 44 ครั้งต่อเฟรมมาจากปลาล้วน ๆ
 *
 * สีของปลาเป็นค่าคงที่ (COLORS ใน config) ไม่เปลี่ยนตามด่าน ภาพจึงเหมือนเดิมเสมอ
 * วาดครั้งเดียวเก็บไว้ แล้วที่เหลือเป็น drawImage ครั้งเดียวต่อตัว
 *
 * เก็บที่ความละเอียดสองเท่าแล้วย่อลงตอนวาด ภาพจึงยังคมตอนถูกย่อขยาย
 */
const FISH_SPRITE = new Map();
const FISH_SS = 2;

function fishSprite(r) {
  const key = Math.round(r * 4) / 4;
  const hit = FISH_SPRITE.get(key);
  if (hit) return hit;

  // ตอนนี้รัศมีมีไม่กี่ค่า (11 ในด่าน 10 บน HUD) แคชจึงเล็กมาก
  // ถ้าวันหลังมีใครทำให้ปลาย่อขยายต่อเนื่อง แคชจะโตไม่หยุดจนกินหน่วยความจำ
  // ล้างทิ้งเมื่อโตเกินควรเป็นประกันที่ถูกกว่าการไปไล่แก้ทีหลัง
  if (FISH_SPRITE.size > 24) FISH_SPRITE.clear();

  // เผื่อขอบให้แสงเรืองที่ฟุ้งออกไปไม่ถูกตัด — รัศมีเบลอ 12 บวกครีบที่ยื่นออกไป
  const pad = 22;
  const w = Math.ceil(r * 2.9) + pad * 2;
  const h = Math.ceil(r * 2.4) + pad * 2;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w * FISH_SS);
  cv.height = Math.ceil(h * FISH_SS);
  const g = cv.getContext('2d');
  g.scale(FISH_SS, FISH_SS);
  g.translate(w / 2, h / 2);
  paintFish(g, r);

  const made = { cv, w, h, ox: w / 2, oy: h / 2 };
  FISH_SPRITE.set(key, made);
  return made;
}

export function drawFish(ctx, x, y, r) {
  const s = fishSprite(r);
  ctx.drawImage(s.cv, x - s.ox, y - s.oy, s.w, s.h);
}

/** รูปปลาจริง ๆ วาดที่จุดกำเนิด — ถูกเรียกครั้งเดียวต่อรัศมีตอนสร้างแคช */
function paintFish(ctx, r) {
  // ขอบเข้ม — วาดเงาร่างเดียวกันขยาย 15% ไว้ข้างใต้
  // จำเป็นตั้งแต่มีด่านกลางวัน เพราะปลาสีมิ้นต์ทับเนินหญ้าเขียวแล้วกลืนกันสนิท
  // แสงเรืองช่วยไม่ได้เลยเมื่อพื้นหลังสว่างพอ ๆ กับตัวปลา ต้องใช้ขอบเข้มเท่านั้น
  ctx.save();
  ctx.scale(1.15, 1.15);
  ctx.fillStyle = 'rgba(14,36,32,.5)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, 0);
  ctx.lineTo(-r * 1.38, -r * 0.64);
  ctx.lineTo(-r * 1.38, r * 0.64);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

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

// ── กุ้งทอง ──────────────────────────────────────────────────

/** ประกายสี่แฉก ปลายเรียวด้วยเส้นโค้ง ไม่ใช่สามเหลี่ยมแหลม ๆ */
function glint(ctx, x, y, size, alpha) {
  if (size <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = C.glint;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.16, y - size * 0.16, x + size, y);
  ctx.quadraticCurveTo(x + size * 0.16, y + size * 0.16, x, y + size);
  ctx.quadraticCurveTo(x - size * 0.16, y + size * 0.16, x - size, y);
  ctx.quadraticCurveTo(x - size * 0.16, y - size * 0.16, x, y - size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** ตำแหน่งกับจังหวะของประกายแต่ละดวง วนคนละเฟส จะได้ไม่วิบตรงกันทั้งสามดวง */
const GLINTS = [
  { dx: 0.95, dy: -0.85, size: 0.42, phase: 0 },
  { dx: -1.05, dy: 0.6, size: 0.32, phase: 2.1 },
  { dx: 0.25, dy: 0.95, size: 0.26, phase: 4.2 },
];

export function drawShrimp(ctx, x, y, r, t = 0) {
  ctx.save();
  ctx.translate(x, y);

  // เรืองทองรอบตัว เข้มกว่าของกินอื่นเพราะต้องอ่านออกว่า "ของพิเศษ"
  ctx.save();
  ctx.shadowColor = 'rgba(255,193,69,.95)';
  ctx.shadowBlur = 18;

  // ลำตัวโค้งแบบกุ้ง: หลังโก่งขึ้น หัวมนอยู่ขวา ท้องเว้าเข้า
  ctx.fillStyle = C.shrimp;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.1);
  ctx.quadraticCurveTo(-r * 0.15, -r * 0.92, r * 0.7, -r * 0.5);
  ctx.quadraticCurveTo(r * 1.25, r * 0.02, r * 0.58, r * 0.46);
  ctx.quadraticCurveTo(-r * 0.05, r * 0.62, -r * 0.5, r * 0.22);
  ctx.closePath();
  ctx.fill();

  // หางพัด สามแฉกที่ปลายซ้าย
  for (const a of [-0.42, 0, 0.42]) {
    ctx.save();
    ctx.translate(-r * 0.46, r * 0.06);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.16);
    ctx.lineTo(-r * 0.78, -r * 0.3);
    ctx.lineTo(-r * 0.78, r * 0.3);
    ctx.lineTo(0, r * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // ปล้องลำตัว วาดหลังตัวเพื่อให้ทับบนสีพื้น
  ctx.strokeStyle = C.shrimpDark;
  ctx.lineWidth = r * 0.11;
  ctx.lineCap = 'round';
  for (const [sx, sy, ex, ey] of [
    [-r * 0.2, -r * 0.55, -r * 0.26, r * 0.34],
    [r * 0.1, -r * 0.66, r * 0.04, r * 0.44],
    [r * 0.4, -r * 0.66, r * 0.34, r * 0.46],
  ]) {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + ex) / 2 - r * 0.12, (sy + ey) / 2, ex, ey);
    ctx.stroke();
  }

  // แสงตกกระทบบนหลัง ทำให้ดูมันวาวเป็นของพรีเมียม
  ctx.strokeStyle = C.shrimpLite;
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.5);
  ctx.quadraticCurveTo(r * 0.2, -r * 0.72, r * 0.62, -r * 0.42);
  ctx.stroke();

  // ขาเล็ก ๆ ใต้ท้อง
  ctx.strokeStyle = C.shrimpDark;
  ctx.lineWidth = r * 0.075;
  for (const lx of [-r * 0.16, r * 0.06, r * 0.28]) {
    ctx.beginPath();
    ctx.moveTo(lx, r * 0.42);
    ctx.lineTo(lx - r * 0.1, r * 0.68);
    ctx.stroke();
  }

  // หนวดยาวสองเส้นสะบัดไปข้างหน้า
  ctx.strokeStyle = C.shrimpLite;
  ctx.lineWidth = r * 0.07;
  const sway = Math.sin(t * 0.08) * r * 0.12;
  ctx.beginPath();
  ctx.moveTo(r * 0.9, r * 0.06);
  ctx.quadraticCurveTo(r * 1.4, -r * 0.2 + sway, r * 1.75, -r * 0.5 + sway);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.9, r * 0.2);
  ctx.quadraticCurveTo(r * 1.45, r * 0.3 - sway, r * 1.8, r * 0.14 - sway);
  ctx.stroke();

  // ตา
  ctx.fillStyle = C.catInk;
  ctx.beginPath();
  ctx.arc(r * 0.72, -r * 0.16, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath();
  ctx.arc(r * 0.77, -r * 0.22, r * 0.055, 0, Math.PI * 2);
  ctx.fill();

  // ประกายวิบวับ วาดท้ายสุดให้ลอยอยู่เหนือทุกชั้น
  for (const g of GLINTS) {
    const pulse = Math.sin(t * 0.075 + g.phase);
    if (pulse > 0) glint(ctx, r * g.dx, r * g.dy, r * g.size * pulse, pulse * 0.95);
  }

  ctx.restore();
}

// ── แม่เหล็ก ─────────────────────────────────────────────────

export function drawMagnet(ctx, x, y, r, t = 0) {
  ctx.save();
  ctx.translate(x, y);

  // เอียงไปมาเบา ๆ ให้ดูมีชีวิต ไม่ใช่ป้ายติดผนัง
  ctx.rotate(Math.sin(t * 0.05) * 0.16);

  const lw = r * 0.46;          // ความหนาของแท่งแม่เหล็ก
  const rad = r * 0.6;          // รัศมีของส่วนโค้งเกือกม้า
  const legTop = r * 0.1;       // ระดับที่ขาเริ่มตรง
  const legBottom = r * 0.82;   // ปลายขา

  ctx.lineWidth = lw;
  ctx.lineCap = 'butt';

  // ตัวเกือกม้าสีแดง วาดเป็นครึ่งวงกลมคว่ำ + ขาสองข้าง
  ctx.save();
  ctx.shadowColor = 'rgba(232,67,79,.9)';
  ctx.shadowBlur = 15;
  ctx.strokeStyle = C.magnet;
  ctx.beginPath();
  ctx.arc(0, legTop, rad, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-rad, legTop); ctx.lineTo(-rad, legBottom);
  ctx.moveTo(rad, legTop); ctx.lineTo(rad, legBottom);
  ctx.stroke();
  ctx.restore();

  // ไฮไลต์บนส่วนโค้ง ทำให้ดูเป็นโลหะมันแทนที่จะเป็นเส้นแบน
  ctx.strokeStyle = C.magnetLite;
  ctx.lineWidth = lw * 0.3;
  ctx.beginPath();
  ctx.arc(0, legTop, rad + lw * 0.22, Math.PI * 1.12, Math.PI * 1.62);
  ctx.stroke();

  // ปลายขั้วสีเงิน — ตัวบอกว่านี่คือแม่เหล็ก ไม่ใช่เกือกม้าเฉย ๆ
  ctx.strokeStyle = C.magnetSteel;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-rad, legBottom - r * 0.26); ctx.lineTo(-rad, legBottom);
  ctx.moveTo(rad, legBottom - r * 0.26); ctx.lineTo(rad, legBottom);
  ctx.stroke();

  ctx.restore();
}

export function drawMagnets(ctx, magnets, camera, tick) {
  for (const m of magnets) {
    if (m.got) continue;
    const x = m.x - camera;
    if (x > W + 50 || x < -50) continue;
    drawMagnet(ctx, x, floatY(m, tick), m.r, tick);
  }
}

/**
 * คลื่นดูดหน้าปากแมวตอนแม่เหล็กทำงาน
 * วาดเป็นส่วนโค้งเปิดไปข้างหน้า ไล่ออกจากปากแล้วจางหาย
 * บอกทั้งว่า "กำลังดูดอยู่" และ "ดูดไปทางไหน" ในภาพเดียว
 */
/**
 * จุดอ้างอิงของตัวแมวที่ "ตาเห็นจริง" หลังถูกขยายด้วยอาหารกระป๋อง
 *
 * ── ทำไมต้องมีตัวนี้ ──
 * กล่องชน (player.box) ไม่โตตามตอนตัวใหญ่ มันคงขนาดเดิมเสมอ (BODY.standH = 46)
 * ของทุกอย่างที่เกาะตัวแมวจึงคำนวณจากกล่องเดิมแล้วไปโผล่ผิดที่ตอนตัวโต
 * วงโล่รัศมี 32px เคยกลายเป็นวงเล็ก ๆ ที่ผ่ากลางพุงแมวตัวสูง 106px
 *
 * ── ทำไม y ต้องเลื่อนขึ้น ไม่ใช่แค่คูณรัศมี ──
 * drawPlayer ขยายรอบ "เท้า" ไม่ใช่รอบกลางกล่อง (ไม่งั้นครึ่งล่างจะจมดิน)
 * กลางตัวที่ตาเห็นจึงลอยสูงขึ้นเท่ากับครึ่งหนึ่งของส่วนสูงที่เพิ่มมา
 *
 * @returns x กลางตัว | y กลางตัวที่ตาเห็น | top หัวสุดที่ตาเห็น | s ตัวคูณขนาด
 */
export function catView(player, scale = 1) {
  const b = player.box;
  const half = b.h / 2;
  return {
    x: b.x + b.w / 2,
    y: b.y + half + half * (1 - scale),
    top: b.y + b.h * (1 - scale),
    s: scale,
  };
}

export function drawSuction(ctx, player, tick, scale = 1) {
  const v = catView(player, scale);
  const cx = v.x + 14 * v.s;
  const cy = v.y - 6 * v.s;

  ctx.save();
  ctx.strokeStyle = C.mintLite;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    // แต่ละคลื่นวิ่งเข้าหาปากแล้ววนใหม่ เฟสห่างกันหนึ่งในสาม
    const p = ((tick * 0.035 + i / 3) % 1);
    const rad = (16 + p * 30) * v.s;
    ctx.globalAlpha = (1 - p) * 0.55;
    ctx.lineWidth = 2.6 * (1 - p * 0.5) * v.s;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, -0.62, 0.62);
    ctx.stroke();
  }
  ctx.restore();
}

// ── เม็ดที่โปรยลงมาตอนใช้ความสามารถ ──────────────────────────
// สีมาจากสกิน แมวส้มโปรยเม็ดส้มแดง แมวขาวโปรยเม็ดขาวเทา

// ── ทรงของเม็ดที่โปรยลงมา ────────────────────────────────────
// ชุดระดับสูงเปลี่ยนได้ทั้งสีและทรง ชุดอื่นใช้ลูกกลมสีประจำสีขนตามเดิม
// ทุกทรงหมุน/พลิกด้วยเฟสที่อิงพิกัด x ของตัวเอง เม็ดที่ตกพร้อมกัน
// จึงไม่หมุนพร้อมกันเป๊ะจนดูเป็นของชิ้นเดียวถูกก๊อบวาง

/** ลูกกลมแบบเดิม */
function rainBall(ctx, x, y, r, t, main, lite, dark) {
  ctx.save();
  ctx.shadowColor = main;
  ctx.shadowBlur = 14;
  ctx.fillStyle = main;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // ขอบล่างเข้ม ทำให้ดูกลมมีน้ำหนักแทนที่จะเป็นจานแบน
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r - 1, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();

  ctx.fillStyle = lite;
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.34, r * 0.34, 0, Math.PI * 2); ctx.fill();
}

/** ใบไม้กับดอกไม้สลับกันไป เลือกจาก seed ประจำเม็ดจึงคงที่ตลอดอายุของมัน */
function rainLeaf(ctx, x, y, r, t, main, lite, dark, seed = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.035 + x * 0.02) * 0.55);
  ctx.shadowColor = main;
  ctx.shadowBlur = 12;

  if (seed < 0.5) {
    // ใบไม้ — สองซีกโค้งบรรจบกันที่ปลายทั้งสองข้าง
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.1);
    ctx.quadraticCurveTo(r * 0.92, -r * 0.08, 0, r * 1.1);
    ctx.quadraticCurveTo(-r * 0.92, -r * 0.08, 0, -r * 1.1);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(0, r * 0.9); ctx.stroke();
    for (const k of [-0.4, 0.05, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(0, r * k); ctx.lineTo(r * 0.46, r * (k + 0.3));
      ctx.moveTo(0, r * k); ctx.lineTo(-r * 0.46, r * (k + 0.3));
      ctx.stroke();
    }
  } else {
    // ดอกไม้ห้ากลีบ
    ctx.fillStyle = main;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6,
        r * 0.5, r * 0.34, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = lite;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.17, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** เกล็ดหิมะหกแฉก แต่ละแฉกมีกิ่งย่อยสองข้าง */
function rainSnow(ctx, x, y, r, t, main, lite, dark) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.018 + x * 0.01);
  ctx.lineCap = 'round';

  ctx.shadowColor = main;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = lite;
  ctx.lineWidth = r * 0.26;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(-Math.cos(a) * r, -Math.sin(a) * r);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.strokeStyle = main;
  ctx.lineWidth = r * 0.16;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bx = Math.cos(a) * r * 0.6;
    const by = Math.sin(a) * r * 0.6;
    for (const s of [-0.62, 0.62]) {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a + s) * r * 0.36, by + Math.sin(a + s) * r * 0.36);
      ctx.stroke();
    }
  }

  ctx.fillStyle = lite;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** เหรียญทองพลิกหมุน — บีบความกว้างตามโคไซน์ เหมือนหมุนรอบแกนตั้งจริง */
function rainCoin(ctx, x, y, r, t, main, lite, dark) {
  const flip = Math.max(0.13, Math.abs(Math.cos(t * 0.05 + x * 0.03)));

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = main;
  ctx.shadowBlur = 13;
  ctx.fillStyle = main;
  ctx.beginPath(); ctx.ellipse(0, 0, r * flip, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(0, 0, r * flip, r, 0, 0, Math.PI * 2); ctx.stroke();

  // ลายกลางเหรียญโผล่เฉพาะตอนหันหน้าเข้าหาเรา ตอนพลิกข้างจะบางจนไม่มีที่วาด
  if (flip > 0.42) {
    ctx.strokeStyle = lite;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * flip * 0.68, r * 0.68, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.scale(flip, 1);
    ctx.fillStyle = lite;
    star4(ctx, 0, 0, r * 0.4);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * ผลไม้ห้าชนิดสลับกัน — แตงโม มะม่วง องุ่น ส้ม กล้วย
 *
 * เลือกชนิดจาก seed ประจำเม็ด ซึ่งสุ่มครั้งเดียวตอนเกิดแล้วไม่เปลี่ยนอีก
 * เม็ดหนึ่งลูกจึงเป็นผลไม้ชนิดเดิมตลอดที่มันร่วงลงมา
 *
 * ที่รัศมี 12px รายละเอียดเล็ก ๆ มองไม่เห็นอยู่แล้ว แต่ละชนิดจึงต้องแยกกันได้
 * ด้วย "เงาร่างกับสี" เป็นหลัก — สามเหลี่ยม/รี/พวง/กลม/เสี้ยว คนละทรงกันหมด
 */
function rainFruit(ctx, x, y, r, t, main, lite, dark, seed = 0) {
  const kind = Math.min(4, Math.floor(seed * 5));

  ctx.save();
  ctx.translate(x, y);
  // แกว่งเบา ๆ ตอนร่วง ให้ดูเหมือนของจริงที่ตกลงมา ไม่ใช่ภาพนิ่งเลื่อนลง
  ctx.rotate(Math.sin(t * 0.03 + x * 0.02) * 0.35);

  if (kind === 0) {
    // ── แตงโม: เสี้ยวสามเหลี่ยม เนื้อแดง เปลือกเขียวอยู่ขอบโค้งด้านล่าง
    ctx.shadowColor = '#FF4D5E'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#FF4D5E';
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.92, r * 0.62);
    ctx.lineTo(-r * 0.92, r * 0.62);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#2FA858';
    ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.92, r * 0.62); ctx.lineTo(r * 0.92, r * 0.62);
    ctx.stroke();
    ctx.fillStyle = '#3A1010';
    for (const sx of [-0.32, 0.32]) {
      ctx.beginPath(); ctx.ellipse(r * sx, r * 0.16, 1.1, 1.7, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (kind === 1) {
    // ── มะม่วง: ทรงรีเอียง ไล่สีเหลืองไปส้ม มีขั้วเขียวสั้น ๆ
    ctx.shadowColor = '#FFB627'; ctx.shadowBlur = 12;
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, '#FFE27A');
    g.addColorStop(1, '#FF9A2E');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#3FBF6A';
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.78); ctx.lineTo(r * 0.5, -r * 1.14); ctx.stroke();
  } else if (kind === 2) {
    // ── องุ่น: พวงลูกกลมเล็กซ้อนกัน ทรงสามเหลี่ยมคว่ำ
    ctx.shadowColor = '#B06CE8'; ctx.shadowBlur = 12;
    const beads = [[0, -r * 0.6], [-r * 0.46, -r * 0.1], [r * 0.46, -r * 0.1],
                   [-r * 0.24, r * 0.42], [r * 0.24, r * 0.42], [0, r * 0.9]];
    beads.forEach(([bx, by], i) => {
      ctx.fillStyle = i % 2 ? '#9B54D6' : '#B672F0';
      ctx.beginPath(); ctx.arc(bx, by, r * 0.36, 0, Math.PI * 2); ctx.fill();
    });
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#3FBF6A';
    ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(r * 0.2, -r * 1.2); ctx.stroke();
  } else if (kind === 3) {
    // ── ส้ม: ลูกกลมสีส้ม มีใบเขียวบนขั้ว
    ctx.shadowColor = '#FF8A2E'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#FF8A2E';
    ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.88, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // ร่องกลีบจาง ๆ ทำให้อ่านเป็นส้มไม่ใช่ลูกบอลสีส้ม
    ctx.strokeStyle = 'rgba(180,80,10,.35)';
    ctx.lineWidth = 1.2;
    for (const a of [-0.5, 0.5]) {
      ctx.beginPath();
      ctx.ellipse(0, r * 0.1, r * 0.34, r * 0.86, a, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#FFC46B';
    ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.24, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3FBF6A';
    ctx.beginPath();
    ctx.ellipse(r * 0.26, -r * 0.86, r * 0.34, r * 0.17, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // ── กล้วย: เสี้ยวโค้ง ปลายทั้งสองข้างเข้ม
    ctx.shadowColor = '#FFD93C'; ctx.shadowBlur = 12;
    // เสี้ยวต้องหนาพอ ๆ กับผลไม้ชนิดอื่น ไม่งั้นมวลของภาพจะเล็กกว่าเพื่อนมาก
    // จนดูเหมือนเป็นเศษอะไรสักอย่างที่ตกมาแทนที่จะเป็นผลไม้อีกลูกหนึ่ง
    ctx.fillStyle = '#FFD93C';
    ctx.beginPath();
    ctx.moveTo(-r * 0.86, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.24, r * 1.32, r * 0.9, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.18, r * 0.5, -r * 0.86, -r * 0.6);
    ctx.fill();
    // แถบเงาด้านในโค้ง ให้เห็นว่าเป็นผลทรงกระบอกโค้ง ไม่ใช่แผ่นเสี้ยวแบน
    ctx.fillStyle = 'rgba(190,150,20,.35)';
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.5);
    ctx.quadraticCurveTo(r * 0.2, r * 0.92, r * 0.78, -r * 0.36);
    ctx.quadraticCurveTo(r * 0.16, r * 0.62, -r * 0.7, -r * 0.5);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#8A6A18';
    ctx.beginPath(); ctx.arc(-r * 0.8, -r * 0.5, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.84, -r * 0.32, r * 0.14, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}

// แปดสีของหยดน้ำสายรุ้ง เรียงไล่โทนต่อเนื่อง ม่วง -> ชมพู
// วนกลับมาที่ม่วงพอดี เม็ดที่ร่วงติด ๆ กันจึงไล่สีต่อเนื่องไม่สะดุด
const DROP_COLORS = [
  '#A96BFF',  // ม่วง
  '#5BC8FF',  // ฟ้า
  '#3A7BFF',  // น้ำเงิน
  '#3FD98A',  // เขียว
  '#FFE04D',  // เหลือง
  '#FF9A3C',  // ส้ม
  '#FF4D5E',  // แดง
  '#FF7ABF',  // ชมพู
];

/**
 * หยดน้ำใสไล่แปดสี
 *
 * สีเลือกจาก seed ประจำเม็ด ไม่ใช่จากพิกัด — เม็ดหนึ่งลูกจึงเป็นสีเดิมตลอด
 *
 * ── ทำไมต้องโปร่งแสง ไม่ใช่ทึบ ──
 * หยดน้ำอ่านออกว่าเป็น "น้ำ" เพราะมองทะลุได้ ถ้าทึบจะกลายเป็นหยดสีเฉย ๆ
 * จึงวาดเป็นสามชั้น: เนื้อในโปร่ง -> ขอบเข้มกว่า -> ไฮไลต์ขาวจุดเดียว
 * ชั้นไฮไลต์คือตัวที่ทำให้ดูเป็นผิวโค้งมันวาว ขาดไปเมื่อไหร่จะแบนทันที
 */
function rainDrop(ctx, x, y, r, t, main, lite, dark, seed = 0) {
  const col = DROP_COLORS[Math.min(DROP_COLORS.length - 1,
    Math.floor(seed * DROP_COLORS.length))];

  ctx.save();
  ctx.translate(x, y);
  // แกว่งน้อยกว่าผลไม้มาก หยดน้ำที่ส่ายแรงจะดูเหมือนของแข็ง
  ctx.rotate(Math.sin(t * 0.025 + x * 0.02) * 0.16);

  // ทรงหยดน้ำ: ปลายแหลมด้านบน ท้องกลมด้านล่าง
  const drop = () => {
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.15);
    ctx.bezierCurveTo(r * 0.62, -r * 0.3, r * 0.86, r * 0.28, 0, r * 0.98);
    ctx.bezierCurveTo(-r * 0.86, r * 0.28, -r * 0.62, -r * 0.3, 0, -r * 1.15);
    ctx.closePath();
  };

  ctx.shadowColor = col;
  ctx.shadowBlur = 14;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = col;
  drop(); ctx.fill();
  ctx.shadowBlur = 0;

  // ขอบเข้มกว่าเนื้อใน ทำให้เห็นรูปทรงชัดบนพื้นหลังทุกสี
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.8;
  drop(); ctx.stroke();

  // ไฮไลต์ผิวโค้ง — จุดใหญ่ที่ท้องหยด กับขีดบางที่ไหล่
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.ellipse(-r * 0.26, r * 0.2, r * 0.2, r * 0.28, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.ellipse(r * 0.24, -r * 0.16, r * 0.1, r * 0.2, 0.4, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

/**
 * ดาวเงิน — ใช้กับชุดจันทราแมวรัตติกาล
 *
 * ดาวสี่แฉกซ้อนสองชั้น ชั้นนอกใหญ่จางเป็นแสงฟุ้ง ชั้นในเล็กทึบเป็นตัวดาว
 * หมุนช้า ๆ ตาม seed ประจำเม็ด ดาวแต่ละดวงจึงเอียงไม่เท่ากันตลอดอายุของมัน
 */
function rainStar(ctx, x, y, r, t, main, lite, dark, seed = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(seed * Math.PI * 2 + t * 0.02);

  ctx.shadowColor = main;
  ctx.shadowBlur = 16;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = main;
  star4(ctx, 0, 0, r * 1.15);
  ctx.shadowBlur = 0;

  ctx.globalAlpha = 1;
  ctx.fillStyle = lite;
  star4(ctx, 0, 0, r * 0.7);
  ctx.restore();
}

/**
 * ลูกกวาดกับหัวใจสลับกัน — ใช้กับชุดเหมียวขนมหวานมหัศจรรย์
 *
 * เลือกทรงจาก seed ประจำเม็ด (กฎเดียวกับผลไม้กับหยดน้ำ)
 * ห้ามเลือกจากพิกัด เพราะพิกัดเปลี่ยนทุกเฟรมตามกล้อง เม็ดจะกระพริบสลับทรง
 */
function rainSweet(ctx, x, y, r, t, main, lite, dark, seed = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.03 + seed * 9) * 0.4);
  ctx.shadowColor = main;
  ctx.shadowBlur = 14;

  if (seed < 0.5) {
    // หัวใจชมพู
    ctx.fillStyle = '#FF8FC0';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.95);
    ctx.bezierCurveTo(-r * 1.5, -r * 0.3, -r * 0.55, -r * 1.15, 0, -r * 0.3);
    ctx.bezierCurveTo(r * 0.55, -r * 1.15, r * 1.5, -r * 0.3, 0, r * 0.95);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.34, r * 0.22, r * 0.32, -0.5, 0, Math.PI * 2); ctx.fill();
  } else {
    // ลูกกวาดห่อบิด — วงกลมกลางกับปีกสามเหลี่ยมสองข้าง
    ctx.fillStyle = '#A8DCFF';
    ctx.beginPath();
    ctx.moveTo(-r * 1.3, -r * 0.62); ctx.lineTo(-r * 0.5, 0); ctx.lineTo(-r * 1.3, r * 0.62);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 1.3, -r * 0.62); ctx.lineTo(r * 0.5, 0); ctx.lineTo(r * 1.3, r * 0.62);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFF3DC';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#FF8FC0';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0.2, 3.4); ctx.stroke();
  }
  ctx.restore();
}

const RAIN_SHAPES = { leaf: rainLeaf, snow: rainSnow, coin: rainCoin, fruit: rainFruit, drop: rainDrop, star: rainStar, sweet: rainSweet };

/**
 * เม็ดที่โปรยลงมาตอนใช้ความสามารถ
 *
 * ── ทำไมต้องส่ง seed เข้าไปด้วย ──
 * ทรงที่มีหลายแบบ (ผลไม้ ใบไม้ หยดน้ำ) ต้องเลือกแบบจาก "ตัวเม็ด" เท่านั้น
 * เคยเลือกจากพิกัด x ซึ่งผิด เพราะ x ที่ส่งเข้าไปเป็นพิกัดบนจอ = d.x - camera
 * กล้องเลื่อน 6.8px ทุกเฟรม แถมเม็ดยังถูกดูดเข้าหาแมวอีก ค่าจึงเปลี่ยนตลอด
 * ผลคือผลไม้ลูกเดียวสลับชนิดไปมาทุกเฟรมจนดูเหมือนกระพริบ
 *
 * seed สุ่มครั้งเดียวตอนเม็ดเกิดแล้วไม่เปลี่ยนอีก ลูกไหนเป็นส้มก็เป็นส้มจนหายไป
 */
export function drawRain(ctx, drops, camera, skin, t) {
  // ชุดระดับสูงเปลี่ยนทั้งสีและทรง ชุดอื่นใช้ลูกกลมสีประจำสีขนตามเดิม
  const [main, lite, dark] = skin.outfit?.rain || skin.rain;
  const glow = skin.outfit?.glow;
  const shape = RAIN_SHAPES[skin.outfit?.rainShape] || rainBall;

  for (const d of drops) {
    if (d.got) continue;
    const x = d.x - camera;
    if (x > W + 40 || x < -40) continue;
    const r = SKILL.rainR;

    // เม็ดเก่าที่เกิดก่อนจะมี seed ไม่ได้ ให้ตกกลับไปใช้ 0 แทนที่จะพัง
    shape(ctx, x, d.y, r, t, main, lite, dark, d.seed || 0);
    if (glow) twinkle(ctx, x, d.y, r, t, glow);
  }
}

/**
 * หลอดความสามารถลอยเหนือหัวแมว
 * เต็มแล้วเปลี่ยนเป็นแถบเรืองแสงกะพริบ ให้รู้ทันทีว่ากำลังออกฤทธิ์อยู่
 */
export function drawSkillGauge(ctx, player, ratio, active, t, scale = 1) {
  // เกาะ "หัวที่ตาเห็น" ไม่ใช่ขอบบนของกล่องชนซึ่งไม่โตตามตัว
  // ตอนตัวใหญ่ หัวสูงขึ้นราว 60px ถ้ายังยึดกล่องเดิม หลอดจะจมอยู่กลางหน้าแมว
  // ตัวหลอดไม่ขยายตาม เพราะมันคือข้อมูล ไม่ใช่ส่วนหนึ่งของตัวละคร
  const v = catView(player, scale);
  const x = v.x - SKILL.gaugeW / 2;
  // ไม่ให้หลุดขอบบนจอตอนตัวโตแล้วกระโดดสองชั้น (ดู SKILL.gaugeMinY)
  const y = Math.max(SKILL.gaugeMinY, v.top - SKILL.gaugeUp);
  const w = SKILL.gaugeW;
  const h = SKILL.gaugeH;

  ctx.save();

  // ราง
  ctx.fillStyle = 'rgba(20,10,32,.62)';
  ctx.beginPath();
  ctx.roundRect(x - 2, y - 2, w + 4, h + 4, (h + 4) / 2);
  ctx.fill();

  if (active) {
    // ออกฤทธิ์: เต็มหลอดตลอด แต่กะพริบเพื่อบอกว่าเป็นสถานะพิเศษ
    // ต้องบังคับเป็น 1 เพราะ charge ถูกรีเซ็ตเป็น 0 ตอนความสามารถติด
    // ถ้าใช้ ratio ตรง ๆ หลอดจะว่างเปล่าตลอดช่วงที่กำลังออกฤทธิ์
    // ต่ำสุด 0.72 ไม่ใช่ 0.30 — ขาวจาง ๆ ทับรางเข้มแล้วกลายเป็นเทา
    // มองไม่ออกว่าหลอดเต็ม ซึ่งเป็นข้อมูลชิ้นเดียวที่หลอดนี้มีหน้าที่บอก
    ctx.globalAlpha = 0.86 + Math.sin(t * 0.35) * 0.14;
    ctx.fillStyle = C.glint;
  } else {
    ctx.fillStyle = ratio >= 1 ? C.glint : C.mintLite;
  }
  const fw = (active ? 1 : Math.max(0, Math.min(1, ratio))) * w;
  if (fw > 0.5) {
    ctx.beginPath();
    ctx.roundRect(x, y, fw, h, h / 2);
    ctx.fill();
  }

  ctx.restore();
}

// ── ต้นหญ้าแมว ───────────────────────────────────────────────

/** ช่อใบเขียวบนก้าน — เรืองเขียวสดให้แยกจากกระบองเพชรของด่านสวนได้ */
export function drawNip(ctx, x, y, r, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  // ลอยอยู่แล้ว จึงหมุนรอบกลางช่อ ไม่ใช่รอบโคนแบบตอนที่ยังงอกติดพื้น
  ctx.rotate(Math.sin(t * 0.06) * 0.1);

  ctx.save();
  ctx.shadowColor = 'rgba(95,211,90,.95)';
  ctx.shadowBlur = 16;

  // ก้าน
  ctx.strokeStyle = C.nipDark;
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, r * 0.6);
  ctx.lineTo(0, -r * 0.5);
  ctx.stroke();

  // ใบสามคู่ ไล่เล็กลงไปทางยอด
  // ตีเส้นขอบเขียวเข้มด้วย มิฉะนั้นใบจะกลืนกับเนินหญ้าของด่านสวนจนมองไม่เห็น
  // (ปัญหาเดียวกับปลามินต์ที่เคยแก้ด้วยการเติมขอบเข้ม)
  ctx.fillStyle = C.nip;
  ctx.strokeStyle = C.nipDark;
  ctx.lineWidth = r * 0.09;
  for (let i = 0; i < 3; i++) {
    const ly = r * (0.5 - i * 0.5);
    const s = 1 - i * 0.22;
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.translate(dir * r * 0.1, ly);
      ctx.rotate(dir * 0.7);
      ctx.beginPath();
      ctx.ellipse(dir * r * 0.42 * s, 0, r * 0.44 * s, r * 0.2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();

  // เส้นกลางใบคู่ล่าง ให้ดูเป็นใบไม้จริงไม่ใช่วงรีเปล่า
  ctx.strokeStyle = C.nipDark;
  ctx.lineWidth = 1.2;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * r * 0.14, r * 0.46);
    ctx.lineTo(dir * r * 0.7, r * 0.16);
    ctx.stroke();
  }

  // ช่อดอกม่วงบนยอด — เป็นทั้งของจริงตามพฤกษศาสตร์และตัวแยกสีจากพื้นหลังเขียว
  ctx.save();
  ctx.shadowColor = 'rgba(199,125,255,.9)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = C.nipBloom;
  for (const [ox, oy, or_] of [[0, -0.78, 0.26], [-0.3, -0.55, 0.19], [0.3, -0.55, 0.19]]) {
    ctx.beginPath();
    ctx.arc(ox * r, oy * r, or_ * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // จุดสว่างกลางดอกบนสุด ให้ดอกดูมีมิติไม่ใช่วงกลมแบน
  ctx.fillStyle = C.nipBloomLite;
  ctx.beginPath();
  ctx.arc(-r * 0.07, -r * 0.85, r * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * อาหารกระป๋อง — ไอเทมที่กินแล้วตัวโต
 *
 * ── ทำไมเป็นทรงกระบอก ไม่ใช่วงกลมเหมือนไอเทมอื่น ──
 * ของลอยในด่านตอนนี้กลมหมดทุกชิ้น (แม่เหล็ก โล่ ขวดยา) ต่างกันแค่สี
 * ซึ่งพอวิ่งเร็ว ๆ สีอย่างเดียวแยกไม่ทัน ทรงที่ต่างไปเลยอ่านออกได้ในพริบตาเดียว
 * และสีส้มยังเป็นสีที่เหลืออยู่สีเดียวที่ไม่ชนกับไอเทมอื่นในเกม
 */
export function drawCan(ctx, x, y, r, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.05) * 0.08);

  const w = r * 1.5;
  const h = r * 1.7;
  const lid = r * 0.32;

  ctx.save();
  ctx.shadowColor = 'rgba(255,170,64,.95)';
  ctx.shadowBlur = 16;

  // ตัวกระป๋อง ไล่สีซ้าย-ขวาให้อ่านเป็นทรงกระบอก ไม่ใช่สี่เหลี่ยมแบน
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, '#B85F1E');
  g.addColorStop(0.38, '#FFB44E');
  g.addColorStop(1, '#A8531A');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, r * 0.2);
  ctx.fill();
  ctx.restore();

  // ฝาบนพร้อมห่วงดึง
  ctx.fillStyle = '#F0E2CB';
  ctx.beginPath(); ctx.ellipse(0, -h / 2, w / 2, lid, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7A4A18';
  ctx.lineWidth = r * 0.08;
  ctx.beginPath(); ctx.ellipse(0, -h / 2, w / 2, lid, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -h / 2, w * 0.2, lid * 0.45, 0, 0, Math.PI * 2); ctx.stroke();

  // แถบฉลากสีครีม ตัดกับตัวกระป๋องส้มให้เห็นหน้าแมวชัด
  ctx.fillStyle = '#FFF3E2';
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h * 0.06, w, h * 0.44, r * 0.08);
  ctx.fill();

  // หน้าแมวจิ๋วบนฉลาก — บอกว่าเป็นอาหารแมวโดยไม่ต้องมีตัวหนังสือ
  // (ตัวหนังสือขนาดนี้อ่านไม่ออกอยู่แล้วตอนวิ่ง และต้องแปลตามภาษาอีก)
  ctx.fillStyle = '#43291A';
  ctx.beginPath(); ctx.arc(-r * 0.26, h * 0.09, r * 0.085, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.26, h * 0.09, r * 0.085, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#43291A';
  ctx.lineWidth = r * 0.06;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-r * 0.1, h * 0.19, r * 0.1, 0, Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.arc(r * 0.1, h * 0.19, r * 0.1, 0, Math.PI); ctx.stroke();

  ctx.restore();
}

export function drawCans(ctx, cans, camera, tick) {
  for (const c of cans) {
    if (c.got) continue;
    const x = c.x - camera;
    if (x > W + 50 || x < -50) continue;
    // ลอยเฟสเดียวกับไอเทมอื่น อ่านออกว่าเป็นของชุดเดียวกันที่เก็บได้
    drawCan(ctx, x, floatY(c, tick), c.r, tick);
  }
}

export function drawNips(ctx, nips, camera, tick) {
  for (const n of nips) {
    if (n.got) continue;
    const x = n.x - camera;
    if (x > W + 50 || x < -50) continue;
    // ลอยขึ้นลงเฟสเดียวกับแม่เหล็กและตัวอักษร ให้อ่านออกว่าเป็นไอเทมชุดเดียวกัน
    drawNip(ctx, x, floatY(n, tick), n.r, tick);
  }
}

// ── ตัวอักษร SPEEDCAT ────────────────────────────────────────

/** เหรียญตัวอักษรหนึ่งตัว — วงกลมม่วงมีอักษรตรงกลาง */
/**
 * ตัวอักษรโบนัสหนึ่งตัว — ลูกอมเคลือบเงา สีประจำตัวของมันเอง
 *
 * ── ทำไมเป็นสี่เหลี่ยมมนไม่ใช่วงกลม ──
 * ในจอมีของกลม ๆ เยอะแล้ว (ปลา ขนม ลูกบอล) ตัวอักษรต้องแยกออกจากพวกนั้นทันที
 * สี่เหลี่ยมมนยังตรงกับช่องสะสมบน HUD ด้วย ผู้เล่นจึงโยงได้เองว่าเก็บแล้วไปโผล่ตรงไหน
 *
 * ── ทำไมต้องมีขอบขาว ──
 * ฉากมี 6 แบบ สีพื้นหลังต่างกันมาก ถ้าใช้แค่สีลูกอมล้วน ตัวเหลืองจะจมหายไปกับ
 * ฟ้าสว่างของสวน และตัวม่วงจะจมไปกับถ้ำ ขอบขาวทำให้ทุกสีลอยออกมาเท่ากันทุกฉาก
 *
 * idx = ลำดับตัวอักษรใน WORD ใช้เลือกสี ถ้าไม่ส่งมาจะหาเอาจากตัวอักษร
 */
export function drawLetterCoin(ctx, x, y, r, ch, t = 0, idx = -1) {
  const i = idx >= 0 ? idx : Math.max(0, WORD.indexOf(ch));
  const col = LETTER_COLORS[i % LETTER_COLORS.length];
  const d = r * 2;
  const rad = r * 0.52;                       // มุมมนเยอะ ๆ ให้ดูเป็นลูกอมไม่ใช่ป้าย

  ctx.save();
  ctx.translate(x, y);
  // แกว่งเบา ๆ เหมือนห้อยอยู่ ไม่ใช่ป้ายติดตายกลางอากาศ
  ctx.rotate(Math.sin(t * 0.045 + x * 0.01) * 0.14);
  // เต้นตุ้บ ๆ เบามาก พอให้รู้สึกว่ามีชีวิต แต่ไม่รบกวนการกะระยะกระโดด
  const pop = 1 + Math.sin(t * 0.09 + i) * 0.035;
  ctx.scale(pop, pop);

  // ── เรืองแสงสีตัวเอง ──
  ctx.save();
  ctx.shadowColor = col.main;
  ctx.shadowBlur = 15;
  ctx.fillStyle = col.main;
  ctx.beginPath();
  ctx.roundRect(-r, -r, d, d, rad);
  ctx.fill();
  ctx.restore();

  // ── ขอบขาว ──
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = r * 0.17;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.roundRect(-r, -r, d, d, rad);
  ctx.stroke();

  // ── ตัวลูกอม ไล่สีจากอ่อนด้านบนไปเข้มด้านล่าง ให้ดูนูน ──
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, col.lite);
  g.addColorStop(0.45, col.main);
  g.addColorStop(1, col.main);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-r * 0.87, -r * 0.87, r * 1.74, r * 1.74, rad * 0.85);
  ctx.fill();

  // ── แสงสะท้อนมุมบนซ้าย ทำให้ผิวดูเคลือบเงา ──
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.46, r * 0.34, r * 0.2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // ── ตัวอักษร ──
  ctx.fillStyle = col.ink;
  ctx.font = `700 ${Math.round(r * 1.08)}px Mitr, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, 0, r * 0.08);

  // ── ประกายวิบ ๆ มุมบนขวา วนคนละจังหวะกันแต่ละตัว ──
  const tw = Math.sin(t * 0.12 + i * 1.7);
  if (tw > 0) {
    const k = tw * r * 0.3;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(r * 0.62, -r * 0.62 - k);
    ctx.quadraticCurveTo(r * 0.62, -r * 0.62, r * 0.62 + k, -r * 0.62);
    ctx.quadraticCurveTo(r * 0.62, -r * 0.62, r * 0.62, -r * 0.62 + k);
    ctx.quadraticCurveTo(r * 0.62, -r * 0.62, r * 0.62 - k, -r * 0.62);
    ctx.fill();
  }

  ctx.restore();
}

export function drawLetters(ctx, letters, camera, tick) {
  for (const l of letters) {
    if (l.got) continue;
    const x = l.x - camera;
    if (x > W + 50 || x < -50) continue;
    drawLetterCoin(ctx, x, floatY(l, tick), l.r, WORD[l.idx], tick, l.idx);
  }
}

// ── ปลาน้อยแฟนตาซีที่พาไปโบนัส ───────────────────────────────
//
// ตัวนี้เป็นตัวละครตัวเดียวในเกมที่ผู้เล่นได้ "หยุดมอง" จริง ๆ เพราะตอนขี่ปลา
// ไม่มีอะไรให้หลบ กล้องนิ่ง และปลาอยู่กลางจอนานหลายวินาที
// คุณภาพของการเคลื่อนไหวจึงสำคัญกว่าความประหยัดในการวาด ซึ่งต่างจากทุกตัวในเกม
//
// หลักการเดียวที่ทำให้มันอ่านเป็น "สัตว์ที่กำลังว่ายน้ำ" ไม่ใช่ "ภาพที่ถูกโยกไปมา"
// คือ คลื่นลูกเดียววิ่งจากหัวไปหาง — ทุกส่วนใช้ความถี่เดียวกันหมด แต่รับคลื่น
// ช้ากว่ากันเป็นทอด ๆ (phase) และแรงขึ้นเรื่อย ๆ ไปทางท้าย (amplitude)
// ถ้าใช้คนละความถี่ มันจะหลุดจังหวะกันจนดูมั่ว ถ้าใช้ phase เท่ากันจะเป็นหุ่นยนต์
// ส่วนครีบต่างหากที่ใช้คนละความถี่ได้ เพราะครีบไม่ได้อยู่บนเส้นคลื่นเดียวกับลำตัว

const FISH_BODY = '#FF9A3C';
const FISH_LITE = '#FFC983';
const FISH_BELLY = '#FFE3B8';
const FISH_FIN = 'rgba(255,190,110,.94)';        // ครีบทึบ (หลัง ก้น ท้อง)
const FISH_FIN_EDGE = 'rgba(255,247,224,.5)';    // ขอบรับแสง ใช้ทั้งขอบหางและสันหลัง
const FISH_INK = '#7A3410';
// สันหลังที่โดนแสงกับใต้ท้องที่แสงไม่ถึง — สองค่านี้ทำให้ตัวปลาเป็นทองแท่ง
// ไม่ใช่วงรีสีส้มแบน ๆ ต่างกันพอสมควรได้ เพราะผิวปลาทองสะท้อนแสงแรงจริง ๆ
const FISH_TOP = '#FFC96F';
const FISH_DEEP = '#DE681B';
const FISH_RAY = 'rgba(255,241,214,.42)';        // ก้านครีบ

// หางสี่ผืน วาดจากผืนหลังสุดมาผืนหน้าสุด
//   len/spr  ขนาดเทียบกับครึ่งลำตัว
//   tilt     กางออกจากแกนกลางกี่เรเดียน — ค่านี้สำคัญที่สุดในตาราง
//   lag      รับคลื่นช้ากว่าโคนหางเท่าไหร่ ผืนนอกยิ่งช้า = คลื่นไหลออกไปทางปลาย
//   amp      สะบัดแรงแค่ไหน
//   alpha    ผืนหลังจางกว่า เพื่อให้อ่านเป็นผ้าซ้อนกันหลายผืน ไม่ใช่แผ่นเดียวหนา ๆ
//
// ── ทำไมต้องมี tilt ──
// เวอร์ชันก่อนทุกผืนอยู่บนแกนเดียวกันแล้วย่อขนาดลงเรื่อย ๆ ผลคือมันซ้อนกัน
// เป็นวงในวงเหมือนเปลือกหอย ไม่ใช่ผ้าหลายผืน พอกางออกคนละมุมถึงจะแยกออกจากกัน
// แล้วอ่านเป็นหางพวงที่แต่ละผืนพลิ้วของมันเอง
const FISH_TAIL = [
  { len: 1.86, spr: 0.46, tilt: -0.42, lag: 2.35, amp: 0.26, alpha: 0.82, rays: false },
  { len: 1.96, spr: 0.44, tilt: 0.35, lag: 2.1, amp: 0.29, alpha: 0.86, rays: false },
  { len: 1.58, spr: 0.42, tilt: -0.14, lag: 1.75, amp: 0.21, alpha: 0.93, rays: true },
  { len: 1.3, spr: 0.4, tilt: 0.17, lag: 1.4, amp: 0.17, alpha: 1, rays: true },
];

const BUBBLES = 7;

/**
 * ค่าการเคลื่อนไหวทั้งหมดของปลา ณ เฟรมนั้น
 *
 * แยกออกมาจากการวาดโดยตั้งใจ: ตรงนี้ตอบว่า "ตอนนี้ปลาอยู่ในท่าไหน"
 * ส่วนโค้ดวาดข้างล่างแค่รับท่านั้นไปขึ้นรูป ไม่ต้องรู้เรื่องคลื่นเลยสักบรรทัด
 * เวลาจะจูนความรู้สึกของการว่าย จะได้แก้ที่เดียวจบ ไม่ต้องไล่แก้ทุกจุดที่วาด
 */
function fishPose(t) {
  const w = t * 0.115;                            // จังหวะว่ายหลัก
  const wave = (lag, amp) => Math.sin(w - lag) * amp;
  return {
    // ลำตัว: หัวแทบไม่ขยับ กลางตัวขยับปานกลาง โคนหางขยับมากสุด
    head: wave(0, 0.022),
    mid: wave(0.6, 0.07),
    root: wave(1.05, 0.15),
    // หางแต่ละชั้น ใช้ความถี่เดียวกับลำตัวแต่ตามหลังไปเรื่อย ๆ
    tail: FISH_TAIL.map((L) => wave(L.lag, L.amp)),
    // ครีบมีจังหวะของตัวเอง จงใจให้หารกันไม่ลงตัวกับจังหวะลำตัว
    // จะได้ไม่มีเฟรมไหนที่ทุกส่วนกลับมาขยับพร้อมกันเป๊ะ ๆ ซึ่งตาจับได้ทันทีว่าเป็นลูป
    dorsal: Math.sin(w * 0.61 - 0.4) * 0.085,
    anal: Math.sin(w * 0.73 - 0.9) * 0.13,
    pelvic: Math.sin(w * 0.87 - 1.3) * 0.16,
    pector: Math.sin(w * 1.31) * 0.4,             // ครีบข้างพัดถี่สุด เหมือนพยุงตัวอยู่
    // ลอยขึ้นลงกับเอียงตัว — ทั้งคู่ต้องเบามาก เพราะแมวนั่งอยู่บนหลังแต่ไม่ได้ขยับตาม
    // (เกมวางแมวไว้ที่ fishY - BONUS.carryUp ตายตัว) แรงกว่านี้แมวจะลอยหลุดจากหลังปลา
    bob: Math.sin(t * 0.05) * 0.05,
    lean: Math.sin(w * 0.47) * 0.03,
  };
}

/**
 * หางหนึ่งชั้น: พัดปลายมนที่ขอบท้ายเว้าเข้าตรงกลาง
 * curl = ค่าคลื่นของชั้นนั้น ยิ่งมากปลายยิ่งถูกพัดไปข้างเดียวมากขึ้น
 *
 * ที่ปลายต้องมนเพราะเคยลองแบบปลายแหลม แล้วมันอ่านเป็นขนนกหรือฟาง ไม่ใช่ผ้า
 */
function tailLayer(ctx, L, S, curl) {
  const c = curl * L * 0.5;       // ปลายผืนถูกพัดไปเท่าไหร่ โคนแทบไม่ขยับตาม
  ctx.beginPath();
  ctx.moveTo(0, -S * 0.62);
  // ขอบบน ป่องออกกลางผืนแล้วเรียวเข้าหาปลาย
  ctx.bezierCurveTo(-L * 0.34, -S * 1.02 + c * 0.3, -L * 0.72, -S * 0.98 + c * 0.75, -L, -S * 0.4 + c);
  ctx.quadraticCurveTo(-L * 1.09, c * 1.06, -L * 0.93, S * 0.48 + c);   // ปลายมน
  ctx.bezierCurveTo(-L * 0.64, S * 0.92 + c * 0.75, -L * 0.28, S * 0.88 + c * 0.3, 0, S * 0.62);
  ctx.closePath();
}

/**
 * หัวใจหนึ่งดวงพร้อมเส้นขอบ ใช้กับปุ่มหัวใจในล็อบบี้ (ดู src/pet.js)
 *
 * แยกจาก heartShape() เพราะตัวนั้นเป็นประกายจิ๋วขนาดไม่กี่พิกเซล ไม่ต้องมีขอบ
 * ส่วนตัวนี้ใหญ่พอที่จะเห็นว่าไม่มีขอบแล้วดูแบนกว่าของอื่นทุกชิ้นในฉาก
 */
export function drawHeart(ctx, x, y, r, fill = '#FF6E9C', line = '#8E2B57') {
  ctx.fillStyle = fill;
  heartShape(ctx, x, y, r);
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(1, r * 0.2);
  ctx.lineJoin = 'round';
  ctx.stroke();

  // ไฮไลต์เม็ดเดียวที่พูซ้าย บอกว่าผิวมัน ไม่ใช่กระดาษตัด
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.42, y - r * 0.42, r * 0.24, r * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

/** หัวใจหนึ่งดวง ใช้เป็นประกายเล็ก ๆ รอบตัวปลา */
function heartShape(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.5, y - s * 0.35, x - s * 0.55, y - s * 1.15, x, y - s * 0.32);
  ctx.bezierCurveTo(x + s * 0.55, y - s * 1.15, x + s * 1.5, y - s * 0.35, x, y + s * 0.9);
  ctx.fill();
}

/**
 * ปลาน้อยแฟนตาซี วาดรอบจุด (x,y) = กลางลำตัว
 * r = ครึ่งความยาวลำตัว
 * dir = ทิศที่หันหน้า 1 คือขวา -1 คือซ้าย ส่งค่าทศนิยมได้ด้วย
 *       ค่าระหว่าง -1 ถึง 1 จะเห็นเป็นปลากำลังหมุนตัวกลับ
 */
export function drawBigFish(ctx, x, y, r, dir, t) {
  const a = fishPose(t);
  // กันไม่ให้ scale เป็น 0 พอดี ซึ่งจะทำให้ path ทั้งก้อนยุบหายไปเฉย ๆ
  const face = Math.abs(dir) < 0.08 ? 0.08 * (dir < 0 ? -1 : 1) : dir;
  const cy = y + a.bob * r;

  // ── แสงนวลรอบตัว ──
  // วาดนอกกรอบที่พลิกซ้ายขวา เพราะมันสมมาตรอยู่แล้วและไม่ควรถูกบีบตอนปลาหมุนตัว
  const glow = ctx.createRadialGradient(x, cy, r * 0.25, x, cy, r * 2.1);
  glow.addColorStop(0, 'rgba(255,197,116,.2)');
  glow.addColorStop(0.55, 'rgba(255,170,96,.08)');
  glow.addColorStop(1, 'rgba(255,170,96,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, cy, r * 2.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, cy);
  ctx.scale(face, 1);
  ctx.rotate(a.lean);
  ctx.lineJoin = 'round';

  // ═══ หาง ═══════════════════════════════════════════════════
  // วางที่โคนหางซึ่งขยับตามคลื่นลำตัว หางจึงไม่ได้ "ติดอยู่กับที่แล้วหมุนเอง"
  // แต่ถูกลำตัวเหวี่ยงไปด้วย ซึ่งคือความต่างระหว่างหางที่มีชีวิตกับพัดที่ถูกโยก
  ctx.save();
  ctx.translate(-r * 0.82, a.root * r);
  ctx.rotate(a.root * 0.55);

  // ไล่จางไปทางปลาย = ผ้าบางที่แสงลอดผ่าน
  // แต่จางได้ถึงแค่ราว .6 เท่านั้น เพราะฉากหลังของเกมเป็นม่วงเข้ม
  // สีอุ่นบาง ๆ ทับม่วงเข้มไม่ได้ "โปร่งแสง" แต่ได้สีน้ำตาลหม่น เคยจางถึง .13 แล้วหางออกมาเป็นสีฟาง
  const veil = ctx.createLinearGradient(0, 0, -r * 1.7, 0);
  veil.addColorStop(0, 'rgba(255,146,44,1)');
  veil.addColorStop(0.55, 'rgba(255,170,80,1)');
  veil.addColorStop(1, 'rgba(255,193,118,.93)');

  // หลังไปหน้า ชั้นหน้าสุดจึงทับชั้นหลังได้ = อ่านเป็นความหนาของผ้าหลายผืน
  for (let i = 0; i < FISH_TAIL.length; i++) {
    const L = FISH_TAIL[i];
    ctx.save();
    ctx.rotate(L.tilt + a.tail[i] * 0.55);
    ctx.globalAlpha = L.alpha;
    tailLayer(ctx, r * L.len, r * L.spr, a.tail[i]);
    ctx.fillStyle = veil;
    ctx.fill();
    // ขอบต้องจาง ๆ พอให้แยกชั้นออกจากกันเท่านั้น เข้มกว่านี้ทุกชั้นจะเห็นเป็นหยัก
    // แล้วหางทั้งก้อนอ่านเป็นเปลือกหอย ไม่ใช่ผ้าซ้อนกัน
    ctx.strokeStyle = 'rgba(255,240,212,.34)';
    ctx.lineWidth = r * 0.024;
    ctx.stroke();

    // ก้านครีบ แผ่จากโคนเดียวกัน ทำให้แผ่นสีอ่านเป็นครีบจริงไม่ใช่คราบสี
    // โค้งตามคลื่นของชั้นตัวเองด้วย ไม่งั้นก้านจะแข็งค้างอยู่ขณะที่ผ้ารอบ ๆ พลิ้ว
    // ขีดแค่สองชั้นหน้า ชั้นหลังถูกบังเกือบหมดอยู่แล้ว ขีดครบสี่ชั้นมีแต่จะรก
    ctx.strokeStyle = FISH_RAY;
    ctx.lineWidth = r * 0.024;
    for (const f of L.rays ? [-0.5, 0, 0.5] : []) {
      const c = a.tail[i] * L.len * r * 0.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.04, r * L.spr * f * 0.6);
      ctx.quadraticCurveTo(-r * L.len * 0.5, r * L.spr * f * 1.05 + c * 0.45,
                           -r * L.len * 0.9, r * L.spr * f * 0.55 + c * 0.95);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();

  // ═══ ครีบที่อยู่หลังลำตัว ═══════════════════════════════════
  // ── ครีบหลัง กระพือช้าที่สุดในบรรดาครีบทั้งหมด ──
  // ยอดอยู่ที่ราว -r เท่านั้น สูงกว่านี้จะไปโผล่ทะลุตัวแมวที่นั่งอยู่บนหลัง
  ctx.save();
  ctx.rotate(a.dorsal);
  const dorsalPath = () => {
    ctx.beginPath();
    ctx.moveTo(r * 0.44, -r * 0.32);
    ctx.bezierCurveTo(r * 0.18, -r * 0.94, -r * 0.16, -r * 1.02, -r * 0.54, -r * 0.66);
    ctx.bezierCurveTo(-r * 0.36, -r * 0.5, -r * 0.02, -r * 0.4, r * 0.44, -r * 0.32);
  };
  dorsalPath();
  ctx.fillStyle = FISH_FIN;
  ctx.fill();
  // ตัดด้วยรูปครีบก่อนขีดก้าน ไม่งั้นก้านจะทะลุออกไปเป็นเส้นลอยเหนือหัว
  ctx.clip();
  ctx.strokeStyle = FISH_RAY;
  ctx.lineWidth = r * 0.026;
  for (const f of [0.25, 0.5, 0.75]) {
    ctx.beginPath();
    ctx.moveTo(r * (0.4 - f * 0.8), -r * 0.36);
    ctx.quadraticCurveTo(r * (0.28 - f * 0.7), -r * 0.72, r * (0.16 - f * 0.6), -r * 1.0);
    ctx.stroke();
  }
  ctx.restore();

  // ── ครีบก้น พริ้วเบา ๆ ตามหลังหาง กันไม่ให้ท้ายลำตัวตัดจบห้วน ๆ ──
  ctx.save();
  ctx.rotate(a.anal);
  ctx.fillStyle = FISH_FIN;
  ctx.beginPath();
  ctx.moveTo(-r * 0.08, r * 0.44);
  ctx.bezierCurveTo(-r * 0.32, r * 0.94, -r * 0.72, r * 1.02, -r * 0.92, r * 0.68);
  ctx.bezierCurveTo(-r * 0.6, r * 0.68, -r * 0.3, r * 0.56, -r * 0.08, r * 0.44);
  ctx.fill();
  ctx.restore();

  // ── ครีบท้อง ──
  ctx.save();
  ctx.rotate(a.pelvic);
  ctx.fillStyle = FISH_FIN;
  ctx.beginPath();
  ctx.moveTo(r * 0.24, r * 0.44);
  ctx.quadraticCurveTo(r * 0.12, r * 0.86, -r * 0.16, r * 0.78);
  ctx.quadraticCurveTo(-r * 0.02, r * 0.6, r * 0.24, r * 0.44);
  ctx.fill();
  ctx.restore();

  // ═══ ลำตัว ═════════════════════════════════════════════════
  // ไม่ใช่วงรีแล้ว แต่เป็นเส้นโค้งปิดที่จุดควบคุมขยับตามคลื่น
  // ตัวปลาจึงบิดตัวจริง ๆ ไม่ใช่รูปทรงตายตัวที่ถูกหมุนไปมาทั้งก้อน
  // หัวแทบนิ่ง (a.head) กลางตัวขยับบ้าง (a.mid) โคนหางขยับมากสุด (a.root)
  const hy = a.head * r, my = a.mid * r, ry = a.root * r;
  const gold = ctx.createLinearGradient(0, -r * 0.7, 0, r * 0.7);
  gold.addColorStop(0, FISH_TOP);
  gold.addColorStop(0.45, FISH_BODY);
  gold.addColorStop(1, FISH_DEEP);

  const bodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(r * 0.98, hy);
    ctx.bezierCurveTo(r * 0.72, -r * 0.44, r * 0.3, -r * 0.7, -r * 0.16, -r * 0.62 + my);
    ctx.bezierCurveTo(-r * 0.52, -r * 0.56 + my, -r * 0.78, -r * 0.34 + ry, -r * 0.86, ry);
    ctx.bezierCurveTo(-r * 0.78, r * 0.34 + ry, -r * 0.52, r * 0.58 + my, -r * 0.16, r * 0.64 + my);
    ctx.bezierCurveTo(r * 0.3, r * 0.72, r * 0.72, r * 0.46, r * 0.98, hy);
    ctx.closePath();
  };
  bodyPath();
  ctx.fillStyle = gold;
  ctx.fill();

  // ทุกอย่างที่วาดบนตัวต้องอยู่ในขอบตัว ไม่งั้นเวลาลำตัวบิด เกล็ดกับท้องจะโผล่พ้นขอบ
  ctx.save();
  ctx.clip();

  // ท้องสว่าง ไล่จางขึ้นมาจากใต้ท้อง ไม่ใช่วงรีทึบที่มีขอบคมพาดกลางตัว
  // (เคยเป็นวงรี แล้วเส้นขอบของมันตัดลำตัวเป็นสองท่อนจนดูแข็ง ไม่ใช่ตัวนุ่ม ๆ)
  // เติมเป็นสี่เหลี่ยมได้เลยเพราะตอนนี้ถูก clip ด้วยรูปลำตัวอยู่แล้ว
  const bel = ctx.createLinearGradient(0, r * 0.08 + my * 0.5, 0, r * 0.8 + my * 0.5);
  bel.addColorStop(0, 'rgba(255,227,184,0)');
  bel.addColorStop(0.55, 'rgba(255,229,190,.58)');
  bel.addColorStop(1, 'rgba(255,238,208,.94)');
  ctx.fillStyle = bel;
  ctx.fillRect(-r * 1.1, -r * 1.1, r * 2.2, r * 2.2);

  // เกล็ดเป็นส่วนโค้งซ้อนกัน ไม่ใช่จุดกลม จะได้อ่านเป็นเกล็ดจริง
  ctx.strokeStyle = 'rgba(198,92,22,.3)';
  ctx.lineWidth = r * 0.035;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-r * (0.1 + i * 0.26), (my + ry) * 0.35, r * 0.34, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
  }

  // แผ่นปิดเหงือก ส่วนโค้งชุดเดียวกับเกล็ดแต่วางหน้ากว่าและเข้มกว่า
  ctx.strokeStyle = 'rgba(198,92,22,.34)';
  ctx.lineWidth = r * 0.045;
  ctx.beginPath();
  ctx.arc(r * 0.3, hy, r * 0.4, -Math.PI * 0.44, Math.PI * 0.44);
  ctx.stroke();

  // แถบสะท้อนบนสันหลัง เลื่อนตามคลื่นด้วย แสงจึงวิ่งไปตามตัวตอนปลาบิด
  ctx.fillStyle = 'rgba(255,255,255,.32)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.06, -r * 0.4 + my * 0.7, r * 0.36, r * 0.09, -0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ขอบรับแสง เอาเฉพาะ "สันหลัง" ไม่ใช่รอบตัว
  // เคยตีรอบตัวแล้วมันกลายเป็นเส้นขอบขาวรอบสติกเกอร์ ไม่ใช่แสงตกกระทบจากด้านบน
  ctx.save();
  bodyPath();
  ctx.clip();
  ctx.strokeStyle = FISH_FIN_EDGE;
  ctx.lineWidth = r * 0.13;
  ctx.beginPath();
  ctx.moveTo(r * 0.98, hy);
  ctx.bezierCurveTo(r * 0.72, -r * 0.44, r * 0.3, -r * 0.7, -r * 0.16, -r * 0.62 + my);
  ctx.stroke();
  ctx.restore();

  // ── ครีบข้าง พัดถี่ที่สุด เหมือนกำลังพยุงตัวเองให้ลอยนิ่ง ──
  // วาดทับลำตัวเพราะอยู่ด้านหน้า
  ctx.save();
  ctx.translate(r * 0.28, r * 0.08);
  ctx.rotate(a.pector * 0.45);
  ctx.fillStyle = 'rgba(255,214,158,.95)';
  ctx.beginPath();
  ctx.moveTo(r * 0.1, -r * 0.03);
  ctx.bezierCurveTo(-r * 0.08, r * 0.22, -r * 0.3, r * 0.28, -r * 0.38, r * 0.11);
  ctx.bezierCurveTo(-r * 0.22, r * 0.06, -r * 0.04, -r * 0.02, r * 0.1, -r * 0.03);
  ctx.fill();
  ctx.strokeStyle = 'rgba(222,104,27,.3)';
  ctx.lineWidth = r * 0.022;
  for (const f of [0.35, 0.7]) {
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.02);
    ctx.quadraticCurveTo(-r * 0.18, r * (0.1 + f * 0.1), -r * (0.2 + f * 0.14), r * (0.12 + f * 0.12));
    ctx.stroke();
  }
  ctx.restore();

  // ═══ หน้า ══════════════════════════════════════════════════
  // ทั้งหน้าขยับตามคลื่นหัว ไม่งั้นตากับปากจะค้างอยู่กับที่ขณะที่หัวส่ายเบา ๆ
  ctx.save();
  ctx.translate(0, hy);

  // แก้มชมพู วาดก่อนตาให้อยู่ชั้นล่างสุด
  ctx.fillStyle = 'rgba(255,120,150,.42)';
  ctx.beginPath();
  ctx.ellipse(r * 0.26, r * 0.22, r * 0.15, r * 0.085, 0, 0, Math.PI * 2);
  ctx.fill();

  // ตากลมโต: ขาวรอบนอก ดำตรงกลาง แล้วปิดด้วยประกายสองจุด
  // จุดใหญ่บนซ้ายคือแสงหลัก จุดเล็กล่างขวาคือแสงสะท้อนกลับจากพื้นน้ำ
  // สองจุดนี้แหละที่ทำให้ตาดู "ใส" แทนที่จะเป็นวงกลมดำเฉย ๆ
  ctx.fillStyle = '#FFFDF6';
  ctx.beginPath();
  ctx.arc(r * 0.46, -r * 0.14, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4B2A16';
  ctx.beginPath();
  ctx.arc(r * 0.48, -r * 0.13, r * 0.135, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath();
  ctx.arc(r * 0.42, -r * 0.2, r * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath();
  ctx.arc(r * 0.54, -r * 0.06, r * 0.028, 0, Math.PI * 2);
  ctx.fill();

  // ปากยิ้ม โค้งหงายขึ้น ปลายสองข้างงอนขึ้นกว่ากลางปากนิดหน่อย
  //
  // ── ระวังทิศของส่วนโค้ง ──
  // บนผืนผ้าใบแกน y ชี้ลง มุมช่วง π ถึง 2π จึงเป็นครึ่ง "บน" ของวงกลม
  // ซึ่งวาดออกมาได้ปากคว่ำ ไม่ใช่ปากยิ้ม (เคยพลาดตรงนี้มาแล้ว)
  // เขียนเป็นเส้นโค้งสองจุดแทน arc ไปเลย จะได้เห็นจากพิกัดตรง ๆ ว่าปากโค้งทางไหน
  // และคุมให้ปลายปากงอนขึ้นได้ ซึ่ง arc ทำไม่ได้เพราะปลายมันอยู่ระดับเดียวกันเสมอ
  ctx.strokeStyle = FISH_INK;
  ctx.lineWidth = r * 0.045;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * 0.66, r * 0.03);
  ctx.quadraticCurveTo(r * 0.79, r * 0.23, r * 0.91, r * 0.01);
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // ═══ ฟองอากาศกับประกาย ═════════════════════════════════════
  // ทั้งสองอย่างคำนวณจาก t ล้วน ๆ ไม่มีการเก็บสถานะข้ามเฟรม
  // จำเป็นตรงนี้ เพราะ drawBigFish ถูกเรียกเฉพาะตอนอยู่ในโบนัส แล้วหยุดไปเป็นนาที
  // ถ้าเก็บสถานะไว้ พอกลับเข้าโบนัสรอบหน้าฟองจะค้างอยู่ที่เดิมของเมื่อกี้
  const side = dir < 0 ? 1 : -1;   // ฟองออกทางท้ายเสมอ ไม่ว่าปลาหันทางไหน
  for (let i = 0; i < BUBBLES; i++) {
    const ph = ((t * 0.011 + i / BUBBLES) % 1 + 1) % 1;   // 0 = เพิ่งเกิด, 1 = จางหมด
    const spread = ((i * 37) % 11) / 11;
    const bx = x + side * r * (0.95 + spread * 0.85);
    const by = cy + r * 0.45 - ph * r * 2.3;
    const rad = r * (0.03 + ((i * 53) % 7) / 7 * 0.045);
    ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.45;
    ctx.strokeStyle = '#FFF3DC';
    ctx.lineWidth = r * 0.016;
    ctx.beginPath();
    ctx.arc(bx + Math.sin(t * 0.06 + i) * r * 0.05, by, rad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.arc(bx - rad * 0.3, by - rad * 0.32, rad * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ประกาย: ไม่ได้ติดค้างตลอด แต่โผล่มาแล้วหายไปเป็นจังหวะ
  // ใช้ครึ่งบนของ sine เป็นตัวคุมทั้งขนาดและความทึบ จึงได้ 0 → 1 → 0 แล้วเว้นช่วง
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const k = Math.sin(t * 0.045 + i * 1.9);
    if (k <= 0) continue;                     // ครึ่งรอบที่เหลือคือช่วงที่ดวงนี้ยังไม่โผล่
    const ang = t * 0.02 + (i / 5) * Math.PI * 2;
    const rad = r * (1.2 + Math.sin(t * 0.05 + i) * 0.14);
    ctx.globalAlpha = k * 0.75;
    ctx.fillStyle = FISH_LITE;
    star4(ctx, x + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.6, r * (0.03 + k * 0.075));
  }
  // หัวใจดวงเล็กลอยขึ้นเหนือหัวเป็นระยะ — ที่เหลือของตัวเป็นทองล้วน
  // จุดสีชมพูจุดเดียวตรงนี้เลยเป็นตัวบอกว่าน้องกำลังดีใจ โดยไม่ต้องแตะหน้าน้องเลย
  const hk = ((t * 0.008) % 1 + 1) % 1;
  ctx.globalAlpha = Math.sin(hk * Math.PI) * 0.55;
  ctx.fillStyle = '#FF7BA0';
  heartShape(ctx, x + r * 0.35 * -side, cy - r * 0.9 - hk * r * 0.8, r * 0.11);
  ctx.restore();
}


// ── ก้อนเมฆในโหมดโบนัส ───────────────────────────────────────
// สามชั้นเลื่อนคนละความเร็ว ให้รู้สึกว่าอยู่สูงจริง ไม่ใช่ฉากแบน
const CLOUD_LAYERS = [
  { speed: 0.10, y: 70, scale: 1.5, alpha: 0.34, gap: 520 },
  { speed: 0.24, y: 168, scale: 1.1, alpha: 0.6, gap: 430 },
  { speed: 0.46, y: 292, scale: 1.7, alpha: 0.9, gap: 610 },
];

function puff(ctx, x, y, s) {
  ctx.beginPath();
  ctx.ellipse(x, y, 46 * s, 24 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 34 * s, y + 6 * s, 28 * s, 17 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 32 * s, y + 7 * s, 32 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 6 * s, y - 14 * s, 26 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * ประกายวิ๊บวั๊บเต็มฟ้าในโหมดโบนัส เปิดใช้เฉพาะชุดระดับสูงที่กำหนดสีไว้
 * กระจายด้วย 137.5 องศา (มุมทองคำ) จุดจึงไม่เรียงเป็นลายให้เห็น
 */
export function drawBonusSparkle(ctx, t, color) {
  ctx.save();
  // บวกสีแทนทับสี ประกายที่ซ้อนกันจึงสว่างขึ้นเหมือนแสงจริง ไม่ใช่ทับกันทึบ
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = color;
  for (let i = 0; i < 26; i++) {
    const x = ((i * 137.5 + t * 0.6) % (W + 60)) - 30;
    const y = 26 + ((i * 91) % 262);
    const pulse = Math.abs(Math.sin(t * 0.06 + i * 1.3));
    const r = 1.4 + pulse * 2.1;
    // บวกสีแล้วยังโดนแสงฟุ้งซ้ำอีกชั้น ค่าเดิม 0.14+0.7 เลยสว่างจนฟ้าขาววอก
    ctx.globalAlpha = 0.07 + pulse * 0.3;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }
  ctx.restore();
}

export function drawClouds(ctx, camera, pal) {
  ctx.save();
  for (const L of CLOUD_LAYERS) {
    ctx.globalAlpha = L.alpha;
    // สีเมฆมาจากด่าน — เมฆขาวโปร่งบนฟ้ากลางคืนสีม่วงจะกลายเป็นเทาหม่น
    // ด่านกลางคืนจึงต้องใช้ขาวอมม่วงที่สว่างกว่า ไม่ใช่ขาวล้วนจาง ๆ
    ctx.fillStyle = L.alpha > 0.7 ? pal.cloud : pal.cloudSoft;
    const off = (camera * L.speed) % L.gap;
    for (let i = -1; i * L.gap - off < W + L.gap; i++) {
      const x = i * L.gap - off;
      // เลื่อน y ตามดัชนีนิดหน่อย ไม่ให้เมฆเรียงเป็นแถวตรงจนดูเป็นลาย
      puff(ctx, x, L.y + ((i * 37) % 26) - 13, L.scale);
    }
  }
  ctx.restore();
}

/** วาดของเก็บทั้งแนว ทุกชนิดอยู่ใน array เดียวกัน แยกด้วย kind */
/**
 * ความสูงที่ควรวาดของชิ้นหนึ่ง — ลอยขึ้นลงเบา ๆ ตอนอยู่เฉย ๆ
 * แต่หยุดลอยทันทีที่ถูกแรงดูดจับ
 *
 * ถ้าไม่หยุด การสั่น 4-5px จะไปบวกทับเส้นทางโค้งที่คำนวณมาอย่างดี
 * ผลคือของที่กำลังพุ่งเข้าหาตัวสั่นยิบ ๆ ตลอดทาง ซึ่งเป็นสาเหตุหลัก
 * ที่ทำให้การดูดดู "ไม่สมูท" ทั้งที่เส้นทางจริงเรียบอยู่แล้ว
 *
 * mvx มีค่าเมื่อไหร่ = ชิ้นนั้นเข้าสู่การถูกดูดแล้ว (ตั้งโดย seek ใน utils.js)
 */
function floatY(item, t, amp = 5, rate = 0.05) {
  return item.mvx === undefined
    ? item.y + Math.sin(t * rate + item.x * 0.01) * amp
    : item.y;
}

export function star4(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/**
 * ประกายวิบวับ ใช้กับเม็ดที่โปรยลงมาจากฟ้าตอนใช้ความสามารถเท่านั้น
 *
 * ตั้งใจไม่ใส่ให้ของกินในด่าน เพราะของในด่านมีเยอะและอยู่เต็มจอตลอดเวลา
 * ประกายทุกเม็ดจะกลายเป็นสัญญาณรบกวนแทนที่จะเป็นของพิเศษ
 * ส่วนเม็ดที่โปรยลงมามีเป็นช่วง ๆ ประกายจึงยังรู้สึกเป็นเหตุการณ์พิเศษอยู่
 *
 * เฟสคำนวณจากพิกัด x ของแต่ละเม็ด ไม่ใช่จากเวลาอย่างเดียว
 * ไม่งั้นของทั้งจอจะวิบพร้อมกันหมดจนดูเป็นไฟกะพริบ ไม่ใช่ประกาย
 */
function twinkle(ctx, x, y, r, t, color) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = color;
  for (let i = 0; i < 2; i++) {
    const p = (t * 0.028 + x * 0.021 + i * 0.5) % 1;
    const soft = Math.sin(p * Math.PI);
    if (soft <= 0.03) continue;
    const a = x * 0.7 + i * 2.6;
    const d = r * (1.15 + i * 0.55);
    ctx.globalAlpha = soft * 0.8;
    star4(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 0.9 + soft * 2.1);
  }
  ctx.restore();
}

export function drawTreats(ctx, treats, camera, tick = 0) {
  for (const t of treats) {
    if (t.got) continue;
    const x = t.x - camera;
    if (x > W + 50 || x < -50) continue;
    const y = floatY(t, camera, 3, 0.02);
    if (t.kind === 'shrimp') drawShrimp(ctx, x, y, t.r * SHRIMP.scale, tick);
    else if (t.kind === 'kibble') drawKibble(ctx, x, y, t.r);
    else drawFish(ctx, x, y, t.r);
  }
}

// ── ขวดพลังใหญ่ ──────────────────────────────────────────────

export function drawPotions(ctx, potions, camera, tick) {
  for (const p of potions) {
    if (p.got) continue;
    const x = p.x - camera;
    if (x > W + 60 || x < -60) continue;
    drawPotion(ctx, x, floatY(p, tick), tick);
  }
}

function drawPotion(ctx, x, y, tick) {
  ctx.save();
  ctx.translate(x, y);
  // ขยายทั้งชิ้นด้วยตัวคูณเดียว (ดู POTION.drawScale) แล้วค่อยคูณจังหวะเต้นทับ
  const pulse = 1 + Math.sin(tick * 0.09) * 0.06;
  ctx.scale(POTION.drawScale * pulse, POTION.drawScale * pulse);

  // แสงเรืองสีแดง มองเห็นได้แต่ไกลตั้งแต่ยังไม่เข้าจอเต็มตัว
  ctx.save();
  ctx.shadowColor = 'rgba(255,92,110,.95)';
  ctx.shadowBlur = 26;
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
    const y = floatY(s, camera, 4, 0.02);

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
export function drawShieldRing(ctx, player, tick, scale = 1) {
  // โตตามตัวทั้งวง ทั้งเส้น ทั้งจังหวะประ — สัดส่วนที่ตาเห็นจึงเท่าเดิมทุกขนาด
  // ถ้าคูณแค่รัศมี เส้นบาง ๆ รอบแมวตัวสูงเมตรนึงจะดูเป็นวงลวดแทนที่จะเป็นโล่
  const v = catView(player, scale);
  const pulse = (1 + Math.sin(tick * 0.12) * 0.06) * v.s;

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = C.cream;
  ctx.lineWidth = 2.5 * v.s;
  ctx.setLineDash([9 * v.s, 7 * v.s]);
  ctx.lineDashOffset = -tick * 0.9 * v.s;
  ctx.beginPath();
  ctx.ellipse(v.x, v.y, 32 * pulse, 34 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ── ตัวละคร: แมวน้อย ─────────────────────────────────────────
// จุด (0,0) ของทุกฟังก์ชันข้างล่างคือ "กลางกล่องชน"
// ท่ายืน: เท้าอยู่ y=+23 หัวสุด y=-23  |  ท่าหมอบ: พื้นอยู่ y=+13
// ตัวเลขพวกนี้มาจาก BODY ใน config.js ถ้าแก้ที่นั่นต้องมาขยับที่นี่ด้วย
//
// ทุกฟังก์ชันรับ `s` = ชุดสีจาก skins.js ไม่มีสีแมวฝังตายในโค้ดวาดเลย
// แมวทุกตัวจึงใช้โครงเดียวกัน เพิ่มตัวใหม่ = เพิ่มจานสี ไม่ต้องวาดใหม่

/**
 * @param scale ตัวคูณขนาดตัว (อาหารกระป๋องทำให้เป็น 1.75)
 * @param gait  ตัวคูณจังหวะขา — ต่ำกว่า 1 = ก้าวช้าลงโดยความเร็วในเกมไม่เปลี่ยน
 */
/**
 * fx = สภาพของตัวละครที่ "ไม่ใช่ท่าทาง" แต่มีผลกับหน้าตาและการเคลื่อนไหว
 *   tired  0..1  พลังใกล้หมด — หูลู่ หางตก ตาปรือ หายใจแรง
 *   hurt   0..1  เพิ่งโดนชน — สะดุ้ง ตัวสะบัด ตาเบิก (เกมส่ง hurtFlash มาตรง ๆ)
 * ส่งเป็นอ็อบเจกต์ไม่ใช่พารามิเตอร์เรียงต่อท้าย เพราะฟังก์ชันนี้มีพารามิเตอร์
 * เรียงกันเก้าตัวอยู่แล้ว เติมตัวที่สิบสิบเอ็ดเข้าไปจะไม่มีใครอ่านลำดับออกอีกเลย
 */
export function drawPlayer(ctx, player, isDead, s, mouthOpen = false, dance = 0, mood = '', scale = 1, gait = 1, fx = {}) {
  const tired = isDead ? 0 : Math.max(0, Math.min(1, fx.tired || 0));
  const hurt = isDead ? 0 : Math.max(0, Math.min(1, fx.hurt || 0));
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
    // เงาโตตามตัวด้วย ไม่งั้นแมวตัวใหญ่จะดูลอยอยู่เหนือเงาของแมวตัวเล็ก
    ctx.ellipse(cx, GROUND_Y + 4, (22 - air * 0.02) * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ท่าเต้นตอนใช้ความสามารถ: ส่ายตัวแรงขึ้นและเด้งขึ้นลง
  // ทับลงบนท่าวิ่งเดิม ไม่ได้เขียนท่าใหม่ทั้งชุด จังหวะขาจึงยังตรงกับความเร็ววิ่ง
  ctx.translate(cx, cy - (dance ? Math.abs(Math.sin(dance * 0.3)) * 7 : 0));

  // จังหวะขาแยกออกจาก runPhase จริง เพื่อให้ชะลอท่าเดินได้โดยไม่แตะความเร็วเกม
  const ph = player.runPhase * gait;

  if (isDead) {
    ctx.rotate(player.tilt);
  } else {
    const base = player.onGround
      ? Math.sin(ph * 2) * 0.04
      : Math.max(-0.3, Math.min(0.3, player.vy * 0.016));
    // สะบัดตัวตอนโดนชน — ความถี่สูงคูณกับแอมป์ที่ยุบลงเอง จึงสั่นถี่แล้วนิ่งเร็ว
    // ไม่ต้องมีตัวจับเวลาแยก เพราะ hurt ที่เกมส่งมาก็ไล่จาก 1 ลง 0 อยู่แล้ว
    const shake = hurt > 0 ? Math.sin(hurt * 34) * hurt * 0.26 : 0;
    ctx.rotate(base + shake + (dance ? Math.sin(dance * 0.24) * 0.28 : 0));
  }
  if (hurt > 0) ctx.translate(-hurt * 5, 0);   // ถูกผลักถอยหลังนิดหน่อย

  // ── ขยายรอบ "เท้า" ไม่ใช่รอบกลางตัว ──
  // ถ้าขยายรอบจุดกึ่งกลาง ครึ่งล่างจะจมลงไปใต้พื้นเท่ากับที่ครึ่งบนโผล่ขึ้น
  // เห็นเป็นแมวยืนจมดิน ต้องตรึงเท้าไว้แล้วให้ตัวโตขึ้นไปทางหัวอย่างเดียว
  //
  // ยืด/แบน (squash & stretch) ใช้แกนเดียวกันด้วยเหตุผลเดียวกันเป๊ะ
  // แบนแล้วต้องกว้างขึ้นพร้อมกัน ไม่งั้นอ่านเป็น "ตัวหดเล็กลง" ไม่ใช่ "ถูกอัด"
  // และตอนเหนื่อยให้บวกจังหวะหายใจแรง ๆ ทับลงไปบนค่าเดียวกันนี้เลย
  const puff = tired > 0 ? Math.sin(player.runPhase * 1.7) * tired * 0.05 : 0;
  const sq = isDead ? 0 : player.squash || 0;
  if (scale !== 1 || sq !== 0 || puff !== 0) {
    const feet = b.h / 2;
    ctx.translate(0, feet);
    ctx.scale(scale * (1 + sq * 0.26 + puff), scale * (1 - sq * 0.3 + puff));
    ctx.translate(0, -feet);
  }

  const swing = Math.sin(ph * 2) * (player.onGround ? 1 : 0.25);
  ctx.lineCap = 'round';

  // อารมณ์ที่เกมสั่งมาโดยตรงต้องชนะเสมอ (เช่นสะใจตอนร่างยักษ์)
  // เจ็บชนะเหนื่อย เพราะเจ็บเป็นเหตุการณ์ชั่วขณะ ส่วนเหนื่อยเป็นสภาพที่ค้างอยู่นาน
  const look = mood || (hurt > 0.2 ? 'hurt' : tired > 0.5 ? 'tired' : '');
  // หูลู่ตอนเหนื่อย — ตอนวิ่งปกติหูตั้งไว้ เพราะหูลู่ตลอดเวลาจะกลายเป็นบุคลิกถาวร
  // แทนที่จะเป็นสัญญาณว่ากำลังแย่ ซึ่งเป็นหน้าที่เดียวที่เราต้องการจากมัน
  const earLay = tired;
  // หางตกลงและแกว่งน้อยลงตอนเหนื่อย — ค่าบวกคือปลายหางต่ำ (ดู drawTail)
  const wag = player.tailLag * (1 - tired * 0.55) + tired * 0.85;

  if (player.sliding) drawCatSlide(ctx, s, { isDead, mood: look });
  else drawCatStand(ctx, s, { swing, wag, isDead, mood: look, tired, earLay });

  ctx.restore();
}

/**
 * แมวยืนนิ่ง ๆ สำหรับหน้าแรกและรูปตัวอย่างในเมนู
 * หายใจขึ้นลง หางแกว่งช้า ๆ แล้วกะพริบตาเป็นระยะ — ไม่ใช่ภาพนิ่ง
 * x คือกึ่งกลางตัว ส่วน feetY คือระดับที่เท้าเหยียบ
 */
/**
 * ท่าว่างของแมวหน้าแรก
 *
 * ทุกท่าเป็น "การบิดท่ายืน" ด้วยตัวเลข 0–1 ไม่ใช่ฟังก์ชันวาดแยกกันคนละชุด
 * ข้อดีคือเปลี่ยนท่าแล้วลื่นเองโดยไม่ต้องเขียนแอนิเมชันเชื่อม แค่ไล่ค่าจาก 0 ไป 1
 * ถ้าแยกเป็นฟังก์ชันละท่า การสลับจะเป็นการตัดภาพซึ่งดูเป็นของเสียทันที
 *
 *   sit   ทรุดก้นลงนั่ง ขาหน้าตั้งตรง ขาหลังพับ
 *   loaf  หมอบราบเป็นก้อนขนมปัง ขาหุบหายใต้ตัว
 *   paw   ยกอุ้งเท้าขวาขึ้นมาเลีย
 *   yawn  อ้าปากหาว หลับตา หัวเงยนิด ๆ
 *   love  นั่งเอียงหัวร้องเมี้ยว ใช้ตอนผู้เล่นกดหัวใจให้ (ดู src/pet.js)
 *
 * ── ห้าท่าล่างเป็นท่า "ตอบตอนถูกแตะ" ──
 * ต่างจากท่าว่างข้างบนตรงที่ท่าว่างคือ "น้องกำลังพักอยู่" ส่วนพวกนี้คือ
 * "น้องตอบสนองคุณ" จึงต้องเป็นท่าที่มีการเคลื่อนไหวในตัวเองทุกท่า ไม่ใช่ท่าค้าง
 * และต้องอ่านออกจากรูปเงาล้วน ๆ เพราะมุมมองเป็นหน้าตรงเหมือนกันหมด
 * (ดูรายละเอียดของแต่ละท่าที่ REACT_ACTS ใน src/game.js)
 */
const IDLE_SHAPE = {
  stand: {},
  yawn: { mouth: 1, shut: 1, tilt: -0.1 },
  sit: { sit: 1 },
  groom: { sit: 1, paw: 1, tilt: 0.16, lick: 1 },
  loaf: { loaf: 1, shut: 1 },
  // ── ทำไม chirp ไม่ใช่ mouth: 1 ──
  // mouth เป็นค่าคงที่ = ปากอ้าค้าง ซึ่งอ่านเป็น "หาว" ไม่ใช่ "ร้อง"
  // การร้องต้องเห็นปากอ้าแล้วหุบเป็นจังหวะ จึงคิดจากเวลาเหมือน lick ของท่าเลีย
  love: { sit: 1, tilt: 0.19, chirp: 1 },

  // โบกอุ้งเท้าทักทาย — ยืน ยกเท้าขวาขึ้นข้างหัวแล้วโบก ตาประกาย ร้องทัก
  wave: { wave: 1, mood: 'happy', chirp: 1, tilt: -0.12 },
  // นวดแป้ง — นั่งลง สองอุ้งเท้ากดสลับกันเป็นจังหวะ หลับตาเคลิ้ม
  knead: { sit: 1, knead: 1, shut: 1, tilt: 0.05 },
  // ส่ายก้นเตรียมตะครุบ — ย่อตัวติดพื้น คอยื่นต่ำ หูลู่ ส่ายซ้ายขวาเร็ว ๆ
  //
  // ใช้ crouch ของตัวเอง ไม่ยืม loaf มาครึ่งหนึ่ง — ท่าหมอบคือ "ขาหายไปใต้ตัว"
  // ส่วนท่าเล็งคือ "ขางอรับน้ำหนักรอพุ่ง" ขาต้องยังอยู่ ถ้ายืม loaf มา จะได้ท่าที่
  // ขาจางครึ่งหนึ่งกับอุ้งเท้าท่าหมอบจางครึ่งหนึ่งซ้อนกัน แล้วอ่านไม่ออกทั้งสองอย่าง
  wiggle: { crouch: 1, sway: 1, ear: 0.85, tilt: -0.05 },
  // ล้มตัวลงนอนตะแคง ชูอุ้งเท้า หลับตายิ้ม หางสะบัด
  roll: { roll: 1, shut: 1, sprawl: 1 },
  // ขนพองฟูทั้งตัว หูลู่ ตาโต หางฟู แล้วค่อย ๆ ยุบ
  puff: { puff: 1, ear: 0.7, mood: 'happy', tilt: 0.04 },
};

/**
 * จังหวะอ้าปากของท่าที่ "กำลังร้อง" — เรเดียนต่อเฟรม
 *
 * เคยเร็วกว่านี้สามเท่า ซึ่งอ่านออกเป็นการสั่นปาก ไม่ใช่การร้อง
 * และเร็วเกินกว่าที่เสียงจริงจะตามทัน — เสียงร้องหนึ่งครั้งกินเวลาราวหนึ่งในห้าวินาที
 * รอบละ 0.7 วินาทีจึงเป็นจังหวะที่เสียงกับปากไปด้วยกันพอดี
 */
const CHIRP_RATE = 0.15;

/** ความอ้าปากของท่าหนึ่ง ณ เวลาหนึ่ง — 0 คือหุบสนิท */
function poseMouth(shape, t, k) {
  const chirp = shape.chirp ? Math.max(0, Math.sin(t * CHIRP_RATE)) * k : 0;
  return (shape.mouth || 0) * k + chirp;
}

/**
 * ตอนนี้ปากอ้าอยู่ไหม — เกณฑ์เดียวกับที่โค้ดวาดใช้จริง
 *
 * มีไว้ให้ฝั่งเกมเล่นเสียงให้ตรงกับปากที่เห็นบนจอ ถ้าฝั่งนั้นคำนวณเอง
 * วันที่ใครจูนจังหวะปากตรงนี้ เสียงจะหลุดจากปากทันทีโดยไม่มีอะไรฟ้อง
 */
export function poseMouthOpen(pose, t, k) {
  return poseMouth(IDLE_SHAPE[pose] || IDLE_SHAPE.stand, t, Math.max(0, Math.min(1, k))) > 0.5;
}

/** ท่านี้มีจังหวะอ้าปากไหม — ถ้าไม่มี ผู้เรียกต้องเล่นเสียงตอนเริ่มท่าเอง */
export function poseSpeaks(pose) {
  const shape = IDLE_SHAPE[pose] || IDLE_SHAPE.stand;
  return !!(shape.mouth || shape.chirp);
}

/**
 * ทรงลำตัว "ตอนยืน" ซึ่งเป็นทรงที่ชุดทุกชุดถูกวาดขึ้นมาให้พอดี
 * ต้องตรงกับวงรีใน clipBody() ของ src/outfits.js เป๊ะ ๆ
 */
const BODY_REF = { cy: 6, rx: 14, ry: 13 };

/**
 * วาดชุดให้พอดีกับทรงลำตัว "ตอนนี้" ไม่ใช่ทรงตอนยืนเสมอไป
 *
 * ── ปัญหาที่แก้ ──
 * ลำตัวเปลี่ยนทรงตามท่า: นั่งแล้วก้นผายและเลื่อนลง หมอบแล้วแบนกว้าง
 * (ดู cy/rx/ry ข้างล่าง) แต่ชุดทุกชุดตัดขอบตัวเองด้วยวงรีตอนยืนตายตัว
 * พอน้องนั่งหรือหมอบ ตัวจึงล้นออกไปนอกวงที่ชุดคลุมถึง เห็นเป็นขนโล้น ๆ
 * ตรงก้นกับสีข้าง — ซึ่งเป็นอาการที่ทักมา
 *
 * ── ทำไมแก้ด้วยการแปลงพิกัด ไม่ใช่ไปแก้ชุดทีละชุด ──
 * ชุดมี 18 ชุด ข้างในมีจุดตัดทรง 22 จุดและจุดเช็คท่า 61 จุด
 * ถ้าให้แต่ละชุดรู้จักทรงลำตัวเอง ต้องแก้ทั้งหมดนั้นและชุดใหม่ทุกชุดต้องจำกฎนี้
 *
 * ยืดพิกัดจาก "ทรงตอนยืน" ไปเป็น "ทรงตอนนี้" ก่อนเรียกชุด ชุดจึงวาดเหมือนเดิม
 * ทุกประการโดยไม่รู้ตัว แล้วผลลัพธ์ไปยืดหดตามลำตัวเอง ลายบนชุดก็ยืดตามไปด้วย
 * ซึ่งถูกต้องแล้ว เพราะผ้าจริงก็ยืดตามตัวที่ขยับ
 *
 * ตอนยืนปกติ (sit = loaf = 0) ค่าทั้งสามเท่ากับ BODY_REF พอดี
 * การแปลงจึงเป็นเอกลักษณ์ ไม่มีผลอะไรกับการวิ่งปกติเลยแม้แต่พิกเซลเดียว
 */
function outfitOnBody(ctx, s, cy, rx, ry) {
  if (!s.outfit?.body) return;
  ctx.save();
  ctx.translate(0, cy);
  ctx.scale(rx / BODY_REF.rx, ry / BODY_REF.ry);
  ctx.translate(0, -BODY_REF.cy);
  s.outfit.body(ctx, s, 'stand');
  ctx.restore();
}

export function drawCatPose(ctx, x, feetY, scale, s, t = 0, idle = null) {
  const shape = IDLE_SHAPE[idle?.pose] || IDLE_SHAPE.stand;
  const k = idle ? Math.max(0, Math.min(1, idle.k)) : 0;   // 0 = ยืนปกติ, 1 = เข้าท่าเต็มที่

  const sit = (shape.sit || 0) * k;
  const loaf = (shape.loaf || 0) * k;
  const paw = (shape.paw || 0) * k;

  // จังหวะเลีย — หัวก้มลงหาเท้าแล้วเงยขึ้น วนราวสองครั้งต่อวินาที
  //
  // ท่าอื่นเป็นท่า "พัก" ยกค้างไว้เฉย ๆ ก็ยังอ่านออกว่ากำลังพักอยู่
  // แต่ท่านี้เป็นท่า "กำลังทำอะไรอยู่" ถ้าไม่ขยับเลยมันจะอ่านเป็นภาพค้างทันที
  const lick = shape.lick ? Math.sin(t * 0.22) * k : 0;

  // จังหวะร้อง — อ้าแล้วหุบรอบละราว 0.7 วินาที ตามจังหวะที่เสียงร้องหนึ่งครั้งกินพอดี
  // ใช้เฉพาะครึ่งบวกของคลื่น ปากจึงอ้าเป็นห้วง ๆ แล้วหุบสนิทระหว่างห้วง (ดู CHIRP_RATE)
  const chirp = shape.chirp ? Math.max(0, Math.sin(t * CHIRP_RATE)) * k : 0;

  // ── จังหวะของท่าตอบตอนถูกแตะ ──
  // ทุกตัวคิดจาก t เหมือน lick/chirp ข้างบน ไม่ได้เก็บสถานะไว้ในตัวเอง
  // ฟังก์ชันวาดจึงยังเป็น "อ่านอย่างเดียว" เรียกซ้ำกี่รอบก็ได้ผลเดิม
  const wave = (shape.wave || 0) * k;                        // โบกอุ้งเท้า
  const knead = (shape.knead || 0) * k;                      // นวดแป้ง
  const puff = (shape.puff || 0) * k;                        // ขนพอง
  const roll = (shape.roll || 0) * k;                        // นอนตะแคง
  const sprawl = (shape.sprawl || 0) * k;                    // เหยียดขาตอนนอน
  const crouch = (shape.crouch || 0) * k;                    // ย่อตัวเล็งเป้า

  // โบกสี่รอบต่อวินาที เร็วกว่าการเลียเท่าตัว — มือที่โบกช้าอ่านเป็น "ยกค้าง"
  const waveT = wave ? Math.sin(t * 0.42) : 0;
  // นวดสลับสองข้าง ข้างหนึ่งลงตอนอีกข้างขึ้น จึงใช้คลื่นเดียวแล้วกลับเครื่องหมาย
  const kneadT = knead ? Math.sin(t * 0.3) : 0;
  // ส่ายก้นเร็วและสั้น เป็นการเล็งก่อนพุ่ง ไม่ใช่การเต้น
  const sway = (shape.sway || 0) * k * Math.sin(t * 0.55);
  // ขนพองสั่นระริกตอนพองเต็มที่ ให้รู้ว่าตัวยังเกร็งอยู่ ไม่ใช่แค่อ้วนขึ้น
  const puffQuiver = puff > 0.6 ? Math.sin(t * 1.1) * 0.4 : 0;

  const tilt = (shape.tilt || 0) * k + lick * 0.05 + chirp * 0.06
    + waveT * 0.05 + sway * 0.06;
  const mouth = poseMouth(shape, t, k);
  const shut = (shape.shut || 0) * k;
  const ear = (shape.ear || 0) * k;

  ctx.save();
  // ตอนนั่ง/หมอบ ตัวลงไปติดพื้นแล้ว การหายใจขึ้นลงต้องเบาลงตาม ไม่งั้นดูเหมือนลอย
  const breath = Math.sin(t * 0.045) * 1.8 * (1 - sit * 0.5 - loaf * 0.75 - crouch * 0.6);
  ctx.translate(x, feetY - (BODY.standH / 2) * scale + breath);
  ctx.scale(scale, scale);

  // ── ท่าที่พลิกทั้งตัว ──
  // ทำที่นี่ ไม่ใช่ในตัววาดแมว เพราะมันคือการหมุน "ทั้งก้อน" ไม่ใช่การบิดชิ้นส่วน
  // ถ้าเอาไปทำข้างใน ทุกชิ้น (หัว ขา หาง ชุด) ต้องรู้เรื่องการหมุนพร้อมกันหมด
  if (sway) ctx.translate(sway * 3.5, 0);
  if (roll > 0.001) {
    // หมุนรอบ "จุดที่เท้าเหยียบ" ไม่ใช่กลางตัว ตัวจึงล้มลงกองกับพื้นเหมือนของจริง
    // ถ้าหมุนรอบกลางตัว หัวจะจมลงไปใต้พื้นพอ ๆ กับที่ก้นลอยขึ้นฟ้า
    const FEET = 23;
    ctx.translate(0, FEET);
    ctx.rotate(-roll * 1.32);
    ctx.translate(0, -FEET);
    // ── สองค่านี้จูนจากภาพจริง ไม่ใช่คำนวณล้วน ──
    // หมุนรอบเท้าแล้วตัวจะจมลงไปใต้พื้นราวหกหน่วย เพราะสีข้างที่ลงไปแตะพื้น
    // อยู่ห่างจากจุดหมุนมากกว่าฝ่าเท้า ต้องยกกลับขึ้นมาเท่านั้น
    // ส่วนแกนนอน มวลทั้งตัวเทไปทางซ้ายตอนล้ม ดึงกลับมาให้ยังอยู่ตรงกลางเบาะ
    ctx.translate(roll * 15, -roll * 2.5);
  }

  ctx.lineCap = 'round';
  drawCatStand(ctx, s, {
    // นอนตะแคงแล้วขาต้องเหยียดออกไปข้างหน้า ไม่ใช่ห้อยตรงเหมือนตอนยืน
    // ขยับเบา ๆ ตามจังหวะด้วย เท้าที่นิ่งสนิทตอนตัวนอนอ่านเป็นภาพค้าง
    swing: sprawl * (0.9 + Math.sin(t * 0.16) * 0.25),
    sprawlPads: sprawl,
    // หางแกว่งช้าลงเวลาพัก และแกว่งแรงขึ้นตอนหาว (เหมือนแมวยืดตัว)
    // ตอนนอนตะแคงกับตอนขนพองหางสะบัดเร็วกว่าปกติ เป็นหางที่ "มีอารมณ์"
    // ตอนเล็งเป้า หางตั้งขึ้นค้างแล้วกระตุกถี่ ๆ ที่ปลาย ไม่ได้แกว่งไปมาช้า ๆ
    // เป็นหางคนละแบบกับหางสบาย ๆ และเป็นครึ่งหนึ่งของสัญญาณว่า "กำลังจะพุ่ง"
    wag: crouch > 0.02
      ? 0.72 + Math.sin(t * 0.62) * 0.28
      : Math.sin(t * (0.038 - loaf * 0.02 + roll * 0.09 + puff * 0.06))
        * (1 - loaf * 0.45) * (1 + roll * 0.5),
    // หางหดสั้นลงตอนล้มตัว — หางเป็นส่วนที่ยื่นไกลจากจุดหมุนที่สุด พอหมุนไป
    // 76 องศา ปลายหางจะเหวี่ยงลงไปอยู่ต่ำกว่าพื้นเกือบยี่สิบหน่วย
    // ของจริงแมวก็ขดหางเข้าหาตัวตอนล้มลงนอน ไม่ได้เหยียดค้างไว้
    tailShort: roll * 0.34,
    blink: shut > 0.5 || t % 200 < 9,   // กะพริบสั้น ๆ ทุก ~3.3 วินาที
    mouthOpen: mouth > 0.5,
    mood: k > 0.45 ? (shape.mood || '') : '',
    sit,
    loaf,
    crouch,
    paw,
    tilt,
    lick,
    earLay: ear,
    wave,
    waveT,
    knead,
    kneadT,
    puff: puff + puffQuiver * puff,
  });
  ctx.restore();
}

/**
 * เฉพาะหัว ใช้เป็นไอคอนในเมนู ซึ่งเล็กเกินกว่าจะเห็นรายละเอียดตัวเต็ม
 * opts ส่งต่อให้ drawCatHead ตรง ๆ — ที่ใช้จริงตรงนี้คือ noPhoto
 */
export function drawCatFace(ctx, x, y, scale, s, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  drawCatHead(ctx, 0, 0, s, opts);
  ctx.restore();
}

function drawCatStand(ctx, s, {
  swing = 0, wag = 0, isDead = false, blink = false, mouthOpen = false,
  sit = 0, loaf = 0, paw = 0, tilt = 0, lick = 0, mood = '', tired = 0, earLay = 0,
  wave = 0, waveT = 0, knead = 0, kneadT = 0, puff = 0, crouch = 0, tailShort = 0,
  sprawlPads = 0,
} = {}) {
  s.outfit?.back?.(ctx, s, 'stand');

  // ── ตัวเลขของท่า ────────────────────────────
  // ทุกค่าเริ่มจากท่ายืนแล้วบวกส่วนต่างตามน้ำหนักของ sit/loaf
  // เขียนแบบนี้เพื่อให้ค่ากลางทางยังเป็นท่าที่ดูได้ ไม่ใช่แค่สองปลายเท่านั้นที่ถูก
  //
  // มุมมองเป็นหน้าตรง ท่านั่ง/หมอบจึงต้องอ่านจาก "รูปเงา" ล้วน ๆ:
  //   นั่ง  = สามเหลี่ยม บ่าแคบ ก้นผายออกสองข้าง ขาหน้าตั้งตรงกลาง
  //   หมอบ = เนินเตี้ยแบนกว้าง ไม่มีขา เหลือแค่อุ้งเท้าโผล่หน้า
  const rest = Math.max(sit, loaf);           // กำลังพักอยู่แค่ไหน (รวมทุกท่าพัก)
  // ── ย่อตัวเล็งเป้า ──
  // ตัวลงไปใกล้พื้นและผายออกข้าง แต่ขายังอยู่ครบ ต่างจากหมอบที่ขาหายไปใต้ตัว
  // นี่คือสิ่งเดียวที่แยกสองท่านี้ออกจากกันในมุมมองหน้าตรง
  const cy = 6 + sit * 3 + loaf * 9 + crouch * 9;
  // ขนพองทำให้ตัวโตขึ้นทุกทาง แต่กว้างมากกว่าสูง — ขนที่พองตั้งฉากกับผิว
  // ด้านข้างจึงยื่นออกไปมากกว่าด้านบนที่มีน้ำหนักตัวกดอยู่
  const rx = (14 + sit * 1 + loaf * 4) * (1 + puff * 0.34 + crouch * 0.26);
  const ry = (13 + sit * 0.5 - loaf * 4.5) * (1 + puff * 0.22 - crouch * 0.24);
  const hx = 1 + loaf * 2;
  // ตัวพองดันหัวขึ้นนิดหนึ่ง ส่วนตอนเล็งเป้าหัวต่ำลงมาระดับเดียวกับไหล่
  const hy = -12 + sit * 2 + loaf * 10.5 - puff * 2 + crouch * 10;

  // ── หาง ─────────────────────────────────────
  // โคนหางเลื่อนลงตามตัว ตอนหมอบขดมาข้างลำตัวแทนที่จะชี้ออกไปหลัง
  // หางฟูตามตัวด้วย ถ้าตัวพองแต่หางยังเรียว มันจะอ่านเป็น "อ้วนขึ้น" ไม่ใช่ "ขนพอง"
  drawTail(ctx, -11 - loaf * 3, 8 + sit * 4 + loaf * 10 + crouch * 6,
           wag * (1 - loaf * 0.5), s, puff, tailShort);

  // ── ก้นตอนนั่ง ──────────────────────────────
  // วาดก่อนลำตัวเพื่อให้กลืนเป็นก้อนเดียวกัน ไม่ใช่ก้อนกลมแปะอยู่ข้าง ๆ
  if (sit > 0.02) {
    ctx.fillStyle = s.cat;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * (10 + sit), cy + 8 * sit, 7.5 * sit, 7 * sit, 0, 0, Math.PI * 2);
      ctx.fill();
      catEdge(ctx, s); ctx.stroke();
    }
  }

  // ── ขาตอนยืน ────────────────────────────────
  // ไม่ได้แค่จางหาย แต่ "เคลื่อนไปหา" ตำแหน่งของขาท่าพักด้วย
  //
  // ถ้าจางอย่างเดียว ครึ่งทางจะเห็นแขนกางออกข้างเป็นแท่งจาง ๆ ค้างอยู่กลางอากาศ
  // พร้อมกับขานั่งที่โผล่มาอีกชุด = เห็นขาสี่ข้างพร้อมกัน
  // พอให้มันเดินเข้าหากันก่อน สองชุดจะทับกันสนิทตอนสลับ จนมองไม่ออกว่ามีการสลับ
  if (rest < 0.98) {
    ctx.save();
    ctx.globalAlpha *= 1 - rest;

    ctx.strokeStyle = s.dark;
    ctx.lineWidth = 7;
    // ย่อตัวแล้วขาสั้นลงจากด้านบน ฝ่าเท้ายังอยู่ที่เดิม — ขาที่หดจากด้านล่างด้วย
    // จะกลายเป็นแมวลอยเหนือพื้น ไม่ใช่แมวย่อตัว
    const hy0 = 13 + rest * 4 + crouch * 9;
    const hy1 = 24 - rest * 2;
    ctx.beginPath(); ctx.moveTo(-4, hy0); ctx.lineTo(-4 + swing * 10 * (1 - rest), hy1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, hy0); ctx.lineTo(6 - swing * 10 * (1 - rest), hy1); ctx.stroke();

    // แขนหุบเข้าและลดลงหาพื้น จนไปจบที่เดียวกับขาหน้าของท่านั่งพอดี
    ctx.lineWidth = 6;
    const ax0 = 8 - rest * 1.5;
    const ay0 = 3 + rest * 8;
    // ── ตอนขนพอง แขนหายเข้าไปในตัวโดยตั้งใจ ──
    // เคยดันแขนออกให้พ้นขอบขน แต่ได้อุ้งเท้าสองลูกโผล่ครึ่งใบออกมาจากก้อนขน
    // โดยไม่เห็นท่อนแขน เพราะแขนอยู่หลังลำตัว — อ่านเป็นฟองสบู่ติดข้างตัว
    // ก้อนขนกลม ๆ ที่มีแค่ขาโผล่ข้างล่างอ่านออกกว่า และตรงกับของจริงมากกว่า
    const ax1 = 16 - rest * 9;
    const ay1 = 3 + rest * 17;

    // ── โบกทักทาย ──
    // ไม่ได้วาดแขนเส้นใหม่ แต่ย้าย "ปลายแขนขวาเส้นเดิม" ขึ้นไปข้างหัว
    // ถ้าวาดเส้นใหม่ทับ จะเห็นแขนขวาสองข้างพร้อมกันตลอดช่วงที่ท่ายังเข้าไม่เต็ม
    const wx = ax1 + (18.5 + waveT * 6.5 - ax1) * wave;
    const wy = ay1 + (-18 + Math.abs(waveT) * 3 - ay1) * wave;

    ctx.beginPath(); ctx.moveTo(-ax0, ay0); ctx.lineTo(-ax1, ay1 - swing * 8 * (1 - rest)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax0, ay0); ctx.lineTo(wx, wy + swing * 8 * (1 - rest) * (1 - wave)); ctx.stroke();

    // อุ้งเท้าที่ปลายมือโบก — มือเปล่า ๆ ที่ไม่มีอุ้งเท้าอ่านเป็นแท่งไม้ ไม่ใช่มือ
    if (wave > 0.02) {
      ctx.save();
      ctx.globalAlpha *= wave;
      ctx.fillStyle = s.cream;
      ctx.beginPath(); ctx.arc(wx, wy, 3.9, 0, Math.PI * 2); ctx.fill();
      catEdge(ctx, s); ctx.stroke();
      ctx.restore();
    }

    // รอยแปรงบนขากับแขน — อยู่นอกวงรีลำตัวเหมือนหาง
    paintStroke(ctx, s, 'body', () => {
      ctx.beginPath();
      ctx.moveTo(-4, hy0); ctx.lineTo(-4 + swing * 10 * (1 - rest), hy1);
      ctx.moveTo(6, hy0); ctx.lineTo(6 - swing * 10 * (1 - rest), hy1);
    }, 7);
    paintStroke(ctx, s, 'body', () => {
      ctx.beginPath();
      ctx.moveTo(-ax0, ay0); ctx.lineTo(-ax1, ay1 - swing * 8 * (1 - rest));
      ctx.moveTo(ax0, ay0); ctx.lineTo(ax1, ay1 + swing * 8 * (1 - rest));
    }, 6);

    // ── อุ้งเท้าตอนเหยียดขานอน ──
    // ท่ายืนไม่ต้องมี เพราะปลายขาชี้ลงพื้นแล้วถูกเงาใต้เท้ากลืนไปพอดี
    // แต่พอล้มตัวลง ปลายขาทั้งสี่ชี้ออกข้างให้เห็นเต็ม ๆ ถ้าไม่มีอุ้งเท้า
    // มันจะอ่านเป็นแท่งไม้สี่แท่งยื่นออกจากก้อนขน
    if (sprawlPads > 0.02) {
      ctx.save();
      ctx.globalAlpha *= sprawlPads;
      ctx.fillStyle = s.cream;
      for (const [ex, ey] of [
        [-4 + swing * 10 * (1 - rest), hy1], [6 - swing * 10 * (1 - rest), hy1],
        [-ax1, ay1 - swing * 8 * (1 - rest)], [ax1, ay1 + swing * 8 * (1 - rest)],
      ]) {
        ctx.beginPath(); ctx.arc(ex, ey, 3.7, 0, Math.PI * 2); ctx.fill();
        catEdge(ctx, s); ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // ── ลำตัว ───────────────────────────────────
  // เก็บ path ไว้เป็นฟังก์ชัน เพราะต้องใช้สองรอบ: ตีขอบตอนนี้ แล้วตีซ้ำทับชุดทีหลัง
  //
  // ── ขนพองเปลี่ยน "เส้นขอบตัว" ไม่ใช่แปะขนเพิ่มรอบตัว ──
  // ถ้าวาดวงกลมเล็ก ๆ เรียงรอบวงรี จะเห็นเป็นลูกบอลแปะติดกันเป็นพวง เพราะขอบ
  // ของแต่ละลูกตัดกันเอง และรอยแปรงกับชุดที่ตัดขอบด้วย path นี้จะไม่ตามไปด้วย
  // ยุบมันเป็นเส้นเดียวที่รัศมีขึ้นลงเป็นคลื่นแทน ทุกอย่างที่อ้าง path นี้จึงฟูตามเอง
  const FLUFF = 13;      // จำนวนแฉกขน — น้อยกว่านี้ดูเป็นเฟือง มากกว่านี้ดูเป็นหนาม
  const bodyEdge = () => {
    ctx.beginPath();
    if (puff < 0.01) { ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2); return; }
    const STEP = 96;
    for (let i = 0; i <= STEP; i++) {
      const a = (i / STEP) * Math.PI * 2;
      const f = 1 + puff * 0.13 * Math.sin(a * FLUFF);
      ctx.lineTo(Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f);
    }
    ctx.closePath();
  };
  ctx.fillStyle = s.cat;
  bodyEdge(); ctx.fill();
  // ใส่ชุดอยู่ → ตีขอบหนาสองเท่าไว้ก่อน เดี๋ยวชุดจะกินครึ่งในไปเอง (ดู bodyEdgeUnder)
  bodyEdgeUnder(ctx, s);
  bodyEdge(); ctx.stroke();
  // ── s.solid = วาดแบบทึบล้วน ──
  // ใช้ตอนวาดน้องเป็น "แผนที่รหัสสี" เพื่อหาว่าพิกเซลไหนเป็นส่วนไหน (ดู pickSkin
  // ใน paint.js) ขอบแสงเป็นสีขาวโปร่ง พอทับลงบนรหัสสีมันจะผสมจนอ่านออกมาเป็น
  // รหัสของส่วนอื่น หรือเป็น "ไม่ใช่ส่วนไหนเลย" — เห็นเป็นเส้นที่ทาสีไม่ติดพาดกลางตัว
  if (!s.solid) {
    ctx.strokeStyle = 'rgba(255,252,240,.26)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, cy, rx - 1, ry - 1, 0, -Math.PI * 0.52, Math.PI * 0.08); ctx.stroke();
  }

  // พุงสีครีม
  ctx.fillStyle = s.cream;
  ctx.beginPath(); ctx.ellipse(1, cy + 2.5 - loaf * 2, 8 - loaf * 0.5, 8 - loaf * 4, 0, 0, Math.PI * 2); ctx.fill();

  if (s.stripes) {
    ctx.strokeStyle = s.dark;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-10, cy - 8); ctx.lineTo(-11, cy - 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, cy - 10); ctx.lineTo(-7, cy - 5); ctx.stroke();
  }

  // รอยแปรงทับลำตัว วาดก่อนชุด — ชุดคือของที่ "ใส่ทับตัว" จึงต้องอยู่บนรอยแปรงเสมอ
  paintOver(ctx, s, 'body', bodyEdge);

  outfitOnBody(ctx, s, cy, rx, ry);

  // ไม่มีการตีขอบซ้ำทับชุดอีกแล้ว — ขอบถูกเตรียมไว้ตั้งแต่ก่อนใส่ชุด (ดู bodyEdgeUnder)

  // ── ขาตอนพัก ────────────────────────────────
  // ต้องวาด "หลัง" ลำตัว เพราะแมวหันหน้าเข้าหาคนดู ขาหน้าจึงอยู่หน้าอก
  // ถ้าวาดก่อนลำตัวเหมือนท่ายืน มันจะหายเข้าไปในตัวจนท่าอ่านไม่ออกเลย
  if (rest > 0.02) {
    ctx.save();
    // ยกกำลังสองเพื่อให้ขาโผล่ช่วงท้ายของการเปลี่ยนท่า ตอนที่ตัวทรุดลงไปแล้ว
    // ถ้าจางเข้าเป็นเส้นตรง ครึ่งทางจะได้เส้นทึบครึ่งจางพาดกลางพุงเหมือนรอยเปื้อน
    ctx.globalAlpha *= rest * rest;
    ctx.strokeStyle = s.dark;
    ctx.lineCap = 'round';

    if (sit > 0.02) {
      // นั่ง: ขาหน้าตั้งตรงลงพื้นสองข้าง ปลายจบที่ระดับเท้าพอดี
      // ตอนนวดแป้ง ขาหน้าคู่นี้คือคู่ที่ถูกยกขึ้นไปนวด ต้องหายไปพร้อมกับที่คู่บนโผล่มา
      // ไม่งั้นจะเห็นขาหน้าสี่ข้างในท่าเดียว
      ctx.save();
      ctx.globalAlpha *= 1 - knead;
      ctx.lineWidth = 6;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * 6.5, cy + 5);
        ctx.lineTo(sx * 7, 23);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (loaf > 0.02) {
      // หมอบ: ไม่มีขา เหลือแค่อุ้งเท้าสองข้างโผล่หน้าตัว
      // เก็บ path ไว้ใช้ซ้ำ ต้องทารอยแปรงทับอีกรอบด้วยเหตุผลเดียวกับปาก
      const paws = [];
      ctx.fillStyle = s.cream;
      ctx.strokeStyle = s.dark;
      ctx.lineWidth = 1.6;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(sx * 9, cy + ry - 0.5, 5, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();   // ตีเส้นขอบบาง ๆ ให้แยกออกจากพุงที่เป็นสีครีมเหมือนกัน
        paws.push([sx * 9, cy + ry - 0.5]);
      }
      // ทารอยแปรงทับอุ้งเท้า เหตุผลเดียวกับปาก — เป็นแผ่นทึบที่วาดหลังรอยแปรง
      paintOver(ctx, s, 'body', () => {
        ctx.beginPath();
        for (const [ex, ey] of paws) ctx.ellipse(ex, ey, 5, 3.6, 0, 0, Math.PI * 2);
      });
    }

    ctx.restore();
  }

  // ── นวดแป้ง ─────────────────────────────────
  // สองอุ้งเท้ากดสลับกันหน้าอก วาดหลังลำตัวเพราะแมวหันหน้าเข้าหาคนดู
  // อุ้งเท้าจึงอยู่ "หน้าอก" ไม่ใช่ข้างลำตัว — เหตุผลเดียวกับขาท่านั่ง
  //
  // ต้องสลับข้างกันจริง ๆ ถ้าขึ้นลงพร้อมกันจะอ่านเป็น "ยกเท้าสองข้างขึ้นลง"
  // ซึ่งเป็นคนละท่ากับการนวด ที่นิยามของมันคือการสลับซ้ายขวาไม่หยุด
  if (knead > 0.02) {
    ctx.save();
    ctx.globalAlpha *= knead;
    ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
      const push = kneadT * sx;
      const px = sx * 8.6;
      const py = cy + 1.5 + push * 3.4;
      ctx.strokeStyle = s.dark;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(sx * 5.5, cy - 5);
      ctx.quadraticCurveTo(sx * 10, cy - 2.5, px, py);
      ctx.stroke();
      ctx.fillStyle = s.cream;
      ctx.beginPath(); ctx.ellipse(px, py, 4.3, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      catEdge(ctx, s); ctx.stroke();
    }
    ctx.restore();
  }

  // เหนื่อยแล้วหัวห้อยลงนิดหน่อย ทั้งตัวจึงดูหนักขึ้นโดยไม่ต้องแก้ท่าขา
  drawCatHead(ctx, hx, hy + tired * 1.6, s, {
    isDead, blink, mouthOpen, tilt, mood, earLay,
    // แผนที่รหัสสีต้องเห็นหน้าน้องตัวจริง ไม่ใช่รูปที่ผู้เล่นอัปโหลดมาทับ
    // ไม่งั้นขอบเขตของทุกส่วนบนหัวจะกลายเป็นสีในรูปถ่าย
    noPhoto: !!s.solid,
  });

  // ── ยกอุ้งเท้าขึ้นเลีย ───────────────────────
  // ต้องวาด "หลังหัว" ไม่ใช่ก่อน เพราะปลายเท้าไปจบตรงปาก ซึ่งอยู่ในวงหัวพอดี
  // วาดก่อนหัวเมื่อไหร่ หัวจะทับจนไม่เหลือร่องรอยว่ายกเท้าอยู่เลย
  if (paw > 0.02) {
    ctx.save();
    ctx.globalAlpha *= paw;
    ctx.strokeStyle = s.dark;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    // ปลายเท้าขยับสวนทางกับหัวเล็กน้อย จึงดูเหมือนเลียไปมาจริง ๆ
    // ถ้าขยับทางเดียวกันทั้งคู่ มันจะอ่านเป็น "ทั้งตัวสั่น" แทน
    const px = hx + 5 - lick * 1.2;
    const py = hy + 7 - lick * 2.6;
    ctx.beginPath();
    ctx.moveTo(7, cy + 6);
    ctx.quadraticCurveTo(11, cy - 1, px, py);
    ctx.stroke();
    ctx.fillStyle = s.cream;
    ctx.beginPath(); ctx.arc(px, py, 3.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawCatSlide(ctx, s, { isDead = false, mouthOpen = false, mood = '' } = {}) {
  s.outfit?.back?.(ctx, s, 'slide');

  // หางลากยาวไปข้างหลัง
  // หางเป็นเส้น ไม่ใช่รูปปิด จะตีขอบตรง ๆ ไม่ได้ ต้องวาดเส้นเข้มที่หนากว่ารองไว้
  // ข้างใต้แล้ววาดเส้นสีขนทับ ส่วนที่โผล่ออกมารอบ ๆ ก็คือขอบพอดี
  ctx.lineWidth = 6.5 + CAT_EDGE * 2;
  ctx.strokeStyle = s.line || s.dark;
  ctx.beginPath();
  ctx.moveTo(-15, 2);
  ctx.quadraticCurveTo(-27, 1, -31, -7);
  ctx.stroke();
  if (s.points) {
    const g = ctx.createLinearGradient(-15, 2, -31, -7);
    g.addColorStop(0, s.cat);
    g.addColorStop(0.34, s.dark);
    g.addColorStop(1, s.dark);
    ctx.strokeStyle = g;
  } else {
    ctx.strokeStyle = s.cat;
  }
  ctx.lineWidth = 6.5;
  ctx.stroke();
  ctx.fillStyle = s.points ? s.dark : s.cream;
  ctx.beginPath(); ctx.arc(-31, -7, 3.4, 0, Math.PI * 2); ctx.fill();

  // ขาหลังเหยียดไปหลัง
  ctx.strokeStyle = s.dark;
  ctx.lineWidth = 6.5;
  ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-23, 9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(-21, 12); ctx.stroke();

  // ลำตัวแบนราบ
  const bodyEdge = () => { ctx.beginPath(); ctx.ellipse(-2, 2, 19, 10, -0.08, 0, Math.PI * 2); };
  ctx.fillStyle = s.cat;
  bodyEdge(); ctx.fill();
  bodyEdgeUnder(ctx, s);   // เหตุผลเดียวกับท่ายืน
  bodyEdge(); ctx.stroke();
  ctx.fillStyle = s.cream;
  ctx.beginPath(); ctx.ellipse(0, 6, 12, 5, -0.05, 0, Math.PI * 2); ctx.fill();

  if (s.stripes) {
    ctx.strokeStyle = s.dark;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(-12, -1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(-5, -2); ctx.stroke();
  }

  // ขาหน้าเหยียดไปข้างหน้า
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(7, 5); ctx.lineTo(22, 9); ctx.stroke();

  paintOver(ctx, s, 'body', bodyEdge);

  s.outfit?.body?.(ctx, s, 'slide');

  // ไม่ตีขอบซ้ำทับชุด — ขอบถูกเตรียมไว้ตั้งแต่ก่อนใส่ชุดแล้ว (ดู bodyEdgeUnder)

  drawCatHead(ctx, 12, -4, s, { isDead, scale: 0.82, earsBack: true, mouthOpen, mood });
}

/**
 * หัวแมวพร้อมหู หน้า หนวด — วาดรอบจุด (hx,hy) ที่ส่งเข้ามา
 * earsBack: ตอนหมอบต้องลู่หูไปหลัง ไม่งั้นปลายหูโผล่ทะลุคานตอนลอด
 */
// noPhoto = ไม่ต้องเอารูปที่ผู้เล่นอัปโหลดมาทับหน้า
// มีไว้ให้ไอคอนที่ต้องเป็น "หน้าน้องมาตรฐาน" ตลอด ไม่ใช่หน้าที่ผู้เล่นตั้งไว้
function drawCatHead(ctx, hx, hy, s, { isDead = false, scale = 1, earsBack = false, blink = false, mouthOpen = false, tilt = 0, mood = '', noPhoto = false, earLay = 0 } = {}) {
  ctx.save();
  ctx.translate(hx, hy);
  // เอียงหัวรอบ "โคนคอ" ไม่ใช่กลางหัว ไม่งั้นหัวจะลอยหลุดจากตัวเวลาเอียงเยอะ ๆ
  if (tilt) {
    ctx.translate(0, 12);
    ctx.rotate(tilt);
    ctx.translate(0, -12);
  }
  ctx.scale(scale, scale);

  // [โคนซ้าย, โคนขวา, ปลาย] ของหูสองข้าง
  const earsUp = earsBack
    ? [[[-11, -4], [-5, -9], [-23, -9]], [[3, -8], [9, -10], [-8, -16]]]
    : [[[-13, -8], [-3, -8], [-14, -20]], [[3, -8], [13, -8], [14, -20]]];

  // ── หูลู่ ──
  // ขยับเฉพาะ "ปลายหู" ไม่แตะโคน หูจึงพับลงจากโคนเหมือนหูจริง
  // ถ้าเลื่อนทั้งใบ มันจะกลายเป็นหูหลุดออกจากหัวไปวางที่อื่น
  // แมวตัวนี้เป็นมุมมองหน้าตรง หูจึงต้องแบะออก "คนละข้าง" ไม่ใช่พับไปทางเดียวกัน
  const ears = earLay <= 0.01 ? earsUp : earsUp.map(([a, b, tip], i) => {
    const out = i === 0 ? -1 : 1;
    return [a, b, [tip[0] + out * earLay * 6.5, tip[1] + earLay * 10]];
  });

  // หูนอก วาดก่อนหัวเพื่อให้โคนหูถูกกลบ
  // แมวแต้มใช้สีปลายขน หูคือแต้มที่เห็นชัดที่สุดเวลามองจากไกล
  ctx.fillStyle = s.points ? s.dark : s.cat;
  for (const [a, b, tip] of ears) {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(b[0], b[1]);
    ctx.closePath(); ctx.fill();
    catEdge(ctx, s); ctx.stroke();
  }

  // หูชั้นใน ย่อเข้าหาจุดกึ่งกลางของหูแต่ละข้าง
  // บนหูสีเข้มของแมวแต้ม ชมพูสดจะกระโดดออกมาเป็นจุดแหลม ต้องหรี่ลงให้จมไปกับหู
  ctx.fillStyle = s.points ? fade(s.pink, 0.5) : s.pink;
  for (const [a, b, tip] of ears) {
    const mx = (a[0] + b[0] + tip[0]) / 3;
    const my = (a[1] + b[1] + tip[1]) / 3;
    ctx.beginPath();
    for (const [px, py] of [a, tip, b]) {
      ctx.lineTo(mx + (px - mx) * 0.55, my + (py - my) * 0.55);
    }
    ctx.closePath(); ctx.fill();
  }

  // รอยแปรงบนหู — หูอยู่นอกวงกลมหัว ต้องทาแยกไม่งั้นระบายหูไม่ติด
  // วาดก่อนหัวเพราะหูอยู่หลังหัว ลำดับเดียวกับตอนวาดหูจริง
  paintOver(ctx, s, 'head', () => {
    ctx.beginPath();
    for (const [a, b, tip] of ears) {
      ctx.moveTo(a[0], a[1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(b[0], b[1]);
      ctx.closePath();
    }
  });

  // หัว
  ctx.fillStyle = s.cat;
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
  catEdge(ctx, s); ctx.stroke();

  // ขอบแสงด้านบนขวา รับกับแสงเรืองที่ขอบฟ้าซึ่งอยู่ทางขวาของจอ
  // ทำหน้าที่คู่กับเส้นขอบเข้ม: เส้นเข้มไว้สู้ฉากสว่าง เส้นสว่างไว้สู้ฉากมืด
  // ปิดตอนวาดแผนที่รหัสสี ด้วยเหตุผลเดียวกับขอบแสงของลำตัว (ดู s.solid ที่นั่น)
  if (!s.solid) {
    ctx.strokeStyle = 'rgba(255,252,240,.32)';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(0, 0, 11.9, -Math.PI * 0.6, Math.PI * 0.06); ctx.stroke();
  }

  if (s.stripes) {
    ctx.strokeStyle = s.dark;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-5, -11); ctx.lineTo(-4, -6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1, -12); ctx.lineTo(2, -7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -10); ctx.lineTo(7, -6); ctx.stroke();
  }

  // รอยแปรงบนหัว — ทับสีขนกับลาย แต่ยังอยู่ใต้ตา/จมูก/หนวด
  // ถ้าวาดทับของพวกนั้นด้วย คนที่ระบายเลยขอบหน้าไปนิดเดียวจะได้แมวไม่มีตาทันที
  paintOver(ctx, s, 'head', () => { ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); });

  // ปากสีครีม
  const muzzle = () => { ctx.beginPath(); ctx.ellipse(1, 5, 7.5, 5, 0, 0, Math.PI * 2); };
  ctx.fillStyle = s.cream;
  muzzle(); ctx.fill();

  // ── ทารอยแปรงทับปากอีกรอบ ──
  // ปากเป็นแผ่นทึบที่วาดหลังรอยแปรง คนที่ลากผ่านหน้าน้องจึงเห็นเป็นจุดขาวที่
  // "ทายังไงก็ไม่ติด" กลางหน้าพอดี ซึ่งเป็นจุดที่คนสังเกตเห็นก่อนใครเพื่อน
  // ทาซ้ำเฉพาะในวงปาก ตา/จมูก/หนวดที่วาดต่อจากนี้จึงยังอยู่บนสุดเหมือนเดิม
  paintOver(ctx, s, 'head', muzzle);

  // ── หน้ากากของแมวแต้ม ──
  // แต้มบนหน้าแมวจริงไม่มีขอบ มันฟุ้งจากรอบจมูกจางออกไปเรื่อย ๆ
  // จึงใช้ไล่สีแบบวงกลมแทนการวาดรูปทรงทึบ ซึ่งจะได้แผ่นสีแปะหน้าแทนที่จะเป็นสีขน
  //
  // ต้องวาดก่อนตา ไม่งั้นหน้ากากจะคลุมทับตาจนสีฟ้าหม่นลง
  // ซึ่งตาสีฟ้าคือจุดเด่นอีกอย่างของสายพันธุ์นี้ที่ห้ามเสีย
  // และต้อง clip ด้วยวงหัว ไม่งั้นขอบฟุ้งจะล้นออกไปนอกหัวเป็นรัศมีสีน้ำตาล
  if (s.points) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.clip();
    const m = ctx.createRadialGradient(1, 4.5, 1.5, 1, 4.5, 11.5);
    m.addColorStop(0, fade(s.dark, 0.82));
    m.addColorStop(0.45, fade(s.dark, 0.5));
    m.addColorStop(1, fade(s.dark, 0));
    ctx.fillStyle = m;
    ctx.beginPath(); ctx.arc(1, 4.5, 11.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // แก้มชมพู วาดก่อนตาเพื่อให้อยู่ชั้นล่างสุดของใบหน้า
  //
  // ตอนตาเป็นประกายให้ขึ้นทุกสกิน ไม่สนว่าสกินนั้นตั้ง blush ไว้ไหม และเข้มกว่าปกติ
  // เพราะแก้มแดงคือครึ่งหนึ่งของอารมณ์ "ดีใจจนหน้าแดง" ถ้ามีแต่ตาประกายเฉย ๆ
  // ส้มน้อยกับปลาสลิดจะได้หน้าที่จืดกว่าขาวมุกทั้งที่เป็นจังหวะเดียวกันของเกม
  const glee = mood === 'starry';
  if (s.blush || glee) {
    ctx.save();
    // แก้มเป็นสีโปร่งบาง ๆ เพื่อให้ดูเป็นเลือดฝาด ไม่ใช่สติกเกอร์แปะหน้า
    // แต่ตอนวาดแผนที่รหัสสีต้องทึบ ไม่งั้นรหัสแก้มจะผสมกับรหัสขนจนได้ค่ากลาง ๆ
    // ที่อ่านออกมาเป็น "หูใน" — แตะแก้มแล้วไปโดนหูในแทน ซึ่งเป็นอาการที่ทักมา
    ctx.globalAlpha = s.solid ? 1 : (glee ? 0.72 : 0.5);
    // ช่อง cheek แยกจาก pink เพื่อให้ระบายแก้มกับหูในคนละสีได้
    // สกินติดเกมทั้งหกตัวไม่ได้ตั้ง cheek ไว้ จึงถอยไปใช้ pink เหมือนเดิมทุกประการ
    ctx.fillStyle = s.cheek || s.pink;
    const bw = glee ? 4.3 : 3.6;
    const bh = 2.4 + (glee ? 0.5 : 0);
    ctx.beginPath(); ctx.ellipse(-9, 3, bw, bh, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(11, 3, bw, bh, 0, 0, Math.PI * 2); ctx.fill();

    // ── รอยแปรงบนแก้ม ──
    // อยู่ในวง save เดียวกับแก้ม จึงได้ความโปร่งเท่ากันโดยอัตโนมัติ
    // แก้มที่ระบายเองจึงยังเป็นเลือดฝาดจาง ๆ ไม่ใช่แผ่นสีทึบแปะหน้า
    //
    // สองข้างอยู่ในพาธเดียวกันแต่ไม่ได้ทาพร้อมกัน — พู่กันทิ้งรอยเฉพาะตรงที่ลากผ่าน
    // ระบายแก้มซ้ายข้างเดียวแล้วเว้นขวาไว้จึงทำได้
    paintOver(ctx, s, 'head', () => {
      ctx.beginPath();
      ctx.ellipse(-9, 3, bw, bh, 0, 0, Math.PI * 2);
      ctx.ellipse(11, 3, bw, bh, 0, 0, Math.PI * 2);
    });
    ctx.restore();
  }

  // ── ตา ──
  // ใช้ช่อง eye ไม่ใช่ ink เพราะสองอย่างนี้เคยเป็นช่องเดียวกัน แล้วมันพังตรงที่
  // "สีตา" กับ "สีเส้นปาก" ไม่ควรเป็นสีเดียวกัน วิเชียรมาศตาฟ้าเลยได้ปากสีฟ้าไปด้วย
  // และปลาสลิดตาเขียวก็ได้ปากเขียว ซึ่งไม่มีแมวตัวไหนในโลกเป็นแบบนั้น
  //
  // สำคัญกว่านั้นคือตอนเปิดให้ผู้เล่นระบายสีเอง ถ้ายังรวมกันอยู่ คนที่เลือกตาสีแดง
  // จะได้ปากสีแดงตามไปด้วยโดยไม่ได้ตั้งใจ
  if (isDead) {
    ctx.strokeStyle = s.eye;
    ctx.lineWidth = 2.2;
    for (const ex of [-5, 7]) {
      ctx.beginPath();
      ctx.moveTo(ex - 3, -4); ctx.lineTo(ex + 3, 2);
      ctx.moveTo(ex + 3, -4); ctx.lineTo(ex - 3, 2);
      ctx.stroke();
    }
  } else if (blink) {
    // ตาหลับเป็นรูปโค้งคว่ำ อ่านเป็น "หลับตายิ้ม" ไม่ใช่หลับตาเฉย ๆ
    ctx.strokeStyle = s.eye;
    ctx.lineWidth = 2;
    for (const ex of [-5, 7]) {
      ctx.beginPath(); ctx.arc(ex, 0, 3.2, Math.PI, 0, true); ctx.stroke();
    }
  } else if (mood === 'happy') {
    // ── ตาเป็นประกาย ──
    // ตาโตกว่าปกติ ไฮไลต์สองจุดคนละขนาด แล้วมีดาวประกายวิบอยู่มุมตา
    // สองจุดไม่เท่ากันสำคัญมาก ถ้าเท่ากันจะอ่านเป็นตากลมธรรมดาที่มีจุดขาว
    // ไม่ใช่ตาเป็นประกายแบบการ์ตูน
    const tw = performance.now() * 0.008;
    ctx.fillStyle = s.eye;
    ctx.beginPath(); ctx.arc(-5, -1, 3.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -1, 3.9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    for (const ex of [-5, 7]) {
      ctx.beginPath(); ctx.arc(ex + 1.3, -2.4, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex - 1.5, 0.7, 0.85, 0, Math.PI * 2); ctx.fill();
    }
    // ดาวสี่แฉกวิบ ๆ เหนือหางตาทั้งสองข้าง เต้นคนละจังหวะกัน
    // star4 ใช้ fillStyle ปัจจุบัน จึงต้องตั้งสีเองก่อนเรียก
    ctx.fillStyle = '#FFF3B0';
    for (const [ex, ph] of [[-9, 0], [11, 1.9]]) {
      const k = 0.45 + Math.abs(Math.sin(tw + ph)) * 0.55;
      star4(ctx, ex, -6, 2.2 * k);
    }
  } else if (mood === 'smug') {
    // ── ตาหยีแบบมั่นใจ ──
    // เปลือกตากดลงเหมือน sad แต่กดตื้นกว่าและไม่มีน้ำตา
    // ตาทำหน้าที่แค่ "ลดความตื่นเต้น" ให้ดูสบาย ๆ ส่วนอารมณ์สะใจจริง ๆ อยู่ที่ปาก
    ctx.fillStyle = s.eye;
    ctx.beginPath(); ctx.arc(-5, -0.5, 3.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -0.5, 3.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(-3.9, -1.6, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8.1, -1.6, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = s.cat;
    ctx.beginPath(); ctx.moveTo(-9, -4.6); ctx.lineTo(-1, -3.5); ctx.lineTo(-9, -2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(11, -4.6); ctx.lineTo(3, -3.5); ctx.lineTo(11, -2); ctx.fill();
  } else if (mood === 'starry') {
    // ── ตาเป็นประกาย ใช้ตอนลอยอยู่บนฟ้าช่วงโบนัส ──
    //
    // ต่างจาก happy สามอย่าง และทั้งสามอย่างจำเป็นหมด:
    //   1. ตาโตขึ้นอีก (4.6 จาก 3.9) — ตาโตคือสัญญาณ "ตื่นเต้น" ที่อ่านได้ไวที่สุด
    //   2. มีดาวอยู่ "ในตา" ไม่ใช่แค่ข้างตา — อันนี้แหละที่ทำให้อ่านเป็นตาเป็นประกาย
    //      แทนที่จะเป็นตากลมโตที่บังเอิญมีดาวลอยอยู่ข้าง ๆ
    //   3. ไฮไลต์สามจุดไล่ขนาดแทนสองจุด — จุดที่สามทำให้ตาดูฉ่ำเหมือนมีน้ำเคลือบ
    const tw = performance.now() * 0.008;
    ctx.fillStyle = s.eye;
    ctx.beginPath(); ctx.arc(-5, -1, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -1, 4.6, 0, Math.PI * 2); ctx.fill();
    for (const ex of [-5, 7]) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(ex + 1.6, -2.8, 1.95, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex - 2, 0.9, 1.05, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.arc(ex + 2.7, 1.5, 0.6, 0, Math.PI * 2); ctx.fill();
      // ดาวในตา เต้นคนละจังหวะกับดาวข้างตา จะได้ไม่วิบพร้อมกันทั้งหน้า
      ctx.fillStyle = '#FFF6C8';
      star4(ctx, ex - 0.7, -0.5, 1.45 + Math.abs(Math.sin(tw * 1.35)) * 0.55);
    }
    // ดาวรอบตาสี่ดวง คนละเฟสกันหมด หน้าจึงวิบวับตลอดโดยไม่มีจังหวะที่ดับพร้อมกัน
    ctx.fillStyle = '#FFF3B0';
    for (const [ex, ey, ph] of [[-10.5, -6.5, 0], [-8.5, 5.6, 2.4], [12.5, -6.5, 1.1], [10.5, 5.6, 3.3]]) {
      const k = 0.35 + Math.abs(Math.sin(tw + ph)) * 0.65;
      star4(ctx, ex, ey, 2.1 * k);
    }
  } else if (mood === 'hurt') {
    // ── ตาเบิก ──
    // ตกใจอ่านจาก "ขนาด" ล้วน ๆ ตาโตกว่าปกติหนึ่งเท่าครึ่งพร้อมตาขาวรอบนอก
    // ตาขาวสำคัญมาก ตาดำโตเฉย ๆ อ่านเป็นตาแป๋วน่ารัก ไม่ใช่ตกใจ
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(-5, -1.5, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -1.5, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = s.eye;
    ctx.beginPath(); ctx.arc(-5, -1, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -1, 2.6, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'tired') {
    // ── ตาปรือ ──
    // เปลือกตาบนกดลงเกินครึ่ง ลึกกว่า sad เพราะอันนี้คือ "จะหลับแล้ว" ไม่ใช่ "เสียใจ"
    // ไม่มีน้ำตา เพราะเหนื่อยกับเศร้าต้องแยกออกจากกันให้ได้ในหน้าเดียวกัน
    ctx.fillStyle = s.eye;
    ctx.beginPath(); ctx.arc(-5, 0.4, 2.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, 0.4, 2.9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = s.cat;
    ctx.beginPath(); ctx.moveTo(-9, -4.2); ctx.lineTo(-1, -1.4); ctx.lineTo(-9, 0.4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(11, -4.2); ctx.lineTo(3, -1.4); ctx.lineTo(11, 0.4); ctx.fill();
  } else if (mood === 'sad') {
    // ── ตาเศร้า ──
    // เปลือกตาบนกดลงมาปิดตาครึ่งบน อ่านเป็น "ตาปรือ" ซึ่งคือสัญญาณเศร้าที่ชัดที่สุด
    // ในหน้าที่ไม่มีคิ้วให้ขยับ
    ctx.fillStyle = s.eye;
    ctx.beginPath(); ctx.arc(-5, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(-3.9, -1.1, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8.1, -1.1, 1, 0, Math.PI * 2); ctx.fill();
    // เปลือกตาใช้สีขนทับลงไป จึงกลืนกับหน้าโดยไม่ต้องรู้ว่าสกินไหนสีอะไร
    ctx.fillStyle = s.cat;
    ctx.beginPath(); ctx.moveTo(-9, -4.4); ctx.lineTo(-1, -2.6); ctx.lineTo(-9, -0.6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(11, -4.4); ctx.lineTo(3, -2.6); ctx.lineTo(11, -0.6); ctx.fill();
    // หยดน้ำตาที่หางตาขวา ไหลลงช้า ๆ วนซ้ำ
    const fall = (performance.now() * 0.0016) % 1;
    ctx.globalAlpha = 1 - fall * 0.75;
    ctx.fillStyle = '#8FD6FF';
    ctx.beginPath(); ctx.ellipse(9.6, 2 + fall * 7, 1.3, 1.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = s.eye;
    ctx.beginPath(); ctx.arc(-5, -1, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -1, 3, 0, Math.PI * 2); ctx.fill();
    // ประกายตาเป็นจุดขาว — ข้ามตอนวาดแผนที่รหัสสี ไม่งั้นใจกลางตาทั้งสองข้าง
    // จะกลายเป็น "ไม่ใช่ส่วนไหนเลย" แล้วแตะตรงนั้นจะไม่เลือกอะไรขึ้นมา
    if (!s.solid) {
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.arc(-3.9, -2.1, 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(8.1, -2.1, 1.1, 0, Math.PI * 2); ctx.fill();
    }
  }

  // จมูก — สกินที่ไม่ได้ตั้ง nose ไว้ใช้ชมพูตามเดิม
  ctx.fillStyle = s.nose || s.pink;
  ctx.beginPath();
  ctx.moveTo(-2, 2.5); ctx.lineTo(4, 2.5); ctx.lineTo(1, 5.5);
  ctx.closePath(); ctx.fill();

  if (mouthOpen) {
    // อ้าปากกว้างตอนแม่เหล็กทำงาน — ช่องปากเข้มพร้อมลิ้น
    // วาดทับปากสีครีมได้เลย เพราะปากที่อ้าอยู่บังส่วนนั้นจริง ๆ
    ctx.fillStyle = s.ink;
    ctx.beginPath(); ctx.ellipse(1, 7.5, 6.8, 5.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = s.pink;
    ctx.beginPath(); ctx.ellipse(1, 10, 4.2, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'happy' || mood === 'starry') {
    // ยิ้มกว้างอ้าปาก — โค้งเดียวยาว ๆ แทนปาก ω สองโค้ง
    // ตอนตาเป็นประกายอ้ากว้างกว่าอีกนิด ให้เข้ากับตาที่โตขึ้น
    const w = mood === 'starry' ? 5.9 : 5;
    ctx.fillStyle = s.ink;
    ctx.beginPath(); ctx.ellipse(1, 7.6, w, 4.2, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = s.pink;
    ctx.beginPath(); ctx.ellipse(1, 10.2, w * 0.56, 1.7, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'hurt') {
    // อ้าปากกลมเล็ก ๆ แบบ "อุ๊ย" ไม่ใช่ปากกว้างแบบร้อง จะได้ยังน่ารักอยู่
    ctx.fillStyle = s.ink;
    ctx.beginPath(); ctx.ellipse(1, 7.4, 2.6, 3, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'tired') {
    // ── หอบ ──
    // ปากเปิดค้างพร้อมลิ้นห้อย เป็นภาพของ "หายใจไม่ทัน" ที่อ่านออกทันทีในหน้าสัตว์
    ctx.fillStyle = s.ink;
    ctx.beginPath(); ctx.ellipse(1, 7.4, 3.4, 2.6, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = s.pink;
    ctx.beginPath(); ctx.ellipse(1, 9.4, 2, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'smug') {
    // ── ยิ้มมุมเดียว ──
    // ปากสมมาตรอ่านเป็น "ดีใจ" ส่วนปากที่ยกขึ้นข้างเดียวอ่านเป็น "สะใจ"
    // ซึ่งเป็นคนละอารมณ์กัน และเป็นอันที่ตรงกับจังหวะพุ่งชนทุกอย่างได้โดยไม่เจ็บ
    ctx.strokeStyle = s.ink;
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3.4, 6.2);
    ctx.quadraticCurveTo(1.4, 9.8, 6.2, 5);
    ctx.stroke();
    // เขี้ยวเล็ก ๆ โผล่ที่มุมปากที่ยกขึ้น เติมความกวนอีกนิด
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(4.4, 6.2); ctx.lineTo(6.4, 6); ctx.lineTo(5.2, 8.2);
    ctx.closePath(); ctx.fill();
  } else if (mood === 'sad') {
    // ปากคว่ำ — โค้งกลับด้านกับปากปกติ
    ctx.strokeStyle = s.ink;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(1, 10.4, 3.4, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  } else {
    // ปากรูป ω
    ctx.strokeStyle = s.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-1.4, 6, 2.6, 0, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(3.4, 6, 2.6, 0, Math.PI); ctx.stroke();
  }

  // ── รูปหน้าที่ผู้เล่นอัปโหลด (Game Face) ────────────────────
  //
  // วาด "ทับ" หน้าเดิมทั้งชุด (ปากครีม แก้ม ตา จมูก ปาก) แทนที่จะไปใส่เงื่อนไข
  // ข้ามทีละบล็อก — รูปทึบและถูกตัดเป็นวงกลมรัศมีเท่าหัวพอดี ของที่อยู่ใต้มัน
  // จึงถูกกลบหมดอยู่แล้ว ข้อดีคือเพิ่มอารมณ์ใหม่ในอนาคตได้โดยไม่ต้องแตะโหมดรูปเลย
  // (เสียแรงวาดของที่มองไม่เห็นไปนิดหน่อย ซึ่งเป็นแค่วงรีไม่กี่วงต่อเฟรม)
  //
  // วางไว้ก่อนหนวดโดยตั้งใจ หนวดกับของสวมหัวจึงยังอยู่บนสุด
  // นั่นคือสิ่งที่ทำให้ยังอ่านออกว่าเป็น "น้องแมว" ไม่ใช่รูปคนกลม ๆ ลอยมา
  const face = noPhoto ? null : getFace();
  if (face) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.clip();
    // รูปที่บันทึกไว้เป็นสี่เหลี่ยมจัตุรัสอยู่แล้ว ยัดเต็มกรอบ 26x26 จึงพอดีวงกลมเป๊ะ
    ctx.drawImage(face, -13, -13, 26, 26);
    ctx.restore();
    // ขอบแสงต้องตีซ้ำ เพราะรูปเพิ่งทับของเดิมไป ถ้าไม่ตี หัวจะแบนเป็นสติกเกอร์กลม
    ctx.strokeStyle = 'rgba(255,252,240,.32)';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(0, 0, 11.9, -Math.PI * 0.6, Math.PI * 0.06); ctx.stroke();
  }

  // หนวด — สีมาจากสกิน เพราะหนวดครีมบนหน้าแมวขาวจะมองไม่เห็นเลย
  //
  // สี่เส้นอยู่ในพาธเดียว ไม่ได้แยก stroke ทีละเส้นเหมือนเดิม — ผลบนจอเท่ากันเป๊ะ
  // (แต่ละเส้นขึ้นต้นด้วย moveTo จึงไม่ต่อกัน) แต่ได้พาธก้อนเดียวไว้ส่งให้รอยแปรง
  // ใช้ซ้ำ ถ้าเขียนแยกกันสองที่ วันที่ใครขยับหนวด รอยแปรงจะไปทาผิดที่ทันที
  const whiskers = () => {
    ctx.beginPath();
    ctx.moveTo(-7, 4); ctx.lineTo(-16, 2);
    ctx.moveTo(-7, 6.5); ctx.lineTo(-16, 7.5);
    ctx.moveTo(9, 4); ctx.lineTo(18, 2);
    ctx.moveTo(9, 6.5); ctx.lineTo(18, 7.5);
  };
  ctx.strokeStyle = s.whisker;
  ctx.lineWidth = 1.4;
  whiskers(); ctx.stroke();

  // รอยแปรงบนหนวด — ทาทับเส้นหนวดที่เพิ่งวาด ไม่ใช่ทาใต้มันเหมือนของอื่นบนหัว
  // หนวดเป็นเส้นบาง ๆ ที่วาดทับทุกอย่างอยู่แล้ว ถ้าทาไว้ข้างใต้จะไม่มีวันโผล่ออกมา
  paintStroke(ctx, s, 'head', whiskers, 1.4);

  // ของสวมหัว (หมวก โบว์ แว่น) วาดท้ายสุดเพื่อให้ทับได้ทั้งหน้าและหู
  s.outfit?.head?.(ctx, s, { earsBack, scale });

  ctx.restore();
}

/**
 * แปลงสีทึบเป็นสีโปร่ง ใช้ทำขอบฟุ้งของหน้ากากแมวแต้ม
 * จำผลไว้เพราะถูกเรียกทุกเฟรม และชุดสีที่ใช้จริงมีอยู่ไม่กี่ชุด
 */
const fadeCache = new Map();
function fade(hex, a) {
  const key = hex + a;
  let v = fadeCache.get(key);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    fadeCache.set(key, v);
  }
  return v;
}

// ── เส้นขอบตัวละคร ──
// มีไว้เพราะวัดแล้วพบว่าไม่มีสีขนสีไหนอ่านออกได้ครบทุกฉาก
// ฉากในเกมไล่ตั้งแต่เกือบดำถึงเกือบขาว สีเรียบสีเดียวสู้สองปลายพร้อมกันไม่ได้เลย
// (รายละเอียดการวัดอยู่หัวไฟล์ skins.js)
//
// ── ความหนา ──
// เริ่มที่ 1.4 แล้วลดลงมา เพราะหนาขนาดนั้นเส้นเด่นเกินจนตัดตัวละครออกเป็นชิ้น ๆ
// หน้าที่ของเส้นนี้คือ "บอกขอบว่าตัวจบตรงไหน" เฉย ๆ ไม่ใช่ลุคการ์ตูนเส้นหนา
// 0.62 ยังทำงานได้เพราะสีมันเข้มกว่าขนมาก (วัดไว้อย่างน้อย 1.9 เท่า ดูหัว skins.js)
// ความคมของเส้นมาจากสีที่ต่างกันเยอะ ไม่ใช่จากความหนา
//
// ลดจาก 0.85 อีกขั้น — บนตัวขาวที่มีชุดสีสด เส้น 0.85 ยังอ่านเป็น "เส้นวาด"
// ไม่ใช่ "ขอบของตัว" โดยเฉพาะตรงที่เส้นวิ่งขนานกับขอบชุดจนเห็นเป็นสองเส้นคู่กัน
const CAT_EDGE = 0.62;

/**
 * วาดรอยแปรงที่ผู้เล่นระบายเอง ทับลงบนชิ้นหนึ่งของตัวละคร
 *
 * ── ทำไมต้อง clip ──
 * รอยแปรงถูกเก็บเป็นภาพสี่เหลี่ยมในพิกัดท้องถิ่นของชิ้นนั้น ถ้าวาดตรง ๆ สีจะล้นออก
 * นอกรูปทรงกลายเป็นแผ่นสี่เหลี่ยมลอยรอบตัว ตัดตามรูปทรงจริงของชิ้นก่อนเสมอ
 *
 * ── ทำไมรับ path มาเป็นฟังก์ชัน ──
 * แต่ละท่าตัวมีทรงไม่เท่ากัน (ยืนเป็นวงรีตั้ง หมอบเป็นวงรีแบน) ผู้เรียกรู้ทรงของ
 * ท่าตัวเองดีที่สุด ส่งเข้ามาแล้วที่นี่ไม่ต้องรู้จักท่าเลยสักท่า
 *
 * @param key   'body' หรือ 'head'
 * @param path  ฟังก์ชันที่ตั้ง path ของชิ้นนั้นไว้ (ยังไม่ต้อง fill/stroke)
 */
function paintOver(ctx, s, key, path) {
  const img = s.paint?.[key];
  if (!img || !img.width) return;
  const box = LAYER[key];
  ctx.save();
  path();
  ctx.clip();
  ctx.drawImage(img, box.x, box.y, box.w, box.h);
  ctx.restore();
}

/**
 * ทารอยแปรงลงบน "เส้น" เช่นหางกับขา
 *
 * ── ทำไมไม่ใช้ paintOver เหมือนลำตัว ──
 * paintOver ตัดด้วย clip() ซึ่งรับได้แค่รูปปิด ส่วนหางกับขาเป็นเส้นที่มีความหนา
 * ไม่ใช่รูปปิด จะ clip ตรง ๆ ไม่ได้ ต้องตีเส้นซ้ำด้วย "ลวดลาย" ที่สร้างจากภาพ
 * ชั้นรอยแปรงแทน แล้วเลื่อนลวดลายให้ตรงกับพิกัดตัวละครพอดี สีจึงไปโผล่ตรงที่
 * ผู้เล่นทาไว้จริง ๆ ไม่ใช่ทั้งเส้นเป็นสีเดียว
 */
function paintStroke(ctx, s, key, path, width) {
  const img = s.paint?.[key];
  if (!img || !img.width) return;
  const box = LAYER[key];
  const pat = ctx.createPattern(img, 'no-repeat');
  if (!pat) return;
  // ย่อภาพชั้นให้เท่ากรอบของชิ้น แล้วเลื่อนไปที่มุมกรอบ = ตรงกับที่ paintOver วาด
  pat.setTransform(new DOMMatrix([box.w / img.width, 0, 0, box.h / img.height, box.x, box.y]));
  ctx.save();
  ctx.strokeStyle = pat;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  path();
  ctx.stroke();
  ctx.restore();
}

/**
 * ตั้งปากกาขอบลำตัว "ก่อนใส่ชุด" ให้หนาเป็นสองเท่า
 *
 * ── ปัญหาที่แก้ ──
 * เดิมตีขอบปกติก่อน แล้วตีซ้ำอีกรอบ "ทับชุด" หลังใส่ชุดเสร็จ เพื่อไม่ให้ขอบตัวหาย
 * ตรงที่ชุดกินไปจนสุดขอบ แต่ชุดหลายชุดมีของที่วาด "นอกวงลำตัว" เช่นผ้าคลุมไหล่
 * ปลอกคอ ผ้าคาดเฉียง (ดู collar/sailorCollar ใน outfits.js ที่จงใจวาดนอก clipBody)
 * ของพวกนั้นจึงโดนเส้นวงรีลากพาดกลางชิ้น เห็นเป็นเส้นเกินที่ไม่ได้อยู่ในแบบของชุดเลย
 *
 * ── ทำไมหนาสองเท่าถึงแก้ได้ ──
 * เส้นขอบวาดคร่อมเส้นทาง ครึ่งอยู่ในตัว ครึ่งอยู่นอกตัว
 * ชุดถูก clip ให้อยู่ในวงลำตัวพอดี มันจึงกินได้แค่ "ครึ่งใน" เท่านั้น
 * ตีไว้หนาสองเท่าตั้งแต่แรก ครึ่งนอกที่เหลือรอดจึงหนาเท่ากับขอบปกติของน้องที่ไม่ใส่ชุด
 * ได้ขอบครบวงเหมือนเดิม โดยไม่ต้องเอาเส้นไปวาดทับชุดอีกเลย
 *
 * ผ้าคลุมที่ยื่นออกนอกวงจะบังขอบตรงนั้นไปเอง ซึ่งถูกต้อง — ผ้าคลุมทับตัวจริง ๆ
 */
function bodyEdgeUnder(ctx, s) {
  ctx.strokeStyle = s.line || s.dark;
  ctx.lineWidth = s.outfit?.body ? CAT_EDGE * 2 : CAT_EDGE;
}

/** ตั้งค่าปากกาสำหรับตีขอบ แล้วให้ผู้เรียก stroke() เอง (path ปัจจุบันยังอยู่หลัง fill) */
function catEdge(ctx, s) {
  ctx.strokeStyle = s.line || s.dark;
  ctx.lineWidth = CAT_EDGE;
}

/** หางโค้งพร้อมปลายครีม wag = -1..1 คุมการสะบัด */
/** fat = ความฟูของหาง 0 คือหางปกติ 1 คือขนพองเต็มที่ (ดูท่า puff) */
/** short = หดหางเข้าหาตัว 0 คือยาวเต็ม 1 คือหดจนหายไปในโคน */
function drawTail(ctx, x, y, wag, s, fat = 0, short = 0) {
  const len = 1 - short;
  const tipX = x - 19 * len;
  const tipY = y + (-12 + wag * 7) * len;
  const thick = 7 + fat * 3.4;

  // เส้นเข้มหนากว่ารองข้างใต้ = ขอบหาง (เหตุผลเดียวกับหางท่าหมอบ)
  ctx.strokeStyle = s.line || s.dark;
  ctx.lineWidth = thick + CAT_EDGE * 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 17 * len, y + (3 + wag * 5) * len, tipX, tipY);
  ctx.stroke();
  // ── หางของแมวแต้ม ──
  // ไล่จากสีตัวตรงโคนไปหาสีปลายขนภายในหนึ่งในสามแรก ที่เหลือเข้มยาวจนสุดปลาย
  // ต้องไล่ ไม่ใช่ตัดเป็นท่อน เพราะบนแมวจริงสีมัน "ซึม" เข้าหากัน ไม่มีเส้นแบ่ง
  // ปลายหางก็ต้องเข้มด้วย ถ้าปล่อยเป็นครีมตามสกินอื่นจะได้หางเข้มที่จู่ ๆ ปลายสว่าง
  if (s.points) {
    const g = ctx.createLinearGradient(x, y, tipX, tipY);
    g.addColorStop(0, s.cat);
    g.addColorStop(0.34, s.dark);
    g.addColorStop(1, s.dark);
    ctx.strokeStyle = g;
  } else {
    ctx.strokeStyle = s.cat;
  }
  ctx.lineWidth = thick;
  ctx.stroke();

  ctx.fillStyle = s.points ? s.dark : s.cream;
  ctx.beginPath(); ctx.arc(tipX, tipY, 3.6 + fat * 1.1, 0, Math.PI * 2); ctx.fill();
  catEdge(ctx, s); ctx.stroke();

  // รอยแปรงบนหาง — หางอยู่นอกวงรีลำตัว ถ้าไม่ทาตรงนี้จะระบายหางไม่ติดเลย
  paintStroke(ctx, s, 'body', () => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 17, y + 3 + wag * 5, tipX, tipY);
  }, 7);
  paintStroke(ctx, s, 'body', () => {
    ctx.beginPath(); ctx.arc(tipX, tipY, 3.6, 0, Math.PI * 2);
  }, 7);
}
