// src/town/flower.js
// ─────────────────────────────────────────────────────────────
// ดอกไม้ที่เก็บจากแปลงดอกไม้วิเศษในสวน (ผู้ใช้ 31 ต.ค.) — สุ่มสี · น้องถือมือขวาจอ (คนละข้างกับคทาชุด S)
//   ถือเดินออกไปในเมืองได้ · อยู่แค่ในหน้านี้ (ออกจากหน้าเมืองแล้วเข้าใหม่ = รีเซ็ต — ไม่บันทึกที่ไหน)
//   ดอกไม้โปรยกลีบ/ประกายเบา ๆ ร่วงลงฉาก (ค้างอยู่ในฉาก ไม่ตามตัว) · ภาพดอก bloom() ใช้ร่วมกับแปลงดอกไม้ใน garden.js
// ─────────────────────────────────────────────────────────────
const TAU = Math.PI * 2;
const RAINBOW = ['#FF9CC4', '#FFC27A', '#FFE680', '#9EE6C6', '#9FD6FA', '#C3A6F5'];

/** สีดอกไม้ที่สุ่มได้ (w = น้ำหนักสุ่ม · สีรุ้งหายาก) — petal = [อ่อน กลาง เข้ม] */
export const FLOWERS = [
  { id: 'sakura', name: 'ชมพูซากุระ', petal: ['#FFE6F1', '#FFA3C8', '#F0709F'], core: '#FFE27A', w: 3 },
  { id: 'lavender', name: 'ม่วงลาเวนเดอร์', petal: ['#F3EBFF', '#C9AEF7', '#9C7BE3'], core: '#FFF0A0', w: 3 },
  { id: 'sky', name: 'ฟ้าใส', petal: ['#EAF7FF', '#A6DAFB', '#62B5EE'], core: '#FFF0A0', w: 3 },
  { id: 'sun', name: 'เหลืองทานตะวัน', petal: ['#FFF9DA', '#FFDA62', '#F1AE1C'], core: '#C9803A', w: 3 },
  { id: 'peach', name: 'พีชอมส้ม', petal: ['#FFF0E8', '#FFBBA0', '#F08A6C'], core: '#FFE27A', w: 3 },
  { id: 'pearl', name: 'ขาวมุก', petal: ['#FFFFFF', '#F6EFFC', '#D8CCEB'], core: '#FFD45A', w: 2 },
  { id: 'mint', name: 'มิ้นต์', petal: ['#EBFFF6', '#A3E8CA', '#5CC79E'], core: '#FFF0A0', w: 2 },
  { id: 'rainbow', name: 'รุ้ง', rare: true, core: '#FFF6C8', w: 1 },
];
/** สุ่มดอกไม้หนึ่งดอก (ไม่ซ้ำสีที่ถืออยู่ ถ้ามี) */
export function randomFlower(not = null) {
  const pool = FLOWERS.filter((f) => f !== not);
  let r = Math.random() * pool.reduce((s, f) => s + f.w, 0);
  for (const f of pool) if ((r -= f.w) <= 0) return f;
  return pool[0];
}
const petalCols = (f, i) => (f.rare ? [shade(RAINBOW[i % 6], 0.55), RAINBOW[i % 6], shade(RAINBOW[i % 6], -0.2)] : f.petal);
/** ผสมสีกับขาว (k > 0) / ดำ (k < 0) */
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const m = (v) => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

/**
 * ดอกไม้หกกลีบ (กลาง x,y รัศมี r · rot = หมุน) — เส้นขอบเฉพาะรอบนอก (ลงเส้นหนาก่อนแล้วลงสีทับ แบบลายเส้นตัวน้อง)
 * line = สีเส้น (null = ไม่มีเส้น) · lw = ความหนาเส้น
 */
