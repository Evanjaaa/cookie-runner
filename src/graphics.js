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

/** ค่าที่ใช้ของหน้าหนึ่ง (same = ทุกหน้าใช้ค่าของหน้าแรก) */
export function sceneCfg(sc = scene) {
  return cfg.scenes[cfg.same ? 'home' : sc] || cfg.scenes.home;
}

/** ค่าของหน้าที่กำลังเล่น (หรือหน้าที่ระบุ) — { scale, fps, bloom, parts } */
export function quality(sc = scene) {
  const c = sceneCfg(sc);
  const q = { ...ACTIVE[c.level], fps: c.fps };
  if (RES[c.res]) q.scale = RES[c.res].scale;
  return q;
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
