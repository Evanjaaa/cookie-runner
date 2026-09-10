// src/render/kingdom/layers.js
// ─────────────────────────────────────────────────────────────
// ชั้นฉากและระบบเลื่อนแบบพารัลแลกซ์
//
// ── ฉากทั้งหมดเป็น "ข้อมูล" ไม่ใช่โค้ด ──
// แต่ละชั้นบอกแค่ว่า มีของอะไร วางตรงไหน ตัวไหนใหญ่แค่ไหน และเลื่อนเร็วแค่ไหน
// ตัวเรนเดอร์ข้างล่างไม่รู้จักปราสาทหรือเห็ดเลยสักชิ้น มันแค่ไล่วาดตามรายการ
// อยากได้แมพใหม่ = ประกาศชุดชั้นใหม่ ไม่ต้องแตะฟังก์ชันวาดแม้แต่บรรทัดเดียว
//
// ── ทำไมต้องวนซ้ำเป็น tile ──
// ฉากต้องเลื่อนได้ไม่รู้จบ แต่เราไม่อยากเก็บของเป็นล้านชิ้นไว้ในหน่วยความจำ
// จึงประกาศของแค่ "หนึ่งช่วง" (tile) แล้ววาดช่วงนั้นซ้ำเรียงกันไปเรื่อย ๆ
// ความกว้างของแต่ละชั้นไม่เท่ากันโดยตั้งใจ — ถ้าเท่ากันหมด ทุกชั้นจะวนพร้อมกัน
// แล้วตาจับได้ว่าเป็นภาพเดิมซ้ำ
//
// ── ตัวเลข depth ──
// 0 = ไกลสุด แทบไม่ขยับ / 1 = เลื่อนเท่าพื้นที่ตัวละครวิ่งอยู่ / >1 = อยู่หน้าตัวละคร
// ─────────────────────────────────────────────────────────────
import { VIEW, GROUND_Y } from '../../config.js';
import { PROPS } from './props.js';

const { W, H } = VIEW;

/**
 * ชั้นฉากของ "อาณาจักรแมวขนมหวาน"
 *
 * พิกัด y ของทุกชิ้นวัดจากขอบบนของฉากเหมือนกับตัวเกม และของที่ "ยืนบนพื้น"
 * ใช้ GROUND_Y เป็นฐานเสมอ ตัวละครจึงยืนบนพื้นเดียวกับฉากพอดีโดยไม่ต้องจูนทีหลัง
 */
