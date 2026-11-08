// src/town/castle-hall.js
// ─────────────────────────────────────────────────────────────
// ปราสาทแมวเหมียว ชั้น 1 · GRAND LOBBY (ผู้ใช้ 7 พ.ย. — สเปกเต็มใน CASTLE_DESIGN.md)
//   โถงยาวเดินซ้าย–ขวา มุมหน้าตรง ไม่มี perspective · ระบบเดิน/กระโดด/นั่ง/ท่าทาง/ถ่ายรูปชุดเดียวกับเมือง
//   (main.js สลับ "โลก" เป็น HALL — ไฟล์นี้มีแค่ผัง + ภาพ ไม่แตะระบบเดิน/ตัวละคร)
//
// เรียงซ้าย → ขวา: ประตูทางเข้า · เคาน์เตอร์ต้อนรับ (วาปไปที่ต่าง ๆ) · กระดานประกาศ · ม้านั่ง · น้ำพุแมวสวมมงกุฎ (กลางโถง · จุดถ่ายรูป)
//   · ม้านั่ง · ตู้จดหมายแมว · กระดานสมาชิก · บันไดขึ้นชั้น 2 · กระถางต้นไม้คั่นตามจุด · โคมระย้า
// ของทุกชิ้นชิดผนังหลัง (อยู่หลังเส้นเท้าน้อง) — พื้นเดิน GY..H ว่างตลอดแนว ให้หลายคนเดินสวน/ยืนรวมกลุ่มได้ · ไม่มีของหน้าสุดบังตัวละคร
// ขนาดอ้างอิง: น้องสูง ~90 หน่วย (C) · จอสูง H = 420 · เส้นเท้า GY = 330
//
// ประสิทธิภาพ: ผนังแคชเป็นช่วงเสา (5 แบบ) · ของนิ่งแคชเป็นภาพ (cached) · ของขยับมีแค่น้ำพุ เทียน แสงจากหน้าต่างใหญ่
//   ของนอกจอไม่วาด · ไม่มีฟิสิกส์เพิ่ม (ผิวที่ยืนได้ = ม้านั่ง + ขอบอ่างน้ำพุ ระบบผิวเดิมของเมือง)
// ─────────────────────────────────────────────────────────────
import { H, GY, flat, FNT } from './layout.js';
import { cached, lg, heart, star, drawFountainBody, fountainWaterAt } from './world.js';
import { drawGuardAt } from './castle.js';
import { sky, windowSky, windowTwinkles, doorView } from './castle-sky.js';

export const TAU = Math.PI * 2;
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// โทนสีหลักตามสเปก (Global Art Direction)
export const LAV = '#C5A4E8', SPUR = '#A77BD8', PINK = '#F5A9D0', LPINK = '#F9D5E8', CREAM = '#FFF4F0', GOLD = '#EBC66F', SGOLD = '#F7DE9C';
export const GOLD_D = '#C99B3E';

// ── ผัง ───────────────────────────────────────────────────────
export const BAY = 400;                   // ระยะเสาถึงเสา
const NB = 9;                      // จำนวนช่วงเสา — คี่ ให้กลางโถงตรงกลางช่วง (น้ำพุ)
export const HW = BAY * NB;        // 3600 = ชั้นที่ยาวที่สุดของปราสาท (~4 จอมือถือ)
export const CEIL = 34;                   // ขอบล่างคิ้วเพดาน
export const WALL_B = GY - 16;            // ฐานผนังหลัง (พื้นเริ่มตรงนี้)
export const WAIN = WALL_B - 60;          // ขอบบนบัวผนัง
export const WIN = { w: 124, top: 98, bot: WALL_B - 78 };        // หน้าต่างโค้งสูง
export const GRAND = { w: 210, top: 66, bot: WALL_B - 66 };      // หน้าต่างใหญ่หลังน้ำพุ
const bayC = (i) => i * BAY + BAY / 2;
// แบบผนังแต่ละช่วง (ซ้าย → ขวา)
const BAYS = ['door', 'welcome', 'bare', 'win', 'grand', 'win', 'banner', 'bare', 'bare'];
const X = {
  door: bayC(0), counter: bayC(1), notice: bayC(2), benchL: bayC(3), fount: bayC(4),
  benchR: bayC(5), mail: bayC(6), members: bayC(7), stairs: bayC(8),
};
const PLANTS = [[X.notice + 185, 0], [X.fount - 194, 1], [X.fount + 194, 1], [X.benchR + 196, 0], [X.mail + 200, 1]];
const BENCH_W = 290;               // ม้านั่งยาว นั่งเรียงกันได้ 4 ตัว (ผู้ใช้ 7 พ.ย.)
// บันไดขึ้นชั้นบน (ใช้ร่วมชั้น 2): โคน x0 · 10 ขั้น กว้าง 18 สูง 15
const ST = { x0: X.stairs - 150, steps: 10, sw: 18, sh: 15 };
/**
 * ผิวเดินขึ้นบันไดจริง (ผู้ใช้ 8 พ.ย. "ให้น้องเดินขึ้นบันไดได้จริง หยุดที่ประตู แล้วกดเข้าเอง")
 *   เส้นลาดผ่านกลางลูกขั้นทุกขั้น → ชานพักยาวถึงประตู · เดินจากพื้นเข้าโคนบันได = ไต่ขึ้นเอง (ระบบผิวเดิมของเมือง)
 */
export function stairsSurface(id, x0, xEnd) {
  const { steps, sw, sh } = ST, base = GY - 8, landY = base - steps * sh, lx = x0 + steps * sw;
  return { id, pts: [[x0 - 14, GY], [x0 + sw / 2, base - sh], [lx - sw / 2, landY], [xEnd - 6, landY]] };
}
/** ประตูบนชานพัก (จุดกดขึ้นชั้นบน — ต้องยืนบนชานพักหน้าประตู) */
/** ผิวขั้นบันไดจริงใต้จุด x (บันไดเริ่ม x0 ขึ้นทางขวา) · ก่อนขั้นแรก = พื้น · เลยขั้นบนสุด = ชานพัก */
export function stairsTread(x0, x) {
  const { steps, sw, sh } = ST, base = GY - 8;
  if (x < x0) return GY;
  const i = Math.floor((x - x0) / sw);
  return i >= steps ? base - steps * sh : base - (i + 1) * sh;
}
/**
 * ต่อเส้นโครงขั้นบันได (ผิวขั้น + ลูกตั้ง) จาก xR ไปทาง xL ลงใน path (lineTo ต่อจากจุดเดิม) · dy = เลื่อนลง
 * main.js ใช้ตัดภาพตัวน้องตอนอยู่บนบันได: ส่วนที่จมใต้ผิวขั้นถูกซ่อน (ขาไม่ทะลุพื้นขั้น)
 */
export function stairsProfilePath(path, x0, xL, xR, dy = 0) {
  const { steps, sw } = ST;
  path.lineTo(xR, stairsTread(x0, xR) + dy);
  for (let i = steps; i >= 0; i--) {
    const rx = x0 + i * sw;
    if (rx >= xR || rx <= xL) continue;
    path.lineTo(rx, stairsTread(x0, rx + 0.01) + dy);
    path.lineTo(rx, stairsTread(x0, rx - 0.01) + dy);
  }
  path.lineTo(xL, stairsTread(x0, xL) + dy);
}
export function stairsDoor(x0, xEnd) {
  const landY = GY - 8 - ST.steps * ST.sh, lx = x0 + ST.steps * ST.sw;
  const x = lx + 14, w = xEnd - 22 - x;
  // seats = จุดที่ยืนแล้วกดเข้าประตูได้ (ทั้งชานพัก ไม่ต้องยืนเป๊ะกลางประตู)
  return { x, w, gy: landY, h: 128, promptDy: 112, seats: [lx + 4, x + w / 2, xEnd - 40] };
}
const SEATS = [-105, -35, 35, 105]; // ช่องที่นั่ง (จากกลางม้านั่ง)
// โคมระย้าห้อยตรงแนวเสา (ไม่ทับป้ายต้อนรับ/หน้าต่าง) สมมาตรรอบน้ำพุกลางโถง
const CHANDELIERS = [800, 1200, 2400, 2800];
const NOTICE = { w: 236, top: 110, bot: WAIN - 6 };
const MEMBERS = { w: 244, top: 110, bot: WAIN - 6 };

export const H_PLACES = [
  { id: 'hDoor', kind: 'gate', to: 'town', act: 'ออกจากปราสาท', name: 'ประตูทางเข้า', x: X.door - 85, w: 170, h: 240 },
  { id: 'hCounter', kind: 'counter', act: 'ติดต่อเคาน์เตอร์', name: 'เคาน์เตอร์ต้อนรับ', x: X.counter - 115, w: 230, h: 130 },
  { id: 'hNotice', kind: 'board', act: 'อ่านประกาศ', name: 'กระดานประกาศ', x: X.notice - NOTICE.w / 2, w: NOTICE.w, h: GY - NOTICE.top },
  { id: 'hBenchL', kind: 'bench', name: 'ม้านั่งยาว', x: X.benchL - BENCH_W / 2, w: BENCH_W, h: 60, seats: SEATS.map((d) => X.benchL + d), sitDy: 28 },
  { id: 'hFount', kind: 'photo', name: 'น้ำพุแมวเหมียว', act: 'ถ่ายรูปกับน้ำพุ', x: X.fount - 90, w: 180, h: 250 },
  { id: 'hBenchR', kind: 'bench', name: 'ม้านั่งยาว', x: X.benchR - BENCH_W / 2, w: BENCH_W, h: 60, seats: SEATS.map((d) => X.benchR + d), sitDy: 28 },
  { id: 'hMail', kind: 'mail', act: 'เปิดตู้จดหมาย', name: 'ตู้จดหมาย', x: X.mail - 40, w: 80, h: 118 },
  { id: 'hMembers', kind: 'members', act: 'ดูสมาชิก', name: 'กระดานสมาชิก', x: X.members - MEMBERS.w / 2, w: MEMBERS.w, h: GY - MEMBERS.top },
  { id: 'hStairs', kind: 'stairs', to: 'lounge', act: 'ขึ้นชั้น 2', name: 'ประตูขึ้นชั้น 2', ...stairsDoor(X.stairs - 150, HW) },
];
for (const p of H_PLACES) p.door = p.x + p.w / 2;
export const H_SPAWN = X.door + 130;
export const H_STAIRS_X = X.stairs - 150 - 40;   // ลงจากชั้น 2 = ยืนหน้าโคนบันได   // เข้ามา = ยืนข้างประตู หันเข้าโถง

export const H_FOUNT_X = X.fount;   // main.js: เสียงน้ำพุดังตามระยะ
function buildSurfaces() {
  const S = [];
  // เบาะ/พนักม้านั่งบุนวม = นุ่ม (soft): เหยียบ/ลงแล้วยุบเด้ง (main.js) · ผู้ใช้ 8 พ.ย. "เบาะ โซฟานุ่ม ๆ ให้เด้งน่ารักทุกที่"
  for (const p of H_PLACES) if (p.kind === 'bench') S.push(flat(p.id + ':seat', p.x + 8, p.x + p.w - 8, GY - 26, { soft: true }), flat(p.id + ':back', p.x + 6, p.x + p.w - 6, GY - 54, { soft: true }));
  // น้ำพุสามชั้นแบบเดียวกับลานกลางเมือง (ผู้ใช้ 8 พ.ย.): ขึ้นไปเหยียบเล่นน้ำได้ทุกชั้น — water = ลงแล้วน้ำกระเซ็น + เสียงจ๋อม (main.js land)
  const cx = X.fount, { W, rim, mid, midR, top, topR } = FNT;
  S.push(
    flat('hfnt:rim', cx - W + 4, cx + W - 4, GY - rim, { water: true }), flat('hfnt:bowl', cx - midR + 2, cx + midR - 2, GY - mid, { water: true }),
    flat('hfnt:top', cx - topR + 1, cx + topR - 1, GY - top, { water: true }), flat('hfnt:cat', cx - 9, cx + 9, GY - 207),
  );
  S.push(stairsSurface('hall:stairs', ST.x0, HW));
  for (const s of S) { s.x0 = s.pts[0][0]; s.x1 = s.pts[s.pts.length - 1][0]; }
  return S;
}
export const H_SURFACES = buildSurfaces();

// ── ตัวช่วยวาด ────────────────────────────────────────────────
export function rr(c, x, y, w, h, r, col) { c.fillStyle = col; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }
/** ทางโค้ง: สี่เหลี่ยม + ครึ่งวงกลมด้านบน */
export function archPath(c, x0, x1, top, bot) {
  const r = (x1 - x0) / 2;
  c.moveTo(x0, bot); c.lineTo(x0, top + r); c.arc(x0 + r, top + r, r, Math.PI, 0); c.lineTo(x1, bot); c.closePath();
}
export const goldV = (c, y0, y1) => lg(c, 0, y0, 0, y1, [[0, SGOLD], [1, GOLD_D]]);
export function crownIcon(c, x, y, s) {
  c.fillStyle = lg(c, 0, y - 18 * s, 0, y, [[0, '#FFE58A'], [1, '#E3A11F']]);
  c.beginPath();
  c.moveTo(x - 14 * s, y); c.lineTo(x - 16 * s, y - 14 * s); c.lineTo(x - 7 * s, y - 7 * s); c.lineTo(x, y - 18 * s);
  c.lineTo(x + 7 * s, y - 7 * s); c.lineTo(x + 16 * s, y - 14 * s); c.lineTo(x + 14 * s, y); c.closePath(); c.fill();
  c.fillStyle = '#FF8FB3'; c.beginPath(); c.arc(x, y - 6 * s, 2.4 * s, 0, TAU); c.fill();
}
export function pawIcon(c, x, y, s, col) {
  c.fillStyle = col;
  // ฝ่าเท้ามนสามลอนล่าง
  c.beginPath();
  c.moveTo(x - 5.2 * s, y + 3.4 * s);
  c.bezierCurveTo(x - 5.8 * s, y - 1.2 * s, x - 2.4 * s, y - 2.2 * s, x, y - 2.2 * s);
  c.bezierCurveTo(x + 2.4 * s, y - 2.2 * s, x + 5.8 * s, y - 1.2 * s, x + 5.2 * s, y + 3.4 * s);
  c.bezierCurveTo(x + 4.6 * s, y + 6.2 * s, x + 2.2 * s, y + 5.4 * s, x, y + 6 * s);
  c.bezierCurveTo(x - 2.2 * s, y + 5.4 * s, x - 4.6 * s, y + 6.2 * s, x - 5.2 * s, y + 3.4 * s);
  c.fill();
  for (const [dx, dy, rot] of [[-5.3, -3.6, -0.45], [-1.9, -6.6, -0.12], [1.9, -6.6, 0.12], [5.3, -3.6, 0.45]]) {
    c.beginPath(); c.ellipse(x + dx * s, y + dy * s, 1.85 * s, 2.45 * s, rot, 0, TAU); c.fill();
  }
}
/**
 * หัวแมวกลม (กรอบรูป ป้ายสมาชิก หมอน ตู้ ฯลฯ) — ผู้ใช้ 8 พ.ย. "หน้าแมวดูแปลก วาดใหม่"
 *   (แบบเดิมเส้นตาสองข้างต่อกันเป็นเส้นเดียวพาดหน้า) · หูมนมีในหูชมพู · หัวแป้นไล่เงาใต้คาง · ตาหยียิ้ม (mood) หรือตาโตมีประกาย
 *   จมูกชมพู ปาก w แก้มชมพู · หัวใหญ่พอ (r ≥ 12) มีหนวดเส้นบาง
 */
export function catFace(c, x, y, r, fur, mood = 0) {
  const ear = (d) => {
    c.beginPath();
    c.moveTo(x + d * r * 0.98, y - r * 0.18);
    c.quadraticCurveTo(x + d * r * 1.06, y - r * 1.2, x + d * r * 0.74, y - r * 1.22);
    c.quadraticCurveTo(x + d * r * 0.46, y - r * 1.08, x + d * r * 0.16, y - r * 0.8);
    c.closePath();
  };
  c.fillStyle = fur;
  for (const d of [-1, 1]) { ear(d); c.fill(); }
  c.fillStyle = 'rgba(120,70,90,.12)';
  for (const d of [-1, 1]) { ear(d); c.fill(); }
  c.fillStyle = '#FFC4DA';
  for (const d of [-1, 1]) {
    c.beginPath();
    c.moveTo(x + d * r * 0.82, y - r * 0.4); c.quadraticCurveTo(x + d * r * 0.88, y - r * 1.02, x + d * r * 0.7, y - r * 1.02);
    c.quadraticCurveTo(x + d * r * 0.5, y - r * 0.92, x + d * r * 0.36, y - r * 0.72); c.closePath(); c.fill();
  }
  c.fillStyle = fur;
  c.beginPath(); c.ellipse(x, y, r * 1.1, r * 0.94, 0, 0, TAU); c.fill();
  // เงานุ่มใต้คาง + แสงบนหน้าผาก
  c.fillStyle = 'rgba(150,90,110,.12)'; c.beginPath(); c.ellipse(x, y + r * 0.5, r * 0.95, r * 0.42, 0, 0, Math.PI); c.fill();
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.5, r * 0.32, r * 0.14, -0.3, 0, TAU); c.fill();
  const ink = '#5E4378';
  c.lineCap = 'round';
  if (mood) {
    c.strokeStyle = ink; c.lineWidth = Math.max(1, r * 0.1);
    for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * r * 0.4, y + r * 0.02, r * 0.17, Math.PI * 1.12, Math.PI * 1.88); c.stroke(); }
  } else {
    for (const d of [-1, 1]) {
      c.fillStyle = ink; c.beginPath(); c.ellipse(x + d * r * 0.38, y - r * 0.02, r * 0.14, r * 0.17, 0, 0, TAU); c.fill();
      c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(x + d * r * 0.38 - r * 0.05, y - r * 0.08, r * 0.055, 0, TAU); c.fill();
    }
  }
  c.fillStyle = '#FF8FB3';
  c.beginPath(); c.moveTo(x - r * 0.09, y + r * 0.16); c.lineTo(x + r * 0.09, y + r * 0.16); c.lineTo(x, y + r * 0.27); c.closePath(); c.fill();
  c.strokeStyle = ink; c.lineWidth = Math.max(0.8, r * 0.07);
  for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * r * 0.085, y + r * 0.28, r * 0.085, 0.15, Math.PI - 0.15); c.stroke(); }
  c.fillStyle = 'rgba(255,143,179,.5)';
  for (const d of [-1, 1]) { c.beginPath(); c.ellipse(x + d * r * 0.66, y + r * 0.24, r * 0.17, r * 0.11, 0, 0, TAU); c.fill(); }
  if (r >= 12) {
    c.strokeStyle = 'rgba(94,67,120,.45)'; c.lineWidth = Math.max(0.6, r * 0.035);
    for (const d of [-1, 1]) for (const k of [-1, 1]) {
      c.beginPath(); c.moveTo(x + d * r * 0.78, y + r * (0.14 + k * 0.08)); c.lineTo(x + d * r * 1.18, y + r * (0.1 + k * 0.16)); c.stroke();
    }
  }
}
/**
 * ภาพเหมือนเจ้าหญิงแมว (กรอบรูปบนผนังชั้น 2 · ผู้ใช้ 8 พ.ย.): ไหล่ + ปลอกคอโบว์ชมพูกระดิ่งทอง · หัวแมว · มงกุฎวางบนหัวพอดี (ไม่ลอย)
 *   cx, cy = กลางหัว · r = รัศมีหัว · fur = สีขน
 */
