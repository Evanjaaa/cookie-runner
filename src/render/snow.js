// src/render/snow.js
// ─────────────────────────────────────────────────────────────
// ดินแดนหิมะ — ฟ้าหน้าหนาว / แสงเหนือ / เมฆหิมะ / เทือกเขา 2 ชั้น / ปราสาทน้ำแข็ง
//              ป่าสนหิมะ / ผลึกน้ำแข็ง / ทุ่งหิมะที่มีกองหิมะ รอยเท้า และลานน้ำแข็ง
//              หิมะตก 3 ชั้น + ลมหนาว
//
// ── ทำไมอยู่ที่นี่ ──
// เหตุผลเดียวกับ render/sea.js และ render/space.js: ภาพชุดนี้ถูกใช้สองที่และต้องต่อกันสนิท
//   1. ทางเข้าพายุหิมะ (render/gates/snowstorm.js) — ช่วงร่อนลงมาจากอวกาศ + พายุ + เผยทุ่ง
//   2. ฉากหลังของด่านทุ่งหิมะเอง (stages.js ประกาศ backdrop: 'snow')
//
// ── ด่านนี้ไม่ใช่ "ฉากเดียวยาว ๆ" ──
// โลกแบ่งเป็น 4 ย่าน วนไปตามระยะทางที่วิ่ง (CYCLE ละ 5200px ≈ 12.7 วินาที):
//   0 ทุ่งหิมะเปิดโล่ง → 1 ป่าสนหิมะ → 2 เทือกน้ำแข็ง + ผลึก → 3 ปราสาทน้ำแข็ง + แสงเหนือ
// น้ำหนักของแต่ละย่านไล่ทับกันแบบนุ่ม ไม่มีจังหวะไหนที่ภาพ "ตัด" และเพราะอิงระยะทางล้วน
// ฉากจึงไม่ต้องจำสถานะอะไรเลย — วิ่งกลับมาจุดเดิมก็เห็นย่านเดิม
//
// ── ประสิทธิภาพ ──
// ภูเขา ป่าสน ทุ่งหิมะ เมฆ ปราสาท ผลึก แสงเหนือ = แผ่นแคช/สไปรต์ทั้งหมด สร้างครั้งเดียว
// หิมะพื้นหลังสองชั้น = แผ่นแคชเลื่อนวน (ไม่ใช่อ็อบเจกต์รายเกล็ด)
// หิมะชั้นหน้าที่ต้องส่ายตามลม = พูลคงที่ 26 เม็ด ไม่มีการสร้างใหม่ตลอดเกม
// รวมแล้วต่อเฟรมเป็น drawImage ~20 ครั้ง + เส้นลมสิบกว่าเส้น ไม่มี filter / shadowBlur เลย
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from '../config.js';
import { stageById } from '../stages.js';

const { W, H } = VIEW;
const TAU = Math.PI * 2;

export const SNOW_C = {
  snow: '#FFFFFF', snowSoft: '#E4F1FB', snowShade: '#BBD6EA', snowDeep: '#8FB3CE',
  mtFar: '#7FA4C6', mtFarLo: '#6889AC',
  ice: '#9ED3EE', iceLite: '#E4F7FF', iceDeep: '#4D93BE', iceLine: '#356E97',
  rock: '#5E7C92', rockDark: '#3E5A70',
  pine: '#2F6B5C', pineDark: '#1E4A42', pineLite: '#3F8571',
  trunk: '#6B4B38',
  castle: '#AFD6EE', castleShade: '#7AA8CC', castleWin: '#FFE08A',
  aurora1: '#6BFFC2', aurora2: '#5BC8FF', aurora3: '#C08BFF',
  wind: 'rgba(255,255,255,.7)',
};

const C = SNOW_C;

export function snowHash(n) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}
const hash = snowHash;

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

function ease(t) {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
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
// สไปรต์/แผ่นแคช
// ─────────────────────────────────────────────────────────────
const SPR = {};

export function snowSprite(key, w, h, paint) {
  if (SPR[key]) return SPR[key];
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w);
  cv.height = Math.ceil(h);
  paint(cv.getContext('2d'), w, h);
  SPR[key] = cv;
  return cv;
}