export const KINGDOM_LAYERS = [
  {
    name: 'clouds',
    depth: 0.05,
    // ── drift: เลื่อนด้วย "เวลา" ไม่ใช่ด้วยการเดินทางของตัวละคร ──
    // เมฆต้องลอยแม้ตอนที่ฉากหยุดนิ่ง เพราะลมไม่ได้หยุดพัดตามผู้เล่น
    // แยกสองอย่างนี้ออกจากกัน หน้าแรกจึงหยุดฉากได้โดยที่ท้องฟ้ายังมีชีวิต
    drift: 0.06,
    tile: 900,
    items: [
      { art: 'cloud', x: 90,  y: 66,  s: 1.15, seed: 3 },
      { art: 'cloud', x: 430, y: 44,  s: 0.85, seed: 11 },
      { art: 'cloud', x: 700, y: 88,  s: 1.0,  seed: 19 },
      { art: 'skyBauble', x: 250, y: 58,  s: 1.0, seed: 5 },
      { art: 'skyBauble', x: 560, y: 96,  s: 0.9, seed: 23 },
      { art: 'skyBauble', x: 830, y: 52,  s: 1.1, seed: 31 },
    ],
  },
  {
    name: 'castle',
    depth: 0.15,
    // เท่าความกว้างจอพอดี ปราสาทจึงอยู่กลางภาพเสมอตอนฉากยังไม่เลื่อน
    tile: 960,
    items: [
      { art: 'wallTower', x: 96,  y: GROUND_Y + 2, s: 1.05, seed: 2 },
      { art: 'castle',    x: 480, y: GROUND_Y + 6, s: 0.95, seed: 7 },
      { art: 'wallTower', x: 864, y: GROUND_Y + 2, s: 1.05, seed: 13 },
    ],
  },
  {
    name: 'hills',
    depth: 0.3,
    tile: 660,
    items: [
      { art: 'cliff',    x: 48,  y: GROUND_Y + 4, s: 1.0,  seed: 4 },
      { art: 'donut',    x: 196, y: GROUND_Y - 118, s: 1.3, seed: 21 },
      { art: 'cliff',    x: 300, y: GROUND_Y + 4, s: 0.82, seed: 8 },
      { art: 'mossHill', x: 452, y: GROUND_Y + 2, s: 0.9,  seed: 10 },
      { art: 'cliff',    x: 588, y: GROUND_Y + 4, s: 1.05, seed: 12 },
      { art: 'donut',    x: 638, y: GROUND_Y - 146, s: 0.95, seed: 24 },
    ],
  },
  {
    name: 'env',
    depth: 0.6,
    tile: 540,
    items: [
      { art: 'tree',      x: 34,  y: GROUND_Y, s: 1.05, seed: 9 },
      { art: 'bush',      x: 128, y: GROUND_Y, s: 1.0,  seed: 17 },
      { art: 'candyArch', x: 206, y: GROUND_Y, s: 1.0,  seed: 15 },
      { art: 'lollipop',  x: 296, y: GROUND_Y, s: 1.05, seed: 25 },
      { art: 'mushroom',  x: 356, y: GROUND_Y, s: 1.1,  seed: 29 },
      { art: 'tree',      x: 448, y: GROUND_Y, s: 0.9,  seed: 27 },
      { art: 'bush',      x: 512, y: GROUND_Y, s: 0.85, seed: 31 },
      { art: 'butterfly', x: 246, y: GROUND_Y - 84, s: 1.1, seed: 61 },
      { art: 'butterfly', x: 396, y: GROUND_Y - 120, s: 0.9, seed: 67 },
    ],
  },
  {
    name: 'objects',
    // เท่าความเร็วพื้น = ของกลุ่มนี้ "อยู่บนพื้นเดียวกับตัวละคร"
    // ซึ่งเป็นเงื่อนไขที่ทำให้เอาไปทำของเก็บหรือสิ่งกีดขวางได้ในอนาคต
    depth: 1,
    tile: 500,
    items: [
      { art: 'yarnBall', x: 30,  y: GROUND_Y, s: 0.9,  seed: 33 },
      { art: 'mouse',    x: 104, y: GROUND_Y, s: 1.0,  seed: 35 },
      { art: 'gem',      x: 168, y: GROUND_Y - 12, s: 1.0, seed: 37 },
      { art: 'bowl',     x: 244, y: GROUND_Y, s: 1.0,  seed: 39 },
      { art: 'mushroom', x: 312, y: GROUND_Y, s: 0.8,  seed: 41 },
      { art: 'potion',   x: 372, y: GROUND_Y, s: 1.0,  seed: 43 },
      { art: 'mouse',    x: 436, y: GROUND_Y, s: 0.85, seed: 45 },
      { art: 'yarnBall', x: 478, y: GROUND_Y, s: 0.75, seed: 47 },
    ],
  },
  {
    name: 'foreground',
    // เร็วกว่าพื้น = อยู่หน้าตัวละคร ให้ความรู้สึกว่าฉากมีความลึกจริง
    depth: 1.35,
    tile: 820,
    items: [
      // ── ตำแหน่งชุดนี้เลือกจากที่ว่างจริงบนหน้าแรก ──
      // ฉากไม่เลื่อนแล้ว ของหน้าสุดจึงอยู่ที่เดิมตลอด และไปนั่งใต้ปุ่มเมนูได้ถาวร
      // แถบปุ่มซ้ายกินราว x 20-90 แถบขวา 870-950 ปุ่มเล่นมุมขวาล่าง 816-912
      // สี่ชิ้นนี้จึงเลี่ยงสามช่วงนั้นทั้งหมด
      { art: 'yarnBall',     x: 176, y: GROUND_Y + 46, s: 1.9, seed: 49 },
      { art: 'potionBasket', x: 336, y: GROUND_Y + 40, s: 1.15, seed: 51 },
      { art: 'lantern',      x: 612, y: GROUND_Y + 44, s: 1.1,  seed: 53 },
      { art: 'bush',         x: 726, y: GROUND_Y + 48, s: 1.2,  seed: 55 },
    ],
  },
];

