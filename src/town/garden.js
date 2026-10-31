// src/town/garden.js
// ─────────────────────────────────────────────────────────────
// สวนดอกไม้ในฝัน (ผู้ใช้ 31 ต.ค.) — วาปจากซุ้ม "สวนดอกไม้" ในเมือง (layout.js gardenGate)
//   ทุ่งดอกไม้พาสเทล ผีเสื้อ กลีบดอกปลิว แสงวิบวับ — จุดนั่งพัก · จุดถ่ายรูป (ซุ้มหัวใจ) · ทำท่าทาง
//   ไม่มีของซื้อขาย/ทอง — เดิน กระโดด นั่ง ใช้ระบบเดียวกับเมือง (main.js สลับ "โลก" ด้วย GARDEN)
//
// ผัง/ผิวที่ยืนได้อยู่ในไฟล์นี้ (G_PLACES · G_SURFACES) ตัวเลขต้องตรงกับภาพข้างล่าง
// ชั้นภาพ: ฟ้า → เกาะลอย/รุ้ง (0.08) → เนินไกล (0.22) → เนินใกล้ (0.42) → ต้นซากุระ (0.65) → พื้น+ของ (โลก)
//   → น้อง → ผีเสื้อ/ดวงไฟ (โลก) → ดอกไม้หน้าสุด (1.3) → กลีบปลิว + ขอบฝัน (จอ)
// ─────────────────────────────────────────────────────────────
import { H, GY, flat, arcTop } from './layout.js';
import { cached, lg, heart, plaque, bush } from './world.js';
import { bloom, FLOWERS } from './flower.js';

const TAU = Math.PI * 2;
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ── ผัง ───────────────────────────────────────────────────────
export const GW = 2600;                       // ความกว้างสวน
const GATE = { x: 100, w: 140 };              // ซุ้มขากลับเมือง
const MUSH = [[860, 58, 46], [965, 112, 40], [1065, 166, 36]];   // เห็ดยักษ์ [x, ความสูงหมวก, รัศมี] — ไต่ขึ้นเป็นขั้น
const TULIP = [[2150, 96, 26], [2245, 150, 24]];                 // ทิวลิปยักษ์ [x, ความสูงปากดอก, ครึ่งกว้าง]
const FRAME = { x: 1250, w: 200 };            // ซุ้มหัวใจถ่ายรูป
export const G_PLACES = [
  { id: 'gGate', kind: 'gate', to: 'town', name: 'กลับเมือง', x: GATE.x, w: GATE.w, h: 170 },
  { id: 'gBench1', kind: 'bench', name: 'ม้านั่ง', x: 560, w: 80, h: 46 },
  { id: 'gPhoto', kind: 'photo', name: 'จุดถ่ายรูป', x: FRAME.x, w: FRAME.w, h: 200 },
  { id: 'gBench2', kind: 'bench', name: 'ม้านั่ง', x: 1880, w: 80, h: 46 },
  // แปลงดอกไม้วิเศษ (ผู้ใช้ 31 ต.ค.): ยืนหน้าแปลงแล้วเก็บดอกไม้ = สุ่มสี ถือมือขวา (flower.js · main.js pickFlower)
  { id: 'gPick1', kind: 'pick', name: 'แปลงดอกไม้วิเศษ', x: 680, w: 80, h: 50 },
  { id: 'gPick2', kind: 'pick', name: 'แปลงดอกไม้วิเศษ', x: 1600, w: 80, h: 50 },
  { id: 'gPick3', kind: 'pick', name: 'แปลงดอกไม้วิเศษ', x: 2000, w: 80, h: 50 },
];
for (const p of G_PLACES) p.door = p.x + p.w / 2;
export const G_SPAWN = GATE.x + GATE.w + 30;  // วาปเข้ามา = ยืนข้างซุ้ม หันเข้าสวน

function buildSurfaces() {
  const S = [];
  for (const p of G_PLACES) if (p.kind === 'bench') S.push(flat(p.id + ':seat', p.x, p.x + p.w, GY - 26), flat(p.id + ':back', p.x + 2, p.x + p.w - 2, GY - 50));
  // ผิวนุ่ม (squish = ยุบลึกสุดกี่หน่วยตอนกระโดดลงแรง ๆ) — ดู squish() / stepGarden()
  for (const [x, h, r] of MUSH) S.push({ ...arcTop('mush:' + x, x, GY - h, r, 14, -0.85, 0.85, 8), squish: 17, h, cx: x });
  for (const [x, h, r] of TULIP) S.push(flat('tulip:' + x, x - r + 4, x + r - 4, GY - h, { squish: 19, h, cx: x }));
  S.push(arcTop('gGate:top', GATE.x + GATE.w / 2, GY - 118, GATE.w / 2, 60, -0.8, 0.8, 8));
  for (const s of S) { s.x0 = s.pts[0][0]; s.x1 = s.pts[s.pts.length - 1][0]; }
  return S;
}
export const G_SURFACES = buildSurfaces();
const SOFT = new Map(G_SURFACES.filter((s) => s.squish).map((s) => [s.id, s]));

// ── เห็ด/ทิวลิปนุ่มนิ่ม (ผู้ใช้ 31 ต.ค.): เหยียบแล้วยุบ เด้งดึ๋งแบบเยลลี่ ฟีลเหยียบเตียง ──
// squish(id, v) เรียกตอนน้องลงจอด (v = ความเร็วตก) / ตอนดีดตัวออก · stepGarden คำนวณ dy (ยุบลง) ทุกเฟรม
//   ผิวที่ยืน (surfY) บวก dy ด้วย ตัวน้องจึงยุบตามหมวกเห็ด · ภาพหดสูง-บานข้างรอบโคน (drawSoft)
const pops = [];   // ประกายหัวใจเด้งออกตอนลงแรง ๆ
export function squish(id, v) {
  const s = SOFT.get(id);
  if (!s) return;
  s.t0 = gT;
  s.amp = s.squish * Math.min(1, 0.3 + Math.abs(v) / 14);
  if (Math.abs(v) > 5) {
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.45;
      pops.push({ x: s.cx, y: GY - s.h - 4, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.8 - 0.6, age: 0, heart: i % 2 === 0 });
    }
  }
}

// ── ภาพชั้นหลังที่ซ้ำเป็นแผ่น (วาดครั้งเดียวต่อขนาดจอ) ─────────────
const tiles = new Map();
function tile(c, key, w, h, paint) {
  const k = c.getTransform().a;
  let e = tiles.get(key);
  if (!e || Math.abs(e.k - k) > 0.01) {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * k); cv.height = Math.ceil(h * k);
    const g = cv.getContext('2d');
    g.scale(k, k);
    paint(g);
    e = { cv, k };
    tiles.set(key, e);
  }
  return e.cv;
}
/** วางแผ่นซ้ำตามกล้อง (par = เลื่อนช้ากว่ากล้องเท่าไร) */
function strip(c, key, camX, vw, par, TW, y, h, paint) {
  const img = tile(c, key, TW, h, paint);
  const off = camX * par;
  for (let x = -(((off % TW) + TW) % TW); x < vw; x += TW) c.drawImage(img, x, y, TW, h);
}
/** ทำซ้ำของที่ล้นขอบแผ่น (วาดซ้ำที่ ±TW ให้ต่อกันเนียน) */
const wrap = (TW, x, fn) => { fn(x); fn(x - TW); fn(x + TW); };

// ── ฟ้า ───────────────────────────────────────────────────────
export function drawGardenSky(c, vw, t) {
  c.fillStyle = lg(c, 0, 0, 0, H, [[0, '#A9B4FF'], [0.35, '#D9C3FF'], [0.68, '#FFD3EA'], [1, '#FFEEDD']]);
  c.fillRect(0, 0, vw, H);
  // ดวงอาทิตย์ยามฝัน: วงแสงนวลใหญ่
  const sx = vw * 0.72, sy = 92;
  const g = c.createRadialGradient(sx, sy, 6, sx, sy, 170);
  g.addColorStop(0, 'rgba(255,252,236,.95)');
  g.addColorStop(0.18, 'rgba(255,236,214,.6)');
  g.addColorStop(1, 'rgba(255,220,240,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(sx, sy, 170, 0, TAU); c.fill();
  // ดาวจาง ๆ กระพริบ (ฟ้าฝัน — กลางวันก็มีดาว)
  for (let i = 0; i < 26; i++) {
    const x = hash(i + 3) * vw, y = 14 + hash(i + 40) * 150;
    const a = 0.25 + 0.55 * Math.max(0, Math.sin(t * 0.03 + i * 1.7));
    c.globalAlpha = a;
    c.fillStyle = '#FFFFFF';
    sparkle(c, x, y, 1.6 + hash(i + 9) * 2.2);
  }
  c.globalAlpha = 1;
}
/** ประกายสี่แฉก */
function sparkle(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y - r * 2); c.quadraticCurveTo(x, y, x + r * 2, y); c.quadraticCurveTo(x, y, x, y + r * 2); c.quadraticCurveTo(x, y, x - r * 2, y); c.quadraticCurveTo(x, y, x, y - r * 2);
  c.fill();
}

