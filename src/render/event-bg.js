// src/render/event-bg.js
// ─────────────────────────────────────────────────────────────
// พื้นหลังหน้ากิจกรรม — "บอร์ดกิจกรรมพาสเทล" วาดสดด้วย Canvas 2D (ไม่มีภาพสำเร็จรูป)
//
// ── ความรู้สึกที่ต้องการ ──
// "วันนี้มีภารกิจสนุก ๆ ให้น้องแมวทำ และมีรางวัลรออยู่!" — คึกคักแบบงานฉลองเล็ก ๆ
// ต่างจากหน้าอื่น: คลังน้อง = ห้องนุ่มฟู / สกิล = พลังเวท / กาช่า = สมบัติ / หน้านี้ = ภารกิจ ความคืบหน้า รางวัล
//
// ── กฎที่ห้ามลืม ──
// พื้นหลังคือชั้นที่อ่อนที่สุดในหน้า การ์ดภารกิจต้องเด่นที่สุดเสมอ
// ของตกแต่งทุกชิ้นอยู่ "ขอบจอ / ช่องว่างระหว่างการ์ด / มุมล่าง / แถบหัวที่ว่าง" เท่านั้น
// ไม่มีอะไรวิ่งผ่านหลังข้อความ หลอดความคืบหน้า ตัวเลขรางวัล หรือปุ่ม (ตำแหน่งวัดจากหน้าจริงทุกครั้ง)
// ว่างตรงไหนก็ปล่อยว่าง — หรูเพราะยั้งมือ ไม่ใช่เพราะเติมจนเต็ม
//
// ── ชั้นที่วาด (ล่าง → บน) ──
//   1 drawEventBackground  ไล่สีลาเวนเดอร์ กลางสว่าง ขอบเข้ม
//   2 drawEventGlow        แสงนุ่มสี่จุด หายใจช้า ๆ (หลังหัวเรื่อง มุมล่างซ้าย/ขวา มุมขวาบน)
//   3 drawEventCloud       หมอกเมฆบาง ๆ มุมล่าง
//   4 drawEventPath        ทางจุดไข่ปลาจากมุมล่างขึ้นไปหาดาว = "ภารกิจมีทางไปต่อ"
//   5 drawEventMotifs      รอยเท้า ปลา หัวใจ กล่องของขวัญ หน้าแมว ตัวเล็กจาง ๆ ตามมุม
//   6 ไฮไลต์การ์ด          ข้อที่รับรางวัลได้ = แสงมินต์อุ่น ๆ รอบการ์ด / ข้อที่รับแล้ว = ดาวทองจิ๋ว
//   7 drawEventRibbon      โบเล็ก + ดาวสองดวงข้างหัวเรื่อง
//   8 drawEventSparkles    ประกายกะพริบช้า ๆ
//   9 drawEventConfetti    กระดาษสีชิ้นจิ๋วร่วงช้า ๆ ตามขอบ
//  10 drawEventParticles   จุดแสงลอยขึ้นช้า ๆ
// ─────────────────────────────────────────────────────────────
import { makeCanvasBg } from './dreambg.js';

const TAU = Math.PI * 2;
const COLORS = {
  lavender: '#E3CCFF',
  violet: '#B49CFF',
  pink: '#FFB9E1',
  cream: '#FFF3E2',
  yellow: '#FFE48A',
  mint: '#9FF5E4',
  sky: '#A8DCFF',
};
const CONFETTI_COLORS = [COLORS.pink, COLORS.mint, COLORS.yellow, COLORS.lavender, COLORS.sky];

/** สุ่มแบบมีเมล็ด — ตำแหน่งของตกแต่งคงที่ทุกครั้งที่เปิดหน้า ไม่กระโดดไปมา */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────
// ชิ้นส่วนวาด (ใช้ซ้ำได้ — ทุกตัวรับพิกัดเป็นพิกเซล CSS)
// ─────────────────────────────────────────────────────────────

