// src/render/faces.js
// ─────────────────────────────────────────────────────────────
// ตัววาดหน้าน้องแมวจากกล่อง — ชุดเดียวใช้กับทั้ง 30 หน้า (ข้อมูลหน้าอยู่ใน src/faces.js)
//
// ทุกฟังก์ชันวาดในพิกัดของหัว (กลางหัว 0,0 รัศมี 13 — ระบบเดียวกับ drawCatHead)
// drawCatHead เรียกแต่ละชิ้นตรงลำดับชั้นของมันเอง (หู → หัว → ขนปุย → ลาย → ปาก → ตา → จมูก → ปาก → หนวด)
// จึงไม่มีโค้ดวาดตัวแมวซ้ำเลย — ตัว ขา หาง ท่าทาง ใช้ของเดิมทั้งหมด
// ─────────────────────────────────────────────────────────────

/** ตำแหน่งกลางตาสองข้าง — ตรงกับหน้าเดิม (หน้าหันขวานิดหนึ่ง ตาขวาห่างกลางกว่า) */
const EYES = [[-5, -1], [7, -1]];

const edge = (s) => s.line || '#5C3B26';

// ── หู ──────────────────────────────────────────────────────

/**
 * ปรับรูปหูตามหน้า — ขนาด ฐานกว้าง เอียง (คืนชุดจุดใหม่ ไม่แก้ของเดิม)
 * ears = [[โคนนอก/ใน, โคนอีกข้าง, ปลาย] × 2] แบบเดียวกับใน drawCatHead
 */
export function faceEars(ears, F) {
  const E = F?.ear;
  if (!E) return ears;
  return ears.map(([a, b, tip], i) => {
    const out = i === 0 ? -1 : 1;
    const base = (E.base || 1) - 1;
    const na = [a[0] + (i === 0 ? -1 : 0) * base * 5, a[1]];
    const nb = [b[0] + (i === 1 ? 1 : 0) * base * 5, b[1]];
    const mx = (na[0] + nb[0]) / 2;
    const my = (na[1] + nb[1]) / 2;
    const k = (E.size || 1) * (E.tip === 'sharp' ? 1.08 : 1);
    const tilt = (E.tilt?.[i] || 0) * out;
    return [na, nb, [mx + (tip[0] - mx) * k + tilt * 3.5, my + (tip[1] - my) * k + Math.abs(tilt) * 1.2]];
  });
}

/** ทางเดินขอบหูหนึ่งข้าง — ปลายมนใช้เส้นโค้งแทนมุมแหลม */
export function earPath(ctx, a, b, tip, F) {
  const round = F?.ear?.tip === 'round';
  ctx.moveTo(a[0], a[1]);
  if (!round) {
    ctx.lineTo(tip[0], tip[1]);
  } else {
    const t = 0.72;
    ctx.lineTo(a[0] + (tip[0] - a[0]) * t, a[1] + (tip[1] - a[1]) * t);
    ctx.quadraticCurveTo(tip[0], tip[1], b[0] + (tip[0] - b[0]) * t, b[1] + (tip[1] - b[1]) * t);
  }
  ctx.lineTo(b[0], b[1]);
  ctx.closePath();
}

