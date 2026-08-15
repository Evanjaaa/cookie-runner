// src/level.js
import {
  GROUND_Y, LEVEL, VIEW, SHIELD, POTION, PHYSICS, BODY, SPEED, KIBBLE, SHRIMP, MAGNET, LETTER,
  SPEEDUP,
} from './config.js';

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
/** ดัชนีของเม็ดที่อยู่สูงที่สุดในกลุ่ม = ยอดส่วนโค้งกระโดด จุดที่พลาดง่ายที่สุด */
function topIndex(items) {
  // แถวตรงไม่มี "ยอด" ให้เล็ง เอาไว้กลางแถวสวยกว่าไปกองที่เม็ดแรกทุกครั้ง
  if (items.every((it) => Math.abs(it.y - items[0].y) < 1)) {
    return Math.floor(items.length / 2);
  }
  let top = 0;
  items.forEach((it, i) => { if (it.y < items[top].y) top = i; });
  return top;
}

/**
 * วางกุ้งทองหนึ่งตัวที่ยอดส่วนโค้ง — ตัวเดียวต่อท่อนเท่านั้น
 * ถ้าวางหลายตัวจะหมดความรู้สึก "เจอของดี" ซึ่งเป็นเหตุผลเดียวที่ของชิ้นนี้มีอยู่
 *
 * แล้วเอาเม็ดที่อยู่ใกล้เกินไปออก เพราะกุ้งกว้างเกือบสามเท่าของปลา
 * ถ้าปล่อยไว้จะซ้อนทับกันจนดูรกและอ่านไม่ออกว่าอันไหนเป็นอันไหน
 * คืน array ใหม่ ผู้เรียกต้องเอาค่าที่คืนไปใช้ ไม่ใช่ของเดิม
 */
function makeShrimp(items) {
  if (!items.length) return items;
  const gold = items[topIndex(items)];
  gold.kind = 'shrimp';
  return items.filter((it) => it === gold || Math.abs(it.x - gold.x) >= SHRIMP.minGap);
}

