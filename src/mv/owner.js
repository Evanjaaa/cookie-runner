// src/mv/owner.js
// ─────────────────────────────────────────────────────────────
// เจ้าของ — ไม่เห็นหน้าตลอดเรื่อง เห็นแค่มือกับขา จากระดับสายตาของแมว
// ชุดเดิมทั้งเรื่อง: เสื้อไหมพรมเทาอมม่วง · ยีนส์ · รองเท้าแตะหูแมวสีชมพู
// ─────────────────────────────────────────────────────────────

export const OWN = {
  skin: '#F7CFB1',
  skinShade: '#EBB08F',
  line: '#8A5A48',
  sleeve: '#B3A5D2',
  sleeveDark: '#9A8BC0',
  jeans: '#7598CF',
  jeansDark: '#5F81B8',
  slipper: '#FFB3C8',
  slipperDark: '#F48FAE',
};

/**
 * มือ + แขนเสื้อ
 * (x, y) = กลางฝ่ามือ · ang = ทิศจากมือไปหาไหล่ (แขนยื่นออกไปทางนั้นจนพ้นจอ)
 * curl 0..1 = งอนิ้วลง (ตอนลูบ นิ้วโค้งตามหัวแมว) · open = หงายมือ (ยื่นให้ดม)
 */
export function drawHand(ctx, x, y, ang, scale = 1, { curl = 0, open = 0, len = 900 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(scale, scale * (open ? -1 : 1));
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = OWN.line; ctx.lineWidth = 3;

  // แขนเสื้อ — ยาวพ้นจอไปเลย ไม่มีทางเห็นปลายอีกด้าน
  ctx.fillStyle = OWN.sleeve;
  // len = ยาวแค่ถึงไหล่ (ตอนเห็นตัวเจ้าของทั้งตัว) · ค่าตั้งต้นยาวพ้นจอไปเลย
  ctx.beginPath(); ctx.roundRect(30, -27, len, 54, 14); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = OWN.sleeveDark; ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) { const px = 40 + i * 4.5; ctx.beginPath(); ctx.moveTo(px, -24); ctx.lineTo(px, 24); ctx.stroke(); }
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(90 + i * 70, -18); ctx.quadraticCurveTo(110 + i * 70, 0, 90 + i * 70, 18); ctx.stroke(); }

  ctx.strokeStyle = OWN.line; ctx.lineWidth = 3;
  // นิ้ว 4 นิ้ว — ชี้ไปทาง -x (ตรงข้ามกับแขน) โค้งลงตาม curl
  ctx.fillStyle = OWN.skin;
  for (let i = 0; i < 4; i++) {
    const fy = -13 + i * 8.6;
    const len = [30, 34, 32, 26][i];
    ctx.save();
    ctx.translate(-4, fy);
    ctx.rotate(-curl * 0.35 * (i - 1.5) * 0.25);
    ctx.beginPath(); ctx.roundRect(-len, -4.6, len + 8, 9.2, 4.6); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // ฝ่ามือ/หลังมือ
  ctx.beginPath(); ctx.roundRect(-10, -20, 44, 40, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = OWN.skinShade;
  ctx.beginPath(); ctx.ellipse(14, 4, 14, 9, 0, 0, Math.PI * 2); ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
  // นิ้วโป้ง
  ctx.fillStyle = OWN.skin;
  ctx.save(); ctx.translate(14, -18); ctx.rotate(-0.9 - open * 0.3);
  ctx.beginPath(); ctx.roundRect(-4.8, -22, 9.6, 26, 4.8); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.restore();
}

/** เส้นเรียวหัวท้าย (หนาสุดตรงกลาง) ตามเส้นโค้ง a→c ที่มีจุดคุม b — ใช้วาดร่องนิ้ว */
function taper(ctx, a, b, c, w) {
  const N = 16, left = [], right = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    const x = u * u * a[0] + 2 * u * t * b[0] + t * t * c[0];
    const y = u * u * a[1] + 2 * u * t * b[1] + t * t * c[1];
    const dx = 2 * u * (b[0] - a[0]) + 2 * t * (c[0] - b[0]);
    const dy = 2 * u * (b[1] - a[1]) + 2 * t * (c[1] - b[1]);
    const len = Math.hypot(dx, dy) || 1;
    const hw = (w / 2) * Math.pow(Math.sin(Math.PI * t), 0.8);
    left.push([x - (dy / len) * hw, y + (dx / len) * hw]);
    right.push([x + (dy / len) * hw, y - (dx / len) * hw]);
  }
  ctx.beginPath();
  left.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  right.reverse().forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath(); ctx.fill();
}

