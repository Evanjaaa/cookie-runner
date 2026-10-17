// src/render/cat2.js
// ─────────────────────────────────────────────────────────────
// น้องแมวแบบใหม่ (ทดลอง) — ลายเส้นจากไฟล์ออกแบบ src/render/cat2/cat-front.svg
//
// ไม่ได้แปะเป็นรูป: อ่านรูปทรงทุกชิ้นจาก SVG มาเป็น Path2D แล้ววาดเองบน Canvas
// สีแต่ละชิ้นผูกกับ "บทบาท" (ตัว ลาย เงา ครีม เส้น ...) จึงสลับเป็นสีของแมวตัวอื่นได้
// ชิ้นส่วนแยกตาม id ในไฟล์ (หัว หู แขน ขา ตา ...) และหมุนรอบจุดหมุนในกลุ่ม pivots
// หางไม่มีในไฟล์ออกแบบ — วาดด้วยโค้ดในลายเส้นเดียวกัน (ดู tailGeom)
//
// ── ทำไมชิ้นส่วนขยับแล้วไม่ "ขาดออกจากกัน" ──
// ไม่ได้วาดเส้นขอบของแต่ละชิ้นแยกกัน (แบบนั้นพอแขนหมุน เส้นโคนแขนจะพาดกลางไหล่ให้เห็นรอยต่อ)
// แต่วาดเป็น "ชั้น" (layer): ลงเส้นขอบหนาของทุกชิ้นไว้ข้างใต้ก่อน → ลงสีเนื้อทุกชิ้นทับ → ค่อยลงลาย/ครีม/เงา
// เส้นขอบจึงเหลือเฉพาะรอบนอกของทั้งก้อน ชิ้นที่ซ้อนกันกลืนเป็นตัวเดียว ขยับยังไงก็ไม่เห็นรอยต่อ
// ตัว (หาง ขา ลำตัว แขน) เป็นชั้นหนึ่ง · หัว (หู + หัว) อีกชั้นทับข้างบน — มีเส้นคางคั่นตามแบบ
//
// สวิตช์ CAT2 เลือกว่าหน้าไหนใช้แบบใหม่ — ตอนนี้เปิดเฉพาะหน้าแรก หน้าอื่นยังเป็นแมวเดิม
// ─────────────────────────────────────────────────────────────
import FRONT_SVG from './cat2/cat-front.svg?raw';
import BACK_SVG from './cat2/cat-back.svg?raw';
import { IDLE_SHAPE, drawCatPose, drawCatFace } from './entities.js';
import { getFace } from '../face.js';
import { gfxLevel } from '../graphics.js';
import { track as ktrack, env as kenv, E as KE, mixShape as kmix } from '../home-moves.js';

/** หน้าที่ใช้น้องแบบใหม่ — ปิด (false) = กลับไปใช้แมวเดิมทันที */
export const CAT2 = { home: true, stash: true, ui: true };
/**
 * ใช้น้องแบบใหม่กับสกินนี้ได้ไหม — ตอนนี้เฉพาะแมวส้มตัวหลักที่โตแล้ว ไม่ใส่ชุด
 * (สีอื่น ลูกแมว ชุดแต่งตัว แมวระบายสีเอง รอออกแบบใหม่ — ใช้ตัววาดเดิม)
 */
export function useCat2(s) {
  // แมวแบบใหม่จากกล่อง (ไข่มุก ขนมชั้น วิเชียรมาศ) ตัวโตแล้ว: ตัววาดใหม่ · ลูกแมว (age) ยังใช้ตัววาดเดิม
  if (s && !s.age && CAT2_BREED_IDS.has(s.palette) && (!s.outfit || s.outfit.id === 'none' || !!CAT2_OUTFITS[s.outfit.id])) return true;
  // มีรูปหน้าที่ผู้เล่นอัปโหลดอยู่ = ใช้ตัววาดเดิม (กรอบรูปหน้ายังผูกกับหัวแบบเดิม)
  return !!s && s.id === 'orange' && !s.age && (!s.outfit || s.outfit.id === 'none' || !!CAT2_OUTFITS[s.outfit.id])
    && (s.noPhoto || !getFace());
}
// ══ ชุดของน้องแบบใหม่ (ออกแบบใหม่ให้เข้ากับลายเส้น: เส้นน้ำตาลเดียวกับตัว ลงสีไล่นุ่ม ๆ) ══
// แต่ละชุดมีสามจังหวะ (ทุกส่วนเว้นได้) — วาดในพิกัดไฟล์ออกแบบ (600×720) ตัววาดย้าย/หมุนตามตัวน้องให้เอง
//   neck(c, k)   ปลอกคอ: ใต้คาง วาดก่อนหัว (หัวบังขอบบน) · k.back = มองจากด้านหลัง
//   shirt(c, k)  เสื้อ: คลุมลำตัว (ตัดในตัว) + แขนเสื้อ — วาดหลังพุง ก่อนแขนที่พับมาหน้าตัว
//   skirt(c, k)  กระโปรง/กางเกง: รอบเอว ทับตัวกับแขน (ท่ายืน)
//   ear(c, k)    ของบนหู: วาดหลังหัว หมุนตามหูที่กระดิก
//   earL(c, k)   ของบนหูซ้าย (ต่างหู): หมุนตามหูซ้าย
//   hat(c, k)    ของบนหัว (หมวก มงกุฎ): วาดหลังหัว ตามหัว ไม่หมุนตามหู
//   earBack(c, k) ของจากหูที่ห้อยหลังหัว (ริบบิ้นยาว): วาดก่อนหัว หมุนตามหูขวา
//   behind(c, k) ของหลังตัว · behindBody = พิกัดตัว (ไม่ตามหัว) · behindBack = มองด้านหลังก็วาด (ออร่า)
//   prop(c, k)   ของถือ: วาดก่อนชั้นตัว (อุ้งเท้ากำด้าม) · k.grip = อุ้งเท้าที่ถือ (null = ลอยข้างตัว) · k.busy 0..1 = อุ้งเท้าไม่ว่าง
//   front(c, k)  เอฟเฟกต์หน้าตัว: วาดท้ายสุดของทุกท่า (ทับตัว)
//   tailBow(c, k) ของบนหาง ที่จุด k.at = { x, y, a }
//   sitSleeve    แขนเสื้อท่านั่งเกา: สีเสื้อ 3 ระดับ (ท่อแขนสีเสื้อ) หรือฟังก์ชัน (c, band, upto, pal) วาดเอง
const OL = 5.5 * 0.8;   // เส้นชุด = เส้นตัว (LW)
function softFill(c, path, x0, y0, x1, y1, light, mid, dark) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, light);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, dark);
  c.fillStyle = g;
  c.fill(path);
}
function outline(c, path, pal, w = OL) {
  c.strokeStyle = pal.line;
  c.lineWidth = w;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.stroke(path);
}
const PINK = { light: '#FFD3E4', mid: '#FF8DB8', dark: '#E5578E', deep: '#C93C74' };
/** โบว์ผูก (กลาง cx,cy ขนาด r) — สองห่วงพอง + หางผ้าสองเส้น + ปมกลาง · ลายจุดขาวบนห่วง */
function ribbonBow(c, cx, cy, r, pal, t = 0, C = PINK, dots = true) {
  const flut = Math.sin(t * 0.06) * 0.04;   // ปลายผ้าไหวนิด ๆ
  const loop = (d) => {
    const q = new Path2D();
    q.moveTo(cx, cy);
    q.bezierCurveTo(cx + d * r * 0.35, cy - r * 1.05, cx + d * r * 1.55, cy - r * 1.05, cx + d * r * 1.45, cy - r * 0.05);
    q.bezierCurveTo(cx + d * r * 1.4, cy + r * 0.85, cx + d * r * 0.45, cy + r * 0.75, cx, cy);
    q.closePath();
    return q;
  };
  // หางผ้า: แถบกว้างพลิ้วลงจากปม ปลายตัดเป็นแฉกตัว V
  const tail = (d) => {
    const q = new Path2D();
    const ex = cx + d * r * (0.85 + flut), ey = cy + r * 1.45;
    q.moveTo(cx - d * r * 0.05, cy + r * 0.15);
    q.bezierCurveTo(cx + d * r * 0.05, cy + r * 0.7, ex - d * r * 0.45, ey - r * 0.25, ex - d * r * 0.32, ey);
    q.lineTo(ex - d * r * 0.02, ey - r * 0.22);
    q.lineTo(ex + d * r * 0.2, ey + r * 0.05);
    q.bezierCurveTo(ex + d * r * 0.05, ey - r * 0.45, cx + d * r * 0.55, cy + r * 0.45, cx + d * r * 0.28, cy + r * 0.08);
    q.closePath();
    return q;
  };
  for (const d of [-1, 1]) {
    const q = tail(d);
    softFill(c, q, cx, cy, cx + d * r, cy + r * 1.5, C.mid, C.dark, C.deep);
    outline(c, q, pal);
  }
  for (const d of [-1, 1]) {
    const q = loop(d);
    softFill(c, q, cx + d * r * 0.4, cy - r * 0.7, cx + d * r * 1.2, cy + r * 0.6, C.light, C.mid, C.dark);
    // รอยพับผ้าด้านในห่วง
    c.save();
    c.clip(q);
    c.strokeStyle = C.fold || 'rgba(201,60,116,.45)';
    c.lineWidth = r * 0.12;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx + d * r * 0.25, cy - r * 0.1);
    c.quadraticCurveTo(cx + d * r * 0.8, cy - r * 0.35, cx + d * r * 1.2, cy - r * 0.1);
    c.stroke();
    // ลายจุดขาว
    if (dots) {
      c.fillStyle = 'rgba(255,255,255,.85)';
      for (const [u, v, rr] of [[0.75, -0.45, 0.11], [1.1, 0.15, 0.09], [0.55, 0.35, 0.08]]) {
        c.beginPath(); c.arc(cx + d * r * u, cy + r * v, r * rr, 0, TAU); c.fill();
      }
    }
    c.restore();
    outline(c, q, pal);
  }
  const knot = new Path2D();
  knot.ellipse(cx, cy + r * 0.02, r * 0.34, r * 0.42, 0, 0, TAU);
  softFill(c, knot, cx, cy - r * 0.4, cx, cy + r * 0.4, C.light, C.mid, C.dark);
  outline(c, knot, pal);
  // ไฮไลต์บนปม
  c.fillStyle = 'rgba(255,255,255,.8)';
  c.beginPath(); c.ellipse(cx - r * 0.1, cy - r * 0.15, r * 0.1, r * 0.06, -0.5, 0, TAU); c.fill();
}
/** กระดิ่งทอง */
function bell(c, x, y, r, pal, swing = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(swing);
  const b = new Path2D();
  b.arc(0, r * 0.9, r, 0, TAU);
  const g = c.createRadialGradient(-r * 0.35, r * 0.5, r * 0.1, 0, r * 0.9, r);
  g.addColorStop(0, '#FFF6C2');
  g.addColorStop(0.5, '#FFD34D');
  g.addColorStop(1, '#E09A1A');
  c.fillStyle = g;
  c.fill(b);
  outline(c, b, pal);
  c.strokeStyle = pal.line;
  c.lineWidth = OL * 0.7;
  c.beginPath(); c.moveTo(-r * 0.75, r * 0.95); c.lineTo(r * 0.75, r * 0.95); c.stroke();
  c.fillStyle = pal.line;
  c.beginPath(); c.arc(0, r * 1.38, r * 0.17, 0, TAU); c.fill();
  c.restore();
}
function tutuSkirt(c, k, C) {
  const pal = k.pal;
  // P = ตัวดัดจุดชุดเดียวกับลำตัว (เอียงถ่ายน้ำหนัก หายใจ หันตัว) — กระโปรงติดตัวน้องไปทุกท่า ไม่ลอยแยก
  const P = k.pt || ((x, y) => [x, y]);
  const sw = Math.sin(k.t * 0.05) * 3;   // ชายกระโปรงไหวนิด ๆ
  // ขนาดตามทรงตัวจริงของแต่ละท่า (หน่วยไฟล์ออกแบบ)
  //   ยืน: เอวรัดใต้อก กว้างเต็มลำตัว ชายบานพ้นสะโพก สั้นเหนือเข่า (เห็นขาเต็ม ๆ)
  //   นั่ง: ชายแผ่ลงบนพื้นรอบก้น (นั่งทับกระโปรง)
  const G = k.mode === 'sit'
    ? { y0: 530, y1: 622, x0: 176, x1: 424, fl: 44, n: 11 }   // นั่ง: เอวต่ำลง 20 (เดิม 510 ดูสูงไป) · เอวกว้างเท่าตัวน้องตรงนั้นพอดี ชายบานพ้นสะโพกนิดเดียว
    : { y0: 486, y1: 566, x0: 196, x1: 404, fl: 32 - 10 * (k.hold || 0), n: 10 };
  // ตัววิ่ง: เอวกว้างเท่าตัววิ่ง ณ ระดับเอว
  const span = k.mode !== 'sit' && k.run?.span?.(G.y0 + 10);
  if (span) { G.x0 = span[0] - 2; G.x1 = span[1] + 2; }
  const M = (x, y) => P(x, y);
  // ขอบเอวผ้าชมพูเข้ม + โบว์กลางเอว (ด้านหน้าเท่านั้น)
  const drawBelt = () => {
    const [, by0] = M(300, G.y0);
    const belt = new Path2D();
    belt.moveTo(...M(G.x0 - 2, G.y0 - 3));
    belt.quadraticCurveTo(...M(300, G.y0 + 15), ...M(G.x1 + 2, G.y0 - 3));
    belt.lineTo(...M(G.x1 + 4, G.y0 + 9));
    belt.quadraticCurveTo(...M(300, G.y0 + 29), ...M(G.x0 - 4, G.y0 + 9));
    belt.closePath();
    softFill(c, belt, 0, by0, 0, by0 + 26, C.mid, C.dark, C.deep);
    outline(c, belt, pal, OL * 0.8);
    if (!k.back && C.beltBow !== false) { const [bx, by] = M(300, G.y0 + 12); ribbonBow(c, bx, by, 17, pal, k.t, C.bowC || C, C.dots !== false); }
  };
  const ruffle = (grow, sway) => {
    const q = new Path2D();
    const x0 = G.x0 - grow * 0.4, x1 = G.x1 + grow * 0.4, y1 = G.y1 + grow;
    const bx0 = x0 - G.fl + sway * 0.3, bx1 = x1 + G.fl + sway;
    q.moveTo(...M(x0, G.y0));
    q.quadraticCurveTo(...M(300, G.y0 + 18), ...M(x1, G.y0));
    // ข้างกระโปรงทรงระฆัง: ออกจากเอวที่รัดแนบตัว พองออกช่วงสะโพก แล้วบานลงชาย — ไม่ใช่ขอบตรงแข็ง
    q.bezierCurveTo(...M(x1 + G.fl * 0.15, G.y0 + 10), ...M(bx1 + 6, G.y0 + (y1 - G.y0) * 0.45), ...M(bx1, y1));
    const sag = (u) => Math.sin(u * Math.PI) * 6;
    for (let i = G.n - 1; i >= 0; i--) {
      const xa = bx0 + (bx1 - bx0) * ((i + 1) / G.n), xb = bx0 + (bx1 - bx0) * (i / G.n);
      q.quadraticCurveTo(...M((xa + xb) / 2, y1 + sag((i + 0.5) / G.n) + 14), ...M(xb, y1 + sag(i / G.n)));
    }
    q.bezierCurveTo(...M(bx0 - 6, G.y0 + (y1 - G.y0) * 0.45), ...M(x0 - G.fl * 0.15, G.y0 + 10), ...M(x0, G.y0));
    q.closePath();
    return q;
  };
  const [, gy0] = M(300, G.y0), [, gy1] = M(300, G.y1);
  const under = ruffle(11, sw);
  c.fillStyle = pal.cream;
  c.fill(under);
  outline(c, under, pal, OL * 0.8);
  const top = ruffle(0, sw * 0.7);
  softFill(c, top, 0, gy0, 0, gy1 + 10, C.light, C.mid, C.dark);
  // จีบผ้า + ไฮไลต์บนสันจีบ (ตามตัวดัดจุดเดียวกัน)
  c.save();
  c.clip(top);
  for (let i = 1; i < G.n; i++) {
    const u = i / G.n;
    const xa = G.x0 + (G.x1 - G.x0) * u, xb = G.x0 - G.fl + (G.x1 - G.x0 + G.fl * 2) * u + sw * 0.6 * u;
    for (const [dx, col, w] of [[0, C.pleat || 'rgba(201,60,116,.32)', 5], [9, 'rgba(255,255,255,.28)', 3]]) {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(...M(xa + dx, G.y0 + 14));
      c.quadraticCurveTo(...M((xa + xb) / 2 + dx, (G.y0 + G.y1) / 2), ...M(xb + dx, G.y1 + 10));
      c.stroke();
    }
  }
  c.restore();
  outline(c, top, pal);
  drawBelt();
}

/** ปลอกคอผ้าโค้งตามคาง (หัวบังครึ่งบน) + ระบายลูกไม้ใต้ปลอก — C = ชุดสีของชุดนั้น (C.lace = สีลูกไม้) */
function laceCollar(c, k, C) {
  const pal = k.pal;
  // หันหน้า (ผู้ใช้ทัก: ปลอกคอนิ่ง มีแค่กระดิ่งหมุน): กลางปลอกคอเลื่อนเท่าหน้า (faceShift ตัวเดียวกับกระดิ่ง) ปลายติดคอไม่ขยับ
  const fs = k.back ? 0 : k.faceShift || 0;
  const M = (x, y) => [x + fs * Math.max(0, 1 - ((x - 300) / 96) ** 2), y];
  const band = new Path2D();
  band.moveTo(...M(208, 376));
  for (let i = 1; i <= 16; i++) { const u = i / 16, x = 208 + 184 * u; band.lineTo(...M(x, 376 + 88 * u * (1 - u))); }
  band.lineTo(...M(394, 398));
  for (let i = 1; i <= 16; i++) { const u = i / 16, x = 394 - 188 * u; band.lineTo(...M(x, 398 + 96 * u * (1 - u))); }
  band.closePath();
  const lace = new Path2D();
  const N = 11;
  for (let i = 0; i <= N; i++) {
    const u = i / N, [x, y] = M(214 + 172 * u, 396 + Math.sin(u * Math.PI) * 42);
    if (i === 0) lace.moveTo(x, y - 4);
    lace.arc(x, y + 2, 9, Math.PI, 0, true);
  }
  lace.lineTo(...M(386, 392));
  for (let i = 1; i <= 16; i++) { const u = i / 16, x = 386 - 172 * u; lace.lineTo(...M(x, 392 + 92 * u * (1 - u))); }
  lace.closePath();
  c.fillStyle = C.lace || pal.cream;
  c.fill(lace);
  outline(c, lace, pal, OL * 0.8);
  softFill(c, band, 300, 380, 300, 440, C.light, C.mid, C.dark);
  outline(c, band, pal);
}

// ── ชุดสีของชุดใหม่ (โทนเดียวกับโบว์หวาน: อ่อน → กลาง → เข้ม → เข้มสุด) ──
const NAVY = { light: '#7F9CD6', mid: '#3F5FA8', dark: '#2A4282', deep: '#1D2F63', pleat: 'rgba(16,28,70,.35)', under: '#FFFFFF' };
const RED = { light: '#FFB3B8', mid: '#F2606D', dark: '#D23A4D', deep: '#A8243A', fold: 'rgba(150,25,45,.45)' };
const ICE = { light: '#E6F6FF', mid: '#A9DCF7', dark: '#6FB8E0', deep: '#4A93C2', pleat: 'rgba(60,130,190,.32)', fold: 'rgba(60,130,190,.4)' };
const SILVER = { light: '#FFFFFF', mid: '#E3EAF5', dark: '#B4C2D8', deep: '#8797B2' };



/** มงกุฎจิ๋ว: มงกุฎเงินสามยอด ลูกแก้วฟ้าบนยอด เพชรฟ้ากลางมงกุฎ วางเอียงบนหัว */
function tinyCrown(c, k) {
  const pal = k.pal;
  c.save();
  rotAt(c, { x: 300, y: 124 }, 0.12);
  c.translate(300, 130); c.scale(1.3, 1.3); c.translate(-300, -130);   // ใหญ่พอดีหัว
  const cr = new Path2D();
  cr.moveTo(248, 128);
  cr.lineTo(244, 84);
  cr.lineTo(270, 104);
  cr.lineTo(300, 70);
  cr.lineTo(330, 104);
  cr.lineTo(356, 84);
  cr.lineTo(352, 128);
  cr.quadraticCurveTo(300, 138, 248, 128);
  cr.closePath();
  softFill(c, cr, 300, 72, 300, 134, SILVER.light, SILVER.mid, SILVER.dark);
  outline(c, cr, pal);
  const rim = new Path2D();
  rim.moveTo(248, 116);
  rim.quadraticCurveTo(300, 126, 352, 116);
  rim.lineTo(352, 128);
  rim.quadraticCurveTo(300, 138, 248, 128);
  rim.closePath();
  softFill(c, rim, 300, 114, 300, 134, SILVER.mid, SILVER.dark, SILVER.deep);
  outline(c, rim, pal, OL * 0.8);
  for (const [x, y, r] of [[244, 82, 6], [356, 82, 6], [300, 68, 7.5]]) {
    const b = new Path2D();
    b.arc(x, y, r, 0, TAU);
    softFill(c, b, x - r, y - r, x + r, y + r, ICE.light, ICE.mid, ICE.dark);
    outline(c, b, pal, OL * 0.7);
  }
  if (!k.back) {
    const gem = new Path2D();
    gem.moveTo(300, 96); gem.lineTo(312, 110); gem.lineTo(300, 124); gem.lineTo(288, 110); gem.closePath();
    softFill(c, gem, 292, 98, 308, 122, ICE.light, '#5FD0FF', ICE.deep);
    outline(c, gem, pal, OL * 0.7);
    c.fillStyle = 'rgba(255,255,255,.9)';
    c.beginPath(); c.ellipse(296, 105, 3, 2, -0.6, 0, TAU); c.fill();
  }
  c.restore();
}

/** เกล็ดหิมะห้อยปลอกคอ (แทนกระดิ่ง) */
function snowCharm(c, x, y, r, pal, swing = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(swing);
  const disc = new Path2D();
  disc.arc(0, r, r, 0, TAU);
  softFill(c, disc, -r, 0, r, r * 2, ICE.light, ICE.mid, ICE.dark);
  outline(c, disc, pal);
  c.strokeStyle = '#FFFFFF';
  c.lineWidth = 2.6;
  c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    c.beginPath();
    c.moveTo(-Math.cos(a) * r * 0.62, r - Math.sin(a) * r * 0.62);
    c.lineTo(Math.cos(a) * r * 0.62, r + Math.sin(a) * r * 0.62);
    c.stroke();
  }
  c.restore();
}

/**
 * กางเกงขาสั้นกะลาสี (ไม่ใช่กระโปรง): เอวรัดใต้อก ขาสองข้างแยกที่เป้า ปลายขาพับขาวแถบน้ำเงิน · กระดุมทองสองเม็ด
 * ยืน: ดัดตามลำตัว (k.pt) · นั่ง: คลุมตัก ขาหน้าวาดทับ (เหมือนกระโปรง)
 */
function sailorShorts(c, k) {
  const pal = k.pal;
  const P = k.pt || ((x, y) => [x, y]);
  const sit = k.mode === 'sit';
  const T = k.T || {};
  const COLS = T.cols || [SAIL.light, SAIL.mid, SAIL.dark];
  // ทรงกางเกง = ผ้าผืนกว้างตัดด้วยเงาตัวน้องจริง (k.body = ลำตัว+ขา) — ข้างกางเกงจึงตรงสะโพก/ขาพอดีทุกท่า
  // ช่องระหว่างขาอยู่นอกเงาตัว จึงถูกตัดออกเอง เหลือขากางเกงสองข้างตามขาจริง
  // ยืน: ชายขาเหนือเข่า · นั่ง: แค่ช่วงสะโพก/ต้นขา (ขาหน้าวาดทับ ไม่คลุมขา)
  const y0 = sit ? 532 : 524, y1 = sit ? 588 : 606;   // ยืน: ชายขาต่ำกว่าเป้า ขากางเกงแยกสองข้าง (ไม่เป็นทรงกระโปรง)
  if (k.run) return runShorts(c, k, P, y0, COLS, T);
  let M = (x, y) => P(x, y);
  const makeArea = () => {
  const area = new Path2D();
  area.moveTo(...M(80, y0));
  area.quadraticCurveTo(...M(300, y0 + 14), ...M(520, y0));
  area.lineTo(...M(520, y1 - 6));
  area.quadraticCurveTo(...M(300, y1 + 8), ...M(80, y1 - 6));
  area.closePath();
  return area;
  };
  const parts = k.bodies || (k.body ? [k.body] : [null]);
  for (const part0 of parts) {
  const part = part0 && part0.clip ? part0.clip : part0;
  M = part0 && part0.pt ? part0.pt : (x, y) => P(x, y);
  const area = makeArea();
  c.save();
  if (part) c.clip(part);
  const [, gy0] = M(300, y0), [, gy1] = M(300, y1);
  softFill(c, area, 0, gy0, 0, gy1 + 10, COLS[0], COLS[1], COLS[2]);
  if (T.pattern) { c.save(); c.clip(area); T.pattern(c, M, y0, y1); c.restore(); }
  // ปลายขา: แถบขาวสองเส้น + เส้นชายขา
  c.lineCap = 'round';
  c.strokeStyle = 'stripes' in T ? (T.stripes || 'rgba(0,0,0,0)') : '#FFFFFF';
  for (const [dy, w] of [[-9, 5], [-17, 2.6]]) {
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(...M(80, y1 - 6 + dy));
    c.quadraticCurveTo(...M(300, y1 + 8 + dy), ...M(520, y1 - 6 + dy));
    c.stroke();
  }
  // รอยพับผ้ากลางขากางเกง
  c.strokeStyle = T.fold || 'rgba(30,60,130,.28)';
  c.lineWidth = 4;
  for (const x of [240, 360]) {
    c.beginPath();
    c.moveTo(...M(x, y0 + 22));
    c.quadraticCurveTo(...M(x + (x < 300 ? -3 : 3), (y0 + y1) / 2), ...M(x + (x < 300 ? -5 : 5), y1 - 24));
    c.stroke();
  }
  if (!sit) {
    // ตะเข็บกลาง: จากเป้าขึ้นไปครึ่งทาง (บอกว่าเป็นกางเกง)
    c.strokeStyle = T.seam || 'rgba(30,60,130,.45)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(...M(300, y0 + 30));
    c.lineTo(...M(300, 580));
    c.stroke();
  }
  c.strokeStyle = pal.line;
  c.lineWidth = OL;
  c.beginPath();
  c.moveTo(...M(80, y1 - 6));
  c.quadraticCurveTo(...M(300, y1 + 8), ...M(520, y1 - 6));
  c.stroke();
  // ขอบเอว (ตามชายเสื้อ) — เส้นเดียวพาดลำตัว
  c.beginPath();
  c.moveTo(...M(80, y0));
  c.quadraticCurveTo(...M(300, y0 + 14), ...M(520, y0));
  c.stroke();
  c.restore();
  }
  M = (x, y) => P(x, y);
  c.save();
  const first = (k.bodies || [k.body])[0];
  if (first) c.clip(first.clip || first);
  if (!k.back && T.buttons !== null) {
    for (const x of [262, 338]) {
      const [bx, by] = M(x, y0 + 18);
      const b = new Path2D();
      b.arc(bx, by, 7, 0, TAU);
      softFill(c, b, bx - 7, by - 7, bx + 7, by + 7, '#FFF3B0', '#FFD34D', '#D99A1E');
      outline(c, b, pal, OL * 0.6);
    }
  }
  c.restore();
}

/**
 * กางเกงขาสั้นบนตัววิ่งสี่จังหวะ (ผู้ใช้ 17 ต.ค.: จัดชุดให้เข้ากับท่าวิ่ง) — ตัวกับขาเป็นรูปทรงเดียว ขาก้าวหน้า/หลังกว้าง
 * ผ้า = ตัว+ขา ใต้ขอบเอว แต่ตัดปลายขาที่เส้น cuffs ของแต่ละจังหวะ (ฝั่งเท้าเป็นขาเปล่า) · ชายขา (แถบขาว+เส้นขอบ) ลากตามเส้น cuffs
 */
function runShorts(c, k, P, y0, COLS, T) {
  const pal = k.pal, R = k.run;
  // ตัดฝั่งเท้าของแต่ละเส้นปลายขา: กล่องแคบ ๆ ตามแนวเส้น ยื่นไปฝั่งเท้า (ไม่ตัดเลยไปถึงส่วนอื่นของตัว)
  const cut = new Path2D();
  cut.rect(-2000, -2000, 5000, 5000);
  for (const q of R.cuffs) {
    const cs = Math.cos(q.ang), sn = Math.sin(q.ang), L = q.hw * 1.12, D = q.hw * 2.6;
    const pt = (u, v) => [q.x + u * cs - v * sn, q.y + u * sn + v * cs];
    cut.moveTo(...pt(-L, 0));
    cut.lineTo(...pt(-L, D));
    cut.lineTo(...pt(L, D));
    cut.lineTo(...pt(L, 0));
    cut.closePath();
  }
  const area = new Path2D();
  area.moveTo(...P(-200, y0));
  area.quadraticCurveTo(...P(300, y0 + 14), ...P(800, y0));
  area.lineTo(...P(800, 760));
  area.lineTo(...P(-200, 760));
  area.closePath();
  const [, gy0] = P(300, y0);
  c.save();
  c.clip(R.body);
  c.save();
  c.clip(cut, 'evenodd');
  softFill(c, area, 0, gy0, 0, gy0 + 120, COLS[0], COLS[1], COLS[2]);
  if (T.pattern) { c.save(); c.clip(area); T.pattern(c, P, y0, y0 + 120); c.restore(); }
  // ขอบเอว
  c.strokeStyle = pal.line;
  c.lineWidth = OL;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(...P(80, y0));
  c.quadraticCurveTo(...P(300, y0 + 14), ...P(520, y0));
  c.stroke();
  // ชายขา: แถบขาวสองเส้นถอยเข้าหาสะโพก
  c.strokeStyle = 'stripes' in T ? (T.stripes || 'rgba(0,0,0,0)') : '#FFFFFF';
  for (const q of R.cuffs) {
    const cs = Math.cos(q.ang), sn = Math.sin(q.ang), L = q.hw * 1.4;
    for (const [d, w] of [[-9, 5], [-17, 2.6]]) {
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(q.x - L * cs - d * sn, q.y - L * sn + d * cs);
      c.lineTo(q.x + L * cs - d * sn, q.y + L * sn + d * cs);
      c.stroke();
    }
  }
  c.restore();
  // เส้นชายขา (ตัดในตัว = จบที่ขอบขาพอดี)
  c.strokeStyle = pal.line;
  c.lineWidth = OL;
  for (const q of R.cuffs) {
    const cs = Math.cos(q.ang), sn = Math.sin(q.ang), L = q.hw * 1.4;
    c.beginPath();
    c.moveTo(q.x - L * cs, q.y - L * sn);
    c.lineTo(q.x + L * cs, q.y + L * sn);
    c.stroke();
  }
  c.restore();
  // กระดุมหน้าเอว
  if (!k.back && T.buttons !== null) {
    c.save();
    c.clip(R.body);
    for (const x of [262, 338]) {
      const [bx, by] = P(x, y0 + 18);
      const b = new Path2D();
      b.arc(bx, by, 7, 0, TAU);
      softFill(c, b, bx - 7, by - 7, bx + 7, by + 7, '#FFF3B0', '#FFD34D', '#D99A1E');
      outline(c, b, pal, OL * 0.6);
    }
    c.restore();
  }
}
/** แขนเสื้อสั้นบนแขนแบบท่อ (spineBand): ลงขาวจากต้นท่อถึงจุด upto + ปลายแขนแถบฟ้า — ตัดอยู่ในท่อแขน */
function tubeSleeve(c, band, upto, pal, cols = null) {
  c.save();
  c.clip(band.path);
  const p0 = band.pts[0], pe = band.pts[upto];
  const sl = new Path2D();
  for (let i = 0; i <= upto; i++) {
    const q = band.pts[i], h = band.half(i) + 8, nx = -Math.sin(q.a), ny = Math.cos(q.a);
    if (i) sl.lineTo(q.x + nx * h, q.y + ny * h); else sl.moveTo(q.x + nx * h, q.y + ny * h);
  }
  for (let i = upto; i >= 0; i--) {
    const q = band.pts[i], h = band.half(i) + 8, nx = -Math.sin(q.a), ny = Math.cos(q.a);
    sl.lineTo(q.x - nx * h, q.y - ny * h);
  }
  // ต่อออกไปด้านต้นแขน (ปิดปลายท่อ/โคนแขน)
  sl.lineTo(p0.x - Math.cos(p0.a) * 40, p0.y - Math.sin(p0.a) * 40);
  sl.closePath();
  // cols = สีเสื้อของชุด (ไล่แนวตั้งช่วงเดียวกับตัวเสื้อ สีต่อกันเนียน) · ไม่ใส่ = ขาวกะลาสี
  if (cols) softFill(c, sl, 0, 400, 0, 548, cols[0], cols[1], cols[2]);
  else softFill(c, sl, p0.x, p0.y, pe.x, pe.y, '#FFFFFF', '#F3F6FC', '#D8E1F0');
  const h = band.half(upto) + 10, nx = -Math.sin(pe.a), ny = Math.cos(pe.a);
  const back = (d) => [pe.x - Math.cos(pe.a) * d, pe.y - Math.sin(pe.a) * d];
  const cuff = (d, col, w) => {
    const [x, y] = back(d);
    c.strokeStyle = col;
    c.lineWidth = w;
    c.beginPath(); c.moveTo(x + nx * h, y + ny * h); c.lineTo(x - nx * h, y - ny * h); c.stroke();
  };
  if (!cols) {
    cuff(6, SAIL.mid, 11);
    cuff(6, '#FFFFFF', 2.6);
  }
  cuff(0, pal.line, OL);
  c.restore();
}

/**
 * ผ้าคลุมไหล่เจ้าหญิง (มงกุฎจิ๋ว): กำมะหยี่ม่วงคลุมบ่า ชายเป็นคลื่น ขอบขนเออร์มีนขาวจุดดำ · เข็มกลัดทองเพชรฟ้ากลางอก
 * วาดก่อนหัว (ชั้นเดียวกับปลอกคอ) หัวบังขอบบน
 */
function royalCape(c, k) {
  const pal = k.pal;
  const VEL = { light: '#C9A7F2', mid: '#8E5BD6', dark: '#6A3DB0', deep: '#4C2785' };
  const cape = new Path2D();
  cape.moveTo(196, 374);
  cape.bezierCurveTo(176, 400, 160, 436, 158, 470);
  // ชายผ้าเป็นคลื่นเจ็ดลอน
  const N = 7;
  for (let i = 0; i < N; i++) {
    const xa = 158 + (284 / N) * i, xb = 158 + (284 / N) * (i + 1);
    const ya = 470 + Math.sin((i / N) * Math.PI) * 26, yb = 470 + Math.sin(((i + 1) / N) * Math.PI) * 26;
    cape.quadraticCurveTo((xa + xb) / 2, Math.max(ya, yb) + 14, xb, yb);
  }
  cape.bezierCurveTo(440, 436, 424, 400, 404, 374);
  cape.quadraticCurveTo(300, 424, 196, 374);
  cape.closePath();
  softFill(c, cape, 300, 380, 300, 500, VEL.light, VEL.mid, VEL.dark);
  // ประกายกำมะหยี่ + ขอบขนเออร์มีน (แถบขาวฟูตามชาย มีจุดดำ)
  c.save();
  c.clip(cape);
  c.strokeStyle = 'rgba(255,255,255,.22)';
  c.lineWidth = 6;
  c.lineCap = 'round';
  for (const x of [214, 386]) {
    c.beginPath();
    c.moveTo(x, 392);
    c.quadraticCurveTo(x + (x < 300 ? -16 : 16), 430, x + (x < 300 ? -22 : 22), 468);
    c.stroke();
  }
  c.restore();
  outline(c, cape, pal);
  const fur = new Path2D();
  // ขนฟูก้อนใหญ่สลับเล็ก (ไม่ใช่เม็ดเท่ากันเรียงเป็นสร้อย)
  for (let i = 0; i <= 13; i++) {
    const u = i / 13, x = 160 + 280 * u, y = 476 + Math.sin(u * Math.PI) * 30, r = i % 2 ? 13 : 15.5;
    fur.moveTo(x + r, y);
    fur.arc(x, y, r, 0, TAU);
  }
  c.fillStyle = '#FFFFFF';
  c.fill(fur);
  c.strokeStyle = pal.line;
  c.lineWidth = OL * 0.7;
  c.stroke(fur);
  c.fillStyle = '#FFFFFF';
  c.fill(fur);   // ลงขาวทับรอยเส้นด้านในวงที่ซ้อนกัน เหลือขอบนอกเป็นก้อนขนฟู
  c.fillStyle = pal.line;
  // จุดดำเออร์มีน (ขีดสามแฉกเล็ก ๆ) ทุกก้อนเว้นก้อน
  for (let i = 1; i < 13; i += 2) {
    const u = i / 13, x = 160 + 280 * u, y = 478 + Math.sin(u * Math.PI) * 30;
    c.beginPath(); c.ellipse(x, y, 2.6, 5, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(x - 4, y - 5, 1.6, 2.6, -0.5, 0, TAU); c.ellipse(x + 4, y - 5, 1.6, 2.6, 0.5, 0, TAU); c.fill();
  }
  if (!k.back) {
    const bx = 300 + (k.faceShift || 0), by = 432;
    const ring = new Path2D();
    ring.arc(bx, by, 15, 0, TAU);
    softFill(c, ring, bx - 15, by - 15, bx + 15, by + 15, '#FFF3B0', '#FFD34D', '#D99A1E');
    outline(c, ring, pal);
    const gem = new Path2D();
    gem.moveTo(bx, by - 9); gem.lineTo(bx + 8, by); gem.lineTo(bx, by + 9); gem.lineTo(bx - 8, by); gem.closePath();
    softFill(c, gem, bx - 8, by - 9, bx + 8, by + 9, ICE.light, '#5FD0FF', ICE.deep);
    outline(c, gem, pal, OL * 0.6);
  }
}

// ══ มงกุฎจิ๋ว (ตามแบบผู้ใช้): มงกุฎทองเพชรฟ้า · ผ้าคลุมไหล่ฟ้าอ่อนแหวกหน้า ขอบลูกไม้ขาวเส้นทอง ดาวทอง · โบว์ซาตินฟ้า เข็มกลัดทองเพชรฟ้า ══
const GOLD = { light: '#FFF6C4', mid: '#FFD24A', dark: '#E2A21C', deep: '#B57812' };
const SKY = { light: '#EEF4FF', mid: '#C9DAFB', dark: '#9DB8EE', deep: '#7393D6', fold: 'rgba(70,105,190,.4)' };

/** เพชรฟ้าทรงหยดน้ำ (กลาง x,y สูง h) */
function blueGem(c, x, y, h, pal, drop = true) {
  const g = new Path2D();
  if (drop) {
    g.moveTo(x, y - h * 0.55);
    g.bezierCurveTo(x + h * 0.42, y - h * 0.15, x + h * 0.38, y + h * 0.45, x, y + h * 0.48);
    g.bezierCurveTo(x - h * 0.38, y + h * 0.45, x - h * 0.42, y - h * 0.15, x, y - h * 0.55);
  } else {
    g.ellipse(x, y, h * 0.42, h * 0.42, 0, 0, TAU);
  }
  g.closePath();
  const gr = c.createRadialGradient(x - h * 0.15, y - h * 0.2, 1, x, y, h * 0.6);
  gr.addColorStop(0, '#DFF4FF');
  gr.addColorStop(0.45, '#4FA3F0');
  gr.addColorStop(1, '#1E5BB8');
  c.fillStyle = gr;
  c.fill(g);
  outline(c, g, pal, OL * 0.6);
  c.fillStyle = 'rgba(255,255,255,.9)';
  c.beginPath(); c.ellipse(x - h * 0.12, y - h * 0.18, h * 0.1, h * 0.07, -0.6, 0, TAU); c.fill();
}

/** มงกุฎทองห้ายอด ลูกทองบนยอด เพชรหยดน้ำฟ้ากลาง + เพชรกลมเล็กสองข้าง */
function goldCrown(c, k) {
  const pal = k.pal;
  c.save();
  rotAt(c, { x: 300, y: 124 }, 0.06);
  c.translate(300, 130); c.scale(1.25, 1.25); c.translate(-300, -130);
  const tips = [[242, 88], [270, 98], [300, 72], [330, 98], [358, 88]];
  const cr = new Path2D();
  cr.moveTo(248, 130);
  cr.lineTo(...tips[0]);
  cr.quadraticCurveTo(258, 112, ...tips[1]);
  cr.quadraticCurveTo(286, 104, ...tips[2]);
  cr.quadraticCurveTo(314, 104, ...tips[3]);
  cr.quadraticCurveTo(342, 112, ...tips[4]);
  cr.lineTo(352, 130);
  cr.quadraticCurveTo(300, 140, 248, 130);
  cr.closePath();
  softFill(c, cr, 300, 74, 300, 136, GOLD.light, GOLD.mid, GOLD.dark);
  outline(c, cr, pal);
  const rim = new Path2D();
  rim.moveTo(248, 118);
  rim.quadraticCurveTo(300, 128, 352, 118);
  rim.lineTo(352, 130);
  rim.quadraticCurveTo(300, 140, 248, 130);
  rim.closePath();
  softFill(c, rim, 300, 116, 300, 136, GOLD.mid, GOLD.dark, GOLD.deep);
  outline(c, rim, pal, OL * 0.8);
  for (const [x, y] of tips) {
    const b = new Path2D();
    b.arc(x, y - 4, 5, 0, TAU);
    softFill(c, b, x - 5, y - 9, x + 5, y + 1, GOLD.light, GOLD.mid, GOLD.dark);
    outline(c, b, pal, OL * 0.6);
  }
  if (!k.back) {
    blueGem(c, 300, 106, 20, pal, true);
    blueGem(c, 272, 118, 9, pal, false);
    blueGem(c, 328, 118, 9, pal, false);
  }
  c.restore();
}

/** ดาวทองห้าแฉกเล็ก */
function goldStar(c, x, y, r, pal) {
  const st = new Path2D();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i) st.lineTo(px, py); else st.moveTo(px, py);
  }
  st.closePath();
  softFill(c, st, x - r, y - r, x + r, y + r, GOLD.light, GOLD.mid, GOLD.dark);
  c.strokeStyle = pal.line;
  c.lineWidth = OL * 0.45;
  c.lineJoin = 'round';
  c.stroke(st);
}

/** ผ้าคลุมไหล่ฟ้าอ่อนแหวกหน้า (เห็นอกครีม) ขอบลูกไม้ขาว เส้นทองด้านใน ดาวทอง · โบว์ซาตินฟ้า + เข็มกลัดทองเพชรฟ้าห้อยหยด */
function princessCape(c, k) {
  const pal = k.pal;
  const sw = Math.sin(k.t * 0.05) * 2.5;   // ชายผ้าไหวนิด ๆ
  for (const d of [-1, 1]) {
    const X = (u) => 300 + d * u;
    c.save();
    // ยาวลงถึงกลางพุงตามแบบ · หมอบ: ผ้าแผ่กางออกข้าง (ชายแตะพื้นแล้วบาน) และเตี้ยลง
    if (k.loaf) { c.translate(300, 396 - 26); c.scale(1.3, 1.24); c.translate(-300, -396); }   // หมอบ: คลุมทั้งก้อนตัวลงถึงพื้น
    else { c.translate(0, 400); c.scale(1, 1.22); c.translate(0, -400); }
    // ผืนผ้าทรงกลีบนุ่ม: พองคลุมไหล่-ต้นแขน → ชายมนเป็นคลื่นสองลอน → ขอบหน้าโค้งเว้าขึ้นหาคอ
    const panel = new Path2D();
    panel.moveTo(X(8), 402);
    panel.bezierCurveTo(X(46), 404, X(84), 380, X(112), 382);
    panel.bezierCurveTo(X(150), 386, X(170), 424, X(164 + sw * 0.3), 462);
    panel.bezierCurveTo(X(160 + sw * 0.3), 486, X(140), 496, X(122), 488);
    panel.bezierCurveTo(X(108), 504, X(84), 506, X(74), 492);
    panel.bezierCurveTo(X(62), 502, X(42), 498, X(40), 480);
    panel.bezierCurveTo(X(30), 456, X(14), 432, X(8), 402);
    panel.closePath();
    // ลูกไม้ขาวสองชั้น: ระบายใหญ่ตามชาย + ขอบหน้า (ผืนผ้าบังครึ่งใน)
    const lace = new Path2D();
    const pts = [];
    const bz = (p0, p1, p2, p3, u) => {
      const v = 1 - u;
      return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
        v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
    };
    const segs = [
      [[X(164 + sw * 0.3), 462], [X(160 + sw * 0.3), 486], [X(140), 496], [X(122), 488], 4],
      [[X(122), 488], [X(108), 504], [X(84), 506], [X(74), 492], 4],
      [[X(74), 492], [X(62), 502], [X(42), 498], [X(40), 480], 3],
      [[X(40), 480], [X(30), 456], [X(14), 432], [X(8), 402], 4],
    ];
    for (const [a, b, cc, e, n] of segs) for (let i = 0; i < n; i++) pts.push(bz(a, b, cc, e, i / n));
    for (const [x, y] of pts) { lace.moveTo(x + 11, y); lace.arc(x, y, 11, 0, TAU); }
    c.fillStyle = '#FFFFFF';
    c.fill(lace);
    c.strokeStyle = pal.line;
    c.lineWidth = OL * 0.6;
    c.stroke(lace);
    c.fillStyle = '#FFFFFF';
    c.fill(lace);
    // ผ้า: สว่างที่บ่า ไล่เข้มลงชาย + เงานุ่มฝั่งนอก
    const g = c.createRadialGradient(X(92), 400, 6, X(92), 430, 110);
    g.addColorStop(0, SKY.light);
    g.addColorStop(0.55, SKY.mid);
    g.addColorStop(1, SKY.dark);
    c.fillStyle = g;
    c.fill(panel);
    c.save();
    c.clip(panel);
    // เส้นทองหยักเลียบชาย (ขอบลูกไม้ด้านใน) — ตามชายผ้าเลื่อนเข้ามานิด
    c.strokeStyle = GOLD.mid;
    c.lineWidth = 3.6;
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(X(10), 406);
    c.bezierCurveTo(X(18), 436, X(34), 458, X(44), 476);
    c.bezierCurveTo(X(48), 490, X(64), 492, X(74), 482);
    c.bezierCurveTo(X(86), 496, X(106), 494, X(120), 478);
    c.bezierCurveTo(X(138), 486, X(152), 478, X(156 + sw * 0.3), 460);
    c.stroke();
    // รอยพับผ้านุ่ม ๆ สามเส้น (เข้มจาง) + ไฮไลต์บนสันผ้า
    c.lineCap = 'round';
    // ผ้าเนียน: รอยพับเดียวจาง ๆ + ไฮไลต์บนสันผ้า (ไม่ตีเส้นถี่จนเหมือนผ้าจีบ)
    for (const [x0, x1, col, w] of [[112, 124, 'rgba(70,105,190,.22)', 7], [84, 90, 'rgba(255,255,255,.5)', 5]]) {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(X(x0 - 6), 404);
      c.quadraticCurveTo(X(x0 + 2), 440, X(x1), 482);
      c.stroke();
    }
    c.restore();
    outline(c, panel, pal);
    c.restore();
    // ดาววาดนอกการยืดผ้า (ไม่ให้ดาวยืดเบี้ยว) — ใช้สูตรตำแหน่งเดียวกับการยืดด้านบน
    const map = k.loaf
      ? (x, y) => [300 + (x - 300) * 1.3, 370 + (y - 396) * 1.24]
      : (x, y) => [x, 400 + (y - 400) * 1.22];
    goldStar(c, ...map(X(128), 466), 8.5, pal);
    goldStar(c, ...map(X(72), 462), 6, pal);
  }
  if (k.back) {
    // ด้านหลัง: ปุ่มผ้ากลมสีฟ้า (สีเดียวกับโบว์หน้า) ตรงกลางระหว่างผ้าสองฝั่ง = จุดเชื่อมผ้าคลุม
    const bx = 300, by = k.loaf ? 378 : 404;
    const knot = new Path2D();
    knot.ellipse(bx, by, 15, 14, 0, 0, TAU);
    softFill(c, knot, bx - 15, by - 14, bx + 15, by + 14, SKY.light, SKY.mid, SKY.dark);
    outline(c, knot, pal);
    c.fillStyle = 'rgba(255,255,255,.75)';
    c.beginPath(); c.ellipse(bx - 5, by - 5, 4.5, 3, -0.5, 0, TAU); c.fill();
  }
  if (!k.back) {
    const bx = 300 + (k.faceShift || 0) * 0.6, by = 424;   // ต่ำพ้นคาง (คางบังห่วงโบว์)
    ribbonBow(c, bx, by, 34, pal, k.t, SKY, false);   // โบว์ใหญ่ตามแบบ
    // เข็มกลัดทองบนปมโบว์ + หยดทองห้อย
    const ring = new Path2D();
    ring.ellipse(bx, by, 12, 14, 0, 0, TAU);
    softFill(c, ring, bx - 12, by - 14, bx + 12, by + 14, GOLD.light, GOLD.mid, GOLD.dark);
    outline(c, ring, pal, OL * 0.7);
    blueGem(c, bx, by, 16, pal, false);
    const drop = new Path2D();
    drop.moveTo(bx, by + 15);
    drop.bezierCurveTo(bx + 6, by + 21, bx + 5, by + 31, bx, by + 32);
    drop.bezierCurveTo(bx - 5, by + 31, bx - 6, by + 21, bx, by + 15);
    softFill(c, drop, bx - 6, by + 15, bx + 6, by + 32, GOLD.light, GOLD.mid, GOLD.dark);
    outline(c, drop, pal, OL * 0.55);
  }
}

/**
 * ผ้าฟูพันข้อเท้า (ฟ้าธีมเดียวกับชุด): ก้อนฟูเรียงโค้งรอบข้อเท้า ขอบนอกเส้นเดียว (ก้อนในกลืนกัน)
 * k.pt = ตัวดัดจุดของขาข้างนั้น (ตามขาทุกท่า) · k.at = [กลาง x, y, ครึ่งกว้าง]
 */
function fluffCuff(c, k, C = SKY) {
  const pal = k.pal;
  const P = k.pt || ((x, y) => [x, y]);
  const [cx, cy, hw] = k.at;
  const puff = new Path2D();
  const n = 6;
  const r = hw * 0.42;   // ก้อนฟูอวบ
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const [x, y] = P(cx - hw + 2 * hw * u, cy + Math.sin(u * Math.PI) * 7 + (i % 2 ? 3 : -2));
    const rr = r * (i % 2 ? 0.9 : 1.08);
    puff.moveTo(x + rr, y);
    puff.arc(x, y, rr, 0, TAU);
  }
  // เส้นนอกหนาสองเท่าก่อน แล้วลงเนื้อทับ = เหลือเส้นรอบนอกเส้นเดียว ก้อนในกลืนเป็นก้อนฟู
  c.strokeStyle = pal.line;
  c.lineWidth = OL * 1.7;
  c.lineJoin = 'round';
  c.stroke(puff);
  const [, y0] = P(cx, cy - r), [, y1] = P(cx, cy + r + 7);
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, C.light);
  g.addColorStop(0.5, C.mid);
  g.addColorStop(1, C.dark);
  c.fillStyle = g;
  c.fill(puff);
  // ไฮไลต์ขนฟูบนแต่ละก้อน
  c.fillStyle = 'rgba(255,255,255,.75)';
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const [x, y] = P(cx - hw + 2 * hw * u, cy + Math.sin(u * Math.PI) * 7 + (i % 2 ? 3 : -2));
    c.beginPath(); c.ellipse(x - r * 0.25, y - r * 0.35, r * 0.32, r * 0.18, -0.4, 0, TAU); c.fill();
  }
}
// ══ กะลาสีน้อย (ตามแบบผู้ใช้): เสื้อขาวแขนสั้นปกกะลาสีฟ้าแถบขาว ผ้าผูกคอฟ้า · กางเกงขาสั้นฟ้ากระดุมทอง ปลายขาแถบขาว · หมวกขาวแถบฟ้าสมอฟ้า ══
const SAIL = { light: '#9EC0F2', mid: '#5E8EDB', dark: '#4272C6', deep: '#2F58A6' };

/** ปกกะลาสีฟ้า: พาดบ่าสองข้าง ปลายปกมาบรรจบเป็นตัว V กลางอก · แถบขาวสองเส้นตามขอบ · ผ้าผูกคอฟ้า (ปมสี่เหลี่ยม + ชายสามเหลี่ยมสองชิ้น) */
/** รูปปกกะลาสีสองข้าง (พิกัดคอ) — ใช้ทั้งวาดปกและกันแขนเสื้อไม่ให้ลงสีทับปก */
function sailorLaps(P = (x, y) => [x, y]) {
  return [-1, 1].map((d) => {
    const M = (u, y) => P(300 + d * u, y);
    const lap = new Path2D();
    lap.moveTo(...M(100, 376));
    lap.bezierCurveTo(...M(118, 388), ...M(126, 402), ...M(124, 420));
    lap.lineTo(...M(26, 446));
    lap.lineTo(...M(2, 420));
    lap.quadraticCurveTo(...M(46, 404), ...M(100, 376));
    lap.closePath();
    return { d, lap, M };
  });
}
/** ปกกะลาสีฟ้า: พาดบ่าสองข้าง ปลายปกมาบรรจบเป็นตัว V กลางอก · แถบขาวสองเส้นตามขอบ · ผ้าผูกคอฟ้า
 *  k.cpt = ตัวดัดจุดของลำตัว (หันตัว = ปกหมุนตามตัว) */
function sailorCollar(c, k) {
  const pal = k.pal;
  const P = k.cpt || ((x, y) => [x, y]);
  for (const { lap, M } of sailorLaps(P)) {
    const [ax, ay] = M(110, 380), [bx, by] = M(30, 446);
    softFill(c, lap, ax, ay, bx, by, SAIL.light, SAIL.mid, SAIL.dark);
    c.save();
    c.clip(lap);
    c.strokeStyle = '#FFFFFF';
    c.lineCap = 'round';
    for (const [o, w] of [[8, 4], [15, 2.4]]) {
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(...M(118 - o * 0.2, 390));
      c.bezierCurveTo(...M(124 - o, 402), ...M(124 - o, 410), ...M(122 - o, 420 - o * 0.2));
      c.lineTo(...M(28 + o * 0.3, 446 - o * 1.1));
      c.stroke();
    }
    c.restore();
    outline(c, lap, pal);
  }
  if (!k.back) {
    const fx = P(300, 446)[0] + (k.cpt ? (k.hxShift || 0) : (k.faceShift || 0)) * 0.6;
    // ชายผ้าผูกคอสองชิ้น (สามเหลี่ยมปลายแหลม) แล้วปมสี่เหลี่ยมทับ
    for (const d of [-1, 1]) {
      const tail = new Path2D();
      tail.moveTo(fx - d * 6, 446);
      tail.lineTo(fx + d * 46, 478);
      tail.quadraticCurveTo(fx + d * 34, 500, fx + d * 10, 516);
      tail.quadraticCurveTo(fx + d * 4, 482, fx + d * 4, 456);
      tail.closePath();
      softFill(c, tail, fx, 446, fx + d * 26, 496, SAIL.mid, SAIL.dark, SAIL.deep);
      outline(c, tail, pal);
    }
    const knot = new Path2D();
    knot.moveTo(fx - 19, 432);
    knot.lineTo(fx + 19, 432);
    knot.lineTo(fx + 15, 460);
    knot.lineTo(fx - 15, 460);
    knot.closePath();
    softFill(c, knot, fx, 434, fx, 458, SAIL.light, SAIL.mid, SAIL.dark);
    outline(c, knot, pal);
  }
}

/**
 * เสื้อกะลาสีขาว: คลุมลำตัวตั้งแต่คอถึงสะโพก ชายเสื้อมีแถบฟ้า · แขนสั้นปลายแขนแถบฟ้าขาว
 * k.body = ขอบลำตัว (ตัดเสื้อให้อยู่ในตัว) · k.arms = [{ path, pt }] แขนที่ใส่แขนเสื้อ (pt = ตัวดัดจุดของแขน)
 */
function sailorShirt(c, k) {
  const pal = k.pal;
  const P = k.pt || ((x, y) => [x, y]);
  const sit = k.mode === 'sit';
  // ธีมเสื้อ (ชุดเสื้ออื่นใช้ตัวนี้เปลี่ยนแค่สี/ของตกแต่ง) — ไม่ใส่ = กะลาสีน้อย
  const T = k.T || {};
  const BODY = T.body || ['#FFFFFF', '#F4F7FC', '#DCE4F2'];
  const CUFF = 'cuff' in T ? T.cuff : SAIL.mid, CUFF_LINE = 'cuffLine' in T ? T.cuffLine : '#FFFFFF';
  const HEM = 'hem' in T ? T.hem : SAIL.mid;
  const hemY = k.mode === 'loaf' ? 760 : sit ? 548 : 528;   // หมอบ: เสื้อคลุมทั้งก้อนตัว
  // แขนเสื้อ (ก่อนตัวเสื้อ — ตัวเสื้อทับโคนแขนเสื้อ)
  for (const a of k.arms || []) {
    const Q = a.pt;
    c.save();
    c.clip(a.path);
    if (a.notIn) {
      const h = new Path2D();
      h.rect(...HOLE_BOX);
      h.addPath(a.notIn);
      c.clip(h, 'evenodd');
    }
    if (a.collar?.path) {
      // ปกอยู่บนบ่า ทับโคนแขนเสื้อ — เว้นรูปปก (ขยายนิดให้พ้นเส้นขอบปก) ในพิกัดคอ
      const m = c.getTransform();
      a.collar.xf(c);
      const h = new Path2D();
      h.rect(...HOLE_BOX);
      h.addPath(a.collar.path, new DOMMatrix().translate(300, 410).scale(1.06).translate(-300, -410));
      c.clip(h, 'evenodd');
      c.setTransform(m);
    }
    const sl = new Path2D();
    sl.moveTo(...Q(270, 350));
    const cx = a.cuff || T.cuffAt || 150;   // T.cuffAt = แขนยาว (ปลายแขนเสื้อใกล้อุ้งเท้า)   // ปลายแขนเสื้อ (พิกัดแขนในไฟล์ 104=ปลายอุ้งเท้า … 222=ไหล่)
    sl.lineTo(...Q(cx, 390));
    sl.lineTo(...Q(cx - 6, 510));
    sl.lineTo(...Q(270, 540));
    sl.closePath();
    // ไล่สีแนวตั้งชุดเดียวกับตัวเสื้อ (ช่วงเดียวกัน) — แขนเสื้อกับตัวเสื้อสีต่อกันเนียน ไม่เห็นรอยแบ่งตรงรักแร้
    softFill(c, sl, 0, 400, 0, k.mode === 'sit' ? 548 : 528, BODY[0], BODY[1], BODY[2]);
    if (T.sleeveExtra) { c.save(); c.clip(sl); T.sleeveExtra(c, Q, a); c.restore(); }
    // ปลายแขนเสื้อ: แถบฟ้า + เส้นขาว
    c.lineCap = 'butt';
    if (CUFF) {
      c.strokeStyle = CUFF;
      c.lineWidth = 11;
      c.beginPath(); c.moveTo(...Q(cx + 5, 400)); c.lineTo(...Q(cx, 498)); c.stroke();
    }
    if (CUFF_LINE) {
      c.strokeStyle = CUFF_LINE;
      c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(...Q(cx + 7, 400)); c.lineTo(...Q(cx + 2, 498)); c.stroke();
    }
    // ขอบปลายแขนเสื้อ
    c.strokeStyle = pal.line;
    c.lineWidth = OL;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(...Q(cx - 0.5, 400)); c.lineTo(...Q(cx - 5.5, 498)); c.stroke();
    c.restore();
  }
  if (k.sleevesOnly) return;
  c.save();
  if (k.body) c.clip(k.body);
  const shirt = new Path2D();
  // คอเสื้อ V (ปกพาดทับขอบ) — ท่านั่งหัวลดต่ำ ปกจึงต่ำลงตาม คอเสื้อลึกลงตาม (เหนือคอ V เป็นผิวน้อง)
  const vy = k.vy ?? (sit ? 46 : 0);
  shirt.moveTo(...P(30, 360 + vy));
  if (T.vneck !== false) {
    shirt.lineTo(...P(196, 360 + vy));
    shirt.quadraticCurveTo(...P(250, 392 + vy), ...P(300, 436 + vy));
    shirt.quadraticCurveTo(...P(350, 392 + vy), ...P(404, 360 + vy));
  }
  shirt.lineTo(...P(570, 360 + vy));
  shirt.lineTo(...P(570, hemY));
  shirt.quadraticCurveTo(...P(300, hemY + 14), ...P(30, hemY));
  shirt.closePath();
  const [, y0] = P(300, 400), [, y1] = P(300, hemY);
  softFill(c, shirt, 0, y0, 0, y1, BODY[0], BODY[1], BODY[2]);
  // แถบฟ้าเหนือชายเสื้อ + รอยพับผ้านุ่ม ๆ
  c.lineCap = 'round';
  c.strokeStyle = HEM || 'rgba(0,0,0,0)';
  c.lineWidth = 5;
  c.beginPath(); c.moveTo(...P(30, hemY - 12)); c.quadraticCurveTo(...P(300, hemY + 2), ...P(570, hemY - 12)); c.stroke();
  c.strokeStyle = T.fold || 'rgba(120,145,190,.25)';
  c.lineWidth = 5;
  for (const x of [238, 362]) {
    c.beginPath(); c.moveTo(...P(x, 452)); c.quadraticCurveTo(...P(x + (x < 300 ? -4 : 4), 474), ...P(x + (x < 300 ? -2 : 2), hemY - 20)); c.stroke();
  }
  if (T.extra) { c.save(); c.clip(shirt); T.extra(c, P, k, hemY); c.restore(); }   // ของตกแต่งอยู่ในผืนเสื้อเท่านั้น
  // ชายเสื้อ (เส้นขอบ)
  c.strokeStyle = pal.line;
  c.lineWidth = OL;
  c.beginPath(); c.moveTo(...P(30, hemY)); c.quadraticCurveTo(...P(300, hemY + 14), ...P(570, hemY)); c.stroke();
  c.restore();
}

/** หมวกกะลาสีขาวทรงโดมเตี้ย แถบฟ้า สมอฟ้า — เอียงนิด ๆ ตามแบบ */
function sailorHat(c, k) {
  const pal = k.pal;
  c.save();
  rotAt(c, { x: 300, y: 128 }, -0.08);
  c.translate(300, 132); c.scale(1.2, 1.2); c.translate(-300, -132);
  const dome = new Path2D();
  dome.moveTo(222, 124);
  dome.bezierCurveTo(220, 58, 380, 58, 378, 124);
  dome.closePath();
  softFill(c, dome, 300, 64, 300, 126, '#FFFFFF', '#F4F7FC', '#D6DFEE');
  outline(c, dome, pal);
  const band = new Path2D();
  band.moveTo(220, 112);
  band.quadraticCurveTo(300, 124, 380, 112);
  band.lineTo(382, 134);
  band.quadraticCurveTo(300, 148, 218, 134);
  band.closePath();
  softFill(c, band, 300, 112, 300, 146, SAIL.light, SAIL.mid, SAIL.dark);
  outline(c, band, pal);
  // ขอบขาวบาง ๆ ตามแถบ
  c.strokeStyle = 'rgba(255,255,255,.85)';
  c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(226, 118); c.quadraticCurveTo(300, 129, 374, 118); c.stroke();
  if (!k.back) {
    // สมอฟ้า
    c.strokeStyle = SAIL.deep;
    c.lineWidth = 3.6;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(300, 74, 3.6, 0, TAU);
    c.moveTo(300, 78); c.lineTo(300, 100);
    c.moveTo(290, 84); c.lineTo(310, 84);
    c.moveTo(286, 92); c.quadraticCurveTo(300, 106, 314, 92);
    c.stroke();
  }
  c.restore();
}


// ══ เชฟน้อย: เสื้อเชฟขาวคอตั้ง กระดุมสองแถว · ผ้าพันคอแดงผูกข้าง · กางเกงลายตารางขาวดำ · หมวกเชฟทรงสูงฟู ══
const CHEF_RED = { light: '#FF9A92', mid: '#E9504A', dark: '#C5332F', deep: '#9C2222' };
const CHEF_T = {
  body: ['#FFFFFF', '#F7F7F5', '#E2E0DA'], cuff: null, cuffLine: null, hem: null, vneck: false, fold: 'rgba(150,140,125,.22)',
  extra(c, P, k) {
    if (k.back) return;
    // กระดุมสองแถว (เสื้อเชฟ) สีครีมเทา
    for (const x of [262, 338]) for (const y of [432, 462, 492]) {
      const [bx, by] = P(x, y);
      const b = new Path2D();
      b.arc(bx, by, 6, 0, TAU);
      softFill(c, b, bx - 6, by - 6, bx + 6, by + 6, '#FFFFFF', '#E8E3D8', '#C9BFAE');
      outline(c, b, k.pal, OL * 0.5);
    }
    // ตะเข็บสาบเสื้อทแยง (ฝั่งซ้ายทับขวา)
    c.strokeStyle = 'rgba(150,140,125,.45)';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(...P(232, 404)); c.quadraticCurveTo(...P(300, 420), ...P(316, 520)); c.stroke();
  },
};
const CHEF_P = {
  cols: ['#5A5A62', '#3E3E46', '#2C2C33'], stripes: null, fold: 'rgba(0,0,0,.25)', seam: 'rgba(0,0,0,.4)', buttons: null,
  // ลายตารางขาวบนพื้นเทาเข้ม (กางเกงเชฟ)
  pattern(c, M, y0, y1) {
    c.strokeStyle = 'rgba(255,255,255,.55)';
    c.lineWidth = 3;
    for (let x = 90; x <= 520; x += 22) { c.beginPath(); c.moveTo(...M(x, y0)); c.lineTo(...M(x, y1 + 10)); c.stroke(); }
    for (let y = y0 + 8; y <= y1 + 10; y += 22) { c.beginPath(); c.moveTo(...M(80, y)); c.lineTo(...M(520, y)); c.stroke(); }
  },
};
/** ผ้าพันคอแดงรอบคอ ผูกปมเยื้องขวา ชายผ้าสองชิ้นห้อย */
function chefScarf(c, k) {
  const pal = k.pal;
  const P = k.cpt || ((x, y) => [x, y]);
  const band = new Path2D();
  band.moveTo(...P(204, 378));
  band.quadraticCurveTo(...P(300, 428), ...P(396, 378));
  band.lineTo(...P(398, 400));
  band.quadraticCurveTo(...P(300, 452), ...P(202, 400));
  band.closePath();
  softFill(c, band, 300, 384, 300, 448, CHEF_RED.light, CHEF_RED.mid, CHEF_RED.dark);
  outline(c, band, pal);
  // รอยพับผ้า
  c.save(); c.clip(band);
  c.strokeStyle = 'rgba(150,25,30,.35)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(...P(230, 400)); c.quadraticCurveTo(...P(300, 436), ...P(370, 400)); c.stroke();
  c.restore();
  if (k.back) return;
  const [kx, ky] = P(352, 430);
  const fx = kx + (k.cpt ? (k.hxShift || 0) : (k.faceShift || 0)) * 0.4;
  for (const [dx, ang] of [[-6, 0.15], [8, -0.25]]) {
    const t = new Path2D();
    c.save();
    c.translate(fx + dx, ky + 6);
    c.rotate(ang);
    t.moveTo(-8, 0);
    t.lineTo(8, 0);
    t.lineTo(12, 40);
    t.lineTo(0, 32);
    t.lineTo(-10, 42);
    t.closePath();
    softFill(c, t, 0, 0, 0, 42, CHEF_RED.mid, CHEF_RED.dark, CHEF_RED.deep);
    outline(c, t, pal);
    c.restore();
  }
  const knot = new Path2D();
  knot.ellipse(fx, ky, 14, 12, 0, 0, TAU);
  softFill(c, knot, fx - 14, ky - 12, fx + 14, ky + 12, CHEF_RED.light, CHEF_RED.mid, CHEF_RED.dark);
  outline(c, knot, pal);
}
/** หมวกเชฟทรงสูง: แถบผ้าตรงรอบหัว + ยอดฟูสามก้อน */
function chefToque(c, k) {
  const pal = k.pal;
  c.save();
  rotAt(c, { x: 300, y: 128 }, 0.06);
  const puff = new Path2D();
  for (const [x, y, r] of [[252, 66, 34], [300, 46, 40], [348, 66, 34], [276, 88, 30], [324, 88, 30]]) {
    puff.moveTo(x + r, y);
    puff.arc(x, y, r, 0, TAU);
  }
  // เส้นนอกหนาสองเท่าก่อน แล้วลงเนื้อทับ = ก้อนฟูรวมเป็นก้อนเดียว เส้นรอบนอกเส้นเดียว
  c.strokeStyle = pal.line; c.lineWidth = OL * 2; c.lineJoin = 'round';
  c.stroke(puff);
  const g = c.createLinearGradient(0, 10, 0, 120);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.6, '#F6F5F2'); g.addColorStop(1, '#DEDBD3');
  c.fillStyle = g; c.fill(puff);
  // รอยจีบผ้าบนยอดฟู
  c.save(); c.clip(puff);
  c.strokeStyle = 'rgba(160,150,135,.35)'; c.lineWidth = 3.5; c.lineCap = 'round';
  for (const x of [276, 324]) { c.beginPath(); c.moveTo(x, 40); c.quadraticCurveTo(x + (x < 300 ? -6 : 6), 80, x, 108); c.stroke(); }
  c.restore();
  const band = new Path2D();
  band.moveTo(240, 96);
  band.quadraticCurveTo(300, 106, 360, 96);
  band.lineTo(364, 132);
  band.quadraticCurveTo(300, 144, 236, 132);
  band.closePath();
  softFill(c, band, 300, 96, 300, 142, '#FFFFFF', '#F2F0EB', '#D8D4CA');
  outline(c, band, pal);
  c.restore();
}

// ══ พยาบาลน้อย: ชุดเดรสชมพูพาสเทล · ปกบัวขาวขอบชมพู · กระเป๋าอกกากบาทแดง · กระโปรงทรงเอชายขาว · หมวกพยาบาลกากบาทแดง ══
const NURSE = { light: '#FFF1F5', mid: '#FFD6E3', dark: '#F4AFC6', deep: '#D9839F' };
const CROSS_RED = '#E8505B';
function redCross(c, x, y, r) {
  c.fillStyle = CROSS_RED;
  c.fillRect(x - r, y - r * 0.34, r * 2, r * 0.68);
  c.fillRect(x - r * 0.34, y - r, r * 0.68, r * 2);
}
const NURSE_T = {
  body: [NURSE.light, NURSE.mid, NURSE.dark], cuff: '#FFFFFF', cuffLine: NURSE.deep, hem: '#FFFFFF', vneck: false, fold: 'rgba(200,110,140,.25)',
  extra(c, P, k) {
    if (k.back) return;
    // กระเป๋าอกขาว + กากบาทแดง (อกซ้ายของน้อง = ขวาจอ)
    const [px, py] = P(346, 470);
    const pk = new Path2D();
    pk.moveTo(px - 20, py - 16); pk.lineTo(px + 20, py - 16); pk.lineTo(px + 18, py + 14);
    pk.quadraticCurveTo(px, py + 22, px - 18, py + 14); pk.closePath();
    softFill(c, pk, px, py - 16, px, py + 20, '#FFFFFF', '#FBF7F8', '#EADDE2');
    outline(c, pk, k.pal, OL * 0.7);
    redCross(c, px, py + 1, 8);
    // กระดุมเรียงกลางอก
    for (const y of [440, 474, 506]) {
      const [bx, by] = P(300, y);
      const b = new Path2D(); b.arc(bx, by, 5.5, 0, TAU);
      softFill(c, b, bx - 6, by - 6, bx + 6, by + 6, '#FFFFFF', '#F5EEF1', '#DCC7D0');
      outline(c, b, k.pal, OL * 0.5);
    }
  },
};
/** ปกบัวขาวสองแฉกมน ขอบชมพู */
function nurseCollar(c, k) {
  const pal = k.pal;
  const P = k.cpt || ((x, y) => [x, y]);
  for (const d of [-1, 1]) {
    const M = (u, y) => P(300 + d * u, y);
    const lap = new Path2D();
    // ปกสองข้างชิดกันกลางคอ (ปลายในแตะกัน)
    lap.moveTo(...M(-2, 414));
    lap.quadraticCurveTo(...M(30, 390), ...M(88, 378));
    lap.bezierCurveTo(...M(116, 394), ...M(112, 432), ...M(80, 446));
    lap.bezierCurveTo(...M(46, 458), ...M(6, 450), ...M(-2, 414));
    lap.closePath();
    const [ax, ay] = M(60, 380), [bx, by] = M(60, 452);
    softFill(c, lap, ax, ay, bx, by, '#FFFFFF', '#FBF8F9', '#E9DFE3');
    c.save(); c.clip(lap);
    c.strokeStyle = NURSE.dark; c.lineWidth = 6;
    c.stroke(lap);
    c.restore();
    outline(c, lap, pal);
  }
}
/** กระโปรงทรงเอ (ไม่มีระบาย): เอวต่อจากเสื้อ บานนิด ๆ ชายแถบขาว */
function nurseSkirt(c, k) {
  const pal = k.pal;
  const P0 = k.pt || ((x, y) => [x, y]);
  // ท่าถือ/รับหัวใจ: ตัวดัดจุดขยายกระโปรงทั้งผืนตามตัวที่ป้อม (ออกแบบไว้ให้กระโปรงระฆัง) — เอวทรงเอของชุดนี้กว้างเท่าตัวอยู่แล้ว
  // จึงหักการขยายนั้นออก เอวกระโปรงเท่าเอวน้องพอดี
  const shrink = 1 + 0.112 * (k.hold || 0);
  const P = (x, y) => P0(300 + (x - 300) / shrink, y);
  const sit = k.mode === 'sit';
  const SK = k.SK || {};   // ธีมกระโปรง (ไม่ใส่ = พยาบาล)
  let G = SK.G ? SK.G[sit ? 'sit' : 'stand'] : sit ? { y0: 536, y1: 634, x0: 172, x1: 428, fl: 54 }   /* นั่ง: บานคลุมสะโพก/ต้นขาข้างตัว ชายลงถึงพื้น */ : { y0: 522, y1: 592, x0: 180, x1: 420, fl: 16 };   // ยืน: เอวกว้างเท่าตัวน้องตรงนั้นพอดี
  // ตัววิ่ง (ผู้ใช้ทักชุดพยาบาล: กระโปรงไม่เข้ากับเอว): เอวกว้างเท่าตัววิ่งที่ระดับเอวจริงของจังหวะนั้น ชายบานนิด
  const span = !sit && k.run?.span?.(G.y0);
  if (span) G = { ...G, x0: span[0] - 2, x1: span[1] + 2, fl: Math.min(G.fl, 12) };
  let q = new Path2D();
  if (k.run && !sit) {
    // ตัววิ่ง (ผู้ใช้: ชายกระโปรงเหลี่ยมเกิน ไม่ธรรมชาติ): ผ้าไหลเป็นเส้นโค้งเดียว — ข้างกระโปรงโค้งออก มุมชายมน
    // ชายเป็นคลื่นผ้านุ่ม ๆ (พับผ้า 4 ลอน) · ทุกจุดผ่านตัวดัด P (ชายยกตามขาที่ก้าว) แล้วลากโค้งเรียบผ่านจุด
    const pts = [];
    const side = (xa, xb, sgn) => {
      for (let i = 1; i <= 5; i++) {
        const u = i / 6, e = u * u;
        pts.push([xa + (xb - xa) * e + sgn * Math.sin(Math.PI * u) * 4, G.y0 + (G.y1 - G.y0) * u]);
      }
    };
    pts.push([G.x0, G.y0], [300, G.y0 + 12], [G.x1, G.y0]);
    side(G.x1, G.x1 + G.fl, 1);
    pts.push([G.x1 + G.fl + 2, G.y1 + 2]);   // มุมขวามน (จุดเดียว ลากโค้งผ่าน)
    for (let i = 1; i < 12; i++) {
      const u = i / 12, x = G.x1 + G.fl - (G.x1 - G.x0 + 2 * G.fl) * u;
      pts.push([x, G.y1 + 8 + 12 * Math.sin(Math.PI * u) + 4 * Math.sin(u * Math.PI * 8)]);   // ชายโค้งลง + ลอนพับผ้า
    }
    pts.push([G.x0 - G.fl - 2, G.y1 + 2]);   // มุมซ้ายมน
    const back = [];
    for (let i = 1; i <= 5; i++) { const u = i / 6, e = u * u; back.push([G.x0 + (G.x0 - G.fl - G.x0) * e - Math.sin(Math.PI * u) * 4, G.y0 + (G.y1 - G.y0) * u]); }
    pts.push(...back.reverse());
    q = smoothLoop(pts.map(([x, y]) => P(x, y)));
  } else {
  q.moveTo(...P(G.x0, G.y0));
  q.quadraticCurveTo(...P(300, G.y0 + 12), ...P(G.x1, G.y0));
  q.bezierCurveTo(...P(G.x1 + 8, G.y0 + 20), ...P(G.x1 + G.fl, G.y1 - 20), ...P(G.x1 + G.fl, G.y1));
  q.quadraticCurveTo(...P(300, G.y1 + 22), ...P(G.x0 - G.fl, G.y1));
  q.bezierCurveTo(...P(G.x0 - G.fl, G.y1 - 20), ...P(G.x0 - 8, G.y0 + 20), ...P(G.x0, G.y0));
  q.closePath();
  }
  const [, y0] = P(300, G.y0), [, y1] = P(300, G.y1);
  const SC = SK.cols || [NURSE.light, NURSE.mid, NURSE.dark];
  softFill(c, q, 0, y0, 0, y1 + 16, SC[0], SC[1], SC[2]);
  c.save(); c.clip(q);
  c.strokeStyle = SK.hem || '#FFFFFF'; c.lineWidth = 9; c.lineCap = 'round';
  if (k.run && !sit) {
    c.beginPath();
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, x = G.x1 + G.fl + 10 - (G.x1 - G.x0 + 2 * G.fl + 20) * u;
      const [hx, hy] = P(x, G.y1 + 8 + 12 * Math.sin(Math.PI * u) + 4 * Math.sin(u * Math.PI * 8) - 8);
      if (i) c.lineTo(hx, hy); else c.moveTo(hx, hy);
    }
    c.stroke();
  } else {
  c.beginPath(); c.moveTo(...P(G.x0 - G.fl - 10, G.y1 - 8)); c.quadraticCurveTo(...P(300, G.y1 + 14), ...P(G.x1 + G.fl + 10, G.y1 - 8)); c.stroke();
  }
  c.strokeStyle = SK.fold || 'rgba(200,110,140,.28)'; c.lineWidth = 4;
  if (SK.extra) SK.extra(c, P, G, k);
  for (const u of [-1, 1]) { c.beginPath(); c.moveTo(...P(300 + u * 50, G.y0 + 14)); c.quadraticCurveTo(...P(300 + u * 62, (G.y0 + G.y1) / 2), ...P(300 + u * 76, G.y1 - 6)); c.stroke(); }
  c.restore();
  outline(c, q, pal);
}
/** หมวกพยาบาลขาวทรงเรือ กากบาทแดงกลาง */
function nurseCap(c, k) {
  const pal = k.pal;
  c.save();
  rotAt(c, { x: 300, y: 124 }, -0.05);
  const cap = new Path2D();
  cap.moveTo(236, 128);
  cap.lineTo(250, 84);
  cap.quadraticCurveTo(300, 70, 350, 84);
  cap.lineTo(364, 128);
  cap.quadraticCurveTo(300, 138, 236, 128);
  cap.closePath();
  softFill(c, cap, 300, 76, 300, 134, '#FFFFFF', '#F7F4F5', '#DED5D9');
  outline(c, cap, pal);
  const fold = new Path2D();
  fold.moveTo(240, 116); fold.quadraticCurveTo(300, 126, 360, 116);
  c.strokeStyle = NURSE.dark; c.lineWidth = 5; c.lineCap = 'round'; c.stroke(fold);
  if (!k.back) redCross(c, 300, 98, 12);
  c.restore();
}


// ══ ฮู้ดสตรีท: ฮู้ดเหลืองมัสตาร์ดแขนยาว กระเป๋าจิงโจ้ · ฮู้ดกองรอบคอ เชือกผูกปลายเงิน · กางเกงจ็อกเกอร์เทา · แก๊ปกลับหลัง ══
const MUSTARD = ['#FFE08A', '#F6C445', '#D9A21E'];
const HOODIE_T = {
  body: MUSTARD, cuff: '#E3AC27', cuffLine: null, hem: '#E3AC27', vneck: false, fold: 'rgba(160,110,10,.28)', cuffAt: 124,
  extra(c, P, k, hemY) {
    if (k.back) return;
    // ผ้าฮู้ดพับรอบคอด้านหน้า: แถบผ้าจากไหล่ถึงไหล่ (ตัดอยู่ในตัวเสื้อ ไม่เกินเส้นไหล่) — คอปกต่อกับบ่า ไม่ลอย
    const fold = new Path2D();
    fold.moveTo(...P(120, 360));
    fold.lineTo(...P(480, 360));
    fold.lineTo(...P(480, 396));
    fold.quadraticCurveTo(...P(300, 476), ...P(120, 396));
    fold.closePath();
    const [, fy] = P(300, 380);
    softFill(c, fold, 0, fy, 0, fy + 80, MUSTARD[0], MUSTARD[1], MUSTARD[2]);
    c.strokeStyle = 'rgba(160,110,10,.3)'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(...P(150, 388)); c.quadraticCurveTo(...P(300, 450), ...P(450, 388)); c.stroke();
    // กระเป๋าจิงโจ้ (คางหมูมุมมน) + ตะเข็บ
    const pk = new Path2D();
    pk.moveTo(...P(238, hemY - 56));
    pk.lineTo(...P(362, hemY - 56));
    pk.quadraticCurveTo(...P(382, hemY - 34), ...P(388, hemY - 16));
    pk.lineTo(...P(212, hemY - 16));
    pk.quadraticCurveTo(...P(218, hemY - 34), ...P(238, hemY - 56));
    pk.closePath();
    const [, py] = P(300, hemY - 56);
    softFill(c, pk, 0, py, 0, py + 40, MUSTARD[1], MUSTARD[2], '#C38D14');
    outline(c, pk, k.pal, OL * 0.75);
    c.strokeStyle = 'rgba(120,80,0,.35)';
    c.lineWidth = 2.4;
    c.setLineDash([5, 5]);
    c.beginPath(); c.moveTo(...P(244, hemY - 49)); c.lineTo(...P(356, hemY - 49)); c.stroke();
    c.setLineDash([]);
  },
};
const JOGGER_P = { cols: ['#8C8C99', '#6B6B78', '#4F4F5B'], stripes: '#FFFFFF', fold: 'rgba(0,0,0,.22)', seam: 'rgba(0,0,0,.35)', buttons: null };

/** ฮู้ดกองรอบคอ (ม้วนผ้าหนาเป็นวงรอบคอ) + เชือกผูกสองเส้นปลายโลหะ */
function hoodNeck(c, k) {
  const pal = k.pal;
  const P = k.cpt || ((x, y) => [x, y]);
  if (!k.back) return hoodStrings(c, k, P);
  hoodRoll(c, k, P);
}
/** ฮู้ดกองหลังคอ (มองหน้า: อยู่หลังตัว โผล่พ้นไหล่สองข้าง) */
function hoodBehind(c, k) {
  if (k.back) return;
  hoodRoll(c, k, k.cpt || ((x, y) => [x, y]), true);
}
function hoodRoll(c, k, P, behind = false) {
  const pal = k.pal;
  const roll = new Path2D();
  // ก้อนฮู้ดทึบเต็มก้อน: ขอบบนโค้งขึ้นไปซ่อนใต้หัว (ไม่เว้นช่องกลางเป็นวงแหวน)
  roll.moveTo(...P(186, 372));
  roll.quadraticCurveTo(...P(300, 340), ...P(414, 372));
  roll.bezierCurveTo(...P(420, 400), ...P(392, 452), ...P(300, 456));
  roll.bezierCurveTo(...P(208, 452), ...P(180, 400), ...P(186, 372));
  roll.closePath();
  const [, y0] = P(300, 380);
  softFill(c, roll, 0, y0, 0, y0 + 80, MUSTARD[0], MUSTARD[1], MUSTARD[2]);
  c.save(); c.clip(roll);
  c.strokeStyle = 'rgba(160,110,10,.35)'; c.lineWidth = 4; c.lineCap = 'round';
  // รอยพับผ้าฮู้ดนุ่ม ๆ สองเส้น (ไม่ใช่ขอบวงแหวน)
  c.beginPath(); c.moveTo(...P(216, 412)); c.quadraticCurveTo(...P(300, 446), ...P(384, 412)); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(...P(236, 394)); c.quadraticCurveTo(...P(300, 418), ...P(364, 394)); c.stroke();
  c.restore();
  outline(c, roll, pal);
}
function hoodStrings(c, k, P) {
  const pal = k.pal;
  // คอเสื้อด้านหน้า: แถบผ้าริบโค้งรอบคอ (ขอบบนซ่อนใต้คาง) ลายริบตั้ง
  const nb = new Path2D();
  // พอดีคอ: กว้างแค่ช่วงคอใต้คาง (ปลายสองข้างซ่อนใต้หัว) แถบบางลง
  // ปลายสองข้างโค้งมน (ครึ่งวงกลม) ไม่ตัดเหลี่ยม
  nb.moveTo(...P(226, 392));
  nb.quadraticCurveTo(...P(300, 428), ...P(374, 392));
  nb.bezierCurveTo(...P(383, 390), ...P(386, 404), ...P(377, 406));
  nb.quadraticCurveTo(...P(300, 446), ...P(223, 406));
  nb.bezierCurveTo(...P(214, 404), ...P(217, 390), ...P(226, 392));
  nb.closePath();
  const [, ny] = P(300, 400);
  softFill(c, nb, 0, ny, 0, ny + 50, MUSTARD[1], MUSTARD[2], '#C38D14');
  c.save(); c.clip(nb);
  c.strokeStyle = 'rgba(120,80,0,.35)'; c.lineWidth = 2.4;
  for (let i = 0; i <= 14; i++) {
    const u = i / 14, x = 226 + 148 * u, y = 392 + Math.sin(u * Math.PI) * 18;
    c.beginPath(); c.moveTo(...P(x, y - 4)); c.lineTo(...P(x, y + 18)); c.stroke();
  }
  c.restore();
  outline(c, nb, pal);
  const fx = P(300, 440)[0] + (k.cpt ? (k.hxShift || 0) : (k.faceShift || 0)) * 0.5;
  const sw = Math.sin((k.t || 0) * 0.07) * 3;
  for (const d of [-1, 1]) {
    const x0 = fx + d * 20, y0s = 442;
    c.strokeStyle = pal.line; c.lineWidth = 6.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0, y0s); c.quadraticCurveTo(x0 + d * 4 + sw, y0s + 26, x0 + d * 2 + sw, y0s + 48); c.stroke();
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 3.2;
    c.beginPath(); c.moveTo(x0, y0s); c.quadraticCurveTo(x0 + d * 4 + sw, y0s + 26, x0 + d * 2 + sw, y0s + 48); c.stroke();
    const tip = new Path2D();
    tip.ellipse(x0 + d * 2 + sw, y0s + 54, 4.2, 7, 0, 0, TAU);
    softFill(c, tip, x0 - 4, y0s + 46, x0 + 4, y0s + 62, '#FFFFFF', '#C8CCD6', '#8A90A0');
    outline(c, tip, pal, OL * 0.55);
  }
}
/** แก๊ปแดงใส่กลับหลัง: โดมหกเสี้ยว ช่องปรับสายด้านหน้า ปีกหมวกโผล่ด้านหลังบน */
function backCap(c, k) {
  const pal = k.pal;
  const RED = ['#FF8A80', '#EF4B45', '#C52F2F'];
  c.save();
  rotAt(c, { x: 300, y: 126 }, 0.1);
  c.translate(300, 130); c.scale(1.16, 1.16); c.translate(-300, -130);
  // ปีกหมวก (ด้านหลัง ยื่นขึ้นเฉียงพ้นโดม)
  const brim = new Path2D();
  brim.moveTo(318, 80);
  brim.quadraticCurveTo(370, 50, 404, 66);
  brim.quadraticCurveTo(398, 88, 358, 100);
  brim.closePath();
  softFill(c, brim, 330, 60, 400, 100, RED[1], RED[2], '#9E2222');
  outline(c, brim, pal);
  const dome = new Path2D();
  dome.moveTo(228, 128);
  dome.bezierCurveTo(226, 62, 374, 62, 372, 128);
  dome.quadraticCurveTo(300, 140, 228, 128);
  dome.closePath();
  softFill(c, dome, 300, 68, 300, 132, RED[0], RED[1], RED[2]);
  c.save(); c.clip(dome);
  c.strokeStyle = 'rgba(120,20,20,.35)'; c.lineWidth = 3;
  for (const x of [262, 338]) { c.beginPath(); c.moveTo(300, 70); c.quadraticCurveTo(x, 90, x + (x < 300 ? -8 : 8), 132); c.stroke(); }
  c.restore();
  outline(c, dome, pal);
  if (!k.back) {
    // ช่องปรับสายด้านหน้า (เห็นเพราะใส่กลับหลัง) + กระดุมยอดหมวก
    const gap = new Path2D();
    gap.moveTo(282, 130); gap.quadraticCurveTo(300, 102, 318, 130); gap.closePath();
    c.fillStyle = '#F7C9A0'; c.fill(gap);
    outline(c, gap, pal, OL * 0.7);
    c.strokeStyle = '#2E2A38'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(285, 124); c.lineTo(315, 124); c.stroke();
  }
  const btn = new Path2D(); btn.arc(300, 70, 5, 0, TAU);
  softFill(c, btn, 295, 65, 305, 75, RED[0], RED[1], RED[2]);
  outline(c, btn, pal, OL * 0.55);
  c.restore();
}

// ══ ร็อกเกอร์ (สไตล์ตามรูปอ้างอิง): เสื้อยืดแดงคอกลมเหลือง ลายหน้ายิ้มปีศาจ · เสื้อกั๊กหนังดำเปิดหน้า ปกเทา ขอบเทา
//    · กางเกงขาสั้นเทาเข้มพับขา เข็มขัดน้ำตาลหัวส้ม · แว่นดำเฟี้ยวบนตา ══
const LEATHER = ['#5A5468', '#363244', '#1F1C28'];
const ROCK_RED = ['#FF6B5E', '#E8352E', '#B81F1F'];
const ROCK_T = {
  body: ROCK_RED, cuff: '#B81F1F', cuffLine: '#FFD23F', hem: null, vneck: false, fold: 'rgba(110,0,0,.25)',
  extra(c, P, k, hemY) {
    const pal = k.pal;
    if (!k.back) {
      // ลายหน้ายิ้มปีศาจเหลือง (กลางอก)
      const [sx, sy] = P(300, 482);
      const face = new Path2D();
      face.arc(sx, sy, 30, 0, TAU);
      softFill(c, face, sx - 30, sy - 30, sx + 30, sy + 30, '#FFF2A8', '#FFD23F', '#E3A512');
      outline(c, face, pal, OL * 0.6);
      c.fillStyle = '#C81E1E';
      for (const d of [-1, 1]) { c.beginPath(); c.ellipse(sx + d * 11, sy - 4, 6, 4, d * 0.4, 0, TAU); c.fill(); }
      c.strokeStyle = '#C81E1E'; c.lineWidth = 3.2; c.lineCap = 'round';
      c.beginPath(); c.arc(sx, sy + 4, 14, 0.25, Math.PI - 0.25); c.stroke();
      // เขาเล็ก ๆ
      for (const d of [-1, 1]) {
        const h = new Path2D();
        h.moveTo(sx + d * 14, sy - 26); h.quadraticCurveTo(sx + d * 26, sy - 40, sx + d * 30, sy - 46); h.quadraticCurveTo(sx + d * 26, sy - 30, sx + d * 24, sy - 20); h.closePath();
        c.fillStyle = '#C81E1E'; c.fill(h); outline(c, h, pal, OL * 0.5);
      }
    }
    // เสื้อกั๊กหนังดำสองแผ่น (เปิดกลางอก) + ปกเทา + ขอบล่างเทา
    for (const d of [-1, 1]) {
      const X = (u) => 300 + d * u;
      const v = new Path2D();
      // หลัง: เสื้อกั๊กปิดเต็มแผ่น · หน้า: เปิดกลางอกพอเห็นลายเสื้อ
      const ix = k.back ? -4 : 44;
      v.moveTo(...P(X(ix), 360));
      v.lineTo(...P(X(260), 360));
      v.lineTo(...P(X(260), hemY - 10));
      v.lineTo(...P(X(ix + 2), hemY - 10));
      v.quadraticCurveTo(...P(X(ix - 10), 440), ...P(X(ix), 360));
      v.closePath();
      const [, vy] = P(300, 380);
      softFill(c, v, 0, vy, 0, vy + 150, LEATHER[0], LEATHER[1], LEATHER[2]);
      c.save(); c.clip(v);
      c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(...P(X(96), 410)); c.quadraticCurveTo(...P(X(104), 450), ...P(X(100), hemY - 24)); c.stroke();
      c.strokeStyle = '#8B8B96'; c.lineWidth = 9;
      c.beginPath(); c.moveTo(...P(X(56), hemY - 14)); c.lineTo(...P(X(260), hemY - 14)); c.stroke();
      c.restore();
      outline(c, v, pal);
      if (!k.back) {
        const lp = new Path2D();
        lp.moveTo(...P(X(58), 382)); lp.lineTo(...P(X(108), 396)); lp.lineTo(...P(X(56), 452)); lp.closePath();
        const [lx, ly] = P(X(76), 400);
        softFill(c, lp, lx, ly - 20, lx, ly + 50, '#B4B4BE', '#8B8B96', '#6A6A75');
        outline(c, lp, pal, OL * 0.75);
      }
    }
  },
};
/** คอเสื้อกลมเหลือง (หัวบังครึ่งบน) */
function rockNeck(c, k) {
  if (k.back) return;
  const pal = k.pal;
  const P = k.cpt || ((x, y) => [x, y]);
  const nb = new Path2D();
  nb.moveTo(...P(232, 392));
  nb.quadraticCurveTo(...P(300, 426), ...P(368, 392));
  nb.bezierCurveTo(...P(377, 390), ...P(380, 403), ...P(371, 405));   // ปลายมน
  nb.quadraticCurveTo(...P(300, 442), ...P(229, 405));
  nb.bezierCurveTo(...P(220, 403), ...P(223, 390), ...P(232, 392));
  nb.closePath();
  softFill(c, nb, 300, 392, 300, 440, '#FFF2A8', '#FFD23F', '#E3A512');
  outline(c, nb, pal);
}
const DENIM_P = {
  cols: ['#6E6E7A', '#4E4E5A', '#36363F'], stripes: '#9A9AA6', fold: 'rgba(0,0,0,.22)', seam: 'rgba(0,0,0,.4)', buttons: null,
  // เข็มขัดหนังน้ำตาล หัวเข็มขัดส้ม (ที่เอว)
  pattern(c, M, y0) {
    c.strokeStyle = '#7A4A26'; c.lineWidth = 10; c.lineCap = 'butt';
    c.beginPath(); c.moveTo(...M(80, y0 + 8)); c.quadraticCurveTo(...M(300, y0 + 22), ...M(520, y0 + 8)); c.stroke();
    const [bx, by] = M(300, y0 + 15);
    c.fillStyle = '#F39A2B'; c.strokeStyle = '#5A3420'; c.lineWidth = 2.6;
    c.beginPath(); c.roundRect(bx - 14, by - 9, 28, 18, 4); c.fill(); c.stroke();
  },
};
/** ต่างหูห่วงเงินสามวงเจาะขอบนอกหูซ้าย (ห่วงคล้องทะลุขอบหู ครึ่งหลังซ่อนหลังหู) */
function earHoops(c, k) {
  const pal = k.pal;
  // ต่างหูเม็ดกลมเหล็กสามเม็ด แปะเรียงตามขอบนอกหูซ้าย เว้นระยะห่างกัน
  for (const [x, y, r] of [[186, 104, 6.5], [177, 142, 7], [172, 180, 7.5]]   /* เรียงแนวเดียวกับเม็ดล่าง (บนเส้นในหู) */) {
    const b = new Path2D();
    b.arc(x, y, r, 0, TAU);
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.45, '#C4CAD6'); g.addColorStop(1, '#6E7688');
    c.fillStyle = g; c.fill(b);
    outline(c, b, pal, OL * 0.6);
  }
}
/** แว่นดำเฟี้ยวบนตา (ทรงเหลี่ยมมุมมน เอียงนิด ๆ) + ประกายเลนส์ */
function rockShades(c, k) {
  const pal = k.pal;
  const W = EYE_WHITE;
  c.save();
  c.strokeStyle = pal.line; c.lineWidth = OL * 1.1; c.lineCap = 'round';
  c.beginPath(); c.moveTo(W.left.x + 46, W.left.y - 18); c.quadraticCurveTo(300, W.left.y - 34, W.right.x - 46, W.right.y - 18); c.stroke();
  for (const side of ['left', 'right']) {
    const e = W[side], d = side === 'left' ? -1 : 1;
    const L = new Path2D();
    L.moveTo(e.x - 58, e.y - 34);
    L.lineTo(e.x + 58, e.y - 34);
    L.quadraticCurveTo(e.x + 60, e.y + 26, e.x + 18, e.y + 40);
    L.quadraticCurveTo(e.x - 18, e.y + 48, e.x - 50, e.y + 26);
    L.quadraticCurveTo(e.x - 64, e.y + 2, e.x - 58, e.y - 34);
    L.closePath();
    softFill(c, L, e.x, e.y - 34, e.x, e.y + 44, '#4C4560', '#221E2C', '#0E0C14');
    outline(c, L, pal, OL * 1.1);
    c.fillStyle = 'rgba(255,255,255,.75)';
    c.beginPath(); c.ellipse(e.x - 24, e.y - 14, 15, 6, -0.4, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(e.x + 2, e.y - 2, 5, 3, -0.4, 0, TAU); c.fill();
    // ขาแว่นไปหลังหู
    c.beginPath(); c.moveTo(e.x + d * 58, e.y - 30); c.lineTo(e.x + d * 84, e.y - 40); c.stroke();
  }
  c.restore();
}


// ══ พ่อมดน้อย: เสื้อคลุมยาวน้ำเงินม่วงแขนยาว ปลายแขนทอง ดาว/เดือนทอง · กระโปรงคลุมยาวชายทอง · หมวกกรวยปลายงอ แถบทองดาว · เข็มกลัดดาวที่คอ ══
const WIZ = ['#8A7BEA', '#5543B8', '#33287F'];
const GOLDC = '#FFD25A';
function sparkStar(c, x, y, r, col = GOLDC) {
  c.fillStyle = col;
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4, rr = i % 2 ? r * 0.38 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i) c.lineTo(px, py); else c.moveTo(px, py);
  }
  c.closePath();
  c.fill();
}
const WIZ_T = {
  body: WIZ, cuff: GOLDC, cuffLine: null, hem: null, vneck: false, fold: 'rgba(20,10,60,.3)', cuffAt: 126,
  extra(c, P, k, hemY) {
    for (const [x, y, r] of [[236, 446, 7], [362, 470, 9], [262, 498, 5], [340, 420, 5], [214, 486, 4]]) { const [sx, sy] = P(x, y); sparkStar(c, sx, sy, r); }
    if (!k.back) {
      // พระจันทร์เสี้ยวทอง (รูปเสี้ยวจริง ไม่เจาะรู)
      const [mx, my] = P(322, 470);
      crescent(c, mx, my, 13, k.pal);
      // กระดุมทองเรียงกลางอก
      for (const y of [440, 470]) { const [bx, by] = P(300, y); const b = new Path2D(); b.arc(bx, by, 5.5, 0, TAU); softFill(c, b, bx - 6, by - 6, bx + 6, by + 6, '#FFF0A8', GOLDC, '#C98E12'); outline(c, b, k.pal, OL * 0.5); }
    }
    // เชือกคาดเอวทองแบบเกลียว + พู่ห้อยข้าง
    c.strokeStyle = '#C98E12'; c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(...P(20, hemY - 6)); c.quadraticCurveTo(...P(300, hemY + 8), ...P(580, hemY - 6)); c.stroke();
    c.strokeStyle = GOLDC; c.lineWidth = 5;
    c.setLineDash([7, 5]);
    c.beginPath(); c.moveTo(...P(20, hemY - 6)); c.quadraticCurveTo(...P(300, hemY + 8), ...P(580, hemY - 6)); c.stroke();
    c.setLineDash([]);
    if (!k.back) {
      const [tx, ty] = P(250, hemY + 4);
      c.strokeStyle = '#C98E12'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx - 6, ty + 18, tx - 4, ty + 30); c.stroke();
      const ts = new Path2D();
      ts.moveTo(tx - 10, ty + 28); ts.lineTo(tx + 2, ty + 28); ts.lineTo(tx + 6, ty + 50); ts.lineTo(tx - 14, ty + 50); ts.closePath();
      softFill(c, ts, tx, ty + 28, tx, ty + 50, '#FFF0A8', GOLDC, '#C98E12');
      outline(c, ts, k.pal, OL * 0.6);
      const kn = new Path2D(); kn.arc(tx - 4, ty + 27, 5.5, 0, TAU);
      softFill(c, kn, tx - 10, ty + 21, tx + 2, ty + 33, '#FFF0A8', GOLDC, '#C98E12'); outline(c, kn, k.pal, OL * 0.55);
    }
  },
  // ดาวเล็ก ๆ บนแขนเสื้อ (ต่อจากตัวเสื้อ)
  sleeveExtra(c, Q) {
    for (const [x, y, r] of [[176, 430, 6], [196, 470, 4], [160, 480, 5]]) { const [sx, sy] = Q(x, y); sparkStar(c, sx, sy, r); }
  },
};
/** กระโปรงทรงเอแบบมีธีม (ใช้ร่วม: พยาบาล = ค่าเดิม · พ่อมด = คลุมยาว) */
const ROBE_SK = {
  cols: WIZ, hem: GOLDC, fold: 'rgba(20,10,60,.3)',
  G: { stand: { y0: 520, y1: 608, x0: 180, x1: 420, fl: 26 }, sit: { y0: 536, y1: 636, x0: 170, x1: 430, fl: 58 } },
  extra(c, P, G) { for (const [x, y, r] of [[230, G.y0 + 40, 7], [356, G.y0 + 58, 6], [300, G.y1 - 18, 5]]) { const [sx, sy] = P(x, y); sparkStar(c, sx, sy, r); } },
};
/** หมวกพ่อมดกรวยสูง ปลายงอไปข้าง ปีกกว้าง แถบทอง ดาวทอง */
function wizardHat(c, k) {
  const pal = k.pal;
  c.save();
  rotAt(c, { x: 300, y: 130 }, -0.08);
  const cone = new Path2D();
  cone.moveTo(236, 122);
  cone.bezierCurveTo(258, 70, 284, 20, 312, -18);
  cone.quadraticCurveTo(344, -40, 372, -22);   // ปลายงอ
  cone.quadraticCurveTo(342, -20, 330, 6);
  cone.bezierCurveTo(338, 50, 356, 92, 366, 122);
  cone.closePath();
  softFill(c, cone, 280, -30, 330, 124, WIZ[0], WIZ[1], WIZ[2]);
  outline(c, cone, pal);
  const band = new Path2D();
  band.moveTo(240, 104); band.quadraticCurveTo(300, 92, 360, 104);
  band.lineTo(366, 122); band.quadraticCurveTo(300, 110, 236, 122); band.closePath();
  softFill(c, band, 300, 96, 300, 122, '#FFF0A8', GOLDC, '#D9A21E');
  outline(c, band, pal, OL * 0.75);
  const brim = new Path2D();
  brim.ellipse(300, 128, 104, 17, 0, 0, TAU);
  softFill(c, brim, 300, 112, 300, 146, WIZ[0], WIZ[1], WIZ[2]);
  outline(c, brim, pal);
  if (!k.back) {
    crescent(c, 296, 62, 14, pal);
    sparkStar(c, 324, 22, 7);
    sparkStar(c, 280, 90, 5);
    // ประกายวิบวับลอยรอบปลายหมวก
    const tw = 0.6 + 0.4 * Math.sin((k.t || 0) * 0.12);
    c.globalAlpha = tw;
    sparkStar(c, 392, -34, 8, '#FFF6C4');
    sparkStar(c, 404, -6, 5, '#FFF6C4');
    c.globalAlpha = 1;
  }
  c.restore();
}
/** เข็มกลัดดาวทองที่คอ */
function wizardClasp(c, k) {
  const pal = k.pal;
  const P = k.cpt || ((x, y) => [x, y]);
  // ปกแหลมพ่อมด (ผ้าคลุมไหล่สั้นปลายแหลมสามแฉกต่อข้าง) ขอบทอง — หัวบังขอบบน
  for (const d of [-1, 1]) {
    const M = (u, y) => P(300 + d * u, y);
    const cp = new Path2D();
    cp.moveTo(...M(0, 400));
    cp.quadraticCurveTo(...M(60, 380), ...M(118, 378));
    cp.lineTo(...M(128, 420));
    cp.lineTo(...M(104, 410));
    cp.lineTo(...M(92, 446));
    cp.lineTo(...M(66, 426));
    cp.lineTo(...M(44, 458));
    cp.lineTo(...M(26, 432));
    cp.lineTo(...M(0, 452));
    cp.closePath();
    const [ax, ay] = M(60, 384);
    softFill(c, cp, ax, ay, ax, ay + 70, '#6B5BD6', '#3E2F96', '#251B63');
    c.save(); c.clip(cp); c.strokeStyle = GOLDC; c.lineWidth = 6; c.lineJoin = 'round'; c.stroke(cp); c.restore();
    outline(c, cp, pal);
  }
  if (k.back) return;
  const [x, y] = P(300, 424);
  const fx = x + (k.cpt ? (k.hxShift || 0) : (k.faceShift || 0)) * 0.5;
  goldStar(c, fx, y, 17, pal);
}
/** พระจันทร์เสี้ยวทอง (รูปเสี้ยว — สองวงโค้ง) */
function crescent(c, x, y, r, pal) {
  const m = new Path2D();
  m.arc(x, y, r, Math.PI * 0.35, Math.PI * 1.65);
  m.arc(x + r * 0.45, y, r * 0.78, Math.PI * 1.52, Math.PI * 0.48, true);
  m.closePath();
  softFill(c, m, x - r, y - r, x + r, y + r, '#FFF0A8', GOLDC, '#C98E12');
  outline(c, m, pal, OL * 0.55);
}

// ══ โจรสลัดน้อย: เสื้อลายทางขาวแดงแขนสั้น · ผ้าคาดเอวแดงผูกข้าง · กางเกงน้ำตาลขาสั้นปะผ้า · หมวกสามเหลี่ยมหัวกะโหลก · ผ้าปิดตา ══
const PIR_T = {
  body: ['#FFFFFF', '#F6F3EE', '#DED6CB'], cuff: '#D8323C', cuffLine: null, hem: null, vneck: true, fold: 'rgba(120,100,80,.2)',
  // ลายทางต่อเนื่องจากตัวเสื้อไปแขนเสื้อ (ระดับ y เดียวกัน) — ไม่ขาดเป็นช่องขาวตรงรักแร้
  sleeveExtra(c) {
    c.strokeStyle = '#D8323C'; c.lineWidth = 10;
    for (let y = 380; y < 560; y += 24) { c.beginPath(); c.moveTo(-200, y + 5); c.lineTo(800, y + 5); c.stroke(); }
  },
  extra(c, P, k, hemY) {
    // ขอบคอวี: เส้นตัดคอเสื้อ (วาดในผืนเสื้อ หนาสองเท่า = เหลือครึ่งในเท่าเส้นอื่น)
    const vy = k.vy ?? (k.mode === 'sit' ? 46 : 0);
    const edge = () => { c.beginPath(); c.moveTo(...P(196, 360 + vy)); c.quadraticCurveTo(...P(250, 392 + vy), ...P(300, 436 + vy)); c.quadraticCurveTo(...P(350, 392 + vy), ...P(404, 360 + vy)); };
    // ลายทางแดงแนวนอน (ตามตัวดัดจุด)
    c.strokeStyle = '#D8323C'; c.lineWidth = 10; c.lineCap = 'butt';
    for (let y = 404; y < hemY - 4; y += 24) { c.beginPath(); c.moveTo(...P(20, y)); c.quadraticCurveTo(...P(300, y + 10), ...P(580, y)); c.stroke(); }
    // ผ้าคาดเอวแดง + ปมข้างขวา
    c.strokeStyle = '#B81F2C'; c.lineWidth = 18;
    c.beginPath(); c.moveTo(...P(20, hemY - 8)); c.quadraticCurveTo(...P(300, hemY + 6), ...P(580, hemY - 8)); c.stroke();
    if (!k.back) { edge(); c.strokeStyle = k.pal.line; c.lineWidth = OL * 2; c.lineJoin = 'round'; c.stroke(); }
  },
};
const PIR_P = { cols: ['#A5734A', '#7E5233', '#5B3820'], stripes: null, fold: 'rgba(0,0,0,.25)', seam: 'rgba(0,0,0,.4)', buttons: null,
  pattern(c, M, y0, y1) {
    // ผ้าปะสี่เหลี่ยม + ฝีเข็ม
    const [px, py] = M(246, y0 + 34);
    c.fillStyle = '#C99A62'; c.fillRect(px - 13, py - 11, 26, 22);
    c.strokeStyle = 'rgba(60,30,10,.7)'; c.lineWidth = 2; c.setLineDash([4, 4]); c.strokeRect(px - 13, py - 11, 26, 22); c.setLineDash([]);
  },
};
function pirateSash(c, k) {
  if (k.back) return;
  // ชายผ้าคาดเอวห้อยข้างขวา (วาดเป็นของบนคอไม่ได้ — อยู่ในเสื้อแล้ว) — เว้นว่าง
}
/** หมวกโจรสลัดทรงสามเหลี่ยม ขอบทอง หัวกะโหลกขาว */
function pirateHat(c, k) {
  const pal = k.pal;
  if (k.back && k.headPath) {
    // ด้านหลัง: สายผ้าปิดตาพาดเฉียงรอบท้ายทอย ผูกปมกลางหัว
    c.save();
    c.clip(k.headPath);
    c.strokeStyle = pal.line; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(130, 210); c.quadraticCurveTo(300, 176, 470, 200); c.stroke();
    c.restore();
    const kn = new Path2D(); kn.ellipse(300, 188, 9, 7, 0, 0, TAU);
    c.fillStyle = pal.line; c.fill(kn);
  }
  c.save();
  rotAt(c, { x: 300, y: 128 }, 0.06);
  c.translate(300, 130); c.scale(1.18, 1.18); c.translate(-300, -130);
  const crown = new Path2D();
  crown.moveTo(244, 128); crown.bezierCurveTo(244, 66, 356, 66, 356, 128); crown.closePath();
  softFill(c, crown, 300, 70, 300, 130, '#4A4458', '#2A2636', '#16141C');
  outline(c, crown, pal);
  const brim = new Path2D();
  brim.moveTo(196, 108);
  brim.quadraticCurveTo(250, 132, 300, 92);
  brim.quadraticCurveTo(350, 132, 404, 108);
  brim.quadraticCurveTo(396, 140, 300, 144);
  brim.quadraticCurveTo(204, 140, 196, 108);
  brim.closePath();
  softFill(c, brim, 300, 92, 300, 144, '#4A4458', '#2A2636', '#16141C');
  c.save(); c.clip(brim); c.strokeStyle = GOLDC; c.lineWidth = 7; c.stroke(brim); c.restore();
  outline(c, brim, pal);
  if (!k.back) {
    // หัวกะโหลกขาว + กระดูกไขว้
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(286, 128); c.lineTo(314, 106); c.moveTo(314, 128); c.lineTo(286, 106); c.stroke();
    c.fillStyle = '#FFFFFF';
    c.beginPath(); c.arc(300, 112, 9, 0, TAU); c.fill();
    c.fillStyle = '#16141C';
    c.beginPath(); c.arc(296, 111, 2.4, 0, TAU); c.arc(304, 111, 2.4, 0, TAU); c.fill();
  }
  c.restore();
}
/** ผ้าปิดตาดำข้างขวาจอ + สายคาดเฉียงข้ามหน้าผาก */
function eyePatch(c, k) {
  const pal = k.pal;
  const e = EYE_WHITE.right;
  const F = k.fx || ((x) => x);   // ตำแหน่ง x บนผิวหัวหลังหัน (ชุดเดียวกับตา)
  c.save();
  c.strokeStyle = pal.line; c.lineWidth = 5; c.lineCap = 'round';
  // สายเริ่มในผ้าปิดตา (ผ้าทับปลาย) → ซ้าย: ข้ามหน้าผากไปถึงขอบหัว · ขวา: ออกข้างไปถึงขอบหัว
  // สายยาวเลยขอบหัวทั้งสองข้าง แล้วตัดตามรูปหัว = พันเต็มหัวทุกมุมหัน
  c.save();
  if (k.headPath) c.clip(k.headPath);
  c.beginPath(); c.moveTo(F(e.x - 20), e.y - 16); c.quadraticCurveTo(F(300), 186, 80, 200); c.stroke();
  c.beginPath(); c.moveTo(F(e.x + 20), e.y - 10); c.quadraticCurveTo(F(e.x + 60), e.y - 30, 520, 236); c.stroke();
  c.restore();
  // ผ้าปิดตา: กลางตามตา บีบแนวนอนตามความเอียงของผิว (เหมือนตา)
  const cx = F(e.x), sx = Math.max(0.45, (F(e.x + 10) - F(e.x - 10)) / 20);
  const pt = new Path2D();
  pt.ellipse(cx, e.y + 2, 55 * sx, 52, 0.1, 0, TAU);   // ใหญ่กว่าตา (r 49) — ไม่มีขอบตาสีทองโผล่
  softFill(c, pt, cx, e.y - 50, cx, e.y + 54, '#4A4458', '#26222F', '#121018');
  outline(c, pt, pal);
  c.fillStyle = 'rgba(255,255,255,.35)';
  c.beginPath(); c.ellipse(cx - 16 * sx, e.y - 16, 14 * sx, 6, -0.5, 0, TAU); c.fill();
  c.restore();
}
eyePatch.fx = true;

// ══ นินจาส้ม: ชุดนินจาส้มแขนยาว ปกไขว้กรมท่า เข็มขัดผ้ากรมท่าผูกปม · กางเกงกรมท่าพันแข้ง · ผ้าคาดหัวกรมท่าแผ่นเหล็ก ชายปลิว ══
const NJ = ['#FFC07A', '#F58A2C', '#C9621A'];
const NAVYD = ['#4C5C8C', '#2F3B63', '#1E2645'];
const NINJA_T = {
  body: NJ, cuff: NAVYD[1], cuffLine: null, hem: NAVYD[1], vneck: false, fold: 'rgba(120,50,0,.28)', cuffAt: 126,
  extra(c, P, k, hemY) {
    if (!k.back) {
      // ปกเสื้อไขว้ (ซ้ายทับขวา) สีกรมท่า
      for (const d of [1, -1]) {
        const lp = new Path2D();
        lp.moveTo(...P(300 + d * 56, 360)); lp.lineTo(...P(300 + d * 84, 368));
        lp.lineTo(...P(300 - d * 30, hemY - 2)); lp.lineTo(...P(300 - d * 62, hemY - 2));   // ลงถึงใต้เข็มขัด — เข็มขัดวาดทับปลายสาย
        lp.closePath();
        const [ax, ay] = P(300, 400);
        softFill(c, lp, ax, ay - 30, ax, ay + 100, NAVYD[0], NAVYD[1], NAVYD[2]);
        outline(c, lp, k.pal, OL * 0.75);
      }
    }
    // เข็มขัดผ้ากรมท่า
    c.strokeStyle = NAVYD[1]; c.lineWidth = 20; c.lineCap = 'butt';
    c.beginPath(); c.moveTo(...P(20, hemY - 14)); c.quadraticCurveTo(...P(300, hemY), ...P(580, hemY - 14)); c.stroke();
    if (!k.back) {
      // ปมเข็มขัด + ชายผ้าสองเส้น
      const [kx, ky] = P(330, hemY - 12);
      const kt = new Path2D(); kt.ellipse(kx, ky, 12, 10, 0, 0, TAU);
      softFill(c, kt, kx - 12, ky - 10, kx + 12, ky + 10, NAVYD[0], NAVYD[1], NAVYD[2]);
      outline(c, kt, k.pal, OL * 0.7);
      for (const [dx, a] of [[-4, 0.2], [6, -0.25]]) {
        c.save(); c.translate(kx + dx, ky + 6); c.rotate(a);
        const t = new Path2D(); t.moveTo(-5, 0); t.lineTo(5, 0); t.lineTo(6, 34); t.lineTo(-6, 34); t.closePath();
        softFill(c, t, 0, 0, 0, 34, NAVYD[0], NAVYD[1], NAVYD[2]); outline(c, t, k.pal, OL * 0.6);
        c.restore();
      }
    }
  },
};
const NINJA_P = { cols: NAVYD, stripes: 'rgba(255,255,255,.7)', fold: 'rgba(0,0,0,.25)', seam: 'rgba(0,0,0,.4)', buttons: null };
/** ผ้าคาดหัวกรมท่า แผ่นเหล็กสลักลายใบไม้ ชายผ้าสองเส้นปลิวข้างหัว */
/** ชายผ้าคาดหัวสองเส้น (เริ่มในหัว ปลายปลิวออกข้างขวาจอ) */
function ninjaTailPaths(t) {
  const fl = Math.sin((t || 0) * 0.09) * 6;
  // สองเส้นเรียงกัน ความสูงรวมเท่าผ้าคาดหัวตรงขอบหัว (y 153–186) — ต่อกับผ้าคาดหัวพอดีไม่มีขั้น
  return [[153.6, 169, 0], [169, 184, -6]].map(([y0, y1, dx]) => {
    const q = new Path2D();
    q.moveTo(380, y0 - 0.4);
    q.quadraticCurveTo(470, y0 - 4 + fl, 516 + dx, y0 + 12 + fl * 1.6);
    q.lineTo(510 + dx, y1 + 10 + fl * 1.6);
    q.quadraticCurveTo(466, y1 - 2 + fl, 380, y1 - 0.6);
    q.closePath();
    return q;
  });
}
/** มุมหน้า: ชายผ้าโผล่จากหลังหัว (วาดก่อนหัว หัวบังโคน) */
function ninjaTailsBehind(c, k) {
  for (const q of ninjaTailPaths(k.t)) {
    softFill(c, q, 390, 160, 520, 200, NAVYD[0], NAVYD[1], NAVYD[2]);
    outline(c, q, k.pal, OL * 0.8);
  }
}
function ninjaBand(c, k) {
  const pal = k.pal;
  // ผ้าคาดหัวพันรอบหัว: ไม่เลื่อนทั้งชิ้นแบบหมวก (ยกเลิกการเลื่อน) — ตัดตามขอบหัวจริง ผ้าเต็มหัวทุกมุม
  // แผ่นเหล็กหน้าผากเลื่อนตามผิวหัวแบบตา (k.fx)
  c.save();
  c.translate(-(k.shift || 0), 0);
  const F = k.fx || ((x) => x);
  const band = new Path2D();
  band.moveTo(100, 160); band.quadraticCurveTo(300, 140, 500, 160);
  band.lineTo(500, 192); band.quadraticCurveTo(300, 172, 100, 192); band.closePath();
  const tails = k.back ? ninjaTailPaths(k.t) : [];
  // มุมหลัง: ผ้าคาดหัว + ชายผ้า = ผ้าผืนเดียว (เส้นหนาของทุกชิ้นก่อน แล้วลงเนื้อทับ = เหลือขอบนอกเส้นเดียว)
  c.strokeStyle = pal.line; c.lineWidth = OL * 2; c.lineJoin = 'round';
  for (const q of tails) c.stroke(q);
  c.save(); if (k.headPath) c.clip(k.headPath);
  c.beginPath(); c.moveTo(100, 160); c.quadraticCurveTo(300, 140, 500, 160); c.moveTo(500, 192); c.quadraticCurveTo(300, 172, 100, 192);
  c.lineWidth = OL; c.stroke();
  c.restore();
  for (const q of tails) softFill(c, q, 300, 150, 300, 192, NAVYD[0], NAVYD[1], NAVYD[2]);
  c.save(); if (k.headPath) c.clip(k.headPath);
  softFill(c, band, 300, 150, 300, 192, NAVYD[0], NAVYD[1], NAVYD[2]);
  // ขอบบน-ล่างผ้าคาดหัว (ลงหลังเนื้อ) — มุมหลังเว้นช่วงที่ต่อกับชายผ้า เส้นจะได้ไม่คั่นกลางผ้า
  c.strokeStyle = pal.line; c.lineWidth = OL;
  if (k.back) { const cut = new Path2D(); cut.rect(-600, -600, 960, 2000); c.clip(cut); }
  c.beginPath(); c.moveTo(100, 160); c.quadraticCurveTo(300, 140, 500, 160); c.moveTo(500, 192); c.quadraticCurveTo(300, 172, 100, 192); c.stroke();
  c.restore();
  if (k.back) {
    // เส้นแบ่งชายผ้าสองเส้น (เฉพาะส่วนที่พ้นหัว)
    const fl = Math.sin((k.t || 0) * 0.09) * 6;
    c.save();
    if (k.headPath) { const out = new Path2D(); out.rect(-600, -600, 1800, 2000); out.addPath(k.headPath); c.clip(out, 'evenodd'); }
    c.strokeStyle = pal.line; c.lineWidth = OL * 0.8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(432, 167 + fl * 0.4); c.quadraticCurveTo(474, 166 + fl, 512, 180 + fl * 1.6); c.stroke();   // เริ่มพ้นขอบหัว/โคนหู
    c.restore();
  }
  if (!k.back) {
    const cx = F(300), sx = Math.max(0.5, (F(310) - F(290)) / 20);
    c.save();
    c.translate(cx, 0); c.scale(sx, 1); c.translate(-300, 0);
    const pl = new Path2D(); pl.roundRect(266, 148, 68, 34, 8);
    softFill(c, pl, 300, 148, 300, 182, '#FFFFFF', '#C4CAD6', '#7D8698');
    outline(c, pl, pal, OL * 0.8);
    // ลายใบไม้สลัก
    c.strokeStyle = 'rgba(40,50,70,.7)'; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(290, 172); c.quadraticCurveTo(300, 150, 312, 160); c.quadraticCurveTo(306, 172, 290, 172); c.moveTo(290, 172); c.lineTo(308, 160); c.stroke();
    c.restore();
  }
  c.restore();
}


// ══ ตัวช่วยแสง/ประกายพื้นฐาน (ใช้ร่วมหลายชุด) — ชุดองค์หญิงหิมะแบบใหม่อยู่ที่ "องค์หญิงหิมะ (Snow Princess Meow" ══
/** แสงฟุ้ง (บวกแสง) */
function glowAt(c, x, y, r, rgb, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
}
/** เกล็ดหิมะหกแฉก (เส้นขาว มีกิ่ง) */
function snowflake(c, x, y, r, rot = 0, col = '#FFFFFF', w = 2.4) {
  c.save();
  c.translate(x, y); c.rotate(rot);
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    c.rotate(Math.PI / 3);
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(0, -r);
    c.moveTo(0, -r * 0.55); c.lineTo(-r * 0.25, -r * 0.75);
    c.moveTo(0, -r * 0.55); c.lineTo(r * 0.25, -r * 0.75);
    c.stroke();
  }
  c.restore();
}
/** ประกายสี่แฉกเรือง */
function twinkle(c, x, y, r, a) {
  if (a <= 0.02) return;
  c.save();
  c.globalAlpha = a;
  glowAt(c, x, y, r * 2.2, '200,235,255', 0.6);
  sparkStar(c, x, y, r, '#FFFFFF');
  c.restore();
}


// ══ ลูกคุณหนูจอมซน (ระดับ S): ออร่าทองเรือง ลำแสงทองหมุน เหรียญทองลอยหมุนรอบตัว · ผ้าคลุมสั้นแดงซับทอง
//    เสื้อเชิ้ตขาว + กั๊กแดงลายทองกระดุมทอง · ระบายคอลูกไม้ เข็มกลัดทับทิม · กางเกงขาสั้นดำแถบทอง
//    · หมวกทรงสูงเอียงกวน ๆ แถบแดง ขนนก · แว่นข้างเดียวทองมีโซ่ ══
const NRED = ['#FF7A7A', '#D9343F', '#A01F2C'];
const NGOLD = ['#FFF4BE', '#FFD24A', '#D9A21E'];
/** เหรียญทอง (หมุนด้วยการบีบแนวนอน spin 0..1) */
function goldCoin(c, x, y, r, spin, pal) {
  const sx = Math.max(0.15, Math.abs(Math.cos(spin * Math.PI)));
  c.save();
  c.translate(x, y); c.scale(sx, 1);
  const b = new Path2D(); b.arc(0, 0, r, 0, TAU);
  softFill(c, b, -r, -r, r, r, NGOLD[0], NGOLD[1], NGOLD[2]);
  c.strokeStyle = pal.line; c.lineWidth = 2.6 / sx; c.stroke(b);
  c.strokeStyle = 'rgba(160,100,10,.6)'; c.lineWidth = 1.8;
  c.beginPath(); c.arc(0, 0, r * 0.68, 0, TAU); c.stroke();
  c.fillStyle = 'rgba(160,100,10,.75)'; c.font = `bold ${r * 1.1}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('$', 0, 1);
  c.restore();
}
/** หลังตัว: ออร่าทอง ลำแสงทองหมุน ผ้าคลุมแดงซับทอง เหรียญ/ประกายทองลอยวน */
function nobleBehind(c, k) {
  const t = k.t || 0, pal = k.pal;
  const pulse = 0.85 + 0.15 * Math.sin(t * 0.05);
  glowAt(c, 300, 430, 320 * pulse, '255,205,90', 0.4);
  glowAt(c, 300, 330, 180, '255,240,190', 0.3);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.translate(300, 400);
  c.rotate(-t * 0.005);
  for (let i = 0; i < 10; i++) {
    c.rotate(TAU / 10);
    const g = c.createLinearGradient(0, 0, 0, -380);
    g.addColorStop(0, 'rgba(255,215,110,.2)');
    g.addColorStop(1, 'rgba(255,215,110,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-10, 0); c.lineTo(-36, -380); c.lineTo(36, -380); c.lineTo(10, 0); c.closePath(); c.fill();
  }
  c.restore();
  // ผ้าคลุมสั้นแดง ซับในทอง (ปลายพลิ้ว) — คลุมไหล่ลงถึงสะโพก
  const sw = Math.sin(t * 0.05) * 5;
  const cape = new Path2D();
  cape.moveTo(200, 386);
  cape.bezierCurveTo(150, 440, 132 + sw, 520, 120 + sw, 590);
  cape.quadraticCurveTo(210, 612, 300, 600);
  cape.quadraticCurveTo(390, 612, 480 + sw, 590);
  cape.bezierCurveTo(468 + sw, 520, 450, 440, 400, 386);
  cape.closePath();
  softFill(c, cape, 300, 386, 300, 610, NRED[0], NRED[1], NRED[2]);
  c.save(); c.clip(cape);
  c.strokeStyle = NGOLD[1]; c.lineWidth = 10; c.stroke(cape);
  c.restore();
  outline(c, cape, pal);
  // เหรียญทอง + ประกายลอยวนรอบตัว (ช่วงหน้าตัวไม่วาด)
  for (let i = 0; i < 10; i++) {
    const a = t * 0.01 + (i * TAU) / 10;
    const x = 300 + Math.cos(a) * 260, y = 420 + Math.sin(a) * 200;
    const bob = Math.sin(t * 0.06 + i) * 8;
    c.save(); c.globalAlpha = 0.75 + 0.25 * Math.sin(t * 0.07 + i);
    if (i % 2) goldCoin(c, x, y + bob, 20, t * 0.02 + i * 0.3, pal);
    else twinkle(c, x, y + bob, 7, 1);
    c.restore();
  }
}
/** เสื้อเชิ้ตขาว + กั๊กแดงลายทอง เปิดกลางอก กระดุมทอง */
const NOBLE_T = {
  body: ['#FFFFFF', '#F6F4F0', '#DDD8CF'], cuff: '#FFFFFF', cuffLine: NGOLD[1], hem: null, vneck: false, fold: 'rgba(120,100,80,.18)',
  extra(c, P, k, hemY) {
    const pal = k.pal;
    for (const d of [-1, 1]) {
      const X = (u) => 300 + d * u;
      const v = new Path2D();
      v.moveTo(...P(X(k.back ? -2 : 26), 372));
      v.lineTo(...P(X(260), 360));
      v.lineTo(...P(X(260), hemY + 4));
      v.lineTo(...P(X(k.back ? -2 : 18), hemY + 4));
      v.closePath();
      const [, vy] = P(300, 380);
      softFill(c, v, 0, vy, 0, vy + 150, NRED[0], NRED[1], NRED[2]);
      c.save(); c.clip(v);
      // ลายเพสลีย์ทองจาง ๆ + ขอบทอง
      c.strokeStyle = 'rgba(255,215,90,.35)'; c.lineWidth = 2;
      for (let y = 392; y < hemY; y += 26) { const [px, py] = P(X(70), y); c.beginPath(); c.arc(px, py, 6, 0, TAU); c.stroke(); }
      c.strokeStyle = NGOLD[1]; c.lineWidth = 7; c.stroke(v);
      c.restore();
      outline(c, v, pal, OL * 0.85);
    }
    if (!k.back) {
      for (const y of [446, 476, 506]) for (const d of [-1, 1]) {
        const [bx, by] = P(300 + d * 34, y);
        const b = new Path2D(); b.arc(bx, by, 6, 0, TAU);
        softFill(c, b, bx - 6, by - 6, bx + 6, by + 6, NGOLD[0], NGOLD[1], NGOLD[2]);
        outline(c, b, pal, OL * 0.5);
      }
    }
  },
};
/** ระบายคอลูกไม้ขาว (jabot) ซ้อนสามชั้น + เข็มกลัดทับทิมกรอบทอง */
function nobleNeck(c, k) {
  if (k.back) return;
  const pal = k.pal;
  const P = k.cpt || ((x, y) => [x, y]);
  const fx = P(300, 440)[0] + (k.cpt ? (k.hxShift || 0) : (k.faceShift || 0)) * 0.5;
  for (const [y, w] of [[480, 34], [458, 30], [436, 26]]) {
    const r = new Path2D();
    r.moveTo(fx - w, y - 22);
    for (let i = 0; i <= 5; i++) { const x = fx - w + (2 * w * i) / 5; r.quadraticCurveTo(x - w / 5, y + 8, x, y); }
    r.lineTo(fx + w * 0.4, y - 26); r.lineTo(fx - w * 0.4, y - 26); r.closePath();
    softFill(c, r, fx, y - 26, fx, y + 6, '#FFFFFF', '#F7F3EE', '#E0D8CC');
    outline(c, r, pal, OL * 0.65);
  }
  const t = k.t || 0;
  glowAt(c, fx, 420, 34, '255,90,110', 0.4 + 0.2 * Math.sin(t * 0.08));
  const fr = new Path2D(); fr.ellipse(fx, 420, 15, 13, 0, 0, TAU);
  softFill(c, fr, fx - 15, 407, fx + 15, 433, NGOLD[0], NGOLD[1], NGOLD[2]);
  outline(c, fr, pal, OL * 0.7);
  const gem = new Path2D(); gem.ellipse(fx, 420, 9, 8, 0, 0, TAU);
  const g = c.createRadialGradient(fx - 3, 417, 1, fx, 420, 9);
  g.addColorStop(0, '#FFD0D6'); g.addColorStop(0.5, '#E5294B'); g.addColorStop(1, '#8A0F24');
  c.fillStyle = g; c.fill(gem); outline(c, gem, pal, OL * 0.5);
  twinkle(c, fx + 6, 414, 5, 0.5 + 0.5 * Math.sin(t * 0.12));
}
/** กางเกงขาสั้นดำแถบทอง */
const NOBLE_P = { cols: ['#4A4458', '#2A2636', '#16141C'], stripes: NGOLD[1], fold: 'rgba(255,255,255,.12)', seam: 'rgba(255,255,255,.18)', buttons: null };
/** หมวกทรงสูงเอียงกวน ๆ: ดำเงา แถบแดงขอบทอง ขนนกทอง ประกายวิบวับ */
function nobleHat(c, k) {
  const pal = k.pal, t = k.t || 0;
  c.save();
  rotAt(c, { x: 300, y: 130 }, -0.16);
  // ขนนก (หลังหมวก)
  const fe = new Path2D();
  fe.moveTo(350, 96); fe.bezierCurveTo(380, 60, 400, 30, 386 + Math.sin(t * 0.06) * 4, 0);
  fe.bezierCurveTo(376, 30, 360, 60, 344, 92); fe.closePath();
  softFill(c, fe, 350, 0, 380, 96, NGOLD[0], NGOLD[1], NGOLD[2]);
  outline(c, fe, pal, OL * 0.7);
  const top = new Path2D();
  top.moveTo(250, 126); top.lineTo(256, 30); top.quadraticCurveTo(300, 20, 344, 30); top.lineTo(350, 126); top.closePath();
  softFill(c, top, 300, 24, 300, 126, '#5A5468', '#2A2636', '#16141C');
  c.save(); c.clip(top);
  c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 8;
  c.beginPath(); c.moveTo(274, 36); c.lineTo(270, 120); c.stroke();
  c.restore();
  outline(c, top, pal);
  const band = new Path2D();
  band.moveTo(253, 92); band.quadraticCurveTo(300, 100, 347, 92); band.lineTo(349, 116); band.quadraticCurveTo(300, 124, 251, 116); band.closePath();
  softFill(c, band, 300, 92, 300, 120, NRED[0], NRED[1], NRED[2]);
  c.save(); c.clip(band); c.strokeStyle = NGOLD[1]; c.lineWidth = 5; c.stroke(band); c.restore();
  outline(c, band, pal, OL * 0.8);
  const brim = new Path2D(); brim.ellipse(300, 128, 74, 13, 0, 0, TAU);
  softFill(c, brim, 300, 114, 300, 142, '#5A5468', '#2A2636', '#16141C');
  outline(c, brim, pal);
  if (!k.back) twinkle(c, 268, 50, 8, 0.4 + 0.6 * Math.abs(Math.sin(t * 0.05)));
  c.restore();
}
/** แว่นข้างเดียว (ตาขวาจอ) กรอบทอง เลนส์ใส มีโซ่ทองห้อย */
function monocle(c, k) {
  const pal = k.pal, t = k.t || 0;
  const e = EYE_WHITE.right;
  const F = k.fx || ((x) => x);
  const cx = F(e.x), sx = Math.max(0.45, (F(e.x + 10) - F(e.x - 10)) / 20);
  // โซ่ทองห้อยลงข้างแก้ม
  c.strokeStyle = NGOLD[2]; c.lineWidth = 3; c.setLineDash([5, 4]);
  c.beginPath(); c.moveTo(cx + 54 * sx, e.y + 14); c.quadraticCurveTo(cx + 66 * sx, e.y + 70, cx + 30 * sx, e.y + 108); c.stroke();
  c.setLineDash([]);
  c.save();
  c.translate(cx, e.y); c.scale(sx, 1);
  const lens = new Path2D(); lens.arc(0, 0, 58, 0, TAU);
  c.fillStyle = 'rgba(220,240,255,.18)'; c.fill(lens);
  c.strokeStyle = pal.line; c.lineWidth = 11; c.stroke(lens);
  const rg = c.createLinearGradient(-58, -58, 58, 58);
  rg.addColorStop(0, NGOLD[0]); rg.addColorStop(0.5, NGOLD[1]); rg.addColorStop(1, NGOLD[2]);
  c.strokeStyle = rg; c.lineWidth = 6; c.stroke(lens);
  // ประกายเลนส์วิ่ง
  c.save(); c.clip(lens);
  const sh = ((t * 1.6) % 240) - 120;
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 10;
  c.beginPath(); c.moveTo(sh - 40, -70); c.lineTo(sh + 40, 70); c.stroke();
  c.restore();
  c.restore();
}
monocle.fx = true;


// ══ ชุดระดับ S ที่เหลือ (ร่างแรก — จูนทีหลัง) · ใช้ตัวช่วยออร่าร่วมกัน ══
/** ออร่าระดับ S: แสงฟุ้งเต้น + ลำแสงหมุน + ของลอยวนรอบตัว (o.item(c, x, y, i, a, t)) */
function sAura(c, k, o) {
  const t = k.t || 0;
  const pulse = 0.85 + 0.15 * Math.sin(t * 0.05);
  const glow = typeof o.glow === 'function' ? o.glow(t) : o.glow;
  glowAt(c, 300, 430, 320 * pulse, glow, 0.4);
  glowAt(c, 300, 330, 180, '255,250,240', 0.28);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.translate(300, 400);
  c.rotate(t * (o.spin || 0.004));
  const n = o.rays || 12;
  for (let i = 0; i < n; i++) {
    c.rotate(TAU / n);
    const rc = typeof o.ray === 'function' ? o.ray(i, t) : o.ray;
    const g = c.createLinearGradient(0, 0, 0, -370);
    g.addColorStop(0, `rgba(${rc},.2)`);
    g.addColorStop(1, `rgba(${rc},0)`);
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-9, 0); c.lineTo(-32, -370); c.lineTo(32, -370); c.lineTo(9, 0); c.closePath(); c.fill();
  }
  c.restore();
  if (o.cape) o.cape(c, k, t);
  const m = o.n || 10;
  for (let i = 0; i < m; i++) {
    const a = t * (o.orbit || 0.01) + (i * TAU) / m;
    const x = 300 + Math.cos(a) * 262, y = 420 + Math.sin(a) * 205 + Math.sin(t * 0.06 + i) * 8;
    c.save(); c.globalAlpha = 0.8 + 0.2 * Math.sin(t * 0.07 + i);
    o.item(c, x, y, i, a, t);
    c.restore();
  }
}
/** ผ้าคลุมยาวหลังตัว (ไล่สีสามระดับ ชายคลื่น ขอบสี) */
function longCape(c, k, t, cols, edge, alpha = 1) {
  const sw = Math.sin(t * 0.045) * 6;
  const cape = new Path2D();
  cape.moveTo(204, 384);
  cape.bezierCurveTo(152, 460, 108 + sw, 560, 94 + sw, 652);
  for (let i = 0; i < 7; i++) {
    const x0 = 94 + sw + (412 / 7) * i, x1 = 94 + sw + (412 / 7) * (i + 1);
    cape.quadraticCurveTo((x0 + x1) / 2, 674, x1, 652);
  }
  cape.bezierCurveTo(492 + sw, 560, 448, 460, 396, 384);
  cape.closePath();
  c.save();
  c.globalAlpha = alpha;
  softFill(c, cape, 300, 384, 300, 670, cols[0], cols[1], cols[2]);
  c.restore();
  if (edge) { c.save(); c.clip(cape); c.strokeStyle = edge; c.lineWidth = 10; c.stroke(cape); c.restore(); }
  outline(c, cape, k.pal, OL * 0.85);
  return cape;
}
/** หัวใจเล็ก */
function miniHeart(c, x, y, r, col, pal) {
  const h = new Path2D();
  h.moveTo(x, y + r * 0.9);
  h.bezierCurveTo(x - r * 1.4, y, x - r * 0.8, y - r * 1.2, x, y - r * 0.4);
  h.bezierCurveTo(x + r * 0.8, y - r * 1.2, x + r * 1.4, y, x, y + r * 0.9);
  c.fillStyle = col; c.fill(h);
  if (pal) outline(c, h, pal, 2.2);
}

// ── ปาร์ตี้ผลไม้รวม ──
function strawberry(c, x, y, r, pal, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  const b = new Path2D();
  b.moveTo(0, r * 1.1); b.bezierCurveTo(-r * 1.3, r * 0.2, -r * 1.0, -r * 0.9, 0, -r * 0.7); b.bezierCurveTo(r * 1.0, -r * 0.9, r * 1.3, r * 0.2, 0, r * 1.1); b.closePath();
  softFill(c, b, 0, -r, 0, r, '#FF8A8A', '#F0384A', '#B81F33');
  c.fillStyle = '#FFE9A8';
  for (const [sx, sy] of [[-0.4, -0.1], [0.35, -0.15], [0, 0.25], [-0.3, 0.5], [0.3, 0.5]]) { c.beginPath(); c.ellipse(sx * r, sy * r, r * 0.08, r * 0.12, 0, 0, TAU); c.fill(); }
  outline(c, b, pal, 2.4);
  const lf = new Path2D();
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.55; lf.moveTo(0, -r * 0.7); lf.lineTo(Math.cos(a) * r * 0.75, -r * 0.7 + Math.sin(a) * r * 0.45); }
  c.strokeStyle = '#3FA34D'; c.lineWidth = r * 0.28; c.lineCap = 'round'; c.stroke(lf);
  c.restore();
}
function orangeSlice(c, x, y, r, pal, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  const b = new Path2D(); b.arc(0, 0, r, 0, TAU);
  c.fillStyle = '#FF9F1C'; c.fill(b);
  c.fillStyle = '#FFD27A'; c.beginPath(); c.arc(0, 0, r * 0.8, 0, TAU); c.fill();
  c.strokeStyle = '#FFF4D6'; c.lineWidth = r * 0.1;
  for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78); c.stroke(); }
  outline(c, b, pal, 2.4);
  c.restore();
}
function cherry(c, x, y, r, pal) {
  c.strokeStyle = '#3F8A3A'; c.lineWidth = 2.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - r, y); c.quadraticCurveTo(x - r * 0.4, y - r * 2.2, x + r * 0.4, y - r * 2.4); c.moveTo(x + r, y + r * 0.3); c.quadraticCurveTo(x + r * 0.8, y - r * 1.5, x + r * 0.4, y - r * 2.4); c.stroke();
  for (const [cx, cy] of [[x - r, y], [x + r, y + r * 0.3]]) {
    const b = new Path2D(); b.arc(cx, cy, r, 0, TAU);
    softFill(c, b, cx - r, cy - r, cx + r, cy + r, '#FF7A8A', '#E0233F', '#9A1229');
    outline(c, b, pal, 2.2);
    c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(cx - r * 0.35, cy - r * 0.35, r * 0.25, 0, TAU); c.fill();
  }
}
const FRUIT_T = {
  body: ['#FFF3A8', '#FFD45A', '#F2A72A'], cuff: '#7ED957', cuffLine: '#FFFFFF', hem: '#7ED957', vneck: false, fold: 'rgba(200,120,0,.22)',
  extra(c, P, k) { for (const [x, y, i] of [[236, 446, 0], [362, 470, 1], [300, 500, 2]]) { const [sx, sy] = P(x, y); if (i === 1) orangeSlice(c, sx, sy, 13, k.pal, 0.3); else strawberry(c, sx, sy, 12, k.pal, i ? -0.2 : 0.2); } },
};
const WATERMELON = { light: '#FFC2C8', mid: '#FF6F86', dark: '#E8415C', deep: '#B92A44', pleat: 'rgba(150,20,40,.3)', under: '#8FE07A', bowC: { light: '#C9F7A8', mid: '#7ED957', dark: '#4FB43A', deep: '#2E8A24', fold: 'rgba(30,90,20,.4)' }, dots: false };
function fruitNeck(c, k) {
  if (k.back) return;
  const P = k.cpt || ((x, y) => [x, y]);
  // สร้อยเชอร์รี่สองพวง
  for (const d of [-1, 1]) { const [x, y] = P(300 + d * 40, 432); cherry(c, x, y, 10, k.pal); }
}
function fruitHat(c, k) {
  // หมวกเบเร่ต์สตรอว์เบอร์รี่ใหญ่ ใบเขียวด้านบน
  c.save();
  rotAt(c, { x: 300, y: 128 }, 0.12);
  const ber = new Path2D();
  ber.ellipse(300, 104, 92, 40, 0, 0, TAU);
  softFill(c, ber, 300, 64, 300, 144, '#FF8A8A', '#F0384A', '#B81F33');
  c.save(); c.clip(ber);
  c.fillStyle = '#FFE9A8';
  for (let i = 0; i < 14; i++) { const x = 220 + ((i * 37) % 160), y = 80 + ((i * 23) % 50); c.beginPath(); c.ellipse(x, y, 3, 4.5, 0, 0, TAU); c.fill(); }
  c.restore();
  outline(c, ber, k.pal);
  const lf = new Path2D();
  for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6; lf.moveTo(300, 66); lf.quadraticCurveTo(300 + Math.cos(a) * 40, 66 + Math.sin(a) * 16 - 10, 300 + Math.cos(a) * 48, 62 + Math.sin(a) * 18); }
  c.strokeStyle = '#3FA34D'; c.lineWidth = 9; c.lineCap = 'round'; c.stroke(lf);
  c.strokeStyle = '#2E7D32'; c.lineWidth = 6; c.beginPath(); c.moveTo(300, 66); c.lineTo(306, 40); c.stroke();
  c.restore();
}
function fruitBehind(c, k) {
  sAura(c, k, {
    glow: '255,170,120', ray: '255,200,120', n: 9,
    item(c2, x, y, i, a, t) { if (i % 3 === 0) strawberry(c2, x, y, 16, k.pal, a); else if (i % 3 === 1) orangeSlice(c2, x, y, 15, k.pal, a); else cherry(c2, x, y, 10, k.pal); },
  });
}

// ══ เหมียวขนมหวานมหัศจรรย์ (Sweet Magic Meow · ระดับ S) — รื้อวาดใหม่ทั้งชุดตามบอร์ดออกแบบผู้ใช้ ══
// ทุกชิ้นวาดเฉพาะชุดนี้ (ไม่ใช้เสื้อ/กระโปรง/โบว์แม่แบบของชุดอื่น):
//   ตัวเสื้อชมพูสตรอว์เบอร์รี่มิลค์ลายหัวใจ แผงอกครีมผูกเชือกมิ้นต์ ตาไก่ทอง ขอบลูกไม้ · แขนพองจับจีบ ปลายลูกไม้ แถบมิ้นต์มุก
//   ปกกลีบลูกไม้ชมพู + วิปครีมฟู · โบว์ซาตินใหญ่ หัวใจคริสตัลเจียระไน
//   กระโปรงสามชั้น: กระโปรงซับลูกไม้ขาว · ทูลเล่มิ้นต์-ฟ้า · ผ้าชมพูจับจีบรั้งเป็นสวากสามช่วง โบว์มิ้นต์ตรงจุดรั้ง
//   ขอบเอวไอซิ่งไหลย้อยโรยเม็ดสายรุ้ง หัวเข็มขัดหัวใจคริสตัล · โบว์สะโพกหางยาว · ชาร์มคัพเค้กห้อยโซ่ทอง
//   ถุงเท้าลูกไม้โบว์ชมพู · โบว์หาง + กระดิ่งทอง · หมวกคัพเค้กยักษ์ เชอร์รี่ มงกุฎทองจิ๋ว · โบว์หูริบบิ้นยาวพลิ้ว
//   คทาคัพเค้ก: ถืออยู่ในอุ้งเท้าตลอด — อุ้งเท้าไม่ว่าง/นั่ง/หมอบ = ลอยเรืองข้างตัว (เลื่อนไปมาเนียน ๆ)
//   เอฟเฟกต์: แสงชมพูฟุ้ง ลำแสงพาสเทลหมุนสวนกัน วงแสงกระเพื่อม ริบบิ้นรุ้งวนเกลียวรอบตัว (อ้อมหลัง-ผ่านหน้า)
//   ขนมลอยวนมีมิติ (ใกล้ใหญ่ ไกลเล็ก) ประกายดาวลอยขึ้น หัวใจลอย
const SW = {
  // ชมพูบาร์บี้ (ผู้ใช้เลือก): อ่อนสุด #FFADDA → #FF77C1 → #FF51B0 → #FF33A1 → เข้มสุด #FF008C
  pink: ['#FFADDA', '#FF77C1', '#FF51B0'],
  hot: ['#FF77C1', '#FF33A1', '#FF008C'],
  milk: ['#FFFFFF', '#FFF2F8', '#FFD9EB'],
  cream: ['#FFFFFF', '#FFF6E6', '#F5DDBE'],
  mint: ['#EAFFF9', '#9AF5DE', '#52DDBA'], mintDeep: '#2CB894',
  sky: ['#EEF9FF', '#A8E4FF', '#64C5F8'],
  lilac: ['#F7F1FF', '#D8C1FF', '#B396F8'],
  gold: ['#FFF7CF', '#FFD34A', '#E0960F'],
  cherry: ['#FF9DB0', '#FF2D58', '#B30F38'],
  sprinkle: ['#FF008C', '#43CFFF', '#FFDF3D', '#3FDDB6', '#B486FF', '#FF9C52', '#FFFFFF'],
  rainbow: ['#FF51B0', '#FFE05C', '#6EEFC6', '#7ECFFF', '#BE9CFF'],
};
/** เส้นขอบของชุดนี้บางกว่าเส้นตัวน้องนิดหนึ่ง (ผู้ใช้ขอ) — SWK = ตัวคูณ ใช้กับทุกเส้นขอบในชุด */
const SWK = 0.65;
const SOL = OL * SWK;
/** ไล่สีสามระดับตามแนว (x0,y0) → (x1,y1) */
function swGrad(c, x0, y0, x1, y1, cols) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, cols[0]);
  g.addColorStop(0.5, cols[1]);
  g.addColorStop(1, cols[2]);
  return g;
}
/** ก้อนรวม: เส้นนอกหนาสองเท่าก่อนแล้วลงเนื้อทับ = เหลือเส้นรอบนอกเส้นเดียว ก้อนย่อยข้างในกลืนกัน */
function swBlob(c, path, fill, pal, w = SOL) {
  c.lineJoin = 'round';
  c.strokeStyle = pal.line;
  c.lineWidth = w * 2;
  c.stroke(path);
  c.fillStyle = fill;
  c.fill(path);
}
/** เส้นโค้งเรียบผ่านจุด (กลางระหว่างจุดเป็นจุดต่อ) */
function swSmooth(path, pts, first = true) {
  if (first) path.moveTo(...pts[0]); else path.lineTo(...pts[0]);
  for (let i = 1; i < pts.length - 1; i++) {
    path.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
  }
  path.lineTo(...pts[pts.length - 1]);
}
/** หัวใจอวบ (กลาง x,y · ปลายแหลมล่าง y+r) */
function swHeartP(x, y, r) {
  const h = new Path2D();
  h.moveTo(x, y + r);
  h.bezierCurveTo(x - r * 0.35, y + r * 0.7, x - r * 1.25, y + r * 0.25, x - r * 1.15, y - r * 0.35);
  h.bezierCurveTo(x - r * 1.05, y - r * 1.05, x - r * 0.2, y - r * 1.1, x, y - r * 0.45);
  h.bezierCurveTo(x + r * 0.2, y - r * 1.1, x + r * 1.05, y - r * 1.05, x + r * 1.15, y - r * 0.35);
  h.bezierCurveTo(x + r * 1.25, y + r * 0.25, x + r * 0.35, y + r * 0.7, x, y + r);
  h.closePath();
  return h;
}
/** ภาพประกายสำเร็จรูป (แสงฟุ้ง + ดาวสี่แฉก) ทำครั้งเดียวต่อสี — ชุดนี้มีประกายหลายสิบดวงต่อเฟรม
 *  วาดเป็นภาพแปะแทนการสร้างแสงไล่สีใหม่ทุกดวงทุกเฟรม (มือถือเบาลงมาก) */
const SW_SPARK = new Map();
const SW_SPARK_R = 30, SW_SPARK_S = 160;
function swSparkSprite(col) {
  let cv = SW_SPARK.get(col);
  if (cv) return cv;
  const S = SW_SPARK_S, h = S / 2, r = SW_SPARK_R;
  cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(S, S) : Object.assign(document.createElement('canvas'), { width: S, height: S });
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(h, h, 0, h, h, r * 2.4);
  gr.addColorStop(0, 'rgba(255,238,250,.62)');
  gr.addColorStop(1, 'rgba(255,238,250,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(h, h - r);
  g.quadraticCurveTo(h + r * 0.14, h - r * 0.14, h + r, h);
  g.quadraticCurveTo(h + r * 0.14, h + r * 0.14, h, h + r);
  g.quadraticCurveTo(h - r * 0.14, h + r * 0.14, h - r, h);
  g.quadraticCurveTo(h - r * 0.14, h - r * 0.14, h, h - r);
  g.fill();
  SW_SPARK.set(col, cv);
  return cv;
}
/** ประกายสี่แฉกเรือง (รัศมีดาว r · a = ความทึบ) */
function swSparkle(c, x, y, r, a = 1, col = '#FFFFFF') {
  if (a <= 0.02 || r <= 0.3) return;
  const k = r / SW_SPARK_R, S = SW_SPARK_S * k;
  const a0 = c.globalAlpha;
  c.globalAlpha = a0 * Math.min(1, a);
  c.drawImage(swSparkSprite(col), x - S / 2, y - S / 2, S, S);
  c.globalAlpha = a0;
}
/** หัวใจคริสตัลเจียระไน (เหลี่ยมสว่าง-มืดสลับ หน้าเพชรกลาง) กรอบทองเงา · ประกายวิ้งเป็นจังหวะ */
function swGem(c, x, y, r, pal, t = 0, cols = SW.hot, frame = true) {
  if (frame) {
    const f = swHeartP(x, y + r * 0.04, r * 1.3);
    swBlob(c, f, swGrad(c, x - r, y - r, x + r, y + r, SW.gold), pal, Math.max(1.2, r * 0.13) * SWK);
    c.save();
    c.clip(f);
    c.strokeStyle = 'rgba(255,255,255,.75)';
    c.lineWidth = r * 0.14;
    c.lineCap = 'round';
    c.beginPath(); c.arc(x - r * 0.45, y - r * 0.5, r * 0.62, Math.PI * 1.02, Math.PI * 1.5); c.stroke();
    c.restore();
  }
  const h = swHeartP(x, y, r);
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, '#FFF2F8');
  g.addColorStop(0.32, cols[0]);
  g.addColorStop(0.7, cols[1]);
  g.addColorStop(1, cols[2]);
  c.fillStyle = g;
  c.fill(h);
  c.save();
  c.clip(h);
  const cx = x, cy = y - r * 0.12;
  for (let i = 0; i < 10; i++) {
    const a0 = (i / 10) * TAU, a1 = ((i + 1) / 10) * TAU;
    c.fillStyle = i % 2 ? 'rgba(255,255,255,.2)' : 'rgba(110,0,60,.13)';
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cx + Math.cos(a0) * r * 2, cy + Math.sin(a0) * r * 2);
    c.lineTo(cx + Math.cos(a1) * r * 2, cy + Math.sin(a1) * r * 2);
    c.closePath();
    c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,.25)';
  c.fill(swHeartP(x, y - r * 0.1, r * 0.48));
  c.restore();
  c.strokeStyle = pal.line;
  c.lineWidth = Math.max(1.3, r * 0.13) * SWK;
  c.lineJoin = 'round';
  c.stroke(h);
  c.fillStyle = 'rgba(255,255,255,.95)';
  c.beginPath(); c.ellipse(x - r * 0.5, y - r * 0.42, r * 0.24, r * 0.13, -0.7, 0, TAU); c.fill();
  const gl = Math.sin(t * 0.06 + x * 0.07 + y * 0.03);
  if (gl > 0.25) swSparkle(c, x + r * 0.55, y - r * 0.62, r * 0.75 * (gl - 0.25) / 0.75, 1);
}
/**
 * โบว์ซาตินของชุดนี้: ห่วงพองเงาซาติน ด้านในห่วงพับเข้ม (เห็นความลึก) รอยพับ · หางผ้ายาวพลิ้วปลายตัดตัว V · ปมกลมมน
 * cols = [อ่อน กลาง เข้ม] · o.tail = ยาวหาง (เท่าของ r · 0 = ไม่มีหาง) · o.gem = หัวใจคริสตัลบนปม · o.w = เส้น
 */
function swBow(c, x, y, r, pal, t = 0, cols = SW.pink, o = {}) {
  const tl = o.tail ?? 1.5, W = o.w ?? SOL;
  const fl = Math.sin(t * 0.07 + x * 0.03);
  if (tl > 0) {
    for (const d of [-1, 1]) {
      const q = new Path2D();
      const ex = x + d * r * (0.72 + 0.1 * fl * d), ey = y + r * tl;
      q.moveTo(x - d * r * 0.12, y + r * 0.1);
      q.bezierCurveTo(x + d * r * 0.1, y + r * 0.62, ex - d * r * 0.5 + fl * r * 0.1, ey - r * 0.5, ex - d * r * 0.38, ey);
      q.lineTo(ex - d * r * 0.04, ey - r * 0.22);
      q.lineTo(ex + d * r * 0.24, ey + r * 0.05);
      q.bezierCurveTo(ex + d * r * 0.06, ey - r * 0.5, x + d * r * 0.62, y + r * 0.5, x + d * r * 0.32, y + r * 0.04);
      q.closePath();
      c.fillStyle = swGrad(c, x, y, x + d * r * 0.4, ey, [cols[1], cols[2], cols[2]]);
      c.fill(q);
      c.save();
      c.clip(q);
      c.strokeStyle = 'rgba(255,255,255,.4)';
      c.lineWidth = r * 0.13;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x + d * r * 0.14, y + r * 0.42);
      c.quadraticCurveTo(ex - d * r * 0.34, ey - r * 0.55, ex - d * r * 0.14, ey - r * 0.12);
      c.stroke();
      c.restore();
      outline(c, q, pal, W);
    }
  }
  for (const d of [-1, 1]) {
    const q = new Path2D();
    q.moveTo(x, y);
    q.bezierCurveTo(x + d * r * 0.22, y - r * 1.18, x + d * r * 1.58, y - r * 1.22, x + d * r * 1.52, y - r * 0.2);
    q.bezierCurveTo(x + d * r * 1.5, y + r * 0.72, x + d * r * 0.5, y + r * 0.64, x, y);
    q.closePath();
    const g = c.createRadialGradient(x + d * r * 0.95, y - r * 0.5, r * 0.08, x + d * r * 0.8, y - r * 0.2, r * 1.25);
    g.addColorStop(0, cols[0]);
    g.addColorStop(0.55, cols[1]);
    g.addColorStop(1, cols[2]);
    c.fillStyle = g;
    c.fill(q);
    c.save();
    c.clip(q);
    // ด้านในห่วง (ผ้าพับเข้าไป) เข้มกว่า
    const inn = new Path2D();
    inn.moveTo(x, y);
    inn.bezierCurveTo(x + d * r * 0.3, y - r * 0.5, x + d * r * 0.85, y - r * 0.52, x + d * r * 0.92, y - r * 0.06);
    inn.bezierCurveTo(x + d * r * 0.86, y + r * 0.3, x + d * r * 0.34, y + r * 0.3, x, y);
    c.fillStyle = o.fold || 'rgba(255,0,140,.16)';
    c.fill(inn);
    // เงาซาติน
    c.strokeStyle = 'rgba(255,255,255,.75)';
    c.lineWidth = r * 0.14;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x + d * r * 0.52, y - r * 0.74);
    c.quadraticCurveTo(x + d * r * 1.16, y - r * 0.88, x + d * r * 1.32, y - r * 0.42);
    c.stroke();
    c.restore();
    outline(c, q, pal, W);
    c.strokeStyle = pal.line;
    c.lineWidth = W * 0.55;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x + d * r * 0.3, y - r * 0.06);
    c.quadraticCurveTo(x + d * r * 0.7, y - r * 0.32, x + d * r * 0.98, y - r * 0.1);
    c.stroke();
  }
  const kn = new Path2D();
  kn.ellipse(x, y + r * 0.02, r * 0.38, r * 0.44, 0, 0, TAU);
  c.fillStyle = swGrad(c, x, y - r * 0.4, x, y + r * 0.45, cols);
  c.fill(kn);
  outline(c, kn, pal, W);
  if (o.gem) swGem(c, x, y + r * 0.04, r * (o.gemR ?? 0.36), pal, t, o.gemCols || SW.hot, true);
  else {
    c.fillStyle = 'rgba(255,255,255,.85)';
    c.beginPath(); c.ellipse(x - r * 0.12, y - r * 0.16, r * 0.11, r * 0.07, -0.5, 0, TAU); c.fill();
  }
}
/** ลูกไม้ขอบหยัก: วงกลมเรียงตามจุด (ก้อนรวมเส้นนอกเส้นเดียว) + รูตาไก่ชมพู */
function swLace(c, pts, r, pal, fill = '#FFFFFF', holes = true) {
  const q = new Path2D();
  for (const [x, y] of pts) { q.moveTo(x + r, y); q.arc(x, y, r, 0, TAU); }
  swBlob(c, q, fill, pal, SOL * 0.6);
  if (holes) {
    c.fillStyle = 'rgba(255,119,193,.85)';
    for (const [x, y] of pts) { c.beginPath(); c.arc(x, y + r * 0.22, r * 0.24, 0, TAU); c.fill(); }
  }
}
/** เม็ดสายรุ้ง (แท่งกลมมน) กระจายแบบคงที่ในกรอบ — P = ตัวดัดจุด */
function swSprinkles(c, P, x0, y0, w, h, n, seed = 0, len = 9) {
  c.lineCap = 'round';
  c.lineWidth = len * 0.38;
  for (let i = 0; i < n; i++) {
    const [x, y] = P(x0 + hash(i * 3 + seed) * w, y0 + hash(i * 5 + seed + 7) * h);
    const a = hash(i * 7 + seed + 3) * Math.PI;
    c.strokeStyle = SW.sprinkle[(i + seed) % 7];
    c.beginPath();
    c.moveTo(x - Math.cos(a) * len * 0.5, y - Math.sin(a) * len * 0.5);
    c.lineTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5);
    c.stroke();
  }
}
/** เชอร์รี่เงา ก้านเขียว ใบเล็ก */
function swCherry(c, x, y, r, pal) {
  const w = Math.max(1.4, r * 0.15) * SWK;
  c.strokeStyle = '#3E9A4A';
  c.lineWidth = Math.max(1.6, r * 0.2);
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(x + r * 0.05, y - r * 0.7); c.quadraticCurveTo(x + r * 0.15, y - r * 1.6, x + r * 0.85, y - r * 1.95); c.stroke();
  const lf = new Path2D();
  lf.moveTo(x + r * 0.5, y - r * 1.72);
  lf.quadraticCurveTo(x + r * 0.95, y - r * 2.35, x + r * 1.6, y - r * 1.98);
  lf.quadraticCurveTo(x + r * 1.05, y - r * 1.5, x + r * 0.5, y - r * 1.72);
  lf.closePath();
  c.fillStyle = swGrad(c, x + r * 0.5, y - r * 2.2, x + r * 1.5, y - r * 1.7, ['#D4FAA8', '#72D86C', '#34A447']);
  c.fill(lf);
  outline(c, lf, pal, w);
  const b = new Path2D();
  b.moveTo(x, y - r * 0.72);
  b.bezierCurveTo(x - r * 0.5, y - r * 1.05, x - r * 1.08, y - r * 0.5, x - r * 0.98, y + r * 0.15);
  b.bezierCurveTo(x - r * 0.9, y + r * 0.88, x + r * 0.9, y + r * 0.88, x + r * 0.98, y + r * 0.15);
  b.bezierCurveTo(x + r * 1.08, y - r * 0.5, x + r * 0.5, y - r * 1.05, x, y - r * 0.72);
  b.closePath();
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, SW.cherry[0]);
  g.addColorStop(0.45, SW.cherry[1]);
  g.addColorStop(1, SW.cherry[2]);
  c.fillStyle = g;
  c.fill(b);
  outline(c, b, pal, w * 1.1);
  c.fillStyle = 'rgba(255,255,255,.92)';
  c.beginPath(); c.ellipse(x - r * 0.42, y - r * 0.22, r * 0.2, r * 0.32, 0.5, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.55)';
  c.beginPath(); c.arc(x + r * 0.45, y + r * 0.38, r * 0.11, 0, TAU); c.fill();
}
/** มงกุฎทองจิ๋วสามยอด ลูกทองบนยอด หัวใจคริสตัลกลาง (กลาง x,y = ขอบล่าง) */
function swCrown(c, x, y, s, pal, t = 0) {
  const cr = new Path2D();
  cr.moveTo(x - s, y);
  cr.lineTo(x - s * 1.12, y - s * 1.05);
  cr.lineTo(x - s * 0.5, y - s * 0.55);
  cr.lineTo(x, y - s * 1.3);
  cr.lineTo(x + s * 0.5, y - s * 0.55);
  cr.lineTo(x + s * 1.12, y - s * 1.05);
  cr.lineTo(x + s, y);
  cr.quadraticCurveTo(x, y + s * 0.2, x - s, y);
  cr.closePath();
  c.lineJoin = 'round';
  c.fillStyle = swGrad(c, x, y - s * 1.3, x, y, SW.gold);
  c.fill(cr);
  outline(c, cr, pal, Math.max(1.4, s * 0.12) * SWK);
  for (const [px, py] of [[x - s * 1.12, y - s * 1.05], [x, y - s * 1.3], [x + s * 1.12, y - s * 1.05]]) {
    const b = new Path2D();
    b.arc(px, py - s * 0.08, s * 0.2, 0, TAU);
    c.fillStyle = '#FFF4B8';
    c.fill(b);
    outline(c, b, pal, Math.max(1, s * 0.08) * SWK);
  }
  swGem(c, x, y - s * 0.42, s * 0.3, pal, t, SW.hot, false);
}
/**
 * คัพเค้ก: ถ้วยกระดาษจีบลายทาง ขอบทอง · ครีมวนสามชั้นลายริ้ว ไหลย้อยลงขอบถ้วย · เม็ดสายรุ้ง · เชอร์รี่ (o.cherry = false ไม่ใส่)
 * x,y = กลางขอบบนถ้วย · r = ครึ่งความกว้างถ้วย · o.liner = [ทางสี ทางขาว] · o.cream = [อ่อน กลาง เข้ม] · o.crown = มงกุฎจิ๋ว
 */
function swCupcake(c, x, y, r, pal, t = 0, o = {}) {
  const W = o.w ?? SOL * 0.8;
  const L1 = o.liner?.[0] || SW.mint[1], L2 = o.liner?.[1] || '#FFFFFF';
  const CR = o.cream || ['#FFFFFF', '#FFADDA', '#FF77C1'];
  const h = r * 0.95;
  // o.part: 'cup' = เฉพาะถ้วย+ขอบทอง · 'cream' = เฉพาะครีม+เม็ดสายรุ้ง+เชอร์รี่ (ฝาครีมกระเด็นแยกจากถ้วยได้)
  if (o.part !== 'cream') {
    const cup = new Path2D();
    cup.moveTo(x - r, y);
    cup.lineTo(x + r, y);
    cup.lineTo(x + r * 0.74, y + h);
    cup.quadraticCurveTo(x, y + h * 1.12, x - r * 0.74, y + h);
    cup.closePath();
    c.fillStyle = L2;
    c.fill(cup);
    c.save();
    c.clip(cup);
    const n = 9;
    for (let i = 0; i < n; i += 2) {
      const u0 = i / n, u1 = (i + 1) / n;
      const s = new Path2D();
      s.moveTo(x - r + 2 * r * u0, y - 2);
      s.lineTo(x - r + 2 * r * u1, y - 2);
      s.lineTo(x - r * 0.74 + 1.48 * r * u1, y + h * 1.2);
      s.lineTo(x - r * 0.74 + 1.48 * r * u0, y + h * 1.2);
      s.closePath();
      c.fillStyle = L1;
      c.fill(s);
    }
    const sh = c.createLinearGradient(x - r, 0, x + r, 0);
    sh.addColorStop(0, 'rgba(130,90,170,.18)');
    sh.addColorStop(0.32, 'rgba(255,255,255,.22)');
    sh.addColorStop(0.62, 'rgba(255,255,255,0)');
    sh.addColorStop(1, 'rgba(130,90,170,.2)');
    c.fillStyle = sh;
    c.fillRect(x - r - 2, y - 4, 2 * r + 4, h * 1.3);
    c.restore();
    outline(c, cup, pal, W);
    // ขอบทองบนถ้วย (ครีมไหลย้อยทับ — เห็นแถบทองระหว่างหยดครีม)
    const rim = new Path2D();
    rim.roundRect(x - r * 1.03, y - r * 0.04, r * 2.06, r * 0.2, r * 0.1);
    c.fillStyle = swGrad(c, x, y - r * 0.04, x, y + r * 0.16, SW.gold);
    c.fill(rim);
    outline(c, rim, pal, W * 0.7);
  }
  if (o.part === 'cup') return;
  // ครีมฐาน: ครึ่งบนวงรี + ขอบล่างไหลย้อยเป็นหยด ๆ ลงขอบถ้วย
  const bx = x, by = y - r * 0.08, brx = r * 1.16, bry = r * 0.42;
  // หยดครีมปลายมน (ครึ่งวงรี) ยาวไม่เท่ากัน
  const drips = [[-0.8, 0.3], [-0.5, 0.52], [-0.18, 0.34], [0.14, 0.6], [0.46, 0.38], [0.78, 0.48]];
  const base = new Path2D();
  base.ellipse(bx, by, brx, bry, 0, Math.PI, 0);
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const u = 1 - (2 * i) / N;
    let d = 0;
    for (const [du, dl] of drips) { const q = (u - du) / 0.12; if (Math.abs(q) < 1) d = Math.max(d, dl * Math.sqrt(1 - q * q)); }
    base.lineTo(bx + brx * u, by + bry * 0.5 * Math.sqrt(Math.max(0, 1 - u * u)) + r * d * 0.5);
  }
  base.closePath();
  const tiers = [
    [base, by - bry, by + r * 0.5],
  ];
  const tier = (cy, rx, ry) => { const q = new Path2D(); q.ellipse(x, cy, rx, ry, 0, 0, TAU); return q; };
  tiers.push([tier(y - r * 0.5, r * 0.88, r * 0.34), y - r * 0.84, y - r * 0.16]);
  tiers.push([tier(y - r * 0.86, r * 0.6, r * 0.29), y - r * 1.15, y - r * 0.57]);
  const pk = new Path2D();
  pk.moveTo(x - r * 0.3, y - r * 1.02);
  pk.bezierCurveTo(x - r * 0.3, y - r * 1.32, x + r * 0.02, y - r * 1.34, x + r * 0.14, y - r * 1.5);
  pk.bezierCurveTo(x + r * 0.3, y - r * 1.3, x + r * 0.36, y - r * 1.1, x + r * 0.3, y - r * 1.02);
  pk.closePath();
  tiers.push([pk, y - r * 1.5, y - r * 1.02]);
  for (const [q, y0, y1] of tiers) {
    swBlob(c, q, swGrad(c, x, y0, x, y1, CR), pal, W * 0.85);
    c.save();
    c.clip(q);
    // ริ้วครีมวน (ลายสตรอว์เบอร์รี่) + เงาซ้อนชั้น + ไฮไลต์
    c.strokeStyle = CR[2];
    c.globalAlpha = 0.55;
    c.lineWidth = r * 0.09;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x - r * 0.9, y0 + (y1 - y0) * 0.55);
    c.quadraticCurveTo(x, y1 + r * 0.05, x + r * 0.9, y0 + (y1 - y0) * 0.45);
    c.stroke();
    c.globalAlpha = 1;
    c.strokeStyle = 'rgba(255,255,255,.9)';
    c.lineWidth = r * 0.08;
    c.beginPath();
    c.moveTo(x - r * 0.55, y0 + (y1 - y0) * 0.3);
    c.quadraticCurveTo(x - r * 0.2, y0 + (y1 - y0) * 0.12, x + r * 0.05, y0 + (y1 - y0) * 0.2);
    c.stroke();
    c.restore();
  }
  // เม็ดสายรุ้งบนครีม
  c.save();
  c.lineCap = 'round';
  c.lineWidth = Math.max(1.2, r * 0.07);
  for (let i = 0; i < 12; i++) {
    const u = hash(i * 13 + 1) * 2 - 1, v = hash(i * 17 + 4);
    const px = x + u * r * (0.95 - v * 0.45), py = y - r * 0.1 - v * r * 1.0;
    const a = hash(i * 5 + 2) * Math.PI;
    c.strokeStyle = SW.sprinkle[i % 7];
    c.beginPath();
    c.moveTo(px - Math.cos(a) * r * 0.08, py - Math.sin(a) * r * 0.08);
    c.lineTo(px + Math.cos(a) * r * 0.08, py + Math.sin(a) * r * 0.08);
    c.stroke();
  }
  c.restore();
  if (o.crown) {
    c.save();
    c.translate(x + r * 0.7, y - r * 0.66);
    c.rotate(0.42);
    swCrown(c, 0, 0, r * 0.28, pal, t);
    c.restore();
  }
  if (o.cherry !== false) swCherry(c, x + r * 0.06, y - r * 1.36, r * 0.27, pal);
}
/** ลูกอมเปปเปอร์มินต์กรอบทอง (ลายเกลียวชมพู) */
function swPeppermint(c, x, y, r, pal, rot = 0) {
  const fr = new Path2D();
  fr.arc(x, y, r * 1.3, 0, TAU);
  swBlob(c, fr, swGrad(c, x - r, y - r, x + r, y + r, SW.gold), pal, Math.max(1.2, r * 0.12) * SWK);
  const d = new Path2D();
  d.arc(x, y, r, 0, TAU);
  c.fillStyle = '#FFFFFF';
  c.fill(d);
  c.save();
  c.clip(d);
  c.translate(x, y);
  c.rotate(rot);
  for (let i = 0; i < 6; i++) {
    c.rotate(TAU / 6);
    if (i % 2) continue;
    c.fillStyle = i % 4 ? SW.hot[1] : SW.pink[1];
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(r * 0.7, -r * 0.25, r * 1.1, -r * 0.42);
    c.lineTo(r * 1.1, r * 0.4);
    c.quadraticCurveTo(r * 0.55, r * 0.2, 0, 0);
    c.fill();
  }
  c.restore();
  c.strokeStyle = pal.line;
  c.lineWidth = Math.max(1.3, r * 0.13) * SWK;
  c.stroke(d);
  c.fillStyle = 'rgba(255,255,255,.88)';
  c.beginPath(); c.ellipse(x - r * 0.4, y - r * 0.42, r * 0.26, r * 0.14, -0.7, 0, TAU); c.fill();
}
/** มาการง: ฝาบน-ล่างไล่สี ขาฟูครีม ไส้ครีม */
function swMacaron(c, x, y, r, cols, pal, rot = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  const lo = new Path2D(); lo.ellipse(0, r * 0.3, r, r * 0.44, 0, 0, TAU);
  const hi = new Path2D(); hi.ellipse(0, -r * 0.3, r, r * 0.44, 0, 0, TAU);
  const ft = new Path2D(); ft.ellipse(0, 0, r * 0.94, r * 0.2, 0, 0, TAU);
  c.fillStyle = swGrad(c, 0, 0, 0, r * 0.75, cols); c.fill(lo); outline(c, lo, pal, 1.8 * SWK);
  c.fillStyle = '#FFF7EC'; c.fill(ft); outline(c, ft, pal, 1.4 * SWK);
  c.fillStyle = swGrad(c, 0, -r * 0.75, 0, 0, cols); c.fill(hi); outline(c, hi, pal, 1.8 * SWK);
  c.fillStyle = 'rgba(255,255,255,.75)';
  c.beginPath(); c.ellipse(-r * 0.35, -r * 0.46, r * 0.3, r * 0.1, -0.15, 0, TAU); c.fill();
  c.restore();
}
/** โดนัทไอซิ่งหยักโรยเม็ดสายรุ้ง */
function swDonut(c, x, y, r, icing, pal, rot = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  const ring = new Path2D();
  ring.arc(0, 0, r, 0, TAU);
  ring.moveTo(r * 0.36, 0);
  ring.arc(0, 0, r * 0.36, 0, TAU, true);
  c.fillStyle = swGrad(c, 0, -r, 0, r, ['#FFE6B8', '#F2B66C', '#C9853A']);
  c.fill(ring);
  const ic = new Path2D();
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * TAU, rr = r * (0.84 + 0.07 * Math.sin(i * 2.3));
    if (i) ic.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ic.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ic.closePath();
  ic.moveTo(r * 0.47, 0);
  ic.arc(0, 0, r * 0.47, 0, TAU, true);
  c.fillStyle = swGrad(c, 0, -r, 0, r, icing);
  c.fill(ic);
  c.lineCap = 'round';
  c.lineWidth = r * 0.08;
  for (let i = 0; i < 10; i++) {
    const a = i * 0.63 + 0.3, rr = r * (0.58 + 0.1 * (i % 3)), b = i * 1.3;
    c.strokeStyle = SW.sprinkle[i % 6];
    c.beginPath();
    c.moveTo(Math.cos(a) * rr - Math.cos(b) * r * 0.1, Math.sin(a) * rr - Math.sin(b) * r * 0.1);
    c.lineTo(Math.cos(a) * rr + Math.cos(b) * r * 0.1, Math.sin(a) * rr + Math.sin(b) * r * 0.1);
    c.stroke();
  }
  c.strokeStyle = pal.line;
  c.lineWidth = 1.8 * SWK;
  c.stroke(ring);
  c.fillStyle = 'rgba(255,255,255,.65)';
  c.beginPath(); c.ellipse(-r * 0.48, -r * 0.48, r * 0.22, r * 0.1, -0.7, 0, TAU); c.fill();
  c.restore();
}
/** ลูกอมห่อกระดาษลายเกลียว */
function swCandy(c, x, y, r, cols, pal, rot = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  for (const d of [-1, 1]) {
    const w = new Path2D();
    w.moveTo(d * r * 0.75, 0);
    w.quadraticCurveTo(d * r * 1.35, -r * 0.95, d * r * 1.75, -r * 0.62);
    w.quadraticCurveTo(d * r * 1.5, 0, d * r * 1.75, r * 0.62);
    w.quadraticCurveTo(d * r * 1.35, r * 0.95, d * r * 0.75, 0);
    w.closePath();
    c.fillStyle = cols[0];
    c.fill(w);
    outline(c, w, pal, 1.6 * SWK);
  }
  const b = new Path2D();
  b.ellipse(0, 0, r, r * 0.86, 0, 0, TAU);
  c.fillStyle = swGrad(c, 0, -r, 0, r, cols);
  c.fill(b);
  c.save();
  c.clip(b);
  c.strokeStyle = 'rgba(255,255,255,.85)';
  c.lineWidth = r * 0.28;
  for (const o of [-r * 0.9, 0, r * 0.9]) { c.beginPath(); c.moveTo(o - r, -r); c.lineTo(o + r * 0.4, r); c.stroke(); }
  c.restore();
  outline(c, b, pal, 1.8 * SWK);
  c.fillStyle = 'rgba(255,255,255,.85)';
  c.beginPath(); c.ellipse(-r * 0.4, -r * 0.42, r * 0.2, r * 0.11, -0.6, 0, TAU); c.fill();
  c.restore();
}
/** อมยิ้มเกลียวรุ้ง */
function swLolly(c, x, y, r, pal, rot = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  const st = new Path2D();
  st.roundRect(-r * 0.12, r * 0.7, r * 0.24, r * 1.5, r * 0.1);
  c.fillStyle = '#FFFFFF';
  c.fill(st);
  outline(c, st, pal, 1.4 * SWK);
  const b = new Path2D();
  b.arc(0, 0, r, 0, TAU);
  c.fillStyle = '#FFFFFF';
  c.fill(b);
  c.save();
  c.clip(b);
  c.lineWidth = r * 0.22;
  c.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    c.strokeStyle = SW.rainbow[i];
    c.beginPath();
    for (let j = 0; j <= 26; j++) {
      const a = j * 0.34 + (i * TAU) / 5, rr = (j / 26) * r * 1.05;
      if (j) c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.stroke();
  }
  c.restore();
  outline(c, b, pal, 1.8 * SWK);
  c.fillStyle = 'rgba(255,255,255,.8)';
  c.beginPath(); c.ellipse(-r * 0.4, -r * 0.45, r * 0.22, r * 0.12, -0.6, 0, TAU); c.fill();
  c.restore();
}
/** ดาวห้าแฉกอวบ ไล่สีทอง */
function swStar(c, x, y, r, pal, rot = 0, cols = SW.gold) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  const s = new Path2D();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.54 : r;
    if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath();
  c.lineJoin = 'round';
  c.strokeStyle = pal.line;
  c.lineWidth = 3.4 * SWK;
  c.stroke(s);
  c.fillStyle = swGrad(c, 0, -r, 0, r, cols);
  c.fill(s);
  c.fillStyle = 'rgba(255,255,255,.75)';
  c.beginPath(); c.ellipse(-r * 0.2, -r * 0.3, r * 0.16, r * 0.1, -0.6, 0, TAU); c.fill();
  c.restore();
}

// ── ชิ้นชุด ──
/** แขนพอง (พิกัดแขนซ้ายในไฟล์ · Q = ตัวดัดจุดของแขนข้างนั้น): ลูกโป่งชมพูจับจีบคลุมไหล่-ต้นแขน (พองพ้นแขนแบบแขนพองจริง)
 *  ปลายแขนลูกไม้ขาวหยัก + แถบมิ้นต์ประดับมุก */
function sweetPuff(c, Q, pal) {
  const S0x = 214, S0y = 436, dx = -0.95, dy = 0.31, nx = -0.31, ny = -0.95;
  // พิกัดบนแขนเสื้อ L(u ตามแขน, v ขวางแขน) สร้างจาก "แกนกลางแขนที่ถูกดัดแล้ว" — ทุกหน้าตัดเป็นเส้นตรงตั้งฉากกับแขนเสมอ
  // (เดิมดัดทีละจุดด้วย Q ซึ่งหมุนตามตำแหน่งแนวนอนของแต่ละจุด ตอนชูแขนขอบในกับขอบนอกของปลายแขนเสื้อหมุนไม่เท่ากัน
  //  ลูกไม้+แถบมิ้นต์เลยตั้งตรงค้างชิดตัว แขนโผล่เลยออกไป เหมือนแขนเสื้อถูกตัด — ผู้ใช้ทัก 15 ต.ค.)
  // แขนพัก: Q แทบเป็นเส้นตรง ผลเท่าเดิม · ฝั่งขวา (Q กลับซ้ายขวา) เลือกทิศขวางแขนให้ตรงกับแบบเดิมด้วยการเทียบกับ Q จริง
  const ax = (u) => Q(S0x + dx * u, S0y + dy * u);
  const frames = new Map();
  const L = (u, v) => {
    let f = frames.get(u);
    if (!f) {
      const [x0, y0] = ax(u - 1.5), [x1, y1] = ax(u + 1.5), [px, py] = ax(u);
      const l = Math.hypot(x1 - x0, y1 - y0) || 1;
      let Nx = -(y1 - y0) / l, Ny = (x1 - x0) / l;
      const [qx, qy] = Q(S0x + dx * u + nx, S0y + dy * u + ny);   // ทิศขวางแขนตามแบบเดิม (ใช้แค่เครื่องหมาย)
      if (Nx * (qx - px) + Ny * (qy - py) < 0) { Nx = -Nx; Ny = -Ny; }
      const s = l / 3;   // แขนถูกย่อ/ขยาย (หายใจ หันตัว) — ความกว้างแขนเสื้อตามไปด้วย
      f = [px, py, Nx * s, Ny * s];
      frames.set(u, f);
    }
    return [f[0] + f[2] * v, f[1] + f[3] * v];
  };
  const lace = [];
  for (let v = -36; v <= 36.1; v += 9) lace.push(L(58, v));
  swLace(c, lace, 7, pal);
  const pf = new Path2D();
  pf.moveTo(...L(-8, 36));
  pf.bezierCurveTo(...L(4, 50), ...L(36, 52), ...L(52, 36));
  pf.quadraticCurveTo(...L(58, 0), ...L(52, -36));
  pf.bezierCurveTo(...L(36, -50), ...L(4, -48), ...L(-8, -34));
  pf.quadraticCurveTo(...L(-20, 0), ...L(-8, 36));
  pf.closePath();
  const [gx, gy] = L(20, 26), [ox, oy] = L(26, 0);
  const g = c.createRadialGradient(gx, gy, 4, ox, oy, 70);
  g.addColorStop(0, SW.pink[0]);
  g.addColorStop(0.5, SW.pink[1]);
  g.addColorStop(1, SW.pink[2]);
  c.fillStyle = g;
  c.fill(pf);
  c.save();
  c.clip(pf);
  c.lineCap = 'round';
  for (const [v0, v1] of [[-30, -24], [-10, -8], [10, 8], [32, 26]]) {
    c.strokeStyle = 'rgba(255,0,140,.22)';
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(...L(-6, v0 * 0.7)); c.quadraticCurveTo(...L(22, v0 * 1.3), ...L(50, v1)); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.5)';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(...L(-4, v0 * 0.7 + 7)); c.quadraticCurveTo(...L(22, v0 * 1.3 + 8), ...L(48, v1 + 6)); c.stroke();
  }
  c.fillStyle = 'rgba(255,255,255,.85)';
  for (const [u, v] of [[12, 28], [28, -18], [32, 30], [8, -10]]) { const [hx, hy] = L(u, v); c.fill(swHeartP(hx, hy, 3.8)); }
  c.restore();
  outline(c, pf, pal, SOL);
  const bd = new Path2D();
  bd.moveTo(...L(45, -41)); bd.lineTo(...L(55, -39)); bd.lineTo(...L(55, 39)); bd.lineTo(...L(45, 41)); bd.closePath();
  const [b0x, b0y] = L(50, 40), [b1x, b1y] = L(50, -40);
  c.fillStyle = swGrad(c, b0x, b0y, b1x, b1y, SW.mint);
  c.fill(bd);
  outline(c, bd, pal, SOL * 0.7);
  c.fillStyle = '#FFFFFF';
  for (const v of [-24, 0, 24]) { const [px, py] = L(50, v); c.beginPath(); c.arc(px, py, 2.8, 0, TAU); c.fill(); }
}
/** แขนพองตอนนั่งเกา (ท่อแขน band): ลูกพองช่วงต้นแขน ปลายลูกไม้ + แถบมิ้นต์ที่จุด upto */
function sweetSitSleeve(c, band, upto, pal) {
  const pts = band.pts;
  const Lp = [], Rp = [];
  for (let i = 0; i <= upto; i++) {
    const q = pts[i], u = i / upto;
    const h = band.half(i) + 5 + Math.sin(Math.min(1, u * 1.15) * Math.PI) * 13;
    const nx = -Math.sin(q.a), ny = Math.cos(q.a);
    Lp.push([q.x + nx * h, q.y + ny * h]);
    Rp.push([q.x - nx * h, q.y - ny * h]);
  }
  const q0 = pts[0], qe = pts[upto];
  const enx = -Math.sin(qe.a), eny = Math.cos(qe.a), etx = Math.cos(qe.a), ety = Math.sin(qe.a);
  const he = band.half(upto) + 7;
  const lace = [];
  for (let i = 0; i <= 6; i++) { const v = -he + (2 * he * i) / 6; lace.push([qe.x + etx * 8 + enx * v, qe.y + ety * 8 + eny * v]); }
  swLace(c, lace, 6.5, pal);
  const pf = new Path2D();
  swSmooth(pf, Lp, true);
  swSmooth(pf, Rp.slice().reverse(), false);
  // ปลายฝั่งโคนแขน: ครึ่งวงกลมรอบปลายท่อ ใหญ่กว่าปลายมนของแขน — ครอบโคนแขนมิด ไม่มีขนส้มโผล่ใต้แขนเสื้อ
  // (เดิมปิดด้วยโค้งตื้น ๆ ปลายมนของแขนจึงยื่นพ้นแขนเสื้อออกมาเป็นจุดส้ม)
  pf.arc(q0.x, q0.y, band.half(0) + 8, q0.a - Math.PI / 2, q0.a + Math.PI / 2, true);
  pf.closePath();
  const g = c.createRadialGradient(q0.x - 6, q0.y - 10, 4, q0.x, q0.y + 20, 80);
  g.addColorStop(0, SW.pink[0]);
  g.addColorStop(0.5, SW.pink[1]);
  g.addColorStop(1, SW.pink[2]);
  c.fillStyle = g;
  c.fill(pf);
  c.save();
  c.clip(pf);
  c.strokeStyle = 'rgba(255,0,140,.22)';
  c.lineWidth = 4.5;
  c.lineCap = 'round';
  for (const f of [-0.5, 0, 0.5]) {
    const a = pts[1], b = pts[upto - 1];
    const an = -Math.sin(a.a), bn = -Math.sin(b.a), ac = Math.cos(a.a), bc = Math.cos(b.a);
    c.beginPath();
    c.moveTo(a.x + an * band.half(1) * f, a.y + ac * band.half(1) * f);
    c.lineTo(b.x + bn * (band.half(upto - 1) + 14) * f, b.y + bc * (band.half(upto - 1) + 14) * f);
    c.stroke();
  }
  c.restore();
  outline(c, pf, pal, SOL);
  const bd = new Path2D();
  bd.moveTo(qe.x - etx * 4 + enx * (he + 2), qe.y - ety * 4 + eny * (he + 2));
  bd.lineTo(qe.x + etx * 4 + enx * (he + 2), qe.y + ety * 4 + eny * (he + 2));
  bd.lineTo(qe.x + etx * 4 - enx * (he + 2), qe.y + ety * 4 - eny * (he + 2));
  bd.lineTo(qe.x - etx * 4 - enx * (he + 2), qe.y - ety * 4 - eny * (he + 2));
  bd.closePath();
  c.fillStyle = swGrad(c, qe.x + enx * he, qe.y + eny * he, qe.x - enx * he, qe.y - eny * he, SW.mint);
  c.fill(bd);
  outline(c, bd, pal, SOL * 0.7);
}
/** ตัวเสื้อ: ชมพูสตรอว์เบอร์รี่มิลค์ลายหัวใจขาว เงาซาตินทรงกระบอก · หน้า: แผงอกครีมขอบลูกไม้ ผูกเชือกมิ้นต์ ตาไก่ทอง
 *  · หลัง: ผูกเชือกกลางหลัง · หมอบ: คลุมทั้งก้อนตัว ชายระบายทูลเล่มิ้นต์ + ลูกไม้แตะพื้น */
function sweetBodice(c, k) {
  const pal = k.pal;
  for (const a of k.arms || []) sweetPuff(c, a.pt, pal);
  if (k.sleevesOnly) return;
  const P = k.pt || ((x, y) => [x, y]);
  const mode = k.mode || 'stand', sit = mode === 'sit', loaf = mode === 'loaf';
  const vy = k.vy ?? (sit ? 46 : 0);
  const hemY = loaf ? 700 : sit ? 566 : k.back ? 486 : 522;
  c.save();
  if (k.body) c.clip(k.body);
  const area = new Path2D();
  area.moveTo(...P(20, 330 + vy));
  area.lineTo(...P(580, 330 + vy));
  area.lineTo(...P(580, hemY));
  area.quadraticCurveTo(...P(300, hemY + 12), ...P(20, hemY));
  area.closePath();
  const [, ya] = P(300, 384 + vy), [, yb] = P(300, Math.min(hemY, 660));
  c.fillStyle = swGrad(c, 0, ya, 0, yb, SW.pink);
  c.fill(area);
  c.save();
  c.clip(area);
  // เงาทรงกระบอก: ข้างตัวเข้ม กลางสว่าง
  const [lx] = P(168, 460), [rx] = P(432, 460);
  const sg = c.createLinearGradient(lx, 0, rx, 0);
  sg.addColorStop(0, 'rgba(255,0,140,.22)');
  sg.addColorStop(0.3, 'rgba(255,255,255,0)');
  sg.addColorStop(0.7, 'rgba(255,255,255,0)');
  sg.addColorStop(1, 'rgba(255,0,140,.22)');
  c.fillStyle = sg;
  c.fillRect(lx - 500, ya - 300, rx - lx + 1000, 800);
  // ลายหัวใจขาวเล็ก ๆ
  const panelW = k.back ? 22 : 46;
  c.fillStyle = 'rgba(255,255,255,.82)';
  let row = 0;
  for (let y = 404 + vy; y < Math.min(hemY - 4, 664); y += 26, row++) {
    for (let x = 148 + (row % 2) * 17; x < 460; x += 34) {
      if (Math.abs(x - 300) < panelW) continue;
      const [hx, hy] = P(x, y);
      c.fill(swHeartP(hx, hy, 4.4));
    }
  }
  // เงาซาติน
  c.strokeStyle = 'rgba(255,255,255,.38)';
  c.lineWidth = 9;
  c.lineCap = 'round';
  for (const x of [230, 370]) {
    const s = x < 300 ? -1 : 1;
    c.beginPath();
    c.moveTo(...P(x, 410 + vy));
    c.quadraticCurveTo(...P(x + s * 6, (410 + vy + Math.min(hemY, 640)) / 2), ...P(x + s * 4, Math.min(hemY, 640) - 8));
    c.stroke();
  }
  if (loaf) {
    // ชายเดรสตอนหมอบ: ทูลเล่มิ้นต์เป็นคลื่น + ลูกไม้ขาวแตะพื้น
    const tul = new Path2D();
    tul.moveTo(...P(60, 612));
    for (let x = 60; x <= 540; x += 6) tul.lineTo(...P(x, 612 + Math.sin(x * 0.21) * 3.5));
    tul.lineTo(...P(540, 700));
    tul.lineTo(...P(60, 700));
    tul.closePath();
    c.fillStyle = swGrad(c, 0, 606, 0, 650, [SW.mint[0], SW.mint[1], SW.sky[1]]);
    c.fill(tul);
    c.strokeStyle = 'rgba(255,255,255,.55)';
    c.lineWidth = 3;
    for (let x = 80; x < 540; x += 26) { c.beginPath(); c.moveTo(...P(x, 618)); c.lineTo(...P(x + 4, 648)); c.stroke(); }
    outline(c, tul, pal, SOL * 0.7);
    const lace = [];
    for (let x = 70; x <= 530; x += 13) lace.push(P(x, 643));
    swLace(c, lace, 7, pal);
  }
  const top = 392 + vy;
  const half = (y) => 36 - 9 * clamp01((y - top) / Math.max(1, Math.min(hemY, 640) - top));
  const lacing = (rows) => {
    c.lineCap = 'round';
    for (let i = 0; i < rows.length - 1; i++) {
      const y0 = rows[i], y1 = rows[i + 1];
      const w0 = half(y0) * 0.48, w1 = half(y1) * 0.48;
      for (const [a, b] of [[P(300 - w0, y0), P(300 + w1, y1)], [P(300 + w0, y0), P(300 - w1, y1)]]) {
        c.strokeStyle = SW.mintDeep; c.lineWidth = 5.4;
        c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke();
        c.strokeStyle = SW.mint[1]; c.lineWidth = 3;
        c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke();
      }
    }
    for (const y of rows) {
      for (const d of [-1, 1]) {
        const [ex, ey] = P(300 + d * half(y) * 0.48, y);
        c.beginPath(); c.arc(ex, ey, 3.4, 0, TAU);
        c.fillStyle = SW.gold[1]; c.fill();
        c.strokeStyle = pal.line; c.lineWidth = 1.4 * SWK; c.stroke();
      }
    }
  };
  const rows = [];
  for (let y = top + 24; y < Math.min(hemY, 640) - 8; y += 15) rows.push(y);
  if (!k.back) {
    const bot = Math.min(hemY, 640) + 4;
    const pn = new Path2D();
    pn.moveTo(...P(300 - half(top), top));
    pn.lineTo(...P(300 + half(top), top));
    pn.quadraticCurveTo(...P(300 + half(top) - 2, (top + bot) / 2), ...P(300 + half(bot), bot));
    pn.lineTo(...P(300 - half(bot), bot));
    pn.quadraticCurveTo(...P(300 - half(top) + 2, (top + bot) / 2), ...P(300 - half(top), top));
    pn.closePath();
    for (const d of [-1, 1]) {
      const pts = [];
      for (let y = top + 8; y < bot - 4; y += 11) pts.push(P(300 + d * (half(y) + 2), y));
      swLace(c, pts, 6.4, pal, '#FFFFFF', false);
    }
    c.fillStyle = swGrad(c, 0, ya, 0, yb, SW.cream);
    c.fill(pn);
    c.save();
    c.clip(pn);
    c.strokeStyle = 'rgba(220,170,120,.28)';
    c.lineWidth = 3;
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(...P(300 + d * 8, top)); c.lineTo(...P(300 + d * 7, bot)); c.stroke(); }
    c.restore();
    outline(c, pn, pal, SOL * 0.6);
  }
  lacing(rows);
  c.restore();
  c.strokeStyle = pal.line;
  c.lineWidth = SOL;
  c.lineCap = 'round';
  if (!loaf) {
    c.beginPath(); c.moveTo(...P(20, hemY)); c.quadraticCurveTo(...P(300, hemY + 12), ...P(580, hemY)); c.stroke();
  }
  c.restore();
}
/** ปก: กลีบลูกไม้ชมพูขอบขาวตาไก่ (ชั้นล่าง) + วิปครีมฟูรอบคอ (ชั้นบน) · หน้า: โบว์ซาตินชมพูใหญ่ หัวใจคริสตัลกลางโบว์ */
function sweetCollar(c, k) {
  const pal = k.pal, t = k.t || 0;
  const P = k.cpt || ((x, y) => [x, y]);
  const N = 7;
  const petals = [];
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N;
    petals.push(P(198 + 204 * u, 400 + Math.sin(u * Math.PI) * 30));
  }
  const pet = new Path2D();
  for (const [px, py] of petals) { pet.moveTo(px + 19, py); pet.ellipse(px, py, 19, 21, 0, 0, TAU); }
  const baseP = new Path2D();
  baseP.moveTo(...P(198, 376));
  baseP.quadraticCurveTo(...P(300, 428), ...P(402, 376));
  baseP.lineTo(...P(406, 400));
  baseP.quadraticCurveTo(...P(300, 450), ...P(194, 400));
  baseP.closePath();
  pet.addPath(baseP);
  swBlob(c, pet, swGrad(c, 0, 380, 0, 452, SW.pink), pal);
  c.save();
  c.clip(pet);
  c.strokeStyle = '#FFFFFF';
  c.lineWidth = 3.6;
  for (const [px, py] of petals) { c.beginPath(); c.ellipse(px, py + 1, 15, 17, 0, Math.PI * 0.12, Math.PI * 0.88); c.stroke(); }
  c.restore();
  for (const [px, py] of petals) {
    c.beginPath(); c.arc(px, py + 7, 3.4, 0, TAU);
    c.fillStyle = '#FFF4F9'; c.fill();
    c.strokeStyle = pal.line; c.lineWidth = 1.4 * SWK; c.stroke();
  }
  // วิปครีมฟู (ก้อนใหญ่สลับเล็ก)
  const cream = new Path2D();
  const M = 10;
  const cs = [];
  for (let i = 0; i < M; i++) {
    const u = i / (M - 1);
    const [px, py] = P(204 + 192 * u, 390 + Math.sin(u * Math.PI) * 22);
    const r = i % 2 ? 12.5 : 15;
    cs.push([px, py, r]);
    cream.moveTo(px + r, py);
    cream.arc(px, py, r, 0, TAU);
  }
  swBlob(c, cream, swGrad(c, 0, 376, 0, 418, SW.milk), pal);
  c.fillStyle = 'rgba(255,255,255,.95)';
  for (const [px, py, r] of cs) { c.beginPath(); c.ellipse(px - r * 0.3, py - r * 0.35, r * 0.32, r * 0.18, -0.4, 0, TAU); c.fill(); }
  if (k.back) return;
  const sx = (k.cpt ? (k.hxShift || 0) : (k.faceShift || 0)) * 0.5;
  const [bx, by] = P(300, 446);
  swBow(c, bx + sx, by, 25, pal, t, SW.pink, { tail: 1.35, gem: true, gemR: 0.5 });
}
/** กระโปรงสามชั้น: ซับลูกไม้ขาว · ทูลเล่มิ้นต์-ฟ้าชายคลื่น · ผ้าชมพูจับจีบรั้งเป็นสวากสามช่วง (โบว์มิ้นต์ตรงจุดรั้ง)
 *  ขอบเอวไอซิ่งไหลย้อยโรยเม็ดสายรุ้ง · หน้า: หัวเข็มขัดหัวใจคริสตัล โบว์สะโพกซ้าย ชาร์มคัพเค้กสะโพกขวา · หลัง: โบว์มิ้นต์ใหญ่หางยาว */
function sweetSkirt(c, k) {
  const pal = k.pal, t = k.t || 0;
  const P = k.pt || ((x, y) => [x, y]);
  const sit = k.mode === 'sit';
  const G = sit
    ? { y0: 530, y1: 616, x0: 176, x1: 424, fl: 50 }
    : { y0: 486, y1: 574, x0: 196, x1: 404, fl: 40 - 12 * (k.hold || 0) };
  const sw = Math.sin(t * 0.05) * 3;
  const bell = (g, hemFn, N = 48) => {
    const xa = G.x0 - g * 0.3, xb = G.x1 + g * 0.3, yh = G.y1 + g;
    const bx0 = xa - G.fl - g * 0.5 + sw * 0.4, bx1 = xb + G.fl + g * 0.5 + sw;
    const q = new Path2D();
    q.moveTo(...P(xa, G.y0));
    q.quadraticCurveTo(...P(300, G.y0 + 16), ...P(xb, G.y0));
    q.bezierCurveTo(...P(xb + G.fl * 0.25, G.y0 + 10), ...P(bx1 + 8, G.y0 + (yh - G.y0) * 0.5), ...P(bx1, yh + hemFn(1)));
    const hem = [];
    for (let i = 0; i <= N; i++) {
      const u = 1 - i / N;
      hem.push([bx0 + (bx1 - bx0) * u, yh + Math.sin(u * Math.PI) * 8 + hemFn(u)]);
    }
    for (const [x, y] of hem) q.lineTo(...P(x, y));
    q.bezierCurveTo(...P(bx0 - 8, G.y0 + (yh - G.y0) * 0.5), ...P(xa - G.fl * 0.25, G.y0 + 10), ...P(xa, G.y0));
    q.closePath();
    return { q, hem, bx0, bx1, yh };
  };
  const [, gy0] = P(300, G.y0), [, gy1] = P(300, G.y1 + 16);
  // 1) กระโปรงซับลูกไม้ขาว: ขอบหยักวงกลมกลืนเป็นชิ้นเดียวกับตัวผ้า
  const pet = bell(15, () => 0, 24);
  const petAll = new Path2D();
  petAll.addPath(pet.q);
  const lacePts = [];
  for (let i = 0; i < pet.hem.length; i++) {
    const [x, y] = pet.hem[i];
    lacePts.push(P(x, y));
    petAll.moveTo(...P(x + 8, y));
    const [px, py] = P(x, y);
    petAll.arc(px, py, 8, 0, TAU);
  }
  swBlob(c, petAll, swGrad(c, 0, gy0, 0, gy1, ['#FFFFFF', '#FFF6FA', '#FFE4F0']), pal);
  c.fillStyle = 'rgba(255,119,193,.8)';
  for (const [x, y] of lacePts) { c.beginPath(); c.arc(x, y + 2, 2, 0, TAU); c.fill(); }
  // 2) ทูลเล่มิ้นต์-ฟ้า ชายคลื่นถี่ + จีบนุ่ม + กากเพชร
  const tul = bell(7, (u) => Math.sin(u * Math.PI * 15) * 3.4, 120);
  c.fillStyle = swGrad(c, 0, gy0, 0, gy1, [SW.mint[0], SW.mint[1], SW.sky[1]]);
  c.fill(tul.q);
  c.save();
  c.clip(tul.q);
  c.lineCap = 'round';
  for (let i = 1; i < 14; i++) {
    const u = i / 14;
    const xa = G.x0 + (G.x1 - G.x0) * u, xb = tul.bx0 + (tul.bx1 - tul.bx0) * u;
    for (const [dx, col, w] of [[0, 'rgba(40,175,185,.15)', 5], [7, 'rgba(255,255,255,.6)', 3]]) {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(...P(xa + dx, G.y0 + 12));
      c.quadraticCurveTo(...P((xa + xb) / 2 + dx, (G.y0 + tul.yh) / 2), ...P(xb + dx, tul.yh + 10));
      c.stroke();
    }
  }
  c.fillStyle = 'rgba(255,255,255,.9)';
  for (let i = 0; i < 22; i++) {
    const [px, py] = P(tul.bx0 + hash(i * 3 + 40) * (tul.bx1 - tul.bx0), G.y0 + 20 + hash(i * 5 + 41) * (tul.yh - G.y0 - 14));
    c.beginPath(); c.arc(px, py, 1.6 + hash(i + 9) * 1.4, 0, TAU); c.fill();
  }
  c.restore();
  outline(c, tul.q, pal, SOL * 0.8);
  // 3) ผ้าชมพูรั้งเป็นสวาก: จุดรั้งสองจุด ชายห้อยเป็นโค้งสามช่วง (ข้างลงต่ำถึงชาย)
  const pickU = [0.335, 0.665];
  const pickY = G.y0 + (G.y1 - G.y0) * 0.5;
  const overY = (u) => {
    const lo = G.y1 + 2;
    if (u <= pickU[0]) { const l = u / pickU[0]; return lo - (lo - pickY) * l ** 2.2; }
    if (u >= pickU[1]) { const l = (1 - u) / (1 - pickU[1]); return lo - (lo - pickY) * l ** 2.2; }
    const l = (u - pickU[0]) / (pickU[1] - pickU[0]);
    return pickY + (G.y1 + 10 - pickY) * Math.sin(l * Math.PI) ** 0.85;
  };
  const ov = bell(0, (u) => overY(u) - (G.y1 + Math.sin(u * Math.PI) * 8), 60);
  // ลูกไม้เล็กใต้ชายสวาก
  const sl = [];
  for (let i = 1; i < ov.hem.length - 1; i += 2) { const [x, y] = ov.hem[i]; sl.push(P(x, y + 3)); }
  swLace(c, sl, 5.5, pal, '#FFFFFF', false);
  c.fillStyle = swGrad(c, 0, gy0, 0, gy1, SW.pink);
  c.fill(ov.q);
  c.save();
  c.clip(ov.q);
  c.lineCap = 'round';
  // จีบผ้ารวมเข้าหาจุดรั้ง
  for (let i = 1; i < 16; i++) {
    const u = i / 16;
    const xw = G.x0 + (G.x1 - G.x0) * u;
    const pu = u < 0.5 ? pickU[0] : pickU[1];
    const xp = ov.bx0 + (ov.bx1 - ov.bx0) * (pu + (u - pu) * 1.35);
    for (const [dx, col, w] of [[0, 'rgba(255,0,140,.2)', 5], [8, 'rgba(255,255,255,.5)', 3.2]]) {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(...P(xw + dx, G.y0 + 12));
      c.quadraticCurveTo(...P((xw + xp) / 2 + dx, G.y0 + (G.y1 - G.y0) * 0.6), ...P(xp + dx, G.y1 + 18));
      c.stroke();
    }
  }
  swSprinkles(c, P, G.x0 - 10, G.y0 + 18, G.x1 - G.x0 + 20, G.y1 - G.y0 - 18, 16, 3, 8);
  // ขอบขาวตามชายสวาก
  c.strokeStyle = '#FFFFFF';
  c.lineWidth = 9;
  c.lineJoin = 'round';
  c.beginPath();
  ov.hem.forEach(([x, y], i) => (i ? c.lineTo(...P(x, y)) : c.moveTo(...P(x, y))));
  c.stroke();
  c.restore();
  outline(c, ov.q, pal, SOL);
  // 4) ขอบเอว + ไอซิ่งไหลย้อย
  const band = new Path2D();
  band.moveTo(...P(G.x0 - 3, G.y0 - 4));
  band.quadraticCurveTo(...P(300, G.y0 + 12), ...P(G.x1 + 3, G.y0 - 4));
  band.lineTo(...P(G.x1 + 5, G.y0 + 13));
  band.quadraticCurveTo(...P(300, G.y0 + 31), ...P(G.x0 - 5, G.y0 + 13));
  band.closePath();
  c.fillStyle = swGrad(c, 0, gy0 - 4, 0, gy0 + 28, SW.hot);
  c.fill(band);
  outline(c, band, pal, SOL * 0.8);
  const ice = new Path2D();
  const iy = (u) => G.y0 - 7 + 32 * u * (1 - u);
  ice.moveTo(...P(G.x0 - 5, iy(0)));
  const D = 150;
  for (let i = 1; i <= D; i++) { const u = i / D; ice.lineTo(...P(G.x0 - 5 + (G.x1 - G.x0 + 10) * u, iy(u))); }
  // หยดครีมปลายมน (ครึ่งวงรี) ยาวไม่เท่ากัน — ระหว่างหยดเป็นโค้งเว้าขึ้น เห็นขอบเอวชมพูโผล่เป็นซุ้ม
  const dr = [[0.05, 10], [0.15, 17], [0.26, 9], [0.37, 15], [0.5, 12], [0.62, 18], [0.73, 9], [0.84, 15], [0.95, 10]];
  for (let i = D; i >= 0; i--) {
    const u = i / D;
    let d = 0;
    for (const [du, dl] of dr) { const q = (u - du) / 0.042; if (Math.abs(q) < 1) d = Math.max(d, dl * Math.sqrt(1 - q * q)); }
    ice.lineTo(...P(G.x0 - 5 + (G.x1 - G.x0 + 10) * u, iy(u) + 8 + d));
  }
  ice.closePath();
  c.fillStyle = swGrad(c, 0, gy0 - 8, 0, gy0 + 24, ['#FFFFFF', '#FFFBFD', '#FFDDEE']);
  c.fill(ice);
  c.save();
  c.clip(ice);
  c.strokeStyle = 'rgba(255,255,255,.95)';
  c.lineWidth = 3;
  c.beginPath();
  for (let i = 0; i <= 20; i++) { const u = 0.08 + 0.84 * (i / 20); const [x, y] = P(G.x0 + (G.x1 - G.x0) * u, iy(u) + 3); if (i) c.lineTo(x, y); else c.moveTo(x, y); }
  c.stroke();
  swSprinkles(c, P, G.x0, G.y0 - 6, G.x1 - G.x0, 14, 14, 11, 7);
  c.restore();
  outline(c, ice, pal, SOL * 0.7);
  for (let i = 0; i < 6; i++) {
    const a = Math.sin(t * 0.075 + i * 2.3);
    if (a <= 0.25) continue;
    const [gx, gy] = P(G.x0 - 14 + hash(i * 7 + 90) * (G.x1 - G.x0 + 28), G.y0 + 26 + hash(i * 3 + 91) * (G.y1 - G.y0 - 6));
    swSparkle(c, gx, gy, 2 + 6 * (a - 0.25) / 0.75, 1);
  }
  if (k.back) {
    const [bx, by] = P(300, G.y0 + 6);
    swBow(c, bx, by, 30, pal, t, SW.mint, { tail: 2.5, fold: 'rgba(30,160,125,.14)' });
    return;
  }
  // โบว์มิ้นต์ตรงจุดรั้ง
  for (const u of pickU) {
    const [px, py] = P(ov.bx0 + (ov.bx1 - ov.bx0) * u, pickY + 2);
    swBow(c, px, py, 11, pal, t, SW.mint, { tail: 1.5, w: SOL * 0.7, fold: 'rgba(30,160,125,.14)' });
  }
  // หัวเข็มขัด: ลูกอมเปปเปอร์มินต์ชมพูกรอบทอง (หมุนช้า ๆ)
  const [hx, hy] = P(300, G.y0 + 9);
  swPeppermint(c, hx, hy, 11, pal, t * 0.01);
  // โบว์สะโพกซ้าย หางยาวพาดกระโปรง
  const [lbx, lby] = P(G.x0 + 6, G.y0 + 8);
  swBow(c, lbx, lby, 17, pal, t, SW.hot, { tail: 2.3 });
  // ชาร์มคัพเค้กห้อยโซ่ทองสะโพกขวา (แกว่ง)
  const [cx0, cy0] = P(G.x1 - 12, G.y0 + 12);
  const swing = Math.sin(t * 0.06) * 0.18;
  const ex = cx0 + Math.sin(swing) * 22, ey = cy0 + Math.cos(swing) * 22;
  c.strokeStyle = SW.gold[2];
  c.lineWidth = 2.6;
  c.setLineDash([3, 2.5]);
  c.beginPath(); c.moveTo(cx0, cy0); c.lineTo(ex, ey); c.stroke();
  c.setLineDash([]);
  c.save();
  c.translate(ex, ey + 2);
  c.rotate(swing);
  swCupcake(c, 0, 8, 11, pal, t, { liner: [SW.lilac[1], '#FFFFFF'], cream: ['#FFFFFF', '#FFADDA', '#FF51B0'], w: 2.2 * SWK });
  c.restore();
}
/** หมวกคัพเค้กยักษ์: ถ้วยจีบมิ้นต์-ขาว ครีมวนสตรอว์เบอร์รี่สามชั้น เชอร์รี่ มงกุฎทองจิ๋วข้างครีม โบว์ชมพูข้างถ้วย · ประกายรอบหมวก */
function sweetHat(c, k) {
  const pal = k.pal, t = k.t || 0;
  c.save();
  rotAt(c, { x: 300, y: 150 }, -0.1);
  swCupcake(c, 300, 92, 52, pal, t, { liner: [SW.mint[1], '#FFFFFF'], cream: ['#FFFFFF', '#FFADDA', '#FF77C1'], crown: !k.back, w: SOL });
  if (!k.back) swBow(c, 344, 122, 12, pal, t, SW.hot, { tail: 1.1, w: SOL * 0.75 });
  c.restore();
  if (k.back) return;
  for (let i = 0; i < 4; i++) {
    const a = Math.sin(t * 0.07 + i * 1.9);
    if (a > 0.1) swSparkle(c, [236, 372, 250, 352][i], [70, 52, 30, 18][i], 7 * a, 1);
  }
}
/** ริบบิ้นยาวพลิ้วจากโบว์หู (สองเส้น ปลายตัดตัว V) — x0,y0 = โคนริบบิ้น */
function sweetRibbons(c, k, x0, y0) {
  const pal = k.pal, t = k.t || 0;
  for (const [len, sp, ph, w] of [[196, 0.52, 0, 21], [166, 0.86, 1.6, 18]]) {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      pts.push([x0 + Math.sin(sp) * len * u + Math.sin(u * 3.4 + ph + t * 0.05) * 17 * u, y0 + Math.cos(sp) * len * u + Math.cos(u * 2.8 + ph + t * 0.04) * 9 * u]);
    }
    const L = [], R = [], wd = [];
    for (let i = 0; i <= 14; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(14, i + 1)];
      const an = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const u = i / 14;
      const ww = w * (0.45 + 0.55 * Math.abs(Math.cos(u * 4.4 + ph + t * 0.04)));
      wd.push(ww);
      L.push([pts[i][0] - Math.sin(an) * ww * 0.5, pts[i][1] + Math.cos(an) * ww * 0.5]);
      R.push([pts[i][0] + Math.sin(an) * ww * 0.5, pts[i][1] - Math.cos(an) * ww * 0.5]);
    }
    const end = pts[14], pe = pts[13];
    const ea = Math.atan2(end[1] - pe[1], end[0] - pe[0]);
    const q = new Path2D();
    swSmooth(q, L, true);
    q.lineTo(end[0] - Math.cos(ea) * 9, end[1] - Math.sin(ea) * 9);
    swSmooth(q, R.slice().reverse(), false);
    q.closePath();
    c.fillStyle = swGrad(c, x0, y0, end[0], end[1], [SW.pink[1], SW.pink[0], SW.pink[1]]);
    c.fill(q);
    // ช่วงบิดเกลียว (แคบ) = เงาเข้ม
    c.save();
    c.clip(q);
    for (let i = 1; i < 14; i++) {
      if (wd[i] > w * 0.62) continue;
      c.fillStyle = 'rgba(255,0,140,.22)';
      c.beginPath(); c.arc(pts[i][0], pts[i][1], w * 0.7, 0, TAU); c.fill();
    }
    c.restore();
    outline(c, q, pal, SOL * 0.8);
  }
}
/** โบว์ซาตินชมพูบนหูขวา หัวใจคริสตัลกลาง (หันหลัง: ริบบิ้นยาวพาดหลังหัวด้วย) */
function sweetEarBow(c, k) {
  if (k.back) sweetRibbons(c, k, 404, 172);
  c.save();
  rotAt(c, { x: 398, y: 158 }, 0.32);
  swBow(c, 398, 158, 25, k.pal, k.t || 0, SW.pink, { tail: 0, gem: !k.back, gemR: 0.42 });
  c.restore();
}
/** ริบบิ้นยาวจากโบว์หู — วาดก่อนหัว (หัวบังโคน เห็นริบบิ้นพลิ้วออกมาข้างหัว) */
function sweetEarRibbon(c, k) {
  sweetRibbons(c, k, 404, 172);
}
/** ถุงเท้าลูกไม้: ระบายขาวหยักรอบข้อเท้า แถบชมพู โบว์ชมพูจิ๋วด้านนอก */
/**
 * ตัววิ่งสี่จังหวะ: ย้ายของพันข้อเท้าจากข้อเท้าท่ายืน (cx, cy, ครึ่งความกว้าง hw ในไฟล์) ไปข้อเท้าของขาวิ่ง
 * at = { x, y, ang, hw } — หมุนตามขา (แกน +y ของของชิ้นนั้น = ฝั่งเท้า) ย่อตามความกว้างขา
 */
function runAnklePt(at, cx, cy, hw) {
  const s = at.hw / hw, cs = Math.cos(at.ang), sn = Math.sin(at.ang);
  return (x, y) => {
    const lx = (x - cx) * s, ly = (y - cy) * s;
    return [at.x + lx * cs - ly * sn, at.y + lx * sn + ly * cs];
  };
}
function sweetSocks(c, k) {
  const pal = k.pal, t = k.t || 0;
  let P = k.pt || ((x, y) => [x, y]);
  const left = k.side === 'left';
  const [cx, cy, hw] = k.mode === 'sit' ? (left ? [264, 614, 27] : [336, 614, 27]) : (left ? [210, 606, 28] : [390, 606, 28]);
  if (k.ankleAt) P = runAnklePt(k.ankleAt, cx, cy, hw);
  const pts = [];
  for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push(P(cx - hw + 2 * hw * u, cy + 10 + Math.sin(u * Math.PI) * 5)); }
  swLace(c, pts, 6.5, pal);
  const bd = new Path2D();
  bd.moveTo(...P(cx - hw - 1, cy - 3));
  bd.quadraticCurveTo(...P(cx, cy + 6), ...P(cx + hw + 1, cy - 3));
  bd.lineTo(...P(cx + hw + 1, cy + 7));
  bd.quadraticCurveTo(...P(cx, cy + 16), ...P(cx - hw - 1, cy + 7));
  bd.closePath();
  const [, y0] = P(cx, cy - 3), [, y1] = P(cx, cy + 14);
  c.fillStyle = swGrad(c, 0, y0, 0, y1, SW.pink);
  c.fill(bd);
  outline(c, bd, pal, SOL * 0.7);
  if (k.back) return;
  const [bx, by] = P(cx + (left ? -1 : 1) * hw * 0.5, cy + 3);
  swBow(c, bx, by, 9.5, pal, t, SW.hot, { tail: 1.1, w: SOL * 0.55 });
}
/** โบว์หางชมพู + กระดิ่งทองห้อย (กระดิ่งห้อยตามแรงโน้มถ่วง แกว่งเบา ๆ) */
function sweetTailBow(c, k) {
  const pal = k.pal, t = k.t || 0;
  const { x, y, a } = k.at;
  const swing = Math.sin(t * 0.08) * 0.3;
  const bx = x + Math.sin(swing) * 16, by = y + Math.cos(swing) * 16;
  c.strokeStyle = SW.gold[2];
  c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(x, y); c.lineTo(bx, by - 6); c.stroke();
  const bell = new Path2D();
  bell.arc(bx, by, 8.5, 0, TAU);
  const g = c.createRadialGradient(bx - 3, by - 3, 1, bx, by, 9);
  g.addColorStop(0, '#FFF7CF'); g.addColorStop(0.5, '#FFD34A'); g.addColorStop(1, '#D98A0C');
  c.fillStyle = g;
  c.fill(bell);
  outline(c, bell, pal, 2.2 * SWK);
  c.strokeStyle = pal.line;
  c.lineWidth = 1.8 * SWK;
  c.beginPath(); c.moveTo(bx - 6, by + 1); c.lineTo(bx + 6, by + 1); c.stroke();
  c.fillStyle = pal.line;
  c.beginPath(); c.arc(bx, by + 4.5, 1.8, 0, TAU); c.fill();
  c.save();
  c.translate(x, y);
  c.rotate(a + Math.PI / 2);
  swBow(c, 0, 0, 15, pal, t, SW.pink, { tail: 1.2, w: SOL * 0.75 });
  c.restore();
}
/** ท่าเปิดตัว: ความชัดของเอฟเฟกต์ประจำชุดระหว่างท่า (ค่อย ๆ ปรากฏตามจังหวะ) · กดข้าม = ขึ้นเต็มตามการข้าม */
function swIntroVis(k) {
  if (k.intro == null) return { aura: 1, circle: 1, ribbon: 1, orbit: 1, hearts: 1 };
  const f = k.intro, s = k.introSkip || 0;
  const v = (a, b) => Math.max(s, clamp01((f - a) / (b - a)));
  return { aura: v(SWI.appear, SWI.appear + 64), circle: v(SWI.appear + 34, SWI.appear + 88), ribbon: v(SWI.open, SWI.open + 56), orbit: v(SWI.orbit - 12, SWI.orbit + 4), hearts: v(SWI.posed, SWI.dur) };
}
/** วาดคทาคัพเค้กที่ตำแหน่งด้าม (x,y) มุม a · lit = เรืองแสงเต็ม (ตอนลอย) · sc = ย่อ/ขยายรอบด้าม */
function swStaffDraw(c, x, y, a, pal, t, lit, sc = 1) {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  if (sc !== 1) c.scale(sc, sc);
  glowAt(c, 0, -196, 96 + 14 * Math.sin(t * 0.06), '255,81,176', 0.32 + 0.22 * lit);
  // ด้ามลูกกวาดเกลียว
  const st = new Path2D();
  st.roundRect(-6.5, -134, 13, 236, 6.5);
  c.fillStyle = '#FFFFFF';
  c.fill(st);
  c.save();
  c.clip(st);
  c.strokeStyle = SW.hot[1];
  c.lineWidth = 6;
  for (let yy = -150; yy < 110; yy += 15) { c.beginPath(); c.moveTo(-9, yy); c.lineTo(9, yy + 11); c.stroke(); }
  c.strokeStyle = 'rgba(255,255,255,.7)';
  c.lineWidth = 2.6;
  c.beginPath(); c.moveTo(-2.5, -128); c.lineTo(-2.5, 96); c.stroke();
  c.restore();
  outline(c, st, pal, SOL * 0.8);
  // ปลายด้ามลูกทอง
  const tip = new Path2D();
  tip.arc(0, 106, 9, 0, TAU);
  c.fillStyle = swGrad(c, -6, 98, 6, 114, SW.gold);
  c.fill(tip);
  outline(c, tip, pal, SOL * 0.6);
  c.fillStyle = 'rgba(255,255,255,.85)';
  c.beginPath(); c.arc(-3, 103, 2.4, 0, TAU); c.fill();
  // แหวนทองใต้ถ้วย
  const ring = new Path2D();
  ring.ellipse(0, -132, 13, 6, 0, 0, TAU);
  c.fillStyle = swGrad(c, 0, -138, 0, -126, SW.gold);
  c.fill(ring);
  outline(c, ring, pal, SOL * 0.6);
  // หัวคัพเค้ก
  swCupcake(c, 0, -172, 42, pal, t, { liner: [SW.lilac[1], '#FFFFFF'], cream: ['#FFD6EC', '#FF77C1', '#FF33A1'], w: SOL * 0.85 });
  swGem(c, 0, -152, 9, pal, t, SW.sky, true);
  // โบว์มิ้นต์ใต้ถ้วย
  swBow(c, 0, -124, 19, pal, t, SW.mint, { tail: 1.7, gem: true, gemR: 0.4, fold: 'rgba(30,160,125,.14)' });
  // ประกายวนรอบหัวคทา
  for (let i = 0; i < 3; i++) {
    const an = t * 0.045 + (i * TAU) / 3;
    const sx = Math.cos(an) * 66, sy = -200 + Math.sin(an) * 26;
    const tw = 0.6 + 0.4 * Math.sin(t * 0.1 + i * 2);
    swSparkle(c, sx, sy, (6 + 3 * tw) * (0.7 + 0.3 * lit), tw, i === 1 ? '#FFF3B0' : '#FFFFFF');
  }
  c.restore();
}
/** จุดกลางหัวคัพเค้กของคทา (พิกัดตัว) · sc = ขนาดคทา */
const swStaffHead = (x, y, a, sc = 1) => [x + Math.sin(a) * 195 * sc, y - Math.cos(a) * 195 * sc];
/**
 * คทาตอนบินลงมา ณ เฟรม f (ท่าเปิดตัว): โผล่บนฟ้าซ้ายบน ควงรอบกลางลำ (ย่อตอนบิน) ลอยลงทางซ้ายนอกหน้า แล้วขยายเข้ามือพอดีตอนรับ
 * gx,gy,ga = ตำแหน่ง/มุมคทาในมือ · คืน null = ยังไม่โผล่
 */
function swStaffFly(f, gx, gy, ga) {
  if (f < SWI.fall) return null;
  const MID = 67;   // กลางลำคทา (จากด้าม) — จุดหมุนตอนบิน
  const u = clamp01((f - SWI.fall) / (SWI.catch - SWI.fall)), e = KE.io(u);
  const Mend = [gx + Math.sin(ga) * MID, gy - Math.cos(ga) * MID];
  const [mx, my] = swQuad(SW_FLY0, SW_FLYC, Mend, e);
  const a = ga + (1 - e) * TAU * 2;
  const sc = 0.6 + 0.4 * e;
  return { x: mx - Math.sin(a) * MID * sc, y: my + Math.cos(a) * MID * sc, a, sc, mx, my, u };
}
const SW_FLY0 = [60, -50], SW_FLYC = [-40, 230];
/** โค้งกำลังสอง (จุดเริ่ม · จุดดึง · ปลาย) */
const swQuad = (p0, p1, p2, u) => {
  const v = 1 - u;
  return [v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0], v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1]];
};
/**
 * คทาในมือช่วงท่าเปิดตัว: ส่ายตอนรับ (สปริงหน่วง) + ควงเป็นวงกลางอากาศสองรอบก่อนร่ายเวท
 * ควงแบบกวนอากาศ (ปลายคทาวาดวงรีเหนือไหล่ ด้ามสั้นลงนิดตอนปลายหันเข้าหาจอ) — ไม่หมุนทั้งลำ หัวคทาจึงไม่กวาดผ่านหน้า
 * คืน { da: มุมที่เพิ่ม, sc: ขนาด (ย่อตามมุมมอง) }
 */
function swStaffSpin(f) {
  let da = 0, sc = 1;
  if (f >= SWI.catch) { const d = f - SWI.catch; da += Math.sin(d * 0.55) * 0.32 * Math.exp(-d * 0.11); }
  const u = clamp01((f - SWI.raise) / (SWI.burst - SWI.raise));
  if (u > 0 && u < 1) {
    const ph = TAU * 2 * KE.io(u), env = Math.sin(Math.PI * u);
    da += (Math.sin(ph) - 1) * 0.42 * env;   // วงควงอยู่ฝั่งนอกตัวทั้งวง (มุมเอนออกเท่านั้น) — ไม่กวาดเข้าหาหน้า
    sc = 1 - 0.16 * (1 - Math.cos(ph)) * 0.5 * env;
  }
  return { da, sc };
}
/**
 * คทาคัพเค้ก (ของถือ): ถือในอุ้งเท้าซ้ายจอทุกมุม · อุ้งเท้าไม่ว่าง/นั่ง/หมอบ = ลอยเรืองข้างตัว · หางอยู่หลังมือกับคทาเสมอ
 * k.grip = { x, y, d } อุ้งเท้า + มุมที่แขนหมุนไปจากท่าปกติ · k.busy 0..1 = เลื่อนจากในมือไปลอยข้างตัวแบบเนียน
 * k.layer: 'back' = ในมือ (วาดก่อนตัว อุ้งเท้ากำด้าม) · 'front' = เฉพาะท่าเปิดตัว (คทาบินลงมา รอยควง ระเบิดขนม — ทับหน้าตัว)
 */
function sweetStaff(c, k) {
  const pal = k.pal, t = k.t || 0;
  const b = ease(clamp01(k.busy ?? 1));
  const side = -1;   // ถือมือซ้ายจอทุกมุม (หันหลังด้วย — หางพาดไปขวา) หัวคทาเอนออกซ้าย
  const bob = Math.sin(t * 0.05) * 7;
  const fx = 70, fy = 476 + (k.drop || 0) * 0.55 + bob;
  const fa = side * (0.16 + Math.sin(t * 0.035) * 0.05);
  const g = k.grip;
  // ยกแขนขึ้นข้างตัว = ข้อมือหมุนตามเข็ม ถ้าคทาหมุนตามแขนตรง ๆ หัวคทาจะเอนเข้าหาหน้า — หมุนสวนนิดให้เอนออกนอกตัวเสมอ
  const ha = g ? side * 0.3 - (g.d || 0) * 0.3 : fa;
  let x = g ? g.x + (fx - g.x) * b : fx, y = g ? g.y + (fy - g.y) * b : fy;
  let a = g ? ha + (fa - ha) * b : fa;
  const lit = g ? b : 1;
  const ii = k.intro != null && !(k.introSkip > 0) ? k.intro : null;   // เฟรมท่าเปิดตัว (กดข้ามแล้ว = ถือปกติ)
  if (k.layer === 'front') {
    if (ii != null) sweetStaffIntro(c, k, ii, x, y, a);
    return;
  }
  let sc = 1;
  if (k.intro != null && k.introSkip > 0 && k.intro < SWI.catch) {
    // กดข้ามตอนคทายังบินอยู่: เลื่อนจากทางบินเข้ามือแบบเนียน (ไม่วาบไปโผล่ในมือ) · ยังไม่โผล่ = ค่อย ๆ โตขึ้นในมือ
    const u = k.introSkip, q = swStaffFly(k.intro, x, y, a);
    if (q) {
      x = q.x + (x - q.x) * u;
      y = q.y + (y - q.y) * u;
      a = q.a + (a - q.a) * u;
      sc = q.sc + (1 - q.sc) * u;
    } else sc = Math.max(0.02, u);
  }
  if (ii != null) {
    if (ii < SWI.catch) return;   // ยังไม่ถึงมือ — กำลังบินลงมา (วาดชั้นหน้า)
    const sp = swStaffSpin(ii);
    a += sp.da;
    sc = sp.sc;
  }
  swStaffDraw(c, x, y, a, pal, t, lit, sc);
  // ผงวิเศษร่วงจากปลายคทาตอนลอย
  if (lit > 0.05) {
    for (let i = 0; i < 5; i++) {
      const p = (t * 0.012 + i / 5) % 1;
      const px = x + Math.sin(a) * -100 + Math.sin(p * 6 + i) * 9, py = y + Math.cos(a) * 100 + p * 64;
      swSparkle(c, px, py, 4.5 * (1 - p) + 1, (1 - p) * lit, i % 2 ? '#FFF3B0' : '#FFFFFF');
    }
  }
}
/** ท่าเปิดตัว · คทาชั้นหน้า: บินควงลงมาหาอุ้งเท้า (มีรอยแสง) → รอยควงตอนหมุนเหนือหัว → ระเบิดขนมจากหัวคทาแล้วโค้งเข้าวงโคจร */
function sweetStaffIntro(c, k, f, gx, gy, ga) {
  const pal = k.pal, t = k.t || 0;
  // ── บินลงมา: โผล่บนฟ้าซ้ายบน ควงรอบกลางลำ (ย่อขนาดตอนบิน) ลอยลงทางซ้ายนอกหน้า แล้วขยายเข้ามือพอดี ──
  if (f >= SWI.fall - 8 && f < SWI.catch) {
    const P0 = SW_FLY0;
    const at = (u) => swStaffFly(SWI.fall + u * (SWI.catch - SWI.fall), gx, gy, ga);
    const u = clamp01((f - SWI.fall) / (SWI.catch - SWI.fall));
    // ประกายวาบดาวแตกตรงจุดที่คทาโผล่
    const pop = kenv(f, SWI.fall - 8, SWI.fall - 2, SWI.fall + 2, SWI.fall + 16);
    if (pop > 0) {
      glowAt(c, P0[0], P0[1], 64 * pop, '255,200,235', 0.7 * pop);
      swSparkle(c, P0[0], P0[1], 24 * pop, pop);
      const r = 18 + (1 - pop) * 50;
      for (let i = 0; i < 6; i++) { const an = (i * TAU) / 6; swSparkle(c, P0[0] + Math.cos(an) * r, P0[1] + Math.sin(an) * r, 7 * pop, pop, i % 2 ? '#FFF3B0' : '#FFFFFF'); }
    }
    if (f >= SWI.fall) {
      // หางแสงไล่ตามกลางลำ + หัวคทา
      for (let j = 7; j >= 1; j--) {
        const uj = u - j * 0.035;
        if (uj <= 0) continue;
        const q = at(uj);
        const [hx, hy] = swStaffHead(q.x, q.y, q.a, q.sc);
        const w = 1 - j / 8;
        swSparkle(c, hx, hy, 9 * w, 0.85 * w, j % 2 ? '#FFF3B0' : '#FFFFFF');
        swSparkle(c, q.mx, q.my, 6 * w, 0.6 * w);
      }
      const q = at(u);
      swStaffDraw(c, q.x, q.y, q.a, pal, t, 1, q.sc);
    }
  }
  // ── รอยแสงตามปลายคทาตอนควง (วงแสงกลางอากาศ) ──
  if (f > SWI.raise && f < SWI.burst + 14) {
    const fade = 1 - clamp01((f - SWI.burst) / 14);
    for (let j = 0; j < 16; j++) {
      const ff = Math.min(f, SWI.burst) - j * 1.4;
      if (ff < SWI.raise) break;
      const sp = swStaffSpin(ff);
      const [hx, hy] = swStaffHead(gx, gy, ga + sp.da, sp.sc);
      const w = (1 - j / 16) * fade;
      glowAt(c, hx, hy, 34 * w + 6, '255,140,210', 0.3 * w);
      swSparkle(c, hx, hy, 8 * w + 2, w, j % 3 ? '#FFFFFF' : '#FFF3B0');
    }
  }
  // ── ระเบิดขนมจากหัวคทา ──
  if (f >= SWI.burst && f < SWI.orbit + 6) {
    const [bx, by] = swStaffHead(gx, gy, ga);
    const d = f - SWI.burst;
    // แสงวาบ + วงคลื่น
    const fl = kenv(f, SWI.burst, SWI.burst + 2, SWI.burst + 5, SWI.burst + 26);
    glowAt(c, bx, by, 150 * fl + 20, '255,245,252', 0.9 * fl);
    glowAt(c, bx, by, 230 * fl + 20, '255,110,190', 0.4 * fl);
    for (let r = 0; r < 2; r++) {
      const p = clamp01((d - r * 5) / 26);
      if (p <= 0 || p >= 1) continue;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = `rgba(255,${190 + r * 40},235,${0.75 * (1 - p)})`;
      c.lineWidth = 9 * (1 - p) + 1;
      c.beginPath(); c.arc(bx, by, 20 + KE.out(p) * 170, 0, TAU); c.stroke();
      c.restore();
    }
    // เม็ดสายรุ้งกระจาย (ตกตามแรงโน้มถ่วง)
    if (d < 46) {
      c.save();
      c.lineCap = 'round';
      for (let i = 0; i < 26; i++) {
        const an = (i / 26) * TAU + hash(i + 300) * 0.4, sp = 3.2 + hash(i + 310) * 3.4;
        const px = bx + Math.cos(an) * sp * d, py = by + Math.sin(an) * sp * d + 0.06 * d * d;
        const rot = an + d * 0.3 * (i % 2 ? 1 : -1);
        c.globalAlpha = 1 - d / 46;
        c.strokeStyle = SW.sprinkle[i % 7];
        c.lineWidth = 3.6;
        c.beginPath(); c.moveTo(px - Math.cos(rot) * 5, py - Math.sin(rot) * 5); c.lineTo(px + Math.cos(rot) * 5, py + Math.sin(rot) * 5); c.stroke();
      }
      c.restore();
    }
    // ขนมเก้าชิ้นพุ่งออกแล้วโค้งเข้าไปเป็นขนมลอยวน (ส่งต่อให้วงโคจรพอดีเฟรม SWI.orbit)
    const u = clamp01(d / (SWI.orbit - SWI.burst));
    const eu = KE.out(u);
    const tEnd = t + (SWI.orbit - f);
    const fadeOut = 1 - clamp01((f - (SWI.orbit - 12)) / 16);
    for (let i = 0; i < SW_ORBIT.length; i++) {
      const o = swOrbitPos(i, tEnd);
      const an = -Math.PI / 2 + (i - 4) * 0.62;
      const ctrl = [bx + Math.cos(an) * 250, by + Math.sin(an) * 210];
      const [px, py] = swQuad([bx, by], ctrl, [o.x, o.y], eu);
      const grow = KE.back(clamp01(u * 3.2));
      c.save();
      c.globalAlpha *= fadeOut;
      for (let j = 1; j <= 2; j++) {
        const [qx, qy] = swQuad([bx, by], ctrl, [o.x, o.y], KE.out(clamp01(u - j * 0.05)));
        swSparkle(c, qx, qy, 6 - j * 2, 0.8 - j * 0.25, j % 2 ? '#FFFFFF' : '#FFF3B0');
      }
      glowAt(c, px, py, 34, '255,205,238', 0.45);
      swOrbitItem(c, SW_ORBIT[i], px, py, Math.max(0.05, grow * (0.76 + 0.3 * o.dep)), Math.sin(t * 0.03 + i) * 0.35 + (1 - eu) * 4, pal, t, i);
      c.restore();
    }
  }
}
/** วงโคจรเอียงรอบตัว: ด้านหน้าลงต่ำระดับเท้า (ไม่พาดทับชุด) ด้านหลังสูงระดับไหล่ (ตัวบัง เห็นแค่ข้างตัว) */
const SW_RING = { cx: 300, cy: 498, tilt: -0.16 };
function swRingPt(th, rx, ry) {
  const ex = Math.cos(th) * rx, ey = Math.sin(th) * ry;
  const ct = Math.cos(SW_RING.tilt), st = Math.sin(SW_RING.tilt);
  return [SW_RING.cx + ex * ct - ey * st, SW_RING.cy + ex * st + ey * ct];
}
/**
 * วาดริบบิ้นรุ้ง (ห้าแถบสี ขอบขาว แสงฟุ้งใต้) ตามจุด pts = [{ x, y, dep, w, al }]
 * front = วาดเฉพาะช่วงที่อยู่หน้าตัว (dep > 0) · ไม่ใช่ = ช่วงหลังตัว — แบ่งเป็นท่อนสั้น ๆ ตัดสินหน้า/หลังทีละท่อน
 */
function swRibbonDraw(c, pts, front) {
  const M = pts.length - 1;
  if (M < 2) return;
  for (let i = 0; i <= M; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(M, i + 1)];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    pts[i].nx = -(b.y - a.y) / l;
    pts[i].ny = (b.x - a.x) / l;
  }
  const off = (p, o) => [p.x + p.nx * o, p.y + p.ny * o];
  c.save();
  c.lineJoin = 'round';
  const CH = 4;
  for (let i0 = 0; i0 < M; i0 += CH) {
    const i1 = Math.min(M, i0 + CH);
    const mid = pts[(i0 + i1) >> 1];
    if ((mid.dep > 0) !== front) continue;
    const al = mid.al;
    if (al <= 0.01) continue;
    const seg = pts.slice(i0, i1 + 1);
    c.globalAlpha = al * (front ? 0.2 : 0.32);
    c.strokeStyle = '#FFFFFF';
    c.lineCap = 'round';
    c.lineWidth = mid.w + 12;
    c.beginPath();
    seg.forEach((p, j) => (j ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.stroke();
    c.lineCap = 'butt';
    for (let j = 0; j < 5; j++) {
      c.globalAlpha = al;
      c.strokeStyle = SW.rainbow[j];
      c.lineWidth = mid.w / 5 + 0.8;
      c.beginPath();
      seg.forEach((p, q) => { const [x, y] = off(p, (j - 2) * (p.w / 5)); if (q) c.lineTo(x, y); else c.moveTo(x, y); });
      c.stroke();
    }
    c.globalAlpha = al * 0.9;
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = 1.3;
    for (const e of [-1, 1]) {
      c.beginPath();
      seg.forEach((p, q) => { const [x, y] = off(p, e * p.w * 0.5); if (q) c.lineTo(x, y); else c.moveTo(x, y); });
      c.stroke();
    }
  }
  c.restore();
}
/** ริบบิ้นรุ้งพาสเทลพุ่งวนรอบตัว (หางจาง หัวเรือง ประกายวิ่งตาม) — front = ช่วงที่อ้อมผ่านหน้าตัว · vis = ความชัด (ท่าเปิดตัว) */
function sweetRibbon(c, t, front, vis = 1) {
  if (vis <= 0.01) return;
  const M = 80, head = t * 0.022, span = TAU * 0.8;
  const pts = [];
  for (let i = 0; i <= M; i++) {
    const s = i / M;
    const th = head - span * (1 - s);
    const dep = Math.sin(th);
    const [x, y] = swRingPt(th, 270, 140);
    pts.push({ x, y: y + Math.sin(th * 3 + t * 0.04) * 7, dep, s, al: 0.92 * clamp01(s / 0.35) * vis, w: (4 + 14 * Math.sin(Math.PI * s ** 0.7)) * (0.78 + 0.32 * dep) });
  }
  swRibbonDraw(c, pts, front);
  for (let gI = 0; gI < 4; gI++) {
    const s = (t * 0.006 + gI / 4) % 1;
    const p = pts[Math.round(s * M)];
    if ((p.dep > 0) !== front || s < 0.25) continue;
    swSparkle(c, p.x, p.y, 6 + 3 * Math.sin(t * 0.1 + gI), clamp01(s / 0.35) * vis);
  }
  const hd = pts[M];
  if ((hd.dep > 0) === front) {
    glowAt(c, hd.x, hd.y, 40, '255,220,245', 0.55 * vis);
    swSparkle(c, hd.x, hd.y, 13 + 3 * Math.sin(t * 0.12), vis);
  }
}
/** ขนมลอยวน: ชนิดตามลำดับ · ตำแหน่งบนวงโคจร ณ เวลา t (สวนทางริบบิ้น) */
const SW_ORBIT = ['cup', 'mac', 'donut', 'star', 'candy', 'lolly', 'gem', 'mac2', 'star2'];
function swOrbitPos(i, t) {
  const th = -t * 0.008 + (i * TAU) / SW_ORBIT.length;
  const [x, y0] = swRingPt(th, 286, 150);
  return { x, y: y0 + Math.sin(t * 0.05 + i * 1.7) * 9, dep: Math.sin(th) };
}
function swOrbitItem(c, kind, x, y, sc, rot, pal, t, i) {
  switch (kind) {
    case 'cup':
      c.save();
      c.translate(x, y); c.rotate(rot);
      swCupcake(c, 0, 4, 15 * sc, pal, t, { liner: [SW.sky[1], '#FFFFFF'], w: 1.9 * SWK });
      c.restore();
      break;
    case 'mac': swMacaron(c, x, y, 15 * sc, SW.pink, pal, rot); break;
    case 'mac2': swMacaron(c, x, y, 14 * sc, SW.lilac, pal, rot); break;
    case 'donut': swDonut(c, x, y, 16 * sc, SW.pink, pal, rot); break;
    case 'star': swStar(c, x, y, 14 * sc, pal, rot); break;
    case 'star2': swStar(c, x, y, 11 * sc, pal, rot, SW.mint); break;
    case 'candy': swCandy(c, x, y, 11 * sc, SW.mint, pal, rot); break;
    case 'lolly': swLolly(c, x, y, 13 * sc, pal, rot); break;
    default: swGem(c, x, y, 11 * sc, pal, t + i * 20, SW.hot, true);
  }
}
/** ขนมลอยวนรอบตัวตามวงโคจรเดียวกับริบบิ้น (สวนทาง) — ฝั่งไกลเล็กจาง ฝั่งใกล้ใหญ่ชัด · front = ฝั่งหน้าตัว */
function sweetOrbit(c, k, front, vis = 1) {
  if (vis <= 0.01) return;
  const t = k.t || 0, pal = k.pal;
  for (let i = 0; i < SW_ORBIT.length; i++) {
    const o = swOrbitPos(i, t);
    if ((o.dep > 0) !== front) continue;
    const sc = 0.76 + 0.3 * o.dep, rot = Math.sin(t * 0.03 + i) * 0.35;
    c.save();
    c.globalAlpha = (0.72 + 0.28 * (o.dep * 0.5 + 0.5)) * vis;
    glowAt(c, o.x, o.y, 34 * sc, '255,205,238', 0.4);
    swOrbitItem(c, SW_ORBIT[i], o.x, o.y, sc, rot, pal, t, i);
    c.restore();
  }
}
/** หลังตัว: แสงชมพูฟุ้ง · วงเวทใต้เท้า · ลำแสงพาสเทลสองชุดหมุนสวนกัน · วงแสงกระเพื่อมออก · ประกายลอยขึ้น · ริบบิ้นรุ้ง+ขนมฝั่งหลัง */
function sweetAura(c, k) {
  const t = k.t || 0;
  const V = swIntroVis(k);
  const lite = gfxLevel() === 'save';   // ประหยัดกราฟิก: เหลือแสงฟุ้ง วงเวท ริบบิ้น ขนมลอย
  const pulse = 1 + 0.06 * Math.sin(t * 0.05);
  c.save();
  c.globalAlpha *= V.aura;
  if (V.aura > 0.01) {
    glowAt(c, 300, 440, 340 * pulse, '255,119,193', 0.4);
    glowAt(c, 300, 480, 240, '190,160,255', 0.24);
    glowAt(c, 300, 330, 180, '255,248,232', 0.32);
  }
  c.restore();
  // วงเวทขนมหวานบนพื้นใต้เท้า: วงแสงซ้อนสามชั้น ดาวหกแฉก หัวใจ-ดาวเรียงรอบวง หมุนช้า ๆ (บีบแบนเป็นพื้น)
  if (V.circle > 0.01) {
    c.save();
    c.globalAlpha *= V.circle;
    c.globalCompositeOperation = 'lighter';
    c.translate(300, 644);
    c.scale(1, 0.26);
    const mg = c.createRadialGradient(0, 0, 0, 0, 0, 230);
    mg.addColorStop(0, 'rgba(255,170,220,.32)');
    mg.addColorStop(0.75, 'rgba(255,170,220,.12)');
    mg.addColorStop(1, 'rgba(255,170,220,0)');
    c.fillStyle = mg;
    c.beginPath(); c.arc(0, 0, 230, 0, TAU); c.fill();
    const mp = 0.8 + 0.2 * Math.sin(t * 0.05);
    for (const [r, col, w] of [[222, '255,119,193', 6], [196, '255,236,160', 3.5], [150, '160,240,215', 4]]) {
      c.strokeStyle = `rgba(${col},${0.55 * mp})`;
      c.lineWidth = w;
      c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
    }
    c.rotate(t * 0.006);
    if (!lite) {
      c.strokeStyle = `rgba(255,200,240,${0.42 * mp})`;
      c.lineWidth = 3;
      for (const o of [0, Math.PI / 3]) {
        c.beginPath();
        for (let i = 0; i <= 3; i++) { const a = o + (i * TAU) / 3; if (i) c.lineTo(Math.cos(a) * 150, Math.sin(a) * 150); else c.moveTo(Math.cos(a) * 150, Math.sin(a) * 150); }
        c.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12, x = Math.cos(a) * 209, y = Math.sin(a) * 209;
        c.fillStyle = i % 2 ? `rgba(255,240,170,${0.8 * mp})` : `rgba(255,81,176,${0.85 * mp})`;
        if (i % 2) { c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill(); }
        else c.fill(swHeartP(x, y, 9));
      }
    }
    c.restore();
  }
  if (!lite && V.aura > 0.01) {
    c.save();
    c.globalAlpha *= V.aura;
    c.globalCompositeOperation = 'lighter';
    c.translate(300, 430);
    for (const [n, spin, len, wid, alpha, cols] of [
      [14, 0.0035, 410, 34, 0.2, ['255,119,193', '255,230,140', '150,240,212', '200,175,255']],
      [9, -0.0024, 340, 15, 0.16, ['255,255,255']],
    ]) {
      c.save();
      c.rotate(t * spin);
      for (let i = 0; i < n; i++) {
        const rc = cols[i % cols.length];
        const al = alpha * (0.7 + 0.3 * Math.sin(t * 0.04 + i * 1.3));
        const g = c.createLinearGradient(0, 0, 0, -len);
        g.addColorStop(0, `rgba(${rc},0)`);
        g.addColorStop(0.2, `rgba(${rc},${al})`);
        g.addColorStop(1, `rgba(${rc},0)`);
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(-5, 0);
        c.lineTo(-wid, -len);
        c.quadraticCurveTo(0, -len - 24, wid, -len);
        c.lineTo(5, 0);
        c.closePath();
        c.fill();
        c.rotate(TAU / n);
      }
      c.restore();
    }
    // วงแสงกระเพื่อมออกจากตัว (คลื่นเวทมนตร์)
    for (let i = 0; i < 2; i++) {
      const p = (t * 0.006 + i * 0.5) % 1;
      c.strokeStyle = `rgba(255,${200 + i * 30},240,${0.3 * (1 - p)})`;
      c.lineWidth = 7 * (1 - p) + 1;
      c.beginPath();
      c.ellipse(0, 20, 120 + p * 220, (120 + p * 220) * 0.86, 0, 0, TAU);
      c.stroke();
    }
    c.restore();
    // ประกายลอยขึ้นช้า ๆ รอบตัว
    for (let i = 0; i < 18; i++) {
      const hx = hash(i * 3 + 1), hy = hash(i * 7 + 5), ph = hash(i * 11 + 2) * TAU;
      const x = 300 + (hx * 2 - 1) * 296;
      const y = 650 - ((hy * 560 + t * 0.35) % 560);
      const fade = clamp01((650 - y) / 60) * clamp01((y - 90) / 60);
      const a = Math.max(0, Math.sin(t * 0.07 + ph)) * fade * V.aura;
      swSparkle(c, x, y, 4 + hash(i + 30) * 7, a, i % 3 ? '#FFFFFF' : '#FFF3B0');
    }
  }
  sweetRibbon(c, t, false, V.ribbon);
  sweetOrbit(c, k, false, V.orbit);
}
/** หน้าตัว: ริบบิ้นรุ้งช่วงที่อ้อมผ่านหน้า · ขนมฝั่งหน้า · หัวใจลอยขึ้นข้างตัว · ประกายหน้าตัว */
function sweetFront(c, k) {
  const t = k.t || 0, pal = k.pal;
  const V = swIntroVis(k);
  sweetRibbon(c, t, true, V.ribbon);
  sweetOrbit(c, k, true, V.orbit);
  if (V.hearts <= 0.01) return;
  for (let i = 0; i < 6; i++) {
    const p = (t * 0.0045 + i / 6) % 1;
    const s = i % 2 ? 1 : -1;
    const x = 300 + s * (212 + 40 * hash(i + 3)) + Math.sin(p * 9 + i) * 14;
    const y = 600 - p * 430;
    const a = Math.sin(p * Math.PI) * V.hearts;
    const r = 6 + 4 * hash(i + 9);
    c.save();
    c.globalAlpha = a * 0.92;
    const h = swHeartP(x, y, r);
    c.fillStyle = swGrad(c, x, y - r, x, y + r, i % 3 ? SW.hot : SW.pink);
    c.fill(h);
    c.strokeStyle = pal.line;
    c.lineWidth = 1.6 * SWK;
    c.stroke(h);
    c.fillStyle = 'rgba(255,255,255,.85)';
    c.beginPath(); c.ellipse(x - r * 0.45, y - r * 0.4, r * 0.25, r * 0.14, -0.6, 0, TAU); c.fill();
    c.restore();
  }
  for (let i = 0; i < 6; i++) {
    const s = i % 2 ? 1 : -1;
    const x = 300 + s * (200 + hash(i + 60) * 90), y = 160 + hash(i + 70) * 440;
    const a = Math.max(0, Math.sin(t * 0.09 + i * 2.1)) * V.hearts;
    swSparkle(c, x, y, 5 + hash(i + 80) * 5, a);
  }
}

// ══ ท่าเปิดตัว + ท่าแอ็ค ของเหมียวขนมหวาน (ตามสตอรีของผู้ใช้ · ~6.6 วิ · เฟรมที่ 60fps) ══
//   0.1  แอบมอง: น้องเอียงตัวโผล่หัวออกมาจากขอบฉาก (เห็นตา หู หมวกคัพเค้ก) มองเข้าไปในห้อง กะพริบตา
//        หันมาเห็นคนดู ตาโตเป็นประกาย สะดุ้ง แล้วรีบหดหัวกลับ (มีเส้นความเร็ว)
//   1.2  คัพเค้กยักษ์เด้งดึ๋ง ๆ สามจังหวะออกมาจากขอบเดิม (ยุบตัวทุกครั้งที่แตะพื้น) มาหยุดกลางห้อง
//   2.1  คัพเค้กสั่นดุ๊กดิ๊ก วงเวทวาดตัวเองใต้คัพเค้ก เม็ดสายรุ้งหมุนวนเข้าหา ฉากหรี่ลง
//   2.5  ป๊อป! ฝาครีมกระเด็นหมุนขึ้นฟ้า ถ้วยแตกออกสองข้าง ครีมฟุ้ง น้องเด้งออกมาจากคัพเค้ก (หลับตายิ้ม)
//        ริบบิ้นรุ้งพันจากเท้าขึ้นหัวแล้วคลายออก
//   3.3  ลืมตาเป็นประกาย คทาโผล่บนฟ้า ควงตัวบินลงมา น้องยกอุ้งเท้ารับ
//   4.4  ชูคทาควงเป็นวงแสงกลางอากาศ → 5.0 หัวคทาระเบิดเป็นขนม ขนมเก้าชิ้นโค้งกลับเป็นวงขนมลอยวน
//   5.2  โพสท่าแอ็ค ขยิบตา หางตวัด หัวใจเด้ง → ไหลเข้าท่าแอ็คที่มีชีวิต
const SWI = {
  peek: 6, hide: 54, gone: 64,                 // แอบมองจากขอบฉาก
  cupIn: 70, land1: 92, land2: 110, cupLand: 124,   // คัพเค้กเด้งสามจังหวะมากลางห้อง
  appear: 152,                                 // ป๊อป! น้องเด้งออกจากคัพเค้ก
  open: 200, fall: 208, catch: 244, raise: 266, burst: 302, pose: 310, posed: 332, orbit: 358, dur: 398,
};
/** ระยะที่ตัวน้องหลบอยู่หลังขอบฉากตอนแอบมอง (หน่วยไฟล์ — กลางตัวอยู่ซ้ายขอบเท่านี้ ตอนตัวตรงมิดพอดี) */
const SW_PEEK_HIDE = 290;
/** ขนาดคัพเค้กยักษ์ (ครึ่งความกว้างถ้วย หน่วยไฟล์) */
const SW_CUP_R = 122;
/**
 * การเคลื่อนไหวเล็ก ๆ ตลอดเวลา (ตัวไม่นิ่งเป็นหุ่นระหว่างท่า): โยกตัว หัวเอียง หูขยับ — คลื่นสองความถี่ผสมกัน ไม่ซ้ำเป็นจังหวะเครื่องจักร
 * f = เฟรม · amt = ความแรง
 */
function swLife(f, amt = 1) {
  return {
    lean: (Math.sin(f * 0.043) * 0.009 + Math.sin(f * 0.019 + 1.3) * 0.006) * amt,
    tilt: (Math.sin(f * 0.051 + 0.7) * 0.016 + Math.sin(f * 0.023 + 2) * 0.01) * amt,
    ear: Math.sin(f * 0.07 + 0.4) * 0.05 * amt,
  };
}
/**
 * สายตาแบบสัตว์จริง: มองค้างที่จุดหนึ่ง แล้วกระตุกไปจุดใหม่เร็ว ๆ (0.2 วิ) — ไม่ใช่กลอกช้า ๆ ตลอดเวลา
 * T = วินาที · คืน { x, y }
 */
function swGlance(T, period = 3.1) {
  const PTS = [[0, 0], [0.32, -0.1], [-0.28, 0.05], [0.12, 0.12], [0, 0], [-0.18, -0.15], [0.38, 0.06]];
  const n = Math.floor(T / period), u = T - n * period;
  const at = (m) => PTS[Math.floor(hash(m + 77) * PTS.length)];
  const p0 = at(n - 1), p1 = at(n), e = KE.io(clamp01(u / 0.2));
  return { x: p0[0] + (p1[0] - p0[0]) * e, y: p0[1] + (p1[1] - p0[1]) * e };
}
/**
 * ท่าแอ็ค (ยืนค้างหน้าล็อบบี้ได้): ชูคทาเฉียงข้างตัว อุ้งเท้าแตะแก้ม เอียงหัว ยิ้ม
 * มีชีวิต: หายใจ/กะพริบ (ตัววาดทำเอง) · มองไปมาแบบค้าง-กระตุก · ตัวโยก หูขยับ หางส่าย
 * · ขยิบตาทุก ~6 วิ (หันมามองคนดูก่อนขยิบ หูกระดิกตาม) · นาน ๆ ทีโบกคทาเบา ๆ
 */
const SWEET_ACT = {
  shape(t) {
    const T = t / 60;
    const w = T % 6.4;
    const L = swLife(t);
    const g = swGlance(T);
    const wk = kenv(w, 5.25, 5.5, 6.2, 6.4);            // ช่วงขยิบตา: หันมามองคนดูก่อน
    const fl = kenv(T % 9.7, 7.7, 8.0, 8.2, 8.7);         // โบกคทาเบา ๆ
    return {
      raiseL: 0.82 + Math.sin(T * 1.3) * 0.035 + fl * 0.12,
      chinR: 1,
      tilt: 0.12 + Math.sin(T * 0.85) * 0.02 + L.tilt + wk * 0.04,
      lean: Math.sin(T * 0.6) * 0.012 + L.lean,
      ear: -0.15 + L.ear - kenv(w, 5.55, 5.62, 5.7, 5.9) * 0.25,
      winkCute: w > 5.6 && w < 6.15 ? 1 : 0,
      mouth: 0.28 + kenv(w, 5.55, 5.65, 6.0, 6.2) * 0.14,
      gaze: g.x * (1 - wk),
      gazeY: g.y * (1 - wk),
      wag: 0.55 + Math.sin(T * 1.7) * 0.5 + fl * 0.4,
    };
  },
};
/** ช่วงของท่า ณ เฟรม f: 'peek' = แอบมองจากขอบฉาก (ตัววาดย้ายไปหลังขอบ+ตัดขอบ) · 'hidden' = ยังไม่มีน้อง · 'show' = ปกติ */
function sweetIntroStage(f) {
  return f < SWI.gone ? 'peek' : f < SWI.appear ? 'hidden' : 'show';
}
/** รูปร่างตัว ณ เฟรม f ของท่าเปิดตัว (t = เวลาของเกม ใช้ตอนไหลเข้าท่าแอ็คท้ายท่า) */
function sweetIntroShape(f, t) {
  const A = SWI;
  if (f < A.gone) {
    // ── แอบมอง: เอียงตัวจากหลังขอบ หัวโผล่ → โยกหัวอยากรู้อยากเห็น มองรอบห้อง → กะพริบ
    //    → หันขวับมาเห็นคนดู ตาโต → สะดุ้ง (ตัวยืด หูลู่) หดกลับเร็ว ๆ ──
    const P = A.peek;
    const look = kenv(f, P + 12, P + 18, A.hide - 6, A.hide);
    return {
      // เอียงมาก + หัวเอียงสวนกลับ = เห็นแค่หัว (ตัวกับแขนยังหลบหลังขอบ)
      lean: ktrack(f, [[P, 0], [P + 12, 0.96, KE.out], [P + 16, 0.9], [A.hide - 4, 0.92], [A.hide, 1.0, KE.out], [A.hide + 9, -0.05, KE.in], [A.gone + 2, 0]])
        + Math.sin(t * 0.21) * 0.016 * look,
      tilt: -0.34 + ktrack(f, [[P + 14, 0], [P + 20, 0.1, KE.out], [P + 28, 0.06], [P + 33, -0.06, KE.out], [P + 40, 0]])
        + Math.sin(t * 0.15) * 0.02 * look,
      // มองไล่ในห้อง (ค้าง-กระตุก) แล้วหันขวับมาหาคนดู
      gaze: ktrack(f, [[P + 10, 0], [P + 15, 0.35, KE.out], [P + 21, 0.35], [P + 24, 0.85, KE.out], [P + 30, 0.8], [P + 33, 0.08, KE.out], [P + 36, 0]]),
      gazeY: ktrack(f, [[P + 10, 0], [P + 15, -0.15, KE.out], [P + 21, -0.15], [P + 24, 0.1, KE.out], [P + 30, 0.1], [P + 33, 0, KE.out]]),
      ear: ktrack(f, [[P, 0.25], [P + 12, -0.45, KE.out], [P + 22, -0.3], [P + 25, -0.55, KE.out], [P + 29, -0.3], [A.hide - 4, -0.25], [A.hide - 1, -0.75, KE.out]]),
      shut: kenv(f, P + 26, P + 28, P + 29, P + 32),
      mood: f > P + 36 && f < A.hide + 6 ? 'starry' : '',
      mouth: kenv(f, P + 14, P + 17, P + 22, P + 26) * 0.4 + kenv(f, A.hide - 4, A.hide - 2, A.hide + 1, A.hide + 4) * 0.7,
      sy: kenv(f, A.hide - 4, A.hide - 1, A.hide, A.hide + 4) * 0.06,
      wag: 0.3,
    };
  }
  const L = swLife(t);   // เวลาจริง (ท่าเปิดตัวถูกยืดเวลา — ตัวยังขยับเล็ก ๆ ความเร็วปกติ ไม่ดูเป็นสโลว์)
  // ── ปรากฏตัวจากคัพเค้ก: โตจากในถ้วย → ยืดตัวสูงตอนพุ่งขึ้น → กลมตอนลอยสูงสุด → ยืดตอนตก → ยุบตอนแตะพื้น → เด้งคืน ──
  const g = ktrack(f, [[A.appear, -0.86], [A.appear + 9, 0, KE.out]]);
  const ssY = ktrack(f, [[A.appear + 3, 0], [A.appear + 8, 0.15, KE.out], [A.appear + 12, 0.03], [A.appear + 18, 0.08], [A.appear + 23, -0.13, KE.out], [A.appear + 30, 0.04], [A.appear + 38, 0]]);
  const ssX = ktrack(f, [[A.appear + 3, 0], [A.appear + 8, -0.07, KE.out], [A.appear + 12, 0], [A.appear + 18, -0.03], [A.appear + 23, 0.1, KE.out], [A.appear + 30, -0.03], [A.appear + 38, 0]]);
  const landEar = kenv(f, A.appear + 21, A.appear + 24, A.appear + 26, A.appear + 38);   // หูตกตอนแตะพื้น (น้ำหนัก) แล้วตั้งคืน
  // ── รับคทา: ตาเงยมองตาม → ยุบรับน้ำหนัก แขนตกนิดแล้วดีดคืน หัวพยักตาม ──
  const watch = kenv(f, A.fall - 4, A.fall + 6, A.catch - 6, A.catch + 8);
  const catchSq = ktrack(f, [[A.catch - 2, 0], [A.catch + 3, 1, KE.out], [A.catch + 14, 0]]);
  const catchDip = ktrack(f, [[A.catch - 1, 0], [A.catch + 4, 1, KE.out], [A.catch + 16, 0]]);
  // ── ควงคทา: เฟสเดียวกับ swStaffSpin — หัว/ตัว/หูตามวงควงช้ากว่าหนึ่งจังหวะ ──
  const tu = clamp01((f - A.raise) / (A.burst - A.raise)), tph = TAU * 2 * KE.io(tu), tenv = Math.sin(Math.PI * tu);
  // ── ร่ายเวท: ย่อตัวรวมพลัง → ยืดตัวพุ่งขึ้นตอนขนมระเบิด → เงยมองขนมที่กระจาย ──
  const burstK = ktrack(f, [[A.burst - 10, 0], [A.burst - 2, -0.6, KE.out], [A.burst + 4, 1, KE.out], [A.burst + 20, 0]]);
  const burstLook = kenv(f, A.burst - 4, A.burst + 4, A.pose - 2, A.pose + 6);
  // ── โพสท่าแอ็ค: แขนนำ หัวตามช้ากว่า 4 เฟรม ไหล่ห่อนิดตอนแตะแก้ม (เขิน) ──
  const POSE = [[A.pose, 0], [A.posed - 5, 1.06], [A.posed + 3, 1]];
  const poseK = ktrack(f, POSE);
  const poseLag = ktrack(f - 4, POSE);
  const shrug = kenv(f, A.pose + 10, A.pose + 15, A.pose + 18, A.pose + 30);
  const raise = ktrack(f, [[A.fall + 6, 0], [A.catch - 4, 0.52, KE.out], [A.catch, 0.5], [A.catch + 5, 0.38, KE.out], [A.catch + 13, 0.5],
    [A.raise + 2, 1.05], [A.raise + 8, 1], [A.burst - 4, 1], [A.burst + 2, 1.06, KE.out], [A.burst + 12, 1], [A.posed, 0.82]]);
  const s = {
    sx: g + ssX - catchSq * 0.03 - Math.min(0, burstK) * 0.04 - Math.max(0, burstK) * 0.03 + shrug * 0.02,
    sy: g + ssY - catchSq * 0.05 + burstK * 0.06 - shrug * 0.035,
    // เด้งตัวลอยนิดตอนพุ่งออกจากถ้วย แล้วแตะพื้น · กระโดดดีใจตอนขนมระเบิด · เด้งเบา ๆ ตอนโพส
    lift: ktrack(f, [[A.appear, 0], [A.appear + 10, 9, KE.out], [A.appear + 22, 0, KE.in]])
      + ktrack(f, [[A.burst - 2, 0], [A.burst + 8, 5, KE.out], [A.burst + 22, 0, KE.in]])
      + ktrack(f, [[A.pose + 6, 0], [A.pose + 14, 3, KE.out], [A.posed + 6, 0, KE.in]]),
    raiseL: raise,
    chinR: poseK,
    // ช่วงปรากฏตัวหลับตายิ้ม ∩ (สงบ อบอุ่น) → แว้บหลับปกติ → ค่อย ๆ ลืมตาเป็นประกาย
    shut: f < A.open - 10 ? 0 : ktrack(f, [[A.open - 10, 1], [A.open - 4, 1], [A.open + 4, 0]]),
    mood: f < A.open - 10 ? 'happy' : f >= A.open - 3 && f < A.pose + 8 ? 'starry' : '',
    winkCute: f >= A.pose + 8 && f < A.orbit + 12 ? 1 : 0,
    mouth: kenv(f, A.open, A.open + 4, A.open + 14, A.open + 24) * 0.6
      + kenv(f, A.catch, A.catch + 3, A.catch + 6, A.catch + 12) * 0.3
      + kenv(f, A.burst - 2, A.burst + 2, A.burst + 10, A.burst + 18) * 0.7
      + kenv(f, A.pose + 8, A.pose + 12, A.pose + 22, A.pose + 30) * 0.5
      + ktrack(f, [[A.pose + 24, 0], [A.posed + 18, 0.28]]),
    ear: ktrack(f, [[A.appear, 0.35], [A.appear + 12, -0.55, KE.out], [A.appear + 30, -0.2], [A.burst - 4, -0.2], [A.burst + 2, -0.6, KE.out], [A.burst + 20, -0.15]])
      + landEar * 0.35 + catchDip * 0.22 + Math.sin(tph - 0.9) * 0.09 * tenv - kenv(f, A.pose + 8, A.pose + 11, A.pose + 13, A.pose + 20) * 0.2 + L.ear,
    // ตา: เงยมองคทาที่ตกลงมาทางซ้ายบน → มองตามวงที่ควง → เงยมองขนมที่ระเบิด → กลับมามองคนดู
    gaze: -0.5 * watch - (0.3 + Math.sin(tph) * 0.15) * tenv - 0.35 * burstLook,
    gazeY: -0.55 * watch * (1 - clamp01((f - A.catch + 10) / 14)) - (0.3 + Math.cos(tph) * 0.12) * tenv - 0.4 * burstLook,
    tilt: -0.08 * watch + catchDip * 0.05 + (-0.05 + Math.sin(tph - 0.7) * 0.04) * tenv + 0.03 * kenv(f, A.burst - 2, A.burst + 6, A.pose - 6, A.pose)
      + 0.12 * poseLag + L.tilt,
    lean: -0.025 * watch + (-0.03 + Math.sin(tph - 0.3) * 0.012) * tenv + ktrack(f, [[A.burst - 8, 0], [A.burst + 6, 0.025], [A.pose + 12, 0]])
      + kenv(f, A.pose + 2, A.pose + 12, A.pose + 16, A.posed + 10) * 0.02 + L.lean,
    // หาง: สะบัดตามแรงตอนแตะพื้น (follow-through) · ตวัดแรงตอนโพส
    wag: ktrack(f, [[A.appear, 1], [A.appear + 40, 0.25]])
      + Math.sin((f - A.appear - 22) * 0.3) * 0.5 * Math.exp(-Math.max(0, f - A.appear - 22) * 0.06) * (f > A.appear + 22 ? 1 : 0)
      + Math.sin(t * 0.21) * 1.25 * kenv(f, A.pose + 4, A.pose + 14, A.orbit, A.orbit + 26),   // ตวัดตามเวลาจริง (ช่วงโพสถูกยืด)
  };
  // ── ช่วงที่ยืดเวลาออก (ผู้ใช้ขอให้ช้าลง): ท่าเล็ก ๆ ตามเวลาจริง ตัวไม่ค้างนิ่งระหว่างรอ ──
  // หลับตายิ้มระหว่างริบบิ้นพันตัว: โยกตัวดีใจซ้าย-ขวา หัวโยกตามช้ากว่าหนึ่งจังหวะ หูขยับ หางส่าย
  const smile = kenv(f, A.appear + 30, A.appear + 38, A.open - 12, A.open - 4);
  s.lean += Math.sin(t * 0.085) * 0.03 * smile;
  s.tilt += Math.sin(t * 0.085 - 0.9) * 0.05 * smile;
  s.ear += Math.sin(t * 0.17) * 0.08 * smile;
  s.wag += Math.sin(t * 0.2) * 0.5 * smile;
  // ลุ้นรอคทาที่ลอยลงมาช้า ๆ: ขยับตัวขึ้น-ลงเบา ๆ โยกนิด ๆ
  const wait = kenv(f, A.fall + 4, A.fall + 12, A.catch - 10, A.catch - 4);
  s.sy += Math.sin(t * 0.26) * 0.018 * wait;
  s.lean += Math.sin(t * 0.13) * 0.012 * wait;
  // ท้ายท่า: ไหลเข้าท่าแอ็ค (ส่วนที่ขยับตามเวลา) ไม่มีรอยต่อ
  const u = KE.io(clamp01((f - (A.dur - 40)) / 40));
  return u > 0 ? kmix(s, SWEET_ACT.shape(t), u) : s;
}
/** คัพเค้กยักษ์ (ที่น้องซ่อนอยู่ข้างใน): ถ้วยลายทางชมพูบาร์บี้-ขาว ขอบทอง โบว์ชมพูหัวใจคริสตัลหน้าถ้วย · part = 'cup' / 'cream' / ทั้งชิ้น */
function swBigCupcake(c, pal, t, part) {
  const R = SW_CUP_R;
  swCupcake(c, 0, -R * 1.01, R, pal, t, { liner: [SW.hot[1], '#FFFFFF'], cream: ['#FFFFFF', '#FFD6EC', '#FF77C1'], w: SOL, part });
  if (part !== 'cream') swBow(c, 0, -R * 0.6, R * 0.25, pal, t, SW.pink, { tail: 1.2, gem: true, gemR: 0.42 });
}
/** ตำแหน่งคัพเค้กยักษ์ ณ เฟรม f (กลางก้นถ้วย · มุม · ยืด/ยุบ) — เด้งสามจังหวะจากขอบฉากมากลางห้อง แล้วสั่นรอป๊อป */
function swCupAt(f, edge) {
  const A = SWI;
  const x0 = Math.max(-2400, Math.min(-60, edge - 140));   // จอกว้างมาก (แท็บเล็ต) ก็ยังเริ่มนอกขอบจอ
  const X = [x0, x0 + (300 - x0) * 0.46, x0 + (300 - x0) * 0.8, 300];
  const F = [A.cupIn, A.land1, A.land2, A.cupLand];
  const H = [180, 110, 55];
  let x = 300, y = 646, rot = 0, sx = 1, sy = 1;
  if (f < A.cupLand) {
    const j = f < A.land1 ? 0 : f < A.land2 ? 1 : 2;
    const u = clamp01((f - F[j]) / (F[j + 1] - F[j]));
    x = X[j] + (X[j + 1] - X[j]) * u;
    y = 646 - H[j] * 4 * u * (1 - u);
    rot = Math.sin(u * Math.PI) * (j % 2 ? 0.18 : -0.22);
    // ยืดตอนพุ่งขึ้น/ตกลง (เร็ว) กลมตอนลอยสูงสุด
    const st = Math.abs(1 - 2 * u) * 0.08 * (1 - j * 0.25);
    sy = 1 + st; sx = 1 - st * 0.6;
  }
  // ยุบตัวทุกครั้งที่แตะพื้น (squash) แล้วเด้งคืน
  for (const [fl, amt] of [[A.land1, 0.22], [A.land2, 0.17], [A.cupLand, 0.13]]) {
    const d = f - fl;
    if (d >= 0 && d < 9) { const q = Math.sin((d / 9) * Math.PI) * amt; sy -= q; sx += q * 0.7; }
  }
  if (f >= A.cupLand) {
    // สั่นดุ๊กดิ๊กรอป๊อป (แรงขึ้นเรื่อย ๆ) + ย่อตัวรวมพลังก่อนแตก
    const g = clamp01((f - A.cupLand - 6) / (A.appear - A.cupLand - 10));
    rot = Math.sin((f - A.cupLand) * 1.52) * 0.09 * g;
    sy += Math.sin((f - A.cupLand) * 0.88) * 0.035 * g;
    const pre = kenv(f, A.appear - 9, A.appear - 3, A.appear - 1, A.appear);
    sy -= pre * 0.14; sx += pre * 0.1;
  }
  return { x, y, rot, sx, sy };
}
/** ท่าเปิดตัว · เอฟเฟกต์ (พิกัดพื้น ไม่ยืดตามตัว) · k.layer 'back' ก่อนตัว / 'front' ทับตัว · กดข้าม = จางออกตาม k.introSkip */
function sweetIntroFx(c, k) {
  const f = k.intro, t = k.t || 0, pal = k.pal, A = SWI;
  const edge = k.introEdge ?? -260;
  const fade = 1 - (k.introSkip || 0);
  if (fade <= 0.01) return;
  c.save();
  c.globalAlpha *= fade;
  const C0 = A.cupLand - 14;   // วงเวทเริ่มวาดตอนคัพเค้กกำลังลงจังหวะสุดท้าย
  // ── ริบบิ้นรุ้งพันตัวจากเท้าขึ้นหัว แล้วคลายออกเป็นวงกว้างจางหาย (แบ่งหน้า/หลังตามความลึก) ──
  const wrapPts = () => {
    const sh = KE.out(clamp01((f - (A.appear + 2)) / 30)), stl = KE.io(clamp01((f - (A.appear + 14)) / 40));
    if (sh - stl < 0.01) return null;
    const ex = 1 + 0.9 * KE.io(clamp01((f - (A.appear + 30)) / 34));
    const al = 0.95 * (1 - clamp01((f - (A.appear + 44)) / 20));
    if (al <= 0.01) return null;
    const pts = [];
    const N = 56;
    for (let i = 0; i <= N; i++) {
      const s = stl + (sh - stl) * (i / N);
      const th = s * TAU * 2.2 + 0.6;
      const rx = (150 + 50 * Math.sin(Math.PI * s)) * ex, ry = 30 * ex;
      const dep = Math.sin(th);
      pts.push({ x: 300 + Math.cos(th) * rx, y: 648 - s * 540 + dep * ry, dep, al: al * clamp01(i / 8), w: 5 + 22 * Math.sin(Math.PI * (i / N)) * (0.8 + 0.3 * dep) });
    }
    return pts;
  };
  if (k.layer === 'back') {
    // ฉากหรี่รอบตัว (โฟกัสที่คัพเค้ก/น้อง)
    const dim = 0.36 * kenv(f, A.cupLand - 10, A.cupLand + 10, A.open - 20, A.open + 50);
    if (dim > 0.01) {
      const g = c.createRadialGradient(300, 470, 150, 300, 470, 1100);
      g.addColorStop(0, 'rgba(40,10,48,0)');
      g.addColorStop(0.35, `rgba(40,10,48,${dim * 0.6})`);
      g.addColorStop(1, `rgba(40,10,48,${dim})`);
      c.fillStyle = g;
      c.fillRect(-1800, -1800, 4200, 4200);
    }
    // วงเวทวาดตัวเองบนพื้นใต้คัพเค้ก (วงนอก → วงใน → ดาวหกแฉก → หัวใจ/ดาวเรียงรอบ) สว่างวาบตอนป๊อป แล้วส่งต่อให้วงเวทประจำชุด
    const cv = kenv(f, C0, C0 + 6, A.open - 12, A.open + 40) * (1 + 0.8 * kenv(f, A.appear - 4, A.appear + 2, A.appear + 6, A.appear + 26));
    if (cv > 0.01) {
      const u1 = KE.io(clamp01((f - C0 - 2) / 30)), u2 = KE.io(clamp01((f - C0 - 10) / 26)), u3 = clamp01((f - C0 - 18) / 18);
      const head = -Math.PI / 2 + u1 * TAU;
      c.save();
      c.translate(300, 644);
      c.scale(1, 0.26);
      c.lineCap = 'round';
      const cA = Math.min(1, cv);
      for (const [r, u, col, w] of [[222, u1, '255,51,161', 7], [196, u2, '255,205,60', 4.5], [150, u2, '60,215,180', 5]]) {
        if (u <= 0) continue;
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = `rgba(${col},${0.35 * cA})`;
        c.lineWidth = w * 4;
        c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + u * TAU); c.stroke();
        c.globalCompositeOperation = 'source-over';
        c.strokeStyle = `rgba(${col},${0.9 * cA})`;
        c.lineWidth = w;
        c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + u * TAU); c.stroke();
        c.strokeStyle = `rgba(255,255,255,${0.8 * cA})`;
        c.lineWidth = w * 0.35;
        c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + u * TAU); c.stroke();
      }
      if (u3 > 0) {
        // ดาวหกแฉก: สามเหลี่ยมสองรูป ลากเส้นทีละด้าน
        c.strokeStyle = `rgba(255,81,176,${0.75 * cA})`;
        c.lineWidth = 3.5;
        for (const o of [0, Math.PI / 3]) {
          const V = [0, 1, 2, 3].map((i) => [Math.cos(o + (i * TAU) / 3 - Math.PI / 2) * 150, Math.sin(o + (i * TAU) / 3 - Math.PI / 2) * 150]);
          c.beginPath();
          c.moveTo(...V[0]);
          for (let e = 0; e < 3; e++) {
            const q = clamp01(u3 * 3 - e);
            if (q <= 0) break;
            c.lineTo(V[e][0] + (V[e + 1][0] - V[e][0]) * q, V[e][1] + (V[e + 1][1] - V[e][1]) * q);
          }
          c.stroke();
        }
      }
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 12;
        const on = clamp01((u1 * 12 - i) * 1.5);
        if (on <= 0) continue;
        const x = Math.cos(a) * 209, y = Math.sin(a) * 209, sc = KE.back(on);
        c.fillStyle = i % 2 ? `rgba(255,205,60,${cA})` : `rgba(255,51,161,${cA})`;
        if (i % 2) { c.beginPath(); c.arc(x, y, 7 * sc, 0, TAU); c.fill(); }
        else c.fill(swHeartP(x, y, 10 * sc));
      }
      c.restore();
      if (u1 > 0 && u1 < 1) swSparkle(c, 300 + Math.cos(head) * 222, 644 + Math.sin(head) * 222 * 0.26, 14, Math.min(1, cv));
    }
    // เสาแสงพุ่งขึ้นจากวงเวทตอนป๊อป
    const pil = kenv(f, A.appear - 10, A.appear, A.appear + 8, A.appear + 46);
    if (pil > 0.01) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const wd = 70 + 70 * pil;
      const g = c.createLinearGradient(300 - wd, 0, 300 + wd, 0);
      g.addColorStop(0, 'rgba(255,150,210,0)');
      g.addColorStop(0.5, `rgba(255,236,248,${0.6 * pil})`);
      g.addColorStop(1, 'rgba(255,150,210,0)');
      c.fillStyle = g;
      c.fillRect(300 - wd, -300, wd * 2, 950);
      c.restore();
    }
    // เม็ดสายรุ้ง + ประกาย หมุนวนเป็นเกลียวเข้าหาคัพเค้ก (เร่งเข้าหา) ระหว่างที่คัพเค้กสั่นรอป๊อป
    const S0 = A.appear - 34;
    if (f >= S0 && f < A.appear + 4) {
      c.save();
      c.lineCap = 'round';
      for (let i = 0; i < 48; i++) {
        const a0 = i * 2.399 + hash(i + 200) * 0.5, r0 = 380 + hash(i + 210) * 220, dl = S0 + hash(i + 220) * 12;
        const u = clamp01((f - dl) / (A.appear - dl));
        if (u <= 0 || u >= 1) continue;
        const at = (uu) => {
          const e = uu ** 1.6, r = r0 * (1 - e) + 6, an = a0 + e * 3.6;
          return [300 + Math.cos(an) * r, 560 + Math.sin(an) * r * 0.78];
        };
        const [x1, y1] = at(u), [x0, y0] = at(Math.max(0, u - 0.07));
        c.globalAlpha = fade * clamp01(u * 4) * (1 - clamp01((u - 0.9) / 0.1));
        c.strokeStyle = SW.sprinkle[i % 7];
        c.lineWidth = 3.8;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        if (i % 4 === 0) swSparkle(c, x1, y1, 6, 1, i % 8 ? '#FFFFFF' : '#FFF3B0');
      }
      c.restore();
    }
    // ฝาครีมกระเด็นหมุนขึ้นฟ้าโค้งไปทางขวา (หลังตัว — น้องเด้งออกมาข้างหน้า)
    // บินไกลออกไปทางขวาบน เล็กลงตามระยะ แล้วจางก่อนตกลงมาข้างตัว (ไม่ค้างเป็นก้อนใหญ่ข้างน้อง)
    if (f >= A.appear && f < A.appear + 28) {
      const d = f - A.appear;
      c.save();
      c.globalAlpha *= 1 - clamp01((d - 14) / 14);
      c.translate(300 + d * 12, 646 - SW_CUP_R * 1.01 - d * 24 + d * d * 0.55);
      c.rotate(d * 0.2);
      c.scale(1 - d * 0.014, 1 - d * 0.014);
      swCupcake(c, 0, 0, SW_CUP_R, pal, t, { cream: ['#FFFFFF', '#FFD6EC', '#FF77C1'], w: SOL, part: 'cream' });
      c.restore();
    }
    const wp = wrapPts();
    if (wp) swRibbonDraw(c, wp, false);
  } else {
    // ── แอบมอง: ประกายเล็ก ๆ ตอนเห็นคนดู + เส้นความเร็วตอนหดหัวกลับ ──
    if (f < A.gone + 8) {
      const hx = edge + 120, hy = 300;
      const nt = kenv(f, A.peek + 36, A.peek + 40, A.peek + 46, A.hide);
      if (nt > 0.01) {
        for (let i = 0; i < 3; i++) {
          const an = -1.3 + i * 0.55;
          const r = 70 + KE.out(clamp01((f - A.peek - 36) / 8)) * 30;
          swSparkle(c, hx + 40 + Math.cos(an) * r, hy - 60 + Math.sin(an) * r, 9 * nt, nt, i === 1 ? '#FFF3B0' : '#FFFFFF');
        }
      }
      const sp = kenv(f, A.hide + 1, A.hide + 3, A.hide + 7, A.gone + 6);
      if (sp > 0.01) {
        c.save();
        c.lineCap = 'round';
        c.strokeStyle = `rgba(255,255,255,${0.9 * sp})`;
        c.lineWidth = 5;
        for (const [dy, l] of [[-40, 90], [0, 130], [40, 80]]) {
          const x1 = edge + 150 - (1 - sp) * 40;
          c.beginPath(); c.moveTo(x1, hy + dy); c.lineTo(x1 - l * sp, hy + dy); c.stroke();
        }
        c.restore();
      }
    }
    // ── คัพเค้กยักษ์: เด้งเข้ามา → สั่นรอ → ป๊อป (ถ้วยแตกสองข้าง ครีมฟุ้ง เม็ดสายรุ้งกระจาย) ──
    if (f >= A.cupIn - 2 && f < A.appear) {
      const q = swCupAt(f, edge);
      // เงาใต้คัพเค้ก (เล็กลงตอนลอยสูง)
      const hgt = clamp01((646 - q.y) / 180);
      c.save();
      c.fillStyle = `rgba(80,30,60,${0.22 * (1 - hgt * 0.6)})`;
      c.beginPath(); c.ellipse(q.x, 650, 92 * (1 - hgt * 0.4), 16 * (1 - hgt * 0.4), 0, 0, TAU); c.fill();
      c.restore();
      // แสงชมพูรอบคัพเค้กตอนสั่น (เวทมนตร์กำลังสะสม)
      const glow = clamp01((f - A.cupLand) / (A.appear - A.cupLand));
      if (glow > 0) glowAt(c, q.x, 540, 150 + 60 * glow, '255,120,195', 0.5 * glow);
      c.save();
      c.translate(q.x, q.y);
      c.rotate(q.rot);
      c.scale(q.sx, q.sy);
      swBigCupcake(c, pal, t);
      c.restore();
      // ประกายฟุ้งตอนแตะพื้นแต่ละจังหวะ
      for (const fl of [A.land1, A.land2, A.cupLand]) {
        const d = f - fl;
        if (d < 0 || d > 16) continue;
        const u = d / 16, X = swCupAt(fl, edge).x;
        for (let i = 0; i < 6; i++) {
          const an = Math.PI + (i / 5) * Math.PI;
          swSparkle(c, X + Math.cos(an) * (70 + 60 * u), 640 + Math.sin(an) * (18 + 50 * u), 8 * (1 - u) + 1, 1 - u, i % 2 ? '#FFF3B0' : '#FFFFFF');
        }
      }
    }
    if (f >= A.appear && f < A.appear + 46) {
      const d = f - A.appear;
      // ถ้วยแตกออกสองซีก กระเด็นออกข้างแล้วตก
      for (const side of [-1, 1]) {
        c.save();
        c.globalAlpha *= 1 - clamp01((d - 10) / 18);
        c.translate(300 + side * d * 6, 646 - d * 4 + d * d * 0.32);
        c.rotate(side * d * 0.07);
        const half = new Path2D();
        half.rect(side < 0 ? -300 : 0, -400, 300, 500);
        c.clip(half);
        swCupcake(c, 0, -SW_CUP_R * 1.01, SW_CUP_R, pal, t, { liner: [SW.hot[1], '#FFFFFF'], w: SOL, part: 'cup' });
        c.restore();
      }
      // ครีมฟุ้งเป็นก้อนเมฆรอบตัว
      if (d < 30) {
        const u = d / 30;
        for (let i = 0; i < 9; i++) {
          const an = (i / 9) * TAU + 0.3;
          const r = 40 + KE.out(u) * 170;
          const px = 300 + Math.cos(an) * r, py = 560 + Math.sin(an) * r * 0.55;
          c.save();
          c.globalAlpha *= (1 - u) * 0.85;
          const pf = new Path2D();
          pf.arc(px, py, 26 + 14 * u + (i % 3) * 5, 0, TAU);
          c.fillStyle = swGrad(c, px, py - 30, px, py + 30, ['#FFFFFF', '#FFF0F8', '#FFD0E8']);
          c.fill(pf);
          c.restore();
        }
      }
      // เม็ดสายรุ้งกระจายขึ้นแล้วร่วง
      if (d < 44) {
        c.save();
        c.lineCap = 'round';
        for (let i = 0; i < 30; i++) {
          const an = -Math.PI / 2 + (hash(i + 500) - 0.5) * 2.6, sp = 5 + hash(i + 510) * 5;
          const px = 300 + Math.cos(an) * sp * d, py = 540 + Math.sin(an) * sp * d + 0.22 * d * d;
          const rot = an + d * 0.3 * (i % 2 ? 1 : -1);
          c.globalAlpha = 1 - d / 44;
          c.strokeStyle = SW.sprinkle[i % 7];
          c.lineWidth = 4;
          c.beginPath(); c.moveTo(px - Math.cos(rot) * 6, py - Math.sin(rot) * 6); c.lineTo(px + Math.cos(rot) * 6, py + Math.sin(rot) * 6); c.stroke();
        }
        c.restore();
      }
    }
    const wp = wrapPts();
    if (wp) swRibbonDraw(c, wp, true);
    // แสงวาบตอนป๊อป (บังจังหวะที่ตัวเด้งจากเล็ก)
    const fl = kenv(f, A.appear - 4, A.appear + 1, A.appear + 4, A.appear + 22);
    if (fl > 0.01) {
      // แสงวาบพอให้รู้ว่า "ป๊อป" แต่ไม่บังจังหวะถ้วยแตก-น้องเด้งออก
      glowAt(c, 300, 520, 240, '255,246,252', 0.55 * fl);
      glowAt(c, 300, 520, 170, '255,140,205', 0.35 * fl);
    }
    // ประกายพุ่งออกรอบตัวตอนปรากฏ
    if (f >= A.appear && f < A.appear + 44) {
      const u = (f - A.appear) / 44, r = 40 + KE.out(u) * 280;
      for (let i = 0; i < 12; i++) {
        const an = (i * TAU) / 12 + 0.2;
        swSparkle(c, 300 + Math.cos(an) * r, 470 + Math.sin(an) * r * 0.8, 12 * (1 - u) + 2, 1 - u, i % 3 ? '#FFFFFF' : '#FFF3B0');
      }
    }
    // ลืมตา: ประกายวิ้งที่หางตาสองข้าง
    const op = kenv(f, A.open - 2, A.open + 4, A.open + 10, A.open + 26);
    if (op > 0.01) {
      for (const [ex, ey] of [[170, 222], [430, 222]]) swSparkle(c, ex, ey, 16 * KE.back(clamp01((f - A.open + 2) / 10)), op);
    }
    // ขยิบตา: ดาววิ้งข้างตาที่ขยิบ
    const wk = kenv(f, A.pose + 6, A.pose + 12, A.pose + 22, A.pose + 44);
    if (wk > 0.01) swSparkle(c, 420, 238, 20 * KE.back(clamp01((f - A.pose - 6) / 10)), wk, '#FFF3B0');
    // หัวใจใหญ่เด้งข้างหัว ลอยขึ้นแล้วจาง + หัวใจจิ๋วกระจาย
    if (f >= A.pose + 10 && f < A.orbit + 30) {
      const d = f - (A.pose + 10);
      const sc = KE.back(clamp01(d / 12));
      const al = 1 - clamp01((f - (A.orbit - 6)) / 36);
      const hx = 482 + Math.sin(d * 0.08) * 6, hy = 172 - d * 0.55;   // ขวาบนนอกโบว์หู
      c.save();
      c.globalAlpha *= al;
      c.translate(hx, hy);
      c.rotate(0.18 + Math.sin(d * 0.1) * 0.08);
      glowAt(c, 0, 0, 60 * sc, '255,100,180', 0.45);
      const h = swHeartP(0, 0, 24 * sc);
      c.fillStyle = swGrad(c, 0, -24 * sc, 0, 24 * sc, SW.hot);
      c.fill(h);
      c.strokeStyle = pal.line;
      c.lineWidth = SOL;
      c.lineJoin = 'round';
      c.stroke(h);
      c.fillStyle = 'rgba(255,255,255,.9)';
      c.beginPath(); c.ellipse(-10 * sc, -9 * sc, 6 * sc, 3.6 * sc, -0.6, 0, TAU); c.fill();
      c.restore();
      if (d < 34) {
        for (let i = 0; i < 5; i++) {
          const an = -Math.PI / 2 + (i - 2) * 0.7, rr = 20 + KE.out(d / 34) * 60;
          const sx = hx + Math.cos(an) * rr, sy = hy + Math.sin(an) * rr;
          c.save();
          c.globalAlpha *= (1 - d / 34) * al;
          const hh = swHeartP(sx, sy, 7);
          c.fillStyle = i % 2 ? SW.pink[1] : SW.hot[1];
          c.fill(hh);
          c.restore();
        }
      }
    }
    // ประกายระยิบลอยขึ้นรอบตัวตอนค้างท่า
    if (f >= A.posed - 6) {
      for (let i = 0; i < 10; i++) {
        const p = clamp01((f - A.posed + 6 - i * 3) / 54);
        if (p <= 0 || p >= 1) continue;
        const s = i % 2 ? 1 : -1;
        swSparkle(c, 300 + s * (150 + hash(i + 400) * 120), 600 - p * 360, 9 * Math.sin(p * Math.PI), Math.sin(p * Math.PI), i % 3 ? '#FFFFFF' : '#FFF3B0');
      }
    }
  }
  c.restore();
}
/**
 * กล้องของท่าเปิดตัวเหมียวขนมหวาน (เล่าเรื่องแบบตัดต่อคลิป) — ผู้เรียกใส่ให้ทั้งฉาก · คืนรูปเดียวกับ snowCam
 *   แอบมอง: โคลสอัพที่ขอบฉาก (ขอบค้างที่ขอบจอพอดี) ค่อย ๆ ย่องเข้าไปใกล้ → สบตาคนดู = ซูมกระชากสั้น ๆ → น้องหดหัว กล้องสะดุ้งตาม
 *   → ถอยออกตามคัพเค้กเด้งดึ๋ง (กล้องตามครึ่งทาง เด้ง/สั่นทุกครั้งที่แตะพื้น) → ค่อย ๆ ดันเข้าคัพเค้กที่สั่นดุ๊กดิ๊ก (กล้องโยกตาม)
 *   → ป๊อป! ถอยพรวด + สั่น ตามตัวที่เด้งขึ้น → ไล่ขึ้นตามริบบิ้นรุ้งจากเท้าถึงหน้า → ลืมตา = โคลสอัพหน้า
 *   → เงยตามคทาบนฟ้า ไล่ลงมาถึงอุ้งเท้า (ตุบตอนรับ) → ควงคทา กล้องโยกตามวง ดันเข้าหัวคทา → ขนมระเบิด กระชากแล้วถอย + สั่น
 *   → โพส: ดันเข้าช็อตฮีโร่ เอียงกล้องตอนขยิบตา → คืนที่ก่อนเข้าท่าแอ็ค
 * v.edge = ขอบซ้ายของฉาก (พิกัดตัว เหมือน k.introEdge) — ผู้เรียกส่งมา ไม่มี = -260
 */
const SW_CAM_C = [300, 371];   // จุดกลางจอของมุมปกติ (หน่วยไฟล์ · เท้าอยู่ 80% ความสูงจอ แบบหน้าแรก/หน้าทดลอง)
function sweetCam(f, skip = 0, v = {}) {
  const A = SWI, edge = v.edge ?? -260;
  // ── จุดที่กล้องมอง (L) · c = ดึง L เข้ากลางจอแค่ไหน (0 = ซูมรอบจุดเดิมแบบ snowCam) ──
  // ช่วงแอบมอง: มองที่ขอบฉากเอง c = 0 → ขอบฉากค้างที่ขอบจอทุกระดับซูม (รอยตัดตัวน้องไม่โผล่กลางจอ)
  const peekK = 1 - KE.io(clamp01((f - A.gone + 2) / 22));
  const cup = swCupAt(Math.max(f, A.cupIn), edge);
  const cupY = cup.y - SW_CUP_R * cup.sy;   // กลางคัพเค้ก
  // ช่วงคัพเค้กเด้งมา: ตามครึ่งทาง (เห็นว่ามันกำลังเด้งมาจากขอบ) · ไม่เลยขอบไปดูที่ว่าง
  const followX = 300 + (Math.max(cup.x, edge + 160) - 300) * 0.65, followY = 520 + (cupY - 524) * 0.35;
  const late = f >= A.cupLand;
  const sx = late ? ktrack(f, [[A.cupLand, 300], [A.open + 5, 300], [A.fall + 2, 300], [A.fall + 14, 130], [A.catch - 4, 190], [A.catch + 6, 220],
    [A.raise, 228], [A.burst - 1, 212], [A.burst + 16, 300], [A.posed, 306], [A.dur - 26, 300]]) : followX;
  const sy = late ? ktrack(f, [[A.cupLand, followY], [A.appear - 2, 515], [A.appear + 8, 400, KE.out], [A.appear + 24, 470], [A.open - 8, 320], [A.open + 5, 285],
    [A.fall + 2, 285], [A.fall + 14, 110], [A.catch - 4, 330], [A.catch + 6, 360], [A.raise, 300], [A.burst - 1, 232], [A.burst + 16, 340], [A.posed, 330], [A.dur - 26, 371]]) : followY;
  const Lx = edge * peekK + sx * (1 - peekK), Ly = 350 * peekK + sy * (1 - peekK);
  const c = (1 - peekK) * ktrack(f, [[A.gone, 0.55], [A.orbit, 0.55], [A.dur - 26, 0]]);
  // ── ซูม ──
  let z = ktrack(f, [[0, 1.5], [A.peek + 10, 1.62], [A.peek + 33, 1.75], [A.peek + 38, 1.95, KE.out], [A.hide + 6, 1.95], [A.gone + 2, 1.9],
    [A.cupIn + 14, 1.15], [A.cupLand, 1.15], [A.appear - 2, 1.55, KE.in], [A.appear + 8, 1.04, KE.out], [A.appear + 24, 1.08], [A.open - 8, 1.32],
    [A.open + 5, 1.9, KE.out], [A.fall + 2, 1.9], [A.fall + 14, 1.28], [A.catch, 1.3], [A.raise, 1.2], [A.burst - 1, 1.34], [A.burst + 3, 1.42, KE.out],
    [A.burst + 16, 1.05, KE.out], [A.posed, 1.2], [A.orbit, 1.2], [A.dur - 26, 1], [A.dur, 1]]);
  // ตุบ! ทุกครั้งที่คัพเค้กแตะพื้น / ตอนรับคทา: ซูมเด้งเข้านิดแล้วคืน
  const bump = (at, amt) => (f >= at && f < at + 12 ? Math.sin(((f - at) / 12) * Math.PI) * amt : 0);
  z += bump(A.land1, 0.05) + bump(A.land2, 0.04) + bump(A.cupLand, 0.035) + bump(A.catch, 0.04);
  // ── เอียงกล้อง ──
  const tu = clamp01((f - A.raise) / (A.burst - A.raise)), tph = TAU * 2 * KE.io(tu), tenv = Math.sin(Math.PI * tu);
  let rot = -0.03 * kenv(f, A.peek + 10, A.peek + 18, A.peek + 30, A.peek + 36)   // เอียงตามหัวที่ชะเง้อมอง (อยากรู้อยากเห็น)
    + (f >= A.cupIn && f < A.appear ? cup.rot * (f < A.cupLand ? 0.12 : 0.22) : 0)   // โยกตามคัพเค้กเด้ง/สั่น
    + Math.sin(tph) * 0.022 * tenv                                                  // โยกตามวงควงคทา
    + ktrack(f, [[A.pose, 0], [A.pose + 10, 0.035, KE.out], [A.orbit, 0.02], [A.dur - 26, 0]]);   // เอียงช็อตฮีโร่ตอนขยิบตา
  // ── กล้องสั่น: หดหัว (แนวตั้งอย่างเดียว ขอบฉากไม่ขยับ) · แตะพื้น · ป๊อป · รับคทา · ขนมระเบิด ──
  const dec = (at, amt, len) => (f >= at && f < at + len ? amt * Math.exp(-(f - at) * (4 / len)) : 0);
  const shV = dec(A.hide, 3, 14);
  const sh = dec(A.land1, 4, 14) + dec(A.land2, 3, 12) + dec(A.cupLand, 3, 12) + dec(A.appear, 8, 30) + dec(A.catch, 2, 10) + dec(A.burst, 7, 28);
  const k = 1 - clamp01(skip);
  const dx = (SW_CAM_C[0] - Lx) * c + Math.sin(f * 1.9) * sh;
  const dy = (SW_CAM_C[1] - Ly) * c + Math.cos(f * 2.7) * (sh + shV);
  rot += Math.sin(f * 1.3) * sh * 0.002;
  return { z: 1 + (z - 1) * k, fx: Lx + (SW_CAM_C[0] - Lx) * c, fy: Ly + (SW_CAM_C[1] - Ly) * c, dx: dx * k, dy: dy * k, rot: rot * k };
}
/**
 * ยืดเวลาท่าเปิดตัวเป็นช่วง ๆ — เฟรมจริง ↔ เฟรมสตอรี (SWI)
 * keys = [[เฟรมสตอรี, อัตรา]] · อัตรา = กี่เฟรมจริงต่อหนึ่งเฟรมสตอรี (1 = เร็วเท่าเดิม) ไล่นุ่มระหว่างคีย์ (ไม่มีจุดเปลี่ยนความเร็วกระตุก)
 * คืน { warp(เฟรมจริง) → เฟรมสตอรี, toRaw(เฟรมสตอรี) → เฟรมจริง, dur = ความยาวจริง (เฟรม) }
 * (ทำตอนโหลดไฟล์ — ห้ามใช้ clamp01/ease ที่ประกาศทีหลัง)
 */
function swMakeTime(storyDur, keys) {
  const STEP = 0.5, n = Math.ceil(storyDur / STEP);
  const raw = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) {
    const s0 = (i - 1) * STEP, s1 = Math.min(storyDur, i * STEP);
    raw[i] = raw[i - 1] + ktrack((s0 + s1) / 2, keys) * (s1 - s0);
  }
  const toRaw = (sf) => {
    const x = Math.max(0, Math.min(1, sf / storyDur)) * n, i = Math.min(n - 1, Math.floor(x));
    return raw[i] + (raw[i + 1] - raw[i]) * (x - i);
  };
  const warp = (rf) => {
    if (rf <= 0) return rf;
    if (rf >= raw[n]) return storyDur + (rf - raw[n]);   // เลยท้ายท่า: เดินตามจริง
    let lo = 0, hi = n;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (raw[mid] <= rf) lo = mid; else hi = mid; }
    return (lo + (rf - raw[lo]) / (raw[hi] - raw[lo])) * STEP;
  };
  return { warp, toRaw, dur: raw[n] };
}
/**
 * ความเร็วแต่ละช่วงของท่าเปิดตัว sweet (ผู้ใช้ขอ 14 ต.ค.: มีกล้องเพิ่มแล้วรู้สึกเร็วไป อยากเห็นรายละเอียด · 7–10 วิ)
 * ช่วงดูรายละเอียดยืด 1.2–1.65 เท่า · จังหวะที่ต้องเร็วถึงจะสนุก (หดหัวตกใจ ป๊อป+ลงพื้น รับคทา ขนมระเบิด+กระโดด) คงความเร็วเดิม
 */
const SW_RATE = [
  [0, 1.25], [16, 1.45], [48, 1.45], [52, 1], [66, 1],             // แอบมอง: มองรอบห้องนานขึ้น · หดหัวตกใจเร็วเท่าเดิม
  [70, 1.2], [122, 1.2],                                            // คัพเค้กเด้งมา
  [128, 1.65], [144, 1.65], [149, 1],                               // คัพเค้กสั่นลุ้นนานขึ้น · ป๊อปเร็วเท่าเดิม
  [176, 1], [184, 1.5], [196, 1.5],                                 // เด้งออก+แตะพื้นเร็วเท่าเดิม → หลับตายิ้มระหว่างริบบิ้นพันนานขึ้น
  [200, 1.35], [210, 1.35], [216, 1.55], [238, 1.55], [243, 1.05], [252, 1.05],   // ลืมตา · คทาลอยลงช้า ๆ · รับคทา
  [258, 1.4], [298, 1.4], [301, 1], [326, 1],                       // ควงคทาช้าลง · ขนมระเบิด+กระโดดเร็วเท่าเดิม
  [332, 1.35], [346, 1.35], [352, 1.6], [398, 1.6],                 // โพส · ค้างท่า
];
const SW_TIME = swMakeTime(SWI.dur, SW_RATE);
/** เสียงตามจังหวะ (เฟรมสตอรี · ชื่อใน sfx ของ audio.js) — แปลงเป็นเฟรมจริงใน SWEET_INTRO */
const SW_VOICES = [[SWI.peek + 12, 'sweetPeek'], [SWI.hide, 'sweetHide'], [SWI.cupIn, 'sweetHop'],
  [SWI.land1, 'sweetBoing'], [SWI.land2, 'sweetBoing'], [SWI.cupLand, 'sweetBoing'], [SWI.cupLand + 8, 'sweetRattle'],
  [SWI.appear - 1, 'sweetPop'], [SWI.appear + 1, 'sweetAppear'],
  [SWI.open, 'sweetMusicBox'], [SWI.catch, 'sweetCatch'],
  [SWI.raise, 'sweetTwirl'], [SWI.burst, 'sweetBurst'], [SWI.pose + 8, 'sweetMew'], [SWI.pose + 18, 'sweetBell'], [SWI.posed + 12, 'sweetShimmer']];
// เสียงรวมพลังยาวตายตัว ~0.6 วิ ต้องจบตรงป๊อปพอดี — นับถอยจากป๊อปเป็นเฟรมจริง (ไม่ยืดตามช่วงคัพเค้กสั่น)
const SW_GATHER_LEAD = 35;
/**
 * ท่าเปิดตัว sweet — ทุกอย่างที่ผู้เรียกส่งมาเป็น "เฟรมจริง" (dur · appear · voices · shape · cam)
 * ตัววาดแปลงเป็นเฟรมสตอรีด้วย warp ก่อนส่งให้ช่องของชุด (k.intro) และ stage
 */
const SWEET_INTRO = {
  dur: Math.round(SW_TIME.dur),
  appear: SW_TIME.toRaw(SWI.appear),
  warp: SW_TIME.warp,
  stage: sweetIntroStage,   // รับเฟรมสตอรี
  peekHide: SW_PEEK_HIDE,
  voices: [...SW_VOICES.map(([f, n]) => [Math.round(SW_TIME.toRaw(f)), n]),
    [Math.round(SW_TIME.toRaw(SWI.appear)) - SW_GATHER_LEAD, 'sweetGather']].sort((a, b) => a[0] - b[0]),
  shape: (f, t) => sweetIntroShape(SW_TIME.warp(f), t),
  fx: sweetIntroFx,         // รับ k.intro เป็นเฟรมสตอรีแล้ว
  cam: (f, skip, v) => sweetCam(SW_TIME.warp(f), skip, v),   // กล้องเล่าเรื่อง (ผู้เรียกใส่ให้ทั้งฉาก · ส่ง { edge } มาด้วยสำหรับช่วงแอบมอง)
};

// ══ องค์หญิงหิมะ (Snow Princess Meow · ระดับ S · LEGENDARY) — ออกแบบใหม่รอบสองตามบอร์ดผู้ใช้ (14 ต.ค.) ══
//   ผู้ใช้ตีกลับรอบแรก: "ดีไซน์ค่อนข้างเหมือนสกินขนมหวาน" → รอบนี้เปลี่ยนโครงทั้งหมด (ห้ามย้อนกลับไปทรงเดิม):
//   · หัว: เทียร่าคาดหน้าผาก (ไม่ใช่หมวก/มงกุฎบนหัว) เพชรใหญ่ทรงว่าวกลาง ซุ้มฉลุทอง โซ่หยดคริสตัลห้อยปลาย
//   · ตัว: ผ้าขนคลุมไหล่ + ผ้าคลุมยาว (นอกขาว ในน้ำเงิน-ลาเวนเดอร์ ปักคริสตัลหกเหลี่ยม ชายขนเฟอร์)
//   · ไม่มีแขนเสื้อพอง — กำไลทองเพชรที่อุ้งเท้าทั้งสี่ · โบว์น้ำเงินราชวงศ์ (ห่วงเหลี่ยมมน ขลิบขาว) + ดาวคริสตัลแปดแฉกกลางอก
//   · กระโปรงสั้นทรงเอ ชายกลีบแหลม/น้ำแข็งย้อย (ไม่ใช่กระดิ่งลูกไม้) หยดคริสตัลปลายกลีบ โซ่ทองห้อยเพชร
//   · คทาเงินหัวดาวคริสตัลแปดแฉก วงแหวนเวทบาง ๆ หลังหัว หยดคริสตัลห้อย
//   · เอฟเฟกต์: แสงเหนือ · วงแหวนเวทตั้งหลังตัว · พื้นน้ำแข็งเงา + กอคริสตัล · รอยเท้าน้ำแข็งบาน · คริสตัลลอยนิ่ง · หิมะ
//     (ไม่มีวงโคจรของลอย ริบบิ้นวน ลำแสงหมุน วงเวทบนพื้น — ของชุด sweet)
//   จานสีตามบอร์ด: Snow White #F8FCFF · Ice Blue #A9DEFF · Crystal Cyan #57D8F5 · Royal Blue #4479D9 · Lavender #C4B5FD · Frost Silver #DCE7F4 · Royal Gold #F4D58D
const SN = {
  snow: ['#FFFFFF', '#F8FCFF', '#DCE7F4'],
  ice: ['#E9F7FF', '#A9DEFF', '#6FC3F2'],
  cyan: ['#E8FBFF', '#57D8F5', '#1FA9D6'],
  royal: ['#8FB4F2', '#4479D9', '#2A55B0'],
  lav: ['#F1EDFF', '#C4B5FD', '#9C88F0'],
  silver: ['#FFFFFF', '#DCE7F4', '#A7B8D0'],
  gold: ['#FFF6DA', '#F4D58D', '#C99A45'],
  crystal: ['#FFFFFF', '#BFF1FF', '#57D8F5'],   // คริสตัลใส (ฟ้าไซแอน)
  crystalB: ['#E6F0FF', '#7FA8F0', '#4479D9'],  // คริสตัลน้ำเงิน
};
/** เส้นขอบของชุดบางกว่าเส้นตัวน้อง (กฎชุดระดับ S ข้อ 7 — เท่ากับชุด sweet ที่ผู้ใช้อนุมัติ) */
const SNK = 0.65;
const SNO = OL * SNK;

// ── ตัวช่วยพื้นฐาน (ภาพสำเร็จรูป ประกาย เกล็ดหิมะ อัญมณี แท่งคริสตัล ขนเฟอร์ แสงเหนือ หิมะ) ──
/** ภาพประกายน้ำแข็งสำเร็จรูป (แสงฟ้าฟุ้ง + ดาวแปดแฉก แฉกยาวสี่ทิศ แฉกสั้นเฉียง) ทำครั้งเดียวต่อสี */
const SN_SPARK = new Map();
function snSparkSprite(col) {
  let cv = SN_SPARK.get(col);
  if (cv) return cv;
  const S = 160, h = 80, r = 30;
  cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(S, S) : Object.assign(document.createElement('canvas'), { width: S, height: S });
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(h, h, 0, h, h, r * 2.4);
  gr.addColorStop(0, 'rgba(220,240,255,.7)');
  gr.addColorStop(1, 'rgba(220,240,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.48 : r, a1 = a + Math.PI / 8;
    if (i) g.lineTo(h + Math.cos(a) * rr, h + Math.sin(a) * rr);
    else g.moveTo(h + Math.cos(a) * rr, h + Math.sin(a) * rr);
    g.lineTo(h + Math.cos(a1) * r * 0.11, h + Math.sin(a1) * r * 0.11);
  }
  g.closePath();
  g.fill();
  SN_SPARK.set(col, cv);
  return cv;
}
/** ประกายน้ำแข็ง (รัศมี r · a = ความทึบ) */
function snSparkle(c, x, y, r, a = 1, col = '#FFFFFF') {
  if (a <= 0.02 || r <= 0.3) return;
  const S = (160 * r) / 30;
  const a0 = c.globalAlpha;
  c.globalAlpha = a0 * Math.min(1, a);
  c.drawImage(snSparkSprite(col), x - S / 2, y - S / 2, S, S);
  c.globalAlpha = a0;
}
/** ภาพเกล็ดหิมะสำเร็จรูป (หกแฉกมีกิ่ง ขอบฟ้าจาง แสงฟุ้ง) — หิมะโปรยหลายสิบเกล็ดต่อเฟรม */
let SN_FLAKE = null;
function snFlakeSprite() {
  if (SN_FLAKE) return SN_FLAKE;
  const S = 96, h = 48, r = 34;
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(S, S) : Object.assign(document.createElement('canvas'), { width: S, height: S });
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(h, h, 0, h, h, 46);
  gr.addColorStop(0, 'rgba(205,232,255,.6)');
  gr.addColorStop(1, 'rgba(205,232,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  g.translate(h, h);
  g.lineCap = 'round';
  for (const [w, col] of [[8.5, 'rgba(120,180,245,.55)'], [4.4, '#FFFFFF']]) {
    g.strokeStyle = col;
    g.lineWidth = w;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6, ux = Math.sin(a), uy = -Math.cos(a);
      const P = (u, v) => [ux * u * r - uy * v * r, uy * u * r + ux * v * r];
      g.moveTo(0, 0); g.lineTo(...P(1, 0));
      for (const [u, l] of [[0.5, 0.26], [0.25, 0.15]]) {
        for (const s of [-1, 1]) { g.moveTo(...P(u, 0)); g.lineTo(...P(u + l * 0.85, s * l)); }
      }
    }
    g.stroke();
  }
  SN_FLAKE = cv;
  return cv;
}
/** เกล็ดหิมะโปรย (รัศมี r · หมุน rot · a = ความทึบ) */
function snFlake(c, x, y, r, rot = 0, a = 1) {
  if (a <= 0.02 || r <= 0.4) return;
  const S = (96 * r) / 34;
  const a0 = c.globalAlpha;
  c.globalAlpha = a0 * Math.min(1, a);
  if (rot) {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.drawImage(snFlakeSprite(), -S / 2, -S / 2, S, S);
    c.restore();
  } else c.drawImage(snFlakeSprite(), x - S / 2, y - S / 2, S, S);
  c.globalAlpha = a0;
}
/** รูปเกล็ดหิมะคริสตัลแบบตัน: หกแฉก แต่ละแฉกมีกิ่งสองคู่ (กิ่งในสั้น กิ่งนอกยาว) + แกนหกเหลี่ยม */
function snFlakePath(x, y, r, rot = 0) {
  const q = new Path2D();
  const side = [[0, 0.11], [0.4, 0.085], [0.56, 0.29], [0.61, 0.265], [0.51, 0.075], [0.66, 0.066], [0.84, 0.25], [0.89, 0.22], [0.77, 0.05], [1, 0]];
  for (let i = 0; i < 6; i++) {
    const a = rot - Math.PI / 2 + (i * TAU) / 6;
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const P = (u, v) => [x + (ux * u + nx * v) * r, y + (uy * u + ny * v) * r];
    q.moveTo(...P(0, -side[0][1]));
    for (const [u, v] of side.slice(1)) q.lineTo(...P(u, -v));
    for (const [u, v] of side.slice(0, -1).reverse()) q.lineTo(...P(u, v));
    q.closePath();
  }
  for (let i = 0; i <= 6; i++) {
    const a = rot - Math.PI / 2 + (i * TAU) / 6 + Math.PI / 6;
    const p = [x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25];
    if (i) q.lineTo(...p); else q.moveTo(...p);
  }
  q.closePath();
  return q;
}
/**
 * เกล็ดหิมะคริสตัล (เครื่องประดับ: เข็มกลัด หัวคทา มงกุฎ): เนื้อคริสตัลไล่สี เหลี่ยมมืด-สว่างครึ่งแฉก สันกลางขาว
 * เม็ดคริสตัลกลาง (o.gem = false ไม่ใส่) · o.rot = หมุน · o.cols = สี [อ่อน กลาง เข้ม] · o.line = false ไม่มีเส้นขอบ (ตัวโปร่ง)
 */
function snFlakeShape(c, x, y, r, pal, o = {}) {
  const rot = o.rot || 0, cols = o.cols || SN.crystal;
  const W = o.w ?? Math.max(1, r * 0.075) * SNK;
  const q = snFlakePath(x, y, r, rot);
  const g = c.createRadialGradient(x - r * 0.2, y - r * 0.25, r * 0.05, x, y, r * 1.05);
  g.addColorStop(0, cols[0]);
  g.addColorStop(0.5, cols[1]);
  g.addColorStop(1, cols[2]);
  if (o.line === false) { c.fillStyle = g; c.fill(q); }
  else swBlob(c, q, g, o.lineCol ? { line: o.lineCol } : pal, W);
  c.save();
  c.clip(q);
  c.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = rot - Math.PI / 2 + (i * TAU) / 6;
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    c.fillStyle = 'rgba(40,110,215,.2)';
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + (ux + nx * 0.45) * r, y + (uy + ny * 0.45) * r);
    c.lineTo(x + ux * r * 1.05, y + uy * r * 1.05);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,.88)';
    c.lineWidth = Math.max(0.8, r * 0.045);
    c.beginPath(); c.moveTo(x + ux * r * 0.22, y + uy * r * 0.22); c.lineTo(x + ux * r * 0.92, y + uy * r * 0.92); c.stroke();
  }
  c.restore();
  if (o.gem !== false) snGem(c, x, y, r * (o.gemR ?? 0.22), pal, o.t || 0, { cols: o.gemCols || SN.crystal, bezel: o.bezel ?? true });
}
/**
 * เม็ดคริสตัลเจียระไนแปดเหลี่ยม (หน้าโต๊ะกลาง เหลี่ยมสว่าง-มืดสลับ) · o.bezel = กรอบเงิน/ทอง (o.metal) มีขาเพชรสี่ทิศ
 * ประกายวิ้งเป็นจังหวะ
 */
function snGem(c, x, y, r, pal, t = 0, o = {}) {
  const cols = o.cols || SN.crystal, n = 8, off = Math.PI / n;
  if (o.bezel !== false) {
    const fr = new Path2D();
    fr.arc(x, y, r * 1.3, 0, TAU);
    swBlob(c, fr, swGrad(c, x - r, y - r, x + r, y + r, o.metal || SN.silver), pal, Math.max(1, r * 0.12) * SNK);
    c.fillStyle = '#FFFFFF';
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      c.beginPath(); c.arc(x + Math.cos(a) * r * 1.13, y + Math.sin(a) * r * 1.13, r * 0.14, 0, TAU); c.fill();
    }
  }
  const g = new Path2D();
  for (let i = 0; i < n; i++) {
    const a = (i * TAU) / n + off, p = [x + Math.cos(a) * r, y + Math.sin(a) * r];
    if (i) g.lineTo(...p); else g.moveTo(...p);
  }
  g.closePath();
  const gr = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r * 1.1);
  gr.addColorStop(0, '#FFFFFF');
  gr.addColorStop(0.38, cols[1]);
  gr.addColorStop(1, cols[2]);
  c.fillStyle = gr;
  c.fill(g);
  c.save();
  c.clip(g);
  for (let i = 0; i < n; i++) {
    const a0 = (i * TAU) / n + off, a1 = ((i + 1) * TAU) / n + off;
    c.fillStyle = i % 2 ? 'rgba(255,255,255,.3)' : 'rgba(30,90,205,.15)';
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a0) * r * 1.1, y + Math.sin(a0) * r * 1.1);
    c.lineTo(x + Math.cos(a1) * r * 1.1, y + Math.sin(a1) * r * 1.1);
    c.closePath();
    c.fill();
  }
  c.strokeStyle = 'rgba(255,255,255,.75)';
  c.lineWidth = Math.max(0.6, r * 0.07);
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i * TAU) / n + off, p = [x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5];
    if (i) c.lineTo(...p); else c.moveTo(...p);
  }
  c.stroke();
  c.restore();
  c.strokeStyle = pal.line;
  c.lineWidth = Math.max(1, r * 0.12) * SNK;
  c.lineJoin = 'round';
  c.stroke(g);
  c.fillStyle = 'rgba(255,255,255,.95)';
  c.beginPath(); c.ellipse(x - r * 0.38, y - r * 0.4, r * 0.22, r * 0.12, -0.7, 0, TAU); c.fill();
  const gl = Math.sin(t * 0.06 + x * 0.05 + y * 0.04);
  if (gl > 0.3) snSparkle(c, x + r * 0.5, y - r * 0.55, (r * 0.9 * (gl - 0.3)) / 0.7, 1);
}
/** คริสตัลหยดน้ำ (ปลายแหลมชี้ลง) เจียระไนสามเหลี่ยม — จี้ ปลายด้ามคทา */
function snDrop(c, x, y, r, pal, cols = SN.crystal) {
  const q = new Path2D();
  q.moveTo(x, y + r * 1.5);
  q.bezierCurveTo(x - r * 0.35, y + r * 0.9, x - r, y + r * 0.25, x - r, y - r * 0.15);
  q.arc(x, y - r * 0.15, r, Math.PI, 0);
  q.bezierCurveTo(x + r, y + r * 0.25, x + r * 0.35, y + r * 0.9, x, y + r * 1.5);
  q.closePath();
  c.fillStyle = swGrad(c, x - r, y - r, x + r, y + r * 1.5, ['#FFFFFF', cols[1], cols[2]]);
  c.fill(q);
  c.save();
  c.clip(q);
  c.fillStyle = 'rgba(30,90,205,.16)';
  c.beginPath(); c.moveTo(x, y - r * 1.2); c.lineTo(x + r * 1.2, y); c.lineTo(x, y + r * 1.6); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.75)';
  c.lineWidth = Math.max(0.6, r * 0.1);
  c.beginPath(); c.moveTo(x, y - r * 1.1); c.lineTo(x, y + r * 1.4); c.moveTo(x - r, y - r * 0.1); c.lineTo(x + r, y - r * 0.1); c.stroke();
  c.restore();
  outline(c, q, pal, Math.max(1, r * 0.13) * SNK);
  c.fillStyle = 'rgba(255,255,255,.95)';
  c.beginPath(); c.ellipse(x - r * 0.4, y - r * 0.45, r * 0.24, r * 0.13, -0.7, 0, TAU); c.fill();
}
/** แท่งคริสตัลน้ำแข็ง (ปริซึมปลายแหลม): ฐานที่ (x,y) ยาว len กว้าง wid เอียง ang (0 = ชี้ขึ้น บวก = เอนขวา) */
function snShardPath(x, y, len, wid, ang = 0) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (u, v) => [x + u * ca - v * sa, y + u * sa + v * ca];
  const q = new Path2D();
  q.moveTo(...P(-wid * 0.72, 0));
  q.lineTo(...P(-wid, -len * 0.6));
  q.lineTo(...P(0, -len));
  q.lineTo(...P(wid, -len * 0.64));
  q.lineTo(...P(wid * 0.72, 0));
  q.closePath();
  return { q, P };
}
/**
 * แท่งคริสตัล: เนื้อไล่สีฐาน→ปลาย หน้าซ้ายสว่าง หน้าขวามืด สันกลางขาว ขอบน้ำตาลบางแบบชุด
 * o.cols = สี · o.alpha = ความใสของเนื้อ · o.w = เส้น (0 = ไม่มี)
 */
function snShard(c, x, y, len, wid, ang, pal, o = {}) {
  const cols = o.cols || SN.crystal;
  const { q, P } = snShardPath(x, y, len, wid, ang);
  const [tx, ty] = P(0, -len);
  c.save();
  if (o.alpha != null) c.globalAlpha *= o.alpha;
  c.fillStyle = swGrad(c, x, y, tx, ty, [cols[2], cols[1], cols[0]]);
  c.fill(q);
  c.clip(q);
  c.fillStyle = 'rgba(255,255,255,.38)';
  c.beginPath(); c.moveTo(...P(0, 0)); c.lineTo(...P(-wid * 1.1, 0)); c.lineTo(...P(-wid * 1.1, -len * 0.6)); c.lineTo(...P(0, -len)); c.closePath(); c.fill();
  c.fillStyle = 'rgba(40,105,215,.16)';
  c.beginPath(); c.moveTo(...P(wid * 0.35, 0)); c.lineTo(...P(wid * 1.1, 0)); c.lineTo(...P(wid * 1.1, -len * 0.64)); c.lineTo(...P(0, -len)); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.9)';
  c.lineWidth = Math.max(0.7, wid * 0.16);
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(...P(0, -len * 0.08)); c.lineTo(...P(0, -len * 0.9)); c.stroke();
  c.restore();
  const W = o.w ?? Math.max(1, wid * 0.16) * SNK;
  if (W > 0) outline(c, q, pal, W);
}
/** ก้อนขนเฟอร์ขอบหยักฟู (วงกลมที่รัศมีส่ายหกลูก) — [x, y, r, seed] */
function snFurPath(lumps) {
  const q = new Path2D();
  for (const [x, y, r, s = 0] of lumps) {
    const N = 30;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TAU, rr = r * (1 + 0.085 * Math.sin(a * 6 + s * 2.3));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i) q.lineTo(px, py); else q.moveTo(px, py);
    }
    q.closePath();
  }
  return q;
}
/** ขนเฟอร์ขาวหิมะ: ก้อนรวมเส้นนอกเส้นเดียว · เงาขนฟ้าโค้งล่าง ปอยขนจิ๋ว ไฮไลต์ขาวบนซ้าย */
function snFur(c, lumps, pal, o = {}) {
  if (!lumps.length) return;
  const q = snFurPath(lumps);
  let y0 = Infinity, y1 = -Infinity;
  for (const [, y, r] of lumps) { y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); }
  swBlob(c, q, swGrad(c, 0, y0, 0, y1, o.cols || SN.snow), pal, o.w ?? SNO * 0.85);
  c.save();
  c.clip(q);
  c.lineCap = 'round';
  for (const [x, y, r, s = 0] of lumps) {
    c.strokeStyle = 'rgba(105,155,225,.26)';
    c.lineWidth = Math.max(1, r * 0.15);
    c.beginPath(); c.arc(x + r * 0.12, y + r * 0.16, r * 0.72, 0.25, 1.75); c.stroke();
    c.strokeStyle = 'rgba(130,175,235,.4)';
    c.lineWidth = Math.max(0.7, r * 0.07);
    c.beginPath();
    for (let j = 0; j < 4; j++) {
      const a = 0.15 + j * 0.42 + (hash(j * 7 + s * 13 + 3) - 0.5) * 0.3;
      const ca = Math.cos(a), sa = Math.sin(a);
      c.moveTo(x + ca * r * 0.5, y + sa * r * 0.5);
      c.quadraticCurveTo(x + ca * r * 0.7 - sa * r * 0.08, y + sa * r * 0.7 + ca * r * 0.08, x + ca * r * 0.86, y + sa * r * 0.86);
    }
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,.95)';
    c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.36, r * 0.3, r * 0.16, -0.5, 0, TAU); c.fill();
  }
  c.restore();
}
/** แถบแสงเหนือสำเร็จรูป (ตั้ง 1 แถบ ไล่ใสล่าง → สว่าง → จางขึ้นฟ้า) ทำครั้งเดียวต่อสี */
const SN_AUR = new Map();
function snAuroraSprite(col) {
  let cv = SN_AUR.get(col);
  if (cv) return cv;
  cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(4, 160) : Object.assign(document.createElement('canvas'), { width: 4, height: 160 });
  const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 160, 0, 0);
  gr.addColorStop(0, `rgba(${col},0)`);
  gr.addColorStop(0.12, `rgba(${col},.85)`);
  gr.addColorStop(0.4, `rgba(${col},.4)`);
  gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 160);
  SN_AUR.set(col, cv);
  return cv;
}
/**
 * แสงเหนือ: ม่านแสงสามสาย (มิ้นต์ ฟ้า ลาเวนเดอร์) โค้งพลิ้วเหนือหัว — แปะแถบตั้งไล่สีสำเร็จรูปเรียงกัน
 * ชายล่างจางนุ่ม ปลายสองข้างเรียวหาย ริ้วแสงสว่าง-มืดเลื่อนช้า ๆ (ไม่สร้างไล่สีใหม่ทุกเฟรม)
 */
function snAurora(c, t, vis) {
  if (vis <= 0.01) return;
  c.save();
  c.globalCompositeOperation = 'screen';
  const a0 = c.globalAlpha;
  for (const [y0, amp, h, col, sp, ph, al] of [[262, 30, 170, '60,235,200', 0.012, 0, 0.55], [222, 26, 150, '70,170,255', 0.016, 2.1, 0.55], [186, 22, 120, '175,120,255', 0.02, 4.2, 0.5]]) {
    const X0 = -260, X1 = 860, n = 64, w = (X1 - X0) / n;
    const sprite = snAuroraSprite(col);
    for (let i = 0; i < n; i++) {
      const x = X0 + w * i, u = i / (n - 1);
      const y = y0 + Math.sin(x * 0.011 + t * sp + ph) * amp + Math.sin(x * 0.027 - t * sp * 1.6 + ph) * amp * 0.35;
      const taper = Math.sin(Math.PI * u) ** 0.9;
      const ray = 0.65 + 0.35 * Math.sin(x * 0.09 + t * sp * 3 + ph) * Math.sin(x * 0.031 - t * 0.01);
      c.globalAlpha = a0 * vis * al * taper * ray;
      const hh = h * (0.55 + 0.45 * taper);
      c.drawImage(sprite, x, y - hh, w + 1.5, hh * 1.14);
    }
  }
  c.restore();
}
/** หิมะโปรย: เกล็ดหิมะร่วงช้า ๆ ส่ายซ้ายขวา · front = เฉพาะสองข้างตัว (ไม่ผ่านหน้า/ชุด) */
function snSnow(c, t, vis, front, lite = false) {
  if (vis <= 0.01) return;
  const N = front ? 8 : lite ? 12 : 24;
  for (let i = 0; i < N; i++) {
    const s = i + (front ? 100 : 0);
    const hx = hash(s * 3 + 1), sp = 0.45 + hash(s * 7 + 2) * 0.5, ph = hash(s * 11 + 5) * TAU;
    const H = 760;
    const y = -90 + ((hash(s * 5 + 3) * H + t * sp) % H);
    let x = front ? (i % 2 ? 40 + hx * 100 : 460 + hx * 100) : -80 + hx * 760;
    x += Math.sin(t * 0.02 * sp + ph) * 18;
    const fade = clamp01((y + 90) / 60) * clamp01((660 - y) / 40);
    const r = (front ? 5.5 : 3.5) + hash(s * 13 + 4) * 5;
    snFlake(c, x, y, r, t * 0.01 * sp + ph, fade * vis * (front ? 0.95 : 0.85));
  }
}
// ── ตัวช่วยเฉพาะชุดนี้ (รอบสอง — ดีไซน์ราชินีน้ำแข็ง: เครื่องเพชร ทอง โซ่คริสตัล) ──
/** เกล็ดหิมะลายเส้น (งานปัก) หกแฉกมีกิ่งสองคู่ */
function snFlakeLine(c, x, y, r, col, w = 1.5, rot = 0) {
  c.strokeStyle = col;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = rot + (i * TAU) / 6 - Math.PI / 2, ux = Math.cos(a), uy = Math.sin(a);
    c.moveTo(x, y);
    c.lineTo(x + ux * r, y + uy * r);
    for (const [p, l] of [[0.45, 0.3], [0.72, 0.22]]) {
      for (const s of [-1, 1]) {
        const ba = a + s * 0.75;
        c.moveTo(x + ux * r * p, y + uy * r * p);
        c.lineTo(x + ux * r * p + Math.cos(ba) * r * l, y + uy * r * p + Math.sin(ba) * r * l);
      }
    }
  }
  c.stroke();
}
/** ลายปักคริสตัลหกเหลี่ยมเรียงสลับ (ผ้าคลุม) — P = ตัวดัดจุด (ไม่ใส่ = ตรง) */
function snHexes(c, x0, y0, x1, y1, step, r, col, w = 1.2, P = null) {
  c.strokeStyle = col;
  c.lineWidth = w;
  c.lineJoin = 'round';
  c.beginPath();
  let row = 0;
  for (let y = y0; y < y1; y += step * 0.86, row++) {
    for (let x = x0 + (row % 2) * (step / 2); x < x1; x += step) {
      for (let i = 0; i <= 6; i++) {
        const a = (i * TAU) / 6 + Math.PI / 6;
        const [px, py] = P ? P(x + Math.cos(a) * r, y + Math.sin(a) * r) : [x + Math.cos(a) * r, y + Math.sin(a) * r];
        if (i) c.lineTo(px, py); else c.moveTo(px, py);
      }
    }
  }
  c.stroke();
}
/** แฉกคริสตัลทรงว่าว (ฐานที่ x,y ชี้ไปทาง ang ยาว len กว้าง wid): ครึ่งมืดครึ่งสว่าง สันกลางขาว */
function snKite(c, x, y, len, wid, ang, pal, cols, W) {
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  const P = (u, v) => [x + ux * u + nx * v, y + uy * u + ny * v];
  const q = new Path2D();
  q.moveTo(...P(0, 0));
  q.lineTo(...P(len * 0.34, -wid));
  q.lineTo(...P(len, 0));
  q.lineTo(...P(len * 0.34, wid));
  q.closePath();
  const [tx, ty] = P(len, 0);
  c.fillStyle = swGrad(c, x, y, tx, ty, [cols[2], cols[1], cols[0]]);
  c.fill(q);
  c.save();
  c.clip(q);
  c.fillStyle = 'rgba(20,55,170,.22)';
  c.beginPath(); c.moveTo(...P(0, 0)); c.lineTo(...P(len * 1.1, 0)); c.lineTo(...P(len * 0.34, wid * 1.2)); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.9)';
  c.lineWidth = Math.max(0.6, wid * 0.16);
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(...P(len * 0.12, 0)); c.lineTo(...P(len * 0.92, 0)); c.stroke();
  c.restore();
  outline(c, q, pal, W);
}
/**
 * ดาวคริสตัลแปดแฉก (เข็มกลัดอก หัวคทา ปลายมงกุฎ จี้หาง): แฉกยาวสี่ทิศคริสตัลฟ้าใส + แฉกสั้นเฉียงคริสตัลน้ำเงิน
 * กลางเป็นกรอบทองกับเม็ดน้ำเงิน · ประกายวิ้งที่ปลายแฉกบนเป็นจังหวะ
 */
function snStar8(c, x, y, r, pal, t = 0, o = {}) {
  const rot = o.rot || 0, W = o.w ?? Math.max(1, r * 0.06) * SNK;
  for (let i = 0; i < 4; i++) snKite(c, x, y, r * 0.66, r * 0.2, rot + Math.PI / 4 + (i * Math.PI) / 2, pal, SN.crystalB, W);
  for (let i = 0; i < 4; i++) snKite(c, x, y, r, r * 0.25, rot - Math.PI / 2 + (i * Math.PI) / 2, pal, SN.crystal, W);
  const b = new Path2D();
  b.arc(x, y, r * 0.3, 0, TAU);
  swBlob(c, b, swGrad(c, x - r * 0.3, y - r * 0.3, x + r * 0.3, y + r * 0.3, SN.gold), pal, W);
  snGem(c, x, y, r * 0.2, pal, t, { cols: SN.crystalB, bezel: false });
  const gl = Math.sin(t * 0.07 + x * 0.03);
  if (gl > 0.4 && r > 7) snSparkle(c, x + Math.cos(rot - Math.PI / 2) * r * 0.9, y + Math.sin(rot - Math.PI / 2) * r * 0.9, (r * 0.45 * (gl - 0.4)) / 0.6, 1);
}
/** เพชรทรงว่าวตั้ง (บนสั้น ล่างยาว) เจียระไนสี่เหลี่ยม · o.frame = กรอบทองรอบเม็ด */
function snDiamond(c, x, y, w, h, pal, cols = SN.crystalB, o = {}) {
  const top = y - h * 0.42, bot = y + h * 0.58;
  const W = o.w ?? Math.max(1, w * 0.12) * SNK;
  if (o.frame) {
    const f = new Path2D();
    f.moveTo(x, top - 4); f.lineTo(x + w + 3.5, y); f.lineTo(x, bot + 5); f.lineTo(x - w - 3.5, y); f.closePath();
    swBlob(c, f, swGrad(c, x - w, top, x + w, bot, SN.gold), pal, W);
  }
  const q = new Path2D();
  q.moveTo(x, top); q.lineTo(x + w, y); q.lineTo(x, bot); q.lineTo(x - w, y); q.closePath();
  c.fillStyle = swGrad(c, x - w, top, x + w * 0.6, bot, ['#FFFFFF', cols[1], cols[2]]);
  c.fill(q);
  c.save();
  c.clip(q);
  c.fillStyle = 'rgba(255,255,255,.45)';
  c.beginPath(); c.moveTo(x, top); c.lineTo(x - w, y); c.lineTo(x, y); c.closePath(); c.fill();
  c.fillStyle = 'rgba(20,50,160,.26)';
  c.beginPath(); c.moveTo(x, bot); c.lineTo(x + w, y); c.lineTo(x, y); c.closePath(); c.fill();
  c.fillStyle = 'rgba(20,50,160,.1)';
  c.beginPath(); c.moveTo(x, bot); c.lineTo(x - w, y); c.lineTo(x, y); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.7)';
  c.lineWidth = Math.max(0.6, w * 0.08);
  c.beginPath(); c.moveTo(x - w * 0.5, y); c.lineTo(x + w * 0.5, y); c.moveTo(x, top + h * 0.12); c.lineTo(x, bot - h * 0.15); c.stroke();
  c.restore();
  outline(c, q, pal, W);
  c.fillStyle = 'rgba(255,255,255,.95)';
  c.beginPath(); c.ellipse(x - w * 0.36, y - h * 0.16, w * 0.16, h * 0.06, -0.9, 0, TAU); c.fill();
}
/** โซ่ลูกปัดทองตามจุด (สายห้อยโค้ง) — pts = จุดบนเส้น · ระยะเม็ด gap */
function snChain(c, pts, gap = 4.6, r = 1.7) {
  c.fillStyle = SN.gold[2];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const l = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(l / gap));
    for (let j = 0; j < n; j++) {
      const u = j / n;
      c.beginPath(); c.arc(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, r, 0, TAU); c.fill();
    }
  }
  c.fillStyle = SN.gold[0];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const l = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(l / gap));
    for (let j = 0; j < n; j += 2) {
      const u = j / n;
      c.beginPath(); c.arc(x0 + (x1 - x0) * u - r * 0.3, y0 + (y1 - y0) * u - r * 0.3, r * 0.45, 0, TAU); c.fill();
    }
  }
}
/** สายโซ่ห้อยโค้งระหว่างสองจุด (หย่อน sag) คืนจุดบนเส้น */
function snSwag(a, b, sag, n = 10, P = null) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u + Math.sin(u * Math.PI) * sag;
    pts.push(P ? P(x, y) : [x, y]);
  }
  return pts;
}
/** กำไลทองประดับเพชร (รัดรอบแขน/ขา): M = ตัวดัดจุด · (x,y) กลาง · ang = ทิศแนวแขน · hw = ครึ่งความกว้างแขน */
function snBangle(c, M, x, y, ang, hw, pal, t = 0) {
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  const P = (u, v) => M(x + ux * u + nx * v, y + uy * u + ny * v);
  const q = new Path2D();
  q.moveTo(...P(-3.4, -hw - 1));
  q.quadraticCurveTo(...P(1.4, 0), ...P(-3.4, hw + 1));
  q.lineTo(...P(3.4, hw + 1));
  q.quadraticCurveTo(...P(8.2, 0), ...P(3.4, -hw - 1));
  q.closePath();
  const [g0x, g0y] = P(0, -hw), [g1x, g1y] = P(0, hw);
  c.fillStyle = swGrad(c, g0x, g0y, g1x, g1y, [SN.gold[0], SN.gold[1], SN.gold[2]]);
  c.fill(q);
  c.save();
  c.clip(q);
  c.strokeStyle = 'rgba(255,255,255,.85)';
  c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(...P(-1.6, -hw * 0.8)); c.quadraticCurveTo(...P(2.4, 0), ...P(-1.6, hw * 0.8)); c.stroke();
  c.restore();
  outline(c, q, pal, SNO * 0.7);
  // เพชรวางตามแนวแขน (แกนยาวชี้ไปทางอุ้งเท้า)
  const [gx, gy] = P(3.2, 0), [hx, hy] = P(7.2, 0);
  c.save();
  c.translate(gx, gy);
  c.rotate(Math.atan2(hy - gy, hx - gx) - Math.PI / 2);
  snDiamond(c, 0, 0, 4, 10, pal, SN.crystal, { w: 0.9 * SNK });
  c.restore();
}
/**
 * โบว์น้ำเงินราชวงศ์ (ออกแบบใหม่ของชุดนี้ — ไม่ใช่โบว์กลมพองแบบ sweet): ห่วงทรงเหลี่ยมมนแบบซาตินรีดเรียบ ขอบในขลิบขาว
 * หางตรงเรียว ปลายตัดเฉียง (ไม่ใช่ V) · o.star = ใส่ดาวคริสตัลแปดแฉกกลางโบว์ (ขนาดเท่าของ r) · o.tail = ยาวหาง
 */
function snRoyalBow(c, x, y, r, pal, t = 0, o = {}) {
  const cols = o.cols || SN.royal, W = o.w ?? SNO, tl = o.tail ?? 1.5;
  const fl = Math.sin(t * 0.06 + x * 0.04);
  if (tl > 0) {
    for (const d of [-1, 1]) {
      const ex = x + d * r * (0.62 + 0.06 * fl * d), ey = y + r * tl;
      const q = new Path2D();
      q.moveTo(x - d * r * 0.06, y + r * 0.1);
      q.lineTo(x + d * r * 0.32, y + r * 0.04);
      q.quadraticCurveTo(ex + d * r * 0.3 + fl * r * 0.05, y + r * tl * 0.55, ex + d * r * 0.3, ey - r * 0.2);
      q.lineTo(ex - d * r * 0.24, ey + r * 0.12);
      q.quadraticCurveTo(ex - d * r * 0.16, y + r * tl * 0.5, x - d * r * 0.06, y + r * 0.1);
      q.closePath();
      c.fillStyle = swGrad(c, x, y, x, ey, [cols[1], cols[2], cols[2]]);
      c.fill(q);
      c.save();
      c.clip(q);
      c.strokeStyle = 'rgba(255,255,255,.6)';
      c.lineWidth = r * 0.14;
      c.stroke(q);
      c.restore();
      outline(c, q, pal, W);
    }
  }
  for (const d of [-1, 1]) {
    const q = new Path2D();
    q.moveTo(x, y - r * 0.05);
    q.quadraticCurveTo(x + d * r * 0.45, y - r * 1.05, x + d * r * 1.35, y - r * 0.8);
    q.quadraticCurveTo(x + d * r * 1.7, y - r * 0.64, x + d * r * 1.56, y - r * 0.1);
    q.quadraticCurveTo(x + d * r * 1.46, y + r * 0.5, x + d * r * 1.05, y + r * 0.48);
    q.quadraticCurveTo(x + d * r * 0.45, y + r * 0.42, x, y + r * 0.08);
    q.closePath();
    c.fillStyle = swGrad(c, x, y - r, x + d * r * 0.5, y + r * 0.5, cols);
    c.fill(q);
    c.save();
    c.clip(q);
    c.fillStyle = 'rgba(15,35,120,.28)';
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + d * r * 0.7, y - r * 0.5); c.lineTo(x + d * r * 0.75, y + r * 0.45); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.62)';
    c.lineWidth = r * 0.16;
    c.stroke(q);
    c.strokeStyle = 'rgba(255,255,255,.55)';
    c.lineWidth = r * 0.1;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + d * r * 0.5, y - r * 0.62); c.quadraticCurveTo(x + d * r * 1.05, y - r * 0.82, x + d * r * 1.38, y - r * 0.5); c.stroke();
    c.restore();
    outline(c, q, pal, W);
  }
  const kn = new Path2D();
  kn.roundRect(x - r * 0.3, y - r * 0.36, r * 0.6, r * 0.74, r * 0.18);
  c.fillStyle = swGrad(c, x, y - r * 0.4, x, y + r * 0.4, cols);
  c.fill(kn);
  outline(c, kn, pal, W);
  if (o.star) snStar8(c, x, y + r * 0.02, r * o.star, pal, t, { rot: o.starRot || 0 });
}

// ── ชิ้นชุด ──
/** แขน (ไม่มีแขนเสื้อ — ผ้าขนคลุมไหล่) : กำไลทองเพชรที่ข้อมือ (พิกัดแขนซ้ายในไฟล์ ผ่านตัวดัดจุด Q) */
function snowWrist(c, Q, pal, t) {
  snBangle(c, Q, 214 - 0.95 * 82, 436 + 0.31 * 82, Math.atan2(0.31, -0.95), 22, pal, t);
}
/**
 * ตัวเสื้อ: ซาตินขาวหิมะไล่ฟ้าน้ำแข็งลงล่าง เงาข้างตัวฟ้า · ลายฉลุเงินเป็นเถาเกล็ดน้ำแข็งสมมาตร · เพชรน้ำเงินเรียงกลางอก
 * แขน: กำไลทองที่ข้อมือ (ไม่มีแขนเสื้อ) · หลัง: ตะเข็บกลางหลังกระดุมเพชร · หมอบ: คลุมทั้งก้อน ชายกลีบแหลมแตะพื้น
 */
function snowBodice(c, k) {
  const pal = k.pal, t = k.t || 0;
  for (const a of k.arms || []) snowWrist(c, a.pt, pal, t);
  if (k.sleevesOnly) return;
  const P = k.pt || ((x, y) => [x, y]);
  const mode = k.mode || 'stand', sit = mode === 'sit', loaf = mode === 'loaf';
  const vy = k.vy ?? (sit ? 46 : 0);
  const hemY = loaf ? 700 : sit ? 566 : k.back ? 486 : 522;
  const bot = Math.min(hemY, 640);
  c.save();
  if (k.body) c.clip(k.body);
  const area = new Path2D();
  area.moveTo(...P(20, 330 + vy));
  area.lineTo(...P(580, 330 + vy));
  area.lineTo(...P(580, hemY));
  area.quadraticCurveTo(...P(300, hemY + 12), ...P(20, hemY));
  area.closePath();
  const [, ya] = P(300, 384 + vy), [, yb] = P(300, Math.min(hemY, 660));
  c.fillStyle = swGrad(c, 0, ya, 0, yb, ['#FFFFFF', SN.snow[1], SN.ice[1]]);
  c.fill(area);
  c.save();
  c.clip(area);
  const [lx] = P(168, 460), [rx] = P(432, 460);
  const sg = c.createLinearGradient(lx, 0, rx, 0);
  sg.addColorStop(0, 'rgba(68,121,217,.24)');
  sg.addColorStop(0.3, 'rgba(255,255,255,0)');
  sg.addColorStop(0.7, 'rgba(255,255,255,0)');
  sg.addColorStop(1, 'rgba(68,121,217,.24)');
  c.fillStyle = sg;
  c.fillRect(lx - 500, ya - 300, rx - lx + 1000, 800);
  const top = 400 + vy;
  // เถาเกล็ดน้ำแข็งฉลุเงิน (สมมาตร) — ขอบเงินเข้ม + ไส้ขาว
  c.lineCap = 'round';
  for (const d of [-1, 1]) {
    for (const [col, w] of [['#AFC0DA', 2.8], ['rgba(255,255,255,.95)', 1.1]]) {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(...P(300 + d * 14, top + 12));
      c.bezierCurveTo(...P(300 + d * 52, top + 10), ...P(300 + d * 70, top + 44), ...P(300 + d * 50, top + 62));
      c.bezierCurveTo(...P(300 + d * 38, top + 72), ...P(300 + d * 28, top + 62), ...P(300 + d * 36, top + 54));
      c.moveTo(...P(300 + d * 52, top + 40));
      c.quadraticCurveTo(...P(300 + d * 86, top + 46), ...P(300 + d * 92, top + 78));
      c.moveTo(...P(300 + d * 16, Math.min(bot - 8, top + 86)));
      c.quadraticCurveTo(...P(300 + d * 40, top + 92), ...P(300 + d * 62, Math.min(bot - 4, top + 112)));
      c.stroke();
    }
    for (const [x, y] of [[300 + d * 92, top + 80], [300 + d * 36, top + 54]]) {
      const [px, py] = P(x, y);
      c.fillStyle = '#FFFFFF';
      c.beginPath(); c.arc(px, py, 2.6, 0, TAU); c.fill();
    }
  }
  c.strokeStyle = 'rgba(255,255,255,.45)';
  c.lineWidth = 9;
  for (const x of [222, 378]) {
    const s = x < 300 ? -1 : 1;
    c.beginPath();
    c.moveTo(...P(x, 410 + vy));
    c.quadraticCurveTo(...P(x + s * 6, (410 + vy + bot) / 2), ...P(x + s * 4, bot - 8));
    c.stroke();
  }
  if (loaf) {
    // ชายตอนหมอบ: ทูลเล่ฟ้าปลายแหลมถี่ + กลีบขาวปลายแหลมแตะพื้น
    for (const [y0, n, dep, cols] of [[610, 26, 9, SN.ice], [596, 9, 18, ['#FFFFFF', SN.snow[1], SN.ice[0]]]]) {
      const q = new Path2D();
      q.moveTo(...P(50, y0 - 40));
      q.lineTo(...P(550, y0 - 40));
      for (let i = 0; i <= 120; i++) {
        const x = 550 - (500 * i) / 120, f = ((x - 50) / 500) * n % 1;
        q.lineTo(...P(x, y0 + dep * (1 - Math.abs(2 * f - 1) ** 0.6)));
      }
      q.closePath();
      c.fillStyle = swGrad(c, 0, y0 - 40, 0, y0 + dep, cols);
      c.fill(q);
      outline(c, q, pal, SNO * 0.6);
    }
  }
  if (!k.back) {
    for (let i = 0; i < 3; i++) {
      const y = top + 30 + i * 26;
      if (y > bot - 10) break;
      const [gx, gy] = P(300, y);
      snDiamond(c, gx, gy, 5.2 - i * 0.6, 13 - i * 1.5, pal, SN.crystalB);
    }
  } else {
    c.strokeStyle = 'rgba(68,121,217,.3)';
    c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(...P(300, top)); c.lineTo(...P(300, bot)); c.stroke();
    for (let y = top + 20; y < bot - 6; y += 18) { const [gx, gy] = P(300, y); snGem(c, gx, gy, 3.6, pal, t, { bezel: false }); }
  }
  c.restore();
  // เส้นชายเสื้อ: วาดในขอบตัว (ยังอยู่ใน clip ของ k.body) — ไม่งั้นเส้นยาวพาดออกนอกตัว
  if (!loaf) {
    c.strokeStyle = pal.line;
    c.lineWidth = SNO;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(...P(20, hemY)); c.quadraticCurveTo(...P(300, hemY + 12), ...P(580, hemY)); c.stroke();
  }
  c.restore();
}
/** แขนท่อ (นั่งเกา/ถือหัวใจ): ไม่มีแขนเสื้อ — กำไลทองเพชรใกล้อุ้งเท้า */
function snowSitSleeve(c, band, upto, pal) {
  const N = band.pts.length - 1, i = Math.max(1, N - 2), q = band.pts[i];
  snBangle(c, (x, y) => [x, y], q.x, q.y, q.a, band.half(i) + 1, pal, 0);
}
/**
 * ผ้าขนคลุมไหล่ (ตามบอร์ด): ขนเฟอร์ขาวฟูก้อนใหญ่คลุมไหล่ถึงโคนแขน + แถวในรอบคอ
 * หน้า: โบว์น้ำเงินราชวงศ์ เข็มกลัดดาวคริสตัลแปดแฉก โซ่ทองห้อยเพชรโค้งสองข้างอก
 */
function snowStole(c, k) {
  const pal = k.pal, t = k.t || 0;
  const P = k.cpt || ((x, y) => [x, y]);
  const outer = [], inner = [];
  for (let i = 0; i < 12; i++) {
    const u = i / 11;
    const [x, y] = P(164 + 272 * u, 418 + Math.sin(u * Math.PI) * 26 - Math.abs(u - 0.5) * 6);
    outer.push([x, y, Math.abs(u - 0.5) > 0.36 ? 22 : i % 2 ? 18 : 20.5, i]);
  }
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    const [x, y] = P(206 + 188 * u, 398 + Math.sin(u * Math.PI) * 24);
    inner.push([x, y, i % 2 ? 13 : 15.5, i + 30]);
  }
  snFur(c, outer, pal);
  snFur(c, inner, pal);
  if (k.back) return;
  const sx = (k.cpt ? (k.hxShift || 0) : (k.faceShift || 0)) * 0.5;
  const [bx, by] = P(300, 452);
  // โซ่ทองห้อยเพชร: จากเข็มกลัดโค้งไปสองข้างอก (สองสายซ้อน) — วาดก่อนโบว์ (โบว์ทับต้นโซ่)
  for (const d of [-1, 1]) {
    for (const [ex, ey, sag] of [[74, 6, 20], [92, 18, 30]]) {
      const pts = snSwag([bx + sx + d * 10, by + 8], [bx + sx + d * ex, by + ey], sag, 10);
      snChain(c, pts, 4.4, 1.7);
      const [mx, my] = pts[5];
      snDrop(c, mx, my + 5, 3.4, pal, sag > 25 ? SN.crystalB : SN.crystal);
    }
  }
  snRoyalBow(c, bx + sx, by, 24, pal, t, { tail: 1.45, star: 0.8 });
}
/**
 * กระโปรงสั้นหลายชั้น (วิ่งคล่อง): ระบายลาเวนเดอร์บาง · ทูลเล่ฟ้าน้ำแข็งชายแหลมถี่ (น้ำแข็งย้อย) ·
 * กลีบซาตินขาวเจ็ดกลีบปลายแหลม ปักเกล็ดหิมะฟ้า มีหยดคริสตัลห้อยปลายกลีบ · ขอบเอวทองเพชรน้ำเงิน
 * · โซ่ทองโค้งสี่ช่วงห้อยหยดคริสตัล (หน้า) — ไม่มีโบว์สะโพก/ลูกไม้ (คนละแบบกับชุดขนมหวาน)
 */
function snowSkirt(c, k) {
  const pal = k.pal, t = k.t || 0;
  const P = k.pt || ((x, y) => [x, y]);
  const sit = k.mode === 'sit';
  const G = sit
    ? { y0: 530, y1: 604, x0: 176, x1: 424, fl: 52 }
    : { y0: 486, y1: 562, x0: 196, x1: 404, fl: 44 - 12 * (k.hold || 0) };
  const sw = Math.sin(t * 0.05) * 2.5;
  // ทรงเอบานตรง (ไม่ใช่กระดิ่งพอง)
  const flare = (g, hemFn, N = 60) => {
    const xa = G.x0 - g * 0.3, xb = G.x1 + g * 0.3, yh = G.y1 + g;
    const bx0 = xa - G.fl - g * 0.5 + sw * 0.4, bx1 = xb + G.fl + g * 0.5 + sw;
    const q = new Path2D();
    q.moveTo(...P(xa, G.y0));
    q.quadraticCurveTo(...P(300, G.y0 + 14), ...P(xb, G.y0));
    q.quadraticCurveTo(...P(xb + G.fl * 0.35, G.y0 + (yh - G.y0) * 0.35), ...P(bx1, yh + hemFn(1)));
    const hem = [];
    for (let i = 0; i <= N; i++) {
      const u = 1 - i / N;
      hem.push([bx0 + (bx1 - bx0) * u, yh + Math.sin(u * Math.PI) * 7 + hemFn(u), u]);
    }
    for (const [x, y] of hem) q.lineTo(...P(x, y));
    q.quadraticCurveTo(...P(xa - G.fl * 0.35, G.y0 + (yh - G.y0) * 0.35), ...P(xa, G.y0));
    q.closePath();
    return { q, hem, bx0, bx1, yh };
  };
  const spike = (n, dep, pw = 0.6) => (u) => { const f = (u * n) % 1; return dep * (1 - Math.abs(2 * f - 1) ** pw); };
  const [, gy0] = P(300, G.y0), [, gy1] = P(300, G.y1 + 16);
  // 1) ระบายลาเวนเดอร์ชั้นในสุด (ชายคลื่นถี่)
  const pet = flare(15, (u) => Math.sin(u * Math.PI * 30) * 2.2, 150);
  c.fillStyle = swGrad(c, 0, gy0, 0, gy1, SN.lav);
  c.fill(pet.q);
  outline(c, pet.q, pal, SNO * 0.7);
  // 2) ทูลเล่ฟ้าน้ำแข็งชายแหลมถี่ (น้ำแข็งย้อย) โปร่งนิด ๆ มีกากเพชร
  const tul = flare(9, spike(22, 10), 220);
  c.save();
  c.globalAlpha *= 0.92;
  c.fillStyle = swGrad(c, 0, gy0, 0, gy1, [SN.ice[0], SN.ice[1], SN.cyan[1]]);
  c.fill(tul.q);
  c.restore();
  c.save();
  c.clip(tul.q);
  c.fillStyle = 'rgba(255,255,255,.95)';
  for (let i = 0; i < 20; i++) {
    const [px, py] = P(tul.bx0 + hash(i * 3 + 240) * (tul.bx1 - tul.bx0), G.y1 - 6 + hash(i * 5 + 241) * 22);
    c.beginPath(); c.arc(px, py, 1.3 + hash(i + 242) * 1.3, 0, TAU); c.fill();
  }
  c.restore();
  outline(c, tul.q, pal, SNO * 0.7);
  // 3) กลีบซาตินขาวเจ็ดกลีบ ปลายแหลม
  const NP = 7;
  const ov = flare(0, spike(NP, 15), 140);
  c.fillStyle = swGrad(c, 0, gy0, 0, gy1, ['#FFFFFF', SN.snow[1], SN.ice[0]]);
  c.fill(ov.q);
  c.save();
  c.clip(ov.q);
  c.lineCap = 'round';
  for (let i = 0; i < NP; i++) {
    // แต่ละกลีบ: ครึ่งขวาอมฟ้า (เงากลีบ) + ตะเข็บเงินระหว่างกลีบ
    const u0 = i / NP, u1 = (i + 1) / NP, um = (u0 + u1) / 2;
    const xw0 = G.x0 + (G.x1 - G.x0) * u0, xw1 = G.x0 + (G.x1 - G.x0) * u1, xwm = (xw0 + xw1) / 2;
    const xh0 = ov.bx0 + (ov.bx1 - ov.bx0) * u0, xh1 = ov.bx0 + (ov.bx1 - ov.bx0) * u1, xhm = (xh0 + xh1) / 2;
    const sh = new Path2D();
    sh.moveTo(...P(xwm, G.y0 + 8));
    sh.lineTo(...P(xw1, G.y0 + 8));
    sh.lineTo(...P(xh1, ov.yh + 6));
    sh.lineTo(...P(xhm, ov.yh + 30));
    sh.closePath();
    c.fillStyle = 'rgba(87,150,230,.13)';
    c.fill(sh);
    if (i) {
      c.strokeStyle = 'rgba(150,175,215,.85)';
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(...P(xw0, G.y0 + 10)); c.lineTo(...P(xh0, ov.yh + 4)); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.95)';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(...P(xw0 - 2, G.y0 + 10)); c.lineTo(...P(xh0 - 2, ov.yh + 4)); c.stroke();
    }
    if (i % 2 === 0) {
      const [fx, fy] = P(xhm * 0.7 + xwm * 0.3, G.y0 + (ov.yh - G.y0) * 0.66);
      snFlakeLine(c, fx, fy, sit ? 9 : 10, 'rgba(87,150,230,.85)', 1.6, 0.1 * i);
      snFlakeLine(c, fx, fy, sit ? 9 : 10, 'rgba(255,255,255,.7)', 0.6, 0.1 * i);
    } else {
      const [fx, fy] = P(xhm * 0.7 + xwm * 0.3, G.y0 + (ov.yh - G.y0) * 0.55);
      c.fillStyle = 'rgba(87,190,240,.7)';
      c.beginPath(); c.arc(fx, fy, 2, 0, TAU); c.fill();
    }
  }
  c.restore();
  outline(c, ov.q, pal, SNO);
  // หยดคริสตัลห้อยปลายกลีบ
  for (let i = 0; i < NP; i++) {
    const u = (i + 0.5) / NP;
    const x = ov.bx0 + (ov.bx1 - ov.bx0) * u;
    const [px, py] = P(x, ov.yh + Math.sin(u * Math.PI) * 7 + 15);
    snDrop(c, px, py + 3.5, 3.3, pal, i % 2 ? SN.crystal : SN.crystalB);
  }
  // 4) ขอบเอวทอง + เพชรน้ำเงินเรียง
  const band = new Path2D();
  band.moveTo(...P(G.x0 - 3, G.y0 - 3));
  band.quadraticCurveTo(...P(300, G.y0 + 12), ...P(G.x1 + 3, G.y0 - 3));
  band.lineTo(...P(G.x1 + 4, G.y0 + 8));
  band.quadraticCurveTo(...P(300, G.y0 + 24), ...P(G.x0 - 4, G.y0 + 8));
  band.closePath();
  c.fillStyle = swGrad(c, 0, gy0 - 4, 0, gy0 + 22, SN.gold);
  c.fill(band);
  c.save();
  c.clip(band);
  c.strokeStyle = 'rgba(255,255,255,.85)';
  c.lineWidth = 1.6;
  c.beginPath();
  for (let i = 0; i <= 20; i++) { const u = i / 20; const [x, y] = P(G.x0 + (G.x1 - G.x0) * u, G.y0 + 0.5 + 30 * u * (1 - u) * 0.5); if (i) c.lineTo(x, y); else c.moveTo(x, y); }
  c.stroke();
  c.restore();
  outline(c, band, pal, SNO * 0.75);
  const wy = (u) => G.y0 + 2.5 + 30 * u * (1 - u) * 0.62;
  for (let i = 0; i < 7; i++) {
    const u = (i + 0.5) / 7;
    if (!k.back && i === 3) continue;
    const [gx, gy] = P(G.x0 + (G.x1 - G.x0) * u, wy(u));
    snDiamond(c, gx, gy, 3.6, 8.5, pal, i % 2 ? SN.crystal : SN.crystalB, { w: 0.9 * SNK });
  }
  for (let i = 0; i < 6; i++) {
    const a = Math.sin(t * 0.075 + i * 2.3);
    if (a <= 0.25) continue;
    const [gx, gy] = P(G.x0 - 14 + hash(i * 7 + 290) * (G.x1 - G.x0 + 28), G.y0 + 26 + hash(i * 3 + 291) * (G.y1 - G.y0 - 6));
    snSparkle(c, gx, gy, 2 + (6 * (a - 0.25)) / 0.75, 1);
  }
  if (k.back) return;
  // 5) โซ่ทองโค้งสี่ช่วงห้อยหยดคริสตัล + เพชรกลางเอวกรอบทอง
  const us = [0.08, 0.3, 0.5, 0.7, 0.92];
  for (let i = 0; i < us.length - 1; i++) {
    const a = [G.x0 + (G.x1 - G.x0) * us[i], wy(us[i]) + 6], b = [G.x0 + (G.x1 - G.x0) * us[i + 1], wy(us[i + 1]) + 6];
    const pts = snSwag(a, b, 20, 10, P);
    snChain(c, pts, 4.2, 1.6);
    const [mx, my] = pts[5];
    snDrop(c, mx, my + 4.5, 3.2, pal, i % 2 ? SN.crystalB : SN.crystal);
  }
  const [hx, hy] = P(300, wy(0.5) + 1);
  snDiamond(c, hx, hy, 8, 19, pal, SN.crystal, { frame: true });
}
/**
 * เทียร่าราชินีน้ำแข็ง (คาดหน้าผาก ไม่บังหู): แถบเงินโค้งตามหัว ขอบมุก · ซุ้มฉลุทองสี่ซุ้ม · เพชรใหญ่ทรงว่าวกลางกรอบทอง
 * เพชรรองสองคู่ · ดาวคริสตัลแปดแฉกที่ปลายสองข้าง ห้อยโซ่ทองหยดคริสตัลแกว่งเบา ๆ · แสงฟ้าเรืองหลังเพชรกลาง
 */
function snowTiara(c, k) {
  const pal = k.pal, t = k.t || 0, back = k.back;
  const base = (u) => [300 + u * 90, 152 + u * u * 26];
  if (!back) glowAt(c, 300, 98, 110, '87,216,245', 0.26 + 0.08 * Math.sin(t * 0.06));
  // โซ่หยดคริสตัลจากปลายเทียร่า (วาดก่อน ปลายแถบทับต้นโซ่)
  for (const d of [-1, 1]) {
    const [ex, ey] = base(d * 1.04);
    const sw = Math.sin(t * 0.07 + d) * 0.14;
    const pts = [];
    for (let i = 0; i <= 6; i++) { const l = i * 4.6; pts.push([ex + Math.sin(sw + d * 0.1) * l, ey + Math.cos(sw) * l]); }
    snChain(c, pts, 4.2, 1.5);
    const [px, py] = pts[6];
    snDrop(c, px, py + 5, 4.2, pal, SN.crystal);
  }
  // ซุ้มฉลุทอง: เส้นน้ำตาลรอง + ทอง + ไฮไลต์
  const arches = [[-1.0, -0.52, 20], [-0.52, -0.1, 30], [0.1, 0.52, 30], [0.52, 1.0, 20]];
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const [col, w] of [[pal.line, 4.6 * SNK + 1.6], [SN.gold[2], 3], [SN.gold[1], 1.9], ['rgba(255,255,255,.75)', 0.6]]) {
    c.strokeStyle = col;
    c.lineWidth = w;
    c.beginPath();
    for (const [u0, u1, hgt] of arches) {
      const [x0, y0] = base(u0), [x1, y1] = base(u1);
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - hgt;
      c.moveTo(x0, y0 - 4);
      c.quadraticCurveTo(x0 + (mx - x0) * 0.2, my, mx, my);
      c.quadraticCurveTo(x1 - (x1 - mx) * 0.2, my, x1, y1 - 4);
      // ม้วนปลายซุ้ม
      c.moveTo(mx, my);
      c.quadraticCurveTo(mx + 5, my + 9, mx, my + 12);
    }
    c.stroke();
  }
  // แถบเงิน + มุกขอบล่าง
  const bd = new Path2D();
  const N = 24;
  for (let i = 0; i <= N; i++) { const [x, y] = base(-1.05 + (2.1 * i) / N); if (i) bd.lineTo(x, y - 5); else bd.moveTo(x, y - 5); }
  for (let i = N; i >= 0; i--) { const [x, y] = base(-1.05 + (2.1 * i) / N); bd.lineTo(x, y + 4.5); }
  bd.closePath();
  c.fillStyle = swGrad(c, 0, 140, 0, 180, SN.silver);
  c.fill(bd);
  outline(c, bd, pal, SNO * 0.8);
  c.fillStyle = '#FFFFFF';
  c.strokeStyle = pal.line;
  c.lineWidth = 0.9 * SNK;
  for (let i = 0; i <= 14; i++) {
    const [x, y] = base(-0.98 + (1.96 * i) / 14);
    c.beginPath(); c.arc(x, y + 7, 2.3, 0, TAU); c.fill(); c.stroke();
  }
  if (back) return;
  for (const u of [-0.86, 0.86]) { const [x, y] = base(u); snDiamond(c, x, y - 5, 4.6, 13, pal, SN.crystalB); }
  for (const u of [-0.5, 0.5]) { const [x, y] = base(u); snDiamond(c, x, y - 9, 6.4, 20, pal, SN.crystal, { frame: true }); }
  for (const d of [-1, 1]) { const [x, y] = base(d * 1.04); snStar8(c, x, y - 1, 10, pal, t, { rot: 0.2 * d }); }
  // เพชรใหญ่กลาง (กรอบทอง) + เพชรน้ำเงินจิ๋วบนยอด
  snDiamond(c, 300, 66, 5, 14, pal, SN.crystalB);
  snDiamond(c, 300, 106, 17, 56, pal, SN.crystal, { frame: true });
  const tw = Math.sin(t * 0.08);
  if (tw > 0.2) snSparkle(c, 291, 90, (12 * (tw - 0.2)) / 0.8 + 2, 1);
}
/**
 * ผ้าคลุมด้านหลังตัว (มองหน้า: เห็นด้านในซับน้ำเงิน-ลาเวนเดอร์กางสองข้างตัว): ปักคริสตัลหกเหลี่ยม จีบผ้า
 * ขอบผ้าพับเห็นด้านนอกสีขาว · ชายขนเฟอร์ขาว · พลิ้วเบา ๆ · ลดลงตามตัวตอนนั่ง/หมอบ (k.headDrop)
 */
function snowCapeLining(c, k) {
  const pal = k.pal, t = k.t || 0;
  const hd = Math.min(220, k.headDrop || 0);
  const sw = Math.sin(t * 0.04) * 6, sw2 = Math.sin(t * 0.04 + 1.1) * 7;
  const yT = 408 + hd * 0.85, yB = 612, L1 = 76 + sw - hd * 0.05, R1 = 524 + sw2 + hd * 0.05;
  if (yB - yT < 40) return;
  const hem = [];
  for (let i = 0; i <= 8; i++) { const u = i / 8; hem.push([L1 + (R1 - L1) * u, yB + Math.sin(u * Math.PI * 8) * 4 + Math.sin(u * Math.PI) * 6]); }
  const q = new Path2D();
  q.moveTo(206, yT);
  q.bezierCurveTo(140, yT + 20, L1 + 6, yB - 150, L1, yB);
  for (let i = 1; i <= 8; i++) { const [x0] = hem[i - 1], [x1, y1] = hem[i]; q.quadraticCurveTo((x0 + x1) / 2, yB + 12, x1, y1); }
  q.bezierCurveTo(R1 - 6, yB - 150, 460, yT + 20, 394, yT);
  q.closePath();
  // ด้านใน: น้ำเงินราชวงศ์บน → ลาเวนเดอร์ล่าง
  c.fillStyle = swGrad(c, 0, yT, 0, yB + 10, [SN.royal[1], '#7F86E6', SN.lav[1]]);
  c.fill(q);
  c.save();
  c.clip(q);
  snHexes(c, 60, yT + 10, 540, yB + 10, 30, 7, 'rgba(225,235,255,.5)', 1.3);
  c.lineCap = 'round';
  for (let i = 1; i < 8; i++) {
    const u = i / 8, xa = 206 + 188 * u, xb = L1 + (R1 - L1) * u;
    c.strokeStyle = 'rgba(20,30,110,.2)';
    c.lineWidth = 9;
    c.beginPath(); c.moveTo(xa, yT + 6); c.quadraticCurveTo((xa + xb) / 2 + (u - 0.5) * 30, (yT + yB) / 2, xb, yB + 6); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.22)';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(xa + 8, yT + 8); c.quadraticCurveTo((xa + xb) / 2 + (u - 0.5) * 30 + 8, (yT + yB) / 2, xb + 8, yB + 6); c.stroke();
  }
  // ขอบผ้าพับ: ด้านนอกสีขาวโผล่เป็นแถบตามข้างผ้า
  c.strokeStyle = '#F8FCFF';
  c.lineWidth = 22;
  c.stroke(q);
  c.restore();
  outline(c, q, pal, SNO);
  const fur = [];
  for (let i = 0; i <= 30; i++) { const u = i / 30, x = L1 + (R1 - L1) * u; fur.push([x, yB + 2 + Math.sin(u * Math.PI) * 6 + (i % 2) * 2, i % 2 ? 8 : 9.5, i + 50]); }
  snFur(c, fur, pal);
}
/**
 * ผ้าคลุมทับหลัง (มองหลัง): ด้านนอกขาวหิมะ ปักคริสตัลหกเหลี่ยมฟ้า ชายขนเฟอร์ · โบว์น้ำเงินใหญ่กลางหลังหางยาว
 */
function snowBackCape(c, k) {
  const pal = k.pal, t = k.t || 0;
  const sw = Math.sin(t * 0.04) * 6, sw2 = Math.sin(t * 0.04 + 1.1) * 7;
  const yT = 404, yB = 600, L1 = 120 + sw, R1 = 480 + sw2;
  const hem = [];
  for (let i = 0; i <= 8; i++) { const u = i / 8; hem.push([L1 + (R1 - L1) * u, yB + Math.sin(u * Math.PI * 8) * 4 + Math.sin(u * Math.PI) * 8]); }
  const q = new Path2D();
  q.moveTo(200, yT);
  q.bezierCurveTo(168, yT + 50, L1 + 8, yB - 100, L1, yB);
  for (let i = 1; i <= 8; i++) { const [x0] = hem[i - 1], [x1, y1] = hem[i]; q.quadraticCurveTo((x0 + x1) / 2, yB + 14, x1, y1); }
  q.bezierCurveTo(R1 - 8, yB - 100, 432, yT + 50, 400, yT);
  q.closePath();
  c.fillStyle = swGrad(c, 0, yT, 0, yB + 10, ['#FFFFFF', SN.snow[1], SN.ice[0]]);
  c.fill(q);
  c.save();
  c.clip(q);
  snHexes(c, 80, yT + 20, 520, yB + 10, 30, 7, 'rgba(87,150,230,.4)', 1.3);
  const [lx] = [L1];
  const sg = c.createLinearGradient(lx, 0, R1, 0);
  sg.addColorStop(0, 'rgba(68,121,217,.22)');
  sg.addColorStop(0.3, 'rgba(255,255,255,0)');
  sg.addColorStop(0.7, 'rgba(255,255,255,0)');
  sg.addColorStop(1, 'rgba(68,121,217,.22)');
  c.fillStyle = sg;
  c.fillRect(0, yT - 20, 600, yB - yT + 60);
  c.lineCap = 'round';
  for (let i = 1; i < 7; i++) {
    const u = i / 7, xa = 200 + 200 * u, xb = L1 + (R1 - L1) * u;
    c.strokeStyle = 'rgba(68,121,217,.14)';
    c.lineWidth = 8;
    c.beginPath(); c.moveTo(xa, yT + 10); c.quadraticCurveTo((xa + xb) / 2, (yT + yB) / 2, xb, yB + 6); c.stroke();
  }
  c.restore();
  outline(c, q, pal, SNO);
  const fur = [];
  for (let i = 0; i <= 26; i++) { const u = i / 26, x = L1 + (R1 - L1) * u; fur.push([x, yB + 3 + Math.sin(u * Math.PI) * 8 + (i % 2) * 2, i % 2 ? 8.5 : 10, i + 70]); }
  snFur(c, fur, pal);
  snRoyalBow(c, 300, 498, 27, pal, t, { tail: 2.2 });   // ต่ำกว่าขนคลุมไหล่ (ไม่ให้ขนบังห่วงโบว์)
}
/** โบว์หางน้ำเงินราชวงศ์ เพชรกลาง + จี้ดาวคริสตัลห้อยโซ่ทอง (แกว่งตามแรงโน้มถ่วง) */
function snowTailBow(c, k) {
  const pal = k.pal, t = k.t || 0;
  const { x, y, a } = k.at;
  const swing = Math.sin(t * 0.08) * 0.3;
  const px = x + Math.sin(swing) * 20, py = y + Math.cos(swing) * 20;
  snChain(c, [[x, y], [px, py - 8]], 4, 1.4);
  snStar8(c, px, py, 9, pal, t, { rot: swing, w: 1.2 * SNK });
  c.save();
  c.translate(x, y);
  c.rotate(a + Math.PI / 2);
  snRoyalBow(c, 0, 0, 13, pal, t, { tail: 1.2, w: SNO * 0.75 });
  snDiamond(c, 0, 0.5, 3.6, 9, pal, SN.crystal, { w: 0.9 * SNK });
  c.restore();
}
/**
 * กำไลข้อเท้าทองเพชร (อุ้งเท้าทั้งสี่มีเครื่องประดับ ตามบอร์ด) — พันรอบขาเต็มวง:
 * กว้างเท่าขาจริงในไฟล์ออกแบบ (ยืน: ขาซ้ายที่ y 607 กว้าง x 184–264) ปลายมนเลยขอบขานิดเหมือนห่วงสวมรอบ
 * ขอบหน้าโค้งลงตรงกลาง (วงแหวนที่มองจากหน้าเฉียงบน) · หยดคริสตัลห้อยด้านนอก เพชรน้ำเงินกลางห่วง
 */
function snowAnkle(c, k) {
  const pal = k.pal, t = k.t || 0;
  let P = k.pt || ((x, y) => [x, y]);
  const left = k.side === 'left';
  const [cx, cy, hw] = k.mode === 'sit' ? (left ? [262, 610, 30] : [338, 610, 30]) : (left ? [224, 607, 41] : [376, 607, 41]);
  if (k.ankleAt) P = runAnklePt(k.ankleAt, cx, cy, hw);
  const th = 4.6, sag = 5.5, N = 16;
  const yAt = (v) => cy + sag * (1 - (v / hw) ** 2);
  const q = new Path2D();
  for (let i = 0; i <= N; i++) { const v = -hw + (2 * hw * i) / N; q[i ? 'lineTo' : 'moveTo'](...P(cx + v, yAt(v) - th)); }
  q.quadraticCurveTo(...P(cx + hw + 4.5, cy), ...P(cx + hw, yAt(hw) + th));
  for (let i = N; i >= 0; i--) { const v = -hw + (2 * hw * i) / N; q.lineTo(...P(cx + v, yAt(v) + th)); }
  q.quadraticCurveTo(...P(cx - hw - 4.5, cy), ...P(cx - hw, yAt(-hw) - th));
  q.closePath();
  const [, y0] = P(cx, cy - th), [, y1] = P(cx, cy + sag + th);
  c.fillStyle = swGrad(c, 0, y0, 0, y1, SN.gold);
  c.fill(q);
  c.save();
  c.clip(q);
  // เงาปลายห่วงสองข้าง (ด้านที่อ้อมไปหลังขา) + เส้นแสงตามขอบบน
  const [ex0] = P(cx - hw, cy), [ex1] = P(cx + hw, cy);
  const sg = c.createLinearGradient(ex0, 0, ex1, 0);
  sg.addColorStop(0, 'rgba(150,95,30,.35)');
  sg.addColorStop(0.2, 'rgba(150,95,30,0)');
  sg.addColorStop(0.8, 'rgba(150,95,30,0)');
  sg.addColorStop(1, 'rgba(150,95,30,.35)');
  c.fillStyle = sg;
  c.fillRect(ex0 - 10, y0 - 10, ex1 - ex0 + 20, y1 - y0 + 20);
  c.strokeStyle = 'rgba(255,255,255,.85)';
  c.lineWidth = 1.5;
  c.beginPath();
  for (let i = 1; i < N; i++) { const v = -hw * 0.8 + (1.6 * hw * i) / N; c[i > 1 ? 'lineTo' : 'moveTo'](...P(cx + v, yAt(v) - th * 0.35)); }
  c.stroke();
  c.restore();
  outline(c, q, pal, SNO * 0.7);
  if (k.back) return;
  const [gx, gy] = P(cx, yAt(0));
  snDiamond(c, gx, gy, 3.6, 9.5, pal, SN.crystalB, { w: 0.9 * SNK });
  const vd = (left ? -1 : 1) * hw * 0.55;
  const [dx, dy] = P(cx + vd, yAt(vd) + th);
  snDrop(c, dx, dy + 4.5, 3.4, pal, SN.crystal);
}

// ── คทาราชินีน้ำแข็ง (ของถือ) ──
/** ระยะจากด้ามถึงกลางหัวดาวคริสตัล */
const SN_WAND_HEAD = 192;
const snWandHead = (x, y, a, sc = 1) => [x + Math.sin(a) * SN_WAND_HEAD * sc, y - Math.cos(a) * SN_WAND_HEAD * sc];
/**
 * คทาที่ด้าม (x,y) มุม a: ด้ามเงินขัดเงา ปลอกทองสองวง เกลียวทองช่วงบน ปลายล่างแหลมมีหยดคริสตัล
 * หัว: ดาวคริสตัลแปดแฉก เม็ดน้ำเงินกลาง · ม้วนทองรองใต้ดาว · หยดคริสตัลสามเม็ดห้อยแกว่ง · วงแหวนเวทบาง ๆ หลังหัวหมุนช้า
 * lit = เรืองเต็ม (ลอย) · sc = ขนาด · form 0..1 = กำลังก่อตัว (ด้ามยืดจากมือ → ดาวประกอบตัว)
 */
function snWandDraw(c, x, y, a, pal, t, lit, sc = 1, form = 1) {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  if (sc !== 1) c.scale(sc, sc);
  const HY = -SN_WAND_HEAD, top = -142, bot = 98;
  const hk = form >= 1 ? 1 : KE.back(clamp01((form - 0.62) / 0.38));
  if (hk > 0.01) {
    glowAt(c, 0, HY, (96 + 12 * Math.sin(t * 0.06)) * hk, '87,216,245', 0.26 + 0.2 * lit);
    // วงแหวนเวทบาง ๆ ลอยหลังหัว (สองเส้น ทอง/ฟ้า + ขีดอักษรเวทหมุน)
    c.save();
    c.globalAlpha *= hk;
    c.translate(0, HY);
    c.strokeStyle = 'rgba(244,213,141,.9)';
    c.lineWidth = 1.6;
    c.beginPath(); c.arc(0, 0, 60, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(87,216,245,.7)';
    c.lineWidth = 1.1;
    c.beginPath(); c.arc(0, 0, 66, 0, TAU); c.stroke();
    c.rotate(t * 0.01);
    c.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 12; i++) {
      const an = (i * TAU) / 12;
      c.save(); c.rotate(an); c.fillRect(-0.9, -66, 1.8, i % 3 ? 4 : 8); c.restore();
    }
    c.restore();
  }
  const shaftTop = bot + (top - bot) * clamp01(form / 0.62);
  if (form > 0.01) {
    c.save();
    const cl = new Path2D();
    cl.rect(-40, shaftTop - 2, 80, bot - shaftTop + 40);
    c.clip(cl);
    const st = new Path2D();
    st.moveTo(-5.5, top);
    st.lineTo(5.5, top);
    st.lineTo(5, bot - 6);
    st.lineTo(0, bot + 10);
    st.lineTo(-5, bot - 6);
    st.closePath();
    const sg = c.createLinearGradient(-5.5, 0, 5.5, 0);
    sg.addColorStop(0, SN.silver[2]);
    sg.addColorStop(0.3, '#FFFFFF');
    sg.addColorStop(0.65, SN.silver[1]);
    sg.addColorStop(1, '#8EA0BC');
    c.fillStyle = sg;
    c.fill(st);
    c.save();
    c.clip(st);
    // เกลียวทองช่วงบน
    c.lineCap = 'round';
    for (let yy = top; yy < top + 54; yy += 13) {
      c.strokeStyle = SN.gold[2];
      c.lineWidth = 4;
      c.beginPath(); c.moveTo(-8, yy); c.lineTo(8, yy + 7); c.stroke();
      c.strokeStyle = SN.gold[0];
      c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(-8, yy - 1.2); c.lineTo(8, yy + 5.8); c.stroke();
    }
    c.restore();
    outline(c, st, pal, SNO * 0.75);
    for (const ry of [-28, 34]) {
      const ring = new Path2D();
      ring.roundRect(-8, ry - 4, 16, 8, 4);
      c.fillStyle = swGrad(c, 0, ry - 4, 0, ry + 4, SN.gold);
      c.fill(ring);
      outline(c, ring, pal, SNO * 0.6);
    }
    snDrop(c, 0, bot + 14, 5, pal, SN.crystal);
    c.restore();
  }
  if (hk > 0.01) {
    c.save();
    c.translate(0, HY);
    c.scale(hk, hk);
    c.translate(0, -HY);
    // หยดคริสตัลสามเม็ดห้อยใต้ดาว (แกว่ง)
    for (const [dx, len, ph] of [[-22, 30, 0], [0, 40, 1.3], [22, 30, 2.6]]) {
      const swg = Math.sin(t * 0.07 + ph) * 0.12;
      const ex = dx + Math.sin(swg) * len, ey = HY + 18 + Math.cos(swg) * len;
      snChain(c, [[dx, HY + 18], [ex, ey - 4]], 4, 1.3);
      snDrop(c, ex, ey + 2, 4, pal, ph > 1 ? SN.crystalB : SN.crystal);
    }
    // ม้วนทองรองใต้ดาว + ลูกทองหัวด้าม
    c.lineCap = 'round';
    for (const [col, w] of [[pal.line, 7.4 * SNK + 2.4], [SN.gold[2], 4.6], [SN.gold[1], 2.8], ['rgba(255,255,255,.7)', 0.8]]) {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath();
      for (const d of [-1, 1]) {
        c.moveTo(0, top + 2);
        c.bezierCurveTo(d * 10, top - 10, d * 34, top - 6, d * 40, HY + 22);
        c.quadraticCurveTo(d * 44, HY + 8, d * 32, HY + 10);
      }
      c.stroke();
    }
    const orb = new Path2D();
    orb.arc(0, top - 4, 7, 0, TAU);
    swBlob(c, orb, swGrad(c, -6, top - 10, 6, top + 2, SN.gold), pal, SNO * 0.6);
    snStar8(c, 0, HY, 46, pal, t, { rot: Math.sin(t * 0.02) * 0.06 });
    c.restore();
    // อนุภาคน้ำแข็งหมุนรอบหัวคทา
    for (let i = 0; i < 4; i++) {
      const an = t * 0.05 + (i * TAU) / 4;
      const px = Math.cos(an) * 76, py = HY + Math.sin(an) * 22 + Math.sin(t * 0.05 + i) * 6;
      if (i % 2) snFlake(c, px, py, 4.5 * hk, an, 0.9);
      else snSparkle(c, px, py, (5 + 2 * Math.sin(t * 0.1 + i)) * hk, 0.9);
    }
  }
  c.restore();
}
/**
 * คทา (ของถือ): ถือในอุ้งเท้าซ้ายจอทุกมุม · อุ้งเท้าไม่ว่าง/นั่ง/หมอบ = ลอยเรืองข้างตัว · หางอยู่หลังมือกับคทาเสมอ
 * k.layer 'front' = เฉพาะท่าเปิดตัว (คริสตัลบินมาประกอบหัวคทา · แสงชาร์จ · คลื่นตอนเคาะ)
 */
function snowWand(c, k) {
  const pal = k.pal, t = k.t || 0;
  const b = ease(clamp01(k.busy ?? 1));
  const side = -1;
  const bob = Math.sin(t * 0.05) * 7;
  const fx = 70, fy = 476 + (k.drop || 0) * 0.55 + bob;
  const fa = side * (0.16 + Math.sin(t * 0.035) * 0.05);
  const g = k.grip;
  const ha = g ? side * 0.3 - (g.d || 0) * 0.3 : fa;
  let x = g ? g.x + (fx - g.x) * b : fx, y = g ? g.y + (fy - g.y) * b : fy;
  let a = g ? ha + (fa - ha) * b : fa;
  // ชูคทาสูง (staffUp: จับต่ำลงบนด้าม คทาตั้งตรงขึ้น) · ปัดคทา (sweep: เหวี่ยงหัวคทาออกนอกตัว ไม่ผ่านหน้า)
  if (g && k.sv) {
    const hb = 1 - b, su = k.sv('staffUp') * hb, swp = k.sv('sweep') * hb;
    a += -a * 0.45 * su - 0.95 * swp;
    x += Math.sin(a) * 52 * su;
    y -= Math.cos(a) * 52 * su;
  }
  const lit = g ? b : 1;
  const ii = k.intro != null && !(k.introSkip > 0) ? k.intro : null;
  if (k.layer === 'front') {
    if (ii != null) snowWandIntro(c, k, ii, x, y, a);
    return;
  }
  if (ii != null) {
    if (ii < SNI.show) return;
    const [hx, hy] = snWandHead(x, y, a);
    const q = c.getTransform().transformPoint(new DOMPoint(hx, hy));
    SN_HIT = [q.x, q.y];
  }
  snWandDraw(c, x, y, a, pal, t, lit, 1, 1);
}

// ── เอฟเฟกต์ (ชุดใหม่ ไม่ซ้ำ sweet: ไม่มีวงโคจรของลอย ริบบิ้นวน ลำแสงหมุน วงเวทบนพื้น) ──
/** ท่าเปิดตัว: ความชัดของเอฟเฟกต์ประจำชุด — ผุดขึ้นตอนน้ำแข็งบนจอแตก (SNI.shatter) · กดข้าม = ขึ้นเต็มตามการข้าม */
function snIntroVis(k) {
  if (k.intro == null) return { aura: 1, aurora: 1, halo: 1, floor: 1, crystals: 1, snow: 1, steps: 1 };
  const f = k.intro, s = k.introSkip || 0;
  const v = (a, b) => Math.max(s, clamp01((f - a) / (b - a)));
  const S = SNI.shatter;
  return {
    aura: Math.max(0.45 * v(SNI.show - 4, SNI.show + 30), v(S, S + 30)),
    aurora: v(S - 4, S + 30), halo: v(S + 4, S + 30), floor: v(S, S + 24), crystals: v(S + 6, S + 46), snow: v(S, S + 50), steps: v(SNI.dur - 30, SNI.dur),
  };
}
/** วงแหวนเวทน้ำแข็งลอยหลังตัว (วงกลมตั้ง): เส้นฟ้า + เส้นทองด้านใน + เส้นขาวด้านนอก แสงรองใต้เส้น · เพชรจิ๋วสิบสองเม็ดหมุนช้า */
function snHalo(c, t, vis, lite) {
  if (vis <= 0.01) return;
  const R = 238 * (0.72 + 0.28 * KE.out(Math.min(1, vis))), cx = 300, cy = 386;
  c.save();
  c.globalAlpha *= Math.min(1, vis);
  c.translate(cx, cy);
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = 'rgba(87,216,245,.24)';
  c.lineWidth = 16;
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
  c.globalCompositeOperation = 'source-over';
  const mp = 0.8 + 0.2 * Math.sin(t * 0.05);
  c.strokeStyle = `rgba(95,185,245,${0.85 * mp})`;
  c.lineWidth = 3;
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
  c.strokeStyle = `rgba(230,190,110,${0.9 * mp})`;
  c.lineWidth = 1.6;
  c.beginPath(); c.arc(0, 0, R - 11, 0, TAU); c.stroke();
  c.strokeStyle = `rgba(255,255,255,${0.85 * mp})`;
  c.lineWidth = 1.3;
  c.beginPath(); c.arc(0, 0, R + 9, 0, TAU); c.stroke();
  if (!lite) {
    c.rotate(t * 0.004);
    for (let i = 0; i < 12; i++) {
      const an = (i * TAU) / 12;
      c.save();
      c.rotate(an);
      c.translate(0, -R);
      c.fillStyle = i % 3 ? 'rgba(255,255,255,.95)' : 'rgba(87,216,245,.95)';
      const s = i % 3 ? 5 : 8;
      c.beginPath(); c.moveTo(0, -s * 1.5); c.lineTo(s * 0.6, 0); c.lineTo(0, s * 1.5); c.lineTo(-s * 0.6, 0); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.8)';
      c.fillRect(-0.8, 8, 1.6, 6);
      c.restore();
    }
  }
  c.restore();
}
/**
 * พื้นน้ำแข็งเงาใต้เท้า ("ทุกย่างก้าวกลายเป็นทางคริสตัล"): แผ่นน้ำแข็งใสเรืองฟ้า แสงสะท้อนเฉียงเลื่อนช้า ขอบฝ้าน้ำแข็งแตกกิ่ง
 * กอคริสตัลบนพื้นสองข้าง (โตขึ้นตาม vis) — วาดก่อนตัว (เป็นพื้น)
 */
function snIceFloor(c, t, vis, lite, pal) {
  if (vis <= 0.01) return;
  const gv = vis >= 1 ? 1 : KE.out(vis);
  const R = 272 * gv;
  c.save();
  c.translate(300, 646);
  c.scale(1, 0.2);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, 'rgba(240,252,255,.78)');
  g.addColorStop(0.55, 'rgba(175,228,255,.5)');
  g.addColorStop(0.9, 'rgba(120,200,250,.38)');
  g.addColorStop(1, 'rgba(120,200,250,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
  c.save();
  c.beginPath(); c.arc(0, 0, R * 0.96, 0, TAU); c.clip();
  c.fillStyle = 'rgba(255,255,255,.32)';
  for (let i = 0; i < 3; i++) {
    const x = ((t * 1.1 + i * 240) % 720) - 360;
    c.beginPath(); c.moveTo(x, -R); c.lineTo(x + 46, -R); c.lineTo(x - 30, R); c.lineTo(x - 76, R); c.closePath(); c.fill();
  }
  c.restore();
  if (!lite) {
    // ฝ้าน้ำแข็งแตกกิ่งรอบขอบ
    c.lineCap = 'round';
    for (const [col, w] of [['rgba(87,190,245,.5)', 5], ['rgba(255,255,255,.9)', 2.2]]) {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath();
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * TAU + 0.12, ux = Math.cos(a), uy = Math.sin(a);
        const r0 = R * 0.86, l = (22 + hash(i + 330) * 22) * gv;
        c.moveTo(ux * r0, uy * r0);
        c.lineTo(ux * (r0 + l), uy * (r0 + l));
        for (const s of [-1, 1]) {
          const ba = a + s * 0.5, p = r0 + l * 0.5;
          c.moveTo(ux * p, uy * p);
          c.lineTo(ux * p + Math.cos(ba) * l * 0.45, uy * p + Math.sin(ba) * l * 0.45);
        }
      }
      c.stroke();
    }
  }
  c.restore();
  // กอคริสตัลบนพื้นสองข้าง
  for (const [cx, cy, list] of [[92, 642, [[0, 50, -0.22], [17, 32, 0.24], [-15, 24, -0.62]]], [508, 640, [[0, 56, 0.2], [-17, 34, -0.22], [16, 24, 0.6]]]]) {
    list.forEach(([dx, len, ang], i) => {
      snShard(c, cx + dx, cy, len * gv, 9 + (i ? 0 : 2), ang, pal, { cols: i % 2 ? SN.crystalB : SN.crystal, w: 1.6 * SNK });
    });
    const gl = Math.sin(t * 0.08 + cx);
    if (gl > 0.3 && gv > 0.6) snSparkle(c, cx + 2, cy - 44 * gv, (12 * (gl - 0.3)) / 0.7 + 2, 1);
  }
}
/** รอยเท้าน้ำแข็งบาน: ทุก ~1.7 วิ ดอกน้ำแข็งแบนบนพื้นบานใต้เท้าซ้าย/ขวาสลับกัน แล้วจาง (บนพื้น หลังตัว) */
function snFrostSteps(c, t, vis) {
  if (vis <= 0.01) return;
  const T = t / 60, n = Math.floor(T / 1.7), u = (T - n * 1.7) / 1.3;
  if (u >= 1) return;
  const x = n % 2 ? 392 : 208, gr = KE.out(Math.min(1, u * 1.6)), al = (1 - u) * vis;
  c.save();
  c.translate(x, 648);
  c.scale(1, 0.32);
  c.globalAlpha *= al;
  c.lineCap = 'round';
  for (const [col, w] of [['rgba(87,190,245,.7)', 5], ['rgba(255,255,255,.95)', 2]]) {
    c.strokeStyle = col;
    c.lineWidth = w;
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6 + n, ux = Math.cos(a), uy = Math.sin(a), L = 46 * gr;
      c.moveTo(0, 0);
      c.lineTo(ux * L, uy * L);
      for (const s of [-1, 1]) {
        const ba = a + s * 0.7;
        c.moveTo(ux * L * 0.55, uy * L * 0.55);
        c.lineTo(ux * L * 0.55 + Math.cos(ba) * L * 0.32, uy * L * 0.55 + Math.sin(ba) * L * 0.32);
      }
    }
    c.stroke();
  }
  c.restore();
  snSparkle(c, x, 640, 8 * (1 - u), al);
}
/** เกล็ดหิมะคริสตัลลอยรอบตัว (ตำแหน่งคงที่ ลอยขึ้นลง หมุนช้า) — [x, y, รัศมี] · ไม่ทับตัว/คทา */
const SN_FLOAT = [[-30, 392, 25], [626, 300, 28], [14, 566, 20], [596, 528, 22], [118, 104, 17], [486, 92, 18]];
/** สีเกล็ดหิมะลอย: ฟ้าอ่อนใส (ขาว → ฟ้าน้ำแข็ง → ฟ้าสด) */
const SN_FLAKE_COLS = ['#F4FBFF', '#8ED3FF', '#3D9BF0'];
/**
 * เกล็ดหิมะคริสตัลฟ้าระยิบระยับ: แสงฟ้าเรืองหลังเกล็ด (หายใจเข้า-ออก) · เกล็ดหกแฉกเจียระไน เม็ดน้ำเงินกลาง
 * · ประกายวิ้งที่ปลายแฉกสองแฉกสลับจังหวะ · ผงประกายจิ๋วลอยวนรอบเกล็ด
 */
function snSparkleFlake(c, x, y, r, rot, pal, t, ph = 0) {
  glowAt(c, x, y, r * 2.6, '110,195,255', 0.4 + 0.15 * Math.sin(t * 0.07 + ph));
  snFlakeShape(c, x, y, r, pal, { t: t + ph * 40, rot, gemR: 0.24, cols: SN_FLAKE_COLS, gemCols: SN.crystalB, lineCol: '#2E62C4', w: Math.max(1, r * 0.06) * SNK });
  for (let j = 0; j < 2; j++) {
    const arm = (Math.round(ph * 3) + j * 3) % 6;
    const a = rot - Math.PI / 2 + (arm * TAU) / 6;
    const tw = Math.max(0, Math.sin(t * 0.11 + ph * 1.9 + j * 2.6));
    if (tw > 0.05) snSparkle(c, x + Math.cos(a) * r * 0.98, y + Math.sin(a) * r * 0.98, r * 0.55 * tw + 1.5, tw);
  }
  for (let j = 0; j < 3; j++) {
    const an = t * 0.05 + ph + (j * TAU) / 3;
    c.fillStyle = `rgba(255,255,255,${0.55 + 0.4 * Math.sin(t * 0.13 + j * 2 + ph)})`;
    c.beginPath(); c.arc(x + Math.cos(an) * r * 1.35, y + Math.sin(an) * r * 0.55, 1.6, 0, TAU); c.fill();
  }
}
function snFloatFlakes(c, t, vis, pal) {
  if (vis <= 0.01) return;
  SN_FLOAT.forEach(([x0, y0, r], i) => {
    const pop = vis >= 1 ? 1 : KE.back(clamp01(vis * 1.6 - i * 0.1));
    if (pop <= 0.01) return;
    const y = y0 + Math.sin(t * 0.04 + i * 1.3) * 10;
    const rot = t * 0.006 * (i % 2 ? 1 : -1) + i * 0.7;
    c.save();
    c.translate(x0, y);
    c.scale(pop, pop);
    snSparkleFlake(c, 0, 0, r, rot, pal, t, i);
    c.restore();
  });
}
/**
 * หลังตัว (ด้านหน้า): แสงฟ้าฟุ้ง → แสงเหนือ → วงแหวนเวท → พื้นน้ำแข็ง + รอยเท้าบาน → คริสตัลลอย → หิมะฝั่งหลัง → ผ้าคลุม (ด้านในซับน้ำเงิน)
 * ด้านหลัง (k.back): เหมือนกันแต่ไม่วาดผ้าคลุม (ผ้าคลุมทับหลังวาดที่ snowBackCape)
 */
function snowAura(c, k) {
  const t = k.t || 0, pal = k.pal;
  const V = snIntroVis(k);
  const lite = gfxLevel() === 'save';   // ประหยัด: ตัดแสงเหนือ อักษรเวทบนวงแหวน ฝ้าขอบพื้น
  const pulse = 1 + 0.06 * Math.sin(t * 0.05);
  if (V.aura > 0.01) {
    c.save();
    c.globalAlpha *= V.aura;
    glowAt(c, 300, 430, 330 * pulse, '87,190,245', 0.36);
    glowAt(c, 300, 480, 230, '120,140,240', 0.2);
    glowAt(c, 300, 330, 180, '245,252,255', 0.34);
    c.restore();
  }
  if (!lite) snAurora(c, t, V.aurora);
  snHalo(c, t, V.halo, lite);
  snIceFloor(c, t, V.floor, lite, pal);
  snFrostSteps(c, t, V.steps * V.floor);
  snFloatFlakes(c, t, V.crystals, pal);
  snSnow(c, t, V.snow, false, lite);
  if (!k.back) snowCapeLining(c, k);
}
/**
 * อุ้งเท้าขวาเสกน้ำแข็ง (ท่าโพส/ท่าแอ็ค ช่อง orb): จานเวทเอียงรอบมือ (สองเส้น ฟ้า/ทอง ขีดอักษรหมุน) ·
 * เกล็ดหิมะคริสตัลหมุนกลางวง เต้นตามจังหวะ · คริสตัลจิ๋วสามชิ้นโคจรบนจาน · เกลียวลมหนาวสองเส้นหมุนขึ้น ·
 * ทุก ~4.3 วิ เวทพุ่ง (คู่กับจังหวะยื่นอุ้งเท้าใน SNOW_ACT) เกล็ดหิมะจิ๋วพุ่งออกขวาบน · ผงประกายลอยขึ้น
 */
function snIceConjure(c, t, a, pal) {
  if (a <= 0.01) return;
  // อยู่ข้างปลายอุ้งเท้าขวา (ยก tada ~0.7 ปลายอุ้งเท้าอยู่ราว (493, 421)) — พ้นหน้าและจุดหนวด
  const T = t / 60, x = 532 + Math.sin(t * 0.03) * 3, y = 402 + Math.sin(t * 0.05) * 4;
  const sc = a >= 1 ? 1 : KE.back(a);
  const pt = T % 4.3, pulse = kenv(pt, 3.3, 3.42, 3.55, 3.95);
  c.save();
  c.globalAlpha *= Math.min(1, a);
  glowAt(c, x, y - 10, (78 + 18 * pulse) * sc, '120,205,255', 0.45 + 0.25 * pulse);
  // ลำประกายพุ่งขึ้นจากมือ (แสงเวทโปร่ง ๆ)
  c.save();
  c.globalCompositeOperation = 'lighter';
  const lg = c.createLinearGradient(0, y + 10, 0, y - 110);
  lg.addColorStop(0, `rgba(150,220,255,${0.32 * sc})`);
  lg.addColorStop(1, 'rgba(150,220,255,0)');
  c.fillStyle = lg;
  c.beginPath(); c.moveTo(x - 16 * sc, y + 10); c.lineTo(x - 30 * sc, y - 110); c.lineTo(x + 30 * sc, y - 110); c.lineTo(x + 16 * sc, y + 10); c.closePath(); c.fill();
  c.restore();
  // วงเวทชั้นบน (เล็กกว่า หมุนสวนทาง) ลอยเหนือเกล็ด
  c.save();
  c.translate(x + 4, y - 40 * sc);
  c.rotate(-0.35);
  c.scale(1, 0.38);
  c.strokeStyle = 'rgba(190,235,255,.9)';
  c.lineWidth = 1.8;
  c.beginPath(); c.arc(0, 0, 26 * sc, 0, TAU); c.stroke();
  c.rotate(-t * 0.05);
  c.fillStyle = 'rgba(255,255,255,.95)';
  for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); c.fillRect(-1, -26 * sc - 2, 2, 5); }
  c.restore();
  const ct = Math.cos(-0.35), st = Math.sin(-0.35), R = 46 * sc;
  const ringPt = (an, r = R) => { const ex = Math.cos(an) * r, ey = Math.sin(an) * r * 0.38; return [x + ex * ct - ey * st, y + 8 + ex * st + ey * ct]; };
  c.save();
  c.translate(x, y + 8);
  c.rotate(-0.35);
  c.scale(1, 0.38);
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = 'rgba(87,216,245,.35)';
  c.lineWidth = 9;
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
  c.globalCompositeOperation = 'source-over';
  c.strokeStyle = 'rgba(90,185,250,.95)';
  c.lineWidth = 2.4;
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
  c.strokeStyle = 'rgba(232,190,110,.95)';
  c.lineWidth = 1.4;
  c.beginPath(); c.arc(0, 0, R * 0.8, 0, TAU); c.stroke();
  c.rotate(t * 0.03);
  c.fillStyle = 'rgba(255,255,255,.95)';
  for (let i = 0; i < 10; i++) { c.rotate(TAU / 10); c.fillRect(-1, -R - 2, 2, i % 2 ? 4 : 7); }
  c.restore();
  // เกลียวลมหนาวหมุนขึ้นรอบเกล็ด
  c.lineCap = 'round';
  for (let b = 0; b < 2; b++) {
    c.strokeStyle = `rgba(255,255,255,${0.6 * sc})`;
    c.lineWidth = 2.2;
    c.beginPath();
    for (let j = 0; j <= 16; j++) {
      const an = t * 0.08 + b * Math.PI + j * 0.33, r = (10 + j * 2.1) * sc;
      const px = x + Math.cos(an) * r, py = y + Math.sin(an) * r * 0.7 - j * 0.9;
      if (j) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.stroke();
  }
  // คริสตัลจิ๋วโคจรบนจานเวท (หลังเกล็ดก่อน)
  const kites = [0, 1, 2].map((i) => t * 0.05 + (i * TAU) / 3);
  for (const an of kites) if (Math.sin(an) < 0) { const [kx, ky] = ringPt(an); snKite(c, kx, ky, 15 * sc, 4.4 * sc, an - 0.35, pal, SN.crystal, 1.2 * SNK); }
  snSparkleFlake(c, x, y - 12 * sc, (18 + 3 * pulse) * sc, t * 0.03, pal, t, 2);
  for (const an of kites) if (Math.sin(an) >= 0) { const [kx, ky] = ringPt(an); snKite(c, kx, ky, 15 * sc, 4.4 * sc, an - 0.35, pal, SN.crystalB, 1.2 * SNK); }
  // เวทพุ่ง: เกล็ดหิมะจิ๋วพุ่งออกขวาบน
  if (pt > 3.3 && pt < 4.1) {
    const pr = (pt - 3.3) / 0.8;
    for (let i = 0; i < 6; i++) {
      const an = -1.2 + i * 0.3, dist = KE.out(pr) * 96;
      snFlake(c, x + Math.cos(an) * dist, y + Math.sin(an) * dist, 4.2, pr * 3 + i, 1 - pr);
    }
  }
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.012 + i / 3) % 1;
    snSparkle(c, x + Math.sin(p * 6 + i) * 12, y - 22 - p * 52, 4 * (1 - p) + 1, 1 - p, i % 2 ? '#BFF1FF' : '#FFFFFF');
  }
  c.restore();
}
/** หน้าตัว: หิมะสองข้างตัว · เกล็ดหิมะลอยเหนืออุ้งเท้า (ช่อง orb ของท่า) · ประกายระยิบข้างตัว */
function snowFront(c, k) {
  const t = k.t || 0, pal = k.pal;
  const V = snIntroVis(k);
  snSnow(c, t, V.snow, true, gfxLevel() === 'save');
  if (k.sv && !k.back) snIceConjure(c, t, k.sv('orb'), pal);
  for (let i = 0; i < 6; i++) {
    const s = i % 2 ? 1 : -1;
    const x = 300 + s * (210 + hash(i + 360) * 80), y = 170 + hash(i + 370) * 420;
    const a = Math.max(0, Math.sin(t * 0.09 + i * 2.1)) * V.aura;
    snSparkle(c, x, y, 5 + hash(i + 380) * 5, a, i % 3 ? '#FFFFFF' : '#BFF1FF');
  }
}

// ══ ท่าเปิดตัว + ท่าแอ็ค ขององค์หญิงหิมะ (รอบสาม · ~7.2 วิ · มีกล้องแบบตัดต่อคลิป) — ตามสตอรีของผู้ใช้ ══
//   0.0  ทั้งจอมีน้ำแข็งเกาะ (ฝ้าลายเฟิร์นงอกจากขอบจอ) · ค่ำคืนหน้าหนาว · กล้องเงยมองฟ้า
//   0.2  เกล็ดหิมะคริสตัลหกดวง (ของประดับประจำชุด) ค่อย ๆ ลอยลงจากฟ้า ส่ายเหมือนใบไม้ — กล้องแพนตามลงมา
//   1.7  เกล็ดหิมะหมุนวนเข้ากลาง รวมเป็นดอกน้ำแข็งตูม เต้นตุบ ๆ
//   2.4  "ปริ๊ง" ดอกน้ำแข็งบานกระจายเป็นเกล็ดวิ้ง ๆ เจ้าหญิงปรากฏ (หลับตายิ้ม) ลอยลงแตะพื้นนุ่ม ๆ — กล้องดันเข้า
//   3.1  ลืมตาเป็นประกาย → เห็นน้ำแข็งเกาะจอ มองซ้ายบน-ขวาบน เอียงหัวสงสัย — กล้องโคลสอัพหน้า
//   3.8  ชูคทา (กล้องถอยออก) → วงเวทก่อตัวหน้าหัวคทา ชาร์จแสง → ยิงเวทพุ่งเข้าหาจอ
//   4.4  จอร้าวจากจุดที่เวทกระทบ → แตกกระจาย เศษน้ำแข็งพุ่งเข้าหากล้อง (กล้องสั่น) ฉากสว่าง เอฟเฟกต์ประจำชุดผุดขึ้น
//   4.9  กระโดดดีใจกางแขน → ปัดคทาเป็นโค้งหิมะ (กล้องเลื่อน-เอียงตาม)
//   5.9  ท่าโพสใหม่: ชูคทาสูง อุ้งเท้าขวาเสกน้ำแข็ง (เกล็ดหิมะหมุนในวงเวท) ขยิบตา → ท่าแอ็ค (กล้องคืนที่)
const SNI = {
  fall0: 12, fall1: 104, bloom: 146, show: 144, land: 182,
  open: 186, notice: 200, raise: 230, aim: 246, cast: 262, crack: 266, shatter: 282,
  hop: 292, sweep: 318, sweepEnd: 346, pose: 352, conjure: 368, wink: 390, dur: 432,
};
/** ปัดคทา ณ เฟรม f: 0 → 1 → 0 แบบนุ่มทั้งต้นและปลาย (ใช้ทั้งรูปร่างตัวและรอยแสงตามหัวคทา) */
const snSweepAt = (f) => { const u = clamp01((f - SNI.sweep) / (SNI.sweepEnd - SNI.sweep)); return (1 - Math.cos(TAU * u)) / 2; };
/** จุดที่เวทกระทบจอ (พิกัดพิกเซลของผ้าใบ) — คทาชั้นหลังบันทึกทุกเฟรม ฝ้าบนจอใช้เป็นจุดเริ่มรอยร้าว */
let SN_HIT = null;
/**
 * ท่าแอ็ค (ยืนค้างหน้าล็อบบี้ได้): ชูคทาสูง (staffUp) · อุ้งเท้าขวาเสกน้ำแข็ง (orb → เกล็ดหิมะหมุนในวงเวท snIceConjure)
 * มีชีวิต: มองค้าง-กระตุก · เป็นพัก ๆ หันไปมองน้ำแข็งที่เสก · ทุก ~4.3 วิ ยื่นอุ้งเท้าเสกแรงขึ้น (เวทพุ่ง) · หันมาขยิบตา
 */
const SNOW_ACT = {
  shape(t) {
    const T = t / 60;
    const L = swLife(t);
    const g = swGlance(T, 3.8);
    const cy = T % 8.6;
    const look = kenv(cy, 0.8, 1.1, 2.6, 2.9);
    const wk = kenv(cy, 6.6, 6.8, 7.5, 7.7);
    const push = kenv(T % 4.3, 3.2, 3.4, 3.5, 3.9);
    return {
      raiseL: 0.97,
      staffUp: 1,
      tada: 0.72 + push * 0.12 + Math.sin(T * 1.4) * 0.03,
      orb: 1,
      tilt: 0.07 + Math.sin(T * 0.8) * 0.02 + L.tilt + look * 0.07,
      lean: Math.sin(T * 0.5) * 0.01 + L.lean + push * 0.012,
      sx: push * 0.012,
      sy: -push * 0.02,
      ear: -0.1 + L.ear - kenv(cy, 6.85, 6.92, 7.0, 7.2) * 0.25,
      winkCute: cy > 6.9 && cy < 7.45 ? 1 : 0,
      mouth: 0.24 + look * 0.1 + push * 0.12,
      gaze: (g.x * (1 - look) + 0.45 * look) * (1 - wk),
      gazeY: (g.y * (1 - look) - 0.2 * look) * (1 - wk),
      wag: 0.5 + Math.sin(T * 1.6) * 0.5,
    };
  },
};
function snowIntroStage(f) {
  return f < SNI.show ? 'hidden' : 'show';
}
/** รูปร่างตัว ณ เฟรม f ของท่าเปิดตัว (t = เวลาของเกม ใช้ตอนไหลเข้าท่าแอ็คท้ายท่า) */
function snowIntroShape(f, t) {
  const A = SNI, L = swLife(t, 0.6);   // เวลาจริง (ท่าเปิดตัวถูกยืดเวลา — ตัวขยับเล็ก ๆ ความเร็วปกติ ไม่ดูเป็นสโลว์)
  // ปรากฏ: โตจากเล็กนิด ๆ แบบนุ่ม ลอยอยู่แล้วค่อย ๆ ลงแตะพื้น ยุบรับน้ำหนักเบา ๆ
  const grow = ktrack(f, [[A.show, -0.22], [A.show + 18, 0.02, KE.out], [A.show + 30, 0]]);
  const landSq = kenv(f, A.land - 3, A.land, A.land + 2, A.land + 14);
  // เห็นน้ำแข็งเกาะจอ: มองซ้ายบน → ขวาบน → กลาง (ค้าง-กระตุก) หัวเอียงตามที่มอง
  const N = A.notice;
  const lookX = ktrack(f, [[N, 0], [N + 5, -0.42, KE.out], [N + 13, -0.42], [N + 17, 0.42, KE.out], [N + 24, 0.42], [N + 28, 0, KE.out]]);
  const lookY = ktrack(f, [[N, 0], [N + 5, -0.32, KE.out], [N + 24, -0.32], [N + 28, -0.12, KE.out]]);
  const curious = kenv(f, N, N + 6, A.raise - 2, A.raise + 6);
  // หัวเอียงตามที่มองแต่ช้ากว่าตา (ตาไวกระตุก หัวตามนุ่ม ๆ)
  const lookTilt = ktrack(f, [[N, 0], [N + 9, -0.42], [N + 14, -0.42], [N + 24, 0.42], [N + 28, 0.42], [N + 36, 0]]);
  // ชูคทา → เล็ง (ย่อรวมพลัง) → ยิง (ยืดพุ่ง) → ดูจอแตก
  const aimK = kenv(f, A.aim - 2, A.aim + 6, A.cast - 2, A.cast + 2);
  const castK = ktrack(f, [[A.cast - 2, 0], [A.cast + 2, 1], [A.cast + 16, 0]]);
  const flash = kenv(f, A.shatter - 1, A.shatter + 2, A.shatter + 6, A.shatter + 12);
  // กระโดดดีใจกางแขน (ย่อ → พุ่ง → ลอย → ยุบตอนแตะพื้น)
  const H = A.hop;
  const hopL = ktrack(f, [[H + 4, 0], [H + 14, 11, KE.out], [H + 24, 0, KE.in]]);
  const hopSq = ktrack(f, [[H - 2, 0], [H + 3, -0.06], [H + 7, 0.06], [H + 12, 0], [H + 22, 0], [H + 25, -0.07], [H + 34, 0]]);
  const tadaHop = ktrack(f, [[H - 2, 0], [H + 10, 0.9], [H + 20, 0.9], [H + 32, 0]]);
  const sweep = snSweepAt(f);
  const P = A.pose;
  const poseK = ktrack(f, [[P, 0], [P + 18, 1]]);
  const conjLook = kenv(f, A.conjure - 4, A.conjure + 4, A.wink - 8, A.wink - 2);
  const s = {
    lift: ktrack(f, [[A.show, 8], [A.land, 0]]) + hopL,
    sx: grow + landSq * 0.04 - hopSq * 0.5 - aimK * -0.015,
    sy: grow - landSq * 0.06 + hopSq + castK * 0.035 - aimK * 0.02,
    raiseL: ktrack(f, [[A.raise, 0], [A.raise + 14, 1], [P, 1], [P + 18, 0.97]]),
    staffUp: ktrack(f, [[A.raise, 0], [A.raise + 16, 0.6], [P, 0.6], [P + 18, 1]]),
    sweep,
    tada: Math.max(tadaHop, 0.72 * poseK),
    orb: ktrack(f, [[A.conjure - 6, 0], [A.conjure + 10, 1]]),
    mood: f < A.open - 2 ? 'happy' : flash > 0.3 || (f >= H + 4 && f < H + 26) ? 'happy'
      : f < N || (f >= A.shatter + 12 && f < H + 4) ? 'starry' : '',
    shut: ktrack(f, [[A.open - 4, 0], [A.open - 2, 0.6], [A.open + 4, 0]]),
    winkCute: f >= A.wink && f < A.wink + 26 ? 1 : 0,
    mouth: curious * 0.35 + castK * 0.5 + kenv(f, H + 2, H + 6, H + 20, H + 28) * 0.55 + kenv(f, A.shatter + 2, A.shatter + 8, H - 4, H) * 0.4
      + ktrack(f, [[P, 0], [P + 12, 0.26]]),
    ear: ktrack(f, [[N, -0.1], [N + 4, -0.5, KE.out], [N + 18, -0.22], [A.raise, -0.15]]) - castK * 0.3 - kenv(f, H + 3, H + 6, H + 10, H + 18) * 0.3 + L.ear,
    gaze: lookX * curious - 0.32 * aimK - 0.3 * sweep + 0.45 * conjLook,
    gazeY: lookY * curious - 0.42 * aimK - 0.2 * conjLook,
    tilt: 0.06 * (1 - curious) + lookTilt * 0.2 * curious + 0.05 * poseK + L.tilt,
    lean: -0.02 * aimK + 0.03 * castK - 0.03 * sweep + L.lean,
    wag: 0.3 + Math.sin(f * 0.3) * 0.8 * kenv(f, H, H + 6, H + 22, H + 32) + Math.sin(t * 0.2) * 0.5 * kenv(f, P, P + 10, A.dur - 30, A.dur),
  };
  // ── ช่วงที่ยืดเวลาออก (ผู้ใช้ขอให้ช้าลง): ท่าเล็ก ๆ ตามเวลาจริง ตัวไม่ค้างนิ่ง ──
  // ลอยลงหลับตายิ้มหลังดอกน้ำแข็งบาน: แกว่งตัวเบา ๆ แบบล่องลอย หัวเอียงตามช้ากว่าหนึ่งจังหวะ หูพลิ้ว หางโบก
  const drift = kenv(f, A.show + 6, A.show + 16, A.land - 8, A.land);
  s.lean += Math.sin(t * 0.075) * 0.022 * drift;
  s.tilt += Math.sin(t * 0.075 - 0.9) * 0.045 * drift;
  s.ear += Math.sin(t * 0.16) * 0.07 * drift;
  s.wag += Math.sin(t * 0.18) * 0.45 * drift;
  // ชูคทาชาร์จเวท: ลมเวทพัดหูพลิ้วถี่ ๆ หางสะบัด ตัวสั่นเกร็งนิด ๆ ตามพลังที่รวม
  const charge = kenv(f, A.raise + 10, A.aim, A.cast - 2, A.cast + 4);
  s.ear += Math.sin(t * 0.55) * 0.06 * charge;
  s.wag += Math.sin(t * 0.32) * 0.35 * charge;
  s.sy += Math.sin(t * 0.9) * 0.006 * charge;
  const u = KE.io(clamp01((f - (A.dur - 40)) / 40));
  return u > 0 ? kmix(s, SNOW_ACT.shape(t), u) : s;
}
/**
 * กล้องของท่าเปิดตัว ณ เฟรม f — ผู้เรียกใส่ให้ทั้งฉาก (พื้นหลัง เงา ตัวน้อง เอฟเฟกต์)
 * คืน { z: ซูม, fx, fy: จุดหมุนซูม (หน่วยไฟล์ — ซูมแล้วจุดนี้ค้างที่เดิมบนจอ), dx, dy: เลื่อนภาพ (หน่วยไฟล์), rot: เอียง (เรเดียน) }
 * skip 0..1 = กดข้าม → กล้องค่อย ๆ คืนที่เดิม
 */
function snowCam(f, skip = 0) {
  const A = SNI;
  const z = ktrack(f, [[0, 1.32], [A.fall1 - 14, 1.32], [A.show, 1.6], [A.open, 1.9], [A.notice + 26, 2.05], [A.raise + 12, 1.22], [A.cast, 1.42],
    [A.shatter - 1, 1.48], [A.shatter + 8, 1.04, KE.out], [A.hop, 1.06], [A.sweep, 1.2], [A.sweepEnd, 1.2], [A.pose + 12, 1.14], [A.dur - 26, 1], [A.dur, 1]]);
  const fy = ktrack(f, [[0, 240], [A.fall1 - 14, 330], [A.show, 410], [A.open, 255], [A.notice + 26, 250], [A.raise + 12, 360], [A.cast, 330],
    [A.shatter + 8, 420], [A.sweep, 390], [A.pose + 12, 380], [A.dur - 26, 400]]);
  const fx = ktrack(f, [[0, 300], [A.notice + 26, 300], [A.raise + 12, 250], [A.cast, 210], [A.shatter + 8, 300], [A.pose + 12, 330], [A.dur - 26, 300]]);
  let dy = ktrack(f, [[0, 230], [A.fall1 - 6, 0]]);
  let dx = ktrack(f, [[A.hop, 0], [A.sweep, 26], [A.sweepEnd, -26], [A.pose + 12, 0]]);
  let rot = ktrack(f, [[A.hop, 0], [A.sweep, -0.035], [A.sweepEnd, 0.03], [A.pose + 12, 0]]);
  // กล้องสั่น: ตอนยิงเวทนิดหน่อย · ตอนจอแตกแรงแล้วซาลง
  const sh = (f >= A.cast && f < A.cast + 14 ? 2.5 * (1 - (f - A.cast) / 14) : 0)
    + (f >= A.shatter && f < A.shatter + 34 ? 10 * Math.exp(-(f - A.shatter) * 0.13) : 0);
  dx += Math.sin(f * 1.9) * sh;
  dy += Math.cos(f * 2.7) * sh;
  rot += Math.sin(f * 1.3) * sh * 0.002;
  const k = 1 - clamp01(skip);
  return { z: 1 + (z - 1) * k, fx, fy, dx: dx * k, dy: dy * k, rot: rot * k };
}
let SN_FERN = null;
/** ลายเฟิร์นน้ำแข็ง: กิ่งแตกสามชั้นงอกจากขอบจอเข้าหากลาง (พิกเซลของผ้าใบ · เก็บตามขนาดจอ) */
function snFernPath(W, H) {
  if (SN_FERN && SN_FERN.W === W && SN_FERN.H === H) return SN_FERN.q;
  const q = new Path2D(), m = Math.min(W, H);
  const grow = (x, y, ang, len, depth) => {
    const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len;
    q.moveTo(x, y);
    q.lineTo(x1, y1);
    if (depth <= 0) return;
    for (const p of [0.35, 0.6, 0.82]) {
      const bx = x + (x1 - x) * p, by = y + (y1 - y) * p, bl = len * (1 - p) * 0.62;
      grow(bx, by, ang - 0.7, bl, depth - 1);
      grow(bx, by, ang + 0.7, bl, depth - 1);
    }
  };
  for (let i = 0; i < 24; i++) {
    const side = i % 4, p = hash(i * 3 + 900);
    let x, y, ang;
    if (side === 0) { x = p * W; y = 0; ang = Math.PI / 2; } else if (side === 1) { x = W; y = p * H; ang = Math.PI; } else if (side === 2) { x = p * W; y = H; ang = -Math.PI / 2; } else { x = 0; y = p * H; ang = 0; }
    grow(x, y, ang + (hash(i * 7 + 901) - 0.5) * 0.9, m * (0.14 + hash(i * 5 + 902) * 0.18), 2);
  }
  SN_FERN = { W, H, q };
  return q;
}
/**
 * น้ำแข็งเกาะจอ (วาดทับทั้งจอในพิกัดพิกเซล ไม่ตามกล้อง): ฝ้าทึบขอบ ใสกลาง ลายเฟิร์นจากขอบ ประกายบนน้ำแข็ง
 * → รอยร้าวแตกจากจุดที่เวทกระทบ → แตกเป็นเศษพุ่งเข้าหากล้อง หมุน ตกตามแรงโน้มถ่วง แล้วจาง
 */
function snowLens(c, k) {
  const A = SNI, f = k.intro, W = k.W, H = k.H;
  const fade = 1 - (k.introSkip || 0);
  if (fade <= 0.01 || f > A.shatter + 48) return;
  const m = Math.min(W, H), s = m / 700, D = Math.hypot(W, H);
  const hit = SN_HIT || [W * 0.5, H * 0.42];
  const frostAt = (x, y) => 0.16 + 0.74 * clamp01((Math.hypot(x - W / 2, y - H / 2) - m * 0.18) / (D * 0.55 - m * 0.18));
  c.save();
  c.globalAlpha *= fade;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  if (f < A.shatter) {
    const g = c.createRadialGradient(W / 2, H / 2, m * 0.18, W / 2, H / 2, D * 0.55);
    g.addColorStop(0, 'rgba(230,244,255,.16)');
    g.addColorStop(0.55, 'rgba(214,235,255,.5)');
    g.addColorStop(1, 'rgba(198,226,255,.9)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    const q = snFernPath(W, H);
    c.strokeStyle = 'rgba(100,170,240,.35)';
    c.lineWidth = 4.2 * s;
    c.stroke(q);
    c.strokeStyle = 'rgba(255,255,255,.88)';
    c.lineWidth = 1.8 * s;
    c.stroke(q);
    for (let i = 0; i < 12; i++) {
      const x = hash(i * 3 + 950) * W, y = hash(i * 7 + 951) * H;
      if (frostAt(x, y) < 0.45) continue;
      const tw = Math.max(0, Math.sin((k.t || 0) * 0.09 + i * 1.7));   // เวลาจริง (ช่วงนี้ถูกยืดเวลา)
      snSparkle(c, x, y, 13 * s * tw + 2 * s, tw);
    }
    // รอยร้าว: เส้นซิกแซกสิบสองสายจากจุดกระทบ + วงร้าวสองวง (ค่อย ๆ ลาม)
    const cp = clamp01((f - A.crack) / (A.shatter - A.crack - 2));
    if (cp > 0) {
      glowAt(c, hit[0], hit[1], m * (0.12 + 0.1 * cp), '210,238,255', 0.6);
      const cr = new Path2D();
      for (let i = 0; i < 12; i++) {
        let x = hit[0], y = hit[1], a = (i * TAU) / 12 + (hash(i + 960) - 0.5) * 0.4;
        cr.moveTo(x, y);
        const n = 7, segL = (m * 0.09 * (0.7 + hash(i + 970) * 0.6));
        const reach = cp * n;
        for (let j = 0; j < n && j < reach; j++) {
          a += (hash(i * 13 + j + 980) - 0.5) * 0.6;
          const u = Math.min(1, reach - j);
          x += Math.cos(a) * segL * u;
          y += Math.sin(a) * segL * u;
          cr.lineTo(x, y);
        }
      }
      for (const [rr, a0] of [[0.1, 0.3], [0.22, 1.1]]) {
        const R = m * rr, span = TAU * clamp01(cp * 1.6 - rr * 2);
        if (span <= 0) continue;
        for (let i = 0; i < 12; i++) {
          const b0 = a0 + (i * TAU) / 12, b1 = b0 + Math.min(TAU / 12 * 0.8, span / 12);
          cr.moveTo(hit[0] + Math.cos(b0) * R, hit[1] + Math.sin(b0) * R);
          cr.lineTo(hit[0] + Math.cos(b1) * R * 1.04, hit[1] + Math.sin(b1) * R * 1.04);
        }
      }
      c.strokeStyle = 'rgba(70,140,235,.7)';
      c.lineWidth = 4.4 * s;
      c.stroke(cr);
      c.strokeStyle = 'rgba(255,255,255,.98)';
      c.lineWidth = 1.9 * s;
      c.stroke(cr);
    }
  } else {
    // ── แตกกระจาย: เศษจัดเป็นวงรอบจุดกระทบ (12 แฉก × 4 วง) พุ่งออก+พุ่งเข้าหากล้อง (ขยาย) หมุน ตก จาง ──
    const d = f - A.shatter;
    if (d < 12) {
      c.fillStyle = `rgba(245,251,255,${0.7 * (1 - d / 12)})`;
      c.fillRect(0, 0, W, H);
    }
    const R = [0, 0.12, 0.3, 0.6, 1.25].map((r) => r * D);
    for (let ring = 0; ring < 4; ring++) {
      for (let j = 0; j < 12; j++) {
        const jit = (q) => (hash(ring * 31 + q * 7 + 1000) - 0.5) * 0.3;
        const a0 = (j * TAU) / 12 + jit(j), a1 = ((j + 1) * TAU) / 12 + jit((j + 1) % 12);
        const r0 = R[ring], r1 = R[ring + 1];
        const pts = r0 > 0
          ? [[a0, r0], [a0, r1], [a1, r1], [a1, r0]]
          : [[0, 0], [a0, r1], [a1, r1]];
        const P = pts.map(([a, r]) => [hit[0] + Math.cos(a) * r, hit[1] + Math.sin(a) * r]);
        const cx = P.reduce((v, p) => v + p[0], 0) / P.length, cy = P.reduce((v, p) => v + p[1], 0) / P.length;
        const am = (a0 + a1) / 2, sp = (5 + ring * 6 + hash(ring * 12 + j + 1050) * 4) * s;
        const ox = Math.cos(am) * sp * d, oy = Math.sin(am) * sp * d + 0.32 * s * d * d;
        const al = 1 - clamp01((d - 4) / 30);
        if (al <= 0.01) continue;
        c.save();
        c.translate(cx + ox, cy + oy);
        c.rotate((hash(ring * 12 + j + 1060) - 0.5) * 0.08 * d);
        c.scale(1 + d * 0.035, 1 + d * 0.035);
        c.translate(-cx, -cy);
        const q = new Path2D();
        P.forEach(([x, y], i) => (i ? q.lineTo(x, y) : q.moveTo(x, y)));
        q.closePath();
        c.fillStyle = `rgba(222,239,255,${frostAt(cx, cy) * al})`;
        c.fill(q);
        c.strokeStyle = `rgba(255,255,255,${0.9 * al})`;
        c.lineWidth = 2.2 * s;
        c.stroke(q);
        c.strokeStyle = `rgba(90,160,240,${0.45 * al})`;
        c.lineWidth = 1 * s;
        c.beginPath(); c.moveTo(...P[0]); c.lineTo(...P[2]); c.stroke();
        c.restore();
      }
    }
    for (let i = 0; i < 16; i++) {
      const a = hash(i + 1100) * TAU, sp = (4 + hash(i + 1110) * 8) * s;
      const x = hit[0] + Math.cos(a) * sp * d, y = hit[1] + Math.sin(a) * sp * d + 0.25 * s * d * d;
      snSparkle(c, x, y, 10 * s, 1 - d / 48, i % 2 ? '#BFF1FF' : '#FFFFFF');
    }
  }
  c.restore();
}
/** ตำแหน่งเกล็ดหิมะตัวที่ i ช่วงลอยลง → วงรอบกลาง → หมุนวนเข้ากลาง (คืน null = ยังไม่โผล่/รวมไปแล้ว) */
function snFallFlake(i, f) {
  const A = SNI;
  const x0 = 300 + (i - 2.5) * 96 + (hash(i + 1200) - 0.5) * 40, y0 = -380 - hash(i + 1210) * 170;
  const th = (i * TAU) / 6 - Math.PI / 2;
  const rx = 300 + Math.cos(th) * 170, ry = 410 + Math.sin(th) * 120;
  const u = clamp01((f - A.fall0 - i * 6) / (A.fall1 - A.fall0 - 34));
  if (f < A.fall0 + i * 6 - 2) return null;
  if (f < A.fall1) {
    const e = KE.io(u);
    return { x: x0 + (rx - x0) * e + Math.sin(f * 0.045 + i * 1.3) * 42 * (1 - e), y: y0 + (ry - y0) * e, rot: f * 0.012 + i, sc: 1, a: clamp01((f - A.fall0 - i * 6 + 2) / 10) };
  }
  const v = clamp01((f - A.fall1) / (A.bloom - 10 - A.fall1));
  if (v >= 1) return null;
  const e = KE.in(v), an = th + e * 3.4;
  return { x: 300 + Math.cos(an) * 170 * (1 - e), y: 410 + Math.sin(an) * 120 * (1 - e), rot: f * 0.05 + i, sc: 1 - 0.55 * e, a: 1 };
}
/** ท่าเปิดตัว · เอฟเฟกต์ (พิกัดพื้น) · k.layer 'back' ก่อนตัว / 'front' ทับตัว · กดข้าม = จางออกตาม k.introSkip */
function snowIntroFx(c, k) {
  const f = k.intro, t = k.t || 0, pal = k.pal, A = SNI;
  const fade = 1 - (k.introSkip || 0);
  if (fade <= 0.01) return;
  c.save();
  c.globalAlpha *= fade;
  const lite = gfxLevel() === 'save';
  const sv = clamp01(f / 30) * (1 - clamp01((f - A.shatter) / 40));
  if (k.layer === 'back') {
    // ค่ำคืนหน้าหนาว (โทนน้ำเงิน) — สว่างขึ้นตอนจอแตก
    const dim = 0.42 * kenv(f, 0, 6, A.shatter - 2, A.shatter + 30);
    if (dim > 0.01) {
      const gr = c.createRadialGradient(300, 470, 160, 300, 470, 1100);
      gr.addColorStop(0, 'rgba(14,26,70,0)');
      gr.addColorStop(0.35, `rgba(14,26,70,${dim * 0.6})`);
      gr.addColorStop(1, `rgba(14,26,70,${dim})`);
      c.fillStyle = gr;
      c.fillRect(-1800, -2400, 4200, 4800);
    }
    if (!lite) snAurora(c, t, 0.42 * (1 - clamp01((f - A.shatter) / 24)));
    snSnow(c, t, sv, false, lite);
    // แสงนุ่มหลังตัวตอนปรากฏ
    const bg = kenv(f, A.bloom - 6, A.bloom, A.bloom + 10, A.land + 10);
    if (bg > 0.01) glowAt(c, 300, 420, 260, '205,236,255', 0.55 * bg);
    // จอแตก: คลื่นน้ำแข็งแผ่บนพื้น
    for (let r = 0; r < 2; r++) {
      const p = clamp01((f - A.shatter - r * 6) / 30);
      if (p <= 0 || p >= 1) continue;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = `rgba(150,225,255,${0.85 * (1 - p)})`;
      c.lineWidth = 8 * (1 - p) + 1.5;
      c.beginPath(); c.ellipse(300, 646, 40 + KE.out(p) * 320, (40 + KE.out(p) * 320) * 0.2, 0, 0, TAU); c.stroke();
      c.restore();
    }
  } else {
    snSnow(c, t, sv, true, lite);
    // ── เกล็ดหิมะหกดวงลอยลง → หมุนวนเข้ากลาง ──
    if (f < A.bloom) {
      for (let i = 0; i < 6; i++) {
        const q = snFallFlake(i, f);
        if (!q) continue;
        for (let j = 1; j <= 3 && f >= A.fall1; j++) {
          const p = snFallFlake(i, f - j * 2);
          if (p) snSparkle(c, p.x, p.y, 7 - j * 1.6, 0.8 - j * 0.2, '#BFF1FF');
        }
        c.save();
        c.globalAlpha *= q.a;
        snSparkleFlake(c, q.x, q.y, SN_FLOAT[i][2] * 1.1 * q.sc, q.rot, pal, t, i);
        c.restore();
      }
    }
    // ── ดอกน้ำแข็งตูมกลางฉาก: เกล็ดใหญ่กลาง + แฉกคริสตัลสิบแฉกรอบ เต้นตุบ ๆ ถี่ขึ้น ──
    const B0 = A.fall1 + 14;
    if (f >= B0 && f < A.bloom + 40) {
      const gb = KE.back(clamp01((f - B0) / 18));
      const open = clamp01((f - A.bloom) / 40), eo = KE.out(open);
      const beat = f < A.bloom ? 1 + 0.06 * Math.max(0, Math.sin((f - B0) * (0.25 + (f - B0) * 0.004))) : 1;
      c.save();
      c.globalAlpha *= 1 - clamp01((open - 0.2) / 0.8);
      glowAt(c, 300, 410, 120 * gb, '150,215,255', 0.55);
      for (let i = 0; i < 10; i++) {
        const an = (i * TAU) / 10 - Math.PI / 2 + eo * 0.8;
        const dist = eo * 190;
        const bx = 300 + Math.cos(an) * dist, by = 410 + Math.sin(an) * dist * 0.85 + eo * eo * 60;
        snKite(c, bx, by, 46 * gb * beat * (1 - 0.4 * eo), 12 * gb * beat * (1 - 0.4 * eo), an, pal, i % 2 ? SN.crystalB : SN.crystal, 1.5 * SNK);
      }
      if (f < A.bloom) snSparkleFlake(c, 300, 410, 30 * gb * beat, f * 0.03, pal, t, 7);
      c.restore();
    }
    // ── "ปริ๊ง": แสงวาบนุ่ม + เกล็ดหิมะจิ๋วกระจาย + ประกายวิ้ง ๆ รอบตัว ──
    const fl = kenv(f, A.bloom - 4, A.bloom, A.bloom + 3, A.bloom + 22);
    if (fl > 0.01) {
      glowAt(c, 300, 410, 280 * fl + 20, '240,250,255', 0.95 * fl);
      glowAt(c, 300, 410, 200 * fl + 20, '150,210,255', 0.45 * fl);
    }
    if (f >= A.bloom && f < A.bloom + 60) {
      const d = f - A.bloom;
      for (let i = 0; i < 24; i++) {
        const an = (i / 24) * TAU + hash(i + 1300) * 0.3, sp = 6 + hash(i + 1310) * 5;
        const dd = (1 - Math.exp(-d * 0.07)) / 0.07;
        const x = 300 + Math.cos(an) * sp * dd, y = 410 + Math.sin(an) * sp * dd * 0.8 + d * 0.8;
        if (Math.abs(x - 300) < 150 && y < 470 && y > 120 && d > 6) continue;   // ไม่ผ่านหน้า/ชุด
        snFlake(c, x, y, 4 + hash(i + 1320) * 5, d * 0.06 + i, 1 - d / 60);
      }
    }
    // วิ้ง ๆ: ประกายผุดรอบตัวทีละดวงตอนปรากฏจนแตะพื้น
    if (f >= A.bloom && f < A.land + 24) {
      for (let i = 0; i < 12; i++) {
        const st = A.bloom + 4 + i * 4, p = clamp01((f - st) / 18);
        if (p <= 0 || p >= 1) continue;
        const an = hash(i + 1400) * TAU, r = 170 + hash(i + 1410) * 70;
        snSparkle(c, 300 + Math.cos(an) * r, 380 + Math.sin(an) * r * 0.9, 12 * Math.sin(p * Math.PI), Math.sin(p * Math.PI), i % 3 ? '#FFFFFF' : '#BFF1FF');
      }
    }
    // ลืมตา: ประกายที่หางตาสองข้าง
    const op = kenv(f, A.open - 2, A.open + 4, A.open + 10, A.open + 26);
    if (op > 0.01) {
      const sc = KE.back(clamp01((f - A.open + 2) / 10));
      for (const [ex, ey] of [[168, 218], [432, 218]]) snSparkle(c, ex, ey, 16 * sc, op);
    }
    // กระโดด: ประกายวงรอบเท้าตอนพุ่ง + ฝ้าน้ำแข็งบานตอนแตะพื้น
    for (const [fs, n, col] of [[A.hop + 4, 10, '#FFFFFF'], [A.hop + 24, 12, '#BFF1FF']]) {
      const d = f - fs;
      if (d < 0 || d > 24) continue;
      const u = d / 24;
      for (let i = 0; i < n; i++) {
        const an = Math.PI + (i / (n - 1)) * Math.PI;
        snSparkle(c, 300 + Math.cos(an) * (80 + 120 * u), 640 + Math.sin(an) * (16 + 50 * u), 9 * (1 - u) + 1, 1 - u, i % 2 ? col : '#FFFFFF');
      }
    }
    // เสกน้ำแข็ง: แสงวาบ + ประกายแตกออกที่อุ้งเท้าขวา
    const cj = kenv(f, A.conjure - 2, A.conjure + 2, A.conjure + 5, A.conjure + 24);
    if (cj > 0.01) {
      glowAt(c, 532, 390, 90 * cj, '220,245,255', 0.8 * cj);
      const r = 20 + KE.out(clamp01((f - A.conjure) / 24)) * 60;
      for (let i = 0; i < 8; i++) { const an = (i * TAU) / 8; snSparkle(c, 532 + Math.cos(an) * r, 390 + Math.sin(an) * r, 7 * cj, cj, i % 2 ? '#BFF1FF' : '#FFFFFF'); }
    }
    // ขยิบตา: ประกายข้างตาที่ขยิบ
    const wk = kenv(f, A.wink, A.wink + 6, A.wink + 16, A.wink + 36);
    if (wk > 0.01) snSparkle(c, 440, 226, 18 * KE.back(clamp01((f - A.wink) / 10)), wk, '#BFF1FF');
  }
  c.restore();
}
/** ท่าเปิดตัว · คทาชั้นหน้า: วงเวทก่อตัวหน้าหัวคทา + ชาร์จ → ยิงเวทพุ่งเข้าหาจอ (วงแสงขยายพรวด) → รอยหิมะตามหัวคทาตอนปัด */
function snowWandIntro(c, k, f, gx, gy, ga) {
  const A = SNI;
  const [hx, hy] = snWandHead(gx, gy, ga);
  // ── วงเวทหน้าหัวคทา (หันหาคนดู) โตขึ้นระหว่างเล็ง ──
  const ak = kenv(f, A.aim - 2, A.aim + 8, A.cast, A.cast + 6);
  if (ak > 0.01) {
    const R = 22 + 30 * KE.out(clamp01((f - A.aim + 2) / 12));
    c.save();
    c.globalAlpha *= ak;
    glowAt(c, hx, hy, R * 2.2, '120,205,255', 0.5);
    c.translate(hx, hy);
    c.strokeStyle = 'rgba(255,255,255,.95)';
    c.lineWidth = 2.4;
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(87,216,245,.9)';
    c.lineWidth = 1.6;
    c.beginPath(); c.arc(0, 0, R * 0.78, 0, TAU); c.stroke();
    c.rotate(f * 0.08);
    c.fillStyle = 'rgba(255,255,255,.95)';
    for (let i = 0; i < 6; i++) {
      c.rotate(TAU / 6);
      c.beginPath(); c.moveTo(0, -R * 0.78); c.lineTo(R * 0.12, -R * 0.55); c.lineTo(0, -R * 0.32); c.lineTo(-R * 0.12, -R * 0.55); c.closePath(); c.fill();
    }
    c.restore();
    for (let i = 0; i < 6; i++) {
      const p = ((f - A.aim) * 0.05 + i / 6) % 1, an = i * 1.7 + f * 0.05, r = 90 * (1 - p) + 10;
      snSparkle(c, hx + Math.cos(an) * r, hy + Math.sin(an) * r, 5 + 3 * p, p * ak, '#BFF1FF');
    }
  }
  // ── ยิงเวทเข้าหาจอ: วงแสงขยายพรวดจากหัวคทา (พุ่งเข้าหากล้อง) + แสงวาบ ──
  if (f >= A.cast && f < A.cast + 14) {
    const p = (f - A.cast) / 14;
    glowAt(c, hx, hy, 160 * (1 - p) + 30, '240,250,255', 0.9 * (1 - p));
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let r = 0; r < 3; r++) {
      const q = clamp01(p * 1.3 - r * 0.15);
      if (q <= 0 || q >= 1) continue;
      c.strokeStyle = `rgba(190,232,255,${0.8 * (1 - q)})`;
      c.lineWidth = 14 * (1 - q) + 2;
      c.beginPath(); c.arc(hx, hy, 30 + KE.in(q) * 900, 0, TAU); c.stroke();
    }
    c.restore();
  }
  // ── ปัดคทา: รอยเกล็ดหิมะ+ประกายตามหัวคทา ──
  const swNow = snSweepAt(f);
  if (f > A.sweep && f < A.sweepEnd + 10) {
    for (let j = 1; j <= 12; j++) {
      const ff = f - j * 1.6;
      if (ff < A.sweep) break;
      const aj = ga + 0.95 * (swNow - snSweepAt(ff));
      const [px, py] = snWandHead(gx, gy, aj);
      const w = 1 - j / 13;
      if (j % 3) snSparkle(c, px, py, 9 * w + 2, w, j % 2 ? '#BFF1FF' : '#FFFFFF');
      else snFlake(c, px, py + j * 1.5, 5 * w + 2, ff * 0.1, w);
    }
  }
}
/**
 * ความเร็วแต่ละช่วงของท่าเปิดตัว princess (ผู้ใช้ขอ 14 ต.ค. แบบเดียวกับ sweet: ช้าลงให้เห็นรายละเอียด · ~9.5 วิ)
 * [เฟรมสตอรี SNI, เฟรมจริงต่อหนึ่งเฟรมสตอรี] — ตัวยืดเดียวกับ sweet (swMakeTime)
 * ยืด: จอน้ำแข็ง+เกล็ดลอยลง · หมุนวนเข้ากลาง · ลอยลงแตะพื้น · มองจอ · ชูคทาชาร์จ · จอร้าว · ปัดคทา · โพส
 * เร็วเท่าเดิม: ดอกบาน "ปริ๊ง" · ยิงเวท · จอแตก · กระโดดดีใจ (ดอกตูมเต้นตุบ ๆ ยืดนิดเดียว ไม่ให้จังหวะหัวใจหย่อน)
 */
const SN_RATE = [
  [0, 1.3], [96, 1.3], [104, 1.35], [116, 1.35], [122, 1.1], [141, 1.1], [144, 1], [152, 1],   // จอน้ำแข็ง เกล็ดลอยลง หมุนวน · ดอกตูม · บาน
  [158, 1.45], [180, 1.45], [186, 1.35], [226, 1.35], [232, 1.4], [258, 1.4],                 // ลอยลง · ลืมตามองจอ · ชูคทาชาร์จ
  [262, 1], [267, 1], [270, 1.2], [279, 1.2], [282, 1], [312, 1],                              // ยิง · จอร้าว · จอแตก + กระโดด
  [320, 1.25], [344, 1.25], [352, 1.4], [372, 1.5], [432, 1.6],                                // ปัดคทา · โพส · ค้างท่า
];
const SN_TIME = swMakeTime(SNI.dur, SN_RATE);
/** เสียงตามจังหวะ (เฟรมสตอรี · ชื่อใน sfx ของ audio.js) — แปลงเป็นเฟรมจริงใน SNOW_INTRO */
const SN_VOICES = [[0, 'snowFreeze'], [SNI.fall0 + 6, 'snowDescend'], [SNI.fall1, 'snowGather'], [SNI.fall1 + 16, 'snowBud'], [SNI.bloom - 2, 'snowBloom'],
  [SNI.open, 'snowWake'], [SNI.notice + 4, 'snowNotice'], [SNI.aim, 'snowCharge'], [SNI.cast, 'snowCast'], [SNI.crack, 'snowCrack'],
  [SNI.shatter, 'snowShatter'], [SNI.hop + 4, 'snowHop'], [SNI.sweep + 4, 'snowSweep'], [SNI.conjure - 2, 'snowConjure'],
  [SNI.wink - 2, 'snowMew'], [SNI.wink + 8, 'snowShimmer']];
/** ท่าเปิดตัว princess — ผู้เรียกส่ง "เฟรมจริง" · ตัววาดแปลงเป็นเฟรมสตอรีด้วย warp ก่อนส่งให้ช่องของชุด/lens/stage */
const SNOW_INTRO = {
  dur: Math.round(SN_TIME.dur),
  appear: SN_TIME.toRaw(SNI.show),
  warp: SN_TIME.warp,
  stage: snowIntroStage,   // รับเฟรมสตอรี
  cam: (f, skip, v) => snowCam(SN_TIME.warp(f), skip, v),     // กล้อง (ผู้เรียกใส่ให้ทั้งฉาก)
  ground: true,     // เอฟเฟกต์อยู่บนพื้น ไม่ลอยตามตัวตอนปรากฏ/กระโดด
  lens: snowLens,   // น้ำแข็งเกาะจอ (ตัววาดวาดทับทั้งผ้าใบในพิกัดพิกเซล · k.intro เป็นเฟรมสตอรีแล้ว)
  voices: SN_VOICES.map(([f, n]) => [Math.round(SN_TIME.toRaw(f)), n]),
  shape: (f, t) => snowIntroShape(SN_TIME.warp(f), t),
  fx: snowIntroFx,
};

// ── จันทราแมวรัตติกาล ──
const NIGHT = ['#5B4FA8', '#2E2766', '#17123A'];
const LUNAR_T = {
  body: NIGHT, cuff: '#DCE3F5', cuffLine: null, hem: '#DCE3F5', vneck: false, fold: 'rgba(255,255,255,.12)', cuffAt: 126,
  extra(c, P, k) {
    for (const [x, y, r] of [[230, 430, 5], [370, 450, 6], [260, 490, 4], [340, 500, 5], [300, 420, 3]]) { const [sx, sy] = P(x, y); sparkStar(c, sx, sy, r, '#EEF2FF'); }
    if (!k.back) { const [mx, my] = P(300, 468); glowAt(c, mx, my, 34, '200,210,255', 0.5); crescent(c, mx, my, 14, k.pal); }
  },
  sleeveExtra(c, Q) { for (const [x, y] of [[176, 440], [164, 486]]) { const [sx, sy] = Q(x, y); sparkStar(c, sx, sy, 5, '#EEF2FF'); } },
};
const LUNAR_SK = {
  cols: NIGHT, hem: '#DCE3F5', fold: 'rgba(255,255,255,.12)',
  G: { stand: { y0: 520, y1: 634, x0: 176, x1: 424, fl: 60 }, sit: { y0: 536, y1: 644, x0: 168, x1: 432, fl: 80 } },
  extra(c, P, G, k) {
    const t = (k && k.t) || 0;
    for (let i = 0; i < 9; i++) { const [sx, sy] = P(180 + ((i * 71) % 240), G.y0 + 16 + ((i * 37) % (G.y1 - G.y0 - 16))); c.save(); c.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 0.07 + i)); sparkStar(c, sx, sy, i % 3 ? 4 : 7, '#EEF2FF'); c.restore(); }
  },
};
function lunarHat(c, k) {
  // มงกุฎพระจันทร์เสี้ยวเงินใหญ่บนหัว เรืองแสง เพชรฟ้า
  const t = k.t || 0;
  c.save();
  glowAt(c, 300, 84, 100, '190,200,255', 0.45 + 0.15 * Math.sin(t * 0.06));
  const band = new Path2D(); band.moveTo(232, 130); band.quadraticCurveTo(300, 112, 368, 130); band.lineTo(368, 142); band.quadraticCurveTo(300, 126, 232, 142); band.closePath();
  softFill(c, band, 300, 112, 300, 142, '#FFFFFF', '#DCE3F5', '#9AA6CC'); outline(c, band, k.pal, OL * 0.8);
  c.save(); c.translate(300, 84); c.rotate(-Math.PI / 2 - 0.2);
  crescent(c, 0, 0, 40, k.pal);
  c.restore();
  if (!k.back) blueGem(c, 300, 128, 14, k.pal, false);
  twinkle(c, 340, 50, 7, Math.abs(Math.sin(t * 0.09)));
  twinkle(c, 262, 62, 5, Math.abs(Math.sin(t * 0.09 + 1.5)));
  c.restore();
}
function lunarBehind(c, k) {
  const t = k.t || 0;
  // พระจันทร์เต็มดวงใหญ่หลังตัว (ฮาโล)
  glowAt(c, 300, 300, 260, '170,180,255', 0.35);
  const moon = new Path2D(); moon.arc(300, 300, 190, 0, TAU);
  c.save(); c.globalAlpha = 0.35; softFill(c, moon, 300, 110, 300, 490, '#FFFFFF', '#E3E8FF', '#B9C2EE'); c.restore();
  sAura(c, k, {
    glow: '140,130,255', ray: '200,205,255', n: 12, spin: -0.003,
    cape: (c2, k2, tt) => longCape(c2, k2, tt, NIGHT, '#DCE3F5', 0.95),
    item(c2, x, y, i, a) { if (i % 4 === 0) crescent(c2, x, y, 11, k.pal); else sparkStar(c2, x, y, i % 2 ? 9 : 6, '#F2F4FF'); },
  });
}

// ── สายรุ้งเจ็ดสี ──
const RB = ['#FF6B6B', '#FF9F43', '#FFD93D', '#6BCB77', '#4D96FF', '#6C5CE7', '#C77DFF'];
const RAINBOW_T = {
  body: ['#FFFFFF', '#F7F7FF', '#E2E4F5'], cuff: '#4D96FF', cuffLine: '#FFD93D', hem: null, vneck: false, fold: 'rgba(120,120,180,.18)',
  extra(c, P, k, hemY) {
    // แถบสายรุ้งเฉียงพาดอก
    for (let i = 0; i < 7; i++) { c.strokeStyle = RB[i]; c.lineWidth = 7; c.beginPath(); c.moveTo(...P(150, 420 + i * 7)); c.quadraticCurveTo(...P(300, 470 + i * 7), ...P(450, 420 + i * 7)); c.stroke(); }
  },
};
function rainbowSkirt(c, k) {
  // กระโปรงทรงเอบานพอง แถบสายรุ้งเจ็ดสีไล่จากเอวลงชาย (ใช้กระโปรงทรงเอตัวกลาง)
  nurseSkirt(c, { ...k, SK: {
    cols: ['#FFFFFF', '#FFFFFF', '#F2F2FA'], hem: '#FFFFFF', fold: 'rgba(255,255,255,.35)',
    G: { stand: { y0: 520, y1: 610, x0: 180, x1: 420, fl: 46 }, sit: { y0: 536, y1: 640, x0: 170, x1: 430, fl: 70 } },
    extra(c2, P, G) {
      const h = (G.y1 + 22 - G.y0) / 7;
      for (let i = 0; i < 7; i++) {
        c2.fillStyle = RB[i];
        const [, ya] = P(300, G.y0 + i * h), [, yb] = P(300, G.y0 + (i + 1) * h);
        c2.fillRect(-200, ya, 1000, yb - ya + 1);
      }
    },
  } });
}
function rainbowHat(c, k) {
  // ที่คาดผมก้อนเมฆ + รุ้งโค้งบนหัว
  const t = k.t || 0;
  c.save();
  for (let i = 0; i < 7; i++) { c.strokeStyle = RB[i]; c.lineWidth = 7; c.beginPath(); c.arc(300, 136, 92 - i * 7, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); }
  for (const x of [204, 396]) {
    const cl = new Path2D();
    for (const [dx, dy, r] of [[-16, 4, 16], [0, -6, 20], [16, 4, 16]]) { cl.moveTo(x + dx + r, 128 + dy); cl.arc(x + dx, 128 + dy, r, 0, TAU); }
    c.strokeStyle = k.pal.line; c.lineWidth = OL * 2; c.stroke(cl);
    c.fillStyle = '#FFFFFF'; c.fill(cl);
  }
  twinkle(c, 300, 44, 8, Math.abs(Math.sin(t * 0.08)));
  c.restore();
}
function rainbowBehind(c, k) {
  const t = k.t || 0;
  // รุ้งโค้งใหญ่หลังตัว
  c.save(); c.globalAlpha = 0.6;
  for (let i = 0; i < 7; i++) { c.strokeStyle = RB[i]; c.lineWidth = 16; c.beginPath(); c.arc(300, 520, 290 - i * 16, Math.PI, 0); c.stroke(); }
  c.restore();
  sAura(c, k, {
    glow: (tt) => { const h = (tt * 2) % 360; return `${Math.round(200 + 55 * Math.sin(h / 57))},${Math.round(200 + 55 * Math.sin(h / 57 + 2))},${Math.round(200 + 55 * Math.sin(h / 57 + 4))}`; },
    ray: (i) => { const v = RB[i % 7]; return [1, 3, 5].map((j) => parseInt(v.slice(j, j + 2), 16)).join(','); },
    rays: 14, n: 14,
    item(c2, x, y, i) { c2.save(); sparkStar(c2, x, y, i % 2 ? 9 : 6, RB[i % 7]); c2.restore(); },
  });
}

// ── นางไม้มรกต ──
const LEAF = ['#B6F0A0', '#5CC46A', '#2E8A46'];
function leaf(c, x, y, r, rot, pal, cols = LEAF) {
  c.save(); c.translate(x, y); c.rotate(rot);
  const l = new Path2D(); l.moveTo(0, -r); l.quadraticCurveTo(r * 0.75, 0, 0, r); l.quadraticCurveTo(-r * 0.75, 0, 0, -r); l.closePath();
  softFill(c, l, -r, -r, r, r, cols[0], cols[1], cols[2]);
  outline(c, l, pal, 2.2);
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -r * 0.8); c.lineTo(0, r * 0.8); c.stroke();
  c.restore();
}
const DRYAD_T = {
  body: LEAF, cuff: '#2E8A46', cuffLine: '#FFE08A', hem: '#2E8A46', vneck: false, fold: 'rgba(20,80,30,.28)',
  extra(c, P, k) { for (const [x, y, r, a] of [[240, 446, 14, -0.5], [360, 446, 14, 0.5], [300, 486, 16, 0], [262, 504, 11, -0.8], [340, 504, 11, 0.8]]) { const [sx, sy] = P(x, y); leaf(c, sx, sy, r, a, k.pal, ['#D8FFC0', '#8EDB7A', '#3FA34D']); } },
};
function dryadSkirt(c, k) {
  // กระโปรงกลีบใบไม้ (ใบไม้ห้อยเรียงรอบเอวสองชั้น)
  const P = k.pt || ((x, y) => [x, y]);
  const sit = k.mode === 'sit';
  const y0 = sit ? 536 : 520, len = sit ? 92 : 76;
  for (const [row, n, w, cols] of [[0, 9, 1.18, LEAF], [1, 8, 1.0, ['#D8FFC0', '#8EDB7A', '#3FA34D']]]) {
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = 300 + (u - 0.5) * 240 * w, y = y0 + len * 0.5 + row * -10;
      const [px, py] = P(x, y);
      leaf(c, px, py, len * 0.55, (u - 0.5) * 0.8, k.pal, cols);
    }
  }
}
function dryadHat(c, k) {
  // มงกุฎใบไม้ + ดอกไม้ชมพู
  const t = k.t || 0;
  c.save();
  for (let i = 0; i < 9; i++) { const a = Math.PI * (1.05 + i * 0.1); leaf(c, 300 + Math.cos(a) * 92, 140 + Math.sin(a) * 70, 20, a + Math.PI / 2, k.pal); }
  for (const [x, y] of [[250, 88], [350, 88], [300, 72]]) {
    for (let p = 0; p < 5; p++) { const a = (p * TAU) / 5; const pe = new Path2D(); pe.arc(x + Math.cos(a) * 8, y + Math.sin(a) * 8, 7, 0, TAU); c.fillStyle = '#FFB3D1'; c.fill(pe); outline(c, pe, k.pal, 1.8); }
    c.fillStyle = '#FFE066'; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill();
  }
  twinkle(c, 300, 60, 6, Math.abs(Math.sin(t * 0.09)));
  c.restore();
}
function dryadBehind(c, k) {
  const t = k.t || 0;
  // ปีกใบไม้โปร่งแสงสองคู่ กระพือช้า ๆ
  const flap = Math.sin(t * 0.06) * 0.12;
  for (const d of [-1, 1]) for (const [dx, dy, r, a0] of [[-130, -70, 105, -0.9], [-110, 40, 78, -2.1]]) {
    // ปีกต่อที่สะบักกลางหลัง (300, 440) กระพือรอบจุดนั้น
    c.save(); c.translate(300, 440); c.scale(d, 1); c.rotate(-flap);
    c.globalAlpha = 0.78;
    leaf(c, dx, dy, r, a0, k.pal, ['#E8FFE0', '#9FEA9A', '#4FBF6A']);
    c.restore();
  }
  sAura(c, k, {
    glow: '120,230,140', ray: '190,255,190', n: 12,
    item(c2, x, y, i, a, tt) { if (i % 2) leaf(c2, x, y, 11, a * 3, k.pal); else { glowAt(c2, x, y, 16, '230,255,150', 0.8); c2.fillStyle = '#FFFFC0'; c2.beginPath(); c2.arc(x, y, 3.2, 0, TAU); c2.fill(); } },
  });
}

// ══ ฉากหลังประจำสกินระดับ S (ผู้ใช้ขอ 14 ต.ค. "ลองวาดพื้นหลังทั้งสองอัน ให้เข้ากับสกิน") ══
// เป็น "ภาพนิ่ง" ตามที่ตกลงกัน (ฉากขยับทุกเฟรม = กินเครื่อง): วาดครั้งเดียวลงภาพสำรอง แล้วแปะทุกเฟรมด้วย drawImage ครั้งเดียว
// ความมีชีวิตมาจากกล้องที่เลื่อน/ซูม + เอฟเฟกต์ของชุดที่วาดทับอยู่แล้ว
// พิกัด = หน่วยไฟล์ของตัวน้อง (กลางตัว x 300 · เท้า y 648 = FEET_Y) — ฉากจึงโต/ย่อตามตัวน้องเสมอ ไม่ว่าจะวาดที่ขนาดไหน
// สีฉากอ่อน/หม่นกว่าสีชุดเสมอ (ชุดต้องเด่นออกจากฉาก) · ตรงหลังตัวน้องโปร่งสงบ ของชิ้นใหญ่อยู่ด้านข้าง
const BD_BOX = [-1000, -520, 1600, 1100];   // x0 y0 x1 y1 — ครอบมุมมองหน้ากว้างสุด (มือถือแนวนอน) + ที่กล้องเลื่อน/เงยมองฟ้า
const BD_HZ = 500;                          // เส้นขอบฟ้า (ระดับสะโพกน้อง)
const BD_MAX_PX = 4.2e6;                    // เพดานพิกเซลของภาพสำรอง (~17 MB)
const bdRgba = (rgb, a) => `rgba(${rgb},${a})`;
/** เส้นทางรวมวงกลมหลายวง (ก้อนเมฆ/พุ่มหิมะ) */
function bdPuffs(list) {
  const p = new Path2D();
  for (const [x, y, r] of list) { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); }
  return p;
}
/** แสงฟุ้งกลม (ไล่จางขอบ) แบบวาดทับธรรมดา */
function bdGlow(c, x, y, r, rgb, a, sy = 1) {
  c.save();
  c.translate(x, y);
  c.scale(1, sy);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, bdRgba(rgb, a));
  g.addColorStop(0.5, bdRgba(rgb, a * 0.45));
  g.addColorStop(1, bdRgba(rgb, 0));
  c.fillStyle = g;
  c.fillRect(-r, -r, r * 2, r * 2);
  c.restore();
}
/** วงโบเก้ (แสงนอกโฟกัส): ในจาง ขอบสว่างกว่านิด */
function bdBokeh(c, x, y, r, rgb, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, bdRgba(rgb, a * 0.5));
  g.addColorStop(0.72, bdRgba(rgb, a * 0.55));
  g.addColorStop(0.9, bdRgba(rgb, a * 0.85));
  g.addColorStop(1, bdRgba(rgb, 0));
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
/** ขอบภาพสำรองค่อย ๆ กลืนเป็นสีรอบนอก (จอที่กว้างเกินภาพเห็นเป็นสีเดียวกันต่อเนื่อง ไม่เห็นขอบภาพ) */
function bdEdgeFade(c, col, w = 260) {
  const [X0, Y0, X1, Y1] = BD_BOX;
  const side = (x0, y0, x1, y1, rx, ry, rw, rh) => {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, col);
    g.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
    c.fillStyle = g;
    c.fillRect(rx, ry, rw, rh);
  };
  side(X0, 0, X0 + w, 0, X0, Y0, w, Y1 - Y0);
  side(X1, 0, X1 - w, 0, X1 - w, Y0, w, Y1 - Y0);
  side(0, Y0, 0, Y0 + w * 0.7, X0, Y0, X1 - X0, w * 0.7);
  side(0, Y1, 0, Y1 - w * 0.7, X0, Y1 - w * 0.7, X1 - X0, w * 0.7);
}
/** พื้นตารางมุมมองลึก (จุดหายที่กลางขอบฟ้า) — ช่องสลับสองสี · tw = กว้างช่องที่ระดับเท้า */
function bdCheckerFloor(c, colA, colB, tw = 130) {
  const [X0, , X1, Y1] = BD_BOX;
  const K = (FEET_Y - BD_HZ) * 4;   // ระดับเท้าอยู่ที่ความลึก 4
  const yAt = (z) => BD_HZ + K / z;
  const xAt = (i, z) => 300 + (i * tw * 4) / z;
  for (let z = 0.6; z < 40; z += 1) {
    const ya = yAt(z + 1), yb = Math.min(Y1 + 10, yAt(z));
    if (ya > Y1 + 10) continue;
    for (let i = -90; i < 90; i++) {
      const xa = xAt(i, z + 1), xb = xAt(i + 1, z + 1), xc = xAt(i + 1, z), xd = xAt(i, z);
      if (Math.max(xa, xb, xc, xd) < X0 || Math.min(xa, xb, xc, xd) > X1) continue;
      c.fillStyle = (i + Math.round(z)) % 2 ? colA : colB;
      c.beginPath(); c.moveTo(xa, ya); c.lineTo(xb, ya); c.lineTo(xc, yb); c.lineTo(xd, yb); c.closePath(); c.fill();
    }
  }
}
/** แท่นวงรีใต้เท้า (เวทีของสกิน) — ผิวบน + ขอบหน้าหนา h · top/side = [สีกลาง, สีขอบ] */
function bdStage(c, rx, ry, h, top, side, rim) {
  const cx = 300, cy = FEET_Y + 6;
  // ขอบหน้า (ครึ่งล่างของวงรี ยืดลงมา h)
  const sp = new Path2D();
  sp.moveTo(cx - rx, cy);
  sp.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
  sp.lineTo(cx + rx, cy + h);
  sp.ellipse(cx, cy + h, rx, ry, 0, 0, Math.PI, false);
  sp.closePath();
  const sg = c.createLinearGradient(0, cy, 0, cy + ry + h);
  sg.addColorStop(0, side[0]);
  sg.addColorStop(1, side[1]);
  c.fillStyle = sg;
  c.fill(sp);
  // ผิวบน
  const tg = c.createRadialGradient(cx, cy - ry * 0.2, 0, cx, cy, rx);
  tg.addColorStop(0, top[0]);
  tg.addColorStop(1, top[1]);
  c.fillStyle = tg;
  c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.fill();
  c.strokeStyle = rim;
  c.lineWidth = 4;
  c.beginPath(); c.ellipse(cx, cy, rx - 2, ry - 1, 0, 0, TAU); c.stroke();
  return { cx, cy, rx, ry, h };
}

// ── ขนมหวาน: "เวทีขนมหวานในฝัน" — ฟ้าพาสเทลชมพู-ม่วง โบเก้ เมฆสายไหม เนินขนมราดครีม อมยิ้ม/ไม้เท้าลูกกวาด พื้นตารางมันวาว แท่นเค้กกลม ──
function bdCandyHill(c, base, amp, f1, f2, ph, fill, frost, drip) {
  const [X0, , X1] = BD_BOX;
  const top = (x) => base - amp * (0.62 + 0.24 * Math.sin(x * f1 + ph) + 0.14 * Math.sin(x * f2 + ph * 1.7));
  const p = new Path2D();
  p.moveTo(X0, BD_HZ + 30);
  for (let x = X0; x <= X1; x += 16) p.lineTo(x, top(x));
  p.lineTo(X1, BD_HZ + 30);
  p.closePath();
  const g = c.createLinearGradient(0, base - amp, 0, BD_HZ + 30);
  g.addColorStop(0, fill[0]);
  g.addColorStop(1, fill[1]);
  c.fillStyle = g;
  c.fill(p);
  // ครีมราดบนยอดเนิน: แถบหนาตามสัน + หยดครีมย้อยเป็นระยะ
  const band = (x) => {
    let d = 11;
    for (let k = 0; k < 40; k++) {
      const xk = X0 + 30 + k * 68 + hash(k * 3.3 + ph) * 30;
      d += (10 + hash(k * 7.1 + ph) * 26) * Math.exp(-(((x - xk) / 14) ** 2));
    }
    return d;
  };
  const f = new Path2D();
  f.moveTo(X0, top(X0) - 2);
  for (let x = X0; x <= X1; x += 6) f.lineTo(x, top(x) - 2);
  for (let x = X1; x >= X0; x -= 6) f.lineTo(x, top(x) + band(x));
  f.closePath();
  c.fillStyle = frost;
  c.fill(f);
  c.save();
  c.clip(f);
  c.fillStyle = drip;   // เงาใต้ครีมนิด ๆ ให้ครีมมีความหนา
  c.translate(0, 5);
  c.fill(f);
  c.restore();
  c.fillStyle = frost;
  c.translate(0, -3);
  c.fill(f);
  c.translate(0, 3);
}
function bdLollipop(c, x, y, R, stick, tilt, cols) {
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  // ไม้
  const sg = c.createLinearGradient(-9, 0, 9, 0);
  sg.addColorStop(0, '#F3E6EE'); sg.addColorStop(0.5, '#FFFFFF'); sg.addColorStop(1, '#E5D2DE');
  c.fillStyle = sg;
  c.beginPath(); c.roundRect(-9, -stick, 18, stick, 8); c.fill();
  // ลูกอมวงก้นหอย
  c.translate(0, -stick - R * 0.85);
  const disc = new Path2D();
  disc.arc(0, 0, R, 0, TAU);
  const dg = c.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R);
  dg.addColorStop(0, cols[0]); dg.addColorStop(1, cols[1]);
  c.fillStyle = dg;
  c.fill(disc);
  c.save();
  c.clip(disc);
  c.strokeStyle = 'rgba(255,255,255,.88)';
  c.lineWidth = R * 0.17;
  c.lineCap = 'round';
  for (const arm of [0, Math.PI]) {
    c.beginPath();
    for (let i = 0; i <= 60; i++) {
      const u = i / 60, a = arm + u * TAU * 1.9, rr = R * (0.08 + u * 0.98);
      if (i) c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.stroke();
  }
  // เงาวาว
  c.fillStyle = 'rgba(255,255,255,.45)';
  c.beginPath(); c.ellipse(-R * 0.36, -R * 0.42, R * 0.36, R * 0.18, -0.6, 0, TAU); c.fill();
  c.restore();
  c.strokeStyle = cols[2];
  c.lineWidth = 3.5;
  c.stroke(disc);
  // โบว์ผูกคอไม้
  c.translate(0, R * 0.85 + 6);
  c.fillStyle = cols[3];
  for (const s of [-1, 1]) {
    c.beginPath(); c.moveTo(0, 0);
    c.bezierCurveTo(s * 18, -16, s * 34, -8, s * 30, 6);
    c.bezierCurveTo(s * 26, 14, s * 10, 8, 0, 0);
    c.fill();
  }
  c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill();
  c.restore();
}
function bdCandyCane(c, x, y, h, dir, col) {
  c.save();
  c.translate(x, y);
  const p = new Path2D();
  p.moveTo(0, 0);
  p.lineTo(0, -h);
  if (dir > 0) p.arc(34, -h, 34, Math.PI, TAU + 0.45);   // ขอโค้งข้ามบนไปทางขวา ปลายงุ้มลง
  else p.arc(-34, -h, 34, 0, -Math.PI - 0.45, true);
  c.lineCap = 'round';
  c.lineWidth = 30;
  c.strokeStyle = '#FFF8FB';
  c.stroke(p);
  c.setLineDash([22, 22]);
  c.lineCap = 'butt';
  c.lineWidth = 30;
  c.strokeStyle = col;
  c.stroke(p);
  c.setLineDash([]);
  c.lineWidth = 6;
  c.strokeStyle = 'rgba(255,255,255,.55)';
  c.translate(-7, 0);
  c.stroke(p);
  c.restore();
}
function bdGumdropTree(c, x, y, s, col, deep) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = '#F6E3EC';
  c.fillRect(-6, -40, 12, 40);
  const p = new Path2D();
  p.moveTo(-46, -36);
  p.bezierCurveTo(-50, -110, -16, -136, 0, -136);
  p.bezierCurveTo(16, -136, 50, -110, 46, -36);
  p.quadraticCurveTo(0, -24, -46, -36);
  const g = c.createLinearGradient(-40, -130, 40, -30);
  g.addColorStop(0, col); g.addColorStop(1, deep);
  c.fillStyle = g;
  c.fill(p);
  c.fillStyle = 'rgba(255,255,255,.75)';   // น้ำตาลเกล็ดบนเยลลี่
  for (let i = 0; i < 14; i++) {
    const a = hash(i * 9.1 + x) * 80 - 40, b = -40 - hash(i * 4.3 + x) * 88;
    c.beginPath(); c.arc(a * (1 - (b + 40) / -150), b, 2.6, 0, TAU); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,.4)';
  c.beginPath(); c.ellipse(-16, -100, 9, 20, 0.35, 0, TAU); c.fill();
  c.restore();
}
function bdCottonCloud(c, x, y, s, a = 1) {
  c.save();
  c.globalAlpha = a;
  c.translate(x, y);
  c.scale(s, s);
  const puff = bdPuffs([[-110, 10, 52], [-60, -22, 66], [4, -38, 78], [70, -16, 62], [118, 12, 46], [-40, 26, 50], [40, 24, 54]]);
  c.fillStyle = 'rgba(232,170,214,.35)';   // เงาใต้ก้อน
  c.save(); c.translate(6, 14); c.fill(puff); c.restore();
  const g = c.createLinearGradient(0, -110, 0, 70);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.55, '#FFE6F4'); g.addColorStop(1, '#F7C6E4');
  c.fillStyle = g;
  c.fill(puff);
  c.fillStyle = 'rgba(255,255,255,.7)';
  for (const [px, py, pr] of [[-60, -40, 26], [6, -64, 30], [70, -34, 20]]) { c.beginPath(); c.ellipse(px, py, pr, pr * 0.55, -0.2, 0, TAU); c.fill(); }
  c.restore();
}
function sweetBackdropPaint(c) {
  const [X0, Y0, X1, Y1] = BD_BOX, W = X1 - X0;
  // ฟ้าพาสเทล: ม่วงลาเวนเดอร์ → ชมพูนม → ครีมพีชที่ขอบฟ้า
  const sky = c.createLinearGradient(0, Y0, 0, BD_HZ);
  sky.addColorStop(0, '#C99AEB');
  sky.addColorStop(0.42, '#EDB8E6');
  sky.addColorStop(0.82, '#FFD6EA');
  sky.addColorStop(1, '#FFE9EE');
  c.fillStyle = sky;
  c.fillRect(X0, Y0, W, BD_HZ - Y0 + 40);
  // ไฟส่องเวทีนุ่ม ๆ หลังตัวน้อง + แสงอุ่นขอบฟ้า
  bdGlow(c, 300, 300, 700, '255,246,250', 0.3);
  bdGlow(c, 300, BD_HZ, 900, '255,232,222', 0.45, 0.35);
  // โบเก้ลอยในฟ้า (ตรงหลังหัวน้องจางลง ไม่ให้รก)
  const BK = ['255,173,218', '216,184,255', '175,240,220', '255,214,184', '255,240,170', '255,255,255'];
  for (let i = 0; i < 52; i++) {
    const x = X0 + hash(i * 3.1 + 7) * W, y = Y0 + 40 + hash(i * 5.3 + 2) * (BD_HZ - Y0 - 120);
    const r = 16 + hash(i * 7.7 + 1) ** 2 * 84;
    const calm = Math.abs(x - 300) < 300 && y > -120 ? 0.45 : 1;
    bdBokeh(c, x, y, r, BK[i % BK.length], (0.4 + hash(i * 1.9) * 0.35) * calm);
  }
  // เมฆสายไหมสองข้าง + ก้อนไกลจาง ๆ
  bdCottonCloud(c, -330, -140, 0.8, 0.75);
  bdCottonCloud(c, 1010, -200, 0.9, 0.75);
  bdCottonCloud(c, -150, 120, 1.15);
  bdCottonCloud(c, 790, 70, 1.25);
  // เนินขนมสองชั้น (ไกล: มิ้นต์ · ใกล้: ชมพู) ราดครีมขาวย้อย
  bdCandyHill(c, BD_HZ - 30, 190, 0.0042, 0.011, 1.2, ['#9EE3D0', '#C8F0E4'], '#FFFFFF', 'rgba(150,170,200,.35)');
  bdGumdropTree(c, -520, BD_HZ - 40, 1.0, '#FFC4E1', '#F49AC8');
  bdGumdropTree(c, 1180, BD_HZ - 50, 1.1, '#C9B5FF', '#A68CF2');
  bdCandyHill(c, BD_HZ + 6, 120, 0.0055, 0.014, 3.4, ['#F4A9D2', '#F8CDE4'], '#FFFFFF', 'rgba(220,120,180,.4)');
  // อมยิ้มยักษ์ + ไม้เท้าลูกกวาด ปักบนเนินสองข้าง (ห่างตัวน้อง)
  bdLollipop(c, -300, BD_HZ + 14, 96, 300, -0.08, ['#FFD2EA', '#FFA6D2', '#E98DBE', '#9AF5DE']);
  bdLollipop(c, 930, BD_HZ + 10, 84, 260, 0.1, ['#E7DAFF', '#C7AEFF', '#A992E6', '#FFADDA']);
  bdCandyCane(c, -40, BD_HZ + 20, 250, 1, '#FF9CCB');
  bdCandyCane(c, 660, BD_HZ + 20, 220, -1, '#B9A2FF');
  bdGumdropTree(c, 1320, BD_HZ + 10, 0.85, '#9AF5DE', '#55D6B6');
  bdGumdropTree(c, -720, BD_HZ + 10, 0.9, '#FFE38A', '#F5C451');
  // ไอหมอกชมพูกลืนโคนของทุกชิ้นเข้ากับขอบฟ้า (ดันฉากไปข้างหลัง)
  const haze = c.createLinearGradient(0, BD_HZ - 260, 0, BD_HZ + 30);
  haze.addColorStop(0, 'rgba(255,230,242,0)');
  haze.addColorStop(1, 'rgba(255,230,242,.32)');
  c.fillStyle = haze;
  c.fillRect(X0, BD_HZ - 260, W, 290);
  // พื้นตารางมันวาว (ม่วงชมพูอ่อน/ครีม) จางเข้าขอบฟ้า + เงาสะท้อน
  bdCheckerFloor(c, '#EDB6E2', '#FFEAF5');
  const fh = c.createLinearGradient(0, BD_HZ, 0, BD_HZ + 120);
  fh.addColorStop(0, 'rgba(255,228,240,.9)');
  fh.addColorStop(1, 'rgba(255,228,240,0)');
  c.fillStyle = fh;
  c.fillRect(X0, BD_HZ, W, 120);
  bdGlow(c, 300, FEET_Y + 40, 620, '255,250,252', 0.35, 0.3);
  // แท่นเค้กกลมใต้เท้า: ผิวครีมชมพู ขอบหน้าลายทาง + ครีมย้อย
  const st = bdStage(c, 372, 70, 50, ['#FFF7FB', '#FFD6EA'], ['#FFB8DA', '#F58CC2'], 'rgba(255,255,255,.9)');
  c.save();
  const side = new Path2D();
  side.moveTo(st.cx - st.rx, st.cy);
  side.ellipse(st.cx, st.cy, st.rx, st.ry, 0, Math.PI, 0, true);
  side.lineTo(st.cx + st.rx, st.cy + st.h);
  side.ellipse(st.cx, st.cy + st.h, st.rx, st.ry, 0, 0, Math.PI, false);
  side.closePath();
  c.clip(side);
  c.fillStyle = 'rgba(255,255,255,.4)';
  for (let i = -12; i <= 12; i++) {
    const x = st.cx + i * 34;
    c.beginPath(); c.moveTo(x, st.cy); c.lineTo(x + 14, st.cy); c.lineTo(x + 14, st.cy + st.ry + st.h + 4); c.lineTo(x, st.cy + st.ry + st.h + 4); c.fill();
  }
  c.restore();
  // ครีมย้อยรอบขอบแท่น
  c.fillStyle = '#FFFFFF';
  const drip = new Path2D();
  for (let i = 0; i <= 64; i++) {
    const a = Math.PI * (i / 64);
    const x = st.cx + Math.cos(a) * st.rx, y = st.cy + Math.sin(a) * st.ry;
    const d = 8 + (i % 4 === 1 ? 16 + hash(i) * 14 : 0);
    if (!i) drip.moveTo(x, y - 4);
    drip.lineTo(x, y + d);
  }
  for (let i = 64; i >= 0; i--) {
    const a = Math.PI * (i / 64);
    drip.lineTo(st.cx + Math.cos(a) * st.rx, st.cy + Math.sin(a) * st.ry - 4);
  }
  drip.closePath();
  c.fill(drip);
  // ประกายนิ่งในฟ้า + ขอบมืดนุ่ม (ดึงสายตาเข้ากลาง)
  for (let i = 0; i < 34; i++) {
    const x = X0 + hash(i * 6.1 + 40) * W, y = Y0 + 40 + hash(i * 2.7 + 41) * (BD_HZ - Y0 - 80);
    swSparkle(c, x, y, 5 + hash(i + 70) * 10, 0.55 + hash(i + 71) * 0.4, i % 3 ? '#FFFFFF' : '#FFF3B0');
  }
  const vg = c.createRadialGradient(300, 330, 640, 300, 330, 1500);
  vg.addColorStop(0, 'rgba(170,110,200,0)');
  vg.addColorStop(1, 'rgba(170,110,200,.55)');
  c.fillStyle = vg;
  c.fillRect(X0, Y0, W, Y1 - Y0);
  bdEdgeFade(c, 'rgba(196,140,214,1)');
}
const SWEET_BACKDROP = { paint: sweetBackdropPaint, outer: '#C48CD6' };

// ── องค์หญิงหิมะ: "คืนวังน้ำแข็ง" — ฟ้ากลางคืนกรมท่า ดาว แสงเหนือ พระจันทร์ ภูเขาน้ำแข็ง วังน้ำแข็ง สนคลุมหิมะ ผลึกน้ำแข็ง ทะเลสาบน้ำแข็ง ──
function bdMountains(c, base, hi, lo, seed, fill, snow) {
  const [X0, , X1] = BD_BOX;
  const pts = [];
  for (let x = X0 - 60, i = 0; x <= X1 + 60; i++) {
    const w = 70 + hash(seed + i * 3.7) * 110;
    const peak = i % 2 === 0;
    pts.push([x, base - (peak ? lo + hash(seed + i * 1.3) * (hi - lo) : lo * 0.4 * hash(seed + i * 5.1))]);
    x += w;
  }
  const p = new Path2D();
  p.moveTo(X0 - 60, BD_HZ + 20);
  for (const [x, y] of pts) p.lineTo(x, y);
  p.lineTo(X1 + 60, BD_HZ + 20);
  p.closePath();
  const g = c.createLinearGradient(0, base - hi, 0, BD_HZ + 20);
  g.addColorStop(0, fill[0]);
  g.addColorStop(1, fill[1]);
  c.fillStyle = g;
  c.fill(p);
  // หิมะบนยอด: สามเหลี่ยมขอบหยักใต้ยอดแหลม
  c.fillStyle = snow;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], [xl, yl] = pts[i - 1], [xr, yr] = pts[i + 1];
    if (y > yl || y > yr) continue;
    const k = 0.32;
    const a = [x + (xl - x) * k, y + (yl - y) * k], b = [x + (xr - x) * k, y + (yr - y) * k];
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(...b);
    c.lineTo(b[0] - (b[0] - x) * 0.3, b[1] - 6);
    c.lineTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 8);
    c.lineTo(a[0] + (x - a[0]) * 0.3, a[1] - 4);
    c.lineTo(...a);
    c.closePath();
    c.fill();
  }
}
function bdPine(c, x, y, h, body, snow, a = 1) {
  c.save();
  c.globalAlpha = a;
  c.translate(x, y);
  c.fillStyle = body;
  c.fillRect(-h * 0.035, -h * 0.12, h * 0.07, h * 0.14);
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers;
    const yb = -h * 0.1 - h * 0.78 * t0, yt = yb - h * 0.42;
    const w = h * 0.36 * (1 - t0 * 0.62);
    const p = new Path2D();
    p.moveTo(-w, yb);
    p.quadraticCurveTo(-w * 0.45, yb - h * 0.08, 0, yt);
    p.quadraticCurveTo(w * 0.45, yb - h * 0.08, w, yb);
    p.quadraticCurveTo(0, yb + h * 0.05, -w, yb);
    c.fillStyle = body;
    c.fill(p);
    // หิมะเกาะบนชั้น
    const s = new Path2D();
    s.moveTo(-w * 0.7, yb - h * 0.06);
    s.quadraticCurveTo(-w * 0.3, yb - h * 0.16, 0, yt + h * 0.02);
    s.quadraticCurveTo(w * 0.3, yb - h * 0.16, w * 0.75, yb - h * 0.05);
    s.quadraticCurveTo(w * 0.3, yb - h * 0.02, 0, yb - h * 0.08);
    s.quadraticCurveTo(-w * 0.3, yb - h * 0.01, -w * 0.7, yb - h * 0.06);
    c.fillStyle = snow;
    c.fill(s);
  }
  c.restore();
}
function bdIcePalace(c, cx, base) {
  c.save();
  bdGlow(c, cx, base - 160, 420, '170,200,255', 0.45);
  const body = c.createLinearGradient(0, base - 420, 0, base);
  body.addColorStop(0, '#E6F0FF');
  body.addColorStop(1, '#9DB9EC');
  const line = 'rgba(110,140,210,.9)';
  const tower = (x, w, h, roofH) => {
    c.fillStyle = body;
    c.beginPath(); c.rect(x - w / 2, base - h, w, h); c.fill();
    c.strokeStyle = line; c.lineWidth = 3; c.stroke();
    // หลังคายอดแหลมน้ำแข็ง
    const rg = c.createLinearGradient(x - w, 0, x + w, 0);
    rg.addColorStop(0, '#CFE6FF'); rg.addColorStop(0.5, '#FFFFFF'); rg.addColorStop(1, '#8FB2EA');
    c.fillStyle = rg;
    c.beginPath(); c.moveTo(x - w * 0.62, base - h); c.lineTo(x, base - h - roofH); c.lineTo(x + w * 0.62, base - h); c.closePath(); c.fill(); c.stroke();
    // หน้าต่างโค้งเรือง
    for (let k = 0; k < Math.floor(h / 70); k++) {
      const wy = base - h + 30 + k * 64;
      c.fillStyle = 'rgba(255,246,208,.95)';
      c.beginPath(); c.moveTo(x - 7, wy + 22); c.lineTo(x - 7, wy + 6); c.arc(x, wy + 6, 7, Math.PI, 0); c.lineTo(x + 7, wy + 22); c.closePath(); c.fill();
      bdGlow(c, x, wy + 12, 22, '255,240,190', 0.5);
    }
  };
  // กำแพงล่าง + ประตูโค้ง
  c.fillStyle = body;
  c.beginPath(); c.rect(cx - 210, base - 120, 420, 120); c.fill();
  c.strokeStyle = line; c.lineWidth = 3; c.stroke();
  for (let i = -5; i <= 5; i++) { c.fillStyle = body; c.fillRect(cx + i * 38 - 12, base - 138, 24, 20); c.strokeRect(cx + i * 38 - 12, base - 138, 24, 20); }
  c.fillStyle = 'rgba(255,240,200,.9)';
  c.beginPath(); c.moveTo(cx - 34, base); c.lineTo(cx - 34, base - 56); c.arc(cx, base - 56, 34, Math.PI, 0); c.lineTo(cx + 34, base); c.closePath(); c.fill();
  bdGlow(c, cx, base - 40, 90, '255,236,180', 0.5);
  tower(cx - 170, 54, 230, 110);
  tower(cx + 170, 54, 250, 120);
  tower(cx - 92, 62, 300, 130);
  tower(cx + 92, 62, 320, 140);
  tower(cx, 84, 390, 190);
  // ประกายบนยอด
  for (const [x, y] of [[cx, base - 580], [cx - 92, base - 430], [cx + 92, base - 460]]) snSparkle(c, x, y, 18, 0.95);
  c.restore();
}
function bdCrystalCluster(c, x, y, s, flip = 1) {
  c.save();
  c.translate(x, y);
  c.scale(s * flip, s);
  bdGlow(c, 0, -80, 170, '150,215,255', 0.4);
  const xtal = (dx, h, w, ang) => {
    c.save();
    c.translate(dx, 0);
    c.rotate(ang);
    const p = new Path2D();
    p.moveTo(-w, 0); p.lineTo(-w, -h * 0.78); p.lineTo(0, -h); p.lineTo(w, -h * 0.78); p.lineTo(w, 0); p.closePath();
    const g = c.createLinearGradient(-w, 0, w, 0);
    g.addColorStop(0, 'rgba(232,248,255,.92)'); g.addColorStop(0.5, 'rgba(160,214,250,.88)'); g.addColorStop(1, 'rgba(98,160,232,.9)');
    c.fillStyle = g;
    c.fill(p);
    c.strokeStyle = 'rgba(255,255,255,.9)';
    c.lineWidth = 3;
    c.stroke(p);
    c.beginPath(); c.moveTo(0, -h); c.lineTo(0, -6); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.stroke();
    c.restore();
  };
  xtal(-48, 150, 20, -0.32);
  xtal(42, 130, 18, 0.36);
  xtal(-18, 230, 28, -0.08);
  xtal(20, 190, 24, 0.12);
  xtal(64, 90, 14, 0.58);
  // หิมะกองที่โคน
  const pile = bdPuffs([[-70, 0, 30], [-30, -6, 38], [16, -4, 40], [60, 2, 30]]);
  c.fillStyle = '#F4F9FF';
  c.fill(pile);
  c.restore();
}
function snowBackdropPaint(c) {
  const [X0, Y0, X1, Y1] = BD_BOX, W = X1 - X0;
  // ฟ้ากลางคืน: กรมท่าเข้ม → น้ำเงินคราม → ฟ้าอมม่วงที่ขอบฟ้า
  const sky = c.createLinearGradient(0, Y0, 0, BD_HZ);
  sky.addColorStop(0, '#0C1036');
  sky.addColorStop(0.4, '#1C2766');
  sky.addColorStop(0.78, '#3C58A6');
  sky.addColorStop(1, '#8EAFEC');
  c.fillStyle = sky;
  c.fillRect(X0, Y0, W, BD_HZ - Y0 + 40);
  // ทางช้างเผือกจาง ๆ เฉียงฟ้า
  c.save();
  c.translate(300, -120);
  c.rotate(-0.32);
  bdGlow(c, 0, 0, 1300, '150,160,255', 0.16, 0.16);
  c.restore();
  // ดาวเล็ก ๆ ทั่วฟ้า + ดาววิบ
  for (let i = 0; i < 260; i++) {
    const x = X0 + hash(i * 2.3 + 900) * W, y = Y0 + hash(i * 4.1 + 901) * (BD_HZ - Y0 - 60);
    const r = 1.2 + hash(i * 6.7 + 902) ** 3 * 3.2;
    c.fillStyle = `rgba(${i % 5 ? '255,255,255' : '190,220,255'},${0.35 + hash(i + 903) * 0.6})`;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  for (let i = 0; i < 16; i++) {
    const x = X0 + hash(i * 5.9 + 950) * W, y = Y0 + 30 + hash(i * 3.3 + 951) * (BD_HZ - Y0 - 220);
    snSparkle(c, x, y, 10 + hash(i + 952) * 12, 0.75);
  }
  // แสงเหนือ: ม่านแสงมิ้นต์-ลาเวนเดอร์ ไหลเป็นคลื่นเหนือหัว (สูงขึ้นทางสองข้าง)
  c.save();
  c.globalCompositeOperation = 'lighter';
  // แถบละหนึ่งพิกเซลของภาพสำรองพอดี — กว้างกว่านี้ขอบล่างแต่ละแถบเป็นขั้นบันได กล้องซูมแล้วเห็นเป็นริ้ว
  const m0 = c.getTransform(), step = Math.max(0.8, 1 / Math.hypot(m0.a, m0.b));
  for (const [y0, amp, ph, hgt, rgbA, rgbB, al] of [
    [40, 70, 0.4, 260, '90,255,210', '150,120,255', 0.2],
    [-60, 90, 2.1, 320, '120,220,255', '200,140,255', 0.15],
  ]) {
    for (let x = X0; x <= X1; x += step) {
      const lift = ((x - 300) / 1300) ** 2 * 260;
      const yb = y0 - lift + Math.sin(x * 0.0042 + ph) * amp + Math.sin(x * 0.011 + ph * 2) * 22;
      const hh = hgt * (0.7 + 0.3 * Math.sin(x * 0.007 + ph * 3));
      const g = c.createLinearGradient(0, yb, 0, yb - hh);
      g.addColorStop(0, bdRgba(rgbA, 0));
      const ray = 0.82 + 0.18 * Math.sin(x * 0.045 + ph * 5);   // ลำแสงแนวตั้งนุ่ม ๆ ของม่านแสงเหนือ
      g.addColorStop(0.12, bdRgba(rgbA, al * ray));
      g.addColorStop(0.55, bdRgba(rgbB, al * 0.55 * ray));
      g.addColorStop(1, bdRgba(rgbB, 0));
      c.fillStyle = g;
      c.fillRect(x, yb - hh, step, hh);   // กว้างเท่าระยะห่างพอดี — ขอบชนกันไม่ซ้อน จึงไม่เกิดริ้วสว่าง
    }
  }
  c.restore();
  // พระจันทร์ซ้ายบน
  bdGlow(c, -190, 20, 300, '200,220,255', 0.5);
  const mg = c.createRadialGradient(-208, 0, 6, -190, 20, 62);
  mg.addColorStop(0, '#FFFFFF'); mg.addColorStop(1, '#D6E4FF');
  c.fillStyle = mg;
  c.beginPath(); c.arc(-190, 20, 62, 0, TAU); c.fill();
  c.fillStyle = 'rgba(170,190,235,.35)';
  for (const [x, y, r] of [[-170, 6, 12], [-212, 40, 9], [-178, 46, 6], [-214, 4, 5]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  // ภูเขาน้ำแข็งสองชั้น
  bdMountains(c, BD_HZ - 10, 300, 170, 11, ['#6C8BD0', '#9FBCEE'], 'rgba(240,248,255,.9)');
  c.save();
  c.translate(960, BD_HZ + 6);
  c.scale(0.78, 0.78);
  bdIcePalace(c, 0, 0);
  c.restore();
  // หมอกฟ้าทับวัง/ภูเขาไกล ดันไปข้างหลัง (วังไม่แย่งความเด่นจากน้อง)
  const far = c.createLinearGradient(0, BD_HZ - 480, 0, BD_HZ);
  far.addColorStop(0, 'rgba(120,150,225,0)');
  far.addColorStop(1, 'rgba(120,150,225,.32)');
  c.fillStyle = far;
  c.fillRect(X0, BD_HZ - 480, W, 480);
  bdMountains(c, BD_HZ + 10, 170, 80, 47, ['#4A69B4', '#7D9EE0'], 'rgba(235,245,255,.92)');
  // สนคลุมหิมะ (ไกล: จาง · ใกล้สองข้าง: เข้ม)
  for (const [x, h] of [[90, 100], [140, 80], [470, 110], [530, 76], [-80, 120], [700, 120]]) bdPine(c, x, BD_HZ + 14, h, '#3A5A9A', '#E8F2FF', 0.75);
  for (const [x, h] of [[-560, 400], [-420, 300], [-680, 300], [1220, 380], [1360, 290], [1100, 250]]) bdPine(c, x, BD_HZ + 40, h, '#1D3468', '#F2F8FF');
  // หมอกขอบฟ้า
  const haze = c.createLinearGradient(0, BD_HZ - 200, 0, BD_HZ + 30);
  haze.addColorStop(0, 'rgba(170,200,250,0)');
  haze.addColorStop(1, 'rgba(170,200,250,.45)');
  c.fillStyle = haze;
  c.fillRect(X0, BD_HZ - 200, W, 230);
  // ทะเลสาบน้ำแข็ง: สว่างที่ขอบฟ้า เข้มลงมาข้างหน้า + แสงสะท้อนพระจันทร์/แสงเหนือ + รอยน้ำแข็ง
  const ice = c.createLinearGradient(0, BD_HZ, 0, Y1);
  ice.addColorStop(0, '#C9DEFF');
  ice.addColorStop(0.35, '#8DAAE6');
  ice.addColorStop(1, '#3D5AA6');
  c.fillStyle = ice;
  c.fillRect(X0, BD_HZ, W, Y1 - BD_HZ);
  bdGlow(c, -190, BD_HZ + 160, 260, '235,242,255', 0.5, 2.2);
  bdGlow(c, 900, BD_HZ + 120, 240, '200,225,255', 0.35, 1.6);
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) bdGlow(c, X0 + 120 + i * 300, BD_HZ + 70, 120, i % 2 ? '120,255,220' : '170,140,255', 0.1, 2.4);
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,.28)';
  c.lineWidth = 2;
  c.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    let x = X0 + hash(i * 3.9 + 960) * W, y = BD_HZ + 60 + hash(i * 7.3 + 961) * (Y1 - BD_HZ - 80);
    c.beginPath(); c.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (hash(i * 11 + k) - 0.5) * 90; y += (hash(i * 13 + k) - 0.5) * 24; c.lineTo(x, y); }
    c.stroke();
  }
  // ผลึกน้ำแข็งสองข้าง + กองหิมะริมทะเลสาบ
  bdCrystalCluster(c, -200, FEET_Y + 40, 1.05);
  bdCrystalCluster(c, 830, FEET_Y + 30, 0.95, -1);
  for (const [x, y, s] of [[-470, FEET_Y + 150, 1.4], [1080, FEET_Y + 140, 1.3], [-700, FEET_Y + 60, 1], [1320, FEET_Y + 70, 1.1]]) {
    c.save(); c.translate(x, y); c.scale(s, s * 0.55);
    const pile = bdPuffs([[-120, 0, 70], [-40, -26, 86], [50, -18, 80], [130, 4, 64]]);
    const g = c.createLinearGradient(0, -110, 0, 60);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#BCD2F2');
    c.fillStyle = g; c.fill(pile);
    c.restore();
  }
  // แท่นน้ำแข็งกลมใต้เท้า: ผิวฝ้าขาวฟ้า ขอบหน้าน้ำแข็งใส + หิมะเกาะขอบ
  const st = bdStage(c, 366, 66, 44, ['#F6FBFF', '#C4DAF6'], ['#A6C4EE', '#5F84CC'], 'rgba(255,255,255,.95)');
  c.fillStyle = '#FFFFFF';
  for (let i = 0; i <= 40; i++) {
    const a = Math.PI * (i / 40);
    const x = st.cx + Math.cos(a) * st.rx, y = st.cy + Math.sin(a) * st.ry;
    c.beginPath(); c.arc(x, y, 7 + hash(i * 2.2 + 970) * 7, 0, TAU); c.fill();
  }
  c.strokeStyle = 'rgba(255,255,255,.5)';
  c.lineWidth = 2;
  c.save();
  c.translate(st.cx, st.cy);
  c.scale(1, st.ry / st.rx);
  for (let i = 0; i < 6; i++) {   // ลายเกล็ดหิมะสลักบนแท่น
    c.rotate(Math.PI / 3);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -st.rx * 0.7);
    for (const k of [0.3, 0.5]) { c.moveTo(0, -st.rx * k); c.lineTo(-st.rx * 0.08, -st.rx * (k + 0.1)); c.moveTo(0, -st.rx * k); c.lineTo(st.rx * 0.08, -st.rx * (k + 0.1)); }
    c.stroke();
  }
  c.restore();
  // เกล็ดหิมะค้างกลางอากาศ (ไกล = เล็กจาง · ใกล้ = ใหญ่นุ่ม)
  for (let i = 0; i < 70; i++) {
    const x = X0 + hash(i * 8.3 + 980) * W, y = Y0 + 60 + hash(i * 1.7 + 981) * (Y1 - Y0 - 160);
    if (Math.abs(x - 300) < 280 && y > -60 && y < FEET_Y) continue;   // ตรงตัวน้องเว้นไว้
    const big = hash(i + 982) > 0.85;
    if (big) bdBokeh(c, x, y, 18 + hash(i + 983) * 22, '235,245,255', 0.45);
    else snFlake(c, x, y, 5 + hash(i + 984) * 9, hash(i + 985) * TAU, 0.55 + hash(i + 986) * 0.4);
  }
  const vg = c.createRadialGradient(300, 330, 620, 300, 330, 1500);
  vg.addColorStop(0, 'rgba(8,10,40,0)');
  vg.addColorStop(1, 'rgba(8,10,40,.55)');
  c.fillStyle = vg;
  c.fillRect(X0, Y0, W, Y1 - Y0);
  bdEdgeFade(c, 'rgba(14,18,58,1)');
}
const SNOW_BACKDROP = { paint: snowBackdropPaint, outer: '#0E123A' };

/** ภาพสำรองของฉากหลังต่อสกิน: id → { cv, r } (r = พิกเซลต่อหน่วยไฟล์) */
const BD_CACHE = new Map();
/** ชุดนี้มีฉากหลังประจำสกินไหม */
export const cat2Backdrop = (id) => CAT2_OUTFITS[id]?.backdrop || null;
/**
 * วาดฉากหลังประจำสกินใต้ตัวน้อง (เรียกก่อน drawCat2 ด้วย x/เท้า/scale ชุดเดียวกัน)
 * opt.res = พิกเซลจริงต่อหน่วยเกม "ไม่รวมกล้อง" (ใช้เลือกความละเอียดภาพสำรอง — กล้องซูมเข้าไม่ต้องวาดใหม่ ฉากนุ่มลงเหมือนชัดตื้น)
 * ไม่ส่ง = คิดจาก transform ปัจจุบัน · คืน false ถ้าชุดนี้ไม่มีฉาก
 */
export function drawCat2Backdrop(ctx, x, feetY, scale, id, opt = {}) {
  const B = CAT2_OUTFITS[id]?.backdrop;
  if (!B) return false;
  const [X0, Y0, X1, Y1] = BD_BOX, BW = X1 - X0, BH = Y1 - Y0;
  const k = scale * UNIT;
  const m = ctx.getTransform();
  const base = (opt.res ?? Math.hypot(m.a, m.b)) * k;
  const want = Math.max(0.15, Math.min(base, Math.sqrt(BD_MAX_PX / (BW * BH))));
  let e = BD_CACHE.get(id);
  // วาดภาพสำรองใหม่เฉพาะตอนความละเอียดที่ต้องการต่างจากเดิมเกิน 25% (หมุนจอ/เปลี่ยนขนาด) — ไม่ใช่ทุกเฟรม
  if (!e || Math.abs(Math.log(want / e.r)) > Math.log(1.25)) {
    const cv = e?.cv || document.createElement('canvas');
    cv.width = Math.ceil(BW * want);
    cv.height = Math.ceil(BH * want);
    const c = cv.getContext('2d');
    c.setTransform(want, 0, 0, want, -X0 * want, -Y0 * want);
    B.paint(c);
    e = { cv, r: want };
    BD_CACHE.set(id, e);
  }
  ctx.save();
  ctx.translate(x, feetY);
  ctx.scale(k, k);
  ctx.translate(-300, -FEET_Y);
  ctx.fillStyle = B.outer;   // นอกภาพ (จอกว้างมาก/กล้องสั่น) = สีขอบภาพ ต่อเนื่องกัน
  ctx.fillRect(X0 - 8000, Y0 - 8000, BW + 16000, BH + 16000);
  ctx.drawImage(e.cv, X0, Y0, BW, BH);
  ctx.restore();
  return true;
}

/** ชุดที่วาดแบบใหม่แล้ว (หน้า Cat Lab ใช้บอกสถานะ) */
export const cat2Outfits = () => Object.keys(CAT2_OUTFITS);
/** ท่าเปิดตัว / ท่าแอ็ค (ยืนค้าง) ของชุด — มีเฉพาะชุดระดับ S · null = ชุดนี้ไม่มี */
export const cat2Intro = (id) => CAT2_OUTFITS[id]?.intro || null;
export const cat2Act = (id) => CAT2_OUTFITS[id]?.act || null;
const CAT2_OUTFITS = {
  // ── โบว์หวาน: โบว์ชมพูลายจุดบนหูขวา · ปลอกคอผ้าระบายชมพูมีกระดิ่ง · กระโปรงตูตู้สองชั้นขอบลูกไม้ ──
  bow: {
    neck(c, k) {
      laceCollar(c, k, PINK);
      if (!k.back) bell(c, 300 + (k.faceShift || 0), 428, 15, k.pal, Math.sin(k.t * 0.08) * 0.12);
    },
    skirt(c, k) { tutuSkirt(c, k, PINK); },
    ear(c, k) {
      // บนหูขวาจอ เอียงตามหู
      c.save();
      rotAt(c, { x: 392, y: 150 }, 0.35);
      ribbonBow(c, 392, 150, 34, k.pal, k.t);
      c.restore();
    },
  },
  // ── กะลาสีน้อย (ตามแบบผู้ใช้): เสื้อขาวแขนสั้น ปกฟ้าแถบขาว ผ้าผูกคอฟ้า · กางเกงขาสั้นฟ้ากระดุมทอง · หมวกขาวแถบฟ้า ──
  sailor: {
    pants: true,
    shirt: sailorShirt,
    collarPath() { const q = new Path2D(); for (const { lap } of sailorLaps()) q.addPath(lap); return q; },
    tubeSleeve: (c, band, upto, pal) => tubeSleeve(c, band, upto, pal),
    neck: sailorCollar,
    skirt: sailorShorts,
    hat: sailorHat,
  },
  // ── มงกุฎจิ๋ว (ตามแบบผู้ใช้): มงกุฎทองเพชรฟ้า · ผ้าคลุมไหล่ฟ้าแหวกหน้าขอบลูกไม้ ดาวทอง · โบว์ฟ้าเข็มกลัดทอง ──
  // ── เชฟน้อย: เสื้อเชฟขาวกระดุมสองแถว · ผ้าพันคอแดงผูกข้าง · กางเกงลายตาราง · หมวกเชฟทรงสูง ──
  chef: {
    pants: true,
    sitSleeve: CHEF_T.body,   // ท่าเกาท้อง: แขนเสื้อสั้นถึงก่อนศอก (แขนยาวทั้งท่อนดูขาด ๆ)
    shirt: (c, k) => sailorShirt(c, { ...k, T: CHEF_T }),
    neck: chefScarf,
    skirt: (c, k) => sailorShorts(c, { ...k, T: CHEF_P }),
    hat: chefToque,
  },
  // ── พยาบาลน้อย: เดรสชมพูพาสเทล ปกบัวขาว กระเป๋ากากบาทแดง · กระโปรงทรงเอชายขาว · หมวกพยาบาล ──
  nurse: {
    shirt: (c, k) => sailorShirt(c, { ...k, T: NURSE_T }),
    neck: nurseCollar,
    skirt: nurseSkirt,
    hat: nurseCap,
  },
  // ── ฮู้ดสตรีท: ฮู้ดมัสตาร์ด กระเป๋าจิงโจ้ ฮู้ดกองรอบคอ เชือกผูก · จ็อกเกอร์เทา · แก๊ปแดงกลับหลัง ──
  hoodie: {
    pants: true,
    sitSleeve: MUSTARD,
    shirt: (c, k) => sailorShirt(c, { ...k, T: HOODIE_T }),
    neck: hoodNeck,
    behind: hoodBehind,   // ฮู้ดกองหลังคอ — วาดก่อนตัว (มองหน้าเห็นโผล่ข้างไหล่)
    skirt: (c, k) => sailorShorts(c, { ...k, T: JOGGER_P }),
    hat: backCap,
  },
  // ── ร็อกเกอร์: เสื้อยืดแดงลายหน้ายิ้มปีศาจ · เสื้อกั๊กหนังดำปกเทา · ขาสั้นเทาเข้ม เข็มขัด · แว่นดำบนตา ──
  rocker: {
    pants: true,
    sitSleeve: ROCK_RED,
    shirt: (c, k) => sailorShirt(c, { ...k, T: ROCK_T }),
    neck: rockNeck,
    skirt: (c, k) => sailorShorts(c, { ...k, T: DENIM_P }),
    eyes: rockShades,   // แว่นดำทับตา (วาดหลังหน้า)
    earL: earHoops,     // ต่างหูเม็ดเหล็กหูซ้าย
  },
  // ── พ่อมดน้อย: เสื้อคลุมน้ำเงินม่วงดาวเดือนทอง · กระโปรงคลุมยาวชายทอง · หมวกกรวยปลายงอ · เข็มกลัดดาว ──
  wizard: {
    sitSleeve: WIZ,
    shirt: (c, k) => sailorShirt(c, { ...k, T: WIZ_T }),
    neck: wizardClasp,
    skirt: (c, k) => nurseSkirt(c, { ...k, SK: ROBE_SK }),
    hat: wizardHat,
  },
  // ── โจรสลัดน้อย: เสื้อลายทางแดงคอวี ผ้าคาดเอวแดง · กางเกงน้ำตาลปะผ้า · หมวกสามเหลี่ยมกะโหลก · ผ้าปิดตา ──
  pirate: {
    pants: true,
    shirt: (c, k) => sailorShirt(c, { ...k, T: PIR_T }),
    skirt: (c, k) => sailorShorts(c, { ...k, T: PIR_P }),
    hat: pirateHat,
    eyes: eyePatch,
  },
  // ── นินจาส้ม: ชุดนินจาส้มแขนยาว ปกไขว้กรมท่า เข็มขัดผูกปม · กางเกงกรมท่า · ผ้าคาดหัวแผ่นเหล็ก ──
  ninja: {
    pants: true,
    sitSleeve: NJ,
    shirt: (c, k) => sailorShirt(c, { ...k, T: NINJA_T }),
    skirt: (c, k) => sailorShorts(c, { ...k, T: NINJA_P }),
    hat: ninjaBand,
    behind: ninjaTailsBehind,   // มุมหน้า: ชายผ้าอยู่หลังหัว
  },
  // ── องค์หญิงหิมะ (Snow Princess Meow · LEGENDARY) — ออกแบบใหม่รอบสอง (เทียร่า ผ้าคลุม เครื่องเพชร) ──
  princess: {
    starEyes: 'ice',   // แบบเดียวกับชุดขนมหวาน แต่ดาวสีฟ้าอ่อน (ผู้ใช้สั่ง 15 ต.ค.)
    behind: snowAura, behindBody: true, behindBack: true,
    chinShade: 'rgba(68,121,217,.12)',   // เงาใต้คางโทนฟ้า (เงาน้ำตาลทำให้เสื้อดูหม่น)
    front: snowFront,
    prop: snowWand,
    sitSleeve: snowSitSleeve,   // ไม่มีแขนเสื้อ — กำไลทองที่อุ้งเท้า
    shirt: snowBodice,
    neck: snowStole,
    skirt: snowSkirt,
    backCape: snowBackCape,     // มองหลัง: ผ้าคลุมทับหลัง หางพาดทับ
    ankle: snowAnkle,
    tailBow: snowTailBow,
    hat: snowTiara,
    intro: SNOW_INTRO,   // ท่าเปิดตัว (~7.2 วิ มีกล้อง): จอน้ำแข็งเกาะ → เกล็ดหิมะลอยลง → ดอกน้ำแข็งบาน น้องปรากฏ → ยิงเวททำลายจอ → กระโดด ปัดคทา → โพส
    act: SNOW_ACT,       // ท่าแอ็ค: ชูคทาสูง อุ้งเท้าขวาเสกน้ำแข็ง (เกล็ดหิมะหมุนในวงเวท) ขยิบตา
    backdrop: SNOW_BACKDROP,    // ฉากหลังประจำสกิน (ภาพนิ่ง): คืนวังน้ำแข็ง
  },
  // ── ลูกคุณหนูจอมซน (ระดับ S): ออร่าทอง ลำแสงทอง เหรียญทองลอยวน ผ้าคลุมแดงซับทอง · เชิ้ตขาว กั๊กแดงทอง ·
  //    ระบายคอลูกไม้ เข็มกลัดทับทิม · ขาสั้นดำแถบทอง · หมวกทรงสูงเอียง ขนนกทอง · แว่นข้างเดียวทองมีโซ่ ──
  noble: {
    pants: true,
    behind: nobleBehind,
    behindBody: true,
    sitSleeve: ['#FFFFFF', '#F6F4F0', '#DDD8CF'],
    shirt: (c, k) => sailorShirt(c, { ...k, T: NOBLE_T }),
    neck: nobleNeck,
    skirt: (c, k) => sailorShorts(c, { ...k, T: NOBLE_P }),
    hat: nobleHat,
    eyes: monocle,
  },
  // ── ระดับ S (ร่างแรก) ──
  fruit: {
    behind: fruitBehind, behindBody: true,
    sitSleeve: FRUIT_T.body,
    shirt: (c, k) => sailorShirt(c, { ...k, T: FRUIT_T }),
    neck: fruitNeck,
    skirt: (c, k) => tutuSkirt(c, k, WATERMELON),
    hat: fruitHat,
  },
  // ── เหมียวขนมหวานมหัศจรรย์ (Sweet Magic Meow · ระดับ S) — วาดใหม่ทั้งชุดตามบอร์ดออกแบบผู้ใช้ ──
  sweet: {
    starEyes: 'yellow',   // ใส่ชุดนี้ (แมวทุกตัว): จุดประกายขาวเล็กสองจุดในตา → ดาวเหลืองอ่อน (วงขาวใหญ่คงเดิม) · สีใน EYE_STARS
    behind: sweetAura, behindBody: true, behindBack: true,
    chinShade: 'rgba(255,0,140,.12)',   // เงาใต้คางโทนชมพู (เงาน้ำตาลทำให้เสื้อดูหม่น)
    front: sweetFront,
    prop: sweetStaff,
    sitSleeve: sweetSitSleeve,
    shirt: sweetBodice,
    neck: sweetCollar,
    skirt: sweetSkirt,
    ear: sweetEarBow,
    earBack: sweetEarRibbon,
    ankle: sweetSocks,
    tailBow: sweetTailBow,
    hat: sweetHat,
    intro: SWEET_INTRO,   // ท่าเปิดตัว (~4.7 วิ) — เล่นตอนเลือกดู/ใส่ชุด/แตะน้อง · กดข้ามได้
    act: SWEET_ACT,       // ท่าแอ็คประจำสกิน — ท่าจบของท่าเปิดตัว และยืนค้างหน้าล็อบบี้ได้
    backdrop: SWEET_BACKDROP,   // ฉากหลังประจำสกิน (ภาพนิ่ง): เวทีขนมหวานในฝัน
  },
  lunar: {
    behind: lunarBehind, behindBody: true,
    sitSleeve: NIGHT,
    shirt: (c, k) => sailorShirt(c, { ...k, T: LUNAR_T }),
    skirt: (c, k) => nurseSkirt(c, { ...k, SK: LUNAR_SK }),
    hat: lunarHat,
  },
  rainbow: {
    behind: rainbowBehind, behindBody: true,
    sitSleeve: RAINBOW_T.body,
    shirt: (c, k) => sailorShirt(c, { ...k, T: RAINBOW_T }),
    skirt: rainbowSkirt,
    hat: rainbowHat,
  },
  dryad: {
    behind: dryadBehind, behindBody: true,
    sitSleeve: LEAF,
    shirt: (c, k) => sailorShirt(c, { ...k, T: DRYAD_T }),
    skirt: dryadSkirt,
    hat: dryadHat,
  },
  tiara: {
    neck: princessCape,
    hat: goldCrown,
  },
};

/**
 * ขอบสีนุ่ม: ตามขอบทุกรูปที่ลงสีใน ops ลากเส้นโปร่งหลายความกว้างซ้อนกัน
 * นอกรูป = สีในรูป (inCol) จางออก · ในรูป = สีรอบนอก (outCol) จางเข้า → ขอบกลายเป็นไล่สีกว้าง ~10 หน่วย
 * ทำงานกับเส้นล้วน (ไม่ใช้ ctx.filter) จึงได้ผลเหมือนกันทุกเบราว์เซอร์รวม Safari
 */
const FEATHER = [22, 19, 16, 13, 10, 7.5, 5, 2.5].map((w) => [w, 0.085]);   // หลายชั้นบาง ๆ = ไล่สีเนียน ไม่เป็นขั้น
function featherOps(c, ops, inCol, outCol) {
  for (const op of ops) {
    if (op.kind === 'group') { featherOps(c, op.ops, inCol, outCol); continue; }
    if (op.kind === 'clip') {
      c.save();
      c.clip(op.clip);
      featherOps(c, op.ops, inCol, outCol);
      c.restore();
      continue;
    }
    if (!op.fill || !op.path) continue;
    const a0 = c.globalAlpha;
    for (const inside of [false, true]) {
      c.save();
      if (inside) c.clip(op.path);
      else {
        const out = new Path2D();
        out.rect(...HOLE_BOX);
        out.addPath(op.path);
        c.clip(out, 'evenodd');
      }
      c.strokeStyle = inside ? outCol : inCol;
      c.lineJoin = 'round';
      for (const [w, a] of FEATHER) {
        c.globalAlpha = a0 * a;
        c.lineWidth = w;
        c.stroke(op.path);
      }
      c.restore();
    }
    c.globalAlpha = a0;
  }
}

/**
 * กรอบพิกเซลจริงของตัวน้องบนผ้าใบ (กรอบไฟล์ box ตาม transform m · ตัดตามขอบผ้าใบ) — { x, y, w, h } พิกเซลเต็ม
 * box ตั้งต้นคลุมทั้งตัว (0..600 × −20..700) เผื่อขอบรอบละ 200 สำหรับชิ้นที่ยืด/หมุน
 */
function catPxRect(m, W, H, box = [-200, -200, 800, 900]) {
  const [bx0, by0, bx1, by1] = box;
  const P = [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  const x0 = Math.max(0, Math.floor(Math.min(...P.map((q) => q[0])))), y0 = Math.max(0, Math.floor(Math.min(...P.map((q) => q[1]))));
  const x1 = Math.min(W, Math.ceil(Math.max(...P.map((q) => q[0])))), y1 = Math.min(H, Math.ceil(Math.max(...P.map((q) => q[1]))));
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}
/**
 * ผ้าใบชั้นแยกขนาดเท่าจอ (ล้างแล้ว) — วาดของลงไปก่อนแล้วไล่จาง/ตัดด้วย destination-in ค่อยแปะกลับ
 * r = ทำงานเฉพาะกรอบนี้ (พิกเซลจริง · ตัดขอบไว้ให้แล้ว): ล้าง/ไล่จาง/แปะกลับแค่ในกรอบ ไม่ใช่ทั้งจอ
 * (ชั้นนี้ใช้ทุกเฟรมกับขอบแก้มนุ่ม — เดิมล้าง + ไล่จาง + แปะทั้งจอสามรอบต่อเฟรม ทั้งที่ของอยู่แค่ที่หัว)
 */
let fadeCv = null;
function fadeLayer(ctx, r = null) {
  if (!fadeCv) fadeCv = document.createElement('canvas').getContext('2d');
  const cv = fadeCv.canvas;
  if (cv.width !== ctx.canvas.width || cv.height !== ctx.canvas.height) {
    cv.width = ctx.canvas.width;
    cv.height = ctx.canvas.height;
  }
  fadeCv.restore();   // คืนกรอบตัดของรอบก่อน (สแต็กว่าง = ไม่ทำอะไร)
  fadeCv.save();
  fadeCv.setTransform(1, 0, 0, 1, 0, 0);
  fadeCv.globalCompositeOperation = 'source-over';
  fadeCv.globalAlpha = 1;
  if (r) {
    fadeCv.clearRect(r.x, r.y, r.w, r.h);
    fadeCv.beginPath();
    fadeCv.rect(r.x, r.y, r.w, r.h);
    fadeCv.clip();
  } else fadeCv.clearRect(0, 0, cv.width, cv.height);
  return fadeCv;
}
/** แปะชั้นแยกกลับลงจอ — เฉพาะกรอบ r ถ้ามี */
function blitFade(ctx, L, r) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (r) ctx.drawImage(L.canvas, r.x, r.y, r.w, r.h, r.x, r.y, r.w, r.h);
  else ctx.drawImage(L.canvas, 0, 0);
  ctx.restore();
}

/** มุมข้างเต็ม (drawSideView) — ปิดไว้ตามที่ผู้ใช้สั่ง ใช้แค่มุมเฉียงตอนหัน */
const SIDE_VIEW = false;
/** เงาพ่นสี (ขอบใน + เงาใต้คาง) — ปิดได้ถ้าเครื่องช้า */
export const AIRBRUSH = { on: true };
// ระดับกราฟิก "ประหยัดแบต" ไม่พ่นสี (ใช้แค่ไล่สีผิว) — เงาฟุ้งกินแรงเครื่องราว 1/3 ของการวาดตัวน้อง
const airbrushOn = () => AIRBRUSH.on && gfxLevel() !== 'save';
/** เงาก้อนแบนแบบเดิม (วงรีเงาข้างตัว เงาใต้หาง) — ตอนพ่นสีแล้วไม่วาด ไม่งั้นขอบคมซ้อนกับเงาฟุ้ง ดูเป็นเลเยอร์ผิด */
const flatShade = (pal) => (airbrushOn() ? 'rgba(0,0,0,0)' : pal.shade);

const TAU = Math.PI * 2;
/** เท้าของแบบอยู่ที่ y นี้ในไฟล์ออกแบบ (600×720) — ใช้วางน้องลงบนพื้น */
const FEET_Y = 648;
/**
 * ตัว+ขาท่าวิ่งสี่จังหวะ (ผู้ใช้ส่งแบบ 17 ต.ค. — ref/run-4beat.jpg) · ใช้ผ่าน shape.runBody = 'up' | 'down' | …
 * แทนทั้งลำตัวและขาจากไฟล์ด้วยรูปทรงเดียว (ตัวกับขาเชื่อมเป็นก้อนเดียวแบบในแบบ) — หัว แขน หาง ยังมาจากตัววาดปกติ
 * พิกัดไฟล์ออกแบบที่มองเฉียงขวาแล้ว (ไม่บีบตามมุมหันซ้ำ) · x 300 = กลางตัว · เท้าต่ำสุดแตะ FEET_Y
 *   out    = จุดรอบนอก (ตามเข็ม เริ่มไหล่ซ้าย) — ลากโค้งเรียบผ่านทุกจุด (ขอบบนซ่อนใต้หัว/แขน)
 *   belly  = พุงครีม [cx, cy, rx, ry, มุม] · paws = อุ้งเท้าขาว [cx, cy, rx, ry, มุม] · toes = ร่องนิ้ว [x, y, มุม]
 *   creases = เส้นในแบ่งขา (เส้นสีขอบ) [x0, y0, cx, cy, x1, y1] · stripes = ลายขวาง [x0, y0, x1, y1]
 *   skirtPush = แรงขาดันชายกระโปรง { L: ขาหลัง (ซ้ายจอ), R: ขาหน้า } [dx, dy] ที่ชายกระโปรง (ผ้ายกตามขาที่ก้าว)
 *   cuffs = ปลายขากางเกงขาสั้น (ชุด) · ankles.left/right = ข้อเท้า (กำไล/ถุงเท้าของชุด): [x0, y0, x1, y1, fx, fy]
 *           = เส้นขวางขาจากขอบหนึ่งถึงอีกขอบ + จุดฝั่งเท้า (บอกทิศ) — ขาซ้ายจอ = ขาหลัง (left) · ขาขวาจอ = ขาหน้า (right)
 */
const RUN_BODY = {
  // จังหวะ 1 Up: ขาหลังเหยียดไปหลังซ้าย อุ้งเท้าขาวชี้หลัง · ขาหน้าก้าวยาวลงหน้าขวา อุ้งเท้าแตะพื้น · ใต้ตัวเป็นแนวเดียว (ไม่มีช่องระหว่างขา)
  up: {
    out: [[244, 366], [199, 412], [204, 463], [200, 502], [185, 538], [136, 549], [104, 560], [83, 568], [90, 584], [111, 582], [148, 592], [192, 602], [235, 606], [279, 599], [309, 590], [326, 597], [370, 609], [412, 626], [445, 630], [465, 624], [475, 606], [473, 595], [463, 589], [445, 589], [424, 568], [412, 543], [407, 514], [412, 498], [417, 486], [416, 446], [414, 400], [395, 374], [305, 355]],
    belly: [326, 502, 63, 53, -0.15],
    paws: [[97, 565, 12, 20, 0.25], [461, 611, 19, 22, -0.6]],
    toes: [[87, 567, 3.3], [90, 577, 3.0]],
    creases: [[407, 515, 388, 567, 321, 589]],
    cuffs: [[170, 541, 172, 598, 120, 570], [420, 560, 392, 617, 440, 612]],
    ankles: { left: [121, 555, 123, 586, 97, 565], right: [442, 585, 431, 628, 461, 611] },
    skirtPush: { L: [-56, -30], R: [40, -16] },
    stripes: [],
  },
  down: {
    out: [[225, 396], [209, 429], [204, 463], [209, 485], [207, 509], [195, 536], [193, 556], [202, 578], [216, 595], [227, 607], [242, 614], [253, 618], [256, 619], [249, 631], [249, 641], [253, 653], [262, 662], [270, 664], [277, 663], [283, 662], [290, 667], [298, 668], [309, 666], [319, 660], [321, 652], [316, 646], [330, 641], [347, 633], [361, 621], [368, 607], [370, 594], [367, 580], [365, 576], [386, 551], [396, 527], [403, 507], [410, 495], [417, 481], [416, 463], [410, 440], [403, 417], [400, 395], [318, 389]],
    belly: [332, 507, 54, 42, -0.15],
    paws: [[265, 641, 18, 23, 0.05], [302, 657, 20, 12, 0]],
    toes: [],
    creases: [[340, 551, 356, 561, 366, 576], [283, 662, 284, 646, 316, 646], [261, 603, 260, 611, 256, 619]],
    cuffs: [[247, 627, 285, 645, 265, 656], [284, 645, 323, 647, 303, 661]],
    ankles: { left: [250, 628, 285, 634, 265, 645], right: [290, 648, 320, 648, 304, 660] },
    skirtPush: { L: [-6, 2], R: [26, -26] },
    stripes: [],
  },
  up2: {
    out: [[246, 362], [202, 404], [207, 456], [204, 495], [189, 529], [142, 537], [111, 544], [90, 553], [97, 568], [118, 567], [153, 580], [195, 594], [237, 602], [279, 599], [309, 590], [326, 597], [370, 609], [412, 626], [445, 630], [465, 624], [475, 606], [473, 595], [463, 589], [445, 589], [424, 568], [412, 543], [407, 514], [412, 498], [417, 486], [416, 446], [414, 400], [395, 374], [305, 355]],
    belly: [326, 502, 63, 53, -0.15],
    paws: [[104, 549, 12, 21, 0.25], [461, 611, 19, 22, -0.6]],
    toes: [[94, 551, 3.3], [97, 561, 3.0]],
    creases: [[407, 515, 388, 567, 321, 589]],
    cuffs: [[170, 532, 171, 586, 120, 556], [420, 560, 392, 617, 440, 612]],
    ankles: { left: [126, 541, 128, 572, 104, 549], right: [442, 585, 431, 628, 461, 611] },
    skirtPush: { L: [-58, -40], R: [40, -16] },
    stripes: [],
  },
  down2: {
    out: [[225, 396], [209, 429], [204, 463], [209, 485], [207, 509], [202, 529], [199, 553], [204, 577], [216, 594], [237, 607], [241, 611], [234, 621], [237, 635], [258, 641], [276, 640], [286, 631], [297, 636], [298, 652], [307, 665], [321, 672], [339, 669], [346, 655], [342, 641], [353, 631], [363, 614], [370, 594], [368, 573], [384, 546], [396, 522], [403, 507], [410, 495], [417, 481], [416, 463], [410, 440], [403, 417], [400, 395], [318, 389]],
    belly: [330, 509, 47, 40, -0.1],
    paws: [[260, 636, 23, 12, 0.35], [323, 658, 23, 16, 0]],
    toes: [],
    creases: [[251, 611, 272, 621, 293, 633], [293, 633, 319, 636, 342, 641], [349, 548, 363, 555, 368, 572]],
    cuffs: [[240, 611, 290, 632, 258, 636], [296, 634, 343, 641, 322, 660]],
    ankles: { left: [240, 617, 282, 633, 258, 638], right: [298, 642, 343, 646, 322, 662] },
    skirtPush: { L: [-20, -18], R: [16, -4] },
    stripes: [],
  },
};
/** ขอบซ้าย/ขวาของตัววิ่ง ณ ระดับ y (เส้นรอบนอกของแบบ · ช่วงลำตัวกลาง x 150–450) — กระโปรงวัดเอวจากตรงนี้ */
function runBodySpan(out, y) {
  let l = Infinity, r = -Infinity;
  for (let i = 0; i < out.length; i++) {
    const [x0, y0] = out[i], [x1, y1] = out[(i + 1) % out.length];
    if ((y0 - y) * (y1 - y) > 0 || y0 === y1) continue;
    const x = x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
    if (x < 150 || x > 450) continue;
    l = Math.min(l, x); r = Math.max(r, x);
  }
  return l < r ? [l, r] : null;
}
/** โค้งปิดเรียบผ่านจุดทุกจุด (Catmull-Rom → เบซิเยร์) */
function smoothLoop(pts) {
  const q = new Path2D(), n = pts.length;
  q.moveTo(...pts[0]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    q.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  q.closePath();
  return q;
}
/** หน่วยในไฟล์ → หน่วยเกม ต่อ scale 1 (scale 2.6 = สูงราว 160 เท่าน้องเดิมบนหน้าแรก) */
const UNIT = 0.104;
/** เส้นขอบบางลงจากในไฟล์ ให้หนาเท่าเส้นของหน้าอื่นเมื่อย่อลงขนาดในเกม */
const LINE_K = 0.8;
/** ความหนาเส้นขอบรอบนอก (หน่วยในไฟล์) */
const LW = 5.5 * LINE_K;

// ── สีในไฟล์ → บทบาท ──
const ROLE = {
  '#FFB55E': 'cat', '#F48C3C': 'stripe', '#F99A46': 'shade', '#FFF8EC': 'cream',
  '#5A3420': 'line', '#FFB0A0': 'ear', '#FF9FA3': 'cheek', '#FF8C8C': 'nose',
};
/** จานสีของแบบ (น้องส้ม) — ใช้ตรง ๆ กับแมวส้ม */
// สีจากชีท "แมวส้ม Dimension": ผิวพีชอ่อน ขอบไล่ส้มเข้ม (พ่นสี) ลายส้มนุ่ม หูชมพูอมม่วง จมูกส้ม
// ชุดสีในชีท: ส้มเข้ม #D2650F · พีช #F5A05E · ครีม #F8F1E6 · น้ำตาลเข้ม #7A3510 (เส้นคงสีเดิมของแบบ)
const DESIGN = {
  cat: '#F8C08A', stripe: '#E68A45', shade: '#F0A462', cream: '#F8F1E6',
  line: '#5A3420', ear: '#E79AA8', cheek: '#F3A08A', nose: '#E07A3A', mouth: '#C2455A',
};

// ══ แมวสามสี (calico) — ลายปื้นส้ม/เทาบนพื้นขาว (ผู้ใช้ส่งแบบ 15 ต.ค.: "สามสี ตัวเมีย น่ารักขี้อ้อน · วาดตาใหม่ ลงสีใหม่ ตัวเหมือนเดิม") ══
// ปื้นสีเป็น "ลวดลายของชิ้น" (det) แทรกหน้าสุดของแต่ละชิ้น — ถูกดัดไปพร้อมชิ้นทุกท่า (ยกแขน เตะขา หันหัว) และถูกตัดในเนื้อชิ้นเอง
// ขอบนุ่มแบบสีน้ำ: ปื้นเดียวซ้อนหลายชั้นหดเข้าหากลางปื้น (ขอบจาง กลางเข้ม) + แกนสีเข้มกว่าจาง ๆ ตรงกลาง
// พิกัด = ไฟล์ออกแบบด้านหน้า (cat-front.svg) · มองด้านหลังใช้ลายด้านหน้ากลับซ้ายขวา (ข้างที่เป็นส้มจากหน้า มองจากหลังอยู่อีกฝั่ง)
const CALICO = {
  o: '#EE9853',   // ส้มพีช (เข้มกว่าที่เห็นนิด — สนามไล่สีของขนทาทับให้สว่างกลางปื้น)
  g: '#8F8E9D',   // เทาอมม่วง (เหตุผลเดียวกัน)
  parts: {
    // หัว (ตามแบบ): ซ้ายจอส้มเลียบขอบนอกจากโคนหูลงข้างแก้ม · เทาระหว่างหูซ้ายกับกลางหน้าผาก
    // แต้มส้มเส้นเล็กกลางหน้าผาก · ขวาจอเทาจากหูขวาคลุมหัวด้านขวาลงถึงแก้ม · ใต้ตา จมูก ปาก คาง ขาว
    head: [
      ['o', [[136, 214], [160, 166], [200, 140], [224, 150], [214, 190], [194, 228], [182, 272], [176, 322], [150, 322], [130, 266]]],
      ['g', [[208, 152], [242, 132], [276, 138], [272, 170], [250, 198], [224, 210], [210, 190]]],
      ['o', [[292, 126], [306, 126], [304, 160], [299, 176], [294, 160]], 0.7],
      ['g', [[326, 140], [362, 126], [420, 136], [458, 178], [474, 250], [470, 322], [440, 332], [420, 292], [404, 246], [374, 212], [344, 196], [328, 170]]],
    ],
    'ear-left': [['o', [[140, 40], [290, 40], [290, 240], [140, 240]]]],
    'ear-right': [['g', [[310, 40], [460, 40], [460, 240], [310, 240]]]],
  },
  // ตัว+แขน+ขา = แผ่นลายแผ่นเดียว (พิกัดไฟล์ด้านหน้า) — ทุกชิ้นของตัววาดทั้งแผ่นแล้วตัดในเนื้อตัวเอง
  // ปื้นที่คร่อมรอยต่อ (ไหล่-แขน · ข้างตัว-ต้นขา) จึงต่อเป็นปื้นเดียว ไม่ถูกตัดเป็นขอบตรง · อกกลางตัวขาว · อุ้งเท้า/เท้าขาว
  body: [
    ['o', [[116, 422], [150, 408], [186, 410], [198, 440], [192, 470], [158, 488], [124, 480], [110, 452]]],                       // แขนซ้ายช่วงกลาง
    ['g', [[170, 404], [198, 394], [232, 398], [246, 424], [236, 452], [212, 470], [186, 472], [168, 452]]],                       // ไหล่ซ้าย
    ['o', [[168, 472], [196, 462], [226, 472], [246, 500], [240, 532], [250, 560], [236, 592], [208, 604], [182, 598], [166, 560], [162, 520]]], // ข้างตัวซ้ายล่าง → ต้นขา
    ['g', [[178, 596], [204, 592], [228, 606], [236, 630], [220, 646], [190, 646], [176, 626]]],                                  // ขาซ้ายด้านนอก
    ['o', [[408, 414], [446, 406], [480, 420], [490, 456], [470, 486], [432, 488], [408, 470], [402, 440]]],                       // แขนขวาช่วงกลาง
    ['o', [[348, 398], [374, 388], [410, 390], [434, 410], [420, 432], [392, 436], [362, 428]]],                                  // ไหล่ขวา
    ['g', [[372, 432], [398, 418], [424, 430], [436, 470], [432, 520], [426, 580], [416, 622], [394, 640], [376, 624], [372, 590], [386, 560], [380, 520], [364, 488], [362, 456]]], // ข้างตัวขวา → ขาขวา
  ],
  bodyParts: ['torso', 'arm-left', 'arm-right', 'leg-left', 'leg-right'],
  // ตัวนั่ง (ทรงระฆัง SIT2 · ข้างตัว x ~136–464 y ~460–648)
  sit: [
    ['g', [[148, 470], [204, 456], [222, 500], [200, 540], [160, 546], [140, 512]]],
    ['o', [[138, 546], [200, 540], [222, 590], [206, 640], [150, 642], [132, 600]]],
    ['o', [[392, 458], [440, 468], [450, 502], [410, 508]]],
    ['g', [[400, 506], [460, 500], [468, 582], [452, 642], [404, 632], [392, 572]]],
  ],
  // ตัวนั่งเกาพุง (SIT.torso ข้างตัว x ~156–446 y ~440–620) และต้นขาหลังสองข้าง (SIT.haunch)
  sitOld: [
    ['o', [[158, 512], [178, 528], [200, 512], [224, 504], [234, 540], [216, 590], [160, 602], [150, 560]]],
    ['g', [[160, 450], [214, 440], [232, 470], [222, 500], [196, 514], [174, 532], [156, 510]]],
    ['g', [[388, 450], [446, 468], [452, 560], [420, 604], [392, 586], [384, 552], [370, 512], [376, 478]]],
  ],
  haunch: [
    ['o', [[104, 556], [204, 552], [210, 646], [112, 650]]],
    ['g', [[396, 552], [496, 556], [490, 650], [392, 646]]],
  ],
  // ก้อนหมอบ (LOAF ฐานตัว x ~104–464 y ~526–648)
  loaf: [
    ['g', [[404, 530], [462, 560], [470, 640], [412, 648], [396, 590]]],
    ['o', [[106, 560], [168, 530], [196, 560], [180, 640], [112, 640]]],
  ],
  // แขนแบบท่อ (นั่ง เกาพุง เลียอุ้งเท้า เท้าคาง ประคองหัวใจ): สัดส่วนตามท่อจากไหล่ → ปลาย · เทาโคนไหล่ ส้มช่วงกลาง อุ้งเท้าขาว
  arm: [[0, 0.3, 'g'], [0.3, 1, 'o']],   // ถึงปลายท่อ: แขนท่อนบน (ไม่มีอุ้งเท้า) ไม่เหลือปลายขาว · อุ้งเท้าครีมวาดทับทีหลังเอง
  // หาง: ปล้องตามดัชนีจุดบนหาง [จาก, ถึง, สี] · ปลายหางขาว
  tail: [[1.5, 4, 'o'], [5, 7.2, 'g'], [8.2, 10.4, 'o'], [11.4, 12.6, 'g']],
};
// ══ แมววิเชียรมาศ (siamese) — ผู้ใช้ส่งแบบ 15 ต.ค.: "ตัวผู้ หน้ากวน ๆ สีแบบนี้" ══
// ตัวครีม แต้มสีน้ำตาลเข้ม (point) ที่หน้ากาก หู อุ้งเท้า เท้า หาง — ขอบแต้มไล่สีนุ่ม (ไม่ตัดเป็นปื้น) ตามแบบ
// ใช้ระบบลายของแมวสามสี (patch ของชิ้น ดัดตามท่า) — ปื้นวงรีไล่สี { g, stops } แทนปื้นสีเรียบ · หูเป็นสีทึบทั้งใบ
const SIA_D = '#6E4733';   // สีแต้ม (น้ำตาลช็อกโกแลต)
// เข้มกว่าที่เห็นจริง — ชั้นไล่สีขนทาทับจนสว่างขึ้น (แบบ: หน้ากากน้ำตาลเข้มชัด)
const siaStops = (a0 = 0.96) => [[0, `rgba(58,34,22,${a0})`], [0.4, `rgba(78,48,32,${a0 * 0.86})`], [0.72, 'rgba(104,66,46,.38)'], [1, 'rgba(120,80,58,0)']];
const SIAMESE = {
  d: SIA_D,
  parts: {
    // หน้ากาก: จมูก-ปาก-ระหว่างตา เข้มสุด ไล่จางออกไปแก้ม/หน้าผาก (ยืดขึ้นหน้าผากนิดแบบในแบบ)
    head: [{ g: [300, 318, 104, 124], stops: siaStops(0.97) }],
    'ear-left': [['d', [[140, 40], [290, 40], [290, 240], [140, 240]]]],
    'ear-right': [['d', [[310, 40], [460, 40], [460, 240], [310, 240]]]],
  },
  backSkip: ['head'],   // หันหลัง: ไม่มีหน้ากาก (หูยังเข้ม)
  // ตัว+แขน+ขา: แต้มที่อุ้งเท้าสองข้าง + เท้าสองข้าง (พิกัดไฟล์ด้านหน้า) · ลำตัวครีม
  body: [
    // only = ทาเฉพาะชิ้นนั้น — ตัวไม่ได้ปื้นปลายแขน (จุดกลางปื้นดัดตามตัว ≠ ตามแขน ตอนหัน/ยกแขนเห็นเส้นแบ่งสีที่ไหล่)
    // รัศมีสั้นพอจางหมดก่อนถึงไหล่ — ตอนหันข้าง ตัวบังโคนแขน ขอบตัวตัดเงาเป็นเส้น (ผู้ใช้ทัก)
    { g: [104, 468, 46, 46], stops: siaStops(0.95), only: 'arm-left' },
    { g: [496, 468, 46, 46], stops: siaStops(0.95), only: 'arm-right' },
    { g: [208, 646, 64, 52], stops: siaStops(0.95), only: 'leg-left' },
    { g: [392, 646, 64, 52], stops: siaStops(0.95), only: 'leg-right' },
  ],
  bodyParts: ['torso', 'arm-left', 'arm-right', 'leg-left', 'leg-right'],
  // ท่าที่ไม่ใช้ชิ้นจากไฟล์: แต้มที่เท้า/ขาหลังที่โผล่ออกมา
  // ท่านั่ง/นั่งเกาพุง: เท้าเข้มอยู่แล้ว (pal.paw) — ไม่ลงปื้นที่ข้างตัว/ต้นขา (ปื้นไล่สีดูเป็นคราบ สีไม่สม่ำเสมอ)
  // เงาหม่นนุ่ม ๆ เหนือเท้า แบบขาตอนยืน (ผู้ใช้ขอ) — รัศมีเล็ก ไม่ลามเป็นคราบ
  sit: [{ g: [178, 648, 46, 40], stops: siaStops(0.75) }, { g: [422, 648, 46, 40], stops: siaStops(0.75) }],
  sitOld: [],
  haunch: [{ g: [158, 650, 50, 44], stops: siaStops(0.78) }, { g: [442, 650, 50, 44], stops: siaStops(0.78) }],
  loaf: [{ g: [120, 630, 70, 50], stops: siaStops(0.85) }, { g: [440, 630, 70, 50], stops: siaStops(0.85) }],
  // แขนท่อ: เงาน้ำตาลหม่นนุ่ม ๆ ที่ปลายแขน รัศมีคงที่เท่าตอนยืน (armTipR) — เดิมรัศมีตามความยาวท่อ ใหญ่จนสีแขนด่าง (ผู้ใช้ทัก)
  armTip: 1,
  armTipR: 62,
  tipStops: siaStops(0.95),
  arm: [],
  // หางเข้มทั้งเส้น · อุ้งเท้า/เท้าในไฟล์ออกแบบ (ครีม) เปลี่ยนเป็นสีแต้ม
  tail: [],
  tailAll: 'd',
  paw: '#7A5038',
};
/** เส้นโค้งปิดเรียบผ่านจุดทุกจุด (Catmull-Rom → Bézier) — คำสั่งรูปแบบเดียวกับไฟล์ออกแบบ (ดัดด้วย deformOps ได้) */
function smoothCmds(pts) {
  const n = pts.length, at = (i) => pts[(i + n) % n];
  const cmds = [['M', ...pts[0]]];
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    cmds.push(['C', p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]]);
  }
  cmds.push(['Z']);
  return cmds;
}
/** ปื้นสีหนึ่งปื้น → ลวดลายสีเรียบขอบโค้งนุ่ม (ไม่มีเส้นฟุ้ง/ขีดขนรอบปื้น — ผู้ใช้ให้เอาออก 15 ต.ค.) · a = ความเข้มปื้น */
function calicoOps(list, cal, mirror = false) {
  return list.map((item) => {
    // ปื้นไล่สีวงรี (แมววิเชียรมาศ): { g: [cx, cy, rx, ry], stops } — เข้มกลางจางออกขอบ ไม่มีขอบคม
    // จุดกลางถูกดัดตามท่า (deformOps) ส่วนรัศมีคงที่ · ตัดในเนื้อชิ้นเอง (ทาเต็มกรอบ ชิ้นเป็นคนตัด)
    if (!Array.isArray(item)) {
      const [cx0, cy, rx, ry] = item.g, cx = mirror ? 600 - cx0 : cx0;
      const cmds = [['M', -200, -200], ['L', 800, -200], ['L', 800, 900], ['L', -200, 900], ['Z']];
      return {
        kind: 'shape', id: 'calico', cmds, path: buildPath(cmds, (x, y) => [x, y]), stroke: null,
        grad: { c: [cx, cy], r: [rx, ry], stops: item.stops, m: { a: rx, b: 0, c: 0, d: ry, e: cx, f: cy } },
      };
    }
    const [k, raw, a = 1] = item;
    const pts = mirror ? raw.map(([x, y]) => [600 - x, y]) : raw;
    const cmds = smoothCmds(pts);
    // ทึบเต็ม: ปื้นที่คร่อมรอยต่อชิ้น (ตัว/แขน/ขา) ซ้อนกันแล้วกลืนเป็นสีเดียว — โปร่งแสงแล้วเห็นเส้นรอยต่อ/ตรงซ้อนเข้มกว่า
    return { kind: 'shape', id: 'calico', cmds, path: buildPath(cmds, (x, y) => [x, y]), fill: cal[k], fillAlpha: a, stroke: null };
  });
}
/** วาดชุดปื้นตามชื่อ (ตัวนั่ง/ก้อนหมอบ) — ทำลวดลายครั้งเดียวต่อชุดแล้วเก็บไว้ */
const CAL_OPS = new WeakMap();
function calicoDraw(c, cal, key, pal) {
  let m = CAL_OPS.get(cal);
  if (!m) CAL_OPS.set(cal, (m = {}));
  const ops = m[key] || (m[key] = calicoOps(cal[key] || [], cal));
  drawOps(c, ops, pal, {}, {});
}
const swapLR = (id) => id.replace(/-left$/, '-@').replace(/-right$/, '-left').replace(/-@$/, '-right');
/** ชิ้นส่วนของแบบที่มีลายสามสีแทรกแล้ว (ทำครั้งเดียวต่อแบบ/ลาย) — หู: แทรกหลังขนขาวขอบหู ก่อนชมพูในหู */
const CAL_PARTS = new WeakMap();
function calicoParts(M, cal, back) {
  let byCal = CAL_PARTS.get(M);
  if (!byCal) CAL_PARTS.set(M, (byCal = new Map()));
  let parts = byCal.get(cal);
  if (parts) return parts;
  parts = { ...M.parts };
  for (const id of Object.keys(M.parts)) {
    // หัว/หู: ลายของชิ้นนั้น · ตัว แขน ขา: แผ่นลายตัวทั้งแผ่น (ต่อเนื่องข้ามรอยต่อ)
    const ownId = back ? swapLR(id) : id;
    const list = cal.bodyParts.includes(id) ? cal.body.filter((o) => !o.only || o.only === ownId) : back && cal.backSkip?.includes(id) ? null : cal.parts[ownId];
    if (!list) continue;
    const ops = calicoOps(list, cal, back);
    const p = M.parts[id];
    // หัว/ตัว/แขน/ขา: ลายเป็นสีขนของชิ้น (patch — ทาตอนลงสีพื้น ดู drawLayer 2a) · หู: แทรกในลวดลาย (ต้องอยู่ใต้ชมพูในหู)
    if (!/^ear-/.test(id)) {
      // อุ้งเท้า/เท้าในไฟล์ออกแบบเป็นสีครีม (#FFF8EC) — วิเชียรมาศเปลี่ยนเป็นสีแต้ม (cal.paw)
      const recolor = (list) => list.map((o) => (o.ops ? { ...o, ops: recolor(o.ops) } : o.fill === '#FFF8EC' ? { ...o, fill: cal.paw } : o));   // group/clip ซ้อนข้างในด้วย
      const det = cal.paw && /^(arm|leg)-/.test(id) ? recolor(p.det) : p.det;
      // sheet = ปื้นจากแผ่นลายตัวแผ่นเดียว (ตัว แขน ขา) — ชิ้นในแผ่นเดียวกันทาทับกันได้ไม่มีรอยต่อ (ดู drawLayer 2a)
      parts[id] = { ...p, det, patch: ops, sheet: cal.bodyParts.includes(id) };
      continue;
    }
    let det;
    if (/^ear-/.test(id)) {
      // หูมีสองชุดลาย (ปกติ / ตอนหันหน้า ear-*2) — ปื้นชุดที่สองโผล่ตามความเข้มของชุดตอนหัน (hook calico-alt_*)
      // ไม่งั้นปื้นชุดที่สองทับชมพูในหูของชุดแรกจนชมพูหาย
      const sfx = (p.det.find((o) => /^ear-inline_/.test(o.id || ''))?.id || '').slice(-2);
      const alt = ops.map((o) => ({ ...o, id: 'calico-alt' + sfx }));
      det = [];
      for (const o of p.det) {
        if (/^ear-inline_/.test(o.id || '')) det.push(...ops);
        if (/^ear-inline2_/.test(o.id || '')) det.push(...alt);
        det.push(o);
      }
      if (!sfx) det = [...ops, ...p.det];   // หูด้านหลัง (ไม่มีชมพูในหู): ปื้นทั้งใบ
    } else det = [...ops, ...p.det];
    parts[id] = { ...p, det };
  }
  byCal.set(cal, parts);
  return parts;
}
/** แถบสีตามท่อ (หาง/แขนท่อ): ranges = [[จาก, ถึง, สี]] เป็นดัชนีจุดบนท่อ — ตัดในเนื้อท่อโดยชั้นของท่อเอง */
function calicoBand(ctx, G, ranges, cal) {
  const { pts, half, N } = G;
  const at = (u) => {
    const i = Math.max(0, Math.min(N - 1, Math.floor(u))), f = Math.max(0, Math.min(1, u - i));
    const a = pts[i], b = pts[Math.min(N, i + 1)];
    const ang = a.a + (b.a - a.a) * f;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, nx: -Math.sin(ang), ny: Math.cos(ang), h: (half(i) + (half(Math.min(N, i + 1)) - half(i)) * f) * 1.6 + 6 };
  };
  const a0 = ctx.globalAlpha;
  for (const [u0, u1, k] of ranges) {
    const L = [], R = [];
    // ปลายท่อจริงโค้งมนเลยจุดสุดท้ายออกไป — แถบที่ถึงปลายท่อยืดเลยปลายไปอีกเท่าความกว้าง (ไม่เหลือเสี้ยวขาวที่ปลายมน)
    const ext = (u, dir) => { const q = at(u), tx = q.ny * dir, ty = -q.nx * dir; L.push([q.x + q.nx * q.h + tx * q.h, q.y + q.ny * q.h + ty * q.h]); R.push([q.x - q.nx * q.h + tx * q.h, q.y - q.ny * q.h + ty * q.h]); };
    if (u0 <= 0) ext(0, -1);
    // แถบที่ต่อกัน (เทา→ส้ม) ซ้อนกันนิด — ขอบชนพอดีแล้วเห็นเส้นขาวบาง ๆ ตรงรอยต่อ
    const a0u = u0 > 0 ? u0 - 0.2 : u0, a1u = u1 < N ? u1 + 0.2 : u1;
    for (let u = a0u; u <= a1u + 1e-6; u += 0.25) { const q = at(u); L.push([q.x + q.nx * q.h, q.y + q.ny * q.h]); R.push([q.x - q.nx * q.h, q.y - q.ny * q.h]); }
    if (u1 >= N) ext(N, 1);
    const p = new Path2D();
    p.moveTo(...L[0]);
    for (const q of L.slice(1)) p.lineTo(...q);
    for (const q of R.reverse()) p.lineTo(...q);
    p.closePath();
    ctx.fillStyle = cal[k];
    ctx.fill(p);
  }
  ctx.globalAlpha = a0;
}
/** หางสามสี: ปล้องส้ม/เทา ปลายขาว */
const calicoTail = (ctx, G, cal) => {
  // หางสีเดียวทั้งเส้น (วิเชียรมาศ): ทาเต็มกรอบ — ชั้นของหางตัดให้ในเนื้อหางเอง
  if (cal.tailAll) return;   // หางสีเดียว (วิเชียรมาศ): ทาในชั้นลวดลายแทน (tailDetails) — ชั้นนี้โดนไล่สีขนทาซีด
  calicoBand(ctx, G, cal.tail, cal);
};
/** แขนแบบท่อ: เทาโคนไหล่ ส้มช่วงกลาง (สัดส่วนตามความยาวท่อ) */
const calicoArm = (ctx, G, cal) => (cal.armTip ? pointsTip(ctx, G, cal) : calicoBand(ctx, G, cal.arm.map(([u0, u1, k]) => [u0 * G.N, u1 * G.N, k]), cal));
/** แต้มสีปลายท่อ (แขน/ขา วิเชียรมาศ): วงไล่สีที่ปลายท่อ รัศมีตามความยาวท่อ — เข้มที่อุ้งเท้า จางลงไปทางไหล่ */
function pointsTip(ctx, G, cal) {
  const { pts, N } = G, q = pts[N], q0 = pts[0];
  const len = Math.hypot(q.x - q0.x, q.y - q0.y);
  // ไม่เกินครึ่งท่อนแขน — เงาไม่ลามถึงข้อศอก (แขนท่อนบนไม่มีเงานี้ ศอกจะเห็นรอยต่อสีเข้ม/อ่อน)
  const r = cal.armTipR ? Math.min(cal.armTipR, len * 0.6) : Math.max(30, len * cal.armTip);
  const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r);
  for (const [o, c] of cal.tipStops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(q.x - r, q.y - r, r * 2, r * 2);
}

// ══ ตากลมเขียว (แบบแมวสามสี) — วาดใหม่ตามแบบ ไม่ใช้ตาแบ๊วเดิม ══
// ขอบตาครีมบาง ๆ รอบม่านตา · ม่านตาเขียวไล่จากเข้มด้านบนเป็นเขียวอมเหลืองด้านล่าง ขอบม่านตาเข้ม
// รูม่านตาน้ำตาลดำโตเกือบเต็ม (ตาโตขี้อ้อน) · ประกายขาว: วงใหญ่บนซ้าย · จุดเล็กขวา · จุดจิ๋วล่างขวา
const ROUND_EYE = {
  white: '#FFFCF4', iris: ['#2F5A22', '#5F9234', '#B4D163'], irisRim: '#24401A', glow: 'rgba(214,236,140,.5)',
  pupilIn: '#2B1B12', pupilOut: '#0E0805',
  // สำหรับตาตอนหันข้าง (sideEye ใช้ชุดสีแบบตาแบ๊ว)
  rimTop: '#D4E88E', rimBot: '#6E9E3A', coreIn: '#2B1B12', coreOut: '#0E0805',
};
function drawRoundEye(c, white, side, { lx = 0, ly = 0, sparkle = 0, t = 0, lidded = false, col = ROUND_EYE, starDots = false, starOne = false } = {}) {
  const W = EYE_WHITE[side], R = EYE_WHITE.r, d = side === 'left' ? 1 : -1;
  c.save();
  c.clip(white);
  c.fillStyle = col.white;
  c.fillRect(W.x - R - 6, W.y - R - 6, (R + 6) * 2, (R + 6) * 2);
  // ม่านตา: เกือบเต็มดวง เหลือขอบครีมบาง ๆ · เลื่อนตามสายตา
  const ix = W.x + d * 1.5 + lx * 0.9, iy = W.y - 1 + ly * 0.9, ir = R - 3.5;   // ขอบครีมรอบม่านตาบาง ๆ ตามแบบ
  const g = c.createLinearGradient(0, iy - ir, 0, iy + ir);
  g.addColorStop(0, col.iris[0]);
  g.addColorStop(0.5, col.iris[1]);
  g.addColorStop(1, col.iris[2]);
  c.fillStyle = g;
  c.beginPath(); c.arc(ix, iy, ir, 0, TAU); c.fill();
  // แสงสะท้อนนุ่มในม่านตาครึ่งล่าง (ตาใสฉ่ำ)
  const gl = c.createRadialGradient(ix, iy + ir * 0.55, 0, ix, iy + ir * 0.55, ir * 0.75);
  gl.addColorStop(0, col.glow);
  gl.addColorStop(1, 'rgba(222,240,150,0)');
  c.fillStyle = gl;
  c.beginPath(); c.arc(ix, iy, ir, 0, TAU); c.fill();
  // รูม่านตาโต (เยื้องขึ้นนิด)
  const px = ix, py = iy - 3, pr = ir * 0.78;   // รูม่านตาโตขึ้น (ผู้ใช้ขอสองรอบ 15 ต.ค. — 0.6 → 0.7 → 0.78)   // รูม่านตาโตแต่ยังเห็นวงเขียวรอบ ๆ ชัด (ตามแบบ)
  const pg = c.createRadialGradient(px - pr * 0.25, py - pr * 0.3, pr * 0.1, px, py, pr);
  pg.addColorStop(0, col.pupilIn);
  pg.addColorStop(1, col.pupilOut);
  c.fillStyle = pg;
  c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill();
  // ประกาย (ทิศแสงบนซ้ายทั้งสองตา) · ใส่ชุดที่มี starEyes: จุดเล็กเป็นดาวเหลือง (วงใหญ่คงเดิม)
  const dot = eyeDots(c, ix, iy, ir, starDots, t, starOne);
  if (lidded) {
    dot(-0.3, 0.12, 0.2, true);
    dot(0.3, 0.2, 0.08);
  } else {
    dot(-0.3, -0.32, 0.28, true);
    dot(0.36, -0.06, 0.11);
    dot(0.2, 0.44, 0.07);
  }
  if (sparkle > 0 && !starDots) {
    // ประกายวิ้ง: ดาวเหลืองอ่อนมีแสงเรือง (ผู้ใช้ขอให้เปลี่ยนจากดาวขาว)
    const k = sparkle * (0.75 + 0.25 * Math.sin(t * 0.25));
    eyeStar(c, ix + 16, iy - 14, 14 * k);
    eyeStar(c, ix - 8, iy + 18, 7.5 * k);
  }
  c.restore();
}

/** สีดาวประกายในตา (ช่อง starEyes ของชุด) — yellow = ชุดขนมหวาน + ท่าตาเป็นประกาย · ice = องค์หญิงหิมะ */
const EYE_STARS = {
  yellow: { star: '#FFF29A', glow: 'rgba(255,248,170,.85)', fade: 'rgba(255,240,140,0)' },
  ice: { star: '#C4EAFF', glow: 'rgba(200,236,255,.85)', fade: 'rgba(170,222,255,0)' },
};
/** ดาวประกายในตา: ดาวสี่แฉก + แสงเรืองรอบ + แกนกลางขาว (แบบที่ผู้ใช้เลือก 15 ต.ค.) */
function eyeStar(c, x, y, r, col = EYE_STARS.yellow) {
  if (r <= 0.3) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r * 1.9);
  g.addColorStop(0, col.glow);
  g.addColorStop(1, col.fade);
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r * 1.9, 0, TAU); c.fill();
  c.fillStyle = col.star;
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r * 0.8, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r * 0.8, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.fill();
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.arc(x, y, r * 0.18, 0, TAU); c.fill();
}
/**
 * ตัววาดจุดประกายในตา dot(dx, dy, r, big) — พิกัด/ขนาดเป็นสัดส่วนของวงตาดำ (ir)
 * stars = ชุดที่มี starEyes: จุดเล็ก (ไม่ใช่ big) วาดเป็น eyeStar ตรงตำแหน่งเดิม กะพริบเบา ๆ สลับจังหวะกัน
 *   ขนาดตามแบบที่ผู้ใช้เลือก: ดวงแรกใหญ่ ดวงที่สองเล็ก (ไม่ตามขนาดจุดเดิม — ตาแบ๊วจุดโต ดาวจะใหญ่จนแสงกลบตาดำ)
 *   one = แมวตัวผู้: ดาวดวงเดียว (ดวงแรก) จุดที่เหลือเป็นจุดขาวตามเดิม (ผู้ใช้สั่ง 15 ต.ค.)
 */
function eyeDots(c, ix, iy, ir, stars, t, one = false) {
  let n = 0;
  return (dx, dy, r, big = false) => {
    const x = ix + dx * ir, y = iy + dy * ir;
    if (stars && !big && !(one && n > 0)) {
      const k = 0.85 + 0.15 * Math.sin(t * 0.25 + n * 2.1);
      eyeStar(c, x, y, ir * (n++ ? 0.22 : 0.38) * k, EYE_STARS[stars] || EYE_STARS.yellow);
      return;
    }
    c.fillStyle = '#FFFFFF';
    c.beginPath(); c.arc(x, y, r * ir, 0, TAU); c.fill();
  };
}

/**
 * ขนตาของตากลม (แมวสามสี · ผู้ใช้ขอ "วาดขนตาใหม่ให้แตกต่างจากเดิม"): เส้นเปลือกตาบนเรียวบาง หนาขึ้นทางหางตา
 * + ขนตางอนแยกเป็นเส้น ๆ สามเส้นที่มุมบนนอก (โค้งงอนออกนอกหน้า ปลายแหลม) — ไม่มีแถบโอบใต้ตาแบบเดิม
 * sq/cy = ตาหรี่ (ฐานเกาะขอบตาที่หรี่ ขนตาไม่แบน) เหมือน drawLashes
 */
function drawRoundLashes(c, side, sq = 1, cy = null) {
  const W = EYE_WHITE[side], R = EYE_WHITE.r, o = side === 'left' ? -1 : 1;
  const yc = cy ?? W.y;
  const P = (a, r) => [W.x + o * Math.cos(a) * r, yc + (W.y + Math.sin(a) * r - yc) * sq];
  const N = (a) => { const nx = o * Math.cos(a) * sq, ny = Math.sin(a), l = Math.hypot(nx, ny) || 1; return [nx / l, ny / l]; };
  c.fillStyle = '#24140C';
  // เปลือกตาบน: จากหัวตาด้านบน (a −2.75) ถึงหางตา (a 0.18) หนา 1 → 5.5
  const a0 = -2.75, a1 = 0.18, n = 40, lid = new Path2D(), out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n), u = i / n;
    // หนาสุดค่อนไปทางหางตา แล้วเรียวเป็นศูนย์ทั้งสองปลาย — ปลายกลืนเข้ากับเส้นขอบตา ไม่จบเป็นตอทื่อลอย ๆ (ผู้ใช้ทัก)
    const taper = Math.pow(Math.sin(Math.PI * u), 0.75);
    const th = (3 + 8 * Math.pow(u, 1.1)) * taper;
    // ฐานเริ่มในขอบตา (ทับเส้นขอบตา) ช่วงกลาง · ปลายทั้งสองค่อย ๆ ออกมาอยู่บนเส้นขอบตาพอดี
    const b = P(a, R - 1 - 3 * taper), nn = N(a);
    if (!i) lid.moveTo(...b); else lid.lineTo(...b);
    out.push([b[0] + nn[0] * th, b[1] + nn[1] * th]);
  }
  for (let i = n; i >= 0; i--) lid.lineTo(...out[i]);
  lid.closePath();
  c.fill(lid);
  // ขนตางอน: ฐานกว้างฝังในเปลือกตา → พุ่งขึ้นตามแนวตั้งฉากขอบตา แล้วปลายโค้งตวัดออกนอกหน้า (ทรงตะขอนุ่ม ๆ ไม่ใช่หนามตรง)
  // [มุมบนขอบตา, ความยาว, ครึ่งความกว้างฐาน, แรงงอนออกนอก] — เส้นนอกสุดยาวและงอนมากสุด
  for (const [a, len, w, curl] of [[-0.3, 18, 4.6, 1], [-0.68, 16, 4.3, 0.75], [-1.06, 13, 3.9, 0.5]]) {
    const b = P(a, R + 3), nn = N(a), side2 = [-nn[1], nn[0]];
    const k = [b[0] + nn[0] * len * 0.75, b[1] + nn[1] * len * 0.75];                                   // ช่วงกลาง: ขึ้นตรงตามขอบตา
    const tip = [k[0] + o * len * 0.55 * curl + nn[0] * len * 0.15, k[1] + nn[1] * len * 0.15 + len * 0.1 * curl];   // ปลาย: ตวัดออกนอกหน้า
    const q = new Path2D();
    q.moveTo(b[0] + side2[0] * w - nn[0] * 3, b[1] + side2[1] * w - nn[1] * 3);
    q.quadraticCurveTo(k[0] + side2[0] * w * 0.55, k[1] + side2[1] * w * 0.55, ...tip);
    q.quadraticCurveTo(k[0] - side2[0] * w * 0.55, k[1] - side2[1] * w * 0.55, b[0] - side2[0] * w - nn[0] * 3, b[1] - side2[1] * w - nn[1] * 3);
    q.closePath();
    c.fill(q);
  }
}

/**
 * แมวตัวอื่นของน้องแบบใหม่ — ทรงตัว/โครงเดียวกับน้องส้มทุกตัว (ใส่ชุดได้เหมือนกันหมด) ต่างกันแค่ จานสี · สีตา · ขนตา (เพศ)
 * pal  = จานสีเต็มชุดของแบบใหม่ (แทนการเดาจากช่องสีของสกินเดิม) · air = สีพ่นเงาขอบ (แมวส้มใช้ส้ม)
 * eyes = สีตาแยกข้างซ้าย/ขวาของจอ (ตาสองสีได้) · sex 'f' = ขนตาเพศเมีย (แมวส้มตัวหลักเป็นตัวผู้)
 * ช่องสีเดิม (cat line dark …) ใส่ไว้ด้วย — ตัววาดเดิม (เทียบแบบเดิม/หน้าอื่น) ยังวาดได้
 */
export const CAT2_BREEDS = [
  {
    id: 'pearl', name: 'ไข่มุก', note: 'แมวขาวตาสองสี (ฟ้า/เขียว) · ตัวเมีย', sex: 'f',
    pal: {
      cat: '#FFF8F5', stripe: '#E4B9B0', shade: '#F5E4E1', cream: '#FFFDFB',
      line: '#5A3420', ear: '#F5A6B2', cheek: '#F7A0A2', nose: '#EE8C9A', mouth: '#C2455A',
      air: '#E9C4C2',                          // พ่นเงาขอบชมพูอ่อน (ไม่อมส้ม)
      earIn: '#F9C0BE', earEdge: '#EA8E98',    // หูในชมพูอมแซลมอน เส้นหูในชมพูเข้ม (ตามแบบ)
    },
    eyes: {
      left: { rimTop: '#CDEBFF', rimBot: '#3E93E0', coreIn: '#1D2C48', coreOut: '#080E1A' },     // ฟ้า
      right: { rimTop: '#E6F3A6', rimBot: '#8CB52C', coreIn: '#27311B', coreOut: '#0B0F06' },    // เขียวอมเหลือง
    },
    // ลายตามแบบ: หน้าขาวล้วน (ไม่มีแถบครีมแบบน้องส้ม) · ขนแก้มเส้นจางสามเส้นสองข้าง · หูขอบขาว ในชมพู ขนปุยขาวโผล่จากหัว
    // พุงขาวขอบฟุ้ง (ไม่ตัดเป็นวง) · หางขาวล้วน (ไม่มีปล้อง ไม่มีปลายครีม) · ลายตัวบาง/จางลง
    art: { faceCream: false, cheekFur: true, earFur: true, bellySoft: true, plainTail: true, stripeK: 0.72, stripeA: 0.85 },
    cat: '#FFF8F4', line: '#5A3420', dark: '#E6BCAE', cream: '#FFFFFF', pink: '#F5A6B2', eye: '#1D2C48', ink: '#1D2C48',
    whisker: 'rgba(90,52,32,.7)', rain: ['#FFFFFF', '#FFE3EC', '#E6BCAE'],
  },
  {
    id: 'calico', name: 'ขนมชั้น', note: 'แมวสามสี (ส้ม-เทา-ขาว) ตากลมเขียว · ตัวเมีย ขี้อ้อน', sex: 'f', stripes: false,
    pal: {
      cat: '#FFF8F0', stripe: '#E9A36E', shade: '#F2E3D6', cream: '#FFFDF8',
      line: '#5A3420', ear: '#F2A7AE', cheek: '#F7A2A2', nose: '#F08E98', mouth: '#C2455A',
      air: '#E2C6B4',                          // พ่นเงาขอบเบจอุ่น (พื้นขาว ไม่อมส้มทั้งตัว)
      earIn: '#F9C4C2', earEdge: '#EC98A0',    // หูในชมพู
    },
    eyeStyle: 'round',                         // ตากลมเขียวแบบใหม่ (drawRoundEye)
    eyes: { left: ROUND_EYE, right: ROUND_EYE },
    // หน้าขาว (ไม่มีแถบครีมแบบน้องส้ม) · ไม่มีพุงแยกสี (พื้นขาวอยู่แล้ว) · หางปล้องสามสี · ปื้นส้ม/เทาตาม CALICO
    art: { faceCream: false, noBelly: true, plainTail: true, calico: CALICO },
    cat: '#FFF8F0', line: '#5A3420', dark: '#E9A36E', cream: '#FFFFFF', pink: '#F2A7AE', eye: '#2B1B12', ink: '#2B1B12',
    whisker: 'rgba(90,52,32,.7)', rain: ['#FFFFFF', '#FDE2C8', '#C9C9D4'],
  },
  {
    id: 'siamese', name: 'วิเชียรมาศ', note: 'แมววิเชียรมาศ ตาฟ้า แต้มน้ำตาลเข้ม · ตัวผู้ หน้ากวน', sex: 'm', stripes: false,
    pal: {
      cat: '#FBF0DF', stripe: '#D9BC9A', shade: '#EEDCC2', cream: '#FCF3E4',   // ครีมอก ≈ สีตัว (ไม่เห็นวงอกขาว)
      line: '#4A2C1C', ear: '#C79A7E', cheek: '#F2A19C', nose: '#4A2E22', mouth: '#4A2C1C',
      air: '#C9A27E',                          // พ่นเงาขอบน้ำตาลอ่อน (ข้างตัวอมแทนแบบในแบบ)
      earIn: '#C79A80', earEdge: '#8C5E46',    // หูในแทนอมชมพูหม่น (หูนอกเข้มทั้งใบ)
      lid: '#F1E0C7',                          // สีเปลือกตาหน้ากวน (ขนครีมอมแทนนิด — ไม่ให้ดูเป็นอายแชโดว์)
      paw: '#7A5038',                          // อุ้งเท้า/เท้า (แต้มสีเข้ม)
    },
    eyes: {
      left: { rimTop: '#DDF0FF', rimBot: '#4E9BE6', coreIn: '#1B2638', coreOut: '#070B12' },
      right: { rimTop: '#DDF0FF', rimBot: '#4E9BE6', coreIn: '#1B2638', coreOut: '#070B12' },
    },
    // ตัวครีมไม่มีพุงแยกสี · หางเข้มทั้งเส้น · แต้มตาม SIAMESE · ตาปรือกวน + ปากบึ้ง ︿
    art: { faceCream: false, noBelly: true, plainTail: true, points: SIAMESE, grumpy: true },
    cat: '#FBF0DF', line: '#4A2C1C', dark: '#6E4733', cream: '#FFF8EC', pink: '#C79A80', eye: '#1B2638', ink: '#1B2638',
    whisker: 'rgba(74,44,28,.7)', rain: ['#FBF0DF', '#E6CBA8', '#6E4733'],
  },
];

function mix(a, b, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a;
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
/** จานสีตามสกินของแมว — แมวส้มใช้สีของแบบ ตัวอื่นสลับตามช่องสีของสกิน */
const palCache = new WeakMap();
const CAT2_BREED_IDS = new Set(['pearl', 'calico', 'siamese']);
/** น้องจากกล่องสายพันธุ์แบบใหม่ → เติมจานสี/ตา/ลายของ CAT2_BREEDS (เพศของตัวน้องเอง) — ก้อนเดิมต่อสกิน (ไม่สร้างใหม่ทุกเฟรม) */
const breedCache = new WeakMap();
function withBreed(s) {
  if (!s || s.pal || !CAT2_BREED_IDS.has(s.palette)) return s;
  let o = breedCache.get(s);
  if (!o) {
    const b = CAT2_BREEDS.find((x) => x.id === s.palette);
    o = { ...s, pal: b.pal, eyes: b.eyes, art: b.art, eyeStyle: b.eyeStyle, stripes: b.stripes, sex: s.sex || b.sex };
    breedCache.set(s, o);
  }
  return o;
}
function paletteOf(s) {
  if (s?.pal) return s.pal;   // แมวแบบใหม่ที่ออกแบบจานสีไว้เต็มชุด (CAT2_BREEDS)
  if (!s || s.id === 'orange') return DESIGN;
  let p = palCache.get(s);
  if (!p) {
    p = {
      cat: s.cat, stripe: s.dark, shade: mix(s.cat, s.dark, 0.35), cream: s.cream || '#FFF8EC',
      line: s.line || s.dark, ear: s.pink || DESIGN.ear, cheek: s.pink || DESIGN.cheek,
      nose: s.pink || DESIGN.nose, mouth: DESIGN.mouth,
    };
    palCache.set(s, p);
  }
  return p;
}

/** แปลง idle ของตัววาดเดิม ({ pose, k, mood, shape }) → ของตัววาดใหม่ (mood อยู่ในรูปร่าง) */
function toIdle(idle) {
  if (!idle) return null;
  const shape = { ...(idle.shape || IDLE_SHAPE[idle.pose] || {}) };
  if (idle.mood != null && shape.mood == null) shape.mood = idle.mood;
  return { k: idle.k ?? 1, shape, pose: idle.pose };
}
/**
 * วาดน้องทั้งตัว — แมวส้มตัวหลัก (ไม่ใส่ชุด) ใช้แบบใหม่ ตัวอื่นใช้ตัววาดเดิม
 * fit = ย่อแบบใหม่ในกรอบเล็ก (หัวโต หูสูงกว่าตัวเดิม ไม่ย่อหูจะชนขอบบน)
 */
export function drawCatAuto(ctx, x, feetY, scale, s, t = 0, idle = null, { fit = 0.86 } = {}) {
  if (CAT2.ui && useCat2(s)) return drawCat2(ctx, x, feetY, scale * fit, s, t, toIdle(idle));
  return drawCatPose(ctx, x, feetY, scale, s, t, idle);
}
/** วาดเฉพาะหน้า (รูปโปรไฟล์ อันดับ เพื่อน) — ตำแหน่ง/ขนาดเท่าของ drawCatFace เดิม */
export function drawCatFaceAuto(ctx, cx, cy, scale, s, opts = {}) {
  if (!(CAT2.ui && useCat2({ ...s, noPhoto: s.noPhoto || opts.noPhoto }))) return drawCatFace(ctx, cx, cy, scale, s, opts);
  // หัวแบบใหม่ (หู-หนวด กว้างราว 420 หน่วยไฟล์) ขนาดเท่าหน้าเดิม · กึ่งกลางหัวอยู่ที่ (cx, cy - เล็กน้อย)
  const s2 = scale * 0.86;
  const feet = cy - scale * 3 + (FEET_Y - 222) * UNIT * s2;
  drawCat2(ctx, cx, feet, s2, s, 60, { k: 1, shape: { mood: opts.mood || '' }, headOnly: true });
}

// ══ ดัดชิ้นส่วนทีละจุด (แบบกระดูกในเกมสามมิติ) ══
// หมุนชิ้นทั้งก้อน (ctx.rotate) แล้วขอบชิ้นจะเหลื่อมกับขอบตัวตรงรอยต่อ เห็นเป็นขั้นบันไดเล็ก ๆ
// จึงดัดทีละจุดแทน: จุดใกล้โคนแทบไม่ขยับ จุดไกลออกไปขยับเต็มที่ ไล่น้ำหนักนุ่ม ๆ
// ขอบชิ้นจึงต่อกับตัวเรียบเป็นเส้นเดียวตลอด เหมือนผิวที่ยืดตามกระดูก
// (ไฟล์จาก Figma ใช้แค่คำสั่งพิกัดจริง M C L H V Z — อ่านเองได้ไม่ต้องพึ่งไลบรารี)
function parseD(d) {
  const tk = d.match(/[MCLHVZ]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/gi) || [];
  const out = [];
  let i = 0, cmd = '', cx = 0, cy = 0;
  const num = () => +tk[i++];
  while (i < tk.length) {
    if (/[A-Za-z]/.test(tk[i])) cmd = tk[i++].toUpperCase();
    if (cmd === 'Z') { out.push(['Z']); continue; }
    if (cmd === 'M' || cmd === 'L') {
      cx = num(); cy = num();
      out.push([cmd, cx, cy]);
      if (cmd === 'M') cmd = 'L';
    } else if (cmd === 'H') { cx = num(); out.push(['L', cx, cy]); }
    else if (cmd === 'V') { cy = num(); out.push(['L', cx, cy]); }
    else if (cmd === 'C') {
      const a = [num(), num(), num(), num(), num(), num()];
      cx = a[4]; cy = a[5];
      out.push(['C', ...a]);
    } else i++;
  }
  return out;
}
function buildPath(cmds, f, into = new Path2D()) {
  for (const c of cmds) {
    if (c[0] === 'M') into.moveTo(...f(c[1], c[2]));
    else if (c[0] === 'L') into.lineTo(...f(c[1], c[2]));
    else if (c[0] === 'C') into.bezierCurveTo(...f(c[1], c[2]), ...f(c[3], c[4]), ...f(c[5], c[6]));
    else into.closePath();
  }
  return into;
}
function deformOps(ops, f) {
  return ops.map((op) => {
    if (op.kind === 'group') return { ...op, ops: deformOps(op.ops, f) };
    if (op.kind === 'clip') {
      const clip = new Path2D();
      for (const c of op.clipCmds) buildPath(c, f, clip);
      return { ...op, clip, ops: deformOps(op.ops, f) };
    }
    if (!op.cmds) return op;
    // เก็บจุดที่ดัดแล้วไว้ด้วย (hook ที่วาดเส้นเองจากจุด เช่น ขอบหูใน จะได้อยู่ตำแหน่งที่ดัดแล้ว)
    const cmds = op.cmds.map((q) => {
      if (q[0] === 'Z') return q;
      const o = [q[0]];
      for (let i = 1; i < q.length; i += 2) o.push(...f(q[i], q[i + 1]));
      return o;
    });
    // ปื้นไล่สี: จุดกลางย้ายตามการดัด (แขนยก หัวหัน) รัศมีคงเดิม
    const grad = op.grad?.c ? (() => { const [x, y] = f(op.grad.c[0], op.grad.c[1]); return { ...op.grad, m: { a: op.grad.r[0], b: 0, c: 0, d: op.grad.r[1], e: x, f: y } }; })() : op.grad;
    return { ...op, path: buildPath(op.cmds, f), cmds, grad };
  });
}
/** ทิศวนของเส้นรอบ (คำสั่ง M/L/C/Z) — ผลรวม shoelace ของจุดปลายทุกท่อน (บวก/ลบ = ตาม/ทวนเข็มบนจอ) */
function cmdsWinding(cmds) {
  let s = 0, px = null, py = null, sx = 0, sy = 0;
  for (const c of cmds) {
    if (c[0] === 'Z') { if (px != null) s += px * sy - sx * py; px = null; continue; }
    const x = c[c.length - 2], y = c[c.length - 1];
    if (c[0] === 'M') { sx = x; sy = y; } else if (px != null) s += px * y - x * py;
    px = x; py = y;
  }
  return s;
}
/** กลับทิศเส้นรอบ (ทีละรูปย่อย M…Z) — รูปเดิมทุกจุด แค่วนกลับด้าน */
function reverseCmds(cmds) {
  const out = [];
  let seg = [];
  const flush = () => {
    if (!seg.length) return;
    const pts = [seg[0].slice(1)];
    for (const c of seg.slice(1)) pts.push(c.slice(1));
    const end = pts[pts.length - 1];
    out.push(['M', end[end.length - 2], end[end.length - 1]]);
    for (let i = seg.length - 1; i >= 1; i--) {
      const c = seg[i], prev = pts[i - 1], px = prev[prev.length - 2], py = prev[prev.length - 1];
      if (c[0] === 'C') out.push(['C', c[3], c[4], c[1], c[2], px, py]);
      else out.push(['L', px, py]);
    }
    out.push(['Z']);
    seg = [];
  };
  for (const c of cmds) {
    if (c[0] === 'M') { flush(); seg = [c]; } else if (c[0] === 'Z') flush(); else seg.push(c);
  }
  flush();
  return out;
}
/** ชิ้นส่วนที่ดัดตามฟังก์ชันจุด f(x, y) → [x, y]
 *  uni = เส้นรอบที่วนทิศเดียวกันทุกรูป — ใช้รวมหลายชิ้นเป็นพื้นที่เดียว (detClip) ได้ไม่เป็นรู
 *  (ไฟล์ออกแบบวาดขาขวาวนกลับทิศกับตัว รวมกันตรง ๆ แล้วตรงที่ซ้อนกันหักล้างเป็นรู ลวดลายตรงนั้นหาย) */
function deformPart(part, f) {
  const sil = part.silCmds.map((c) => buildPath(c, f));
  const all = new Path2D();
  for (const p of sil) all.addPath(p);
  const uni = new Path2D();
  for (const c of part.silCmds) buildPath(cmdsWinding(c) < 0 ? reverseCmds(c) : c, f, uni);
  return { sil, all, uni, det: deformOps(part.det, f), patch: part.patch ? deformOps(part.patch, f) : null, sheet: !!part.sheet };
}
const rotPt = (c, a, x, y) => {
  const cs = Math.cos(a), sn = Math.sin(a), dx = x - c.x, dy = y - c.y;
  return [c.x + dx * cs - dy * sn, c.y + dx * sn + dy * cs];
};

// ══ อ่านไฟล์ออกแบบ → ชุดคำสั่งวาด ══
const MODELS = {};
/** 'front' = ด้านหน้า (cat-front.svg) · 'back' = ด้านหลัง (cat-back.svg) — ชื่อชิ้นและจุดหมุนชุดเดียวกัน */
function model(which = 'front') {
  if (MODELS[which]) return MODELS[which];
  const doc = new DOMParser().parseFromString(which === 'back' ? BACK_SVG : FRONT_SVG, 'image/svg+xml');
  const grads = {};
  for (const g of doc.querySelectorAll('radialGradient')) {
    let m = new DOMMatrix();
    const tr = g.getAttribute('gradientTransform') || '';
    for (const [, fn, args] of tr.matchAll(/(\w+)\(([^)]*)\)/g)) {
      const n = args.trim().split(/[\s,]+/).map(Number);
      if (fn === 'translate') m = m.translate(n[0], n[1] || 0);
      else if (fn === 'rotate') m = m.rotate(n[0]);
      else if (fn === 'scale') m = m.scale(n[0], n[1] ?? n[0]);
    }
    const stops = [...g.querySelectorAll('stop')].map((st) => [+(st.getAttribute('offset') || 0), st.getAttribute('stop-color')]);
    grads[g.id] = { m, stops };
  }
  const shapeOf = (el) => {
    if (el.tagName === 'ellipse') {
      const p = new Path2D();
      p.ellipse(+el.getAttribute('cx'), +el.getAttribute('cy'), +el.getAttribute('rx'), +el.getAttribute('ry'), 0, 0, TAU);
      return p;
    }
    return new Path2D(el.getAttribute('d'));
  };
  const groups = {};
  const compile = (el) => {
    const ops = [];
    for (const c of el.children) {
      const tag = c.tagName;
      if (tag === 'mask' || tag === 'defs') continue;
      if (tag === 'g') {
        const mk = c.getAttribute('mask');
        if (mk) {
          const mEl = doc.getElementById(mk.slice(5, -1));
          const clip = new Path2D();
          const clipCmds = [];
          for (const p of mEl.querySelectorAll('path')) {
            clip.addPath(shapeOf(p));
            clipCmds.push(parseD(p.getAttribute('d')));
          }
          ops.push({ kind: 'clip', clip, clipCmds, ops: compile(c) });
        } else {
          const g = { kind: 'group', id: c.id, ops: compile(c) };
          groups[c.id] = g.ops;
          ops.push(g);
        }
        continue;
      }
      if (tag !== 'path' && tag !== 'ellipse') continue;
      const fill = c.getAttribute('fill');
      const grad = fill && fill.startsWith('url(') ? grads[fill.slice(5, -1)] : null;
      ops.push({
        kind: 'shape', id: c.id, path: shapeOf(c),
        cmds: tag === 'path' ? parseD(c.getAttribute('d')) : null,
        fill: fill && fill !== 'none' && !grad ? fill.toUpperCase() : null, grad,
        fillAlpha: +(c.getAttribute('fill-opacity') || 1),
        stroke: c.getAttribute('stroke')?.toUpperCase() || null,
        width: +(c.getAttribute('stroke-width') || 1),
        cap: c.getAttribute('stroke-linecap') || 'butt',
        join: c.getAttribute('stroke-linejoin') || 'miter',
      });
    }
    return ops;
  };
  const root = doc.getElementById(`cat-${which}`);
  // แต่ละชิ้น: sil = รูปทรงเนื้อ (ใช้ทำเส้นรอบนอก+ลงสี) · det = รายละเอียดข้างใน (ลาย ครีม เงา ตา ...)
  // เส้นขอบเดิมของแต่ละชิ้น (id line*) ไม่ใช้ — เส้นรอบนอกมาจาก sil รวมทั้งชั้นแทน
  const parts = {};
  for (const c of root.children) {
    if (c.id === 'pivots') continue;
    const ops = compile(c.tagName === 'g' ? c : { children: [c] });
    const silOps = ops.filter((o) => o.kind === 'shape' && /^fill/.test(o.id));
    const sil = silOps.map((o) => o.path);
    const det = ops.filter((o) => !/^(fill|line)/.test(o.id || ''));
    const all = new Path2D();
    for (const p of sil) all.addPath(p);
    parts[c.id] = { sil, det, all, silCmds: silOps.map((o) => o.cmds) };
    if (c.id === 'head') parts[c.id].soft = SOFT_HEAD;   // ชั้นหัวใช้สนามสีผิวของหัว
  }
  // จุดหมุน: วงกลมรัศมี 5 ที่เริ่มเส้นจากจุดล่างสุด → จุดกลาง = (x, y - 5)
  const piv = {};
  for (const p of root.querySelectorAll('#pivots path')) {
    const [x, y] = p.getAttribute('d').match(/-?[\d.]+/g).map(Number);
    piv[p.id.replace('pivot-', '')] = { x, y: y - 5 };
  }
  // จุดกลางตา (จากรูม่านตา)
  const eye = {};
  for (const side of ['left', 'right']) {
    const e = root.querySelector(`#eye-${side} ellipse`);
    if (e) eye[side] = { x: +e.getAttribute('cx'), y: +e.getAttribute('cy') };
  }
  MODELS[which] = { parts, groups, piv, eye };
  return MODELS[which];
}

// ══ วาดชุดคำสั่ง ══
function color(c, pal) {
  if (!c) return null;
  const r = ROLE[c];
  return r ? pal[r] : c;
}
/**
 * hooks[id](ctx, draw) — ครอบกลุ่ม/ชิ้นที่มี id นั้นด้วยการขยับของตัวเอง แล้วเรียก draw() วาดเนื้อใน
 * ไม่เรียก draw() = วาดอย่างอื่นแทน (เช่น ตาปิด)
 */
function drawOps(ctx, ops, pal, hooks, opt) {
  for (const op of ops) {
    if (op.kind === 'group') {
      if (opt.noStripes && /^stripes/.test(op.id)) continue;
      const h = hooks[op.id];
      if (h) h(ctx, () => drawOps(ctx, op.ops, pal, hooks, opt), op);
      else drawOps(ctx, op.ops, pal, hooks, opt);
    } else if (op.kind === 'clip') {
      ctx.save();
      ctx.clip(op.clip);
      drawOps(ctx, op.ops, pal, hooks, opt);
      ctx.restore();
    } else if (hooks[op.id] && !opt.inHook) {
      hooks[op.id](ctx, () => drawOps(ctx, [op], pal, hooks, { ...opt, inHook: true }), op);
    } else {
      if (opt.noStripes && op.stroke && ROLE[op.stroke] === 'stripe') continue;
      if (op.grad) {
        ctx.save();
        ctx.clip(op.path);
        const { m, stops } = op.grad;
        ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        for (const [o, c] of stops) g.addColorStop(o, c);
        ctx.fillStyle = g;
        ctx.fillRect(-1.5, -1.5, 3, 3);
        ctx.restore();
      } else if (op.fill) {
        // คูณกับความโปร่งที่ hook ตั้งไว้ (เช่น ครีมหน้าจาง) — ไม่ทับค่าเดิม
        const a0 = ctx.globalAlpha;
        ctx.globalAlpha = a0 * op.fillAlpha;
        ctx.fillStyle = color(op.fill, pal);
        ctx.fill(op.path);
        ctx.globalAlpha = a0;
      }
      if (op.stroke) {
        ctx.strokeStyle = color(op.stroke, pal);
        ctx.lineWidth = op.width * LINE_K;
        ctx.lineCap = op.cap;
        ctx.lineJoin = op.join;
        if (ROLE[op.stroke] === 'stripe') {
          // ลายแบบพ่นสี: แถบกว้างจาง ๆ + แกนกลางเข้มกว่านิด (ขอบลายฟุ้ง ไม่คม)
          const a0 = ctx.globalAlpha, wk = opt.stripeK ?? 1, ak = opt.stripeA ?? 1;
          ctx.globalAlpha = a0 * 0.22 * ak;
          ctx.lineWidth = op.width * 2.6 * wk;
          ctx.stroke(op.path);
          ctx.globalAlpha = a0 * 0.3 * ak;
          ctx.lineWidth = op.width * 1.6 * wk;
          ctx.stroke(op.path);
          ctx.globalAlpha = a0 * 0.75 * ak;
          ctx.lineWidth = op.width * LINE_K * 0.8 * wk;
          ctx.stroke(op.path);
          ctx.globalAlpha = a0;
        } else {
          ctx.stroke(op.path);
        }
      }
    }
  }
}

/**
 * วาดหนึ่งชั้น (หลายชิ้นที่ต้องกลืนเป็นก้อนเดียว)
 * items: [{ sil: Path2D[], all: Path2D, det: ops | (ctx) => void, xf: (ctx) => void }]
 */
// ── สนามสีผิวแบบพ่นสี (airbrush) ของแต่ละชั้น (หน่วยในไฟล์ออกแบบ) ──
// cx, cy = จุดสว่างที่สุด · r = ระยะที่ไล่ถึงสีเข้มเต็มที่ · sx = ยืดแนวนอน (ตัวกว้างกว่าสูง)
const SOFT_BODY = { cx: 300, cy: 500, r: 175, sx: 1.25, light: { x: 285, y: 470 } };
const SOFT_HEAD = { cx: 300, cy: 250, r: 170, sx: 1.05, light: { x: 285, y: 205 } };
const softCache = new Map();
function softGrad(ctx, s, pal) {
  // ขอบเข้ม: สีเงาของสกิน (ส้มเข้ม) โปร่งตรงกลาง → ทึบเกือบเต็มที่ขอบ
  const key = s.cx + ':' + s.cy + ':' + pal.shade + pal.cat;
  let g = softCache.get(key);
  if (g && g.ctx === ctx) return g.list;
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
  const edge = /^#[0-9a-f]{6}$/i.test(pal.shade) ? rgb(mix(pal.shade, pal.stripe || pal.shade, 0.35)) : '217,110,40';
  const light = /^#[0-9a-f]{6}$/i.test(pal.cat) ? rgb(mix(pal.cat, '#FFF1DE', 0.55)) : '255,236,210';
  // วงรี: วาดวงกลมแล้วยืดแนวนอนด้วย gradient transform ไม่ได้ — ใช้รัศมีเท่ากันแต่ขยายจุดกลางสองจุดแทน
  const dark = ctx.createRadialGradient(s.cx, s.cy, s.r * 0.35, s.cx, s.cy, s.r * 1.25 * s.sx);
  dark.addColorStop(0, `rgba(${edge},0)`);
  dark.addColorStop(0.55, `rgba(${edge},.10)`);
  dark.addColorStop(1, `rgba(${edge},.62)`);
  const lit = ctx.createRadialGradient(s.light.x, s.light.y, 0, s.light.x, s.light.y, s.r * 0.9);
  lit.addColorStop(0, `rgba(${light},.95)`);
  lit.addColorStop(1, `rgba(${light},0)`);
  const list = [dark, lit];
  softCache.set(key, { ctx, list });
  return list;
}

// ══ พ่นสี (airbrush) แบบชีท: ขอบของแต่ละก้อนไล่เข้มเข้าด้านใน + เงาตกจากหัวลงอก ══
// ทำบนผ้าใบเล็กครึ่งความละเอียด (ภาพเบลออยู่แล้ว ไม่ต้องคม) เฉพาะกรอบตัวน้อง ไม่ทั้งจอ
const AB = { a: null, b: null, c: null, d: null, e: null };
function abCanvas(k, w, h) {
  let c = AB[k];
  if (!c) c = AB[k] = document.createElement('canvas').getContext('2d');
  if (c.canvas.width < w || c.canvas.height < h) {
    c.canvas.width = Math.max(w, c.canvas.width);
    c.canvas.height = Math.max(h, c.canvas.height);
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  c.shadowColor = 'transparent';
  c.shadowBlur = 0;
  c.clearRect(0, 0, w, h);
  return c;
}
const AB_RES = 0.5;
/**
 * กรอบของ "รู" ที่ใช้ตัดชิ้นที่ทับกันออก (rect นี้ + รูปชิ้น แบบ evenodd = ทุกที่ยกเว้นในชิ้น) — หน่วยไฟล์
 * ตัวน้องทั้งตัวอยู่ใน 0..600 × −20..700 (กรอบเดียวกับ abBox) เผื่อขอบรอบละ 400 สำหรับชิ้นที่หมุน/หัวตกตอนหมอบ/หันข้าง
 * เดิมใช้ 5000×5000 = ทุกครั้งที่ตัดต้องทำแผ่นตัดขอบเต็มทั้งจอ (Safari บน iPhone สร้างหน้ากากตามกรอบรู)
 * ตัววาดตัดแบบนี้หลายสิบครั้งต่อเฟรม · ที่วาดจริงอยู่ในรูปชิ้นเสมอ (ตัดซ้อนอีกชั้น) ภาพจึงเท่าเดิมทุกพิกเซล
 */
const HOLE_BOX = [-400, -400, 1400, 1500];
/**
 * เบลอด้วยการย่อแล้วขยายกลับ (ย่อสองขั้น ขยายสองขั้น ด้วยการเกลี่ยภาพของเบราว์เซอร์)
 * แทนการใช้เงาของภาพ (shadowBlur) ที่วาดไว้นอกผ้าใบ — Safari/Chrome บน iPhone ข้ามการวาดภาพที่อยู่นอกผ้าใบทั้งภาพ
 * เงาเลยหายไปด้วย (เงาพ่นสีส้มขึ้นแค่ตอนซูม ตอนเห็นเต็มตัวหาย) · วิธีนี้ได้ผลเหมือนกันทุกเครื่อง
 */
function blurInto(dst, src, W, H, px) {
  const k = Math.max(1, px * 0.75);
  const w2 = Math.max(1, Math.round(W / Math.sqrt(k))), h2 = Math.max(1, Math.round(H / Math.sqrt(k)));
  const w1 = Math.max(1, Math.round(W / k)), h1 = Math.max(1, Math.round(H / k));
  const e = abCanvas('e', w2, h2), d = abCanvas('d', w1, h1);
  for (const c of [e, d, dst]) { c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; }
  e.drawImage(src.canvas, 0, 0, W, H, 0, 0, w2, h2);
  d.drawImage(e.canvas, 0, 0, w2, h2, 0, 0, w1, h1);
  e.clearRect(0, 0, w2, h2);
  e.drawImage(d.canvas, 0, 0, w1, h1, 0, 0, w2, h2);
  dst.drawImage(e.canvas, 0, 0, w2, h2, 0, 0, W, H);
}
/** กรอบพิกเซลจริงของตัวน้อง (พิกัดไฟล์ 0..600 × 0..700) */
function abBox(m) {
  const P = [[0, -20], [600, -20], [0, 700], [600, 700]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  // ตรึงกรอบกับตาราง 16 พิกเซล — ผ้าใบครึ่งความละเอียดจึงเริ่มที่พิกเซลคู่เสมอ และขนาดไม่เปลี่ยนทีละพิกเซลตามท่า
  // (เดิมกรอบขยับทีละ 1px ทุกเฟรม → ตารางพิกเซลครึ่งความละเอียดเลื่อนครึ่งช่องสลับไปมา + ขนาดย่อตอนเบลอเด้ง = เงาส้มกะพริบรัว ๆ ตอนตัวหมุน)
  const G = 16;
  const x0 = Math.floor(Math.min(...P.map((q) => q[0])) / G) * G, y0 = Math.floor(Math.min(...P.map((q) => q[1])) / G) * G;
  const x1 = Math.ceil(Math.max(...P.map((q) => q[0])) / G) * G, y1 = Math.ceil(Math.max(...P.map((q) => q[1])) / G) * G;
  return { x0, y0, w: x1 - x0, h: y1 - y0 };
}
/** วาดเงา (sil ทุกชิ้นตาม xf) ลงผ้าใบเล็ก ในพิกัดเดียวกับจอแต่ย่อ AB_RES */
function abMask(c, m, box, items, dy = 0) {
  c.setTransform(AB_RES, 0, 0, AB_RES, -box.x0 * AB_RES, -box.y0 * AB_RES);
  c.transform(m.a, m.b, m.c, m.d, m.e, m.f);
  c.translate(0, dy);
  c.fillStyle = '#000';
  for (const it of items) {
    c.save();
    it.xf?.(c);
    for (const q of it.sil) c.fill(q);
    c.restore();
  }
}
/**
 * เงาขอบด้านใน: สีเข้มฟุ้งจากขอบก้อนเข้าไปด้านใน (ตามรูปร่างจริงของก้อน รวมหลายชิ้นเป็นก้อนเดียว)
 * passes = [[ระยะฟุ้ง (หน่วยไฟล์), ความเข้ม], ...] วาดตามลำดับ · rgba = สีเงา
 * หลายชั้นใช้แผ่นรูปทรง (mask) กับแผ่น "นอกก้อน" ชุดเดียวกัน — เดิมเรียกทีละชั้นแล้วสร้างสองแผ่นนี้ซ้ำทุกชั้น
 * (เติมรูปทุกชิ้นใหม่ + แปะภาพอีกรอบ ทุกชั้นทุกเฟรม) ภาพที่ได้เท่าเดิมทุกพิกเซล
 */
function rimShade(ctx, items, rgba, passes) {
  const m = ctx.getTransform();
  const box = abBox(m);
  const sc = Math.hypot(m.c, m.d) * AB_RES;   // สเกลแนวตั้ง: ไม่แกว่งตอนตัวหมุน (หมุน = บีบแนวนอน)
  const W = Math.ceil(box.w * AB_RES) + 4, H = Math.ceil(box.h * AB_RES) + 4;
  if (W < 4 || H < 4 || W > 4000 || H > 4000) return;
  const mask = abCanvas('a', W, H);
  abMask(mask, m, box, items);
  // นอกก้อน = สีเงา
  const out = abCanvas('b', W, H);
  out.fillStyle = rgba;
  out.fillRect(0, 0, W, H);
  out.globalCompositeOperation = 'destination-out';
  out.drawImage(mask.canvas, 0, 0);
  for (const [blur, alpha] of passes) {
    // เบลอด้วยการย่อ-ขยาย (blurInto) แล้วเหลือเฉพาะในก้อน
    const rim = abCanvas('c', W, H);
    blurInto(rim, out, W, H, Math.max(1, blur * sc));
    rim.globalCompositeOperation = 'source-in';
    rim.fillStyle = rgba;
    rim.fillRect(0, 0, W, H);
    rim.globalCompositeOperation = 'destination-in';
    rim.drawImage(mask.canvas, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(rim.canvas, 0, 0, W, H, box.x0, box.y0, W / AB_RES, H / AB_RES);
    ctx.restore();
  }
}
/** เงาตก: เงาของ caster (เลื่อนลง dy) ตกบน receiver เฉพาะในเนื้อ receiver */
function castShade(ctx, caster, receiver, rgba, blur, dy) {
  const m = ctx.getTransform();
  const box = abBox(m);
  const sc = Math.hypot(m.c, m.d) * AB_RES;   // สเกลแนวตั้ง: ไม่แกว่งตอนตัวหมุน (หมุน = บีบแนวนอน)
  const W = Math.ceil(box.w * AB_RES) + 4, H = Math.ceil(box.h * AB_RES) + 4;
  if (W < 4 || H < 4 || W > 4000 || H > 4000) return;
  const cast = abCanvas('a', W, H);
  abMask(cast, m, box, caster, dy);
  const sh = abCanvas('b', W, H);
  blurInto(sh, cast, W, H, Math.max(1, blur * sc));
  sh.globalCompositeOperation = 'source-in';
  sh.fillStyle = rgba;
  sh.fillRect(0, 0, W, H);
  const rec = abCanvas('c', W, H);
  abMask(rec, m, box, receiver);
  sh.globalCompositeOperation = 'destination-in';
  sh.drawImage(rec.canvas, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(sh.canvas, 0, 0, W, H, box.x0, box.y0, W / AB_RES, H / AB_RES);
  ctx.restore();
}
/** สีเงาพ่นของสกิน (ส้มเข้มอมน้ำตาล) เป็น rgba */
function shadeRgba(pal, a) {
  // ส้มสด (ไม่ผสมสีเส้นน้ำตาล — ผสมแล้วขุ่นเหมือนคราบ) ตามโทนพ่นสีในชีท
  const h = pal.air || (/^#[0-9a-f]{6}$/i.test(pal.stripe) ? mix(pal.stripe, '#FF7418', 0.25) : '#F07A20');
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
}

function drawLayer(ctx, items, pal, hooks, opt) {
  // 1) เส้นรอบนอก: ทุกชิ้นลงเส้นหนาสองเท่าไว้ข้างใต้ (ครึ่งในจะถูกเนื้อทับ เหลือเส้นแค่รอบนอก)
  ctx.strokeStyle = pal.line;
  ctx.lineWidth = LW * 2;
  ctx.lineJoin = 'round';
  for (const it of items) {
    ctx.save();
    it.xf?.(ctx);
    for (const p of it.sil) ctx.stroke(p);
    ctx.restore();
  }
  // 2) เนื้อของทุกชิ้น — ทับเส้นที่อยู่ในรอยต่อจนหมด
  ctx.fillStyle = pal.cat;
  for (const it of items) {
    ctx.save();
    it.xf?.(ctx);
    for (const p of it.sil) ctx.fill(p);
    ctx.restore();
  }
  // 2a) ลายสีขน (แมวสามสี: it.patch) ทาเป็นสีผิวของชิ้น — ตัดในเนื้อชิ้นตัวเอง ไม่เจาะรูชิ้นข้างหน้า
  //     ชิ้นที่ซ้อนกัน (ตัว/แขน/ขา) ทาปื้นสีเดียวกันทับกันพอดี จึงไม่มีเส้นรอยต่อ · ชิ้นข้างหน้าทาทีหลังจึงอยู่บนเสมอ (ยกแขนก็ถูกชั้น)
  //     ทาก่อนสนามไล่สี/เงาพ่นสี — ปื้นได้มิติกลม ๆ แบบเดียวกับขน (ไม่แบนเป็นสติกเกอร์)
  const mP = ctx.getTransform();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it.patch || !it.sil.length) continue;
    ctx.save();
    // เว้นชิ้นข้างหน้าที่ไม่ได้อยู่ในแผ่นลายเดียวกัน (เช่นหางที่ตวัดผ่านหน้าขา) — ไม่งั้นปื้นของขาทับหาง (ผู้ใช้ทัก 15 ต.ค.)
    for (let j = i + 1; j < items.length; j++) {
      const o = items[j];
      if (!o.sil.length || (it.sheet && o.sheet)) continue;
      ctx.setTransform(mP);
      o.xf?.(ctx);
      const hole = new Path2D();
      hole.rect(...HOLE_BOX);
      hole.addPath(o.all);
      ctx.clip(hole, 'evenodd');
    }
    ctx.setTransform(mP);
    it.xf?.(ctx);
    ctx.clip(it.all);
    if (typeof it.patch === 'function') it.patch(ctx);   // หาง/แขนท่อ/ตัวนั่ง: ทาแถบ/ปื้นเอง
    else drawOps(ctx, it.patch, pal, {}, {});
    ctx.restore();
  }
  // 2b) สีผิวแบบพ่นสี: สนามไล่สีเดียว (กลางสว่าง → ขอบเข้ม) ทาทุกชิ้นด้วยพิกัดเดียวกัน
  //     ชิ้นที่ซ้อนกันได้สีเท่ากันตรงรอยต่อพอดี จึงไม่มีขอบเงาโผล่กลางตัว
  const softOwner = items.find((it) => it.soft);
  const soft = softOwner?.soft || SOFT_BODY;
  const m00 = ctx.getTransform();
  const sg = softGrad(ctx, soft, pal);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it.sil.length) continue;
    ctx.save();
    // ตัดตามรูปชิ้นนี้ก่อน (กรอบตัดเล็ก) แล้วค่อยเจาะรูชิ้นก่อนหน้า — ผลเท่ากันทุกพิกเซล แต่การตัดชั้นถัด ๆ ไปถูกลงมาก
    ctx.setTransform(m00);
    it.xf?.(ctx);
    ctx.clip(it.all);
    // ทาแต่ละพิกเซลครั้งเดียว: เว้นที่ชิ้นก่อนหน้าทาไปแล้ว (ส่วนซ้อนทาซ้ำ = เข้มกว่า = เห็นขอบชิ้นเป็นเส้นตรง)
    for (let j = 0; j < i; j++) {
      if (!items[j].sil.length) continue;
      ctx.setTransform(m00);
      items[j].xf?.(ctx);
      const hole = new Path2D();
      hole.rect(...HOLE_BOX);
      hole.addPath(items[j].all);
      ctx.clip(hole, 'evenodd');
    }
    ctx.setTransform(m00);
    // แสงตามชิ้นเจ้าของสนาม (หัว) — หัวลดต่ำตอนหมอบ/นั่ง จุดสว่างต้องลงตามด้วย ไม่งั้นหัวมืดทั้งหัว
    softOwner?.xf?.(ctx);
    for (const g of sg) {
      ctx.fillStyle = g;
      ctx.fillRect(soft.cx - soft.r * 2, soft.cy - soft.r * 2, soft.r * 4, soft.r * 4);
    }
    ctx.restore();
  }
  // 2c) เงาขอบด้านในแบบพ่นสี — ขอบก้อนไล่เข้มเข้าไปด้านในตามรูปทรง (ทั้งชั้นเป็นก้อนเดียว ไม่มีรอยต่อ)
  if (airbrushOn() && !opt?.noAirbrush) {
    // วาดสองชั้น: ฟุ้งกว้างจาง + ฟุ้งแคบเข้มกว่าที่ขอบ (เหมือนพ่นสีหลายรอบ)
    const ab = items.filter((it) => it.sil.length);
    // ชิ้นเล็ก (ขาหน้า แขนที่วางทับตัว) ฟุ้งแคบลง — ไม่งั้นเงากินทั้งชิ้นจนเป็นแท่งเข้ม
    const small = ab.length && ab.every((it) => it.small);
    rimShade(ctx, ab, shadeRgba(pal, 1), small ? [[16, 0.55], [7, 0.4]] : [[42, 0.85], [14, 0.6]]);
  }
  // 3) รายละเอียดของแต่ละชิ้น ตัดให้อยู่ในเนื้อของชิ้นตัวเอง (ลายไม่ล้นออกนอกเส้น)
  //    และเว้นบริเวณที่ชิ้นข้างหน้าบังอยู่ — ไม่งั้นลาย/เงาของหางจะโผล่ทับขา ดูเหมือนหางมาอยู่ข้างหน้า
  const m0 = ctx.getTransform();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    ctx.save();
    ctx.setTransform(m0);
    it.xf?.(ctx);
    // detClip: ขอบเขตลงรายละเอียดที่กว้างกว่าตัวชิ้น (เช่น เงาข้างตัวไหลลงต้นขา ไม่ขาดเป็นเส้นตรงตรงรอยต่อ)
    // ตัดตามชิ้นก่อนเจาะรูชิ้นข้างหน้า (ผลเท่ากัน แต่ถูกกว่า — ดู 2b)
    if (it.sil.length) ctx.clip(it.detClip || it.all);
    for (let j = i + 1; j < items.length; j++) {
      if (!items[j].sil.length) continue;
      ctx.setTransform(m0);
      items[j].xf?.(ctx);
      const hole = new Path2D();
      hole.rect(...HOLE_BOX);
      hole.addPath(items[j].all);
      ctx.clip(hole, 'evenodd');
    }
    ctx.setTransform(m0);
    it.xf?.(ctx);
    if (typeof it.det === 'function') it.det(ctx);
    else drawOps(ctx, it.det, pal, hooks, opt);
    ctx.restore();
  }
}

/** หมุนรอบจุด (หน่วยในไฟล์ออกแบบ) */
/** จุดกลางแนวนอนของชิ้น (จากจุดในเส้นทั้งหมด) — แคชไว้ */
function opCenterX(op) {
  if (op._cx != null) return op._cx;
  let sum = 0, n = 0;
  const walk = (o) => {
    if (o.cmds) for (const q of o.cmds) for (let i = 1; i < q.length; i += 2) { sum += q[i]; n++; }
    for (const c of o.ops || []) walk(c);
  };
  walk(op);
  op._cx = n ? sum / n : 300;
  return op._cx;
}
/** หาชิ้นตาม id ในชุดคำสั่ง (ไล่ลงไปในกลุ่ม/clip) */
function findOp(ops, id) {
  for (const o of ops) {
    if (o.id === id) return o;
    if (o.ops) { const r = findOp(o.ops, id); if (r) return r; }
  }
  return null;
}
function rotAt(ctx, p, a) {
  if (!a) return;
  ctx.translate(p.x, p.y);
  ctx.rotate(a);
  ctx.translate(-p.x, -p.y);
}

// ══ หาง — วาดด้วยโค้ดในลายเส้นเดียวกับแบบ ══
/**
 * กระดูกสันหางเป็นข้อ ๆ ต่อกัน แต่ละข้อหักเพิ่มทีละนิดจนปลายม้วนขึ้น
 * การแกว่งเป็นคลื่นวิ่งจากโคนไปปลาย (ปลายแกว่งมากกว่าและตามหลังโคน) — หางจึงนุ่มไม่แข็งเป็นไม้
 * ผสมสองความถี่ ไม่ให้จังหวะซ้ำเป๊ะเหมือนเครื่องจักร · โคนซ่อนในตัว (ชั้นเดียวกับตัว จึงไม่มีรอยต่อ)
 */
/**
 * base = { x, y, a, curl } โคนหาง ทิศเริ่ม และทิศม้วน (+1 ม้วนตามเข็ม / -1 ทวน)
 * wagOff = มุมหางที่ท่าสั่ง (ค่าลบ = ชูหางขึ้น) · short = หางขดสั้นเข้าหาตัว
 */
/**
 * จังหวะหางแบบแมวจริง (คิดจากเวลาอย่างเดียว ใช้ร่วมทุกท่า)
 *   sway  -1..1  แกว่งขี้เกียจ ๆ ช้า ๆ สองจังหวะผสมกัน (ไม่ซ้ำเป๊ะเหมือนลูกตุ้ม)
 *   lag   -1..1  แกว่งชุดเดียวกันแต่ช้ากว่า — ใช้กับปลายหาง (ปลายตามหลังโคน)
 *   flick -1..1  กระดิกปลายหาง: ทุก ~3.4 วิ สุ่มว่าจะกระดิก 1 ที หรือ 2 ทีติด หรือไม่กระดิก
 *   curl   0..1  ม้วนปลายเป็นเครื่องหมายคำถามแว้บหนึ่ง (อารมณ์ดี) แล้วคลาย — เป็นครั้งคราว
 */
function tailLife(T) {
  const sway = Math.sin(T * 0.95) * 0.65 + Math.sin(T * 0.41 + 1.3) * 0.35;
  const lag = Math.sin(T * 0.95 - 0.7) * 0.65 + Math.sin(T * 0.41 + 0.9) * 0.35;
  const P = 3.4, n = Math.floor(T / P), c = T - n * P;
  const one = (x) => (x >= 0 && x < 0.36 ? Math.sin((x / 0.36) * Math.PI * 2) * (1 - x / 0.36) : 0);
  const hz = hash(n * 7 + 3);
  const flick = hz > 0.3 ? one(c) + (hz > 0.7 ? one(c - 0.4) * 0.8 : 0) : 0;
  const Q = 7.3, m = Math.floor(T / Q), d = T - m * Q;
  const curl = hash(m + 41) > 0.5 && d < 1.6 ? Math.sin((d / 1.6) * Math.PI) : 0;
  // ตวัดหาง: เป็นพัก ๆ (ทุก ~5.2 วิ สุ่ม) กวาดหางไปสุดทางแล้วตวัดกลับหนึ่งรอบ แบบแมวนั่งเฉย ๆ แล้วฟาดหางเล่น
  // swishLag = จังหวะเดียวกันแต่ช้ากว่า 0.15 วิ ใช้กับปลายหาง (ปลายสะบัดตามหลัง)
  const swishAt = (tt) => {
    const S = 5.2, k = Math.floor(tt / S), e = tt - k * S, D = 1.4;
    if (hash(k * 3 + 11) < 0.4 || e > D) return 0;
    const u = e / D;
    return Math.sin(u * Math.PI * 2) * Math.sin(u * Math.PI) * (hash(k + 5) > 0.5 ? 1 : -1);
  };
  return { sway, lag, flick, curl, swish: swishAt(T), swishLag: swishAt(T - 0.15) };
}
/** ความหนาหาง (ครึ่งความกว้าง) ทุกท่าใช้ชุดเดียว — ผอมเรียวตามแบบ: โคน 11 → ปลาย 7.5 */
const TAIL_HALF = (i, N = 16) => 11 - 3.5 * (i / N);
function tailGeom(T, wag, base, wagOff = 0, short = 0) {
  const N = 16, seg = 20 * (1 - short * 0.35);
  // ส่ายทั้งหางจากโคนไปมาช้า ๆ (~4 วิ/รอบ) — ยืนเฉย ๆ หางก็ไม่นิ่ง (wag = 1 ตอนว่าง ลดลงตอนเล่นท่า)
  const life = tailLife(T);
  const swing = (life.sway * 0.28 + life.swish * 0.5) * wag;
  let x = base.x, y = base.y, a = base.a - base.curl * wagOff * 0.35 + base.curl * swing;
  const pts = [{ x, y, a }];
  for (let i = 1; i <= N; i++) {
    const f = i / N;
    // คลื่นวิ่งจากโคนไปปลาย ปลายหางจึงสะบัดตามหลังโคนเป็นจังหวะ ๆ (ดูนุ่ม มีน้ำหนัก)
    // คลื่นอ่อน ๆ วิ่งจากโคนไปปลาย + ปลายตามหลังโคน (lag) + กระดิกปลาย + ม้วนปลายเป็นครั้งคราว
    const w1 = Math.sin(T * 1.9 - i * 0.38) * 0.05;
    const tip = f ** 3;
    a += base.curl * ((0.015 + 0.16 * f + 0.3 * f ** 5) * (1 + short * 1.4)
      + (w1 + (life.lag - life.sway) * 0.08 + (life.swishLag - life.swish) * 0.18) * f * wag
      + (life.flick * 0.3 + life.curl * 0.14) * tip);
    x += Math.cos(a) * seg;
    y += Math.sin(a) * seg;
    pts.push({ x, y, a });
  }
  const half = (i) => TAIL_HALF(i, N);
  const L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const p = pts[i], h = half(i), nx = -Math.sin(p.a), ny = Math.cos(p.a);
    L.push([p.x + nx * h, p.y + ny * h]);
    R.push([p.x - nx * h, p.y - ny * h]);
  }
  const tip = pts[N];
  const path = new Path2D();
  const smooth = (arr, first) => {
    if (first) path.moveTo(...arr[0]); else path.lineTo(...arr[0]);
    for (let i = 1; i < arr.length - 1; i++) {
      path.quadraticCurveTo(arr[i][0], arr[i][1], (arr[i][0] + arr[i + 1][0]) / 2, (arr[i][1] + arr[i + 1][1]) / 2);
    }
    path.lineTo(...arr[arr.length - 1]);
  };
  smooth(L, true);
  path.arc(tip.x, tip.y, half(N), tip.a + Math.PI / 2, tip.a - Math.PI / 2, true);
  smooth(R.slice().reverse(), false);
  path.closePath();
  return { path, pts, half, N };
}
function tailDetails(ctx, G, pal, opt = {}) {
  const plain = !!opt.plainTail;   // หางขาวล้วนตามแบบ (แมวขาว): ไม่มีปล้อง ไม่มีปลายครีม
  const { pts, half, N } = G;
  // หางสีแต้มทั้งเส้น (วิเชียรมาศ): ทาทับในชั้นลวดลาย (ชั้นลงสีพื้นโดนสนามไล่สีขนทาจนซีด) · เข้มขึ้นไปทางปลายนิด ไม่มีปลายครีม
  if (opt.calico?.tailAll) {
    const a = pts[0], b = pts[N];
    const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, mix(opt.calico.d, '#FBF0DF', 0.18));
    g.addColorStop(1, mix(opt.calico.d, '#2A160C', 0.15));
    ctx.fillStyle = g;
    ctx.fillRect(-2000, -2000, 5000, 5000);
    return;
  }
  // เงาด้านใต้หาง ให้ดูกลมเหมือนแขนขา
  ctx.strokeStyle = flatShade(pal);
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const p = pts[i], h = half(i) - 3, nx = -Math.sin(p.a), ny = Math.cos(p.a);
    if (i) ctx.lineTo(p.x - nx * h, p.y - ny * h); else ctx.moveTo(p.x - nx * h, p.y - ny * h);
  }
  ctx.stroke();
  // ลายขวางเป็นปล้อง ๆ แบบลายแขนขาของแบบ
  if (!opt.noStripes && !plain) {
    ctx.strokeStyle = pal.stripe;
    ctx.lineWidth = 4;
    for (const i of [6, 9, 12]) {
      const p = pts[i], h = half(i) + 2, nx = -Math.sin(p.a), ny = Math.cos(p.a);
      const bx = Math.cos(p.a) * 4, by = Math.sin(p.a) * 4;
      ctx.beginPath();
      ctx.moveTo(p.x + nx * h, p.y + ny * h);
      ctx.quadraticCurveTo(p.x + bx, p.y + by, p.x - nx * h * 0.55, p.y - ny * h * 0.55);
      ctx.stroke();
    }
  }
  // ปลายหางสีครีม เข้าชุดกับอุ้งเท้า (แมวสามสี: ปล้องทาเป็นสีขนตอนลงสีพื้น — ดู calPatch)
  if (plain && !opt.calico) return;
  const tip = pts[N];
  ctx.fillStyle = pal.cream;
  ctx.beginPath();
  ctx.arc(tip.x - Math.cos(tip.a) * 2, tip.y - Math.sin(tip.a) * 2, half(N) + 6, 0, TAU);
  ctx.fill();
}

// ══ ตา ══
/** ตาปิด: โค้งลง (กะพริบ/หลับ) · ^ (ดีใจ) · > < (เจ็บ) */
/**
 * ขนตาตอนหลับตา (ตัวเมีย): สองเส้นเรียวงอนขึ้นที่หางตาด้านนอก — งอกจากเส้นตาปิด สีเดียวกับเส้นตา
 * kind: 'blink' (∪ หลับ) · 'happy' (∩ ยิ้ม) · 'yawn' (U หาว)
 * ฐานขนตาทุกเส้นฝังลงในเนื้อเส้นตาปิด (จุดบนขอบเส้นจริง แล้วดันเข้าในอีกนิด) — เดิมเส้นที่สองตั้งเหนือขอบเส้น
 * (ตาหาวลอยกลางช่อง U) เห็นเป็นขนตาขาดจากเปลือกตา (ผู้ใช้ทัก 14 ต.ค.)
 */
function closedLashes(c, e, side, kind) {
  const o = side === 'left' ? -1 : 1;
  // ขนตาหนึ่งเส้น: ฐานกว้างฝังในเส้นตา → เรียวโค้งงอนไปที่ปลาย (b = ฐาน · k = จุดโค้ง · t = ปลาย · w = ครึ่งความกว้างฐาน)
  const lash = ([x0, y0], [cx, cy], [tx, ty], w) => {
    const dx = cx - x0, dy = cy - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    const q = new Path2D();
    q.moveTo(x0 + nx * w, y0 + ny * w);
    q.quadraticCurveTo(cx + nx * w * 0.45, cy + ny * w * 0.45, tx, ty);
    q.quadraticCurveTo(cx - nx * w * 0.45, cy - ny * w * 0.45, x0 - nx * w, y0 - ny * w);
    q.closePath();
    c.fill(q);
  };
  const P = (dx, dy) => [e.x + o * dx, e.y + dy];
  c.fillStyle = BABY.coreIn;
  if (kind === 'yawn') {
    // ตัว U: ปลายแขน U อยู่ที่ (±30, −12) · ขอบนอกแขนช่วงบนอยู่ราว x ±29..31
    lash(P(28.5, -7), P(40, -14), P(46, -27), 3.4);        // เส้นยาว: จากปลายแขน U งอนออกนอก
    lash(P(29, 2), P(38, -1), P(45, -10), 3);              // เส้นสั้น: จากข้างแขน U ใต้ปลายลงมา
    return;
  }
  if (kind === 'happy') {
    // ∩ ยิ้ม: ปลายตาที่ (±38, +12) · ขอบบนที่ x 27 ≈ y 0 (เนื้อเส้นถึง y 7)
    lash(P(34, 9), P(46, 7), P(53, -5), 3.4);
    lash(P(26, 3), P(31, -6), P(33, -15), 3);
    return;
  }
  // ∪ หลับ: ปลายตาที่ (±40, +4) · ขอบบนเกือบตรง (ที่ x 28 อยู่ราว y 5) เนื้อเส้นหนาลงล่าง
  lash(P(36, 5.5), P(49, 3), P(56, -9), 3.4);
  lash(P(27, 7), P(32, -2), P(35, -12), 3);
}
/** ขนแก้ม (ตามแบบแมวขาว): เส้นโค้งสั้น ๆ จาง ๆ สามเส้นที่ขอบแก้มสองข้าง ใต้ระดับตา */
function cheekFur(c, pal, opt) {
  c.save();
  c.strokeStyle = pal.stripe;
  c.lineCap = 'round';
  for (const o of [-1, 1]) {
    const x0 = 300 + o * 162;
    for (let i = 0; i < 3; i++) {
      const y = 308 + i * 9;
      for (const [w, a] of [[4.4, 0.22], [2, 0.6]]) {
        c.globalAlpha = a * (opt.stripeA ?? 1);
        c.lineWidth = w;
        c.beginPath();
        c.moveTo(x0, y);
        c.quadraticCurveTo(x0 - o * 9, y - 2.5, x0 - o * 17, y + 1 + i * 1.2);
        c.stroke();
      }
    }
  }
  c.restore();
}
/**
 * ขนปุยในหู (ตามแบบแมวขาว): ขนขาวเป็นปอยเรียวแหลมงอกจากหัวขึ้นไปในชมพูของหู ฝั่งติดกลางหัว
 * วาดในชั้นหู (หลังหัว) — โคนปอยจมใต้หัวพอดี เห็นแต่ปลายที่โผล่ขึ้นมาเป็นขอบขนหยัก ๆ
 * b = กรอบเส้นหูใน · left = หูซ้ายจอ (ปอยเอนออกซ้าย) · หูขวากลับข้าง
 */
function earFur(c, b, left, pal) {
  const o = left ? 1 : -1;                       // ทิศเข้าหากลางหัว
  const ix = left ? b.x1 : b.x0, w = b.x1 - b.x0, hgt = b.y1 - b.y0;
  // ปอยขน: [จุดโคน (สัดส่วนจากขอบฝั่งกลางหัว, สัดส่วนความสูง), ความยาว, มุมเอน (ลบ = เอนออกนอกหู), ความกว้างโคน]
  // ปอยใหญ่สามปอยเอนเป็นพัด + ปอยเล็กแทรก — ปลายแหลมโค้งนิด ๆ เหมือนพู่กันปัด
  const tufts = [
    [0.08, 0.5, 40, -0.62, 7], [0.22, 0.58, 46, -0.5, 8], [0.38, 0.68, 40, -0.4, 7.5], [0.52, 0.77, 30, -0.3, 6],
    [0.15, 0.55, 30, -0.85, 4], [0.3, 0.63, 32, -0.72, 4], [0.45, 0.72, 26, -0.6, 3.5],
  ];
  const strand = (x0, y0, len, ang, wd) => {
    const dx = -o * Math.sin(-ang) * len, dy = -Math.cos(ang) * len;
    const tx = x0 + dx, ty = y0 + dy, nx = -dy / len, ny = dx / len;
    const mx = x0 + dx * 0.5 + o * 4, my = y0 + dy * 0.5;   // โค้งป่องเข้าหากลางหัว
    const q = new Path2D();
    q.moveTo(x0 + nx * wd, y0 + ny * wd);
    q.quadraticCurveTo(mx + nx * wd * 0.6, my + ny * wd * 0.6, tx, ty);
    q.quadraticCurveTo(mx - nx * wd * 0.6, my - ny * wd * 0.6, x0 - nx * wd, y0 - ny * wd);
    q.closePath();
    return q;
  };
  c.save();
  const a0 = c.globalAlpha;
  // ฟุ้งขาวนุ่มที่โคนปอย (ขนแน่นตรงรอยต่อหัว-หู)
  const gx = ix - o * 0.3 * w, gy = b.y0 + 0.66 * hgt;
  const rg = c.createRadialGradient(gx, gy, 0, gx, gy, 0.42 * w);
  rg.addColorStop(0, 'rgba(255,255,255,.75)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = rg;
  c.fillRect(gx - w, gy - w, w * 2, w * 2);
  c.lineJoin = 'round';
  c.strokeStyle = '#FFFFFF';
  c.fillStyle = '#FFFFFF';
  for (const [fx, fy, len, ang, wd] of tufts) {
    const q = strand(ix - o * fx * w, b.y0 + fy * hgt, len, ang, wd);
    // ขอบฟุ้งก่อน (ขนนุ่ม) แล้วตัวปอยขาว
    c.globalAlpha = a0 * 0.22;
    c.lineWidth = 6;
    c.stroke(q);
    c.globalAlpha = a0 * 0.4;
    c.lineWidth = 2.5;
    c.stroke(q);
    c.globalAlpha = a0 * 0.92;
    c.fill(q);
  }
  // เส้นขนเส้นเล็กอมชมพูในปอยใหญ่ (ให้ดูเป็นขนหลายเส้น ไม่ใช่ก้อนขาว)
  c.globalAlpha = a0 * 0.35;
  c.strokeStyle = pal.earEdge || pal.ear;
  c.lineWidth = 1;
  c.lineCap = 'round';
  for (const [fx, fy, len, ang] of tufts.slice(0, 3)) {
    const x0 = ix - o * fx * w, y0 = b.y0 + fy * hgt;
    const dx = -o * Math.sin(-ang) * len, dy = -Math.cos(ang) * len;
    c.beginPath();
    c.moveTo(x0 + dx * 0.3, y0 + dy * 0.3);
    c.quadraticCurveTo(x0 + dx * 0.55 + o * 3, y0 + dy * 0.55, x0 + dx * 0.8, y0 + dy * 0.8);
    c.stroke();
  }
  c.restore();
}
function closedEyeBase(ctx, e, pal, kind, side) {
  // ตาปิดทุกแบบ (∩ ∪ U > <) ใช้สีน้ำตาลเข้มเดียวกับตาดำ (BABY.coreIn) ไม่ใช่สีเส้นขอบตัว — ผู้ใช้ขอ
  const ink = BABY.coreIn;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6 * LINE_K;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (kind === 'hurt') {
    const d = side === 'left' ? 1 : -1;   // ปลายแหลมชี้เข้าหาจมูก
    ctx.moveTo(e.x - 30 * d, e.y - 22);
    ctx.lineTo(e.x + 26 * d, e.y);
    ctx.lineTo(e.x - 30 * d, e.y + 22);
  } else if (kind === 'yawn') {
    // ตัว U (ตามแบบหน้าหาว) ทรงเสี้ยวแบบตาปิด: หนาตรงก้น U เรียวขึ้นไปปลายมน + จุดประกายขาว
    const u = new Path2D();
    u.moveTo(e.x - 30, e.y - 12);
    u.bezierCurveTo(e.x - 32, e.y + 34, e.x + 32, e.y + 34, e.x + 30, e.y - 12);   // ขอบนอก (ล่าง)
    u.bezierCurveTo(e.x + 25, e.y + 19, e.x - 25, e.y + 19, e.x - 30, e.y - 12);   // ขอบใน (บน)
    u.closePath();
    ctx.fillStyle = ink;
    ctx.fill(u);
    ctx.lineWidth = 3.5;
    ctx.stroke(u);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(e.x - 9, e.y + 17, 4.6, 3.4, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e.x + 6, e.y + 17.5, 2.7, 0, TAU);
    ctx.fill();
    return;
  } else {
    // ── หลับตา (ดีใจ ∩ / หลับ ∪): เส้นหนาโค้งเรียบแบบพระจันทร์เสี้ยว หนากลาง เรียวปลายมน (ตามภาพอ้างอิง) ──
    const up = kind === 'happy';
    const w = up ? 38 : 40;
    const yE = e.y + (up ? 12 : 4);               // ระดับปลายตาสองข้าง
    const c1 = up ? e.y - 36 : e.y + 8;           // โค้งบน
    const c2 = up ? e.y - 8 : e.y + 34;           // โค้งล่าง (ห่างจากโค้งบน = ความหนากลางตา)
    const lens = new Path2D();
    lens.moveTo(e.x - w, yE);
    lens.quadraticCurveTo(e.x, c1, e.x + w, yE);
    lens.quadraticCurveTo(e.x, c2, e.x - w, yE);
    lens.closePath();
    ctx.fillStyle = ink;
    ctx.fill(lens);
    ctx.lineWidth = 3.5;   // เส้นสีเดียวกันรอบนอก = ปลายตามน ไม่แหลมคม
    ctx.stroke(lens);
    // จุดประกายขาวในตา (น่ารักขึ้น) — สองจุดเล็กเยื้องซ้ายกลางเนื้อเส้น
    const my = (yE + (up ? c1 : c1) ) / 2 + (up ? 6 : 6);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(e.x - 9, my, 4.2, 3.2, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e.x + 5, my - (up ? 1 : -1), 2.4, 0, TAU);
    ctx.fill();
    return;
  }
  ctx.stroke();
}

// ══ ตาเฟี้ยว (ท่าลอยเฟี้ยว) — ลูกตาข้างในคงเดิม เพิ่มแค่เปลือกตาบนปรือ (ผู้ใช้ให้เอาคิ้ว/หางตาออก) ══
/** จุดกลางกับรัศมีของตาขาวในไฟล์ (eye-left / eye-right) */
const EYE_WHITE = { left: { x: 226.6, y: 268.7 }, right: { x: 373.4, y: 268.7 }, r: 49 };
/**
 * เปลือกตาบนหนัก ๆ ลงมาบังครึ่งบนของตา (เอียงต่ำลงหาจมูก) = ตาปรือแบบกวน ๆ ตามแบบ
 * ลงสีขนทับเฉพาะในตาขาว แล้วลากเส้นขอบเปลือกตาหนากว่าเส้นปกตินิด
 */
/**
 * ตาหน้ากวน (แมววิเชียรมาศ) — วาดใหม่ทั้งดวง ไม่ใช่เอาเปลือกตาไปทับตากลมเดิม (ผู้ใช้ทัก 15 ต.ค.)
 * รูปตา = ครึ่งล่างของวงตา ตัดด้วยเส้นเปลือกตาบนที่เอียงต่ำลงหาจมูก · เหนือเส้นเป็นขนหน้า (ไม่วาดอะไร)
 * ข้างใน: ม่านตาฟ้าเต็มรูปตา รูม่านตาดำโตเยื้องขึ้นใต้เปลือกตา ประกายสองจุด · ขอบ: เปลือกตาเส้นหนา + ขอบล่างเส้นบาง
 */
function drawGrumpyEye(c, white, side, { lx = 0, ly = 0, sparkle = 0, t = 0, col = BABY, line = '#4A2C1C', starDots = false, starOne = false } = {}) {
  const W = EYE_WHITE[side], R = EYE_WHITE.r, d = side === 'left' ? 1 : -1;   // d = ทิศไปหาจมูก
  const yo = W.y - 20, yi = W.y - 4;   // มุมนอกสูงกว่า มุมใน (ข้างจมูก) ต่ำลง
  const xo = W.x - d * (R + 4), xi = W.x + d * (R + 4);
  const lidPath = new Path2D();
  lidPath.moveTo(xo, yo);
  lidPath.quadraticCurveTo(W.x - d * 4, (yo + yi) / 2 - 7, xi, yi);
  const below = new Path2D(lidPath);
  below.lineTo(xi, W.y + R + 12);
  below.lineTo(xo, W.y + R + 12);
  below.closePath();
  // ── ในตา ──
  c.save();
  c.clip(white);
  c.clip(below);
  const g = c.createLinearGradient(0, W.y - R * 0.4, 0, W.y + R);
  g.addColorStop(0, col.rimTop);
  g.addColorStop(1, col.rimBot);
  c.fillStyle = g;
  c.fillRect(W.x - R - 6, W.y - R - 6, (R + 6) * 2, (R + 6) * 2);
  const ix = W.x + d * 3 + lx * 0.8, iy = W.y - 6 + ly * 0.6, ir = R - 9;
  const core = c.createRadialGradient(ix - 5, iy - 6, 2, ix, iy, ir);
  core.addColorStop(0, col.coreIn);
  core.addColorStop(1, col.coreOut);
  c.fillStyle = core;
  c.beginPath();
  c.arc(ix, iy, ir, 0, TAU);
  c.fill();
  // แสงสะท้อนนุ่มครึ่งล่างของรูม่านตา (ตาใส)
  const gl = c.createRadialGradient(ix + d * 6, iy + ir * 0.55, 0, ix + d * 6, iy + ir * 0.55, ir * 0.7);
  gl.addColorStop(0, 'rgba(150,200,255,.35)');
  gl.addColorStop(1, 'rgba(150,200,255,0)');
  c.fillStyle = gl;
  c.beginPath();
  c.arc(ix, iy, ir, 0, TAU);
  c.fill();
  // ประกาย: ใต้เปลือกตาพอดี (ทิศแสงบนซ้าย)
  const dot = eyeDots(c, ix, iy, ir, starDots, t, starOne);
  dot(-0.32, 0.12, 0.2, true);
  dot(0.3, 0.42, 0.1);
  if (sparkle > 0 && !starDots) star4(c, ix + 14, iy + 4, 9 * sparkle);
  c.restore();
  // ── ขอบตา ──
  c.save();
  c.clip(below);
  c.strokeStyle = line;
  c.lineWidth = EYE_RIM_W * 1.3;
  c.stroke(white);
  c.restore();
  // เส้นเปลือกตาบนหนา ตัดในวงตา (ปลายพอดีขอบตา ไม่ยื่นเลย)
  const rim = new Path2D();
  rim.arc(W.x, W.y, R + 1.5, 0, TAU);
  c.save();
  c.clip(rim);
  c.strokeStyle = line;
  c.lineCap = 'round';
  c.lineWidth = 8 * LINE_K;
  c.stroke(lidPath);
  c.restore();
}
/**
 * เปลือกตาหน้ากวน (แมววิเชียรมาศ): เปลือกตาบนหนักลงมาบังเกือบครึ่งตา เอียงต่ำลงหาจมูก (ตาเหลือบแบบเบื่อโลก)
 * ลงสีเปลือกตา (pal.lid) ทับเฉพาะในตาขาว แล้วลากขอบเปลือกตาหนา
 */
function grumpyLid(c, white, pal, side) {
  const W = EYE_WHITE[side], R = EYE_WHITE.r, d = side === 'left' ? 1 : -1;   // d = ทิศไปหาจมูก
  const xo = W.x - d * (R + 6), xi = W.x + d * (R + 6);
  const yo = W.y - 13, yi = W.y + 1;   // มุมนอกสูงกว่า มุมใน (ข้างจมูก) ต่ำลง
  const lid = new Path2D();
  lid.moveTo(xo, yo);
  lid.quadraticCurveTo(W.x, (yo + yi) / 2 - 6, xi, yi);
  const cover = new Path2D();
  cover.addPath(lid);
  cover.lineTo(xi, W.y - R - 20);
  cover.lineTo(xo, W.y - R - 20);
  cover.closePath();
  c.save();
  c.clip(white);
  c.fillStyle = pal.lid || pal.cat;
  c.fill(cover);
  c.restore();
  c.save();
  c.clip(cover);
  c.strokeStyle = pal.lid || pal.cat;
  c.lineWidth = 4;
  c.stroke(white);
  c.restore();
  c.save();
  c.clip(white);
  c.strokeStyle = pal.line;
  c.lineCap = 'round';
  c.lineWidth = 8 * LINE_K;
  c.stroke(lid);
  c.restore();
}
function coolLid(c, white, pal, side, ang = 0, lashes = false) {
  const W = EYE_WHITE[side], R = EYE_WHITE.r, d = side === 'left' ? 1 : -1;   // d = ทิศไปหาจมูก
  // ปลายเปลือกตาจบที่ขอบตาขาวพอดี (ไม่ยื่นเลยออกไป) · มุมนอกสูงกว่ามุมในนิดเดียว เกือบแนวนอนแบบในภาพ
  const edgeX = (dy) => Math.sqrt(Math.max(0, R * R - dy * dy));
  // โค้งสมมาตรขนานกับขอบบนของตา — เอียงไปพร้อมหัว ตา และประกาย (ไม่ลาดเฉียงตัดตาแบบตาขมวด)
  const y0 = W.y - 14, y1 = W.y - 14;
  const x0 = W.x - d * edgeX(y0 - W.y), x1 = W.x + d * edgeX(y1 - W.y);
  const lid = new Path2D();
  lid.moveTo(x0, y0);
  lid.quadraticCurveTo(W.x, W.y - 36, x1, y1);
  c.save();
  c.clip(white);
  // หมุนสวนมุมเอียงของตัว+หัว — บนจอเปลือกตาจึงเกือบแนวนอนเหมือนในภาพ ไม่เฉียงตามตัว
  rotAt(c, W, -ang);
  const cover = new Path2D();
  cover.addPath(lid);
  cover.lineTo(x1, W.y - R - 20);
  cover.lineTo(x0, W.y - R - 20);
  cover.closePath();
  c.fillStyle = pal.cat;
  c.fill(cover);
  c.restore();
  // ขอบตาไม่มีเส้นแล้ว — เกลี่ยขนทับขอบตาส่วนที่เปลือกตาปิด ไม่ให้เหลือขอบจาง ๆ จากการตัดภาพ
  c.save();
  rotAt(c, W, -ang);
  c.clip(cover);
  rotAt(c, W, ang);
  c.strokeStyle = pal.cat;
  c.lineWidth = 4;
  c.stroke(white);
  c.restore();
  c.save();
  rotAt(c, W, -ang);
  c.strokeStyle = pal.line;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = 7.5 * LINE_K;
  c.stroke(lid);
  // ตัวเมีย: ขนตางอนสามเส้นที่หางตา ต่อจากปลายเปลือกตา (ผู้ใช้ขอ — ตาปรือแล้วไม่มีขนตา)
  if (lashes) {
    const o = -d;   // ทิศออกนอกหน้า
    c.fillStyle = pal.line;
    // มุมของขนตาแต่ละเส้น (เรเดียน จากแนวนอนออกนอกหน้า ขึ้นบน) · ยาว · หนาที่โคน — โคนเรียงไปตามปลายเปลือกตา
    for (const [ang2, len, w, back] of [[0.15, 26, 6.5, 0], [0.62, 24, 6, 7], [1.05, 19, 5.2, 14]]) {
      const bx = x0 + o * (2 - back), by = y0 + 1 - back * 0.35;
      const tx = bx + o * len * Math.cos(ang2), ty = by - len * Math.sin(ang2);
      // ปลายงอนขึ้น (จุดคุมเยื้องลงใต้เส้นตรง)
      const mx = (bx + tx) / 2 + o * 2, my = (by + ty) / 2 + 4;
      c.beginPath();
      c.moveTo(bx - o * w * 0.3, by - w * 0.5);
      c.quadraticCurveTo(mx - 1.5, my - w * 0.5, tx, ty);
      c.quadraticCurveTo(mx + 1.5, my + w * 0.5, bx + o * w * 0.3, by + w * 0.5);
      c.closePath();
      c.fill();
    }
  }
  c.restore();
}

// ══ ตาแบ๊ว (ตามภาพอ้างอิงแมวดำตาโต) ══
// ตาทั้งดวงเป็นวงสีเข้มเกือบดำ มีขอบเสี้ยวจันทร์เหลืองอมส้มที่ขอบล่าง · ไม่มีตาขาว ไม่มีเส้นขอบตา
// วงเข้มข้างในเลื่อนตามสายตา (กลอกตา) — เสี้ยวทองจึงหนา/บางตามทิศที่มอง เหมือนลูกตากลมจริง
// ประกายขาวมุมบนเป็นตัวที่ทำให้ตา "แบ๊ว" — วงใหญ่หนึ่ง จุดเล็กสอง
/** ความหนาเส้นขอบตานอก (เส้นตัว = LW 4.4) */
const EYE_RIM_W = 2.2;
const BABY = {
  rimTop: '#FFEFA6', rimBot: '#FFC24D',        // เสี้ยวขอบนอก: เหลืองอ่อน → เหลืองอมส้ม (สว่างกว่าขนส้ม ไม่กลืน)
  coreIn: '#3B2418', coreOut: '#120805',        // วงในเข้ม: น้ำตาลเข้มกลาง → ดำขอบ
};
function drawBabyEye(c, white, side, { lx = 0, ly = 0, sparkle = 0, t = 0, lidded = false, col = BABY, starDots = false, starOne = false } = {}) {
  const W = EYE_WHITE[side], R = EYE_WHITE.r, d = side === 'left' ? 1 : -1;
  c.save();
  c.clip(white);
  const rim = c.createLinearGradient(0, W.y - R, 0, W.y + R);
  rim.addColorStop(0, col.rimTop);
  rim.addColorStop(1, col.rimBot);
  c.fillStyle = rim;
  c.fillRect(W.x - R - 6, W.y - R - 6, (R + 6) * 2, (R + 6) * 2);
  // วงเข้มเยื้องขึ้นบน (และเข้าหาจมูกนิด) = เหลือเสี้ยวทองที่ขอบล่างด้านนอก
  const ix = W.x + d * 3 + lx, iy = W.y - 11 + ly, ir = R - 5;
  const core = c.createRadialGradient(ix - 6, iy - 8, 2, ix, iy, ir);
  core.addColorStop(0, col.coreIn);
  core.addColorStop(1, col.coreOut);
  c.fillStyle = core;
  c.beginPath();
  c.arc(ix, iy, ir, 0, TAU);
  c.fill();
  // ประกาย: วงกลมล้วนทั้งหมด จัดตามสัดส่วนของวงเข้ม (ir) — แสงมาจากมุมบนซ้ายทั้งสองตา
  //   ใหญ่ = มุมบนซ้าย · เล็ก = เกาะข้างวงใหญ่ (บนขวา) · กลาง = มุมล่างขวาตรงข้ามแนวทแยงกับวงใหญ่
  const dot = eyeDots(c, ix, iy, ir, starDots, t, starOne);   // ใส่ชุดที่มี starEyes: จุดเล็กเป็นดาว (ตัวผู้ดวงเดียว)
  if (lidded) {
    // ตาปรือ (ท่าลอยเฟี้ยว): ครึ่งบนโดนเปลือกตาบัง — ย้ายประกายลงมาครึ่งล่างที่ยังเห็น ทิศแสงเดิม
    dot(-0.3, 0.16, 0.2, true);
    // ดาว (ชุด starEyes) โตกว่าจุดเดิม — ขยับห่างวงใหญ่ (ผู้ใช้ทัก 15 ต.ค. "อยู่ใกล้วงขาวใหญ่ไป")
    if (starDots) { dot(0.32, 0.1, 0.08); dot(0.04, 0.52, 0.1); }
    else { dot(0.02, 0.06, 0.08); dot(0.34, 0.46, 0.1); }
  } else {
    dot(-0.32, -0.32, 0.26, true);
    if (starDots) { dot(0.38, -0.26, 0.1); starOne ? dot(0.36, 0.36, 0.12) : dot(0.04, 0.48, 0.12); }   // ตัวผู้: จุดขาวที่เดิม
    else { dot(0.06, -0.5, 0.1); dot(0.36, 0.36, 0.12); }
  }
  if (sparkle > 0 && !starDots) {
    const k = sparkle * (0.75 + 0.25 * Math.sin(t * 0.25));
    star4(c, ix + 16, iy - 14, 12 * k);
    star4(c, ix - 8, iy + 18, 6 * k);
  }
  c.restore();
}
/**
 * ขนตา/อายไลเนอร์ (ตามชีทแมวส้ม Dimension): แถบสีเข้มโอบขอบตาด้านนอก บางที่หัวตา หนาสุดที่หางตา
 * แล้วสะบัดปลายขึ้นเป็นแพขนตาที่มุมบนนอก — ไม่มีเส้นขอบ (เป็นก้อนสีเข้มแบบในชีท)
 * วาดหลังลูกตา ภายใต้ transform เดียวกับตา (หรี่ตอนกะพริบไปด้วยกัน)
 */
function drawLashes(c, side, female = false, sq = 1, cy = null) {
  const W = EYE_WHITE[side], R = EYE_WHITE.r, o = side === 'left' ? -1 : 1;   // o = ทิศออกนอกหน้า
  // sq = ตาหรี่ (ความสูงตาที่เหลือ 1 → ~0.3) บีบรอบ cy · ฐานขนตาเกาะขอบตาที่หรี่แล้ว แต่ความหนาแถบ/ขนตางอนยื่นตามแนวตั้งฉากขอบตาจริง
  // (เดิมวาดใต้การบีบทั้งก้อน = ขนตาแบนจนแถบฐานบางขาด เหลือแต่ปลายขนตาลอยเป็นเส้น ๆ — ผู้ใช้ทัก 14 ต.ค.)
  const yc = cy ?? W.y;
  const base = (a, r) => [W.x + o * Math.cos(a) * r, yc + (W.y + Math.sin(a) * r - yc) * sq];
  // ทิศที่แถบ/ขนตายื่นออก: ผสมแนวตั้งฉากขอบตาที่หรี่ (แถบไม่บาง) กับทิศเดิมตอนลืมตา (ขนตางอนออกข้างเหมือนเดิม ไม่ตั้งชันเป็นหนาม)
  const nrm = (a) => {
    const sx = o * Math.cos(a) * sq, sy = Math.sin(a), sl = Math.hypot(sx, sy) || 1;
    const nx = 0.35 * sx / sl + 0.65 * o * Math.cos(a), ny = 0.35 * sy / sl + 0.65 * Math.sin(a), l = Math.hypot(nx, ny) || 1;
    return [nx / l, ny / l];
  };
  const pt = (a, r) => {
    if (sq === 1) return [W.x + o * Math.cos(a) * r, W.y + Math.sin(a) * r];
    const b = base(a, R - 1), n = nrm(a), d = r - (R - 1);
    return [b[0] + n[0] * d, b[1] + n[1] * d];
  };
  // มุมวัดจากแนวนอนออกนอกหน้า (0 = หางตา) · ลบ = ขึ้นบน บวก = ลงล่าง
  const a0 = -1.2, a1 = 1.4;
  // ความหนา: เรียวเป็นศูนย์ทั้งสองปลาย (ไม่มีปลายตัดเหลี่ยม) หนาสุดแถวหางตา
  // + ปลายขนตาสองเส้นเป็นยอดโค้งนุ่ม ๆ ที่มุมบนนอก (เกาส์) — เส้นขอบโค้งต่อเนื่อง ไม่ใช่หนามแปะ
  const thick = (a) => {
    const u = (a - a0) / (a1 - a0);
    const base = 8 * Math.pow(Math.sin(Math.PI * u), 1.1) * (0.35 + 0.65 * Math.max(0, Math.cos(a * 0.8)));
    const lash = (c0, h, w) => h * Math.exp(-(((a - c0) / w) ** 2));
    return base + (female ? lash(-0.42, 13, 0.085) + lash(-0.72, 15, 0.085) + lash(-1.0, 9, 0.075) : 0);
  };
  const N = 64;
  const outer = [];
  for (let i = 0; i <= N; i++) {
    const a = a0 + (a1 - a0) * (i / N);
    outer.push(pt(a, R - 1 + thick(a)));
  }
  const p = new Path2D();
  p.moveTo(...pt(a0, R - 1));
  for (let i = 1; i <= N; i++) p.lineTo(...pt(a0 + (a1 - a0) * (i / N), R - 1));
  // ขอบนอกย้อนกลับแบบโค้งเรียบ (จุดกึ่งกลางเป็นปลายโค้ง)
  for (let i = N - 1; i > 0; i--) {
    const q = outer[i], q2 = outer[i - 1];
    p.quadraticCurveTo(q[0], q[1], (q[0] + q2[0]) / 2, (q[1] + q2[1]) / 2);
  }
  p.lineTo(...outer[0]);
  p.closePath();
  const g = c.createLinearGradient(W.x, W.y - R, W.x, W.y + R);
  g.addColorStop(0, '#3A2418');
  g.addColorStop(1, '#140905');
  c.fillStyle = g;
  c.fill(p);
}
function star4(c, x, y, r) {
  c.fillStyle = '#FFFFFF';
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.fill();
}

// ══ หน้าตามอารมณ์ (สไตล์ kawaii ตามชีทอ้างอิง) — วาดทับ/แทนตาตามอารมณ์ของน้อง ══
/** ตาเศร้า: เปลือกตาบนเอียงลงทางหางตา (ตาละห้อย) + น้ำตาหยดที่มุมนอก */
function sadLid(c, white, pal, side) {
  const W = EYE_WHITE[side], d = side === 'left' ? 1 : -1;
  const lid = new Path2D();
  lid.moveTo(W.x - d * 52, W.y - 6);
  lid.quadraticCurveTo(W.x - d * 6, W.y - 44, W.x + d * 46, W.y - 40);
  c.save();
  c.clip(white);
  const cover = new Path2D();
  cover.addPath(lid);
  cover.lineTo(W.x + d * 60, W.y - 80);
  cover.lineTo(W.x - d * 60, W.y - 80);
  cover.closePath();
  c.fillStyle = pal.cat;
  c.fill(cover);
  c.restore();
  c.strokeStyle = pal.line;
  c.lineCap = 'round';
  c.lineWidth = 6.5 * LINE_K;
  c.stroke(lid);
}
function tearDrop(c, pal, side, t) {
  const W = EYE_WHITE[side], d = side === 'left' ? 1 : -1;
  const fall = (t * 0.02) % 1;
  const x = W.x - d * 30, y = W.y + 44 + fall * 18;
  c.save();
  c.globalAlpha = 1 - fall * 0.6;
  c.fillStyle = '#A9DCF5';
  c.strokeStyle = '#6FB6DE';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x, y - 16);
  c.bezierCurveTo(x + 11, y - 2, x + 9, y + 9, x, y + 9);
  c.bezierCurveTo(x - 9, y + 9, x - 11, y - 2, x, y - 16);
  c.fill();
  c.stroke();
  c.restore();
}
/** ตาวนมึน (@_@) */
function dizzyEye(c, e, pal, t) {
  c.strokeStyle = pal.line;
  c.lineWidth = 5 * LINE_K;
  c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * TAU * 2.3 + t * 0.15;
    const r = 4 + (i / 60) * 30;
    const x = e.x + Math.cos(a) * r, y = e.y + 4 + Math.sin(a) * r;
    if (i) c.lineTo(x, y); else c.moveTo(x, y);
  }
  c.stroke();
}

// ══ จังหวะชีวิต (คิดจากเวลาอย่างเดียว ไม่เก็บสถานะ — เรียกซ้ำกี่รอบก็ได้ภาพเดิม) ══
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (u) => u * u * (3 - 2 * u);
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
/** จุดที่น้องมองไปเป็นช่วง ๆ (มองคนดูบ่อยสุด) */
const LOOKS = [[0, 0], [0, 0], [0, 0.05], [-1, 0.1], [1, 0.1], [-0.7, -0.5], [0.7, -0.45], [0.35, 0.45], [-0.35, 0.45]];
const LOOK_P = 2.6;
const lookOf = (n) => LOOKS[Math.floor(hash(n) * LOOKS.length)];
/** สายตา ณ เวลา T — เลื่อนไปจุดใหม่แบบนุ่ม ๆ ใช้เวลา 0.28 วินาที */
function gazeAt(T) {
  const n = Math.floor(T / LOOK_P);
  const a = lookOf(n - 1), b = lookOf(n);
  const u = ease(clamp01((T - n * LOOK_P) / 0.28));
  return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, since: T - n * LOOK_P, moved: a !== b };
}
/** กะพริบ: ทุก ~3.9 วินาที + ตอนเปลี่ยนจุดมอง (คนจริงกะพริบตอนกลอกตาไปที่ใหม่) + บางทีกะพริบสองที */
function blinkAt(T, g) {
  const one = (x) => (x >= 0 && x < 0.15 ? Math.sin((x / 0.15) * Math.PI) : 0);
  const n = Math.floor(T / 3.9);
  const x = T - n * 3.9;
  let b = Math.max(one(x), hash(n + 50) > 0.7 ? one(x - 0.24) : 0);
  if (g.moved) b = Math.max(b, one(g.since - 0.02));
  return b;
}

// ══ ท่าหมอบก้อนขนมปัง — ทรงตัวคนละแบบกับท่ายืน จึงวาดใหม่ทั้งตัว (หัว/หน้าใช้จากแบบเดิม) ══
// หัวโตวางพักบนตัวที่แผ่เป็นก้อนกว้าง · อุ้งเท้าหน้าสองก้อนโผล่ใต้คาง · อกสีครีมไหลต่อจากหน้า
// หางวนอ้อมข้างซ้ายมาไว้ข้างหน้า ปลายหางสีครีม (ตามภาพที่ออกแบบไว้)
const LOAF_HEAD = 182;   // หัวลดลงเท่านี้ (หน่วยในไฟล์) ตอนหมอบเต็มที่ — คางแตะอุ้งเท้า
const LOAF = (() => {
  // ฐานตัวใต้หัว: ส่วนใหญ่ซ่อนใต้หัว เห็นแค่ข้างขวาที่ป่องออกกับขอบล่างที่แตะพื้น (ซ้ายมีหางบัง)
  const base = new Path2D();
  base.moveTo(130, 648);
  base.lineTo(444, 648);
  base.bezierCurveTo(462, 640, 468, 610, 464, 584);
  base.bezierCurveTo(460, 558, 448, 540, 430, 526);
  base.lineTo(170, 526);
  // ข้างซ้ายกว้างไปอยู่หลังหาง — ในวงหางจึงเห็นตัว ไม่ทะลุเห็นฉาก
  base.bezierCurveTo(120, 532, 100, 572, 104, 610);
  base.bezierCurveTo(106, 634, 116, 648, 130, 648);
  base.closePath();
  // อกครีม: ไหลต่อจากหน้าลงมาระหว่างขาหน้าสองข้าง — ส่วนบนยื่นเข้าไปใต้หัว แล้วตัดตามขอบหัวตอนวาด
  // (ทับเฉพาะเส้นคางตรงกลาง ไม่ทับเนื้อหัว) จึงต่อกับเส้นคางพอดีทุกเฟรมแม้หัวจะขยับ
  const chest = new Path2D();
  chest.moveTo(262, 536);
  chest.bezierCurveTo(266, 594, 296, 596, 293, 648);
  chest.lineTo(307, 648);
  chest.bezierCurveTo(304, 596, 334, 594, 338, 536);
  chest.closePath();
  chest.closePath();
  // เส้นแบ่งขาหน้า: ขอบในของขาซ้าย/ขวา (ติดอกครีม) + ขอบนอกขาซ้าย (ติดหาง) — ขาขวากลืนกับข้างตัว
  // เส้นขาหน้าสองข้างอก: โค้งเดียวตั้งแต่ใต้หัวลงถึงพื้น (ตอนวาดตัดตามขอบหัว จึงต่อกับเส้นคางพอดีทุกเฟรม)
  // ไม่มีท่อนตรง — ตอนโยกตัว หัวเอียงไปมา ส่วนที่โผล่พ้นคางจึงยังเป็นโค้งสวยเสมอ
  const legs = new Path2D();
  legs.moveTo(262, 536);
  legs.bezierCurveTo(266, 594, 296, 596, 293, 648);
  legs.moveTo(338, 536);
  legs.bezierCurveTo(334, 594, 304, 596, 307, 648);
  return { base, chest, legs };
})();
function loafBaseDetails(c, pal, noStripes) {
  // เงาข้างขวาให้ก้อนดูกลม
  c.fillStyle = flatShade(pal);
  c.beginPath();
  c.ellipse(474, 604, 40, 76, 0, 0, TAU);
  c.fill();
  if (noStripes) return;
  c.strokeStyle = pal.stripe;
  c.lineWidth = 6;
  c.lineCap = 'round';
  // ลายบนขาหน้าขวาที่ต่อกับข้างตัว · ข้างตัวขวา · ขาหน้าซ้าย
  for (const [x0, y0, x1, y1] of [
    [394, 590, 374, 597], [410, 608, 388, 615], [424, 628, 402, 633],
    [458, 556, 442, 563], [463, 582, 447, 589],
    [234, 598, 250, 594], [222, 620, 240, 616],
  ]) {
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 4, x1, y1);
    c.stroke();
  }
}
/** หางตอนหมอบ: หางใหญ่วนเป็นวงอ้อมข้างซ้ายลงมาข้างหน้า ปลายครีมก้อนโตข้างขาหน้าซ้าย */
function loafTailDetails(c, G, pal, noStripes) {
  const { pts, half, N } = G;
  if (!noStripes) {
    c.strokeStyle = pal.stripe;
    c.lineWidth = 4;
    c.lineCap = 'round';
    for (const i of [3, 6, 9, 12]) {
      const q = pts[i], h = half(i) + 2, nx = -Math.sin(q.a), ny = Math.cos(q.a);
      const bx = Math.cos(q.a) * 5, by = Math.sin(q.a) * 5;
      c.beginPath();
      c.moveTo(q.x + nx * h, q.y + ny * h);
      c.quadraticCurveTo(q.x + bx, q.y + by, q.x - nx * h * 0.35, q.y - ny * h * 0.35);
      c.stroke();
    }
  }
  const tip = pts[N];
  c.fillStyle = pal.cream;
  c.beginPath();
  c.arc(tip.x - Math.cos(tip.a) * 3, tip.y - Math.sin(tip.a) * 3, half(N) + 6, 0, TAU);
  c.fill();
}
/** เส้นหนาตามแนวกระดูก (หาง) จากจุดควบคุม — คืนรูปเดียวกับ tailGeom ใช้ tailDetails ร่วมกันได้ */
function spineBand(ctrl, N, half) {
  // Catmull-Rom ผ่านจุดควบคุม → จุดถี่ N+1 จุด
  const at = (u) => {
    const n = ctrl.length - 1, f = Math.min(n - 1e-6, u * n), i = Math.floor(f), tt = f - i;
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n, i + 2)];
    const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * tt + (2 * a - 5 * b + 4 * c - d) * tt * tt + (-a + 3 * b - 3 * c + d) * tt * tt * tt);
    return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
  };
  const raw = [];
  for (let i = 0; i <= N; i++) raw.push(at(i / N));
  const pts = raw.map(([x, y], i) => {
    const a0 = raw[Math.max(0, i - 1)], a1 = raw[Math.min(N, i + 1)];
    return { x, y, a: Math.atan2(a1[1] - a0[1], a1[0] - a0[0]) };
  });
  const L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const q = pts[i], h = half(i), nx = -Math.sin(q.a), ny = Math.cos(q.a);
    L.push([q.x + nx * h, q.y + ny * h]);
    R.push([q.x - nx * h, q.y - ny * h]);
  }
  const tip = pts[N];
  const path = new Path2D();
  const smooth = (arr, first) => {
    if (first) path.moveTo(...arr[0]); else path.lineTo(...arr[0]);
    for (let i = 1; i < arr.length - 1; i++) {
      path.quadraticCurveTo(arr[i][0], arr[i][1], (arr[i][0] + arr[i + 1][0]) / 2, (arr[i][1] + arr[i + 1][1]) / 2);
    }
    path.lineTo(...arr[arr.length - 1]);
  };
  smooth(L, true);
  path.arc(tip.x, tip.y, half(N), tip.a + Math.PI / 2, tip.a - Math.PI / 2, true);
  smooth(R.slice().reverse(), false);
  path.closePath();
  return { path, pts, half, N };
}
/** หางตอนหมอบ: โคนซ่อนใต้หัว วนอ้อมข้างซ้ายลงมาข้างหน้า ปลายสะบัดเบา ๆ */
function loafTail(T, flick) {
  const L = tailLife(T);
  const f = L.lag * 3 + L.flick * 9 + L.swish * 5 + flick * 8;   // หมอบ: ปลายหางฟาดพื้นเบา ๆ เป็นพัก ๆ
  return spineBand([[178, 520], [118, 534], [86, 584], [94, 628], [132, 644], [178 + f * 0.3, 632 - f]], 16, (i) => TAIL_HALF(i));
}

// ══ ท่านั่ง — วาดใหม่ทั้งตัวตามภาพอ้างอิง (หัว/หน้าใช้จากแบบเดิม) ══
// ตัวทรงลูกแพร์ พุงครีมใหญ่ · ต้นขาหลังสองก้อนกลมอยู่หน้าตัว · เท้าหลังครีมมีเส้นนิ้ว
// แขนหน้าเป็นท่อนโค้งเดียวตั้งแต่ใต้หัวถึงอุ้งเท้า (โคนซ่อนใต้หัว ไหล่จึงไม่มีเส้นปิดโคนแขน)
// แขนวาดทับตัวด้วยเส้นของตัวเอง = แขนอยู่หน้าตัว · ขอบนอกแขนทับขอบตัวพอดี เลยเป็นเส้นรอบนอกเส้นเดียว
const SIT_HEAD = 48;   // หัวลดลงเท่านี้ตอนนั่ง (คอหดลงหาตัว)
/** เส้นด้านใน (ขอบแขน ขอบต้นขา อุ้งเท้า) หนาเท่าเส้นรอบนอกทุกเส้น */
const LW_IN = LW;
// วาดแบบเดียวกับภาพอ้างอิง: ตัว + แขนท่อนบน + แขนขวา + ต้นขา + หาง = เงาก้อนเดียว เส้นรอบนอกเส้นเดียว
// ข้างในมีแค่เส้นที่แบบมี: ขอบในแขนท่อนบนซ้าย · ขอบในแขนขวา · ขอบบนต้นขา · แขนท่อนล่างซ้ายที่พับมาหน้าพุง
const SIT = (() => {
  const torso = new Path2D();
  torso.moveTo(300, 428);
  torso.bezierCurveTo(236, 428, 194, 458, 184, 504);
  torso.bezierCurveTo(176, 552, 190, 612, 232, 648);
  torso.lineTo(368, 648);
  torso.bezierCurveTo(410, 612, 424, 552, 416, 504);
  torso.bezierCurveTo(406, 458, 364, 428, 300, 428);
  torso.closePath();
  const ell = (x, y, rx, ry) => {
    const q = new Path2D();
    q.ellipse(x, y, rx, ry, 0, 0, TAU);
    return q;
  };
  return {
    torso,
    haunchL: ell(204, 598, 55, 50), haunchR: ell(396, 598, 55, 50),
    footL: ell(216, 628, 37, 20), footR: ell(386, 628, 37, 20),
  };
})();
// ══ ท่านั่งว่าง (ตามภาพอ้างอิงแมวนั่งตัวระฆัง) ══
// ตัวเป็นระฆังอวบก้อนเดียว: แคบใต้หัว ผายออกด้านล่างเป็นสะโพกกลม ๆ สองข้าง ก้นแบนติดพื้น
// ขาหน้าไม่ได้วาดเป็นท่อน — เป็น "เส้นในตัว" ตามแบบ: เส้นนอกขาสองเส้น (แยกขาหน้ากับสะโพก)
// + ร่องรูป Λ ตรงกลาง (ช่องระหว่างขาหน้าสองข้าง) · อุ้งเท้าครีมมีขีดนิ้วที่ปลายขา
// ใช้เฉพาะตอนนั่งเฉย ๆ — ท่าเกาพุง/เลียอุ้งเท้ายังใช้ตัวนั่งแบบมีแขนพับ (ด้านล่าง) เพราะต้องขยับแขน
const SIT2 = (() => {
  // ตัวอวบป้อม: ไหล่มนกว้าง ข้างตัวป่องออกเป็นก้อนกลม ไม่ใช่เส้นเฉียงตรง
  const body = new Path2D();
  body.moveTo(300, 428);
  body.bezierCurveTo(240, 428, 204, 448, 196, 488);
  body.bezierCurveTo(188, 528, 160, 548, 146, 586);
  body.bezierCurveTo(132, 626, 154, 650, 204, 650);
  body.lineTo(396, 650);
  body.bezierCurveTo(446, 650, 468, 626, 454, 586);
  body.bezierCurveTo(440, 548, 412, 528, 404, 488);
  body.bezierCurveTo(396, 448, 360, 428, 300, 428);
  body.closePath();
  // เส้นในตัว — โค้งนุ่ม ๆ สั้นกว่าเดิม (ไม่ตรงแข็ง): นอกขาซ้าย / นอกขาขวา / ร่องกลางปลายมน
  const legs = new Path2D();
  // เส้นนอกขาเริ่มจากขอบตัวพอดี (ต่อเนื่องจากเส้นรอบนอก ไม่ลอยกลางตัว) แล้วโค้งเข้าลงหาอุ้งเท้า ตามแบบ
  legs.moveTo(189, 512);
  legs.bezierCurveTo(224, 536, 228, 600, 240, 646);
  legs.moveTo(411, 512);
  legs.bezierCurveTo(376, 536, 372, 600, 360, 646);
  legs.moveTo(280, 647);
  legs.bezierCurveTo(286, 620, 290, 596, 300, 590);
  legs.bezierCurveTo(310, 596, 314, 620, 320, 647);
  const gap = new Path2D();
  gap.moveTo(280, 650);
  gap.bezierCurveTo(286, 620, 290, 596, 300, 590);
  gap.bezierCurveTo(310, 596, 314, 620, 320, 650);
  gap.closePath();
  // ขาหน้าสองท่อน: ข้างนอกตรงลงมา ข้างในชิดกันตรงบนแล้วแยกนิดตอนล่าง · ปลายมนเป็นอุ้งเท้า
  const legL = new Path2D();
  legL.moveTo(232, 520);
  legL.bezierCurveTo(228, 580, 232, 622, 234, 636);
  legL.bezierCurveTo(236, 659, 294, 659, 296, 636);
  legL.bezierCurveTo(298, 596, 301, 560, 302, 520);
  legL.closePath();
  const legR = new Path2D();
  legR.moveTo(368, 520);
  legR.bezierCurveTo(372, 580, 368, 622, 366, 636);
  legR.bezierCurveTo(364, 659, 306, 659, 304, 636);
  legR.bezierCurveTo(302, 596, 299, 560, 298, 520);
  legR.closePath();
  const legAll = new Path2D();
  legAll.addPath(legL);
  legAll.addPath(legR);
  // ขาหน้าแบบยาว (ใส่กระโปรง): ทรงเดิมทุกอย่าง แต่โคนต่อขึ้นไปถึง y 466 — ขอบบนไปอยู่ในช่วงที่ไล่จางหมด จึงไม่เห็นเส้นตัด
  const tallL = new Path2D();
  tallL.moveTo(233, 466);
  tallL.lineTo(232, 520);
  tallL.bezierCurveTo(228, 580, 232, 622, 234, 636);
  tallL.bezierCurveTo(236, 659, 294, 659, 296, 636);
  tallL.bezierCurveTo(298, 596, 301, 560, 302, 520);
  tallL.lineTo(302, 466);
  tallL.closePath();
  const tallR = new Path2D();
  tallR.moveTo(367, 466);
  tallR.lineTo(368, 520);
  tallR.bezierCurveTo(372, 580, 368, 622, 366, 636);
  tallR.bezierCurveTo(364, 659, 306, 659, 304, 636);
  tallR.bezierCurveTo(302, 596, 299, 560, 298, 520);
  tallR.lineTo(298, 466);
  tallR.closePath();
  const tallAll = new Path2D();
  tallAll.addPath(tallL);
  tallAll.addPath(tallR);
  return { body, legs, gap, legL, legR, legAll, tallL, tallR, tallAll };
})();

// แขน (จุดควบคุมพิกัดไฟล์ออกแบบ): ซ้ายจอ = ท่อนบน (ไหล่→ศอก) + ท่อนล่าง (ศอก→อุ้งเท้า) · ขวาจอ = ท่อนเดียว
const SIT_ARM = {
  leftRest: { up: [[248, 424], [220, 470], [212, 512]], lo: [[212, 512], [218, 542], [230, 564]] },
  leftScratch: { up: [[248, 424], [214, 470], [208, 516]], lo: [[208, 516], [240, 538], [270, 536]] },
  leftGroom: { up: [[250, 424], [216, 466], [210, 500]], lo: [[212, 506], [246, 484], [276, 452]] },
  right: [[354, 424], [394, 468], [404, 518], [394, 556], [374, 572]],
};
function mixPts(base, list) {
  return base.map((p, i) => {
    let x = p[0], y = p[1];
    for (const [pts, w] of list) {
      if (w <= 0) continue;
      x += (pts[i][0] - x) * w;
      y += (pts[i][1] - y) * w;
    }
    return [x, y];
  });
}
/** เส้นขอบด้านหนึ่งของแถบ (side = +1/-1) เป็นโค้งเรียบ */
function bandEdge(band, side, from = 0, to = band.N) {
  const q = new Path2D();
  const pt = (i) => {
    const r = band.pts[i], h = band.half(i) * side;
    return [r.x - Math.sin(r.a) * h, r.y + Math.cos(r.a) * h];
  };
  q.moveTo(...pt(from));
  for (let i = from + 1; i < to; i++) {
    const a = pt(i), b = pt(i + 1);
    q.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  q.lineTo(...pt(to));
  return q;
}
/** ด้านของแถบที่หันเข้ากลางตัว (x ใกล้ 300) */
function innerSide(band) {
  const r = band.pts[Math.floor(band.N / 2)];
  return Math.abs(r.x - Math.sin(r.a) * 10 - 300) < Math.abs(r.x + Math.sin(r.a) * 10 - 300) ? 1 : -1;
}
/**
 * อุ้งเท้า = ปลายแขนป่องออกนิด ๆ เป็นชิ้นเดียวกับแขน (ไม่ใช่วงรีแปะทับ)
 * คืน { blob, cream, det } — blob รวมเข้าเงาแขน · cream = ครีมเฉพาะส่วนปลาย · det วาดครีม + ร่องนิ้ว (อยู่ในเส้นรอบนอก)
 */
function pawOf(band, pal, rx, ry) {
  const tip = band.pts[band.N];
  const ca = Math.cos(tip.a), sa = Math.sin(tip.a);
  const cx = tip.x + ca * 2, cy = tip.y + sa * 2;
  const blob = new Path2D();
  blob.ellipse(cx, cy, rx, ry, tip.a, 0, TAU, true);   // ทวนเข็มเท่าแถบแขน — ส่วนซ้อนไม่หักล้างกัน
  // ครีม: ครึ่งปลายของอุ้งเท้า ตัดด้วยเส้นโค้งขวางแขน
  const cream = new Path2D();
  cream.ellipse(cx + ca * rx * 0.55, cy + sa * rx * 0.55, rx * 1.05, ry * 1.25, tip.a, 0, TAU);
  const det = (c, all) => {
    c.save();
    c.clip(all);
    c.fillStyle = pal.paw || pal.cream;   // อุ้งเท้า (วิเชียรมาศ: น้ำตาลเข้ม)
    c.fill(cream);
    // ร่องนิ้วสองร่องที่ปลาย (สั้น ๆ อยู่ในเนื้อ ไม่ทะลุเส้นรอบนอก)
    c.strokeStyle = pal.line;
    c.lineWidth = LW * 0.8;
    c.lineCap = 'round';
    for (const off of [-0.32, 0.32]) {
      const ex = cx + ca * rx - sa * ry * off, ey = cy + sa * rx + ca * ry * off;
      c.beginPath();
      c.moveTo(ex, ey);
      c.lineTo(ex - ca * 9, ey - sa * 9);
      c.stroke();
    }
    c.restore();
  };
  return { blob, det };
}
function sitStripes(c, pal, list) {
  c.strokeStyle = pal.stripe;
  c.lineWidth = 5;
  c.lineCap = 'round';
  for (const [x0, y0, x1, y1] of list) {
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 4, x1, y1);
    c.stroke();
  }
}

// ══ ท่าถือหัวใจ/กอด (ยืน) — แขนวาดใหม่ตามภาพอ้างอิง ══
// แขนท่อนบนแนบข้างตัว (กลืนกับตัว มีแค่ขอบในเส้นเดียว) · ศอกอยู่ข้างเอว · แขนท่อนล่างพับขึ้นมาประคองหัวใจใต้คาง
// ท่าพักใช้แถบที่เลียนแขนในแบบ (กางออกข้าง) แล้วผสมจุดไปหาท่าถือ — ยกแขนขึ้นลื่น ๆ ไม่กระโดด
const HOLD_ARM = {
  // ตามแบบ: เห็นแค่แขนท่อนล่างเป็นท่ออ้วน ๆ จากศอกข้างตัวชี้ขึ้นไปหาคาง อุ้งเท้าครีมแตะใต้คาง (แขนอยู่หน้าหัว)
  // เริ่มยก = ห้อยลงหน้าตัว · ถือ = ชูขึ้นประคองหัวใจ
  // แขนโค้งออกนอกนิด ๆ (ไม่ใช่ท่อตรง) เหมือนแขนอวบ ๆ ที่งอขึ้นมา
  loRest: [[218, 440], [217, 470], [224, 498], [238, 518]],
  loHold: [[222, 476], [226, 448], [240, 424], [258, 408]],
  // กอดลูกกลมใหญ่ (แคปซูลกาช่า · shape.grip): ศอกข้างตัว แขนกางออกข้าง อุ้งเท้าเกาะขอบซ้าย/ขวาของลูก (ไม่ทะลุกลางลูก)
  loGrip: [[222, 468], [198, 478], [176, 488], [160, 496]],
};
const mirrorPts = (pts) => pts.map(([x, y]) => [600 - x, y]);
// ลอยเฟี้ยว (แขนขวาจอ): ศอกยื่นออกข้างเอวแล้วพับขึ้น อุ้งเท้าครีมแตะใต้คางฝั่งแก้มขวา (ตามแบบ)
const CHIN_ARM = {
  rest: [[392, 452], [404, 486], [394, 516], [376, 532]],
  chin: [[400, 496], [402, 460], [384, 424], [354, 400]],
};
/** หัวใจเล็กลอยออกไปทางขวาตอนส่งหัวใจ (ตามแบบ) */
function drawFloatHearts(c, t, w, pal) {
  if (w < 0.05) return;
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.012 + i / 3) % 1;
    const x = 400 + ph * 110 + Math.sin(ph * 6 + i) * 8;
    const y = 470 - ph * 100 - i * 10;
    c.save();
    c.globalAlpha = Math.sin(ph * Math.PI) * w;
    drawHeart(c, x, y, 13 + i * 3 + ph * 4, pal);
    c.restore();
  }
}

// ══ มุมด้านข้าง (หันซ้าย) — วาดตามชีท Dimension ช่อง "side" ในลายเส้นเดียวกับตัวหน้า ══
// หัวโตทรงไข่ จมูกโหนกนิดด้านหน้า ตาโตหนึ่งดวง หูใกล้ตั้งชันกลางหัว หูไกลโผล่ข้างหลัง
// ตัวลูกแพร์ แขนใกล้ห้อยมาด้านหน้า ต้นขาหลังกลม หางโค้งขึ้นข้างหลัง
// หันขวา = กลับภาพซ้ายขวา (เรียกจาก drawCat2 ตอนหมุนตัวผ่านมุมข้าง)
const SIDE = (() => {
  const P = (d) => new Path2D(d);
  return {
    // หัวกลมโต (ไม่ใช่ไข่) จมูกโหนกเล็กน้อยด้านหน้า
    // หัวกลม (ตามชีท side) จมูกโหนกเล็ก ๆ ใต้ตาด้านหน้า แล้วปาก-คางเว้าเข้า
    head: P('M308 108 C392 108 458 174 458 258 C458 342 392 404 308 404 C252 404 206 384 184 352 '
      + 'C178 344 170 340 164 336 C156 332 152 322 158 314 C150 298 150 282 154 264 C164 186 226 108 308 108 Z'),
    // หูเล็กปลายมน ตั้งบนกระหม่อมเอนไปข้างหลังนิด (ฐานจมในหัว เส้นหัวไม่ตัดผ่าน)
    earNear: P('M244 152 C252 102 268 54 286 22 C294 14 302 16 306 26 C320 68 338 114 354 152 Z'),
    earNearIn: P('M266 140 C274 104 284 74 294 50 C306 80 320 112 332 142 Z'),
    // อกยื่นมาข้างหน้า ก้นกลมใหญ่ไปข้างหลัง
    body: P('M262 380 C222 396 204 440 206 492 C208 548 224 600 248 630 L380 632 '
      + 'C416 612 432 574 428 530 C424 470 396 410 350 386 Z'),
    thigh: P('M378 560 m-52 0 a52 54 0 1 0 104 0 a52 54 0 1 0 -104 0 Z'),
    footBack: P('M346 638 m-34 0 a34 14 0 1 0 68 0 a34 14 0 1 0 -68 0 Z'),
    legFront: P('M236 566 C230 594 230 618 236 634 L276 634 C280 614 280 590 276 566 Z'),
    footFront: P('M258 639 m-32 0 a32 14 0 1 0 64 0 a32 14 0 1 0 -64 0 Z'),
    eye: { x: 200, y: 262, rx: 42, ry: 64 },   // ตาโตกินครึ่งหน้า ขอบหน้าชิดเส้นหน้าแบบชีท
  };
})();
function sideEye(c, pal, E, { shut = 0, happy = false, lx = 0, ly = 0, female = false, col = BABY } = {}) {
  if (happy || shut > 0.75) {
    // ตาปิด: โค้งพระจันทร์เสี้ยวหนากลาง (ดีใจ ∩ / หลับ ∪)
    const up = happy;
    const w = E.rx + 4, yE = E.y + (up ? 10 : 4);
    const lens = new Path2D();
    lens.moveTo(E.x - w, yE);
    lens.quadraticCurveTo(E.x, up ? E.y - 30 : E.y + 8, E.x + w, yE);
    lens.quadraticCurveTo(E.x, up ? E.y - 6 : E.y + 30, E.x - w, yE);
    lens.closePath();
    c.fillStyle = pal.line;
    c.fill(lens);
    c.strokeStyle = pal.line;
    c.lineWidth = 3.5;
    c.lineJoin = 'round';
    c.stroke(lens);
    if (female) {
      // ขนตาสองเส้นที่หางตา (ฝั่งหลัง +x) แบบเดียวกับหน้าตรง
      c.fillStyle = pal.line;
      const bx = E.x + w - 2, by = yE + (up ? -2 : 1);
      for (const [x0, y0, cx, cy, tx, ty, wd] of [[bx, by, bx + 10, by - 2, bx + 15, by - 13, 3], [bx - 8, by - (up ? 6 : 2), bx - 2, by - (up ? 13 : 9), bx + 1, by - (up ? 20 : 16), 2.6]]) {
        const dx = cx - x0, dy = cy - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
        const q = new Path2D();
        q.moveTo(x0 + nx * wd, y0 + ny * wd);
        q.quadraticCurveTo(cx + nx * wd * 0.5, cy + ny * wd * 0.5, tx, ty);
        q.quadraticCurveTo(cx - nx * wd * 0.5, cy - ny * wd * 0.5, x0 - nx * wd, y0 - ny * wd);
        q.closePath();
        c.fill(q);
      }
    }
    return;
  }
  c.save();
  c.translate(E.x, E.y);
  c.scale(1, 1 - shut * 0.9);
  c.translate(-E.x, -E.y);
  const eye = new Path2D();
  eye.ellipse(E.x, E.y, E.rx, E.ry, -0.08, 0, TAU);
  // ขนตา: แถบเข้มเรียวโอบขอบด้านหลังตา (ฝั่งหาง) + ปลายขนตาสะบัดขึ้นมุมบนหลัง
  const lash = new Path2D();
  const N = 48, a0 = -1.25, a1 = 1.3;
  const at = (a, k) => [E.x + Math.cos(a) * E.rx * k, E.y + Math.sin(a) * E.ry * k];
  const th = (a) => {
    const u = (a - a0) / (a1 - a0);
    const bump = (c0, h, w) => h * Math.exp(-(((a - c0) / w) ** 2));
    return 0.16 * Math.pow(Math.sin(Math.PI * u), 1.1) + (female ? bump(-0.6, 0.3, 0.09) + bump(-0.92, 0.18, 0.08) : 0);
  };
  lash.moveTo(...at(a0, 0.98));
  for (let i = 1; i <= N; i++) lash.lineTo(...at(a0 + (a1 - a0) * (i / N), 0.98));
  for (let i = N; i >= 0; i--) { const a = a0 + (a1 - a0) * (i / N); lash.lineTo(...at(a, 0.98 + th(a))); }
  lash.closePath();
  c.fillStyle = '#21120A';
  c.fill(lash);
  c.save();
  c.clip(eye);
  const rim = c.createLinearGradient(0, E.y - E.ry, 0, E.y + E.ry);
  rim.addColorStop(0, col.rimTop);
  rim.addColorStop(1, col.rimBot);
  c.fillStyle = rim;
  c.fillRect(E.x - E.rx - 4, E.y - E.ry - 4, E.rx * 2 + 8, E.ry * 2 + 8);
  // วงเข้มเยื้องไปด้านหน้า-บน (มองไปข้างหน้า) — เหลือเสี้ยวทองขอบหลัง-ล่าง
  const ix = E.x - 4 + lx, iy = E.y - 9 + ly;
  const core = c.createRadialGradient(ix - 5, iy - 8, 2, ix, iy, E.ry - 6);
  core.addColorStop(0, col.coreIn);
  core.addColorStop(1, col.coreOut);
  c.fillStyle = core;
  c.beginPath();
  c.ellipse(ix, iy, E.rx - 4, E.ry - 6, -0.08, 0, TAU);
  c.fill();
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.ellipse(ix - 9, iy - 15, 8, 11, 0, 0, TAU); c.fill();
  c.beginPath(); c.arc(ix + 6, iy - 24, 3.6, 0, TAU); c.fill();
  c.beginPath(); c.arc(ix + 9, iy + 16, 4.5, 0, TAU); c.fill();
  c.restore();
  c.strokeStyle = pal.line;
  c.lineWidth = EYE_RIM_W;
  c.stroke(eye);
  c.restore();
}
/**
 * วาดน้องมุมข้าง (หันซ้าย) ในพิกัดไฟล์ออกแบบ — ctx ถูกย้าย/สเกลมาแล้วจาก drawCat2
 * a = { T, t, breath, blink, twitch, wag, happy, shut, mouth, lx, ly }
 */
function drawSideView(ctx, pal, opt, a) {
  const S = SIDE;
  const br = a.breath;
  // ตัวยืดหดตามลมหายใจ (ยึดเท้า) · หัวขยับตามช้ากว่านิด
  const bodyXf = (c) => { c.translate(300, 640); c.scale(1, 1 + br * 0.012); c.translate(-300, -640); };
  const headXf = (c) => { c.translate(0, -a.breathLag * 2.2); rotAt(c, { x: 330, y: 380 }, a.tilt); };
  const earXf = (c) => { headXf(c); rotAt(c, { x: 302, y: 150 }, -a.twitch * 0.8 + a.ear * 0.25); };
  // หาง: โคนที่ก้น โค้งขึ้นข้างหลัง ปลายสะบัดตามจังหวะ
  const w = Math.sin(a.T * 2.2) * 10 * (0.6 + a.wag * 0.6);
  const TL = spineBand([[402, 596], [448, 600], [482, 572], [494 + w * 0.3, 530], [484 + w * 0.6, 494], [458 + w, 488]], 16,
    (i) => TAIL_HALF(i));
  const tail = { sil: [TL.path], all: TL.path, xf: bodyXf, det: (c) => tailDetails(c, TL, pal, opt), patch: opt.calico ? (c) => calicoTail(c, TL, opt.calico) : null };
  const it = (path, xf, det, soft) => ({ sil: [path], all: path, xf, det: det || (() => {}), soft });
  const stripes = (list) => (c) => { if (!opt.noStripes) sitStripes(c, pal, list); };
  // ── ชั้นตัว: หาง ขาหน้า ตัว ต้นขาหลัง เท้า (กลืนเป็นก้อนเดียว) ──
  drawLayer(ctx, [
    tail,
    it(S.footBack, bodyXf),
    it(S.legFront, bodyXf),
    it(S.footFront, bodyXf),
    it(S.body, bodyXf, (c) => {
      stripes([[336, 420, 320, 432], [360, 446, 342, 458], [376, 476, 356, 488]])(c);
    }),
    it(S.thigh, bodyXf, stripes([[412, 528, 392, 520], [426, 556, 404, 550]])),
  ], pal, {}, opt);
  // เส้นต้นขาหลัง (โค้งด้านหน้า-บน ตามชีท) · เท้าครีม
  ctx.save();
  bodyXf(ctx);
  ctx.strokeStyle = pal.line;
  ctx.lineWidth = LW;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(378, 560, 52, 54, 0, Math.PI * 0.92, Math.PI * 1.62);
  ctx.stroke();
  ctx.fillStyle = pal.cream;
  for (const f of [S.footBack, S.footFront]) {
    ctx.save(); ctx.clip(f); ctx.fillRect(150, 628, 300, 40); ctx.restore();
  }
  ctx.restore();
  // ── แขนใกล้: ห้อยมาด้านหน้า อุ้งเท้าครีมที่ปลาย (โคนซ่อนใต้หัว) ──
  const armSwing = Math.sin(a.T * 0.5 - 0.7) * 4;
  const arm = spineBand([[316, 392], [300, 440], [282 + armSwing * 0.4, 478], [252 + armSwing, 478]], 10, (i) => 24 - 3 * (i / 10));
  const paw = pawOf(arm, pal, 22, 20);
  const armAll = new Path2D();
  armAll.addPath(arm.path);
  armAll.addPath(paw.blob);
  drawLayer(ctx, [{ small: true, sil: [arm.path, paw.blob], all: armAll, xf: bodyXf, det: (c) => {
    stripes([[...[arm.pts[4].x + 16, arm.pts[4].y - 4], arm.pts[4].x + 2, arm.pts[4].y + 2]])(c);
    paw.det(c, armAll);
  } }], pal, {}, opt);
  // ── ชั้นหัว: หูไกล หูใกล้ หัว ──
  drawLayer(ctx, [
    it(S.earNear, earXf, (c) => {
      c.fillStyle = pal.ear;
      c.fill(S.earNearIn);
      c.strokeStyle = pal.line;
      c.lineWidth = LW * 0.75;
      c.lineJoin = 'round';
      c.stroke(S.earNearIn);
    }),
    it(S.head, headXf, (c) => {
      // ชีทไม่มีแถบครีมที่ปาก — แค่สว่างนิด ๆ ตรงแก้มหน้า (กลืนกับผิวพีช)
      c.fillStyle = pal.cream;   // ปาก-คางครีมสีเดียวกับพุง (เข้าชุดกับหน้าตรง)
      c.beginPath(); c.ellipse(212, 362, 70, 44, -0.2, 0, TAU); c.fill();
      stripes([[300, 132, 302, 156], [322, 136, 318, 160], [278, 138, 284, 160]])(c);
    }, SOFT_HEAD),
  ], pal, {}, opt);
  // ── หน้า ──
  ctx.save();
  headXf(ctx);
  // แก้มชมพูฟุ้ง ๆ ไม่มีเส้น
  ctx.fillStyle = pal.cheek;
  ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.ellipse(262, 336, 22, 12, -0.1, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  sideEye(ctx, pal, S.eye, { shut: Math.max(a.blink, a.shut), happy: a.happy, lx: a.lx, ly: a.ly, female: a.female, col: a.eyeCol || BABY });
  // จมูกชมพูเล็กที่ปลายจมูก
  ctx.fillStyle = pal.nose;
  ctx.beginPath(); ctx.ellipse(157, 314, 7, 5.5, -0.3, 0, TAU); ctx.fill();
  // ปาก: ω ครึ่งเดียว (มุมข้าง) / อ้าปากตอนร้อง
  ctx.strokeStyle = pal.line;
  ctx.lineWidth = 4.2 * LINE_K;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (a.mouth > 0.15) {
    ctx.fillStyle = pal.mouth;
    ctx.beginPath(); ctx.ellipse(178, 344, 9, 5 + a.mouth * 8, 0.2, 0, TAU); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(166, 336);
    ctx.quadraticCurveTo(170, 348, 180, 346);
    ctx.quadraticCurveTo(186, 345, 190, 339);
    ctx.stroke();
  }
  // หนวด: ขีดรีเล็ก ๆ สองแถวบนแก้ม (ตามชีท)
  ctx.fillStyle = pal.line;
  for (const [x, y] of [[276, 284], [280, 300], [276, 316]]) {
    ctx.beginPath(); ctx.ellipse(x, y, 6, 3.2, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/**
 * โครงหัวตามชีท (เส้นหน้าตรง): กระหม่อมโดมกลม ข้างหัวลาดลงไปกว้างสุดแถวแก้ม แล้วคางมนแบน ๆ
 * แทนเส้นหัวจากไฟล์ (ซึ่งกระหม่อมแบนเพราะเคยต่อกับหู) — ลายบนหัวยังใช้จากไฟล์ (ตัดตามรูปนี้)
 */
const HEAD_PATH = new Path2D(
  // ทรงไข่ตามแบบ: กระหม่อมแคบมน → ข้างหัวลาดออกเป็นเส้นเดียวยาว ๆ → กว้างสุดแถวแก้ม (ใต้ตา) → คางมนกว้าง
  // ไม่มีช่วงข้างหัวตั้งตรง (ตั้งตรงแล้วหน้าเป็นทรงมนเหลี่ยม)
  'M300 114 C366 114 412 146 434 196 C454 242 468 284 466 320 '
  + 'C462 368 410 394 300 394 C190 394 138 368 134 320 '
  + 'C132 284 146 242 166 196 C188 146 234 114 300 114 Z');

// ══ แขนสองข้อ (ไหล่ + ศอก) แบบ IK ══
// ท่าบอกแค่ "อุ้งเท้าไปอยู่ตรงไหน" (เกาพุง ประกบอก แตะปาก) แล้วคำนวณมุมไหล่กับศอกเอง
// ข้อศอกพับลงล่างเสมอเหมือนแมวจริง · ผสมจากท่าพักไปท่าเป้าแบบนุ่ม ๆ ตามน้ำหนักของท่า
const ARM_REST = {
  left: { E0: { x: 160, y: 456 }, P0: { x: 113, y: 467 } },
  right: { E0: { x: 440, y: 456 }, P0: { x: 487, y: 467 } },
};
/** โคนแขน (ส่วนที่ฝังในตัว) — ตอนวาดแขนทับตัว เว้นตรงนี้ไว้ ไหล่จึงยังกลืนกับตัว ไม่มีเส้นปิดโคนแขน */
const ARM_ROOT = {
  left: [[192, 392], [232, 392], [232, 500], [188, 500]],
  right: [[408, 392], [368, 392], [368, 500], [412, 500]],
};
const wrapA = (a) => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};
function solveArm(S, E0, P0, T) {
  const L1 = Math.hypot(E0.x - S.x, E0.y - S.y);
  const L2 = Math.hypot(P0.x - E0.x, P0.y - E0.y);
  const dx = T.x - S.x, dy = T.y - S.y;
  const base = Math.atan2(dy, dx);
  const d = Math.min(L1 + L2 - 0.5, Math.max(Math.abs(L1 - L2) + 0.5, Math.hypot(dx, dy)));
  const A = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const ua = base + A, ub = base - A;
  const aU = Math.sin(ua) >= Math.sin(ub) ? ua : ub;   // ศอกอยู่ล่าง
  const ex = S.x + Math.cos(aU) * L1, ey = S.y + Math.sin(aU) * L1;
  const aF = Math.atan2(S.y + Math.sin(base) * d - ey, S.x + Math.cos(base) * d - ex);
  const t1 = wrapA(aU - Math.atan2(E0.y - S.y, E0.x - S.x));
  const t2 = wrapA(aF - Math.atan2(P0.y - E0.y, P0.x - E0.x) - t1);
  return { t1, t2 };
}
/** เป้าอุ้งเท้าเฉลี่ยตามน้ำหนักของแต่ละท่า → { x, y, w } */
function armTarget(list) {
  let w = 0, x = 0, y = 0;
  for (const [pt, wt] of list) {
    if (wt <= 0.001) continue;
    w += wt;
    x += pt[0] * wt;
    y += pt[1] * wt;
  }
  return w > 0 ? { x: x / w, y: y / w, w: Math.min(1, w) } : null;
}

/** หัวใจที่น้องประกบไว้ระหว่างอุ้งเท้า */
function heartPath(cx, cy, sz) {
  const p = new Path2D();
  p.moveTo(cx, cy + sz * 0.92);
  p.bezierCurveTo(cx - sz * 0.35, cy + sz * 0.62, cx - sz * 1.22, cy + sz * 0.22, cx - sz * 1.12, cy - sz * 0.36);
  p.bezierCurveTo(cx - sz * 1.02, cy - sz * 0.92, cx - sz * 0.3, cy - sz * 1.06, cx, cy - sz * 0.48);
  p.bezierCurveTo(cx + sz * 0.3, cy - sz * 1.06, cx + sz * 1.02, cy - sz * 0.92, cx + sz * 1.12, cy - sz * 0.36);
  p.bezierCurveTo(cx + sz * 1.22, cy + sz * 0.22, cx + sz * 0.35, cy + sz * 0.62, cx, cy + sz * 0.92);
  p.closePath();
  return p;
}
function drawHeart(c, cx, cy, sz, pal) {
  if (sz < 0.5) return;
  const p = heartPath(cx, cy, sz);
  c.save();
  c.fillStyle = '#FF6F98';
  c.fill(p);
  // เงา cel ระดับเดียว: ครึ่งล่างขวาเข้มขึ้นนิด (ตัดตามรูปหัวใจ)
  c.clip(p);
  c.fillStyle = '#E8507C';
  c.beginPath();
  c.ellipse(cx + sz * 0.55, cy + sz * 0.55, sz * 1.0, sz * 0.75, -0.5, 0, TAU);
  c.fill();
  c.fillStyle = '#FF6F98';
  c.beginPath();
  c.ellipse(cx + sz * 0.2, cy + sz * 0.05, sz * 0.95, sz * 0.72, -0.5, 0, TAU);
  c.fill();
  c.restore();
  c.strokeStyle = pal.line;
  c.lineWidth = LW * 0.8;
  c.lineJoin = 'round';
  c.stroke(p);
  // ไฮไลต์: วงรีโค้งตามพูซ้าย + จุดเล็ก
  c.fillStyle = 'rgba(255,255,255,.85)';
  c.beginPath();
  c.ellipse(cx - sz * 0.55, cy - sz * 0.42, sz * 0.24, sz * 0.13, -0.7, 0, TAU);
  c.fill();
  c.beginPath();
  c.arc(cx - sz * 0.25, cy - sz * 0.6, sz * 0.06, 0, TAU);
  c.fill();
}
/** ประกายสี่แฉกเล็ก ๆ รอบหัวใจ (กะพริบสลับกัน) */
function drawSparks(c, cx, cy, sz, t, w) {
  if (w < 0.05) return;
  const pts = [[-1.9, -0.9, 0], [1.8, -1.2, 1.7], [2.0, 0.6, 3.1]];
  c.save();
  c.fillStyle = '#FFF6C8';
  c.strokeStyle = 'rgba(255,190,120,.9)';
  c.lineWidth = 1.6;
  for (const [dx, dy, ph] of pts) {
    const k2 = Math.max(0, Math.sin(t * 0.09 + ph));
    if (k2 < 0.05) continue;
    const r = sz * 0.36 * k2;
    const x = cx + dx * sz, y = cy + dy * sz;
    c.globalAlpha = w * k2;
    c.beginPath();
    c.moveTo(x, y - r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y);
    c.quadraticCurveTo(x, y, x, y - r);
    c.fill();
    c.stroke();
  }
  c.restore();
}

/**
 * วาดน้องแบบใหม่ ยืนเท้าแตะ feetY
 * @param idle { k, shape } ท่าตอบการแตะ (home-moves) หรือ { k, pose } ท่าว่าง (IDLE_SHAPE)
 *   รองรับทุกช่องของรูปร่าง: ลำตัว (sit crouch loaf roll sprawl puff) · แขน (wave knead clasp offer
 *   scratch reachL paw swingL chinR) · ขา (kickL kickR) · หัว (tilt ear gaze lick chirp mouth shut wink mood)
 *   · หาง (wag tailShort) · ทั้งตัว (lean sx sy dx turn) — lift ผู้เรียกยกเท้าให้เอง
 *   ท่าลอยเฟี้ยว: swingL = ชูแขนซ้ายออกข้าง · chinR = อุ้งเท้าขวาเท้าคาง · kickL/kickR = เตะขา (เรเดียน)
 *   · wink = ขยิบตาขวา (ตาหลับแบบเดิม) ตาซ้ายลืมปกติ
 */
/** บริบทวาดเปล่าไว้เช็คว่าจุดอยู่ในรูปไหม (พิกัดไฟล์ ไม่มีการแปลง) */
let hitCv = null;
const hitCtx = () => (hitCv ||= (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas'))).getContext('2d');
export function drawCat2(ctx, x, feetY, scale, s, t = 0, idle = null) {
  s = withBreed(s);   // น้องจากกล่องสายพันธุ์แบบใหม่: เติมจานสี/ตา/ลาย
  const m0 = ctx.getTransform();   // ตัวแปลงของผู้เรียก — เอฟเฟกต์ท่าเปิดตัววาดในพิกัดพื้น ไม่ยืด/เอียง/เด้งตามตัว
  const pal = paletteOf(s);
  // art = ลายเฉพาะตัวของแมวแบบใหม่ (CAT2_BREEDS) · stripeK/stripeA = ความหนา/ความเข้มของลาย
  const art = s?.art || {};
  const opt = { noStripes: s && s.id !== 'orange' && s.stripes === false, plainTail: !!art.plainTail, stripeK: art.stripeK ?? 1, stripeA: art.stripeA ?? 1, calico: art.calico || art.points || null };
  const marks = art.calico || art.points || null;   // ลายสามสี / แต้มวิเชียรมาศ — ระบบ patch เดียวกัน
  // แมวสามสี: ลายของชิ้นที่ไม่ได้มาจากไฟล์ออกแบบ (หาง แขนท่อ ตัวนั่ง ก้อนหมอบ) — ทาเป็นสีขนตอนลงสีพื้น (drawLayer 2a) ไม่มีเส้นรอยต่อ
  const calPatch = {
    tail: (G) => (marks ? (c) => calicoTail(c, G, marks) : null),
    arm: (G) => (marks ? (c) => calicoArm(c, G, marks) : null),
    // แขนท่อนบนของท่านั่งเกาพุง: ปลายท่อเป็นข้อศอก ไม่ใช่อุ้งเท้า — วิเชียรมาศไม่ลงเงาปลายแขน (ลงแล้วเป็นปื้นเทาตรงศอก ขอบตัดตรง)
    upArm: (G) => (marks && !marks.armTip ? (c) => calicoArm(c, G, marks) : null),
    band: (G, ranges) => (marks ? (c) => calicoBand(c, G, ranges, marks) : null),
    area: (key) => (marks ? (c) => calicoDraw(c, marks, key, pal) : null),
  };
  // เพศ: น้องส้มตัวหลักเป็นเพศผู้ · น้องในกล่องอ่านจาก skin.sex ('f' = เมีย)
  const female = s?.sex === 'f';
  const orangeNew = !s || s.id === 'orange';   // สีชีทใหม่ (แมวส้มตัวหลัก)
  const T = t / 60;   // homeTick เดินเฟรมละ 1 ที่ 60 fps → วินาที

  // ── ค่าจากท่า — คูณ k ให้ค่อย ๆ เข้า/ออกจากท่า ──
  const shape = idle?.shape || (idle?.pose ? IDLE_SHAPE[idle.pose] : null) || null;
  const k = idle ? clamp01(idle.k) : 0;
  const v = (key) => (shape?.[key] || 0) * k;
  const raw = (key) => shape?.[key] || 0;
  // หมอบ: บีบช่วงเปลี่ยนทรงให้สั้น (ลงนอน/ลุกเร็ว) ช่องโหว่ระหว่างทรงยืนกับก้อนขนมปังจึงเห็นแค่แว้บเดียว
  const sit = ease(clamp01((v('sit') - 0.3) / 0.4)), crouch = v('crouch'), loaf = ease(clamp01((v('loaf') - 0.3) / 0.4));
  const roll = v('roll'), sprawl = v('sprawl'), puff = v('puff');
  const wave = v('wave'), waveT = raw('waveT');
  const knead = v('knead'), kneadT = shape && 'kneadT' in shape ? raw('kneadT') : Math.sin(t * 0.3);
  const clasp = v('clasp'), offer = v('offer');
  const scratch = v('scratch'), scratchT = raw('scratchT');
  const reachL = v('reachL'), paw = v('paw');
  const lick = shape?.lick ? Math.max(0, Math.sin(t * 0.22)) * v('lick') : 0;
  const turn = raw('turn') * k;
  const tailShort = v('tailShort');
  // ปากขยับเอง (ไม่ได้เล่นท่าก็มีชีวิต): ทุก ~3.3 วินาที สุ่มว่าจะ "เมี้ยว" เบา ๆ หนึ่งที หรือ "งุบงิบ" สองที
  const mn = Math.floor((t / 60) / 3.3), mc = (t / 60) - mn * 3.3, mh = hash(mn + 21);
  const mew = mh > 0.5 && mc < 0.5 ? Math.sin((mc / 0.5) * Math.PI) * (0.4 + 0.3 * hash(mn + 5)) : 0;
  const smack = mh > 0.22 && mh <= 0.5 && mc < 0.7 ? Math.abs(Math.sin((mc / 0.7) * Math.PI * 2)) * 0.3 : 0;
  const chirp = Math.max(v('mouth'), shape?.chirp ? Math.max(0, Math.sin(t * 0.3)) * v('chirp') : 0, mew, smack);
  const yawn = Math.min(v('mouth'), v('shut'));        // ปากอ้า + หลับตาพร้อมกัน = หาว
  const mood = idle?.mood ?? (k > 0.35 ? shape?.mood || '' : '');
  // ดีใจ = ตาปิดโค้ง ∩ · ตาเป็นประกาย (starry) = ตาเปิดโต รูม่านตากลม มีดาววิบ (ชีทหน้า kawaii)
  const happy = mood === 'happy';
  const starry = mood === 'starry';

  // ── จังหวะประจำตัว ──
  const breath = Math.sin(T * 2.1);                  // หายใจ ~3 วินาทีต่อรอบ
  const breathLag = Math.sin(T * 2.1 - 0.55);        // หัวขยับตามอกช้ากว่านิด (มีน้ำหนัก)
  // ถ่ายน้ำหนักซ้าย-ขวาช้า ๆ (ช่วงบนเอียง เท้าติดพื้น) — สองความถี่ผสมกันไม่ให้ดูเป็นลูกตุ้ม
  const sway = (Math.sin(T * 0.5) * 0.02 + Math.sin(T * 1.3 + 0.8) * 0.004) * (1 - k * 0.7);
  // สายตานำ หัวหันตามหลัง 0.12 วินาที (คนดูจะรู้สึกว่าน้อง "คิด" ก่อนหัน)
  const look = gazeAt(T), headLook = gazeAt(T - 0.12);
  const lookK = 1 - k;                                // ตอนเล่นท่า มองคนดูตรง ๆ
  const forced = shape?.gaze != null ? shape.gaze * k : null;
  // gazeY = มองขึ้น (−) / ลง (+) ใช้คู่กับ gaze (เช่นเงยมองของที่ตกลงมาจากฟ้า) — หน้าเลื่อนตามนิดหนึ่งเหมือนเงยหน้า
  const forcedY = forced != null ? (shape?.gazeY || 0) * k : 0;
  const gx = forced ?? look.x * lookK, gy = forced != null ? forcedY : look.y * lookK;
  const hx = forced != null ? forced * 0.6 : headLook.x * lookK, hy = forced != null ? forcedY * 0.6 : headLook.y * lookK;
  const blink = idle?.noBlink ? 0 : blinkAt(T, look);   // noBlink = ผู้เรียกกะพริบเองผ่าน shape.shut (ฉากกาช่า)
  const tiltOf = (tt) => Math.sin(tt * 0.6) * 0.03;
  // ประคองหัวใจ: เอียงหัวเบา ๆ ราว 4° (ท่าเดิมสั่งมาเกือบ 10° — มากไปสำหรับท่ามอบให้)
  const tiltK = clasp > 0.05 ? 1 - 0.55 * clamp01(clasp * 1.5) : 1;
  const tilt = tiltOf(T) * (1 - k * 0.6) + hx * 0.05 + v('tilt') * tiltK + lick * 0.07;
  const earLag = (tiltOf(T - 0.22) - tiltOf(T)) * 4;
  // หูกระดิก: ทุก ~2.4 วินาที (เว้นบ้างแบบสุ่ม) สะบัดไป-กลับเร็ว ๆ · บางทีสองทีติด · บางทีสองข้างพร้อมกัน
  const en = Math.floor(T / 2.4), ec = T - en * 2.4;
  const flickAt = (x) => (x >= 0 && x < 0.22 ? Math.sin((x / 0.22) * Math.PI * 2) : 0);
  const twitch = hash(en + 9) > 0.2
    ? (flickAt(ec) + (hash(en + 17) > 0.55 ? flickAt(ec - 0.26) * 0.8 : 0)) * (0.2 + 0.1 * hash(en + 4))
    : 0;
  const twitchSide = hash(en + 31) > 0.82 ? 'both' : hash(en + 3) > 0.5 ? 'left' : 'right';
  const hang = Math.sin(T * 0.5 - 0.7) * 0.025 * (1 - k * 0.5);
  const pop = k > 0 ? Math.sin(Math.min(1, k) * Math.PI) * 0.03 : 0;

  // ── ทรงตัว: นั่ง/ย่อ/หมอบ = ตัวช่วงบนลดลง ขาพับสั้นลงและกางออก ลำตัวยุบนิด ๆ ──
  const drop = 58 * sit + 24 * crouch + 74 * loaf;
  const legK = 1 - 0.5 * sit - 0.28 * crouch - 0.72 * loaf;
  const spread = 12 * sit + 6 * crouch + 12 * loaf;
  const SY = (1 + breath * 0.012) * (1 - 0.06 * sit - 0.14 * loaf);

  ctx.save();
  // ท่าเปิดตัว · แอบมองจากขอบฉาก (intro.stage = 'peek'): ตัวหลบอยู่ซ้ายขอบฉาก เอียงตัวโผล่แค่หัวออกมา
  // ตัดทุกอย่างที่อยู่ซ้ายของขอบทิ้ง · idle.edgeL = ขอบซ้ายของฉาก (พิกัดเดียวกับ x ของผู้เรียก)
  const x0 = x;
  const OUT0 = s?.outfit ? CAT2_OUTFITS[s.outfit.id] : null;
  const edgeL = idle?.edgeL ?? x - 620 * scale * UNIT;
  if (OUT0?.intro && idle?.intro != null && !idle.skip && OUT0.intro.stage?.(OUT0.intro.warp ? OUT0.intro.warp(idle.intro) : idle.intro) === 'peek') {
    ctx.beginPath();
    ctx.rect(edgeL, -1e5, 2e5, 2e5);
    ctx.clip();
    x = edgeL - (OUT0.intro.peekHide ?? 200) * scale * UNIT;
  }
  // dx = เลื่อนทั้งตัว (หน่วยตัวแมว) · lean = เอียงทั้งตัวรอบเท้า · puff = ขนพองทั้งตัว
  ctx.translate(x + v('dx') * scale, feetY);
  ctx.rotate(v('lean'));
  const sc = scale * UNIT * (1 + puff * 0.06);
  ctx.scale(sc * (1 + pop + v('sx')), sc * (1 - pop * 0.6 + v('sy')));
  ctx.translate(-300, -FEET_Y);
  if (roll) rotAt(ctx, { x: 300, y: 470 }, roll * 1.25);   // นอนตะแคง (ลอยฟ้า)
  // หมุนตัวรอบหนึ่ง: ตัวบีบแคบลง → พลิกเป็นด้านหลัง → บีบ → กลับด้านหน้า
  const cTurn = Math.cos(turn);
  // ── มุมข้าง: ช่วงที่ตัวหมุนผ่านด้านข้าง (หน้า/หลังบีบแคบกว่าครึ่ง) วาดตัวด้านข้างจริงแทน ──
  // ผู้ใช้ให้ซ่อนมุมข้างเต็มไว้ก่อน (ใช้แค่มุมเฉียง) — เปิดคืนได้ที่ SIDE_VIEW
  if (SIDE_VIEW && turn && Math.abs(cTurn) < 0.5) {
    if (Math.sin(turn) < 0) { ctx.translate(600, 0); ctx.scale(-1, 1); }   // หันขวา = กลับภาพ
    drawSideView(ctx, pal, opt, {
      T, t, breath, breathLag, blink, twitch, ear: v('ear'), tilt: v('tilt') * 0.5, female,
      eyeCol: s?.eyes?.[Math.sin(turn) < 0 ? 'left' : 'right'],   // แมวตาสองสี: ตาข้างที่หันเข้าหาจอ
      wag: Math.abs(shape?.wag || 0) * k, happy, shut: v('shut'), mouth: chirp,
      lx: -Math.abs(gx) * 4, ly: gy * 4,
    });
    ctx.restore();
    return;
  }
  // ด้านหน้าตอนกำลังหัน (มุมเฉียง 3/4): ตัวแคบลงนิดเดียว ส่วนหน้า ตา จมูก ปาก เลื่อนไปทางที่หันแบบลูกบอลหมุน (yawPt)
  // ด้านหลังยังบีบตามมุมเหมือนเดิม
  if (turn) {
    ctx.translate(300, 0);
    ctx.scale(cTurn < 0 ? Math.max(0.35, Math.abs(cTurn)) : 0.9 + 0.1 * Math.max(0.5, cTurn), 1);
    ctx.translate(-300, 0);
  }
  const back = cTurn < 0;
  // มุมหัน (เรเดียน): บวก = หันไปทางขวาจอ · sin(turn) > 0 คือหันซ้ายจอ (ตรงกับตัวด้านข้าง)
  // มุมเฉียงสุดที่ 60° — ช่วงที่เคยเป็นมุมข้างค้างที่มุมเฉียงแทน แล้วสลับไปด้านหลังเลย
  const yaw = !back && turn ? -Math.max(-1.05, Math.min(1.05, Math.asin(Math.max(-1, Math.min(1, Math.sin(turn)))))) : 0;
  /** ตำแหน่ง x บนผิวทรงกลม (รัศมี R รอบ cx) หลังหมุน yaw — ฝั่งไกลถูกบีบ ฝั่งใกล้ขยาย */
  // แรงหมุนจริงน้อยกว่ามุมตัว (หน้าแมวแบน ไม่ใช่ลูกบอลเต็มใบ) — 3/4 แบบชีท: จมูกเลื่อนราว 1/4 ของหัว
  const yF = yaw * 0.62, yE = yaw * 0.42;
  const yawX = (x, cx = 300, R = 172, a = yF) => {
    if (!a) return x;
    const th = Math.asin(Math.max(-1, Math.min(1, (x - cx) / R)));
    return cx + R * Math.sin(Math.max(-Math.PI / 2, Math.min(Math.PI / 2, th + a)));
  };
  /** ตัว (ทรงกระบอกรัศมี 128): เหมือน yawX แต่จุดที่เลยขอบตัว (แขน) ต่อออกไปแบบหดสั้น ไม่พับเป็นเส้น */
  const yB = yaw * 0.7;
  // เลื่อนเนื้อกลางตัว (พุง ลาย ขา) ไปทางที่หัน แต่ขอบตัวอยู่ที่เดิม — ไม่มีจุดพับ เส้นข้างตัวไม่เป็นแนวตั้งแข็ง
  // แขนที่ยื่นเลยขอบตัว: ฝั่งไกลหดสั้น (หุบไปข้างหลัง) ฝั่งใกล้หดนิดเดียว
  const bodyX = (x) => {
    if (!yB) return x;
    const R = 128, d = x - 300, ad = Math.abs(d), sg = Math.sign(d) || 1;
    const sh = R * Math.sin(yB) * 0.45;
    if (ad <= R) return x + sh * (1 - (d / R) ** 2);
    const far = sg * yB > 0;
    return 300 + sg * R + sg * (ad - R) * (far ? 0.5 : 0.92);
  };

  /** ย้ายชิ้นหน้า (จุดกลาง fx) ไปตำแหน่งใหม่ + บีบตามความเอียงของผิว */
  const yawFeature = (c, fx) => {
    if (!yaw) return 1;
    const th = Math.asin(Math.max(-0.98, Math.min(0.98, (fx - 300) / 172)));
    const k = Math.max(0.45, Math.min(1.2, Math.cos(th + yF) / Math.cos(th)));
    const X = yawX(fx);
    c.translate(X, 0);
    c.scale(k, 1);
    c.translate(-fx, 0);
    return Math.cos(th + yF);
  };
  const M = model(back ? 'back' : 'front');
  // แมวสามสี: ชิ้นส่วนที่แทรกปื้นส้ม/เทาไว้หน้าสุดของลวดลาย (ดัดไปกับชิ้นทุกท่า)
  const P = marks ? calicoParts(M, marks, back) : M.parts;

  // ── ตัวแปลงพิกัดของแต่ละชิ้น (ดัดทีละจุด) ──
  const HIP = { x: 300, y: 600 };
  // ลำตัวช่วงบน: ลดระดับตามท่านั่งทั้งก้อน · ยืดตามลมหายใจ + เอียงถ่ายน้ำหนัก ไล่น้ำหนักจากสะโพก
  const upperPt = (x, y) => {
    const w = ease(clamp01((592 - y) / 55));
    const Y = 560 + (y - 560) * (1 + (SY - 1) * w) + drop;
    return rotPt(HIP, sway * w, bodyX(x), Y);
  };
  const upper = (c) => {
    rotAt(c, HIP, sway);
    c.translate(0, drop);
    c.translate(300, 560);
    c.scale(1, SY);
    c.translate(-300, -560);
  };
  // ขา: พับสั้นลงรอบเท้า (เท้าติดพื้น) กางออกตอนนั่ง · เหยียดออกข้างตอนนอน
  /** ยอดโค้งเป้าระหว่างขาสองข้าง (พิกัดในไฟล์) */
  const CROTCH = { x: 300, y: 596 };
  const legPt = (side) => {
    const d = side === 'left' ? -1 : 1;
    const hip = M.piv[`hip-${side}`];
    const a = -d * 0.5 * sprawl;
    // เตะขา (ท่าลอยเฟี้ยว): ดัดทีละจุดแบบแขน — โคนขาใกล้สะโพกแทบไม่ขยับ ปลายเท้าขยับเต็มที่
    // หมุนทั้งท่อนแข็ง ๆ แล้วขอบขาส่วนเหนือสะโพกหมุนสวนเข้าไปในตัว เกิดหนามแหลมตรงเป้า
    const kick = v(side === 'left' ? 'kickL' : 'kickR');
    // ยกเท้า (ท่าวิ่ง/กระโดด · หน่วยไฟล์): เท้าขึ้นเต็มที่ โคนขาไม่ขยับ = ขาพับสั้นลงทางเท้า
    const lift = v(side === 'left' ? 'liftL' : 'liftR');
    return (x, y) => {
      let X = x + d * spread, Y = FEET_Y - (FEET_Y - y) * legK;
      if (lift) {
        const w = ease(clamp01((Y - hip.y - 6) / (FEET_Y - hip.y - 6))) * ease(clamp01(Math.hypot(X - CROTCH.x, Y - CROTCH.y) / 38));
        Y -= lift * w;
      }
      if (a) [X, Y] = rotPt(hip, a, X, Y);
      if (kick) {
        // จางลงใกล้ยอดโค้งเป้า (จุดที่ขาสองข้างใช้ร่วมกัน) — ไม่งั้นโค้ง ∩ ระหว่างขาแยกเป็นมุมหยัก
        const w = ease(clamp01((Y - (hip.y - 20)) / 80)) * ease(clamp01(Math.hypot(X - CROTCH.x, Y - CROTCH.y) / 38));
        if (w > 0) [X, Y] = rotPt(hip, kick * w, X, Y);
      }
      // หันเฉียง: ขาฝั่งที่หันไปหากางออกด้านข้าง (ตามแบบผู้ใช้) — จางใกล้เป้าแบบเดียวกับเตะขา
      const spreadT = (d > 0 && yaw > 0) || (d < 0 && yaw < 0) ? ease(clamp01(Math.abs(yaw) / 0.75)) : 0;
      // เลื่อนออกข้างตามความลึก (โคนขานิ่ง เท้าเลื่อนเต็ม) — Y คงเดิม เท้ายังแตะพื้น ไม่ลอย
      // เลื่อนหลังบีบตามทรงกระบอก (bodyX) — ไม่งั้นเท้าเข้าเขตที่ถูกบีบ อุ้งเท้าแคบเหมือนเขย่งส้นเท้า
      const sp = spreadT ? d * 24 * spreadT * ease(clamp01((Y - hip.y) / (FEET_Y - hip.y))) * ease(clamp01(Math.hypot(X - CROTCH.x, Y - CROTCH.y) / 70)) : 0;
      // อุ้งเท้าฝั่งนี้: ไม่ให้บีบแคบเท่าตัวฝั่งไกล — ยังสั้นกว่าอีกข้างนิด (ผู้ใช้ขอ)
      const bx = bodyX(X);
      const pawK = spreadT ? ease(clamp01((Y - 570) / 60)) * spreadT : 0;
      return [bx + pawK * (X - hip.x) * 0.35, Y];   // ไม่กางขาออกแล้ว (ผู้ใช้ให้คืนแบบเดิม — กางแล้วตัวดูแอ่น) เหลือแค่อุ้งเท้าวางแบน
    };
  };
  // แขน: มุมไหล่ + ศอกจากเป้าอุ้งเท้าของท่า
  const armAngles = (side) => {
    const L = side === 'left';
    let t1 = hang + (L ? 1 : -1) * (breath * 0.018 + sprawl * 0.35), t2 = 0;
    if (back) return { t1, t2 };
    const list = L ? [
      [[262, 476 + kneadT * 10], knead * (1 - clasp)],          // นวด/กอดที่อก
      [[282, 478 + offer * 30], clasp],                          // ประคองหัวใจ
      [[281, 502], offer * (1 - clasp) * (1 - v('tada'))],     // ยื่นให้คนดู (กางแขนทาดาแล้วไม่ดึงกลับมาที่อก — offer ยังค้างไว้ให้หัวใจจิ๋วลอย)
      [[256 + scratchT * 7, 508 + scratchT * 8], scratch],       // เกาพุง
      [[100, 515], reachL],                                      // เอื้อมไปหาหาง
      [[283, 368 + lick * 8], paw],                              // ยกอุ้งเท้ามาเลีย
      [[232, 548], loaf],                                        // ซุกแขนตอนหมอบ
      [[104, 490], yawn],                                        // หาว: แขนกางออกเฉียงลงนิด ๆ แขนเกือบตรง (บิดขี้เกียจ)
      // ลอยเฟี้ยว: กางแขนออกข้าง — เป้าเฉียงลงนิดในพิกัดตัว เพราะตัวเอียงตามเข็มอยู่ (roll) บนจอจึงออกมาเป็นกางเฉียงขึ้น
      [[90, 468], v('swingL')],
      [[104, 404], v('tada')],                                   // กางแขน "ทาดา~" หลังส่งหัวใจ
      [[104, 404], v('raiseL')],                                 // ชูของถือขึ้นเฉียงข้างตัว (ท่าแอ็ค/ท่าเปิดตัว) — แขนซ้ายข้างเดียว
    ] : [
      [[338, 476 - kneadT * 10], knead * (1 - clasp)],
      [[318, 478 + offer * 30], clasp],
      [[319, 502], offer * (1 - clasp) * (1 - v('tada'))],
      [[466 + waveT * 14, 366 + Math.abs(waveT) * 4], wave],     // โบกมือ
      [[368, 548], loaf],
      [[496, 490], yawn],
      [[336, 384], v('chinR')],                                  // ลอยเฟี้ยว: อุ้งเท้าเท้าคาง
      [[496, 404], v('tada')],
    ];
    const tg = armTarget(list);
    if (tg) {
      const ik = solveArm(M.piv[`shoulder-${side}`], ARM_REST[side].E0, ARM_REST[side].P0, tg);
      t1 += (ik.t1 - t1) * tg.w;
      t2 += (ik.t2 - t2) * tg.w;
    }
    // แกว่งแขน/งอศอก (ท่าวิ่ง · เรเดียน — บวก = หมุนตามเข็มบนจอ): บวกทับมุมที่ได้จากท่าอื่น
    t1 += v(L ? 'armSwingL' : 'armSwingR');
    t2 += v(L ? 'elbowL' : 'elbowR');
    return { t1, t2 };
  };
  const armPt = (side, ang) => {
    const L = side === 'left';
    const S = M.piv[`shoulder-${side}`], E0 = ARM_REST[side].E0;
    return (x, y) => {
      // เริ่มงอเอียงตามขอบตัว (ใต้รักแร้ขอบกางกว่าบนไหล่) มุมโคนแขนจึงไม่ปลิ้น
      const x0 = 300 + (L ? -1 : 1) * (100 + (y - 446) * 0.2);
      const w1 = ease(clamp01((L ? x0 - x : x - x0) / 46));
      const w2 = ease(clamp01((L ? E0.x + 14 - x : x - (E0.x - 14)) / 28));
      let X = x, Y = y;
      if (w2 > 0 && ang.t2) [X, Y] = rotPt(E0, ang.t2 * w2, X, Y);
      if (w1 > 0) {
        [X, Y] = rotPt(S, ang.t1 * w1, X, Y);
        Y -= breath * 1.2 * w1;   // ไหล่ยกตอนหายใจเข้า
      }
      return upperPt(X, Y);
    };
  };
  // ทรงหมอบ: ตั้งแต่ loaf ครึ่งทางสลับเป็นตัวก้อนขนมปัง หัวลดลงต่อเนื่องจากท่ายืนจนพักบนตัว
  const loafMode = !back && loaf >= 0.5;
  const loafU = loafMode ? ease(clamp01((Math.min(loaf, 1) - 0.5) / 0.5)) : 0;
  // ขาลงหมอบ: หัวจมลงหาตัวเร็วกว่าตัว (ถึงครึ่งทางหัวลดไป 120) แล้วไหลต่อเข้าท่าหมอบไม่สะดุด
  const headStand = drop + loaf * 166 + crouch * 6;
  const sitMode = !back && !loafMode && sit >= 0.5;
  const sitU = sitMode ? ease(clamp01((Math.min(sit, 1) - 0.5) / 0.5)) : 0;
  const headDrop = loafMode ? 120 + (LOAF_HEAD - 120) * loafU
    : sitMode ? 29 + (SIT_HEAD - 29) * sitU + crouch * 6
    : headStand;
  const head = (c) => {
    rotAt(c, HIP, sway);
    c.translate(0, headDrop - breathLag * 2.2);
    rotAt(c, M.piv.neck, tilt);
    c.translate(hx * 3, hy * 2);
  };
  const earRun = clamp01(raw('earRun'));
  const earPt = (side) => {
    const d = side === 'left' ? 1 : -1;
    const a = earLag + d * v('ear') * 0.3 + (twitchSide === side || twitchSide === 'both' ? -d * twitch : 0);
    const piv = M.piv[`ear-${side}`];
    return (x0, y0) => {
      // หูเตี้ยลง 8% จากโคน ตั้งอยู่บนไหล่โดมหัวแบบในแบบ (โคนซ่อนหลังหัว)
      let x = x0, y = y0;
      // ทรงหูแบบท่าวิ่ง (shape.earRun · ผู้ใช้ส่งแบบ 17 ต.ค.): ใบกว้างขึ้น เตี้ยลงนิด ปลายมนทู่ กางออกข้าง (สีเดิม)
      if (earRun) {
        const tipY = 52;
        if (y < tipY + 22) y += (tipY + 22 - y) * 0.18 * earRun;            // ปลายหูมนนิด (ขอบหูยังตรงแบบสามเหลี่ยม)
        y = piv.y + (y - piv.y) * (1 - 0.03 * earRun);                          // เตี้ยลงนิด
        x = piv.x + (x - piv.x) * (1 + 0.07 * earRun);                          // ใบกว้างขึ้นนิด
        [x, y] = rotPt(piv, -d * 0.04 * earRun * ease(clamp01((piv.y + 20 - y0) / 80)), x, y);   // กางออกข้างนิด (โคนอยู่ที่เดิม)
      }
      // ขอบนอกช่วงล่างของหูดึงเข้าหาหัว — ขอบหูไหลต่อเป็นข้างหัวเส้นเดียวแบบในแบบ (ไม่ยื่นเป็นบ่า)
      const outer = side === 'left' ? piv.x - x0 : x0 - piv.x;
      // มุมล่างด้านนอกของหูซุกเข้าหัวนิด — ไม่เป็นรอยบากตรงที่ขอบหูชนข้างหัว
      if (outer > 0) x += d * outer * 0.22 * ease(clamp01((y0 - 150) / 60));

      const up = ease(clamp01((piv.y + 10 - y0) / 60));
      y += (piv.y - y0) * 0.08 * up;
      x -= d * (piv.y - y0) * 0.12 * up;   // ปลายหูกางออกนิด (ปลายหูอยู่ราว 30%/70% ของความกว้างหัวตามแบบ)
      // ตอนหัน: โคนหูติดหัวอยู่กับที่ ช่วงบนของหูค่อย ๆ เลื่อนตามมุมหัน (โคนไม่ล้นออกนอกหัว)
      x += (yawX(x, 300, 172, yE) - x) * ease(clamp01((piv.y + 30 - y0) / 90));
      // หูฝั่งที่หน้าหันไปหา (ตามแบบผู้ใช้): ทั้งใบเลื่อนลงต่ำ + เข้าหากลางหัวนิด — โคนหูจมหลังกระหม่อม หัวบังหู
      // (หูกับหัวอยู่ชั้นเดียวกัน ส่วนที่จมจึงกลืนหายใต้หัว เหลือเส้นรอบนอกเส้นเดียว)
      const toward = (side === 'left' && yaw < 0) || (side === 'right' && yaw > 0);
      if (toward) {
        const f = ease(clamp01(Math.abs(yaw) / 0.75));
        y += 24 * f * ease(clamp01((205 - y0) / 115));   // ต่ำลงนิด (36 ต่ำไป · 4/16 สูงไป) — ลดแค่ช่วงบน โคนหูยังบังมุมกระหม่อม เส้นหัวไม่หัก
        // เลื่อน/บีบ/เอียงเฉพาะช่วงบนของหู — โคนหูที่ต่อกับกระหม่อมอยู่ที่เดิม เส้นหัวระหว่างหูจึงโค้งเรียบ ไม่งอเป็นปุ่ม
        const top = f * ease(clamp01((185 - y0) / 95));
        x += d * 10 * top;
        x = piv.x + (x - piv.x) * (1 - 0.08 * top);   // แคบลงนิดเดียว — กว้างเกือบเท่าหูอีกข้าง (ผู้ใช้ขอ)
        [x, y] = rotPt(piv, d * 0.12 * top, x, y);   // ปลายหูเอียงเข้าหาหูอีกข้างนิด ๆ (ผู้ใช้ขอ)
      }
      const w = ease(clamp01((212 - y0) / 75));
      if (w <= 0) return [x, y];
      const [X, Y] = rotPt(piv, a * w, x, y);
      return [X - hx * 2.5 * w, Y - hy * 1.5 * w];
    };
  };
  // หัวทรงไข่ตามชีท: ช่วงกระหม่อมแคบลง ช่วงแก้มเท่าเดิม (คงที่ จึงดัดครั้งเดียวต่อแบบแล้วเก็บไว้)
  // หัวตามแบบ (ชีท Dimension): โครงโดมกลม แก้มกว้าง คางมน — เส้นรอบหัวเต็มวง ตัดผ่านโคนหู (หูอยู่หลังหัว)
  // ผู้ใช้เลือกโครงหน้าเดิมจากไฟล์ออกแบบ (น่ารักกว่า) — HEAD_PATH เก็บไว้เผื่อใช้
  if (!M.headShaped) M.headShaped = { sil: P.head.sil, all: P.head.all, det: P.head.det };
  // วิเชียรมาศ: หน้ากากต้องเลื่อนไปกับจมูก/ปากตอนหันหน้า (ผู้ใช้ทัก) — เลื่อน/ย่อแบบเดียวกับชิ้นหน้า (yawFeature)
  const headPatch = art.points && yaw && P.head.patch
    ? (c) => { c.save(); yawFeature(c, 300); drawOps(c, P.head.patch, pal, {}, {}); c.restore(); }
    : P.head.patch;
  const headPart = () => ({ ...M.headShaped, det: P.head.det, patch: headPatch, soft: P.head.soft, xf: head });   // patch: ปื้นสีขนบนหัว (แมวสามสี)
  // หูชั้นหนึ่ง (ข้างหลัง) → หัวอีกชั้น (ข้างหน้า มีเส้นขอบเต็ม) = เห็นเส้นหัวตัดโคนหูแบบในแบบ
  const OUT = s?.outfit ? CAT2_OUTFITS[s.outfit.id] : null;
  // ท่าเปิดตัวของชุด (OUT.intro): idle.intro = เฟรมในท่า · idle.skip 0..1 = กำลังข้ามไปท่าแอ็ค (เอฟเฟกต์จางออก)
  const introOn = !!OUT?.intro && idle?.intro != null;
  const outK = {
    // intro.warp = ชุดที่ยืดเวลาท่าเปิดตัว (sweet): ช่องของชุดได้เฟรมสตอรี ผู้เรียกส่งเฟรมจริงมา
    pal, t, back: false, intro: introOn ? (OUT.intro.warp ? OUT.intro.warp(idle.intro) : idle.intro) : null, introSkip: introOn ? idle.skip || 0 : 0,
    sv: v,   // ค่าช่องของท่าตอนนี้ (คูณ k แล้ว) — ชุดใช้ช่องของตัวเองได้ เช่น orb
    introEdge: introOn ? 300 + (edgeL - x0) / (scale * UNIT) : null,   // ขอบซ้ายของฉาก (พิกัดตัว) — ของที่โผล่/เด้งมาจากขอบ
  };
  /** เอฟเฟกต์ท่าเปิดตัว — พิกัดพื้น (ไม่ยืด/เอียง/เด้งตามตัว) · layer 'back' ก่อนตัว / 'front' ท้ายสุด */
  const drawIntro = (layer) => {
    if (!introOn) return;
    ctx.save();
    ctx.setTransform(m0);
    // intro.ground = เอฟเฟกต์อยู่บนพื้นจริงเสมอ ไม่ลอยตามตัวตอนผู้เรียกยกเท้า (lift) — ชุดที่ตัวลอยนาน ๆ ในท่าเปิดตัว
    ctx.translate(x0, feetY + (OUT.intro.ground ? raw('lift') * scale : 0));
    ctx.scale(scale * UNIT, scale * UNIT);
    ctx.translate(-300, -FEET_Y);
    OUT.intro.fx(ctx, { ...outK, layer });
    ctx.restore();
  };
  let propNow = null;   // ของถือเฟรมนี้ (อุ้งเท้า + busy) — ท่าเปิดตัววาดของถือที่บิน/หมุนทับหน้าตัวด้วย
  /** ของชุดที่อยู่หลังตัว (เช่นฮู้ดกองหลังคอ) — วาดก่อนชั้นตัว ตามหัว */
  // idle.fxM = ตัวแปลงของผู้เรียกก่อนหมุนตัว (ตีลังกาท่าวิ่ง) — เอฟเฟกต์ชุด (ออร่า วงเวทใต้เท้า ประกาย) วาดตั้งตรงตามพื้น ไม่หมุนตามตัว
  //   ตอนนี้ = m0 · L  →  เอฟเฟกต์ = fxM · L (L = ตัวแปลงในตัวแมวที่สะสมหลังเข้าฟังก์ชัน)
  const fxUpright = () => {
    if (!idle?.fxM) return;
    ctx.setTransform(idle.fxM.multiply(m0.inverse()).multiply(ctx.getTransform()));
  };
  const drawBehind = (xf = null) => {
    if (!OUT?.behind || back) return;
    ctx.save();
    fxUpright();
    if (!OUT.behindBody) head(ctx);   // behindBody = พิกัดตัว (ผ้าคลุมยาวถึงพื้น ออร่ารอบตัว) ไม่ตามหัว
    OUT.behind(ctx, { ...outK, back, hxShift: hx * 6, cpt: (x, y) => [bodyX(x), y], headDrop });
    ctx.restore();
  };
  /** ของถือประจำชุด (OUT.prop) — วาดก่อนชั้นตัว อุ้งเท้าจึงกำด้ามไว้ · grip = อุ้งเท้าที่ถือ (null = ลอยข้างตัว) · busy = อุ้งเท้าไม่ว่าง */
  const drawProp = (grip = null, busy = 1) => {
    if (!OUT?.prop) return;
    propNow = { grip, busy };
    ctx.save();
    OUT.prop(ctx, { ...outK, back, grip, busy, drop, layer: 'back' });
    ctx.restore();
  };
  /** ท่าเปิดตัวที่มีของเกาะจอ (intro.lens เช่นน้ำแข็งเกาะจอ) — วาดทับทั้งผ้าใบในพิกัดพิกเซล หลังทุกอย่าง */
  const drawLens = () => {
    if (!introOn || !OUT.intro.lens) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    OUT.intro.lens(ctx, { ...outK, W: ctx.canvas.width, H: ctx.canvas.height });
    ctx.restore();
  };
  /** เอฟเฟกต์หน้าตัว (OUT.front) — วาดท้ายสุดของทุกท่า · ท่าเปิดตัว: เอฟเฟกต์ชั้นหน้า + ของถือช่วงที่ลอย/หมุนอยู่หน้าตัว */
  const drawFront = () => {
    if (OUT?.front) {
      ctx.save();
      fxUpright();
      OUT.front(ctx, { ...outK, back });
      ctx.restore();
    }
    drawIntro('front');
    if (introOn && OUT?.prop && propNow) {
      ctx.save();
      OUT.prop(ctx, { ...outK, back, ...propNow, drop, layer: 'front' });
      ctx.restore();
    }
    drawLens();
  };
  /** ของบนหาง (OUT.tailBow) ที่จุดที่ i ของหาง G (xf = ตัวแปลงของชั้นหาง) */
  const drawTailBow = (G, i, xf = null) => {
    if (!OUT?.tailBow) return;
    ctx.save();
    if (xf) xf(ctx);
    OUT.tailBow(ctx, { ...outK, back, at: G.pts[Math.min(i, G.pts.length - 1)] });
    ctx.restore();
  };
  /** ของบนหน้า (แว่น) — วาดในพิกัดหน้า ต่อจาก drawFace · มุมเฉียงเลื่อนตามกลางหน้า */
  const drawEyewear = () => {
    if (!OUT?.eyes || back) return;
    ctx.save();
    // ของที่รองรับ fx (ผ้าปิดตา) ดัดทีละจุดตามผิวหัว · อื่น ๆ (แว่น) เลื่อนทั้งชิ้นตามกลางหน้า
    if (OUT.eyes.fx) {
      // พิกัดหน้าเลื่อนจากหัว (hx*8, hy*5) — แปลงรูปหัวมาที่พิกัดหน้า ใช้ตัดสายให้จบที่ขอบหัว
      const hp = new Path2D();
      hp.addPath(M.headShaped.all, new DOMMatrix().translate(-hx * 8, -hy * 5));
      OUT.eyes(ctx, { ...outK, fx: (x) => yawX(x), headPath: hp });
    }
    else {
      if (yaw) ctx.translate(yawX(300) - 300, 0);
      OUT.eyes(ctx, outK);
    }
    ctx.restore();
  };
  /**
   * ตัวแปลงของบนหู: ประมาณการดัดของหู (earPt) รอบจุดยึด (ax, ay) เป็นเลื่อน/หมุน/ย่อ — ของบนหูจึงเกาะหูทุกท่า
   * (เดิมหมุนรอบโคนหูอย่างเดียว ตอนหันหน้าหูเลื่อน/เอียงไปแล้ว แต่โบว์ค้างที่เดิม — ผู้ใช้ทัก)
   */
  const earXf = (c, side, ax, ay) => {
    const f = earPt(side), [a0, a1] = f(ax, ay), [b0, b1] = f(ax + 20, ay), [c0, c1] = f(ax, ay + 20);
    // หมุน + ย่อเท่ากันทุกทาง (ไม่บีบตามหูที่แคบลงตอนหัน — ไม่งั้นโบว์แบน)
    const sc = Math.sqrt(Math.abs(((b0 - a0) * (c1 - a1) - (b1 - a1) * (c0 - a0)) / 400)), an = Math.atan2(b1 - a1, b0 - a0);
    const A = sc * Math.cos(an), B = sc * Math.sin(an), C = -B, D = A;
    c.transform(A, B, C, D, a0 - ax * A - ay * C, a1 - ax * B - ay * D);
  };
  const drawHeadLayers = () => {
    const ears = [bent('ear-left', earPt('left'), head), bent('ear-right', earPt('right'), head)];
    // ปลอกคอใต้คาง: วาดก่อนหัว หัวบังขอบบน (ตามหัว ไม่ใช่ตามตัว — นั่ง/หมอบคอจะลดลงตามหัว)
    const neckK = { ...outK, back, faceShift: hx * 6 + 172 * Math.sin(yF) * 0.6, hxShift: hx * 6, cpt: (x, y) => [bodyX(x), y] };
    if (OUT?.neck && !loafMode) { ctx.save(); head(ctx); OUT.neck(ctx, neckK); ctx.restore(); }
    // ของที่ห้อยจากหูไปหลังหัว (ริบบิ้นยาว): หัวบังโคน เห็นพลิ้วออกมาข้างหัว
    if (OUT?.earBack && !back) {
      ctx.save();
      head(ctx);
      earXf(ctx, 'right', 392, 150);
      OUT.earBack(ctx, outK);
      ctx.restore();
    }
    // หูกับหัวกลืนเป็นก้อนเดียว: ไม่มีเส้นตัดโคนหู เส้นกระหม่อมระหว่างหูยังอยู่ (เป็นขอบนอก)
    drawLayer(ctx, [...ears, headPart()], pal, hooks, opt);
    // ของบนหู: หมุนตามหูขวาที่กระดิก
    if (OUT?.ear) {
      ctx.save();
      head(ctx);
      earXf(ctx, 'right', 392, 150);
      OUT.ear(ctx, { ...outK, back });
      ctx.restore();
    }
    // ของบนหูซ้ายจอ (ต่างหู): หมุนตามหูซ้ายที่กระดิก
    if (OUT?.earL && !back) {
      ctx.save();
      head(ctx);
      earXf(ctx, 'left', 208, 150);
      OUT.earL(ctx, outK);
      ctx.restore();
    }
    // ของบนหัว (หมวก มงกุฎ): ตามหัว เลื่อนตามมุมหันแบบชิ้นหน้า (น้อยกว่า เพราะอยู่บนกระหม่อม)
    if (OUT?.hat) {
      ctx.save();
      head(ctx);
      ctx.translate(172 * Math.sin(yF) * 0.3, 0);
      OUT.hat(ctx, { ...outK, back, headPath: M.headShaped.all, shift: 172 * Math.sin(yF) * 0.3, fx: yaw ? (x) => yawX(x) : null });
      ctx.restore();
    }
  };
  const face = (c) => {
    head(c);
    c.translate(hx * 8, hy * 5);         // หน้าเลื่อนมากกว่าโครงหัว = หันหน้า
  };

  // ── หูด้านใน (ตามแบบผู้ใช้): ไล่สีแบบพ่นสี ──
  // แถบฝั่งหัว: ส้มเข้มที่ปลายหู → จางลงหาโคน · ด้านใน: ครีมพีชสว่างกลางหู ขอบนอกอมส้ม · ขนปุยโคนหูฟุ้ง ๆ
  const earBox = (op) => {
    const pts = (op?.cmds || []).filter((q) => q[0] !== 'Z').flatMap((q) => { const r = []; for (let i = 1; i < q.length; i += 2) r.push([q[i], q[i + 1]]); return r; });
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { x0, y0, x1, y1 };
  };
  const rgbaOf = (hex, a) => { const v = parseInt(hex.slice(1), 16); return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${a})`; };
  const earDark = (c, draw, op) => {
    if (!op?.path) return draw();
    const b = earBox(op);
    if (pal.earIn) {
      // แถบข้างหูของแมวขาว = ขนขาว เงาอมชมพูจาง ๆ ที่ปลายหู ไล่หายลงโคน
      c.fillStyle = pal.cat;
      c.fill(op.path);
      const q = c.createLinearGradient(0, b.y0, 0, b.y1);
      q.addColorStop(0, shadeRgba(pal, 0.55));
      q.addColorStop(0.6, shadeRgba(pal, 0.12));
      q.addColorStop(1, shadeRgba(pal, 0));
      c.fillStyle = q;
      c.fill(op.path);
      return;
    }
    const g = c.createLinearGradient(0, b.y0, 0, b.y1);
    g.addColorStop(0, pal.stripe);
    g.addColorStop(0.55, pal.shade);
    g.addColorStop(1, pal.cat);
    c.fillStyle = g;
    c.fill(op.path);
  };
  const earPale = (c, draw, op) => {
    if (!op?.path) return draw();
    const b = earBox(op);
    const left = (b.x0 + b.x1) / 2 < 300;   // หูซ้ายจอ: ขอบนอกอยู่ทางซ้าย
    c.save();
    c.clip(op.path);
    if (pal.earIn) {
      // หูแบบแมวขาว: นอกเส้นหูในเป็นขนขาว (สีตัว) — ชมพูลงทีหลังในเส้นหูใน (earInline) · เงาจาง ๆ ที่ขอบนอกให้หูมีมิติ
      c.fillStyle = pal.cat;
      c.fillRect(b.x0 - 20, b.y0 - 20, b.x1 - b.x0 + 40, b.y1 - b.y0 + 40);
      const ox = left ? b.x0 : b.x1, ix = left ? b.x0 + (b.x1 - b.x0) * 0.3 : b.x1 - (b.x1 - b.x0) * 0.3;
      const h = c.createLinearGradient(ox, 0, ix, 0);
      h.addColorStop(0, shadeRgba(pal, 0.5));
      h.addColorStop(1, shadeRgba(pal, 0));
      c.fillStyle = h;
      c.fillRect(b.x0 - 20, b.y0 - 20, b.x1 - b.x0 + 40, b.y1 - b.y0 + 40);
      c.restore();
      return;
    }
    // ครีมพีช: สว่างสุดกลาง-บนของหู → อมส้มลงโคน
    c.fillStyle = pal.cream;
    c.fillRect(b.x0 - 20, b.y0 - 20, b.x1 - b.x0 + 40, b.y1 - b.y0 + 40);
    // ทาสีขนทับแบบไล่: บนอมพีชนิด ๆ → โคนกลืนเป็นสีขน (ไม่ใช่ขาวโพลน)
    const g = c.createLinearGradient(0, b.y0, 0, b.y1);
    g.addColorStop(0, rgbaOf(pal.cat, 0.3));
    g.addColorStop(0.5, rgbaOf(pal.cat, 0.42));
    g.addColorStop(1, rgbaOf(pal.cat, 0.85));
    c.fillStyle = g;
    c.fillRect(b.x0 - 20, b.y0 - 20, b.x1 - b.x0 + 40, b.y1 - b.y0 + 40);
    // ขอบนอกอมส้ม (พ่นสีจากขอบหูเข้ามา)
    const ox = left ? b.x0 : b.x1, ix = left ? b.x0 + (b.x1 - b.x0) * 0.55 : b.x1 - (b.x1 - b.x0) * 0.55;
    const h = c.createLinearGradient(ox, 0, ix, 0);
    h.addColorStop(0, shadeRgba(pal, 0.75));
    h.addColorStop(0.45, shadeRgba(pal, 0.18));
    h.addColorStop(1, shadeRgba(pal, 0));
    c.fillStyle = h;
    c.fillRect(b.x0 - 20, b.y0 - 20, b.x1 - b.x0 + 40, b.y1 - b.y0 + 40);
    if (/pale2/.test(op.id || '')) {
      // หูแบบสลับ (หูข้างใหญ่ตอนหันเฉียง): ฝั่งติดหัวลงส้มอ่อน ๆ ไม่ให้ขาวโล่งเหมือนสีหาย
      const hx = left ? b.x1 : b.x0, mx = (b.x0 + b.x1) / 2;
      const q = c.createLinearGradient(hx, 0, mx, 0);
      q.addColorStop(0, rgbaOf(pal.shade, 0.55));
      q.addColorStop(1, rgbaOf(pal.shade, 0.12));
      c.fillStyle = q;
      c.fillRect(b.x0 - 20, b.y0 - 20, b.x1 - b.x0 + 40, b.y1 - b.y0 + 40);
    }
    c.restore();
  };
  const earInline = (c, draw, op) => {
    if (!pal.earIn || !op?.path) return draw();
    const b = earBox(op);
    const left = (b.x0 + b.x1) / 2 < 300;
    // ชมพูในหู: ชมพูอ่อนกลาง → ชมพูเข้มขึ้นขอบนอก · โคนสว่างนิด ๆ
    c.fillStyle = pal.earIn;
    c.fill(op.path);
    const ox = left ? b.x0 : b.x1, ix = left ? b.x0 + (b.x1 - b.x0) * 0.7 : b.x1 - (b.x1 - b.x0) * 0.7;
    const h = c.createLinearGradient(ox, 0, ix, 0);
    h.addColorStop(0, rgbaOf(pal.earEdge || pal.ear, 0.7));
    h.addColorStop(1, rgbaOf(pal.earEdge || pal.ear, 0));
    c.fillStyle = h;
    c.fill(op.path);
    const g = c.createLinearGradient(0, b.y0, 0, b.y1);
    g.addColorStop(0, rgbaOf(pal.earEdge || pal.ear, 0.35));
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,.3)');
    c.fillStyle = g;
    c.fill(op.path);
    if (art.earFur) earFur(c, b, left, pal);
    // เส้นหูในชมพูเข้ม บางกว่าเส้นตัว (แบบไม่มีเส้นน้ำตาลในหู)
    c.strokeStyle = pal.earEdge || pal.ear;
    c.lineWidth = 2.6;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.stroke(op.path);
  };
  const earTuft = (c, draw, op) => {
    if (!op?.path) return draw();
    const a0 = c.globalAlpha;
    c.strokeStyle = pal.shade;
    c.lineCap = 'round';
    for (const [w, a] of [[9, 0.12], [6, 0.18], [3.2, 0.45]]) {
      c.globalAlpha = a0 * a;
      c.lineWidth = w;
      c.stroke(op.path);
    }
    c.globalAlpha = a0;
  };
  // หูฝั่งที่หันหนี (ข้างที่ใหญ่) ตอนหันเฉียง: แถบส้มเข้มสลับไปฝั่งนอก (ตามแบบผู้ใช้)
  const earAltK = (sfx) => {
    const left = sfx === '_6';
    const away = (left && yaw > 0) || (!left && yaw < 0);
    return away ? ease(clamp01((Math.abs(yaw) - 0.12) / 0.3)) : 0;
  };
  const earSwap = (fn, sfx, alt) => (c, draw, op) => {
    const k = earAltK(sfx), a = alt ? k : 1 - k;
    if (a <= 0.001) return;
    const a0 = c.globalAlpha;
    c.globalAlpha = a0 * a;
    fn ? fn(c, draw, op) : draw();
    c.globalAlpha = a0;
  };
  const hooks = {
    'ear-dark_6': earSwap(earDark, '_6', false), 'ear-dark_7': earSwap(earDark, '_7', false),
    'ear-pale_6': earSwap(earPale, '_6', false), 'ear-pale_7': earSwap(earPale, '_7', false),
    'ear-inline_6': earSwap(earInline, '_6', false), 'ear-inline_7': earSwap(earInline, '_7', false),
    'ear-dark2_6': earSwap(earDark, '_6', true), 'ear-dark2_7': earSwap(earDark, '_7', true),
    'ear-pale2_6': earSwap(earPale, '_6', true), 'ear-pale2_7': earSwap(earPale, '_7', true),
    'ear-inline2_6': earSwap(earInline, '_6', true), 'ear-inline2_7': earSwap(earInline, '_7', true),
    'calico-alt_6': earSwap(null, '_6', true), 'calico-alt_7': earSwap(null, '_7', true),   // แมวสามสี: ปื้นหูชุดตอนหันหน้า
    'ear-tuft0_6': earTuft, 'ear-tuft1_6': earTuft, 'ear-tuft2_6': earTuft,
    'ear-tuft0_7': earTuft, 'ear-tuft1_7': earTuft, 'ear-tuft2_7': earTuft,
    'inner-pink': (c, draw, op) => {
      draw();
      // ขอบหูในเป็นโค้งนุ่ม: ลากผ่านจุดกึ่งกลางของแต่ละท่อน (quadratic) แทนเส้นตรงหักมุม
      const pts = (op?.cmds || []).filter((q) => q[0] !== 'Z').map((q) => [q[1], q[2]]);
      if (pts.length < 3) return;
      const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const pa = new Path2D();
      const m0 = mid(pts[pts.length - 1], pts[0]);
      pa.moveTo(...m0);
      for (let i = 0; i < pts.length; i++) {
        const q = pts[i], n = pts[(i + 1) % pts.length];
        pa.quadraticCurveTo(q[0], q[1], ...mid(q, n));
      }
      c.strokeStyle = pal.line;
      c.lineWidth = LW * 0.75;
      c.lineJoin = 'round';
      c.stroke(pa);
    },
    'inner-pink_2': (c, draw, op) => hooks['inner-pink'](c, draw, op),
    'inner-line': () => {},   // เส้นเดิมข้างเดียวไม่ใช้แล้ว (มีเส้นรอบหูในแทน)
    'inner-line_2': () => {},
    Vector_10: () => {},   // วาดหลังชั้นตัวแทน (ดูท้ายชั้นตัว) — ในชั้นตัวโคนแขนขวาที่ซ่อนอยู่ทับจนลายหาย
    // เงาข้างลำตัวจากแบบถูกตัดด้วยขอบล่างของลำตัว (เส้นเฉียงตรงรอยต่อขา) — พอไม่มีเส้นในแล้วมันอ่านเป็นเส้นซ้อนข้างตัว
    // จึงไม่วาด · ความกลมของตัวได้จากเส้นรอบนอกกับลายแทน
    shade: () => {},
    // พุงครีม: ลงสีอย่างเดียว ไม่มีเส้นขอบตัดสี
    belly: (c) => {
      const op = P.belly?.det?.[0];
      if (!op || art.noBelly) return;   // แมวพื้นขาว (สามสี): ไม่มีพุงแยกสี
      c.fillStyle = pal.cream;
      c.save();
      // พุงเลื่อนตามผิวตัว (bodyX) และแคบลงตามมุมหัน
      const bx = bodyX(300);
      c.translate(bx, 0);
      c.scale(0.8 + 0.2 * Math.cos(yB), 1);
      c.translate(-300, 0);
      if (art.bellySoft) {
        // พุงขาวขอบฟุ้ง (ตามแบบแมวขาว): ลงสีจาง ๆ ซ้อนกันหลายชั้น แต่ละชั้นหดเข้าหากลางพุง — ขอบจางหาย กลางสว่าง
        const b = earBox(op), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, a0 = c.globalAlpha;
        for (const k of [1.04, 0.94, 0.84, 0.72]) {
          c.save();
          c.translate(cx, cy); c.scale(k, k); c.translate(-cx, -cy);
          c.globalAlpha = a0 * 0.3;
          c.fill(op.path);
          c.restore();
        }
        c.globalAlpha = a0;
      } else c.fill(op.path);
      c.restore();
    },
    // ลวดลายบนหัวเลื่อนตามหน้า (ใกล้หน้ามากเลื่อนมาก) · เงาข้างหัวเลื่อนสวน
    cream: (c, draw) => {
      // ครีมหน้าเติมเต็มถึงเส้นหัวรูปใหม่ (HEAD_PATH) — ไม่ใช้กรอบหัวเดิมในไฟล์ ซึ่งแคบกว่า เลยเหลือร่องส้มที่แก้ม-คาง
      // (ชั้นหัวตัดรายละเอียดตามรูปหัวใหม่ให้อยู่แล้ว)
      const shp = findOp(P.head.det, 'shape_7');
      if (!shp) return draw();
      c.fillStyle = pal.cream;
      // ตำแหน่งเดิมช่วงล่าง: กันช่องโหว่ฝั่งตรงข้ามตอนหันหน้า · ช่วงบนไม่วาดซ้ำ (ปลายแถบหน้าผากจะเป็นสองยอด)
      c.save(); c.beginPath(); c.rect(0, 300, 600, 200); c.clip(); c.fill(shp.path); c.restore();
      c.save(); c.translate(hx * 5 + 172 * Math.sin(yF) * 0.6, hy * 3); c.fill(shp.path); c.restore();
    },   // ครีมหน้าสีเดียวกับพุง
    stripes_6: (c, draw) => {
      c.save(); c.translate(hx * 5, hy * 2); yawFeature(c, 300); draw();
      if (art.cheekFur) cheekFur(c, pal, opt);
      c.restore();
    },
    // ขนขาวบนหน้า (แถบกลางหน้าระหว่างตา + คาง/ปาก): ตอนหัน ดัดทีละจุดตามผิวทรงกลมชุดเดียวกับตา (yawX)
    // แถบขาวจึงเลื่อนไปอยู่กึ่งกลางระหว่างตาตามมุมหัน · ขอบหัวไม่ขยับ (จุดที่ขอบหัวหมุนแล้วยังอยู่ที่ขอบ)
    // ขอบขาว-ส้มนุ่ม (ช่วงแก้ม): ลากเส้นโปร่งซ้อนตามขอบ — ฝั่งนอกครีมจางเข้าส้ม ฝั่งในส้มจางเข้าครีม
    cream: (c, draw, op) => {
      if (art.faceCream === false) return;   // แมวหน้าขาวล้วน (ไม่มีแถบครีมแบบน้องส้ม)
      if (!op) return draw();
      // ดัดเฉพาะรูปขนขาว — กรอบตัด (หน้ากากรูปหัว) คงที่เดิม ไม่งั้นขอบหัวฝั่งไกลหดเข้ามาเป็นเส้นคมกลางแก้ม
      const keepClip = (list, f) => list.map((q) => (q.kind === 'clip' ? { ...q, ops: deformOps(q.ops, f) }
        : q.kind === 'group' ? { ...q, ops: keepClip(q.ops, f) } : deformOps([q], f)[0]));
      // ใกล้ขอบหัว (และเลยขอบ) ค่อย ๆ หยุดเลื่อน — ขนขาวยังไปถึงขอบหัวเหมือนหน้าตรง ไม่เหลือขอบตั้งกลางแก้มฝั่งไกล
      const edgeKeep = (x) => { const r = Math.abs(x - 300) / 172; return 1 - ease(clamp01((r - 0.62) / 0.3)); };
      const ops = yaw ? keepClip(op.ops, (x, y) => [x + (yawX(x) - x) * edgeKeep(x), y]) : op.ops;
      drawOps(c, ops, pal, hooks, opt);
      // เบลอเฉพาะขอบช่วงแก้ม (ใต้ระดับตา) — แถบขาวกลางหน้าระหว่างตาคงขอบคมตามแบบ (ผู้ใช้สั่ง)
      // ขอบเริ่มเบลอไล่ค่อย ๆ เข้ม (y 282 → 336) ไม่ตัดเป็นเส้นตรง — ตัดแข็งแล้วเห็นรอยขีดแนวนอนตอนหลับตา
      const m = c.getTransform();
      const fr = catPxRect(m, c.canvas.width, c.canvas.height);   // ขอบนุ่มอยู่แค่ที่หัว — ทำงานเฉพาะกรอบตัวน้อง
      if (!fr.w || !fr.h) return;
      const L = fadeLayer(c, fr);
      L.setTransform(m);
      featherOps(L, ops, pal.cream, pal.cat);
      const g = L.createLinearGradient(0, 282, 0, 336);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      L.globalCompositeOperation = 'destination-in';
      L.fillStyle = g;
      L.fillRect(-1000, -1000, 2600, 3000);
      L.globalCompositeOperation = 'source-over';
      blitFade(c, L, fr);
    },
    shade_2: (c, draw) => { if (airbrushOn()) return; c.save(); c.translate(-hx * 5, 0); draw(); c.restore(); },
    'whiskers-left': (c, draw) => { c.save(); rotAt(c, { x: 150, y: 265 }, Math.sin(T * 3.1) * 0.03); draw(); c.restore(); },
    'whiskers-right': (c, draw) => { c.save(); rotAt(c, { x: 450, y: 265 }, -Math.sin(T * 3.1 + 1) * 0.03); draw(); c.restore(); },
    mouth: (c, draw) => {
      if (loafMode) {
        // หมอบหลับ: ปากแมว ω ปิดสนิท (ตามแบบ) ไม่อ้าปาก — ขยับกว้าง-แคบเบา ๆ ตามลมหายใจ
        c.save();
        c.translate(300, 351);
        c.scale(1 + Math.sin(T * 1.4) * 0.05, 1);
        c.strokeStyle = pal.line;
        c.lineWidth = 4.2 * LINE_K;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.beginPath();
        c.moveTo(-17, -4);
        c.quadraticCurveTo(-14, 5, -7, 5);
        c.quadraticCurveTo(-1, 5, 0, -1);
        c.quadraticCurveTo(1, 5, 7, 5);
        c.quadraticCurveTo(14, 5, 17, -4);
        c.stroke();
        c.restore();
        return;
      }
      if (lick > 0.12) {
        // เลีย: ลิ้นชมพูแลบออกมาใต้ปาก
        draw();
        c.fillStyle = '#FF8FA6';
        c.strokeStyle = pal.line;
        c.lineWidth = 3.4 * LINE_K;
        c.beginPath();
        c.ellipse(300, 358 + lick * 3, 8, 4 + lick * 6, 0, 0, TAU);
        c.fill();
        c.stroke();
        return;
      }
      if (art.grumpy && chirp < 0.15 && !happy && !starry) {
        // หน้ากวน: ปากบึ้ง ︿ เล็ก ๆ ใต้จมูก (แทนปาก ω)
        c.save();
        c.strokeStyle = pal.line;
        c.lineWidth = 4.2 * LINE_K;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.beginPath();
        c.moveTo(300, 342);
        c.lineTo(300, 348);
        c.moveTo(288, 360);
        c.quadraticCurveTo(300, 344 + Math.sin(T * 1.4) * 0.8, 312, 360);
        c.stroke();
        c.restore();
        return;
      }
      if (chirp < 0.15 && !happy && !starry) {
        // ปากปิด: มุมปากยิ้มกว้าง-แคบเบา ๆ ตามลมหายใจ
        c.save();
        c.translate(300, 352);
        c.scale(1 + Math.sin(T * 1.4) * 0.08 + chirp * 0.3, 1 + chirp * 0.6);
        c.translate(-300, -352);
        draw();
        c.restore();
        return;
      }
      const o = Math.max(chirp, happy || starry ? 0.7 : 0);
      if (yawn > 0.3) {
        // หาว: ปากวงรีสีชมพูกุหลาบ (ไม่มีลิ้น ตามแบบ) — ครึ่งบนขวาเข้ม ครึ่งล่างซ้ายสว่างเป็นแสงนวล ๆ · ขอบสีเส้นเดิม
        // อ้ากว้าง: จมูกเลื่อนขึ้น (hooks.nose) ปากจึงขยายขึ้นไปได้โดยไม่ล้นคาง
        const cy = 356 - yawn * 6, rx = 12 + yawn * 18, ry = 10 + yawn * 20;   // กว้างเกือบเท่าสูง (ผู้ใช้ขอกว้างซ้าย-ขวาขึ้น)
        const mp = new Path2D();
        mp.ellipse(300, cy, rx, ry, 0, 0, TAU);
        c.fillStyle = '#DE7680';
        c.fill(mp);
        c.save();
        c.clip(mp);
        c.fillStyle = '#F0A2A8';
        c.beginPath();
        c.ellipse(300 - rx * 0.32, cy + ry * 0.28, rx * 0.95, ry * 0.85, -0.5, 0, TAU);
        c.fill();
        c.restore();
        c.strokeStyle = pal.line;   // ขอบปากสีเส้นเดิมของแบบ — เปลี่ยนแค่สีในปาก
        c.lineWidth = 4.2 * LINE_K;
        c.stroke(mp);
        return;
      }
      // ปากยิ้มอ้า: ขอบบนเป็นปากแมว ω (ต่อจากใต้จมูก) ขอบล่างโค้งมนลงตามความกว้างที่อ้า
      const w = 15 + o * 5, d = 8 + o * 18;
      const mp = new Path2D();
      mp.moveTo(300 - w, 346);
      mp.quadraticCurveTo(300 - w * 0.5, 354, 300, 347);
      mp.quadraticCurveTo(300 + w * 0.5, 354, 300 + w, 346);
      mp.bezierCurveTo(300 + w * 0.9, 346 + d, 300 + w * 0.4, 350 + d, 300, 350 + d);
      mp.bezierCurveTo(300 - w * 0.4, 350 + d, 300 - w * 0.9, 346 + d, 300 - w, 346);
      mp.closePath();
      c.fillStyle = pal.mouth;
      c.fill(mp);
      c.save();
      c.clip(mp);
      c.fillStyle = '#FF8FA6';
      c.beginPath();
      c.ellipse(300, 352 + d, w * 0.62, d * 0.5, 0, 0, TAU);
      c.fill();
      c.restore();
      c.strokeStyle = pal.line;
      c.lineWidth = 4.2 * LINE_K;
      c.lineJoin = 'round';
      c.lineCap = 'round';
      c.stroke(mp);
    },
  };
  // หาว: จมูกเลื่อนขึ้นตามแรงอ้าปาก (หน้ายืดขึ้น) เว้นที่ให้ปากอ้ากว้าง
  hooks.nose = (c, draw) => {
    const up = yawn > 0.3 ? -17 * clamp01((yawn - 0.3) / 0.7) : 0;
    if (!up) return draw();
    c.save();
    c.translate(0, up);
    draw();
    c.restore();
  };
  // แก้มลงสีอย่างเดียว ไม่มีเส้นขอบ (ตามแบบตาแบ๊ว)
  for (const id of ['cheek-left', 'cheek-right']) {
    const op = findOp(P.face?.det || [], id);
    // แก้มเป็นวงสีเรียบตามรูปในแบบ (ผู้ใช้ไม่เอาแบบฟุ้ง) ไม่มีเส้นขอบ
    if (op) hooks[id] = (c) => { c.fillStyle = pal.cheek; c.fill(op.path); };
  }
  for (const side of ['left', 'right']) {
    const e = M.eye[side];
    const ops = M.groups[`eye-${side}-open`];
    if (!e || !ops) continue;
    hooks[`eye-${side}-open`] = (c) => {
      // ตาปิด + ขนตาสองเส้นงอนที่หางตา (ตัวเมีย — ผู้ใช้ขอให้หลับตาก็ยังมีขนตาเหมือนตอนลืมตา)
      const closedEye = (cc, ee, pp, kind, sd) => { closedEyeBase(cc, ee, pp, kind, sd); if (female && kind !== 'hurt') closedLashes(cc, ee, side, kind); };
      if (loafMode) return closedEye(c, e, pal, 'blink');   // ลงมาหมอบแล้ว = หลับตาตลอด
      if (yawn > 0.3) return closedEye(c, e, pal, 'yawn');   // หาว: ตาตกเป็นตัว U
      if (sit > 0.5 && v('paw') > 0.6) return closedEye(c, e, pal, 'blink');   // นั่งเลียอุ้งเท้า: หลับตาพริ้ม
      const eyesOpenHappy = happy && clasp > 0.3;   // ถือหัวใจ: ตาโตเป็นประกาย ไม่หยีตา
      if (happy && !eyesOpenHappy) return closedEye(c, e, pal, 'happy');
      if (eyesOpenHappy && v('shut') > 0.5) return closedEye(c, e, pal, 'happy');
      if (mood === 'hurt') return closedEye(c, e, pal, 'hurt', side);   // > <
      if (mood === 'dizzy') return dizzyEye(c, e, pal, t);               // @ @
      const cool = v('wink') > 0.5;
      const cute = v('winkCute') > 0.5;   // ขยิบตาน่ารัก (ท่าแอ็ค): ตาขวาโค้ง ∩ ตาซ้ายเปิดเป็นประกาย ไม่ปรือแบบท่าเฟี้ยว
      const coolAng = roll * 1.25 + tilt;   // มุมเอียงรวมของตัว (roll) กับหัว (tilt) บนจอ
      // ขยิบตาขวา: ท่าลอยเฟี้ยว / ภูมิใจ (smug) — โค้ง ∩ แบบในชีท ตาซ้ายเปิดปกติ
      if (side === 'right' && (cool || cute || mood === 'smug')) return closedEye(c, e, pal, 'happy');
      const lid = mood === 'tired' ? 0.5 : 0;
      const shut = Math.max(lid, blink, v('shut'));
      if (shut > 0.75) return closedEye(c, e, pal, 'blink');
      c.save();
      c.translate(e.x, e.y);
      c.scale(1, 1 - shut * 0.9);
      c.translate(-e.x, -e.y);
      // ตาขาว → ตาดำกลอกไปตามสายตา (ตัดอยู่ในตาขาว) → ขอบตาทับอีกรอบ
      // ตาแบ๊ว (วงเข้ม + เสี้ยวทอง) ไม่มีเส้นขอบตา — ใช้แค่รูปทรงตาขาวจากแบบเป็นกรอบ
      const white = ops[0];
      // หน้ากวน (วิเชียรมาศ): ตาครึ่งดวงวาดใหม่ทั้งดวง ใช้ทุกท่า — ไม่มีตากลมแบบเดิมโผล่เลย (ผู้ใช้สั่ง 15 ต.ค. รวมท่าเปิดตัว)
      // ตาประกาย/ดีใจ: ยังเป็นตาทรงเดิมของน้อง แค่มีดาววิ้งเพิ่ม · ตาปิด (กะพริบ ยิ้ม ∩ ขยิบ) ใช้ตาปิดตามปกติ
      const grumpyNow = !!art.grumpy;
      (grumpyNow ? drawGrumpyEye : s?.eyeStyle === 'round' ? drawRoundEye : drawBabyEye)(c, white.path, side, {   // แมวสามสี: ตากลมเขียวแบบใหม่
        lx: gx * 7 - hx * 2, ly: gy * 5,
        sparkle: starry || eyesOpenHappy || cute ? 1 : 0,
        t,
        lidded: cool,
        line: pal.line,
        col: s?.eyes?.[side] || BABY,   // สีตาของแมวแต่ละตัว (ตาสองสีได้)
        starDots: OUT?.starEyes || false,   // ชุดขนมหวาน/องค์หญิงหิมะ: จุดประกายเล็กเป็นดาว (สีตามชุด)
        starOne: !female,   // ตัวผู้: ดาวดวงเดียวพอ
      });
      // ขอบตานอกเส้นบาง ๆ (บางกว่าเส้นตัวมาก) ให้ตาแยกจากขนส้มชัดขึ้น
      if (!grumpyNow) {   // ตาหน้ากวนวาดขอบของตัวเองแล้ว (รูปตาไม่ใช่วงกลม)
        c.strokeStyle = pal.line;
        c.lineWidth = EYE_RIM_W;
        c.stroke(white.path);
      }
      c.restore();
      // ขนตา (ไม่วาดตอนตาปรือของท่าเฟี้ยว — เปลือกตาหนาทำหน้าที่นั้นแล้ว) · วาดนอกการบีบตา ขนตาจึงไม่แบนตอนหรี่
      if (!cool && !grumpyNow) {
        if (s?.eyeStyle === 'round') drawRoundLashes(c, side, 1 - shut * 0.9, e.y);   // แมวสามสี: ขนตาแบบใหม่
        else drawLashes(c, side, female, 1 - shut * 0.9, e.y);
      }
      // ตาเฟี้ยว: เปลือกตาปรือ (ตอนกะพริบไม่วาด ไม่งั้นซ้อนกับตาที่กำลังหลับ)
      // เปลือกตาเอียงไปกับหัว (เดิมหมุนสวนให้ตรงจอ แล้วไม่เข้ากับตา/ประกายที่เอียงตามตัว)
      if (cool && shut < 0.25 && !grumpyNow) coolLid(c, white.path, pal, side, 0, female);

      // ตาเศร้า: เปลือกตาละห้อย + น้ำตา
      if (mood === 'sad' && shut < 0.25) {
        if (!grumpyNow) sadLid(c, white.path, pal, side);
        tearDrop(c, pal, side, t);
      }
    };
  }

  const bent = (id, f, xf) => ({ ...deformPart(P[id], f), xf });
  /** หน้า: ชิ้นละตำแหน่งตามมุมหัน (ตา จมูก ปาก แก้ม) · หนวดฝั่งไกลซ่อน ฝั่งใกล้เลื่อนตาม */
  const drawFace = () => {
    if (!yaw) return drawOps(ctx, P.face.det, pal, hooks, opt);
    for (const op of P.face.det) {
      ctx.save();
      if (/^whiskers/.test(op.id || '')) {
        // หนวดฝั่งที่หน้าหันไปเลื่อนตามขอบหน้า · ฝั่งท้ายทอยแทบอยู่ที่เดิม
        const left = /left/.test(op.id);
        const front = (left && yaw < 0) || (!left && yaw > 0);
        ctx.translate(172 * Math.sin(yF) * (front ? 0.14 : 0.02), 0);   // ขอบหัวไม่ขยับตอนหัน → หนวดทั้งสองฝั่งเกาะชิดแก้มเท่า ๆ กัน (ไม่ลอยห่าง/ไม่จมในหัว)
      } else {
        const vis = yawFeature(ctx, opCenterX(op));
        if (vis < 0.12) { ctx.restore(); continue; }
      }
      drawOps(ctx, [op], pal, hooks, opt);
      ctx.restore();
    }
  };
  // วาดเฉพาะหัว (รูปโปรไฟล์ · หัวของตัววิ่งด้านข้าง): หน้าใช้ตัววาดตามมุมหัน (drawFace) — ตัววิ่งหันเฉียงขวา
  if (idle?.headOnly && !back) {
    drawHeadLayers();
    ctx.save();
    face(ctx);
    drawFace();
    ctx.restore();
    ctx.restore();
    return;
  }

  // ท่าเปิดตัว: ก่อนจังหวะปรากฏตัว ยังไม่มีน้อง — มีแต่เอฟเฟกต์
  if (introOn && !outK.introSkip && (OUT.intro.stage ? OUT.intro.stage(outK.intro) === 'hidden' : outK.intro < (OUT.intro.appear || 0))) {
    drawIntro('back');
    drawIntro('front');
    drawLens();
    ctx.restore();
    return;
  }

  if (loafMode) {
    // ตัวผุดเป็นก้อนรับหัวที่ลดลงมา (โตจากพื้นขึ้นไป) + หายใจเบา ๆ
    const grow = (c) => {
      c.translate(300, FEET_Y);
      // ตอนเพิ่งสลับ ตัวยังสูงรับคางพอดี (ไม่มีช่องว่าง) แล้วยุบลงเป็นก้อนตามหัว
      c.scale(0.92 + 0.08 * loafU, (1.18 - 0.18 * loafU) * (1 + breath * 0.015));
      c.translate(-300, -FEET_Y);
    };
    const flick = shape?.wag != null ? Math.sin(shape.wag * 1.5) * k : 0;
    const TL = loafTail(T, flick);
    // ฐานตัว → หาง → หัว → อกครีม + เส้นขาหน้า → หน้า
    drawBehind();
    drawLayer(ctx, [{ small: true, sil: [LOAF.base], all: LOAF.base, xf: grow, det: (c) => loafBaseDetails(c, pal, opt.noStripes), patch: calPatch.area('loaf') }], pal, hooks, opt);
    if (OUT?.shirt) { ctx.save(); grow(ctx); OUT.shirt(ctx, { ...outK, mode: 'loaf', body: LOAF.base, arms: [] }); outline(ctx, LOAF.base, pal); ctx.restore(); }
    drawLayer(ctx, [{ small: true, sil: [TL.path], all: TL.path, xf: grow, det: (c) => (opt.calico?.tailAll ? tailDetails(c, TL, pal, opt) : loafTailDetails(c, TL, pal, opt.noStripes)), patch: calPatch.tail(TL) }], pal, hooks, opt);
    drawTailBow(TL, 9, grow);
    drawProp();   // ของถือลอยอยู่หน้าหาง (หางอยู่หลังของถือเสมอ)
    drawHeadLayers();
    ctx.save();
    // ตัดนอกเนื้อหัว: อกกับเส้นขาวาดได้ถึงขอบหัวพอดี ทับแถบเส้นคางแต่ไม่ล้ำเข้าไปในหัว
    const m0 = ctx.getTransform();
    head(ctx);
    const outHead = new Path2D();
    outHead.rect(-1000, -1000, 3000, 3000);
    outHead.addPath(P.head.all);
    ctx.clip(outHead, 'evenodd');
    ctx.setTransform(m0);
    grow(ctx);
    ctx.fillStyle = pal.cream;
    if (!OUT?.shirt) ctx.fill(LOAF.chest);   // ใส่เสื้อ: เสื้อคลุมเต็มตัว ไม่มีอกครีมโผล่
    ctx.restore();
    // รอยต่อครีมหน้ากับครีมอก: ลงครีมทับขอบหัวเฉพาะในเขตอก ไม่ให้เหลือเส้นขนแมวบาง ๆ จากขอบที่ตัด
    ctx.save();
    grow(ctx);
    ctx.clip(LOAF.chest);
    ctx.setTransform(m0);
    head(ctx);
    ctx.strokeStyle = pal.cream;
    ctx.lineWidth = 3;
    ctx.stroke(P.head.all);
    ctx.restore();
    // เส้นขาหน้า: ตัดนอกเนื้อหัวเหมือนอก ต่อกับเส้นคางพอดี
    ctx.save();
    head(ctx);
    ctx.clip(outHead, 'evenodd');
    ctx.setTransform(m0);
    grow(ctx);
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = LW;
    ctx.lineCap = 'round';
    if (!OUT?.shirt) ctx.stroke(LOAF.legs);
    ctx.restore();
    // ปลอกคอตอนหมอบ: วาดหลังอกครีม/เส้นขาหน้า (ไม่งั้นโดนตัดหาย) แต่ไม่ทับหน้า (ตัดนอกหัว)
    if (OUT?.neck) {
      const m2 = ctx.getTransform();
      ctx.save();
      head(ctx);
      const outH = new Path2D();
      outH.rect(-1000, -1000, 3000, 3000);
      outH.addPath(M.headShaped.all);
      ctx.clip(outH, 'evenodd');
      OUT.neck(ctx, { ...outK, back: false, faceShift: hx * 6, loaf: true });
      ctx.setTransform(m2);
      ctx.restore();
    }
    ctx.save();
    face(ctx);
    drawFace();
    drawEyewear();
    ctx.restore();
    drawFront();
    ctx.restore();
    return;
  }

  if (sitMode) {
    // ตัวนั่งผุดรับหัว (สูงนิดตอนเพิ่งสลับแล้วยุบเข้าที่) + หายใจเบา ๆ
    const grow = (c) => {
      c.translate(300, FEET_Y);
      c.scale(0.96 + 0.04 * sitU, (1.08 - 0.08 * sitU) * (1 + breath * 0.012));
      c.translate(-300, -FEET_Y);
    };
    // ── แขนซ้ายจอ: ห้อย → เกาพุง (ถูขึ้นลงตามจังหวะเกา) / ยกมาใต้คางให้เลีย ──
    const sc2 = clamp01(scratch * 1.2), gr = clamp01(paw * 1.2), rub = scratchT;
    const scr = {
      up: SIT_ARM.leftScratch.up,
      lo: SIT_ARM.leftScratch.lo.map(([x, y], i) => [x + (i ? rub * 4 : 0), y + (i ? rub * 8 : 0)]),
    };
    const grm = { up: SIT_ARM.leftGroom.up, lo: SIT_ARM.leftGroom.lo.map(([x, y], i) => [x, y + (i === 2 ? lick * 5 : 0)]) };
    const upL = mixPts(SIT_ARM.leftRest.up, [[scr.up, sc2], [grm.up, gr]]);
    const loL = mixPts(SIT_ARM.leftRest.lo, [[scr.lo, sc2], [grm.lo, gr]]);
    const bandUpL = spineBand(upL, 8, () => 26);
    const bandLoL = spineBand(loL, 8, (i) => 23 - 1.5 * (i / 8));
    const sway2 = hang * 6;
    // แขนขวา: หนาเท่าแขนซ้าย (26 → 22) อุ้งเท้าขนาดเดียวกับข้างซ้าย — เดิมอ้วนกว่าอีกข้างจนดูไม่เท่ากัน
    const bandR = spineBand(SIT_ARM.right.map(([x, y], i) => [x + (i >= 2 ? sway2 : 0), y + breath * 1.2 * (i / 4)]), 12, (i) => 25 - 3 * (i / 12));
    const flick = shape?.wag != null ? Math.sin(shape.wag * 1.2) * k : 0;
    const TLf = tailLife(T);
    const tw = TLf.lag * 5 + TLf.flick * 7 + TLf.swishLag * 10 + flick * 10;
    const bandItem = (b, det) => ({ sil: [b.path], all: b.path, xf: grow, det });
    const TS = spineBand([[214, 612], [152, 614], [116, 562], [120, 502], [148 + tw * 0.4, 462], [186 + tw, 450 - tw * 0.3]], 16, (i) => TAIL_HALF(i));
    // ท่าเกาท้องใช้ตัวนั่งแบบเดิม (สะโพกกลม เท้าหลังครีม แขนพับ) ตลอดทั้งท่า — ผู้ใช้ชอบทรงนี้
    // ตัดสินจาก "เป็นท่าเกา" ไม่ใช่น้ำหนักแขน ไม่งั้นต้นท่าจะเห็นตัวนั่งแบบใหม่แว้บหนึ่งก่อนสลับ
    const scratchMove = shape != null && shape.scratch !== undefined;
    if (!scratchMove) {
      // เลียอุ้งเท้า (ตามภาพอ้างอิง): ขาหน้าซ้ายจอยกพับขึ้นมาแตะปาก ขาอีกข้างวางเหมือนนั่งปกติ
      const lift = gr > 0.02 ? ease(gr) : 0;
      // ── นั่งเฉย ๆ: ตัวระฆัง (SIT2) + ขาหน้าสองท่อนชัด ๆ + หางวางกับพื้น ──
      // หาง: ออกจากหลังสะโพกซ้าย นอนราบไปตามพื้น ปลายงอนขึ้นนิด ๆ (กระดิกเบา ๆ)
      // ส่ายไปมาช้า ๆ (~4 วิ/รอบ): โคนนิ่งติดพื้น ปลายหางกวาดซ้าย-ขวาแล้วงอนขึ้นตามจังหวะ
      // หางวางพื้น: โคนนิ่ง กลางหางกวาดช้า ๆ ปลายตามหลัง (lag) + กระดิกปลายเป็นพัก ๆ
      // นั่งเฉย ๆ ตวัดหางกวาดพื้นไปมา: กวาดช้า ๆ + ตวัดแรงเป็นพัก ๆ (ปลายตามหลังกลางหาง)
      const sw = TLf.sway * 1.3 + TLf.swish * 2.2, sw2 = TLf.lag * 1.3 + TLf.swishLag * 2.4 + TLf.flick * 0.5;
      const TS2 = spineBand([[216, 632], [160, 638], [112 + sw * 3, 637], [74 + sw * 8, 628 - Math.abs(sw) * 3],
        [54 + sw2 * 16 + tw * 0.3, 610 - Math.abs(sw2) * 4], [50 + sw2 * 24 + tw * 0.6, 588 + sw2 * 4]], 16, (i) => TAIL_HALF(i));
      const bodyDet = (c) => {
        // เงาข้างตัว · อกครีมใต้คาง · ลายบนสะโพก
        c.fillStyle = flatShade(pal);
        c.beginPath();
        c.ellipse(168, 580, 32, 84, 0, 0, TAU);
        c.ellipse(432, 580, 32, 84, 0, 0, TAU);
        c.fill();
        c.fillStyle = pal.cream;
        c.beginPath();
        c.ellipse(300, 512, 52, 60, 0, 0, TAU);
        c.fill();
        if (!opt.noStripes) {
          sitStripes(c, pal, [[160, 600, 184, 594], [158, 624, 184, 619], [440, 600, 416, 594], [442, 624, 416, 619],
            [206, 504, 224, 510], [394, 504, 376, 510]]);
        }
      };
      drawBehind();
      drawLayer(ctx, [
        { ...bandItem(TS2, (c) => tailDetails(c, TS2, pal, opt)), patch: calPatch.tail(TS2) },
        { sil: [SIT2.body], all: SIT2.body, xf: grow, det: bodyDet, patch: calPatch.area('sit') },
      ], pal, hooks, opt);
      drawTailBow(TS2, 11, grow);
      drawProp();   // ของถือลอยอยู่หน้าหาง
      if (OUT?.shirt) { ctx.save(); grow(ctx); OUT.shirt(ctx, { ...outK, mode: 'sit', body: SIT2.body, arms: [] }); ctx.restore(); }
      // กระโปรงตอนนั่ง: คลุมตัก แผ่ลงพื้น — ขาหน้าวาดทับ (ขาอยู่หน้ากระโปรง)
      if (OUT?.skirt) { ctx.save(); grow(ctx); OUT.skirt(ctx, { ...outK, mode: 'sit', body: SIT2.body }); ctx.restore(); }
      // ── ขาหน้า (ตามแบบ): สองท่อนอวบตั้งตรงหน้าตัว ปลายเป็นอุ้งเท้ากลมครีม มีขีดนิ้ว ──
      // วาดเป็นชั้นของตัวเองทับตัว เส้นรอบขาจึงครบ (ข้าง + ปลายมน) · ตัดขอบบนทิ้ง ขาจึงกลืนเข้ากับอก
      // สองขาชิดกันตรงบน (เส้นกลืนเป็นเส้นเดียว) แล้วแยกออกช่วงล่าง = ร่องระหว่างขาแบบในแบบ
      const m0 = ctx.getTransform();
      // ใส่กระโปรง: ขาหน้ายาวขึ้นไปทับทุกอย่างข้างล่าง (กระโปรง เข็มขัด โบว์ อกครีมช่วงล่าง)
      // แล้วโคนขาด้านบนไล่จางกลืนเข้าตัว — ไม่มีขอบตัดตรง ๆ · ใช้กับทุกชุดที่มีกระโปรง
      // (OUT.sitLegTop = ระดับเริ่มไล่จางของชุดนั้น ไม่ใส่ = 480)
      const skirtLegs = !!OUT?.skirt && !OUT.pants;   // กางเกงคลุมแค่สะโพก ขาหน้าวางทับปกติ
      const legR = skirtLegs ? catPxRect(m0, ctx.canvas.width, ctx.canvas.height) : null;   // ทำงานเฉพาะกรอบตัวน้อง
      const lc = skirtLegs ? fadeLayer(ctx, legR) : ctx;
      if (skirtLegs) lc.setTransform(m0);
      lc.save();
      grow(lc);
      const below = new Path2D();
      // ไม่ใส่ชุด: เริ่มใต้อกครีม — ขอบตัดไม่ทับครีม จึงไม่เห็นรอยต่อจาง ๆ
      below.rect(0, skirtLegs ? 480 : 574, 600, 320);
      lc.clip(below);
      lc.setTransform(m0);
      // ใส่กระโปรง: ขาแบบยาว (โคนต่อขึ้นไปใต้ปลอกคอ) ทับเข็มขัด/โบว์/อกช่วงล่าง แล้วไล่จางเข้าตัวด้านบน
      const LG = skirtLegs ? { L: SIT2.tallL, R: SIT2.tallR, all: SIT2.tallAll } : { L: SIT2.legL, R: SIT2.legR, all: SIT2.legAll };
      const legSil = lift > 0 ? [LG.R] : [LG.L, LG.R];
      const pawXs = lift > 0 ? [336] : [264, 336];
      const legAll = lift > 0 ? LG.R : LG.all;
      // วิเชียรมาศ: เงาน้ำตาลหม่นเหนืออุ้งเท้าหน้า (เหมือนขาตอนยืน)
      const legPatch = art.points ? (c) => {
        for (const cx of pawXs) {
          const g = c.createRadialGradient(cx, 640, 0, cx, 640, 46);
          for (const [o, col] of art.points.tipStops) g.addColorStop(o, col);
          c.fillStyle = g;
          c.fillRect(cx - 46, 594, 92, 92);
        }
      } : null;
      drawLayer(lc, [{ small: true, sil: legSil, all: legAll, xf: grow, patch: legPatch, det: (c) => {
        if (!skirtLegs) {
          c.fillStyle = pal.cream;
          c.beginPath();
          c.ellipse(300, 512, 52, 60, 0, 0, TAU);   // อกครีมไหลต่อลงมาบนโคนขา (ไม่โดนขาตัดเป็นขอบตรง)
          c.fill();
        }
        c.fillStyle = pal.paw || pal.cream;
        c.beginPath();
        for (const cx of pawXs) c.ellipse(cx, 642, 30, 14, 0, 0, TAU);
        c.fill();
        c.strokeStyle = pal.line;
        c.lineWidth = LW * 0.8;
        c.lineCap = 'round';
        for (const cx of pawXs) for (const dx of [-8, 8]) {
          c.beginPath();
          c.moveTo(cx + dx, 642);
          c.lineTo(cx + dx, 651);
          c.stroke();
        }
      } }], pal, hooks, opt);
      lc.restore();
      if (skirtLegs) {
        // ไล่จางโคนขา: บนสุดใส → ลงมา ~42 หน่วยทึบเต็ม แล้วแปะชั้นขาลงจอ
        const y0 = OUT.sitLegTop ?? 480;   // ทึบเต็มที่ y 522 = เหนือเชือกเอว (เอวนั่ง 530) — ขาบังเชือก/โบว์หมด
        lc.save();
        lc.setTransform(m0);
        grow(lc);
        const g = lc.createLinearGradient(0, y0, 0, y0 + 42);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,1)');
        lc.globalCompositeOperation = 'destination-in';
        lc.fillStyle = g;
        lc.fillRect(0, y0 - 100, 600, 400);
        lc.restore();
        blitFade(ctx, lc, legR);
      }
      if (OUT?.ankle) {
        ctx.save();
        grow(ctx);
        for (const side of lift > 0 ? ['right'] : ['left', 'right']) OUT.ankle(ctx, { ...outK, mode: 'sit', side });
        ctx.restore();
      }
      drawHeadLayers();
      ctx.save();
      face(ctx);
      drawFace();
      drawEyewear();
      ctx.restore();
      if (lift > 0) {
        // ── ขายกเลีย: ไหล่ → ศอกพับลงข้างอก → ท่อนแขนชูขึ้นให้อุ้งเท้าแตะใต้ปาก (ตามหัวที่เอียง) ──
        // วาดหลังหน้า อุ้งเท้าจึงอยู่หน้าปากเหมือนแบบ · เริ่มจากท่าขาวางพื้นแล้วค่อยพับขึ้น (ผสมจุดลื่น ๆ)
        const [mx0, my0] = rotPt(M.piv.neck, tilt, 292, 372);
        const mx = mx0 + hx * 3, my = my0 + headDrop - breathLag * 2.2 + lick * 6;
        const down = [[214, 492], [236, 560], [250, 610], [262, 632]];
        const up = [[214, 492], [242, 552], [mx - 34, my + 62], [mx - 8, my + 26]];   // อุ้งเท้าใต้ปาก เห็นลิ้นแลบเลีย
        const ctrl = mixPts(down, [[up, lift]]);
        const band = spineBand(ctrl, 12, (i) => 28 - 4 * (i / 12));
        const pw = pawOf(band, pal, 27, 24);
        const cap = new Path2D();
        cap.arc(band.pts[0].x, band.pts[0].y, band.half(0), 0, TAU, true);
        const all = new Path2D();
        all.addPath(band.path);
        all.addPath(pw.blob);
        all.addPath(cap);
        // เนื้อแขนสีขนเรียบ ๆ ไม่ใส่เงา/ลายส้มเข้ม (บนแขนที่พับเป็นรูป S มันอ่านเป็นขีดแปลก ๆ) — เหลือแค่อุ้งเท้าครีม
        drawLayer(ctx, [{ small: true, sil: [band.path, pw.blob, cap], all, xf: grow, det: (c) => pw.det(c, all), patch: calPatch.arm(band) }], pal, hooks, opt);
      }
      drawFront();
      ctx.restore();
      return;
    }
    const torsoDet = (c) => {
      c.fillStyle = flatShade(pal);
      c.beginPath();
      c.ellipse(422, 528, 26, 80, 0, 0, TAU);
      c.ellipse(180, 528, 24, 80, 0, 0, TAU);
      c.fill();
      if (art.noBelly) return;   // แมวพื้นขาว (สามสี): ไม่มีวงพุงครีม
      c.fillStyle = pal.cream;
      c.beginPath();
      c.ellipse(298, 544, 72, 80, 0, 0, TAU);
      c.fill();
    };
    const haunchDet = (c) => {
      c.fillStyle = flatShade(pal);
      c.beginPath();
      c.ellipse(152, 602, 22, 52, 0, 0, TAU);
      c.ellipse(448, 602, 22, 52, 0, 0, TAU);
      c.fill();
      if (!opt.noStripes) {
        sitStripes(c, pal, [[160, 574, 182, 568], [154, 598, 178, 594], [158, 622, 180, 619],
          [440, 574, 418, 568], [446, 598, 422, 594], [442, 622, 420, 619]]);
      }
    };
    const armDet = (c) => {
      if (!opt.noStripes) sitStripes(c, pal, [[420, 486, 402, 492], [424, 510, 406, 515], [182, 474, 200, 479], [178, 496, 196, 500]]);
    };
    drawBehind();
    // ── เงาก้อนเดียว: หาง ตัว แขนท่อนบนซ้าย แขนขวา ต้นขา ──
    drawLayer(ctx, [
      { ...bandItem(TS, (c) => tailDetails(c, TS, pal, opt)), patch: calPatch.tail(TS) },
      { sil: [SIT.torso], all: SIT.torso, xf: grow, det: torsoDet, patch: calPatch.area('sitOld') },
      { ...bandItem(bandUpL, armDet), patch: calPatch.upArm(bandUpL) },
      { ...bandItem(bandR, armDet), patch: calPatch.upArm(bandR) },
      { sil: [SIT.haunchL], all: SIT.haunchL, xf: grow, det: haunchDet, patch: calPatch.area('haunch') },
      { sil: [SIT.haunchR], all: SIT.haunchR, xf: grow, det: haunchDet, patch: calPatch.area('haunch') },
      { sil: [SIT.footL, SIT.footR], all: SIT.footL, xf: grow, det: () => {} },
    ], pal, hooks, opt);
    drawTailBow(TS, 9, grow);
    drawProp();   // ของถือลอยอยู่หน้าหาง
    // เนื้อแขนท่อนบนซ้าย + แขนขวา (สีขน + ลาย) ไม่มีเส้นรอบ — ใช้ทับเสื้อ/กางเกง เส้นแขนมาจากเส้นในชุดเดิม
    // ชุดแขนยาว (OUT.armCover = สีเสื้อ 3 ระดับ): แขนเป็นสีเสื้อ ไล่แนวตั้งชุดเดียวกับตัวเสื้อ
    const armCol = (c) => {
      if (!OUT?.armCover) return pal.cat;
      const g = c.createLinearGradient(0, 400, 0, 548);
      g.addColorStop(0, OUT.armCover[0]); g.addColorStop(0.45, OUT.armCover[1]); g.addColorStop(1, OUT.armCover[2]);
      return g;
    };
    const armSkin = () => {
      ctx.save();
      grow(ctx);
      ctx.fillStyle = armCol(ctx);
      ctx.fill(bandUpL.path);
      ctx.fill(bandR.path);
      ctx.save();
      const both = new Path2D();
      both.addPath(bandUpL.path);
      both.addPath(bandR.path);
      ctx.clip(both);
      if (!OUT?.armCover) armDet(ctx);
      ctx.restore();
      ctx.restore();
    };
    if (OUT?.shirt) {
      ctx.save(); grow(ctx); OUT.shirt(ctx, { ...outK, mode: 'sit', vy: 78, body: SIT.torso, arms: [] }); ctx.restore();   // หัวต่ำกว่าท่านั่งอื่น คอเสื้อลึกลงตาม
      // แขนอยู่หน้าเสื้อ: ลงแค่เนื้อแขน (ไม่มีเส้นรอบ) — เส้นแขนใช้ชุดเดียวกับตอนไม่ใส่ชุด (เส้นในสั้น ๆ ที่วาดทีหลัง)
      armSkin();
      // ชุดแขนสั้นตอนนั่งเกา (เช่นเชฟ): แขนเสื้อคลุมต้นแขนถึงก่อนศอก สีเดียวกับตัวเสื้อ
      if (OUT.sitSleeve) {
        ctx.save(); grow(ctx);
        if (typeof OUT.sitSleeve === 'function') {
          OUT.sitSleeve(ctx, bandUpL, 6, pal);
          OUT.sitSleeve(ctx, bandR, 5, pal);
        } else {
          tubeSleeve(ctx, bandUpL, 6, pal, OUT.sitSleeve);
          tubeSleeve(ctx, bandR, 5, pal, OUT.sitSleeve);
        }
        ctx.restore();
      }
    }
    if (OUT?.skirt) {
      ctx.save(); grow(ctx);
      OUT.skirt(ctx, { ...outK, mode: 'sit', bodies: [SIT.torso, SIT.haunchL, SIT.haunchR] });
      ctx.restore();
      // แขนสองข้างอยู่หน้ากระโปรงเสมอ: วาดแขนทับเฉพาะช่วงที่กระโปรงอยู่ (ข้างบนยังกลืนกับตัวเหมือนเดิม)
      const m3 = ctx.getTransform();
      ctx.save();
      grow(ctx);
      ctx.beginPath();
      ctx.rect(0, 500, 600, 300);
      ctx.clip();
      ctx.setTransform(m3);
      if (OUT.pants) armSkin();   // กางเกง: เส้นแขนเหมือนตอนไม่ใส่ชุด
      else drawLayer(ctx, [{ ...bandItem(bandUpL, armDet), patch: calPatch.upArm(bandUpL), small: true },
        { ...bandItem(bandR, armDet), patch: calPatch.upArm(bandR), small: true }], pal, hooks, opt);
      ctx.restore();
    }
    // ── เส้นด้านในตามแบบ (ตัดให้อยู่ในตัว ไม่ล้นเส้นรอบนอก) ──
    const body = new Path2D();
    for (const q of [SIT.torso, bandUpL.path, bandR.path, SIT.haunchL, SIT.haunchR]) body.addPath(q);
    ctx.save();
    grow(ctx);
    // ตัดให้อยู่ในก้อนลำตัวเท่านั้น — ช่วงโค้งต้นขาที่อยู่นอกลำตัวคือเส้นรอบนอกอยู่แล้ว วาดซ้ำจะเป็นเส้นซ้อนหนา
    ctx.clip(SIT.torso);
    {
      // แขนอยู่หน้าต้นขา: เส้นต้นขาต้องหยุดที่ขอบแขน ไม่ลากทับแขน
      const notArm = new Path2D();
      notArm.rect(-600, -600, 1800, 2000);
      notArm.addPath(bandR.path);
      notArm.addPath(pawOf(bandR, pal, 27, 22).blob);
      notArm.addPath(bandUpL.path);
      ctx.clip(notArm, 'evenodd');
    }
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = LW_IN;
    ctx.lineCap = 'round';
    // ขอบบนต้นขา: โค้งจากขอบตัวข้ามขึ้นมาแล้วลงหาเท้า
    ctx.beginPath();
    ctx.ellipse(204, 598, 55, 50, 0, Math.PI * 1.24, Math.PI * 2.18);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(396, 598, 55, 50, 0, Math.PI * 0.82, Math.PI * 1.76);
    ctx.stroke();
    ctx.restore();
    // ขอบในแขนท่อนบนซ้าย: หยุดตรงที่แขนท่อนล่างพับมาทับพอดี (ไม่ล้ำเข้าไปในแขนท่อนล่าง)
    {
      const m2 = ctx.getTransform();
      ctx.save();
      grow(ctx);
      ctx.clip(body);
      const notLo = new Path2D();
      notLo.rect(-600, -600, 1800, 2000);
      notLo.addPath(bandLoL.path);
      ctx.clip(notLo, 'evenodd');
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = LW_IN;
      ctx.lineCap = 'round';
      // เริ่มกลางแขน ไม่ลากขึ้นไปถึงอก — เส้นแบ่งน้อยลง ตัวดูเป็นก้อนเดียว
      ctx.stroke(bandEdge(bandUpL, innerSide(bandUpL), 3, 8));
      ctx.setTransform(m2);
      ctx.restore();
    }
    // แขนขวา: ขอบนอกกลืนกับตัวอยู่แล้ว (อยู่ในเงาก้อนตัว) — ตรงนี้วาดแค่อุ้งเท้า + ขอบในแขนช่วงล่างเส้นเดียว ปลายมน
    // (เดิมวาดทั้งชั้นแล้วตัดด้วยสี่เหลี่ยม ปลายเส้นเลยเป็นเหลี่ยมตัดตรง)
    {
      const pr = pawOf(bandR, pal, 27, 22);
      const allR = new Path2D();
      allR.addPath(bandR.path);
      allR.addPath(pr.blob);
      const m3 = ctx.getTransform();
      // ช่วงที่แขนวางหน้าต้นขา: วาดแขนพร้อมเส้นขอบของตัวเองทับต้นขา (แขนอยู่หน้า เส้นแขนทับเส้นขา)
      ctx.save();
      grow(ctx);
      ctx.clip(SIT.haunchR);
      ctx.setTransform(m3);
      drawLayer(ctx, [{ ...bandItem(bandR, (c) => { if (OUT?.armCover) { c.fillStyle = armCol(c); c.fill(bandR.path); } }), small: true }], pal, hooks, opt);   // แขนยาว: ช่วงหน้าต้นขาเป็นสีเสื้อ
      ctx.restore();
      // อุ้งเท้า: เส้นรอบเฉพาะส่วนที่ยื่นพ้นแขน
      ctx.save();
      grow(ctx);
      const outArm = new Path2D();
      outArm.rect(-600, -600, 1800, 2000);
      outArm.addPath(bandR.path);
      ctx.clip(outArm, 'evenodd');
      ctx.setTransform(m3);
      drawLayer(ctx, [{ small: true, sil: [pr.blob], all: pr.blob, xf: grow, det: () => {} }], pal, hooks, opt);
      ctx.restore();
      ctx.save();
      grow(ctx);
      ctx.fillStyle = pal.cat;
      ctx.fill(pr.blob);
      pr.det(ctx, allR);
      // ขอบในแขนช่วงศอก → อุ้งเท้า (ไม่ล้ำเข้าไปในอุ้งเท้า)
      const notPaw = new Path2D();
      notPaw.rect(-600, -600, 1800, 2000);
      notPaw.addPath(pr.blob);
      ctx.clip(notPaw, 'evenodd');
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = LW_IN;
      ctx.lineCap = 'round';
      ctx.stroke(bandEdge(bandR, innerSide(bandR), 5, bandR.N));
      ctx.restore();
    }
    // เท้าหลังครีม — ขอบนอกมาจากเงาก้อนตัวแล้ว ตรงนี้ลงครีม + เส้นขอบบนเท้า (เส้นในบางเท่าเส้นอื่น) + ขีดนิ้ว
    {
      const feet = new Path2D();
      feet.addPath(SIT.footL);
      feet.addPath(SIT.footR);
      ctx.save();
      grow(ctx);
      ctx.fillStyle = pal.paw || pal.cream;
      ctx.fill(feet);
      ctx.strokeStyle = pal.line;
      ctx.lineCap = 'round';
      // ขอบบนเท้าเท่านั้น (ครึ่งบน) — ครึ่งล่างทับเส้นก้นอยู่แล้ว วาดซ้ำจะหนา
      ctx.lineWidth = LW_IN;
      for (const [cx, cy, rx, ry] of [[216, 628, 37, 20], [386, 628, 37, 20]]) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.02, Math.PI * 1.98);
        ctx.stroke();
      }
      ctx.lineWidth = LW * 0.8;
      for (const cx of [216, 386]) for (const dx of [-11, 11]) {
        ctx.beginPath();
        ctx.moveTo(cx + dx, 637);
        ctx.lineTo(cx + dx, 647);
        ctx.stroke();
      }
      ctx.restore();
    }
    // ── แขนท่อนล่างซ้าย: พับมาอยู่หน้าพุง มีเส้นของตัวเอง เว้นช่วงที่ซ้อนแขนท่อนบน (ศอกกลืนกัน) ──
    // แมวลาย (สามสี/วิเชียรมาศ): จำภาพแขนท่อนบนไว้ก่อน แล้วเกลี่ยกลับทับรอยต่อศอกแบบไล่จาง — ไม่เห็นเส้นแบ่งสีเลย (ผู้ใช้ทัก 15 ต.ค.)
    const elbowBlend = marks && !OUT?.armCover && !OUT?.shirt ? fadeLayer(ctx) : null;
    if (elbowBlend) elbowBlend.drawImage(ctx.canvas, 0, 0);
    const outUp = new Path2D();
    outUp.rect(-600, -600, 1800, 2000);
    outUp.addPath(bandUpL.path);
    const m1 = ctx.getTransform();
    // ลงสีเนื้อแขนท่อนล่างเต็มท่อนก่อน — ขอบตัด (evenodd) ตรงศอกเหลือรอยขอบจาง ๆ เป็นช่องโหว่สีอ่อน
    ctx.save();
    grow(ctx);
    // วิเชียรมาศ: พื้นรองเฉพาะใต้ศอก — ส่วนเหนือศอกทับปลายแขนท่อนบนที่มีเงาพ่นเข้ม เห็นเป็นสามเหลี่ยมสีอ่อน (ผู้ใช้ทัก)
    if (marks && !OUT?.armCover) {
      const r = new Path2D();
      r.rect(-600, bandLoL.pts[0].y, 1800, 2000);
      ctx.clip(r);
    }
    ctx.fillStyle = armCol(ctx);
    ctx.fill(bandLoL.path);
    if (art.calico && !OUT?.armCover) {   // แมวสามสี: พื้นรองก็เป็นสีขนส้มเหมือนแขน (ไม่งั้นพื้นขาวโผล่ตรงรอยต่อศอก)
      ctx.clip(bandLoL.path);
      // สีรองพื้นอ่อนกว่าปื้นจริงนิด (ปื้นจริงโดนไฮไลต์ของขนทาทับ) — มุมที่โผล่ตรงศอกจึงกลืนกับแขน
      calicoBand(ctx, bandLoL, [[0, bandLoL.N, 'o']], { ...art.calico, o: mix(art.calico.o, '#FFF3E8', 0.45) });
    }
    ctx.restore();
    const pl = pawOf(bandLoL, pal, 28, 22);
    const allL = new Path2D();
    allL.addPath(bandLoL.path);
    // ศอกมน: วงกลมขนาดเท่าปลายแขนท่อนบน (เส้นศอกทับเส้นเดิมพอดี ไม่ซ้อนหนา)
    const elbowCap = new Path2D();
    elbowCap.arc(bandLoL.pts[0].x, bandLoL.pts[0].y, bandUpL.half(bandUpL.N), 0, TAU, true);   // ทวนเข็มเหมือนแถบแขน — วนกลับทิศกันแล้วส่วนซ้อนหักล้าง (ลายจุดสีขนโผล่ตรงศอก)
    allL.addPath(pl.blob);
    allL.addPath(elbowCap);
    const elbowY = bandLoL.pts[0].y;
    // แมวลาย: วาดแขนท่อนล่างรอบเดียวไม่ตัด (ไม่มีขอบตัดให้เห็นเป็นเส้น) แล้วค่อยคืนภาพแขนท่อนบนทับ (elbowBlend ข้างล่าง)
    for (const below of elbowBlend ? [null] : [true, false]) {
      ctx.save();
      grow(ctx);
      if (below === null) { /* ไม่ตัด */ } else if (below) {
        const r = new Path2D();
        r.rect(-600, elbowY, 1800, 2000);
        ctx.clip(r);
      } else {
        const r = new Path2D();
        // ซ้อนกับช่วงล่างนิดนึง กันรอยต่อขอบจาง · แมวสามสี: ไม่ซ้อน (แถบที่ซ้อนโดนไฮไลต์สองรอบ สว่างเป็นเส้นบนแขนสีส้ม)
        r.rect(-600, -600, 1800, elbowY + (art.calico ? 600.6 : 602));
        ctx.clip(r);
        ctx.clip(outUp, 'evenodd');
      }
      ctx.setTransform(m1);
      drawLayer(ctx, [{ small: true, sil: [bandLoL.path, pl.blob, elbowCap], all: allL, xf: grow, patch: OUT?.armCover || !marks ? null : art.points ? (c) => {
        pointsTip(c, bandLoL, art.points);
      } : (c) => {   // แขนท่อนล่าง+ข้อศอก: ส้มเต็มท่อน (อุ้งเท้าครีมวาดทับทีหลัง)
        calicoBand(c, bandLoL, [[0, bandLoL.N, 'o']], art.calico);
        c.fillStyle = art.calico.o;
        c.fill(elbowCap);
      }, det: (c) => {
        if (OUT?.armCover) {
          c.fillStyle = armCol(c);
          c.fill(bandLoL.path);
          c.fill(elbowCap);
        } else if (!opt.noStripes) {
          const q = bandLoL.pts[3], nx = -Math.sin(q.a), ny = Math.cos(q.a);
          sitStripes(c, pal, [[q.x + nx * 17, q.y + ny * 17, q.x + nx * 4, q.y + ny * 4]]);
        }
        pl.det(c, allL);
      } }], pal, hooks, opt);
      ctx.restore();
    }
    if (elbowBlend) {
      // ภาพแขนท่อนบน (ก่อนวาดแขนท่อนล่าง) คืนทับในเนื้อแขนท่อนบน
      const mE = ctx.getTransform();
      const E = elbowBlend;
      E.save();
      E.setTransform(mE);
      grow(E);
      E.globalCompositeOperation = 'destination-in';
      // เหนือศอก = แขนท่อนบนเต็ม (บังข้อศอกของแขนท่อนล่าง) · ใต้ศอกไล่จางหายใน ~18 หน่วย
      const g = E.createLinearGradient(0, elbowY, 0, elbowY + 18);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      E.fillStyle = g;
      E.fillRect(-2000, -2000, 5000, 5000);
      E.restore();
      ctx.save();
      grow(ctx);
      ctx.clip(bandUpL.path);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(E.canvas, 0, 0);
      ctx.restore();
    }
    // วิเชียรมาศ / เกลี่ยศอกแล้ว: ไม่ทาแถบกลบรอยศอก — แถบสีเรียบโผล่เป็นแถบ/สามเหลี่ยมสีอ่อน (ผู้ใช้ทัก)
    if (!art.points && !elbowBlend) {
      // รอยต่อสองช่วง (เหนือ/ใต้ศอก) เหลือเส้นขนจาง ๆ — ลงสีเนื้อทับแถบบาง ๆ ในวงศอก
      ctx.save();
      grow(ctx);
      const seam = new Path2D();
      seam.rect(-600, elbowY - 3, 600 + bandLoL.pts[0].x + 34, 6);   // เฉพาะแถวศอก ไม่ไปทับเส้นอุ้งเท้า
      ctx.clip(seam);
      // แมวสามสี: แขนช่วงนี้เป็นสีส้ม (อ่อนนิดให้กลืนกับไฮไลต์ของขน) — ทาสีพื้นขาวแล้วเป็นแถบขาวคาดศอก
      ctx.fillStyle = art.calico && !OUT?.armCover ? mix(art.calico.o, '#FFF3E8', 0.45) : armCol(ctx);
      ctx.beginPath();
      ctx.arc(bandLoL.pts[0].x, bandLoL.pts[0].y, bandUpL.half(bandUpL.N) - 1, 0, TAU);
      ctx.fill();
      ctx.fill(bandLoL.path);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    grow(ctx);
    // รอยเกาบนพุง (ขีดสั้น ๆ ข้างอุ้งเท้าตอนกำลังเกา)
    if (sc2 > 0.5 && Math.abs(rub) > 0.25) {
      ctx.strokeStyle = pal.line;
      ctx.globalAlpha = Math.min(1, Math.abs(rub) * 1.4);
      ctx.lineWidth = 3 * LINE_K;
      ctx.lineCap = 'round';
      const t8 = bandLoL.pts[8];
      const sx0 = t8.x + 30, sy0 = t8.y - 4;
      for (const [dx, dy] of [[0, 0], [9, 6]]) {
        ctx.beginPath();
        ctx.moveTo(sx0 + dx, sy0 + dy);
        ctx.quadraticCurveTo(sx0 + dx + 6, sy0 + dy + 4, sx0 + dx + 5, sy0 + dy + 11);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    drawHeadLayers();
    ctx.save();
    face(ctx);
    drawFace();
    drawEyewear();
    ctx.restore();
    drawFront();
    ctx.restore();
    return;
  }

  // ── ชิ้นส่วนเฟรมนี้ ──
  const wagOff = shape?.wag != null ? shape.wag * k : 0;
  const tailBase = back
    ? { x: 318, y: 584 + drop * 0.9, a: -0.15, curl: -1 }   // ด้านหลัง: จากก้นพาดไปทางขวาแล้วม้วนขึ้น (ตามชีท Back)
    : shape?.tailBase ? { curl: 1, ...shape.tailBase }   // ท่าวิ่งสี่จังหวะ: โคนหางตามภาพแบบ
    : { x: 252, y: 575 + drop * 0.9, a: Math.PI * 1.04 + sway * 2, curl: 1 };
  // ด้านหลัง (ตามชีท Back): หางยาวพาดออกจากก้นไปทางขวาเกือบแนวนอน ปลายยกขึ้นนิด แกว่งเบา ๆ
  const BL = tailLife(T);
  const bw = BL.lag * 9 + BL.flick * 6 + BL.swishLag * 13 + wagOff * 12;
  const TG = back
    ? spineBand([[302, 540 + drop * 0.9], [384, 550 + drop * 0.9], [466, 544 + drop * 0.9],
      [532 + bw * 0.3, 518 + drop * 0.9 - bw * 0.2], [560 + bw * 0.6, 478 + drop * 0.9 - bw * 0.4], [548 + bw, 444 + drop * 0.9 - bw * 0.5]],
    16, (i) => TAIL_HALF(i))
    : tailGeom(T, 1 - k * 0.5, tailBase, wagOff, tailShort);
  const tail = { sil: [TG.path], all: TG.path, det: (c) => tailDetails(c, TG, pal, opt), patch: calPatch.tail(TG) };
  const fatX = 1 + 0.08 * (back ? 0 : ease(clamp01((knead - 0.4) / 0.6)));
  // ป้อมเฉพาะช่วงอก-พุง ไหล่ไม่ขยาย (มุมไหล่จะได้ไม่โผล่พ้นแขนท่อนบน)
  const torsoPt = (x, y) => {
    const f = fatX - 1;            // 0 = ท่ายืนปกติ … 0.08 = ถือหัวใจเต็มที่
    const d = x - 300, ad = Math.abs(d);
    // ไหล่มน: มุมไหล่ดึงเข้าใน+ลงล่าง (โค้งรับหัว ไม่เป็นเหลี่ยม)
    const sh = ease(clamp01((446 - y) / 56)) * ease(clamp01((ad - 50) / 50)) * (f / 0.08);
    // ข้างตัวป่องช่วงอก-พุง
    // ป่องเฉพาะอก-พุง แล้วคืนทรงเดิมก่อนถึงสะโพก (ต่อกับขาพอดี เส้นข้างตัวไม่เหลื่อม)
    const belly = clamp01((y - 430) / 50) * (1 - clamp01((y - 492) / 40));
    const X = 300 + d * (1 + f * belly * 1.4) - Math.sign(d) * sh * 16;
    return upperPt(X, y - sh * 3);
  };
  let torso = bent('torso', torsoPt);
  const armL = bent('arm-left', armPt('left', armAngles('left')));
  const armR = bent('arm-right', armPt('right', armAngles('right')));
  // ถือหัวใจ/กอด: แขนเป็นแถบโค้ง (ท่อนบนกลืนกับตัว ท่อนล่างพับมาหน้าอก) แทนแขนจากไฟล์
  // ครึ่งแรกของการยกใช้แขนจากไฟล์ (พับเข้าหาอกอยู่แล้ว) แล้วสลับเป็นแขนพับตอนกำลังยกเร็ว ๆ
  const holdK = back ? 0 : clamp01(knead);
  const useHold = holdK > 0.4;
  let hold = null;
  if (useHold) {
    const u = ease(clamp01((holdK - 0.4) / 0.6));
    const lift = offer * 22;   // ยื่นหัวใจ: มือเลื่อนลงมาข้างหน้านิด
    const mk = (side) => {
      const m = side === 'right';
      const mp = (a) => (m ? mirrorPts(a) : a);
      const kn = (m ? -1 : 1) * kneadT * 4 * (1 - clasp);   // นวดสลับ (ท่ากอดไม่มีหัวใจ)
      const H = mp(HOLD_ARM.loHold).map(([x, y], i) => [x, y + (i ? lift * (i / 3) + kn : 0)]);
      const lo = mixPts(mp(HOLD_ARM.loRest), [[H, u], [mp(HOLD_ARM.loGrip), u * v('grip')]]).map(([x, y]) => upperPt(x, y));
      // ศอกอวบ เรียวลงหาข้อมือ แล้วอุ้งเท้าป่องนิด ๆ
      const bLo = spineBand(lo, 10, (i) => 29 - 7 * (i / 10));
      const pw = pawOf(bLo, pal, 25, 24);
      const cap = new Path2D();
      cap.arc(bLo.pts[0].x, bLo.pts[0].y, bLo.half(0), 0, TAU, true);
      const all = new Path2D();
      all.addPath(bLo.path);
      all.addPath(pw.blob);
      all.addPath(cap);
      return { bLo, pw, cap, all };
    };
    hold = { L: mk('left'), R: mk('right') };
  }
  // ลอยเฟี้ยว: แขนขวาเป็นท่ออวบ (ศอกยื่นข้างเอว → อุ้งเท้าครีมแตะใต้คาง) แทนแขนจากไฟล์ที่พับแล้วดูลีบ
  // ครึ่งแรกของการยกใช้แขนจากไฟล์ (IK ไปหาคาง) แล้วสลับเป็นท่อตอนกำลังยกเร็ว ๆ แบบแขนถือหัวใจ
  const chinK = back || useHold ? 0 : v('chinR');
  const useChin = chinK > 0.4;
  let chin = null;
  if (useChin) {
    const u = ease(clamp01((chinK - 0.4) / 0.6));
    const lo = mixPts(CHIN_ARM.rest, [[CHIN_ARM.chin, u]]).map(([x, y]) => upperPt(x, y));
    const bLo = spineBand(lo, 10, (i) => 30 - 6 * (i / 10));
    const pw = pawOf(bLo, pal, 26, 24);
    const cap = new Path2D();
    cap.arc(bLo.pts[0].x, bLo.pts[0].y, bLo.half(0), 0, TAU, true);
    const all = new Path2D();
    all.addPath(bLo.path);
    all.addPath(pw.blob);
    all.addPath(cap);
    // ไหล่มน (ก้อนกลมกลืนกับตัว) — แขนจากไฟล์ถูกถอดออกแล้ว ไหล่จึงไม่เหลี่ยม
    const sh = new Path2D();
    const [scx, scy] = upperPt(362, 432);
    sh.ellipse(scx, scy, 38, 36, 0, 0, TAU);
    chin = { bLo, pw, cap, all, sh };
  }
  const armItems = useHold
    ? [-1, 1].map((d) => {
      // ไหล่มน: แขนไม่ได้บังมุมไหล่แล้ว เติมก้อนกลมให้ไหล่โค้งแบบในแบบ (กลืนกับตัว)
      const sh = new Path2D();
      const [cx, cy] = upperPt(300 + d * 62, 428);
      sh.ellipse(cx, cy, 38, 36, 0, 0, TAU);
      return { sil: [sh], all: sh, det: () => {} };
    })
    : useChin ? [armL, { sil: [chin.sh], all: chin.sh, det: () => {} }] : [armL, armR];
  // ── ขาวิ่ง (ท่าวิ่งในด่าน · cat2-run.js): ขาจากแบบห้อยใต้ตัวก้าวกว้างไม่ได้ → วาดขาใหม่จากสะโพก
  //    ก้าวไปหน้า/ถีบไปหลังเอง (ผู้ใช้ 16 ต.ค.: "ใช้ตัวแมวอันเก่า แต่วาดขาให้วิ่งไปข้างหน้าข้างหลังเอง")
  //    runLegs.{left,right} = { dx หน้า(+)/หลัง(−) จากสะโพก · up สูงจากพื้น · toe เชิดปลายเท้า } หน่วยไฟล์ (มองจากด้านข้าง หันขวา)
  const runLegs = !back && shape?.runLegs ? shape.runLegs : null;
  const runLeg = (side) => {
    // ทรงขาแบบท่ายืนในแบบ (ผู้ใช้ 16 ต.ค.): ต้นขากว้างกลืนกับข้างตัว เรียวลงถึงข้อเท้า อุ้งเท้าขาวรีชี้ไปทางที่วิ่ง (ขวา)
    // ขาสองข้างแยกกัน = มีโค้งเป้า ∩ ระหว่างขาเองแบบในแบบ · ทั้งหมดเป็นชิ้นเดียว (ต้นขา-ขา-เท้า) เส้นรอบนอกเส้นเดียวกับตัว
    const g = runLegs[side];
    const hp = M.piv[`hip-${side}`];
    const L = side === 'left';
    const [hx, hy] = upperPt(hp.x + (L ? -2 : 2), hp.y);
    const ax = hx + g.dx, ay = FEET_Y - 26 - g.up;             // ข้อเท้า
    const len = Math.hypot(ax - hx, ay - hy) || 1;
    const bend = Math.max(0, 1 - len / 84) * 12;
    const kx = (hx + ax) / 2 + bend, ky = (hy + ay) / 2;
    // ครึ่งความกว้าง: ต้นขา 56 (ชนข้างตัวพอดี) → ข้อเท้า 25
    const B = spineBand([[hx, hy - 36], [hx, hy], [kx, ky], [ax, ay]], 16, (i) => {
      const u = i / 16;
      return 25 + 31 * Math.pow(1 - u, 1.6);
    });
    const ta = -(g.toe || 0) * 0.8;
    const foot = new Path2D();
    const fcx = ax + 12 * Math.cos(ta) + 2, fcy = ay + 10 + 12 * Math.sin(ta);
    foot.ellipse(fcx, fcy, 32, 17, ta, 0, TAU);
    const all = new Path2D(); all.addPath(B.path); all.addPath(foot);
    return {
      sil: [B.path, foot], all, uni: all,
      det: (c) => {
        c.save();
        c.clip(all);
        c.fillStyle = pal.paw || pal.cream;
        c.fill(foot);
        // ลายขวางต้นขาด้านนอก (แบบลายขาในแบบ)
        if (!opt.noStripes) {
          c.strokeStyle = pal.stripe;
          c.lineWidth = 5 * (opt.stripeK ?? 1);
          c.globalAlpha = 0.75 * (opt.stripeA ?? 1);
          c.lineCap = 'round';
          for (const k of [0.32, 0.48]) {
            const q = B.pts[Math.round(k * B.N)], h = B.half(Math.round(k * B.N));
            const o = L ? 1 : -1, nx = -Math.sin(q.a) * o, ny = Math.cos(q.a) * o;
            c.beginPath();
            c.moveTo(q.x + nx * (h + 2), q.y + ny * (h + 2));
            c.lineTo(q.x + nx * (h - 16), q.y + ny * (h - 16) - 3);
            c.stroke();
          }
        }
        c.restore();
      },
    };
  };
  let legL = runLegs ? runLeg('left') : bent('leg-left', legPt('left'));
  let legR = runLegs ? runLeg('right') : bent('leg-right', legPt('right'));
  // ── ท่าวิ่งสี่จังหวะ (shape.runBody): ตัว+ขาเป็นรูปทรงเดียวตามภาพแบบ แทนลำตัวและขาจากไฟล์ ──
  const RB = !back && RUN_BODY[shape?.runBody] || null;
  if (RB) {
    // จุดของแบบอยู่ในพิกัดที่มองเฉียงแล้ว — ตามแค่การเอียง/ยุบของตัวบน (upperPt ที่ x 300) ไม่บีบตามมุมหันซ้ำ
    // ไม่เลื่อนตามผิวทรงกระบอกตอนหัน (bodyX) — จุดของแบบเป็นภาพที่หันแล้ว เลื่อนซ้ำจะเยื้องไปขวา
    const rp = ([x, y]) => { const [X, Y] = upperPt(300, Math.min(y, 560)); return [X - bodyX(300) + x, Y + y - Math.min(y, 560)]; };
    const body = smoothLoop(RB.out.map(rp));
    const ell = ([cx, cy, rx, ry, a]) => { const e = new Path2D(); const [X, Y] = rp([cx, cy]); e.ellipse(X, Y, rx, ry, a, 0, TAU); return e; };
    const det0 = torso.det;   // ลายข้างตัว/เงาจากไฟล์ (ลายแบบเดิม — ผู้ใช้: ไม่เอาลายตามภาพแบบ)
    const det = (c) => {
      drawOps(c, det0, pal, hooks, opt);
      c.save();
      c.clip(body);
      c.fillStyle = pal.paw || pal.cream;
      for (const pw of RB.paws) c.fill(ell(pw));
      // เส้นในแบ่งขา (สีเดียวกับเส้นขอบ บางกว่า) · ร่องนิ้ว
      c.strokeStyle = pal.line;
      c.lineCap = 'round';
      c.lineWidth = LW * 0.75;
      for (const [x0, y0, cx, cy, x1, y1] of RB.creases) {
        const [a, b] = rp([x0, y0]), [m, n2] = rp([cx, cy]), [d, e] = rp([x1, y1]);
        c.beginPath(); c.moveTo(a, b); c.quadraticCurveTo(m, n2, d, e); c.stroke();
      }
      c.lineWidth = LW * 0.6;
      for (const [x, y, a] of RB.toes) {
        const [X, Y] = rp([x, y]);
        c.beginPath(); c.moveTo(X, Y); c.lineTo(X + Math.cos(a) * 9, Y + Math.sin(a) * 9); c.stroke();
      }
      c.restore();
    };
    RB.bellyPath = ell(RB.belly);
    RB.pt = (x, y) => rp([x, y]);   // ตัวดัดจุดของชุดบนตัววิ่ง (ไม่เลื่อนตามผิวทรงกระบอกซ้ำ — ตัววิ่งเป็นภาพที่หันแล้ว)
    // เส้นขวางขาของชุด (ปลายขากางเกง/ข้อเท้า) → จุดกลาง มุม ครึ่งความกว้าง · หมุนให้แกน +y ชี้ไปฝั่งเท้าเสมอ
    const seg = ([x0, y0, x1, y1, fx, fy]) => {
      const [ax, ay] = rp([x0, y0]), [bx, by] = rp([x1, y1]), [qx, qy] = rp([fx, fy]);
      const x = (ax + bx) / 2, y = (ay + by) / 2;
      let ang = Math.atan2(by - ay, bx - ax);
      if ((qx - x) * -Math.sin(ang) + (qy - y) * Math.cos(ang) < 0) ang += Math.PI;
      return { x, y, ang, hw: Math.hypot(bx - ax, by - ay) / 2 };
    };
    RB.cuffsAt = (RB.cuffs || []).map(seg);
    RB.anklesAt = RB.ankles ? { left: seg(RB.ankles.left), right: seg(RB.ankles.right) } : null;
    // เครื่องมือวาด (หน้าทดสอบวิ่ง): ส่งตัวแปลงพิกัดไฟล์ → ผ้าใบ ของตัววิ่ง ไว้แปลงจุดจากภาพแบบกลับเป็นพิกัดไฟล์ตรง ๆ
    if (idle?.onRunBody) { const [ax, ay] = rp([300, 600]); idle.onRunBody(ctx.getTransform(), ax - 300, ay - 600); }
    torso = { ...torso, sil: [body], all: body, uni: body, det, det0 };
    const none = { sil: [], all: new Path2D(), uni: new Path2D(), det: () => {} };
    legL = none;
    legR = none;
  }
  // เงาข้างตัวไหลต่อลงต้นขา (ตัดเฉพาะเหนือเท้า) — ไม่งั้นเงาถูกตัดเป็นเส้นเฉียงตรงรอยต่อตัว-ขา ดูเป็นเส้นซ้อน
  torso.detClip = new Path2D();
  // ขาวิ่งขยับไปไกล — ลายข้างตัวไม่ไหลลงขาวิ่ง (ไม่งั้นลายตัวถูกตัดเป็นขีดลอยบนขา)
  for (const L of runLegs ? [torso] : [torso, legL, legR]) torso.detClip.addPath(L.uni);   // วนทิศเดียวกัน — รวมแล้วไม่เป็นรูตรงที่ตัวทับขา
  const limbs = [legL, legR, torso, ...armItems];
  // เตะขา: ขอบล่างของขาที่เตะมาชนขอบในของขาอีกข้างเป็นรอยบากตัว V ตรงเป้า
  // เติมก้อนเนื้อมน ๆ ลงในชั้นตัว — เส้นรอบนอกวิ่งรอบก้อนรวม รอยบากจึงกลายเป็นโค้งมนต่อเนื่อง (ตามแบบ)
  const kickAny = Math.max(Math.abs(v('kickL')), Math.abs(v('kickR'))) * (raw('noCrotchFill') ? 0 : 1);
  let crotchFil = null;   // ก้อนเนื้อตรงเป้าตอนเตะขา — กางเกงต้องคลุมด้วย
  if (!back && kickAny > 0.05) {
    const fil = new Path2D();
    crotchFil = fil;
    const [fx, fy] = upperPt(300, 577);
    fil.ellipse(fx, fy, 28 * clamp01(kickAny * 3), 12 * clamp01(kickAny * 3), 0.38, 0, TAU);
    limbs.push({ sil: [fil], all: fil, det: () => {} });
  }

  // ของถือ (OUT.prop): อุ้งเท้าที่ถือ + มุมที่แขนหมุนไปจากท่าปกติ (ด้ามหมุนตามแขนครึ่งหนึ่ง ยังตั้งเกือบตรง)
  const propGrip = (side) => {
    if (!OUT?.prop) return null;
    const f0 = armPt(side, armAngles(side));
    const f = side === 'left' ? f0 : (x, y) => f0(600 - x, y);
    const [x, y] = f(116, 466), [ex, ey] = f(156, 448);
    let d = Math.atan2(y - ey, x - ex) - (side === 'left' ? Math.atan2(18, -40) : Math.atan2(18, 40));
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    return { x, y, d };
  };
  // อุ้งเท้าซ้ายไม่ว่าง (นวด ประคอง/ยื่นหัวใจ เกาพุง ยกมาเลีย) หรือกำลังนั่ง/หมอบ = ของถือลอยออกไปข้างตัว
  const propBusy = useHold ? 1 : clamp01(Math.max(Math.max(knead, clasp, offer, scratch) * 1.6, paw * 2.2, sit * 2, loaf * 2));

  // ── ชั้นตัว (กลืนเป็นก้อนเดียว) — ด้านหน้าหางอยู่หลังสุด · ด้านหลังหางอยู่หน้าสุด ──
  // ด้านหลัง: หางพาดอยู่หน้าตัว ต้องเป็นชั้นของตัวเอง (เส้นรอบหางทับตัว) — ชั้นเดียวกันแล้วเส้นหางถูกเนื้อตัวกลบหาย
  if (back) {
    drawIntro('back');   // ท่าเปิดตัวที่หมุนตัวผ่านด้านหลัง (องค์หญิงหิมะ) — เอฟเฟกต์ชั้นหลังไม่หายวาบ
    // ออร่าของชุด (behindBack): มองด้านหลังก็ยังเรืองรอบตัว
    if (OUT?.behind && OUT.behindBack) {
      ctx.save();
      OUT.behind(ctx, { ...outK, back: true, cpt: (x, y) => [x, y] });
      ctx.restore();
    }
    drawProp(propGrip('left'), 0);   // มองหลัง: หางพาดไปทางขวาจอ — ถือด้วยมือซ้ายจอ หางจึงไม่พาดทับมือ/ของถือ
    drawLayer(ctx, limbs, pal, hooks, opt);
    // ด้านหลัง: กระโปรงอยู่ใต้หาง (หางพาดทับกระโปรง)
    if (OUT?.skirt) OUT.skirt(ctx, { ...outK, back: true, pt: torsoPt, bodies: [{ clip: torso.all, pt: torsoPt }, { clip: legL.all, pt: legPt('left') }, { clip: legR.all, pt: legPt('right') }] });
    // ผ้าคลุมด้านหลัง (ชุดระดับ S) — คลุมหลังทับกระโปรง หางพาดทับผ้าคลุม
    if (OUT?.backCape) OUT.backCape(ctx, { ...outK, back: true });
    // โคนหางงอกจากก้นแบบในแบบ: ไม่มีเส้นปิดโคน — ตัดชั้นหางรอบจุดโคนออก เส้นข้างหางจึงไหลออกมาจากตัว
    const b0 = TG.pts[0];
    ctx.save();
    const noRoot = new Path2D();
    noRoot.rect(-600, -600, 1800, 2000);
    noRoot.arc(b0.x, b0.y, TG.half(0) + LW * 1.6, 0, TAU, true);
    ctx.clip(noRoot, 'evenodd');
    // ไม่พ่นเงาขอบที่หาง — ตรงโคนจะได้สีเดียวกับก้นที่อยู่ข้างหลัง ไม่เห็นรอยต่อสี
    drawLayer(ctx, [{ ...tail, small: true }], pal, hooks, { ...opt, noAirbrush: true });
    ctx.restore();
    drawTailBow(TG, 9);
    // เครื่องหมาย × ที่ก้นใต้โคนหาง (ตามชีท Back) — ใส่กระโปรงอยู่ = ก้นถูกคลุม ไม่วาด
    ctx.save();
    if (OUT?.skirt) ctx.globalAlpha = 0;
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 3.4 * LINE_K;
    ctx.lineCap = 'round';
    // × บนก้นใต้โคนหาง — ต้องอยู่ในเนื้อตัว (ต่ำกว่านี้ตกลงช่องระหว่างขา)
    const bx = 300, by = 563 + drop * 0.9;   // ใต้โคนหางพอดี (หางทั้งลำอยู่เหนือ ×)
    ctx.beginPath();
    ctx.moveTo(bx - 6, by - 6); ctx.lineTo(bx + 6, by + 6);
    ctx.moveTo(bx + 6, by - 6); ctx.lineTo(bx - 6, by + 6);
    ctx.stroke();
    ctx.restore();
  } else {
    drawIntro('back');
    drawBehind();
    // โบว์หาง: เลือกจุดบนหางที่ไม่อยู่หลังตัว/ขา/แขน (หางส่ายไปมา)
    const tailBowFront = () => {
      if (!OUT?.tailBow) return;
      const hc = hitCtx();
      const solid = [torso.all, legL.all, legR.all, ...armItems.map((it) => it.all)];
      const i = [10, 11, 9, 12, 8, 13].find((j) => !solid.some((q) => hc.isPointInPath(q, TG.pts[j].x, TG.pts[j].y)));
      if (i != null) drawTailBow(TG, i);
    };
    if (OUT?.prop) {
      // มีของถือ: หางอยู่หลังมือกับของถือเสมอ (ผู้ใช้กำหนด) — หาง + โบว์หางเป็นชั้นแยกก่อน → ของถือ → ตัว (อุ้งเท้ากำด้าม)
      // โบว์หางจึงไม่ทับมือ/ของถือ · ตัววาดทีหลังหาง เส้นสะโพกพาดทับโคนหาง (หางอยู่หลังตัว)
      drawLayer(ctx, [tail], pal, hooks, opt);
      tailBowFront();
      drawProp(propGrip('left'), propBusy);
      drawLayer(ctx, limbs, pal, hooks, opt);
    } else {
      drawLayer(ctx, [tail, ...limbs], pal, hooks, opt);
      tailBowFront();
    }
  }
  // ของพันข้อเท้า (ผ้าฟู): ตามขาแต่ละข้างผ่านตัวดัดจุดของขา
  // ตัววิ่งสี่จังหวะ: ของพันข้อเท้าย้ายไปข้อเท้าของขาวิ่ง (ankleAt = จุดกลาง/มุม/ความกว้างขา)
  if (OUT?.ankle) for (const side of ['left', 'right']) OUT.ankle(ctx, { ...outK, back, side, pt: legPt(side), ankleAt: RB?.anklesAt?.[side] || null });
  // ลายข้างตัวขวาเส้นล่าง: วาดทับหลังชั้นตัว ตัดแค่ในลำตัว (ตอนแขนไม่ได้พาดหน้าตัว) — ซ้ายขวามีสองเส้นเท่ากัน
  if (!back && !useHold && Math.max(knead, scratch, clasp, offer, reachL) < 0.05) {
    const st = findOp(torso.det0 || torso.det, 'Vector_10');
    if (st) {
      ctx.save();
      ctx.clip(torso.all);
      drawOps(ctx, [st], pal, {}, opt);
      ctx.restore();
    }
  }

  // แขนที่พับมาไว้หน้าตัว (เกาพุง ประกบอก) ต้องมีเส้นขอบของตัวเองทับตัว
  // วาดแขนซ้ำเป็นชั้นของมันเอง เว้นโคนแขนไว้ ไหล่จึงยังกลืนกับตัว
  const frontArm = (side, it, full = false) => {
    ctx.save();
    const hole = new Path2D();
    hole.rect(-600, -600, 1800, 2000);
    const poly = ARM_ROOT[side].map(([px, py]) => upperPt(px, py));
    hole.moveTo(...poly[0]);
    for (const q of poly.slice(1)) hole.lineTo(...q);
    hole.closePath();
    ctx.clip(hole, 'evenodd');
    if (full) {
      // แขนยกขึ้นหน้าหัว: วาดซ้ำเฉพาะส่วนที่ทับหัว — ส่วนที่อยู่บนตัวได้สี/เงาไปแล้วในชั้นตัว
      // (วาดซ้ำทั้งแขน = แขนสีเรียบทับตัวที่พ่นเงาไว้ เห็นเป็นรอยแบ่งโทนชัด)
      const m0 = ctx.getTransform();
      head(ctx);
      const hc = new Path2D();
      hc.addPath(M.headShaped.all);
      for (const sd of ['left', 'right']) for (const q of P[`ear-${sd}`].sil) hc.addPath(q);
      ctx.clip(hc);
      ctx.setTransform(m0);
      drawLayer(ctx, [{ ...it, small: true }], pal, hooks, opt);
    } else {
      // แขนอยู่บนตัว: เนื้อ/สี/เงาได้ไปแล้วตอนอยู่ในชั้นตัว — วาดแค่เส้นขอบแขนทับตัว
      // (เคยวาดเนื้อซ้ำ = ทับเงาขอบกับเงาใต้คางที่พ่นไว้ แขนเลยสว่างกว่าตัว เห็นเป็นรอยแบ่งตรงไหล่)
      // เส้นหนา 2 เท่าแต่เหลือแค่ครึ่งนอก (ตัดเนื้อแขนออก) = แนวเดียวกับเส้นรอบตัวพอดี ไม่มีขั้นที่ไหล่
      it.xf?.(ctx);
      const outArm = new Path2D();
      outArm.rect(-600, -600, 1800, 2000);
      outArm.addPath(it.all);
      ctx.clip(outArm, 'evenodd');
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = LW * 2;
      ctx.lineJoin = 'round';
      for (const q of it.sil) ctx.stroke(q);
    }
    ctx.restore();
  };
  // แขนที่ยกขึ้นข้างหน้า (โบกมือ / ยกอุ้งเท้ามาเลีย) อยู่หน้าหัว วาดหลังหัว
  const raisedL = paw > 0.3, raisedR = wave > 0.3 || (v('chinR') > 0.3 && !useChin);

  let shirtArms = [];
  if (!back) {
    if (!RB) {
      ctx.save();
      upper(ctx);
      drawOps(ctx, P.belly.det, pal, hooks, opt);
      ctx.restore();
    } else if (RB.bellyPath) {
      // ตัววิ่งสี่จังหวะ: พุงวาดหลังชั้นตัว (แขนในชั้นเดียวกันไม่บังพุง) ตัดในตัว
      ctx.save();
      ctx.clip(torso.all);
      ctx.fillStyle = pal.cream;
      ctx.fill(RB.bellyPath);
      ctx.restore();
    }
    if (OUT?.shirt) {
      // แขนเสื้อใส่เฉพาะแขนจากไฟล์ที่ไม่ได้ยก (แขนท่อของท่าถือหัวใจ/เท้าคางวาดแยกทีหลัง)
      const arms = [];
      if (!useHold) {
        if (!raisedL) arms.push({ path: armL.all, pt: armPt('left', armAngles('left')) });
        if (!raisedR && !useChin) arms.push({ path: armR.all, pt: (x, y) => armPt('right', armAngles('right'))(600 - x, y) });
        // แขนที่ยก: แขนเสื้อสั้นลง (ทั้งแขนโผล่พ้นตัว) · วาดก่อนปกกับหัว ปกจึงทับโคนแขนเสื้อพอดี ไม่มีรอยต่อ
        if (raisedL) arms.push({ path: armL.all, pt: armPt('left', armAngles('left')), cuff: 156 });
        if (raisedR) arms.push({ path: armR.all, pt: (x, y) => armPt('right', armAngles('right'))(600 - x, y), cuff: 156 });
      }
      OUT.shirt(ctx, { ...outK, body: torso.all, pt: torsoPt, arms: [] });
      shirtArms = arms;
    }
    if (useHold) {
      // (แขนกับหัวใจวาดหลังหน้า — อุ้งเท้าแตะใต้คาง ต้องอยู่หน้าหัว)
    } else {
      if (!raisedL) frontArm('left', armL);
      if (!raisedR && !useChin) frontArm('right', armR);
    }
    // แขนเสื้อ: หลังวาดแขนซ้ำ (ไม่งั้นแขนบังแขนเสื้อ)
    if (shirtArms.length) OUT.shirt(ctx, { ...outK, arms: shirtArms, sleevesOnly: true });
  }

  if (OUT?.shirt && back) {
    OUT.shirt(ctx, { ...outK, back, body: torso.all, pt: torsoPt, arms: [] });
    OUT.shirt(ctx, { ...outK, back, sleevesOnly: true, arms: [
      { path: armL.all, pt: armPt('left', armAngles('left')) },
      { path: armR.all, pt: (x, y) => armPt('right', armAngles('right'))(600 - x, y) },
    ] });
  }
  // กระโปรง/เสื้อของชุด (ท่ายืน): ทับตัวกับแขน ใต้หัว
  // ตัวป้อมขึ้นตอนถือหัวใจ (fatX) — กระโปรงบานตามตัว
  // ถือ/รับหัวใจ: ตัวป้อมแค่ช่วงอก — กระโปรงแนบตัวตาม (ไม่บานเพิ่ม) และชายบานน้อยลงเพราะแขนพับหน้าตัว
  // ลำตัวป้อมไม่เท่ากันทั้งตัว (เฉพาะช่วงอก-เอว) — ถ้ากระโปรงดัดตามนั้นตรง ๆ ขอบบนจะกว้าง ชายแคบ = ทรงกล่องแข็ง
  // จึงขยายกระโปรงทั้งผืนเท่ากันตามความกว้างที่เอว ทรงระฆังเดิมจึงคงอยู่ แค่ใหญ่ขึ้นพอดีตัว
  const skF = fatX - 1;
  const bel = (y) => clamp01((y - 430) / 50) * (1 - clamp01((y - 492) / 40));
  const skirtPt = (x, y) => torsoPt(300 + (x - 300) * (1 + skF * 1.4) / (1 + skF * 1.4 * bel(y)), y);
  if (OUT?.skirt && !back) {
    const parts = [{ clip: torso.all, pt: skirtPt }, { clip: legL.all, pt: legPt('left') }, { clip: legR.all, pt: legPt('right') }];
    if (crotchFil) parts.push({ clip: crotchFil, pt: skirtPt });
    // ตัววิ่งสี่จังหวะ: กางเกงขาสั้นตัดปลายขาตามขาแต่ละข้าง (run.cuffs) — กระโปรงไม่ใช้ช่องนี้ (ทรงบานคลุมขาอยู่แล้ว)
    // ตัววิ่ง: กระโปรง/กางเกงใช้ตัวดัดจุดของตัววิ่ง (RB.pt) — ตัวดัดท่ายืนเลื่อนตามมุมหัน ชุดจึงเยื้องออกจากเอว (ผู้ใช้ทักชุดพยาบาล)
    // กระโปรงบนตัววิ่ง: ชายผ้าถูกขาดันยกตามทิศที่ขาก้าว (ผู้ใช้ 17 ต.ค. "กระโปรงเปลี่ยนตามรอยผ้าที่ยกขา")
    //   แรงเพิ่มจากเอว (0) ถึงชาย (เต็ม) · ฝั่งซ้ายจอตามขาหลัง ฝั่งขวาจอตามขาหน้า ผสมนุ่มตรงกลาง — กางเกง (pants) ใช้ตัวดัดตรง
    const push = RB?.skirtPush;
    const runSkirtPt = RB && push && !OUT.pants ? (x, y) => {
      const wy = clamp01((y - 500) / 95) ** 1.3;
      if (!wy) return RB.pt(x, y);
      const wl = ease(clamp01((330 - x) / 150)), wr = ease(clamp01((x - 270) / 150));
      return RB.pt(x + (push.L[0] * wl + push.R[0] * wr) * wy, y + (push.L[1] * wl + push.R[1] * wr) * wy);
    } : RB?.pt;
    if (RB) for (const q of parts) q.pt = runSkirtPt;
    OUT.skirt(ctx, { ...outK, back, hold: clamp01(skF / 0.08), pt: RB ? runSkirtPt : skirtPt, bodies: parts, run: RB ? { body: torso.all, cuffs: RB.cuffsAt, span: (y) => runBodySpan(RB.out, y) } : null });
  }
  // เงาหัวตกบนอก (พ่นสีใต้คาง ตามชีท)
  if (!back && airbrushOn()) castShade(ctx, [{ sil: M.headShaped.sil, xf: head }], limbs, OUT?.shirt ? OUT.chinShade || 'rgba(70,45,35,.16)' : shadeRgba(pal, 0.85), 26, 18);   // ใส่เสื้อ: เงากลาง ไม่ใช่ส้มขนทับเสื้อ
  // ── ชั้นหัว: หู + หัว (เส้นคางคั่นกับตัวตามแบบ) แล้วหน้า/หนวด ──
  drawHeadLayers();
  ctx.save();
  if (back) {
    head(ctx);
    drawOps(ctx, P.whiskers.det, pal, hooks, opt);
  } else {
    face(ctx);
    drawFace();
    drawEyewear();
  }
  ctx.restore();

  if (!back && !useHold) {
    if (raisedL) frontArm('left', armL, true);
    if (raisedR) frontArm('right', armR, true);
  }
  if (useChin) {
    // แขนเท้าคางวาดหลังหัว อุ้งเท้าจึงแตะคางอยู่หน้าหน้า — ท่อเดียวมีเส้นรอบครบ หนาเท่ากันตลอด
    const H = chin;
    drawLayer(ctx, [{ small: true, sil: [H.bLo.path, H.pw.blob, H.cap], all: H.all, patch: calPatch.arm(H.bLo), det: (c) => {
      c.strokeStyle = flatShade(pal);
      c.lineWidth = 12;
      c.lineCap = 'round';
      c.stroke(bandEdge(H.bLo, -innerSide(H.bLo), 0, 8));
      if (!opt.noStripes) {
        const st = [];
        for (const i of [3, 5]) {
          const q = H.bLo.pts[i], nx = -Math.sin(q.a), ny = Math.cos(q.a);
          st.push([q.x + nx * 19, q.y + ny * 19, q.x + nx * 6, q.y + ny * 6]);
        }
        sitStripes(c, pal, st);
      }
      H.pw.det(c, H.all);
    } }], pal, hooks, opt);
    if (typeof OUT?.sitSleeve === 'function') OUT.sitSleeve(ctx, H.bLo, 3, pal);   // แขนเสื้อพองตามท่อแขน
  }
  if (useHold) {
    // หัวใจวาดก่อน อุ้งเท้าสองข้างทับขอบหัวใจ = ประคองไว้ ไม่ใช่ถือแปะหน้า
    const tl0 = hold.L.bLo.pts[10], tr0 = hold.R.bLo.pts[10];
    const hx0 = (tl0.x + tr0.x) / 2, hy0 = (tl0.y + tr0.y) / 2 + 50;
    const hs = 40 * ease(clamp01(clasp * 1.4)) * (1 + 0.25 * offer);
    // idle.onHoldTips = ขอตำแหน่งปลายแขนสองข้าง (x, y, a พิกัดไฟล์) — ฉากกาช่าใช้ตัดอุ้งเท้าจริงไปแปะเกาะขอบ
    idle?.onHoldTips?.(ctx, tl0, tr0, 25 + LW);
    // แขนสองข้างเป็นท่อเดียวต่อเส้น มีเส้นรอบครบ หนาเท่ากันตลอด · อุ้งเท้าครีมแตะใต้คาง
    for (const H of [hold.L, hold.R]) {
      drawLayer(ctx, [{ small: true, sil: [H.bLo.path, H.pw.blob, H.cap], all: H.all, patch: calPatch.arm(H.bLo), det: (c) => {
        // เงา cel ใต้แขน (ด้านนอก) ให้แขนดูกลม — ระดับเดียว ไม่ไล่สี
        c.strokeStyle = flatShade(pal);
        c.lineWidth = 12;
        c.lineCap = 'round';
        c.stroke(bandEdge(H.bLo, -innerSide(H.bLo), 0, 8));
        if (!opt.noStripes) {
          const st = [];
          for (const i of [3, 5]) {
            const q = H.bLo.pts[i], nx = -Math.sin(q.a), ny = Math.cos(q.a);
            st.push([q.x + nx * 19, q.y + ny * 19, q.x + nx * 6, q.y + ny * 6]);
          }
          sitStripes(c, pal, st);
        }
        H.pw.det(c, H.all);
      } }], pal, hooks, opt);
      if (typeof OUT?.sitSleeve === 'function') OUT.sitSleeve(ctx, H.bLo, 3, pal);
    }
    if (clasp > 0.05) {
      // หัวใจอยู่หน้าอก ระหว่างแขน แล้วอุ้งเท้าสองข้างวาดทับขอบบนของหัวใจ = กำลังประคองไว้
      // หัวใจวาดทับแขน แต่เว้นตรงอุ้งเท้า (รวมเส้นขอบอุ้งเท้า) — อุ้งเท้าจึงอยู่หน้าหัวใจ
      ctx.save();
      const notPaw = new Path2D();
      notPaw.rect(-600, -600, 1800, 2000);
      for (const H of [hold.L, hold.R]) {
        const tp = H.bLo.pts[10];
        const ex = tp.x + Math.cos(tp.a) * 2, ey = tp.y + Math.sin(tp.a) * 2, rx = 25 + LW;
        notPaw.moveTo(ex + Math.cos(tp.a) * rx, ey + Math.sin(tp.a) * rx);   // ยกปากกา — ไม่งั้นเส้นต่อจากรูปก่อนตัดเป็นแถบเฉียง
        notPaw.ellipse(ex, ey, rx, 24 + LW, tp.a, 0, TAU);
      }
      ctx.clip(notPaw, 'evenodd');
      // idle.holdDraw = ของที่กอดแทนหัวใจ (แคปซูลกาช่าในฉากเปิดกาช่า — gacha-cine.js) · พิกัดไฟล์ออกแบบ จุดกลางระหว่างอุ้งเท้า
      if (idle?.holdDraw) idle.holdDraw(ctx, hx0, hy0, t, clasp);
      else drawHeart(ctx, hx0, hy0, hs, pal);
      ctx.restore();
      if (!idle?.holdDraw) drawSparks(ctx, hx0, hy0, 38, t, clamp01(clasp * 1.5));
    }
  }
  // หัวใจจิ๋วลอยออกไปทางขวาตอนส่งหัวใจ
  if (!back) {
    ctx.save();
    upper(ctx);
    drawFloatHearts(ctx, t, offer, pal);
    ctx.restore();
  }
  drawFront();
  ctx.restore();
}
