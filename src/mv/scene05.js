// src/mv/scene05.js
// ─────────────────────────────────────────────────────────────
// SCENE 05 — LITTLE SCARE (1:02–1:12) · เวลาในไฟล์นี้นับจากต้นฉาก (0 = 1:02)
//
// 5.1 ปัง! (กระทะหล่นในครัว = ขวาของจอ) น้องแข็งค้าง ขนพอง กระดาษบนหัวกระเด็น
// 5.2 ค่อย ๆ จมลงกล่อง เหลือแค่หูกับตาโผล่ขอบกล่อง
// 5.3 เจ้าของรีบเดินมาจากครัว ยื่นมือหงายต่ำ ๆ ข้างกล่องแล้วรอ ไม่รีบคว้า
// 5.4 น้องดมมือ ปีนออกมา เอาหัวถูมือ ขนยุบลง "~"
//
// ตกใจสั้น ๆ แบบลูกแมว ไม่ใช่กลัวจนน่าสงสาร — ขนพองแค่ครู่เดียวแล้วค่อย ๆ ยุบ
// ─────────────────────────────────────────────────────────────
import { seg, track, lerp, EASE } from './anim.js';
import { HOME, drawHomeBack } from './home.js';
import { drawKitten, drawKittenRun, drawSymbol } from './kitten.js';
import { drawLegs, drawHand, drawPetHand } from './owner.js';
import { BOX, drawBoxBack, drawBoxFront, drawPaper } from './box.js';
import { BOX_AT, drawRugPapers } from './scene04.js';

export const FROM = 62;
export const TO = 72;

const FLOOR = HOME.walkY;
/** กระดาษที่ติดหัวน้องมาจากฉาก 4 กระเด็นไปตกตรงนี้ (อยู่ที่เดิมในฉาก 6) */
export const HEAD_PAPER = { x: BOX_AT.x + 64, y: FLOOR + 8, spin: 2.1 };
/** ที่น้องยืนหลังปีนออกจากกล่อง — ฉาก 6 เริ่มจากตรงนี้ */
export const CAT_OUT = BOX_AT.x + 86;
/** ที่เจ้าของยืนตอนยื่นมือ — ฉาก 6 เริ่มจากตรงนี้ */
export const OWNER_AT = BOX_AT.x + 170;

const T = {
  bang: 0.35,
  sink: [1.0, 3.3],
  come: [3.3, 5.3],       // เจ้าของรีบเดินมา
  offer: [5.3, 5.9],      // ยื่นมือหงาย
  peek: [6.0, 6.8],       // โผล่ขึ้นมาดม
  climb: [6.8, 7.4],      // ปีนออก
  rub: [7.5, 10],         // ถูหัวกับมือ
};

const POP_FEET = BOX_AT.y - BOX.h + 22;   // ท่าโผล่หัวตอนจบฉาก 4
const SINK_FEET = POP_FEET + 10;          // จมลงเหลือหูกับตา

const CAM = [
  [0, { x: BOX_AT.x, y: -40, z: 3.0 }],
  [T.come[0], { x: BOX_AT.x + 10, y: -34, z: 3.3 }, 'lin'],
  [T.come[0] + 0.0001, { x: BOX_AT.x + 110, y: -150, z: 1.6 }, 'hold'],   // 5.3 เห็นเจ้าของรีบมา
  [T.offer[1], { x: BOX_AT.x + 90, y: -120, z: 1.8 }, 'io'],
  [T.offer[1] + 0.0001, { x: BOX_AT.x + 50, y: -40, z: 2.8 }, 'hold'],   // 5.4 มือกับตาน้องในเฟรมเดียว
  [TO - FROM, { x: BOX_AT.x + 64, y: -44, z: 3.0 }, 'lin'],
];
export function camera(t) {
  const c = track(t, CAM);
  // กล้องสะดุ้งนิดเดียวตอนเสียงปัง
  const sh = Math.max(0, 1 - seg(t, T.bang, T.bang + 0.45));
  return { x: c.x + Math.sin(t * 90) * 5 * sh, y: c.y + Math.cos(t * 77) * 4 * sh, z: c.z };
}

const ownerX = (t) => lerp(OWNER_AT + 560, OWNER_AT, EASE.out(seg(t, T.come[0], T.come[1])));

export function draw(ctx, t) {
  drawHomeBack(ctx, t + FROM, 0.55);
  if (t > T.come[0]) {
    const ox = ownerX(t);
    drawLegs(ctx, ox, FLOOR - 14, { phase: -ox / 170, stride: t < T.come[1] ? 90 : 0, dir: -1 });
  }
  drawRugPapers(ctx);
  headPaper(ctx, t);

  const inBox = t < T.climb[0] + 0.25;
  drawBoxBack(ctx, BOX_AT.x, BOX_AT.y, { flapT: t * 3 });
  if (inBox) drawCat(ctx, t);
  drawBoxFront(ctx, BOX_AT.x, BOX_AT.y, {});
  if (!inBox) drawCat(ctx, t);
  hand(ctx, t);
  symbols(ctx, t);
}

