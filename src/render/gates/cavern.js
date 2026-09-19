// src/render/gates/cavern.js
// ─────────────────────────────────────────────────────────────
// ภาพทางเข้า "ถ้ำคริสตัล" — ภูเขาหินที่มีคริสตัลแทงทะลุออกมา → อุโมงค์คริสตัล → โถงถ้ำใหญ่
//
// ── ลำดับที่ผู้เล่นเห็น ──
//   ข้างนอก   เชิงเขาหินเริ่มมีคริสตัลผุดจากพื้น → ภูเขาลูกใหญ่ปิดจอ มีปากถ้ำเป็นโพรงสูงเกือบเต็มจอ
//             ขอบปากถ้ำมีคริสตัลแทงออกมาจากเพดาน ผนัง และพื้น เหมือนคริสตัลโตออกมาจากหิน
//   ข้างใน    อุโมงค์หิน: เพดานมีหินย้อย พื้นมีหินงอก ผนังสองข้างมีกลุ่มคริสตัลไล่ขนาด
//             ช่วงแรกมืดลงกว่าข้างนอก แล้วแสงคริสตัลค่อย ๆ ขึ้นมาแทนเป็นแหล่งแสงหลัก
//   ช่วงท้าย  ผนังเปิดออกเป็น "โถงถ้ำ" กว้าง เห็นยอดคริสตัลยักษ์กับสายแร่เรืองแสงไกล ๆ = จุด WOW
//   ปากออก    เจาะรูมองทะลุไปเห็นฉากจริง (ตอนนั้นเกมสลับเป็นด่านถ้ำแล้ว ดู gates.js เรื่องช่วงปิดจอ)
//
// วิวข้างในวาดในไฟล์นี้เอง ไม่ใช่ฉากจริงของเกม เพราะตอนอยู่ในอุโมงค์เกมยังไม่สลับฉาก
// ถ้าเปิดให้เห็นฉากจริงจะเห็นฉากเก่าโผล่ สีที่ใช้จึงหยิบจากจานสีของด่านถ้ำตรง ๆ
// ออกจากอุโมงค์แล้วภาพจึงต่อกับฉากจริงพอดี
//
// ── ประสิทธิภาพ ──
// คริสตัลทุกชิ้นเป็นสไปรต์แคช (5 แบบ) วาดซ้ำด้วย drawImage ไม่มีอ็อบเจกต์ถาวรสักชิ้น
// ตัวภูเขากับผนังอุโมงค์เป็นชั้นแคชวาดครั้งเดียว แล้วแปะเฉพาะส่วนที่อยู่ในจอ
// แสงเรืองเป็นสไปรต์ที่อบไว้ในภาพแล้ว ไม่มี shadowBlur / filter ระหว่างเล่นเลย
// ประกายลอยใช้ชุดอนุภาคขนาดคงที่ 22 ชิ้น หมุนใช้ซ้ำ ไม่สร้าง/ทิ้งกลางรอบ
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from '../../config.js';
import { stageById } from '../../stages.js';
import { drawCaveBackdrop, warmCaveArt } from '../cave.js';

const { W, H } = VIEW;

// จานสีของทางเข้า — หินม่วงเทา + คริสตัลสามเฉด (ฟ้า ม่วง ชมพู) ที่เข้ากับจานสีด่านถ้ำ
const C = {
  rockA: '#4A3E68',
  rockB: '#3A3057',
  rockC: '#2A2242',
  rockHi: '#6A5C8E',
  rockLo: '#1C1630',
  ice: '#7FE8FF',
  iceDeep: '#2E9FD0',
  violet: '#A98CFF',
  violetDeep: '#6A4FD0',
  rose: '#FF9AD5',
  roseDeep: '#C05CA0',
  pale: '#DFF6FF',
};

function hash(n) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

// ─────────────────────────────────────────────────────────────
// สไปรต์แคช
// ─────────────────────────────────────────────────────────────
const SPR = {};

function sprite(key, w, h, paint) {
  if (SPR[key]) return SPR[key];
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w);
  cv.height = Math.ceil(h);
  paint(cv.getContext('2d'), w, h);
  SPR[key] = cv;
  return cv;
}

// ── คริสตัลหนึ่งแท่ง ──
// วาดในกรอบ 96x160 ปลายแหลมอยู่ข้างบน ฐานอยู่ข้างล่าง (ของที่งอกจากเพดานพลิกกลับเอาตอนวาด)
// สามเหลี่ยมสองชิ้นซ้อนกันให้เห็นเหลี่ยม + แถบไฮไลต์ + แสงเรืองอบไว้ในสไปรต์เลย
const CRYSTAL_KINDS = [
  { main: C.ice, deep: C.iceDeep, lite: C.pale },
  { main: C.violet, deep: C.violetDeep, lite: '#E7DBFF' },
  { main: C.rose, deep: C.roseDeep, lite: '#FFE1F4' },
  { main: '#8FF3D8', deep: '#2FA795', lite: '#DDFFF5' },
  { main: C.ice, deep: C.violetDeep, lite: C.pale },
];

