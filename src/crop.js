// src/crop.js
// ─────────────────────────────────────────────────────────────
// ครอบตัดรูปแบบ "ปูเต็มกรอบ + เลื่อน + ซูม" — ใช้ร่วมกันทั้งหลังบ้าน (ลากจัดรูป) และในเกม (วาดจริง)
// สูตรเดียวกันทุกที่ ภาพในเกมจึงตรงกับที่แอดมินจัดไว้ทุกพิกเซล
//
// crop = { x, y, z }
//   x, y  0..1  ตำแหน่งรูปในกรอบแบบ object-position (0 = ชิดซ้าย/บน · 0.5 = กลาง · 1 = ชิดขวา/ล่าง)
//   z     ≥ 1   ซูมเพิ่มจากขนาดที่ปูเต็มกรอบพอดี
//
// เท่ากับ CSS: object-fit:cover; object-position:x% y%; transform:scale(z); transform-origin:x% y%
// → กรอบสัดส่วนไหนก็ได้ (ป้ายตู้กาช่า iPad 1.75 · มือถือ 1.6 · ข่าว 2.6) จุดที่เลือกยังอยู่ในกรอบเหมือนกัน
// ─────────────────────────────────────────────────────────────

export const CROP0 = Object.freeze({ x: 0.5, y: 0.5, z: 1 });
export const CROP_ZMAX = 4;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** ค่าครอบตัดที่ใช้ได้เสมอ (ข้อมูลเก่า/เสีย = กลางรูป ไม่ซูม) */
export function normCrop(c) {
  const n = (v, d) => (Number.isFinite(+v) && v !== null && v !== '' ? +v : d);
  const r4 = (v) => Math.round(v * 1e4) / 1e4;   // เก็บแค่ทศนิยม 4 ตำแหน่ง (ละเอียดพอ ข้อมูลสั้น)
  return {
    x: r4(clamp(n(c?.x, 0.5), 0, 1)),
    y: r4(clamp(n(c?.y, 0.5), 0, 1)),
    z: r4(clamp(n(c?.z, 1), 1, CROP_ZMAX)),
  };
}

/** กรอบวาดรูปขนาด iw×ih ลงพื้นที่ W×H ตามค่าครอบตัด → { x, y, w, h } (ใช้กับ drawImage) */
export function cropRect(iw, ih, W, H, crop) {
  const c = normCrop(crop);
  const k = Math.max(W / iw, H / ih) * c.z;
  const w = iw * k, h = ih * k;
  return { x: (W - w) * c.x, y: (H - h) * c.y, w, h };
}

/** สไตล์ของ <img> ในกรอบ overflow:hidden ที่ได้ภาพเดียวกับ cropRect */
export function cropStyle(crop) {
  const c = normCrop(crop);
  const p = `${(c.x * 100).toFixed(2)}% ${(c.y * 100).toFixed(2)}%`;
  return `width:100%;height:100%;object-fit:cover;object-position:${p};transform:scale(${c.z.toFixed(3)});transform-origin:${p}`;
}
