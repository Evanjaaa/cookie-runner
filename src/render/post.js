// src/render/post.js
// ─────────────────────────────────────────────────────────────
// เอฟเฟกต์หลังวาดฉากเสร็จ (post-processing) — ทำงานกับ "ภาพทั้งเฟรม"
// ไม่ใช่กับวัตถุทีละชิ้น จึงเปลี่ยนอารมณ์ภาพทั้งเกมได้จากที่เดียว
//
// เรียกหลังวาดฉากแต่ก่อนวาด HUD เสมอ — ถ้าเรียกทีหลัง ตัวเลขคะแนน
// จะฟุ้งจนอ่านไม่ออก ซึ่งแลกไม่คุ้มกับความสวยที่ได้
// ─────────────────────────────────────────────────────────────
import { VIEW, POST } from '../config.js';

const { W, H } = VIEW;

let buf = null;
let bufCtx = null;
let vignette = null;

/**
 * บัฟเฟอร์ย่อส่วนสำหรับเบลอ
 *
 * ย่อก่อนเบลอไม่ใช่แค่เรื่องความเร็ว — การย่อแล้วขยายกลับด้วยการ
 * ปรับเรียบภาพก็เป็นการเบลอในตัวอยู่แล้ว เบราว์เซอร์ที่ไม่รองรับ
 * ctx.filter จึงยังได้แสงฟุ้งอยู่ แค่ขอบแข็งกว่านิดหน่อย
 */
function buffer() {
  if (!buf) {
    buf = document.createElement('canvas');
    buf.width = Math.max(1, Math.round(W / POST.bloomScale));
    buf.height = Math.max(1, Math.round(H / POST.bloomScale));
    bufCtx = buf.getContext('2d');
  }
  return buf;
}

/**
 * แสงฟุ้ง — ย่อภาพทั้งเฟรม เบลอ แล้วซ้อนกลับแบบบวกสี
 *
 * ที่ใช้ 'lighter' เพราะมันบวกค่าสีตรง ๆ จุดสว่างอยู่แล้ว (ปลา เจลลี่
 * ประกายชุดระดับสูง) จึงเรืองออกมานอกขอบตัวเอง ส่วนพื้นหลังมืดแทบไม่ขยับ
 * เลยได้แสงฟุ้งเฉพาะที่ควรฟุ้งโดยไม่ต้องแยกวาดของสว่างเป็นชั้นต่างหาก
 */
function bloom(ctx) {
  const b = buffer();

  bufCtx.setTransform(1, 0, 0, 1, 0, 0);
  bufCtx.clearRect(0, 0, b.width, b.height);
  bufCtx.filter = `blur(${POST.bloomBlur}px)`;
  bufCtx.drawImage(ctx.canvas, 0, 0, b.width, b.height);
  bufCtx.filter = 'none';

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = POST.bloomStrength;
  ctx.drawImage(b, 0, 0, W, H);
  ctx.restore();
}

/** ขอบจอมืดลง ดึงสายตาเข้ากลางจอที่ตัวละครกับของกินอยู่ */
function darkenEdges(ctx) {
  if (!vignette) {
    const g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.36, W / 2, H * 0.5, H * 0.98);
    g.addColorStop(0, 'rgba(6,2,14,0)');
    g.addColorStop(0.6, `rgba(6,2,14,${POST.vignette * 0.3})`);
    g.addColorStop(1, `rgba(6,2,14,${POST.vignette})`);
    vignette = g;
  }
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.edges] false = ไม่ต้องหรี่ขอบ
 *
 * ตอนเล่นจริงขอบมืดช่วยดึงสายตาเข้ากลางจอที่ตัวละครวิ่งอยู่
 * แต่หน้าแรกเป็นภาพวาดเต็มกรอบ ปราสาทกับกำแพงอยู่ริมสองข้างพอดี
 * หรี่ขอบตรงนั้นเลยกลายเป็นคราบดำฟุ้ง ๆ ทับรูป ไม่ได้ช่วยอะไร
 */
export function postProcess(ctx, { edges = true } = {}) {
  if (!POST.on) return;
  if (POST.bloomStrength > 0) bloom(ctx);
  if (edges && POST.vignette > 0) darkenEdges(ctx);
}
