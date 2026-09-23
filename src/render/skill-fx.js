// src/render/skill-fx.js
// ─────────────────────────────────────────────────────────────
// ภาพประกอบของสกิล — อ่านสถานะจาก game อย่างเดียว ไม่เปลี่ยนค่าอะไรเลย
//
// ท่าของตัวน้องไม่ได้อยู่ที่นี่ (อยู่ใน drawPlayer / drawCatStand ซึ่งบิดท่าวิ่งเดิม)
// ไฟล์นี้วาดเฉพาะ "ของรอบตัว" ที่ไม่ขึ้นกับสกินหรือชุด จึงใช้ได้กับน้องทุกตัวเหมือนกัน
//
//   back  หลังตัวน้อง — ฮีโร่: หางแสงพุ่ง (ผ้าคลุมพลังงาน) + เส้นความเร็ว
//                       บิน:   ปีกผีเสื้อสองคู่กระพือ
//                       ทอง:   รัศมีทองรอบตัว + ประกายดาววนรอบ
//                       คริสตัล: วงแหวนคลื่นเสียงขยายออกไปข้างหน้า
//                       บอลหิมะ: ลูกบอลกลิ้งใต้เท้า (ตัวน้องถูกยกขึ้นไปยืนบนลูกด้วย skillLift)
//   world  ทับฉาก ใต้ตัวน้อง — สีฉากของช่วงสกิล (tune.screen) ตัวน้องจึงยังสดอยู่บนสุด
//   screen ทับทั้งจอ ใต้ HUD — ขอบจอเรือง/ของลอย บอกว่า "ตอนนี้อยู่ในช่วงสกิล"
//
// ── ทำไมหางแสง ไม่ใช่ผ้าคลุมจริง ──
// มีชุดหลายชุดที่มีผ้าคลุมของตัวเองอยู่แล้ว (hook back ใน outfits.js)
// ถ้าสกิลเสกผ้าคลุมผ้าอีกผืน ชุดพวกนั้นจะได้ผ้าคลุมสองผืนซ้อนกัน
// หางแสงโปร่ง ๆ อ่านเป็น "พลังพุ่ง" ได้เหมือนกันและไม่ทับกับชุดไหนเลย
//
// ── งบประมาณความหนัก ──
// รูปทรงง่าย ๆ ล้วน (เส้น / ทรงหยดน้ำ) ไม่มี filter หรือ shadowBlur
// เส้นความเร็วเป็นชุดคงที่ 8 เส้น คำนวณตำแหน่งจาก tick ไม่มีการสร้างอ็อบเจกต์ใหม่
// ─────────────────────────────────────────────────────────────

import { VIEW, SKILL } from '../config.js';

const HERO = {
  glow: 'rgba(255,214,110,',   // ทองอุ่น — ไม่ซ้ำกับเขียวของหญ้าแมว ผู้เล่นแยกออกว่าเป็นคนละอย่าง
  core: 'rgba(255,246,214,',
  line: 'rgba(255,236,170,',
};

/** กลางตัวที่ตาเห็น (สูตรเดียวกับ anchor ใน talent-fx.js / catAnchor ใน treasure-run.js) */
function anchor(game) {
  const b = game.player.box;
  const half = b.h / 2;
  const s = game.catScale;
  return { x: b.x + b.w / 2, y: b.y + half + half * (1 - s), s };
}

// ══ ชั้นหลังตัว ═════════════════════════════════════════════

export function drawSkillBack(ctx, game) {
  if (game.skill <= 0 || game.bonus > 0) return;
  const pose = game.skillDef.tune.pose;
  if (pose === 'hero') drawHeroTrail(ctx, game);
  else if (pose === 'fly') drawWings(ctx, game);
  else if (pose === 'gold') drawGoldAura(ctx, game);
  else if (pose === 'shout') drawPulse(ctx, game);
  else if (pose === 'ball') drawSnowball(ctx, game);
}