export function catPortrait(c, cx, cy, r, fur, crown = true) {
  // ไหล่/ตัวช่วงบน
  c.fillStyle = fur;
  c.beginPath(); c.moveTo(cx - r * 1.5, cy + r * 2.1); c.quadraticCurveTo(cx - r * 1.45, cy + r * 0.85, cx, cy + r * 0.7); c.quadraticCurveTo(cx + r * 1.45, cy + r * 0.85, cx + r * 1.5, cy + r * 2.1); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(cx, cy + r * 1.55, r * 0.55, r * 0.5, 0, 0, TAU); c.fill();
  // ปลอกคอโบว์ชมพู + กระดิ่งทอง
  c.fillStyle = '#F58CB8'; c.beginPath(); c.roundRect(cx - r * 0.8, cy + r * 0.78, r * 1.6, r * 0.2, r * 0.1); c.fill();
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(cx, cy + r * 0.88); c.quadraticCurveTo(cx + d * r * 0.5, cy + r * 0.5, cx + d * r * 0.48, cy + r * 1.02); c.closePath(); c.fill(); }
  c.fillStyle = goldV(c, cy + r * 0.92, cy + r * 1.28); c.beginPath(); c.arc(cx, cy + r * 1.08, r * 0.16, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(cx - r * 0.05, cy + r * 1.03, r * 0.05, 0, TAU); c.fill();
  catFace(c, cx, cy, r, fur, 1);
  if (crown) {
    // มงกุฎวางบนกระหม่อม (ฐานแนบหัว) เอียงนิด ๆ
    c.save(); c.translate(cx + r * 0.08, cy - r * 0.86); c.rotate(0.08);
    c.fillStyle = lg(c, 0, -r * 0.62, 0, 0, [[0, '#FFE58A'], [1, '#E3A11F']]);
    c.beginPath(); c.moveTo(-r * 0.42, 0); c.lineTo(-r * 0.48, -r * 0.48); c.lineTo(-r * 0.22, -r * 0.24); c.lineTo(0, -r * 0.6);
    c.lineTo(r * 0.22, -r * 0.24); c.lineTo(r * 0.48, -r * 0.48); c.lineTo(r * 0.42, 0); c.quadraticCurveTo(0, r * 0.1, -r * 0.42, 0); c.closePath(); c.fill();
    c.fillStyle = '#FF8FB3'; c.beginPath(); c.arc(0, -r * 0.16, r * 0.08, 0, TAU); c.fill();
    for (const d of [-0.48, 0, 0.48]) { c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(r * d, d ? -r * 0.48 : -r * 0.6, r * 0.05, 0, TAU); c.fill(); }
    c.restore();
  }
}
/** ประกายสี่แฉก (ขนาด r) */
export function sparkle4(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill();
}
/**
 * ประกายวิบรอบของที่เล่นได้ (ผู้ใช้ 8 พ.ย. "ให้รู้ว่าตรงนี้เล่น/มาดูได้") — สามดวงผลัดกันเกิด-หายตรงจุดสุ่มรอบของ
 *   cx, cy = กลาง · w = ครึ่งความกว้างที่โปรย
 */
export function sparkleHint(c, cx, cy, w, t) {
  c.save();
  for (let i = 0; i < 3; i++) {
    const p = t * 0.009 + i / 3, n = Math.floor(p), u = p - n, a = Math.sin(u * Math.PI);
    const x = cx + (hash(n * 7.3 + i * 1.9) - 0.5) * 2 * w, y = cy + (hash(n * 3.1 + i * 5.7) - 0.5) * w * 0.7;
    c.globalAlpha = a * 0.95;
    c.fillStyle = i % 2 ? '#FFFFFF' : '#FFE48A';
    sparkle4(c, x, y, 2.5 + a * 3.5);
  }
  c.restore();
}
// ── กระดาน/ป้ายที่เข้าไปดูได้ (ผู้ใช้ 8 พ.ย. "วาดใหม่ให้เด่น ให้รู้ว่ามาดูตรงนี้ได้") ─────────────
//   กรอบทองหนามุมดอกกุหลาบเพชร · ริบบิ้นชื่อพาดบนกรอบ (ตัวหนังสือวาดสดบนริบบิ้น — ไม่แคชตัวหนังสือ) · โคมกลมสองข้างบนกรอบส่องแสงลง
//   หลังกรอบมีแสงนวลเต้นเบา ๆ + ประกายวิบ (sparkleHint) — ใช้ร่วมทุกชั้น
/** กรอบกระดาน (ภาพนิ่ง): x0,y0,w,h = ตัวกระดาน · inner = สีพื้นด้านใน [บน, ล่าง] */
export function boardFrame(c, x0, y0, w, h, inner = ['#FFF7EC', '#FBEAD8']) {
  c.fillStyle = 'rgba(90,50,140,.18)'; c.beginPath(); c.roundRect(x0 + 5, y0 + 7, w, h, 14); c.fill();
  c.fillStyle = goldV(c, y0, y0 + h); c.beginPath(); c.roundRect(x0, y0, w, h, 14); c.fill();
  c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.roundRect(x0 + 4, y0 + 3, w - 8, 3, 1.5); c.fill();
  c.fillStyle = 'rgba(150,100,30,.25)'; c.beginPath(); c.roundRect(x0 + 6, y0 + h - 5, w - 12, 2.5, 1.2); c.fill();
  c.fillStyle = lg(c, 0, y0 + 9, 0, y0 + h - 9, [[0, inner[0]], [1, inner[1]]]);
  c.beginPath(); c.roundRect(x0 + 9, y0 + 9, w - 18, h - 18, 8); c.fill();
  // ลายจุดเนื้อบอร์ด
  c.fillStyle = 'rgba(200,150,120,.12)';
  for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(x0 + 14 + hash(i * 3.7 + w) * (w - 28), y0 + 14 + hash(i * 5.1 + h) * (h - 28), 1.2, 0, TAU); c.fill(); }
  // มุมดอกกุหลาบทอง + เพชรชมพู
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const px = x0 + (dx ? w - 7 : 7), py = y0 + (dy ? h - 7 : 7);
    c.fillStyle = goldV(c, py - 8, py + 8); c.beginPath(); c.arc(px, py, 8, 0, TAU); c.fill();
    c.fillStyle = '#FFF4F0'; c.beginPath(); c.arc(px, py, 5, 0, TAU); c.fill();
    c.fillStyle = '#FF8FB3'; c.beginPath(); c.arc(px, py, 3, 0, TAU); c.fill();
  }
  // โคมกลมสองข้างบนกรอบ (ตัวโคม — แสงวาดสดใน boardLive)
  for (const d of [-1, 1]) {
    const lx = x0 + w / 2 + d * (w / 2 - 16), ly = y0 - 12;
    c.strokeStyle = GOLD_D; c.lineWidth = 2; c.beginPath(); c.moveTo(lx, y0 + 2); c.lineTo(lx, ly + 4); c.stroke();
    c.fillStyle = 'rgba(255,248,226,.95)'; c.beginPath(); c.arc(lx, ly, 6, 0, TAU); c.fill();
    c.fillStyle = goldV(c, ly - 8, ly - 4); c.beginPath(); c.roundRect(lx - 4, ly - 8, 8, 3.5, 1.5); c.fill();
  }
}
/** ริบบิ้นชื่อพาดบนกรอบ (ภาพนิ่ง) — ปลายพับหางแฉก · cx, y = กลางริบบิ้น · w = ความยาว */
export function boardBanner(c, cx, y, w, col = ['#F7A8CB', '#E86A96', '#B94C7C']) {
  const hh = 13;
  for (const d of [-1, 1]) {
    const ex = cx + d * w / 2;
    c.fillStyle = col[1];
    c.beginPath(); c.moveTo(ex - d * 8, y - hh + 6); c.lineTo(ex + d * 18, y - hh + 6); c.lineTo(ex + d * 11, y + 3); c.lineTo(ex + d * 18, y + hh + 2); c.lineTo(ex - d * 8, y + hh + 2); c.closePath(); c.fill();
    c.fillStyle = col[2]; c.beginPath(); c.moveTo(ex - d * 1, y + hh - 2); c.lineTo(ex - d * 8, y + hh + 2); c.lineTo(ex - d * 1, y + hh + 2); c.closePath(); c.fill();
  }
  c.fillStyle = lg(c, 0, y - hh, 0, y + hh, [[0, col[0]], [1, col[1]]]);
  c.beginPath(); c.moveTo(cx - w / 2, y - hh); c.quadraticCurveTo(cx, y - hh - 6, cx + w / 2, y - hh); c.lineTo(cx + w / 2, y + hh - 2); c.quadraticCurveTo(cx, y + hh - 8, cx - w / 2, y + hh - 2); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.setLineDash([3, 3]);
  c.beginPath(); c.moveTo(cx - w / 2 + 4, y - hh + 4); c.quadraticCurveTo(cx, y - hh - 2, cx + w / 2 - 4, y - hh + 4); c.stroke();
  c.beginPath(); c.moveTo(cx - w / 2 + 4, y + hh - 6); c.quadraticCurveTo(cx, y + hh - 12, cx + w / 2 - 4, y + hh - 6); c.stroke();
  c.setLineDash([]);
}
/** ส่วนสดของกระดาน: แสงนวลหลังกรอบ · แสงโคมสองข้าง · ชื่อบนริบบิ้น · ประกายวิบ */
export function boardLive(c, x0, y0, w, h, t, title, bannerY) {
  const cx = x0 + w / 2, pulse = 0.5 + 0.5 * Math.sin(t * 0.04);
  for (const d of [-1, 1]) {
    const lx = cx + d * (w / 2 - 16), ly = y0 - 12;
    const g = c.createRadialGradient(lx, ly, 2, lx, ly + 30, 70);
    g.addColorStop(0, `rgba(255,236,180,${(0.45 + 0.1 * pulse).toFixed(3)})`); g.addColorStop(1, 'rgba(255,236,180,0)');
    c.fillStyle = g; c.beginPath(); c.arc(lx, ly + 30, 70, 0, TAU); c.fill();
  }
  c.font = '700 12px Mali, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(150,40,90,.35)'; c.fillText(title, cx + 0.6, bannerY - 2.2);
  c.fillStyle = '#FFFFFF'; c.fillText(title, cx, bannerY - 3);
  sparkleHint(c, cx, y0 + h * 0.45, w * 0.48, t);
}
export function label(c, x, y, text, bg, fg, size = 11) {
  c.font = `700 ${size}px Mali, sans-serif`;
  const w = c.measureText(text).width + 22;
  rr(c, x - w / 2, y - size, w, size * 2, size, bg);
  c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, x, y + 0.5);
}

// ── แสงเงาปริมาตร (ผู้ใช้ 7 พ.ย. "ปรับลายเส้นให้สวยขึ้น") ─────────────────
// ของทุกชิ้นแคชเป็นภาพแล้วทาแสงเงาทับครั้งเดียวต่อขนาดจอ (ไม่กินแรงตอนเล่น):
//   ซีกซ้ายอมม่วง ซีกขวาอุ่น โคนมืดลงนิด (แดดขวาบน — ชุดเดียวกับ light() ของเมือง) · ทาเฉพาะพิกเซลของชิ้น (source-atop)
// ผู้ใช้ 8 พ.ย.: ไม่เอาเส้นขอบตัดรอบของ — ห้ามใส่เส้นขอบรอบรูปทรง (outline) กลับมา
function shadePass(cc, o = {}) {
  if (o.shade === false) return;
  const W = cc.canvas.width, Hh = cc.canvas.height;
  cc.save();
  cc.setTransform(1, 0, 0, 1, 0, 0);
  cc.globalCompositeOperation = 'source-atop';
  let g = cc.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(80,45,140,.12)'); g.addColorStop(0.5, 'rgba(80,45,140,0)'); g.addColorStop(1, 'rgba(255,236,200,.12)');
  cc.fillStyle = g; cc.fillRect(0, 0, W, Hh);
  g = cc.createLinearGradient(0, Hh, 0, Hh * 0.5);
  g.addColorStop(0, 'rgba(80,45,140,.12)'); g.addColorStop(1, 'rgba(80,45,140,0)');
  cc.fillStyle = g; cc.fillRect(0, 0, W, Hh);
  cc.restore();
}
/** cached() + แสงเงาปริมาตร — ใช้กับของทุกชิ้นในปราสาท (ทุกชั้น) */
export function shaded(c, key, x, y, w, h, draw, o) {
  cached(c, key, x, y, w, h, (cc) => { draw(cc); shadePass(cc, o); });
}
/** พื้นแคชเป็นช่วงละ 400 (วาดตามพิกัดโลก ลายต่อกันสนิท · ช่วงซ้อนกัน 4 หน่วย กันรอยต่อ) */
const SEG = 400;
export function drawFloorSegs(c, camX, vw, key, W, range) {
  const s0 = Math.max(0, Math.floor((camX - 20) / SEG)), s1 = Math.min(Math.ceil(W / SEG) - 1, Math.floor((camX + vw + 20) / SEG));
  for (let s = s0; s <= s1; s++) cached(c, key + ':' + s, s * SEG, WALL_B, SEG + 4, H - WALL_B + 2, (g) => range(g, s * SEG, s * SEG + SEG + 4));
}

// ── ผนังหนึ่งช่วงเสา (แคชตามแบบ · ห้ามมีตัวหนังสือ — ฟอนต์อาจยังโหลดไม่เสร็จตอนแคช) ──
/** วิวนอกหน้าต่าง — ตามเวลาจริง (castle-sky.js: กลางวัน · ฟ้าเย็น · กลางคืนมีดาว/ดวงจันทร์ข้างขึ้นข้างแรม) */
function windowView(c, x0, x1, top, bot, seed) { windowSky(c, x0, x1, top, bot, seed, sky()); }
/** แบบผนังนี้มีวิวข้างนอกไหม (แคชผนังต้องผูกกับสีฟ้าตอนนี้) */
export const bayKey = (kind) => (kind === 'win' || kind === 'grand' ? ':' + sky().key : '');
/**
 * ดาวระยิบ + ดาวตกในหน้าต่างตอนกลางคืน (วาดสดทับผนังแคช) · bays = แบบผนังแต่ละช่วง · seedOf(i) = seed ของหน้าต่างบานนั้น
 */
export function drawWindowTwinkles(c, camX, vw, t, bays, seedOf) {
  const n = sky().night + sky().dusk * 0.3;
  if (n < 0.05) return;
  for (let i = Math.max(0, Math.floor(camX / BAY)); i <= Math.min(bays.length - 1, Math.floor((camX + vw) / BAY)); i++) {
    const kind = bays[i];
    if (kind !== 'win' && kind !== 'grand') continue;
    const W = kind === 'grand' ? GRAND : WIN, cx = i * BAY + BAY / 2, x0 = cx - W.w / 2, x1 = cx + W.w / 2;
    c.save(); c.beginPath(); archPath(c, x0, x1, W.top, W.bot); c.clip();
    windowTwinkles(c, x0, x1, W.top, W.bot, seedOf(i, kind), t, n);
    c.restore();
  }
}

/**
 * ผ้าม่านหรูหน้าต่างบานใหญ่ (ผู้ใช้ 8 พ.ย. "ปรับผ้าม่านชมพูให้สวยขึ้น") — ภาพนิ่งในผนังแคช
 *   ม่านสองข้าง: จีบผ้าไล่แสงเงาลงมาเป็นริ้ว · รวบกลางด้วยเชือกทองพู่ห้อย · ชายบานออกเป็นลอนถึงพื้น ขอบทอง
 *   ระบายบนสามโค้ง (swag) จีบตามโค้ง ขอบถักทอง · พู่ทองตรงรอยต่อ · ชายจีบห้อยสองข้าง (jabot) · ผ้าลูกไม้ขาวบางด้านใน
 */