function crystal(i) {
  const k = CRYSTAL_KINDS[i % CRYSTAL_KINDS.length];
  return sprite(`cry${i % CRYSTAL_KINDS.length}`, 96, 160, (g, w, h) => {
    // แสงเรืองรอบแท่ง — อบไว้ในสไปรต์ ไม่ต้องสร้างเกรเดียนต์ทุกเฟรมตอนเล่น
    const glowG = g.createRadialGradient(w / 2, h * 0.55, 4, w / 2, h * 0.55, w * 0.62);
    glowG.addColorStop(0, hexA(k.main, 0.5));
    glowG.addColorStop(0.45, hexA(k.main, 0.18));
    glowG.addColorStop(1, hexA(k.main, 0));
    g.fillStyle = glowG;
    g.fillRect(0, 0, w, h);

    const tipY = 8;
    const baseY = h - 6;
    // หน้าแท่งด้านสว่าง
    g.fillStyle = k.main;
    g.beginPath();
    g.moveTo(w / 2, tipY);
    g.lineTo(w * 0.72, h * 0.34);
    g.lineTo(w * 0.66, baseY);
    g.lineTo(w * 0.36, baseY);
    g.lineTo(w * 0.28, h * 0.34);
    g.closePath();
    g.fill();
    // เหลี่ยมด้านเงา
    g.fillStyle = k.deep;
    g.beginPath();
    g.moveTo(w / 2, tipY);
    g.lineTo(w * 0.72, h * 0.34);
    g.lineTo(w * 0.66, baseY);
    g.lineTo(w / 2, baseY);
    g.closePath();
    g.fill();
    // แถบไฮไลต์ตามความยาว
    g.fillStyle = hexA(k.lite, 0.85);
    g.beginPath();
    g.moveTo(w / 2, tipY + 6);
    g.lineTo(w * 0.44, h * 0.4);
    g.lineTo(w * 0.47, baseY - 4);
    g.lineTo(w * 0.53, baseY - 4);
    g.closePath();
    g.fill();
    // ขอบเส้นบาง ๆ ให้แท่งไม่จมไปกับหิน
    g.strokeStyle = hexA(k.lite, 0.5);
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(w / 2, tipY);
    g.lineTo(w * 0.72, h * 0.34);
    g.lineTo(w * 0.66, baseY);
    g.stroke();
  });
}

/** สีฐานสิบหกกับค่าโปร่ง — ใช้กับสไปรต์เท่านั้น (คิดครั้งเดียวตอนสร้าง) */
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** ก้อนหินฟู ๆ สำหรับก่อเป็นภูเขา/ผนัง — วงกลมซ้อนสามโทน */
function rock(dark) {
  return sprite(dark ? 'rockDark' : 'rock', 160, 160, (g) => {
    const tones = dark ? [C.rockLo, C.rockC, C.rockB] : [C.rockC, C.rockB, C.rockA];
    const blobs = [
      [80, 94, 60, 0], [44, 98, 38, 0], [118, 100, 40, 0],
      [58, 62, 36, 1], [104, 60, 38, 1], [80, 42, 32, 2], [38, 72, 24, 2], [124, 78, 24, 2],
    ];
    for (const [x, y, r, t] of blobs) {
      g.fillStyle = tones[t];
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    // รอยแตกบาง ๆ ให้ผิวหินไม่เรียบเป็นก้อนเดียว
    g.strokeStyle = dark ? 'rgba(10,8,20,.5)' : 'rgba(20,14,40,.45)';
    g.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const x = 30 + hash(i * 5.1) * 100;
      const y = 40 + hash(i * 9.7) * 80;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 14 - hash(i) * 28, y + 24 + hash(i * 3) * 20);
      g.stroke();
    }
  });
}

/** แสงนุ่มวงกลม — ใช้ทั้งแสงปากถ้ำ แสงคริสตัล และแสงพื้น */
function glow() {
  return sprite('caveGlow', 256, 256, (g, w, h) => {
    const rad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    rad.addColorStop(0, 'rgba(160,240,255,.85)');
    rad.addColorStop(0.4, 'rgba(120,200,255,.3)');
    rad.addColorStop(1, 'rgba(120,200,255,0)');
    g.fillStyle = rad;
    g.fillRect(0, 0, w, h);
  });
}


// ─────────────────────────────────────────────────────────────
// ประกายลอยในอากาศ — ชุดคงที่ หมุนใช้ซ้ำ ไม่สร้างของใหม่กลางรอบ
// ─────────────────────────────────────────────────────────────
const MOTES = Array.from({ length: 22 }, (_, i) => ({
  x: hash(i * 1.7) * W,
  y: hash(i * 3.1) * GROUND_Y,
  s: 0.5 + hash(i * 5.9) * 1.6,
  vy: -(0.12 + hash(i * 7.3) * 0.22),
  vx: (hash(i * 9.1) - 0.5) * 0.25,
  k: i % CRYSTAL_KINDS.length,
  front: i % 3 === 0,
}));