/** ค่อย ๆ โผล่ 12 เฟรมแรก จางออก 20 เฟรมสุดท้ายของช่วงออกฤทธิ์ — ใช้ร่วมทุกสกิล */
function fadeK(game) {
  const inK = Math.min(1, (game.skillDef.tune.active - game.skill) / 12);
  const outK = Math.min(1, game.skill / 20);
  return inK * outK;
}

// ── ปีกผีเสื้อ ──
// น้องหันหน้าเข้าหากล้อง ปีกจึงกางซ้าย-ขวาสมมาตรหลังลำตัว (เหมือนมองผีเสื้อจากด้านหน้า)
// วาดชั้นหลังตัว ตัวและชุดทับโคนปีกเอง ไม่ทับหน้าหรือชุดไหนเลย
// กระพือด้วยการบีบความกว้าง (scaleX) — ปีกที่พับเข้าหาลำตัวจะแคบลง
// ปีกบนใหญ่ ปีกล่างเล็ก ขยับเหลื่อมจังหวะกันนิดหนึ่งให้ดูเป็นของมีชีวิต
const WING = {
  top: ['rgba(255,170,218,', 'rgba(186,150,255,'],   // ชมพู → ม่วงอ่อน
  low: ['rgba(150,230,255,', 'rgba(255,208,238,'],   // ฟ้า → ชมพูนม
  edge: 'rgba(120,70,150,',
  dot: 'rgba(255,255,255,',
};

/** ปีกหนึ่งแผ่น ยื่นไปทาง -x จากโคน (0,0) — dir = -1 ปีกบน (ยกขึ้น) / 1 ปีกล่าง (ห้อยลง) */
function wing(ctx, len, spread, dir, cols, k) {
  const g = ctx.createLinearGradient(0, 0, -len, dir * spread);
  g.addColorStop(0, cols[0] + 0.95 * k + ')');
  g.addColorStop(1, cols[1] + 0.92 * k + ')');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-len * 0.25, dir * spread * 1.2, -len * 1.1, dir * spread * 1.05, -len, dir * spread * 0.35);
  ctx.bezierCurveTo(-len * 0.95, -dir * spread * 0.1, -len * 0.45, -dir * spread * 0.12, 0, 0);
  ctx.fill();
  ctx.strokeStyle = WING.edge + 0.5 * k + ')';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // จุดลายปีก — จุดขาวจาง ๆ พอให้อ่านเป็นปีกผีเสื้อ ไม่ใช่ใบไม้
  ctx.fillStyle = WING.dot + 0.75 * k + ')';
  ctx.beginPath(); ctx.arc(-len * 0.66, dir * spread * 0.62, spread * 0.17, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-len * 0.4, dir * spread * 0.36, spread * 0.1, 0, Math.PI * 2); ctx.fill();
}

function drawWings(ctx, game) {
  const k = fadeK(game);
  if (k <= 0.01) return;
  const a = anchor(game);
  const t = game.tick;
  const flap = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.3));
  const flap2 = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.3 - 0.45));
  ctx.save();
  ctx.translate(a.x, a.y - 4 * a.s);
  ctx.scale(a.s, a.s);
  for (const side of [-1, 1]) {
    // side = -1 ปีกซ้ายของจอ / 1 ปีกขวา (สะท้อนแกน x) — โคนเยื้องจากกลางตัวนิดหนึ่ง
    ctx.save(); ctx.scale(-side * flap, 1); ctx.translate(-4, -2); wing(ctx, 46, 38, -1, WING.top, k); ctx.restore();
    ctx.save(); ctx.scale(-side * flap2, 1); ctx.translate(-4, 4); wing(ctx, 38, 30, 1, WING.low, k); ctx.restore();
  }
  ctx.restore();
}