/** ขนฟูปลายหู (หน้าปุย) — ปอยขนสองเส้นโผล่จากปลายหู */
export function earFluff(ctx, s, ears, F) {
  if (!F?.ear?.fluffy) return;
  ctx.save();
  ctx.strokeStyle = s.cat;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const [, , tip] of ears) {
    ctx.beginPath();
    ctx.moveTo(tip[0], tip[1] + 2); ctx.lineTo(tip[0] - 1.5, tip[1] - 2.5);
    ctx.moveTo(tip[0], tip[1] + 2); ctx.lineTo(tip[0] + 1.6, tip[1] - 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ── ทรงหัว: แก้มป่อง / ปอยขนข้างแก้ม / ขนฟูรอบหัว / ปอยหน้าผาก ─────

/**
 * วาดก้อนขนยื่นออกนอกวงหัว (แก้มป่อง ปอยขน) ให้กลืนเป็นเนื้อเดียวกับหัว:
 *   1) ตีเส้นขอบของก้อน เฉพาะส่วนที่อยู่นอกวงหัว
 *   2) เติมสีขนทั้งก้อน — ทับเส้นขอบหัวเดิมที่ลากผ่านใต้ก้อน (เส้นนั้นอยู่ในหน้า ต้องหายไป)
 * ความหนาเส้นเท่าขอบหัว (edgeW = CAT_EDGE) ทั้งหัวจึงเป็นเส้นชุดเดียวกัน
 * (เคยใช้ 2 ซึ่งหนากว่าขอบหัวสามเท่า แก้มป่องกับปอยขนเลยกลายเป็นก้อนสีเข้ม)
 */
function bulge(ctx, s, edgeW, path) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(-40, -40, 80, 80);
  ctx.arc(0, 0, 13, 0, Math.PI * 2, true);
  ctx.clip('evenodd');
  ctx.strokeStyle = edge(s);
  ctx.lineWidth = edgeW * 2;   // ครึ่งในถูกสีขนทับ เหลือหนาเท่าขอบหัวพอดี
  ctx.lineJoin = 'round';
  path(); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = s.cat;
  path(); ctx.fill();
}

/** ปอยขนแหลมยื่นออกจากขอบหัว ณ มุม a (เรเดียน) — ฐานอยู่บนขอบหัว ปลายยื่นออก len */
function spike(ctx, a, len, half) {
  const R = 12.6;
  ctx.lineTo(Math.cos(a - half) * R, Math.sin(a - half) * R);
  ctx.lineTo(Math.cos(a) * (R + len), Math.sin(a) * (R + len));
  ctx.lineTo(Math.cos(a + half) * R, Math.sin(a + half) * R);
}

export function faceShape(ctx, s, F, edgeW = 0.62) {
  if (!F) return;
  // แก้มป่อง: ก้อนรีสองข้างล่างหัว ยื่นออกพ้นขอบหัวนิดเดียว
  const p = F.puff || 0;
  if (p > 0) {
    for (const [x, d] of [[-8.6, -1], [10.6, 1]]) {
      bulge(ctx, s, edgeW, () => { ctx.beginPath(); ctx.ellipse(x + d * p * 1.4, 5.6, 4.8 + p * 1.2, 4 + p * 0.6, 0, 0, Math.PI * 2); });
    }
  }
  // ปอยขนข้างแก้ม — ขนแหลมเรียงลงมาตามข้างแก้ม (1-3 ปอย)
  const n = F.tufts || 0;
  if (n > 0) {
    for (const side of [-1, 1]) {
      bulge(ctx, s, edgeW, () => {
        ctx.beginPath();
        ctx.moveTo(side * 4, 0);
        for (let i = 0; i < n; i++) {
          const deg = 16 + i * 17;   // ใต้แนวนอนลงไปทีละช่วง
          const a = side < 0 ? Math.PI - (deg * Math.PI) / 180 : (deg * Math.PI) / 180;
          spike(ctx, a, 3.2 - i * 0.4, 0.16);
        }
        ctx.lineTo(side * 4, 8);
        ctx.closePath();
      });
    }
  }
  // ขนฟูรอบหัว (หน้าปุยที่สุด) — ขนแหลมเล็ก ๆ รอบหัวช่วงข้างกับบน
  if (F.fluff) {
    bulge(ctx, s, edgeW, () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i = 0; i < 9; i++) spike(ctx, Math.PI * (0.92 + i * 0.13), 2.6, 0.12);
      ctx.closePath();
    });
  }
}

/** ปอยขนกลางหน้าผาก — ลูกแมววาดอยู่แล้ว (ดู drawCatHead) ตรงนี้สำหรับหน้าที่มี crown */
export function faceCrown(ctx, s, F, catEdge) {
  const c = F?.crown || 0;
  if (!c) return;
  const h = 3 + c * 3;
  const path = () => {
    ctx.moveTo(-3.5, -11.8);
    ctx.quadraticCurveTo(-4, -12 - h, -1, -12 - h * 0.8);
    ctx.quadraticCurveTo(0.5, -12 - h * 1.25, 2.5, -12 - h * 0.75);
    ctx.quadraticCurveTo(5, -12 - h * 0.9, 4.5, -11.8);
  };
  ctx.fillStyle = s.cat;
  ctx.beginPath(); path(); ctx.closePath(); ctx.fill();
  catEdge(ctx, s);
  ctx.beginPath(); path(); ctx.stroke();
}

