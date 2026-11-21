/**
 * ดาวแห่งความหวัง — ของสะสมในด่านวิ่ง/ด่านบอส (เก็บครบ = แถบความหวังเต็ม บอสเหนื่อย)
 * ผู้ใช้ 22 พ.ย. 2026: "อัปเกรดดาวแห่งความหวังให้เด่นชัดขึ้น" · วาดสดด้วยโค้ด ไม่มีเส้นขอบ (กฎ no-outline) นูนด้วยแสงเงาในเนื้อ
 *
 * drawHopeStar(ctx, x, y, r, t, o) — r = รัศมีปลายแฉก (px) · t = วินาที
 *   o.seed  ให้แต่ละดวงขยับไม่พร้อมกัน (ใช้ตำแหน่งโลกของดวงนั้นก็ได้)
 *   o.bob   false = ไม่ลอยขึ้นลง · o.fx false = ไม่มีออร่า/ลำแสง/ประกาย (ไอคอนเล็กบนแถบ) · o.pop 0..1 เด้งขยายตอนเพิ่งได้ดาว
 * drawHopeStarBurst(ctx, x, y, k, r) — แสงวาบ + วงแหวน + ประกายแตกตอนเก็บ (k 0..1)
 */
const TAU = Math.PI * 2;

function star4(c, x, y, r, a = 1) {
  if (a <= 0.01) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y);
  c.beginPath();
  for (let i = 0; i < 8; i++) { const ang = (i / 8) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.28 : r; c.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); }
  c.closePath(); c.fill(); c.restore();
}

/** ดาว 5 แฉกปลายมนอ้วน ๆ (มุมทุกจุดโค้งมน โคนแฉกโค้งนุ่มกว่า) */
function starPath(r, inner = 0.52, round = 0.3, ox = 0, oy = 0, p = new Path2D()) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? r * inner : r; pts.push([ox + Math.cos(a) * rr, oy + Math.sin(a) * rr]); }
  const lp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  for (let i = 0; i < 10; i++) {
    const prev = pts[(i + 9) % 10], cur = pts[i], next = pts[(i + 1) % 10], k = i % 2 ? round * 0.55 : round;
    const a = lp(cur, prev, k), b = lp(cur, next, k);
    if (i === 0) p.moveTo(a[0], a[1]); else p.lineTo(a[0], a[1]);
    p.quadraticCurveTo(cur[0], cur[1], b[0], b[1]);
  }
  p.closePath();
  return p;
}

