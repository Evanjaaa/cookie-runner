// src/level.js
import { GROUND_Y, LEVEL, VIEW, SHIELD, POTION, PHYSICS, BODY, SPEED, KIBBLE } from './config.js';
import { randInt } from './utils.js';

const { spike, bar, crate, fishR, chunkW } = LEVEL;

// ─────────────────────────────────────────────────────────────
// เส้นทางกระโดด — แกนกลางของการวางด่านทั้งหมด
//
// จำลองทีละเฟรมด้วยฟิสิกส์ชุดเดียวกับ Player.update เป๊ะ ๆ
// ห้ามใช้สูตรพาราโบลาต่อเนื่องแทน เพราะเกมอินทิเกรตแบบ Euler
// (vy += g แล้วค่อย y += vy) ซึ่งให้เส้นโค้งที่เตี้ยกว่าสูตรจริงเล็กน้อย
// ผิดแค่ไม่กี่พิกเซลก็พอให้ปลาลอยเหนือหัวจนเก็บไม่ได้
//
// คำนวณครั้งเดียวตอนโหลดโมดูล เพราะความเร็วคงที่แล้ว ผลลัพธ์จึงไม่มีวันเปลี่ยน
// ─────────────────────────────────────────────────────────────
/** doubleAt = เฟรมที่กดกระโดดครั้งที่สอง (null = กระโดดเดี่ยว) */
function jumpPath(doubleAt = null) {
  const pts = [];
  let y = GROUND_Y;
  let vy = PHYSICS.jumpV;

  for (let f = 1; f < 300; f++) {
    vy += PHYSICS.gravity;
    y += vy;
    if (y >= GROUND_Y) break;              // แตะพื้นแล้ว จบส่วนโค้ง
    // y ของแมวคือ "ตำแหน่งเท้า" ส่วนการเก็บของวัดจากกลางกล่องชน
    pts.push({ dx: f * SPEED.run, y: y - BODY.standH / 2 });
    // ตั้ง vy หลัง push แล้ว เพราะในเกมจริงการกดจะมีผลตั้งแต่เฟรมถัดไป
    if (f === doubleAt) vy = PHYSICS.doubleJumpV;
  }
  return pts;
}

/** เฟรมที่กดกระโดดชั้นสอง — กลางอากาศพอดี กดง่ายและปลายังไม่ทะลุ HUD */
const DOUBLE_AT = 15;

const JUMP = jumpPath();
const JUMP_DBL = jumpPath(DOUBLE_AT);

const span = (path) => path[path.length - 1].dx;
/** dx ณ จุดสูงสุดของส่วนโค้ง — ที่ที่ควรวางสิ่งกีดขวางเพราะแมวลอยพ้นแน่นอน */
const peak = (path) => path.reduce((a, b) => (b.y < a.y ? b : a)).dx;

const JUMP_SPAN = span(JUMP);
const HALF = JUMP_SPAN / 2;
const DBL_SPAN = span(JUMP_DBL);
const DBL_PEAK = peak(JUMP_DBL);

/**
 * เม็ดอาหารเรียงตามเส้นทางกระโดดจริง
 * x = จุดที่ผู้เล่นต้องกดกระโดด ปลาเม็ดแรกจึงเป็นสัญญาณบอกจังหวะกดในตัว
 * เว้นหัวท้ายไว้เล็กน้อย ไม่งั้นเม็ดริมสุดจะจมอยู่ระดับพื้นจนดูไม่ออกว่าเป็นส่วนโค้ง
 */
function fishAlong(path, x, count) {
  return Array.from({ length: count }, (_, i) => {
    const t = 0.08 + (0.84 * i) / (count - 1);
    const p = path[Math.round(t * (path.length - 1))];
    return { x: x + p.dx, y: p.y, r: fishR, got: false, kind: 'fish' };
  });
}