function stepMotes(active) {
  if (!active) return;
  for (const p of MOTES) {
    p.y += p.vy;
    p.x += p.vx;
    if (p.y < -10) { p.y = GROUND_Y + 10; p.x = hash(p.x) * W; }
    if (p.x < -10) p.x = W + 10;
    if (p.x > W + 10) p.x = -10;
  }
}

function drawMotes(ctx, v, front) {
  const a = v.inside * (1 - v.facadeOut);
  if (a <= 0.02) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of MOTES) {
    if (p.front !== front) continue;
    const tw = 0.55 + 0.45 * Math.sin(v.tick * 0.07 + p.x);
    ctx.globalAlpha = a * 0.7 * tw;
    ctx.fillStyle = CRYSTAL_KINDS[p.k].lite;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ชั้นแคช — ตัวภูเขา (พร้อมปากถ้ำ) กับผนังอุโมงค์
// เหตุผลเดียวกับ garden.js: ของพวกนี้ไม่ขยับเลย แต่มีชิ้นส่วนหลายร้อยชิ้น
// วาดสดทุกเฟรมจะหนักที่สุดตอนภูเขากับอุโมงค์ซ้อนกันในเฟรมเดียว
// ─────────────────────────────────────────────────────────────
const PAD = 140;
const TOP = 40;
let CACHE = null;

function layerScale(ctx) {
  const t = ctx.getTransform();
  return Math.min(2, Math.max(1, Math.round(Math.hypot(t.a, t.b) * 4) / 4));
}

function localMarks(layout) {
  const houseL = PAD;
  const doorIn = houseL + layout.houseLead;
  const doorOut = doorIn + layout.interior;
  return { houseL, doorIn, doorOut, houseR: doorOut + layout.frame };
}

/** โพรงปากถ้ำ — ทรงธรรมชาติ ไม่ใช่สามเหลี่ยม ใช้ทั้งตอนเจาะรูและตอนวาดขอบ */
const MOUTH_W = 286;
const MOUTH_TOP = 34;      // ปากถ้ำสูงเกือบเต็มจอ — ต้องรู้สึกว่า "วิ่งเข้าไปในภูเขา"

/**
 * เส้นรอบโพรงปากถ้ำ — ต่อลงใน path ที่เปิดค้างอยู่ ไม่เริ่ม path ใหม่เอง
 *
 * ── ทำไมต้องแยกเป็นสองตัว ──
 * ตอนใช้เจาะรูในกรอบ clip ต้องต่อรูปนี้ "ต่อท้าย" สี่เหลี่ยมของอุโมงค์ในเส้นเดียวกัน
 * ถ้าเผลอเรียก beginPath ตรงนี้ สี่เหลี่ยมจะหายไป เหลือแต่รู แล้วทั้งอุโมงค์จะไม่ถูกวาดเลย
 * (เจอมาแล้ว — ข้างในถ้ำโล่งเห็นฉากเดิมทั้งช่วง)
 */
function mouthShape(g, x, top) {
  const b = GROUND_Y + 6;
  g.moveTo(x, b);
  g.bezierCurveTo(x + 6, top + 120, x + 34, top + 24, x + MOUTH_W * 0.34, top + 6);
  g.bezierCurveTo(x + MOUTH_W * 0.58, top - 10, x + MOUTH_W * 0.78, top + 30, x + MOUTH_W * 0.9, top + 86);
  g.bezierCurveTo(x + MOUTH_W * 0.98, top + 150, x + MOUTH_W, b - 60, x + MOUTH_W, b);
  g.closePath();
}

/** โพรงปากถ้ำเป็น path เดี่ยว ๆ (เริ่ม path ใหม่) — ใช้ตอนถมสี */
function mouthPath(g, x, top) {
  g.beginPath();
  mouthShape(g, x, top);
}

function buildLayers(layout, scale) {
  const lm = localMarks(layout);
  const make = (w, h, paint) => {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * scale);
    cv.height = Math.ceil(h * scale);
    const g = cv.getContext('2d');
    g.scale(scale, scale);
    paint(g);
    return { cv, w, h, s: scale };
  };
  const mountW = lm.houseR + PAD;
  const mount = make(mountW, GROUND_Y + TOP + 12, (g) => { g.translate(0, TOP); paintMountain(g, lm); });
  const wall = make(layout.interior + PAD * 2, H, (g) => {
    g.translate(PAD - lm.doorIn, 0);
    paintTunnel(g, lm);
  });
  return { key: `${scale}|${layout.interior}|${layout.houseLead}`, mount, wall };
}

function layers(ctx, m) {
  const layout = {
    houseLead: m.doorIn - m.houseL,
    interior: m.doorOut - m.doorIn,
    frame: m.houseR - m.doorOut,
  };
  const scale = layerScale(ctx);
  const key = `${scale}|${layout.interior}|${layout.houseLead}`;
  if (!CACHE || CACHE.key !== key) CACHE = buildLayers(layout, scale);
  return CACHE;
}

