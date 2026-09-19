// src/render/gates/space.js
// ─────────────────────────────────────────────────────────────
// ภาพทางเข้า "ห้วงอวกาศ" — ฐานปล่อยยานริมทะเลตอนพลบค่ำ → ทะยานขึ้น → ทะลุเมฆ
//                          → เห็นโลกอยู่ข้างล่าง → ประตูมิติ → ห้วงอวกาศ
//
// ── ทำไมต่อจากชายหาด ──
// ลำดับด่านคงที่ (stages.js) ด่านก่อนห้วงอวกาศคือ "ชายหาดยามเย็น" เสมอ
// ฐานปล่อยจึงตั้งอยู่ริมทะเลตอนพระอาทิตย์ตก และวินาทีแรกหลังลอดซุ้ม ภาพยังเป็นทะเลผืนเดิม
// (เรียก render/sea.js ตัวเดียวกับที่ด่านชายหาดใช้) แล้วทะเลค่อย ๆ "ร่วงลง" พ้นจอ
// = จังหวะที่ผู้เล่นรู้ตัวว่ากำลังลอยขึ้น ไม่ใช่ฉากถูกสลับ
//
// ── ลำดับที่ผู้เล่นเห็น (u = ความคืบหน้าข้างใน 0 → 1) ──
//   ก่อนถึง      ลานเหล็กปูบนหาด เสาอากาศ จานเรดาร์ ป้ายเตือน ลังของ ท่อ ไฟสัญญาณกะพริบ
//   0.00–0.10   ลอดเสาลิฟต์แรงโน้มถ่วง วงแสงวิ่งขึ้นตามเสา ทะเลข้างล่างเริ่มร่วงหาย
//   0.10–0.35   WOW 1 ทะลุชั้นเมฆ — เมฆพุ่งลงผ่านจอ แหวกออกสองข้าง เส้นความเร็ววิ่งลง
//   0.35–0.60   ฟ้าไล่จากพลบค่ำเป็นน้ำเงินเข้ม ดาวเริ่มติด ขอบโลกเรืองแสงโผล่ข้างล่าง
//   0.60–0.80   WOW 2 โลกเผยตัวเป็นลูกกลม แล้วค่อย ๆ เล็กลงเมื่อเราไกลออกไป
//   0.80–1.00   WOW 3 เนบิวลา ดาวเคราะห์ สะเก็ดดาวเปิดออก → ลอดประตูมิติเข้าด่านจริง
//
// ── จอถูกปิดตอนไหน ──
// ทางเข้านี้เป็นที่โล่งเหมือนชายหาด ไม่มีผนังบัง วิธีปิดจอคือ "วาดโลกของตัวเองเต็มจอ"
// (render/space.js) ทับฉากเดิมทั้งผืนตั้งแต่ลอดเสาลิฟต์ — เงื่อนไขช่วงปิดจอของ gates.js
// จึงยังเป็นจริงทุกประการ ทั้งที่ผู้เล่นรู้สึกว่าเห็นทุกอย่างตลอดเวลา
//
// ── ประสิทธิภาพ ──
// ถนน/ลาน/ของประกอบที่ไม่ขยับ = ชั้นแคชวาดครั้งเดียวทั้งเส้น แล้วแปะเฉพาะส่วนที่อยู่ในจอ
// ฟ้า ดาว เนบิวลา ดาวเคราะห์ เมฆ = สไปรต์แคชทั้งหมด (ดู render/space.js)
// ที่วาดสดคือ เสาลิฟต์ จานเรดาร์ ไฟกะพริบ ประตูมิติ ประกาย — ของนับชิ้นได้ ไม่มี filter เลย
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from '../../config.js';
import { drawSeaBackdrop } from '../sea.js';
import {
  SPACE_C as C, spaceHash as hash, drawSpaceBackdrop, spaceSprite, warmSpaceArt,
} from '../space.js';

