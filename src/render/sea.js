// src/render/sea.js
// ─────────────────────────────────────────────────────────────
// โลกริมทะเลยามเย็น — ฟ้า ดวงอาทิตย์ เมฆ นกทะเล ทะเลสามชั้น ฟองคลื่น หาดทราย ต้นมะพร้าว
//
// ── ทำไมอยู่ที่นี่ ไม่ได้อยู่ในไฟล์ทางเข้า ──
// ภาพชุดนี้ถูกใช้สองที่ และต้อง "ต่อกันสนิท" ระหว่างสองที่นั้น:
//   1. ทางเข้าชายหาด (render/gates/beach.js) — ช่วงวิ่งบนทางเดินไม้ก่อนเข้าด่าน
//   2. ฉากหลังของด่านชายหาดเอง (stages.js ประกาศ backdrop: 'sea')
// ถ้าต่างคนต่างวาด วันหนึ่งจะเพี้ยนกันแน่ ๆ — อยู่ไฟล์เดียวกันแปลว่าแก้ทีเดียวเปลี่ยนทั้งสองที่
//
// ── ประสิทธิภาพ ──
// ฟ้า/ดวงอาทิตย์/เมฆ/ต้นมะพร้าว/เปลือกหอย เป็นสไปรต์แคชทั้งหมด (สร้างครั้งเดียวตลอดเกม)
// ฟ้าสองช่วงเวลาผสมไว้ล่วงหน้าเป็นสไปรต์เดียว 9 ขั้น — ไม่ต้องถมสีเต็มจอสองรอบต่อเฟรม
// คลื่นวาดสด แต่เป็นเส้น sine หยาบ (จุดละ 24px) ไม่มี filter / shadowBlur เลย
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from '../config.js';
import { stageById } from '../stages.js';

const { W, H } = VIEW;

export const SEA_C = {
  wood: '#C98B4B', woodDark: '#9C6634', woodLite: '#E5B173', woodLine: '#7A4A22',
  rope: '#E8CFA0', ropeDark: '#B9975F',
  sand: '#F0CE96', sandWet: '#C99A62',
  seaFar: '#8FCBDC', seaMid: '#4E9BBE', seaNear: '#2E7098', seaGold: '#FFD79A',
  foam: '#FFF6E8',
  leaf: '#4FA96A', leafDark: '#2F7B4C', trunk: '#A8703C', trunkDark: '#7C4F26',
  flagA: '#FF8FA8', flagB: '#FFD36A', flagC: '#8FD8E8',
};

const C = SEA_C;

export function seaHash(n) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}
const hash = seaHash;

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * เศษที่เหลือแบบไม่ติดลบ — ใช้วนตำแหน่งของที่ต้องโผล่ซ้ำไปเรื่อย ๆ (เมฆ)
 *
 * ── ทำไมต้องมี ──
 * % ของจาวาสคริปต์คืนค่าติดลบเมื่อตัวตั้งติดลบ พอวิ่งไกลจนตัวตั้งกลายเป็นลบ
 * ของที่วนด้วย % เฉย ๆ จะกระโดดไปอยู่นอกจอด้านซ้ายแล้วไม่กลับมาอีกเลย
 */
function wrap(v, m) {
  const r = v % m;
  return r < 0 ? r + m : r;
}

// ─────────────────────────────────────────────────────────────
// สไปรต์แคช
// ─────────────────────────────────────────────────────────────
const SPR = {};

export function seaSprite(key, w, h, paint) {
  if (SPR[key]) return SPR[key];
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w);
  cv.height = Math.ceil(h);
  paint(cv.getContext('2d'), w, h);
  SPR[key] = cv;
  return cv;
}

/**
 * ฟ้าสองแบบ: บ่ายแก่ ๆ (ฟ้ายังสว่าง) กับพระอาทิตย์ตกเต็มที่
 * แบบหลังใช้สีจากจานสีของด่านชายหาดจริง ฉากหลังของด่านกับทางเข้าจึงเป็นฟ้าผืนเดียวกัน
 */
