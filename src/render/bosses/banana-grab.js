/**
 * ท่าคว้าของบอสกล้วยราคี — ของประกอบฉาก + ช่องภาพจากนักวาด (ผู้ใช้ 27 พ.ย. 2026 · ด่านบอสใน gameplay-lab)
 *
 * รายการภาพที่ส่งนักวาด (34 ภาพ) แบ่งเป็นช่อง — ตอนนี้โค้ดวาด/ประกอบแทนไปก่อน
 * วางไฟล์ SVG ใน src/render/bosses/banana/slots/ ตั้งชื่อขึ้นต้นด้วยรหัสช่อง = ใช้ไฟล์นั้นแทนเอง (ดู banana/slots/README.md)
 *   B1–B10  บอส (src/render/bosses/banana.js ดูแลเอง)
 *   C1–C8   น้องแมว — ท่าชั่วคราว = drawCat2 + ค่าท่า (GRAB_CAT_POSE) · มีไฟล์ = วาดไฟล์ (เท้าอยู่ขอบล่างกลาง)
 *   M1–M7   ลูกสมุนกล้วย — ท่าชั่วคราว = ท่าที่มีใน minions/banana.js (MINION_POSE)
 *   E1–E3   ของประกอบ/UI — เงามือ · เปลือกกล้วยบนพื้น · ไอคอนแตะรัว
 * ทุกอย่างคิดจากเวลา/ค่าที่ส่งมา → ลากเวลาย้อนได้ภาพเดิม · ไม่มีเส้นขอบเข้มรอบรูปทรง (กฎฉาก) ใช้แสงเงาแทน
 */
const FILES = import.meta.glob('./banana/slots/*.svg', { query: '?raw', import: 'default', eager: true });

/** ทุกช่องภาพของท่าคว้า (รหัส → ชื่อ · เฟรม) — ตรงกับรายการที่ส่งนักวาดในแชต 27 พ.ย. */
export const GRAB_SLOTS = {
  B1: ['ง้างคว้า (เตือน)', 1], B2: ['คว้าพื้น', 1], B3: ['คว้าระดับหัว', 1], B4: ['ตะครุบจากข้างบน', 1], B5: ['ยกน้องค้าง', 1],
  B6: ['ลากเข้าหาปาก', 1], B7: ['เสียหลักมึน', 1], B8: ['เขย่า', 1], B9: ['โยน', 1], B10: ['หน้าโกรธ (เฉพาะหน้า)', 1],
  M1: ['ลูกสมุนวิ่งตาม เฟรม 1', 1], M2: ['ลูกสมุนวิ่งตาม เฟรม 2', 1], M3: ['ลูกสมุนวิ่งตาม เฟรม 3', 1], M4: ['ลูกสมุนวิ่งตาม เฟรม 4', 1],
  M5: ['ลูกสมุนกระโจนเกาะ', 1], M6: ['ลูกสมุนเกาะขา', 1], M7: ['ลูกสมุนโดนสะบัดหลุด', 1],
  C1: ['น้องตกใจตอนโดนคว้า', 1], C2: ['น้องดิ้นตะกุย', 4], C3: ['น้องถูกลาก', 2], C4: ['น้องดีดตัวหลุด', 1],
  C5: ['น้องปาเปลือก', 2], C6: ['น้องโดนเขย่า', 1], C7: ['น้องกลิ้ง', 2], C8: ['น้องสะบัดขา', 1],
  E1: ['เงามือบนพื้น', 1], E2: ['เปลือกกล้วยบนพื้น', 1], E3: ['ไอคอนนิ้วแตะรัว', 1],
};

