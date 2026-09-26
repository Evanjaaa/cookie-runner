// src/mv/scene02.js
// ─────────────────────────────────────────────────────────────
// SCENE 02 — BREAKFAST (0:15–0:30) · เวลาในไฟล์นี้นับจากต้นฉาก (0 = 0:15)
//
// เสียงจากครัว → หันกลับมา หูตั้ง ตาเป็นประกาย → กระโดดลงจากม้านั่ง วิ่งผ่านทั้งบ้าน
// (ห้องนั่งเล่น → ประตูโค้ง → ใต้โต๊ะกินข้าว → ครัว) → นั่งเรียบร้อยหน้าชาม หางกระดิกตามจังหวะ
// → เมี้ยว ×2 → แตะชามกริ๊ง ๆ → เจ้าของเทอาหาร กินได้สองคำ → กริ่งหน้าบ้าน
// → เจ้าของเดินออกไปทางซ้าย มองชาม มองเจ้าของ... เลือกวิ่งตามเจ้าของ → ฉาก 3
//
// Shot 2.2 (วิ่ง) คือ "แผนที่บ้าน" — คนดูเห็นเส้นทางซ้ายไปขวาครั้งเดียวแล้วจำได้ตลอดเรื่อง
// ─────────────────────────────────────────────────────────────
import { seg, track, lerp, EASE, beatPhase } from './anim.js';
import { HOME, drawHomeBack, drawBowl } from './home.js';
import { drawKitten, drawKittenBack, drawKittenRun, drawSymbol } from './kitten.js';
import { drawLegs, drawHand, OWN } from './owner.js';
import { WALK, ownerWalkX, catWalkX, ownerStep, catStep } from './walk.js';

export const FROM = 15;
// จบที่ 0:32 (ไม่ใช่ 0:30 ตามบรีฟ) — กินข้าวนานขึ้นจนกริ่งดัง แล้วเจ้าของกับน้องเดินออกจากครัว
// ความเร็วเดียวกันตลอด ฉาก 3 รับช่วงการเดินนี้ต่อจาก walk.js ไม่มีช่วงเดินช้าเร็วสลับกัน
export const TO = 32;

const FLOOR = HOME.walkY;
const CUSH = { x: HOME.cushion.x, y: HOME.cushion.top + 2 };
const SIT_X = HOME.bowl.x - 72;          // ที่นั่งรอข้างชาม
const BOWL = { x: HOME.bowl.x, y: FLOOR + 10 };

// ── ช่วงเวลาของแต่ละ Shot ──
const T = {
  spin: [0, 0.35],        // หันกลับมาจากท่าหันหลัง
  alert: 0.5,             // หูตั้ง ตาโต "!"
  hop: [1.9, 2.45],       // กระโดดลงจากม้านั่ง
  run: [2.45, 5.35],      // วิ่งไปครัว
  skid: [5.35, 5.75],     // เบรกลื่น ๆ แล้วนั่ง
  meow1: 8.3, meow2: 9.7,
  tap: [11.1, 11.7],      // แตะชามสองที (ลงจังหวะเพลง)
  pour: [11.95, 12.75],   // เจ้าของเทอาหาร
  eat: [12.9, WALK.bell - FROM],       // กินหลายคำจนกริ่งดัง
  bell: WALK.bell - FROM,             // กริ่งหน้าบ้าน
  stand: WALK.catStand - FROM,        // ลุกขึ้นยืน
  go: WALK.catGo - FROM,              // ออกเดินตาม ค่อย ๆ เร่ง (ฉาก 3 รับช่วงต่อ)
};

/** ตำแหน่งน้องตอนวิ่งไปครัว: ออกตัวเร็ว วิ่งเต็มที่ แล้วค่อย ๆ ชะลอเข้าชาม */
const RUN_FROM = 430;
function runX(t) {
  const k = seg(t, T.run[0], T.skid[1]);
  const e = k < 0.12 ? (k / 0.12) ** 2 * 0.06 : 0.06 + (1 - (1 - (k - 0.12) / 0.88) ** 1.7) * 0.94;
  return lerp(RUN_FROM, SIT_X, e);
}

