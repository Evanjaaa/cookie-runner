// เงาน้องที่ยังไม่เคยพบ ("???" ในคลังน้องแมว) — ผู้ใช้ 7 พ.ย. 2026
// วาดน้องตามปกติ (ทรงแบบใหม่) ลงผ้าใบสำรอง แล้วระบายทั้งตัวเป็นสีไล่ม่วงลาเวนเดอร์นุ่ม ๆ
// ไม่เหลือเส้นหน้า/ลายใด ๆ + เรืองขาวรอบตัว ให้อ่านทรงออกบนฉากทุกสี
// draw(g) = วาดน้องลง g ด้วยพิกัดเดียวกับ ctx (transform ของ ctx ถูกคัดลอกไปให้แล้ว)

let buf = null;

export function drawShaded(ctx, draw) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  if (!buf) buf = document.createElement('canvas');
  if (buf.width !== W || buf.height !== H) { buf.width = W; buf.height = H; }
  const g = buf.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  g.setTransform(ctx.getTransform());
  draw(g);

  // หากรอบตัว (พิกัดจอ) เพื่อให้ไล่สีพอดีตัว ไม่ใช่พอดีผ้าใบ — ใช้จุดยืน/ขนาดจาก transform คร่าว ๆ ไม่ได้ จึงไล่ทั้งผ้าใบแบบแนวตั้ง
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-in';
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#C9B4F0');
  gr.addColorStop(0.5, '#A487DA');
  gr.addColorStop(1, '#8466C4');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const r = Math.max(4, Math.min(W, H) * 0.018);
  ctx.shadowColor = 'rgba(255,255,255,.95)';
  ctx.shadowBlur = r;
  ctx.drawImage(buf, 0, 0);
  ctx.shadowColor = 'rgba(255,240,255,.6)';
  ctx.shadowBlur = r * 2.6;
  ctx.globalAlpha = 0.55;
  ctx.drawImage(buf, 0, 0);
  ctx.restore();
}
