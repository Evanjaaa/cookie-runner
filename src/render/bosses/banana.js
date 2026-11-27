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
 *
 * ท่าคว้า B1–B10 (ผู้ใช้ 27 พ.ย. · ด่านบอสใน gameplay-lab) — "ช่อง" ตามรายการภาพที่ส่งนักวาด:
 *   ตอนนี้ประกอบจากชิ้นเดิมไปก่อน · วางไฟล์ SVG ของนักวาดใน banana/slots/ (ชื่อขึ้นต้นด้วยรหัสช่อง) = ใช้ไฟล์นั้นแทนเอง
 *   ท่าแขนยืด (state มี reach): หน้าเกมส่ง o.reachTo = จุดมือ [x, y] หน่วยบอส (x ไปทางน้อง = ลบ · y ขึ้น = บวก)
 *     โค้ดยืดท่อนแขนจากไหล่ไปถึงมือเอง · o.held(x, y) = วาดของในกำมือ (น้อง) ก่อนวาดมือทับ — x, y = จุดมือบนจอ
 *   o.rage = หน้าโกรธ (B10) ทับหน้า · o.noThrown = ไม่วาดกล้วยที่ปา (หน้าเกมวาดลูกของตัวเองด้วย drawBananaThrown)
 *   รายละเอียดการตั้งชื่อไฟล์/กระดาษ: banana/slots/README.md
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
  // ── ท่าคว้า (ช่อง B1–B9 · slot = รหัสภาพนักวาด · reach = ท่าแขนยืด มือแบบไหน) ──
  grabWind:  { name: 'ง้างคว้า',        em: '🫳', slot: 'B1', note: 'ช่วงเตือนก่อนคว้า: เอนหลัง ง้างแขนไปด้านหลังสุด ตัวสั่นเก็บแรง', loop: 1.0 },
  grabLow:   { name: 'คว้าพื้น',         em: '✋', slot: 'B2', note: 'แขนยืดพุ่งเรียดพื้น ตัวโน้มหน้า ฝ่ามือแบ (น้องกระโดดข้าม)', loop: 1.2, reach: 'open' },
  grabHigh:  { name: 'คว้าระดับหัว',     em: '✋', slot: 'B3', note: 'แขนพุ่งตรงระดับหัวน้อง (น้องหมอบลอด)', loop: 1.2, reach: 'open' },
  grabAbove: { name: 'ตะครุบจากข้างบน',  em: '🫳', slot: 'B4', note: 'แขนโค้งยกสูงแล้วฟาดลง ฝ่ามือคว่ำ ตัวยืด (ดูเงามือ ลอยให้พ้นจังหวะ)', loop: 1.4, reach: 'open' },
  hold:      { name: 'ยกน้องค้าง',       em: '✊', slot: 'B5', note: 'กำมือชูระดับหัว หัวเราะชอบใจ (โค้ดวางน้องในกำมือ)', loop: 1.5, reach: 'fist' },
  pull:      { name: 'ลากเข้าหาปาก',     em: '😋', slot: 'B6', note: 'ทางเลือก: อ้าปาก แขนหดดึงน้องเข้าหาตัว ตาหิว', loop: 1.6, reach: 'fist' },
  stun:      { name: 'เสียหลักมึน',      em: '🌀', slot: 'B7', note: 'น้องดิ้นหลุด: มือสะบัดกาง ตัวเซถอยหลัง ตาหมุน เครือกล้วยเผยอ', loop: 1.8 },
  shakeHold: { name: 'เขย่า',            em: '🫨', slot: 'B8', note: 'ดิ้นไม่หลุด: กำน้องเขย่า ตัวเอียงซ้ายขวา หัวเราะ', loop: 0.6, reach: 'fist' },
  toss:      { name: 'โยน',              em: '🤾', slot: 'B9', note: 'เหวี่ยงแขนไปทางซ้ายสุด ตัวบิดตาม ปล่อยมือ', dur: 0.8 },
};
/** B10 หน้าโกรธ (แยกเฉพาะหน้า) — วางทับหน้าเดิมตอน o.rage */
export const BANANA_RAGE_SLOT = 'B10';
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
const toU = ([fx, fy]) => [(fx - CX) / UNIT, (GROUND - fy) / UNIT];
/** จุดบนตัว (หน่วยบอส · x ไปทางน้อง = ลบ · y ขึ้น = บวก) ตอนยืนท่าหลัก — หน้าเกมใช้เล็งจุดตี/จุดปล่อยของ */
export const BANANA_BOSS_PT = { face: toU(PIV.face), shoulder: toU(PIV.shoulderL), fist: toU(PIV.fistL), crown: toU(PIV.crownBase), horn: toU(PIV.horn), banana: toU(PIV.banana) };
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
  loadSlots();
  return IMG.ready;
}
// ══ ช่องท่าจากนักวาด (B1–B10) ══
// วางไฟล์ใน src/render/bosses/banana/slots/ ชื่อขึ้นต้นด้วยรหัสช่อง เช่น B2-grab-low.svg · หลายเฟรม: B2-grab-low-1.svg, -2 … (เรียงตามเลขท้าย)
// กระดาษ/พิกัดเดียวกับ banana-boss-final.svg (เท้าเดิม) · ท่าแขนยืด: แยกมือเป็น <g id="hand"> โค้ดยืดท่อนแขนให้เอง
const SLOT_SRC = import.meta.glob('./banana/slots/B*.svg', { query: '?raw', import: 'default', eager: true });
const SPR = {};   // รหัสช่อง → { frames: [{ body, hand, c }] } (ใส่เมื่อโหลดภาพเสร็จ)
const SLOT_FPS = 8;
function svgImage(doc) {
  return new Promise((ok) => {
    const im = new Image();
    im.onload = () => ok(im); im.onerror = () => ok(null);
    im.src = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' }));
  });
}
/** เหลือเฉพาะ el (ซ่อนพี่น้องทุกชั้นตามสายบรรพบุรุษ · คง defs/style ไว้) */
function only(doc, el) {
  for (let a = el; a && a !== doc.documentElement; a = a.parentNode) {
    for (const sib of a.parentNode.children) if (sib !== a && !/^(defs|style|title)$/i.test(sib.tagName)) sib.setAttribute('display', 'none');
  }
}
function loadSlots() {
  const bySlot = {};
  for (const [path, raw] of Object.entries(SLOT_SRC)) {
    const name = path.split('/').pop().replace(/\.svg$/i, '');
    const slot = (name.match(/^(B\d+)/i) || [])[1]?.toUpperCase();
    if (!slot) continue;
    const n = +((name.match(/-(\d+)$/) || [])[1] || 0);
    (bySlot[slot] ||= []).push([n, raw]);
  }
  for (const [slot, list] of Object.entries(bySlot)) {
    list.sort((a, b) => a[0] - b[0]);
    Promise.all(list.map(async ([, raw]) => {
      const mk = () => {
        const doc = new DOMParser().parseFromString(raw.slice(raw.indexOf('<svg')), 'image/svg+xml');
        const root = doc.documentElement;
        root.setAttribute('viewBox', `${VB.x} ${VB.y} ${VB.w} ${VB.h}`);
        root.setAttribute('width', VB.w * RES); root.setAttribute('height', VB.h * RES);
        return doc;
      };
      const d1 = mk(), hand = d1.getElementById('hand');
      if (hand) hand.setAttribute('display', 'none');
      const body = await svgImage(d1);
      let h = null;
      if (hand) { const d2 = mk(); only(d2, d2.getElementById('hand')); const im = await svgImage(d2); if (im) h = { im, c: bboxCenter(im) }; }
      return body ? { body, hand: h } : null;
    })).then((frames) => { frames = frames.filter(Boolean); if (frames.length) SPR[slot] = { frames }; });
  }
}
/** เฟรมของช่อง ณ เวลาในท่า (วน/ค้างเฟรมสุดท้ายตามชนิดท่า) */
function slotFrame(slot, st, loop) {
  const S = slot && SPR[slot];
  if (!S) return null;
  const n = S.frames.length, i = Math.floor(st * SLOT_FPS);
  return S.frames[loop ? i % n : Math.min(n - 1, i)];
}
/** กลางภาพจริง (ส่วนที่ทึบ) ของภาพขนาดกระดาษ VB → พิกัดไฟล์ */
function bboxCenter(im) {
  const R = 4, w = Math.ceil(VB.w / R), h = Math.ceil(VB.h / R);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.drawImage(im, 0, 0, w, h);
  const d = c.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return [VB.x + VB.w / 2, VB.y + VB.h / 2];
  return [VB.x + ((x0 + x1 + 1) / 2) * R, VB.y + ((y0 + y1 + 1) / 2) * R];
}
const CENTER = {};
const centerOf = (id) => (CENTER[id] ||= IMG?.[id] ? bboxCenter(IMG[id].im) : [0, 0]);

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
  } else if (BANANA_BOSS_STATES[state]?.slot) grabPose(P, state, st, t, o, idleLayer);
  return P;
}

