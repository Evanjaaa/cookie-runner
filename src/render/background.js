// src/render/background.js
// ฉากหลังทั้งหมดรับ "จานสี" ของด่านเข้ามา ไม่อ่านสีจาก config โดยตรง
// เปลี่ยนธีมด่านจึงทำได้โดยไม่ต้องแตะโค้ดวาดเลยสักบรรทัด
import { VIEW, GROUND_Y } from '../config.js';

const { W, H } = VIEW;

// fullHeight: โหมดโบนัสไม่มีพื้น ต้องไล่สีฟ้าลงไปจนสุดจอ
// ไม่งั้นส่วนที่ต่ำกว่า GROUND_Y จะไม่ถูกล้าง แล้วเห็นภาพเฟรมก่อนค้างอยู่
export function drawSky(ctx, camera, pal, fullHeight = false) {
  const bottom = fullHeight ? H : GROUND_Y;
  const sky = ctx.createLinearGradient(0, 0, 0, bottom);
  sky.addColorStop(0, pal.sky[0]);
  sky.addColorStop(0.55, pal.sky[1]);
  sky.addColorStop(1, pal.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(-20, -20, W + 40, bottom + 20);

  // แสงเรืองที่ขอบฟ้า — กลางคืนคือไฟเตาอบ กลางวันคือแดด
  const glow = ctx.createRadialGradient(
    W * 0.72, GROUND_Y - 10, 10,
    W * 0.72, GROUND_Y - 10, 300
  );
  glow.addColorStop(0, pal.glow);
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, GROUND_Y + 10);

  // จุดเล็ก ๆ ลอยในอากาศ (เกล็ดน้ำตาล / ละอองเกสร)
  ctx.fillStyle = pal.speck;
  for (let i = 0; i < 34; i++) {
    let sx = ((i * 137.5 - camera * 0.06) % (W + 40)) - 20;
    if (sx < 0) sx += W + 40;
    const sy = 24 + ((i * 73) % 150);
    ctx.globalAlpha = 0.25 + (0.6 + Math.sin(camera * 0.01 + i) * 0.4) * 0.35;
    ctx.fillRect(sx, sy, 2.2, 2.2);
  }
  ctx.globalAlpha = 1;
}

