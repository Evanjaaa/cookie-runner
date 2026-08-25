// src/render/palette.js
// ─────────────────────────────────────────────────────────────
// ผสมจานสีสองด่านเข้าด้วยกัน ใช้ตอนเปลี่ยนฉากกลางตา
//
// จานสีในด่านเก็บเป็น "สตริง" (#1B0F2B หรือ rgba(255,166,87,.42)) ซึ่งบวกลบ
// กันตรง ๆ ไม่ได้ ต้องแกะเป็นตัวเลขก่อนแล้วค่อยประกอบกลับ
//
// ทำไมไม่ใช้ CSS transition แทน: ฉากทั้งหมดวาดบน canvas ไม่ใช่ DOM
// เบราว์เซอร์จึงไม่มีอะไรให้ไล่สีให้ ต้องคำนวณสีของแต่ละเฟรมเอง
// ─────────────────────────────────────────────────────────────

/** แกะสีเป็น [r, g, b, a] — รับทั้ง #RGB, #RRGGBB และ rgba(...) */
function parse(c) {
  if (c[0] === '#') {
    const hex = c.slice(1);
    // #RGB ย่อ — ขยายเป็นคู่ก่อน (#8AF → #88AAFF)
    const full = hex.length === 3 ? hex.replace(/./g, (d) => d + d) : hex;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  // rgb(...) / rgba(...) — ตัวเลขคั่นด้วยจุลภาคหรือช่องว่าง
  const p = c.match(/-?[\d.]+/g) || [0, 0, 0, 1];
  return [+p[0] || 0, +p[1] || 0, +p[2] || 0, p[3] === undefined ? 1 : +p[3]];
}

const lerp = (a, b, t) => a + (b - a) * t;

/** ผสมสีเดียว คืนเป็น rgba() เสมอ เพราะจานสีมีทั้งชนิดทึบและโปร่ง */
function mixColor(a, b, t) {
  const A = parse(a);
  const B = parse(b);
  return `rgba(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},`
    + `${Math.round(lerp(A[2], B[2], t))},${(lerp(A[3], B[3], t)).toFixed(3)})`;
}

/**
 * ผสมทั้งจานสี t=0 คือจานสี a เต็ม ๆ / t=1 คือ b เต็ม ๆ
 *
 * เดินตามคีย์ของ a เป็นหลัก และรองรับค่าที่เป็นอาเรย์ (sky กับ hills เก็บสามสี)
 * คีย์ไหนที่ b ไม่มี ให้คงของ a ไว้ — ด่านใหม่จะได้ไม่ต้องประกาศครบทุกคีย์
 */
export function mixPalette(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;

  const out = {};
  for (const k of Object.keys(a)) {
    const av = a[k];
    const bv = b[k];
    if (bv === undefined) { out[k] = av; continue; }
    out[k] = Array.isArray(av)
      ? av.map((c, i) => mixColor(c, bv[i] ?? c, t))
      : mixColor(av, bv, t);
  }
  return out;
}
