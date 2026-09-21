// src/level.js
import {
  GROUND_Y, LEVEL, VIEW, SHIELD, POTION, PHYSICS, BODY, SPEED, KIBBLE, SHRIMP, MAGNET, LETTER,
  SPEEDUP, BIGCAN, FALLER, HAZARD, PLAYER_X,
} from './config.js';

const { spike, bar, crate, fishR, chunkW, ledgeThick } = LEVEL;

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
const JUMP_PEAK = peak(JUMP);
/** y ณ จุดสูงสุดของส่วนโค้ง — จุดที่ตัวแมวลอยไปถึงจริง ใช้วางของที่ต้องเก็บได้แน่ ๆ */
const PEAK_Y = JUMP.reduce((a, b) => (b.y < a.y ? b : a)).y;
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
/**
 * เม็ดธรรมดาที่ยังไม่ถูกกำหนดชนิดไว้
 *
 * ── ทำไมต้องมี ──
 * ของหายากมาจากสองทางที่ไม่รู้จักกัน: คนออกแบบตั้งไว้ในแถว (withShrimp/withKibble ตอนสร้างท่อน)
 * กับระบบโรยให้ทั้งท่อนตาม route (step.shrimp / step.kibble ใน spawnChunk)
 * ทางหลังมาทีหลังเสมอ ของเดิมจึงเขียนทับสิ่งที่คนตั้งใจไว้
 * เช่นตั้ง "กุ้งทองทั้งแถว" ไว้ แล้วโดน kibble แบบสลับเม็ดทับจนกลายเป็นกุ้งสลับเม็ดขนม
 *
 * กติกา: สิ่งที่คนตั้งใจใส่ชนะการโรยอัตโนมัติเสมอ ระบบเติมได้เฉพาะเม็ดที่ยังว่างอยู่
 */
const isPlainFish = (it) => !it.kind || it.kind === 'fish';

function makeShrimp(items) {
  if (!items.length) return items;
  // แถวนี้มีกุ้งที่คนวางไว้แล้ว ไม่ต้องเติมอีก (กติกาคือกุ้งทองท่อนละตัว)
  if (items.some((it) => it.kind === 'shrimp')) return items;

  const plain = items.filter(isPlainFish);
  if (!plain.length) return items;
  const gold = plain[topIndex(plain)];
  gold.kind = 'shrimp';
  // ตัดเฉพาะเม็ดธรรมดาที่อยู่ชิดกุ้งเกินไป — ของที่คนตั้งใจใส่ไว้ห้ามหาย
  return items.filter((it) => it === gold || !isPlainFish(it) || Math.abs(it.x - gold.x) >= SHRIMP.minGap);
}

function makeKibble(items, style) {
  if (!items.length) return;
  const set = (it) => { if (it && isPlainFish(it)) it.kind = 'kibble'; };

  if (style === 'all') {
    // ทั้งแถวเป็นเม็ดกลม — ใช้ตอนอยากให้ "แถวอาหารเม็ด" เป็นของชิ้นเอกของท่อนไปเลย
    // ไม่ใช่ของแทรกในแถวปลาแบบสองแบบข้างล่าง
    for (const it of items) set(it);
  } else if (style === 'cluster') {
    const top = topIndex(items);
    const from = Math.max(0, top - 1);
    for (let i = from; i < Math.min(items.length, from + KIBBLE.clusterSize); i++) set(items[i]);
  } else {
    for (let i = 1; i < items.length; i += KIBBLE.alternateEvery) set(items[i]);
  }
}

/**
 * รูปเขียนของ makeShrimp/makeKibble ที่วางกลางนิพจน์ได้เลย
 *
 * route สั่งใส่กุ้ง/เม็ดกลมได้ทีละ "ทั้งท่อน" เท่านั้น (ดู spawnChunk)
 * แต่ท่อนที่เขียนเองมักอยากใส่เฉพาะบางแถว เช่นกุ้งที่ยอดโค้งแถวเดียว
 * ส่วนแถวพื้นยังเป็นปลาตามเดิม สองตัวนี้จึงคืน array เสมอ เขียนซ้อนได้ทันที:
 *   fish: [...fishRun(x, 8, 34), ...withShrimp(fishJump(j1, 11))]
 * (makeKibble แก้ของเดิมในที่ ส่วน makeShrimp คืนชุดใหม่ — ห่อให้ใช้เหมือนกันทั้งคู่)
 */
const withShrimp = (items, style) => {
  // 'all' = กุ้งทองทั้งแถว สำหรับช่วงโบนัส ไม่ตัดเม็ดข้าง ๆ ทิ้งเพราะทุกเม็ดเป็นกุ้งเหมือนกัน
  // (คนวางต้องเว้นระยะเองอย่างน้อย SHRIMP.minGap ไม่งั้นตัวจะซ้อนกัน)
  if (style === 'all') { for (const it of items) it.kind = 'shrimp'; return items; }
  return makeShrimp(items);
};

/** ยกทั้งแถวขึ้นไปอยู่ชั้นอื่น — dy บวก = สูงขึ้น ใช้กับแถวพื้นที่อยากให้ลอยไปชั้นกระโดด */
const lift = (items, dy) => { for (const it of items) it.y -= dy; return items; };
const withKibble = (items, style) => { makeKibble(items, style); return items; };

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
 * ช่อเกล็ดหิมะ — เม็ดเก้าเม็ดเรียงเป็นรูปเกล็ดหิมะ วางคร่อม "จุดสูงสุดของส่วนโค้งกระโดด"
 *
 * ── ทำไมต้องผูกกับยอดโค้ง ──
 * กฎของไฟล์นี้คือทุกเม็ดต้องเก็บได้จริง (ระยะเก็บ fishR + 22 = 33px)
 * ลายเกล็ดหิมะแบบกางเต็มจอจะมีเม็ดที่ตาเห็นแต่มือเอื้อมไม่ถึง ซึ่งเป็นความรู้สึกที่แย่ที่สุด
 * จึงจำกัดก้านไว้ไม่เกิน 26px รอบยอดโค้ง = กดกระโดดตรงจังหวะแล้วได้ครบทั้งเก้าเม็ดพอดี
 *
 * @param x   จุดที่ผู้เล่นต้องกดกระโดด (เหมือน fishJump) ช่อจะไปโผล่ที่ยอดโค้งเอง
 * @param arm ความยาวก้าน — ห้ามเกิน RUN_REACH ไม่งั้นเม็ดปลายก้านจะเก็บไม่ได้
 */
function fishFlake(x, arm = 24) {
  const a = Math.min(arm, RUN_REACH);
  const d = a * 0.72;
  const cx = x + JUMP_PEAK;
  const at = (dx, dy) => ({ x: cx + dx, y: PEAK_Y + dy, r: fishR, got: false, kind: 'fish' });
  return [
    at(0, 0),
    at(-a, 0), at(a, 0), at(0, -a), at(0, a),
    at(-d, -d), at(d, -d), at(-d, d), at(d, d),
  ];
}

/**
 * เม็ดอาหารตาม "จุดที่กำหนดเอง" — ใช้กับลายที่วาดเองหรือตัวอักษร
 *
 * ── ทำไมต้องมีตัวนี้ ──
 * ตัวช่วยตัวอื่นในไฟล์นี้เป็นรูปทรงสำเร็จ (แถวตรง ส่วนโค้ง คลื่น เกล็ดหิมะ)
 * ซึ่งพอแล้วสำหรับจังหวะการเล่น แต่ไม่พอสำหรับ "ลาย" เช่นตัวอักษรหรือรูปหัวใจ
 * ถ้าไม่มีตัวนี้ คนจัดด่านต้องวางทีละเม็ดแล้ว export ออกมาเป็นเม็ดดิบเป็นร้อยบรรทัด
 *
 * ── กติกาที่ยังต้องรักษา ──
 * ทุกเม็ดต้องเก็บได้จริง คนวางจึงต้องคุมความสูงเอง (เกิน DBL_PEAK ไปคือเอื้อมไม่ถึง)
 * หน้าออกแบบด่านมีเส้นเพดานกระโดดกับตัวตรวจ "เม็ดที่เก็บไม่ได้" ไว้ให้เช็กอยู่แล้ว
 *
 * @param x   ขอบซ้ายของลาย
 * @param pts [[dx, dy], ...] — dy บวก = สูงขึ้นจากเส้นวิ่ง
 */