const fishJump = (x, count) => fishAlong(JUMP, x, count);
const fishDouble = (x, count) => fishAlong(JUMP_DBL, x, count);

/**
 * เปลี่ยนบางเม็ดในท่อนให้เป็นอาหารเม็ดกลม — แก้เฉพาะ kind
 * ตำแหน่งกับรัศมีเก็บไม่ขยับเลย จังหวะกระโดดที่จูนไว้จึงไม่เปลี่ยนตาม
 *
 * cluster  = เกาะกลุ่มตรงยอดส่วนโค้ง ซึ่งเป็นจุดที่เอื้อมถึงยากที่สุด
 *            กดพลาดนิดเดียวก็หลุดทั้งกลุ่ม — คุ้มค่าที่ให้ 2500
 * alternate = สลับกับปลาไปตลอดแนว ได้แน่ ๆ แต่กระจายทีละเม็ด
 */
function makeKibble(items, style) {
  if (!items.length) return;

  if (style === 'cluster') {
    let top = 0;
    items.forEach((it, i) => { if (it.y < items[top].y) top = i; });
    const from = Math.max(0, top - 1);
    for (let i = from; i < Math.min(items.length, from + KIBBLE.clusterSize); i++) {
      items[i].kind = 'kibble';
    }
  } else {
    for (let i = 1; i < items.length; i += KIBBLE.alternateEvery) items[i].kind = 'kibble';
  }
}

/** เม็ดอาหารระดับต่ำ ตรงกับกลางตัวตอนหมอบพอดี เก็บได้เฉพาะตอนลอดคาน */
function fishLow(x, count, gap) {
  return Array.from({ length: count }, (_, i) => ({
    x: x + i * gap,
    y: GROUND_Y - BODY.slideH / 2,
    r: fishR,
    got: false,
    kind: 'fish',
  }));
}

const groundSpike = (x) => ({ x, y: GROUND_Y - spike.h, w: spike.w, h: spike.h, kind: 'spike' });
const lowBar = (x) => ({ x, y: bar.top, w: bar.w, h: bar.h, kind: 'bar' });

/** กล่องลังซ้อน rows ชั้น วางบนพื้น — rows มากขึ้น = ต้องกระโดดแรงขึ้น */
const crateStack = (x, rows = 1) => ({
  x,
  y: GROUND_Y - crate.h * rows,
  w: crate.w,
  h: crate.h * rows,
  rows,
  kind: 'crate',
});

