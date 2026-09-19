// src/render/gates/garden.js
// ─────────────────────────────────────────────────────────────
// ภาพทางเข้า "สวนกลางวัน" — พุ่มดอกไม้ยักษ์ → อุโมงค์ดอกไม้ → เห็นสวนข้างหลังทีละน้อย
//
// ต่างจากร้านขนม (kitchen.js) ตรงที่ไม่มีผนังแข็ง ทุกอย่างคือ "กลุ่มใบไม้" ที่ซ้อนกัน:
//   ข้างนอก   พุ่มก้อนใหญ่ปิดจอสูงเกือบถึงขอบบน มีปากอุโมงค์เป็นช่องแสงสว่าง
//   ข้างใน    ผนังใบไม้ด้านหลังเป็นกริดก้อนใบไม้ ยิ่งเข้าลึก ก้อนยิ่งหายเป็นช่อง
//             ช่องพวกนั้นมองทะลุไปเห็น "วิวสวน" ที่วาดไว้ในไฟล์นี้เอง (ไม่ใช่ฉากจริงของเกม)
//             เพราะตอนนั้นเกมยังไม่ได้สลับฉาก ถ้าเปิดให้เห็นฉากจริงจะเห็นฉากเก่าโผล่
//             วิวสวนใช้สีฟ้า/เนินจากจานสีของด่านสวนตรง ๆ ออกจากอุโมงค์แล้วจึงต่อกับฉากจริงพอดี
//   ปากทางออก เจาะรูมองทะลุไปเห็นฉากจริง (สลับฉากไปแล้วตอนนั้น ดู gates.js เรื่องช่วงปิดจอ)
//
// ประสิทธิภาพ: ไม่มีดอกไม้/ใบไม้เป็นอ็อบเจกต์ถาวรเลย ตำแหน่งทุกชิ้นคิดจากพิกัดโลกด้วย hash
// ภาพทุกแบบเป็นสไปรต์แคช (ก้อนใบไม้ 2 โทน, ดอกไม้ 5 แบบ, วิวสวน, ลำแสง) วาดซ้ำด้วย drawImage
// กลีบดอกไม้กับผีเสื้อใช้ชุดอนุภาคขนาดคงที่ ไม่สร้าง/ทิ้งระหว่างเล่น
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from '../../config.js';
import { stageById } from '../../stages.js';
import { drawMeadowBackdrop, warmMeadowArt } from '../meadow.js';

const { W, H } = VIEW;

