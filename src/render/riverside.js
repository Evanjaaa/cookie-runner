// src/render/riverside.js
// ─────────────────────────────────────────────────────────────
// ฉากหน้าแรก "ริมแม่น้ำหน้าสะพานหลวง" (ผู้ใช้ 1 พ.ย. 2026) — ต่อกับแผนที่เมือง (town.html)
//
//   น้องยืนบนลานฝั่งนี้ของแม่น้ำ ตรงหัวสะพานหลวงที่ทอดข้ามน้ำไปหน้าประตูปราสาท
//   อีกฝั่ง = ปราสาทแมวเหมียว (ภาพเดียวกับในเมือง castle.js) ขนาบด้วยรั้วหลวงเสาหินหัวแมว + สวนหลวงหลังรั้ว
//   (ซากุระ ต้นไม้ตัดรูปแมว ต้นสน — ชุดเดียวกับข้างปราสาทในเมือง) · ไกลออกไป: บ้านแถวหลัง ต้นไม้ เนิน (world.js)
//   ผู้ใช้ 1 พ.ย. รอบ 2: ไม่โชว์ร้านค้าบนหน้าแรก — ข้างปราสาทเป็นรั้ว + ต้นไม้ตามแผนที่เมือง
//   ฟ้า เมฆ รุ้ง เรือเหาะหัวแมว แดด = ชุดสีเดียวกับเมือง · เรือพายน้องวิเชียรมาศลอยอยู่ในแม่น้ำ (play.js)
//   อนาคต: เข้าไปในปราสาทได้ (โซนในปราสาท)
//
// มุมมอง: มองตรงไปที่ปราสาท จุดลับตาอยู่กลางจอที่เส้นขอบฟ้า HZ — ของฝั่งนี้ใช้ความลึก z (1 = ขอบลานริมน้ำ)
//   จุดบนพื้น (xw, z) → จอ (CX + xw / z, HZ + (NEAR − HZ) / z) · ยิ่ง z มาก ยิ่งไกล เล็ก และสูงขึ้นหาเส้นขอบฟ้า
//   อีกฝั่งวาดด้วยฟังก์ชันของเมืองตรง ๆ แค่ย่อทั้งชุดลง FS เท่า วางฐานที่ FAR_Y
//
// แบ่งชั้นตามที่ game.drawHomeBackdrop เรียก (ชุดเดียวกับฉากอาณาจักรเดิม kingdom/index.js):
//   part 'far'  = ฟ้า แดด รุ้ง เมฆ เรือเหาะ เนิน บ้าน ต้นไม้ รั้ว สวน ปราสาท ถนนอีกฝั่ง (ขยับช้ามาก วาด ~4 ครั้ง/วิ)
//   part 'near' = ของสดบนปราสาท · น้ำ เงาสะท้อน คลื่น เรือ · สะพาน ลาน ราว โคม รูปปั้น (ภาพนิ่งแคชไว้) · แสงโคม
// ─────────────────────────────────────────────────────────────
import { VIEW } from '../config.js';
import { GY } from '../town/layout.js';
import { cached, lg, star, heart, ears, catFace, bush, flowers, drawClouds, drawHills, drawBackRow, drawMidTrees } from '../town/world.js';
import { drawCastleAt, drawRoyalLampAt, drawGuardAt, drawFenceAt, lampGlow } from '../town/castle.js';
import { drawBoat, BOAT_Y } from '../town/play.js';

const { W, H } = VIEW;
const TAU = Math.PI * 2;
const GOLD = '#E8C26A';

// ── มุมมอง ─────────────────────────────────────────────────────
const CX = W / 2;
const HZ = 188;                     // เส้นขอบฟ้า / จุดลับตา
const NEAR = 318;                   // ขอบลานริมน้ำฝั่งนี้ (z = 1) — ชิดเท้าน้อง (GROUND_Y 320) น้องจึงยืนตรงหัวสะพานพอดี
const P = (xw, z) => ({ x: CX + xw / z, y: HZ + (NEAR - HZ) / z });
const zAt = (y) => (NEAR - HZ) / (y - HZ);