// ── กล้อง ──
const CAM = [
  [0, { x: 196, y: -200, z: 4.4 }],
  [1.9, { x: 204, y: -204, z: 4.6 }, 'lin'],
  // (ช่วงวิ่ง กล้องตามน้องเอง ดู camera())
  [5.75, { x: SIT_X + 40, y: -34, z: 3.0 }, 'hold'],       // 2.3 Low angle ชามใหญ่ฉากหน้า
  [8.0, { x: SIT_X + 34, y: -30, z: 3.15 }, 'lin'],
  [8.0001, { x: SIT_X + 4, y: -4, z: 4.8 }, 'hold'],       // 2.4 Close-up หน้าเงยมอง
  [11.0, { x: SIT_X + 6, y: -6, z: 5.1 }, 'lin'],
  [11.0001, { x: SIT_X + 44, y: 6, z: 4.0 }, 'hold'],      // 2.5 อุ้งเท้ากับชาม
  [11.9, { x: SIT_X + 44, y: 4, z: 4.0 }, 'lin'],
  [12.6, { x: SIT_X + 50, y: -60, z: 2.7 }, 'io'],          // ถอยให้เห็นมือเทอาหาร
  [13.2, { x: SIT_X + 20, y: -40, z: 2.9 }, 'io'],          // เข้าใกล้ตอนกิน
  [15.3, { x: SIT_X + 16, y: -38, z: 3.1 }, 'lin'],
];
export function camera(t) {
  if (t >= T.hop[0] && t < T.skid[1]) {
    // Tracking ระดับพื้น: นำหน้าน้องไปทางขวานิดหนึ่ง (ที่ว่างข้างหน้า = ทิศที่กำลังไป)
    const x = t < T.run[0] ? lerp(CUSH.x, RUN_FROM, seg(t, T.hop[0], T.run[0])) : runX(t);
    const intro = EASE.io(seg(t, T.hop[0], T.hop[0] + 0.5));
    // น้องอยู่ราวหนึ่งในสามล่างของจอ เห็นเฟอร์นิเจอร์เต็ม ๆ ผ่านไปข้างหลัง
    return { x: x + 130, y: lerp(-150, -70, intro), z: lerp(2.2, 1.5, intro) };
  }
  // 2.6 กริ่งดัง → ถอยออกจนเป็นกล้องตามน้องระดับพื้น ด้วยสูตรเดียวกับฉาก 3 เป๊ะ
  // ตอนน้องลุกเดิน กล้องจึงตามไปเรื่อย ๆ และรอยต่อเข้าฉาก 3 ไม่เห็นเป็นการตัดภาพเลย
  if (t > T.bell + 0.3) {
    const k = EASE.io(seg(t, T.bell + 0.3, T.stand + 0.2));
    const from = track(t, CAM);
    const follow = { x: catWalkX(t + FROM) - 110, y: -66, z: 1.85 };
    return { x: lerp(from.x, follow.x, k), y: lerp(from.y, follow.y, k), z: lerp(from.z, follow.z, k) };
  }
  return track(t, CAM);
}

// ── ขาเจ้าของ ── ยืนหน้าเคาน์เตอร์หันเข้าเตา → หันมาทางแมวหลังเมี้ยวรอบสอง → เดินไปเปิดประตู
// ตำแหน่งตอนเดินมาจาก walk.js ตัวเดียวกับฉาก 3 — ความเร็วเท่ากันตลอด ต่อกันพอดีตรงรอยตัด
function ownerAt(t) {
  const g = t + FROM;
  const x = ownerWalkX(g);
  return { x, walk: g > WALK.ownerGo, phase: ownerStep(x), dir: t > 10.2 ? -1 : 1 };
}