function hillLayer(ctx, offset, amp, baseY, color, step) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += step) {
    const t = (x + offset) * 0.0032;
    ctx.lineTo(x, baseY - Math.sin(t) * amp - Math.sin(t * 2.3) * amp * 0.4);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

/** parallax: ยิ่งไกลยิ่งเลื่อนช้า = สมองตีความว่ามีความลึก */
export function drawHills(ctx, camera, pal) {
  hillLayer(ctx, camera * 0.12, 46, 268, pal.hills[0], 20);
  hillLayer(ctx, camera * 0.28 + 500, 34, 292, pal.hills[1], 16);
  hillLayer(ctx, camera * 0.52 + 1200, 22, 312, pal.hills[2], 12);
}

// ─────────────────────────────────────────────────────────────
// ชั้นของประกอบฉาก — ตัวที่ทำให้แต่ละแมพเป็นสถานที่ ไม่ใช่แค่จานสี
//
// ก่อนหน้านี้ทั้งหกแมพวาดรูปทรงเดียวกันเป๊ะ (ไล่สีฟ้า + เนินไซน์สามชั้น + แถบพื้น)
// ต่างกันแค่ค่าสีที่ส่งเข้ามา — จึงรู้สึกเหมือน "แมพเดิมเปลี่ยนสกิน" ซึ่งตรงกับที่ทักมา
//
// แต่ละแมพประกาศ layers ของตัวเองเป็น "ข้อมูล" ไม่ใช่โค้ด:
//   art   ชื่อชิ้นส่วนใน PROP_ART
//   depth ตัวคูณ parallax — 0 = อยู่นิ่งไกลสุด, 1 = เลื่อนเท่าพื้น
//   every ระยะห่างระหว่างชิ้นในพิกัดโลก
//   band  'far' = หลังเนิน / 'near' = หน้าเนินแต่หลังพื้น
//
// เพิ่มแมพใหม่ = เติมข้อมูล ไม่ต้องแตะฟังก์ชันวาดเลย (ท่าเดียวกับ THEME_ART)
// ─────────────────────────────────────────────────────────────

/** สุ่มแบบคงที่จากตำแหน่งโลก — ชิ้นเดิมหน้าตาเหมือนเดิมทุกครั้งที่วิ่งผ่าน */
function hash(n) {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

const PROP_ART = {
  /** หินย้อยห้อยจากเพดานถ้ำ — เงาทึบ ไม่มีรายละเอียด เพราะอยู่ไกลและมืด */
  stalactite(ctx, x, y, s, pal, tick, seed) {
    const w = (16 + hash(seed) * 22) * s;
    const h = (40 + hash(seed + 7) * 90) * s;
    ctx.fillStyle = pal.hills[0];
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w * 0.1, y + h);
    ctx.closePath();
    ctx.fill();
  },

  /** สายแร่เรืองแสงบนผนังถ้ำ — จุดสว่างจุดเดียวของฉากหลัง ให้ตาได้พัก */
  crystalVein(ctx, x, y, s, pal, tick, seed) {
    const n = 3 + Math.floor(hash(seed) * 3);
    for (let i = 0; i < n; i++) {
      const cx = x + (hash(seed + i * 3) - 0.5) * 70 * s;
      const cy = y + (hash(seed + i * 5) - 0.5) * 46 * s;
      const r = (5 + hash(seed + i * 11) * 9) * s;
      // เรืองเป็นจังหวะช้า ๆ แต่ละก้อนคนละเฟส ไม่กะพริบพร้อมกันทั้งผนัง
      const pulse = 0.5 + Math.sin(tick * 0.02 + i * 2.1 + seed * 0.01) * 0.28;
      ctx.globalAlpha = 0.35 + pulse * 0.4;
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.62, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.62, cy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  /** เสาหินจากพื้นถึงเพดาน — ชั้นใกล้ ทึบและเข้มกว่าเนิน ให้รู้สึกว่าอยู่ในถ้ำจริง */
  rockPillar(ctx, x, y, s, pal, tick, seed) {
    const w = (26 + hash(seed) * 30) * s;
    ctx.fillStyle = pal.hills[2];
    ctx.beginPath();
    ctx.moveTo(x - w / 2, 0);
    ctx.lineTo(x + w / 2, 0);
    ctx.lineTo(x + w * 0.34, GROUND_Y);
    ctx.lineTo(x - w * 0.34, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  },

  /** หมอกลอยในถ้ำ — ลอยช้ากว่าทุกอย่าง ทำให้ระยะลึกอ่านออกโดยไม่ต้องมีของเพิ่ม */
  caveFog(ctx, x, y, s, pal, tick, seed) {
    const drift = Math.sin(tick * 0.004 + seed * 0.01) * 26;
    const w = (120 + hash(seed) * 120) * s;
    const h = (22 + hash(seed + 3) * 20) * s;
    ctx.globalAlpha = 0.1 + hash(seed + 9) * 0.08;
    ctx.fillStyle = pal.cloud;
    ctx.beginPath();
    ctx.ellipse(x + drift, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  },
};

/**
 * วาดของประกอบฉากหนึ่งชั้น
 * วาดเป็นช่วง ๆ ตามพิกัดโลก จึงต่อเนื่องไม่รู้จบโดยไม่ต้องเก็บสถานะอะไรไว้เลย
 */
export function drawProps(ctx, camera, layers, band, pal, tick) {
  if (!layers) return;
  for (const layer of layers) {
    if ((layer.band || 'far') !== band) continue;
    const art = PROP_ART[layer.art];
    if (!art) continue;

    const every = layer.every || 400;
    const off = camera * (layer.depth ?? 0.3);
    const first = Math.floor((off - 240) / every) * every;

    for (let wx = first; wx - off < W + 240; wx += every) {
      // เลื่อนแต่ละชิ้นด้วยค่าคงที่จากตำแหน่งของมันเอง จะได้ไม่เรียงเป็นแถวตรงเป๊ะ
      const jitter = (hash(wx) - 0.5) * every * 0.55;
      art(ctx, wx - off + jitter, layer.y || 0, layer.size || 1, pal, tick, wx);
    }
  }
}

export function drawGround(ctx, pits, camera, pal) {
  // เติมเงาลงในช่องหลุมก่อน — ถ้าไม่ทำ ช่องว่างจะโชว์เนินเขาที่วาดไว้ก่อนหน้า
  // แล้วอ่านเป็น "พื้นอีกสี" แทนที่จะเป็น "รู" ซึ่งอันตรายมากเพราะตกหลุมคือจบทันที
  // บนด่านกลางคืนพอมองออกเพราะทุกอย่างมืดอยู่แล้ว แต่ด่านสว่างจะสับสนทันที
  for (const p of pits) {
    const a = p.x - camera;
    if (a > W + 40 || a + p.w < -40) continue;
    const grad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    grad.addColorStop(0, pal.pitFill);
    grad.addColorStop(1, pal.pitDeep);
    ctx.fillStyle = grad;
    ctx.fillRect(a, GROUND_Y, p.w, H - GROUND_Y);
  }

  // เริ่มจากพื้นเต็มจอ แล้ว "เจาะ" ช่วงที่เป็นหลุมออกทีละอัน
  let solids = [[-40, W + 40]];
  for (const p of pits) {
    const a = p.x - camera;
    const b = a + p.w;
    const next = [];
    for (const [s, e] of solids) {
      if (b <= s || a >= e) { next.push([s, e]); continue; }
      if (a > s) next.push([s, a]);
      if (b < e) next.push([b, e]);
    }
    solids = next;
  }

  for (const [s, e] of solids) {
    const w = e - s;
    ctx.fillStyle = pal.ground;   ctx.fillRect(s, GROUND_Y, w, H - GROUND_Y);
    ctx.fillStyle = pal.crust;    ctx.fillRect(s, GROUND_Y, w, 22);
    ctx.fillStyle = pal.crustTop; ctx.fillRect(s, GROUND_Y, w, 6);

    // รายละเอียดบนผิวพื้น (เศษคุกกี้ / กอหญ้า)
    ctx.fillStyle = pal.crumb;
    for (let x = Math.ceil((s + camera) / 54) * 54; x - camera < e; x += 54) {
      const px = x - camera;
      if (px > s + 8 && px < e - 8) ctx.fillRect(px, GROUND_Y + 11, 7, 5);
    }

    // ขอบหลุม
    ctx.fillStyle = pal.pitEdge;
    ctx.fillRect(s, GROUND_Y, 4, H - GROUND_Y);
    ctx.fillRect(e - 4, GROUND_Y, 4, H - GROUND_Y);
  }
}
