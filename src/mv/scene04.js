// src/mv/scene04.js
// ─────────────────────────────────────────────────────────────
// SCENE 04 — THE SECRET TREASURE (0:42.5–1:02) · เวลาในไฟล์นี้นับจากต้นฉาก (0 = 0:42.5)
//
// 4.1 เจ้าของถือกล่องพัสดุเดินกลับห้องนั่งเล่น น้องเดินตามเงยมองกล่อง → วางกล่องบนพรมหน้าโซฟา
//     หยิบของ (ตุ๊กตาปลา) ออก แล้วเดินกลับไปครัว — กล่องเปล่ามีกระดาษยับทิ้งไว้
// 4.2 น้องจ้องกล่อง เอียงหัว "?" เดินเข้าไปช้า ๆ ดม เอาเท้าแตะ กล่องโยก
// 4.3 ยืนเกาะขอบกล่องชะโงกดู → ย่อตัวส่ายก้น → กระโดดลงไปทั้งตัว กระดาษกระเด็น
// 4.4 มุมมองจากในกล่อง: ตบกระดาษ → ส่ายก้นแล้วกระโจน → กลิ้งหงายกอดกระดาษ งับเบา ๆ
// 4.5 กล่องโยกไปมา กระดาษเด้งออกนอกกล่อง หางชูโผล่ขอบกล่อง → โผล่หัวออกมามีกระดาษติดหัว ตาเป็นดาว
//
// กล่องกับกระดาษที่กระเด็นออกมาอยู่ที่เดิมจนจบเรื่อง (ฉาก 5, 6 อ่านตำแหน่งจากไฟล์นี้)
// ─────────────────────────────────────────────────────────────
import { seg, track, lerp, EASE } from './anim.js';
import { HOME, drawHomeBack } from './home.js';
import { drawKitten, drawKittenRun, drawSymbol, HERO } from './kitten.js';
import { drawLegs, drawHand } from './owner.js';
import { BOX, drawBoxBack, drawBoxFront, drawPaper, drawBoxInside } from './box.js';
import { WALK } from './walk.js';
import { drawBigFish } from '../render/entities.js';

export const FROM = 42.5;
export const TO = 62;

const FLOOR = HOME.walkY;
/** กล่องบนพรมหน้าโซฟา — ที่เดิมจนจบเรื่อง */
export const BOX_AT = { x: 1210, y: FLOOR + 14 };
/** กระดาษยับที่กระเด็นออกมานอกกล่องในช็อต 4.5 — [เวลาในฉาก, จุดตก x, หมุน] */
export const PAPER_OUT = [[0.2, BOX_AT.x - 118, 0.4], [0.9, BOX_AT.x + 104, -0.6], [1.6, BOX_AT.x - 150, 1.1]];

const T = {
  flash: [0, 0.7],          // ขาวจากประตูค่อย ๆ จางลง
  carry: [0, 2.8],          // เดินถือกล่องกลับห้องนั่งเล่น
  lower: [3.0, 3.6],        // วางกล่องลงพรม
  unpack: [3.9, 4.7],       // หยิบตุ๊กตาปลาออก
  leave: [4.9, 7.6],        // เดินกลับครัว
  stare: 5.1,               // น้องจ้องกล่อง "?"
  approach: [5.7, 6.8],
  sniff: [6.8, 7.4],
  pat: [7.4, 8.0],
  peek: [8.0, 9.2],         // ยืนเกาะขอบกล่องชะโงก
  wiggle: [9.2, 9.7],
  jump: [9.7, 10.2],
  inside: [10.5, 14.5],     // มุมมองในกล่อง
  out: 14.5,                // กลับมานอกกล่อง
  tail: [14.5, 16.8],
  pop: 16.8,                // โผล่หัว
};

// ── เจ้าของ ──
const OWNER = [
  [0, WALK.stopX],
  [T.carry[1], BOX_AT.x + 90, 'lin'],
  [T.leave[0], BOX_AT.x + 90, 'hold'],
  [T.leave[1], BOX_AT.x + 90 + 480, 'lin'],
];
const ownerX = (t) => track(t, OWNER);

