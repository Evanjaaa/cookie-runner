// src/mv/scene01.js
// ─────────────────────────────────────────────────────────────
// SCENE 01 — MORNING (0:00–0:15)
// ตื่นนอนริมหน้าต่าง → มือเจ้าของลูบหัว → ลูบซ้ำ โดนดันมือออก หันหลังให้
// → เสียงกรุ๊งกริ๊งจากครัว (ทางขวา) หูกระดิก หัวผงก → ส่งต่อฉาก 2
// รายละเอียดทีละ Shot ดู STORYBOARD.md
// ─────────────────────────────────────────────────────────────
import { seg, track, EASE } from './anim.js';
import { HOME, drawHomeBack } from './home.js';
import { drawKitten, drawKittenBack, drawSymbol } from './kitten.js';
import { drawPetHand } from './owner.js';

export const FROM = 0;
export const TO = 15;

const CAT_X = HOME.cushion.x;
const CAT_Y = HOME.cushion.top + 2;   // จมลงในเบาะนิดหนึ่ง ไม่ได้ลอยอยู่บนผิว

// ── กล้อง ── [เวลา, {x, y, z}, ease] — ease 'hold' = ตัดภาพ
const CAM = [
  [0, { x: 330, y: -380, z: 0.66 }],
  [4.5, { x: 205, y: -230, z: 1.5 }, 'io'],            // 1.1 Push-in ช้า ๆ
  [4.5001, { x: 190, y: -200, z: 4.6 }, 'hold'],       // ตัด → 1.2 MCU ตื่นนอน
  [7.5, { x: 190, y: -202, z: 4.8 }, 'lin'],
  [7.5001, { x: 206, y: -214, z: 3.7 }, 'hold'],       // ตัด → 1.3 มือกับหัว
  [10, { x: 202, y: -212, z: 3.85 }, 'lin'],
  [10.0001, { x: 200, y: -204, z: 3.3 }, 'hold'],      // ตัด → 1.4 ถอยนิด เห็นภาษากาย
  [13.5, { x: 196, y: -202, z: 3.45 }, 'lin'],
  [15, { x: 232, y: -206, z: 3.0 }, 'io'],             // 1.5 เลื่อนไปทางเสียง
];
export const camera = (t) => track(t, CAM);

// ── ท่าของเหมียว ── ช่องเดียวกับท่าในเกม (loaf หมอบ, shut หลับตา, mouth อ้าปาก ...)
const SLEEP = { loaf: 1, shut: 1, ear: 0.15 };
const POSE = [
  [0, SLEEP],
  [4.8, SLEEP],
  [5.2, { loaf: 1, mood: 'tired', ear: 0.1 }],                       // ลืมตาปรือ ๆ
  [5.5, { loaf: 1, mood: 'tired', ear: 0.1 }, 'hold'],
  [6.0, { loaf: 0.7, mouth: 1, shut: 1, ear: 0.6, tilt: -0.12 }],    // หาว
  [6.35, { loaf: 0.7, mouth: 1, shut: 1, ear: 0.6, tilt: -0.1 }],
  [6.8, { reach: 1, sy: 0.2, sx: -0.08, shut: 1, mouth: 0.6, ear: 0.35, wag: 1 }], // ยืดสุดตัว
  [7.05, { reach: 1, sy: 0.22, sx: -0.09, shut: 1, mouth: 0.6, ear: 0.35, wag: 1 }],
  [7.5, SLEEP],                                                     // ยุบกลับไปหมอบ
  [8.6, SLEEP, 'hold'],
  [8.9, { loaf: 1, shut: 1, mood: 'happy', ear: 1 }],                // เคลิ้มใต้มือ หูลู่แบนซ่อนใต้มือ
  [10.3, { loaf: 1, shut: 1, mood: 'happy', ear: 1 }],
  [10.55, { loaf: 1, mood: 'tired', ear: 0.9 }],                    // ลูบซ้ำ… ตาเปิดแบบรำคาญ
  [10.85, { loaf: 1, mood: 'tired', ear: 0.9 }],
  [11.1, { loaf: 0.6, reach: 1, mood: 'tired', ear: 0.2, lean: 0.1 }, 'out'], // ดันมือออก
  [11.4, { loaf: 0.6, reach: 1, mood: 'tired', ear: 0.2, lean: 0.1 }],
  [11.6, { loaf: 1, mood: 'tired', ear: 0.2 }],
];

