// src/render/platforms.js
// ─────────────────────────────────────────────────────────────
// พื้นเหยียบได้ (เนิน / พื้นลอย) — หน้าตาเปลี่ยนตามด่าน ส่วนรูปผิวที่เหยียบได้มาจากที่เดียว
//
// ── ภาพกับการชนแยกกันเด็ดขาด ──
// รูปผิวบนสุดมาจาก platTop() ใน level.js ตัวเดียวกับที่ฟิสิกส์ใช้หาที่ยืน (footing)
// ไฟล์นี้แค่ "วาดตามเส้นนั้น" ไม่มีตัวเลขของตัวเองที่เท้าจะเหยียบ เปลี่ยนภาพเท่าไรการชนก็ไม่ขยับ
// ผิวชนิดใหม่ต้องเพิ่มที่ platTop() ที่เดียว (ดู CLAUDE.md)
//
// ── ยืดความยาวได้โดยภาพไม่เสีย ──
// ไม่มีภาพสำเร็จรูปที่เอามายืด — ทุกชิ้นวาดสดตามความกว้างจริงทุกเฟรม (procedural)
//   เนิน     ตัวเนินไล่ตามเส้นผิวจริง ลวดลายเล็ก ๆ ซ้ำเป็นจังหวะ ไม่มีของชิ้นใหญ่กลางเนิน
//   พื้นลอย  หัว-ท้ายเป็น "ฝา" ขนาดตายตัว (CAP) ตรงกลางเป็นลายซ้ำ ยาวเท่าไรก็แค่ซ้ำมากขึ้น
// ลายซ้ำทั้งหมดผูกกับพิกัดโลก (x ของด่าน) ไม่ใช่พิกัดจอ เลื่อนกล้องแล้วลายไม่วิ่งหนีหรือกะพริบ
// และสุ่มแบบคงที่ด้วย hash ของตำแหน่ง — แต่ละจุดหน้าตาเหมือนเดิมทุกเฟรม
//
// ── พื้นลอยเหนือหลุม ──
// เป็นพื้นลอยชิ้นเดียวกัน (หลุมเป็นของอีกชิ้นที่วางไว้ข้างใต้) จึงได้หน้าตาตามด่านเหมือนกันทุกประการ
//
// เพิ่มด่านใหม่: เพิ่มคู่ตัววาด hill/ledge ใน THEMES ข้างล่าง (คีย์ = stage.theme)
// ─────────────────────────────────────────────────────────────
import { GROUND_Y, VIEW, LEVEL } from '../config.js';
import { platTop } from '../level.js';

const { ledgeThick: T } = LEVEL;
const TAU = Math.PI * 2;

/** ธีมที่มีหน้าตาของตัวเอง — หน้าออกแบบใช้สร้างชิปแยกตามด่าน */
export const PLAT_THEMES = ['bakery', 'garden', 'cavern', 'beach', 'space', 'snow'];

/** ความกว้างฝาหัว-ท้ายของพื้นลอย — คงที่ทุกความยาว */
const CAP = 16;

/** สุ่มแบบคงที่ 0..1 จากเลขจำนวนเต็ม — จุดเดิมได้ค่าเดิมทุกเฟรม */
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const now = () => performance.now() / 1000;

/**
 * @param theme stage.theme ของด่าน (bakery / garden / cavern / beach / space / snow)
 *              ไม่รู้จัก = ใช้ชุดครัว
 *
 * ชิ้นไหนมี p.art (ธีมของด่านอื่น) ใช้หน้าตานั้นแทน — หน้าออกแบบวางเนินสวนในด่านครัวได้
 * ไม่มี p.art = ตามด่านที่วางอยู่ (ชิ้นเดิมทั้งหมดในเกมเป็นแบบนี้)
 */
export function drawPlats(ctx, plats, camera, pal, theme = 'bakery') {
  const base = THEMES[theme] || THEMES.bakery;
  for (const p of plats) {
    const x0 = p.x - camera;
    if (x0 > VIEW.W + 30 || x0 + p.w < -30) continue;
    const art = (p.art && THEMES[p.art]) || base;
    if (p.kind === 'hill') drawHill(ctx, p, camera, pal, art.hill);
    else drawLedge(ctx, p, camera, pal, art.ledge);
  }
}

// ─────────────────────────────────────────────────────────────
// โครงเนิน — ส่วนที่เหมือนกันทุกด่าน
// ─────────────────────────────────────────────────────────────

/** จุดบนเส้นผิวทุก 4px ตามพิกัดโลก — เส้นเดียวกับที่ฟิสิกส์ใช้ */
function surface(p) {
  const pts = [];
  for (let x = p.x; x < p.x + p.w; x += 4) pts.push([x, platTop(p, x)]);
  pts.push([p.x + p.w, GROUND_Y]);
  return pts;
}

/** เส้นขนานกับผิว ลึกลงไป dy (บวก = ลงล่าง) — ใช้วาดชั้นผิว/ลายตามแนวเนิน */
function traceAlong(ctx, pts, cam, dy) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x - cam, y + dy) : ctx.moveTo(x - cam, y + dy)));
}

