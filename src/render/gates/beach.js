// src/render/gates/beach.js
// ─────────────────────────────────────────────────────────────
// ภาพทางเข้า "ชายหาดยามเย็น" — ซุ้มไม้ริมทะเล → ทางเดินไม้ → ทะเลเปิดกว้าง → พระอาทิตย์ใกล้ตก
//
// ── ต่างจากสามทางเข้าก่อนหน้ายังไง ──
// ครัว/สวน/ถ้ำ เป็น "ที่ปิด" — ผนังของมันเองบังจอไว้ตอนสลับฉาก
// ทางเข้านี้เป็น "ที่โล่ง" ตามแบบที่ขอ: ซุ้มไม้เปิดสองข้าง ไม่มีประตู ไม่มีผนัง
// วิธีที่ยังสลับฉากแบบมองไม่เห็นได้คือ ข้างในวาด "โลกของตัวเอง" เต็มจอ
// (ฟ้าเย็น ทะเล ชายหาด ทางเดินไม้) ทับฉากเดิมทั้งผืน ผู้เล่นจึงเห็นแต่ทะเลโล่ง
// ทั้งที่จริง ๆ แล้วจอถูกปิดสนิทอยู่ — ตรงตามเงื่อนไขช่วงปิดจอของ gates.js ทุกประการ
//
// ── ลำดับที่ผู้เล่นเห็น ──
//   ก่อนถึง   ทางเดินไม้เริ่มปูบนพื้นของฉากเดิม เห็นซุ้มไม้ใหญ่กับต้นมะพร้าวอยู่ข้างหน้า
//   ลอดซุ้ม   ภาพเปลี่ยนเป็นโลกริมทะเล: ฟ้าเย็น ทะเลไกล ทางเดินไม้ทอดยาว
//   กลางทาง   แสงอุ่นขึ้นเรื่อย ๆ ทะเลกว้างขึ้น เริ่มเห็นดวงอาทิตย์โผล่พ้นขอบฟ้า
//   ช่วงท้าย   ฟ้าเป็นสีพระอาทิตย์ตกเต็มที่ ดวงอาทิตย์ใหญ่ + แสงสะท้อนบนคลื่น = จุด WOW
//   ออกซุ้ม   ต่อเข้าฉากชายหาดจริงของเกม (จานสีตรงกันพอดี ไม่มีรอยต่อ)
//
// ── ประสิทธิภาพ ──
// ฟ้า/ดวงอาทิตย์/เมฆ/ต้นมะพร้าว/เปลือกหอย เป็นสไปรต์แคชทั้งหมด
// ทางเดินไม้เป็นชั้นแคชวาดครั้งเดียว แล้วแปะเฉพาะส่วนที่อยู่ในจอ
// คลื่นวาดสด แต่เป็นเส้น sine หยาบ ๆ สามชั้น (ชั้นละ ~40 จุด) ไม่มี filter/shadowBlur เลย
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from '../../config.js';
import {
  SEA_C as C, seaHash as hash, drawSeaBackdrop, drawPalm, palmSprite, shellSprite, warmSeaArt,
} from '../sea.js';

const { W, H } = VIEW;

// ─────────────────────────────────────────────────────────────
// ละอองไอทะเลที่ลอยอยู่ในอากาศ — ชุดคงที่ หมุนใช้ซ้ำ
// ─────────────────────────────────────────────────────────────
const MOTES = Array.from({ length: 12 }, (_, i) => ({
  x: hash(i * 2.3) * W,
  y: 60 + hash(i * 5.1) * (GROUND_Y - 80),
  s: 1 + hash(i * 7.7) * 1.8,
  vx: -(0.25 + hash(i * 3.3) * 0.5),
  vy: -(0.05 + hash(i * 9.9) * 0.12),
  front: i % 3 === 0,
}));

function stepMotes(active) {
  if (!active) return;
  for (const p of MOTES) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < -10) { p.x = W + 10; p.y = 60 + hash(p.y) * (GROUND_Y - 80); }
    if (p.y < 40) p.y = GROUND_Y - 20;
  }
}

