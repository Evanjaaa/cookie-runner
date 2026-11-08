// src/render/world-map.js
// ─────────────────────────────────────────────────────────────
// แผนที่โลกเหมียว — หน้า "แผนที่" จากปุ่มบนหน้าแรก (ผู้ใช้ 7 พ.ย. 2026 วาดผังร่างมาให้)
//
//   ฝั่งเหนือแม่น้ำ:  เมืองแมวเหมียว (ร้านค้า ซ้าย) · ปราสาทแมวเหมียว (กลาง) · ดินแดนปริศนา (ขวา)
//   กลาง:            แม่น้ำยาวตลอดแผนที่ · สะพานหลวงข้ามจากหน้าแรกไปหน้าประตูปราสาท
//   ฝั่งใต้แม่น้ำ:    ดินแดนใหม่ (ซ้าย · กำลังสร้าง) · หน้าแรก (ขวา · อยู่ที่นี่)
//
// รอบ 2 (ผู้ใช้ 7 พ.ย.: "ให้เหมือนสถานที่จริง"):
//   - เมือง + ปราสาทตั้งริมน้ำจริง: อาคาร → ถนนริมน้ำ (ทางเดิน) → คันหิน → ผนังตลิ่งหินลาเวนเดอร์ → น้ำ (ชุดสีเดียวกับในเมือง)
//     ถนนเมืองปูอิฐครีม · ซุ้มประตูเขต → ถนนหลวงกระเบื้องขาวมุก/ลาเวนเดอร์ขอบทองหน้าปราสาท (ชุดเดียวกับ castle.js)
//   - ของบนถนนใช้ภาพจริงจากเมืองทั้งหมด: ซุ้มทางเข้าเมือง ร้านทั้งห้า ท่าเรือ ลานน้ำพุ สะพานศาลา ซุ้มสวนดอกไม้ ตะเกียง
//     ปราสาท รั้วหลวง + สวนหลวง โคมหลวง ซุ้มประตูเขต · ลำธารกลางเมืองไหลจากน้ำตกลอดใต้สะพานศาลาลงแม่น้ำ
//   - หน้าแรก = ฉากหน้าแรกจริงมองจากมุมสูง (src/render/riverside.js): ลานกระเบื้องหลวงลาเวนเดอร์/ขาวมุกเม็ดทอง
//     ขอบหินริมน้ำ + เสาหัวบัวทองพวงมาลัย · สะพานหลวงพื้นหินขาวมุกขอบทอง ราวลูกกรงขาวแถบชมพู เสาหัวบัว
//     พรมชมพูขอบทองจากลานข้ามสะพานถึงประตูปราสาท · โคมหลวงหัวสะพาน · รูปปั้นแมวองครักษ์ · บ้านลูกเหมียว
//   - ตลิ่งธรรมชาติ (ทราย กก) เฉพาะช่วงที่ยังไม่มีเมือง: ดินแดนใหม่ · ดินแดนปริศนา · ส่วนที่ต่อออกไปถึงขอบจอ
//
// รอบ 3 (ผู้ใช้ 7 พ.ย.: "เบียดไป · ปราสาทเล็กไป · ไม่ต้องหวงพื้นที่ อนาคตแผนที่จะเลื่อนไปทางขวาได้ · เอาสี่เหลี่ยมจาง ๆ ของแต่ละพื้นที่ออก"):
//   แผนที่กว้างกว่าจอ เลื่อนซ้าย-ขวาได้ (ลาก / ล้อเมาส์ / ลูกศร — main.js) · ร้านเว้นระยะ · ปราสาทใหญ่ขึ้นเกือบเท่าตัวย้ายไปขวา
//   ดินแดนปริศนาขยับตาม · ไม่มีสีพื้นเขต/เส้นประแล้ว เหลือแค่ป้ายชื่อ (พื้นที่กดยังอยู่ตาม ZONES.rect)
//
// หน่วย: พิกัดออกแบบ สูง 900 · กว้าง WM.W (เพิ่มสถานที่ใหม่ = ขยาย WM.W ไปทางขวา) · ผู้เรียกย่อให้สูงพอดีจอ (fitWorld)
//   แล้วเลื่อนกล้องแนวนอน (clampCam) · ฉากนิ่งวาดเกินขอบโลกไปข้างละ WORLD_EXT เผื่อจอกว้างมาก
// ภาพนิ่ง (drawWorldStatic) วาดครั้งเดียวต่อขนาดจอ (main.js แบ่งเป็นแผ่น ๆ) · ชั้นสด (drawWorldLive) = น้ำวิบ เรือ เป็ด ธงปราสาท ควันร้าน
//   บ้านลูกเหมียวหายใจ น้องแมว หมุด ม่านหมอก
// ป้ายชื่อเป็น HTML ทับแผนที่ (main.js) — ตำแหน่งจาก ZONES ชุดเดียวกัน
// ─────────────────────────────────────────────────────────────
import { drawShopAt, drawTownPieceAt, bush, flowers, heart, star, lg } from '../town/world.js';
import { drawCastleAt, drawFenceAt, drawRoyalLampAt, drawGuardAt, drawRealmGateAt } from '../town/castle.js';
import { drawBoat, BOAT_Y, drawPlayPieceAt } from '../town/play.js';
import { drawSalaBridgeAt } from '../town/bridge.js';
import { drawHomeBox } from './catbox.js';

const TAU = Math.PI * 2;
const GOLD = '#E8C26A';
export const WM = { W: 2960, H: 900 };
/** ช่วงที่ฉากนิ่งวาด (เกินขอบโลกข้างละ 300 — จอกว้างกว่าโลกก็ยังมีพื้นต่อ) */
export const WORLD_EXT = { x0: -300, x1: WM.W + 300, y0: -4, y1: WM.H + 4 };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ── ผัง ────────────────────────────────────────────────────────
const ST_B = 398;                 // ขอบหลังถนนริมน้ำ = ฐานร้าน/ปราสาท
const ST_F = 430;                 // ขอบหน้าถนน → คันหิน
const N_EDGE = 448;               // ผิวน้ำชิดผนังตลิ่งฝั่งเหนือ
const S_EDGE = 588;               // ขอบตลิ่งฝั่งใต้ (ลานหน้าแรก)
const N_BUILT = [36, 2500];       // ช่วงตลิ่งหินฝั่งเหนือ (เมือง + ปราสาท) — นอกช่วงเป็นตลิ่งธรรมชาติ
const SHOP_S = 0.36, CASTLE_S = 0.62, SALA_S = 0.26, GATE_S = 0.4;
const GATE_X = 1640;              // ซุ้มประตูเขตปราสาท (ถนนเมือง → ถนนหลวง)
const ROYAL_X = GATE_X - 143 * GATE_S;   // ต้นถนนหลวง (ขอบนอกเสาซ้ายของซุ้ม)
const BRIDGE_X = 2080, BR_HW = 64;       // สะพานหลวง (กลางปราสาท–หน้าแรก)
const STREAM_X = 1010, STREAM_HW = 39;   // ลำธารกลางเมือง (ลอดใต้สะพานศาลา — กว้างเท่าช่องน้ำใต้สะพาน × SALA_S)
const PLAZA = { x0: 1850, x1: 2310, y0: S_EDGE + 8, y1: 790 };
const S_BUILT = [PLAZA.x0 - 4, PLAZA.x1 + 4];   // ช่วงตลิ่งหินฝั่งใต้ (หน้าแรก)
const CAT = { x: BRIDGE_X, y: 698 };
/** จุดกลางหน้าแรก (น้องยืน) — main.js เปิดแผนที่ครั้งแรกโดยให้จุดนี้อยู่กลางจอ */
export const HOME_X = CAT.x;
/** ของบนถนนเมือง (ภาพจริงจากเมือง เรียงตามลำดับในเมือง) — x = กลาง · ฐานที่ ST_B */
const TOWN = [
  ['welcome', 90], ['food', 200], ['care', 310], ['home', 420], ['pierA', 530], ['plaza', 680],
  ['tower', 800], ['swing', 862], ['arch', 1180], ['toy', 1290], ['exchange', 1410], ['pierB', 1530],
];
const SHOP_IDS = new Set(['food', 'care', 'home', 'toy', 'exchange']);
const LAMPS = [137, 258, 362, 481, 1222, 1350, 1477];

const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
/** 0 = อยู่ในช่วง [a, b] · ไล่ขึ้นเป็น 1 เมื่อออกนอกช่วงไป w */
const outside = (x, [a, b], w) => smooth((a - x) / w) + smooth((x - b) / w);
/** ขอบบน/ล่างของแม่น้ำ — ตลิ่งหินตรง · ตลิ่งธรรมชาติคดเคี้ยวนิด ๆ */
export const riverTop = (x) => N_EDGE + outside(x, N_BUILT, 50) * (Math.sin(x / 170) * 7 + Math.sin(x / 63) * 2 + 4);
export const riverBot = (x) => S_EDGE + outside(x, S_BUILT, 50) * (Math.sin(x / 150 + 1) * 7 + Math.sin(x / 57) * 2 + 3);
/** แนวกลางลำธาร (ไหลจากน้ำตกลงมาทางใต้) */
const streamX = (y) => STREAM_X + Math.sin(y / 70) * 10 * smooth((ST_B - 30 - y) / 80);

/**
 * โซนบนแผนที่ — rect = พื้นที่กด (พิกัดออกแบบ · ไม่วาดกรอบ) · label = จุดวางป้ายชื่อ
 * act: 'town' ไปเมือง · 'soon' ขึ้นข้อความ msg (เร็ว ๆ นี้) · 'wild' วาปไปหน้ารอ (ดินแดนใหม่) · 'home' อยู่ที่นี่ (ปิดแผนที่)
 */
