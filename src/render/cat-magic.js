/**
 * น้องแมวส้ม ท่าปล่อยพลังเวท — ท่าแมวเตรียมสู้ (ผู้ใช้ 27 พ.ย. 2026)
 * ภาพจากไฟล์นักออกแบบ src/render/cat-magic/orange-cat-magic-final-New.svg (โมจิวาดใหม่ 27 พ.ย. · ต้นฉบับ public/orange-cat-magic-final-New.svg)
 *   ไฟล์ใหม่ = ขนาดเดิม เลื่อน (−26.221, −32.626) จากไฟล์แรก → อ่านแล้วเลื่อนกลับ (viewBox) จุดหมุนชุดเดิมใช้ได้ตรง ๆ
 *   มีตาหลับ (eye-closes) · ปากอ้า (mouth-opent) · ปากปิด (mouth-cloes) · จมูก (nose) แยกชั้น → กะพริบ/หุบปากด้วยภาพจริง
 *   ชิ้นตัวห่อในกลุ่มตัดขอบ (class clip) ไม่มีชื่อ → หาชิ้นจากชื่อกลุ่มข้างใน
 *   ไฟล์แยกกลุ่มไว้แล้ว 14 ชิ้น: ริบบิ้นเวทหลัง · หาง · ตัว+เท้าหลัง · ขาหลังยก · แขนร่ายเวท · หัว+หู · ตา 2 · จมูก+ปาก
 *   · อุ้งเท้าพับ · ขีดแก้ม · ดาวเวท · ริบบิ้นเวทหน้า · ประกาย
 * แต่ละกลุ่ม → ภาพของตัวเอง (ตัดเฉพาะส่วนที่มีภาพ) ขยับด้วยหมุน/ย่อ-ขยาย/เลื่อนรอบจุดหมุนของชิ้น
 * ท่าในไฟล์ = จังหวะหลังปล่อยพลังพอดี → ท่าเริ่ม: ดาว/ริบบิ้นสลายไป ตัวเอนหลังง้างแขนรวมพลัง → ยื่นอุ้งเท้าปล่อยดาว
 *   → ริบบิ้นเวทหมุนวนเข้ามา ประกายแตกกระจาย → ค้างท่าตามไฟล์ (หายใจ หางไหว ดาวเต้น ตากะพริบ)
 *
 * หน่วย: (0,0) = พื้นใต้ตัวตรงกลาง · พื้น → ปลายหู = CAT_MAGIC.H (100) · หันขวาตามไฟล์ (หาศัตรู) · o.flip = หันซ้าย
 * drawCatMagic(ctx, x, groundY, s, o) — o: state st t explode flip · คืนค่าท่า
 * ทุกอย่างคิดจากเวลา → ลากเวลาย้อนได้ภาพเดิม
 */
import SRC from './cat-magic/orange-cat-magic-final-New.svg?raw';
const SHIFT = [-26.221, -32.626];   // ไฟล์ใหม่ → พิกัดไฟล์แรก

export const CAT_MAGIC = {
  name: 'น้องส้ม',
  title: 'ท่าปล่อยพลังเวท',
  H: 100, hover: 0, top: 4, halfW: 72,
  ratio: 1,
};
export const CAT_MAGIC_STATES = {
  cast: { name: 'ปล่อยพลังเวท', em: '✨', note: 'ขยับตัวนิด ๆ เอนหลังง้างอุ้งเท้ารวมพลัง แล้วยื่นปล่อยดาวเวท ริบบิ้นเวทหมุนวน ประกายแตกกระจาย', dur: 2.4 },
};
/** จังหวะท่า (วินาทีในท่า) — ตอนลงเกมให้ปล่อยของ/เสียงตามนี้ ท่าทางจะตรงกัน */
export const CAT_MAGIC_ACT = { cast: { release: 0.95 } };