export function warmCavernArt(_ctx, layout, scale = 1) {
  // สร้างสไปรต์ที่ใช้บ่อยกับชั้นแคชไว้ก่อนภูเขาโผล่เข้าจอ เฟรมแรกที่เห็นจะได้ไม่สะดุด
  warmCaveArt();
  glow();
  rock(false);
  rock(true);
  for (let i = 0; i < CRYSTAL_KINDS.length; i++) crystal(i);
  const s = Math.min(2, Math.max(1, Math.round(scale * 4) / 4));
  CACHE = buildLayers(layout, s);
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
// เนื้อภาพของชั้นแคช (เรียกครั้งเดียวตอนสร้าง ไม่ได้เรียกทุกเฟรม)
// ─────────────────────────────────────────────────────────────

/** ภูเขาหินทั้งลูกพร้อมปากถ้ำ + คริสตัลที่แทงออกมาจากหิน */
function paintMountain(g, m) {
  const rockLite = rock(false);
  const rockDark = rock(true);

  // เนื้อภูเขาทึบ แล้วขอบบนเป็นคลื่นก้อนหิน
  g.fillStyle = C.rockA;
  g.fillRect(m.houseL + 40, 70, m.houseR - m.houseL - 80, GROUND_Y - 70);
  const bump = (wx) => 46 + Math.sin(wx * 0.009) * 30 + hash(Math.round(wx / 90)) * 22;
  for (let wx = m.houseL - 40; wx < m.houseR + 40; wx += 74) {
    const top = bump(wx);
    const edge = Math.min(wx - m.houseL, m.houseR - wx);
    const drop = edge < 170 ? (170 - edge) * 0.85 : 0;
    g.drawImage(rockLite, wx - 40, top + drop - 40, 150, 150);
  }
  // ไล่เงาลงล่าง ให้ภูเขาดูมีมวล ไม่ใช่แผ่นสีเดียว
  // source-atop = ทาเฉพาะตรงที่มีเนื้อภูเขาอยู่แล้ว ถ้าทาทับสี่เหลี่ยมเปล่า ๆ
  // พื้นที่โปร่งข้าง ๆ ภูเขาจะติดฝ้าขาวเป็นสี่เหลี่ยมลอยอยู่กลางฟ้า (เจอมาแล้ว)
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const sh = g.createLinearGradient(0, 60, 0, GROUND_Y);
  sh.addColorStop(0, 'rgba(255,255,255,.06)');
  sh.addColorStop(1, 'rgba(10,6,24,.5)');
  g.fillStyle = sh;
  g.fillRect(m.houseL - 60, 0, m.houseR - m.houseL + 120, GROUND_Y + 40);
  g.restore();

  // จุดเริ่มปากถ้ำ — เยื้องซ้ายจากประตูเล็กน้อย ตัวแมวจึงลอดเข้าตรงกลางช่องพอดี
  const mx = m.doorIn - MOUTH_W * 0.42;

  // ── ลำดับสำคัญ: ก้อนหินขอบมาก่อน ความมืดข้างในมาทีหลัง ──
  // ก้อนหินแต่ละก้อนกว้าง 160px ถ้าวาดทับทีหลังมันจะล้นเข้าไปกลบปากถ้ำจนไม่เหลือช่องให้เห็น
  // (เจอมาแล้ว — ภูเขาเป็นก้อนดำทึบ มองไม่ออกว่าตรงไหนคือทางเข้า)
  // ขอบปากถ้ำหนา ๆ ด้วยก้อนหินเรียงตามเส้นโพรง
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const a = Math.PI * (0.05 + t * 0.9);
    const rx = MOUTH_W * 0.66;
    const ry = (GROUND_Y - MOUTH_TOP) * 0.62;
    const cx = mx + MOUTH_W / 2 - Math.cos(a) * rx;
    const cy = GROUND_Y - 10 - Math.sin(a) * ry;
    const s = 0.5 + hash(i * 3.3) * 0.34;
    g.drawImage(i % 2 ? rockDark : rockLite, cx - 80 * s, cy - 80 * s, 160 * s, 160 * s);
  }

  // ── ปากถ้ำ ──
  // ถมทึบด้วยสีของข้างในถ้ำ ไม่ใช่เจาะรูทะลุ — ตอนยังอยู่ข้างนอกเกมยังไม่สลับฉาก
  // ถ้าเจาะทะลุจะเห็น "ฉากเดิม" (ท้องฟ้าของด่านก่อน) ผ่านรูแทนที่จะเห็นความมืดของถ้ำ
  // พอเข้าไปแล้วผนังหน้าจะจางหายเอง แล้วเห็นอุโมงค์จริงที่วาดอยู่ข้างหลัง (ดู drawCavernBack)
  g.save();
  mouthPath(g, mx, MOUTH_TOP);
  g.clip();
  // ── ข้างในต้องเข้มกว่าเนื้อหินชัด ๆ ──
  // ถ้าเข้มพอ ๆ กัน ปากถ้ำจะจมหายไปกับภูเขา อ่านไม่ออกว่าตรงไหนคือ "ทางเข้า"
  // ดำเกือบสนิทด้านบน แล้วสว่างขึ้นเป็นฟ้าเรืองตรงพื้น = แสงคริสตัลจากข้างใน
  const deep = g.createLinearGradient(0, MOUTH_TOP, 0, GROUND_Y);
  deep.addColorStop(0, '#07050F');
  deep.addColorStop(0.55, '#100C24');
  deep.addColorStop(1, '#241E4E');
  g.fillStyle = deep;
  g.fillRect(mx - 20, MOUTH_TOP - 20, MOUTH_W + 40, GROUND_Y + 40);
  g.drawImage(glow(), mx + MOUTH_W * 0.5 - 150, GROUND_Y - 180, 300, 300);
  // คริสตัลที่เห็นลาง ๆ อยู่ข้างในปากถ้ำ บอกว่าข้างในมีอะไรรออยู่
  for (let i = 0; i < 4; i++) {
    const s = 0.4 + hash(i * 6.1) * 0.35;
    drawCrystal(g, i + 1, mx + 40 + hash(i * 2.4) * (MOUTH_W - 80), GROUND_Y - 6, s, (hash(i) - 0.5) * 0.4);
  }
  g.restore();

  // ขอบในของปากถ้ำเรืองแสงฟ้าจาง ๆ — เส้นเดียวที่ทำให้สายตาจับได้ทันทีว่านี่คือ "ทางเข้า"
  g.save();
  g.strokeStyle = 'rgba(150,230,255,.5)';
  g.lineWidth = 5;
  mouthPath(g, mx, MOUTH_TOP);
  g.stroke();
  g.strokeStyle = 'rgba(220,250,255,.28)';
  g.lineWidth = 1.6;
  g.stroke();
  g.restore();

  // ── คริสตัลโตออกมาจากภูเขา ──
  // เพดานปากถ้ำ (ห้อยลง) / ขอบสองข้าง (เอียงออก) / พื้นหน้าเขา (ตั้งขึ้น)
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const x = mx + 24 + t * (MOUTH_W - 48);
    const y = MOUTH_TOP + 26 + Math.sin(t * Math.PI) * -14 + hash(i * 2.7) * 16;
    const s = 0.4 + hash(i * 5.1) * 0.34;
    drawCrystal(g, i, x, y, s, Math.PI + (hash(i) - 0.5) * 0.5);
  }
  for (let i = 0; i < 9; i++) {
    const side = i % 2 ? 1 : -1;
    const x = mx + MOUTH_W / 2 + side * (MOUTH_W * 0.52 + hash(i * 4.2) * 30);
    const y = 90 + hash(i * 6.6) * (GROUND_Y - 150);
    const s = 0.45 + hash(i * 8.8) * 0.5;
    drawCrystal(g, i + 1, x, y, s, side * (0.7 + hash(i) * 0.5));
  }
  for (let i = 0; i < 10; i++) {
    const x = m.houseL - 90 + hash(i * 3.9) * (m.doorIn - m.houseL + 120);
    const s = 0.34 + hash(i * 7.1) * 0.5;
    drawCrystal(g, i + 2, x, GROUND_Y + 6, s, (hash(i * 2.1) - 0.5) * 0.45);
  }
  // คริสตัลฝั่งขวาของภูเขา (หลังประตูออก) — เห็นตอนมองย้อนกลับ
  for (let i = 0; i < 5; i++) {
    const x = m.doorOut + 10 + hash(i * 5.5) * 120;
    const s = 0.4 + hash(i * 9.3) * 0.4;
    drawCrystal(g, i, x, GROUND_Y + 6, s, (hash(i) - 0.5) * 0.4);
  }
}

