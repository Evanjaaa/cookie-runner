// src/render/dreambg.js
//
// ══ พื้นหลัง "โลกแห่งความฝัน" ของหน้าคลังน้อง ═══════════════════════
//
// วาดด้วย Canvas 2D ล้วน ไม่มีไฟล์ภาพ — ไล่สีลาเวนเดอร์ เมฆปุย ดาว รอยเท้า หัวใจ ละอองลอย
// ใช้กับคลังน้องทั้งสามหมวด (น้องแมว / ชุดแมว / สมบัติ) — main.js เป็นคนเปิดปิด หน้าอื่นไม่มีอะไรเปลี่ยน
//
// ── หลักของภาพ ──
//   ของตกแต่งทั้งหมดอยู่ริมขอบกับมุมล่าง ตรงกลางโล่งไว้ให้ตัวน้องกับการ์ด
//   โปร่งใสต่ำ ทรงกลมมน ไม่มีรายละเอียด — เป็น "พื้นหลังเกม" ไม่ใช่ภาพประกอบ
//
// ── ทำไมแบ่งสองชั้น ──
//   ชั้นนิ่ง (ไล่สี แสงฟุ้ง เมฆไกล รอยเท้า หัวใจ เงาแมว) วาดครั้งเดียวลงผ้าใบสำรอง
//   ทุกเฟรมแค่แปะภาพนั้น แล้ววาดของที่ขยับ (เมฆลอย ดาวกะพริบ ละออง) ทับ
//   ไล่สีกับแสงฟุ้งขนาดเต็มจอเป็นงานแพงที่สุด ถ้าวาดใหม่ทุกเฟรมมือถือจะร้อนเปล่า ๆ
//
// ── ตำแหน่งเป็นสัดส่วน 0..1 ของผ้าใบ ──
//   ผ้าใบยืดตามการ์ด (จอคอม/มือถือ/แท็บเล็ต) ของทุกชิ้นจึงตามไปอยู่ที่เดิมเสมอ
//   ขนาดของชิ้นคูณ u (ด้านสั้นของผ้าใบ / 400) ไม่ยืดเป็นวงรีตามสัดส่วนจอ

const TAU = Math.PI * 2;
const FRAME_MS = 1000 / 30;     // 30 fps พอสำหรับของที่ขยับช้า ๆ — ประหยัดแบตกว่าครึ่ง

// ── สี ── ม่วงเป็นหลัก แต้มสีพาสเทลเล่นสีให้ทั้งฉาก (สีที่ผู้ใช้เลือก):
//   ชมพู #F7C7E8 · ชมพูพีช #F1B4B1 · เหลืองเนย #FEE0AF — ครีม/มิ้นต์เป็นแค่แต้มเล็ก
// พื้นเข้มกว่าลาเวนเดอร์อ่อนหนึ่งขั้น — ตัวหนังสือสีครีมทั้งหน้ายังต้องอ่านออกบนพื้นนี้
const SKY = ['#B48FE8', '#9A6AD8', '#7C4CC0'];
const ROSE = '247,199,232';     // #F7C7E8
const PEACH = '241,180,177';    // #F1B4B1
const BUTTER = '254,224,175';   // #FEE0AF
const PINK = ROSE;
const CREAM = '255,246,232';
const MINT = '176,240,226';
const SUN = BUTTER;

/** สุ่มแบบกำหนดผลได้ — ทุกครั้งที่เปิดหน้า ของอยู่ที่เดิม ไม่กระโดดไปมาทุกการปรับขนาดจอ */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────
// ชิ้นส่วนพื้นฐาน
// ─────────────────────────────────────────────────────────────

/**
 * เมฆหนึ่งก้อน = ฐานแบนมน + พุงกลมสามสี่ลูกเรียงขึ้นไป (สัดส่วนต่อความกว้าง 1)
 * ears = ใส่หูแมวสองข้างซ่อนบนยอดเมฆ (ของเล่นเล็ก ๆ ให้คนที่สังเกตเห็น)
 */