/** ไกลสุด: รุ้งพาสเทล · เกาะลอยมีน้ำตก · เมฆปุย (เลื่อนช้ามาก) */
export function drawGardenFar(c, camX, vw, t) {
  const off = camX * 0.08;
  // รุ้ง
  c.save();
  c.globalAlpha = 0.42;
  c.lineWidth = 9;
  const rcx = vw * 0.35 - off * 0.5, rcy = 300;
  ['#FFB3C8', '#FFD7A8', '#FFF3A8', '#BDF0C8', '#B8D8FF', '#D6BFFF'].forEach((col, i) => {
    c.strokeStyle = col;
    c.beginPath(); c.arc(rcx, rcy, 250 - i * 9, Math.PI * 1.04, Math.PI * 1.96); c.stroke();
  });
  c.restore();
  // เกาะลอย
  for (const [bx, by, s] of [[180, 120, 1], [760, 80, 0.7], [1240, 140, 0.85]]) {
    const x = ((bx - off) % 1500 + 1500) % 1500 - 200;
    if (x < -160 || x > vw + 160) continue;
    const yy = by + Math.sin(t * 0.012 + bx) * 4;
    c.fillStyle = 'rgba(255,255,255,.25)';
    c.beginPath(); c.ellipse(x, yy + 30 * s, 70 * s, 10 * s, 0, 0, TAU); c.fill();
    c.fillStyle = lg(c, 0, yy, 0, yy + 46 * s, [[0, '#C9B2F0'], [1, '#E8D6FF']]);
    c.beginPath(); c.moveTo(x - 62 * s, yy); c.quadraticCurveTo(x - 30 * s, yy + 50 * s, x, yy + 56 * s); c.quadraticCurveTo(x + 30 * s, yy + 50 * s, x + 62 * s, yy); c.closePath(); c.fill();
    c.fillStyle = '#BDEBC8';
    c.beginPath(); c.ellipse(x, yy, 64 * s, 12 * s, 0, 0, TAU); c.fill();
    for (let i = 0; i < 6; i++) {
      c.fillStyle = ['#FFB3D2', '#FFFFFF', '#FFE08A'][i % 3];
      c.beginPath(); c.arc(x - 44 * s + i * 17 * s, yy - 4 * s - (i % 2) * 3 * s, 3 * s, 0, TAU); c.fill();
    }
    c.fillStyle = '#F7B8D8';
    c.beginPath(); c.arc(x + 18 * s, yy - 22 * s, 16 * s, 0, TAU); c.arc(x + 6 * s, yy - 14 * s, 11 * s, 0, TAU); c.arc(x + 32 * s, yy - 12 * s, 11 * s, 0, TAU); c.fill();
    c.fillStyle = 'rgba(214,240,255,.75)';   // น้ำตกเส้นบางไหลลงหาย
    c.fillRect(x - 22 * s, yy + 6 * s, 3 * s, 46 * s);
  }
  // เมฆปุยพาสเทล
  for (let i = 0; i < 5; i++) {
    const span = vw + 400;
    const x = ((hash(i + 70) * span - off * 1.4 - t * (0.05 + i * 0.01)) % span + span) % span - 200;
    const y = 40 + hash(i + 80) * 90, s = 0.7 + hash(i + 90) * 0.6;
    c.fillStyle = i % 2 ? 'rgba(255,240,250,.85)' : 'rgba(255,255,255,.88)';
    c.beginPath(); c.arc(x, y, 22 * s, 0, TAU); c.arc(x + 24 * s, y - 10 * s, 26 * s, 0, TAU); c.arc(x + 52 * s, y, 20 * s, 0, TAU); c.arc(x + 26 * s, y + 6 * s, 22 * s, 0, TAU); c.fill();
  }
}

/** เนินไกล: ลาเวนเดอร์ชมพู มีแถบดอกไม้เรียงตามเนิน (เลื่อน 0.22) */
export function drawGardenHillsFar(c, camX, vw) {
  strip(c, 'g:hillFar', camX, vw, 0.22, 1200, 150, 200, (g) => {
    const top = (x) => 112 + 16 * Math.sin((TAU * x) / 1200) + 9 * Math.sin((TAU * 3 * x) / 1200 + 1);
    g.fillStyle = lg(g, 0, 90, 0, 200, [[0, '#D8C2F6'], [1, '#F6CFE6']]);
    g.beginPath(); g.moveTo(0, 200);
    for (let x = 0; x <= 1200; x += 10) g.lineTo(x, top(x));
    g.lineTo(1200, 200); g.closePath(); g.fill();
    // แถบดอกไม้ (ไกล = จุดเล็ก จาง)
    const rows = [['#F59AC4', 10], ['#FFE59A', 22], ['#FFFFFF', 34], ['#C7A6F5', 46], ['#FFB3D2', 60]];
    for (const [col, dy] of rows) {
      g.fillStyle = col;
      g.globalAlpha = 0.75;
      for (let x = 0; x < 1200; x += 5) { g.beginPath(); g.arc(x + hash(x + dy) * 3, top(x) + dy + hash(x * 2 + dy) * 4, 1.4, 0, TAU); g.fill(); }
    }
    g.globalAlpha = 1;
  });
}
/** เนินใกล้: เขียวมินต์ ดอกไม้ใหญ่ขึ้น ต้นไม้กลมเล็ก (เลื่อน 0.42) */
export function drawGardenHillsNear(c, camX, vw) {
  strip(c, 'g:hillNear', camX, vw, 0.42, 1000, 200, 160, (g) => {
    const top = (x) => 80 + 14 * Math.sin((TAU * 2 * x) / 1000 + 0.5) + 8 * Math.sin((TAU * 5 * x) / 1000);
    for (const tx of [120, 430, 760]) wrap(1000, tx, (x) => {
      const ty = top(((x % 1000) + 1000) % 1000);
      g.fillStyle = '#B48A6E'; g.fillRect(x - 2, ty - 26, 4, 26);
      g.fillStyle = tx === 430 ? '#FFC9E0' : '#C8EBC0';
      g.beginPath(); g.arc(x, ty - 34, 17, 0, TAU); g.arc(x - 11, ty - 24, 12, 0, TAU); g.arc(x + 11, ty - 24, 12, 0, TAU); g.fill();
    });
    g.fillStyle = lg(g, 0, 60, 0, 160, [[0, '#C6EBCB'], [1, '#EAF6DA']]);
    g.beginPath(); g.moveTo(0, 160);
    for (let x = 0; x <= 1000; x += 10) g.lineTo(x, top(x));
    g.lineTo(1000, 160); g.closePath(); g.fill();
    const cols = ['#FF9CC6', '#FFFFFF', '#FFD86E', '#C7A6F5', '#FFB08A'];
    for (let i = 0; i < 420; i++) {
      const x = hash(i * 3.3) * 1000, y = top(x) + 6 + hash(i * 7.1) * 60;
      g.fillStyle = cols[i % cols.length];
      g.beginPath(); g.arc(x, y, 1.8 + hash(i) * 1.2, 0, TAU); g.fill();
    }
  });
}
/** ต้นซากุระ/วิสทีเรีย (เลื่อน 0.65) — กลีบร่วงจากต้นอยู่ในชั้นกลีบปลิว */
export function drawGardenTrees(c, camX, vw) {
  strip(c, 'g:trees', camX, vw, 0.65, 1100, 120, GY - 118, (g) => {
    const base = GY - 120;
    for (const [tx, s, kind] of [[90, 1, 0], [380, 0.8, 1], [640, 1.1, 0], [930, 0.85, 2]]) wrap(1100, tx, (x) => {
      g.fillStyle = '#B5866A';
      g.beginPath(); g.moveTo(x - 6 * s, base); g.quadraticCurveTo(x - 2 * s, base - 50 * s, x - 12 * s, base - 92 * s); g.lineTo(x + 2 * s, base - 92 * s); g.quadraticCurveTo(x + 6 * s, base - 50 * s, x + 6 * s, base); g.closePath(); g.fill();
      if (kind === 2) {
        // วิสทีเรีย: พวงม่วงห้อย
        for (const [dx, dy, r, col] of [[-30, -104, 30, '#CDB8F0'], [24, -108, 32, '#D9C8F6'], [-4, -128, 30, '#E3D6FA'], [0, -98, 34, '#D2BFF3']]) {
          g.fillStyle = col; g.beginPath(); g.arc(x + dx * s, base + dy * s, r * s, 0, TAU); g.fill();
        }
        // พวงดอกห้อยเป็นช่อเรียว (เม็ดเล็กลงไปทางปลาย) ยาวไม่เท่ากัน
        for (let i = 0; i < 11; i++) {
          const px = x + (-52 + i * 10.5 + (hash(i + tx) - 0.5) * 5) * s, len = 6 + Math.floor(hash(i * 3 + tx) * 6);
          for (let j = 0; j < len; j++) {
            const r = (4.2 - j * (3 / len)) * s, py = base - 84 * s + j * 5.2 * s;
            g.fillStyle = j % 2 ? '#B795EC' : '#CBB0F4';
            g.beginPath(); g.arc(px + Math.sin(j * 0.9 + i) * 1.4 * s, py, r, 0, TAU); g.fill();
          }
        }
        return;
      }
      const col = kind ? ['#FFE3F0', '#FFD0E6'] : ['#FFC3DD', '#FFA8CF'];
      for (const [dx, dy, r] of [[0, -112, 40], [-34, -92, 30], [34, -94, 32], [-14, -132, 26], [20, -128, 24]]) {
        g.fillStyle = col[(dx > 0) | 0];
        g.beginPath(); g.arc(x + dx * s, base + dy * s, r * s, 0, TAU); g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,.55)';
      for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(x + (hash(i + tx) - 0.5) * 80 * s, base - (90 + hash(i * 3 + tx) * 50) * s, 2.2 * s, 0, TAU); g.fill(); }
    });
  });
}

