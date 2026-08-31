// src/render/entities.js
import { VIEW, GROUND_Y, BODY, SHRIMP, WORD, SKILL, COLORS as C } from '../config.js';

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

export function drawFish(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);

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

  ctx.restore();
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
export function drawSuction(ctx, player, tick) {
  const b = player.box;
  const cx = b.x + b.w / 2 + 14;
  const cy = b.y + b.h / 2 - 6;

  ctx.save();
  ctx.strokeStyle = C.mintLite;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    // แต่ละคลื่นวิ่งเข้าหาปากแล้ววนใหม่ เฟสห่างกันหนึ่งในสาม
    const p = ((tick * 0.035 + i / 3) % 1);
    const rad = 16 + p * 30;
    ctx.globalAlpha = (1 - p) * 0.55;
    ctx.lineWidth = 2.6 * (1 - p * 0.5);
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

/** ใบไม้กับดอกไม้สลับกันไป เลือกจากพิกัดจึงคงที่ตลอดอายุของเม็ดนั้น */
function rainLeaf(ctx, x, y, r, t, main, lite, dark) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.035 + x * 0.02) * 0.55);
  ctx.shadowColor = main;
  ctx.shadowBlur = 12;

  if (Math.floor(Math.abs(x) / 7) % 2) {
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

const RAIN_SHAPES = { leaf: rainLeaf, snow: rainSnow, coin: rainCoin };

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

    shape(ctx, x, d.y, r, t, main, lite, dark);
    if (glow) twinkle(ctx, x, d.y, r, t, glow);
  }
}

/**
 * หลอดความสามารถลอยเหนือหัวแมว
 * เต็มแล้วเปลี่ยนเป็นแถบเรืองแสงกะพริบ ให้รู้ทันทีว่ากำลังออกฤทธิ์อยู่
 */