/**
 * วาดเนินหนึ่งลูก: ตัวเนิน (ตัดตามผิว) + ชั้นของด่าน + ของประดับบนผิว
 * ฐานเนินลงไปทับแถบผิวของพื้นปกติ 8px สีล่างสุดคือสีพื้นของด่าน รอยต่อจึงกลืนกัน
 */
function drawHill(ctx, p, cam, pal, art) {
  const pts = surface(p);
  const L = p.x - cam;
  const R = p.x + p.w - cam;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(L, GROUND_Y + 8);
  for (const [x, y] of pts) ctx.lineTo(x - cam, y);
  ctx.lineTo(R, GROUND_Y + 8);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, GROUND_Y - p.h, 0, GROUND_Y + 8);
  g.addColorStop(0, art.bodyTop);
  g.addColorStop(1, pal.ground);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  art.body(ctx, p, pts, cam, pal);
  ctx.restore();

  // ของที่โผล่พ้นผิวขึ้นมา (หญ้า คริสตัล ประกาย) — วาดนอกกรอบตัด แต่เตี้ยมาก ไม่บังตัวน้อง
  if (art.top) {
    ctx.save();
    art.top(ctx, p, pts, cam, pal);
    ctx.restore();
  }
}

/** ของประดับที่วางตามผิวเป็นจังหวะ — every = ระยะห่างเฉลี่ย, คืนตำแหน่งโลก + ความสูงผิว + ค่าสุ่มคงที่ */
function alongTop(p, every, margin, fn) {
  const start = Math.ceil((p.x + margin) / every) * every;
  for (let wx = start; wx < p.x + p.w - margin; wx += every) {
    const r = hash(wx);
    const x = wx + (r - 0.5) * every * 0.5;
    const y = platTop(p, x);
    if (y !== null) fn(x, y, r, wx);
  }
}

// ─────────────────────────────────────────────────────────────
// โครงพื้นลอย — ฝาซ้าย + กลางซ้ำ + ฝาขวา
// ─────────────────────────────────────────────────────────────

function drawLedge(ctx, p, cam, pal, art) {
  const x = p.x - cam;
  // ถาม platTop ตัวเดียวกับฟิสิกส์ — แท่งที่เขียนว่า lift กับที่เขียนว่า top จึงวาดที่เดียวกันเสมอ
  const y = platTop(p, p.x);
  const w = p.w;

  // เงาบนพื้น บอกว่าลอยอยู่ (เหนือหลุมเงาก็ตกลงไปในหลุมที่มืดอยู่แล้ว แทบไม่เห็น ไม่รบกวน)
  ctx.save();
  ctx.fillStyle = art.shadow || 'rgba(0,0,0,.2)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, GROUND_Y + 2, w * 0.42, 5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  art(ctx, x, y, w, p.x, pal);
  ctx.restore();
}

/** แสงเรืองนุ่ม ๆ ใต้แผ่น — วงรีจางออกทุกทิศ (สี่เหลี่ยมไล่สีเห็นขอบข้างแข็ง ๆ) */
function underGlow(ctx, x, y, w, rgb, a) {
  const cx = x + w / 2;
  ctx.save();
  ctx.translate(cx, y);
  ctx.scale(Math.max(1, w / 2 / 18), 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI); ctx.fill();
  ctx.restore();
}