// ─────────────────────────────────────────────────────────────
// หัวใจของ endless runner
// อย่าสุ่มสิ่งกีดขวางทีละชิ้น เพราะจะได้ด่านที่ผ่านไม่ได้
// ให้ออกแบบ "ท่อน" ที่การันตีว่าผ่านได้ แล้วสุ่มเอาท่อนมาต่อกัน
// อยากเพิ่มความหลากหลาย = เขียนฟังก์ชันใหม่ต่อท้าย array นี้ แค่นั้น
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// ทุกแพตเทิร์นยึดหลักเดียวกัน: หาจุดกด j ก่อน แล้วค่อยวางทุกอย่างอิงจาก j
//   - ปลาเรียงตามส่วนโค้งที่ออกจาก j
//   - สิ่งกีดขวางวางที่จุดสูงสุดของส่วนโค้ง ซึ่งเป็นที่ที่แมวลอยพ้นแน่นอน
// ผลคือ "กดกระโดดตรงปลาเม็ดแรก" = เก็บครบทั้งเส้น + ข้ามพ้นพอดีในทีเดียว
// ผู้เล่นเลยอ่านด่านจากแนวปลาได้เลย ไม่ต้องกะระยะเอง — นี่คือฟีลคุกกี้รัน
//
// jumps = ตำแหน่ง x ที่ตั้งใจให้ผู้เล่นกดกระโดด เกมไม่ได้ใช้ค่านี้ตอนรัน
// แต่เป็นการประกาศ "เฉลย" ของด่านไว้ในโค้ด ให้ playtest เอาไปตรวจได้ว่า
// เล่นตามที่ออกแบบแล้วเก็บครบและรอดจริงไหม
//
// width = ความยาวของท่อน ใส่เมื่อแพตเทิร์นยาวกว่า chunkW ปกติ
// ─────────────────────────────────────────────────────────────
export const PATTERNS = [
  // 0 — ทางเรียบ ส่วนโค้งเปล่า ๆ ให้จับจังหวะกด
  (x) => ({ obs: [], pit: [], fish: fishJump(x + 260, 9), jumps: [x + 260] }),

  // 1 — หนามเดี่ยวกลางส่วนโค้ง
  (x) => {
    const j = x + 230;
    return {
      obs: [groundSpike(j + HALF - spike.w / 2)],
      pit: [],
      fish: fishJump(j, 9),
      jumps: [j],
    };
  },

  // 2 — คานเตี้ย ต้องหมอบลอด ปลาเรียงต่ำใต้คาน
  (x) => ({
    obs: [lowBar(x + 300)],
    pit: [],
    fish: fishLow(x + 308, 6, 32),
    jumps: [],
  }),

  // 3 — หลุมเดี่ยว ปากหลุมอยู่กลางส่วนโค้ง
  (x) => {
    const j = x + 240;
    return {
      obs: [],
      pit: [{ x: j + HALF - 66, w: 132 }],
      fish: fishJump(j, 9),
      jumps: [j],
    };
  },

  // 4 — กระโดดข้ามหนาม แล้วต่อด้วยหมอบลอดคาน
  (x) => {
    const j = x + 180;
    const barX = j + JUMP_SPAN + 140;
    return {
      obs: [groundSpike(j + HALF - spike.w / 2), lowBar(barX)],
      pit: [],
      fish: [...fishJump(j, 8), ...fishLow(barX + 8, 6, 32)],
      jumps: [j],
    };
  },

  // 5 — สองหลุมติด กระโดดสองจังหวะต่อเนื่อง
  (x) => {
    const j1 = x + 170;
    const j2 = j1 + JUMP_SPAN + 100;
    return {
      obs: [],
      pit: [{ x: j1 + HALF - 58, w: 116 }, { x: j2 + HALF - 58, w: 116 }],
      fish: [...fishJump(j1, 8), ...fishJump(j2, 8)],
      jumps: [j1, j2],
    };
  },

  // 6 — หนามคู่ชิด กระโดดทีเดียวข้ามทั้งคู่
  (x) => {
    const j = x + 240;
    return {
      obs: [groundSpike(j + HALF - 46), groundSpike(j + HALF + 14)],
      pit: [],
      fish: fishJump(j, 9),
      jumps: [j],
    };
  },

  // 7 — กล่องซ้อนสามชั้น สูง 156px เกินเพดานกระโดดเดี่ยว (ได้แค่ 134px)
  //     จึงบังคับให้กดกระโดดครั้งที่สองกลางอากาศเท่านั้นถึงจะข้ามได้
  (x) => {
    const j = x + 250;
    return {
      obs: [crateStack(j + DBL_PEAK - crate.w / 2, 3)],
      pit: [],
      fish: fishDouble(j, 12),
      jumps: [j, j + DOUBLE_AT * SPEED.run],
    };
  },

  // 8 — กล่องเรียงสามใบ กระโดด → ลงพื้น → กระโดดใหม่ เป็นจังหวะสม่ำเสมอ
  //     เว้นระยะ JUMP_SPAN + 90 คือลงพื้นแล้วมีเวลาตั้งหลักราว 13 เฟรมก่อนกดครั้งถัดไป
  (x) => {
    const step = JUMP_SPAN + 90;
    const js = [x + 130, x + 130 + step, x + 130 + step * 2];
    return {
      obs: js.map((j) => crateStack(j + HALF - crate.w / 2, 1)),
      pit: [],
      fish: js.flatMap((j) => fishJump(j, 7)),
      jumps: js,
      width: step * 2 + JUMP_SPAN + 250,
    };
  },
];