// ── พื้น + ของในสวน (พิกัดโลก) ───────────────────────────────────
function groundTile(g, x0) {
  // หญ้านุ่ม · ทางเดินหินพาสเทล · พรมดอกไม้ใต้ทาง
  g.fillStyle = lg(g, 0, GY - 8, 0, H, [[0, '#BDE8B0'], [0.3, '#A7DDA0'], [1, '#8FCF92']]);
  g.fillRect(x0 - 2, GY - 8, 804, H - GY + 8);
  backRow(g, x0);
  g.fillStyle = '#F3E6F7';
  g.fillRect(x0 - 2, GY - 2, 804, 20);
  for (let i = 0; i < 20; i++) {
    const sx = x0 + i * 40 + 4;
    g.fillStyle = i % 2 ? '#F9EDF8' : '#EFE0F6';
    g.beginPath(); g.roundRect(sx, GY + 1, 34, 14, 7); g.fill();
  }
  // ── ทุ่งดอกไม้ (ผู้ใช้ 31 ต.ค. อัปเกรดให้อลังการ) ──
  // แสงแดดฝันพาดทุ่ง: แถบสว่างนวลกลางทุ่ง
  g.fillStyle = lg(g, 0, GY + 18, 0, H, [[0, 'rgba(255,250,220,0)'], [0.35, 'rgba(255,248,214,.32)'], [1, 'rgba(255,240,250,0)']]);
  g.fillRect(x0 - 2, GY + 18, 804, H - GY - 18);
  // พรมสีดอกไม้ (ปื้นสีจาง ๆ — มองไกลเห็นเป็นผืนดอกไม้หลายสี)
  const drift = ['rgba(255,170,205,.4)', 'rgba(200,170,245,.36)', 'rgba(255,226,140,.36)', 'rgba(160,215,250,.32)', 'rgba(255,200,180,.34)'];
  for (let i = 0; i < 18; i++) {
    const x = x0 + hash(i * 5.3 + x0) * 800, y = GY + 30 + hash(i * 7.1 + x0) * (H - GY - 34);
    g.fillStyle = drift[i % 5];
    g.beginPath(); g.ellipse(x, y, 38 + hash(i + x0) * 54, 6 + hash(i * 2 + x0) * 6, 0, 0, TAU); g.fill();
  }
  // ใบหญ้าเส้นเล็ก ๆ ทั่วทุ่ง
  g.strokeStyle = 'rgba(90,170,100,.5)'; g.lineWidth = 1; g.lineCap = 'round';
  for (let i = 0; i < 140; i++) {
    const x = x0 + hash(i * 3.3 + x0) * 800, y = GY + 26 + hash(i * 4.1 + x0) * (H - GY - 26);
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 1, y - 4, x + (hash(i) - 0.5) * 5, y - 7); g.stroke();
  }
  // ดอกไม้เจ็ดแบบ เรียงจากหลังไปหน้า (ใกล้ตา = ใหญ่ขึ้น)
  const list = [];
  for (let i = 0; i < 300; i++) list.push([x0 + hash(i * 1.7 + x0) * 800, GY + 22 + hash(i * 2.9 + x0) * (H - GY - 22), i]);
  list.sort((a, b) => a[1] - b[1]);
  for (const [x, y, i] of list) meadowFlower(g, x, y, 0.62 + ((y - GY - 22) / (H - GY - 22)) * 0.85, Math.floor(hash(i * 3.7 + x0) * 7), i + x0);
  // กอหญ้าริมทาง
  g.fillStyle = '#8CCB86';
  for (let i = 0; i < 40; i++) {
    const x = x0 + i * 20 + hash(i + x0) * 10;
    g.beginPath(); g.moveTo(x - 4, GY - 2); g.quadraticCurveTo(x - 1, GY - 12, x + 1, GY - 16); g.quadraticCurveTo(x + 2, GY - 8, x + 4, GY - 2); g.fill();
  }
}
/** แถวดอกไม้สูงหลังทางเดิน (ลูพินช่อเรียว + ดอกกลมพุ่ม) — วาดก่อนพื้น (อยู่หลังทาง/ของ/ตัวน้อง) */
function backRow(g, x0) {
  const spike = [['#FFB8D4', '#FF8FBF'], ['#D9C6FA', '#B596EE'], ['#FFFFFF', '#F1E4FA'], ['#FFD2B8', '#FFAE8A']];
  for (let i = 0; i < 46; i++) {
    const x = x0 + i * 17.4 + hash(i * 1.9 + x0) * 10, h = 22 + hash(i * 2.3 + x0) * 30, kind = Math.floor(hash(i * 4.7 + x0) * 3);
    g.strokeStyle = '#7CC27E'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x, GY - 4); g.quadraticCurveTo(x + 2, GY - h * 0.5, x, GY - h); g.stroke();
    g.fillStyle = '#93D392';
    g.beginPath(); g.ellipse(x - 4, GY - 9, 5, 2.2, -0.5, 0, TAU); g.ellipse(x + 4, GY - 12, 5, 2.2, 0.5, 0, TAU); g.fill();
    if (kind < 2) {
      // ลูพิน: ช่อเรียวเม็ดเล็กลงไปทางยอด
      const [a, b] = spike[Math.floor(hash(i * 6.1 + x0) * 4)];
      for (let j = 0; j < 9; j++) {
        const yy = GY - h * 0.45 - j * (h * 0.06), r = 3.4 - j * 0.28;
        g.fillStyle = j % 2 ? a : b;
        g.beginPath(); g.arc(x + (j % 2 ? 2 : -2) * (1 - j / 10), yy, r, 0, TAU); g.fill();
      }
    } else {
      // ดอกกลมพุ่ม (ไฮเดรนเยีย) ฟ้า/ม่วง/ชมพู
      const col = ['#BFD9FF', '#E0CCFF', '#FFD0E4'][Math.floor(hash(i * 7.3 + x0) * 3)];
      g.fillStyle = col;
      g.beginPath(); g.arc(x, GY - h, 7, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)';
      for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(x - 4 + hash(j + i) * 8, GY - h - 4 + hash(j * 3 + i) * 8, 1.4, 0, TAU); g.fill(); }
    }
  }
}
/** ดอกไม้ในทุ่ง (x, y = โคน/ระดับดอก · s = ขนาดตามความลึก) — kind 0 เดซี่ 1 คอสมอส 2 ทิวลิป 3 ลาเวนเดอร์ 4 ฟอร์เก็ตมีน็อต 5 กุหลาบ 6 ดอกดาว */
function meadowFlower(g, x, y, s, kind, seed) {
  const stem = (h) => { g.strokeStyle = '#68B873'; g.lineWidth = 1.2 * s; g.beginPath(); g.moveTo(x, y + 5 * s); g.lineTo(x, y + 5 * s - h * s); g.stroke(); };
  const petals = (n, r, pr, col, cy) => { g.fillStyle = col; for (let p = 0; p < n; p++) { const a = (p * TAU) / n + seed; g.beginPath(); g.ellipse(x + Math.cos(a) * r * s, cy + Math.sin(a) * r * s * 0.8, pr * s, pr * 0.7 * s, a, 0, TAU); g.fill(); } };
  const dot = (cx, cy, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r * s, 0, TAU); g.fill(); };
  if (kind === 0) { stem(6); petals(8, 2.7, 1.9, '#FFFFFF', y); dot(x, y, 1.5, '#FFD45A'); }
  else if (kind === 1) { stem(7); petals(6, 2.8, 2.2, ['#FF9CC4', '#FFB8D4', '#F07AAE'][seed % 3 | 0], y); dot(x, y, 1.3, '#FFE680'); }
  else if (kind === 2) {
    stem(7);
    const col = ['#FF7FA8', '#FFD45A', '#FF9E80', '#C9A6F5'][Math.floor(hash(seed) * 4)];
    g.fillStyle = col;
    g.beginPath(); g.moveTo(x - 3 * s, y - 2 * s); g.quadraticCurveTo(x - 3.4 * s, y + 3 * s, x, y + 3.4 * s); g.quadraticCurveTo(x + 3.4 * s, y + 3 * s, x + 3 * s, y - 2 * s);
    g.lineTo(x + 1.5 * s, y - 0.4 * s); g.lineTo(x, y - 2.6 * s); g.lineTo(x - 1.5 * s, y - 0.4 * s); g.closePath(); g.fill();
    dot(x - 1.2, y, 0.7, 'rgba(255,255,255,.6)');
  } else if (kind === 3) {
    stem(9);
    for (let j = 0; j < 6; j++) dot(x + (j % 2 ? 0.8 : -0.8) * s, y + 2 * s - j * 1.6 * s, 1.3 - j * 0.1, j % 2 ? '#B596EE' : '#9C7BE3');
  } else if (kind === 4) {
    for (const [dx, dy] of [[-2.6, 0.6], [2.4, -0.4], [0, -2.4]]) {
      g.fillStyle = '#8FCBFF';
      for (let p = 0; p < 5; p++) { const a = (p * TAU) / 5; g.beginPath(); g.arc(x + dx * s + Math.cos(a) * 1.2 * s, y + dy * s + Math.sin(a) * 1.2 * s, 1 * s, 0, TAU); g.fill(); }
      dot(x + dx * s, y + dy * s, 0.5, '#FFF1A8');
    }
  } else if (kind === 5) {
    stem(6);
    dot(x, y, 2.8, '#FF8FB3');
    g.strokeStyle = '#E8608F'; g.lineWidth = 0.7 * s;
    g.beginPath(); g.arc(x, y, 1.7 * s, 0.3, 5); g.stroke();
    g.beginPath(); g.arc(x + 0.3 * s, y - 0.2 * s, 0.8 * s, 2, 7); g.stroke();
  } else {
    stem(5);
    g.fillStyle = '#FFE27A';
    g.beginPath();
    for (let p = 0; p < 10; p++) { const a = -Math.PI / 2 + (p * Math.PI) / 5, r = (p % 2 ? 1.3 : 3) * s; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    g.closePath(); g.fill();
    dot(x, y, 0.8, '#FFFFFF');
  }
}