// อีกฝั่งแม่น้ำ: ภาพเมืองย่อ FS เท่า ฐานอาคารที่ FAR_Y · ถนนหน้าอาคาร → ผนังตลิ่ง → น้ำ
const FAR_Y = 230, FS = 0.48;
const FAR_EDGE = 238;               // ขอบถนนอีกฝั่ง (ผนังตลิ่งเริ่ม)
const WATER_TOP = 247;              // ผิวน้ำชิดตลิ่งอีกฝั่ง
// รั้วหลวงสองข้างปราสาท: ปลายในสอดหลังหอมุมปราสาท ปลายนอกเลยขอบจอ · garden = ต้นไม้หลังรั้ว (ระยะจากปลายซ้ายของรั้ว หน่วยก่อนย่อ)
const FENCE_LEN = 680;
const FENCES = [
  { key: 'L', x: -24, garden: [['sakura', 58], ['cone', 148], ['topcat', 232], ['sakura', 326], ['cone', 418], ['topcat', 500], ['sakura', 588], ['cone', 664]] },
  { key: 'R', x: 984 - FENCE_LEN * FS, garden: [['cone', 16], ['sakura', 92], ['topcat', 180], ['cone', 262], ['sakura', 354], ['topcat', 448], ['cone', 532], ['sakura', 622]] },
];
const FAR_LAMPS = [{ x: 196, i: 0 }, { x: 764, i: 1 }];   // โคมหลวงหน้ารั้ว (อีกฝั่ง)

// สะพาน: ครึ่งกว้าง BR_HW (หน่วยของความลึก z = 1) · ปลายไกลแตะถนนอีกฝั่ง (z = BR_ZF)
const BR_HW = 175;
const BR_ZF = zAt(FAR_EDGE + 2);
const RAIL_H = 30;                  // ความสูงราวลูกกรง (z = 1)

// ของบนลาน: โคมหลวงหัวสะพาน · รูปปั้นแมวองครักษ์ริมน้ำ
const LAMPS = [{ xw: -206, z: 0.98, i: 1 }, { xw: 206, z: 0.98, i: 0 }];
const GUARDS = [{ xw: -322, z: 0.96, d: -1 }, { xw: 322, z: 0.96, d: 1 }];
const LAMP_S = 1;

// ── ชั้นไกล ───────────────────────────────────────────────────
function sky(c, extTop, t) {
  c.fillStyle = lg(c, 0, 0, 0, H, [[0, '#BCD8FF'], [0.45, '#E2D8FF'], [1, '#FFE9F3']]);
  c.fillRect(0, -extTop, W, H + extTop);
  const sx = W * 0.8, sy = 64;
  const sg = c.createRadialGradient(sx, sy, 8, sx, sy, 90);
  sg.addColorStop(0, 'rgba(255,250,220,.95)');
  sg.addColorStop(0.35, 'rgba(255,236,190,.45)');
  sg.addColorStop(1, 'rgba(255,236,190,0)');
  c.fillStyle = sg;
  c.beginPath(); c.arc(sx, sy, 90, 0, TAU); c.fill();
  // รุ้งโค้งหลังปราสาท
  c.save();
  c.globalAlpha = 0.3;
  c.lineWidth = 7;
  ['#FF9CC0', '#FFD45A', '#9FE0A8', '#9FD3FF', '#C8A8F5'].forEach((col, i) => {
    c.strokeStyle = col;
    c.beginPath(); c.arc(CX, 262, 205 - i * 7, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
  });
  c.restore();
  // เรือเหาะหัวแมว (ลอยช้า ๆ ข้ามฟ้า — หลังปราสาท)
  const span = W + 500;
  const ax = ((t * 0.06 + 300) % span + span) % span - 250, ay = 92 + Math.sin(t * 0.02) * 5;
  c.save();
  c.translate(ax, ay);
  c.scale(0.62, 0.62);
  ears(c, 0, -20, 22, 10, '#F3E6FF', '#FFC9D4');
  c.fillStyle = '#F3E6FF';
  c.beginPath(); c.ellipse(0, 0, 44, 26, 0, 0, TAU); c.fill();
  catFace(c, 6, 2, 16, true, '#8C6AD6');
  c.strokeStyle = '#B79CF0'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(-14, 24); c.lineTo(-10, 36); c.moveTo(14, 24); c.lineTo(10, 36); c.stroke();
  c.fillStyle = '#C9A0E6';
  c.beginPath(); c.roundRect(-16, 34, 32, 10, 4); c.fill();
  c.restore();
}

/**
 * แนวต้นไม้ใหญ่หลังสวนหลวง สองข้างปราสาท — ทรงเดียวกับต้นไม้ในเมือง (drawMidTrees: ลำต้นน้ำตาล พุ่มกลมสามก้อน / สนสามชั้น)
 * สูงพ้นสวนหน้ารั้วขึ้นมา ข้างปราสาทจึงร่มรื่น ไม่โล่ง และบังบ้านแถวหลังไว้ (หน้าแรกไม่โชว์ร้าน/บ้าน — ผู้ใช้ 1 พ.ย.)
 * [x, สเกล, ชนิด] ชนิด 0 เขียว · 1 สน · 2 ชมพู (ซากุระ) · 3 เขียวอ่อน
 */
const TREE_LINE = [
  [14, 1.35, 0], [52, 1.15, 2], [92, 1.45, 1], [132, 1.25, 3], [170, 1.4, 0], [210, 1.1, 2], [248, 1.3, 1], [284, 1.2, 0],
  [676, 1.2, 0], [712, 1.3, 1], [750, 1.1, 2], [790, 1.4, 0], [828, 1.25, 3], [868, 1.45, 1], [908, 1.15, 2], [946, 1.35, 0],
];
function treeLine(c) {
  const base = FAR_Y - 6;
  for (const [x, s, k] of TREE_LINE) {
    c.fillStyle = '#A97B5A';
    c.fillRect(x - 3 * s, base - 40 * s, 6 * s, 40 * s);
    if (k === 1) {
      c.fillStyle = '#8FCB9A';
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(x - (24 - i * 5) * s, base - (30 + i * 18) * s);
        c.lineTo(x, base - (62 + i * 18) * s);
        c.lineTo(x + (24 - i * 5) * s, base - (30 + i * 18) * s);
        c.closePath(); c.fill();
      }
    } else {
      c.fillStyle = k === 2 ? '#FFCDE2' : k === 3 ? '#B9E3A6' : '#A3DCA6';
      c.beginPath();
      c.arc(x, base - 52 * s, 22 * s, 0, TAU); c.arc(x - 14 * s, base - 40 * s, 16 * s, 0, TAU); c.arc(x + 14 * s, base - 40 * s, 16 * s, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,.25)';
      c.beginPath(); c.arc(x - 6 * s, base - 60 * s, 8 * s, 0, TAU); c.fill();
    }
  }
  // หมอกบาง ๆ ดันแนวต้นไม้ถอยไปอยู่หลังสวน (ใกล้กว่าเนิน/บ้าน ไกลกว่ารั้ว)
  c.fillStyle = lg(c, 0, base - 110, 0, base, [[0, 'rgba(236,228,255,.3)'], [1, 'rgba(236,228,255,.12)']]);
  c.fillRect(0, base - 110, W, 110);
}

