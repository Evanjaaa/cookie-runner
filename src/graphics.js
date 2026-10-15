// src/graphics.js
// ─────────────────────────────────────────────────────────────
// ระดับกราฟิก — ตัวเดียวที่ตอบว่า "เครื่องนี้ควรทำงานหนักแค่ไหน"
//
// ── ทำไมต้องมี ──
// การวาดหนึ่งเฟรมคือของที่แพงที่สุดในเกม (ผ้าใบเต็มจอ + แสงฟุ้งทั้งเฟรม)
// มือถือบางรุ่นเล่นไปสิบนาทีแล้วร้อนจนเครื่องหรี่ความเร็วลงเอง ซึ่งเป็นการลดคุณภาพ
// แบบที่ผู้เล่นคุมไม่ได้เลย สู้ให้เขาเลือกเองว่าจะยอมแลกอะไรดีกว่า
//
// ── สามระดับต่างกันตรงไหน ──
//   scale   เพดานความละเอียดผ้าใบ (เท่าของ 960x420) — ตัวที่กินแรงที่สุด
//   fps     เพดานเฟรมต่อวินาที — จอ 120Hz ไม่ต้องวาดสองเท่าโดยเปล่าประโยชน์
//   bloom   แสงฟุ้งทั้งเฟรม: 1 = ทุกเฟรม, 2 = เฟรมเว้นเฟรม, 0 = ปิด
//   parts   ตัวคูณจำนวนอนุภาค
//
// ความละเอียด "อัตโนมัติ" (ค่าเริ่มต้น) ปรับตามแรงเครื่องจริง — ดูหัวข้อ "ความละเอียดอัตโนมัติ" ข้างล่าง
//
// ไฟล์นี้ไม่รู้จักหน้าจอและไม่วาดอะไรเอง — ใครอยากรู้ค่าก็เรียก quality()
// และถ้าอยากรู้ตอนค่าเปลี่ยนให้ลงทะเบียนผ่าน onQuality()
// ─────────────────────────────────────────────────────────────
import { loadPref, savePref } from './storage.js';
import { IS_PHONE } from './config.js';

export const LEVELS = {
  high: { scale: 2, fps: 60, bloom: 2, parts: 1 },
  mid: { scale: 1.5, fps: 60, bloom: 2, parts: 0.7 },
  save: { scale: 1.15, fps: 30, bloom: 0, parts: 0.45 },
};

export const LEVEL_IDS = ['high', 'mid', 'save'];

/**
 * เพดานความละเอียดบนมือถือ — ทับค่า scale ของระดับนั้นเฉพาะเครื่องที่เป็นมือถือ
 * จอ 6 นิ้วที่ 1.6 เท่ายังละเอียดเกินกว่าตาแยกออก (เทียบภาพกันแล้ว) แต่วาดพิกเซลน้อยลง 36%
 * ทุกเฟรม ซึ่งเป็นตัวที่ทำให้มือถือร้อนที่สุด คอมกับแท็บเล็ตยังได้ 2 เท่าเต็มเหมือนเดิม
 */
const PHONE_SCALE = { high: 1.6 };

// มือถือ = จอสัมผัส และด้านสั้นของจอไม่เกิน 500 จุด — นิยามเดียวกับขนาดตัวน้อง (IS_PHONE ใน config.js)

/** ค่าจริงที่ใช้บนเครื่องนี้ — คิดครั้งเดียว (quality() ถูกเรียกหลายครั้งต่อเฟรม) */
const ACTIVE = Object.fromEntries(Object.entries(LEVELS).map(([id, q]) => [
  id, IS_PHONE && PHONE_SCALE[id] ? { ...q, scale: PHONE_SCALE[id] } : q,
]));