// ── ท่าคว้า B1–B9 (ประกอบจากชิ้นเดิมไปก่อน) ──
const lerp2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const REST = toU(PIV.fistL);   // มือซ้ายตอนยืนท่าหลัก
/** ทางเดินมือสาธิต (ไม่มี o.reachTo — หน้า monster-lab) · u = 0..1 ในรอบท่า */
function demoReach(state, u, t, st) {
  const out = u < 0.35 ? easeOut(u / 0.35) : u < 0.55 ? 1 : 1 - ease((u - 0.55) / 0.45);
  // ระยะสาธิต ≈ ที่น้องยืนในหน้า monster-lab (ในเกมจริงหน้าเกมส่ง o.reachTo ไปถึงตัวน้องเอง)
  if (state === 'grabLow') return lerp2(REST, [-135, 8], out);
  if (state === 'grabHigh') return lerp2(REST, [-135, 30], out);
  if (state === 'grabAbove') {
    if (u < 0.35) return lerp2(REST, [-120, 125], ease(u / 0.35));
    if (u < 0.45) return lerp2([-120, 125], [-150, 8], easeIn((u - 0.35) / 0.1));
    if (u < 0.65) return [-150, 8];
    return lerp2([-150, 8], REST, ease((u - 0.65) / 0.35));
  }
  if (state === 'pull') return lerp2([-150, 14], [-40, 44], ease(u));
  if (state === 'shakeHold') return [-62 + Math.sin((st / 0.3) * TAU) * 12, 82 + Math.cos((st / 0.15) * TAU) * 5];
  return [-62 + Math.sin(t * 9) * 2, 82 + Math.abs(Math.sin(t * 9)) * 3];   // hold
}
function grabPose(P, state, st, t, o, idleLayer) {
  const D = BANANA_BOSS_STATES[state], L = D.loop || D.dur, u = (st % L) / L;
  const reach = (hand) => { P.arm = 'reach'; P.reach = { hand, at: o.reachTo || demoReach(state, u, t, st) }; };
  if (state === 'grabWind') {                       // B1 ง้าง: เอนหลัง แขนเหวี่ยงไปหลังสุด กำปั้นบีบแน่น ตัวสั่น
    const k = ease(seg(st, 0, 0.35));
    idleLayer(0.3);
    P.rot += 0.1 * k + Math.sin(t * 46) * 0.007 * k;
    P.sy += 0.03 * k; P.y = 5 * k; P.faceK = 1 + 0.03 * k; P.crown[1] -= 6 * k; P.leaf -= 0.08 * k;
    P.armRot = 1.0 * k; P.fistL = [10 * k, -10 * k, 1 + 0.12 * k]; P.fistR = [14 * k, -8 * k, 1 + 0.08 * k];
  } else if (state === 'grabLow' || state === 'grabHigh' || state === 'grabAbove') {   // B2–B4 แขนพุ่ง
    idleLayer(0.2);
    P.rot -= state === 'grabLow' ? 0.11 : state === 'grabHigh' ? 0.07 : 0.04;
    P.sy += state === 'grabAbove' ? 0.05 : -0.03; P.sx += 0.02;
    P.faceK = 1.04; P.leaf += 0.06; P.fistR = [-6, 8, 1];
    reach('open');
  } else if (state === 'hold' || state === 'shakeHold') {   // B5 ยกค้าง หัวเราะ · B8 เขย่า
    const f = state === 'shakeHold' ? 13 : 9, lb = Math.abs(Math.sin(t * f));
    P.y = lb * 5; P.faceK = 1.05 + lb * 0.04; P.crown[1] = -lb * 8; P.leaf = Math.sin(t * f) * 0.05;
    P.rot = state === 'shakeHold' ? Math.sin((st / 0.3) * TAU) * 0.08 : 0.03 + Math.sin(t * f) * 0.015;
    P.fistR = [0, -lb * 10, 1.05];
    reach('fist');
  } else if (state === 'pull') {                    // B6 ลากเข้าหาปาก
    idleLayer(0.3);
    P.rot -= 0.03; P.faceK = 1.1 + Math.sin(t * 7) * 0.03; P.leaf += 0.04;
    reach('fist');
  } else if (state === 'stun') {                    // B7 เสียหลักมึน
    const sw = Math.sin((st / 1.8) * TAU * 2), hit = 1 - ease(seg(st, 0, 0.3));
    P.rot = 0.1 + sw * 0.06 + hit * 0.08;
    P.shake = hit * Math.sin(st * 60) * 4;
    P.crown = [-16, -26 + Math.sin(t * 5) * 4, 0.32 + sw * 0.05]; P.horn = 0.22 + sw * 0.05; P.leaf = 0.15;
    P.armRot = 0.55 + sw * 0.1; P.fistL = [-40, -34, 1]; P.fistR = [46, -44 + sw * 6, 1];
    P.eyes = 'dizzy'; P.faceY = 4;
  } else if (state === 'toss') {                    // B9 โยน: เหวี่ยงไปซ้ายสุด ตัวบิดตาม
    const sw = ease(seg(st, 0, 0.3)), rec = ease(seg(st, 0.45, 0.8));
    P.arm = st < 0.55 ? 'throw' : 'base';
    P.rot = (0.06 - 0.16 * sw) * (1 - rec);
    P.motion = st < 0.55 ? 1 - seg(st, 0.2, 0.55) : 0;
    P.faceK = 1 + 0.05 * Math.sin(seg(st, 0, 0.5) * Math.PI);
  }
}