export function createCloud(rand, { ears = false } = {}) {
  const n = 3 + Math.floor(rand() * 2);
  const puffs = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    puffs.push({
      x: -0.32 + t * 0.64 + (rand() - 0.5) * 0.06,
      y: -0.1 - Math.sin(t * Math.PI) * 0.16 - rand() * 0.04,
      r: 0.17 + Math.sin(t * Math.PI) * 0.1 + rand() * 0.04,
    });
  }
  return { puffs, ears };
}

/** วาดเมฆที่ (x, y) กว้าง w — ไล่สีขาวลงลาเวนเดอร์จาง ๆ ขอบล่างเรียบ */
export function drawCloud(ctx, cloud, x, y, w, alpha, tint = CREAM) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, y - w * 0.4, 0, y + w * 0.12);
  g.addColorStop(0, `rgba(${tint},1)`);
  g.addColorStop(1, 'rgba(230,214,255,0.86)');
  ctx.fillStyle = g;
  ctx.beginPath();
  // ฐาน: แคปซูลแบน ตัวที่ทำให้ก้นเมฆเรียบแบบเมฆการ์ตูน
  const bw = w * 0.82, bh = w * 0.2;
  ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, bh / 2);
  for (const p of cloud.puffs) {
    ctx.moveTo(x + p.x * w + p.r * w, y + p.y * w);
    ctx.arc(x + p.x * w, y + p.y * w, p.r * w, 0, TAU);
  }
  if (cloud.ears) {
    // หูแมวบนลูกที่สูงที่สุด — สามเหลี่ยมมนสองอัน
    const top = cloud.puffs.reduce((a, b) => (a.y - a.r < b.y - b.r ? a : b));
    const cx = x + top.x * w, cy = y + (top.y - top.r * 0.78) * w, s = top.r * w;
    for (const side of [-1, 1]) {
      ctx.moveTo(cx + side * s * 0.62, cy + s * 0.2);
      ctx.quadraticCurveTo(cx + side * s * 0.6, cy - s * 0.55, cx + side * s * 0.3, cy - s * 0.42);
      ctx.quadraticCurveTo(cx + side * s * 0.12, cy - s * 0.1, cx + side * s * 0.18, cy + s * 0.2);
    }
  }
  ctx.fill();
  ctx.restore();
}

/** ดาวสี่แฉกเว้าโค้ง — ทรงประกายแบบเกมน่ารัก ไม่ใช่ดาวห้าแฉกแข็ง ๆ */
export function drawStar(ctx, x, y, r, alpha, color = CREAM) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

/** รอยเท้าแมว — อุ้งใหญ่หนึ่ง นิ้วสี่ */
export function drawPawPrint(ctx, x, y, r, rot, alpha, color = CREAM) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.35, r * 0.62, r * 0.5, 0, 0, TAU);
  for (const [dx, dy, s] of [[-0.68, -0.22, 0.24], [-0.24, -0.62, 0.26], [0.24, -0.62, 0.26], [0.68, -0.22, 0.24]]) {
    ctx.moveTo(dx * r + s * r, dy * r);
    ctx.ellipse(dx * r, dy * r, s * r, s * r * 1.2, 0, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

/** หัวใจกลมมน */
export function drawHeart(ctx, x, y, r, alpha, color = PINK) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.3, y + r * 0.1, x - r * 0.9, y - r * 1.05, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 1.05, x + r * 1.3, y + r * 0.1, x, y + r * 0.9);
  ctx.fill();
  ctx.restore();
}

