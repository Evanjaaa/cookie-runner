/**
 * บอสกล้วยราคี (บอสตัวแรกของเกม · ธีมต้นกล้วย — ผู้ใช้ 26 พ.ย. 2026)
 * ภาพจากไฟล์นักออกแบบ 3 ท่า (src/render/bosses/banana/*.svg · พิกัดชุดเดียวกัน):
 *   banana-boss-final.svg        ท่าหลัก — ใบกล้วย · เครือกล้วยบนหัว · ตัว(+แขนขวา) · แขนซ้าย · ขา 2 · รากเอว · หน้า · ปลีเขา · กำปั้น 2
 *   banana-boss-grab-final.svg   ท่าเอื้อมจับกล้วยบนหลัง — แขนซ้ายยก + มือจับกล้วย
 *   banana-boss-throw-final.svg  ท่าปากล้วย — แขนเหวี่ยง + มือแบ + กล้วยที่ปา + เส้นลม (ไฟล์นี้มี transform จัดวาง — ถอดออกแล้วพิกัดตรงกัน)
 * แต่ละกลุ่ม → ภาพของตัวเอง ขยับทีละชิ้นด้วยหมุน/ย่อ-ขยาย/เลื่อนรอบจุดหมุน · สลับชิ้นแขนตามท่า
 * เส้นขอบนอกหนา (outer-outline ในไฟล์ = เงาทึบทั้งตัวท่าเดียว ขยับตามชิ้นไม่ได้) → สร้างขอบเข้มต่อชิ้น (ขยายเงาชิ้นออก) วาดชั้นล่างสุด
 *
 * หน่วย: (0,0) = พื้นใต้ตัวตรงกลาง · พื้น → ยอดเครือกล้วย = BANANA_BOSS.H (100) · หันซ้ายตามไฟล์ (หาน้อง) · gaze > 0 = หันขวา
 * drawBananaBoss(ctx, x, groundY, s, o) — o: state st t gaze bob explode hitT · คืนค่าท่า
 * ทุกอย่างคิดจากเวลา → ลากเวลาย้อนได้ภาพเดิม
 */
import BASE from './banana/banana-boss-final.svg?raw';
import GRAB from './banana/banana-boss-grab-final.svg?raw';
import THROW from './banana/banana-boss-throw-final.svg?raw';

export const BANANA_BOSS = {
  name: 'บอสกล้วยราคี',
  title: 'จอมโหดแห่งสวนกล้วย',
  H: 100, hover: 0, top: 24, halfW: 66,
  ratio: 2.0,
};
export const BANANA_BOSS_STATES = {
  idle:   { name: 'ยืนขู่',         em: '😈', note: 'หายใจ ตัวโยก ใบกล้วยไหว เครือกล้วยเด้ง กำปั้นบีบ', loop: 3.2 },
  enter:  { name: 'เปิดตัว',         em: '🎬', note: 'ตกลงจากฟ้า กระแทกพื้นฝุ่นฟุ้ง แล้วคำรามชูกำปั้น', dur: 2.6 },
  throw:  { name: 'ปากล้วย',         em: '🍌', note: 'เอื้อมจับกล้วยบนหลัง เอนตัวง้าง แล้วเหวี่ยงปากล้วยหมุนติ้วไปหาน้อง', dur: 2.6 },
  slam:   { name: 'กระแทกพื้น',       em: '💥', note: 'ย่อตัว กระโดด แล้วทิ้งตัวกระแทกพื้น คลื่นฝุ่นแผ่ (กระโดดข้าม)', dur: 2.4 },
  tired:  { name: 'เหนื่อย',          em: '😵', note: 'ตัวทรุด ใบกล้วยตก กำปั้นห้อย หอบ', loop: 1.8 },
  defeat: { name: 'แพ้',             em: '💫', note: 'สั่น แสงกะพริบ เครือกล้วยหลุดกระเด็น ล้มหงาย แล้วสลายเป็นประกาย', dur: 4.4 },
};
/** จังหวะท่า (วินาทีในท่า) — หน้าเกมปล่อยกล้วย/คลื่นตามนี้ ท่าทางจะตรงกัน */
export const BANANA_BOSS_ACT = { throw: { release: 1.05 }, slam: { land: 1.25 } };