// ── น้อง ── เดินข้างขาเจ้าของ (ข้างหลัง = ทางขวา) → หยุดนั่ง → เข้าหากล่อง
const CAT_SIT = BOX_AT.x + 170;
const CAT_NEAR = BOX_AT.x + BOX.w / 2 + 22;
function catX(t) {
  if (t < T.carry[1]) return ownerX(t) + 88;
  if (t < T.approach[0]) return CAT_SIT + 8 - Math.min(8, (t - T.carry[1]) * 20);
  return lerp(CAT_SIT, CAT_NEAR, EASE.io(seg(t, T.approach[0], T.approach[1])));
}

// ── กล้อง ──
const CAM = [
  [T.carry[1], { x: BOX_AT.x + 110, y: -130, z: 1.5 }],
  [T.leave[0], { x: BOX_AT.x + 100, y: -110, z: 1.6 }, 'lin'],
  [T.leave[0] + 0.0001, { x: BOX_AT.x + 70, y: -40, z: 2.3 }, 'hold'],   // 4.2 กล่องกับน้อง
  [T.peek[0], { x: BOX_AT.x + 50, y: -44, z: 2.5 }, 'lin'],
  [T.peek[0] + 0.0001, { x: BOX_AT.x + 30, y: -46, z: 2.9 }, 'hold'],    // 4.3 ใกล้ขึ้น
  [T.inside[0], { x: BOX_AT.x + 20, y: -40, z: 3.0 }, 'lin'],
  [T.out, { x: BOX_AT.x, y: -50, z: 2.6 }, 'hold'],                      // 4.5 นอกกล่อง
  [T.pop, { x: BOX_AT.x, y: -54, z: 2.8 }, 'lin'],
  [TO - FROM, { x: BOX_AT.x, y: -60, z: 3.2 }, 'io'],
];
export function camera(t) {
  if (t < T.carry[1]) return { x: ownerX(t) + 40, y: -140, z: 1.35 };
  return track(t, CAM);
}

/** กล่อง: ถืออยู่ในมือ (ลอยระดับสะโพก) → วางลงพรม */
function boxPos(t) {
  if (t < T.lower[0]) return { x: ownerX(t) - 70, y: FLOOR + 14 - 230 };
  const k = EASE.io(seg(t, T.lower[0], T.lower[1]));
  return { x: lerp(ownerX(t) - 70, BOX_AT.x, k), y: lerp(FLOOR + 14 - 230, BOX_AT.y, k) };
}

/** กล่องโยกจากการโดนแตะ การกระโดดลง และตอนน้องเล่นอยู่ข้างใน */
function boxRock(t) {
  let r = 0;
  for (const t0 of [T.pat[0] + 0.15, T.pat[0] + 0.45]) if (t > t0 && t < t0 + 0.4) r += Math.sin((t - t0) * 30) * 0.05 * (1 - (t - t0) / 0.4);
  if (t > T.jump[1] && t < T.jump[1] + 0.6) r += Math.sin((t - T.jump[1]) * 24) * 0.09 * (1 - (t - T.jump[1]) / 0.6);
  if (t > T.out && t < T.pop) r += Math.sin(t * 9) * 0.06 + Math.sin(t * 23) * 0.02;
  return r;
}

