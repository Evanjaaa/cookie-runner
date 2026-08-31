// src/level.js
import {
  GROUND_Y, LEVEL, VIEW, SHIELD, POTION, PHYSICS, BODY, SPEED, KIBBLE, SHRIMP, MAGNET, LETTER,
  SPEEDUP, FALLER, HAZARD, PLAYER_X,
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

/**
 * ความกว้างหลุมของด่านอวกาศ — ต้อง "กระโดดเดี่ยวไม่พ้นแน่นอน" แต่ "สองชั้นพ้นสบาย"
 *
 * กวาดค่าดูแล้วเลือก 256 เพราะสองเงื่อนไขนี้ดึงกันคนละทาง:
 *   230 → กระโดดเดี่ยวข้ามได้ 8px ผิดวัตถุประสงค์ของด่านทั้งด่าน
 *   240 → เดี่ยวพลาดแค่ 2px ซึ่งเฉียดจนผู้เล่นรู้สึกว่า "น่าจะรอด" = ไม่แฟร์
 *   256 → เดี่ยวพลาด 18px (เห็นชัดว่าไม่ถึง) หน้าต่างกดสองชั้นยังกว้าง 9.4 เฟรม
 *   280 → หน้าต่างเหลือ 5.8 เฟรม ซึ่งใกล้ค่าที่เคยลองแล้วบันทึกไว้ว่าเล่นไม่สนุก
 */
const GAP_W = 256;

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
  // 14 — หนามสามตัวเรียงจังหวะเท่ากัน
  //      เหมือนท่อน 8 แต่เป็นหนามซึ่งเตี้ยกว่ากล่อง กระโดดเดี่ยวพอ
  //      เว้น JUMP_SPAN + 80 คือลงพื้นแล้วมีเวลาตั้งหลักราว 12 เฟรม
  (x) => {
    const step = JUMP_SPAN + 80;
    const js = [0, 1, 2].map((i) => x + 140 + step * i);
    return {
      obs: js.map((j) => groundSpike(j + HALF - spike.w / 2)),
      pit: [],
      fish: [...fishRunTo(x + 20, js[0]), ...js.flatMap((j) => fishJump(j, 9))],
      jumps: js,
      width: step * 2 + JUMP_SPAN + 380,
    };
  },

  // 15 — คานสองอันเรียงติด ต้องหมอบค้างยาวลอดทีเดียวทั้งคู่
  //      ช่องว่างระหว่างคาน 90px = 13 เฟรม สั้นเกินกว่าจะลุกแล้วหมอบใหม่ทัน
  //      ท่อนนี้จึงสอนว่าปุ่มหมอบเอาไว้ "กดค้าง" ไม่ใช่กดเป็นจังหวะ
  (x) => {
    const b1 = x + 250;
    const b2 = b1 + bar.w + 90;
    return {
      obs: [lowBar(b1), lowBar(b2)],
      pit: [],
      fish: [
        ...fishRunTo(x + 40, x + 220),
        ...fishLow(b1 + 8, 6, 32),
        ...fishLow(b2 + 8, 6, 32),
      ],
      jumps: [],
      width: (b2 - x) + bar.w + 240,
    };
  },

  // 16 — หนามแล้วต่อด้วยหลุมทันที กระโดดสองจังหวะคนละแบบ
  //      จังหวะแรกข้ามของสูง จังหวะสองข้ามของกว้าง ระยะกดไม่เท่ากัน
  (x) => {
    const j1 = x + 180;
    const j2 = j1 + JUMP_SPAN + 110;
    return {
      obs: [groundSpike(j1 + HALF - spike.w / 2)],
      pit: [{ x: j2 + HALF - 60, w: 120 }],
      fish: [...fishRunTo(x + 30, j1), ...fishJump(j1, 10), ...fishJump(j2, 10)],
      jumps: [j1, j2],
      width: (j2 - x) + JUMP_SPAN + 260,
    };
  },

  // 17 — กล่องซ้อนสองชั้นแล้วคาน กระโดดข้ามแล้วรีบหมอบ
  //      สองชั้นสูง 88px ยังต่ำกว่าเพดานกระโดดเดี่ยว (134px) จึงไม่ต้องกระโดดสองชั้น
  (x) => {
    const j = x + 200;
    const barX = j + JUMP_SPAN + 150;
    return {
      obs: [crateStack(j + HALF - crate.w / 2, 2), lowBar(barX)],
      pit: [],
      fish: [...fishRunTo(x + 30, j), ...fishJump(j, 10), ...fishLow(barX + 8, 7, 32)],
      jumps: [j],
      width: (barX - x) + bar.w + 260,
    };
  },

  // 18 — คานแล้วหนาม สลับจากหมอบเป็นกระโดด
  //      ตรงข้ามกับท่อน 4 ที่กระโดดก่อนแล้วค่อยหมอบ
  //      ช่วงพักระหว่างสองท่า 120px = 18 เฟรม พอให้ลุกแล้วกดกระโดดทัน
  (x) => {
    const barX = x + 220;
    const j = barX + bar.w + 120;
    return {
      obs: [lowBar(barX), groundSpike(j + HALF - spike.w / 2)],
      pit: [],
      fish: [...fishLow(barX + 8, 7, 32), ...fishJump(j, 10)],
      jumps: [j],
      width: (j - x) + JUMP_SPAN + 260,
    };
  },

  // ── 19-22 · ชุดถ้ำคริสตัล: อุโมงค์เพดานต่ำ ──────────────────
  //
  // กริยาหลักของถ้ำคือ "หมอบค้าง" ไม่ใช่ "หมอบทีละครั้ง" แบบท่อน 2
  // ทำได้ด้วยการวางคานติดกันเป็นแนวยาว ช่องใต้คานสูง 34px เท่าเดิมทุกใบ
  // (bar.top 232 + h 54 = 286 / GROUND_Y 320) กล่องชนจึงไม่เปลี่ยนเลย
  // สิ่งที่เปลี่ยนคือ "ต้องกดค้างนานแค่ไหน" ซึ่งเป็นอินพุตคนละแบบกับแมพอื่น
  //
  // ผู้เล่นลุกกลางอุโมงค์ไม่ได้ ต้องหมอบยาวจนพ้น จึงต้องโรยปลาไว้ใต้คานตลอดแนว
  // ให้เห็นว่า "ยังไม่จบ อย่าเพิ่งลุก"

  // 19 — อุโมงค์สั้น สองใบติด (~340px ≈ 50 เฟรม) ใช้สอนก่อนเจอของยาว
  (x) => {
    const a = x + 240;
    return {
      obs: [lowBar(a), lowBar(a + bar.w)],
      pit: [],
      fish: [...fishRunTo(x + 40, a), ...fishLow(a + 10, 10, 32)],
      jumps: [],
      width: (a - x) + bar.w * 2 + 240,
    };
  },

  // 20 — อุโมงค์ยาว สามใบติด (~510px ≈ 75 เฟรม) หมอบค้างจริงจัง
  (x) => {
    const a = x + 220;
    return {
      obs: [lowBar(a), lowBar(a + bar.w), lowBar(a + bar.w * 2)],
      pit: [],
      fish: [...fishRunTo(x + 40, a), ...fishLow(a + 10, 15, 32)],
      jumps: [],
      width: (a - x) + bar.w * 3 + 260,
    };
  },

  // 21 — อุโมงค์คั่นช่องหายใจ: สองใบ → เว้น 150px → สองใบ
  //      ช่องกลางกว้างพอให้ลุกหายใจหนึ่งจังหวะ แต่ไม่พอให้กระโดด
  //      เป็นท่อนที่หลอกให้ลุกแล้วต้องรีบหมอบใหม่
  (x) => {
    const a = x + 210;
    const b = a + bar.w * 2 + 150;
    return {
      obs: [lowBar(a), lowBar(a + bar.w), lowBar(b), lowBar(b + bar.w)],
      pit: [],
      fish: [
        ...fishRunTo(x + 40, a),
        ...fishLow(a + 10, 10, 32),
        ...fishLow(b + 10, 10, 32),
      ],
      jumps: [],
      width: (b - x) + bar.w * 2 + 240,
    };
  },

  // 22 — หนามก่อนปากอุโมงค์ ต้องกระโดดข้ามแล้วลงมาหมอบทันที
  //      ระยะจากจุดลงถึงปากอุโมงค์ = 110px ≈ 16 เฟรม พอให้เปลี่ยนท่าทัน
  (x) => {
    const j = x + 190;
    const a = j + JUMP_SPAN + 110;
    return {
      obs: [groundSpike(j + HALF - spike.w / 2), lowBar(a), lowBar(a + bar.w)],
      pit: [],
      fish: [...fishRunTo(x + 30, j), ...fishJump(j, 10), ...fishLow(a + 10, 10, 32)],
      jumps: [j],
      width: (a - x) + bar.w * 2 + 240,
    };
  },

  // ── 23-25 · ชุดห้วงอวกาศ: ช่องว่างที่กระโดดชั้นเดียวไม่พอ ──────
  //
  // กริยาหลักของอวกาศคือ "บริหารเวลาลอย" — ทุกหลุมกว้างเกินกระโดดเดี่ยว
  // ผู้เล่นจึงต้องกดสองครั้งทุกครั้ง และครั้งที่สองต้องกดให้ตรงจังหวะด้วย
  //
  // ── ตัวเลขที่ใช้ตัดสินความกว้าง ──
  //   กระโดดเดี่ยว  ข้ามได้ 238px
  //   กระโดดสองชั้น ข้ามได้ 320px
  // เลือก 240 เพราะเกินกระโดดเดี่ยวแน่นอน (ต่อให้กดตรงเป๊ะก็ไม่ถึง)
  // แต่ยังเหลือระยะเผื่อหัวท้ายข้างละ 40px สำหรับกระโดดสองชั้น
  // กว้างกว่านี้ระยะเผื่อจะหายจนต้องกดเป๊ะทั้งสองจังหวะ ซึ่งไม่สนุก
  //
  // ปลาเรียงตามเส้นโค้งกระโดดสองชั้น (fishDouble) เม็ดที่ลอยสูงกว่าแนวปกติ
  // คือสัญญาณบอกในตัวว่า "หลุมนี้ต้องกดสองที" ไม่ต้องมีป้ายบอก

  // 23 — หลุมกว้างเดี่ยว ท่อนสอนของอวกาศ
  (x) => {
    const j = x + 230;
    return {
      obs: [],
      pit: [{ x: j + (DBL_SPAN - GAP_W) / 2, w: GAP_W }],
      fish: [...fishRunTo(x + 40, j), ...fishDouble(j, 12)],
      jumps: [j],
      width: (j - x) + DBL_SPAN + 260,
    };
  },

  // 24 — หลุมกว้างสองหลุมติด ต้องกดสองชั้นสองรอบต่อเนื่อง
  //      เว้นพื้นระหว่างหลุม 150px ≈ 22 เฟรม พอให้ตั้งหลักกดรอบใหม่
  (x) => {
    const j1 = x + 190;
    const j2 = j1 + DBL_SPAN + 150;
    return {
      obs: [],
      pit: [
        { x: j1 + (DBL_SPAN - GAP_W) / 2, w: GAP_W },
        { x: j2 + (DBL_SPAN - GAP_W) / 2, w: GAP_W },
      ],
      fish: [...fishRunTo(x + 30, j1), ...fishDouble(j1, 11), ...fishDouble(j2, 11)],
      jumps: [j1, j2],
      width: (j2 - x) + DBL_SPAN + 260,
    };
  },

  // 25 — หลุมกว้างแล้วต่อด้วยคานเตี้ยทันที ลงจากอากาศแล้วต้องหมอบเลย
  //      ระยะจากขอบหลุมถึงคาน 150px ≈ 22 เฟรม พอให้เปลี่ยนท่าทัน
  (x) => {
    const j = x + 200;
    const barX = j + DBL_SPAN + 150;
    return {
      obs: [lowBar(barX)],
      pit: [{ x: j + (DBL_SPAN - GAP_W) / 2, w: GAP_W }],
      fish: [...fishRunTo(x + 30, j), ...fishDouble(j, 11), ...fishLow(barX + 8, 7, 32)],
      jumps: [j],
      width: (barX - x) + bar.w + 240,
    };
  },

  // ── 26-28 · ชุดทุ่งหิมะ: สลับท่าเร็ว ───────────────────────────
  //
  // กริยาหลักของหิมะคือ "สลับกระโดด↔หมอบถี่ ๆ" ต่างจากถ้ำที่หมอบค้างยาว
  // และต่างจากอวกาศที่กระโดดอย่างเดียว — เป็นแมพที่นิ้วต้องขยับมากที่สุด
  //
  // ระยะระหว่างของแต่ละชิ้นใช้ 130px ≈ 19 เฟรม ซึ่งอยู่ในช่วงที่โค้ดเดิม
  // พิสูจน์แล้วว่าเปลี่ยนท่าทัน (ท่อน 4 ใช้ 140 / ท่อน 18 ใช้ 120)
  // สั้นกว่านี้จะกลายเป็นบังคับให้กดถูกตั้งแต่ครั้งแรกโดยไม่มีเวลาแก้ตัว

  // 26 — กระโดด → หมอบ → กระโดด
  (x) => {
    const j1 = x + 170;
    const barX = j1 + JUMP_SPAN + 130;
    const j2 = barX + bar.w + 130;
    return {
      obs: [
        groundSpike(j1 + HALF - spike.w / 2),
        lowBar(barX),
        groundSpike(j2 + HALF - spike.w / 2),
      ],
      pit: [],
      fish: [
        ...fishRunTo(x + 30, j1), ...fishJump(j1, 9),
        ...fishLow(barX + 8, 6, 32), ...fishJump(j2, 9),
      ],
      jumps: [j1, j2],
      width: (j2 - x) + JUMP_SPAN + 240,
    };
  },

  // 27 — หมอบ → กระโดด → หมอบ (สลับขั้วจากท่อน 26)
  (x) => {
    const b1 = x + 230;
    const j = b1 + bar.w + 130;
    const b2 = j + JUMP_SPAN + 130;
    return {
      obs: [lowBar(b1), groundSpike(j + HALF - spike.w / 2), lowBar(b2)],
      pit: [],
      fish: [
        ...fishRunTo(x + 30, b1), ...fishLow(b1 + 8, 6, 32),
        ...fishJump(j, 9), ...fishLow(b2 + 8, 6, 32),
      ],
      jumps: [j],
      width: (b2 - x) + bar.w + 240,
    };
  },

  // 28 — สลับสี่จังหวะรวด ท่อนที่หนักที่สุดของหิมะ
  (x) => {
    const j1 = x + 160;
    const b1 = j1 + JUMP_SPAN + 130;
    const j2 = b1 + bar.w + 130;
    const b2 = j2 + JUMP_SPAN + 130;
    return {
      obs: [
        groundSpike(j1 + HALF - spike.w / 2),
        lowBar(b1),
        groundSpike(j2 + HALF - spike.w / 2),
        lowBar(b2),
      ],
      pit: [],
      fish: [
        ...fishRunTo(x + 24, j1), ...fishJump(j1, 8),
        ...fishLow(b1 + 8, 6, 32), ...fishJump(j2, 8),
        ...fishLow(b2 + 8, 6, 32),
      ],
      jumps: [j1, j2],
      width: (b2 - x) + bar.w + 240,
    };
  },
];

