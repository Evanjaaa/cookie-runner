// src/render/hope-power.js
// ─────────────────────────────────────────────────────────────
// ✨ พลังแห่งความหวัง (Hope Power) — ท่าพิเศษตอนบอสเวียนหัว
// ผู้ใช้ 22 พ.ย. 2026 (สตอรี่บอร์ด 4 ช่อง + สเปก) · ต้นแบบเล่นได้ใน gameplay-lab.html · เกมจริงเรียกชุดนี้ได้เลย
//
// ไฟล์นี้ "วาดอย่างเดียว" ไม่เดินเวลาเอง: ฝั่งเกมถือสถานะ sp แล้วส่งมาวาดทุกเฟรม
//   sp = { ph, f, tap, res, dx }  ph = เฟส · f = เฟรมในเฟส · tap = เฟรมที่กด (ใน aim) · res = ผลกด · dx = น้องเลื่อนจากที่เดิม (px)
// ทุกภาพคิดจาก sp.f / frame (นาฬิกาเกม) → พัก/ย้อนดูตรงเฟรม ไม่มีสุ่มกลางทาง
//
// ลำดับเฟส (เวลาใน HOPE · หน่วยเฟรม 60/วิ):
//   rush    โลกหยุด น้องพุ่งเข้าหาบอส: เส้นความเร็วทั้งจอ ริบบิ้นแสงไล่หลัง ประกาย → วาบขาวส่งเข้าคัตซีน
//   cut     คัตซีนแผงเฉียงซ้อนสองชั้นแว้บเข้ากลางจอ: น้องระยะใกล้รวมพลัง ออร่าทอง ดาวแห่งความหวัง + เสาแสง + วงรัศมี
//   aim     มินิเกม 1.2 วิ: วงแหวนหดเข้าหาปุ่มอุ้งเท้า · วงนับถอยหลังรอบปุ่ม · แตะ "ครั้งเดียว"
//   blast   สำเร็จ: ชูมือปล่อยพลัง ลำแสงสามชั้น + เส้นพลังเกลียว ดาวพุ่งออกขวา
//   strike  กลับสนาม: ดาวหางพุ่งโค้งเข้าผลึก → วาบ วงแหวน รัศมีแสง "ร้าว!"
//   miss    พลาด: แผงหม่น ดาวแตกร่วงเป็นเสี่ยง ควันฟุบ น้องตาหมุน
//   counter กลับสนาม: บอสสวน (ตัววาดคลื่นอยู่ฝั่งเกม) · ขอบจอแดงวาบ ดาวมึนวนหัวน้อง
//   back    น้องวิ่งกลับที่เดิม แถบดำหดออก
// ไม่มีเส้นขอบเข้มรอบรูปทรง (กฎฉาก) — แยกชั้นด้วยแสงเรือง ไฮไลต์ และสีพื้น
// ภาพน้องในคัตซีน: ฝั่งเกมส่ง drawCat(c, x, feetY, k, pose, frame) มา (pose = 'charge' | 'blast' | 'miss') — ท่าจริงมาแทนได้โดยไม่แตะไฟล์นี้
// ─────────────────────────────────────────────────────────────
import { drawHopeStar, drawHopeStarBurst } from './hope-star.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const outBack = (k) => { k = clamp(k); const c = 1.9, v = k - 1; return 1 + (c + 1) * v * v * v + c * v * v; };
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** จังหวะทุกเฟส (เฟรม) — มินิเกม 1.2 วิ (ผู้ใช้ 22 พ.ย.: 3 วิ → 1.5 → 1 (เร็วไป) → 1.2 วิ) */
export const HOPE = {
  rush: 34,               // พุ่งเข้าหาบอส
  cut: 50,                // คัตซีนโผล่ + รวมพลัง
  aim: 72,                // มินิเกม 1.2 วิ (หมดเวลา = พลาด)
  hit: 48,                // เฟรมที่วงแหวนทับวงเป้าพอดี (0.8 วิ)
  perfect: 4, good: 10,   // กดคลาดได้กี่เฟรมยังนับ (เป๊ะ ±0.07 วิ / ดี ±0.17 วิ)
  judge: 20,              // ค้างโชว์ผลกดก่อนเข้าฉากผล
  blast: 64, strike: 52, impact: 18,   // สำเร็จ: คัตซีนปล่อยพลัง · ดาวหางเข้าผลึก (กระทบเฟรม impact)
  miss: 48, counter: 54, bonk: 18,     // พลาด: คัตซีนพลาด · บอสสวน (โดนเฟรม bonk)
  back: 44,               // วิ่งกลับที่เดิม
};
/** เฟสที่คัตซีนอยู่กลางจอ (ฝั่งเกมใช้หรี่แถบบน) */
export const HOPE_CUT = ['cut', 'aim', 'blast', 'miss'];
/** ตัดสินการกดที่เฟรม f ของมินิเกม */
export function hopeJudge(f) {
  const d = f - HOPE.hit, a = Math.abs(d);
  return a <= HOPE.perfect ? 'perfect' : a <= HOPE.good ? 'good' : d < 0 ? 'early' : 'late';
}
export const hopeOk = (res) => res === 'perfect' || res === 'good';

