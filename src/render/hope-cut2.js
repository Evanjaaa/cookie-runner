// src/render/hope-cut2.js
// ─────────────────────────────────────────────────────────────
// ✨ คัตซีน "พลังแห่งความหวัง" แบบใหม่ (ร่าง · เพื่อนร่วมทีมฝั่งน้องแมว 24 พ.ย. 2026)
// ตามภาพแบบของผู้ใช้: แผงม่วงเฉียงหนามีขอบนูนล่าง · ป้ายลูกกวาด "พลังแห่งความหวัง!" มุมซ้ายบน
//   น้องพุ่งไปทางขวา ถือดาว มีหางแสงทองวิ่งเข้าหาปุ่ม · ปุ่มอุ้งเท้าวุ้นในวงแหวนลาเวนเดอร์ทางขวา
// ใช้ทดลองใน monster-lab (แท็บ "คัตซีน") ก่อน — ยังไม่แทนของเดิม (hope-power.js drawHopeCut)
// จังหวะ/การตัดสินใช้ HOPE + hopeJudge ชุดเดียวกับเกม (ฝั่งเกมสลับมาใช้ตัวนี้ได้โดยไม่ต้องแก้จังหวะ)
//
// วาดอย่างเดียว ไม่เดินเวลาเอง: sp = { ph, f, tap, res } (เหมือน hope-power) · พิกัดจอเกม 960 × 420
//   ph: 'cut' แผงเข้า+รวมพลัง · 'aim' มินิเกม · 'blast' สำเร็จ (เป๊ะ/ดี) · 'miss' พลาด
// น้องในคัตซีน: ผู้เรียกส่ง drawCat(c, x, feetY, k, pose, frame) มา (pose = 'charge' | 'blast' | 'miss')
// ไม่มีเส้นขอบเข้มรอบรูปทรง (กฎฉาก) — แยกชั้นด้วยแสง ไฮไลต์ และสีพื้น
// ─────────────────────────────────────────────────────────────
import { drawHopeStar, drawHopeStarBurst } from './hope-star.js';
import { HOPE } from './hope-power.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const outBack = (k) => { k = clamp(k); const c = 1.9, v = k - 1; return 1 + (c + 1) * v * v * v + c * v * v; };
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** แผง (พิกัดจอ 960×420) — ขนาด/เฉียงตามภาพแบบ */
export const CUT2 = { top: 74, bot: 360, x0: 16, x1: 946, sk: 34, depth: 12, ring: { x: 640, y: 214 }, cat: { x: 250, feet: 352, k: 3.5 } };