// ─────────────────────────────────────────────────────────────
// ชนิดกับความยากของแต่ละท่อน — ใช้ให้ตัวประกอบเส้นทางเลือกได้อย่างมีกฎ
//
// ทำไมต้องมี: ของเดิม route ของแต่ละด่านเป็นลำดับที่เขียนมือตายตัว 20 ท่อน
// ทุกตาจึงเจอเส้นทางเดิมเป๊ะ และการจะทำให้ด่านหนึ่ง "ยากขึ้นเรื่อย ๆ" ต้องนั่งเรียงเอง
//
// kind ใช้ตอบว่าท่อนนี้ทำหน้าที่อะไรในจังหวะของด่าน:
//   safe      พื้นโล่ง ให้หายใจ ไม่มีอะไรต้องหลบ
//   obstacle  ของขวางมาตรฐาน หนึ่งจังหวะ
//   challenge ต้องต่อสองท่าขึ้นไป หรือพลาดแล้วเจ็บแน่
//   recovery  มีของให้เก็บเยอะ ไว้ต่อหลังท่อนโหด
// diff 1-5 ใช้คุมเส้นความยากของทั้งฉาก
// ─────────────────────────────────────────────────────────────
export const PATTERN_META = [
  { kind: 'safe', diff: 1 },        // 0  ทางเรียบ
  { kind: 'obstacle', diff: 2 },    // 1  หนามเดี่ยว
  { kind: 'obstacle', diff: 2 },    // 2  คานเตี้ย
  { kind: 'obstacle', diff: 2 },    // 3  หลุมเดี่ยว
  { kind: 'challenge', diff: 4 },   // 4  กระโดดแล้วหมอบ
  { kind: 'challenge', diff: 4 },   // 5  สองหลุมติด
  { kind: 'obstacle', diff: 3 },    // 6  หนามคู่
  { kind: 'obstacle', diff: 3 },    // 7
  { kind: 'obstacle', diff: 3 },    // 8
  { kind: 'recovery', diff: 2 },    // 9
  { kind: 'obstacle', diff: 3 },    // 10
  { kind: 'challenge', diff: 4 },   // 11
  { kind: 'recovery', diff: 2 },    // 12
  { kind: 'obstacle', diff: 3 },    // 13
  { kind: 'challenge', diff: 4 },   // 14
  { kind: 'challenge', diff: 5 },   // 15
  { kind: 'obstacle', diff: 3 },    // 16
  { kind: 'challenge', diff: 4 },   // 17
  { kind: 'challenge', diff: 4 },   // 18
  { kind: 'obstacle', diff: 2 },    // 19 อุโมงค์สั้น
  { kind: 'challenge', diff: 4 },   // 20 อุโมงค์ยาว
  { kind: 'challenge', diff: 5 },   // 21 อุโมงค์คั่นช่องหายใจ
  { kind: 'challenge', diff: 5 },   // 22 กระโดดแล้วเข้าอุโมงค์
  { kind: 'obstacle', diff: 3 },    // 23 หลุมกว้างเดี่ยว (ท่อนสอนของอวกาศ)
  { kind: 'challenge', diff: 5 },   // 24 หลุมกว้างสองหลุมติด
  { kind: 'challenge', diff: 4 },   // 25 หลุมกว้างแล้วต่อคาน
  { kind: 'challenge', diff: 4 },   // 26 กระโดด-หมอบ-กระโดด
  { kind: 'challenge', diff: 4 },   // 27 หมอบ-กระโดด-หมอบ
  { kind: 'challenge', diff: 5 },   // 28 สลับสี่จังหวะรวด
];

