// src/render/gacha-cine.js
// ══ ฉากเปิดกาช่าแบบ Cinematic (แบบของผู้ใช้ 17 ต.ค. · รอบสาม) ══
//
// เรื่อง: อุ้งเท้าน้องส้ม (ขนล้วน) สองข้างโผล่มาเกาะขอบล่างจอ → หัวโผล่ตามมา → กรอกตามองบนซ้าย บนขวา
//   (เห็นแคปซูลแค่เสี้ยวที่ขอบบนจอ) → เงยมองตรงกลางเห็นแคปซูลลอยเหนือหัว → กล้องแพนขึ้นไปที่แคปซูล
//   → น้องกระโดดม้วนตัวขึ้นมาเกาะกอดแคปซูล (อุ้งเท้าเกาะขอบซ้ายขวาของลูก ไม่ทะลุกลาง)
//   → สปอยล์ระดับ (A = แสงขาวอมชมพู · S = ประกายทอง วงแหวนแสงทอง ลำแสงหมุน)
//   → "แตะเพื่อเปิด!" (ไม่แตะ = รอ) → แตะแล้วเกร็ง กระชากฝา ฝากระเด็น ลำแสงพุ่ง → แสงขาวเต็มจอ → ผู้เรียกเผยการ์ด
// ผลเหรียญทองใช้แบบ A · สุ่ม 5 ครั้ง เล่นครั้งเดียวตามรางวัลที่ดีที่สุด (ผู้เรียกส่ง tier มา)
//
// ใช้:  const C = createCine({ tier: 'a' | 's', skin })   // skin = น้องส้มขนล้วน
//       ทุกเฟรม: const ev = stepCine(C, dt)  (ev = เหตุการณ์ไว้ยิงเสียง — ดู CINE_SFX)  แล้ว drawCine(ctx, W, H, C)
//       แตะจอ: tapCine(C) (รับเฉพาะช่วงรอ) · ข้าม: skipCine(C) · จบเมื่อ C.phase === 'done' (จอขาวเต็ม)
//       หน้าทดสอบ: seekCine(C, เฟรม) กระโดดไปเฟรมใดก็ได้บนหลอดเวลา (ยาว CINE_LEN)
// หน่วยเวลา = เฟรมที่ 60fps · หน่วยโลก = หน่วยเกม · กล้อง = เลื่อน/ซูม/เอียง (DOMMatrix) ใส่ให้ทั้งโลก

import { drawCat2 } from './cat2.js';
import { track, env, E } from '../home-moves.js';

const TAU = Math.PI * 2;
const UNIT = 0.104;          // หน่วยไฟล์ออกแบบ → หน่วยเกม ต่อ scale 1 (ค่าเดียวกับใน cat2.js)
const CS = 1.8;              // ขนาดน้องในฉาก
const FU = CS * UNIT;        // หน่วยไฟล์ → หน่วยโลก
const VIEW = 230;            // ความสูงจอ = หน่วยเกมเท่านี้ (ก่อนซูม)
const CAP_R = 23;            // รัศมีแคปซูล (หน่วยเกม) — อุ้งเท้าท่า grip เกาะขอบซ้ายขวาพอดี
const CAP_DY = -46;          // จุดกลางแคปซูลเทียบจุดที่ตัววาดส่งมา (hy0 = อุ้งเท้า + 50 หน่วยไฟล์)
const LEDGE = 200;           // ขอบล่างจอที่น้องเกาะ (หน่วยโลก)
const PEEK_Y = 249;          // เท้าตอนหัวโผล่ (ตาพ้นขอบ)
const HIDE_Y = 322;          // เท้าตอนซ่อนใต้ขอบ
const PAW_X = 18;            // อุ้งเท้าเกาะขอบ ±x
// จังหวะ (เฟรม)
const T_PEEK = 22, T_LOOK = 40, T_SPOT = 86, T_PAN = 96, T_DUCK = 100, T_FLIP = 112, T_CATCH = 140, SPOIL = 154;
const INTRO = 215;           // ทั้งช่วงก่อนรอแตะ (~3.6 วิ)
const OPEN = 84;             // เกร็ง → กระชากฝา → แสงขาวเต็มจอ (1.4 วิ)
const POP = 16;              // เฟรมที่ฝาหลุด (นับจากแตะ)
const WAIT_PREVIEW = 90;     // หลอดเวลาในหน้าทดสอบ: ช่วงรอแตะยาวเท่านี้
export const CINE_LEN = INTRO + WAIT_PREVIEW + OPEN;
export const CINE_MARKS = { grab: 0, peek: T_PEEK, look: T_LOOK, spot: T_SPOT, flip: T_FLIP, spoil: SPOIL, wait: INTRO, open: INTRO + WAIT_PREVIEW };
/** เหตุการณ์ → ชื่อเสียงใน sfx (audio.js) — spoil แยกตามระดับ */
export const CINE_SFX = {
  grab: 'cineGrab', grab2: 'cineGrab', peek: 'cinePeek', look: 'cineLook', look2: 'cineLook', spot: 'cineSpot', pan: 'cinePan',
  flip: 'cineFlip', catch: 'cineCatch', spoil_a: 'cineSpoilA', spoil_s: 'cineSpoilS', prompt: 'mew', strain: 'cineStrain', pop: 'cinePop', flash: 'cineFlash',
};
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, u) => a + (b - a) * u;

/** สีของแต่ละระดับ — เรื่องเดียวกัน ต่างแค่แสงกับความแรง */
const TIERS = {
  a: { glow: '255,226,244', core: '#FFFFFF', spark: '#FFFFFF', bgTop: '#F5C9EC', bgBot: '#B88AE8', ring: ['#FFE3F6', '#E7A8E6'], power: 0.65 },
  s: { glow: '255,214,110', core: '#FFF6C8', spark: '#FFE27A', bgTop: '#FFD9A8', bgBot: '#B07ADF', ring: ['#FFF0B0', '#F1B640'], power: 1 },
};