// ── โหลดไฟล์ช่อง C/M/E (B โหลดใน banana.js) ──
const SLOT = {};   // รหัส → [{ im, w, h }] เรียงเฟรม
(() => {
  const by = {};
  for (const [path, raw] of Object.entries(FILES)) {
    const name = path.split('/').pop().replace(/\.svg$/i, '');
    const id = (name.match(/^([CME]\d+)/i) || [])[1]?.toUpperCase();
    if (!id) continue;
    const n = +((name.match(/-(\d+)$/) || [])[1] || 0);
    (by[id] ||= []).push([n, raw]);
  }
  for (const [id, list] of Object.entries(by)) {
    list.sort((a, b) => a[0] - b[0]);
    Promise.all(list.map(([, raw]) => new Promise((ok) => {
      const svg = raw.slice(raw.indexOf('<svg'));
      const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1]?.split(/[\s,]+/).map(Number) || [0, 0, 100, 100];
      const im = new Image();
      im.onload = () => ok({ im, w: vb[2], h: vb[3] }); im.onerror = () => ok(null);
      im.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    }))).then((fr) => { fr = fr.filter(Boolean); if (fr.length) SLOT[id] = fr; });
  }
})();
/** มีไฟล์ของช่องนี้ไหม */
export const hasSlot = (id) => !!SLOT[id];
/**
 * วาดภาพของช่อง (ถ้ามีไฟล์) — คืน false ถ้ายังไม่มี (ผู้เรียกวาดแบบชั่วคราวเอง)
 * ids = รหัสเดียว (หลายเฟรมจากเลขท้ายไฟล์) หรือรายการรหัส (เช่น M1–M4 = เฟรมวิ่ง) · h = สูงบนจอ
 * anchor 'feet' = ขอบล่างกลางของกระดาษอยู่ที่ (x, y) · 'center' = กลางกระดาษ
 */
export function drawSlot(ctx, ids, x, y, h, { t = 0, fps = 8, rot = 0, flip = false, anchor = 'feet', loop = true } = {}) {
  const fr = (Array.isArray(ids) ? ids : [ids]).flatMap((id) => SLOT[id] || []);
  if (!fr.length) return false;
  const i = Math.floor(t * fps), f = fr[loop ? i % fr.length : Math.min(fr.length - 1, i)];
  const k = h / f.h;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(k * (flip ? -1 : 1), k);
  ctx.drawImage(f.im, -f.w / 2, anchor === 'feet' ? -f.h : -f.h / 2, f.w, f.h);
  ctx.restore();
  return true;
}

// ══ น้องแมวระหว่างโดนคว้า (C1–C8) — ค่าท่าชั่วคราวของ drawCat2 · f = เฟรมเกม · o = ค่าที่หน้าเกมส่ง ══
// rot = หมุนทั้งตัว (เรเดียน · ผู้เรียกหมุนรอบกลางตัว) · ช่อง = รหัสภาพนักวาด
const sw = (f, p) => Math.sin(f * p);
export const GRAB_CAT_POSE = {
  shock:    { slot: 'C1', name: 'ตกใจตอนโดนคว้า', shape: () => ({ mood: 'shocked', swingL: 0.8, kickL: 0.35, kickR: -0.35, mouth: 0.6 }) },
  struggle: { slot: 'C2', name: 'ดิ้นตะกุย', shape: (f, o = {}) => {
    const p = Math.floor(f / 5) % 4, a = p % 2 ? 1 : -1;   // 4 เฟรมวน: ขาหน้า-หลังตะกุยสลับ
    return { mood: 'hurt', kickL: 0.55 * a, kickR: -0.5 * a, swingL: p < 2 ? 0.9 : 0.2, paw: p >= 2 ? 1 : 0, mouth: 0.15 + (o.kick || 0) * 0.4, tilt: a * 0.08 };
  } },
  dragged:  { slot: 'C3', name: 'ถูกลาก', shape: (f) => ({ mood: 'shocked', lean: -0.25, reachL: 1, crouch: 0.3, kickL: 0.2 * sw(f, 0.5), mouth: 0.35 }) },
  flip:     { slot: 'C4', name: 'ดีดตัวหลุด', shape: () => ({ mood: 'starry', roll: 0.7, swingL: 1, kickL: 0.5, kickR: -0.5 }) },
  throw:    { slot: 'C5', name: 'ปาเปลือก', shape: (f, o = {}) => (o.k < 0.5 ? { swingL: 1, mood: 'mischievous' } : { reachL: 1, mouth: 0.5, mood: 'happy' }) },
  shaken:   { slot: 'C6', name: 'โดนเขย่า', shape: (f) => ({ mood: 'dizzy', tilt: sw(f, 0.9) * 0.3, sprawl: 0.35, mouth: 0.3 }) },
  roll:     { slot: 'C7', name: 'กลิ้ง', shape: (f, o = {}) => (o.k < 0.6 ? { roll: 1, mood: 'dizzy' } : { sprawl: 0.6, mood: 'dizzy', mouth: 0.2 }) },
  kick:     { slot: 'C8', name: 'สะบัดขา', shape: (f) => ({ mood: 'sulky', kickL: 0.9 * Math.abs(sw(f, 0.4)), crouch: 0.15 }) },
};