// ── มือเจ้าของ ── จุดที่อุ้งมือแตะหัว + มุมมือ + มุมแขน (แขนลงมาชันจากขวาบน ข้อมือหักให้มือนอนตามหัว)
// เจ้าของยืนอยู่ขวาของม้านั่ง มือจึงมาจากขวาบนเสมอ
const HEAD_TOP = CAT_Y - 23 - 9;   // ยอดหัวตอนหมอบ (คิดจากสัดส่วนตัวเกม)
const HEAD_HALF = 20;               // ครึ่งความกว้างหัว — ขนาดมือวัดเทียบค่านี้ (ดู drawPetHand)
const AIR = { x: 330, y: -330, hand: -0.15, arm: -0.8, cup: 0.25 };
const ON = (dx, cup = 1, hand = -0.06) => ({ x: 194 + dx, y: HEAD_TOP, hand, arm: -0.78, cup });
const HAND = [
  [7.6, AIR],
  [8.25, AIR, 'hold'],
  [8.75, { x: 200, y: HEAD_TOP - 14, hand: -0.1, arm: -0.8, cup: 0.5 }, 'out'],   // ลดลงมาช้า ๆ
  [9.0, ON(2, 0.85, -0.1)],                                                        // แตะเบา ๆ
  // ลูบสามที — ไถไปทางหลังหัวแล้วกลับ นิ้วกอบแน่นขึ้นตอนไถ มือเอียงตามแรง
  [9.3, ON(-9, 1, 0.05)],
  [9.6, ON(2, 0.85, -0.1)],
  [9.9, ON(-9, 1, 0.05)],
  [10.15, { x: 230, y: HEAD_TOP - 40, hand: -0.1, arm: -0.8, cup: 0.45 }],
  [10.45, ON(2, 0.85, -0.1), 'out'],                                               // รอบสอง
  [10.9, ON(-8, 1, 0.05)],
  [11.2, { x: 236, y: HEAD_TOP - 46, hand: -0.15, arm: -0.8, cup: 0.2 }, 'out'],     // โดนดัน สะดุ้งถอย นิ้วกาง
  [11.5, { x: 248, y: HEAD_TOP - 58, hand: -0.12, arm: -0.8, cup: 0.35 }],           // ค้างงง ๆ ครู่หนึ่ง
  [12.1, { x: 380, y: -380, hand: -0.15, arm: -0.8, cup: 0.3 }, 'in'],
];

/** หันหลัง: 11.6→12.3 บีบตัวแคบลงจนสุด แล้วสลับเป็นภาพด้านหลังที่ค่อย ๆ กางออก */
const TURN_A = 11.6, TURN_B = 12.1;

