// src/render/cover-ext.js
// ─────────────────────────────────────────────────────────────
// ต่อฉากขึ้นบน-ลงล่าง บนจอสัดส่วนเตี้ย (iPad ทุกขนาด) — ไม่มีแถบม่วงว่างอีก
//
// บน iPad ผ้าใบกินเต็มเวที (main.js coverView) ฉาก 960×420 อยู่กลาง ส่วนสูงที่เกินคือ
// ctx.canvas.cover = { extTop, extBottom } (หน่วยฉาก) — ต้องมีอะไรวาดตรงนั้นทุกเฟรม
//
// ฉากในเกมมีหลายสิบแบบ (6 ด่าน + ทางเข้าด่าน + ฟ้าโบนัส + ห้อง + บ้านลูกเหมียว) จึงต่อแบบอัตโนมัติ:
//   1. สีของแถวขอบฉาก ย่อให้เบลอแนวนอนแล้วยืดเต็มพื้นที่ — ได้สีฟ้า/เพดาน/พื้น ตรงกับฉากทุกฉาก
//   2. แถวขอบจริงยืดต่อออกไปแล้วค่อย ๆ จางหาย — รอยต่อกับฉากเนียน ไม่เห็นเส้นตัด
//   3. ไล่มืดลงนิด ๆ เข้าหาขอบจอ — สายตาไปอยู่ที่ฉากเล่นจริงตรงกลาง (ไม่ใช่แถบทึบ)
// ทุกขั้นเป็น drawImage บนการ์ดจอ ไม่อ่านพิกเซลกลับ (ไม่หน่วง)
// หน้าแรกไม่ใช้ตัวนี้ — ฉากอาณาจักรวาดฟ้า/พื้นต่อเองได้จริง (drawKingdom extTop/extBottom)
// ─────────────────────────────────────────────────────────────

const BLUR_W = 40;      // ความละเอียดแนวนอนของสีที่ต่อ (ยิ่งน้อยยิ่งเบลอ)
const SEAM = 46;        // ความสูง (หน่วยฉาก) ช่วงที่แถวขอบจริงค่อย ๆ จางเข้าสีเบลอ
let tiny = null, seam = null;

function ensure(w, h) {
  if (!tiny) {
    tiny = document.createElement('canvas').getContext('2d');
    tiny.canvas.width = BLUR_W;
    tiny.canvas.height = 1;
    seam = document.createElement('canvas').getContext('2d');
  }
  if (seam.canvas.width !== w || seam.canvas.height !== h) {
    seam.canvas.width = w;
    seam.canvas.height = h;
  }
}

/**
 * ระยะต่อบน-ล่างของเฟรมนี้ (หน่วยฉาก) — 0 ทั้งคู่ = จอปกติ ไม่ต้องทำอะไร
 */
export function coverExt(ctx) {
  const c = ctx.canvas.cover;
  return c ? { top: c.extTop || 0, bottom: c.extBottom || 0 } : { top: 0, bottom: 0 };
}

/**
 * ทาสี่เหลี่ยมคลุมทั้งจอจริง (รวมส่วนต่อ) ในพิกัดฉาก — ใช้แทน fillRect(0, 0, W, H) ของแสงวาบ/แฟลช
 */
export function fillFullView(ctx, W, H) {
  const e = coverExt(ctx);
  ctx.fillRect(0, -e.top, W, H + e.top + e.bottom);
}

function extendBand(ctx, cv, rowY, dir, len, dim, seamPx) {
  // rowY = แถวขอบในพิกเซลจริง · dir = -1 ต่อขึ้นบน / +1 ต่อลงล่าง · len = ความสูงพิกเซลจริงที่ต้องเติม
  const W = cv.width;
  const y0 = dir < 0 ? rowY - len : rowY + 1;
  // 1) สีเบลอเต็มพื้นที่ (เอา 6 แถวใกล้ขอบมาเฉลี่ย)
  const sy = dir < 0 ? rowY : Math.max(0, rowY - 5);
  tiny.imageSmoothingEnabled = true;
  tiny.imageSmoothingQuality = 'high';
  tiny.clearRect(0, 0, BLUR_W, 1);
  tiny.drawImage(cv, 0, sy, W, 6, 0, 0, BLUR_W, 1);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tiny.canvas, 0, 0, BLUR_W, 1, 0, y0, W, len);
  // 2) แถวขอบจริงยืดออก แล้วจางลงตามระยะ (ไล่ความทึบด้วย destination-in)
  const sh = Math.min(len, seamPx);
  if (sh > 1) {
    ensure(W, Math.ceil(sh));
    seam.globalCompositeOperation = 'source-over';
    seam.clearRect(0, 0, W, seam.canvas.height);
    seam.drawImage(cv, 0, rowY, W, 1, 0, 0, W, sh);
    seam.globalCompositeOperation = 'destination-in';
    const g = seam.createLinearGradient(0, 0, 0, sh);
    // แถวที่อยู่ติดฉากทึบเต็ม แล้วจางออกไปทางขอบจอ
    if (dir < 0) { g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); }
    else { g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); }
    seam.fillStyle = g;
    seam.fillRect(0, 0, W, sh);
    ctx.drawImage(seam.canvas, 0, 0, W, sh, 0, dir < 0 ? rowY - sh : rowY + 1, W, sh);
  }
  // 3) ไล่มืดเข้าหาขอบจอ
  if (dim > 0) {
    const g = ctx.createLinearGradient(0, dir < 0 ? rowY : rowY + 1, 0, dir < 0 ? rowY - len : rowY + 1 + len);
    g.addColorStop(0, 'rgba(10,4,20,0)');
    g.addColorStop(1, `rgba(10,4,20,${dim})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, W, len);
  }
}

/**
 * เติมส่วนต่อบน-ล่างของเฟรมนี้ — เรียกหลังวาดฉากเสร็จ ก่อน HUD/แสงฟุ้ง
 * @param opts.dimTop / opts.dimBottom ความมืดที่ขอบจอ (0..1)
 */
export function fillCoverExt(ctx, { dimTop = 0.12, dimBottom = 0.22 } = {}) {
  const e = coverExt(ctx);
  if (e.top <= 0 && e.bottom <= 0) return;
  const cv = ctx.canvas;
  const m = ctx.getTransform();
  const k = Math.hypot(m.a, m.b) || 1;
  const top = Math.round(m.f);                      // แถวพิกเซลของขอบบนฉาก (y = 0)
  const bot = Math.round(m.f + m.d * 420) - 1;      // แถวพิกเซลของขอบล่างฉาก (y = 420)
  ensure(cv.width, 1);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  if (top > 0) extendBand(ctx, cv, top, -1, top, dimTop, SEAM * k);
  if (bot < cv.height - 1) extendBand(ctx, cv, bot, 1, cv.height - 1 - bot, dimBottom, SEAM * k);
  ctx.restore();
}