export function drapes(c, cx, W) {
  const half = W.w / 2, topY = CEIL + 2, tieY = 192, botY = WALL_B - 3;
  // ผ้าโปร่งลูกไม้ขาวด้านใน (เห็นขอบบาง ๆ ข้างกรอบหน้าต่าง)
  for (const d of [-1, 1]) {
    c.fillStyle = 'rgba(255,255,255,.42)';
    c.beginPath(); c.moveTo(cx + d * (half - 22), topY); c.lineTo(cx + d * (half + 30), topY);
    c.lineTo(cx + d * (half + 30), botY); c.quadraticCurveTo(cx + d * (half - 10), botY - 30, cx + d * (half - 20), tieY + 20); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)';
    for (let y = topY + 14; y < botY - 10; y += 16) { c.beginPath(); c.arc(cx + d * (half - 6) + Math.sin(y * 0.3) * 3, y, 1.4, 0, TAU); c.fill(); }
  }
  for (const d of [-1, 1]) {
    const xo = cx + d * (half + 60), xi = cx + d * (half - 10);   // ขอบนอก/ขอบใน ด้านบน
    const xg = cx + d * (half + 24), gw = 15;                      // จุดรวบ
    const xbI = cx + d * (half - 4), xbO = cx + d * (half + 74);   // ชายล่างบานออก
    const gi = xg - d * gw, go = xg + d * gw;                      // ขอบใน/นอกตรงจุดรวบ
    const N = 6, hem = [];
    for (let i = 0; i <= N; i++) { const u = i / N; hem.push([xbI + (xbO - xbI) * u, botY + (i % 2 ? -2.5 : 2)]); }
    const panel = new Path2D();
    panel.moveTo(xo, topY); panel.lineTo(xi, topY);
    panel.bezierCurveTo(xi, topY + 80, gi + d * 4, tieY - 56, gi, tieY);
    panel.bezierCurveTo(gi, tieY + 44, xbI, botY - 58, xbI, botY);
    for (let i = 1; i <= N; i++) { const [px, py] = hem[i - 1], [qx, qy] = hem[i]; panel.quadraticCurveTo((px + qx) / 2, Math.max(py, qy) + 4, qx, qy); }
    panel.bezierCurveTo(xbO, botY - 64, go - d * 2, tieY + 40, go, tieY);
    panel.bezierCurveTo(go + d * 8, tieY - 64, xo, topY + 70, xo, topY);
    panel.closePath();
    // เนื้อผ้า: ด้านนอกเข้ม ด้านในสว่าง (แสงจากหน้าต่าง) + เงาซาตินเฉียง
    c.fillStyle = lg(c, xo, 0, xi, 0, [[0, '#E27BAE'], [0.45, '#F4A3C9'], [1, '#FCD3E5']]);
    c.fill(panel);
    c.save(); c.clip(panel);
    // จีบผ้า: ริ้วเงา/ริ้วแสงไล่ตามแนวผ้า บน → จุดรวบ → ชายล่าง
    for (let j = 0; j < 7; j++) {
      const u = (j + 0.5) / 7;
      const tx = xo + (xi - xo) * u, mx = go + (gi - go) * u, bx = xbO + (xbI - xbO) * u;
      const fold = (dx, col, lw) => {
        c.strokeStyle = col; c.lineWidth = lw;
        c.beginPath(); c.moveTo(tx + dx, topY); c.quadraticCurveTo(tx + dx, tieY - 70, mx + dx * 0.3, tieY);
        c.quadraticCurveTo(mx + dx * 0.3, tieY + 70, bx + dx * 1.4, botY + 4); c.stroke();
      };
      fold(-2.2, 'rgba(190,70,130,.26)', 4.2);
      fold(2.4, 'rgba(255,255,255,.34)', 1.8);
    }
    // เงาใต้จุดรวบ + แสงวาวซาติน
    c.fillStyle = lg(c, 0, tieY - 30, 0, tieY + 34, [[0, 'rgba(160,50,110,0)'], [0.5, 'rgba(160,50,110,.22)'], [1, 'rgba(160,50,110,0)']]);
    c.fillRect(Math.min(xbO, xo) - 4, tieY - 30, Math.abs(xbO - xbI) + 30, 64);
    c.fillStyle = 'rgba(255,255,255,.16)';
    c.beginPath(); c.moveTo(xi - d * 10, topY); c.lineTo(xi - d * 22, topY); c.lineTo(gi + d * 6, tieY); c.lineTo(gi + d * 1, tieY); c.closePath(); c.fill();
    c.restore();
    // ชายผ้าขอบทอง + ซับในครีมพับโผล่ตรงขอบใน
    c.strokeStyle = GOLD; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(hem[0][0], hem[0][1]);
    for (let i = 1; i <= N; i++) { const [px, py] = hem[i - 1], [qx, qy] = hem[i]; c.quadraticCurveTo((px + qx) / 2, Math.max(py, qy) + 4, qx, qy); }
    c.stroke();
    c.strokeStyle = 'rgba(255,244,240,.9)'; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(gi, tieY + 6); c.bezierCurveTo(gi, tieY + 44, xbI, botY - 58, xbI, botY - 2); c.stroke();
    // เชือกรวบทอง + พู่ห้อย
    c.fillStyle = goldV(c, tieY - 5, tieY + 5);
    c.beginPath(); c.ellipse(xg, tieY, gw + 5, 5.2, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(xg - 3, tieY - 2, gw - 2, 1.3, 0, 0, TAU); c.fill();
    const px = go + d * 3, py = tieY + 3;
    c.strokeStyle = GOLD_D; c.lineWidth = 1.6; c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + d * 6, py + 8, px + d * 4, py + 16); c.stroke();
    tassel(c, px + d * 4, py + 16, 1);
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(xg, tieY, 3, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,143,179,.9)'; c.beginPath(); c.arc(xg, tieY, 1.6, 0, TAU); c.fill();
  }
  // ── ระบายบน ──
  const vx0 = cx - (half + 70), vx1 = cx + (half + 70);
  // ชายจีบห้อยสองข้าง (jabot)
  for (const d of [-1, 1]) {
    const xa = d < 0 ? vx0 : vx1, xb = xa - d * 40;
    const J = new Path2D();
    J.moveTo(xb, topY); J.lineTo(xa + d * 6, topY); J.lineTo(xa + d * 6, topY + 126);
    J.lineTo(xa - d * 6, topY + 112); J.lineTo(xa - d * 14, topY + 100); J.lineTo(xa - d * 24, topY + 84); J.lineTo(xb, topY + 64); J.closePath();
    c.fillStyle = lg(c, xa, 0, xb, 0, [[0, '#E27BAE'], [1, '#F7B5D3']]); c.fill(J);
    c.save(); c.clip(J);
    for (const k of [0.25, 0.5, 0.75]) {
      const x = xa + (xb - xa) * k;
      c.strokeStyle = 'rgba(190,70,130,.3)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, topY); c.lineTo(x, topY + 130); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + 2.5, topY); c.lineTo(x + 2.5, topY + 130); c.stroke();
    }
    c.restore();
    c.strokeStyle = GOLD; c.lineWidth = 2;
    c.beginPath(); c.moveTo(xa + d * 6, topY + 126); c.lineTo(xa - d * 6, topY + 112); c.lineTo(xa - d * 14, topY + 100); c.lineTo(xa - d * 24, topY + 84); c.lineTo(xb, topY + 64); c.stroke();
    tassel(c, xa + d * 6, topY + 128, 0.9);
  }
  // สามโค้ง (swag) จีบซ้อนตามโค้ง ขอบถักทอง
  const sw = (vx1 - vx0 - 52) / 3;
  for (let j = 0; j < 3; j++) {
    const a = vx0 + 26 + j * sw - 8, b = a + sw + 16, m = (a + b) / 2, dep = j === 1 ? 50 : 44;
    const S = new Path2D();
    S.moveTo(a, topY); S.lineTo(b, topY); S.lineTo(b, topY + 10);
    S.quadraticCurveTo(m, topY + dep * 2 - 10, a, topY + 10); S.closePath();
    c.fillStyle = lg(c, 0, topY, 0, topY + dep, [[0, '#FCD3E5'], [0.55, '#F4A3C9'], [1, '#E58AB8']]); c.fill(S);
    c.save(); c.clip(S);
    for (const f of [0.35, 0.58, 0.8]) {
      c.strokeStyle = 'rgba(190,70,130,.28)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(a, topY + 6); c.quadraticCurveTo(m, topY + (dep * 2 - 10) * f, b, topY + 6); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.34)'; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(a, topY + 9); c.quadraticCurveTo(m, topY + (dep * 2 - 10) * f + 3, b, topY + 9); c.stroke();
    }
    c.restore();
    c.strokeStyle = GOLD; c.lineWidth = 3;
    c.beginPath(); c.moveTo(b, topY + 10); c.quadraticCurveTo(m, topY + dep * 2 - 10, a, topY + 10); c.stroke();
    c.strokeStyle = SGOLD; c.lineWidth = 1.2; c.setLineDash([2.5, 3]);
    c.beginPath(); c.moveTo(b, topY + 10); c.quadraticCurveTo(m, topY + dep * 2 - 10, a, topY + 10); c.stroke();
    c.setLineDash([]);
    if (j > 0) tassel(c, a + 8, topY + 14, 0.85);
  }
  // คานม่านทอง
  c.fillStyle = goldV(c, topY - 4, topY + 4); c.beginPath(); c.roundRect(vx0 - 10, topY - 3, vx1 - vx0 + 20, 7, 3.5); c.fill();
  for (const x of [vx0 - 10, vx1 + 10]) { c.fillStyle = goldV(c, topY - 8, topY + 8); c.beginPath(); c.arc(x, topY + 0.5, 6, 0, TAU); c.fill(); c.fillStyle = '#FF8FB3'; c.beginPath(); c.arc(x, topY + 0.5, 2.2, 0, TAU); c.fill(); }
}
/** พู่ทอง (หัวกลม + ชายพู่เป็นเส้น) ห้อยจาก x,y */
function tassel(c, x, y, s) {
  c.fillStyle = goldV(c, y, y + 8 * s); c.beginPath(); c.arc(x, y + 3 * s, 3.6 * s, 0, TAU); c.fill();
  c.fillStyle = goldV(c, y + 5 * s, y + 24 * s);
  c.beginPath(); c.moveTo(x - 3 * s, y + 6 * s); c.lineTo(x + 3 * s, y + 6 * s); c.lineTo(x + 6 * s, y + 22 * s); c.quadraticCurveTo(x, y + 25 * s, x - 6 * s, y + 22 * s); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(160,110,30,.45)'; c.lineWidth = 0.8;
  for (const dx of [-3, -1, 1, 3]) { c.beginPath(); c.moveTo(x + dx * s * 0.6, y + 9 * s); c.lineTo(x + dx * s, y + 22 * s); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x - 1.2 * s, y + 2 * s, 1.1 * s, 0, TAU); c.fill();
}
/** หน้าต่างโค้ง · open = ไม่มีลูกฟักแนวตั้งกลาง (หน้าต่างใหญ่หลังน้ำพุ — ไม่ให้เส้นผ่าหัวแมวบนยอด) */
export function archWindow(c, cx, W, seed, open = false) {
  const x0 = cx - W.w / 2, x1 = cx + W.w / 2;
  c.save(); c.beginPath(); archPath(c, x0, x1, W.top, W.bot); c.clip();
  windowView(c, x0, x1, W.top, W.bot, seed);
  c.restore();
  // ลูกฟัก (ครีม + ทอง)
  c.strokeStyle = CREAM; c.lineWidth = 5;
  if (!open) { c.beginPath(); c.moveTo(cx, W.top); c.lineTo(cx, W.bot); c.stroke(); }
  const y1 = W.top + W.w / 2 + 8;
  for (const y of [y1, (y1 + W.bot) / 2 + 8]) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
  if (!open) { c.strokeStyle = GOLD; c.lineWidth = 1.8; c.beginPath(); c.moveTo(cx, W.top); c.lineTo(cx, W.bot); c.stroke(); }
  // กรอบ: ครีมหนา + ทอง
  c.strokeStyle = CREAM; c.lineWidth = 10;
  c.beginPath(); archPath(c, x0, x1, W.top, W.bot); c.stroke();
  c.strokeStyle = GOLD; c.lineWidth = 4;
  c.beginPath(); archPath(c, x0 - 6, x1 + 6, W.top - 6, W.bot); c.stroke();
  rr(c, cx - 11, W.top - 15, 22, 20, 4, CREAM);
  c.fillStyle = '#FF8FB3'; heart(c, cx, W.top - 4, 5); c.fill();
  rr(c, x0 - 14, W.bot - 2, W.w + 28, 10, 3, CREAM);
  c.fillStyle = GOLD; c.fillRect(x0 - 14, W.bot + 7, W.w + 28, 2.5);
}
export function drawBay(c, kind, i) {
  // ผนังหินลาเวนเดอร์ + ลายก้อนหิน
  c.fillStyle = lg(c, 0, 0, 0, WALL_B, [[0, '#D7BFF2'], [0.55, '#E2CFF6'], [1, '#E9DBF9']]);
  c.fillRect(0, 0, BAY, WALL_B);
  // ก้อนหินมนทีละก้อน: เนื้อสีต่างกันนิด ๆ · ขอบบนรับแสง · ขอบล่างเงา · ร่องยาแนวนุ่ม (สีตามตำแหน่งในช่วงเสา — ต่อกันได้ทุกช่วง)
  c.fillStyle = 'rgba(150,110,205,.16)';
  for (let r = 0, y = CEIL + 8; y < WAIN - 6; r++, y += 24) c.fillRect(0, y - 0.6, BAY, 1.2);
  for (let r = 0, y = CEIL + 8; y < WAIN - 6; r++, y += 24) {
    const hh = Math.min(24, WAIN - 4 - y);
    for (let x = (r % 2) * 40 - 40; x < BAY; x += 80) {
      const v = hash(r * 7.1 + (((x % BAY) + BAY) % BAY) * 0.131);
      c.fillStyle = 'rgba(150,110,205,.15)'; c.fillRect(x - 0.6, y, 1.2, hh);
      c.fillStyle = v < 0.34 ? 'rgba(160,120,215,.09)' : v < 0.67 ? 'rgba(255,255,255,.12)' : 'rgba(255,240,250,.05)';
      c.beginPath(); c.roundRect(x + 1.6, y + 1.6, 76.8, hh - 3.2, 5); c.fill();
      c.fillStyle = 'rgba(255,255,255,.42)'; c.beginPath(); c.roundRect(x + 7, y + 2.4, 64, 1.5, 0.8); c.fill();
      c.fillStyle = 'rgba(120,80,175,.12)'; c.beginPath(); c.roundRect(x + 7, y + hh - 3.6, 64, 1.4, 0.7); c.fill();
    }
  }
  // คิ้วเพดาน: ม่วง + โค้งเกล็ด + ขอบทอง + ดาวทองเล็กเรียง
  c.fillStyle = lg(c, 0, 0, 0, CEIL, [[0, SPUR], [1, LAV]]);
  c.fillRect(0, 0, BAY, CEIL);
  c.fillStyle = 'rgba(255,255,255,.32)';
  for (let x = 10; x < BAY; x += 20) { c.beginPath(); c.arc(x, CEIL - 2, 8, Math.PI, 0); c.fill(); }
  c.fillStyle = GOLD; c.fillRect(0, CEIL - 2, BAY, 4);
  c.fillStyle = SGOLD; c.fillRect(0, CEIL - 2, BAY, 1.2);
  c.fillStyle = SGOLD;
  for (let x = 40; x < BAY; x += 80) { star(c, x, 12, 4.5, -Math.PI / 2); c.fill(); }
  // พวงผ้าชมพูใต้คิ้ว
  c.strokeStyle = PINK; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(24, CEIL + 4); c.quadraticCurveTo(BAY / 2, CEIL + 34, BAY - 24, CEIL + 4); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(30, CEIL + 3); c.quadraticCurveTo(BAY / 2, CEIL + 30, BAY - 30, CEIL + 3); c.stroke();
  for (const x of [24, BAY - 24]) { c.fillStyle = GOLD; c.beginPath(); c.arc(x, CEIL + 4, 4.5, 0, TAU); c.fill(); }
  // บัวผนัง (ม่วงอ่อน ขอบทอง) + ลายมงกุฎ/หัวใจสลับในแผง
  c.fillStyle = lg(c, 0, WAIN, 0, WALL_B, [[0, '#C9ADEE'], [1, '#BC9BE6']]);
  c.fillRect(0, WAIN, BAY, WALL_B - WAIN);
  c.fillStyle = GOLD; c.fillRect(0, WAIN - 3, BAY, 5);
  c.fillStyle = SGOLD; c.fillRect(0, WAIN - 3, BAY, 1.4);
  for (let j = 0, x = 34; x + 150 <= BAY - 20; j++, x += 176) {
    // แผงลึก: เงาขอบบน-ซ้าย · ไฮไลต์ขอบล่าง-ขวา · กรอบขาวบางด้านใน
    c.fillStyle = 'rgba(105,65,160,.2)'; c.beginPath(); c.roundRect(x, WAIN + 11, 150, 36, 8); c.fill();
    c.fillStyle = lg(c, 0, WAIN + 12, 0, WAIN + 47, [[0, '#C3A4EC'], [1, '#D2B9F2']]);
    c.beginPath(); c.roundRect(x + 1.4, WAIN + 12.8, 148.6, 34.2, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.62)'; c.lineWidth = 1.2;
    c.beginPath(); c.roundRect(x + 4.5, WAIN + 16, 141, 27.5, 5.5); c.stroke();
    if ((i + j) % 2) crownIcon(c, x + 75, WAIN + 36, 0.55);
    else { c.fillStyle = 'rgba(255,255,255,.6)'; heart(c, x + 75, WAIN + 30, 6); c.fill(); }
  }
  c.fillStyle = 'rgba(110,70,160,.2)'; c.fillRect(0, WALL_B - 5, BAY, 5);

  const cx = BAY / 2;
  if (kind === 'win') archWindow(c, cx, WIN, i * 0.37);
  else if (kind === 'grand') {
    // หน้าต่างใหญ่ (หลังน้ำพุชั้น 1 / หลังโซฟาชั้น 2) + ผ้าม่านหรูชมพู
    archWindow(c, cx, GRAND, 0.5, true);
    drapes(c, cx, GRAND);
  } else if (kind === 'banner') {
    const bw = 76, by = CEIL + 14, bh = 136, bx = cx - bw / 2;   // สั้นพอไม่ชนหูตู้จดหมายข้างล่าง
    rr(c, bx - 10, by - 6, bw + 20, 8, 4, GOLD);
    c.fillStyle = lg(c, bx, 0, bx + bw, 0, [[0, '#8E66CF'], [0.5, SPUR], [1, '#8E66CF']]);
    c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + bw, by); c.lineTo(bx + bw, by + bh); c.lineTo(cx, by + bh - 24); c.lineTo(bx, by + bh); c.closePath(); c.fill();
    c.strokeStyle = GOLD; c.lineWidth = 3;
    c.beginPath(); c.moveTo(bx + 6, by + 4); c.lineTo(bx + 6, by + bh - 12); c.moveTo(bx + bw - 6, by + 4); c.lineTo(bx + bw - 6, by + bh - 12); c.stroke();
    c.fillStyle = CREAM; c.beginPath(); c.arc(cx, by + 70, 24, 0, TAU); c.fill();
    c.strokeStyle = GOLD; c.lineWidth = 2.5; c.stroke();
    pawIcon(c, cx, by + 72, 2, '#FF8FB3');
    crownIcon(c, cx, by + 40, 0.9);
  } else if (kind === 'welcome') {
    // ริบบิ้นต้อนรับเหนือเคาน์เตอร์: แถบครีมโค้ง ขอบทอง ปลายพับชมพูหางแฉก (ตัวหนังสือวาดสดใน drawCounter)
    const ry = 124, rh = 30, hw = 94, sag = 14;
    for (const d of [-1, 1]) {
      const ex = cx + d * hw;
      c.fillStyle = lg(c, ex, 0, ex + d * 40, 0, [[0, '#E27FAE'], [1, '#F29CC6']]);
      c.beginPath(); c.moveTo(ex - d * 6, ry + 6); c.lineTo(ex + d * 24, ry + 6); c.lineTo(ex + d * 15, ry + 6 + rh / 2); c.lineTo(ex + d * 24, ry + 6 + rh); c.lineTo(ex - d * 6, ry + 6 + rh); c.closePath(); c.fill();
      c.fillStyle = '#B85A88'; c.beginPath(); c.moveTo(ex, ry + rh); c.lineTo(ex - d * 6, ry + 6 + rh); c.lineTo(ex, ry + 6 + rh); c.closePath(); c.fill();
    }
    const band = (inset) => {
      c.beginPath();
      c.moveTo(cx - hw + inset, ry + inset); c.quadraticCurveTo(cx, ry - sag * 2 + inset, cx + hw - inset, ry + inset);
      c.lineTo(cx + hw - inset, ry + rh - inset); c.quadraticCurveTo(cx, ry + rh - sag * 2 - inset, cx - hw + inset, ry + rh - inset); c.closePath();
    };
    c.fillStyle = goldV(c, ry - sag, ry + rh); band(0); c.fill();
    c.fillStyle = lg(c, 0, ry - sag, 0, ry + rh, [[0, '#FFFFFF'], [1, '#FFEFF4']]); band(3); c.fill();
    c.strokeStyle = 'rgba(235,198,111,.7)'; c.lineWidth = 1; c.setLineDash([3, 3]); band(6); c.stroke(); c.setLineDash([]);
    crownIcon(c, cx, ry - sag - 2, 0.9);
    for (const d of [-1, 1]) { c.fillStyle = SGOLD; star(c, cx + d * 74, ry + rh / 2 - 3, 4.6, -Math.PI / 2); c.fill(); }
  } else if (kind === 'paint') {
    // ภาพเหมือนเจ้าหญิงแมวในกรอบทองโค้ง (ผู้ใช้ 8 พ.ย. วาดหน้าแมวใหม่): พื้นหลังไล่ชมพู-ม่วง ฟองหัวใจจาง ๆ · มงกุฎวางบนหัว
    const fy = 62, fw = 100, fh = 106;   // ล่างสุด 168 — เหนือยอดเต็นท์ชั้น 2
    c.fillStyle = 'rgba(90,50,140,.14)'; c.beginPath(); c.roundRect(cx - fw / 2 + 4, fy + 5, fw, fh, 16); c.fill();
    c.fillStyle = goldV(c, fy, fy + fh); c.beginPath(); c.roundRect(cx - fw / 2, fy, fw, fh, 16); c.fill();
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.roundRect(cx - fw / 2 + 3, fy + 3, fw - 6, 3, 1.5); c.fill();
    // ลายมุมกรอบ (ม้วนทอง)
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      c.fillStyle = SGOLD; c.beginPath(); c.arc(cx + dx * (fw / 2 - 5), (dy < 0 ? fy + 5 : fy + fh - 5), 4, 0, TAU); c.fill();
    }
    const ix = cx - fw / 2 + 8, iy = fy + 8, iw = fw - 16, ih = fh - 16;
    c.save(); c.beginPath(); c.roundRect(ix, iy, iw, ih, 10); c.clip();
    c.fillStyle = lg(c, 0, iy, 0, iy + ih, [[0, '#FFE6F1'], [0.6, '#F4E2FB'], [1, '#E6D4F7']]); c.fillRect(ix, iy, iw, ih);
    for (const [hx, hy, hr] of [[0.18, 0.2, 5], [0.84, 0.3, 4], [0.12, 0.62, 3.5], [0.88, 0.7, 5]]) { c.fillStyle = 'rgba(255,255,255,.55)'; heart(c, ix + iw * hx, iy + ih * hy, hr); c.fill(); }
    const g = c.createRadialGradient(cx, iy + ih * 0.45, 4, cx, iy + ih * 0.45, 44);
    g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(ix, iy, iw, ih);
    catPortrait(c, cx, iy + ih * 0.5, 17, i % 2 ? '#FFFFFF' : '#FFDDB8');
    c.restore();
    // ป้ายชื่อทองเล็กใต้รูป
    c.fillStyle = goldV(c, fy + fh - 4, fy + fh + 8); c.beginPath(); c.roundRect(cx - 18, fy + fh - 4, 36, 10, 5); c.fill();
    c.fillStyle = '#FF8FB3'; heart(c, cx, fy + fh + 1, 3); c.fill();
  } else if (kind === 'clock') {
    // นาฬิกาติดผนังหน้าแมว (เข็มวาดสดตามเวลาจริง — lounge)
    const cy = 120;
    c.fillStyle = SPUR;
    c.beginPath(); c.moveTo(cx - 38, cy - 22); c.lineTo(cx - 30, cy - 52); c.lineTo(cx - 12, cy - 38); c.fill();
    c.beginPath(); c.moveTo(cx + 38, cy - 22); c.lineTo(cx + 30, cy - 52); c.lineTo(cx + 12, cy - 38); c.fill();
    c.fillStyle = goldV(c, cy - 44, cy + 44); c.beginPath(); c.arc(cx, cy, 44, 0, TAU); c.fill();
    c.fillStyle = CREAM; c.beginPath(); c.arc(cx, cy, 37, 0, TAU); c.fill();
    for (let h = 0; h < 12; h++) {
      const a = h / 12 * TAU, r = h % 3 ? 31 : 29;
      c.fillStyle = h % 3 ? LAV : PINK; c.beginPath(); c.arc(cx + Math.sin(a) * r, cy - Math.cos(a) * r, h % 3 ? 2 : 3.4, 0, TAU); c.fill();
    }
    pawIcon(c, cx, cy + 18, 0.8, 'rgba(245,169,208,.7)');
  } else if (kind !== 'door') {
    c.fillStyle = CREAM; c.beginPath(); c.arc(cx, CEIL + 34, 13, 0, TAU); c.fill();
    c.strokeStyle = GOLD; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#FF8FB3'; heart(c, cx, CEIL + 35, 6); c.fill();
  }
}
/** เสาสีครีมประดับทอง (กลางเสา x = 0) */
export function drawPillar(c) {
  const w = 40, top = CEIL - 4;
  c.fillStyle = 'rgba(90,50,140,.12)'; c.fillRect(w / 2 - 2, top, 10, WALL_B - top);
  c.fillStyle = lg(c, -w / 2, 0, w / 2, 0, [[0, '#F1E4DA'], [0.35, '#FFFFFF'], [0.7, CREAM], [1, '#E9D9CF']]);
  c.fillRect(-w / 2, top + 18, w, WALL_B - top - 40);
  c.strokeStyle = 'rgba(201,155,62,.35)'; c.lineWidth = 1.2;
  for (const dx of [-10, 0, 10]) { c.beginPath(); c.moveTo(dx, top + 22); c.lineTo(dx, WALL_B - 26); c.stroke(); }
  c.fillStyle = goldV(c, top, top + 20);
  c.beginPath(); c.roundRect(-w / 2 - 8, top, w + 16, 10, 3); c.fill();
  c.beginPath(); c.roundRect(-w / 2 - 3, top + 9, w + 6, 10, 3); c.fill();
  c.fillStyle = '#FF8FB3'; heart(c, 0, top + 14, 3.4); c.fill();
  c.fillStyle = goldV(c, WALL_B - 24, WALL_B);
  c.beginPath(); c.roundRect(-w / 2 - 4, WALL_B - 24, w + 8, 10, 3); c.fill();
  c.beginPath(); c.roundRect(-w / 2 - 9, WALL_B - 14, w + 18, 14, 3); c.fill();
}