export function bloom(c, x, y, r, f, line = null, lw = 2, rot = 0) {
  const P = [];
  for (let i = 0; i < 6; i++) {
    const a = rot + (i * TAU) / 6, q = new Path2D();
    q.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.52, r * 0.37, a, 0, TAU);
    P.push([q, a, i]);
  }
  if (line) {
    c.strokeStyle = line; c.lineWidth = lw * 2; c.lineJoin = 'round';
    for (const [q] of P) c.stroke(q);
  }
  for (const [q, a, i] of P) {
    const [l, m, d] = petalCols(f, i);
    const g = c.createRadialGradient(x, y, r * 0.1, x, y, r * 1.08);
    g.addColorStop(0, l); g.addColorStop(0.55, m); g.addColorStop(1, d);
    c.fillStyle = g;
    c.fill(q);
  }
  // รอยกลีบ (เส้นจาง ๆ จากกลางไปปลาย)
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = Math.max(0.6, r * 0.05); c.lineCap = 'round';
  for (const [, a] of P) {
    c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.28, y + Math.sin(a) * r * 0.28); c.lineTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78); c.stroke();
  }
  // เกสร
  const cg = c.createRadialGradient(x - r * 0.08, y - r * 0.1, r * 0.03, x, y, r * 0.3);
  cg.addColorStop(0, '#FFFBE0'); cg.addColorStop(1, f.core);
  c.fillStyle = cg;
  c.beginPath(); c.arc(x, y, r * 0.28, 0, TAU); c.fill();
  if (line) { c.strokeStyle = line; c.lineWidth = lw * 0.8; c.stroke(); }
  c.fillStyle = 'rgba(170,110,40,.45)';
  for (let i = 0; i < 5; i++) { const a = rot + i * 1.26; c.beginPath(); c.arc(x + Math.cos(a) * r * 0.14, y + Math.sin(a) * r * 0.14, r * 0.04, 0, TAU); c.fill(); }
  // ไฮไลต์
  c.fillStyle = 'rgba(255,255,255,.75)';
  c.beginPath(); c.ellipse(x - r * 0.42, y - r * 0.5, r * 0.16, r * 0.08, -0.6, 0, TAU); c.fill();
}

/**
 * ดอกไม้ในอุ้งเท้าขวาจอ (ช่อง idle.held ของ drawCat2 — พิกัดไฟล์ออกแบบตัวน้อง 600×720)
 * k.grip = อุ้งเท้า (null = ลอยข้างตัว) · k.busy = อุ้งเท้าไม่ว่าง → ลอยเรืองข้างตัวขวา (แบบเดียวกับคทาชุด S ฝั่งซ้าย)
 * emit(จุดพิกเซลหัวดอก) = ให้ผู้เรียกปล่อยกลีบ/ประกายร่วงในฉาก
 */