/** อีกฝั่งแม่น้ำ: เนิน บ้านแถวหลัง ต้นไม้ (ฟังก์ชันของเมือง ย่อทั้งชุด) → สวน + รั้วหลวง → ปราสาท → โคม → ถนน → ผนังตลิ่ง */
function farBank(c, t) {
  c.save();
  c.translate(0, FAR_Y);
  c.scale(FS, FS);
  c.translate(0, -GY);
  const vw = W / FS, camX = 140;
  drawHills(c, camX, vw, t);
  drawBackRow(c, camX, vw);
  drawMidTrees(c, camX, vw);
  c.restore();
  treeLine(c);
  for (const f of FENCES) drawFenceAt(c, f.key, f.x, FAR_Y, FS, FENCE_LEN, f.garden);
  drawCastleAt(c, CX, FAR_Y, FS, t, 'art');
  for (const l of FAR_LAMPS) drawRoyalLampAt(c, l.x, FAR_Y + 1, FS, l.i);
  // ถนนหลวงอีกฝั่ง: กระเบื้องลาเวนเดอร์/ขาวมุก ขอบทอง ตลอดแนว (ทั้งฝั่งคือดินแดนปราสาท)
  c.fillStyle = lg(c, 0, FAR_Y, 0, FAR_EDGE, [[0, '#F5EAFC'], [1, '#E3D0F2']]);
  c.fillRect(0, FAR_Y - 1, W, FAR_EDGE - FAR_Y + 1);
  for (let x = 4, i = 0; x < W; x += 20, i++) {
    c.fillStyle = i % 2 ? 'rgba(255,255,255,.75)' : 'rgba(208,182,238,.6)';
    c.beginPath(); c.roundRect(x, FAR_Y + 1.5, 16, 2.6, 1.3); c.fill();
    c.fillStyle = i % 2 ? 'rgba(208,182,238,.6)' : 'rgba(255,255,255,.75)';
    c.beginPath(); c.roundRect(x + 10, FAR_Y + 5, 16, 2.6, 1.3); c.fill();
  }
  c.fillStyle = GOLD;
  c.fillRect(0, FAR_Y + 0.5, W, 1);
  c.fillRect(0, FAR_EDGE - 1.6, W, 1);
  // ผนังตลิ่ง (หน้าหินลาเวนเดอร์หันมาทางเรา) + เงาน้ำใต้ตลิ่ง
  c.fillStyle = '#E2D2F2';
  c.fillRect(0, FAR_EDGE, W, 2);
  c.fillStyle = lg(c, 0, FAR_EDGE + 2, 0, WATER_TOP, [[0, '#BBA7DA'], [1, '#9C86C4']]);
  c.fillRect(0, FAR_EDGE + 2, W, WATER_TOP - FAR_EDGE - 2);
  c.fillStyle = 'rgba(90,60,140,.22)';
  for (let x = 0; x < W; x += 16) c.fillRect(x, FAR_EDGE + 2, 1, WATER_TOP - FAR_EDGE - 2);
}