// จุดกลางแคปซูลตอนกอด (หน่วยเกม เทียบกับเท้า) — วัดจากตัววาดจริงครั้งแรกที่สร้างฉาก
let CHEST = null;
function measureChest(skin) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 4;
  const c = cv.getContext('2d');
  let got = null;
  drawCat2(c, 0, 0, CS, skin, 600, {
    k: 1, shape: { knead: 1, clasp: 1, grip: 1 },
    holdDraw: (cc, x, y) => { const p = cc.getTransform().transformPoint(new DOMPoint(x, y + CAP_DY)); got = { x: p.x, y: p.y }; },
  });
  return got || { x: 0, y: -60 };
}

// อุ้งเท้าเกาะขอบ = อุ้งเท้าจริงของน้อง: วาดน้องท่าประคอง (knead) นอกจอครั้งเดียว แล้วตัดเฉพาะอุ้งเท้า
// ตามวงรีเดียวกับที่ตัววาดใช้กันอุ้งเท้า (notPaw) หมุนให้ชี้ขึ้น เก็บเป็นภาพเล็กสองข้าง [ซ้าย, ขวา]
const PAW_PX = 14;           // ความละเอียดภาพอุ้งเท้า (พิกเซลต่อหน่วยโลก)
const PAW_ZOOM = 1.6;        // ขยายอุ้งเท้าตอนเกาะขอบ (ขนาดจริงเล็กไปเมื่อเห็นแค่ปลาย)
let PAWS = null;
function makePaws(skin) {
  const sc = CS * PAW_PX;    // หน่วยเกม → พิกเซลของภาพ
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(600 * UNIT * sc);
  cv.height = Math.ceil(720 * UNIT * sc);
  const c = cv.getContext('2d');
  let tips = null;
  drawCat2(c, cv.width / 2, FEET_PX(cv.height), sc, skin, 600, {
    k: 1, shape: { knead: 1 },
    onHoldTips: (cc, tl, tr, R) => {
      const m = cc.getTransform();
      tips = [tl, tr].map((q) => {
        const p0 = m.transformPoint(new DOMPoint(q.x, q.y));
        const p1 = m.transformPoint(new DOMPoint(q.x + Math.cos(q.a), q.y + Math.sin(q.a)));
        const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x), k = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        return { x: p0.x + Math.cos(ang) * 2 * k, y: p0.y + Math.sin(ang) * 2 * k, ang, rx: R * k, ry: (R - 1) * k };
      });
    },
  });
  if (!tips) return null;
  return tips.sort((a, b) => a.x - b.x).map((t) => {
    const S = Math.ceil(t.rx * 2.3);
    const pc = document.createElement('canvas');
    pc.width = pc.height = S;
    const q = pc.getContext('2d');
    q.translate(S / 2, S / 2);
    q.rotate(-Math.PI / 2 - t.ang);   // ปลายอุ้งเท้าชี้ขึ้น
    q.translate(-t.x, -t.y);
    q.beginPath();
    q.ellipse(t.x, t.y, t.rx, t.ry, t.ang, 0, TAU);
    q.clip();
    q.drawImage(cv, 0, 0);
    return pc;
  });
}
const FEET_PX = (h) => (648 / 720) * h;

export function createCine({ tier = 'a', skin }) {
  if (!CHEST) CHEST = measureChest(skin);
  if (!PAWS) PAWS = makePaws(skin);
  return {
    tier: tier === 's' ? 's' : 'a', skin,
    phase: 'intro', f: 0, life: 0, waitF: 0,
    capPx: null,        // จุดกลาง/รัศมีแคปซูลบนจอ (พิกเซล) จากเฟรมล่าสุด
    fired: new Set(),
  };
}

const EVENTS = [['grab', 6], ['grab2', 12], ['peek', T_PEEK + 2], ['look', 46], ['look2', 64], ['spot', T_SPOT + 2], ['pan', T_PAN],
  ['flip', T_FLIP + 2], ['catch', T_CATCH + 2], ['spoil', SPOIL]];

/** เดินเวลา — คืนเหตุการณ์ที่เพิ่งเกิด (ไว้ยิงเสียง ดู CINE_SFX) */
export function stepCine(C, dt) {
  const ev = [];
  const fire = (key, at, name = key) => { if (!C.fired.has(key) && C.f >= at) { C.fired.add(key); ev.push(name); } };
  C.life += dt;
  if (C.phase === 'done') return ev;
  C.f += dt;
  if (C.phase === 'intro') {
    for (const [k, at] of EVENTS) fire(k, at, k === 'spoil' ? 'spoil_' + C.tier : k);
    if (C.f >= INTRO) { C.phase = 'wait'; C.f = 0; ev.push('prompt'); }
  } else if (C.phase === 'wait') {
    C.waitF += dt;
  } else if (C.phase === 'open') {
    fire('strain', 0);
    fire('pop', POP);
    fire('flash', POP + 8);
    if (C.f >= OPEN) { C.phase = 'done'; ev.push('done'); }
  }
  return ev;
}

/** แตะจอ — เปิดได้เฉพาะตอนน้องพร้อมดึงฝา (ช่วงรอ) */
export function tapCine(C) {
  if (C.phase !== 'wait') return false;
  C.phase = 'open';
  C.f = 0;
  return true;
}

/** ข้าม — ไปจอขาวท้ายฉากทันที (ผู้เรียกเผยการ์ด) */
export function skipCine(C) {
  if (C.phase === 'done') return;
  C.phase = 'open';
  C.f = Math.max(C.f, POP + 40);
  C.fired.add('strain'); C.fired.add('pop');
}