/** แสงฟุ้งวงกลม — จางจากกลางออกไปหมดที่ขอบ */
export function drawGlow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color},${alpha})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** เงาหัวแมวตัวจิ๋ว (หัวกลม + หูสองข้าง) — ตกแต่งไกล ๆ จางมาก */
function drawCatHead(ctx, x, y, r, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${CREAM})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  for (const side of [-1, 1]) {
    ctx.moveTo(x + side * r * 0.92, y - r * 0.2);
    ctx.lineTo(x + side * r * 0.82, y - r * 1.25);
    ctx.lineTo(x + side * r * 0.25, y - r * 0.82);
  }
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ฉาก
// ─────────────────────────────────────────────────────────────

/** วางของทั้งฉากครั้งเดียว (สัดส่วน 0..1) — เรียงจากไกลไปใกล้ */
function layout() {
  const rand = seeded(20261004);
  const L = {};
  // เมฆไกล: ใหญ่ จางมาก ชิดขอบบน (นิ่ง)
  L.far = [
    { x: 0.08, y: 0.12, w: 0.28, a: 0.16, t: BUTTER, c: createCloud(rand) },
    { x: 0.92, y: 0.09, w: 0.26, a: 0.15, t: ROSE, c: createCloud(rand, { ears: true }) },
    { x: 0.52, y: 0.04, w: 0.26, a: 0.09, c: createCloud(rand) },
  ];
  // เมฆกลาง: ลอยช้า ๆ ไปทางขวา วนกลับ (ขยับ)
  L.mid = [
    { x: 0.18, y: 0.3, w: 0.2, a: 0.22, v: 0.0045, t: ROSE, c: createCloud(rand) },
    { x: 0.74, y: 0.24, w: 0.17, a: 0.2, v: 0.0035, t: BUTTER, c: createCloud(rand) },
    { x: 0.46, y: 0.17, w: 0.12, a: 0.12, v: 0.0055, c: createCloud(rand, { ears: true }) },
  ];
  // เมฆใกล้: มุมล่างสองข้าง ล้นขอบจอ แกว่งเบา ๆ (แทบนิ่ง)
  // แค่ "โผล่" ที่มุม — ใหญ่กว่านี้จะลามขึ้นมาหลังการ์ดน้องจนตรงกลางไม่โล่ง
  L.near = [
    { x: 0.0, y: 1.04, w: 0.34, a: 0.46, t: ROSE, c: createCloud(rand) },
    { x: 0.15, y: 1.08, w: 0.22, a: 0.34, t: CREAM, c: createCloud(rand) },
    { x: 1.0, y: 1.04, w: 0.32, a: 0.46, t: PEACH, c: createCloud(rand, { ears: true }) },
    { x: 0.85, y: 1.09, w: 0.2, a: 0.32, t: ROSE, c: createCloud(rand) },
  ];
  // รอยเท้า: เดินเป็นแนวจาง ๆ ในที่ว่าง (นิ่ง)
  L.paws = [
    [0.05, 0.5, -0.5], [0.08, 0.6, -0.35], [0.05, 0.7, -0.5],
    [0.93, 0.42, 0.4], [0.96, 0.53, 0.55], [0.93, 0.64, 0.4],
    [0.36, 0.95, 0.2], [0.64, 0.93, -0.2],
  ];
  L.hearts = [[0.15, 0.82, 0.9], [0.86, 0.78, 1], [0.6, 0.12, 0.7], [0.3, 0.07, 0.6]];
  L.cats = [[0.24, 0.92], [0.72, 0.9]];
  // ดาว: น้อยและกระจายห่าง กะพริบคนละจังหวะ
  L.stars = Array.from({ length: 11 }, (_, i) => {
    const edge = i % 2 === 0;
    return {
      x: edge ? (rand() < 0.5 ? 0.02 + rand() * 0.14 : 0.84 + rand() * 0.14) : 0.2 + rand() * 0.6,
      y: edge ? 0.08 + rand() * 0.7 : 0.03 + rand() * 0.16,
      r: 3 + rand() * 4,
      ph: rand() * TAU,
      sp: 0.6 + rand() * 0.8,
      col: i % 4 === 0 ? SUN : i % 5 === 0 ? MINT : CREAM,
    };
  });
  // ละออง: จุดเล็กลอยขึ้นช้า ๆ วนจากล่างขึ้นบน
  L.motes = Array.from({ length: 14 }, (_, i) => ({
    x: rand(),
    y: rand(),
    r: 1 + rand() * 1.8,
    v: 0.006 + rand() * 0.01,
    sw: rand() * TAU,
    col: i % 3 === 0 ? ROSE : i % 4 === 0 ? BUTTER : i % 5 === 0 ? PEACH : CREAM,
  }));
  return L;
}