function makeKibble(items, style) {
  if (!items.length) return;

  if (style === 'cluster') {
    const top = topIndex(items);
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

// ─────────────────────────────────────────────────────────────
// แถวยาวแบบวิ่งเก็บ — ไม่ต้องกระโดด ใช้เป็นช่วงพักระหว่างด่านที่ต้องใช้ฝีมือ
//
// RUN_Y คือกลางกล่องชนตอนยืนพอดี วางตรงนี้ = เก็บได้ 100% แค่วิ่งผ่าน
// ระยะเก็บจริงคือ fishR + 22 = 33px ทุกเม็ดจึงต้องอยู่ห่างจาก RUN_Y
// ไม่เกินค่านี้ ไม่งั้นจะมีเม็ดที่ตาเห็นว่าอยู่ในแถวแต่เก็บไม่ได้
// ซึ่งเป็นความรู้สึกที่แย่ที่สุดของเกมแนวนี้
// ─────────────────────────────────────────────────────────────
const RUN_Y = GROUND_Y - BODY.standH / 2;
/** เผื่อขอบไว้จากรัศมีเก็บจริง กันพลาดตอนเฟรมตกหรือ dt กระโดด */
const RUN_REACH = 26;

/** แถวตรงยาว ๆ ระดับกลางตัว */
function fishRun(x, count, gap = 34) {
  return Array.from({ length: count }, (_, i) => ({
    x: x + i * gap,
    y: RUN_Y,
    r: fishR,
    got: false,
    kind: 'fish',
  }));
}

/**
 * แถวคลื่นเป็นลูกคลื่นเตี้ย ๆ — โค้งขึ้นอย่างเดียว ไม่ลงต่ำกว่า RUN_Y
 * ถ้าให้แกว่งลงด้วย เม็ดล่างจะจมหายไปกับพื้นจนดูเหมือนวางผิด
 */
function fishWave(x, count, gap = 34, humps = 3, amp = RUN_REACH) {
  return Array.from({ length: count }, (_, i) => ({
    x: x + i * gap,
    y: RUN_Y - Math.abs(Math.sin((i / (count - 1)) * Math.PI * humps)) * amp,
    r: fishR,
    got: false,
    kind: 'fish',
  }));
}

/**
 * ส่วนโค้งกระโดดเฉพาะ "ช่วงบน" — ตัดช่วงที่ยังอยู่ใกล้พื้นออก
 * ใช้เวลาวางซ้อนเหนือแถวล่าง จะได้ไม่ไปทับกันจนดูรก
 * clearance คือระยะที่ต้องสูงกว่าเส้นวิ่งเป็นอย่างน้อย
 */
function fishAbove(path, x, count, clearance) {
  const usable = path.filter((p) => p.y < RUN_Y - clearance);
  return Array.from({ length: count }, (_, i) => {
    const p = usable[Math.round((i / (count - 1)) * (usable.length - 1))];
    return { x: x + p.dx, y: p.y, r: fishR, got: false, kind: 'fish' };
  });
}

/**
 * แถวพื้นตั้งแต่ x ไปจนเกือบถึง endX
 * ใช้เป็น "ทางวิ่ง" นำสายตาเข้าสู่จุดกระโดด — เม็ดสุดท้ายคือสัญญาณว่าให้กดตรงนี้
 * แถมยังกันไม่ให้พื้นด้านล่างส่วนโค้งโล่งจนองค์ประกอบดูเบี้ยว
 */
function fishRunTo(x, endX, gap = 34) {
  return fishRun(x, Math.max(0, Math.floor((endX - x) / gap)), gap);
}

/** ชั้นกลาง — กระโดดเดี่ยวถึง */
const arcMid = (x, count) => fishAbove(JUMP, x, count, 48);
/** ชั้นบนสุด — ต้องกระโดดสองชั้นเท่านั้น clearance สูงพอให้แยกจากชั้นกลางชัด */
const arcHigh = (x, count) => fishAbove(JUMP_DBL, x, count, 132);

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
  (x) => ({
    obs: [], pit: [],
    fish: [...fishRunTo(x + 40, x + 260), ...fishJump(x + 260, 11)],
    jumps: [x + 260],
  }),

  // 1 — หนามเดี่ยวกลางส่วนโค้ง
  (x) => {
    const j = x + 230;
    return {
      obs: [groundSpike(j + HALF - spike.w / 2)],
      pit: [],
      fish: [...fishRunTo(x + 40, j), ...fishJump(j, 11)],
      jumps: [j],
    };
  },

  // 2 — คานเตี้ย ต้องหมอบลอด ปลาเรียงต่ำใต้คาน
  (x) => ({
    obs: [lowBar(x + 300)],
    pit: [],
    fish: [...fishRunTo(x + 40, x + 260), ...fishLow(x + 308, 8, 32)],
    jumps: [],
  }),

  // 3 — หลุมเดี่ยว ปากหลุมอยู่กลางส่วนโค้ง
  (x) => {
    const j = x + 240;
    return {
      obs: [],
      pit: [{ x: j + HALF - 66, w: 132 }],
      fish: [...fishRunTo(x + 40, j), ...fishJump(j, 11)],
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
      fish: [...fishRunTo(x + 30, j), ...fishJump(j, 10), ...fishLow(barX + 8, 7, 32)],
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
      fish: [...fishRunTo(x + 30, j1), ...fishJump(j1, 10), ...fishJump(j2, 10)],
      jumps: [j1, j2],
    };
  },

  // 6 — หนามคู่ชิด กระโดดทีเดียวข้ามทั้งคู่
  (x) => {
    const j = x + 240;
    return {
      obs: [groundSpike(j + HALF - 46), groundSpike(j + HALF + 14)],
      pit: [],
      fish: [...fishRunTo(x + 40, j), ...fishJump(j, 11)],
      jumps: [j],
    };
  },

  // 7 — กล่องซ้อนสามชั้น สูง 156px เกินเพดานกระโดดเดี่ยว (ได้แค่ 134px)
  //     จึงบังคับให้กดกระโดดครั้งที่สองกลางอากาศเท่านั้นถึงจะข้ามได้
  //
  //     เดิมใช้ส่วนโค้งเต็มใบ ซึ่งลากยาวลงไปจรดพื้นทั้งสองข้างจนดูเป็นเส้นเฉียง
  //     ไม่เป็นซุ้มโค้ง แถมพื้นใต้ส่วนโค้งโล่งเปล่า องค์ประกอบเลยดูเบี้ยว
  //     ตอนนี้ตัดหางล่างทิ้ง เหลือเฉพาะซุ้มเหนือกล่อง แล้วเอาแถวพื้นมาเติมแทน
  (x) => {
    const j = x + 300;
    const crateX = j + DBL_PEAK - crate.w / 2;
    const landing = j + DBL_SPAN;
    return {
      obs: [crateStack(crateX, 3)],
      pit: [],
      fish: [
        ...fishRunTo(x + 60, j),               // ทางวิ่งนำเข้าจุดกด
        ...fishAbove(JUMP_DBL, j, 11, 55),     // ซุ้มโค้งเหนือกล่อง
        ...fishRunTo(landing + 20, landing + 250),   // แถวพื้นต่อหลังลงพื้น
      ],
      jumps: [j, j + DOUBLE_AT * SPEED.run],
      width: 300 + DBL_SPAN + 320,
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
      fish: [...fishRunTo(x + 20, js[0]), ...js.flatMap((j) => fishJump(j, 9))],
      jumps: js,
      width: step * 2 + JUMP_SPAN + 250,
    };
  },

  // 9 — แถวตรงยาวมาก ทางโล่งล้วน ๆ ช่วงพักที่ได้คะแนนเป็นกอบเป็นกำ
  //     ยาวกว่า chunkW ปกติ จึงต้องประกาศ width เอง
  (x) => ({
    obs: [],
    pit: [],
    fish: fishRun(x + 150, 32),
    jumps: [],
    width: 150 + 32 * 34 + 130,
  }),

  // 10 — แถวคลื่นสามลูก สวยกว่าแถวตรงแต่ยังเก็บได้ครบโดยไม่ต้องกระโดด
  (x) => ({
    obs: [],
    pit: [],
    fish: fishWave(x + 150, 18),
    jumps: [],
  }),

  // 11 — วิ่งเก็บแถวตรงก่อน แล้วต่อด้วยส่วนโค้งข้ามหนาม
  //      ผสมช่วงพักกับช่วงใช้ฝีมือไว้ในท่อนเดียว
  (x) => {
    const j = x + 470;
    return {
      obs: [groundSpike(j + HALF - spike.w / 2)],
      pit: [],
      fish: [...fishRun(x + 140, 9), ...fishJump(j, 9)],
      jumps: [j],
    };
  },

  // 12 — สองชั้น: แถวยาวชั้นล่าง + ส่วนโค้งชั้นบนสามชุด
  //
  //      ตั้งใจให้ "เก็บไม่หมด" — ตอนลอยขึ้นไปกวาดชั้นบน ตัวจะพ้นระยะเก็บ
  //      ของชั้นล่างพอดี เม็ดที่อยู่ใต้ตัวช่วงนั้นจึงหลุดไปเสมอ
  //      ผู้เล่นต้องเลือกเองว่ารอบนี้จะเอาชั้นไหน ไม่มีทางได้ทั้งคู่
  //
  //      ชั้นบนใช้ arcMid เพื่อบังคับให้ลอยสูงกว่าแถวล่างอย่างน้อย 48px
  //      ถ้าใช้ส่วนโค้งเต็มใบ ปลายโค้งจะลงมาทับแถวล่างจนแยกไม่ออกว่ามีสองชั้น
  (x) => {
    const step = JUMP_SPAN + 70;
    const js = [0, 1, 2, 3].map((i) => x + 210 + step * i);
    return {
      obs: [],
      pit: [],
      fish: [...fishRun(x + 150, 38), ...js.flatMap((j) => arcMid(j, 7))],
      jumps: js,
      partial: true,
      // ไม่กระโดดเลย = กวาดแถวพื้นได้ครบ พิสูจน์ว่าเม็ดที่หลุดตอนลอย
      // ไม่ได้วางไว้ในที่ที่ไปไม่ถึง แค่ต้องเลือกเอาอย่างใดอย่างหนึ่ง
      alt: [[]],
      width: 150 + 38 * 34 + 160,
    };
  },

  // 13 — สามชั้นแบบ "เลือกทางเดียว"
  //
  //      ต่างจากท่อน 12 ตรงที่ชั้นกลางกับชั้นบนอยู่ที่ตำแหน่ง x เดียวกัน
  //      กระโดดเดี่ยว = ได้ชั้นกลาง / กระโดดสองชั้น = ได้ชั้นบน
  //      เป็นไปไม่ได้ที่จะได้ทั้งคู่ในการกระโดดครั้งเดียว บวกกับแถวพื้นที่
  //      หลุดไประหว่างลอย ทำให้ท่อนนี้เก็บได้ราวครึ่งเดียวเท่านั้น
  //
  //      arcHigh ใช้ clearance 132 เพื่อให้ชั้นบนแยกจากชั้นกลางด้วยตาได้ชัด
  //      ไม่งั้นสองชั้นจะกองซ้อนกันจนดูเหมือนกลุ่มเดียว
  //
  //      alt = "เฉลยทางที่สอง" ให้ playtest เอาไปพิสูจน์ว่าชั้นบนก็เก็บได้จริง
  //      ไม่ใช่วางลอยไว้เฉย ๆ ในที่ที่ไปไม่ถึง
  (x) => {
    const js = [0, 1, 2].map((i) => x + 230 + (DBL_SPAN + 120) * i);
    return {
      obs: [],
      pit: [],
      fish: [
        ...fishRun(x + 150, 40),
        ...js.flatMap((j) => arcMid(j, 7)),
        ...js.flatMap((j) => arcHigh(j, 8)),
      ],
      jumps: js,
      // สามวิธีเล่นที่เป็นไปได้ รวมกันแล้วต้องครอบคลุมทุกเม็ดในท่อน
      //   [] = ไม่กระโดด กวาดแถวพื้น | js = กระโดดเดี่ยว เอาชั้นกลาง
      //   js×2 = กระโดดสองชั้น เอาชั้นบน
      alt: [[], js.flatMap((j) => [j, j + DOUBLE_AT * SPEED.run])],
      partial: true,
      width: 150 + 40 * 34 + 170,
    };
  },
];

// ─────────────────────────────────────────────────────────────
// ลำดับท่อนของแต่ละด่านอยู่ใน stages.js ไม่ได้อยู่ที่นี่
// ไฟล์นี้รู้แค่ "วิธีสร้างท่อน" ส่วน "จะสร้างท่อนไหนตามลำดับใด" เป็นเรื่องของด่าน
// แยกกันแบบนี้เพื่อให้เพิ่มด่านใหม่ได้โดยไม่ต้องแตะไฟล์นี้เลย
//
// รูปแบบของแต่ละรายการใน route:
//   p       = ดัชนีแพตเทิร์นใน PATTERNS
//   kibble  = 'cluster' | 'alternate' ใส่เม็ดกลมแบบไหน
//   shrimp  = วางกุ้งทอง (ทับ kibble ถ้าใส่พร้อมกัน)
//   shield  = วางโล่กลางท่อน
//   magnet  = วางแม่เหล็ก
// ─────────────────────────────────────────────────────────────
export class Level {
  constructor(route = []) {
    this.route = route;
    // Game เป็นคนบอกว่าตัวอักษรถัดไปคือตัวไหน คืน null = ไม่ต้องวาง
    this.nextLetter = () => null;
    this.reset();
  }

  /** ส่ง route ใหม่เข้ามาเมื่อเปลี่ยนด่าน ไม่ส่งก็ใช้ของเดิม */
  reset(route) {
    if (route) this.route = route;
    this.obstacles = [];
    this.fishes = [];
    this.pits = [];
    this.shields = [];
    this.potions = [];
    this.magnets = [];
    this.letters = [];
    this.nips = [];
    this.nextChunkX = 900;   // เว้นที่ว่างตอนเริ่มเกม
    this.chunkIndex = 0;
  }

  spawnChunk() {
    if (!this.route.length) return;   // ยังไม่ได้ตั้งด่าน อย่าสร้างอะไรทั้งนั้น

    // วนด่านซ้ำเมื่อจบลำดับ — endless runner จึงยังวิ่งต่อได้ไม่รู้จบ
    // แต่เส้นทางเหมือนเดิมทุกรอบ ผู้เล่นจำได้และทำสถิติแข่งกับตัวเองได้
    const step = this.route[this.chunkIndex % this.route.length];

    const c = PATTERNS[step.p](this.nextChunkX);
    // แพตเทิร์นยาว ๆ ประกาศ width เองได้ ไม่งั้นเนื้อหาจะล้นไปทับท่อนถัดไป
    const w = c.width || chunkW;

    // กุ้งมาก่อนเม็ดกลมเสมอ ท่อนที่มีกุ้งแล้วจะไม่ใส่เม็ดกลมทับ
    // ไม่งั้นของเด่นสองอย่างอยู่ในแนวเดียวกันแล้วแย่งสายตากันเอง
    if (step.shrimp) c.fish = makeShrimp(c.fish);   // คืน array ใหม่ที่ตัดเม็ดใกล้กุ้งออกแล้ว
    else if (step.kibble) makeKibble(c.fish, step.kibble);

    this.obstacles.push(...c.obs);
    this.pits.push(...c.pit);
    this.fishes.push(...c.fish);

    if (step.shield) {
      this.shields.push({
        x: this.nextChunkX + w / 2,
        y: SHIELD.y,
        r: SHIELD.r,
        got: false,
      });
    }

    // ต้องเรียกหลัง push obstacles/pits/fishes แล้วเท่านั้น
    // ไม่งั้น spawnMagnet จะหาที่โล่งจากข้อมูลที่ยังว่างอยู่แล้วได้จุดผิด
    if (step.magnet) this.spawnMagnet(this.nextChunkX, w);
    if (step.letter) this.spawnLetter(this.nextChunkX, w);
    if (step.nip) this.spawnNip(this.nextChunkX, w);

    this.nextChunkX += w;
    this.chunkIndex++;
  }

  /** เติมท่อนล่วงหน้าเสมอ ไม่ให้ผู้เล่นวิ่งไปเจอที่ว่าง */
  ensureAhead(camera) {
    // กันลูปไม่รู้จบ: ถ้าไม่มี route แล้ว spawnChunk ไม่ขยับ nextChunkX เลย
    if (!this.route.length) return;
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
  isClearSpot(x, pad = POTION.clearance) {
    const near = (ox, ow) => x + pad > ox && x - pad < ox + ow;
    return (
      !this.pits.some((p) => near(p.x, p.w)) &&
      !this.obstacles.some((o) => near(o.x, o.w))
    );
  }

  /**
   * วางแม่เหล็กในท่อนที่เพิ่งสร้าง
   *
   * เดิมวางที่ 45% ของท่อนตายตัว ซึ่งพังได้สองแบบ:
   *   - ไปจมอยู่กลางกล่องลังซ้อนสามชั้น (กินพื้นที่ y 188-320 คร่อมระดับ 228 พอดี)
   *   - ไปลอยเหนือหลุม ต้องกระโดดข้ามหลุมพร้อมเก็บในจังหวะเดียว
   *
   * ตอนนี้ไล่หาทุกจุดที่พ้นสิ่งกีดขวางก่อน แล้วเลือกจุดที่ "ห่างจากปลามากที่สุด"
   * เพื่อไม่ให้ไปทับแนวปลาที่จัดเรียงไว้แล้ว
   */
  spawnMagnet(from, w) {
    // กรองปลาเฉพาะในท่อนนี้ก่อน ไม่งั้นต้องวนทั้งด่านซึ่งโตขึ้นเรื่อย ๆ
    const local = this.fishes.filter((f) => f.x > from && f.x < from + w);

    let best = null;
    for (let x = from + 90; x < from + w - 90; x += 20) {
      if (!this.isClearSpot(x, MAGNET.clearance)) continue;
      let nearest = Infinity;
      for (const f of local) {
        const d = Math.hypot(f.x - x, f.y - MAGNET.y);
        if (d < nearest) nearest = d;
      }
      if (!best || nearest > best.nearest) best = { x, nearest };
    }

    // ท่อนแน่นจนไม่มีที่โล่งเลยก็ไม่ต้องมีแม่เหล็กท่อนนี้ ดีกว่าวางทับของอื่น
    if (best) {
      this.magnets.push({ x: best.x, y: MAGNET.y, r: MAGNET.r, got: false });
    }
  }

  /**
   * วางตัวอักษรหนึ่งตัวในท่อน
   *
   * ดัชนีตัวอักษรมาจาก nextLetter() ที่ Game ส่งเข้ามา ไม่ได้นับเองในนี้
   * เพราะ "ตัวถัดไปที่ต้องเก็บ" เป็นข้อมูลของรอบเล่น ไม่ใช่ของด่าน
   * ถ้านับเองจะเดินหน้าเรื่อย ๆ แม้ผู้เล่นเก็บไม่ทัน แล้วเก็บครบไม่ได้เลย
   */
  /** ต้นหญ้าแมว — หาที่โล่งเหมือนแม่เหล็ก แต่เริ่มไล่จากคนละจุดกันไม่ให้ทับกัน */
  spawnNip(from, w) {
    for (let x = from + 200; x < from + w - 100; x += 20) {
      if (!this.isClearSpot(x, SPEEDUP.clearance)) continue;
      this.nips.push({ x, y: SPEEDUP.y, r: SPEEDUP.r, got: false });
      return;
    }
  }

  spawnLetter(from, w) {
    const idx = this.nextLetter();
    if (idx === null) return;   // เก็บครบแล้ว หรือกำลังอยู่ในโบนัส

    for (let x = from + 120; x < from + w - 120; x += 20) {
      if (!this.isClearSpot(x, LETTER.clearance)) continue;
      this.letters.push({ x, y: LETTER.y, r: LETTER.r, idx, got: false });
      return;
    }
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
    this.magnets = this.magnets.filter((m) => m.x > cut);
    this.letters = this.letters.filter((l) => l.x > cut);
    this.nips = this.nips.filter((n) => n.x > cut);
  }

  isOverPit(worldX) {
    return this.pits.some((p) => worldX > p.x + 6 && worldX < p.x + p.w - 6);
  }
}