/**
 * ประกอบเส้นทางหนึ่งฉากจาก "โควตาชนิดท่อน" แทนการเขียนลำดับมือ
 *
 * กฎกันด่านโหด — สามข้อนี้คือเหตุผลที่ต้องมีตัวประกอบ ไม่ใช่สุ่มดิบ ๆ:
 *   1. ท่อนแรกเป็น safe เสมอ ผู้เล่นต้องได้ตั้งหลักก่อนเจอของ
 *   2. challenge ติดกันได้ไม่เกินสองท่อน ท่อนที่สามต้องเป็นอย่างอื่น
 *   3. หลัง challenge ทุกครั้งต้องมี recovery หรือ safe ตามมาอย่างน้อยหนึ่งท่อน
 *
 * @param pool   ดัชนีแพตเทิร์นที่ด่านนี้ใช้ได้ (แต่ละด่านมีคลังของตัวเอง)
 * @param count  จำนวนท่อนที่ต้องการ
 * @param rnd    ฟังก์ชันสุ่ม 0-1 ส่งเข้ามาได้เพื่อให้เทสซ้ำได้
 */
export function composeRoute(pool, count = 20, rnd = Math.random) {
  const byKind = (k) => pool.filter((p) => PATTERN_META[p].kind === k);
  const safe = byKind('safe');
  const recovery = byKind('recovery');
  const obstacle = byKind('obstacle');
  const challenge = byKind('challenge');

  // ด่านที่คลังไม่ครบทุกชนิด ให้ยืมชนิดที่ใกล้เคียงแทนการล้ม
  const pick = (arr, fallback) => {
    const src = arr.length ? arr : fallback;
    return src[Math.floor(rnd() * src.length)];
  };
  const anyOf = pool;

  // ท่อนพักใช้ recovery กับ safe รวมกัน — ถ้านับเฉพาะ recovery ท่อนโล่งจะโผล่
  // แค่ท่อนแรกท่อนเดียวตลอดทั้งฉาก (วัดแล้วได้ safe 1 ต่อ 20 ท่อน) ซึ่งแน่นเกินไป
  const breather = [...recovery, ...safe];

  const out = [];
  let streak = 0;      // challenge ติดกันมากี่ท่อนแล้ว
  let owed = false;    // ค้างท่อนพักอยู่หรือเปล่า

  for (let i = 0; i < count; i++) {
    let p;
    if (i === 0) {
      p = pick(safe, anyOf);                       // กฎ 1
    } else if (owed) {
      p = pick(breather, anyOf);                   // กฎ 3
    } else if (streak >= 2) {
      p = pick(obstacle.length ? obstacle : breather, anyOf);   // กฎ 2
    } else {
      // ไต่ความยากตามตำแหน่งในฉาก ต้นฉากเจอของเบา ท้ายฉากเจอของหนัก
      // แทรกท่อนพักเป็นระยะด้วย ไม่งั้นทั้งฉากเป็นของขวางล้วนจนไม่มีจังหวะหายใจ
      const t = i / count;
      if (rnd() < 0.18) p = pick(breather, anyOf);
      else if (rnd() < 0.25 + t * 0.45) p = pick(challenge, obstacle);
      else p = pick(obstacle, anyOf);
    }

    const kind = PATTERN_META[p].kind;
    streak = kind === 'challenge' ? streak + 1 : 0;
    owed = kind === 'challenge' && streak >= 2;
    out.push({ p });
  }

  sprinklePickups(out, rnd);
  return out;
}