const C = {
  leafA: '#5FBF6A', leafB: '#7ED67A', leafC: '#3E9A56', leafHi: '#B4EE9A',
  deepA: '#2F6E47', deepB: '#3F8757', deepC: '#245A3B',
  path: '#C9955A', pathDark: '#A8773F', grass: '#79C96C', grassDark: '#4E9E5A',
  vine: '#3E8A4E',
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

/** ก้อนใบไม้ฟู ๆ — วงกลมซ้อนสามโทน + ใบรี + จุดแสง */
function clump(deep) {
  return sprite(deep ? 'clumpDeep' : 'clump', 160, 160, (g) => {
    const tones = deep ? [C.deepC, C.deepA, C.deepB] : [C.leafC, C.leafA, C.leafB];
    const blobs = [
      [80, 92, 58, 0], [46, 96, 36, 0], [116, 98, 38, 0], [60, 62, 34, 1], [104, 60, 36, 1],
      [80, 44, 30, 2], [40, 70, 22, 2], [122, 76, 22, 2],
    ];
    for (const [x, y, r, t] of blobs) {
      g.fillStyle = tones[t];
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = deep ? 'rgba(160,220,150,.18)' : C.leafHi;
    for (let i = 0; i < 9; i++) {
      const a = hash(i * 3.1) * Math.PI * 2;
      const rr = 18 + hash(i * 7.7) * 40;
      g.save();
      g.translate(80 + Math.cos(a) * rr, 76 + Math.sin(a) * rr * 0.8);
      g.rotate(a);
      g.beginPath();
      g.ellipse(0, 0, 7, 3.5, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  });
}

const FLOWER_KINDS = [
  { petal: '#FF8FB8', core: '#FFE38A', n: 5 },
  { petal: '#FFFFFF', core: '#FFC940', n: 8 },
  { petal: '#C7A6FF', core: '#FFF1B8', n: 6 },
  { petal: '#FFB05C', core: '#FF7A5A', n: 5 },
  { petal: '#8FD3FF', core: '#FFFFFF', n: 5 },
];

/** ดอกไม้หนึ่งแบบ ขนาด 64px — วาดย่อขยายเอาตามระยะ */
function flower(i) {
  const k = FLOWER_KINDS[i % FLOWER_KINDS.length];
  return sprite(`flower${i % FLOWER_KINDS.length}`, 64, 64, (g) => {
    g.translate(32, 32);
    g.fillStyle = k.petal;
    g.strokeStyle = 'rgba(80,40,70,.35)';
    g.lineWidth = 1.5;
    for (let p = 0; p < k.n; p++) {
      g.save();
      g.rotate((p / k.n) * Math.PI * 2);
      g.beginPath();
      g.ellipse(0, -15, 9, 15, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.restore();
    }
    g.fillStyle = k.core;
    g.beginPath();
    g.arc(0, 0, 8.5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.beginPath();
    g.arc(-2.5, -2.5, 3, 0, Math.PI * 2);
    g.fill();
  });
}


function sunbeam() {
  return sprite('beam', 120, 300, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,250,210,.55)');
    grad.addColorStop(1, 'rgba(255,250,210,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(w * 0.35, 0);
    g.lineTo(w * 0.65, 0);
    g.lineTo(w, h);
    g.lineTo(w * 0.2, h);
    g.closePath();
    g.fill();
  });
}

/** ปากอุโมงค์: แสงสว่างจากข้างในพุ่ม */
function mouthFill() {
  return sprite('mouth', 140, 200, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h * 0.7, 10, w / 2, h * 0.7, h * 0.8);
    grad.addColorStop(0, '#FFFBE0');
    grad.addColorStop(0.5, '#E6F7B8');
    grad.addColorStop(1, '#8FD68A');
    g.fillStyle = grad;
    mouthPath(g, 0, 0, w, h);
    g.fill();
  });
}

function glow() {
  return sprite('glow', 96, 96, (g, w) => {
    const grad = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,252,220,.9)');
    grad.addColorStop(1, 'rgba(255,252,220,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, w);
  });
}

/** ปากอุโมงค์ทรงโค้งไม่สมมาตรนิด ๆ ให้ดูเป็นธรรมชาติ ไม่ใช่ซุ้มก่ออิฐ */
function mouthPath(g, x, y, w, h) {
  g.beginPath();
  g.moveTo(x, y + h);
  g.bezierCurveTo(x - 6, y + h * 0.35, x + w * 0.22, y, x + w * 0.52, y + 4);
  g.bezierCurveTo(x + w * 0.84, y + 8, x + w + 6, y + h * 0.4, x + w, y + h);
  g.closePath();
}

export function warmGardenArt(_ctx, layout, scale = 1) {
  clump(false); clump(true); warmMeadowArt(); sunbeam(); mouthFill(); glow();
  for (let i = 0; i < FLOWER_KINDS.length; i++) flower(i);
  // ชั้นแคชของพุ่ม/ผนังอุโมงค์ — ใหญ่ที่สุด สร้างตอนนี้แทนที่จะไปสร้างกลางเฟรมที่พุ่มโผล่
  if (layout) {
    const key = `${Math.min(2, Math.max(1, Math.round(scale * 4) / 4))}|${layout.interior}|${layout.houseLead}`;
    if (!CACHE || CACHE.key !== key) CACHE = buildLayers(layout, Math.min(2, Math.max(1, Math.round(scale * 4) / 4)));
  }
}

// ─────────────────────────────────────────────────────────────
// อนุภาค: กลีบดอกไม้ (หลัง/หน้า) กับผีเสื้อ — ขนาดคงที่ ใช้ซ้ำ
// ─────────────────────────────────────────────────────────────
const PETALS = Array.from({ length: 30 }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, spin: 0, s: 1, front: false, c: 0 }));
const FLIES = Array.from({ length: 3 }, (_, i) => ({ off: 0.25 + i * 0.28, y: 150 + i * 40, ph: i * 2.1 }));
let lastTick = -1;

function stepPetals(v, active) {
  const { camera: cam, tick } = v;
  const dt = lastTick < 0 ? 1 : Math.max(0, Math.min(3, tick - lastTick));
  lastTick = tick;
  for (const p of PETALS) {
    if (!p.on) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.spin * dt;
    p.vx += Math.sin(tick * 0.02 + p.c * 3) * 0.01 * dt;
    if (p.y > GROUND_Y + 10 || p.x < cam - 60) p.on = false;
  }
  if (!active) return;
  // ปล่อยใหม่ราว 1 กลีบทุก 9 เฟรม — พอให้เห็นลอยผ่านตลอด ไม่ถึงกับบังทาง
  if ((tick | 0) % 9 === 0) {
    const p = PETALS.find((q) => !q.on);
    if (p) {
      p.on = true;
      p.front = hash(tick) < 0.35;
      p.x = cam + 80 + hash(tick * 1.3) * (W + 120);
      p.y = -10 + hash(tick * 2.1) * 80;
      p.vx = 0.6 + hash(tick * 3.7) * 0.8;      // ลมพัดไปทางขวา
      p.vy = 0.5 + hash(tick * 4.3) * 0.6;
      p.rot = hash(tick) * 6;
      p.spin = (hash(tick * 5.1) - 0.5) * 0.12;
      p.s = p.front ? 1.4 + hash(tick * 6.2) * 0.6 : 0.7 + hash(tick * 6.2) * 0.4;
      p.c = hash(tick * 7.9);
    }
  }
}

function drawPetals(ctx, cam, front) {
  for (const p of PETALS) {
    if (!p.on || p.front !== front) continue;
    ctx.save();
    ctx.translate(p.x - cam, p.y);
    ctx.rotate(p.rot);
    ctx.scale(p.s, p.s * (0.6 + Math.abs(Math.sin(p.rot * 2)) * 0.4));
    ctx.fillStyle = p.c < 0.6 ? '#FF9CC4' : p.c < 0.85 ? '#FFFFFF' : '#FFD37A';
    ctx.globalAlpha = front ? 0.9 : 0.7;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ─────────────────────────────────────────────────────────────
// ชั้นหลัง
// ─────────────────────────────────────────────────────────────
export function drawGardenBack(ctx, v) {
  const { m, camera: cam } = v;
  const onScreen = !(m.houseR + 120 - cam < 0 || m.houseL - 220 - cam > W);
  stepPetals(v, onScreen && v.px > m.houseL - 700 && v.px < m.doorOut + 300);
  if (!onScreen) return;

  drawMeadow(ctx, v);
  // ช่วงผ่านปากพุ่มต้องวาดทั้งพุ่มกับอุโมงค์ซ้อนกัน = เฟรมที่หนักที่สุดของทางเข้า
  // ชั้นที่แทบมองไม่เห็นแล้ว (โปร่งเกิน 90% หรือถูกบังเกิน 90%) ข้ามไปเลย ภาพแทบไม่ต่าง แต่เบาลงชัดเจน
  const insideShown = v.facadeIn < 0.9 && v.facadeOut < 0.9;
  if (insideShown) drawTunnel(ctx, v);
  if (v.facadeIn > 0.1) drawBush(ctx, v, v.facadeIn);
  else if (v.facadeOut > 0.1) drawBush(ctx, v, v.facadeOut);
  drawPetals(ctx, cam, false);
}

/** ทุ่งหน้าพุ่ม — ดอกไม้เล็กตามพื้นและแสงลอดปากอุโมงค์ บอกล่วงหน้าว่ากำลังจะเข้าสวน */
function drawMeadow(ctx, v) {
  const { m, camera: cam, tick, near } = v;
  const from = Math.max(m.houseL - 520, cam - 40);
  const to = Math.min(m.houseL + 40, cam + W + 40);
  for (let wx = Math.ceil(from / 38) * 38; wx < to; wx += 38) {
    const h = hash(wx);
    if (h < 0.35) continue;
    const s = 0.28 + h * 0.18;
    const sway = Math.sin(tick * 0.04 + wx) * 1.5;
    ctx.strokeStyle = C.grassDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx - cam, GROUND_Y + 2);
    ctx.lineTo(wx - cam + sway, GROUND_Y - 14 * s * 3);
    ctx.stroke();
    ctx.drawImage(flower((wx / 38) | 0), wx - cam + sway - 32 * s, GROUND_Y - 14 * s * 3 - 32 * s, 64 * s, 64 * s);
  }
  // แสงจากปากอุโมงค์ตกบนพื้น
  ctx.save();
  ctx.globalAlpha = (0.2 + near * 0.45) * v.facadeIn;
  ctx.drawImage(glow(), m.doorIn - 70 - cam, GROUND_Y - 40, 280, 80);
  ctx.restore();
}

/** พุ่มยักษ์ด้านนอก — วาดจากชั้นแคช (ดู gardenLayers) แล้วค่อยวางดอกไม้ที่แกว่งได้ทับเล็กน้อย */
function drawBush(ctx, v, alpha) {
  const { m, camera: cam } = v;
  const layers = gardenLayers(ctx, m);
  ctx.save();
  ctx.globalAlpha = alpha;
  blit(ctx, layers.bush, m.houseL - PAD, cam, -TOP);
  ctx.restore();
}

/**
 * วาดเนื้อพุ่มทั้งหลังลงผ้าใบ — เรียกครั้งเดียวตอนสร้างแคช ไม่ได้เรียกทุกเฟรม
 * m เป็นพิกัดท้องถิ่น (houseL = PAD) ตำแหน่งดอกไม้/ก้อนใบไม้จึงเหมือนกันทุกครั้งที่เจอพุ่มนี้
 */
function paintBush(ctx, m) {
  const leaf = clump(false);
  ctx.fillStyle = C.leafC;
  ctx.fillRect(m.houseL + 40, 90, m.houseR - m.houseL - 80, GROUND_Y - 90);
  const bump = (wx) => 34 + Math.sin(wx * 0.013) * 22 + hash(Math.round(wx / 70)) * 16;
  // ขอบบนเป็นคลื่นก้อนใบไม้ + ขอบซ้าย/ขวามน
  for (let wx = m.houseL; wx < m.houseR; wx += 70) {
    const top = bump(wx);
    const edge = Math.min(wx - m.houseL, m.houseR - wx);
    const drop = edge < 140 ? (140 - edge) * 0.9 : 0;
    ctx.drawImage(leaf, wx - 80, top + drop - 50, 160, 160);
  }
  for (let row = 0; row < 3; row++) {
    for (let wx = m.houseL + row * 37; wx < m.houseR; wx += 110) {
      if (wx - m.houseL < 60 || m.houseR - wx < 60) continue;
      const y = 120 + row * 64 + hash(wx + row) * 18;
      ctx.drawImage(leaf, wx - 70, y - 60, 140, 140);
    }
  }
  // ดอกไม้บนพุ่ม — ใหญ่เล็กคละกัน
  for (let wx = m.houseL + 30; wx < m.houseR - 30; wx += 46) {
    const h = hash(wx * 0.37);
    if (h < 0.3) continue;
    const y = bump(wx) + 20 + hash(wx * 1.9) * (GROUND_Y - 90);
    const s = 0.35 + h * 0.5;
    ctx.drawImage(flower((h * 97) | 0), wx - 32 * s, y - 32 * s, 64 * s, 64 * s);
  }
  mouth(ctx, m.doorIn, 0);
  mouth(ctx, m.doorOut - 120, 0);
}

/**
 * ส่วนที่ไม่ขยับของอุโมงค์ — ลงแคชครั้งเดียว
 *   ผนังใบไม้ด้านหลัง: กริดก้อนใบไม้ ยิ่งลึกยิ่งหายเป็นช่อง (สวนค่อย ๆ เผยตัว)
 *   เงาในพุ่ม: ช่วงต้นอุโมงค์ครึ้มกว่า แล้วสว่างขึ้นไปทางออก
 *   หลังคาใบไม้ · ทางเดินหญ้า
 */
function paintWall(ctx, m) {
  const deep = clump(true);
  const span = m.doorOut - m.doorIn;
  const step = 58;
  for (let wx = m.doorIn - 58; wx < m.doorOut + 60; wx += step) {
    const u = (wx - m.doorIn) / span;
    const open = Math.max(0, Math.min(0.78, (u - 0.12) * 1.05));
    for (let row = 0; row < 5; row++) {
      const cy = 36 + row * 52;
      // แถวบนสุดกับล่างสุดปิดนานกว่า — ช่องเปิดตรงกลางระดับสายตาก่อน อ่านเป็น "มองออกไป" ชัดกว่า
      const bias = row === 0 || row === 4 ? 0.25 : 0;
      if (hash(wx * 0.11 + row * 7.3) < open - bias) continue;
      ctx.drawImage(deep, wx - 64, cy - 64, 128, 128);
    }
  }

  const shade = ctx.createLinearGradient(m.doorIn, 0, m.doorOut, 0);
  shade.addColorStop(0, 'rgba(20,60,35,.32)');
  shade.addColorStop(0.7, 'rgba(20,60,35,.08)');
  shade.addColorStop(1, 'rgba(255,250,210,.12)');
  ctx.fillStyle = shade;
  ctx.fillRect(m.doorIn - PAD, 0, span + PAD * 2, GROUND_Y);

  const leaf = clump(false);
  for (let wx = m.doorIn - 80; wx < m.doorOut + 80; wx += 64) {
    ctx.drawImage(leaf, wx - 80, -46 + hash(wx * 0.23) * 22, 160, 120);
  }

  ctx.fillStyle = C.path;
  ctx.fillRect(m.doorIn, GROUND_Y, span, H - GROUND_Y);
  ctx.fillStyle = C.pathDark;
  for (let wx = m.doorIn + 23; wx < m.doorOut; wx += 46) {
    ctx.beginPath();
    ctx.ellipse(wx, GROUND_Y + 40 + hash(wx) * 50, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = C.grassDark;
  ctx.fillRect(m.doorIn, GROUND_Y, span, 14);
  ctx.fillStyle = C.grass;
  ctx.fillRect(m.doorIn, GROUND_Y, span, 6);
}

// ─────────────────────────────────────────────────────────────
// ชั้นแคช (layer caching)
//
// วัดแล้ว: ตัวพุ่มกับผนังอุโมงค์คือก้อนใบไม้+ดอกไม้หลายร้อยชิ้นที่ "ไม่ขยับ"
// วาดสดทุกเฟรมทำให้เฟรมตอนผ่านปากพุ่ม (ต้องวาดทั้งสองอย่างซ้อนกัน) พุ่งเกินงบ 16ms
// จึงวาดลงผ้าใบครั้งเดียว แล้วแปะเฉพาะส่วนที่อยู่ในจอทุกเฟรม (drawImage ตัดขอบ 1 ครั้งต่อชั้น)
//
// พิกัดในแคชเป็นพิกัดท้องถิ่นของพุ่ม ไม่ผูกกับตำแหน่งโลก พุ่มทุกหลังจึงใช้แคชเดียวกัน
// ความละเอียดตามสเกลจอจริง (สูงสุด 2 เท่า เท่ากับเพดานของผ้าใบเกม) ไม่งั้นภาพจะเบลอบนจอคม
// สร้างล่วงหน้าตอนเริ่มรอบ (warmGardenArt) — ถ้าสเกลจอเปลี่ยนกลางคันค่อยสร้างใหม่ตอนวาด
// ─────────────────────────────────────────────────────────────
const PAD = 120;       // เผื่อซ้าย/ขวาให้ก้อนใบไม้ที่ยื่นเกินขอบพุ่ม
const TOP = 30;        // เผื่อบนให้ก้อนใบไม้ขอบบนที่ยื่นเลยขอบจอขึ้นไป
let CACHE = null;

function layerScale(ctx) {
  const t = ctx.getTransform();
  // ปัดเป็นขั้น 0.25 — ย่อขยายหน้าต่างทีละนิดจะได้ไม่สร้างแคชใหม่ทุกพิกเซล
  return Math.min(2, Math.max(1, Math.round(Math.hypot(t.a, t.b) * 4) / 4));
}

function localMarks(layout) {
  const houseL = PAD;
  const doorIn = houseL + layout.houseLead;
  const doorOut = doorIn + layout.interior;
  return { houseL, doorIn, doorOut, houseR: doorOut + layout.frame };
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
  const bushW = lm.houseR + PAD;
  const bush = make(bushW, GROUND_Y + TOP + 10, (g) => { g.translate(0, TOP); paintBush(g, lm); });
  // ผนังอุโมงค์เก็บเป็นพิกัดท้องถิ่นเริ่มที่ doorIn - PAD
  const wall = make(layout.interior + PAD * 2, H, (g) => {
    g.translate(PAD - lm.doorIn, 0);
    paintWall(g, lm);
  });
  return { key: `${scale}|${layout.interior}|${layout.houseLead}`, bush, wall };
}

function gardenLayers(ctx, m) {
  const layout = { houseLead: m.doorIn - m.houseL, interior: m.doorOut - m.doorIn, frame: m.houseR - m.doorOut };
  const scale = layerScale(ctx);
  const key = `${scale}|${layout.interior}|${layout.houseLead}`;
  if (!CACHE || CACHE.key !== key) CACHE = buildLayers(layout, scale);
  return CACHE;
}

/** แปะเฉพาะส่วนของชั้นที่อยู่ในจอ — worldX = ขอบซ้ายของชั้นในพิกัดโลก */
function blit(ctx, layer, worldX, cam, y) {
  const sx = Math.max(0, cam - worldX);
  const ex = Math.min(layer.w, cam + W - worldX);
  if (ex <= sx) return;
  ctx.drawImage(layer.cv, sx * layer.s, 0, (ex - sx) * layer.s, layer.cv.height,
    worldX + sx - cam, y, ex - sx, layer.h);
}

function mouth(ctx, x, tick) {
  if (x > W + 40 || x + 160 < 0) return;
  const top = GROUND_Y - 196;
  ctx.fillStyle = C.deepC;
  mouthPath(ctx, x - 10, top - 10, 140, 206);
  ctx.fill();
  ctx.drawImage(mouthFill(), x - 10 + 5, top - 5, 130, 201);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const fx = x + 60 + Math.cos(a) * 72;
    const fy = top + 96 + Math.sin(a) * 104;
    const s = 0.42 + hash(i * 3.3) * 0.2 + Math.sin(tick * 0.05 + i) * 0.02;
    ctx.drawImage(flower(i), fx - 32 * s, fy - 32 * s, 64 * s, 64 * s);
  }
}

/** อุโมงค์ข้างใน — วิวสวน · ผนังใบไม้มีช่อง · ลำแสง · ดอกไม้สองข้าง · หลังคาใบไม้ · ทางเดินหญ้า */
function drawTunnel(ctx, v) {
  const { m, camera: cam, tick } = v;
  const a = Math.max(-20, m.doorIn - cam);
  const b = Math.min(W + 20, m.doorOut - cam);
  if (b <= a) return;
  const span = m.doorOut - m.doorIn;
  const exitX = m.doorOut - 120 - cam;
  const exitTop = GROUND_Y - 196;

  ctx.save();
  ctx.beginPath();
  ctx.rect(a, -20, b - a, H + 40);
  mouthHole(ctx, exitX, exitTop);
  ctx.clip('evenodd');

  // 1) วิวสวนไกล = ฉากหลังของด่านสวนจริงทั้งผืน (render/meadow.js)
  // เดิมเป็นลายวนของตัวเอง ซึ่งแปลว่าสวนที่เห็นผ่านช่องใบไม้กับสวนจริงเป็นคนละที่
  // เรียกตัวเดียวกันแล้วผู้เล่นจะเห็น "สวนเดียวกัน" ตั้งแต่ยังอยู่ในพุ่ม
  drawMeadowBackdrop(ctx, cam, v.tick, { open: v.inside });

  // 2) ผนังใบไม้ที่มีช่องมองทะลุ + เงาในพุ่ม + หลังคาใบไม้ + ทางเดินหญ้า — ชั้นแคชเดียว (ดู paintWall)
  //    ทางเดินหญ้าปิดพื้นของฉากไว้ด้วย (สีพื้นฉากเปลี่ยนตอนสลับ ในอุโมงค์ต้องไม่เปลี่ยนตาม)
  blit(ctx, gardenLayers(ctx, m).wall, m.doorIn - PAD, cam, 0);

  // 4) ลำแสงลอดใบไม้ — เข้มขึ้นเมื่อลึกขึ้น
  const beam = sunbeam();
  for (let i = 0; i < 5; i++) {
    const wx = m.doorIn + span * (0.12 + i * 0.2);
    const u = (wx - m.doorIn) / span;
    const x = wx - cam;
    if (x < -140 || x > W + 140) continue;
    ctx.globalAlpha = (0.25 + u * 0.45) * (0.85 + Math.sin(tick * 0.03 + i) * 0.15);
    ctx.drawImage(beam, x - 60 + Math.sin(tick * 0.01 + i) * 6, 20, 120, GROUND_Y - 20);
  }
  ctx.globalAlpha = 1;

  // 5) ผีเสื้อ
  for (const f of FLIES) {
    const x = m.doorIn + span * f.off - cam + Math.sin(tick * 0.013 + f.ph) * 60;
    if (x < -20 || x > W + 20) continue;
    const y = f.y + Math.sin(tick * 0.05 + f.ph) * 14;
    const flap = Math.abs(Math.sin(tick * 0.25 + f.ph));
    ctx.fillStyle = f.ph > 2 ? '#FFD37A' : '#FF9CC4';
    ctx.beginPath();
    ctx.ellipse(x - 5, y, 6 * flap + 1, 8, -0.4, 0, Math.PI * 2);
    ctx.ellipse(x + 5, y, 6 * flap + 1, 8, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4A2542';
    ctx.fillRect(x - 1, y - 6, 2, 12);
  }

  // 6) ดอกไม้สองข้างทาง (ด้านหลัง) — ต้นสูงต่ำคละกัน
  for (let wx = Math.floor((cam + a) / 52) * 52; wx - cam < b; wx += 52) {
    const h = hash(wx * 0.71);
    const x = wx - cam;
    const s = 0.4 + h * 0.45;
    const stem = 26 + h * 50;
    const sway = Math.sin(tick * 0.04 + wx * 0.07) * 3;
    ctx.strokeStyle = C.vine;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.quadraticCurveTo(x + sway * 0.5, GROUND_Y - stem / 2, x + sway, GROUND_Y - stem);
    ctx.stroke();
    ctx.drawImage(flower((h * 131) | 0), x + sway - 32 * s, GROUND_Y - stem - 32 * s, 64 * s, 64 * s);
  }

  ctx.restore();
}

function mouthHole(ctx, x, top) {
  ctx.moveTo(x, GROUND_Y);
  ctx.bezierCurveTo(x - 6, top + 196 * 0.35, x + 120 * 0.22, top, x + 120 * 0.52, top + 4);
  ctx.bezierCurveTo(x + 120 * 0.84, top + 8, x + 126, top + 196 * 0.4, x + 120, GROUND_Y);
  ctx.closePath();
}

// ─────────────────────────────────────────────────────────────
// ชั้นหน้า — วาดหลังตัวแมว
// ─────────────────────────────────────────────────────────────
export function drawGardenFront(ctx, v) {
  const { m, camera: cam, tick } = v;
  if (m.houseR + 120 - cam < 0 || m.houseL - 220 - cam > W) return;

  const inside = (1 - v.facadeIn) * (1 - v.facadeOut);
  if (inside > 0) {
    ctx.save();
    ctx.globalAlpha = inside;
    const span = m.doorOut - m.doorIn;
    // เถาวัลย์ห้อยจากหลังคา — ยาวไม่เกินระดับหัวตอนกระโดด ไม่บังทางวิ่ง
    for (let i = 0; i < 7; i++) {
      const wx = m.doorIn + span * (0.07 + i * 0.14);
      const x = wx - cam;
      if (x < -40 || x > W + 40) continue;
      const len = 60 + hash(i * 5.3) * 60;
      vine(ctx, x, len, tick, i);
    }
    // หญ้าขอบล่างหน้าสุด — อยู่ใต้ระดับเท้า บังแค่ขอบพื้น
    ctx.fillStyle = C.grassDark;
    // กอหญ้าเตี้ย ๆ ห่าง ๆ แค่ขอบล่างของจอ — สูงเกินนี้จะกลายเป็นลายหนามรกเต็มพื้นทางวิ่ง
    for (let wx = Math.ceil((cam - 20) / 30) * 30; wx - cam < W + 20; wx += 30) {
      if (wx < m.doorIn || wx > m.doorOut || hash(wx * 0.9) < 0.35) continue;
      const x = wx - cam;
      const h = 14 + hash(wx * 0.5) * 16;
      const sway = Math.sin(tick * 0.05 + wx * 0.2) * 2;
      ctx.beginPath();
      ctx.moveTo(x - 6, H);
      ctx.lineTo(x - 2 + sway, H - h);
      ctx.lineTo(x + 1, H - 4);
      ctx.lineTo(x + 5 + sway, H - h * 0.8);
      ctx.lineTo(x + 8, H);
      ctx.closePath();
      ctx.fill();
    }
    // แสงแดดจากทางออก — ยิ่งใกล้ยิ่งสว่าง
    const u = v.inside;
    if (u > 0.5) {
      ctx.globalAlpha = inside * (u - 0.5) * 0.55;
      ctx.drawImage(glow(), m.doorOut - 260 - cam, 20, 420, GROUND_Y);
    }
    ctx.restore();
  }

  // ขอบปากอุโมงค์ด้านหน้า — ก้อนใบไม้ซ้อนสูงเต็มจอ แมวลอดผ่านหลังมันจริง
  rim(ctx, m.doorIn - 44 - cam, tick);
  rim(ctx, m.doorOut + 8 - cam, tick);
  drawPetals(ctx, cam, true);
}

function vine(ctx, x, len, tick, i) {
  const sway = Math.sin(tick * 0.025 + i * 1.3) * 10;
  ctx.strokeStyle = C.vine;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.quadraticCurveTo(x + sway * 0.4, len * 0.5, x + sway, len);
  ctx.stroke();
  ctx.fillStyle = C.leafA;
  for (let k = 1; k <= 3; k++) {
    const t = k / 4;
    const lx = x + sway * t * t;
    const ly = len * t;
    ctx.beginPath();
    ctx.ellipse(lx + (k % 2 ? 6 : -6), ly, 7, 3.5, k % 2 ? 0.5 : -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const s = 0.32;
  ctx.drawImage(flower(i + 2), x + sway - 32 * s, len - 32 * s + 4, 64 * s, 64 * s);
}

function rim(ctx, x, tick) {
  if (x > W + 60 || x + 100 < 0) return;
  const leaf = clump(false);
  // กว้าง 80px = แมวหายหลังขอบพุ่มราว 12 เฟรม (0.2 วิ) — พอให้รู้สึก "มุดเข้าไป" แต่ไม่นานจนมองไม่เห็นตัว
  for (let y = -30; y < GROUND_Y + 20; y += 44) {
    const sway = Math.sin(tick * 0.03 + y) * 2;
    ctx.drawImage(leaf, x - 20 + sway, y - 20, 80, 80);
  }
  for (let k = 0; k < 4; k++) {
    const s = 0.5 + (k % 2) * 0.15;
    ctx.drawImage(flower(k), x + 4 - 32 * s, 40 + k * 70 - 32 * s, 64 * s, 64 * s);
  }
}
