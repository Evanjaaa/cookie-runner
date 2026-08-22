// src/render/chest.js
// ─────────────────────────────────────────────────────────────
// หีบสมบัติของหน้าสุ่ม — วาดด้วยโค้ดล้วนเหมือนของทุกชิ้นในเกมนี้
//
// หน้าสุ่มสมบัติเดิมมีแต่ปุ่มลอยอยู่กลางแผงว่าง ๆ ไม่มีอะไรบอกว่ากำลังจะสุ่ม "อะไร"
// หีบทำหน้าที่สองอย่างพร้อมกัน: เติมที่ว่างตรงกลาง และเป็นตัวเล่าเรื่องว่า
// ของที่จะได้อยู่ในนั้น พอกดสุ่มมันจึงเปิดออกแล้วการ์ดค่อยโผล่มาแทน
//
// ทุกอย่างอิงกรอบ 200x184 ผู้เรียกย่อ-ขยายด้วย ctx.scale เอาเอง
// ─────────────────────────────────────────────────────────────

export const CHEST = { W: 200, H: 184 };

// ไล่จากม่วงเข้มขึ้นม่วงอ่อน ให้เข้ากับแผงที่มันไปนั่งอยู่
// ไม่ใช้น้ำตาลไม้จริง ๆ เพราะจะกลายเป็นก้อนสีโคลนบนพื้นม่วง
const WOOD_DARK = '#4A2A6B';
const WOOD = '#6B3F94';
const WOOD_LITE = '#8B57B8';
const GOLD = '#FFC93C';
const GOLD_DARK = '#D99A18';
const INSIDE = '#1A0E29';

const BODY = { x: 26, y: 92, w: 148, h: 62, r: 9 };
const LID = { x: 22, y: 52, w: 156, h: 46 };

/**
 * @param c    context ที่ scale มาให้พอดีกรอบ 200x184 แล้ว
 * @param open 0 = ปิดสนิท, 1 = เปิดสุด
 * @param tick ตัวนับเฟรม ใช้ทำแสงเต้นกับเพชรลอย
 */
export function drawChest(c, open = 0, tick = 0) {
  const o = Math.max(0, Math.min(1, open));

  c.save();

  // ── เงาใต้หีบ ──
  c.fillStyle = 'rgba(10,4,20,.45)';
  c.beginPath();
  c.ellipse(100, 158, 74, 11, 0, 0, Math.PI * 2);
  c.fill();

  drawFloatingGems(c, tick, o);

  // ── ลำแสงจากในหีบ ──
  // วาดก่อนตัวหีบ ให้ตัวหีบทับโคนลำแสงไว้ จะได้ดูเหมือนแสงลอดออกมาจากข้างใน
  // ไม่ใช่แผ่นสามเหลี่ยมแปะทับอยู่ข้างหน้า
  if (o > 0.15) drawBeam(c, o, tick);

  // ── ช่องว่างข้างใน ──
  c.fillStyle = INSIDE;
  c.beginPath();
  c.roundRect(BODY.x + 5, BODY.y - 6, BODY.w - 10, 24, 5);
  c.fill();

  drawBody(c);
  drawLid(c, o);

  c.restore();
}

function drawBody(c) {
  // ตัวหีบ ไล่สีจากบนลงล่างให้ดูเป็นทรงกระบอกนิด ๆ ไม่แบนเป็นสี่เหลี่ยม
  const g = c.createLinearGradient(0, BODY.y, 0, BODY.y + BODY.h);
  g.addColorStop(0, WOOD_LITE);
  g.addColorStop(0.45, WOOD);
  g.addColorStop(1, WOOD_DARK);
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(BODY.x, BODY.y, BODY.w, BODY.h, BODY.r);
  c.fill();

  // ร่องไม้แนวตั้ง บอกว่าเป็นแผ่นไม้ต่อกัน ไม่ใช่กล่องพลาสติกชิ้นเดียว
  c.strokeStyle = 'rgba(26,14,41,.34)';
  c.lineWidth = 1.6;
  for (const x of [62, 100, 138]) {
    c.beginPath();
    c.moveTo(x, BODY.y + 4);
    c.lineTo(x, BODY.y + BODY.h - 4);
    c.stroke();
  }

  // แถบเหล็กสองเส้น
  for (const x of [BODY.x + 20, BODY.x + BODY.w - 32]) {
    c.fillStyle = GOLD_DARK;
    c.beginPath();
    c.roundRect(x, BODY.y - 2, 12, BODY.h + 4, 3);
    c.fill();
    c.fillStyle = 'rgba(255,231,163,.45)';
    c.beginPath();
    c.roundRect(x + 2, BODY.y, 3.5, BODY.h, 2);
    c.fill();
  }

  // ขอบล่าง ให้หีบดูตั้งอยู่บนพื้นจริง ไม่ลอย
  c.fillStyle = GOLD_DARK;
  c.beginPath();
  c.roundRect(BODY.x - 3, BODY.y + BODY.h - 9, BODY.w + 6, 11, 4);
  c.fill();

  drawLock(c);
}

function drawLock(c) {
  const cx = 100;
  const cy = BODY.y + 15;

  c.fillStyle = GOLD;
  c.beginPath();
  c.roundRect(cx - 13, cy - 8, 26, 27, 5);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,.34)';
  c.beginPath();
  c.roundRect(cx - 10, cy - 5, 8, 20, 3);
  c.fill();

  // เพชรชมพูบนตัวล็อก = สกุลเงินที่ใช้เปิดหีบนี้ บอกด้วยภาพไม่ต้องมีคำอธิบาย
  c.fillStyle = '#FF8FB0';
  c.beginPath();
  c.moveTo(cx, cy + 1);
  c.lineTo(cx + 6, cy + 7);
  c.lineTo(cx, cy + 13);
  c.lineTo(cx - 6, cy + 7);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)';
  c.beginPath();
  c.moveTo(cx, cy + 3);
  c.lineTo(cx + 3, cy + 7);
  c.lineTo(cx, cy + 8);
  c.closePath();
  c.fill();
}

