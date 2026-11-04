// src/render/softbg.js
//
// ══ พื้นหลังหน้าต่าง ๆ แบบ "ฟ้าฝันนุ่ม ๆ" — ชุดเดียวทั้งเกม (ผู้ใช้ 4 พ.ย. 2026) ══════════════
//
// ผู้ใช้: "อยากให้พื้นหลังของแต่ละหน้าเป็นพื้นหลังของมันจริง ๆ ไม่ใช่ของตกแต่งเล่น ๆ แปะลงไป
//         เรียบง่าย สีพื้นไม่เข้มเกิน อ่อนกว่านี้ มีความเล่นแสง ฟีลคล้ายหน้าคลังน้องแมว"
//
// ── หน้าตา ── (ล่าง → บน)
//   ท้องฟ้าลาเวนเดอร์อ่อนกว่าหน้าเดิมหนึ่งขั้น → แหล่งแสงอุ่นมุมซ้ายบน + ลำแสงนุ่มสามเส้นทอดลงมา
//   → แสงฟุ้งหลายสีตามมุม (สีเล่นต่างกันแต่ละหน้า = "โทน") → ฟองแสงกลม ๆ จาง ๆ
//   → เมฆไกลจาง ๆ ด้านบน → หมอกนวลที่ขอบล่าง → เมฆปุยใกล้ ๆ ที่มุมล่างสองข้าง
//   ขยับนิดเดียวตอนเปิดหน้า: ดาวกะพริบ · ละอองลอยขึ้น (ตัวคุมหยุดเป็นภาพนิ่งเองหลังเปิดเสร็จ)
//   ไม่มีไอคอน/รอยเท้า/ซองจดหมาย/ของขวัญโปรยตามขอบแล้ว — เหลือแต่ฟ้า แสง เมฆ
//
// ── โทน ── สีของแสงฟุ้ง/เมฆ แต่ละหน้าไม่ซ้ำกันนิด ๆ ให้รู้ว่าอยู่หน้าไหน แต่ยังเป็นโลกเดียวกัน
//   rose ชมพู-พีช · butter เนย-พีช · sky ฟ้า-ม่วงอ่อน · mint มิ้นต์-ฟ้า · lilac ม่วงอ่อน-ชมพู · peach พีช-เนย
//
// ตำแหน่งทุกชิ้นเป็นสัดส่วน 0..1 ของผ้าใบ (ยืดตามการ์ดทุกจอ) · ขนาดคูณ u = ด้านสั้น / 400
import { makeCanvasBg, createCloud, drawCloud, drawCloudGroup, drawStar, drawGlow } from './dreambg.js';

const TAU = Math.PI * 2;
// อ่อนกว่าหน้าคลังน้อง (#B48FE8 → #7C4CC0) หนึ่งขั้น — ตัวหนังสือขาว/ครีมยังอ่านออก
const SKY = ['#CDAEF3', '#B590E8', '#9E78DC'];
const CREAM = '255,246,232';
const ROSE = '247,199,232';
const PEACH = '241,180,177';
const BUTTER = '254,224,175';
const MINT = '176,240,226';
const SKYBLUE = '186,214,255';
const LILAC = '226,206,255';

