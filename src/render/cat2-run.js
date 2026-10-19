// src/render/cat2-run.js
// ══ ท่าวิ่งในด่านของน้องแบบใหม่ (cat2) — หันเฉียงขวา ══
// ตัววาด cat2 วาดตามช่องของรูปร่าง (shape) — ไฟล์นี้แปลงสถานะของ Player ทุกเฟรมเป็นช่องเหล่านั้น
//   วิ่ง: ตัวน้องแบบเดิม (หันเฉียงขวา) สองขา — ขาจากแบบถูกแทนด้วยขาวาดใหม่ (shape.runLegs) ก้าวไปหน้า/ถีบไปหลังกว้าง ๆ ตามแบบ
//         ตัวยุบ-ลอยสองทีต่อรอบ (crouch)
//         แขนแกว่งสวนขา · หัวโยกช้ากว่าตัว · หูกระพือ · หางสะบัดตามหลัง
//   กลางอากาศ: ขาขึ้น = พับขา แขนเหวี่ยงหลัง ตัวยืด · ขาลง = ยืดขารอแตะพื้น กางแขน หูตั้ง
//   ลงพื้น: ตัวแบน (Player.squash) + ย่อรับน้ำหนัก แล้วเด้งกลับเข้าจังหวะวิ่ง
//   กระโดดชั้นสอง: ท่าพิเศษประจำตัว (JUMP2) — น้องส้ม = ตีลังกาม้วนตัวหน้าหนึ่งรอบ
// ทุกช่องผ่านตัวกรองนุ่ม (smooth) — เปลี่ยนสถานะแล้วไหลเข้าท่าใหม่ ไม่ตัดภาพ
//
// ใช้: const A = createRunAnim();  ทุกเฟรม: const r = stepRunAnim(A, player, info)  แล้ว drawCat2Run(ctx, x, feetY, scale, skin, t, r)

import { drawCat2, cat2Faint, cat2Trail, drawTrail } from './cat2.js';
import { gfxLevel } from '../graphics.js';
import { GROUND_Y } from '../config.js';

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (u) => u * u * (3 - 2 * u);
const io = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

/** หันเฉียงขวา (มุมเดียวกับปุ่ม "ขวา" ในหน้าทดลอง) */
export const RUN_TURN = -0.75;
/** จังหวะขา: เฟรมต่อหนึ่งรอบก้าว (ซ้าย+ขวา) ที่ความเร็ววิ่งปกติ — น้องตัวกลมขาสั้น ก้าวถี่พอดี ๆ ไม่รัวแบบตัวเดิม */
const STRIDE = 0.88;
/** วิ่งสี่จังหวะ: ระยะ runPhase ต่อหนึ่งจังหวะ — runPhase เดิน 0.408/เฟรมที่ความเร็วปกติ → 7.5 เฟรม/จังหวะ = 8 จังหวะ/วิ (เท่าค่าเริ่มต้นในแท็บ 4 จังหวะ) · วิ่งเร็วขึ้น = ก้าวถี่ขึ้นเอง */
const RUN4_STEP = 3.06;   // เรเดียนของรอบก้าวต่อหน่วย runPhase ของ Player (runPhase เดิน 0.408/เฟรม → ~17.5 เฟรม/รอบ)

/**
 * ท่ากระโดดชั้นสองประจำตัว (id แมว → ชนิด) · ไม่มีในรายการ = 'twirl'
 *   flip  = ตีลังกาม้วนตัวไปข้างหน้าหนึ่งรอบ (กอดเข่า หลับตายิ้ม) มีรอยลมโค้งตามหลัง
 *   twirl = หมุนตัวรอบแกนตั้งหนึ่งรอบ (ตัวตรง แขนกาง) มีประกายวนรอบตัว
 */
export const JUMP2 = {};   // ผู้ใช้ 17 ต.ค.: แมวทุกตัวทุกสีตีลังกาเหมือนน้องส้ม — ใส่ id: 'twirl' ถ้าอยากให้ตัวไหนหมุนตัวแทน
const J2_LEN = { flip: 27, twirl: 29 };
/**
 * ท่าเตรียมกระโดด (ผู้ใช้ 17 ต.ค.): กดแล้วตัดเข้าท่าตัวหย่น (Down + หดเตี้ยป้อม) ทันที ค้างไว้ JUMP_PREP เฟรม
 * แล้วตัดไปท่าถัดไปเลย (Up / ตีลังกา) — ไม่มีท่า Down ตัวตรงคั่น (ผู้ใช้: "ไม่ต้องใส่ฉากยืนท่านั้นมา")
 */
const JUMP_PREP = 4;

/**
 * ขนาดตัวใหม่ตอนวิ่ง — 0.86 = สูงเท่าตัวเดิม (วัดจากภาพ: หูถึงเท้า) × RUN_SIZE (ผู้ใช้ 18 ต.ค.: ขยาย 15% แล้วขออีก 5% = 20%)
 * สเกลที่ส่งให้ drawCat2Run = สเกลตัวในเกม × RUN_K · ภาพอย่างเดียว กล่องชนเท่าเดิม (ความยากไม่เปลี่ยน)
 * ของที่เกาะตัว (เงา หลอดสกิล วงโล่ คลื่นดูด จุดรับแสง) คูณ RUN_SIZE ตาม (game.js)
 */
export const RUN_SIZE = 1.2;
export const RUN_K = 0.86 * RUN_SIZE;

