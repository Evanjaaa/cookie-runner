// src/gates.js
// ─────────────────────────────────────────────────────────────
// ทางเข้าด่าน (Transition Set Piece) — สถานที่จริงที่ผู้เล่นวิ่งผ่านก่อนเข้าฉากใหม่
//
// ระบบเดิม: ครบเวลาฉาก → ต่อทางโล่ง 3 ท่อน → ไล่สีฉากเก่าเป็นฉากใหม่ 5 วินาที
// ผลคือรู้สึกเหมือน "เปลี่ยนสกินฉาก" ไม่ใช่เดินทางไปที่ใหม่
//
// ระบบใหม่สำหรับฉากที่ประกาศ gate ไว้ (stages.js):
//   วิ่งปกติ → เห็นอาคารใหญ่ → เข้าประตู → วิ่งอยู่ข้างใน (อาคารปิดเต็มจอ)
//   → ระหว่างนั้นเตรียมฉากใหม่ (scene-preload.js) → สลับฉาก "ตอนที่จอถูกปิดเต็ม"
//   → ออกประตูหลัง = อยู่ในฉากใหม่เรียบร้อย ไม่มีแสงวาบ ไม่มีไล่สี ไม่มีจอโหลด
//
// ไฟล์นี้เป็น "ข้อมูล + ผังระยะ" ตัวเดินจังหวะอยู่ gate-run.js ภาพอยู่ render/gates/
// ฉากอื่นอยากมีทางเข้า: เพิ่มอ็อบเจกต์ใน GATES + ภาพใน render/gates/ แล้วใส่ gate ใน stages.js
// ─────────────────────────────────────────────────────────────
import { VIEW, SPEED, LEVEL, PLAYER_X, SPEEDUP, FALLER, HAZARD } from './config.js';
import { AUTHOR } from './level.js';
import { PRELOAD_STEPS } from './scene-preload.js';

const { chunkW } = LEVEL;

// ─────────────────────────────────────────────────────────────
// คำนวณระยะทางเข้าจากโครงสร้างจริงของเกม — ไม่ตั้งเลขวินาทีลอย ๆ
//
// 1) ชานหน้าประตู (approach) = W − PLAYER_X
//    ระยะจากตัวแมวถึงขอบจอขวาพอดี ประตูจึงโผล่ที่ขอบจอขวาในจังหวะเดียวกับที่แมว
//    เหยียบพื้นของทางเข้า — ช่วงที่มองเห็นประตู แมวอยู่บนทางเรียบแล้วเสมอ
//    (ตัวอาคารยื่นซ้ายกว่าประตู houseLead จึงเห็นตัวอาคารก่อน ตอนยังวิ่งในฉากเดิม)
//
// 2) ช่วงปิดเต็มจอ (cover) — ต้องยาวพอให้ขั้นเตรียมฉากทำครบ "ขั้นละเฟรม"
//      เฟรมที่ต้องใช้ = ขั้นเตรียม (PRELOAD_STEPS) + 1 เฟรมสลับฉาก + SPARE เฟรมสำรอง
//      ความเร็วที่ใช้คิด = วิ่งปกติ × สปีดจากต้นหญ้าแมว (กรณีเร็วสุดที่เกิดได้บ่อย)
//      × DT_BUDGET (เครื่องที่เฟรมตกเหลือ 30fps เดินสองก้าวต่อหนึ่งภาพ)
//    ถ้าเร็วเกินนี้จริง (ท่าพุ่งของพรสวรรค์) gate-run ทำขั้นที่เหลือให้จบทันทีแทน
//    เกมไม่มีทางค้าง หรือสลับฉากตอนจอยังเห็นข้างนอก
//
// 3) ความยาวข้างใน (interior) = W + cover + ซุ้มประตูหลัง
//    ต้องกว้างกว่าจอ ไม่งั้นไม่มีจังหวะไหนที่จอถูกปิดเต็ม แล้วสลับฉากแบบมองไม่เห็นไม่ได้
//    ซุ้มประตูหลังเป็นช่องมองทะลุ ตอนมันโผล่เข้าจอแล้วจึงไม่นับว่าปิดจอ
//
// 4) ความยาวรวมปัดขึ้นเป็นจำนวนท่อนเต็ม (Level ปูด่านทีละท่อน) ส่วนที่ปัดเกินคือทางหลังออกประตู
// ─────────────────────────────────────────────────────────────
const SPARE_FRAMES = 2;
const DT_BUDGET = 2;
const ARCH_W = 120;   // ความกว้างซุ้มประตู (ภาพ) — ประตูหลังมองทะลุออกไปเห็นฉากใหม่