export function draw(ctx, t) {
  drawHomeBack(ctx, t + FROM, 0.6);

  // ── เจ้าของ (อยู่หลังแมว) ── ยืนทำอาหารอยู่ในครัวตั้งแต่ต้นฉาก (เป็นต้นเสียงที่ปลุกน้อง)
  // กล้องที่วิ่งตามน้องจึงแพนไปเจอเอง ไม่ใช่โผล่มาตอนน้องถึงชาม
  const o = ownerAt(t);
  drawLegs(ctx, o.x, FLOOR - 14, { phase: o.phase, stride: o.walk ? 70 : 0, dir: o.dir });

  drawCat(ctx, t);

  // ชามอยู่หน้าแมว (ใกล้กล้องกว่า) — Low angle จึงเห็นชามใหญ่เต็มฉากหน้า
  const taps = [T.tap[0], T.tap[0] + 0.3];
  const wob = taps.reduce((w, t0) => w + (t > t0 && t < t0 + 0.35 ? Math.sin((t - t0) * 40) * 0.09 * (1 - (t - t0) / 0.35) : 0), 0);
  const fill = seg(t, T.pour[0] + 0.15, T.pour[1]);
  drawBowl(ctx, BOWL.x, BOWL.y, { wobble: wob, fill, eaten: seg(t, T.eat[0], T.eat[1]) });

  // "กริ๊ง" ตอนแตะชาม
  for (const t0 of taps) {
    const k = seg(t, t0, t0 + 0.4);
    if (k > 0 && k < 1) drawSymbol(ctx, '♪', BOWL.x + 30 + k * 12, BOWL.y - 46 - k * 20, 12, 1 - k, 0.2);
  }

  pour(ctx, t);
  symbols(ctx, t);
}