/** แปะแผ่นแบบวนขอบให้เต็มจอ — แผ่นกว้างกว่าจอได้ ส่วนที่ล้นจอไม่เสียค่าวาด */
function tileRow(ctx, img, tw, offset, y) {
  const x0 = -wrap(offset, tw);
  for (let x = x0; x < W; x += tw) ctx.drawImage(img, x, y);
}

// ─────────────────────────────────────────────────────────────
// ย่านทั้งสี่ — น้ำหนักไล่ทับกันตามระยะทาง
// ─────────────────────────────────────────────────────────────
const CYCLE = 5200;          // ความยาวหนึ่งย่าน (px) ≈ 12.7 วินาทีที่ความเร็วปกติ
const ZONES = 4;

/**
 * น้ำหนักทั้งสี่ย่าน ณ ระยะ cam
 * ทางเข้าด่านใช้ตัวนี้เพื่อ "ไล่กลับ" เข้าหาค่าจริงตอนส่งต่อให้ด่าน — ไม่งั้นภูเขากับปราสาท
 * จะกระโดดเปลี่ยนความเข้มในเฟรมที่ทางเข้าเลิกวาด
 */
export function zonesAt(cam) {
  return [zoneW(cam, 0), zoneW(cam, 1), zoneW(cam, 2), zoneW(cam, 3)];
}

/** น้ำหนักของย่าน i ณ ระยะ cam — 1 = อยู่กลางย่านพอดี, 0 = ไม่เกี่ยวเลย */
function zoneW(cam, i) {
  const t = wrap(cam / CYCLE, ZONES);
  const d0 = Math.abs(t - i);
  const d = Math.min(d0, ZONES - d0);       // ระยะบนวงกลม ย่าน 3 จึงต่อกับย่าน 0 ได้
  return ease(clamp01(1.35 - d));
}

// ─────────────────────────────────────────────────────────────
// ฟ้า — กลางวันหน้าหนาว ↔ พลบค่ำสีม่วงตอนถึงย่านปราสาท (แสงเหนือต้องมีฟ้าเข้มถึงจะเห็น)
// ผสมไว้ล่วงหน้า 8 ขั้น ฟ้ากินเต็มจอ ไล่สีสดทุกเฟรมแพงเกินไป
// ─────────────────────────────────────────────────────────────
const SKY_STEPS = 8;

function skyAt(k) {
  const step = Math.round(clamp01(k) * (SKY_STEPS - 1));
  return snowSprite(`swSky${step}`, 64, H, (g, w, h) => {
    const day = stageById('snow').palette.sky;      // ยึดจานสีของด่านจริง ฟ้าจึงตรงกันแน่นอน
    const dusk = ['#2B2B5E', '#4A5590', '#9FB6D8'];
    const t = step / (SKY_STEPS - 1);
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, mixHex(day[0], dusk[0], t));
    grad.addColorStop(0.55, mixHex(day[1], dusk[1], t));
    grad.addColorStop(1, mixHex(day[2], dusk[2], t));
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

// ─────────────────────────────────────────────────────────────
// แสงเหนือ — ริบบิ้นสามผืนอบไว้ในสไปรต์ เลื่อนช้า ๆ แล้วยืด/หดตามเวลา
// ไม่ใช้ filter: ความฟุ้งมาจาก gradient ที่อบไว้ในสไปรต์แล้ว
// ─────────────────────────────────────────────────────────────
function auroraSprite(i) {
  const col = [C.aurora1, C.aurora2, C.aurora3][i];
  return snowSprite(`swAur${i}`, 640, 220, (g, w, h) => {
    for (let k = 0; k < 3; k++) {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `${col}00`);
      grad.addColorStop(0.35, `${col}55`);
      grad.addColorStop(0.72, `${col}22`);
      grad.addColorStop(1, `${col}00`);
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w; x += 32) {
        const y = 40 + Math.sin(x * 0.011 + k * 2.1 + i) * 34 + k * 26;
        g.lineTo(x, y);
      }
      g.lineTo(w, h);
      g.closePath();
      g.fill();
    }
  });
}