function skyTone(late) {
  return seaSprite(late ? 'skyLate' : 'skyEarly', 64, H, (g, w, h) => {
    const pal = stageById('beach').palette.sky;
    const cols = late ? [pal[0], pal[1], pal[2]] : ['#2E3E74', '#7D6AA6', '#F0A882'];
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, cols[0]);
    grad.addColorStop(0.52, cols[1]);
    grad.addColorStop(1, cols[2]);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

/**
 * ฟ้า ณ ความคืบหน้า u — ผสมสองช่วงเวลาไว้ล่วงหน้าเป็นสไปรต์เดียว
 * ฟ้ากินเต็มจอ การวาดสองชั้นทับกันทุกเฟรมคือถมสีเต็มหน้าจอสองรอบ ซึ่งแพงที่สุดในฉากนี้
 * แบ่ง 9 ขั้นก็พอ — แต่ละขั้นต่างกันนิดเดียวจนตาแยกไม่ออกว่าไล่เป็นขั้น
 */
function skyAt(u) {
  const step = Math.round(clamp01((u - 0.1) / 0.55) * 8);
  return seaSprite(`skyMix${step}`, 64, H, (g, w, h) => {
    g.drawImage(skyTone(false), 0, 0, w, h);
    g.globalAlpha = step / 8;
    g.drawImage(skyTone(true), 0, 0, w, h);
  });
}

/** ดวงอาทิตย์ + แสงฟุ้งรอบตัว อบไว้ในสไปรต์ชิ้นเดียว */
function sunSprite() {
  return seaSprite('beachSun', 320, 320, (g, w, h) => {
    const cx = w / 2;
    const halo = g.createRadialGradient(cx, cx, 10, cx, cx, w / 2);
    halo.addColorStop(0, 'rgba(255,224,150,.95)');
    halo.addColorStop(0.28, 'rgba(255,170,110,.45)');
    halo.addColorStop(0.62, 'rgba(255,140,110,.16)');
    halo.addColorStop(1, 'rgba(255,140,110,0)');
    g.fillStyle = halo;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,214,150,.9)';
    g.beginPath();
    g.arc(cx, cx, 74, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#FFF0C4';
    g.beginPath();
    g.arc(cx, cx, 64, 0, Math.PI * 2);
    g.fill();
  });
}

/** เมฆแบนยาวแบบการ์ตูน สองแบบ */
function cloudSprite(i) {
  return seaSprite(`beachCloud${i}`, 220, 80, (g) => {
    const blobs = i === 0
      ? [[70, 48, 30], [110, 40, 36], [150, 50, 26], [40, 54, 22]]
      : [[60, 50, 24], [100, 42, 30], [140, 48, 22], [170, 54, 16]];
    g.fillStyle = 'rgba(255,235,214,.92)';
    for (const [x, y, r] of blobs) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(255,198,166,.8)';
    for (const [x, y, r] of blobs) {
      g.beginPath();
      g.ellipse(x, y + r * 0.55, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/**
 * ต้นมะพร้าว — ลำต้นโค้งกับใบหกทาง กรอบ 200x260 โคนต้นอยู่ขอบล่าง
 * ใบไม่ได้แยกเป็นชิ้น เพราะต้องไหวตามลม — เอียงทั้งต้นแทน ถูกกว่าวาดใบทีละใบทุกเฟรม
 */
export function palmSprite(i) {
  const lean = i % 2 ? 1 : -1;
  return seaSprite(`palm${i % 2}`, 200, 260, (g, w, h) => {
    const baseX = w / 2;
    const topX = baseX + lean * 34;
    const topY = 64;
    g.strokeStyle = C.trunk;
    g.lineWidth = 16;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(baseX, h - 4);
    g.quadraticCurveTo(baseX + lean * 6, h * 0.5, topX, topY);
    g.stroke();
    g.strokeStyle = C.trunkDark;
    g.lineWidth = 3;
    for (let k = 1; k <= 6; k++) {
      const t = k / 7;
      const x = baseX + (topX - baseX) * t + lean * Math.sin(t * 3) * 5;
      const y = h - 4 - (h - 4 - topY) * t;
      g.beginPath();
      g.moveTo(x - 7, y);
      g.lineTo(x + 7, y - 2);
      g.stroke();
    }
    for (let k = 0; k < 6; k++) {
      const a = Math.PI + (k / 5) * Math.PI;
      const len = 62 + hash(i * 3 + k) * 26;
      const ex = topX + Math.cos(a) * len;
      const ey = topY + Math.sin(a) * len * 0.62;
      g.strokeStyle = k % 2 ? C.leafDark : C.leaf;
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(topX, topY);
      g.quadraticCurveTo((topX + ex) / 2, ey - 26, ex, ey);
      g.stroke();
    }
    g.fillStyle = C.trunkDark;
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.arc(topX - 10 + k * 10, topY + 12, 6, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** เปลือกหอยเล็ก ๆ */
export function shellSprite(i) {
  return seaSprite(`shell${i % 2}`, 40, 32, (g, w, h) => {
    g.fillStyle = i % 2 ? '#FFD9E4' : '#FFE9C4';
    g.beginPath();
    g.moveTo(w / 2, h - 4);
    g.arc(w / 2, h - 4, 15, Math.PI, 0);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(180,120,110,.5)';
    g.lineWidth = 1.4;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI + ((k + 1) / 5) * Math.PI;
      g.beginPath();
      g.moveTo(w / 2, h - 4);
      g.lineTo(w / 2 + Math.cos(a) * 15, h - 4 + Math.sin(a) * 15);
      g.stroke();
    }
  });
}

/** ต้นมะพร้าวหนึ่งต้น เอียงไหวตามลมทั้งต้น */
export function drawPalm(ctx, i, x, baseY, s, tick, seed) {
  if (x < -220 || x > W + 220) return;
  ctx.save();
  ctx.translate(x, baseY);
  ctx.rotate(Math.sin(tick * 0.018 + seed * 1.7) * 0.035);
  ctx.drawImage(palmSprite(i), -100 * s, -260 * s, 200 * s, 260 * s);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ทะเล
// ─────────────────────────────────────────────────────────────

/** ทะเลสามชั้น + ยอดคลื่นขาว + แสงพระอาทิตย์สะท้อนใต้ดวงพอดี */
function drawWaves(ctx, cam, tick, horizon, u, sunX) {
  // แถบทองใต้ขอบฟ้า = แสงนอนบนผิวน้ำไกล ๆ ตัวที่ทำให้ทะเลอ่านเป็น "ตอนเย็น"
  ctx.fillStyle = C.seaGold;
  ctx.fillRect(0, horizon - 2, W, 12);

  const bands = [
    { col: C.seaFar, y: horizon + 8, h: 22, speed: 0.06, amp: 3, len: 150 },
    { col: C.seaMid, y: horizon + 26, h: 28, speed: 0.14, amp: 5, len: 110 },
    { col: C.seaNear, y: horizon + 50, h: GROUND_Y - horizon - 50 + 10, speed: 0.3, amp: 7, len: 78 },
  ];
  for (const b of bands) {
    ctx.fillStyle = b.col;
    ctx.beginPath();
    ctx.moveTo(-20, b.y + b.h);
    for (let x = -20; x <= W + 20; x += 24) {
      ctx.lineTo(x, b.y + Math.sin((x + cam * b.speed + tick * b.speed * 6) / b.len) * b.amp);
    }
    ctx.lineTo(W + 20, b.y + b.h);
    ctx.closePath();
    ctx.fill();
  }

  // ยอดคลื่นขาวเฉพาะชั้นใกล้ — ชั้นไกลอยู่ไกลจนเส้นแทบไม่มีผล
  const near = bands[2];
  ctx.strokeStyle = 'rgba(255,246,232,.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = -20; x <= W + 20; x += 24) {
    const y = near.y + Math.sin((x + cam * near.speed + tick * near.speed * 6) / near.len) * near.amp;
    if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // แสงสะท้อน — ขีดสั้น ๆ เรียงลงมาใต้ดวงอาทิตย์ ยาวไม่เท่ากันและกะพริบ
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 10; i++) {
    const y = horizon + 8 + i * 12;
    if (y > GROUND_Y - 20) break;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(tick * 0.05 + i * 1.7));
    const wdt = (14 + i * 5) * tw;
    ctx.globalAlpha = (0.3 + u * 0.35) * tw;
    ctx.fillStyle = '#FFE1A8';
    ctx.fillRect(sunX - wdt / 2 + Math.sin(tick * 0.03 + i) * 6, y, wdt, 3);
  }
  ctx.restore();
}

/**
 * ฉากหลังริมทะเลเต็มจอ
 *
 * @param opts.u      0 = บ่ายแก่ ๆ เพิ่งถึงทะเล / 1 = พระอาทิตย์ตกเต็มที่ (ด่านจริงใช้ 1)
 * @param opts.palms  วาดต้นมะพร้าวตามพิกัดโลกให้ด้วยไหม (ด่านจริง = true, ทางเข้าวางเอง)
 *
 * ── ทุกอย่างในนี้อิง cam อย่างเดียว ──
 * ทางเข้าด่านกับตัวด่านเรียกฟังก์ชันนี้คนละจังหวะแต่ใช้กล้องตัวเดียวกัน (กล้องไม่รีเซ็ตตอนสลับฉาก)
 * ถ้าฟ้า/เมฆ/ดวงอาทิตย์อิงอย่างอื่นด้วย ภาพจะกระตุกตอนส่งต่อจากทางเข้าเข้าด่านจริง
 */
export function drawSeaBackdrop(ctx, cam, tick, opts = {}) {
  const u = clamp01(opts.u ?? 1);

  // 1) ฟ้า
  ctx.drawImage(skyAt(u), 0, 0, W, H);

  // 2) เส้นขอบฟ้า — ยิ่งเข้าใกล้ทะเลยิ่งเปิดกว้าง
  const horizon = GROUND_Y - 118 - u * 26;

  // 3) ดวงอาทิตย์ใกล้ลับขอบฟ้า
  // ── ตรึงไว้กับจอ ไม่เลื่อนตามกล้อง ──
  // ดวงอาทิตย์อยู่ไกลจนเลื่อนไม่ทันสายตาอยู่แล้ว (ชั้นเดิมของด่านใช้ depth 0.04 ซึ่งเกือบนิ่ง)
  // เดิมให้มันเลื่อนช้า ๆ แล้ววนรอบ ผลคือพอวิ่งไกลพอ ดวงอาทิตย์จะวาปหายไปทั้งดวง
  // ตรึงไว้เลยดีกว่า — อยู่ในฉากตลอดทั้งด่าน ไม่มีทางหายไปไหน
  const sunX = W * 0.66;
  const sunY = horizon - 4 + (1 - u) * 54;
  ctx.drawImage(sunSprite(), sunX - 184, sunY - 184, 368, 368);

  // 4) เมฆสองชั้นความเร็ว
  for (let i = 0; i < 5; i++) {
    const depth = i % 2 ? 0.1 : 0.16;
    const x = wrap(i * 430 - cam * depth, W + 600) - 220;
    const y = 30 + hash(i * 4.4) * 90;
    const s = 0.7 + hash(i * 2.2) * 0.7;
    ctx.globalAlpha = 0.5 + hash(i) * 0.35;
    ctx.drawImage(cloudSprite(i % 2), x, y, 220 * s, 80 * s);
  }
  ctx.globalAlpha = 1;

  // 5) นกทะเลไกล ๆ สามตัว
  ctx.strokeStyle = 'rgba(80,54,74,.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const x = ((tick * 0.35 + i * 340) % (W + 200)) - 100;
    const y = 70 + i * 26 + Math.sin(tick * 0.03 + i) * 8;
    const s = 7 + i * 2;
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.55, x, y);
    ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.55, x + s, y);
    ctx.stroke();
  }

  // 6) ทะเล
  drawWaves(ctx, cam, tick, horizon, u, sunX);

  // 7) หาดทรายเปียก + ฟองคลื่นซัดเข้าฝั่ง
  const sandTop = GROUND_Y - 30;
  ctx.fillStyle = C.sandWet;
  ctx.fillRect(0, sandTop, W, GROUND_Y - sandTop + 6);
  ctx.fillStyle = C.sand;
  ctx.fillRect(0, sandTop + 9, W, GROUND_Y - sandTop);
  ctx.fillStyle = C.foam;
  ctx.beginPath();
  ctx.moveTo(-20, sandTop + 10);
  for (let x = -20; x <= W + 20; x += 26) {
    ctx.lineTo(x, sandTop - 2 + Math.sin((x + tick * 1.6) / 90) * 4);
  }
  ctx.lineTo(W + 20, sandTop + 10);
  ctx.closePath();
  ctx.fill();

  // 8) ต้นมะพร้าวตามแนวหาด (เฉพาะตอนใช้เป็นฉากหลังของด่าน)
  // ตำแหน่งคิดจากพิกัดโลกด้วย hash — ต้นเดิมอยู่ที่เดิมเสมอ ไม่ใช่สุ่มใหม่ทุกเฟรม
  if (opts.palms) {
    const gap = 420;
    const from = Math.floor((cam - 240) / gap) * gap;
    for (let wx = from; wx < cam + W + 240; wx += gap) {
      const h1 = hash(wx * 0.013);
      const far = h1 > 0.62;
      drawPalm(ctx, Math.round(h1 * 3), wx + h1 * 120 - cam, GROUND_Y + (far ? -10 : 4),
        far ? 0.5 : 0.8 + h1 * 0.3, tick, wx * 0.01);
    }
  }

  // 9) แสงเย็นอาบครึ่งล่าง (ทะเล หาด ทางเดิน) — ฟ้าอุ่นมาจากสไปรต์อยู่แล้ว
  // เบามือไว้ ถ้าหนากว่านี้สีฟ้าของทะเลจะกลายเป็นเทาหม่น อ่านไม่ออกว่าเป็นน้ำ
  ctx.globalAlpha = 0.06 + u * 0.12;
  ctx.fillStyle = '#FF9A5A';
  ctx.fillRect(0, horizon - 10, W, H - horizon + 10);
  ctx.globalAlpha = 1;
}

/** สร้างสไปรต์ทั้งชุดไว้ล่วงหน้า — เรียกก่อนฉากโผล่ เฟรมแรกจะได้ไม่สะดุด */
export function warmSeaArt() {
  skyTone(false);
  skyTone(true);
  skyAt(1);
  sunSprite();
  cloudSprite(0);
  cloudSprite(1);
  palmSprite(0);
  palmSprite(1);
  shellSprite(0);
  shellSprite(1);
}