const PAL = { cream: '#FFF3FA', pink: '#FF8DC7', hot: '#F0579E', lilac: '#B58CF0', gold: '#FFD86B', deep: '#3A1D50' };

function inkText(c, txt, x, y, stroke, w, fill) {
  c.lineJoin = 'round'; c.lineWidth = w; c.strokeStyle = stroke; c.strokeText(txt, x, y);
  c.fillStyle = fill; c.fillText(txt, x, y);
}
function star4(c, x, y, r, a = 1) {
  if (a <= 0.01 || r <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y);
  c.beginPath();
  for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.26 : r; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
  c.closePath(); c.fill(); c.restore();
}
function glow(c, x, y, r, rgb, a) {
  if (a <= 0.005) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}

// ══════════════════ สนาม (พิกัดจอ) ══════════════════
/**
 * พุ่งเข้าหาบอส — วาดทับตัวน้อง
 * o = { startX, catX, feetY, W, H, t }
 */
export function drawHopeRush(c, sp, o) {
  const k = clamp(sp.f / HOPE.rush), e = k * k, { startX, catX, feetY, W, H, t } = o;
  c.save();
  // โฟกัส: ขอบจอมืดลงนิด ๆ (โลกหยุด สายตาไปที่น้อง)
  const v = c.createRadialGradient(catX + 60, feetY - 60, 80, catX + 60, feetY - 60, W * 0.8);
  v.addColorStop(0, 'rgba(40,16,70,0)'); v.addColorStop(1, `rgba(40,16,70,${0.35 * ease(k * 2)})`);
  c.fillStyle = v; c.fillRect(0, 0, W, H);
  // ริบบิ้นแสงไล่หลัง: ชมพู → ทองที่ตัวน้อง ขอบบนเป็นคลื่นพลิ้ว
  if (catX - startX > 8) {
    const top = feetY - 58, bot = feetY - 6;
    const gr = c.createLinearGradient(startX, 0, catX, 0);
    gr.addColorStop(0, 'rgba(255,170,220,0)'); gr.addColorStop(0.7, `rgba(255,170,220,${0.42 * e})`); gr.addColorStop(1, `rgba(255,236,170,${0.75 * e})`);
    c.fillStyle = gr; c.beginPath(); c.moveTo(startX, (top + bot) / 2);
    for (let x = startX; x <= catX; x += 12) c.lineTo(x, top + Math.sin(x * 0.05 - t * 22) * 5 * (x - startX) / (catX - startX + 1));
    c.lineTo(catX + 6, top + 10); c.lineTo(catX + 6, bot - 6);
    for (let x = catX; x >= startX; x -= 12) c.lineTo(x, bot - Math.sin(x * 0.06 + t * 18) * 3);
    c.closePath(); c.fill();
    c.fillStyle = '#FFFFFF';
    for (let i = 0; i < 12; i++) {              // ประกายร่วงตามทาง
      const u = rnd(i * 3.1), x = startX + (catX - startX) * u, age = (sp.f - u * HOPE.rush * e) / 12;
      if (age < 0 || age > 1) continue;
      star4(c, x, top + rnd(i) * (bot - top) + age * 18, 2.5 + rnd(i + 2) * 3, (1 - age) * e);
    }
  }
  // เส้นความเร็วแบบมังงะทั้งจอ
  c.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const y = 40 + ((i * 53.7) % (H - 80)), len = 80 + rnd(i) * 220, sp2 = 30 + rnd(i + 5) * 30;
    const x = W - ((sp.f * sp2 + rnd(i + 9) * W * 1.6) % (W * 1.6));
    c.strokeStyle = i % 4 ? `rgba(255,255,255,${0.32 * e})` : `rgba(255,214,240,${0.5 * e})`;
    c.lineWidth = 1 + (i % 3) * 1.2;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + len * e, y); c.stroke();
  }
  // แสงนำหน้าตัวน้อง
  glow(c, catX + 26, feetY - 34, 70, '255,236,190', 0.5 * e);
  c.restore();
}

/**
 * ดาวหางแห่งความหวัง: จากเหนือหัวน้อง พุ่งโค้งเข้าผลึก → กระทบ (วาบ วงแหวน รัศมีแสง "ร้าว!")
 * o = { from: [x, y], to: [x, y], t }
 */