/** หน้าทดสอบ: ไปเฟรม g บนหลอดเวลา (0..CINE_LEN) — ช่วงรอยาว WAIT_PREVIEW · เลยจากนั้น = หลังแตะ */
export function seekCine(C, g) {
  g = Math.max(0, Math.min(CINE_LEN, g));
  C.life = g;
  C.fired = new Set();
  if (g < INTRO) {
    C.phase = 'intro'; C.f = g; C.waitF = 0;
    for (const [k, at] of EVENTS) if (g >= at) C.fired.add(k);
  } else if (g < INTRO + WAIT_PREVIEW) {
    C.phase = 'wait'; C.f = 0; C.waitF = g - INTRO;
    for (const [k] of EVENTS) C.fired.add(k);
  } else {
    C.f = g - INTRO - WAIT_PREVIEW;
    C.phase = C.f >= OPEN ? 'done' : 'open';
    C.waitF = WAIT_PREVIEW;
    for (const [k] of EVENTS) C.fired.add(k);
    for (const [k, at] of [['strain', 0], ['pop', POP], ['flash', POP + 8]]) if (C.f >= at) C.fired.add(k);
  }
}
/** ตำแหน่งบนหลอดเวลาของหน้าทดสอบ (ช่วงรอวนในช่อง WAIT_PREVIEW) */
export function cineClock(C) {
  if (C.phase === 'intro') return C.f;
  if (C.phase === 'wait') return INTRO + (C.waitF % WAIT_PREVIEW);
  if (C.phase === 'open') return INTRO + WAIT_PREVIEW + C.f;
  return CINE_LEN;
}

/** ตำแหน่งเท้าน้อง (หน่วยโลก) + รูปร่าง + การหมุนม้วนตัว ณ เวลานี้ */
function catAt(C) {
  const T = TIERS[C.tier];
  const fx = -CHEST.x, fy = -CHEST.y;   // เท้าที่ทำให้แคปซูลที่กอดอยู่ตรงกลางวงแหวนพอดี
  const breathe = Math.sin(C.life * 0.09);
  if (C.phase === 'intro') {
    const f = C.f;
    if (f < T_FLIP) {
      // ── เกาะขอบ → หัวโผล่ → กรอกตามองซ้ายขวา → เงยเห็นแคปซูล → มุดลงเตรียมกระโดด ──
      const up = track(f, [[T_PEEK, HIDE_Y], [T_PEEK + 14, PEEK_Y, E.back], [T_DUCK, PEEK_Y], [T_FLIP, HIDE_Y + 10, E.in]]);
      const gaze = track(f, [[T_LOOK, 0], [T_LOOK + 8, -0.95, E.out], [60, -0.95], [66, 0.95, E.out], [78, 0.95], [T_SPOT - 2, 0, E.out]]);
      const gazeY = track(f, [[T_LOOK, 0], [T_LOOK + 8, -0.55, E.out], [T_SPOT - 4, -0.55], [T_SPOT + 2, -1, E.out]]);
      const spot = env(f, T_SPOT, T_SPOT + 4, T_DUCK, T_DUCK + 6);
      return {
        x: 0, y: up, spin: 0,
        shape: {
          tilt: track(f, [[T_LOOK, 0], [T_LOOK + 8, 0.09, E.out], [60, 0.09], [66, -0.09, E.out], [78, -0.09], [T_SPOT - 2, 0, E.out]]),
          gaze, gazeY,
          ear: track(f, [[T_PEEK, 0.4], [T_PEEK + 10, -0.3, E.back], [T_SPOT, -0.25], [T_SPOT + 4, -0.7, E.back]]),
          shut: env(f, 62, 63, 64, 66),                     // กะพริบตอนหันกลับ
          mood: spot > 0.3 ? 'starry' : '',
          mouth: spot * 0.55,
          sy: track(f, [[T_PEEK, -0.06], [T_PEEK + 8, 0.05, E.out], [T_PEEK + 16, 0, E.back]]) + spot * 0.03,
          wag: Math.sin(C.life * 0.12) * 0.4,
        },
      };
    }
    // ── กระโดดม้วนตัวขึ้นจากใต้จอ → คลายตัวกางแขน → เกาะกอดแคปซูล → สปอยล์ ──
    const u = clamp01((f - T_FLIP) / (T_CATCH + 2 - T_FLIP));
    const x = lerp(0, fx, E.io(u));
    const y = lerp(HIDE_Y + 40, fy, E.out(u));
    const spin = TAU * E.io(clamp01((f - T_FLIP) / (T_CATCH - 6 - T_FLIP)));
    const tuck = env(f, T_FLIP, T_FLIP + 6, T_CATCH - 10, T_CATCH - 2);
    const hold = track(f, [[T_CATCH - 6, 0], [T_CATCH + 2, 1, E.out]]);
    const clasp = track(f, [[T_CATCH - 2, 0], [T_CATCH + 10, 1, E.out]]);
    const spoil = env(f, SPOIL - 2, SPOIL + 24, 9999, 10000);
    const bob = f > T_CATCH + 10 ? Math.sin((f - T_CATCH) * 0.09) * 1.6 : 0;
    return {
      x, y: y + bob, spin,
      shape: {
        // ม้วนตัวกลม: ขาพับสุด แขนหุบ หลับตายิ้ม หางม้วน (ค่าเดียวกับท่าตีลังกาใน cat2-run.js)
        liftL: 46 * tuck, liftR: 46 * tuck, kickL: -0.55 * tuck, kickR: -0.35 * tuck,
        armSwingL: -0.5 * tuck, armSwingR: 0.2 * tuck, elbowL: 1.1 * tuck, elbowR: -1.1 * tuck, crouch: 0.3 * tuck,
        tada: track(f, [[T_CATCH - 12, 0], [T_CATCH - 6, 0.8, E.out], [T_CATCH + 2, 0, E.out]]),   // คลายตัวกางแขนรับ
        knead: hold, clasp, grip: 1,
        sy: track(f, [[T_CATCH - 2, 0], [T_CATCH + 3, -0.08, E.out], [T_CATCH + 16, 0, E.back]]),
        sx: track(f, [[T_CATCH - 2, 0], [T_CATCH + 3, 0.07, E.out], [T_CATCH + 16, 0, E.back]]),
        ear: track(f, [[T_FLIP, 0.5], [T_CATCH, -0.2], [SPOIL + 20, -0.35 * T.power]]),
        tilt: Math.sin(C.life * 0.06) * 0.04,
        wag: tuck > 0.2 ? 1.2 : Math.sin(C.life * 0.2) * 0.6,
        shut: tuck > 0.4 ? 1 : 0,
        mood: tuck > 0.4 ? 'happy' : f < SPOIL + 16 ? '' : 'starry',
        mouth: tuck * 0.4 + (C.tier === 's' ? env(f, SPOIL + 22, SPOIL + 30, SPOIL + 46, SPOIL + 58) * 0.7 : 0),
        gazeY: spoil * 0.4,
      },
    };
  }
  if (C.phase === 'wait') {
    // กอดแน่น เตรียมดึง: เกร็งเป็นจังหวะ หูลู่ ตาโตมองแคปซูล
    const pull = (Math.sin(C.waitF * 0.16) + 1) / 2;
    return {
      x: fx, y: fy + Math.sin(C.life * 0.09) * 1.6, spin: 0,
      shape: {
        knead: 1, clasp: 1, grip: 1,
        sy: -0.025 * pull + breathe * 0.01, sx: 0.02 * pull,
        ear: -0.35 - 0.2 * pull, tilt: -0.05 * pull, gazeY: 0.5, wag: Math.sin(C.life * 0.2) * 0.5,
        shut: env(C.waitF % 170, 120, 123, 125, 129),   // กะพริบทุก ~3 วิ ระหว่างรอ
        mood: 'starry',
      },
    };
  }
  // เปิด: เกร็งสุด (หยีตา ตัวยุบ) → ฝาหลุด: ตัวเด้งถอยหลังนิด ตาเบิก อ้าปากดีใจ
  const f = C.f;
  const strain = env(f, 0, 6, POP - 1, POP + 1);
  const recoil = env(f, POP, POP + 4, POP + 12, POP + 30);
  return {
    x: fx, y: fy - recoil * 5, spin: 0,
    shape: {
      knead: 1, clasp: track(f, [[POP, 1], [POP + 22, 0.82]]), grip: 1,
      sy: -0.07 * strain + 0.07 * recoil, sx: 0.06 * strain - 0.03 * recoil,
      ear: -0.6 * strain + 0.3 * recoil,
      tilt: Math.sin(f * 3.1) * 0.025 * strain - 0.08 * recoil,
      shut: 0.85 * strain,
      mood: f > POP ? 'starry' : '',
      mouth: recoil * 0.9,
      wag: Math.sin(C.life * 0.3) * 1.2,
    },
  };
}