// ── ชิ้นส่วน ──
const VB = { x: -420, y: 230, w: 1510, h: 860 };   // เผื่อซ้าย: กล้วยที่ปา + เส้นลมในไฟล์ท่าปาอยู่นอกตัวทางซ้าย
const GROUND = 1066, CX = 545, UNIT = (GROUND - 270) / BANANA_BOSS.H;
const INK = '#583720';
const PARTS = {
  base: ['leaves', 'banana-crown', 'torso', 'left-arm', 'left-leg', 'right-leg', 'waist', 'face', 'horn', 'left-fist', 'right-fist'],
  grab: ['raised-left-arm', 'raised-left-hand'],
  throw: ['throwing-left-arm', 'open-left-hand', 'thrown-banana', 'throw-motion'],
};
const SRC = { base: BASE, grab: GRAB, throw: THROW };
// จุดหมุน (พิกัดไฟล์)
const PIV = {
  hip: [545, 930], crownBase: [450, 560], leafBase: [500, 600], face: [345, 685], horn: [300, 640],
  shoulderL: [262, 770], fistL: [137, 899], fistR: [893, 730], waist: [550, 790], banana: [-207, 605],   // กลางกล้วยที่ปา (พิกัดท่าหลัก)
};
const EXPLODE = {
  leaves: [0, -90], 'banana-crown': [-20, -150], torso: [40, 0], 'left-arm': [-60, 20], 'left-leg': [-40, 110], 'right-leg': [60, 110],
  waist: [20, 60], face: [-110, -20], horn: [-110, -110], 'left-fist': [-150, 60], 'right-fist': [150, -20],
  'raised-left-arm': [-60, -40], 'raised-left-hand': [-80, -120], 'throwing-left-arm': [-60, -40], 'open-left-hand': [-120, -40],
};

// เศษสีที่โผล่เกินในไฟล์ → ลบออกจากภาพชิ้นตอนโหลด (พิกัดไฟล์ · ผู้ใช้ 27 พ.ย.)
//   torso: สีเขียวของตัวโผล่เป็นแถบบางระหว่างใต้ปาก (หน้า) กับเส้นขอบขาซ้าย — อยู่ใต้หน้า/ขาส่วนอื่นอยู่แล้ว ลบเฉพาะแถบ
const CUT = { torso: [[[270, 812], [318, 812], [301, 866], [292, 882], [270, 882]]] };

