// src/town/castle-acts.js
// ─────────────────────────────────────────────────────────────
// ท่าใช้ของในปราสาทชั้น 2 (ผู้ใช้ 8 พ.ย.)
//   จิบชา: น้องประคองถ้วยชาสองมือ มองถ้วย → ยกจิบ (หลับตา) → หน้าอร่อยยิ้มตาหยี หัวใจลอย → จิบอีกที → ดี๊ด๊าโยกหัว ประกาย+โน้ตเพลง
//   ตู้ขนม: สุ่มขนม 7 แบบ เด้งจากตู้ลอยเข้ามือ → ตาเป็นประกาย → กัดสามคำ (เคี้ยวงุบงิบ เศษขนมร่วง ขนมแหว่งทีละคำ) → หมดแล้วแลบลิ้น หัวใจลอย
//   ตัวน้องวาดด้วย drawCat2 ท่าประคองสองมือ (shape knead/clasp) + shape.sip ยกของขึ้นหาปาก · ของในมือวาดผ่าน idle.holdDraw (พิกัดไฟล์ออกแบบ)
//   เดิน/กระโดด = ตัดท่าทันที (main.js)
// ─────────────────────────────────────────────────────────────
import { heart, star } from './world.js';

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
const ramp = (t, a, b) => ease((t - a) / (b - a));
const bump = (t, a, b, c, d) => ramp(t, a, b) * (1 - ramp(t, c, d));
const LINE = '#5A3420';   // เส้นเดียวกับตัวน้อง (ของที่น้องถือมีเส้นแบบตัวน้อง)
const LW = 4.4;

