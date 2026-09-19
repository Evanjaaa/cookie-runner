// src/render/space.js
// ─────────────────────────────────────────────────────────────
// ห้วงอวกาศ — ฟ้าไล่จากพลบค่ำถึงอวกาศลึก / เมฆที่ทะลุผ่าน / โลกที่ค่อย ๆ เล็กลง
//               สนามดาวสามชั้น / เนบิวลา / ดาวเคราะห์ / สะเก็ดดาว
//
// ── ทำไมอยู่ที่นี่ ไม่ได้อยู่ในไฟล์ทางเข้า ──
// เหตุผลเดียวกับ render/sea.js: ภาพชุดนี้ถูกใช้สองที่และต้องต่อกันสนิท
//   1. ทางเข้าห้วงอวกาศ (render/gates/space.js) — ช่วงทะยานขึ้นจากฐานปล่อย
//   2. ฉากหลังของด่านห้วงอวกาศเอง (stages.js ประกาศ backdrop: 'space')
// ทางเข้าเรียกด้วย u ที่ไล่ 0 → 1 ตามระยะที่ลอยสูงขึ้น ส่วนด่านจริงเรียกที่ u = 1 ตลอด
// ออกจากทางเข้าปุ๊บ ดาว เนบิวลา และดาวเคราะห์จึงเป็นผืนเดิมต่อไป ไม่มีรอยต่อ
//
// ── u คืออะไร ──
//   0.00  พลบค่ำเหนือทะเล (จานสีเดียวกับด่านชายหาดที่เพิ่งวิ่งออกมา)
//   0.20  ทะลุชั้นเมฆ — เมฆพุ่งลงผ่านจอ ฟ้าเริ่มเข้ม
//   0.45  ชั้นบรรยากาศบาง ฟ้าน้ำเงินเข้ม ดาวเริ่มติด ขอบโลกเรืองแสง
//   0.70  โลกกลายเป็นลูกกลมอยู่ข้างล่าง เนบิวลาเริ่มเห็น
//   1.00  อวกาศลึก ดาวเต็มฟ้า เนบิวลา ดาวเคราะห์ สะเก็ดดาว (= สภาพของด่านจริง)
//
// ── ประสิทธิภาพ (Canvas 2D ฉากอวกาศพังง่ายที่สุด) ──
// ห้ามมีดาวดวงไหนเป็นอ็อบเจกต์แอนิเมชัน — ดาวทั้งหมดอบไว้ใน "แผ่นกระเบื้อง" แคช
// ชั้นละแผ่น แล้วแปะสองครั้งต่อเฟรมแบบวนขอบ (ดาว 180 ดวงเสียค่าแค่ drawImage 6 ครั้ง)
// ฟ้าไล่สีผสมไว้ล่วงหน้าเป็นสไปรต์ 12 ขั้น เนบิวลา/ดาวเคราะห์/สะเก็ดดาว/เมฆเป็นสไปรต์แคช
// ของที่วาดสดมีแค่โลก (วงกลม + ทวีปไม่กี่ก้อน) กับเส้นความเร็ว — ไม่มี filter/shadowBlur เลย
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from '../config.js';
import { stageById } from '../stages.js';

const { W, H } = VIEW;
const TAU = Math.PI * 2;
const SKY_H = GROUND_Y + 20;   // แถบที่ดาวกับของในอวกาศอยู่ (ใต้เส้นนี้เป็นพื้น/ถนนเสมอ)

export const SPACE_C = {
  // ฟ้าสามช่วง (บน → ล่าง)
  duskTop: '#4A2A63', duskMid: '#E86A5C', duskLow: '#FFC978',   // = จานสีด่านชายหาดเป๊ะ ๆ
  highTop: '#08103A', highMid: '#234C93', highLow: '#86BEE2',
  star: '#FFFFFF', starWarm: '#FFE6B4', starCool: '#BFE9FF',
  neb1: '#8B4BC8', neb2: '#3A6FD8', neb3: '#E0629E',
  earthSea: '#2F7ECB', earthDeep: '#123C74', earthLand: '#5FC172', earthLandD: '#3B8F55',
  earthRim: '#9BDCFF',
  cloud: '#FFF3E4', cloudShade: '#E9B9B4',
  sun: '#FFF6D8',
  // โลหะ/นีออนของฐานปล่อย — ทางเข้าใช้ต่อ (อยู่ที่นี่เพื่อให้สีของทั้งชุดอยู่ที่เดียว)
  metal: '#413C63', metalD: '#272343', metalL: '#635D8E',
  neon: '#9DFF6B', neonSoft: '#5FE8C8', warn: '#FFC24D',
};