function star4(c, x, y, r, a = 1) {
  if (a <= 0.01 || r <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y);
  c.beginPath();
  for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.26 : r; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
  c.closePath(); c.fill(); c.restore();
}
function glow(c, x, y, r, rgb, a) {
  if (a <= 0.005 || r <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
function inkText(c, txt, x, y, stroke, w, fill) {
  c.lineJoin = 'round'; c.lineWidth = w; c.strokeStyle = stroke; c.strokeText(txt, x, y);
  c.fillStyle = fill; c.fillText(txt, x, y);
}

/**
 * ทั้งคัตซีน · o = { W, H, t, frame, drawCat, dim = true }
 */
export function drawHopeCut2(c, sp, o) {
  const { W, H, t, frame, drawCat } = o, ph = sp.ph, f = sp.f;
  const miss = ph === 'miss', blast = ph === 'blast';
  const P = CUT2;
  // แผงเข้า (สไลด์จากขวา เด้งเลย) · ออกซ้ายช่วงท้ายของผล
  const inK = ph === 'cut' ? outBack(f / 16) : 1;
  const outLen = blast ? HOPE.blast : miss ? HOPE.miss : 0;
  const outK = outLen ? ease((f - (outLen - 12)) / 12) : 0;
  const ox = (1 - inK) * W * 1.05 - outK * W * 1.1;
  const jolt = blast ? Math.sin(f * 2.3) * 7 * (1 - clamp(f / 14)) : miss ? Math.sin(f * 2.9) * 5 * (1 - clamp(f / 12)) : 0;
  if (o.dim !== false) { c.fillStyle = `rgba(20,8,36,${0.5 * clamp(ph === 'cut' ? f / 8 : 1) * (1 - outK)})`; c.fillRect(0, 0, W, H); }

  const top = P.top, bot = P.bot, sk = P.sk, x0 = P.x0 + ox + jolt, x1 = P.x1 + ox + jolt;
  const para = (dx, dy, g = 0) => {
    const q = new Path2D();
    q.moveTo(x0 + sk + dx - g, top + dy - g); q.lineTo(x1 + dx + g, top + dy - g);
    q.lineTo(x1 - sk + dx + g, bot + dy + g); q.lineTo(x0 + dx - g, bot + dy + g); q.closePath();
    return q;
  };
  const panel = para(0, 0);
  const tint = miss ? 0.55 : 0;   // พลาด = สีหม่น
  c.save();
  // ── ขอบหนานูน (สันม่วงล่าง/ขวา) + เงาฟุ้งใต้แผง ──
  c.fillStyle = 'rgba(30,10,50,.28)'; c.fill(para(6, P.depth + 10));
  c.fillStyle = miss ? '#7E6E98' : '#8C5FD0'; c.fill(para(0, P.depth));
  c.fillStyle = miss ? '#A496BA' : '#B489EC'; c.fill(para(0, P.depth * 0.45));
  c.save(); c.clip(panel);
  // ── พื้นแผง: ลาเวนเดอร์ → ชมพูสว่างกลาง (แสงจากน้อง) ──
  const lx = P.cat.x + 160 + ox, ly = top + 150;
  let gr = c.createRadialGradient(lx, ly, 10, lx, ly, 640);
  gr.addColorStop(0, miss ? '#F1ECF5' : '#FFF4FA'); gr.addColorStop(0.35, miss ? '#D4C8E0' : '#F9CDEB'); gr.addColorStop(1, miss ? '#9B8AB4' : '#B88AE8');
  c.fillStyle = gr; c.fillRect(x0 - 20, top - 20, x1 - x0 + 40, bot - top + 40);
  // แสงรัศมีจากจุดพลัง (หมุนช้า) — เส้นยาวเฉียงแบบภาพแบบ
  c.save(); c.translate(lx, ly); c.rotate(t * 0.08);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU, w = 0.03 + (i % 3) * 0.018;
    c.fillStyle = `rgba(255,255,255,${(0.1 + (i % 2) * 0.08) * (1 - tint)})`;
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 900, a, a + w); c.closePath(); c.fill();
  }
  c.restore();
  // แถบแสงเฉียงยาวสองเส้นพาดแผง (ภาพแบบ)
  for (const [yy, a] of [[0.36, 0.22], [0.62, 0.14]]) {
    c.save(); c.translate(x0, top + (bot - top) * yy); c.rotate(-0.12);
    gr = c.createLinearGradient(0, -10, 0, 10);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(-50, -10, x1 - x0 + 100, 20); c.restore();
  }
  // ฮาล์ฟโทนจุดมุมล่างซ้าย / ขวาบน
  c.fillStyle = 'rgba(255,255,255,.2)';
  for (let gx = 0; gx < 14; gx++) for (let gy = 0; gy < 7; gy++) {
    const d = (gx + gy) / 19, r = 4.4 * (1 - d);
    if (r <= 0.4) continue;
    c.beginPath(); c.arc(x0 + 26 + gx * 15, bot - 16 - gy * 15, r, 0, TAU); c.fill();
    c.beginPath(); c.arc(x1 - 26 - gx * 15, top + 16 + gy * 15, r, 0, TAU); c.fill();
  }
  // เส้นความเร็ว (น้องพุ่งไปทางขวา) — ไหลจากขวาไปซ้ายหลังตัวน้อง
  c.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const u = (t * (0.9 + rnd(i) * 0.6) + rnd(i + 9)) % 1, y = top + 60 + rnd(i + 2) * (bot - top - 90);
    const xa = x0 + 40 + (1 - u) * 420, len = 60 + rnd(i + 5) * 90;
    c.strokeStyle = `rgba(255,255,255,${0.55 * Math.sin(u * Math.PI) * (1 - tint)})`; c.lineWidth = 2 + rnd(i) * 2;
    c.beginPath(); c.moveTo(xa, y); c.lineTo(xa - len, y); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(xa, y, 2.5, 0, TAU); c.fill();
  }
  // โบเก้ลอย
  for (let i = 0; i < 12; i++) {
    const u = (t * (0.05 + rnd(i) * 0.05) + rnd(i + 3)) % 1, x = x0 + 80 + rnd(i + 7) * (x1 - x0 - 160), y = bot + 20 - u * (bot - top + 60);
    glow(c, x, y, 10 + rnd(i + 1) * 16, i % 2 ? '255,255,255' : '255,214,240', 0.3 * Math.sin(u * Math.PI));
  }
  // แสงวาววิ่งผ่านแผง
  const sw = ((frame % 110) / 110) * (x1 - x0 + 600) - 300;
  gr = c.createLinearGradient(x0 + sw - 60, 0, x0 + sw + 60, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.2)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr; c.beginPath(); c.moveTo(x0 + sw - 40, bot); c.lineTo(x0 + sw + 40, top); c.lineTo(x0 + sw + 120, top); c.lineTo(x0 + sw + 40, bot); c.fill();

  // ── จุดพลัง (ดาวที่อุ้งเท้าน้อง) + หางแสงทองไปหาปุ่ม ──
  const grow = ph === 'cut' ? ease(f / HOPE.cut) : 1;
  const aimK = ph === 'aim' ? clamp(Math.min(f, sp.tap ?? f) / HOPE.hit) : ph === 'cut' ? 0 : 1;
  const catX = P.cat.x + ox + jolt, feet = P.cat.feet;
  // ── น้อง ──
  const pose = blast ? 'blast' : miss ? 'miss' : 'charge';
  const shake = ph === 'aim' && sp.tap == null ? Math.sin(frame * 1.7) * (0.8 + aimK * 1.4) : 0;
  const lunge = ph === 'cut' ? (1 - outBack(f / 18)) * -60 : 0;
  c.save();
  if (miss) c.filter = 'saturate(.6)';
  const held = drawCat(c, catX + shake + lunge, feet, P.cat.k, pose, frame);   // คืนจุดที่อุ้งเท้ากำดาว (พิกัดจอ) — ไม่มี = ค่าตั้งต้น
  c.restore();
  const sx = held ? held.x + 20 : catX + 118, sy = held ? held.y - 5 : top + 168;   // ดาวในอุ้งเท้า (หน้าอุ้งเท้า · ต่ำพอให้เห็นปากอ้า)

  const rx = P.ring.x + ox + jolt, ry = P.ring.y;
  if (!miss) {
    glow(c, sx, sy, (70 + 40 * aimK) * grow * (blast ? 1.6 : 1), '255,228,150', blast ? 0.55 : 0.42);
    if (!blast) {
      // หางแสงทองโค้งจากดาวไปทางปุ่ม — ยาวขึ้นตามพลังที่สะสม
      const reach = (0.35 + 0.55 * aimK) * grow;
      const ex = sx + (rx - 120 - sx) * reach, ey = sy - 40 * reach;
      for (const [w, col, a] of [[22, '255,200,110', 0.25], [11, '255,226,150', 0.55], [4, '255,252,230', 0.95]]) {
        c.strokeStyle = `rgba(${col},${a})`; c.lineWidth = w * (0.6 + 0.4 * reach);
        c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo((sx + ex) / 2, sy + 34, ex, ey); c.stroke();
      }
      c.fillStyle = '#FFFFFF';
      for (let i = 0; i < 8; i++) { const u = (t * 1.4 + i / 8) % 1, k2 = u * reach; star4(c, sx + (ex - sx) * u, sy + 34 * 4 * u * (1 - u) * 0.5 - 40 * k2, 3 + rnd(i) * 3, Math.sin(u * Math.PI)); }
      // วงแหวนรวมพลังหมุนรอบดาว
      for (let i = 0; i < 2; i++) {
        const rr = (30 + i * 16) * grow * (1 + 0.08 * Math.sin(frame * 0.4 + i));
        c.save(); c.translate(sx, sy); c.rotate((i ? -1 : 1) * t * 2.2);
        c.strokeStyle = `rgba(255,240,190,${0.8 - i * 0.3})`; c.lineWidth = 2.5 - i;
        c.beginPath(); c.ellipse(0, 0, rr, rr * 0.42, 0.5, 0.2, Math.PI * 1.4); c.stroke();
        c.restore();
      }
    }
  }

  // เครื่องหมาย "!!" เหลือง (ตกใจ/ฮึด) เหนือหัวน้อง — ภาพแบบ
  if (!miss) {
    const pk = ph === 'cut' ? outBack((f - 10) / 12) : 1;
    if (pk > 0.01) {
      c.save(); c.translate(catX - 120, top + 60); c.scale(pk, pk); c.rotate(-0.35 + Math.sin(frame * 0.5) * 0.04);
      for (const [dx, len, wd] of [[0, 52, 14], [26, 40, 12], [-24, 30, 10]]) {
        c.save(); c.translate(dx, 0); c.rotate(dx * 0.008);
        c.fillStyle = '#5A3420'; c.beginPath(); c.moveTo(-wd / 2 - 2, -len - 2); c.lineTo(wd / 2 + 2, -len - 2); c.lineTo(wd * 0.25 + 2, 2); c.lineTo(-wd * 0.25 - 2, 2); c.closePath(); c.fill();
        c.fillStyle = '#FFD84A'; c.beginPath(); c.moveTo(-wd / 2, -len); c.lineTo(wd / 2, -len); c.lineTo(wd * 0.25, 0); c.lineTo(-wd * 0.25, 0); c.closePath(); c.fill();
        c.fillStyle = '#5A3420'; c.beginPath(); c.arc(0, 12, wd * 0.36 + 2, 0, TAU); c.fill();
        c.fillStyle = '#FFD84A'; c.beginPath(); c.arc(0, 12, wd * 0.36, 0, TAU); c.fill();
        c.restore();
      }
      c.restore();
    }
  }
  // ดาวที่อุ้งเท้า
  if (!miss && !blast) {
    const pulse = 1 + (ph === 'aim' ? 0.12 * Math.sin(frame * (0.3 + aimK * 0.6)) * aimK : 0);
    drawHopeStar(c, sx, sy, 32 * grow * pulse, t, { bob: false });
  } else if (blast) {
    // สำเร็จ: ลำแสงสามชั้นยิงจากดาวผ่านปุ่มออกขอบขวา + ดาวพุ่ง
    const k = ease(f / 10), flick = 1 + 0.06 * Math.sin(f * 1.9), end = x1 + 60;
    for (const [hw, col, a] of [[80, '255,150,214', 0.4], [48, '255,220,140', 0.65], [18, '255,255,250', 0.95]]) {
      const h0 = hw * 0.3 * k * flick, h1 = hw * k * flick;
      gr = c.createLinearGradient(sx, 0, end, 0);
      gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},${a * 0.5})`);
      c.fillStyle = gr; c.beginPath(); c.moveTo(sx, sy - h0); c.lineTo(end, sy - h1); c.lineTo(end, sy + h1); c.lineTo(sx, sy + h0); c.closePath(); c.fill();
    }
    c.fillStyle = '#FFFFFF';
    for (let i = 0; i < 18; i++) { const u = (f * 0.04 + rnd(i)) % 1, x = sx + (end - sx) * u, y = sy + (rnd(i + 4) - 0.5) * 90 * u * k; star4(c, x, y, 2 + rnd(i + 1) * 3.5, k * (1 - u * 0.5)); }
    glow(c, sx, sy, 120, '255,250,230', 0.8 * (1 - clamp(f / 30)));
    drawHopeStar(c, sx + (end - sx) * ease((f - 4) / 26), sy, 40, t, { bob: false });
    drawHopeStarBurst(c, sx, sy, clamp(f / 24), 70);
  } else {
    // พลาด: ดาวแตกร่วง + ควันฟุบ + ดาวมึนวนหัวน้อง
    const k = clamp(f / 34);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2, d = 8 + k * 40, x = sx + Math.cos(a) * d, y = sy + Math.sin(a) * d * 0.6 + k * k * 90;
      c.save(); c.translate(x, y); c.rotate(a + k * (i % 2 ? 3 : -3)); c.globalAlpha = 1 - k * 0.8;
      c.fillStyle = i % 2 ? '#E8D9A8' : '#D9C79A'; c.beginPath(); c.moveTo(0, -11); c.lineTo(7, 6); c.lineTo(-7, 6); c.closePath(); c.fill();
      c.restore();
    }
    for (let i = 0; i < 6; i++) { const kk = clamp(k * 1.4 - i * 0.08); glow(c, sx + (i - 2.5) * 16, sy + 10 - kk * 30, 14 + kk * 26, '150,136,170', 0.5 * (1 - kk) * Math.min(1, kk * 4)); }
    for (let i = 0; i < 3; i++) {
      const an = t * 5 + (i / 3) * TAU;
      c.save(); c.globalAlpha = 0.55 + 0.45 * Math.sin(an);
      drawHopeStar(c, catX + Math.cos(an) * 46, top + 70 + Math.sin(an) * 9, 8, t, { bob: false, fx: false });
      c.restore();
    }
  }

  // แสงวาบตอนแผงเข้า / ตอนปล่อยพลัง
  const flash = ph === 'cut' ? 1 - clamp(f / 12) : blast ? 1 - clamp(f / 18) : 0;
  if (flash > 0) { c.fillStyle = `rgba(255,255,255,${flash * 0.85})`; c.fillRect(x0 - 20, top - 20, x1 - x0 + 40, bot - top + 40); }
  if (miss) { c.fillStyle = 'rgba(60,50,80,.16)'; c.fillRect(x0 - 20, top - 20, x1 - x0 + 40, bot - top + 40); }
  c.restore();   // จบ clip แผง

  // ── ขอบในสองเส้น (ขาวเรือง) ──
  c.strokeStyle = miss ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.85)'; c.lineWidth = 2.5; c.stroke(para(0, 0, -7));
  c.strokeStyle = miss ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.5)'; c.lineWidth = 1.5; c.stroke(para(0, 0, -12));
  // เส้นแสงเฉียงตอนแผงเข้า
  if (ph === 'cut' && f < 16) {
    for (let i = 0; i < 3; i++) {
      const p = clamp(f / 14 - i * 0.12), x = -200 + p * (W + 400);
      c.fillStyle = `rgba(255,255,255,${0.7 * (1 - p)})`;
      c.beginPath(); c.moveTo(x - 30 - i * 30, H); c.lineTo(x + 70 - i * 30, 0); c.lineTo(x + 92 - i * 30, 0); c.lineTo(x - 8 - i * 30, H); c.fill();
    }
  }
  c.restore();

  // ── ป้ายลูกกวาดมุมซ้ายบน ──
  const lab = blast ? [sp.res === 'perfect' ? 'เป๊ะ! พลังเต็ม!' : 'สำเร็จ!', 'ok', clamp(f / 10)]
    : miss ? [sp.res === 'early' ? 'เร็วไป!' : 'ไม่ทัน!', 'x', clamp(f / 10)]
      : ['พลังแห่งความหวัง!', 'star', ph === 'cut' ? clamp((f - 6) / 10) : 1];
  candyLabel(c, lab[0], x0 + sk + 48, top - 4, lab[1], lab[2], miss ? Math.sin(f * 1.6) * 3 * (1 - clamp(f / 16)) : 0);
  // ── ปุ่มจังหวะ ──
  if (ph === 'cut' || ph === 'aim') drawRing2(c, sp, rx, ry, t, frame, ph === 'cut' ? ease((f - HOPE.cut + 16) / 16) : 1);
}

/** ป้ายลูกกวาด: ขอบครีม · ชมพูไล่ · ไอคอนดาวในวงขาว · ตัวหนังสือขาวตีขอบชมพูเข้ม */
function candyLabel(c, txt, x, y, icon, k, jit) {
  if (k <= 0.01) return;
  const theme = icon === 'ok' ? ['#8BE8B8', '#2FAE72', '#1E6B4A'] : icon === 'x' ? ['#FFA3BD', '#E8457A', '#8A1F3D'] : ['#FFA9CF', '#E85A9C', '#8A1F5C'];
  c.save(); c.font = '800 26px Mali, sans-serif'; c.textBaseline = 'middle';
  const w = c.measureText(txt).width + 82, h = 48, s = outBack(k);
  c.translate(x + jit, y); c.scale(s, s);
  c.fillStyle = 'rgba(60,10,60,.28)'; c.beginPath(); c.roundRect(2, -h / 2 + 6, w, h, 16); c.fill();
  c.fillStyle = '#FFF3F8'; c.beginPath(); c.roundRect(-3, -h / 2 - 3, w + 6, h + 6, 18); c.fill();
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, theme[0]); g.addColorStop(1, theme[1]);
  c.fillStyle = g; c.beginPath(); c.roundRect(0, -h / 2, w, h, 15); c.fill();
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.roundRect(12, -h / 2 + 4, w - 24, 11, 6); c.fill();
  const ix = 27;
  c.fillStyle = '#FFF6E6'; c.beginPath(); c.arc(ix, 1, 16, 0, TAU); c.fill();
  if (icon === 'star') drawHopeStar(c, ix, 1, 10.5, 0, { bob: false, fx: false });
  else {
    c.strokeStyle = theme[1]; c.lineWidth = 3.8; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
    if (icon === 'ok') { c.moveTo(ix - 6, 1); c.lineTo(ix - 1.5, 6); c.lineTo(ix + 6.5, -4); } else { c.moveTo(ix - 5, -4); c.lineTo(ix + 5, 6); c.moveTo(ix + 5, -4); c.lineTo(ix - 5, 6); }
    c.stroke();
  }
  inkText(c, txt, 52, 2, theme[2], 6, '#FFFFFF');
  c.restore();
}

/** ปุ่มอุ้งเท้าวุ้นในวงแหวนลาเวนเดอร์ (ภาพแบบ) · วงแหวนหดเข้าหาวงเป้า · วงนับถอยหลัง · เม็ดเวลาเหนือปุ่ม · คำแนะนำใต้ปุ่ม */
function drawRing2(c, sp, x, y, t, frame, appear0 = 1) {
  if (appear0 <= 0.01) return;
  const aim = sp.ph === 'aim', f = aim ? sp.f : 0, R = 50, now = Math.min(f, sp.tap ?? f);
  const appear = outBack(appear0);
  const near = aim && sp.tap == null && Math.abs(f - HOPE.hit) <= HOPE.good;
  const rrAt = (ff) => (R + 12) * (1 + 1.9 * (HOPE.hit - ff) / HOPE.hit);
  c.save(); c.translate(x, y); c.scale(appear, appear);
  // จานลาเวนเดอร์ใส (วุ้น) สองชั้น
  let g = c.createRadialGradient(0, 0, R, 0, 0, R + 70);
  g.addColorStop(0, 'rgba(214,190,240,.55)'); g.addColorStop(0.75, 'rgba(200,170,236,.45)'); g.addColorStop(1, 'rgba(200,170,236,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R + 70, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, R + 58, 0, TAU); c.stroke();
  // วงตกแต่งหมุน: ประกายเล็กรอบวง
  c.save(); c.rotate(t * 0.5);
  c.fillStyle = 'rgba(255,240,200,.85)';
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; star4(c, Math.cos(a) * (R + 46), Math.sin(a) * (R + 46), i % 3 ? 2 : 3.6, 0.9); }
  c.restore();
  // วงนับถอยหลัง (ชมพูอ่อน → ชมพูเข้มตอนใกล้หมด)
  const left = aim ? clamp(1 - now / HOPE.aim) : 1;
  c.lineCap = 'round'; c.lineWidth = 7; c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(0, 0, R + 30, 0, TAU); c.stroke();
  c.strokeStyle = left > 0.34 ? '#FFB8DA' : '#FF6FA8'; c.beginPath(); c.arc(0, 0, R + 30, -Math.PI / 2, -Math.PI / 2 + TAU * left); c.stroke();
  // วงเป้าขาว (เรืองทองตอนอยู่ในช่วงกด)
  c.save(); c.shadowColor = near ? 'rgba(255,200,80,1)' : 'rgba(255,190,230,.9)'; c.shadowBlur = near ? 22 : 12;
  c.lineWidth = near ? 9 : 7; c.strokeStyle = near ? '#FFE07A' : '#FFFFFF';
  c.beginPath(); c.arc(0, 0, R + 12, 0, TAU); c.stroke(); c.restore();
  // ปุ่มอุ้งเท้าวุ้นชมพู (กดแล้วยุบเด้ง)
  const pk = sp.tap != null ? clamp((f - sp.tap) / 10) : 0, ps = 1 - 0.14 * Math.sin(pk * Math.PI) + (near ? 0.04 * Math.sin(frame * 0.8) : 0);
  c.save(); c.scale(ps, ps);
  c.fillStyle = 'rgba(150,40,110,.25)'; c.beginPath(); c.arc(0, 5, R, 0, TAU); c.fill();
  g = c.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R);
  g.addColorStop(0, '#FF9CCB'); g.addColorStop(0.6, '#F45FA3'); g.addColorStop(1, '#D23F86');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-4, -R * 0.55, R * 0.62, R * 0.24, -0.15, 0, TAU); c.fill();
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.ellipse(0, 10, 16, 13, 0, 0, TAU); c.fill();
  for (const [dx, dy, r] of [[-18, -6, 6.6], [-6.5, -18, 7], [6.5, -18, 7], [18, -6, 6.6]]) { c.beginPath(); c.ellipse(dx, dy, r * 0.85, r, 0, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,170,205,.6)'; c.beginPath(); c.ellipse(0, 12, 8.5, 6.5, 0, 0, TAU); c.fill();
  c.restore();
  // วงแหวนจังหวะ + เงาตาม (ก่อนกด) · ตอนกด = วงกระเพื่อม
  if (aim && sp.tap == null) {
    for (let j = 2; j >= 0; j--) {
      const rr = rrAt(Math.max(0, f - j * 3));
      if (rr < R * 0.6) continue;
      c.lineWidth = j ? 2.5 : 5; c.strokeStyle = near ? `rgba(255,224,122,${j ? 0.35 : 1})` : `rgba(255,255,255,${j ? 0.3 : 0.95})`;
      c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.stroke();
    }
  } else if (aim) {
    const k = clamp((f - sp.tap) / 18), ok = sp.res === 'perfect' || sp.res === 'good';
    for (let i = 0; i < 3; i++) {
      const kk = clamp(k * 1.4 - i * 0.18);
      if (kk > 0 && kk < 1) { c.lineWidth = 4 * (1 - kk) + 1; c.strokeStyle = ok ? `rgba(255,230,140,${1 - kk})` : `rgba(255,140,170,${1 - kk})`; c.beginPath(); c.arc(0, 0, R + 12 + kk * 70, 0, TAU); c.stroke(); }
    }
    if (ok) drawHopeStarBurst(c, 0, 0, k, R * 1.8);
  }
  c.restore();
  // เม็ดเวลา + คำแนะนำ/ผล
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.globalAlpha = appear0;
  c.fillStyle = 'rgba(70,40,100,.55)'; c.beginPath(); c.roundRect(x - 46, y - R - 104, 92, 32, 16); c.fill();
  c.font = '800 19px Mali, sans-serif'; inkText(c, `⏱ ${(left * HOPE.aim / 60).toFixed(1)}`, x, y - R - 87, '#4A1F66', 4, '#FFFFFF');
  if (aim && sp.tap != null) {
    const k = clamp((f - sp.tap) / 9), ok = sp.res === 'perfect' || sp.res === 'good';
    const txt = { perfect: 'เป๊ะ!', good: 'ดี!', early: 'เร็วไป!', late: 'ช้าไป!' }[sp.res];
    const col = sp.res === 'perfect' ? ['#8A4A00', '#FFF3A0'] : sp.res === 'good' ? ['#1E6B4A', '#D8FFE9'] : ['#6E2A44', '#FFD6E2'];
    c.save(); c.translate(x + (ok ? 0 : Math.sin(f * 2.2) * 4 * (1 - k)), y + R + 74); c.scale(outBack(k) * 1.15, outBack(k) * 1.15);
    c.font = '800 34px Mali, sans-serif'; inkText(c, txt, 0, 0, col[0], 6, col[1]);
    if (sp.res === 'perfect') { c.fillStyle = '#FFFFFF'; star4(c, -62, -12, 7, k); star4(c, 62, -14, 6, k); }
    c.restore();
  } else {
    c.font = '800 16px Mali, sans-serif'; inkText(c, near ? 'ตอนนี้!' : 'แตะตอนวงแหวนทับวงพอดี!', x, y + R + 74, near ? '#8A4A00' : '#4A1F66', 5, near ? '#FFF1A8' : '#FFFFFF');
  }
  c.restore();
}

// ══════════════════ ฉากทดลอง (ให้หน้าแล็บ) ══════════════════
/**
 * ฉากตัวอย่างแยกตามผลการกด: แต่ละฉาก = ลำดับเฟส [ph, ความยาวเฟรม] + เฟรมที่กด
 * aim = รอกด (ไม่กด — วนช่วงรวมพลัง+มินิเกม) · perfect/good = กดโดน → ปล่อยพลัง · early/late = กดพลาด → พลาด
 */
export const CUT2_SCENES = {
  aim: { name: 'กดจังหวะ (รอแตะ)', em: '🎯', tap: null, seq: [['cut', HOPE.cut], ['aim', HOPE.aim]] },
  perfect: { name: 'กดเป๊ะ', em: '🌟', tap: HOPE.hit, seq: [['cut', HOPE.cut], ['aim', HOPE.hit + HOPE.judge], ['blast', HOPE.blast]] },
  good: { name: 'กดโดน (ดี)', em: '✅', tap: HOPE.hit + HOPE.good - 2, seq: [['cut', HOPE.cut], ['aim', HOPE.hit + HOPE.good - 2 + HOPE.judge], ['blast', HOPE.blast]] },
  early: { name: 'กดพลาด (เร็วไป)', em: '❌', tap: HOPE.hit - 20, seq: [['cut', HOPE.cut], ['aim', HOPE.hit - 20 + HOPE.judge], ['miss', HOPE.miss]] },
  late: { name: 'ไม่ทัน (หมดเวลา)', em: '⌛', tap: null, res: 'late', seq: [['cut', HOPE.cut], ['aim', HOPE.aim], ['miss', HOPE.miss]] },
};
export const cut2Len = (id) => CUT2_SCENES[id].seq.reduce((a, [, n]) => a + n, 0);
/** เฟรมรวม F ของฉาก id → sp (ส่งให้ drawHopeCut2) */
export function cut2At(id, F, judge) {
  const S = CUT2_SCENES[id];
  let a = Math.max(0, Math.min(cut2Len(id) - 0.001, F));
  for (const [ph, n] of S.seq) {
    if (a < n) {
      const sp = { ph, f: a, tap: null, res: S.res || null };
      if (S.tap != null) { sp.res = judge(S.tap); if (ph === 'aim' && a >= S.tap) sp.tap = S.tap; }
      return sp;
    }
    a -= n;
  }
  return { ph: 'aim', f: 0, tap: null, res: null };
}