export function draw(ctx, t) {
  drawHomeBack(ctx, t, 0.62);

  // เงามือตกบนเบาะก่อนมือเข้าเฟรม
  const shade = seg(t, 7.9, 8.5) * (1 - seg(t, 8.7, 9));
  if (shade > 0) {
    ctx.fillStyle = `rgba(90,50,40,${0.18 * shade})`;
    ctx.beginPath(); ctx.ellipse(CAT_X + 20, HOME.cushion.top - 4, 70 * shade, 14, 0, 0, Math.PI * 2); ctx.fill();
  }

  // ── เหมียว ──
  if (t < TURN_A) {
    const p = track(t, POSE);
    // ลมหายใจตอนหลับ — ยุบพองช้ากว่าตอนตื่น (ตัวเกมหายใจให้เองอยู่แล้ว ตรงนี้แค่เสริมให้ชัด)
    const sleep = t < 4.8 || (t > 7.5 && t < 8.6) ? 1 : 0;
    // ยืดตัว = สั่นระริกตอนสุดแรง
    const tremble = t > 6.8 && t < 7.1 ? Math.sin(t * 90) * 0.6 : 0;
    // ถูกลูบ = หัวเอียงตามมือ
    const petting = t > 9.0 && t < 10.1 ? -Math.sin((t - 9.0) * Math.PI / 0.3) * 0.08 : 0;
    drawKitten(ctx, CAT_X + tremble, CAT_Y + Math.sin(t * 1.4) * 0.6 * sleep, 1,
      { ...p, tilt: (p.tilt || 0) + petting }, t);
  } else {
    const k = seg(t, TURN_A, TURN_B);
    ctx.save();
    ctx.translate(CAT_X, 0);
    if (k < 0.5) {
      // ครึ่งแรก: ตัวหน้าตรงบีบแคบลงเหลือครึ่ง แล้วสลับเป็นด้านหลังที่ความกว้างเดียวกัน
      // ไม่บีบจนสุด — ตรงกลางรอบจะเหลือแมวเป็นเส้นบางเฉียบแว้บหนึ่ง (เห็นชัดในจอใกล้)
      ctx.scale(1 - EASE.in(k * 2) * 0.55, 1);
      drawKitten(ctx, 0, CAT_Y, 1, { loaf: 1, mood: 'tired' }, t);
    } else {
      // ครึ่งหลัง: ภาพด้านหลังกางออกจากครึ่งเป็นเต็ม
      const w = 0.45 + 0.55 * EASE.out((k - 0.5) * 2);
      ctx.scale(w, 1);
      const flick = Math.max(0, Math.sin(seg(t, 12.55, 13.0) * Math.PI));
      const earR = Math.max(0, Math.sin(seg(t, 13.75, 14.05) * Math.PI * 2));
      const headUp = EASE.back(seg(t, 14.2, 14.6));
      drawKittenBack(ctx, 0, CAT_Y, 1, { flick, earR, headUp, breath: Math.sin(t * 2.6) * 0.7 * (1 - headUp) });
    }
    ctx.restore();
    // "ฮึ" — พ่นลมจมูกเป็นก้อนเมฆเล็ก ๆ ข้างหัว
    const puff = seg(t, 12.4, 13.1);
    if (puff > 0 && puff < 1) {
      ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - puff)})`;
      for (const [dx, dy, r] of [[0, 0, 5], [7, -3, 4], [12, 2, 3]]) {
        ctx.beginPath(); ctx.arc(CAT_X - 20 - puff * 16 - dx, CAT_Y - 44 - puff * 6 + dy, r * (0.6 + puff * 0.7), 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // มือเจ้าของ (อยู่หน้าแมว)
  if (t > 7.6 && t < 12.1) {
    const h = track(t, HAND);
    drawPetHand(ctx, h.x, h.y, { hand: h.hand, arm: h.arm, cup: h.cup, scale: HEAD_HALF });
  }

  // ── สัญลักษณ์ ──
  // z ลอยจากหัวตอนหลับ ทีละตัวทุก 1.2 วิ
  for (let i = 0; i < 5; i++) {
    const t0 = 0.3 + i * 1.1;
    const k = seg(t, t0, t0 + 1.9);
    if (k <= 0 || k >= 1 || t > 4.9) continue;
    drawSymbol(ctx, 'z', CAT_X + 14 + k * 22 + Math.sin(k * 6) * 3, CAT_Y - 48 - k * 42, 11 + k * 7, Math.sin(k * Math.PI), -0.2);
  }
  // ~ ตอนเคลิ้มใต้มือ
  const purr = seg(t, 9.0, 9.4) * (1 - seg(t, 10.1, 10.4));
  drawSymbol(ctx, '~', CAT_X - 32, CAT_Y - 52 - Math.sin(t * 3) * 2, 22, purr, -0.15);
}

/** ของที่วาดทับบนจอ (พิกัดจอ ไม่ขยับตามกล้อง) — เส้นเสียงจากครัวที่ขอบขวา */
export function drawOverlay(ctx, t, W, H) {
  const k = seg(t, 13.55, 14.3) * (1 - seg(t, 14.7, 15));
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.strokeStyle = '#FFF8EC';
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const r = 26 + i * 18 + Math.sin(t * 14 + i) * 2;
    ctx.lineWidth = 5;
    ctx.shadowColor = 'rgba(58,40,56,.6)'; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.arc(W + 10, H * 0.46, r, Math.PI * 0.72, Math.PI * 1.28); ctx.stroke();
  }
  ctx.shadowBlur = 0;
  drawSymbol(ctx, '♪', W - 110, H * 0.34 + Math.sin(t * 10) * 4, 46, 1, 0.2);
  ctx.restore();
}