/**
 * มือตอนลูบหัว — วาดตามภาพอ้างอิงที่ผู้ใช้ส่งมา
 *
 * ── สัดส่วนวัดจากภาพอ้างอิง ──
 * ทุกพิกัดข้างล่างเป็น "หน่วยครึ่งความกว้างหัวแมว" (หัวกว้าง 2 หน่วย) นับจากยอดหัว
 * วัดจากรูปตรง ๆ แล้วคูณด้วย HEAD ตอนวาด มือจึงได้ขนาดเทียบหัวเท่าในรูปเสมอ
 *   ยาวจากปลายนิ้วถึงข้อมือ ≈ 2.7 · หนาตรงกลาง ≈ 0.9
 *   หลังมือเป็นเส้นเฉียงลงซ้ายนุ่ม ๆ ไม่ใช่โดมสูง · อุ้งมือแทบเป็นเส้นตรงวางบนยอดหัว
 *   ปลายนิ้วสองนิ้วมนซ้อนกันที่ข้างหัวด้านซ้าย · ไม่เห็นนิ้วโป้ง (อยู่อีกฝั่งของหัว)
 *
 * (x, y) = ยอดหัวแมว (จุดที่อุ้งมือวาง) · hand = เอียงทั้งมือ (เรเดียน)
 * arm = มุมของแขนจากข้อมือขึ้นไปหาไหล่ (มุมโลก) · cup 0..1 = ปลายนิ้วงุ้มลงแค่ไหน
 * scale = ครึ่งความกว้างหัวแมว (หน่วยโลก)
 */