// ── ลายหน้าผาก / ลายแก้ม ─────────────────────────────────────

export function faceMarks(ctx, s, F) {
  if (!F) return false;
  const m = F.marks;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = s.dark;
  let drew = false;
  if (s.stripes && m && m.startsWith('tabby')) {
    drew = true;
    if (m === 'tabbySoft' || m === 'tabbyCurved') {
      // โค้งตามทรงหน้าผาก
      ctx.lineWidth = m === 'tabbySoft' ? 1.8 : 2.2;
      for (const [x, k] of [[-4.5, -1], [1, 0], [6.5, 1]]) {
        ctx.beginPath(); ctx.moveTo(x - k * 1.4, -11.5); ctx.quadraticCurveTo(x + k * 1.6, -9, x + k * 0.6, -6); ctx.stroke();
      }
    } else if (m === 'tabbyFine') {
      ctx.lineWidth = 1.5;
      for (const x of [-3.5, 1, 5.5]) { ctx.beginPath(); ctx.moveTo(x, -11.6); ctx.lineTo(x + 0.4, -7.4); ctx.stroke(); }
    } else {
      // ลายตัว M ชัด ๆ
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, -6.5); ctx.lineTo(-4, -11.5); ctx.lineTo(1, -7.5); ctx.lineTo(5.5, -11.5); ctx.lineTo(8, -6.5);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1, -12.4); ctx.lineTo(1, -9.8); ctx.stroke();
    }
  } else if (m === 'fur') {
    // ขีดขนจาง ๆ บนหน้าผาก (สายที่ไม่มีลาย)
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-0.5, -12.2); ctx.lineTo(0, -9.4); ctx.moveTo(2.5, -12); ctx.lineTo(2.4, -9.8); ctx.stroke();
    drew = !!s.stripes;
  }
  if (F.cheekMarks) {
    ctx.globalAlpha = s.stripes ? 1 : 0.55;
    ctx.lineWidth = s.stripes ? 1.8 : 1.3;
    for (const [x, d] of [[-12.4, 1], [14.4, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, 1); ctx.lineTo(x + d * 3.2, 2.2); ctx.moveTo(x, 4); ctx.lineTo(x + d * 3, 4.6); ctx.stroke();
    }
  }
  ctx.restore();
  return drew;
}

// ── ตา ──────────────────────────────────────────────────────

function eyePath(ctx, shape, w, h) {
  ctx.beginPath();
  if (shape === 'almond') {
    // อัลมอนด์แบบมน — รีแนวนอน หัวตา/หางตามน ไม่มีมุมแหลม
    // (มุมแหลมทำให้หน้าดูเจ้าเล่ห์ สายตาค้อน ซึ่งไม่ใช่โทนน่ารักของเกม)
    ctx.ellipse(0, 0, w, h * 0.92, 0, 0, Math.PI * 2);
  } else {
    ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
  }
}

/**
 * ตาหน้าตาปกติตามข้อมูลหน้า — สีตา ตาดำ ประกาย เปลือกตา ขนตา
 * @param ageK ลูกแมวตาโตกว่าตัวโต (1 = โตเต็มวัย)
 * @param gx   ตาดำเลื่อนตามทิศที่มอง (−1.7..1.7) แบบเดียวกับหน้าเดิม
 */
