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
  const band = new Path2D();
  band.moveTo(208, 376);
  band.quadraticCurveTo(300, 420, 392, 376);
  band.lineTo(394, 398);
  band.quadraticCurveTo(300, 446, 206, 398);
  band.closePath();
  const lace = new Path2D();
  const N = 11;
  for (let i = 0; i <= N; i++) {
    const u = i / N, x = 214 + 172 * u, y = 396 + Math.sin(u * Math.PI) * 42;
    if (i === 0) lace.moveTo(x, y - 4);
    lace.arc(x, y + 2, 9, Math.PI, 0, true);
  }
  lace.lineTo(386, 392);
  lace.quadraticCurveTo(300, 438, 214, 392);
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
      h.rect(-2000, -2000, 5000, 5000);
      h.addPath(a.notIn);
      c.clip(h, 'evenodd');
    }
    if (a.collar?.path) {
      // ปกอยู่บนบ่า ทับโคนแขนเสื้อ — เว้นรูปปก (ขยายนิดให้พ้นเส้นขอบปก) ในพิกัดคอ
      const m = c.getTransform();
      a.collar.xf(c);
      const h = new Path2D();
      h.rect(-2000, -2000, 5000, 5000);
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
  const G = SK.G ? SK.G[sit ? 'sit' : 'stand'] : sit ? { y0: 536, y1: 634, x0: 172, x1: 428, fl: 54 }   /* นั่ง: บานคลุมสะโพก/ต้นขาข้างตัว ชายลงถึงพื้น */ : { y0: 522, y1: 592, x0: 180, x1: 420, fl: 16 };   // ยืน: เอวกว้างเท่าตัวน้องตรงนั้นพอดี
  const q = new Path2D();
  q.moveTo(...P(G.x0, G.y0));
  q.quadraticCurveTo(...P(300, G.y0 + 12), ...P(G.x1, G.y0));
  q.bezierCurveTo(...P(G.x1 + 8, G.y0 + 20), ...P(G.x1 + G.fl, G.y1 - 20), ...P(G.x1 + G.fl, G.y1));
  q.quadraticCurveTo(...P(300, G.y1 + 22), ...P(G.x0 - G.fl, G.y1));
  q.bezierCurveTo(...P(G.x0 - G.fl, G.y1 - 20), ...P(G.x0 - 8, G.y0 + 20), ...P(G.x0, G.y0));
  q.closePath();
  const [, y0] = P(300, G.y0), [, y1] = P(300, G.y1);
  const SC = SK.cols || [NURSE.light, NURSE.mid, NURSE.dark];
  softFill(c, q, 0, y0, 0, y1 + 16, SC[0], SC[1], SC[2]);
  c.save(); c.clip(q);
  c.strokeStyle = SK.hem || '#FFFFFF'; c.lineWidth = 9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(...P(G.x0 - G.fl - 10, G.y1 - 8)); c.quadraticCurveTo(...P(300, G.y1 + 14), ...P(G.x1 + G.fl + 10, G.y1 - 8)); c.stroke();
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


// ══ องค์หญิงหิมะ (ระดับ S สูงสุด): เต็มไปด้วยแสง — ออร่าฟ้าเรืองหลังตัว ผ้าคลุมน้ำแข็งโปร่งแสง ชุดราตรีน้ำแข็งยาวถึงพื้น
//    ประกายวิบวับ เกล็ดหิมะลอยวน มงกุฎคริสตัลเรืองแสง สร้อยคริสตัลเรือง · ทุกแสงขยับตามเวลา (k.t) ══
const ICEP = { light: '#F2FBFF', mid: '#BFE6FF', dark: '#7FC4F2', deep: '#4E97D6' };
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
/** หลังตัว: ออร่าเรือง + ลำแสงหมุนช้า + ผ้าคลุมน้ำแข็งโปร่งยาวถึงพื้น */
function princessBehind(c, k) {
  const t = k.t || 0;
  const pulse = 0.85 + 0.15 * Math.sin(t * 0.05);
  glowAt(c, 300, 430, 330 * pulse, '150,215,255', 0.42);
  glowAt(c, 300, 330, 190, '235,248,255', 0.35);
  // ลำแสงแผ่รอบตัวหมุนช้า ๆ
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.translate(300, 400);
  c.rotate(t * 0.004);
  for (let i = 0; i < 12; i++) {
    c.rotate(TAU / 12);
    const g = c.createLinearGradient(0, 0, 0, -360);
    g.addColorStop(0, 'rgba(200,235,255,.18)');
    g.addColorStop(1, 'rgba(200,235,255,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-8, 0); c.lineTo(-30, -360); c.lineTo(30, -360); c.lineTo(8, 0); c.closePath(); c.fill();
  }
  c.restore();
  // ผ้าคลุมน้ำแข็ง: กางจากไหล่ลงพื้น ชายเป็นคลื่น โปร่งแสง ไล่ฟ้า→ใส
  const sw = Math.sin(t * 0.04) * 6;
  const cape = new Path2D();
  cape.moveTo(206, 384);
  cape.bezierCurveTo(150, 460, 104 + sw, 560, 88 + sw, 660);
  for (let i = 0; i < 8; i++) {
    const x0 = 88 + sw + (424 / 8) * i, x1 = 88 + sw + (424 / 8) * (i + 1);
    cape.quadraticCurveTo((x0 + x1) / 2, 682, x1, 660);
  }
  cape.bezierCurveTo(496 + sw, 560, 450, 460, 394, 384);
  cape.closePath();
  const g = c.createLinearGradient(0, 380, 0, 680);
  g.addColorStop(0, 'rgba(160,215,250,.9)');
  g.addColorStop(0.6, 'rgba(190,230,255,.6)');
  g.addColorStop(1, 'rgba(235,248,255,.35)');
  c.fillStyle = g;
  c.fill(cape);
  c.save(); c.clip(cape);
  // ลายเกล็ดหิมะจาง ๆ บนผ้าคลุม + ประกายวิ่ง
  for (const [x, y, r] of [[130, 600, 16], [470, 610, 14], [160, 500, 10], [440, 490, 11], [300, 640, 12]]) snowflake(c, x, y, r, t * 0.01, 'rgba(255,255,255,.75)', 2);
  const sh = (t * 2) % 700 - 100;
  const sg = c.createLinearGradient(sh - 60, 0, sh + 60, 0);
  sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.35)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sg; c.fillRect(0, 300, 700, 400);
  c.restore();
  outline(c, cape, k.pal, OL * 0.8);
}
/** เสื้อ (ตัวชุด): ไล่ขาว→ฟ้าน้ำแข็ง แขนพองขาว ลายเกล็ดหิมะเงิน + เพชรกลางอก */
const PRINCESS_T = {
  body: [ICEP.light, ICEP.mid, ICEP.dark], cuff: '#FFFFFF', cuffLine: ICEP.dark, hem: '#FFFFFF', vneck: false, fold: 'rgba(80,140,200,.22)',
  extra(c, P, k) {
    for (const [x, y, r] of [[236, 440, 10], [364, 440, 10], [300, 492, 12]]) { const [sx, sy] = P(x, y); snowflake(c, sx, sy, r, 0.3, 'rgba(255,255,255,.9)', 2.2); }
  },
  sleeveExtra(c, Q) { for (const [x, y] of [[176, 440], [168, 480]]) { const [sx, sy] = Q(x, y); snowflake(c, sx, sy, 7, 0, 'rgba(255,255,255,.9)', 1.8); } },
};
/** ปกขนเฟอร์ขาวรอบไหล่ + สร้อยคริสตัลเรือง */
function princessNeck(c, k) {
  const pal = k.pal;
  const P = k.cpt || ((x, y) => [x, y]);
  const fur = new Path2D();
  for (let i = 0; i <= 11; i++) {
    const u = i / 11, x = 204 + 192 * u, y = 392 + Math.sin(u * Math.PI) * 34;
    const [px, py] = P(x, y);
    const r = i % 2 ? 15 : 18;
    fur.moveTo(px + r, py); fur.arc(px, py, r, 0, TAU);
  }
  c.strokeStyle = pal.line; c.lineWidth = OL * 2; c.lineJoin = 'round'; c.stroke(fur);
  const fg = c.createLinearGradient(0, 380, 0, 440);
  fg.addColorStop(0, '#FFFFFF'); fg.addColorStop(1, '#DCEFFF');
  c.fillStyle = fg; c.fill(fur);
  if (k.back) return;
  const t = k.t || 0;
  const fx = P(300, 440)[0] + (k.cpt ? (k.hxShift || 0) : (k.faceShift || 0)) * 0.5;
  // จี้คริสตัลหยดน้ำเรืองแสง (เต้นเป็นจังหวะ)
  const pulse = 0.7 + 0.3 * Math.sin(t * 0.08);
  glowAt(c, fx, 452, 46, '120,210,255', 0.75 * pulse);
  const gem = new Path2D();
  gem.moveTo(fx, 434); gem.lineTo(fx + 13, 452); gem.lineTo(fx, 476); gem.lineTo(fx - 13, 452); gem.closePath();
  const gg = c.createLinearGradient(fx - 13, 434, fx + 13, 476);
  gg.addColorStop(0, '#FFFFFF'); gg.addColorStop(0.4, '#8FDDFF'); gg.addColorStop(1, '#2F7FD6');
  c.fillStyle = gg; c.fill(gem);
  outline(c, gem, pal, OL * 0.7);
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(fx - 13, 452); c.lineTo(fx + 13, 452); c.moveTo(fx, 434); c.lineTo(fx, 476); c.stroke();
  twinkle(c, fx + 9, 440, 7, 0.5 + 0.5 * Math.sin(t * 0.13));
}
/** กระโปรงราตรียาวถึงพื้น บานกว้าง ชายระบายขาว ลายเกล็ดหิมะ ประกายวิบวับ */
const BALLGOWN = {
  cols: [ICEP.light, ICEP.mid, ICEP.dark], hem: '#FFFFFF', fold: 'rgba(80,140,200,.3)',
  G: { stand: { y0: 520, y1: 636, x0: 176, x1: 424, fl: 74 }, sit: { y0: 536, y1: 644, x0: 168, x1: 432, fl: 84 } },
  extra(c, P, G, k) {
    const t = (k && k.t) || 0;
    for (const [x, y, r] of [[226, G.y0 + 44, 13], [372, G.y0 + 60, 12], [300, G.y1 - 30, 15], [180, G.y1 - 22, 10], [420, G.y1 - 26, 10]]) {
      const [sx, sy] = P(x, y); snowflake(c, sx, sy, r, 0.2, 'rgba(255,255,255,.85)', 2.2);
    }
    // ประกายวิบวับบนผ้า (กะพริบต่างจังหวะ)
    for (let i = 0; i < 7; i++) {
      const x = 170 + ((i * 97) % 260), y = G.y0 + 20 + ((i * 53) % (G.y1 - G.y0 - 20));
      const [sx, sy] = P(x, y);
      twinkle(c, sx, sy, 6, Math.max(0, Math.sin(t * 0.09 + i * 1.7)));
    }
  },
};
/** มงกุฎคริสตัลใหญ่: ยอดน้ำแข็งแหลมเจ็ดยอด เรืองแสง เพชรฟ้ากลาง ประกายรอบ */
function princessCrown(c, k) {
  const pal = k.pal;
  const t = k.t || 0;
  c.save();
  c.translate(300, 132); c.scale(1.3, 1.3); c.translate(-300, -132);
  const pulse = 0.75 + 0.25 * Math.sin(t * 0.07);
  glowAt(c, 300, 80, 92, '170,225,255', 0.4 * pulse);   // เรืองเหนือมงกุฎ ไม่ล้นหน้าผากจนซีด
  const tips = [[236, 104, 0.5], [256, 76, 0.7], [278, 62, 0.85], [300, 40, 1], [322, 62, 0.85], [344, 76, 0.7], [364, 104, 0.5]];
  const cr = new Path2D();
  cr.moveTo(232, 132);
  tips.forEach(([x, y], i) => {
    const prevX = i ? tips[i - 1][0] : 232;
    cr.lineTo((prevX + x) / 2, i ? 100 : 118);   // ร่องตื้น — ยอดคริสตัลอวบ ไม่เป็นหนามบาง
    cr.lineTo(x, y);
  });
  cr.lineTo(368, 122);
  cr.lineTo(368, 132);
  cr.quadraticCurveTo(300, 144, 232, 132);
  cr.closePath();
  const g = c.createLinearGradient(0, 40, 0, 140);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.45, '#BFE9FF'); g.addColorStop(1, '#6FB6EA');
  c.fillStyle = g; c.fill(cr);
  // แสงสะท้อนในคริสตัล (เส้นขาวเฉียง)
  c.save(); c.clip(cr);
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3;
  for (const [x, y] of tips) { c.beginPath(); c.moveTo(x - 4, y + 10); c.lineTo(x - 10, 124); c.stroke(); }
  c.restore();
  outline(c, cr, pal);
  // แถบล่างเงิน + เพชร
  const rim = new Path2D();
  rim.moveTo(232, 120); rim.quadraticCurveTo(300, 132, 368, 120); rim.lineTo(368, 132); rim.quadraticCurveTo(300, 144, 232, 132); rim.closePath();
  softFill(c, rim, 300, 118, 300, 140, '#FFFFFF', '#D6E2F2', '#9AAACA');
  outline(c, rim, pal, OL * 0.8);
  if (!k.back) {
    glowAt(c, 300, 112, 30, '100,200,255', 0.8 * pulse);
    blueGem(c, 300, 112, 24, pal, true);
    for (const x of [262, 338]) blueGem(c, x, 126, 9, pal, false);
  }
  // ประกายบนยอดมงกุฎ (กะพริบทีละยอด)
  tips.forEach(([x, y], i) => twinkle(c, x, y - 4, 6 * tips[i][2] + 3, Math.max(0, Math.sin(t * 0.1 - i * 0.9))));
  c.restore();
  // เกล็ดหิมะ + ประกายลอยวนรอบตัว (พิกัดหัว — วนรอบหัวกับไหล่ ไม่บังหน้า)
  for (let i = 0; i < 9; i++) {
    const a = t * 0.012 + (i * TAU) / 9;
    const rx = 250, ry = 150;
    const x = 300 + Math.cos(a) * rx, y = 300 + Math.sin(a) * ry;
    const front = Math.sin(a) > 0.2 && Math.abs(x - 300) < 170;
    if (front) continue;   // ช่วงที่ผ่านหน้าตา ไม่วาด
    const fade = 0.55 + 0.45 * Math.sin(t * 0.07 + i);
    c.save(); c.globalAlpha = fade;
    if (i % 3 === 0) snowflake(c, x, y, 11, a * 2, '#FFFFFF', 2.4);
    else twinkle(c, x, y, i % 2 ? 7 : 5, 1);
    c.restore();
  }
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
  const L = (u, v) => Q(S0x + dx * u + nx * v, S0y + dy * u + ny * v);
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
function sweetSocks(c, k) {
  const pal = k.pal, t = k.t || 0;
  const P = k.pt || ((x, y) => [x, y]);
  const left = k.side === 'left';
  const [cx, cy, hw] = k.mode === 'sit' ? (left ? [264, 614, 27] : [336, 614, 27]) : (left ? [210, 606, 28] : [390, 606, 28]);
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
        + Math.sin(f * 0.21) * 0.016 * look,
      tilt: -0.34 + ktrack(f, [[P + 14, 0], [P + 20, 0.1, KE.out], [P + 28, 0.06], [P + 33, -0.06, KE.out], [P + 40, 0]])
        + Math.sin(f * 0.15) * 0.02 * look,
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
  const L = swLife(f);
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
      + Math.sin(f * 0.21) * 1.25 * kenv(f, A.pose + 4, A.pose + 14, A.orbit, A.orbit + 26),
  };
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
    rot = Math.sin((f - A.cupLand) * 0.95) * 0.09 * g;
    sy += Math.sin((f - A.cupLand) * 0.55) * 0.035 * g;
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
const SWEET_INTRO = {
  dur: SWI.dur,
  appear: SWI.appear,
  stage: sweetIntroStage,
  peekHide: SW_PEEK_HIDE,
  // เสียงตามจังหวะ (ชื่อใน sfx ของ audio.js)
  voices: [[SWI.peek + 12, 'sweetPeek'], [SWI.hide, 'sweetHide'], [SWI.cupIn, 'sweetHop'],
    [SWI.land1, 'sweetBoing'], [SWI.land2, 'sweetBoing'], [SWI.cupLand, 'sweetBoing'], [SWI.cupLand + 8, 'sweetRattle'],
    [SWI.appear - 34, 'sweetGather'], [SWI.appear - 1, 'sweetPop'], [SWI.appear + 1, 'sweetAppear'],
    [SWI.open, 'sweetMusicBox'], [SWI.catch, 'sweetCatch'],
    [SWI.raise, 'sweetTwirl'], [SWI.burst, 'sweetBurst'], [SWI.pose + 8, 'sweetMew'], [SWI.pose + 18, 'sweetBell'], [SWI.posed + 12, 'sweetShimmer']],
  shape: sweetIntroShape,
  fx: sweetIntroFx,
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
  // ── องค์หญิงหิมะ (ระดับ S): ออร่าเรือง ลำแสง ผ้าคลุมน้ำแข็งโปร่ง · ชุดราตรีน้ำแข็งยาวถึงพื้น ประกายวิบวับ ·
  //    ปกขนเฟอร์ จี้คริสตัลเรือง · มงกุฎคริสตัลเจ็ดยอดเรืองแสง · เกล็ดหิมะลอยวนรอบตัว ──
  princess: {
    behind: princessBehind,
    behindBody: true,
    sitSleeve: [ICEP.light, ICEP.mid, ICEP.dark],
    shirt: (c, k) => sailorShirt(c, { ...k, T: PRINCESS_T }),
    neck: princessNeck,
    skirt: (c, k) => nurseSkirt(c, { ...k, SK: BALLGOWN }),
    hat: princessCrown,
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
        out.rect(-2000, -2000, 5000, 5000);
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

/** ผ้าใบชั้นแยกขนาดเท่าจอ (ล้างแล้ว) — วาดของลงไปก่อนแล้วไล่จาง/ตัดด้วย destination-in ค่อยแปะกลับ */
let fadeCv = null;
function fadeLayer(ctx) {
  if (!fadeCv) fadeCv = document.createElement('canvas').getContext('2d');
  const cv = fadeCv.canvas;
  if (cv.width !== ctx.canvas.width || cv.height !== ctx.canvas.height) {
    cv.width = ctx.canvas.width;
    cv.height = ctx.canvas.height;
  }
  fadeCv.setTransform(1, 0, 0, 1, 0, 0);
  fadeCv.globalCompositeOperation = 'source-over';
  fadeCv.globalAlpha = 1;
  fadeCv.clearRect(0, 0, cv.width, cv.height);
  return fadeCv;
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

function mix(a, b, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a;
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
/** จานสีตามสกินของแมว — แมวส้มใช้สีของแบบ ตัวอื่นสลับตามช่องสีของสกิน */
const palCache = new WeakMap();
function paletteOf(s) {
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
    return { ...op, path: buildPath(op.cmds, f), cmds };
  });
}
/** ชิ้นส่วนที่ดัดตามฟังก์ชันจุด f(x, y) → [x, y] */
function deformPart(part, f) {
  const sil = part.silCmds.map((c) => buildPath(c, f));
  const all = new Path2D();
  for (const p of sil) all.addPath(p);
  return { sil, all, det: deformOps(part.det, f) };
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
          const a0 = ctx.globalAlpha;
          ctx.globalAlpha = a0 * 0.22;
          ctx.lineWidth = op.width * 2.6;
          ctx.stroke(op.path);
          ctx.globalAlpha = a0 * 0.3;
          ctx.lineWidth = op.width * 1.6;
          ctx.stroke(op.path);
          ctx.globalAlpha = a0 * 0.75;
          ctx.lineWidth = op.width * LINE_K * 0.8;
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
 * blur = ระยะฟุ้ง (หน่วยไฟล์) · rgba = สีเงา
 */
function rimShade(ctx, items, rgba, blur, alpha = 1) {
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
  // เบลอด้วยเงาของภาพ (วาดภาพไว้นอกผ้าใบ ให้เหลือแต่เงาเลื่อนกลับมา)
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
  const h = /^#[0-9a-f]{6}$/i.test(pal.stripe) ? mix(pal.stripe, '#FF7418', 0.25) : '#F07A20';
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
    // ทาแต่ละพิกเซลครั้งเดียว: เว้นที่ชิ้นก่อนหน้าทาไปแล้ว (ส่วนซ้อนทาซ้ำ = เข้มกว่า = เห็นขอบชิ้นเป็นเส้นตรง)
    for (let j = 0; j < i; j++) {
      if (!items[j].sil.length) continue;
      ctx.setTransform(m00);
      items[j].xf?.(ctx);
      const hole = new Path2D();
      hole.rect(-2000, -2000, 5000, 5000);
      hole.addPath(items[j].all);
      ctx.clip(hole, 'evenodd');
    }
    ctx.setTransform(m00);
    it.xf?.(ctx);
    ctx.clip(it.all);
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
    rimShade(ctx, ab, shadeRgba(pal, 1), small ? 16 : 42, small ? 0.55 : 0.85);
    rimShade(ctx, ab, shadeRgba(pal, 1), small ? 7 : 14, small ? 0.4 : 0.6);
  }
  // 3) รายละเอียดของแต่ละชิ้น ตัดให้อยู่ในเนื้อของชิ้นตัวเอง (ลายไม่ล้นออกนอกเส้น)
  //    และเว้นบริเวณที่ชิ้นข้างหน้าบังอยู่ — ไม่งั้นลาย/เงาของหางจะโผล่ทับขา ดูเหมือนหางมาอยู่ข้างหน้า
  const m0 = ctx.getTransform();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    ctx.save();
    for (let j = i + 1; j < items.length; j++) {
      if (!items[j].sil.length) continue;
      ctx.setTransform(m0);
      items[j].xf?.(ctx);
      const hole = new Path2D();
      hole.rect(-2000, -2000, 5000, 5000);
      hole.addPath(items[j].all);
      ctx.clip(hole, 'evenodd');
    }
    ctx.setTransform(m0);
    it.xf?.(ctx);
    // detClip: ขอบเขตลงรายละเอียดที่กว้างกว่าตัวชิ้น (เช่น เงาข้างตัวไหลลงต้นขา ไม่ขาดเป็นเส้นตรงตรงรอยต่อ)
    if (it.sil.length) ctx.clip(it.detClip || it.all);
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
function tailDetails(ctx, G, pal, noStripes) {
  const { pts, half, N } = G;
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
  if (!noStripes) {
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
  // ปลายหางสีครีม เข้าชุดกับอุ้งเท้า
  const tip = pts[N];
  ctx.fillStyle = pal.cream;
  ctx.beginPath();
  ctx.arc(tip.x - Math.cos(tip.a) * 2, tip.y - Math.sin(tip.a) * 2, half(N) + 6, 0, TAU);
  ctx.fill();
}

// ══ ตา ══
/** ตาปิด: โค้งลง (กะพริบ/หลับ) · ^ (ดีใจ) · > < (เจ็บ) */
function closedEye(ctx, e, pal, kind, side) {
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
function coolLid(c, white, pal, side, ang = 0) {
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
function drawBabyEye(c, white, side, { lx = 0, ly = 0, sparkle = 0, t = 0, lidded = false } = {}) {
  const W = EYE_WHITE[side], R = EYE_WHITE.r, d = side === 'left' ? 1 : -1;
  c.save();
  c.clip(white);
  const rim = c.createLinearGradient(0, W.y - R, 0, W.y + R);
  rim.addColorStop(0, BABY.rimTop);
  rim.addColorStop(1, BABY.rimBot);
  c.fillStyle = rim;
  c.fillRect(W.x - R - 6, W.y - R - 6, (R + 6) * 2, (R + 6) * 2);
  // วงเข้มเยื้องขึ้นบน (และเข้าหาจมูกนิด) = เหลือเสี้ยวทองที่ขอบล่างด้านนอก
  const ix = W.x + d * 3 + lx, iy = W.y - 11 + ly, ir = R - 5;
  const core = c.createRadialGradient(ix - 6, iy - 8, 2, ix, iy, ir);
  core.addColorStop(0, BABY.coreIn);
  core.addColorStop(1, BABY.coreOut);
  c.fillStyle = core;
  c.beginPath();
  c.arc(ix, iy, ir, 0, TAU);
  c.fill();
  // ประกาย: วงกลมล้วนทั้งหมด จัดตามสัดส่วนของวงเข้ม (ir) — แสงมาจากมุมบนซ้ายทั้งสองตา
  //   ใหญ่ = มุมบนซ้าย · เล็ก = เกาะข้างวงใหญ่ (บนขวา) · กลาง = มุมล่างขวาตรงข้ามแนวทแยงกับวงใหญ่
  c.fillStyle = '#FFFFFF';
  const dot = (dx, dy, r) => { c.beginPath(); c.arc(ix + dx * ir, iy + dy * ir, r * ir, 0, TAU); c.fill(); };
  if (lidded) {
    // ตาปรือ (ท่าลอยเฟี้ยว): ครึ่งบนโดนเปลือกตาบัง — ย้ายประกายลงมาครึ่งล่างที่ยังเห็น ทิศแสงเดิม
    dot(-0.3, 0.16, 0.2);
    dot(0.02, 0.06, 0.08);
    dot(0.34, 0.46, 0.1);
  } else {
    dot(-0.32, -0.32, 0.26);
    dot(0.06, -0.5, 0.1);
    dot(0.36, 0.36, 0.12);
  }
  if (sparkle > 0) {
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
function drawLashes(c, side, female = false) {
  const W = EYE_WHITE[side], R = EYE_WHITE.r, o = side === 'left' ? -1 : 1;   // o = ทิศออกนอกหน้า
  const pt = (a, r) => [W.x + o * Math.cos(a) * r, W.y + Math.sin(a) * r];
  // มุมวัดจากแนวนอนออกนอกหน้า (0 = หางตา) · ลบ = ขึ้นบน บวก = ลงล่าง
  const a0 = -1.2, a1 = 1.4;
  // ความหนา: เรียวเป็นศูนย์ทั้งสองปลาย (ไม่มีปลายตัดเหลี่ยม) หนาสุดแถวหางตา
  // + ปลายขนตาสองเส้นเป็นยอดโค้งนุ่ม ๆ ที่มุมบนนอก (เกาส์) — เส้นขอบโค้งต่อเนื่อง ไม่ใช่หนามแปะ
  const thick = (a) => {
    const u = (a - a0) / (a1 - a0);
    const base = 8 * Math.pow(Math.sin(Math.PI * u), 1.1) * (0.35 + 0.65 * Math.max(0, Math.cos(a * 0.8)));
    const lash = (c0, h, w) => h * Math.exp(-(((a - c0) / w) ** 2));
    return base + (female ? lash(-0.55, 14, 0.09) + lash(-0.88, 8, 0.08) : 0);
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
    c.fillStyle = pal.cream;
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
function sideEye(c, pal, E, { shut = 0, happy = false, lx = 0, ly = 0, female = false } = {}) {
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
  rim.addColorStop(0, BABY.rimTop);
  rim.addColorStop(1, BABY.rimBot);
  c.fillStyle = rim;
  c.fillRect(E.x - E.rx - 4, E.y - E.ry - 4, E.rx * 2 + 8, E.ry * 2 + 8);
  // วงเข้มเยื้องไปด้านหน้า-บน (มองไปข้างหน้า) — เหลือเสี้ยวทองขอบหลัง-ล่าง
  const ix = E.x - 4 + lx, iy = E.y - 9 + ly;
  const core = c.createRadialGradient(ix - 5, iy - 8, 2, ix, iy, E.ry - 6);
  core.addColorStop(0, BABY.coreIn);
  core.addColorStop(1, BABY.coreOut);
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
  const tail = { sil: [TL.path], all: TL.path, xf: bodyXf, det: (c) => tailDetails(c, TL, pal, opt.noStripes) };
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
  sideEye(ctx, pal, S.eye, { shut: Math.max(a.blink, a.shut), happy: a.happy, lx: a.lx, ly: a.ly, female: a.female });
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
  const m0 = ctx.getTransform();   // ตัวแปลงของผู้เรียก — เอฟเฟกต์ท่าเปิดตัววาดในพิกัดพื้น ไม่ยืด/เอียง/เด้งตามตัว
  const pal = paletteOf(s);
  const opt = { noStripes: s && s.id !== 'orange' && s.stripes === false };
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
  const blink = blinkAt(T, look);
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
  if (OUT0?.intro && idle?.intro != null && !idle.skip && OUT0.intro.stage?.(idle.intro) === 'peek') {
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
  const P = M.parts;

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
    return (x, y) => {
      let X = x + d * spread, Y = FEET_Y - (FEET_Y - y) * legK;
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
  const earPt = (side) => {
    const d = side === 'left' ? 1 : -1;
    const a = earLag + d * v('ear') * 0.3 + (twitchSide === side || twitchSide === 'both' ? -d * twitch : 0);
    const piv = M.piv[`ear-${side}`];
    return (x0, y0) => {
      // หูเตี้ยลง 8% จากโคน ตั้งอยู่บนไหล่โดมหัวแบบในแบบ (โคนซ่อนหลังหัว)
      let x = x0, y = y0;
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
  const headPart = () => ({ ...M.headShaped, soft: P.head.soft, xf: head });
  // หูชั้นหนึ่ง (ข้างหลัง) → หัวอีกชั้น (ข้างหน้า มีเส้นขอบเต็ม) = เห็นเส้นหัวตัดโคนหูแบบในแบบ
  const OUT = s?.outfit ? CAT2_OUTFITS[s.outfit.id] : null;
  // ท่าเปิดตัวของชุด (OUT.intro): idle.intro = เฟรมในท่า · idle.skip 0..1 = กำลังข้ามไปท่าแอ็ค (เอฟเฟกต์จางออก)
  const introOn = !!OUT?.intro && idle?.intro != null;
  const outK = {
    pal, t, back: false, intro: introOn ? idle.intro : null, introSkip: introOn ? idle.skip || 0 : 0,
    introEdge: introOn ? 300 + (edgeL - x0) / (scale * UNIT) : null,   // ขอบซ้ายของฉาก (พิกัดตัว) — ของที่โผล่/เด้งมาจากขอบ
  };
  /** เอฟเฟกต์ท่าเปิดตัว — พิกัดพื้น (ไม่ยืด/เอียง/เด้งตามตัว) · layer 'back' ก่อนตัว / 'front' ท้ายสุด */
  const drawIntro = (layer) => {
    if (!introOn) return;
    ctx.save();
    ctx.setTransform(m0);
    ctx.translate(x0, feetY);
    ctx.scale(scale * UNIT, scale * UNIT);
    ctx.translate(-300, -FEET_Y);
    OUT.intro.fx(ctx, { ...outK, layer });
    ctx.restore();
  };
  let propNow = null;   // ของถือเฟรมนี้ (อุ้งเท้า + busy) — ท่าเปิดตัววาดของถือที่บิน/หมุนทับหน้าตัวด้วย
  /** ของชุดที่อยู่หลังตัว (เช่นฮู้ดกองหลังคอ) — วาดก่อนชั้นตัว ตามหัว */
  const drawBehind = (xf = null) => {
    if (!OUT?.behind || back) return;
    ctx.save();
    if (!OUT.behindBody) head(ctx);   // behindBody = พิกัดตัว (ผ้าคลุมยาวถึงพื้น ออร่ารอบตัว) ไม่ตามหัว
    OUT.behind(ctx, { ...outK, back, hxShift: hx * 6, cpt: (x, y) => [bodyX(x), y] });
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
  /** เอฟเฟกต์หน้าตัว (OUT.front) — วาดท้ายสุดของทุกท่า · ท่าเปิดตัว: เอฟเฟกต์ชั้นหน้า + ของถือช่วงที่ลอย/หมุนอยู่หน้าตัว */
  const drawFront = () => {
    if (OUT?.front) {
      ctx.save();
      OUT.front(ctx, { ...outK, back });
      ctx.restore();
    }
    drawIntro('front');
    if (introOn && OUT?.prop && propNow) {
      ctx.save();
      OUT.prop(ctx, { ...outK, back, ...propNow, drop, layer: 'front' });
      ctx.restore();
    }
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
  const drawHeadLayers = () => {
    const ears = [bent('ear-left', earPt('left'), head), bent('ear-right', earPt('right'), head)];
    // ปลอกคอใต้คาง: วาดก่อนหัว หัวบังขอบบน (ตามหัว ไม่ใช่ตามตัว — นั่ง/หมอบคอจะลดลงตามหัว)
    const neckK = { ...outK, back, faceShift: hx * 6 + 172 * Math.sin(yF) * 0.6, hxShift: hx * 6, cpt: (x, y) => [bodyX(x), y] };
    if (OUT?.neck && !loafMode) { ctx.save(); head(ctx); OUT.neck(ctx, neckK); ctx.restore(); }
    // ของที่ห้อยจากหูไปหลังหัว (ริบบิ้นยาว): หัวบังโคน เห็นพลิ้วออกมาข้างหัว
    if (OUT?.earBack && !back) {
      ctx.save();
      head(ctx);
      const rb = earLag - v('ear') * 0.3 + (twitchSide === 'right' || twitchSide === 'both' ? twitch : 0);
      rotAt(ctx, M.piv['ear-right'], rb * 0.8);
      OUT.earBack(ctx, outK);
      ctx.restore();
    }
    // หูกับหัวกลืนเป็นก้อนเดียว: ไม่มีเส้นตัดโคนหู เส้นกระหม่อมระหว่างหูยังอยู่ (เป็นขอบนอก)
    drawLayer(ctx, [...ears, headPart()], pal, hooks, opt);
    // ของบนหู: หมุนตามหูขวาที่กระดิก
    if (OUT?.ear) {
      ctx.save();
      head(ctx);
      const ra = earLag - v('ear') * 0.3 + (twitchSide === 'right' || twitchSide === 'both' ? twitch : 0);
      rotAt(ctx, M.piv['ear-right'], ra * 0.8);
      OUT.ear(ctx, { ...outK, back });
      ctx.restore();
    }
    // ของบนหูซ้ายจอ (ต่างหู): หมุนตามหูซ้ายที่กระดิก
    if (OUT?.earL && !back) {
      ctx.save();
      head(ctx);
      const raL = earLag + v('ear') * 0.3 - (twitchSide === 'left' || twitchSide === 'both' ? twitch : 0);
      rotAt(ctx, M.piv['ear-left'], raL * 0.8);
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
    'ear-inline_6': earSwap(null, '_6', false), 'ear-inline_7': earSwap(null, '_7', false),
    'ear-dark2_6': earSwap(earDark, '_6', true), 'ear-dark2_7': earSwap(earDark, '_7', true),
    'ear-pale2_6': earSwap(earPale, '_6', true), 'ear-pale2_7': earSwap(earPale, '_7', true),
    'ear-inline2_6': earSwap(null, '_6', true), 'ear-inline2_7': earSwap(null, '_7', true),
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
      if (!op) return;
      c.fillStyle = pal.cream;
      c.save();
      // พุงเลื่อนตามผิวตัว (bodyX) และแคบลงตามมุมหัน
      const bx = bodyX(300);
      c.translate(bx, 0);
      c.scale(0.8 + 0.2 * Math.cos(yB), 1);
      c.translate(-300, 0);
      c.fill(op.path);
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
    stripes_6: (c, draw) => { c.save(); c.translate(hx * 5, hy * 2); yawFeature(c, 300); draw(); c.restore(); },
    // ขนขาวบนหน้า (แถบกลางหน้าระหว่างตา + คาง/ปาก): ตอนหัน ดัดทีละจุดตามผิวทรงกลมชุดเดียวกับตา (yawX)
    // แถบขาวจึงเลื่อนไปอยู่กึ่งกลางระหว่างตาตามมุมหัน · ขอบหัวไม่ขยับ (จุดที่ขอบหัวหมุนแล้วยังอยู่ที่ขอบ)
    // ขอบขาว-ส้มนุ่ม (ช่วงแก้ม): ลากเส้นโปร่งซ้อนตามขอบ — ฝั่งนอกครีมจางเข้าส้ม ฝั่งในส้มจางเข้าครีม
    cream: (c, draw, op) => {
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
      const L = fadeLayer(c);
      L.setTransform(m);
      featherOps(L, ops, pal.cream, pal.cat);
      const g = L.createLinearGradient(0, 282, 0, 336);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      L.globalCompositeOperation = 'destination-in';
      L.fillStyle = g;
      L.fillRect(-1000, -1000, 2600, 3000);
      L.globalCompositeOperation = 'source-over';
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(L.canvas, 0, 0);
      c.restore();
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
      drawBabyEye(c, white.path, side, {
        lx: gx * 7 - hx * 2, ly: gy * 5,
        sparkle: starry || eyesOpenHappy || cute ? 1 : 0,
        t,
        lidded: cool,
      });
      // ขอบตานอกเส้นบาง ๆ (บางกว่าเส้นตัวมาก) ให้ตาแยกจากขนส้มชัดขึ้น
      c.strokeStyle = pal.line;
      c.lineWidth = EYE_RIM_W;
      c.stroke(white.path);
      // ขนตา (ไม่วาดตอนตาปรือของท่าเฟี้ยว — เปลือกตาหนาทำหน้าที่นั้นแล้ว)
      if (!cool) drawLashes(c, side, female);
      c.restore();
      // ตาเฟี้ยว: เปลือกตาปรือ (ตอนกะพริบไม่วาด ไม่งั้นซ้อนกับตาที่กำลังหลับ)
      // เปลือกตาเอียงไปกับหัว (เดิมหมุนสวนให้ตรงจอ แล้วไม่เข้ากับตา/ประกายที่เอียงตามตัว)
      if (cool && shut < 0.25) coolLid(c, white.path, pal, side, 0);
      // ตาเศร้า: เปลือกตาละห้อย + น้ำตา
      if (mood === 'sad' && shut < 0.25) {
        sadLid(c, white.path, pal, side);
        tearDrop(c, pal, side, t);
      }
    };
  }

  const bent = (id, f, xf) => ({ ...deformPart(P[id], f), xf });
  if (idle?.headOnly && !back) {
    drawHeadLayers();
    ctx.save();
    face(ctx);
    drawOps(ctx, P.face.det, pal, hooks, opt);
    ctx.restore();
    ctx.restore();
    return;
  }
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

  // ท่าเปิดตัว: ก่อนจังหวะปรากฏตัว ยังไม่มีน้อง — มีแต่เอฟเฟกต์
  if (introOn && !outK.introSkip && (OUT.intro.stage ? OUT.intro.stage(outK.intro) === 'hidden' : outK.intro < (OUT.intro.appear || 0))) {
    drawIntro('back');
    drawIntro('front');
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
    drawLayer(ctx, [{ small: true, sil: [LOAF.base], all: LOAF.base, xf: grow, det: (c) => loafBaseDetails(c, pal, opt.noStripes) }], pal, hooks, opt);
    if (OUT?.shirt) { ctx.save(); grow(ctx); OUT.shirt(ctx, { ...outK, mode: 'loaf', body: LOAF.base, arms: [] }); outline(ctx, LOAF.base, pal); ctx.restore(); }
    drawLayer(ctx, [{ small: true, sil: [TL.path], all: TL.path, xf: grow, det: (c) => loafTailDetails(c, TL, pal, opt.noStripes) }], pal, hooks, opt);
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
        bandItem(TS2, (c) => tailDetails(c, TS2, pal, opt.noStripes)),
        { sil: [SIT2.body], all: SIT2.body, xf: grow, det: bodyDet },
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
      const lc = skirtLegs ? fadeLayer(ctx) : ctx;
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
      drawLayer(lc, [{ small: true, sil: legSil, all: legAll, xf: grow, det: (c) => {
        c.fillStyle = pal.cream;
        if (!skirtLegs) {
          c.beginPath();
          c.ellipse(300, 512, 52, 60, 0, 0, TAU);   // อกครีมไหลต่อลงมาบนโคนขา (ไม่โดนขาตัดเป็นขอบตรง)
          c.fill();
        }
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
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(lc.canvas, 0, 0);
        ctx.restore();
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
        drawLayer(ctx, [{ small: true, sil: [band.path, pw.blob, cap], all, xf: grow, det: (c) => pw.det(c, all) }], pal, hooks, opt);
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
      bandItem(TS, (c) => tailDetails(c, TS, pal, opt.noStripes)),
      { sil: [SIT.torso], all: SIT.torso, xf: grow, det: torsoDet },
      bandItem(bandUpL, armDet),
      bandItem(bandR, armDet),
      { sil: [SIT.haunchL], all: SIT.haunchL, xf: grow, det: haunchDet },
      { sil: [SIT.haunchR], all: SIT.haunchR, xf: grow, det: haunchDet },
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
      else drawLayer(ctx, [{ ...bandItem(bandUpL, armDet), small: true }, { ...bandItem(bandR, armDet), small: true }], pal, hooks, opt);
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
      ctx.fillStyle = pal.cream;
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
    const outUp = new Path2D();
    outUp.rect(-600, -600, 1800, 2000);
    outUp.addPath(bandUpL.path);
    const m1 = ctx.getTransform();
    // ลงสีเนื้อแขนท่อนล่างเต็มท่อนก่อน — ขอบตัด (evenodd) ตรงศอกเหลือรอยขอบจาง ๆ เป็นช่องโหว่สีอ่อน
    ctx.save();
    grow(ctx);
    ctx.fillStyle = armCol(ctx);
    ctx.fill(bandLoL.path);
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
    for (const below of [true, false]) {
      ctx.save();
      grow(ctx);
      if (below) {
        const r = new Path2D();
        r.rect(-600, elbowY, 1800, 2000);
        ctx.clip(r);
      } else {
        const r = new Path2D();
        r.rect(-600, -600, 1800, elbowY + 602);   // ซ้อนกับช่วงล่างนิดนึง กันรอยต่อขอบจาง
        ctx.clip(r);
        ctx.clip(outUp, 'evenodd');
      }
      ctx.setTransform(m1);
      drawLayer(ctx, [{ small: true, sil: [bandLoL.path, pl.blob, elbowCap], all: allL, xf: grow, det: (c) => {
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
    {
      // รอยต่อสองช่วง (เหนือ/ใต้ศอก) เหลือเส้นขนจาง ๆ — ลงสีเนื้อทับแถบบาง ๆ ในวงศอก
      ctx.save();
      grow(ctx);
      const seam = new Path2D();
      seam.rect(-600, elbowY - 3, 600 + bandLoL.pts[0].x + 34, 6);   // เฉพาะแถวศอก ไม่ไปทับเส้นอุ้งเท้า
      ctx.clip(seam);
      ctx.fillStyle = armCol(ctx);
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
    : { x: 252, y: 575 + drop * 0.9, a: Math.PI * 1.04 + sway * 2, curl: 1 };
  // ด้านหลัง (ตามชีท Back): หางยาวพาดออกจากก้นไปทางขวาเกือบแนวนอน ปลายยกขึ้นนิด แกว่งเบา ๆ
  const BL = tailLife(T);
  const bw = BL.lag * 9 + BL.flick * 6 + BL.swishLag * 13 + wagOff * 12;
  const TG = back
    ? spineBand([[302, 540 + drop * 0.9], [384, 550 + drop * 0.9], [466, 544 + drop * 0.9],
      [532 + bw * 0.3, 518 + drop * 0.9 - bw * 0.2], [560 + bw * 0.6, 478 + drop * 0.9 - bw * 0.4], [548 + bw, 444 + drop * 0.9 - bw * 0.5]],
    16, (i) => TAIL_HALF(i))
    : tailGeom(T, 1 - k * 0.5, tailBase, wagOff, tailShort);
  const tail = { sil: [TG.path], all: TG.path, det: (c) => tailDetails(c, TG, pal, opt.noStripes) };
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
  const torso = bent('torso', torsoPt);
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
      const lo = mixPts(mp(HOLD_ARM.loRest), [[H, u]]).map(([x, y]) => upperPt(x, y));
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
  const legL = bent('leg-left', legPt('left')), legR = bent('leg-right', legPt('right'));
  // เงาข้างตัวไหลต่อลงต้นขา (ตัดเฉพาะเหนือเท้า) — ไม่งั้นเงาถูกตัดเป็นเส้นเฉียงตรงรอยต่อตัว-ขา ดูเป็นเส้นซ้อน
  torso.detClip = new Path2D();
  torso.detClip.addPath(torso.all);
  for (const L of [legL, legR]) torso.detClip.addPath(L.all);
  const limbs = [legL, legR, torso, ...armItems];
  // เตะขา: ขอบล่างของขาที่เตะมาชนขอบในของขาอีกข้างเป็นรอยบากตัว V ตรงเป้า
  // เติมก้อนเนื้อมน ๆ ลงในชั้นตัว — เส้นรอบนอกวิ่งรอบก้อนรวม รอยบากจึงกลายเป็นโค้งมนต่อเนื่อง (ตามแบบ)
  const kickAny = Math.max(Math.abs(v('kickL')), Math.abs(v('kickR')));
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
  if (OUT?.ankle) for (const side of ['left', 'right']) OUT.ankle(ctx, { ...outK, back, side, pt: legPt(side) });
  // ลายข้างตัวขวาเส้นล่าง: วาดทับหลังชั้นตัว ตัดแค่ในลำตัว (ตอนแขนไม่ได้พาดหน้าตัว) — ซ้ายขวามีสองเส้นเท่ากัน
  if (!back && !useHold && Math.max(knead, scratch, clasp, offer, reachL) < 0.05) {
    const st = findOp(torso.det, 'Vector_10');
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
    ctx.save();
    upper(ctx);
    drawOps(ctx, P.belly.det, pal, hooks, opt);
    ctx.restore();
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
    OUT.skirt(ctx, { ...outK, back, hold: clamp01(skF / 0.08), pt: skirtPt, bodies: parts });
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
    drawLayer(ctx, [{ small: true, sil: [H.bLo.path, H.pw.blob, H.cap], all: H.all, det: (c) => {
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
    // แขนสองข้างเป็นท่อเดียวต่อเส้น มีเส้นรอบครบ หนาเท่ากันตลอด · อุ้งเท้าครีมแตะใต้คาง
    for (const H of [hold.L, hold.R]) {
      drawLayer(ctx, [{ small: true, sil: [H.bLo.path, H.pw.blob, H.cap], all: H.all, det: (c) => {
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
        notPaw.ellipse(tp.x + Math.cos(tp.a) * 2, tp.y + Math.sin(tp.a) * 2, 25 + LW, 24 + LW, tp.a, 0, TAU);
      }
      ctx.clip(notPaw, 'evenodd');
      drawHeart(ctx, hx0, hy0, hs, pal);
      ctx.restore();
      drawSparks(ctx, hx0, hy0, 38, t, clamp01(clasp * 1.5));
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