/** ชั้นนิ่ง: ไล่สี แสงฟุ้ง เมฆไกล รอยเท้า หัวใจ เงาแมว */
export function drawBackground(ctx, w, h, L) {
  const u = Math.min(w, h) / 400;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, SKY[0]);
  g.addColorStop(0.5, SKY[1]);
  g.addColorStop(1, SKY[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // แสงฟุ้ง = ตัวเล่นสีของฉาก: ชมพูมุมขวาบน เหลืองเนยมุมซ้ายบน พีชมุมขวาล่าง
  // ชมพูอีกก้อนริมซ้าย เหลืองจาง ๆ ใต้กลางจอ ครีมหลังช่องโชว์ มิ้นต์แต้มเล็กมุมซ้ายล่าง
  const R = Math.max(w, h);
  drawGlow(ctx, w * 0.86, h * 0.06, R * 0.46, ROSE, 0.55);
  drawGlow(ctx, w * 0.1, h * 0.06, R * 0.32, BUTTER, 0.34);   // เหลืองแค่แต้มอุ่น ๆ (ผู้ใช้ขอให้ลดลง)
  drawGlow(ctx, w * 0.95, h * 0.95, R * 0.36, PEACH, 0.44);
  drawGlow(ctx, w * 0.02, h * 0.55, R * 0.26, ROSE, 0.3);
  drawGlow(ctx, w * 0.55, h * 1.02, R * 0.28, BUTTER, 0.18);
  drawGlow(ctx, w * 0.36, h * 0.5, R * 0.36, CREAM, 0.14);
  drawGlow(ctx, w * 0.12, h * 0.98, R * 0.2, MINT, 0.12);
  for (const c of L.far) drawCloud(ctx, c.c, c.x * w, c.y * h, c.w * w, c.a, c.t);
  for (const [x, y, rot] of L.paws) drawPawPrint(ctx, x * w, y * h, 7 * u, rot, 0.09);
  for (const [x, y, s] of L.hearts) drawHeart(ctx, x * w, y * h, 5 * u * s, 0.16);
  for (const [x, y] of L.cats) drawCatHead(ctx, x * w, y * h, 7 * u, 0.07);
}

/** ละอองลอยขึ้น — t เป็นวินาที */
export function drawFloatingParticles(ctx, w, h, L, t) {
  const u = Math.min(w, h) / 400;
  for (const m of L.motes) {
    const y = 1.05 - ((m.y + t * m.v) % 1.1);
    const x = m.x + Math.sin(t * 0.5 + m.sw) * 0.01;
    // จางเข้าตอนโผล่จากล่าง จางออกตอนใกล้ขอบบน
    const a = 0.32 * Math.min(1, (1.05 - y) * 6) * Math.min(1, y * 4);
    if (a <= 0.01) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = `rgb(${m.col})`;
    ctx.beginPath();
    ctx.arc(x * w, y * h, m.r * u, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** ของที่ขยับ: เมฆกลางลอย ดาวกะพริบ ละออง เมฆใกล้แกว่ง */
function drawLive(ctx, w, h, L, t) {
  const u = Math.min(w, h) / 400;
  for (const c of L.mid) {
    // ลอยออกขอบขวาแล้ววนกลับมาจากซ้าย (เผื่อความกว้างเมฆไว้ไม่ให้โผล่/หายกลางจอ)
    const span = 1 + c.w * 1.2;
    const x = ((c.x + t * c.v + c.w * 0.6) % span) - c.w * 0.6;
    drawCloud(ctx, c.c, x * w, c.y * h, c.w * w, c.a, c.t);
  }
  for (const s of L.stars) {
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    drawStar(ctx, s.x * w, s.y * h, s.r * u * (0.8 + tw * 0.25), 0.18 + tw * 0.36, s.col);
  }
  drawFloatingParticles(ctx, w, h, L, t);
  for (const [i, c] of L.near.entries()) {
    const sway = Math.sin(t * 0.25 + i * 1.7) * 0.004;
    drawCloud(ctx, c.c, (c.x + sway) * w, c.y * h, c.w * w, c.a, c.t);
  }
}

// ─────────────────────────────────────────────────────────────
// ตัวคุม: ปรับขนาดตามการ์ด เปิด/ปิดลูป
// ─────────────────────────────────────────────────────────────

/**
 * ตัวคุมผ้าใบพื้นหลังที่ใช้ร่วมกันทุกหน้า (คลังน้อง / หน้าสกิล ...)
 * scene = { layout(), still(ctx, w, h, L), live(ctx, w, h, L, t) }
 *   layout  วางของทั้งฉากครั้งเดียว (สัดส่วน 0..1)
 *   still   ชั้นนิ่ง — วาดครั้งเดียวต่อขนาดผ้าใบ เก็บไว้ในผ้าใบสำรอง
 *   live    ของที่ขยับ — วาดทับทุกเฟรม (t = วินาที, ลดการเคลื่อนไหว = 0 ตลอด)
 * isActive() = ตอนนี้ควรวาดอยู่ไหม — ลูปถามเองทุกเฟรมแล้วหยุดเอง
 * คืน { kick } ให้เรียกตอนเพิ่งเปิดหน้า/สลับหมวด เพื่อปลุกลูปขึ้นมาใหม่
 */
export function makeCanvasBg(canvas, isActive, scene) {
  const L = scene.layout();
  const ctx = canvas.getContext('2d');
  const still = document.createElement('canvas');
  const sctx = still.getContext('2d');
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  let w = 0, h = 0, dpr = 1;
  let raf = 0, last = 0;
  const t0 = performance.now();

  function resize() {
    // ── ขนาดตามเลย์เอาต์ (offset*) ไม่ใช่ขนาดที่ตาเห็น (getBoundingClientRect) ──
    // ตอนเปิดหน้า การ์ดใหญ่เด้งเข้า (ย่อ 0.93 → ขยาย 1) getBoundingClientRect ได้ขนาด "ระหว่างแอนิเมชัน"
    // ผ้าใบเลยถูกตั้งขนาดใหม่ 5 ครั้งใน 0.3 วิ (1078 → 1125 → 1147 → 1156 → 1159 วัดแล้ว)
    // ทุกครั้งต้องจองบัฟเฟอร์ใหม่ + วาดชั้นนิ่งใหม่ + ของตกแต่งเปลี่ยนขนาดตาม = ภาพเด้ง/กระตุกตอนเข้าหน้า
    // offset* ไม่สนแอนิเมชัน — ตั้งขนาดครั้งเดียวที่ขนาดจริง แล้วการ์ดค่อยย่อขยายภาพนั้นไปลื่น ๆ
    const cssW = canvas.offsetWidth, cssH = canvas.offsetHeight;
    if (!cssW || !cssH) return false;
    // มือถือจอคมมาก (dpr 3) ไม่ต้องวาดเต็มความคม — พื้นหลังฟุ้ง ๆ ไม่มีเส้นคมให้เสีย
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cw = Math.round(cssW * dpr), ch = Math.round(cssH * dpr);
    if (cw === canvas.width && ch === canvas.height && w) return true;
    canvas.width = still.width = cw;
    canvas.height = still.height = ch;
    w = cssW; h = cssH;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scene.still(sctx, w, h, L);
    return true;
  }

  // ── พื้นหลังเป็นภาพนิ่ง (ผู้ใช้ขอ — ลดภาระเครื่อง เหลือฉากขยับแค่หน้าแรก) ──
  // ตอนเปิดหน้ายังขยับสั้น ๆ SETTLE_MS ให้แสงจางเข้าพร้อมการ์ด (trackRect) แล้วหยุดค้างเป็นภาพนิ่ง
  // วาดใหม่สั้น ๆ เฉพาะตอนที่ของจริงขยับ: เลื่อนรายการ / กดในการ์ด (สลับแท็บ) / เนื้อหาโหลดเพิ่ม / เปลี่ยนขนาด
  const SETTLE_MS = 900;
  let liveUntil = 0;
  // ระหว่างเลื่อนรายการ วาดทุกเฟรมจอ — แสงที่เกาะการ์ดต้องตามนิ้วที่ 60 ไม่งั้นกระตุก = เห็นเป็นกะพริบ
  let fastUntil = 0;
  const host = canvas.parentElement;
  host?.addEventListener('scroll', () => {
    fastUntil = performance.now() + 300;
    scene.onScroll?.();
    wake(300);
  }, { capture: true, passive: true });
  host?.addEventListener('click', () => wake(SETTLE_MS), true);
  // รายการที่มาทีหลัง (อันดับ ข่าว จดหมาย) — วาดใหม่ให้แสง/เขตหลบตามของที่เพิ่งโผล่
  if (host && window.MutationObserver) {
    new MutationObserver(() => wake(500)).observe(host, { childList: true, subtree: true });
  }

  function wake(ms) {
    if (!isActive()) return;
    const now = performance.now();
    liveUntil = Math.max(liveUntil, now + ms);
    if (calm.matches) { paint(now); return; }
    if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  }

  function frame(now) {
    if (!isActive()) { raf = 0; return; }
    // หมดช่วงขยับ = วาดเฟรมสุดท้ายแล้วหยุดลูป (ผ้าใบค้างภาพนั้นไว้เอง)
    if (now >= liveUntil) { raf = 0; paint(now); return; }
    raf = requestAnimationFrame(frame);
    if (now < fastUntil) { last = now; paint(now); return; }
    if (now - last < FRAME_MS) return;
    last = now;
    paint(now);
  }

  function paint(now) {
    if (!resize()) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(still, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scene.live(ctx, w, h, L, calm.matches ? 0 : (now - t0) / 1000);
  }

  function kick() {
    if (!isActive()) return;
    if (calm.matches) { paint(performance.now()); return; }   // ลดการเคลื่อนไหว = ภาพนิ่งภาพเดียว
    liveUntil = Math.max(liveUntil, performance.now() + SETTLE_MS);
    if (!raf) {
      // วาดเฟรมแรกทันทีตอนแผงเพิ่งเปิด (ตัวเฝ้าคลาสเรียกก่อนเบราว์เซอร์วาดจอ) — ไม่งั้นเฟรมแรก
      // ผ้าใบยังว่าง เห็นพื้นสีเรียบของการ์ดแวบหนึ่งก่อนพื้นหลังโผล่ (เปิดหน้านั้นครั้งแรก)
      last = performance.now();
      paint(last);
      raf = requestAnimationFrame(frame);
    }
  }

  // การ์ดเปลี่ยนขนาด (หมุนจอ/ปรับหน้าต่าง) = วาดชั้นนิ่งใหม่ แล้ววาดเฟรมทันทีไม่รอรอบถัดไป
  if (window.ResizeObserver) new ResizeObserver(() => { if (isActive()) { paint(performance.now()); wake(SETTLE_MS); } }).observe(canvas);
  return { kick };
}

/** พื้นหลังโลกพาสเทลของคลังน้อง */
export function makeDreamBg(canvas, isActive) {
  return makeCanvasBg(canvas, isActive, { layout, still: drawBackground, live: drawLive });
}