/** ซุ้มดอกไม้ (ขากลับเมือง / แบบเดียวกับซุ้มในเมือง ใหญ่กว่า) */
function drawGateArch(g) {
  const { x, w } = GATE, cx = x + w / 2, cy = GY - 118;
  for (const px of [x, x + w - 12]) {
    g.fillStyle = '#FFF6FB';
    g.fillRect(px, cy, 12, GY - cy);
    g.strokeStyle = 'rgba(160,120,200,.4)'; g.lineWidth = 1;
    for (let y = cy + 6; y < GY; y += 9) { g.beginPath(); g.moveTo(px, y); g.lineTo(px + 12, y + 7); g.stroke(); }
    bush(g, px + 6, GY, 11, '#9ED79A');
  }
  g.strokeStyle = '#FFF6FB'; g.lineWidth = 12;
  g.beginPath(); g.ellipse(cx, cy, w / 2 - 6, 60, 0, Math.PI, TAU); g.stroke();
  g.strokeStyle = '#8FCB8A'; g.lineWidth = 4;
  g.beginPath(); g.ellipse(cx, cy, w / 2 - 6, 60, 0, Math.PI, TAU); g.stroke();
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI + (i / 20) * Math.PI, r = i % 2 ? 5.2 : 4.2;
    g.fillStyle = ['#FF8FB3', '#FFFFFF', '#FFD45A', '#C8A8F5'][i % 4];
    g.beginPath(); g.arc(cx + Math.cos(a) * (w / 2 - 6), cy + Math.sin(a) * 60, r, 0, TAU); g.fill();
  }
  plaque(g, cx, cy - 24, 'กลับเมือง', { bg: '#FFF9EC', ink: '#C24F7E', edge: '#FF9CC0', shape: 'round', size: 11 });
}

/**
 * ประตูวาป: วงรีเรืองแสงในซุ้ม ประกายหมุนวนเข้ากลาง (ใช้ทั้งในเมืองและในสวน)
 * cx, cy = กลางวงรี · rx, ry = รัศมี
 */
export function drawPortal(c, cx, cy, rx, ry, t, a = 1) {
  c.save();
  c.globalAlpha = a;
  const g = c.createRadialGradient(cx, cy, 2, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, 'rgba(255,255,255,.85)');
  g.addColorStop(0.45, 'rgba(255,196,232,.5)');
  g.addColorStop(1, 'rgba(200,170,255,0)');
  c.fillStyle = g;
  c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.fill();
  c.fillStyle = '#FFFFFF';
  for (let i = 0; i < 12; i++) {
    const u = ((t * 0.006 + i / 12) % 1);
    const ang = i * 2.4 + u * 5;
    const rr = 1 - u;
    c.globalAlpha = a * Math.sin(u * Math.PI) * 0.9;
    sparkle(c, cx + Math.cos(ang) * rx * 0.9 * rr, cy + Math.sin(ang) * ry * 0.9 * rr, 1.6);
  }
  c.restore();
}

function drawBenchG(g, p) {
  const { x, w } = p;
  // ม้านั่งเหล็กดัดขาว เบาะชมพู ดอกกุหลาบเลื้อย
  g.strokeStyle = '#FFFFFF'; g.lineWidth = 3; g.lineCap = 'round';
  for (const lx of [x + 8, x + w - 8]) { g.beginPath(); g.moveTo(lx, GY); g.quadraticCurveTo(lx - 3, GY - 12, lx, GY - 22); g.stroke(); }
  g.fillStyle = '#FFB8D4';
  g.beginPath(); g.roundRect(x, GY - 27, w, 8, 4); g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)';
  g.beginPath(); g.roundRect(x + 4, GY - 26, w - 8, 2.5, 1.2); g.fill();
  g.strokeStyle = '#FFFFFF'; g.lineWidth = 2.6;
  g.beginPath(); g.moveTo(x + 4, GY - 26); g.lineTo(x + 4, GY - 50); g.moveTo(x + w - 4, GY - 26); g.lineTo(x + w - 4, GY - 50); g.stroke();
  g.beginPath(); g.moveTo(x + 2, GY - 50); g.quadraticCurveTo(x + w / 2, GY - 58, x + w - 2, GY - 50); g.stroke();
  g.lineWidth = 2;
  for (const d of [-1, 1]) {   // ลายเหล็กดัดม้วนสองข้าง + หัวใจกลางพนัก
    g.beginPath(); g.moveTo(x + w / 2 + d * 10, GY - 34); g.bezierCurveTo(x + w / 2 + d * 22, GY - 46, x + w / 2 + d * 32, GY - 30, x + w / 2 + d * 24, GY - 32); g.stroke();
  }
  g.fillStyle = '#FF8FB3';
  heart(g, x + w / 2, GY - 38, 6); g.fill();
  for (const [dx, dy, col] of [[0, -50, '#FF8FB3'], [w, -50, '#FFFFFF'], [w * 0.5, -55, '#FF6FA0']]) {
    g.fillStyle = col; g.beginPath(); g.arc(x + dx, GY + dy, 4.5, 0, TAU); g.fill();
    g.fillStyle = '#8FD08A'; g.beginPath(); g.ellipse(x + dx + 5, GY + dy + 2, 4, 2, 0.5, 0, TAU); g.fill();
  }
}

/** วาดของนุ่มให้หดสูง/บานข้างรอบโคน ตามที่ผิวยุบอยู่ (ยอดลดลง dy พอดี — ตรงกับที่น้องยืน) */
function drawSoft(c, s, paint) {
  const q = (s.dy || 0) / s.h;
  if (Math.abs(q) < 0.001) { paint(); return; }
  c.save();
  c.translate(s.cx, GY);
  c.scale(1 + q * 1.1, 1 - q);
  c.translate(-s.cx, -GY);
  paint();
  c.restore();
}
function drawMushroom(g, x, h, r) {
  const top = GY - h;
  g.fillStyle = lg(g, x - 10, 0, x + 10, 0, [[0, '#F6E8D8'], [1, '#FFF7EC']]);
  g.beginPath(); g.moveTo(x - r * 0.28, GY); g.quadraticCurveTo(x - r * 0.22, top + 12, x - r * 0.2, top + 6); g.lineTo(x + r * 0.2, top + 6); g.quadraticCurveTo(x + r * 0.22, top + 12, x + r * 0.28, GY); g.closePath(); g.fill();
  g.fillStyle = lg(g, 0, top - 16, 0, top + 14, [[0, '#FFA8CC'], [1, '#F57FB0']]);
  g.beginPath(); g.ellipse(x, top + 8, r, 22, 0, Math.PI, TAU); g.quadraticCurveTo(x, top + 18, x - r, top + 8); g.fill();
  g.fillStyle = '#FFFFFF';
  for (const [dx, dy, rr] of [[-0.5, 0, 5], [0.1, -8, 6], [0.55, 2, 4.5], [-0.15, 4, 3]]) { g.beginPath(); g.arc(x + dx * r, top + dy, rr * (r / 40), 0, TAU); g.fill(); }
}

