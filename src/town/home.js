// src/town/home.js
// ─────────────────────────────────────────────────────────────
// บ้านของฉัน (ผู้ใช้ 14 พ.ย. — แบบ ref/my-home-ref.png · แผน memory my-home-plan)
//   ห้องส่วนตัวของผู้เล่นในปราสาทแมวเหมียว: ห้องนอนของฉัน → ประตู → ห้องเลี้ยงน้องแมว
//   เดินในระบบเมือง (town/main.js "โลก" HOME / NURSERY) — เปิดแยกหน้าก่อน: town.html?spot=home · ?spot=nursery
//
// หน้าตา (ตามแบบ): ผนังหินครีมอมชมพู · คานไม้สีน้ำตาลอ่อน + ค้ำยัน · พื้นไม้ฮันนี่ · เฟอร์นิเจอร์ลาเวนเดอร์/ชมพู/ครีม
//   ทองนวล แสงโคมอุ่น · หน้าต่างโค้งวิวตามเวลาจริง (castle-sky.js) · ไม่มีเส้นขอบรอบของ (memory no-outline-art)
//   มุมหน้าตรงแบบชั้นปราสาท — ของชิดผนังหลังทั้งหมด พื้นเดินด้านหน้าโล่งตลอดแนว · ไม่มีของหน้าสุดบังตัวละคร
//
// ของทุกชิ้นวาดแยกกัน (shaded = แคชครั้งเดียวต่อขนาดจอ + แสงเงา) → เปิด/ปิดทีละชิ้นได้
//   ห้องแมวเลือกชุดของตามจำนวนน้องในห้อง: ยังไม่มีน้อง = ห้องโล่ง (กล่อง + ป้าย) · มีน้อง = ของครบ
//   (ยังไม่ต่อร้านค้า — ชุดเริ่มต้นดูได้ด้วย ?home=starter · บังคับห้องโล่ง ?home=empty · ของครบ ?home=full)
// ─────────────────────────────────────────────────────────────
import { H, GY, flat } from './layout.js';
import { cached, lg, heart, star } from './world.js';
import {
  TAU, hash, GOLD, SGOLD, GOLD_D, CEIL, WALL_B, rr, archPath, goldV, pawIcon, catFace, catPortrait, crownIcon,
  shaded, drawFloorSegs, chandelier, drawPlantArt, label,
} from './castle-hall.js';
import { sky, windowSky, windowTwinkles } from './castle-sky.js';
import { roomCats } from '../cats.js';

// ── สี (จากภาพแบบ) ──────────────────────────────────────────────
const LV = ['#EEE2FB', '#D9C4F4', '#C3A6EA', '#A587D8', '#8A6BC2'];   // ลาเวนเดอร์ อ่อน → เข้ม
const PK = ['#FFEAF2', '#FBD0E2', '#F4ADCB', '#E58AB2'];              // ชมพูพาสเทล
const WO = ['#F6D9B5', '#E8C092', '#D6A570', '#BC8753', '#9C6A3C'];   // ไม้สีน้ำตาลอ่อน
const CR = ['#FFFDF9', '#FBF2EA', '#F0E2D6', '#E2CDBE'];              // ครีมขาว
const WARM = '255,226,170';                                          // แสงโคมทองนวล

// ── ชิ้นส่วนร่วมของสองห้อง ───────────────────────────────────────
const BEAM_Y = CEIL - 14;   // ขอบบนคานไม้ใหญ่
const BEAM_B = CEIL + 8;    // ขอบล่างคาน
const SEG = 400;

/** ผนังหินครีมอมชมพู + คานไม้ + ค้ำยัน + บัวไม้ล่าง (แคชเป็นช่วงละ 400 ลายต่อกันสนิท) */
function wallRange(c, x0, x1, brackets) {
  c.fillStyle = lg(c, 0, CEIL, 0, WALL_B, [[0, '#F2DADB'], [0.5, '#F8E7E5'], [1, '#F4DFDD']]);
  c.fillRect(x0, BEAM_B - 2, x1 - x0, WALL_B - BEAM_B + 2);
  const RH = 25, BW = 58;
  for (let r = 0, y = BEAM_B + 2; y < WALL_B - 12; r++, y += RH) {
    const hh = Math.min(RH, WALL_B - 12 - y);
    if (hh < 6) break;
    const off = (r % 2) * (BW / 2);
    for (let x = Math.floor((x0 - off) / BW) * BW + off - BW; x < x1 + BW; x += BW) {
      const n = Math.round((x - off) / BW), v = hash(n * 3.7 + r * 11.3);
      c.fillStyle = v < 0.3 ? '#FCEDEA' : v < 0.62 ? '#F7E2E1' : v < 0.85 ? '#FAE8E4' : '#F4DCDD';
      c.beginPath(); c.roundRect(x + 1.6, y + 1.6, BW - 3.2, hh - 3.2, 5); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.roundRect(x + 6, y + 2.8, BW - 12, 1.5, 0.75); c.fill();
      c.fillStyle = 'rgba(205,140,160,.15)'; c.beginPath(); c.roundRect(x + 6, y + hh - 4.2, BW - 12, 1.4, 0.7); c.fill();
      if (v > 0.8) { c.fillStyle = 'rgba(214,160,176,.2)'; c.beginPath(); c.arc(x + BW * (0.25 + v * 0.3), y + hh * 0.55, 1.4, 0, TAU); c.fill(); }
    }
  }
  // เงานุ่มใต้คาน + ใกล้พื้น
  c.fillStyle = lg(c, 0, BEAM_B, 0, BEAM_B + 56, [[0, 'rgba(150,90,110,.2)'], [1, 'rgba(150,90,110,0)']]);
  c.fillRect(x0, BEAM_B, x1 - x0, 56);
  c.fillStyle = lg(c, 0, WALL_B - 46, 0, WALL_B, [[0, 'rgba(150,90,110,0)'], [1, 'rgba(150,90,110,.13)']]);
  c.fillRect(x0, WALL_B - 46, x1 - x0, 46);
  // บัวไม้ล่างผนัง
  c.fillStyle = lg(c, 0, WALL_B - 13, 0, WALL_B, [[0, WO[1]], [1, WO[3]]]); c.fillRect(x0, WALL_B - 13, x1 - x0, 13);
  c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x0, WALL_B - 13, x1 - x0, 1.6);
  c.fillStyle = 'rgba(120,70,40,.2)'; c.fillRect(x0, WALL_B - 3, x1 - x0, 3);
  // ฝ้าไม้ระแนงเหนือคาน
  c.fillStyle = lg(c, 0, -40, 0, BEAM_Y, [[0, '#B57F52'], [1, '#CC9967']]); c.fillRect(x0, -40, x1 - x0, BEAM_Y + 40);
  for (let x = Math.floor(x0 / 44) * 44; x < x1; x += 44) {
    c.fillStyle = 'rgba(110,62,32,.2)'; c.fillRect(x, -40, 1.4, BEAM_Y + 40);
    c.fillStyle = 'rgba(255,228,196,.18)'; c.fillRect(x + 1.4, -40, 1.3, BEAM_Y + 40);
  }
  // คานใหญ่: ไม้อ่อน ไล่เงาล่าง · เสี้ยนไม้ · ขอบบนรับแสง
  c.fillStyle = lg(c, 0, BEAM_Y, 0, BEAM_B, [[0, '#F1CC9F'], [0.45, '#E2B482'], [1, '#C18A56']]);
  c.fillRect(x0, BEAM_Y, x1 - x0, BEAM_B - BEAM_Y);
  c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x0, BEAM_Y + 1.4, x1 - x0, 1.5);
  c.strokeStyle = 'rgba(160,100,55,.22)'; c.lineWidth = 0.9;
  for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) {
    const gx = x + hash(x * 0.013) * 40, gy = BEAM_Y + 8 + hash(x * 0.07) * 8;
    c.beginPath(); c.moveTo(gx, gy); c.quadraticCurveTo(gx + 24, gy - 3, gx + 52, gy + 1); c.stroke();
  }
  c.fillStyle = 'rgba(110,60,30,.22)'; c.fillRect(x0, BEAM_B, x1 - x0, 3);
  for (const bx of brackets) if (bx > x0 - 50 && bx < x1 + 50) bracket(c, bx);
}
/** ค้ำยันไม้ใต้คาน (ตามแบบ) */
function bracket(c, x) {
  const y0 = BEAM_B;
  for (const d of [-1, 1]) {
    c.fillStyle = lg(c, 0, y0, 0, y0 + 30, [[0, '#DDAA76'], [1, '#C48F5C']]);
    c.beginPath(); c.moveTo(x + d * 8, y0); c.lineTo(x + d * 44, y0); c.quadraticCurveTo(x + d * 16, y0 + 5, x + d * 8, y0 + 36); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,240,215,.35)'; c.beginPath(); c.moveTo(x + d * 9, y0 + 1); c.lineTo(x + d * 40, y0 + 1); c.lineTo(x + d * 30, y0 + 3.5); c.lineTo(x + d * 10, y0 + 3.5); c.closePath(); c.fill();
  }
  c.fillStyle = lg(c, x - 9, 0, x + 9, 0, [[0, '#BF8957'], [0.45, '#E6BA88'], [1, '#B47F4D']]);
  c.beginPath(); c.roundRect(x - 9, y0 - 2, 18, 50, [0, 0, 5, 5]); c.fill();
  c.fillStyle = goldV(c, y0 + 36, y0 + 44); c.beginPath(); c.arc(x, y0 + 40, 3, 0, TAU); c.fill();
}
function drawWallSegs(c, camX, vw, key, W, brackets) {
  const s0 = Math.max(0, Math.floor((camX - 20) / SEG)), s1 = Math.min(Math.ceil(W / SEG) - 1, Math.floor((camX + vw + 20) / SEG));
  for (let s = s0; s <= s1; s++) cached(c, key + ':' + s, s * SEG, -40, SEG + 4, WALL_B + 40, (g) => wallRange(g, s * SEG, s * SEG + SEG + 4, brackets));
}

/** พื้นไม้ฮันนี่ + พรมวงรี (rugs = [{ x, w, kind }]) */
const ROW = 26, PLANK = 150;
function floorRange(c, x0, x1, rugs) {
  c.fillStyle = '#E0B183'; c.fillRect(x0, WALL_B, x1 - x0, H - WALL_B + 2);
  for (let r = 0, y = WALL_B + 2; y < H; r++, y += ROW) {
    const off = (r * 61) % PLANK;
    for (let x = Math.floor((x0 - off) / PLANK) * PLANK + off - PLANK; x < x1; x += PLANK) {
      const n = Math.round((x - off) / PLANK), tone = (n + r * 2) % 3;
      c.fillStyle = lg(c, 0, y, 0, y + ROW, tone === 0 ? [[0, '#F3D2A8'], [1, '#EAC497']] : tone === 1 ? [[0, '#F6D9B3'], [1, '#EECCA2']] : [[0, '#F0CDA1'], [1, '#E7BF91']]);
      c.beginPath(); c.roundRect(x + 1, y + 1, PLANK - 2, ROW - 2, 4); c.fill();
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.roundRect(x + 7, y + 2.2, PLANK - 14, 1.5, 0.75); c.fill();
      c.fillStyle = 'rgba(160,100,60,.16)'; c.beginPath(); c.roundRect(x + 7, y + ROW - 3.4, PLANK - 14, 1.3, 0.65); c.fill();
      c.strokeStyle = 'rgba(180,120,75,.17)'; c.lineWidth = 0.9;
      const gx = x + 22 + hash(n * 3.3 + r) * (PLANK - 70);
      c.beginPath(); c.moveTo(gx, y + ROW * 0.42); c.quadraticCurveTo(gx + 20, y + ROW * 0.28, gx + 40, y + ROW * 0.44); c.stroke();
      c.beginPath(); c.moveTo(gx + 9, y + ROW * 0.64); c.quadraticCurveTo(gx + 24, y + ROW * 0.54, gx + 34, y + ROW * 0.66); c.stroke();
    }
  }
  // ขอบพื้นชิดผนัง (เงา)
  c.fillStyle = lg(c, 0, WALL_B, 0, WALL_B + 12, [[0, 'rgba(130,75,45,.22)'], [1, 'rgba(130,75,45,0)']]);
  c.fillRect(x0, WALL_B, x1 - x0, 12);
  for (const R of rugs) if (R.x + R.w / 2 > x0 && R.x - R.w / 2 < x1) rug(c, R);
}
/** พรมวงรีแบน ๆ บนพื้น (ลาเวนเดอร์ขอบลูกไม้ครีม · ชมพูลายอุ้งเท้า · ครีม) */
function rug(c, { x, w, kind = 0 }) {
  const cy = GY + 14, rx = w / 2, ry = 17;
  const col = [[LV[2], LV[1], '#FFFFFF'], [PK[2], PK[1], '#FFFFFF'], [CR[2], CR[0], LV[2]]][kind];
  c.fillStyle = 'rgba(120,70,90,.14)'; c.beginPath(); c.ellipse(x + 3, cy + 4, rx, ry, 0, 0, TAU); c.fill();
  // ขอบลูกไม้หยัก
  c.fillStyle = 'rgba(255,255,255,.9)';
  for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU; c.beginPath(); c.arc(x + Math.cos(a) * (rx + 1), cy + Math.sin(a) * (ry + 1), 3, 0, TAU); c.fill(); }
  c.fillStyle = col[0]; c.beginPath(); c.ellipse(x, cy, rx, ry, 0, 0, TAU); c.fill();
  c.fillStyle = lg(c, 0, cy - ry, 0, cy + ry, [[0, col[1]], [1, col[0]]]); c.beginPath(); c.ellipse(x, cy, rx - 7, ry - 4, 0, 0, TAU); c.fill();
  c.strokeStyle = col[2]; c.globalAlpha = 0.7; c.lineWidth = 1.4; c.setLineDash([4, 4]);
  c.beginPath(); c.ellipse(x, cy, rx - 12, ry - 6.5, 0, 0, TAU); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
  if (kind === 1) for (let i = -2; i <= 2; i++) pawIcon(c, x + i * rx * 0.34, cy + 1, 0.85, 'rgba(255,255,255,.7)');
  else { c.fillStyle = 'rgba(255,255,255,.7)'; heart(c, x, cy + 1, 5); c.fill(); }
}

/** ประตูไม้โค้งในซุ้มหิน (สองห้องใช้ร่วม) — cx = กลางประตู */
const DOOR = { w: 96, top: GY - 214 };
function doorArt(c, cx) {
  const w = DOOR.w, top = DOOR.top, bot = WALL_B + 2, x0 = cx - w / 2, x1 = cx + w / 2;
  // ซุ้มหิน: ก้อนหินโค้งรอบ
  c.fillStyle = 'rgba(150,90,110,.18)'; c.beginPath(); archPath(c, x0 - 22, x1 + 26, top - 20, bot); c.fill();
  c.fillStyle = lg(c, x0 - 20, 0, x1 + 20, 0, [[0, '#E9CFCF'], [0.5, '#F7E6E3'], [1, '#E4C7C8']]);
  c.beginPath(); archPath(c, x0 - 20, x1 + 20, top - 20, bot); c.fill();
  const R = w / 2 + 10, ccx = cx, ccy = top + w / 2;
  c.strokeStyle = 'rgba(200,140,155,.4)'; c.lineWidth = 1.3;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    c.beginPath(); c.moveTo(ccx + Math.cos(a) * (R - 10), ccy + Math.sin(a) * (R - 10)); c.lineTo(ccx + Math.cos(a) * (R + 10), ccy + Math.sin(a) * (R + 10)); c.stroke();
  }
  for (let y = ccy + 26; y < bot - 10; y += 30) for (const xx of [x0 - 20, x1]) { c.beginPath(); c.moveTo(xx, y); c.lineTo(xx + 20, y); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); archPath(c, x0 - 17, x1 + 17, top - 17, top + w / 2); c.fill();
  // บานประตูไม้
  c.fillStyle = 'rgba(90,50,40,.35)'; c.beginPath(); archPath(c, x0 - 3, x1 + 3, top - 3, bot); c.fill();
  c.fillStyle = lg(c, x0, 0, x1, 0, [[0, '#A87449'], [0.5, '#C08B5B'], [1, '#9C6A40']]);
  c.beginPath(); archPath(c, x0, x1, top, bot); c.fill();
  c.save(); c.beginPath(); archPath(c, x0, x1, top, bot); c.clip();
  for (let x = x0 + w / 4; x < x1; x += w / 4) { c.fillStyle = 'rgba(80,45,25,.3)'; c.fillRect(x - 0.8, top, 1.6, bot - top); c.fillStyle = 'rgba(255,220,180,.14)'; c.fillRect(x + 0.8, top, 1.4, bot - top); }
  c.fillStyle = lg(c, 0, top, 0, top + 60, [[0, 'rgba(255,240,220,.22)'], [1, 'rgba(255,240,220,0)']]); c.fillRect(x0, top, w, 60);
  c.restore();
  // แถบเหล็กทอง + หมุด
  for (const y of [top + 64, bot - 46]) {
    c.fillStyle = goldV(c, y - 4, y + 4); c.fillRect(x0 + 2, y - 3.5, w - 4, 7);
    for (let x = x0 + 10; x < x1 - 4; x += 19) { c.fillStyle = '#FFF2C8'; c.beginPath(); c.arc(x, y, 1.5, 0, TAU); c.fill(); }
  }
  // ตราอุ้งเท้ากลางบน + ห่วงจับ
  c.fillStyle = 'rgba(255,240,215,.85)'; c.beginPath(); c.arc(cx, top + 34, 12, 0, TAU); c.fill();
  pawIcon(c, cx, top + 35, 1.05, LV[3]);
  c.strokeStyle = goldV(c, 0, 0); c.strokeStyle = GOLD; c.lineWidth = 2.6;
  c.beginPath(); c.arc(x1 - 18, GY - 92, 7, 0, TAU); c.stroke();
  c.fillStyle = GOLD_D; c.beginPath(); c.arc(x1 - 18, GY - 99, 2.6, 0, TAU); c.fill();
  // ธรณีประตู
  c.fillStyle = lg(c, 0, bot - 6, 0, bot + 6, [[0, '#F3DFDB'], [1, '#D9BDBC']]);
  c.beginPath(); c.roundRect(x0 - 26, bot - 5, w + 52, 10, 3); c.fill();
}
const doorBox = (cx) => [cx - DOOR.w / 2 - 30, DOOR.top - 26, DOOR.w + 60, WALL_B - DOOR.top + 36];