function computeLayout() {
  const vMax = SPEED.run * SPEEDUP.mult;
  const framesNeeded = PRELOAD_STEPS.length + 1 + SPARE_FRAMES;
  const cover = Math.ceil(framesNeeded * vMax * DT_BUDGET);
  const approach = VIEW.W - PLAYER_X;
  // ประตูหลังเปิดโล่งให้มองเห็นข้างนอก (ฉากใหม่) ได้ — ช่วงที่ขอบประตูหลังโผล่เข้าจอแล้ว
  // จึงนับเป็น "ปิดจอ" ไม่ได้ ต้องบวกความกว้างซุ้มประตูหลังเข้าไปด้วย
  const arch = ARCH_W;
  const interior = VIEW.W + cover + arch;
  const chunks = Math.ceil((approach + interior) / chunkW);
  const length = chunks * chunkW;
  const exit = length - approach - interior;
  return {
    approach, interior, cover, exit, length, chunks, arch,
    frame: 36,          // ความหนาเสาประตู (ภาพ) ที่อยู่หน้าตัวแมว
    houseLead: 260,     // ตัวอาคารยื่นซ้ายเลยประตูเท่านี้ — เห็นตัวอาคารก่อนเห็นประตู
    why: {
      vMax, framesNeeded, dtBudget: DT_BUDGET, preloadSteps: PRELOAD_STEPS.length,
      approachFrames: approach / SPEED.run,
      interiorFrames: interior / SPEED.run,
      coverFrames: cover / SPEED.run,
      totalFrames: length / SPEED.run,
    },
  };
}

// ── ทุกทางเข้าใช้ผังระยะชุดเดียวกัน ──
// ตัวแปรที่ใช้คำนวณ (ความเร็ว จอ ขั้นเตรียมฉาก ซุ้มทางออก) เหมือนกันทุกด่าน
// ของที่ต่างกันระหว่างด่าน เช่นผึ้งของสวนกลางวัน ถูกนับอยู่ในขั้นเตรียมฉาก 'moverArt' อยู่แล้ว
// จึงไม่มีเหตุผลให้ความยาวต่างกัน — ได้ข้อดีเพิ่มคือจังหวะเปลี่ยนฉากทุกด่านเท่ากัน ผู้เล่นคาดเดาได้
const LAYOUT = computeLayout();

// ครบทุกตัวโดยตั้งใจ — โค้ดท่อนที่ส่งออกจากหน้าออกแบบด่านวางแทน chunk ข้างล่างได้ทันที
// ไม่ว่าคนออกแบบจะใช้ตัวช่วยตัวไหน (ตัวที่ยังไม่ได้ใช้ตอนนี้ไม่ทำให้อะไรหนักขึ้น)
/* eslint-disable no-unused-vars */
const {
  JUMP_SPAN, HALF, JUMP_PEAK, DBL_SPAN, DBL_PEAK, DOUBLE_AT, RUN_Y, GAP_W,
  fishAlong, fishJump, fishDouble, fishLow, fishRun, fishWave, fishAbove, fishRunTo,
  arcMid, arcHigh, groundSpike, lowBar, crateStack, withShrimp, withKibble, lift,
} = AUTHOR;
const { spike, bar, crate } = LEVEL;
void FALLER; void HAZARD; void SPEED;
/* eslint-enable no-unused-vars */

