// src/render/kingdom/glow.js
// ─────────────────────────────────────────────────────────────
// ชั้นแสงของ "อาณาจักรแมวขนมหวาน" — เปิดเฉพาะกราฟิกระดับสูง (drawKingdom(..., { fx: true }))
//
// ── ทำไมเป็นชั้นแยก ไม่ได้แก้ชิ้นส่วนเดิม ──
// ฉากเดิมต้องเบาพอสำหรับเครื่องทุกระดับ ของที่เพิ่มตรงนี้ล้วนเป็น "แสง" ทับบนฉากเดิม
// (แดดเย็น เมฆเรืองแสง แสงโคม ละอองลอย ลายพื้น)
// ปิดชั้นนี้ = ได้ฉากเดิมทุกพิกเซล ไม่มีอะไรต้องดูแลสองชุด
//
// ── ของนิ่งวาดครั้งเดียว ──
// ลายพื้นไม่ขยับ จึงวาดลงภาพสำรองตามความละเอียดผ้าใบครั้งเดียว
// แล้วแปะทุกเฟรม ที่วาดสดมีแค่แสงที่หายใจ/วูบไหว (ไล่สีไม่กี่ชั้น)
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from '../../config.js';
import { KINGDOM } from './palette.js';
import { hash } from './props.js';
import { KINGDOM_LAYERS, eachItem } from './layers.js';

const { W, H } = VIEW;
const SUN = { x: W * 0.62, y: 96 };   // ตำแหน่งเดียวกับแดดใน drawKingdomSky

/** จานสีโหมดสวย — เมฆมีขอบบนรับแดด ท้องเมฆอมม่วงขึ้น */
export const KINGDOM_FX = {
  ...KINGDOM,
  cloud: '#FBE4F4',
  cloudLit: '#FFFCF0',
  cloudShade: '#DDB4E8',
};

const layerOf = (name) => KINGDOM_LAYERS.find((l) => l.name === name);