let IMG = null, READY = false;
const RES = 1;
/** โหลดภาพชิ้นส่วนครั้งเดียว: ภาพสี + ภาพขอบเข้ม (เงาชิ้นขยายออก) */
export function loadBananaBoss() {
  if (IMG) return IMG.ready;
  IMG = {};
  const jobs = [];
  for (const [pose, ids] of Object.entries(PARTS)) {
    const doc = new DOMParser().parseFromString(SRC[pose].slice(SRC[pose].indexOf('<svg')), 'image/svg+xml');
    const root = doc.documentElement;
    root.setAttribute('viewBox', `${VB.x} ${VB.y} ${VB.w} ${VB.h}`);
    root.setAttribute('width', VB.w * RES); root.setAttribute('height', VB.h * RES);
    const top = [...root.children].filter((e) => e.tagName === 'g');
    // ไฟล์ท่าปา: ชิ้นตัว/หน้า/ขา มี transform จัดวาง (ย่อ .684 + เลื่อน) · ชิ้นแขน/มือ/กล้วย/เส้นลม วาดในพิกัดหน้ากระดาษตรง ๆ
    //   → ชิ้นที่มี transform: ถอดออก · ชิ้นที่ไม่มี: ใส่ตัวแปลงย้อนกลับ — ทุกชิ้นได้พิกัดเดียวกับท่าหลัก
    const placed = top.map((g) => g.getAttribute('transform')).find((v) => v && /matrix/.test(v));
    let inv = null;
    if (placed) {
      const [a, , , d, e, f] = placed.match(/-?[\d.]+/g).map(Number);
      inv = `matrix(${1 / a} 0 0 ${1 / d} ${-e / a} ${-f / d})`;
    }
    for (const g of top) {
      if (g.getAttribute('transform')) g.removeAttribute('transform');
      else if (inv) g.setAttribute('transform', inv);
      // ชิ้นของท่าหลัก: คงการตัดตามเงาทั้งตัว (approved-outline) แบบไฟล์ต้นฉบับ — ส่วนที่ซ่อนอยู่นอกเงาตัวไม่โผล่ (ผู้ใช้ 27 พ.ย.)
      //   ภาพถูกตัดตอนท่านิ่งแล้วค่อยขยับทั้งชิ้น → ชิ้นที่ขยับไม่โดนตัดขอบซ้ำ · ท่าจับ/ท่าปา: ไฟล์มีตัวแปลงจัดวาง เงาไม่ตรงพิกัด จึงถอดออก
      if (pose !== 'base' && /approved-outline/.test(g.getAttribute('clip-path') || '')) g.removeAttribute('clip-path');
    }
    for (const id of ids) {
      jobs.push(new Promise((ok) => {
        for (const g of top) g.setAttribute('display', g.id === id ? 'inline' : 'none');
        const im = new Image();
        im.onload = () => { const pic = CUT[id] ? cutOf(im, CUT[id]) : im; IMG[id] = { im: pic, ink: inkOf(pic) }; ok(); };
        im.onerror = () => ok();
        im.src = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' }));
      }));
    }
  }
  IMG.ready = Promise.all(jobs).then(() => { READY = true; });
  return IMG.ready;
}
/** ลบพื้นที่ (รูปหลายเหลี่ยมพิกัดไฟล์) ออกจากภาพชิ้น */
function cutOf(im, polys) {
  const W = VB.w * RES, H = VB.h * RES;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.drawImage(im, 0, 0, W, H);
  c.globalCompositeOperation = 'destination-out';
  for (const p of polys) {
    c.beginPath();
    p.forEach(([x, y], i) => c[i ? 'lineTo' : 'moveTo']((x - VB.x) * RES, (y - VB.y) * RES));
    c.fill();
  }
  return cv;
}
/** ขอบเข้มของชิ้น: ทาเงาชิ้นสีเส้น แล้วขยายออกรอบตัว ~3.5 พิกเซลไฟล์ (ผู้ใช้ 27 พ.ย.: ลดจาก 6 — ขอบนอกหนาเท่าเส้นในตัวแบบไฟล์ต้นฉบับ) */
function inkOf(im) {
  const W = VB.w * RES, H = VB.h * RES;
  const tint = document.createElement('canvas'); tint.width = W; tint.height = H;
  const t = tint.getContext('2d');
  t.drawImage(im, 0, 0, W, H);
  t.globalCompositeOperation = 'source-in'; t.fillStyle = INK; t.fillRect(0, 0, W, H);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const R = 3.5 * RES;
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; c.drawImage(tint, Math.cos(a) * R, Math.sin(a) * R); }
  c.drawImage(tint, 0, 0);
  return cv;
}

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const easeOut = (k) => { k = clamp(k); return 1 - (1 - k) ** 3; };
const easeIn = (k) => { k = clamp(k); return k * k * k; };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const back = (k) => { k = clamp(k); const s = 1.7; return 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2; };

// ───────── ท่าทาง ─────────
/**
 * P: y(ยกทั้งตัว หน่วยไฟล์) sx sy(ยืดรอบเท้า) rot(เอียงรอบสะโพก · บวก = เอนไปหลัง/ขวา) shake
 *    arm 'base'|'grab'|'throw' · armRot(แขนซ้ายหมุนรอบไหล่) · fistL/fistR [dx,dy,scale] · leaf crown horn faceK waist (มุม/ยืด)
 *    banana: { x, y, rot, a } กล้วยที่ปา (พิกัดไฟล์) · motion 0..1 เส้นลม · dust 0..1 · wave 0..1 คลื่นพื้น · flash 0..1 · fade
 */