// ── ชิ้นส่วน (ลำดับชั้นตามไฟล์) ──
const VB = { w: 1536, h: 1024 };
const GROUND = 945, CX = 690, UNIT = (GROUND - 40) / CAT_MAGIC.H;
const PARTS = ['magic-back', 'tail', 'torso-and-rear-foot', 'forward-rear-paw', 'casting-arm', 'arm-crease', 'head-and-ears', 'left-eye', 'right-eye', 'eye-closes',
  'mouth-opent', 'mouth-cloes', 'nose', 'tucked-front-paw', 'cheek-marks', 'magic-star', 'magic-front', 'sparkles'];
const HEAD = new Set(['head-and-ears', 'left-eye', 'right-eye', 'eye-closes', 'mouth-opent', 'mouth-cloes', 'nose', 'cheek-marks']);
// จุดหมุน (พิกัดไฟล์)
const PIV = {
  hip: [640, 760], tail: [495, 625], rearPaw: [540, 700], shoulder: [820, 612], neck: [730, 548], tuck: [612, 548],
  star: [1172, 535], paw: [1052, 556], eyeL: [742, 380], eyeR: [935, 425], mouth: [840, 468], swirl: [740, 560],
};
const PAW = PIV.paw;
const EXPLODE = {
  'magic-back': [0, -60], tail: [-120, -30], 'forward-rear-paw': [-90, 70], 'casting-arm': [110, 30], 'head-and-ears': [-20, -110],
  'left-eye': [-20, -110], 'right-eye': [-20, -110], 'eye-closes': [-20, -110], 'mouth-opent': [-20, -110], 'mouth-cloes': [-20, -110], nose: [-20, -110], 'cheek-marks': [-50, -120],
  'tucked-front-paw': [-60, 10], 'magic-star': [190, 20], 'magic-front': [0, 70], sparkles: [0, -30],
};

let IMG = null, READY = false;
/** โหลดภาพชิ้นส่วนครั้งเดียว — วาดทีละกลุ่ม (ซ่อนกลุ่มอื่น) แล้วตัดเฉพาะกรอบที่มีภาพ (ประหยัดหน่วยความจำ) */
export function loadCatMagic() {
  if (IMG) return IMG.ready;
  IMG = {};
  const doc = new DOMParser().parseFromString(SRC.slice(SRC.indexOf('<svg')), 'image/svg+xml');
  const root = doc.documentElement;
  root.setAttribute('viewBox', `${SHIFT[0]} ${SHIFT[1]} ${VB.w} ${VB.h}`);
  root.setAttribute('width', VB.w); root.setAttribute('height', VB.h);
  const top = [...root.children].filter((e) => e.tagName === 'g' || e.tagName === 'path');
  // ชื่อชิ้น = id ของตัวเอง หรือของกลุ่มชั้นแรกข้างใน (ชิ้นที่ห่อในกลุ่มตัดขอบ)
  const nameOf = (e) => e.id || [...e.children].find((c) => c.id)?.id || '';
  // เส้นพับข้อศอก (ขีดสั้นบนโคนแขนร่ายเวท) แยกเป็นชั้นของตัวเอง → จางหายตอนหดแขน ไม่โผล่กลางตัว (ผู้ใช้ 27 พ.ย.)
  const arm = doc.getElementById('casting-arm'), crease = arm?.querySelector('path.cls-40');
  crease?.setAttribute('display', 'none');
  const jobs = PARTS.map((id) => new Promise((ok) => {
    const only = id === 'arm-crease';
    if (only && !crease) { ok(); return; }
    for (const g of top) g.setAttribute('display', nameOf(g) === (only ? 'casting-arm' : id) ? 'inline' : 'none');
    if (only) { for (const c of arm.children) c.setAttribute('display', c === crease ? 'inline' : 'none'); }
    const xml = new XMLSerializer().serializeToString(doc);
    if (only) { for (const c of arm.children) c.removeAttribute('display'); crease.setAttribute('display', 'none'); }
    const im = new Image();
    im.onload = () => { const p = crop(im); if (p) IMG[id] = p; ok(); };
    im.onerror = () => ok();
    im.src = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  }));
  IMG.ready = Promise.all(jobs).then(() => { READY = true; });
  return IMG.ready;
}
function crop(im) {
  const W = VB.w, H = VB.h;
  const full = document.createElement('canvas'); full.width = W; full.height = H;
  const f = full.getContext('2d', { willReadFrequently: true });
  f.drawImage(im, 0, 0, W, H);
  const d = f.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    const row = y * W * 4;
    for (let x = 0; x < W; x++) if (d[row + x * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; y1 = y; }
  }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(W - 1, x1 + 2); y1 = Math.min(H - 1, y1 + 2);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  cv.getContext('2d').drawImage(full, x0, y0, w, h, 0, 0, w, h);
  return { cv, x: x0, y: y0, w, h };
}

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const easeOut = (k) => { k = clamp(k); return 1 - (1 - k) ** 3; };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const back = (k) => { k = clamp(k); const s = 2.2; return 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2; };
const about = (c, [px, py], a = 0, sx = 1, sy = 1) => { c.translate(px, py); if (a) c.rotate(a); if (sx !== 1 || sy !== 1) c.scale(sx, sy); c.translate(-px, -py); };
const bump = (t, a, b) => (t <= a || t >= b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI));