const C = SPACE_C;

export function spaceHash(n) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}
const hash = spaceHash;

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** เศษที่เหลือแบบไม่ติดลบ — ของที่วนซ้ำต้องใช้ตัวนี้ ไม่ใช่ % เปล่า ๆ (ดูบันทึกใน sea.js) */
function wrap(v, m) {
  const r = v % m;
  return r < 0 ? r + m : r;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** นุ่มหัวท้าย — ใช้กับทุกอย่างที่ "ค่อย ๆ" เปลี่ยนตามระยะ ไม่ให้ขึ้นเป็นขั้น */
function ease(t) {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
}

/** ช่วงหน้าต่าง: 0 นอกช่วง → 1 กลางช่วง ใช้เปิด/ปิดของตามระยะ เช่นเมฆที่โผล่เฉพาะตอนทะลุ */
function window01(v, a, b, fadeA = 0.06, fadeB = 0.1) {
  return ease(clamp01((v - a) / fadeA)) * (1 - ease(clamp01((v - (b - fadeB)) / fadeB)));
}

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, t));
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
  const bl = Math.round(lerp(pa & 255, pb & 255, t));
  return `rgb(${r},${g},${bl})`;
}

// ─────────────────────────────────────────────────────────────
// สไปรต์แคช
// ─────────────────────────────────────────────────────────────
const SPR = {};

export function spaceSprite(key, w, h, paint) {
  if (SPR[key]) return SPR[key];
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w);
  cv.height = Math.ceil(h);
  paint(cv.getContext('2d'), w, h);
  SPR[key] = cv;
  return cv;
}

// ─────────────────────────────────────────────────────────────
// ฟ้า — ไล่ผ่านสามช่วงเวลา ผสมไว้ล่วงหน้า 12 ขั้น
// ฟ้ากินเต็มจอ ถ้าไล่สีสดทุกเฟรมคือสร้าง gradient + ถมเต็มจอทุกเฟรม แพงที่สุดในฉากนี้
// ─────────────────────────────────────────────────────────────
const SKY_STEPS = 12;

function skyStops(t) {
  const v = stageById('space').palette.sky;   // อวกาศลึกยึดจานสีของด่านจริง ฟ้าจึงตรงกันแน่นอน
  const a = [C.duskTop, C.duskMid, C.duskLow];
  const b = [C.highTop, C.highMid, C.highLow];
  const c = [v[0], v[1], v[2]];
  const from = t < 0.5 ? a : b;
  const to = t < 0.5 ? b : c;
  const k = ease(t < 0.5 ? t * 2 : (t - 0.5) * 2);
  return from.map((col, i) => mixHex(col, to[i], k));
}

/**
 * วาดฟ้าเต็มจอแบบไล่ต่อเนื่อง — ผสมสองขั้นที่ขนาบค่าจริงอยู่
 *
 * ── ทำไมไม่เลือกขั้นที่ใกล้ที่สุดเหมือนเดิม ──
 * ของเดิมใช้ Math.round เลือกขั้นเดียว พอค่าที่ขับมันไหลข้ามกึ่งกลางระหว่างสองขั้น
 * ฟ้าทั้งจอเปลี่ยนสีในเฟรมเดียว ซึ่งตาเห็นเป็น "ภาพกระพริบทั้งภาพ"
 * และเพราะฟ้าถมเต็มจอ ทุกอย่างที่วาดทับมันก็เปลี่ยนโทนตามไปด้วย จึงดูเหมือนพื้นวูบหายไปด้วย
 *
 * วัดจากคลิปที่ผู้ใช้ถ่ายมา: เฟรมที่กระโดดต่างจากเฟรมก่อนหน้า 116 เทียบกับปกติ 0.31
 * และวัดในเครื่องแล้วเกิด 13 ครั้งต่อการวิ่ง 21000px ในทุ่งหิมะ (ราวหนึ่งครั้งต่อ 4 วินาที)
 *
 * ต้นทุนที่เพิ่มคือถมสีเต็มจออีกหนึ่งรอบเฉพาะตอนค่าอยู่ระหว่างขั้น
 * ยังถูกกว่าการไล่สีสดทุกเฟรมมาก ซึ่งเป็นเหตุผลที่แบ่งขั้นไว้ตั้งแต่แรก
 */
