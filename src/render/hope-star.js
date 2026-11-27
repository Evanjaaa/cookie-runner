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

// ═════════════ ดาวร่วงจากฟ้า (ผู้ใช้ 28 พ.ย.) ═════════════
// "ดาวแห่งความหวังของเพื่อนแมว ต้องต่างจากของกิน: ร่วงลงมาจากฟ้าสวย ๆ วิ้ง แล้วเรียงเป็นแถวให้เก็บ"
// ดาวพุ่งลงจากขวาบนเป็นดาวตก (หางแสงทอง→ชมพู + ผงประกาย หมุนตัว) ชะลอเข้าที่ → เด้งนิด วงแสงวิ้ง → ออร่าเรืองขึ้น ลอยรอเก็บ
// ดาวในแถวเดียวกันเริ่มร่วงห่างกันไม่กี่เฟรม (ตามระยะห่างในแถว) จึงตกลงมาเรียงทีละดวงเป็นจังหวะ
// หน้าเกมนับ ft (เฟรมตั้งแต่เริ่มร่วง) เอง → ย้อนเวลา/เล่นซ้ำได้ภาพเดิม
export const HOPE_FALL = {
  T: 50,          // เฟรมที่ใช้ร่วงจนเข้าที่
  ready: 0.78,    // เก็บได้ตั้งแต่ร่วงไปแล้วเท่านี้ (เกือบถึงที่ — กันเก็บกลางฟ้าตอนกระโดดสูงพอดี)
  from: 180,      // เริ่มจากขวาของจุดลงกี่ px
  top: -60,       // เริ่มที่ความสูงนี้ (เหนือขอบจอ)
  settle: 26,     // เฟรมหลังลงจอด: เด้ง + วงแสง + ออร่าค่อยเรืองขึ้น
};
const fr = (v) => v - Math.floor(v);

/** ตำแหน่งดาวตอนร่วง · (tx, ty) = จุดลง (พิกัดจอตอนนี้) · ft = เฟรมตั้งแต่เริ่มร่วง → { x, y, rot, sc, k, land } */
export function hopeFallAt(tx, ty, ft, seed = 0) {
  const { T, from, top, settle } = HOPE_FALL;
  const k = Math.max(0, Math.min(1, ft / T)), u = 1 - k;
  const dx = from + 50 * fr(seed * 3.7);
  const x = tx + dx * u * u;                       // แนวนอนชะลอเร็ว → ทางโค้งลงเหมือนดาวตก
  let y = top + (ty - top) * (1 - u * u * u);
  const land = ft - T;
  if (land >= 0 && land < settle) { const q = land / settle; y -= Math.sin(q * Math.PI) * 6 * (1 - q); }   // เด้งนิดตอนลง
  const spin = (fr(seed * 1.3) > 0.5 ? 1 : -1) * 2.4;
  return { x, y, rot: spin * u * u, sc: 0.92 + 0.08 * k + (land >= 0 && land < 12 ? 0.22 * (1 - land / 12) : 0), k, land };
}