export function drawHeldFlower(c, k, f, t, emit) {
  const b = ease(Math.min(1, Math.max(0, k.busy ?? 1)));
  const fx = 530, fy = 470 + (k.drop || 0) * 0.55 + Math.sin(t * 0.05) * 7;
  const fa = 0.2 + Math.sin(t * 0.035) * 0.05;
  const g = k.grip;
  // ก้านเอนออกนอกตัว (ขวา) เกือบตั้งตรง — หมุนสวนแขนนิด ๆ หัวดอกไม่เอนเข้าหาหน้า
  const ha = g ? 0.32 - (g.d || 0) * 0.3 : fa;
  const x = g ? g.x + (fx - g.x) * b : fx, y = g ? g.y + (fy - g.y) * b : fy;
  const a = (g ? ha + (fa - ha) * b : fa) + Math.sin(t * 0.06) * 0.04;
  const L = 100, R = 34, line = k.line || '#5A3420';
  c.translate(x, y);
  c.rotate(a);
  c.scale(1.3, 1.3);   // ดอกใหญ่พอเห็นชัดข้างตัว (หัวดอก ~ครึ่งหัวน้อง) · ก้านสั้นลง หัวดอกไม่ชนหน้า
  // แสงเรืองรอบหัวดอก (ลอยข้างตัว = เรืองขึ้น)
  const glow = c.createRadialGradient(0, -L, R * 0.3, 0, -L, R * 2.3);
  glow.addColorStop(0, `rgba(255,248,214,${0.35 + 0.3 * b})`);
  glow.addColorStop(1, 'rgba(255,240,250,0)');
  c.fillStyle = glow;
  c.beginPath(); c.arc(0, -L, R * 2.3, 0, TAU); c.fill();
  // ก้าน (โค้งนิด ๆ) + ใบสองใบ — ลงเส้นก่อนแล้วลงสีทับ
  const stem = new Path2D();
  stem.moveTo(0, 26); stem.quadraticCurveTo(7, -L * 0.45, 0, -L + R * 0.3);
  const leaf = (s, yy) => {
    const q = new Path2D();
    q.moveTo(1, yy);
    q.quadraticCurveTo(s * 26, yy - 24, s * 40, yy - 8);
    q.quadraticCurveTo(s * 22, yy + 8, 1, yy);
    return q;
  };
  const leaves = [leaf(1, -36), leaf(-1, -58)];
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = line; c.lineWidth = 8.5; c.stroke(stem);   // ความหนาเส้นหาร 1.3 (ขยายแล้ว = เส้นเท่าตัวน้อง)
  c.lineWidth = 6.8;
  for (const q of leaves) c.stroke(q);
  for (const q of leaves) {
    const lgr = c.createLinearGradient(0, -70, 30, -20);
    lgr.addColorStop(0, '#A9E39A'); lgr.addColorStop(1, '#5DB46C');
    c.fillStyle = lgr;
    c.fill(q);
  }
  c.strokeStyle = '#7CCB7E'; c.lineWidth = 4.6; c.stroke(stem);
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.stroke(stem);
  bloom(c, 0, -L, R, f, line, 3.4, t * 0.004);
  // ประกายวิบ ๆ รอบหัวดอก
  for (let i = 0; i < 3; i++) {
    const p = Math.max(0, Math.sin(t * 0.07 + i * 2.1));
    if (p < 0.1) continue;
    c.globalAlpha = p;
    c.fillStyle = i % 2 ? '#FFFFFF' : '#FFF3B0';
    star4(c, Math.cos(i * 2.1 + 0.5) * R * 1.35, -L + Math.sin(i * 2.1 + 0.5) * R * 1.2, 4 + p * 5);
    c.globalAlpha = 1;
  }
  emit?.(c.getTransform().transformPoint(new DOMPoint(0, -L)));
}
const ease = (u) => u * u * (3 - 2 * u);
function star4(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
  c.fill();
}

// ── กลีบ/ประกายที่ร่วงจากดอกไม้ (พิกัดโลก — ค้างในฉาก น้องเดินผ่านไป · ปล่อยไม่ถี่ ไม่รก) ──
const motes = [];
const LIFE = 96;
/** ปล่อยหนึ่งเม็ดที่หัวดอก (x, y หน่วยโลก) */
export function spawnMote(x, y, f, t) {
  const petal = Math.random() < 0.55;
  const cols = petalCols(f, (Math.random() * 6) | 0);
  motes.push({
    x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 6, t0: t, petal,
    col: petal ? cols[1] : Math.random() < 0.5 ? '#FFFFFF' : '#FFF1A8',
    vx: (Math.random() - 0.5) * 0.35, ph: Math.random() * TAU, rot: Math.random() * TAU, s: 0.8 + Math.random() * 0.5,
  });
  if (motes.length > 30) motes.shift();
}
/** วาดเม็ดที่ร่วง (หลังวาดตัวน้อง) */
export function drawFlowerMotes(c, t) {
  for (let i = motes.length - 1; i >= 0; i--) {
    const m = motes[i], a = t - m.t0;
    if (a > LIFE) { motes.splice(i, 1); continue; }
    const x = m.x + m.vx * a + Math.sin(a * 0.07 + m.ph) * 6, y = m.y + a * 0.38;
    c.globalAlpha = Math.min(1, a / 8) * (1 - a / LIFE) * 0.95;
    c.fillStyle = m.col;
    if (m.petal) {
      c.save();
      c.translate(x, y);
      c.rotate(m.rot + a * 0.05);
      c.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(a * 0.08 + m.ph)));
      c.beginPath(); c.ellipse(0, 0, 3.2 * m.s, 2 * m.s, 0, 0, TAU); c.fill();
      c.restore();
    } else star4(c, x, y, 2.6 * m.s + Math.sin(a * 0.3 + m.ph) * 0.8);
  }
  c.globalAlpha = 1;
}