// ══ ตั้งค่าแยกตามหน้า (หน้าแรก / บ้านลูกเหมียว+มินิเกม / ตอนวิ่ง) ═════════════════
// แต่ละหน้ามี { fps: เพดานเฟรม, level: ความสวย } ของตัวเอง — same = ใช้ค่าเดียวทุกหน้า
// เปลี่ยนหน้าระหว่างเล่น (setScene) = quality() ตอบค่าของหน้านั้นทันที
// ผ้าใบความละเอียดไม่เท่าเดิม → เรียกผู้ลงทะเบียน (onQuality) ให้ตั้งขนาดใหม่
export const SCENES = ['home', 'room', 'run'];
export const FPS_OPTS = [30, 45, 60, 90, 120];
/**
 * ความละเอียดภาพ (แยกจากความสวย) — เหมือนเกมมือถือทั่วไป
 * scale = เพดานความคมของจอเกมหลัก (เท่าของ 960×420) · dpr = เพดานของผ้าใบรอง (มินิเกม)
 * auto = ตามระดับความสวยเหมือนเดิม
 */
export const RES_OPTS = ['auto', 'low', 'mid', 'high', 'max'];
const RES = {
  low: { scale: 1, dpr: 1 },
  mid: { scale: 1.4, dpr: 1.25 },
  high: { scale: 2, dpr: 1.5 },
  max: { scale: 2.6, dpr: 2 },
};

const PREF = 'gfx';           // ค่าเดิม (ระดับเดียวทั้งเกม) — ใช้ตั้งต้นตอนย้ายมาระบบใหม่
const PREF2 = 'gfxScenes';
const legacy = LEVEL_IDS.includes(loadPref(PREF, '')) ? loadPref(PREF, '') : 'high';
const legacyFps = (lv) => (LEVELS[lv].fps >= 60 ? 60 : 30);

function loadCfg() {
  const raw = loadPref(PREF2, null);
  const cfg = { same: true, scenes: {} };
  if (raw && typeof raw === 'object') cfg.same = raw.same !== false;
  for (const sc of SCENES) {
    const r = raw?.scenes?.[sc] || {};
    cfg.scenes[sc] = {
      level: LEVEL_IDS.includes(r.level) ? r.level : legacy,
      fps: FPS_OPTS.includes(r.fps) ? r.fps : legacyFps(legacy),
      res: RES_OPTS.includes(r.res) ? r.res : 'auto',
    };
  }
  return cfg;
}
const cfg = loadCfg();
let scene = 'home';
const listeners = [];

// ══ ความละเอียดอัตโนมัติตามแรงเครื่อง (res = 'auto') ══════════════════════════════
// เดิม 'auto' = ตามระดับความสวยเฉย ๆ ทุกเครื่องได้เท่ากัน — iPad gen 9 (ชิปปี 2019 แต่ต้องวาดภาพใหญ่กว่า iPhone 2.7 เท่า
// เพราะจอ 4:3 ต่อฟ้า/พื้นบนล่าง) จึงกระตุกหนัก ทั้งที่ iPhone รุ่นใหม่ลื่นสบาย (ผู้ใช้ทัก 15 ต.ค.)
// ตอนนี้เกมวัดเอง: ช่วงห่างระหว่างเฟรมที่วาดจริง เฉลี่ยทุก 2 วินาที เทียบกับเพดานเฟรม (สูงสุด 60)
// - ทำไม่ทันสองช่วงติด = ลดหนึ่งขั้น · ขั้น 1–3 = ตัวคูณความละเอียด · ตั้งแต่ขั้น AUTO_LITE ปิดแสงฟุ้ง + แสงตะเกียงบนตัวน้องด้วย
//   (สองอย่างนี้ภาพเปลี่ยนน้อยแต่ประหยัดมาก) — เครื่องแรงไม่เคยลด สวยเต็มเหมือนเดิม
// - ลดแล้วไม่ดีขึ้นอย่างน้อย 8% (เช่นโหมดประหยัดพลังงานของ iOS ล็อกไว้ 30 เฟรม) = คอขวดไม่ใช่ความละเอียด
//   คืนขั้นเดิมแล้วเลิกลดสิบนาที ภาพจะไม่นุ่มลงฟรี ๆ
// - ลื่นนิ่งต่อเนื่องหนึ่งนาที = ลองขยับขึ้นหนึ่งขั้น (เครื่องหายร้อนแล้ว) · ขึ้นแล้วตกภายใน 12 วิ = ไม่ลองอีกห้านาที
// - จำขั้นของแต่ละหน้า (หน้าแรก/บ้าน/วิ่ง หนักไม่เท่ากัน) ไว้ในเครื่อง เปิดเกมครั้งหน้าเริ่มที่ขั้นที่ใช้ได้เลย
// - ผู้เล่นเลือกความละเอียดเอง (ต่ำ/กลาง/สูง/สูงสุด) = ระบบนี้ไม่ยุ่งเลย
const AUTO_STEPS = [1, 0.85, 0.72, 0.6];
const AUTO_LITE = 2;
const AUTO_PREF = 'gfxAuto';
const autoStep = Object.fromEntries(SCENES.map((sc) => [sc, 0]));
{
  const saved = loadPref(AUTO_PREF, null);
  if (saved && typeof saved === 'object') {
    for (const sc of SCENES) {
      const v = saved[sc] | 0;
      if (v > 0 && v < AUTO_STEPS.length) autoStep[sc] = v;
    }
  }
}
/** ตัววัดเฟรม (หน้าที่กำลังวัด ช่วงสะสม ตัวนับช่วงช้า/ลื่น ช่วงพักหลังเปลี่ยนขั้น ล็อก) */
const mon = { sc: null, last: 0, sum: 0, n: 0, win: 0, slow: 0, fast: 0, cool: 0, check: null, probeAt: 0, lock: {} };

