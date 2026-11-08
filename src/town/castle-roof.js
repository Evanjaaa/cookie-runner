// src/town/castle-roof.js
// ─────────────────────────────────────────────────────────────
// ปราสาทแมวเหมียว ชั้น 3 · STARRY ROOFTOP (ผู้ใช้ 7 พ.ย. — สเปกใน CASTLE_DESIGN.md)
//   ดาดฟ้าเปิดโล่ง มุมหน้าตรง · ลาเวนเดอร์/ชมพู/ครีม/ทอง + ฟ้าน้ำเงินอมม่วง (ต่างจากชั้นอื่น) · ใช้ชิ้นร่วมจาก castle-hall.js
//
// เรียงซ้าย → ขวา: ทางลงชั้น 2 (ป้อมเล็ก) · ซุ้มดอกไม้ทอง (จุดถ่ายรูป) · ม้านั่งชมวิว · กล้องดูดาว · กระถางดอกไม้
//   · ประติมากรรมพระจันทร์เสี้ยวทอง (กลางชั้น · ขอพรดาวตก) · ม้านั่ง · กระดานภาพถ่าย · ศาลาพักผ่อน
//   · โคมดาวบนเสาราว + โคมแขวนตามแนวระเบียง
// ฉากหลัง: ฟ้ากว้าง พระจันทร์ ดาวระยิบ เมฆ เนินไกลมีไฟบ้าน — เลื่อนช้ากว่ากล้อง (ลึก) · ราวระเบียงครีมทองเตี้ย ไม่บังวิว
// ของทุกชิ้นอยู่หลังเส้นเท้า — พื้นเดินด้านหน้าว่างตลอดแนว ยืนรวมกลุ่มถ่ายรูปได้
// ฟ้ากลางวัน/เย็น/กลางคืนตามเวลาจริง (castle-sky.js) — ใส่ ?hour=21 ท้ายลิงก์ = ดูเวลาอื่น
// ─────────────────────────────────────────────────────────────
import { H, GY, flat } from './layout.js';
import { cached, lg, heart, star } from './world.js';
import { sky, mix3, drawMoonPhase } from './castle-sky.js';
import {
  TAU, hash, LAV, SPUR, PINK, LPINK, CREAM, GOLD, SGOLD, GOLD_D,
  rr, archPath, goldV, crownIcon, pawIcon, catFace, label, drawPlantArt, shaded, drawFloorSegs, boardFrame, boardBanner, boardLive, sparkleHint,
} from './castle-hall.js';

// ── ผัง ───────────────────────────────────────────────────────
export const RW = 2600;
const RAIL_B = GY - 16;            // ฐานราวระเบียง (พื้นดาดฟ้าเริ่มตรงนี้)
const RAIL_T = RAIL_B - 58;        // ราวบนสุด (เตี้ย ไม่บังวิว)
const X = {
  down: 110, arch: 380, bench1: 650, scope: 890, moon: 1300, bench2: 1640, board: 1930, gazebo: 2290,
};
const VB_W = 220, VB_SEATS = [-70, 0, 70];
const PLANTS = [[1040, 1], [1110, 0], [2090, 1]];
const POLES = [260, 760, 1160, 1460, 1800, 2120, 2480];   // เสาโคมแขวน (สายไฟห้อยระหว่างเสา)

export const R_PLACES = [
  { id: 'rDown', kind: 'down', act: 'ลงชั้น 2', name: 'ทางลงชั้น 2', x: X.down - 60, w: 120, h: 190 },
  { id: 'rArch', kind: 'photo', act: 'ถ่ายรูปที่ซุ้มดอกไม้', name: 'ซุ้มดอกไม้', x: X.arch - 85, w: 170, h: 220 },
  { id: 'rBench1', kind: 'bench', name: 'ม้านั่งชมวิว', x: X.bench1 - VB_W / 2, w: VB_W, h: 60, seats: VB_SEATS.map((d) => X.bench1 + d), sitDy: 28 },
  { id: 'rScope', kind: 'scope', act: 'ส่องกล้องดูดาว', name: 'กล้องดูดาว', x: X.scope - 40, w: 80, h: 130 },
  { id: 'rMoon', kind: 'wish', act: 'ขอพรดาวตก', name: 'พระจันทร์เสี้ยวทอง', x: X.moon - 90, w: 180, h: 240 },
  { id: 'rBench2', kind: 'bench', name: 'ม้านั่ง', x: X.bench2 - VB_W / 2, w: VB_W, h: 60, seats: VB_SEATS.map((d) => X.bench2 + d), sitDy: 28 },
  { id: 'rBoard', kind: 'photos', act: 'ดูภาพถ่าย', name: 'กระดานภาพถ่าย', x: X.board - 100, w: 200, h: 170 },
  { id: 'rGazebo', kind: 'bench', name: 'ศาลาพักผ่อน', x: X.gazebo - 116, w: 232, h: 230, seats: [-84, -28, 28, 84].map((d) => X.gazebo + d), sitDy: 28 },
];
for (const p of R_PLACES) p.door = p.x + p.w / 2;
export const R_SPAWN = X.down + 120;

function buildSurfaces() {
  const S = [];
  for (const x of [X.bench1, X.bench2]) S.push(flat('vb:' + x, x - VB_W / 2 + 10, x + VB_W / 2 - 10, GY - 26, { soft: true }));   // เบาะนุ่ม: ยุบเด้ง (main.js)
  S.push(flat('gazebo:seat', X.gazebo - 108, X.gazebo + 108, GY - 28, { soft: true }));
  S.push(flat('moon:base', X.moon - 56, X.moon + 56, GY - 30));
  for (const s of S) { s.x0 = s.pts[0][0]; s.x1 = s.pts[s.pts.length - 1][0]; }
  return S;
}
export const R_SURFACES = buildSurfaces();

export const STAR_LINES = [
  'เห็นกลุ่มดาวแมวนอนขดอยู่ข้างดวงจันทร์ด้วย!',
  'ดาวสีชมพูดวงนั้นกะพริบสามครั้ง — แปลว่าพรุ่งนี้จะโชคดีนะเหมียว',
  'ไกลออกไปเห็นไฟเมืองแมวเหมียวระยิบระยับเลย',
  'กลุ่มดาวปลาทูกำลังว่ายผ่านทางช้างเผือก',
  'ดาวตกมาแล้ว! รีบไปขอพรที่พระจันทร์เสี้ยวเร็ว',
];