export function bananaBossPose(state, st, t, o = {}) {
  const bob = o.bob === false ? 0 : 1;
  const P = { y: 0, x: 0, sx: 1, sy: 1, rot: 0, shake: 0, arm: 'base', armRot: 0, fistL: [0, 0, 1], fistR: [0, 0, 1],
    leaf: 0, crown: [0, 0, 0], horn: 0, faceK: 1, faceY: 0, waist: 0, banana: null, motion: 0, dust: -1, wave: -1,
    flash: 0, fade: 1, crownFly: null, sparkle: 0, eyes: 'grin', flame: 0, crackMin: 0, rays: 0 };
  const breathe = Math.sin((t / 3.2) * TAU);
  // ชั้นพื้นฐาน: หายใจ ใบไหว เครือกล้วยเด้ง กำปั้นบีบ
  const idleLayer = (k = 1) => {
    P.sy += breathe * 0.018 * bob * k; P.sx -= breathe * 0.01 * bob * k;
    P.rot += Math.sin((t / 3.2) * TAU + 0.8) * 0.012 * k;
    P.leaf += Math.sin(t * 1.7) * 0.035 * k;
    P.crown[1] += Math.sin(t * 3.4 + 0.5) * 4 * k; P.crown[2] += Math.sin(t * 1.7 + 1.2) * 0.025 * k;
    P.horn += Math.sin(t * 2.1) * 0.03 * k;
    const sq = Math.max(0, Math.sin(t * 2.4)) * 0.05 * k;
    P.fistL[2] += sq; P.fistR[2] += Math.max(0, Math.sin(t * 2.4 + 1.6)) * 0.05 * k;
    P.fistL[1] += Math.sin(t * 2.2) * 5 * k; P.fistR[1] += Math.sin(t * 2.2 + 1.3) * 6 * k;
    P.waist += Math.sin(t * 2.6) * 0.03 * k;
  };
  if (state === 'idle') idleLayer();
  else if (state === 'enter') {
    const fall = seg(st, 0, 0.55), land = seg(st, 0.55, 0.95), roar = seg(st, 1.15, 2.3);
    P.y = fall < 1 ? (1 - easeIn(fall)) * 900 : 0;
    P.sy = 1 - Math.sin(land * Math.PI) * 0.22; P.sx = 1 + Math.sin(land * Math.PI) * 0.14;
    if (land > 0 && land < 1) P.dust = land;
    if (st > 0.55 && st < 1.4) P.wave = seg(st, 0.55, 1.4);
    const r = Math.sin(roar * Math.PI);
    P.shake = roar > 0 && roar < 1 ? Math.sin(st * 60) * 5 * r : 0;
    P.faceK = 1 + r * 0.1; P.leaf = -r * 0.12 + Math.sin(st * 22) * 0.03 * r;
    P.fistL = [-r * 20, -r * 70, 1 + r * 0.15]; P.fistR = [r * 20, -r * 60, 1 + r * 0.15];
    P.armRot = r * 0.35;
    P.crown[1] = -r * 14;
    if (st > 2.3) idleLayer(seg(st, 2.3, 2.6));
  } else if (state === 'throw') {
    const R = BANANA_BOSS_ACT.throw.release;
    const reach = seg(st, 0, 0.38), hold = seg(st, 0.38, 0.85), swing = seg(st, 0.85, R), follow = seg(st, R, 1.6), rec = seg(st, 1.7, 2.4);
    idleLayer(0.4);
    if (st < 0.38) { P.armRot = ease(reach) * 1.1; P.rot = ease(reach) * 0.06; }
    else if (st < R) {
      P.arm = 'grab';
      P.rot = 0.06 + ease(hold) * 0.05 - ease(swing) * 0.05;   // เอนหลังง้าง
      P.sy = 1 + ease(hold) * 0.03; P.y = ease(hold) * 6;
      P.crown[1] = -ease(hold) * 6;
    } else if (st < 1.85) {
      P.arm = 'throw';
      const f = easeOut(follow);
      P.rot = -0.08 * Math.sin(f * Math.PI * 0.9) - 0.02;   // เหวี่ยงเอนหน้า
      P.motion = 1 - follow;
      P.faceK = 1 + Math.sin(follow * Math.PI) * 0.06;
    } else { P.rot = -0.02 * (1 - ease(rec)); }
    // กล้วยที่ปา: เกิดที่มือตอนปล่อย พุ่งไปซ้ายเป็นโค้งต่ำลง หมุนติ้ว
    if (st >= R - 0.02 && st < R + 1.4) {
      const k = seg(st, R, R + 1.4), [bx, by] = PIV.banana;
      P.banana = { x: bx - k * 1500, y: by + k * 380 - Math.sin(k * Math.PI) * 200, rot: -k * TAU * 3, a: 1 - seg(k, 0.9, 1) };
    }
  } else if (state === 'slam') {
    const L = BANANA_BOSS_ACT.slam.land;
    const crouch = seg(st, 0, 0.45), jump = seg(st, 0.45, L), land = seg(st, L, L + 0.35), rec = seg(st, 1.8, 2.4);
    if (st < 0.45) { P.sy = 1 - ease(crouch) * 0.14; P.sx = 1 + ease(crouch) * 0.08; P.fistL = [0, -ease(crouch) * 40, 1.08]; P.fistR = [0, -ease(crouch) * 50, 1.08]; P.armRot = ease(crouch) * 0.5; }
    else if (st < L) {
      const h = Math.sin(jump * Math.PI);
      P.y = h * 160; P.sy = 1 + h * 0.06; P.sx = 1 - h * 0.04;
      P.fistL = [0, -60 - h * 20, 1.12]; P.fistR = [0, -70 - h * 20, 1.12]; P.armRot = 0.6 + h * 0.2; P.leaf = -h * 0.15;
    } else {
      const sq = Math.sin(land * Math.PI) * (1 - land * 0.3);
      P.sy = 1 - sq * 0.24; P.sx = 1 + sq * 0.16;
      P.fistL = [0, 30 * sq, 1 + sq * 0.1]; P.fistR = [0, 30 * sq, 1 + sq * 0.1]; P.armRot = -0.1 * sq;
      P.leaf = sq * 0.12;
      P.shake = st < L + 0.5 ? Math.sin(st * 70) * (L + 0.5 - st) * 16 : 0;
      if (land < 1) P.dust = land;
      P.wave = seg(st, L, L + 0.9);
      idleLayer(ease(rec));
    }
  } else if (state === 'tired') {
    const pant = Math.sin((st / 0.9) * TAU);
    P.y = -14; P.sy = 0.94 + pant * 0.02; P.sx = 1.03 - pant * 0.01;
    P.rot = -0.05 + Math.sin((st / 1.8) * TAU) * 0.03;
    P.leaf = 0.22 + pant * 0.03; P.crown = [0, 10, 0.08]; P.horn = 0.1;
    P.fistL = [-6, 26, 0.96]; P.fistR = [6, 34, 0.96]; P.armRot = -0.15;
    P.faceY = 10; P.eyes = 'dizzy';
  } else if (state === 'defeat') {
    const shake = seg(st, 0, 1.3), pop = seg(st, 1.1, 2.2), fall = seg(st, 1.6, 2.7), fade = seg(st, 2.8, 4.0);
    P.shake = st < 1.6 ? Math.sin(st * 55) * 6 * (0.4 + shake) : 0;
    P.flash = st < 1.6 ? Math.max(0, Math.sin(st * 14)) * shake : 0;
    if (pop > 0) P.crownFly = { x: pop * 260, y: -Math.sin(pop * Math.PI) * 260 + pop * pop * 300, rot: pop * 3, a: 1 - seg(pop, 0.7, 1) };
    P.rot = ease(fall) * 0.55; P.sy = 1 - ease(fall) * 0.12; P.leaf = 0.3 * ease(fall); P.fistL = [0, 40 * ease(fall), 0.95]; P.fistR = [0, 40 * ease(fall), 0.95];
    P.fade = 1 - fade; P.sparkle = fade > 0 ? fade : 0; P.eyes = 'dizzy';
  }
  return P;
}

