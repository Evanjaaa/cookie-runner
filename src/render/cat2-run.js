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

import { drawCat2 } from './cat2.js';

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (u) => u * u * (3 - 2 * u);
const io = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

/** หันเฉียงขวา (มุมเดียวกับปุ่ม "ขวา" ในหน้าทดลอง) */
export const RUN_TURN = -0.75;
/** จังหวะขา: เฟรมต่อหนึ่งรอบก้าว (ซ้าย+ขวา) ที่ความเร็ววิ่งปกติ — น้องตัวกลมขาสั้น ก้าวถี่พอดี ๆ ไม่รัวแบบตัวเดิม */
const STRIDE = 0.88;   // เรเดียนของรอบก้าวต่อหน่วย runPhase ของ Player (runPhase เดิน 0.408/เฟรม → ~17.5 เฟรม/รอบ)

/**
 * ท่ากระโดดชั้นสองประจำตัว (id แมว → ชนิด) · ไม่มีในรายการ = 'twirl'
 *   flip  = ตีลังกาม้วนตัวไปข้างหน้าหนึ่งรอบ (กอดเข่า หลับตายิ้ม) มีรอยลมโค้งตามหลัง
 *   twirl = หมุนตัวรอบแกนตั้งหนึ่งรอบ (ตัวตรง แขนกาง) มีประกายวนรอบตัว
 */
export const JUMP2 = { orange: 'flip' };
const J2_LEN = { flip: 24, twirl: 26 };

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
 * info = { catId, dt, mood, hurt (0..1), dead, gait (ตัวคูณจังหวะขา) }
 */
export function stepRunAnim(A, P, info = {}) {
  const dt = info.dt ?? 1;
  A.t += dt;
  const ground = !!P.onGround;
  // ── เหตุการณ์ ──
  if (ground && !A.prevGround) A.land = 0; else A.land += dt;
  if (!ground && P.jumps >= 2 && P.jumps > A.prevJumps && A.prevJumps >= 1) {
    A.j2 = JUMP2[info.catId] || 'twirl';
    A.j2t = 0;
  }
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
  target.sy += 0.1 * kick0; target.sx -= 0.05 * kick0;
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
  const sq = info.dead ? 0 : P.squash || 0;
  shape.sx += sq * 0.22;
  shape.sy -= sq * 0.26;
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
    const u = clamp01(A.j2t / len);
    j2k = Math.sin(Math.PI * u);
    if (A.j2 === 'flip') {
      spin = TAU * io(u);
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
  if (!shape.mood) shape.mood = info.mood || (hurt > 0.2 ? 'hurt' : info.dead ? 'dizzy' : '');
  if (info.mouth) shape.mouth = 0.8;
  shape.noCrotchFill = 1;                                 // ขาสลับตลอดเวลา — ไม่เติมก้อนเป้าแบบท่าเตะขา
  return { shape, spin, twirl, j2: A.j2, j2k, air, land: landK };
}

/** จุดหมุนตอนตีลังกา: กลางตัว (หน่วยเกมเหนือเท้า ต่อสเกล 1) — สูงจากเท้า ~228 หน่วยไฟล์ × 0.104 */
const SPIN_Y = 228 * 0.104;

/**
 * วาดน้องท่าวิ่ง (ตัวน้องแบบใหม่หันเฉียงขวา + ขาวิ่งวาดใหม่) รวมการหมุนตีลังกา + รอยลม
 * x = กลางตัว feetY = เท้า (หน่วยเกม) · r = ผลจาก stepRunAnim · scale = สเกลแบบ drawCat2
 */
export function drawCat2Run(ctx, x, feetY, scale, s, t, r) {
  const py = feetY - SPIN_Y * scale;
  if (r.spin) drawFlipTrail(ctx, x, py, scale, r.spin, r.j2k);
  ctx.save();
  if (r.spin) { ctx.translate(x, py); ctx.rotate(r.spin); ctx.translate(-x, -py); }
  drawCat2(ctx, x, feetY, scale, s, t, { k: 1, shape: r.shape });
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