export function drawHopeStrike(c, sp, o) {
  const { from: [sx, sy], to: [tx, ty], t } = o, I = HOPE.impact;
  const at = (u) => { const e = u * u; return [sx + (tx - sx) * e, sy + (ty - sy) * e - Math.sin(u * Math.PI) * 54]; };
  c.save();
  if (sp.f <= I) {
    const u = sp.f / I;
    for (let j = 16; j >= 1; j--) {            // หางดาวหาง: วงไล่ขนาด ทอง → ชมพู
      const uu = Math.max(0, u - j * 0.022), [x, y] = at(uu), a = (1 - j / 17) * 0.75;
      glow(c, x, y, 16 - j * 0.6, j < 6 ? '255,236,170' : '255,160,214', a);
    }
    c.fillStyle = '#FFFFFF';
    for (let j = 0; j < 8; j++) { const [x, y] = at(Math.max(0, u - j * 0.05)); star4(c, x + Math.sin(j * 2.3 + t * 9) * 8, y + j * 2.5, 3 - j * 0.25, 0.9 - j * 0.1); }
    const [x, y] = at(u);
    glow(c, x, y, 46, '255,240,190', 0.55);
    drawHopeStar(c, x, y, 20, t, { bob: false });
  } else {
    const k = clamp((sp.f - I) / 32);
    glow(c, tx, ty, 50 + k * 150, '255,250,235', 0.9 * (1 - k));
    c.save(); c.translate(tx, ty); c.rotate(t * 0.8);
    for (let i = 0; i < 14; i++) {              // รัศมีแสงพุ่งจากผลึก
      const a = (i / 14) * TAU, L = (60 + rnd(i) * 70) * ease(k * 2.2), w = 0.07;
      c.fillStyle = `rgba(255,${i % 2 ? 236 : 210},${i % 2 ? 180 : 236},${0.6 * (1 - k)})`;
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, L, a - w, a + w); c.closePath(); c.fill();
    }
    c.restore();
    for (let i = 0; i < 3; i++) {               // วงแหวนกระจาย
      const kk = clamp(k * 1.6 - i * 0.2);
      if (kk <= 0 || kk >= 1) continue;
      c.strokeStyle = i === 1 ? `rgba(255,150,210,${0.8 * (1 - kk)})` : `rgba(255,232,160,${0.85 * (1 - kk)})`;
      c.lineWidth = 6 * (1 - kk) + 1; c.beginPath(); c.arc(tx, ty, 20 + kk * 120, 0, TAU); c.stroke();
    }
    drawHopeStarBurst(c, tx, ty, clamp(k * 1.3), 46);
    const pk = clamp(k * 3);                     // "ร้าว!" เด้งขึ้นเหนือผลึก
    c.save(); c.globalAlpha = 1 - clamp((k - 0.7) / 0.3); c.translate(tx + 6, ty - 70 - k * 20); c.scale(outBack(pk), outBack(pk));
    c.font = '800 30px Mali, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    inkText(c, 'ร้าว!', 0, 0, '#8A1F5C', 6, '#FFF3A0');
    c.restore();
  }
  c.restore();
}

/** โดนบอสสวน: ขอบจอแดงชมพูวาบ + ดาวมึนวนหัวน้อง · o = { catX, headY, W, H, t } */
export function drawHopeCounter(c, sp, o) {
  const { catX, headY, W, H, t } = o, B = HOPE.bonk;
  if (sp.f < B) return;
  const k = clamp((sp.f - B) / 26);
  c.save();
  const v = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
  v.addColorStop(0, 'rgba(255,60,120,0)'); v.addColorStop(1, `rgba(255,60,120,${0.4 * (1 - k)})`);
  c.fillStyle = v; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 3; i++) {                // ดาวมึนวนหัว
    const an = t * 6 + (i / 3) * TAU, x = catX + Math.cos(an) * 20, y = headY + Math.sin(an) * 6;
    c.globalAlpha = 0.6 + 0.4 * Math.sin(an);
    drawHopeStar(c, x, y, 6, t, { bob: false, fx: false });
  }
  c.restore();
}

/** แถบดำบนล่าง (โหมดภาพยนตร์) — เข้าตอนพุ่ง ออกตอนวิ่งกลับ */
export function drawHopeLetterbox(c, sp, W, H) {
  const k = sp.ph === 'rush' ? clamp(sp.f / 10) : sp.ph === 'back' ? 1 - clamp(sp.f / 18) : 1, h = 30 * ease(k);
  if (h <= 0.5) return;
  c.fillStyle = '#140A20'; c.fillRect(0, 0, W, h); c.fillRect(0, H - h, W, h);
}

/** แสงวาบทั้งจอตามจังหวะ (ส่งเข้าคัตซีน · กระทบผลึก · โดนสวน) — วาดท้ายสุด */
export function drawHopeFlash(c, sp, W, H) {
  let a = 0, rgb = '255,255,255';
  if (sp.ph === 'rush') a = clamp((sp.f - (HOPE.rush - 5)) / 5) * 0.85;
  else if (sp.ph === 'cut') a = (1 - clamp(sp.f / 8)) * 0.85;
  else if (sp.ph === 'strike' && sp.f >= HOPE.impact) a = (1 - clamp((sp.f - HOPE.impact) / 12)) * 0.6;
  else if (sp.ph === 'counter' && sp.f >= HOPE.bonk) { a = (1 - clamp((sp.f - HOPE.bonk) / 12)) * 0.35; rgb = '255,90,140'; }
  if (a <= 0.01) return;
  c.fillStyle = `rgba(${rgb},${a})`; c.fillRect(0, 0, W, H);
}

// ══════════════════ คัตซีนกลางจอ ══════════════════
/**
 * คัตซีน + มินิเกม + ผล · o = { W, H, t, frame, drawCat }
 */