export const ZONES = [
  { id: 'town', act: 'town', name: 'เมืองแมวเหมียว', sub: 'ร้านค้า · ลานน้ำพุ · ท่าเรือ', rect: [30, 66, 1560, 386], label: [760, 150] },
  { id: 'castle', act: 'castle', name: 'ปราสาทแมวเหมียว', sub: 'จุดนัดเจอเพื่อน · ชั้น 1 เปิดแล้ว', rect: [1700, 30, 800, 422], label: [BRIDGE_X, 92] },
  { id: 'mist', act: 'soon', name: 'ดินแดนปริศนา', sub: 'เร็ว ๆ นี้', rect: [2590, 66, 320, 386], label: [2750, 150],
    msg: 'ดินแดนปริศนายังปิดอยู่ เร็ว ๆ นี้นะ' },
  { id: 'wild', act: 'wild', name: 'ดินแดนใหม่', sub: 'กำลังสร้าง', rect: [240, 606, 1300, 272], label: [890, 626] },
  { id: 'home', act: 'home', name: 'หน้าแรก', sub: 'อยู่ที่นี่', rect: [1830, 600, 500, 278], label: [BRIDGE_X, 800] },
];

/** ย่อแผนที่ให้สูงพอดีจอ · คืนสเกล และความกว้างที่มองเห็น (พิกัดออกแบบ) — เลื่อนแนวนอนด้วย clampCam */
export function fitWorld(cw, ch) {
  const s = ch / WM.H;
  return { s, viewW: cw / s };
}
/** ตำแหน่งกล้อง (ขอบซ้ายของจอ ในพิกัดออกแบบ) ที่ไม่เลยขอบโลก · จอกว้างกว่าโลก = จัดกลาง */
export function clampCam(x, viewW) {
  if (viewW >= WM.W) return (WM.W - viewW) / 2;
  return Math.max(0, Math.min(WM.W - viewW, x));
}

/** โซนที่จุด (x, y) ในพิกัดออกแบบตกอยู่ */
export function zoneAt(x, y) {
  return ZONES.find((z) => x >= z.rect[0] && x <= z.rect[0] + z.rect[2] && y >= z.rect[1] && y <= z.rect[1] + z.rect[3]) || null;
}

// ── ของชิ้นเล็ก ────────────────────────────────────────────────
function rr(c, x, y, w, h, r, col) { c.fillStyle = col; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }
function shadow(c, x, y, w, a = 0.16) { c.fillStyle = `rgba(80,50,110,${a})`; c.beginPath(); c.ellipse(x, y, w, w * 0.32, 0, 0, TAU); c.fill(); }
/** ต้นไม้มุมสูงแบบการ์ตูน (ยืนตรง) · kind 0 พุ่มกลม · 1 ซากุระ · 2 สน */
function tree(c, x, y, r, kind) {
  shadow(c, x + r * 0.2, y + 1, r * 0.9);
  rr(c, x - r * 0.13, y - r * 0.75, r * 0.26, r * 0.78, r * 0.08, '#B98A68');
  if (kind === 2) {
    c.fillStyle = '#7FC29B';
    c.beginPath(); c.moveTo(x, y - r * 2.4); c.lineTo(x + r * 0.85, y - r * 0.5); c.lineTo(x - r * 0.85, y - r * 0.5); c.closePath(); c.fill();
    c.fillStyle = '#95D3AE';
    c.beginPath(); c.moveTo(x, y - r * 2.4); c.lineTo(x + r * 0.2, y - r * 0.6); c.lineTo(x - r * 0.62, y - r * 0.6); c.closePath(); c.fill();
    return;
  }
  const [a, b] = kind === 1 ? ['#F7B6D2', '#FFD3E6'] : ['#86CB8E', '#A8DDA6'];
  c.fillStyle = a;
  c.beginPath(); c.arc(x - r * 0.5, y - r * 0.95, r * 0.62, 0, TAU); c.arc(x + r * 0.5, y - r * 0.95, r * 0.62, 0, TAU); c.arc(x, y - r * 1.45, r * 0.72, 0, TAU); c.fill();
  c.fillStyle = b;
  c.beginPath(); c.arc(x - r * 0.22, y - r * 1.62, r * 0.36, 0, TAU); c.fill();
  if (kind === 1) {
    c.fillStyle = '#FFFFFF';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x - r * 0.6 + hash(x + i) * r * 1.2, y - r * 1.5 + hash(y + i) * r * 0.9, r * 0.07, 0, TAU); c.fill(); }
  }
}
function flowerDot(c, x, y, col) {
  c.fillStyle = col;
  for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5; c.beginPath(); c.arc(x + Math.cos(a) * 1.7, y + Math.sin(a) * 1.7, 1.4, 0, TAU); c.fill(); }
  c.fillStyle = '#FFE58A'; c.beginPath(); c.arc(x, y, 1, 0, TAU); c.fill();
}
/** ทางเดินดินลายกรวด ตามเส้น pts กว้าง w */
function cobble(c, pts, w, base = '#F7EADB', edge = '#E7CFB4') {
  c.lineCap = 'round'; c.lineJoin = 'round';
  const line = () => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); };
  line(); c.strokeStyle = edge; c.lineWidth = w + 5; c.stroke();
  line(); c.strokeStyle = base; c.lineWidth = w; c.stroke();
  c.fillStyle = 'rgba(214,186,156,.42)';
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / 13);
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n, h = hash(x0 + k * 7 + y0);
      c.beginPath(); c.ellipse(x0 + (x1 - x0) * f + (h - 0.5) * w * 0.55, y0 + (y1 - y0) * f + (hash(h * 9) - 0.5) * w * 0.55, 2.4, 1.6, h * 3, 0, TAU); c.fill();
    }
  }
}
const along = (x0, x1, f, step = 24) => { const p = []; for (let x = x0; x <= x1; x += step) p.push([x, f(x)]); p.push([x1, f(x1)]); return p; };
/** เสาหัวบัวทอง (ราวสะพาน/ขอบลานริมน้ำ ชุดเดียวกับหน้าแรก) — ฐาน (x, base) · k = ขนาด */
function lotusPost(c, x, base, k = 1) {
  const w = 7 * k, h = 12 * k;
  c.fillStyle = 'rgba(80,50,110,.18)';
  c.beginPath(); c.ellipse(x + 1.5 * k, base + 0.5, w * 0.7, 1.6 * k, 0, 0, TAU); c.fill();
  c.fillStyle = lg(c, x - w / 2, 0, x + w / 2, 0, [[0, '#EBDDFB'], [0.5, '#FFFFFF'], [1, '#E2D0F2']]);
  c.beginPath(); c.roundRect(x - w / 2, base - h, w, h, 1.5 * k); c.fill();
  c.fillStyle = GOLD;
  c.fillRect(x - w / 2 - 0.4 * k, base - h + 1.6 * k, w + 0.8 * k, 1.3 * k);
  c.beginPath(); c.moveTo(x - w * 0.46, base - h); c.quadraticCurveTo(x - w * 0.46, base - h - 4.5 * k, x, base - h - 7 * k); c.quadraticCurveTo(x + w * 0.46, base - h - 4.5 * k, x + w * 0.46, base - h); c.closePath(); c.fill();
  c.fillStyle = '#FF8FB3';
  heart(c, x, base - h * 0.42, 1.8 * k); c.fill();
}