// ───────── วาด ─────────
const about = (c, [px, py], a = 0, sx = 1, sy = 1) => { c.translate(px, py); if (a) c.rotate(a); if (sx !== 1 || sy !== 1) c.scale(sx, sy); c.translate(-px, -py); };
function star(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.32 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}

/** วาดบอสกล้วยราคี — คืนค่าท่า (หน้าทดสอบแสดงในแท็บ "ค่า") */
export function drawBananaBoss(ctx, x, groundY, s, o = {}) {
  if (!IMG) loadBananaBoss();
  const state = BANANA_BOSS_STATES[o.state] ? o.state : 'idle';
  const t = o.t || 0, st = o.st || 0;
  const P = bananaBossPose(state, st, t, o);
  if (!READY) return P;
  const ex = clamp(o.explode || 0);
  const face = (o.gaze ?? -1) > 0 ? -1 : 1;   // ไฟล์หันซ้าย · มองขวา = กลับด้าน
  const k = s / UNIT;
  const hit = o.hitT != null && o.hitT >= 0 && o.hitT < 0.35 ? 1 - o.hitT / 0.35 : 0;
  const shake = P.shake + (hit ? Math.sin(o.hitT * 90) * 8 * hit : 0);

  // รายการชิ้นตามลำดับชั้น + ตัวแปลงของแต่ละชิ้น (พิกัดไฟล์ หลังตัวแปลงทั้งตัว)
  const items = [];
  const put = (id, xf) => { if (IMG[id]) items.push([id, xf]); };
  const armSet = P.arm === 'grab' ? ['raised-left-arm', 'raised-left-hand'] : P.arm === 'throw' ? ['throwing-left-arm', 'open-left-hand'] : ['left-arm', 'left-fist'];
  put('leaves', (c) => about(c, PIV.leafBase, P.leaf));
  put('banana-crown', (c) => { c.translate(P.crown[0], P.crown[1]); about(c, PIV.crownBase, P.crown[2]); });
  put('torso', (c) => about(c, PIV.fistR, 0, 1, 1));   // ตัว + แขนขวา (กำปั้นขวาวาดทับปลายแขน)
  put('left-leg', null);
  put('right-leg', null);
  put('waist', (c) => about(c, PIV.waist, P.waist));
  const armXf = P.arm === 'base' ? (c) => about(c, PIV.shoulderL, P.armRot) : null;
  put(armSet[0], armXf);
  put('face', (c) => { c.translate(0, P.faceY); about(c, PIV.face, 0, P.faceK, P.faceK); });
  put('horn', (c) => { c.translate(0, P.faceY); about(c, PIV.horn, P.horn); });
  if (P.arm === 'base') put('left-fist', (c) => { about(c, PIV.shoulderL, P.armRot); c.translate(P.fistL[0], P.fistL[1]); about(c, PIV.fistL, 0, P.fistL[2], P.fistL[2]); });
  else put(armSet[1], null);
  put('right-fist', (c) => { c.translate(P.fistR[0], P.fistR[1]); about(c, PIV.fistR, 0, P.fistR[2], P.fistR[2]); });
  if (P.arm === 'throw' && P.motion > 0.01) put('throw-motion', null);

  const body = (c) => {
    c.translate(x + shake * k, groundY - (P.y + (o.alt || 0)) * k * (UNIT / UNIT));
    c.scale(k * face, k);
    c.translate(-CX, -GROUND);
    about(c, [CX, GROUND], 0, P.sx, P.sy);
    about(c, PIV.hip, P.rot);
  };
  const drawItems = (layer) => {
    for (const [id, xf] of items) {
      if (id === 'banana-crown' && P.crownFly) continue;
      const pic = IMG[id]?.[layer];
      if (!pic) continue;
      const [dx, dy] = (EXPLODE[id] || [0, 0]).map((v) => v * ex);
      ctx.save();
      body(ctx);
      if (xf) xf(ctx);
      if (id === 'throw-motion') ctx.globalAlpha *= P.motion;
      ctx.drawImage(pic, VB.x + dx, VB.y + dy, VB.w, VB.h);
      ctx.restore();
    }
  };

  ctx.save();
  ctx.globalAlpha *= P.fade;
  // เงาใต้ตัว (หดตอนลอย)
  ctx.save();
  const air = clamp(P.y / 600);
  ctx.globalAlpha *= 0.22 * (1 - air * 0.7);
  ctx.fillStyle = '#3A1D0B';
  ctx.beginPath();
  ctx.ellipse(x + 20 * k * face, groundY + 4 * k, 420 * k * (1 - air * 0.5) * P.sx, 40 * k, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  drawItems('ink');   // ขอบเข้มรอบนอก (ชั้นล่างสุด)
  if (hit || P.flash) ctx.filter = `brightness(${1 + 0.9 * Math.max(hit, P.flash)})`;
  drawItems('im');
  ctx.filter = 'none';
  // เครือกล้วยหลุดกระเด็น (แพ้)
  if (P.crownFly && IMG['banana-crown']) {
    ctx.save(); body(ctx);
    ctx.globalAlpha *= P.crownFly.a;
    ctx.translate(P.crownFly.x, P.crownFly.y); about(ctx, PIV.crownBase, P.crownFly.rot);
    ctx.drawImage(IMG['banana-crown'].ink, VB.x, VB.y, VB.w, VB.h);
    ctx.drawImage(IMG['banana-crown'].im, VB.x, VB.y, VB.w, VB.h);
    ctx.restore();
  }
  // กล้วยที่ปา
  if (P.banana && IMG['thrown-banana']) {
    ctx.save(); body(ctx);
    ctx.globalAlpha *= P.banana.a;
    const [bx, by] = PIV.banana;
    ctx.translate(P.banana.x - bx, P.banana.y - by); about(ctx, PIV.banana, P.banana.rot);
    ctx.drawImage(IMG['thrown-banana'].ink, VB.x, VB.y, VB.w, VB.h);
    ctx.drawImage(IMG['thrown-banana'].im, VB.x, VB.y, VB.w, VB.h);
    ctx.restore();
  }
  // ฝุ่นตอนลงพื้น + คลื่นพื้น
  const fx = (fn) => { ctx.save(); ctx.translate(x, groundY); ctx.scale(k, k); fn(); ctx.restore(); };
  if (P.dust >= 0) fx(() => {
    ctx.globalAlpha *= 0.55 * (1 - P.dust); ctx.fillStyle = '#EAD9B8';
    for (const d of [-1, 1]) for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(d * (300 + P.dust * 260 + i * 70), -20 - i * 22 - P.dust * 30, 46 * (1 - P.dust * 0.4), 0, TAU); ctx.fill(); }
  });
  if (P.wave >= 0 && P.wave < 1) fx(() => {
    ctx.globalAlpha *= 0.6 * (1 - P.wave); ctx.strokeStyle = '#FFF4D6'; ctx.lineWidth = 18;
    ctx.beginPath(); ctx.ellipse(0, -6, 300 + P.wave * 900, 40 + P.wave * 50, 0, Math.PI, TAU); ctx.stroke();
  });
  // ดาวมึน (เหนื่อย/แพ้)
  if (P.eyes === 'dizzy') {
    ctx.save(); body(ctx);
    ctx.fillStyle = '#FFE14A';
    for (let i = 0; i < 3; i++) { const a = t * 3 + (i / 3) * TAU; star(ctx, 340 + Math.cos(a) * 120, 470 + Math.sin(a) * 30, 26); }
    ctx.restore();
  }
  ctx.restore();
  // ประกายสลาย (แพ้)
  if (P.sparkle > 0) fx(() => {
    ctx.fillStyle = '#FFF3B0';
    for (let i = 0; i < 18; i++) {
      const r = Math.sin(i * 91.7) * 0.5 + 0.5, a = (i / 18) * TAU;
      ctx.globalAlpha = (1 - P.sparkle) * 0.9;
      star(ctx, Math.cos(a) * (120 + P.sparkle * 420 * r), -400 + Math.sin(a) * (100 + P.sparkle * 300) - P.sparkle * 200, 20 * (1 - P.sparkle * 0.5));
    }
  });
  return P;
}