/** วาดดาวที่กำลังร่วง/เพิ่งลง/ลอยรอ · r = รัศมีดาว · t = วินาที (ประกาย) · คืนตำแหน่งจริง {x, y} ไว้เช็คชน */
export function drawHopeStarFall(ctx, tx, ty, ft, t, seed = 0, r = 13) {
  if (ft < 0) return null;
  const P = hopeFallAt(tx, ty, ft, seed), { settle } = HOPE_FALL;
  if (P.k < 1) {
    // หางดาวตก: เส้นแสงเรียวตามทางที่เพิ่งผ่าน — ฟุ้งชมพูด้านนอก + แกนทองขาวด้านใน (หัวกว้าง ปลายเรียว)
    const n = 16, pts = [];
    for (let j = 0; j <= n; j++) { const f = ft - j * 1.5; if (f < 0) break; const q = hopeFallAt(tx, ty, f, seed); pts.push([q.x, q.y]); }
    const fade = Math.min(1, ft / 5) * (1 - Math.max(0, (P.k - 0.86) / 0.14));   // ใกล้ถึงที่ หางหดหาย
    ctx.save(); ctx.lineCap = 'round';
    for (const [wk, col, al] of [[2.3, '255,168,214', 0.32], [1.25, '255,226,140', 0.75], [0.5, '255,255,240', 0.95]]) {
      for (let j = 0; j < pts.length - 1; j++) {
        const u = j / n;
        ctx.strokeStyle = `rgba(${col},${al * (1 - u) * fade})`; ctx.lineWidth = Math.max(0.5, r * wk * (1 - u) * 0.62);
        ctx.beginPath(); ctx.moveTo(pts[j][0], pts[j][1]); ctx.lineTo(pts[j + 1][0], pts[j + 1][1]); ctx.stroke();
      }
    }
    ctx.restore();
    // ผงประกายหลุดจากหาง ค้างกลางฟ้าแล้วจางร่วง
    for (let i = 0; i < 12; i++) {
      const born = i * 3.4 + fr(seed + i * 0.37) * 3, age = ft - born;
      if (age < 0 || age > 22) continue;
      const q = hopeFallAt(tx, ty, born, seed), a = 1 - age / 22;
      const ox = (fr(seed * 7 + i * 1.7) - 0.5) * 18, oy = (fr(seed * 5 + i * 2.3) - 0.5) * 14 + age * 0.5;
      ctx.fillStyle = i % 3 === 0 ? '#FFC6E4' : i % 3 === 1 ? '#FFFFFF' : '#FFE48A';
      star4(ctx, q.x + ox, q.y + oy, (3.2 + 1.8 * fr(i * 3.1)) * a + 0.6, a);
    }
    // แสงนำหน้าตัวดาว
    const g = ctx.createRadialGradient(P.x, P.y, 1, P.x, P.y, r * 2.2);
    g.addColorStop(0, 'rgba(255,250,220,.75)'); g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(P.x, P.y, r * 2.2, 0, TAU); ctx.fill();
  }
  // ตัวดาว: ออร่าเรืองขึ้นหลังลง (ระหว่างร่วงมีแค่แสงนำ) · ลอยขึ้นลงค่อย ๆ เริ่ม ไม่กระตุก
  const settled = P.land >= 0 ? Math.min(1, P.land / settle) : 0;
  const bob = Math.sin(t * 2.2 + seed * 0.7) * r * 0.22 * settled;
  ctx.save(); ctx.translate(P.x, P.y + bob); ctx.rotate(P.rot); ctx.scale(P.sc, P.sc);
  if (settled > 0 && settled < 1) { ctx.save(); ctx.globalAlpha *= settled; drawHopeStar(ctx, 0, 0, r, t, { seed, bob: false }); ctx.restore(); drawHopeStar(ctx, 0, 0, r, t, { seed, bob: false, fx: false }); }
  else drawHopeStar(ctx, 0, 0, r, t, { seed, bob: false, fx: settled >= 1 });
  ctx.restore();
  // ลงจอด: วงแสงขยาย + ประกายวิ้งสี่ทิศ
  if (P.land >= 0 && P.land < 22) {
    const q = P.land / 22, a = 1 - q, R = r * (1 + q * 2.4);
    ctx.save(); ctx.strokeStyle = `rgba(255,236,170,${0.85 * a})`; ctx.lineWidth = 2.4 * a + 0.5;
    ctx.beginPath(); ctx.ellipse(P.x, P.y, R, R * 0.8, 0, 0, TAU); ctx.stroke(); ctx.restore();
    for (let i = 0; i < 4; i++) {
      const an = (i / 4) * TAU + 0.4, d = r * (1.1 + q * 1.6);
      ctx.fillStyle = i % 2 ? '#FFFFFF' : '#FFE48A';
      star4(ctx, P.x + Math.cos(an) * d, P.y + Math.sin(an) * d * 0.8, r * 0.45 * a + 1, a);
    }
    ctx.fillStyle = '#FFFFFF'; star4(ctx, P.x + r * 0.9, P.y - r * 1.1, r * 0.7 * Math.sin(q * Math.PI), Math.sin(q * Math.PI));
  }
  return { x: P.x, y: P.y + bob, ready: P.k >= HOPE_FALL.ready };
}