// ── พื้น ───────────────────────────────────────────────────────
function ground(c, e) {
  c.fillStyle = lg(c, 0, e.y0, 0, e.y1, [[0, '#BEE6B0'], [0.5, '#B2E0A8'], [1, '#A9DAA2']]);
  c.fillRect(e.x0, e.y0, e.x1 - e.x0, e.y1 - e.y0);
  // ปื้นหญ้าอ่อน ๆ + ดอกไม้จิ๋วทั่วแผนที่
  const n = Math.ceil(((e.x1 - e.x0) * (e.y1 - e.y0)) / 9000);
  for (let i = 0; i < n; i++) {
    const x = e.x0 + hash(i * 3.1) * (e.x1 - e.x0), y = e.y0 + hash(i * 7.7) * (e.y1 - e.y0);
    if (y > riverTop(x) - 12 && y < riverBot(x) + 12) continue;
    if (i % 3 === 0) { c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.ellipse(x, y, 30 + hash(i) * 40, 9 + hash(i + 2) * 7, 0, 0, TAU); c.fill(); } else if (i % 3 === 1) {
      c.strokeStyle = 'rgba(110,170,100,.35)'; c.lineWidth = 1.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x - 1, y - 5); c.moveTo(x, y); c.lineTo(x + 1, y - 6); c.moveTo(x + 3, y); c.lineTo(x + 3.5, y - 4); c.stroke();
    } else flowerDot(c, x, y, ['#FFB6D5', '#FFFFFF', '#C9B5FF', '#FFE48A'][i % 4]);
  }
}
// ── แม่น้ำ ─────────────────────────────────────────────────────
function riverBand(c, e, off) {
  c.beginPath();
  c.moveTo(e.x0, riverTop(e.x0) - off);
  for (let x = e.x0; x <= e.x1; x += 12) c.lineTo(x, riverTop(x) - off);
  c.lineTo(e.x1, riverTop(e.x1) - off);
  for (let x = e.x1; x >= e.x0; x -= 12) c.lineTo(x, riverBot(x) + off);
  c.lineTo(e.x0, riverBot(e.x0) + off);
  c.closePath();
}
function river(c, e) {
  riverBand(c, e, 11); c.fillStyle = '#F1E1C8'; c.fill();             // ตลิ่งทราย (ช่วงหินโดนผนังทับ)
  riverBand(c, e, 6); c.fillStyle = '#E3CDAE'; c.fill();
  riverBand(c, e, 0); c.fillStyle = lg(c, 0, N_EDGE, 0, S_EDGE, [[0, '#86C6EF'], [0.55, '#7ABCEB'], [1, '#8ECCF2']]); c.fill();
  c.save(); riverBand(c, e, 0); c.clip();
  // เงาสะท้อนปราสาท (กลับหัว บีบแนวตั้ง จาง ๆ — แบบหน้าแรก)
  c.save();
  c.globalAlpha = 0.18;
  c.translate(0, N_EDGE); c.scale(1, -0.55); c.translate(0, -ST_B);
  drawCastleAt(c, BRIDGE_X, ST_B, CASTLE_S, 0, 'still');
  c.restore();
  // เงาผนังตลิ่งเหนือในน้ำ + แสงกลางน้ำ
  c.fillStyle = lg(c, 0, N_EDGE, 0, N_EDGE + 18, [[0, 'rgba(60,90,160,.2)'], [1, 'rgba(60,90,160,0)']]);
  c.fillRect(e.x0, N_EDGE - 10, e.x1 - e.x0, 30);
  c.fillStyle = lg(c, 0, N_EDGE + 40, 0, S_EDGE - 20, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]);
  c.fillRect(e.x0, N_EDGE + 40, e.x1 - e.x0, S_EDGE - N_EDGE - 60);
  // คลื่นขาวไหลเป็นแถว
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineCap = 'round';
  for (let j = 0; j < 6; j++) {
    const y = N_EDGE + 22 + j * 21, gap = 90 + j * 6;
    c.lineWidth = 1.4 + j * 0.15;
    for (let x = e.x0 + ((j * 37) % gap); x < e.x1; x += gap) {
      if (Math.abs(x - BRIDGE_X) < BR_HW + 24) continue;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 12 + j, y); c.stroke();
    }
  }
  c.restore();
  // ใบบัว + ดอกบัว (ชิดตลิ่ง)
  for (const [x, y, r] of [[96, 466, 10], [120, 474, 7], [700, 572, 11], [728, 562, 7], [400, 568, 9], [1200, 470, 8], [1640, 572, 10], [1760, 470, 9], [2390, 574, 10], [2460, 470, 8], [2640, 572, 12], [2666, 562, 8], [2900, 476, 11], [-90, 566, 10], [3100, 560, 10]]) {
    if (x < e.x0 - 20 || x > e.x1 + 20) continue;
    c.fillStyle = '#7CC88A';
    c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, 0.3, TAU - 0.15); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, TAU); c.fill();
    if (r > 9) { c.fillStyle = '#FFB3D1'; for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5; c.beginPath(); c.ellipse(x + Math.cos(a) * 3, y - 2 + Math.sin(a) * 3, 3.2, 1.8, a, 0, TAU); c.fill(); } c.fillStyle = '#FFE58A'; c.beginPath(); c.arc(x, y - 2, 1.6, 0, TAU); c.fill(); }
  }
  // กกริมตลิ่งธรรมชาติ
  c.strokeStyle = '#6FBF84'; c.lineWidth = 2; c.lineCap = 'round';
  for (let i = 0; i < (e.x1 - e.x0) / 50; i++) {
    const x = e.x0 + hash(i * 8.1) * (e.x1 - e.x0);
    const top = hash(i) > 0.5;
    if ((top ? outside(x, N_BUILT, 30) : outside(x, S_BUILT, 30)) < 0.9) continue;
    const y = top ? riverTop(x) - 9 : riverBot(x) + 13;
    for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + k * 3, y); c.quadraticCurveTo(x + k * 5, y - 8, x + k * 6, y - 14); c.stroke(); }
  }
}

/** ลำธารกลางเมือง: น้ำตกบนเนินหิน → คดเคี้ยวลงมา → ลอดใต้ถนน/สะพานศาลา → แม่น้ำ */
function stream(c) {
  const top = 168, bot = N_EDGE + 2;
  const hw = (y) => 13 + (STREAM_HW - 13) * smooth((y - (ST_B - 90)) / 80);
  const shape = (pad) => {
    c.beginPath();
    for (let y = top; y <= bot; y += 6) c.lineTo(streamX(y) - hw(y) - pad, y);
    for (let y = bot; y >= top; y -= 6) c.lineTo(streamX(y) + hw(y) + pad, y);
    c.closePath();
  };
  shape(6); c.fillStyle = '#F1E1C8'; c.fill();
  shape(3); c.fillStyle = '#E3CDAE'; c.fill();
  shape(0); c.fillStyle = lg(c, 0, top, 0, bot, [[0, '#A6DCF7'], [1, '#86C6EF']]); c.fill();
  // ช่วงใกล้ถนน: ผนังหินลาเวนเดอร์สองฝั่ง (ชุดเดียวกับตลิ่งแม่น้ำ)
  for (const d of [-1, 1]) {
    c.fillStyle = '#BBA7DA';
    c.beginPath();
    for (let y = ST_B - 46; y <= bot; y += 6) c.lineTo(streamX(y) + d * (hw(y) + 1), y);
    for (let y = bot; y >= ST_B - 46; y -= 6) c.lineTo(streamX(y) + d * (hw(y) + 5), y);
    c.closePath(); c.fill();
  }
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.8; c.lineCap = 'round';
  for (let y = top + 22; y < ST_B - 10; y += 24) { const x = streamX(y); c.beginPath(); c.moveTo(x - 5, y); c.lineTo(x + 5, y + 2); c.stroke(); }
  // น้ำตกบนเนินหิน (ต้นน้ำ — ชุดเดียวกับน้ำตกหลังเมือง)
  const wx = streamX(top);
  c.fillStyle = '#C9B6E6';
  c.beginPath(); c.ellipse(wx, top - 18, 62, 34, 0, 0, TAU); c.fill();
  c.fillStyle = '#B7A1DA';
  c.beginPath(); c.ellipse(wx - 30, top - 8, 30, 18, 0, 0, TAU); c.ellipse(wx + 34, top - 6, 28, 16, 0, 0, TAU); c.fill();
  c.fillStyle = '#A8DDA0';
  c.beginPath(); c.ellipse(wx - 4, top - 44, 52, 14, 0, 0, TAU); c.fill();
  c.fillStyle = lg(c, wx - 10, 0, wx + 10, 0, [[0, '#BDE6FB'], [0.5, '#FFFFFF'], [1, '#BDE6FB']]);
  c.beginPath(); c.roundRect(wx - 10, top - 42, 20, 42, 6); c.fill();
  c.strokeStyle = 'rgba(120,190,235,.6)'; c.lineWidth = 1.4;
  for (const dx of [-5, 0, 5]) { c.beginPath(); c.moveTo(wx + dx, top - 38); c.lineTo(wx + dx, top - 4); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.9)';
  c.beginPath(); c.ellipse(wx, top + 2, 18, 5, 0, 0, TAU); c.fill();
  for (const [x, y] of [[wx - 30, top - 40], [wx + 30, top - 42]]) tree(c, x, y, 11, 2);
}