/** ธงลาเวนเดอร์ลายอุ้งเท้า ห้อยใต้คาน */
function bannerArt(c, cx) {
  const bw = 50, by = BEAM_B + 8, bh = 112, bx = cx - bw / 2;
  rr(c, bx - 8, by - 6, bw + 16, 7, 3.5, GOLD);
  for (const d of [-1, 1]) { c.fillStyle = SGOLD; c.beginPath(); c.arc(cx + d * (bw / 2 + 9), by - 2.5, 4, 0, TAU); c.fill(); }
  c.fillStyle = lg(c, bx, 0, bx + bw, 0, [[0, LV[3]], [0.5, LV[2]], [1, LV[3]]]);
  c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + bw, by); c.lineTo(bx + bw, by + bh); c.lineTo(cx, by + bh - 18); c.lineTo(bx, by + bh); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(bx + 4, by, 6, bh - 8);
  c.strokeStyle = SGOLD; c.lineWidth = 1.8;
  c.beginPath(); c.moveTo(bx + 4, by + 2); c.lineTo(bx + 4, by + bh - 6); c.moveTo(bx + bw - 4, by + 2); c.lineTo(bx + bw - 4, by + bh - 6); c.stroke();
  c.fillStyle = CR[0]; c.beginPath(); c.arc(cx, by + 50, 17, 0, TAU); c.fill();
  pawIcon(c, cx, by + 52, 1.45, LV[3]);
}
/** โคมผนัง (ทองนวล) — แสงวาดสด */
function sconceArt(c, x, y, d = 1) {
  c.fillStyle = goldV(c, y + 6, y + 30); c.beginPath(); c.roundRect(x - 4, y + 12, 8, 22, 3); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x, y + 20); c.quadraticCurveTo(x + d * 12, y + 22, x + d * 12, y + 10); c.stroke();
  lanternBody(c, x + d * 12, y - 4, 0.7);
}
/** ตัวโคมทองหกเหลี่ยม (ใช้กับโคมแขวนและโคมผนัง) — y = ยอดโคม */
function lanternBody(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = goldV(c, 0, 12); c.beginPath(); c.moveTo(-10, 12); c.quadraticCurveTo(0, -4, 10, 12); c.closePath(); c.fill();
  c.fillStyle = GOLD; c.beginPath(); c.arc(0, -2, 3.4, 0, TAU); c.fill();
  c.fillStyle = lg(c, -12, 0, 12, 0, [[0, '#FFE6B0'], [0.5, '#FFF8E2'], [1, '#FFD98E']]);
  c.beginPath(); c.moveTo(-12, 13); c.lineTo(12, 13); c.lineTo(10, 40); c.lineTo(-10, 40); c.closePath(); c.fill();
  c.strokeStyle = GOLD_D; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 13); c.lineTo(0, 40); c.stroke();
  c.fillStyle = goldV(c, 38, 46); c.beginPath(); c.roundRect(-13, 39, 26, 6, 2); c.fill();
  c.beginPath(); c.moveTo(-7, 45); c.lineTo(7, 45); c.lineTo(0, 52); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-9, 16, 2.4, 20);
  c.restore();
}
/** โคมแขวนจากคาน */
function hangLanternArt(c, x, len) {
  c.strokeStyle = GOLD_D; c.lineWidth = 1.4;
  for (let y = BEAM_B; y < BEAM_B + len; y += 6) { c.beginPath(); c.ellipse(x, y + 3, 1.6, 3, 0, 0, TAU); c.stroke(); }
  lanternBody(c, x, BEAM_B + len, 1);
}
/** แสงอุ่นรอบโคม (วาดสด กะพริบเบา ๆ) */
function glow(c, x, y, r, a, t, seed = 0) {
  const f = a * (0.9 + 0.1 * Math.sin(t * 0.07 + seed * 2.3)) * (1 + 0.5 * sky().night + 0.2 * sky().dusk);
  const g = c.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, `rgba(${WARM},${Math.min(0.9, f).toFixed(3)})`); g.addColorStop(1, `rgba(${WARM},0)`);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}

/** หน้าต่างโค้งลูกฟักตาราง กรอบครีม (ตามแบบ) — วิวตามเวลาจริง */
function windowArt(c, cx, w, top, bot, seed) {
  const x0 = cx - w / 2, x1 = cx + w / 2;
  c.fillStyle = 'rgba(150,90,110,.18)'; c.beginPath(); archPath(c, x0 - 14, x1 + 18, top - 12, bot + 14); c.fill();
  c.save(); c.beginPath(); archPath(c, x0, x1, top, bot); c.clip();
  windowSky(c, x0, x1, top, bot, seed, sky());
  c.restore();
  // ลูกฟัก (ครีม) ตามแบบ: ตั้งสามเส้นเต็มบาน + นอนหนึ่งเส้นกลางบาน (ตัดในกรอบโค้ง ไม่ล้นขอบ)
  c.save(); c.beginPath(); archPath(c, x0, x1, top, bot); c.clip();
  c.strokeStyle = CR[0]; c.lineWidth = 5; c.lineCap = 'butt';
  for (let i = 1; i < 4; i++) { const x = x0 + (w * i) / 4; c.beginPath(); c.moveTo(x, top); c.lineTo(x, bot); c.stroke(); }
  const yA = top + (bot - top) * 0.56;
  c.beginPath(); c.moveTo(x0, yA); c.lineTo(x1, yA); c.stroke();
  c.strokeStyle = 'rgba(214,165,112,.45)'; c.lineWidth = 1;
  for (let i = 1; i < 4; i++) { const x = x0 + (w * i) / 4; c.beginPath(); c.moveTo(x + 2.5, top); c.lineTo(x + 2.5, bot); c.stroke(); }
  c.restore();
  // กรอบ: ครีมหนา + เส้นทองบาง
  c.strokeStyle = CR[0]; c.lineWidth = 11; c.beginPath(); archPath(c, x0, x1, top, bot); c.stroke();
  c.strokeStyle = 'rgba(214,165,112,.75)'; c.lineWidth = 2; c.beginPath(); archPath(c, x0 - 6, x1 + 6, top - 6, bot); c.stroke();
  // ขอบหน้าต่าง (ไม้)
  c.fillStyle = lg(c, 0, bot - 2, 0, bot + 12, [[0, WO[0]], [1, WO[2]]]); c.beginPath(); c.roundRect(x0 - 16, bot - 2, w + 32, 12, 3); c.fill();
  c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x0 - 14, bot - 1, w + 28, 1.6);
}
function twinkle(c, cx, w, top, bot, seed, t) {
  const n = sky().night + sky().dusk * 0.3;
  if (n < 0.05) return;
  c.save(); c.beginPath(); archPath(c, cx - w / 2, cx + w / 2, top, bot); c.clip();
  windowTwinkles(c, cx - w / 2, cx + w / 2, top, bot, seed, t, n);
  c.restore();
}
/** ม่านลาเวนเดอร์ผูกโบว์ขาว (สองข้างหน้าต่างใหญ่ห้องนอน) */
function curtainArt(c, cx, w, rodY, tieY, hemY) {
  const half = w / 2;
  c.fillStyle = goldV(c, rodY - 4, rodY + 4); c.beginPath(); c.roundRect(cx - half - 70, rodY - 3.5, w + 140, 7, 3.5); c.fill();
  for (const d of [-1, 1]) { c.fillStyle = GOLD; c.beginPath(); c.arc(cx + d * (half + 72), rodY, 6, 0, TAU); c.fill(); c.fillStyle = SGOLD; c.beginPath(); c.arc(cx + d * (half + 72) - 1.5, rodY - 1.5, 2, 0, TAU); c.fill(); }
  for (const d of [-1, 1]) {
    const xo = cx + d * (half + 64), xi = cx + d * (half - 34), xg = cx + d * (half + 22);
    const p = new Path2D();
    p.moveTo(xo, rodY); p.lineTo(xi, rodY);
    p.bezierCurveTo(xi, rodY + 60, xg - d * 6, tieY - 50, xg - d * 12, tieY);
    p.bezierCurveTo(xg - d * 14, tieY + 40, xg - d * 26, hemY - 30, xg - d * 30, hemY);
    for (let i = 1; i <= 5; i++) { const u = i / 5; p.quadraticCurveTo(xg - d * 30 + d * (u - 0.1) * 92, hemY + 6, xg - d * 30 + d * u * 92, hemY - (i % 2 ? 0 : 3)); }
    p.bezierCurveTo(xo, hemY - 70, xg + d * 16, tieY + 30, xg + d * 14, tieY);
    p.bezierCurveTo(xg + d * 18, tieY - 46, xo, rodY + 70, xo, rodY);
    p.closePath();
    c.fillStyle = lg(c, xo, 0, xi, 0, [[0, LV[3]], [0.5, LV[2]], [1, LV[1]]]); c.fill(p);
    c.save(); c.clip(p);
    for (let j = 0; j < 6; j++) {
      const u = (j + 0.5) / 6, xt = xo + (xi - xo) * u, xb = xg - d * 30 + d * u * 92;
      c.strokeStyle = j % 2 ? 'rgba(255,255,255,.28)' : 'rgba(110,80,170,.16)'; c.lineWidth = 7;
      c.beginPath(); c.moveTo(xt, rodY); c.quadraticCurveTo(xg, tieY, xb, hemY); c.stroke();
    }
    c.restore();
    // ห่วงผ้าบนราว
    for (let i = 0; i < 5; i++) { const x = xo + (xi - xo) * (i / 4); c.fillStyle = GOLD; c.beginPath(); c.arc(x, rodY + 2, 2.6, 0, TAU); c.fill(); }
    bow(c, xg, tieY, 1, CR[0], CR[2]);
  }
}
/** โบว์ (ใช้ทั้งห้อง) */
function bow(c, x, y, s, col, colD) {
  c.save(); c.translate(x, y); c.scale(s, s);
  for (const d of [-1, 1]) {
    c.fillStyle = colD; c.beginPath(); c.moveTo(d * 2, 2); c.quadraticCurveTo(d * 8, 14, d * 6, 22); c.lineTo(d * 1, 20); c.closePath(); c.fill();
    c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(d * 6, -10, d * 16, -8, d * 15, 0); c.bezierCurveTo(d * 16, 8, d * 6, 9, 0, 0); c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(d * 9, -3, 3, 1.6, d * 0.3, 0, TAU); c.fill();
  }
  c.fillStyle = colD; c.beginPath(); c.arc(0, 0, 3.6, 0, TAU); c.fill();
  c.fillStyle = col; c.beginPath(); c.arc(-0.6, -0.6, 2.6, 0, TAU); c.fill();
  c.restore();
}
/** แผ่นไม้มน + ไฮไลต์ (โต๊ะ ตู้ ชั้น) */
function plank(c, x, y, w, h, r = 3, tone = 1) {
  c.fillStyle = lg(c, 0, y, 0, y + h, [[0, WO[tone - 1] || WO[0]], [1, WO[tone + 1]]]);
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
  c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.roundRect(x + 3, y + 1.2, w - 6, 1.5, 0.75); c.fill();
}
/** เงาตกบนพื้นใต้ของ */
function floorShadow(c, x, w, a = 0.16) {
  c.fillStyle = `rgba(120,70,80,${a})`; c.beginPath(); c.ellipse(x, GY + 3, w / 2, 6, 0, 0, TAU); c.fill();
}
/** กรอบรูปทองแขวนผนัง: รูปแมว (fur) บนพื้นไล่สี */
function frameArt(c, cx, cy, w, h, fur, bg = [PK[0], LV[1]], round = false) {
  c.fillStyle = 'rgba(120,70,90,.16)'; c.beginPath(); c.roundRect(cx - w / 2 + 3, cy - h / 2 + 4, w, h, round ? w / 2 : 5); c.fill();
  c.fillStyle = goldV(c, cy - h / 2, cy + h / 2); c.beginPath(); c.roundRect(cx - w / 2, cy - h / 2, w, h, round ? w / 2 : 5); c.fill();
  const ix = cx - w / 2 + 5, iy = cy - h / 2 + 5, iw = w - 10, ih = h - 10;
  c.save(); c.beginPath(); c.roundRect(ix, iy, iw, ih, round ? iw / 2 : 3); c.clip();
  c.fillStyle = lg(c, 0, iy, 0, iy + ih, [[0, bg[0]], [1, bg[1]]]); c.fillRect(ix, iy, iw, ih);
  catPortrait(c, cx, cy + ih * 0.02, Math.min(iw, ih) * 0.24, fur, false);
  c.restore();
  c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.roundRect(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, 2, 1); c.fill();
}
/** โคมไฟตั้งโต๊ะ (ฐานครีม โป๊ะลาเวนเดอร์) — y = พื้นที่ตั้ง · คืนตำแหน่งหลอดไฟ */
function tableLamp(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = lg(c, -9, 0, 9, 0, [[0, CR[2]], [0.5, CR[0]], [1, CR[3]]]);
  c.beginPath(); c.moveTo(-9, 0); c.quadraticCurveTo(-12, -14, -4, -20); c.lineTo(4, -20); c.quadraticCurveTo(12, -14, 9, 0); c.closePath(); c.fill();
  c.fillStyle = GOLD; c.fillRect(-2, -30, 4, 11);
  c.fillStyle = lg(c, 0, -52, 0, -28, [[0, LV[1]], [1, LV[2]]]);
  c.beginPath(); c.moveTo(-10, -52); c.lineTo(10, -52); c.lineTo(17, -28); c.lineTo(-17, -28); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.moveTo(-8, -50); c.lineTo(-4, -50); c.lineTo(-9, -30); c.lineTo(-14, -30); c.closePath(); c.fill();
  c.fillStyle = SGOLD; c.fillRect(-17, -29.5, 34, 2);
  c.restore();
}
/** กระถางต้นไม้ (ใช้ชุดของปราสาท) วางที่ x บนพื้นสูง y */
function plantAt(c, x, y, kind, s = 1) { c.save(); c.translate(x, y); c.scale(s, s); drawPlantArt(c, kind); c.restore(); }

// ═════════════════════════════ ห้องนอนของฉัน ═════════════════════════════
export const HOME_W = 2480;
const X = {
  exit: 80, sconL: 150, banL: 204, plantL: 262, nsL: 330, bed: 486, nsR: 662, desk: 826, chair: 842,
  lantA: 728, win: 1160, lantB: 1806, ward: 1466, mirror: 1588, trophy: 1712, sofa: 1892, record: 2068,
  books: 2196, plantR: 2300, banR: 2264, sconR: 2322, door: 2400,
};
const BED = { w: 272, top: GY - 208 }, WINB = { w: 300, top: 60, bot: 236 }, BENCH = { w: 330, h: 50 };
const WARD = { w: 150, h: 226 }, MIRROR = { w: 58, h: 166 }, TROPHY = { w: 130, h: 214 }, SOFA = { w: 230, h: 98 };
const BOOKS = { w: 130, h: 234 }, DESK = { w: 204, h: 78 };
const H_BRACKETS = [330, 662, 1712, 2068];   // ค้ำยันใต้คาน — เว้นตรงโคมแขวน/ธง/ราวม่าน
const H_RUGS = [{ x: X.bed, w: 260, kind: 0 }, { x: X.win, w: 360, kind: 0 }, { x: X.sofa, w: 250, kind: 1 }];