function drawCat(ctx, t) {
  // ขนพองทันทีที่ได้ยิน แล้วค่อย ๆ ยุบจนหายตอนได้ถูหัวกับมือ
  const puff = seg(t, T.bang, T.bang + 0.12) * (1 - EASE.io(seg(t, T.peek[0], T.rub[0] + 0.6)) * 0.75) * (1 - seg(t, T.rub[0] + 0.6, T.rub[0] + 1.4));
  if (t < T.climb[0]) {
    // โผล่หัว → แข็งค้าง → จมลง → ค่อย ๆ โผล่ขึ้นมาดมมือ
    const sink = EASE.io(seg(t, T.sink[0], T.sink[1])) * (1 - EASE.io(seg(t, T.peek[0], T.peek[1])) * 0.8);
    const feet = lerp(POP_FEET, SINK_FEET, sink);
    const sniff = t > T.peek[0] + 0.3 ? Math.sin(t * 36) * 0.02 : 0;
    drawKitten(ctx, BOX_AT.x + 6, feet, 1, {
      sit: 1, puff, ear: t > T.bang ? 0.8 : 0, mood: t < T.bang ? 'starry' : '',
      gaze: t > T.peek[0] ? 1 : Math.sin(t * 3) * 0.3, lean: t > T.peek[0] + 0.3 ? 0.08 + sniff : 0,
      tilt: t > T.bang && t < T.sink[1] ? Math.sin(t * 40) * 0.015 : 0,   // สั่นเบา ๆ
    }, t);
    return;
  }
  if (t < T.climb[1]) {
    // ปีนออกจากกล่องไปหามือ
    const k = seg(t, T.climb[0], T.climb[1]);
    const x = lerp(BOX_AT.x + 6, CAT_OUT, EASE.io(k));
    const y = lerp(POP_FEET, FLOOR, k) - Math.sin(Math.PI * k) * 40;
    drawKittenRun(ctx, x, y, 1, { phase: 0, dir: 1, vy: lerp(-10, 12, k), squash: k > 0.9 ? 0.2 : 0 });
    return;
  }
  // ถูหัวกับมือ หลับตา ตัวเอนตาม
  const rub = Math.sin((t - T.rub[0]) * 5);
  drawKitten(ctx, CAT_OUT, FLOOR, 1, {
    sit: EASE.out(seg(t, T.climb[1], T.climb[1] + 0.3)), puff, lean: 0.1 + rub * 0.05, tilt: 0.12 + rub * 0.06,
    shut: t > T.rub[0] ? 1 : 0, mood: t > T.rub[0] ? 'happy' : '', ear: t > T.rub[0] ? 0.7 : 0.2,
  }, t);
}

/** มือเจ้าของ: หงายต่ำ ๆ ข้างกล่องรอ → พอน้องมาถู เปลี่ยนเป็นลูบหัวเบา ๆ */
function hand(ctx, t) {
  if (t < T.offer[0]) return;
  const HAND_Y = FLOOR - 26;
  if (t < T.rub[0]) {
    const k = EASE.out(seg(t, T.offer[0], T.offer[1]));
    drawHand(ctx, lerp(OWNER_AT + 40, CAT_OUT + 34, k), lerp(-200, HAND_Y, k), -0.85, 0.5, { curl: 0.2, open: 1 });
    return;
  }
  // ลูบหัว — มือเดียวกับฉาก 1 (มือคว่ำกอบหัว) มาจากขวาบน
  const slide = Math.sin((t - T.rub[0]) * 5) * 5;
  drawPetHand(ctx, CAT_OUT + 4 + slide, FLOOR - 23 - 10 - 13 + 2, { hand: -0.05, arm: -0.85, cup: 0.9, scale: 20 });
}

/** กระดาษบนหัวน้องกระเด็นตอนเสียงปัง แล้วตกข้างกล่อง */
function headPaper(ctx, t) {
  const k = seg(t, T.bang, T.bang + 0.6);
  const x0 = BOX_AT.x + 2, y0 = POP_FEET - 54;
  if (k <= 0) { drawPaper(ctx, x0, y0, 11, { spin: 0.3, seed: 9 }); return; }
  const x = lerp(x0, HEAD_PAPER.x, k);
  const y = lerp(y0, HEAD_PAPER.y, k) - Math.sin(Math.PI * k) * 50;
  drawPaper(ctx, x, y, 11, { spin: 0.3 + k * HEAD_PAPER.spin, seed: 9 });
}

function symbols(ctx, t) {
  const purr = seg(t, T.rub[0] + 0.4, T.rub[0] + 0.7);
  drawSymbol(ctx, '~', CAT_OUT - 30, FLOOR - 62 - Math.sin(t * 3) * 2, 20, purr, -0.15);
  const ex = seg(t, T.bang, T.bang + 0.1) * (1 - seg(t, 1.3, 1.7));
  drawSymbol(ctx, '!', BOX_AT.x - 26, POP_FEET - 64, 24, ex, -0.15);
}

/** เสียงปังจากครัว: แฉกระเบิดที่ขอบขวาจอ (ทิศเดียวกับครัว) */
export function drawOverlay(ctx, t, W, H) {
  const k = seg(t, T.bang, T.bang + 0.08) * (1 - seg(t, T.bang + 0.5, T.bang + 0.9));
  if (k <= 0) return;
  const s = 1 + EASE.back(seg(t, T.bang, T.bang + 0.3)) * 0.15;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.translate(W - 70, H * 0.3);
  ctx.scale(s, s);
  ctx.fillStyle = '#FFE066'; ctx.strokeStyle = '#6B4A3A'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const r = i % 2 ? 26 : 58;
    const a = (i / 16) * Math.PI * 2 + 0.2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = k;
  drawSymbol(ctx, '!', W - 70, H * 0.3, 44, 1, 0.1);
  ctx.restore();
}
