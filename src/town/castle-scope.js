// src/town/castle-scope.js
// ─────────────────────────────────────────────────────────────
// ส่องกล้องดูดาว ชั้น 3 (ผู้ใช้ 8 พ.ย. "กดแล้วตัดฉากเห็นภาพในกล้อง เลื่อนดูดวงดาวใหญ่ขึ้นได้ · มีกลางวันกลางคืน")
//   ตัดฉาก: ม่านมืด → เลนส์กล้องรูปหัวแมวค่อย ๆ เปิด · ปิด = เลนส์หุบกลับ
//   ฟ้าในกล้องกว้าง SW × SH หน่วย — ลากนิ้ว/เมาส์ (มีแรงเหวี่ยง) · ลูกศร/WASD · ซูม 1–2.4 เท่า (ล้อเมาส์ · ถ่างนิ้ว · ปุ่ม + −)
//   ตามเวลาจริง (castle-sky.js): กลางคืน = ดาวเต็มฟ้า ทางช้างเผือก ดวงจันทร์ข้างขึ้นข้างแรมจริง ดาวเคราะห์ กลุ่มดาวแมว/ปลาทู/อุ้งเท้า ดาวหาง ดาวตก
//                               กลางวัน = เมฆปุย (มีเมฆรูปแมว รูปปลา) บอลลูนหน้าแมว ฝูงนก ว่าวปลา รุ้ง ดวงจันทร์จาง ๆ · ฟ้าเย็น = ผสมกัน ดวงอาทิตย์ตกขอบฟ้า
//   ส่องใกล้ของเด่น = ป้ายชื่อขึ้นในเลนส์ (เล่นเป็นการค้นหาได้)
// วาดลงผ้าใบเดิมของเมือง (พิกัดจอ หน่วยโลก) — ฉากปราสาทไม่วาดตอนส่องกล้อง (เบา)
// ─────────────────────────────────────────────────────────────
import { lg, star, heart } from './world.js';
import { sky, mix3, drawMoonPhase } from './castle-sky.js';
import { rr, goldV } from './castle-hall.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clamp01 = (v) => clamp(v, 0, 1);
const ease = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const SW = 2600, SH = 1200;
const ZMIN = 1, ZMAX = 2.4;

// ── ของในฟ้า (พิกัดฟ้า) ──────────────────────────────────────────
const MOON = { x: 1480, y: 300, r: 112 };
const PLANETS = [
  { id: 'ring', x: 640, y: 330, r: 44, name: 'ดาวเสาร์สีชมพู' },
  { id: 'mint', x: 2120, y: 520, r: 58, name: 'ดาวเคราะห์มิ้นต์ลายทาง' },
  { id: 'blue', x: 1060, y: 760, r: 22, name: 'ดาวฟ้าน้อยกับดวงจันทร์จิ๋ว' },
];
// กลุ่มดาว: จุดดาว (สัมพัทธ์) + เส้นเชื่อม
const CONST = [
  { name: 'กลุ่มดาวแมวเหมียว', x: 420, y: 700, pts: [[-78, -6], [-64, -82], [-28, -42], [28, -42], [64, -82], [78, -6], [56, 44], [0, 64], [-56, 44], [-28, 4], [28, 4], [0, 26]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0]] },
  { name: 'กลุ่มดาวปลาทู', x: 1900, y: 190, pts: [[-90, 0], [-50, -30], [10, -34], [60, -10], [100, -40], [100, 40], [60, 10], [10, 34], [-50, 30]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0]] },
  { name: 'กลุ่มดาวอุ้งเท้า', x: 2280, y: 880, pts: [[0, 30], [-50, -20], [-20, -55], [20, -55], [50, -20]], lines: [[0, 1], [0, 2], [0, 3], [0, 4]] },
  { name: 'กลุ่มดาวหัวใจ', x: 1180, y: 470, pts: [[0, 50], [-55, 0], [-48, -40], [-14, -44], [0, -20], [14, -44], [48, -40], [55, 0]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0]] },
];
const COMET = { x: 260, y: 230, name: 'ดาวหางหางยาว' };
const NEBULA = [[300, 420, 230, '255,150,210'], [820, 220, 200, '170,150,255'], [980, 620, 240, '140,200,255'], [1300, 560, 210, '255,170,220'],
  [1700, 380, 230, '160,240,210'], [1900, 900, 260, '200,160,255'], [2300, 300, 220, '255,180,200'], [620, 960, 240, '150,190,255'], [2200, 640, 200, '255,200,150']];
const GALAXY = { x: 1700, y: 760, name: 'กาแล็กซีขนมสายไหม' };
// กลางวัน
const BALLOONS = [{ x: 620, y: 520, kind: 'cat', name: 'บอลลูนหน้าแมว' }, { x: 1720, y: 640, kind: 'heart', name: 'บอลลูนหัวใจ' }];
const CLOUDS = [[300, 300, 1.2], [900, 380, 1.5, 'cat'], [1300, 220, 1], [1620, 420, 1.1], [2100, 300, 1.3], [1950, 720, 1.4, 'fish'], [500, 900, 1.1], [1250, 860, 1.2], [2400, 620, 1]];
const KITE = { x: 300, y: 640, name: 'ว่าวปลาคาร์ป' };