function paintSky(ctx, u) {
  const f = clamp01(u) * (SKY_STEPS - 1);
  const lo = Math.floor(f);
  const t = f - lo;
  ctx.drawImage(skyStep(lo), 0, 0, W, H);
  if (t <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = t;
  ctx.drawImage(skyStep(lo + 1), 0, 0, W, H);
  ctx.restore();
}

function skyStep(i) {
  const step = Math.max(0, Math.min(SKY_STEPS - 1, Math.round(i)));
  return spaceSprite(`spSky${step}`, 64, H, (g, w, h) => {
    const cols = skyStops(step / (SKY_STEPS - 1));
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, cols[0]);
    grad.addColorStop(0.55, cols[1]);
    grad.addColorStop(1, cols[2]);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

// ─────────────────────────────────────────────────────────────
// สนามดาว — สามชั้นความลึก ชั้นละหนึ่งแผ่นกระเบื้องกว้างเท่าจอ
// ─────────────────────────────────────────────────────────────
const STAR_N = [120, 56, 20];
const STAR_DEPTH = [0.02, 0.06, 0.14];

function starTile(layer) {
  return spaceSprite(`spStars${layer}`, W, SKY_H, (g) => {
    for (let i = 0; i < STAR_N[layer]; i++) {
      const x = hash(i * 3.13 + layer * 17.7) * W;
      const y = hash(i * 7.71 + layer * 31.3) * SKY_H;
      const r = [0.7, 1.15, 1.9][layer] * (0.6 + hash(i * 5.51 + layer) * 0.9);
      const pick = hash(i * 2.27 + layer * 5.5);
      g.fillStyle = pick > 0.86 ? C.starWarm : pick > 0.72 ? C.starCool : C.star;
      g.globalAlpha = 0.45 + hash(i * 1.77) * 0.55;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
      // ชั้นใกล้ได้ประกายกากบาท — ดาวเด่นไม่กี่ดวงพอ ไม่ต้องทุกดวง
      if (layer === 2) {
        g.globalAlpha *= 0.45;
        g.fillRect(x - r * 3.4, y - 0.5, r * 6.8, 1);
        g.fillRect(x - 0.5, y - r * 3.4, 1, r * 6.8);
      }
    }
  });
}

function drawStars(ctx, cam, tick, a) {
  if (a <= 0.02) return;
  ctx.save();
  for (let l = 0; l < 3; l++) {
    // ชั้นใกล้กะพริบทั้งชั้นพร้อมกัน — ถูกกว่าไล่กะพริบทีละดวงหลายร้อยเท่า และตาแยกไม่ออก
    const tw = l === 2 ? 0.82 + 0.18 * Math.sin(tick * 0.05) : 1;
    ctx.globalAlpha = a * [0.9, 1, 1][l] * tw;
    const x0 = -wrap(cam * STAR_DEPTH[l], W);
    ctx.drawImage(starTile(l), x0, 0);
    ctx.drawImage(starTile(l), x0 + W, 0);
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// เนบิวลา — ก้อนหมอกสีอบไว้ในสไปรต์ ลอยช้าที่สุดในฉาก (อยู่ไกลที่สุด)
// ─────────────────────────────────────────────────────────────
function nebulaSprite(i) {
  const cols = [[C.neb1, C.neb2], [C.neb3, C.neb1], [C.neb2, C.neb3]][i];
  return spaceSprite(`spNeb${i}`, 560, 340, (g, w, h) => {
    for (let k = 0; k < 3; k++) {
      // ── ก้อนต้องจบในแผ่น ──
      // ถ้าขอบนอกของ gradient เลยขอบสไปรต์ สีจะถูกตัดเป็นเส้นตรงเห็นชัดกลางอวกาศ
      // จึงบีบจุดศูนย์กลางให้ห่างขอบอย่างน้อยเท่ารัศมีเสมอ
      const r = h * (0.26 + hash(i * 9.7 + k) * 0.16);
      const cx = r + hash(i * 3.3 + k) * (w - r * 2);
      const cy = r + hash(i * 7.1 + k) * (h - r * 2);
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      const col = k === 1 ? cols[1] : cols[0];
      grad.addColorStop(0, `${col}66`);
      grad.addColorStop(0.45, `${col}2A`);
      grad.addColorStop(1, `${col}00`);
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }
  });
}

function drawNebula(ctx, cam, a) {
  if (a <= 0.02) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = a * (0.5 + hash(i * 4.4) * 0.3);
    const span = W * 3.4;
    const x = wrap(i * 1150 - cam * (0.02 + i * 0.008), span) - 560;
    const y = 10 + hash(i * 6.6) * 120;
    ctx.drawImage(nebulaSprite(i), x, y);
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ดาวเคราะห์ประดับฉาก — ลูกมีวงแหวนหนึ่งใบ กับดวงจันทร์เล็กสองใบ
// ─────────────────────────────────────────────────────────────
function planetSprite(kind) {
  const R = kind === 'ring' ? 74 : 34;
  const size = kind === 'ring' ? 300 : 96;
  return spaceSprite(`spPlanet${kind}`, size, size, (g, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const body = kind === 'ring' ? ['#F0A45E', '#B85E3C'] : ['#7FA6E8', '#3D5FA8'];
    // วงแหวนหลัง
    if (kind === 'ring') {
      g.save();
      g.translate(cx, cy);
      g.rotate(-0.34);
      g.strokeStyle = 'rgba(255,214,150,.55)';
      g.lineWidth = 12;
      g.beginPath();
      g.ellipse(0, 0, R * 1.85, R * 0.5, 0, Math.PI, TAU);
      g.stroke();
      g.restore();
    }
    const grad = g.createRadialGradient(cx - R * 0.4, cy - R * 0.45, R * 0.15, cx, cy, R);
    grad.addColorStop(0, body[0]);
    grad.addColorStop(1, body[1]);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, R, 0, TAU);
    g.fill();
    // แถบเมฆ / หลุมอุกกาบาต
    g.save();
    g.beginPath();
    g.arc(cx, cy, R, 0, TAU);
    g.clip();
    g.globalAlpha = 0.24;
    g.fillStyle = '#FFFFFF';
    for (let i = 0; i < 4; i++) {
      const y = cy - R + (i + 0.6) * (R * 2 / 4.6);
      g.fillRect(cx - R, y, R * 2, R * (kind === 'ring' ? 0.14 : 0.1));
    }
    g.restore();
    // วงแหวนหน้า
    if (kind === 'ring') {
      g.save();
      g.translate(cx, cy);
      g.rotate(-0.34);
      g.strokeStyle = 'rgba(255,232,190,.85)';
      g.lineWidth = 12;
      g.beginPath();
      g.ellipse(0, 0, R * 1.85, R * 0.5, 0, 0, Math.PI);
      g.stroke();
      g.restore();
    }
    // ขอบสว่างรับแสงดาวฤกษ์
    g.strokeStyle = 'rgba(255,240,210,.5)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(cx, cy, R - 1, -2.5, -0.5);
    g.stroke();
  });
}

function drawPlanets(ctx, cam, a) {
  if (a <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = a;
  const span = W * 2.8;
  ctx.drawImage(planetSprite('ring'), wrap(1500 - cam * 0.05, span) - 300, 12);
  ctx.drawImage(planetSprite('moon'), wrap(420 - cam * 0.09, span) - 96, 128);
  ctx.drawImage(planetSprite('moon'), wrap(2260 - cam * 0.075, span) - 96, 44, 62, 62);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// สะเก็ดดาว — ก้อนหินหมุนช้า ๆ ชั้นกลาง ไม่ชนผู้เล่น (เป็นฉากหลังล้วน)
// ─────────────────────────────────────────────────────────────
function rockSprite(i) {
  return spaceSprite(`spRock${i}`, 72, 72, (g, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = 24 + hash(i * 3.7) * 8;
    g.fillStyle = '#4A4470';
    g.beginPath();
    for (let k = 0; k <= 9; k++) {
      const an = (k / 9) * TAU;
      const rr = r * (0.76 + hash(i * 5.1 + k) * 0.32);
      const x = cx + Math.cos(an) * rr;
      const y = cy + Math.sin(an) * rr;
      if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fill();
    g.fillStyle = '#655E93';
    g.globalAlpha = 0.85;
    g.beginPath();
    g.arc(cx - r * 0.25, cy - r * 0.3, r * 0.42, 0, TAU);
    g.fill();
    g.globalAlpha = 0.5;
    g.fillStyle = '#2C2850';
    g.beginPath();
    g.arc(cx + r * 0.3, cy + r * 0.25, r * 0.3, 0, TAU);
    g.fill();
  });
}

function drawRocks(ctx, cam, tick, a) {
  if (a <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = a;
  const span = W * 2.2;
  for (let i = 0; i < 4; i++) {
    const x = wrap(i * 620 + 180 - cam * (0.16 + i * 0.03), span) - 72;
    const y = 40 + hash(i * 8.3) * (SKY_H - 120);
    const s = 0.55 + hash(i * 2.9) * 0.75;
    ctx.save();
    ctx.translate(x + 36, y + 36);
    ctx.rotate(tick * 0.003 * (i % 2 ? 1 : -1) + i);
    ctx.scale(s, s);
    ctx.drawImage(rockSprite(i), -36, -36);
    ctx.restore();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ดาวฤกษ์ไกล ๆ — แหล่งแสงของฉาก ให้ขอบโลกกับดาวเคราะห์มีทิศแสงเดียวกัน
// ─────────────────────────────────────────────────────────────
function sunSprite() {
  return spaceSprite('spSun', 260, 260, (g, w, h) => {
    const c = w / 2;
    const grad = g.createRadialGradient(c, c, 4, c, c, c);
    grad.addColorStop(0, 'rgba(255,255,240,.95)');
    grad.addColorStop(0.18, 'rgba(255,238,190,.45)');
    grad.addColorStop(0.5, 'rgba(255,214,160,.14)');
    grad.addColorStop(1, 'rgba(255,200,150,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = C.sun;
    g.beginPath();
    g.arc(c, c, 17, 0, TAU);
    g.fill();
  });
}

// ─────────────────────────────────────────────────────────────
// เมฆที่ทะลุผ่าน — ช่วง WOW แรก
// ตำแหน่งผูกกับ u (ระยะทาง) ไม่ใช่เวลา เฟรมตกแล้วจังหวะจึงไม่เพี้ยน
// ─────────────────────────────────────────────────────────────
function puffSprite(i) {
  return spaceSprite(`spPuff${i}`, 300, 140, (g, w, h) => {
    const lobes = [[0.26, 0.62, 0.3], [0.48, 0.44, 0.38], [0.7, 0.6, 0.31], [0.86, 0.68, 0.22]];
    g.fillStyle = i ? C.cloudShade : C.cloud;
    for (const [lx, ly, lr] of lobes) {
      g.beginPath();
      g.arc(w * lx, h * ly, h * lr, 0, TAU);
      g.fill();
    }
    g.fillRect(w * 0.24, h * 0.62, w * 0.62, h * 0.3);
    // ด้านบนรับแสง
    g.globalCompositeOperation = 'source-atop';
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,.9)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

function drawClouds(ctx, u) {
  const k = window01(u, 0.03, 0.42, 0.05, 0.14);
  if (k <= 0.02) return;
  ctx.save();
  for (let i = 0; i < 9; i++) {
    // p = ความคืบหน้าของก้อนนี้ 0 (บนจอ) → 1 (พ้นล่างจอ) เดินตาม u
    const p = wrap((u - 0.03) * 2.9 + i * 0.111, 1);
    const scale = 0.45 + p * 1.75;
    const y = -150 + p * (H + 340);
    // ก้อนแหวกออกข้าง ๆ ตอนพุ่งเข้าใกล้ = ความรู้สึกว่าเราพุ่งทะลุมันไป
    const side = (hash(i * 4.9) - 0.5) * 2;
    const x = W * 0.5 + side * (120 + p * 620) - 150 * scale;
    ctx.globalAlpha = k * Math.sin(Math.PI * p) * 0.95;
    ctx.drawImage(puffSprite(i % 2), x, y, 300 * scale, 140 * scale);
  }
  ctx.restore();
}

/** เส้นความเร็ว — ขีดสั้น ๆ วิ่งลงตอนทะยาน บอกว่าเรากำลังพุ่งขึ้นเร็ว */
function drawStreaks(ctx, u) {
  const k = window01(u, 0.06, 0.62, 0.08, 0.18);
  if (k <= 0.02) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const p = wrap((u - 0.06) * 7 + i * 0.0714, 1);
    const x = hash(i * 6.31) * W;
    const y = -60 + p * (H + 120);
    const len = 26 + hash(i * 2.13) * 46;
    ctx.globalAlpha = k * 0.55 * Math.sin(Math.PI * p);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + len);
    ctx.stroke();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// โลก — WOW ที่สอง
// เริ่มเป็น "ขอบโค้งของโลก" พาดเต็มความกว้างจอ แล้วหดลงเป็นลูกกลมที่ลอยอยู่ข้างล่างซ้าย
// วาดสดทั้งหมด (วงกลม + ทวีปไม่กี่ก้อน) เพราะรัศมีเปลี่ยนจาก 1600 เหลือ 130
// ถ้าใช้สไปรต์แล้วขยาย ภาพจะเบลอตอนใหญ่ วาดสดคมทุกขนาดและถูกกว่าที่คิด
// ─────────────────────────────────────────────────────────────
// ทวีป (x, y, กว้าง, สูง — หน่วยเป็นเท่าของรัศมี)
// ทั้งหมดอยู่กลางลูกโดยตั้งใจ — ตอนโลกยังใหญ่มากเราเห็นแค่แถบบางใกล้ขั้ว
// ถ้าเอาทวีปไปวางแถบนั้น มันจะถูกขยายจนกลายเป็นทุ่งเขียวเต็มจอ ดูไม่ออกว่าเป็นโลก
// ช่วงนั้นให้ "แถบเมฆ" ข้างล่างเป็นตัวเล่าแทน (คือสิ่งที่เห็นจริงเวลามองโลกจากที่สูงมาก)
const LAND = [
  [-0.34, -0.42, 0.30, 0.17], [0.12, -0.55, 0.22, 0.12], [0.44, -0.2, 0.26, 0.19],
  [-0.52, 0.06, 0.20, 0.14], [-0.05, 0.1, 0.33, 0.2], [0.3, 0.42, 0.24, 0.13],
  [-0.38, 0.5, 0.18, 0.1],
];

function drawEarth(ctx, tick, u) {
  const a = ease(clamp01((u - 0.2) / 0.1));
  if (a <= 0.02 || u > 0.995) return;
  // e = ระยะที่ห่างจากโลก: 0 ขอบโลกพาดเต็มจอ → 1 เป็นลูกกลมเล็กที่กำลังจะลับขอบจอ
  const e = ease(clamp01((u - 0.24) / 0.6));
  const R = lerp(1650, 96, e);
  // ── ทำไมไม่ให้มัน "จางหาย" ──
  // ของชิ้นใหญ่ที่จาง ๆ หายกลางจอดูเหมือนภาพหลุด ไม่เหมือนเดินทางไกลออกมา
  // จึงให้มันเล็กลงเรื่อย ๆ แล้วเลื่อนลับขอบจอซ้ายไปเอง (เราบินจากมันไป มันจึงตกไปข้างหลัง)
  const away = ease(clamp01((u - 0.78) / 0.22));
  const cx = lerp(W * 0.5, W * 0.2, e) - away * (W * 0.2 + 220);
  const cy = lerp(214, 96, e) + R;     // 214/96 = ขอบบนของโลกบนจอ ตอนเริ่มเผย → ตอนเป็นลูกกลม

  ctx.save();
  ctx.globalAlpha = a;

  // ชั้นบรรยากาศเรืองรอบขอบ — วาดก่อนตัวโลก จะได้ฟุ้งออกนอกขอบ
  const halo = ctx.createRadialGradient(cx, cy, R * 0.94, cx, cy, R * 1.12);
  halo.addColorStop(0, 'rgba(155,220,255,.55)');
  halo.addColorStop(0.55, 'rgba(120,190,255,.2)');
  halo.addColorStop(1, 'rgba(120,190,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.12, 0, TAU);
  ctx.fill();

  // ตัวโลก
  const sea = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
  sea.addColorStop(0, C.earthSea);
  sea.addColorStop(0.72, C.earthSea);
  sea.addColorStop(1, C.earthDeep);
  ctx.fillStyle = sea;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.clip();
  // ทวีป
  for (let i = 0; i < LAND.length; i++) {
    const [lx, ly, lw, lh] = LAND[i];
    ctx.fillStyle = i % 3 === 0 ? C.earthLandD : C.earthLand;
    ctx.beginPath();
    ctx.ellipse(cx + lx * R, cy + ly * R, lw * R, lh * R, hash(i) * 2, 0, TAU);
    ctx.fill();
  }
  // เมฆขาวพาดเป็นแถบ หมุนช้า ๆ
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 6; i++) {
    const dy = -0.97 + i * 0.26;
    const off = Math.sin(tick * 0.004 + i * 1.7) * R * 0.08;
    // ครึ่งความกว้างของแถบต้องเท่าคอร์ดของทรงกลมที่ระดับนั้น ไม่งั้นแถบใกล้ขั้วจะกว้างเกินจริง
    const halfW = R * Math.sqrt(Math.max(0, 1 - dy * dy)) * (0.5 + hash(i * 3.3) * 0.38);
    ctx.globalAlpha = a * (0.3 + hash(i * 7.9) * 0.22);
    ctx.beginPath();
    ctx.ellipse(cx + off, cy + dy * R, halfW, R * (0.022 + hash(i) * 0.03), 0, 0, TAU);
    ctx.fill();
  }
  // เงาด้านกลางคืน — ไล่จากขวาล่างเข้ามา บอกทิศแสงเดียวกับดาวฤกษ์บนขวา
  ctx.globalAlpha = a;
  const night = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  night.addColorStop(0, 'rgba(6,8,26,0)');
  night.addColorStop(0.55, 'rgba(6,8,26,0)');
  night.addColorStop(1, 'rgba(6,8,26,.72)');
  ctx.fillStyle = night;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();

  // ขอบรับแสงด้านบน — เส้นเรืองที่ทำให้รู้ว่านี่คือ "ขอบโลก" ไม่ใช่วงกลมสีฟ้า
  ctx.strokeStyle = C.earthRim;
  ctx.globalAlpha = a * 0.85;
  ctx.lineWidth = Math.max(2, R * 0.012);
  ctx.beginPath();
  ctx.arc(cx, cy, R - ctx.lineWidth * 0.5, Math.PI * 1.08, Math.PI * 1.98);
  ctx.stroke();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ฉากหลังห้วงอวกาศเต็มจอ
//
// @param opts.u  0 = พลบค่ำเหนือทะเล / 1 = อวกาศลึก (ด่านจริงใช้ 1 ตลอด)
//
// ทุกอย่างอิง cam กับ u เท่านั้น — ทางเข้ากับด่านจริงใช้กล้องตัวเดียวกัน (ไม่รีเซ็ตตอนสลับฉาก)
// ภาพจึงต่อกันสนิทตอนส่งต่อ เหมือนที่ทำไว้กับ render/sea.js
// ─────────────────────────────────────────────────────────────
export function drawSpaceBackdrop(ctx, cam, tick, opts = {}) {
  const u = clamp01(opts.u ?? 1);

  paintSky(ctx, u);

  const deep = ease(clamp01((u - 0.3) / 0.45));       // ความเป็นอวกาศ: ดาว/เนบิวลา/ดาวเคราะห์
  drawNebula(ctx, cam, deep * 0.9);
  drawStars(ctx, cam, tick, deep);

  // ดาวฤกษ์ไกล ๆ บนขวา — โผล่พร้อมดาว เป็นแหล่งแสงของทั้งฉาก
  if (deep > 0.05) {
    ctx.save();
    ctx.globalAlpha = deep;
    // ตรึงไว้กับจอเหมือนดวงอาทิตย์ในฉากชายหาด — ของที่อยู่ไกลระดับดาวฤกษ์ไม่ควรวนหายไปไหน
    ctx.drawImage(sunSprite(), W * 0.74, 8, 260, 260);
    ctx.restore();
  }

  drawPlanets(ctx, cam, ease(clamp01((u - 0.55) / 0.3)));
  drawRocks(ctx, cam, tick, ease(clamp01((u - 0.62) / 0.28)));
  drawEarth(ctx, tick, u);
  drawClouds(ctx, u);
  drawStreaks(ctx, u);
}

/** สร้างสไปรต์ทั้งชุดล่วงหน้า — เรียกตอนอุ่นเครื่องทางเข้า ไม่ให้ไปสร้างกลางฉาก */
export function warmSpaceArt() {
  for (let i = 0; i < SKY_STEPS; i++) skyStep(i);
  for (let l = 0; l < 3; l++) starTile(l);
  for (let i = 0; i < 3; i++) nebulaSprite(i);
  planetSprite('ring');
  planetSprite('moon');
  for (let i = 0; i < 4; i++) rockSprite(i);
  puffSprite(0);
  puffSprite(1);
  sunSprite();
}
