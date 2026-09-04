// src/render/treasure-fx.js
// ─────────────────────────────────────────────────────────────
// ภาพของฤทธิ์สมบัติ — วาดอย่างเดียว ไม่ตัดสินใจอะไรเลย
//
// ทุกตัวรับ p = ความคืบหน้า 0→1 ของแอนิเมชันนั้น แล้ววาดตามช่วงเวลา
// เขียนแบบนี้เพื่อให้ปรับความเร็วได้จาก SHOW_FRAMES ที่เดียวใน treasure-run.js
// โดยไม่ต้องมาแก้ตัวเลขในทุกฟังก์ชันวาด
//
// พิกัดทั้งหมดเป็น "พิกัดจอ" ไม่ใช่พิกัดโลก เพราะฤทธิ์เกิดกับตัวละคร
// ซึ่งตรึงอยู่ที่ PLAYER_X ตลอด ไม่ต้องลบ camera
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y, COLORS as C } from '../config.js';
import { star4 } from './entities.js';

const { W } = VIEW;

/** นุ่มหัวท้าย ใช้กับการเคลื่อนที่แทบทุกตัว */
const ease = (t) => t * t * (3 - 2 * t);
/** เด้งขึ้นแล้วลง 0→1→0 */
const arc = (t) => Math.sin(Math.max(0, Math.min(1, t)) * Math.PI);

/** ของชิ้นเล็กพุ่งเข้าหาแมว ใช้ร่วมกันหลายสมบัติ */
function flyIn(ctx, from, to, k, draw) {
  const e = ease(Math.max(0, Math.min(1, k)));
  const x = from.x + (to.x - from.x) * e;
  // โค้งขึ้นระหว่างทาง ไม่ใช่ลากเป็นเส้นตรงซึ่งดูเป็นของถูกดูดด้วยแม่เหล็กมากกว่าปลิว
  const y = from.y + (to.y - from.y) * e - arc(k) * 26;
  draw(x, y, 1 - k * 0.35);
}

// ── 🍊 ส้มมหัศจรรย์ ──────────────────────────────────────────
// เด้งเข้ามาจากขวา → หยุดกลางจอ → เปลือกแตก → กลีบพุ่งเข้าหาแมว
function drawOrange(ctx, p, cat) {
  const stopX = cat.x + 190;
  const stopY = GROUND_Y - 130;

  if (p < 0.34) {
    const k = p / 0.34;
    const x = W + 70 + (stopX - W - 70) * ease(k);
    const y = stopY - arc(k) * 40;
    orangeBall(ctx, x, y, 30, 1);
    return;
  }

  if (p < 0.46) {
    // ค้างแล้วสั่นก่อนแตก บอกล่วงหน้าว่ากำลังจะมีอะไรเกิดขึ้น
    const k = (p - 0.34) / 0.12;
    const sh = Math.sin(k * 34) * 3.5 * (1 - k);
    orangeBall(ctx, stopX + sh, stopY, 30 + k * 5, 1);
    return;
  }

  const k = (p - 0.46) / 0.54;

  // เปลือกแตกออกสองซีกแล้วปลิวออกนอกจอ
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - k * 2);
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.translate(stopX + dir * k * 90, stopY - k * 40 + k * k * 90);
    ctx.rotate(dir * k * 2.4);
    ctx.fillStyle = '#E8721C';
    ctx.beginPath();
    ctx.arc(0, 0, 26, dir > 0 ? -Math.PI / 2 : Math.PI / 2, dir > 0 ? Math.PI / 2 : Math.PI * 1.5);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // กลีบส้มพุ่งเข้าตัว เหลื่อมกันทีละกลีบ
  for (let i = 0; i < 7; i++) {
    const kk = (k - i * 0.05) / 0.62;
    if (kk <= 0 || kk >= 1) continue;
    const a = (i / 7) * Math.PI * 2;
    flyIn(ctx,
      { x: stopX + Math.cos(a) * 34, y: stopY + Math.sin(a) * 34 },
      cat, kk,
      (x, y, al) => segment(ctx, x, y, 13, a + kk * 3, al));
  }
}