export const HOME_PLACES = [
  { id: 'hExit', kind: 'door', to: 'hall', act: 'ออกไปโถงปราสาท', name: 'ประตูออกไปโถงปราสาท', x: X.exit - 50, w: 100, h: 214 },
  { id: 'hBed', kind: 'bed', name: 'เตียงของฉัน', x: X.bed - 120, w: 240, h: 150, seats: [X.bed - 52, X.bed + 52], sitDy: 58 },
  { id: 'hChair', kind: 'bench', name: 'เก้าอี้โต๊ะทำงาน', x: X.chair - 26, w: 52, h: 100, sitDy: 30 },
  { id: 'hBench', kind: 'bench', name: 'ม้านั่งริมหน้าต่าง', x: X.win - BENCH.w / 2, w: BENCH.w, h: 80, seats: [X.win - 100, X.win, X.win + 100], sitDy: BENCH.h - 4 },
  { id: 'hWard', kind: 'ward', act: 'เปิดตู้เสื้อผ้า', name: 'ตู้เสื้อผ้า', x: X.ward - WARD.w / 2, w: WARD.w, h: WARD.h },
  { id: 'hMirror', kind: 'photo', act: 'ถ่ายรูปหน้ากระจก', name: 'กระจกบานยาว', x: X.mirror - 30, w: 60, h: MIRROR.h },
  { id: 'hTrophy', kind: 'soon', act: 'ดูถ้วยรางวัล', name: 'ชั้นถ้วยรางวัล', x: X.trophy - TROPHY.w / 2, w: TROPHY.w, h: TROPHY.h, msg: 'ชั้นถ้วยรางวัล · เร็ว ๆ นี้จะโชว์ถ้วยและรางวัลที่ได้จากการวิ่ง' },
  { id: 'hSofa', kind: 'bench', name: 'โซฟาลาเวนเดอร์', x: X.sofa - SOFA.w / 2, w: SOFA.w, h: 80, seats: [X.sofa - 62, X.sofa, X.sofa + 62], sitDy: 38 },
  { id: 'hRecord', kind: 'record', name: 'เครื่องเล่นแผ่นเสียง', x: X.record - 40, w: 80, h: 130 },
  { id: 'hDoor', kind: 'door', to: 'nursery', act: 'ไปห้องน้องแมว', name: 'ประตูไปห้องเลี้ยงน้องแมว', x: X.door - 50, w: 100, h: 214 },
];
for (const p of HOME_PLACES) p.door = p.x + p.w / 2;
export const HOME_SPAWN = X.exit + 120;      // เข้ามาจากโถงปราสาท = ยืนข้างประตูซ้าย
export const HOME_BACK_X = X.door - 110;     // กลับจากห้องแมว = ยืนข้างประตูขวา

export const HOME_SURFACES = (() => {
  const S = [
    flat('hBed:top', X.bed - 118, X.bed + 118, GY - 62, { soft: true }),
    flat('hNsL', X.nsL - 26, X.nsL + 26, GY - 60), flat('hNsR', X.nsR - 26, X.nsR + 26, GY - 60),
    flat('hDesk', X.desk - DESK.w / 2 + 4, X.desk + DESK.w / 2 - 4, GY - DESK.h),
    flat('hBench:seat', X.win - BENCH.w / 2 + 10, X.win + BENCH.w / 2 - 10, GY - BENCH.h - 4, { soft: true }),
    flat('hWard:top', X.ward - WARD.w / 2 + 8, X.ward + WARD.w / 2 - 8, GY - WARD.h + 18),
    flat('hTrophy:top', X.trophy - TROPHY.w / 2 + 6, X.trophy + TROPHY.w / 2 - 6, GY - TROPHY.h + 14),
    flat('hSofa:seat', X.sofa - SOFA.w / 2 + 24, X.sofa + SOFA.w / 2 - 24, GY - 40, { soft: true }),
    flat('hSofa:back', X.sofa - SOFA.w / 2 + 20, X.sofa + SOFA.w / 2 - 20, GY - SOFA.h + 8, { soft: true }),
    flat('hRecord:top', X.record - 42, X.record + 42, GY - 66),
    flat('hBooks:top', X.books - BOOKS.w / 2 + 6, X.books + BOOKS.w / 2 - 6, GY - BOOKS.h + 8),
  ];
  for (const s of S) { s.x0 = s.pts[0][0]; s.x1 = s.pts[s.pts.length - 1][0]; }
  return S;
})();
/** พรม (เสียงเท้านุ่ม) */
export function homeRug(world, x) { return (world === 'home' ? H_RUGS : N_RUGS).some((r) => Math.abs(x - r.x) < r.w / 2); }

// ── เครื่องเล่นแผ่นเสียง (เปิด/ปิดเพลงในห้อง) ──
const record = { on: true, t: -1e4 };
export const recordOn = () => record.on;
export function toggleRecord(t) { record.on = !record.on; record.t = t; return record.on; }