// ── ฟ้าตามเวลาจริง (ผู้ใช้ 8 พ.ย. "ปรับท้องฟ้าให้สวยงามมีลูกเล่นยิ่งขึ้น") ─────────────────
//   สีฟ้าผสม กลางวัน/เย็น/กลางคืน ตามเวลาไทย (castle-sky.js) · ดวงอาทิตย์เดินข้ามฟ้าตามชั่วโมงจริง · ดวงจันทร์ข้างขึ้นข้างแรมจริง
//   กลางคืน: แสงเหนือพลิ้ว · โคมลอยขึ้นจากเนินไกล · กลุ่มดาวแมวกะพริบ · ดาวตก · ไฟบ้าน
//   กลางวัน/เย็น: เมฆปุย · ฝูงนก · บอลลูนหน้าแมวลอยผ่าน · รุ้งจาง ๆ
let wishT = -1e9;          // เวลาขอพรล่าสุด (เฟรม) → ฝนดาวตก
/** ขอพร: ฝนดาวตกช่วงสั้น ๆ (main.js เรียกตอนกดที่พระจันทร์) */
export function roofWish(t) { wishT = t; wishBig = false; }
// ── ส่งคำอธิษฐาน (ผู้ใช้ 8 พ.ย.): พิมพ์คำขอพรในหน้าต่างป๊อปอัป → ดาวดวงหนึ่งพาคำอธิษฐานลอยขึ้นจากพระจันทร์ ──
//   ลอยส่ายขึ้นฟ้ามีหางประกาย ป้ายคำอธิษฐานเรืองแสงลอยตามช่วงแรก → ถึงฟ้า = แตกเป็นประกาย แล้วฝนดาวตกใหญ่ (ยาวกว่าแตะพระจันทร์ปกติ)
const WISH_RISE = 150, WISH_TOP = 58;   // จุดจบสูงพอเหนือราวระเบียง แต่ต่ำกว่าแถบปุ่มบนจอ
let wishFly = null, wishBig = false;
// ทางลอย: ขึ้นจากพระจันทร์ เบนขวาเข้าหาพระจันทร์บนฟ้า ส่ายเบา ๆ (ไม่ลอยตรงกลางจอที่ข้อความแจ้งเตือนขึ้น)
const wishE = (u) => 1 - (1 - u) * (1 - u);   // fast out of the sculpture, slow glide into the burst
const wishX = (u) => X.moon + wishE(u) * 150 + Math.sin(u * 6) * 16 * (1 - u);
const wishY = (u) => GY - 160 - wishE(u) * (GY - 160 - WISH_TOP);
/** ส่งคำอธิษฐาน (main.js) — คืนจำนวนเฟรมจนดาวถึงฟ้า */
export function roofWishSend(text, t) {
  wishFly = { t0: t, text: text.length > 26 ? text.slice(0, 25) + '…' : text };
  wishBig = false;
  return WISH_RISE;
}
function drawWishFly(c, camX, vw, t) {
  if (!wishFly) return;
  const u = (t - wishFly.t0) / WISH_RISE;
  if (u >= 1) {
    if (u < 1.35) {
      // ประกายแตกตอนถึงฟ้า
      // วงประกายสองชั้น + แสงวาบกลาง (จุดจบอยู่ใต้แถบปุ่มบน ไม่ตกขอบจอ)
      const b = (u - 1) / 0.35, x = wishX(1), y = WISH_TOP;
      const fl = c.createRadialGradient(x, y, 1, x, y, 44);
      fl.addColorStop(0, `rgba(255,246,210,${0.85 * (1 - b)})`); fl.addColorStop(1, 'rgba(255,246,210,0)');
      c.fillStyle = fl; c.beginPath(); c.arc(x, y, 44, 0, TAU); c.fill();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU, d = 8 + b * 44;
        c.globalAlpha = 1 - b; c.fillStyle = i % 2 ? '#FFFFFF' : '#FFE48A';
        star(c, x + Math.cos(a) * d, y + Math.sin(a) * d, 5 * (1 - b * 0.5), a); c.fill();
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.4, d = 4 + b * 26;
        c.globalAlpha = (1 - b) * 0.9; c.fillStyle = i % 2 ? '#FFC4DA' : '#FFFFFF';
        c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.2, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    } else wishFly = null;
    return;
  }
  if (u >= 1 - 1 / WISH_RISE && !wishBig) { wishBig = true; wishT = t + 1; }
  const x = wishX(u), y = wishY(u);
  // หางประกาย
  for (let k = 1; k <= 10; k++) {
    const v = Math.max(0, u - k * 0.02);
    const px = wishX(v), py = wishY(v);
    c.globalAlpha = (1 - k / 11) * 0.7; c.fillStyle = k % 2 ? '#FFF2B8' : '#FFD0E6';
    c.beginPath(); c.arc(px, py, 3.4 - k * 0.25, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
  const g = c.createRadialGradient(x, y, 1, x, y, 30);
  g.addColorStop(0, 'rgba(255,244,200,.9)'); g.addColorStop(1, 'rgba(255,244,200,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, 30, 0, TAU); c.fill();
  c.fillStyle = '#FFE48A'; star(c, x, y, 10, -Math.PI / 2 + Math.sin(t * 0.1) * 0.2); c.fill();
  c.fillStyle = '#FFFFFF'; star(c, x, y, 4.4, -Math.PI / 2); c.fill();
  // ป้ายคำอธิษฐานเรืองแสงลอยตามช่วงแรก
  if (u < 0.75) {
    c.save();
    c.globalAlpha = Math.min(1, u * 8) * (1 - Math.max(0, (u - 0.55) / 0.2));
    c.font = '700 12px Mali, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = c.measureText(wishFly.text).width + 26, ly = y - 27;   // above the star: never covers the moon sculpture
    c.fillStyle = 'rgba(46,30,96,.72)'; c.beginPath(); c.roundRect(x - w / 2, ly - 12, w, 24, 12); c.fill();
    c.strokeStyle = 'rgba(255,228,138,.85)'; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#FFF4D2'; c.fillText(wishFly.text, x, ly + 0.5);
    c.restore();
  }
}


/** เสี้ยวพระจันทร์: วงนอก (x, y, R) ลบวงใน (เยื้อง dx, dy รัศมี r) — ตัดในกรอบวงนอก ไม่ให้วงในล้นออกเป็นวงแหวน */
function crescent(c, x, y, R, dx, dy, r, fill) {
  c.save();
  c.beginPath(); c.arc(x, y, R, 0, TAU); c.clip();
  c.fillStyle = fill;
  c.beginPath(); c.rect(x - R - 1, y - R - 1, 2 * R + 2, 2 * R + 2); c.arc(x + dx, y + dy, r, 0, TAU); c.fill('evenodd');
  c.restore();
}
const CAT_STARS = [[-36, 18], [-42, -22], [-20, -6], [0, -10], [20, -6], [42, -22], [36, 18], [0, 34]];
/** ฟ้า + ของลอยบนฟ้า + เนินไกล — วาดในพิกัดโลกแต่เลื่อนช้า (par) ให้ดูลึก */
function drawSky(c, camX, vw, t) {
  const S = sky(), x0 = camX - 10, w = vw + 20;
  const nightA = S.night + S.dusk * 0.4, dayA = S.day + S.dusk * 0.75;
  c.fillStyle = lg(c, 0, -400, 0, RAIL_B, [
    [0, mix3(S, '#5FAAEE', '#5A4CA6', '#2E2A6E')], [0.45, mix3(S, '#6FB6F0', '#6E58B0', '#2E2A6E')],
    [0.75, mix3(S, '#9ED2FF', '#D483B4', '#5446A6')], [0.93, mix3(S, '#CFEAFF', '#FFA39E', '#9C82D9')], [1, mix3(S, '#FFF2F8', '#FFD49A', '#F2B6D8')]]);
  c.fillRect(x0, -400, w, RAIL_B + 400);
  // ── กลางคืน ──
  if (nightA > 0.02) {
    // แสงเหนือ: ริบบิ้นมิ้นต์/ชมพู/ม่วงพลิ้วช้า ๆ (เลื่อน 5%)
    const ap = camX * 0.95;
    for (const [i, col, base, A] of [[0, '120,240,200', 40, 18], [1, '255,150,220', 66, 14], [2, '170,150,255', 28, 12]]) {
      c.save();
      c.globalAlpha = nightA * (0.55 + 0.25 * Math.sin(t * 0.008 + i * 2));
      const g = c.createLinearGradient(0, base - 70, 0, base + 30);
      g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.75, `rgba(${col},.32)`); g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g;
      c.beginPath();
      const yAt = (x) => base + Math.sin((x - ap) / 170 + t * 0.006 + i * 1.7) * A + Math.sin((x - ap) / 61 + t * 0.011) * 5;
      c.moveTo(x0, yAt(x0) - 70);
      for (let x = x0; x <= x0 + w + 20; x += 20) c.lineTo(x, yAt(x) - 70 - Math.sin((x - ap) / 90 + i) * 14);
      for (let x = x0 + w + 20; x >= x0; x -= 20) c.lineTo(x, yAt(x) + 22);
      c.closePath(); c.fill();
      c.restore();
    }
    // ดาว: แผ่นลาย 900 หน่วยซ้ำ เลื่อน 8% ของกล้อง
    const par = camX * 0.92, tile = 900;
    for (let k = Math.floor((camX - par) / tile) - 1; k <= Math.ceil((camX + vw - par) / tile); k++) {
      for (let i = 0; i < 52; i++) {
        const sx = par + k * tile + hash(i * 3.7) * tile, sy = 8 + hash(i * 5.3) * 220;
        if (sx < x0 || sx > x0 + w) continue;
        const tw = 0.55 + 0.45 * Math.sin(t * (0.03 + hash(i) * 0.05) + i);
        c.globalAlpha = tw * nightA;
        if (i % 9 === 0) { c.fillStyle = i % 2 ? SGOLD : '#FFFFFF'; star(c, sx, sy, 3.2 + tw * 1.4, -Math.PI / 2); c.fill(); }
        else { c.fillStyle = i % 4 ? '#FFFFFF' : '#FFD6EA'; c.beginPath(); c.arc(sx, sy, 0.8 + hash(i * 1.9) * 1.2, 0, TAU); c.fill(); }
      }
      // กลุ่มดาวแมว (หนึ่งกลุ่มต่อแผ่น) เส้นทองจาง กะพริบเป็นจังหวะ
      const kx = par + k * tile + 520, ky = 70;
      if (kx > x0 - 60 && kx < x0 + w + 60) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.025 + k);
        c.globalAlpha = nightA * (0.3 + 0.35 * pulse);
        c.strokeStyle = SGOLD; c.lineWidth = 1; c.setLineDash([3, 4]);
        c.beginPath(); CAT_STARS.forEach(([dx, dy], j) => (j ? c.lineTo(kx + dx, ky + dy) : c.moveTo(kx + dx, ky + dy))); c.closePath(); c.stroke(); c.setLineDash([]);
        c.globalAlpha = nightA * (0.6 + 0.4 * pulse);
        for (const [dx, dy] of CAT_STARS) { c.fillStyle = '#FFFFFF'; star(c, kx + dx, ky + dy, 2.6 + pulse, 0); c.fill(); }
      }
    }
    c.globalAlpha = 1;
    // ดวงจันทร์ข้างขึ้นข้างแรมจริง (เกือบไม่เลื่อน)
    const mx = camX + vw * 0.78, my = 78;
    c.globalAlpha = nightA;
    const g = c.createRadialGradient(mx, my, 10, mx, my, 110);
    g.addColorStop(0, 'rgba(255,240,200,.45)'); g.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = g; c.beginPath(); c.arc(mx, my, 110, 0, TAU); c.fill();
    drawMoonPhase(c, mx, my, 30, S.moon, '#FFF4D2', true);
    // โคมลอย: ลอยขึ้นจากเนินไกลช้า ๆ ส่ายเบา ๆ (เลื่อน 20%)
    const lp = camX * 0.8;
    for (let i = 0; i < 9; i++) {
      const per = 2600 + hash(i) * 1400, u = ((t + hash(i * 3) * per) % per) / per;
      const lx = lp + ((i * 377) % (RW + 600)) - 200 + Math.sin(t * 0.01 + i) * 14 + u * 60, ly = RAIL_B - 30 - u * 300;
      if (lx < x0 - 20 || lx > x0 + w + 20) continue;
      const s = 0.6 + hash(i * 7) * 0.5, a = nightA * Math.min(1, u * 6, (1 - u) * 3);
      c.globalAlpha = a;
      const lg2 = c.createRadialGradient(lx, ly, 1, lx, ly, 16 * s);
      lg2.addColorStop(0, 'rgba(255,214,140,.7)'); lg2.addColorStop(1, 'rgba(255,214,140,0)');
      c.fillStyle = lg2; c.beginPath(); c.arc(lx, ly, 16 * s, 0, TAU); c.fill();
      c.fillStyle = i % 3 ? '#FFD38A' : '#FFB6CF';
      c.beginPath(); c.moveTo(lx - 5 * s, ly - 7 * s); c.lineTo(lx + 5 * s, ly - 7 * s); c.lineTo(lx + 4 * s, ly + 6 * s); c.lineTo(lx - 4 * s, ly + 6 * s); c.closePath(); c.fill();
      c.fillStyle = '#FFF6D8'; c.fillRect(lx - 2.4 * s, ly + 3 * s, 4.8 * s, 2.4 * s);
    }
    c.globalAlpha = 1;
  }
  // ── กลางวัน / เย็น ──
  if (dayA > 0.02) {
    // ดวงอาทิตย์เดินข้ามฟ้าตามเวลาจริง (เช้าซ้าย → เที่ยงสูง → เย็นขวาต่ำ)
    const u = S.sunU, sx = camX + vw * (0.08 + 0.84 * u), sy = 60 + (1 - Math.sin(u * Math.PI)) * 150;
    const warm = S.dusk / Math.max(0.01, S.dusk + S.day);
    c.globalAlpha = dayA;
    const g = c.createRadialGradient(sx, sy, 6, sx, sy, 150);
    g.addColorStop(0, warm > 0.5 ? 'rgba(255,214,150,.85)' : 'rgba(255,252,226,.9)'); g.addColorStop(0.3, 'rgba(255,236,200,.35)'); g.addColorStop(1, 'rgba(255,236,200,0)');
    c.fillStyle = g; c.beginPath(); c.arc(sx, sy, 150, 0, TAU); c.fill();
    c.save(); c.translate(sx, sy); c.rotate(t * 0.002);
    c.fillStyle = `rgba(255,246,214,${(0.25 + 0.1 * Math.sin(t * 0.02)).toFixed(3)})`;
    for (let k = 0; k < 10; k++) { c.rotate(TAU / 10); c.beginPath(); c.moveTo(-5, 30); c.lineTo(0, 62); c.lineTo(5, 30); c.fill(); }
    c.restore();
    c.fillStyle = warm > 0.5 ? '#FFCB8C' : '#FFF6D6'; c.beginPath(); c.arc(sx, sy, 24, 0, TAU); c.fill();
    // รุ้งจาง ๆ (กลางวันเต็มที่)
    if (S.day > 0.5) {
      const rx = camX * 0.8 + 900;
      if (rx > x0 - 400 && rx < x0 + w + 400) {
        c.globalAlpha = (S.day - 0.5) * 0.5; c.lineWidth = 8;
        ['#FF9EB8', '#FFC98A', '#FFF09A', '#A8E6A8', '#9ED2FF', '#C5A4E8'].forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(rx, RAIL_B + 40, 260 - i * 8, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); });
      }
    }
    // บอลลูนหน้าแมวลอยผ่านไกล ๆ (เลื่อน 15%)
    const bp = camX * 0.85, bx = bp + ((t * 0.12) % (RW + 800)) - 400, by = 120 + Math.sin(t * 0.015) * 10;
    if (bx > x0 - 40 && bx < x0 + w + 40) {
      c.globalAlpha = dayA;
      for (const d of [-1, 1]) { c.fillStyle = '#F7A8CB'; c.beginPath(); c.moveTo(bx + d * 15, by - 8); c.lineTo(bx + d * 13, by - 25); c.lineTo(bx + d * 4, by - 17); c.fill(); }
      c.fillStyle = '#FBC1DA'; c.beginPath(); c.ellipse(bx, by - 2, 17, 16, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(bx - 3, by - 18, 6, 32);
      c.strokeStyle = '#6E4F86'; c.lineWidth = 1.2; c.lineCap = 'round';
      for (const d of [-1, 1]) { c.beginPath(); c.arc(bx + d * 6, by - 3, 2.4, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      c.strokeStyle = 'rgba(140,100,60,.8)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(bx - 8, by + 12); c.lineTo(bx - 4, by + 22); c.moveTo(bx + 8, by + 12); c.lineTo(bx + 4, by + 22); c.stroke();
      c.fillStyle = '#C99B6A'; c.fillRect(bx - 5, by + 22, 10, 7);
    }
    // ฝูงนกบินข้ามฟ้า
    for (let f = 0; f < 2; f++) {
      const fx = camX + ((t * (0.5 + f * 0.2) + f * 700) % (vw + 400)) - 200, fy = 90 + f * 70 + Math.sin(t * 0.01 + f) * 8;
      for (let j = 0; j < 4; j++) {
        const x = fx - j * 16, y = fy + (j % 2) * 8 + j * 3, fl = Math.sin(t * 0.25 + j * 1.3) * 3.4;
        c.globalAlpha = dayA * 0.8; c.strokeStyle = '#6E5B9C'; c.lineWidth = 1.6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - 6, y - fl); c.quadraticCurveTo(x - 3, y - 2, x, y); c.quadraticCurveTo(x + 3, y - 2, x + 6, y - fl); c.stroke();
      }
    }
    c.globalAlpha = 1;
  }
  // ดาวตก: นาน ๆ ที 1 ดวง (กลางคืน) · ขอพร = ฝนดาวตก 3 วิ (กลางวันเป็นดาวทอง)
  const shower = t - wishT < (wishBig ? 300 : 180);
  const n = shower ? (wishBig ? 12 : 7) : nightA > 0.4 ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const per = shower ? 50 : 420, ph = ((t + i * 37) % per) / per, seed = Math.floor((t + i * 37) / per) + i * 11;
    if (!shower && ph > 0.14) continue;
    const u = shower ? ph : ph / 0.14;
    const sx = camX + vw * (0.15 + hash(seed) * 0.7) + u * 160, sy = 20 + hash(seed * 1.3) * 90 + u * 70;
    const gold = S.day > 0.5;
    const tail = c.createLinearGradient(sx, sy, sx - 70, sy - 32);
    tail.addColorStop(0, gold ? `rgba(255,214,110,${1 - u})` : `rgba(255,255,255,${1 - u})`); tail.addColorStop(1, 'rgba(255,255,255,0)');
    c.strokeStyle = tail; c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - 70, sy - 32); c.stroke();
    c.fillStyle = gold ? `rgba(255,214,110,${1 - u})` : `rgba(255,246,214,${1 - u})`; star(c, sx, sy, gold ? 5 : 4, t * 0.1); c.fill();
  }
  // เมฆนุ่ม ๆ ลอยช้า (เลื่อน 25% ของกล้อง) — สีตามเวลา
  const cp = camX * 0.75, cloudCol = S.night > 0.6 ? '226,214,255' : S.dusk > S.day ? '255,206,214' : '255,255,255';
  const cloudA = 0.42 * S.night + 0.75 * S.dusk + 0.88 * S.day;
  for (let i = 0; i < 9; i++) {
    const cx = cp + ((i * 430 + t * 0.06 * (1 + (i % 3) * 0.3)) % (RW + 900)) - 300, cy = 150 + (i % 4) * 26;
    if (cx < x0 - 160 || cx > x0 + w + 160) continue;
    c.fillStyle = `rgba(${i % 2 && S.night > 0.6 ? '255,214,236' : cloudCol},${cloudA.toFixed(3)})`;
    c.beginPath(); c.arc(cx, cy, 26, 0, TAU); c.arc(cx + 30, cy + 6, 20, 0, TAU); c.arc(cx - 28, cy + 8, 18, 0, TAU); c.arc(cx + 8, cy + 12, 22, 0, TAU); c.fill();
  }
  // เนินไกล + ไฟบ้านระยิบ (เลื่อน 30%)
  const hp = camX * 0.7;
  c.fillStyle = mix3(S, '#B7C2EE', '#9A78B8', '#6E5BB4');
  c.beginPath(); c.moveTo(x0, RAIL_B);
  for (let x = x0; x <= x0 + w + 40; x += 40) c.lineTo(x, RAIL_B - 40 - Math.sin((x - hp) / 160) * 14 - Math.sin((x - hp) / 61) * 5);
  c.lineTo(x0 + w + 40, RAIL_B); c.fill();
  c.fillStyle = mix3(S, '#B5DDB6', '#B98AB8', '#8A74C9');
  c.beginPath(); c.moveTo(x0, RAIL_B);
  for (let x = x0; x <= x0 + w + 40; x += 40) c.lineTo(x, RAIL_B - 20 - Math.sin((x - hp) / 110 + 2) * 9);
  c.lineTo(x0 + w + 40, RAIL_B); c.fill();
  const lightA = S.night + S.dusk * 0.6;
  if (lightA > 0.05) {
    for (let i = 0; i < 40; i++) {
      const lx = hp + i * 97 + hash(i) * 40;
      if (lx < x0 || lx > x0 + w) continue;
      const ly = RAIL_B - 10 - hash(i * 2.1) * 22;
      c.globalAlpha = (0.6 + 0.4 * Math.sin(t * 0.04 + i)) * lightA;
      c.fillStyle = i % 3 ? '#FFE3A0' : '#FFC2DD';
      c.beginPath(); c.arc(lx, ly, 1.6, 0, TAU); c.fill();
    }
  }
  c.globalAlpha = 1;
}

