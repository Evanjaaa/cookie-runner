// src/mv/scene06.js
// ─────────────────────────────────────────────────────────────
// SCENE 06 — TOGETHER (1:12–1:32) · เวลาในไฟล์นี้นับจากต้นฉาก (0 = 1:12)
//
// 6.1 เจ้าของเดินไปนั่งโซฟา (หยิบหนังสือขึ้นอ่าน) น้องนั่งมองตามจากข้างกล่อง
// 6.2 น้องเดินไปหน้าโซฟา ย่อตัวส่ายก้น แล้วกระโดดขึ้นเบาะ
// 6.3 เดินวนรอบตัวเจ้าของหนึ่งรอบบนเบาะ แล้วนั่งลงข้าง ๆ
// 6.4 (เพลงเบรกเงียบ 1:20.5) มือลูบหัว น้องหลับตาครางเบา ๆ "~"
// 6.5 ขดตัวนอนข้างเจ้าของ กล้องถอยออกช้า ๆ จนเห็นทั้งห้อง:
//     เบาะใต้หน้าต่างว่างแล้ว แดดสูงขึ้นกว่าตอนเช้า กล่องกับกระดาษยังอยู่บนพรม
// 6.6 ค้างภาพ: หางขยับเบา ๆ มือลูบช้า ๆ น้องหลับอย่างมีความสุข
// ─────────────────────────────────────────────────────────────
import { seg, track, lerp, EASE } from './anim.js';
import { HOME, drawHomeBack } from './home.js';
import { drawKitten, drawKittenRun, drawSymbol } from './kitten.js';
import { drawLegs, drawPetHand, drawOwnerSeated } from './owner.js';
import { drawBoxBack, drawBoxFront, drawPaper } from './box.js';
import { BOX_AT, drawRugPapers } from './scene04.js';
import { HEAD_PAPER, CAT_OUT, OWNER_AT } from './scene05.js';

export const FROM = 72;
// ค้างภาพต่อจาก 1:30 อีก 2 วินาทีตามบรีฟ (ข้อ 6) ก่อนส่งต่อเรื่องช่วงต่อไป
export const TO = 92;

const FLOOR = HOME.walkY;
const SEAT = HOME.sofa.seat;
const OWNER_SEAT_X = 880;          // เจ้าของนั่งเยื้องซ้ายของโซฟา เหลือที่ให้น้องทางขวา
const CAT_SEAT_X = 1000;           // ที่น้องนั่ง/นอนข้างเจ้าของ
/** แดดตอนนี้สูงขึ้นกว่าตอนเช้า — ลำแสงชันขึ้น สั้นลง (ฉาก 1 ใช้ 0.62) */
const SUN = 0.4;

const T = {
  lift: [0, 0.6],          // มือยกออกจากหัว
  walk: [0.6, 3.0],        // เจ้าของเดินไปโซฟา
  cutSeat: 3.0,            // ตัดภาพ: เจ้าของนั่งแล้ว
  trot: [3.3, 4.6],        // น้องเดินไปหน้าโซฟา
  wiggle: [4.6, 5.2],
  jump: [5.2, 5.7],
  circle: [5.9, 7.9],      // เดินวนบนเบาะ
  sit: [7.9, 8.4],
  pet: [8.5, 11],          // เพลงเบรก — ลูบหัว
  curl: [11, 12],          // ขดตัวลงนอน
  pull: [11, 16.5],        // กล้องถอยออก
};

// ── กล้อง ──
const WIDE = { x: 700, y: -250, z: 0.72 };
const CAM = [
  [0, { x: CAT_OUT + 20, y: -44, z: 3.0 }],
  [T.lift[1], { x: CAT_OUT - 40, y: -120, z: 1.8 }, 'io'],           // 6.1 เห็นเจ้าของเดินไปโซฟา
  [T.cutSeat, { x: CAT_OUT - 120, y: -150, z: 1.55 }, 'lin'],
  [T.cutSeat + 0.0001, { x: 1080, y: -130, z: 1.6 }, 'hold'],       // มุมน้องมองโซฟา
  [T.jump[1], { x: 1030, y: -150, z: 1.8 }, 'io'],
  [T.sit[1], { x: 990, y: -170, z: 2.2 }, 'io'],
  [T.sit[1] + 0.0001, { x: 985, y: -190, z: 3.4 }, 'hold'],         // 6.4 Close-up มือกับหัว
  [T.pull[0], { x: 985, y: -188, z: 3.5 }, 'lin'],
  [T.pull[1], WIDE, 'io'],                                           // 6.5 Pull-out ช้า ๆ
  [TO - FROM, { x: WIDE.x, y: WIDE.y, z: WIDE.z * 0.98 }, 'lin'],
];
export const camera = (t) => track(t, CAM);