// ── ของในมือ (พิกัดไฟล์ออกแบบ · กลางของ = 0,0 · กว้าง ~110) ─────────────
function ol(c, w = LW) { c.strokeStyle = LINE; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
/** ถ้วยชาพอร์ซเลนขาว แถบชมพู ขอบทอง หูถ้วยขวา ชานมในถ้วย ไอร้อนลอย */
function teacup(c, t) {
  // หูถ้วย
  c.lineCap = 'round';
  c.strokeStyle = LINE; c.lineWidth = 15; c.beginPath(); c.ellipse(64, -2, 15, 13, 0, -1.3, 1.3); c.stroke();
  c.strokeStyle = '#FFFFFF'; c.lineWidth = 7; c.beginPath(); c.ellipse(64, -2, 15, 13, 0, -1.25, 1.25); c.stroke();
  const body = new Path2D();
  body.moveTo(-64, -30); body.bezierCurveTo(-64, 6, -44, 32, 0, 32); body.bezierCurveTo(44, 32, 64, 6, 64, -30); body.closePath();
  const g = c.createLinearGradient(-64, 0, 64, 0);
  g.addColorStop(0, '#EFE3F7'); g.addColorStop(0.35, '#FFFFFF'); g.addColorStop(1, '#E6D8F2');
  c.fillStyle = g; c.fill(body);
  c.save(); c.clip(body);
  c.fillStyle = '#F7A8CB'; c.fillRect(-70, -8, 140, 14);
  c.fillStyle = '#EBC66F'; c.fillRect(-70, -10, 140, 2.5); c.fillRect(-70, 6, 140, 2.5);
  c.fillStyle = '#FFFFFF'; heart(c, 0, -1, 6); c.fill();
  for (const dx of [-36, 36]) { c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(dx, -1, 2.2, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-36, 16, 7, 12, 0.3, 0, TAU); c.fill();
  c.restore();
  c.beginPath(); c.moveTo(-64, -30); c.bezierCurveTo(-64, 6, -44, 32, 0, 32); c.bezierCurveTo(44, 32, 64, 6, 64, -30); ol(c);
  // ขอบปาก + ชานม
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(0, -30, 64, 10, 0, 0, TAU); c.fill(); ol(c);
  const tg = c.createLinearGradient(0, -36, 0, -24);
  tg.addColorStop(0, '#F2C9A0'); tg.addColorStop(1, '#DCA172');
  c.fillStyle = tg; c.beginPath(); c.ellipse(0, -29, 55, 6.5, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-16, -30.5, 14, 2, 0, 0, TAU); c.fill();
  c.strokeStyle = '#EBC66F'; c.lineWidth = 2.2; c.beginPath(); c.ellipse(0, -30, 61, 8.5, 0, Math.PI * 0.05, Math.PI * 0.95); c.stroke();
  // ไอร้อนลอยเป็นเกลียว
  c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const u = ((t * 0.012 + i / 3) % 1), x0 = -24 + i * 24, y0 = -42 - u * 60;
    c.globalAlpha = Math.sin(u * Math.PI) * 0.75;
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(x0, y0 + 22); c.bezierCurveTo(x0 + 12, y0 + 14, x0 - 12, y0 + 6, x0 + Math.sin(t * 0.05 + i) * 6, y0 - 4); c.stroke();
  }
  c.globalAlpha = 1;
}

/** ขนม 7 แบบในตู้ (สุ่มได้) — วาดกลาง 0,0 */
export const SNACKS = [
  { id: 'fish', name: 'คุกกี้ปลาทูอบเนย', draw(c) {
    const b = new Path2D(); b.ellipse(-8, 0, 50, 30, 0, 0, TAU);
    const tl = new Path2D(); tl.moveTo(34, 0); tl.lineTo(62, -24); tl.quadraticCurveTo(54, 0, 62, 24); tl.closePath();
    for (const p of [tl, b]) { c.fillStyle = lgx(c, -40, 40, '#F7D29A', '#D9944E'); c.fill(p); c.strokeStyle = LINE; c.lineWidth = LW; c.lineJoin = 'round'; c.stroke(p); }
    c.strokeStyle = '#FF9CC0'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-28, -10); for (let i = 1; i <= 6; i++) c.lineTo(-28 + i * 8, i % 2 ? 6 : -10); c.stroke();
    c.fillStyle = LINE; c.beginPath(); c.arc(-40, -6, 4.5, 0, TAU); c.fill();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(-41.5, -7.5, 1.6, 0, TAU); c.fill();
  } },
  { id: 'cupcake', name: 'คัพเค้กสตรอว์เบอร์รี', draw(c) {
    const w = new Path2D(); w.moveTo(-40, 0); w.lineTo(40, 0); w.lineTo(30, 40); w.lineTo(-30, 40); w.closePath();
    c.fillStyle = '#FFC4DA'; c.fill(w);
    c.save(); c.clip(w); c.fillStyle = '#F58AB6'; for (let x = -40; x < 44; x += 14) c.fillRect(x, 0, 6, 40); c.restore();
    c.strokeStyle = LINE; c.lineWidth = LW; c.lineJoin = 'round'; c.stroke(w);
    const f = new Path2D();
    f.moveTo(-46, 2); f.bezierCurveTo(-60, -14, -40, -30, -24, -24); f.bezierCurveTo(-24, -48, 20, -50, 22, -26);
    f.bezierCurveTo(42, -30, 58, -12, 46, 2); f.closePath();
    c.fillStyle = lgx(c, 0, 0, '#F4E6FF', '#C9AEEF', true); c.fill(f); c.stroke(f);
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-30, -12); c.quadraticCurveTo(0, -4, 30, -12); c.stroke();
    c.fillStyle = '#FF5E8E'; c.beginPath(); c.moveTo(0, -60); c.bezierCurveTo(14, -60, 14, -42, 0, -36); c.bezierCurveTo(-14, -42, -14, -60, 0, -60); c.fill(); ol(c, 3.4);
    c.fillStyle = '#7CC67E'; c.beginPath(); c.ellipse(0, -60, 7, 3, 0, 0, TAU); c.fill();
    for (const [x, y, col] of [[-26, -14, '#FFE48A'], [16, -16, '#A9D6FF'], [32, -8, '#FFFFFF'], [-8, -22, '#FF8FB3']]) { c.fillStyle = col; c.beginPath(); c.roundRect(x - 3, y - 1.5, 6, 3, 1.5); c.fill(); }
  } },
  { id: 'macaron', name: 'มาการงสตรอว์เบอร์รี', draw(c) {
    for (const [y, h] of [[-14, 18], [16, 18]]) {
      c.fillStyle = lgx(c, 0, 0, '#FFD3E6', '#F48CB8', true);
      c.beginPath(); c.ellipse(0, y, 52, h, 0, 0, TAU); c.fill(); ol(c);
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-18, y - 7, 14, 4, -0.15, 0, TAU); c.fill();
    }
    c.fillStyle = '#FFF4E6'; c.beginPath(); c.roundRect(-46, -2, 92, 9, 4.5); c.fill(); ol(c, 3);
    c.fillStyle = '#FF6F9F'; heart(c, 0, 18, 6); c.fill();
  } },
  { id: 'donut', name: 'โดนัทหน้าแมว', draw(c) {
    for (const d of [-1, 1]) { c.fillStyle = '#F7A8CB'; c.beginPath(); c.moveTo(d * 44, -18); c.lineTo(d * 40, -50); c.lineTo(d * 16, -38); c.closePath(); c.fill(); ol(c); }
    c.fillStyle = '#E9B57E'; c.beginPath(); c.arc(0, 0, 50, 0, TAU); c.fill(); ol(c);
    c.fillStyle = '#F9B6D4';
    c.beginPath(); c.moveTo(-46, 6); c.bezierCurveTo(-52, -40, 52, -40, 46, 6); c.bezierCurveTo(40, 18, 30, 8, 22, 18); c.bezierCurveTo(10, 30, -10, 22, -20, 18); c.bezierCurveTo(-32, 10, -40, 20, -46, 6); c.fill();
    c.fillStyle = '#FFF4F0'; c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.fill(); ol(c, 3);
    for (const [x, y, col, a] of [[-30, -16, '#FFE48A', 0.5], [26, -22, '#A9D6FF', -0.4], [-10, -34, '#FFFFFF', 0.2], [34, -2, '#C5A4E8', 1], [-36, 2, '#FFFFFF', -1]]) {
      c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = col; c.beginPath(); c.roundRect(-4, -1.6, 8, 3.2, 1.6); c.fill(); c.restore();
    }
    c.strokeStyle = LINE; c.lineWidth = 3; c.lineCap = 'round';
    for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 22, -14, 4.5, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
  } },
  { id: 'taiyaki', name: 'ไทยากิไส้ครีม', draw(c) {
    const b = new Path2D();
    b.moveTo(-54, 0); b.bezierCurveTo(-50, -30, 6, -34, 30, -12); b.lineTo(56, -30); b.quadraticCurveTo(48, 0, 56, 30); b.lineTo(30, 12); b.bezierCurveTo(6, 34, -50, 30, -54, 0); b.closePath();
    c.fillStyle = lgx(c, 0, 0, '#F2B66E', '#C77A34', true); c.fill(b); c.strokeStyle = LINE; c.lineWidth = LW; c.lineJoin = 'round'; c.stroke(b);
    c.save(); c.clip(b);
    c.strokeStyle = 'rgba(140,70,20,.35)'; c.lineWidth = 2.4;
    for (let i = 0; i < 4; i++) for (let j = -1; j <= 1; j++) { c.beginPath(); c.arc(-14 + i * 12, j * 12, 6, -1.2, 1.2); c.stroke(); }
    c.restore();
    c.fillStyle = LINE; c.beginPath(); c.arc(-36, -6, 4.5, 0, TAU); c.fill();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(-37.5, -7.5, 1.6, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,143,179,.6)'; c.beginPath(); c.ellipse(-30, 8, 6, 3.4, 0, 0, TAU); c.fill();
  } },
  { id: 'pudding', name: 'พุดดิ้งคาราเมล', draw(c, t) {
    const j = Math.sin(t * 0.3) * 1.6;   // พุดดิ้งดุ๊กดิ๊ก
    const b = new Path2D(); b.moveTo(-30 - j, -28); b.lineTo(30 + j, -28); b.quadraticCurveTo(44, 30, 46, 34); b.lineTo(-46, 34); b.quadraticCurveTo(-44, 30, -30 - j, -28); b.closePath();
    c.fillStyle = lgx(c, 0, 0, '#FFF0A8', '#F5C85A', true); c.fill(b); c.strokeStyle = LINE; c.lineWidth = LW; c.lineJoin = 'round'; c.stroke(b);
    c.fillStyle = '#B5652A';
    c.beginPath(); c.moveTo(-31 - j, -28); c.lineTo(31 + j, -28); c.lineTo(34, -12); c.quadraticCurveTo(26, -4, 22, -14); c.quadraticCurveTo(10, 0, 4, -12); c.quadraticCurveTo(-8, -2, -14, -14); c.quadraticCurveTo(-24, -6, -34, -12); c.closePath(); c.fill(); ol(c, 3);
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-14, -24, 9, 2.4, 0, 0, TAU); c.fill();
    c.fillStyle = '#FF5E8E'; c.beginPath(); c.arc(4, -38, 9, 0, TAU); c.fill(); ol(c, 3);
    c.strokeStyle = '#5E9E5A'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(4, -46); c.quadraticCurveTo(10, -56, 16, -58); c.stroke();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(1, -41, 2.4, 0, TAU); c.fill();
  } },
  { id: 'onigiri', name: 'ข้าวปั้นหน้าแมว', draw(c) {
    for (const d of [-1, 1]) { c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(d * 40, -18); c.lineTo(d * 34, -54); c.lineTo(d * 10, -38); c.closePath(); c.fill(); ol(c); }
    const b = new Path2D(); b.moveTo(0, -46); b.bezierCurveTo(30, -46, 58, 20, 46, 34); b.bezierCurveTo(30, 44, -30, 44, -46, 34); b.bezierCurveTo(-58, 20, -30, -46, 0, -46); b.closePath();
    c.fillStyle = '#FFFFFF'; c.fill(b); c.strokeStyle = LINE; c.lineWidth = LW; c.stroke(b);
    c.save(); c.clip(b); c.fillStyle = '#3E4A52'; c.fillRect(-26, 14, 52, 40); c.restore();
    c.strokeStyle = LINE; c.lineWidth = 3; c.lineCap = 'round';
    for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 16, -8, 5, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    c.fillStyle = 'rgba(255,143,179,.6)'; c.beginPath(); c.ellipse(-26, 2, 6, 3.4, 0, 0, TAU); c.ellipse(26, 2, 6, 3.4, 0, 0, TAU); c.fill();
    c.fillStyle = '#FF8FB3'; c.beginPath(); c.moveTo(-3, -1); c.lineTo(3, -1); c.lineTo(0, 3); c.closePath(); c.fill();
  } },
];
function lgx(c, a, b, c0, c1, vert = false) {
  const g = vert ? c.createLinearGradient(0, -50, 0, 50) : c.createLinearGradient(a - 50, 0, b + 50, 0);
  g.addColorStop(0, c0); g.addColorStop(1, c1); return g;
}
let lastSnack = null;
export function randomSnack() {
  const pool = SNACKS.filter((s) => s !== lastSnack);
  return (lastSnack = pool[Math.floor(Math.random() * pool.length)]);
}
// รอยกัดบนขอบบนขนม (คำที่ 1, 2 · คำที่ 3 = หมด)
const BITE = [[30, -30, 20], [-4, -40, 19]];
function drawSnack(c, sn, bites, t) {
  c.save();
  if (bites > 0) {
    const p = new Path2D(); p.rect(-300, -300, 600, 600);
    for (let i = 0; i < Math.min(bites, BITE.length); i++) { const [bx, by, br] = BITE[i]; p.moveTo(bx + br, by); p.arc(bx, by, br, 0, TAU); }
    c.clip(p, 'evenodd');
  }
  sn.draw(c, t);
  c.restore();
}