// ── ริมน้ำฝั่งเหนือ: ถนน + คันหิน + ผนังตลิ่ง (ชุดสีเดียวกับในเมือง world.js drawGround) ─────────
/** ช่วง x ที่ถนน/ตลิ่งต้องเว้นให้ลำธาร */
const STREAM_GAP = [STREAM_X - STREAM_HW - 4, STREAM_X + STREAM_HW + 4];
function spans(x0, x1) {
  const out = [];
  if (x1 > STREAM_GAP[0] && x0 < STREAM_GAP[1]) {
    if (STREAM_GAP[0] > x0) out.push([x0, STREAM_GAP[0]]);
    if (x1 > STREAM_GAP[1]) out.push([STREAM_GAP[1], x1]);
  } else out.push([x0, x1]);
  return out;
}
function townStreet(c, x0, x1) {
  for (const [a, b] of spans(x0, x1)) {
    c.fillStyle = lg(c, 0, ST_B, 0, ST_F, [[0, '#F6DDC4'], [1, '#ECCBAE']]);
    c.fillRect(a, ST_B, b - a, ST_F - ST_B);
    c.save(); c.beginPath(); c.rect(a, ST_B, b - a, ST_F - ST_B); c.clip();
    c.fillStyle = 'rgba(255,255,255,.4)';
    for (let r = 0; r < 3; r++) {
      for (let x = Math.floor(a / 14) * 14 - 14 + (r % 2) * 7; x < b; x += 14) { c.beginPath(); c.roundRect(x + 1, ST_B + 3 + r * 9.5, 11, 7, 2.6); c.fill(); }
    }
    c.restore();
    c.fillStyle = lg(c, 0, ST_B, 0, ST_B + 8, [[0, 'rgba(110,70,120,.16)'], [1, 'rgba(110,70,120,0)']]);
    c.fillRect(a, ST_B, b - a, 8);
  }
}
/** ถนนหลวง (กระเบื้องสลับขาวมุก/ลาเวนเดอร์ เม็ดทองตรงรอยต่อ ขอบทอง — castle.js drawRealmGround) */
function royalRoad(c, x0, x1) {
  c.fillStyle = lg(c, 0, ST_B, 0, ST_F, [[0, '#F5EAFC'], [1, '#E8D6F5']]);
  c.fillRect(x0, ST_B, x1 - x0, ST_F - ST_B);
  c.save(); c.beginPath(); c.rect(x0, ST_B, x1 - x0, ST_F - ST_B); c.clip();
  for (let x = x0, i = 0; x < x1; x += 14, i++) {
    for (let r = 0; r < 3; r++) {
      c.fillStyle = (i + r) % 2 ? 'rgba(255,255,255,.85)' : 'rgba(208,182,238,.6)';
      c.beginPath(); c.roundRect(x + (r % 2) * 7 + 1, ST_B + 3.5 + r * 9.5, 11, 7, 2.6); c.fill();
    }
    c.fillStyle = GOLD;
    c.beginPath(); c.arc(x, ST_B + 12, 0.9, 0, TAU); c.fill();
  }
  c.restore();
  c.fillStyle = GOLD;
  c.fillRect(x0, ST_B + 1, x1 - x0, 1.2);
  c.fillRect(x0, ST_F - 3, x1 - x0, 1.2);
  c.fillStyle = lg(c, 0, ST_B, 0, ST_B + 8, [[0, 'rgba(110,70,120,.14)'], [1, 'rgba(110,70,120,0)']]);
  c.fillRect(x0, ST_B, x1 - x0, 8);
  // ธรณีประตูเขต: แถบทองขวางถนนตรงต้นถนนหลวง
  c.fillStyle = lg(c, x0 - 3, 0, x0 + 3, 0, [[0, '#E3A11F'], [0.5, '#FFE58A'], [1, '#E3A11F']]);
  c.fillRect(x0 - 2.5, ST_B, 5, ST_F - ST_B);
}
/** คันหิน + ผนังตลิ่งหินลาเวนเดอร์ (หน้าหินหันลงน้ำ) */
function bankWall(c, x0, x1) {
  for (const [a, b] of spans(x0, x1)) {
    c.fillStyle = '#E2D2F2';
    c.fillRect(a, ST_F - 2, b - a, 6);
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.fillRect(a, ST_F - 2, b - a, 1.2);
    c.fillStyle = 'rgba(150,120,200,.3)';
    for (let x = Math.ceil(a / 9) * 9; x < b; x += 9) c.fillRect(x, ST_F - 2, 0.8, 6);
    c.fillStyle = lg(c, 0, ST_F + 4, 0, N_EDGE, [[0, '#BBA7DA'], [1, '#9C86C4']]);
    c.fillRect(a, ST_F + 4, b - a, N_EDGE - ST_F - 4);
    c.fillStyle = 'rgba(90,60,140,.22)';
    for (let x = Math.ceil(a / 16) * 16; x < b; x += 16) c.fillRect(x, ST_F + 4, 1, N_EDGE - ST_F - 4);
    for (let x = Math.ceil(a / 16) * 16 + 8; x < b; x += 16) c.fillRect(x, ST_F + 11, 1, N_EDGE - ST_F - 11);
    c.fillRect(a, ST_F + 10.5, b - a, 0.8);
  }
}
/** ลำธารลอดใต้ถนน: แผ่นหินพาดข้าม (ครึ่งหลังของถนน — ครึ่งหน้าเป็นสะพานศาลา) */
function streamCrossing(c) {
  const a = STREAM_GAP[0] - 2, b = STREAM_GAP[1] + 2;
  c.fillStyle = lg(c, 0, ST_B, 0, ST_B + 18, [[0, '#F2DECB'], [1, '#E6C9AE']]);
  c.fillRect(a, ST_B, b - a, 16);
  c.fillStyle = '#BBA7DA';
  c.fillRect(a, ST_B + 16, b - a, 3);
}
/** ท่าเรือ: พื้นกระดานต่อจากหลังถนนลงน้ำ + เสาเข็มคาดขาว (ศาลาท่าเรือวาดจากภาพจริงในเมือง) */
function pierDeck(c, x) {
  const y0 = ST_F - 5, y1 = N_EDGE + 10, hw = 17;
  c.fillStyle = 'rgba(40,70,130,.2)';
  c.fillRect(x - hw + 4, N_EDGE, hw * 2, y1 - N_EDGE + 6);
  for (const px of [x - hw + 3, x + hw - 3]) {
    rr(c, px - 2, y1 - 6, 4, 12, 1, '#7A4E30');
    c.fillStyle = '#FFFFFF'; c.fillRect(px - 2, y1 + 1, 4, 1.4);
  }
  c.fillStyle = lg(c, 0, y0, 0, y1, [[0, '#E2B488'], [1, '#CF9C6C']]);
  c.fillRect(x - hw, y0, hw * 2, y1 - y0);
  c.strokeStyle = 'rgba(120,70,40,.28)'; c.lineWidth = 0.7;
  for (let y = y0 + 3.5; y < y1; y += 3.5) { c.beginPath(); c.moveTo(x - hw, y); c.lineTo(x + hw, y); c.stroke(); }
  c.fillStyle = '#B07A4A';
  c.fillRect(x - hw, y0, 1.6, y1 - y0); c.fillRect(x + hw - 1.6, y0, 1.6, y1 - y0);
}

// ── หน้าแรก (ฉากหน้าแรกจริง มองจากมุมสูง) ────────────────────────
/** ลานกระเบื้องหลวงลาเวนเดอร์/ขาวมุก เม็ดทองตรงมุม · ขอบหินริมน้ำ */
function homePlaza(c) {
  const { x0, x1, y0, y1 } = PLAZA, R = 40;
  rr(c, x0 - 5, y0, x1 - x0 + 10, y1 - y0 + 5, [0, 0, R + 5, R + 5], '#FFFFFF');
  rr(c, x0 - 2, y0, x1 - x0 + 4, y1 - y0 + 2, [0, 0, R + 2, R + 2], GOLD);
  c.save();
  c.beginPath(); c.roundRect(x0, y0, x1 - x0, y1 - y0, [0, 0, R, R]); c.clip();
  c.fillStyle = lg(c, 0, y0, 0, y1, [[0, '#D6C2EE'], [1, '#C6AEE6']]);
  c.fillRect(x0, y0, x1 - x0, y1 - y0);
  const TW = 19, TH = 13, sx = BRIDGE_X - TW * Math.ceil((BRIDGE_X - x0) / TW);
  for (let y = y0, r = 0; y < y1; y += TH, r++) {
    for (let x = sx, k = 0; x < x1; x += TW, k++) {
      const dark = (k + r) % 2 === 0;
      c.fillStyle = dark ? '#DCC9F2' : '#F5ECFB';
      c.beginPath(); c.roundRect(x + 0.6, y + 0.6, TW - 1.2, TH - 1.2, 1.2); c.fill();
      if (dark) { c.fillStyle = GOLD; c.beginPath(); c.arc(x, y, 0.95, 0, TAU); c.fill(); }
    }
  }
  // แสงอุ่นกลางลาน + เงาใต้ขอบหิน
  const g = c.createRadialGradient(CAT.x, CAT.y, 10, CAT.x, CAT.y, 230);
  g.addColorStop(0, 'rgba(255,246,220,.45)'); g.addColorStop(1, 'rgba(255,246,220,0)');
  c.fillStyle = g; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  c.fillStyle = lg(c, 0, y0, 0, y0 + 14, [[0, 'rgba(110,70,120,.2)'], [1, 'rgba(110,70,120,0)']]);
  c.fillRect(x0, y0, x1 - x0, 14);
  c.restore();
}
/** ขอบหินริมน้ำฝั่งหน้าแรก (หินขาว → ลาเวนเดอร์ ขอบทอง) */
function homeEdge(c) {
  const [a, b] = S_BUILT;
  c.fillStyle = lg(c, 0, S_EDGE - 2, 0, S_EDGE + 8, [[0, '#FFFFFF'], [1, '#E2D2F2']]);
  c.fillRect(a, S_EDGE - 2, b - a, 10);
  c.fillStyle = GOLD;
  c.fillRect(a, S_EDGE + 7, b - a, 1.4);
  c.fillStyle = 'rgba(150,120,200,.25)';
  for (let x = Math.ceil(a / 12) * 12; x < b; x += 12) c.fillRect(x, S_EDGE - 2, 0.8, 9);
}
/** กำแพงเตี้ยริมน้ำ: เสาหัวบัวทอง + พวงมาลัยดอกไม้ห้อยระหว่างเสา (ชุดเดียวกับหน้าแรก riverside.js parapet) */
function parapet(c, x0, x1) {
  const base = S_EDGE + 6;
  const n = Math.max(1, Math.round((x1 - x0) / 46));
  const xs = Array.from({ length: n + 1 }, (_, i) => x0 + ((x1 - x0) * i) / n);
  const cols = ['#FF8FB3', '#FFFFFF', '#FFD45A', '#FF8FB3', '#C8A8F5'];
  for (let i = 0; i < n; i++) {
    const a = xs[i], b = xs[i + 1], y = base - 9, sag = 4;
    c.strokeStyle = '#7FC48C'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(a, y); c.quadraticCurveTo((a + b) / 2, y + sag * 2, b, y); c.stroke();
    for (let k = 1; k < 8; k++) {
      const u = k / 8, x = a + (b - a) * u, yy = y + sag * 4 * u * (1 - u);
      c.fillStyle = cols[(k + i) % cols.length];
      c.beginPath(); c.arc(x, yy, 1.4, 0, TAU); c.fill();
    }
  }
  for (const x of xs) lotusPost(c, x, base, 1.1);
}
/** สะพานหลวง: พื้นหินขาวมุกขอบทอง จากถนนหลวงข้ามแม่น้ำถึงลานหน้าแรก (ราวลูกกรงวาดหลังพรม) */
function royalBridgeDeck(c) {
  const x = BRIDGE_X, y0 = ST_F - 4, y1 = S_EDGE + 8, hw = BR_HW;
  // เงาสะพานบนน้ำ (แดดจากขวาบน → เงาตกซ้าย)
  c.fillStyle = 'rgba(50,80,140,.2)';
  c.beginPath(); c.moveTo(x - hw, N_EDGE); c.lineTo(x - hw - 20, N_EDGE + 14); c.lineTo(x - hw - 20, S_EDGE); c.lineTo(x - hw, S_EDGE); c.closePath(); c.fill();
  // ตอม่อหัวสะพานสองฝั่ง + สันสะพาน (ขอบหินหนาด้านข้าง)
  rr(c, x - hw - 4, y0, hw * 2 + 8, y1 - y0, 3, '#BBA7DA');
  c.fillStyle = lg(c, x - hw, 0, x + hw, 0, [[0, '#E0D0F2'], [0.5, '#F3EBFB'], [1, '#DCCBF0']]);
  c.fillRect(x - hw, y0, hw * 2, y1 - y0);
  c.strokeStyle = 'rgba(150,110,190,.32)'; c.lineWidth = 0.9;
  for (let y = y0 + 9; y < y1; y += 10) { c.beginPath(); c.moveTo(x - hw + 4, y); c.lineTo(x + hw - 4, y); c.stroke(); }
  c.fillStyle = GOLD;
  c.fillRect(x - hw, y0, 2.6, y1 - y0); c.fillRect(x + hw - 2.6, y0, 2.6, y1 - y0);
}
/** พรมชมพูขอบทอง: ประตูปราสาท → ถนนหลวง → ข้ามสะพาน → ลานหน้าแรก · รอยเท้าแมวขาว */
function carpet(c) {
  const x = BRIDGE_X, y0 = ST_B - 1, y1 = PLAZA.y1 - 18;
  const hwAt = (y) => 26 + 6 * smooth((y - S_EDGE) / (y1 - S_EDGE));   // ใกล้ตา (ลานหน้าแรก) กว้างขึ้นนิด
  const shape = (pad) => {
    c.beginPath();
    c.moveTo(x - hwAt(y0) - pad, y0);
    for (let y = y0; y <= y1; y += 8) c.lineTo(x - hwAt(y) - pad, y);
    c.lineTo(x - hwAt(y1) - pad, y1 + pad);
    c.lineTo(x + hwAt(y1) + pad, y1 + pad);
    for (let y = y1; y >= y0; y -= 8) c.lineTo(x + hwAt(y) + pad, y);
    c.closePath();
  };
  shape(2.6); c.fillStyle = GOLD; c.fill();
  shape(0); c.fillStyle = lg(c, 0, y0, 0, y1, [[0, '#FFB3CF'], [0.5, '#FF9CC0'], [1, '#F27FAA']]); c.fill();
  c.strokeStyle = 'rgba(255,229,138,.85)'; c.lineWidth = 0.9;
  for (const d of [-1, 1]) { c.beginPath(); for (let y = y0; y <= y1; y += 8) c.lineTo(x + d * (hwAt(y) - 3.5), y); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.5)';
  for (let y = y0 + 16, i = 0; y < y1 - 6; y += 22, i++) {
    const px = x + (i % 2 ? 6 : -6);
    c.beginPath(); c.ellipse(px, y, 3, 2.1, 0, 0, TAU); c.fill();
    for (const [dx, dy] of [[-3, -2.6], [-1.1, -4], [1.1, -4], [3, -2.6]]) { c.beginPath(); c.arc(px + dx, y + dy, 0.95, 0, TAU); c.fill(); }
  }
}
/** ราวลูกกรงสะพาน (ขาว แถบชมพู) + เสาหัวบัวทอง 5 ต้นต่อข้าง — ชุดเดียวกับหน้าแรก */
function royalBridgeRails(c) {
  const y0 = ST_F + 4, y1 = S_EDGE + 6;
  for (const d of [-1, 1]) {
    const x = BRIDGE_X + d * (BR_HW - 6);
    rr(c, x - 3.5, y0, 7, y1 - y0, 3.5, '#FFFFFF');
    c.fillStyle = 'rgba(160,120,210,.3)';
    c.fillRect(x + d * 2 - 0.6, y0 + 2, 1.2, y1 - y0 - 4);
    c.fillStyle = 'rgba(255,143,179,.9)';
    c.fillRect(x - 0.8, y0, 1.6, y1 - y0);
    c.strokeStyle = 'rgba(150,110,190,.35)'; c.lineWidth = 0.7;
    for (let y = y0 + 3; y < y1; y += 4) { c.beginPath(); c.moveTo(x - 2.6, y); c.lineTo(x + 2.6, y); c.stroke(); }
    for (let i = 0; i <= 4; i++) lotusPost(c, x, y0 + 6 + ((y1 - y0 - 6) * i) / 4, 1.35);
  }
}