// ── กล้อง ── ตั้งต่ำ (ขอบล่างจอ = ขอบที่น้องเกาะ · แคปซูลโผล่แค่เสี้ยวบนจอ) เอียงตามที่น้องกรอกตา
//    → ดันเข้านิดตอนเห็นแคปซูล → แพนขึ้นไปแคปซูล (เหวี่ยงเอียง) → ตามตัวที่ม้วนขึ้นมา → ซูมกระแทกตอนเกาะ
//    → ซูมเข้าหาแคปซูลตอนสปอยล์ (S ลึกกว่า สั่นเบา ๆ) · คืน { z, fx, fy, rot, shake }
function camAt(C) {
  const T = TIERS[C.tier];
  const zS = 1 + 0.32 * T.power;
  if (C.phase === 'intro') {
    const f = C.f;
    const z = track(f, [[0, 1], [T_SPOT, 1], [T_SPOT + 8, 1.06, E.out], [T_PAN, 1.06], [T_FLIP + 8, 1.0, E.io], [T_CATCH - 2, 1.0], [T_CATCH + 4, 1.15, E.out], [T_CATCH + 18, 1.04, E.io], [INTRO, zS, E.io]]);
    const fy = track(f, [[0, 125], [T_PAN, 125], [T_FLIP + 10, -12, E.io], [SPOIL, -14], [INTRO, -26, E.io]]);
    const rot = track(f, [[T_LOOK, 0], [T_LOOK + 10, -0.035, E.io], [60, -0.035], [68, 0.035, E.io], [78, 0.035], [T_SPOT, 0, E.io],
      [T_PAN + 8, -0.06, E.io], [T_FLIP + 14, 0.04, E.io], [T_CATCH + 4, 0, E.io]]);
    const shake = 2.2 * env(f, T_CATCH, T_CATCH + 1, T_CATCH + 3, T_CATCH + 10) + (C.tier === 's' ? 0.6 * env(f, SPOIL + 20, SPOIL + 34, INTRO - 6, INTRO) : 0);
    return { z, fx: 0, fy, rot, shake };
  }
  if (C.phase === 'wait') return { z: zS, fx: 0, fy: -26, rot: 0, shake: C.tier === 's' ? 0.4 : 0 };
  const f = C.f;
  const z = zS + track(f, [[0, 0], [POP - 2, 0.08, E.in], [POP + 6, -0.06, E.out], [OPEN, 0.1]]);
  const rot = track(f, [[POP, 0], [POP + 6, 0.035, E.out], [POP + 30, 0, E.io]]);
  return { z, fx: 0, fy: -26, rot, shake: 3.5 * env(f, POP - 1, POP + 1, POP + 6, POP + 18) + 1.2 * env(f, 0, 4, POP - 3, POP) };
}

// ── ชิ้นส่วนฉาก ──
/** แฉกสี่เรียว (เว้าเข้ากลาง) — w = ความอ้วนของแฉก */
function star4(c, r, w) {
  const q = r * w;
  c.beginPath();
  c.moveTo(0, -r);
  c.quadraticCurveTo(q, -q, r, 0);
  c.quadraticCurveTo(q, q, 0, r);
  c.quadraticCurveTo(-q, q, -r, 0);
  c.quadraticCurveTo(-q, -q, 0, -r);
  c.fill();
}
/** ประกายวิ้ง: แสงนวลกลม + แฉกสี่ยาวเรียว + แฉกเฉียงสั้น + เม็ดแสงกลาง (พิกัดจอ) */
function twinkle(c, x, y, r, rot, a, col) {
  if (a <= 0.01 || r < 0.4) return;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.globalAlpha = a * 0.7;
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r * 0.75);
  g.addColorStop(0, `rgba(${col},1)`);
  g.addColorStop(1, `rgba(${col},0)`);
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, r * 0.75, 0, TAU); c.fill();
  c.globalAlpha = a;
  c.fillStyle = `rgb(${col})`;
  star4(c, r, 0.1);
  c.fillStyle = '#FFFFFF';
  star4(c, r * 0.7, 0.07);
  c.rotate(Math.PI / 4);
  c.globalAlpha = a * 0.85;
  star4(c, r * 0.38, 0.14);
  c.beginPath(); c.arc(0, 0, r * 0.09, 0, TAU); c.fill();
  c.restore();
}
/** ทุ่งประกายรอบแคปซูล (พิกัดจอ): ดาววิ้งเกิด-ดับเป็นรอบ ๆ ไม่ซ้ำที่ + ผงกากเพชรลอยขึ้น
 *  ทุกอย่างคิดจากเวลา (ไม่มีสถานะ) — เลื่อนหลอดเวลาไปไหนก็ตรง */