function drawAurora(ctx, cam, tick, a) {
  if (a <= 0.02) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = a * (0.5 - i * 0.1);
    const x = wrap(i * 520 - cam * (0.01 + i * 0.006), 1400) - 640;
    const sway = Math.sin(tick * 0.006 + i * 1.7) * 14;
    const tall = 1 + Math.sin(tick * 0.004 + i) * 0.12;
    ctx.drawImage(auroraSprite(i), x, 4 + sway + i * 16, 640, 220 * tall);
    ctx.drawImage(auroraSprite(i), x + 700, 4 - sway + i * 16, 640, 220 * tall);
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// เมฆหิมะ — ก้อนหนาสีขาวอมเทา ลอยต่ำกว่าเมฆฉากอื่นเพราะเป็นเมฆที่กำลังโปรยหิมะ
// ─────────────────────────────────────────────────────────────
function cloudSprite(i) {
  return snowSprite(`swCloud${i}`, 340, 130, (g, w, h) => {
    const lobes = [[0.2, 0.66, 0.3], [0.42, 0.46, 0.4], [0.64, 0.58, 0.34], [0.84, 0.7, 0.24]];
    g.fillStyle = i ? C.snowSoft : C.snow;
    for (const [lx, ly, lr] of lobes) {
      g.beginPath();
      g.arc(w * lx, h * ly, h * lr, 0, TAU);
      g.fill();
    }
    g.fillRect(w * 0.18, h * 0.66, w * 0.68, h * 0.3);
    g.globalCompositeOperation = 'source-atop';
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,.95)');
    grad.addColorStop(0.55, 'rgba(214,232,242,0)');
    grad.addColorStop(1, 'rgba(169,200,222,.5)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

function drawClouds(ctx, cam, a) {
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const depth = i % 2 ? 0.05 : 0.09;
    const x = wrap(i * 640 - cam * depth, W + 1100) - 340;
    const y = 12 + hash(i * 4.4) * 62;
    const s = 0.6 + hash(i * 2.2) * 0.6;
    ctx.globalAlpha = a * (0.35 + hash(i) * 0.25);
    ctx.drawImage(cloudSprite(i % 2), x, y, 340 * s, 130 * s);
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// เทือกเขา — สองชั้นคนละแผ่น ชั้นไกลเป็นเงาหิมะนุ่ม ๆ ชั้นใกล้เป็นน้ำแข็งเหลี่ยมคม
// แผ่นกว้าง 1920 (สองเท่าจอ) ลายจึงไม่ซ้ำให้จับได้ในเวลาอันสั้น
// ─────────────────────────────────────────────────────────────
const MT_W = 1920;

function farMountains() {
  return snowSprite('swMtFar', MT_W, 250, (g, w, h) => {
    g.fillStyle = C.mtFar;
    g.beginPath();
    g.moveTo(0, h);
    for (let i = 0; i <= 9; i++) {
      const x = (i / 9) * w;
      const peak = h - (52 + hash(i * 3.7) * 150);
      g.lineTo(x - w / 18, h);
      g.lineTo(x, peak);
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
    // หิมะบนยอด (เงาบาง ๆ ใต้แนวหิมะ ไม่งั้นยอดขาวจะกลืนกับฟ้า)
    g.fillStyle = C.snow;
    for (let i = 0; i <= 9; i++) {
      const x = (i / 9) * w;
      const peak = h - (52 + hash(i * 3.7) * 150);
      g.beginPath();
      g.moveTo(x, peak);
      g.lineTo(x + 26, peak + 40);
      g.lineTo(x + 12, peak + 34);
      g.lineTo(x, peak + 44);
      g.lineTo(x - 13, peak + 33);
      g.lineTo(x - 26, peak + 40);
      g.closePath();
      g.fill();
    }
  });
}

function iceMountains() {
  return snowSprite('swMtIce', MT_W, 220, (g, w, h) => {
    for (let i = 0; i < 7; i++) {
      const cx = (i + 0.5) * (w / 7) + (hash(i * 5.3) - 0.5) * 90;
      const hh = 84 + hash(i * 8.1) * 116;
      const halfW = 96 + hash(i * 2.9) * 78;
      // หน้าผาสองเฉด ให้เห็นเหลี่ยม
      g.fillStyle = C.iceDeep;
      g.beginPath();
      g.moveTo(cx - halfW, h);
      g.lineTo(cx, h - hh);
      g.lineTo(cx + halfW, h);
      g.closePath();
      g.fill();
      g.fillStyle = C.ice;
      g.beginPath();
      g.moveTo(cx, h - hh);
      g.lineTo(cx + halfW, h);
      g.lineTo(cx + halfW * 0.28, h);
      g.closePath();
      g.fill();
      // ยอดหิมะ
      g.fillStyle = C.snow;
      g.beginPath();
      g.moveTo(cx, h - hh);
      g.lineTo(cx + halfW * 0.34, h - hh + hh * 0.3);
      g.lineTo(cx + halfW * 0.14, h - hh + hh * 0.24);
      g.lineTo(cx, h - hh + hh * 0.34);
      g.lineTo(cx - halfW * 0.16, h - hh + hh * 0.23);
      g.lineTo(cx - halfW * 0.34, h - hh + hh * 0.3);
      g.closePath();
      g.fill();
      // รอยแตกน้ำแข็ง
      g.strokeStyle = C.iceLine;
      g.lineWidth = 2;
      g.globalAlpha = 0.5;
      g.beginPath();
      g.moveTo(cx - halfW * 0.3, h);
      g.lineTo(cx - halfW * 0.1, h - hh * 0.55);
      g.moveTo(cx + halfW * 0.45, h);
      g.lineTo(cx + halfW * 0.2, h - hh * 0.4);
      g.stroke();
      g.globalAlpha = 1;
    }
  });
}

// ─────────────────────────────────────────────────────────────
// ป่าสนหิมะ — แผ่นเดียวมีต้นหลายขนาดสุ่มตำแหน่ง ไม่ใช่เรียงเท่ากันเป็นแถว
// ─────────────────────────────────────────────────────────────
function pineBand(key, n, scale) {
  return snowSprite(key, MT_W, 200, (g, w, h) => {
    const order = Array.from({ length: n }, (_, i) => i)
      .sort((a, b) => hash(a * 1.7) - hash(b * 1.7));     // สลับลำดับวาด ต้นเล็กไม่ถูกบังหมด
    for (const i of order) {
      const x = hash(i * 3.1) * w;
      const s = scale * (0.55 + hash(i * 7.3) * 0.75);
      pine(g, x, h - 6, s);
    }
  });
}

/** ต้นสนหนึ่งต้น — สามชั้นใบ + หิมะเกาะบนไหล่ใบ */
function pine(g, x, baseY, s) {
  g.fillStyle = C.trunk;
  g.fillRect(x - 4 * s, baseY - 22 * s, 8 * s, 24 * s);
  for (let k = 0; k < 3; k++) {
    const y = baseY - 18 * s - k * 30 * s;
    const halfW = (42 - k * 9) * s;
    const hh = 46 * s;
    g.fillStyle = k === 2 ? C.pineLite : k === 1 ? C.pine : C.pineDark;
    g.beginPath();
    g.moveTo(x, y - hh);
    g.lineTo(x + halfW, y);
    g.lineTo(x - halfW, y);
    g.closePath();
    g.fill();
    // หิมะกองบนไหล่ใบ
    g.fillStyle = C.snow;
    g.beginPath();
    g.moveTo(x, y - hh);
    g.lineTo(x + halfW * 0.62, y - hh * 0.32);
    g.quadraticCurveTo(x + halfW * 0.2, y - hh * 0.5, x, y - hh * 0.28);
    g.quadraticCurveTo(x - halfW * 0.2, y - hh * 0.5, x - halfW * 0.62, y - hh * 0.32);
    g.closePath();
    g.fill();
  }
}

// ─────────────────────────────────────────────────────────────
// ปราสาทน้ำแข็ง — หมุดหมายของด่าน โผล่เฉพาะย่าน 3 และค่อย ๆ เข้าใกล้
// ─────────────────────────────────────────────────────────────
function castleSprite() {
  return snowSprite('swCastle', 520, 330, (g, w, h) => {
    const base = h - 10;
    const tower = (x, tw, th, spire) => {
      g.fillStyle = C.castleShade;
      g.fillRect(x - tw / 2, base - th, tw, th);
      g.fillStyle = C.castle;
      g.fillRect(x - tw / 2, base - th, tw * 0.45, th);
      // ยอดแหลมคริสตัล
      g.fillStyle = C.ice;
      g.beginPath();
      g.moveTo(x, base - th - spire);
      g.lineTo(x + tw / 2, base - th);
      g.lineTo(x - tw / 2, base - th);
      g.closePath();
      g.fill();
      g.fillStyle = C.iceLite;
      g.beginPath();
      g.moveTo(x, base - th - spire);
      g.lineTo(x + tw * 0.18, base - th);
      g.lineTo(x - tw * 0.1, base - th);
      g.closePath();
      g.fill();
      // หน้าต่างเรืองแสง
      g.fillStyle = C.castleWin;
      for (let k = 0; k < Math.floor(th / 46); k++) {
        g.fillRect(x - 5, base - th + 26 + k * 46, 10, 16);
      }
    };
    // กำแพงกับประตูใหญ่
    g.fillStyle = C.castleShade;
    g.fillRect(90, base - 108, 340, 108);
    g.fillStyle = C.castle;
    g.fillRect(90, base - 108, 340, 16);
    g.fillStyle = C.iceDeep;
    g.beginPath();
    g.moveTo(230, base);
    g.lineTo(230, base - 62);
    g.quadraticCurveTo(260, base - 96, 290, base - 62);
    g.lineTo(290, base);
    g.closePath();
    g.fill();
    tower(150, 58, 150, 62);
    tower(370, 58, 138, 58);
    tower(260, 84, 232, 92);
    tower(88, 40, 96, 42);
    tower(432, 40, 104, 44);
    // หิมะเกาะขอบบนของกำแพง
    g.fillStyle = C.snow;
    g.fillRect(90, base - 112, 340, 8);
    // ── เงาฐาน ──
    // ปราสาทสีฟ้าบนฟ้าสีฟ้าอ่านยาก ต้องมีเงาเข้มใต้ฐานคั่นให้รู้ว่าตั้งอยู่บนพื้น
    g.fillStyle = 'rgba(90,130,160,.45)';
    g.fillRect(70, base - 6, 380, 10);
  });
}

/** ตำแหน่งปราสาทตามธรรมชาติ (พิกัดจอ) — เข้าใกล้ช้ามาก ปราสาทจึงค่อย ๆ ใหญ่ขึ้นตลอดย่าน */
export function castleXAt(cam) {
  return wrap(715 - cam * 0.14, CYCLE * 0.14) - 520;
}

function drawCastle(ctx, cam, a, forceX) {
  if (a <= 0.02) return;
  const x = forceX == null ? castleXAt(cam) : forceX;
  const s = 0.62 + a * 0.5;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.drawImage(castleSprite(), x, GROUND_Y - 330 * s + 34, 520 * s, 330 * s);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ผลึกน้ำแข็ง — ชั้นกลาง โผล่แถบย่านเทือกน้ำแข็ง
// ─────────────────────────────────────────────────────────────
function crystalSprite(i) {
  return snowSprite(`swCry${i}`, 120, 170, (g, w, h) => {
    const cx = w / 2;
    const tip = 12 + hash(i * 3.3) * 22;
    const halfW = 22 + hash(i * 5.5) * 16;
    g.fillStyle = C.iceDeep;
    g.beginPath();
    g.moveTo(cx, tip);
    g.lineTo(cx + halfW, h - 10);
    g.lineTo(cx - halfW, h - 10);
    g.closePath();
    g.fill();
    g.fillStyle = C.ice;
    g.beginPath();
    g.moveTo(cx, tip);
    g.lineTo(cx + halfW * 0.25, h - 10);
    g.lineTo(cx - halfW * 0.55, h - 10);
    g.closePath();
    g.fill();
    g.fillStyle = C.iceLite;
    g.beginPath();
    g.moveTo(cx - halfW * 0.1, tip + 12);
    g.lineTo(cx + halfW * 0.12, h - 40);
    g.lineTo(cx - halfW * 0.3, h - 40);
    g.closePath();
    g.fill();
  });
}

function drawCrystals(ctx, cam, tick, a) {
  if (a <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = a;
  const span = W * 2.6;
  for (let i = 0; i < 5; i++) {
    const x = wrap(i * 430 - cam * 0.34, span) - 120;
    if (x > W + 20) continue;
    const s = 0.5 + hash(i * 6.1) * 0.8;
    const y = GROUND_Y - 170 * s + 26;
    ctx.drawImage(crystalSprite(i % 3), x, y, 120 * s, 170 * s);
    // ประกายวับ — จุดเดียวต่อผลึก สลับจังหวะกันไป
    const tw = Math.sin(tick * 0.06 + i * 2.2);
    if (tw > 0.7) {
      ctx.globalAlpha = a * (tw - 0.7) * 3;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x + 60 * s, y + 50 * s, 2.6, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = a;
    }
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ทุ่งหิมะ — แถบพื้นเหนือเส้นพื้นจริง มีกองหิมะ ลานน้ำแข็งมีรอยแตก และรอยเท้า
// ไม่ใช่แผ่นขาวเรียบ ๆ (นั่นคือสิ่งที่โจทย์ห้ามไว้ชัดเจน)
// ─────────────────────────────────────────────────────────────
const FIELD_H = 120;

function fieldBand() {
  return snowSprite('swField', MT_W, FIELD_H, (g, w, h) => {
    // เนินหิมะไล่ระดับ
    g.fillStyle = C.snowSoft;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 40) {
      const y = h - 26 - Math.sin(x * 0.004) * 12 - hash(x * 0.013) * 16;
      g.lineTo(x, y);
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
    g.fillStyle = C.snow;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 40) {
      const y = h - 12 - Math.sin(x * 0.006 + 1.3) * 8 - hash(x * 0.021) * 10;
      g.lineTo(x, y);
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();

    // กองหิมะ
    for (let i = 0; i < 14; i++) {
      const x = hash(i * 3.7) * w;
      const r = 16 + hash(i * 9.1) * 30;
      g.fillStyle = C.snow;
      g.beginPath();
      g.ellipse(x, h - 12, r, r * 0.52, 0, Math.PI, TAU);
      g.fill();
      g.fillStyle = C.snowShade;
      g.beginPath();
      g.ellipse(x + r * 0.3, h - 10, r * 0.55, r * 0.22, 0, Math.PI, TAU);
      g.fill();
    }

    // ลานน้ำแข็งมีรอยแตก
    for (let i = 0; i < 4; i++) {
      const x = 180 + hash(i * 4.4) * (w - 360);
      const ww = 150 + hash(i * 6.2) * 210;
      g.fillStyle = 'rgba(191,232,248,.75)';
      g.beginPath();
      g.ellipse(x, h - 8, ww / 2, 13, 0, 0, TAU);
      g.fill();
      g.strokeStyle = C.iceLine;
      g.globalAlpha = 0.45;
      g.lineWidth = 1.4;
      g.beginPath();
      for (let k = 0; k < 3; k++) {
        const kx = x - ww / 3 + hash(i * 2.2 + k) * (ww * 0.66);
        g.moveTo(kx, h - 14);
        g.lineTo(kx + 14 - hash(k) * 28, h - 2);
      }
      g.stroke();
      g.globalAlpha = 1;
    }

    // เส้นเงาใต้สันหิมะ — ตัวที่ทำให้ทุ่งไม่กลืนเป็นแผ่นขาวเดียวกับพื้นเกม
    g.strokeStyle = C.snowDeep;
    g.globalAlpha = 0.5;
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x <= w; x += 40) {
      const y = h - 10 - Math.sin(x * 0.006 + 1.3) * 8 - hash(x * 0.021) * 10;
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.globalAlpha = 1;

    // รอยเท้าเล็ก ๆ ของใครสักคนที่เดินผ่านมาก่อน
    g.fillStyle = C.snowDeep;
    g.globalAlpha = 0.5;
    for (let i = 0; i < 26; i++) {
      const x = hash(i * 8.8) * w;
      const y = h - 6 - (i % 2) * 5;
      g.beginPath();
      g.ellipse(x, y, 4.5, 2.6, 0, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  });
}

// ─────────────────────────────────────────────────────────────
// หิมะตก
//   สองชั้นหลังเป็นแผ่นแคชเลื่อนวน (เกล็ดนับร้อยเสียค่าแค่ drawImage 4 ครั้ง)
//   ชั้นหน้าเป็นพูลคงที่ 26 เม็ด ส่ายตามลมได้ เพราะเป็นชั้นที่ตาจับความเคลื่อนไหวจริง
// ─────────────────────────────────────────────────────────────
function snowSheet(i) {
  const n = [90, 46][i];
  const r = [1.1, 1.9][i];
  return snowSprite(`swSheet${i}`, W, H, (g) => {
    g.fillStyle = C.snow;
    for (let k = 0; k < n; k++) {
      g.globalAlpha = 0.35 + hash(k * 2.7 + i) * 0.5;
      g.beginPath();
      g.arc(hash(k * 3.9 + i * 11) * W, hash(k * 7.1 + i * 5) * H, r * (0.6 + hash(k) * 0.8), 0, TAU);
      g.fill();
    }
  });
}

const FLAKES = Array.from({ length: 26 }, (_, i) => ({
  x: hash(i * 2.3) * W,
  y: hash(i * 5.1) * H,
  r: 1.6 + hash(i * 7.7) * 2.6,
  vy: 0.7 + hash(i * 3.3) * 1.5,
  sway: hash(i * 9.1) * TAU,
}));

let flakeTick = 0;

/** เดินเกล็ดชั้นหน้าหนึ่งเฟรม — เรียกจากผู้วาดเฟรมเท่านั้น ไม่มีการสร้างอ็อบเจกต์ใหม่เลย */
function stepFlakes(windX) {
  flakeTick++;
  for (const f of FLAKES) {
    f.y += f.vy;
    f.x += windX * (0.5 + f.r * 0.2) + Math.sin(flakeTick * 0.03 + f.sway) * 0.6;
    if (f.y > H + 6) { f.y = -8; f.x = hash(f.x * 0.37 + flakeTick) * W; }
    if (f.x < -10) f.x = W + 8;
    if (f.x > W + 10) f.x = -8;
  }
}

/**
 * หิมะทั้งสามชั้น
 * @param density 0 = ไม่มีหิมะเลย / 1 = พายุหิมะเต็มที่
 * @param wind    ความแรงลม (px ต่อเฟรม ติดลบ = พัดไปทางซ้าย)
 */
function drawSnowfall(ctx, cam, tick, density, wind) {
  if (density <= 0.01) return;
  ctx.save();
  // สองชั้นหลัง: แผ่นแคชเลื่อนตามลมและตามกล้อง
  for (let i = 0; i < 2; i++) {
    ctx.globalAlpha = density * (0.35 + i * 0.25);
    const ox = cam * (0.1 + i * 0.12) - tick * wind * (0.6 + i * 0.5);
    const oy = wrap(tick * (0.45 + i * 0.75), H);
    tileRow(ctx, snowSheet(i), W, ox, oy - H);
    tileRow(ctx, snowSheet(i), W, ox, oy);
  }
  // ชั้นหน้า: เม็ดใหญ่ ส่ายตามลม
  ctx.globalAlpha = Math.min(1, density * 1.1);
  ctx.fillStyle = C.snow;
  for (const f of FLAKES) {
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * (0.7 + density * 0.5), 0, TAU);
    ctx.fill();
  }
  // เส้นลม — บอกทิศลมโดยไม่ต้องเพิ่มเม็ดหิมะ
  if (density > 0.35) {
    ctx.strokeStyle = C.wind;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 11; i++) {
      const p = wrap(tick * 0.02 + i * 0.0909, 1);
      const y = hash(i * 5.7) * H;
      const x = W + 80 - p * (W + 220);
      const len = 40 + hash(i * 3.1) * 90;
      ctx.globalAlpha = (density - 0.35) * 0.9 * Math.sin(Math.PI * p);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y + len * 0.12);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ฉากหลังดินแดนหิมะเต็มจอ
//
// @param opts.snow   ความหนาแน่นหิมะ 0 → 1 (ด่านจริงใช้ ~0.45 พายุใช้ 1)
// @param opts.wind   ความแรงลม (ติดลบ = พัดซ้าย) ค่าปริยายอิงความหนาแน่น
// @param opts.zones  บังคับน้ำหนักย่านทั้งสี่ (ทางเข้าใช้ตอนเผยทุ่ง) — ปล่อยว่าง = ไล่ตามระยะทาง
// @param opts.haze   หมอกขาวทับหน้า 0 → 1 (พายุหิมะใช้ปิดจอ)
// @param opts.castleX ปักตำแหน่งปราสาทบนจอ (ทางเข้าใช้ตอนเผยทุ่ง) — ปล่อยว่าง = ตามระยะทาง
// ─────────────────────────────────────────────────────────────
export function drawSnowBackdrop(ctx, cam, tick, opts = {}) {
  const density = clamp01(opts.snow ?? 0.45);
  const wind = opts.wind ?? -(0.5 + density * 1.6);
  const z = opts.zones || zonesAt(cam);

  // 1) ฟ้า — เข้มขึ้นตามน้ำหนักย่านปราสาท (แสงเหนือต้องมีฟ้าเข้มถึงจะเห็น)
  ctx.drawImage(skyAt(z[3] * 0.92), 0, 0, W, H);

  // 2) แสงเหนือ แล้วค่อยเมฆทับ (เมฆอยู่ใกล้กว่า)
  drawAurora(ctx, cam, tick, z[3] * 0.95 + z[2] * 0.2);
  drawClouds(ctx, cam, 0.8 - z[3] * 0.25);

  // 3) เทือกเขาไกล → เทือกน้ำแข็ง → ป่าสนหลัง → ผลึก → ป่าสนหน้า
  ctx.save();
  ctx.globalAlpha = 0.85;
  tileRow(ctx, farMountains(), MT_W, cam * 0.05, GROUND_Y - 210);
  ctx.restore();

  const iceK = 0.35 + z[2] * 0.65;
  ctx.save();
  ctx.globalAlpha = iceK;
  tileRow(ctx, iceMountains(), MT_W, cam * 0.12 + 640, GROUND_Y - 170);
  ctx.restore();

  drawCastle(ctx, cam, z[3], opts.castleX);

  const pineK = 0.3 + z[1] * 0.7;
  ctx.save();
  ctx.globalAlpha = pineK;
  tileRow(ctx, pineBand('swPineFar', 16, 0.7), MT_W, cam * 0.26, GROUND_Y - 150);
  ctx.restore();

  drawCrystals(ctx, cam, tick, z[2] * 0.9);

  ctx.save();
  ctx.globalAlpha = 0.45 + z[1] * 0.55;
  tileRow(ctx, pineBand('swPineNear', 11, 1.5), MT_W, cam * 0.44, GROUND_Y - 196);
  ctx.restore();

  // 4) ทุ่งหิมะที่แมววิ่งอยู่บนนั้น
  tileRow(ctx, fieldBand(), MT_W, cam * 0.62, GROUND_Y - FIELD_H + 14);

  // 5) หิมะตกกับลม แล้วปิดท้ายด้วยหมอกขาวถ้ามี
  stepFlakes(wind);
  drawSnowfall(ctx, cam, tick, density, wind);

  // หมอกพายุ — ทับได้แค่ฉากหลัง ตัวละคร/ปลา/สิ่งกีดขวางถูกวาดทีหลังเสมอจึงไม่โดนกลบ
  // เพดานคูณ 0.62 ไว้โดยตั้งใจ: ขาวกว่านี้แล้วภูเขากับเส้นพื้นหายหมด เหลือจอขาวเปล่า
  // ซึ่งอ่านเป็น "เกมค้าง" มากกว่า "พายุหิมะ"
  const haze = clamp01(opts.haze ?? 0);
  if (haze > 0.01) {
    ctx.save();
    ctx.globalAlpha = haze * 0.62;
    ctx.fillStyle = '#E6F1FA';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

/** สร้างสไปรต์ทั้งชุดล่วงหน้า — เรียกตอนอุ่นเครื่องทางเข้า ไม่ให้ไปสร้างกลางฉาก */
export function warmSnowArt() {
  for (let i = 0; i < SKY_STEPS; i++) skyAt(i / (SKY_STEPS - 1));
  for (let i = 0; i < 3; i++) auroraSprite(i);
  cloudSprite(0);
  cloudSprite(1);
  farMountains();
  iceMountains();
  pineBand('swPineFar', 16, 0.7);
  pineBand('swPineNear', 11, 1.5);
  castleSprite();
  for (let i = 0; i < 3; i++) crystalSprite(i);
  fieldBand();
  snowSheet(0);
  snowSheet(1);
}