const { W, H } = VIEW;
const TAU = Math.PI * 2;

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// ─────────────────────────────────────────────────────────────
// ประกายพลังงานที่ลอยอยู่รอบตัว — ชุดคงที่ หมุนใช้ซ้ำ ไม่มีการสร้างอ็อบเจกต์ใหม่เลย
// ลอยขึ้นตรงข้ามกับทุกอย่างในฉาก = ความรู้สึกว่าเรากำลังถูกส่งขึ้น
// ─────────────────────────────────────────────────────────────
const MOTES = Array.from({ length: 14 }, (_, i) => ({
  x: hash(i * 2.3) * W,
  y: hash(i * 5.1) * H,
  s: 1 + hash(i * 7.7) * 2.2,
  vy: -(0.7 + hash(i * 3.3) * 1.6),
  vx: -(0.1 + hash(i * 9.1) * 0.3),
  front: i % 3 === 0,
}));

function stepMotes(active) {
  if (!active) return;
  for (const p of MOTES) {
    p.y += p.vy;
    p.x += p.vx;
    if (p.y < -12) { p.y = H + 12; p.x = hash(p.x * 0.7) * W; }
    if (p.x < -12) p.x = W + 12;
  }
}

function drawMotes(ctx, v, front) {
  const a = 1 - v.facadeIn;
  if (a <= 0.02) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of MOTES) {
    if (p.front !== front) continue;
    const tw = 0.5 + 0.5 * Math.sin(v.tick * 0.08 + p.x * 0.05);
    ctx.globalAlpha = a * 0.5 * tw;
    ctx.fillStyle = p.front ? C.neonSoft : C.neon;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.s, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ชั้นแคช — ทางวิ่งตลอดเส้น (ลานเหล็กช่วงต้น → สะพานแสงช่วงอวกาศ)
// ─────────────────────────────────────────────────────────────
const PAD = 160;    // ชายซ้ายของชั้นแคช เผื่อไว้ก่อนถึงลานฐานปล่อย
const TAIL = 150;   // ชายขวา — สะพานค่อย ๆ จางหายในช่วงนี้ ไม่ใช่ถูกตัดปลาย
let CACHE = null;

function layerScale(ctx) {
  const t = ctx.getTransform();
  return Math.min(2, Math.max(1, Math.round(Math.hypot(t.a, t.b) * 4) / 4));
}

function buildRoad(layout, scale) {
  // ชายขวาสั้นกว่าชายซ้าย: สะพานต้องจบใกล้ ๆ ประตูมิติ แล้วปล่อยให้พื้นของด่านจริงรับต่อ
  const len = layout.interior + layout.houseLead + PAD + TAIL;
  const padEnd = PAD + layout.houseLead + 300;   // ลานเหล็กจบหลังเสาลิฟต์ไป 300px
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(len * scale);
  cv.height = Math.ceil((H - GROUND_Y + 40) * scale);
  const g = cv.getContext('2d');
  g.scale(scale, scale);
  g.translate(0, -(GROUND_Y - 40));
  paintRoad(g, len, padEnd);
  return {
    key: `${scale}|${layout.interior}|${layout.houseLead}`,
    road: { cv, w: len, h: H - GROUND_Y + 40, s: scale },
  };
}

function layers(ctx, m) {
  const layout = { houseLead: m.doorIn - m.houseL, interior: m.doorOut - m.doorIn };
  const scale = layerScale(ctx);
  const key = `${scale}|${layout.interior}|${layout.houseLead}`;
  if (!CACHE || CACHE.key !== key) CACHE = buildRoad(layout, scale);
  return CACHE;
}

export function warmSpaceGateArt(_ctx, layout, scale = 1) {
  warmSpaceArt();
  const s = Math.min(2, Math.max(1, Math.round(scale * 4) / 4));
  CACHE = buildRoad(layout, s);
}

/**
 * ทางวิ่งทั้งเส้น — วาดครั้งเดียวลงชั้นแคช (x = 0 คือขอบซ้ายของชั้น)
 * ช่วงแรกเป็นลานเหล็กของฐานปล่อย ช่วงหลังเป็นสะพานแสงที่ลอยอยู่กลางอวกาศ
 */
function paintRoad(g, len, padEnd) {
  const deckH = H - GROUND_Y;

  // ── โครงหลัก ──
  g.fillStyle = C.metalD;
  g.fillRect(0, GROUND_Y, len, deckH);
  g.fillStyle = C.metal;
  g.fillRect(0, GROUND_Y, len, 26);
  g.fillStyle = C.metalL;
  g.fillRect(0, GROUND_Y, len, 5);

  // ── ลานฐานปล่อย: ตารางเหล็ก + แถบเตือนลายเฉียง + หมุด ──
  for (let x = 0; x < padEnd; x += 46) {
    g.fillStyle = 'rgba(12,10,26,.45)';
    g.fillRect(x, GROUND_Y + 6, 2, deckH - 6);
  }
  g.fillStyle = C.warn;
  g.fillRect(0, GROUND_Y + 26, padEnd, 9);
  g.fillStyle = C.metalD;
  for (let x = 0; x < padEnd; x += 24) {
    g.beginPath();
    g.moveTo(x, GROUND_Y + 35);
    g.lineTo(x + 11, GROUND_Y + 26);
    g.lineTo(x + 22, GROUND_Y + 26);
    g.lineTo(x + 11, GROUND_Y + 35);
    g.closePath();
    g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,.22)';
  for (let x = 16; x < padEnd; x += 46) g.fillRect(x, GROUND_Y + 9, 3, 3);

  // ── สะพานแสงช่วงอวกาศ ──
  // ขอบบนเรืองนีออน ใต้ท้องสะพานมีไฟเป็นช่วง ๆ ดูเหมือนแผงพลังงานเรียงกัน
  const fadeW = 220;
  for (let x = padEnd; x < len; x += 1) {
    if (x % 2) continue;
    const t = clamp01((x - padEnd) / fadeW);
    g.globalAlpha = t;
    g.fillStyle = C.neon;
    g.fillRect(x, GROUND_Y - 2, 2, 4);
    g.globalAlpha = t * 0.35;
    g.fillStyle = C.neonSoft;
    g.fillRect(x, GROUND_Y + 2, 2, 6);
  }
  g.globalAlpha = 1;
  for (let x = padEnd; x < len; x += 58) {
    const t = clamp01((x - padEnd) / fadeW);
    g.globalAlpha = t * 0.8;
    g.fillStyle = C.neonSoft;
    g.fillRect(x + 12, GROUND_Y + 30, 34, 6);
    g.globalAlpha = t * 0.28;
    g.fillRect(x + 6, GROUND_Y + 40, 46, 14);
  }
  g.globalAlpha = 1;

  // ── ใต้ท้องทางวิ่งของช่วงอวกาศ: คานสามเหลี่ยมโปร่ง เห็นอวกาศลอดได้ ──
  g.strokeStyle = C.metalL;
  g.lineWidth = 3;
  g.beginPath();
  for (let x = padEnd; x < len; x += 52) {
    g.moveTo(x, GROUND_Y + 26);
    g.lineTo(x + 26, H - 6);
    g.lineTo(x + 52, GROUND_Y + 26);
  }
  g.stroke();

  // ── ของประจำฐานปล่อยที่ไม่ขยับ อบลงชั้นแคชเลย ──
  for (let i = 0; i < 6; i++) {
    const x = 30 + i * (padEnd / 6.4) + hash(i * 3.1) * 40;
    const kind = i % 3;
    if (kind === 0) crateStack(g, x, 2 + (i % 2));
    else if (kind === 1) pipeRun(g, x);
    else toolBox(g, x);
  }

  // ── ปลายสะพาน ──
  // ลบตัวเองให้จางหายในช่วง TAIL สุดท้าย (หลังประตูมิติ) แทนที่จะถูกตัดเป็นหน้าตัดตรง ๆ
  // พื้นของด่านจริงอยู่ใต้ชั้นนี้อยู่แล้ว จึงโผล่ขึ้นมารับช่วงพอดีตอนสะพานจางหมด
  g.globalCompositeOperation = 'destination-out';
  const fade = g.createLinearGradient(len - TAIL, 0, len, 0);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = fade;
  g.fillRect(len - TAIL, GROUND_Y - 40, TAIL, H - GROUND_Y + 40);
  g.globalCompositeOperation = 'source-over';
}

/** ลังอุปกรณ์ซ้อน */
function crateStack(g, x, n) {
  for (let i = 0; i < n; i++) {
    const y = GROUND_Y - 22 - i * 22;
    g.fillStyle = i % 2 ? '#5E5488' : '#4A4272';
    g.fillRect(x, y, 30, 22);
    g.fillStyle = 'rgba(255,255,255,.14)';
    g.fillRect(x, y, 30, 4);
    g.fillStyle = C.neon;
    g.fillRect(x + 12, y + 8, 6, 6);
  }
}

/** ท่อโค้งกับสายไฟที่พาดอยู่ข้างลาน */
function pipeRun(g, x) {
  g.strokeStyle = C.metalL;
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, GROUND_Y - 4);
  g.lineTo(x, GROUND_Y - 26);
  g.quadraticCurveTo(x + 14, GROUND_Y - 40, x + 40, GROUND_Y - 40);
  g.stroke();
  g.strokeStyle = 'rgba(20,16,42,.7)';
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(x + 6, GROUND_Y - 6);
  g.quadraticCurveTo(x + 30, GROUND_Y + 6, x + 54, GROUND_Y - 6);
  g.stroke();
}