// ── สิ่งก่อสร้างจิ๋ว ───────────────────────────────────────────
/** แถวบ้านหลังถนน (ชุดสีเดียวกับในเมือง world.js drawBackRow — จางกว่าร้านหน้า) */
function backHouse(c, x, base, n) {
  const roofs = ['#D9AECB', '#B7A6E0', '#A8C2E2', '#D9BFA2', '#AFCDBC'];
  const walls = ['#EBDDF0', '#E3DCF5', '#DDE3F4', '#EDE0E6', '#DDE9E6'];
  const k = ((n % 5) + 5) % 5, s = SHOP_S;
  const w = (92 + (Math.abs(n * 37) % 4) * 12) * s, h = (104 + (Math.abs(n * 53) % 4) * 16) * s, top = base - h;
  c.fillStyle = walls[k]; c.fillRect(x - w / 2, top, w, h);
  c.fillStyle = 'rgba(120,90,160,.12)'; c.fillRect(x - w / 2, top, w * 0.18, h);
  c.fillStyle = roofs[k];
  c.beginPath();
  if (n % 2) { c.moveTo(x - w / 2 - 2.4, top + 0.6); c.lineTo(x, top - 46 * s); c.lineTo(x + w / 2 + 2.4, top + 0.6); }
  else { c.moveTo(x - w / 2 - 1.8, top + 0.6); c.quadraticCurveTo(x, top - 52 * s, x + w / 2 + 1.8, top + 0.6); }
  c.closePath(); c.fill();
  if (n % 3 === 1) { c.fillStyle = '#C8B6DE'; c.fillRect(x + w * 0.2, top - 34 * s, 12 * s, 26 * s); }
  for (let r = 0; r < 2; r++) for (let q = 0; q < 2; q++) {
    const wx = x - w / 2 + w * (0.25 + q * 0.38), wy = top + (26 + r * 40) * s;
    if (wy > base - 9) continue;
    rr(c, wx - 2.7, wy, 5.4, 6.6, [2.7, 2.7, 0.6, 0.6], '#C9B8E6');
    rr(c, wx - 1.8, wy + 0.9, 3.6, 5.1, [1.8, 1.8, 0.3, 0.3], (n + r + q) % 3 ? '#FFF1C9' : '#E9F3FF');
  }
}
/** กังหันลมบนเนิน (ชุดเดียวกับเนินหลังเมือง) */
function windmill(c, x, y) {
  c.fillStyle = '#C4E8C4';
  c.beginPath(); c.ellipse(x, y + 4, 60, 16, 0, Math.PI, TAU); c.fill();
  c.fillStyle = '#F4E6D6';
  c.beginPath(); c.moveTo(x - 9, y); c.lineTo(x - 5, y - 34); c.lineTo(x + 5, y - 34); c.lineTo(x + 9, y); c.closePath(); c.fill();
  c.fillStyle = '#C08A68';
  c.beginPath(); c.moveTo(x - 8, y - 33); c.lineTo(x, y - 43); c.lineTo(x + 8, y - 33); c.closePath(); c.fill();
  rr(c, x - 2.5, y - 12, 5, 12, [2.5, 2.5, 0, 0], '#C08A68');
}
function signPost(c, x, y) {
  rr(c, x - 2, y - 30, 4, 30, 1.5, '#B98A68');
  rr(c, x - 18, y - 36, 36, 14, 4, '#F3D8B6');
  c.fillStyle = '#C79566'; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('?', x, y - 29);
}
function cone(c, x, y) {
  c.fillStyle = '#FF9FB0'; c.beginPath(); c.moveTo(x, y - 18); c.lineTo(x + 7, y); c.lineTo(x - 7, y); c.closePath(); c.fill();
  c.fillStyle = '#FFFFFF'; c.fillRect(x - 4.2, y - 9, 8.4, 3);
  rr(c, x - 9, y - 2, 18, 4, 1.5, '#F07C98');
}
function barrier(c, x, y, w) {
  for (const d of [0, w]) rr(c, x + d - 2, y - 16, 4, 16, 1, '#B98A68');
  rr(c, x - 3, y - 15, w + 6, 7, 2, '#FFFFFF');
  c.save(); c.beginPath(); c.roundRect(x - 3, y - 15, w + 6, 7, 2); c.clip();
  c.fillStyle = '#FF9FB0';
  for (let k = -10; k < w + 10; k += 10) { c.beginPath(); c.moveTo(x + k, y - 8); c.lineTo(x + k + 5, y - 15); c.lineTo(x + k + 10, y - 15); c.lineTo(x + k + 5, y - 8); c.fill(); }
  c.restore();
}
/** กอไม้ดอกริมลาน (หน้าแรก) */
function flowerBush(c, x, y, s) {
  c.fillStyle = 'rgba(80,40,110,.14)';
  c.beginPath(); c.ellipse(x, y + 1, s * 1.3, s * 0.3, 0, 0, TAU); c.fill();
  bush(c, x, y, s, '#9ED79A');
  flowers(c, x - s * 0.7, y - s * 1.15, 3, ['#FF8FB3', '#FFFFFF', '#FFD45A']);
}

// ── ภาพนิ่งทั้งแผนที่ ──────────────────────────────────────────
/** บ้านจิ๋วบนเนินไกลหลังเมือง (แบบบ้านบนเนินในเมือง world.js drawHills) */
function hillHouse(c, x, y, i) {
  c.fillStyle = 'rgba(80,50,110,.12)';
  c.beginPath(); c.ellipse(x, y + 1, 13, 3, 0, 0, TAU); c.fill();
  rr(c, x - 8, y - 14, 16, 14, 1.5, '#E9DCFF');
  c.fillStyle = i % 2 ? '#C5ADF0' : '#F4B8D2';
  c.beginPath(); c.moveTo(x - 11, y - 13); c.lineTo(x, y - 24); c.lineTo(x + 11, y - 13); c.closePath(); c.fill();
  rr(c, x - 2.5, y - 7, 5, 7, [2.5, 2.5, 0, 0], '#C9B8E6');
}
/** ลานวาปของดินแดนใหม่ (ประกายวาดในชั้นสด) */
const WARP = { x: 890, y: 752 };