/**
 * โรยของเก็บลงบนลำดับท่อนที่สุ่มมาแล้ว
 *
 * ── ทำไมต้องมีขั้นนี้แยกต่างหาก ──
 * ตอนที่ยังเขียน route ด้วยมือ ของเก็บติดมากับแต่ละบรรทัดอยู่แล้ว
 * ({ p: 9, kibble: 'alternate', letter: true }) พอเปลี่ยนมาสุ่มลำดับท่อนเอง
 * ผลลัพธ์เหลือแค่ { p } ล้วน ๆ ของเก็บทั้งหมดจึงหายไปเงียบ ๆ ทั้งเกม —
 * ไม่มีตัวอักษร ไม่มีโล่ ไม่มีแม่เหล็ก ไม่มีเม็ดขนม กุ้ง หรือหญ้าเร่งสปีดเลย
 * ขั้นนี้คือขั้นที่เอากลับมา โดยคุมความถี่ให้เท่ากับของเดิมที่เคยปรับจนลงตัวแล้ว
 *
 * ความถี่ต่อ 20 ท่อน (นับจาก route เดิม): ตัวอักษร 5 / เม็ดขนม 5 / หญ้า 3
 * โล่ 2 / กุ้ง 2 / แม่เหล็ก 2
 */
function sprinklePickups(out, rnd) {
  const n = out.length;
  const isChallenge = (i) => PATTERN_META[out[i].p].kind === 'challenge';

  // เว้นท่อนแรกไว้เสมอ เป็นท่อนเปิดฉากที่ต้องโล่ง ๆ ให้ตั้งตัว
  const place = (every, set, avoidChallenge = false) => {
    for (let i = 1 + Math.floor(rnd() * 2); i < n; i += every) {
      let at = Math.min(n - 1, i + (rnd() < 0.5 ? 0 : 1));
      // ตัวอักษรกับของสำคัญไม่ควรไปตกอยู่กลางท่อนยาก ๆ จนเก็บไม่ได้จริง
      if (avoidChallenge && isChallenge(at)) {
        const alt = [at - 1, at + 1].find((k) => k > 0 && k < n && !isChallenge(k));
        if (alt !== undefined) at = alt;
      }
      set(out[at], at);
    }
  };

  place(4, (st) => { st.letter = true; }, true);
  place(4, (st, i) => { st.kibble = i % 2 ? 'cluster' : 'alternate'; });
  place(7, (st) => { st.nip = true; }, true);
  place(10, (st) => { st.shield = true; }, true);
  place(10, (st) => { st.magnet = true; }, true);
  // กุ้งเขียนทับเม็ดขนมใน spawnChunk จึงไม่วางซ้อนท่อนเดียวกัน จะได้ได้ของครบทั้งสองอย่าง
  place(10, (st) => { if (!st.kibble) st.shrimp = true; });
}

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

  /**
   * ทุกกองของที่แรงดูดจับได้ — จุดเดียวที่ต้องแก้เวลาเพิ่มไอเทมชนิดใหม่
   *
   * ก่อนหน้านี้ฝั่งเกมไล่ชื่อกองเอง (fishes กับ letters) ซึ่งแปลว่าทุกครั้ง
   * ที่เพิ่มไอเทมใหม่ ต้องไปนึกออกเองว่าต้องกลับมาเติมชื่อตรงนั้นด้วย
   * ย้ายมาไว้ที่นี่แล้วของใหม่จะถูกดูดตามไปเองโดยอัตโนมัติ
   */
  get pullables() {
    return [
      this.fishes, this.letters, this.nips,
      this.magnets, this.shields, this.potions,
    ];
  }

  /**
   * สลับไปลำดับท่อนของด่านย่อยถัดไป "กลางตา" โดยไม่ล้างของที่วางไว้แล้ว
   *
   * ห้ามใช้ reset() แทน — reset ล้างสิ่งกีดขวาง อาหาร และหลุมทิ้งทั้งหมด
   * ซึ่งกลางตาแปลว่าของที่แมวกำลังวิ่งเข้าหาจะหายวับต่อหน้า
   * ท่อนที่วางล่วงหน้าไปแล้วต้องอยู่ต่อจนวิ่งผ่านไปเอง ท่อนใหม่ค่อยเป็นของด่านใหม่
   *
   * chunkIndex กลับไปนับหนึ่งใหม่ ด่านใหม่จึงเริ่มจากท่อนอุ่นเครื่องของตัวเอง
   * ไม่ใช่โผล่กลางช่วงพีคของด่านก่อนหน้า
   */
  switchRoute(route, theme) {
    if (!route || !route.length) return;
    this.route = route;
    this.theme = theme;
    this.chunkIndex = 0;
  }

  /**
   * ลำดับท่อนของฉากหนึ่ง — ด่านที่ประกาศ pool ไว้จะได้เส้นทางสุ่มใหม่ทุกครั้ง
   * ส่วนด่านที่ยังเขียน route มือไว้ก็ใช้ของเดิมต่อไปเหมือนเดิมทุกประการ
   *
   * แยกเป็นเมธอดเพราะทั้ง reset() (ฉากแรกของตา) และ switchRoute() (ฉากถัดไป)
   * ต้องถามคำถามเดียวกันว่า "ด่านนี้ใช้เส้นทางแบบไหน"
   */
  static routeFor(stage) {
    return stage.pool ? composeRoute(stage.pool, stage.segments || 20) : stage.route;
  }

  /** ส่ง route ใหม่เข้ามาเมื่อเปลี่ยนด่าน ไม่ส่งก็ใช้ของเดิม */
  reset(route, theme) {
    if (route) this.route = route;
    if (theme) this.theme = theme;
    this.obstacles = [];
    this.fishes = [];
    this.pits = [];
    this.shields = [];
    this.potions = [];
    this.magnets = [];
    this.letters = [];
    this.nips = [];
    this.fallers = [];       // ของร่วงจากเพดาน เป็นอันตราย ไม่ใช่ของเก็บ
    this.hazards = [];       // อันตรายที่ขยับได้ (ไฟ / ผึ้ง / ลูกบอล)
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

    // ติดธีมไว้กับชิ้นตั้งแต่ตอนเกิด ไม่ใช่ให้ตอนวาดไปอ่านธีมของด่านปัจจุบัน
    // ชิ้นที่เกิดก่อนเปลี่ยนฉากจึงยังเป็นหน้าตาของฉากเดิมจนวิ่งผ่านไปเอง
    if (this.theme) for (const o of c.obs) o.theme = this.theme;

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

  /**
   * ของร่วงจากเพดาน — ชิ้นส่วนใช้ซ้ำได้ทุกแมพ (คริสตัลถ้ำ / อุกกาบาต / น้ำแข็ง)
   *
   * มีสองช่วงเสมอ: เตือนก่อน แล้วค่อยร่วง
   * ช่วงเตือนวาดเงาบนพื้นให้เห็นว่าจะตกตรงไหน ผู้เล่นจึงมีเวลาขยับ
   * — ถ้าร่วงทันทีโดยไม่เตือน มันคือความตายที่หลบไม่ได้ ซึ่งผิดกฎ "ห้ามสร้างแพตเทิร์นที่หลบไม่ได้"
   *
   * ── ทำไมต้องเลี่ยงจุดที่อยู่ใต้คาน ──
   * ใต้คานผู้เล่น "ต้องหมอบ" ลุกไม่ได้ ถ้าหย่อนของร่วงลงตรงนั้นก็คือหลบไม่ได้เหมือนกัน
   * isClearSpot() เช็คให้แล้วว่าห่างจากคานและหลุมพอ จึงใช้ตัวเดียวกับที่วางขวดพลัง
   */
  spawnFaller(fromX, warnFrames) {
    const limit = fromX + chunkW;
    for (let x = fromX; x < limit; x += 24) {
      if (this.isClearSpot(x)) {
        this.fallers.push({
          x,
          y: -40,
          w: FALLER.w,
          h: FALLER.h,
          warn: warnFrames,   // นับถอยหลังช่วงเตือน 0 = เริ่มร่วง
          vy: 0,
          dead: false,
        });
        return;
      }
    }
    // ท่อนนี้แน่นจนไม่มีจุดปลอดภัย — ไม่หย่อนดีกว่าหย่อนลงจุดที่หลบไม่ได้
  }

  /** เดินของร่วงหนึ่งเฟรม — คืน true ถ้ามีชิ้นไหนเพิ่งกระแทกพื้น (ไว้ให้เกมสั่นจอ) */
  updateFallers(dt) {
    let landed = false;
    for (const f of this.fallers) {
      if (f.warn > 0) { f.warn -= dt; continue; }
      f.vy += FALLER.gravity * dt;
      f.y += f.vy * dt;
      if (f.y + f.h >= GROUND_Y) {
        f.y = GROUND_Y - f.h;
        f.dead = true;
        landed = true;
      }
    }
    this.fallers = this.fallers.filter((f) => !f.dead);
    return landed;
  }

  /**
   * วางอันตรายที่ขยับได้หนึ่งชิ้น — ชิ้นส่วนกลางของครัว/สวน/ชายหาด
   *
   * วางเฉพาะจุดโล่งด้วยเหตุผลเดียวกับของร่วง: ถ้าไปซ้อนกับคานหรือหลุม
   * ผู้เล่นจะเจอสองอย่างพร้อมกันโดยมีทางออกเดียวซึ่งอาจไม่มีอยู่จริง
   */
  spawnHazard(kind, fromX, camera) {
    const limit = fromX + chunkW;
    for (let x = fromX; x < limit; x += 24) {
      if (!this.isClearSpot(x)) continue;

      if (kind === 'flame') {
        const f = HAZARD.flame;
        this.hazards.push({
          kind, x, w: f.w,
          // เริ่มที่ช่วงดับเสมอ ผู้เล่นจึงเห็นมันก่อนที่มันจะติดครั้งแรก
          phase: 'off', t: f.offFrames,
          // สุ่มว่ารอบแรกจะติดที่พื้นหรือเพดาน เฟสจึงไม่ซ้ำกันทุกต้น
          at: Math.random() < 0.5 ? 'ground' : 'ceil',
        });
      } else if (kind === 'bee') {
        const b = HAZARD.bee;
        this.hazards.push({
          kind, x, w: b.w, h: b.h,
          t: Math.random() * Math.PI * 2,   // เฟสแกว่งไม่ตรงกันทุกตัว
          y: b.midY,
        });
      } else if (kind === 'ball') {
        const b = HAZARD.ball;
        // ลูกบอลเป็นชนิดเดียวที่ "เคลื่อนที่หลังเกิด" จุดโล่งตอนเกิดจึงไม่พอ
        // มันกลิ้งสวนมาเรื่อย ๆ ถ้าไปหยุดอยู่ใต้คานพอดี ผู้เล่นจะต้องหมอบ (ลุกไม่ได้)
        // แล้วโดนบอลชนโดยไม่มีทางเลี่ยง = แพตเทิร์นที่หลบไม่ได้ ซึ่งผิดกฎ
        // จึงต้องเช็คว่า "ทางที่มันจะกลิ้งผ่าน" โล่งด้วย ไม่ใช่แค่จุดที่มันเกิด
        if (!this.isBallLaneClear(x, camera)) continue;
        this.hazards.push({ kind, x, w: b.r * 2, h: b.r * 2, y: GROUND_Y - b.r * 2, spin: 0 });
      }
      return;
    }
  }

  /**
   * ทางที่ลูกบอลจะกลิ้งผ่านก่อนเจอผู้เล่น โล่งตลอดหรือไม่
   *
   * ── ทำไมต้องคำนวณจากจุดเกิดจริง ไม่ใช่ค่าคงที่ ──
   * spawnHazard ไล่หาจุดโล่งไปทางขวาเรื่อย ๆ จุดเกิดจริงจึงเลื่อนออกไปได้ไกล
   * ยิ่งเกิดไกล ยิ่งใช้เวลานานกว่าจะเจอผู้เล่น และยิ่งกลิ้งได้ไกลขึ้นตาม
   * ถ้าใช้ระยะตายตัวจะตรวจไม่ครบ แล้วมีบอลหลุดไปติดใต้คานอยู่ดี
   *
   *   เวลาที่ใช้จนเจอกัน = ระยะห่าง / (ความเร็วฉาก + ความเร็วบอล)
   *   ระยะที่บอลกลิ้งเอง = เวลานั้น x ความเร็วบอล
   */
  isBallLaneClear(x, camera) {
    const px = camera + PLAYER_X;
    const roll = ((x - px) / (SPEED.run + HAZARD.ball.speed)) * HAZARD.ball.speed;
    // เผื่อความกว้างของบอลกับคาน เพราะ isClearSpot ตรวจทีละจุด ไม่ได้ตรวจทั้งกล่อง
    const lane = roll + HAZARD.ball.r * 2 + 60;
    for (let d = 0; d <= lane; d += 20) {
      if (!this.isClearSpot(x - d)) return false;
    }
    return true;
  }

  /** เดินอันตรายที่ขยับได้หนึ่งเฟรม แล้วทิ้งชิ้นที่พ้นจอไปแล้ว */
  updateHazards(dt, camera) {
    for (const h of this.hazards) {
      if (h.kind === 'flame') {
        const f = HAZARD.flame;
        h.t -= dt;
        if (h.t <= 0) {
          if (h.phase === 'off') { h.phase = 'on'; h.t = f.onFrames; }
          // ดับแล้วสลับข้าง รอบหน้าจึงเป็นท่าตรงข้าม
          else { h.phase = 'off'; h.t = f.offFrames; h.at = h.at === 'ground' ? 'ceil' : 'ground'; }
        }
      } else if (h.kind === 'bee') {
        const b = HAZARD.bee;
        h.t += b.speed * dt;
        h.y = b.midY + Math.sin(h.t) * b.amp;
      } else if (h.kind === 'ball') {
        h.x -= HAZARD.ball.speed * dt;   // กลิ้งสวนทางที่แมววิ่ง
        h.spin -= 0.12 * dt;
      }
    }
    this.hazards = this.hazards.filter((h) => h.x + h.w > camera - 120);
  }

  /**
   * กล่องชนของอันตรายชิ้นหนึ่ง — คืน null ถ้าตอนนี้ยังไม่อันตราย
   * แยกออกมาเพราะไฟมีช่วงดับ และรูปทรงต่างกันตามชนิด
   */
  hazardBox(h) {
    if (h.kind === 'flame') {
      if (h.phase !== 'on') return null;              // ช่วงดับ ผ่านได้
      const f = HAZARD.flame;
      return h.at === 'ground'
        ? { x: h.x, y: GROUND_Y - f.groundH, w: f.w, h: f.groundH }
        : { x: h.x, y: 0, w: f.w, h: f.ceilH };
    }
    return { x: h.x, y: h.y, w: h.w, h: h.h };
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
    // ชิ้นที่ถูกชนกระเด็นไม่ใช้เส้น cut ปกติ เพราะมันลอยสวนทางไปข้างหน้าได้
    // ต้องรอให้หมดอายุหรือร่วงพ้นจอล่างแทน
    this.obstacles = this.obstacles.filter((o) => (o.smashed
      ? o.life > 0 && o.y < VIEW.H + 180
      : o.x + o.w > cut));
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