// ── น้ำ ────────────────────────────────────────────────────────
function water(c, t) {
  const y0 = WATER_TOP, y1 = NEAR + 2;
  c.save();
  c.beginPath(); c.rect(0, y0, W, y1 - y0); c.clip();
  c.fillStyle = lg(c, 0, y0, 0, y1, [[0, '#8CC8F0'], [0.55, '#76BAEC'], [1, '#5CA7E2']]);
  c.fillRect(0, y0, W, y1 - y0);
  // เงาสะท้อนปราสาท/รั้ว (กลับหัว บีบแนวตั้ง จาง ๆ ไหววูบนิดหนึ่ง)
  c.save();
  c.globalAlpha = 0.2;
  c.translate(Math.sin(t * 0.03) * 1.2, y0);
  c.scale(1, -0.5);
  c.translate(0, -y0);
  drawCastleAt(c, CX, FAR_Y, FS, t, 'still');
  for (const f of FENCES) drawFenceAt(c, f.key, f.x, FAR_Y, FS, FENCE_LEN, f.garden);
  c.restore();
  // ใกล้ตาน้ำทึบขึ้น เงาสะท้อนจางหาย
  c.fillStyle = lg(c, 0, y0, 0, y1, [[0, 'rgba(134,199,240,0)'], [0.75, 'rgba(118,190,238,.55)'], [1, 'rgba(106,180,234,.8)']]);
  c.fillRect(0, y0, W, y1 - y0);
  // แสงแดดสะท้อนเป็นทางใต้ดวงอาทิตย์
  c.fillStyle = lg(c, W * 0.8 - 60, 0, W * 0.8 + 60, 0, [[0, 'rgba(255,250,225,0)'], [0.5, 'rgba(255,250,225,.28)'], [1, 'rgba(255,250,225,0)']]);
  c.fillRect(W * 0.8 - 60, y0, 120, y1 - y0);
  // คลื่นไหลไปทางขวา — แถวไกลสั้น/ช้า แถวใกล้ยาว/เร็ว
  c.strokeStyle = 'rgba(255,255,255,.6)';
  c.lineCap = 'round';
  for (let j = 0; j < 8; j++) {
    const z = BR_ZF - 0.05 - j * 0.105;
    const s = 1 / z, y = HZ + (NEAR - HZ) * s;
    if (y < y0 + 2 || y > y1 - 2) continue;
    const gap = 74 * s, len = 15 * s;
    const off = ((t * 0.32 * s + j * 41) % gap + gap) % gap;
    c.lineWidth = 1.1 + 0.7 * s;
    c.beginPath();
    for (let x = off - gap + (j % 2) * gap * 0.5; x < W + gap; x += gap) { c.moveTo(x, y); c.lineTo(x + len, y); }
    c.stroke();
  }
  // ประกายระยิบ
  c.fillStyle = '#FFFFFF';
  for (let i = 0; i < 14; i++) {
    const a = Math.sin(t * 0.06 + i * 2.3);
    if (a < 0.55) continue;
    const x = (i * 157 + 40) % W, y = y0 + 6 + ((i * 53) % (y1 - y0 - 10));
    c.globalAlpha = (a - 0.55) * 2;
    star(c, x, y, 1.4 + (a - 0.55) * 5); c.fill();
  }
  c.globalAlpha = 1;
  // เงาสะพานบนน้ำ (แดดจากขวาบน → เงาตกซ้ายของสะพานมากกว่า)
  for (const [side, k] of [[-1, 26], [1, 10]]) {
    const a = P(side * BR_HW, 1), b = P(side * BR_HW, BR_ZF);
    c.fillStyle = 'rgba(60,90,150,.16)';
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(b.x + side * k * 0.55, b.y); c.lineTo(a.x + side * k, a.y); c.closePath(); c.fill();
  }
  // ใบบัวกับดอกบัวริมตลิ่งฝั่งนี้
  for (const [x, y, s, f] of [[140, 306, 1.1, 1], [204, 311, 0.85, 0], [752, 309, 0.95, 1], [826, 303, 1.1, 0], [104, 296, 0.75, 0], [880, 312, 0.8, 1]]) {
    const bob = Math.sin(t * 0.03 + x) * 0.8;
    c.fillStyle = '#7FCB8C';
    c.beginPath(); c.ellipse(x, y + bob, 17 * s, 4.6 * s, 0, 0.3, TAU - 0.3); c.lineTo(x, y + bob); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.25)';
    c.beginPath(); c.ellipse(x - 5 * s, y - 1 + bob, 6 * s, 1.4 * s, 0, 0, TAU); c.fill();
    if (f) {
      c.fillStyle = '#FFB5CF';
      for (const q of [-0.6, 0, 0.6]) { c.beginPath(); c.ellipse(x + 7 * s + q * 6 * s, y - 5 * s + bob, 3 * s, 6 * s, q, 0, TAU); c.fill(); }
      c.fillStyle = '#FFE680';
      c.beginPath(); c.arc(x + 7 * s, y - 4 * s + bob, 1.6 * s, 0, TAU); c.fill();
    }
  }
  // เรือพายน้องวิเชียรมาศ (ตัวเดียวกับในเมือง) ลอยรอส่งอยู่ฝั่งซ้าย
  c.save();
  c.translate(214, 290);
  c.scale(0.56, 0.56);
  c.translate(0, -BOAT_Y);
  drawBoat(c, 0, 1, t, null, false);
  c.restore();
  c.restore();
}