function drawLid(c, o) {
  c.save();

  // บานพับอยู่มุมหลังซ้าย ฝาจึงเปิดเบนไปทางซ้ายบน
  // เป็นท่าที่อ่านออกว่า "เปิดอยู่" ในภาพสองมิติโดยไม่ต้องวาดมุมมองสามมิติจริง
  c.translate(LID.x + 6, LID.y + LID.h);
  c.rotate(-o * 0.5);
  c.translate(-(LID.x + 6), -(LID.y + LID.h));
  c.translate(0, -o * 5);

  const g = c.createLinearGradient(0, LID.y, 0, LID.y + LID.h);
  g.addColorStop(0, WOOD_LITE);
  g.addColorStop(1, WOOD);
  c.fillStyle = g;

  // ฝาโค้งครึ่งวงรี ไม่ใช่สี่เหลี่ยม — หีบสมบัติในหัวคนเป็นฝาโค้งเสมอ
  c.beginPath();
  c.moveTo(LID.x, LID.y + LID.h);
  c.lineTo(LID.x, LID.y + LID.h - 8);
  c.quadraticCurveTo(LID.x, LID.y, 100, LID.y);
  c.quadraticCurveTo(LID.x + LID.w, LID.y, LID.x + LID.w, LID.y + LID.h - 8);
  c.lineTo(LID.x + LID.w, LID.y + LID.h);
  c.closePath();
  c.fill();

  // แถบเหล็กบนฝา ต่อแนวเดียวกับแถบบนตัวหีบตอนปิด
  c.save();
  c.clip();
  for (const x of [BODY.x + 20, BODY.x + BODY.w - 32]) {
    c.fillStyle = GOLD_DARK;
    c.fillRect(x, LID.y - 4, 12, LID.h + 8);
    c.fillStyle = 'rgba(255,231,163,.4)';
    c.fillRect(x + 2, LID.y - 4, 3.5, LID.h + 8);
  }
  c.restore();

  // ขอบล่างฝา
  c.fillStyle = GOLD;
  c.beginPath();
  c.roundRect(LID.x - 3, LID.y + LID.h - 10, LID.w + 6, 11, 4);
  c.fill();

  // แสงสะท้อนบนฝา
  c.fillStyle = 'rgba(255,255,255,.16)';
  c.beginPath();
  c.ellipse(72, LID.y + 15, 26, 8, -0.24, 0, Math.PI * 2);
  c.fill();

  c.restore();
}

function drawBeam(c, o, tick) {
  const a = (o - 0.15) / 0.85;
  const flicker = 0.86 + 0.14 * Math.sin(tick / 7);

  const g = c.createLinearGradient(0, BODY.y - 4, 0, BODY.y - 84);
  g.addColorStop(0, `rgba(255,231,163,${0.72 * a * flicker})`);
  g.addColorStop(1, 'rgba(255,231,163,0)');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(BODY.x + 16, BODY.y - 2);
  c.lineTo(BODY.x + BODY.w - 16, BODY.y - 2);
  c.lineTo(BODY.x + BODY.w + 22, BODY.y - 84);
  c.lineTo(BODY.x - 22, BODY.y - 84);
  c.closePath();
  c.fill();

  // ประกายในลำแสง ใช้ตำแหน่งตายตัวคูณเวลา ไม่ใช่ Math.random()
  // เพราะสุ่มใหม่ทุกเฟรมจะกลายเป็นจุดกะพริบมั่ว ๆ ไม่ใช่ประกายที่ลอยขึ้น
  for (let i = 0; i < 7; i++) {
    const p = ((tick / 46 + i / 7) % 1);
    const sx = 100 + Math.sin(i * 2.3) * 52;
    const sy = BODY.y - 6 - p * 74;
    const r = (1 - p) * 2.6 * a;
    if (r <= 0) continue;
    c.fillStyle = `rgba(255,243,226,${(1 - p) * 0.85 * a})`;
    c.beginPath();
    c.arc(sx, sy, r, 0, Math.PI * 2);
    c.fill();
  }
}

/** เพชรชมพูลอยรอบหีบ — บอกว่าหีบนี้เปิดด้วยเพชร ไม่ใช่ทอง */
function drawFloatingGems(c, tick, o) {
  const spots = [
    [34, 70, 1], [168, 62, 1.15], [22, 118, 0.85],
    [180, 112, 0.95], [150, 40, 0.75],
  ];
  spots.forEach(([x, y, s], i) => {
    const bob = Math.sin(tick / 34 + i * 1.7) * 5;
    const fade = 0.42 + 0.28 * Math.sin(tick / 26 + i);
    c.save();
    c.translate(x, y + bob);
    c.scale(s, s);
    c.globalAlpha = fade * (1 - o * 0.45);
    c.fillStyle = '#FF8FB0';
    c.beginPath();
    c.moveTo(0, -7); c.lineTo(6, 0); c.lineTo(0, 7); c.lineTo(-6, 0);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.6)';
    c.beginPath();
    c.moveTo(0, -4); c.lineTo(3, 0); c.lineTo(0, 1); c.closePath();
    c.fill();
    c.restore();
  });
}