/** a = แสงหลัก (มุมขวาบน + เมฆ) · b = แสงรอง (มุมขวาล่าง) · c = แต้มอุ่น (ขอบซ้าย) */
const TONES = {
  rose: { a: ROSE, b: PEACH, c: BUTTER },
  butter: { a: BUTTER, b: PEACH, c: ROSE },
  sky: { a: SKYBLUE, b: LILAC, c: ROSE },
  mint: { a: MINT, b: SKYBLUE, c: BUTTER },
  lilac: { a: LILAC, b: ROSE, c: SKYBLUE },
  peach: { a: PEACH, b: BUTTER, c: ROSE },
};

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** วางของทั้งฉากครั้งเดียว — เมล็ดต่างกันแต่ละหน้า เมฆ/ดาวจึงไม่อยู่ที่เดียวกันทุกหน้า */
function softLayout(tone, seed) {
  const rand = seeded(seed);
  const T = TONES[tone] || TONES.rose;
  const L = { T };
  L.far = [
    { x: 0.1 + rand() * 0.1, y: 0.1, w: 0.26, a: 0.13, t: T.c, c: createCloud(rand) },
    { x: 0.8 + rand() * 0.1, y: 0.07, w: 0.24, a: 0.12, t: T.a, c: createCloud(rand) },
    { x: 0.5, y: 0.03, w: 0.22, a: 0.07, c: createCloud(rand) },
  ];
  // เมฆใกล้: แค่โผล่ที่มุมล่าง ตรงกลางโล่งไว้ให้เนื้อหา (แบบหน้าคลังน้อง)
  // วาดเป็นกองเดียวในชั้นนิ่ง (drawCloudGroup) — ก้อนที่ซ้อนกันไม่เห็นรอยต่อ · ไม่มีหูแมวบนเมฆ (ทรงเรียบกว่า)
  L.near = [
    { x: 0.0, y: 1.05, w: 0.32, a: 0.42, t: T.a, c: createCloud(rand) },
    { x: 0.14, y: 1.09, w: 0.2, a: 0.3, t: CREAM, c: createCloud(rand) },
    { x: 1.0, y: 1.05, w: 0.3, a: 0.42, t: T.b, c: createCloud(rand) },
    { x: 0.86, y: 1.1, w: 0.19, a: 0.28, t: T.a, c: createCloud(rand) },
  ];
  // ฟองแสงกลม ๆ (โบเก้) — ใหญ่ จางมาก กระจายครึ่งบน
  L.orbs = Array.from({ length: 7 }, (_, i) => ({
    x: 0.08 + rand() * 0.84,
    y: 0.06 + rand() * 0.6,
    r: 14 + rand() * 30,
    a: 0.05 + rand() * 0.06,
    col: i % 3 === 0 ? T.a : i % 3 === 1 ? CREAM : T.b,
  }));
  L.stars = Array.from({ length: 9 }, (_, i) => {
    const edge = i % 2 === 0;
    return {
      x: edge ? (rand() < 0.5 ? 0.03 + rand() * 0.12 : 0.85 + rand() * 0.12) : 0.2 + rand() * 0.6,
      y: edge ? 0.1 + rand() * 0.6 : 0.04 + rand() * 0.14,
      r: 2.6 + rand() * 3.4,
      ph: rand() * TAU,
      sp: 0.6 + rand() * 0.8,
      col: i % 3 === 0 ? BUTTER : CREAM,
    };
  });
  L.motes = Array.from({ length: 12 }, (_, i) => ({
    x: rand(),
    y: rand(),
    r: 1 + rand() * 1.6,
    v: 0.006 + rand() * 0.01,
    sw: rand() * TAU,
    col: i % 3 === 0 ? T.a : i % 4 === 0 ? BUTTER : CREAM,
  }));
  return L;
}

/**
 * ลำแสงนุ่มหนึ่งเส้น — ลิ่มบานออกจากแหล่งแสง สว่างที่ต้นแล้วจางหมดที่ปลาย
 * ขอบนุ่มด้วยการซ้อนลิ่มสามชั้น กว้างขึ้นทีละนิดแต่จางลง (ไม่ต้องใช้ ctx.filter ซึ่ง Safari บางรุ่นยังไม่รองรับ)
 */
function drawBeam(ctx, ox, oy, angle, len, w0, w1, alpha) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.rotate(angle);
  for (const [k, a] of [[1.6, 0.35], [1.25, 0.6], [1, 1]]) {
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, `rgba(${CREAM},${alpha * a})`);
    g.addColorStop(0.55, `rgba(${CREAM},${alpha * a * 0.45})`);
    g.addColorStop(1, `rgba(${CREAM},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -w0 * k / 2);
    ctx.lineTo(len, -w1 * k / 2);
    ctx.lineTo(len, w1 * k / 2);
    ctx.lineTo(0, w0 * k / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** ฟองแสงกลม — เนื้อเรียบจาง ขอบนุ่ม (ไม่ใช่จุดสว่างกลางแบบแสงฟุ้ง) */
function drawOrb(ctx, x, y, r, col, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col},${a})`);
  g.addColorStop(0.72, `rgba(${col},${a * 0.8})`);
  g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** ชั้นนิ่ง: ฟ้า แหล่งแสง ลำแสง แสงฟุ้ง ฟองแสง เมฆไกล หมอกล่าง */