// ── ไทม์ไลน์ท่า (เฟรม 60 fps) ─────────────────────────────────────
const DUR = { tea: 300, snack: 284 };
const BITES = [70, 122, 174];
export function startAct(kind, snack = null) { return { kind, t: 0, snack, bites: 0 }; }

/** รูปร่างท่าตอนนี้ { k, shape, holdDraw } (ส่งให้ drawCat2 ตรง ๆ) */
export function actPose(a, tick) {
  const t = a.t;
  if (a.kind === 'tea') {
    const k = ramp(t, 0, 18) * (1 - ramp(t, 274, 298));
    const sip = Math.max(bump(t, 26, 42, 72, 88), bump(t, 148, 164, 196, 212));
    const yum1 = bump(t, 90, 98, 136, 148), yum2 = bump(t, 214, 222, 266, 280);
    const shape = { knead: 1, clasp: 0.25, kneadT: 0, noHang: 1, armFar: 1, sip };
    if (sip > 0.25) { shape.shut = 1; shape.tilt = -0.05 * sip; }
    else if (yum1 > 0.15 || yum2 > 0.15) {
      const big = yum2 > yum1, w = big ? yum2 : yum1;
      shape.mood = 'happy';
      shape.mouth = (big ? 0.5 : 0.3) * w;
      shape.tilt = Math.sin(t * (big ? 0.26 : 0.15)) * (big ? 0.1 : 0.06) * w;
      shape.ear = big ? 0.4 * w : 0;
    } else { shape.gaze = 0; shape.gazeY = 0.55; }
    return { k, shape, holdBehind: true, holdDraw: (c, x, y) => { c.save(); c.translate(x, y - 26); c.scale(1.45, 1.45); teacup(c, tick); c.restore(); } };
  }
  // snack
  const k = ramp(t, 4, 24) * (1 - ramp(t, 258, 282));
  const has = t >= 24 && a.bites < 3;
  const shape = { knead: 1, clasp: has ? 0.25 : 0, kneadT: 0, noHang: 1, armFar: 1 };
  if (t < 62) {
    shape.gaze = 0; shape.gazeY = 0.4;
    if (t > 24) { shape.mood = 'starry'; shape.mouth = 0.32 * bump(t, 26, 32, 50, 60); }
  }
  if (t >= 62 && t <= 206) shape.mood = 'happy';   // ระหว่างคำ: ยิ้มตาหยีฟินกับขนม
  for (const b0 of BITES) {
    const up = bump(t, b0 - 9, b0, b0 + 24, b0 + 34);
    if (up > 0.02) {
      shape.sip = 0.62 * up; shape.mood = 'happy';
      shape.mouth = t > b0 ? Math.abs(Math.sin((t - b0) * 0.45)) * 0.45 * up : 0.38 * up;   // อ้าปากงับ → เคี้ยวงุบงิบ
      shape.tilt = Math.sin(t * 0.3) * 0.03;
    }
  }
  if (t > 206) { shape.mood = 'happy'; shape.bleh = bump(t, 208, 216, 238, 248); shape.tilt = Math.sin(t * 0.2) * 0.06; }
  return { k, shape, holdBehind: true, holdDraw: has ? (c, x, y) => { c.save(); c.translate(x, y - 30); c.scale(1.3, 1.3); drawSnack(c, a.snack, a.bites, tick); c.restore(); } : null };
}

