// src/render/outfit-art.js
// ─────────────────────────────────────────────────────────────
// รูปเดิมบนการ์ดชุด (.oc-card — หน้าชุดแมวในคลังน้อง + หน้า "สกินในตู้นี้")
// ใช้ร่วมกับหลังบ้าน (แท็บ "รูปการ์ดชุด") ที่โชว์ภาพเดิมของชุดที่ยังไม่มีรูปอัปโหลด
// ชุดไหนแอดมินอัปโหลดรูปไว้ เกมใช้รูปนั้นแทน (main.js paintOutfitArt · supabase/outfit-cards.sql)
// ─────────────────────────────────────────────────────────────
import { drawCatAuto, cat2Backdrop, drawCat2Backdrop } from './cat2.js';

/** ขนาดรูปบนการ์ด (หน่วย CSS) — สัดส่วนเดียวกับ .oc-art ใน src/style.css (200 / 248) */
export const OC_W = 200, OC_H = 248;

export function drawOutfitArt(c, s, o) {
  const W = OC_W, H = OC_H, feet = H * 0.885, sc = 3.35;
  const high = o.rarity === 'high';
  // drawCatAuto ย่อแบบใหม่ด้วย fit 0.86 — ฉากหลังต้องใช้สเกลเดียวกับตัวน้องที่วาดจริง
  const drawn = cat2Backdrop(o.id) && drawCat2Backdrop(c, W / 2, feet, sc * 0.86, o.id);
  if (!drawn) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, high ? '#FDEBFA' : '#F5EBFF');
    g.addColorStop(1, high ? '#E9C9F6' : '#E4D1F8');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    if (high) {
      // แสงนวลหลังตัว + ประกายเล็ก ๆ ให้ต่างจากห้องธรรมดา
      const r = c.createRadialGradient(W / 2, H * 0.45, 4, W / 2, H * 0.45, W * 0.62);
      r.addColorStop(0, 'rgba(255,255,255,.75)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = r;
      c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.9)';
      for (const [x, y, k] of [[24, 34, 5], [176, 58, 4], [30, 128, 3], [170, 150, 5], [150, 22, 3]]) {
        c.beginPath();
        c.moveTo(x, y - k); c.quadraticCurveTo(x, y, x + k, y); c.quadraticCurveTo(x, y, x, y + k);
        c.quadraticCurveTo(x, y, x - k, y); c.quadraticCurveTo(x, y, x, y - k);
        c.fill();
      }
    }
    // พื้นไม้อ่อนใต้เท้า + เงา (แบบในภาพที่ผู้ใช้วาง)
    const fy = feet - 20;
    const f = c.createLinearGradient(0, fy, 0, H);
    f.addColorStop(0, high ? '#F1D3DF' : '#EAD5BA');
    f.addColorStop(1, high ? '#E2B9CB' : '#DABF9C');
    c.fillStyle = f;
    c.fillRect(0, fy, W, H - fy);
    c.fillStyle = 'rgba(92,60,44,.26)';
    c.beginPath();
    c.ellipse(W / 2, feet - 1, 46, 8, 0, 0, Math.PI * 2);
    c.fill();
  }
  drawCatAuto(c, W / 2, feet, sc, { ...s, outfit: o }, 60);
}