/** ค่าที่ใช้ของหน้าหนึ่ง (same = ทุกหน้าใช้ค่าของหน้าแรก) */
export function sceneCfg(sc = scene) {
  return cfg.scenes[cfg.same ? 'home' : sc] || cfg.scenes.home;
}

/** ค่าของหน้าที่กำลังเล่น (หรือหน้าที่ระบุ) — { scale, fps, bloom, parts } */
export function quality(sc = scene) {
  const c = sceneCfg(sc);
  const q = { ...ACTIVE[c.level], fps: c.fps };
  if (RES[c.res]) q.scale = RES[c.res].scale;
  else if (autoStep[sc]) {
    // อัตโนมัติ: เครื่องวาดไม่ทัน → ลดความละเอียดตามขั้น (ไม่ต่ำกว่า 1 เท่าของฉาก) · ขั้นลึกปิดแสงฟุ้งด้วย
    q.scale = Math.max(1, q.scale * AUTO_STEPS[autoStep[sc]]);
    if (autoStep[sc] >= AUTO_LITE) q.bloom = 0;
  }
  return q;
}

/** อัตโนมัติลดถึงขั้นปิดแสงหนัก ๆ แล้วหรือยัง (ผู้วาดใช้ปิดแสงตะเกียงบนตัวน้องในหน้าแรก) */
export function autoLite(sc = scene) {
  return sceneCfg(sc).res === 'auto' && autoStep[sc] >= AUTO_LITE;
}

/** สถานะความละเอียดอัตโนมัติของหน้าหนึ่ง — { on, step, scale } (หน้าตั้งค่าโชว์ว่าลดไปเท่าไหร่) */
export function autoInfo(sc = scene) {
  return { on: sceneCfg(sc).res === 'auto', step: autoStep[sc], scale: AUTO_STEPS[autoStep[sc]] };
}

function setAutoStep(sc, v, now) {
  autoStep[sc] = Math.max(0, Math.min(AUTO_STEPS.length - 1, v));
  // ภาพสำรองต่าง ๆ ต้องวาดใหม่ตามขนาดผ้าใบใหม่ — พักการตัดสินสักครู่ ไม่เอาช่วงนั้นมาคิด
  mon.cool = now + 1500;
  mon.last = 0;
  mon.sum = 0;
  mon.n = 0;
  mon.win = now;
  savePref(AUTO_PREF, { ...autoStep });
  notify();
}

/**
 * ลูปหลักแจ้งทุกครั้งที่วาดเฟรม — full = เฟรมวาดตามจังหวะปกติ
 * (ไม่ใช่ช่วงที่ตั้งใจวาดห่าง เช่นมีแผงเมนูคลุม หรือหน้าแรกที่วางทิ้งไว้) เฟรมพวกนั้นไม่เอามาวัด
 */