export function draw(ctx, t) {
  drawHomeBack(ctx, t + FROM, 0.58);
  const rock = boxRock(t);
  const bp = boxPos(t);

  // ── เจ้าของ ──
  const ox = ownerX(t);
  const walking = t < T.carry[1] || (t > T.leave[0] && t < T.leave[1]);
  if (t < T.leave[1] + 0.5) {
    drawLegs(ctx, ox, FLOOR - 14, { phase: (WALK.stopX - ox) / 190, stride: walking ? 70 : 0, dir: t < T.leave[0] ? -1 : 1 });
  }

  // กระดาษที่กระเด็นออกมาแล้ว (อยู่บนพรม ข้างหลังตัวน้อง)
  paperOut(ctx, t);

  // ── กล่องชั้นหลัง → น้อง → กล่องชั้นหน้า ──
  // ก่อนกระโดดลง น้องอยู่นอกกล่อง (หน้ากล่อง) · ลงไปแล้วอยู่ระหว่างชั้นหลังกับชั้นหน้า
  const outside = t < T.jump[0];
  drawBoxBack(ctx, bp.x, bp.y, { rock, flapT: t * 3 });
  if (t > T.jump[1]) insideBits(ctx, t, bp);
  if (!outside) drawCat(ctx, t, bp, rock);
  drawBoxFront(ctx, bp.x, bp.y, { rock, glint: seg(t, T.pop + 0.6, T.pop + 1.2), t });
  if (outside) drawCat(ctx, t, bp, rock);

  // มือเจ้าของถือกล่อง / หยิบของออก (อยู่หน้ากล่อง)
  hands(ctx, t, bp);

  symbols(ctx, t, bp);
}

function drawCat(ctx, t, bp, rock) {
  const x = catX(t);
  // 4.1 เดินข้างเจ้าของ เงยมองกล่องในมือ
  if (t < T.carry[1]) {
    drawKittenRun(ctx, x, FLOOR, 1, { phase: (WALK.stopX - x) * 1.4, dir: -1, tail: 0.5, mood: 'starry' });
    return;
  }
  // นั่งมองกล่องที่ถูกวางลง
  if (t < T.approach[0]) {
    const ask = EASE.back(seg(t, T.stare, T.stare + 0.3));
    drawKitten(ctx, x, FLOOR, 1, { sit: EASE.out(seg(t, T.carry[1], T.carry[1] + 0.4)), gaze: -1, tilt: t > T.stare ? 0.2 * ask : -0.12, ear: t > T.stare ? -0.3 : 0 }, t);
    return;
  }
  // เดินเข้าหากล่องช้า ๆ (ก้าวย่อง)
  if (t < T.sniff[0]) {
    drawKittenRun(ctx, x, FLOOR, 1, { phase: (CAT_SIT - x) * 1.1, dir: -1, tail: 0.2, mood: '' });
    return;
  }
  // ท่าที่เหลือหันไปทางกล่อง (ซ้าย) — พลิกซ้ายขวาทั้งตัว มือที่เอื้อมจึงเป็นมือที่อยู่ฝั่งกล่อง
  ctx.save();
  ctx.translate(x, 0); ctx.scale(-1, 1);
  if (t < T.pat[0]) {
    // ดม: ยืดคอยื่นเข้าหากล่อง จมูกกระดุก
    const nose = Math.sin(t * 38) * 0.02;
    drawKitten(ctx, 0, FLOOR, 1, { lean: 0.18 + nose, dx: 6, gaze: 1, ear: -0.4, tilt: 0.05 }, t);
  } else if (t < T.peek[0]) {
    // แตะกล่องสองที
    const tap = Math.max(Math.sin(seg(t, T.pat[0], T.pat[0] + 0.3) * Math.PI), Math.sin(seg(t, T.pat[0] + 0.3, T.pat[0] + 0.6) * Math.PI));
    drawKitten(ctx, 0, FLOOR, 1, { reach: 0.2 + tap * 0.8, lean: 0.1, gaze: 1, mood: 'smug' }, t);
  } else if (t < T.wiggle[0]) {
    // ยืนสองขาเกาะขอบกล่อง ชะโงกมองลงไป หางกระดิกถี่
    const k = EASE.out(seg(t, T.peek[0], T.peek[0] + 0.35));
    drawKitten(ctx, 8 * k, FLOOR, 1, { reach: k, sy: 0.2 * k, lean: 0.3 * k, gaze: 1, ear: -0.5, mood: 'starry', wag: Math.sin(t * 16) * 0.8 }, t);
  } else if (t < T.jump[0]) {
    // ย่อตัวส่ายก้น เตรียมกระโจน
    drawKitten(ctx, 0, FLOOR, 1, { crouch: 1, sway: 1, ear: 0.85, tilt: -0.05, mood: 'starry' }, t);
  } else if (t < T.jump[1]) {
    ctx.restore();
    // กระโดดโค้งลงไปในกล่อง (ตัวส่วนล่างจะถูกผนังหน้ากล่องบัง = ลงไปอยู่ข้างใน)
    const k = seg(t, T.jump[0], T.jump[1]);
    const jx = lerp(x, bp.x, EASE.io(k));
    const jy = lerp(FLOOR, bp.y - 16, k) - Math.sin(Math.PI * k) * 90;
    drawKittenRun(ctx, jx, jy, 1, { phase: 0, dir: -1, vy: lerp(-14, 16, k), mood: 'starry' });
    return;
  } else if (t < T.out) {
    // อยู่ในกล่อง (ช็อตในกล่องวาดใน drawOverlay) — ตรงนี้ไม่เห็นตัว
  } else if (t < T.pop) {
    // เล่นอยู่ในกล่อง: เห็นแค่หางชูโผล่ขอบกล่อง แกว่งไปมา
    ctx.restore();
    tailPeek(ctx, t, bp, rock);
    return;
  } else {
    ctx.restore();
    // โผล่หัวออกมา มีกระดาษติดหัว ตาเป็นดาว
    const k = EASE.back(seg(t, T.pop, T.pop + 0.4));
    const feet = bp.y - BOX.h + 44 - k * 22;
    drawKitten(ctx, bp.x + 6, feet, 1, { sit: 1, mood: 'starry', ear: Math.sin(t * 6) * 0.25, tilt: Math.sin(t * 2.5) * 0.08 }, t);
    drawPaper(ctx, bp.x + 2, feet - 54 + Math.sin(t * 5) * 1.5, 11, { spin: 0.3 + Math.sin(t * 2.5) * 0.08, seed: 9 });
    return;
  }
  ctx.restore();
}