export function faceEyes(ctx, s, F, gx, ageK = 1, { mood = '', age = null } = {}) {
  const baby = age === 'baby';
  const glad = mood === 'happy' || mood === 'starry';
  // ── ลูกแมว: น่ารักแบบเด็กเสมอ ── ตากลมโต ไม่มีเปลือกตาปิด ไม่หยี ไม่เฉียง ตาดำโตมาก
  // บุคลิกของหน้ายังอยู่ที่สีตา ทรงหู จมูก ลาย ปาก — แต่ตาเป็นตาเด็กเสมอ
  // ดีใจ/ตาเป็นประกาย: ตาเปิดเต็ม (ไม่ปรือ) ประกายเยอะขึ้น / ยิ้มมั่นใจ: ปรือลงนิดหนึ่ง
  const src = F.eye || {};
  const e = baby
    ? { ...src, shape: 'round', lid: 0, asym: 0, uneven: 0, tilt: 0, line: 0, look: [0, 0], pr: Math.max(0.64, src.pr || 0), shine: 3 }
    : glad ? { ...src, lid: 0, asym: 0, shape: src.shape === 'half' ? 'round' : src.shape, shine: 3, pr: Math.max(0.6, src.pr || 0) }
      : mood === 'smug' ? { ...src, lid: Math.max(0.5, src.lid || 0) } : src;
  // ── ปรับให้น่ารักเสมอ (ใช้กับทุกหน้า) ──
  // ข้อมูลหน้าบอก "บุคลิก" ส่วนตรงนี้คุมไม่ให้บุคลิกแรงจนหน้าดูตลก/บึ้ง:
  // ตาโตขึ้น อัลมอนด์ไม่แคบเกิน หางตาเฉียงแค่ครึ่งเดียว เปลือกตาปิดไม่เกินหนึ่งในสาม
  // ตาหยี/ตาไม่เท่ากันเหลือครึ่งเดียว — อ่านออกว่าขี้เล่น แต่ไม่ดูเบี้ยว
  EYES.forEach(([ex, ey], i) => {
    const side = i === 0 ? -1 : 1;
    const shape = e.shape === 'half' ? 'round' : (e.shape || 'round');
    const r = (e.r || 3) * 1.1 * ageK * (i === 0 ? 1 + (e.uneven || 0) * 0.45 : 1);
    // อัลมอนด์แบบ "มน" — กว้างกว่ากลมนิดเดียว ไม่แคบจนดูเหล่
    const w = shape === 'almond' ? r * 1.06 : r;
    const h = shape === 'almond' ? r * 0.96 : r * 1.04;
    const rot = (e.tilt || 0) * 0.5 * (side < 0 ? 1 : -1);
    const cover = Math.min(0.3, (e.lid || 0) * 0.4 + (e.shape === 'half' ? 0.24 : 0) + (i === 1 ? (e.asym || 0) * 0.5 : 0));
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(rot);

    // ม่านตา (สีตา) + ตาดำ + ประกาย ตัดตามรูปตา
    eyePath(ctx, shape, w, h);
    ctx.fillStyle = (i === 1 && F.irisR) || F.iris || s.eye;
    ctx.fill();
    ctx.save();
    eyePath(ctx, shape, w, h);
    ctx.clip();
    const look = e.look || [0, 0];
    const px = gx * 0.55 + look[0] * 0.5;   // มองข้างแค่นิดเดียว ไม่ให้ดูค้อน
    const py = look[1] + cover * h * 0.35;
    const pr = Math.max(0.56, e.pr || 0.5) * r;   // ตาดำโต = ตาแป๋ว
    ctx.fillStyle = '#150C1C';
    ctx.beginPath();
    if (e.pupil === 'oval') ctx.ellipse(px, py, pr * 0.62, pr * 1.08, 0, 0, Math.PI * 2);
    else ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
    if (!s.solid) {
      const n = Math.max(2, e.shine || 2);   // ประกายอย่างน้อยสองจุดทุกหน้า
      ctx.fillStyle = 'rgba(255,255,255,.97)';
      ctx.beginPath(); ctx.arc(px + r * 0.3, py - r * 0.34, r * 0.36, 0, Math.PI * 2); ctx.fill();
      if (n >= 2) { ctx.beginPath(); ctx.arc(px - r * 0.34, py + r * 0.32, r * 0.14, 0, Math.PI * 2); ctx.fill(); }
      if (n >= 3) { ctx.beginPath(); ctx.arc(px + r * 0.5, py + r * 0.2, r * 0.09, 0, Math.PI * 2); ctx.fill(); }
    }
    // เปลือกตาบนปิดลงมา — สีขนทับครึ่งบนของตา ขอบล่างโค้งนิดหนึ่ง
    let lidY = null;
    if (cover > 0) {
      lidY = -h + 2 * h * cover;
      ctx.fillStyle = s.cat;
      ctx.beginPath();
      ctx.moveTo(-w - 2, -h - 3); ctx.lineTo(w + 2, -h - 3); ctx.lineTo(w + 2, lidY);
      ctx.quadraticCurveTo(0, lidY + h * 0.22, -w - 2, lidY);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // เส้นขอบตาบาง ๆ (ม่านตาสีสว่างต้องมีขอบ ไม่งั้นตาละลายไปกับขน)
    ctx.strokeStyle = s.ink;
    ctx.lineWidth = 0.55;
    eyePath(ctx, shape, w, h);
    ctx.stroke();
    // เส้นเปลือกตาบน
    // เส้นเปลือกตาบางลงเกือบครึ่ง — เส้นหนาทำให้หน้าดูง่วง/บึ้ง
    const line = (e.line || (cover > 0 ? 1.2 : 0)) * 0.6;
    if (line > 0) {
      ctx.lineWidth = line;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (lidY !== null) {
        const wl = w * Math.sqrt(Math.max(0, 1 - (lidY / h) ** 2)) + 0.4;
        ctx.moveTo(-wl - 0.4, lidY); ctx.quadraticCurveTo(0, lidY + h * 0.22, wl + 0.4, lidY);
      } else if (shape === 'almond') {
        ctx.ellipse(0, 0, w + 0.2, h * 0.92 + 0.2, 0, Math.PI * 1.08, Math.PI * 1.92);
      } else {
        ctx.arc(0, 0, r + 0.2, Math.PI * 1.08, Math.PI * 1.92);
      }
      ctx.stroke();
    }
    // ขนตาที่หางตา
    if (e.lash) {
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      const ox = side * w * 0.82;
      const oy = shape === 'almond' ? -h * 0.55 : -h * 0.62;
      for (let k = 0; k < e.lash; k++) {
        ctx.beginPath();
        ctx.moveTo(ox - side * k * 1.1, oy - k * 0.5);
        ctx.lineTo(ox + side * (1.9 - k * 0.4), oy - 2 - k * 0.9);
        ctx.stroke();
      }
    }
    ctx.restore();
  });
}

/** คิ้ว (ขนสีเข้ม/สว่างกว่าขนนิดหนึ่ง) */
export function faceBrows(ctx, s, F) {
  const b = F?.brow;
  if (!b) return;
  ctx.save();
  ctx.strokeStyle = s.dark;
  ctx.globalAlpha = 0.6;   // คิ้วจาง ๆ พอให้รู้อารมณ์ — คิ้วเข้มทำให้หน้าดูจริงจังเกิน
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  const top = -1 - (F.eye?.r || 3) * 1.1 - 2.6;
  EYES.forEach(([ex], i) => {
    const side = i === 0 ? -1 : 1;
    let y = top;
    let arch = 1;
    let innerLift = 0;
    if (b === 'raised' || (b === 'one' && i === 0)) { y -= 1.2; arch = 1.4; }
    if (b === 'low') { y += 0.4; arch = 0.6; }
    if (b === 'inner') innerLift = 1;
    const inX = ex - side * 1.8;
    const outX = ex + side * 1.8;
    ctx.beginPath();
    ctx.moveTo(outX, y + (b === 'low' ? 0.5 : 0));
    ctx.quadraticCurveTo(ex, y - arch, inX, y - innerLift);
    ctx.stroke();
  });
  ctx.restore();
}

// ── จมูก / ปาก / หนวด ────────────────────────────────────────

export function faceNose(ctx, s, F) {
  const n = F?.nose || {};
  const k = n.k || 1;
  ctx.save();
  ctx.translate(1, 3.6);
  ctx.scale(k, k);
  ctx.fillStyle = s.nose || s.pink;
  ctx.strokeStyle = s.nose || s.pink;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (n.shape === 'heart') {
    ctx.moveTo(0, 2.2);
    ctx.bezierCurveTo(-3.6, 0, -2.6, -2.2, 0, -0.9);
    ctx.bezierCurveTo(2.6, -2.2, 3.6, 0, 0, 2.2);
  } else if (n.shape === 'round') {
    ctx.moveTo(-2.6, -0.9);
    ctx.quadraticCurveTo(0, -1.8, 2.6, -0.9);
    ctx.quadraticCurveTo(2.4, 1.2, 0, 2);
    ctx.quadraticCurveTo(-2.4, 1.2, -2.6, -0.9);
  } else if (n.shape === 'broad') {
    ctx.moveTo(-3.6, -1.1); ctx.lineTo(3.6, -1.1); ctx.lineTo(0, 2);
  } else {
    ctx.moveTo(-3, -1.1); ctx.lineTo(3, -1.1); ctx.lineTo(0, 1.9);
  }
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // ประกายบนจมูก
  if (!s.solid) {
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(-0.9, -0.4, 0.9, 0.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** ปากหน้าตาปกติ — อารมณ์อื่น (ดีใจ ตกใจ เศร้า) ยังใช้ปากเดิมของ drawCatHead */
export function faceMouth(ctx, s, F) {
  const m = F?.mouth || {};
  const k = Math.min(1.05, m.k || 1) * 0.88;   // ปากเล็กลงนิด = หน้าดูเด็กและน่ารักขึ้น
  const type = m.type || 'w';
  ctx.save();
  ctx.translate(1, 0);
  ctx.strokeStyle = s.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const tongue = (x, y, w) => {
    ctx.fillStyle = s.pink;
    ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(160,40,80,.5)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x, y - w * 0.5); ctx.lineTo(x, y + w * 0.3); ctx.stroke();
    ctx.strokeStyle = s.ink; ctx.lineWidth = 1.5;
  };
  if (type === 'w' || type === 'tongue' || type === 'lazy') {
    const r = 2.6 * k * (type === 'lazy' ? 0.8 : 1);
    const y = type === 'lazy' ? 6.6 : 6;
    if (type === 'tongue') tongue(0, y + r * 0.9, 1.7 * k);
    ctx.beginPath(); ctx.arc(-r * 0.92, y, r, 0, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.92, y, r, 0, Math.PI); ctx.stroke();
  } else if (type === 'smile') {
    ctx.beginPath(); ctx.moveTo(0, 5.2); ctx.lineTo(0, 6.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 4.3, 3.6 * k, Math.PI * 0.18, Math.PI * 0.82); ctx.stroke();
  } else if (type === 'closed') {
    ctx.beginPath(); ctx.moveTo(0, 5.2); ctx.lineTo(0, 6.4); ctx.stroke();
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(-1.7 * k, 6, 1.8 * k, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(1.7 * k, 6, 1.8 * k, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
  } else if (type === 'open' || type === 'grin' || type === 'tooth' || type === 'crooked') {
    const w = (type === 'open' ? 2.6 : 4.8) * k;
    const h = (type === 'open' ? 3 : 3.8) * k;
    const lean = type === 'crooked' ? 0.18 : 0;
    ctx.save();
    ctx.translate(type === 'crooked' ? 0.8 : 0, 0);
    ctx.rotate(lean);
    ctx.fillStyle = s.ink;
    ctx.beginPath();
    if (type === 'open') ctx.ellipse(0, 7.2, w, h * 0.8, 0, 0, Math.PI * 2);
    else ctx.ellipse(0, 6.4, w, h, 0, 0, Math.PI);
    ctx.fill();
    tongue(0, type === 'open' ? 8.2 : 8.6, w * 0.45);
    if (type === 'tooth') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.moveTo(w * 0.35, 6.4); ctx.lineTo(w * 0.75, 6.4); ctx.lineTo(w * 0.55, 8.4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  } else if (type === 'side') {
    ctx.beginPath(); ctx.moveTo(-2.4, 6.6); ctx.quadraticCurveTo(1.6, 8.6, 4.6 * k, 5.2); ctx.stroke();
  } else if (type === 'flat') {
    ctx.beginPath(); ctx.moveTo(-2.6, 6.3); ctx.quadraticCurveTo(0, 7.1, 2.6, 6.3); ctx.stroke();
  }
  ctx.restore();
}

/** ทางเดินหนวดตามหน้า (ใช้ทั้งวาดและให้รอยแปรงทาซ้ำ) */
export function faceWhiskers(ctx, F) {
  const w = F?.whisk || {};
  const L = 9 * (w.len || 1);
  const d = w.droop || 0;
  ctx.beginPath();
  for (const [x0, dir] of [[-7, -1], [9, 1]]) {
    ctx.moveTo(x0, 4); ctx.lineTo(x0 + dir * L, 2 + d);
    ctx.moveTo(x0, 6.5); ctx.lineTo(x0 + dir * L, 7.5 + d);
    if (w.n === 3) { ctx.moveTo(x0, 5.2); ctx.lineTo(x0 + dir * L * 1.05, 4.9 + d); }
  }
}