function drawCat(ctx, t) {
  // A · หันกลับมาจากท่าหันหลัง (ฉาก 1 จบที่ด้านหลัง หัวผงกขึ้น)
  if (t < T.spin[1]) {
    const k = seg(t, T.spin[0], T.spin[1]);
    ctx.save(); ctx.translate(CUSH.x, 0);
    if (k < 0.5) {
      ctx.scale(1 - EASE.in(k * 2) * 0.55, 1);
      drawKittenBack(ctx, 0, CUSH.y, 1, { headUp: 1 });
    } else {
      ctx.scale(0.45 + 0.55 * EASE.out((k - 0.5) * 2), 1);
      drawKitten(ctx, 0, CUSH.y, 1, { loaf: 1, ear: -0.8, mood: 'starry' }, t);
    }
    ctx.restore();
    return;
  }
  // หูตั้ง ตาเป็นประกาย หันขวับไปทางครัว (ขวา) แล้วลุกยืนเตรียมโดด
  if (t < T.hop[0]) {
    const up = EASE.out(seg(t, 1.35, 1.8));
    const look = EASE.back(seg(t, 0.75, 0.95));
    drawKitten(ctx, CUSH.x, CUSH.y, 1, {
      loaf: 1 - up, crouch: up * 0.6, ear: -0.8, mood: 'starry', gaze: look, tilt: -look * 0.08,
    }, t);
    return;
  }
  // B · กระโดดลงจากม้านั่ง
  if (t < T.run[0]) {
    const k = seg(t, T.hop[0], T.run[0]);
    const x = lerp(CUSH.x, RUN_FROM, k);
    const y = lerp(CUSH.y, FLOOR, k) - Math.sin(Math.PI * k) * 70;
    drawKittenRun(ctx, x, y, 1, { phase: 0, air: 0, vy: lerp(-12, 14, k), mood: 'starry', squash: k > 0.9 ? 0.3 : 0 });
    return;
  }
  // วิ่ง
  if (t < T.skid[0]) {
    const x = runX(t);
    drawKittenRun(ctx, x, FLOOR, 1, { phase: x, mood: 'starry', tail: 0.6 });
    return;
  }
  // เบรกลื่น → นั่ง
  if (t < T.skid[1]) {
    const k = seg(t, T.skid[0], T.skid[1]);
    drawKitten(ctx, runX(t), FLOOR, 1, { sit: EASE.out(k), sy: -0.18 * Math.sin(Math.PI * k), sx: 0.12 * Math.sin(Math.PI * k), lean: -0.2 * (1 - k), mood: 'starry' }, t);
    // ฝุ่นจากการเบรก
    ctx.fillStyle = `rgba(255,248,236,${0.8 * (1 - k)})`;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(runX(t) - 30 - i * 10 - k * 20, FLOOR - 4 - i * 3, 5 + k * 6, 0, Math.PI * 2); ctx.fill(); }
    return;
  }

  // C–F · นั่งหน้าชาม
  const beat = Math.sin(beatPhase(t + FROM) * Math.PI * 2);
  const pose = { sit: 1, wag: beat * 0.9, mood: '' };
  if (t < T.meow1 - 0.3) {
    // รอ: หางกระดิกตรงจังหวะ มองชามสลับมองขึ้น
    Object.assign(pose, { mood: 'starry', gaze: 0.5, tilt: 0.05 });
  } else if (t < T.tap[0]) {
    // เงยหน้าร้องเมี้ยว — รอบสองเอียงหัวมากขึ้น ร้องนานขึ้น
    const second = t > T.meow2 - 0.2;
    const m = second ? seg(t, T.meow2, T.meow2 + 0.7) : seg(t, T.meow1, T.meow1 + 0.5);
    Object.assign(pose, { tilt: second ? -0.2 : -0.12, mouth: m > 0 && m < 1 ? 1 : 0, ear: second ? -0.4 : 0, gaze: 0.9 });
  } else if (t < T.pour[0]) {
    // แตะชาม — ใช้ท่าเอื้อมอุ้งเท้าของเกม ลงสองจังหวะ
    const tapK = Math.max(Math.sin(seg(t, T.tap[0], T.tap[0] + 0.3) * Math.PI), Math.sin(seg(t, T.tap[0] + 0.3, T.tap[0] + 0.6) * Math.PI));
    Object.assign(pose, { reach: 0.3 + tapK * 0.7, lean: 0.08, gaze: 1, mood: 'smug' });
  } else if (t < T.eat[0]) {
    // เห็นอาหารไหลลงชาม
    Object.assign(pose, { mood: 'starry', gaze: 1, tilt: 0.06, ear: -0.5 });
  } else if (t < T.bell) {
    // กินไปเรื่อย ๆ — ก้มหัวลงหาชามเป็นจังหวะ ทีละคำ
    const bob = Math.abs(Math.sin((t - T.eat[0]) * Math.PI * 1.6));
    Object.assign(pose, { lean: 0.22 + bob * 0.08, dx: 6, mood: 'happy', shut: 1, mouth: bob > 0.6 ? 1 : 0 });
  } else if (t < T.stand) {
    // กริ่งดัง: หูกระดิก หยุดเคี้ยว มองซ้าย (เจ้าของเดินผ่าน) → มองชาม → มองซ้ายอีกที → ตัดสินใจ
    const b = t - T.bell;
    const g = b < 0.4 ? -0.4 : b < 0.75 ? -1 : b < 0.95 ? 1 : -1;
    Object.assign(pose, { gaze: g, ear: b < 0.25 ? 0.4 : -0.3, tilt: g * 0.05 });
  } else if (t < T.go) {
    // ลุกจากท่านั่ง — ยืดตัวขึ้นนิดหนึ่งแล้วยืน หันไปทางที่เจ้าของเดินไป (ซ้าย)
    const k = EASE.io(seg(t, T.stand, T.go));
    Object.assign(pose, { sit: 1 - k, sy: Math.sin(Math.PI * k) * 0.08, gaze: -1, ear: -0.2, tilt: -0.05, wag: 0.5 });
  } else {
    // เลือกเจ้าของ — เดินตามออกไปทางซ้าย ความเร็วเดียวกับเจ้าของ (walk.js)
    const x = catWalkX(t + FROM);
    drawKittenRun(ctx, x, FLOOR, 1, { phase: catStep(x), dir: -1, tail: 0.5 });
    return;
  }
  drawKitten(ctx, SIT_X, FLOOR, 1, pose, t);
}

