// src/render/subbg.js
// ─────────────────────────────────────────────────────────────
// พื้นหลังหน้าย่อย (ภาพนิ่ง) — หน้าย่อยที่ยังไม่มีพื้นหลังของตัวเอง (ร้านเหมียว รายละเอียดสมบัติ ตีบวก อ่านจดหมาย
// เรื่องราวน้อง ตั้งชื่อ พัก ยืนยัน ฯลฯ) ได้ "ฟ้าฝันนุ่ม ๆ" ชุดเดียวกับหน้าใหญ่ (src/render/softbg.js) แต่ "ไม่ขยับ"
//
// ── ทำไมเป็นภาพนิ่ง ──
// ผู้ใช้ขอไม่ให้กินแรงเครื่อง: วาดครั้งเดียวตอนแผงเปิด (และตอนเปลี่ยนขนาด) แล้วจบ — ไม่มีลูปเลย
//
// ── หน้าตา ── (ผู้ใช้ 4 พ.ย. 2026: เลิกโปรยลายประจำหน้า — ซองจดหมาย เพชร เหรียญ รอยเท้า — ตามขอบแล้ว)
// ฟ้าลาเวนเดอร์อ่อน + แหล่งแสง/ลำแสงมุมซ้ายบน + แสงฟุ้งสีตามโทน + เมฆมุมล่าง · ชุดลาย (theme) เหลือแค่เลือกโทนสีแสง
// ─────────────────────────────────────────────────────────────
import { paintSoftSky } from './softbg.js';

/** ชุดลายเดิม → โทนแสงของฟ้าฝัน */
const TONE = {
  cat: 'peach',
  mail: 'rose',
  treasure: 'butter',
  forge: 'butter',
  outfit: 'rose',
  stage: 'sky',
  play: 'mint',
  system: 'sky',
  royal: 'butter',
};

/** วาดทั้งผืน (ภาพนิ่ง) ขนาด w×h หน่วย CSS */
export function drawSubBackground(ctx, w, h, themeName = 'cat', seed = 7) {
  paintSoftSky(ctx, w, h, TONE[themeName] || 'peach', seed);
}

/**
 * ติดพื้นหลังภาพนิ่งให้แผงหนึ่ง — ใส่ผ้าใบเป็นลูกคนแรกของ .pop แล้ววาดตอนแผงเปิด/เปลี่ยนขนาดเท่านั้น
 * @param panel  .panel
 * @param theme  ชื่อชุดลาย (ดู THEMES)
 */
export function attachSubBg(panel, theme, seed = 7) {
  const pop = panel.querySelector(':scope > .pop');
  if (!pop || pop.querySelector(':scope > .sub-bg')) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'sub-bg';
  canvas.setAttribute('aria-hidden', 'true');
  pop.prepend(canvas);
  pop.classList.add('has-subbg');
  let drawnW = 0, drawnH = 0;
  const paint = () => {
    if (panel.classList.contains('hidden')) return;
    const w = pop.offsetWidth, h = pop.offsetHeight;
    if (!w || !h || (w === drawnW && h === drawnH)) return;
    drawnW = w;
    drawnH = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSubBackground(ctx, w, h, theme, seed);
  };
  new MutationObserver(paint).observe(panel, { attributes: true, attributeFilter: ['class'] });
  if (window.ResizeObserver) new ResizeObserver(paint).observe(pop);
  paint();
}