function drawTwinkles(c, x, y, r, C, k) {
  if (k <= 0.01) return;
  const T = TIERS[C.tier], L = C.life, S = C.tier === 's';
  c.save();
  const n = S ? 30 : 20;
  for (let i = 0; i < n; i++) {
    const per = 46 + hash(i + 700) * 54;
    const ph = L / per + hash(i + 710), cyc = Math.floor(ph), u = ph - cyc;
    const sd = i * 13.7 + cyc * 7.31;
    const ang = hash(sd + 1) * TAU, d = r * (1.2 + hash(sd + 2) * (S ? 2.6 : 2));
    const sz = r * (0.1 + hash(sd + 3) ** 2 * (S ? 0.42 : 0.32)) * Math.sin(u * Math.PI) ** 1.5;
    const col = hash(sd + 5) < (S ? 0.65 : 0.4) ? T.glow : '255,255,255';
    twinkle(c, x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.85 - u * r * 0.3, sz, u * 0.9 + hash(sd + 4) * 2, k, col);
  }
  // ผงกากเพชร: เม็ดเล็กมากลอยขึ้นช้า ๆ กะพริบ
  const m = S ? 64 : 40;
  for (let i = 0; i < m; i++) {
    const per = 100 + hash(i + 800) * 90;
    const u = (L / per + hash(i + 810)) % 1;
    const px = x + (hash(i + 820) - 0.5) * r * 4.6 + Math.sin(L * 0.03 + i) * r * 0.15;
    const py = y + r * 1.5 - u * r * 4.8;
    c.globalAlpha = k * Math.sin(u * Math.PI) * (0.45 + 0.55 * Math.abs(Math.sin(L * 0.21 + i * 2.1)));
    c.fillStyle = hash(i + 830) < 0.5 ? `rgb(${T.glow})` : '#FFFFFF';
    c.beginPath(); c.arc(px, py, r * (0.02 + hash(i + 840) * 0.035), 0, TAU); c.fill();
  }
  c.restore();
}
/** ประกายแตกกระจายตอนน้องจับแคปซูลได้ (v = เฟรมนับจากจังหวะจับ) */
function drawBurst(c, x, y, r, C, v) {
  if (v < 0 || v > 34) return;
  const T = TIERS[C.tier];
  const n = C.tier === 's' ? 16 : 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + hash(i + 900) * 0.4;
    const d = r * (1 + E.out(v / 34) * (1.6 + hash(i + 910) * 1.2));
    const sz = r * (0.16 + hash(i + 920) * 0.2) * (1 - v / 34);
    twinkle(c, x + Math.cos(a) * d, y + Math.sin(a) * d, sz, v * 0.08, 1, i % 2 ? T.glow : '255,255,255');
  }
}
/** แสงวาบวิ่งบนผิวแคปซูล (ทุก ~1.7 วิ) */
function drawGlint(c, x, y, r, C, k) {
  if (k <= 0.01) return;
  const u = (C.life % 100) / 22;
  if (u > 1) return;
  const a = -2.7 + u * 1.5;
  twinkle(c, x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72, r * 0.42 * Math.sin(u * Math.PI), u, k, '255,255,255');
}
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function drawBg(c, W, H, C, spoil) {
  const T = TIERS[C.tier];
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.tier === 's' ? mixHex('#F5C9EC', T.bgTop, spoil) : T.bgTop);
  g.addColorStop(1, T.bgBot);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // ประกายลอยทั่วฉาก: ดาววิ้งเล็กกะพริบ + จุดแสงจิ๋ว
  for (let i = 0; i < 34; i++) {
    const x = hash(i) * W, y = (hash(i + 40) * H - C.life * (0.15 + hash(i + 9) * 0.35) * H / 300 + H) % H;
    const a = Math.abs(Math.sin(C.life * 0.05 + i)) ** 2;
    twinkle(c, x, y, (2.5 + hash(i + 3) ** 2 * 7) * H / 500, 0, a * 0.9, '255,255,255');
  }
  c.fillStyle = '#FFFFFF';
  for (let i = 0; i < 50; i++) {
    const x = hash(i + 200) * W, y = (hash(i + 240) * H - C.life * 0.12 * H / 300 + H) % H;
    c.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(C.life * 0.08 + i * 1.3));
    c.beginPath(); c.arc(x, y, (0.6 + hash(i + 260) * 1.2) * H / 500, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
}
function mixHex(a, b, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * clamp01(k)).toString(16).padStart(2, '0')).join('');
}

/** ลำแสงหมุนหลังแคปซูล (S) — พิกัดจอ */
function drawRays(c, x, y, R, k, t, col) {
  if (k <= 0.01) return;
  c.save();
  c.translate(x, y);
  c.rotate(t * 0.006);
  const g = c.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
  g.addColorStop(0, `rgba(${col},${0.55 * k})`);
  g.addColorStop(1, `rgba(${col},0)`);
  c.fillStyle = g;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, R, a - 0.09, a + 0.09);
    c.closePath();
    c.fill();
  }
  c.restore();
}