// ── พื้นชมพูลายอุ้งเท้า (หน้าตรง ไม่มี perspective — แถวสูงเท่ากัน) ─────────
const TILE = 52, ROW = 26;
function drawFloor(c, camX, vw) {
  drawFloorSegs(c, camX, vw, 'hall:floor', HW, floorRange);
}
/** กระเบื้องชมพูมน ขอบนูน (ร่องยาแนว + ไฮไลต์บน + เงาล่าง) ลายอุ้งเท้า/หัวใจ */
function floorRange(c, x0, x1) {
  c.fillStyle = '#EFC6DB'; c.fillRect(x0, WALL_B, x1 - x0, H - WALL_B + 2);
  // ขอบบัวพื้นครีม + เส้นทอง
  c.fillStyle = CREAM; c.fillRect(x0, WALL_B, x1 - x0, 6);
  c.fillStyle = GOLD; c.fillRect(x0, WALL_B + 6, x1 - x0, 2);
  for (let r = 0, y = WALL_B + 8; y < H + 2; r++, y += ROW) {
    const off = (r % 2) * TILE / 2;
    for (let x = Math.floor((x0 - TILE - off) / TILE) * TILE + off; x < x1 + TILE; x += TILE) {
      const n = Math.round((x - off) / TILE), alt = (n + r) % 2;
      c.fillStyle = lg(c, 0, y, 0, y + ROW, alt ? [[0, '#F9CFE4'], [1, '#F3BDD8']] : [[0, '#FDE6F2'], [1, '#F8D4E7']]);
      c.beginPath(); c.roundRect(x + 1.2, y + 1.2, TILE - 2.4, ROW - 2.4, 5); c.fill();
      c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.roundRect(x + 6, y + 2.6, TILE - 12, 1.7, 0.85); c.fill();
      c.fillStyle = 'rgba(205,120,170,.16)'; c.beginPath(); c.roundRect(x + 6, y + ROW - 3.8, TILE - 12, 1.4, 0.7); c.fill();
      if (!alt && (n * 7 + r * 3) % 3 === 0) pawIcon(c, x + TILE / 2, y + ROW / 2 - 1.5, 1.1, 'rgba(240,150,196,.7)');
      else if ((n * 5 + r) % 7 === 0) { c.fillStyle = 'rgba(255,255,255,.65)'; heart(c, x + TILE / 2, y + ROW / 2, 4); c.fill(); }
    }
  }
  // ลานกระเบื้องวงรีหน้าน้ำพุ (ครีมขอบทอง ลายหัวใจรอบวง)
  const fx = X.fount;
  if (fx + 240 > x0 && fx - 240 < x1) {
    c.fillStyle = 'rgba(205,120,170,.16)'; c.beginPath(); c.ellipse(fx, GY + 14, 236, 26, 0, 0, TAU); c.fill();
    c.fillStyle = lg(c, 0, GY - 10, 0, GY + 38, [[0, '#FFF6FA'], [1, '#FBE1EE']]); c.beginPath(); c.ellipse(fx, GY + 12, 230, 24, 0, 0, TAU); c.fill();
    c.strokeStyle = GOLD; c.lineWidth = 2; c.beginPath(); c.ellipse(fx, GY + 12, 222, 21, 0, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(235,198,111,.55)'; c.lineWidth = 1; c.beginPath(); c.ellipse(fx, GY + 12, 170, 15, 0, 0, TAU); c.stroke();
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU, hx = fx + Math.cos(a) * 196, hy = GY + 12 + Math.sin(a) * 18;
      if (hy < GY + 2) continue;
      c.fillStyle = k % 2 ? 'rgba(245,169,208,.8)' : 'rgba(235,198,111,.8)'; heart(c, hx, hy, 3.4); c.fill();
    }
  }
  // เงาสะท้อนเสาบนพื้นมัน
  for (let i = Math.floor(x0 / BAY); i <= Math.ceil(x1 / BAY); i++) {
    c.fillStyle = lg(c, 0, WALL_B, 0, H, [[0, 'rgba(255,255,255,.3)'], [0.7, 'rgba(255,255,255,0)']]);
    c.fillRect(i * BAY - 14, WALL_B + 8, 28, H - WALL_B);
  }
}