function fishDots(x, pts) {
  return pts.map(([dx, dy]) => ({
    x: x + dx,
    y: RUN_Y - dy,
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
// ชุดเครื่องมือสำหรับหน้าออกแบบด่าน (editor.html)
//
// หน้านั้นต้องวางของด้วย "ตัวเดียวกัน" กับที่ท่อนในไฟล์นี้ใช้ ไม่งั้นสิ่งที่เห็น
// ในเครื่องมือจะไม่ตรงกับของที่ลงเกมจริง จึงปล่อยค่าชุดนี้ออกไปแทนการคัดลอกใหม่
//
// ทุกตัวในนี้ PATTERNS เรียกใช้อยู่แล้วทั้งหมด การปล่อยออกไปจึงไม่ได้
// พาโค้ดเพิ่มเข้าก้อนเกม มีแค่อ็อบเจกต์หนึ่งตัวที่ชี้ไปหาของที่มีอยู่แล้ว
// ─────────────────────────────────────────────────────────────
/**
 * ไอเท็มที่ "ท่อน" วางเองได้ — ทะเบียนเดียวที่ทั้งเกมและโต๊ะออกแบบด่านอ่าน
 *
 * ⚠ กติกาถาวร: เพิ่มไอเท็มชนิดใหม่ในเกมเมื่อไหร่ ต้องเติมที่นี่ด้วย
 *   และเติม ITEM_DEFS ใน src/editor/main.js (ชื่อ ภาพ ผลในการจำลอง)
 *   ไม่งั้นหน้าออกแบบด่านจะวางไอเท็มนั้นไม่ได้ และโค้ดที่ส่งออกจะไม่มีมัน
 *
 * list = ชื่อ array ใน Level ที่ของชิ้นนั้นไปอยู่ / make = รูปร่างตอนเกิด (ต้องตรงกับ spawnXxx เดิม)
 */
export const PICKUPS = {
  nip:    { list: 'nips',    make: (x) => ({ x, y: SPEEDUP.y, r: SPEEDUP.r, got: false }) },
  can:    { list: 'cans',    make: (x) => ({ x, y: BIGCAN.y, r: BIGCAN.r, got: false }) },
  magnet: { list: 'magnets', make: (x) => ({ x, y: MAGNET.y, r: MAGNET.r, got: false }) },
  shield: { list: 'shields', make: (x) => ({ x, y: SHIELD.y, r: SHIELD.r, got: false }) },
  potion: { list: 'potions', make: (x) => ({ x, y: POTION.y, got: false }) },
  letter: { list: 'letters', make: (x, idx) => ({ x, y: LETTER.y, r: LETTER.r, idx, got: false }) },
};


// ─────────────────────────────────────────────────────────────
// พื้นเหยียบได้ — ผิวที่ไม่ใช่เส้นพื้นหลัก
//
// ── ทำไมต้องมี ──
// เดิมทั้งเกมมีผิวให้ยืนอยู่เส้นเดียวคือ GROUND_Y ท่อนหนึ่งจึงพูดได้แค่ว่า
// "ตรงนี้มีพื้น" หรือ "ตรงนี้เป็นหลุม" ความสูงเป็นของสิ่งกีดขวางเท่านั้น
// พอเพิ่มผิวที่สองเข้ามา ท่อนหนึ่งเล่าเรื่องได้อีกแบบ: ขึ้นไปวิ่งชั้นบน
// แล้วเลือกเองว่าจะลงเมื่อไหร่ ซึ่งเป็นจังหวะที่ทำด้วยลังกับหลุมไม่ได้เลย
//
// สองชนิด:
//   hill   เนินที่งอกจากพื้น เดินขึ้นได้เลยไม่ต้องกระโดด ผิวเป็นเส้นโค้งต่อเนื่อง
//   ledge  แท่งลอย ต้องกระโดดขึ้นไปเหยียบ ลอดใต้ได้ ใส่ under เพื่อเจาะหลุมข้างใต้
//
// กติกาเดียวที่ทั้งเกมใช้: ผิวไหนอยู่สูงสุด ณ x นั้น = ผิวที่เท้าจะเจอ
// พื้นปกติก็เป็นผิวหนึ่งในนั้น จึงไม่มีโค้ดสาขาพิเศษว่า "ตอนนี้อยู่บนพื้นลอยหรือเปล่า"
// ─────────────────────────────────────────────────────────────

/**
 * ความยาวทางลาดของเนิน — ยาวอย่างน้อย 2.4 เท่าของความสูง
 * ความชันสูงสุดจึงไม่เกิน ~0.63 px ต่อ px ซึ่งน้อยกว่าแรงโน้มถ่วงหนึ่งเฟรม (0.86)
 * แปลว่าวิ่งลงเนินแล้วเท้าไม่หลุดจากผิว ไม่ต้องพึ่งการดูดติดเลยแม้แต่เฟรมเดียว
 */
export function hillRamp(p) {
  return Math.min(p.w / 2, Math.max(60, p.h * 2.4));
}

/**
 * ผิวบนของพื้นลอย — เขียนได้สองแบบ
 *   lift: 90   ลอยเหนือพื้น 90px (อ่านง่ายกว่าตอนเขียนท่อนด้วยมือ และเป็นแบบที่หน้าออกแบบส่งออก)
 *   top: 230   พิกัด y ตรง ๆ (แบบที่ build() ในหน้าออกแบบใช้ภายใน)
 * รับทั้งคู่จะได้ไม่มีท่อนไหนพังเพราะเขียนคนละแบบ
 */
const ledgeTop = (p) => (p.top !== undefined ? p.top : GROUND_Y - p.lift);

/** y ของผิวชิ้นหนึ่ง ณ x — null ถ้า x ไม่อยู่ในช่วงของชิ้นนั้น */
export function platTop(p, x) {
  if (x < p.x || x > p.x + p.w) return null;
  if (p.kind === 'ledge') return ledgeTop(p);
  const u = x - p.x;
  const ramp = hillRamp(p);
  const t = u < ramp ? u / ramp : u > p.w - ramp ? (p.w - u) / ramp : 1;
  return GROUND_Y - p.h * t * t * (3 - 2 * t);     // smoothstep: ตีนเนินกับยอดเนินไม่มีมุมหัก
}

/** ผิวที่สูงที่สุด ณ x (ไม่นับพื้นปกติ) — null ถ้าไม่มีพื้นเหยียบตรงนั้น */
export function highestTop(plats, x) {
  let best = null;
  for (const p of plats) {
    const t = platTop(p, x);
    if (t !== null && (best === null || t < best)) best = t;
  }
  return best;
}

/** กล่องตันของพื้นลอย ใช้ตอนวาดและตอนวัดว่ามีอะไรมาทับกัน */
export function platBox(p) {
  return p.kind === 'hill'
    ? { x: p.x, y: GROUND_Y - p.h, w: p.w, h: p.h }
    : { x: p.x, y: ledgeTop(p), w: p.w, h: ledgeThick };
}

/** ระยะดูดติดผิวตอนวิ่งลง — หน่วยเป็น px ต่อหนึ่งก้าวอ้างอิง */
const STICK = 10;

/**
 * ผิวที่เท้าจะยืนในเฟรมนี้ — null = ไม่มีอะไรรองรับ ร่วงต่อ
 *
 * พื้นปกติกับพื้นเหยียบใช้กติกาเดียวกัน: "เฟรมก่อนเท้าอยู่เหนือผิว และตอนนี้ถึงผิวแล้ว"
 * พื้นปกติจึงได้ผลเท่าเดิมทุกกรณี ด่านเก่าทั้งหมดเล่นออกมาเหมือนเดิมเป๊ะ
 *
 * สองข้อที่เพิ่มมาเพราะผิวไม่เรียบ:
 *   ผิวของเฟรมก่อน  เทียบกับผิว ณ x เดิม ไม่ใช่ x ใหม่ ไม่งั้นเดินขึ้นเนินจะดูเหมือน
 *                  "มุดใต้ผิว" แล้วไม่ถูกยกขึ้น
 *   ดูดติดขาลง     ตอนยืนอยู่แล้วผิวลาดลง ถ้าไม่ดูดไว้เท้าจะหลุดจากผิวทุกเฟรม
 *                  ตอนลงเนิน กลายเป็นวิ่งลงบันไดแทนที่จะไหลลงเนิน
 *
 * พื้นลอยเป็นแบบทะลุจากข้างล่างได้ — กระโดดลอดขึ้นไปยืนข้างบนได้ ไม่ชนหัว
 * เพราะเงื่อนไข land ต้องมาจาก "อยู่เหนือผิวอยู่แล้ว" เท่านั้น
 */
export function footing(pits, plats, cx, prevX, prevY, y, wasOnGround, pitsSolid = false, step = 1) {
  let best = null;
  // slack = เผื่อให้เฉพาะผิวที่ไม่เรียบ ผิวเอียงทำให้ y ต้นเฟรมกับผิว ณ x เดิม
  // ต่างกันได้เศษเสี้ยวพิกเซลจนพลาดการเหยียบทั้งที่ตาเห็นว่าโดน
  // พื้นปกติใช้ 0 เป๊ะเท่าของเดิม จะได้ไม่มีทางที่แมวซึ่งร่วงอยู่ในหลุมแล้ว
  // เด้งกลับขึ้นมายืนบนขอบหลุมฝั่งตรงข้าม (ดูคอมเมนต์ใน Player.update)
  const tryTop = (now, before, slack) => {
    if (now === null) return;
    const from = before === null ? now : before;
    const land = prevY <= from + slack && y >= now;
    const stick = wasOnGround && y < now && now - y <= STICK * Math.max(1, step);
    if ((land || stick) && (best === null || now < best)) best = now;
  };

  // ติดสปีด/ตัวโต วิ่งข้ามปากหลุมได้ (ดู Game.pitsSolid)
  const overPit = !pitsSolid && pits.some((p) => cx > p.x + 6 && cx < p.x + p.w - 6);
  if (!overPit) tryTop(GROUND_Y, GROUND_Y, 0);
  for (const p of plats) tryTop(platTop(p, cx), platTop(p, prevX), 0.5);
  return best;
}

export const AUTHOR = {
  JUMP, JUMP_DBL, JUMP_SPAN, HALF, JUMP_PEAK, DBL_SPAN, DBL_PEAK, DOUBLE_AT,
  RUN_Y, RUN_REACH, GAP_W,
  fishAlong, fishJump, fishDouble, fishLow, fishRun, fishWave, fishAbove, fishRunTo,
  fishFlake, fishDots,
  arcMid, arcHigh, groundSpike, lowBar, crateStack, makeShrimp, makeKibble,
  withShrimp, withKibble, lift,
  platTop, highestTop, platBox, footing, ledgeThick,
};

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
      // GAP_W กว้างเกินกระโดดเดี่ยวโดยตั้งใจ เฉลยจึงต้องเป็นการกดสองครั้ง
      jumps: [j, j + DOUBLE_AT * SPEED.run],
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
      jumps: [j1, j1 + DOUBLE_AT * SPEED.run, j2, j2 + DOUBLE_AT * SPEED.run],
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
      jumps: [j, j + DOUBLE_AT * SPEED.run],
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

  // 29 — ทางเกล็ดหิมะ: ไม่มีของขวางเลย แต่ต้องกดให้ตรงจังหวะถึงจะได้ช่อครบ
  // ท่อนพักของทุ่งหิมะ — แทนที่จะให้แถวยาวเฉย ๆ ให้รางวัลคนที่กดตรงยอดโค้งพอดี
  (x) => {
    const j1 = x + 200;
    const j2 = j1 + JUMP_SPAN + 200;
    return {
      obs: [],
      pit: [],
      fish: [
        ...fishRunTo(x + 30, j1), ...fishJump(j1, 9), ...fishFlake(j1),
        ...fishWave(j1 + JUMP_SPAN + 30, 5, 34, 1),
        ...fishJump(j2, 9), ...fishFlake(j2),
      ],
      jumps: [j1, j2],
      width: (j2 - x) + JUMP_SPAN + 240,
    };
  },

  // 30 — แท่งน้ำแข็งสามแท่ง ระยะบีบเข้าเรื่อย ๆ
  // ต่างจากท่อนหนามหลายอันของแมพอื่นตรงที่ระยะ "ไม่เท่ากัน" — จังหวะที่เพิ่งกดไปใช้ซ้ำไม่ได้
  // เป็นกริยาที่เข้ากับทุ่งหิมะ (ลื่นไถล กะระยะยาก) โดยไม่ต้องแตะฟิสิกส์จริงของเกม
  (x) => {
    const j1 = x + 170;
    const j2 = j1 + JUMP_SPAN + 150;
    // 126 คือช่องที่แคบที่สุดในเกม (ท่อนอื่นใช้ 130-150) แคบกว่านี้แล้วจังหวะที่สามกลายเป็นวัดดวง
    const j3 = j2 + JUMP_SPAN + 126;
    const js = [j1, j2, j3];
    return {
      obs: js.map((j) => groundSpike(j + HALF - spike.w / 2)),
      pit: [],
      fish: [...fishRunTo(x + 30, j1), ...js.flatMap((j) => fishJump(j, 8))],
      jumps: js,
      width: (j3 - x) + JUMP_SPAN + 240,
    };
  },

  // ─────────────────────────────────────────────────────────────
  // ท่อน 31-50 — ด่าน "ครัวกลางคืน" ที่จัดเองทั้งด่าน
  // ทำจากหน้าออกแบบด่าน (editor.html โหมดทั้งด่าน) แล้วส่งออกมาเป็นโค้ดชุดนี้
  // route ของฉากอ้างเลขพวกนี้ตามลำดับ — ห้ามสลับหรือแทรกกลาง
  // ─────────────────────────────────────────────────────────────

  // 31 — ครัวกลางคืน · ท่อน 1
  (x) => ({
    obs: [],
    pit: [],
    fish: [...fishRun(x + 619, 8, 35), ...lift(fishDots(x + 278, [[0,130],[130,130],[182,130],[208,130],[234,130],[260,130],[0,104],[26,104],[104,104],[130,104],[260,104],[0,78],[78,78],[130,78],[234,78],[0,52],[130,52],[208,52],[0,26],[130,26],[182,26],[0,0],[130,0],[182,0],[208,0],[234,0],[260,0],[52,78]]), 5)],
    jumps: [],
    partial: true,
    width: 2280,
  }),
  // 32 — ครัวกลางคืน · ท่อน 2
  (x) => {
    const j1 = x + 115;
    const j2 = x + 554;
    const j3 = x + 1099;
    return {
      obs: [],
      pit: [],
      fish: [
        ...withKibble(arcMid(j1, 8), 'all'),
        ...withKibble(arcMid(j2, 8), 'all'),
        ...withKibble(arcMid(j3, 3), 'cluster'),
        ...fishRun(x + 1325, 6, 35),
        ...fishRun(x + 339, 7, 35),
        ...fishRun(x + 778, 10, 35),
        ...withKibble(lift(fishRun(x + 131, 1, 34), 27), 'all'),
        ...withKibble(lift(fishRun(x + 316, 1, 34), 21), 'all'),
        ...withKibble(lift(fishRun(x + 573, 1, 34), 29), 'all'),
        ...withKibble(lift(fishRun(x + 752, 1, 34), 21), 'all'),
        ...withKibble(lift(fishRun(x + 1114, 1, 34), 21), 'all'),
        ...withKibble(lift(fishRun(x + 1300, 1, 34), 21), 'all'),
        ...withShrimp(lift(fishRun(x + 1161, 1, 34), 86)),
        ...withShrimp(lift(fishRun(x + 1256, 1, 34), 88)),
      ],
      jumps: [j1, j2, j3],
      partial: true,
      width: 1500,
    };
  },
  // 33 — ครัวกลางคืน · ท่อน 3
  (x) => {
    const j1 = x + 198;
    return {
      obs: [groundSpike(x + 259), groundSpike(x + 311)],
      pit: [],
      fish: [
        ...fishRun(x + 40, 5, 34),
        ...fishJump(j1, 11),
        ...fishRun(x + 433, 2, 35),
      ],
      jumps: [j1],
      // เนินท้ายท่อน เดินขึ้นได้เลย เป็นตัวสอนว่าพื้นในด่านนี้มีหลายชั้น
      // ก่อนจะเจอพื้นลอยจริง ๆ ในท่อนถัดไป
      plats: [{ kind: 'hill', x: x + 462, w: 320, h: 70 }],
    };
  },
  // 34 — ครัวกลางคืน · ท่อน 4
  // j1 อยู่หลังจุดเริ่มท่อน (x-155) เพราะต้องกดตั้งแต่ปลายท่อน 3 ถึงจะขึ้นพื้นลอยทัน
  (x) => {
    const j1 = x + -155;
    const j2 = x + 309;
    return {
      obs: [crateStack(x + 563, 3), crateStack(x + 507, 1), crateStack(x + 620, 2), groundSpike(j2 + DBL_SPAN - spike.w / 2), crateStack(x + 679, 3)],
      pit: [{ x: x + 15 + 24, w: 263 - 48 }],
      plats: [{ kind: 'ledge', x: x + 15, w: 263, lift: 90 }],
      fish: [...withKibble(lift(fishRun(x + 33, 7, 38), 105), 'alternate')],
      jumps: [j1, j2],
      pickups: [{ kind: 'nip', x: x + 435 }],
    };
  },
  // 35 — ครัวกลางคืน · ท่อน 5
  (x) => {
    const j1 = x + 651;
    return {
      obs: [crateStack(x + -20, 1), groundSpike(x + 5), groundSpike(x + 5 + 44), crateStack(x + 98, 2), crateStack(x + 153, 1), crateStack(x + 271, 1), groundSpike(x + 220), crateStack(x + 331, 3), groundSpike(x + 324), crateStack(x + 385, 2), crateStack(x + 440, 2), crateStack(x + 506, 1), groundSpike(x + 472), groundSpike(x + 472 + 44), crateStack(x + 555, 3), crateStack(x + 605, 1)],
      pit: [],
      fish: [],
      jumps: [j1],
      pickups: [{ kind: 'magnet', x: x + 733 }],
    };
  },
  // 36 — ครัวกลางคืน · ท่อน 6
  (x) => ({
    obs: [],
    pit: [],
    fish: [
      ...withKibble(lift(fishRun(x + 117, 28, 56), 212), 'alternate'),
      ...withShrimp(lift(fishRun(x + 124, 28, 56), 152), 'all'),
      ...withKibble(fishRun(x + 120, 28, 56), 'cluster'),
      ...withShrimp(lift(fishRun(x + 121, 28, 56), 53), 'all'),
      ...withKibble(lift(fishRun(x + 124, 28, 56), 105), 'alternate'),
    ],
    jumps: [],
    pickups: [{ kind: 'letter', x: x + 62 }],
  }),
  // 37 — ครัวกลางคืน · ท่อน 7 (ทางโล่งล้วน ไว้หายใจ)
  () => ({
    obs: [],
    pit: [],
    fish: [],
    jumps: [],
  }),
  // 38 — ครัวกลางคืน · ท่อน 8
  (x) => ({
    obs: [],
    pit: [],
    fish: [...withKibble(lift(fishDots(x + 208, [[0,130],[130,130],[156,130],[182,130],[260,130],[364,130],[416,130],[442,130],[468,130],[494,130],[0,104],[104,104],[208,104],[260,104],[416,104],[0,78],[104,78],[208,78],[260,78],[416,78],[0,52],[104,52],[208,52],[416,52],[0,26],[104,26],[208,26],[416,26],[0,0],[26,0],[52,0],[156,0],[182,0],[416,0],[442,0],[468,0],[494,0],[364,104],[364,78],[364,52],[338,26],[312,0],[260,52],[286,26],[78,0],[130,0],[442,52],[468,52],[494,52]]), 37), 'alternate')],
    jumps: [],
  }),
  // 39 — ครัวกลางคืน · ท่อน 9
  (x) => ({
    obs: [],
    pit: [],
    fish: [
      ...withKibble(fishFlake(x + 133), 'all'),
      ...withKibble(fishFlake(x + 445), 'all'),
      ...fishRun(x + 271, 8, 34),
      ...withShrimp(lift(fishRun(x + 392, 1, 34), 64)),
      ...withKibble(lift(fishRun(x + 499, 6, 34), 43), 'cluster'),
      ...withKibble(lift(fishRun(x + 114, 6, 34), 37), 'cluster'),
    ],
    jumps: [],
  }),
  // 40 — ครัวกลางคืน · ท่อน 10
  (x) => {
    const j1 = x + 269;
    const j2 = x + 500;
    const j3 = j1 + DBL_SPAN;
    return {
      obs: [crateStack(j1 + HALF - crate.w / 2, 1), crateStack(j3 + HALF - crate.w / 2, 2)],
      pit: [],
      fish: [
        ...fishRun(x + 31, 8, 34),
        ...fishJump(j1, 9),
        ...fishRun(x + 489, 3, 34),
        ...withKibble(fishJump(j3, 9), 'cluster'),
      ],
      jumps: [j1, j2, j3],
    };
  },
  // 41 — ครัวกลางคืน · ท่อน 11
  (x) => ({
    obs: [lowBar(x + 161), lowBar(x + 481)],
    pit: [],
    fish: [
      ...fishRun(x + 30, 22, 34),
      ...withShrimp(lift(fishRun(x + 411, 1, 56), 38), 'all'),
      ...withShrimp(lift(fishRun(x + 710, 1, 56), 38), 'all'),
    ],
    jumps: [],
  }),
  // 42 — ครัวกลางคืน · ท่อน 12
  (x) => {
    const j1 = x + 202;
    return {
      obs: [lowBar(x + 505)],
      pit: [],
      fish: [...fishRun(x + 22, 6, 34), ...fishRun(x + 348, 15, 34)],
      jumps: [j1],
      pickups: [{ kind: 'can', x: x + 272 }],
    };
  },
  // 43 — ครัวกลางคืน · ท่อน 13
  // พื้นลอยยาว 1800px พาดข้ามไปถึงท่อน 14 — ทั้งช่วงนี้คือทางวิ่งชั้นบน
  // ไม่มีหลุมข้างใต้ ตกลงมาก็แค่กลับไปวิ่งพื้นปกติ
  (x) => {
    const j1 = x + -20;
    const j2 = x + 17;
    return {
      obs: [],
      pit: [],
      fish: [
        ...fishRun(x + 117, 28, 34),
        ...withKibble(lift(fishRun(x + 119, 28, 34), 42), 'all'),
        ...withShrimp(lift(fishRun(x + 133, 15, 56), 178), 'all'),
        ...withShrimp(lift(fishRun(x + 134, 15, 56), 136), 'all'),
      ],
      jumps: [j1, j2],
      plats: [{ kind: 'ledge', x: x + 107, w: 1800, lift: 130 }],
      partial: true,
    };
  },
  // 44 — ครัวกลางคืน · ท่อน 14
  (x) => ({
    obs: [],
    pit: [],
    fish: [
      ...lift(fishRun(x + 315, 25, 34), 41),
      ...withKibble(fishRun(x + 315, 25, 34), 'all'),
      ...withShrimp(lift(fishRun(x + 216, 17, 56), 137), 'all'),
      ...withShrimp(lift(fishRun(x + 217, 17, 56), 184), 'all'),
      ...fishRun(x + 1169, 9, 34),
    ],
    jumps: [],
    width: 1368,
  }),
  // 45 — ครัวกลางคืน · ท่อน 15
  (x) => {
    const j1 = x + 289;
    return {
      obs: [],
      pit: [{ x: j1 + HALF - 66, w: 132 }],
      fish: [
        ...fishRun(x + 516, 10, 34),
        ...withShrimp(fishJump(x + 296, 11)),
        ...fishRun(x + 113, 6, 34),
      ],
      jumps: [j1],
    };
  },
  // 46 — ครัวกลางคืน · ท่อน 16
  (x) => {
    const j1 = x + 191;
    const j2 = j1 + DOUBLE_AT * SPEED.run;
    return {
      obs: [],
      pit: [{ x: x + 200, w: 270 }],
      fish: [
        ...fishRun(x + 99, 3, 34),
        ...withKibble(fishDouble(j1, 10), 'all'),
        ...withKibble(lift(fishRun(x + 200, 1, 34), 17), 'all'),
        ...withKibble(lift(fishRun(x + 489, 1, 34), 10), 'all'),
        ...fishRun(x + 521, 8, 34),
      ],
      jumps: [j1, j2],
    };
  },
  // 47 — ครัวกลางคืน · ท่อน 17
  // พื้นลอยเหนือหลุมสองแท่งติดกัน — กดพลาดแท่งไหนก็ตกหลุมนั้น
  (x) => {
    const j1 = x + 174;
    const j2 = x + 443;
    return {
      obs: [],
      pit: [{ x: x + 216 + 24, w: 186 - 48 }, { x: x + 515 + 24, w: 186 - 48 }],
      plats: [
        { kind: 'ledge', x: x + 216, w: 186, lift: 90 },
        { kind: 'ledge', x: x + 515, w: 186, lift: 90 },
      ],
      fish: [
        ...fishRun(x + 728, 5, 34),
        ...withKibble(lift(fishRun(x + 241, 5, 34), 92), 'all'),
        ...withKibble(lift(fishRun(x + 539, 5, 34), 92), 'all'),
        ...fishRun(x + 36, 5, 34),
      ],
      jumps: [j1, j2],
      pickups: [{ kind: 'letter', x: x + 457 }],
    };
  },
  // 48 — ครัวกลางคืน · ท่อน 18
  (x) => {
    const j1 = x + 171;
    const j2 = j1 + DOUBLE_AT * SPEED.run;
    return {
      obs: [crateStack(j1 + DBL_PEAK - crate.w / 2, 3), lowBar(x + 608), lowBar(x + 887), lowBar(x + 1160)],
      pit: [],
      fish: [
        ...fishRun(x + 139, 3, 34),
        ...arcHigh(x + 169, 5),
        ...withShrimp(lift(fishRun(x + 257, 1, 34), 53)),
        ...withShrimp(lift(fishRun(x + 415, 1, 34), 53)),
        ...fishRun(x + 462, 30, 34),
        ...withShrimp(lift(fishRun(x + 1112, 1, 34), 37)),
        ...withShrimp(lift(fishRun(x + 828, 1, 34), 35)),
      ],
      jumps: [j1, j2],
      width: 1368,
    };
  },
  // 49 — ครัวกลางคืน · ท่อน 19
  (x) => ({
    obs: [],
    pit: [],
    fish: [...fishRun(x + 119, 6, 34), ...fishDots(x + 290, [[0,130],[26,130],[52,130],[78,130],[104,130],[156,130],[260,130],[468,130],[52,104],[156,104],[260,104],[468,104],[494,104],[52,78],[156,78],[260,78],[468,78],[52,52],[156,52],[260,52],[338,52],[364,52],[390,52],[468,52],[52,26],[156,26],[260,26],[312,26],[416,26],[468,26],[52,0],[156,0],[260,0],[312,0],[416,0],[468,0],[312,52],[364,130],[416,52],[338,104],[312,78],[390,104],[416,78],[520,78],[546,52],[572,26],[598,0],[598,26],[598,104],[598,130],[598,78],[598,52],[234,52],[182,52],[208,52]])],
    jumps: [],
  }),
  // 50 — ครัวกลางคืน · ท่อน 20
  (x) => ({
    obs: [],
    pit: [],
    fish: [
      ...lift(fishDots(x + 178, [[0,130],[78,130],[156,130],[182,130],[208,130],[0,104],[52,104],[130,104],[234,104],[0,78],[26,78],[0,52],[26,52],[52,52],[234,52],[0,26],[78,26],[130,26],[234,26],[0,0],[104,0],[156,0],[182,0],[208,0],[156,52],[182,52],[208,52],[130,78]]), -10),
      ...withKibble(lift(fishDots(x + 320, [[286,26],[260,26],[260,52],[234,52],[234,78],[208,78],[208,104],[182,104],[182,130],[208,130],[234,130],[234,104],[260,78],[286,78],[312,130],[338,78],[312,78],[312,52],[286,52],[312,104],[338,104],[338,130],[364,130],[364,104],[260,104],[286,104],[260,0],[286,0]]), -11), 'all'),
      ...withKibble(fishRun(x + 739, 8, 89), 'all'),
    ],
    jumps: [],
    width: 2280,
  }),
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
  { kind: 'recovery', diff: 2 },    // 29 ทางเกล็ดหิมะ
  { kind: 'challenge', diff: 5 },   // 30 แท่งน้ำแข็งบีบระยะ

  // ── ด่าน "ครัวกลางคืน" ที่จัดเองทั้งด่าน (ดู route ของฉาก night) ──
  { kind: 'safe', diff: 1 },        // 31 ครัวกลางคืน · ท่อน 1
  { kind: 'recovery', diff: 2 },    // 32 ครัวกลางคืน · ท่อน 2
  { kind: 'obstacle', diff: 3 },    // 33 ครัวกลางคืน · ท่อน 3
  { kind: 'obstacle', diff: 3 },    // 34 ครัวกลางคืน · ท่อน 4
  { kind: 'safe', diff: 1 },        // 35 ครัวกลางคืน · ท่อน 5
  { kind: 'obstacle', diff: 3 },    // 36 ครัวกลางคืน · ท่อน 6
  { kind: 'obstacle', diff: 2 },    // 37 ครัวกลางคืน · ท่อน 7
  { kind: 'obstacle', diff: 3 },    // 38 ครัวกลางคืน · ท่อน 8
  { kind: 'safe', diff: 1 },        // 39 ครัวกลางคืน · ท่อน 9
  { kind: 'obstacle', diff: 3 },    // 40 ครัวกลางคืน · ท่อน 10
  { kind: 'obstacle', diff: 2 },    // 41 ครัวกลางคืน · ท่อน 11
  { kind: 'obstacle', diff: 3 },    // 42 ครัวกลางคืน · ท่อน 12
  { kind: 'obstacle', diff: 3 },    // 43 ครัวกลางคืน · ท่อน 13
  { kind: 'recovery', diff: 2 },    // 44 ครัวกลางคืน · ท่อน 14
  { kind: 'obstacle', diff: 2 },    // 45 ครัวกลางคืน · ท่อน 15
  { kind: 'obstacle', diff: 2 },    // 46 ครัวกลางคืน · ท่อน 16
  { kind: 'obstacle', diff: 2 },    // 47 ครัวกลางคืน · ท่อน 17
  { kind: 'recovery', diff: 2 },    // 48 ครัวกลางคืน · ท่อน 18
  { kind: 'obstacle', diff: 2 },    // 49 ครัวกลางคืน · ท่อน 19
  { kind: 'recovery', diff: 2 },    // 50 ครัวกลางคืน · ท่อน 20
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
/**
 * คู่ท่อนที่ "ต่อกันแล้วหลบไม่ได้" — คำนวณครั้งเดียวตอนโหลดโมดูล
 *
 * ── ปัญหาที่ตารางนี้แก้ ──
 * ไม่มีแพตเทิร์นไหนมีคานคร่อมหนามอยู่ในตัวเอง (ตรวจครบทั้ง 29 ท่อนแล้ว)
 * แต่พอเอาสองท่อนมาต่อกัน ท่อนแรกที่จบด้วยคานตรงขอบขวา จะไปคร่อมหนาม
 * ที่อยู่ต้นท่อนถัดไปพอดี — วัดแล้วเกิดกับ 17 คู่จาก 841 คู่ (2%)
 *
 * ใต้คานต้องหมอบ (กระโดดข้ามคานไม่ได้เลย พิสูจน์ด้วยการจำลองส่วนโค้งกระโดดแล้ว)
 * แต่หนามชนแมวที่กำลังหมอบอยู่ = ไม่มีท่าไหนรอด ซึ่งผิดกฎ "ห้ามสร้างแพตเทิร์นที่หลบไม่ได้"
 *
 * ตารางนี้เก็บเป็น Set ของ "a>b" เพราะ composeRoute ต้องถามซ้ำทุกครั้งที่สุ่มท่อน
 * คำนวณสดทุกครั้งจะเรียก PATTERNS 841 ครั้งต่อการสร้างเส้นทางหนึ่งเส้น
 */
const BAD_JOIN = (() => {
  const bad = new Set();
  for (let a = 0; a < PATTERNS.length; a++) {
    const A = PATTERNS[a](0);
    const w = A.width || chunkW;
    for (let b = 0; b < PATTERNS.length; b++) {
      const B = PATTERNS[b](w);
      const all = [...A.obs, ...B.obs];
      const bars = all.filter((o) => o.kind === 'bar');
      const solid = all.filter((o) => o.kind !== 'bar');
      const clash = bars.some((bar) => solid.some(
        (o) => bar.x < o.x + o.w && o.x < bar.x + bar.w
      ));
      if (clash) bad.add(a + '>' + b);
    }
  }
  return bad;
})();

export function composeRoute(pool, count = 20, rnd = Math.random) {
  const byKind = (k) => pool.filter((p) => PATTERN_META[p].kind === k);
  const safe = byKind('safe');
  const recovery = byKind('recovery');
  const obstacle = byKind('obstacle');
  const challenge = byKind('challenge');

  // ด่านที่คลังไม่ครบทุกชนิด ให้ยืมชนิดที่ใกล้เคียงแทนการล้ม
  // prev = ท่อนก่อนหน้า ใช้กันไม่ให้เลือกท่อนที่ต่อกับมันแล้วหลบไม่ได้ (ดู BAD_JOIN)
  // ถ้ากรองแล้วไม่เหลือตัวเลือกเลย ยอมใช้ของเดิม — เส้นทางที่มีจุดยากดีกว่าไม่มีด่าน
  let prev = -1;
  const pick = (arr, fallback) => {
    let src = arr.length ? arr : fallback;
    if (prev >= 0) {
      const safe = src.filter((p) => !BAD_JOIN.has(prev + '>' + p));
      if (safe.length) src = safe;
    }
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
    prev = p;
    out.push({ p });
  }

  // ── รอยต่อตอนเส้นทางวนกลับ ──
  // spawnChunk อ่านด้วย chunkIndex % route.length ด่านจึงวนซ้ำไม่รู้จบ
  // ท่อนสุดท้ายจะไปต่อกับท่อนแรกเสมอ แต่ลูปข้างบนตรวจแค่คู่ที่ติดกันในอาเรย์
  // รอยต่อนี้จึงหลุดการตรวจมาตลอด — วัดในเกมจริงแล้วเจอคานคร่อมหนามตรงนี้จริง
  //
  // แก้ที่ท่อนสุดท้ายเพราะมันถูกเลือกด้วยกฎที่หลวมที่สุด (ไม่มีใครต่อจากมันในอาเรย์)
  // เปลี่ยนแล้วกระทบเส้นทางน้อยกว่าการไปเปลี่ยนท่อนแรกซึ่งถูกบังคับให้เป็นท่อนปลอดภัย
  if (out.length > 1) {
    const first = out[0].p;
    const last = out.length - 1;
    if (BAD_JOIN.has(out[last].p + '>' + first)) {
      const safe = pool.filter(
        (p) => !BAD_JOIN.has(p + '>' + first) && !BAD_JOIN.has(out[last - 1].p + '>' + p)
      );
      if (safe.length) out[last].p = safe[Math.floor(rnd() * safe.length)];
    }
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
  // กระป๋องออกถี่กว่าโล่กับแม่เหล็กเล็กน้อย แต่บางกว่าสปีด
  // เพราะฤทธิ์มันแรงที่สุดในกลุ่มไอเทม (ทะลุได้ทุกอย่าง 5 วินาที)
  // เจอบ่อยกว่านี้แล้วด่านจะไม่มีช่วงที่ต้องหลบจริง ๆ เหลืออยู่เลย
  place(9, (st) => { st.can = true; }, true);
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
      this.fishes, this.letters, this.nips, this.cans,
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
    this.cans = [];          // อาหารกระป๋อง กินแล้วตัวโต
    this.fallers = [];       // ของร่วงจากเพดาน เป็นอันตราย ไม่ใช่ของเก็บ
    this.hazards = [];       // อันตรายที่ขยับได้ (ไฟ / ผึ้ง / ลูกบอล)
    this.plats = [];         // พื้นเหยียบได้ — เนินกับพื้นลอย (ดู footing)
    this.nextChunkX = 900;   // เว้นที่ว่างตอนเริ่มเกม
    this.chunkIndex = 0;
  }

  /**
   * ล้างด่านทิ้งแล้วเริ่มปูใหม่จากพิกัดที่กำหนด
   *
   * ต่างจาก reset() ตรงที่ reset() ตรึง nextChunkX ไว้ที่ 900 เสมอ
   * ซึ่งถูกเฉพาะตอนเปิดเกมที่กล้องอยู่ที่ 0 ใช้กลางเกมไม่ได้เพราะกล้องไปไกลแล้ว
   *
   * ใช้ตอนปลาพาลงมาส่งหลังจบโบนัส — ระหว่างลอยอยู่บนฟ้ากล้องวิ่งไปไกลมาก
   * โดยไม่มีใครสร้างด่านรอไว้ ตรงนี้จึงเป็นจุดที่ปูใหม่ทั้งหมดได้อย่างสะอาด
   */
  restartAt(x, route, theme) {
    this.reset(route, theme);
    this.nextChunkX = x;
  }

  spawnChunk() {
    if (!this.route.length) return;   // ยังไม่ได้ตั้งด่าน อย่าสร้างอะไรทั้งนั้น

    // วนด่านซ้ำเมื่อจบลำดับ — endless runner จึงยังวิ่งต่อได้ไม่รู้จบ
    // แต่เส้นทางเหมือนเดิมทุกรอบ ผู้เล่นจำได้และทำสถิติแข่งกับตัวเองได้
    const step = this.route[this.chunkIndex % this.route.length];

    // step.fn = ท่อนที่มากับทางเข้าด่าน (gates.js) ไม่ได้อยู่ในคลัง PATTERNS ที่สุ่มได้
    const c = step.fn ? step.fn(this.nextChunkX) : PATTERNS[step.p](this.nextChunkX);
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
    // ── ของพิเศษที่ตัวท่อนวางเอง ──
    // ต่างจากของประจำแมพ (scene.faller / scene.hazard) ตรงที่ตัวจับเวลาไม่ได้เป็นคนเลือกจุด
    // แต่คนออกแบบท่อนเลือกเอง ใช้ตอนอยากได้จังหวะเฉพาะ เช่นผึ้งลอยรออยู่ตรงปลายโค้งพอดี
    // พิกัดเป็นพิกัดโลกเหมือนของอย่างอื่นในท่อน เพราะแพตเทิร์นรับ x ของท่อนไปแล้ว
    if (c.fallers) for (const f of c.fallers) this.addFaller(f.x, f.warn, true);
    if (c.hazards) for (const h of c.hazards) this.addHazard(h.kind, h.x, true, h.phase);
    // พื้นเหยียบของท่อน — ต้องมาก่อนของอย่างอื่นในเฟรมเดียวกัน ไม่งั้นเฟรมแรกที่ท่อน
    // โผล่เข้าจอจะยังไม่มีผิวให้ยืน แมวที่กำลังลอยอยู่เหนือมันพอดีจะร่วงทะลุ
    if (c.plats) this.plats.push(...c.plats);

    // ไอเท็มที่ท่อนวางเอง — ต่างจาก step.magnet/letter ที่ให้ระบบหาที่โล่งให้
    if (c.pickups) for (const p of c.pickups) this.addPickup(p.kind, p.x);

    if (step.magnet) this.spawnMagnet(this.nextChunkX, w);
    if (step.letter) this.spawnLetter(this.nextChunkX, w);
    if (step.nip) this.spawnNip(this.nextChunkX, w);
    if (step.can) this.spawnCan(this.nextChunkX, w);

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
    const limit = Math.min(fromX + chunkW, this.knownTo);
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
    const limit = Math.min(fromX + chunkW, this.knownTo);
    for (let x = fromX; x < limit; x += 24) {
      if (this.isClearSpot(x)) {
        this.addFaller(x, warnFrames);
        return;
      }
    }
    // ท่อนนี้แน่นจนไม่มีจุดปลอดภัย — ไม่หย่อนดีกว่าหย่อนลงจุดที่หลบไม่ได้
  }

  /**
   * หย่อนของร่วงลงพิกัดที่บอกมาเป๊ะ ๆ ไม่ต้องหาจุดให้
   * ใช้โดยท่อนที่ออกแบบเอง ซึ่งคนวางเลือกจุดไว้แล้วและเห็นผังทั้งท่อนตอนวาง
   * ความปลอดภัยยังมีให้อยู่: updateFallers กรองชิ้นที่ไปอยู่ใต้คานออกทุกเฟรม (ดู underBar)
   */
  addFaller(x, warnFrames = FALLER.warnFrames, hold = false) {
    this.fallers.push({
      x,
      y: -40,
      w: FALLER.w,
      h: FALLER.h,
      warn: warnFrames,   // นับถอยหลังช่วงเตือน 0 = เริ่มร่วง
      hold,               // true = รอให้เข้าจอก่อนถึงเริ่มนับ (ดู updateFallers)
      vy: 0,
      dead: false,
    });
  }

  /**
   * วางไอเท็มลงพิกัดที่ท่อนกำหนด (ดู PICKUPS)
   * ตัวอักษรไม่ได้ระบุตัวในท่อน — ใช้ "ตัวถัดไปที่ผู้เล่นยังไม่ได้เก็บ" เสมอเหมือนที่ระบบวางเอง
   * ไม่งั้นท่อนเดิมวนมาซ้ำจะได้ตัวอักษรตัวเดิมซ้ำจนเก็บครบคำไม่ได้
   */
  addPickup(kind, x) {
    const def = PICKUPS[kind];
    if (!def) return;
    if (kind === 'letter') {
      const idx = this.nextLetter();
      if (idx === null) return;
      this[def.list].push(def.make(x, idx));
      return;
    }
    this[def.list].push(def.make(x));
  }

  /** เดินของร่วงหนึ่งเฟรม — คืน true ถ้ามีชิ้นไหนเพิ่งกระแทกพื้น (ไว้ให้เกมสั่นจอ) */
  updateFallers(dt, camera = Infinity) {
    // กติกาเดียวกับอันตราย — ของร่วงลงใต้คานคือจุดที่หลบไม่ได้ (ดู underBar)
    this.fallers = this.fallers.filter((f) => !this.underBar(f.x, f.w));
    let landed = false;
    for (const f of this.fallers) {
      // ── ของที่ท่อนวางเอง ต้องรอให้เข้าจอก่อนถึงเริ่มนับถอยหลัง ──
      // ท่อนถูกสร้างล่วงหน้าราวหนึ่งจอครึ่ง = ราว 190 เฟรมก่อนผู้เล่นวิ่งถึง
      // ถ้านับตั้งแต่ตอนเกิด (ช่วงเตือนมาตรฐาน 45 เฟรม) มันจะร่วงลงพื้นแล้วหายไป
      // ตั้งแต่ก่อนผู้เล่นเห็นด้วยซ้ำ ส่วนของประจำแมพเกิดที่ริมจอขวาอยู่แล้ว
      // กติกานี้จึงไม่เปลี่ยนจังหวะเดิมของมันเลย
      if (f.hold) {
        if (f.x > camera + VIEW.W) continue;
        f.hold = false;
      }
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
    const limit = Math.min(fromX + chunkW, this.knownTo);
    for (let x = fromX; x < limit; x += 24) {
      if (!this.isClearSpot(x)) continue;

      // ลูกบอลเป็นชนิดเดียวที่ "เคลื่อนที่หลังเกิด" จุดโล่งตอนเกิดจึงไม่พอ
      // มันกลิ้งสวนมาเรื่อย ๆ ถ้าไปหยุดอยู่ใต้คานพอดี ผู้เล่นจะต้องหมอบ (ลุกไม่ได้)
      // แล้วโดนบอลชนโดยไม่มีทางเลี่ยง = แพตเทิร์นที่หลบไม่ได้ ซึ่งผิดกฎ
      // จึงต้องเช็คว่า "ทางที่มันจะกลิ้งผ่าน" โล่งด้วย ไม่ใช่แค่จุดที่มันเกิด
      if (kind === 'ball' && !this.isBallLaneClear(x, camera)) continue;

      this.addHazard(kind, x);
      return;
    }
  }

  /**
   * วางอันตรายลงพิกัดที่บอกมาเป๊ะ ๆ ไม่ต้องหาจุดให้ — คู่กับ addFaller
   *
   * preGuided = true สำหรับของที่ท่อนวางเอง: ห้ามระบบไปปูของกินนำทางทับ
   * เพราะคนออกแบบวางของกินไว้เองแล้ว และสิ่งที่เห็นในเครื่องมือต้องเท่ากับสิ่งที่ได้ในเกม
   * (ดู guideHazard ซึ่งเก็บของกินในเขตอันตรายออกแล้วปูเส้นใหม่แทน)
   */
  addHazard(kind, x, authored = false, phase = undefined) {
    if (kind === 'bee') {
      const b = HAZARD.bee;
      this.hazards.push({
        kind, x, w: b.w, h: b.h,
        // เฟสแกว่งไม่ตรงกันทุกตัว — ยกเว้นตัวที่ท่อนกำหนดเฟสมา
        // คนออกแบบจูนจังหวะผึ้งกับจุดกดไว้แล้ว ถ้าสุ่มใหม่ในเกม ที่ทดสอบไว้ก็ไม่มีความหมาย
        t: phase === undefined ? Math.random() * Math.PI * 2 : phase,
        y: b.midY,
        guided: authored,
      });
    } else if (kind === 'ball') {
      const b = HAZARD.ball;
      this.hazards.push({
        kind, x, w: b.r * 2, h: b.r * 2, y: GROUND_Y - b.r * 2, spin: 0,
        guided: authored,
        hold: authored,   // ยังไม่กลิ้งจนกว่าจะเข้าจอ (ดู updateHazards)
      });
    }
  }

  /**
   * ปูของกินให้ "อ่านออกว่าต้องทำอะไร" กับของอันตรายชิ้นที่เพิ่งวาง
   *
   * ── ทำไมของอันตรายถึงไม่มีของกินนำทางมาแต่แรก ──
   * ของกินถูกปูตอนสร้างท่อน ซึ่งรู้จักแค่หนาม คาน หลุม ที่อยู่ในท่อนนั้น
   * ส่วนของอันตรายถูกวางทีหลังด้วยตัวจับเวลาคนละตัว มันจึงมาโผล่บนทางที่ปูของกิน
   * ไว้เรียบร้อยแล้ว โดยไม่มีอะไรบอกผู้เล่นว่าตรงนี้ต้องกระโดดหรือต้องหมอบ
   *
   * ── สองอย่างที่ทำ ──
   * 1. เก็บของกินที่ไปนอนอยู่ในเขตอันตรายออก — ของกินที่ล่อให้วิ่งเข้าไปเจ็บ
   *    แย่กว่าไม่มีของกินเลย เพราะผู้เล่นเชื่อของกินเป็นเส้นนำสายตาอยู่แล้ว
   * 2. ปูเส้นใหม่ตามทางที่ปลอดภัยของภัยชนิดนั้น
   */
  guideHazard(h, camera) {
    if (!h) return;

    // ── กติกาข้อเดียวที่ทั้งสามชนิดต้องเคารพ ──
    // ห้ามเก็บของกินออกถ้าไม่ได้ปูเส้นใหม่แทน
    // ตอนแรกเขียนเป็นเก็บออกก่อนแล้วค่อยลองปู ผลคือหลายกรณีปูไม่สำเร็จ
    // ผู้เล่นเลยเสียของกินฟรีโดยไม่ได้อะไรกลับมา (วัดแล้ว: หายไปสุทธิถึง 9 เม็ด)
    // สร้างเส้นให้เสร็จก่อน ถ้าเส้นใช้ไม่ได้ก็ไม่แตะอะไรเลย

    if (h.kind === 'bee') {
      // ผึ้งแกว่งขึ้นลง แต่ใต้ท้องเหลือช่องให้หมอบลอดเสมอ (ดู HAZARD.bee)
      // เส้นเตี้ยยาว ๆ ใต้ผึ้ง = บอกว่า "หมอบตรงนี้" และเห็นได้ก่อนถึงตัว
      const gap = 34, n = 11;
      const start = h.x + h.w / 2 - ((n - 1) * gap) / 2;
      const line = [];
      for (let i = 0; i < n; i++) {
        const fx = start + i * gap;
        if (this.isClearSpot(fx, 24)) line.push(...fishLow(fx, 1, 0));
      }
      if (line.length < 4) return;                 // สั้นเกินกว่าจะอ่านเป็นเส้นนำทาง
      this.clearFishIn({
        x: h.x - 150, w: h.w + 300,
        top: HAZARD.bee.midY - HAZARD.bee.amp - 10, bot: 300,
      });
      this.fishes.push(...line);
      return;
    }

    if (h.kind === 'ball') {
      // ลูกบอลกลิ้งสวนมา จุดที่จะเจอกันคำนวณได้จากความเร็วสองฝ่าย
      // วางส่วนโค้งให้จุดสูงสุดตรงจุดนั้นพอดี เม็ดแรกจึงเป็นสัญญาณบอกจังหวะกดในตัว
      const playerX = camera + PLAYER_X;
      const closing = SPEED.run + HAZARD.ball.speed;
      const meetX = playerX + SPEED.run * ((h.x - playerX) / closing);
      const start = meetX - JUMP_PEAK;
      if (start < playerX + JUMP_SPAN) return;     // ใกล้เกินกว่าจะอ่านทัน
      if (!this.spanClear(start, JUMP_SPAN, 24)) return;

      // เก็บออกเฉพาะเม็ดเตี้ยรอบ "จุดที่จะเจอกัน" ซึ่งเป็นเม็ดที่ล่อให้วิ่งไปชนบอล
      // ไม่กวาดทั้งช่วงโค้ง ไม่งั้นของกินหายเป็นแถบโดยได้กลับมาแค่ห้าเม็ด
      this.clearFishIn({ x: meetX - 70, w: 140, top: 240, bot: GROUND_Y });
      this.fishes.push(...fishJump(start, 5));
    }
  }

  /** เก็บของกินที่อยู่ในกรอบนี้ออก — ใช้กันไม่ให้ของกินล่อเข้าไปในเขตอันตราย */
  clearFishIn(b) {
    this.fishes = this.fishes.filter(
      (f) => !(f.x > b.x && f.x < b.x + b.w && f.y > b.top && f.y < b.bot)
    );
  }

  /**
   * ช่วง x นี้โล่งตลอดหรือไม่ — เช็คเป็นช่วง ไม่ใช่จุดเดียว
   *
   * pad ตั้งเองได้ ค่าปริยายของ isClearSpot คือระยะเผื่อของ "ขวดพลัง" ซึ่งกว้างมาก
   * เพราะขวดต้องเก็บได้ระหว่างวิ่งผ่านโดยไม่ต้องเล็ง ส่วนเส้นของกินนำทางไม่ต้องการ
   * ระยะเผื่อขนาดนั้น ใช้ค่าเดิมแล้วเกือบทุกเส้นจะถูกปฏิเสธทั้งเส้น
   */
  spanClear(x, w, pad) {
    for (let p = x; p <= x + w; p += 24) if (!this.isClearSpot(p, pad)) return false;
    return true;
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

  /**
   * ตาข่ายกันจุดที่หลบไม่ได้ — คืนค่าจริงถ้าช่วง x นี้อยู่ใต้คาน
   *
   * ── ทำไมต้องเช็คซ้ำทุกเฟรม ทั้งที่ตอนวางก็เช็คแล้ว ──
   * ตอนวางเช็คด้วย isClearSpot() ซึ่งถูกต้อง ณ เวลานั้น แต่วัดจริงแล้วยังมี
   * ราว 2% ที่ของถูกวางบนที่โล่ง แล้วมีคานมาอยู่ตรงนั้นทีหลัง
   * (ยังไม่ได้ไล่หาต้นเหตุที่แน่ชัด — ดูบันทึกการวัดในการสนทนา)
   *
   * ใต้คานผู้เล่นต้องหมอบและลุกไม่ได้ ส่วนของร่วงกับอันตรายชนแมวที่หมอบอยู่
   * = ไม่มีท่าไหนรอด การเช็คซ้ำตรงนี้จึงรับประกันกฎ "ห้ามมีแพตเทิร์นที่หลบไม่ได้"
   * ได้โดยไม่ต้องรู้ว่าต้นเหตุมาจากไหน ซึ่งสำคัญกว่าการรู้สาเหตุ
   *
   * ราคาถูกมาก: ของพวกนี้มีอยู่ไม่กี่ชิ้นต่อเฟรม และคานก็มีไม่กี่อันในจอ
   */
  underBar(x, w) {
    return this.obstacles.some(
      (o) => o.kind === 'bar' && x < o.x + o.w && o.x < x + w
    );
  }

  /**
   * ช่วง x นี้มีของที่ "ต้องกระโดดข้าม" อยู่ไหม (หนาม/ลัง/หลุม)
   *
   * ใช้คู่กับ underBar เพื่อคุมกฎเดียวกันจากอีกด้าน:
   * ของที่บังคับให้หมอบ (ไฟเพดาน) ห้ามไปคร่อมของที่บังคับให้กระโดด
   * ไม่งั้นก็คือจุดที่ไม่มีท่าไหนรอดเหมือนกัน แค่สลับฝั่งกัน
   */
  hasSolid(x, w) {
    const hit = (o) => x < o.x + o.w && o.x < x + w;
    return this.obstacles.some((o) => o.kind !== 'bar' && hit(o)) || this.pits.some(hit);
  }

  /** เดินอันตรายที่ขยับได้หนึ่งเฟรม แล้วทิ้งชิ้นที่พ้นจอไปแล้ว */
  updateHazards(dt, camera) {
    for (const h of this.hazards) {
      // ชิ้นที่โดนพุ่งชนไปแล้ว ปลิวด้วยแรงที่ได้รับ (เดินฟิสิกส์ที่ game.js)
      // ไม่ต้องเดินท่าประจำตัวอีก ไม่งั้นผึ้งจะยังแกว่งอยู่ทั้งที่กำลังปลิว
      if (h.smashed) continue;
      if (h.kind === 'bee') {
        const b = HAZARD.bee;
        h.t += b.speed * dt;
        h.y = b.midY + Math.sin(h.t) * b.amp;
      } else if (h.kind === 'ball') {
        // เหตุผลเดียวกับของร่วงที่ท่อนวางเอง — ถ้าเริ่มกลิ้งตั้งแต่ตอนเกิด
        // กว่าผู้เล่นจะมาถึงมันจะเลยจุดที่คนออกแบบวางไว้ไปแล้วราว 450px
        if (h.hold) {
          if (h.x > camera + VIEW.W) continue;
          h.hold = false;
        }
        h.x -= HAZARD.ball.speed * dt;   // กลิ้งสวนทางที่แมววิ่ง
        h.spin -= 0.12 * dt;
        // ── เก็บของกินเตี้ยที่ลูกบอลกำลังจะกลิ้งทับ ──
        // ลูกบอลเดินทางข้ามด่านทั้งเส้น ต่างจากผึ้งกับไฟที่อยู่กับที่
        // เก็บทีเดียวตอนเกิดจึงไม่พอ มันจะไปทับเส้นของกินที่ปูไว้ก่อนแล้วเรื่อย ๆ
        // กลายเป็นแถวของกินที่ชี้ตรงเข้าหาลูกบอลพอดี ซึ่งตรงข้ามกับการนำทาง
        //
        // ทำเฉพาะตอนอยู่ในระยะตัดสินใจ (ราวหนึ่งช่วงกระโดดครึ่ง) ไม่ใช่ตลอดทาง
        // ถ้าเก็บตลอดทางที่มันกลิ้ง จะกินของกินไปราวสี่สิบเม็ดต่อลูก
        // ซึ่งเป็นของที่ผู้เล่นเก็บได้จริงหลังกระโดดข้ามไปแล้ว
        if (h.x - (camera + PLAYER_X) < 300) {
          this.clearFishIn({ x: h.x - 30, w: h.w + 60, top: 250, bot: GROUND_Y });
        }
      }
    }
    // ── ปูของกินนำทางตอนที่ของอันตราย "เข้ามาใกล้พอ" ──
    // เคยปูตอนวางของอันตราย ซึ่งเร็วเกินไป: ของอันตรายถูกวางล้ำหน้าเขตที่สร้างแล้ว
    // ตอนนั้นตรงนั้นยังไม่มีของกินให้เก็บออก และท่อนที่สร้างตามมาทีหลังก็ปูของกิน
    // ของตัวเองทับเส้นที่เพิ่งวางไปจนหมด (วัดแล้ว: ผึ้ง 2 ตัว ได้เส้นนำทาง 0 ตัว)
    //
    // รอให้เข้ามาในระยะหนึ่งจอครึ่งก่อน ตรงนั้นถูกสร้างเสร็จแน่นอนแล้ว
    // และยังไกลพอที่ผู้เล่นจะเห็นเส้นก่อนถึงตัว
    for (const h of this.hazards) {
      if (h.guided || h.smashed) continue;
      if (h.x > camera + VIEW.W * 1.5) continue;
      h.guided = true;
      this.guideHazard(h, camera);
    }

    // ทิ้งชิ้นที่ไปอยู่ใต้คาน (ดู underBar) ก่อนกรองเรื่องพ้นจอตามปกติ
    this.hazards = this.hazards.filter((h) => {
      // ชิ้นที่โดนชนไม่ต้องผ่านกฎเรื่องคาน/หนามอีก มันไม่ใช่ภัยแล้ว
      if (h.smashed) return h.life > 0 && h.y < VIEW.H + 180;
      if (this.underBar(h.x, h.w)) return false;            // ไปอยู่ใต้คาน
      return true;
    });
    // ชิ้นที่ปลิวไปข้างหน้าได้ ต้องไม่โดนเส้นตัดท้ายจอเหมือนของที่อยู่กับที่
    this.hazards = this.hazards.filter((h) => h.smashed || h.x + h.w > camera - 120);
  }

  /**
   * กล่องชนของอันตรายชิ้นหนึ่ง — คืน null ถ้าชิ้นนั้นไม่เป็นภัยแล้ว
   * แยกเป็นเมธอดของตัวเอง เพราะฝั่งเกมต้องถามคำถามนี้ทุกเฟรม และกฎว่า
   * "ชิ้นไหนยังเป็นภัย" เป็นเรื่องของด่าน ไม่ใช่ของตัวเกม
   */
  hazardBox(h) {
    if (h.smashed) return null;                       // โดนพุ่งชนไปแล้ว ไม่เป็นภัยอีก
    return { x: h.x, y: h.y, w: h.w, h: h.h };
  }

  /** จุดที่ห่างจากหนาม คาน และหลุมพอที่จะกระโดดเก็บได้โดยไม่โดนอะไร */
  /**
   * ขอบขวาสุดที่ตอบได้จริงว่า "ตรงนั้นมีอะไรอยู่บ้าง"
   *
   * ── ทำไมต้องมีตัวนี้ ──
   * isClearSpot() ตอบจาก this.obstacles กับ this.pits ซึ่งมีเฉพาะของที่ถูกวางแล้ว
   * เลยจุด nextChunkX ออกไปคือพื้นที่ที่ยังไม่ได้สร้าง มันจึงตอบว่า "โล่ง" เสมอ
   * ทั้งที่ความจริงคือ "ยังไม่รู้" — สองอย่างนี้ต่างกันมาก
   *
   * ตัวที่ไปหาที่ว่างไกล ๆ (ขวดพลัง/ของร่วง/อันตราย) สแกนล้ำเขตนี้ไป 80-120px
   * ของจึงไปลงในที่ว่างปลอม แล้วพอท่อนถัดไปถูกสร้างทับตรงนั้น ก็ได้คานคร่อม
   * ของร่วงพอดี = ต้องหมอบแต่มีของหล่นใส่ ซึ่งหลบไม่ได้ (เจอจริงจากการทดสอบ)
   */
  get knownTo() {
    return this.nextChunkX;
  }

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

  /**
   * อาหารกระป๋อง — วิธีหาที่เหมือนต้นหญ้าแมว แต่ไล่จากท้ายท่อนเข้ามา
   *
   * ไล่คนละทิศกับ spawnNip เพราะสองอย่างนี้ลงท่อนเดียวกันได้ (ทุก 7 กับทุก 9
   * ไปตรงกันเป็นระยะ) ถ้าไล่จากหัวท่อนเหมือนกันทั้งคู่ มันจะเจอที่โล่งจุดแรก
   * ที่เดียวกันแล้ววางทับกันสนิทจนเหลือให้เห็นแค่ชิ้นเดียว
   */
  spawnCan(from, w) {
    for (let x = from + w - 140; x > from + 180; x -= 20) {
      if (!this.isClearSpot(x, BIGCAN.clearance)) continue;
      // อย่าไปนั่งทับต้นหญ้าแมวที่เพิ่งวางในท่อนเดียวกัน
      if (this.nips.some((n) => Math.abs(n.x - x) < BIGCAN.clearance)) continue;
      this.cans.push({ x, y: BIGCAN.y, r: BIGCAN.r, got: false });
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
    this.plats = this.plats.filter((p) => p.x + p.w > cut);
    this.shields = this.shields.filter((s) => s.x > cut);
    this.potions = this.potions.filter((p) => p.x > cut);
    this.magnets = this.magnets.filter((m) => m.x > cut);
    this.letters = this.letters.filter((l) => l.x > cut);
    this.nips = this.nips.filter((n) => n.x > cut);
    this.cans = this.cans.filter((c) => c.x > cut);
  }

  isOverPit(worldX) {
    return this.pits.some((p) => worldX > p.x + 6 && worldX < p.x + p.w - 6);
  }

  /**
   * ผิวที่เท้าจะยืนในเฟรมนี้ — null = ไม่มีอะไรรองรับ
   * ตัวละครถามที่นี่ที่เดียว จึงไม่ต้องรู้ว่าด่านนี้มีพื้นเหยียบหรือเปล่า
   */
  surfaceAt(cx, prevX, prevY, y, wasOnGround, pitsSolid) {
    return footing(this.pits, this.plats, cx, prevX, prevY, y, wasOnGround, pitsSolid,
      Math.abs(cx - prevX) / SPEED.run);
  }

  /** ผิวที่สูงที่สุด ณ x ไม่นับพื้นปกติ — ใช้ตอนหาที่โล่งวางของ */
  topAt(worldX) {
    return highestTop(this.plats, worldX);
  }
}