// ───────── ท่าทาง ─────────
/**
 * P: x y (เลื่อนทั้งตัว หน่วยไฟล์) sx sy (ยืดรอบเท้า) rot (เอียงรอบสะโพก · ลบ = เอนหลัง)
 *    arm armX armSx (แขนร่ายเวทหมุน/ถอยรอบไหล่) · head tail rear tuck (มุมของชิ้น) · mouth blink
 *    star { s, a, rot } · glow (แสงรวมพลังรอบดาว 0..1) · rib { a, s, rot } ริบบิ้นเวท · spk { a, s } ประกาย
 *    burst (เวลาหลังปล่อยพลัง · -1 = ยังไม่ปล่อย)
 */
export function catMagicPose(state, st, t) {
  const R = CAT_MAGIC_ACT.cast.release;
  const P = { x: 0, y: 0, sx: 1, sy: 1, rot: 0, arm: 0, armX: 0, armSx: 1, head: 0, tail: 0, rear: 0, tuck: 0, mouth: 1, blink: false, shut: false, crease: 1,
    star: { s: 1, a: 1, rot: 0, dx: 0, dy: 0 }, glow: 0, rib: { a: 1, s: 1, rot: 0 }, spk: { a: 1, s: 1 }, burst: -1,
    shake: 0, eyes: 'angry', flame: 0, crackMin: 0, fade: 1, rays: 0 };
  // ชั้นพื้นฐาน (ตลอดท่า): หายใจ ตัวลอยขึ้นลงนิด ๆ หางไหว หัวเอียงตาม
  const br = Math.sin((t / 2.6) * TAU);
  P.y += br * 5; P.sy += br * 0.012; P.sx -= br * 0.008;
  P.tail += Math.sin(t * 2.3) * 0.07;
  P.head += Math.sin((t / 2.6) * TAU + 0.9) * 0.015;
  P.rear += Math.sin(t * 2.3 + 1.1) * 0.03;
  if (state !== 'cast') return P;

  // ง้าง: เอนหลัง ย่อตัว ดึงแขนกลับ (ค้างไว้จนปล่อย แล้วดีดกลับเร็ว)
  const wind = ease(seg(st, 0.05, 0.8)) * (1 - easeOut(seg(st, R, R + 0.1)));
  // พุ่ง: ยื่นสุดที่ ~0.1 วิหลังปล่อย แล้วเด้งกลับนิ่งแบบสปริง
  const tau = st - R;
  const thrust = tau < 0 ? 0 : tau < 0.1 ? Math.sin((tau / 0.1) * Math.PI / 2) : Math.exp(-(tau - 0.1) * 5.5) * Math.cos((tau - 0.1) * 11);
  // สั่นเบา ๆ ตอนรวมพลังเต็ม (ก่อนปล่อย)
  const charge = ease(seg(st, 0.3, R));
  const tremble = st < R ? Math.sin(t * 70) * 1.6 * charge * charge : 0;

  P.rot += -0.075 * wind + 0.045 * thrust;
  P.x += -14 * wind + 20 * thrust + tremble;
  P.y += -8 * wind;
  P.sy *= 1 - 0.035 * wind + 0.02 * thrust; P.sx *= 1 + 0.025 * wind - 0.015 * thrust;
  // ง้างแขน = ดึงกลับต่ำ ๆ ใต้แก้ม (ไม่ยกขึ้นบังหน้า) · ปล่อย = ยื่นสุดแขน
  P.arm += 0.035 * wind - 0.02 * thrust;   // หมุนน้อย ขอบบนแขนติดใต้คางตลอด (ไม่เกิดเส้นซ้อน/ช่องว่างใต้คาง)
  P.armX += -18 * wind;   // ง้าง = เลื่อนถอยตามแนวแขน · ปล่อย = ยืดจากไหล่แทน (ไม่เลื่อนออก — ขอบโคนแขนไม่โผล่บนตัว)
  P.armSx *= 1 - 0.07 * wind + 0.05 * thrust;   // ยืดหดน้อย ๆ รอบไหล่ — อุ้งเท้าไม่บีบแบน (ผู้ใช้ 27 พ.ย.: สมส่วน)
  P.head += -0.015 * wind + 0.012 * thrust;
  P.tail += 0.16 * wind - 0.12 * thrust;
  P.rear += 0.13 * wind - 0.1 * thrust;
  P.tuck += -0.12 * wind + 0.08 * thrust;
  // ปาก: หุบตอนเกร็งรวมพลัง → ตะโกนกว้างตอนปล่อย
  // ปาก: หุบปิด (ภาพปากปิด) ตอนเกร็งรวมพลัง → ตะโกนอ้า (ภาพปากอ้า) เด้งขยายตอนปล่อย
  P.shut = st > 0.32 && st < R - 0.02;
  P.mouth = st < R ? 1 : 0.8 + 0.2 * back(seg(st, R, R + 0.3));
  // ตากะพริบหนึ่งครั้งตอนค้างท่า
  // ตาหลับ (ภาพตาหลับของโมจิ) กะพริบหนึ่งครั้งตอนค้างท่า + หลับตาแน่นแวบหนึ่งตอนแสงวาบปล่อยพลัง
  // เส้นพับข้อศอก: จางหายตามจังหวะหดแขน → ค่อย ๆ กลับมาตอนยื่นแขนออกไปใหม่
  P.crease = st < R ? 1 - ease(seg(st, 0.05, 0.5)) : ease(seg(st, R + 0.03, R + 0.32));
  P.blink = (st > 2.55 && st < 2.7) || (st > R && st < R + 0.09);

  // ดาวเวท: ของเดิมหดหายตอนเริ่ม → ดาวดวงเล็กก่อตัวที่อุ้งเท้า (เต้นตุบ ๆ ถี่ขึ้น) → ปล่อยออกโตเกินแล้วเด้งเข้าขนาดจริง
  const gone = easeOut(seg(st, 0, 0.22));
  if (st < R) {
    const pulse = 1 + 0.1 * Math.sin(t * (14 + charge * 16)) * charge;
    const oldS = 1 - 0.7 * gone, newS = (0.22 + 0.32 * charge) * pulse;
    const usingNew = st > 0.22;
    P.star.s = usingNew ? newS : oldS;
    P.star.a = usingNew ? 0.35 + 0.65 * ease(seg(st, 0.22, 0.5)) : 1 - gone;
    P.star.rot = usingNew ? -0.6 + charge * 0.5 : gone * 0.6;
    P.glow = usingNew ? charge * (0.75 + 0.25 * Math.sin(t * 22)) : 0;
    if (usingNew) { P.star.dx = PAW[0] - PIV.star[0]; P.star.dy = PAW[1] - PIV.star[1]; }   // ดาวดวงใหม่ก่อตัวในอุ้งเท้า
  } else {
    const p = seg(st, R, R + 0.28);
    P.star.s = (0.54 + 0.46 * back(p)) * (1 + 0.035 * Math.sin(t * 4.2));
    P.star.a = 1;
    const go = 1 - easeOut(seg(st, R, R + 0.16));   // พุ่งออกจากอุ้งเท้าไปที่เดิมในไฟล์
    P.star.dx = (PAW[0] - PIV.star[0]) * go; P.star.dy = (PAW[1] - PIV.star[1]) * go;
    P.star.rot = -0.1 * (1 - easeOut(seg(st, R, R + 0.7))) * 6 + Math.sin(t * 1.6) * 0.05;
    P.glow = Math.max(0, 1 - tau / 0.45) * 1.3 + 0.18 + 0.08 * Math.sin(t * 5);
    P.burst = tau;
  }
  // ริบบิ้นเวท: ของเดิมสลายออก (หมุนต่อ + ขยาย + จาง) → หลังปล่อยหมุนวนเข้ามาจากมุมเอียง ย่อแล้วขยายเข้าที่
  if (st < R) {
    P.rib.a = 1 - gone; P.rib.s = 1 + 0.1 * gone; P.rib.rot = 0.22 * gone;
    P.spk.a = 1 - gone; P.spk.s = 1 + 0.12 * gone;
  } else {
    const k = easeOut(seg(st, R + 0.02, R + 0.75));
    P.rib.a = ease(seg(st, R, R + 0.45)); P.rib.s = 0.72 + 0.28 * k; P.rib.rot = -0.55 * (1 - k) + Math.sin(t * 0.9) * 0.018;
    const q = easeOut(seg(st, R + 0.08, R + 0.6));
    P.spk.a = q * (0.82 + 0.18 * Math.sin(t * 5.5)); P.spk.s = 0.55 + 0.45 * q;
  }
  P.rays = P.glow;
  return P;
}