function drawCapsule(c, x, y, r, { lid = true, base = true, shake = 0 } = {}) {
  c.save();
  c.translate(x + shake, y);
  if (base) {
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI);
    c.closePath();
    const g = c.createLinearGradient(0, 0, 0, r);
    g.addColorStop(0, '#FFFDF8');
    g.addColorStop(1, '#F1DCEA');
    c.fillStyle = g;
    c.fill();
    c.lineWidth = r * 0.07;
    c.strokeStyle = '#C0558E';
    c.stroke();
    // ขอบพับปากแคปซูล
    c.fillStyle = '#FF9CCB';
    c.fillRect(-r, -r * 0.02, r * 2, r * 0.13);
  }
  if (lid) drawLid(c, 0, 0, r, 0);
  c.restore();
}
function drawLid(c, x, y, r, rot) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.beginPath();
  c.arc(0, 0, r, Math.PI, TAU);
  c.closePath();
  const g = c.createRadialGradient(-r * 0.35, -r * 0.55, r * 0.1, 0, -r * 0.3, r * 1.1);
  g.addColorStop(0, '#FFE6F4');
  g.addColorStop(0.5, '#FF9ACB');
  g.addColorStop(1, '#E95E9E');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = r * 0.07;
  c.strokeStyle = '#C0558E';
  c.stroke();
  // หน้าแมวขาวบนฝา
  c.fillStyle = 'rgba(255,255,255,.92)';
  c.beginPath();
  c.moveTo(-r * 0.42, -r * 0.18);
  c.lineTo(-r * 0.36, -r * 0.62);
  c.lineTo(-r * 0.14, -r * 0.44);
  c.quadraticCurveTo(0, -r * 0.5, r * 0.14, -r * 0.44);
  c.lineTo(r * 0.36, -r * 0.62);
  c.lineTo(r * 0.42, -r * 0.18);
  c.quadraticCurveTo(0, -r * 0.02, -r * 0.42, -r * 0.18);
  c.fill();
  c.fillStyle = '#7A3A5E';
  for (const d of [-1, 1]) { c.beginPath(); c.arc(d * r * 0.16, -r * 0.3, r * 0.045, 0, TAU); c.fill(); }
  // แสงสะท้อน
  c.fillStyle = 'rgba(255,255,255,.7)';
  c.beginPath(); c.ellipse(-r * 0.5, -r * 0.55, r * 0.16, r * 0.08, -0.7, 0, TAU); c.fill();
  c.restore();
}

/** แสงรอบแคปซูล (พิกัดจอ) + ประกายวน (S: วงประกายทองหมุน) */
/** แสงฟุ้งหลังตัวน้อง (วาดก่อนน้อง — ไม่ทาทับตัวจนซีด) */
function drawGlow(c, x, y, r, C, k) {
  if (k <= 0.01) return;
  const T = TIERS[C.tier];
  const R = r * (3.2 + 0.3 * Math.sin(C.life * 0.14)) * (0.75 + 0.45 * T.power);
  const g = c.createRadialGradient(x, y, r * 0.3, x, y, R);
  g.addColorStop(0, `rgba(${T.glow},${0.85 * k})`);
  g.addColorStop(1, `rgba(${T.glow},0)`);
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill();
}
/** ประกายหน้าตัว: แสงนวลบนแคปซูลเล็ก ๆ + ประกายวน (S: วงแหวนแสงทองหมุน) */
function drawAura(c, x, y, r, C, k) {
  if (k <= 0.01) return;
  const T = TIERS[C.tier];
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y - r * 0.3, 0, x, y - r * 0.3, r * 1.1);
  g.addColorStop(0, `rgba(${T.glow},${0.45 * k * (0.75 + 0.25 * Math.sin(C.life * 0.2))})`);
  g.addColorStop(1, `rgba(${T.glow},0)`);
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y - r * 0.3, r * 1.1, 0, TAU); c.fill();
  c.restore();
  // ประกายวนรอบ (ดาววิ้งแบบละเอียด ขนาดสลับเล็กใหญ่)
  const n = C.tier === 's' ? 10 : 6;
  for (let i = 0; i < n; i++) {
    const a = C.life * (C.tier === 's' ? 0.05 : 0.03) + (i / n) * TAU;
    const rr = r * (C.tier === 's' ? 1.9 : 1.6);
    const tw = 0.5 + 0.5 * Math.sin(C.life * 0.2 + i * 1.7);
    twinkle(c, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75, r * (i % 2 ? 0.2 : 0.32) * (0.6 + 0.4 * tw), C.life * 0.02, k * tw, T.glow);
  }
  if (C.tier === 's') {
    // วงแหวนแสงทองหมุนเอียง
    c.save();
    c.translate(x, y);
    c.rotate(-0.3);
    c.strokeStyle = `rgba(255,220,110,${0.85 * k})`;
    c.lineWidth = r * 0.09;
    c.setLineDash([r * 0.5, r * 0.3]);
    c.lineDashOffset = -C.life * 1.2;
    c.beginPath(); c.ellipse(0, 0, r * 2.2, r * 0.8, 0, 0, TAU); c.stroke();
    c.restore();
  }
}