export function drawSkillGauge(ctx, player, ratio, active, t) {
  const b = player.box;
  const x = b.x + b.w / 2 - SKILL.gaugeW / 2;
  const y = b.y - SKILL.gaugeUp;
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
export function drawLetterCoin(ctx, x, y, r, ch, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  // หมุนแกว่งเบา ๆ เหมือนเหรียญห้อยอยู่ ไม่ใช่ป้ายติดกลางอากาศ
  ctx.rotate(Math.sin(t * 0.045 + x * 0.01) * 0.14);

  ctx.save();
  ctx.shadowColor = 'rgba(199,125,255,.95)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = C.letter;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = C.letterLite;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = C.letter;
  ctx.lineWidth = r * 0.13;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = C.letterInk;
  ctx.font = `700 ${Math.round(r * 1.12)}px Mitr, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, 0, r * 0.06);

  ctx.restore();
}

export function drawLetters(ctx, letters, camera, tick) {
  for (const l of letters) {
    if (l.got) continue;
    const x = l.x - camera;
    if (x > W + 50 || x < -50) continue;
    drawLetterCoin(ctx, x, floatY(l, tick), l.r, WORD[l.idx], tick);
  }
}

// ── ปลาทองตัวใหญ่ที่พาไปโบนัส ────────────────────────────────

const FISH_BODY = '#FF9A3C';
const FISH_LITE = '#FFC983';
const FISH_BELLY = '#FFE3B8';
const FISH_FIN = 'rgba(255,176,102,.82)';
const FISH_FIN_EDGE = 'rgba(255,214,160,.9)';
const FISH_INK = '#7A3410';

/** หัวใจหนึ่งดวง ใช้เป็นตาของปลา */
function heartShape(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.5, y - s * 0.35, x - s * 0.55, y - s * 1.15, x, y - s * 0.32);
  ctx.bezierCurveTo(x + s * 0.55, y - s * 1.15, x + s * 1.5, y - s * 0.35, x, y + s * 0.9);
  ctx.fill();
}

/**
 * ปลาทองตัวใหญ่ วาดรอบจุด (x,y) = กลางลำตัว
 * r = ครึ่งความยาวลำตัว
 * dir = ทิศที่หันหน้า 1 คือขวา -1 คือซ้าย ส่งค่าทศนิยมได้ด้วย
 *       ค่าระหว่าง -1 ถึง 1 จะเห็นเป็นปลากำลังหมุนตัวกลับ
 */
export function drawBigFish(ctx, x, y, r, dir, t) {
  const wag = Math.sin(t * 0.1);
  // กันไม่ให้ scale เป็น 0 พอดี ซึ่งจะทำให้ path ทั้งก้อนยุบหายไปเฉย ๆ
  const face = Math.abs(dir) < 0.08 ? 0.08 * (dir < 0 ? -1 : 1) : dir;

  ctx.save();
  ctx.translate(x, y + Math.sin(t * 0.05) * r * 0.05);
  ctx.scale(face, 1);
  ctx.lineJoin = 'round';

  // ── หางพัด สะบัดตามจังหวะว่าย ──
  ctx.save();
  ctx.translate(-r * 0.76, 0);
  ctx.rotate(wag * 0.3);
  ctx.fillStyle = FISH_FIN;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-r * 0.45, s * r * 0.3, -r * 1.02, s * r * 0.8);
    ctx.quadraticCurveTo(-r * 0.66, s * r * 0.16, 0, 0);
    ctx.fill();
  }
  ctx.strokeStyle = FISH_FIN_EDGE;
  ctx.lineWidth = r * 0.035;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.08, 0);
    ctx.quadraticCurveTo(-r * 0.55, s * r * 0.26, -r * 0.92, s * r * 0.68);
    ctx.stroke();
  }
  ctx.restore();

  // ── ครีบหลัง ──
  ctx.fillStyle = FISH_FIN;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.5);
  ctx.quadraticCurveTo(-r * 0.05, -r * 1.02, r * 0.32, -r * 0.52);
  ctx.closePath();
  ctx.fill();

  // ── ครีบท้อง โบกช้ากว่าหางนิดหน่อย ──
  ctx.save();
  ctx.rotate(wag * 0.18);
  ctx.fillStyle = FISH_FIN;
  ctx.beginPath();
  ctx.ellipse(r * 0.06, r * 0.52, r * 0.3, r * 0.15, 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── ลำตัว ──
  ctx.fillStyle = FISH_BODY;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.66, 0, 0, Math.PI * 2);
  ctx.fill();

  // ท้องสว่าง วางเยื้องลงล่างเพื่อให้อ่านเป็นแสงจากด้านบน
  ctx.fillStyle = FISH_BELLY;
  ctx.beginPath();
  ctx.ellipse(r * 0.1, r * 0.24, r * 0.7, r * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  // เกล็ดเป็นส่วนโค้งซ้อนกัน ไม่ใช่จุดกลม จะได้อ่านเป็นเกล็ดจริง
  ctx.strokeStyle = 'rgba(210,105,30,.32)';
  ctx.lineWidth = r * 0.035;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-r * (0.12 + i * 0.26), 0, r * 0.34, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
  }

  // ครีบข้างลำตัว วาดทับตัวเพื่อให้ดูอยู่ด้านหน้า
  ctx.save();
  ctx.rotate(wag * 0.22);
  ctx.fillStyle = 'rgba(255,196,132,.9)';
  ctx.beginPath();
  ctx.ellipse(r * 0.26, r * 0.2, r * 0.26, r * 0.13, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── หน้า ──
  // แก้มชมพู วาดก่อนตาให้อยู่ชั้นล่างสุด
  ctx.fillStyle = 'rgba(255,120,150,.45)';
  ctx.beginPath();
  ctx.ellipse(r * 0.52, r * 0.14, r * 0.15, r * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  // ตาหัวใจ — ตัวที่ทำให้อ่านออกทันทีว่าปลาดีใจ
  ctx.fillStyle = '#FF4D6D';
  heartShape(ctx, r * 0.44, -r * 0.16, r * 0.17);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath();
  ctx.arc(r * 0.38, -r * 0.24, r * 0.045, 0, Math.PI * 2);
  ctx.fill();

  // ยิ้มแฉ่ง ปลายปากงอนขึ้นทั้งสองข้าง
  ctx.strokeStyle = FISH_INK;
  ctx.lineWidth = r * 0.06;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(r * 0.62, r * 0.02, r * 0.25, Math.PI * 0.12, Math.PI * 0.62);
  ctx.stroke();

  // ── ประกายรอบตัว บอกว่านี่คือของวิเศษไม่ใช่ปลาธรรมดา ──
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = FISH_LITE;
  for (let i = 0; i < 5; i++) {
    const a = t * 0.03 + (i / 5) * Math.PI * 2;
    const rad = r * (1.15 + Math.sin(t * 0.06 + i) * 0.12);
    const pulse = Math.abs(Math.sin(t * 0.07 + i * 1.6));
    ctx.globalAlpha = 0.25 + pulse * 0.6;
    star4(ctx, x + Math.cos(a) * rad, y + Math.sin(a) * rad * 0.62, r * (0.04 + pulse * 0.07));
  }
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

/** ประกายสี่แฉก — ของกลาง ใช้ทั้งของกิน เม็ดที่โปรยลงมา และออร่าชุด */
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
  ctx.scale(1 + Math.sin(tick * 0.09) * 0.06, 1 + Math.sin(tick * 0.09) * 0.06);

  // แสงเรืองสีแดง มองเห็นได้แต่ไกลตั้งแต่ยังไม่เข้าจอเต็มตัว
  ctx.save();
  ctx.shadowColor = 'rgba(255,92,110,.9)';
  ctx.shadowBlur = 20;
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

// ── ตัวละคร: แมวน้อย ─────────────────────────────────────────
// จุด (0,0) ของทุกฟังก์ชันข้างล่างคือ "กลางกล่องชน"
// ท่ายืน: เท้าอยู่ y=+23 หัวสุด y=-23  |  ท่าหมอบ: พื้นอยู่ y=+13
// ตัวเลขพวกนี้มาจาก BODY ใน config.js ถ้าแก้ที่นั่นต้องมาขยับที่นี่ด้วย
//
// ทุกฟังก์ชันรับ `s` = ชุดสีจาก skins.js ไม่มีสีแมวฝังตายในโค้ดวาดเลย
// แมวทุกตัวจึงใช้โครงเดียวกัน เพิ่มตัวใหม่ = เพิ่มจานสี ไม่ต้องวาดใหม่

export function drawPlayer(ctx, player, isDead, s, mouthOpen = false, dance = 0) {
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

  // ท่าเต้นตอนใช้ความสามารถ: ส่ายตัวแรงขึ้นและเด้งขึ้นลง
  // ทับลงบนท่าวิ่งเดิม ไม่ได้เขียนท่าใหม่ทั้งชุด จังหวะขาจึงยังตรงกับความเร็ววิ่ง
  ctx.translate(cx, cy - (dance ? Math.abs(Math.sin(dance * 0.3)) * 7 : 0));
  if (isDead) {
    ctx.rotate(player.tilt);
  } else {
    const base = player.onGround
      ? Math.sin(player.runPhase * 2) * 0.04
      : Math.max(-0.3, Math.min(0.3, player.vy * 0.016));
    ctx.rotate(base + (dance ? Math.sin(dance * 0.24) * 0.28 : 0));
  }

  const swing = Math.sin(player.runPhase * 2) * (player.onGround ? 1 : 0.25);
  ctx.lineCap = 'round';

  if (player.sliding) drawCatSlide(ctx, s, { isDead });
  else drawCatStand(ctx, s, { swing, wag: Math.sin(player.runPhase * 2 + 0.9), isDead });

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
 */
const IDLE_SHAPE = {
  stand: {},
  yawn: { mouth: 1, shut: 1, tilt: -0.1 },
  sit: { sit: 1 },
  groom: { sit: 1, paw: 1, tilt: 0.16, lick: 1 },
  loaf: { loaf: 1, shut: 1 },
};

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
  const tilt = (shape.tilt || 0) * k + lick * 0.05;
  const mouth = (shape.mouth || 0) * k;
  const shut = (shape.shut || 0) * k;

  ctx.save();
  // ตอนนั่ง/หมอบ ตัวลงไปติดพื้นแล้ว การหายใจขึ้นลงต้องเบาลงตาม ไม่งั้นดูเหมือนลอย
  const breath = Math.sin(t * 0.045) * 1.8 * (1 - sit * 0.5 - loaf * 0.75);
  ctx.translate(x, feetY - (BODY.standH / 2) * scale + breath);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  drawCatStand(ctx, s, {
    swing: 0,
    // หางแกว่งช้าลงเวลาพัก และแกว่งแรงขึ้นตอนหาว (เหมือนแมวยืดตัว)
    wag: Math.sin(t * (0.038 - loaf * 0.02)) * (1 - loaf * 0.45),
    blink: shut > 0.5 || t % 200 < 9,   // กะพริบสั้น ๆ ทุก ~3.3 วินาที
    mouthOpen: mouth > 0.5,
    sit,
    loaf,
    paw,
    tilt,
    lick,
  });
  ctx.restore();
}

/** เฉพาะหัว ใช้เป็นไอคอนในเมนู ซึ่งเล็กเกินกว่าจะเห็นรายละเอียดตัวเต็ม */
export function drawCatFace(ctx, x, y, scale, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  drawCatHead(ctx, 0, 0, s, {});
  ctx.restore();
}

function drawCatStand(ctx, s, {
  swing = 0, wag = 0, isDead = false, blink = false, mouthOpen = false,
  sit = 0, loaf = 0, paw = 0, tilt = 0, lick = 0,
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
  const cy = 6 + sit * 3 + loaf * 9;          // จุดกลางลำตัว — ยิ่งพัก ยิ่งลงไปติดพื้น
  const rx = 14 + sit * 1 + loaf * 4;         // ก้นผายตอนนั่ง แผ่กว้างตอนหมอบ
  const ry = 13 + sit * 0.5 - loaf * 4.5;     // หมอบแล้วแบนลง
  const hx = 1 + loaf * 2;
  const hy = -12 + sit * 2 + loaf * 10.5;     // หัวลงตามตัว

  // ── หาง ─────────────────────────────────────
  // โคนหางเลื่อนลงตามตัว ตอนหมอบขดมาข้างลำตัวแทนที่จะชี้ออกไปหลัง
  drawTail(ctx, -11 - loaf * 3, 8 + sit * 4 + loaf * 10, wag * (1 - loaf * 0.5), s);

  // ── ก้นตอนนั่ง ──────────────────────────────
  // วาดก่อนลำตัวเพื่อให้กลืนเป็นก้อนเดียวกัน ไม่ใช่ก้อนกลมแปะอยู่ข้าง ๆ
  if (sit > 0.02) {
    ctx.fillStyle = s.cat;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * (10 + sit), cy + 8 * sit, 7.5 * sit, 7 * sit, 0, 0, Math.PI * 2);
      ctx.fill();
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
    const hy0 = 13 + rest * 4;
    const hy1 = 24 - rest * 2;
    ctx.beginPath(); ctx.moveTo(-4, hy0); ctx.lineTo(-4 + swing * 10 * (1 - rest), hy1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, hy0); ctx.lineTo(6 - swing * 10 * (1 - rest), hy1); ctx.stroke();

    // แขนหุบเข้าและลดลงหาพื้น จนไปจบที่เดียวกับขาหน้าของท่านั่งพอดี
    ctx.lineWidth = 6;
    const ax0 = 8 - rest * 1.5;
    const ay0 = 3 + rest * 8;
    const ax1 = 16 - rest * 9;
    const ay1 = 3 + rest * 17;
    ctx.beginPath(); ctx.moveTo(-ax0, ay0); ctx.lineTo(-ax1, ay1 - swing * 8 * (1 - rest)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax0, ay0); ctx.lineTo(ax1, ay1 + swing * 8 * (1 - rest)); ctx.stroke();

    ctx.restore();
  }

  // ── ลำตัว ───────────────────────────────────
  ctx.fillStyle = s.cat;
  ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,252,240,.26)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, cy, rx - 1, ry - 1, 0, -Math.PI * 0.52, Math.PI * 0.08); ctx.stroke();

  // พุงสีครีม
  ctx.fillStyle = s.cream;
  ctx.beginPath(); ctx.ellipse(1, cy + 2.5 - loaf * 2, 8 - loaf * 0.5, 8 - loaf * 4, 0, 0, Math.PI * 2); ctx.fill();

  if (s.stripes) {
    ctx.strokeStyle = s.dark;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-10, cy - 8); ctx.lineTo(-11, cy - 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, cy - 10); ctx.lineTo(-7, cy - 5); ctx.stroke();
  }

  s.outfit?.body?.(ctx, s, 'stand');

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
      ctx.lineWidth = 6;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * 6.5, cy + 5);
        ctx.lineTo(sx * 7, 23);
        ctx.stroke();
      }
    }

    if (loaf > 0.02) {
      // หมอบ: ไม่มีขา เหลือแค่อุ้งเท้าสองข้างโผล่หน้าตัว
      ctx.fillStyle = s.cream;
      ctx.strokeStyle = s.dark;
      ctx.lineWidth = 1.6;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(sx * 9, cy + ry - 0.5, 5, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();   // ตีเส้นขอบบาง ๆ ให้แยกออกจากพุงที่เป็นสีครีมเหมือนกัน
      }
    }

    ctx.restore();
  }

  drawCatHead(ctx, hx, hy, s, { isDead, blink, mouthOpen, tilt });

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

function drawCatSlide(ctx, s, { isDead = false, mouthOpen = false } = {}) {
  s.outfit?.back?.(ctx, s, 'slide');

  // หางลากยาวไปข้างหลัง
  ctx.strokeStyle = s.cat;
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(-15, 2);
  ctx.quadraticCurveTo(-27, 1, -31, -7);
  ctx.stroke();
  ctx.fillStyle = s.cream;
  ctx.beginPath(); ctx.arc(-31, -7, 3.4, 0, Math.PI * 2); ctx.fill();

  // ขาหลังเหยียดไปหลัง
  ctx.strokeStyle = s.dark;
  ctx.lineWidth = 6.5;
  ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-23, 9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(-21, 12); ctx.stroke();

  // ลำตัวแบนราบ
  ctx.fillStyle = s.cat;
  ctx.beginPath(); ctx.ellipse(-2, 2, 19, 10, -0.08, 0, Math.PI * 2); ctx.fill();
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

  s.outfit?.body?.(ctx, s, 'slide');

  drawCatHead(ctx, 12, -4, s, { isDead, scale: 0.82, earsBack: true, mouthOpen });
}

/**
 * หัวแมวพร้อมหู หน้า หนวด — วาดรอบจุด (hx,hy) ที่ส่งเข้ามา
 * earsBack: ตอนหมอบต้องลู่หูไปหลัง ไม่งั้นปลายหูโผล่ทะลุคานตอนลอด
 */
function drawCatHead(ctx, hx, hy, s, { isDead = false, scale = 1, earsBack = false, blink = false, mouthOpen = false, tilt = 0 } = {}) {
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
  const ears = earsBack
    ? [[[-11, -4], [-5, -9], [-23, -9]], [[3, -8], [9, -10], [-8, -16]]]
    : [[[-13, -8], [-3, -8], [-14, -20]], [[3, -8], [13, -8], [14, -20]]];

  // หูนอก วาดก่อนหัวเพื่อให้โคนหูถูกกลบ
  ctx.fillStyle = s.cat;
  for (const [a, b, tip] of ears) {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(b[0], b[1]);
    ctx.closePath(); ctx.fill();
  }

  // หูชั้นใน ย่อเข้าหาจุดกึ่งกลางของหูแต่ละข้าง
  ctx.fillStyle = s.pink;
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
  ctx.fillStyle = s.cat;
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();

  // ขอบแสงด้านบนขวา รับกับแสงเรืองที่ขอบฟ้าซึ่งอยู่ทางขวาของจอ
  // ทำให้หัวหลุดออกจากพื้นหลังโดยไม่ต้องตีเส้นขอบทึบซึ่งจะดูเป็นการ์ตูนแบน
  ctx.strokeStyle = 'rgba(255,252,240,.32)';
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(0, 0, 11.9, -Math.PI * 0.6, Math.PI * 0.06); ctx.stroke();

  if (s.stripes) {
    ctx.strokeStyle = s.dark;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-5, -11); ctx.lineTo(-4, -6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1, -12); ctx.lineTo(2, -7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -10); ctx.lineTo(7, -6); ctx.stroke();
  }

  // ปากสีครีม
  ctx.fillStyle = s.cream;
  ctx.beginPath(); ctx.ellipse(1, 5, 7.5, 5, 0, 0, Math.PI * 2); ctx.fill();

  // แก้มชมพู วาดก่อนตาเพื่อให้อยู่ชั้นล่างสุดของใบหน้า
  if (s.blush) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = s.pink;
    ctx.beginPath(); ctx.ellipse(-9, 3, 3.6, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(11, 3, 3.6, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ตา
  if (isDead) {
    ctx.strokeStyle = s.ink;
    ctx.lineWidth = 2.2;
    for (const ex of [-5, 7]) {
      ctx.beginPath();
      ctx.moveTo(ex - 3, -4); ctx.lineTo(ex + 3, 2);
      ctx.moveTo(ex + 3, -4); ctx.lineTo(ex - 3, 2);
      ctx.stroke();
    }
  } else if (blink) {
    // ตาหลับเป็นรูปโค้งคว่ำ อ่านเป็น "หลับตายิ้ม" ไม่ใช่หลับตาเฉย ๆ
    ctx.strokeStyle = s.ink;
    ctx.lineWidth = 2;
    for (const ex of [-5, 7]) {
      ctx.beginPath(); ctx.arc(ex, 0, 3.2, Math.PI, 0, true); ctx.stroke();
    }
  } else {
    ctx.fillStyle = s.ink;
    ctx.beginPath(); ctx.arc(-5, -1, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -1, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';   // ประกายตา
    ctx.beginPath(); ctx.arc(-3.9, -2.1, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8.1, -2.1, 1.1, 0, Math.PI * 2); ctx.fill();
  }

  // จมูก
  ctx.fillStyle = s.pink;
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
  } else {
    // ปากรูป ω
    ctx.strokeStyle = s.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-1.4, 6, 2.6, 0, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(3.4, 6, 2.6, 0, Math.PI); ctx.stroke();
  }

  // หนวด — สีมาจากสกิน เพราะหนวดครีมบนหน้าแมวขาวจะมองไม่เห็นเลย
  ctx.strokeStyle = s.whisker;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-7, 4); ctx.lineTo(-16, 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-7, 6.5); ctx.lineTo(-16, 7.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9, 4); ctx.lineTo(18, 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9, 6.5); ctx.lineTo(18, 7.5); ctx.stroke();

  // ของสวมหัว (หมวก โบว์ แว่น) วาดท้ายสุดเพื่อให้ทับได้ทั้งหน้าและหู
  s.outfit?.head?.(ctx, s, { earsBack, scale });

  ctx.restore();
}

/** หางโค้งพร้อมปลายครีม wag = -1..1 คุมการสะบัด */
function drawTail(ctx, x, y, wag, s) {
  const tipX = x - 19;
  const tipY = y - 12 + wag * 7;

  ctx.strokeStyle = s.cat;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 17, y + 3 + wag * 5, tipX, tipY);
  ctx.stroke();

  ctx.fillStyle = s.cream;
  ctx.beginPath(); ctx.arc(tipX, tipY, 3.6, 0, Math.PI * 2); ctx.fill();
}