// ── อุ้งเท้าทองคำ ──
// รัศมีทองจาง ๆ รอบตัว + ดาวสี่แฉก 5 ดวงวนรอบ — 'lighter' ให้ทองเรืองจริงบนฉากมืดอย่างหาดยามเย็น
function star4(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function drawGoldAura(ctx, game) {
  const k = fadeK(game);
  if (k <= 0.01) return;
  const a = anchor(game);
  const t = game.tick;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = 52 * a.s * (1 + Math.sin(t * 0.12) * 0.05);
  const g = ctx.createRadialGradient(a.x, a.y, R * 0.2, a.x, a.y, R);
  g.addColorStop(0, HERO.glow + 0.32 * k + ')');
  g.addColorStop(1, HERO.glow + '0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(a.x, a.y, R, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = HERO.core + 0.9 * k + ')';
  for (let i = 0; i < 5; i++) {
    const ang = t * 0.045 + i * (Math.PI * 2 / 5);
    const tw = 0.5 + 0.5 * Math.sin(t * 0.2 + i * 1.7);
    star4(ctx, a.x + Math.cos(ang) * 40 * a.s, a.y + Math.sin(ang) * 30 * a.s, (2 + tw * 3.2) * a.s);
  }
  ctx.restore();
}

/**
 * หางแสงของท่าพุ่ง — ทรงหยดน้ำยาวลากออกจากหลังตัวไปทางซ้าย กับเส้นความเร็ววิ่งผ่าน
 *
 * ค่อย ๆ โผล่ตอนเริ่มฤทธิ์และจางตอนใกล้หมด (ไม่โผล่/หายวับ) ช่วงกะพริบท้ายไม่มีหางแล้ว
 * เพราะตอนนั้นโลกกลับมาเร็วปกติ ถ้ายังมีหางจะอ่านผิดว่ายังพุ่งอยู่
 */
function drawHeroTrail(ctx, game) {
  const a = anchor(game);
  const t = game.tick;
  const total = game.skillDef.tune.active;
  const inK = Math.min(1, (total - game.skill) / 12);   // เข้าใน 12 เฟรมแรก
  const outK = Math.min(1, game.skill / 20);             // ออกใน 20 เฟรมสุดท้าย
  const k = inK * outK;
  if (k <= 0.01) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // ── หางแสงสามชั้น ── ยาวขึ้นลงตามจังหวะเล็กน้อยให้ดูมีชีวิต ไม่ใช่แผ่นแปะนิ่ง ๆ
  const cy = a.y - 2 * a.s;
  for (let i = 0; i < 3; i++) {
    const len = (110 - i * 26 + Math.sin(t * 0.3 + i) * 8) * a.s;
    const half = (19 - i * 5) * a.s;
    ctx.fillStyle = (i === 2 ? HERO.core : HERO.glow) + (0.22 + i * 0.12) * k + ')';
    ctx.beginPath();
    ctx.moveTo(a.x + 8 * a.s, cy - half);
    ctx.quadraticCurveTo(a.x - len * 0.55, cy - half * 1.1 + Math.sin(t * 0.25) * 3, a.x - len, cy);
    ctx.quadraticCurveTo(a.x - len * 0.55, cy + half * 1.1 - Math.sin(t * 0.25) * 3, a.x + 8 * a.s, cy + half);
    ctx.closePath();
    ctx.fill();
  }

  // ── เส้นความเร็ว ── 8 เส้นวนซ้ำ ตำแหน่งมาจาก tick ล้วน
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const p = ((t * 0.09 + i * 0.125) % 1 + 1) % 1;    // 0 → 1 วิ่งจากหน้าตัวไปหลังตัว
    const y = a.y + (((i * 37) % 70) - 35) * a.s;
    const x = a.x + 70 * a.s - p * 240 * a.s;
    const len = (26 + (i % 3) * 14) * a.s;
    ctx.strokeStyle = HERO.line + 0.55 * k * Math.sin(Math.PI * p) + ')';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len, y);
    ctx.stroke();
  }
  ctx.restore();
}

// ── เสียงเหมียวคริสตัล ──
// วงแหวนสองชั้นขยายตาม game.pulseR (ตัวเดียวกับที่ใช้ทุบของ) ภาพกับผลจึงไปถึงของพร้อมกัน
// จางลงตามระยะ — ใกล้ตัวเข้ม ปลายทางเกือบหาย อ่านเป็นเสียงที่ค่อย ๆ แผ่ออกไป
const PULSE = { a: 'rgba(200,160,255,', b: 'rgba(150,235,255,' };