/** e = ช่วงที่วาด (WORLD_EXT) — ต่อพื้น แม่น้ำ ต้นไม้ ออกไปถึงขอบ · main.js วาดเป็นแผ่น ๆ ด้วย e ชุดเดียวกันทุกแผ่น ลายจึงต่อกันสนิท */
export function drawWorldStatic(c, e) {
  ground(c, e);

  // ── หลังเมือง: เนิน กังหันลม บ้านบนเนิน ต้นไม้ (ไกลสุด — วาดก่อนลำธาร/บ้าน) ──
  windmill(c, 300, 196);
  windmill(c, 1420, 186);
  for (const [i, [x, y]] of [[150, 246], [560, 236], [700, 252], [1250, 240], [1530, 250]].entries()) hillHouse(c, x, y, i);
  const farTrees = [];
  for (let x = e.x0 + 14; x < e.x1; x += 40) {
    const h = hash(x * 0.37);
    if (Math.abs(x - STREAM_X) < 80 || (x > 1680 && x < 2520)) continue;
    farTrees.push([x + h * 16, 150 + h * 70, 13 + h * 6, h > 0.66 ? 1 : h > 0.3 ? 0 : 2]);
  }
  farTrees.sort((a, b) => a[1] - b[1]);
  for (const [x, y, r, k] of farTrees) tree(c, x, y, r, k);
  stream(c);
  river(c, e);

  // ── แถวบ้าน + ต้นไม้หลังถนน (โผล่ตามช่องระหว่างร้าน) ──
  for (let i = 0, x = 20; x < 1580; i++, x += 44) {
    if (Math.abs(x + 22 - STREAM_X) < 64) continue;
    tree(c, x + 22, ST_B - 76, 13 + hash(i) * 4, i % 3 === 1 ? 1 : 0);
  }
  for (let n = 0, x = 34; x < 1580; n++, x += 50) {
    if (Math.abs(x - STREAM_X) < 70) continue;
    backHouse(c, x + (Math.abs(n * 29) % 9), ST_B - 10, n);
  }
  c.fillStyle = lg(c, 0, ST_B - 120, 0, ST_B, [[0, 'rgba(236,228,255,0)'], [1, 'rgba(236,228,255,.3)']]);
  c.fillRect(e.x0, ST_B - 120, 1600 - e.x0, 120);

  // ── ริมน้ำฝั่งเหนือ: ถนนเมือง → ถนนหลวง → ทางดินเข้าดินแดนปริศนา ──
  townStreet(c, N_BUILT[0], ROYAL_X);
  royalRoad(c, ROYAL_X, N_BUILT[1]);
  bankWall(c, N_BUILT[0], N_BUILT[1]);
  // ปลายถนนสองข้างมนเข้าหาตลิ่งธรรมชาติ
  for (const [x, d] of [[N_BUILT[0], -1], [N_BUILT[1], 1]]) {
    c.fillStyle = d < 0 ? '#ECCBAE' : '#E8D6F5';
    c.beginPath(); c.ellipse(x, (ST_B + N_EDGE) / 2, 10, (N_EDGE - ST_B) / 2, 0, d < 0 ? Math.PI / 2 : -Math.PI / 2, d < 0 ? Math.PI * 1.5 : Math.PI / 2); c.fill();
  }
  cobble(c, along(N_BUILT[1] + 6, e.x1, (x) => riverTop(x) - 30, 20), 16);
  cobble(c, along(e.x0, N_BUILT[0] - 6, (x) => riverTop(x) - 30, 20), 16);
  streamCrossing(c);

  // ── ปราสาทแมวเหมียว: สวนหลวง → รั้วหลวง → ปราสาท → โคมหลวง · ซุ้มประตูเขตคั่นจากเมือง ──
  for (const [x, y, r, k] of [[1730, 250, 18, 1], [1792, 212, 16, 2], [1872, 160, 14, 1], [2080, 118, 13, 2], [2288, 160, 14, 1], [2368, 212, 16, 2], [2430, 250, 18, 1],
    [1712, 334, 15, 2], [2470, 334, 15, 2]]) tree(c, x, y, r, k);
  drawFenceAt(c, 'wmL', 1700, ST_B, CASTLE_S, 290, [['sakura', 50], ['cone', 150], ['topcat', 235]]);
  drawFenceAt(c, 'wmR', 2290, ST_B, CASTLE_S, 340, [['topcat', 70], ['cone', 160], ['sakura', 255]]);
  drawCastleAt(c, BRIDGE_X, ST_B, CASTLE_S, 0, 'aura');   // ตัวปราสาท + โคมหลวง = ของเด้ง (ชั้นสด)
  drawRealmGateAt(c, GATE_X, ST_B, GATE_S);

  // ── เมืองแมวเหมียว: ของบนถนน (ภาพจริงจากเมือง) ──
  // (ร้าน ลาน ของเล่น ตะเกียง = ของเด้ง วาดในชั้นสด · ท่าเรืออยู่กับที่)
  for (const [k, x] of TOWN) if (k === 'pierA' || k === 'pierB') drawPlayPieceAt(c, k, x, ST_B, SHOP_S);
  for (const [, x] of TOWN.filter(([k]) => k === 'pierA' || k === 'pierB')) pierDeck(c, x);
  drawSalaBridgeAt(c, STREAM_X, ST_F, SALA_S);

  // ── ดินแดนปริศนา (ยังไม่มีอะไร — หมอกคลุม) ──
  // (ต้นไม้ + ป้าย ? = ของเด้ง วาดในชั้นสด)

  // ── หน้าแรก: ลานริมน้ำ → สะพานหลวง → พรม → ราว/เสา → โคม รูปปั้น ไม้ดอก ──
  homePlaza(c);
  homeEdge(c);
  royalBridgeDeck(c);
  carpet(c);
  parapet(c, S_BUILT[0] + 4, BRIDGE_X - BR_HW - 6);
  parapet(c, BRIDGE_X + BR_HW + 6, S_BUILT[1] - 4);
  royalBridgeRails(c);
  // (รูปปั้นองครักษ์ + โคมหลวง = ของเด้ง วาดในชั้นสด)
  for (const [x, y, s] of [[PLAZA.x0 + 20, S_EDGE + 32, 13], [PLAZA.x1 - 20, S_EDGE + 32, 13], [PLAZA.x0 - 12, PLAZA.y1 - 36, 13], [PLAZA.x1 + 12, PLAZA.y1 - 36, 13],
    [PLAZA.x0 + 44, PLAZA.y1 + 28, 12], [PLAZA.x1 - 44, PLAZA.y1 + 28, 12], [BRIDGE_X + 140, PLAZA.y1 + 36, 9], [BRIDGE_X - 120, PLAZA.y1 + 38, 9]]) flowerBush(c, x, y, s);
  for (const [x, y, r, k] of [[PLAZA.x0 - 44, 700, 17, 1], [PLAZA.x1 + 44, 700, 17, 1], [PLAZA.x0 - 34, 848, 15, 0], [PLAZA.x1 + 34, 852, 14, 2]]) tree(c, x, y, r, k);

  // ── ดินแดนใหม่ (กำลังสร้าง) ──
  cobble(c, [[PLAZA.x0 - 4, 700], [1560, 706], [1300, 722], [1080, 744], [WARP.x + 46, WARP.y]], 18);
  cobble(c, along(e.x0, PLAZA.x0 - 30, (x) => riverBot(x) + 30, 24), 14);
  for (const [x, y, r, k] of [[300, 720, 16, 0], [360, 830, 14, 1], [1390, 690, 16, 2], [1450, 814, 15, 0], [1250, 852, 13, 1], [560, 852, 13, 2], [200, 800, 14, 1]]) tree(c, x, y, r, k);
  // (ลานวาป รั้วกั้น กรวย = ของเด้ง วาดในชั้นสด)

  // ── ต้นไม้ประดับนอกเขต (ช่องว่าง + ส่วนที่ต่อออกไปถึงขอบ) ──
  const inZone = (x, y) => ZONES.some((z) => x > z.rect[0] - 14 && x < z.rect[0] + z.rect[2] + 14 && y > z.rect[1] - 30 && y < z.rect[1] + z.rect[3] + 20);
  for (let i = 0; i < 300; i++) {
    const x = e.x0 + hash(i * 2.7 + 1) * (e.x1 - e.x0), y = e.y0 + hash(i * 6.1 + 2) * (e.y1 - e.y0);
    if (inZone(x, y) || (y > riverTop(x) - 46 && y < riverBot(x) + 50) || y < 130) continue;
    tree(c, x, y, 11 + hash(i) * 6, i % 3);
  }
}

