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

  /** ดาวเคราะห์ลอยไกล ๆ — ชิ้นใหญ่ที่สุดในฉาก บอกว่านี่คืออวกาศตั้งแต่แวบแรก */
  planet(ctx, x, y, s, pal, tick, seed) {
    const r = (26 + hash(seed) * 34) * s;
    // สีสลับสองโทนตามชิ้น ไม่งั้นดาวทุกดวงหน้าตาเหมือนกันหมดทั้งฉาก
    ctx.fillStyle = hash(seed + 2) > 0.5 ? pal.hills[0] : pal.cloudSoft;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // แถบเมฆพาดกลางดวง ตัดด้วย clip ให้อยู่ในวงเสมอ
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = pal.cloud;
    ctx.fillRect(x - r, y - r * 0.22, r * 2, r * 0.2);
    ctx.fillRect(x - r, y + r * 0.3, r * 2, r * 0.13);
    ctx.restore();
    // วงแหวนบางดวง
    if (hash(seed + 5) > 0.62) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.55, r * 0.34, -0.32, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },

  /**
   * สถานีอวกาศ — ของที่ "มนุษย์สร้าง" ชิ้นเดียวในฉาก ตัดกับดาวกับหินที่เหลือ
   *
   * สีลำตัวต้องมาจาก cloudSoft ไม่ใช่ hills — hills ของอวกาศเข้มเกือบเท่าท้องฟ้า
   * (#1A1234 บนฟ้า #191036) ลำตัวจะจมหายจนเหลือแต่แผงโซลาร์ลอยเป็นสี่เหลี่ยมสองอัน
   */
  station(ctx, x, y, s, pal, tick, seed) {
    const w = 66 * s;
    const h = 14 * s;

    // เสายึดแผงกับลำตัว วาดก่อนให้ทุกอย่างต่อกันเป็นชิ้นเดียว ไม่ใช่ของสามชิ้นลอย
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = pal.cloudSoft;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.62, y);
    ctx.lineTo(x + w * 0.62, y);
    ctx.stroke();

    // แผงโซลาร์สองข้าง เอียงเล็กน้อยให้ดูรับแสง
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = pal.accent;
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.translate(x + dir * w * 0.56, y);
      ctx.rotate(dir * 0.12);
      ctx.fillRect(-w * 0.13, -h * 0.95, w * 0.26, h * 1.9);
      ctx.restore();
    }

    // ลำตัว วาดทับเสาตรงกลาง
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = pal.cloudSoft;
    ctx.beginPath();
    ctx.roundRect(x - w * 0.3, y - h / 2, w * 0.6, h, h / 2);
    ctx.fill();
    // ช่องหน้าต่างแถวเดียว บอกสเกลว่าเป็นของใหญ่ที่อยู่ไกล
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = pal.cloud;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(x + i * w * 0.14, y, 1.8 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // ไฟกะพริบที่ปลาย บอกว่ายังทำงานอยู่
    ctx.globalAlpha = 0.35 + Math.abs(Math.sin(tick * 0.05 + seed)) * 0.65;
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(x + w * 0.3, y - h * 0.5, 2.4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  },

  /** ฝุ่นดาวลอยผ่าน — ชั้นใกล้สุด เลื่อนเร็ว ให้รู้สึกว่ากำลังเคลื่อนที่เร็วจริง */
  spaceDust(ctx, x, y, s, pal, tick, seed) {
    ctx.globalAlpha = 0.25 + hash(seed) * 0.35;
    ctx.fillStyle = pal.speck;
    const len = (10 + hash(seed + 4) * 26) * s;
    ctx.fillRect(x, y + (hash(seed + 8) - 0.5) * 120, len, 1.6 * s);
    ctx.globalAlpha = 1;
  },

  /** ยอดเขาหิมะไกล ๆ — ชั้นไกลสุดของทุ่งหิมะ ให้ฉากมีเส้นขอบฟ้าที่ไม่ใช่เนินไซน์ */
  snowPeak(ctx, x, y, s, pal, tick, seed) {
    const w = (120 + hash(seed) * 90) * s;
    const h = (70 + hash(seed + 3) * 60) * s;
    ctx.fillStyle = pal.hills[0];
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + w / 2, y);
    ctx.closePath();
    ctx.fill();
    // หิมะบนยอด — สามเหลี่ยมเล็กสีขาวซ้อนบนยอดเดียวกัน
    const k = 0.36;
    ctx.fillStyle = pal.cloud;
    ctx.beginPath();
    ctx.moveTo(x - (w / 2) * k, y - h * (1 - k));
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + (w / 2) * k, y - h * (1 - k));
    ctx.closePath();
    ctx.fill();
  },

  /** ต้นสนมีหิมะเกาะ — ชั้นกลาง เป็นของที่บอกสเกลว่าภูเขาอยู่ไกลแค่ไหน */
  snowPine(ctx, x, y, s, pal, tick, seed) {
    const h = (44 + hash(seed) * 26) * s;
    const w = h * 0.52;
    ctx.fillStyle = pal.hills[2];
    // สามชั้นซ้อนจากล่างขึ้นบน แต่ละชั้นแคบลง
    for (let i = 0; i < 3; i++) {
      const t = i / 3;
      const cw = w * (1 - t * 0.42);
      const cy = y - h * t * 0.72;
      ctx.beginPath();
      ctx.moveTo(x - cw / 2, cy);
      ctx.lineTo(x, cy - h * 0.46);
      ctx.lineTo(x + cw / 2, cy);
      ctx.closePath();
      ctx.fill();
    }
    // หิมะเกาะยอด
    ctx.fillStyle = pal.cloud;
    ctx.beginPath();
    ctx.arc(x, y - h * 1.44 + 3 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  },

  /**
   * เกล็ดหิมะตก — ชั้นใกล้สุด
   * ร่วงลงพร้อมส่ายซ้ายขวา ใช้ตำแหน่งโลกเป็นเฟส เกล็ดแต่ละเม็ดจึงไม่ตกพร้อมกัน
   * y ที่ส่งเข้ามาถูกมองข้าม เพราะเกล็ดต้องวนรอบความสูงจอเองไม่งั้นจะตกครั้งเดียวแล้วหาย
   */
  snowFall(ctx, x, y, s, pal, tick, seed) {
    for (let i = 0; i < 3; i++) {
      const ph = hash(seed + i * 13);
      const fall = (tick * (0.5 + ph * 0.7) + ph * 400) % 420;
      const fy = fall - 40;
      const sway = Math.sin(tick * 0.02 + ph * 9) * 12;
      const r = (1.6 + ph * 1.8) * s;
      ctx.globalAlpha = 0.35 + ph * 0.45;
      ctx.fillStyle = pal.cloud;
      ctx.beginPath();
      ctx.arc(x + sway + i * 26, fy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
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

  // ── ครัวกลางคืน ────────────────────────────────────────────

  /** ชั้นวางของ — เส้นแนวนอนยาวที่ทำให้ห้องอ่านออกว่าเป็นในอาคาร ไม่ใช่กลางแจ้ง */
  shelf(ctx, x, y, s, pal, tick, seed) {
    const w = 220 * s;
    ctx.fillStyle = pal.hills[1];
    ctx.fillRect(x, y, w, 9 * s);
    ctx.fillStyle = pal.hills[0];
    ctx.fillRect(x, y + 9 * s, w, 4 * s);
    // ขวดเครื่องปรุงเรียงบนชั้น สูงไม่เท่ากันตาม seed
    for (let i = 0; i < 4; i++) {
      const h = (16 + hash(seed + i * 7) * 20) * s;
      const bw = 13 * s;
      ctx.fillStyle = i % 2 ? pal.cloudSoft : pal.cloud;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(x + (26 + i * 48) * s, y - h, bw, h);
      ctx.globalAlpha = 1;
    }
  },

  /** เตาอบ — ช่องไฟส้มเรืองเป็นจังหวะ บอกล่วงหน้าว่าแมพนี้เกี่ยวกับไฟ */
  ovenBox(ctx, x, y, s, pal, tick, seed) {
    const w = 130 * s, h = 96 * s;
    // ตัวเตาใช้สีเข้มคงที่ ไม่ใช้ pal.hills เพราะจะกลืนไปกับเนินเขาที่อยู่หลังจนอ่านไม่ออก
    ctx.fillStyle = '#3B2A46';
    ctx.fillRect(x, y - h, w, h);
    ctx.fillStyle = '#57406A';
    ctx.fillRect(x + 4 * s, y - h + 4 * s, w - 8 * s, 8 * s);
    // ช่องกระจกเตา — เต้นช้ากว่าไฟจริงมาก จะได้ไม่ดึงสายตาไปจากพื้นเกม
    const glow = 0.28 + Math.sin(tick * 0.03 + seed) * 0.12;
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#FF8A3C';
    ctx.fillRect(x + 16 * s, y - h + 26 * s, w - 32 * s, h - 46 * s);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = pal.cloudSoft;
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(x + 16 * s, y - h + 26 * s, w - 32 * s, h - 46 * s);
  },

  /** ท่อใต้เพดาน — ห้อยลงมาจากขอบบน ปิดพื้นที่ว่างด้านบนของจอ */
  pipe(ctx, x, y, s, pal, tick, seed) {
    const len = (40 + hash(seed) * 46) * s;
    const w = 20 * s;
    ctx.fillStyle = pal.hills[1];
    ctx.fillRect(x, 0, w, len);
    // ปลอกรัดท่อ ทำให้ไม่ใช่แค่แท่งสี่เหลี่ยมเปล่า
    ctx.fillStyle = pal.hills[0];
    ctx.fillRect(x - 3 * s, len - 10 * s, w + 6 * s, 8 * s);
  },

  /** สะเก็ดไฟลอย — ลอยขึ้นตรงข้ามกับหิมะที่ตกลง ให้สองแมพต่างกันแม้ใช้โครงเดียวกัน */
  ember(ctx, x, y, s, pal, tick, seed) {
    for (let i = 0; i < 3; i++) {
      const ph = hash(seed + i * 11);
      const rise = (tick * (0.6 + ph * 0.8) + ph * 400) % 400;
      const fy = GROUND_Y - rise;
      const sway = Math.sin(tick * 0.03 + ph * 7) * 14;
      ctx.globalAlpha = Math.max(0, 0.55 - rise / 400) + 0.1;
      ctx.fillStyle = i % 2 ? '#FFC46B' : '#FF8A3C';
      ctx.beginPath();
      ctx.arc(x + sway + i * 24, fy, (1.4 + ph * 1.6) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  // ── สวนดอกไม้ ──────────────────────────────────────────────

  /** ก้อนเมฆนุ่ม — วางไว้สูงสุด เคลื่อนช้าสุด เป็นตัวบอกว่าเป็นกลางแจ้งตอนกลางวัน */
  cloudPuff(ctx, x, y, s, pal, tick, seed) {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = pal.cloud;
    for (let i = 0; i < 3; i++) {
      const r = (18 + hash(seed + i * 5) * 14) * s;
      ctx.beginPath();
      ctx.arc(x + i * 26 * s, y + hash(seed + i) * 8 * s, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  /** ต้นไม้ — พุ่มสามก้อนกับลำต้น ใช้ตัวเดียวกันสองชั้นแต่คนละขนาด/ความลึก */
  tree(ctx, x, y, s, pal, tick, seed) {
    const th = (52 + hash(seed) * 26) * s;
    ctx.fillStyle = pal.hills[1];
    ctx.fillRect(x - 5 * s, y - th, 10 * s, th);
    ctx.fillStyle = pal.hills[0];
    const sway = Math.sin(tick * 0.012 + seed * 0.02) * 3 * s;
    for (let i = 0; i < 3; i++) {
      const r = (20 + hash(seed + i * 9) * 12) * s;
      ctx.beginPath();
      ctx.arc(x + sway + (i - 1) * 17 * s, y - th - 6 * s + hash(seed + i) * 10 * s, r, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  /** กลีบดอกปลิว — ร่วงเฉียงไปข้างหน้า ต่างจากหิมะที่ร่วงตรง */
  petal(ctx, x, y, s, pal, tick, seed) {
    for (let i = 0; i < 3; i++) {
      const ph = hash(seed + i * 17);
      const fall = (tick * (0.4 + ph * 0.5) + ph * 420) % 420;
      const fy = fall - 40;
      const drift = Math.sin(tick * 0.025 + ph * 8) * 20 - fall * 0.18;
      ctx.globalAlpha = 0.5 + ph * 0.4;
      ctx.fillStyle = ph > 0.5 ? '#FFC0D4' : '#FFE1EC';
      ctx.save();
      ctx.translate(x + drift + i * 28, fy);
      ctx.rotate(tick * 0.03 + ph * 6);
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.5 * s, 2.4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },

  // ── ชายหาด ─────────────────────────────────────────────────

  /** ดวงอาทิตย์ตก — ชิ้นเดียวโผล่นาน ๆ ครั้ง เป็นจุดสนใจของฉาก */
  sunDisc(ctx, x, y, s, pal, tick, seed) {
    const r = 56 * s;
    const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 2);
    g.addColorStop(0, 'rgba(255,196,120,.55)');
    g.addColorStop(1, 'rgba(255,196,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFD79A';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  },

  /** คลื่น — ซัดเข้าฝั่งเป็นจังหวะ ชั้นใกล้ขยับแรงกว่าชั้นไกลจึงเห็นระยะลึก */
  seaWave(ctx, x, y, s, pal, tick, seed) {
    const w = 150 * s;
    const swell = Math.sin(tick * 0.035 + seed * 0.03) * 5 * s;
    // สีน้ำทะเลคงที่ ไม่ใช้ pal.hills เพราะคลื่นต้องแยกออกจากเนินทรายให้เห็น
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#3E86A8';
    ctx.beginPath();
    ctx.moveTo(x, y + 10 * s);
    ctx.quadraticCurveTo(x + w / 2, y - 8 * s + swell, x + w, y + 10 * s);
    ctx.lineTo(x + w, y + 18 * s);
    ctx.lineTo(x, y + 18 * s);
    ctx.closePath();
    ctx.fill();
    // ยอดคลื่นขาว — เห็นชัดว่าน้ำกำลังเคลื่อน ไม่ใช่แถบสีนิ่ง
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = pal.cloud;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(x + 10 * s, y + 8 * s);
    ctx.quadraticCurveTo(x + w / 2, y - 6 * s + swell, x + w - 10 * s, y + 8 * s);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },

  /** ร่มชายหาด — ทรงสามเหลี่ยมที่ไม่ซ้ำกับอะไรในแมพอื่น อ่านออกทันทีว่าเป็นหาด */
  umbrella(ctx, x, y, s, pal, tick, seed) {
    const h = 62 * s, r = 34 * s;
    // เสาต้องเป็นสีเข้มคงที่ ถ้าใช้สีเนินเขาจะจมหายไปกับเนินที่อยู่ข้างหลังพอดี
    ctx.fillStyle = '#6B4A3A';
    ctx.fillRect(x - 2 * s, y - h, 4 * s, h);
    const cols = ['#FF8A72', '#FFF1DC'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = cols[i % 2];
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.arc(x, y - h, r, Math.PI + (i * Math.PI) / 4, Math.PI + ((i + 1) * Math.PI) / 4);
      ctx.closePath();
      ctx.fill();
    }
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