export function drawHopeStar(ctx, x, y, r, t = 0, o = {}) {
  const seed = o.seed || 0, fx = o.fx !== false;
  const bob = o.bob === false ? 0 : Math.sin(t * 2.2 + seed * 0.7) * r * 0.22;
  const pulse = 1 + Math.sin(t * 4.2 + seed) * 0.05 + (o.pop || 0) * 0.4;
  ctx.save();
  ctx.translate(x, y + bob);
  if (fx) {
    // ออร่าสองชั้น: ทองอุ่นด้านใน · ชมพูจางด้านนอก → ตัดกับฉากม่วงพาสเทลและผงแสงเหลืองในฉาก
    let g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.9);
    const br = 0.85 + 0.15 * Math.sin(t * 3.1 + seed);
    g.addColorStop(0, `rgba(255,236,150,${0.75 * br})`); g.addColorStop(0.35, `rgba(255,190,84,${0.32 * br})`);
    g.addColorStop(0.7, 'rgba(255,146,188,.12)'); g.addColorStop(1, 'rgba(255,146,188,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.9, 0, TAU); ctx.fill();
    // ลำแสง 8 แฉกหมุนช้า (ยาว–สั้นสลับ)
    ctx.save(); ctx.rotate(t * 0.6 + seed);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU, len = r * (i % 2 ? 1.9 : 2.75) * (0.9 + 0.1 * Math.sin(t * 3 + i));
      g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
      g.addColorStop(0, 'rgba(255,248,206,.6)'); g.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, len, a - 0.12, a + 0.12); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  ctx.save();
  ctx.scale(pulse, pulse); ctx.rotate(Math.sin(t * 1.6 + seed) * 0.12);
  const body = starPath(r);
  // เงาอุ่นเยื้องขวาล่าง (นูนออกจากฉาก ไม่ใช่เส้นขอบ)
  ctx.fillStyle = 'rgba(212,104,40,.32)'; ctx.fill(starPath(r, 0.52, 0.3, r * 0.05, r * 0.12));
  let g = ctx.createLinearGradient(-r * 0.5, -r, r * 0.5, r);
  g.addColorStop(0, '#FFF6BE'); g.addColorStop(0.45, '#FFD456'); g.addColorStop(1, '#FF9E36');
  ctx.fillStyle = g; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  // เนื้อนูน: ขอบล่างขวาเข้มเป็นเสี้ยว · ดาวในสว่างค่อนซ้ายบน
  const minus = new Path2D(); minus.rect(-r * 2, -r * 2, r * 4, r * 4); starPath(r, 0.52, 0.3, -r * 0.1, -r * 0.15, minus);
  ctx.fillStyle = 'rgba(255,122,36,.3)'; ctx.fill(minus, 'evenodd');
  ctx.fillStyle = 'rgba(255,250,216,.55)'; ctx.fill(starPath(r * 0.56, 0.5, 0.36, -r * 0.08, -r * 0.1));
  ctx.restore();
  // เงาวาว + ประกายในเนื้อ
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.ellipse(-r * 0.26, -r * 0.36, r * 0.17, r * 0.09, -0.6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; star4(ctx, r * 0.3, -r * 0.16, r * 0.22, 0.55 + 0.45 * Math.sin(t * 5 + seed));
  ctx.restore();
  if (fx) {
    for (let i = 0; i < 3; i++) {             // ประกายวนรอบดวง
      const a = t * 1.8 + seed + (i / 3) * TAU;
      ctx.fillStyle = i === 1 ? '#FFC6E4' : '#FFFFFF';
      star4(ctx, Math.cos(a) * r * 1.65, Math.sin(a) * r * 0.75 - r * 0.1, r * 0.2, 0.45 + 0.55 * Math.max(0, Math.sin(t * 4 + i * 2)));
    }
    for (let i = 0; i < 4; i++) {             // ผงประกายร่วงใต้ดาว (มองเห็นจากไกล)
      const u = (t * 0.9 + i / 4 + seed * 0.13) % 1;
      ctx.fillStyle = i % 2 ? '#FFE9A0' : '#FFFFFF';
      star4(ctx, Math.sin(u * 5 + i * 2 + seed) * r * 0.5, r * 0.9 + u * r * 1.6, r * 0.14 * (1 - u) + 0.6, (1 - u) * 0.9);
    }
  }
  ctx.restore();
}

/** ตอนเก็บดาว: แสงวาบ · วงแหวนแสงนุ่ม · ประกายแตกกระจาย (k 0..1) */
export function drawHopeStarBurst(ctx, x, y, k, r = 14) {
  if (k >= 1) return;
  const a = 1 - k, e = 1 - (1 - k) ** 2;
  ctx.save(); ctx.translate(x, y);
  let g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * (1.5 + k * 3));
  g.addColorStop(0, `rgba(255,255,240,${0.9 * a})`); g.addColorStop(0.4, `rgba(255,220,120,${0.5 * a})`); g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * (1.5 + k * 3), 0, TAU); ctx.fill();
  const R = r * (1 + e * 3), th = r * 0.55 * a + 1;
  g = ctx.createRadialGradient(0, 0, Math.max(0, R - th), 0, 0, R + th * 0.4);
  g.addColorStop(0, 'rgba(255,222,128,0)'); g.addColorStop(0.7, `rgba(255,222,128,${0.85 * a})`); g.addColorStop(1, 'rgba(255,222,128,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R + th * 0.4, 0, TAU); ctx.fill();
  for (let i = 0; i < 10; i++) {
    const an = (i / 10) * TAU + 0.3, d = r * (0.6 + e * 3.2);
    ctx.fillStyle = i % 3 ? '#FFE48A' : i % 2 ? '#FFFFFF' : '#FFC6E4';
    star4(ctx, Math.cos(an) * d, Math.sin(an) * d, r * 0.3 * a + 1, a);
  }
  ctx.restore();
}
