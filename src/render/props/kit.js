// src/render/props/kit.js
// ─────────────────────────────────────────────────────────────
// เครื่องมือวาดที่ใช้ร่วมกันของสิ่งกีดขวางชุดใหม่ (render/props/*.js)
//
// ทุกชิ้นวาดด้วย path + gradient ล้วน ไม่มีไฟล์ภาพ ขนาดพอดีกล่องชน (x, y, w, h) ที่ส่งเข้ามา
// เส้นขอบไม่ต้องวาดเอง — ชั้นสิ่งกีดขวางทั้งชั้นถูกตีขอบให้ทีเดียว (render/outline.js)
// แอนิเมชันอ่านเวลาจาก now() อย่างเดียว ฟังก์ชันวาดจึงไม่มีสถานะ เรียกซ้ำกี่รอบก็ได้ภาพเดิม
// ─────────────────────────────────────────────────────────────

export const TAU = Math.PI * 2;

/** เวลาเป็น "เฟรมที่ 60fps" สำหรับแอนิเมชันเล็ก ๆ (ไม่ผูกกับตัวเกม หน้าออกแบบก็ขยับได้) */
export function now() {
  return performance.now() / (1000 / 60);
}

/** สี่เหลี่ยมมุมมน เติมสี */
export function rr(ctx, x, y, w, h, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** ไล่สีแนวตั้ง */
export function vgrad(ctx, y0, y1, a, b) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}

/** ไล่สีแนวนอน */
export function hgrad(ctx, x0, x1, a, b) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}

export function circle(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

export function ellipse(ctx, x, y, rx, ry, fill, rot = 0) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fill();
}

/** รูปหลายเหลี่ยมจากรายการจุด [[x,y],...] */
export function poly(ctx, pts, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.fill();
}

/** เส้นหนาปลายมน */
export function line(ctx, x0, y0, x1, y1, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/** ดาวสี่แฉก (ประกาย) */
export function sparkle(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/** แสงเรืองวงกลม (โปร่ง) — ใช้ 'lighter' ให้สว่างขึ้นบนฉากมืด */
export function glow(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** เงาจาง ๆ ใต้ชิ้นที่ตั้งบนพื้น */
export function groundShadow(ctx, x, y, w, h) {
  ellipse(ctx, x + w / 2, y + h - 1, w * 0.52, 4, 'rgba(20,8,34,.22)');
}

/**
 * เสา/โซ่แขวนของชิ้นหมอบ — ลากจากขอบบนของกล่องขึ้นไปถึงขอบบนจอ
 * ชิ้นที่กระเด็น (ส่ง y = 0 มา) ความยาวเป็น 0 เอง จึงไม่ลากเสาติดไปด้วย
 */
export function hanger(ctx, x, y, color, width = 3) {
  if (y <= 2) return;
  line(ctx, x, 0, x, y + 2, width, color);
}