/**
 * ผนังอุโมงค์ทั้งเส้น — เพดานหิน พื้นหิน คริสตัลสองข้าง และช่วงท้ายที่เปิดเป็นโถงกว้าง
 * แกน x เป็นพิกัดโลกของทางเข้า (ผู้เรียกเลื่อนระบบพิกัดให้แล้ว)
 */
function paintTunnel(g, m) {
  const span = m.doorOut - m.doorIn;
  const rockLite = rock(false);
  const rockDark = rock(true);
  // ── ความสูงของโพรง ──
  // ช่วงแรกแคบ (เพดานต่ำ) → ค่อย ๆ เปิดสูงขึ้นในช่วงท้าย = โถงถ้ำ (จุด WOW)
  const ceilAt = (t) => {
    const open = t < 0.55 ? 0 : (t - 0.55) / 0.45;
    return 96 - open * 78 - Math.sin(t * 9) * 8;
  };
  const floorAt = (t) => GROUND_Y + 2 + Math.sin(t * 7 + 1) * 4;

  // เพดาน: ก้อนหินเรียงตามเส้นโค้ง แล้วถมทึบขึ้นไปจนพ้นขอบจอ
  for (let x = m.doorIn - 60; x < m.doorOut + 60; x += 62) {
    const t = (x - m.doorIn) / span;
    const y = ceilAt(t);
    g.fillStyle = C.rockC;
    g.fillRect(x - 40, -40, 120, y + 30);
    g.drawImage(hash(x) > 0.5 ? rockLite : rockDark, x - 50, y - 96, 150, 150);
  }
  // พื้นถ้ำ: ปิดพื้นของฉากไว้ด้วย (สีพื้นฉากเปลี่ยนตอนสลับ ในอุโมงค์ต้องไม่เปลี่ยนตาม)
  g.fillStyle = C.rockC;
  g.fillRect(m.doorIn - 60, GROUND_Y, span + 120, H - GROUND_Y);
  g.fillStyle = C.rockA;
  g.fillRect(m.doorIn - 60, GROUND_Y, span + 120, 7);
  for (let x = m.doorIn - 40; x < m.doorOut + 40; x += 58) {
    const t = (x - m.doorIn) / span;
    g.drawImage(rockDark, x - 46, floorAt(t) - 20, 130, 130);
  }

  // ── หินย้อยจากเพดาน / หินงอกจากพื้น ──
  for (let i = 0; i < 26; i++) {
    const t = hash(i * 1.9);
    const x = m.doorIn + t * span;
    const y = ceilAt(t);
    const len = 26 + hash(i * 4.7) * 54;
    const wide = 12 + hash(i * 6.1) * 14;
    g.fillStyle = i % 3 ? C.rockB : C.rockA;
    g.beginPath();
    g.moveTo(x - wide / 2, y - 6);
    g.lineTo(x + wide / 2, y - 6);
    g.lineTo(x + (hash(i) - 0.5) * 8, y + len);
    g.closePath();
    g.fill();
  }
  for (let i = 0; i < 14; i++) {
    const t = hash(i * 8.3);
    const x = m.doorIn + t * span;
    const len = 18 + hash(i * 2.3) * 30;
    const wide = 14 + hash(i * 5.5) * 16;
    g.fillStyle = i % 2 ? C.rockB : C.rockC;
    g.beginPath();
    g.moveTo(x - wide / 2, GROUND_Y + 2);
    g.lineTo(x + wide / 2, GROUND_Y + 2);
    g.lineTo(x, GROUND_Y - len);
    g.closePath();
    g.fill();
  }

  // ── คริสตัลในอุโมงค์ ──
  // กระจายด้วย hash ไม่เรียงเป็นแพตเทิร์น และยิ่งลึกยิ่งเยอะ/ยิ่งใหญ่ (ดู t ในสูตรขนาด)
  // ── คริสตัลที่พื้นต้องเตี้ยกว่าหัวแมว ──
  // ทางวิ่งอยู่ราว 120px เหนือพื้น ของที่สูงกว่านั้นจะบังตัวน้องกับของกินจนอ่านเกมยาก
  // แท่งที่พื้นจึงคุมไม่ให้สูงเกิน ~96px (สเกล 0.6) ส่วนแท่งใหญ่ ๆ ไปห้อยเพดานแทน
  const FLOOR_MAX = 0.6;
  for (let i = 0; i < 34; i++) {
    const t = hash(i * 1.37);
    const x = m.doorIn + t * span;
    const deep = 0.5 + t;               // ลึกขึ้น = ใหญ่ขึ้น
    const onCeil = hash(i * 3.7) > 0.42;
    if (onCeil) {
      const s = (0.26 + hash(i * 9.1) * 0.55) * deep;
      drawCrystal(g, i, x, ceilAt(t) + 10 + hash(i * 2.9) * 26, s, Math.PI + (hash(i) - 0.5) * 0.6);
    } else {
      const s = Math.min(FLOOR_MAX, (0.2 + hash(i * 9.1) * 0.34) * deep);
      drawCrystal(g, i + 3, x, GROUND_Y + 4, s, (hash(i * 4.4) - 0.5) * 0.5);
    }
  }
  // กลุ่มคริสตัลประจำจุด — สองกลุ่ม ไล่ใหญ่ขึ้นตามความลึก ("ยิ่งเข้าไปยิ่งอลัง")
  // วางชิดขอบล่างของจอ สูงไม่เกินหัวแมว จึงเป็นฉากหลัง ไม่ใช่ของที่บังทางวิ่ง
  for (const [t, s] of [[0.34, 0.5], [0.66, 0.62]]) {
    const x = m.doorIn + t * span;
    for (let k = 0; k < 5; k++) {
      const off = (k - 2) * 30;
      drawCrystal(g, k + 1, x + off, GROUND_Y + 8, s * (0.7 + hash(k * 3.1) * 0.4), (k - 2) * 0.16);
    }
  }
}