// ── พื้นดาดฟ้า + ราวระเบียง ──────────────────────────────────────
const TILE = 60, ROW = 26;
function drawFloor(c, camX, vw) {
  drawFloorSegs(c, camX, vw, 'roof:floor', RW, floorRange);
}
/** หินปูพื้นดาดฟ้าลาเวนเดอร์ ขอบนูน ลายดาวทอง + แสงจันทร์ */
function floorRange(c, x0, x1) {
  c.fillStyle = '#D9C8EE'; c.fillRect(x0, RAIL_B, x1 - x0, H - RAIL_B + 2);
  c.fillStyle = CREAM; c.fillRect(x0, RAIL_B, x1 - x0, 6);
  c.fillStyle = GOLD; c.fillRect(x0, RAIL_B + 6, x1 - x0, 2);
  for (let r = 0, y = RAIL_B + 8; y < H; r++, y += ROW) {
    const off = (r % 2) * TILE / 2;
    for (let x = Math.floor((x0 - off) / TILE) * TILE + off; x < x1; x += TILE) {
      const n = Math.round((x - off) / TILE);
      c.fillStyle = lg(c, 0, y, 0, y + ROW, (n + r) % 2 ? [[0, '#ECE1F8'], [1, '#E2D3F3']] : [[0, '#F7F1FD'], [1, '#EDE3F8']]);
      c.beginPath(); c.roundRect(x + 1.2, y + 1.2, TILE - 2.4, ROW - 2.4, 5); c.fill();
      c.fillStyle = 'rgba(255,255,255,.65)'; c.beginPath(); c.roundRect(x + 6, y + 2.6, TILE - 12, 1.6, 0.8); c.fill();
      c.fillStyle = 'rgba(120,90,180,.14)'; c.beginPath(); c.roundRect(x + 6, y + ROW - 3.8, TILE - 12, 1.4, 0.7); c.fill();
      if ((n * 3 + r) % 5 === 0) { c.fillStyle = 'rgba(235,198,111,.55)'; star(c, x + TILE / 2, y + ROW / 2, 4.2, -Math.PI / 2); c.fill(); }
    }
  }
  // แสงจันทร์สะท้อนพื้น
  c.fillStyle = lg(c, 0, RAIL_B, 0, H, [[0, 'rgba(180,160,255,.18)'], [1, 'rgba(180,160,255,0)']]);
  c.fillRect(x0, RAIL_B + 8, x1 - x0, H - RAIL_B);
}
/** ราวระเบียงหนึ่งช่วง 80 หน่วย (แคช): เสาครีมหัวทอง + แผงลายอุ้งเท้า */
function drawRailPiece(c) {
  c.fillStyle = 'rgba(40,20,90,.18)'; c.fillRect(0, RAIL_B - 4, 80, 4);
  // ลูกกรงโค้ง
  for (let k = 0; k < 4; k++) {
    const bx = 12 + k * 18;
    c.fillStyle = lg(c, bx - 4, 0, bx + 4, 0, [[0, '#EADBD0'], [0.5, '#FFFFFF'], [1, '#E3D3C8']]);
    c.beginPath(); c.moveTo(bx - 3, RAIL_T + 10); c.quadraticCurveTo(bx - 7, (RAIL_T + RAIL_B) / 2, bx - 3, RAIL_B - 6); c.lineTo(bx + 3, RAIL_B - 6); c.quadraticCurveTo(bx + 7, (RAIL_T + RAIL_B) / 2, bx + 3, RAIL_T + 10); c.fill();
  }
  pawIcon(c, 40, (RAIL_T + RAIL_B) / 2 + 2, 0.9, 'rgba(245,169,208,.9)');
  rr(c, 0, RAIL_B - 8, 80, 8, 2, CREAM);
  rr(c, -2, RAIL_T, 84, 10, 4, CREAM);
  c.fillStyle = GOLD; c.fillRect(-2, RAIL_T + 8, 84, 2);
  // เสาหลัก (ต้นช่วง)
  c.fillStyle = lg(c, -6, 0, 6, 0, [[0, '#EADBD0'], [0.5, '#FFFFFF'], [1, '#E3D3C8']]);
  c.fillRect(-6, RAIL_T - 4, 12, RAIL_B - RAIL_T + 4);
  c.fillStyle = goldV(c, RAIL_T - 12, RAIL_T); c.beginPath(); c.roundRect(-8, RAIL_T - 10, 16, 8, 3); c.fill();
  c.fillStyle = GOLD; c.beginPath(); c.arc(0, RAIL_T - 14, 4, 0, TAU); c.fill();
}
function drawRail(c, camX, vw) {
  const i0 = Math.max(0, Math.floor((camX - 80) / 80)), i1 = Math.min(Math.ceil(RW / 80), Math.ceil((camX + vw + 80) / 80));
  for (let i = i0; i <= i1; i++) {
    c.save(); c.translate(i * 80, 0);
    cached(c, 'roof:rail', -10, RAIL_T - 20, 92, RAIL_B - RAIL_T + 22, drawRailPiece);
    c.restore();
  }
}
/** โคมแขวนบนสายระหว่างเสา + โคมดาวบนยอดเสา */
function drawLights(c, camX, vw, t) {
  const top = RAIL_T - 120;
  for (const [i, px] of POLES.entries()) {
    if (px < camX - 420 || px > camX + vw + 420) continue;
    // เสาโคม
    c.fillStyle = goldV(c, top, RAIL_B); c.fillRect(px - 3, top, 6, RAIL_B - top);
    rr(c, px - 8, RAIL_B - 10, 16, 10, 3, GOLD_D);
    // โคมดาวบนยอด (เรืองแสง)
    const gl = 0.75 + 0.25 * Math.sin(t * 0.05 + i);
    const g = c.createRadialGradient(px, top - 8, 2, px, top - 8, 34);
    g.addColorStop(0, `rgba(255,236,170,${0.55 * gl})`); g.addColorStop(1, 'rgba(255,236,170,0)');
    c.fillStyle = g; c.beginPath(); c.arc(px, top - 8, 34, 0, TAU); c.fill();
    c.fillStyle = '#FFE48A'; star(c, px, top - 8, 9, -Math.PI / 2); c.fill();
    c.fillStyle = '#FFFFFF'; star(c, px, top - 8, 4, -Math.PI / 2); c.fill();
    // สายไฟห้อยไปเสาถัดไป + โคมกลมเล็ก
    const nx = POLES[i + 1];
    if (nx == null) continue;
    const sag = 34, mid = (px + nx) / 2;
    c.strokeStyle = 'rgba(247,222,156,.8)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(px, top + 4); c.quadraticCurveTo(mid, top + 4 + sag * 2, nx, top + 4); c.stroke();
    const n = Math.round((nx - px) / 50);
    for (let k = 1; k < n; k++) {
      const u = k / n, lx = px + (nx - px) * u, ly = top + 4 + 4 * sag * u * (1 - u) + 7;
      const tw = 0.7 + 0.3 * Math.sin(t * 0.06 + k + i);
      c.fillStyle = `rgba(255,${k % 2 ? 214 : 190},${k % 2 ? 150 : 220},${tw})`;
      c.beginPath(); c.arc(lx, ly, 4, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(lx - 1, ly - 1, 1.3, 0, TAU); c.fill();
    }
  }
}

// ── ของบนดาดฟ้า ───────────────────────────────────────────────
/**
 * 0. ป้อมทางลงชั้น 2 (ผู้ใช้ 8 พ.ย. "แต่งเพิ่มให้สวยขึ้น"): ผนังหินก้อนมน หลังคากรวยม่วงเกล็ดลอนขอบทอง ธงชมพู
 *   หน้าต่างกลมแสงอุ่น · ประตูโค้งไม้ม่วงคิ้วทอง ห่วงเคาะอุ้งเท้า · กระบะดอกไม้ใต้หน้าต่าง · เถาวัลย์ดอกไม้เลื้อย · โคมข้างประตู
 */
function drawDownArt(c) {
  const x = X.down, x0 = x - 56, x1 = x + 56, top = GY - 150;
  c.fillStyle = 'rgba(40,20,90,.22)'; c.beginPath(); c.ellipse(x, GY - 1, 70, 6, 0, 0, TAU); c.fill();
  // ผนังหินก้อนมน
  c.fillStyle = lg(c, x0, 0, x1, 0, [[0, '#DCCAF0'], [0.5, '#F6EEFD'], [1, '#D5C1EC']]); c.fillRect(x0, top, x1 - x0, GY - 4 - top);
  for (let r = 0, y = top + 6; y < GY - 8; r++, y += 16) {
    for (let bx = x0 + (r % 2 ? -14 : 0); bx < x1; bx += 28) {
      const a = Math.max(x0 + 1, bx + 1), b = Math.min(x1 - 1, bx + 27);
      if (b - a < 4) continue;
      c.fillStyle = hash(r * 3.1 + bx * 0.07) > 0.5 ? 'rgba(255,255,255,.28)' : 'rgba(150,110,205,.1)';
      c.beginPath(); c.roundRect(a, y + 1, b - a, 14, 4); c.fill();
      c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(a + 3, y + 2, b - a - 6, 1.2);
    }
  }
  // หลังคากรวยเกล็ดลอน
  const roof = new Path2D(); roof.moveTo(x0 - 12, top + 2); roof.lineTo(x, top - 74); roof.lineTo(x1 + 12, top + 2); roof.closePath();
  c.fillStyle = lg(c, x0, 0, x1, 0, [[0, '#9068D4'], [0.45, '#B794E4'], [1, '#8457C8']]); c.fill(roof);
  c.save(); c.clip(roof);
  for (let r = 0; r < 7; r++) {
    const y = top - 64 + r * 11, hwid = ((y - (top - 74)) / 76) * 68;
    for (let k = -6; k <= 6; k++) { const sx = x + k * 10 + (r % 2) * 5; if (Math.abs(sx - x) > hwid + 4) continue; c.fillStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.arc(sx, y + 6, 5, 0, Math.PI); c.fill(); }
  }
  c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.moveTo(x - 6, top - 62); c.lineTo(x0 + 4, top); c.lineTo(x0 + 18, top); c.closePath(); c.fill();
  c.restore();
  rr(c, x0 - 14, top - 2, x1 - x0 + 28, 8, 4, GOLD);
  for (let k = 0; k < 9; k++) { c.fillStyle = k % 2 ? '#FFF4F0' : '#F7A8CB'; c.beginPath(); c.arc(x0 - 8 + k * 16, top + 6, 6, 0, Math.PI); c.fill(); }
  c.fillStyle = goldV(c, top - 80, top - 70); c.beginPath(); c.arc(x, top - 75, 4, 0, TAU); c.fill();
  c.strokeStyle = GOLD_D; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, top - 78); c.lineTo(x, top - 98); c.stroke();
  c.fillStyle = '#FF8FB3'; c.beginPath(); c.moveTo(x, top - 98); c.quadraticCurveTo(x + 10, top - 96, x + 18, top - 92); c.quadraticCurveTo(x + 10, top - 88, x, top - 86); c.closePath(); c.fill();
  // หน้าต่างกลมแสงอุ่น + กระบะดอกไม้
  const wy = top + 28;
  c.fillStyle = goldV(c, wy - 15, wy + 15); c.beginPath(); c.arc(x, wy, 14, 0, TAU); c.fill();
  const wg = c.createRadialGradient(x - 3, wy - 3, 1, x, wy, 11);
  wg.addColorStop(0, '#FFF6D6'); wg.addColorStop(1, '#FFD27A');
  c.fillStyle = wg; c.beginPath(); c.arc(x, wy, 11, 0, TAU); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 11, wy); c.lineTo(x + 11, wy); c.moveTo(x, wy - 11); c.lineTo(x, wy + 11); c.stroke();
  rr(c, x - 20, wy + 13, 40, 7, 3, '#C9AEEF');
  for (let k = 0; k < 6; k++) { c.fillStyle = ['#FF9EC4', '#FFFFFF', '#FFE48A'][k % 3]; c.beginPath(); c.arc(x - 16 + k * 6.4, wy + 12 - (k % 2) * 2, 3, 0, TAU); c.fill(); }
  // ประตูโค้งไม้ม่วง + คิ้วทอง + ห่วงเคาะ
  const dTop = top + 52;
  c.fillStyle = lg(c, x - 26, 0, x + 26, 0, [[0, '#6E4FB0'], [0.5, '#8E66CF'], [1, '#6A49AA']]);
  c.beginPath(); archPath(c, x - 26, x + 26, dTop, GY - 4); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1;
  for (const dx of [-13, 0, 13]) { c.beginPath(); c.moveTo(x + dx, dTop + 26 - Math.abs(dx)); c.lineTo(x + dx, GY - 6); c.stroke(); }
  c.strokeStyle = GOLD; c.lineWidth = 3.2; c.beginPath(); archPath(c, x - 29, x + 29, dTop - 3, GY - 4); c.stroke();
  c.fillStyle = CREAM; c.beginPath(); c.arc(x, dTop - 4, 7, 0, TAU); c.fill();
  c.fillStyle = '#FF8FB3'; heart(c, x, dTop - 3.5, 3.6); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 2; c.beginPath(); c.arc(x + 14, GY - 46, 5, 0, TAU); c.stroke();
  pawIcon(c, x - 12, GY - 50, 0.7, 'rgba(247,222,156,.85)');
  // ขั้นบันไดหน้าประตู
  rr(c, x - 34, GY - 8, 68, 6, 2, '#F6EEFD');
  // เถาวัลย์ดอกไม้เลื้อยขอบซ้าย
  c.strokeStyle = '#7FBF86'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(x0 + 4, GY - 6); c.bezierCurveTo(x0 + 16, GY - 40, x0 - 2, GY - 80, x0 + 10, top + 8); c.stroke();
  for (let k = 0; k < 7; k++) {
    const u = k / 6, px = x0 + 4 + Math.sin(u * 5) * 6 + u * 6, py = GY - 6 - u * (GY - 14 - top);
    c.fillStyle = '#8FCB95'; c.beginPath(); c.ellipse(px + 4, py, 4, 2, 0.5, 0, TAU); c.fill();
    if (k % 2) { c.fillStyle = '#FFB6D5'; c.beginPath(); c.arc(px - 2, py - 2, 2.6, 0, TAU); c.fill(); }
  }
  // โคมข้างประตู (ขวา)
  const lx = x1 - 10, ly = GY - 92;
  c.strokeStyle = GOLD_D; c.lineWidth = 1.6; c.beginPath(); c.moveTo(lx, ly - 12); c.lineTo(lx, ly - 4); c.stroke();
  c.fillStyle = 'rgba(255,240,200,.95)'; c.beginPath(); c.roundRect(lx - 5, ly - 4, 10, 12, 3); c.fill();
  c.fillStyle = goldV(c, ly - 8, ly - 3); c.beginPath(); c.moveTo(lx - 7, ly - 3); c.lineTo(lx, ly - 9); c.lineTo(lx + 7, ly - 3); c.closePath(); c.fill();
}
/**
 * 1. ซุ้มดอกไม้จุดถ่ายรูป (ผู้ใช้ 8 พ.ย. "อลังการขึ้น สวยขึ้น"): ซุ้มคู่ — โค้งนอกพวงกุหลาบซ้อนชั้น โค้งในทองลายม้วน
 *   โบว์ซาตินใหญ่ยอดซุ้มกับมงกุฎ · ม่านดอกไม้ห้อยระย้า · หัวใจคริสตัล/ดาวห้อยหลายระดับ · ไฟประดับพันซุ้ม · แจกันดอกไม้สองข้างโคน
 */