export function drawPetHand(ctx, x, y, { hand = 0, arm = -0.76, cup = 1, scale = 17, len = 40 } = {}) {
  const K = scale;
  const P = (u, v) => [u * K, v * K];
  const dip = cup * 0.08;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(hand);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const EDGE = K * 0.085;

  // ── แขนเสื้อ ── วาดก่อน ปลอกแขนจึงอยู่หลังข้อมือพอดี (ในรูป ขอบปลอกแขนทับข้อมือ — วาดทับอีกรอบข้างล่าง)
  const sleeve = () => {
    ctx.save();
    ctx.translate(...P(1.08, -0.72));
    ctx.rotate(arm - hand);
    ctx.fillStyle = OWN.sleeve; ctx.strokeStyle = OWN.line; ctx.lineWidth = EDGE;
    ctx.beginPath(); ctx.roundRect(-0.12 * K, -0.62 * K, len * K, 1.24 * K, 0.3 * K); ctx.fill(); ctx.stroke();
    // ปลอกแขนยาง: แถบเข้มกว่า มีเส้นยางขนานไปตามแขน
    ctx.fillStyle = OWN.sleeveDark; ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.roundRect(-0.12 * K, -0.62 * K, 0.95 * K, 1.24 * K, 0.3 * K); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = OWN.sleeveDark; ctx.lineWidth = EDGE * 0.75;
    for (let i = 0; i < 5; i++) { const py = (-0.4 + i * 0.2) * K; ctx.beginPath(); ctx.moveTo(0.02 * K, py); ctx.lineTo(0.72 * K, py); ctx.stroke(); }
    ctx.strokeStyle = OWN.line; ctx.lineWidth = EDGE;
    ctx.beginPath(); ctx.moveTo(0.83 * K, -0.6 * K); ctx.lineTo(0.83 * K, 0.6 * K); ctx.stroke();
    // รอยยับผ้ายาว ๆ
    ctx.strokeStyle = OWN.sleeveDark; ctx.lineWidth = EDGE;
    ctx.beginPath(); ctx.moveTo(1.4 * K, -0.3 * K); ctx.quadraticCurveTo(2.6 * K, -0.1 * K, 4 * K, -0.35 * K); ctx.stroke();
    ctx.restore();
  };

  // ── มือ ──
  ctx.fillStyle = OWN.skin; ctx.strokeStyle = OWN.line; ctx.lineWidth = EDGE;
  ctx.beginPath();
  ctx.moveTo(...P(0.72, -1.1));                                                   // ข้อมือบน
  ctx.bezierCurveTo(...P(0.35, -1.06), ...P(-0.3, -0.96), ...P(-0.76, -0.76));    // หลังมือเฉียงลง
  ctx.bezierCurveTo(...P(-1.05, -0.62), ...P(-1.24, -0.4), ...P(-1.29, -0.1 + dip));
  ctx.quadraticCurveTo(...P(-1.34, 0.16 + dip), ...P(-1.12, 0.19 + dip));        // ปลายนิ้วกลาง
  ctx.quadraticCurveTo(...P(-0.98, 0.2 + dip), ...P(-0.9, 0.1 + dip));
  ctx.bezierCurveTo(...P(-0.6, 0.02), ...P(-0.2, -0.04), ...P(0.2, -0.07));      // อุ้งมือบนยอดหัว
  ctx.bezierCurveTo(...P(0.7, -0.12), ...P(1.1, -0.2), ...P(1.44, -0.42));        // ส้นมือ → ข้อมือล่าง
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // แสงบนสันหลังมือ — ให้มือมีความนูน ไม่ใช่แผ่นสีเรียบ
  ctx.strokeStyle = 'rgba(255,248,240,.55)'; ctx.lineWidth = EDGE * 1.3;
  ctx.beginPath(); ctx.moveTo(...P(0.45, -0.96)); ctx.bezierCurveTo(...P(0.1, -0.95), ...P(-0.35, -0.86), ...P(-0.72, -0.64)); ctx.stroke();

  // เส้นแบ่งนิ้ว — เริ่มที่แนวข้อนิ้ว (ไม่ใช่ลากมาจากข้อมือ) ไปจบที่ร่องระหว่างปลายนิ้วพอดี
  // เป็นเส้นเรียวหัวท้าย หนาตรงกลาง แบบเส้นพู่กัน เส้นหนาเท่ากันตลอดดูเป็นรอยขีด ไม่ใช่ร่องนิ้ว
  ctx.fillStyle = 'rgba(160,100,78,.62)';
  taper(ctx, P(-0.3, -0.6), P(-0.7, -0.38), P(-0.95, 0.07 + dip), EDGE * 0.95);
  taper(ctx, P(-0.16, -0.84), P(-0.78, -0.7), P(-1.15, -0.2 + dip), EDGE * 0.85);
  // รอยข้อนิ้วจาง ๆ ตรงโคนเส้น
  ctx.strokeStyle = 'rgba(160,100,78,.35)'; ctx.lineWidth = EDGE * 0.6;
  for (const [u, v] of [[-0.24, -0.66], [-0.1, -0.88]]) {
    ctx.beginPath(); ctx.arc(u * K, v * K, 0.07 * K, Math.PI * 0.9, Math.PI * 1.6); ctx.stroke();
  }

  // ปลายนิ้วชี้ — ใกล้คนดู โผล่ต่ำกว่าปลายนิ้วกลางนิดหนึ่ง
  ctx.fillStyle = OWN.skin; ctx.strokeStyle = OWN.line; ctx.lineWidth = EDGE;
  ctx.save(); ctx.translate(...P(-0.84, 0.14 + dip)); ctx.rotate(0.25);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.2 * K, 0.14 * K, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = OWN.skin; ctx.beginPath(); ctx.ellipse(0.04 * K, -0.08 * K, 0.18 * K, 0.1 * K, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  sleeve();
  ctx.restore();
}

/**
 * ขาเจ้าของ (ตั้งแต่เข่าขึ้นไปพ้นจอ) + รองเท้าแตะหูแมว
 * x = กลางระหว่างสองเท้า · footY = พื้นที่ยืน · phase = จังหวะก้าว (0..1 ต่อก้าวคู่) · stride = ความยาวก้าว
 * dir = 1 หันขวา / -1 หันซ้าย
 */
export function drawLegs(ctx, x, footY, { phase = 0, stride = 0, dir = 1, scale = 1 } = {}) {
  ctx.save();
  ctx.translate(x, footY);
  ctx.scale(dir * scale, scale);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const HIP = -330;
  // ขาหลังวาดก่อน (เข้มกว่า) ขาหน้าทับ
  for (const [k, back] of [[0.5, true], [0, false]]) {
    const a = Math.sin((phase + k) * Math.PI * 2);
    const footX = a * stride * 0.5 + (back ? -14 : 14);
    const lift = Math.max(0, Math.cos((phase + k) * Math.PI * 2)) * stride * 0.18;
    ctx.fillStyle = back ? OWN.jeansDark : OWN.jeans;
    ctx.strokeStyle = OWN.line; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-34 + (back ? -8 : 8), HIP - 400);
    ctx.lineTo(34 + (back ? -8 : 8), HIP - 400);
    ctx.lineTo(footX + 28, -42 - lift);
    ctx.lineTo(footX - 28, -42 - lift);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // ขากางเกงพับ
    ctx.fillStyle = back ? OWN.jeans : '#8DAEE0';
    ctx.beginPath(); ctx.roundRect(footX - 31, -62 - lift, 62, 22, 6); ctx.fill(); ctx.stroke();
    // ข้อเท้า
    ctx.fillStyle = OWN.skin;
    ctx.beginPath(); ctx.roundRect(footX - 16, -42 - lift, 32, 22, 6); ctx.fill(); ctx.stroke();
    // รองเท้าแตะหูแมว
    ctx.fillStyle = back ? OWN.slipperDark : OWN.slipper;
    ctx.beginPath(); ctx.roundRect(footX - 30, -24 - lift, 92, 26, 13); ctx.fill(); ctx.stroke();
    for (const ex of [34, 52]) {
      ctx.beginPath(); ctx.moveTo(footX + ex - 8, -20 - lift); ctx.lineTo(footX + ex, -36 - lift); ctx.lineTo(footX + ex + 8, -20 - lift); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * เจ้าของนั่งบนโซฟาหันหน้าเข้ากล้อง ถือหนังสือบังหน้าไว้ (ฉาก 6)
 *
 * ── ทำไมถือหนังสือบังหน้า ──
 * ช็อตสุดท้ายต้องถอยกว้างให้เห็นทั้งห้อง (เบาะใต้หน้าต่าง กล่อง โซฟา) ซึ่งกว้างพอจะเห็นหัวคนนั่ง
 * บรีฟบอกว่าไม่ต้องเปิดเผยหน้า — หนังสือที่ยกอ่านตอนเช้าบังหน้าได้อย่างเป็นธรรมชาติ
 * และบอกอารมณ์ "เช้าวันหยุดสบาย ๆ" ไปในตัว
 *
 * x = กลางตัว · seat = ระดับเบาะนั่ง · floor = พื้นที่วางเท้า
 * คืนตำแหน่งไหล่ขวา (ฝั่งแมว) ให้ฉากลากแขนลูบหัวแมวออกจากไหล่พอดี
 */
export function drawOwnerSeated(ctx, x, seat, floor, { page = 0 } = {}) {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = OWN.line; ctx.lineWidth = 3;
  // ── ขา: เข่าอยู่ขอบเบาะ หน้าแข้งห้อยลงถึงพื้น เท้าหันเข้ากล้อง ──
  for (const s of [-1, 1]) {
    const kx = x + s * 34;
    ctx.fillStyle = s < 0 ? OWN.jeansDark : OWN.jeans;
    ctx.beginPath(); ctx.roundRect(kx - 26, seat + 6, 52, floor - seat - 40, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8DAEE0';
    ctx.beginPath(); ctx.roundRect(kx - 28, floor - 50, 56, 20, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = OWN.skin;
    ctx.beginPath(); ctx.roundRect(kx - 15, floor - 32, 30, 16, 6); ctx.fill(); ctx.stroke();
    // รองเท้าแตะหูแมว มองจากด้านหน้า
    ctx.fillStyle = OWN.slipper;
    ctx.beginPath(); ctx.ellipse(kx, floor - 8, 34, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    for (const ex of [-14, 14]) {
      ctx.beginPath(); ctx.moveTo(kx + ex - 8, floor - 18); ctx.lineTo(kx + ex, floor - 34); ctx.lineTo(kx + ex + 8, floor - 18); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // เข่า (ต้นขาชี้เข้ากล้อง เห็นเป็นก้อนเข่ามน ๆ บนขอบเบาะ)
    ctx.fillStyle = s < 0 ? OWN.jeansDark : OWN.jeans;
    ctx.beginPath(); ctx.ellipse(kx, seat + 8, 32, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // ── ลำตัว (เสื้อไหมพรม) ──
  const top = seat - 200;
  ctx.fillStyle = OWN.sleeve;
  ctx.beginPath(); ctx.roundRect(x - 78, top, 156, 200, [46, 46, 20, 20]); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = OWN.sleeveDark; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 60, seat - 12); ctx.lineTo(x + 60, seat - 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 30, top + 20); ctx.quadraticCurveTo(x, top + 34, x + 30, top + 20); ctx.stroke();
  // ── หัว (ผม) ── หน้าอยู่หลังหนังสือ เห็นแค่ผมกับหู
  const hy = top - 44;
  ctx.strokeStyle = OWN.line; ctx.lineWidth = 3;
  ctx.fillStyle = OWN.skin;
  ctx.beginPath(); ctx.roundRect(x - 16, top - 14, 32, 22, 6); ctx.fill(); ctx.stroke();      // คอ
  ctx.fillStyle = '#5A3A32';
  ctx.beginPath(); ctx.ellipse(x, hy, 50, 54, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + 22, hy - 50, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();  // มวยผม
  // ── หนังสือที่ยกขึ้นอ่าน (บังหน้า) + มือซ้ายถือ ──
  const bx = x - 6, by = hy + 14;
  ctx.fillStyle = '#F7A9BB';
  ctx.beginPath(); ctx.roundRect(bx - 66, by - 46, 132, 92, 8); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(122,82,66,.6)';
  ctx.beginPath(); ctx.moveTo(bx, by - 46); ctx.lineTo(bx, by + 46); ctx.stroke();
  // หน้าหนังสือขยับตอนพลิก
  if (page > 0) {
    ctx.fillStyle = '#FFF8EE'; ctx.strokeStyle = OWN.line;
    ctx.beginPath(); ctx.moveTo(bx, by - 42); ctx.lineTo(bx - 60 * (1 - page), by - 42 - page * 6); ctx.lineTo(bx - 60 * (1 - page), by + 40); ctx.lineTo(bx, by + 42); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // รูปแมวบนปกหลังหนังสือ
  ctx.fillStyle = '#FFE3EC';
  ctx.beginPath(); ctx.arc(bx + 33, by + 4, 16, 0, Math.PI * 2); ctx.fill();
  for (const ex of [-1, 1]) { ctx.beginPath(); ctx.moveTo(bx + 33 + ex * 6, by - 8); ctx.lineTo(bx + 33 + ex * 15, by - 20); ctx.lineTo(bx + 33 + ex * 15, by - 4); ctx.closePath(); ctx.fill(); }
  // แขนซ้าย (ฝั่งไกลแมว) ถือหนังสือ
  ctx.strokeStyle = OWN.line; ctx.lineWidth = 3;
  ctx.fillStyle = OWN.sleeve;
  ctx.beginPath(); ctx.moveTo(x - 70, top + 30); ctx.quadraticCurveTo(x - 110, top + 60, bx - 64, by + 30); ctx.lineTo(bx - 52, by + 44); ctx.quadraticCurveTo(x - 86, top + 90, x - 54, top + 60); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = OWN.skin;
  for (const [fx, fy] of [[bx - 70, by - 6], [bx - 70, by + 8], [bx - 68, by + 22]]) { ctx.beginPath(); ctx.ellipse(fx, fy, 8, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.restore();
  return { x: x + 64, y: top + 34 };   // ไหล่ขวา
}