// ── ของฝั่งนี้ (ภาพนิ่ง — แคชทั้งชั้น) ────────────────────────────
/** พื้นลานริมน้ำ: กระเบื้องหลวงขาวมุก/ลาเวนเดอร์ในมุมมอง เม็ดทองตรงมุม · ขอบหินริมน้ำ */
function plaza(c, bottom) {
  c.fillStyle = lg(c, 0, NEAR, 0, bottom, [[0, '#CDB4EA'], [1, '#B99CDE']]);
  c.fillRect(0, NEAR, W, bottom - NEAR);
  const zs = [];
  for (let z = 1; ; z *= 0.89) { zs.push(z); if (HZ + (NEAR - HZ) / z > bottom) break; }
  const TW = 58;
  for (let r = 0; r < zs.length - 1; r++) {
    const za = zs[r], zb = zs[r + 1];
    const n = Math.ceil((W / 2) * za / TW) + 1;
    for (let k = -n; k < n; k++) {
      const a = P(k * TW, za), b = P((k + 1) * TW, za), d = P(k * TW, zb), e = P((k + 1) * TW, zb);
      const g = 1.4 / za;   // ร่องกระเบื้องกว้างขึ้นเมื่อใกล้ตา
      c.fillStyle = (k + r) % 2 ? '#F1E3F8' : '#D2BBEE';
      c.beginPath();
      c.moveTo(a.x + g, a.y + g * 0.6); c.lineTo(b.x - g, b.y + g * 0.6);
      c.lineTo(e.x - g, e.y - g * 0.6); c.lineTo(d.x + g, d.y - g * 0.6);
      c.closePath(); c.fill();
      if ((k + r) % 2 === 0) {
        c.fillStyle = GOLD;
        c.beginPath(); c.arc(a.x, a.y, 1.5 / za, 0, TAU); c.fill();
      }
    }
  }
  // เงาจาง ๆ ใต้ขอบหิน
  c.fillStyle = lg(c, 0, NEAR, 0, NEAR + 18, [[0, 'rgba(110,70,120,.18)'], [1, 'rgba(110,70,120,0)']]);
  c.fillRect(0, NEAR, W, 18);
  // ขอบหินริมน้ำ (เว้นช่องหัวสะพาน)
  const L = P(-BR_HW, 1).x, R = P(BR_HW, 1).x;
  for (const [x0, x1] of [[-10, L], [R, W + 10]]) {
    c.fillStyle = lg(c, 0, NEAR - 3, 0, NEAR + 5, [[0, '#FFFFFF'], [1, '#E2D2F2']]);
    c.fillRect(x0, NEAR - 3, x1 - x0, 8);
    c.fillStyle = GOLD;
    c.fillRect(x0, NEAR + 4, x1 - x0, 1.6);
  }
}

/** พรมชมพูขอบทองจากล่างจอ → ข้ามสะพาน → หน้าประตูปราสาท (ตัวน้องยืนบนพรม) */
function carpet(c, bottom) {
  const zb = zAt(bottom), HW = 58;
  const q = (hw, z0, z1) => { const a = P(-hw, z0), b = P(hw, z0), d = P(hw, z1), e = P(-hw, z1); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.lineTo(e.x, e.y); c.closePath(); };
  c.fillStyle = GOLD;
  q(HW + 5, zb, BR_ZF); c.fill();
  c.fillStyle = lg(c, 0, P(0, BR_ZF).y, 0, bottom, [[0, '#FFB3CF'], [0.5, '#FF9CC0'], [1, '#EE6E9E']]);
  q(HW, zb, BR_ZF); c.fill();
  // เส้นทองคู่ด้านใน
  c.strokeStyle = 'rgba(255,229,138,.85)';
  for (const d of [-1, 1]) {
    const a = P(d * (HW - 7), zb), b = P(d * (HW - 7), BR_ZF);
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  }
  // รอยเท้าแมวขาวเรียงขึ้นสะพาน
  c.fillStyle = 'rgba(255,255,255,.45)';
  for (let z = 0.5, i = 0; z < BR_ZF; z *= 1.16, i++) {
    const p = P((i % 2 ? 16 : -16), z), s = 1 / z;
    c.beginPath(); c.ellipse(p.x, p.y, 7 * s, 4.2 * s, 0, 0, TAU); c.fill();
    for (const [dx, dy] of [[-7, -5], [-2.5, -8], [2.5, -8], [7, -5]]) { c.beginPath(); c.ellipse(p.x + dx * s, p.y + dy * s * 0.62, 2.2 * s, 1.6 * s, 0, 0, TAU); c.fill(); }
  }
}