function drawWalls(c, camX, vw) {
  const i0 = Math.max(0, Math.floor((camX - 40) / BAY)), i1 = Math.min(NB - 1, Math.floor((camX + vw + 40) / BAY));
  for (let i = i0; i <= i1; i++) {
    c.save(); c.translate(i * BAY, 0);
    // ผนังแบบเดียวกันที่ลายบัวสลับต่างกัน → แคชแยกตามความเป็นคู่/คี่
    cached(c, 'hall:bay:' + BAYS[i] + ':' + (i % 2) + bayKey(BAYS[i]), 0, 0, BAY, WALL_B, (g) => drawBay(g, BAYS[i], i));
    c.restore();
  }
  for (let i = i0; i <= i1 + 1; i++) {
    c.save(); c.translate(i * BAY, 0);
    shaded(c, 'hall:pillar', -40, CEIL - 6, 80, WALL_B - CEIL + 8, drawPillar);
    c.restore();
  }
}
/** แสงแดดจากหน้าต่างใหญ่หลังน้ำพุ (จุดเด่นจุดเดียว) + ฝุ่นแสง */
/** สีลำแสงจากหน้าต่างใหญ่ตามเวลา: แดดอุ่น (กลางวัน) · แสงส้มชมพู (เย็น) · แสงจันทร์ฟ้าจาง (กลางคืน) */
export function shaftColors() {
  const S = sky(), a = 0.3 * S.day + 0.26 * S.dusk + 0.16 * S.night;
  const r = Math.round(255 * S.day + 255 * S.dusk + 200 * S.night), g = Math.round(246 * S.day + 214 * S.dusk + 214 * S.night), b = Math.round(214 * S.day + 190 * S.dusk + 255 * S.night);
  return [`rgba(${r},${g},${b},${a.toFixed(3)})`, `rgba(${r},${g},${b},${(a * 0.5).toFixed(3)})`, `rgba(${r},${g},${b},0)`];
}
function drawShaft(c, camX, vw, t) {
  const cx = X.fount;
  if (cx < camX - 320 || cx > camX + vw + 320) return;
  c.save();
  c.globalAlpha = 0.8 + 0.2 * Math.sin(t * 0.012);
  const [s0, s1, s2] = shaftColors();
  c.fillStyle = lg(c, 0, GRAND.top + 60, 0, H, [[0, s0], [0.6, s1], [1, s2]]);
  c.beginPath();
  c.moveTo(cx - GRAND.w / 2 + 8, GRAND.top + 70); c.lineTo(cx + GRAND.w / 2 - 8, GRAND.top + 70);
  c.lineTo(cx + GRAND.w / 2 - 120, H); c.lineTo(cx - GRAND.w / 2 - 190, H); c.closePath(); c.fill();
  c.restore();
  for (let j = 0; j < 9; j++) {
    const p = (t * 0.003 + hash(j)) % 1;
    const y = GRAND.top + 80 + (H - GRAND.top - 100) * ((hash(j * 3.1) + p * 0.35) % 1);
    const x = cx - 40 - (y - GRAND.top) * 0.55 + Math.sin(t * 0.02 + j) * 10 + (hash(j * 2) - 0.5) * 110;
    const tw = Math.sin(t * 0.05 + j * 1.7) * 0.5 + 0.5;
    c.globalAlpha = 0.25 + tw * 0.55; c.fillStyle = '#FFFFFF';
    c.beginPath(); c.arc(x, y, 1.2 + tw, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
}
/**
 * โคมระย้าคริสตัลหรู (ผู้ใช้ 8 พ.ย. "วาดโคมไฟติดเพดานใหม่ให้สวยงามหรูหรา") — ใช้ทุกชั้นในปราสาท
 *   ฝาครอบทองติดเพดาน → โซ่ → มงกุฎทองหูแมว → ก้านทองทรงแจกัน (ลูกแก้วชมพู + เหรียญหน้าแมว)
 *   → เทียนสองชั้น (บน 2 · ล่าง 4) บนจานทองปลายแขนม้วน → สายลูกปัดคริสตัลโค้งระหว่างแขน
 *   → แท่งคริสตัลห้อยรอบวง + พวงกลางปลายหัวใจคริสตัลชมพู
 * ตัวโคมแคชเป็นภาพ (ต่อสเกล) · เปลวเทียนไหว + ประกายคริสตัล + แสงฟุ้งวาดสด · s = ขนาด · glow = ความสว่าง (กลางคืนสว่างขึ้น)
 */
const LUX_CANDLES = [[-48, 58], [-24, 64], [24, 64], [48, 58], [-20, 34], [20, 34]];
const LUX_GLINTS = [[-46, 102], [-23, 108], [0, 124], [23, 108], [46, 102], [0, 82], [-34, 76], [34, 76], [-11, 112], [11, 112]];
export function chandelier(c, x, t, i, s = 1, glow = 1) {
  const y0 = CEIL - 6, gy = y0 + 66 * s;
  const g = c.createRadialGradient(x, gy, 4, x, gy, 120 * s);
  g.addColorStop(0, `rgba(255,238,196,${(0.46 * glow).toFixed(3)})`); g.addColorStop(0.5, `rgba(255,228,214,${(0.16 * glow).toFixed(3)})`); g.addColorStop(1, 'rgba(255,236,200,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, gy, 120 * s, 0, TAU); c.fill();
  c.save();
  c.translate(x, y0); c.rotate(Math.sin(t * 0.017 + i * 1.3) * 0.016); c.scale(s, s);
  cached(c, 'lux:chand', -64, -4, 128, 146, luxChandArt);
  // เปลวเทียน (ไหวคนละจังหวะ) + แสงรอบเปลว
  for (const [j, [cx, cy]] of LUX_CANDLES.entries()) {
    const f = 1 + Math.sin(t * 0.31 + j * 1.7) * 0.14 + Math.sin(t * 0.77 + j) * 0.06, sw = Math.sin(t * 0.21 + j * 2.3) * 0.6;
    const hg = c.createRadialGradient(cx, cy - 6, 0.5, cx, cy - 6, 9);
    hg.addColorStop(0, 'rgba(255,226,150,.65)'); hg.addColorStop(1, 'rgba(255,226,150,0)');
    c.fillStyle = hg; c.beginPath(); c.arc(cx, cy - 6, 9, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,200,110,.95)';
    c.beginPath(); c.moveTo(cx - 2.6, cy - 2); c.quadraticCurveTo(cx - 2.8, cy - 6 * f, cx + sw, cy - 10.5 * f); c.quadraticCurveTo(cx + 2.8, cy - 6 * f, cx + 2.6, cy - 2); c.closePath(); c.fill();
    c.fillStyle = '#FFFBEA'; c.beginPath(); c.ellipse(cx, cy - 4, 1.1, 2.6 * f, 0, 0, TAU); c.fill();
  }
  // ประกายบนคริสตัล (วิบทีละเม็ด)
  for (const [j, [gx, gyy]] of LUX_GLINTS.entries()) {
    const tw = Math.sin(t * 0.045 + j * 2.4);
    if (tw < 0.55) continue;
    c.globalAlpha = (tw - 0.55) / 0.45;
    c.fillStyle = '#FFFFFF'; star(c, gx, gyy, 4.5, t * 0.02 + j); c.fill();
    c.globalAlpha = 1;
  }
  c.restore();
}
/** ตัวโคม (ภาพนิ่ง · จุดแขวน 0,0 = ขอบเพดาน) */
function luxChandArt(c) {
  const gold = (y0, y1) => lg(c, 0, y0, 0, y1, [[0, '#FFF0B8'], [0.45, GOLD], [1, GOLD_D]]);
  const goldH = (x0, x1) => lg(c, x0, 0, x1, 0, [[0, GOLD_D], [0.4, '#FFF0B8'], [0.6, GOLD], [1, GOLD_D]]);
  // ฝาครอบเพดาน (ดอกกุหลาบทอง)
  c.fillStyle = gold(-2, 9); c.beginPath(); c.ellipse(0, 3, 17, 6, 0, 0, Math.PI); c.fill();
  c.beginPath(); c.ellipse(0, 3, 17, 2.5, 0, 0, TAU); c.fill();
  c.fillStyle = gold(6, 12); c.beginPath(); c.arc(0, 9, 3.4, 0, TAU); c.fill();
  // โซ่ (ห่วงสลับมุม)
  c.lineWidth = 1.5;
  for (let y = 12, k = 0; y < 26; y += 4.4, k++) {
    c.strokeStyle = k % 2 ? GOLD_D : GOLD;
    c.beginPath(); c.ellipse(0, y + 2, k % 2 ? 0.8 : 1.8, 2.6, 0, 0, TAU); c.stroke();
  }
  // สายลูกปัดคริสตัลด้านหลัง (ชั้นบน)
  const beads = (x0, y0, x1, y1, sag, n, r, back = false) => {
    for (let k = 0; k <= n; k++) {
      const u = k / n, bx = x0 + (x1 - x0) * u, by = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * sag;
      c.fillStyle = back ? 'rgba(214,200,255,.75)' : ['#FFFFFF', '#F9C4DD', '#D6C8FF'][k % 3];
      c.beginPath(); c.arc(bx, by, r, 0, TAU); c.fill();
      if (!back && k % 2 === 0) { c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.arc(bx - r * 0.35, by - r * 0.35, r * 0.38, 0, TAU); c.fill(); }
    }
  };
  beads(-48, 60, 48, 60, 26, 26, 1.3, true);
  // ห่วงวงทองชั้นล่าง (ครึ่งหลังจาง)
  c.strokeStyle = 'rgba(201,155,62,.55)'; c.lineWidth = 2;
  c.beginPath(); c.ellipse(0, 86, 50, 8, 0, Math.PI, TAU); c.stroke();
  // แขนม้วนชั้นล่าง: จากก้าน → ม้วนออก → จานเทียน (ปลายขดก้นหอยใต้จาน)
  c.lineCap = 'round';
  for (const [cx, cy] of LUX_CANDLES.slice(0, 4)) {
    const d = Math.sign(cx);
    c.strokeStyle = GOLD_D; c.lineWidth = 4;
    c.beginPath(); c.moveTo(d * 4, 90); c.bezierCurveTo(d * 18, 100, cx - d * 2, 96, cx, cy + 6); c.stroke();
    c.strokeStyle = '#FFE7A0'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(d * 4, 89); c.bezierCurveTo(d * 18, 98.5, cx - d * 2, 94.5, cx - d * 0.6, cy + 6); c.stroke();
    c.strokeStyle = GOLD; c.lineWidth = 2;
    c.beginPath(); c.arc(cx + d * 4, cy + 14, 3.6, d > 0 ? -Math.PI * 0.6 : Math.PI * 1.6, d > 0 ? Math.PI * 0.9 : Math.PI * 0.1, d < 0); c.stroke();
  }
  // ก้านทองทรงแจกัน
  c.fillStyle = goldH(-14, 14);
  c.beginPath();
  c.moveTo(-3, 36); c.quadraticCurveTo(-9, 44, -5, 52); c.quadraticCurveTo(-2, 56, -4, 60);
  c.quadraticCurveTo(-15, 70, -12, 82); c.quadraticCurveTo(-8, 92, -3, 96); c.lineTo(-2, 104);
  c.lineTo(2, 104); c.lineTo(3, 96); c.quadraticCurveTo(8, 92, 12, 82); c.quadraticCurveTo(15, 70, 4, 60);
  c.quadraticCurveTo(2, 56, 5, 52); c.quadraticCurveTo(9, 44, 3, 36); c.closePath(); c.fill();
  // ลูกแก้วชมพูกลางก้าน + เหรียญหน้าแมว
  const pg = c.createRadialGradient(-3, 70, 1, 0, 73, 9);
  pg.addColorStop(0, '#FFE6F1'); pg.addColorStop(0.6, '#F59AC2'); pg.addColorStop(1, '#D9659C');
  c.fillStyle = pg; c.beginPath(); c.arc(0, 73, 8.5, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(-3, 69.5, 2.4, 1.4, -0.5, 0, TAU); c.fill();
  c.fillStyle = gold(40, 52);
  c.beginPath(); c.moveTo(-6, 46); c.lineTo(-5, 39); c.lineTo(-1.5, 43); c.lineTo(1.5, 43); c.lineTo(5, 39); c.lineTo(6, 46); c.arc(0, 47, 6, 0, Math.PI); c.closePath(); c.fill();
  c.fillStyle = '#FFF4F0'; c.beginPath(); c.arc(0, 47.5, 3.6, 0, TAU); c.fill();
  c.fillStyle = '#FF8FB3'; heart(c, 0, 48, 2.2); c.fill();
  // มงกุฎทองบนสุด (ยอดหูแมวสองข้าง + เพชรชมพู)
  c.fillStyle = gold(24, 37);
  c.beginPath(); c.moveTo(-11, 37); c.lineTo(-12, 27); c.lineTo(-6, 31); c.lineTo(0, 24); c.lineTo(6, 31); c.lineTo(12, 27); c.lineTo(11, 37); c.closePath(); c.fill();
  c.fillStyle = '#FF8FB3'; c.beginPath(); c.arc(0, 32, 1.8, 0, TAU); c.fill();
  for (const dx of [-12, 12]) { c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(dx, 27, 1.3, 0, TAU); c.fill(); }
  // แขนเล็กชั้นบน
  for (const [cx, cy] of LUX_CANDLES.slice(4)) {
    const d = Math.sign(cx);
    c.strokeStyle = GOLD_D; c.lineWidth = 3;
    c.beginPath(); c.moveTo(d * 5, 56); c.bezierCurveTo(d * 12, 62, cx, 54, cx, cy + 6); c.stroke();
    c.strokeStyle = '#FFE7A0'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(d * 5, 55); c.bezierCurveTo(d * 12, 61, cx - d * 0.6, 53, cx - d * 0.6, cy + 6); c.stroke();
  }
  // จานเทียน + เทียน + หยดคริสตัลใต้จาน
  for (const [cx, cy] of LUX_CANDLES) {
    const big = cy > 50;
    c.fillStyle = gold(cy + 4, cy + 9); c.beginPath(); c.ellipse(cx, cy + 6, big ? 7 : 5.5, 2.4, 0, 0, TAU); c.fill();
    c.fillStyle = lg(c, cx - 3, 0, cx + 3, 0, [[0, '#F3E7DE'], [0.45, '#FFFFFF'], [1, '#EADBD0']]);
    c.beginPath(); c.roundRect(cx - 2.6, cy - 4, 5.2, 10, 1.2); c.fill();
    c.fillStyle = 'rgba(255,240,230,.9)'; c.beginPath(); c.ellipse(cx, cy - 4, 2.6, 1, 0, 0, TAU); c.fill();
    if (big) prism(c, cx, cy + 9, 9);
  }
  // สายลูกปัดคริสตัลด้านหน้า (โค้งระหว่างจานเทียนชั้นล่าง)
  beads(-48, 66, -24, 72, 9, 7, 1.5);
  beads(-24, 72, 24, 72, 15, 13, 1.6);
  beads(24, 72, 48, 66, 9, 7, 1.5);
  beads(-20, 42, 20, 42, 10, 9, 1.3);
  // ห่วงวงทองหน้า + แท่งคริสตัลห้อยรอบวง
  c.strokeStyle = gold(80, 94); c.lineWidth = 3;
  c.beginPath(); c.ellipse(0, 86, 50, 8, 0, 0, Math.PI); c.stroke();
  c.strokeStyle = 'rgba(255,248,214,.9)'; c.lineWidth = 1;
  c.beginPath(); c.ellipse(0, 85, 50, 8, 0, 0.15, Math.PI - 0.15); c.stroke();
  // ม่านคริสตัลรอบวง (แท่งยาว/สั้นสลับ — ยาวสุดตรงกลาง)
  for (let k = -4; k <= 4; k++) {
    if (!k) continue;   // กลางวง = พวงหัวใจคริสตัล
    const px = k * 11.5, py = 86 + Math.sqrt(Math.max(0, 1 - (px / 50) ** 2)) * 8;
    c.strokeStyle = 'rgba(214,200,255,.95)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + 4); c.stroke();
    prism(c, px, py + 4, (k % 2 ? 10 : 16) + (4 - Math.abs(k)) * 1.2);
  }
  // พวงกลาง: ลูกปัด → ลูกแก้วเหลี่ยม → หัวใจคริสตัลชมพู
  for (let k = 0; k < 4; k++) { c.fillStyle = k % 2 ? '#FBE3F0' : '#FFFFFF'; c.beginPath(); c.arc(0, 106 + k * 3.6, 1.6, 0, TAU); c.fill(); }
  const bg = c.createRadialGradient(-1.5, 120, 0.5, 0, 122, 6);
  bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(0.7, '#E6DCFF'); bg.addColorStop(1, '#B9A6EE');
  c.fillStyle = bg; c.beginPath(); c.moveTo(0, 115); c.lineTo(5.5, 121); c.lineTo(0, 128); c.lineTo(-5.5, 121); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-5.5, 121); c.lineTo(5.5, 121); c.moveTo(0, 115); c.lineTo(0, 128); c.stroke();
  const hg = c.createLinearGradient(0, 129, 0, 140);
  hg.addColorStop(0, '#FFC2DD'); hg.addColorStop(1, '#F07FB2');
  c.fillStyle = hg; heart(c, 0, 135, 5.5); c.fill();
  c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(-1.8, 132.5, 1.2, 0, TAU); c.fill();
}
/** แท่งคริสตัลหยดน้ำห้อย (ยอดที่ x,y ยาว L) */
function prism(c, x, y, L) {
  const g = c.createLinearGradient(x - 3, y, x + 3, y + L);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, '#DCD0FF'); g.addColorStop(1, '#A58FE6');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 3.8, y + L * 0.55, x, y + L); c.quadraticCurveTo(x - 3.8, y + L * 0.55, x, y); c.fill();
  // เหลี่ยมเพชร: ซีกขวาเข้ม · แสงวาวซีกซ้าย
  c.fillStyle = 'rgba(120,90,200,.28)';
  c.beginPath(); c.moveTo(x, y + 1); c.quadraticCurveTo(x + 3.8, y + L * 0.55, x, y + L); c.lineTo(x + 0.4, y + L * 0.5); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.ellipse(x - 1, y + L * 0.42, 0.8, L * 0.18, 0, 0, TAU); c.fill();
}

// ── Interactive / Furniture / Decoration ─────────────────────────
/** 1. ประตูทางเข้า-ออกทรงโค้ง — ปิดอยู่ (ผู้ใช้ 8 พ.ย. "ปิดประตูลง ไม่ต้องเปิดค้าง"): บานคู่ม่วงลูกฟักทอง ห่วงเคาะอุ้งเท้า หน้าต่างกระจกสีครึ่งวงกลมด้านบน พรมหน้าประตู */
function drawDoor(c, t) {
  shaded(c, 'hall:door:v2', X.door - 110, GY - 282, 220, GY + 2 - (GY - 282), drawDoorArt);
  label(c, X.door, GY - 194, 'ทางออก', 'rgba(255,255,255,.92)', SPUR, 12);
}
function drawDoorArt(c) {
  const cx = X.door, x0 = cx - 85, x1 = cx + 85, top = GY - 240, bot = WALL_B + 2, ty = top + 85;
  c.save(); c.beginPath(); archPath(c, x0, x1, top, bot); c.clip();
  // กระจกสีครึ่งวงกลม (รัศมีแสงชมพู ม่วง ทอง)
  c.fillStyle = '#E8D6F5'; c.fillRect(x0, top, x1 - x0, ty - top);
  const cols = ['#FFC4DA', '#E3D2FA', '#FFE9A8', '#CDE8FF', '#FFC4DA', '#E3D2FA', '#FFE9A8'];
  for (let k = 0; k < 7; k++) {
    const a0 = Math.PI + (k / 7) * Math.PI, a1 = Math.PI + ((k + 1) / 7) * Math.PI;
    c.fillStyle = cols[k]; c.beginPath(); c.moveTo(cx, ty); c.arc(cx, ty, 90, a0, a1); c.closePath(); c.fill();
  }
  c.strokeStyle = GOLD; c.lineWidth = 2;
  for (let k = 1; k < 7; k++) { const a = Math.PI + (k / 7) * Math.PI; c.beginPath(); c.moveTo(cx, ty); c.lineTo(cx + Math.cos(a) * 90, ty + Math.sin(a) * 90); c.stroke(); }
  c.beginPath(); c.arc(cx, ty, 52, Math.PI, 0); c.stroke();
  c.fillStyle = CREAM; c.beginPath(); c.arc(cx, ty, 22, Math.PI, 0); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 2.4; c.beginPath(); c.arc(cx, ty, 22, Math.PI, 0); c.stroke();
  c.fillStyle = '#FF8FB3'; heart(c, cx, ty - 9, 6); c.fill();
  c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.moveTo(x0 + 20, ty); c.lineTo(x0 + 60, top + 14); c.lineTo(x0 + 74, top + 10); c.lineTo(x0 + 34, ty); c.fill();
  // บานประตูคู่ (ใต้กระจกสี)
  for (const d of [-1, 1]) {
    const ex = cx + d * 85, lx0 = Math.min(cx, ex), lw = 85;
    c.fillStyle = lg(c, lx0, 0, lx0 + lw, 0, d < 0 ? [[0, '#7A4EC0'], [1, '#A47BDC']] : [[0, '#A47BDC'], [1, '#7A4EC0']]);
    c.fillRect(lx0, ty, lw, bot - ty);
    for (const [py, ph] of [[ty + 16, 70], [ty + 98, bot - ty - 114]]) {
      const px = lx0 + 13, pwid = lw - 26;
      c.fillStyle = 'rgba(60,30,110,.25)'; c.beginPath(); c.roundRect(px, py, pwid, ph, 8); c.fill();
      c.fillStyle = lg(c, 0, py, 0, py + ph, [[0, '#B48AE6'], [1, '#956BD0']]); c.beginPath(); c.roundRect(px + 2, py + 2, pwid - 4, ph - 4, 7); c.fill();
      c.strokeStyle = 'rgba(235,198,111,.9)'; c.lineWidth = 1.4; c.beginPath(); c.roundRect(px + 5, py + 5, pwid - 10, ph - 10, 5); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.roundRect(px + 6, py + 5, pwid - 12, 3, 1.5); c.fill();
    }
    pawIcon(c, lx0 + lw / 2, ty + 51, 1.3, 'rgba(247,222,156,.85)');
    for (let y = ty + 10; y < bot - 6; y += 22) { c.fillStyle = GOLD; c.beginPath(); c.arc(lx0 + (d < 0 ? 5 : lw - 5), y, 1.8, 0, TAU); c.fill(); }
    // ห่วงเคาะทองใกล้รอยต่อ
    const hx = cx + d * 13, hy = ty + 96;
    c.fillStyle = goldV(c, hy - 6, hy + 2); c.beginPath(); c.arc(hx, hy - 4, 4, 0, TAU); c.fill();
    c.strokeStyle = GOLD; c.lineWidth = 2.6; c.beginPath(); c.arc(hx, hy + 6, 7, 0, TAU); c.stroke();
    c.strokeStyle = '#FFF0C0'; c.lineWidth = 0.9; c.beginPath(); c.arc(hx, hy + 6, 7, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
  }
  c.fillStyle = goldV(c, ty, bot); c.fillRect(cx - 2, ty, 4, bot - ty);
  rr(c, x0, ty - 4, x1 - x0, 8, 3, GOLD);
  c.fillStyle = SGOLD; c.fillRect(x0, ty - 3, x1 - x0, 1.6);
  c.restore();
  c.strokeStyle = CREAM; c.lineWidth = 16;
  c.beginPath(); archPath(c, x0 - 4, x1 + 4, top - 4, bot); c.stroke();
  c.strokeStyle = GOLD; c.lineWidth = 4;
  c.beginPath(); archPath(c, x0 - 14, x1 + 14, top - 14, bot); c.stroke();
  c.fillStyle = CREAM; c.beginPath(); c.arc(X.door, top - 12, 21, 0, TAU); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 2.5; c.stroke();
  crownIcon(c, X.door, top - 8, 0.9);
  pawIcon(c, X.door, top + 4, 0.8, '#FF8FB3');
  // พรมหน้าประตู (ชมพูขอบพู่)
  c.fillStyle = 'rgba(80,40,110,.14)'; c.beginPath(); c.ellipse(cx, GY - 1, 70, 5, 0, 0, TAU); c.fill();
  c.fillStyle = lg(c, 0, GY - 8, 0, GY, [[0, '#F7A8CB'], [1, '#E3809F']]); c.beginPath(); c.roundRect(cx - 62, GY - 8, 124, 7, 3.5); c.fill();
  c.fillStyle = 'rgba(255,255,255,.75)'; for (let k = -2; k <= 2; k++) { heart(c, cx + k * 22, GY - 4.5, 2.2); c.fill(); }
  c.strokeStyle = GOLD; c.lineWidth = 1;
  for (let k = 0; k < 14; k++) { const fx = cx - 60 + k * (120 / 13); c.beginPath(); c.moveTo(fx, GY - 1); c.lineTo(fx, GY + 2); c.stroke(); }
}
/** 2. เคาน์เตอร์ต้อนรับ: ม่วง-ชมพู หน้าแมว คอมพิวเตอร์หูแมว สมุดทะเบียน โคมตั้งโต๊ะ กระดิ่ง */
function drawCounterArt(c) {
  const cx = X.counter, x0 = cx - 115, x1 = cx + 115, top = GY - 64;
  c.fillStyle = 'rgba(80,40,110,.16)'; c.beginPath(); c.ellipse(cx, GY - 3, 128, 7, 0, 0, TAU); c.fill();
  // ของบนโต๊ะ (หลังขอบโต๊ะ)
  // คอมพิวเตอร์หูแมว
  const mx = cx - 52;
  rr(c, mx - 4, top - 14, 8, 14, 2, GOLD_D);
  c.fillStyle = CREAM;
  c.beginPath(); c.moveTo(mx - 30, top - 52); c.lineTo(mx - 26, top - 66); c.lineTo(mx - 16, top - 54); c.fill();
  c.beginPath(); c.moveTo(mx + 30, top - 52); c.lineTo(mx + 26, top - 66); c.lineTo(mx + 16, top - 54); c.fill();
  rr(c, mx - 32, top - 56, 64, 44, 9, CREAM);
  c.fillStyle = lg(c, 0, top - 50, 0, top - 18, [[0, '#E8DCFF'], [1, '#FCE6F3']]);
  c.beginPath(); c.roundRect(mx - 26, top - 50, 52, 32, 5); c.fill();
  c.fillStyle = '#FF8FB3'; heart(c, mx, top - 34, 8); c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(mx - 22, top - 47, 12, 3);
  rr(c, mx - 24, top - 8, 48, 7, 3, '#EADCF8');
  // สมุดทะเบียนเปิด + ปากกาขนนก
  const bx = cx + 18;
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.moveTo(bx - 26, top - 2); c.lineTo(bx - 24, top - 14); c.lineTo(bx, top - 10); c.lineTo(bx + 24, top - 14); c.lineTo(bx + 26, top - 2); c.closePath(); c.fill();
  c.strokeStyle = PINK; c.lineWidth = 1.4; c.beginPath(); c.moveTo(bx, top - 10); c.lineTo(bx, top - 2); c.stroke();
  c.strokeStyle = 'rgba(167,123,216,.5)'; c.lineWidth = 1;
  for (let l = 0; l < 2; l++) { c.beginPath(); c.moveTo(bx - 20, top - 9 + l * 3); c.lineTo(bx - 5, top - 8 + l * 3); c.moveTo(bx + 5, top - 8 + l * 3); c.lineTo(bx + 20, top - 9 + l * 3); c.stroke(); }
  c.strokeStyle = '#FFB6D5'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(bx + 18, top - 6); c.quadraticCurveTo(bx + 30, top - 22, bx + 36, top - 34); c.stroke();
  // กระดิ่งทอง
  c.fillStyle = goldV(c, top - 14, top); c.beginPath(); c.arc(cx + 58, top - 3, 8, Math.PI, 0); c.fill();
  rr(c, cx + 48, top - 3, 20, 3, 1.5, GOLD_D);
  // โคมตั้งโต๊ะ (โป๊ะชมพู ฐานทอง)
  const lx = cx + 92;
  rr(c, lx - 10, top - 4, 20, 4, 2, GOLD_D);
  c.strokeStyle = GOLD; c.lineWidth = 3; c.beginPath(); c.moveTo(lx, top - 4); c.lineTo(lx, top - 40); c.stroke();
  c.fillStyle = lg(c, 0, top - 62, 0, top - 38, [[0, LPINK], [1, PINK]]);
  c.beginPath(); c.moveTo(lx - 10, top - 62); c.lineTo(lx + 10, top - 62); c.lineTo(lx + 17, top - 38); c.lineTo(lx - 17, top - 38); c.closePath(); c.fill();
  c.fillStyle = GOLD; c.fillRect(lx - 17, top - 40, 34, 2.5);
  // ตัวเคาน์เตอร์: ท็อปครีมขอบทอง · หน้าม่วงขอบชมพู · แผงโค้ง · ตราหน้าแมวกลาง
  rr(c, x0 - 6, top - 2, x1 - x0 + 12, 12, 5, CREAM);
  c.fillStyle = GOLD; c.fillRect(x0 - 6, top + 8, x1 - x0 + 12, 3);
  c.fillStyle = lg(c, 0, top + 10, 0, GY - 2, [[0, '#B48AE2'], [1, '#9C72D2']]);
  c.beginPath(); c.roundRect(x0, top + 10, x1 - x0, GY - 2 - top - 10, [0, 0, 10, 10]); c.fill();
  c.fillStyle = PINK; c.fillRect(x0, GY - 14, x1 - x0, 6);
  c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.5;
  for (const px of [x0 + 14, x1 - 74]) { c.beginPath(); c.roundRect(px, top + 18, 60, GY - top - 40, 8); c.stroke(); }
  c.fillStyle = CREAM; c.beginPath(); c.arc(cx, top + 34, 21, 0, TAU); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 2.5; c.stroke();
  catFace(c, cx, top + 37, 13, '#FFD7A8', 1);
  for (const d of [-1, 1]) { c.fillStyle = SGOLD; star(c, cx + d * 40, top + 32, 4.5, -Math.PI / 2); c.fill(); }
}
function drawCounter(c, t) {
  shaded(c, 'hall:counter', X.counter - 130, GY - 140, 260, 142, drawCounterArt);
  // แสงโคมตั้งโต๊ะ + ป้ายต้อนรับ (ตัวหนังสือวาดสด)
  const lx = X.counter + 92, ly = GY - 64 - 40;
  const g = c.createRadialGradient(lx, ly, 2, lx, ly, 46);
  g.addColorStop(0, 'rgba(255,236,170,.5)'); g.addColorStop(1, 'rgba(255,236,170,0)');
  c.fillStyle = g; c.beginPath(); c.arc(lx, ly, 46, 0, TAU); c.fill();
  c.font = '700 15px Mali, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = SPUR; c.fillText('ยินดีต้อนรับ', X.counter, 127);
}
/** 3. กระดานประกาศกิจกรรม: โปสเตอร์กิจกรรมหลากสี (ถ้วยรางวัล ปาร์ตี้เค้ก ตกปลา ดนตรี ของขวัญ ดาว) ปักหมุดหัวใจ · ป้าย "ใหม่" มุมโปสเตอร์ */
function poster(c, i, w, h) {
  const tints = [['#FFF3C4', '#F7C948'], ['#FFE3EE', '#F58CB8'], ['#E3F1FF', '#7FB8F0'], ['#EFE3FF', '#B596EE'], ['#E3F7EC', '#7CCB9E'], ['#FFE9D6', '#F7A96B']];
  const [bg, band] = tints[i % 6];
  rr(c, -w / 2, -h / 2, w, h, 4, bg);
  c.fillStyle = band; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, 9, [4, 4, 0, 0]); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(-w / 2 + 8 + k * 7, -h / 2 + 4.5, 1.6, 0, TAU); c.fill(); }
  const iy = -4;
  if (i === 0) {   // ถ้วยรางวัล
    c.fillStyle = goldV(c, iy - 10, iy + 10);
    c.beginPath(); c.moveTo(-9, iy - 9); c.lineTo(9, iy - 9); c.quadraticCurveTo(9, iy + 3, 0, iy + 4); c.quadraticCurveTo(-9, iy + 3, -9, iy - 9); c.fill();
    c.fillRect(-2, iy + 3, 4, 5); c.fillRect(-6, iy + 8, 12, 3);
    c.strokeStyle = GOLD; c.lineWidth = 2; for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 10, iy - 4, 3.6, d < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, d < 0 ? Math.PI * 1.5 : Math.PI * 0.5, d > 0); c.stroke(); }
    c.fillStyle = '#FFFFFF'; star(c, 0, iy - 3, 3.6, -Math.PI / 2); c.fill();
  } else if (i === 1) {   // เค้กปาร์ตี้
    c.fillStyle = '#FFFFFF'; c.fillRect(-10, iy - 3, 20, 12);
    c.fillStyle = '#F58CB8'; c.fillRect(-10, iy - 3, 20, 4);
    c.fillStyle = '#FFE08A'; c.fillRect(-1, iy - 11, 2, 8);
    c.fillStyle = '#FF9F5A'; c.beginPath(); c.ellipse(0, iy - 13, 1.8, 3, 0, 0, TAU); c.fill();
  } else if (i === 2) {   // ปลา
    c.fillStyle = '#5FA8EC'; c.beginPath(); c.ellipse(-2, iy, 10, 6, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(7, iy); c.lineTo(13, iy - 5); c.lineTo(13, iy + 5); c.fill();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(-7, iy - 1.5, 1.6, 0, TAU); c.fill();
  } else if (i === 3) {   // โน้ตเพลง
    c.fillStyle = '#8E66CF'; c.beginPath(); c.ellipse(-5, iy + 6, 4, 3, -0.4, 0, TAU); c.ellipse(6, iy + 4, 4, 3, -0.4, 0, TAU); c.fill();
    c.fillRect(-2, iy - 9, 2, 15); c.fillRect(9, iy - 11, 2, 15); c.fillRect(-2, iy - 11, 13, 3);
  } else if (i === 4) {   // ของขวัญ
    c.fillStyle = '#7CCB9E'; c.fillRect(-9, iy - 4, 18, 13);
    c.fillStyle = '#F58CB8'; c.fillRect(-2, iy - 4, 4, 13); c.fillRect(-10, iy - 7, 20, 4);
    for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * 4, iy - 9, 4, 2.6, d * 0.5, 0, TAU); c.fill(); }
  } else {   // ดาว
    c.fillStyle = '#FFC94A'; star(c, 0, iy, 10, -Math.PI / 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)'; star(c, -2, iy - 2, 3.4, -Math.PI / 2); c.fill();
  }
  c.strokeStyle = 'rgba(110,80,150,.35)'; c.lineWidth = 1.3; c.lineCap = 'round';
  for (let l = 0; l < 2; l++) { c.beginPath(); c.moveTo(-w / 2 + 7, h / 2 - 12 + l * 5); c.lineTo(w / 2 - 9 - l * 9, h / 2 - 12 + l * 5); c.stroke(); }
  // ป้าย "ใหม่" (ดาวในมุมพับชมพู) โปสเตอร์ที่ 1 กับ 4
  if (i === 1 || i === 4) {
    c.fillStyle = '#FF6F9F'; c.beginPath(); c.moveTo(w / 2, -h / 2 + 9); c.lineTo(w / 2, -h / 2 + 22); c.lineTo(w / 2 - 13, -h / 2 + 9); c.closePath(); c.fill();
    c.fillStyle = '#FFFFFF'; star(c, w / 2 - 4, -h / 2 + 13, 2.6, -Math.PI / 2); c.fill();
  }
  c.fillStyle = '#FF6F9F'; heart(c, 0, -h / 2 - 1, 3.6); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(-1.2, -h / 2 - 2.2, 0.9, 0, TAU); c.fill();
}
function drawNoticeArt(c) {
  const { w, top, bot } = NOTICE, x0 = X.notice - w / 2;
  boardFrame(c, x0, top, w, bot - top, ['#FFF4E6', '#F8E2CC']);
  const cols = 3, rows = 2, gw = (w - 30) / cols, gh = (bot - top - 44) / rows;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const i = r * cols + k;
    c.save(); c.translate(x0 + 15 + k * gw + gw / 2, top + 30 + r * gh + gh / 2); c.rotate((hash(i * 3.3) - 0.5) * 0.12);
    poster(c, i, gw - 10, gh - 10);
    c.restore();
  }
  // เทปตกแต่งเฉียงสองมุม
  for (const [px, py, a] of [[x0 + 18, bot - 18, -0.6], [x0 + w - 18, bot - 18, 0.6]]) {
    c.save(); c.translate(px, py); c.rotate(a); c.fillStyle = 'rgba(245,169,208,.7)'; c.fillRect(-12, -4, 24, 8); c.restore();
  }
  boardBanner(c, X.notice, top - 1, w * 0.56);
  crownIcon(c, X.notice, top - 15, 0.7);
}
function drawNotice(c, t) {
  const { w, top, bot } = NOTICE;
  shaded(c, 'hall:notice', X.notice - w / 2 - 30, top - 40, w + 64, bot - top + 52, drawNoticeArt);
  boardLive(c, X.notice - w / 2, top, w, bot - top, t, 'ประกาศกิจกรรม', top - 1);
}
/**
 * 5. ม้านั่งยาวชมพู-ม่วง 4 ที่นั่ง (ผู้ใช้ 8 พ.ย. วาดให้สวยขึ้น) — พนักลอนสี่ลอนขอบทอง บุนวมดึงกระดุมลายข้าวหลามตัด
 *   เบาะนุ่มแยกที่นั่งกุ๊นขอบ · ที่วางแขนม้วนดอกกุหลาบทอง · ขาทองโค้ง · ปักลายอุ้งเท้า/หัวใจกลางลอน (เบาะ GY-26 · พนัก GY-54 = ผิวที่ยืนได้)
 */