function drawPulse(ctx, game) {
  if (game.pulseR < 0) return;
  const pu = game.skillDef.tune.pulse;
  const a = anchor(game);
  const f = 1 - game.pulseR / pu.reach;
  if (f <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const r = Math.max(4, game.pulseR - i * 26);
    ctx.strokeStyle = (i ? PULSE.b : PULSE.a) + 0.75 * f + ')';
    ctx.lineWidth = (7 - i * 3) * f + 1.5;
    // ครึ่งวงด้านหน้า (−70° ถึง +70°) — คลื่นวิ่งไปข้างหน้า ไม่ได้ย้อนกลับมาทางที่ผ่านแล้ว
    ctx.beginPath();
    ctx.ellipse(a.x, a.y, r, r * 0.8, 0, -1.22, 1.22);
    ctx.stroke();
  }
  ctx.restore();
}

// ── แมวกลิ้งบอลหิมะ ──
// ลูกบอลนั่งบนพื้นตรงเท้าจริง (player.y) แล้วยกภาพตัวน้องขึ้นไปยืนบนยอดลูก
// กล่องชนไม่ได้ย้ายเลย — สกิลนี้อมตะอยู่แล้ว ระยะเก็บของก็ขยายตามขนาดลูก (game.skillGrab)
// ลายบนลูกหมุนตามระยะทางที่วิ่ง (distance / รัศมี) = กลิ้งจริง ไม่ใช่ลื่นไถล

/** ขนาดลูกบอลตอนนี้ (px ก่อนคูณขนาดตัว) — โตตามเวลาเหมือน skillGrab */
function ballR(game) {
  const p = 1 - game.skill / game.skillDef.tune.active;
  return 21 + 15 * p;
}

/** ยกภาพตัวน้องขึ้นกี่ px — ใช้ fadeK ให้ขึ้น/ลงจากลูกนุ่ม ๆ ไม่วาร์ป */
export function skillLift(game) {
  if (game.skill <= 0 || game.bonus > 0 || game.skillDef.tune.pose !== 'ball') return 0;
  return (ballR(game) * 2 - 6) * game.catScale * fadeK(game);
}