// ══ ลูกสมุนกล้วยช่วยคว้า (M1–M7) — ท่าชั่วคราวจาก minions/banana.js ══
export const MINION_POSE = {
  run:   { slot: ['M1', 'M2', 'M3', 'M4'], name: 'วิ่งตาม', state: 'walk' },
  leap:  { slot: 'M5', name: 'กระโจนเกาะ', state: 'hop' },
  cling: { slot: 'M6', name: 'เกาะขา', state: 'taunt' },
  flung: { slot: 'M7', name: 'โดนสะบัดหลุด', state: 'dizzy' },
};

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/**
 * E1 เงามือบนพื้น: วงรีเหลืองโปร่ง + เงานิ้ว 4 นิ้ว + วงแหวนกะพริบ — บอกว่ามือจะคว้า/ตะครุบตรงนี้
 * k = 0..1 ใกล้ถึงจังหวะ (เงาเข้ม/โตขึ้น) · w = ครึ่งความกว้าง (px)
 */
export function drawHandShadow(ctx, x, y, k, t, w = 34) {
  k = clamp(k);
  if (drawSlot(ctx, 'E1', x, y, w * 1.1 * (0.7 + 0.3 * k), { t, anchor: 'center' })) return;
  ctx.save();
  ctx.translate(x, y);
  const a = 0.22 + 0.5 * k, s = 0.7 + 0.3 * k;
  ctx.scale(s, s);
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, w);
  g.addColorStop(0, `rgba(255,200,40,${a})`); g.addColorStop(0.7, `rgba(255,214,64,${a * 0.7})`); g.addColorStop(1, 'rgba(255,224,90,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, w, w * 0.32, 0, 0, TAU); ctx.fill();
  // เงานิ้ว (ฝ่ามือแบคว่ำ มองจากข้างบน)
  ctx.fillStyle = `rgba(200,120,10,${0.18 + 0.32 * k})`;
  ctx.beginPath(); ctx.ellipse(4, 0, w * 0.42, w * 0.17, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(-w * 0.42 - (i === 0 || i === 3 ? 0 : 5), (i - 1.5) * w * 0.1, w * 0.16, w * 0.05, 0, 0, TAU); ctx.fill(); }
  // วงแหวนกะพริบ (เร็วขึ้นตอนใกล้)
  ctx.globalAlpha = (0.35 + 0.5 * k) * (0.6 + 0.4 * Math.sin(t * (8 + 10 * k)));
  ctx.strokeStyle = '#FFE27A'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, 0, w * (1.05 - 0.2 * k), w * 0.34 * (1.05 - 0.2 * k), 0, 0, TAU); ctx.stroke();
  ctx.restore();
}

