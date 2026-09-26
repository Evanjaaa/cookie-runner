// src/mv/box.js
// ─────────────────────────────────────────────────────────────
// กล่องพัสดุ — "หีบสมบัติลับ" ของน้องส้ม (ฉาก 4 เป็นต้นไป กล่องอยู่บนพรมหน้าโซฟาจนจบเรื่อง)
//
// ── ทำไมแบ่งเป็นสองชั้น (หลัง / หน้า) ──
// น้องต้องลงไปอยู่ "ในกล่อง" ได้: วาดผนังด้านในกับฝาด้านหลังก่อน → วาดน้อง → วาดผนังด้านหน้าทับ
// ตัวน้องส่วนที่ต่ำกว่าขอบกล่องจึงหายเข้าไปในกล่องเอง ไม่ต้องตัดรูปน้องทีละท่า
// ─────────────────────────────────────────────────────────────
import { hash } from './anim.js';

export const BOX = { w: 124, h: 72 };

const C = {
  side: '#E2B27A',
  sideDark: '#C9955E',
  inner: '#B98552',
  flap: '#EBC38E',
  tape: '#F6E3B6',
  line: '#7A5242',
};

const ln = (ctx) => { ctx.strokeStyle = C.line; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; };

/**
 * ชั้นหลังของกล่อง: ผนังด้านใน + ฝาพับด้านหลังที่กางออก
 * (x, y) = กลางขอบล่างของกล่อง · rock = โยกซ้ายขวา (เรเดียน) · flapT = จังหวะฝาพับกระพือ
 */
export function drawBoxBack(ctx, x, y, { rock = 0, flapT = 0, scale = 1 } = {}) {
  const { w, h } = BOX;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rock); ctx.scale(scale, scale);
  ln(ctx);
  // ฝาพับซ้าย-ขวา กางออกเฉียงขึ้น (อยู่หลังตัวน้อง)
  const fl = Math.sin(flapT) * 0.06;
  for (const s of [-1, 1]) {
    ctx.fillStyle = C.flap;
    ctx.beginPath();
    ctx.moveTo(s * w / 2, -h);
    ctx.lineTo(s * (w / 2 + 34), -h - 30 - fl * 100 * s);
    ctx.lineTo(s * (w / 2 + 30), -h - 6 - fl * 60 * s);
    ctx.lineTo(s * (w / 2 - 2), -h + 8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // ฝาพับหลัง เอนไปข้างหลัง (เตี้ย ๆ ไม่ให้อ่านเป็นฝาปิด)
  ctx.fillStyle = C.flap;
  ctx.beginPath(); ctx.moveTo(-w / 2 + 8, -h - 20); ctx.lineTo(w / 2 - 8, -h - 20); ctx.lineTo(w / 2 - 18, -h - 40); ctx.lineTo(-w / 2 + 18, -h - 40); ctx.closePath(); ctx.fill(); ctx.stroke();
  // ปากกล่อง: ผนังด้านในมืดกว่า (มองลงไปในกล่อง) — ลึกพอให้เห็นว่ากล่องเปิดอยู่
  ctx.fillStyle = C.inner;
  ctx.beginPath(); ctx.moveTo(-w / 2, -h); ctx.lineTo(w / 2, -h); ctx.lineTo(w / 2 - 8, -h - 22); ctx.lineTo(-w / 2 + 8, -h - 22); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(90,55,30,.35)';
  ctx.fillRect(-w / 2 + 10, -h - 20, w - 20, 8);
  ctx.restore();
}

/** ชั้นหน้าของกล่อง: ผนังด้านหน้า เทปกาว ลายลูกศร "ด้านนี้ขึ้น" */
export function drawBoxFront(ctx, x, y, { rock = 0, scale = 1, glint = 0, t = 0 } = {}) {
  const { w, h } = BOX;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rock); ctx.scale(scale, scale);
  ln(ctx);
  ctx.fillStyle = C.side;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, h, 4); ctx.fill(); ctx.stroke();
  // เงาใต้ขอบบน
  ctx.fillStyle = C.sideDark;
  ctx.fillRect(-w / 2 + 2, -h + 2, w - 4, 8);
  // เทปกาวแนวตั้งกลางกล่อง
  ctx.fillStyle = C.tape;
  ctx.fillRect(-10, -h, 20, h); ctx.strokeRect(-10, -h, 20, h);
  // ลูกศรสองอันแบบกล่องพัสดุจริง
  ctx.strokeStyle = 'rgba(122,82,66,.6)'; ctx.lineWidth = 3;
  for (const ax of [-36, 36]) {
    ctx.beginPath(); ctx.moveTo(ax, -18); ctx.lineTo(ax, -44); ctx.moveTo(ax - 8, -36); ctx.lineTo(ax, -44); ctx.lineTo(ax + 8, -36); ctx.stroke();
  }
  // รูปอุ้งเท้าเล็ก ๆ บนกล่อง (ร้านขายของแมว)
  ctx.fillStyle = 'rgba(122,82,66,.35)';
  ctx.beginPath(); ctx.arc(0, -30, 5, 0, Math.PI * 2); ctx.fill();
  for (const [dx, dy] of [[-6, -39], [0, -42], [6, -39]]) { ctx.beginPath(); ctx.arc(dx, dy, 2.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();

  // ประกายวิบ ๆ ที่ขอบกล่อง = หีบสมบัติ
  if (glint > 0) {
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.9 + hash(i) * 3) % 1;
      const a = Math.sin(ph * Math.PI) * glint;
      const gx = x + (hash(i + 7) - 0.5) * (w + 30);
      const gy = y - h - 8 - hash(i + 11) * 40;
      star(ctx, gx, gy, 5 + hash(i + 3) * 5, a);
    }
  }
}