function orangeBall(ctx, x, y, r, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(255,154,60,.95)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#FF9A3C';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.32)';
  ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.34, r * 0.3, r * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
  // ก้านกับใบ ทำให้อ่านออกว่าเป็นส้มไม่ใช่ลูกบอลส้ม
  ctx.strokeStyle = '#7A4A18'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y - r - 7); ctx.stroke();
  ctx.fillStyle = '#4CA862';
  ctx.beginPath(); ctx.ellipse(x + 9, y - r - 6, 9, 5, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function segment(ctx, x, y, r, rot, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#FFB347';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, -0.55, 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,200,.85)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

// ── 🍓 สตรอว์เบอร์รี่อุ่นหัวใจ ────────────────────────────────
// กลิ้งเข้ามา → เด้งขึ้น → แตกเป็นหัวใจ → หัวใจพุ่งเข้าหาแมว
function drawBerry(ctx, p, cat) {
  const stopX = cat.x + 150;

  if (p < 0.4) {
    const k = p / 0.4;
    const x = W + 50 + (stopX - W - 50) * ease(k);
    berry(ctx, x, GROUND_Y - 26, 20, k * 9, 1);
    return;
  }
  if (p < 0.55) {
    const k = (p - 0.4) / 0.15;
    berry(ctx, stopX, GROUND_Y - 26 - arc(k) * 74, 20, 3.6 + k * 2, 1);
    return;
  }

  const k = (p - 0.55) / 0.45;
  for (let i = 0; i < 8; i++) {
    const kk = (k - i * 0.045) / 0.66;
    if (kk <= 0 || kk >= 1) continue;
    const a = (i / 8) * Math.PI * 2;
    flyIn(ctx,
      { x: stopX + Math.cos(a) * 26, y: GROUND_Y - 96 + Math.sin(a) * 26 },
      cat, kk,
      (x, y, al) => heart(ctx, x, y, 9 * (1 - kk * 0.3), al));
  }
}

function berry(ctx, x, y, r, rot, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.shadowColor = 'rgba(255,92,138,.9)'; ctx.shadowBlur = 16;
  ctx.fillStyle = '#FF5C8A';
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.bezierCurveTo(-r * 1.15, r * 0.1, -r * 0.85, -r, 0, -r * 0.7);
  ctx.bezierCurveTo(r * 0.85, -r, r * 1.15, r * 0.1, 0, r);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,240,240,.9)';
  for (let i = 0; i < 5; i++) {
    const aa = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(aa) * r * 0.42, Math.sin(aa) * r * 0.34, 1.7, 2.6, aa, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#4CA862';
  for (let i = 0; i < 5; i++) {
    const aa = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(aa) * r * 0.4, -r * 0.72 + Math.sin(aa) * r * 0.2, r * 0.4, r * 0.17, aa, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function heart(ctx, x, y, s, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = '#FF6FA3';
  ctx.shadowColor = 'rgba(255,111,163,.9)'; ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(x, y + s);
  ctx.bezierCurveTo(x - s * 1.6, y - s * 0.35, x - s * 0.6, y - s * 1.25, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.25, x + s * 1.6, y - s * 0.35, x, y + s);
  ctx.fill();
  ctx.restore();
}

// ── 🐾 อุ้งเท้าแมววิเศษ ──────────────────────────────────────
// อุ้งเท้าใหญ่โผล่ข้างหลัง → ตบลงพื้น → วงประกายแผ่ออก
function drawPaw(ctx, p, cat) {
  if (p < 0.42) {
    const k = p / 0.42;
    paw(ctx, cat.x, cat.y - 190 + ease(k) * 60, 62, 0.35 + k * 0.4);
    return;
  }
  if (p < 0.56) {
    const k = (p - 0.42) / 0.14;
    paw(ctx, cat.x, cat.y - 130 + ease(k) * 120, 62 + k * 10, 0.9);
    return;
  }

  const k = (p - 0.56) / 0.44;
  paw(ctx, cat.x, cat.y - 10, 72, Math.max(0, 0.9 - k * 1.4));

  // วงกระแทกแผ่ออกจากจุดตบ
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - k);
  ctx.strokeStyle = '#FFC93C';
  ctx.lineWidth = 5 * (1 - k) + 1;
  ctx.beginPath();
  ctx.ellipse(cat.x, GROUND_Y - 6, 30 + k * 180, 10 + k * 44, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#FFE9A8';
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 40 + k * 150;
    star4(ctx, cat.x + Math.cos(a) * r, GROUND_Y - 6 + Math.sin(a) * r * 0.32, 4 * (1 - k));
  }
  ctx.restore();
}

function paw(ctx, x, y, r, a) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.fillStyle = '#FFC93C';
  ctx.shadowColor = 'rgba(255,201,60,.85)'; ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.68, r * 0.56, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const a2 = -Math.PI * 0.82 + (i / 3) * Math.PI * 0.64;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a2) * r * 0.66, y + Math.sin(a2) * r * 0.62, r * 0.2, r * 0.24, a2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,143,176,.85)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.06, r * 0.4, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── 🧶 ลูกไหมพรมลึกลับ ───────────────────────────────────────
// ลูกไหมกลิ้งตามมา → เส้นพันรอบตัว → แตกเป็นประกาย
function drawYarn(ctx, p, cat) {
  if (p < 0.5) {
    const k = p / 0.5;
    // เส้นไหมพันรอบตัวเป็นเกลียว
    ctx.save();
    ctx.strokeStyle = '#B07CFF';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    const turns = 3.4 * k;
    for (let i = 0; i <= 90; i++) {
      const tt = (i / 90) * turns * Math.PI * 2;
      const rr = 34 - (i / 90) * 8;
      const x = cat.x + Math.cos(tt) * rr;
      const y = cat.y - 26 + (i / 90) * 52 + Math.sin(tt) * 7;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    yarnBall(ctx, cat.x - 78 + ease(k) * 46, GROUND_Y - 20, 17, k * 11);
    return;
  }

  const k = (p - 0.5) / 0.5;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - k);
  ctx.fillStyle = '#D9BBFF';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = 20 + k * 120;
    star4(ctx, cat.x + Math.cos(a) * r, cat.y + Math.sin(a) * r, 5 * (1 - k) + 1);
  }
  ctx.strokeStyle = '#B07CFF';
  ctx.lineWidth = 4 * (1 - k) + 1;
  ctx.beginPath(); ctx.arc(cat.x, cat.y, 26 + k * 110, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function yarnBall(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#B07CFF';
  ctx.shadowColor = 'rgba(176,124,255,.85)'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 1.8;
  for (const a of [-0.6, 0, 0.6]) {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.92, r * 0.42, a, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ── 🥛 นมวิเศษ ───────────────────────────────────────────────
// แก้วนมโผล่ → นมกระเด็นเป็นวง → กลายเป็นฟองคุ้มตัว
function drawMilk(ctx, p, cat) {
  if (p < 0.3) {
    const k = p / 0.3;
    glass(ctx, cat.x, cat.y - 96 + ease(k) * 18, 1, k);
    return;
  }
  if (p < 0.5) {
    const k = (p - 0.3) / 0.2;
    glass(ctx, cat.x, cat.y - 78, 1 - k * 0.4, 1 - k);
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = k * 70;
      ctx.beginPath();
      ctx.arc(cat.x + Math.cos(a) * r, cat.y - 60 + Math.sin(a) * r * 0.7, 5 * (1 - k) + 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  bubble(ctx, cat, (p - 0.5) / 0.5);
}

/** ฟองคุ้มตัว — เกมเรียกซ้ำได้ตลอดช่วงที่โล่ยังอยู่ ไม่ใช่แค่ตอนแอนิเมชัน */
export function drawMilkBubble(ctx, cat, t) {
  bubble(ctx, cat, 0.5, t);
}

function bubble(ctx, cat, k, t = 0) {
  // โตตามตัวแมวด้วย ไม่งั้นฟองรัศมี 46px จะจมอยู่ในตัวแมวตอนกินกระป๋องแล้วตัวโต
  // cat.s ไม่มีมาก็ถือว่าขนาดปกติ (ตัวเรียกเก่าบางที่ส่งมาแค่ x/y)
  const pulse = (1 + Math.sin((t || k * 40) * 0.12) * 0.04) * (cat.s || 1);
  ctx.save();
  ctx.globalAlpha = 0.5 + Math.sin((t || k * 40) * 0.09) * 0.12;
  const g = ctx.createRadialGradient(cat.x, cat.y, 8, cat.x, cat.y, 46 * pulse);
  g.addColorStop(0, 'rgba(255,255,255,.05)');
  g.addColorStop(0.72, 'rgba(255,255,255,.22)');
  g.addColorStop(1, 'rgba(255,255,255,.55)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cat.x, cat.y, 46 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 2 * (cat.s || 1);
  ctx.beginPath(); ctx.arc(cat.x, cat.y, 46 * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  // แสงสะท้อนต้องเกาะผิวฟอง ไม่ใช่ค้างที่ระยะเดิมตอนฟองขยาย
  ctx.beginPath();
  ctx.ellipse(cat.x - 20 * pulse, cat.y - 24 * pulse, 7 * pulse, 11 * pulse, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function glass(ctx, x, y, s, a) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.moveTo(-15, -20); ctx.lineTo(15, -20); ctx.lineTo(11, 20); ctx.lineTo(-11, 20);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(-13.5, -13); ctx.lineTo(13.5, -13); ctx.lineTo(11, 20); ctx.lineTo(-11, 20);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-15, -20); ctx.lineTo(11, 20); ctx.lineTo(-11, 20); ctx.lineTo(-15, -20);
  ctx.moveTo(15, -20); ctx.lineTo(11, 20);
  ctx.stroke();
  ctx.restore();
}

// ── 🌟 ดาวตกแห่งความฝัน ──────────────────────────────────────
// ดาวเล็กปรากฏด้านบน → ดาวตกพุ่งลง → ระเบิดเป็นประกาย
function drawStar(ctx, p, cat) {
  if (p < 0.3) {
    const k = p / 0.3;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.fillStyle = '#FFE071';
    for (let i = 0; i < 6; i++) {
      const x = cat.x - 120 + i * 46;
      star4(ctx, x, 40 + Math.sin(i * 1.7 + k * 5) * 12, 3 + Math.sin(k * 6 + i) * 2);
    }
    ctx.restore();
    return;
  }

  if (p < 0.66) {
    const k = (p - 0.3) / 0.36;
    const x = cat.x + 120 - ease(k) * 120;
    const y = -20 + ease(k) * (cat.y + 20);
    // หางดาวลากตามแนวที่พุ่งมา
    ctx.save();
    ctx.strokeStyle = 'rgba(255,224,113,.62)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 62, y - 62);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = '#FFF3C4';
    ctx.shadowColor = 'rgba(255,224,113,.95)'; ctx.shadowBlur = 22;
    star4(ctx, x, y, 15);
    ctx.restore();
    return;
  }

  const k = (p - 0.66) / 0.34;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - k);
  ctx.strokeStyle = '#FFE071';
  ctx.lineWidth = 6 * (1 - k) + 1;
  ctx.beginPath(); ctx.arc(cat.x, cat.y, 18 + k * 150, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#FFF3C4';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 24 + k * 130;
    star4(ctx, cat.x + Math.cos(a) * r, cat.y + Math.sin(a) * r, 6 * (1 - k) + 1);
  }
  ctx.restore();
}

// ── 🎈 ลูกโป่งเจ้าเหมียว ─────────────────────────────────────
// ลูกโป่งผุดออกมาด้านหลัง → ยกตัวขึ้น → POP
function drawBalloon(ctx, p, cat) {
  const cols = ['#FF8FB0', '#8DF3EA', '#FFE071'];
  if (p < 0.66) {
    const k = p / 0.66;
    for (let i = 0; i < 3; i++) {
      const a = -0.7 + i * 0.7;
      const x = cat.x - 14 + Math.cos(a) * 34 - k * 6;
      const y = cat.y - 34 - ease(k) * 44 + Math.sin(a) * 12;
      balloon(ctx, x, y, 15, cols[i], 1);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,243,226,.6)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y + 16);
      ctx.quadraticCurveTo(x + 4, y + 30, cat.x - 6, cat.y - 6);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  const k = (p - 0.66) / 0.34;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - k);
  for (let i = 0; i < 3; i++) {
    const a = -0.7 + i * 0.7;
    const bx = cat.x - 14 + Math.cos(a) * 34;
    const by = cat.y - 78 + Math.sin(a) * 12;
    ctx.strokeStyle = cols[i];
    ctx.lineWidth = 3 * (1 - k) + 1;
    for (let j = 0; j < 7; j++) {
      const aa = (j / 7) * Math.PI * 2;
      const r = 8 + k * 40;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(aa) * 8, by + Math.sin(aa) * 8);
      ctx.lineTo(bx + Math.cos(aa) * r, by + Math.sin(aa) * r);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function balloon(ctx, x, y, r, col, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.86, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.3, y - r * 0.36, r * 0.22, r * 0.3, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - 3.5, y + r * 0.94); ctx.lineTo(x + 3.5, y + r * 0.94); ctx.lineTo(x, y + r * 1.24);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ── 🍰 เค้กแห่งความสุข ───────────────────────────────────────
// เค้กเด้งเข้ามา → เทียนสว่าง → เป่า → POOF
function drawCake(ctx, p, cat) {
  const stopX = cat.x + 128;
  const y = GROUND_Y - 46;

  if (p < 0.3) {
    const k = p / 0.3;
    cake(ctx, W + 60 + (stopX - W - 60) * ease(k), y - arc(k) * 46, 1, 0);
    return;
  }
  if (p < 0.58) {
    const k = (p - 0.3) / 0.28;
    cake(ctx, stopX, y, 1, k);   // เทียนค่อย ๆ สว่าง
    return;
  }
  if (p < 0.72) {
    // ลมเป่าจากทางแมวไปหาเค้ก
    const k = (p - 0.58) / 0.14;
    cake(ctx, stopX, y, 1, 1 - k);
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.75;
    ctx.strokeStyle = 'rgba(232,244,255,.9)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const yy = y - 44 + i * 12;
      ctx.beginPath();
      ctx.moveTo(cat.x + 26 + k * 40, yy);
      ctx.quadraticCurveTo(cat.x + 70 + k * 40, yy - 8, stopX - 22, yy - 4);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const k = (p - 0.72) / 0.28;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - k);
  ctx.fillStyle = '#FFD9EC';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = 16 + k * 110;
    ctx.beginPath();
    ctx.arc(stopX + Math.cos(a) * r, y - 20 + Math.sin(a) * r * 0.8, 9 * (1 - k) + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function cake(ctx, x, y, s, lit) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // ฐาน
  ctx.fillStyle = '#F6D8A8';
  ctx.beginPath(); ctx.roundRect(-30, -6, 60, 30, 5); ctx.fill();
  ctx.fillStyle = '#FFB3D1';
  ctx.beginPath(); ctx.roundRect(-30, -16, 60, 14, 5); ctx.fill();
  // ครีมหยัก
  ctx.fillStyle = '#FFF0F6';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.arc(-24 + i * 12, -16, 6.5, Math.PI, 0); ctx.fill();
  }
  // เทียน
  ctx.fillStyle = '#8DF3EA';
  ctx.fillRect(-2.5, -38, 5, 20);
  if (lit > 0.02) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, lit);
    ctx.fillStyle = '#FFE071';
    ctx.shadowColor = 'rgba(255,224,113,.95)';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.ellipse(0, -44, 4.5, 8 + Math.sin(lit * 20) * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ── ตัวจ่ายงาน ───────────────────────────────────────────────

const DRAW = {
  orange: drawOrange,
  berry: drawBerry,
  paw: drawPaw,
  yarn: drawYarn,
  milk: drawMilk,
  star: drawStar,
  balloon: drawBalloon,
  cake: drawCake,
};

/** วาดแอนิเมชันฤทธิ์ทั้งหมดที่กำลังเล่นอยู่ */
export function drawTreasureShows(ctx, shows, cat) {
  for (const w of shows) {
    const fn = DRAW[w.id];
    if (fn) fn(ctx, Math.max(0, Math.min(1, w.t / w.life)), cat);
  }
}

/** ตัวเลขคะแนนลอยขึ้นแล้วจาง */
export function drawScorePops(ctx, pops, cat) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of pops) {
    const k = p.t / p.life;
    ctx.globalAlpha = Math.max(0, 1 - k * k);
    ctx.font = '700 26px Mitr, sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(28,10,44,.85)';
    ctx.fillStyle = p.color || C.cream;
    const y = cat.y - 56 - k * 62;
    ctx.strokeText(p.text, cat.x, y);
    ctx.fillText(p.text, cat.x, y);
  }
  ctx.restore();
}