/**
 * 1 · พื้น: ม่วงลาเวนเดอร์ทึบของตัวเอง กลางจอนวล ขอบพลัมจาง ๆ ให้มีมิติ
 * ── ทำไมต้องทึบ ──
 * เดิมวาดแค่แสงโปร่งทับพื้นม่วงเข้มของการ์ดใหญ่ (.pop) ทั้งหน้าจึงมืดกว่าคลังน้อง/สกิล/กาช่า
 * ซึ่งวาดพื้นสีของตัวเองทั้งหมด — ไล่สีชุดเดียวกับหน้ากาช่า/สกิล สี่หน้าจึงเป็นโลกเดียวกัน
 */
export function drawEventBackground(ctx, w, h) {
  const R = Math.max(w, h);
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#9E6EDB');
  base.addColorStop(0.55, '#8858C9');
  base.addColorStop(1, '#6D3EB0');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // กลางสว่างนวล (หลังรายการภารกิจ) — รัศมีใหญ่มาก ขอบจึงไม่เห็นเป็นวง
  const g = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, R * 0.62);
  g.addColorStop(0, 'rgba(214,184,252,.34)');
  g.addColorStop(1, 'rgba(214,184,252,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // ชมพูนวลด้านบน — โทนเดียวกับหน้าอื่น (#F7C7E8)
  const p = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, R * 0.46);
  p.addColorStop(0, 'rgba(247,199,232,.3)');
  p.addColorStop(1, 'rgba(247,199,232,0)');
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, w, h);
  // ขอบพลัมจาง ๆ (อ่อนกว่าเดิม — เดิมดำอมม่วง .32)
  const v = ctx.createRadialGradient(w / 2, h / 2, R * 0.26, w / 2, h / 2, R * 0.78);
  v.addColorStop(0, 'rgba(56,22,100,0)');
  v.addColorStop(1, 'rgba(56,22,100,.38)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** 2 · แสงนุ่มวงกลม — a คือความเข้มสูงสุด */
export function drawEventGlow(ctx, x, y, r, color, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** 3 · ก้อนเมฆบาง ๆ (วงกลมซ้อนกันห้าลูก) — s = ขนาด */
export function drawEventCloud(ctx, x, y, s, a, tint = COLORS.lavender) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = tint;
  ctx.beginPath();
  for (const [dx, dy, r] of [[-1.1, 0.15, 0.55], [-0.45, -0.25, 0.75], [0.35, -0.35, 0.85], [1.05, 0.05, 0.6], [0, 0.3, 0.7]]) {
    ctx.moveTo(x + dx * s + r * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

/** จุดบนเส้นโค้งเบซิเยร์สามจุดควบคุม (หาตำแหน่งจุดไข่ปลา) */
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/**
 * 4 · ทางภารกิจ: จุดไข่ปลาไล่จากล่างขึ้นบน มีจุดแวะ (วงแหวน) แล้วจบที่ดาว
 * pts = [p0, p1, p2, p3] โค้งเบซิเยร์ / stops = ตำแหน่งจุดแวะบนเส้น (0-1)
 */
export function drawEventPath(ctx, pts, a, t, stops = [0.3, 0.62]) {
  const [p0, p1, p2, p3] = pts;
  ctx.save();
  ctx.fillStyle = COLORS.cream;
  const n = 34;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const p = bez(p0, p1, p2, p3, k);
    // จุดค่อย ๆ ชัดขึ้นเมื่อเข้าใกล้ดาวปลายทาง = "เดินหน้าไปหารางวัล"
    ctx.globalAlpha = a * (0.35 + 0.65 * k);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.1 + k * 0.5, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = COLORS.lavender;
  ctx.lineWidth = 1.4;
  for (const s of stops) {
    const p = bez(p0, p1, p2, p3, s);
    ctx.globalAlpha = a * 1.3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.6, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  const tw = 0.75 + 0.25 * Math.sin(t * 1.4);
  drawEventStar(ctx, p3.x, p3.y, 6.5, Math.min(1, a * 2.6) * tw, COLORS.yellow);
}

/** ดาวห้าแฉกมน ๆ */
export function drawEventStar(ctx, x, y, r, a, color = COLORS.yellow, rot = -Math.PI / 2) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.translate(x, y);
  ctx.rotate(rot + Math.PI / 2);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.48 : r;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
  }
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.25;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** ประกายสี่แฉก (เส้นโค้งเว้า) */
export function drawEventSparkle(ctx, x, y, r, a, color = COLORS.cream) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

/** รอยเท้าแมว — ฝ่าเท้ากลม + นิ้วสามนิ้ว */
export function drawEventPaw(ctx, x, y, s, rot, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = COLORS.cream;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.ellipse(0, s * 0.35, s * 0.55, s * 0.45, 0, 0, TAU);
  for (const [dx, dy] of [[-0.55, -0.3], [0, -0.55], [0.55, -0.3]]) {
    ctx.moveTo(dx * s + s * 0.2, dy * s);
    ctx.arc(dx * s, dy * s, s * 0.2, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

/** หัวใจเล็ก */
export function drawEventHeart(ctx, x, y, s, a, color = COLORS.pink) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.translate(x, y);
  ctx.scale(s / 10, s / 10);
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(-7, -1, -5, -8, 0, -4);
  ctx.bezierCurveTo(5, -8, 7, -1, 0, 4);
  ctx.fill();
  ctx.restore();
}

/** ปลาเงา ๆ */
function drawEventFish(ctx, x, y, s, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = COLORS.sky;
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, 0, s, s * 0.55, 0, 0, TAU);
  ctx.moveTo(s * 0.8, 0);
  ctx.lineTo(s * 1.6, -s * 0.55);
  ctx.lineTo(s * 1.6, s * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** กล่องของขวัญเงา ๆ + ริบบิ้น */
function drawEventGift(ctx, x, y, s, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.fillStyle = COLORS.pink;
  ctx.beginPath();
  ctx.roundRect(-s, -s * 0.7, s * 2, s * 1.5, s * 0.25);
  ctx.fill();
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(-s * 0.16, -s * 0.7, s * 0.32, s * 1.5);
  ctx.beginPath();
  ctx.ellipse(-s * 0.4, -s * 0.85, s * 0.38, s * 0.22, -0.4, 0, TAU);
  ctx.ellipse(s * 0.4, -s * 0.85, s * 0.38, s * 0.22, 0.4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** หน้าแมวเงา ๆ (หัวกลม + หูสองข้าง) */
function drawEventCatFace(ctx, x, y, s, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = COLORS.lavender;
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, 0, s, s * 0.82, 0, 0, TAU);
  ctx.moveTo(-s * 0.9, -s * 0.2);
  ctx.lineTo(-s * 0.75, -s * 1.15);
  ctx.lineTo(-s * 0.2, -s * 0.7);
  ctx.moveTo(s * 0.9, -s * 0.2);
  ctx.lineTo(s * 0.75, -s * 1.15);
  ctx.lineTo(s * 0.2, -s * 0.7);
  ctx.fill();
  ctx.restore();
}

/** 7 · โบริบบิ้นเล็ก (ข้างหัวเรื่อง) */
export function drawEventRibbon(ctx, x, y, s, a, t) {
  const sway = Math.sin(t * 0.9) * 0.06;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.rotate(-0.18 + sway);
  ctx.fillStyle = COLORS.pink;
  ctx.beginPath();
  // ปีกโบสองข้าง
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-s * 1.2, -s * 0.9, -s * 1.3, s * 0.7, 0, 0);
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(s * 1.2, -s * 0.9, s * 1.3, s * 0.7, 0, 0);
  ctx.fill();
  // หางริบบิ้น
  ctx.beginPath();
  ctx.moveTo(-s * 0.12, 0);
  ctx.lineTo(-s * 0.55, s * 1.1);
  ctx.lineTo(-s * 0.3, s * 0.95);
  ctx.lineTo(-s * 0.18, s * 1.15);
  ctx.closePath();
  ctx.moveTo(s * 0.12, 0);
  ctx.lineTo(s * 0.55, s * 1.1);
  ctx.lineTo(s * 0.3, s * 0.95);
  ctx.lineTo(s * 0.18, s * 1.15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.cream;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** 9 · กระดาษสีชิ้นเดียว (สี่เหลี่ยมมนหมุนพลิก) */
export function drawEventConfettiPiece(ctx, c, x, y, a, rot = c.rot, flip = c.flip) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = c.color;
  ctx.translate(x, y);
  ctx.rotate(rot);
  // พลิกตัว = ย่อด้านกว้างตามเวลา เหมือนกระดาษหมุนกลางอากาศ
  ctx.scale(Math.max(0.25, Math.abs(Math.cos(flip))), 1);
  ctx.beginPath();
  if (c.round) ctx.arc(0, 0, c.s * 0.5, 0, TAU);
  else ctx.roundRect(-c.s * 0.5, -c.s * 0.3, c.s, c.s * 0.6, 1);
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ฉากของหน้ากิจกรรม — ใช้ตัวคุมผ้าใบชุดเดียวกับคลังน้อง/สกิล/กาช่า (makeCanvasBg ใน dreambg.js)
//   still  วาดครั้งเดียวต่อขนาดผ้าใบ: พื้น เมฆ ลวดลายแมวจิ๋ว (ของที่ไม่ขยับ)
//   live   ทุกเฟรม ~30 fps: แสงหายใจ ทางภารกิจ ไฮไลต์การ์ด หัวเรื่อง ประกาย กระดาษสี จุดแสง
// ของที่เคลื่อนไหวคิดตำแหน่งจากเวลา t ล้วน ๆ — ไม่มีออบเจกต์ไหนถูกแก้หรือสร้างใหม่ระหว่างเฟรม
// ─────────────────────────────────────────────────────────────

/** วัดตำแหน่งการ์ดภารกิจใหม่ทุกกี่วินาที (รายการเลื่อนได้ / กดรับรางวัลแล้วสถานะเปลี่ยน) */
const REMEASURE_S = 0.4;

/**
 * ตำแหน่งของ el ในการ์ดใหญ่ตามเลย์เอาต์ (offsetLeft/Top ไล่ขึ้นไปจนถึงการ์ด หักระยะที่เลื่อนรายการไว้)
 *
 * ── ทำไมไม่ใช้ getBoundingClientRect ──
 * ตอนเปิดหน้า การ์ดใหญ่เด้งเข้า (ย่อ → ขยาย) และของข้างในไล่ขึ้นทีละชิ้น (เลื่อนขึ้น 14px)
 * getBoundingClientRect ได้ตำแหน่ง "ระหว่างแอนิเมชัน" — ทางจุดไข่ปลา ดาว แสงรอบการ์ด
 * จึงถูกวางตามรายการที่ยังลอยต่ำอยู่ แล้ววัดใหม่ทีหลังกระโดดขึ้นไป (ที่ผู้ใช้เห็นว่า "เด้งขึ้น")
 * ค่า offset* เป็นตำแหน่งตามเลย์เอาต์ ไม่สนแอนิเมชันเลย จึงถูกตั้งแต่เฟรมแรก
 */
export function layoutRect(pop, el, scrolled = true) {
  let x = 0;
  let y = 0;
  let n = el;
  while (n && n !== pop) {
    x += n.offsetLeft;
    y += n.offsetTop;
    const p = n.offsetParent;
    if (!p) return null;
    // ระยะที่กล่องเลื่อนได้ (รายการภารกิจ) เลื่อนไว้ — ของข้างในขยับขึ้นตามนั้นจริงบนจอ
    // scrolled = false → ตำแหน่งตอนยังไม่เลื่อน (นิ่งตลอดการเลื่อน) ใช้กับเขตห้ามวางของตกแต่ง
    // ถ้านับระยะเลื่อน เขตห้ามวางขยับตามนิ้ว ของตกแต่งโผล่-หายสลับไปมา = เห็นเป็นกะพริบตอนเลื่อน
    if (scrolled) for (let a = n.parentElement; a && a !== p; a = a.parentElement) { x -= a.scrollLeft; y -= a.scrollTop; }
    if (p !== pop) { x += p.clientLeft - (scrolled ? p.scrollLeft : 0); y += p.clientTop - (scrolled ? p.scrollTop : 0); }
    n = p;
  }
  return n === pop ? { x, y, w: el.offsetWidth, h: el.offsetHeight } : null;
}

/**
 * ตำแหน่ง "ที่ตาเห็น" ของ el ในพิกัดผ้าใบ + ความทึบที่ตาเห็น — สำหรับแสงที่ต้องเกาะของชิ้นนั้นติด
 * (แสงหลังตัวน้อง / การ์ดด่านที่เลือก / แถวอันดับ 1-3) วัดได้ทุกเฟรม (ถูก เพราะใช้กับของไม่กี่ชิ้น)
 *
 * ── ทำไมไม่ใช้ layoutRect กับแสงพวกนี้ ──
 * ตอนเปิดหน้า เนื้อหาในการ์ดใหญ่เลื่อนขึ้น 14px และจางเข้า (0 → 1) แต่ผ้าใบนิ่งอยู่กับการ์ด
 * แสงที่วาดตำแหน่งสุดท้ายเต็มความสว่างตั้งแต่เฟรมแรก จะเห็นเป็นหมอกขยับ แล้ว "แสงวาบ" มาก่อนเนื้อหา
 * (ผู้ใช้เจอทั้งสองอาการในหน้าสร้างสรรค์) — ค่านี้หารสัดส่วนที่การ์ดถูกย่ออยู่ออก แล้วคูณความทึบทุกชั้น
 * แสงจึงเลื่อนขึ้นและจางเข้าพร้อมของจริงพอดี
 *
 * @param out ก้อนผลลัพธ์ที่ใช้ซ้ำ { x, y, w, h, a } — คืน out หรือ null ถ้า el ไม่ได้อยู่บนจอ
 */
export function trackRect(canvas, pop, el, w, out) {
  if (!el || !el.isConnected || !el.offsetParent) return null;
  const cr = canvas.getBoundingClientRect();
  if (!cr.width) return null;
  const r = el.getBoundingClientRect();
  const k = w / cr.width;
  out.x = (r.left - cr.left) * k;
  out.y = (r.top - cr.top) * k;
  out.w = r.width * k;
  out.h = r.height * k;
  let a = 1;
  for (let n = el; n && n !== pop; n = n.parentElement) a *= +getComputedStyle(n).opacity || 0;
  out.a = a;
  return out;
}

/**
 * พื้นหลังบอร์ดกิจกรรม
 * @param canvas   ผ้าใบลูกคนแรกของการ์ดใหญ่ (CSS ยืดเต็มการ์ด)
 * @param isActive แผงเปิดอยู่ไหม — ลูปถามทุกเฟรมแล้วหยุดเองเมื่อแผงปิด
 * @param pop      การ์ดใหญ่ (.pop) — ใช้วัดหัวเรื่อง รายการ และการ์ดภารกิจ
 * คืน { kick } เหมือนฉากอื่น — ตัวเฝ้าคลาสของแผงใน main.js เป็นคนปลุก
 */
export function makeEventBg(canvas, isActive, pop) {
  // ── ช่องว่างที่วางของได้ / การ์ดที่ต้องเรือง — ก้อนเดียวใช้ซ้ำ วัดใหม่เป็นระยะ ──
  const M = { L: 0, R: 0, top: 0, bottom: 0, title: null, hot: [], done: [], at: -Infinity, w: 0 };

  // ── ของที่เคลื่อนไหว — วางครั้งเดียวด้วยตัวสุ่มแบบมีเมล็ด (ตำแหน่งเดิมทุกครั้งที่เปิดหน้า) ──
  const rnd = seeded(20261005);
  const confetti = Array.from({ length: 8 }, (_, i) => ({
    side: i % 2, u: rnd(), y: rnd(), s: 4 + rnd() * 3, rot: rnd() * TAU, flip: rnd() * TAU,
    vy: 0.012 + rnd() * 0.012, vr: (rnd() - 0.5) * 0.6, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: i % 3 === 0,
  }));
  const motes = Array.from({ length: 14 }, (_, i) => ({
    side: i % 2, u: rnd(), y: rnd(), r: 0.8 + rnd() * 1.4, vy: 0.008 + rnd() * 0.01, ph: rnd() * TAU,
    color: i % 3 === 0 ? COLORS.yellow : i % 3 === 1 ? COLORS.lavender : COLORS.cream,
  }));
  const sparkles = Array.from({ length: 7 }, (_, i) => ({
    side: i % 2, u: 0.2 + rnd() * 0.6, y: 0.15 + rnd() * 0.75, r: 3 + rnd() * 3, ph: rnd() * TAU, sp: 0.5 + rnd() * 0.6,
  }));

  /** อยู่ในช่องว่างข้างไหน → พิกัด x จริง (u = 0-1 ภายในช่อง) */
  const sideX = (side, u) => (side ? M.w - M.R + u * M.R : u * M.L);

  /**
   * วัดหน้าใหม่ — ค่าทั้งหมดคูณ k ให้ตรงกับขนาดผ้าใบตอนนั้น
   * (ระหว่างการ์ดเด้งเข้า ผ้าใบถูกย่ออยู่ ตัวคุมผ้าใบวัดขนาดจากที่ตาเห็น ส่วน offset* เป็นขนาดเลย์เอาต์)
   */
  function measure(w) {
    const fullW = pop.offsetWidth;
    const fullH = pop.offsetHeight;
    if (!fullW) return;
    const k = w / fullW;
    const sc = (r) => r && { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k };
    const list = pop.querySelector('.quest-list');
    const lb = (list && layoutRect(pop, list)) || { x: 0, y: 0, w: fullW, h: fullH };
    M.w = w;
    M.L = Math.max(0, lb.x) * k;
    M.R = Math.max(0, fullW - (lb.x + lb.w)) * k;
    M.top = Math.max(0, lb.y) * k;
    M.bottom = Math.max(0, fullH - (lb.y + lb.h)) * k;
    const tEl = pop.querySelector('.quest-title');
    M.title = tEl ? sc(layoutRect(pop, tEl)) : null;
    M.hot.length = 0;
    M.done.length = 0;
    for (const row of pop.querySelectorAll('.quest-row')) {
      const r = layoutRect(pop, row);
      // ข้อที่เลื่อนพ้นช่องรายการไปแล้วไม่ต้องเรือง
      if (!r || r.y + r.h < lb.y || r.y > lb.y + lb.h) continue;
      if (row.classList.contains('ready')) M.hot.push(sc(r));
      else if (row.classList.contains('done')) M.done.push(sc(r));
    }
  }

  /** ชั้นนิ่ง — พื้น เมฆ ลวดลายแมวจิ๋ว (วาดครั้งเดียวต่อขนาดผ้าใบ) */
  function still(ctx, w, h) {
    measure(w);
    const { L, R, bottom } = M;
    drawEventBackground(ctx, w, h);

    // หมอกเมฆมุมล่าง (ส่วนใหญ่อยู่นอกการ์ดภารกิจ ตัวการ์ดทึบบังส่วนที่ล้ำเข้ามาอยู่แล้ว)
    const cs = Math.min(w, h) * 0.075;
    drawEventCloud(ctx, w * 0.03, h - cs * 0.3, cs * 1.3, 0.16, COLORS.pink);
    drawEventCloud(ctx, w * 0.13, h + cs * 0.15, cs, 0.12);
    drawEventCloud(ctx, w * 0.97, h - cs * 0.2, cs * 1.25, 0.16);
    drawEventCloud(ctx, w * 0.86, h + cs * 0.25, cs * 0.9, 0.12, COLORS.pink);

    // ลวดลายแมวจิ๋ว ตามมุมและขอบ (นิ่ง ไม่ขยับ)
    if (L > 26) {
      drawEventPaw(ctx, L * 0.35, h * 0.86, 4.5, -0.5, 0.12);
      drawEventPaw(ctx, L * 0.62, h * 0.8, 4.5, -0.3, 0.1);
      drawEventFish(ctx, L * 0.45, h * 0.3, 6, 0.1);
    }
    if (R > 26) {
      drawEventHeart(ctx, w - R * 0.5, h * 0.24, 9, 0.16);
      drawEventGift(ctx, w - R * 0.5, h * 0.76, 7, 0.11);
    }
    if (bottom > 14) drawEventCatFace(ctx, w * 0.5, h - bottom * 0.5, Math.min(7, bottom * 0.3), 0.08);
  }

  /** ชั้นเคลื่อนไหว — ทุกเฟรม */
  function live(ctx, w, h, _L, t) {
    if (t - M.at > REMEASURE_S || t < M.at || w !== M.w) {
      measure(w);
      M.at = t;
    }
    const { L, R, top, bottom, title } = M;
    const breathe = 0.85 + 0.15 * Math.sin(t * 0.7);

    // แสงนุ่มหายใจช้า ๆ — หลังหัวเรื่อง มุมล่างชมพู (ซ้าย) พีช #F1B4B1 (ขวา) มิ้นต์จาง ๆ มุมขวาบน
    if (title) drawEventGlow(ctx, title.x + title.w / 2, title.y + title.h / 2, Math.max(120, title.w * 0.9), COLORS.lavender, 0.16 * breathe);
    drawEventGlow(ctx, w * 0.06, h * 0.96, Math.min(w, h) * 0.46, COLORS.pink, 0.3 * breathe);
    drawEventGlow(ctx, w * 0.95, h * 0.94, Math.min(w, h) * 0.44, '#F1B4B1', 0.28 * (1.7 - breathe));
    drawEventGlow(ctx, w * 0.92, h * 0.12, Math.min(w, h) * 0.3, COLORS.mint, 0.07 * breathe);

    // ทางภารกิจ — เฉพาะตอนขอบข้างกว้างพอ (มือถือแนวนอนขอบแคบ ทางจะโดนการ์ดบังหมด ไม่ต้องวาด)
    if (L > 34) {
      drawEventPath(ctx, [
        { x: L * 0.55, y: h - Math.max(bottom, 18) * 0.5 },
        { x: L * 0.15, y: h * 0.72 },
        { x: L * 0.85, y: h * 0.45 },
        { x: L * 0.45, y: top + 26 },
      ], 0.2, t);
    }
    if (R > 34) {
      drawEventPath(ctx, [
        { x: w - R * 0.5, y: h - Math.max(bottom, 18) * 0.45 },
        { x: w - R * 0.9, y: h * 0.78 },
        { x: w - R * 0.15, y: h * 0.6 },
        { x: w - R * 0.55, y: h * 0.4 },
      ], 0.14, t + 2, [0.45]);
    }

    // ไฮไลต์การ์ด — แสงอุ่น ๆ "รอบ" การ์ดที่รับได้ (ตัวการ์ดทึบ แสงจึงโผล่แค่ขอบนอก ไม่ลอดหลังข้อความ)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top - 4, w, Math.max(0, h - top - bottom + 8));
    ctx.clip();
    const g = 0.6 + 0.4 * Math.sin(t * 1.6);
    for (const r of M.hot) {
      drawEventGlow(ctx, r.x + r.w * 0.5, r.y + r.h * 0.5, r.w * 0.55, COLORS.mint, 0.12 + 0.08 * g);
      drawEventGlow(ctx, r.x + r.w * 0.85, r.y + r.h * 0.5, r.h * 1.2, COLORS.yellow, 0.1 + 0.08 * g);
      // ประกายเล็กสองดวงนอกมุมการ์ด
      drawEventSparkle(ctx, r.x - 6, r.y + 6, 5, 0.5 * g, COLORS.yellow);
      drawEventSparkle(ctx, r.x + r.w + 6, r.y + r.h - 6, 4, 0.5 * (1.3 - g), COLORS.mint);
    }
    // ข้อที่รับแล้ว — ดาวทองจิ๋วนิ่ง ๆ ข้างนอกขอบขวา (ฉลองเบา ๆ ไม่กะพริบ ไม่รบกวน)
    if (R >= 14) {
      for (const r of M.done) {
        drawEventStar(ctx, r.x + r.w + Math.min(10, R * 0.4), r.y + r.h * 0.35, 2.6, 0.32, COLORS.yellow);
        drawEventStar(ctx, r.x + r.w + Math.min(16, R * 0.6), r.y + r.h * 0.6, 1.8, 0.24, COLORS.yellow);
      }
    }
    ctx.restore();

    // หัวเรื่อง: โบเล็กทางซ้าย ดาวสองดวงเหนือมุมขวา — ไม่ทับตัวหนังสือ
    if (title) {
      drawEventRibbon(ctx, title.x - 20, title.y + title.h * 0.42, 9, 0.75, t);
      drawEventStar(ctx, title.x + title.w + 10, title.y + 2, 3.4, 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3)), COLORS.yellow);
      drawEventStar(ctx, title.x + title.w + 22, title.y + title.h * 0.35, 2.2, 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + 2)), COLORS.cream);
    }

    // ประกายกะพริบช้า ๆ ตามขอบ
    for (const s of sparkles) {
      if ((s.side ? R : L) < 18) continue;
      drawEventSparkle(ctx, sideX(s.side, s.u), s.y * h, s.r, Math.max(0, Math.sin(t * s.sp + s.ph)) * 0.5);
    }

    // กระดาษสีร่วงช้า ๆ ตามขอบ — ร่วงพ้นล่างแล้ววนกลับบนสุด เลื่อนตำแหน่งข้างทุกรอบ จะได้ไม่ตกซ้ำที่เดิม
    for (const c of confetti) {
      if ((c.side ? R : L) < 18) continue;
      const fall = c.y + 0.05 + c.vy * t;
      const lap = Math.floor(fall / 1.1);
      const u = (c.u + lap * 0.37) % 1;
      drawEventConfettiPiece(ctx, c, sideX(c.side, 0.15 + u * 0.7), (fall - lap * 1.1 - 0.05) * h, 0.4,
        c.rot + c.vr * t, c.flip + t * 1.2);
    }

    // จุดแสงลอยขึ้นช้า ๆ
    ctx.save();
    for (const m of motes) {
      if ((m.side ? R : L) < 14) continue;
      const rise = (1.03 - m.y) + m.vy * t;
      const lap = Math.floor(rise / 1.06);
      const u = (m.u + lap * 0.53) % 1;
      const x = sideX(m.side, 0.1 + u * 0.8) + Math.sin(t * 0.6 + m.ph) * 4;
      ctx.globalAlpha = 0.18 + 0.14 * Math.sin(t + m.ph);
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(x, (1.03 - (rise - lap * 1.06)) * h, m.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // แถวที่เรืองเลื่อนตามรายการ — ระหว่างเลื่อนวัดใหม่ทุกเฟรม แสงจึงเกาะแถวติด
  const bg = makeCanvasBg(canvas, isActive, { layout: () => M, still, live, onScroll: () => { M.at = -Infinity; } });
  // รายการเลื่อน = การ์ดที่ต้องเรืองย้ายที่ — วัดใหม่เฟรมถัดไปเลย (ภาพนิ่งก็วาดใหม่ผ่าน kick)
  pop.querySelector('.quest-list')?.addEventListener('scroll', () => { M.at = -Infinity; bg.kick(); }, { passive: true });
  return bg;
}