// ─────────────────────────────────────────────────────────────
// ทะเบียนทางเข้า
//   stage   ฉากปลายทาง (id ใน stages.js)
//   art     ชื่อชุดภาพใน render/gates/index.js
//   chunk   ของกิน/ไอเท็มตลอดทางเข้า — แก้จากหน้าออกแบบด่านได้ (ตั้ง "ใช้เป็นทางเข้า")
//           x = จุดเริ่มทางเข้า / ท่อนนี้กว้าง layout.length เสมอ
// ─────────────────────────────────────────────────────────────
export const GATES = {
  kitchen: {
    id: 'kitchen',
    name: 'ทางเข้าครัวกลางคืน',
    stage: 'night',
    art: 'kitchen',
    layout: LAYOUT,

    // ── ท่อนเริ่มต้น ──
    // ไม่มีสิ่งกีดขวางโดยตั้งใจ — ช่วงนี้ผู้เล่นควรได้มองสถานที่ ไม่ใช่ต้องหลบของ
    // ของกินเป็นเส้นนำทาง: ทางวิ่งพาเข้าประตู → โค้งกระโดดข้างในมีกุ้งทองเป็นรางวัล (ไม่บังคับ)
    // → ขวดพลังรางวัลผ่านฉาก (เดิมวางบนทางเชื่อม) → ทางวิ่งพาออกประตูหลังเข้าฉากใหม่
    chunk: (x) => {
      const L = LAYOUT;
      const doorIn = x + L.approach;
      const doorOut = doorIn + L.interior;
      const j1 = doorIn + 260;
      const j2 = doorIn + 700;
      // ปัดเป็นจำนวนเต็มแบบเดียวกับหน้าออกแบบด่าน — ท่อนตั้งต้นในหน้านั้นจึงตรงกับของในเกมทุกเม็ด
      const after1 = Math.round(j1 + JUMP_SPAN + 30);
      const after2 = Math.round(j2 + JUMP_SPAN + 30);
      return {
        obs: [],
        pit: [],
        fish: [
          ...fishRun(x + 140, Math.floor((doorIn - 40 - (x + 140)) / 34), 34),
          ...withShrimp(fishJump(j1, 11)),
          ...fishRun(after1, Math.floor((j2 - 40 - after1) / 34), 34),
          ...fishRun(after2, Math.floor((doorOut + 200 - after2) / 34), 34),
        ],
        jumps: [j1, j2],
        pickups: [{ kind: 'potion', x: j2 + 41 }],
        width: L.length,
      };
    },
  },
};

// ─────────────────────────────────────────────────────────────
// ทางเข้าสวนกลางวัน — พุ่มดอกไม้ยักษ์ → อุโมงค์ดอกไม้ → สวน
// ─────────────────────────────────────────────────────────────
GATES.garden = {
  id: 'garden',
  name: 'ทางเข้าสวนกลางวัน',
  stage: 'garden',
  art: 'garden',
  layout: LAYOUT,

  // ── ท่อนเริ่มต้น ──
  // ไม่มีสิ่งกีดขวางเหมือนทางเข้าครัว — ผึ้งประจำด่านก็ไม่ออกในช่วงนี้ (ดู Game.onBridge)
  // ของกินเป็นเส้นนำสายตา:
  //   ทางวิ่งพาเข้าปากพุ่ม → แถวคลื่นลอยขึ้นลงในอุโมงค์เหมือนกลีบดอกไม้ลอยตามลม มีกุ้งทองที่ยอดคลื่น
  //   → กระโดดเก็บขวดพลังรางวัลผ่านฉาก → ทางวิ่งพาออกปากอุโมงค์เข้าสวน
  chunk: (x) => {
    const L = LAYOUT;
    const doorIn = x + L.approach;
    const doorOut = doorIn + L.interior;
    const j1 = doorIn + 720;
    const after1 = Math.round(j1 + JUMP_SPAN + 30);
    return {
      obs: [],
      pit: [],
      fish: [
        ...fishRun(x + 140, Math.floor((doorIn - 40 - (x + 140)) / 34), 34),
        ...withShrimp(fishWave(doorIn + 100, 16, 34, 3)),
        ...fishRun(after1, Math.floor((doorOut + 200 - after1) / 34), 34),
      ],
      jumps: [j1],
      pickups: [{ kind: 'potion', x: j1 + 41 }],
      width: L.length,
    };
  },
};