export function drawHopeCut(c, sp, o) {
  const { W, H, t, frame, drawCat } = o, ph = sp.ph, f = sp.f;
  const miss = ph === 'miss';
  // สไลด์เข้า (เด้งเลยนิด) · ค้าง · สไลด์ออกซ้าย
  const inK = ph === 'cut' ? outBack(f / 14) : 1;
  const outLen = ph === 'blast' ? HOPE.blast : ph === 'miss' ? HOPE.miss : 0;
  const outK = outLen ? ease((f - (outLen - 12)) / 12) : 0;
  const ox = (1 - inK) * W * 1.05 - outK * W * 1.1;
  // แผงสั่นตอนปล่อยพลัง / ตอนพลาด
  const jolt = ph === 'blast' ? Math.sin(f * 2.3) * 6 * (1 - clamp(f / 14)) : miss ? Math.sin(f * 2.9) * 4 * (1 - clamp(f / 12)) : 0;
  c.fillStyle = `rgba(20,8,36,${0.5 * clamp(ph === 'cut' ? f / 8 : 1) * (1 - outK)})`; c.fillRect(0, 0, W, H);   // สนามหรี่ลง

  const top = 58, bot = 328, sk = 52, x0 = 58 + ox + jolt, x1 = 902 + ox + jolt;
  const para = (dx, dy, grow = 0) => { const q = new Path2D(); q.moveTo(x0 + sk + dx - grow, top + dy - grow); q.lineTo(x1 + dx + grow, top + dy - grow); q.lineTo(x1 - sk + dx + grow, bot + dy + grow); q.lineTo(x0 + dx - grow, bot + dy + grow); q.closePath(); return q; };
  const panel = para(0, 0);
  c.save();
  // แผงหลัง (ซ้อนเหลื่อม = ลึก) + แสงเรืองรอบแผง
  c.fillStyle = miss ? 'rgba(96,80,122,.9)' : 'rgba(122,79,184,.92)'; c.fill(para(16, 12));
  c.shadowColor = miss ? 'rgba(200,190,220,.6)' : 'rgba(255,170,220,.95)'; c.shadowBlur = 26;
  c.fillStyle = PAL.cream; c.fill(para(0, 0, 3)); c.shadowBlur = 0;
  c.save(); c.clip(panel);
  const cx = (x0 + x1) / 2, cy = (top + bot) / 2;
  const sx = cx + 46, sy = top + 50;        // ดาวเหนือหัวน้อง
  // พื้นแผง
  let gr = c.createRadialGradient(sx, sy + 30, 20, cx, cy, 560);
  gr.addColorStop(0, miss ? '#ECE4F2' : '#FFF6FB'); gr.addColorStop(0.4, miss ? '#BBA9CF' : '#F7BFE4'); gr.addColorStop(1, miss ? '#5E4C78' : '#8F62D8');
  c.fillStyle = gr; c.fillRect(x0 - 20, top - 20, x1 - x0 + 40, bot - top + 40);
  // แสงรัศมีสองชั้นหมุนสวนกัน
  for (const [n, sp2, a0] of [[24, 0.3, 0.16], [12, -0.18, 0.1]]) {
    c.save(); c.translate(sx, sy); c.rotate(t * sp2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, w = 0.045 + (i % 3) * 0.02;
      c.fillStyle = `rgba(255,255,255,${a0 + (i % 2) * 0.08})`;
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 800, a, a + w); c.closePath(); c.fill();
    }
    c.restore();
  }
  // จุดฮาล์ฟโทนมุมแผง (ลายการ์ตูน) + โบเก้ลอยขึ้น
  c.fillStyle = 'rgba(255,255,255,.16)';
  for (let gx = 0; gx < 12; gx++) for (let gy = 0; gy < 8; gy++) {
    const d = (gx + gy) / 18, r = 4.2 * (1 - d);
    if (r > 0.4) { c.beginPath(); c.arc(x0 + 18 + gx * 14, bot - 14 - gy * 14, r, 0, TAU); c.fill(); c.beginPath(); c.arc(x1 - 18 - gx * 14, top + 14 + gy * 14, r, 0, TAU); c.fill(); }
  }
  for (let i = 0; i < 12; i++) {
    const u = (t * (0.05 + rnd(i) * 0.05) + rnd(i + 3)) % 1, x = x0 + 60 + rnd(i + 7) * (x1 - x0 - 120), y = bot + 20 - u * (bot - top + 60);
    glow(c, x, y, 10 + rnd(i + 1) * 18, i % 2 ? '255,255,255' : '255,210,240', 0.35 * Math.sin(u * Math.PI));
  }
  // แสงวาววิ่งเฉียงผ่านแผง
  const sw = ((frame % 100) / 100) * (x1 - x0 + 500) - 250;
  gr = c.createLinearGradient(x0 + sw - 60, 0, x0 + sw + 60, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr; c.beginPath(); c.moveTo(x0 + sw - 40, bot); c.lineTo(x0 + sw + 40, top); c.lineTo(x0 + sw + 120, top); c.lineTo(x0 + sw + 40, bot); c.fill();

  // ── ดาว / พลัง ──
  const grow = ph === 'cut' ? ease(f / HOPE.cut) : 1;
  const aimK = ph === 'aim' ? clamp(Math.min(f, sp.tap ?? f) / HOPE.hit) : ph === 'cut' ? 0 : 1;   // พลังเพิ่มตามวงแหวนเข้าเป้า
  const catX = sx - 34, feet = bot + 92;
  if (!miss) {
    // ออร่าทองรอบตัวน้อง: เปลวพลังพลิ้วขึ้น (หลังตัว)
    const pow = (ph === 'blast' ? 1.4 : 0.55 + 0.45 * aimK) * grow;
    glow(c, catX, bot - 70, 150 * pow, '255,226,150', 0.55);
    for (let i = 0; i < 9; i++) {
      const bx = catX + (i - 4) * 26, h = (70 + rnd(i) * 60) * pow, sway = Math.sin(t * 5 + i * 1.7) * 12;
      const g2 = c.createLinearGradient(0, bot, 0, bot - h);
      g2.addColorStop(0, 'rgba(255,214,120,.55)'); g2.addColorStop(0.6, 'rgba(255,160,214,.32)'); g2.addColorStop(1, 'rgba(255,160,214,0)');
      c.fillStyle = g2; c.beginPath(); c.moveTo(bx - 16, bot); c.quadraticCurveTo(bx - 10 + sway, bot - h * 0.55, bx + sway * 1.4, bot - h); c.quadraticCurveTo(bx + 10 + sway, bot - h * 0.5, bx + 16, bot); c.fill();
    }
  }
  if (ph === 'cut' || ph === 'aim') {
    const pulse = 1 + (ph === 'aim' ? 0.1 * Math.sin(frame * (0.3 + aimK * 0.5)) * aimK : 0);
    // เสาแสงจากดาวขึ้นฟ้า
    gr = c.createLinearGradient(0, sy, 0, top - 10);
    gr.addColorStop(0, `rgba(255,248,220,${0.65 * grow})`); gr.addColorStop(1, 'rgba(255,248,220,0)');
    c.fillStyle = gr; c.fillRect(sx - 18 * grow * pulse, top - 10, 36 * grow * pulse, sy - top + 10);
    // วงรัศมีสองวงเอียงหมุน (หลังครึ่งจาง หน้าครึ่งชัด = มีมิติ)
    for (let i = 0; i < 2; i++) {
      const rx = (78 + i * 34) * grow * pulse, ry = (15 + i * 7) * grow * pulse;
      c.save(); c.translate(sx, sy + 6); c.rotate((i ? -0.12 : 0.1) + Math.sin(t * 1.2 + i) * 0.05);
      c.lineWidth = 3 - i; c.strokeStyle = `rgba(255,250,230,${0.35 * grow})`; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, Math.PI, TAU); c.stroke();
      c.strokeStyle = `rgba(255,236,170,${0.85 * grow})`; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI); c.stroke();
      c.fillStyle = '#FFFFFF'; const an = t * (2 + i) + i * 2; star4(c, Math.cos(an) * rx, Math.sin(an) * ry, 4, grow * (0.5 + 0.5 * Math.sin(an)));
      c.restore();
    }
    glow(c, sx, sy, 70 * grow * pulse, '255,240,190', 0.6);
    drawHopeStar(c, sx, sy, 34 * grow * pulse, t, { bob: false });
    // ประกายมีหางไหลเข้าหาดาว (เร็วขึ้นเมื่อใกล้เป้า)
    c.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const u = (t * (0.8 + aimK * 0.9) + i / 16) % 1, a = i * 2.39, d0 = 230 * (1 - u), d1 = 230 * (1 - Math.max(0, u - 0.06));
      c.strokeStyle = `rgba(255,${i % 2 ? 246 : 214},${i % 2 ? 200 : 240},${Math.sin(u * Math.PI) * grow})`; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(sx + Math.cos(a) * d1, sy + Math.sin(a) * d1 * 0.55); c.lineTo(sx + Math.cos(a) * d0, sy + Math.sin(a) * d0 * 0.55); c.stroke();
    }
  } else if (ph === 'blast') {
    // ลำแสงสามชั้น (ชมพูนอก · ทองกลาง · ขาวแกน) ขยายจากดาวออกขอบขวา + เส้นพลังเกลียว + ประกายวิ่งตามลำแสง
    const k = ease(f / 10), flick = 1 + 0.06 * Math.sin(f * 1.9), end = x1 + 60;
    for (const [hw, col, a] of [[86, '255,150,214', 0.4], [52, '255,220,140', 0.65], [20, '255,255,250', 0.95]]) {
      const h0 = hw * 0.3 * k * flick, h1 = hw * k * flick;
      gr = c.createLinearGradient(sx, 0, end, 0);
      gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},${a * 0.5})`);
      c.fillStyle = gr; c.beginPath(); c.moveTo(sx, sy - h0); c.lineTo(end, sy - h1); c.lineTo(end, sy + h1); c.lineTo(sx, sy + h0); c.closePath(); c.fill();
    }
    c.lineWidth = 2.4;
    for (let j = 0; j < 4; j++) {
      c.strokeStyle = `rgba(255,255,255,${0.7 * k})`; c.beginPath();
      for (let x = sx; x <= end; x += 10) { const u = (x - sx) / (end - sx), amp = (10 + 46 * u) * k; c.lineTo(x, sy + Math.sin(x * 0.045 - f * 0.55 + j * 1.6) * amp * (j % 2 ? 1 : -0.7)); }
      c.stroke();
    }
    c.fillStyle = '#FFFFFF';
    for (let i = 0; i < 18; i++) { const u = ((f * 0.04 + rnd(i)) % 1), x = sx + (end - sx) * u, y = sy + (rnd(i + 4) - 0.5) * 100 * u * k; star4(c, x, y, 2 + rnd(i + 1) * 3.5, k * (1 - u * 0.5)); }
    for (let i = 0; i < 3; i++) {                // วงคลื่นจากจุดปล่อย
      const kk = clamp((f - i * 5) / 22);
      if (kk > 0 && kk < 1) { c.strokeStyle = `rgba(255,240,200,${0.9 * (1 - kk)})`; c.lineWidth = 5 * (1 - kk) + 1; c.beginPath(); c.ellipse(sx, sy, 20 + kk * 120, 12 + kk * 80, 0, 0, TAU); c.stroke(); }
    }
    glow(c, sx, sy, 110, '255,250,230', 0.8 * (1 - clamp(f / 30)));
    drawHopeStar(c, sx + (end - sx) * ease((f - 4) / 26), sy, 42, t, { bob: false });
    drawHopeStarBurst(c, sx, sy, clamp(f / 24), 70);
  } else {
    // พลาด: ดาวแตกเป็นเสี่ยงร่วง + ควันฟุบ
    const k = clamp(f / 34);
    c.save(); c.filter = 'saturate(.35)';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2, d = 8 + k * 40, x = sx + Math.cos(a) * d, y = sy + Math.sin(a) * d * 0.6 + k * k * 90;
      c.save(); c.translate(x, y); c.rotate(a + k * (i % 2 ? 3 : -3)); c.globalAlpha = 1 - k * 0.8;
      c.fillStyle = i % 2 ? '#E8D9A8' : '#D9C79A'; c.beginPath(); c.moveTo(0, -11); c.lineTo(7, 6); c.lineTo(-7, 6); c.closePath(); c.fill();
      c.restore();
    }
    c.restore();
    for (let i = 0; i < 6; i++) {
      const kk = clamp(k * 1.4 - i * 0.08);
      glow(c, sx + (i - 2.5) * 16, sy + 10 - kk * 30, 14 + kk * 26, '150,136,170', 0.5 * (1 - kk) * Math.min(1, kk * 4));
    }
  }

  // ── น้องระยะใกล้ (ครึ่งตัวบน) ──
  const pose = ph === 'blast' ? 'blast' : miss ? 'miss' : 'charge';
  const shake2 = ph === 'aim' && sp.tap == null ? Math.sin(frame * 1.7) * (0.8 + aimK * 1.4) : 0;
  c.save();
  if (miss) c.filter = 'saturate(.7)';
  drawCat(c, catX + shake2, feet, 3.0, pose, frame);
  c.restore();
  if (miss) {                                  // ดาวมึนวนหัว
    for (let i = 0; i < 3; i++) {
      const an = t * 5 + (i / 3) * TAU;
      c.save(); c.globalAlpha = 0.55 + 0.45 * Math.sin(an);
      drawHopeStar(c, catX + Math.cos(an) * 46, top + 96 + Math.sin(an) * 9, 8, t, { bob: false, fx: false });
      c.restore();
    }
  }
  // แสงวาบตอนเปิดคัตซีน / ตอนปล่อยพลัง (ในแผง)
  const flash = ph === 'cut' ? 1 - clamp(f / 12) : ph === 'blast' ? 1 - clamp(f / 18) : 0;
  if (flash > 0) { c.fillStyle = `rgba(255,255,255,${flash * 0.85})`; c.fillRect(x0 - 20, top - 20, x1 - x0 + 40, bot - top + 40); }
  if (miss) { c.fillStyle = 'rgba(60,50,80,.18)'; c.fillRect(x0 - 20, top - 20, x1 - x0 + 40, bot - top + 40); }
  c.restore();
  // ขอบในเรืองบาง (ไฮไลต์ ไม่ใช่เส้นเข้ม)
  c.strokeStyle = miss ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.75)'; c.lineWidth = 2.5; c.stroke(para(0, 0, -5));
  // เส้นแสงวิ่งเฉียงตอนแผงเข้า (แว้บ)
  if (ph === 'cut' && f < 16) {
    for (let i = 0; i < 3; i++) {
      const p = clamp(f / 14 - i * 0.12), x = -200 + p * (W + 400);
      c.fillStyle = `rgba(255,255,255,${0.7 * (1 - p)})`;
      c.beginPath(); c.moveTo(x - 30 - i * 30, H); c.lineTo(x + 70 - i * 30, 0); c.lineTo(x + 92 - i * 30, 0); c.lineTo(x - 8 - i * 30, H); c.fill();
    }
  }
  c.restore();

  // ── ป้าย ──
  const lab = ph === 'blast' ? ['สำเร็จ!', 'ok', clamp(f / 10)] : miss ? [sp.res === 'early' ? 'เร็วไป!' : 'ไม่ทัน!', 'x', clamp(f / 10)] : ['พลังแห่งความหวัง!', 'star', ph === 'cut' ? clamp((f - 6) / 12) : 1];
  hopeLabel(c, lab[0], x0 + sk + 18, top - 6, lab[1], lab[2], miss ? Math.sin(f * 1.6) * 3 * (1 - clamp(f / 16)) : 0);
  if (ph === 'aim') drawHopeRing(c, sp, x1 - 196, cy + 8, t, frame);
}

/** ป้ายแบบริบบิ้นลูกกวาด (ไอคอนในวงกลม + ตัวหนังสือขาวตีขอบสี) · k = เด้งเข้า */
function hopeLabel(c, txt, x, y, icon, k, jit) {
  if (k <= 0.01) return;
  const theme = icon === 'ok' ? ['#7CE3AE', '#2FAE72', '#1E6B4A'] : icon === 'x' ? ['#FF9DB8', '#E8457A', '#8A1F3D'] : ['#FFB3DA', '#E2559C', '#8A1F5C'];
  c.save(); c.font = '800 22px Mali, sans-serif'; c.textBaseline = 'middle';
  const w = c.measureText(txt).width + 64, h = 40, s = outBack(k);
  c.translate(x + jit + w / 2, y); c.scale(s, s); c.translate(-w / 2, 0);
  c.fillStyle = 'rgba(30,8,40,.3)'; c.beginPath(); c.roundRect(0, -h / 2 + 4, w, h, h / 2); c.fill();
  c.fillStyle = '#FFF6E6'; c.beginPath(); c.roundRect(-2, -h / 2 - 2, w + 4, h + 4, h / 2 + 2); c.fill();
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, theme[0]); g.addColorStop(1, theme[1]);
  c.fillStyle = g; c.beginPath(); c.roundRect(0, -h / 2, w, h, h / 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.roundRect(14, -h / 2 + 3, w - 28, 10, 5); c.fill();
  const ix = 22;
  c.fillStyle = '#FFF6E6'; c.beginPath(); c.arc(ix, 0, 14, 0, TAU); c.fill();
  c.strokeStyle = theme[1]; c.lineWidth = 3.6; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
  if (icon === 'ok') { c.moveTo(ix - 6, 0); c.lineTo(ix - 1.5, 5); c.lineTo(ix + 6.5, -5); c.stroke(); }
  else if (icon === 'x') { c.moveTo(ix - 5, -5); c.lineTo(ix + 5, 5); c.moveTo(ix + 5, -5); c.lineTo(ix - 5, 5); c.stroke(); }
  else drawHopeStar(c, ix, 0, 9, 0, { bob: false, fx: false });
  inkText(c, txt, 44, 1, theme[2], 5, '#FFFFFF');
  c.restore();
}

/** มินิเกม: ปุ่มอุ้งเท้าวุ้น · วงเป้า · วงแหวนหดเข้า (มีเงาตาม) · วงนับถอยหลังรอบปุ่ม · ผลตัดสิน */
function drawHopeRing(c, sp, x, y, t, frame) {
  const f = sp.f, R = 46, appear = outBack(f / 10), now = Math.min(f, sp.tap ?? f);
  const near = sp.tap == null && Math.abs(f - HOPE.hit) <= HOPE.good;
  const rrAt = (ff) => (R + 8) * (1 + 2.2 * (HOPE.hit - ff) / HOPE.hit);
  c.save(); c.translate(x, y); c.scale(appear, appear);
  // พื้นหลังปุ่ม: วงม่วงเข้มนุ่ม ให้วงแหวนขาวอ่านออกบนแผงสว่าง
  let g = c.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 2.6);
  g.addColorStop(0, 'rgba(70,30,110,.42)'); g.addColorStop(1, 'rgba(70,30,110,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R * 2.6, 0, TAU); c.fill();
  // วงตกแต่งหมุน (เส้นประ + ดาวเล็ก 8 จุด)
  c.save(); c.rotate(t * 0.8); c.setLineDash([3, 9]); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.45)';
  c.beginPath(); c.arc(0, 0, R + 40, 0, TAU); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#FFF3C8'; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; star4(c, Math.cos(a) * (R + 40), Math.sin(a) * (R + 40), 3.4, 0.8); }
  c.restore();
  // วงนับถอยหลัง (หมดเวลา = พลาด)
  const left = clamp(1 - now / HOPE.aim);
  c.lineCap = 'round'; c.lineWidth = 6; c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(0, 0, R + 24, 0, TAU); c.stroke();
  c.strokeStyle = left > 0.34 ? '#FFC2E2' : '#FF6FA8'; c.beginPath(); c.arc(0, 0, R + 24, -Math.PI / 2, -Math.PI / 2 + TAU * left); c.stroke();
  // วงเป้า (เรืองทองตอนอยู่ในช่วงกดได้)
  c.save(); c.shadowColor = near ? 'rgba(255,200,80,1)' : 'rgba(255,150,210,.8)'; c.shadowBlur = near ? 22 : 10;
  c.lineWidth = near ? 8 : 6; c.strokeStyle = near ? '#FFE07A' : '#FFFFFF';
  c.beginPath(); c.arc(0, 0, R + 8, 0, TAU); c.stroke(); c.restore();
  // ปุ่มอุ้งเท้าวุ้น (กดแล้วยุบเด้ง)
  const pk = sp.tap != null ? clamp((f - sp.tap) / 10) : 0, ps = 1 - 0.14 * Math.sin(pk * Math.PI) + (near ? 0.04 * Math.sin(frame * 0.8) : 0);
  c.save(); c.scale(ps, ps);
  g = c.createLinearGradient(0, -R, 0, R); g.addColorStop(0, '#FFC6E1'); g.addColorStop(0.55, '#FB8CC0'); g.addColorStop(1, '#E85597');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
  g = c.createRadialGradient(0, R * 0.1, R * 0.6, 0, 0, R);
  g.addColorStop(0, 'rgba(160,40,110,0)'); g.addColorStop(1, 'rgba(160,40,110,.35)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-8, -R * 0.52, R * 0.55, R * 0.2, -0.25, 0, TAU); c.fill();
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.ellipse(0, 9, 15, 12.5, 0, 0, TAU); c.fill();
  for (const [dx, dy, r] of [[-17, -6, 6.2], [-6, -17, 6.6], [6, -17, 6.6], [17, -6, 6.2]]) { c.beginPath(); c.ellipse(dx, dy, r * 0.85, r, 0, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,170,205,.6)'; c.beginPath(); c.ellipse(0, 11, 8, 6, 0, 0, TAU); c.fill();
  c.restore();
  // วงแหวนจังหวะ + เงาตามสองชั้น (ก่อนกด)
  if (sp.tap == null) {
    for (let j = 2; j >= 0; j--) {
      const rr = rrAt(Math.max(0, f - j * 3));
      if (rr < R * 0.55) continue;
      c.lineWidth = j ? 2.5 : 5; c.strokeStyle = near ? `rgba(255,224,122,${j ? 0.35 : 1})` : `rgba(255,255,255,${j ? 0.3 : 0.95})`;
      c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.stroke();
    }
  } else {
    const k = clamp((f - sp.tap) / 18), ok = sp.res === 'perfect' || sp.res === 'good';
    for (let i = 0; i < 3; i++) {                 // วงกระเพื่อมตอนกด
      const kk = clamp(k * 1.4 - i * 0.18);
      if (kk > 0 && kk < 1) { c.lineWidth = 4 * (1 - kk) + 1; c.strokeStyle = ok ? `rgba(255,230,140,${1 - kk})` : `rgba(255,140,170,${1 - kk})`; c.beginPath(); c.arc(0, 0, R + 8 + kk * 70, 0, TAU); c.stroke(); }
    }
    if (ok) drawHopeStarBurst(c, 0, 0, k, R * 1.8);
  }
  c.restore();
  // เวลา (เม็ดเหนือปุ่ม) + ผลตัดสิน / คำแนะนำ (ใต้ปุ่ม) — ไม่ย่อตามปุ่ม
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
  c.globalAlpha = clamp(f / 8);
  c.fillStyle = 'rgba(40,14,60,.55)'; c.beginPath(); c.roundRect(x - 40, y - R - 70, 80, 28, 14); c.fill();
  c.font = '800 17px Mali, sans-serif'; inkText(c, `⏱ ${(left * HOPE.aim / 60).toFixed(1)}`, x, y - R - 55, '#4A1F66', 4, '#FFFFFF');
  if (sp.tap != null) {
    const k = clamp((f - sp.tap) / 9), ok = sp.res === 'perfect' || sp.res === 'good';
    const txt = { perfect: 'เป๊ะ!', good: 'ดี!', early: 'เร็วไป!', late: 'ช้าไป!' }[sp.res];
    const col = sp.res === 'perfect' ? ['#8A4A00', '#FFF3A0'] : sp.res === 'good' ? ['#1E6B4A', '#D8FFE9'] : ['#6E2A44', '#FFD6E2'];
    c.save(); c.translate(x + (ok ? 0 : Math.sin(f * 2.2) * 4 * (1 - k)), y + R + 52); c.scale(outBack(k) * 1.1, outBack(k) * 1.1);
    c.font = '800 32px Mali, sans-serif'; inkText(c, txt, 0, 0, col[0], 6, col[1]);
    if (sp.res === 'perfect') { c.fillStyle = '#FFFFFF'; star4(c, -58, -12, 7, k); star4(c, 58, -14, 6, k); }
    c.restore();
  } else {
    c.font = '700 14px Mali, sans-serif'; inkText(c, near ? 'ตอนนี้!' : 'แตะตอนวงแหวนทับวงพอดี!', x, y + R + 48, near ? '#8A4A00' : '#4A1F66', 4, near ? '#FFF3A0' : '#FFF6E6');
  }
  c.restore();
}