/**
 * เดินท่าไปทีละเฟรม — false = จบท่าแล้ว
 * env = { sfx(name), at() → { top, head, mouth, chest: {x,y} } พิกัดโลก (top = เหนือหูขึ้นไป)
 */
export function stepAct(a, dt, env) {
  const t0 = a.t;
  a.t += dt;
  const hit = (f) => t0 < f && a.t >= f;
  const A = env.at();
  if (a.kind === 'tea') {
    if (hit(28) || hit(150)) env.sfx('sip');
    if (hit(94)) { burst('heart', A.head.x, A.head.y, 3); env.sfx('purr'); }
    if (hit(216)) { burst('heart', A.head.x, A.head.y, 5); burst('spark', A.top.x, A.top.y, 7); burst('note', A.head.x, A.top.y + 10, 3); env.sfx('yum'); }
  } else {
    if (hit(24)) { burst('spark', A.chest.x, A.chest.y, 8); }
    for (const [i, b] of BITES.entries()) if (hit(b)) { a.bites = i + 1; burst('crumb', A.mouth.x, A.mouth.y + 6, i === 2 ? 12 : 7); env.sfx('nom'); }
    if (hit(210)) { burst('heart', A.head.x, A.head.y, 5); burst('note', A.head.x, A.top.y + 10, 2); env.sfx('yum'); }
  }
  return a.t < DUR[a.kind];
}