function drawTulip(g, x, h, r, col) {
  const top = GY - h;
  g.strokeStyle = '#6FBF7A'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(x, GY); g.quadraticCurveTo(x + 6, (GY + top) / 2, x, top + 22); g.stroke();
  g.fillStyle = '#7FCB86';
  g.beginPath(); g.moveTo(x, GY - 6); g.quadraticCurveTo(x - 30, GY - 30, x - 26, GY - h * 0.55); g.quadraticCurveTo(x - 10, GY - 30, x, GY - 6); g.fill();
  g.beginPath(); g.moveTo(x, GY - 10); g.quadraticCurveTo(x + 30, GY - 34, x + 24, GY - h * 0.6); g.quadraticCurveTo(x + 8, GY - 32, x, GY - 10); g.fill();
  g.fillStyle = lg(g, 0, top, 0, top + 34, [[0, col[0]], [1, col[1]]]);
  g.beginPath();
  g.moveTo(x - r, top);
  g.quadraticCurveTo(x - r - 2, top + 30, x, top + 34);
  g.quadraticCurveTo(x + r + 2, top + 30, x + r, top);
  g.lineTo(x + r * 0.5, top + 8); g.lineTo(x, top - 2); g.lineTo(x - r * 0.5, top + 8); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.beginPath(); g.ellipse(x - r * 0.45, top + 16, 4, 10, 0.2, 0, TAU); g.fill();
}

/** ซุ้มหัวใจกุหลาบ (จุดถ่ายรูป) + เวทีกลม + ป้าย */
function drawPhotoFrame(g) {
  const { x, w } = FRAME, cx = x + w / 2;
  g.fillStyle = 'rgba(160,110,190,.18)';
  g.beginPath(); g.ellipse(cx, GY + 6, w / 2 + 6, 12, 0, 0, TAU); g.fill();
  g.fillStyle = '#FFF7FB';
  g.beginPath(); g.ellipse(cx, GY + 2, w / 2 - 8, 10, 0, 0, TAU); g.fill();
  g.strokeStyle = '#FFC4DC'; g.lineWidth = 2;
  g.beginPath(); g.ellipse(cx, GY + 2, w / 2 - 8, 10, 0, 0, TAU); g.stroke();
  // วงหัวใจ: เส้นขาว + กุหลาบเรียงตามขอบ
  const hy = GY - 104, hr = 92;
  g.lineWidth = 9; g.strokeStyle = '#FFFFFF';
  heart(g, cx, hy, hr); g.stroke();
  g.lineWidth = 3; g.strokeStyle = '#9ED79A';
  heart(g, cx, hy, hr); g.stroke();
  // จุดบนเส้นเดียวกับ heart() (เบซิเยร์สองเส้นซ้าย/ขวา) — กุหลาบเกาะเส้นพอดี
  const bz = (p0, p1, p2, p3, u) => {
    const v = 1 - u;
    return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3;
  };
  const pts = [];
  for (const d of [-1, 1]) {
    for (let i = 0; i < 18; i++) {
      const u = (i + 0.5) / 18;
      pts.push([bz(cx, cx + d * 1.45 * hr, cx + d * 0.65 * hr, cx, u), bz(hy + 0.9 * hr, hy - 0.1 * hr, hy - 1.15 * hr, hy - 0.38 * hr, u)]);
    }
  }
  pts.forEach(([px, py], i) => {
    g.fillStyle = ['#FF7FAE', '#FFFFFF', '#FFB3D2', '#FF5C93'][i % 4];
    g.beginPath(); g.arc(px, py, i % 3 ? 4.6 : 6, 0, TAU); g.fill();
    if (i % 3 === 0) { g.strokeStyle = 'rgba(180,40,90,.35)'; g.lineWidth = 1; g.beginPath(); g.arc(px, py, 2.6, 0.5, 4.5); g.stroke(); }
  });
  // ป้ายถ่ายรูปบนเสาข้างซุ้ม
  const sx = x + w + 18;
  g.fillStyle = '#C9A27E'; g.fillRect(sx - 2, GY - 76, 4, 76);
  g.fillStyle = '#FFF9EC';
  g.beginPath(); g.roundRect(sx - 30, GY - 98, 60, 30, 9); g.fill();
  g.strokeStyle = '#FF9CC0'; g.lineWidth = 2; g.stroke();
  // ไอคอนกล้อง
  g.fillStyle = '#C24F7E';
  g.beginPath(); g.roundRect(sx - 12, GY - 90, 24, 15, 3); g.fill();
  g.fillRect(sx - 5, GY - 93, 10, 4);
  g.fillStyle = '#FFF9EC'; g.beginPath(); g.arc(sx, GY - 82.5, 4.6, 0, TAU); g.fill();
  g.fillStyle = '#C24F7E'; g.beginPath(); g.arc(sx, GY - 82.5, 2.4, 0, TAU); g.fill();
}

/** ต้นใหญ่ท้ายสวน + รั้วดอกไม้ (ขอบโลก) */
function drawGardenEnd(g) {
  const x = GW - 70;
  g.fillStyle = '#B5866A';
  g.beginPath(); g.moveTo(x - 14, GY); g.quadraticCurveTo(x - 6, GY - 90, x - 26, GY - 170); g.lineTo(x + 4, GY - 170); g.quadraticCurveTo(x + 10, GY - 90, x + 14, GY); g.closePath(); g.fill();
  for (const [dx, dy, r, col] of [[0, -200, 70, '#FFC3DD'], [-60, -170, 50, '#FFB0D2'], [56, -172, 54, '#FFD6E8'], [-20, -250, 46, '#FFE3F0'], [36, -236, 44, '#FFC3DD']]) {
    g.fillStyle = col; g.beginPath(); g.arc(x + dx, GY + dy, r, 0, TAU); g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,.6)';
  for (let i = 0; i < 24; i++) { g.beginPath(); g.arc(x + (hash(i) - 0.5) * 160, GY - 150 - hash(i + 5) * 120, 2.6, 0, TAU); g.fill(); }
  // รั้วไม้ขาว
  for (let i = 0; i < 9; i++) {
    const px = GW - 300 + i * 26;
    g.fillStyle = '#FFFFFF';
    g.beginPath(); g.moveTo(px, GY); g.lineTo(px, GY - 34); g.lineTo(px + 5, GY - 40); g.lineTo(px + 10, GY - 34); g.lineTo(px + 10, GY); g.closePath(); g.fill();
  }
  g.fillRect(GW - 302, GY - 26, 236, 5); g.fillRect(GW - 302, GY - 12, 236, 5);
}

/** ป้ายต้อนรับข้างซุ้ม */
function drawWelcomeSign(g) {
  const x = 330;
  g.fillStyle = '#C9A27E'; g.fillRect(x - 2.5, GY - 70, 5, 70);
  plaque(g, x, GY - 80, 'สวนดอกไม้ในฝัน', { bg: '#FFF9EC', ink: '#8A4BB8', edge: '#C8A8F5', shape: 'round', size: 12 });
  for (let i = 0; i < 3; i++) { g.fillStyle = ['#FF8FB3', '#FFFFFF', '#FFD45A'][i]; g.beginPath(); g.arc(x - 8 + i * 8, GY - 6, 4, 0, TAU); g.fill(); }
}