function drawMotes(ctx, v, front) {
  const a = 1 - v.facadeIn;
  if (a <= 0.02) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of MOTES) {
    if (p.front !== front) continue;
    const tw = 0.5 + 0.5 * Math.sin(v.tick * 0.06 + p.x * 0.05);
    ctx.globalAlpha = a * 0.45 * tw;
    ctx.fillStyle = C.foam;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ชั้นแคช — ทางเดินไม้ตลอดเส้น (รวมเสา ราวเชือก และของวางข้างทาง)
// ─────────────────────────────────────────────────────────────
const PAD = 160;
let CACHE = null;

function layerScale(ctx) {
  const t = ctx.getTransform();
  return Math.min(2, Math.max(1, Math.round(Math.hypot(t.a, t.b) * 4) / 4));
}

function buildWalk(layout, scale) {
  const len = layout.interior + layout.houseLead + PAD * 2;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(len * scale);
  cv.height = Math.ceil((H - GROUND_Y + 30) * scale);
  const g = cv.getContext('2d');
  g.scale(scale, scale);
  g.translate(0, -(GROUND_Y - 30));
  paintWalk(g, len);
  return { key: `${scale}|${layout.interior}|${layout.houseLead}`, walk: { cv, w: len, h: H - GROUND_Y + 30, s: scale } };
}

function layers(ctx, m) {
  const layout = {
    houseLead: m.doorIn - m.houseL,
    interior: m.doorOut - m.doorIn,
  };
  const scale = layerScale(ctx);
  const key = `${scale}|${layout.interior}|${layout.houseLead}`;
  if (!CACHE || CACHE.key !== key) CACHE = buildWalk(layout, scale);
  return CACHE;
}

export function warmBeachArt(_ctx, layout, scale = 1) {
  warmSeaArt();
  const s = Math.min(2, Math.max(1, Math.round(scale * 4) / 4));
  CACHE = buildWalk(layout, s);
}

/** ทางเดินไม้ทั้งเส้น — วาดครั้งเดียวลงชั้นแคช (พิกัด x เริ่มที่ 0 = ขอบซ้ายของชั้น) */
function paintWalk(g, len) {
  // พื้นไม้
  g.fillStyle = C.wood;
  g.fillRect(0, GROUND_Y, len, H - GROUND_Y);
  // แผ่นไม้ทีละแผ่น — สลับโทนนิดหน่อยไม่ให้เป็นแผ่นเรียบสีเดียว
  for (let x = 0; x < len; x += 26) {
    const h2 = hash(x * 0.37);
    g.fillStyle = h2 > 0.6 ? C.woodLite : h2 > 0.3 ? C.wood : C.woodDark;
    g.fillRect(x + 1, GROUND_Y + 2, 24, H - GROUND_Y - 2);
    g.fillStyle = C.woodLine;
    g.fillRect(x, GROUND_Y + 2, 1.5, H - GROUND_Y - 2);
  }
  // คานขอบบนของทางเดิน (เส้นที่ตัวแมวเหยียบ)
  g.fillStyle = C.woodLite;
  g.fillRect(0, GROUND_Y, len, 5);
  g.fillStyle = C.woodLine;
  g.fillRect(0, GROUND_Y + 5, len, 2);

  // เสาไม้ใต้ทางเดิน โผล่ให้เห็นที่ขอบล่าง
  for (let x = 40; x < len; x += 150) {
    g.fillStyle = C.woodDark;
    g.fillRect(x, GROUND_Y + 18, 14, H - GROUND_Y);
    g.fillStyle = C.woodLine;
    g.fillRect(x + 10, GROUND_Y + 18, 4, H - GROUND_Y);
  }
}

/** แปะเฉพาะส่วนของชั้นที่อยู่ในจอ */
function blit(ctx, layer, worldX, cam, y) {
  const sx = Math.max(0, cam - worldX);
  const ex = Math.min(layer.w, cam + W - worldX);
  if (ex <= sx) return;
  ctx.drawImage(layer.cv, sx * layer.s, 0, (ex - sx) * layer.s, layer.cv.height,
    worldX + sx - cam, y, ex - sx, layer.h);
}

// ─────────────────────────────────────────────────────────────
// ชั้นหลัง
// ─────────────────────────────────────────────────────────────
export function drawBeachBack(ctx, v) {
  const { m, camera: cam } = v;
  const onScreen = !(m.houseR + 160 - cam < 0 || m.houseL - 280 - cam > W);
  stepMotes(onScreen && v.px > m.houseL - 400 && v.px < m.doorOut + 300);
  if (!onScreen) return;

  // ── ก่อนถึงซุ้ม ──
  // ทางเดินไม้เริ่มปูบนพื้นของฉากเดิม + ต้นมะพร้าวไกล ๆ = บอกล่วงหน้าว่ากำลังจะถึงทะเล
  if (v.facadeIn > 0.02) drawApproach(ctx, v);

  // ── ข้างใน: โลกริมทะเลของตัวเอง เต็มจอ ──
  // ไล่ความโปร่งตามระยะที่ลอดซุ้มเข้าไป จอจึงถูกปิดสนิทก่อนถึงช่วงสลับฉากเสมอ
  const world = 1 - v.facadeIn;
  if (world > 0.02) drawInside(ctx, v, world);
  drawMotes(ctx, v, false);
}

/** ช่วงก่อนถึงซุ้ม — ทางเดินไม้ทอดมาบนพื้นฉากเดิม กับต้นมะพร้าวที่เห็นแต่ไกล */
function drawApproach(ctx, v) {
  const { m, camera: cam, tick } = v;
  ctx.save();
  ctx.globalAlpha = v.facadeIn;
  blit(ctx, layers(ctx, m).walk, m.houseL - PAD, cam, GROUND_Y - 30);
  // ต้นมะพร้าวสองต้นยืนรับก่อนถึงซุ้ม
  for (let i = 0; i < 2; i++) {
    const wx = m.houseL + 40 + i * 190;
    drawPalm(ctx, i, wx - cam, GROUND_Y + 6, 0.72 + i * 0.12, tick, i);
  }
  ctx.restore();
}

/**
 * ข้างซุ้ม — ฉากหลังริมทะเลชุดเดียวกับด่านชายหาด (render/sea.js) แล้ววางทางเดินไม้ทับ
 *
 * u ของทางเข้าไล่จาก 0 (บ่ายแก่ ๆ) ไป 1 (พระอาทิตย์ตกเต็มที่) พอออกจากซุ้ม
 * ด่านจริงวาดฉากหลังตัวเดียวกันที่ u = 1 ภาพจึงต่อกันสนิทโดยไม่ต้องจูนสีสองที่
 */
function drawInside(ctx, v, alpha) {
  const { m, camera: cam, tick } = v;
  ctx.save();
  ctx.globalAlpha = alpha;
  // palms ต้องตรงกับที่ด่านใช้ (ดู BACKDROPS.sea) — ไม่งั้นระหว่างอยู่ในทางเข้า
  // ต้นมะพร้าวของด่านจะถูกภาพทางเข้าบังไว้ แล้วโผล่พรวดทั้งแถวตอนทางเข้าเลิกวาด
  // ต้นมะพร้าววางตามพิกัดโลกอยู่แล้ว ตำแหน่งจึงตรงกันเป๊ะทั้งสองฝั่ง
  drawSeaBackdrop(ctx, cam, tick, { u: v.inside, palms: true });

  // ทางเดินไม้ที่ตัวแมววิ่งอยู่ (ชั้นแคช) — ปิดพื้นของฉากเดิมไว้ด้วย
  blit(ctx, layers(ctx, m).walk, m.houseL - PAD, cam, GROUND_Y - 30);

  // ต้นมะพร้าวสองฝั่งตลอดทางเดิน — ขนาด/ท่าไม่ซ้ำกัน
  const span = m.doorOut - m.doorIn;
  for (let i = 0; i < 5; i++) {
    const wx = m.doorIn + span * (0.1 + i * 0.19) + hash(i * 6.1) * 60;
    const far = i % 3 === 0;
    drawPalm(ctx, i, wx - cam, GROUND_Y + (far ? -8 : 6), far ? 0.5 : 0.85 + hash(i) * 0.25, tick, i);
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ชั้นหน้า — ซุ้มไม้ ราวเชือก ของวางบนทางเดิน ใบมะพร้าวหน้าสุด
// ─────────────────────────────────────────────────────────────
export function drawBeachFront(ctx, v) {
  const { m, camera: cam, tick } = v;
  if (m.houseR + 160 - cam < 0 || m.houseL - 280 - cam > W) return;

  const inside = (1 - v.facadeIn) * (1 - v.facadeOut);

  // ราวเชือกกับของวางข้างทาง — อยู่หน้าตัวแมวแต่ต่ำกว่าระดับเท้า ไม่บังทางวิ่ง
  if (inside > 0.02) {
    ctx.save();
    ctx.globalAlpha = inside;
    rail(ctx, m, cam, tick);
    const span = m.doorOut - m.doorIn;
    for (let i = 0; i < 7; i++) {
      const wx = m.doorIn + span * (0.06 + i * 0.14);
      const x = wx - cam;
      if (x < -40 || x > W + 40) continue;
      const s = 0.6 + hash(i * 3.7) * 0.5;
      ctx.drawImage(shellSprite(i), x - 20 * s, GROUND_Y + 12 - 32 * s, 40 * s, 32 * s);
    }
    ctx.restore();
  }

  // ซุ้มไม้หัวท้าย — เปิดโล่ง ไม่มีบานประตู ตัวแมววิ่งลอดใต้คานจริง
  arch(ctx, m.doorIn - cam, tick, v.near);
  arch(ctx, m.doorOut - cam, tick, 1);

  // ใบมะพร้าวหน้าสุดมุมบน — ของใกล้กล้อง ทำให้ฉากมีความลึก
  if (inside > 0.02) {
    ctx.save();
    ctx.globalAlpha = inside;
    const span = m.doorOut - m.doorIn;
    for (let i = 0; i < 2; i++) {
      const wx = m.doorIn + span * (0.26 + i * 0.4);
      const x = wx - cam;
      if (x < -300 || x > W + 300) continue;
      ctx.save();
      ctx.translate(x, -40);
      ctx.rotate(Math.PI + Math.sin(tick * 0.02 + i) * 0.04);
      ctx.drawImage(palmSprite(i % 2), -140, -60, 280, 210);
      ctx.restore();
    }
    ctx.restore();
  }
  drawMotes(ctx, v, true);
}

/** ราวเชือกฝั่งทะเล — เสาเตี้ยกับเชือกห้อยเป็นท้องช้าง */
function rail(ctx, m, cam, tick) {
  const y = GROUND_Y + 10;
  ctx.strokeStyle = C.ropeDark;
  ctx.lineWidth = 4;
  const from = Math.max(m.doorIn, cam - 60);
  const to = Math.min(m.doorOut, cam + W + 60);
  for (let wx = Math.ceil(from / 120) * 120; wx < to; wx += 120) {
    const x = wx - cam;
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(x - 5, y - 26, 10, 34);
    ctx.fillStyle = C.woodLite;
    ctx.fillRect(x - 5, y - 26, 4, 34);
    // เชือกห้อยไปเสาถัดไป
    ctx.strokeStyle = C.rope;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.quadraticCurveTo(x + 60, y - 6 + Math.sin(tick * 0.03 + wx) * 2, x + 120, y - 20);
    ctx.stroke();
  }
}

/**
 * ซุ้มไม้ — เสาสองต้นกับคานบน มีธงผ้าสามผืนกับโคมไฟห้อย
 * เปิดโล่งตรงกลางโดยตั้งใจ (ไม่ใช่ประตู) ตัวแมววิ่งลอดผ่านได้เห็นตลอด
 */
function arch(ctx, x, tick, warm) {
  if (x > W + 200 || x < -200) return;
  const halfW = 108;
  const top = 44;

  // เสาสองต้น
  for (const dx of [-halfW, halfW]) {
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(x + dx - 13, top, 26, GROUND_Y - top + 16);
    ctx.fillStyle = C.wood;
    ctx.fillRect(x + dx - 13, top, 18, GROUND_Y - top + 16);
    ctx.fillStyle = C.woodLine;
    ctx.fillRect(x + dx - 13, top + 40, 26, 3);
    ctx.fillRect(x + dx - 13, GROUND_Y - 60, 26, 3);
  }
  // คานบนสองชั้น
  ctx.fillStyle = C.wood;
  ctx.fillRect(x - halfW - 30, top - 26, halfW * 2 + 60, 22);
  ctx.fillStyle = C.woodLite;
  ctx.fillRect(x - halfW - 30, top - 26, halfW * 2 + 60, 7);
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(x - halfW - 16, top + 2, halfW * 2 + 32, 12);

  // ธงผ้าสามเหลี่ยมห้อยใต้คาน — ไหวตามลม
  const cols = [C.flagA, C.flagB, C.flagC];
  for (let i = 0; i < 7; i++) {
    const fx = x - halfW + 6 + i * ((halfW * 2 - 12) / 6);
    const sway = Math.sin(tick * 0.05 + i) * 3;
    ctx.fillStyle = cols[i % 3];
    ctx.beginPath();
    ctx.moveTo(fx - 9, top + 14);
    ctx.lineTo(fx + 9, top + 14);
    ctx.lineTo(fx + sway, top + 40);
    ctx.closePath();
    ctx.fill();
  }

  // โคมไฟสองดวงที่หัวเสา — อุ่นขึ้นเมื่อเข้าใกล้ (warm 0→1)
  for (const dx of [-halfW, halfW]) {
    const ly = top + 58;
    ctx.strokeStyle = C.ropeDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + dx, top + 14);
    ctx.lineTo(x + dx, ly - 10);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,214,150,${0.45 + warm * 0.5})`;
    ctx.beginPath();
    ctx.arc(x + dx, ly, 9 + Math.sin(tick * 0.06) * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF3D0';
    ctx.beginPath();
    ctx.arc(x + dx, ly, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
