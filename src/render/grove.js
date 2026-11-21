// src/render/grove.js
// ─────────────────────────────────────────────────────────────
// 🌳 ป่าผลึก (grove) — ถิ่นของบอสภูตตอไม้ (แบบจากผู้ใช้ 21 พ.ย. 2026 · ภาพใน docs/stage-grove/)
//   ฟ้าม่วงลาเวนเดอร์ แดดฟุ้งซ้ายบน ลำแสงขอบนุ่ม เมฆ · ยอดผลึกยักษ์เรืองแสงไกล ๆ · ป่าหมอก
//   ต้นไม้ใหญ่มีราก เปลือก มอส เห็ดเรืองแสง · พุ่มไม้ 3 โทนห้อยเถาวัลย์ + ผลึกหยดเรืองแสง
//   ตอไม้ เห็ด กอผลึก เฟิร์น · พุ่มไม้ติดพื้น · หิ่งห้อย กลีบดอกปลิว
//   พื้นมอสมีกอหญ้า เห็ดจิ๋ว · ดินม่วงมีชั้น ราก หิน ผลึกเรืองแสงฝังดิน · ใบไม้เข้มชั้นหน้าสุด
//
// ── วาดสดเป็นชั้น ไม่ใช่ภาพแปะ ──
// ชั้นละแถบกว้าง TILE วาดครั้งเดียวเก็บเป็นแผ่น (สุ่มคงที่ด้วย hash) แล้วเลื่อนต่อกันวนซ้ำ
// ของที่คร่อมขอบแผ่นถูกวาดซ้ำอีกฝั่ง แผ่นจึงต่อกันไม่เห็นรอย · ความเร็วเลื่อนต่างกันตามความลึก
// แผ่นเก็บที่ความละเอียด 2 เท่า (SPR_K) — จอมือถือความละเอียดสูงไม่เบลอ (ผู้ใช้ 22 พ.ย.: "ให้สวยขึ้นเห็นได้ชัด")
//
// ── แถบกลางจอ (ที่น้องกระโดด) ต้องสงบ / สิ่งกีดขวางต้องเด่นสุด ──
// ฉากหลังทั้งหมดทับหมอกม่วงตามความลึก · ของที่ต้องหลบใช้สีเข้มอิ่ม แสงขอบ เงาฟุ้งตกพื้น (OBS_*)
// ทุกค่าสุ่มของสิ่งกีดขวางใช้ seed = ตำแหน่งในด่าน (o.x) — สุ่มจากพิกัดจอแล้วของกะพริบ (เปลี่ยนทุกเฟรม)
//
// ใช้ที่: BACKDROPS.grove / GROUND_ART.grove (background.js) · THEME_ART.grove (entities.js) · THEMES.grove (platforms.js)
// ชั้นหน้าสุด drawGroveFront — ผู้เรียกวาดเองหลังตัวละคร (ตอนนี้ gameplay-lab)
// ไม่มีเส้นขอบตัด (กฎ no-outline) — นูนด้วยไล่สี/แสงเงา
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from '../config.js';

const { W, H } = VIEW;
const G = GROUND_Y;
const TAU = Math.PI * 2;
const TILE = 1920;
const SPR_K = 2;

/** จานสีของด่าน (ช่องเดียวกับ stage.palette ที่ drawGround ใช้) */
export const GROVE_PAL = {
  ground: '#A97AA6', crust: '#CFCF7A', crustTop: '#E8EB9C', crumb: '#B98FB8',
  pitEdge: '#6E4A72', pitFill: '#4A2F55', pitDeep: '#24152E',
};

export const GROVE_C = {
  skyTop: '#AE98EE', skyMid: '#D8BFF2', skyLow: '#F6D8EC',
  farTree: '#CDB8EE', farTree2: '#C0A6E6',
  crystal: '#E6DAFF', crystal2: '#C3A9FA',
  trunk: '#C796A6', trunkDark: '#A27598', trunkHi: '#E3B9BF',
  canopy: '#C29BD6', canopyDark: '#A27CC0', canopyHi: '#E6CBEE',
  flower: '#FFF0D8', flowerMid: '#F4B88E',
  vine: '#9FA468', vineLeaf: '#B4BA76',
  stump: '#C88F8F', stump2: '#A97A9E', stumpTop: '#EEC2A2', stumpRing: 'rgba(205,140,120,.55)',
  moss: '#B8BE74',
  mushCap: '#F5A3C4', mushCap2: '#E486AF', mushDot: '#FFE9F2', mushStem: '#FCEDEF',
  bush: '#A8AE73', bush2: '#8E9A63', bushLav: '#B79BD8',
  soil: '#B486B2', soil2: '#946396', soilDeep: '#7E5383', stone: '#CBA3C8',
  mossTop: '#D3D97C', mossTop2: '#B9C266', mossHi: '#F0F3AE', grass: '#A9B95A',
};
const C = GROVE_C;

export function groveHash(n) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}
const hash = groveHash;
const wrap = (v, m) => { const r = v % m; return r < 0 ? r + m : r; };

// ── แผ่นแคช (ความละเอียด 2 เท่า) ──
const SPR = {};
function sprite(key, w, h, paint) {
  if (SPR[key]) return SPR[key];
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w * SPR_K); cv.height = Math.ceil(h * SPR_K);
  const c = cv.getContext('2d');
  c.scale(SPR_K, SPR_K);
  paint(c, w, h);
  cv.lw = w; cv.lh = h;
  SPR[key] = cv;
  return cv;
}
function tileRow(ctx, img, offset, y, alpha = 1) {
  if (!img) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  for (let x = -wrap(offset, TILE); x < W; x += TILE) ctx.drawImage(img, x, y, img.lw, img.lh);
  ctx.restore();
}
/** วาดของชิ้นหนึ่งในแผ่นวนซ้ำ — คร่อมขอบแผ่นวาดซ้ำอีกฝั่ง ต่อกันไม่เห็นรอย */
function seam(x, half, fn) {
  fn(x);
  if (x - half < 0) fn(x + TILE);
  if (x + half > TILE) fn(x - TILE);
}
/** ทับหมอกม่วงทั้งแผ่น (เฉพาะส่วนที่มีภาพ) — ยิ่งไกลยิ่งจาง */
function haze(c, w, h, a) {
  c.save(); c.globalCompositeOperation = 'source-atop';
  c.fillStyle = `rgba(232,216,247,${a})`; c.fillRect(0, 0, w, h);
  c.restore();
}

// ─────────────────────────────────────────────────────────────
// ชิ้นส่วนที่ใช้ซ้ำ
// ─────────────────────────────────────────────────────────────
function glowDot(c, x, y, r, col, a = 1) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col.replace('A)', `${a})`)); g.addColorStop(1, col.replace('A)', '0)'));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}