function drawBenchArt(c, x) {
  const w = BENCH_W, x0 = x - w / 2;
  c.fillStyle = 'rgba(80,40,110,.18)'; c.beginPath(); c.ellipse(x, GY - 2, w * 0.55, 6, 0, 0, TAU); c.fill();
  // ขาทองโค้ง (cabriole) + ปุ่มเท้า
  for (const lx of [x0 + 16, x - 2, x0 + w - 16]) {
    c.fillStyle = goldV(c, GY - 16, GY);
    c.beginPath(); c.moveTo(lx - 4, GY - 14); c.quadraticCurveTo(lx - 7, GY - 7, lx - 2, GY - 2); c.lineTo(lx + 3, GY - 2); c.quadraticCurveTo(lx, GY - 7, lx + 4, GY - 14); c.closePath(); c.fill();
    c.beginPath(); c.arc(lx, GY - 2, 2.6, 0, TAU); c.fill();
  }
  // ระบายใต้เบาะ (ลาเวนเดอร์ลอน + ขอบทอง)
  c.fillStyle = lg(c, 0, GY - 16, 0, GY - 8, [[0, '#B794E4'], [1, '#9C77D8']]);
  c.beginPath(); c.moveTo(x0 + 6, GY - 16); c.lineTo(x0 + w - 6, GY - 16);
  for (let k = 0; k < 12; k++) { const a = x0 + w - 6 - k * (w - 12) / 12, b = a - (w - 12) / 12; c.quadraticCurveTo((a + b) / 2, GY - 5, b, GY - 10); }
  c.closePath(); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x0 + 6, GY - 15.5); c.lineTo(x0 + w - 6, GY - 15.5); c.stroke();
  // พนักลอน: โครงม่วง → เนื้อนวมชมพูดึงกระดุม
  const scal = (inset, hi, lo) => {
    c.beginPath(); c.moveTo(x0 + inset, GY - 26); c.lineTo(x0 + inset, lo);
    for (const d of SEATS) { const sx = x + d; c.quadraticCurveTo(sx, hi, sx + 35, lo); }
    c.lineTo(x0 + w - inset, lo); c.lineTo(x0 + w - inset, GY - 26); c.closePath();
  };
  c.fillStyle = lg(c, 0, GY - 74, 0, GY - 24, [[0, '#C2A3EE'], [1, '#9C77D8']]); scal(3, GY - 75, GY - 46); c.fill();
  c.fillStyle = lg(c, 0, GY - 66, 0, GY - 28, [[0, '#FFD3E6'], [0.6, '#F7A8CB'], [1, '#EE8FBD']]); scal(11, GY - 66, GY - 45); c.fill();
  c.save(); scal(11, GY - 66, GY - 45); c.clip();
  // ลายข้าวหลามตัด + กระดุม
  c.strokeStyle = 'rgba(200,90,140,.22)'; c.lineWidth = 1;
  for (let k = -12; k < 14; k++) { const bx = x0 + k * 24; c.beginPath(); c.moveTo(bx, GY - 28); c.lineTo(bx + 40, GY - 70); c.moveTo(bx + 40, GY - 28); c.lineTo(bx, GY - 70); c.stroke(); }
  for (let k = -12; k < 14; k++) for (const yy of [GY - 35, GY - 56]) {
    const bx = x0 + k * 24 + (yy === GY - 35 ? 20 : 8);
    c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(bx, yy, 1.5, 0, TAU); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x0, GY - 66, w, 6);
  c.restore();
  c.strokeStyle = GOLD; c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(x0 + 3, GY - 46);
  for (const d of SEATS) { const sx = x + d; c.quadraticCurveTo(sx, GY - 75, sx + 35, GY - 46); }
  c.stroke();
  for (const [j, d] of SEATS.entries()) {
    const sx = x + d;
    c.fillStyle = CREAM; c.beginPath(); c.arc(sx, GY - 50, 7.5, 0, TAU); c.fill();
    c.strokeStyle = GOLD; c.lineWidth = 1.2; c.stroke();
    if (j % 2) { c.fillStyle = '#FF8FB3'; heart(c, sx, GY - 49.5, 4); c.fill(); } else pawIcon(c, sx, GY - 49, 0.55, '#F58CB8');
    c.fillStyle = GOLD; c.beginPath(); c.arc(sx, GY - 66, 2, 0, TAU); c.fill();
  }
  // เบาะแยกที่นั่ง กุ๊นขอบ
  for (const d of SEATS) {
    const sx = x + d;
    c.fillStyle = lg(c, 0, GY - 31, 0, GY - 13, [[0, '#FFE3EF'], [0.5, '#FBB8D5'], [1, '#EE8FBD']]);
    c.beginPath(); c.roundRect(sx - 34, GY - 30, 68, 17, 8); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.2; c.beginPath(); c.roundRect(sx - 31, GY - 28, 62, 13, 6); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.roundRect(sx - 24, GY - 28, 40, 3, 1.5); c.fill();
  }
  // ที่วางแขนม้วน + ดอกกุหลาบทองปลายม้วน
  for (const [d, ax] of [[-1, x0 + 2], [1, x0 + w - 2]]) {
    c.fillStyle = lg(c, 0, GY - 44, 0, GY - 12, [[0, '#C9AEEF'], [1, '#9068D4']]);
    c.beginPath(); c.roundRect(ax - 8, GY - 42, 16, 30, 8); c.fill();
    c.fillStyle = lg(c, ax - 10, 0, ax + 10, 0, [[0, '#D9C4F7'], [1, '#A985E2']]); c.beginPath(); c.ellipse(ax, GY - 40, 10, 8, 0, 0, TAU); c.fill();
    c.fillStyle = goldV(c, GY - 46, GY - 34); c.beginPath(); c.arc(ax + d * 2, GY - 40, 4.6, 0, TAU); c.fill();
    c.fillStyle = '#FF8FB3'; c.beginPath(); c.arc(ax + d * 2, GY - 40, 1.8, 0, TAU); c.fill();
  }
}
/**
 * 4. น้ำพุสามชั้นแมวหินสวมมงกุฎ — แบบเดียวกับลานกลางเมือง (ผู้ใช้ 8 พ.ย. "ใหญ่ขึ้น สวยเหมือนในเมือง เหยียบเล่นได้")
 *   ตัวน้ำพุ/สายน้ำใช้ชุดเดียวกับเมือง (world.js drawFountainBody · fountainWaterAt) · ขนาดอ่าง FNT (layout.js) ชุดเดียวกับผิวยืน hfnt:*
 *   กระโดดลงอ่าง = น้ำกระเซ็น + เสียงจ๋อม · เดินลุยน้ำ = แจ๋บ ๆ · เดินเข้าใกล้ = ได้ยินเสียงน้ำพุ (main.js)
 */