// ───────── วาด ─────────
export function drawCatMagic(ctx, x, groundY, s, o = {}) {
  const state = o.state || 'cast', st = o.st || 0, t = o.t || 0;
  const P = catMagicPose(state, st, t);
  if (!READY) { loadCatMagic(); return P; }
  const ex = o.explode || 0;
  const k = s / UNIT, face = o.flip ? -1 : 1;
  const body = (c) => {
    c.translate(x, groundY);
    c.scale(k * face, k);
    c.translate(-CX, -GROUND);
    about(c, [CX, GROUND], 0, P.sx, P.sy);
    c.translate(P.x, -P.y);
    about(c, PIV.hip, P.rot);
  };
  const arm = (c) => { c.translate(P.armX, 0); about(c, PIV.shoulder, P.arm, P.armSx, 1); };
  const head = (c) => about(c, PIV.neck, P.head);
  const XF = {
    'magic-back': (c) => about(c, PIV.swirl, P.rib.rot, P.rib.s, P.rib.s),
    'magic-front': (c) => about(c, PIV.swirl, P.rib.rot * 1.25, P.rib.s, P.rib.s),
    sparkles: (c) => about(c, PIV.swirl, 0, P.spk.s, P.spk.s),
    tail: (c) => about(c, PIV.tail, P.tail),
    'forward-rear-paw': (c) => about(c, PIV.rearPaw, P.rear),
    'casting-arm': arm,
    'arm-crease': arm,
    'mouth-opent': (c) => about(c, PIV.mouth, 0, P.mouth, P.mouth),
    'tucked-front-paw': (c) => about(c, PIV.tuck, P.tuck),
    'magic-star': (c) => { arm(c); c.translate(P.star.dx, P.star.dy); about(c, PIV.star, P.star.rot, P.star.s, P.star.s); },
  };
  const ALPHA = { 'magic-back': P.rib.a, 'magic-front': P.rib.a, sparkles: P.spk.a, 'magic-star': P.star.a, 'arm-crease': P.crease,
    'left-eye': P.blink ? 0 : 1, 'right-eye': P.blink ? 0 : 1, 'eye-closes': P.blink ? 1 : 0, 'mouth-opent': P.shut ? 0 : 1, 'mouth-cloes': P.shut ? 1 : 0 };

  ctx.save();
  // เงาใต้ตัว (ตัวลอยกลางอากาศตามไฟล์ → เงานุ่มเล็ก)
  ctx.save();
  ctx.globalAlpha *= 0.16;
  ctx.fillStyle = '#5A3420';
  ctx.beginPath();
  ctx.ellipse(x + (40 + P.x) * k * face, groundY, 260 * k * (1 - P.y / 400), 26 * k, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  for (const id of PARTS) {
    const p = IMG[id];
    if (!p) continue;
    const a = ALPHA[id] ?? 1;
    if (a <= 0.005) continue;
    // แสงรวมพลัง/แสงวาบรอบดาว (ใต้ดาว)
    if (id === 'magic-star' && P.glow > 0.01) {
      ctx.save(); body(ctx); arm(ctx); ctx.translate(P.star.dx, P.star.dy);
      const [gx, gy] = PIV.star, r = 120 + 110 * Math.min(1, P.glow);
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      g.addColorStop(0, `rgba(255,250,215,${0.85 * Math.min(1, P.glow)})`);
      g.addColorStop(0.45, `rgba(255,214,150,${0.45 * Math.min(1, P.glow)})`);
      g.addColorStop(1, 'rgba(245,170,220,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, TAU); ctx.fill();
      ctx.restore();
    }
    const [dx, dy] = (EXPLODE[id] || [0, 0]).map((v) => v * ex);
    ctx.save();
    body(ctx);
    if (HEAD.has(id)) head(ctx);   // หัว ตา ปาก จมูก ขีดแก้ม หมุนรอบคอไปด้วยกัน
    XF[id]?.(ctx);
    ctx.globalAlpha *= a;
    ctx.drawImage(p.cv, p.x + dx, p.y + dy, p.w, p.h);
    ctx.restore();
  }

  // ปล่อยพลัง: วงแสงขยาย + ประกายดาวแตกกระจายจากอุ้งเท้า
  if (P.burst >= 0 && P.burst < 0.9) {
    ctx.save(); body(ctx); arm(ctx);
    const [cx, cy] = PIV.star, b = P.burst;
    const ring = easeOut(b / 0.45);
    if (b < 0.45) {
      ctx.globalAlpha = (1 - ring) * 0.9;
      ctx.strokeStyle = '#FFF4C8'; ctx.lineWidth = 22 * (1 - ring) + 4;
      ctx.beginPath(); ctx.arc(cx, cy, 60 + ring * 260, 0, TAU); ctx.stroke();
      ctx.globalAlpha = (1 - ring) * 0.6;
      ctx.strokeStyle = '#F5A9D4'; ctx.lineWidth = 10 * (1 - ring) + 2;
      ctx.beginPath(); ctx.arc(cx, cy, 40 + ring * 190, 0, TAU); ctx.stroke();
    }
    const fly = easeOut(b / 0.8);
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * TAU + 0.35 + (i % 2) * 0.18, dist = 70 + fly * (200 + (i % 3) * 70);
      const sz = (i % 3 === 0 ? 34 : 22) * (1 - fly * 0.7);
      ctx.globalAlpha = Math.max(0, 1 - b / 0.8);
      sparkle(ctx, cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist * 0.8, sz, i % 2 ? '#FFF3B0' : '#FFD1EA');
    }
    ctx.restore();
  }
  ctx.restore();
  return P;
}
/** ประกาย 4 แฉก */
function sparkle(c, x, y, r, col) {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y);
  c.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r);
  c.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y);
  c.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r);
  c.fill();
}