// ─────────────────────────────────────────────────────────────
// ทางเข้าถ้ำคริสตัล — ภูเขาหินที่มีคริสตัลแทงทะลุ → อุโมงค์คริสตัล → โถงถ้ำ
// ─────────────────────────────────────────────────────────────
GATES.cavern = {
  id: 'cavern',
  name: 'ทางเข้าถ้ำคริสตัล',
  stage: 'cavern',
  art: 'cavern',
  layout: LAYOUT,

  // ── ท่อนเริ่มต้น ──
  // ไม่มีสิ่งกีดขวางเหมือนทางเข้าอีกสองแห่ง — ช่วงนี้ผู้เล่นควรได้มองถ้ำ ไม่ใช่ต้องหลบของ
  // ของกินเป็นเส้นนำสายตาเข้าไปในถ้ำ:
  //   ทางวิ่งพาเข้าปากถ้ำ → แถวเลี้ยวขึ้นเป็นโค้งกระโดดตรงกลางอุโมงค์ ยอดโค้งมีกุ้งทอง
  //   → กระโดดเก็บขวดพลังรางวัลผ่านฉาก → ทางวิ่งยาวพาออกปากถ้ำเข้าฉากถ้ำจริง
  //
  // ── ทำไมโค้งอยู่ลึกกว่าของสองด่านแรก ──
  // ช่วง 55% แรกของอุโมงค์เพดานยังต่ำ (ดู ceilAt ใน render/gates/cavern.js)
  // วางโค้งกระโดดตรงนั้นแล้วหัวน้องจะชนภาพเพดานพอดี ย้ายมาอยู่ช่วงที่ถ้ำเปิดสูงแล้วแทน
  chunk: (x) => {
    const L = LAYOUT;
    const doorIn = x + L.approach;
    const doorOut = doorIn + L.interior;
    const j1 = doorIn + 820;
    const after1 = Math.round(j1 + JUMP_SPAN + 30);
    return {
      obs: [],
      pit: [],
      fish: [
        ...fishRun(x + 140, Math.floor((doorIn - 40 - (x + 140)) / 34), 34),
        ...fishRun(doorIn + 90, Math.floor((j1 - 60 - (doorIn + 90)) / 34), 34),
        ...withShrimp(fishJump(j1, 11)),
        ...fishRun(after1, Math.floor((doorOut + 200 - after1) / 34), 34),
      ],
      jumps: [j1],
      pickups: [{ kind: 'potion', x: j1 + 41 }],
      width: L.length,
    };
  },
};

// ─────────────────────────────────────────────────────────────
// ทางเข้าชายหาดยามเย็น — ซุ้มไม้ริมทะเล → ทางเดินไม้ → ทะเลเปิด → พระอาทิตย์ใกล้ตก
// ─────────────────────────────────────────────────────────────
GATES.beach = {
  id: 'beach',
  name: 'ทางเข้าชายหาดยามเย็น',
  stage: 'beach',
  art: 'beach',
  layout: LAYOUT,

  // ── ท่อนเริ่มต้น ──
  // ไม่มีสิ่งกีดขวางเหมือนทางเข้าอื่น — ช่วงนี้ให้ผู้เล่นได้มองทะเล
  // ของกินเป็นเส้นนำสายตาออกไปทางทะเล:
  //   ทางวิ่งพาลอดซุ้มไม้ → แถวคลื่นลอยขึ้นลงตามจังหวะคลื่นทะเล มีกุ้งทองที่ยอดคลื่น
  //   → กระโดดเก็บขวดพลังรางวัลผ่านฉากช่วงที่ทะเลเปิดกว้างสุด → วิ่งออกซุ้มเข้าชายหาดจริง
  chunk: (x) => {
    const L = LAYOUT;
    const doorIn = x + L.approach;
    const doorOut = doorIn + L.interior;
    const j1 = doorIn + 860;
    const after1 = Math.round(j1 + JUMP_SPAN + 30);
    return {
      obs: [],
      pit: [],
      fish: [
        ...fishRun(x + 140, Math.floor((doorIn - 40 - (x + 140)) / 34), 34),
        ...withShrimp(fishWave(doorIn + 90, 14, 34, 3)),
        ...withShrimp(fishJump(j1, 11)),
        ...fishRun(after1, Math.floor((doorOut + 200 - after1) / 34), 34),
      ],
      jumps: [j1],
      pickups: [{ kind: 'potion', x: j1 + 41 }],
      width: L.length,
    };
  },
};