function drawFountain(c, t) {
  const cx = X.fount;
  shaded(c, 'hall:fount', cx - 172, GY - 222, 344, 240, (g) => drawFountainBody(g, cx, true));
  fountainWaterAt(c, cx, t);
  label(c, cx, GY - 288 + Math.sin(t * 0.05) * 1.5, 'จุดถ่ายรูป', 'rgba(255,255,255,.92)', '#E86A96', 11);
}
/**
 * 6. ต้นไม้ในกระถาง (ผู้ใช้ 8 พ.ย. "วาดกระถางต้นไม้ใหม่ให้สวยขึ้นทุกชั้น") — ใช้ทุกชั้น
 *   kind 0: ต้นไม้ทรงพุ่มกลมสามชั้น ใบไล่เฉดมีแสง ดอกชมพู-ขาวผลิ · กระถางแจกันลาเวนเดอร์ขอบลอนทอง เหรียญอุ้งเท้า ฐานทอง
 *   kind 1: ช่อดอกไม้ (กุหลาบ ทิวลิป เดซี่ ดอกจิ๋ว) ใบเรียว · กระถางพอร์ซเลนครีมคาดชมพู โบว์ผ้าซาติน
 */
export function drawPlantArt(c, kind) {
  c.fillStyle = 'rgba(80,40,110,.18)'; c.beginPath(); c.ellipse(0, -2, 27, 5.5, 0, 0, TAU); c.fill();
  if (kind === 0) {
    // ต้นไม้ทรงลูกอมกลม (ผู้ใช้ 8 พ.ย. "พุ่มกลม ๆ ทับกันไม่สวย วาดใหม่"): พุ่มเดียวขอบใบหยักเป็นธรรมชาติ ไล่เงาลูกกลม
    //   ลายใบด้านใน แสงขวาบน ดอกห้ากลีบประปราย · ลำต้นเกลียวสองเส้น + โบว์ซาตินชมพู
    const cy = -96, R = 27;
    c.lineCap = 'round';
    c.strokeStyle = '#8F6247'; c.lineWidth = 3.4;
    c.beginPath(); c.moveTo(-1, -40); c.bezierCurveTo(4, -52, -4, -60, 1, -72); c.stroke();
    c.strokeStyle = '#B98A66'; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(1, -40); c.bezierCurveTo(-4, -50, 4, -62, -1, -72); c.stroke();
    // โบว์ซาตินบนลำต้น
    c.fillStyle = '#F58CB8';
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(0, -58); c.quadraticCurveTo(d * 9, -66, d * 10, -56); c.quadraticCurveTo(d * 6, -52, 0, -58); c.fill(); c.beginPath(); c.moveTo(d * 1, -57); c.lineTo(d * 5, -47); c.lineTo(d * 2, -48); c.closePath(); c.fill(); }
    c.fillStyle = '#E3709F'; c.beginPath(); c.arc(0, -58, 2.2, 0, TAU); c.fill();
    // พุ่ม: วงใหญ่ + ขอบใบหยักรอบนอก (รูปเดียว)
    const crown = new Path2D();
    crown.arc(0, cy, R, 0, TAU);
    for (let k = 0; k < 22; k++) { const a = (k / 22) * TAU, rr2 = 6.2 + (k % 2) * 1.6, px = Math.cos(a) * (R - 1), py = cy + Math.sin(a) * (R - 1); crown.moveTo(px + rr2, py); crown.arc(px, py, rr2, 0, TAU); }
    const g = c.createRadialGradient(9, cy - 11, 3, 0, cy, R + 8);
    g.addColorStop(0, '#CDEFBF'); g.addColorStop(0.5, '#8ED08C'); g.addColorStop(1, '#579F67');
    c.fillStyle = g; c.fill(crown);
    c.save(); c.clip(crown);
    // ลายใบด้านใน (ใบเล็กเฉียงเข้ม/อ่อน)
    for (let k = 0; k < 26; k++) {
      const a = hash(k * 3.3) * TAU, d = Math.sqrt(hash(k * 7.1)) * (R - 4), lx = Math.cos(a) * d, ly = cy + Math.sin(a) * d;
      c.fillStyle = k % 3 ? 'rgba(70,140,90,.28)' : 'rgba(230,255,220,.4)';
      c.beginPath(); c.ellipse(lx, ly, 4.2, 2, a + 0.8, 0, TAU); c.fill();
    }
    c.fillStyle = 'rgba(40,90,60,.18)'; c.beginPath(); c.ellipse(-6, cy + 16, R, 12, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(9, cy - 14, 9, 5, -0.6, 0, TAU); c.fill();
    c.restore();
    // ดอกห้ากลีบประปราย
    for (const [x, y, col] of [[-14, cy - 8, '#FF9EC4'], [8, cy - 18, '#FFFFFF'], [16, cy + 6, '#FF9EC4'], [-4, cy + 12, '#FFFFFF'], [-18, cy + 10, '#FFC4DA'], [2, cy - 2, '#FFE48A'], [20, cy - 6, '#FFFFFF']]) {
      c.fillStyle = col;
      for (let q = 0; q < 5; q++) { c.beginPath(); c.arc(x + Math.cos(q * 1.257) * 2.3, y + Math.sin(q * 1.257) * 2.3, 1.9, 0, TAU); c.fill(); }
      c.fillStyle = '#FFD45A'; c.beginPath(); c.arc(x, y, 1.1, 0, TAU); c.fill();
    }
    // กระถางแจกันลาเวนเดอร์
    c.fillStyle = goldV(c, -8, 0); c.beginPath(); c.roundRect(-13, -7, 26, 7, 3); c.fill();
    c.fillStyle = lg(c, -20, 0, 20, 0, [[0, '#9A76D8'], [0.45, '#C9AEEF'], [1, '#8E66CF']]);
    c.beginPath(); c.moveTo(-19, -38); c.quadraticCurveTo(-21, -18, -11, -8); c.lineTo(11, -8); c.quadraticCurveTo(21, -18, 19, -38); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(-9, -24, 3.6, 10, 0.15, 0, TAU); c.fill();
    // ขอบลอนทอง
    c.fillStyle = goldV(c, -44, -36); c.beginPath(); c.roundRect(-23, -43, 46, 7, 3); c.fill();
    c.fillStyle = '#C9AEEF'; for (let k = -2; k <= 2; k++) { c.beginPath(); c.arc(k * 9, -36, 4.2, 0, Math.PI); c.fill(); }
    c.fillStyle = CREAM; c.beginPath(); c.arc(0, -21, 7.5, 0, TAU); c.fill();
    c.strokeStyle = GOLD; c.lineWidth = 1.4; c.stroke();
    pawIcon(c, 0, -21, 0.75, '#C77DDE');
  } else {
    // ใบเรียว
    for (const [a, L] of [[-2.3, 30], [-0.8, 30], [-2.0, 22], [-1.1, 24]]) {
      c.fillStyle = '#7FBF86';
      c.save(); c.translate(0, -38); c.rotate(a + Math.PI / 2);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(5, -L / 2, 0, -L); c.quadraticCurveTo(-5, -L / 2, 0, 0); c.fill();
      c.restore();
    }
    // ก้าน
    const stems = [[-20, -88], [-8, -102], [6, -96], [18, -86], [-2, -78], [24, -72], [-24, -70]];
    c.strokeStyle = '#6FAE78'; c.lineWidth = 1.8;
    for (const [fx, fy] of stems) { c.beginPath(); c.moveTo(0, -38); c.quadraticCurveTo(fx * 0.4, (fy - 38) * 0.5 - 14, fx, fy); c.stroke(); }
    // กุหลาบชมพู (ก้นหอย)
    const rose = (x, y, r, col, dk) => {
      c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.strokeStyle = dk; c.lineWidth = 1;
      c.beginPath(); c.arc(x, y, r * 0.62, 0.4, Math.PI * 1.7); c.stroke();
      c.beginPath(); c.arc(x + 0.5, y - 0.4, r * 0.3, 1.2, Math.PI * 2.2); c.stroke();
    };
    rose(-8, -102, 7, '#FF9EC4', 'rgba(200,70,130,.55)');
    rose(18, -86, 6, '#FFC4DA', 'rgba(200,90,140,.5)');
    rose(-24, -70, 5.4, '#F7A8CB', 'rgba(200,80,140,.5)');
    // ทิวลิป
    for (const [x, y, col] of [[6, -96, '#FFB37E'], [-20, -88, '#C9AEEF']]) {
      c.fillStyle = col; c.beginPath(); c.moveTo(x - 5, y - 6); c.lineTo(x - 2.5, y - 2); c.lineTo(x, y - 7); c.lineTo(x + 2.5, y - 2); c.lineTo(x + 5, y - 6); c.quadraticCurveTo(x + 5, y + 4, x, y + 4); c.quadraticCurveTo(x - 5, y + 4, x - 5, y - 6); c.fill();
    }
    // เดซี่ขาว
    for (const [x, y] of [[-2, -78], [24, -72]]) {
      c.fillStyle = '#FFFFFF'; for (let q = 0; q < 8; q++) { c.beginPath(); c.ellipse(x + Math.cos(q * 0.785) * 4, y + Math.sin(q * 0.785) * 4, 2.8, 1.5, q * 0.785, 0, TAU); c.fill(); }
      c.fillStyle = '#FFD45A'; c.beginPath(); c.arc(x, y, 2.4, 0, TAU); c.fill();
    }
    // ดอกจิ๋ว (ยิปโซ)
    c.fillStyle = 'rgba(255,255,255,.95)';
    for (let k = 0; k < 12; k++) { c.beginPath(); c.arc(-26 + hash(k * 3.1) * 52, -110 + hash(k * 5.7) * 44, 1.3, 0, TAU); c.fill(); }
    // กระถางพอร์ซเลนครีมคาดชมพู + โบว์ซาติน
    c.fillStyle = lg(c, -20, 0, 20, 0, [[0, '#EADDD3'], [0.45, '#FFFFFF'], [1, '#E3D3C8']]);
    c.beginPath(); c.moveTo(-20, -38); c.lineTo(20, -38); c.quadraticCurveTo(18, -12, 13, -3); c.lineTo(-13, -3); c.quadraticCurveTo(-18, -12, -20, -38); c.closePath(); c.fill();
    c.fillStyle = '#F7A8CB'; c.fillRect(-19, -26, 38, 6);
    c.fillStyle = GOLD; c.fillRect(-19, -27, 38, 1.4); c.fillRect(-19, -20.5, 38, 1.4);
    rr(c, -23, -42, 46, 7, 3, '#FFF4F0');
    c.fillStyle = GOLD; c.fillRect(-23, -36, 46, 1.6);
    c.fillStyle = '#F58CB8';
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(0, -23); c.quadraticCurveTo(d * 8, -31, d * 9, -21); c.quadraticCurveTo(d * 6, -17, 0, -23); c.fill(); c.beginPath(); c.moveTo(d * 1, -22); c.lineTo(d * 6, -12); c.lineTo(d * 3, -13); c.closePath(); c.fill(); }
    c.fillStyle = '#E3709F'; c.beginPath(); c.arc(0, -23, 2.4, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-11, -14, 2.6, 6, 0.2, 0, TAU); c.fill();
  }
}
/** 7. ตู้จดหมายรูปแมว (หูแมว หน้ายิ้ม ซองจดหมายหัวใจโผล่ ธงชมพู) */
function drawMailArt(c) {
  const x = X.mail, top = GY - 118;
  c.fillStyle = 'rgba(80,40,110,.16)'; c.beginPath(); c.ellipse(x, GY - 2, 30, 5, 0, 0, TAU); c.fill();
  c.fillStyle = goldV(c, top + 60, GY); c.fillRect(x - 5, top + 60, 10, GY - top - 62);
  rr(c, x - 16, GY - 10, 32, 8, 4, GOLD_D);
  // ตัวตู้
  c.fillStyle = PINK;
  c.beginPath(); c.moveTo(x - 30, top + 12); c.lineTo(x - 26, top - 6); c.lineTo(x - 14, top + 6); c.fill();
  c.beginPath(); c.moveTo(x + 30, top + 12); c.lineTo(x + 26, top - 6); c.lineTo(x + 14, top + 6); c.fill();
  c.fillStyle = lg(c, 0, top, 0, top + 66, [[0, '#FFC2DD'], [1, PINK]]);
  c.beginPath(); c.roundRect(x - 34, top + 2, 68, 62, [26, 26, 10, 10]); c.fill();
  c.fillStyle = '#FFE3EE';
  c.beginPath(); c.moveTo(x - 25, top + 9); c.lineTo(x - 24, top + 1); c.lineTo(x - 18, top + 7); c.fill();
  c.beginPath(); c.moveTo(x + 25, top + 9); c.lineTo(x + 24, top + 1); c.lineTo(x + 18, top + 7); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 2.5; c.beginPath(); c.roundRect(x - 34, top + 2, 68, 62, [26, 26, 10, 10]); c.stroke();
  // หน้าแมว
  c.strokeStyle = '#6B4A7E'; c.lineWidth = 1.8; c.lineCap = 'round';
  c.beginPath(); c.arc(x - 11, top + 24, 3.6, Math.PI * 1.1, Math.PI * 1.9); c.arc(x + 11, top + 24, 3.6, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  c.fillStyle = '#FF6F9F'; c.beginPath(); c.arc(x, top + 28, 2, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(x - 18, top + 30, 4, 0, TAU); c.arc(x + 18, top + 30, 4, 0, TAU); c.fill();
  // ช่องใส่จดหมาย + ซองโผล่
  rr(c, x - 20, top + 38, 40, 7, 3.5, '#8E66CF');
  c.fillStyle = '#FFFFFF';
  c.save(); c.translate(x + 4, top + 36); c.rotate(-0.12);
  c.fillRect(-14, -12, 28, 16);
  c.strokeStyle = '#E6D6F6'; c.lineWidth = 1; c.beginPath(); c.moveTo(-14, -12); c.lineTo(0, -2); c.lineTo(14, -12); c.stroke();
  c.fillStyle = '#FF6F9F'; heart(c, 0, -3, 3.4); c.fill();
  c.restore();
  // ธงชมพูข้างตู้
  c.fillStyle = GOLD_D; c.fillRect(x + 33, top + 18, 3, 30);
  c.fillStyle = '#FF6F9F'; c.beginPath(); c.moveTo(x + 36, top + 18); c.lineTo(x + 50, top + 23); c.lineTo(x + 36, top + 28); c.fill();
  pawIcon(c, x, top + 54, 0.9, 'rgba(255,255,255,.8)');
}
/** 8. กระดานสมาชิกปราสาท: กรอบรูปกลมทอง 4 × 2 · สมาชิกมีหน้าแมว (คนแรกสวมมงกุฎ) · ช่องว่างเป็นเงาแมวจาง ๆ + เครื่องหมายบวก (รอเพื่อนมาเติม) */
function drawMembersArt(c) {
  const { w, top, bot } = MEMBERS, x0 = X.members - w / 2;
  boardFrame(c, x0, top, w, bot - top, ['#F6EEFF', '#FCEBF5']);
  const furs = ['#FFDDB8', '#FFFFFF', '#D9D2E4', '#F7C9A0', '#EFE6F7'];
  const cols = 4, gw = (w - 30) / cols, gh = (bot - top - 40) / 2;
  for (let r = 0; r < 2; r++) for (let k = 0; k < cols; k++) {
    const i = r * cols + k, fx = x0 + 15 + k * gw + gw / 2, fy = top + 28 + r * gh + gh / 2, R = Math.min(gw, gh) / 2 - 4;
    c.fillStyle = 'rgba(90,50,140,.15)'; c.beginPath(); c.arc(fx + 1.5, fy + 2.5, R, 0, TAU); c.fill();
    c.fillStyle = goldV(c, fy - R, fy + R); c.beginPath(); c.arc(fx, fy, R, 0, TAU); c.fill();
    c.fillStyle = [LPINK, '#E3F1FF', '#FFF3C4', '#EFE3FF', '#E3F7EC'][(i + r) % 5]; c.beginPath(); c.arc(fx, fy, R - 3.5, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.arc(fx, fy, R - 3.5, 0, TAU); c.clip();
    if (i < 5) catFace(c, fx, fy + R * 0.18, R * 0.5, furs[i], i % 2);
    else {
      // ช่องว่าง: เงาแมวจาง + บวก
      c.fillStyle = 'rgba(167,123,216,.28)';
      c.beginPath(); c.ellipse(fx, fy + R * 0.25, R * 0.5, R * 0.42, 0, 0, TAU); c.fill();
      for (const d of [-1, 1]) { c.beginPath(); c.moveTo(fx + d * R * 0.48, fy + R * 0.05); c.lineTo(fx + d * R * 0.4, fy - R * 0.45); c.lineTo(fx + d * R * 0.12, fy - R * 0.18); c.fill(); }
      c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2.4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(fx - R * 0.18, fy + R * 0.22); c.lineTo(fx + R * 0.18, fy + R * 0.22); c.moveTo(fx, fy + R * 0.04); c.lineTo(fx, fy + R * 0.4); c.stroke();
    }
    c.restore();
    if (i === 0) crownIcon(c, fx, fy - R + 3, 0.5);
    if (i < 5) { c.fillStyle = '#FF8FB3'; heart(c, fx + R * 0.72, fy + R * 0.68, 3.4); c.fill(); }
  }
  boardBanner(c, X.members, top - 1, w * 0.56, ['#C9AEEF', '#9C72D2', '#7550B8']);
  crownIcon(c, X.members, top - 15, 0.7);
}
function drawMembers(c, t) {
  const { w, top, bot } = MEMBERS;
  shaded(c, 'hall:members', X.members - w / 2 - 30, top - 40, w + 64, bot - top + 52, drawMembersArt);
  boardLive(c, X.members - w / 2, top, w, bot - top, t, 'สมาชิกปราสาท', top - 1);
}
/**
 * 9. บันไดใหญ่ขึ้นชั้นบน (ผู้ใช้ 8 พ.ย. "บันไดดูไม่เชื่อมกัน แก้ให้ต่อกันสมส่วน") — ชั้น 1 → 2 · ชั้น 2 → 3
 *   ตัวบันไดทึบชิ้นเดียว (ผนังข้างบันไดมีแผงคิ้วตามแนวเฉียง) · ลูกขั้นขอบขาวปูพรมชมพูต่อเนื่องจากพื้นถึงชานพัก ราวทองเหลืองกดพรมทุกขั้น
 *   ชานพักเป็นแท่นทึบถึงพื้น · ราวจับขนานแนวบันไดต่อเป็นเส้นเดียวกับราวบนชานพัก · ลูกกรงตรงหนึ่งต้นต่อขั้น · เสาหัวบันไดลูกแก้วชมพู
 *   ประตูโค้งบนชานพัก (เห็นขั้นบันไดต่อขึ้นไปข้างใน แสงอุ่นจากชั้นบน) · ตรามงกุฎเหนือประตู
 */
export function drawStairsArt(c, x0 = ST.x0, xEnd = HW) {
  const { steps, sw, sh } = ST, XE = xEnd, base = GY - 8, landY = base - steps * sh, lx = x0 + steps * sw;
  const dx0 = lx + 14, dx1 = XE - 22, dTop = landY - 122, dm = (dx0 + dx1) / 2;
  const railH = 44, rail = (x) => base - sh - railH - ((x - x0) * sh) / sw;
  c.fillStyle = 'rgba(80,40,110,.16)'; c.beginPath(); c.ellipse((x0 + XE) / 2, GY - 2, (XE - x0) / 2 + 10, 7, 0, 0, TAU); c.fill();
  // ── ประตูโค้งบนชานพัก ──
  c.save(); c.beginPath(); archPath(c, dx0, dx1, dTop, landY); c.clip();
  c.fillStyle = lg(c, 0, dTop, 0, landY, [[0, '#B79AE6'], [0.55, '#8E6CC8'], [1, '#6E4FB0']]); c.fillRect(dx0, dTop, dx1 - dx0, landY - dTop);
  for (let i = 0; i < 7; i++) {
    const sx = dx0 + 8 + i * 15, sy = landY - 11 - i * 11;
    c.fillStyle = `rgba(255,224,240,${(0.16 + i * 0.03).toFixed(2)})`; c.fillRect(sx, sy, dx1 - sx, 11);
    c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(sx, sy, dx1 - sx, 1.6);
  }
  const g = c.createRadialGradient(dm + 20, dTop + 30, 4, dm + 20, dTop + 30, 90);
  g.addColorStop(0, 'rgba(255,236,190,.55)'); g.addColorStop(1, 'rgba(255,236,190,0)');
  c.fillStyle = g; c.fillRect(dx0, dTop, dx1 - dx0, landY - dTop);
  c.restore();
  c.strokeStyle = CREAM; c.lineWidth = 12; c.beginPath(); archPath(c, dx0 - 3, dx1 + 3, dTop - 3, landY); c.stroke();
  c.strokeStyle = 'rgba(201,155,62,.35)'; c.lineWidth = 1.2; c.beginPath(); archPath(c, dx0 + 2, dx1 - 2, dTop + 2, landY); c.stroke();
  c.strokeStyle = GOLD; c.lineWidth = 3.4; c.beginPath(); archPath(c, dx0 - 10, dx1 + 10, dTop - 10, landY); c.stroke();
  c.fillStyle = CREAM; c.beginPath(); c.arc(dm, dTop - 10, 15, 0, TAU); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 2.4; c.stroke();
  crownIcon(c, dm, dTop - 5, 0.75);
  // ── ชานพัก: แท่นทึบถึงพื้น แผงคิ้ว + เหรียญหัวใจ ──
  c.fillStyle = lg(c, 0, landY, 0, base, [[0, '#FFF1F7'], [1, '#F0D0E2']]); c.fillRect(lx - 2, landY, XE - lx + 2, base - landY + 8);
  const pw = XE - lx - 22;
  if (pw > 30) {
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2; c.beginPath(); c.roundRect(lx + 9, landY + 20, pw, base - landY - 32, 8); c.stroke();
    c.strokeStyle = 'rgba(201,155,62,.45)'; c.lineWidth = 1; c.beginPath(); c.roundRect(lx + 13, landY + 24, pw - 8, base - landY - 40, 6); c.stroke();
    c.fillStyle = CREAM; c.beginPath(); c.arc(lx + 9 + pw / 2, (landY + base) / 2 + 4, 11, 0, TAU); c.fill();
    c.fillStyle = '#FF8FB3'; heart(c, lx + 9 + pw / 2, (landY + base) / 2 + 5, 5.5); c.fill();
  }
  // ── ตัวบันไดทึบ (ผนังข้างใต้ลูกขั้น) ──
  const body = new Path2D();
  body.moveTo(x0, GY);
  for (let i = 0; i < steps; i++) { const sx = x0 + i * sw, sy = base - (i + 1) * sh; body.lineTo(sx, sy); body.lineTo(sx + sw, sy); }
  body.lineTo(lx, GY); body.closePath();
  c.fillStyle = lg(c, 0, landY, 0, GY, [[0, '#FCE7F1'], [1, '#EFCDE0']]); c.fill(body);
  // คิ้วเฉียงตามแนวบันได (ขอบล่างลูกขั้น) + แผงสามเหลี่ยมคิ้วขาว-ทองด้านใต้
  c.fillStyle = lg(c, 0, landY, 0, base, [[0, '#F7B9D5'], [1, '#EE9DC3']]);
  c.beginPath(); c.moveTo(x0, base); c.lineTo(lx, landY); c.lineTo(lx, landY + 14); c.lineTo(x0 + 19, base); c.closePath(); c.fill();
  c.fillStyle = GOLD; c.beginPath(); c.moveTo(x0 + 19, base); c.lineTo(lx, landY + 14); c.lineTo(lx, landY + 16.5); c.lineTo(x0 + 22.5, base); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(x0 + 46, base - 4); c.lineTo(lx - 8, landY + 34); c.lineTo(lx - 8, base - 4); c.closePath(); c.stroke();
  c.strokeStyle = 'rgba(201,155,62,.45)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x0 + 60, base - 8); c.lineTo(lx - 12, landY + 46); c.lineTo(lx - 12, base - 8); c.closePath(); c.stroke();
  pawIcon(c, lx - 34, base - 22, 1, 'rgba(245,169,208,.75)');
  // ── ลูกขั้น + พรมชมพูต่อเนื่อง + ราวทองเหลืองกดพรม ──
  c.lineJoin = 'miter';
  const carpet = () => {
    c.beginPath(); c.moveTo(x0 - 4, base);
    for (let i = 0; i < steps; i++) { const sx = x0 + i * sw, sy = base - (i + 1) * sh; c.lineTo(sx, base - i * sh); c.lineTo(sx, sy); c.lineTo(sx + sw, sy); }
    c.lineTo(dx0 - 2, landY);
  };
  c.strokeStyle = '#E0659C'; c.lineWidth = 7; carpet(); c.stroke();
  c.strokeStyle = '#F58CB8'; c.lineWidth = 4.6; carpet(); c.stroke();
  c.strokeStyle = 'rgba(255,214,232,.9)'; c.lineWidth = 1; c.setLineDash([2.5, 3]); carpet(); c.stroke(); c.setLineDash([]);
  for (let i = 0; i < steps; i++) {
    const sx = x0 + i * sw, sy = base - (i + 1) * sh;
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.roundRect(sx - 3, sy - 3.5, sw + 4, 3, 1.5); c.fill();
    c.fillStyle = goldV(c, base - i * sh - 4, base - i * sh); c.beginPath(); c.roundRect(sx - 2.5, base - i * sh - 3.5, 5, 3.5, 1.5); c.fill();
  }
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.roundRect(lx - 4, landY - 3.5, XE - lx + 4, 3.5, 1.5); c.fill();
  c.fillStyle = GOLD; c.fillRect(lx - 4, landY + 1, XE - lx + 4, 1.6);
}
/**
 * ราวบันได (ลูกกรง ราวจับ เสาหัวบันได) — แยกชั้นจากตัวบันได (ผู้ใช้ 8 พ.ย. "ตอนขึ้นบันไดให้น้องอยู่หลังราว")
 *   น้องอยู่บนบันได = วาดทับตัวน้อง (drawStairsFront) · น้องอยู่ที่พื้นหน้าบันได = วาดหลังน้องตามปกติ
 */
export function drawStairsRail(c, x0 = ST.x0) {
  const { steps, sw, sh } = ST, base = GY - 8, landY = base - steps * sh, lx = x0 + steps * sw, dx0 = lx + 14;
  const railH = 44, rail = (x) => base - sh - railH - ((x - x0) * sh) / sw;
  // ── ราวบันได: ลูกกรงหนึ่งต้นต่อขั้น · ราวทองขนานแนวบันได ต่อราวชานพัก ──
  const baluster = (bx, y0, y1) => {
    c.fillStyle = lg(c, bx - 2.5, 0, bx + 2.5, 0, [[0, '#EADBD0'], [0.5, '#FFFFFF'], [1, '#E3D3C8']]);
    c.fillRect(bx - 1.6, y1, 3.2, y0 - y1);
    c.beginPath(); c.ellipse(bx, y0 - (y0 - y1) * 0.4, 3.2, 5, 0, 0, TAU); c.fill();
    c.fillStyle = GOLD; c.fillRect(bx - 2.4, y0 - 2.5, 4.8, 2.5); c.fillRect(bx - 2.2, y1, 4.4, 2);
  };
  for (let i = 0; i < steps; i++) { const bx = x0 + i * sw + sw / 2; baluster(bx, base - (i + 1) * sh - 3, rail(bx) + 2); }
  const railL = landY - railH;
  for (let bx = lx + 10; bx < dx0 - 12; bx += 15) baluster(bx, landY - 3, railL + 2);
  c.lineCap = 'round';
  c.strokeStyle = GOLD_D; c.lineWidth = 5.2;
  c.beginPath(); c.moveTo(x0 - 6, rail(x0 - 6)); c.lineTo(lx, rail(lx)); c.quadraticCurveTo(lx + 6, railL, lx + 14, railL); c.lineTo(dx0 - 10, railL); c.stroke();
  c.strokeStyle = '#FFE7A0'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(x0 - 6, rail(x0 - 6) - 1.4); c.lineTo(lx, rail(lx) - 1.4); c.quadraticCurveTo(lx + 6, railL - 1.4, lx + 14, railL - 1.4); c.lineTo(dx0 - 10, railL - 1.4); c.stroke();
  // เสาหัวบันได (ล่าง) + เสาชานพัก: ครีมคาดทอง ยอดลูกแก้วชมพู
  const newel = (px, top, bot) => {
    c.fillStyle = lg(c, px - 8, 0, px + 8, 0, [[0, '#EADBD0'], [0.45, '#FFFFFF'], [1, '#E0CFC3']]);
    c.beginPath(); c.roundRect(px - 7, top, 14, bot - top, 3); c.fill();
    c.fillStyle = goldV(c, top - 4, top + 4); c.beginPath(); c.roundRect(px - 9, top - 3, 18, 6, 2.5); c.fill();
    c.fillStyle = goldV(c, bot - 8, bot); c.beginPath(); c.roundRect(px - 9, bot - 7, 18, 7, 2.5); c.fill();
    c.fillStyle = GOLD; c.fillRect(px - 7, top + (bot - top) * 0.45, 14, 2);
    const pg = c.createRadialGradient(px - 2.5, top - 12, 1, px, top - 9, 9);
    pg.addColorStop(0, '#FFE6F1'); pg.addColorStop(0.6, '#F7A8CB'); pg.addColorStop(1, '#DE79A8');
    c.fillStyle = pg; c.beginPath(); c.arc(px, top - 9, 8, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(px - 2.6, top - 11.5, 2.2, 0, TAU); c.fill();
  };
  newel(x0 - 10, rail(x0 - 10) - 4, base + 4);
  newel(lx + 2, railL - 6, landY);
}
/** บันได + ป้ายชั้นบน (วาดสด) · soon = ยังสร้างอยู่ (แขวนป้าย) */
let stairsCat = null;   // id พื้นบันไดที่น้องยืนอยู่ (main.js ส่งมาทุกเฟรม · ลอยกลางอากาศ = ค่าเดิม)
/** main.js: น้องอยู่บนบันไดไหน (id พื้น เช่น 'hall:stairs') — null = ไม่ได้อยู่บนบันได */
export function setStairsCat(id) { stairsCat = id && /stairs/.test(id) ? id : null; }
const railBox = (x0) => { const landY = GY - 8 - ST.steps * ST.sh; return [x0 - 30, landY - 80, ST.steps * ST.sw + 70, GY + 12 - (landY - 80)]; };
function railLayer(c, x0, key) { const [bx, by, bw, bh] = railBox(x0); shaded(c, key + ':rail', bx, by, bw, bh, (g) => drawStairsRail(g, x0)); }
/** ราวบันไดชั้นหน้า: วาดหลังตัวน้อง เฉพาะตอนน้องอยู่บนบันไดนี้ (key = id พื้นบันได) */
export function drawStairsFront(c, x0 = ST.x0, key = 'hall:stairs') { if (stairsCat === key) railLayer(c, x0, key); }
export function drawStairs(c, t, x0 = ST.x0, xEnd = HW, key = 'hall:stairs', floor = 'ชั้น 2', soon = false) {
  const landY = GY - 8 - ST.steps * ST.sh, top = landY - 160;
  shaded(c, key + ':v3', x0 - 30, top, xEnd - x0 + 30, GY + 4 - top, (g) => drawStairsArt(g, x0, xEnd));
  if (stairsCat !== key) railLayer(c, x0, key);   // น้องอยู่บนบันได = ราววาดทับตัวน้องทีหลัง (drawStairsFront)
  const mx = (x0 + ST.steps * ST.sw + 14 + xEnd - 22) / 2, dTop = landY - 122;
  label(c, mx, dTop + 64, floor, 'rgba(255,255,255,.94)', SPUR, 11);
  if (soon) label(c, mx, dTop + 92 + Math.sin(t * 0.05) * 1.5, 'กำลังสร้าง', '#FFE7A0', '#8A5A00', 10);
}

// ── ส่วนที่ main.js เรียก ───────────────────────────────────────
/** เพดาน พื้น ผนัง เสา แสงหน้าต่างใหญ่ โคมระย้า (พิกัดโลก) */
export function drawHallBack(c, camX, vw, t) {
  c.fillStyle = SPUR; c.fillRect(camX - 10, -400, vw + 20, 400);   // เหนือคิ้วเพดาน (กล้องยกตอนกระโดดสูง)
  drawFloor(c, camX, vw);
  drawWalls(c, camX, vw);
  drawWindowTwinkles(c, camX, vw, t, BAYS, (i) => (BAYS[i] === 'grand' ? 0.5 : i * 0.37));
  drawShaft(c, camX, vw, t);
  const glow = 1 + 0.5 * sky().night + 0.25 * sky().dusk;   // กลางคืนโคมสว่างขึ้น
  for (const [i, x] of CHANDELIERS.entries()) if (x > camX - 120 && x < camX + vw + 120) chandelier(c, x, t, i, 0.82, glow);
}
/** ของในโถง (ชิดผนัง หลังตัวน้องทั้งหมด) */
export function drawHallWorld(c, camX, vw, t) {
  const vis = (x0, x1) => x1 > camX - 40 && x0 < camX + vw + 40;
  if (vis(X.door - 110, X.door + 110)) drawDoor(c, t);
  if (vis(X.counter - 130, X.counter + 130)) drawCounter(c, t);
  if (vis(X.notice - 150, X.notice + 150)) drawNotice(c, t);
  for (const [x, k] of PLANTS) if (vis(x - 40, x + 40)) { c.save(); c.translate(x, GY); shaded(c, 'hall:plant3:' + k, -40, -130, 80, 132, (g) => drawPlantArt(g, k)); c.restore(); }
  for (const x of [X.benchL, X.benchR]) if (vis(x - BENCH_W / 2 - 20, x + BENCH_W / 2 + 20)) shaded(c, 'hall:bench:' + x, x - BENCH_W / 2 - 20, GY - 76, BENCH_W + 40, 78, (g) => drawBenchArt(g, x));
  if (vis(X.fount - 175, X.fount + 175)) drawFountain(c, t);
  if (vis(X.mail - 60, X.mail + 60)) { shaded(c, 'hall:mail', X.mail - 50, GY - 132, 110, 134, drawMailArt); sparkleHint(c, X.mail, GY - 84, 40, t); }
  if (vis(X.members - 150, X.members + 150)) drawMembers(c, t);
  if (vis(ST.x0 - 30, HW)) drawStairs(c, t);   // ชั้น 2 เปิดแล้ว (castle-lounge.js)
  // องครักษ์คู่หน้าประตูทางเข้า (ด้านใน)
  if (vis(0, X.door + 160)) for (const d of [-1, 1]) { const gx = X.door + d * 128; shaded(c, 'hall:guard:' + d, gx - 44, GY - 130, 88, 128, (g) => drawGuardAt(g, gx, GY - 4, 0.62, -d)); }
}