/**
 * เงาใต้ตัวน้องตอนวิ่ง — อยู่บนพื้นเสมอ จางและหดตามความสูงที่ลอย (ค่าเดียวกับตัวเดิม × RUN_SIZE)
 * x = กลางตัว · feetY = เท้า · catS = สเกลตัวในเกม (ก่อนคูณ RUN_K)
 * เกม (game.js) กับหน้าออกแบบด่านใช้ตัวนี้ตัวเดียว
 */
export function drawRunShadow(ctx, x, feetY, catS) {
  const air = Math.max(0, GROUND_Y - feetY);
  const a = Math.max(0, 0.32 - air / 500);
  if (a <= 0) return;
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * a;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, GROUND_Y + 4, Math.max(0, 22 - air * 0.02) * catS * RUN_SIZE, 5 * catS * RUN_SIZE, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = a0;
}

export function createRunAnim() {
  return { sm: {}, air: 0, fall: 0, land: 99, j2: null, j2t: 0, prevJumps: 0, prevGround: true, slide: 0, t: 0 };
}

/** ตัวกรองนุ่ม: ค่าวิ่งเข้าหาเป้าแบบหน่วง (rate ต่อเฟรม) */
function sm(A, key, target, rate) {
  const cur = A.sm[key] ?? target;
  const v = cur + (target - cur) * Math.min(1, rate);
  A.sm[key] = v;
  return v;
}

/**
 * อ่าน Player หนึ่งเฟรม → รูปร่างของ cat2 + ข้อมูลหมุนตัว/เอฟเฟกต์
 * info = { catId, dt, mood, hurt (0..1), dead, tired (0..1), outfit (id ชุดที่ใส่ — สกิน S ที่มีท่าแอ็ค), gait (ตัวคูณจังหวะขา),
 *          keep (คืนสำเนาเม็ดประกาย — ผู้เรียกที่เก็บผลหลายเฟรมไว้ เช่นหน้าทดสอบ),
 *          speed (ฉากเลื่อนต่อเฟรม หน่วยเกม — ทางประกายหลุดจากชุด), scale (สเกลตัวตอนวาด),
 *          stand (ยืนเฉยบนพื้น = ท่า Down เท้าใต้ตัว ไม่ก้าว — ช่วงโบนัสที่ฉากหยุดนิ่ง) }
 */
