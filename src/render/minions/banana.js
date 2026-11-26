/**
 * ลูกสมุนกล้วย (ลูกสมุนของบอสตัวแรก · ธีมต้นกล้วย — ผู้ใช้ 25 พ.ย. 2026)
 * ภาพจากไฟล์นักออกแบบ src/render/minions/banana-minion.svg (Phase 3.4 · 11 ชิ้นแยกกลุ่ม) — ไม่วาดใหม่ ใช้ชิ้นจากไฟล์ตรง ๆ
 *   แต่ละกลุ่มในไฟล์ → ภาพเวกเตอร์ของตัวเอง (ตำแหน่งเดิม) แล้วขยับทีละชิ้นด้วยการหมุน/ย่อ-ขยายรอบจุดหมุน
 *   stem-cap ขั้วบนหัว · peel-rear-left / peel-rear-center / peel-right-curl = เปลือกที่เป็นขา · body-main ตัว
 *   peel-front-left เปลือกหน้าซ้าย · body-ridges ร่องผิว · eye-far / eye-near ตา · mouth-interior ลิ้น · mouth-smile ปาก
 *
 * หน่วย: (0,0) = พื้นใต้ตัวตรงกลาง · ขึ้นบน = y ติดลบ · พื้น → ปลายขั้ว = BANANA.H (100)
 * drawBanana(ctx, x, groundY, s, o) — s = พิกเซลต่อหน่วย · o เหมือนลูกน้องตัวอื่น (state st t gaze bob explode)
 *   หันหน้าตามสายตา: gaze < 0 = หันซ้าย (ไปหาน้อง) · ไฟล์วาดหันขวา
 *   ยังโหลดภาพไม่เสร็จ = ไม่วาด (ครั้งแรกครู่เดียว) · ทุกอย่างคิดจากเวลา → ลากเวลาย้อนได้ภาพเดิม
 */
import SVG from './banana-minion.svg?raw';

export const BANANA = {
  name: 'ลูกสมุนกล้วย',
  title: 'ทหารเปลือกกล้วยแห่งสวนกล้วย',
  H: 100, hover: 0, top: 26, halfW: 50,
  ratio: 0.85,   // สูงกี่เท่าของน้องแมวตัวโต
};
export const BANANA_STATES = {
  idle:   { name: 'ยืนกวน',      em: '🍌', note: 'ตัวโยกเบา ๆ หายใจ · ขาเปลือกขยับ · ลิ้นแกว่ง แล้วเก็บลิ้นเข้าปาก แลบออกมาใหม่ · กะพริบตา', loop: 5.2 },
  walk:   { name: 'เดินเปลือก',  em: '🚶', note: 'ขาเปลือกก้าวสลับ ตัวเด้งตามก้าว', loop: 1.0 },
  hop:    { name: 'กระโดด',      em: '⤴️', note: 'ย่อตัว แล้วเด้งขึ้น เปลือกบานตอนลอย ลงพื้นตัวแบน', dur: 1.2 },
  dash:   { name: 'พุ่งชน',      em: '💨', note: 'เอนหลังตั้งหลัก แล้วพุ่งเอนหน้า เปลือกลากไปข้างหลัง', dur: 1.5 },
  taunt:  { name: 'แลบลิ้นยั่ว', em: '😜', note: 'โยกซ้ายขวา ลิ้นแลบยาวแกว่งไวขึ้น', loop: 1.6 },
  stomp:  { name: 'โดนเหยียบ',   em: '💫', note: 'แบนแต๋ เปลือกกางแผ่ ตาหยีแล้วจางหาย', dur: 1.4 },
  dizzy:  { name: 'มึนงง',       em: '😵', note: 'โคลงเคลง ดาวหมุนเหนือหัว', loop: 1.6 },
};