// ── ขนมลอยจากตู้เข้ามือ (พิกัดโลก) ──────────────────────────────────
/** from = จุดในตู้ · to = อุ้งเท้าน้อง · u 0..1 ตามเวลา · s = สเกลไฟล์→โลก */
export function drawSnackFlight(c, a, from, to, s, tick) {
  if (a.kind !== 'snack' || a.t >= 26) return;
  const u = ease(a.t / 26), x = from.x + (to.x - from.x) * u, y = from.y + (to.y - from.y) * u - Math.sin(u * Math.PI) * 60;
  c.save();
  // ประกายตามหาง
  for (let i = 1; i <= 4; i++) {
    const v = Math.max(0, u - i * 0.06), px = from.x + (to.x - from.x) * v, py = from.y + (to.y - from.y) * v - Math.sin(v * Math.PI) * 60;
    c.globalAlpha = 0.7 - i * 0.15; c.fillStyle = i % 2 ? '#FFFFFF' : '#FFE48A'; star(c, px, py, 4 - i * 0.6, tick * 0.1); c.fill();
  }
  c.globalAlpha = 1;
  c.translate(x, y); c.rotate((1 - u) * 2.4); c.scale(s * (0.6 + 0.4 * u), s * (0.6 + 0.4 * u));
  drawSnack(c, a.snack, 0, tick);
  c.restore();
}