export function openScope() {
  const S = sky(), day = S.day + S.dusk * 0.5 > 0.5;
  // เปิดมาเห็นของเด่นสองอย่างในเลนส์: กลางวัน = บอลลูนแมว + เมฆแมว · กลางคืน = ดวงจันทร์ + กลุ่มดาวหัวใจ
  const [x, y] = day ? [660, 480] : [1350, 380];
  return { k: 0, dir: 1, x, y, z: 1, vx: 0, vy: 0, drag: null, shots: [], next: 120 };
}
/** เดินทีละเฟรม: เปิด/ปิดเลนส์ · แรงเหวี่ยง · ปุ่มลูกศร — คืน false = ปิดเสร็จแล้ว */
export function scopeStep(st, dt, keys, R) {
  st.k = clamp01(st.k + dt * st.dir / 26);
  if (st.dir < 0 && st.k <= 0) return false;
  const sp = 5 / st.z;
  if (keys.left) st.vx = -sp; else if (keys.right) st.vx = sp;
  if (keys.up) st.vy = -sp; else if (keys.down) st.vy = sp;
  if (!st.drag) { st.x += st.vx * dt; st.y += st.vy * dt; st.vx *= 0.9; st.vy *= 0.9; }
  clampView(st, R);
  return true;
}
function clampView(st, R) {
  const r = R / st.z;
  st.x = clamp(st.x, r * 0.6, SW - r * 0.6);
  st.y = clamp(st.y, r * 0.6, SH - r * 0.6);
}
/** ลาก (dx, dy หน่วยจอ) — เลื่อนฟ้าตามนิ้ว */
export function scopeDrag(st, dx, dy) {
  st.x -= dx / st.z; st.y -= dy / st.z;
  st.vx = -dx / st.z * 0.9; st.vy = -dy / st.z * 0.9;
}
export function scopeZoom(st, f) { st.z = clamp(st.z * f, ZMIN, ZMAX); }
/** กลางเลนส์ + รัศมี (พิกัดจอ หน่วยโลก) */
export function lensOf(vw, H) { return { cx: vw / 2, cy: H / 2 - 2, R: Math.min(H * 0.39, vw * 0.4) }; }

// ── วาด ─────────────────────────────────────────────────────────
/** ฉากส่องกล้องทั้งจอ (เรียกหลังวาดฉากปราสาท — ช่วงม่านปิดจะทับฉากเดิม) */
export function drawScope(c, vw, H, t, st) {
  const { cx, cy, R } = lensOf(vw, H);
  const k = st.k, dark = clamp01(k / 0.35), open = ease((k - 0.35) / 0.65);
  // ม่านมืดม่วง (ตัดฉาก) + ลายดาวจาง ๆ บนผนังกล้อง
  c.save();
  c.globalAlpha = dark;
  c.fillStyle = lg(c, 0, 0, 0, H, [[0, '#2A1D4E'], [1, '#160F2E']]);
  c.fillRect(-10, -10, vw + 20, H + 20);
  if (open > 0) {
    for (let i = 0; i < 30; i++) {
      c.globalAlpha = dark * (0.25 + 0.25 * Math.sin(t * 0.03 + i));
      c.fillStyle = i % 3 ? '#B9A6EE' : '#FFE48A';
      star(c, hash(i * 3.3) * vw, hash(i * 7.1) * H, 1.4 + hash(i) * 1.6, 0); c.fill();
    }
  }
  c.restore();
  if (open <= 0) return;
  const r = R * open;
  // ภาพในเลนส์
  c.save();
  c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.clip();
  c.translate(cx, cy); c.scale(st.z, st.z); c.translate(-st.x, -st.y);
  const view = { x0: st.x - R / st.z, x1: st.x + R / st.z, y0: st.y - R / st.z, y1: st.y + R / st.z };
  drawSkyWorld(c, t, view, st);
  c.restore();
  // ขอบเลนส์: เงาด้านใน · แสงสะท้อนกระจก · เส้นเล็งจาง
  c.save();
  const ig = c.createRadialGradient(cx, cy, r * 0.72, cx, cy, r);
  ig.addColorStop(0, 'rgba(20,10,40,0)'); ig.addColorStop(1, 'rgba(20,10,40,.55)');
  c.fillStyle = ig; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 6; c.lineCap = 'round';
  c.beginPath(); c.arc(cx, cy, r * 0.86, Math.PI * 1.08, Math.PI * 1.38); c.stroke();
  c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, r * 0.86, Math.PI * 1.44, Math.PI * 1.5); c.stroke();
  c.strokeStyle = 'rgba(255,228,138,.28)'; c.lineWidth = 1;
  c.beginPath(); c.arc(cx, cy, r * 0.2, 0, TAU); c.moveTo(cx - r * 0.32, cy); c.lineTo(cx - r * 0.12, cy); c.moveTo(cx + r * 0.12, cy); c.lineTo(cx + r * 0.32, cy);
  c.moveTo(cx, cy - r * 0.32); c.lineTo(cx, cy - r * 0.12); c.moveTo(cx, cy + r * 0.12); c.lineTo(cx, cy + r * 0.32); c.stroke();
  c.restore();
  drawLensFrame(c, cx, cy, r, t);
  // ป้ายชื่อของที่ส่องเจอ (ใกล้กลางเลนส์)
  if (open > 0.95) {
    const f = found(st);
    if (f) {
      c.save();
      c.font = '700 13px Mali, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const w = c.measureText(f).width + 30, y = cy + r * 0.62;
      c.fillStyle = 'rgba(42,29,78,.72)'; c.beginPath(); c.roundRect(cx - w / 2, y - 14, w, 28, 14); c.fill();
      c.strokeStyle = 'rgba(255,228,138,.8)'; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#FFF4D2'; c.fillText('✦ ' + f, cx, y + 0.5);
      c.restore();
    }
  }
}
/** ขอบกล้องรูปหัวแมว: วงม่วงไล่เงา ขอบทอง หูแมวสองข้าง ดาวสลัก */
function drawLensFrame(c, cx, cy, r, t) {
  c.save();
  // หูแมวอยู่นอกวงขอบกล้องเท่านั้น (ผู้ใช้ 8 พ.ย. หูทะลุเข้ามาในภาพ)
  const outside = new Path2D(); outside.rect(cx - r - 400, cy - r - 400, 2 * r + 800, 2 * r + 800); outside.arc(cx, cy, r + 20, 0, TAU);
  c.save(); c.clip(outside, 'evenodd');
  for (const d of [-1, 1]) {
    const a = -Math.PI / 2 + d * 0.62;
    const ex = cx + Math.cos(a) * (r + 10), ey = cy + Math.sin(a) * (r + 10);
    c.fillStyle = lg(c, 0, ey - 40, 0, ey + 10, [[0, '#B794E4'], [1, '#7E58C8']]);
    c.beginPath(); c.moveTo(ex - d * 34, ey + 8); c.lineTo(ex + d * 6, ey - 44); c.lineTo(ex + d * 30, ey + 2); c.closePath(); c.fill();
    c.fillStyle = '#FFB6D5';
    c.beginPath(); c.moveTo(ex - d * 18, ey + 2); c.lineTo(ex + d * 4, ey - 28); c.lineTo(ex + d * 18, ey); c.closePath(); c.fill();
  }
  c.restore();
  const ring = new Path2D(); ring.arc(cx, cy, r + 24, 0, TAU); ring.arc(cx, cy, r, 0, TAU, true);
  c.fillStyle = lg(c, cx - r, cy - r, cx + r, cy + r, [[0, '#C9AEEF'], [0.45, '#8E66CF'], [1, '#5D45A0']]);
  c.fill(ring);
  c.strokeStyle = '#EBC66F'; c.lineWidth = 3;
  c.beginPath(); c.arc(cx, cy, r + 1.5, 0, TAU); c.stroke();
  c.beginPath(); c.arc(cx, cy, r + 23, 0, TAU); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2;
  c.beginPath(); c.arc(cx, cy, r + 12, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + 0.26, tw = 0.6 + 0.4 * Math.sin(t * 0.05 + i);
    c.globalAlpha = tw; c.fillStyle = i % 3 ? '#F7DE9C' : '#FFB6D5';
    star(c, cx + Math.cos(a) * (r + 12), cy + Math.sin(a) * (r + 12), i % 3 ? 3.2 : 4, a); c.fill();
  }
  c.globalAlpha = 1;
  c.restore();
}
/** ของเด่นที่อยู่ใกล้กลางเลนส์ที่สุด (ชื่อ) — ตามช่วงเวลา */
function found(st) {
  const S = sky(), nightA = S.night + S.dusk * 0.45, dayA = S.day + S.dusk * 0.7;
  const L = [];
  if (nightA > 0.3) {
    L.push([MOON.x, MOON.y, MOON.r, 'ดวงจันทร์ · ' + moonName(S.moon)]);
    for (const p of PLANETS) L.push([p.x, p.y, p.r + 30, p.name]);
    for (const k of CONST) L.push([k.x, k.y, 90, k.name]);
    L.push([COMET.x, COMET.y, 80, COMET.name], [GALAXY.x, GALAXY.y, 80, GALAXY.name]);
  }
  if (dayA > 0.3) {
    for (const b of BALLOONS) L.push([b.x, b.y, 70, b.name]);
    L.push([900, 380, 90, 'ก้อนเมฆยิ้มหวาน'], [1950, 720, 90, 'ก้อนเมฆรูปปลา'], [KITE.x, KITE.y, 80, KITE.name], [1300, 790, 160, 'รุ้งกินน้ำ']);
    if (nightA <= 0.3) L.push([MOON.x, MOON.y, MOON.r, 'ดวงจันทร์ตอนกลางวัน']);
  }
  let best = null, bd = 1e9;
  for (const [x, y, r, n] of L) { const d = Math.hypot(x - st.x, y - st.y); if (d < r + 40 / st.z && d < bd) { bd = d; best = n; } }
  return best;
}
function moonName(p) {
  if (p < 0.03 || p > 0.97) return 'เดือนดับ';
  if (Math.abs(p - 0.5) < 0.03) return 'เต็มดวง';
  return p < 0.5 ? 'ข้างขึ้น' : 'ข้างแรม';
}