// ── ทุ่งดอกไม้ระยิบระยับ (สด · พิกัดโลก) ──
// ประกายสี่แฉกเรืองแสงผุดบนดอกไม้ทั่วทุ่ง (ทีละไม่กี่ดวง สลับกันกระพริบ) · ละอองทองลอยขึ้นช้า ๆ · แสงแดดกวาดผ่านทุ่งเป็นระยะ
const SHINE = 26;   // ระยะห่างช่องประกาย (หน่วยโลก)
function drawMeadowShine(c, camX, vw, t) {
  const n0 = Math.floor((camX - 20) / SHINE), n1 = Math.ceil((camX + vw + 20) / SHINE);
  c.save();
  for (let n = n0; n <= n1; n++) {
    const a = Math.max(0, Math.sin(t * 0.04 + hash(n * 2.1) * TAU)) ** 4;
    if (a < 0.05) continue;
    const x = n * SHINE + hash(n) * SHINE, y = GY + 26 + hash(n * 1.3) * (H - GY - 30);
    const r = (2 + hash(n * 3.7) * 2.4) * (0.6 + a * 0.6);
    const g = c.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, `rgba(255,252,230,${0.7 * a})`);
    g.addColorStop(1, 'rgba(255,240,250,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r * 4, 0, TAU); c.fill();
    c.globalAlpha = a;
    c.fillStyle = n % 3 === 0 ? '#FFF1A8' : n % 3 === 1 ? '#FFFFFF' : '#FFD6EA';
    sparkle(c, x, y, r);
    c.globalAlpha = 1;
  }
  // ละอองทองลอยขึ้นจากทุ่ง
  for (let n = Math.floor(camX / 90) - 1; n <= Math.ceil((camX + vw) / 90) + 1; n++) {
    const u = ((t * (0.004 + hash(n * 5.1) * 0.003) + hash(n * 6.7)) % 1);
    const x = n * 90 + hash(n * 8.3) * 90 + Math.sin(t * 0.02 + n) * 8, y = H - 10 - u * 120;
    c.globalAlpha = Math.sin(u * Math.PI) * 0.8;
    c.fillStyle = '#FFF4C2';
    c.beginPath(); c.arc(x, y, 1.6 + hash(n) * 1.2, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
  // แสงแดดกวาดผ่านทุ่ง (แถบเฉียงสว่างนวล ทุก ~9 วิ)
  const span = vw + 500, sx = camX + ((t * 1.1) % span) - 250;
  const lgr = c.createLinearGradient(sx - 90, 0, sx + 90, 0);
  lgr.addColorStop(0, 'rgba(255,250,230,0)'); lgr.addColorStop(0.5, 'rgba(255,250,230,.22)'); lgr.addColorStop(1, 'rgba(255,250,230,0)');
  c.fillStyle = lgr;
  c.beginPath(); c.moveTo(sx - 60, GY + 18); c.lineTo(sx + 120, GY + 18); c.lineTo(sx + 60, H); c.lineTo(sx - 120, H); c.closePath(); c.fill();
  c.restore();
}

/** แปลงดอกไม้วิเศษ (จุดเก็บดอกไม้): พุ่มใบกลม ดอกหลายสีบานบนพุ่ม วงแสงชมพูบนพื้น */
function drawPickPatch(g, p) {
  const cx = p.door;
  g.fillStyle = 'rgba(255,200,230,.55)';
  g.beginPath(); g.ellipse(cx, GY + 4, 56, 8, 0, 0, TAU); g.fill();
  for (const [dx, dy, r, col] of [[-30, -14, 18, '#78C483'], [30, -14, 18, '#78C483'], [-14, -26, 20, '#86CC8C'], [16, -27, 20, '#86CC8C'], [0, -14, 24, '#93D392']]) {
    g.fillStyle = col; g.beginPath(); g.arc(cx + dx, GY + dy, r, 0, TAU); g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,.22)';
  g.beginPath(); g.arc(cx - 16, GY - 36, 8, 0, TAU); g.fill();
  const spots = [[-32, -24, 10], [-12, -40, 12], [14, -40, 12], [34, -24, 10], [-22, -10, 9], [2, -24, 11], [24, -8, 9], [-2, -6, 8]];
  spots.forEach(([dx, dy, r], i) => bloom(g, cx + dx, GY + dy, r, FLOWERS[(i * 3) % 7], 'rgba(120,70,90,.35)', 0.8, i * 0.7));
}
/** ของสดของแปลงดอกไม้: วงแสงเต้นเบา ๆ + ประกายวนรอบพุ่ม (บอกว่าเก็บได้) */
function drawPickLive(c, p, t) {
  const cx = p.door, pulse = 0.5 + 0.5 * Math.sin(t * 0.06 + cx);
  c.save();
  c.strokeStyle = `rgba(255,255,255,${0.35 + 0.35 * pulse})`; c.lineWidth = 1.6;
  c.beginPath(); c.ellipse(cx, GY + 4, 46 + pulse * 10, 6 + pulse * 1.5, 0, 0, TAU); c.stroke();
  for (let i = 0; i < 4; i++) {
    const a = t * 0.03 + (i * TAU) / 4 + cx;
    const x = cx + Math.cos(a) * 48, y = GY - 26 + Math.sin(a) * 20;
    c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 0.1 + i * 1.7);
    c.fillStyle = i % 2 ? '#FFFFFF' : '#FFF1A8';
    sparkle(c, x, y, 1.8);
  }
  c.restore();
}
/** เก็บดอกไม้แล้ว: หัวใจ/ประกายเด้งออกจากแปลง */
export function pickBurst(x) {
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.36;
    pops.push({ x, y: GY - 40, vx: Math.cos(a) * 1.7, vy: Math.sin(a) * 2 - 0.4, age: 0, heart: i % 2 === 0 });
  }
}

export function drawGardenWorld(c, camX, vw, t) {
  const n0 = Math.floor((camX - 20) / 800), n1 = Math.floor((camX + vw + 20) / 800);
  for (let n = Math.max(0, n0); n <= n1; n++) cached(c, 'gGround:' + n, n * 800 - 2, GY - 62, 804, H - GY + 62, (g) => groundTile(g, n * 800));   // แผ่นเหลื่อมกัน 2 หน่วย ไม่เห็นรอยต่อ · สูงขึ้นไปรวมแถวดอกไม้หลังทาง
  drawMeadowShine(c, camX, vw, t);
  const vis = (x, w) => x + w > camX - 60 && x < camX + vw + 60;
  if (vis(GATE.x - 20, GATE.w + 40)) {
    cached(c, 'gGate', GATE.x - 16, GY - 196, GATE.w + 32, 200, drawGateArch);
    drawPortal(c, GATE.x + GATE.w / 2, GY - 66, GATE.w / 2 - 22, 66, t, 0.8);
  }
  if (vis(250, 160)) cached(c, 'gWelcome', 245, GY - 104, 170, 106, drawWelcomeSign);
  for (const p of G_PLACES) if (p.kind === 'bench' && vis(p.x, p.w)) cached(c, 'gb:' + p.id, p.x - 8, GY - 64, p.w + 16, 66, (g) => drawBenchG(g, p));
  for (const p of G_PLACES) {
    if (p.kind !== 'pick' || !vis(p.x - 30, p.w + 60)) continue;
    cached(c, 'gpick:' + p.id, p.door - 64, GY - 60, 128, 72, (g) => drawPickPatch(g, p));
    drawPickLive(c, p, t);
  }
  for (const [x, h, r] of MUSH) if (vis(x - r, r * 2)) drawSoft(c, SOFT.get('mush:' + x), () => drawMushroom(c, x, h, r));
  if (vis(FRAME.x - 40, FRAME.w + 120)) cached(c, 'gFrame', FRAME.x - 10, GY - 210, FRAME.w + 70, 224, drawPhotoFrame);
  TULIP.forEach(([x, h, r], i) => { if (vis(x - 40, 80)) drawSoft(c, SOFT.get('tulip:' + x), () => drawTulip(c, x, h, r, i ? ['#FFE07A', '#FFB34D'] : ['#FFB3D2', '#F57FB0'])); });
  for (const p of pops) {
    const a = 1 - p.age / 40;
    c.globalAlpha = a;
    c.fillStyle = p.heart ? '#FF8FB3' : '#FFFFFF';
    if (p.heart) { heart(c, p.x, p.y, 3.6 + a); c.fill(); } else sparkle(c, p.x, p.y, 1.6);
  }
  c.globalAlpha = 1;
  if (vis(GW - 320, 320)) cached(c, 'gEnd', GW - 320, GY - 330, 320, 332, drawGardenEnd);
}