// ── ของประกอบลอย (พิกัดโลก): หัวใจ ประกาย โน้ตเพลง เศษขนม Zzz ─────────────
const fx = [];
const rnd = (a, b) => a + Math.random() * (b - a);
export function burst(kind, x, y, n) {
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    if (kind === 'heart') fx.push({ kind, x: x + side * rnd(8, 22), y: y + rnd(-6, 6), vx: side * rnd(0.2, 0.6), vy: rnd(-1.1, -0.6), r: rnd(3.4, 5.4), age: -i * 5, life: 60 });
    else if (kind === 'spark') { const a = (i / n) * TAU; fx.push({ kind, x, y, vx: Math.cos(a) * rnd(1.2, 2.2), vy: Math.sin(a) * rnd(1.2, 2.2) - 0.5, r: rnd(3.5, 6), age: 0, life: 32 }); }
    else if (kind === 'note') fx.push({ kind, x: x + side * rnd(14, 26), y, vx: side * rnd(0.3, 0.6), vy: rnd(-0.9, -0.6), r: rnd(9, 12), age: -i * 8, life: 70, ch: i % 2 ? '♪' : '♫' });
    else if (kind === 'crumb') fx.push({ kind, x: x + rnd(-8, 8), y, vx: rnd(-1.2, 1.2), vy: rnd(-1.6, -0.4), g: 0.12, r: rnd(1.2, 2.4), age: 0, life: 46, col: Math.random() < 0.5 ? '#E9B57E' : '#F7D29A' });
    else if (kind === 'z') fx.push({ kind, x, y, vx: 0.32, vy: -0.42, r: rnd(7, 10), age: 0, life: 90 });
  }
}
export function stepActFx(dt) {
  for (const p of fx) {
    p.age += dt;
    if (p.age < 0) continue;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += (p.g || 0) * dt;
    if (p.kind === 'z') p.x += Math.sin(p.age * 0.08) * 0.25;
  }
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i].age >= fx[i].life) fx.splice(i, 1);
}
export function drawActFx(c) {
  for (const p of fx) {
    if (p.age < 0) continue;
    const u = p.age / p.life;
    c.save();
    if (p.kind === 'heart') { c.globalAlpha = Math.min(1, (1 - u) * 2.2); c.fillStyle = '#FF7EAB'; heart(c, p.x, p.y, p.r * (0.7 + 0.3 * (1 - u))); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(p.x - p.r * 0.35, p.y - p.r * 0.3, p.r * 0.2, 0, TAU); c.fill(); }
    else if (p.kind === 'spark') { c.globalAlpha = 1 - u; c.fillStyle = '#FFE48A'; star(c, p.x, p.y, p.r * (1 - u * 0.5), p.age * 0.1); c.fill(); }
    else if (p.kind === 'note') {
      c.globalAlpha = Math.sin(u * Math.PI); c.font = `700 ${p.r.toFixed(1)}px Mali, sans-serif`; c.textAlign = 'center';
      c.fillStyle = '#C77DDE'; c.fillText(p.ch, p.x, p.y);
    } else if (p.kind === 'crumb') { c.globalAlpha = 1 - u; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); }
    else if (p.kind === 'z') {
      c.globalAlpha = Math.sin(u * Math.PI) * 0.9;
      const size = p.r * (0.7 + u * 0.7);
      c.font = `700 ${size.toFixed(1)}px Mali, sans-serif`; c.textAlign = 'center';
      c.lineWidth = 3; c.strokeStyle = 'rgba(90,60,140,.45)'; c.strokeText('z', p.x, p.y);
      c.fillStyle = '#F4EEFF'; c.fillText('z', p.x, p.y);
    }
    c.restore();
  }
}