const ownerWalkX = (t) => lerp(OWNER_AT, OWNER_SEAT_X + 20, seg(t, T.walk[0], T.walk[1]));

/** ทางเดินของน้องบนเบาะ: ขวา → หันกลับ → เดินผ่านหน้าเจ้าของไปซ้าย → หันกลับ → กลับที่เดิม */
const LAP = [
  [T.circle[0], CAT_SEAT_X + 10],
  [T.circle[0] + 0.45, CAT_SEAT_X + 60, 'io'],
  [T.circle[0] + 0.7, CAT_SEAT_X + 60, 'hold'],
  [T.circle[0] + 1.45, OWNER_SEAT_X + 70, 'io'],
  [T.circle[0] + 1.65, OWNER_SEAT_X + 70, 'hold'],
  [T.circle[1], CAT_SEAT_X, 'io'],
];

export function draw(ctx, t) {
  drawHomeBack(ctx, t + FROM, SUN);
  drawRugPapers(ctx);
  drawPaper(ctx, HEAD_PAPER.x, HEAD_PAPER.y, 11, { spin: 0.3 + HEAD_PAPER.spin, seed: 9 });
  drawBoxBack(ctx, BOX_AT.x, BOX_AT.y, {});
  drawBoxFront(ctx, BOX_AT.x, BOX_AT.y, {});

  // ── เจ้าของ ──
  let shoulder = null;
  if (t < T.cutSeat) {
    const ox = ownerWalkX(t);
    drawLegs(ctx, ox, FLOOR - 14, { phase: -ox / 190, stride: t > T.walk[0] ? 70 : 0, dir: -1 });
  } else {
    shoulder = drawOwnerSeated(ctx, OWNER_SEAT_X, SEAT, FLOOR - 10, { page: seg(t, 14.2, 14.9) * (1 - seg(t, 14.9, 15.0)) });
  }

  drawCat(ctx, t);
  hands(ctx, t, shoulder);
  symbols(ctx, t);
}

function drawCat(ctx, t) {
  // 6.1 นั่งข้างกล่องมองตามเจ้าของ (หัวหันซ้าย)
  if (t < T.trot[0]) {
    const lookK = EASE.io(seg(t, T.walk[0], T.walk[0] + 0.8));
    drawKitten(ctx, CAT_OUT, FLOOR, 1, {
      sit: 1, gaze: -lookK, tilt: -0.08 * lookK,
      shut: t < T.lift[1] ? 1 : 0, mood: t < T.lift[1] ? 'happy' : '', ear: t < T.lift[1] ? 0.5 : 0,
    }, t);
    return;
  }
  // 6.2 เดินไปหน้าโซฟา
  if (t < T.wiggle[0]) {
    const x = lerp(CAT_OUT, CAT_SEAT_X + 30, EASE.io(seg(t, T.trot[0], T.trot[1])));
    drawKittenRun(ctx, x, FLOOR, 1, { phase: (CAT_OUT - x) * 1.3, dir: -1, tail: 0.5 });
    return;
  }
  if (t < T.jump[0]) {
    drawKitten(ctx, CAT_SEAT_X + 30, FLOOR, 1, { crouch: 1, sway: 1, ear: 0.85, mood: 'starry' }, t);
    return;
  }
  if (t < T.jump[1]) {
    const k = seg(t, T.jump[0], T.jump[1]);
    const x = lerp(CAT_SEAT_X + 30, CAT_SEAT_X + 10, k);
    const y = lerp(FLOOR, SEAT, EASE.out(k)) - Math.sin(Math.PI * k) * 60;
    drawKittenRun(ctx, x, y, 1, { phase: 0, dir: -1, vy: lerp(-16, 10, k), mood: 'starry', squash: k > 0.9 ? 0.25 : 0 });
    return;
  }
  // 6.3 เดินวนบนเบาะ
  if (t < T.sit[0]) {
    if (t < T.circle[0]) {
      drawKitten(ctx, CAT_SEAT_X + 10, SEAT, 1, { sy: -0.15 * (1 - seg(t, T.jump[1], T.circle[0])), mood: 'starry' }, t);
      return;
    }
    const x = track(t, LAP);
    const prev = track(t - 0.05, LAP);
    const dir = x < prev - 0.01 ? -1 : 1;
    const moving = Math.abs(x - prev) > 0.3;
    if (moving) drawKittenRun(ctx, x, SEAT, 1, { phase: x * 1.3, dir, tail: 0.4 });
    else drawKitten(ctx, x, SEAT, 1, { gaze: x < CAT_SEAT_X ? 1 : -1, tilt: 0.05 }, t);
    return;
  }
  // นั่งลงข้าง ๆ
  if (t < T.curl[0]) {
    const petting = t > T.pet[0] + 0.2;
    const rub = petting ? Math.sin((t - T.pet[0]) * 4) : 0;
    drawKitten(ctx, CAT_SEAT_X, SEAT, 1, {
      sit: EASE.out(seg(t, T.sit[0], T.sit[1])), gaze: -0.5,
      shut: petting ? 1 : 0, mood: petting ? 'happy' : '', ear: petting ? 0.9 : 0, tilt: -0.08 + rub * 0.04,
    }, t);
    return;
  }
  // 6.5–6.6 ขดตัวนอนข้างเจ้าของ หลับตา หายใจช้า ๆ (ท่าหมอบของเกมหายใจให้เอง)
  const k = EASE.io(seg(t, T.curl[0], T.curl[1]));
  drawKitten(ctx, CAT_SEAT_X, SEAT, 1, {
    sit: 1 - k, loaf: k, shut: 1, mood: 'happy', ear: 0.6 - k * 0.3, tilt: -0.06,
  }, t);
}