// ── ของที่ขยับ: ผีเสื้อ · ดวงไฟลอย (โลก) ───────────────────────────
const BUTTERFLY_COLS = [['#FFB3D2', '#FF7FAE'], ['#C8B2FF', '#9C7BEA'], ['#FFE59A', '#FFC24D'], ['#A8E4FF', '#6FC4F0'], ['#FFFFFF', '#FFC9E0']];
// ผีเสื้อคู่หู 2 ตัว (ผู้ใช้ 31 ต.ค.): บินตามน้อง · ตัวใหญ่ ปีกไล่สี ขอบทอง เรืองแสง มีประกายตามหลัง — เด่นกว่าตัวอื่นในสวน
//   [ปีกบนอ่อน, ปีกบนเข้ม, ปีกล่าง, ขอบ, แสงเรือง]
const FRIEND_COLS = [
  ['#FFE3F0', '#FF8FC0', '#FFC2DE', '#FFD86E', '255,170,210'],
  ['#EDE4FF', '#9F7CF2', '#A9E8FF', '#FFE59A', '190,170,255'],
];
const flies = [];
for (let i = 0; i < 18; i++) {
  const x = 200 + hash(i * 5.1) * (GW - 400);
  const friend = i < 2;
  flies.push({
    x, y: GY - 60 - hash(i * 2.3) * 120, ax: x, ay: GY - 70 - hash(i * 8.7) * 110, ph: friend ? i * Math.PI : hash(i) * 10,
    col: friend ? FRIEND_COLS[i] : BUTTERFLY_COLS[i % 5], s: friend ? 1.5 : 0.8 + hash(i * 3.9) * 0.5, friend, trail: friend ? [] : null,
  });
}
let gT = 0;
/** เดินผีเสื้อ — 2 ตัวคู่หูบินวนตามน้อง (คนละฝั่ง) · ที่เหลือวนรอบจุดของตัวเอง */
export function stepGarden(dt, cat) {
  gT += dt;
  for (const s of SOFT.values()) {
    // ยุบแรงแล้วแกว่งขึ้นลงจนนิ่ง (สปริงหน่วง) + ยืนอยู่ = ยุบค้างนิด ๆ ตามน้ำหนัก
    const u = gT - (s.t0 ?? -1e9);
    const wob = u < 160 ? (s.amp || 0) * Math.exp(-u * 0.06) * Math.cos(u * 0.3) : 0;
    const want = cat.on === s && cat.P.onGround ? 4 : 0;
    s.press = (s.press || 0) + (want - (s.press || 0)) * Math.min(1, 0.15 * dt);
    s.dy = wob + s.press;
  }
  for (const p of pops) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.05 * dt; }
  while (pops.length && pops[0].age > 40) pops.shift();
  for (const f of flies) {
    let tx, ty;
    if (f.friend) {
      const a = gT * 0.02 + f.ph;
      tx = cat.x + Math.cos(a) * 66; ty = cat.y - 132 + Math.sin(a * 1.6) * 16;   // วนเหนือหัว ไม่บินผ่านหน้าน้อง
    } else {
      tx = f.ax + Math.sin(gT * 0.011 + f.ph) * 90; ty = f.ay + Math.sin(gT * 0.017 + f.ph * 2) * 30;
    }
    const k = f.friend ? 0.03 : 0.02;
    f.vx = (tx - f.x) * k; f.vy = (ty - f.y) * k;
    f.x += f.vx * dt; f.y += f.vy * dt + Math.sin(gT * 0.2 + f.ph) * 0.3 * dt;
    if (f.trail) {
      // ประกายตามหลัง: ทิ้งเม็ดไว้ในฉาก ค่อย ๆ ร่วงและจาง
      for (const q of f.trail) { q.age += dt; q.y += 0.25 * dt; }
      while (f.trail.length && f.trail[0].age > 40) f.trail.shift();
      if ((f.acc = (f.acc || 0) + dt) >= 3) { f.acc = 0; f.trail.push({ x: f.x + (Math.random() - 0.5) * 6, y: f.y + 3, age: 0, r: 1 + Math.random() * 1.2 }); }
    }
  }
}
/** ผีเสื้อคู่หู: มองจากบน ปีกสองข้างกระพือสมมาตร ไล่สี ขอบทอง แสงเรืองรอบตัว */
function drawFriend(c, f, t) {
  const [c0, c1, c2, rim, glow] = f.col;
  for (const q of f.trail) {
    const a = 1 - q.age / 40;
    c.globalAlpha = a * 0.9;
    c.fillStyle = q.r > 1.6 ? '#FFFFFF' : rim;
    sparkle(c, q.x, q.y, q.r * (0.6 + a * 0.6));
  }
  c.globalAlpha = 1;
  const flap = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.28 + f.ph));
  const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, 26 * f.s);
  g.addColorStop(0, `rgba(${glow},.55)`);
  g.addColorStop(1, `rgba(${glow},0)`);
  c.fillStyle = g;
  c.beginPath(); c.arc(f.x, f.y, 26 * f.s, 0, TAU); c.fill();
  c.save();
  c.translate(f.x, f.y);
  c.rotate((f.vx || 0) * 0.08);
  c.scale(f.s, f.s);
  for (const side of [-1, 1]) {
    c.save();
    c.scale(side * flap, 1);
    // ปีกบน
    c.fillStyle = lg(c, 0, -14, 12, 0, [[0, c1], [1, c0]]);
    c.beginPath(); c.moveTo(0.5, -1); c.bezierCurveTo(4, -14, 15, -15, 13, -6); c.bezierCurveTo(12, -1, 6, 1, 0.5, 1); c.closePath(); c.fill();
    c.strokeStyle = rim; c.lineWidth = 1.1; c.stroke();
    // ปีกล่าง
    c.fillStyle = lg(c, 0, 0, 10, 10, [[0, c0], [1, c2]]);
    c.beginPath(); c.moveTo(0.5, 1); c.bezierCurveTo(7, 1, 11, 6, 8, 10); c.bezierCurveTo(5, 13, 1, 8, 0.5, 3); c.closePath(); c.fill();
    c.strokeStyle = rim; c.lineWidth = 1; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.85)';
    c.beginPath(); c.arc(8.5, -8, 1.8, 0, TAU); c.arc(5.5, 6, 1.2, 0, TAU); c.fill();
    c.fillStyle = rim;
    c.beginPath(); c.arc(11, -5, 1, 0, TAU); c.fill();
    c.restore();
  }
  c.fillStyle = '#5A3A6E';
  c.beginPath(); c.ellipse(0, 1, 1.5, 6, 0, 0, TAU); c.fill();
  c.strokeStyle = '#5A3A6E'; c.lineWidth = 0.8;
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(0, -4); c.quadraticCurveTo(d * 2, -9, d * 4, -10); c.stroke(); c.fillStyle = rim; c.beginPath(); c.arc(d * 4, -10, 1, 0, TAU); c.fill(); }
  c.restore();
}
function drawFly(c, f, t) {
  const flap = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.32 + f.ph * 4));
  const dir = f.vx < 0 ? -1 : 1;
  c.save();
  c.translate(f.x, f.y);
  c.scale(f.s * dir, f.s);
  for (const side of [-1, 1]) {
    c.save();
    c.scale(side === -1 ? flap : flap * 0.8, 1);
    c.fillStyle = f.col[0];
    c.beginPath(); c.ellipse(-5, -4, 6, 7, -0.5, 0, TAU); c.fill();
    c.fillStyle = f.col[1];
    c.beginPath(); c.ellipse(-4, 4, 4, 5, 0.4, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.75)';
    c.beginPath(); c.arc(-6, -5, 1.5, 0, TAU); c.fill();
    c.restore();
  }
  c.fillStyle = '#6B4A7A';
  c.beginPath(); c.ellipse(0, 0, 1.4, 5, 0, 0, TAU); c.fill();
  c.strokeStyle = '#6B4A7A'; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(0, -4); c.quadraticCurveTo(2, -9, 4, -10); c.stroke();
  c.restore();
}
/** ดวงไฟฝันลอยขึ้นช้า ๆ + ผีเสื้อ (ทับตัวน้อง) */
export function drawGardenAirWorld(c, camX, vw, t) {
  for (let i = 0; i < 16; i++) {
    const x = hash(i * 9.1) * GW;
    if (x < camX - 40 || x > camX + vw + 40) continue;
    const u = ((t * (0.0016 + hash(i) * 0.0012) + hash(i * 4.4)) % 1);
    const y = GY - 10 - u * 260, sw = Math.sin(t * 0.02 + i) * 14;
    const a = Math.sin(u * Math.PI) * 0.75;
    const g = c.createRadialGradient(x + sw, y, 0, x + sw, y, 9);
    g.addColorStop(0, `rgba(255,250,220,${a})`);
    g.addColorStop(1, 'rgba(255,220,240,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x + sw, y, 9, 0, TAU); c.fill();
  }
  for (const f of flies) if (f.x > camX - 30 && f.x < camX + vw + 30) (f.friend ? drawFriend : drawFly)(c, f, t);
  drawPetals(c, camX, vw, t);
}

// กลีบดอกปลิว + ประกาย: พิกัดโลก — ปลิวอยู่กับที่ในสวน น้องเดินผ่านไป (ผู้ใช้ 31 ต.ค. — เดิมพิกัดจอ เลยลอยตามน้องตลอดทาง · ที่ตามน้องมีแค่ผีเสื้อ)
// ความหนาแน่นเท่าเดิม (เดิม 34 กลีบต่อจอ) · ช่วงสูงเผื่อตอนกล้องยกตามน้องขึ้นที่สูง
const P_SPAN = GW + 200, P_TALL = H + 200, PETALS = 110, TWINKLES = 60;
function drawPetals(c, camX, vw, t) {
  for (let i = 0; i < PETALS; i++) {
    const sp = 0.25 + hash(i * 1.3) * 0.35;
    const x = ((hash(i * 7.7) * P_SPAN - t * sp * 0.9) % P_SPAN + P_SPAN) % P_SPAN - 100 + Math.sin(t * 0.02 + i) * 12;
    if (x < camX - 20 || x > camX + vw + 20) continue;
    const y = ((hash(i * 3.1) * P_TALL + t * sp * 0.55) % P_TALL) - 160;
    c.save();
    c.translate(x, y);
    c.rotate(t * 0.03 * (i % 2 ? 1 : -1) + i);
    c.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(t * 0.04 + i)));
    c.fillStyle = i % 4 === 0 ? 'rgba(255,255,255,.9)' : i % 3 === 0 ? 'rgba(255,214,236,.95)' : 'rgba(255,170,205,.9)';
    c.beginPath(); c.ellipse(0, 0, 4.2, 2.6, 0, 0, TAU); c.fill();
    c.restore();
  }
  for (let i = 0; i < TWINKLES; i++) {
    const x = hash(i * 5.5) * GW;
    if (x < camX - 10 || x > camX + vw + 10) continue;
    const a = Math.max(0, Math.sin(t * 0.05 + i * 2.1));
    if (a < 0.05) continue;
    c.globalAlpha = a * 0.85;
    c.fillStyle = i % 3 ? '#FFFFFF' : '#FFF0A8';
    sparkle(c, x, 40 + hash(i * 6.6) * (H - 90), 1.4 + a * 1.6);
  }
  c.globalAlpha = 1;
}