// ── ชิ้นในห้องนอน ──
function postArt(c, x, top, bot, w) {
  c.fillStyle = lg(c, x - w / 2, 0, x + w / 2, 0, [[0, WO[2]], [0.45, WO[0]], [1, WO[3]]]);
  c.beginPath(); c.roundRect(x - w / 2, top, w, bot - top, w / 2); c.fill();
  for (const y of [top + 30, bot - 40]) { c.fillStyle = WO[1]; c.beginPath(); c.ellipse(x, y, w / 2 + 2, 3, 0, 0, TAU); c.fill(); }
  c.fillStyle = goldV(c, top - 12, top + 2); c.beginPath(); c.arc(x, top - 4, w / 2 + 2, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x - 2, top - 6, 2, 0, TAU); c.fill();
}
function pillow(c, x, y, w, h, col, colD) {
  c.fillStyle = lg(c, 0, y - h / 2, 0, y + h / 2, [[0, col], [1, colD]]);
  c.beginPath(); c.moveTo(x - w / 2, y - h / 2 + 4);
  c.quadraticCurveTo(x, y - h / 2 - 4, x + w / 2, y - h / 2 + 4); c.quadraticCurveTo(x + w / 2 + 4, y, x + w / 2, y + h / 2 - 4);
  c.quadraticCurveTo(x, y + h / 2 + 4, x - w / 2, y + h / 2 - 4); c.quadraticCurveTo(x - w / 2 - 4, y, x - w / 2, y - h / 2 + 4); c.fill();
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(x - w * 0.15, y - h * 0.22, w * 0.26, h * 0.12, -0.1, 0, TAU); c.fill();
}
function drawBedArt(c) {
  const cx = X.bed, x0 = cx - BED.w / 2, x1 = cx + BED.w / 2, top = BED.top;
  floorShadow(c, cx, BED.w + 30, 0.18);
  // เสาหลัง + ผ้าม่านโปร่งด้านหลัง
  for (const x of [x0 + 26, x1 - 26]) postArt(c, x, top + 10, GY - 40, 9);
  c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x0 + 30, top + 18, BED.w - 60, GY - 60 - top);
  // หัวเตียง: ไม้โค้ง + เบาะลาเวนเดอร์ดึงกระดุม
  c.fillStyle = lg(c, 0, GY - 160, 0, GY - 60, [[0, WO[1]], [1, WO[3]]]);
  c.beginPath(); c.moveTo(x0 + 34, GY - 60); c.lineTo(x0 + 34, GY - 128); c.quadraticCurveTo(cx, GY - 178, x1 - 34, GY - 128); c.lineTo(x1 - 34, GY - 60); c.closePath(); c.fill();
  c.fillStyle = lg(c, 0, GY - 150, 0, GY - 66, [[0, LV[1]], [1, LV[2]]]);
  c.beginPath(); c.moveTo(x0 + 46, GY - 66); c.lineTo(x0 + 46, GY - 124); c.quadraticCurveTo(cx, GY - 164, x1 - 46, GY - 124); c.lineTo(x1 - 46, GY - 66); c.closePath(); c.fill();
  for (let r = 0; r < 3; r++) for (let i = -3; i <= 3; i++) {
    const bx = cx + i * 28 + (r % 2) * 14, by = GY - 128 + r * 20 + Math.abs(i) * 2;
    if (bx < x0 + 56 || bx > x1 - 56 || by > GY - 72) continue;
    c.fillStyle = 'rgba(120,90,180,.3)'; c.beginPath(); c.arc(bx, by, 2.2, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(bx - 0.7, by - 0.7, 1, 0, TAU); c.fill();
  }
  // หมอนสองใบ + หมอนหน้าแมว
  pillow(c, cx - 58, GY - 78, 78, 34, '#FFFFFF', CR[2]);
  pillow(c, cx + 58, GY - 78, 78, 34, '#FFFFFF', CR[2]);
  catFace(c, cx + 2, GY - 78, 15, LV[1]);
  // ฟูก + ผ้าห่มลาเวนเดอร์ (พับขอบขาว)
  c.fillStyle = lg(c, 0, GY - 66, 0, GY - 34, [[0, '#FFFFFF'], [1, CR[1]]]); c.beginPath(); c.roundRect(x0 + 18, GY - 66, BED.w - 36, 34, 10); c.fill();
  c.fillStyle = lg(c, 0, GY - 58, 0, GY - 18, [[0, LV[2]], [1, LV[3]]]);
  c.beginPath(); c.moveTo(x0 + 16, GY - 56); c.quadraticCurveTo(cx, GY - 64, x1 - 16, GY - 56); c.lineTo(x1 - 12, GY - 22); c.quadraticCurveTo(cx, GY - 14, x0 + 12, GY - 22); c.closePath(); c.fill();
  c.fillStyle = lg(c, 0, GY - 62, 0, GY - 48, [[0, '#FFFFFF'], [1, CR[2]]]);
  c.beginPath(); c.moveTo(x0 + 16, GY - 58); c.quadraticCurveTo(cx, GY - 66, x1 - 16, GY - 58); c.lineTo(x1 - 16, GY - 48); c.quadraticCurveTo(cx, GY - 55, x0 + 16, GY - 48); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.2; c.setLineDash([3, 4]);
  c.beginPath(); c.moveTo(x0 + 22, GY - 26); c.quadraticCurveTo(cx, GY - 19, x1 - 22, GY - 26); c.stroke(); c.setLineDash([]);
  for (let i = -3; i <= 3; i++) { c.fillStyle = 'rgba(255,255,255,.35)'; heart(c, cx + i * 32, GY - 36, 3.6); c.fill(); }
  // ฐานเตียงไม้ + ขา
  c.fillStyle = lg(c, 0, GY - 24, 0, GY - 8, [[0, WO[1]], [1, WO[3]]]); c.beginPath(); c.roundRect(x0 + 8, GY - 24, BED.w - 16, 14, 4); c.fill();
  // เสาหน้า (หนา) + ยอดทอง
  for (const x of [x0 + 10, x1 - 10]) postArt(c, x, top, GY, 13);
  // คานบนหลังคา + ระบายลาเวนเดอร์ + โบว์กลาง
  plank(c, x0 - 4, top - 2, BED.w + 8, 10, 4, 1);
  c.fillStyle = lg(c, 0, top + 6, 0, top + 34, [[0, LV[2]], [1, LV[3]]]);
  c.beginPath(); c.moveTo(x0, top + 6); c.lineTo(x1, top + 6); c.lineTo(x1, top + 22);
  for (let i = 0; i < 6; i++) { const xa = x1 - (i * BED.w) / 6, xb = x1 - ((i + 1) * BED.w) / 6; c.quadraticCurveTo((xa + xb) / 2, top + 36, xb, top + 22); }
  c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x0, top + 8, BED.w, 3);
  bow(c, cx, top + 14, 1.2, CR[0], LV[1]);
  // ผ้าม่านโปร่งสองข้าง รวบด้วยโบว์ลาเวนเดอร์
  for (const d of [-1, 1]) {
    const xe = d < 0 ? x0 + 4 : x1 - 4, tie = GY - 116;
    c.fillStyle = 'rgba(255,255,255,.78)';
    c.beginPath(); c.moveTo(xe, top + 18); c.lineTo(xe - d * 34, top + 18);
    c.quadraticCurveTo(xe - d * 12, tie - 30, xe - d * 4, tie); c.quadraticCurveTo(xe - d * 18, tie + 40, xe - d * 26, GY - 28);
    c.lineTo(xe + d * 6, GY - 28); c.quadraticCurveTo(xe + d * 4, tie + 20, xe + d * 4, tie); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(200,180,230,.4)'; c.lineWidth = 1.2;
    for (const k of [10, 20]) { c.beginPath(); c.moveTo(xe - d * k, top + 20); c.quadraticCurveTo(xe - d * (k * 0.4), tie - 20, xe - d * 2, tie); c.stroke(); }
    bow(c, xe - d * 2, tie, 0.9, LV[2], LV[3]);
  }
}
/** ชั้นเหนือเตียง: กระถางเถาไม้ + รูปปั้นแมว */
function drawBedShelfArt(c) {
  const cx = X.bed, y = 92;
  plank(c, cx - 80, y, 160, 9, 3, 1);
  for (const d of [-1, 1]) { c.fillStyle = WO[2]; c.beginPath(); c.moveTo(cx + d * 60, y + 9); c.lineTo(cx + d * 60, y + 24); c.lineTo(cx + d * 48, y + 9); c.closePath(); c.fill(); }
  // กระถางเถาไม้ห้อย
  const px = cx - 44;
  c.fillStyle = lg(c, px - 14, 0, px + 14, 0, [[0, CR[2]], [0.5, CR[0]], [1, CR[3]]]); c.beginPath(); c.moveTo(px - 14, y - 24); c.lineTo(px + 14, y - 24); c.lineTo(px + 10, y); c.lineTo(px - 10, y); c.closePath(); c.fill();
  c.strokeStyle = '#7FB27A'; c.lineWidth = 1.6;
  for (const [dx, len] of [[-8, 46], [2, 62], [10, 38]]) {
    c.beginPath(); c.moveTo(px + dx, y - 6); c.bezierCurveTo(px + dx - 6, y + len * 0.4, px + dx + 8, y + len * 0.7, px + dx - 2, y + len); c.stroke();
    for (let k = 0; k < 5; k++) { const u = (k + 1) / 6; c.fillStyle = k % 2 ? '#93C78C' : '#7DB678'; c.beginPath(); c.ellipse(px + dx + Math.sin(u * 5) * 4, y - 4 + len * u, 4, 2.6, u * 2, 0, TAU); c.fill(); }
  }
  for (const [dx, dy] of [[-10, -28], [0, -32], [10, -27], [-4, -36], [6, -36]]) { c.fillStyle = dy < -30 ? '#9ED197' : '#7DB678'; c.beginPath(); c.ellipse(px + dx, y + dy, 7, 4.5, dx * 0.05, 0, TAU); c.fill(); }
  // รูปปั้นแมวนั่ง (ครีมลาเวนเดอร์)
  const sx = cx + 40;
  c.fillStyle = lg(c, 0, y - 34, 0, y, [[0, LV[0]], [1, LV[2]]]);
  c.beginPath(); c.ellipse(sx, y - 9, 13, 10, 0, 0, TAU); c.fill();
  catFace(c, sx, y - 26, 10, LV[0]);
  c.strokeStyle = LV[2]; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(sx + 12, y - 4); c.quadraticCurveTo(sx + 22, y - 8, sx + 18, y - 20); c.stroke();
}
function nightstandArt(c, x) {
  floorShadow(c, x, 66);
  plank(c, x - 30, GY - 62, 60, 8, 3, 1);
  c.fillStyle = lg(c, 0, GY - 56, 0, GY - 8, [[0, CR[0]], [1, CR[2]]]); c.beginPath(); c.roundRect(x - 26, GY - 55, 52, 46, 4); c.fill();
  c.fillStyle = lg(c, 0, GY - 50, 0, GY - 32, [[0, LV[1]], [1, LV[2]]]); c.beginPath(); c.roundRect(x - 21, GY - 50, 42, 17, 4); c.fill();
  c.fillStyle = goldV(c, GY - 44, GY - 38); c.beginPath(); c.arc(x, GY - 41.5, 2.6, 0, TAU); c.fill();
  c.fillStyle = 'rgba(160,120,200,.2)'; c.beginPath(); c.roundRect(x - 21, GY - 28, 42, 16, 4); c.fill();
  for (const d of [-1, 1]) { c.fillStyle = WO[2]; c.beginPath(); c.roundRect(x + d * 20 - 3, GY - 10, 6, 10, 2); c.fill(); }
  tableLamp(c, x, GY - 62, 0.85);
}
function drawDeskArt(c) {
  const cx = X.desk, x0 = cx - DESK.w / 2, x1 = cx + DESK.w / 2, top = GY - DESK.h;
  floorShadow(c, cx, DESK.w + 10);
  // ขาโค้ง
  for (const x of [x0 + 10, x1 - 10]) {
    c.fillStyle = lg(c, x - 5, 0, x + 5, 0, [[0, WO[2]], [0.5, WO[0]], [1, WO[3]]]);
    c.beginPath(); c.moveTo(x - 5, top + 8); c.lineTo(x + 5, top + 8); c.quadraticCurveTo(x + 2, GY - 30, x + (x < cx ? -4 : 4), GY); c.lineTo(x + (x < cx ? -9 : -1), GY); c.quadraticCurveTo(x - 6, GY - 30, x - 5, top + 8); c.fill();
  }
  // ลิ้นชักลาเวนเดอร์ใต้โต๊ะ (ขวา) + แผงกลาง
  c.fillStyle = lg(c, 0, top + 8, 0, top + 34, [[0, CR[0]], [1, CR[2]]]); c.beginPath(); c.roundRect(x0 + 16, top + 8, DESK.w - 32, 24, 3); c.fill();
  for (const dx of [-50, 0, 50]) {
    c.fillStyle = lg(c, 0, top + 11, 0, top + 29, [[0, LV[1]], [1, LV[2]]]); c.beginPath(); c.roundRect(cx + dx - 21, top + 11, 42, 17, 3); c.fill();
    c.fillStyle = GOLD; c.beginPath(); c.arc(cx + dx, top + 19.5, 2.2, 0, TAU); c.fill();
  }
  plank(c, x0, top, DESK.w, 10, 4, 1);
  // ของบนโต๊ะ: หนังสือตั้ง · แจกันดอกไม้ · กรอบรูปเล็ก
  const books = [[LV[3], 13, 44], [PK[2], 10, 40], ['#9FC9E8', 12, 46], [LV[2], 9, 38]];
  let bx = x0 + 18;
  for (const [col, w, h] of books) { c.fillStyle = col; c.beginPath(); c.roundRect(bx, top - h, w, h, 2); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(bx + 2, top - h + 6, w - 4, 2); c.fillRect(bx + 2, top - 10, w - 4, 2); bx += w + 1; }
  // หนังสือนอน + ถ้วย
  c.fillStyle = PK[1]; c.beginPath(); c.roundRect(cx - 30, top - 9, 44, 9, 2); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(cx - 28, top - 6, 40, 1.4);
  c.fillStyle = CR[0]; c.beginPath(); c.roundRect(cx - 18, top - 25, 16, 16, [2, 2, 5, 5]); c.fill(); c.strokeStyle = CR[0]; c.lineWidth = 2.2; c.beginPath(); c.arc(cx - 1, top - 18, 4, -1.2, 1.2); c.stroke();
  c.fillStyle = PK[2]; heart(c, cx - 10, top - 17, 3.2); c.fill();
  // แจกันดอกไม้
  const vx = x1 - 54;
  c.fillStyle = lg(c, vx - 9, 0, vx + 9, 0, [[0, '#B9D8EE'], [0.5, '#E8F4FC'], [1, '#9CC4E2']]);
  c.beginPath(); c.moveTo(vx - 6, top); c.quadraticCurveTo(vx - 13, top - 14, vx - 5, top - 24); c.lineTo(vx + 5, top - 24); c.quadraticCurveTo(vx + 13, top - 14, vx + 6, top); c.closePath(); c.fill();
  c.strokeStyle = '#7DB678'; c.lineWidth = 1.4;
  for (const [dx, dy] of [[-10, -46], [0, -52], [9, -44], [-4, -40], [5, -38]]) { c.beginPath(); c.moveTo(vx, top - 22); c.lineTo(vx + dx, top + dy); c.stroke(); }
  for (const [dx, dy, col] of [[-10, -46, PK[2]], [0, -52, '#FFFFFF'], [9, -44, LV[2]], [-4, -40, '#FFFFFF'], [5, -38, PK[1]]]) {
    for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; c.fillStyle = col; c.beginPath(); c.arc(vx + dx + Math.cos(a) * 3, top + dy + Math.sin(a) * 3, 2.6, 0, TAU); c.fill(); }
    c.fillStyle = SGOLD; c.beginPath(); c.arc(vx + dx, top + dy, 1.6, 0, TAU); c.fill();
  }
  // กรอบรูปตั้งโต๊ะ
  frameArt(c, x1 - 22, top - 15, 22, 28, '#FFDDB8', [PK[0], PK[1]]);
  tableLamp(c, x0 + 82, top, 0.95);
}
function drawChairArt(c) {
  const x = X.chair, seat = GY - 34;
  // ขา
  for (const d of [-1, 1]) { c.fillStyle = lg(c, 0, seat, 0, GY, [[0, CR[0]], [1, CR[2]]]); c.beginPath(); c.roundRect(x + d * 18 - 3, seat + 4, 6, GY - seat - 4, 3); c.fill(); }
  // พนักพิง (โค้งหูแมว)
  c.fillStyle = lg(c, 0, seat - 64, 0, seat, [[0, CR[0]], [1, CR[2]]]);
  c.beginPath(); c.moveTo(x - 22, seat); c.lineTo(x - 22, seat - 50); c.lineTo(x - 18, seat - 66); c.lineTo(x - 8, seat - 56); c.quadraticCurveTo(x, seat - 60, x + 8, seat - 56); c.lineTo(x + 18, seat - 66); c.lineTo(x + 22, seat - 50); c.lineTo(x + 22, seat); c.closePath(); c.fill();
  c.fillStyle = lg(c, 0, seat - 52, 0, seat - 10, [[0, LV[1]], [1, LV[2]]]); c.beginPath(); c.roundRect(x - 16, seat - 50, 32, 38, 8); c.fill();
  pawIcon(c, x, seat - 30, 0.9, 'rgba(255,255,255,.7)');
  // เบาะ
  c.fillStyle = lg(c, 0, seat - 8, 0, seat + 6, [[0, LV[1]], [1, LV[3]]]); c.beginPath(); c.roundRect(x - 26, seat - 8, 52, 13, 6); c.fill();
  c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.roundRect(x - 20, seat - 6.5, 34, 2.2, 1.1); c.fill();
}
function drawBenchArt(c) {
  const cx = X.win, x0 = cx - BENCH.w / 2, top = GY - BENCH.h;
  floorShadow(c, cx, BENCH.w + 10);
  c.fillStyle = lg(c, 0, top, 0, GY, [[0, WO[1]], [1, WO[3]]]); c.beginPath(); c.roundRect(x0, top + 6, BENCH.w, BENCH.h - 6, 4); c.fill();
  for (let i = 0; i < 3; i++) {
    const dx = x0 + 12 + (i * (BENCH.w - 24)) / 3, dw = (BENCH.w - 24) / 3 - 8;
    c.fillStyle = lg(c, 0, top + 14, 0, GY - 6, [[0, WO[0]], [1, WO[1]]]); c.beginPath(); c.roundRect(dx + 4, top + 14, dw, BENCH.h - 22, 4); c.fill();
    c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(dx + 8, top + 16, dw - 8, 1.4);
    c.fillStyle = goldV(c, top + 26, top + 32); c.beginPath(); c.roundRect(dx + 4 + dw / 2 - 9, top + 25, 18, 4, 2); c.fill();
  }
  // เบาะยาวลาเวนเดอร์
  c.fillStyle = lg(c, 0, top - 6, 0, top + 10, [[0, LV[1]], [1, LV[3]]]); c.beginPath(); c.roundRect(x0 - 4, top - 6, BENCH.w + 8, 16, 8); c.fill();
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.roundRect(x0 + 8, top - 4, BENCH.w - 16, 2.4, 1.2); c.fill();
  // หมอนอิง
  const P = [[-120, LV[1], LV[2], 0], [-70, PK[1], PK[2], 1], [72, '#FFF1D6', '#F2D3A0', 2], [124, LV[1], LV[2], 0]];
  for (const [dx, col, colD, k] of P) {
    pillow(c, cx + dx, top - 22, 40, 34, col, colD);
    if (k === 1) pawIcon(c, cx + dx, top - 21, 1.2, 'rgba(255,255,255,.85)');
    else if (k === 2) pawIcon(c, cx + dx, top - 21, 1.2, PK[2]);
    else { c.fillStyle = 'rgba(255,255,255,.7)'; heart(c, cx + dx, top - 21, 5); c.fill(); }
  }
}
function drawWardArt(c) {
  const cx = X.ward, w = WARD.w, x0 = cx - w / 2, top = GY - WARD.h;
  floorShadow(c, cx, w + 10);
  for (const d of [-1, 1]) { c.fillStyle = WO[2]; c.beginPath(); c.roundRect(cx + d * (w / 2 - 14) - 5, GY - 12, 10, 12, [0, 0, 4, 4]); c.fill(); }
  // ตัวตู้ครีมขอบลาเวนเดอร์ ยอดโค้ง + หูแมว
  c.fillStyle = LV[2];
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(cx + d * 30, top + 30); c.lineTo(cx + d * 50, top - 8); c.lineTo(cx + d * 62, top + 32); c.closePath(); c.fill(); c.fillStyle = PK[1]; c.beginPath(); c.moveTo(cx + d * 38, top + 28); c.lineTo(cx + d * 50, top + 4); c.lineTo(cx + d * 56, top + 30); c.closePath(); c.fill(); c.fillStyle = LV[2]; }
  c.fillStyle = lg(c, 0, top, 0, GY, [[0, LV[2]], [1, LV[3]]]);
  c.beginPath(); c.moveTo(x0, GY - 10); c.lineTo(x0, top + 40); c.quadraticCurveTo(cx, top - 4, x0 + w, top + 40); c.lineTo(x0 + w, GY - 10); c.closePath(); c.fill();
  c.fillStyle = lg(c, 0, top, 0, GY, [[0, CR[0]], [1, CR[2]]]);
  c.beginPath(); c.moveTo(x0 + 7, GY - 14); c.lineTo(x0 + 7, top + 42); c.quadraticCurveTo(cx, top + 6, x0 + w - 7, top + 42); c.lineTo(x0 + w - 7, GY - 14); c.closePath(); c.fill();
  // บานคู่ + แผงลึก
  for (const d of [-1, 1]) {
    const px = d < 0 ? x0 + 14 : cx + 3, pw = w / 2 - 17;
    c.fillStyle = 'rgba(160,120,200,.18)'; c.beginPath(); c.roundRect(px, top + 50, pw, 90, 8); c.fill();
    c.fillStyle = lg(c, 0, top + 52, 0, top + 140, [[0, CR[0]], [1, CR[1]]]); c.beginPath(); c.roundRect(px + 2, top + 52, pw - 4, 86, 7); c.fill();
    c.fillStyle = 'rgba(160,120,200,.18)'; c.beginPath(); c.roundRect(px, top + 150, pw, 50, 8); c.fill();
    c.fillStyle = lg(c, 0, top + 152, 0, top + 198, [[0, CR[0]], [1, CR[1]]]); c.beginPath(); c.roundRect(px + 2, top + 152, pw - 4, 46, 7); c.fill();
    c.fillStyle = goldV(c, top + 128, top + 146); c.beginPath(); c.roundRect(cx + d * 8 - 2.5, top + 126, 5, 20, 2.5); c.fill();
  }
  c.fillStyle = 'rgba(150,110,190,.3)'; c.fillRect(cx - 0.8, top + 46, 1.6, GY - top - 62);
  bow(c, cx, top + 24, 1.25, LV[1], LV[3]);
  c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x0 + 10, top + 46, 3, GY - top - 66);
}
function drawMirrorArt(c) {
  const cx = X.mirror, top = GY - MIRROR.h, w = MIRROR.w;
  floorShadow(c, cx, w + 20, 0.14);
  // ขาตั้ง
  c.fillStyle = WO[2];
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(cx + d * (w / 2 - 6), GY - 30); c.lineTo(cx + d * (w / 2 + 6), GY); c.lineTo(cx + d * (w / 2 - 2), GY); c.lineTo(cx + d * (w / 2 - 12), GY - 30); c.closePath(); c.fill(); }
  // กรอบไม้มน + กระจก
  c.fillStyle = lg(c, cx - w / 2, 0, cx + w / 2, 0, [[0, WO[2]], [0.5, WO[0]], [1, WO[3]]]);
  c.beginPath(); c.roundRect(cx - w / 2, top, w, MIRROR.h - 18, [w / 2, w / 2, 8, 8]); c.fill();
  c.fillStyle = lg(c, 0, top, 0, GY, [[0, '#EAF4FF'], [0.5, '#D9E4F8'], [1, '#E9DDF7']]);
  c.beginPath(); c.roundRect(cx - w / 2 + 6, top + 6, w - 12, MIRROR.h - 30, [w / 2 - 6, w / 2 - 6, 5, 5]); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)';
  c.beginPath(); c.moveTo(cx - 14, top + 30); c.lineTo(cx - 6, top + 22); c.lineTo(cx - 18, GY - 40); c.lineTo(cx - 22, GY - 46); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(cx + 4, top + 40); c.lineTo(cx + 8, top + 36); c.lineTo(cx - 2, top + 90); c.lineTo(cx - 6, top + 92); c.closePath(); c.fill();
  bow(c, cx, top + 4, 0.95, LV[1], LV[3]);
}
function trophyCup(c, x, y, s, col = 'gold') {
  c.save(); c.translate(x, y); c.scale(s, s);
  const g = col === 'gold' ? goldV(c, -26, 0) : lg(c, 0, -26, 0, 0, [[0, '#F4F4FA'], [1, '#B8B8CC']]);
  c.fillStyle = g;
  c.beginPath(); c.moveTo(-10, -26); c.lineTo(10, -26); c.quadraticCurveTo(10, -10, 2, -8); c.lineTo(2, -4); c.lineTo(-2, -4); c.lineTo(-2, -8); c.quadraticCurveTo(-10, -10, -10, -26); c.fill();
  c.lineWidth = 2.4; c.strokeStyle = g;
  for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 11, -20, 4, d < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, d < 0 ? Math.PI * 1.5 : Math.PI * 0.5); c.stroke(); }
  c.fillStyle = g; c.beginPath(); c.roundRect(-7, -4, 14, 4, 1.5); c.fill();
  c.fillStyle = 'rgba(255,255,255,.65)'; c.fillRect(-6, -24, 2.2, 10);
  c.restore();
}
function drawTrophyArt(c) {
  const cx = X.trophy, w = TROPHY.w, x0 = cx - w / 2, top = GY - TROPHY.h;
  floorShadow(c, cx, w + 10);
  c.fillStyle = lg(c, 0, top, 0, GY, [[0, WO[2]], [1, WO[3]]]); c.beginPath(); c.roundRect(x0, top + 14, w, TROPHY.h - 14, 5); c.fill();
  c.fillStyle = lg(c, 0, top, 0, GY, [[0, '#F8E6DA'], [1, '#EBD3C6']]); c.beginPath(); c.roundRect(x0 + 8, top + 22, w - 16, TROPHY.h - 36, 3); c.fill();
  // หน้าจั่วหูแมว + มงกุฎ
  c.fillStyle = WO[2];
  c.beginPath(); c.moveTo(x0 - 4, top + 18); c.quadraticCurveTo(cx, top - 10, x0 + w + 4, top + 18); c.closePath(); c.fill();
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(cx + d * 30, top + 6); c.lineTo(cx + d * 44, top - 14); c.lineTo(cx + d * 52, top + 8); c.closePath(); c.fill(); }
  crownIcon(c, cx, top + 2, 0.75);
  // ชั้น 3 ชั้น
  const ys = [top + 82, top + 140, GY - 16];
  for (const y of ys) plank(c, x0 + 4, y, w - 8, 7, 2, 1);
  // ชั้นบน: ถ้วยทองสามใบ
  trophyCup(c, cx - 34, ys[0], 0.95); trophyCup(c, cx, ys[0], 1.25); trophyCup(c, cx + 34, ys[0], 0.95, 'silver');
  // ชั้นกลาง: เหรียญ + ดาว + ตุ๊กตาแมว
  for (const [dx, col] of [[-38, GOLD], [-18, '#D9D9E6']]) { c.strokeStyle = col === GOLD ? PK[2] : LV[2]; c.lineWidth = 3; c.beginPath(); c.moveTo(cx + dx - 4, ys[1] - 30); c.lineTo(cx + dx, ys[1] - 16); c.lineTo(cx + dx + 4, ys[1] - 30); c.stroke(); c.fillStyle = col === GOLD ? goldV(c, ys[1] - 18, ys[1] - 4) : col; c.beginPath(); c.arc(cx + dx, ys[1] - 11, 7, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; star(c, cx + dx, ys[1] - 11, 3.6); c.fill(); }
  c.fillStyle = SGOLD; star(c, cx + 12, ys[1] - 14, 10); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; star(c, cx + 10, ys[1] - 16, 3.5); c.fill();
  catFace(c, cx + 40, ys[1] - 14, 11, '#FFFFFF');
  // ชั้นล่าง: หนังสือ + กล่องของขวัญ
  let bx = x0 + 12;
  for (const [col, bw, bh] of [[LV[3], 12, 40], [PK[2], 10, 36], ['#A9D3E8', 13, 42], [LV[2], 11, 34], ['#FFE2A8', 12, 38]]) { c.fillStyle = col; c.beginPath(); c.roundRect(bx, ys[2] - bh, bw, bh, 2); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(bx + 2, ys[2] - bh + 6, bw - 4, 1.6); bx += bw + 1; }
  c.fillStyle = PK[1]; c.beginPath(); c.roundRect(cx + 22, ys[2] - 26, 30, 26, 3); c.fill(); c.fillStyle = LV[2]; c.fillRect(cx + 35, ys[2] - 26, 4, 26); bow(c, cx + 37, ys[2] - 27, 0.6, LV[1], LV[3]);
  c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x0 + 10, top + 24, 2.4, TROPHY.h - 40);
}
function drawSofaArt(c) {
  const cx = X.sofa, w = SOFA.w, x0 = cx - w / 2, top = GY - SOFA.h;
  floorShadow(c, cx, w + 20, 0.18);
  for (const d of [-1, 1]) { c.fillStyle = WO[2]; c.beginPath(); c.roundRect(cx + d * (w / 2 - 22) - 5, GY - 10, 10, 10, [0, 0, 4, 4]); c.fill(); }
  // พนักโค้งหยักสามลอน
  c.fillStyle = lg(c, 0, top, 0, GY - 30, [[0, LV[1]], [1, LV[2]]]);
  c.beginPath(); c.moveTo(x0 + 16, GY - 36); c.lineTo(x0 + 16, top + 26);
  c.quadraticCurveTo(x0 + 16, top + 2, x0 + 50, top + 6); c.quadraticCurveTo(cx - 40, top - 12, cx, top + 2); c.quadraticCurveTo(cx + 40, top - 12, x0 + w - 50, top + 6);
  c.quadraticCurveTo(x0 + w - 16, top + 2, x0 + w - 16, top + 26); c.lineTo(x0 + w - 16, GY - 36); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.moveTo(x0 + 30, top + 12); c.quadraticCurveTo(cx - 40, top - 4, cx - 4, top + 6); c.lineTo(cx - 6, top + 10); c.quadraticCurveTo(cx - 40, top + 2, x0 + 30, top + 16); c.fill();
  for (let i = -2; i <= 2; i++) { c.fillStyle = 'rgba(110,80,170,.25)'; c.beginPath(); c.arc(cx + i * 36, top + 34, 2, 0, TAU); c.fill(); }
  // เบาะนั่ง
  c.fillStyle = lg(c, 0, GY - 46, 0, GY - 14, [[0, LV[1]], [1, LV[3]]]); c.beginPath(); c.roundRect(x0 + 20, GY - 46, w - 40, 32, 10); c.fill();
  c.fillStyle = 'rgba(110,80,170,.2)'; c.fillRect(cx - 0.8, GY - 44, 1.6, 26);
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.roundRect(x0 + 30, GY - 44, w - 60, 2.6, 1.3); c.fill();
  // ที่วางแขนม้วนกลม
  for (const d of [-1, 1]) {
    const ax = d < 0 ? x0 + 14 : x0 + w - 14;
    c.fillStyle = lg(c, 0, GY - 70, 0, GY - 12, [[0, LV[1]], [1, LV[3]]]); c.beginPath(); c.roundRect(ax - 16, GY - 70, 32, 58, 14); c.fill();
    c.fillStyle = LV[0]; c.beginPath(); c.ellipse(ax, GY - 62, 13, 8, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(110,80,170,.22)'; c.beginPath(); c.arc(ax, GY - 62, 4, 0, TAU); c.fill();
  }
  // หมอนอุ้งเท้า
  for (const d of [-1, 1]) { pillow(c, cx + d * 62, GY - 60, 40, 34, '#FFFFFF', CR[2]); pawIcon(c, cx + d * 62, GY - 59, 1.25, PK[2]); }
  c.fillStyle = PK[1]; heart(c, cx, GY - 60, 11); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(cx - 4, GY - 64, 3, 2, -0.5, 0, TAU); c.fill();
}
function drawRecordArt(c) {
  const cx = X.record, top = GY - 66;
  floorShadow(c, cx, 100);
  // ตู้ไม้ขาโค้ง + บานลาเวนเดอร์
  plank(c, cx - 46, top, 92, 8, 3, 1);
  c.fillStyle = lg(c, 0, top + 8, 0, GY - 8, [[0, CR[0]], [1, CR[2]]]); c.beginPath(); c.roundRect(cx - 42, top + 8, 84, GY - top - 18, 3); c.fill();
  for (const d of [-1, 1]) {
    c.fillStyle = lg(c, 0, top + 14, 0, GY - 14, [[0, LV[1]], [1, LV[2]]]); c.beginPath(); c.roundRect(cx + (d < 0 ? -37 : 2), top + 14, 35, GY - top - 30, 4); c.fill();
    c.fillStyle = GOLD; c.beginPath(); c.arc(cx + d * 5, top + 32, 2, 0, TAU); c.fill();
  }
  for (const d of [-1, 1]) { c.fillStyle = WO[2]; c.beginPath(); c.roundRect(cx + d * 34 - 3, GY - 10, 6, 10, [0, 0, 3, 3]); c.fill(); }
  // กล่องเครื่องเล่น
  c.fillStyle = lg(c, 0, top - 18, 0, top, [[0, WO[2]], [1, WO[3]]]); c.beginPath(); c.roundRect(cx - 34, top - 18, 60, 18, 3); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(cx - 32, top - 17, 56, 1.5);
  // ฮอร์นทองรูปดอกไม้ (แผ่นเสียงวาดสด)
  c.strokeStyle = goldV(c, top - 60, top - 18); c.lineWidth = 4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx + 18, top - 18); c.quadraticCurveTo(cx + 22, top - 40, cx + 12, top - 52); c.stroke();
  c.fillStyle = goldV(c, top - 92, top - 46);
  c.beginPath(); c.moveTo(cx + 12, top - 50); c.quadraticCurveTo(cx - 6, top - 62, cx - 18, top - 92); c.quadraticCurveTo(cx + 6, top - 104, cx + 34, top - 96); c.quadraticCurveTo(cx + 30, top - 66, cx + 14, top - 54); c.closePath(); c.fill();
  c.fillStyle = 'rgba(160,110,40,.35)'; c.beginPath(); c.ellipse(cx + 8, top - 95, 22, 7, -0.25, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(cx - 10, top - 88); c.quadraticCurveTo(cx - 2, top - 70, cx + 10, top - 58); c.lineTo(cx + 6, top - 58); c.quadraticCurveTo(cx - 6, top - 72, cx - 13, top - 88); c.fill();
}
function drawRecordLive(c, t) {
  const cx = X.record - 6, y = GY - 66 - 20, u = t - record.t, on = record.on;
  // แผ่นเสียง (หมุนตอนเปิด)
  c.save(); c.translate(cx, y);
  c.scale(1, 0.32);
  c.fillStyle = '#4A3A5A'; c.beginPath(); c.arc(0, 0, 22, 0, TAU); c.fill();
  c.rotate(on ? t * 0.08 : 0);
  c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1;
  for (const r of [9, 14, 18]) { c.beginPath(); c.arc(0, 0, r, 0.2, 1.6); c.stroke(); }
  c.fillStyle = PK[2]; c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill();
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(2, 0, 1.4, 0, TAU); c.fill();
  c.restore();
  // แขนเข็ม
  c.strokeStyle = '#D8D8E2'; c.lineWidth = 2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx + 26, y - 6); c.lineTo(cx + (on ? 10 : 22), y - 1); c.stroke();
  // ตัวโน้ตลอย
  if (on) for (let i = 0; i < 3; i++) {
    const p = ((t * 0.006) + i / 3) % 1, nx = cx + 26 + Math.sin(p * 6 + i) * 8 + p * 20, ny = y - 70 - p * 56;
    c.globalAlpha = Math.sin(p * Math.PI) * 0.9; c.fillStyle = i % 2 ? LV[3] : PK[3];
    c.beginPath(); c.ellipse(nx, ny, 3.6, 2.8, -0.4, 0, TAU); c.fill(); c.fillRect(nx + 2.4, ny - 13, 1.6, 13);
    if (i === 1) c.fillRect(nx + 2.4, ny - 13, 7, 1.8);
  }
  c.globalAlpha = 1;
  if (u < 30) { for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU, d = 10 + u * 1.2; c.globalAlpha = 1 - u / 30; c.fillStyle = i % 2 ? '#FFFFFF' : SGOLD; star(c, cx + 8 + Math.cos(a) * d, y - 50 + Math.sin(a) * d * 0.8, 3, u * 0.1); c.fill(); } c.globalAlpha = 1; }
}
function drawBooksArt(c) {
  const cx = X.books, w = BOOKS.w, x0 = cx - w / 2, top = GY - BOOKS.h;
  floorShadow(c, cx, w + 10);
  c.fillStyle = lg(c, 0, top, 0, GY, [[0, WO[2]], [1, WO[3]]]); c.beginPath(); c.roundRect(x0, top, w, BOOKS.h, 5); c.fill();
  c.fillStyle = lg(c, 0, top, 0, GY, [[0, '#F3DCCB'], [1, '#E6C8B3']]); c.beginPath(); c.roundRect(x0 + 8, top + 10, w - 16, BOOKS.h - 22, 3); c.fill();
  const COLS = [LV[3], PK[2], '#A9D3E8', LV[2], '#FFE2A8', '#B9E3C6', PK[1], LV[1], '#F7B9A6'];
  const rows = [top + 64, top + 118, top + 172, GY - 14];
  for (const [ri, y] of rows.entries()) {
    plank(c, x0 + 4, y, w - 8, 6, 2, 1);
    let bx = x0 + 11, k = ri * 3;
    while (bx < x0 + w - 22) {
      const bw = 8 + hash(k * 3.1) * 6, bh = 30 + hash(k * 1.7) * 14, lean = hash(k * 5.3) > 0.88;
      if (ri === 1 && bx > cx + 6 && bx < cx + 34) { bx += 30; k++; continue; }   // ช่องว่างวางของ
      c.save(); c.translate(bx, y); if (lean) c.rotate(0.18);
      c.fillStyle = COLS[k % COLS.length]; c.beginPath(); c.roundRect(0, -bh, bw, bh, 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(2, -bh + 5, bw - 4, 1.4); c.fillRect(2, -8, bw - 4, 1.4);
      c.restore();
      bx += bw + 1 + (lean ? 4 : 0); k++;
    }
  }
  // ของบนชั้น: ลูกโลกเล็ก
  c.fillStyle = '#A9D3E8'; c.beginPath(); c.arc(cx + 20, rows[1] - 14, 9, 0, TAU); c.fill(); c.fillStyle = '#B9E3C6'; c.beginPath(); c.ellipse(cx + 17, rows[1] - 16, 4, 3, 0.4, 0, TAU); c.fill();
  c.fillStyle = GOLD; c.fillRect(cx + 19, rows[1] - 4, 2, 4);
  // ต้นไม้เล็กบนตู้
  plantAt(c, cx - 30, top, 1, 0.48);
  catFace(c, cx + 28, top - 10, 9, LV[0]);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x0 + 10, top + 12, 2.4, BOOKS.h - 30);
}