export function frameDrawn(now, full) {
  const sc = scene;
  if (mon.sc !== sc) {
    mon.sc = sc;
    mon.slow = 0;
    mon.fast = 0;
    mon.check = null;
    mon.win = now;
    mon.sum = 0;
    mon.n = 0;
    mon.last = 0;
  }
  if (sceneCfg(sc).res !== 'auto' || !full) {
    mon.last = 0;
    return;
  }
  if (mon.last) {
    const d = now - mon.last;
    if (d < 400) {   // ช่วงสลับแท็บ/โหลดด่าน (ค้างเกิน 0.4 วิ) ไม่นับ
      mon.sum += d;
      mon.n++;
    }
  }
  mon.last = now;
  if (now - mon.win < 2000) return;
  const n = mon.n, avg = n ? mon.sum / n : 0;
  mon.win = now;
  mon.sum = 0;
  mon.n = 0;
  // อย่างน้อย 12 เฟรมต่อช่วง (~6 เฟรม/วิ) — เครื่องที่อ่อนมากก็ยังได้ลด (เดิมตั้ง 30 แล้วเครื่องช้ามากไม่เคยถึง เลยไม่เคยลด)
  if (now < mon.cool || n < 12) return;
  const target = 1000 / Math.min(60, sceneCfg(sc).fps);
  const slow = avg > target * 1.18;   // ต่ำกว่า ~51 จาก 60 เฟรม
  const st = autoStep[sc];
  // เพิ่งลดขั้นไป: ดีขึ้นไหม — ยังช้าและดีขึ้นไม่ถึง 8% = คอขวดไม่ใช่ความละเอียด คืนขั้นเดิม เลิกลดสิบนาที
  if (mon.check) {
    const { before } = mon.check;
    mon.check = null;
    if (slow && avg > before * 0.92) {
      mon.lock[sc] = now + 600000;
      setAutoStep(sc, st - 1, now);
      return;
    }
  }
  if (slow) {
    mon.fast = 0;
    if (++mon.slow >= 2 && st < AUTO_STEPS.length - 1 && now >= (mon.lock[sc] || 0)) {
      mon.slow = 0;
      if (now - mon.probeAt < 12000) mon.lock[sc] = now + 300000;   // เพิ่งลองขยับขึ้นแล้วตก — ไม่ลองขึ้นอีกห้านาที
      mon.check = { before: avg };
      setAutoStep(sc, st + 1, now);
    }
  } else if (avg < target * 1.06) {
    mon.slow = 0;
    if (++mon.fast >= 30 && st > 0 && now >= (mon.lock[sc] || 0)) {
      mon.fast = 0;
      mon.probeAt = now;
      setAutoStep(sc, st - 1, now);
    }
  } else {
    mon.slow = 0;
    mon.fast = 0;
  }
}

export function gfxLevel(sc = scene) {
  return sceneCfg(sc).level;
}

export function sameAll() {
  return cfg.same;
}

function save() {
  savePref(PREF2, cfg);
  savePref(PREF, cfg.scenes.home.level);   // เผื่อโค้ดเก่า/คลาวด์ที่ยังอ่านค่าเดิม
}
function notify() {
  for (const fn of listeners) fn(quality());
}

/** ตั้งค่าของหน้าหนึ่ง (same = ตั้งทุกหน้าพร้อมกัน) */
export function setSceneCfg(sc, { level, fps, res } = {}) {
  const targets = cfg.same ? SCENES : [sc];
  for (const t of targets) {
    if (LEVEL_IDS.includes(level)) cfg.scenes[t].level = level;
    if (FPS_OPTS.includes(fps)) cfg.scenes[t].fps = fps;
    if (RES_OPTS.includes(res)) cfg.scenes[t].res = res;
  }
  save();
  notify();
}