/** พื้นสะพาน: หินขาวมุกขอบทอง ทอดจากหัวสะพาน (z = 1) ไปถนนอีกฝั่ง (BR_ZF) */
function deck(c) {
  const a = P(-BR_HW, 1), b = P(BR_HW, 1), d = P(BR_HW, BR_ZF), e = P(-BR_HW, BR_ZF);
  c.fillStyle = lg(c, 0, e.y, 0, a.y, [[0, '#D9C6EF'], [1, '#E8DAF6']]);
  c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.lineTo(e.x, e.y); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(150,110,190,.4)';
  c.lineWidth = 1;
  for (let z = 1.1; z < BR_ZF; z += 0.11) {
    const l = P(-BR_HW, z), r = P(BR_HW, z);
    c.beginPath(); c.moveTo(l.x, l.y); c.lineTo(r.x, r.y); c.stroke();
  }
  // ขอบทองสองข้าง
  c.fillStyle = GOLD;
  for (const s of [-1, 1]) {
    const p0 = P(s * BR_HW, 1), p1 = P(s * BR_HW, BR_ZF), q0 = P(s * (BR_HW - 6), 1), q1 = P(s * (BR_HW - 6), BR_ZF);
    c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.lineTo(q1.x, q1.y); c.lineTo(q0.x, q0.y); c.closePath(); c.fill();
  }
}

/** ราวลูกกรงสะพาน (มองเฉียงจากด้านใน) — เสาหัวบัวทอง · ลูกกรงขาว · แถบชมพูมีหัวใจ */
function bridgeRail(c, side) {
  const xw = side * BR_HW;
  const at = (z, h) => { const p = P(xw, z); return { x: p.x, y: p.y - (h * RAIL_H) / z }; };
  // ผนังราว (พื้นหลังลูกกรง) — ไล่สีจาง ๆ ให้เห็นเป็นแผ่น
  const n0 = at(1, 0), n1 = at(1, 1), f0 = at(BR_ZF, 0), f1 = at(BR_ZF, 1);
  c.fillStyle = 'rgba(255,240,250,.35)';
  c.beginPath(); c.moveTo(n0.x, n0.y); c.lineTo(n1.x, n1.y); c.lineTo(f1.x, f1.y); c.lineTo(f0.x, f0.y); c.closePath(); c.fill();
  // ลูกกรง
  for (let z = 1.02; z < BR_ZF; z *= 1.035) {
    const b = at(z, 0.08), t = at(z, 0.8), s = 1 / z;
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = 3.4 * s;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(t.x, t.y); c.stroke();
    c.strokeStyle = 'rgba(150,110,190,.35)';
    c.lineWidth = 1 * s;
    c.beginPath(); c.moveTo(b.x + side * 1.2 * s, b.y); c.lineTo(t.x + side * 1.2 * s, t.y); c.stroke();
  }
  // แถบชมพูกลางราว + ราวบนขาวขอบทอง
  const band = (h0, h1, col) => {
    const a = at(1, h0), b = at(1, h1), d = at(BR_ZF, h1), e = at(BR_ZF, h0);
    c.fillStyle = col;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.lineTo(e.x, e.y); c.closePath(); c.fill();
  };
  band(0.42, 0.56, 'rgba(255,143,179,.85)');
  band(0.84, 1, '#FFFFFF');
  band(0.8, 0.86, GOLD);
  band(0, 0.08, '#E2D2F2');
  // เสาหัวบัวทอง
  for (let z = 1; z <= BR_ZF + 0.01; z += (BR_ZF - 1) / 4) {
    const b = at(z, 0), t = at(z, 1.12), s = 1 / z;
    c.fillStyle = lg(c, b.x - 6 * s, 0, b.x + 6 * s, 0, [[0, '#EBDDFB'], [0.5, '#FFFFFF'], [1, '#E2D0F2']]);
    c.beginPath(); c.roundRect(b.x - 5.5 * s, t.y, 11 * s, b.y - t.y, 2 * s); c.fill();
    c.fillStyle = GOLD;
    c.fillRect(b.x - 6 * s, t.y + 3 * s, 12 * s, 2 * s);
    c.beginPath(); c.moveTo(b.x - 5 * s, t.y); c.quadraticCurveTo(b.x - 5 * s, t.y - 7 * s, b.x, t.y - 11 * s); c.quadraticCurveTo(b.x + 5 * s, t.y - 7 * s, b.x + 5 * s, t.y); c.closePath(); c.fill();
    c.fillStyle = '#FF8FB3';
    heart(c, b.x, (b.y + t.y) / 2 + 2 * s, 2.6 * s); c.fill();
  }
}

