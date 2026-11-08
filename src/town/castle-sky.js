// src/town/castle-sky.js
// ─────────────────────────────────────────────────────────────
// ฟ้าตามเวลาจริงของปราสาท (ผู้ใช้ 8 พ.ย. "หน้าต่างให้ข้างนอกเป็นเวลาจริง มืดแล้วข้างนอกก็มืด")
//   เวลาไทย (UTC+7 — ชุดเดียวกับห้องน้องแมว catroom.js) → น้ำหนัก กลางวัน / ฟ้าเย็น(เช้ามืด) / กลางคืน ผสมกันนุ่ม ๆ
//   ใช้ร่วม: วิวนอกหน้าต่างชั้น 1–2 · ประตูทางเข้า · ฟ้าดาดฟ้าชั้น 3 · ภาพในกล้องดูดาว
//   ดวงจันทร์ข้างขึ้นข้างแรมตามวันจริง (moonPhase)
// ทดสอบเวลาอื่น: ใส่ ?hour=21 (หรือ 6.2, 18 ...) ท้ายลิงก์
// ภาพที่แคชไว้ (ผนัง ประตู) ผูกกับ sky().key — เปลี่ยนแค่ช่วงฟ้าเปลี่ยนสี (ราว 8 ขั้นต่อช่วงเช้า/เย็น) ไม่วาดใหม่ทุกเฟรม
// ─────────────────────────────────────────────────────────────
import { lg, star } from './world.js';

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

const FORCE = (() => {
  try { const v = new URLSearchParams(location.search).get('hour'); return v == null || v === '' ? null : Number(v); } catch { return null; }
})();
/** ชั่วโมงตามเวลาไทย (ทศนิยม 0..24) */
export function thaiHour(d = new Date()) {
  if (FORCE != null && !Number.isNaN(FORCE)) return ((FORCE % 24) + 24) % 24;
  return ((d.getUTCHours() + 7) % 24) + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
}
/** ข้างขึ้นข้างแรม 0..1 (0 = เดือนดับ · 0.5 = เต็มดวง) */
export function moonPhase(d = new Date()) {
  const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14);
  const days = (d.getTime() - ref) / 86400000;
  return (((days % syn) + syn) % syn) / syn;
}

/**
 * สภาพฟ้าตอนนี้ — day/dusk/night รวมกันได้ 1 · sunU = ดวงอาทิตย์เดินไปแล้วกี่ส่วนของกลางวัน (0 ขึ้น · 1 ตก)
 * key = ขั้นของสีฟ้า (ใช้ผูกภาพแคช) · am = ช่วงเช้า (ฟ้าเช้ามืดอมชมพูฟ้า · ฟ้าเย็นอมส้ม)
 */
function computeSky() {
  const h = thaiHour();
  const e = Math.sin(((h - 6.1) / 12) * Math.PI);   // ความสูงดวงอาทิตย์ −1..1 · ขึ้น ~6:06 ตก ~18:06
  const day = smooth(0.02, 0.34, e), night = smooth(0, -0.26, e);
  const dusk = Math.max(0, 1 - day - night);
  return {
    h, day, dusk, night, am: h < 12, moon: moonPhase(),
    sunU: clamp01((h - 6.1) / 12),
    key: `${Math.round(day * 8)}.${Math.round(night * 8)}`,
  };
}
let cur = computeSky(), at = 0;
/** สภาพฟ้า (คำนวณใหม่ทุก ~1 วิ) */
export function sky() {
  const now = performance.now();
  if (now - at > 1000) { cur = computeSky(); at = now; }
  return cur;
}

// ── ผสมสี ─────────────────────────────────────────────────────
const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
/** ผสมสีสามช่วงตามน้ำหนักฟ้า: [กลางวัน, เย็น, กลางคืน] */
export function mix3(S, d, k, n) {
  const A = rgb(d), B = rgb(k), C = rgb(n);
  const v = A.map((a, i) => Math.round(a * S.day + B[i] * S.dusk + C[i] * S.night));
  return `rgb(${v[0]},${v[1]},${v[2]})`;
}

// ── ดวงจันทร์ข้างขึ้นข้างแรม ─────────────────────────────────────
/**
 * ดวงจันทร์ (กลาง x,y รัศมี R) ตามข้างขึ้นข้างแรม p · ส่วนมืดจาง ๆ (แสงโลก) · หลุมบนเนื้อที่สว่าง
 * lit = สีเนื้อสว่าง · craters = วาดหลุม (ภาพใหญ่ในกล้อง)
 */