/** หางชูพ้นขอบกล่องขึ้นมาแกว่ง — ตัวน้องอยู่ในกล่องทั้งตัว */
function tailPeek(ctx, t, bp, rock) {
  const up = EASE.out(seg(t, T.out, T.out + 0.4)) * (1 - EASE.in(seg(t, T.pop - 0.3, T.pop)));
  const baseX = bp.x - 20, baseY = bp.y - BOX.h + 10;
  const sw = Math.sin(t * 5.5) * 16;
  const tipX = baseX + sw, tipY = baseY - 58 * up;
  ctx.save();
  ctx.translate(bp.x, bp.y); ctx.rotate(rock); ctx.translate(-bp.x, -bp.y);
  const path = () => { ctx.beginPath(); ctx.moveTo(baseX, baseY + 10); ctx.quadraticCurveTo(baseX - sw * 0.5, (baseY + tipY) / 2, tipX, tipY); };
  ctx.lineCap = 'round';
  ctx.strokeStyle = HERO.line; ctx.lineWidth = 9 + 1.24; path(); ctx.stroke();
  ctx.strokeStyle = HERO.cat; ctx.lineWidth = 9; path(); ctx.stroke();
  ctx.fillStyle = HERO.cream; ctx.strokeStyle = HERO.line; ctx.lineWidth = 0.62;
  ctx.beginPath(); ctx.arc(tipX, tipY, 4.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

/** กระดาษยับในกล่อง — เห็นพ้นขอบนิด ๆ หลังน้องลงไป และเด้งออกมาตอนกล่องโยก */
function insideBits(ctx, t, bp) {
  // ตอนกระโดดลง กระดาษสามก้อนกระเด้งขึ้นแล้วตกกลับลงกล่อง
  const k = seg(t, T.jump[1], T.jump[1] + 0.7);
  if (k > 0 && k < 1) {
    for (let i = 0; i < 3; i++) {
      const h = Math.sin(Math.PI * k) * (50 + i * 16);
      drawPaper(ctx, bp.x - 30 + i * 30, bp.y - BOX.h - h + 6, 9, { spin: k * 4 + i, seed: i });
    }
  }
}

/** กระดาษที่กระเด็นออกมานอกกล่องในช็อต 4.5 — ตกแล้วอยู่ตรงนั้นต่อไป */
function paperOut(ctx, t) {
  for (let i = 0; i < PAPER_OUT.length; i++) {
    const [t0, lx, spin] = PAPER_OUT[i];
    const k = seg(t, T.out + t0, T.out + t0 + 0.7);
    if (k <= 0) continue;
    const x = lerp(BOX_AT.x, lx, k);
    const y = lerp(BOX_AT.y - BOX.h, FLOOR + 8, k) - Math.sin(Math.PI * k) * 60;
    drawPaper(ctx, x, y, 10, { spin: spin * k * 4, seed: 20 + i });
  }
}

/** มือทั้งสองถือกล่อง → วางลง → มือเดียวล้วงตุ๊กตาปลาออก */
function hands(ctx, t, bp) {
  if (t < T.lower[1] + 0.2) {
    const lift = EASE.in(seg(t, T.lower[1], T.lower[1] + 0.2));
    for (const s of [-1, 1]) {
      // แขนตั้งขึ้นเกือบตรง เอนออกข้างนิดหนึ่ง (ไหล่กว้างกว่ากล่อง) — ไม่ไขว้กัน
      drawHand(ctx, bp.x + s * (BOX.w / 2 + 2), bp.y - BOX.h * 0.55 - lift * 60, -Math.PI / 2 + s * 0.12, 0.5, { curl: 0.6 });
    }
    return;
  }
  const k = seg(t, T.unpack[0], T.unpack[1] + 0.3);
  if (k <= 0 || k >= 1) return;
  // ล้วงลงไปแล้วดึงตุ๊กตาปลาขึ้นมา พ้นขอบบนจอไป
  const dip = k < 0.35 ? EASE.out(k / 0.35) : 1 - EASE.in((k - 0.35) / 0.65) * 3;
  const hy = bp.y - BOX.h + 10 - (1 - dip) * 60 - (k > 0.35 ? (k - 0.35) * 260 : 0);
  if (k > 0.35) drawBigFish(ctx, bp.x - 6, hy + 30, 22, -1, t * 60);
  drawHand(ctx, bp.x + 8, hy, -Math.PI / 2 - 0.3, 0.5, { curl: 1 });
}

function symbols(ctx, t, bp) {
  const x = catX(t);
  const ask = seg(t, T.stare, T.stare + 0.2) * (1 - seg(t, T.approach[0] - 0.2, T.approach[0]));
  drawSymbol(ctx, '?', x - 20, FLOOR - 70 - EASE.back(seg(t, T.stare, T.stare + 0.35)) * 6, 22, ask, -0.15);
  // ♪ ตอนโผล่หัวออกมา
  const joy = seg(t, T.pop + 0.3, T.pop + 0.6);
  if (joy > 0) drawSymbol(ctx, '♪', bp.x + 42 + Math.sin(t * 3) * 4, bp.y - BOX.h - 60 - Math.sin(t * 2) * 5, 18, joy, 0.2);
}

// ── ช็อต 4.4 มุมมองในกล่อง (พิกัดจอ) + แสงขาวต้นฉาก ─────────────
export function drawOverlay(ctx, t, W, H) {
  if (t >= T.inside[0] && t < T.inside[1]) insideShot(ctx, t, W, H);
  const f = 1 - EASE.out(seg(t, T.flash[0], T.flash[1]));
  if (f > 0) { ctx.fillStyle = `rgba(255,251,240,${f})`; ctx.fillRect(0, 0, W, H); }
}

function insideShot(ctx, t, W, H) {
  const { ix0, ix1, iy1 } = drawBoxInside(ctx, W, H, t);
  const S = 5.2;                         // ขนาดน้องในช็อตนี้ (ใกล้กล้องมาก)
  const floorY = H * 0.93;
  const cx = W / 2;
  const P = [T.inside[0], T.inside[1]];
  const l = t - P[0];

  // กระดาษยับบนพื้นกล่อง — ก้อนใหญ่ที่น้องเล่นด้วย กับก้อนเล็กรอบ ๆ
  const hitK = (a) => Math.max(0, Math.sin(seg(l, a, a + 0.25) * Math.PI));
  const bat = hitK(0.9) + hitK(1.35);
  const ballX = cx + 150 + bat * 40 - seg(l, 1.8, 2.3) * 120;
  let ballY = floorY - 40;
  drawPaper(ctx, ix0 + 60, iy1 + 30, 34, { seed: 3, spin: 0.3 });
  drawPaper(ctx, ix1 - 50, iy1 + 44, 40, { seed: 5, spin: -0.5 });

  let pose;
  let px = cx, py = floorY, scale = S;
  if (l < 0.8) {
    // เพิ่งลงมา ตาโตมองรอบ ๆ
    pose = { sit: 1, mood: 'starry', gaze: Math.sin(l * 6) * 0.6, ear: -0.4 };
  } else if (l < 1.7) {
    // ตบกระดาษ (โบกเท้าเร็ว ๆ)
    pose = { sit: 1, wave: 1, mood: 'smug', gaze: 1, ear: -0.3 };
  } else if (l < 2.3) {
    // ย่อตัวส่ายก้นเล็งกระดาษ
    pose = { crouch: 1, sway: 1, ear: 0.85, mood: 'starry' };
  } else if (l < 2.6) {
    // กระโจนเข้าหากล้อง (ตัวโตขึ้น) ทับก้อนกระดาษ
    const k = seg(l, 2.3, 2.6);
    pose = { reach: 1, mood: 'starry', ear: 0.6 };
    py = floorY - Math.sin(Math.PI * k) * 60;
    scale = S * (1 + k * 0.18);
  } else if (l < 3.6) {
    // กลิ้งหงายกอดกระดาษ งับเบา ๆ
    pose = { roll: 1, shut: 1, sprawl: 1, mouth: l > 3.0 && l < 3.3 ? 1 : 0, mood: 'happy' };
    scale = S * 1.1;
    ballY = floorY - 70;
  } else {
    pose = { sit: 1, mood: 'happy', shut: 1, tilt: 0.1 };
  }
  ctx.save();
  // ตอนกระโจน/กลิ้ง ตัวน้องใกล้กล้องขึ้น ก้อนกระดาษไปอยู่กับตัว
  drawKitten(ctx, px, py, scale, pose, t);
  ctx.restore();
  const hugging = l >= 2.6 && l < 3.6;
  drawPaper(ctx, hugging ? cx - 10 : ballX, hugging ? ballY + Math.sin(l * 9) * 4 : ballY, hugging ? 44 : 38, {
    seed: 1, spin: l * (hugging ? 2 : 0.5) + bat, squish: bat * 0.5,
  });
  // เส้นเสียงกรอบแกรบตอนตบ/กลิ้ง
  const crackle = Math.max(bat, hugging ? 0.8 : 0);
  if (crackle > 0.1) {
    ctx.save();
    ctx.globalAlpha = crackle;
    ctx.strokeStyle = '#FFF8EC'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(58,40,56,.6)'; ctx.shadowBlur = 4;
    const bx = hugging ? cx - 10 : ballX, by = hugging ? ballY : ballY;
    for (let i = 0; i < 3; i++) {
      const a = -0.9 + i * 0.5 + Math.sin(t * 20 + i) * 0.1;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a) * 60, by + Math.sin(a) * 60 - 20);
      ctx.lineTo(bx + Math.cos(a) * 80, by + Math.sin(a) * 80 - 24);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (l > 3.6) drawSymbol(ctx, '~', cx + 70, floorY - 240, 42, seg(l, 3.6, 3.8), -0.2);
}

/** กระดาษบนพรมหลังจบฉากนี้ (ตกแล้ว อยู่นิ่ง) — ฉาก 5, 6 วาดตัวนี้ ตำแหน่งจึงตรงกันทุกฉาก */
export function drawRugPapers(ctx) {
  PAPER_OUT.forEach(([, lx, spin], i) => drawPaper(ctx, lx, FLOOR + 8, 10, { spin: spin * 4, seed: 20 + i }));
}
