// src/town/light-fx.js
// ─────────────────────────────────────────────────────────────
// ชั้นแสงหน้าจอ (ต้นแบบ — ผู้ใช้ 15 พ.ย. 2026: "ภาพสวยขึ้นแบบมีแสงเงา แสงจากไฟ มีมิติ" · ลองที่ดาดฟ้าชั้น 3 ก่อน)
//
// วาดทับฉากทั้งหมด (หลังตัวละคร ก่อนปุ่ม/หน้าต่าง) เป็นชั้น ๆ — ทุกชั้นตามเวลาจริงของฟ้า (castle-sky.js day/dusk/night):
//   1 โทนสีทั้งฉาก (soft-light) — กลางวันครีมอุ่น · เย็นส้มทองชมพู · กลางคืนม่วงน้ำเงิน
//   2 แสงฟุ้งรอบโคม/ไฟ (screen) — กลางคืนสว่างกว่า
//   3 แสงดวงอาทิตย์/จันทร์ + ลำแสงเฉียง (god rays) ส่ายช้า ๆ
//   4 วงแสงลอย (bokeh) ด้านหน้าสุด เลื่อนตามกล้องเร็วกว่าฉาก (ดูมีระยะ)
//   5 ขอบจอมืดนิด ๆ (vignette) — สายตารวมกลางจอ
// เบาเครื่อง: แสงฟุ้ง/วงแสงใช้ภาพที่วาดเตรียมไว้ (sprite) แปะซ้ำ ไม่สร้างไล่สีใหม่ทีละดวงทุกเฟรม · ไม่ใช้ ctx.filter (Safari ไม่รองรับ)
// เปิด/ปิด: ปุ่ม L (e.code KeyL) · ?fx=0 / ?fx=1 · จำในเครื่อง — ต้นแบบยังไม่อยู่ในหน้าตั้งค่า (ผู้เล่นเลือกเองทีหลัง — ห้ามปรับเองอัตโนมัติ)
// ─────────────────────────────────────────────────────────────
import { sky } from './castle-sky.js';

const KEY = 'cookie-runner:town:lightfx';
// ระดับ: 0 ปิด · 1 อ่อน · 2 กลาง · 3 เข้ม (ผู้ใช้ 16 พ.ย.: "อ่อนไป แทบไม่ต่าง" → ทำสามระดับให้เลือกเทียบ)
let LV = 2;
try {
  const q = new URLSearchParams(location.search).get('fx');
  if (q != null && /^[0-3]$/.test(q)) LV = +q;
  else { const v = localStorage.getItem(KEY); if (v != null && /^[0-3]$/.test(v)) LV = +v; }
} catch { /* ค่าตั้งต้น */ }
export const lightFxLevel = () => LV;
export function setLightFxLevel(v) {
  LV = Math.max(0, Math.min(3, v | 0));
  try { localStorage.setItem(KEY, String(LV)); } catch { /* รอบนี้ยังใช้ได้ */ }
  return LV;
}
export const lightFxOn = () => LV > 0;
/** ปุ่ม L: ปิด ↔ ระดับที่ใช้ล่าสุด */
let lastOn = 2;
export function toggleLightFx() { if (LV > 0) { lastOn = LV; setLightFxLevel(0); } else setLightFxLevel(lastOn); return LV > 0; }