export function drawMoonPhase(c, x, y, R, p, lit = '#FFF4D2', craters = false, darkA = 0.08) {
  c.save();
  // ส่วนมืดจางมาก (ไม่ให้ดูเป็นวงจันทรุปราคา — ผู้ใช้เคยทัก 7 พ.ย.)
  if (darkA > 0) { c.fillStyle = `rgba(150,140,210,${darkA})`; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill(); }
  // เสี้ยวบางสุดเท่าข้างขึ้น ~3 ค่ำ (เดือนดับ/เสี้ยวบางมากยังเห็นเป็นเสี้ยวสวย ๆ)
  const k = Math.min(0.55, Math.cos(p * TAU)), right = p < 0.5;
  const path = new Path2D();
  path.arc(x, y, R, -Math.PI / 2, Math.PI / 2, !right);
  path.ellipse(x, y, Math.max(0.01, R * Math.abs(k)), R, 0, Math.PI / 2, -Math.PI / 2, right ? k > 0 : k < 0);
  path.closePath();
  c.fillStyle = lit;
  c.fill(path);
  if (craters) {
    c.clip(path);
    for (const [dx, dy, r, a] of [[-0.35, -0.3, 0.2, 0.16], [0.28, -0.42, 0.12, 0.14], [0.38, 0.18, 0.22, 0.12], [-0.12, 0.42, 0.14, 0.15], [-0.5, 0.2, 0.1, 0.13], [0.05, -0.05, 0.09, 0.1], [0.6, -0.1, 0.08, 0.12]]) {
      c.fillStyle = `rgba(200,170,120,${a})`;
      c.beginPath(); c.arc(x + dx * R, y + dy * R, r * R, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.28)';
      c.beginPath(); c.arc(x + dx * R - r * R * 0.25, y + dy * R - r * R * 0.25, r * R * 0.55, 0, TAU); c.fill();
    }
    const g = c.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.1, x, y, R);
    g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(230,200,150,.12)');
    c.fillStyle = g; c.fillRect(x - R, y - R, 2 * R, 2 * R);
  }
  c.restore();
}