// ── ฟ้าในกล้อง (พิกัดฟ้า) ────────────────────────────────────────
function drawSkyWorld(c, t, v, st) {
  const S = sky();
  const nightA = clamp01(S.night + S.dusk * 0.45), dayA = clamp01(S.day + S.dusk * 0.7);
  const vis = (x, y, r) => x + r > v.x0 && x - r < v.x1 && y + r > v.y0 && y - r < v.y1;
  // พื้นฟ้า (บน = ฟ้าลึก · ล่าง = ขอบฟ้า)
  c.fillStyle = lg(c, 0, 0, 0, SH, [
    [0, mix3(S, '#5FA8EC', '#4A3C8E', '#0F0C33')], [0.5, mix3(S, '#8CCBFA', '#9D6FB8', '#211B5A')],
    [0.82, mix3(S, '#C6E6FF', '#F49AA8', '#3B2F7E')], [1, mix3(S, '#F4F8FF', '#FFC98E', '#5A4596')]]);
  c.fillRect(v.x0 - 10, v.y0 - 10, v.x1 - v.x0 + 20, v.y1 - v.y0 + 20);
  // ── กลางคืน ──
  if (nightA > 0.02) {
    c.save(); c.globalAlpha = nightA;
    // ทางช้างเผือก (แถบเฉียง หมอกชมพูม่วงฟ้า)
    for (let i = 0; i < 9; i++) {
      const x = 200 + i * 290, y = 980 - i * 95 + Math.sin(i * 1.7) * 40, r = 150 + hash(i) * 80;
      if (!vis(x, y, r)) continue;
      const g = c.createRadialGradient(x, y, 4, x, y, r);
      const col = ['255,170,220', '190,170,255', '150,210,255'][i % 3];
      g.addColorStop(0, `rgba(${col},.22)`); g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    // เนบิวลาฟุ้งหลากสี (ชมพู ม่วง ฟ้า มิ้นต์) กระจายทั่วฟ้า
    for (const [x, y, r, col] of NEBULA) {
      if (!vis(x, y, r)) continue;
      const g = c.createRadialGradient(x, y, 4, x, y, r);
      g.addColorStop(0, `rgba(${col},.3)`); g.addColorStop(0.5, `rgba(${col},.12)`); g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    // ดาว: ตารางละ 50 หน่วย เม็ดตามแฮช (แถบทางช้างเผือกหนาแน่นกว่า)
    const C = 50;
    for (let gx = Math.floor(v.x0 / C); gx <= Math.floor(v.x1 / C); gx++) {
      for (let gy = Math.floor(v.y0 / C); gy <= Math.floor(v.y1 / C); gy++) {
        const band = Math.abs((gy * C) - (980 - (gx * C - 200) * 0.33)) < 170;
        const n = band ? 7 : 4;
        for (let j = 0; j < n; j++) {
          const h = gx * 73.1 + gy * 19.7 + j * 5.3;
          const x = (gx + hash(h)) * C, y = (gy + hash(h + 1.7)) * C, m = hash(h + 3.3);
          if (y > SH - 110) continue;
          const tw = 0.6 + 0.4 * Math.sin(t * (0.02 + m * 0.05) + h);
          c.globalAlpha = nightA * tw;
          if (m > 0.94) { c.fillStyle = m > 0.97 ? '#FFE9A8' : '#FFFFFF'; star(c, x, y, 3 + m * 2.5, 0); c.fill(); c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill(); }
          else { c.fillStyle = m < 0.2 ? '#FFD6EA' : m < 0.35 ? '#CFE3FF' : '#FFFFFF'; c.beginPath(); c.arc(x, y, 0.7 + m * 1.4, 0, TAU); c.fill(); }
        }
      }
    }
    c.globalAlpha = nightA;
    // กาแล็กซีวงก้นหอย: แกนสว่าง + แขนสองแขนเป็นแถบฟุ้งต่อเนื่อง + ดาวประปรายตามแขน
    if (vis(GALAXY.x, GALAXY.y, 100)) {
      c.save(); c.translate(GALAXY.x, GALAXY.y); c.rotate(-0.3 + t * 0.0006); c.scale(1, 0.55);
      const g = c.createRadialGradient(0, 0, 2, 0, 0, 80);
      g.addColorStop(0, 'rgba(255,246,252,.95)'); g.addColorStop(0.25, 'rgba(255,180,225,.45)'); g.addColorStop(1, 'rgba(170,150,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 80, 0, TAU); c.fill();
      c.lineCap = 'round';
      for (const arm of [0, Math.PI]) {
        for (const [w, col] of [[16, 'rgba(200,170,255,.18)'], [8, 'rgba(255,190,230,.35)'], [3, 'rgba(255,240,250,.8)']]) {
          c.strokeStyle = col; c.lineWidth = w;
          c.beginPath();
          for (let k = 0; k <= 40; k++) { const u = k / 40, a2 = arm + u * 4.6, d = 6 + u * 70; const px = Math.cos(a2) * d, py = Math.sin(a2) * d; k ? c.lineTo(px, py) : c.moveTo(px, py); }
          c.stroke();
        }
        for (let k = 0; k < 14; k++) { const u = hash(k * 3.7 + arm) , a2 = arm + u * 4.6, d = 6 + u * 70; c.fillStyle = k % 3 ? '#FFFFFF' : '#FFD6EA'; c.beginPath(); c.arc(Math.cos(a2) * d + (hash(k) - 0.5) * 8, Math.sin(a2) * d + (hash(k + 9) - 0.5) * 8, 1.4, 0, TAU); c.fill(); }
      }
      c.restore();
    }
    // ดาวหาง
    if (vis(COMET.x, COMET.y, 200)) {
      const g = c.createLinearGradient(COMET.x, COMET.y, COMET.x + 190, COMET.y - 70);
      g.addColorStop(0, 'rgba(200,240,255,.85)'); g.addColorStop(1, 'rgba(200,240,255,0)');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(COMET.x, COMET.y - 6); c.quadraticCurveTo(COMET.x + 100, COMET.y - 50, COMET.x + 200, COMET.y - 80); c.lineTo(COMET.x + 190, COMET.y - 50); c.quadraticCurveTo(COMET.x + 90, COMET.y - 10, COMET.x, COMET.y + 6); c.fill();
      const hg = c.createRadialGradient(COMET.x, COMET.y, 1, COMET.x, COMET.y, 16);
      hg.addColorStop(0, '#FFFFFF'); hg.addColorStop(1, 'rgba(200,240,255,0)');
      c.fillStyle = hg; c.beginPath(); c.arc(COMET.x, COMET.y, 16, 0, TAU); c.fill();
    }
    // กลุ่มดาว: เส้นทองจาง + ดาวสว่าง (กะพริบเป็นจังหวะ)
    for (const K of CONST) {
      if (!vis(K.x, K.y, 130)) continue;
      const pulse = 0.55 + 0.45 * Math.sin(t * 0.03 + K.x);
      c.strokeStyle = `rgba(255,228,138,${0.35 + 0.25 * pulse})`; c.lineWidth = 1.4; c.setLineDash([4, 5]);
      c.beginPath();
      for (const [a, b] of K.lines) { c.moveTo(K.x + K.pts[a][0], K.y + K.pts[a][1]); c.lineTo(K.x + K.pts[b][0], K.y + K.pts[b][1]); }
      c.stroke(); c.setLineDash([]);
      for (const [i, [px, py]] of K.pts.entries()) {
        const g = c.createRadialGradient(K.x + px, K.y + py, 0.5, K.x + px, K.y + py, 10);
        g.addColorStop(0, 'rgba(255,250,220,.9)'); g.addColorStop(1, 'rgba(255,250,220,0)');
        c.fillStyle = g; c.beginPath(); c.arc(K.x + px, K.y + py, 10, 0, TAU); c.fill();
        c.fillStyle = i % 3 ? '#FFFFFF' : '#FFE48A'; star(c, K.x + px, K.y + py, 3.6 + pulse, t * 0.004 + i); c.fill();
      }
    }
    // ดาวเคราะห์
    for (const p of PLANETS) if (vis(p.x, p.y, p.r * 2.2)) drawPlanet(c, p, t);
    // ดวงจันทร์ใหญ่ (ข้างขึ้นข้างแรมจริง) + แสงฟุ้ง
    if (vis(MOON.x, MOON.y, MOON.r * 2)) {
      const g = c.createRadialGradient(MOON.x, MOON.y, MOON.r * 0.8, MOON.x, MOON.y, MOON.r * 1.9);
      g.addColorStop(0, 'rgba(255,240,200,.35)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = g; c.beginPath(); c.arc(MOON.x, MOON.y, MOON.r * 1.9, 0, TAU); c.fill();
      drawMoonPhase(c, MOON.x, MOON.y, MOON.r, S.moon, '#FFF4D2', true, 0.1);
    }
    // ดาวตก (สุ่มในมุมที่ส่องอยู่)
    st.next -= 1;
    if (st.next <= 0) { st.next = 90 + Math.random() * 160; st.shots.push({ x: v.x0 + Math.random() * (v.x1 - v.x0) * 0.7, y: v.y0 + Math.random() * (v.y1 - v.y0) * 0.4, t0: t }); }
    for (let i = st.shots.length - 1; i >= 0; i--) {
      const s = st.shots[i], u = (t - s.t0) / 40;
      if (u > 1) { st.shots.splice(i, 1); continue; }
      const x = s.x + u * 220, y = s.y + u * 90;
      const g = c.createLinearGradient(x, y, x - 110, y - 45);
      g.addColorStop(0, `rgba(255,255,255,${1 - u})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = g; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 110, y - 45); c.stroke();
      c.fillStyle = `rgba(255,246,214,${1 - u})`; star(c, x, y, 6, t * 0.1); c.fill();
    }
    c.restore();
  }
  // ── กลางวัน / เย็น ──
  if (dayA > 0.02) {
    c.save(); c.globalAlpha = dayA;
    // ดวงจันทร์ตอนกลางวัน (จาง)
    if (nightA < 0.5 && vis(MOON.x, MOON.y, MOON.r)) { c.globalAlpha = dayA * 0.45; drawMoonPhase(c, MOON.x, MOON.y, MOON.r * 0.7, S.moon, '#FFFFFF', true, 0.08); c.globalAlpha = dayA; }
    // ดวงอาทิตย์ (เย็น = ตกต่ำใกล้ขอบฟ้า ส้มโต)
    const sunX = S.dusk > S.day ? (S.am ? 500 : 2100) : 2300, sunY = S.dusk > S.day ? SH - 170 : 150;
    if (vis(sunX, sunY, 260)) {
      const g = c.createRadialGradient(sunX, sunY, 10, sunX, sunY, 260);
      g.addColorStop(0, S.dusk > S.day ? 'rgba(255,214,150,.9)' : 'rgba(255,250,220,.95)'); g.addColorStop(0.25, 'rgba(255,230,190,.4)'); g.addColorStop(1, 'rgba(255,230,190,0)');
      c.fillStyle = g; c.beginPath(); c.arc(sunX, sunY, 260, 0, TAU); c.fill();
      c.fillStyle = S.dusk > S.day ? '#FFC98A' : '#FFF6D6'; c.beginPath(); c.arc(sunX, sunY, 46, 0, TAU); c.fill();
    }
    // รุ้งโค้งเต็มวง (ผู้ใช้ 8 พ.ย. "รุ้งมีเส้นตัด ปลายดูขาด"): แถบเดียวไล่สีด้วย radial gradient = สีต่อกันเนียนไม่มีรอยต่อ ขอบนอก/ในฟุ้งจาง
    //   โค้งครึ่งวงเต็ม ปลายทั้งสองจมลงหลังเนินขอบฟ้า (เนินไกลสูงสุดที่ SH-45) ไม่เห็นปลายด้วน
    if (S.day > 0.4 && vis(1300, 1000, 470)) {
      const RX = 1300, RY = SH - 10, R0 = 330, R1 = 450;
      const g = c.createRadialGradient(RX, RY, R0, RX, RY, R1);
      g.addColorStop(0, 'rgba(197,164,232,0)'); g.addColorStop(0.12, 'rgba(197,164,232,.9)'); g.addColorStop(0.28, '#9ED2FF');
      g.addColorStop(0.44, '#A8E6A8'); g.addColorStop(0.6, '#FFF09A'); g.addColorStop(0.75, '#FFC98A'); g.addColorStop(0.88, 'rgba(255,158,184,.95)'); g.addColorStop(1, 'rgba(255,158,184,0)');
      c.globalAlpha = dayA * 0.6; c.fillStyle = g;
      c.beginPath(); c.arc(RX, RY, R1, Math.PI, TAU); c.arc(RX, RY, R0, TAU, Math.PI, true); c.closePath(); c.fill();
      c.globalAlpha = dayA;
    }
    // เมฆ (มีเมฆรูปแมว รูปปลา) ลอยช้า ๆ
    for (const [i, [x0, y, s, shape]] of CLOUDS.entries()) {
      const x = x0 + Math.sin(t * 0.004 + i) * 30;
      if (!vis(x, y, 140 * s)) continue;
      cloud(c, x, y, s, shape, S);
    }
    // ฝูงนก (บินข้ามฟ้าวนไปเรื่อย ๆ)
    for (let f = 0; f < 2; f++) {
      const bx = ((t * (0.6 + f * 0.25) + f * 1300) % (SW + 400)) - 200, by = 260 + f * 330 + Math.sin(t * 0.01 + f) * 20;
      for (let j = 0; j < 5; j++) {
        const x = bx - (j % 3) * 34 - j * 10, y = by + (j % 2 ? 18 : -6) + j * 6;
        if (!vis(x, y, 20)) continue;
        const fl = Math.sin(t * 0.25 + j * 1.3) * 7;
        c.strokeStyle = 'rgba(90,70,140,.75)'; c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - 12, y - fl); c.quadraticCurveTo(x - 6, y - 4, x, y); c.quadraticCurveTo(x + 6, y - 4, x + 12, y - fl); c.stroke();
      }
    }
    // บอลลูน
    for (const [i, b] of BALLOONS.entries()) {
      const y = b.y + Math.sin(t * 0.02 + i * 2) * 14;
      if (vis(b.x, y, 120)) balloon(c, b.x, y, b.kind, t);
    }
    // ว่าวปลาคาร์ป
    if (vis(KITE.x, KITE.y, 160)) kite(c, KITE.x, KITE.y, t);
    // ฟองสบู่สีรุ้งลอยขึ้นช้า ๆ ทั่วฟ้า
    for (let i = 0; i < 26; i++) {
      const per = 1800 + hash(i) * 900, u = ((t + hash(i * 5) * per) % per) / per;
      const x = hash(i * 3.3) * SW + Math.sin(t * 0.02 + i) * 16, y = SH - 120 - u * (SH - 100), r = 7 + hash(i * 1.7) * 9;
      if (!vis(x, y, r)) continue;
      c.globalAlpha = dayA * Math.min(1, u * 8, (1 - u) * 4) * 0.85;
      const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,.1)'); g.addColorStop(0.7, 'rgba(200,220,255,.18)'); g.addColorStop(0.9, 'rgba(255,170,220,.55)'); g.addColorStop(1, 'rgba(170,230,255,.5)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(x - r * 0.4, y - r * 0.4, r * 0.22, r * 0.12, -0.7, 0, TAU); c.fill();
    }
    c.globalAlpha = dayA;
    c.restore();
  }
  // ขอบฟ้า: เนินไกล + ยอดหอคอยเมืองแมว (กลางคืนเปิดไฟ)
  if (v.y1 > SH - 140) {
    c.fillStyle = mix3(S, '#B7C8F0', '#B48AB8', '#3A2E74');
    c.beginPath(); c.moveTo(v.x0 - 20, SH + 20);
    for (let x = Math.floor(v.x0 / 40) * 40 - 40; x <= v.x1 + 40; x += 40) c.lineTo(x, SH - 80 - Math.sin(x / 210) * 26 - Math.sin(x / 73) * 9);
    c.lineTo(v.x1 + 20, SH + 20); c.fill();
    for (let i = 0; i < 14; i++) {
      const x = 90 + i * 185 + hash(i) * 40;
      if (x < v.x0 - 40 || x > v.x1 + 40) continue;
      const h = 40 + hash(i * 3.1) * 50, base = SH - 70 - Math.sin(x / 210) * 26;
      c.fillStyle = mix3(S, '#D9CCF4', '#C49BC6', '#4A3C8C'); c.fillRect(x - 9, base - h, 18, h + 30);
      c.fillStyle = mix3(S, '#B49AEB', '#9A6FB8', '#33286A'); c.beginPath(); c.moveTo(x - 13, base - h + 2); c.lineTo(x, base - h - 26); c.lineTo(x + 13, base - h + 2); c.fill();
      if (S.night + S.dusk * 0.5 > 0.3) { c.fillStyle = `rgba(255,224,138,${(0.5 + 0.5 * Math.sin(t * 0.04 + i)) * (S.night + S.dusk * 0.5)})`; c.fillRect(x - 3, base - h + 12, 6, 8); }
    }
    c.fillStyle = mix3(S, '#A9D8B0', '#A97FA8', '#2C2560');
    c.beginPath(); c.moveTo(v.x0 - 20, SH + 20);
    for (let x = Math.floor(v.x0 / 40) * 40 - 40; x <= v.x1 + 40; x += 40) c.lineTo(x, SH - 36 - Math.sin(x / 130 + 2) * 14);
    c.lineTo(v.x1 + 20, SH + 20); c.fill();
  }
}
function drawPlanet(c, p, t) {
  const { x, y, r } = p;
  if (p.id === 'ring') {
    c.save(); c.translate(x, y); c.rotate(-0.35);
    c.strokeStyle = 'rgba(255,214,236,.55)'; c.lineWidth = 7; c.beginPath(); c.ellipse(0, 0, r * 2, r * 0.55, 0, Math.PI, TAU); c.stroke();
    const g = c.createRadialGradient(-r * 0.35, -r * 0.35, 2, 0, 0, r);
    g.addColorStop(0, '#FFE3F0'); g.addColorStop(0.6, '#F7A8CB'); g.addColorStop(1, '#C86A9E');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 4; c.beginPath(); c.ellipse(0, -r * 0.25, r * 0.95, r * 0.18, 0, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(255,214,236,.85)'; c.lineWidth = 7; c.beginPath(); c.ellipse(0, 0, r * 2, r * 0.55, 0, 0, Math.PI); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, r * 1.75, r * 0.46, 0, 0.2, Math.PI - 0.2); c.stroke();
    c.restore();
  } else if (p.id === 'mint') {
    c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
    c.fillStyle = '#A8E6CF'; c.fillRect(x - r, y - r, 2 * r, 2 * r);
    ['#C9F2DF', '#86D3B6', '#E6F7EE', '#7CC9AD', '#B5EBD6'].forEach((col, i) => { c.fillStyle = col; c.fillRect(x - r, y - r + i * r * 0.42 + Math.sin(t * 0.01 + i) * 2, 2 * r, r * 0.22); });
    c.fillStyle = 'rgba(255,150,190,.65)'; c.beginPath(); c.ellipse(x + r * 0.3, y + r * 0.2, r * 0.2, r * 0.12, 0, 0, TAU); c.fill();
    const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 2, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,.4)'); g.addColorStop(0.7, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(20,60,60,.35)');
    c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
    c.restore();
  } else {
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r);
    g.addColorStop(0, '#E6F4FF'); g.addColorStop(0.6, '#8EC5F5'); g.addColorStop(1, '#4E86CC');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    const a = t * 0.01, mx = x + Math.cos(a) * r * 2.2, my = y + Math.sin(a) * r * 0.8;
    c.fillStyle = '#F3EEE0'; c.beginPath(); c.arc(mx, my, r * 0.3, 0, TAU); c.fill();
  }
}
/**
 * เมฆปุย (ผู้ใช้ 8 พ.ย. "ของในกล้องยังขาด ๆ ไม่สมส่วน" → วาดใหม่): ก้อนเดียวต่อเนื่อง (ปุยกลมรวมเป็นรูปเดียว)
 *   เงานุ่มด้านล่าง + แสงขอบบน อยู่ในรูปเมฆเท่านั้น · 'cat' = เมฆล้วน หน้ายิ้ม แก้มชมพู (ผู้ใช้ 8 พ.ย. เอาหูออก "หูยังดูขาด") · 'fish' = หางปลาสองแฉกต่อเนื่อง ตา ครีบ
 */
function cloud(c, x, y, s, shape, S) {
  const P = (dx, dy) => [x + dx * s, y + dy * s];
  const puffs = shape === 'cat'
    ? [[-58, 8, 30], [58, 8, 30], [-30, -10, 38], [30, -10, 38], [0, -14, 40], [0, 14, 42], [-38, 20, 30], [38, 20, 30], [-78, 20, 18], [78, 20, 18], [0, -34, 30], [-30, -30, 28], [30, -30, 28], [-46, -22, 22], [46, -22, 22]]
    : shape === 'fish'
      ? [[-64, 6, 26], [-34, -10, 34], [4, -16, 38], [40, -6, 32], [64, 8, 22], [-30, 16, 30], [12, 16, 32], [46, 16, 24]]
      : [[-62, 10, 28], [-30, -8, 38], [10, -18, 44], [48, -2, 34], [74, 14, 22], [-82, 20, 18], [-30, 18, 32], [16, 18, 36], [52, 20, 26]];
  const body = new Path2D();
  for (const [dx, dy, r] of puffs) { const [px, py] = P(dx, dy); body.moveTo(px + r * s, py); body.arc(px, py, r * s, 0, TAU); }
  if (shape === 'fish') {
    for (const d of [-1, 1]) {
      body.moveTo(...P(78, 6));
      body.quadraticCurveTo(...P(100, d * 14 + 6), ...P(120, d * 30 + 6));
      body.quadraticCurveTo(...P(126, d * 10 + 6), ...P(110, 6));
      body.closePath();
    }
    body.moveTo(...P(-6, -44)); body.quadraticCurveTo(...P(14, -66), ...P(34, -40)); body.closePath();
  }
  const dusk = S.dusk > S.day;
  c.fillStyle = dusk ? '#FFE3EA' : '#FFFFFF'; c.fill(body);
  c.save(); c.clip(body);
  const g = c.createLinearGradient(0, y - 40 * s, 0, y + 50 * s);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, dusk ? 'rgba(240,170,190,.18)' : 'rgba(170,190,240,.16)'); g.addColorStop(1, dusk ? 'rgba(220,140,170,.42)' : 'rgba(140,160,225,.4)');
  c.fillStyle = g; c.fillRect(x - 140 * s, y - 100 * s, 280 * s, 160 * s);
  c.fillStyle = 'rgba(255,255,255,.6)';
  for (const [dx, dy, r] of puffs.slice(0, 5)) { const [px, py] = P(dx, dy - r * 0.45); c.beginPath(); c.ellipse(px - r * 0.2 * s, py, r * 0.42 * s, r * 0.2 * s, -0.2, 0, TAU); c.fill(); }
  c.restore();
  if (shape === 'cat') {
    c.strokeStyle = 'rgba(120,120,190,.7)'; c.lineWidth = 3.2 * s; c.lineCap = 'round';
    for (const d of [-1, 1]) { c.beginPath(); c.arc(...P(d * 22, 2), 8 * s, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    c.lineWidth = 2.4 * s;
    for (const d of [-1, 1]) { c.beginPath(); c.arc(...P(d * 5, 18), 5 * s, 0.2, Math.PI - 0.2); c.stroke(); }
    c.fillStyle = 'rgba(255,160,190,.55)'; for (const d of [-1, 1]) { c.beginPath(); c.ellipse(...P(d * 44, 14), 9 * s, 6 * s, 0, 0, TAU); c.fill(); }
  }
  if (shape === 'fish') {
    c.fillStyle = 'rgba(110,110,180,.75)'; c.beginPath(); c.arc(...P(-58, -2), 4.5 * s, 0, TAU); c.fill();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(...P(-59.5, -3.5), 1.6 * s, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(160,170,220,.55)'; c.lineWidth = 2.4 * s; c.lineCap = 'round';
    for (const k of [0, 1, 2]) { c.beginPath(); c.arc(...P(-14 + k * 22, 4), 9 * s, -1.1, 1.1); c.stroke(); }
  }
}
/** บอลลูน: ผ้าบอลลูนกับหูแมวเป็นรูปเดียว · ปากบอลลูนทอง · เชือกสี่เส้นลงตะกร้าสาน · ลูกแมวโผล่จากตะกร้า */
function balloon(c, x, y, kind, t) {
  const env = new Path2D();
  if (kind === 'cat') {
    env.moveTo(x, y + 52);
    env.bezierCurveTo(x - 30, y + 46, x - 70, y + 14, x - 66, y - 18);
    env.bezierCurveTo(x - 64, y - 40, x - 58, y - 52, x - 52, y - 58);
    env.lineTo(x - 50, y - 96); env.quadraticCurveTo(x - 44, y - 98, x - 22, y - 68);
    env.quadraticCurveTo(x, y - 74, x + 22, y - 68);
    env.quadraticCurveTo(x + 44, y - 98, x + 50, y - 96); env.lineTo(x + 52, y - 58);
    env.bezierCurveTo(x + 58, y - 52, x + 64, y - 40, x + 66, y - 18);
    env.bezierCurveTo(x + 70, y + 14, x + 30, y + 46, x, y + 52);
    env.closePath();
  } else {
    env.moveTo(x, y + 50);
    env.bezierCurveTo(x - 30, y + 30, x - 72, y + 4, x - 66, y - 36);
    env.bezierCurveTo(x - 60, y - 74, x - 14, y - 78, x, y - 50);
    env.bezierCurveTo(x + 14, y - 78, x + 60, y - 74, x + 66, y - 36);
    env.bezierCurveTo(x + 72, y + 4, x + 30, y + 30, x, y + 50);
    env.closePath();
  }
  // เชือก + ตะกร้า + ลูกแมว
  c.strokeStyle = 'rgba(140,100,60,.8)'; c.lineWidth = 1.6;
  for (const [a, b] of [[-12, -15], [-4, -6], [4, 6], [12, 15]]) { c.beginPath(); c.moveTo(x + a, y + 56); c.lineTo(x + b, y + 88); c.stroke(); }
  c.fillStyle = '#FFDDB8'; c.beginPath(); c.arc(x, y + 88, 9, Math.PI, 0); c.fill();
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x + d * 8, y + 85); c.lineTo(x + d * 7, y + 76); c.lineTo(x + d * 2, y + 81); c.fill(); }
  c.strokeStyle = '#6E4F86'; c.lineWidth = 1.2; for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * 3.4, y + 86, 1.8, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
  c.fillStyle = lg(c, 0, y + 86, 0, y + 108, [[0, '#D9A878'], [1, '#B27F52']]); c.beginPath(); c.roundRect(x - 17, y + 87, 34, 21, 4); c.fill();
  c.strokeStyle = 'rgba(110,70,40,.4)'; c.lineWidth = 1.2;
  for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(x - 17 + k * 6.8, y + 88); c.lineTo(x - 17 + k * 6.8, y + 107); c.stroke(); }
  c.beginPath(); c.moveTo(x - 17, y + 97); c.lineTo(x + 17, y + 97); c.stroke();
  rr(c, x - 19, y + 86, 38, 4, 2, '#C99B6A');
  // ผ้าบอลลูน
  c.save(); c.clip(env);
  const cols = kind === 'cat' ? ['#FBC1DA', '#FFFFFF'] : ['#FFB3D2', '#FFE3EF'];
  for (let k = -4; k <= 4; k++) { c.fillStyle = cols[(k + 8) % 2]; c.beginPath(); c.moveTo(x + k * 15, y + 60); c.quadraticCurveTo(x + k * 24, y - 10, x + k * 15, y - 110); c.lineTo(x + (k + 1) * 15, y - 110); c.quadraticCurveTo(x + (k + 1) * 24, y - 10, x + (k + 1) * 15, y + 60); c.fill(); }
  const sh = c.createRadialGradient(x - 26, y - 36, 4, x, y - 6, 80);
  sh.addColorStop(0, 'rgba(255,255,255,.45)'); sh.addColorStop(0.6, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(170,80,130,.3)');
  c.fillStyle = sh; c.fillRect(x - 80, y - 110, 160, 170);
  c.restore();
  if (kind === 'cat') {
    c.fillStyle = 'rgba(255,170,205,.85)';
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x + d * 46, y - 62); c.lineTo(x + d * 46, y - 86); c.quadraticCurveTo(x + d * 36, y - 80, x + d * 28, y - 68); c.closePath(); c.fill(); }
    c.strokeStyle = '#6E4F86'; c.lineWidth = 3.4; c.lineCap = 'round';
    for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * 24, y - 14, 9, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    c.fillStyle = '#FF8FB3'; c.beginPath(); c.moveTo(x - 5, y - 2); c.lineTo(x + 5, y - 2); c.lineTo(x, y + 4); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,143,179,.55)'; for (const d of [-1, 1]) { c.beginPath(); c.ellipse(x + d * 42, y + 4, 10, 6, 0, 0, TAU); c.fill(); }
  } else {
    c.fillStyle = 'rgba(255,255,255,.75)'; heart(c, x, y - 12, 14); c.fill();
  }
  // ปากบอลลูนทอง
  c.fillStyle = goldV(c, y + 48, y + 58); c.beginPath(); c.roundRect(x - 13, y + 48, 26, 9, 3); c.fill();
}
function kite(c, x, y, t) {
  const w = Math.sin(t * 0.05) * 8;
  c.strokeStyle = 'rgba(120,100,150,.6)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x - 40, y + 10); c.quadraticCurveTo(x - 80, y + 160, x - 150, SH); c.stroke();
  c.save(); c.translate(x, y); c.rotate(-0.15);
  c.fillStyle = '#FF9EC4';
  c.beginPath(); c.moveTo(-50, -22); c.quadraticCurveTo(10, -30, 50, -14 + w * 0.3); c.lineTo(80, -30 + w); c.lineTo(70, 0); c.lineTo(80, 30 + w); c.lineTo(50, 14 + w * 0.3); c.quadraticCurveTo(10, 30, -50, 22); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)';
  for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-20 + i * 18, -2, 7, Math.PI * 0.2, Math.PI * 0.8); c.fill(); }
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(-36, -4, 8, 0, TAU); c.fill();
  c.fillStyle = '#4A3A6A'; c.beginPath(); c.arc(-36, -4, 4, 0, TAU); c.fill();
  c.restore();
}