/** ผลึกแท่งเดียว (ฐานกลาง x,y · สูง h · กว้าง w · เอียง a) · col = [สว่าง, กลาง, เงา] */
export function groveCrystal(c, x, y, w, h, a = 0, alpha = 1, glow = 0, col = null) {
  c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha *= alpha;
  if (glow) glowDot(c, 0, -h * 0.5, h * 0.95, 'rgba(226,210,255,A)', 0.5 * glow);
  const hw = w / 2;
  c.beginPath(); c.moveTo(-hw, 0); c.lineTo(-hw, -h * 0.72); c.lineTo(0, -h); c.lineTo(hw, -h * 0.72); c.lineTo(hw, 0); c.closePath();
  const g = c.createLinearGradient(-hw, 0, hw, 0);
  g.addColorStop(0, col ? col[0] : '#F6F1FF'); g.addColorStop(0.45, col ? col[1] : C.crystal); g.addColorStop(1, col ? col[2] : C.crystal2);
  c.fillStyle = g; c.fill();
  c.shadowColor = 'transparent';   // เงาตกพื้น (ถ้าผู้เรียกตั้งไว้) ใส่แค่ตัวผลึก
  // หน้าเหลี่ยม: ซ้ายสว่าง · ขวาเงา · ยอดสว่าง
  c.fillStyle = 'rgba(255,255,255,.55)';
  c.beginPath(); c.moveTo(-hw, -h * 0.72); c.lineTo(0, -h); c.lineTo(-hw * 0.15, -h * 0.68); c.lineTo(-hw * 0.2, 0); c.lineTo(-hw, 0); c.closePath(); c.fill();
  c.fillStyle = 'rgba(90,50,170,.2)';
  c.beginPath(); c.moveTo(hw * 0.25, 0); c.lineTo(hw * 0.2, -h * 0.68); c.lineTo(hw, -h * 0.72); c.lineTo(hw, 0); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.8)';
  c.beginPath(); c.moveTo(-hw * 0.15, -h * 0.68); c.lineTo(0, -h); c.lineTo(hw * 0.2, -h * 0.68); c.closePath(); c.fill();
  c.restore();
}
/** กอผลึก 2–4 แท่ง */
function crystalCluster(c, x, y, s, r, alpha = 1, glow = 0, col = null) {
  const n = 2 + Math.floor(r * 3);
  for (let i = 0; i < n; i++) {
    const k = hash(r * 100 + i);
    const dx = (i - (n - 1) / 2) * 7 * s;
    groveCrystal(c, x + dx, y, (7 + k * 5) * s, (16 + k * 18) * s * (i === Math.floor(n / 2) ? 1.35 : 1), (i - (n - 1) / 2) * 0.28, alpha, glow, col);
  }
}
function leaf(c, x, y, len, wd, a, col, vein = null) {
  c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = col;
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -wd, len, 0); c.quadraticCurveTo(len * 0.5, wd, 0, 0); c.fill();
  if (vein) { c.strokeStyle = vein; c.lineWidth = 0.8; c.beginPath(); c.moveTo(1, 0); c.lineTo(len * 0.82, 0); c.stroke(); }
  c.restore();
}
function flower(c, x, y, r, col = C.flower, mid = C.flowerMid) {
  c.fillStyle = col;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - 0.3; c.beginPath(); c.ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.58, r * 0.46, a, 0, TAU); c.fill(); }
  c.fillStyle = mid; c.beginPath(); c.arc(x, y, r * 0.36, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x - r * 0.1, y - r * 0.12, r * 0.14, 0, TAU); c.fill();
}
function mushroom(c, x, y, s, r, glow = false) {
  const h = (12 + r * 10) * s, cw = (10 + r * 6) * s;
  if (glow) glowDot(c, x, y - h, cw * 2.2, 'rgba(255,190,225,A)', 0.45);
  const sg = c.createLinearGradient(x - cw * 0.22, 0, x + cw * 0.22, 0);
  sg.addColorStop(0, '#FFFFFF'); sg.addColorStop(1, '#EBCFD9');
  c.fillStyle = sg; c.beginPath(); c.roundRect(x - cw * 0.22, y - h, cw * 0.44, h, cw * 0.18); c.fill();
  const g = c.createLinearGradient(0, y - h - cw * 0.7, 0, y - h + 2);
  g.addColorStop(0, '#FFC2DA'); g.addColorStop(0.5, C.mushCap); g.addColorStop(1, C.mushCap2);
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y - h, cw, cw * 0.66, 0, Math.PI, 0); c.closePath(); c.fill();
  c.fillStyle = 'rgba(150,60,110,.25)'; c.beginPath(); c.ellipse(x, y - h + 1, cw * 0.9, cw * 0.16, 0, 0, Math.PI); c.fill();
  c.fillStyle = C.mushDot;
  for (const [dx, dy, rr] of [[-0.45, -0.3, 0.16], [0.15, -0.48, 0.13], [0.5, -0.2, 0.11]]) { c.beginPath(); c.arc(x + dx * cw, y - h + dy * cw, rr * cw, 0, TAU); c.fill(); }
}
/** พุ่มไม้ 3 โทน: เงาล่าง · เนื้อ · ไฮไลต์ซ้ายบน */
function bush(c, x, y, w, h, cols, seed) {
  const n = 6;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < n; i++) {
      const k = hash(seed * 1.7 + i);
      const bx = x + (i - (n - 1) / 2) * w * 0.17, by = y - h * (0.32 + k * 0.32);
      const rx = w * (0.2 + k * 0.07), ry = h * (0.38 + k * 0.18);
      if (pass === 0) { c.fillStyle = cols[1]; c.beginPath(); c.ellipse(bx + 2, by + 3, rx, ry, 0, 0, TAU); c.fill(); }
      else if (pass === 1) { c.fillStyle = cols[i % 3 === 2 ? 2 : 0]; c.beginPath(); c.ellipse(bx, by, rx * 0.94, ry * 0.92, 0, 0, TAU); c.fill(); }
      else { c.fillStyle = 'rgba(255,255,230,.18)'; c.beginPath(); c.ellipse(bx - rx * 0.3, by - ry * 0.35, rx * 0.45, ry * 0.32, -0.4, 0, TAU); c.fill(); }
    }
  }
}
function fern(c, x, y, len, a, col) {
  c.save(); c.translate(x, y); c.rotate(a);
  c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.4, -len * 0.5, len, -len * 0.55); c.stroke();
  for (let i = 1; i < 7; i++) { const u = i / 7, px = len * u, py = -len * 0.55 * u * (2 - u); leaf(c, px, py, 8 * (1 - u * 0.6), 2.6, -1.2, col); leaf(c, px, py, 8 * (1 - u * 0.6), 2.6, 0.5, col); }
  c.restore();
}
/** ตอไม้แบบเรียบ (ฉากหลัง) */
export function groveStump(c, x, y, w, h, r = 0.5, alpha = 1, opts = {}) {
  c.save(); c.globalAlpha *= alpha;
  const hw = w / 2, ry = Math.max(3, w * 0.16);
  c.beginPath();
  c.moveTo(x - hw, y - h); c.lineTo(x + hw, y - h);
  c.quadraticCurveTo(x + hw * 1.02, y - h * 0.3, x + hw * 1.14, y);
  c.lineTo(x - hw * 1.14, y);
  c.quadraticCurveTo(x - hw * 1.02, y - h * 0.3, x - hw, y - h);
  c.closePath();
  const g = c.createLinearGradient(x - hw, 0, x + hw, 0);
  g.addColorStop(0, opts.light || '#D59B92'); g.addColorStop(0.55, opts.mid || C.stump); g.addColorStop(1, opts.dark || C.stump2);
  c.fillStyle = g; c.fill();
  c.shadowColor = 'transparent';
  c.save(); c.clip();
  c.strokeStyle = 'rgba(110,60,90,.16)'; c.lineCap = 'round'; c.lineWidth = Math.max(1.5, w * 0.05);
  for (let i = 0; i < 4; i++) { const gx = x - hw * 0.7 + i * hw * 0.47 + (hash(r * 50 + i) - 0.5) * 4; c.beginPath(); c.moveTo(gx, y - h + ry); c.lineTo(gx + (i - 1.5) * 1.5, y - 2); c.stroke(); }
  c.fillStyle = opts.moss || C.moss;
  for (let i = 0; i < 6; i++) { const mx = x - hw + (i + 0.5) * (w / 6); const mh = 3 + hash(r * 70 + i) * h * 0.22; c.beginPath(); c.ellipse(mx, y - h + ry * 0.6, w / 10, mh, 0, 0, TAU); c.fill(); }
  c.restore();
  if (!opts.noTop) {
    c.fillStyle = opts.top || C.stumpTop; c.beginPath(); c.ellipse(x, y - h, hw, ry, 0, 0, TAU); c.fill();
    c.strokeStyle = opts.ring || C.stumpRing; c.lineWidth = Math.max(1, w * 0.025);
    for (const k of [0.68, 0.38]) { c.beginPath(); c.ellipse(x, y - h + 0.5, hw * k, ry * k, 0, 0, TAU); c.stroke(); }
  }
  c.restore();
}