/** ภาพแสงฟุ้งกลมสีขาว (ย้อมสีตอนแปะด้วย globalAlpha + ชั้นสี) — วาดครั้งเดียว */
const SPR = {};
function glowSprite(col) {
  if (SPR[col]) return SPR[col];
  const S = 128, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(0.25, `rgba(${col},.55)`); gr.addColorStop(0.6, `rgba(${col},.14)`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return (SPR[col] = cv);
}
/** วงแสงโบเก้ (ขอบชัดกว่าแสงฟุ้ง ข้างในจาง) */
function bokehSprite(col) {
  const key = 'b' + col;
  if (SPR[key]) return SPR[key];
  const S = 96, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, `rgba(${col},.35)`); gr.addColorStop(0.78, `rgba(${col},.5)`); gr.addColorStop(0.9, `rgba(${col},.75)`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return (SPR[key] = cv);
}
const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const mix = (S, d, k, n) => d.map((v, i) => Math.round(v * S.day + k[i] * S.dusk + n[i] * S.night));

/**
 * ฉากแต่ละแบบ (env) — ผู้ใช้ 16 พ.ย. 2026 "ใส่แสงทุกฉาก"
 *   ไม่ส่ง env = ฟ้าจริงตามเวลา (ดาดฟ้า)
 *   env.S = สภาพฟ้าคงที่ของฉากนั้น ({day,dusk,night,sunU}) · env.pt = [x, y] ดวงอาทิตย์ที่วาดอยู่ในฉาก (พิกัดจอ) — เมือง/สวนฝันที่ฟ้าไม่เปลี่ยนตามเวลา
 *   env.wins = ในร่ม: หน้าต่าง [{x,y,w}] พิกัดโลก — ไม่มีดวงอาทิตย์บนจอ · แสงหลักมาจากหน้าต่างที่ใกล้สุด · กลางคืนห้องมืดลง โคมเด่น
 */
const skyOf = (env) => env?.S || sky();
/** จุดแหล่งแสงบนจอ: ดวงอาทิตย์ตามเวลา · กลางคืน = ดวงจันทร์มุมขวาบน */
function skyPoint(S, vw, camY, env) {
  if (env?.pt) return env.pt;
  return S.night > 0.5 ? [vw * 0.78, 70 + camY] : [vw * (0.08 + 0.84 * S.sunU), 60 + (1 - Math.sin(S.sunU * Math.PI)) * 150 + camY];
}

/**
 * แหล่งแสงที่ส่องตัวละคร ณ จุด (x, y) พิกัดโลก — ใช้กับแสงขอบ (rim-light.js)
 * คืน [{ux, uy (ทิศจากตัวไปหาแสง บนจอ), col, shade (สีเงาฝั่งตรงข้าม), a (แรง 0..1)}] เรียงแรงสุดก่อน · สูงสุด 2 แหล่ง (ฟ้า + โคมที่ใกล้สุด)
 */
export function lightSources(x, y, { camX, camY = 0, vw, lights = [], env = null }) {
  const S = skyOf(env), n = S.night, d = S.dusk, day = S.day;
  const out = [];
  const col = mix(S, [255, 240, 205], [255, 168, 92], [178, 196, 255]).join(',');
  const shade = mix(S, [150, 110, 170], [140, 80, 150], [70, 60, 140]).join(',');
  if (env?.wins) {
    // ในร่ม: หน้าต่างที่ใกล้สุด (แรงลดตามระยะ) — กลางวัน/เย็นแสงแดดเข้ามา · กลางคืนแสงจันทร์จาง
    let best = null, bw = 0;
    for (const w of env.wins) {
      const dx = w.x - x, dy = w.y - y, dist = Math.hypot(dx, dy), R = 900;
      if (dist > R) continue;
      const k = (1 - dist / R) * w.w;
      if (k > bw) { bw = k; best = { ux: dx / (dist || 1), uy: dy / (dist || 1) }; }
    }
    if (best) out.push({ ...best, col, shade, a: Math.min(1, bw * (0.7 * day + 0.95 * d + 0.35 * n)) });
  } else {
    const [lx, ly] = skyPoint(S, vw, camY, env);
    const sx = x - camX, sy = y + camY;
    const ux = lx - sx, uy = ly - sy;
    const l = Math.hypot(ux, uy) || 1;
    out.push({ ux: ux / l, uy: uy / l, col, shade, a: 0.55 * day + 0.95 * d + 0.6 * n });
  }
  // โคมที่ใกล้สุด: กลางคืน/แดดเย็นเด่น กลางวันจาง
  let best = null, bw = 0;
  for (const L of lights) {
    const dx = L.x - x, dy = L.y - y, dist = Math.hypot(dx, dy), R = L.r * 1.6;
    if (dist > R) continue;
    const w = (1 - dist / R) * L.w * (0.15 + 0.85 * n + 0.5 * d);
    if (w > bw) { bw = w; best = { ux: dx / (dist || 1), uy: dy / (dist || 1) }; }
  }
  if (best && bw > 0.05) out.push({ ...best, col: '255,196,120', shade: '120,70,120', a: Math.min(1, bw * 1.4) });
  out.sort((a, b) => b.a - a.a);
  return out;
}

/**
 * วาดชั้นแสง (พิกัดจอ หน่วยฉาก — ctx ตั้ง setTransform(k,0,0,k,0,0) มาแล้ว)
 * o: { camX, camY, vw, H, t, lights: [{x, y, r, w}] (พิกัดโลก), sun: true = มีดวงอาทิตย์/จันทร์ในฉากนี้ }
 */
export function drawLightFx(c, { camX, camY = 0, vw, H, t, lights = [], sun = true, env = null }) {
  if (!LV) return;
  const S = skyOf(env), n = S.night, d = S.dusk, day = S.day;
  const indoor = !!env?.wins;
  if (indoor) sun = false;
  const K = [0, 1, 1.9, 2.9][LV];   // ตัวคูณความแรง
  const M = (import.meta.env.DEV && window.__fxMask != null) ? window.__fxMask : 31;   // ทดสอบทีละชั้น (dev)
  c.save();

  // ── 1 โทนสีทั้งฉาก: ย้อมแบบคูณ (multiply) = สีอิ่มขึ้น ไม่ซีดเป็นหมอก · บนอุ่นกว่า ล่างมีน้ำหนัก ──
  // จุดแหล่งแสงบนจอ (ดวงอาทิตย์ตามเวลา · กลางคืน = ดวงจันทร์มุมขวาบน)
  const [lx, ly] = skyPoint(S, vw, camY, env);
  if ((M & 1) && indoor) {
    // ── ในร่ม: ไม่มีทิศแดดบนจอ — ทั้งห้องย้อมตามเวลา (กลางวันแทบไม่เปลี่ยน · เย็นอุ่นขึ้น · กลางคืนมืดลงอมม่วง โคมเด่นขึ้น) ──
    c.globalCompositeOperation = 'multiply';
    const tone = mix(S, [253, 250, 255], [248, 232, 234], [228, 220, 248]).map((v) => Math.round(255 - (255 - v) * Math.min(1.6, K)));   // ห้องยังต้องมองเห็นชัด — มืดลงแค่นิดเดียว
    c.fillStyle = `rgb(${tone})`; c.fillRect(0, 0, vw, H);
    // ปิดโคมยามค่ำ (ชั้น 2) = ห้องมืดลงอีก · ไฟโคมระย้ายังเรืองอยู่ (ชั้น 2 ด้านล่าง)
    if (env.dark > 0.01) { c.fillStyle = `rgba(150,140,210,${Math.min(0.55, env.dark * 0.5 * (0.7 + 0.3 * K)).toFixed(3)})`; c.fillRect(0, 0, vw, H); }
  } else if (M & 1) {
  // ── 1 แสงทิศทางเดียว: ฝั่งแหล่งแสงสว่างเท่าเดิม → อีกฝั่งค่อย ๆ มืดและอมสี (multiply) = ภาพมีมิติ ไม่แบน ──
  c.globalCompositeOperation = 'multiply';
  const far = mix(S, [236, 228, 246], [214, 176, 206], [168, 156, 220]).map((v) => Math.round(255 - (255 - v) * Math.min(2.2, K)));
  const gx = c.createRadialGradient(lx, ly, 40, lx, ly, Math.hypot(vw, H) * 0.95);
  gx.addColorStop(0, 'rgb(255,255,255)'); gx.addColorStop(0.45 - 0.08 * (K - 1), 'rgb(255,255,255)'); gx.addColorStop(1, `rgb(${far})`);
  c.fillStyle = gx; c.fillRect(0, 0, vw, H);
  // ── แสงอุ่นรอบแหล่งแสง (soft-light — เพิ่มสีอิ่มฝั่งสว่าง: เย็นส้มทอง กลางคืนอมฟ้าม่วง) ──
  c.globalCompositeOperation = 'soft-light';
  const wc = mix(S, [255, 196, 110], [255, 120, 40], [140, 120, 255]);
  const gw = c.createRadialGradient(lx, ly, 20, lx, ly, Math.max(vw, H) * 0.7);
  gw.addColorStop(0, `rgba(${wc},${Math.min(0.9, (0.18 + 0.3 * d + 0.1 * n) * K)})`); gw.addColorStop(1, `rgba(${wc},0)`);   // ห้ามเข้มเกิน — soft-light สีอ่อนทาทั้งจอ = ภาพซีดเป็นหมอก
  c.fillStyle = gw; c.fillRect(0, 0, vw, H);
  }

  // ── 3 ดวงอาทิตย์/จันทร์: แสงฟุ้งใหญ่ + ลำแสงเฉียง ──
  c.globalCompositeOperation = 'screen';
  if (sun && (M & 2)) {
    const u = S.sunU, sunVis = day + d;
    const col = n > 0.5 ? '190,200,255' : d > day ? '255,190,130' : '255,236,190';
    const a = Math.min(1, (n > 0.5 ? 0.18 : 0.45 * sunVis) * (0.6 + 0.4 * K)), gs = 190 * (0.8 + 0.25 * K);
    c.globalAlpha = a; c.drawImage(glowSprite(col), lx - gs, ly - gs, gs * 2, gs * 2);
    c.globalAlpha = a * 0.5; c.drawImage(glowSprite('255,255,240'), lx - 60, ly - 60, 120, 120);
    // ลำแสง: ลิ่มยาวส่องลงเฉียงจากแหล่งแสง ส่ายช้า ๆ คนละจังหวะ
    for (let i = 0; i < 6; i++) {
      const ang = Math.PI * 0.5 + (lx < vw / 2 ? -0.55 : 0.55) + (i - 2.5) * 0.16 + Math.sin(t * 0.004 + i * 1.7) * 0.04;
      const len = H * 1.6, wid = (0.012 + 0.014 * hash(i + 3)) * (0.7 + 0.4 * K);   // ลำแสงเรียว (กว้างไป = ฉากจางเป็นหมอก)
      const ra = (n > 0.5 ? 0.025 * (K - 1) : 0.07 * sunVis * K) * (0.6 + 0.4 * Math.sin(t * 0.006 + i * 2.1));
      const gr = c.createLinearGradient(lx, ly, lx + Math.cos(ang) * len, ly + Math.sin(ang) * len);
      gr.addColorStop(0, `rgba(${col},${ra})`); gr.addColorStop(0.55, `rgba(${col},${ra * 0.5})`); gr.addColorStop(1, `rgba(${col},0)`);
      c.globalAlpha = 1; c.fillStyle = gr;
      c.beginPath(); c.moveTo(lx, ly);
      c.lineTo(lx + Math.cos(ang - wid) * len, ly + Math.sin(ang - wid) * len);
      c.lineTo(lx + Math.cos(ang + wid) * len, ly + Math.sin(ang + wid) * len);
      c.closePath(); c.fill();
    }
  }

  // ── 2 แสงฟุ้งรอบโคม/ไฟ (กลางคืนสว่าง · กลางวันจาง) ──
  // ในร่ม: โคมในฉากมีแสงฟุ้งของตัวเองอยู่แล้ว — กลางวันไม่เติม (ไม่งั้นทั้งห้องเป็นหมอก) · เย็น/กลางคืนค่อยเติม
  const la = (indoor ? 0.7 * n + 0.3 * d : 0.12 + 0.55 * n + 0.35 * d) * (0.7 + 0.4 * K);
  const lspr = glowSprite('255,214,150');
  for (const L of (M & 4) ? lights : []) {
    const x = L.x - camX, y = L.y + camY;
    if (x < -L.r || x > vw + L.r) continue;
    const fl = 0.85 + 0.15 * Math.sin(t * 0.05 + L.x * 0.01);
    c.globalAlpha = Math.min(1, la * L.w * fl);
    const rr = L.r * (0.6 + 0.2 * K); c.drawImage(lspr, x - rr, y - rr, rr * 2, rr * 2);
  }

  // ── 4 วงแสงลอย (โบเก้) — ชั้นหน้าสุด เลื่อนเร็วกว่ากล้อง ──
  const bcols = ['255,214,170', '255,190,220', '255,240,200', '220,210,255'];
  for (let i = 0; i < ((M & 8) ? (indoor ? 0 : 9) : 0); i++) {   // ในร่ม = ไม่มีวงแสงลอย (บนผนังดูเป็นคราบ)
    const sz = 10 + 26 * hash(i + 11), par = 1.2 + 0.6 * hash(i + 5);
    const span = vw + 200;
    const x = ((((hash(i) * 3000 - camX * par + t * (0.08 + 0.1 * hash(i + 2))) % span) + span) % span) - 100;
    const y = H * (0.12 + 0.8 * hash(i + 7)) + Math.sin(t * 0.01 + i) * 10 + camY * 0.3;
    c.globalAlpha = (0.08 + 0.12 * hash(i + 9)) * (0.6 + 0.4 * K) * (0.6 + 0.4 * Math.sin(t * 0.02 + i * 2)) * (0.55 + 0.45 * (n + d));
    c.drawImage(bokehSprite(bcols[i % 4]), x - sz, y - sz, sz * 2, sz * 2);
  }

  // ── 5 ขอบจอมืดนิด ๆ ──
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  if (!(M & 16)) { c.restore(); return; }
  const vg = c.createRadialGradient(vw / 2, H * 0.55, Math.min(vw, H) * 0.5, vw / 2, H * 0.55, Math.max(vw, H) * 0.75);
  const vc = mix(S, [90, 50, 70], [90, 40, 70], [20, 15, 50]);
  vg.addColorStop(0, `rgba(${vc},0)`); vg.addColorStop(1, `rgba(${vc},${Math.min(0.85, (0.5 + 0.15 * n) * (0.75 + 0.25 * K))})`);
  c.fillStyle = vg; c.fillRect(0, 0, vw, H);
  c.restore();
}