/**
 * E2 เปลือกกล้วยบนพื้น (ของให้เก็บไปปาใส่บอส): เปลือกเหลืองสามแฉกปลายน้ำตาล + ประกายวิบ "เก็บได้นะ"
 * s = ขนาด (px ต่อหน่วย 1 ≈ 30px กว้าง) · glow 0..1 = แสงชวนเก็บ
 */
export function drawPeel(ctx, x, y, s, rot, t, glow = 1) {
  if (drawSlot(ctx, 'E2', x, y, 26 * s, { t, rot })) return;
  ctx.save();
  ctx.translate(x, y);
  if (glow > 0) {
    const g = ctx.createRadialGradient(0, -8 * s, 2, 0, -8 * s, 30 * s);
    g.addColorStop(0, `rgba(255,248,190,${0.55 * glow})`); g.addColorStop(1, 'rgba(255,240,160,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -8 * s, 30 * s, 0, TAU); ctx.fill();
  }
  ctx.rotate(rot); ctx.scale(s, s);
  // เงาใต้
  ctx.fillStyle = 'rgba(80,50,10,.18)'; ctx.beginPath(); ctx.ellipse(0, 1, 15, 3.5, 0, 0, TAU); ctx.fill();
  // สามแฉก (หลัง → หน้า) · ไล่แสงจากบนลงล่าง ไม่มีเส้นขอบ
  const flap = (ax, ay, bx, by, cx, cy, w, c0, c1) => {
    const g = ctx.createLinearGradient(0, -16, 0, 2); g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-w, -4); ctx.quadraticCurveTo(ax, ay, bx, by); ctx.quadraticCurveTo(cx, cy, w, -4); ctx.closePath(); ctx.fill();
  };
  flap(-6, -14, 2, -19, 8, -12, 5, '#F2C93A', '#D9A520');          // แฉกกลางชี้ขึ้น
  flap(-18, -8, -15, 0, -9, -2, 6, '#FFE066', '#E8B92C');          // แฉกซ้ายพับลงพื้น
  flap(16, -9, 15, 0, 10, -2, 6, '#FFE066', '#E8B92C');            // แฉกขวา
  ctx.fillStyle = '#FFF1A8'; ctx.beginPath(); ctx.ellipse(-1, -7, 4, 6, -0.2, 0, TAU); ctx.fill();   // เนื้อในสีอ่อน
  ctx.fillStyle = '#8A5A1E'; ctx.beginPath(); ctx.ellipse(0, -5, 3.2, 2.4, 0, 0, TAU); ctx.fill();   // ขั้วน้ำตาล
  ctx.fillStyle = '#6E4512'; [[-14, -1], [14, -1], [2, -18]].forEach(([px, py]) => { ctx.beginPath(); ctx.arc(px, py, 1.6, 0, TAU); ctx.fill(); });   // ปลายแฉกช้ำ
  ctx.restore();
  // ประกายวิบ
  if (glow > 0) {
    ctx.save(); ctx.fillStyle = '#FFFBE0';
    for (let i = 0; i < 2; i++) {
      const u = (t * 1.3 + i * 0.5) % 1, r = 3.2 * s * Math.sin(u * Math.PI) * glow;
      if (r < 0.3) continue;
      const px = x + (i ? 12 : -10) * s, py = y - (14 + u * 10) * s;
      ctx.beginPath(); ctx.moveTo(px, py - r * 2); ctx.lineTo(px + r * 0.5, py); ctx.lineTo(px, py + r * 2); ctx.lineTo(px - r * 0.5, py); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(px - r * 2, py); ctx.lineTo(px, py + r * 0.5); ctx.lineTo(px + r * 2, py); ctx.lineTo(px, py - r * 0.5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * E3 แถบ "ดิ้นหลุด!" + ไอคอนนิ้วแตะรัว (ลอยเหนือน้องตอนโดนจับ)
 * o.fill 0..1 = กดได้กี่ส่วนแล้ว · o.time 0..1 = เวลาที่เหลือ (วงรอบไอคอน) · o.pulse 0..1 = เพิ่งกด (เด้ง)
 * o.label · o.hot = โหมดบอสโกรธ (ต้องกดมากขึ้น — แถบเป็นชมพูแดง)
 */
export function drawMashMeter(ctx, x, y, o = {}) {
  const { fill = 0, time = 1, pulse = 0, t = 0, label = 'ดิ้นหลุด!', hot = false } = o;
  const W = 120, H = 14, bx = x - W / 2;
  ctx.save();
  // ป้ายข้อความ
  ctx.font = '700 17px Mali, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const wob = 1 + 0.1 * pulse + 0.04 * Math.sin(t * 14);
  ctx.save(); ctx.translate(x - 12, y - 18); ctx.scale(wob, wob);
  ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = hot ? '#7A1030' : '#4A2366'; ctx.strokeText(label, 0, 0);
  ctx.fillStyle = hot ? '#FFD0DE' : '#FFF4DC'; ctx.fillText(label, 0, 0);
  ctx.restore();
  // ราง + ไส้
  ctx.fillStyle = 'rgba(30,8,40,.35)'; ctx.beginPath(); ctx.roundRect(bx - 2, y - 2 + 1.5, W + 4, H + 4, (H + 4) / 2); ctx.fill();
  ctx.fillStyle = '#FFF6E6'; ctx.beginPath(); ctx.roundRect(bx - 2, y - 2, W + 4, H + 4, (H + 4) / 2); ctx.fill();
  let g = ctx.createLinearGradient(0, y, 0, y + H); g.addColorStop(0, '#4B4552'); g.addColorStop(1, '#615A6B');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(bx, y, W, H, H / 2); ctx.fill();
  const fw = W * clamp(fill);
  if (fw > 0.5) {
    ctx.save(); ctx.beginPath(); ctx.roundRect(bx, y, fw, H, Math.min(H / 2, fw / 2)); ctx.clip();
    g = ctx.createLinearGradient(bx, 0, bx + W, 0);
    if (hot) { g.addColorStop(0, '#FFC2D6'); g.addColorStop(1, '#FF5C8A'); } else { g.addColorStop(0, '#BFFBEA'); g.addColorStop(1, '#4FD8B8'); }
    ctx.fillStyle = g; ctx.fillRect(bx, y, fw, H);
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(bx, y + 1.5, fw, 3);
    ctx.restore();
  }
  // ไอคอนนิ้วแตะรัว (E3) + วงเวลาที่เหลือ
  const ix = bx + W + 22, iy = y + H / 2, r = 15 * (1 + 0.18 * pulse);
  if (!drawSlot(ctx, 'E3', ix, iy, r * 2.4, { t, anchor: 'center' })) {
    ctx.fillStyle = 'rgba(30,8,40,.3)'; ctx.beginPath(); ctx.arc(ix, iy + 2, r, 0, TAU); ctx.fill();
    g = ctx.createLinearGradient(0, iy - r, 0, iy + r); g.addColorStop(0, '#B8F6E8'); g.addColorStop(1, '#5CD6BC');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ix, iy, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(ix - r * 0.3, iy - r * 0.45, r * 0.45, r * 0.22, -0.4, 0, TAU); ctx.fill();
    // อุ้งเท้าขาว (แบบปุ่มพลังแห่งความหวัง) กดยุบตามจังหวะ
    const tap = 0.5 + 0.5 * Math.sin(t * 18), py = iy + 1 + tap * 1.5;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(ix, py + 3, r * 0.36, r * 0.28, 0, 0, TAU); ctx.fill();
    [[-0.42, -0.22], [-0.15, -0.46], [0.15, -0.46], [0.42, -0.22]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(ix + dx * r, py + dy * r, r * 0.14, 0, TAU); ctx.fill(); });
  }
  ctx.strokeStyle = 'rgba(255,246,230,.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(ix, iy, r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(time)); ctx.stroke();
  ctx.restore();
}

/**
 * คลื่นพื้นจากท่ากระแทก (บอสกล้วย): สันดินนูนกลิ้งไปทางซ้าย + ฝุ่นพุ่ง · front = ขอบหน้า (x จอ) · h = ความสูงสัน (px · ส่วนที่ชน)
 * ไม่มีเส้นขอบ — สันสว่างด้านบน เงาด้านล่าง
 */
export function drawBananaQuake(ctx, front, gy, h, t, a = 1) {
  ctx.save();
  ctx.globalAlpha *= a;
  const L = 130;
  // ร่องดินที่คลื่นผ่าน (หางจางไปทางขวา)
  let g = ctx.createLinearGradient(front, 0, front + L * 1.6, 0);
  g.addColorStop(0, 'rgba(120,80,30,.35)'); g.addColorStop(1, 'rgba(120,80,30,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(front + L * 0.8, gy + 1, L * 0.8, 5, 0, 0, TAU); ctx.fill();
  // สันดินนูน
  g = ctx.createLinearGradient(0, gy - h, 0, gy);
  g.addColorStop(0, '#FFF0C8'); g.addColorStop(0.35, '#E9C98A'); g.addColorStop(1, '#B98A4A');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(front - 4, gy);
  ctx.quadraticCurveTo(front - 2, gy - h * 1.05, front + 20, gy - h);
  ctx.quadraticCurveTo(front + 46, gy - h * 0.9, front + 70, gy - h * 0.35);
  ctx.quadraticCurveTo(front + 100, gy - 4, front + L, gy);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath(); ctx.ellipse(front + 18, gy - h * 0.86, 12, 3.2, -0.15, 0, TAU); ctx.fill();
  // ฝุ่นพุ่งจากยอดสัน
  for (let i = 0; i < 6; i++) {
    const u = (t * 2.2 + i / 6) % 1, px = front + 8 + i * 9 + u * 18, py = gy - h - u * 26 + i * 2;
    ctx.globalAlpha = a * 0.55 * (1 - u); ctx.fillStyle = '#F4E3BC';
    ctx.beginPath(); ctx.arc(px, py, 4 + u * 7, 0, TAU); ctx.fill();
  }
  // ก้อนดินกระเด็นข้างหน้า
  ctx.globalAlpha = a; ctx.fillStyle = '#9A6B34';
  for (let i = 0; i < 4; i++) { const u = (t * 3 + i * 0.27) % 1; ctx.beginPath(); ctx.arc(front - 6 - u * 22, gy - h * 0.6 - Math.sin(u * Math.PI) * 18 + i * 3, 2.2, 0, TAU); ctx.fill(); }
  ctx.restore();
}

/** ลูกศรเตือนขอบจอซ้าย "!" — ลูกสมุนกำลังวิ่งตามมาจากข้างหลัง · k = 0..1 ใกล้โผล่ */
export function drawBehindWarn(ctx, x, y, k, t) {
  ctx.save();
  ctx.globalAlpha = clamp(k * 1.6) * (0.65 + 0.35 * Math.sin(t * 16));
  ctx.translate(x, y);
  const g = ctx.createLinearGradient(0, -18, 0, 18); g.addColorStop(0, '#FFE58A'); g.addColorStop(1, '#FFB23C');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(4, -18); ctx.lineTo(4, -8); ctx.lineTo(22, -8); ctx.lineTo(22, 8); ctx.lineTo(4, 8); ctx.lineTo(4, 18); ctx.closePath(); ctx.fill();
  ctx.font = '800 20px Mali, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 4; ctx.strokeStyle = '#7A3A00'; ctx.strokeText('!', 40, 0); ctx.fillStyle = '#FFF6D0'; ctx.fillText('!', 40, 0);
  ctx.restore();
}