/** เพดาน ผนัง พื้น (ห้องนอน) */
export function drawHomeBack(c, camX, vw, t) {
  c.fillStyle = '#B57F52'; c.fillRect(camX - 10, -400, vw + 20, 400);
  drawFloorSegs(c, camX, vw, 'home:floor', HOME_W, (g, x0, x1) => floorRange(g, x0, x1, H_RUGS));
  drawWallSegs(c, camX, vw, 'home:wall', HOME_W, H_BRACKETS);
}
/** ของในห้องนอน (ชิดผนัง หลังตัวน้องทั้งหมด) */
export function drawHomeWorld(c, camX, vw, t) {
  const vis = (x0, x1) => x1 > camX - 40 && x0 < camX + vw + 40;
  const S = sky(), skyK = ':' + S.key;
  // ประตู/ธง/โคมผนัง: ภาพเดียวใช้ซ้ำทุกตำแหน่ง (แคชผูกกับกรอบของชิ้น ไม่ผูกพิกัดโลก)
  for (const x of [X.exit, X.door]) if (vis(x - 80, x + 80)) shaded(c, 'home:door', ...doorBox(x), (g) => doorArt(g, x));
  for (const x of [X.banL, X.banR]) if (vis(x - 40, x + 40)) shaded(c, 'home:banner', x - 40, BEAM_B - 6, 80, 130, (g) => bannerArt(g, x));
  for (const [x, d] of [[X.sconL, 1], [X.sconR, -1]]) if (vis(x - 40, x + 40)) shaded(c, 'home:scon:' + d, x - 28, 120, 56, 60, (g) => sconceArt(g, x, 136, d));
  if (vis(X.plantL - 40, X.plantL + 40)) { c.save(); c.translate(X.plantL, GY); shaded(c, 'hall:plant3:0', -40, -130, 80, 132, (g) => drawPlantArt(g, 0)); c.restore(); }
  if (vis(X.plantR - 40, X.plantR + 40)) { c.save(); c.translate(X.plantR, GY); shaded(c, 'hall:plant3:1', -40, -130, 80, 132, (g) => drawPlantArt(g, 1)); c.restore(); }
  if (vis(X.bed - 160, X.bed + 160)) {
    shaded(c, 'home:bedshelf', X.bed - 84, 50, 168, 110, drawBedShelfArt);
    shaded(c, 'home:bed', X.bed - BED.w / 2 - 14, BED.top - 18, BED.w + 28, GY - BED.top + 26, drawBedArt);
  }
  for (const x of [X.nsL, X.nsR]) if (vis(x - 40, x + 40)) shaded(c, 'home:ns:' + x, x - 38, GY - 112, 76, 120, (g) => nightstandArt(g, x));
  if (vis(X.desk - 130, X.desk + 130)) {
    shaded(c, 'home:frames:desk', X.desk - 90, 110, 160, 90, drawWallFramesArtDesk);
    shaded(c, 'home:desk', X.desk - DESK.w / 2 - 14, GY - DESK.h - 70, DESK.w + 28, DESK.h + 78, drawDeskArt);
    shaded(c, 'home:chair', X.chair - 30, GY - 106, 60, 108, drawChairArt);
  }
  if (vis(X.win - 260, X.win + 260)) {
    cached(c, 'home:win' + skyK, X.win - WINB.w / 2 - 20, WINB.top - 16, WINB.w + 40, WINB.bot - WINB.top + 32, (g) => windowArt(g, X.win, WINB.w, WINB.top, WINB.bot, 1.7));
    twinkle(c, X.win, WINB.w, WINB.top, WINB.bot, 1.7, t);
    sunShaft(c, X.win, WINB, t);
    shaded(c, 'home:curtain', X.win - WINB.w / 2 - 90, BEAM_B, WINB.w + 180, GY - 40 - BEAM_B, (g) => curtainArt(g, X.win, WINB.w, BEAM_B + 10, 168, GY - 64));
    shaded(c, 'home:bench', X.win - BENCH.w / 2 - 14, GY - BENCH.h - 46, BENCH.w + 28, BENCH.h + 54, drawBenchArt);
  }
  if (vis(X.ward - 90, X.ward + 90)) shaded(c, 'home:ward', X.ward - WARD.w / 2 - 10, GY - WARD.h - 14, WARD.w + 20, WARD.h + 22, drawWardArt);
  if (vis(X.mirror - 50, X.mirror + 50)) shaded(c, 'home:mirror', X.mirror - 46, GY - MIRROR.h - 14, 92, MIRROR.h + 22, drawMirrorArt);
  if (vis(X.trophy - 80, X.trophy + 80)) shaded(c, 'home:trophy', X.trophy - TROPHY.w / 2 - 10, GY - TROPHY.h - 20, TROPHY.w + 20, TROPHY.h + 28, drawTrophyArt);
  if (vis(X.sofa - 140, X.sofa + 140)) {
    shaded(c, 'home:frames:sofa', X.sofa - 70, 100, 140, 80, drawWallFramesArtSofa);
    shaded(c, 'home:sofa', X.sofa - SOFA.w / 2 - 16, GY - SOFA.h - 16, SOFA.w + 32, SOFA.h + 24, drawSofaArt);
  }
  if (vis(X.record - 60, X.record + 60)) { shaded(c, 'home:record', X.record - 54, GY - 176, 108, 184, drawRecordArt); drawRecordLive(c, t); }
  if (vis(X.books - 80, X.books + 80)) shaded(c, 'home:books', X.books - BOOKS.w / 2 - 10, GY - BOOKS.h - 76, BOOKS.w + 20, BOOKS.h + 84, drawBooksArt);
  // โคมแขวน + โคมระย้า + แสงโคม (วาดสด)
  for (const [i, x] of [X.lantA, X.lantB].entries()) if (vis(x - 30, x + 30)) { shaded(c, 'home:lant', x - 16, BEAM_B - 2, 32, 132, (g) => hangLanternArt(g, x, 72)); glow(c, x, BEAM_B + 100, 46, 0.42, t, i); }
  if (vis(X.desk - 140, X.desk + 140)) chandelier(c, X.desk, t, 0, 0.78, 1 + 0.5 * S.night);
  for (const [x, d] of [[X.sconL, 1], [X.sconR, -1]]) if (vis(x - 40, x + 40)) glow(c, x + d * 12, 156, 38, 0.4, t, x);
  for (const x of [X.nsL, X.nsR]) if (vis(x - 40, x + 40)) glow(c, x, GY - 96, 34, 0.32, t, x);
  if (vis(X.desk - 40, X.desk + 40)) glow(c, X.desk - DESK.w / 2 + 82, GY - DESK.h - 34, 34, 0.32, t, 7);
}
function drawWallFramesArtDesk(c) {
  frameArt(c, X.desk - 52, 150, 50, 58, '#FFDDB8', [PK[0], LV[1]]);
  frameArt(c, X.desk + 30, 142, 62, 50, '#FFFFFF', ['#DDEBFA', LV[1]]);
}
function drawWallFramesArtSofa(c) {
  frameArt(c, X.sofa - 34, 132, 48, 48, '#C9C3D8', [LV[0], PK[1]], true);
  frameArt(c, X.sofa + 34, 138, 44, 56, '#FFE7C4', [PK[0], LV[0]]);
}
/** ลำแสงจากหน้าต่าง (แดด/แสงจันทร์ตามเวลา) ส่องลงพื้น */
function sunShaft(c, x, W, t) {
  const S = sky(), a = 0.16 * S.day + 0.1 * S.dusk + 0.08 * S.night;
  if (a < 0.02) return;
  c.save(); c.globalAlpha = 0.85 + 0.15 * Math.sin(t * 0.012);
  const col = S.night > 0.5 ? '200,210,255' : S.dusk > 0.4 ? '255,200,170' : '255,244,214';
  c.fillStyle = lg(c, 0, W.top + 60, 0, H, [[0, `rgba(${col},${a.toFixed(3)})`], [1, `rgba(${col},0)`]]);
  c.beginPath(); c.moveTo(x - W.w / 2 + 10, W.top + 70); c.lineTo(x + W.w / 2 - 10, W.top + 70); c.lineTo(x + W.w / 2 - 70, H); c.lineTo(x - W.w / 2 - 110, H); c.closePath(); c.fill();
  c.restore();
}