// ─────────────────────────────────────────────────────────────
// แผ่นชั้นฉากหลัง
// ─────────────────────────────────────────────────────────────
function skySprite() {
  return sprite('grSky2', W, H, (c) => {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.skyTop); g.addColorStop(0.55, C.skyMid); g.addColorStop(1, C.skyLow);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // แดดฟุ้งซ้ายบน (สองชั้น: แกนสว่าง + ฟุ้งกว้าง)
    let s = c.createRadialGradient(120, 10, 4, 120, 10, 520);
    s.addColorStop(0, 'rgba(255,240,214,.85)'); s.addColorStop(0.35, 'rgba(255,226,226,.35)'); s.addColorStop(1, 'rgba(255,226,226,0)');
    c.fillStyle = s; c.fillRect(0, 0, W, H);
    s = c.createRadialGradient(120, 10, 2, 120, 10, 90);
    s.addColorStop(0, 'rgba(255,252,236,1)'); s.addColorStop(1, 'rgba(255,252,236,0)');
    c.fillStyle = s; c.beginPath(); c.arc(120, 10, 90, 0, TAU); c.fill();
  });
}
const CLOUD_H = 170;
function cloudBand() {
  return sprite('grCloud2', TILE, CLOUD_H, (c) => {
    for (let i = 0; i < 9; i++) {
      const x = (i + hash(i * 2.3) * 0.7) * (TILE / 9), y = 50 + hash(i * 5.1) * 80, s = 0.7 + hash(i * 3.7) * 0.8;
      seam(x, 140 * s, (xx) => {
        for (let k = 0; k < 6; k++) {
          const kk = hash(i * 11 + k);
          c.fillStyle = k < 2 ? 'rgba(236,212,245,.55)' : 'rgba(250,234,250,.55)';
          c.beginPath(); c.ellipse(xx + (k - 2.5) * 30 * s, y - kk * 22 * s, (34 + kk * 22) * s, (20 + kk * 10) * s, 0, 0, TAU); c.fill();
        }
      });
    }
  });
}
/** ยอดผลึกยักษ์ไกลสุด เรืองแสง + เนินป่าจาง */
const SPIRE_H = 300;
function spireBand() {
  return sprite('grSpire2', TILE, SPIRE_H, (c) => {
    for (let i = 0; i < 5; i++) {
      const x = (i + 0.25 + hash(i * 4.4) * 0.5) * (TILE / 5), hh = 150 + hash(i * 6.2) * 110;
      seam(x, 120, (xx) => {
        glowDot(c, xx, SPIRE_H - hh * 0.55, hh * 0.75, 'rgba(240,220,255,A)', 0.7);
        for (let k = 0; k < 4; k++) {
          const kk = hash(i * 9 + k);
          groveCrystal(c, xx + (k - 1.5) * 26, SPIRE_H, 30 + kk * 18, hh * (k === 1 ? 1 : 0.45 + kk * 0.35), (k - 1.5) * 0.12, 0.85, 0, ['#FBF7FF', '#E2D4FF', '#C9B4F6']);
        }
      });
    }
    // เนินป่าไกล
    c.fillStyle = '#D3BEF0';
    for (let i = 0; i < 22; i++) {
      const x = (i + hash(i)) * (TILE / 22), r = 60 + hash(i * 3) * 50;
      seam(x, r, (xx) => { c.beginPath(); c.ellipse(xx, SPIRE_H - 10, r, 40 + hash(i * 7) * 30, 0, Math.PI, 0); c.fill(); });
    }
    c.fillRect(0, SPIRE_H - 12, TILE, 12);
    haze(c, TILE, SPIRE_H, 0.35);
  });
}
/** ป่าหมอก (ซิลูเอตต์พุ่มบนลำต้น มีขอบบนสว่าง) */
const FAR_H = 250;
function farBand() {
  return sprite('grFar2', TILE, FAR_H, (c) => {
    for (let i = 0; i < 16; i++) {
      const x = (i + hash(i * 1.7)) * (TILE / 16);
      const r = hash(i * 5.3), top = 64 + r * 70;
      seam(x, 120, (xx) => {
        c.fillStyle = i % 2 ? C.farTree : C.farTree2;
        c.fillRect(xx - 7, top + 30, 14, FAR_H - top - 30);
        for (let k = 0; k < 6; k++) {
          const kk = hash(i * 9 + k);
          c.fillStyle = i % 2 ? C.farTree : C.farTree2;
          c.beginPath(); c.ellipse(xx + (k - 2.5) * 22, top + 22 + kk * 30, 38 + kk * 18, 26 + kk * 10, 0, 0, TAU); c.fill();
          c.fillStyle = 'rgba(246,236,255,.4)';
          c.beginPath(); c.ellipse(xx + (k - 2.5) * 22 - 6, top + 12 + kk * 30, 20 + kk * 8, 8, -0.2, 0, TAU); c.fill();
        }
      });
    }
    const g = c.createLinearGradient(0, 0, 0, FAR_H);
    g.addColorStop(0, 'rgba(233,216,246,0)'); g.addColorStop(0.55, 'rgba(236,220,246,.35)'); g.addColorStop(1, 'rgba(242,224,244,.92)');
    c.fillStyle = g; c.fillRect(0, 0, TILE, FAR_H);
  });
}
/** ลำต้นใหญ่: รากแผ่ เปลือก มอส โพรง เห็ดเรืองแสงเกาะ */
const TRUNK_H = G - 18;
function trunkBand() {
  return sprite('grTrunk2', TILE, TRUNK_H, (c) => {
    for (let i = 0; i < 4; i++) {
      const x = (i + 0.4 + hash(i * 6.7) * 0.3) * (TILE / 4);
      const w = 50 + hash(i * 8.1) * 26;
      seam(x, w * 2.2, (xx) => {
        const body = new Path2D();
        body.moveTo(xx - w * 0.42, 0); body.lineTo(xx + w * 0.42, 0);
        body.quadraticCurveTo(xx + w * 0.36, TRUNK_H * 0.62, xx + w * 0.7, TRUNK_H - 16);
        body.quadraticCurveTo(xx + w * 1.3, TRUNK_H - 4, xx + w * 1.5, TRUNK_H);   // รากขวา
        body.lineTo(xx - w * 1.5, TRUNK_H);
        body.quadraticCurveTo(xx - w * 1.3, TRUNK_H - 4, xx - w * 0.7, TRUNK_H - 16);   // รากซ้าย
        body.quadraticCurveTo(xx - w * 0.36, TRUNK_H * 0.62, xx - w * 0.42, 0);
        // กิ่งแยกขึ้นไปหาพุ่ม
        body.moveTo(xx + w * 0.25, 80); body.quadraticCurveTo(xx + w * 1.3, 46, xx + w * 2, 0); body.lineTo(xx + w * 1.5, 0); body.quadraticCurveTo(xx + w * 0.9, 46, xx + w * 0.1, 120);
        const g = c.createLinearGradient(xx - w, 0, xx + w, 0);
        g.addColorStop(0, C.trunkHi); g.addColorStop(0.45, C.trunk); g.addColorStop(1, C.trunkDark);
        c.fillStyle = g; c.fill(body);
        c.save(); c.clip(body);
        c.strokeStyle = 'rgba(120,64,104,.14)'; c.lineWidth = 4; c.lineCap = 'round';
        for (let k = 0; k < 5; k++) { const bx = xx - w * 0.32 + k * w * 0.16; c.beginPath(); c.moveTo(bx, 0); c.quadraticCurveTo(bx + 4, TRUNK_H * 0.5, bx - 6 + k * 3, TRUNK_H); c.stroke(); }
        c.fillStyle = 'rgba(184,190,116,.55)';
        for (let k = 0; k < 4; k++) { const my = 60 + hash(i * 13 + k) * (TRUNK_H - 120); c.beginPath(); c.ellipse(xx - w * 0.3 + hash(i * 3 + k) * w * 0.3, my, 9, 16, 0.3, 0, TAU); c.fill(); }
        c.restore();
        if (hash(i * 3.3) > 0.35) {   // โพรงไม้
          c.fillStyle = 'rgba(96,52,92,.45)'; c.beginPath(); c.ellipse(xx + w * 0.08, TRUNK_H * 0.52, w * 0.13, w * 0.2, 0, 0, TAU); c.fill();
          c.fillStyle = 'rgba(230,190,210,.35)'; c.beginPath(); c.ellipse(xx + w * 0.04, TRUNK_H * 0.52 - w * 0.1, w * 0.1, w * 0.05, 0, Math.PI, 0); c.fill();
        }
        // เห็ดเรืองแสงเกาะลำต้น
        for (let k = 0; k < 3; k++) {
          const my = TRUNK_H * (0.45 + k * 0.12), mx = xx + w * 0.38 - k * 2;
          glowDot(c, mx + 5, my, 14, 'rgba(255,200,230,A)', 0.5);
          c.fillStyle = '#F7B7D2'; c.beginPath(); c.ellipse(mx + 5, my, 8 - k, 3.2, 0, Math.PI, 0); c.fill();
        }
      });
    }
    const g = c.createLinearGradient(0, TRUNK_H * 0.45, 0, TRUNK_H);
    g.addColorStop(0, 'rgba(238,222,246,0)'); g.addColorStop(1, 'rgba(238,222,246,.62)');
    c.save(); c.globalCompositeOperation = 'source-atop'; c.fillStyle = g; c.fillRect(0, 0, TILE, TRUNK_H); c.restore();
  });
}
/** พุ่มไม้บนห้อยจากขอบบน: 3 โทน + ดอกครีม + เถาวัลย์ + ผลึกหยดเรืองแสง */
const CAN_H = 150;
function canopyBand() {
  return sprite('grCanopy2', TILE, CAN_H, (c) => {
    const clumps = 7;
    for (let i = 0; i < clumps; i++) {
      const x = (i + 0.2 + hash(i * 2.9) * 0.6) * (TILE / clumps);
      const span = 130 + hash(i * 4.1) * 120;
      seam(x, span + 60, (xx) => {
        // เถาวัลย์ห้อย (ข้างหลังพุ่ม)
        for (let v = 0; v < 4; v++) {
          const vx = xx - span * 0.5 + hash(i * 11 + v) * span, len = 40 + hash(i * 13 + v) * 70;
          c.strokeStyle = C.vine; c.lineWidth = 2; c.beginPath(); c.moveTo(vx, 20); c.quadraticCurveTo(vx + 7, 20 + len * 0.5, vx - 2, 20 + len); c.stroke();
          for (let l = 4; l < len; l += 10) leaf(c, vx + (l % 20 ? 2 : -2), 22 + l, 8, 3.2, l % 20 ? 0.6 : 2.5, C.vineLeaf);
          if (hash(i * 7 + v) > 0.45) {   // ผลึกหยดปลายเถา
            glowDot(c, vx - 2, 26 + len, 16, 'rgba(230,214,255,A)', 0.8);
            groveCrystal(c, vx - 2, 34 + len, 7, 13, Math.PI, 1, 0);
          }
        }
        // ก้อนพุ่ม: เงา → เนื้อ → ไฮไลต์
        const blobs = [];
        for (let k = 0; k < 10; k++) { const kk = hash(i * 17 + k); blobs.push([xx - span * 0.55 + (k / 9) * span * 1.1, 2 + kk * 40, 34 + kk * 24, 24 + kk * 14]); }
        c.fillStyle = C.canopyDark; for (const [cx, cy, rx, ry] of blobs) { c.beginPath(); c.ellipse(cx + 3, cy + 7, rx, ry, 0, 0, TAU); c.fill(); }
        c.fillStyle = C.canopy; for (const [cx, cy, rx, ry] of blobs) { c.beginPath(); c.ellipse(cx, cy, rx * 0.96, ry * 0.9, 0, 0, TAU); c.fill(); }
        c.fillStyle = 'rgba(236,212,244,.75)'; for (const [cx, cy, rx, ry] of blobs) { c.beginPath(); c.ellipse(cx - rx * 0.25, cy - ry * 0.35, rx * 0.45, ry * 0.3, -0.3, 0, TAU); c.fill(); }
        for (let f = 0; f < 9; f++) flower(c, xx - span * 0.5 + hash(i * 23 + f) * span, 10 + hash(i * 29 + f) * 44, 5);
      });
    }
  });
}
/** ตอไม้ เห็ด กอผลึก พุ่ม เฟิร์น (ชั้นกลาง · หมอกทับ) */
const MID_H = 150;
const MID_STUMP = { light: '#E0BFCB', mid: '#CFAAC4', dark: '#B796BF', moss: '#C8C99A', top: '#F0D6CE', ring: 'rgba(200,150,150,.35)' };
function midBand() {
  return sprite('grMid2', TILE, MID_H, (c) => {
    const B = MID_H;
    for (let i = 0; i < 9; i++) {
      const x = (i + 0.2 + hash(i * 4.9) * 0.6) * (TILE / 9);
      const r = hash(i * 7.7);
      const w = 54 + r * 46, h = 40 + hash(i * 2.3) * 52;
      seam(x, w + 60, (xx) => {
        bush(c, xx - w * 0.7, B, w * 0.95, 40, ['#C3BE97', '#AFAA88', '#C7B2DE'], i * 3.1);
        fern(c, xx + w * 0.5, B, 34, -0.2, '#B5B88E');
        groveStump(c, xx, B - 2, w, h, r, 1, MID_STUMP);
        if (r > 0.45) crystalCluster(c, xx + w * 0.65, B - 2, 1.5, r, 0.9, 0.7);
        mushroom(c, xx - w * 0.75, B - 2, 1.1, r, true);
        if (r < 0.6) mushroom(c, xx + w * 0.8, B - 2, 0.8, 1 - r);
      });
    }
    for (let i = 0; i < 12; i++) {
      const x = hash(i * 13.1) * TILE, r = hash(i * 5.7);
      seam(x, 30, (xx) => (r > 0.5 ? mushroom(c, xx, B - 2, 0.9, r, r > 0.8) : crystalCluster(c, xx, B - 2, 1, r, 0.85, 0.6)));
    }
    haze(c, TILE, B, 0.45);
  });
}
/** พุ่มไม้ ดอกไม้ เฟิร์น ผลึกเล็ก ติดพื้น (หลังพื้น) */
const NEAR_H = 60;
function nearBand() {
  return sprite('grNear2', TILE, NEAR_H, (c) => {
    const B = NEAR_H;
    for (let i = 0; i < 30; i++) {
      const x = (i + hash(i * 3.7) * 0.8) * (TILE / 30);
      const r = hash(i * 9.1);
      seam(x, 70, (xx) => {
        if (r < 0.35) fern(c, xx - 26, B + 4, 30, -0.35, '#9FAA66');
        bush(c, xx, B + 6, 66 + r * 30, 42 + r * 14, r > 0.7 ? [C.bushLav, '#9C82C2', C.bush] : [C.bush, C.bush2, '#B9BF80'], i * 5.3);
        if (r > 0.55) crystalCluster(c, xx + 24, B + 2, 0.95, r, 1, 0.8);
        else if (r > 0.3) mushroom(c, xx - 18, B + 2, 0.78, r);
        for (let f = 0; f < 3; f++) flower(c, xx - 22 + hash(i * 31 + f) * 44, B - 10 - hash(i * 37 + f) * 18, 3.8);
      });
    }
    haze(c, TILE, B, 0.22);
  });
}