/** ประกายลอยในอากาศ — ไม่ใช่ชั้นของตัวเอง เพราะมันไม่ควรวนซ้ำเป็นแพตเทิร์นที่จับได้ */
const SPARKS = 14;

/**
 * ท้องฟ้า — ไล่สีสามจุดกับแสงอาทิตย์
 *
 * ไม่เลื่อนตามฉาก ท้องฟ้าที่เลื่อนได้จะทำให้รู้สึกว่าโลกเล็ก
 * (ของที่ "อยู่ไกลจนไม่ขยับ" คือสิ่งที่บอกสเกลของโลกให้สมองรู้)
 */
export function drawKingdomSky(ctx, p) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, p.sky[0]);
  g.addColorStop(0.52, p.sky[1]);
  g.addColorStop(1, p.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // ดวงอาทิตย์อยู่หลังปราสาทเยื้องขวา — แสงจึงมาจากทางเดียวกับไฮไลต์ของทุกชิ้น
  const sun = ctx.createRadialGradient(W * 0.62, 96, 12, W * 0.62, 96, 240);
  sun.addColorStop(0, p.sunGlow);
  sun.addColorStop(1, 'rgba(255,233,186,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, GROUND_Y);
}

/**
 * พื้น — แถบทรายครีมพร้อมขอบการ์ตูน และพรมวิเศษที่เลื่อนไปกับพื้น
 *
 * ขอบบนของพื้นเป็นเส้นหยักเบา ๆ ไม่ใช่เส้นตรง พื้นตรงเป๊ะจะอ่านเป็น "แถบ UI"
 * ซึ่งเป็นสิ่งเดียวที่ทำให้ฉากหลุดจากความเป็นเกมเร็วที่สุด
 */
export function drawKingdomGround(ctx, worldX, p, t) {
  const top = GROUND_Y;

  ctx.fillStyle = p.sand;
  ctx.fillRect(0, top, W, H - top);

  // แถบสว่างด้านบนของพื้น = แสงตกกระทบ ทำให้พื้นมีความหนา ไม่ใช่แผ่นสีเดียว
  ctx.fillStyle = p.sandLight;
  ctx.beginPath();
  ctx.moveTo(0, top + 4);
  for (let x = 0; x <= W; x += 24) {
    ctx.lineTo(x, top + 4 + Math.sin((x + worldX * 0.4) * 0.012) * 3);
  }
  ctx.lineTo(W, top + 26);
  ctx.lineTo(0, top + 26);
  ctx.closePath();
  ctx.fill();

  // เส้นขอบบนสุด หนากว่าเส้นอื่นในฉาก เพราะเป็นเส้นที่บอกว่า "ยืนตรงนี้ได้"
  ctx.strokeStyle = p.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, top + 2);
  for (let x = 0; x <= W; x += 24) {
    ctx.lineTo(x, top + 2 + Math.sin((x + worldX * 0.4) * 0.012) * 3);
  }
  ctx.stroke();

  // ── พรมวางบนพื้น ──
  // ขอบไกลของพรมอยู่ "เหนือ" เส้นพื้นเล็กน้อย เท้าน้อง (ซึ่งอยู่ที่ GROUND_Y พอดี)
  // จึงตกลงในผืนพรม ไม่ใช่ยืนอยู่เหนือขอบบนของพรมเหมือนของเดิมที่วางไว้ต่ำกว่า 18 หน่วย
  // เลื่อนด้วยความเร็วเดียวกับพื้นเป๊ะ ไม่งั้นมันจะลอยตอนเอาไปใช้ในด่านที่ฉากเลื่อน
  const tile = 960;
  let off = -(worldX % tile);
  if (off > 0) off -= tile;
  for (let base = off; base < W + tile; base += tile) {
    PROPS.rug(ctx, base + 480, top - 10, 1, p, t, 1);
  }
}

/** ชั้นเดียว — วาดซ้ำเป็นช่วง ๆ จนเต็มจอ */
function drawLayer(ctx, layer, worldX, p, t) {
  const shift = worldX * layer.depth + (layer.drift || 0) * t;
  let off = -(shift % layer.tile);
  if (off > 0) off -= layer.tile;

  for (let base = off - layer.tile; base < W + layer.tile; base += layer.tile) {
    for (const it of layer.items) {
      const x = base + it.x;
      // ตัดของที่อยู่นอกจอทิ้งก่อนเรียกฟังก์ชันวาด — เผื่อขอบ 200 หน่วยให้ของชิ้นใหญ่
      if (x < -200 || x > W + 200) continue;
      const draw = PROPS[it.art];
      if (draw) draw(ctx, x, it.y, it.s, p, t, it.seed);
    }
  }
}