/**
 * ขอบริมน้ำฝั่งนี้ (หน้าตรง) ช่วง x0..x1 — กำแพงเตี้ยหินขาวขอบทอง · เสาหัวบัวทอง · พวงมาลัยดอกไม้ห้อยระหว่างเสา
 * เตี้ยกว่าราวสะพานมาก — ราวสูงเต็มที่บังแม่น้ำจนเหลือแต่ลูกกรง (ลองแล้วรอบแรก) ต้องเห็นน้ำเต็มตาว่ายืนอยู่ริมแม่น้ำ
 */
function parapet(c, x0, x1) {
  const base = NEAR + 4, top = base - 9;
  c.fillStyle = lg(c, 0, top, 0, base, [[0, '#FFFFFF'], [1, '#DCC8EE']]);
  c.beginPath(); c.roundRect(x0, top, x1 - x0, base - top, 3); c.fill();
  c.fillStyle = GOLD;
  c.fillRect(x0, top + 2.5, x1 - x0, 1.6);
  const n = Math.max(1, Math.round((x1 - x0) / 96));
  const xs = Array.from({ length: n + 1 }, (_, i) => x0 + 8 + ((x1 - x0 - 16) * i) / n);
  // พวงมาลัยโค้งห้อยระหว่างเสา (ดอกชมพู/ขาว/เหลืองเรียงตามเส้นโค้ง)
  const cols = ['#FF8FB3', '#FFFFFF', '#FFD45A', '#FF8FB3', '#C8A8F5'];
  for (let i = 0; i < n; i++) {
    const a = xs[i], b = xs[i + 1], y = top - 13, sag = 9;
    c.strokeStyle = '#7FC48C'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(a, y); c.quadraticCurveTo((a + b) / 2, y + sag * 2, b, y); c.stroke();
    for (let k = 1; k < 10; k++) {
      const u = k / 10, x = a + (b - a) * u, yy = y + sag * 4 * u * (1 - u);
      c.fillStyle = cols[(k + i) % cols.length];
      c.beginPath(); c.arc(x, yy, 2.6, 0, TAU); c.fill();
    }
  }
  for (const x of xs) {
    const t2 = base - 28;
    c.fillStyle = lg(c, x - 6, 0, x + 6, 0, [[0, '#EBDDFB'], [0.5, '#FFFFFF'], [1, '#E2D0F2']]);
    c.beginPath(); c.roundRect(x - 6, t2, 12, base - t2, 2); c.fill();
    c.fillStyle = GOLD;
    c.fillRect(x - 6.5, t2 + 3, 13, 2);
    c.beginPath(); c.moveTo(x - 5.5, t2); c.quadraticCurveTo(x - 5.5, t2 - 8, x, t2 - 12); c.quadraticCurveTo(x + 5.5, t2 - 8, x + 5.5, t2); c.closePath(); c.fill();
    c.fillStyle = '#FF8FB3';
    heart(c, x, base - 13, 2.8); c.fill();
  }
}

/** ไม้ดอกริมลาน + กอหญ้าดอกไม้หน้าสุด (มุมล่าง) */
function gardens(c, bottom) {
  for (const [x, y, s] of [[110, NEAR + 6, 18], [222, NEAR + 4, 13], [742, NEAR + 4, 13], [858, NEAR + 6, 18]]) {
    c.fillStyle = 'rgba(80,40,110,.14)';
    c.beginPath(); c.ellipse(x, y + 2, s * 1.4, s * 0.25, 0, 0, TAU); c.fill();
    bush(c, x, y, s, '#9ED79A');
    flowers(c, x - s * 0.7, y - s * 1.2, 3, ['#FF8FB3', '#FFFFFF', '#FFD45A']);
  }
  // กอหญ้า/ดอกไม้หน้าสุด ชิดขอบล่างสองมุม
  for (const [x0, n, flip] of [[-8, 6, 0], [W - 150, 6, 1]]) {
    for (let b = 0; b < n * 4; b++) {
      const x = x0 + b * 6.5 + ((b * 37) % 5), hgt = 30 + ((b * 53) % 26);
      c.fillStyle = b % 3 ? '#79C487' : '#6FBF7A';
      c.beginPath(); c.moveTo(x - 3.5, bottom); c.quadraticCurveTo(x + (flip ? -3 : 3), bottom - hgt * 0.6, x + (flip ? -5 : 5), bottom - hgt); c.lineTo(x + 3.5, bottom); c.closePath(); c.fill();
    }
    for (let i = 0; i < n; i++) {
      const x = x0 + 14 + i * 22, y = bottom - 30 - ((i * 29) % 16);
      c.fillStyle = i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? '#FF8FB3' : '#C8A8F5';
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; c.beginPath(); c.arc(x + Math.cos(a) * 3.6, y + Math.sin(a) * 3.6, 2.8, 0, TAU); c.fill(); }
      c.fillStyle = '#FFE680';
      c.beginPath(); c.arc(x, y, 2, 0, TAU); c.fill();
    }
  }
}