/** มือลูบหัว — ออกจากไหล่ของเจ้าของที่นั่งอยู่ ข้ามมาหาหัวน้องทางขวา */
function hands(ctx, t, shoulder) {
  // ต่อจากฉาก 5: มือยังลูบหัวอยู่ แล้วยกออก
  if (t < T.lift[1]) {
    const up = EASE.in(seg(t, T.lift[0], T.lift[1]));
    drawPetHand(ctx, CAT_OUT + 4, FLOOR - 44 - up * 80, { hand: -0.05 - up * 0.2, arm: -0.85, cup: 0.9 - up * 0.6, scale: 20 });
    return;
  }
  if (!shoulder || t < T.pet[0]) return;
  // มือมาจากไหล่ (ซ้ายบน) — พลิกซ้ายขวาเพื่อให้นิ้วชี้ไปทางขวา (ออกจากตัวเจ้าของ) เหมือนลูบจากข้าง ๆ
  const inK = EASE.out(seg(t, T.pet[0], T.pet[0] + 0.5));
  const lying = EASE.io(seg(t, T.curl[0], T.curl[1]));
  const headTop = SEAT - 23 - 10 - 13 + lying * 11;
  const slide = Math.sin((t - T.pet[0]) * (t > T.curl[1] ? 1.6 : 3.2)) * 6;   // ลูบช้าลงหลังน้องหลับ
  const hx = lerp(shoulder.x + 20, CAT_SEAT_X - 2 + slide, inK);
  const hy = lerp(shoulder.y + 40, headTop, inK);
  const dx = shoulder.x - hx, dy = shoulder.y - hy;
  ctx.save();
  ctx.translate(hx, hy); ctx.scale(-1, 1);
  drawPetHand(ctx, 0, 0, { hand: 0.05, arm: Math.atan2(dy, -dx), cup: 0.9, scale: 20, len: Math.hypot(dx, dy) / 20 + 0.5 });
  ctx.restore();
}

function symbols(ctx, t) {
  const purr = seg(t, T.pet[0] + 0.5, T.pet[0] + 0.8);
  drawSymbol(ctx, '~', CAT_SEAT_X + 34, SEAT - 60 - Math.sin(t * 2.5) * 2, 20, purr * (1 - seg(t, T.curl[1], T.curl[1] + 0.5)), 0.15);
  // z ลอยช้า ๆ ตอนหลับข้างเจ้าของ
  for (let i = 0; i < 6; i++) {
    const t0 = T.curl[1] + 0.4 + i * 1.3;
    const k = seg(t, t0, t0 + 2.2);
    if (k <= 0 || k >= 1) continue;
    drawSymbol(ctx, 'z', CAT_SEAT_X + 16 + k * 20, SEAT - 40 - k * 36, 12 + k * 6, Math.sin(k * Math.PI), -0.2);
  }
}

/** ค้างภาพท้ายเรื่อง: ค่อย ๆ มืดลงนุ่ม ๆ ในวินาทีสุดท้าย (ส่งต่อเรื่องช่วงต่อไปของเพลง) */
export function drawOverlay(ctx, t, W, H) {
  const k = EASE.in(seg(t, TO - FROM - 1.2, TO - FROM));
  if (k <= 0) return;
  ctx.fillStyle = `rgba(40,22,30,${k * 0.85})`;
  ctx.fillRect(0, 0, W, H);
}