/** เปิด/ปิด "ใช้ทุกหน้าเหมือนกัน" — เปิด = ทุกหน้าคัดลอกค่าของหน้าที่กำลังดูอยู่ */
export function setSameAll(on, from = 'home') {
  if (on) {
    const src = { ...cfg.scenes[from] };
    for (const t of SCENES) cfg.scenes[t] = { ...src };
  }
  cfg.same = !!on;
  save();
  notify();
}

/** หน้าที่กำลังเล่น — ลูปหลักบอกทุกเฟรม แจ้งผู้ลงทะเบียนเฉพาะตอนระดับความสวยเปลี่ยนจริง */
export function setScene(sc) {
  if (sc === scene || !SCENES.includes(sc)) return;
  const before = gfxLevel() + '|' + quality().scale;
  scene = sc;
  // ความสวยหรือความละเอียดของหน้าใหม่ต่างจากเดิม = ผู้ลงทะเบียน (ตั้งขนาดผ้าใบ) ปรับตาม
  if (gfxLevel() + '|' + quality().scale !== before) notify();
}

/** ใช้กับโค้ดเดิม — ตั้งระดับเดียวทั้งเกม */
export function setGfxLevel(next) {
  if (!LEVEL_IDS.includes(next)) return;
  for (const t of SCENES) cfg.scenes[t].level = next;
  save();
  notify();
}

export function onQuality(fn) {
  listeners.push(fn);
}

/** เพดานความคมผ้าใบที่วาดเองนอกจอหลัก (มินิเกม) ตามระดับความสวยของหน้านั้น */
export function canvasDprCap(sc = scene) {
  const r = RES[sceneCfg(sc).res];
  if (r) return r.dpr;
  const lv = gfxLevel(sc);
  return lv === 'high' ? 1.5 : lv === 'mid' ? 1.25 : 1;
}

/**
 * ตัวคุมจังหวะเฟรม — ปล่อยเฟรมผ่านให้เฉลี่ยตรงเพดาน (เช่น 45 บนจอ 60Hz = ผ่าน 3 ใน 4 เฟรม)
 * ไม่ใช่ "ห่างจากเฟรมก่อนพอไหม" ซึ่งบนจอ 60Hz ให้ได้แค่ 60 หรือ 30 ไม่มีตรงกลาง
 */
export function framePacer() {
  let due = 0;
  return (now, fps) => {
    const step = 1000 / fps;
    if (now < due - 1.5) return false;
    due = Math.max(due + step, now - step);
    return true;
  };
}

// ── จอเครื่องนี้ทำได้กี่เฟรม ── วัดช่วงห่างของ requestAnimationFrame ตอนเปิดเกม (ค่ากลาง)
// ใช้บอกในหน้าตั้งค่าว่าตัวเลือกไหนเกินที่จอทำได้ (ยังเลือกได้ แค่ขึ้นเทาพร้อมบอก) — วัดผิดก็ไม่พังอะไร
let displayHz = 60;
const hzListeners = [];
export function maxDisplayHz() { return displayHz; }
export function onDisplayHz(fn) { hzListeners.push(fn); }
export function measureDisplayHz(frames = 90) {
  if (typeof requestAnimationFrame !== 'function') return;
  const gaps = [];
  let prev = 0;
  const tick = (t) => {
    if (prev) gaps.push(t - prev);
    prev = t;
    if (gaps.length < frames) { requestAnimationFrame(tick); return; }
    gaps.sort((a, b) => a - b);
    const hz = 1000 / gaps[Math.floor(gaps.length / 2)];
    displayHz = hz >= 105 ? 120 : hz >= 80 ? 90 : 60;
    for (const fn of hzListeners) fn(displayHz);
  };
  requestAnimationFrame(tick);
}

/**
 * จำนวนอนุภาคหลังหักตามระดับ — อย่างน้อยหนึ่งชิ้นเสมอถ้าเดิมมีมากกว่าศูนย์
 * (ศูนย์ชิ้น = เอฟเฟกต์หายไปทั้งอัน ซึ่งอ่านเป็นบั๊คมากกว่าอ่านเป็นการประหยัด)
 */
export function partCount(n) {
  const k = quality().parts;
  return k >= 1 ? n : Math.max(1, Math.round(n * k));
}
