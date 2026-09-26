// src/mv/scene03.js
// ─────────────────────────────────────────────────────────────
// SCENE 03 — FOLLOWING (0:32–0:42.5) · เวลาในไฟล์นี้นับจากต้นฉาก (0 = 0:32)
//
// สำหรับคน มันคือการเดินไปเปิดประตูธรรมดา · สำหรับลูกแมว มันคือการผจญภัย
//
// รับการเดินต่อจากฉาก 2 ที่ความเร็วเดิม (walk.js) — ไม่มีช่วงช้า/เร็วสลับกัน
// 3.1 กล้องติดพื้นตามน้อง ขาเจ้าของสูงลิบ วิ่งผ่านใต้โต๊ะกินข้าวกับเก้าอี้
// 3.2 เจ้าของหยุดหน้าประตู น้องเดินต่อจนชนส้นเท้า ตัวแบนแหมะ แล้วนั่ง
// 3.3 หันไปนั่งมองประตูข้างขาเจ้าของ (หันหลังให้กล้อง) → (เพลงเงียบ) เงยมองเจ้าของ "?"
// 3.4 ประตูเปิด แสงขาวเต็มจอ → ฉาก 4
// ─────────────────────────────────────────────────────────────
import { seg, track, lerp, EASE } from './anim.js';
import { HOME, drawHomeBack } from './home.js';
import { drawKitten, drawKittenBack, drawKittenRun, drawSymbol } from './kitten.js';
import { drawLegs } from './owner.js';
import { WALK, OWNER_STOP, CAT_BUMP, ownerWalkX, catWalkX, ownerStep, catStep } from './walk.js';

export const FROM = 32;
export const TO = 42.5;

const FLOOR = HOME.walkY;
const DOOR_X = (HOME.door.x0 + HOME.door.x1) / 2;
const BUMP_X = WALK.stopX + WALK.heel;

const T = {
  stop: OWNER_STOP - FROM,   // เจ้าของหยุดหน้าประตู
  bump: CAT_BUMP - FROM,     // น้องชนส้นเท้า
  sit: [CAT_BUMP - FROM + 0.3, CAT_BUMP - FROM + 0.8],
  turn: [6.3, 6.75],         // หันไปมองประตู (หันหลังให้กล้อง)
  lookUp: [7.2, 7.9],        // เพลงเริ่มเงียบ — เงยมองเจ้าของ
  ask: 8.1,                  // "?"
  open: [8.7, 9.7],          // ประตูเปิด
  flash: [9.9, 10.5],        // แสงขาวเต็มจอ ส่งต่อฉาก 4
};

const catX = (t) => (t < T.bump ? catWalkX(t + FROM) : BUMP_X + EASE.out(seg(t, T.bump, T.bump + 0.3)) * 20);

// ── กล้อง ──
const CAM = [
  [T.bump - 0.3, { x: BUMP_X - 40, y: -40, z: 2.3 }],               // 3.2 ระดับพื้น เห็นชน
  [T.turn[1], { x: BUMP_X - 30, y: -36, z: 2.5 }, 'lin'],
  // 3.3 Low angle มองขึ้น: น้องตัวจิ๋วนั่งมองประตู ขาเจ้าของสูงทะลุขอบบนจอ
  [T.turn[1] + 0.0001, { x: BUMP_X - 10, y: -150, z: 1.15 }, 'hold'],
  [T.open[0], { x: BUMP_X - 20, y: -160, z: 1.2 }, 'lin'],
  [T.flash[1], { x: DOOR_X + 20, y: -150, z: 1.45 }, 'in'],           // ดันเข้าหาแสงประตู
];
export function camera(t) {
  if (t < T.bump - 0.3) {
    // กล้องติดพื้นตามน้องที่ความเร็วคงที่ มองไปทางที่เดินไป (ซ้าย) — ต่อจากกล้องท้ายฉาก 2
    return { x: catX(t) - 110, y: -66, z: 1.85 };
  }
  return track(t, CAM);
}

export function draw(ctx, t) {
  const door = EASE.io(seg(t, T.open[0], T.open[1]));
  drawHomeBack(ctx, t + FROM, 0.6, door);
  if (door > 0) doorLight(ctx, door);

  // ── ลำดับชั้น ── เก้าอี้ทุกขาอยู่ชั้นหลัง (วาดไปกับฉาก) · เจ้าของ · น้องอยู่หน้าสุด
  // (เคยวาดขาเก้าอี้ต้นหน้าทับน้องให้ดูลอดผ่าน แต่ขาที่ยื่นลงมาถึงพื้นหน้าบ้าน
  //  ตัดผ่านกลางตัวน้องเป็นแท่งไม้ อ่านเป็นบั๊กมากกว่าเป็นการลอด — เลิกใช้แล้ว)
  const ox = ownerWalkX(t + FROM);
  drawLegs(ctx, ox, FLOOR - 14, { phase: ownerStep(ox), stride: t < T.stop ? 70 : 0, dir: -1 });
  drawCat(ctx, t);
  symbols(ctx, t);
}