/** มือเจ้าของเทอาหารจากถุง — แขนลงมาจากขวาบน เอียงถุง เม็ดอาหารไหลลงชาม */
function pour(ctx, t) {
  const k = seg(t, T.pour[0] - 0.3, T.pour[1] + 0.3);
  if (k <= 0 || k >= 1) return;
  const inK = EASE.out(seg(t, T.pour[0] - 0.3, T.pour[0]));
  const outK = EASE.in(seg(t, T.pour[1], T.pour[1] + 0.3));
  const tilt = EASE.io(seg(t, T.pour[0], T.pour[0] + 0.25)) * 0.9;
  const bx = BOWL.x + 50 + outK * 60, by = BOWL.y - 150 - (1 - inK) * 120 - outK * 140;
  // ถุงอาหาร
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-tilt);
  ctx.strokeStyle = OWN.line; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
  ctx.fillStyle = '#FFB36B';
  ctx.beginPath(); ctx.moveTo(-34, 50); ctx.lineTo(-30, -44); ctx.lineTo(30, -44); ctx.lineTo(34, 50); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7FD1E8';
  ctx.beginPath(); ctx.ellipse(-2, 4, 18, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
  // มือจับถุง (มือเดิมของเจ้าของ แขนมาจากขวาบน)
  drawHand(ctx, bx + 26, by - 10, -0.9, 0.5, { curl: 1 });
  // เม็ดอาหารไหลจากปากถุงลงกลางชาม
  // ปากถุง = มุมบนซ้ายของถุง (-30, -44) หลังหมุนตามที่เอียงถุง — คิดตำแหน่งจริงหลังหมุน
  // ไม่งั้นสายอาหารจะออกจากกลางอากาศข้างถุง แล้วตกเลยชามไป
  if (tilt > 0.5 && t < T.pour[1]) {
    const c = Math.cos(-tilt), sn = Math.sin(-tilt);
    const mouthX = bx + (-30 * c + 44 * sn), mouthY = by + (-30 * sn - 44 * c);
    for (let i = 0; i < 14; i++) {
      const f = ((t * 3.2 + i / 14) % 1);
      const px = lerp(mouthX, BOWL.x + (i % 5 - 2) * 5, f);
      const py = lerp(mouthY, BOWL.y - 30, f * f);
      ctx.fillStyle = i % 3 ? '#C9824A' : '#A8683A';
      ctx.beginPath(); ctx.ellipse(px, py, 4.5, 3.4, i, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function symbols(ctx, t) {
  // "!" ตอนได้ยินเสียงจากครัว
  const a = seg(t, T.alert, T.alert + 0.15) * (1 - seg(t, 1.4, 1.7));
  drawSymbol(ctx, '!', CUSH.x + 22, CUSH.y - 58 - EASE.back(seg(t, T.alert, T.alert + 0.3)) * 6, 20, a, 0.12);
  // ♪ เมี้ยว — รอบสองใหญ่กว่า
  const hx = SIT_X + 10, hy = FLOOR - 56;
  for (const [t0, size] of [[T.meow1, 12], [T.meow2, 19]]) {
    const k = seg(t, t0, t0 + 0.9);
    if (k > 0 && k < 1) drawSymbol(ctx, '♪', hx + 14 + k * 16, hy - k * 22, size, Math.sin(k * Math.PI), 0.25);
  }
  // ประกายตอนเห็นอาหาร
  const sp = seg(t, T.pour[1] - 0.2, T.pour[1] + 0.5);
  if (sp > 0 && sp < 1) {
    for (let i = 0; i < 3; i++) drawSymbol(ctx, '✦', hx - 22 + i * 22, hy - 16 - Math.sin(sp * Math.PI) * 10 - i % 2 * 6, 9, Math.sin(sp * Math.PI), 0);
  }
}

/** ของบนจอ: กริ่งหน้าบ้านดังจากขอบซ้าย (บ้านอยู่ทางซ้าย = ทิศเดียวกับประตูจริง) */
export function drawOverlay(ctx, t, W, H) {
  const k = seg(t, T.bell, T.bell + 0.2) * (1 - seg(t, T.bell + 0.85, T.bell + 1.25));
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha = k;
  const shake = Math.sin(t * 60) * 0.25 * (1 - seg(t, T.bell, T.bell + 0.6));
  ctx.translate(70, H * 0.32);
  ctx.rotate(shake);
  // กระดิ่ง
  ctx.fillStyle = '#FFD35C'; ctx.strokeStyle = '#6B4A3A'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-22, 16); ctx.quadraticCurveTo(-20, -22, 0, -24); ctx.quadraticCurveTo(20, -22, 22, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 22, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = k;
  ctx.strokeStyle = '#FFF8EC'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(58,40,56,.6)'; ctx.shadowBlur = 4;
  for (let i = 0; i < 2; i++) {
    const r = 38 + i * 14 + Math.sin(t * 16 + i) * 2;
    ctx.beginPath(); ctx.arc(70, H * 0.32, r, -Math.PI * 0.28, Math.PI * 0.28); ctx.stroke();
  }
  ctx.restore();
}
