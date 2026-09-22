// src/scene-preload.js
// ─────────────────────────────────────────────────────────────
// เตรียมฉากใหม่ล่วงหน้า ระหว่างที่ผู้เล่นวิ่งอยู่ใน "ทางเข้า" (ดู gates.js)
//
// ── เกมนี้ "โหลด" อะไรบ้างตอนเปลี่ยนฉาก (วิเคราะห์จากโค้ดจริง) ──
// ไม่มีไฟล์รูปเลยสักไฟล์ในฉากวิ่ง ทุกอย่างวาดด้วย Canvas 2D สด ๆ:
//   - ลำดับท่อน     composeRoute สุ่มจากคลัง — ถูกมาก และต้องทำตั้งแต่ตอนตัดสินใจเปลี่ยนฉาก
//                   เพราะ Level ปูท่อนล่วงหน้าเกือบสองจอ (ดู Level.ensureAhead)
//   - ภาพสิ่งกีดขวาง THEME_ART ต่อธีม — เส้นทางโค้ดที่ยังไม่เคยวิ่ง เบราว์เซอร์ต้องคอมไพล์ครั้งแรก
//   - ของประกอบฉาก  PROP_ART ของฉากใหม่ (ไกล / ใกล้)
//   - ของที่ขยับได้  ผึ้ง ลูกบอล ของร่วง ถ้าฉากประกาศไว้
//   - เพลง          สังเคราะห์สด ไม่มีไฟล์ให้โหลด (ยกเว้นเพลงหน้าแรก)
// จึงไม่มีอะไรหนักระดับหลายเฟรม ของที่ทำให้เฟรมแรกของฉากใหม่สะดุดได้จริง
// คือ "วาดครั้งแรก" ของเส้นทางโค้ดชุดใหม่ ขั้นตอนข้างล่างจึงวาดของแต่ละกลุ่ม
// ลงผ้าใบจิ๋วที่มองไม่เห็นทีละกลุ่ม ทีละเฟรม ไม่รวบทำในเฟรมเดียว
//
// จำนวนขั้นตอนตรงนี้ถูกใช้คำนวณความยาวทางเข้า (gates.js) — เพิ่มขั้นตอนแล้วทางเข้ายาวขึ้นเอง
// ─────────────────────────────────────────────────────────────
import { GROUND_Y, LEVEL, HAZARD, FALLER } from './config.js';
import { PATTERNS } from './level.js';
import { drawObstacles, drawHazards, drawFallers } from './render/entities.js';
import { drawProps } from './render/background.js';

const { spike, bar, crate } = LEVEL;

let scratch = null;
/** ผ้าใบทิ้งขว้างขนาดจิ๋ว ย่อทุกอย่างลง 10 เท่า — วาดจริงครบทุกคำสั่ง แต่แทบไม่มีพิกเซลให้ลง */
function pad() {
  if (!scratch) {
    const cv = document.createElement('canvas');
    cv.width = 96;
    cv.height = 42;
    scratch = cv.getContext('2d');
  }
  scratch.setTransform(0.1, 0, 0, 0.1, 0, 0);
  scratch.clearRect(0, 0, 960, 420);
  return scratch;
}

/**
 * ชนิดอันตรายที่ขยับได้ทั้งหมดที่ฉากนี้ทำให้เกิดได้
 *
 * มีสองทางที่ของพวกนี้เกิดได้ ต้องอุ่นเครื่องทั้งคู่:
 *   ของประจำฉาก  stage.hazard — ตัวจับเวลาปล่อยเองเรื่อย ๆ
 *   ของที่ท่อนวาง  hazards ในแพตเทิร์น — คนออกแบบเลือกจุดเอง (สวนกลางวันใช้ทางนี้ล้วน)
 * ถ้าอุ่นแต่ทางแรก ฉากที่วางเองล้วนจะไปคอมไพล์เส้นทางวาดเอาตอนผึ้งตัวแรกโผล่ = สะดุดหนึ่งเฟรม
 */
function hazardKinds(stage) {
  const kinds = new Set();
  if (stage.hazard) kinds.add(stage.hazard.kind);
  for (const step of stage.route || []) {
    if (step.p === undefined) continue;
    for (const h of (PATTERNS[step.p](0).hazards || [])) kinds.add(h.kind);
  }
  for (const p of stage.pool || []) {
    for (const h of (PATTERNS[p](0).hazards || [])) kinds.add(h.kind);
  }
  return kinds;
}

export const PRELOAD_STEPS = [
  {
    id: 'obstacleArt',
    label: 'ภาพสิ่งกีดขวางของธีมใหม่',
    run(stage) {
      const theme = stage.theme;
      const obs = [
        { x: 40, y: GROUND_Y - spike.h, w: spike.w, h: spike.h, kind: 'spike', theme },
        { x: 120, y: GROUND_Y - crate.h * 3, w: crate.w, h: crate.h * 3, rows: 3, kind: 'crate', theme },
        { x: 220, y: bar.top, w: bar.w, h: bar.h, kind: 'bar', theme },
      ];
      drawObstacles(pad(), obs, 0, theme);
    },
  },
  {
    id: 'propsFar',
    label: 'ของประกอบฉากชั้นไกล',
    run(stage) { drawProps(pad(), 0, stage.layers, 'far', stage.palette, 0); },
  },
  {
    id: 'propsNear',
    label: 'ของประกอบฉากชั้นใกล้',
    run(stage) { drawProps(pad(), 0, stage.layers, 'near', stage.palette, 0); },
  },
  {
    id: 'moverArt',
    label: 'ของที่ขยับได้ประจำฉาก',
    run(stage) {
      const c = pad();
      for (const k of hazardKinds(stage)) {
        const h = k === 'bee'
          ? { kind: k, x: 60, y: HAZARD.bee.midY, w: HAZARD.bee.w, h: HAZARD.bee.h, t: 0 }
          : { kind: k, x: 60, y: GROUND_Y - HAZARD.ball.r * 2, w: HAZARD.ball.r * 2, h: HAZARD.ball.r * 2, spin: 0 };
        drawHazards(c, [h], 0, 0, stage.palette);
      }
      if (stage.faller) {
        drawFallers(c, [{ x: 80, y: 100, w: FALLER.w, h: FALLER.h, warn: 0 }], 0, stage.theme);
      }
    },
  },
];

/**
 * ตัวเดินขั้นตอนเตรียมฉาก — ทีละขั้นต่อหนึ่งเฟรม
 * จับเวลาทุกขั้นไว้ด้วย ใช้ดูตอนทดสอบว่าขั้นไหนหนักจริง
 */
export class ScenePreloader {
  constructor(stage) {
    this.stage = stage;
    this.i = 0;
    this.ms = [];
  }

  get done() { return this.i >= PRELOAD_STEPS.length; }

  step() {
    if (this.done) return;
    const s = PRELOAD_STEPS[this.i++];
    const t0 = performance.now();
    try { s.run(this.stage); } catch { /* วาดล่วงหน้าพลาดไม่ควรทำให้เกมพัง ของจริงจะวาดเองตอนถึง */ }
    this.ms.push({ id: s.id, ms: performance.now() - t0 });
  }

  /** ทำที่เหลือให้จบทันที — ใช้เฉพาะตอนผู้เล่นพุ่งผ่านช่วงปิดจอเร็วกว่าที่คำนวณไว้ */
  finish() {
    while (!this.done) this.step();
  }
}