// ── ชิ้นส่วน (พิกัดไฟล์) ──
const VB = { x: 60, y: 380, w: 960, h: 1010 };      // กรอบภาพทุกชิ้น (ครอบทั้งตัว)
const GROUND = 1368, CX = 540, UNIT = (GROUND - 404) / BANANA.H;   // ก้นเปลือก · กลางตัว · พิกเซลไฟล์ต่อหน่วย
const PART_IDS = ['stem-cap', 'peel-rear-left', 'peel-rear-center', 'peel-right-curl', 'body-main', 'peel-front-left', 'body-ridges', 'eye-far', 'eye-near', 'mouth-interior', 'mouth-smile'];
// จุดหมุนของแต่ละชิ้น (พิกัดไฟล์): ขาเปลือกหมุนรอบโคนที่ติดตัว · ตากะพริบรอบกลางตา · ลิ้นแกว่งรอบโคนลิ้น
const PIV = {
  'peel-rear-left': [370, 1010], 'peel-rear-center': [640, 1110], 'peel-right-curl': [700, 975],
  'eye-near': [535, 746], 'eye-far': [412, 817], 'mouth-interior': [585, 862], 'stem-cap': [200, 460],
  body: [480, 1250],
};
// ขาเปลือก (ผู้ใช้ 25 พ.ย. "ตอนขยับอย่าให้ดูขาดออกจากตัว"): ไม่หมุนทั้งแผ่น — งอทีละช่วงตามความยาวขา
//   root = โคนที่ซ่อนใต้ตัว (มุม 0 — ติดตัวตลอด) · tip = ปลายเปลือก · มุมเพิ่มขึ้นเรื่อย ๆ จากโคนไปปลาย (โค้งเหมือนเปลือกนิ่ม)
const LEG = {
  'peel-rear-left': { root: [395, 990], tip: [110, 1255] },
  'peel-rear-center': { root: [610, 1095], tip: [845, 1335] },
  'peel-right-curl': { root: [690, 950], tip: [990, 1362] },
};
const LEG_BANDS = 40;
// ลิ้น (ผู้ใช้ 25 พ.ย. "แกว่งเหมือนออกมาจากปากจริง ๆ"): โคน = ขอบบนลิ้นที่ทับเส้นปาก (ขยับน้อยสุด) → ปลายลิ้นแกว่งมากสุด
//   ใช้ตัวงอแบบขาเปลือก · ตัดทุกอย่างเหนือเส้นปาก (ไม่มีเส้นลิ้นโผล่เลยปากขึ้นไป) · เก็บลิ้น = เลื่อนขึ้นเข้าปาก (ถูกตัดหายเอง)
// เปลือกหน้าซ้าย = ขาที่ 4 (ผู้ใช้ 25 พ.ย. "อยากให้ทุกเปลือกขามีแอนิเมชัน") — โคนติดข้างตัวด้านขวาบน · ปลายเท้าชี้ซ้ายล่าง
// แขน (กางตอนกระโดด): โคนเปลือกในไฟล์สั้น ยกแล้วโคนโผล่พ้นตัวเป็นช่องขาว → เติม "แขนเสื้อ" ยาวเข้าไปใต้ตัว (ผู้ใช้ 26 พ.ย.)
//   แก้ใหม่: แขนหมุนรอบ "รักแร้" (มุมล่างของโคนแขนที่ชนตัว) — แกนแขนตั้งฉากกับแนวไหล่-รักแร้ เส้น u = 0 จึงทาบขอบตัวพอดี
//   ส่วนในตัว (u < 0) ไม่ขยับ · ส่วนนอกตัวเริ่มงอจาก 0 ค่อย ๆ เพิ่ม → ไหล่กับรักแร้ติดขอบตัวเสมอ ตอนยกแขน ด้านบนมุดเข้าใต้ตัวเอง
function armAxis(armpit, shoulder, outward, len) {
  const ax = shoulder[0] - armpit[0], ay = shoulder[1] - armpit[1], l = Math.hypot(ax, ay);
  let px = -ay / l, py = ax / l;
  if (px * outward < 0) { px = -px; py = -py; }
  return { root: armpit, tip: [armpit[0] + px * len, armpit[1] + py * len], u0: 0, liftPow: 1.25 };
}
// ใช้เฉพาะท่ากระโดด (ผู้ใช้ 26 พ.ย. "แก้แค่ท่ากระโดด ท่าเดินไม่ต้องโดน") — ท่าอื่นใช้แกนเดิมใน LEG
const ARM = {
  'peel-right-curl': armAxis([678, 1083], [702, 928], 1, 300),
  'peel-rear-left': armAxis([359, 1008], [389, 880], -1, 290),
};
LEG['peel-front-left'] = { root: [405, 1075], tip: [150, 1268] };
LEG['mouth-interior'] = { root: [590, 871], tip: [578, 995] };
const MOUTH_LINE = [[533, 896], [648, 846]];   // ขอบบนลิ้น = แนวปาก (พิกัดไฟล์)
// ทิศแยกชิ้น (โหมดแยกชิ้น) — หน่วยไฟล์
const EXPLODE = {
  'stem-cap': [-60, -90], 'peel-rear-left': [-120, 40], 'peel-rear-center': [20, 110], 'peel-right-curl': [140, 40],
  'body-main': [0, 0], 'peel-front-left': [-90, -10], 'body-ridges': [-30, -60], 'eye-far': [40, -60], 'eye-near': [110, -70],
  'mouth-interior': [130, 50], 'mouth-smile': [90, 20],
};

let IMGS = null, READY = false;
/** โหลดภาพชิ้นส่วน (ครั้งเดียว) — คืน Promise · drawBanana เรียกให้เองตอนวาดครั้งแรก */
export function loadBanana() {
  if (IMGS) return IMGS.ready;
  const doc = new DOMParser().parseFromString(SVG.slice(SVG.indexOf('<svg')), 'image/svg+xml');
  const root = doc.documentElement;
  root.setAttribute('viewBox', `${VB.x} ${VB.y} ${VB.w} ${VB.h}`);
  root.setAttribute('width', VB.w); root.setAttribute('height', VB.h);
  const top = [...root.children].filter((e) => e.tagName === 'g');
  // เติมเส้นขอบที่ขาด (ผู้ใช้ 25 พ.ย. วงแดง): ปลายเท้าเปลือกหน้าซ้าย 373,1318 → 373,1299 ในไฟล์ไม่มีเส้น — ต่อเส้นปิดปลายเท้า
  const fo = doc.getElementById('peel-front-left-outline');
  // ปลายเท้าทู่เป็นเส้นตั้ง → ปลายแหลมโค้งงอนขึ้นแบบปลายเปลือกอื่น (ผู้ใช้ 25 พ.ย. รอบ 2) · เนื้อเปลือกกับเส้นขอบใช้ทรงเดียวกัน
  const TOE = 'C 386,1319 398,1317 405,1311 C 395,1309 383,1305 373,1299';
  if (fo) fo.setAttribute('d', fo.getAttribute('d').replace(/373,1318\s*M\s*373,1299/, '373,1318 ' + TOE));
  const ff = doc.getElementById('peel-front-left-base-fill');
  if (ff) ff.setAttribute('d', ff.getAttribute('d').replace(/C\s*369,1310\s*370,1304\s*373,1299/, TOE));
  IMGS = {};
  const mk = (id, store, key = id) => new Promise((ok) => {
    for (const g of top) g.setAttribute('display', g.id === id ? 'inline' : 'none');
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' }));
    const im = new Image();
    im.onload = () => ok();
    im.onerror = () => ok();
    im.src = url;
    store[key] = im;
  });
  const jobs = PART_IDS.map((id) => mk(id, IMGS));
  // ตาใกล้: แยกคิ้วโกรธ (brow) ออกจากลูกตา — กะพริบ/หลับแล้วคิ้วอยู่ที่เดิม (ผู้ใช้ 26 พ.ย.)
  const brow = doc.getElementById('eye-near-brow-detail'), ball = ['eye-near-base-fill', 'eye-near-light-rim'].map((i) => doc.getElementById(i));
  if (brow) {
    brow.setAttribute('display', 'none');
    jobs.push(mk('eye-near', IMGS, 'eye-near-ball'));
    brow.removeAttribute('display');
    for (const b of ball) b?.setAttribute('display', 'none');
    jobs.push(mk('eye-near', IMGS, 'eye-near-brow'));
    for (const b of ball) b?.removeAttribute('display');
  }
  // ชิ้นที่งอได้ (ขาเปลือก ลิ้น — ผู้ใช้ 25 พ.ย. "งอแล้วเส้นแตก"): เส้นขอบเข้ม → เก็บเป็นเวกเตอร์ (วาดใหม่ตามแนวงอทุกเฟรม เส้นคมเสมอ)
  //   ภาพพิกเซลของชิ้นนี้เหลือแค่เนื้อสี (ปิดเส้น · ซ่อนชิ้นสีเข้ม) · ชิ้นสีเข้มที่อยู่ใต้เนื้อ (ขอบลิ้น) วาดก่อนเนื้อ
  const NOINK = {};
  for (const id of Object.keys(LEG)) {
    const g = doc.getElementById(id);
    if (!g) continue;
    const items = [];
    let seenBody = false;
    for (const el of g.querySelectorAll('path')) {
      const st = el.getAttribute('stroke'), fl = el.getAttribute('fill');
      const ink = fl && /^#3A1D0B$/i.test(fl);
      if (st && st !== 'none') {
        items.push({ cmds: pathCmds(el.getAttribute('d')), stroke: st, width: +el.getAttribute('stroke-width') || 8, cap: el.getAttribute('stroke-linecap') || 'butt', join: el.getAttribute('stroke-linejoin') || 'miter' });
        el.setAttribute('stroke', 'none');
      }
      if (ink) { items.push({ cmds: pathCmds(el.getAttribute('d')), fill: fl, under: !seenBody }); el.setAttribute('display', 'none'); }
      else seenBody = true;
    }
    LINES[id] = items;
    const base = g.querySelector('path[id$="base-fill"]');
    if (base) SHAPES[id] = pathCmds(base.getAttribute('d'));   // รูปเนื้อ — ตัดเนื้อที่งอให้อยู่ในรูปนี้ (ไม่มีเศษสีหลุดนอกขอบ)
  }
  const inkless = Object.keys(LEG).filter((id) => LINES[id]).map((id) => mk(id, NOINK));
  IMGS.ready = Promise.all([...jobs, ...inkless]).then(() => { Object.assign(FILL_IMGS, NOINK); READY = true; });
  return IMGS.ready;
}