/**
 * หมอกระยะไกล — ม่านสีเดียวกับขอบฟ้าคลุมทับหลังวาดชั้นไกลแต่ละชั้น
 *
 * ── ทำไมพารัลแลกซ์อย่างเดียวไม่พอ ──
 * ความเร็วต่างกันบอกได้แค่ว่า "ของสองชิ้นอยู่คนละระยะ" แต่ไม่ได้บอกว่าอันไหนไกลกว่า
 * ตาคนอ่านระยะจาก "ความจาง" เป็นหลัก ของไกลต้องซีดลงและกลืนไปกับสีอากาศ
 * ไม่มีม่านนี้ ปราสาทกับต้นไม้หน้าสุดจะสดเท่ากันจนภาพแบนติดกันเป็นแผ่นเดียว
 *
 * ทำเป็นม่านทับทั้งผืนได้เพราะวาดทีละชั้น — ชั้นที่วาดทีหลังจึงโดนม่านน้อยลงเรื่อย ๆ
 * ซึ่งให้ผลเหมือนไล่ระยะจริงโดยไม่ต้องคำนวณอะไรต่อชิ้นเลย
 */
function haze(ctx, p, alpha) {
  // ม่านจางที่สุดตรงบน เข้มขึ้นตรงขอบฟ้า — อากาศหนาที่สุดตรงที่มองไกลที่สุด
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, p.sky[1]);
  g.addColorStop(1, p.sky[2]);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, GROUND_Y);
  ctx.globalAlpha = 1;
}

/** ชั้นที่อยู่หลังพื้น (ฟ้า ปราสาท เนิน ต้นไม้) */
export function drawKingdomBack(ctx, worldX, p, t) {
  // ความเข้มของม่านต่อชั้น — บางมากโดยตั้งใจ
  // ต้นแบบเป็นภาพประกอบสีสด ไม่ได้ใช้หมอกระยะแบบภาพวาดสีน้ำมัน
  // ลองใส่หนา (0.12/0.30/0.16) แล้ววัดด้วยตา: ปราสาทโดนม่านสะสม 0.58 จนแทบหายไปกับฟ้า
  // เอาไว้แค่พอ "ดันชั้นหลังให้ถอยหลังไปครึ่งก้าว" ความลึกที่เหลือมาจากขนาดกับการบัง
  const veil = { clouds: 0.05, castle: 0.1, hills: 0.05, env: 0 };
  for (const layer of KINGDOM_LAYERS) {
    if (layer.depth >= 1) continue;
    drawLayer(ctx, layer, worldX, p, t);
    const a = veil[layer.name];
    if (a) haze(ctx, p, a);
  }
}

/** ชั้นที่อยู่บนพื้น (ของเก็บ ของตกแต่ง) และชั้นหน้าสุด */
export function drawKingdomFront(ctx, worldX, p, t, opts = {}) {
  for (const layer of KINGDOM_LAYERS) {
    if (layer.depth < 1) continue;
    // ชั้นหน้าสุดบังตัวละคร บางหน้าจึงขอปิดไว้ได้ (เช่นตอนต้องเห็นน้องเต็มตัว)
    if (layer.name === 'foreground' && opts.noForeground) continue;
    drawLayer(ctx, layer, worldX, p, t);
  }

  // ประกายลอย — ผูกกับเวลา ไม่ใช่ระยะเลื่อนฉาก ไม่งั้นตอนฉากหยุดประกายจะค้างนิ่ง
  // กระจายด้วยเลขเฉพาะ จึงไม่ตรงกับจังหวะวนของชั้นไหนเลย
  for (let i = 0; i < SPARKS; i++) {
    const sx = ((i * 137.5 - t * 0.18) % (W + 80) + W + 80) % (W + 80) - 40;
    const sy = 60 + ((i * 97) % 220);
    PROPS.sparkle(ctx, sx, sy, 0.8, p, t, i * 3 + 1);
  }
}