// ═════════════════════════════ ห้องเลี้ยงน้องแมว ═════════════════════════════
export const NURSE_W = 2400;
const N = {
  door: 80, scon: 150, ban: 204, box: 160, cab: 296, bowls: [384, 424, 464, 504, 544], water: 600, win1: 580, tub: 724,
  condo: 906, dome: 1016, round: 1104, canopy: 1210, house: 1318, basket: 1420, chest: 1520, win2: 1664, plant1: 1792,
  vanity: 1916, gallery: 2068, plant2: 2128, tower: 2214, box2: 2316, sign: 1180,
};
const NWIN = { w: 200, top: 84, bot: 232 };
const N_BRACKETS = [760, 1480, 2160];   // เว้นตรงคอนโด/ชั้นผนัง/โคมแขวน
const N_RUGS = [{ x: 470, w: 250, kind: 2 }, { x: 1160, w: 380, kind: 0 }, { x: 1890, w: 260, kind: 1 }];
// ชั้นติดผนัง (กลาง x, ระดับ y ผิวบน, ครึ่งกว้าง) + เปลญวน
const WSHELF = [[1030, 206, 30], [1094, 156, 30], [1256, 158, 30], [1330, 208, 30], [1396, 140, 28]];
const HAMMOCK = { x0: 1128, x1: 1222, y: 112, sag: 22 };
const CONDO = { w: 176, h: 254 };
// ชั้นคอนโด [กลาง x, สูงจากพื้น, ครึ่งกว้าง]
const CPERCH = [[N.condo - 50, 76, 30], [N.condo + 44, 132, 38], [N.condo - 40, 186, 34], [N.condo + 30, 246, 40]];
const TOWER = { w: 90, h: 168 };

/** ชุดของห้องแมว: 0 = ห้องโล่ง (ยังไม่มีน้อง) · 1 = ชุดเริ่มต้น · 2 = ของครบ */
export const NURSE_STAGE = (() => {
  const q = new URLSearchParams(location.search).get('home');
  if (q === 'empty') return 0;
  if (q === 'starter') return 1;
  if (q === 'full') return 2;
  if (new URLSearchParams(location.search).get('kits')) return 2;   // น้องตัวอย่าง (home-cats.js) = ห้องของครบ
  try { return roomCats().length ? 2 : 0; } catch { return 0; }
})();
const has = (tier) => NURSE_STAGE >= tier;

/**
 * ที่ที่น้องในห้องไปอยู่ได้ (home-cats.js) — ตามชุดของในห้องตอนนี้
 *   roam = ช่วงพื้นที่เดินเล่น · beds = ที่นอน (y = ระดับเท้าตอนนั่งหลับในที่นอน) · bowls = ชามอาหาร (side = นั่งข้างซ้าย/ขวาของชาม)
 *   seat = ม้านั่งริมหน้าต่าง (กระโดดขึ้นไปนั่งดูวิว)
 */
export const NURSE_SPOTS = {
  roam: [N.door + 90, NURSE_W - 120],
  beds: has(2)
    ? [{ x: N.dome, y: GY - 4 }, { x: N.round, y: GY - 14 }, { x: N.canopy, y: GY - 18 }, { x: N.house, y: GY - 4 }, { x: N.basket, y: GY - 26 }]
    : has(1) ? [{ x: N.round, y: GY - 14 }] : [],
  bowls: (has(2) ? N.bowls : has(1) ? [N.bowls[0]] : []).map((x, i) => ({ x, y: GY, side: i % 2 ? 1 : -1 })),
  seat: has(2) ? { spots: [{ x: N.win2 - 50, y: GY - 46 }, { x: N.win2 + 50, y: GY - 46 }] } : null,
};

export const NURSE_PLACES = [
  { id: 'nDoor', kind: 'door', to: 'home', act: 'กลับห้องนอน', name: 'ประตูกลับห้องนอน', x: N.door - 50, w: 100, h: 214 },
  { id: 'nBox', kind: 'box', name: 'กล่องต้อนรับ', x: N.box - 30, w: 60, h: 44 },
  ...(NURSE_STAGE === 0 ? [{ id: 'nSign', kind: 'soon', act: 'อ่านป้าย', name: 'ป้ายห้องว่าง', x: N.sign - 40, w: 80, h: 110, msg: 'ยังไม่มีน้องมาอยู่เลย · ไปเปิดตู้กาช่าหรือรับเลี้ยงน้องที่หน้าแรกของเกมได้นะ แล้วห้องนี้จะมีของใช้ให้น้อง' }] : []),
  ...(has(1) ? [{ id: 'nFood', kind: 'soon', act: 'ให้อาหาร', name: 'มุมให้อาหาร', x: N.cab - 70, w: 280, h: 100, msg: 'มุมให้อาหาร · ขั้นถัดไปจะเทอาหารลงชามให้น้อง ๆ ได้ที่นี่' }] : []),
  ...(has(2) ? [
    { id: 'nTub', kind: 'soon', act: 'อาบน้ำ', name: 'อ่างอาบน้ำแมว', x: N.tub - 70, w: 140, h: 96, msg: 'อ่างอาบน้ำ · ขั้นถัดไปจะพาน้องมาอาบน้ำได้ที่นี่' },
    { id: 'nChest', kind: 'soon', act: 'เล่นกับน้อง', name: 'หีบของเล่น', x: N.chest - 36, w: 72, h: 60, msg: 'หีบของเล่น · ขั้นถัดไปจะหยิบลูกบอลมาโยนเล่นกับน้องได้' },
    { id: 'nSeat', kind: 'bench', name: 'ม้านั่งริมหน้าต่าง', x: N.win2 - 90, w: 180, h: 70, seats: [N.win2 - 48, N.win2 + 48], sitDy: 42 },
    { id: 'nVanity', kind: 'soon', act: 'แต่งตัวน้อง', name: 'โต๊ะแต่งตัวน้อง', x: N.vanity - 80, w: 160, h: 100, msg: 'โต๊ะแต่งตัวน้อง · ขั้นถัดไปจะใส่โบว์ใส่ชุดให้น้องได้ที่นี่' },
  ] : []),
];
for (const p of NURSE_PLACES) p.door = p.x + p.w / 2;
export const NURSE_SPAWN = N.door + 120;

export const NURSE_SURFACES = (() => {
  const S = [];
  if (has(1)) S.push(flat('nCab', N.cab - 66, N.cab + 66, GY - 98));
  if (has(2)) {
    S.push(flat('nTub', N.tub - 64, N.tub + 64, GY - 72));
    for (const [i, [x, h, hw]] of CPERCH.entries()) S.push(flat('condo:' + i, x - hw, x + hw, GY - h, { soft: true }));
    for (const [i, [x, y, hw]] of WSHELF.entries()) S.push(flat('nShelf:' + i, x - hw, x + hw, y, { soft: true }));
    S.push(flat('nHammock', HAMMOCK.x0 + 14, HAMMOCK.x1 - 14, HAMMOCK.y + HAMMOCK.sag - 4, { soft: true }));
    S.push(flat('nHouse', N.house - 40, N.house + 40, GY - 66), flat('nChest', N.chest - 34, N.chest + 34, GY - 52));
    S.push(flat('nSeat', N.win2 - 92, N.win2 + 92, GY - 46, { soft: true }));
    S.push(flat('nVanity', N.vanity - 82, N.vanity + 82, GY - 92));
    S.push(flat('tower:top', N.tower - 34, N.tower + 34, GY - TOWER.h), flat('tower:mid', N.tower - 40, N.tower + 4, GY - 92, { soft: true }));
  }
  for (const s of S) { s.x0 = s.pts[0][0]; s.x1 = s.pts[s.pts.length - 1][0]; }
  return S;
})();