function glow(ctx, x, y, r, rgb, a) {
  if (a <= 0.003 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.45, `rgba(${rgb},${a * 0.42})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** ประกายสี่แฉกเรืองแสง */
function star(ctx, x, y, r, a, rgb = '255,250,228') {
  glow(ctx, x, y, r * 2.6, rgb, a * 0.35);
  ctx.fillStyle = `rgba(${rgb},${a})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r * 0.72, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r * 0.72, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

// ══ ภาพสำรองของนิ่ง ════════════════════════════════════════

const caches = new Map();

/** ภาพสำรองตามความละเอียดผ้าใบจริง — วาดครั้งเดียวต่อขนาดผ้าใบ */
function cached(ctx, key, paint) {
  const m = ctx.getTransform();
  const sc = Math.hypot(m.a, m.b) || 1;
  const id = `${key}@${sc.toFixed(3)}`;
  let c = caches.get(id);
  if (!c) {
    for (const k of caches.keys()) if (k.startsWith(key + '@')) caches.delete(k);
    const k = sc;
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(W * k));
    c.height = Math.max(1, Math.ceil(H * k));
    const cx = c.getContext('2d');
    cx.scale(k, k);
    paint(cx);
    caches.set(id, c);
  }
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(c, 0, 0, W, H);
  ctx.restore();
}

/** ลายพื้นทราย — ใบไม้ร่วง ก้อนกรวด ดอกไม้จิ๋ว เลี่ยงผืนพรมตรงกลาง */
function paintGroundBits(c, p) {
  const onRug = (x, y) => x > 270 && x < 700 && y < GROUND_Y + 82;
  for (let i = 0; i < 70; i++) {
    const x = hash(i * 3.1 + 1) * W;
    const y = GROUND_Y + 14 + hash(i * 5.7 + 2) ** 0.8 * (H - GROUND_Y - 18);
    if (onRug(x, y)) continue;
    const kind = hash(i * 9.3 + 4);
    const sz = 0.7 + (y - GROUND_Y) / (H - GROUND_Y) * 0.8;   // ใกล้ตา = ใหญ่ขึ้น
    if (kind < 0.42) {
      // ใบไม้เขียว
      c.save();
      c.translate(x, y);
      c.rotate(hash(i * 2.3) * Math.PI * 2);
      c.fillStyle = hash(i * 4.4) < 0.5 ? p.mossLight : p.moss;
      c.globalAlpha = 0.8;
      c.beginPath();
      c.ellipse(0, 0, 5.5 * sz, 2.4 * sz, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    } else if (kind < 0.8) {
      // กรวด/รอยทราย
      c.globalAlpha = 0.28;
      c.fillStyle = p.sandDark;
      c.beginPath();
      c.ellipse(x, y, 4.5 * sz, 1.9 * sz, 0, 0, Math.PI * 2);
      c.fill();
    } else {
      // ดอกไม้จิ๋วห้ากลีบ
      c.globalAlpha = 0.9;
      c.fillStyle = hash(i * 6.6) < 0.5 ? '#FFFFFF' : '#F8B6D2';
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        c.beginPath();
        c.arc(x + Math.cos(a) * 2.6 * sz, y + Math.sin(a) * 1.8 * sz, 1.9 * sz, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#F6C64E';
      c.beginPath();
      c.arc(x, y, 1.3 * sz, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.globalAlpha = 1;
}

// ══ ชั้นที่วาดสด ═══════════════════════════════════════════

/** หลังวาดท้องฟ้า: แดดเย็นฟุ้ง ชมพูมุมขวาบน ดาวกะพริบ */
export function fxSky(ctx, p, t) {
  glow(ctx, W * 0.9, -30, 460, '255,168,214', 0.32);
  glow(ctx, W * 0.08, -40, 360, '236,170,236', 0.22);
  const b = 0.92 + 0.08 * Math.sin(t * 0.012);
  glow(ctx, SUN.x, SUN.y + 20, 380 * b, '255,214,170', 0.3);
  glow(ctx, SUN.x, SUN.y + 20, 150 * b, '255,246,214', 0.55);
  for (let i = 0; i < 16; i++) {
    const x = 20 + hash(i * 4.7 + 11) * (W - 40);
    const y = 18 + hash(i * 8.3 + 5) * 190;
    // เว้นหอคอยกลางไว้ ไม่ให้ดาวไปเกาะยอดปราสาท
    if (Math.abs(x - W / 2) < 70 && y > 40) continue;
    const tw = 0.5 + 0.5 * Math.sin(t * (0.03 + hash(i) * 0.03) + i * 2.1);
    const r = (hash(i * 2.9) < 0.3 ? 6 : 3.2) * (0.75 + tw * 0.35);
    star(ctx, x, y, r, 0.35 + tw * 0.55);
  }
}

/** แทรกระหว่างชั้นไกล: รัศมีหลังเมฆ */
export const FX_HOOKS = {
  before(ctx, layer, worldX, p, t) {
    if (layer.name === 'clouds') {
      eachItem(layer, worldX, t, (it, x) => {
        if (it.art !== 'cloud') return;
        const near = Math.max(0, 1 - Math.abs(x - SUN.x) / 420);
        glow(ctx, x, it.y, 120 * it.s, '255,244,250', 0.3);
        glow(ctx, x + 18, it.y - 8, 175 * it.s, '255,212,150', 0.5 * near);
      });
    }
  },
};

/** หลังชั้นไกลทั้งหมด ก่อนพื้น: ไอแดดอุ่นตามขอบฟ้า */
export function fxAir(ctx, p, t) {
  const h = ctx.createLinearGradient(0, GROUND_Y - 70, 0, GROUND_Y + 6);
  h.addColorStop(0, 'rgba(255,222,180,0)');
  h.addColorStop(1, 'rgba(255,222,180,.2)');
  ctx.fillStyle = h;
  ctx.fillRect(0, GROUND_Y - 70, W, 76);
}

/** หลังวาดพื้น (ก่อนของบนพื้น): ลายพื้น แสงอุ่นกลางเวที เงาใต้ของ ขอบล่างเข้ม */
export function fxGround(ctx, worldX, p, t) {
  cached(ctx, 'ground', (c) => paintGroundBits(c, p));
  // พื้นไล่มืดลงล่าง — พื้นทรายสีเดียวดูแบน
  const d = ctx.createLinearGradient(0, GROUND_Y + 10, 0, H);
  d.addColorStop(0, 'rgba(170,110,70,0)');
  d.addColorStop(1, 'rgba(150,90,70,.26)');
  ctx.fillStyle = d;
  ctx.fillRect(0, GROUND_Y + 10, W, H - GROUND_Y - 10);
  // แสงอุ่นตกลงกลางเวที (ที่น้องยืน)
  ctx.save();
  ctx.translate(W / 2, GROUND_Y + 26);
  ctx.scale(1, 0.38);
  glow(ctx, 0, 0, 300, '255,236,196', 0.3);
  ctx.restore();
  // เงาใต้ของที่วางบนพื้น
  const shadow = (x, y, rx) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.24);
    glow(ctx, 0, 0, rx, '96,52,66', 0.3);
    ctx.restore();
  };
  const SH = { yarnBall: 22, bowl: 24, mushroom: 16, potion: 14, potionBasket: 30, lantern: 22, gem: 12 };
  for (const name of ['objects', 'foreground']) {
    eachItem(layerOf(name), worldX, t, (it, x) => {
      const r = SH[it.art];
      if (r) shadow(x, it.y + (it.art === 'gem' ? 12 : 1), r * it.s * 1.3);
    });
  }
}

/** หลังชั้นหน้าทั้งหมด: แสงโคม แสงขวดยา/อัญมณี ละอองแสงลอย */
export function fxFront(ctx, worldX, p, t, opts = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const L = { potion: ['180,226,255', 30, -14, 0.22], gem: ['176,190,255', 30, -6, 0.26] };
  eachItem(layerOf('objects'), worldX, t, (it, x) => {
    const g = L[it.art];
    if (g) glow(ctx, x, it.y + g[2] * it.s, g[1] * it.s, g[0], g[3]);
  });
  if (!opts.noForeground) {
    eachItem(layerOf('foreground'), worldX, t, (it, x) => {
      if (it.art === 'lantern') {
        // สูตรวูบไหวเดียวกับเปลวในโคม (props.js) แสงจึงหายใจพร้อมเปลว
        const fl = 0.75 + Math.sin(t * 0.09 + it.seed) * 0.12 + Math.sin(t * 0.21) * 0.06;
        const cy = it.y - 26 * it.s;
        glow(ctx, x, cy, 110 * it.s, '255,196,110', 0.2 * fl);
        glow(ctx, x, cy, 36 * it.s, '255,236,180', 0.38 * fl);
        ctx.save();
        ctx.translate(x, it.y + 2);
        ctx.scale(1, 0.3);
        glow(ctx, 0, 0, 80 * it.s, '255,200,120', 0.2 * fl);
        ctx.restore();
      } else if (it.art === 'potionBasket') {
        glow(ctx, x, it.y - 22 * it.s, 44 * it.s, '196,214,255', 0.22);
      }
    });
  }
  // ละอองแสงลอยขึ้นช้า ๆ (ระยะชัดตื้น = จุดกลมฟุ้ง)
  for (let i = 0; i < 18; i++) {
    const sp = 0.05 + hash(i * 3.3) * 0.08;
    // ลอยแค่ช่วงต่ำ (พื้น → กลางต้นไม้) ไม่ขึ้นไปเป็นก้อนขาวบนฟ้า
    const span = 170, bottom = GROUND_Y + 50;
    const y = bottom - (((hash(i * 7.1) * span + t * sp) % span));
    const x = hash(i * 5.9 + 2) * W + Math.sin(t * 0.01 + i) * 12;
    const up = bottom - y;
    const fade = Math.min(1, up / 40) * Math.min(1, (span - up) / 60);
    const tw = 0.6 + 0.4 * Math.sin(t * 0.05 + i * 1.9);
    const r = 3 + hash(i) * 3;
    glow(ctx, x, y, r * 2.2, i % 3 ? '255,236,170' : '255,200,236', 0.45 * fade * tw);
    glow(ctx, x, y, r * 0.6, '255,252,236', 0.7 * fade * tw);
  }
  ctx.restore();
}

/**
 * แสงตะเกียงที่ตกลงบน "ตัวของ" ที่วาดทีหลังฉาก (ตัวน้อง กล่องแมวในหน้าแรก)
 *
 * lctx คือผ้าใบชั้นแยกที่มีแค่ตัวของพวกนั้น — ตัวนี้ระบายแสงแบบ source-in
 * ผลจึงเหลือแสงเฉพาะบนเนื้อของ ไม่ฟุ้งออกนอกตัว ฝั่งที่หันหาตะเกียงสว่างสุดแล้วจางตามระยะ
 * ของที่อยู่ไกลเกินรัศมี (เช่นกล่องที่ย้ายไปฝั่งซ้ายบนจอมือถือ) จึงไม่โดนแสงเอง
 * ผู้เรียกเอาชั้นนี้ไปแปะทับแบบ 'lighter'
 */
export function lanternLightMask(lctx, worldX, t) {
  let lamp = null;
  eachItem(layerOf('foreground'), worldX, t, (it, x) => {
    if (it.art === 'lantern' && !lamp && x > -60 && x < W + 60) lamp = { it, x };
  });
  lctx.save();
  lctx.globalCompositeOperation = 'source-in';
  if (lamp) {
    const { it, x } = lamp;
    const fl = 0.75 + Math.sin(t * 0.09 + it.seed) * 0.12 + Math.sin(t * 0.21) * 0.06;
    const cy = it.y - 26 * it.s;
    const R = 175 * it.s;
    const g = lctx.createRadialGradient(x, cy, 0, x, cy, R);
    g.addColorStop(0, `rgba(255,196,112,${0.42 * fl})`);
    g.addColorStop(0.45, `rgba(255,178,96,${0.2 * fl})`);
    g.addColorStop(1, 'rgba(255,170,90,0)');
    lctx.fillStyle = g;
  } else {
    lctx.fillStyle = 'rgba(0,0,0,0)';
  }
  lctx.fillRect(-W, -H, W * 3, H * 3);
  lctx.restore();
}