function drawSnowball(ctx, game) {
  const k = fadeK(game);
  if (k <= 0.01) return;
  const s = game.catScale;
  const R = ballR(game) * s * (0.4 + 0.6 * k);
  const b = game.player.box;
  const x = b.x + b.w / 2;
  const y = game.player.y - R;
  const rot = game.distance / Math.max(8, R);

  ctx.save();
  ctx.globalAlpha *= Math.min(1, k * 1.4);
  // เงาใต้ลูก
  ctx.fillStyle = 'rgba(40,60,90,.22)';
  ctx.beginPath(); ctx.ellipse(x, game.player.y + 1, R * 0.9, R * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  // ตัวลูก — ขาวอมฟ้า แสงจากซ้ายบน
  const g = ctx.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.15, x, y, R);
  // ขอบไล่เป็นฟ้าเข้ม — ด่านทุ่งหิมะพื้นขาวทั้งจอ ลูกขาวล้วนจะกลืนหายไปกับพื้น
  g.addColorStop(0, '#FFFFFF');
  g.addColorStop(0.55, '#E2F0FF');
  g.addColorStop(1, '#8FB6DC');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(70,110,160,.9)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // ลายก้อนหิมะหมุนตามการกลิ้ง — วาดในวงกลมเท่านั้น (clip) ลายจะไม่ล้นขอบลูก
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, R - 1, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = 'rgba(120,160,205,.5)';
  for (let i = 0; i < 5; i++) {
    const ang = rot + i * 1.26;
    const d = R * (0.35 + (i % 3) * 0.18);
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(ang) * d, y + Math.sin(ang) * d, R * 0.16, R * 0.11, ang, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // ผงหิมะฟุ้งท้ายลูก
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  for (let i = 0; i < 4; i++) {
    const p = ((game.tick * 0.05 + i * 0.25) % 1);
    ctx.globalAlpha = (1 - p) * 0.8 * k;
    ctx.beginPath();
    ctx.arc(x - R * 0.8 - p * 30, game.player.y - 3 - p * 12 - (i % 2) * 5, 2.2 + (1 - p) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ══ สีฉากช่วงสกิล (tune.screen) ═════════════════════════════════
//
// บอกผู้เล่นว่า "เข้าช่วงสกิลแล้ว" ด้วยทั้งจอ ไม่ใช่แค่ตัวน้อง — ตาอยู่ที่สิ่งกีดขวางข้างหน้า
// ไม่ได้มองตัวเองตลอด สีทั้งฉากเปลี่ยนจึงรู้ตัวทันทีแม้ไม่ได้มองหลอดบนหัว
//
// ค่อย ๆ เข้า 20 เฟรม และค่อย ๆ จางออกตลอดช่วงกะพริบท้าย (2 วิ)
// สีที่จางลงเรื่อย ๆ คือสัญญาณ "ใกล้หมดแล้ว" ตัวที่สองคู่กับตัวน้องที่กะพริบ
//
// ทุกสกิลใช้โครงเดียวกันสี่ชั้น ต่างกันแค่ข้อมูลใน SCREENS (สี + รูปของที่ลอย + ทิศที่ลอย)
//   wash   ฟิล์มสีบาง ๆ ทับฉาก เข้มขึ้นนิดตรงบีต
//   beams  ลำแสงส่ายจากด้านบน ('lighter' — ฉากมืดได้ลำแสงจริง ไม่ใช่ฟิล์มเทา)
//   vig    ขอบจอเรืองเต้นตามบีต กลางจอใสไว้ไม่บังทาง
//   float  ของลอยชิดขอบซ้าย/ขวา ไม่ผ่านกลางจอที่ผู้เล่นต้องดูทาง
// สกิลใหม่ใส่ screen: '<ชื่อ>' ใน tune แล้วเพิ่มแถวใน SCREENS ที่เดียว

const W = VIEW.W, H = VIEW.H;
// ความเข้มรวมของทุกชั้น (สีฉาก ลำแสง ขอบจอ ของลอย) — ปรับที่นี่ที่เดียวได้ทุกสกิลพร้อมกัน
// เดิม 1 เล่นนาน ๆ แล้วเข้มเกินจนรบกวนสายตา ลดเหลือ 0.55 ยังรู้ว่าเข้าช่วงสกิล แต่ไม่กลบฉาก
const SCREEN_STRENGTH = 0.55;
// จังหวะเพลงสกิล (BPM 128 เท่าทุกเพลงใน music.js) เป็นเฟรมที่ 60fps
const BEAT_FRAMES = 3600 / 128;

/**
 * สีประจำสกิล — [r,g,b] ทุกช่อง ความเข้มคุมที่ตัววาด ไม่ใช่ที่นี่
 * dir ของ float: 'up' ลอยขึ้น / 'down' ร่วงลง / 'left' พุ่งผ่านจอ (ความเร็ว)
 */
const SCREENS = {
  // 💃 เต้น — ปาร์ตี้แดงอมชมพู หัวใจลอยขึ้น
  party: {
    wash: [255, 60, 100], washA: 0.1,
    beams: [[255, 90, 140], [255, 200, 90], [255, 110, 200]],
    vig: [255, 40, 90],
    float: { shape: 'heart', cols: ['#FF6F9A', '#FF6F9A', '#FFD27A'], dir: 'up' },
  },
  // 🦸 ฮีโร่ — ส้มทองร้อนแรง ดาวพุ่งผ่านจอไปข้างหลังเร็ว ๆ = ความเร็ว
  hero: {
    wash: [255, 140, 40], washA: 0.1,
    beams: [[255, 190, 70], [255, 120, 50], [255, 225, 120]],
    vig: [255, 110, 20],
    float: { shape: 'star', cols: ['#FFE38A', '#FFB347', '#FFFFFF'], dir: 'left' },
  },
  // 🦋 บิน — ฟ้าพาสเทลอมม่วง กลีบดอกไม้ปลิวขึ้นช้า ๆ
  sky: {
    wash: [120, 190, 255], washA: 0.1,
    beams: [[170, 220, 255], [220, 180, 255], [255, 200, 235]],
    vig: [140, 150, 255],
    float: { shape: 'petal', cols: ['#FFC2E2', '#C9B6FF', '#A8E6FF'], dir: 'up' },
  },
  // ✨ ทอง — ทองแสงแดดยามเย็น เหรียญลอยขึ้น
  gold: {
    wash: [255, 200, 60], washA: 0.11,
    beams: [[255, 225, 110], [255, 190, 60], [255, 240, 170]],
    vig: [230, 160, 20],
    float: { shape: 'coin', cols: ['#FFD54A', '#FFE98A', '#F5B82E'], dir: 'up' },
  },
  // 💎 คริสตัล — ม่วงเข้มระยิบ ผลึกเพชรกะพริบลอยขึ้น
  crystal: {
    wash: [150, 80, 255], washA: 0.11,
    beams: [[180, 120, 255], [120, 230, 255], [230, 150, 255]],
    vig: [110, 50, 220],
    float: { shape: 'gem', cols: ['#D7B8FF', '#9FF0FF', '#FFFFFF'], dir: 'up' },
  },
  // ☃️ บอลหิมะ — ฟ้าน้ำแข็ง เกล็ดหิมะร่วงลงมา
  snow: {
    wash: [150, 210, 255], washA: 0.12,
    beams: [[200, 235, 255], [160, 210, 255], [230, 245, 255]],
    vig: [90, 160, 230],
    float: { shape: 'flake', cols: ['#FFFFFF', '#DDF1FF', '#BFE3FF'], dir: 'down' },
  },
};

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function screenK(game) {
  if (game.bonus > 0) return 0;
  if (game.skill > 0) return Math.min(1, (game.skillDef.tune.active - game.skill) / 20) * SCREEN_STRENGTH;
  if (game.skillBlink > 0) return game.skillBlink / SKILL.blinkFrames * SCREEN_STRENGTH;
  return 0;
}

/** 1 ตรงบีต แล้วจางลงเร็ว ๆ ก่อนบีตถัดไป — นับจากตอนสกิลติด (ตอนเดียวกับที่เพลงสกิลเริ่ม) */
function beatPulse(game) {
  const active = game.skillDef.tune.active;
  const f = game.skill > 0 ? active - game.skill : active + SKILL.blinkFrames - game.skillBlink;
  const ph = (f / BEAT_FRAMES) % 1;
  return (1 - ph) ** 3;
}

function themeOf(game) {
  return SCREENS[game.skillDef.tune.screen] || null;
}

/** ชั้นทับฉาก — เรียกหลังวาดของในด่าน ก่อนตัวน้อง */
export function drawSkillWorld(ctx, game) {
  const th = themeOf(game);
  const k = th ? screenK(game) : 0;
  if (k <= 0.01) return;
  const t = game.tick;
  const beat = beatPulse(game);
  ctx.save();
  ctx.fillStyle = rgba(th.wash, (th.washA + beat * 0.04) * k);
  ctx.fillRect(-20, -20, W + 40, H + 40);

  ctx.globalCompositeOperation = 'lighter';
  const BEAM_X = [0.18, 0.5, 0.82];
  const BEAM_SP = [0.021, -0.017, 0.019];
  for (let i = 0; i < th.beams.length; i++) {
    const ang = Math.sin(t * BEAM_SP[i] + i * 1.6) * 0.45;
    const len = H * 1.1;
    const half = 95;
    const g = ctx.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, rgba(th.beams[i], 0.2 * k));
    g.addColorStop(1, rgba(th.beams[i], 0));
    ctx.save();
    ctx.translate(W * BEAM_X[i], -10);
    ctx.rotate(ang);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.lineTo(half, len);
    ctx.lineTo(-half, len);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** ชั้นทับจอ — เรียกหลัง postProcess ก่อน HUD */
export function drawSkillScreen(ctx, game) {
  const th = themeOf(game);
  const k = th ? screenK(game) : 0;
  if (k <= 0.01) return;
  const t = game.tick;
  const beat = beatPulse(game);
  ctx.save();
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, W * 0.62);
  g.addColorStop(0, rgba(th.vig, 0));
  g.addColorStop(1, rgba(th.vig, (0.26 + beat * 0.16) * k));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // ตำแหน่งของที่ลอยคำนวณจาก tick ล้วน ไม่มีอ็อบเจกต์ให้เก็บหรือล้าง
  const fl = th.float;
  const n = fl.dir === 'left' ? 10 : 8;
  for (let i = 0; i < n; i++) {
    const seed = i / n;
    let x, y, p;
    if (fl.dir === 'left') {
      // พุ่งผ่านเร็ว เฉพาะแถบบน/ล่างของจอ — แถบกลางคือทางวิ่ง
      p = ((t * 0.02 + seed) % 1 + 1) % 1;
      x = W + 30 - p * (W + 60);
      y = i % 2 ? 30 + ((i * 37) % 70) : H - 30 - ((i * 29) % 60);
    } else {
      p = ((t * (fl.dir === 'down' ? 0.005 : 0.006) + seed) % 1 + 1) % 1;
      const side = i % 2 ? 1 : -1;
      x = W / 2 + side * (W * 0.36 + ((i * 53) % 90)) + Math.sin(t * 0.05 + i) * 10;
      y = fl.dir === 'down' ? -20 + p * (H + 40) : H + 20 - p * (H + 40);
    }
    ctx.globalAlpha = Math.sin(Math.PI * p) * 0.75 * k;
    ctx.fillStyle = ctx.strokeStyle = fl.cols[i % fl.cols.length];
    const r = 6 + (i % 3) * 2.5 + beat * 1.5;
    FLOATERS[fl.shape](ctx, x, y, r, t + i * 17);
  }
  ctx.restore();
}

// ── รูปของที่ลอย ── ทุกตัวรับ (ctx, x, y, r, t) และใช้ fillStyle/strokeStyle ที่ตั้งไว้แล้ว
const FLOATERS = {
  heart(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.3, y, x - r * 0.7, y - r * 1.1, x, y - r * 0.35);
    ctx.bezierCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.3, y, x, y + r * 0.9);
    ctx.fill();
  },
  star(ctx, x, y, r) {
    // ดาวสี่แฉก + หางสั้นลากไปทางขวา (ทิศที่มันพุ่งมา)
    star4(ctx, x, y, r * 1.1);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + r * 0.8, y); ctx.lineTo(x + r * 4, y); ctx.stroke();
  },
  petal(ctx, x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 0.04) * 0.9);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
  coin(ctx, x, y, r, t) {
    const flip = Math.max(0.15, Math.abs(Math.cos(t * 0.06)));
    ctx.beginPath(); ctx.ellipse(x, y, r * flip, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(160,100,10,.8)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  },
  gem(ctx, x, y, r, t) {
    // เพชรหกเหลี่ยมยาว + ประกายกะพริบข้าง ๆ
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.2);
    ctx.lineTo(x + r * 0.7, y - r * 0.2);
    ctx.lineTo(x, y + r * 1.2);
    ctx.lineTo(x - r * 0.7, y - r * 0.2);
    ctx.closePath();
    ctx.fill();
    const tw = 0.5 + 0.5 * Math.sin(t * 0.2);
    ctx.fillStyle = '#FFFFFF';
    star4(ctx, x + r * 0.9, y - r * 0.9, 1.5 + tw * 2.5);
  },
  flake(ctx, x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.02);
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let a = 0; a < 3; a++) {
      const c = Math.cos(a * Math.PI / 3) * r, s = Math.sin(a * Math.PI / 3) * r;
      ctx.moveTo(-c, -s); ctx.lineTo(c, s);
    }
    ctx.stroke();
    ctx.restore();
  },
};