/** กล่องเครื่องวัดมีไฟเล็ก ๆ */
function toolBox(g, x) {
  g.fillStyle = C.metal;
  g.fillRect(x, GROUND_Y - 26, 34, 26);
  g.fillStyle = C.metalL;
  g.fillRect(x, GROUND_Y - 26, 34, 4);
  g.fillStyle = '#1B1734';
  g.fillRect(x + 5, GROUND_Y - 20, 24, 11);
  g.fillStyle = C.neonSoft;
  g.fillRect(x + 7, GROUND_Y - 17, 5, 5);
  g.fillStyle = C.warn;
  g.fillRect(x + 15, GROUND_Y - 17, 5, 5);
}

function blit(ctx, layer, worldX, cam, y) {
  const x = Math.round(worldX - cam);
  ctx.drawImage(
    layer.cv, 0, 0, layer.cv.width, layer.cv.height,
    x, y, layer.w, layer.h
  );
}

// ─────────────────────────────────────────────────────────────
// ชั้นหลัง
// ─────────────────────────────────────────────────────────────
export function drawSpaceBack(ctx, v) {
  const { m, camera: cam } = v;
  const onScreen = !(m.houseR + 200 - cam < 0 || m.houseL - 320 - cam > W);
  stepMotes(onScreen && v.px > m.houseL - 400 && v.px < m.doorOut + 300);
  if (!onScreen) return;

  if (v.facadeIn > 0.02) drawApproach(ctx, v);

  // พ้นประตูมิติแล้วจางโลกของทางเข้าออกภายใน 110px (facadeOut) ให้ฉากจริงรับช่วง
  // ตรงนั้นฉากหลังสองฝั่งเป็นภาพเดียวกันเป๊ะ (space.js ที่ u = 1) ตาจึงจับรอยต่อไม่ได้
  // สิ่งที่โผล่มาแทนคือ "พื้น" ของด่านจริงที่ถูกสะพานแสงบังไว้ก่อนหน้านี้
  const world = (1 - v.facadeIn) * (1 - v.facadeOut);
  if (world > 0.02) drawInside(ctx, v, world);
  drawMotes(ctx, v, false);
}