function drawArchArt(c) {
  const x = X.arch, hw = 82, top = GY - 226;
  c.fillStyle = 'rgba(40,20,90,.22)'; c.beginPath(); c.ellipse(x, GY - 2, 112, 8, 0, 0, TAU); c.fill();
  const pt = (u, R) => {
    const L1 = GY - 4 - (top + R), arcL = Math.PI * R, tot = L1 * 2 + arcL, d = u * tot;
    if (d < L1) return [x - R, GY - 4 - d];
    if (d < L1 + arcL) { const a = Math.PI + (d - L1) / R; return [x + Math.cos(a) * R, top + R + Math.sin(a) * R + (R - hw) * 0]; }
    return [x + R, top + R + (d - L1 - arcL)];
  };
  // โค้งในทองลายม้วน
  c.strokeStyle = goldV(c, top, GY); c.lineWidth = 6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - hw + 14, GY - 4); c.lineTo(x - hw + 14, top + hw); c.arc(x, top + hw, hw - 14, Math.PI, 0); c.lineTo(x + hw - 14, GY - 4); c.stroke();
  c.strokeStyle = SGOLD; c.lineWidth = 1.6;
  for (let k = 0; k < 9; k++) { const a = Math.PI + (k + 0.5) / 9 * Math.PI, px = x + Math.cos(a) * (hw - 22), py = top + hw + Math.sin(a) * (hw - 22); c.beginPath(); c.arc(px, py, 4, a, a + 4.2); c.stroke(); }
  // ม่านดอกไม้ห้อยระย้าในซุ้ม (สองข้าง)
  for (const d of [-1, 1]) {
    for (let s = 0; s < 4; s++) {
      const sx = x + d * (hw - 26 - s * 9), len = 40 + s * 14;
      const sy = top + hw - Math.sqrt(Math.max(0, (hw - 14) ** 2 - (sx - x) ** 2));
      c.strokeStyle = 'rgba(143,203,149,.9)'; c.lineWidth = 1; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx, sy + len); c.stroke();
      for (let q = 0; q < 5; q++) { c.fillStyle = ['#FFB6D5', '#FFFFFF', '#E3D2FA'][(q + s) % 3]; c.beginPath(); c.arc(sx + (q % 2 ? 2 : -2), sy + 6 + q * (len / 5), 2.6, 0, TAU); c.fill(); }
    }
  }
  // โค้งนอก: เถาใบ + กุหลาบซ้อนสามชั้น
  for (let i = 0; i <= 58; i++) {
    const [px, py] = pt(i / 58, hw), j = hash(i * 2.3);
    c.fillStyle = i % 2 ? '#7FC489' : '#A8DDA6';
    c.beginPath(); c.ellipse(px + (j - 0.5) * 16, py + (hash(i) - 0.5) * 10, 7, 3.4, j * 3, 0, TAU); c.fill();
  }
  const rose = (px, py, r, col, dk) => {
    c.fillStyle = col; c.beginPath(); c.arc(px, py, r, 0, TAU); c.fill();
    c.strokeStyle = dk; c.lineWidth = Math.max(0.8, r * 0.16);
    c.beginPath(); c.arc(px, py, r * 0.62, 0.4, Math.PI * 1.7); c.stroke();
    c.beginPath(); c.arc(px + r * 0.08, py - r * 0.05, r * 0.3, 1.2, Math.PI * 2.2); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(px - r * 0.35, py - r * 0.4, r * 0.25, 0, TAU); c.fill();
  };
  for (let i = 0; i <= 30; i++) {
    const [px, py] = pt(0.03 + (i / 30) * 0.94, hw), k = i % 4;
    const r = 6.5 + hash(i * 3.1) * 3.5;
    rose(px + (hash(i) - 0.5) * 6, py, r, ['#FF9EC4', '#FFFFFF', '#FFC9A8', '#F7B6D2'][k], ['rgba(200,70,130,.5)', 'rgba(200,170,210,.6)', 'rgba(220,130,90,.5)', 'rgba(200,90,140,.5)'][k]);
    if (i % 3 === 0) { c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(px + 7, py - 5, 1.8, 0, TAU); c.fill(); }
  }
  // หัวใจคริสตัล + ดาวห้อยหลายระดับ
  for (const [dx, len, kind] of [[-46, 30, 'star'], [-24, 46, 'heart'], [0, 62, 'star'], [24, 46, 'heart'], [46, 30, 'star']]) {
    const sy = top + hw - Math.sqrt(Math.max(0, (hw - 14) ** 2 - dx * dx)) + 4;
    c.strokeStyle = 'rgba(247,222,156,.9)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + dx, sy); c.lineTo(x + dx, sy + len); c.stroke();
    if (kind === 'star') { c.fillStyle = SGOLD; star(c, x + dx, sy + len + 6, 6.5, -Math.PI / 2); c.fill(); }
    else { const hg = c.createLinearGradient(0, sy + len, 0, sy + len + 12); hg.addColorStop(0, '#FFE6F1'); hg.addColorStop(1, '#F58CB8'); c.fillStyle = hg; heart(c, x + dx, sy + len + 6, 6.5); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(x + dx - 2, sy + len + 4, 1.4, 0, TAU); c.fill(); }
  }
  // โบว์ซาตินใหญ่ + มงกุฎบนยอด
  const by = top + 4;
  c.fillStyle = '#F27FAE';
  for (const d of [-1, 1]) {
    c.beginPath(); c.moveTo(x, by); c.bezierCurveTo(x + d * 12, by - 16, x + d * 34, by - 14, x + d * 30, by + 2); c.bezierCurveTo(x + d * 28, by + 12, x + d * 12, by + 8, x, by); c.fill();
    c.beginPath(); c.moveTo(x + d * 2, by + 3); c.quadraticCurveTo(x + d * 10, by + 20, x + d * 16, by + 34); c.lineTo(x + d * 10, by + 32); c.lineTo(x + d * 8, by + 38); c.quadraticCurveTo(x + d * 4, by + 20, x - d * 1, by + 5); c.closePath(); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,.45)'; for (const d of [-1, 1]) { c.beginPath(); c.ellipse(x + d * 16, by - 6, 6, 2.4, d * -0.5, 0, TAU); c.fill(); }
  c.fillStyle = '#E0659C'; c.beginPath(); c.ellipse(x, by + 1, 6, 7, 0, 0, TAU); c.fill();
  crownIcon(c, x, by - 8, 0.95);
  // แจกันดอกไม้สองข้างโคนซุ้ม
  for (const d of [-1, 1]) {
    const vx = x + d * (hw + 8);
    c.fillStyle = lg(c, vx - 12, 0, vx + 12, 0, [[0, '#EADDD3'], [0.5, '#FFFFFF'], [1, '#E3D3C8']]);
    c.beginPath(); c.moveTo(vx - 11, GY - 30); c.quadraticCurveTo(vx - 14, GY - 12, vx - 7, GY - 4); c.lineTo(vx + 7, GY - 4); c.quadraticCurveTo(vx + 14, GY - 12, vx + 11, GY - 30); c.closePath(); c.fill();
    rr(c, vx - 13, GY - 33, 26, 5, 2.5, GOLD);
    for (let q = 0; q < 6; q++) rose(vx - 9 + (q % 3) * 9, GY - 38 - Math.floor(q / 3) * 8, 4.8, ['#FF9EC4', '#FFFFFF', '#FFC9A8'][q % 3], 'rgba(200,90,140,.45)');
  }
}
/**
 * 2/6. ม้านั่งชมวิว 3 ที่นั่ง (ผู้ใช้ 8 พ.ย. วาดให้สวยขึ้น): โครงทองลายม้วนแบบเหล็กดัดสวน พนักนวมขาวกุ๊นชมพู
 *   เบาะชมพูแยกที่นั่ง หมอนตุ๊กตาหน้าแมว · ขาทองม้วนปลาย
 */
