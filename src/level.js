// src/level.js
import { GROUND_Y, LEVEL, VIEW, SHIELD } from './config.js';
import { randInt } from './utils.js';

const { spike, bar, coinR, chunkW } = LEVEL;

/** เจลลี่เรียงเป็นเส้นโค้ง */
function coinArc(x, count, gap, peak) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    out.push({
      x: x + i * gap,
      y: GROUND_Y - 46 - Math.sin(t * Math.PI) * peak,
      r: coinR,
      got: false,
    });
  }
  return out;
}

/** เจลลี่ระดับต่ำ เก็บได้เฉพาะตอนหมอบ */
function coinLow(x, count, gap) {
  return Array.from({ length: count }, (_, i) => ({
    x: x + i * gap,
    y: 306,
    r: coinR,
    got: false,
  }));
}

const groundSpike = (x) => ({ x, y: GROUND_Y - spike.h, w: spike.w, h: spike.h });
const lowBar = (x) => ({ x, y: bar.top, w: bar.w, h: bar.h, bar: true });

// ─────────────────────────────────────────────────────────────
// หัวใจของ endless runner
// อย่าสุ่มสิ่งกีดขวางทีละชิ้น เพราะจะได้ด่านที่ผ่านไม่ได้
// ให้ออกแบบ "ท่อน" ที่การันตีว่าผ่านได้ แล้วสุ่มเอาท่อนมาต่อกัน
// อยากเพิ่มความหลากหลาย = เขียนฟังก์ชันใหม่ต่อท้าย array นี้ แค่นั้น
// ─────────────────────────────────────────────────────────────
export const PATTERNS = [
  // 0 — ทางเรียบ ให้หายใจ
  (x) => ({ obs: [], pit: [], coin: coinArc(x + 280, 6, 46, 66) }),

  // 1 — หนามเดี่ยวสองจุด
  (x) => ({
    obs: [groundSpike(x + 230), groundSpike(x + 540)],
    pit: [],
    coin: coinArc(x + 330, 4, 44, 74),
  }),

  // 2 — คานเตี้ย ต้องหมอบลอด
  (x) => ({
    obs: [lowBar(x + 300)],
    pit: [],
    coin: coinLow(x + 318, 4, 44),
  }),

  // 3 — หลุมเดี่ยว
  (x) => ({
    obs: [],
    pit: [{ x: x + 280, w: 132 }],
    coin: coinArc(x + 282, 5, 34, 88),
  }),

  // 4 — กระโดดแล้วต่อด้วยหมอบ
  (x) => ({
    obs: [groundSpike(x + 200), lowBar(x + 470)],
    pit: [],
    coin: coinLow(x + 488, 3, 46),
  }),

  // 5 — สองหลุมติด
  (x) => ({
    obs: [],
    pit: [{ x: x + 210, w: 116 }, { x: x + 450, w: 116 }],
    coin: [...coinArc(x + 214, 4, 30, 70), ...coinArc(x + 454, 4, 30, 70)],
  }),

  // 6 — หนามคู่ชิด ต้องกระโดดข้ามทีเดียว
  (x) => ({
    obs: [groundSpike(x + 250), groundSpike(x + 332)],
    pit: [],
    coin: coinArc(x + 262, 4, 38, 96),
  }),
];

export class Level {
  constructor() {
    this.reset();
  }

  reset() {
    this.obstacles = [];
    this.coins = [];
    this.pits = [];
    this.shields = [];
    this.nextChunkX = 900;   // เว้นที่ว่างตอนเริ่มเกม
    this.chunkIndex = 0;
  }

  spawnChunk() {
    // 3 ท่อนแรกใช้แพตเทิร์นง่าย ให้ผู้เล่นตั้งตัวก่อน
    let idx;
    if (this.chunkIndex === 0) idx = 0;
    else if (this.chunkIndex < 3) idx = [0, 1, 3][this.chunkIndex % 3];
    else idx = randInt(PATTERNS.length);

    const c = PATTERNS[idx](this.nextChunkX);
    this.obstacles.push(...c.obs);
    this.pits.push(...c.pit);
    this.coins.push(...c.coin);

    // โล่ไม่โผล่ในท่อนแรก ๆ และไม่โผล่ทุกท่อน
    if (this.chunkIndex > 2 && Math.random() < SHIELD.spawnChance) {
      this.shields.push({
        x: this.nextChunkX + chunkW / 2,
        y: SHIELD.y,
        r: SHIELD.r,
        got: false,
      });
    }

    this.nextChunkX += chunkW;
    this.chunkIndex++;
  }

  /** เติมท่อนล่วงหน้าเสมอ ไม่ให้ผู้เล่นวิ่งไปเจอที่ว่าง */
  ensureAhead(camera) {
    while (this.nextChunkX < camera + VIEW.W + chunkW) this.spawnChunk();
  }

  /**
   * ทิ้งของที่หลุดจอไปแล้ว
   * ถ้าไม่ทำ array จะโตไม่หยุดจน FPS ตกภายใน 1-2 นาที
   */
  cull(camera) {
    const cut = camera - 200;
    this.obstacles = this.obstacles.filter((o) => o.x + o.w > cut);
    this.coins = this.coins.filter((c) => c.x > cut);
    this.pits = this.pits.filter((p) => p.x + p.w > cut);
    this.shields = this.shields.filter((s) => s.x > cut);
  }

  isOverPit(worldX) {
    return this.pits.some((p) => worldX > p.x + 6 && worldX < p.x + p.w - 6);
  }
}