/** วาดคริสตัลหนึ่งแท่ง ฐานอยู่ที่ (x, y) หมุน rot เรเดียน (Math.PI = ห้อยจากเพดาน) */
function drawCrystal(g, i, x, y, s, rot) {
  const img = crystal(i);
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.drawImage(img, -48 * s, -152 * s, 96 * s, 160 * s);
  g.restore();
}

// ─────────────────────────────────────────────────────────────
// ชั้นหลัง (วาดหลังพื้น ก่อนของกินและตัวละคร)
// ─────────────────────────────────────────────────────────────
export function drawCavernBack(ctx, v) {
  const { m, camera: cam } = v;
  const onScreen = !(m.houseR + 140 - cam < 0 || m.houseL - 260 - cam > W);
  stepMotes(onScreen && v.px > m.doorIn - 200 && v.px < m.doorOut + 200);
  if (!onScreen) return;

  drawApproach(ctx, v);

  // ชั้นที่แทบมองไม่เห็นแล้วข้ามไป (กฎเดียวกับทางเข้าสวน) — เฟรมที่หนักสุดคือตอนซ้อนกัน
  const insideShown = v.facadeIn < 0.9 && v.facadeOut < 0.9;
  if (insideShown) drawTunnel(ctx, v);
  if (v.facadeIn > 0.1) drawMountain(ctx, v, v.facadeIn);
  else if (v.facadeOut > 0.1) drawMountain(ctx, v, v.facadeOut);
  drawMotes(ctx, v, false);
}