export function drawSoftSky(ctx, w, h, L) {
  const T = L.T;
  const u = Math.min(w, h) / 400;
  const R = Math.max(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, SKY[0]);
  g.addColorStop(0.55, SKY[1]);
  g.addColorStop(1, SKY[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // แหล่งแสงอุ่นมุมซ้ายบน (ต้นทางของลำแสง)
  drawGlow(ctx, w * 0.04, -h * 0.04, R * 0.5, CREAM, 0.5);
  drawGlow(ctx, w * 0.1, h * 0.02, R * 0.32, T.c, 0.3);
  // ลำแสงทอดเฉียงลงขวา — สามเส้นกว้างไม่เท่ากัน
  const ox = -w * 0.02, oy = -h * 0.06;
  drawBeam(ctx, ox, oy, 0.36, R * 0.95, 8 * u, R * 0.16, 0.16);
  drawBeam(ctx, ox, oy, 0.62, R * 0.85, 6 * u, R * 0.1, 0.12);
  drawBeam(ctx, ox, oy, 0.9, R * 0.7, 6 * u, R * 0.13, 0.1);

  // แสงฟุ้งสีเล่นตามมุม (สีตามโทนของหน้า)
  drawGlow(ctx, w * 0.9, h * 0.04, R * 0.44, T.a, 0.5);
  drawGlow(ctx, w * 0.96, h * 0.96, R * 0.38, T.b, 0.42);
  drawGlow(ctx, w * 0.02, h * 0.62, R * 0.26, T.a, 0.26);
  drawGlow(ctx, w * 0.5, h * 0.46, R * 0.42, CREAM, 0.12);   // กลางจอสว่างนวล ๆ
  drawGlow(ctx, w * 0.12, h * 1.0, R * 0.22, T.c, 0.2);

  for (const o of L.orbs) drawOrb(ctx, o.x * w, o.y * h, o.r * u, o.col, o.a);
  for (const c of L.far) drawCloud(ctx, c.c, c.x * w, c.y * h, c.w * w, c.a, c.t);

  // หมอกนวลขอบล่าง — ให้เมฆมุมล่างกลืนกับพื้น ไม่ลอยเป็นก้อน
  const haze = ctx.createLinearGradient(0, h * 0.72, 0, h);
  haze.addColorStop(0, `rgba(${CREAM},0)`);
  haze.addColorStop(1, `rgba(${CREAM},0.16)`);
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
  drawCloudGroup(ctx, L.near, w, h, 0.42);
}

/** ของที่ขยับ (เฉพาะตอนเพิ่งเปิดหน้า): ดาวกะพริบ ละอองลอย */
function drawSoftLive(ctx, w, h, L, t) {
  const u = Math.min(w, h) / 400;
  for (const s of L.stars) {
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    drawStar(ctx, s.x * w, s.y * h, s.r * u * (0.8 + tw * 0.25), 0.16 + tw * 0.3, s.col);
  }
  for (const m of L.motes) {
    const y = 1.05 - ((m.y + t * m.v) % 1.1);
    const x = m.x + Math.sin(t * 0.5 + m.sw) * 0.01;
    const a = 0.3 * Math.min(1, (1.05 - y) * 6) * Math.min(1, y * 4);
    if (a <= 0.01) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = `rgb(${m.col})`;
    ctx.beginPath();
    ctx.arc(x * w, y * h, m.r * u, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** เมล็ดสุ่มจากชื่อโทน + เลขประจำหน้า */
function seedOf(tone, n) {
  let s = n * 977;
  for (const ch of tone) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return s;
}

/**
 * พื้นหลังฟ้าฝันของหน้าหนึ่ง — คืน { kick } แบบตัวคุมผ้าใบหน้าอื่น
 * @param tone  rose | butter | sky | mint | lilac | peach
 * @param n     เลขประจำหน้า (ให้เมฆ/ดาวแต่ละหน้าไม่อยู่ที่เดียวกัน)
 */
export function makeSoftBg(canvas, isActive, tone = 'rose', n = 1) {
  return makeCanvasBg(canvas, isActive, {
    layout: () => softLayout(tone, seedOf(tone, n)),
    still: drawSoftSky,
    live: drawSoftLive,
  });
}

/** ภาพนิ่งภาพเดียว (หน้าย่อยเล็ก ๆ — src/render/subbg.js) — ชั้นนิ่ง + ดาว/เมฆที่ t = 0 */
export function paintSoftSky(ctx, w, h, tone = 'rose', n = 1) {
  const L = softLayout(tone, seedOf(tone, n));
  drawSoftSky(ctx, w, h, L);
  drawSoftLive(ctx, w, h, L, 0);
}