function nearStatic(c, extBottom) {
  const bottom = H + extBottom;
  plaza(c, bottom);
  deck(c);
  carpet(c, bottom);
  for (const s of [-1, 1]) bridgeRail(c, s);
  parapet(c, -6, P(-BR_HW, 1).x - 10);
  parapet(c, P(BR_HW, 1).x + 10, W + 6);
  for (const g of GUARDS) {
    const p = P(g.xw, g.z);
    drawGuardAt(c, p.x, p.y, 0.86 / g.z, g.d);
  }
  for (const l of LAMPS) {
    const p = P(l.xw, l.z);
    drawRoyalLampAt(c, p.x, p.y, LAMP_S / l.z, l.i);
  }
  gardens(c, bottom);
}

/** หัวโคมหลวง (จุดกลางเปลวแสง) — ใช้ทั้งแสงเรืองบนฉากและแสงตกบนตัวน้อง */
function lampHeads() {
  return LAMPS.map((l) => { const p = P(l.xw, l.z), s = LAMP_S / l.z; return { x: p.x, y: p.y - 142 * s, s }; });
}

// ── วาดทั้งฉาก ─────────────────────────────────────────────────
/**
 * @param opts.part       'far' | 'near' | ไม่ส่ง = ทั้งฉาก (ดูหัวไฟล์)
 * @param opts.extTop     ฟ้าที่ต่อขึ้นไปเหนือขอบบน (หน้าแรกบน iPad)
 * @param opts.extBottom  ลานที่ต่อลงไปใต้ขอบล่าง
 */
export function drawRiverside(ctx, t, opts = {}) {
  const part = opts.part || 'all';
  const extTop = opts.extTop || 0, extBottom = opts.extBottom || 0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, -extTop, W, H + extTop + extBottom);
  ctx.clip();
  if (part !== 'near') {
    sky(ctx, extTop, t);
    drawClouds(ctx, 0, W, t * 0.5);
    farBank(ctx, t);
  }
  if (part !== 'far') {
    drawCastleAt(ctx, CX, FAR_Y, FS, t, 'live');
    FAR_LAMPS.forEach((l, i) => lampGlow(ctx, l.x, FAR_Y + 1 - 142 * FS, 30 * FS, 0.42 + 0.12 * Math.sin(t * 0.13 + i * 3)));
    water(ctx, t);
    // ของฝั่งนี้ทั้งชั้นนิ่งสนิท — วาดครั้งเดียวต่อขนาดจอ (แคชตามสเกล) แล้วแปะ
    cached(ctx, 'riverside:near:' + extBottom, 0, 100, W, H + extBottom - 100, (c) => nearStatic(c, extBottom));
    lampHeads().forEach((h, i) => lampGlow(ctx, h.x, h.y, 34 * h.s, 0.42 + 0.12 * Math.sin(t * 0.13 + i * 2)));
  }
  ctx.restore();
}

/**
 * แสงโคมหลวงตกบนตัวน้อง/กล่องแมว (ใช้แทน lanternLightMask ของฉากอาณาจักร — ดู game.drawHome)
 * lctx = ชั้นที่มีแต่ตัวน้องกับกล่อง → ทาแสงเฉพาะบนเนื้อของ (source-in) · ใช้โคมขวา (ใกล้กล่องแมว)
 */
export function riversideLightMask(lctx, t) {
  const h = lampHeads()[1];
  const fl = 0.78 + Math.sin(t * 0.09 + 1.3) * 0.17 + Math.sin(t * 0.21) * 0.08;
  const R = 330 * h.s;
  lctx.save();
  lctx.globalCompositeOperation = 'source-in';
  const g = lctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, R);
  g.addColorStop(0, `rgba(255,196,112,${0.27 * fl})`);
  g.addColorStop(0.42, `rgba(255,186,104,${0.198 * fl})`);
  g.addColorStop(0.62, `rgba(255,178,96,${0.081 * fl})`);
  g.addColorStop(1, 'rgba(255,170,90,0)');
  lctx.fillStyle = g;
  lctx.fillRect(-W, -H, W * 3, H * 3);
  lctx.restore();
}