/** ดอกไม้หน้าสุด (ใกล้ตา เลื่อน 1.3 · ต่ำกว่าเท้าน้อง ไม่บังตัว) */
export function drawGardenFront(c, camX, vw, t) {
  strip(c, 'g:front', camX, vw, 1.3, 900, H - 70, 70, (g) => {
    // พุ่มใบเตี้ย ๆ เป็นฐาน + ดอกโชว์ใหญ่ (คอสมอส/ดอกหกกลีบหลายสี) แทรกระหว่างกอ — ทุ่งแน่นขึ้น อลังการขึ้น (ผู้ใช้ 31 ต.ค.)
    for (let i = 0; i < 14; i++) wrap(900, i * 66 + hash(i * 9.1) * 30, (x) => bush(g, x, 78, 18 + hash(i) * 10, i % 2 ? '#8ED08F' : '#7CC686'));
    for (let i = 0; i < 12; i++) {
      wrap(900, i * 75 + 30 + hash(i * 4.3) * 30, (x) => {
        const y = 40 + hash(i * 5.7) * 18;
        g.strokeStyle = '#6FBF7A'; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(x, 70); g.quadraticCurveTo(x + 3, (70 + y) / 2, x, y); g.stroke();
        bloom(g, x, y, 8 + hash(i * 6.1) * 4, FLOWERS[i % 7], null, 1, i);
      });
    }
    for (let i = 0; i < 9; i++) {
      const x = i * 100 + hash(i) * 40, kind = i % 3;
      if (kind === 0) {
        // ทิวลิปกอ
        for (let j = 0; j < 3; j++) {
          const fx = x + j * 14, top = 26 + j * 6;
          g.strokeStyle = '#6FBF7A'; g.lineWidth = 2.4;
          g.beginPath(); g.moveTo(fx, 70); g.lineTo(fx, top + 6); g.stroke();
          g.fillStyle = ['#FF8FB3', '#FFD45A', '#C8A8F5'][j];
          g.beginPath(); g.moveTo(fx - 6, top); g.quadraticCurveTo(fx - 7, top + 12, fx, top + 13); g.quadraticCurveTo(fx + 7, top + 12, fx + 6, top); g.lineTo(fx + 3, top + 3); g.lineTo(fx, top - 1); g.lineTo(fx - 3, top + 3); g.closePath(); g.fill();
        }
      } else if (kind === 1) {
        // เดซี่
        for (let j = 0; j < 4; j++) {
          const fx = x + j * 11, fy = 34 + (j % 2) * 10;
          g.strokeStyle = '#7CC67A'; g.lineWidth = 1.6;
          g.beginPath(); g.moveTo(fx, 70); g.lineTo(fx, fy); g.stroke();
          g.fillStyle = '#FFFFFF';
          for (let p = 0; p < 8; p++) { const a = (p * TAU) / 8; g.beginPath(); g.ellipse(fx + Math.cos(a) * 4.5, fy + Math.sin(a) * 4.5, 3.2, 1.6, a, 0, TAU); g.fill(); }
          g.fillStyle = '#FFD45A'; g.beginPath(); g.arc(fx, fy, 2.4, 0, TAU); g.fill();
        }
      } else {
        bush(g, x + 18, 76, 26, '#86CC8C');
        g.fillStyle = '#FFC4DC';
        for (const [dx, dy] of [[6, 46], [26, 40], [18, 56], [34, 54]]) { g.beginPath(); g.arc(x + dx, dy, 3.6, 0, TAU); g.fill(); }
      }
    }
  });
  // ประกายระยิบบนดอกไม้หน้าสุด (เลื่อนตามชั้นเดียวกัน)
  const off = camX * 1.3, TW = 900;
  for (let k = Math.floor(off / TW); k <= Math.floor((off + vw) / TW) + 1; k++) {
    for (let i = 0; i < 10; i++) {
      const a = Math.max(0, Math.sin(t * 0.05 + i * 2.3 + k)) ** 3;
      if (a < 0.08) continue;
      const x = k * TW + hash(i * 7.7) * TW - off, y = H - 14 - hash(i * 3.3) * 46;
      c.globalAlpha = a;
      c.fillStyle = i % 2 ? '#FFFFFF' : '#FFF3B0';
      sparkle(c, x, y, 1.6 + a * 1.6);
    }
  }
  c.globalAlpha = 1;
}

/** ขอบจอฝัน (พิกัดจอ — ทับทุกอย่างในฉาก) · กลีบดอก/ประกายย้ายไปพิกัดโลกแล้ว (drawPetals) */
export function drawGardenOverlay(c, vw, t) {
  // ขอบฝัน: มุมจอนวลชมพูม่วง
  const g = c.createRadialGradient(vw / 2, H * 0.55, H * 0.45, vw / 2, H * 0.55, Math.max(vw, H) * 0.78);
  g.addColorStop(0, 'rgba(255,220,240,0)');
  g.addColorStop(1, 'rgba(232,190,255,.35)');
  c.fillStyle = g;
  c.fillRect(0, 0, vw, H);
}

/** ม่านวาป: แสงชมพูขาวขยายจากกลาง + กลีบ/ประกายหมุนวน (k = 0..1) */
export function drawWarp(c, vw, f, t) {
  const cx = vw / 2, cy = H / 2;
  c.save();
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(vw, H) * (0.3 + f * 0.6));
  g.addColorStop(0, `rgba(255,255,255,${f})`);
  g.addColorStop(0.5, `rgba(255,214,236,${f})`);
  g.addColorStop(1, `rgba(214,190,255,${f * f})`);
  c.fillStyle = g;
  c.fillRect(0, 0, vw, H);
  for (let i = 0; i < 40; i++) {
    const ang = i * 0.63 + t * 0.06 * (1 + (i % 3) * 0.3);
    const r = (0.15 + hash(i) * 0.6) * Math.max(vw, H) * (1.1 - f * 0.6);
    c.globalAlpha = f * (0.6 + 0.4 * Math.sin(t * 0.1 + i));
    c.fillStyle = i % 3 ? '#FFFFFF' : '#FFB3D2';
    if (i % 2) sparkle(c, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.6, 2.4);
    else { c.beginPath(); c.ellipse(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.6, 4.6, 2.8, ang, 0, TAU); c.fill(); }
  }
  c.restore();
}

/** กรอบรูปตอนถ่ายรูป (พิกัดจอ): ขอบขาวมน + ชื่อสวนมุมล่าง */
export function drawPhotoFrameOverlay(c, vw, a) {
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = 'rgba(255,255,255,.95)';
  c.lineWidth = 10;
  c.beginPath(); c.roundRect(10, 10, vw - 20, H - 20, 20); c.stroke();
  c.strokeStyle = 'rgba(255,170,205,.8)';
  c.lineWidth = 2;
  c.beginPath(); c.roundRect(17, 17, vw - 34, H - 34, 15); c.stroke();
  c.font = '700 12px Mali, sans-serif';
  c.textAlign = 'right';
  c.textBaseline = 'alphabetic';
  c.fillStyle = 'rgba(138,75,184,.85)';
  c.fillText('MeowZing · สวนดอกไม้ในฝัน', vw - 30, H - 28);
  c.fillStyle = '#FF8FB3';
  heart(c, vw - 30 - c.measureText('MeowZing · สวนดอกไม้ในฝัน').width - 12, H - 33, 5); c.fill();
  c.restore();
}