export function stepRunAnim(A, P, info = {}) {
  const dt = info.dt ?? 1;
  A.t += dt;
  // ── หมดแรง (ผู้ใช้ 17 ต.ค.): ทรุดลงนั่งท่าเกาท้องตรงนั้น แขนสองข้างวางบนพุงเหมือนกัน (symArms · ไม่ขยับเกา) ตาหมุน @ @ ──
  //    แทนการล้มนอนตะแคง · ตกหลุม (ไม่ใช่ fainting) ยังปลิวหมุนตกจอเหมือนเดิม
  if (info.dead && P.fainting) {
    A.faintT = (A.faintT ?? -dt) + dt;
    const f = A.faintT;
    // สกิน S ที่มีท่าหมดแรงประจำชุด (ช่อง faint ใน cat2.js · ผู้ใช้ 18 ต.ค.: ต่างจากท่าแอ็ค ไม่นั่งมึนแบบเพื่อน)
    //   sweet = นั่งหลับกอดคทา Zzz · princess = นั่งสง่า คทาขวางตัก เกล็ดหิมะวนรอบหัว · เข้าท่าทันที ก้นกระแทกแบนเด้งคืน
    const fp = info.outfit ? cat2Faint(info.outfit) : null;
    if (fp) {
      const pop = f > 6 ? Math.sin(clamp01((f - 6) / 16) * Math.PI) * (1 - clamp01((f - 6) / 16)) : 0;
      const sh = { ...fp.shape(f) };
      sh.sit = 0.55 + 0.45 * ease(clamp01(f / 8));
      sh.sy = (sh.sy || 0) - 0.12 * pop;
      sh.sx = (sh.sx || 0) + 0.08 * pop;
      return { shape: sh, spin: 0, twirl: 0, j2: null, j2k: 0, air: 0, land: 0, bob: 0, beat: -1, ...trailOut(A, P, info, false) };
    }
    // เข้าท่านั่งทันที (ไม่มีท่ายืนคั่น) — ตัวนั่งผุดจากสูงยุบลงที่ (sitU ใน cat2.js) แล้วก้นกระแทกพื้นแบนเด้งคืน
    const sit = 0.55 + 0.45 * ease(clamp01(f / 8));
    const plop = f > 6 ? Math.sin(clamp01((f - 6) / 16) * Math.PI) * (1 - clamp01((f - 6) / 16)) : 0;
    const woozy = clamp01((f - 14) / 20);                                      // มึน: หัวโยกช้า ๆ ตัวโคลง
    return {
      shape: {
        sit, scratch: 0, symArms: 1,
        turn: -0.5,   // หันหน้าไปทางซ้ายจอ + เอียงหัวตาม (ผู้ใช้ 17 ต.ค. — ลองขวาแล้ว ให้กลับอีกทาง)
        sy: -0.12 * plop, sx: 0.08 * plop,
        tilt: -0.12 * ease(clamp01(f / 10)) + 0.035 * Math.sin(f * 0.075) * woozy,
        lean: 0.035 * Math.sin(f * 0.075 - 0.9) * woozy,
        ear: 0.35 + 0.1 * Math.sin(f * 0.06), mouth: 0.15,
        wag: 0.4 * Math.sin(f * 0.05),
        mood: 'dizzy',
      },
      spin: 0, twirl: 0, j2: null, j2k: 0, air: 0, land: 0, bob: 0, beat: -1, ...trailOut(A, P, info, false),
    };
  }
  A.faintT = undefined;
  const ground = !!P.onGround;
  // ── เหตุการณ์ ──
  if (ground && !A.prevGround) A.land = 0; else A.land += dt;
  if (info.dead) A.j2 = null;   // ตายแล้ว (ตกหลุม) = ไม่ตีลังกาค้างกลางทาง — ร่วงลงนิ่ง ๆ
  if (!info.dead && !ground && P.jumps >= 2 && P.jumps > A.prevJumps && A.prevJumps >= 1) {
    A.j2 = JUMP2[info.catId] || 'flip';
    A.j2t = 0;
  }
  // กดกระโดด (ชั้นหนึ่งหรือสอง): เริ่มนับเฟรมท่าเตรียม/สปริง — เดินตกขอบ (jumps ขึ้นแต่ไม่ได้ถีบ) ไม่นับ
  if (P.jumps > A.prevJumps && P.vy < -4) A.jumpT = 0; else A.jumpT = (A.jumpT ?? 99) + dt;
  A.prevJumps = P.jumps;
  A.prevGround = ground;

  // ── น้ำหนักแต่ละสถานะ (นุ่ม) ──
  if (!ground && A.prevAir === false) A.airT = 0; else A.airT = (A.airT ?? 99) + dt;   // เฟรมนับจากเท้าพ้นพื้น
  A.prevAir = !ground;
  const air = sm(A, 'air', ground ? 0 : 1, ground ? 0.45 : 0.3);
  const fallT = clamp01((P.vy + 3) / 9);                 // 0 = กำลังพุ่งขึ้น · 1 = ร่วงเร็ว
  const fall = sm(A, 'fall', fallT, 0.2);
  const apex = ground ? 0 : Math.exp(-((P.vy / 2.6) ** 2));   // ช่วงลอยค้างบนยอด
  const kick0 = ground ? 0 : Math.exp(-A.airT * 0.22);        // แรงถีบตอนเพิ่งพ้นพื้น (จางใน ~10 เฟรม)
  const slide = sm(A, 'slide', P.sliding ? 1 : 0, 0.35);
  const landK = A.land < 16 ? Math.sin((A.land / 16) * Math.PI) * Math.exp(-A.land * 0.08) : 0;
  // หูเด้งหลังลงพื้น (สปริงหน่วง): ตกลงแล้วดีดกลับสองสามที
  const landEar = A.land < 30 ? Math.sin(A.land * 0.55) * Math.exp(-A.land * 0.13) : 0;

  // ── วงก้าว (ผู้ใช้ 16 ต.ค.: วิ่งสองขาด้วยตัวเดิม แต่ขาก้าวไปหน้า-หลังเองแบบในแบบคุกกี้รัน) ──
  // ขาแต่ละข้าง: เท้าแตะพื้นแล้วไถไปหลัง → ถีบพ้นพื้นเตะไปหลังสูง → แกว่งมาหน้า ยื่นเท้ารับพื้น · สองขาเหลื่อมครึ่งรอบ
  const ph = P.runPhase * STRIDE * (info.gait ?? 1);
  const s1 = Math.sin(ph);
  // ผู้ใช้ 16 ต.ค.: กลับไปใช้ขาจากแบบ (ท่าเอียงขวาเวอร์ชันแรก) ระหว่างรอผู้ใช้ออกแบบขาวิ่งเอง — ขาดัดด้วย kick (แกว่งรอบสะโพก) + lift (ยกเท้า)
  const c1 = Math.cos(ph);
  const step = (c) => Math.pow(Math.max(0, c), 1.5);     // ยกเท้าเฉพาะครึ่งรอบที่แกว่งมาหน้า
  const bob = Math.cos(ph * 2);
  const run = {
    kickL: -0.26 * s1, kickR: 0.26 * s1,
    liftL: 13 * step(c1), liftR: 13 * step(-c1),
    crouch: 0,
    lean: 0.06 + 0.012 * Math.sin(ph * 2 - 0.4),
    tilt: 0.025 * Math.sin(ph * 2 - 1.1),               // หัวโยกช้ากว่าตัว
    // แขนขยับเบามาก (ผู้ใช้สั่ง) — แกว่งสวนขานิดเดียว
    armSwingL: 0.07 * s1, armSwingR: -0.07 * s1,
    elbowL: 0, elbowR: 0,
    // หูกระพือเบา ๆ ทุกก้าว (ช้ากว่าตัวนิด = หูมีน้ำหนัก)
    ear: 0.08 + 0.22 * Math.sin(ph * 2 - 1.9),
    wag: 0.35 + 0.5 * Math.sin(ph + 2.2),
    sy: 0.022 * bob, sx: -0.012 * bob,
    mouth: 0,
  };
  // ── กลางอากาศ ──
  //   ขาขึ้น: ขาหน้ายกเข่าสูง ขาหลังเหยียดถีบไปหลัง หางม้วนลง หูลู่ตามลม เงยหน้า
  //   ยอด: ลอยค้างแว้บหนึ่ง — ตัวเอนหน้านิด พับขาเพิ่ม อ้าปากดีใจ หูตั้ง
  //   ขาลง: ขาหน้ายื่นลงรอแตะพื้น ขาหลังพับตาม แขนกางทรงตัว หูปลิว หางชี้ฟ้า มองพื้น
  const up = {
    kickL: -0.3, kickR: 0.1, liftL: 20, liftR: 10, crouch: 0, lean: 0.0, tilt: -0.07,
    armSwingL: 0.12, armSwingR: -0.12, elbowL: 0, elbowR: 0, ear: 0.45, wag: -0.7, sy: 0.04, sx: -0.02, mouth: 0.1,
  };
  const down = {
    kickL: -0.14, kickR: 0.04, liftL: 4, liftR: 1, crouch: 0, lean: -0.03, tilt: 0.05,
    armSwingL: 0.3, armSwingR: -0.3, elbowL: 0, elbowR: 0, ear: -0.35, wag: 0.9, sy: 0.02, sx: 0, mouth: 0.15,
  };
  const target = {};
  for (const k of Object.keys(run)) {
    const a = up[k] + (down[k] - up[k]) * fall;
    target[k] = run[k] + (a - run[k]) * air;
  }
  // ถีบตัวขึ้น: ยืดตัวสูง แขนสะบัดไปหลัง หูลู่ หางฟาดลง
  target.armSwingL += 0.18 * kick0; target.armSwingR -= 0.18 * kick0;
  target.ear += 0.3 * kick0; target.wag -= 0.5 * kick0; target.tilt -= 0.04 * kick0;
  // ลอยค้างบนยอด: พับขาเพิ่ม เอนหน้า กางแขนนิด อ้าปากดีใจ หูตั้งกระดิก
  target.liftL += 8 * apex; target.liftR += 8 * apex; target.lean += 0.07 * apex;
  target.armSwingL += 0.12 * apex; target.armSwingR -= 0.12 * apex;
  target.mouth += 0.35 * apex; target.ear += (-0.25 + 0.12 * Math.sin(A.t * 0.7)) * apex;
  // ขาลง: หูปลิวตามลมเบา ๆ
  target.ear += 0.1 * Math.sin(A.t * 0.9) * air * fall;
  // ลงพื้น: ย่อรับน้ำหนัก หัวพยัก แขนตกตามแรง หูเด้ง
  target.crouch += 0.4 * landK;
  // ลงพื้น: กางขาหน้า-หลังรับน้ำหนัก
  target.tilt += 0.06 * landK;
  target.armSwingL -= 0.08 * landK; target.armSwingR += 0.08 * landK;
  target.ear += 0.4 * landEar;
  // ช่องที่เปลี่ยนเร็วตามก้าวต้องไม่กรองหนัก (ไม่งั้นขาก้าวไม่สุด) — กรองเฉพาะช่วงเปลี่ยนสถานะ
  const shape = {};
  const rate = 0.3 + 0.7 * (1 - Math.abs(air - (ground ? 0 : 1)));   // ตามเป้าเกือบทันทีตอนอยู่นิ่งในสถานะ
  for (const k of Object.keys(target)) shape[k] = sm(A, 's_' + k, target[k], rate);

  // ── ตัวแบนตอนลงพื้น/ยืดตอนถีบ (ค่าเดียวกับตัวเดิม) ──
  // ใช้แค่ตัวแบนตอนลงพื้น (squash บวก) — ตอนถีบขึ้น Player ยืดตัว (ลบ) แต่ผู้ใช้ให้หดตัวเด้งดึ๋งแทน (spring ข้างล่าง)
  const sq = info.dead ? 0 : Math.max(0, P.squash || 0);
  shape.sx += sq * 0.22;
  shape.sy -= sq * 0.26;
  // ตัวหย่นตอนเริ่มกระโดด: หดเตี้ยป้อมเต็มที่ค้างไว้ JUMP_PREP เฟรม → คลายตัวใน 2 เฟรม (ไม่เด้งยืด)
  const jt = A.jumpT ?? 99;
  const spring = jt < JUMP_PREP ? 1 : Math.max(0, 1 - (jt - JUMP_PREP + 1) / 3);
  shape.sx += 0.15 * spring;
  shape.sy -= 0.21 * spring;
  // ── หมอบสไลด์ ──
  if (slide > 0.01) {
    shape.loaf = slide;
    for (const k of ['kickL', 'kickR', 'liftL', 'liftR', 'armSwingL', 'armSwingR', 'crouch']) shape[k] *= 1 - slide;
  }
  shape.turn = RUN_TURN;
  shape.gaze = 0.35;                                      // มองไปข้างหน้า
  shape.gazeY = air * (fall - 0.5) * 0.5;                 // ขาขึ้นมองบน ขาลงมองพื้น

  // ── ท่ากระโดดชั้นสองประจำตัว ──
  let spin = 0, twirl = 0, j2k = 0, tuckK = 0;
  if (A.j2) {
    const len = J2_LEN[A.j2];
    // แตะพื้นก่อนครบรอบ = เร่งให้จบใน ~5 เฟรม (ไม่หยุดค้างกลางรอบ)
    A.j2t += ground ? Math.max(dt, (len - A.j2t) / 5) : dt;
    const u = clamp01((A.j2t - JUMP_PREP) / (len - JUMP_PREP));   // ช่วงแรกเป็นท่าเตรียม (หดตัว) ยังไม่หมุน
    j2k = Math.sin(Math.PI * u);
    if (A.j2 === 'flip') {
      spin = TAU * (1 - (1 - u) * (1 - u));   // เริ่มหมุนเร็วทันทีหลังตัวหย่น (ไม่ค่อย ๆ เริ่ม = ไม่เห็นท่ายืนตรงตอนต้นรอบ) แล้วค่อยชะลอตอนครบรอบ
      // กอดเข่าม้วนตัวกลม: ขาพับสุด แขนหุบมาหน้า หลับตายิ้ม หางม้วนตาม
      const tuck = ease(clamp01(j2k * 1.6));
      tuckK = tuck;
      shape.liftL += (46 - shape.liftL) * tuck; shape.liftR += (46 - shape.liftR) * tuck;
      shape.kickL += (-0.55 - shape.kickL) * tuck; shape.kickR += (-0.35 - shape.kickR) * tuck;
      shape.armSwingL += (-0.5 - shape.armSwingL) * tuck; shape.armSwingR += (0.2 - shape.armSwingR) * tuck;
      shape.elbowL += (1.1 - shape.elbowL) * tuck; shape.elbowR += (-1.1 - shape.elbowR) * tuck;
      shape.crouch += 0.3 * tuck;
      shape.ear += (0.5 - shape.ear) * tuck;
      shape.wag += (1.2 - shape.wag) * tuck;
      if (tuck > 0.35) shape.mood = 'happy';
    } else {
      twirl = TAU * io(u);
      shape.turn = RUN_TURN - twirl;
      shape.armSwingL += (-1.1 - shape.armSwingL) * j2k; shape.armSwingR += (1.1 - shape.armSwingR) * j2k;
      shape.liftL += (30 - shape.liftL) * j2k; shape.liftR += (10 - shape.liftR) * j2k;
      if (j2k > 0.3) shape.mood = 'starry';
    }
    if (u >= 1) A.j2 = null;
  }
  // ── อารมณ์ / เจ็บ ──
  const hurt = info.hurt || 0;
  if (hurt > 0) {
    shape.lean -= 0.22 * hurt;
    shape.lean += Math.sin(hurt * 34) * hurt * 0.2;
    shape.ear += 0.6 * hurt;
  }
  // ── แรงใกล้หมด (ผู้ใช้ 18 ต.ค.): ตัวหดลง หูลู่ หางตก หัวก้ม หายใจหอบ ตาง่วงปิดครึ่งดวง ('sleepy') ──
  const tired = info.dead ? 0 : clamp01(info.tired || 0);
  if (tired > 0) {
    const puff = Math.sin(A.t * 0.19) * tired;            // หายใจหอบ: ตัวพองยุบช้า ๆ
    shape.sy -= 0.12 * tired + 0.025 * puff;
    shape.sx += 0.06 * tired + 0.015 * puff;
    shape.ear += 0.55 * tired;
    shape.wag = shape.wag * (1 - 0.6 * tired) - 0.5 * tired;
    shape.gazeY += 0.35 * tired;
    shape.tilt += 0.05 * tired;
  }
  if (!shape.mood) shape.mood = info.mood || (hurt > 0.2 ? 'hurt' : info.dead ? 'dizzy' : tired > 0.4 ? 'sleepy' : '');
  if (info.mouth) shape.mouth = 0.8;
  shape.noCrotchFill = 1;                                 // ขาสลับตลอดเวลา — ไม่เติมก้อนเป้าแบบท่าเตะขา
  // ── ตัว+ขาวิ่งสี่จังหวะตามแบบผู้ใช้ (RUN4 · เปลี่ยนท่าทีละจังหวะแบบสไปรต์คุกกี้รัน) ──
  //   บนพื้น: Up · Down · Up · Down ตามระยะวิ่ง (RUN4_STEP) · กลางอากาศ: ขาขึ้น = Up (ก้าวยาว) / ขาลง = Down (เท้าลงรอแตะพื้น)
  //   ลงพื้น = Down · ตีลังกา = Down (ตัวกลมเท้าใต้ตัว) · หมอบ/หมุนตัว (twirl) = ขาเดิมจากแบบ
  let bob4 = 0, beat = -1;
  if (slide < 0.5 && A.j2 !== 'twirl') {
    let body;
    if (A.j2 === 'flip') body = RUN4[1];
    else if ((A.jumpT ?? 99) < JUMP_PREP) body = RUN4[1];   // ท่าเตรียมกระโดด = Down ตัวหย่น (เท้าใต้ตัว)
    else if (air > 0.5) body = fall < 0.55 ? RUN4[0] : RUN4[1];
    else if (A.land < 4 || (P.squash || 0) > 0.05) {
      body = RUN4[1];   // ลงพื้น: ท่า Down (เท้าใต้ตัว) จนตัวหายแบน ค่อยกางขาวิ่งต่อ (ผู้ใช้: ยังไม่ต้องรีบอ้าขา)
      if (!info.dead) shape.mood = 'hurt';   // ตัวหดตอนลงพื้น = หลับตาปี๋ > < (ผู้ใช้ขอ)
    }
    else if (info.stand) body = RUN4[1];   // ยืนรอ (โบนัส: ปลามารับ / ร่อนลง / วางลงพื้น) — เท้าใต้ตัว ไม่ก้าวค้างกลางท่า
    else {
      beat = Math.floor((P.runPhase * (info.gait ?? 1)) / RUN4_STEP) % 4;
      body = RUN4[beat];
      bob4 = body.bob;
    }
    const b = body.shape;
    for (const k of ['runBody', 'earRun', 'tailBase', 'tailShort', 'armSwingL', 'armSwingR', 'turn', 'noCrotchFill']) shape[k] = b[k];
    shape.kickL = shape.kickR = shape.liftL = shape.liftR = shape.elbowL = shape.elbowR = 0;
    if (air <= 0.5) shape.wag = b.wag * (1 - 0.6 * tired) - 0.5 * tired;   // บนพื้น: หางตามภาพจังหวะ (เหนื่อย = หางตก) · กลางอากาศ: หางสะบัดตามแรง
  }
  // ── ลมปะทะตอนวิ่ง (ผ้าคลุมของชุดอ่าน capeWind / capeLift ผ่าน k.sv) ──
  //   บนพื้น = ลมเต็ม · หมอบ = ลมน้อย · เหนื่อย = วิ่งช้าลมอ่อน · ตีลังกา = ลมแรงสุด
  //   กลางอากาศ: พุ่งขึ้น = ผ้าห้อยลง (−) · ร่วงลง = ผ้าเชิดขึ้น (+) · ลงพื้น = ชายผ้าเด้งลง
  shape.capeWind = (0.85 + 0.15 * Math.sin(A.t * 0.11)) * (1 - 0.45 * slide) * (1 - 0.35 * tired) + 0.25 * j2k;
  shape.capeLift = air * (fall * 2 - 1) - 0.8 * landK;
  // ตกหลุม: หางคทาตามลงหลุมไปด้วย (ผู้ใช้ 18 ต.ค.) — หยุดเมื่อเกมนับว่าตายแล้ว (พ้นจอ) · ชุบชีวิต = เกมเริ่มตัวคุมท่าใหม่ (ล้างหางเก่า)
  return { shape, spin, twirl, j2: A.j2, j2k, air, land: landK, bob: bob4, beat, ...trailOut(A, P, info, !info.dead, bob4, spin) };
}

