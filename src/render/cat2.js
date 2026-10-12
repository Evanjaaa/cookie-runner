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
//   skirt(c, k)  กระโปรง/เสื้อ: รอบเอว ทับตัวกับแขน (ท่ายืน)
//   ear(c, k)    ของบนหู: วาดหลังหัว หมุนตามหูที่กระดิก
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
function ribbonBow(c, cx, cy, r, pal, t = 0) {
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
    softFill(c, q, cx, cy, cx + d * r, cy + r * 1.5, PINK.mid, PINK.dark, PINK.deep);
    outline(c, q, pal);
  }
  for (const d of [-1, 1]) {
    const q = loop(d);
    softFill(c, q, cx + d * r * 0.4, cy - r * 0.7, cx + d * r * 1.2, cy + r * 0.6, PINK.light, PINK.mid, PINK.dark);
    // รอยพับผ้าด้านในห่วง
    c.save();
    c.clip(q);
    c.strokeStyle = 'rgba(201,60,116,.45)';
    c.lineWidth = r * 0.12;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx + d * r * 0.25, cy - r * 0.1);
    c.quadraticCurveTo(cx + d * r * 0.8, cy - r * 0.35, cx + d * r * 1.2, cy - r * 0.1);
    c.stroke();
    // ลายจุดขาว
    c.fillStyle = 'rgba(255,255,255,.85)';
    for (const [u, v, rr] of [[0.75, -0.45, 0.11], [1.1, 0.15, 0.09], [0.55, 0.35, 0.08]]) {
      c.beginPath(); c.arc(cx + d * r * u, cy + r * v, r * rr, 0, TAU); c.fill();
    }
    c.restore();
    outline(c, q, pal);
  }
  const knot = new Path2D();
  knot.ellipse(cx, cy + r * 0.02, r * 0.34, r * 0.42, 0, 0, TAU);
  softFill(c, knot, cx, cy - r * 0.4, cx, cy + r * 0.4, PINK.light, PINK.mid, PINK.dark);
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
/** ชุดที่วาดแบบใหม่แล้ว (หน้า Cat Lab ใช้บอกสถานะ) */
export const cat2Outfits = () => Object.keys(CAT2_OUTFITS);
const CAT2_OUTFITS = {
  // ── โบว์หวาน: โบว์ชมพูลายจุดบนหูขวา · ปลอกคอผ้าระบายชมพูมีกระดิ่ง · กระโปรงตูตู้สองชั้นขอบลูกไม้ ──
  bow: {
    neck(c, k) {
      const pal = k.pal;
      // ปลอกคอผ้าโค้งตามคาง (หัวบังครึ่งบน) + ระบายลูกไม้ครีมใต้ปลอก
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
      c.fillStyle = pal.cream;
      c.fill(lace);
      outline(c, lace, pal, OL * 0.8);
      softFill(c, band, 300, 380, 300, 440, PINK.light, PINK.mid, PINK.dark);
      outline(c, band, pal);
      if (!k.back) bell(c, 300 + (k.faceShift || 0), 428, 15, pal, Math.sin(k.t * 0.08) * 0.12);
    },
    skirt(c, k) {
      const pal = k.pal;
      // P = ตัวดัดจุดชุดเดียวกับลำตัว (เอียงถ่ายน้ำหนัก หายใจ หันตัว) — กระโปรงติดตัวน้องไปทุกท่า ไม่ลอยแยก
      const P = k.pt || ((x, y) => [x, y]);
      const sw = Math.sin(k.t * 0.05) * 3;   // ชายกระโปรงไหวนิด ๆ
      // ขนาดตามทรงตัวจริงของแต่ละท่า (หน่วยไฟล์ออกแบบ)
      //   ยืน: เอวรัดใต้อก กว้างเต็มลำตัว ชายบานพ้นสะโพก สั้นเหนือเข่า (เห็นขาเต็ม ๆ)
      //   นั่ง: ชายแผ่ลงบนพื้นรอบก้น (นั่งทับกระโปรง)
      const G = k.mode === 'sit'
        ? { y0: 510, y1: 612, x0: 194, x1: 406, fl: 52, n: 11 }
        : { y0: 486, y1: 566, x0: 196, x1: 404, fl: 32 - 10 * (k.hold || 0), n: 10 };
      const M = (x, y) => P(x, y);
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
      softFill(c, top, 0, gy0, 0, gy1 + 10, PINK.light, PINK.mid, PINK.dark);
      // จีบผ้า + ไฮไลต์บนสันจีบ (ตามตัวดัดจุดเดียวกัน)
      c.save();
      c.clip(top);
      for (let i = 1; i < G.n; i++) {
        const u = i / G.n;
        const xa = G.x0 + (G.x1 - G.x0) * u, xb = G.x0 - G.fl + (G.x1 - G.x0 + G.fl * 2) * u + sw * 0.6 * u;
        for (const [dx, col, w] of [[0, 'rgba(201,60,116,.32)', 5], [9, 'rgba(255,255,255,.28)', 3]]) {
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
      // ขอบเอวผ้าชมพูเข้ม + โบว์กลางเอว (ด้านหน้าเท่านั้น)
      const belt = new Path2D();
      belt.moveTo(...M(G.x0 - 2, G.y0 - 3));
      belt.quadraticCurveTo(...M(300, G.y0 + 15), ...M(G.x1 + 2, G.y0 - 3));
      belt.lineTo(...M(G.x1 + 4, G.y0 + 9));
      belt.quadraticCurveTo(...M(300, G.y0 + 29), ...M(G.x0 - 4, G.y0 + 9));
      belt.closePath();
      softFill(c, belt, 0, gy0, 0, gy0 + 26, PINK.mid, PINK.dark, PINK.deep);
      outline(c, belt, pal, OL * 0.8);
      if (!k.back) { const [bx, by] = M(300, G.y0 + 12); ribbonBow(c, bx, by, 17, pal, k.t); }
    },
    ear(c, k) {
      // บนหูขวาจอ เอียงตามหู
      c.save();
      rotAt(c, { x: 392, y: 150 }, 0.35);
      ribbonBow(c, 392, 150, 34, k.pal, k.t);
      c.restore();
    },
  },
};

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
      if (h) h(ctx, () => drawOps(ctx, op.ops, pal, hooks, opt));
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
const AB = { a: null, b: null, c: null };
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
/** กรอบพิกเซลจริงของตัวน้อง (พิกัดไฟล์ 0..600 × 0..700) */
function abBox(m) {
  const P = [[0, -20], [600, -20], [0, 700], [600, 700]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  const x0 = Math.floor(Math.min(...P.map((q) => q[0]))), y0 = Math.floor(Math.min(...P.map((q) => q[1])));
  const x1 = Math.ceil(Math.max(...P.map((q) => q[0]))), y1 = Math.ceil(Math.max(...P.map((q) => q[1])));
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
  const sc = Math.hypot(m.a, m.b) * AB_RES;
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
  rim.shadowColor = '#000';
  rim.shadowBlur = Math.max(1, blur * sc);
  rim.shadowOffsetX = W + 40;
  rim.drawImage(out.canvas, 0, 0, W, H, -W - 40, 0, W, H);
  rim.shadowColor = 'transparent';
  rim.shadowBlur = 0;
  rim.shadowOffsetX = 0;
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
  const sc = Math.hypot(m.a, m.b) * AB_RES;
  const W = Math.ceil(box.w * AB_RES) + 4, H = Math.ceil(box.h * AB_RES) + 4;
  if (W < 4 || H < 4 || W > 4000 || H > 4000) return;
  const cast = abCanvas('a', W, H);
  abMask(cast, m, box, caster, dy);
  const sh = abCanvas('b', W, H);
  sh.shadowColor = '#000';
  sh.shadowBlur = Math.max(1, blur * sc);
  sh.shadowOffsetX = W + 40;
  sh.drawImage(cast.canvas, 0, 0, W, H, -W - 40, 0, W, H);
  sh.shadowColor = 'transparent';
  sh.shadowBlur = 0;
  sh.shadowOffsetX = 0;
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
  ctx.strokeStyle = pal.line;
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
    ctx.fillStyle = pal.line;
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
    ctx.fillStyle = pal.line;
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
  return { body, legs, gap, legL, legR, legAll };
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
export function drawCat2(ctx, x, feetY, scale, s, t = 0, idle = null) {
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
  const gx = forced ?? look.x * lookK, gy = forced != null ? 0 : look.y * lookK;
  const hx = forced != null ? forced * 0.6 : headLook.x * lookK, hy = forced != null ? 0 : headLook.y * lookK;
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
      return [bodyX(X), Y];
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
  const outK = { pal, t, back: false };
  const drawHeadLayers = () => {
    const ears = [bent('ear-left', earPt('left'), head), bent('ear-right', earPt('right'), head)];
    // ปลอกคอใต้คาง: วาดก่อนหัว หัวบังขอบบน (ตามหัว ไม่ใช่ตามตัว — นั่ง/หมอบคอจะลดลงตามหัว)
    const neckK = { ...outK, back, faceShift: hx * 6 + 172 * Math.sin(yF) * 0.6 };
    if (OUT?.neck && !loafMode) { ctx.save(); head(ctx); OUT.neck(ctx, neckK); ctx.restore(); }
    // หูกับหัวกลืนเป็นก้อนเดียว: ไม่มีเส้นตัดโคนหู เส้นกระหม่อมระหว่างหูยังอยู่ (เป็นขอบนอก)
    drawLayer(ctx, [...ears, headPart()], pal, hooks, opt);
    // ของบนหู: หมุนตามหูขวาที่กระดิก
    if (OUT?.ear) {
      ctx.save();
      head(ctx);
      const ra = earLag - v('ear') * 0.3 + (twitchSide === 'right' || twitchSide === 'both' ? twitch : 0);
      rotAt(ctx, M.piv['ear-right'], ra * 0.8);
      OUT.ear(ctx, outK);
      ctx.restore();
    }
  };
  const face = (c) => {
    head(c);
    c.translate(hx * 8, hy * 5);         // หน้าเลื่อนมากกว่าโครงหัว = หันหน้า
  };

  const hooks = {
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
        const cy = 356 + yawn * 6, rx = 12 + yawn * 7, ry = 10 + yawn * 14;
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
      const coolAng = roll * 1.25 + tilt;   // มุมเอียงรวมของตัว (roll) กับหัว (tilt) บนจอ
      // ขยิบตาขวา: ท่าลอยเฟี้ยว / ภูมิใจ (smug) — โค้ง ∩ แบบในชีท ตาซ้ายเปิดปกติ
      if (side === 'right' && (cool || mood === 'smug')) return closedEye(c, e, pal, 'happy');
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
        sparkle: starry || eyesOpenHappy ? 1 : 0,
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
        ctx.translate(172 * Math.sin(yF) * (front ? 0.35 : 0.12), 0);
      } else {
        const vis = yawFeature(ctx, opCenterX(op));
        if (vis < 0.12) { ctx.restore(); continue; }
      }
      drawOps(ctx, [op], pal, hooks, opt);
      ctx.restore();
    }
  };

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
    drawLayer(ctx, [{ small: true, sil: [LOAF.base], all: LOAF.base, xf: grow, det: (c) => loafBaseDetails(c, pal, opt.noStripes) }], pal, hooks, opt);
    drawLayer(ctx, [{ small: true, sil: [TL.path], all: TL.path, xf: grow, det: (c) => loafTailDetails(c, TL, pal, opt.noStripes) }], pal, hooks, opt);
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
    ctx.fill(LOAF.chest);
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
    ctx.stroke(LOAF.legs);
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
      OUT.neck(ctx, { ...outK, back: false, faceShift: hx * 6 });
      ctx.setTransform(m2);
      ctx.restore();
    }
    ctx.save();
    face(ctx);
    drawFace();
    ctx.restore();
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
      drawLayer(ctx, [
        bandItem(TS2, (c) => tailDetails(c, TS2, pal, opt.noStripes)),
        { sil: [SIT2.body], all: SIT2.body, xf: grow, det: bodyDet },
      ], pal, hooks, opt);
      // กระโปรงตอนนั่ง: คลุมตัก แผ่ลงพื้น — ขาหน้าวาดทับ (ขาอยู่หน้ากระโปรง)
      if (OUT?.skirt) { ctx.save(); grow(ctx); OUT.skirt(ctx, { ...outK, mode: 'sit' }); ctx.restore(); }
      // ── ขาหน้า (ตามแบบ): สองท่อนอวบตั้งตรงหน้าตัว ปลายเป็นอุ้งเท้ากลมครีม มีขีดนิ้ว ──
      // วาดเป็นชั้นของตัวเองทับตัว เส้นรอบขาจึงครบ (ข้าง + ปลายมน) · ตัดขอบบนทิ้ง ขาจึงกลืนเข้ากับอก
      // สองขาชิดกันตรงบน (เส้นกลืนเป็นเส้นเดียว) แล้วแยกออกช่วงล่าง = ร่องระหว่างขาแบบในแบบ
      const m0 = ctx.getTransform();
      ctx.save();
      grow(ctx);
      const below = new Path2D();
      below.rect(0, 574, 600, 200);   // เริ่มใต้อกครีม — ขอบตัดไม่ทับครีม จึงไม่เห็นรอยต่อจาง ๆ
      ctx.clip(below);
      ctx.setTransform(m0);
      const legSil = lift > 0 ? [SIT2.legR] : [SIT2.legL, SIT2.legR];
      const pawXs = lift > 0 ? [336] : [264, 336];
      drawLayer(ctx, [{ small: true, sil: legSil, all: lift > 0 ? SIT2.legR : SIT2.legAll, xf: grow, det: (c) => {
        c.fillStyle = pal.cream;
        c.beginPath();
        c.ellipse(300, 512, 52, 60, 0, 0, TAU);   // อกครีมไหลต่อลงมาบนโคนขา (ไม่โดนขาตัดเป็นขอบตรง)
        c.fill();
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
      ctx.restore();
      drawHeadLayers();
      ctx.save();
      face(ctx);
      drawFace();
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
    if (OUT?.skirt) {
      ctx.save(); grow(ctx); OUT.skirt(ctx, { ...outK, mode: 'sit' }); ctx.restore();
      // แขนสองข้างอยู่หน้ากระโปรงเสมอ: วาดแขนทับเฉพาะช่วงที่กระโปรงอยู่ (ข้างบนยังกลืนกับตัวเหมือนเดิม)
      const m3 = ctx.getTransform();
      ctx.save();
      grow(ctx);
      ctx.beginPath();
      ctx.rect(0, 500, 600, 300);
      ctx.clip();
      ctx.setTransform(m3);
      drawLayer(ctx, [{ ...bandItem(bandUpL, armDet), small: true }, { ...bandItem(bandR, armDet), small: true }], pal, hooks, opt);
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
      drawLayer(ctx, [{ ...bandItem(bandR, () => {}), small: true }], pal, hooks, opt);
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
    ctx.fillStyle = pal.cat;
    ctx.fill(bandLoL.path);
    ctx.restore();
    const pl = pawOf(bandLoL, pal, 28, 22);
    const allL = new Path2D();
    allL.addPath(bandLoL.path);
    // ศอกมน: วงกลมขนาดเท่าปลายแขนท่อนบน (เส้นศอกทับเส้นเดิมพอดี ไม่ซ้อนหนา)
    const elbowCap = new Path2D();
    elbowCap.arc(bandLoL.pts[0].x, bandLoL.pts[0].y, bandUpL.half(bandUpL.N), 0, TAU);
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
        if (!opt.noStripes) {
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
      ctx.fillStyle = pal.cat;
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
    ctx.restore();
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
  if (!back && kickAny > 0.05) {
    const fil = new Path2D();
    const [fx, fy] = upperPt(300, 577);
    fil.ellipse(fx, fy, 28 * clamp01(kickAny * 3), 12 * clamp01(kickAny * 3), 0.38, 0, TAU);
    limbs.push({ sil: [fil], all: fil, det: () => {} });
  }

  // ── ชั้นตัว (กลืนเป็นก้อนเดียว) — ด้านหน้าหางอยู่หลังสุด · ด้านหลังหางอยู่หน้าสุด ──
  // ด้านหลัง: หางพาดอยู่หน้าตัว ต้องเป็นชั้นของตัวเอง (เส้นรอบหางทับตัว) — ชั้นเดียวกันแล้วเส้นหางถูกเนื้อตัวกลบหาย
  if (back) {
    drawLayer(ctx, limbs, pal, hooks, opt);
    // ด้านหลัง: กระโปรงอยู่ใต้หาง (หางพาดทับกระโปรง)
    if (OUT?.skirt) OUT.skirt(ctx, { ...outK, back: true, pt: torsoPt });
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
  } else drawLayer(ctx, [tail, ...limbs], pal, hooks, opt);
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

  if (!back) {
    ctx.save();
    upper(ctx);
    drawOps(ctx, P.belly.det, pal, hooks, opt);
    ctx.restore();
    if (useHold) {
      // (แขนกับหัวใจวาดหลังหน้า — อุ้งเท้าแตะใต้คาง ต้องอยู่หน้าหัว)
    } else {
      if (!raisedL) frontArm('left', armL);
      if (!raisedR && !useChin) frontArm('right', armR);
    }
  }

  // กระโปรง/เสื้อของชุด (ท่ายืน): ทับตัวกับแขน ใต้หัว
  // ตัวป้อมขึ้นตอนถือหัวใจ (fatX) — กระโปรงบานตามตัว
  // ถือ/รับหัวใจ: ตัวป้อมแค่ช่วงอก — กระโปรงแนบตัวตาม (ไม่บานเพิ่ม) และชายบานน้อยลงเพราะแขนพับหน้าตัว
  // ลำตัวป้อมไม่เท่ากันทั้งตัว (เฉพาะช่วงอก-เอว) — ถ้ากระโปรงดัดตามนั้นตรง ๆ ขอบบนจะกว้าง ชายแคบ = ทรงกล่องแข็ง
  // จึงขยายกระโปรงทั้งผืนเท่ากันตามความกว้างที่เอว ทรงระฆังเดิมจึงคงอยู่ แค่ใหญ่ขึ้นพอดีตัว
  const skF = fatX - 1;
  const bel = (y) => clamp01((y - 430) / 50) * (1 - clamp01((y - 492) / 40));
  const skirtPt = (x, y) => torsoPt(300 + (x - 300) * (1 + skF * 1.4) / (1 + skF * 1.4 * bel(y)), y);
  if (OUT?.skirt && !back) OUT.skirt(ctx, { ...outK, back, hold: clamp01(skF / 0.08), pt: skirtPt });
  // เงาหัวตกบนอก (พ่นสีใต้คาง ตามชีท)
  if (!back && airbrushOn()) castShade(ctx, [{ sil: M.headShaped.sil, xf: head }], limbs, shadeRgba(pal, 0.85), 26, 18);
  // ── ชั้นหัว: หู + หัว (เส้นคางคั่นกับตัวตามแบบ) แล้วหน้า/หนวด ──
  drawHeadLayers();
  ctx.save();
  if (back) {
    head(ctx);
    drawOps(ctx, P.whiskers.det, pal, hooks, opt);
  } else {
    face(ctx);
    drawFace();
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
  ctx.restore();
}