// ── ของเด่นแต่ละโซน: เอาเมาส์ชี้โซนบนคอม → เด้งขึ้นทีละชิ้นเป็นคลื่น (ผู้ใช้ 7 พ.ย.) ──
// ไม่อยู่ในภาพนิ่ง — ชั้นสดวาดจากภาพแคชของตัวเองทุกเฟรม: ตอนนิ่งวางลงพิกเซลเดียวกับภาพนิ่งเป๊ะ (ภาพเท่าเดิม)
// ตอนเด้งใช้ภาพแคชอีกชุดที่ละเอียดกว่า 10% ขยายแล้วไม่เบลอ · เด้งรอบจุดกลางฐาน (ax, ay)
// box = [x0, y0, x1, y1] ขอบเขตภาพ (เผื่อไว้) · art = ภาพนิ่ง · live = ของขยับ (ธง ควัน ลูกโป่ง) วาดสดทับ
function warpRing(c) {
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(WARP.x, WARP.y, 50, 16, 0, 0, TAU); c.fill();
  c.strokeStyle = '#C9B5FF'; c.lineWidth = 3; c.beginPath(); c.ellipse(WARP.x, WARP.y, 50, 16, 0, 0, TAU); c.stroke();
  c.strokeStyle = '#FFB6D5'; c.lineWidth = 2; c.beginPath(); c.ellipse(WARP.x, WARP.y, 37, 11, 0, 0, TAU); c.stroke();
}
const MIST_TREES = [[2610, 236, 16, 2], [2670, 300, 14, 0], [2780, 230, 17, 2], [2840, 352, 14, 1], [2630, 372, 13, 0], [2880, 300, 13, 0], [2730, 180, 14, 2]];
let POP = null;
function popItems() {
  if (POP) return POP;
  POP = [];
  const add = (zone, ax, ay, box, art, live = null) => POP.push({ zone, ax, ay, box, art, live, i: 0 });
  // ปราสาท (ตัวปราสาท + ธงโบก/แสงหน้าต่าง) · โคมหลวงสองข้าง
  add('castle', BRIDGE_X, ST_B, [BRIDGE_X - 250, 0, BRIDGE_X + 250, ST_B + 10],
    (c) => drawCastleAt(c, BRIDGE_X, ST_B, CASTLE_S, 0, 'body'), (c, t) => drawCastleAt(c, BRIDGE_X, ST_B, CASTLE_S, t, 'live'));
  for (const [x, i] of [[1748, 0], [2414, 1]]) add('castle', x, ST_B + 1, [x - 26, ST_B - 84, x + 26, ST_B + 8], (c) => drawRoyalLampAt(c, x, ST_B + 1, 0.5, i));
  // เมือง: ร้าน ลานน้ำพุ ของเล่น ซุ้ม + ตะเกียงริมถนน
  for (const [k, x] of TOWN) {
    if (k === 'pierA' || k === 'pierB') continue;
    const hw = k === 'plaza' ? 132 : 84;
    if (SHOP_IDS.has(k)) add('town', x, ST_B, [x - hw, ST_B - 180, x + hw, ST_B + 14], (c) => drawShopAt(c, k, x, ST_B, SHOP_S), (c, t) => drawShopAt(c, k, x, ST_B, SHOP_S, t, true));
    else if (k === 'welcome' || k === 'plaza') add('town', x, ST_B, [x - hw, ST_B - 180, x + hw, ST_B + 14], (c) => drawTownPieceAt(c, k, x, ST_B, SHOP_S));
    else add('town', x, ST_B, [x - hw, ST_B - 180, x + hw, ST_B + 14], (c) => drawPlayPieceAt(c, k, x, ST_B, SHOP_S));
  }
  for (const [i, x] of LAMPS.entries()) add('town', x, ST_B + 2, [x - 22, ST_B - 62, x + 22, ST_B + 8], (c) => drawTownPieceAt(c, i % 2 ? 'lamp' : 'lampFlag', x, ST_B + 2, SHOP_S));
  // ดินแดนปริศนา: ต้นไม้ + ป้าย ?
  for (const [x, y, r, k] of MIST_TREES) add('mist', x, y, [x - r * 1.3, y - r * 2.6, x + r * 1.4, y + r * 0.5], (c) => tree(c, x, y, r, k));
  add('mist', 2750, 340, [2728, 302, 2772, 344], (c) => signPost(c, 2750, 340));
  // หน้าแรก: องครักษ์ โคมหลวง บ้านลูกเหมียว (ขยับสด)
  for (const d of [-1, 1]) {
    const gx = BRIDGE_X + d * 172, lx = BRIDGE_X + d * 94;
    add('home', gx, S_EDGE + 42, [gx - 32, S_EDGE - 60, gx + 32, S_EDGE + 50], (c) => drawGuardAt(c, gx, S_EDGE + 42, 0.4, d));
    add('home', lx, S_EDGE + 30, [lx - 22, S_EDGE - 40, lx + 22, S_EDGE + 36], (c) => drawRoyalLampAt(c, lx, S_EDGE + 30, 0.38, d < 0 ? 1 : 0));
  }
  add('home', PLAZA.x0 + 92, 772, null, null, (c, t) => { c.save(); c.translate(PLAZA.x0 + 92, 772); c.scale(0.44, 0.44); drawHomeBox(c, 0, 0, t); c.restore(); });
  // ดินแดนใหม่: ลานวาป รั้วกั้น กรวย
  add('wild', WARP.x, WARP.y + 16, [WARP.x - 54, WARP.y - 20, WARP.x + 54, WARP.y + 20], warpRing);
  for (const [x, y] of [[700, 764], [1010, 794]]) add('wild', x + 40, y, [x - 6, y - 20, x + 86, y + 4], (c) => barrier(c, x, y, 80));
  for (const [x, y] of [[664, 774], [810, 772], [992, 804], [1124, 800]]) add('wild', x, y + 2, [x - 11, y - 20, x + 11, y + 4], (c) => cone(c, x, y));
  // ลำดับเด้งในโซน = ซ้ายไปขวา (เป็นคลื่น)
  for (const z of ZONES) POP.filter((p) => p.zone === z.id).sort((a, b) => a.ax - b.ax).forEach((p, i) => { p.i = i; });
  return POP;
}
/** ภาพแคชของชิ้น ที่สเกลจอ k (ตอนนิ่ง — ลงพิกเซลเดียวกับภาพนิ่ง) หรือ k × 1.1 (ตอนเด้ง) */
const SPR = new Map();
function sprite(it, k, hi) {
  const key = hi ? 'h' : 'r';
  let m = SPR.get(it);
  if (!m || m.k !== k) { m = { k }; SPR.set(it, m); }
  if (!m[key]) {
    const q = hi ? k * 1.1 : k, [x0, y0, x1, y1] = it.box;
    const ox = Math.floor(x0 * q), oy = Math.floor(y0 * q);
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(x1 * q) - ox); cv.height = Math.max(1, Math.ceil(y1 * q) - oy);
    const g = cv.getContext('2d');
    g.setTransform(q, 0, 0, q, -ox, -oy);
    it.art(g);
    m[key] = { cv, x: ox / q, y: oy / q, w: cv.width / q, h: cv.height / q };
  }
  return m[key];
}
/**
 * แสงออร่าล้อมรอบชิ้น (ตอนเด้ง/ถูกเลือก): เงาฟุ้งตามรูปทรงของชิ้นเอง สองชั้น — ชั้นในทองครีมเข้ม ชั้นนอกชมพูฟุ้งกว้าง
 * ใช้ shadowBlur (ใช้ได้ทุกเบราว์เซอร์ รวม Safari เก่า) วาดตัวชิ้นไว้นอกผ้าใบ ให้เหลือแต่เงา · แคชคู่กับภาพละเอียด
 */