export class Level {
  constructor() {
    this.reset();
  }

  reset() {
    this.obstacles = [];
    this.fishes = [];
    this.pits = [];
    this.shields = [];
    this.potions = [];
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
    // แพตเทิร์นยาว ๆ ประกาศ width เองได้ ไม่งั้นเนื้อหาจะล้นไปทับท่อนถัดไป
    const w = c.width || chunkW;

    // เม็ดกลมไม่โผล่ในท่อนแรก ๆ และไม่โผล่ทุกท่อน จึงหายากกว่าปลาชัดเจน
    if (this.chunkIndex > 1 && Math.random() < KIBBLE.chance) {
      makeKibble(c.fish, Math.random() < 0.5 ? 'cluster' : 'alternate');
    }

    this.obstacles.push(...c.obs);
    this.pits.push(...c.pit);
    this.fishes.push(...c.fish);

    // โล่ไม่โผล่ในท่อนแรก ๆ และไม่โผล่ทุกท่อน
    if (this.chunkIndex > 2 && Math.random() < SHIELD.spawnChance) {
      this.shields.push({
        x: this.nextChunkX + w / 2,
        y: SHIELD.y,
        r: SHIELD.r,
        got: false,
      });
    }

    this.nextChunkX += w;
    this.chunkIndex++;
  }

  /** เติมท่อนล่วงหน้าเสมอ ไม่ให้ผู้เล่นวิ่งไปเจอที่ว่าง */
  ensureAhead(camera) {
    while (this.nextChunkX < camera + VIEW.W + chunkW) this.spawnChunk();
  }

  /**
   * วางขวดพลังลงบนจุดโล่งจุดแรกที่เจอนับจาก fromX
   * ต้องเรียกหลัง ensureAhead() เท่านั้น ไม่งั้นจะไปเช็คพื้นที่ที่ยังไม่ถูกสร้าง
   * แล้วได้จุด "โล่ง" ปลอม ๆ ที่พอวิ่งถึงจริงกลับมีหนามอยู่
   */
  spawnPotion(fromX) {
    const limit = fromX + chunkW;
    for (let x = fromX; x < limit; x += 24) {
      if (this.isClearSpot(x)) {
        this.potions.push({ x, y: POTION.y, got: false });
        return;
      }
    }
    // ด่านแน่นจนไม่มีจุดโล่งเลย — ยังต้องให้ขวด ไม่งั้นผู้เล่นตายโดยไม่มีทางแก้
    this.potions.push({ x: limit, y: POTION.y, got: false });
  }

  /** จุดที่ห่างจากหนาม คาน และหลุมพอที่จะกระโดดเก็บได้โดยไม่โดนอะไร */
  isClearSpot(x) {
    const pad = POTION.clearance;
    const near = (ox, ow) => x + pad > ox && x - pad < ox + ow;
    return (
      !this.pits.some((p) => near(p.x, p.w)) &&
      !this.obstacles.some((o) => near(o.x, o.w))
    );
  }

  /**
   * ทิ้งของที่หลุดจอไปแล้ว
   * ถ้าไม่ทำ array จะโตไม่หยุดจน FPS ตกภายใน 1-2 นาที
   */
  cull(camera) {
    const cut = camera - 200;
    this.obstacles = this.obstacles.filter((o) => o.x + o.w > cut);
    this.fishes = this.fishes.filter((f) => f.x > cut);
    this.pits = this.pits.filter((p) => p.x + p.w > cut);
    this.shields = this.shields.filter((s) => s.x > cut);
    this.potions = this.potions.filter((p) => p.x > cut);
  }

  isOverPit(worldX) {
    return this.pits.some((p) => worldX > p.x + 6 && worldX < p.x + p.w - 6);
  }
}