// ── วิวนอกหน้าต่าง (แคชพร้อมผนัง — ผูก key) ──────────────────────
// ชุดสีต่อช่วง: ฟ้า 4 สี · เมฆ · เนินสองชั้น · พุ่มดอก · หอคอย/หลังคา · หน้าต่างหอคอย
const VIEW = {
  day: { sky: ['#A9D6FF', '#DCEFFF', '#FFE9F5', '#FFF4FA'], cloud: 'rgba(255,255,255,.92)', h1: '#BFE5B4', h2: '#ACDDA2', bush: ['#F7B6D2', '#86CB8E'], tower: '#E4D6FA', roof: '#B49AEB', win: null },
  dusk: { sky: ['#8E7AD0', '#E9A3C8', '#FFC59E', '#FFE3B8'], cloud: 'rgba(255,214,222,.9)', h1: '#C9B2C8', h2: '#B79FBE', bush: ['#E59AB8', '#8FA88E'], tower: '#D8C2E8', roof: '#9A7BC9', win: '#FFE08A' },
  night: { sky: ['#1F1D57', '#2F2A78', '#4D4296', '#6A5AAE'], cloud: 'rgba(160,150,220,.18)', h1: '#3C4482', h2: '#465092', bush: ['#6F5C9C', '#3F6A78'], tower: '#6C5FA8', roof: '#4E3F8E', win: '#FFE08A' },
};
function paintView(c, x0, x1, top, bot, seed, P, phase, S) {
  const vh = bot - top, w = x1 - x0;
  c.fillStyle = lg(c, 0, top, 0, bot, [[0, P.sky[0]], [0.55, P.sky[1]], [0.8, P.sky[2]], [1, P.sky[3]]]);
  c.fillRect(x0, top, w, vh);
  if (phase === 'night') {
    // ดาว (ภาพนิ่ง — ดาวระยิบวาดสดทับใน castle-hall twinkles)
    for (let i = 0; i < 26; i++) {
      const sx = x0 + hash(i * 3.1 + seed * 17) * w, sy = top + hash(i * 5.7 + seed * 9) * vh * 0.62;
      c.fillStyle = i % 5 ? 'rgba(255,255,255,.85)' : '#FFE9A8';
      c.beginPath(); c.arc(sx, sy, i % 7 ? 0.9 : 1.5, 0, TAU); c.fill();
    }
    // ดวงจันทร์ข้างขึ้นข้างแรมจริง (บางบาน)
    if (seed % 1 > 0.3 || w > 180) {
      const mx = x0 + w * (w > 180 ? 0.74 : 0.3), my = top + vh * 0.2, R = Math.min(13, w * 0.09);
      const g = c.createRadialGradient(mx, my, 2, mx, my, R * 3.2);
      g.addColorStop(0, 'rgba(255,240,200,.4)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = g; c.beginPath(); c.arc(mx, my, R * 3.2, 0, TAU); c.fill();
      drawMoonPhase(c, mx, my, R, S.moon);
    }
  }
  if (phase === 'dusk') {
    // ดวงอาทิตย์ต่ำใกล้ขอบฟ้า (เช้า = ฝั่งซ้าย · เย็น = ฝั่งขวา)
    const sx = x0 + w * (S.am ? 0.24 : 0.76), sy = top + vh * 0.72;
    const g = c.createRadialGradient(sx, sy, 3, sx, sy, w * 0.5);
    g.addColorStop(0, 'rgba(255,236,190,.9)'); g.addColorStop(0.25, 'rgba(255,190,150,.45)'); g.addColorStop(1, 'rgba(255,190,150,0)');
    c.fillStyle = g; c.fillRect(x0, top, w, vh);
    c.fillStyle = '#FFE7B0'; c.beginPath(); c.arc(sx, sy, Math.min(16, w * 0.1), 0, TAU); c.fill();
  }
  c.fillStyle = P.cloud;
  for (const [dx, dy, r] of [[0.18, 0.2, 10], [0.3, 0.17, 13], [0.42, 0.22, 9], [0.7, 0.36, 8], [0.8, 0.33, 11], [0.9, 0.38, 7]]) {
    c.beginPath(); c.arc(x0 + w * ((dx + seed * 0.13) % 1), top + vh * dy, r * w / 124, 0, TAU); c.fill();
  }
  const tx = x0 + w * (0.68 - seed * 0.2), ty = top + vh * 0.58;
  c.fillStyle = P.tower; c.fillRect(tx - 7, ty, 14, vh);
  c.fillStyle = P.roof; c.beginPath(); c.moveTo(tx - 10, ty + 1); c.lineTo(tx, ty - 20); c.lineTo(tx + 10, ty + 1); c.fill();
  c.fillStyle = '#FF8FB3'; c.beginPath(); c.moveTo(tx, ty - 20); c.lineTo(tx, ty - 28); c.lineTo(tx + 7, ty - 25); c.lineTo(tx, ty - 22); c.fill();
  if (P.win) {
    // หน้าต่างหอคอยไกล ๆ เปิดไฟ
    const g = c.createRadialGradient(tx, ty + 12, 1, tx, ty + 12, 14);
    g.addColorStop(0, 'rgba(255,224,138,.6)'); g.addColorStop(1, 'rgba(255,224,138,0)');
    c.fillStyle = g; c.beginPath(); c.arc(tx, ty + 12, 14, 0, TAU); c.fill();
    c.fillStyle = P.win; c.beginPath(); c.roundRect(tx - 3, ty + 7, 6, 9, [3, 3, 0, 0]); c.fill();
  }
  c.fillStyle = P.h1; c.beginPath(); c.ellipse(x0 + w * 0.22, bot + 4, w * 0.56, 34, 0, 0, TAU); c.fill();
  c.fillStyle = P.h2; c.beginPath(); c.ellipse(x1 - w * 0.08, bot + 10, w * 0.6, 34, 0, 0, TAU); c.fill();
  for (const [dx, dy, r, j] of [[0.1, -26, 12, 0], [0.27, -22, 10, 1], [0.8, -16, 12, 0], [0.95, -20, 9, 1]]) {
    c.fillStyle = P.bush[j]; c.beginPath(); c.arc(x0 + w * dx, bot + dy, r, 0, TAU); c.arc(x0 + w * dx + r * 0.8, bot + dy + 4, r * 0.8, 0, TAU); c.fill();
  }
  if (phase === 'night') {
    // หิ่งห้อย/ไฟบ้านไกล ๆ ตามเนิน
    for (let i = 0; i < 5; i++) {
      c.fillStyle = 'rgba(255,226,150,.85)';
      c.beginPath(); c.arc(x0 + w * hash(i * 7.7 + seed * 3), bot - 6 - hash(i * 2.3 + seed) * 14, 1.2, 0, TAU); c.fill();
    }
  }
}
/** วิวนอกหน้าต่าง: ผสมกลางวัน → เย็น → กลางคืน ตามน้ำหนักฟ้า S */
export function windowSky(c, x0, x1, top, bot, seed, S = sky()) {
  const vh = bot - top, w = x1 - x0;
  paintView(c, x0, x1, top, bot, seed, VIEW.day, 'day', S);
  const a1 = S.dusk / Math.max(1e-6, S.day + S.dusk);
  if (a1 > 0.01) { c.save(); c.globalAlpha = a1; paintView(c, x0, x1, top, bot, seed, VIEW.dusk, 'dusk', S); c.restore(); }
  if (S.night > 0.01) { c.save(); c.globalAlpha = S.night; paintView(c, x0, x1, top, bot, seed, VIEW.night, 'night', S); c.restore(); }
  // ฟิล์มกระจก + แสงสะท้อนเฉียง (จางลงตอนกลางคืน)
  c.fillStyle = 'rgba(255,240,250,.12)'; c.fillRect(x0, top, w, vh);
  c.fillStyle = `rgba(255,255,255,${0.26 - 0.14 * S.night})`;
  c.beginPath(); c.moveTo(x0 + w * 0.15, bot); c.lineTo(x0 + w * 0.42, top); c.lineTo(x0 + w * 0.56, top); c.lineTo(x0 + w * 0.29, bot); c.fill();
}

/** ดาวระยิบ (วาดสดทับหน้าต่างตอนกลางคืน) — ตัดในกรอบ clip ที่ผู้เรียกตั้งไว้ */
export function windowTwinkles(c, x0, x1, top, bot, seed, t, a) {
  if (a < 0.05) return;
  const w = x1 - x0, vh = bot - top;
  for (let i = 0; i < 5; i++) {
    const tw = Math.sin(t * (0.04 + hash(i + seed) * 0.05) + i * 2.1);
    if (tw < 0.2) continue;
    c.globalAlpha = a * tw;
    c.fillStyle = i % 2 ? '#FFFFFF' : '#FFE9A8';
    star(c, x0 + hash(i * 9.1 + seed * 5) * w, top + 8 + hash(i * 4.3 + seed * 3) * vh * 0.5, 1.6 + tw * 1.6, t * 0.01);
    c.fill();
  }
  // ดาวตกนาน ๆ ที
  const per = 520 + Math.floor(hash(seed * 7) * 300), ph = ((t + seed * 991) % per) / per;
  if (ph < 0.08) {
    const u = ph / 0.08, sx = x0 + w * (0.2 + 0.5 * hash(Math.floor((t + seed * 991) / per) + seed)) + u * w * 0.35, sy = top + vh * 0.1 + u * vh * 0.18;
    const g = c.createLinearGradient(sx, sy, sx - 26, sy - 12);
    g.addColorStop(0, `rgba(255,255,255,${a * (1 - u)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalAlpha = 1; c.strokeStyle = g; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - 26, sy - 12); c.stroke();
  }
  c.globalAlpha = 1;
}

/** วิวนอกประตูทางเข้า (สวนหน้าปราสาท + ทางเดิน) ตามเวลา */
export function doorView(c, x0, x1, top, bot, S = sky()) {
  const w = x1 - x0, h = bot - top, gy = top + h * 0.62;
  const paint = (P, night) => {
    c.fillStyle = lg(c, 0, top, 0, gy, [[0, P.sky[0]], [0.7, P.sky[2]], [1, P.sky[3]]]);
    c.fillRect(x0, top, w, gy - top + 1);
    c.fillStyle = lg(c, 0, gy, 0, bot, [[0, P.h1], [1, P.h2]]);
    c.fillRect(x0, gy, w, bot - gy);
    c.fillStyle = night ? '#7A6BB0' : '#E8D6F5';
    c.beginPath(); c.moveTo(x0 + 56, bot); c.lineTo(x0 + 72, gy); c.lineTo(x1 - 72, gy); c.lineTo(x1 - 56, bot); c.fill();
    for (const [dx, j] of [[18, 1], [152, 0]]) { c.fillStyle = P.bush[j]; c.beginPath(); c.arc(x0 + dx, gy - 2, 22, 0, TAU); c.fill(); }
    if (night) {
      for (let i = 0; i < 14; i++) { c.fillStyle = i % 4 ? 'rgba(255,255,255,.85)' : '#FFE9A8'; c.beginPath(); c.arc(x0 + hash(i * 3.3) * w, top + hash(i * 6.1) * (gy - top) * 0.8, i % 5 ? 0.9 : 1.4, 0, TAU); c.fill(); }
      // โคมทางเดินในสวน
      for (const dx of [40, 130]) {
        const g = c.createRadialGradient(x0 + dx, gy + 8, 1, x0 + dx, gy + 8, 22);
        g.addColorStop(0, 'rgba(255,226,150,.7)'); g.addColorStop(1, 'rgba(255,226,150,0)');
        c.fillStyle = g; c.beginPath(); c.arc(x0 + dx, gy + 8, 22, 0, TAU); c.fill();
      }
    }
  };
  paint(VIEW.day, false);
  const a1 = S.dusk / Math.max(1e-6, S.day + S.dusk);
  if (a1 > 0.01) { c.save(); c.globalAlpha = a1; paint(VIEW.dusk, false); c.restore(); }
  if (S.night > 0.01) { c.save(); c.globalAlpha = S.night; paint(VIEW.night, true); c.restore(); }
}