/** ช่วงก่อนถึงเสาลิฟต์ — ลานเหล็กปูบนหาด เสาอากาศ จานเรดาร์ ป้ายเตือน ไฟสัญญาณ */
function drawApproach(ctx, v) {
  const { m, camera: cam, tick } = v;
  ctx.save();
  ctx.globalAlpha = v.facadeIn;
  blit(ctx, layers(ctx, m).road, m.houseL - PAD, cam, GROUND_Y - 40);

  // เสาอากาศสูงกับจานเรดาร์ที่หมุนช้า ๆ — ของขยับได้สองชิ้นของช่วงนี้
  antenna(ctx, m.houseL + 70 - cam, tick);
  radar(ctx, m.houseL + 210 - cam, tick);
  warnSign(ctx, m.houseL + 158 - cam);
  miniRocket(ctx, m.houseL + 34 - cam, tick);

  // ไฟสัญญาณเรียงเข้าหาเสาลิฟต์ — ไล่กะพริบทีละดวงเหมือนไฟนำร่อง
  for (let i = 0; i < 6; i++) {
    const x = m.houseL + 40 + i * 42 - cam;
    const on = (Math.floor(tick / 6) % 6) === i;
    ctx.fillStyle = on ? C.neon : 'rgba(157,255,107,.28)';
    ctx.beginPath();
    ctx.arc(x, GROUND_Y - 6, on ? 4.5 : 3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * ข้างใน — โลกอวกาศเต็มจอ (render/space.js) + ทางวิ่ง + ลำแสงจากฐานปล่อย
 *
 * ช่วงแรกทะเลของด่านชายหาดยังอยู่ แล้ว "ร่วงลง" พ้นขอบจอ
 * ใช้ภาพชุดเดียวกับที่ด่านชายหาดเพิ่งวาดอยู่ ภาพวินาทีแรกหลังลอดเสาจึงต่อกันสนิท
 */
function drawInside(ctx, v, alpha) {
  const { m, camera: cam, tick } = v;
  const u = v.inside;
  ctx.save();
  ctx.globalAlpha = alpha;
  drawSpaceBackdrop(ctx, cam, tick, { u });

  // ทะเลที่กำลังร่วงหายไปข้างล่าง (0 → 1 ภายใน 18% แรกของทางเข้า)
  const rise = clamp01((u - 0.015) / 0.17);
  if (rise < 1) {
    ctx.save();
    // จางเร็วกว่าที่ขยับมาก ๆ โดยตั้งใจ — ภาพทะเลมีฟ้าทึบของตัวเอง ถ้าเลื่อนลงทั้งที่ยังทึบอยู่
    // ขอบบนของมันจะกลายเป็นเส้นตรงพาดจอ ค่อย ๆ เลื่อน (ยกกำลัง 2.4) แล้วจางทัน จึงไม่เห็นขอบ
    ctx.globalAlpha = alpha * (1 - rise) ** 2.2;
    ctx.translate(0, rise ** 2.4 * (H + 60));
    drawSeaBackdrop(ctx, cam, tick, { u: 1 });
    ctx.restore();
  }

  // ทางวิ่ง (ชั้นแคช) — ปิดพื้นของฉากเดิมไว้ด้วย
  blit(ctx, layers(ctx, m).road, m.houseL - PAD, cam, GROUND_Y - 40);

  // ลำแสงจากฐานปล่อยที่ยังส่องตามขึ้นมา — จางหายเมื่อพ้นชั้นเมฆ
  const beam = 1 - clamp01((u - 0.05) / 0.22);
  if (beam > 0.02) {
    const grad = ctx.createLinearGradient(0, H, 0, -40);
    grad.addColorStop(0, 'rgba(157,255,107,.5)');
    grad.addColorStop(1, 'rgba(157,255,107,0)');
    ctx.fillStyle = grad;
    for (let i = 0; i < 3; i++) {
      const wide = 150 + i * 120;
      ctx.globalAlpha = alpha * beam * (0.34 - i * 0.09);
      ctx.beginPath();
      ctx.moveTo(W * 0.3 - wide, H);
      ctx.lineTo(W * 0.3 + wide, H);
      ctx.lineTo(W * 0.3 + wide * 0.32, -40);
      ctx.lineTo(W * 0.3 - wide * 0.32, -40);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ชั้นหน้า — เสาลิฟต์แรงโน้มถ่วง ประตูมิติ ของหน้าสุด
// ─────────────────────────────────────────────────────────────
export function drawSpaceFront(ctx, v) {
  const { m, camera: cam, tick } = v;
  if (m.houseR + 200 - cam < 0 || m.houseL - 320 - cam > W) return;

  // เสาลิฟต์ที่ปากทางเข้า — เปิดโล่ง ไม่มีบานประตู แมววิ่งลอดใต้วงแสงจริง
  liftGate(ctx, m.doorIn - cam, tick, v.near);

  // ประตูมิติที่ปลายทาง — วงแสงหมุน เห็นห้วงอวกาศจริงอยู่ข้างใน
  rift(ctx, m.doorOut - cam, tick);

  // ก้อนหินหน้าสุดสองก้อนช่วงท้าย — ของใกล้กล้อง ทำให้อวกาศมีความลึก
  const near = (1 - v.facadeIn) * (1 - v.facadeOut) * clamp01((v.inside - 0.6) / 0.2);
  if (near > 0.02) {
    ctx.save();
    ctx.globalAlpha = near * 0.9;
    const span = m.doorOut - m.doorIn;
    for (let i = 0; i < 2; i++) {
      const wx = m.doorIn + span * (0.72 + i * 0.16);
      const x = wx - cam;
      if (x < -260 || x > W + 260) continue;
      ctx.save();
      ctx.translate(x, i ? 74 : H - 96);
      ctx.rotate(tick * 0.004 * (i ? -1 : 1));
      ctx.fillStyle = '#211D3E';
      ctx.beginPath();
      for (let k = 0; k <= 9; k++) {
        const an = (k / 9) * TAU;
        const rr = (i ? 62 : 86) * (0.78 + hash(i * 5.1 + k) * 0.3);
        const px = Math.cos(an) * rr;
        const py = Math.sin(an) * rr;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawMotes(ctx, v, true);
}

/**
 * เสาลิฟต์แรงโน้มถ่วง — โครงเหล็กสองต้นกับวงแสงพาดบน
 * วงแสงเล็ก ๆ วิ่ง "ขึ้น" ตามเสาตลอดเวลา = บอกทิศทางของทางเข้านี้ตั้งแต่ยังไม่ถึง
 */
function liftGate(ctx, x, tick, warm) {
  if (x > W + 260 || x < -260) return;
  const halfW = 116;
  const top = 54;   // ต่ำกว่านี้ไม่ได้ ไม่งั้นคานบังทางกระโดด / สูงกว่านี้คานกับตราจะโดนขอบบนจอตัด

  for (const dx of [-halfW, halfW]) {
    const bx = x + dx;
    // โครงถัก: เสาคู่ + ค้ำไขว้
    ctx.fillStyle = C.metalD;
    ctx.fillRect(bx - 16, top, 32, GROUND_Y - top + 20);
    ctx.fillStyle = C.metal;
    ctx.fillRect(bx - 16, top, 9, GROUND_Y - top + 20);
    ctx.fillRect(bx + 7, top, 9, GROUND_Y - top + 20);
    ctx.strokeStyle = C.metalL;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let y = top + 10; y < GROUND_Y + 10; y += 34) {
      ctx.moveTo(bx - 14, y);
      ctx.lineTo(bx + 14, y + 17);
      ctx.moveTo(bx + 14, y);
      ctx.lineTo(bx - 14, y + 17);
    }
    ctx.stroke();

    // วงแสงวิ่งขึ้นตามเสา
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const p = ((tick * 2.6 + i * 120) % 360) / 360;
      const y = GROUND_Y + 10 - p * (GROUND_Y - top + 10);
      ctx.globalAlpha = (1 - p) * 0.75;
      ctx.fillStyle = C.neon;
      ctx.fillRect(bx - 20, y - 3, 40, 6);
    }
    ctx.restore();
  }

  // คานบน + วงแสงพาดกลาง
  ctx.fillStyle = C.metal;
  ctx.fillRect(x - halfW - 28, top - 30, halfW * 2 + 56, 24);
  ctx.fillStyle = C.metalL;
  ctx.fillRect(x - halfW - 28, top - 30, halfW * 2 + 56, 6);
  ctx.fillStyle = C.metalD;
  ctx.fillRect(x - halfW - 14, top - 6, halfW * 2 + 28, 10);

  // สัญลักษณ์อุ้งเท้า + จรวด บนคาน
  emblem(ctx, x, top - 18);

  // วงพลังงานใต้คาน — สว่างขึ้นเมื่อแมวเข้าใกล้ (warm 0 → 1)
  // บาง ๆ พอ — 'lighter' ซ้อนหลายวงด้วยเส้นหนาแล้วสีจะอิ่มจนกลายเป็นก้อนขาว ไม่เหลือความเป็นวง
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = (0.1 + warm * 0.26) * (1 - i * 0.3);
    ctx.strokeStyle = i === 1 ? C.neonSoft : C.neon;
    ctx.lineWidth = 4 - i;
    ctx.beginPath();
    ctx.ellipse(x, top + 34 + i * 4, halfW - 10, 18 + i * 6 + Math.sin(tick * 0.06) * 2, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  // โคมไฟหัวเสา
  for (const dx of [-halfW, halfW]) {
    ctx.fillStyle = `rgba(157,255,107,${0.4 + warm * 0.5})`;
    ctx.beginPath();
    ctx.arc(x + dx, top + 16, 8 + Math.sin(tick * 0.07) * 0.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#F2FFE8';
    ctx.beginPath();
    ctx.arc(x + dx, top + 16, 4, 0, TAU);
    ctx.fill();
  }
}

/** ตราฐานปล่อย — อุ้งเท้าแมวในวงกลม มีจรวดเล็ก ๆ พุ่งขึ้น */
function emblem(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = C.neon;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#17142E';
  ctx.beginPath();
  ctx.arc(0, 2.5, 4.6, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const an = -2.5 + i * 0.52;
    ctx.beginPath();
    ctx.arc(Math.cos(an) * 7.6, Math.sin(an) * 7.6 - 1, 2.1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * ประตูมิติทางออก — วงแสงซ้อนสามชั้นหมุนสวนกัน มีประกายรอบขอบ
 * ตรงกลางเปิดโล่ง (ไม่วาดอะไรทับ) ผู้เล่นจึงเห็นห้วงอวกาศจริงผ่านวงนี้ก่อนจะวิ่งลอดออกไป
 */
function rift(ctx, x, tick) {
  if (x > W + 300 || x < -300) return;
  const cy = GROUND_Y - 108;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = 0.85 - i * 0.22;
    ctx.strokeStyle = [C.neonSoft, '#C9A8FF', C.neon][i];
    ctx.lineWidth = 9 - i * 2.5;
    ctx.beginPath();
    ctx.ellipse(x, cy, 104 + i * 13, 148 + i * 15, Math.sin(tick * 0.01 + i) * 0.05, 0, TAU);
    ctx.stroke();
  }
  // ประกายวิ่งรอบวง
  for (let i = 0; i < 10; i++) {
    const an = tick * 0.02 + i * (TAU / 10);
    const px = x + Math.cos(an) * 112;
    const py = cy + Math.sin(an) * 158;
    ctx.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(tick * 0.08 + i));
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px, py, 2.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ของประกอบฐานปล่อยที่ขยับได้ — วาดสด เพราะแคชแล้วมันจะหยุดนิ่ง
// ─────────────────────────────────────────────────────────────
function antenna(ctx, x, tick) {
  if (x < -60 || x > W + 60) return;
  ctx.strokeStyle = C.metalL;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, GROUND_Y);
  ctx.lineTo(x, GROUND_Y - 104);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let y = GROUND_Y - 12; y > GROUND_Y - 100; y -= 18) {
    ctx.moveTo(x - 9, y);
    ctx.lineTo(x + 9, y - 9);
    ctx.moveTo(x + 9, y);
    ctx.lineTo(x - 9, y - 9);
  }
  ctx.stroke();
  // ไฟกะพริบยอดเสา
  const on = Math.floor(tick / 22) % 2 === 0;
  ctx.fillStyle = on ? '#FF6A7A' : 'rgba(255,106,122,.3)';
  ctx.beginPath();
  ctx.arc(x, GROUND_Y - 108, on ? 4.5 : 3, 0, TAU);
  ctx.fill();
}

function radar(ctx, x, tick) {
  if (x < -70 || x > W + 70) return;
  const y = GROUND_Y - 62;
  ctx.fillStyle = C.metal;
  ctx.fillRect(x - 5, y, 10, 62);
  ctx.save();
  ctx.translate(x, y);
  // จานหันไปมาช้า ๆ (ไม่หมุนรอบตัว จะได้อ่านออกว่าเป็นจานรับสัญญาณ)
  ctx.rotate(Math.sin(tick * 0.008) * 0.5 - 0.5);
  ctx.fillStyle = C.metalL;
  ctx.beginPath();
  ctx.ellipse(0, -14, 15, 26, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2A2548';
  ctx.beginPath();
  ctx.ellipse(2, -14, 10, 21, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.neonSoft;
  ctx.fillRect(-1.5, -18, 3, 10);
  ctx.restore();
}

function warnSign(ctx, x) {
  if (x < -40 || x > W + 40) return;
  ctx.fillStyle = C.metalL;
  ctx.fillRect(x - 2, GROUND_Y - 34, 4, 34);
  ctx.fillStyle = C.warn;
  ctx.beginPath();
  ctx.moveTo(x, GROUND_Y - 62);
  ctx.lineTo(x + 17, GROUND_Y - 33);
  ctx.lineTo(x - 17, GROUND_Y - 33);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2A2140';
  ctx.fillRect(x - 1.8, GROUND_Y - 53, 3.6, 12);
  ctx.fillRect(x - 1.8, GROUND_Y - 39, 3.6, 3.6);
}

/** จรวดจำลองบนแท่นโชว์ — ควันเล็ก ๆ พ่นเป็นจังหวะ บอกว่าที่นี่คือที่ปล่อยยาน */
function miniRocket(ctx, x, tick) {
  if (x < -50 || x > W + 50) return;
  const y = GROUND_Y - 18;
  ctx.fillStyle = '#F6F1FF';
  ctx.beginPath();
  ctx.moveTo(x, y - 62);
  ctx.quadraticCurveTo(x + 13, y - 34, x + 11, y);
  ctx.lineTo(x - 11, y);
  ctx.quadraticCurveTo(x - 13, y - 34, x, y - 62);
  ctx.fill();
  ctx.fillStyle = '#FF8FA8';
  ctx.beginPath();
  ctx.moveTo(x - 11, y);
  ctx.lineTo(x - 19, y + 12);
  ctx.lineTo(x - 5, y + 2);
  ctx.closePath();
  ctx.moveTo(x + 11, y);
  ctx.lineTo(x + 19, y + 12);
  ctx.lineTo(x + 5, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8FD8E8';
  ctx.beginPath();
  ctx.arc(x, y - 34, 6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.metal;
  ctx.fillRect(x - 16, y + 12, 32, 6);
  // ควันไอเสียเป็นจังหวะ
  const p = (tick % 90) / 90;
  if (p < 0.4) {
    ctx.globalAlpha = (1 - p / 0.4) * 0.5;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x - 4 - p * 22, y + 16 + p * 8, 6 + p * 10, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