function drawCat(ctx, t) {
  const x = catX(t);
  if (t < T.bump) {
    drawKittenRun(ctx, x, FLOOR, 1, { phase: catStep(x), dir: -1, tail: 0.5, mood: 'starry' });
    return;
  }
  // ชน! ตัวแบนแหมะแล้วเด้งคืน → นั่ง
  const squash = Math.max(0, 1 - seg(t, T.bump, T.bump + 0.35));
  if (t < T.turn[0]) {
    const k = seg(t, T.sit[0], T.sit[1]);
    drawKitten(ctx, x, FLOOR, 1, {
      sit: EASE.back(k), sx: -0.25 * squash, sy: 0.12 * squash, lean: 0.25 * squash,
      mood: squash > 0.3 ? 'hurt' : '', ear: squash * 0.8, gaze: -0.6 * k,
    }, t);
    if (squash > 0.05) {
      for (let i = 0; i < 3; i++) {
        const a = t * 9 + i * 2.1;
        drawSymbol(ctx, '✦', x + Math.cos(a) * 20, FLOOR - 56 + Math.sin(a) * 6, 8, squash, 0);
      }
    }
    return;
  }
  // หันหลังให้กล้อง = หันไปทางประตู (ประตูอยู่ผนังด้านหลัง) · หัวเอียงไปทางซ้ายหาประตู
  const k = seg(t, T.turn[0], T.turn[1]);
  ctx.save();
  ctx.translate(x, 0);
  if (k < 0.5) {
    ctx.scale(1 - EASE.in(k * 2) * 0.55, 1);
    drawKitten(ctx, 0, FLOOR, 1, { sit: 1, gaze: -1 }, t);
  } else {
    ctx.scale(0.45 + 0.55 * EASE.out((k - 0.5) * 2), 1);
    const up = EASE.io(seg(t, T.lookUp[0], T.lookUp[1]));
    const earPerk = Math.max(0, Math.sin(seg(t, T.open[0], T.open[0] + 0.5) * Math.PI));
    drawKittenBack(ctx, 0, FLOOR, 1, {
      sit: 1, look: lerp(0.8, 0.2, up), headUp: up,
      flick: Math.max(0, Math.sin(t * 2.4)) * 0.6, earL: earPerk, earR: earPerk,
    });
  }
  ctx.restore();
}

/** แสงนอกบ้านทะลักเข้าช่องประตูที่เปิด ลากเป็นลำลงพื้น */
function doorLight(ctx, k) {
  const { x0, x1, top } = HOME.door;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createLinearGradient(x0, 0, x1 + 400, 0);
  g.addColorStop(0, `rgba(255,248,220,${0.75 * k})`);
  g.addColorStop(1, 'rgba(255,248,220,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x1, top); ctx.lineTo(x1 + 420 * k, FLOOR + 60); ctx.lineTo(x0 + 60, FLOOR + 60); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function symbols(ctx, t) {
  const x = catX(t);
  const k = seg(t, T.ask, T.ask + 0.25) * (1 - seg(t, T.open[0] + 0.2, T.open[0] + 0.5));
  drawSymbol(ctx, '?', x + 18, FLOOR - 74 - EASE.back(seg(t, T.ask, T.ask + 0.35)) * 8, 28, k, 0.15);
  const ex = seg(t, T.open[0] + 0.35, T.open[0] + 0.55) * (1 - seg(t, T.flash[0], T.flash[1]));
  drawSymbol(ctx, '!', x + 18, FLOOR - 76, 28, ex, 0.1);
}

/** แสงขาวเต็มจอตอนประตูเปิด — ทางเชื่อมไปฉาก 4 (ฉาก 4 เริ่มจากขาวแล้วค่อย ๆ ชัด) */
export function drawOverlay(ctx, t, W, H) {
  const k = EASE.in(seg(t, T.flash[0], T.flash[1]));
  if (k <= 0) return;
  ctx.fillStyle = `rgba(255,251,240,${k})`;
  ctx.fillRect(0, 0, W, H);
}