// ───────────────────────────────────────────────────────────
// ทางเข้าห้วงอวกาศ — ฐานปล่อยยานริมทะเล → ทะยานขึ้น → ทะลุเมฆ → เห็นโลก → ประตูมิติ
//
// ── ทำไมทางเข้านี้ยาวกว่าที่อื่น ──
// ทางเข้าอื่นเล่าเรื่องเดียว ("เข้าไปในที่แห่งหนึ่ง") ช่วงปิดจอ 1209px ≈ 3 วินาทีจึงพอ
// ทางเข้านี้ต้องเล่าห้าช่วงต่อกัน: ทะยานขึ้น → ทะลุเมฆ → ชั้นบรรยากาศ → โลกเผยตัว → อวกาศเปิด
// ให้ช่วงละ ~1.3 วินาที (สั้นกว่านี้ตาอ่านไม่ทันว่าเปลี่ยนอะไร) = 6.7 วินาที
//   6.7 วิ × 60 เฟรม × 6.8 px = 2734px → ต่อความยาวข้างในอีก 2 ท่อน (1520px) ลงตัวพอดี
// ตัวเลขอื่นทั้งหมด (ชานหน้า ซุ้มท้าย ช่วงหลังออก) ใช้ของเดิมไม่แตะ ทางออกจึงยาวเท่ากันทุกด่าน
// ───────────────────────────────────────────────────────────
const LONG_EXTRA = chunkW * 2;
const LONG_LAYOUT = {
  ...LAYOUT,
  interior: LAYOUT.interior + LONG_EXTRA,
  length: LAYOUT.length + LONG_EXTRA,
  chunks: LAYOUT.chunks + 2,
  why: {
    ...LAYOUT.why,
    interiorFrames: (LAYOUT.interior + LONG_EXTRA) / SPEED.run,
    totalFrames: (LAYOUT.length + LONG_EXTRA) / SPEED.run,
    note: 'ยาวกว่าที่อื่น 2 ท่อน เพราะต้องเล่าหลายช่วงในทางเดียว (ห้วงอวกาศ / ทุ่งหิมะ)',
  },
};

GATES.space = {
  id: 'space',
  name: 'ทางเข้าห้วงอวกาศ',
  stage: 'space',
  art: 'space',
  layout: LONG_LAYOUT,

  // ── ท่อนเริ่มต้น ──
  // ไม่มีสิ่งกีดขวางเหมือนทางเข้าอื่น ของกินเป็นเส้นนำสายตาไล่ตามจังหวะของฉาก:
  //   ทางวิ่งพาเข้าเสาลิฟต์ → โค้งกระโดดตรงจังหวะทะลุเมฆ (กุ้งทองที่ยอดโค้ง)
  //   → แถวคลื่นยาวช่วงลอยผ่านชั้นบรรยากาศ ให้ความรู้สึกลอยไร้น้ำหนัก
  //   → โค้งกระโดดที่สองตรงจังหวะโลกเผยตัว + ขวดพลังรางวัลผ่านฉาก
  //   → ทางวิ่งยาวลอดประตูมิติเข้าห้วงอวกาศจริง
  chunk: (x) => {
    const L = LONG_LAYOUT;
    const doorIn = x + L.approach;
    const doorOut = doorIn + L.interior;
    const j1 = doorIn + 620;
    const after1 = Math.round(j1 + JUMP_SPAN + 30);
    const j2 = doorIn + 1900;
    const after2 = Math.round(j2 + JUMP_SPAN + 30);
    return {
      obs: [],
      pit: [],
      fish: [
        ...fishRun(x + 140, Math.floor((doorIn - 40 - (x + 140)) / 34), 34),
        ...fishRun(doorIn + 90, Math.floor((j1 - 60 - (doorIn + 90)) / 34), 34),
        ...withShrimp(fishJump(j1, 11)),
        ...fishWave(after1, 16, 34, 3),
        ...withShrimp(fishJump(j2, 11)),
        ...fishRun(after2, Math.floor((doorOut + 200 - after2) / 34), 34),
      ],
      jumps: [j1, j2],
      pickups: [{ kind: 'potion', x: j2 + 41 }],
      width: L.length,
    };
  },
};