/** จุดหมุนตอนตีลังกา: กลางตัว (หน่วยเกมเหนือเท้า ต่อสเกล 1) — สูงจากเท้า ~228 หน่วยไฟล์ × 0.104 */
const SPIN_Y = 228 * 0.104;

/**
 * ประกายหลุดจากชุด (สกินระดับ S · ตาราง TRAIL ใน cat2.js): เดินเม็ดที่มีอยู่ + ปล่อยเม็ดใหม่จากจุดวิ้งบนชุด
 *   เม็ดค้างอยู่กับฉาก: x สัมพัทธ์กับตัว ลดลงตามความเร็วฉาก (ทางประกายตามหลัง) · y พิกัดเกมจริง (กระโดด = ทางประกายโค้งตามวง)
 *   ตีลังกา = ปล่อยถี่ขึ้น หมุนจุดเกิดตามตัว · หมดแรง/ตาย = หยุดปล่อย เม็ดเดิมร่วงจนหมด
 *   คืนสำเนาเม็ดของเฟรมนี้ (หน้าทดสอบเลื่อนหลอดเวลาย้อนได้) · null = ไม่มีประกาย
 */
/** ผลทางประกายของเฟรมนี้ + sink = ตัววาดส่งตำแหน่งจุดปล่อยจริง (หัวคทา ปลายผ้าคลุม) กลับมาใช้เฟรมถัดไป */
function trailOut(A, P, info, emit, bob = 0, spin = 0) {
  const o = stepTrail(A, P, info, emit, bob, spin);
  if (!o) return {};
  return { parts: o.parts, ribbon: o.ribbon, sink: (id, dx, dy) => { (A.emitPos ||= {})[id] = [dx, dy, A.t]; } };
}
const TRAIL_MAX = 190;
function stepTrail(A, P, info, emit, bob = 0, spin = 0) {
  const T = info.outfit ? cat2Trail(info.outfit) : null;
  if (!T && !A.parts?.length) return null;
  const dt = info.dt ?? 1, sp = info.speed ?? 0, sc = info.scale ?? 1, U = 0.104 * sc;
  const parts = (A.parts ||= []);
  for (const p of parts) {
    p.age += dt;
    p.vy = Math.min(1.4, p.vy + p.fall * dt);
    p.vx *= 0.96;
    p.x += (p.vx - sp + Math.sin(p.age * 0.14 + p.seed * 9) * p.sway) * dt;   // ค้างกับฉาก + ส่ายเบา ๆ
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
  A.parts = parts.filter((p) => p.age < p.life);
  // จุดเกิดในพิกัดเกม (สัมพัทธ์กับตัว / y จริง): ตำแหน่งจริงจากตัววาด (A.emitPos ของเฟรมก่อน) หรือพิกัดไฟล์ (หมุนตามตีลังกา)
  const fromFile = (fx, fy) => {
    let dx = (fx - 300) * U, dy = (fy - 648) * U - bob * sc;
    if (spin) {
      const py = dy + SPIN_Y * sc, cs = Math.cos(spin), sn = Math.sin(spin);
      [dx, dy] = [dx * cs - py * sn, dx * sn + py * cs - SPIN_Y * sc];
    }
    return [dx, P.y + dy];
  };
  const at = (e) => {
    if (e.at) {
      const q = A.emitPos?.[e.at];
      return q && A.t - q[2] < 4 ? [q[0], P.y + q[1]] : fromFile(...e.fb);
    }
    const [x0, y0, x1, y1] = e.box;
    return fromFile(x0 + Math.random() * (x1 - x0), y0 + Math.random() * (y1 - y0));
  };
  // หางแสงหัวคทา: จุดย้อนหลัง ~14 เฟรม เลื่อนตามฉาก
  let ribbon = null;
  if (T?.ribbon) {
    const R = (A.ribbon ||= []);
    for (const q of R) q[0] -= sp * dt;
    const wand = T.emit.find((e) => e.at === 'wand');
    if (emit && wand) {
      const p = at(wand);
      // หัวคทากระโดดไกลผิดปกติในเฟรมเดียว (ถูกย้ายที่ เช่นชุบชีวิต/กล้องถอย) = เริ่มหางใหม่ ไม่ลากเส้นเชื่อมข้ามจอ
      if (R[0] && Math.hypot(p[0] - R[0][0], p[1] - R[0][1]) > 60 * sc + sp * 2) R.length = 0;
      R.unshift(p);
    } else R.splice(-3);   // หยุดปล่อย = หางหดจากปลาย 3 จุดต่อเฟรม (~5 เฟรมหมด)
    if (R.length > 14) R.length = 14;
    ribbon = R.length > 1 ? { ...T.ribbon, pts: R.map((q) => [q[0], q[1]]) } : null;
  }
  if (T && emit) {
    const lite = gfxLevel() === 'save';
    const cap = lite ? 90 : TRAIL_MAX;
    const k = (lite ? 0.5 : 1) * (spin ? 1.7 : 1);
    A.trailAcc ||= T.emit.map(() => 0);
    T.emit.forEach((e, i) => {
      A.trailAcc[i] += e.rate * k * dt;
      while (A.trailAcc[i] >= 1) {
        A.trailAcc[i] -= 1;
        if (A.parts.length >= cap) continue;
        const [x, y] = at(e);
        let kind = e.kinds[Math.floor(Math.random() * e.kinds.length)];
        if (kind === 'sprinkle') kind = 'sprinkle' + Math.floor(Math.random() * 6);
        const glit = kind === 'glitB' || kind === 'glitP' || kind.startsWith('dust');
        const spr = e.spread ?? 1;
        A.parts.push({
          x: x + (Math.random() - 0.5) * 1.6 * sc * spr, y: y + (Math.random() - 0.5) * 1.6 * sc * spr,
          vx: (Math.random() - 0.5) * 0.35 * spr, vy: e.vy + (Math.random() - 0.5) * 0.3 * spr,   // แทบไม่กระจาย = เป็นเส้นสายจากจุดเกิด
          fall: e.fall, sway: glit ? 0.08 : 0.2,
          age: 0, life: 28 + Math.random() * 24, kind, seed: Math.random(),
          size: (e.sz ?? 1) * (glit ? 0.5 + Math.random() * 0.45 : kind.startsWith('star') ? 0.7 + Math.random() * 0.5 : kind.startsWith('sprinkle') ? 0.75 + Math.random() * 0.35 : 0.6 + Math.random() * 0.35) * 1.5,   // ผู้ใช้: เล็กไปกลืนพื้นหลัง → ×1.5
          rot: glit ? 0 : Math.random() * TAU, vr: (Math.random() - 0.5) * 0.12,
        });
      }
    });
  }
  // สำเนาเม็ดทุกเม็ดเฉพาะหน้าทดสอบที่เก็บผลทุกเฟรมไว้ลากหลอดเวลาย้อน (info.keep) — ในเกมใช้ของเฟรมนี้แล้วทิ้ง
  // ไม่ต้องสร้างวัตถุใหม่ ~190 ชิ้นต่อเฟรม (ขยะให้ตัวเก็บขยะกวาดหมื่นชิ้นต่อวินาที = เฟรมสะดุดเป็นพัก ๆ)
  return { parts: info.keep ? A.parts.map((p) => ({ ...p })) : A.parts, ribbon };
}

/**
 * วาดน้องท่าวิ่ง (ตัวน้องแบบใหม่หันเฉียงขวา + ขาวิ่งวาดใหม่) รวมการหมุนตีลังกา + รอยลม
 * x = กลางตัว feetY = เท้า (หน่วยเกม) · r = ผลจาก stepRunAnim · scale = สเกลแบบ drawCat2
 */
export function drawCat2Run(ctx, x, feetY, scale, s, t, r) {
  if (r.parts || r.ribbon) drawTrail(ctx, r.parts, x, scale, r.ribbon);   // ประกายหลุดจากชุด — อยู่หลังตัว
  const py = feetY - SPIN_Y * scale;
  // ตัววาดบอกตำแหน่งหัวคทา/ปลายผ้าคลุมจริง (พิกเซล) → แปลงกลับเป็นหน่วยเกมสัมพัทธ์กับตัว ส่งให้ stepTrail เฟรมถัดไป
  const inv = r.sink ? ctx.getTransform().inverse() : null;
  const onEmit = inv ? (id, pt) => { const q = inv.transformPoint(pt); r.sink(id, q.x - x, q.y - feetY); } : null;
  if (r.spin) drawFlipTrail(ctx, x, py, scale, r.spin, r.j2k);
  ctx.save();
  const fxM = r.spin ? ctx.getTransform() : null;   // เอฟเฟกต์ชุดไม่หมุนตามตอนตีลังกา (idle.fxM ใน drawCat2)
  if (r.spin) { ctx.translate(x, py); ctx.rotate(r.spin); ctx.translate(-x, -py); }
  drawCat2(ctx, x, feetY - (r.bob || 0) * scale, scale, s, t, { k: 1, shape: r.shape, fxM, onEmit });   // bob = ตัวลอยตอนจังหวะ Up
  ctx.restore();
}

/** รอยลมโค้งตามหลังตอนตีลังกา: แถบขาวโปร่งโค้งตามรอบหมุน 3 เส้น + ประกายปลายรอย */
function drawFlipTrail(ctx, x, y, scale, spin, k) {
  if (k <= 0.02) return;
  const R = 34 * scale;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const r = R * (0.78 + i * 0.16);
    const a1 = spin - Math.PI / 2 - 0.25 - i * 0.12, a0 = a1 - 1.6 * k;
    const g = ctx.createLinearGradient(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, `rgba(255,255,255,${(0.75 - i * 0.18) * k})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = (5 - i * 1.3) * scale;
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a1);
    ctx.stroke();
  }
  // ประกายสี่แฉกที่ปลายรอย
  const a = spin - Math.PI / 2 - 0.2, sx = x + Math.cos(a) * R * 1.12, sy = y + Math.sin(a) * R * 1.12, sz = 5 * scale * k;
  ctx.fillStyle = `rgba(255,246,190,${0.95 * k})`;
  ctx.beginPath();
  ctx.moveTo(sx, sy - sz); ctx.quadraticCurveTo(sx, sy, sx + sz, sy); ctx.quadraticCurveTo(sx, sy, sx, sy + sz);
  ctx.quadraticCurveTo(sx, sy, sx - sz, sy); ctx.quadraticCurveTo(sx, sy, sx, sy - sz);
  ctx.fill();
  ctx.restore();
}

// ══ วิ่งสี่จังหวะ (แบบผู้ใช้ 17 ต.ค.: Up · Down · Up · Down วนลูปแบบสไปรต์คุกกี้รัน) ══
// แต่ละจังหวะ = ท่าค้างหนึ่งท่า (ไม่ไล่ผสมระหว่างจังหวะ) · หน้านิ่ง (ไม่กะพริบ ไม่เปลี่ยนอารมณ์)
// ตอนนี้ยังใช้ขา/ตัวจากแบบ ดัดด้วย kick/lift — รอผู้ใช้ส่งแบบขาแต่ละจังหวะ แล้ววาดขา+ตัวใหม่ทีละจังหวะลงช่องเดียวกันนี้
//   bob = ยกทั้งตัว (หน่วยเกม · บวก = ขึ้น) · kick บวก = เท้าไปหลัง (ซ้ายจอ) · lift = ยกเท้า (หน่วยไฟล์)
const RUN4_BASE = { turn: RUN_TURN, gaze: 0.35, gazeY: 0, mood: '', mouth: 0, noCrotchFill: 1, lean: 0.06, earRun: 1 };   // earRun = ทรงหูแบบท่าวิ่ง
export const RUN4 = [
  // Up: ตัวลอย ขาหน้าก้าวยาวไปหน้า ขาหลังเหยียดถีบไปหลัง หางชี้ขึ้นหลัง
  // วาดตามแบบ (ตัว+ขาลากจากภาพ จัดสัดส่วนเทียบหัว) · หัวสูงเท่ากันทุกจังหวะแบบในแบบ — ตัวไม่ลอย ขาพับขึ้นเอง · แขนท่าพักของแบบกางออกข้างอยู่แล้ว
  { label: 'Up', bob: 5, shape: { ...RUN4_BASE, runBody: 'up', lean: 0, wag: 0, ear: 0.2, tilt: 0, armSwingL: 0.05, armSwingR: 0.12, tailBase: { x: 205, y: 535, a: Math.PI * 1.0, curl: 0.42 }, tailShort: 0.6 } },
  // Down: เท้าลงใต้ตัว เข่าหน้าพับมาหน้า (วาดตามแบบ) · เท้าแตะพื้นพอดี (bob 2) — ในแบบหัวสูงเท่ากันทุกภาพ เท้า Down ต่ำกว่า Up
  //   จังหวะ Up จึงลอยขึ้น (bob 5) = ตัวลอยตอนก้าวยาว แล้วยุบลงตอนเท้าแตะพื้น
  { label: 'Down', bob: 2, shape: { ...RUN4_BASE, runBody: 'down', lean: 0, wag: 0, ear: 0.05, tilt: 0, armSwingL: -0.06, armSwingR: 0.16, tailBase: { x: 210, y: 552, a: Math.PI * 1.03, curl: 0.12 }, tailShort: 0.7 } },
  // Up (จังหวะ 3 · ผู้ใช้: คล้ายจังหวะ 1 ต่างกันที่ขาหลังยกสูงขึ้นนิด) — ท่าตัว/แขน/หางเดียวกับจังหวะ 1
  { label: 'Up', bob: 5, shape: { ...RUN4_BASE, runBody: 'up2', lean: 0, wag: 0, ear: 0.2, tilt: 0, armSwingL: 0.05, armSwingR: 0.12, tailBase: { x: 205, y: 535, a: Math.PI * 1.0, curl: 0.42 }, tailShort: 0.6 } },
  // Down (จังหวะ 4 · สลับขา): เท้าหน้าลงแตะพื้น เท้าหลังยกไปหลัง เข่าหน้ากลม (วาดตามแบบ) — ตัว/แขน/หางเดียวกับจังหวะ 2
  { label: 'Down', bob: 2.2, shape: { ...RUN4_BASE, runBody: 'down2', lean: 0, wag: 0, ear: 0.05, tilt: 0, armSwingL: -0.06, armSwingR: 0.16, tailBase: { x: 212, y: 538, a: Math.PI * 0.99, curl: 0.16 }, tailShort: 0.68 } },
];
/** ท่าของจังหวะ i (วนลูป) · mix 0..1 = ผสมไปจังหวะถัดไป (ปุ่ม "นุ่ม" ในหน้าทดสอบ — ปกติ 0 แบบสไปรต์) */
export function run4At(i, mix = 0) {
  const a = RUN4[((i % 4) + 4) % 4], b = RUN4[(((i + 1) % 4) + 4) % 4];
  if (!mix) return { shape: a.shape, bob: a.bob, label: a.label };
  const shape = { ...a.shape };
  for (const k of Object.keys(a.shape)) if (typeof a.shape[k] === 'number') shape[k] = a.shape[k] + ((b.shape[k] ?? 0) - a.shape[k]) * mix;
  return { shape, bob: a.bob + (b.bob - a.bob) * mix, label: a.label };
}