/** "แตะเพื่อเปิด!" + อุ้งเท้าชี้ — วาดลงจอ */
function drawPrompt(c, W, H, C) {
  const k = clamp01(C.waitF / 14);
  const y = H * 0.91 + Math.sin(C.life * 0.12) * H * 0.008;
  const fs = Math.round(H * 0.06);
  c.save();
  c.globalAlpha = k;
  c.font = `800 ${fs}px Mali, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = fs * 0.22;
  c.strokeStyle = C.tier === 's' ? '#B26A0E' : '#A1428E';
  c.strokeText('แตะเพื่อเปิด!', W / 2, y);
  c.fillStyle = '#FFFFFF';
  c.fillText('แตะเพื่อเปิด!', W / 2, y);
  c.restore();
}

/** เมฆนุ่ม ๆ หลังฉาก (พิกัดโลก — เลื่อนตามกล้อง เห็นว่ากล้องแพน) */
function drawClouds(c) {
  c.fillStyle = 'rgba(255,255,255,.55)';
  for (let i = 0; i < 10; i++) {
    const x = -520 + i * 110 + hash(i + 70) * 40, y = -170 + hash(i + 80) * 330, r = 22 + hash(i + 90) * 20;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.arc(x + r * 0.9, y + r * 0.2, r * 0.75, 0, TAU);
    c.arc(x - r * 0.9, y + r * 0.25, r * 0.7, 0, TAU);
    c.fill();
  }
}

/** ขอบล่างที่น้องเกาะ: แท่นขนมครีมชมพู ขอบบนครีมย้อยเป็นคลื่น โรยเม็ดสี (พิกัดโลก · วาดทับตัวน้อง) */
function drawLedge(c) {
  const g = c.createLinearGradient(0, LEDGE, 0, LEDGE + 140);
  g.addColorStop(0, '#F59CC6');
  g.addColorStop(1, '#C978D8');
  c.fillStyle = g;
  c.fillRect(-900, LEDGE - 4, 1800, 700);
  // ครีมย้อยขอบบน
  c.beginPath();
  c.moveTo(-900, LEDGE);
  for (let x = -900; x <= 900; x += 30) {
    const d = 8 + hash(x * 0.37) * 10;
    c.quadraticCurveTo(x + 7, LEDGE + d + 6, x + 15, LEDGE + 4);
    c.quadraticCurveTo(x + 22, LEDGE - 1, x + 30, LEDGE);
  }
  c.lineTo(900, LEDGE - 10);
  c.lineTo(-900, LEDGE - 10);
  c.closePath();
  c.fillStyle = '#FFF4FA';
  c.fill();
  c.strokeStyle = 'rgba(190,80,140,.45)';
  c.lineWidth = 1.6;
  c.stroke();
  // เม็ดสีโรยบนครีม
  const cols = ['#FF7FB2', '#7FD4FF', '#FFD45E', '#B98AFF', '#7FE3B5'];
  for (let i = 0; i < 46; i++) {
    const x = -880 + i * 38 + hash(i + 300) * 20, y = LEDGE - 6 + hash(i + 400) * 8;
    c.save();
    c.translate(x, y);
    c.rotate(hash(i + 500) * Math.PI);
    c.fillStyle = cols[i % cols.length];
    c.fillRect(-3, -1, 6, 2.2);
    c.restore();
  }
}

/** อุ้งเท้าจริงของน้องเกาะขอบ (ภาพจาก makePaws) — k 0..1 = เลื่อนขึ้นจากใต้ขอบ · เห็นเฉพาะส่วนเหนือขอบ */
function drawLedgePaw(c, x, k, spr) {
  if (k <= 0.01 || !spr) return;
  const s = (spr.width / PAW_PX) * PAW_ZOOM;
  const top = LEDGE - 10;                       // ผิวบนของขอบ
  const y = top - s * 0.06 + (1 - k) * s * 0.6;
  c.save();
  c.beginPath();
  c.rect(x - s, top - s * 2, s * 2, s * 2 + 0.6);   // โผล่จากหลังผิวบนของขอบพอดีเส้น (แขนซ่อนหลังขอบ)
  c.clip();
  c.drawImage(spr, x - s / 2, y - s / 2, s, s);
  c.restore();
}

/** วาดฉากหนึ่งเฟรม (ctx = พิกเซลจอ ไม่มี transform) */
export function drawCine(c, W, H, C) {
  const T = TIERS[C.tier];
  const spoil = C.phase === 'intro' ? env(C.f, SPOIL - 2, SPOIL + 30, 99999, 100000) : 1;
  const cat = catAt(C);
  const cam = camAt(C);
  const u = (H / VIEW) * cam.z;
  const sx = (Math.random() - 0.5) * cam.shake * u, sy = (Math.random() - 0.5) * cam.shake * u;
  // กล้อง: จุดโฟกัสไปกลางจอ หมุน ซูม (+ สั่น)
  const M = new DOMMatrix().translate(W / 2 + sx, H / 2 + sy).rotate((cam.rot * 180) / Math.PI).scale(u).translate(-cam.fx, -cam.fy);

  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  drawBg(c, W, H, C, spoil);
  if (C.tier === 's' && C.capPx) drawRays(c, C.capPx.x, C.capPx.y, Math.max(W, H) * 0.8, spoil * T.power, C.life, '255,220,120');
  c.setTransform(M);
  drawClouds(c);
  const caught = (cat.shape.clasp || 0) > 0.05;
  // แคปซูลลอย (ก่อนน้องจับ) — ช่วงแรกเห็นแค่เสี้ยวที่ขอบบนจอ · ตอนน้องเงยเห็นมันกะพริบเรียก
  if (!caught) {
    const bob = Math.sin(C.life * 0.08) * 3;
    if (C.phase === 'intro' && C.f > T_SPOT - 4) {
      const k = env(C.f, T_SPOT - 4, T_SPOT + 4, T_FLIP + 20, T_CATCH);
      c.save();
      c.globalCompositeOperation = 'lighter';
      const gg = c.createRadialGradient(0, bob, CAP_R * 0.4, 0, bob, CAP_R * 2.4);
      gg.addColorStop(0, `rgba(255,240,250,${0.6 * k})`);
      gg.addColorStop(1, 'rgba(255,240,250,0)');
      c.fillStyle = gg;
      c.beginPath(); c.arc(0, bob, CAP_R * 2.4, 0, TAU); c.fill();
      c.restore();
    }
    drawCapsule(c, 0, bob, CAP_R);
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  // แสงฟุ้งหลังน้อง (จุดแคปซูลจากเฟรมก่อน)
  if (caught && C.capPx) drawGlow(c, C.capPx.x, C.capPx.y, C.capPx.r, C, spoil);

  // น้อง (กอดแคปซูลผ่าน holdDraw — อุ้งเท้าเกาะขอบซ้ายขวาของแคปซูล) · ม้วนตัวหมุนรอบกลางตัว
  const popped = C.phase === 'open' && C.f >= POP;
  const shake = C.phase === 'wait' ? Math.sin(C.waitF * 0.9) * 0.6 : C.phase === 'open' && !popped ? Math.sin(C.f * 2.4) * 2.2 : 0;
  const PIV = 62;   // จุดหมุนม้วนตัว: กลางตัว (หน่วยโลกเหนือเท้า)
  c.setTransform(M.translate(cat.x, cat.y - PIV).rotate((cat.spin * 180) / Math.PI).translate(0, PIV));
  drawCat2(c, 0, 0, CS, C.skin, C.life + 600, {
    k: 1, shape: cat.shape, pose: 'cine', noBlink: true,   // กะพริบเองตามจังหวะฉาก (ไม่ให้ตาปิดตอนหัวโผล่/ตอนจับ)
    holdDraw: (cc, x, y) => {
      const r = CAP_R / FU;
      drawCapsule(cc, x, y + CAP_DY, r, { lid: !popped, shake });
      const m = cc.getTransform();
      const p = m.transformPoint(new DOMPoint(x, y + CAP_DY));
      C.capPx = { x: p.x, y: p.y, r: r * Math.hypot(m.a, m.b) };
    },
  });
  // ขอบล่าง + อุ้งเท้าเกาะ (ทับตัวน้อง — ตัวอยู่หลังขอบ)
  c.setTransform(M);
  if (C.phase === 'intro' && C.f < T_FLIP + 30) {
    drawLedge(c);
    const f = C.f;
    const off = track(f, [[T_DUCK, 1], [T_DUCK + 8, 0, E.in]]);
    drawLedgePaw(c, -PAW_X, track(f, [[2, 0], [8, 1, E.back]]) * off, PAWS?.[0]);
    drawLedgePaw(c, PAW_X, track(f, [[8, 0], [14, 1, E.back]]) * off, PAWS?.[1]);
  }
  // เครื่องหมาย "!" เหนือหัวตอนเห็นแคปซูล
  if (C.phase === 'intro') {
    const k = env(C.f, T_SPOT, T_SPOT + 3, T_PAN + 2, T_PAN + 8);
    if (k > 0.01) {
      c.save();
      c.translate(26, PEEK_Y - 132 - 6 * k);
      c.scale(k, k);
      c.fillStyle = '#FFFFFF';
      c.strokeStyle = '#E2559A';
      c.lineWidth = 3;
      c.font = '800 30px Mali, sans-serif';
      c.textAlign = 'center';
      c.strokeText('!', 0, 0);
      c.fillText('!', 0, 0);
      c.restore();
    }
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (!caught) {
    // ยังไม่จับ: จุดแคปซูลบนจอ = กลางวงแหวน (ไว้ให้แสง/ลำแสงใช้)
    const p = M.transformPoint(new DOMPoint(0, 0));
    C.capPx = { x: p.x, y: p.y, r: CAP_R * u };
  }
  const cp = C.capPx;
  // แสงสปอยล์รอบแคปซูล
  drawAura(c, cp.x, cp.y, cp.r, C, caught ? spoil : 0);
  // ประกายวิ้ง: แคปซูลลอยมีประกายเรียก (ตั้งแต่น้องเห็น) → จับได้ ประกายแตกกระจาย → สปอยล์ ประกายเต็มที่
  const intro = C.phase === 'intro';
  const tk = intro ? (caught ? 0.55 + 0.45 * spoil : 0.55 * clamp01((C.f - T_SPOT + 6) / 10)) : C.phase === 'done' ? 0 : 1;
  drawTwinkles(c, cp.x, cp.y, cp.r, C, tk);
  if (intro) drawBurst(c, cp.x, cp.y, cp.r, C, C.f - T_CATCH);
  if (!(C.phase === 'open' && C.f >= POP)) drawGlint(c, cp.x, cp.y, cp.r, C, intro ? clamp01((C.f - T_SPOT) / 8) : 1);

  if (C.phase === 'open') {
    const f = C.f;
    // ฝากระเด็นขึ้นซ้ายบน หมุนหลุดจอ
    if (popped) {
      const v = f - POP;
      drawLid(c, cp.x - v * cp.r * 0.34, cp.y - v * cp.r * 0.75 + v * v * cp.r * 0.012, cp.r, -v * 0.26);
      // ลำแสงพุ่งออกจากปากแคปซูล
      const beam = env(f, POP, POP + 6, OPEN, OPEN + 1);
      c.save();
      c.globalCompositeOperation = 'lighter';
      const bh = H * 1.2;
      const bg = c.createLinearGradient(cp.x, cp.y, cp.x, cp.y - bh);
      bg.addColorStop(0, `rgba(${T.glow},${0.95 * beam})`);
      bg.addColorStop(1, `rgba(${T.glow},0)`);
      c.fillStyle = bg;
      c.beginPath();
      c.moveTo(cp.x - cp.r * 0.8, cp.y);
      c.lineTo(cp.x - cp.r * 3.2, cp.y - bh);
      c.lineTo(cp.x + cp.r * 3.2, cp.y - bh);
      c.lineTo(cp.x + cp.r * 0.8, cp.y);
      c.fill();
      c.restore();
    }
    // แสงขาวขยายจากแคปซูลจนเต็มจอ แล้วค้างขาว
    const fk = clamp01((f - POP - 4) / (OPEN - POP - 22));
    if (fk > 0) {
      const R = Math.hypot(W, H) * 1.1 * E.in(fk) + cp.r;
      const wg = c.createRadialGradient(cp.x, cp.y, R * 0.55, cp.x, cp.y, R);
      wg.addColorStop(0, 'rgba(255,255,255,1)');
      wg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = wg;
      c.fillRect(0, 0, W, H);
      c.fillStyle = `rgba(255,255,255,${clamp01((f - OPEN + 26) / 14)})`;
      c.fillRect(0, 0, W, H);
    }
  }
  if (C.phase === 'done') {
    c.fillStyle = '#FFFFFF';
    c.fillRect(0, 0, W, H);
  }
  if (C.phase === 'wait') drawPrompt(c, W, H, C);
  c.restore();
}