function glowSprite(it, k) {
  const m = SPR.get(it), s = sprite(it, k, true);
  if (!m.g) {
    const q = k * 1.1, pad = Math.ceil(28 * q), far = 1e4;
    const cv = document.createElement('canvas');
    cv.width = s.cv.width + pad * 2; cv.height = s.cv.height + pad * 2;
    const g = cv.getContext('2d');
    g.shadowOffsetX = far;
    for (const [col, blur, n] of [['rgba(255,160,210,1)', 22 * q, 2], ['rgba(255,226,120,1)', 9 * q, 2], ['rgba(255,252,225,1)', 3 * q, 2]]) {
      g.shadowColor = col; g.shadowBlur = blur;
      for (let i = 0; i < n; i++) g.drawImage(s.cv, pad - far, pad);
    }
    m.g = { cv, x: s.x - pad / q, y: s.y - pad / q, w: cv.width / q, h: cv.height / q };
  }
  return m.g;
}
/** ออร่ากลม (ชิ้นที่วาดสด ไม่มีภาพแคช — บ้านลูกเหมียว น้องแมว) */
function glowRound(c, x, y, r, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,240,170,${0.75 * a})`);
  g.addColorStop(0.55, `rgba(255,190,225,${0.4 * a})`);
  g.addColorStop(1, 'rgba(255,190,225,0)');
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.9, 0, 0, TAU); c.fill();
}
/** ประกายดาววิบวับรอบชิ้นที่มีออร่า */
function glowStars(c, it, a, t) {
  const [x0, y0, x1, y1] = it.box || [it.ax - 30, it.ay - 60, it.ax + 30, it.ay];
  const n = Math.max(2, Math.min(6, Math.round((x1 - x0) / 40)));
  for (let i = 0; i < n; i++) {
    const p = (t * 0.018 + i / n + it.ax * 0.013) % 1, tw = Math.sin(p * Math.PI);
    const x = x0 + (x1 - x0) * hash(it.ax + i * 7.3), y = y1 - (y1 - y0) * (0.25 + 0.7 * hash(it.ax * 1.7 + i)) - p * 14;
    c.globalAlpha = a * tw; c.fillStyle = i % 2 ? '#FFFFFF' : '#FFE48A';
    star(c, x, y, 2.4 + 1.6 * tw, t * 0.02 + i); c.fill();
  }
  c.globalAlpha = 1;
}
/** ความแรงของออร่าจากท่าเด้ง (เข้า 0 → 1 เร็ว ๆ ตามตัวที่ขยาย · ยุบกลับก็จางตาม) */
const glowA = (p) => Math.min(1, Math.max(0, (p.k - 1) / 0.04 + p.hp * 0.5));
/** ท่าเด้ง: p = { k ขยาย, hp ช่วงลอย 0..1, sq ช่วงยุบตอนลง 0..1 } → ยืด/ยุบ + ลอยขึ้นตามความสูงชิ้น */
function popTransform(c, it, p) {
  const tall = it.box ? it.ay - it.box[1] : 60;
  const hop = p.hp * Math.min(14, tall * 0.12);
  const sx = p.k * (1 - 0.035 * p.hp + 0.05 * p.sq), sy = p.k * (1 + 0.05 * p.hp - 0.05 * p.sq);
  c.translate(it.ax, it.ay - hop); c.scale(sx, sy); c.translate(-it.ax, -it.ay);
}
/** วาดของเด่นทั้งหมด · pop(zone, i) = ท่าเด้งของชิ้นที่ i ในโซน (null = นิ่ง) · ชิ้นที่กำลังเด้งวาดทีหลังสุด (ลอยทับเพื่อนบ้าน) */
function drawPopItems(c, t, pop) {
  const k = c.getTransform().a, later = [];
  for (const it of popItems()) {
    const p = pop?.(it.zone, it.i);
    if (p) { later.push([it, p]); continue; }
    if (it.art) { const s = sprite(it, k, false); c.drawImage(s.cv, s.x, s.y, s.w, s.h); }
    it.live?.(c, t);
  }
  for (const [it, p] of later) {
    const a = glowA(p) * (0.85 + 0.15 * Math.sin(t * 0.09 + it.ax));
    c.save();
    popTransform(c, it, p);
    if (it.art) {
      const g = glowSprite(it, k);
      c.globalAlpha = a; c.drawImage(g.cv, g.x, g.y, g.w, g.h); c.globalAlpha = 1;
      const s = sprite(it, k, true); c.drawImage(s.cv, s.x, s.y, s.w, s.h);
    } else glowRound(c, it.ax, it.ay - 20, 46, a);
    it.live?.(c, t);
    c.restore();
    glowStars(c, it, a, t);
  }
}

// ── ชั้นสด ─────────────────────────────────────────────────────
/**
 * t = เฟรม (60 ต่อวินาที) · e = ช่วงที่วาด · o.drawCat(c, x, feetY, scale, t) = วาดน้องตัวที่เล่นอยู่
 * o.pop(zone, i) = ท่าเด้งของชิ้นที่ i ในโซนที่เมาส์ชี้ (main.js) · ไม่ส่ง/คืน null = นิ่ง
 * (ไฮไลต์โซนที่ชี้ทำที่ป้ายชื่อด้วย — main.js · ไม่มีกรอบเขตแล้ว)
 */
export function drawWorldLive(c, t, e, o = {}) {
  // น้ำวิบวับ
  c.fillStyle = '#FFFFFF';
  for (let i = 0; i < (e.x1 - e.x0) / 40; i++) {
    const x = e.x0 + hash(i * 4.3) * (e.x1 - e.x0), y = N_EDGE + 18 + hash(i * 2.2) * (S_EDGE - N_EDGE - 34);
    if (Math.abs(x - BRIDGE_X) < BR_HW + 8) continue;
    const a = Math.max(0, Math.sin(t * 0.05 + i * 1.7));
    if (a < 0.2) continue;
    c.globalAlpha = a * 0.85; star(c, x, y, 2.6 * a, t * 0.01); c.fill();
  }
  c.globalAlpha = 1;
  // เป็ด
  for (const [bx, by, sp] of [[1250, 506, 0.4], [2700, 540, -0.3], [420, 548, 0.3]]) {
    const x = bx + Math.sin(t * 0.006 * Math.abs(sp) + bx) * 40, y = by + Math.sin(t * 0.08 + bx) * 1.2;
    const d = Math.cos(t * 0.006 * Math.abs(sp) + bx) * Math.sign(sp) >= 0 ? 1 : -1;
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(x, y + 4, 11, 2.5, 0, 0, TAU); c.fill();
    c.fillStyle = '#FFF4C2'; c.beginPath(); c.ellipse(x, y, 8, 5, 0, 0, TAU); c.fill();
    c.beginPath(); c.arc(x + d * 6, y - 5, 4, 0, TAU); c.fill();
    c.fillStyle = '#FFB061'; c.beginPath(); c.moveTo(x + d * 9.5, y - 5.5); c.lineTo(x + d * 13, y - 4.5); c.lineTo(x + d * 9.5, y - 3.5); c.fill();
    c.fillStyle = '#5A3420'; c.beginPath(); c.arc(x + d * 7, y - 6, 0.8, 0, TAU); c.fill();
  }
  // เรือพายแล่นไปมาฝั่งตะวันตกของสะพาน (ไม่ลอดสะพาน — ภาพมุมสูงจะทับกัน)
  const x0 = 160, span = BRIDGE_X - 230 - x0, ph = (t * 0.4) % (span * 2);
  const bx = x0 + (ph < span ? ph : span * 2 - ph), dir = ph < span ? 1 : -1;
  c.save(); c.translate(bx, 532); c.scale(0.36, 0.36); c.translate(0, -BOAT_Y);
  drawBoat(c, 0, dir, t, null, true);
  c.restore();
  // ของเด่นทุกโซน (ปราสาท+ธงโบก ร้าน+ควัน/ลูกโป่ง บ้านลูกเหมียว ฯลฯ) — เด้งตามเมาส์
  drawPopItems(c, t, o.pop);
  // ประกายลานวาป (ดินแดนใหม่)
  for (let i = 0; i < 6; i++) {
    const p = (t * 0.012 + i / 6) % 1;
    c.globalAlpha = Math.sin(p * Math.PI) * 0.9;
    c.fillStyle = ['#FFFFFF', '#FFE48A', '#C9B5FF'][i % 3];
    star(c, WARP.x + Math.cos(i * 2.1) * 32, WARP.y - p * 50, 3.4, t * 0.02 + i); c.fill();
  }
  c.globalAlpha = 1;
  // หมอกลอยในดินแดนปริศนา
  for (let i = 0; i < 8; i++) {
    const x = 2600 + ((i * 53 + t * (0.08 + i * 0.01)) % 300), y = 110 + i * 40;
    c.fillStyle = 'rgba(255,255,255,.62)';
    c.beginPath(); c.arc(x, y, 26, 0, TAU); c.arc(x + 24, y + 6, 20, 0, TAU); c.arc(x - 22, y + 8, 18, 0, TAU); c.fill();
  }
  // น้องแมวที่หน้าแรก (ยืนบนพรมหัวสะพาน) + หมุด "อยู่ที่นี่"
  const cx = CAT.x, fy = CAT.y, ck = 1;
  const cp = o.pop?.('home', 2);   // น้องเด้งพร้อมของบนหน้าแรก (จังหวะกลางคลื่น)
  c.save();
  if (cp) { popTransform(c, { ax: cx, ay: fy, box: null }, cp); glowRound(c, cx, fy - 30, 52, glowA(cp)); }
  o.drawCat?.(c, cx, fy, ck, t);
  const hy = fy - 62 * ck - 26 + Math.sin(t * 0.08) * 4;
  c.fillStyle = '#FF6FA8'; c.strokeStyle = '#FFFFFF'; c.lineWidth = 2.6;
  c.beginPath(); c.moveTo(cx, hy + 16); c.bezierCurveTo(cx - 14, hy + 2, cx - 14, hy - 12, cx, hy - 12); c.bezierCurveTo(cx + 14, hy - 12, cx + 14, hy + 2, cx, hy + 16); c.fill(); c.stroke();
  c.fillStyle = '#FFFFFF'; heart(c, cx, hy - 2, 5.5); c.fill();
  c.restore();
}

// ── หน้ารอของดินแดนใหม่ (วาปมาแล้วเจอป้ายกำลังสร้าง) ──
/** ฉากหลังเต็มจอ w × h · t = เฟรม */
export function drawWildScene(c, w, h, t) {
  c.fillStyle = lg(c, 0, 0, 0, h, [[0, '#CFE6FF'], [0.45, '#F2E2FF'], [0.62, '#FFEAF4'], [0.63, '#BDE6B1'], [1, '#A6D99F']]);
  c.fillRect(0, 0, w, h);
  const g = h * 0.62;
  // ดวงอาทิตย์ + เมฆ
  c.fillStyle = 'rgba(255,240,180,.85)'; c.beginPath(); c.arc(w * 0.82, h * 0.18, h * 0.08, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.9)';
  for (let i = 0; i < 5; i++) {
    const x = ((i * w) / 4 + t * 0.15 * (1 + i * 0.2)) % (w + 200) - 100, y = h * (0.1 + (i % 3) * 0.08);
    c.beginPath(); c.arc(x, y, h * 0.04, 0, TAU); c.arc(x + h * 0.045, y + h * 0.01, h * 0.032, 0, TAU); c.arc(x - h * 0.04, y + h * 0.012, h * 0.028, 0, TAU); c.fill();
  }
  // เนินไกล
  c.fillStyle = '#CDEBC4';
  c.beginPath(); c.moveTo(0, g); for (let x = 0; x <= w; x += 20) c.lineTo(x, g - h * 0.06 - Math.sin(x / (w * 0.18)) * h * 0.04); c.lineTo(w, g); c.fill();
  // ของบนทุ่ง (สเกลตามความสูงจอ)
  const k = h / 420;
  c.save(); c.scale(k, k);
  const W2 = w / k, G2 = g / k;
  for (let i = 0; i < 9; i++) tree(c, (i + 0.5) * (W2 / 9) + (hash(i) - 0.5) * 30, G2 + 6 + hash(i + 3) * 8, 13 + hash(i) * 6, i % 3);
  barrier(c, W2 * 0.2, G2 + 70, 80);
  barrier(c, W2 * 0.68, G2 + 76, 80);
  for (const f of [0.14, 0.34, 0.62, 0.86]) cone(c, W2 * f, G2 + 84 + hash(f) * 10);
  c.restore();
  c.fillStyle = '#FFFFFF';
  for (let i = 0; i < 14; i++) {
    const a = Math.max(0, Math.sin(t * 0.04 + i * 2.3));
    c.globalAlpha = a * 0.8; star(c, hash(i * 3) * w, hash(i * 5) * h * 0.55, 3 + a * 2, 0); c.fill();
  }
  c.globalAlpha = 1;
}