function star(ctx, x, y, r, a) {
  if (a <= 0.02) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = '#FFF4B8';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? r * 0.3 : r;
    const an = (i / 8) * Math.PI * 2;
    ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** กระดาษยับหนึ่งก้อน — ก้อนขาวขอบหยัก มีรอยยับ · spin = หมุน · squish = ถูกตบแบนลง */
export function drawPaper(ctx, x, y, r, { spin = 0, squish = 0, seed = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(spin); ctx.scale(1 + squish * 0.3, 1 - squish * 0.35);
  ctx.fillStyle = '#FFFDF7';
  ctx.strokeStyle = '#8C7A70'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath();
  const N = 11;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rr = r * (0.82 + hash(seed * 13 + i) * 0.3);
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // รอยยับ
  ctx.strokeStyle = 'rgba(140,122,112,.6)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const a = hash(seed * 7 + i) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.1, Math.sin(a) * r * 0.1);
    ctx.lineTo(Math.cos(a + 0.7) * r * 0.6, Math.sin(a + 0.7) * r * 0.6);
    ctx.lineTo(Math.cos(a + 0.3) * r * 0.8, Math.sin(a + 0.3) * r * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * ภายในกล่อง (Shot 4.4) — กล้องอยู่มุมหนึ่งในกล่อง มองข้ามไปอีกฝั่ง
 * ผนังกระดาษลังล้อมเป็นกรอบ ด้านบนเปิดเห็นแสงห้อง ตรงกลางคือผนังฝั่งตรงข้าม พื้นกล่องอยู่ล่าง
 * วาดในพิกัดจอ (W × H) ไม่ใช่พิกัดบ้าน เพราะกล้องอยู่ "ในกล่อง" ซึ่งไม่มีที่ในแผนผังบ้าน
 * คืนค่ากรอบผนังฝั่งตรงข้าม ให้ฉากวางน้องกับกระดาษบนพื้นกล่องพอดี
 */
export function drawBoxInside(ctx, W, H, t) {
  const ix0 = W * 0.16, ix1 = W * 0.84, iy0 = H * 0.2, iy1 = H * 0.8;
  const wob = Math.sin(t * 7) * 2.5;   // กล่องสั่นนิด ๆ ตามแรงที่น้องเล่น
  ctx.lineJoin = 'round'; ctx.strokeStyle = C.line; ctx.lineWidth = 4;
  // ผนังฝั่งตรงข้าม
  ctx.fillStyle = '#C8925C'; ctx.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
  // ด้านบนเปิด: แสงจากห้องส่องลงมา
  const g = ctx.createLinearGradient(0, 0, 0, iy0);
  g.addColorStop(0, '#FFF8EA'); g.addColorStop(1, '#FBE3C4');
  const faces = [
    [[0, 0], [W, 0], [ix1, iy0], [ix0, iy0], g],                  // ปากกล่อง (บน)
    [[0, H], [W, H], [ix1, iy1], [ix0, iy1], '#B98552'],          // พื้นกล่อง
    [[0, 0], [ix0, iy0], [ix0, iy1], [0, H], '#D6A46B'],          // ผนังซ้าย
    [[W, 0], [ix1, iy0], [ix1, iy1], [W, H], '#D6A46B'],          // ผนังขวา
  ];
  for (const [a, b, c, d, col] of faces) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(a[0], a[1] + wob); ctx.lineTo(b[0], b[1] + wob); ctx.lineTo(...c); ctx.lineTo(...d); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // ลำแสงจากปากกล่องตกลงผนังฝั่งตรงข้าม
  ctx.fillStyle = 'rgba(255,246,220,.28)';
  ctx.beginPath(); ctx.moveTo(ix0 + 40, iy0); ctx.lineTo(ix1 - 120, iy0); ctx.lineTo(ix1 - 60, iy1); ctx.lineTo(ix0 + 110, iy1); ctx.closePath(); ctx.fill();
  // ลายลอนกระดาษลังบนผนังข้าง
  ctx.strokeStyle = 'rgba(122,82,66,.22)'; ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) {
    const k = i / 6;
    ctx.beginPath(); ctx.moveTo(ix0 * k, iy0 * k); ctx.lineTo(ix0 * k, H - (H - iy1) * k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - (W - ix1) * k, iy0 * k); ctx.lineTo(W - (W - ix1) * k, H - (H - iy1) * k); ctx.stroke();
  }
  ctx.strokeStyle = C.line; ctx.lineWidth = 4;
  ctx.strokeRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
  return { ix0, ix1, iy0, iy1 };
}