/** เชิงเขาก่อนถึงปากถ้ำ — ก้อนหินกับคริสตัลเล็ก ๆ ผุดจากพื้น บอกล่วงหน้าว่ากำลังจะเข้าถ้ำ */
function drawApproach(ctx, v) {
  const { m, camera: cam, near } = v;
  const from = Math.max(m.houseL - 560, cam - 60);
  const to = Math.min(m.houseL + 60, cam + W + 60);
  for (let wx = Math.ceil(from / 46) * 46; wx < to; wx += 46) {
    const h = hash(wx);
    if (h < 0.42) continue;
    const s = 0.18 + h * 0.26;
    drawCrystal(ctx, (wx / 46) | 0, wx - cam, GROUND_Y + 4, s, (hash(wx * 0.7) - 0.5) * 0.5);
  }
  // แสงจากปากถ้ำสาดออกมาบนพื้น — เข้มขึ้นเมื่อเข้าใกล้
  ctx.save();
  ctx.globalAlpha = (0.16 + near * 0.4) * v.facadeIn;
  ctx.drawImage(glow(), m.doorIn - 150 - cam, GROUND_Y - 110, 320, 220);
  ctx.restore();
}

/** ตัวภูเขาด้านนอก — ชั้นแคชล้วน ๆ */
function drawMountain(ctx, v, alpha) {
  const { m, camera: cam } = v;
  ctx.save();
  ctx.globalAlpha = alpha;
  blit(ctx, layers(ctx, m).mount, m.houseL - PAD, cam, -TOP);
  ctx.restore();
}

/**
 * ข้างในอุโมงค์ — วิวถ้ำไกล · ผนังแคช · ไล่แสงจากมืดเป็นแสงคริสตัล · โถงถ้ำช่วงท้าย
 */