function drawViewBench(c, x) {
  const w = VB_W, x0 = x - w / 2;
  c.fillStyle = 'rgba(40,20,90,.22)'; c.beginPath(); c.ellipse(x, GY - 1, w * 0.55, 6, 0, 0, TAU); c.fill();
  // ขาทองม้วนปลาย
  c.strokeStyle = GOLD; c.lineWidth = 3; c.lineCap = 'round';
  for (const [lx, d] of [[x0 + 14, -1], [x0 + w - 14, 1], [x - 40, -1], [x + 40, 1]]) {
    c.beginPath(); c.moveTo(lx, GY - 14); c.quadraticCurveTo(lx + d * 2, GY - 6, lx + d * 6, GY - 4); c.stroke();
    c.beginPath(); c.arc(lx + d * 8, GY - 6, 2.4, 0, TAU); c.stroke();
  }
  // โครงพนักทองลายม้วน (หลังนวม)
  const backTop = (k) => GY - 46 - Math.sin(k * Math.PI) * 18;
  c.strokeStyle = goldV(c, GY - 70, GY - 26); c.lineWidth = 3;
  c.beginPath(); for (let k = 0; k <= 20; k++) { const u = k / 20, px = x0 + 4 + u * (w - 8), py = backTop(u) - 4; k ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
  c.lineWidth = 1.8; c.strokeStyle = GOLD;
  for (let k = 1; k < 8; k++) { const px = x0 + 4 + (k / 8) * (w - 8), py = backTop(k / 8) - 4; c.beginPath(); c.moveTo(px, py); c.bezierCurveTo(px - 6, py + 6, px + 6, py + 12, px, GY - 30); c.stroke(); c.beginPath(); c.arc(px + 3, py + 7, 3, 0, TAU); c.stroke(); }
  // พนักนวมขาวกุ๊นชมพู
  c.fillStyle = lg(c, 0, GY - 62, 0, GY - 28, [[0, '#FFFFFF'], [1, '#F1E6FB']]);
  c.beginPath(); c.moveTo(x0 + 10, GY - 30);
  for (let k = 0; k <= 20; k++) { const u = k / 20; c.lineTo(x0 + 10 + u * (w - 20), backTop(u) + 4); }
  c.lineTo(x0 + w - 10, GY - 30); c.closePath(); c.fill();
  c.strokeStyle = '#F7A8CB'; c.lineWidth = 2;
  c.beginPath(); for (let k = 0; k <= 20; k++) { const u = k / 20, px = x0 + 10 + u * (w - 20), py = backTop(u) + 5; k ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
  for (const d of [-35, 35]) { c.fillStyle = 'rgba(200,170,230,.6)'; c.beginPath(); c.arc(x + d, GY - 46, 1.6, 0, TAU); c.fill(); }
  // หมอนตุ๊กตาหน้าแมว
  for (const [j, d] of VB_SEATS.entries()) catFace(c, x + d, GY - 38, 11, ['#FFDDB8', '#FFFFFF', '#E3DCEF'][j], 1);
  // เบาะชมพูแยกที่นั่ง
  for (const d of VB_SEATS) {
    c.fillStyle = lg(c, 0, GY - 31, 0, GY - 13, [[0, '#FFE3EF'], [0.5, '#FBB8D5'], [1, '#EE8FBD']]);
    c.beginPath(); c.roundRect(x + d - 34, GY - 30, 68, 17, 8); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.1; c.beginPath(); c.roundRect(x + d - 31, GY - 28, 62, 13, 6); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.roundRect(x + d - 24, GY - 28, 40, 3, 1.5); c.fill();
  }
  // ที่วางแขนม้วนทอง
  c.strokeStyle = GOLD; c.lineWidth = 3;
  for (const d of [-1, 1]) {
    const ax = x + d * (w / 2 - 2);
    c.beginPath(); c.moveTo(ax, GY - 16); c.quadraticCurveTo(ax + d * 6, GY - 34, ax - d * 4, GY - 42); c.stroke();
    c.beginPath(); c.arc(ax - d * 6, GY - 39, 4, 0, TAU); c.stroke();
  }
}
/**
 * 3. กล้องดูดาว (ผู้ใช้ 8 พ.ย. "วาดให้สวยขึ้น ดูรู้ว่ากดได้"): ลำกล้องม่วงคาดทองลายดาว ฝาเลนส์หูแมว เลนส์เรืองแสงฟ้า
 *   ขาตั้งทองสามขาม้วนปลาย + แท่นกลมทอง · เก้าอี้กลมเล็กให้ปีนส่อง · (แสงเลนส์/ประกายวาดสด)
 */
function drawScopeArt(c) {
  const x = X.scope, hy = GY - 96;
  c.fillStyle = 'rgba(40,20,90,.22)'; c.beginPath(); c.ellipse(x, GY - 1, 46, 6, 0, 0, TAU); c.fill();
  // เก้าอี้กลมเล็ก (ซ้าย)
  const sx = x - 40;
  c.strokeStyle = GOLD; c.lineWidth = 2.4; for (const dx of [-8, 8]) { c.beginPath(); c.moveTo(sx + dx * 0.5, GY - 26); c.lineTo(sx + dx, GY - 3); c.stroke(); }
  c.fillStyle = lg(c, 0, GY - 32, 0, GY - 22, [[0, '#FFE3EF'], [1, '#F29CC6']]); c.beginPath(); c.ellipse(sx, GY - 27, 13, 5, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(sx - 3, GY - 29, 6, 1.6, 0, 0, TAU); c.fill();
  // ขาตั้งสามขาทองม้วนปลาย
  c.strokeStyle = goldV(c, hy, GY); c.lineWidth = 4.2; c.lineCap = 'round';
  for (const dx of [-30, 0, 30]) { c.beginPath(); c.moveTo(x, hy + 8); c.lineTo(x + dx, GY - 4); c.stroke(); }
  c.strokeStyle = GOLD; c.lineWidth = 2;
  for (const dx of [-30, 30]) { c.beginPath(); c.arc(x + dx + Math.sign(dx) * 3, GY - 5, 3, 0, TAU); c.stroke(); }
  c.beginPath(); c.moveTo(x - 18, GY - 38); c.lineTo(x + 18, GY - 38); c.stroke();
  c.fillStyle = goldV(c, hy, hy + 16); c.beginPath(); c.arc(x, hy + 8, 8, 0, TAU); c.fill();
  c.fillStyle = '#FF8FB3'; c.beginPath(); c.arc(x, hy + 8, 2.6, 0, TAU); c.fill();
  // ลำกล้อง
  c.save(); c.translate(x, hy); c.rotate(-0.55);
  c.fillStyle = lg(c, 0, -12, 0, 12, [[0, '#C9AEEF'], [0.5, '#9C72D2'], [1, '#6E4FB0']]);
  c.beginPath(); c.roundRect(-38, -9, 82, 18, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.roundRect(-34, -7, 74, 3, 1.5); c.fill();
  // ปากกล้องใหญ่ + เลนส์
  c.fillStyle = lg(c, 0, -15, 0, 15, [[0, '#D9C4F7'], [1, '#8457C8']]); c.beginPath(); c.roundRect(40, -14, 22, 28, 6); c.fill();
  c.fillStyle = goldV(c, -14, 14); c.fillRect(40, -14, 4, 28); c.fillRect(58, -14, 4, 28);
  const lgl = c.createRadialGradient(62, -2, 1, 62, 0, 11);
  lgl.addColorStop(0, '#FFFFFF'); lgl.addColorStop(0.5, '#BFE6FF'); lgl.addColorStop(1, '#7FB8F0');
  c.fillStyle = lgl; c.beginPath(); c.ellipse(62, 0, 3.6, 11, 0, 0, TAU); c.fill();
  // แถบทอง + ดาว
  c.fillStyle = GOLD; for (const rx of [-22, 4, 28]) c.fillRect(rx, -10, 3.4, 20);
  c.fillStyle = SGOLD; star(c, 16, 0, 4.6, -Math.PI / 2); c.fill(); star(c, -10, 1, 3, -Math.PI / 2); c.fill();
  // เลนส์ตาหลังหูแมว
  c.fillStyle = goldV(c, -6, 6); c.beginPath(); c.roundRect(-50, -5, 14, 10, 3); c.fill();
  c.fillStyle = '#B794E4'; c.beginPath(); c.arc(-52, 0, 6, 0, TAU); c.fill();
  c.fillStyle = '#B794E4';
  c.beginPath(); c.moveTo(-56, -4); c.lineTo(-60, -11); c.lineTo(-52, -6); c.fill();
  c.beginPath(); c.moveTo(-56, 4); c.lineTo(-60, 11); c.lineTo(-52, 6); c.fill();
  c.restore();
}
/** ส่วนสดของกล้อง: เลนส์เรืองแสงกะพริบ + ดาวจิ๋วลอยออกจากปากกล้อง (บอกว่ากดส่องได้) */
function drawScopeLive(c, t) {
  const x = X.scope, hy = GY - 96, a = -0.55;
  const lx = x + Math.cos(a) * 62, ly = hy + Math.sin(a) * 62;
  const gl = 0.45 + 0.25 * Math.sin(t * 0.06);
  const g = c.createRadialGradient(lx, ly, 1, lx, ly, 26);
  g.addColorStop(0, `rgba(200,236,255,${gl.toFixed(3)})`); g.addColorStop(1, 'rgba(200,236,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(lx, ly, 26, 0, TAU); c.fill();
  for (let i = 0; i < 3; i++) {
    const u = (t * 0.008 + i / 3) % 1;
    c.globalAlpha = Math.sin(u * Math.PI);
    c.fillStyle = i % 2 ? '#FFFFFF' : '#FFE48A';
    star(c, lx + Math.cos(a) * u * 40 + Math.sin(i * 2 + t * 0.02) * 6, ly + Math.sin(a) * u * 40 - u * 10, 3 + u * 2, t * 0.02 + i); c.fill();
  }
  c.globalAlpha = 1;
}
/**
 * 5. ประติมากรรม "แมวหลับบนพระจันทร์" (ผู้ใช้ 8 พ.ย.: มงกุฎเดิมลอย ๆ → วาดใหม่)
 *   พระจันทร์เสี้ยวทองหงายเป็นเปล (ปลายเสี้ยวชี้ขึ้น) บนก้านทองเหนือแท่นหินอ่อน · แมวขาวขดตัวหลับในเปล สวมมงกุฎแนบหัว หางห้อยพ้นขอบเปล
 *   ดาวทองห้อยจากปลายเสี้ยวสองข้าง
 */
function drawMoonArt(c) {
  const x = X.moon, cy = GY - 152, R = 80;
  // แท่นหินอ่อน
  c.fillStyle = 'rgba(40,20,90,.22)'; c.beginPath(); c.ellipse(x, GY - 1, 78, 7, 0, 0, TAU); c.fill();
  c.fillStyle = lg(c, x - 60, 0, x + 60, 0, [[0, '#E3D3F3'], [0.45, '#FFFFFF'], [1, '#DCCAF0']]);
  c.beginPath(); c.moveTo(x - 60, GY - 30); c.lineTo(x + 60, GY - 30); c.lineTo(x + 52, GY - 4); c.lineTo(x - 52, GY - 4); c.closePath(); c.fill();
  rr(c, x - 64, GY - 34, 128, 8, 4, CREAM);
  c.fillStyle = GOLD; c.fillRect(x - 60, GY - 20, 120, 2.5);
  for (const d of [-36, 0, 36]) { c.fillStyle = 'rgba(245,169,208,.9)'; heart(c, x + d, GY - 13, 4); c.fill(); }
  // ก้านทองรองเปล (เอวคอด ปุ่มกลาง)
  c.fillStyle = goldV(c, cy + R - 6, GY - 34);
  c.beginPath(); c.moveTo(x - 16, GY - 34); c.quadraticCurveTo(x - 5, GY - 52, x - 9, cy + R - 4); c.lineTo(x + 9, cy + R - 4); c.quadraticCurveTo(x + 5, GY - 52, x + 16, GY - 34); c.closePath(); c.fill();
  c.fillStyle = '#FF8FB3'; c.beginPath(); c.arc(x, GY - 52, 3.4, 0, TAU); c.fill();
  // แมวขาวขดหลับ (วาดก่อนเปล — ขอบเปลบังช่วงล่าง = นอนอยู่ในเปลจริง)
  const by = cy + 22;
  c.fillStyle = lg(c, 0, by - 18, 0, by + 18, [[0, '#FFFFFF'], [1, '#EFE6F8']]);
  c.beginPath(); c.ellipse(x + 8, by, 42, 18, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(200,180,230,.35)'; c.beginPath(); c.ellipse(x + 20, by + 8, 26, 7, 0, 0, Math.PI); c.fill();
  // หัว + หู (หัวพักบนอุ้งเท้า)
  const hx = x - 30, hy = by - 6;
  for (const d of [-1, 1]) {
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(hx + d * 15, hy - 4); c.quadraticCurveTo(hx + d * 17, hy - 22, hx + d * 11, hy - 23); c.quadraticCurveTo(hx + d * 6, hy - 18, hx + d * 2, hy - 13); c.closePath(); c.fill();
    c.fillStyle = '#FFC4DA'; c.beginPath(); c.moveTo(hx + d * 13, hy - 8); c.quadraticCurveTo(hx + d * 14, hy - 18, hx + d * 10.5, hy - 19); c.quadraticCurveTo(hx + d * 7, hy - 16, hx + d * 5, hy - 12); c.closePath(); c.fill();
  }
  c.fillStyle = lg(c, 0, hy - 16, 0, hy + 16, [[0, '#FFFFFF'], [1, '#F1E9F9']]);
  c.beginPath(); c.ellipse(hx, hy, 18, 15.5, 0, 0, TAU); c.fill();
  c.strokeStyle = '#7A5A9E'; c.lineWidth = 1.8; c.lineCap = 'round';
  for (const d of [-1, 1]) { c.beginPath(); c.arc(hx + d * 7, hy + 1, 3.6, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); }
  c.fillStyle = '#FF8FB3'; c.beginPath(); c.moveTo(hx - 1.8, hy + 4); c.lineTo(hx + 1.8, hy + 4); c.lineTo(hx, hy + 6.2); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,143,179,.55)'; c.beginPath(); c.ellipse(hx - 11, hy + 6, 3.6, 2.2, 0, 0, TAU); c.ellipse(hx + 11, hy + 6, 3.6, 2.2, 0, 0, TAU); c.fill();
  // อุ้งเท้าหน้าใต้คาง
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(hx + 6, hy + 15, 8, 4.4, 0, 0, TAU); c.ellipse(hx + 20, hy + 16, 8, 4.4, 0, 0, TAU); c.fill();
  // มงกุฎแนบกระหม่อม (เอียงตามหัว)
  c.save(); c.translate(hx + 1, hy - 13.5); c.rotate(-0.12);
  c.fillStyle = lg(c, 0, -11, 0, 1, [[0, '#FFE58A'], [1, '#E3A11F']]);
  c.beginPath(); c.moveTo(-9, 0); c.lineTo(-10, -9); c.lineTo(-4.5, -5); c.lineTo(0, -12); c.lineTo(4.5, -5); c.lineTo(10, -9); c.lineTo(9, 0); c.quadraticCurveTo(0, 2.4, -9, 0); c.closePath(); c.fill();
  c.fillStyle = '#FF8FB3'; c.beginPath(); c.arc(0, -3.5, 1.8, 0, TAU); c.fill();
  for (const px of [-10, 0, 10]) { c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(px, px ? -9 : -12, 1.1, 0, TAU); c.fill(); }
  c.restore();
  // เปลพระจันทร์เสี้ยวทอง (ปลายชี้ขึ้น) — ทับช่วงล่างของแมว
  crescent(c, x, cy, R, 0, -34, 72, lg(c, x - R, cy, x + R, cy + R, [[0, '#FFF2B8'], [0.5, '#F2CF6E'], [1, '#C99B3E']]));
  c.save(); c.beginPath(); c.arc(x, cy, R, 0, TAU); c.clip();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 3.5;
  c.beginPath(); c.arc(x, cy, R - 6, Math.PI * 0.62, Math.PI * 0.92); c.stroke();
  // จุดหลุมจันทร์ทองเข้ม + ประกาย
  c.fillStyle = 'rgba(190,140,50,.28)';
  for (const [dx, dy, r] of [[-30, 62, 5], [10, 70, 4], [40, 56, 6], [-52, 40, 3.5]]) { c.beginPath(); c.arc(x + dx, cy + dy, r, 0, TAU); c.fill(); }
  c.restore();
  // หางฟูพาดข้ามขอบเปลแล้วห้อยลงด้านนอก ปลายหางม้วนขึ้น (ผู้ใช้ 8 พ.ย. แก้หางให้ดูเป็นธรรมชาติ)
  const tail = () => { c.beginPath(); c.moveTo(x + 40, cy + 17); c.quadraticCurveTo(x + 66, cy + 2, x + 80, cy + 20); c.quadraticCurveTo(x + 91, cy + 38, x + 85, cy + 54); c.quadraticCurveTo(x + 81, cy + 63, x + 74, cy + 58); };
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = 'rgba(120,90,170,.18)'; c.lineWidth = 13; c.save(); c.translate(1.5, 2); tail(); c.stroke(); c.restore();
  c.strokeStyle = '#E8DEF5'; c.lineWidth = 12; tail(); c.stroke();
  c.strokeStyle = '#FFFFFF'; c.lineWidth = 8; c.save(); c.translate(-1, -1); tail(); c.stroke(); c.restore();
  c.fillStyle = '#F3D9EA'; c.beginPath(); c.arc(x + 74.5, cy + 57.5, 4.2, 0, TAU); c.fill();
  // ดาวห้อยจากปลายเสี้ยวสองข้าง (ปลายเสี้ยว ≈ x±72, cy−35)
  for (const [d, len] of [[-1, 26], [1, 18]]) {
    const sx = x + d * 70, sy = cy - 32;
    c.strokeStyle = 'rgba(247,222,156,.9)'; c.lineWidth = 1; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx, sy + len); c.stroke();
    c.fillStyle = SGOLD; star(c, sx, sy + len + 5, 6, -Math.PI / 2); c.fill();
  }
}
/** 7. กระดานภาพถ่ายเพื่อน ๆ บนขาตั้ง: กรอบทองริบบิ้นชื่อ โคมสองข้าง · โพลารอยด์ปักหมุด · ไฟประดับห้อยรอบขอบ */
const PB = { w: 220, top: GY - 186, h: 120 };
function drawBoardArt(c) {
  const x = X.board, { w, top, h } = PB, x0 = x - w / 2;
  c.fillStyle = 'rgba(40,20,90,.2)'; c.beginPath(); c.ellipse(x, GY - 1, 86, 5, 0, 0, TAU); c.fill();
  c.strokeStyle = goldV(c, top + h, GY); c.lineWidth = 5; c.lineCap = 'round';
  for (const dx of [-64, 64]) { c.beginPath(); c.moveTo(x + dx * 0.8, top + h); c.lineTo(x + dx, GY - 3); c.stroke(); }
  c.beginPath(); c.moveTo(x, top + h); c.lineTo(x, GY - 10); c.stroke();
  boardFrame(c, x0, top, w, h, ['#FFF0F7', '#F1E6FF']);
  const pics = [[-70, 40, -0.08, '#FFDDB8'], [-22, 36, 0.05, '#FFFFFF'], [28, 42, -0.04, '#D9D2E4'], [74, 36, 0.06, null], [-46, 84, 0.06, '#F7C9A0'], [4, 86, -0.07, '#EFE6F7'], [52, 84, 0.04, '#FFDDB8']];
  for (const [i, [dx, dy, rot, fur]] of pics.entries()) {
    c.save(); c.translate(x + dx, top + dy); c.rotate(rot);
    c.fillStyle = 'rgba(80,40,110,.15)'; c.fillRect(-17, -16, 38, 40);
    rr(c, -19, -18, 38, 40, 2, '#FFFFFF');
    c.fillStyle = fur ? ['#A9D6FF', '#FFE3EE', '#E6DBFF', '#E3F7EC'][i % 4] : '#2E2A6E';
    c.fillRect(-15, -14, 30, 26);
    if (fur) catFace(c, 0, 2, 8, fur, i % 2);
    else { c.fillStyle = '#FFF4D2'; c.beginPath(); c.arc(-2, -2, 7, 0, TAU); c.fill(); c.fillStyle = '#2E2A6E'; c.beginPath(); c.arc(2, -4, 6, 0, TAU); c.fill(); c.fillStyle = '#FFFFFF'; star(c, 8, 6, 2.5, -Math.PI / 2); c.fill(); }
    c.fillStyle = ['#FF6F9F', '#FFC94A', '#B596EE'][i % 3]; heart(c, 0, -19, 3.4); c.fill();
    c.restore();
  }
  boardBanner(c, x, top - 1, w * 0.6, ['#FFB3D2', '#E86A96', '#B94C7C']);
}
/**
 * 8. ศาลาพักผ่อนหลังคาโดม (ผู้ใช้ 8 พ.ย.: อลังการขึ้น ใหญ่ขึ้น นั่งได้ 3–4 คน)
 *   ฐานหินอ่อนสองขั้น · เสาหน้าคู่ใหญ่พันพวงดอกไม้ + เสาหลังคู่เล็ก · ม่านชีฟองชมพูรวบพู่ทอง
 *   โซฟายาว 4 ที่นั่ง พนักลอนโค้ง หมอนหน้าแมว/หัวใจ · ระบายสองชั้นใต้โดม · โดมทรงหัวหอมลาเวนเดอร์เส้นทอง
 *   ยอดโคมเล็ก + ยอดทองพระจันทร์เสี้ยวกับดาว · ไฟประดับตามชายคา + โคมดาวห้อยกลางศาลา (วาดสด)
 */
const GZ = { hw: 118, eave: GY - 164, base: GY - 188 };
const GZ_SEATS = [-84, -28, 28, 84];
function drawGazeboArt(c) {
  const x = X.gazebo, { hw, eave, base } = GZ;
  c.fillStyle = 'rgba(40,20,90,.22)'; c.beginPath(); c.ellipse(x, GY - 1, hw + 40, 8, 0, 0, TAU); c.fill();
  // ฐานหินอ่อนสองขั้น
  c.fillStyle = lg(c, 0, GY - 12, 0, GY, [[0, '#FFFFFF'], [1, '#E9DDF6']]); c.beginPath(); c.roundRect(x - hw - 30, GY - 12, 2 * hw + 60, 12, 5); c.fill();
  c.fillStyle = GOLD; c.fillRect(x - hw - 30, GY - 12, 2 * hw + 60, 2);
  c.fillStyle = lg(c, 0, GY - 22, 0, GY - 12, [[0, '#FBF6FF'], [1, '#E3D3F3']]); c.beginPath(); c.roundRect(x - hw - 16, GY - 22, 2 * hw + 32, 11, 4); c.fill();
  c.fillStyle = GOLD; c.fillRect(x - hw - 16, GY - 22, 2 * hw + 32, 1.8);
  for (let k = -3; k <= 3; k++) { c.fillStyle = 'rgba(245,169,208,.85)'; heart(c, x + k * 36, GY - 6, 3); c.fill(); }
  // ผ้าชีฟองด้านหลัง (เห็นฟ้าทะลุจาง ๆ)
  c.fillStyle = 'rgba(255,220,240,.32)';
  c.beginPath(); c.moveTo(x - hw + 10, eave + 6);
  for (let k = 0; k < 6; k++) { const a = x - hw + 10 + k * (2 * hw - 20) / 6; c.quadraticCurveTo(a + (2 * hw - 20) / 12, eave + 26, a + (2 * hw - 20) / 6, eave + 6); }
  c.lineTo(x + hw - 10, GY - 22); c.lineTo(x - hw + 10, GY - 22); c.closePath(); c.fill();
  // เสาหลังคู่เล็ก
  for (const d of [-1, 1]) {
    const px = x + d * hw * 0.5;
    c.fillStyle = lg(c, px - 5, 0, px + 5, 0, [[0, '#E5D8EE'], [0.5, '#FFFFFF'], [1, '#DED0EA']]); c.fillRect(px - 5, eave, 10, GY - 22 - eave);
    c.fillStyle = GOLD; c.fillRect(px - 7, eave, 14, 4);
  }
  // โคมดาวห้อยกลาง (โซ่ — ตัวโคมวาดสด)
  c.strokeStyle = 'rgba(201,155,62,.85)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, eave); c.lineTo(x, eave + 26); c.stroke();
  // โซฟายาว 4 ที่นั่ง: พนักลอนโค้ง (ลอนละที่นั่ง) + หมอน + เบาะ
  const bx0 = x - 112, bw = 224;
  c.fillStyle = lg(c, 0, GY - 82, 0, GY - 28, [[0, '#D5BFF5'], [1, '#A98BE0']]);
  c.beginPath(); c.moveTo(bx0, GY - 30); c.lineTo(bx0, GY - 58);
  for (const d of GZ_SEATS) { const sx = x + d; c.quadraticCurveTo(sx - 28, GY - 60, sx - 24, GY - 70); c.quadraticCurveTo(sx, GY - 86, sx + 24, GY - 70); c.quadraticCurveTo(sx + 28, GY - 60, sx + 28, GY - 58); }
  c.lineTo(bx0 + bw, GY - 30); c.closePath(); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 2;
  c.beginPath(); c.moveTo(bx0, GY - 58);
  for (const d of GZ_SEATS) { const sx = x + d; c.quadraticCurveTo(sx - 28, GY - 60, sx - 24, GY - 70); c.quadraticCurveTo(sx, GY - 86, sx + 24, GY - 70); c.quadraticCurveTo(sx + 28, GY - 60, sx + 28, GY - 58); }
  c.stroke();
  for (const [j, d] of GZ_SEATS.entries()) {
    const sx = x + d;
    if (j % 2 === 0) catFace(c, sx, GY - 47, 11, j ? '#FFFFFF' : '#FFDDB8', 1);
    else { c.fillStyle = lg(c, 0, GY - 58, 0, GY - 36, [[0, '#FFD3E6'], [1, '#F58CB8']]); heart(c, sx, GY - 47, 12); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(sx - 4, GY - 52, 3, 1.8, -0.6, 0, TAU); c.fill(); }
  }
  c.fillStyle = lg(c, 0, GY - 32, 0, GY - 13, [[0, LPINK], [1, '#F293C0']]);
  c.beginPath(); c.roundRect(bx0 - 2, GY - 31, bw + 4, 18, 8); c.fill();
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.roundRect(bx0 + 10, GY - 29, bw - 20, 4, 2); c.fill();
  c.strokeStyle = 'rgba(200,90,140,.28)'; c.lineWidth = 1.2;
  for (const d of [-56, 0, 56]) { c.beginPath(); c.moveTo(x + d, GY - 30); c.lineTo(x + d, GY - 15); c.stroke(); }
  for (const ax of [bx0 - 2, bx0 + bw + 2]) {
    c.fillStyle = lg(c, 0, GY - 52, 0, GY - 14, [[0, '#D5BFF5'], [1, '#9C7ADB']]); c.beginPath(); c.ellipse(ax, GY - 32, 11, 20, 0, 0, TAU); c.fill();
    c.strokeStyle = GOLD; c.lineWidth = 1.8; c.beginPath(); c.arc(ax, GY - 38, 4.6, 0, TAU); c.stroke();
  }
  // เสาหน้าคู่ใหญ่ + หัวเสา/ฐานทอง + พวงดอกไม้พันเสา
  for (const d of [-1, 1]) {
    const px = x + d * hw;
    c.fillStyle = lg(c, px - 9, 0, px + 9, 0, [[0, '#EADBD0'], [0.45, '#FFFFFF'], [1, '#E3D3C8']]); c.fillRect(px - 8, eave + 4, 16, GY - 22 - eave - 4);
    c.strokeStyle = 'rgba(201,155,62,.3)'; c.lineWidth = 1; for (const dx of [-3.5, 0, 3.5]) { c.beginPath(); c.moveTo(px + dx, eave + 12); c.lineTo(px + dx, GY - 30); c.stroke(); }
    c.fillStyle = goldV(c, eave, eave + 12); c.beginPath(); c.roundRect(px - 12, eave + 2, 24, 7, 2); c.fill(); c.beginPath(); c.roundRect(px - 9, eave + 8, 18, 5, 2); c.fill();
    c.fillStyle = goldV(c, GY - 34, GY - 22); c.beginPath(); c.roundRect(px - 10, GY - 31, 20, 9, 2); c.fill();
    for (let k = 0; k < 9; k++) {
      const y = eave + 20 + k * 15, sx = px + Math.sin(k * 1.4) * 8;
      c.fillStyle = '#8FCB95'; c.beginPath(); c.ellipse(sx - 3, y + 4, 4, 2, 0.6, 0, TAU); c.fill();
      c.fillStyle = ['#FF9EC4', '#FFFFFF', '#FFE48A'][k % 3]; c.beginPath(); c.arc(sx, y, 3.6, 0, TAU); c.fill();
      c.fillStyle = '#FFE48A'; c.beginPath(); c.arc(sx, y, 1.2, 0, TAU); c.fill();
    }
  }
  // ม่านชีฟองชมพูรวบที่เสาหน้า + พู่ทอง
  for (const d of [-1, 1]) {
    const px = x + d * hw;
    c.fillStyle = 'rgba(249,200,226,.8)';
    c.beginPath(); c.moveTo(px - d * 10, base + 6); c.lineTo(px - d * 62, base + 6);
    c.quadraticCurveTo(px - d * 28, eave + 60, px - d * 20, eave + 92); c.quadraticCurveTo(px - d * 16, eave + 130, px - d * 10, GY - 26);
    c.lineTo(px - d * 2, GY - 26); c.quadraticCurveTo(px - d * 6, base + 80, px - d * 4, base + 6); c.closePath(); c.fill();
    // จีบผ้าจากราวลงถึงจุดรวบ
    c.strokeStyle = 'rgba(220,120,170,.3)'; c.lineWidth = 1.6;
    for (const f of [0.25, 0.5, 0.75]) { c.beginPath(); c.moveTo(px - d * (6 + 54 * f), base + 8); c.quadraticCurveTo(px - d * (12 + 24 * f), eave + 60, px - d * 19, eave + 90); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(px - d * 44, base + 8); c.quadraticCurveTo(px - d * 24, eave + 60, px - d * 18, eave + 92); c.stroke();
    c.fillStyle = goldV(c, eave + 86, eave + 98); c.beginPath(); c.ellipse(px - d * 18, eave + 92, 7, 3.6, 0, 0, TAU); c.fill();
    c.fillStyle = GOLD; c.beginPath(); c.moveTo(px - d * 22, eave + 95); c.lineTo(px - d * 16, eave + 95); c.lineTo(px - d * 17, eave + 110); c.lineTo(px - d * 21, eave + 110); c.closePath(); c.fill();
  }
  // ระบายสองชั้นใต้โดม (ชมพู-ครีมลอนโค้ง · ลูกปัดทอง)
  const vw2 = hw + 34, n = 11;
  rr(c, x - vw2, base, 2 * vw2, 14, 4, CREAM);
  c.fillStyle = GOLD; c.fillRect(x - vw2, base + 12, 2 * vw2, 2.4);
  for (let k = 0; k < n; k++) {
    const sw = (2 * vw2) / n, sx = x - vw2 + k * sw;
    c.fillStyle = k % 2 ? CREAM : PINK; c.beginPath(); c.arc(sx + sw / 2, base + 14, sw / 2, 0, Math.PI); c.fill();
    c.fillStyle = GOLD; c.beginPath(); c.arc(sx, base + 15, 2.4, 0, TAU); c.fill();
  }
  for (let k = 0; k < n + 2; k++) {
    const sw = (2 * vw2 - 20) / (n + 2), sx = x - vw2 + 10 + k * sw;
    c.fillStyle = k % 2 ? 'rgba(249,213,232,.95)' : 'rgba(201,174,239,.95)'; c.beginPath(); c.moveTo(sx, base + 14); c.lineTo(sx + sw, base + 14); c.lineTo(sx + sw / 2, base + 26); c.closePath(); c.fill();
  }
  // โดมหัวหอมลาเวนเดอร์ + เส้นทอง + แสงวาว
  const dome = new Path2D();
  dome.moveTo(x - vw2 - 6, base + 2);
  dome.bezierCurveTo(x - vw2 - 14, base - 42, x - 74, base - 56, x - 20, base - 78);
  dome.quadraticCurveTo(x, base - 88, x + 20, base - 78);
  dome.bezierCurveTo(x + 74, base - 56, x + vw2 + 14, base - 42, x + vw2 + 6, base + 2);
  dome.closePath();
  c.fillStyle = lg(c, x - vw2, 0, x + vw2, 0, [[0, '#9C7ADB'], [0.4, '#C9AEEF'], [0.6, '#BFA2EC'], [1, '#8E66CF']]); c.fill(dome);
  c.save(); c.clip(dome);
  c.strokeStyle = 'rgba(235,198,111,.85)'; c.lineWidth = 2;
  for (const f of [-0.66, -0.33, 0, 0.33, 0.66]) { c.beginPath(); c.moveTo(x + f * vw2 * 1.05, base + 2); c.quadraticCurveTo(x + f * vw2 * 0.85, base - 50, x + f * 12, base - 84); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(x - 50, base - 38, 13, 34, 0.5, 0, TAU); c.fill();
  for (let k = 0; k < 8; k++) { c.fillStyle = 'rgba(255,240,200,.8)'; star(c, x - vw2 + 20 + hash(k * 3.1) * (2 * vw2 - 40), base - 10 - hash(k * 5.3) * 50, 2.4, 0); c.fill(); }
  c.restore();
  rr(c, x - vw2 - 8, base - 2, 2 * vw2 + 16, 6, 3, GOLD);
  // ยอดทอง: ลูกแก้ว + พระจันทร์เสี้ยวกับดาว
  c.fillStyle = goldV(c, base - 96, base - 84); c.beginPath(); c.arc(x, base - 89, 5, 0, TAU); c.fill();
  c.fillStyle = GOLD; c.fillRect(x - 1.6, base - 104, 3.2, 14);
  crescent(c, x, base - 110, 8, 4, -3, 6.8, '#F7DE9C');
  c.fillStyle = SGOLD; star(c, x + 9, base - 117, 3.6, -Math.PI / 2); c.fill();
}
/** ไฟประดับตามชายคา + โคมดาวห้อยกลางศาลา (วาดสด) */
function drawGazeboLive(c, t) {
  const x = X.gazebo, { hw, eave, base } = GZ, vw2 = hw + 34;
  for (let k = 0; k <= 12; k++) {
    const bx = x - vw2 + 8 + k * (2 * vw2 - 16) / 12, by = base + 30 + Math.sin((k / 12) * Math.PI) * 6;
    const tw = 0.55 + 0.45 * Math.sin(t * 0.07 + k * 1.3);
    c.fillStyle = `rgba(255,${k % 2 ? 226 : 190},${k % 2 ? 150 : 220},${(0.4 * tw).toFixed(3)})`; c.beginPath(); c.arc(bx, by, 6, 0, TAU); c.fill();
    c.fillStyle = k % 2 ? '#FFE9A8' : '#FFD0E6'; c.beginPath(); c.arc(bx, by, 2.4, 0, TAU); c.fill();
  }
  const ly = eave + 34, g = c.createRadialGradient(x, ly, 2, x, ly, 46);
  g.addColorStop(0, `rgba(255,232,170,${(0.55 + 0.12 * Math.sin(t * 0.05)).toFixed(3)})`); g.addColorStop(1, 'rgba(255,232,170,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, ly, 46, 0, TAU); c.fill();
  c.fillStyle = '#FFE48A'; star(c, x, ly, 8, -Math.PI / 2 + Math.sin(t * 0.02) * 0.1); c.fill();
  c.fillStyle = '#FFFFFF'; star(c, x, ly, 3.4, -Math.PI / 2); c.fill();
}

// ── ส่วนที่ main.js เรียก ───────────────────────────────────────
/** ฟ้า เนินไกล พื้น ราวระเบียง โคม (พิกัดโลก) */
export function drawRoofBack(c, camX, vw, t) {
  drawSky(c, camX, vw, t);
  drawFloor(c, camX, vw);
  drawRail(c, camX, vw);
  drawLights(c, camX, vw, t);
}
/** ของบนดาดฟ้า (หลังตัวน้องทั้งหมด) */
export function drawRoofWorld(c, camX, vw, t) {
  const vis = (x0, x1) => x1 > camX - 40 && x0 < camX + vw + 40;
  drawWishFly(c, camX, vw, t);
  if (vis(X.down - 90, X.down + 90)) { shaded(c, 'roof:down:v2', X.down - 84, GY - 254, 168, 256, drawDownArt); label(c, X.down, GY - 120, 'ลงชั้น 2', 'rgba(255,255,255,.94)', SPUR, 11); }
  if (vis(X.arch - 110, X.arch + 110)) {
    shaded(c, 'roof:arch:v2', X.arch - 118, GY - 260, 236, 262, drawArchArt);
    label(c, X.arch, GY - 262 + Math.sin(t * 0.05) * 1.5, 'จุดถ่ายรูป', 'rgba(255,255,255,.92)', '#E86A96', 11);
  }
  for (const x of [X.bench1, X.bench2]) if (vis(x - 130, x + 130)) shaded(c, 'roof:bench2:' + x, x - VB_W / 2 - 14, GY - 74, VB_W + 28, 76, (g) => drawViewBench(g, x));
  if (vis(X.scope - 80, X.scope + 90)) { shaded(c, 'roof:scope:v2', X.scope - 66, GY - 150, 150, 152, drawScopeArt); drawScopeLive(c, t); sparkleHint(c, X.scope + 10, GY - 112, 40, t); }
  for (const [x, k] of PLANTS) if (vis(x - 40, x + 40)) { c.save(); c.translate(x, GY); shaded(c, 'hall:plant3:' + k, -40, -130, 80, 132, (g) => drawPlantArt(g, k)); c.restore(); }
  if (vis(X.moon - 120, X.moon + 120)) {
    const g = c.createRadialGradient(X.moon, GY - 140, 20, X.moon, GY - 140, 150);
    g.addColorStop(0, `rgba(255,236,170,${0.32 + 0.08 * Math.sin(t * 0.03)})`); g.addColorStop(1, 'rgba(255,236,170,0)');
    c.fillStyle = g; c.beginPath(); c.arc(X.moon, GY - 140, 150, 0, TAU); c.fill();
    shaded(c, 'roof:moon:v2', X.moon - 104, GY - 250, 208, 252, drawMoonArt);
    sparkleHint(c, X.moon, GY - 170, 80, t);
    for (let i = 0; i < 5; i++) {
      const u = (t * 0.01 + i / 5) % 1;
      c.globalAlpha = Math.sin(u * Math.PI);
      c.fillStyle = i % 2 ? '#FFFFFF' : SGOLD;
      star(c, X.moon + Math.cos(i * 1.7) * 92, GY - 90 - u * 120, 3, t * 0.03 + i); c.fill();
    }
    c.globalAlpha = 1;
  }
  if (vis(X.board - 150, X.board + 150)) {
    shaded(c, 'roof:board', X.board - PB.w / 2 - 30, PB.top - 40, PB.w + 64, GY - PB.top + 42, drawBoardArt);
    boardLive(c, X.board - PB.w / 2, PB.top, PB.w, PB.h, t, 'ภาพถ่ายเพื่อน ๆ', PB.top - 1);
  }
  if (vis(X.gazebo - 170, X.gazebo + 170)) {
    shaded(c, 'roof:gazebo:v2', X.gazebo - 172, GZ.base - 124, 344, GY - GZ.base + 126, drawGazeboArt);
    drawGazeboLive(c, t);
  }
}