/** กรอบมนของแผ่นหลัก — ใช้ทั้ง fill และ clip */
function slab(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * ลายซ้ำช่วงกลางของพื้นลอย — ผูกกับพิกัดโลก ของที่ยาวขึ้นแค่ได้ลายเพิ่ม ไม่ยืด
 * fn(xจอ, ลำดับ, ค่าสุ่มคงที่)
 */
function repeatMid(x, w, worldX, period, fn, capL = CAP, capR = CAP) {
  const first = Math.ceil((worldX + capL) / period) * period;
  for (let wx = first; wx < worldX + w - capR; wx += period) {
    fn(x + (wx - worldX), Math.round(wx / period), hash(wx));
  }
}

// ─────────────────────────────────────────────────────────────
// 🌙 ครัวกลางคืน — เนินแป้งอบ / ชั้นไม้ถาดอบ
// ─────────────────────────────────────────────────────────────
const bakeryHill = {
  bodyTop: '#F2CD8E',
  body(ctx, p, pts, cam) {
    // เปลือกแป้งอบสีทองตามผิว + ขอบไหม้บาง ๆ + ไฮไลต์แสงเตาอบ
    traceAlong(ctx, pts, cam, 9);
    ctx.lineWidth = 18; ctx.lineJoin = 'round'; ctx.strokeStyle = '#D9914A'; ctx.stroke();
    traceAlong(ctx, pts, cam, 17);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(150,80,30,.45)'; ctx.stroke();
    traceAlong(ctx, pts, cam, 2.5);
    ctx.lineWidth = 3; ctx.strokeStyle = '#FFE3AE'; ctx.stroke();
    // เนื้อแป้งฟู — รูพรุนเล็ก ๆ กับเกล็ดน้ำตาล กระจายสม่ำเสมอ ไม่มีจุดเด่นกลางเนิน
    for (let wx = Math.ceil(p.x / 30) * 30; wx < p.x + p.w; wx += 30) {
      const top = platTop(p, wx);
      if (top === null) continue;
      for (let k = 0; k < 2; k++) {
        const r = hash(wx * 3 + k);
        const yy = top + 28 + r * 44;
        if (yy > GROUND_Y + 4) continue;
        ctx.fillStyle = k ? 'rgba(255,248,230,.7)' : 'rgba(176,112,52,.35)';
        ctx.beginPath();
        ctx.ellipse(wx - cam + r * 12, yy, k ? 1.6 : 3, k ? 1.6 : 2, r * 3, 0, TAU);
        ctx.fill();
      }
    }
  },
  top(ctx, p, pts, cam) {
    // ผงแป้งโปรยบนผิว — จุดขาวเล็ก ๆ วางตามจังหวะ
    ctx.fillStyle = 'rgba(255,252,240,.85)';
    alongTop(p, 18, 10, (x, y, r) => {
      ctx.beginPath();
      ctx.arc(x - cam, y + 1.5, 1 + r * 1.3, 0, TAU);
      ctx.fill();
    });
  },
};

function bakeryLedge(ctx, x, y, w, wx) {
  // ขายึดทองเหลืองใต้ปลายทั้งสองข้าง (ฝา) — ชั้นวางในครัวเบเกอรี่
  ctx.fillStyle = '#B9803E';
  for (const bx of [x + 10, x + w - 16]) {
    ctx.beginPath();
    ctx.moveTo(bx, y + T); ctx.lineTo(bx + 6, y + T); ctx.lineTo(bx + 6, y + T + 12); ctx.closePath();
    ctx.fill();
  }
  // แผ่นไม้
  slab(ctx, x, y, w, T, 7);
  const g = ctx.createLinearGradient(0, y, 0, y + T);
  g.addColorStop(0, '#C98A4E'); g.addColorStop(1, '#8E5A2E');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  // ลายไม้ซ้ำ + รอยต่อแผ่นไม้
  ctx.strokeStyle = 'rgba(90,50,20,.35)'; ctx.lineWidth = 1.2;
  repeatMid(x, w, wx, 12, (sx, i, r) => {
    ctx.beginPath();
    ctx.moveTo(sx, y + 9 + r * 4); ctx.bezierCurveTo(sx + 4, y + 8 + r * 4, sx + 8, y + 12 + r * 4, sx + 12, y + 10 + r * 4);
    ctx.stroke();
  }, 4, 4);
  ctx.strokeStyle = 'rgba(70,36,14,.45)'; ctx.lineWidth = 1.5;
  repeatMid(x, w, wx, 64, (sx) => { ctx.beginPath(); ctx.moveTo(sx, y + 7); ctx.lineTo(sx, y + T); ctx.stroke(); });
  // ขอบถาดโลหะด้านหน้า
  ctx.fillStyle = '#C9CED8'; ctx.fillRect(x, y + T - 6, w, 3);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x, y + T - 6, w, 1);
  // ผิวบนโดนแสงส้มจากเตา — แถบเดินได้ที่ต้องอ่านออกทันที
  ctx.fillStyle = '#FFCB86'; ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = '#FFE6BF'; ctx.fillRect(x, y, w, 2);
  ctx.restore();
  slab(ctx, x, y, w, T, 7);
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(60,24,10,.5)'; ctx.stroke();
}