// ─────────────────────────────────────────────────────────────
// ฉากหลังทั้งชุด
// ─────────────────────────────────────────────────────────────
export function drawGroveBackdrop(ctx, cam, tick = 0) {
  const sky = skySprite();
  if (sky) ctx.drawImage(sky, 0, 0, W, H);
  tileRow(ctx, cloudBand(), cam * 0.03, 0);
  // ลำแสงเฉียงขอบนุ่ม (ไหวช้า ๆ)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const a = 0.07 + 0.04 * Math.sin(tick * 0.01 + i * 1.7);
    const x0 = 30 + i * 62 - wrap(cam * 0.02, 62), wTop = 26 + (i % 2) * 18, wBot = 120 + i * 18;
    const g = ctx.createLinearGradient(x0, 0, x0 + 200, H * 0.6);
    g.addColorStop(0, `rgba(255,236,214,${a})`); g.addColorStop(1, 'rgba(255,236,214,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x0, -10); ctx.lineTo(x0 + wTop, -10); ctx.lineTo(x0 + wTop + 300 + i * 20, H); ctx.lineTo(x0 + 300 + i * 20 - wBot * 0.4, H); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  tileRow(ctx, spireBand(), cam * 0.04, G - SPIRE_H - 20);
  tileRow(ctx, farBand(), cam * 0.09, G - FAR_H + 20);
  tileRow(ctx, trunkBand(), cam * 0.18, 0, 0.94);
  tileRow(ctx, canopyBand(), cam * 0.18, -8);
  tileRow(ctx, midBand(), cam * 0.36, G - MID_H + 4);
  tileRow(ctx, nearBand(), cam * 0.6, G - NEAR_H + 6);
  // กลีบดอกปลิว + หิ่งห้อย (สด · ตำแหน่งจากเวลาอย่างเดียว)
  ctx.save();
  for (let i = 0; i < 16; i++) {
    const sp = 0.35 + hash(i * 2.1) * 0.4;
    const x = wrap(hash(i * 3.9) * (W + 200) - cam * 0.5 - tick * sp, W + 200) - 100;
    const y = wrap(hash(i * 6.1) * H + tick * sp * 0.55, H + 40) - 20;
    ctx.save(); ctx.translate(x, y); ctx.rotate(tick * 0.03 + i);
    ctx.fillStyle = i % 3 ? 'rgba(255,200,222,.8)' : 'rgba(255,244,224,.85)';
    ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 2, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  for (let i = 0; i < 14; i++) {
    const x = wrap(hash(i * 3.3) * (W + 200) - cam * (0.2 + hash(i) * 0.3) + Math.sin(tick * 0.012 + i) * 30, W + 200) - 100;
    const y = 60 + hash(i * 7.1) * (G - 120) + Math.sin(tick * 0.02 + i * 2) * 12;
    const a = 0.35 + 0.5 * Math.max(0, Math.sin(tick * 0.04 + i * 1.3));
    glowDot(ctx, x, y, 10, 'rgba(255,250,214,A)', a);
    ctx.fillStyle = `rgba(255,255,240,${a})`; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// พื้น: มอสมีกอหญ้า เห็ดจิ๋ว ดอก · ดินม่วงมีชั้น ราก หิน ผลึกเรืองแสงฝังดิน (ลายผูกพิกัดโลก)
// ─────────────────────────────────────────────────────────────
export function drawGroveGround(ctx, s, e, cam) {
  ctx.save();
  ctx.beginPath(); ctx.rect(s, G - 16, e - s, H - G + 16); ctx.clip();
  let g = ctx.createLinearGradient(0, G, 0, H);
  g.addColorStop(0, C.soil); g.addColorStop(0.6, C.soil2); g.addColorStop(1, C.soilDeep);
  ctx.fillStyle = g; ctx.fillRect(s, G, e - s, H - G);
  const from = (step) => Math.floor((s + cam) / step) * step - step;
  // เนื้อดินเรียบตามธรรมชาติ (ผู้ใช้ 22 พ.ย.: ไม่เอาก้อนบล็อก) — ชั้นดินเป็นคลื่นนุ่ม · ปื้นสีอ่อน/เข้มจาง ๆ
  // กรวดเม็ดเล็กประปราย · เม็ดดินละเอียด · ทุกอย่างสุ่มจากพิกัดโลก (คงที่ ไม่กะพริบ)
  for (const [depth, a, amp] of [[G + 46, 0.1, 5], [G + 78, 0.12, 6]]) {
    ctx.fillStyle = `rgba(110,60,112,${a})`;
    ctx.beginPath(); ctx.moveTo(s, H);
    for (let wx = from(24); wx - cam < e + 24; wx += 24) ctx.lineTo(wx - cam, depth + Math.sin(wx * 0.013 + depth) * amp + Math.sin(wx * 0.041) * amp * 0.4);
    ctx.lineTo(e, H); ctx.closePath(); ctx.fill();
  }
  for (let wx = from(90); wx - cam < e + 90; wx += 90) {
    const k = hash(wx * 0.29), k2 = hash(wx * 0.53 + 3);
    ctx.fillStyle = k > 0.5 ? 'rgba(214,176,212,.13)' : 'rgba(96,48,100,.1)';
    ctx.beginPath(); ctx.ellipse(wx - cam + k * 40, G + 34 + k2 * 60, 30 + k * 34, 7 + k2 * 7, 0, 0, TAU); ctx.fill();
  }
  for (let wx = from(70); wx - cam < e + 70; wx += 70) {
    const k = hash(wx * 0.71 + 9); if (k < 0.45) continue;
    const x = wx - cam + k * 50, y = G + 30 + hash(wx + 5) * 66, r = 2.5 + k * 3.5;
    ctx.fillStyle = 'rgba(196,156,194,.85)'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,238,252,.45)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.35, r * 0.5, r * 0.32, 0, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = 'rgba(92,46,96,.22)';
  for (let wx = from(14); wx - cam < e + 14; wx += 14) {
    const k = hash(wx * 1.13); if (k < 0.5) continue;
    ctx.beginPath(); ctx.arc(wx - cam + k * 10, G + 26 + hash(wx + 1) * 80, 0.9 + k * 0.8, 0, TAU); ctx.fill();
  }
  // ลึกลงไปมืดลง + เงาใต้แถบมอส
  let dg = ctx.createLinearGradient(0, G + 40, 0, H);
  dg.addColorStop(0, 'rgba(84,40,88,0)'); dg.addColorStop(1, 'rgba(84,40,88,.38)');
  ctx.fillStyle = dg; ctx.fillRect(s, G + 40, e - s, H - G - 40);
  dg = ctx.createLinearGradient(0, G + 8, 0, G + 34);
  dg.addColorStop(0, 'rgba(84,40,88,.4)'); dg.addColorStop(1, 'rgba(84,40,88,0)');
  ctx.fillStyle = dg; ctx.fillRect(s, G + 8, e - s, 26);
  // แถบมอส + ขอบล่างหยักเป็นพุ่มกลม
  g = ctx.createLinearGradient(0, G - 4, 0, G + 22);
  g.addColorStop(0, C.mossHi); g.addColorStop(0.35, C.mossTop); g.addColorStop(1, C.mossTop2);
  ctx.fillStyle = 'rgba(80,40,80,.16)';
  for (let wx = from(18); wx - cam < e + 18; wx += 18) { const r = hash(wx * 0.7); ctx.beginPath(); ctx.ellipse(wx - cam, G + 18, 10 + r * 3, 6 + r * 3, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = g;
  ctx.fillRect(s, G - 4, e - s, 18);
  for (let wx = from(18); wx - cam < e + 18; wx += 18) { const r = hash(wx * 0.7); ctx.beginPath(); ctx.ellipse(wx - cam, G + 14, 10 + r * 3, 6 + r * 3, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,220,.6)'; ctx.fillRect(s, G - 4, e - s, 2.5);
  // กอหญ้าตามขอบบน
  ctx.fillStyle = C.grass;
  for (let wx = from(22); wx - cam < e + 22; wx += 22) {
    const r = hash(wx + 31); if (r < 0.35) continue;
    const x = wx - cam + r * 10;
    for (let k = -1; k <= 1; k++) {
      const hh = 5 + r * 5 - Math.abs(k) * 2;
      ctx.beginPath(); ctx.moveTo(x + k * 3 - 1.6, G - 2); ctx.quadraticCurveTo(x + k * 4, G - 2 - hh * 0.6, x + k * 5, G - 2 - hh); ctx.quadraticCurveTo(x + k * 3 + 0.4, G - 2 - hh * 0.5, x + k * 3 + 1.6, G - 2); ctx.fill();
    }
  }
  // ดอกจิ๋ว / เห็ดจิ๋วบนมอส
  for (let wx = from(64); wx - cam < e + 64; wx += 64) {
    const r = hash(wx + 11);
    if (r < 0.4) continue;
    const x = wx - cam + r * 30;
    if (r > 0.86) mushroom(ctx, x, G + 2, 0.5, r);
    else flower(ctx, x, G + 4 + r * 6, 3.2, r > 0.65 ? '#FFC8DA' : '#FFF4D8', '#F2B98F');
  }
  ctx.restore();
}

/** ชั้นหน้าสุด (วาดหลังตัวละคร): ใบไม้ม่วงเข้มโผล่จากขอบล่าง — อยู่ในเนื้อดินเท่านั้น ไม่บังทางวิ่ง */
export function drawGroveFront(ctx, cam) {
  const step = 520;
  for (let wx = Math.floor(cam * 1.25 / step) * step - step; wx - cam * 1.25 < W + step; wx += step) {
    const r = hash(wx + 77); if (r < 0.35) continue;
    const x = wx - cam * 1.25 + r * 200;
    ctx.save(); ctx.globalAlpha = 0.92;
    for (let k = 0; k < 5; k++) {
      const kk = hash(wx + k * 13);
      leaf(ctx, x + (k - 2) * 14, H + 8, 46 + kk * 26, 13 + kk * 4, -Math.PI / 2 + (k - 2) * 0.42, k % 2 ? '#6D4F92' : '#5B3F7E', 'rgba(255,255,255,.12)');
    }
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────
// สิ่งกีดขวาง (THEME_ART.grove) — ต้องเด่นกว่าฉากหลังชัด ๆ
//   สีเข้มอิ่ม · แสงขอบซ้าย · เงาฟุ้งตกพื้น · รายละเอียดเยอะกว่าของในฉาก (ราก เปลือกเป็นแผ่น เห็ดหิ้ง มอสคลุม)
//   ทุกค่าสุ่มใช้ seed = ตำแหน่งในด่าน (o.x) · ไม่มีดอกไม้บนตัว (ผู้ใช้ 22 พ.ย.: ดอกบนขอนดูเหมือนบั๊ก)
// ─────────────────────────────────────────────────────────────
const OBS_CRY = ['#FFFFFF', '#A27CF4', '#5A33BE'];
const OBS_W = { light: '#E28F74', mid: '#A9566A', dark: '#6A3266', top: '#FFDDB0', topEdge: '#F3B486', lip: '#7C3F62', ring: 'rgba(196,112,84,.7)', moss: '#8CC03C', mossDark: '#6E9A2C', mossHi: '#C9EA7A' };
// เคยใส่เงาเบลอรอบตัวทุกชิ้น — ผู้ใช้ 22 พ.ย. ว่าดูเป็นรัศมีดำ ไม่เป็นธรรมชาติ → ปิด (เหลือเงาแตะพื้น contact() อย่างเดียว)
function obsShadow() {}
function contact(ctx, cx, by, rx) {
  const g = ctx.createRadialGradient(cx, by, 1, cx, by, rx);
  g.addColorStop(0, 'rgba(70,30,80,.32)'); g.addColorStop(1, 'rgba(70,30,80,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, by + 1, rx, Math.min(7, rx * 0.16), 0, 0, TAU); ctx.fill();
}
/** เห็ดหิ้งเกาะข้างไม้ (2 ชั้น) */
function bracket(ctx, x, y, s, dir) {
  for (let k = 0; k < 2; k++) {
    const yy = y + k * 7 * s, ww = (11 - k * 3) * s;
    const g = ctx.createLinearGradient(0, yy - 4 * s, 0, yy + 3 * s);
    g.addColorStop(0, '#FFD9B8'); g.addColorStop(1, '#E99582');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x + dir * ww * 0.55, yy, ww, 4 * s, 0, Math.PI, 0, dir < 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(140,60,70,.35)'; ctx.fillRect(x + (dir < 0 ? -ww * 0.45 : 0), yy, ww * 1.1 * 0.9, 1.4 * s);
  }
}
/** ก้อนมอสคลุมขอบบน + หยดย้อย */
function mossCap(ctx, x0, x1, y, seed, thick = 6) {
  const n = Math.max(3, Math.round((x1 - x0) / 9));
  ctx.fillStyle = OBS_W.mossDark;
  for (let i = 0; i <= n; i++) { const mx = x0 + (i / n) * (x1 - x0), k = hash(seed + i * 1.3); ctx.beginPath(); ctx.ellipse(mx, y + 2 + k * 3, 6 + k * 3, thick * 0.6 + k * 6, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = OBS_W.moss;
  for (let i = 0; i <= n; i++) { const mx = x0 + (i / n) * (x1 - x0), k = hash(seed + i * 1.3); ctx.beginPath(); ctx.ellipse(mx, y + k * 2, 6 + k * 3, thick * 0.5 + k * 4, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = OBS_W.mossHi;
  for (let i = 0; i <= n; i += 2) { const mx = x0 + (i / n) * (x1 - x0), k = hash(seed + i * 1.3); ctx.beginPath(); ctx.ellipse(mx - 2, y - 2 + k, 3.5, 1.6, -0.2, 0, TAU); ctx.fill(); }
}
/**
 * ตอไม้สิ่งกีดขวาง (ฐานกลาง cx,by): รากแผ่ · เปลือกเป็นแผ่น · แสงขอบ · หน้าตัดวงปีมีรอยแตก · มอสคลุม · เห็ดหิ้ง
 * opt: { top, roots, fungus, sprout }
 */
function woodStump(ctx, cx, by, w, h, seed, opt = {}) {
  const hw = w / 2, ry = Math.max(4, w * 0.17), ty = by - h;
  ctx.save();
  // รากแผ่ (ใต้ลำต้น)
  const g = ctx.createLinearGradient(cx - hw * 1.3, 0, cx + hw * 1.3, 0);
  g.addColorStop(0, OBS_W.light); g.addColorStop(0.5, OBS_W.mid); g.addColorStop(1, OBS_W.dark);
  const body = new Path2D();
  body.moveTo(cx - hw, ty);
  body.lineTo(cx + hw, ty);
  if (opt.roots) {
    body.quadraticCurveTo(cx + hw * 1.0, by - h * 0.35, cx + hw * 1.15, by - 6);
    body.quadraticCurveTo(cx + hw * 1.45, by - 1, cx + hw * 1.5, by);
    body.lineTo(cx + hw * 0.5, by); body.quadraticCurveTo(cx, by - 5, cx - hw * 0.5, by);
    body.lineTo(cx - hw * 1.5, by);
    body.quadraticCurveTo(cx - hw * 1.45, by - 1, cx - hw * 1.15, by - 6);
    body.quadraticCurveTo(cx - hw * 1.0, by - h * 0.35, cx - hw, ty);
  } else {
    body.quadraticCurveTo(cx + hw * 1.02, by - h * 0.3, cx + hw * 1.05, by);
    body.lineTo(cx - hw * 1.05, by);
    body.quadraticCurveTo(cx - hw * 1.02, by - h * 0.3, cx - hw, ty);
  }
  body.closePath();
  ctx.save(); obsShadow(ctx, 10, 4); ctx.fillStyle = g; ctx.fill(body); ctx.restore();
  ctx.save(); ctx.clip(body);
  // เปลือกเป็นแผ่นแนวตั้ง: ร่องเข้ม + ขอบรับแสง
  const plates = 5;
  for (let i = 0; i < plates; i++) {
    const k = hash(seed + i * 2.7);
    const px = cx - hw + (i + 0.5) * (w / plates) + (k - 0.5) * 3;
    ctx.fillStyle = 'rgba(70,22,62,.2)'; ctx.beginPath(); ctx.roundRect(px - 1.6, ty + ry + 2 + k * 4, 3.2, h - ry - 6 - k * 6, 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,214,190,.2)'; ctx.fillRect(px - 3.6, ty + ry + 4 + k * 4, 1.4, h - ry - 12 - k * 6);
  }
  // แสงขอบซ้าย + เงาขวา
  let rg = ctx.createLinearGradient(cx - hw * 1.2, 0, cx - hw * 0.3, 0);
  rg.addColorStop(0, 'rgba(255,220,196,.55)'); rg.addColorStop(1, 'rgba(255,220,196,0)');
  ctx.fillStyle = rg; ctx.fillRect(cx - hw * 1.6, ty, hw * 1.3, h);
  rg = ctx.createLinearGradient(cx + hw * 0.4, 0, cx + hw * 1.2, 0);
  rg.addColorStop(0, 'rgba(50,10,50,0)'); rg.addColorStop(1, 'rgba(50,10,50,.3)');
  ctx.fillStyle = rg; ctx.fillRect(cx + hw * 0.3, ty, hw * 1.3, h);
  // มอสเกาะข้างตัว
  if (hash(seed + 9) > 0.4) { ctx.fillStyle = OBS_W.moss; ctx.beginPath(); ctx.ellipse(cx - hw * 0.6, by - h * 0.35, 5, 8, 0.2, 0, TAU); ctx.fill(); }
  ctx.restore();
  // เห็ดหิ้ง
  if (opt.fungus && hash(seed + 4) > 0.35) {
    const dir = hash(seed + 5) > 0.5 ? 1 : -1;
    bracket(ctx, cx + dir * hw * 0.98, ty + h * (0.35 + hash(seed + 6) * 0.25), Math.min(1.2, w / 40), dir);
  }
  if (opt.top) {
    // ขอบเปลือก (ปากตอ) → หน้าตัดไล่สี → วงปี → รอยแตก
    ctx.fillStyle = OBS_W.lip; ctx.beginPath(); ctx.ellipse(cx, ty, hw + 0.5, ry + 1.5, 0, 0, TAU); ctx.fill();
    const tg = ctx.createRadialGradient(cx - hw * 0.2, ty - ry * 0.2, 1, cx, ty, hw);
    tg.addColorStop(0, '#FFF0D2'); tg.addColorStop(0.6, OBS_W.top); tg.addColorStop(1, OBS_W.topEdge);
    ctx.fillStyle = tg; ctx.beginPath(); ctx.ellipse(cx, ty, hw - 2, ry - 1.2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = OBS_W.ring; ctx.lineWidth = 1.3;
    for (const k of [0.72, 0.48, 0.24]) { ctx.beginPath(); ctx.ellipse(cx + (1 - k) * 1.5, ty + 0.4, (hw - 2) * k, (ry - 1.2) * k, 0, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(150,70,60,.55)'; ctx.lineWidth = 1.2;
    const a0 = hash(seed + 3) * TAU;
    for (const da of [0, 2.4]) { const a = a0 + da; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * hw * 0.3, ty + Math.sin(a) * ry * 0.3); ctx.lineTo(cx + Math.cos(a) * (hw - 3), ty + Math.sin(a) * (ry - 2)); ctx.stroke(); }
    // มอสคลุมครึ่งหลังของหน้าตัด + ย้อยด้านหน้า
    ctx.save(); ctx.beginPath(); ctx.rect(cx - hw - 6, ty - ry - 8, w + 12, ry + 2); ctx.clip();
    mossCap(ctx, cx - hw + 2, cx + hw - 2, ty - ry + 1, seed, 5);
    ctx.restore();
    ctx.fillStyle = OBS_W.moss;
    for (let i = 0; i < 3; i++) { const k = hash(seed + i * 7.1); const mx = cx - hw * 0.8 + k * hw * 1.6; ctx.beginPath(); ctx.ellipse(mx, ty + ry * 0.7 + 3, 4, 4 + k * 6, 0, 0, TAU); ctx.fill(); }
    if (opt.sprout) {
      ctx.save(); obsShadow(ctx, 5, 2);
      groveCrystal(ctx, cx + hw * 0.35, ty + 1, 7, 15, 0.25, 1, 0, OBS_CRY);
      groveCrystal(ctx, cx + hw * 0.35 + 6, ty + 2, 5, 9, 0.7, 1, 0, OBS_CRY);
      ctx.restore();
    }
  } else {
    mossCap(ctx, cx - hw + 1, cx + hw - 1, ty + 2, seed, 5);
  }
  ctx.restore();
}

/** ของเตี้ยบนพื้น (กระโดดข้าม) = กอผลึกม่วงเข้มขึ้นจากก้อนหินมีมอส · ภาพสูงกว่ากล่องชนนิดหน่อย */
export function groveSpike(ctx, x, y, w, h, seed = 0) {
  const cx = x + w / 2, by = y + h, H2 = h * 1.2;
  const t = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
  ctx.save();
  contact(ctx, cx, by, w * 1.05);
  glowDot(ctx, cx, by - H2 * 0.5, H2 * 0.7, 'rgba(206,176,255,A)', 0.3);
  // ก้อนหินฐาน
  const rg = ctx.createLinearGradient(cx - w * 0.6, 0, cx + w * 0.6, 0);
  rg.addColorStop(0, '#B89AC8'); rg.addColorStop(1, '#6E4C86');
  ctx.save(); obsShadow(ctx, 8, 3);
  ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(cx, by - 4, w * 0.62, 9, 0, Math.PI, 0); ctx.lineTo(cx + w * 0.62, by); ctx.lineTo(cx - w * 0.62, by); ctx.closePath(); ctx.fill();
  ctx.restore();
  const k = hash(seed * 0.013);
  ctx.save(); obsShadow(ctx, 8, 3);
  groveCrystal(ctx, cx - 10, by - 6, 10, H2 * (0.55 + k * 0.08), -0.36, 1, 0, OBS_CRY);
  groveCrystal(ctx, cx + 10, by - 6, 10, H2 * (0.5 + (1 - k) * 0.08), 0.4, 1, 0, OBS_CRY);
  groveCrystal(ctx, cx + 4, by - 7, 8, H2 * 0.42, 0.15, 1, 0, OBS_CRY);
  groveCrystal(ctx, cx - 1, by - 6, 15, H2, -0.04, 1, 0, OBS_CRY);
  ctx.restore();
  mossCap(ctx, cx - w * 0.55, cx + w * 0.55, by - 6, seed * 0.01, 4);
  leaf(ctx, cx - 8, by - 4, 14, 4.5, Math.PI + 0.45, '#6F8E34');
  leaf(ctx, cx + 8, by - 4, 14, 4.5, -0.45, '#86A83E');
  // ประกายวิบวับบนยอด
  const tw = Math.max(0, Math.sin(t * 3 + seed * 0.01));
  if (tw > 0.2) {
    ctx.fillStyle = `rgba(255,255,255,${tw})`;
    const sx = cx - 2, sy = by - H2 * 0.86, r = 4 * tw;
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, rr = i % 2 ? r * 0.28 : r; ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/** ของซ้อนได้ 1–3 ชั้น = ท่อนตอไม้ซ้อน (ชั้นล่างมีราก · บนสุดมีหน้าตัด + มอส) */
export function groveCrate(ctx, x, y, w, h, rows = 1, seed = 0) {
  const rh = h / rows, cx = x + w / 2;
  ctx.save();
  contact(ctx, cx, y + h, w * 0.95);
  for (let i = 0; i < rows; i++) {
    const by = y + h - i * rh;
    const top = i === rows - 1;
    woodStump(ctx, cx + (hash(seed * 0.01 + i) - 0.5) * 2, by, w * (0.98 - i * 0.03), rh - 1, seed * 0.01 + i * 3.3, { top, roots: i === 0, fungus: i === 0 || hash(seed + i) > 0.6, sprout: top && hash(seed * 0.01 + 8) > 0.55 });
  }
  ctx.restore();
}

/** คานหมอบลอด = ขอนไม้ล้มพาดบนตอสองข้าง */
export function groveBar(ctx, x, y, w, h, seed = 0) {
  const sd = seed * 0.01;
  ctx.save();
  // ตอค้ำสองข้าง (จากใต้ขอนลงถึงพื้น)
  const postW = 30, postH = G - (y + h) + 6;
  for (const [j, px] of [[0, x + 24], [1, x + w - 24]]) {
    contact(ctx, px, G, 34);
    woodStump(ctx, px, G + 1, postW, postH, sd + j * 5.5, { top: false, roots: true, fungus: false });
  }
  // ขอนไม้: เงา → เนื้อไล่สี → ลายเปลือกแนวนอน → แสงสัน → มอสคลุม → เห็ดหิ้ง → หน้าตัดสองข้าง
  const r = h / 2, cy = y + r;
  const body = new Path2D(); body.roundRect(x + 4, y, w - 8, h, r);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, OBS_W.light); g.addColorStop(0.5, OBS_W.mid); g.addColorStop(1, OBS_W.dark);
  ctx.save(); obsShadow(ctx, 12, 6); ctx.fillStyle = g; ctx.fill(body); ctx.restore();
  ctx.save(); ctx.clip(body);
  for (let i = 0; i < 4; i++) {
    const ly = y + h * (0.32 + i * 0.17);
    ctx.fillStyle = 'rgba(70,22,62,.18)';
    for (let k = 0; k < 6; k++) { const kk = hash(sd + i * 7 + k); const lx = x + 20 + k * (w - 40) / 6 + kk * 10; ctx.beginPath(); ctx.roundRect(lx, ly, 16 + kk * 14, 2.6, 1.3); ctx.fill(); }
  }
  ctx.fillStyle = 'rgba(255,220,196,.32)'; ctx.fillRect(x, y + h * 0.16, w, h * 0.1);
  const sg = ctx.createLinearGradient(0, y + h * 0.6, 0, y + h);
  sg.addColorStop(0, 'rgba(50,10,50,0)'); sg.addColorStop(1, 'rgba(50,10,50,.3)');
  ctx.fillStyle = sg; ctx.fillRect(x, y + h * 0.6, w, h * 0.4);
  ctx.restore();
  mossCap(ctx, x + 16, x + w - 16, y + 3, sd, 7);
  ctx.fillStyle = OBS_W.moss;
  for (let i = 0; i < 4; i++) { const k = hash(sd + i * 3.7); const mx = x + 30 + k * (w - 60); ctx.beginPath(); ctx.ellipse(mx, y + 10, 4, 5 + k * 7, 0, 0, TAU); ctx.fill(); }
  bracket(ctx, x + w * (0.3 + hash(sd + 2) * 0.15), y + h * 0.62, 1.1, -1);
  // หน้าตัดปลายขอน: ปากเปลือก → ไล่สี → วงปี → รอยแตก
  for (const [s2, ex] of [[-1, x + 8], [1, x + w - 8]]) {
    ctx.fillStyle = OBS_W.lip; ctx.beginPath(); ctx.ellipse(ex, cy, r * 0.46, r + 0.5, 0, 0, TAU); ctx.fill();
    const tg = ctx.createRadialGradient(ex - s2 * 2, cy - r * 0.25, 1, ex, cy, r);
    tg.addColorStop(0, '#FFF0D2'); tg.addColorStop(0.6, OBS_W.top); tg.addColorStop(1, OBS_W.topEdge);
    ctx.fillStyle = tg; ctx.beginPath(); ctx.ellipse(ex, cy, r * 0.4, r - 2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = OBS_W.ring; ctx.lineWidth = 1.4;
    for (const kk of [0.7, 0.45, 0.22]) { ctx.beginPath(); ctx.ellipse(ex, cy, r * 0.4 * kk, (r - 2) * kk, 0, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(150,70,60,.5)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(ex, cy - r * 0.15); ctx.lineTo(ex + s2 * r * 0.12, cy - r * 0.8); ctx.stroke();
  }
  // กอผลึกเล็กบนขอน
  ctx.save(); obsShadow(ctx, 6, 2);
  groveCrystal(ctx, x + w * 0.78, y + 4, 9, 19, 0.2, 1, 0, OBS_CRY);
  groveCrystal(ctx, x + w * 0.78 + 8, y + 5, 7, 12, 0.6, 1, 0, OBS_CRY);
  groveCrystal(ctx, x + w * 0.78 - 7, y + 5, 6, 10, -0.5, 1, 0, OBS_CRY);
  ctx.restore();
  ctx.restore();
}