function drawTunnel(ctx, v) {
  const { m, camera: cam } = v;
  const a = Math.max(-20, m.doorIn - cam);
  const b = Math.min(W + 20, m.doorOut - cam);
  if (b <= a) return;
  const span = m.doorOut - m.doorIn;
  const exitX = m.doorOut - 120 - cam;

  ctx.save();
  ctx.beginPath();
  ctx.rect(a, -20, b - a, H + 40);
  // ปากทางออก: เจาะรูให้มองทะลุไปเห็นฉากจริง (ตอนนั้นสลับฉากไปแล้ว)
  // ต้องใช้ mouthShape ที่ไม่เริ่ม path ใหม่ ไม่งั้นสี่เหลี่ยมข้างบนจะหายไปทั้งอัน
  mouthShape(ctx, exitX, MOUTH_TOP + 40);
  ctx.clip('evenodd');

  // 1) วิวถ้ำไกล = ฉากหลังของด่านถ้ำจริงทั้งผืน (render/cave.js)
  // เดิมเป็นลายวนของตัวเอง ซึ่งแปลว่าภาพในอุโมงค์กับภาพหลังออกอุโมงค์เป็นคนละโลก
  // เรียกตัวเดียวกันแล้วผู้เล่นจะเห็น "ถ้ำเดียวกัน" ตั้งแต่ยังอยู่ในอุโมงค์
  drawCaveBackdrop(ctx, cam, v.tick, { deep: v.inside });

  // 2) ผนัง เพดาน พื้น คริสตัล — ชั้นแคชเดียว
  blit(ctx, layers(ctx, m).wall, m.doorIn - PAD, cam, 0);

  // 3) ── ไล่แสง ──
  // ช่วงแรกมืดลงกว่าข้างนอก (ม่านน้ำเงินเข้ม) แล้วจางลงเมื่อแสงคริสตัลขึ้นมาแทน
  // ไม่มืดสนิทเด็ดขาด — ผู้เล่นต้องเห็นพื้น ของกิน และสิ่งกีดขวางตลอด
  const u = v.inside;
  const dim = Math.max(0, 0.42 * Math.sin(Math.min(1, u / 0.5) * Math.PI * 0.5) * (1 - u * 0.7));
  if (dim > 0.01) {
    ctx.fillStyle = `rgba(10,14,40,${dim})`;
    ctx.fillRect(a, -20, b - a, H + 40);
  }

  // 4) แสงคริสตัลเป็นแหล่งแสงหลักช่วงหลัง — ดวงใหญ่ไม่กี่ดวงพอ (เบากว่าต่อดวงต่อคริสตัล)
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const t = 0.12 + i * 0.16;
    const wx = m.doorIn + span * t;
    const x = wx - cam;
    if (x < -240 || x > W + 240) continue;
    const pulse = 0.72 + 0.28 * Math.sin(v.tick * 0.03 + i * 1.7);
    ctx.globalAlpha = Math.min(0.5, (0.1 + u * 0.5) * pulse);
    const r = 150 + i * 26;
    ctx.drawImage(glow(), x - r, GROUND_Y - r * 0.9, r * 2, r * 1.6);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  // 5) โถงถ้ำช่วงท้าย — ยอดคริสตัลยักษ์ที่เห็นได้เฉพาะตอนเพดานเปิดสูงแล้ว (จุด WOW)
  if (u > 0.5) {
    const k = Math.min(1, (u - 0.5) / 0.35);
    ctx.save();
    ctx.globalAlpha = k;
    for (let i = 0; i < 5; i++) {
      const wx = m.doorIn + span * (0.62 + i * 0.09);
      const x = wx - cam;
      if (x < -200 || x > W + 200) continue;
      const s = 1.5 + hash(i * 6.2) * 1.1;
      drawCrystal(ctx, i + 2, x, GROUND_Y - 6, s, (hash(i * 3.3) - 0.5) * 0.3);
    }
    ctx.restore();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ชั้นหน้า (วาดหลังตัวละคร)
// ─────────────────────────────────────────────────────────────
export function drawCavernFront(ctx, v) {
  const { m, camera: cam, tick } = v;
  if (m.houseR + 140 - cam < 0 || m.houseL - 260 - cam > W) return;

  const inside = (1 - v.facadeIn) * (1 - v.facadeOut);
  if (inside > 0) {
    ctx.save();
    ctx.globalAlpha = inside;
    const span = m.doorOut - m.doorIn;
    // คริสตัลหน้าสุด — ใหญ่จนบางส่วนพ้นขอบจอ ทำให้รู้สึกว่าถ้ำใหญ่กว่าที่เห็น
    // อยู่สูงพ้นหัวตอนกระโดด กับต่ำกว่าระดับเท้า จึงไม่บังทางวิ่ง
    for (let i = 0; i < 6; i++) {
      const wx = m.doorIn + span * (0.08 + i * 0.17);
      const x = wx - cam;
      if (x < -260 || x > W + 260) continue;
      const top = i % 2 === 0;
      const s = 1.15 + hash(i * 4.9) * 0.85;
      if (top) drawCrystal(ctx, i, x, -30, s, Math.PI + (hash(i) - 0.5) * 0.3);
      else drawCrystal(ctx, i + 1, x, H + 26, s, (hash(i * 2.2) - 0.5) * 0.3);
    }
    // ประกายวาววับตรงปลายคริสตัลบางแท่ง
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const wx = m.doorIn + span * (0.14 + i * 0.19);
      const x = wx - cam;
      if (x < -20 || x > W + 20) continue;
      const tw = Math.max(0, Math.sin(tick * 0.06 + i * 2.1));
      ctx.globalAlpha = inside * tw * 0.8;
      sparkle(ctx, x, 60 + hash(i * 7.7) * 180, 6 + tw * 8);
    }
    ctx.restore();
  }

  // ขอบปากถ้ำหน้าสุด — หินซ้อนสูงเต็มจอ แมวลอดผ่านหลังมันจริง
  rim(ctx, m.doorIn - 52 - cam, tick);
  rim(ctx, m.doorOut + 6 - cam, tick);
  drawMotes(ctx, v, true);
}

/** ประกายสี่แฉก — ใช้ตอนคริสตัลวาววับ */
function sparkle(ctx, x, y, r) {
  ctx.fillStyle = C.pale;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/** เสาหินขอบปากถ้ำ พร้อมคริสตัลเกาะ — กว้างราว 80px เท่าทางเข้าสวน (มุดเข้าไปราว 0.2 วิ) */
function rim(ctx, x, tick) {
  if (x > W + 70 || x + 110 < 0) return;
  const rk = rock(true);
  for (let y = -40; y < H + 20; y += 46) {
    const wob = Math.sin(y * 0.05) * 3;
    ctx.drawImage(rk, x - 24 + wob, y - 24, 86, 86);
  }
  for (let k = 0; k < 4; k++) {
    const s = 0.5 + (k % 2) * 0.25;
    const tw = 0.85 + 0.15 * Math.sin(tick * 0.05 + k);
    ctx.save();
    ctx.globalAlpha = tw;
    drawCrystal(ctx, k + 1, x + 18, 70 + k * 96, s, (k % 2 ? 0.5 : -0.5));
    ctx.restore();
  }
}