// ─────────────────────────────────────────────────────────────
// 🌸 สวนกลางวัน — เนินหญ้ากับรากไม้ / กิ่งไม้ใหญ่มีใบ
// ─────────────────────────────────────────────────────────────
const gardenHill = {
  bodyTop: '#8B6440',
  body(ctx, p, pts, cam) {
    // รากไม้เลื้อยในดิน — เส้นโค้งซ้ำตามแนวนอน ลึกหลายระดับ
    ctx.strokeStyle = 'rgba(92,58,32,.55)'; ctx.lineCap = 'round';
    for (let wx = Math.ceil(p.x / 38) * 38; wx < p.x + p.w; wx += 38) {
      const top = platTop(p, wx);
      if (top === null) continue;
      const r = hash(wx);
      const yy = top + 26 + r * 30;
      if (yy > GROUND_Y) continue;
      ctx.lineWidth = 2 + r * 2;
      ctx.beginPath();
      ctx.moveTo(wx - cam, yy);
      ctx.quadraticCurveTo(wx - cam + 14, yy + 8 - r * 14, wx - cam + 30, yy + 3);
      ctx.stroke();
    }
    // ก้อนกรวดเล็ก
    ctx.fillStyle = 'rgba(200,170,130,.45)';
    for (let wx = Math.ceil(p.x / 27) * 27; wx < p.x + p.w; wx += 27) {
      const top = platTop(p, wx);
      const r = hash(wx + 9);
      if (top === null || top + 20 + r * 40 > GROUND_Y) continue;
      ctx.beginPath(); ctx.ellipse(wx - cam, top + 20 + r * 40, 2.5, 1.8, 0, 0, TAU); ctx.fill();
    }
    // ชั้นหญ้าหนาตามผิว
    traceAlong(ctx, pts, cam, 6);
    ctx.lineWidth = 13; ctx.lineJoin = 'round'; ctx.strokeStyle = '#5FB547'; ctx.stroke();
    traceAlong(ctx, pts, cam, 12);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(40,100,40,.5)'; ctx.stroke();
    traceAlong(ctx, pts, cam, 1.5);
    ctx.lineWidth = 3; ctx.strokeStyle = '#A6E57A'; ctx.stroke();
  },
  top(ctx, p, pts, cam) {
    // กอหญ้าเตี้ย ๆ กับดอกไม้จิ๋ว กระจายทั่วผิว ไม่มีดอกใหญ่กลางเนิน
    alongTop(p, 13, 6, (x, y, r) => {
      ctx.fillStyle = r > 0.5 ? '#6FC452' : '#56A83E';
      ctx.beginPath();
      ctx.moveTo(x - cam - 3, y + 1);
      ctx.lineTo(x - cam - 1, y - 4 - r * 3);
      ctx.lineTo(x - cam + 1, y + 1);
      ctx.lineTo(x - cam + 3, y - 3 - r * 2);
      ctx.lineTo(x - cam + 4, y + 1);
      ctx.fill();
    });
    alongTop(p, 46, 16, (x, y, r) => {
      const c = ['#FF8FB8', '#FFF4A3', '#FFFFFF', '#C7A6FF'][Math.floor(r * 4)];
      ctx.fillStyle = c;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU;
        ctx.beginPath(); ctx.arc(x - cam + Math.cos(a) * 2.4, y - 4 + Math.sin(a) * 2.4, 1.7, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#FFC93C';
      ctx.beginPath(); ctx.arc(x - cam, y - 4, 1.4, 0, TAU); ctx.fill();
    });
  },
};

function gardenLedge(ctx, x, y, w, wx) {
  // ใบไม้ห้อยใต้กิ่งเป็นจังหวะ
  repeatMid(x, w, wx, 34, (sx, i, r) => {
    ctx.save();
    ctx.translate(sx, y + T - 3);
    ctx.rotate(0.5 + r * 0.6);
    ctx.fillStyle = r > 0.5 ? '#6CC24A' : '#4FA23A';
    ctx.beginPath(); ctx.ellipse(6, 0, 7, 3.2, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }, 20, 20);
  // ลำกิ่ง (เปลือกไม้)
  slab(ctx, x, y + 2, w, T - 2, 12);
  const g = ctx.createLinearGradient(0, y, 0, y + T);
  g.addColorStop(0, '#A36E43'); g.addColorStop(1, '#6E4526');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(60,34,16,.45)'; ctx.lineWidth = 1.4;
  repeatMid(x, w, wx, 16, (sx, i, r) => {
    ctx.beginPath(); ctx.moveTo(sx, y + 10 + r * 3); ctx.lineTo(sx + 9, y + 12 + r * 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 5, y + 18 + r * 2); ctx.lineTo(sx + 13, y + 19 + r * 2); ctx.stroke();
  }, 10, 10);
  ctx.restore();
  // ฝาซ้าย = ปลายกิ่งที่ตัด เห็นวงปี
  ctx.fillStyle = '#E2B886';
  ctx.beginPath(); ctx.ellipse(x + 6, y + T / 2 + 1, 5.5, T / 2 - 2, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(130,80,40,.6)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(x + 6, y + T / 2 + 1, 2.8, 6, 0, 0, TAU); ctx.stroke();
  // ผิวบนเป็นมอสเขียวสด — แถบเดินได้
  slab(ctx, x + 1, y, w - 2, 7, 5);
  ctx.fillStyle = '#7ED25A'; ctx.fill();
  ctx.fillStyle = '#B8F08E'; ctx.fillRect(x + 4, y + 1, w - 8, 2);
  // ฝาขวา = กระจุกใบไม้ที่ปลายกิ่ง
  for (const [dx, dy, a] of [[-2, 4, -0.6], [3, 9, 0.2], [-1, 14, 0.8]]) {
    ctx.save();
    ctx.translate(x + w + dx, y + dy);
    ctx.rotate(a);
    ctx.fillStyle = '#5DB543';
    ctx.beginPath(); ctx.ellipse(5, 0, 8, 4, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  slab(ctx, x, y, w, T, 12);
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(50,30,12,.35)'; ctx.stroke();
}

// ─────────────────────────────────────────────────────────────
// 💎 ถ้ำคริสตัล — เนินหินชั้น ๆ มีผลึก / หิ้งหินคริสตัล
// ─────────────────────────────────────────────────────────────
const CRYSTAL = ['#8FE9FF', '#C7A6FF', '#FF9FD2'];

const cavernHill = {
  bodyTop: '#6A5B8E',
  body(ctx, p, pts, cam) {
    // ชั้นหินขนานกับผิว — ความลึกต่างกันสามชั้น
    for (const [dy, a] of [[22, 0.35], [40, 0.28], [58, 0.22]]) {
      traceAlong(ctx, pts, cam, dy);
      ctx.lineWidth = 2; ctx.strokeStyle = `rgba(40,30,70,${a})`; ctx.stroke();
    }
    // สายแร่เรืองแสงจุดเล็ก ๆ ในเนื้อหิน
    for (let wx = Math.ceil(p.x / 24) * 24; wx < p.x + p.w; wx += 24) {
      const top = platTop(p, wx);
      const r = hash(wx);
      if (top === null || top + 18 + r * 46 > GROUND_Y) continue;
      ctx.fillStyle = CRYSTAL[Math.floor(r * 3)];
      ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.arc(wx - cam, top + 18 + r * 46, 1.5 + r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // ขอบหินสีอ่อนตามผิว ปลายเป็นเหลี่ยม ๆ
    traceAlong(ctx, pts, cam, 4);
    ctx.lineWidth = 8; ctx.lineJoin = 'bevel'; ctx.strokeStyle = '#9A8CC4'; ctx.stroke();
    traceAlong(ctx, pts, cam, 1);
    ctx.lineWidth = 2; ctx.strokeStyle = '#D6CCF2'; ctx.stroke();
  },
  top(ctx, p, pts, cam) {
    // ผลึกเล็ก ๆ โผล่จากผิวเป็นระยะ — เตี้ยไม่เกิน 9px ไม่บังตัวน้อง
    const tw = now();
    alongTop(p, 42, 18, (x, y, r) => {
      const c = CRYSTAL[Math.floor(r * 3)];
      const h = 5 + r * 4;
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(x - cam - 3, y + 1); ctx.lineTo(x - cam - 1, y - h); ctx.lineTo(x - cam + 1.5, y + 1);
      ctx.moveTo(x - cam, y + 1); ctx.lineTo(x - cam + 3, y - h * 0.7); ctx.lineTo(x - cam + 5, y + 1);
      ctx.fill();
      // ประกายวิบ ๆ บนยอดผลึก
      const tw1 = 0.5 + 0.5 * Math.sin(tw * 2.2 + r * 20);
      ctx.globalAlpha = 0.35 + tw1 * 0.5;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(x - cam - 1, y - h, 1.2, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    });
  },
};

function cavernLedge(ctx, x, y, w, wx) {
  // ผลึกห้อยใต้หิ้ง + แสงเรืองจาง ๆ ข้างใต้
  underGlow(ctx, x, y + T - 2, w, '143,233,255', 0.26);
  repeatMid(x, w, wx, 22, (sx, i, r) => {
    ctx.fillStyle = CRYSTAL[Math.floor(r * 3)];
    ctx.globalAlpha = 0.85;
    const h = 6 + r * 8;
    ctx.beginPath(); ctx.moveTo(sx - 4, y + T - 2); ctx.lineTo(sx, y + T + h); ctx.lineTo(sx + 4, y + T - 2); ctx.fill();
    ctx.globalAlpha = 1;
  }, 12, 12);
  // ตัวหิ้งหิน ปลายหยักเป็นหิน (ฝา)
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 4);
  ctx.lineTo(x + w - 3, y + 4);
  ctx.lineTo(x + w, y + 12); ctx.lineTo(x + w - 5, y + T); ctx.lineTo(x + 6, y + T); ctx.lineTo(x, y + 13);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y, 0, y + T);
  g.addColorStop(0, '#7A6BA6'); g.addColorStop(1, '#4C4070');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(30,20,60,.35)'; ctx.lineWidth = 1.3;
  repeatMid(x, w, wx, 30, (sx, i, r) => {
    ctx.beginPath(); ctx.moveTo(sx, y + 8); ctx.lineTo(sx + 6 * (r - 0.5), y + 16); ctx.lineTo(sx + 3, y + T); ctx.stroke();
  }, 8, 8);
  ctx.restore();
  // ผิวบน = แผ่นคริสตัลเรียบ เงาฟ้าอมม่วง เห็นชัดว่าเหยียบได้
  slab(ctx, x + 1, y, w - 2, 7, 3);
  const top = ctx.createLinearGradient(x, 0, x + w, 0);
  top.addColorStop(0, '#9FEFFF'); top.addColorStop(0.5, '#D7C4FF'); top.addColorStop(1, '#9FEFFF');
  ctx.fillStyle = top; ctx.fill();
  ctx.save();
  slab(ctx, x + 1, y, w - 2, 7, 3); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
  repeatMid(x, w, wx, 14, (sx) => { ctx.beginPath(); ctx.moveTo(sx, y + 7); ctx.lineTo(sx + 5, y); ctx.stroke(); }, 4, 4);
  ctx.restore();
  ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.7; ctx.fillRect(x + 4, y + 1, w - 8, 1.2); ctx.globalAlpha = 1;
}

// ─────────────────────────────────────────────────────────────
// 🌅 ชายหาดยามเย็น — เนินทรายลายลม / ท่าเรือไม้
// ─────────────────────────────────────────────────────────────
const beachHill = {
  bodyTop: '#F7D49A',
  body(ctx, p, pts, cam) {
    // ลายลมบนทราย — เส้นคลื่นขนานกับผิว
    for (const [dy, a] of [[12, 0.35], [24, 0.28], [36, 0.22], [48, 0.16]]) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const yy = y + dy + Math.sin((x + dy * 7) / 11) * 1.6;
        i ? ctx.lineTo(x - cam, yy) : ctx.moveTo(x - cam, yy);
      });
      ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(196,132,70,${a})`; ctx.stroke();
    }
    // เปลือกหอยจิ๋วกับเม็ดทรายเข้ม
    for (let wx = Math.ceil(p.x / 31) * 31; wx < p.x + p.w; wx += 31) {
      const top = platTop(p, wx);
      const r = hash(wx);
      if (top === null) continue;
      const yy = top + 16 + r * 40;
      if (yy > GROUND_Y) continue;
      if (r > 0.62) {
        ctx.fillStyle = r > 0.8 ? '#FFD4DE' : '#FFF4E6';
        ctx.beginPath(); ctx.arc(wx - cam, yy, 3.2, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(190,120,110,.6)'; ctx.lineWidth = 0.8;
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(wx - cam, yy); ctx.lineTo(wx - cam + k * 2.2, yy - 2.6); ctx.stroke(); }
      } else {
        ctx.fillStyle = 'rgba(170,110,60,.35)';
        ctx.beginPath(); ctx.arc(wx - cam, yy, 1.3, 0, TAU); ctx.fill();
      }
    }
    // ผิวทรายนุ่มสว่าง
    traceAlong(ctx, pts, cam, 2);
    ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = '#FFEBC4'; ctx.stroke();
  },
  top(ctx, p, pts, cam) {
    // หญ้าชายหาดเส้นเล็ก ๆ ขึ้นห่าง ๆ (เฉพาะช่วงลาด — บนยอดเนินโล่ง อ่านเป็นทางเดินชัด)
    ctx.strokeStyle = '#8BA85A'; ctx.lineCap = 'round'; ctx.lineWidth = 1.4;
    alongTop(p, 26, 8, (x, y, r) => {
      if (y <= GROUND_Y - p.h + 2 || r < 0.45) return;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.moveTo(x - cam + k * 2, y + 1);
        ctx.quadraticCurveTo(x - cam + k * 3, y - 5, x - cam + k * 5 + 2, y - 8 - r * 3);
        ctx.stroke();
      }
    });
  },
};

function beachLedge(ctx, x, y, w, wx) {
  // เชือกหย่อนใต้ท่า ระหว่างเสาหัว-ท้าย — หย่อนตามความยาวจริง ไม่ยืดภาพ
  ctx.strokeStyle = '#E8CFA0'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + T - 2);
  ctx.quadraticCurveTo(x + w / 2, y + T + Math.min(14, w * 0.05), x + w - 8, y + T - 2);
  ctx.stroke();
  // แผ่นกระดานไม้
  slab(ctx, x + 4, y + 2, w - 8, T - 6, 3);
  ctx.fillStyle = '#B98655'; ctx.fill();
  ctx.save(); ctx.clip();
  repeatMid(x, w, wx, 20, (sx, i, r) => {
    ctx.fillStyle = r > 0.5 ? 'rgba(255,230,190,.14)' : 'rgba(80,45,20,.12)';
    ctx.fillRect(sx, y, 20, T);
    ctx.fillStyle = 'rgba(70,40,18,.55)'; ctx.fillRect(sx, y, 1.5, T);        // ร่องกระดาน
    ctx.fillStyle = '#5E4A3A';                                               // ตะปู
    ctx.beginPath(); ctx.arc(sx + 5, y + 7, 1.1, 0, TAU); ctx.arc(sx + 5, y + T - 9, 1.1, 0, TAU); ctx.fill();
  }, 6, 6);
  ctx.restore();
  // ผิวบนไม้ซีดโดนแดดเย็น
  ctx.fillStyle = '#E6BD85'; ctx.fillRect(x + 4, y + 2, w - 8, 4);
  ctx.fillStyle = '#FFE0B0'; ctx.fillRect(x + 4, y + 2, w - 8, 1.5);
  // เสาท่าเรือหัว-ท้าย (ฝา) ยื่นสูงกว่าพื้นนิดเดียว มีเชือกพัน
  for (const px of [x, x + w - 9]) {
    slab(ctx, px, y - 3, 9, T + 7, 3);
    ctx.fillStyle = '#8A5E3A'; ctx.fill();
    ctx.fillStyle = '#E8CFA0';
    ctx.fillRect(px, y + 6, 9, 2.5); ctx.fillRect(px, y + 10, 9, 2.5);
    ctx.fillStyle = 'rgba(255,230,190,.4)'; ctx.fillRect(px + 1.5, y - 2, 2, T + 4);
  }
  slab(ctx, x + 4, y + 2, w - 8, T - 6, 3);
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(70,40,18,.45)'; ctx.stroke();
}

// ─────────────────────────────────────────────────────────────
// 🌌 ห้วงอวกาศ — เนินหินอวกาศมีเส้นพลังงาน / แผ่นพลังงานลอย
// ─────────────────────────────────────────────────────────────
const spaceHill = {
  bodyTop: '#4A3C78',
  body(ctx, p, pts, cam) {
    // หลุมอุกกาบาตจิ๋ว กระจายเท่า ๆ กัน (ไม่มีหลุมใหญ่กลางเนิน)
    for (let wx = Math.ceil(p.x / 34) * 34; wx < p.x + p.w; wx += 34) {
      const top = platTop(p, wx);
      const r = hash(wx);
      if (top === null) continue;
      const yy = top + 22 + r * 36;
      if (yy > GROUND_Y) continue;
      const rr = 3 + r * 3;
      ctx.fillStyle = 'rgba(20,12,44,.45)';
      ctx.beginPath(); ctx.ellipse(wx - cam, yy, rr, rr * 0.6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(160,140,220,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(wx - cam, yy + 0.8, rr, rr * 0.6, 0, 0.1, Math.PI - 0.1); ctx.stroke();
    }
    // ดาวจิ๋วกะพริบในเนื้อหิน
    const tw = now();
    for (let wx = Math.ceil(p.x / 21) * 21; wx < p.x + p.w; wx += 21) {
      const top = platTop(p, wx);
      const r = hash(wx + 5);
      if (top === null || top + 14 + r * 50 > GROUND_Y || r < 0.5) continue;
      ctx.globalAlpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(tw * 3 + r * 30));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(wx - cam, top + 14 + r * 50, 1.6, 1.6);
      ctx.globalAlpha = 1;
    }
    // เส้นพลังงานเรืองตามผิว (ขอบบน)
    traceAlong(ctx, pts, cam, 3);
    ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.strokeStyle = '#7B67C4'; ctx.stroke();
    traceAlong(ctx, pts, cam, 9);
    ctx.lineWidth = 1.6; ctx.setLineDash([10, 8]); ctx.strokeStyle = 'rgba(127,245,255,.75)'; ctx.stroke();
    ctx.setLineDash([]);
    traceAlong(ctx, pts, cam, 1);
    ctx.lineWidth = 2; ctx.strokeStyle = '#C9BCFF'; ctx.stroke();
  },
};

function spaceLedge(ctx, x, y, w, wx) {
  const t = now();
  // แสงพลังงานใต้แผ่น + เศษโลหะเล็ก ๆ ลอยขึ้นลงช้า ๆ
  underGlow(ctx, x, y + T - 2, w, '127,245,255', 0.3);
  repeatMid(x, w, wx, 46, (sx, i, r) => {
    const bob = Math.sin(t * 1.6 + r * 9) * 2;
    ctx.fillStyle = 'rgba(180,170,230,.7)';
    ctx.save();
    ctx.translate(sx + r * 10, y + T + 8 + r * 6 + bob);
    ctx.rotate(r * 3);
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }, 20, 20);
  // ตัวแผ่นโลหะอวกาศ
  slab(ctx, x, y, w, T, 8);
  const g = ctx.createLinearGradient(0, y, 0, y + T);
  g.addColorStop(0, '#4B4380'); g.addColorStop(1, '#2A2450');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  // ช่องแผงไฟ วิ่งเป็นจังหวะ
  repeatMid(x, w, wx, 24, (sx, i) => {
    const on = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 3 - i * 0.7));
    ctx.fillStyle = `rgba(127,245,255,${0.25 + on * 0.5})`;
    ctx.beginPath(); ctx.roundRect(sx - 6, y + 13, 12, 3, 1.5); ctx.fill();
  }, 20, 20);
  ctx.restore();
  // ผิวบนเรืองฟ้า — เห็นชัดว่าเหยียบได้
  ctx.fillStyle = '#7FF5FF'; ctx.fillRect(x + 6, y, w - 12, 3);
  ctx.fillStyle = 'rgba(127,245,255,.25)'; ctx.fillRect(x + 6, y + 3, w - 12, 4);
  // ฝาหัว-ท้าย: ปลอกโลหะมีไฟชมพู
  for (const cx of [x + 8, x + w - 8]) {
    ctx.fillStyle = '#6A62A8';
    ctx.beginPath(); ctx.arc(cx, y + T / 2, T / 2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FF9FD2';
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4);
    ctx.beginPath(); ctx.arc(cx, y + T / 2, 3.5, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  slab(ctx, x, y, w, T, 8);
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(200,190,255,.5)'; ctx.stroke();
}

// ─────────────────────────────────────────────────────────────
// ❄️ ทุ่งหิมะ — เนินหิมะหนานุ่ม / หิ้งน้ำแข็งลอย
// ─────────────────────────────────────────────────────────────
const snowHill = {
  // ฟ้าน้ำแข็งเข้มกว่าหิมะรอบด่าน — ฉากหลังขาวทั้งจอ ถ้าเนินสีอ่อนจะกลืนหายจนไม่รู้ว่าเป็นพื้น
  bodyTop: '#7FA8D8',
  body(ctx, p, pts, cam) {
    // เกล็ดน้ำแข็งเล็ก ๆ ในเนื้อดินเยือกแข็ง
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1;
    for (let wx = Math.ceil(p.x / 29) * 29; wx < p.x + p.w; wx += 29) {
      const top = platTop(p, wx);
      const r = hash(wx);
      if (top === null) continue;
      const yy = top + 26 + r * 36;
      if (yy > GROUND_Y) continue;
      ctx.beginPath(); ctx.moveTo(wx - cam - 3, yy); ctx.lineTo(wx - cam + 3, yy - 2); ctx.lineTo(wx - cam + 1, yy + 3); ctx.stroke();
    }
    // หิมะหนาคลุมผิว — ขอบล่างเป็นลอนนุ่ม ๆ
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x - cam, y - 1) : ctx.moveTo(x - cam, y - 1)));
    for (let i = pts.length - 1; i >= 0; i--) {
      const [x, y] = pts[i];
      ctx.lineTo(x - cam, y + 12 + Math.sin(x / 9) * 2.5 + Math.sin(x / 23) * 1.5);
    }
    ctx.closePath();
    ctx.fillStyle = '#F7FBFF'; ctx.fill();
    // เงาฟ้าใต้ชั้นหิมะ
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const yy = y + 13 + Math.sin(x / 9) * 2.5 + Math.sin(x / 23) * 1.5;
      i ? ctx.lineTo(x - cam, yy) : ctx.moveTo(x - cam, yy);
    });
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(62,98,160,.6)'; ctx.stroke();
  },
  top(ctx, p, pts, cam) {
    // เส้นขอบบนของหิมะสีน้ำเงินจาง ๆ — เนินขาวบนฉากขาวต้องมีขอบถึงจะอ่านออกว่าเป็นพื้น
    traceAlong(ctx, pts, cam, -1);
    ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(62,98,160,.55)'; ctx.stroke();
    // ประกายหิมะกะพริบบนผิว
    const tw = now();
    alongTop(p, 24, 10, (x, y, r) => {
      const a = 0.5 + 0.5 * Math.sin(tw * 2.5 + r * 25);
      if (a < 0.35) return;
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.2;
      const s = 2 + r * 1.5;
      ctx.beginPath();
      ctx.moveTo(x - cam - s, y + 4); ctx.lineTo(x - cam + s, y + 4);
      ctx.moveTo(x - cam, y + 4 - s); ctx.lineTo(x - cam, y + 4 + s);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  },
};

function snowLedge(ctx, x, y, w, wx) {
  // หยาดน้ำแข็งห้อยใต้แผ่น ความยาวคงที่ตามจุด (สุ่มคงที่) ไม่เกิน 14px
  repeatMid(x, w, wx, 13, (sx, i, r) => {
    const h = 4 + r * 10;
    ctx.fillStyle = 'rgba(200,236,255,.9)';
    ctx.beginPath(); ctx.moveTo(sx - 3, y + T - 3); ctx.lineTo(sx, y + T - 3 + h); ctx.lineTo(sx + 3, y + T - 3); ctx.fill();
  }, 10, 10);
  // ตัวน้ำแข็งใส
  slab(ctx, x, y + 3, w, T - 3, 7);
  const g = ctx.createLinearGradient(0, y, 0, y + T);
  g.addColorStop(0, '#8CC6F0'); g.addColorStop(1, '#4F8CCB');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  // รอยร้าวบาง ๆ ห่าง ๆ
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1;
  repeatMid(x, w, wx, 52, (sx, i, r) => {
    ctx.beginPath(); ctx.moveTo(sx, y + 14); ctx.lineTo(sx + 4 + r * 3, y + T - 3); ctx.stroke();
  }, 12, 12);
  // แสงสะท้อนแนวนอนบาง ๆ ใต้ชั้นหิมะ — น้ำแข็งใสโดยไม่รกตา
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x + 6, y + 11, w - 12, 1.5);
  ctx.restore();
  slab(ctx, x, y + 3, w, T - 3, 7);
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(40,80,140,.55)'; ctx.stroke();
  // หิมะคลุมด้านบน ขอบล่างเป็นลอน — แถบเดินได้สีขาวเด่นชัด
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 4);
  ctx.quadraticCurveTo(x + 2, y, x + 8, y);
  ctx.lineTo(x + w - 8, y);
  ctx.quadraticCurveTo(x + w - 2, y, x + w - 2, y + 4);
  for (let sx = x + w - 2; sx >= x + 2; sx -= 3) {
    ctx.lineTo(sx, y + 8 + Math.sin((sx - x + wx) / 5) * 1.5 + (hash(Math.round(sx - x + wx)) > 0.8 ? 2 : 0));
  }
  ctx.closePath();
  ctx.fillStyle = '#F8FCFF'; ctx.fill();
  ctx.strokeStyle = 'rgba(62,98,160,.55)'; ctx.lineWidth = 1.3; ctx.stroke();
  // ฝาหัว-ท้าย: ก้อนหิมะกลมนุ่ม
  ctx.fillStyle = '#FFFFFF';
  for (const cx of [x + 4, x + w - 4]) {
    ctx.beginPath(); ctx.arc(cx, y + 4, 5, 0, TAU); ctx.fill();
  }
}

// ─────────────────────────────────────────────────────────────
// ตารางตามด่าน (คีย์ = stage.theme)
// ─────────────────────────────────────────────────────────────
const THEMES = {
  bakery: { hill: bakeryHill, ledge: bakeryLedge },
  garden: { hill: gardenHill, ledge: gardenLedge },
  cavern: { hill: cavernHill, ledge: cavernLedge },
  beach: { hill: beachHill, ledge: beachLedge },
  space: { hill: spaceHill, ledge: spaceLedge },
  snow: { hill: snowHill, ledge: snowLedge },
};