// ───────── วาด ─────────
const about = (c, [px, py], a = 0, sx = 1, sy = 1) => { c.translate(px, py); if (a) c.rotate(a); if (sx !== 1 || sy !== 1) c.scale(sx, sy); c.translate(-px, -py); };
function star(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.32 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}

const ARM_COL = '#629c2e', ARM_LIT = '#81bf43';
/**
 * แขนซ้ายยืด (ท่าคว้า): ท่อนแขนโค้งจากไหล่ (ตามตัวที่เอน/ยืด) ไปถึงจุดมือ แล้ววางมือ (แบ/กำ) ทับปลาย
 * วาดในกรอบตรง (ไม่เอนตามตัว) → จุดมือตรงกับที่หน้าเกมใช้ชน · o.held วาดน้องในกำมือก่อนวาดมือทับ
 */
function drawReach(ctx, P, o, R) {
  const { x, groundY, k, face, shake, body, spr } = R;
  ctx.save(); body(ctx); const M = ctx.getTransform(); ctx.restore();
  const frame = (c) => { c.translate(x + shake * k, groundY); c.scale(k * face, k); c.translate(-CX, -GROUND); };
  ctx.save(); frame(ctx);
  const sh = ctx.getTransform().inverse().transformPoint(M.transformPoint(new DOMPoint(PIV.shoulderL[0], PIV.shoulderL[1])));
  const hx = CX + P.reach.at[0] * UNIT * face, hy = GROUND - P.reach.at[1] * UNIT;
  const dx = hx - sh.x, dy = hy - sh.y, len = Math.hypot(dx, dy) || 1;
  let nx = dy / len, ny = -dx / len;
  if (ny > 0) { nx = -nx; ny = -ny; }                 // โก่งขึ้นเสมอ (แขนยางเหวี่ยงเป็นโค้ง)
  const bend = Math.min(110, len * 0.18);
  const cx = (sh.x + hx) / 2 + nx * bend, cy = (sh.y + hy) / 2 + ny * bend;
  const arm = (w, col, off = 0) => {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
    ctx.moveTo(sh.x + nx * off, sh.y + ny * off); ctx.quadraticCurveTo(cx + nx * off, cy + ny * off, hx + nx * off * 0.5, hy + ny * off * 0.5); ctx.stroke();
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  arm(92 + 8, INK); arm(92, ARM_COL);
  ctx.save(); ctx.globalAlpha *= 0.6; arm(22, ARM_LIT, 22); ctx.restore();
  ctx.restore();
  // น้องในกำมือ (พิกัดจอของผู้เรียก) — วาดก่อนมือ มือจึงทับกลางตัว
  const sx = x + shake * k + (hx - CX) * k * face, sy = groundY + (hy - GROUND) * k;
  P.handAt = [sx, sy];
  if (o.held) { const f = ctx.filter; ctx.filter = 'none'; ctx.save(); o.held(sx, sy); ctx.restore(); ctx.filter = f; }
  // มือ: ไฟล์นักวาด (กลุ่ม hand) > มือจากไฟล์เดิม · มือแบหมุนตามทิศแขน · กำปั้นตั้งตรง
  const id = P.reach.hand === 'fist' ? 'left-fist' : 'open-left-hand';
  const own = spr?.hand, pic = own || IMG[id];
  if (!pic) return;
  const c = own ? own.c : centerOf(id);
  const a0 = own ? Math.PI : Math.atan2(c[1] - PIV.shoulderL[1], c[0] - PIV.shoulderL[0]);
  const a = P.reach.hand === 'fist' ? Math.sin(st0(o) * 9) * 0.06 : Math.atan2(dy, dx) - a0;
  ctx.save(); frame(ctx);
  const hs = P.reach.hand === 'fist' ? 0.95 : 1.05;
  ctx.translate(hx, hy); ctx.rotate(a); ctx.scale(hs, hs); ctx.translate(-c[0], -c[1]);
  if (!own) ctx.drawImage(pic.ink, VB.x, VB.y, VB.w, VB.h);
  ctx.drawImage(own ? own.im : pic.im, VB.x, VB.y, VB.w, VB.h);
  ctx.restore();
}
const st0 = (o) => o.t || 0;
/** B10 หน้าโกรธ: ไฟล์นักวาด (ทับหน้าเดิม) — ยังไม่มี = หน้าเดิมแดงเรื่อ + รอยเส้นเลือดปูด 💢 กะพริบ */
let RAGE_FACE = null;
function drawRage(ctx, P, body, t, st) {
  const own = slotFrame(BANANA_RAGE_SLOT, st, true);
  const faceXf = (c) => { c.translate(0, P.faceY); about(c, PIV.face, 0, P.faceK, P.faceK); };
  ctx.save(); body(ctx); faceXf(ctx);
  if (own) ctx.drawImage(own.body, VB.x, VB.y, VB.w, VB.h);
  else if (IMG.face) {
    if (!RAGE_FACE) {
      RAGE_FACE = document.createElement('canvas'); RAGE_FACE.width = VB.w * RES; RAGE_FACE.height = VB.h * RES;
      const c = RAGE_FACE.getContext('2d');
      c.drawImage(IMG.face.im, 0, 0, RAGE_FACE.width, RAGE_FACE.height);
      c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(232,40,40,.32)'; c.fillRect(0, 0, RAGE_FACE.width, RAGE_FACE.height);
    }
    ctx.globalAlpha *= 0.75 + 0.25 * Math.sin(t * 6);
    ctx.drawImage(RAGE_FACE, VB.x, VB.y, VB.w, VB.h);
    // รอยเส้นเลือดปูด (สี่แฉกโค้ง) ข้างหัว
    ctx.globalAlpha = 1; ctx.translate(420, 600); const pk = 1 + 0.12 * Math.abs(Math.sin(t * 5)); ctx.scale(pk, pk);
    ctx.strokeStyle = '#E8283C'; ctx.lineWidth = 11; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(10, -26); ctx.quadraticCurveTo(10, -10, 26, -10); ctx.stroke(); }
  }
  ctx.restore();
}
/** กล้วยที่ปา (ชิ้นจากไฟล์ท่าปา) วาดลอยที่จุด x, y บนจอ หมุน rot — หน้าเกมใช้วาดลูกที่บินเข้าหาน้อง */
export function drawBananaThrown(ctx, x, y, s, rot = 0) {
  if (!IMG) loadBananaBoss();
  const im = READY && IMG['thrown-banana'];
  if (!im) return;
  const c = centerOf('thrown-banana'), k = s / UNIT;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k); ctx.translate(-c[0], -c[1]);
  ctx.drawImage(im.ink, VB.x, VB.y, VB.w, VB.h);
  ctx.drawImage(im.im, VB.x, VB.y, VB.w, VB.h);
  ctx.restore();
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
  const armSet = P.arm === 'grab' ? ['raised-left-arm', 'raised-left-hand'] : P.arm === 'throw' ? ['throwing-left-arm', 'open-left-hand'] : P.arm === 'reach' ? [] : ['left-arm', 'left-fist'];
  const D = BANANA_BOSS_STATES[state];
  const spr = slotFrame(D.slot, st, !!D.loop);   // ไฟล์ท่าจากนักวาด (ถ้ามี) แทนชิ้นประกอบทั้งตัว
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
  if (spr) items.splice(0, items.length, ['@sprite', null]);

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
      const pic = id === '@sprite' ? (layer === 'im' ? spr.body : null) : IMG[id]?.[layer];
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
  if (o.rage && !P.crownFly) drawRage(ctx, P, body, t, st);
  if (P.reach) drawReach(ctx, P, o, { x, groundY, k, face, shake, body, spr });
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
  if (P.banana && !o.noThrown && IMG['thrown-banana']) {
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