// ── ชิ้นในห้องแมว ──
/** กล่องกระดาษ (กล่องต้อนรับ — มุดได้) · front = ผนังหน้ากล่อง (วาดทับน้องที่มุดอยู่) */
function boxArt(c, x, w = 60, h = 40, front = false) {
  const x0 = x - w / 2, top = GY - h;
  if (!front) {
    floorShadow(c, x, w + 10);
    c.fillStyle = '#C79A64'; c.beginPath(); c.moveTo(x0 + 3, top); c.lineTo(x0 + w - 3, top); c.lineTo(x0 + w - 8, top - 10); c.lineTo(x0 + 8, top - 10); c.closePath(); c.fill();
    for (const d of [-1, 1]) { c.fillStyle = '#E2B87E'; c.beginPath(); c.moveTo(x + d * (w / 2), top); c.lineTo(x + d * (w / 2 + 14), top - 16); c.lineTo(x + d * (w / 2 - 4), top - 12); c.closePath(); c.fill(); }
    return;
  }
  c.fillStyle = lg(c, 0, top, 0, GY, [[0, '#EBC48C'], [1, '#D5A56C']]); c.beginPath(); c.roundRect(x0, top, w, h, 3); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x0 + 3, top + 2, w - 6, 1.6);
  c.fillStyle = 'rgba(150,100,55,.25)'; c.fillRect(x - 6, top, 12, 12);
  pawIcon(c, x, top + h * 0.6, 1.3, 'rgba(160,105,60,.45)');
  c.fillStyle = 'rgba(120,80,40,.2)'; c.fillRect(x0, GY - 4, w, 4);
}
/** ป้ายห้องว่าง (ไม้ตั้งพื้น ลายอุ้งเท้า — ตัวหนังสือวาดสด) */
function signArt(c) {
  const x = N.sign;
  floorShadow(c, x, 80, 0.14);
  c.fillStyle = lg(c, x - 4, 0, x + 4, 0, [[0, WO[3]], [0.5, WO[2]], [1, WO[4]]]); c.fillRect(x - 4, GY - 60, 8, 60);
  c.fillStyle = lg(c, 0, GY - 114, 0, GY - 54, [[0, WO[0]], [1, WO[2]]]); c.beginPath(); c.roundRect(x - 64, GY - 114, 128, 60, 9); c.fill();
  c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x - 58, GY - 112, 116, 1.6);
  c.fillStyle = CR[0]; c.beginPath(); c.roundRect(x - 57, GY - 107, 114, 46, 6); c.fill();
  pawIcon(c, x - 50, GY - 101, 0.5, PK[2]); pawIcon(c, x + 50, GY - 67, 0.5, LV[2]);
  bow(c, x, GY - 116, 0.7, PK[1], PK[3]);
}
function cabinetArt(c) {
  const cx = N.cab, w = 132, top = GY - 98;
  floorShadow(c, cx, w + 20);
  // ชั้นติดผนังสองชั้น + โหลอาหาร + ต้นไม้เถาห้อย
  for (const [y, n] of [[top - 52, 3], [top - 104, 2]]) {
    plank(c, cx - 66, y, 132, 8, 3, 1);
    for (const d of [-1, 1]) { c.fillStyle = WO[2]; c.beginPath(); c.moveTo(cx + d * 50, y + 8); c.lineTo(cx + d * 50, y + 20); c.lineTo(cx + d * 40, y + 8); c.closePath(); c.fill(); }
    for (let i = 0; i < n; i++) jar(c, cx - (n - 1) * 22 + i * 44 - (n === 2 ? 14 : 0), y, i + (n === 2 ? 3 : 0));
  }
  plantAt(c, cx + 40, top - 104, 1, 0.42);
  // ตู้ครีมบานลาเวนเดอร์ลายอุ้งเท้า
  plank(c, cx - w / 2 - 4, top, w + 8, 9, 3, 1);
  c.fillStyle = lg(c, 0, top + 9, 0, GY - 6, [[0, CR[0]], [1, CR[2]]]); c.beginPath(); c.roundRect(cx - w / 2, top + 9, w, GY - top - 15, 3); c.fill();
  for (const d of [-1, 1]) {
    c.fillStyle = lg(c, 0, top + 16, 0, GY - 12, [[0, LV[1]], [1, LV[2]]]); c.beginPath(); c.roundRect(cx + (d < 0 ? -w / 2 + 7 : 3), top + 16, w / 2 - 10, GY - top - 30, 5); c.fill();
    pawIcon(c, cx + d * (w / 4), top + 44, 1.1, 'rgba(255,255,255,.75)');
    c.fillStyle = GOLD; c.beginPath(); c.arc(cx + d * 7, top + 54, 2.2, 0, TAU); c.fill();
  }
  for (const d of [-1, 1]) { c.fillStyle = WO[2]; c.beginPath(); c.roundRect(cx + d * (w / 2 - 10) - 4, GY - 8, 8, 8, [0, 0, 3, 3]); c.fill(); }
  // โหลบนตู้
  jar(c, cx - 36, top, 5, 0.9); jar(c, cx + 34, top, 1, 0.9);
}
/** โหลอาหารแมวแก้ว (ฝาสี · เม็ดอาหารข้างใน) */
function jar(c, x, y, k, s = 1) {
  const lid = [LV[2], PK[2], '#A9D3E8', '#B9E3C6', '#FFE2A8', LV[1]][k % 6], food = ['#D99A5B', '#C9884C', '#E6B07A'][k % 3];
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(230,240,250,.75)'; c.beginPath(); c.roundRect(-12, -34, 24, 34, [6, 6, 4, 4]); c.fill();
  c.fillStyle = food; c.beginPath(); c.roundRect(-10, -20 + (k % 3) * 3, 20, 18 - (k % 3) * 3, 3); c.fill();
  for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(255,240,210,.5)'; c.beginPath(); c.arc(-6 + (i % 3) * 6, -14 + Math.floor(i / 3) * 6 + (k % 3) * 2, 1.6, 0, TAU); c.fill(); }
  c.fillStyle = lid; c.beginPath(); c.roundRect(-13, -40, 26, 8, 3); c.fill();
  c.fillStyle = 'rgba(255,255,255,.65)'; c.fillRect(-9, -30, 2.4, 22);
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.roundRect(-7, -12, 14, 8, 2); c.fill();
  c.fillStyle = lid; c.beginPath(); c.ellipse(-1, -8, 4, 2, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(3, -8); c.lineTo(6, -10.5); c.lineTo(6, -5.5); c.closePath(); c.fill();
  c.restore();
}
function bowlArt(c, x, k) {
  const col = [[PK[1], PK[3]], [LV[1], LV[3]], ['#CDE6F6', '#8FBBDC'], ['#FFE2C2', '#E9AE77'], ['#CFF0DD', '#82C79E']][k % 5];
  c.fillStyle = 'rgba(120,70,80,.16)'; c.beginPath(); c.ellipse(x, GY + 2, 20, 4.5, 0, 0, TAU); c.fill();
  c.fillStyle = '#C98E55'; c.beginPath(); c.ellipse(x, GY - 13, 13, 4.2, 0, 0, TAU); c.fill();
  for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? '#E2A86C' : '#B97C45'; c.beginPath(); c.arc(x - 9 + i * 3, GY - 14 - Math.sin(i * 0.9) * 2.5, 2, 0, TAU); c.fill(); }
  c.fillStyle = lg(c, 0, GY - 14, 0, GY, [[0, col[0]], [1, col[1]]]);
  c.beginPath(); c.moveTo(x - 17, GY - 13); c.lineTo(x + 17, GY - 13); c.quadraticCurveTo(x + 15, GY, x + 9, GY); c.lineTo(x - 9, GY); c.quadraticCurveTo(x - 15, GY, x - 17, GY - 13); c.fill();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x - 8, GY - 8, 3, 2, -0.4, 0, TAU); c.fill();
  pawIcon(c, x + 3, GY - 7, 0.5, 'rgba(255,255,255,.75)');
}
function waterArt(c) {
  const x = N.water;
  floorShadow(c, x, 50);
  c.fillStyle = lg(c, 0, GY - 22, 0, GY, [[0, CR[0]], [1, CR[2]]]); c.beginPath(); c.roundRect(x - 20, GY - 20, 40, 20, [10, 10, 4, 4]); c.fill();
  c.fillStyle = '#9FD3F0'; c.beginPath(); c.ellipse(x, GY - 19, 16, 4, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(180,225,250,.75)'; c.beginPath(); c.roundRect(x - 14, GY - 70, 28, 50, [12, 12, 4, 4]); c.fill();
  c.fillStyle = 'rgba(120,190,235,.45)'; c.beginPath(); c.roundRect(x - 12, GY - 50, 24, 28, [4, 4, 3, 3]); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(x - 9, GY - 64, 3, 38);
  c.fillStyle = LV[2]; c.beginPath(); c.roundRect(x - 8, GY - 76, 16, 8, 3); c.fill();
}
function tubArt(c) {
  const cx = N.tub, w = 142, top = GY - 74;
  floorShadow(c, cx, w + 20);
  // ฝักบัวทองโค้ง
  c.strokeStyle = goldV(c, top - 60, top); c.lineWidth = 4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - w / 2 + 16, top + 6); c.lineTo(cx - w / 2 + 16, top - 44); c.quadraticCurveTo(cx - w / 2 + 16, top - 62, cx - w / 2 + 36, top - 60); c.stroke();
  c.fillStyle = goldV(c, top - 64, top - 50); c.beginPath(); c.moveTo(cx - w / 2 + 30, top - 58); c.lineTo(cx - w / 2 + 48, top - 58); c.lineTo(cx - w / 2 + 44, top - 50); c.lineTo(cx - w / 2 + 34, top - 50); c.closePath(); c.fill();
  // ขาสิงห์ทอง
  for (const d of [-1, 1]) { c.fillStyle = goldV(c, GY - 14, GY); c.beginPath(); c.moveTo(cx + d * (w / 2 - 22), GY - 16); c.quadraticCurveTo(cx + d * (w / 2 - 12), GY - 6, cx + d * (w / 2 - 6), GY); c.lineTo(cx + d * (w / 2 - 20), GY); c.closePath(); c.fill(); }
  // ตัวอ่างขาว ขอบม้วน
  c.fillStyle = lg(c, 0, top, 0, GY - 10, [[0, '#FFFFFF'], [1, '#E6E0F0']]);
  c.beginPath(); c.moveTo(cx - w / 2, top + 6); c.lineTo(cx + w / 2, top + 6); c.quadraticCurveTo(cx + w / 2 - 6, GY - 14, cx + w / 2 - 30, GY - 12); c.lineTo(cx - w / 2 + 30, GY - 12); c.quadraticCurveTo(cx - w / 2 + 6, GY - 14, cx - w / 2, top + 6); c.fill();
  c.fillStyle = LV[0]; c.beginPath(); c.roundRect(cx - w / 2 - 4, top, w + 8, 10, 5); c.fill();
  c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.roundRect(cx - w / 2 + 4, top + 1.5, w - 8, 2.4, 1.2); c.fill();
  // ฟองล้นขอบ
  for (let i = 0; i < 9; i++) { const bx = cx - w / 2 + 14 + i * ((w - 28) / 8), r = 7 + hash(i * 3.1) * 6; c.fillStyle = i % 2 ? '#FFFFFF' : '#F3EEFB'; c.beginPath(); c.arc(bx, top - 2 - hash(i * 1.7) * 6, r, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(220,200,240,.6)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(cx - 30 + i * 22, top - 6, 2, 0, TAU); c.fill(); }
  // ตราอุ้งเท้าหน้าอ่าง
  c.fillStyle = PK[0]; c.beginPath(); c.arc(cx, top + 34, 13, 0, TAU); c.fill();
  pawIcon(c, cx, top + 35, 1.1, PK[2]);
}
function drawTubLive(c, t) {
  const cx = N.tub, top = GY - 74;
  for (let i = 0; i < 4; i++) {
    const p = ((t * 0.004) + i * 0.27) % 1, x = cx - 40 + i * 26 + Math.sin(t * 0.02 + i) * 4, y = top - 8 - p * 46;
    c.globalAlpha = Math.sin(p * Math.PI) * 0.75; c.strokeStyle = '#FFFFFF'; c.lineWidth = 1.2; c.fillStyle = 'rgba(220,235,255,.35)';
    c.beginPath(); c.arc(x, y, 3 + i % 2 * 2, 0, TAU); c.fill(); c.stroke();
  }
  c.globalAlpha = 1;
}
function condoArt(c) {
  const cx = N.condo, w = CONDO.w;
  floorShadow(c, cx, w + 20, 0.18);
  // ฐาน
  c.fillStyle = lg(c, 0, GY - 16, 0, GY, [[0, LV[1]], [1, LV[3]]]); c.beginPath(); c.roundRect(cx - w / 2, GY - 16, w, 16, 6); c.fill();
  // เสาเชือกป่าน
  const post = (x, top, bot) => {
    c.fillStyle = lg(c, x - 8, 0, x + 8, 0, [[0, '#D8BE95'], [0.5, '#F2E2C2'], [1, '#C9AC80']]); c.fillRect(x - 8, top, 16, bot - top);
    c.strokeStyle = 'rgba(150,110,60,.35)'; c.lineWidth = 1; for (let y = top + 3; y < bot; y += 4) { c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x + 8, y + 2); c.stroke(); }
  };
  post(cx - 50, GY - 186, GY - 16); post(cx + 30, GY - 246, GY - 16); post(cx + 44, GY - 132, GY - 16);
  // บ้านแมวกล่องหน้าแมว (ชั้นล่างขวา)
  const hx = cx + 30, hy = GY - 132;
  c.fillStyle = lg(c, 0, hy, 0, GY - 16, [[0, '#FBEBD3'], [1, '#EBCFA9']]); c.beginPath(); c.roundRect(hx - 44, hy + 8, 88, GY - 16 - hy - 8, 6); c.fill();
  c.fillStyle = '#8B6A9C'; c.beginPath(); c.arc(hx, hy + 60, 20, Math.PI, 0); c.lineTo(hx + 20, GY - 22); c.lineTo(hx - 20, GY - 22); c.closePath(); c.fill();
  for (const d of [-1, 1]) { c.fillStyle = '#8B6A9C'; c.beginPath(); c.moveTo(hx + d * 18, hy + 48); c.lineTo(hx + d * 22, hy + 32); c.lineTo(hx + d * 8, hy + 41); c.closePath(); c.fill(); }
  // ชั้นนุ่ม (เบาะ) ทั้งหมด
  const CC = [[LV[1], LV[3]], [PK[1], PK[3]], [LV[1], LV[3]], ['#FFE6C8', '#E8B484']];
  for (const [i, [x, h, hw]] of CPERCH.entries()) {
    c.fillStyle = lg(c, 0, GY - h - 4, 0, GY - h + 10, CC[i].map((col, j) => [j, col])); c.beginPath(); c.roundRect(x - hw, GY - h - 3, hw * 2, 13, 6); c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.roundRect(x - hw + 6, GY - h - 1.5, hw * 2 - 12, 2.2, 1.1); c.fill();
  }
  // บันไดเล็กขึ้นชั้นแรก
  c.strokeStyle = WO[2]; c.lineWidth = 3;
  c.beginPath(); c.moveTo(cx - 84, GY - 16); c.lineTo(cx - 70, GY - 74); c.moveTo(cx - 70, GY - 16); c.lineTo(cx - 58, GY - 74); c.stroke();
  for (let i = 1; i < 5; i++) { const u = i / 5; c.beginPath(); c.moveTo(cx - 84 + 14 * u, GY - 16 - 58 * u); c.lineTo(cx - 70 + 12 * u, GY - 16 - 58 * u); c.stroke(); }
  crownIcon(c, CPERCH[3][0], GY - CPERCH[3][1] - 6, 0.6);
}
function drawCondoToy(c, t) {
  const x = N.condo + 64, y0 = GY - 246 + 4, a = Math.sin(t * 0.04) * 0.25;
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.2;
  const ex = x + Math.sin(a) * 40, ey = y0 + Math.cos(a) * 40;
  c.beginPath(); c.moveTo(x, y0); c.lineTo(ex, ey); c.stroke();
  c.fillStyle = PK[2]; c.beginPath(); c.arc(ex, ey + 5, 6, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(ex - 2, ey + 3, 1.8, 0, TAU); c.fill();
}
function wallShelvesArt(c) {
  for (const [x, y, hw] of WSHELF) {
    plank(c, x - hw, y, hw * 2, 8, 3, 1);
    c.fillStyle = LV[1]; c.beginPath(); c.roundRect(x - hw + 4, y - 5, hw * 2 - 8, 7, 3.5); c.fill();
    for (const d of [-1, 1]) { c.fillStyle = WO[2]; c.beginPath(); c.moveTo(x + d * (hw - 10), y + 8); c.lineTo(x + d * (hw - 10), y + 22); c.lineTo(x + d * (hw - 22), y + 8); c.closePath(); c.fill(); }
  }
  // เปลญวนผ้าครีม แขวนห่วงทอง
  const { x0, x1, y, sag } = HAMMOCK;
  for (const x of [x0, x1]) { c.fillStyle = goldV(c, y - 30, y); c.beginPath(); c.roundRect(x - 4, y - 30, 8, 30, 3); c.fill(); }
  c.strokeStyle = WO[3]; c.lineWidth = 1.2;
  for (const d of [0, 1]) { const x = d ? x1 : x0; for (const k of [-6, 0, 6]) { c.beginPath(); c.moveTo(x, y - 2); c.lineTo(x + (d ? -14 : 14) + k * 0.5, y + 6); c.stroke(); } }
  // ผ้าเปล: ผ้าลาเวนเดอร์หย่อนเป็นแอ่ง ขอบบนครีมพับ (ด้านในมืดกว่า เห็นเป็นแอ่งให้น้องนอน)
  const mx = (x0 + x1) / 2;
  c.fillStyle = lg(c, 0, y, 0, y + sag * 2 + 8, [[0, LV[1]], [1, LV[3]]]);
  c.beginPath(); c.moveTo(x0 + 10, y + 4); c.quadraticCurveTo(mx, y + sag * 2 + 12, x1 - 10, y + 4); c.quadraticCurveTo(mx, y + sag * 2 - 26, x0 + 10, y + 4); c.fill();
  c.fillStyle = 'rgba(110,80,170,.22)'; c.beginPath(); c.moveTo(x0 + 16, y + 6); c.quadraticCurveTo(mx, y + sag * 2 - 20, x1 - 16, y + 6); c.quadraticCurveTo(mx, y + sag * 2 - 30, x0 + 16, y + 6); c.fill();
  c.strokeStyle = CR[0]; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0 + 10, y + 4); c.quadraticCurveTo(mx, y + sag * 2 - 26, x1 - 10, y + 4); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.2; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(x0 + 18, y + 12); c.quadraticCurveTo(mx, y + sag * 2 + 4, x1 - 18, y + 12); c.stroke(); c.setLineDash([]);
  pawIcon(c, mx, y + sag + 8, 0.9, 'rgba(255,255,255,.7)');
}
function domeBedArt(c) {
  const x = N.dome;
  floorShadow(c, x, 86);
  c.fillStyle = lg(c, 0, GY - 64, 0, GY, [[0, LV[1]], [1, LV[3]]]); c.beginPath(); c.moveTo(x - 38, GY - 4); c.quadraticCurveTo(x - 40, GY - 66, x, GY - 66); c.quadraticCurveTo(x + 40, GY - 66, x + 38, GY - 4); c.closePath(); c.fill();
  c.fillStyle = '#7E64A8'; c.beginPath(); c.moveTo(x - 18, GY - 6); c.quadraticCurveTo(x - 20, GY - 40, x, GY - 40); c.quadraticCurveTo(x + 20, GY - 40, x + 18, GY - 6); c.closePath(); c.fill();
  c.fillStyle = CR[1]; c.beginPath(); c.ellipse(x, GY - 6, 18, 5, 0, 0, TAU); c.fill();
  c.fillStyle = lg(c, 0, GY - 10, 0, GY, [[0, LV[0]], [1, LV[2]]]); c.beginPath(); c.roundRect(x - 42, GY - 10, 84, 10, 5); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(x - 16, GY - 50, 10, 5, -0.6, 0, TAU); c.fill();
  bow(c, x + 22, GY - 58, 0.8, PK[1], PK[3]);
}
function roundBedArt(c) {
  const x = N.round;
  floorShadow(c, x, 84);
  c.fillStyle = lg(c, 0, GY - 30, 0, GY, [[0, '#FFE6C8'], [1, '#E8B484']]); c.beginPath(); c.ellipse(x, GY - 13, 40, 15, 0, 0, TAU); c.fill();
  c.fillStyle = '#FFF6EA'; c.beginPath(); c.ellipse(x, GY - 19, 28, 8, 0, 0, TAU); c.fill();
  c.fillStyle = lg(c, 0, GY - 30, 0, GY - 16, [[0, '#FFF1DD'], [1, '#F6D2A6']]); c.beginPath(); c.ellipse(x, GY - 22, 40, 8, 0, Math.PI, 0); c.fill();
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(x - 14, GY - 26, 10, 2.4, 0, 0, TAU); c.fill();
  pawIcon(c, x + 20, GY - 8, 0.7, 'rgba(255,255,255,.7)');
}
function canopyBedArt(c) {
  const x = N.canopy, top = GY - 112;
  floorShadow(c, x, 110);
  // ผ้าม่านโปร่งด้านหลัง + หลังคาโดมลาเวนเดอร์ + โบว์
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(x - 40, top + 20); c.quadraticCurveTo(x - 50, GY - 30, x - 46, GY - 10); c.lineTo(x + 46, GY - 10); c.quadraticCurveTo(x + 50, GY - 30, x + 40, top + 20); c.closePath(); c.fill();
  for (const d of [-1, 1]) {
    c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.moveTo(x + d * 40, top + 22); c.quadraticCurveTo(x + d * 54, top + 60, x + d * 48, GY - 12); c.lineTo(x + d * 36, GY - 12); c.quadraticCurveTo(x + d * 42, top + 60, x + d * 28, top + 22); c.closePath(); c.fill();
    bow(c, x + d * 44, top + 58, 0.6, LV[2], LV[3]);
  }
  c.fillStyle = lg(c, 0, top, 0, top + 30, [[0, LV[1]], [1, LV[3]]]); c.beginPath(); c.moveTo(x - 46, top + 24); c.quadraticCurveTo(x, top - 24, x + 46, top + 24);
  for (let i = 0; i < 4; i++) { const xa = x + 46 - i * 23, xb = xa - 23; c.quadraticCurveTo((xa + xb) / 2, top + 34, xb, top + 24); }
  c.closePath(); c.fill();
  c.fillStyle = goldV(c, top - 12, top); c.beginPath(); c.arc(x, top - 2, 4, 0, TAU); c.fill();
  // เบาะเตียง
  c.fillStyle = lg(c, 0, GY - 30, 0, GY, [[0, LV[1]], [1, LV[3]]]); c.beginPath(); c.roundRect(x - 44, GY - 26, 88, 26, 10); c.fill();
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(x, GY - 24, 34, 6, 0, 0, TAU); c.fill();
  pillow(c, x - 18, GY - 32, 26, 16, '#FFFFFF', CR[2]); c.fillStyle = PK[1]; heart(c, x + 18, GY - 32, 7); c.fill();
}
function houseBedArt(c) {
  const x = N.house, top = GY - 66;
  floorShadow(c, x, 96);
  c.fillStyle = lg(c, 0, top, 0, GY, [[0, '#FFF0C6'], [1, '#F2CD86']]); c.beginPath(); c.roundRect(x - 40, top, 80, 66, 6); c.fill();
  for (const d of [-1, 1]) { c.fillStyle = '#F2CD86'; c.beginPath(); c.moveTo(x + d * 40, top + 4); c.lineTo(x + d * 34, top - 16); c.lineTo(x + d * 20, top + 2); c.closePath(); c.fill(); c.fillStyle = PK[1]; c.beginPath(); c.moveTo(x + d * 35, top + 2); c.lineTo(x + d * 33, top - 9); c.lineTo(x + d * 25, top + 2); c.closePath(); c.fill(); }
  c.fillStyle = '#9C7BB0'; c.beginPath(); c.arc(x, top + 34, 18, Math.PI, 0); c.lineTo(x + 18, GY - 4); c.lineTo(x - 18, GY - 4); c.closePath(); c.fill();
  for (const d of [-1, 1]) { c.fillStyle = '#9C7BB0'; c.beginPath(); c.moveTo(x + d * 16, top + 24); c.lineTo(x + d * 20, top + 8); c.lineTo(x + d * 6, top + 17); c.closePath(); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(x - 36, top + 3, 72, 2);
  for (const d of [-1, 1]) pawIcon(c, x + d * 30, GY - 16, 0.6, 'rgba(200,150,80,.4)');
}
function basketArt(c) {
  const x = N.basket;
  floorShadow(c, x, 80);
  c.strokeStyle = '#D9A86A'; c.lineWidth = 3; c.beginPath(); c.arc(x, GY - 32, 28, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  c.fillStyle = lg(c, 0, GY - 34, 0, GY, [[0, '#F0C98F'], [1, '#C9955A']]);
  c.beginPath(); c.moveTo(x - 36, GY - 30); c.lineTo(x + 36, GY - 30); c.lineTo(x + 30, GY - 2); c.lineTo(x - 30, GY - 2); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(150,100,50,.3)'; c.lineWidth = 1;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - 34 + i, GY - 24 + i * 6); c.lineTo(x + 34 - i, GY - 24 + i * 6); c.stroke(); }
  for (let i = -5; i <= 5; i++) { c.beginPath(); c.moveTo(x + i * 6, GY - 30); c.lineTo(x + i * 5.2, GY - 2); c.stroke(); }
  c.fillStyle = PK[1]; c.beginPath(); c.ellipse(x, GY - 31, 32, 6, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(x - 10, GY - 33, 9, 2, 0, 0, TAU); c.fill();
}
function chestArt(c) {
  const x = N.chest, top = GY - 52;
  floorShadow(c, x, 86);
  // ฝาเปิดพิงด้านหลัง
  c.fillStyle = lg(c, 0, top - 30, 0, top, [[0, WO[1]], [1, WO[3]]]); c.beginPath(); c.moveTo(x - 34, top); c.lineTo(x - 30, top - 26); c.quadraticCurveTo(x, top - 36, x + 30, top - 26); c.lineTo(x + 34, top); c.closePath(); c.fill();
  // ลูกไหมพรมล้น
  for (const [dx, dy, col] of [[-16, -6, PK[2]], [4, -10, LV[2]], [20, -4, '#A9D3E8'], [-4, -2, '#FFE2A8']]) {
    c.fillStyle = col; c.beginPath(); c.arc(x + dx, top + dy, 9, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; for (const a of [0.3, 1.1, 1.9]) { c.beginPath(); c.arc(x + dx, top + dy, 6, a, a + 1.6); c.stroke(); }
  }
  c.fillStyle = lg(c, 0, top, 0, GY, [[0, WO[1]], [1, WO[3]]]); c.beginPath(); c.roundRect(x - 34, top, 68, 52, 5); c.fill();
  for (const y of [top + 12, GY - 12]) { c.fillStyle = goldV(c, y - 3, y + 3); c.fillRect(x - 34, y - 2.5, 68, 5); }
  c.fillStyle = goldV(c, top + 20, top + 34); c.beginPath(); c.roundRect(x - 7, top + 20, 14, 14, 3); c.fill();
  c.fillStyle = '#9C6A3C'; c.beginPath(); c.arc(x, top + 26, 2, 0, TAU); c.fill();
  // เชือกไหมพรมห้อย
  c.strokeStyle = PK[2]; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 16, top - 2); c.bezierCurveTo(x - 40, top + 10, x - 30, GY - 12, x - 44, GY - 2); c.stroke();
}
function winSeatArt(c) {
  const cx = N.win2, w = 184, top = GY - 46;
  floorShadow(c, cx, w + 10);
  c.fillStyle = lg(c, 0, top, 0, GY, [[0, WO[1]], [1, WO[3]]]); c.beginPath(); c.roundRect(cx - w / 2, top + 6, w, 40, 4); c.fill();
  for (let i = 0; i < 2; i++) { const dx = cx - w / 2 + 10 + i * (w / 2 - 6); c.fillStyle = lg(c, 0, top + 14, 0, GY - 6, [[0, WO[0]], [1, WO[1]]]); c.beginPath(); c.roundRect(dx, top + 14, w / 2 - 16, 26, 4); c.fill(); c.fillStyle = GOLD; c.beginPath(); c.arc(dx + w / 4 - 8, top + 27, 2, 0, TAU); c.fill(); }
  c.fillStyle = lg(c, 0, top - 6, 0, top + 8, [[0, LV[1]], [1, LV[3]]]); c.beginPath(); c.roundRect(cx - w / 2 - 4, top - 4, w + 8, 14, 7); c.fill();
  pillow(c, cx - 62, top - 18, 36, 28, '#FFF1D6', '#F2D3A0'); pawIcon(c, cx - 62, top - 17, 1, PK[2]);
  pillow(c, cx + 66, top - 18, 34, 28, PK[1], PK[2]); c.fillStyle = 'rgba(255,255,255,.7)'; heart(c, cx + 66, top - 17, 5); c.fill();
}
function vanityArt(c) {
  const cx = N.vanity, w = 164, top = GY - 92;
  floorShadow(c, cx, w + 10);
  // กระจกรูปไข่ + กรอบทอง + โบว์
  c.fillStyle = goldV(c, top - 92, top - 6); c.beginPath(); c.ellipse(cx, top - 50, 34, 44, 0, 0, TAU); c.fill();
  c.fillStyle = lg(c, 0, top - 90, 0, top - 10, [[0, '#EAF4FF'], [1, '#E3D6F6']]); c.beginPath(); c.ellipse(cx, top - 50, 28, 38, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(cx - 14, top - 72); c.lineTo(cx - 8, top - 78); c.lineTo(cx - 18, top - 34); c.lineTo(cx - 22, top - 38); c.closePath(); c.fill();
  bow(c, cx, top - 92, 1, PK[1], PK[3]);
  // โต๊ะ: ท็อปไม้ + ตู้ลาเวนเดอร์ลิ้นชัก
  plank(c, cx - w / 2 - 4, top, w + 8, 9, 3, 1);
  c.fillStyle = lg(c, 0, top + 9, 0, GY - 6, [[0, LV[1]], [1, LV[2]]]); c.beginPath(); c.roundRect(cx - w / 2, top + 9, w, GY - top - 15, 4); c.fill();
  for (const [dx, dy, dw] of [[-w / 2 + 8, 16, w / 2 - 14], [6, 16, w / 2 - 14], [-w / 2 + 8, 48, w / 2 - 14], [6, 48, w / 2 - 14]]) {
    c.fillStyle = lg(c, 0, top + dy, 0, top + dy + 26, [[0, LV[0]], [1, LV[1]]]); c.beginPath(); c.roundRect(cx + dx, top + dy, dw, 26, 4); c.fill();
    c.fillStyle = GOLD; c.beginPath(); c.arc(cx + dx + dw / 2, top + dy + 13, 2, 0, TAU); c.fill();
  }
  for (const d of [-1, 1]) { c.fillStyle = WO[2]; c.beginPath(); c.roundRect(cx + d * (w / 2 - 10) - 4, GY - 8, 8, 8, [0, 0, 3, 3]); c.fill(); }
  // ของบนโต๊ะ: ขวดน้ำหอม แปรง โบว์ห้อย
  for (const [dx, col, h] of [[-62, PK[1], 22], [-48, '#A9D3E8', 16], [50, LV[1], 20]]) { c.fillStyle = col; c.beginPath(); c.roundRect(cx + dx - 5, top - h, 10, h, [4, 4, 2, 2]); c.fill(); c.fillStyle = GOLD; c.fillRect(cx + dx - 2, top - h - 5, 4, 5); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(cx + dx - 3, top - h + 3, 1.6, h - 6); }
  c.fillStyle = WO[2]; c.beginPath(); c.roundRect(cx + 60, top - 6, 18, 5, 2); c.fill(); c.fillStyle = PK[2]; c.beginPath(); c.roundRect(cx + 74, top - 9, 10, 9, 3); c.fill();
  for (const [dx, col] of [[-40, PK[2]], [40, LV[2]]]) bow(c, cx + dx, top - 66, 0.55, col, col === PK[2] ? PK[3] : LV[3]);
}
function galleryArt(c) {
  const x = N.gallery;
  const F = [[-34, 128, 40, 46, '#FFDDB8'], [12, 120, 44, 40, '#FFFFFF'], [-20, 178, 46, 40, '#C9C3D8'], [26, 172, 36, 44, '#4A4048'], [-48, 222, 30, 32, '#F7C79A']];
  for (const [dx, y, w, h, fur] of F) frameArt(c, x + dx, y, w, h, fur, [PK[0], LV[1]]);
}
function towerArt(c) {
  const cx = N.tower, top = GY - TOWER.h;
  floorShadow(c, cx, TOWER.w + 10);
  c.fillStyle = lg(c, 0, GY - 14, 0, GY, [[0, PK[1]], [1, PK[3]]]); c.beginPath(); c.roundRect(cx - 44, GY - 14, 88, 14, 6); c.fill();
  c.fillStyle = lg(c, cx - 9, 0, cx + 9, 0, [[0, '#D8BE95'], [0.5, '#F2E2C2'], [1, '#C9AC80']]); c.fillRect(cx - 9, top + 10, 18, TOWER.h - 24);
  c.strokeStyle = 'rgba(150,110,60,.35)'; c.lineWidth = 1; for (let y = top + 13; y < GY - 14; y += 4) { c.beginPath(); c.moveTo(cx - 9, y); c.lineTo(cx + 9, y + 2); c.stroke(); }
  // ชั้นกลาง (เบาะ) + ยอด (บ้านเล็ก)
  c.fillStyle = lg(c, 0, GY - 96, 0, GY - 84, [[0, LV[1]], [1, LV[3]]]); c.beginPath(); c.roundRect(cx - 42, GY - 96, 46, 12, 6); c.fill();
  c.fillStyle = lg(c, 0, top - 4, 0, top + 12, [[0, PK[1]], [1, PK[3]]]); c.beginPath(); c.roundRect(cx - 36, top - 2, 72, 14, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.roundRect(cx - 30, top, 60, 2.2, 1.1); c.fill();
  c.fillStyle = PK[2]; c.beginPath(); c.arc(cx + 30, top + 30, 5, 0, TAU); c.fill(); c.strokeStyle = '#FFFFFF'; c.beginPath(); c.moveTo(cx + 30, top + 12); c.lineTo(cx + 30, top + 25); c.stroke();
}

/** เพดาน ผนัง พื้น (ห้องแมว) */
export function drawNurseBack(c, camX, vw, t) {
  c.fillStyle = '#B57F52'; c.fillRect(camX - 10, -400, vw + 20, 400);
  drawFloorSegs(c, camX, vw, 'nurse:floor:' + NURSE_STAGE, NURSE_W, (g, x0, x1) => floorRange(g, x0, x1, has(2) ? N_RUGS : []));
  drawWallSegs(c, camX, vw, 'nurse:wall', NURSE_W, N_BRACKETS);
}
export function drawNurseWorld(c, camX, vw, t) {
  const vis = (x0, x1) => x1 > camX - 40 && x0 < camX + vw + 40;
  const skyK = ':' + sky().key;
  if (vis(N.door - 80, N.door + 80)) shaded(c, 'home:door', ...doorBox(N.door), (g) => doorArt(g, N.door));
  if (vis(N.ban - 40, N.ban + 40)) shaded(c, 'home:banner', N.ban - 40, BEAM_B - 6, 80, 130, (g) => bannerArt(g, N.ban));
  if (vis(N.scon - 40, N.scon + 40)) shaded(c, 'home:scon:1', N.scon - 28, 120, 56, 60, (g) => sconceArt(g, N.scon, 136, 1));
  for (const [x, W, seed] of [[N.win1, NWIN, 2.3], [N.win2, NWIN, 3.1]]) if (vis(x - 140, x + 140)) {
    cached(c, 'nurse:win:' + x + skyK, x - W.w / 2 - 20, W.top - 16, W.w + 40, W.bot - W.top + 32, (g) => windowArt(g, x, W.w, W.top, W.bot, seed));
    twinkle(c, x, W.w, W.top, W.bot, seed, t);
    sunShaft(c, x, W, t);
  }
  if (has(1) && vis(N.cab - 90, N.cab + 90)) shaded(c, 'nurse:cab', N.cab - 76, GY - 268, 152, 276, cabinetArt);
  if (vis(N.box - 50, N.box + 50)) shaded(c, 'nurse:box', N.box - 50, GY - 60, 100, 68, (g) => { boxArt(g, N.box); boxArt(g, N.box, 60, 40, true); });
  if (NURSE_STAGE === 0 && vis(N.sign - 60, N.sign + 60)) {
    shaded(c, 'nurse:sign', N.sign - 70, GY - 130, 140, 138, signArt);
    label(c, N.sign, GY - 93, 'ยังไม่มีน้อง', 'rgba(255,255,255,0)', LV[4], 11);
    label(c, N.sign, GY - 74, 'มาอยู่เลยน้า', 'rgba(255,255,255,0)', PK[3], 10);
  }
  const bowls = has(2) ? N.bowls : has(1) ? [N.bowls[0]] : [];
  for (const [i, x] of bowls.entries()) if (vis(x - 24, x + 24)) shaded(c, 'nurse:bowl:' + i, x - 24, GY - 22, 48, 28, (g) => bowlArt(g, x, i));
  if (has(1) && vis(N.water - 30, N.water + 30)) shaded(c, 'nurse:water', N.water - 26, GY - 82, 52, 88, waterArt);
  if (has(1) && vis(N.round - 50, N.round + 50)) shaded(c, 'nurse:round', N.round - 48, GY - 36, 96, 44, roundBedArt);
  if (has(2)) {
    if (vis(N.tub - 90, N.tub + 90)) { shaded(c, 'nurse:tub', N.tub - 86, GY - 146, 172, 154, tubArt); drawTubLive(c, t); }
    if (vis(N.condo - 110, N.condo + 110)) { shaded(c, 'nurse:condo', N.condo - CONDO.w / 2 - 14, GY - CONDO.h - 14, CONDO.w + 28, CONDO.h + 22, condoArt); drawCondoToy(c, t); }
    if (vis(1000, 1430)) shaded(c, 'nurse:shelves', 990, 76, 440, 164, wallShelvesArt);
    if (vis(N.dome - 50, N.dome + 50)) shaded(c, 'nurse:dome', N.dome - 48, GY - 74, 96, 82, domeBedArt);
    if (vis(N.canopy - 60, N.canopy + 60)) shaded(c, 'nurse:canopy', N.canopy - 60, GY - 140, 120, 148, canopyBedArt);
    if (vis(N.house - 50, N.house + 50)) shaded(c, 'nurse:house', N.house - 50, GY - 86, 100, 94, houseBedArt);
    if (vis(N.basket - 46, N.basket + 46)) shaded(c, 'nurse:basket', N.basket - 44, GY - 66, 88, 74, basketArt);
    if (vis(N.chest - 50, N.chest + 50)) shaded(c, 'nurse:chest', N.chest - 50, GY - 96, 100, 104, chestArt);
    if (vis(N.win2 - 100, N.win2 + 100)) shaded(c, 'nurse:seat', N.win2 - 104, GY - 90, 208, 98, winSeatArt);
    if (vis(N.vanity - 90, N.vanity + 90)) shaded(c, 'nurse:vanity', N.vanity - 90, GY - 196, 180, 204, vanityArt);
    if (vis(N.gallery - 80, N.gallery + 80)) shaded(c, 'nurse:gallery', N.gallery - 80, 98, 140, 150, galleryArt);
    if (vis(N.tower - 56, N.tower + 56)) shaded(c, 'nurse:tower', N.tower - 54, GY - TOWER.h - 10, 108, TOWER.h + 18, towerArt);
    if (vis(N.box2 - 40, N.box2 + 40)) shaded(c, 'nurse:box2', N.box2 - 40, GY - 50, 80, 58, (g) => { boxArt(g, N.box2, 48, 32); boxArt(g, N.box2, 48, 32, true); });
  }
  for (const [x, k] of [[N.plant1, 0], [N.plant2, 1]]) if ((has(2) || k === 0) && vis(x - 40, x + 40)) { c.save(); c.translate(x, GY); shaded(c, 'hall:plant3:' + k, -40, -130, 80, 132, (g) => drawPlantArt(g, k)); c.restore(); }
  if (vis(N.scon - 40, N.scon + 40)) glow(c, N.scon + 12, 156, 38, 0.4, t, 3);
  for (const [i, x] of [400, 1780].entries()) if (vis(x - 30, x + 30)) { shaded(c, 'home:lant', x - 16, BEAM_B - 2, 32, 132, (g) => hangLanternArt(g, x, 72)); glow(c, x, BEAM_B + 100, 46, 0.4, t, i + 5); }
}
/** ผนังหน้ากล่องทับน้องที่มุดกล่องต้อนรับอยู่ */
export function drawNurseFront(c, camX, vw, t, inBox) {
  if (inBox) shaded(c, 'nurse:boxfront', N.box - 34, GY - 44, 68, 48, (g) => boxArt(g, N.box, 60, 40, true));
}