/** เส้นใน d (ไฟล์นี้ใช้แค่ M L C Z แบบพิกัดจริง) → [['M',x,y],['L',x,y],['C',…6],['Z']] */
function pathCmds(d) {
  const tk = d.match(/[MLCZmlcz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const out = [];
  let i = 0, cmd = '';
  while (i < tk.length) {
    if (/[A-Za-z]/.test(tk[i])) cmd = tk[i++].toUpperCase();
    if (cmd === 'Z') { out.push(['Z']); continue; }
    const n = cmd === 'C' ? 6 : 2;
    out.push([cmd, ...tk.slice(i, i + n).map(Number)]);
    i += n;
    if (cmd === 'M') cmd = 'L';
  }
  return out;
}
const LINES = {}, FILL_IMGS = {}, SHAPES = {};
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const easeOut = (k) => { k = clamp(k); return 1 - (1 - k) ** 3; };
const seg = (t, a, b) => clamp((t - a) / (b - a));

// ───────── ท่าทาง ─────────
/** ค่าของท่า ณ เวลา — y ลอย(หน่วย) · sx/sy ยืด · rot เอียงตัว · legs[3] มุมขาเปลือก · tongue ลิ้นแกว่ง · blink 0..1 */
export function bananaPose(state, st, t, o = {}) {
  const bob = o.bob === false ? 0 : 1;
  const P = { y: 0, x: 0, sx: 1, sy: 1, rot: 0, shake: 0, legs: [0, 0, 0, 0], legLift: [0, 0, 0, 0], tongue: 0, tongueK: 1, tongueIn: 0, wave: null, blink: 0,
    eyes: 'angry', mouth: 'tongue', fade: 1, stars: 0, dust: -1, phi: 0, cryGlow: 0, trail: 0, poof: -1 };
  const breathe = Math.sin((t / 2.4) * TAU);
  const blinkAt = (tt) => { const p = tt % 3.1; return p < 0.13 ? Math.sin((p / 0.13) * Math.PI) : 0; };
  P.blink = blinkAt(t + 0.4);
  // ลิ้นแกว่งซ้าย-ขวา (มุมที่ปลายลิ้น) + เก็บลิ้นเป็นระยะ: แกว่ง 3.2 วิ → หดเข้าปาก → หลบในปากครู่หนึ่ง → แลบออกมาแกว่งต่อ
  P.tongue = Math.sin(t * 4.6) * 0.32;
  // ยืนกวน: รอบลิ้นผูกกับเวลาในท่า (ท่ายาว 5.2 วิ = หนึ่งรอบพอดี) — แถบเวลาลากดูจังหวะเก็บลิ้นได้ตรงเฟรม
  const cyc = state === 'idle' ? st % 5.2 : (t + 1.3) % 5.2;
  P.tongueIn = cyc < 3.2 ? 0 : cyc < 3.55 ? ease((cyc - 3.2) / 0.35) : cyc < 4.4 ? 1 : 1 - easeOut((cyc - 4.4) / 0.45);
  if (cyc >= 4.4 && cyc < 5.2) P.tongue += Math.sin(((cyc - 4.4) / 0.8) * Math.PI * 2) * 0.25 * (1 - (cyc - 4.4) / 0.8);   // ดีดตอนแลบออกมา
  if (state === 'idle') {
    P.sy = 1 + breathe * 0.025 * bob; P.sx = 1 - breathe * 0.015 * bob;
    P.rot = Math.sin((t / 2.4) * TAU + 0.6) * 0.035;
    P.legs = [Math.sin(t * 2.6) * 0.04, Math.sin(t * 2.6 + 2) * 0.035, Math.sin(t * 2.6 + 4) * 0.045, Math.sin(t * 2.6 + 5.2) * 0.035];
    P.wave = [0, 2, 4, 5.2].map((o) => ({ amp: 0.07, ph: t * 2.2 + o }));   // ยืนนิ่งปลายเปลือกพลิ้วเบา ๆ
  } else if (state === 'walk') {
    const ph = (st / 1.0) * TAU;
    // เดินสี่ขาสลับเป็นคลื่น: หน้าซ้าย → หลังกลาง → ขวา → หลังซ้าย (ห่างกันขาละ 1/4 รอบ) — ทุกขาก้าว ยก วาง
    const OFF = [Math.PI * 1.5, Math.PI, Math.PI * 0.5, 0], AMP = [0.26, 0.22, 0.25, 0.24];   // ก้าวกว้างขึ้น (ผู้ใช้ 25 พ.ย. รอบ 2)
    P.legs = OFF.map((o, i) => Math.sin(ph + o) * AMP[i]);
    P.legLift = OFF.map((o) => Math.max(0, Math.sin(ph + o)) * 18);
    // หนวดปลาหมึก: คลื่นวิ่งจากโคนไปปลายเปลือกตามจังหวะก้าวของแต่ละขา — ปลายเปลือกม้วนพลิ้ว ไม่แข็งเป็นแท่ง
    P.wave = OFF.map((o) => ({ amp: 0.55, ph: ph * 1.0 + o }));
    P.rot += Math.sin(ph * 2) * 0.015;
    P.y = Math.abs(Math.sin(ph)) * 5 * bob;
    P.rot = Math.sin(ph) * 0.05;
    P.sy = 1 - Math.abs(Math.cos(ph)) * 0.03;
  } else if (state === 'hop') {
    const crouch = ease(seg(st, 0, 0.25)) * (1 - ease(seg(st, 0.25, 0.33)));
    const air = seg(st, 0.33, 0.95), land = seg(st, 0.95, 1.2);
    P.y = air > 0 && air < 1 ? Math.sin(air * Math.PI) * 38 : 0;
    P.sy = 1 - crouch * 0.18 + (air > 0 && air < 1 ? Math.sin(air * Math.PI) * 0.08 : 0) - Math.sin(land * Math.PI) * 0.15;
    P.sx = 1 + crouch * 0.12 + Math.sin(land * Math.PI) * 0.12;
    // ผู้ใช้ 26 พ.ย.: เปลือกซ้าย-ขวา (หลังซ้าย 0 · ขวา 2) = แขน → ตอนพุ่งขึ้นกางแขนขึ้นพริ้ว ๆ ลอยค้าง แล้วหุบเก็บก่อนลงพื้น
    //   เปลือกขา (หลังกลาง 1 · หน้าซ้าย 3): ย่อ = กางแผ่กดพื้น · ถีบตัว = ชี้ลงเหยียด · ลอย = ห้อยพลิ้วตามหลัง · ลงพื้น = กางรับน้ำหนัก
    const arm = ease(seg(st, 0.22, 0.48)) * (1 - ease(seg(st, 0.8, 1.02)));
    const push = Math.sin(seg(st, 0.22, 0.45) * Math.PI);
    const dangle = air > 0 && air < 1 ? Math.sin(air * Math.PI) : 0;
    const flap = Math.sin(t * 11) * arm;
    P.legs = [
      -arm * 0.15 + flap * 0.05,
      -crouch * 0.18 + push * 0.22 - dangle * 0.12 + Math.sin(land * Math.PI) * -0.2,
      arm * 0.15 - flap * 0.05,
      crouch * 0.2 - push * 0.22 + dangle * 0.14 + Math.sin(land * Math.PI) * 0.2,
    ];
    P.legLift = [arm * 100, -crouch * 6 + dangle * 6, arm * 100, -crouch * 6 + dangle * 6];
    P.wave = [
      { amp: 0.5 * arm, ph: t * 9 },
      { amp: 0.3 * dangle + 0.15 * push, ph: t * 7 + 1 },
      { amp: 0.5 * arm, ph: t * 9 + 1.6 },
      { amp: 0.3 * dangle + 0.15 * push, ph: t * 7 + 2.4 },
    ];
    P.blink = air > 0.15 && air < 0.85 ? 0.3 : P.blink;
    if (land > 0 && land < 1) P.dust = land;
  } else if (state === 'dash') {
    const wind = ease(seg(st, 0, 0.45)), go = seg(st, 0.45, 1.1), back = ease(seg(st, 1.1, 1.5));
    P.rot = -wind * 0.16 * (1 - go) + Math.sin(clamp(go) * Math.PI) * 0.22 * (1 - back);
    P.x = (o.inPlace ? 0 : 1) * Math.sin(clamp(go) * Math.PI) * 55;
    P.sx = 1 + Math.sin(clamp(go) * Math.PI) * 0.08;
    P.legs = [-0.22, -0.18, -0.24, -0.2].map((v) => v * Math.sin(clamp(go) * Math.PI) + wind * (1 - go) * 0.08);
    P.trail = Math.sin(clamp(go) * Math.PI);
    P.tongue = Math.sin(t * 9) * 0.35; P.tongueIn = 0;
  } else if (state === 'taunt') {
    const ph = (st / 1.6) * TAU;
    P.rot = Math.sin(ph) * 0.09;
    P.x = Math.sin(ph) * 3;
    P.tongue = Math.sin(t * 9.5) * 0.45; P.tongueIn = 0;   // ยั่ว: แลบค้าง แกว่งแรง
    P.tongueK = 1.18;
    P.legs = [Math.sin(ph) * 0.06, -Math.sin(ph) * 0.05, Math.sin(ph) * 0.07, -Math.sin(ph) * 0.06];
  } else if (state === 'stomp') {
    const hit = easeOut(seg(st, 0, 0.12)), fade = seg(st, 0.8, 1.4);
    P.sy = 1 - hit * 0.55; P.sx = 1 + hit * 0.35;
    P.legs = [-hit * 0.3, hit * 0.15, hit * 0.32, -hit * 0.25];
    P.blink = 1; P.eyes = 'squeeze';
    P.fade = 1 - ease(fade);
    P.stars = hit * (1 - fade);
    P.poof = fade > 0 ? fade : -1;
    P.shake = st < 0.3 ? Math.sin(st * 70) * (0.3 - st) * 8 : 0;
  } else if (state === 'dizzy') {
    const ph = (st / 1.6) * TAU;
    P.rot = Math.sin(ph) * 0.13;
    P.x = Math.sin(ph) * 4;
    P.stars = 1; P.eyes = 'dizzy';
    P.legs = [Math.sin(ph * 2) * 0.08, Math.sin(ph * 2 + 1) * 0.07, Math.sin(ph * 2 + 2) * 0.08, Math.sin(ph * 2 + 3) * 0.07];
  }
  P.rot += Math.sin(t * 1.3) * 0.004 * bob;
  return P;
}

// ───────── วาด ─────────
/** วาดขาเปลือกแบบงอ: ตัดภาพเป็นแถบขวางแกนขา แต่ละแถบหมุนรอบโคนด้วยมุมสะสม a·u^1.4 (u 0 โคน → 1 ปลาย)
 *  แถบซ้อนกันนิด (ไม่เห็นรอยต่อ) · lift = ปลายยกขึ้นจากพื้น (งอขึ้นแทนการยกทั้งชิ้น) */
const LEG_BMP = {}, LEG_RES = 1.5;
/** ขาเปลือกเป็นภาพพิกเซลครั้งเดียว (ความละเอียด 1.5 เท่าไฟล์) — งอตาข่ายจากภาพเดียวกันทุกชิ้น ไม่มีลายจากการวาดเวกเตอร์ซ้ำ */
function legBitmap(id) {
  if (LEG_BMP[id]) return LEG_BMP[id];
  const im = FILL_IMGS[id] || IMGS[id];   // เนื้ออย่างเดียว (เส้นขอบวาดเป็นเวกเตอร์ทีหลัง)
  if (!im?.complete || !im.naturalWidth) return null;
  const cv = document.createElement('canvas');
  cv.width = Math.round(VB.w * LEG_RES); cv.height = Math.round(VB.h * LEG_RES);
  cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
  return (LEG_BMP[id] = cv);
}
// wave = { amp, ph } คลื่นวิ่งจากโคนไปปลาย (หนวดปลาหมึก — ผู้ใช้ 25 พ.ย.) · ไม่ส่ง = งอโค้งเดียว
function drawLeg(c, id, a, lift, ex = 0, wave = null, armGeo = false) {
  const G = (armGeo && ARM[id]) || LEG[id];
  const im = legBitmap(id);
  if (!im) return;
  const { root: [rx, ry], tip: [tx, ty] } = G;
  const L = Math.hypot(tx - rx, ty - ry), ux = (tx - rx) / L, uy = (ty - ry) / L, nx = -uy, ny = ux;
  // ยกปลาย = งอเพิ่มไปทางที่ปลายขยับขึ้น (ขาชี้ลงซ้าย/ขวา — ทิศหมุนที่ยกปลายขึ้นต่างกันตามทิศขา)
  const liftA = lift ? (lift * UNIT) / L * (ux >= 0 ? -1 : 1) : 0;
  const A = a;   // งอโค้ง (ปลายงอมาก) · ยก (liftA) งอตั้งแต่ใกล้โคน — ยกทั้งเปลือกได้ (แขนกางตอนกระโดด)
  const [dx, dy] = EXPLODE[id] || [0, 0];
  const wAmp = wave?.amp || 0, wPh = wave?.ph || 0;
  const ox = dx * ex, oy = dy * ex;
  // เส้นขอบเวกเตอร์ตามแนวงอ: แปลงจุดบนเส้น (แบ่งโค้งเป็นช่วงสั้น) ด้วยตัวแปลงเดียวกับเนื้อ → เส้นคม ไม่แตกเป็นขั้น
  const trace = (cmds, warp, p = c) => {
      let px = 0, py = 0;
      const to = (x, y, first) => { const [X, Y] = warp(x, y); (first ? p.moveTo : p.lineTo).call(p, X + ox, Y + oy); };
      for (const q of cmds) {
        if (q[0] === 'M') { to(q[1], q[2], true); px = q[1]; py = q[2]; }
        else if (q[0] === 'L') { for (let k = 1; k <= 4; k++) to(px + ((q[1] - px) * k) / 4, py + ((q[2] - py) * k) / 4); px = q[1]; py = q[2]; }
        else if (q[0] === 'C') {
          for (let k = 1; k <= 14; k++) {
            const t = k / 14, mt = 1 - t;
            to(mt * mt * mt * px + 3 * mt * mt * t * q[1] + 3 * mt * t * t * q[3] + t * t * t * q[5], mt * mt * mt * py + 3 * mt * mt * t * q[2] + 3 * mt * t * t * q[4] + t * t * t * q[6]);
          }
          px = q[5]; py = q[6];
        } else p.closePath();
      }
  };
  const drawInk = (warp, under) => {
    for (const it of LINES[id] || []) {
      if (!!it.under !== under) continue;
      c.beginPath();
      trace(it.cmds, warp);
      if (it.fill) { c.fillStyle = it.fill; c.fill(); }
      else { c.strokeStyle = it.stroke; c.lineWidth = it.width; c.lineCap = it.cap; c.lineJoin = it.join; c.stroke(); }
    }
  };
  if (Math.abs(A) < 0.002 && Math.abs(liftA) < 0.002 && Math.abs(wAmp) < 0.002) {
    const idw = (x, y) => [x, y];
    drawInk(idw, true);
    c.drawImage(im, VB.x + ox, VB.y + oy, VB.w, VB.h);
    drawInk(idw, false);
    return;
  }
  // ตาข่ายสามเหลี่ยม: จุดบนแกนขา (u) × สองข้าง (v) — จุดต้นทางในภาพ → จุดปลายทางที่หมุนรอบโคนตามมุมสะสม
  //   แต่ละสามเหลี่ยมแปลงแบบ affine (ขอบสามเหลี่ยมติดกันพอดี ไม่มีหยัก) · ขยายสามเหลี่ยมนิด กันเส้นรอยต่อ
  const W = 420, us = [-1.5, -0.3, -0.2, -0.1];   // ครึ่งกว้างตาข่าย (ครอบขา) · แถบละเอียดตั้งแต่ใต้ตัว (ช่วงที่เริ่มงอ)
  for (let i = 0; i <= LEG_BANDS; i++) us.push(i / LEG_BANDS);
  us.push(2);
  // ทิศของแกนขาที่ตำแหน่ง u (เทียบแกนเดิม): งอโค้งเดียว A·u^1.3 + คลื่นวิ่ง (โคนนิ่ง ปลายพลิ้วมากสุด)
  // ยก (แขนกาง) เริ่มงอตั้งแต่ใต้ตัว (U0 — ส่วนที่ตัวบังอยู่) ค่อย ๆ เพิ่ม → ตรงขอบตัวไม่หักเป็นมุม ขอบแขนต่อกับตัวเรียบ (ผู้ใช้ 26 พ.ย.)
  const U0 = G.u0 ?? -0.3, LP = G.liftPow ?? 0.8;
  const angOf = (u) => {
    if (u <= U0) return 0;
    const k = Math.min(1, Math.max(0, u)), kl = Math.min(1, (u - U0) / (1 - U0));
    return A * Math.pow(k, 1.3) + liftA * Math.pow(kl, LP) + wAmp * Math.sin(wPh - k * 4.2) * k;
  };
  // แกนขาโค้งจริง: เดินตามทิศทีละช่วงจาก U0 (ความยาวขาคงที่ — ไม่ยืด ไม่หด) · ก่อน U0 = แกนเดิมตรง · เลยปลาย = ตรงตามทิศปลาย
  const N = 120, span = 1 - U0, C = [[rx + ux * L * U0, ry + uy * L * U0]];
  for (let i = 1; i <= N; i++) {
    const g = angOf(U0 + ((i - 0.5) / N) * span), [px, py] = C[i - 1], d = (L * span) / N;
    C.push([px + (ux * Math.cos(g) - uy * Math.sin(g)) * d, py + (ux * Math.sin(g) + uy * Math.cos(g)) * d]);
  }
  const center = (u) => {
    if (u <= U0) return [rx + ux * L * u, ry + uy * L * u];
    if (u >= 1) { const g = angOf(1); return [C[N][0] + (ux * Math.cos(g) - uy * Math.sin(g)) * L * (u - 1), C[N][1] + (ux * Math.sin(g) + uy * Math.cos(g)) * L * (u - 1)]; }
    const f = ((u - U0) / span) * N, i = Math.floor(f), t = f - i, p = C[i], q = C[Math.min(N, i + 1)];
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  };
  const src = (u, v) => [rx + ux * L * u + nx * v, ry + uy * L * u + ny * v];
  const dst = (u, v) => {
    const [x, y] = center(u), g = angOf(u), cs = Math.cos(g), sn = Math.sin(g);
    return [x + (nx * cs - ny * sn) * v, y + (nx * sn + ny * cs) * v];
  };
  // แถบละหนึ่งการแปลง (จากมุม 3 จุดของแถบ) ตัดตามสี่เหลี่ยมทั้งแถบ — ไม่มีรอยต่อแนวทแยงกลางแถบ
  const tri = (s0, s1, s2, d0, d1, d2, clipQ) => {
    // affine: src → dst
    const den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
    if (!den) return;
    const a11 = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den;
    const a12 = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den;
    const a21 = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den;
    const a22 = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
    const e = d0[0] - a11 * s0[0] - a12 * s0[1], f = d0[1] - a21 * s0[0] - a22 * s0[1];
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
    const [g0, g1, g2] = [d0, d1, d2];
    c.save();
    const q = clipQ || [g0, g1, g2];
    c.beginPath(); q.forEach((p, j) => (j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
    c.clip();
    c.transform(a11, a21, a12, a22, e, f);
    c.drawImage(im, VB.x + dx * ex, VB.y + dy * ex, VB.w, VB.h);
    c.restore();
  };
  // จุดในไฟล์ → จุดหลังงอ (u ตามแกนขา · v ระยะตั้งฉาก)
  const warpPt = (x, y) => { const u = ((x - rx) * ux + (y - ry) * uy) / L, v = (x - rx) * nx + (y - ry) * ny; return dst(u, v); };
  drawInk(warpPt, true);
  c.save();
  if (SHAPES[id]) {
    const cp = new Path2D(); trace(SHAPES[id], warpPt, cp); c.clip(cp);
    // ทาสีพื้นเปลือกรองไว้ก่อน (สีเฉลี่ยของเปลือก) — ตอนงอแรง ช่องเล็ก ๆ ระหว่างแถบไม่เห็นเป็นเส้นขาว (ผู้ใช้ 26 พ.ย.)
    c.fillStyle = legTone(id); c.fill(cp);
  }   // เนื้อเปลือกอยู่ในรูปที่งอแล้วเท่านั้น
  for (let i = 0; i < us.length - 1; i++) {
    // ซ้อนแถบตามแกนขานิด (แผนที่ต่อเนื่อง ส่วนที่ซ้อนตรงกันพอดี) — กันเส้นรอยต่อจากขอบลบรอย anti-alias
    const pu = 4 / L, u0 = us[i] - (i ? pu : 0), u1 = us[i + 1] + pu;
    const a0 = src(u0, -W), a1 = src(u0, W), b0 = src(u1, -W), b1 = src(u1, W);
    const A0 = dst(u0, -W), A1 = dst(u0, W), B0 = dst(u1, -W), B1 = dst(u1, W);
    // การแปลงของแถบ: จุดกลางขอบล่าง/บนแถบ — ความคลาดเคลื่อนกระจายสองข้างเท่ากัน (ขอบขาไม่เป็นขั้น)
    const m0 = src(u0, 0), m1 = src(u1, 0), M0 = dst(u0, 0), M1 = dst(u1, 0);
    // แยกสองครึ่งแถบ (ฝั่ง +v / −v) ต่างคนต่างคำนวณการแปลงของตัวเอง — แขนที่อยู่ไกลแกน (|v| มาก) ไม่คลาดเป็นลายขีด
    //   ครึ่งซ้อนกันเลยแนวแกนเล็กน้อย (ตรงแนวแกนการแปลงสองครึ่งตรงกันพอดี — ไม่เห็นรอย)
    const e = 3, Me0 = dst(u0, e), Me1 = dst(u1, e), Mf0 = dst(u0, -e), Mf1 = dst(u1, -e);
    tri(m0, a1, m1, M0, A1, M1, [Mf0, A1, B1, Mf1]);
    tri(m0, a0, m1, M0, A0, M1, [Me0, A0, B0, Me1]);
  }
  c.restore();
  drawInk(warpPt, false);
}
/** แขนเสื้อ: แถบเนื้อ+เส้นขอบต่อจากโคนแขนลึกเข้าไปใต้ตัว (u −1.2 → 0.15) ความกว้างเท่าโคนแขน · งอด้วยตัวแปลงเดียวกับแขน
 *  วาดก่อนแขนและก่อนตัว: ส่วนในตัวถูกตัวทับ · ส่วนที่โผล่ (ช่องระหว่างตัวกับแขนที่ยก) = ต่อเนื้อและขอบแขนเข้าหาตัวพอดี */
const SLEEVE = {};
function drawSleeve(c, id, ax, dst, ox, oy) {
  let sv = SLEEVE[id];
  if (!sv) {
    const { rx, ry, ux, uy, nx, ny, L } = ax;
    const vs = [];
    for (const q of SHAPES[id]) for (let i = 1; i + 1 < q.length; i += 2) {
      const u = ((q[i] - rx) * ux + (q[i + 1] - ry) * uy) / L, v = (q[i] - rx) * nx + (q[i + 1] - ry) * ny;
      if (u > -0.05 && u < 0.25) vs.push(v);
    }
    if (vs.length < 2) return;
    const v0 = Math.min(...vs) + 3, v1 = Math.max(...vs) - 3;
    // สีเนื้อ: ดูดจากภาพเนื้อแขนตรงโคน (กลางความกว้าง)
    let col = '#E9AE1C';
    const bmp = legBitmap(id);
    if (bmp) {
      try {
        const u = 0.1, v = (v0 + v1) / 2, x = rx + ux * L * u + nx * v, y = ry + uy * L * u + ny * v;
        const d = bmp.getContext('2d').getImageData(Math.round((x - VB.x) * LEG_RES), Math.round((y - VB.y) * LEG_RES), 1, 1).data;
        if (d[3] > 200) col = `rgb(${d[0]},${d[1]},${d[2]})`;
      } catch { /* ใช้สีตั้งต้น */ }
    }
    const ink = (LINES[id] || []).find((it) => it.stroke) || { stroke: '#3A1D0B', width: 8 };
    sv = SLEEVE[id] = { v0, v1, col, ink };
  }
  const { v0, v1, col, ink } = sv;
  const U = [];
  for (let u = -1.2; u <= 0.1501; u += 0.05) U.push(u);
  const pt = (u, v) => { const [x, y] = dst(u, v); return [x + ox, y + oy]; };
  c.save();
  c.beginPath();
  U.forEach((u, i) => { const [x, y] = pt(u, v0); i ? c.lineTo(x, y) : c.moveTo(x, y); });
  [...U].reverse().forEach((u) => { const [x, y] = pt(u, v1); c.lineTo(x, y); });
  c.closePath();
  c.fillStyle = col; c.fill();
  c.strokeStyle = ink.stroke; c.lineWidth = ink.width; c.lineCap = 'round'; c.lineJoin = 'round';
  for (const v of [v0, v1]) { c.beginPath(); U.forEach((u, i) => { const [x, y] = pt(u, v); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); }
  c.restore();
}
const LEG_TONE = {};
/** สีเฉลี่ยของเนื้อเปลือก (ดูดจากภาพครั้งเดียว) */
function legTone(id) {
  if (LEG_TONE[id]) return LEG_TONE[id];
  const bmp = legBitmap(id);
  let col = '#E8AC1A';
  if (bmp) {
    try {
      const d = bmp.getContext('2d').getImageData(0, 0, bmp.width, bmp.height).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4 * 97) if (d[i + 3] > 250) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      if (n) col = `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
    } catch { /* ใช้สีตั้งต้น */ }
  }
  return (LEG_TONE[id] = col);
}
function drawPart(c, id, ex = 0) {
  const im = IMGS[id];
  if (!im?.complete || !im.naturalWidth) return;
  const [dx, dy] = EXPLODE[id] || [0, 0];
  c.drawImage(im, VB.x + dx * ex, VB.y + dy * ex, VB.w, VB.h);
}
const rotAbout = (c, [px, py], a, sx = 1, sy = 1) => { c.translate(px, py); if (a) c.rotate(a); if (sx !== 1 || sy !== 1) c.scale(sx, sy); c.translate(-px, -py); };

function star(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}

/** วาดลูกสมุนกล้วย — คืนค่าท่า (หน้าทดสอบแสดงค่าในแท็บ "ค่า") */
export function drawBanana(ctx, x, groundY, s, o = {}) {
  if (!IMGS) loadBanana();
  const state = BANANA_STATES[o.state] ? o.state : 'idle';
  const P = bananaPose(state, o.st || 0, o.t || 0, o);
  if (!READY) return P;
  const ex = clamp(o.explode || 0);
  // หันหน้า (ผู้ใช้ 25 พ.ย. "ให้กล้วยหันไปอีกฝั่ง"): ค่าตั้งต้น = หันขวาตามไฟล์แบบ · o.face === -1 หรือ o.flip = หันซ้าย
  const face = o.flip || o.facing === -1 ? -1 : 1;
  const k = s / UNIT;
  ctx.save();
  ctx.translate(x + (P.x * face + P.shake) * s, groundY - (P.y + (o.alt || 0)) * s);
  ctx.scale(k * face, k);
  ctx.translate(-CX, -GROUND);
  ctx.globalAlpha *= P.fade;
  // เงาใต้ตัว (หดตอนลอย)
  ctx.save();
  ctx.globalAlpha *= 0.2 * (1 - clamp(P.y / 60) * 0.6);
  ctx.fillStyle = '#3A1D0B';
  ctx.beginPath();
  ctx.ellipse(CX + 20, GROUND + 6 + P.y * UNIT, 380 * (1 - clamp(P.y / 60) * 0.4) * P.sx, 34, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // ตัวทั้งตัว: ยืด/เอียงรอบฐานตัว
  ctx.save();
  rotAbout(ctx, PIV.body, P.rot, P.sx, P.sy);
  drawPart(ctx, 'stem-cap', ex);
  // ขาเปลือก: หมุนรอบโคน · ยกขึ้นตามก้าว (ชดเชยการยืดตัว — ขาไม่ยืดตามตัว)
  const legIds = ['peel-rear-left', 'peel-rear-center', 'peel-right-curl'];
  legIds.forEach((id, i) => {
    ctx.save();
    // ชดเชยการยืดตัวรอบโคนขา (โคนอยู่ที่เดิม — ขาไม่ยืดตามตัว) · งอ = มุมท่า − เอียงตัวบางส่วน (ปลายเปลือกยังแตะพื้น)
    const armGeo = state === 'hop';   // แขนหมุนรอบรักแร้ — ท่ากระโดดเท่านั้น
    rotAbout(ctx, ((armGeo && ARM[id]) || LEG[id]).root, 0, 1 / Math.sqrt(P.sx), 1 / Math.sqrt(P.sy));
    drawLeg(ctx, id, (P.legs[i] - P.rot * 0.6) * 1.6, P.legLift[i] * 0.5, ex, P.wave?.[i], armGeo);
    ctx.restore();
  });
  drawPart(ctx, 'body-main', ex);
  // เปลือกหน้าซ้าย (ขาที่ 4): วาดหน้าตัว งอแบบเดียวกับขาหลัง
  ctx.save();
  rotAbout(ctx, LEG['peel-front-left'].root, 0, 1 / Math.sqrt(P.sx), 1 / Math.sqrt(P.sy));
  drawLeg(ctx, 'peel-front-left', (P.legs[3] - P.rot * 0.6) * 1.6, P.legLift[3] * 0.5, ex, P.wave?.[3]);
  ctx.restore();
  drawPart(ctx, 'body-ridges', ex);
  // ตา: กะพริบ = บีบตั้งรอบกลางตา · ตาหยี (โดนเหยียบ) = ปิดสนิท
  // ตา (ผู้ใช้ 26 พ.ย. "ตอนหลับตาให้ดวงตาหายเลย เหลือแต่เส้นตา"): ลืม → บีบลงครึ่งแรกของการกะพริบ → เกินครึ่ง = ซ่อนลูกตา วาดเส้นตาหลับแทน
  //   คิ้วโกรธของตาใกล้อยู่กับที่เสมอ
  const lid = P.eyes === 'squeeze' ? 1 : P.blink;
  const shut = lid > 0.5;
  const EYE_LINES = { 'eye-near': [[497, 800], [535, 814], [586, 774], [612, 700], 12], 'eye-far': [[389, 797], [398, 810], [416, 806], [428, 789], 9] };
  for (const id of ['eye-far', 'eye-near']) {
    const [dx, dy] = (EXPLODE[id] || [0, 0]).map((v) => v * ex);
    if (!shut) {
      ctx.save();
      rotAbout(ctx, PIV[id], 0, 1, 1 - lid * 1.5);
      if (P.eyes === 'dizzy') rotAbout(ctx, PIV[id], (o.t || 0) * 6, 1, 1);
      if (id === 'eye-near' && IMGS['eye-near-ball']?.naturalWidth) ctx.drawImage(IMGS['eye-near-ball'], VB.x + dx, VB.y + dy, VB.w, VB.h);
      else drawPart(ctx, id, ex);
      ctx.restore();
    } else {
      const [a, b, c2, d, w] = EYE_LINES[id];
      ctx.save();
      ctx.strokeStyle = '#3A1D0B'; ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a[0] + dx, a[1] + dy); ctx.bezierCurveTo(b[0] + dx, b[1] + dy, c2[0] + dx, c2[1] + dy, d[0] + dx, d[1] + dy); ctx.stroke();
      ctx.restore();
    }
    // ขีดหัวตา (คิ้วโกรธ) เลื่อนลงตามเปลือกตา — ตาหลับปลายขีดต่อกับเส้นตาหลับพอดี (ผู้ใช้ 26 พ.ย.)
    if (id === 'eye-near' && IMGS['eye-near-brow']?.naturalWidth) ctx.drawImage(IMGS['eye-near-brow'], VB.x + dx - 4 * Math.min(1, lid * 1.5), VB.y + dy + 14 * Math.min(1, lid * 1.5), VB.w, VB.h);
  }
  // ลิ้น: แกว่งรอบโคน · ยั่ว = ยืดยาวขึ้น
  if (P.tongueIn < 0.995) {
    ctx.save();
    if (!ex) {
      // ตัดเหนือเส้นปาก: ครึ่งระนาบใต้แนวขอบบนลิ้น
      const [[x0, y0], [x1, y1]] = MOUTH_LINE, ll = Math.hypot(x1 - x0, y1 - y0), dx = (x1 - x0) / ll, dy = (y1 - y0) / ll, nx = -dy, ny = dx;
      const sg = ny > 0 ? 1 : -1;   // ด้านใต้เส้น (y เพิ่ม)
      ctx.beginPath();
      ctx.moveTo(x0 - dx * 400, y0 - dy * 400); ctx.lineTo(x1 + dx * 400, y1 + dy * 400);
      ctx.lineTo(x1 + dx * 400 + nx * sg * 600, y1 + dy * 400 + ny * sg * 600); ctx.lineTo(x0 - dx * 400 + nx * sg * 600, y0 - dy * 400 + ny * sg * 600);
      ctx.closePath(); ctx.clip();
    }
    // เก็บลิ้น: เลื่อนขึ้นตามแกนลิ้น (ส่วนที่พ้นเส้นปากถูกตัดหาย = มุดเข้าปาก) · ยั่ว = ยืดยาวรอบโคน
    const { root: [rx, ry], tip: [tx, ty] } = LEG['mouth-interior'];
    ctx.translate(-(tx - rx) * P.tongueIn * 1.05, -(ty - ry) * P.tongueIn * 1.05);
    rotAbout(ctx, [rx, ry], 0, 1, P.tongueK);
    drawLeg(ctx, 'mouth-interior', P.tongue * (1 - P.tongueIn), 0, ex);
    ctx.restore();
  }
  drawPart(ctx, 'mouth-smile', ex);
  ctx.restore();
  // ดาวมึน
  if (P.stars > 0.01) {
    ctx.save();
    ctx.globalAlpha *= P.stars;
    ctx.fillStyle = '#FFD84A';
    for (let i = 0; i < 3; i++) {
      const a = (o.t || 0) * 3 + (i / 3) * TAU;
      star(ctx, 300 + Math.cos(a) * 150, GROUND - (GROUND - 360) * P.sy + Math.sin(a) * 40, 34);   // ตามหัวที่แบนลง
    }
    ctx.restore();
  }
  // ฝุ่นตอนลงพื้น
  if (P.dust >= 0) {
    ctx.save();
    ctx.globalAlpha *= 0.5 * (1 - P.dust);
    ctx.fillStyle = '#F2E2B0';
    for (const d of [-1, 1]) for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(CX + d * (260 + P.dust * 160 + i * 60), GROUND - 20 - i * 18, 30 * (1 - P.dust * 0.5), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
  return P;
}