// ───────────────────────────────────────────────────────────
// ทางเข้าทุ่งหิมะ — ร่อนลงจากอวกาศ → หิมะเริ่มตก → พายุหิมะ → ทุ่งหิมะเปิดออก
// ไม่มีประตู ไม่มีถ้ำ ไม่มีซุ้ม — สิ่งที่พาเปลี่ยนฉากคือ "อากาศ" (ดู render/gates/snowstorm.js)
// ใช้ผังระยะยาวพิเศษชุดเดียวกับห้วงอวกาศ เพราะต้องเล่า ร่อนลง → พายุ → เผยทุ่ง ต่อกัน
// ───────────────────────────────────────────────────────────
GATES.snow = {
  id: 'snow',
  name: 'ทางเข้าทุ่งหิมะ',
  stage: 'snow',
  art: 'snowstorm',
  layout: LONG_LAYOUT,

  // ── ท่อนเริ่มต้น ──
  // ของกินเดินตามจังหวะของพายุ:
  //   ทางวิ่งเข้าปากทาง → โค้งกระโดดตอนเริ่มร่อนลง (กุ้งทองที่ยอดโค้ง)
  //   → แถวคลื่นยาวช่วงพายุ ทำหน้าที่เป็น "ไฟนำทาง" ให้ยังอ่านทางออกได้ตอนจอเกือบขาว
  //   → โค้งกระโดดตอนพายุสงบ + ขวดพลังรางวัลผ่านฉาก → ทางวิ่งยาวเข้าทุ่งหิมะจริง
  chunk: (x) => {
    const L = LONG_LAYOUT;
    const doorIn = x + L.approach;
    const doorOut = doorIn + L.interior;
    const j1 = doorIn + 560;
    const after1 = Math.round(j1 + JUMP_SPAN + 30);
    const j2 = doorIn + 2040;
    const after2 = Math.round(j2 + JUMP_SPAN + 30);
    return {
      obs: [],
      pit: [],
      fish: [
        ...fishRun(x + 140, Math.floor((doorIn - 40 - (x + 140)) / 34), 34),
        ...fishRun(doorIn + 80, Math.floor((j1 - 60 - (doorIn + 80)) / 34), 34),
        ...withShrimp(fishJump(j1, 11)),
        ...fishWave(after1, 20, 34, 4),
        ...withShrimp(fishJump(j2, 11)),
        ...fishRun(after2, Math.floor((doorOut + 200 - after2) / 34), 34),
      ],
      jumps: [j1, j2],
      pickups: [{ kind: 'potion', x: j2 + 41 }],
      width: L.length,
    };
  },
};

export const GATE_LIST = Object.values(GATES);

/** ทางเข้าของฉากหนึ่ง — null ถ้าฉากนั้นยังใช้ทางเชื่อมแบบเดิม */
export function gateFor(stage) {
  return (stage && stage.gate && GATES[stage.gate]) || null;
}

/** ตำแหน่งสำคัญในพิกัดโลก เมื่อทางเข้าเริ่มที่ x0 */
export function gateMarks(def, x0) {
  const L = def.layout;
  const doorIn = x0 + L.approach;
  const doorOut = doorIn + L.interior;
  return {
    x0,
    doorIn,
    doorOut,
    end: x0 + L.length,
    houseL: doorIn - L.houseLead,
    houseR: doorOut + L.frame,
    // จอถูกปิดเต็มเมื่อกล้อง (ขอบจอซ้าย) อยู่ในช่วงนี้
    coverFrom: doorIn,
    coverTo: doorOut - L.arch - VIEW.W,
  };
}
