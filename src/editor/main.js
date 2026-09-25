// src/editor/main.js
// ─────────────────────────────────────────────────────────────
// โต๊ะออกแบบด่าน — หน้าเครื่องมือสำหรับวาง "ท่อน" (chunk) ด้วยมือ
//
// หลักการเดียวที่ทั้งไฟล์นี้ยึด: ห้ามมีสูตรของตัวเอง
// ทุกพิกัด ทุกส่วนโค้ง ทุกรูปทรง ดึงมาจาก level.js/config.js ชุดเดียวกับเกมจริง
// (ผ่าน AUTHOR) และวาดด้วยฟังก์ชันวาดตัวเดียวกับเกมจริง
// ผลคือสิ่งที่เห็นบนหน้านี้ = สิ่งที่ได้เมื่อวางโค้ดลง PATTERNS แบบตรงตัว
//
// โครงเอกสารหนึ่งท่อน (doc):
//   { id, name, width, kind, diff, items: [...] }
// แต่ละ item เก็บ "ความตั้งใจ" ไม่ใช่ผลลัพธ์ เช่น
//   { t:'fishJump', link:{ id:<จุดกด>, key:'AT' }, n:11 }
// แปลว่า "ปลาเรียงตามโค้งกระโดดที่ออกจากจุดกดอันนั้น 11 เม็ด"
// พอเลื่อนจุดกด ของทุกชิ้นที่เกาะอยู่ขยับตามเอง และโค้ดที่ export ออกไป
// ก็เขียนเป็น j1 + HALF เหมือนที่คนเขียนเองในไฟล์ ไม่ใช่ตัวเลขดิบ
// ─────────────────────────────────────────────────────────────
import './editor.css';
import {
  GROUND_Y, VIEW, LEVEL, BODY, SPEED, PLAYER_X, PHYSICS, FALLER, HAZARD, SHRIMP,
  SPEEDUP, BIGCAN, MAGNET, SHIELD, POTION, LETTER, WORD,
} from '../config.js';
import {
  AUTHOR, PATTERNS, PATTERN_META, PICKUPS, Level, composeRoute,
  platTop, highestTop, footing,
} from '../level.js';
import { drawPlats } from '../render/platforms.js';
import { GATES, GATE_LIST, gateMarks } from '../gates.js';
import { gateViewAt, doorOpenAt } from '../gate-run.js';
import { drawGateBack, drawGateFront, warmGateArt } from '../render/gates/index.js';
import { STAGES } from '../stages.js';
import { drawSky, drawHills, drawGround, GROUND_ART } from '../render/background.js';
import {
  drawObstacles, drawTreats, drawPlayer, drawFallers, drawHazards,
  drawNips, drawCans, drawMagnets, drawShields, drawPotions, drawLetters,
} from '../render/entities.js';
import { SKINS } from '../skins.js';
import { PROP_OBSTACLES, PROP_LIST, isLowObstacle } from '../obstacles.js';

const A = AUTHOR;
const { spike, bar, crate, chunkW } = LEVEL;
const W = VIEW.W;
const H = VIEW.H;

// ─────────────────────────────────────────────────────────────
// จุดเกาะ — ตำแหน่งบนส่วนโค้งกระโดดที่ "มีความหมาย" ในการออกแบบ
// ตัวเลขมาจาก level.js ทั้งหมด ที่นี่แค่ตั้งชื่อไทยให้เลือกได้
// ─────────────────────────────────────────────────────────────
const ANCHORS = {
  AT:        { v: 0,                        label: 'ตรงจุดกด',        code: null },
  HALF:      { v: A.HALF,                   label: 'กลางโค้งเดี่ยว',   code: 'HALF' },
  JUMP_PEAK: { v: A.JUMP_PEAK,              label: 'ยอดโค้งเดี่ยว',    code: 'JUMP_PEAK' },
  JUMP_SPAN: { v: A.JUMP_SPAN,              label: 'จุดลงพื้น (เดี่ยว)', code: 'JUMP_SPAN' },
  DBL_PEAK:  { v: A.DBL_PEAK,               label: 'ยอดโค้งสองชั้น',   code: 'DBL_PEAK' },
  DBL_SPAN:  { v: A.DBL_SPAN,               label: 'จุดลงพื้น (สองชั้น)', code: 'DBL_SPAN' },
  DOUBLE:    { v: A.DOUBLE_AT * SPEED.run,  label: 'กดชั้นสองกลางอากาศ', code: 'DOUBLE_AT * SPEED.run' },
};

/** จุดเกาะที่ของแต่ละชนิดใช้ได้ — ชนิดไหนไม่มีในตารางนี้คือเกาะไม่ได้ */
const ANCHOR_SET = {
  obs:  ['AT', 'HALF', 'JUMP_PEAK', 'JUMP_SPAN', 'DBL_PEAK', 'DBL_SPAN'],
  // ไอเท็มวางที่ "จุดกึ่งกลาง" อยู่แล้ว (x ของไอเท็มคือกลางตัว) จึงไม่อยู่ใน CENTERED
  item: ['AT', 'HALF', 'JUMP_PEAK', 'JUMP_SPAN', 'DBL_PEAK', 'DBL_SPAN'],
  // ของพิเศษเกาะได้เหมือนของแข็ง — ประโยชน์หลักคือ "วางผึ้งไว้ตรงยอดโค้ง"
  // ซึ่งเป็นจุดที่ผู้เล่นลอยอยู่พอดี ถ้าไม่เกาะจุดกดจะจูนตำแหน่งแบบนั้นยากมาก
  sp:   ['AT', 'HALF', 'JUMP_PEAK', 'JUMP_SPAN', 'DBL_PEAK', 'DBL_SPAN'],
  arc:  ['AT'],
  jump: ['DOUBLE', 'JUMP_SPAN', 'DBL_SPAN'],
};

/**
 * ของที่วาง "กึ่งกลางชิ้น" ตรงจุดเกาะ
 * ของแข็งกับของพิเศษเป็นก้อนที่มีความกว้าง จุดที่คนออกแบบคิดถึงคือกลางก้อน
 * ส่วนของกินเป็นแถวที่ไหลไปทางขวา จุดที่คิดถึงคือเม็ดแรก จึงใช้ขอบซ้าย
 */
const CENTERED = new Set(['obs', 'sp']);

// ─────────────────────────────────────────────────────────────
// ไอเท็มตัวช่วย
//
// ⚠ กติกาถาวร — เพิ่มไอเท็มหรือของกินชนิดใหม่ในเกมเมื่อไหร่ ต้องมาเติมหน้านี้ด้วยเสมอ
//   ไอเท็ม:  1) PICKUPS ใน src/level.js (รูปร่างตอนเกิด + array ที่มันไปอยู่)
//            2) ITEM_DEFS ข้างล่าง (ชื่อ คำอธิบาย ภาพ ระยะเก็บ ผลในการจำลอง)
//            3) ถ้าผลของมันเปลี่ยนการเล่น (ชน/หลุม/เก็บของ) ให้สอน simulate() ด้วย
//   ของกิน:  ถ้าเป็นแค่หน้าตา/คะแนนใหม่บนเม็ดเดิม ให้เพิ่มเป็นตัวเลือกใน TOPS
//            ถ้าเป็นรูปแถวใหม่ ให้เพิ่มตัวช่วยใน AUTHOR แล้วเพิ่มชิปใน KIT + build() + toCode()
//   กล่องเครื่องมือสร้างชิปไอเท็มจากตารางนี้เอง เติมแถวเดียวก็โผล่ในกล่องทันที
// ─────────────────────────────────────────────────────────────
const ITEM_DEFS = {
  nip: {
    label: 'ต้นหญ้าแมว (สปีด)', sub: `เร็ว ×${SPEEDUP.mult} ${SPEEDUP.frames / 60} วิ · ชนของกระเด็น`,
    r: SPEEDUP.r, pickR: SPEEDUP.pickR, effect: 'boost', frames: SPEEDUP.frames, draw: drawNips,
  },
  can: {
    label: 'อาหารกระป๋อง (ตัวโต)', sub: `ตัวโต ${BIGCAN.frames / 60} วิ · ชนของกระเด็น ข้ามหลุม`,
    r: BIGCAN.r, pickR: BIGCAN.pickR, effect: 'big', frames: BIGCAN.frames, draw: drawCans,
  },
  magnet: {
    label: 'แม่เหล็ก', sub: `ดูดของกินรัศมี ${MAGNET.range}px ${MAGNET.frames / 60} วิ`,
    r: MAGNET.r, pickR: MAGNET.pickR, effect: 'magnet', frames: MAGNET.frames, draw: drawMagnets,
  },
  shield: {
    label: 'โล่', sub: 'กันการชนได้ 1 ครั้ง',
    // ระยะเก็บโล่ในเกมคือ r + 24 (ดู Game ส่วนเก็บโล่) ไม่มีค่า pickR แยก
    r: SHIELD.r, pickR: SHIELD.r + 24, effect: 'shield', draw: drawShields,
  },
  potion: {
    label: 'ขวดพลัง', sub: `ฟื้นพลัง +${POTION.heal}`,
    r: 26, pickR: POTION.pickR, effect: 'heal', draw: drawPotions,
  },
  letter: {
    label: 'ตัวอักษร MEOWZING', sub: 'ในเกมเป็นตัวถัดไปที่ยังไม่ได้เก็บ',
    r: LETTER.r, pickR: LETTER.pickR, effect: 'letter', draw: drawLetters,
  },
};

// ─────────────────────────────────────────────────────────────
// กล่องเครื่องมือ
// group บอกว่าชิ้นนั้นเกาะจุดกดแบบไหน และ export เป็นโค้ดท่าไหน
// ─────────────────────────────────────────────────────────────
/** ชื่อไทยของประเภทสิ่งกีดขวางชุดใหม่ (ชิปในกล่องเครื่องมือ) */
const PROP_TYPE_TH = { singleJump: 'กระโดด', doubleJump: 'กระโดด 2 ชั้น', crouch: 'หมอบ' };
/** วงเล็บต่อท้ายชื่อชิป บอกวิธีผ่านแบบเห็นปุ๊บรู้ปั๊บ */
const PROP_TAG = { singleJump: '(กระโดด 1)', doubleJump: '(กระโดด 2)', crouch: '(หมอบ)' };

const KIT = [
  { t: 'jump', group: 'jump', pal: 'mark', label: 'จุดกด', sub: 'กระโดด 1 ครั้ง' },

  { t: 'spike', group: 'obs', pal: 'obs', label: 'หนาม', sub: `${spike.w}×${spike.h}` },
  { t: 'spikeRow', group: 'obs', pal: 'obs', label: 'หนามคู่', sub: 'ยืดปลายขวาได้', n: 2, gap: 44 },
  { t: 'spikeRow', group: 'obs', pal: 'obs', label: 'หนามสามชิ้น', sub: 'กว้างเกินโค้งเดี่ยว', n: 3, gap: 44 },
  { t: 'crate', group: 'obs', pal: 'obs', label: 'กล่องลัง 1 ชั้น', sub: 'ข้ามสบาย', rows: 1 },
  { t: 'crate', group: 'obs', pal: 'obs', label: 'กล่องลัง 2 ชั้น', sub: 'ต้องกดตรงจังหวะ', rows: 2 },
  { t: 'crate', group: 'obs', pal: 'obs', label: 'กล่องลัง 3 ชั้น', sub: 'บังคับกดสองชั้น', rows: 3 },
  { t: 'bar', group: 'obs', pal: 'obs', label: 'คานเตี้ย', sub: 'หมอบลอดเท่านั้น' },
  { t: 'pit', group: 'obs', pal: 'obs', label: 'หลุม', sub: 'ยืดปลายขวาได้', w: 132 },
  { t: 'pit', group: 'obs', pal: 'obs', label: 'หลุมกว้าง', sub: `${A.GAP_W}px ต้องกดสองชั้น`, w: A.GAP_W },

  { t: 'fishRun', group: 'free', pal: 'food', label: 'แถวพื้น', sub: 'วิ่งเก็บ ไม่ต้องกระโดด', n: 8, gap: 34, wide: true },
  { t: 'fishJump', group: 'arc', pal: 'food', label: 'โค้งกระโดดเดี่ยว', sub: 'เต็มใบ เม็ดแรก = จุดกด', n: 11, wide: true },
  { t: 'fishDouble', group: 'arc', pal: 'food', label: 'โค้งกระโดดสองชั้น', sub: 'เต็มใบ', n: 11, wide: true },
  { t: 'arcMid', group: 'arc', pal: 'food', label: 'ซุ้มโค้งเดี่ยว', sub: 'ตัดหางล่างทิ้ง', n: 11, wide: true },
  { t: 'arcHigh', group: 'arc', pal: 'food', label: 'ซุ้มโค้งสองชั้น', sub: 'ชั้นบนสุด', n: 11, wide: true },
  { t: 'fishWave', group: 'free', pal: 'food', label: 'แถวคลื่น', sub: 'วิ่งเก็บ แต่ตาสวยขึ้น', n: 12, gap: 34, humps: 3, wide: true },
  { t: 'fishFlake', group: 'arc', pal: 'food', label: 'ช่อเกล็ดหิมะ', sub: 'เก้าเม็ดที่ยอดโค้งกระโดด', arm: 24 },
  { t: 'fishLow', group: 'free', pal: 'food', label: 'แถวลอดใต้คาน', sub: 'ระดับตอนหมอบ', n: 8, gap: 32, wide: true },

  // ── ของหายาก ──
  // ไม่ใช่ชนิดใหม่ แต่เป็น "แถวเดิม + ของหายากโรยทับ" ด้วยกฎชุดเดียวกับที่เกมโรยเอง
  // (makeShrimp / makeKibble) จึงได้ระยะห่างและจุดวางแบบเดียวกับท่อนที่มีอยู่เป๊ะ ๆ
  { t: 'fishRun', group: 'free', pal: 'food', label: 'กุ้งทองเดี่ยว', sub: 'ของหายากที่สุด ท่อนละตัว', n: 1, gap: 34, top: 'shrimp' },
  { t: 'fishRun', group: 'free', pal: 'food', label: 'แถวอาหารเม็ด', sub: 'เม็ดกลมทั้งแถว', n: 6, gap: 34, top: 'all' },
  { t: 'fishRun', group: 'free', pal: 'food', label: 'แถวกุ้งทอง (โบนัส)', sub: 'กุ้งทองทั้งแถว · ตั้งชั้นได้ในแผงขวา', n: 5, gap: 56, top: 'shrimpAll', wide: true },

  // ── ของพิเศษ ──
  // สามอย่างนี้ "ขยับเอง" ต่างจากทุกชิ้นข้างบนที่อยู่นิ่ง
  // ปกติเกมเป็นคนโรยให้ตามฉาก (scene.faller / scene.hazard) วางเองได้เมื่ออยากคุมจังหวะ
  { t: 'faller', group: 'sp', pal: 'sp', label: 'ของร่วงจากเพดาน', sub: `เตือน ${FALLER.warnFrames} เฟรมก่อนตก`, warn: FALLER.warnFrames, wide: true },
  { t: 'bee', group: 'sp', pal: 'sp', label: 'ผึ้งแกว่ง', sub: 'หมอบลอดได้เสมอ', wide: true },
  { t: 'ball', group: 'sp', pal: 'sp', label: 'ลูกบอลกลิ้งสวน', sub: 'เร็วกว่าฉาก 35%', wide: true },

  // ── ไอเท็มตัวช่วย — สร้างจาก ITEM_DEFS ทั้งหมด ──
  ...Object.entries(ITEM_DEFS).map(([kind, def]) => ({
    t: 'item', kind, group: 'item', pal: 'item', label: def.label, sub: def.sub, wide: true,
  })),

  // ── พื้นเหยียบได้ ──
  // ยังมีแค่ในหน้านี้ เกมจริงยังไม่รู้จัก — ไว้ลองจังหวะให้ลงตัวก่อนค่อยย้ายเข้าเครื่องเกม
  { t: 'hill', group: 'plat', pal: 'plat', label: 'เนินคุกกี้', sub: 'เดินขึ้นได้เลย ไม่ต้องกระโดด', w: 320, h: 70, wide: true },
  { t: 'ledge', group: 'plat', pal: 'plat', label: 'พื้นลอย', sub: 'กระโดดขึ้นไปเหยียบ', w: 200, lift: 90 },
  { t: 'ledge', group: 'plat', pal: 'plat', label: 'พื้นลอยเหนือหลุม', sub: 'ไม่กระโดด = ตก', w: 260, lift: 90, under: true },

  // ── สิ่งกีดขวางชุดใหม่ประจำด่าน ── สร้างจากทะเบียน src/obstacles.js ทั้งหมด (ชื่อ ขนาด ประเภท)
  ...PROP_LIST.map((p) => ({
    t: 'prop', group: 'obs', pal: 'prop', kind: p.id, stage: p.stage,
    label: `${p.name} ${PROP_TAG[p.type]}`,
    sub: `${PROP_TYPE_TH[p.type]} · ${['', 'ง่าย', 'กลาง', 'ยาก'][p.difficulty]} · ${p.note}`,
  })),
];

const PLAT_T = new Set(['hill', 'ledge']);

// ── ความสูงของชั้นต่าง ๆ — วัดจากส่วนโค้งจริงของเกม ไม่ได้ตั้งเลขเอง ──
// แถวเม็ดอาหารตามโค้งสุ่มหนาแน่นพอจะได้จุดสูงสุดเป๊ะ (y ของเม็ด = กลางกล่องชนของแมว)
const PEAK_HOP = Math.min(...A.fishJump(0, 400).map((f) => f.y));
const PEAK_DBL = Math.min(...A.fishDouble(0, 400).map((f) => f.y));
/** เท้ายกพ้นพื้นได้สูงสุดเท่าไหร่ — ใช้บอกว่าพื้นลอยสูงแค่ไหนยังกระโดดขึ้นถึง */
const REACH_HOP = Math.round(A.RUN_Y - PEAK_HOP);
const REACH_DBL = Math.round(A.RUN_Y - PEAK_DBL);

/** ระยะดูดเข้าชั้นตอนลากขึ้นลง — ลากเฉียด ๆ แล้วแถวยังตรงชั้นเป๊ะ ไม่เพี้ยนไปทีละพิกเซล */
const LANE_SNAP = 8;

/** ชั้นของแถวพื้น: rise = ยกขึ้นจากระดับวิ่งกี่ px */
const LANES = [
  ['run', 'ชั้นวิ่ง (พื้น)', 0],
  // ครึ่งทางขึ้นยอดโค้ง — กระโดดจังหวะไหนก็ผ่านชั้นนี้ ใช้วางแถวยาว ๆ ให้เก็บได้บางส่วน
  ['mid', 'ชั้นกลาง (กระโดดจังหวะไหนก็โดน)', Math.round(REACH_HOP / 2)],
  ['hop', 'ชั้นกระโดดเดี่ยว (ยอดโค้ง)', REACH_HOP],
  ['high', 'ชั้นกระโดดสองชั้น (ยอดโค้ง)', REACH_DBL],
  ['surface', 'เกาะผิวพื้นเหยียบ (เนิน/พื้นลอย)', null],
  ['custom', 'กำหนดเอง', null],
];

/**
 * ของหายากที่โรยทับแถวได้ — ค่าตรงกับที่ route ของเกมสั่งได้ทุกตัว
 * เว้น 'all' ที่เพิ่มเข้ามาให้ทำ "แถวอาหารเม็ดล้วน" ซึ่ง route ไม่มีให้สั่ง
 */
const TOPS = [
  ['', 'ปลาล้วน (ปกติ)'],
  ['shrimp', 'กุ้งทอง 1 ตัวที่จุดสูงสุด'],
  ['cluster', 'เม็ดกลมเกาะกลุ่มที่จุดสูงสุด'],
  ['alternate', 'เม็ดกลมสลับทุกเม็ดที่ 3'],
  ['all', 'เม็ดกลมทั้งแถว'],
  ['shrimpAll', 'กุ้งทองทั้งแถว (โบนัส)'],
];

const FOOD_T = new Set(['fishRun', 'fishJump', 'fishDouble', 'arcMid', 'arcHigh', 'fishWave', 'fishLow', 'fishFlake', 'fishDots']);
const NEEDS_TWO = new Set(['fishJump', 'fishDouble', 'arcMid', 'arcHigh', 'fishWave']);
// ช่อเกล็ดหิมะผูกกับยอดโค้งของจุดกระโดด จึงวางเดี่ยว ๆ ได้โดยไม่ต้องบอกจำนวนเม็ด

// ─────────────────────────────────────────────────────────────
// เอกสาร
// ─────────────────────────────────────────────────────────────
const STORE_KEY = 'meowzing:editor:chunks';
let docs = [];
let cur = 0;
let sel = null;         // id ของชิ้นที่เลือก
let undoStack = [];
let redoStack = [];
let nextId = 1;

const view = {
  cam: -100,
  stage: 0,
  refIdx: -1,           // >= 0 = กำลังดูท่อนเดิมของเกม (แก้ไม่ได้)
  arcs: true,
  next: true,
  grid: false,
  xray: true,           // ทางเข้าด่าน: ผนังหน้าอาคารจางไว้ให้เห็นข้างในตอนวางของ
  mode: 'chunk',        // 'chunk' = แก้ท่อนเดียว · 'stage' = จัดลำดับท่อนทั้งด่าน
  slot: 0,              // ท่อนที่เลือกอยู่บนไทม์ไลน์ (โหมดทั้งด่าน)
};

/**
 * ตอนนี้แก้ของในสนามได้ไหม
 *
 * ดูท่อนเดิมของเกม = ไม่ได้ ของพวกนั้นเป็นโค้ดใน level.js ไม่ใช่เอกสาร
 * โหมดทั้งด่าน = ได้เฉพาะท่อนที่กด "แก้ท่อนนี้ให้เป็นของฉัน" ไปแล้ว
 *   ท่อนที่ยังเป็นแพตเทิร์นของเกมอยู่ก็ยังแก้ไม่ได้เหมือนเดิม — แต่แปลงเป็นของเราได้ทุกท่อน
 */
function editing() {
  if (view.refIdx >= 0) return false;
  if (view.mode === 'stage') return !!slotDoc();
  return true;
}

function locked() { return !editing(); }

/**
 * กล้องในพิกัดของ "เอกสาร" ไม่ใช่พิกัดโลก
 *
 * โหมดท่อนเดี่ยววาดเอกสารไว้ที่ x=0 สองค่านี้จึงเท่ากัน
 * แต่โหมดทั้งด่านวางเอกสารไว้กลางด่าน (เช่น x=5016) การชี้เมาส์กับกรอบของชิ้นที่เลือก
 * ต้องหักระยะนั้นออกก่อน ไม่งั้นจะจับของผิดชิ้นไปทั้งท่อน
 */
function editOff() {
  if (view.mode !== 'stage' || !slotDoc()) return 0;
  const s = stageScene().slots[view.slot];
  return s ? s.x : 0;
}

function docCam() { return view.cam - editOff(); }

function uid() { return 'i' + (nextId++); }

function blankDoc(name) {
  return {
    // เลขประจำตัวของเอกสาร — ลำดับท่อนของด่านชี้มาที่ตัวนี้ ({ d: 'i12' })
    // ถ้าใช้ตำแหน่งใน array แทน พอลบท่อนอื่นทิ้งลำดับด่านจะชี้ผิดตัวทันที
    id: uid(),
    name: name || 'ท่อนใหม่',
    width: chunkW,
    kind: 'obstacle',
    diff: 3,
    items: [],
  };
}

/**
 * เอกสารที่กำลังแก้อยู่
 *
 * โหมดทั้งด่านคืนเอกสารของ "ท่อนที่เลือกบนไทม์ไลน์" ไม่ใช่ท่อนที่เลือกในช่องท่อน
 * ทำแบบนี้แล้วเครื่องมือแก้ของทั้งชุด (ลาก ดูดเข้าเกาะ ปุ่มลัด แผงขวา) ใช้ได้ทันที
 * โดยไม่ต้องแก้อะไรเลย เพราะทุกตัวถามหาเอกสารผ่านทางนี้ทางเดียว
 */
function doc() {
  if (view.mode === 'stage') {
    const d = slotDoc();
    if (d) return d;
  }
  return docs[cur];
}

function docById(id) { return docs.find((q) => q.id === id); }

/** เอกสารของท่อนที่เลือกบนไทม์ไลน์ — null = ท่อนนั้นยังเป็นแพตเทิร์นของเกม แก้ไม่ได้ */
function slotDoc() {
  const r = routes[stage().id];
  const s = r && r[view.slot];
  return s && s.d ? docById(s.d) : null;
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) docs = JSON.parse(raw);
  } catch { docs = []; }
  if (!Array.isArray(docs) || !docs.length) docs = [seedDoc()];
  // เลข id ต้องเดินต่อจากของเดิม ไม่งั้นชิ้นใหม่จะไปทับ id เก่า
  for (const d of docs) {
    for (const it of d.items || []) {
      const n = parseInt(String(it.id).slice(1), 10);
      if (n >= nextId) nextId = n + 1;
    }
    const n = parseInt(String(d.id || '').slice(1), 10);
    if (n >= nextId) nextId = n + 1;
  }
  // เอกสารที่บันทึกไว้ก่อนมีระบบลำดับท่อน ยังไม่มีเลขประจำตัว แจกให้ตรงนี้
  for (const d of docs) if (!d.id) d.id = uid();
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(docs)); } catch { /* เต็มก็ช่าง */ }
}

// ─────────────────────────────────────────────────────────────
// ลำดับท่อนของแต่ละด่าน — ของโหมด "ทั้งด่าน"
//
// ── ทำไมต้องเก็บเอง ──
// เกมสร้างลำดับนี้สดทุกครั้งที่เริ่มด่าน (Level.routeFor → composeRoute สุ่มใหม่)
// ซึ่งดีสำหรับคนเล่น แต่จัดแมพด้วยมือไม่ได้เลย เพราะสิ่งที่เห็นบนจอรอบนี้
// ไม่ใช่สิ่งที่ผู้เล่นจะเจอรอบหน้า หน้านี้จึง "ตรึง" ผลครั้งแรกไว้เป็นของตัวเอง
// แก้ทีละท่อนได้ แล้วตอนจบค่อยส่งออกเป็น route: [...] ให้ stages.js ใช้ตรง ๆ
//
// จำนวนท่อนล็อกตามที่ด่านตั้งไว้ (segments) — เพิ่มลบท่อนไม่ได้ในหน้านี้
// เพราะความยาวด่านผูกกับจังหวะของทั้งตา (ทางเข้าด่านถัดไปโผล่ที่ระยะไหน)
// ซึ่งเป็นเรื่องของ stages.js ไม่ใช่ของคนจัดลำดับท่อน
// ─────────────────────────────────────────────────────────────
const ROUTE_KEY = 'meowzing:editor:routes';
let routes = {};

const deep = (o) => JSON.parse(JSON.stringify(o));

/** ชื่อไทยของชนิดท่อน — ใช้ทั้งบนไทม์ไลน์ แถบข้าง และในโค้ดที่ส่งออก */
const KIND_TH = {
  safe: 'ทางโล่ง',
  recovery: 'ช่วงพัก',
  obstacle: 'มีของหลบ',
  challenge: 'ท่อนยาก',
};

/** ของที่ระบบโรยให้ทั้งท่อน (ดู sprinklePickups ใน level.js) — ไอคอนไว้โชว์บนไทม์ไลน์ */
const SPRINKLE = [
  ['letter', '✉', 'ตัวอักษร'],
  ['shrimp', '🦐', 'กุ้งทอง'],
  ['nip', '🌿', 'หญ้าแมว (สปีด)'],
  ['can', '🥫', 'กระป๋อง (ตัวโต)'],
  ['shield', '🛡', 'โล่'],
  ['magnet', '🧲', 'แม่เหล็ก'],
];

function loadRoutes() {
  try { routes = JSON.parse(localStorage.getItem(ROUTE_KEY)) || {}; } catch { routes = {}; }
  if (!routes || typeof routes !== 'object') routes = {};
}

function saveRoutes() {
  try { localStorage.setItem(ROUTE_KEY, JSON.stringify(routes)); } catch { /* เต็มก็ช่าง */ }
}

/** ลำดับท่อนที่กำลังแก้อยู่ของฉากหนึ่ง — ครั้งแรกดึงจากเกมมาตรึงไว้ */
function routeOf(st) {
  if (!Array.isArray(routes[st.id]) || !routes[st.id].length) {
    routes[st.id] = deep(Level.routeFor(st) || []);
    saveRoutes();
  }
  return routes[st.id];
}

/** สุ่มลำดับใหม่ด้วยกฎเดียวกับเกม — ด่านที่เขียน route มือไว้จะได้ของเดิมคืน */
function rerollRoute(st) {
  pushUndo();
  routes[st.id] = st.pool ? deep(composeRoute(st.pool, st.segments || 20)) : deep(st.route || []);
  saveRoutes();
  stageDirty();
}

/**
 * เอกสารตั้งต้นของท่อนทางเข้า — ของชุดเดียวกับ GATES[id].chunk ในเกมตอนนี้
 * (ตรวจแล้วว่า build() ของเอกสารนี้ได้ตำแหน่งเม็ดตรงกับ chunk(0) ทุกเม็ด)
 * ทางเข้าที่ยังไม่มีชุดตั้งต้นจะเริ่มจากท่อนว่าง
 */
function gateStarter(id) {
  const def = GATES[id];
  if (!def) return [];
  const L = def.layout;
  const doorIn = L.approach;
  const doorOut = doorIn + L.interior;
  const row = (x, endX) => ({ id: uid(), t: 'fishRun', group: 'free', x: Math.round(x), n: Math.floor((endX - x) / 34), gap: 34 });

  if (id === 'garden') {
    const j1 = { id: uid(), t: 'jump', group: 'jump', x: doorIn + 720 };
    const after1 = Math.round(j1.x + A.JUMP_SPAN + 30);
    return [
      j1,
      row(140, doorIn - 40),
      { id: uid(), t: 'fishWave', group: 'free', x: doorIn + 100, n: 16, gap: 34, humps: 3, top: 'shrimp' },
      { id: uid(), t: 'item', kind: 'potion', group: 'item', x: j1.x + 41 },
      row(after1, doorOut + 200),
    ];
  }
  if (id === 'beach') {
    const j1 = { id: uid(), t: 'jump', group: 'jump', x: doorIn + 860 };
    const after1 = Math.round(j1.x + A.JUMP_SPAN + 30);
    return [
      j1,
      row(140, doorIn - 40),
      { id: uid(), t: 'fishWave', group: 'free', x: doorIn + 90, n: 14, gap: 34, humps: 3, top: 'shrimp' },
      { id: uid(), t: 'fishJump', group: 'arc', x: 0, n: 11, link: { id: j1.id, key: 'AT' }, top: 'shrimp' },
      { id: uid(), t: 'item', kind: 'potion', group: 'item', x: j1.x + 41 },
      row(after1, doorOut + 200),
    ];
  }
  if (id === 'snow') {
    const j1 = { id: uid(), t: 'jump', group: 'jump', x: doorIn + 560 };
    const j2 = { id: uid(), t: 'jump', group: 'jump', x: doorIn + 2040 };
    const after1 = Math.round(j1.x + A.JUMP_SPAN + 30);
    const after2 = Math.round(j2.x + A.JUMP_SPAN + 30);
    return [
      j1, j2,
      row(140, doorIn - 40),
      row(doorIn + 80, j1.x - 60),
      { id: uid(), t: 'fishJump', group: 'arc', x: 0, n: 11, link: { id: j1.id, key: 'AT' }, top: 'shrimp' },
      { id: uid(), t: 'fishWave', group: 'free', x: after1, n: 20, gap: 34, humps: 4 },
      { id: uid(), t: 'fishJump', group: 'arc', x: 0, n: 11, link: { id: j2.id, key: 'AT' }, top: 'shrimp' },
      { id: uid(), t: 'item', kind: 'potion', group: 'item', x: j2.x + 41 },
      row(after2, doorOut + 200),
    ];
  }
  if (id === 'space') {
    const j1 = { id: uid(), t: 'jump', group: 'jump', x: doorIn + 620 };
    const j2 = { id: uid(), t: 'jump', group: 'jump', x: doorIn + 1900 };
    const after1 = Math.round(j1.x + A.JUMP_SPAN + 30);
    const after2 = Math.round(j2.x + A.JUMP_SPAN + 30);
    return [
      j1, j2,
      row(140, doorIn - 40),
      row(doorIn + 90, j1.x - 60),
      { id: uid(), t: 'fishJump', group: 'arc', x: 0, n: 11, link: { id: j1.id, key: 'AT' }, top: 'shrimp' },
      { id: uid(), t: 'fishWave', group: 'free', x: after1, n: 16, gap: 34, humps: 3 },
      { id: uid(), t: 'fishJump', group: 'arc', x: 0, n: 11, link: { id: j2.id, key: 'AT' }, top: 'shrimp' },
      { id: uid(), t: 'item', kind: 'potion', group: 'item', x: j2.x + 41 },
      row(after2, doorOut + 200),
    ];
  }
  if (id === 'cavern') {
    const j1 = { id: uid(), t: 'jump', group: 'jump', x: doorIn + 820 };
    const after1 = Math.round(j1.x + A.JUMP_SPAN + 30);
    return [
      j1,
      row(140, doorIn - 40),
      row(doorIn + 90, j1.x - 60),
      { id: uid(), t: 'fishJump', group: 'arc', x: 0, n: 11, link: { id: j1.id, key: 'AT' }, top: 'shrimp' },
      { id: uid(), t: 'item', kind: 'potion', group: 'item', x: j1.x + 41 },
      row(after1, doorOut + 200),
    ];
  }
  if (id !== 'kitchen') return [];
  const j1 = { id: uid(), t: 'jump', group: 'jump', x: doorIn + 260 };
  const j2 = { id: uid(), t: 'jump', group: 'jump', x: doorIn + 700 };
  const after1 = j1.x + A.JUMP_SPAN + 30;
  const after2 = j2.x + A.JUMP_SPAN + 30;
  return [
    j1, j2,
    row(140, doorIn - 40),
    { id: uid(), t: 'fishJump', group: 'arc', x: 0, n: 11, link: { id: j1.id, key: 'AT' }, top: 'shrimp' },
    row(after1, j2.x - 40),
    row(after2, doorOut + 200),
    { id: uid(), t: 'item', kind: 'potion', group: 'item', x: j2.x + 41 },
  ];
}

/** ท่อนตัวอย่างตอนเปิดครั้งแรก — เป็นท่อนที่ 1 ของเกมเป๊ะ ๆ ไว้ให้ดูเป็นแบบ */
function seedDoc() {
  const d = blankDoc('ตัวอย่าง: หนามเดี่ยวกลางโค้ง');
  const j = { id: uid(), t: 'jump', group: 'jump', x: 230 };
  d.items = [
    j,
    { id: uid(), t: 'spike', group: 'obs', x: 0, link: { id: j.id, key: 'HALF' } },
    { id: uid(), t: 'fishRun', group: 'free', x: 40, n: 0, gap: 34, runTo: j.id },
    { id: uid(), t: 'fishJump', group: 'arc', x: 0, n: 11, link: { id: j.id, key: 'AT' } },
  ];
  d.kind = 'obstacle';
  d.diff = 2;
  return d;
}

// ─────────────────────────────────────────────────────────────
// จากเอกสาร → ของจริงในเกม
// ─────────────────────────────────────────────────────────────
function itemW(it) {
  if (it.t === 'spike') return spike.w;
  if (it.t === 'spikeRow') return (Math.max(1, it.n) - 1) * it.gap + spike.w;
  if (it.t === 'bar') return bar.w;
  if (it.t === 'crate') return crate.w;
  if (it.t === 'prop') return PROP_OBSTACLES[it.kind] ? PROP_OBSTACLES[it.kind].w : spike.w;
  if (it.t === 'pit') return it.w;
  if (it.t === 'faller') return FALLER.w;
  if (it.t === 'bee') return HAZARD.bee.w;
  if (it.t === 'ball') return HAZARD.ball.r * 2;
  if (PLAT_T.has(it.t)) return it.w;
  return 0;
}

// พื้นเหยียบได้: รูปผิว (platTop/highestTop) กับการหาที่ยืน (footing) มาจาก level.js
// ตัวเดียวกับที่เกมใช้ — หน้านี้จึงไม่มีสูตรของตัวเองตามกฎของโปรเจกต์
const LEDGE_THICK = LEVEL.ledgeThick;

function byId(d, id) { return d.items.find((q) => q.id === id); }

/** x จริงของชิ้นหนึ่ง — ตามจุดเกาะถ้ามี depth กันลูกโซ่วนกลับมาหาตัวเอง */
function xOf(d, it, depth = 0) {
  if (it.link && depth < 4) {
    const j = byId(d, it.link.id);
    if (j && j.t === 'jump') {
      const a = ANCHORS[it.link.key] || ANCHORS.AT;
      const base = xOf(d, j, depth + 1);
      // ดู CENTERED ว่าชนิดไหนวางกึ่งกลาง ชนิดไหนวางขอบซ้าย
      return CENTERED.has(it.group) ? base + a.v - itemW(it) / 2 : base + a.v;
    }
  }
  return it.x;
}

/** จำนวนเม็ดของแถวพื้นที่ยืดไปจนถึงจุดกด — คิดสดทุกครั้ง จะได้ตามจุดกดไปเอง */
function countOf(d, it) {
  if (it.t === 'fishRun' && it.runTo) {
    const j = byId(d, it.runTo);
    if (j) return Math.max(0, Math.floor((xOf(d, j) - xOf(d, it)) / it.gap));
  }
  return it.n;
}

/** แปลงเอกสารเป็นของจริงที่เกมใช้ พร้อมแปะ src ไว้ให้รู้ว่าเม็ดไหนมาจากชิ้นไหน */
function build(d, off = 0) {
  const obs = [];
  const pit = [];
  const fish = [];
  const jumps = [];
  const fallers = [];
  const hazards = [];
  const plats = [];
  const pickups = [];

  // พื้นเหยียบต้องมาก่อน แถวที่ "เกาะผิว" จะได้รู้ว่าผิวอยู่ตรงไหน ไม่ว่าวางชิ้นไหนก่อน
  for (const it of d.items) {
    if (!PLAT_T.has(it.t)) continue;
    const x = xOf(d, it) + off;
    if (it.t === 'hill') plats.push(tag({ kind: 'hill', x, w: it.w, h: it.h }, it));
    else {
      plats.push(tag({ kind: 'ledge', x, w: it.w, top: GROUND_Y - it.lift }, it));
      // หลุมข้างใต้สั้นกว่าตัวพื้นลอยข้างละ 24px — เดินสุดปลายพื้นลอยแล้วยังลงพื้นปกติได้
      if (it.under && it.w > 60) pit.push(tag({ x: x + 24, w: it.w - 48 }, it));
    }
  }

  for (const it of d.items) {
    const x = xOf(d, it) + off;
    const n = countOf(d, it);
    let made = null;

    switch (it.t) {
      case 'jump': jumps.push(x); break;
      case 'spike': obs.push(tag(A.groundSpike(x), it)); break;
      case 'spikeRow':
        for (let i = 0; i < Math.max(1, it.n); i++) obs.push(tag(A.groundSpike(x + i * it.gap), it));
        break;
      case 'bar': obs.push(tag(A.lowBar(x), it)); break;
      case 'crate': obs.push(tag(A.crateStack(x, it.rows), it)); break;
      case 'prop': obs.push(tag(A.propObs(x, it.kind), it)); break;
      case 'pit': pit.push(tag({ x, w: it.w }, it)); break;
      case 'fishJump': made = safeArc(A.fishJump, x, n); break;
      case 'fishDouble': made = safeArc(A.fishDouble, x, n); break;
      case 'arcMid': made = safeArc(A.arcMid, x, n); break;
      case 'arcHigh': made = safeArc(A.arcHigh, x, n); break;
      case 'fishWave': made = safeArc((xx, nn) => A.fishWave(xx, nn, it.gap, it.humps), x, n); break;
      case 'fishFlake': made = A.fishFlake(x, it.arm); break;
      case 'fishDots': made = A.fishDots(x, it.pts || []); break;
      case 'fishRun': made = n > 0 ? A.fishRun(x, n, it.gap) : []; break;
      case 'fishLow': made = n > 0 ? A.fishLow(x, n, it.gap) : []; break;

      // ของพิเศษเก็บรูปร่างตรงกับที่ Level สร้างตอนเกิดจริง (ดู addFaller/addHazard)
      // ตำแหน่งแนวตั้งของ "ของร่วง" ไม่ต้องเก็บ เพราะมันตกจากเพดานลงพื้นเสมอ
      case 'faller':
        fallers.push(tag({ x, w: FALLER.w, h: FALLER.h, warn: warnOf(it) }, it));
        break;
      case 'bee': {
        const b = HAZARD.bee;
        const t = phaseOf(it);
        hazards.push(tag({ kind: 'bee', x, w: b.w, h: b.h, y: b.midY + Math.sin(t) * b.amp, t }, it));
        break;
      }
      case 'item': {
        // รูปร่างตอนเกิดมาจาก PICKUPS ตัวเดียวกับเกม — ตำแหน่งสูงจึงตรงกับของที่ระบบวางเองเสมอ
        const def = PICKUPS[it.kind];
        if (def) pickups.push(tag({ ...def.make(x, it.letter || 0), kind: it.kind }, it));
        break;
      }
      case 'ball': {
        const r = HAZARD.ball.r;
        hazards.push(tag({ kind: 'ball', x, w: r * 2, h: r * 2, y: GROUND_Y - r * 2, spin: 0 }, it));
        break;
      }
      default: break;
    }

    if (made) {
      // ลายวาดเองยกขึ้นลงได้อิสระ ไม่ต้องดูดเข้าชั้นมาตรฐานเหมือนแถวพื้น
      if (it.t === 'fishDots') { if (it.rise) made = A.lift(made, it.rise); }
      else if (it.t === 'fishRun') made = laneOf(made, it, plats);
      if (it.top) made = topping(made, it.top);
      for (const f of made) fish.push(tag(f, it));
    }
  }

  jumps.sort((a, b) => a - b);
  return { obs, pit, fish, jumps, fallers, hazards, plats, pickups };
}

/** เฟสเริ่มแกว่งของผึ้ง (เรเดียน) — เก็บในเอกสารเป็นองศาให้คนอ่านง่าย */
function phaseOf(it) {
  return ((it.phase || 0) * Math.PI) / 180;
}

/**
 * ตั้งความสูงของแถวพื้นจากตำแหน่ง y ที่ลากมา
 * ใกล้ชั้นไหนภายใน LANE_SNAP = ดูดเข้าชั้นนั้น ที่เหลือเป็น "กำหนดเอง"
 */
function setRise(it, wantRise) {
  const r = Math.round(Math.max(-20, Math.min(260, wantRise)));
  const near = LANES.find(([, , v]) => v !== null && Math.abs(v - r) <= LANE_SNAP);
  if (near && near[0] === 'run') { delete it.lane; delete it.rise; return; }
  if (near) { it.lane = near[0]; it.rise = near[2]; return; }
  it.lane = 'custom';
  it.rise = r;
}

/** ยกแถวพื้นไปชั้นที่เลือก — ใช้ lift ตัวเดียวกับที่โค้ดส่งออกเรียก */
function laneOf(items, it, plats) {
  if (it.lane === 'surface') {
    for (const f of items) {
      const top = highestTop(plats, f.x);
      if (top !== null) f.y = top - BODY.standH / 2;
    }
    return items;
  }
  return it.rise ? A.lift(items, it.rise) : items;
}

/** โรยของหายากลงแถวที่เพิ่งสร้าง — ฟังก์ชันชุดเดียวกับที่เกมใช้ตอนวิ่งจริง */
function topping(items, kind) {
  if (kind === 'shrimp') return A.withShrimp(items);
  if (kind === 'shrimpAll') return A.withShrimp(items, 'all');
  return A.withKibble(items, kind);
}

/** ช่วงเตือนของของร่วง — ท่อนเก่าที่บันทึกไว้ก่อนมีช่องนี้จะไม่มีค่า ใช้ค่ากลางของเกมแทน */
function warnOf(it) {
  return it.warn === undefined ? FALLER.warnFrames : it.warn;
}

function tag(o, it) { o.src = it.id; return o; }

/** ตัวช่วยที่หารด้วย (count-1) จะพังถ้า count < 2 — กันไว้ตรงนี้ที่เดียว */
function safeArc(fn, x, n) { return n >= 2 ? fn(x, n) : []; }

// ─────────────────────────────────────────────────────────────
// การวาด
// ─────────────────────────────────────────────────────────────
const cv = document.getElementById('view');
const ctx = cv.getContext('2d');
const strip = document.getElementById('strip');
const sctx = strip.getContext('2d');
const skin = SKINS[0];

let tick = 0;
let scene = null;       // ของจริงที่ build ไว้รอบล่าสุด
let sim = null;         // ผลการจำลอง
let scrubAt = -1;       // เฟรมที่กำลังดูอยู่ (-1 = ไม่แสดงแมว)
let playing = false;

function stage() { return STAGES[view.stage]; }

/** ท่อนอ้างอิงลำดับ i — เลยท้าย PATTERNS คือท่อนของทางเข้าด่าน (GATE_LIST) */
function refChunk(i) {
  return i < PATTERNS.length ? PATTERNS[i] : GATE_LIST[i - PATTERNS.length].chunk;
}
function refGate(i) {
  return i < PATTERNS.length ? null : GATE_LIST[i - PATTERNS.length];
}

function active() {
  // โหมดดูของเดิม: เอาผลจาก PATTERNS / ทางเข้าด่าน ตรง ๆ ไม่ผ่านเอกสาร
  if (view.refIdx >= 0) {
    const p = refChunk(view.refIdx)(0);
    const g = refGate(view.refIdx);
    // ไอเท็มในท่อนเก็บแค่ชนิดกับ x — แปลงเป็นรูปร่างตอนเกิดจริงก่อนวาด
    const pickups = (p.pickups || []).map((q) => ({ ...PICKUPS[q.kind].make(q.x, 0), kind: q.kind }));
    return {
      ...p, pickups, fallers: p.fallers || [], hazards: [], plats: p.plats || [],
      width: p.width || chunkW, partial: !!p.partial, readonly: true, gate: g ? g.id : null,
    };
  }
  if (view.mode === 'stage') return stageScene();
  const d = doc();
  return { ...build(d), width: d.width, partial: !!d.partial, readonly: false, gate: d.gate || null };
}

// ─────────────────────────────────────────────────────────────
// ทั้งด่านต่อกันเป็นฉากเดียว
//
// ไม่ได้ต่อท่อนเอง แต่ให้ Level ตัวเดียวกับเกมเป็นคนปูให้ทีละท่อน (spawnChunk)
// ของที่ระบบโรยเอง — แม่เหล็ก ตัวอักษร หญ้าแมว กระป๋อง โล่ — จึงไปลงจุดเดียวกับในเกมเป๊ะ
// ถ้าต่อเอง ต้องลอกสูตร "หาที่โล่ง" มาไว้ในไฟล์นี้ ซึ่งผิดกฎข้อเดียวของหน้าออกแบบ
//
// ปูยี่สิบท่อนพร้อมไล่หาที่โล่งไม่ใช่งานที่ทำทุกเฟรมไหว จึงเก็บผลไว้
// แล้วล้างทิ้งเมื่อลำดับท่อนหรือฉากเปลี่ยน (stageDirty)
// ─────────────────────────────────────────────────────────────
let stageCache = null;

function stageDirty() {
  stageCache = null;
  sim = null;
  scrubAt = -1;
  const el = document.getElementById('scrub');
  if (el) el.disabled = true;
}

function stageScene() {
  if (stageCache) return stageCache;

  const st = stage();
  const route = routeOf(st);

  // ── ท่อนที่เราแก้เอง ──
  // spawnChunk รองรับ step.fn อยู่แล้ว (ทางเข้าด่านใช้ช่องนี้) ท่อนของเราจึงเสียบตรงนี้ได้เลย
  // ผลคือของที่ระบบโรยให้ทั้งท่อน — กุ้ง เม็ดขนม แม่เหล็ก ตัวอักษร — ทำงานกับท่อนของเรา
  // ด้วยกฎชุดเดียวกับท่อนของเกมทุกประการ ไม่ต้องเขียนทางแยกไว้ในหน้านี้เลย
  const runRoute = route.map((s) => {
    const d = s.d && docById(s.d);
    if (!d) return s;
    return { ...s, fn: (x) => ({ ...build(d, x), width: d.width, partial: !!d.partial }) };
  });

  const lvl = new Level(runRoute);
  lvl.restartAt(0, runRoute, st.theme);
  // ในเกม Game เป็นคนบอกว่าตัวอักษรถัดไปคือตัวไหน ที่นี่ไล่วนไปเรื่อย ๆ ให้เห็นครบทุกตัว
  let li = 0;
  lvl.nextLetter = () => li++ % WORD.length;

  const slots = [];
  const jumps = [];
  const fallers = [];
  const hazards = [];

  for (let i = 0; i < route.length; i++) {
    const p = route[i].p;
    const own = route[i].d ? docById(route[i].d) : null;
    const x0 = lvl.nextChunkX;
    // เรียกแพตเทิร์นซ้ำเพื่ออ่าน "จุดกด" กับของพิเศษ ซึ่ง spawnChunk ไม่ได้เก็บไว้
    // (เกมไม่ต้องใช้ แต่หน้านี้ต้องวาดส่วนโค้งกระโดด) แพตเทิร์นคืนของใหม่ทุกครั้ง
    // ไม่มีผลข้างเคียง เรียกซ้ำจึงปลอดภัย
    const c = own ? build(own, x0) : (PATTERNS[p] ? PATTERNS[p](x0) : { jumps: [] });
    lvl.spawnChunk();

    jumps.push(...(c.jumps || []));
    // ของพิเศษเก็บรูปร่างชุดเดียวกับที่ build() ทำให้ท่อนของเรา drawSpecials จะได้วาดได้เหมือนกัน
    for (const f of c.fallers || []) {
      fallers.push({ x: f.x, w: FALLER.w, h: FALLER.h, warn: f.warn === undefined ? FALLER.warnFrames : f.warn });
    }
    for (const h of c.hazards || []) {
      if (h.kind === 'bee') {
        const b = HAZARD.bee;
        const t = h.phase || 0;
        hazards.push({ kind: 'bee', x: h.x, w: b.w, h: b.h, y: b.midY + Math.sin(t) * b.amp, t });
      } else {
        const r = HAZARD.ball.r;
        hazards.push({ kind: 'ball', x: h.x, w: r * 2, h: r * 2, y: GROUND_Y - r * 2, spin: 0 });
      }
    }

    slots.push({ i, p, x: x0, w: lvl.nextChunkX - x0, doc: own ? own.id : null });
  }

  // ไอเท็มทุกกองรวมเป็นรายการเดียวแบบที่ drawItems กับ simulate ใช้
  const pickups = [
    ...lvl.nips.map((q) => ({ ...q, kind: 'nip' })),
    ...lvl.cans.map((q) => ({ ...q, kind: 'can' })),
    ...lvl.magnets.map((q) => ({ ...q, kind: 'magnet' })),
    ...lvl.shields.map((q) => ({ ...q, kind: 'shield' })),
    ...lvl.letters.map((q) => ({ ...q, kind: 'letter' })),
    ...lvl.potions.map((q) => ({ ...q, kind: 'potion' })),
  ].sort((a, b) => a.x - b.x);

  stageCache = {
    obs: lvl.obstacles,
    pit: lvl.pits,
    fish: lvl.fishes,
    jumps: jumps.sort((a, b) => a - b),
    fallers,
    hazards,
    // พื้นเหยียบมาจาก Level ที่ปูไว้ ได้ทั้งท่อนของเกมและท่อนที่เราแก้เอง
    // ถ้าเก็บเองตรงนี้จะเห็นเฉพาะท่อนของเรา ท่อนของเกมจะกลายเป็นพื้นล่องหน
    plats: lvl.plats,
    pickups,
    width: lvl.nextChunkX,
    partial: false,
    readonly: !editing(),
    cached: true,         // ฉากนี้ไม่ได้สร้างใหม่ทุกเฟรม ใครแตะของในนี้ต้องคืนค่าเอง
    gate: null,
    slots,
  };
  return stageCache;
}

// ─────────────────────────────────────────────────────────────
// ทางเข้าด่าน — วาดอาคารด้วยภาพชุดเดียวกับเกม และสูตรจางผนัง/เปิดประตูตัวเดียวกับเกม
// ─────────────────────────────────────────────────────────────
function gateView(cam) {
  const def = scene && scene.gate && GATES[scene.gate];
  if (!def) return null;
  const m = gateMarks(def, 0);
  // มีผลจำลองอยู่ = ใช้ตำแหน่งแมวจำลอง ไม่งั้นใช้ตำแหน่งแมวตามกล้องเหมือนในเกม
  const f = sim && scrubAt >= 0 && sim.frames[scrubAt];
  const px = f ? f.cx : cam + PLAYER_X;
  const v = gateViewAt(m, cam, tick, px, doorOpenAt(px, m.doorIn), doorOpenAt(px, m.doorOut));
  if (view.xray) {
    v.facadeIn = Math.min(v.facadeIn, 0.22);
    v.facadeOut = Math.min(v.facadeOut, 0.22);
  }
  return { def, v, m };
}

/** เส้นประตูหน้า/หลัง และช่วงที่เกมจะสลับฉาก (วัดจากตำแหน่งแมว) */
function drawGateMarks(cam, g) {
  const { m, def } = g;
  const L = def.layout;
  ctx.save();
  ctx.font = 'bold 11px system-ui';
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = 'rgba(255,214,102,.8)';
  ctx.fillStyle = 'rgba(255,214,102,.95)';
  for (const [x, label] of [[m.doorIn, 'ทางเข้า'], [m.doorOut, 'ทางออก']]) {
    const sx = Math.round(x - cam) + 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, 30);
    ctx.lineTo(sx, GROUND_Y + 40);
    ctx.stroke();
    ctx.fillText(label, sx + 4, GROUND_Y + 36);
  }
  ctx.setLineDash([]);
  // ช่วงที่แมวอยู่แล้วจอถูกปิดเต็ม = จุดที่เกมสลับฉากได้โดยผู้เล่นไม่เห็น
  const a = m.coverFrom + PLAYER_X - cam;
  const b = m.coverTo + PLAYER_X - cam;
  ctx.fillStyle = 'rgba(127,227,218,.28)';
  ctx.fillRect(a, GROUND_Y + 44, b - a, 10);
  ctx.fillStyle = 'rgba(127,227,218,.95)';
  ctx.fillText(`ช่วงสลับฉาก ${L.cover}px`, a, GROUND_Y + 68);
  ctx.restore();
}

function draw() {
  tick++;
  const st = stage();
  const pal = st.palette;
  scene = active();
  const cam = view.cam;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  drawSky(ctx, cam, pal);
  drawHills(ctx, cam, pal);
  drawGround(ctx, scene.pit, cam, pal, GROUND_ART[st.backdrop]);
  const gate = gateView(cam);
  if (gate) drawGateBack(ctx, gate.def, gate.v);
  drawPlats(ctx, scene.plats || [], cam, pal);

  // ทั้งด่านมีจุดกดหลายสิบจุด วาดส่วนโค้งทุกจุดทุกเฟรมคือเปลืองเปล่า ๆ
  // เอาเฉพาะที่อยู่ใกล้จอพอจะมองเห็น เผื่อข้างละ 400px ให้เส้นที่เริ่มนอกจอยังต่อเนื่อง
  const nearJumps = view.mode === 'stage'
    ? scene.jumps.filter((j) => j > cam - 400 && j < cam + W + 400)
    : scene.jumps;

  if (view.grid) drawGrid(cam);
  if (view.arcs) drawArcs(cam, nearJumps);

  drawObstacles(ctx, scene.obs, cam, st.theme);
  drawSpecials(cam, st);
  hideEaten();
  drawTreats(ctx, scene.fish, cam, tick);
  drawItems(cam);

  // เงาท่อนถัดไปมีไว้ดูรอยต่อของท่อนเดียว — ทั้งด่านเห็นรอยต่อจริงอยู่แล้วไม่ต้องเดา
  if (view.next && view.mode !== 'stage') drawGhost(cam, scene);
  if (view.mode === 'stage') drawSlotBounds(cam, scene);
  else drawBounds(cam, scene.width);
  drawJumpMarks(cam, nearJumps);
  if (sim) drawSimMarks(cam);
  if (!scene.readonly) drawLaneGuides();
  if (!scene.readonly) drawSelection();
  drawCat(cam);
  if (gate) {
    drawGateFront(ctx, gate.def, gate.v);
    drawGateMarks(cam, gate);
  }

  if (view.mode === 'stage') markHere(cam);
  drawStrip();
  requestAnimationFrame(draw);
}

/**
 * ของพิเศษบนโต๊ะออกแบบ
 *
 * สองชิ้นนี้ต่างจากของอื่นตรงที่ "ขยับเอง" ภาพนิ่งภาพเดียวจึงบอกความจริงไม่ครบ
 *   ผึ้ง     แกว่งขึ้นลงตลอด — วาดแถบคลุมช่วงที่มันกวาดถึง จะได้เห็นว่าชนอะไรได้บ้าง
 *   ของร่วง  ตกเป็นเส้นตรงลงพื้นเสมอ — เส้นประบอกว่าจะไปลงตรงไหน
 * ตัวของวาดด้วยฟังก์ชันเดียวกับเกมจริงเหมือนของทุกชิ้นบนหน้านี้
 */
function drawSpecials(cam, st) {
  // ── กำลังเลื่อนดูผลจำลอง: วาดตำแหน่งจริง ณ เฟรมนั้น ──
  const fr = sim && scrubAt >= 0 && sim.frames[scrubAt];
  if (fr && fr.hz && fr.hz.length === (scene.hazards || []).length && fr.fl.length === (scene.fallers || []).length) {
    // ของร่วงที่ยังไม่เข้าจอ ในเกมยังมองไม่เห็นอะไรเลย แต่ในหน้าออกแบบวาดเงาจาง ๆ ไว้ให้รู้ว่ามี
    const fls = fr.fl.filter((q) => !q.off).map((q) => (q.hold ? { ...q, warn: FALLER.warnFrames } : q));
    drawFallers(ctx, fls, cam, st.theme);
    drawHazards(ctx, fr.hz.filter((q) => !q.off), cam, tick, st.palette);
    return;
  }

  const fs = scene.fallers || [];
  const hs = scene.hazards || [];
  if (!fs.length && !hs.length) return;

  ctx.save();
  for (const h of hs) {
    if (h.kind !== 'bee') continue;
    const b = HAZARD.bee;
    ctx.fillStyle = 'rgba(255,214,102,.12)';
    ctx.fillRect(h.x - cam - 6, b.midY - b.amp, h.w + 12, b.amp * 2 + b.h);
  }
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  for (const f of fs) {
    const x = Math.round(f.x - cam + f.w / 2) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, FALL_Y + f.h);
    ctx.lineTo(x, GROUND_Y);
    ctx.stroke();
  }
  ctx.restore();

  // ยังไม่ได้ตรวจด่าน: ผึ้งแกว่งโชว์ไปเรื่อย ๆ จากเฟสที่ตั้งไว้ ให้เห็นว่ามันขยับยังไง
  // สำเนาสำหรับวาดเท่านั้น: ของร่วง warn=0 คือ "ร่วงอยู่" ซึ่งเป็นท่าที่ผู้เล่นเห็นตอนต้องหลบจริง
  const b = HAZARD.bee;
  const live = hs.map((h) => (h.kind === 'bee'
    ? { ...h, y: b.midY + Math.sin(h.t + tick * b.speed) * b.amp }
    : { ...h, spin: -tick * 0.05 }));
  drawFallers(ctx, fs.map((f) => ({ ...f, warn: 0, y: FALL_Y })), cam, st.theme);
  drawHazards(ctx, live, cam, tick, st.palette);
}

/**
 * ไอเท็มตัวช่วย — วาดด้วยฟังก์ชันของเกมตามชนิด (ดู ITEM_DEFS.draw)
 * ตอนเลื่อนดูผลจำลอง ชิ้นที่แมวเก็บไปแล้ว ณ เฟรมนั้นจะหายไปเหมือนในเกม
 */
function drawItems(cam) {
  const ps = scene.pickups || [];
  if (!ps.length) return;
  const showSim = sim && scrubAt >= 0 && sim.itemAt.length === ps.length;
  const groups = new Map();
  ps.forEach((p, i) => {
    const got = showSim && sim.itemAt[i] <= scrubAt;
    if (!groups.has(p.kind)) groups.set(p.kind, []);
    groups.get(p.kind).push({ ...p, got });
  });
  for (const [kind, list] of groups) {
    const def = ITEM_DEFS[kind];
    if (def) def.draw(ctx, list, cam, tick);
  }
}

// พื้นเหยียบวาดด้วย drawPlats() จาก render/platforms.js ตัวเดียวกับเกม

/**
 * เส้นบอกชั้น — โผล่เฉพาะตอนเลือกแถวพื้นอยู่ บอกว่าลากขึ้นลงแล้วจะไปดูดเข้าชั้นไหน
 * เส้นของชั้นที่แถวอยู่ตอนนี้เข้มกว่าเส้นอื่น
 */
function drawLaneGuides() {
  const it = sel && !locked() && byId(doc(), sel);
  if (!it || it.t !== 'fishRun' || it.lane === 'surface') return;
  const cur = it.lane || 'run';
  ctx.save();
  ctx.font = '11px system-ui';
  for (const [key, label, rise] of LANES) {
    if (rise === null) continue;
    const y = Math.round(A.RUN_Y - rise) + 0.5;
    const on = key === cur;
    ctx.strokeStyle = on ? 'rgba(255,143,184,.9)' : 'rgba(255,214,102,.35)';
    ctx.setLineDash(on ? [] : [4, 6]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.fillStyle = on ? '#FF8FB8' : 'rgba(255,214,102,.7)';
    ctx.fillText(label.replace(/ \(.*\)$/, ''), 8, y - 4);
  }
  if (cur === 'custom') {
    const y = Math.round(A.RUN_Y - (it.rise || 0)) + 0.5;
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,143,184,.9)';
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.fillStyle = '#FF8FB8';
    ctx.fillText(`กำหนดเอง ${it.rise}px`, 8, y - 4);
  }
  ctx.restore();
}

/** ความสูงที่วาดของร่วงบนโต๊ะออกแบบ — กลางอากาศ เห็นทั้งตัวของและเงาบนพื้น */
const FALL_Y = GROUND_Y - FALLER.h - 130;

/**
 * ซ่อนของที่เก็บไปแล้ว ณ เฟรมที่กำลังเลื่อนดู
 *
 * scene ถูกสร้างใหม่ทุกเฟรมจากเอกสารเดิม ลำดับเม็ดจึงตรงกับตอนจำลองเสมอ
 * แต่ถ้าเพิ่งแก้อะไรไปแล้วยังไม่ได้ตรวจใหม่ จำนวนจะไม่ตรง ตอนนั้นให้โชว์ทั้งหมด
 */
function hideEaten() {
  if (!sim || scrubAt < 0 || sim.eatAt.length !== scene.fish.length) {
    // ฉากของโหมดทั้งด่านถูกเก็บไว้ใช้ซ้ำ ไม่ได้สร้างใหม่ทุกเฟรมเหมือนท่อนเดี่ยว
    // ถ้าไม่คืนค่าตรงนี้ เม็ดที่เคยถูกกินตอนเลื่อนดูผลจำลองจะหายไปถาวร
    if (scene.cached) for (const f of scene.fish) f.got = false;
    return;
  }
  scene.fish.forEach((f, i) => { f.got = sim.eatAt[i] <= scrubAt; });
}

/** เส้นบอกระยะทุก 100px + เพดานกระโดดทั้งสองแบบ */
function drawGrid(cam) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.10)';
  ctx.lineWidth = 1;
  ctx.font = '10px system-ui';
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  const from = Math.floor(cam / 100) * 100;
  for (let x = from; x < cam + W; x += 100) {
    const sx = Math.round(x - cam) + 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, GROUND_Y);
    ctx.stroke();
    ctx.fillText(String(x), sx + 3, 12);
  }
  // เพดาน = ขอบบนของกล่องชนตอนลอยสูงสุด สูงกว่านี้คือข้ามไม่ได้แน่นอน
  const ceilOne = GROUND_Y - peakHeight(A.JUMP);
  const ceilTwo = GROUND_Y - peakHeight(A.JUMP_DBL);
  markCeil(ceilOne, 'rgba(127,227,218,.5)', 'เพดานกระโดดเดี่ยว');
  markCeil(ceilTwo, 'rgba(196,164,255,.5)', 'เพดานกระโดดสองชั้น');
  ctx.restore();

  function markCeil(y, color, text) {
    ctx.strokeStyle = color;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.fillText(text, 6, y - 4);
  }
}

/** ความสูงที่ "ขอบบนของตัว" ขึ้นไปถึง วัดจากพื้น */
function peakHeight(path) {
  let top = GROUND_Y;
  for (const p of path) top = Math.min(top, p.y - BODY.standH / 2);
  return GROUND_Y - top;
}

function drawArcs(cam, jumps) {
  ctx.save();
  ctx.lineWidth = 1.5;
  for (const j of jumps) {
    arc(A.JUMP, j, 'rgba(127,227,218,.55)');
    arc(A.JUMP_DBL, j, 'rgba(196,164,255,.35)');
  }
  ctx.restore();

  function arc(path, j, color) {
    ctx.strokeStyle = color;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(j - cam, GROUND_Y - BODY.standH / 2);
    for (const p of path) ctx.lineTo(j + p.dx - cam, p.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** เงาของ "ท่อนเดียวกันที่ต่อท้าย" — ไว้ดูว่าขอบซ้ายขวาชนกันหรือเปล่า */
function drawGhost(cam, sc) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,143,184,.45)';
  ctx.fillStyle = 'rgba(255,143,184,.12)';
  ctx.lineWidth = 1;
  for (const o of sc.obs) box(o.x + sc.width, o.y, o.w, o.h);
  for (const p of sc.pit) box(p.x + sc.width, GROUND_Y, p.w, 34);
  ctx.fillStyle = 'rgba(255,143,184,.35)';
  for (const f of sc.fish) {
    ctx.beginPath();
    ctx.arc(f.x + sc.width - cam, f.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  function box(x, y, w, h) {
    ctx.fillRect(x - cam, y, w, h);
    ctx.strokeRect(Math.round(x - cam) + 0.5, Math.round(y) + 0.5, w, h);
  }
}

/**
 * เส้นแบ่งท่อนในโหมดทั้งด่าน
 * ไทม์ไลน์ข้างล่างบอกว่าด่านมีท่อนอะไรบ้าง ส่วนเส้นพวกนี้บอกว่า
 * "ตรงที่มองอยู่ตอนนี้" เป็นท่อนที่เท่าไร — สองอย่างนี้ต้องตรงกันเสมอ
 */
function drawSlotBounds(cam, sc) {
  const here = sc.slots[view.slot];
  if (here) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,143,184,.06)';
    ctx.fillRect(here.x - cam, 0, here.w, H);
    ctx.restore();
  }

  ctx.save();
  ctx.font = 'bold 11px system-ui';
  for (const s of sc.slots) {
    const sx = Math.round(s.x - cam) + 0.5;
    if (sx < -80 || sx > W + 80) continue;
    const on = s.i === view.slot;
    const col = on ? 'rgba(255,143,184,.95)' : 'rgba(255,255,255,.32)';
    ctx.strokeStyle = col;
    ctx.lineWidth = on ? 2 : 1;
    ctx.setLineDash(on ? [] : [4, 6]);
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col;
    // ป้ายชื่อท่อนอยู่บนฟ้า ไม่ใช่บนพื้น — พื้นของแต่ละฉากสีไม่เหมือนกัน
    // ตัวหนังสือบนทรายหิมะหรือพื้นส้มอ่อนอ่านไม่ออก ส่วนท้องฟ้ามืดทุกฉาก
    ctx.fillText(`ท่อน ${s.i + 1} · ${s.doc ? '✎ ของฉัน' : '#' + s.p}`, sx + 5, 16);
  }
  ctx.restore();
}

function drawBounds(cam, width) {
  ctx.save();
  ctx.font = '11px system-ui';
  line(0, 'rgba(255,255,255,.55)', 'เริ่มท่อน');
  line(width, 'rgba(255,143,184,.8)', 'จบท่อน ' + width);
  ctx.restore();

  function line(x, color, text) {
    const sx = Math.round(x - cam) + 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, H);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(text, sx + 4, H - 8);
  }
}

function drawJumpMarks(cam, jumps) {
  ctx.save();
  ctx.font = 'bold 11px system-ui';
  jumps.forEach((j, i) => {
    const sx = Math.round(j - cam) + 0.5;
    ctx.strokeStyle = 'rgba(255,198,107,.85)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, 44);
    ctx.lineTo(sx, GROUND_Y + 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,198,107,.95)';
    ctx.beginPath();
    ctx.moveTo(sx, 44);
    ctx.lineTo(sx + 26, 51);
    ctx.lineTo(sx, 58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2A1B06';
    ctx.fillText('j' + (i + 1), sx + 4, 55);
  });
  ctx.restore();
}

function drawSelection() {
  const cam = docCam();
  const d = doc();
  const it = sel && byId(d, sel);
  if (!it) return;
  const b = itemBox(d, it);
  ctx.save();
  ctx.strokeStyle = '#FF8FB8';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(b.x - cam - 3, b.y - 3, b.w + 6, b.h + 6);
  ctx.setLineDash([]);

  // ที่จับสำหรับยืดปลายขวา (หลุม กับ แถวพื้นที่ไม่ได้ผูกกับจุดกด)
  const hx = handleX(d, it);
  if (hx !== null) {
    ctx.fillStyle = '#FF8FB8';
    ctx.fillRect(hx - cam - 5, b.y + b.h / 2 - 5, 10, 10);
  }
  ctx.restore();
}

function drawSimMarks(cam) {
  ctx.save();
  // เม็ดที่เก็บไม่ได้ — วงแดงคาดไว้ให้เห็นทันทีว่าวางเกินเอื้อม
  ctx.strokeStyle = '#FF7A7A';
  ctx.lineWidth = 2;
  for (const f of sim.missed) {
    ctx.beginPath();
    ctx.arc(f.x - cam, f.y, f.r + 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (sim.death) {
    ctx.strokeStyle = '#FF7A7A';
    ctx.fillStyle = 'rgba(255,122,122,.25)';
    const b = sim.death.box;
    ctx.fillRect(b.x - cam, b.y, b.w, b.h);
    ctx.strokeRect(b.x - cam, b.y, b.w, b.h);
  }
  ctx.restore();
}

function drawCat(cam) {
  if (!sim || scrubAt < 0 || scrubAt >= sim.frames.length) return;
  const f = sim.frames[scrubAt];
  // เส้นทางที่วิ่งผ่านมา ช่วยให้เห็นว่าโค้งจริงพาดตรงไหน
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  sim.frames.forEach((p, i) => {
    const y = p.y - (p.sliding ? BODY.slideH : BODY.standH) / 2;
    if (i === 0) ctx.moveTo(p.cx - cam, y); else ctx.lineTo(p.cx - cam, y);
  });
  ctx.stroke();
  ctx.restore();

  // drawPlayer วาดที่ PLAYER_X เสมอ จึงเลื่อนผ้าใบให้ไปตรงกับตำแหน่งจำลองแทน
  const shift = (f.cx - BODY.standW / 2 - cam) - PLAYER_X;
  ctx.save();
  ctx.translate(shift, 0);
  const ghost = {
    box: f.sliding
      ? { x: PLAYER_X + BODY.slideOffsetX, y: f.y - BODY.slideH, w: BODY.slideW, h: BODY.slideH }
      : { x: PLAYER_X, y: f.y - BODY.standH, w: BODY.standW, h: BODY.standH },
    y: f.y, vy: f.vy, onGround: f.onGround, sliding: f.sliding,
    runPhase: scrubAt * 0.4, squash: 0, tailLag: 0, tilt: 0,
  };
  drawPlayer(ctx, ghost, false, skin, false, 0, '', 1, 1, {});
  ctx.restore();

  // ผลของไอเท็มที่ติดตัวอยู่ ณ เฟรมนี้ — วงโล่ + ป้ายเวลาที่เหลือ
  const s = f.fx;
  if (!s) return;
  const hx = f.cx - cam;
  const hy = f.y - BODY.standH - 16;
  ctx.save();
  if (s.shielded) {
    ctx.strokeStyle = 'rgba(255,243,226,.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hx, f.y - BODY.standH / 2, 36, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tags = [];
  if (s.boost > 0) tags.push(['สปีด', s.boost, '#7CFF8A']);
  if (s.big > 0) tags.push(['ตัวโต', s.big, '#FFC66B']);
  if (s.magnet > 0) tags.push(['แม่เหล็ก', s.magnet, '#7FE3DA']);
  ctx.font = 'bold 11px system-ui';
  ctx.textAlign = 'center';
  tags.forEach(([label, left, color], i) => {
    ctx.fillStyle = color;
    ctx.fillText(`${label} ${(left / 60).toFixed(1)}วิ`, hx, hy - i * 14);
  });
  ctx.restore();
}

// ── แถบภาพรวมด้านล่าง ─────────────────────────────────
function drawStrip() {
  const SW = strip.width;
  const SH = strip.height;
  const sc = scene;
  const span = Math.max(sc.width + 240, W + 240);
  const k = SW / span;
  const ox = 120;                       // เผื่อพื้นที่ก่อนเริ่มท่อน
  const gy = SH - 22;

  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.fillStyle = '#211B2A';
  sctx.fillRect(0, 0, SW, SH);

  // พื้น + หลุม
  sctx.fillStyle = '#3B3149';
  sctx.fillRect(0, gy, SW, 4);
  sctx.fillStyle = '#16121C';
  for (const p of sc.pit) sctx.fillRect((p.x + ox) * k, gy, p.w * k, 4);

  // ขอบท่อน
  sctx.fillStyle = 'rgba(255,143,184,.7)';
  sctx.fillRect(ox * k, 0, 1.5, SH);
  sctx.fillRect((sc.width + ox) * k, 0, 1.5, SH);

  // โหมดทั้งด่าน: ขีดแบ่งทุกท่อน + แรเงาท่อนที่กำลังแก้
  if (sc.slots) {
    const here = sc.slots[view.slot];
    if (here) {
      sctx.fillStyle = 'rgba(255,143,184,.14)';
      sctx.fillRect((here.x + ox) * k, 0, here.w * k, SH);
    }
    sctx.fillStyle = 'rgba(255,255,255,.16)';
    for (const s of sc.slots) sctx.fillRect((s.x + ox) * k, 0, 1, SH);
  }

  // ของกิน
  sctx.fillStyle = '#7FE3DA';
  for (const f of sc.fish) {
    const y = gy - (GROUND_Y - f.y) * 0.32;
    sctx.fillRect((f.x + ox) * k - 1, y, 2, 2);
  }

  // สิ่งกีดขวาง
  for (const o of sc.obs) {
    sctx.fillStyle = isLowObstacle(o) ? '#C4A4FF' : '#FFC66B';
    const h = Math.max(3, o.h * 0.32);
    sctx.fillRect((o.x + ox) * k, gy - h, Math.max(2, o.w * k), h);
  }

  // ไอเท็ม
  sctx.fillStyle = '#9DFFB0';
  for (const p of sc.pickups || []) sctx.fillRect((p.x + ox) * k - 2, gy - 52, 4, 4);

  // พื้นเหยียบ
  sctx.fillStyle = '#E8B06A';
  for (const p of sc.plats || []) {
    const h = p.kind === 'hill' ? p.h : GROUND_Y - p.top;
    sctx.fillRect((p.x + ox) * k, gy - h * 0.32, Math.max(2, p.w * k), 3);
  }

  // ของพิเศษ — สีเดียวกันทั้งสามชนิด สิ่งที่ต้องรู้จากแถบนี้คือ "มีของขยับได้ตรงไหนบ้าง"
  sctx.fillStyle = '#FF6E6E';
  for (const s of [...(sc.fallers || []), ...(sc.hazards || [])]) {
    sctx.fillRect((s.x + ox) * k, gy - 34, Math.max(2, s.w * k), 4);
  }

  // จุดกด
  sctx.fillStyle = '#FF8FB8';
  for (const j of sc.jumps) sctx.fillRect((j + ox) * k - 1, gy - 40, 2, 40);

  // กรอบบอกว่าตอนนี้จอหลักมองอยู่ช่วงไหน
  sctx.strokeStyle = 'rgba(255,255,255,.7)';
  sctx.lineWidth = 2;
  sctx.strokeRect((view.cam + ox) * k, 1, W * k, SH - 2);
}

// ─────────────────────────────────────────────────────────────
// กล่องของแต่ละชิ้น — ใช้ทั้งตอนเลือกและตอนวาดกรอบ
// ─────────────────────────────────────────────────────────────
/**
 * เอกสารจำลองที่มีของชิ้นเดียว — แต่ต้องพกจุดกดทุกอันไปด้วย
 * ไม่งั้นของที่เกาะจุดกดอยู่จะหาที่เกาะไม่เจอแล้วตกกลับไปใช้ x เก่าที่ไม่ตรงจริง
 */
function soloDoc(d, it) {
  const marks = d.items.filter((q) => q.t === 'jump' && q.id !== it.id);
  return { ...d, items: [...marks, it] };
}

function itemBox(d, it) {
  const x = xOf(d, it);
  if (it.t === 'jump') return { x: x - 9, y: 44, w: 18, h: GROUND_Y - 30 };
  if (it.t === 'spike') return { x, y: GROUND_Y - spike.h, w: spike.w, h: spike.h };
  if (it.t === 'spikeRow') return { x, y: GROUND_Y - spike.h, w: itemW(it), h: spike.h };
  if (it.t === 'faller') return { x, y: FALL_Y, w: FALLER.w, h: FALLER.h };
  if (it.t === 'hill') return { x, y: GROUND_Y - it.h, w: it.w, h: it.h };
  if (it.t === 'item') {
    const def = ITEM_DEFS[it.kind];
    const p = PICKUPS[it.kind] && PICKUPS[it.kind].make(x, 0);
    const r = (def ? def.r : 18) + 4;
    return { x: x - r, y: (p ? p.y : GROUND_Y - 92) - r, w: r * 2, h: r * 2 };
  }
  if (it.t === 'ledge') return { x, y: GROUND_Y - it.lift, w: it.w, h: LEDGE_THICK };
  // ผึ้งจับได้ทั้งช่วงที่มันแกว่งถึง ไม่ใช่แค่ตรงกลาง — ตรงกับแถบที่วาดให้เห็น
  if (it.t === 'bee') return { x, y: HAZARD.bee.midY - HAZARD.bee.amp, w: HAZARD.bee.w, h: HAZARD.bee.amp * 2 + HAZARD.bee.h };
  if (it.t === 'ball') return { x, y: GROUND_Y - HAZARD.ball.r * 2, w: HAZARD.ball.r * 2, h: HAZARD.ball.r * 2 };
  if (it.t === 'bar') return { x, y: bar.top, w: bar.w, h: bar.h };
  if (it.t === 'crate') return { x, y: GROUND_Y - crate.h * it.rows, w: crate.w, h: crate.h * it.rows };
  if (it.t === 'prop') { const o = A.propObs(x, it.kind); return { x, y: o.y, w: o.w, h: o.h }; }
  if (it.t === 'pit') return { x, y: GROUND_Y, w: it.w, h: 34 };

  // ของกิน: กรอบรวมของเม็ดทั้งหมด เผื่อขอบให้จิ้มโดนง่าย
  const one = build(soloDoc(d, it));
  if (!one.fish.length) return { x: x - 10, y: GROUND_Y - 40, w: 20, h: 40 };
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const f of one.fish) {
    x0 = Math.min(x0, f.x - f.r); x1 = Math.max(x1, f.x + f.r);
    y0 = Math.min(y0, f.y - f.r); y1 = Math.max(y1, f.y + f.r);
  }
  return { x: x0 - 4, y: y0 - 4, w: x1 - x0 + 8, h: y1 - y0 + 8 };
}

/** x ของที่จับยืดปลายขวา — null = ชิ้นนี้ยืดไม่ได้ */
function handleX(d, it) {
  if (it.t === 'pit') return xOf(d, it) + it.w;
  if (it.t === 'spikeRow') return xOf(d, it) + Math.max(0, it.n - 1) * it.gap;
  if (PLAT_T.has(it.t)) return xOf(d, it) + it.w;
  if (it.t === 'fishRun' && !it.runTo) return xOf(d, it) + Math.max(0, countOf(d, it) - 1) * it.gap;
  if (it.t === 'fishLow') return xOf(d, it) + Math.max(0, it.n - 1) * it.gap;
  if (it.t === 'fishWave') return xOf(d, it) + Math.max(0, it.n - 1) * it.gap;
  if (it.t === 'fishFlake') return xOf(d, it) + A.JUMP_PEAK + (it.arm || 24);
  return null;
}

// ─────────────────────────────────────────────────────────────
// จำลองการเล่น — ฟิสิกส์ชุดเดียวกับ Player.update เป๊ะ ๆ
//
// นี่คือหัวใจของเครื่องมือ: ไม่ได้เดาว่าด่านผ่านได้ไหม แต่ให้แมวลองวิ่งจริง
// ตาม "เฉลย" ที่ผู้ออกแบบประกาศไว้ (จุดกดทุกอัน) แล้วรายงานว่าเกิดอะไรขึ้น
// ─────────────────────────────────────────────────────────────
function simulate(d, scIn) {
  // scIn = ฉากที่ประกอบมาแล้ว (โหมดทั้งด่านส่งเข้ามา) ไม่งั้นสร้างจากเอกสารเหมือนเดิม
  const sc = scIn || (view.refIdx >= 0 ? active() : { ...build(d), width: d.width, partial: !!d.partial, gate: d.gate || null });
  const bars = sc.obs.filter(isLowObstacle);
  const solids = sc.obs;
  const press = sc.jumps.slice().sort((a, b) => a - b);

  // ── ทำไมต้องจัดเฟสก่อนเริ่ม ──
  // กล้องเดิน 6.8px ต่อเฟรม ผู้เล่นจึงกดได้เฉพาะบนตะแกรงทุก 6.8px เท่านั้น
  // ถ้าจุดเริ่มเป็นเลขมั่ว ๆ การกดครั้งแรกจะช้ากว่าจุดกดจริงได้ถึง 6.8px
  // ซึ่งกินระยะลอยพ้นไปหลายพิกเซล มากพอจะเฉี่ยวลังสองชั้นที่ตั้งใจว่าข้ามได้
  // จึงถอยจุดเริ่มให้ตกลงบนจุดกดแรกพอดี แล้วให้ที่เหลือกดเฟรมที่ใกล้ที่สุด
  let cx = press.length
    ? press[0] - SPEED.run * Math.ceil((press[0] + 80) / SPEED.run)
    : -80;                      // กึ่งกลางกล่องชนในพิกัดโลก
  let y = GROUND_Y;
  let vy = 0;
  let onGround = true;
  let jumpsUsed = 0;
  let slideHeld = false;
  let sliding = false;
  let pi = 0;

  // ── ของที่ขยับได้ — สำเนาแยก ไม่แตะของที่วาดอยู่ในสนาม ──
  // hold = ยังไม่เข้าจอ ยังไม่เริ่มขยับ (กติกาเดียวกับ Level.updateFallers/updateHazards)
  const hz = (sc.hazards || []).map((h) => ({ ...h, hold: true, smashed: false, gone: false, spin: 0 }));
  const fl = (sc.fallers || []).map((f) => ({ ...f, y: -40, vy: 0, hold: true, dead: false, smashed: false }));
  const items = sc.pickups || [];
  const itemAt = items.map(() => Infinity);
  const eatAt = sc.fish.map(() => Infinity);
  const smashed = new Set();

  // ผลของไอเท็มที่ติดตัว — หน่วยเป็น "เฟรมจริง" เหมือนตัวจับเวลาในเกม
  const fx = { boost: 0, big: 0, magnet: 0, shielded: false, invuln: 0 };
  const events = [];
  let smashCount = 0;

  const frames = [];
  const missedPress = [];
  const clear = new Map();      // ชิ้น → ระยะที่ลอยพ้นน้อยที่สุด
  let death = null;
  const endX = sc.width + 240;

  // เพดานเฟรม: ท่อนเดียวใช้ไม่ถึงพันเฟรม แต่ทั้งด่านยี่สิบท่อนราวสามพัน
  // ตั้งไว้เผื่อด่านที่ท่อนกว้างกว่าปกติ ไม่ใช่ตัวเลขที่ตั้งใจให้ถึง
  for (let f = 0; f < 20000 && cx < endX && !death; f++) {
    // ── เวลาจริงต่อหนึ่งก้าวโลก ──
    // ติดสปีดแล้วโลกเดินเร็วขึ้น 1.8 เท่า แต่ฟิสิกส์ยังก้าวทีละ 1 เฟรมอ้างอิง (ดู Game.update)
    // หนึ่งก้าวโลกจึงกินเวลาจริงแค่ 1/1.8 เฟรม ตัวจับเวลาและของที่ขยับเองต้องเดินตามเวลาจริง
    const rdt = fx.boost > 0 ? 1 / SPEEDUP.mult : 1;
    const camera = cx - BODY.standW / 2 - PLAYER_X;

    // 1) รับอินพุตตามเฉลย
    while (pi < press.length && cx + SPEED.run / 2 >= press[pi]) {
      if (jumpsUsed === 0) { vy = PHYSICS.jumpV; jumpsUsed = 1; onGround = false; sliding = false; slideHeld = false; }
      else if (jumpsUsed === 1) { vy = PHYSICS.doubleJumpV; jumpsUsed = 2; }
      else missedPress.push(Math.round(press[pi]));
      pi++;
    }

    // 2) หมอบอัตโนมัติเมื่อมีคานอยู่ข้างหน้า (ผู้เล่นจริงกดค้างไว้)
    // ลุกได้ก็ต่อเมื่อขอบซ้ายของตัวตอนยืนพ้นคานแล้วจริง ไม่ใช่แค่กึ่งกลางพ้น
    // ตอนยืนตัวกว้าง 40 ขอบซ้ายจึงอยู่หลังกึ่งกลาง 20px เผื่ออีก 12 กันเฟรมคาบเกี่ยว
    slideHeld = bars.some((b) => !smashed.has(b) && cx > b.x - 70 && cx < b.x + b.w + BODY.standW / 2 + 12);
    sliding = slideHeld && onGround;

    // 3) เดินของที่ขยับได้หนึ่งก้าว
    stepMovers(hz, fl, camera, rdt, bars);

    const h = sliding ? BODY.slideH : BODY.standH;
    const bw = sliding ? BODY.slideW : BODY.standW;
    const box = { x: cx - bw / 2, y: y - h, w: bw, h };
    const cy = y - h / 2;

    frames.push({
      cx, y, vy, onGround, sliding,
      fx: { boost: fx.boost, big: fx.big, magnet: fx.magnet, shielded: fx.shielded },
      hz: hz.map((q) => ({ kind: q.kind, x: q.x, y: q.y, w: q.w, h: q.h, t: q.t, spin: q.spin, off: q.gone || q.smashed })),
      fl: fl.map((q) => ({ x: q.x, y: q.y, w: q.w, h: q.h, warn: q.warn, off: q.dead || q.smashed, hold: q.hold })),
    });

    // 4) ชนอะไรหรือยัง — กติกาเดียวกับเกม: ตัวโต/สปีด = พุ่งชนกระเด็น, อมตะ = ผ่าน, โล่ = แตกแทน
    const hit = (what, onSmash) => {
      if (fx.boost > 0 || fx.big > 0) { onSmash(); smashCount++; return false; }
      if (fx.invuln > 0) return false;
      if (fx.shielded) {
        fx.shielded = false;
        fx.invuln = SHIELD.invulnFrames;
        events.push(`โล่รับแรงชนแทนที่ x=${Math.round(cx)}`);
        return false;
      }
      death = { at: Math.round(cx), what, frame: f, box };
      return true;
    };
    const overlap = (o) => box.x < o.x + o.w && o.x < box.x + box.w && box.y < o.y + o.h && o.y < box.y + box.h;

    for (const o of solids) {
      if (smashed.has(o)) continue;
      if (overlap(o)) {
        if (hit(o.kind, () => smashed.add(o))) break;
        continue;
      }
      // ระยะลอยพ้น: นับเฉพาะตอนอยู่เหนือชิ้นนั้นจริง ๆ
      if (!isLowObstacle(o) && box.x < o.x + o.w && o.x < box.x + box.w) {
        const gap = o.y - (box.y + box.h);
        if (gap >= 0) clear.set(o, Math.min(clear.has(o) ? clear.get(o) : Infinity, gap));
      }
    }
    if (death) break;
    for (const q of hz) {
      if (q.gone || q.smashed || q.hold || !overlap(q)) continue;
      if (hit(q.kind, () => { q.smashed = true; })) break;
    }
    if (death) break;
    for (const q of fl) {
      if (q.dead || q.smashed || q.hold || q.warn > 0 || !overlap(q)) continue;
      if (hit('faller', () => { q.smashed = true; })) break;
    }
    if (death) break;

    // 5) เก็บไอเท็มและของกิน — ระยะเก็บชุดเดียวกับ Game
    items.forEach((p, i) => {
      if (itemAt[i] < Infinity || Math.hypot(cx - p.x, cy - p.y) >= ITEM_DEFS[p.kind].pickR) return;
      itemAt[i] = f;
      const def = ITEM_DEFS[p.kind];
      if (def.effect === 'boost') fx.boost = def.frames;
      else if (def.effect === 'big') fx.big = def.frames;
      else if (def.effect === 'magnet') fx.magnet = def.frames;
      else if (def.effect === 'shield') fx.shielded = true;
    });
    sc.fish.forEach((t, i) => {
      if (eatAt[i] < Infinity) return;
      const d0 = Math.hypot(cx - t.x, cy - t.y);
      // กุ้งตัวใหญ่ ระยะเก็บกว้างกว่า — ค่าเดียวกับ Game.pickTreats
      const pad = t.kind === 'shrimp' ? SHRIMP.pickPad : 22;
      // แม่เหล็ก: ของที่เข้ารัศมีดูดถือว่าได้แล้ว (ในเกมมันบินเข้าปากเร็วกว่ากล้องเสมอ ดู MAGNET.minPull)
      if (d0 < t.r + pad || (fx.magnet > 0 && d0 < MAGNET.range)) eatAt[i] = f;
    });

    if (y > H + 100) { death = { at: Math.round(cx), what: 'pit', frame: f, box }; break; }

    // 6) ตัวจับเวลา
    fx.boost = Math.max(0, fx.boost - rdt);
    fx.big = Math.max(0, fx.big - rdt);
    fx.magnet = Math.max(0, fx.magnet - rdt);
    fx.invuln = Math.max(0, fx.invuln - rdt);

    // 7) เดินหน้าหนึ่งเฟรม
    cx += SPEED.run;
    vy += PHYSICS.gravity;
    y += vy;

    const stand = footingOf(sc, cx, y - vy, y, onGround, fx.boost > 0 || fx.big > 0);
    if (stand !== null) {
      y = stand; vy = 0; onGround = true; jumpsUsed = 0;
    } else {
      onGround = false;
      if (jumpsUsed === 0) jumpsUsed = 1;   // เดินตกหลุม = เสียสิทธิ์กระโดดแรก
    }
  }

  if (smashCount) events.push(`พุ่งชนกระเด็น ${smashCount} ชิ้น (ติดสปีด/ตัวโต)`);
  const missed = sc.fish.filter((_, i) => eatAt[i] === Infinity);

  return {
    frames, missed, eatAt, death, missedPress,
    total: sc.fish.length,
    got: sc.fish.length - missed.length,
    clear,
    scene: sc,
    items, itemAt, events,
  };
}

/**
 * เดินผึ้ง ลูกบอล และของร่วงหนึ่งก้าว — สูตรชุดเดียวกับ Level.updateHazards / updateFallers
 * rdt = เวลาจริงของก้าวนี้ (ติดสปีดแล้วของพวกนี้ดูช้าลงเมื่อเทียบกับระยะทาง เหมือนในเกม)
 */
function stepMovers(hz, fl, camera, rdt, bars) {
  const underBar = (x, w) => bars.some((b) => x < b.x + b.w && b.x < x + w);
  for (const q of hz) {
    if (q.gone || q.smashed) continue;
    if (q.hold) {
      if (q.x > camera + W) continue;
      q.hold = false;
    }
    if (q.kind === 'bee') {
      const b = HAZARD.bee;
      q.t += b.speed * rdt;
      q.y = b.midY + Math.sin(q.t) * b.amp;
    } else if (q.kind === 'ball') {
      q.x -= HAZARD.ball.speed * rdt;
      q.spin -= 0.12 * rdt;
    }
    // เกมลบชิ้นที่ไปอยู่ใต้คานทิ้ง (ดู Level.underBar)
    if (underBar(q.x, q.w)) q.gone = true;
  }
  for (const q of fl) {
    if (q.dead || q.smashed) continue;
    if (underBar(q.x, q.w)) { q.dead = true; continue; }
    if (q.hold) {
      if (q.x > camera + W) continue;
      q.hold = false;
    }
    if (q.warn > 0) { q.warn -= rdt; continue; }
    q.vy += FALLER.gravity * rdt;
    q.y += q.vy * rdt;
    if (q.y + q.h >= GROUND_Y) { q.y = GROUND_Y - q.h; q.dead = true; }
  }
}

/**
 * เท้าควรยืนอยู่ที่ y ไหนหลังเดินหนึ่งเฟรม — null = ลอยอยู่
 *
 * พื้นปกติกับพื้นเหยียบใช้กติกาเดียวกัน: "เฟรมก่อนเท้าอยู่เหนือผิว และตอนนี้ถึงผิวแล้ว"
 * พื้นปกติจึงได้ผลเท่าเดิมทุกกรณี ท่อนเก่าทั้งหมดจำลองออกมาเหมือนเดิม
 *
 * สองข้อที่เพิ่มมาเพราะผิวไม่เรียบ:
 *   ผิวของเฟรมก่อน  เทียบกับผิว ณ x เดิม ไม่ใช่ x ใหม่ ไม่งั้นเดินขึ้นเนินจะดูเหมือน
 *                  "มุดใต้ผิว" แล้วไม่ถูกยกขึ้น
 *   ดูดติดขาลง     ตอนยืนอยู่แล้วผิวลาดลงเร็วกว่าแรงโน้มถ่วงของเฟรมเดียว (0.86)
 *                  ถ้าไม่ดูดไว้แมวจะเด้งหลุดจากผิวทุกเฟรมตอนลงเนินเหมือนวิ่งลงบันได
 * พื้นลอยเป็นแบบทะลุจากข้างล่างได้ — กระโดดลอดขึ้นไปยืนข้างบนได้ ไม่ชนหัว
 */
// ตัวจำลองเรียกของเกมตรง ๆ ก้าวละหนึ่งเฟรมอ้างอิง (step = 1) เหมือนที่เกมเดินจริง
const footingOf = (sc, cx, prevY, y, wasOnGround, pitsSolid = false) =>
  footing(sc.pit, sc.plats || [], cx, cx - SPEED.run, prevY, y, wasOnGround, pitsSolid);

// ─────────────────────────────────────────────────────────────
// ตรวจแบบไม่ต้องวิ่ง — กฎที่ดูจากผังก็รู้ว่าผิด
// ─────────────────────────────────────────────────────────────
function staticIssues(sc) {
  const out = [];
  const bars = sc.obs.filter(isLowObstacle);
  const solids = sc.obs.filter((o) => !isLowObstacle(o));

  for (const b of bars) {
    for (const o of solids) {
      if (b.x < o.x + o.w && o.x < b.x + b.w) {
        out.push({ bad: true, msg: `คานที่ x=${Math.round(b.x)} คร่อม${name(o.kind)}ที่ x=${Math.round(o.x)} — ใต้คานต้องหมอบ แต่หมอบแล้วชน ผ่านไม่ได้เลย` });
      }
    }
    for (const p of sc.pit) {
      if (b.x < p.x + p.w && p.x < b.x + b.w) {
        out.push({ bad: true, msg: `คานที่ x=${Math.round(b.x)} คร่อมปากหลุม — หมอบแล้วตกหลุม กระโดดก็ชนคาน` });
      }
    }
  }

  for (const o of solids) {
    for (const p of sc.pit) {
      if (o.x < p.x + p.w && p.x < o.x + o.w) {
        out.push({ bad: true, msg: `${name(o.kind)}ที่ x=${Math.round(o.x)} ตั้งคร่อมปากหลุม — ไม่มีพื้นรองรับ` });
      }
    }
  }

  for (const o of sc.obs) {
    if (o.x < 0 || o.x + o.w > sc.width) {
      out.push({ bad: false, msg: `${name(o.kind)}ที่ x=${Math.round(o.x)} ล้นขอบท่อน จะไปทับท่อนที่ต่อมา` });
    }
  }
  for (const p of sc.pit) {
    if (p.x < 0 || p.x + p.w > sc.width) {
      out.push({ bad: false, msg: `หลุมที่ x=${Math.round(p.x)} ล้นขอบท่อน` });
    }
  }
  // ── ของพิเศษ ──
  // สองข้อนี้คือกฎเดียวกับที่ Level ใช้ตอนหาที่วางให้เอง แค่ย้ายมาบอกตั้งแต่ตอนออกแบบ
  // (ใต้คานหมอบอย่างเดียว ของที่หย่อนลงตรงนั้นจึงหลบไม่ได้ — เกมจะลบทิ้งให้ ดู underBar)
  const specials = [
    ...(sc.fallers || []).map((f) => ({ x: f.x, w: f.w, what: 'ของร่วง' })),
    ...(sc.hazards || []).map((h) => ({ x: h.x, w: h.w, what: h.kind === 'bee' ? 'ผึ้ง' : 'ลูกบอล' })),
  ];
  for (const s of specials) {
    for (const b of bars) {
      if (b.x < s.x + s.w && s.x < b.x + b.w) {
        out.push({ bad: true, msg: `${s.what}ที่ x=${Math.round(s.x)} อยู่ในช่วงคาน — ใต้คานต้องหมอบ หลบไม่ได้ เกมจะลบชิ้นนี้ทิ้งเองตอนวิ่งถึง` });
      }
    }
    for (const p of sc.pit) {
      if (p.x < s.x + s.w && s.x < p.x + p.w) {
        out.push({ bad: false, msg: `${s.what}ที่ x=${Math.round(s.x)} อยู่เหนือปากหลุม — ต้องข้ามหลุมพร้อมหลบของไปด้วย ดูให้แน่ว่ายังมีทางออก` });
      }
    }
    if (s.x < 0 || s.x + s.w > sc.width) {
      out.push({ bad: false, msg: `${s.what}ที่ x=${Math.round(s.x)} ล้นขอบท่อน` });
    }
  }
  for (const h of sc.hazards || []) {
    if (h.kind !== 'bee') continue;
    const low = sc.fish.some((f) => f.y > GROUND_Y - BODY.slideH && Math.abs(f.x - (h.x + h.w / 2)) < 130);
    if (!low) {
      out.push({ bad: false, msg: `ผึ้งที่ x=${Math.round(h.x)} ยังไม่มีแถวเตี้ยลอดใต้ตัว — ผึ้งที่เกมโรยเองจะได้เส้นนำทางอัตโนมัติ แต่ตัวที่วางเองไม่ได้ ควรวาง “แถวลอดใต้คาน” ไว้ใต้มัน` });
    }
  }

  for (const p of sc.pickups || []) {
    for (const b of bars) {
      if (p.x > b.x - 20 && p.x < b.x + b.w + 20) {
        out.push({ bad: false, msg: `${ITEM_DEFS[p.kind].label}ที่ x=${Math.round(p.x)} อยู่ในช่วงคาน — ลอยสูงระดับเดียวกับคาน เก็บไม่ได้ถ้าไม่ชน` });
      }
    }
  }

  // ── ท่อนทางเข้าด่าน ──
  if (sc.gate && GATES[sc.gate]) {
    const m = gateMarks(GATES[sc.gate], 0);
    const busy = sc.obs.length + (sc.hazards || []).length + (sc.fallers || []).length;
    if (busy) {
      out.push({ bad: false, msg: `ทางเข้าด่านมีสิ่งกีดขวาง ${busy} ชิ้น — ช่วงนี้เกมกำลังเตรียมฉากใหม่และผู้เล่นกำลังมองสถานที่ ควรเป็นทางโล่ง` });
    }
    for (const p of sc.pit) {
      if (p.x < m.doorOut && m.doorIn < p.x + p.w) {
        out.push({ bad: true, msg: `หลุมที่ x=${Math.round(p.x)} อยู่ในตัวร้าน — พื้นร้านวาดทับหลุมจนมองไม่เห็น ผู้เล่นจะตกโดยไม่รู้ตัว` });
      }
    }
  }

  // ── พื้นเหยียบ ──
  for (const p of sc.plats || []) {
    if (p.kind === 'ledge') {
      const lift = GROUND_Y - p.top;
      if (lift > REACH_DBL) {
        out.push({ bad: true, msg: `พื้นลอยที่ x=${Math.round(p.x)} สูง ${lift}px — กระโดดสองชั้นยกเท้าได้แค่ ${REACH_DBL}px ขึ้นไม่ถึง` });
      } else if (lift > REACH_HOP) {
        out.push({ bad: false, msg: `พื้นลอยที่ x=${Math.round(p.x)} สูง ${lift}px — เกินกระโดดเดี่ยว (${REACH_HOP}px) ต้องกดสองชั้นทุกครั้ง` });
      }
    } else {
      for (const o of sc.obs) {
        if (!isLowObstacle(o) && o.x < p.x + p.w && p.x < o.x + o.w) {
          out.push({ bad: false, msg: `${name(o.kind)}ที่ x=${Math.round(o.x)} อยู่บนเนิน — สิ่งกีดขวางยังตั้งที่ระดับพื้นเสมอ จะจมอยู่ในเนิน` });
        }
      }
    }
    if (p.x < 0 || p.x + p.w > sc.width) {
      out.push({ bad: false, msg: `พื้นเหยียบที่ x=${Math.round(p.x)} ล้นขอบท่อน` });
    }
  }
  const surf = sc.fish.filter((f) => highestTop(sc.plats || [], f.x) !== null);
  for (const f of surf) {
    const top = highestTop(sc.plats, f.x);
    if (f.y > top) { out.push({ bad: false, msg: `ของกินที่ x=${Math.round(f.x)} จมอยู่ใต้ผิวพื้นเหยียบ — ลองตั้งชั้นเป็น “เกาะผิวพื้นเหยียบ”` }); break; }
  }

  if (!sc.jumps.length && sc.obs.some((o) => !isLowObstacle(o))) {
    out.push({ bad: false, msg: 'มีของให้ข้ามแต่ไม่ได้ประกาศจุดกดเลย ตรวจด่านจะจำลองไม่ได้' });
  }
  return out;

  function name(k) {
    return k === 'spike' ? 'หนาม' : k === 'crate' ? 'ลัง' : k === 'bar' ? 'คาน' : k === 'prop' ? 'สิ่งกีดขวาง' : k;
  }
}

/** เอาท่อนนี้ไปต่อกับทุกท่อนที่มีอยู่ แล้วดูว่าคานไปคร่อมของแข็งเข้าไหม */
function joinIssues(sc) {
  const after = [];
  const before = [];
  for (let b = 0; b < PATTERNS.length; b++) {
    const B = PATTERNS[b](sc.width);
    if (clash(sc.obs, B.obs)) after.push(b);
  }
  for (let a = 0; a < PATTERNS.length; a++) {
    const Aa = PATTERNS[a](0);
    const off = Aa.width || chunkW;
    const mine = sc.obs.map((o) => ({ ...o, x: o.x + off }));
    if (clash(Aa.obs, mine)) before.push(a);
  }
  return { after, before };

  function clash(l1, l2) {
    const all = [...l1, ...l2];
    const bars = all.filter(isLowObstacle);
    const solids = all.filter((o) => !isLowObstacle(o));
    return bars.some((b) => solids.some((o) => b.x < o.x + o.w && o.x < b.x + b.w));
  }
}

// ─────────────────────────────────────────────────────────────
// รายงานผล
// ─────────────────────────────────────────────────────────────
const reportEl = document.getElementById('report');

function runCheck() {
  const whole = view.mode === 'stage';
  const sc = whole || view.refIdx >= 0
    ? active()
    : { ...build(doc()), width: doc().width, partial: !!doc().partial, gate: doc().gate || null };
  sim = simulate(doc(), whole ? sc : null);
  const statics = staticIssues(sc);
  // ท่อนทางเข้าไม่ถูกสุ่มต่อกับท่อนอื่น ไม่ต้องตรวจการต่อท่อน
  // ส่วนโหมดทั้งด่าน joinIssues ยังมีความหมาย: มันตรวจ "ท่อนสุดท้ายต่อกับท่อนแรก"
  // ซึ่งคือรอยวนจริงของด่าน เพราะเกมอ่าน route ด้วย chunkIndex % route.length
  const join = sc.gate ? { after: [], before: [], gate: true } : joinIssues(sc);

  const rows = [];
  if (whole) {
    rows.push(`<b>ทั้งด่าน “${esc(stage().name)}”</b> — ${sc.slots.length} ท่อน ยาวรวม ${Math.round(sc.width)}px`);
  }
  if (sim.death) {
    const what = {
      pit: 'ตกหลุม', bar: 'ชนคาน', spike: 'ชนหนาม', crate: 'ชนลัง',
      bee: 'ชนผึ้ง', ball: 'โดนลูกบอลชน', faller: 'โดนของร่วงทับ',
    }[sim.death.what] || 'ชน';
    rows.push(`<b class="bad">เล่นตามเฉลยแล้วตาย</b> — ${what} ที่ x=${sim.death.at}`);
  } else {
    rows.push('<b class="ok">เล่นตามเฉลยแล้วรอดจนจบท่อน</b>');
  }

  const pct = sim.total ? Math.round((sim.got / sim.total) * 100) : 100;
  // ท่อนที่ตั้งใจให้เลือกเก็บชั้นใดชั้นหนึ่ง เก็บไม่ครบคือถูกแล้ว
  const cls = sim.scene.partial ? 'ok' : pct === 100 ? 'ok' : pct >= 90 ? 'warn' : 'bad';
  rows.push(`ของกิน <b class="${cls}">${sim.got}/${sim.total}</b> (${pct}%)` +
    (sim.scene.partial ? ' — ท่อนนี้ตั้งใจให้เก็บได้ไม่ครบในรอบเดียว'
      : sim.missed.length ? ' — เม็ดที่เก็บไม่ได้คาดวงแดงไว้ในสนามแล้ว' : ''));

  // ระยะลอยพ้นที่ฉิวเฉียดที่สุด บอกว่าจังหวะกดต้องเป๊ะแค่ไหน
  let tight = null;
  for (const [o, gap] of sim.clear) {
    if (!tight || gap < tight.gap) tight = { o, gap };
  }
  if (tight) {
    const frames = (tight.gap / (PHYSICS.gravity * 8)).toFixed(1);
    const c = tight.gap < 10 ? 'bad' : tight.gap < 26 ? 'warn' : 'ok';
    rows.push(`ลอยพ้นของที่เฉียดที่สุด <b class="${c}">${tight.gap.toFixed(1)}px</b>` +
      ` (ราว ${frames} เฟรม) — ต่ำกว่า 10px ถือว่าโหดเกินไป`);
  }

  if (sim.items.length) {
    const list = sim.items.map((p, i) => {
      const ok = sim.itemAt[i] < Infinity;
      return `<span class="${ok ? 'ok' : 'warn'}">${ITEM_DEFS[p.kind].label} ${ok ? '✓' : '✗ เก็บไม่ถึง'}</span>`;
    });
    rows.push('ไอเท็ม: ' + list.join(' · '));
  }
  for (const ev of sim.events) rows.push(`<span class="ok">${ev}</span>`);
  if ((sc.fallers || []).length || (sc.hazards || []).length) {
    rows.push('<span class="tip">ผึ้ง ลูกบอล และของร่วง ขยับตามเวลาจริงและเริ่มทำงานตอนเข้าจอเหมือนในเกม — เลื่อนแถบเฟรมหรือกด “เล่นดู” เพื่อดูจังหวะ</span>');
  }

  if (sim.missedPress.length) {
    rows.push(`<span class="warn">จุดกดที่ใช้ไม่ได้: x=${sim.missedPress.join(', ')} — กระโดดครบสองครั้งไปแล้วยังไม่แตะพื้น</span>`);
  }

  const bad = statics.filter((s) => s.bad);
  const warn = statics.filter((s) => !s.bad);
  if (bad.length) rows.push('<b class="bad">ผิดกฎ</b><ul>' + bad.map((s) => `<li>${s.msg}</li>`).join('') + '</ul>');
  if (warn.length) rows.push('<b class="warn">ควรดูอีกที</b><ul>' + warn.map((s) => `<li>${s.msg}</li>`).join('') + '</ul>');

  if (join.gate) {
    const L = GATES[sc.gate].layout;
    const w = L.why;
    rows.push(`<span class="ok">ทางเข้าด่าน: ${GATES[sc.gate].name}</span> — ยาว ${L.length}px (${L.chunks} ท่อน ≈ ${(w.totalFrames / 60).toFixed(1)} วิ)` +
      ` · ชานหน้าร้าน ${L.approach}px · ในร้าน ${L.interior}px · หลังออกประตู ${L.exit}px`);
    rows.push(`<span class="tip">ช่วงสลับฉาก ${L.cover}px = (ขั้นเตรียมฉาก ${w.preloadSteps} + สลับ 1 + สำรอง ${w.framesNeeded - w.preloadSteps - 1}) เฟรม` +
      ` × ${w.vMax.toFixed(2)}px/เฟรม (ติดสปีด) × ${w.dtBudget} (เผื่อเครื่องเฟรมตก) — คำนวณจากค่าจริงของเกม (gates.js)</span>`);
  } else if (join.after.length || join.before.length) {
    const t = [];
    if (join.after.length) t.push(`วางต่อหน้าท่อน ${join.after.join(', ')} ไม่ได้`);
    if (join.before.length) t.push(`วางต่อหลังท่อน ${join.before.join(', ')} ไม่ได้`);
    rows.push(`<span class="warn">การต่อท่อน: ${t.join(' · ')}</span>` +
      ' — เกมมีตารางกันคู่พวกนี้อยู่แล้ว (BAD_JOIN) ท่อนจะยังใช้ได้ แต่ยิ่งชนกันมาก ลำดับที่สุ่มได้ก็ยิ่งแคบ');
  } else {
    rows.push('<span class="ok">ต่อกับท่อนอื่นได้ทุกท่อน</span>');
  }

  reportEl.innerHTML = rows.join('<br>');

  const scrub = document.getElementById('scrub');
  scrub.max = String(Math.max(0, sim.frames.length - 1));
  scrub.value = String(sim.death ? sim.death.frame : 0);
  scrub.disabled = false;
  scrubAt = Number(scrub.value);
  updateScrubTxt();
  if (sim.death) centerOn(sim.death.at);
}

function updateScrubTxt() {
  const el = document.getElementById('scrubTxt');
  if (!sim || scrubAt < 0) { el.textContent = '—'; return; }
  const f = sim.frames[scrubAt];
  el.textContent = `เฟรม ${scrubAt} · x=${Math.round(f.cx)}`;
}

function centerOn(x) { view.cam = clampCam(x - W / 2); }

function clampCam(c) {
  // ── ทำไมไม่ใช้ scene.width ตรง ๆ ──
  // scene คือของที่วาดไปเมื่อเฟรมที่แล้ว ตอนเพิ่งสลับโหมดมันยังเป็นของโหมดก่อนหน้าอยู่
  // สลับจากท่อนเดี่ยวมาทั้งด่านแล้วสั่งเลื่อนไปท่อนที่ 6 กล้องจะโดนหนีบด้วยความกว้าง
  // ของท่อนเดียว (900px) แล้วเด้งกลับไปต้นด่านทันที — เจอมาจริงจากการทดสอบ
  const w = view.mode === 'stage' ? stageScene().width
    : (scene && !scene.slots ? scene.width : chunkW);
  return Math.max(-160, Math.min(w + 160 - W, c));
}

// ─────────────────────────────────────────────────────────────
// แก้เอกสาร
// ─────────────────────────────────────────────────────────────
/** มีอะไรเปลี่ยนแล้ว ผลตรวจเดิมใช้ไม่ได้อีก */
function dirty() {
  save();
  // แก้ของในท่อนเดียว = ตำแหน่งของทั้งด่านหลังจากนั้นเลื่อนตามได้ ต้องปูใหม่ทั้งด่าน
  // ล้างของเก่าทิ้งเฉย ๆ เท่านั้น เดี๋ยว stageScene() ปูใหม่เองตอนวาดเฟรมถัดไป
  // ห้ามสั่งวาดหน้าตาใหม่ตรงนี้ — ตัวนี้ถูกเรียกทุกเฟรมระหว่างลากของ
  if (view.mode === 'stage') stageCache = null;
  sim = null;
  scrubAt = -1;
  const el = document.getElementById('scrub');
  if (el) el.disabled = true;
}

// ─────────────────────────────────────────────────────────────
// ย้อนกลับ / ทำซ้ำ
//
// เก็บเป็น "ภาพถ่ายสถานะทั้งก้อน" (เอกสารทุกท่อน + ลำดับท่อนทุกด่าน) ไม่ใช่เก็บเป็นคำสั่ง
// เพราะการแก้ในหน้านี้มีหลายแบบมาก (ลากของ เปลี่ยนแพตเทิร์น สลับท่อน แปลงท่อน โรยไอเท็ม)
// ถ้าเก็บเป็นคำสั่งต้องเขียนวิธีย้อนของแต่ละแบบแยกกัน แล้วพลาดง่ายเวลาเพิ่มของใหม่
// ก้อนละไม่กี่สิบ KB และเก็บไว้แค่ 60 ก้าว จึงคุ้มกว่ามาก
// ─────────────────────────────────────────────────────────────
function snapshot() {
  return JSON.stringify({ cur, docs, routes });
}

function applySnapshot(s) {
  const o = JSON.parse(s);
  docs = o.docs;
  cur = Math.min(o.cur, docs.length - 1);
  if (o.routes) { routes = o.routes; saveRoutes(); }
  stageCache = null;
  sel = null;
  sim = null;
  scrubAt = -1;
  save();
  refreshAll();
  syncHistoryBtns();
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  // ลงมือทำอะไรใหม่ = ทางเดินไปข้างหน้าเส้นเดิมใช้ไม่ได้แล้ว (กติกาเดียวกับทุกโปรแกรม)
  redoStack.length = 0;
  syncHistoryBtns();
}

function undo() {
  const s = undoStack.pop();
  if (!s) return;
  redoStack.push(snapshot());
  const keep = sel;
  applySnapshot(s);
  keepSel(keep);
}

function redo() {
  const s = redoStack.pop();
  if (!s) return;
  undoStack.push(snapshot());
  const keep = sel;
  applySnapshot(s);
  keepSel(keep);
}

/** ย้อน/ทำซ้ำแล้วชิ้นเดิมยังอยู่ = เลือกค้างไว้ (G → Ctrl+Z → G ต่อได้เลย ไม่ต้องคลิกเลือกใหม่) */
function keepSel(id) {
  if (id && byId(doc(), id)) {
    sel = id;
    renderInspector();
  }
}

/** ปุ่มต้องบอกได้ว่าตอนนี้ย้อนได้หรือไม่ได้ ไม่ใช่กดแล้วเงียบ */
function syncHistoryBtns() {
  const u = document.getElementById('undoBtn');
  const r = document.getElementById('redoBtn');
  if (u) u.disabled = !undoStack.length;
  if (r) r.disabled = !redoStack.length;
}

function mutate(fn) {
  if (locked()) return;
  pushUndo();
  fn(doc());
  dirty();
  renderInspector();
  updateCount();
}

function addItem(kit, x) {
  const it = { id: uid(), t: kit.t, group: kit.group, x: Math.round(x) };
  if (kit.rows) it.rows = kit.rows;
  if (kit.w) it.w = kit.w;
  if (kit.n !== undefined) it.n = kit.n;
  if (kit.gap !== undefined) it.gap = kit.gap;
  if (kit.humps !== undefined) it.humps = kit.humps;
  if (kit.warn !== undefined) it.warn = kit.warn;
  if (kit.top) it.top = kit.top;
  if (kit.h !== undefined) it.h = kit.h;
  if (kit.lift !== undefined) it.lift = kit.lift;
  if (kit.under) it.under = true;
  if (kit.kind) it.kind = kit.kind;
  mutate((d) => {
    d.items.push(it);
    snapTo(d, it, Math.round(x));
  });
  sel = it.id;
  return it;
}

/** ดูดเข้าเกาะจุดกดที่ใกล้ที่สุด ถ้าไม่มีอันไหนใกล้พอก็ปล่อยเป็นพิกัดอิสระ */
const SNAP = 12;

/**
 * @param tol ระยะที่ยอมให้ห่างแล้วยังนับว่า "เกาะ" — ปกติ 12px เพื่อให้ลากแล้วดูดติดง่าย
 *   แต่ตอนแปลงท่อนของเกมมาเป็นเอกสาร ต้องส่ง 0 เข้ามา เพราะการดูดคือการ "ย้ายของ"
 *   ของที่อยู่ห่างจุดเกาะ 5px จะถูกดึงไปชิดจุดเกาะ = ท่อนที่แปลงมาไม่เหมือนต้นฉบับอีกต่อไป
 *   (วัดแล้ว: คานกับหลุมในเก้าท่อนเลื่อนตำแหน่งเพราะเหตุนี้)
 */
function snapTo(d, it, wantX, tol = SNAP) {
  const keys = ANCHOR_SET[it.group];
  if (!keys) { it.x = wantX; delete it.link; return; }

  let best = null;
  for (const j of d.items) {
    if (j.t !== 'jump' || j.id === it.id) continue;
    const base = xOf(d, j);
    for (const key of keys) {
      const a = ANCHORS[key];
      const cand = CENTERED.has(it.group) ? base + a.v - itemW(it) / 2 : base + a.v;
      const dist = Math.abs(cand - wantX);
      if (dist <= tol && (!best || dist < best.dist)) best = { dist, id: j.id, key };
    }
  }

  if (best) { it.link = { id: best.id, key: best.key }; }
  else { delete it.link; it.x = wantX; }
}

function delItem(id) {
  mutate((d) => {
    d.items = d.items.filter((q) => q.id !== id);
    // ของที่เกาะชิ้นที่ถูกลบอยู่ ต้องกลายเป็นพิกัดอิสระที่เดิม ไม่ใช่กระเด็นไป 0
    for (const q of d.items) {
      if (q.link && q.link.id === id) { q.x = Math.round(xOf(d, q)); delete q.link; }
      if (q.runTo === id) delete q.runTo;
    }
  });
  if (sel === id) sel = null;
}

// ─────────────────────────────────────────────────────────────
// เมาส์บนสนาม
// ─────────────────────────────────────────────────────────────
let drag = null;

function worldAt(ev) {
  const r = cv.getBoundingClientRect();
  return {
    x: docCam() + (ev.clientX - r.left) * (W / r.width),
    y: (ev.clientY - r.top) * (H / r.height),
  };
}

/**
 * คลิกอยู่ห่างจาก "ตัวของจริง" ของชิ้นนี้เท่าไร — null = ไม่โดนตัวมัน
 *
 * ของแต่ละชนิดมีตัวจริงคนละแบบ จึงวัดคนละวิธี:
 *   ของกิน  = ระยะถึงเม็ดที่ใกล้ที่สุด (กรอบของมันคือกรอบรวมทั้งแถว ข้างในโล่ง)
 *   ไอเท็ม   = ระยะถึงกึ่งกลางชิ้น (วาดเป็นวงกลม ไม่ใช่สี่เหลี่ยมเต็มกรอบ)
 *   ที่เหลือ = ก้อนทึบเต็มกรอบอยู่แล้ว ให้ค่าคงที่เล็ก ๆ
 *
 * ── ทำไมของทึบไม่ใช่ 0 ──
 * ถ้าให้ 0 ก้อนทึบจะชนะทุกอย่างเสมอ เม็ดปลาที่วางทับลังอยู่จะคลิกไม่โดนเลย
 * ให้ 6 แทน = เม็ดที่คลิกตรงกลางเป๊ะ (ห่างไม่ถึง 6) ยังชนะได้ ส่วนคลิกห่าง ๆ ก้อนทึบชนะ
 */
const SOLID_DIST = 6;

function hitDist(d, it, p) {
  if (FOOD_T.has(it.t)) {
    const one = build(soloDoc(d, it));
    let best = null;
    for (const f of one.fish) {
      const dist = Math.hypot(f.x - p.x, f.y - p.y);
      if (dist <= f.r + 7 && (best === null || dist < best)) best = dist;
    }
    return best;
  }
  if (it.t === 'item') {
    const def = ITEM_DEFS[it.kind];
    const b = itemBox(d, it);
    const dist = Math.hypot(b.x + b.w / 2 - p.x, b.y + b.h / 2 - p.y);
    return dist <= (def ? def.r : 18) + 7 ? dist : null;
  }
  return SOLID_DIST;
}

/**
 * ของที่อยู่ใต้จุดที่คลิก
 *
 * ── ทำไมไม่ตัดสินด้วย "กรอบเล็กสุด" อย่างเดียวเหมือนเดิม ──
 * กรอบของของกินคือกรอบรวมของเม็ดทั้งแถว ซึ่งข้างในโล่งเป็นส่วนใหญ่
 * ลายที่วาดเอง (fishDots) กรอบยิ่งใหญ่และยิ่งโล่ง ของชิ้นเล็กที่บังเอิญซ้อนอยู่จึงชนะตลอด
 * ผลคือคลิกตรงเม็ดของลายแล้วไปเลือกของชิ้นอื่น กด Delete ก็ลบผิดชิ้น
 * (ผู้ใช้เจอจริง: คลิกตัว M แล้วเลือกไปโดนแถวปลาที่ทับอยู่ ลบเท่าไรตัว M ก็ไม่หาย
 *  วัดแล้ว: คลิกตรงเม็ดของลาย 19 เม็ด กติกาเก่าเลือกถูกแค่ 9 เม็ด)
 *
 * กติกาใหม่: ใครอยู่ใกล้จุดที่คลิกที่สุดคนนั้นชนะ ถ้าไม่โดนตัวใครเลยค่อยใช้กรอบเล็กสุด
 */
function pick(d, p) {
  let near = null;
  let box = null;
  for (const it of d.items) {
    const b = itemBox(d, it);
    if (p.x < b.x - 4 || p.x > b.x + b.w + 4 || p.y < b.y - 4 || p.y > b.y + b.h + 4) continue;
    const area = b.w * b.h;
    const dist = hitDist(d, it, p);
    if (dist !== null) {
      if (!near || dist < near.dist || (dist === near.dist && area < near.area)) near = { it, dist, area };
    } else if (!box || area < box.area) box = { it, area };
  }
  return (near && near.it) || (box && box.it) || null;
}

cv.addEventListener('pointerdown', (ev) => {
  // คลิกขวาไว้ยกเลิก G/S (ดักไว้ที่คีย์ลัดแบบ Blender) นอกนั้นไม่ทำอะไร ไม่ไปเลือกชิ้น
  if (ev.button === 2) return;
  cv.setPointerCapture(ev.pointerId);
  const p = worldAt(ev);
  // คลิกกลางค้าง = เลื่อนจอเสมอ แม้กดโดนชิ้นอยู่ (แบบ Blender)
  if (locked() || ev.button === 1) { ev.preventDefault(); drag = { kind: 'pan', sx: ev.clientX, cam: view.cam }; return; }
  const d = doc();

  // ที่จับยืดปลายขวาของชิ้นที่เลือกอยู่ มาก่อนเสมอ
  const it = sel && byId(d, sel);
  if (it) {
    const hx = handleX(d, it);
    const b = itemBox(d, it);
    if (hx !== null && Math.abs(p.x - hx) < 9 && Math.abs(p.y - (b.y + b.h / 2)) < 14) {
      drag = { kind: 'resize', id: it.id };
      pushUndo();
      return;
    }
  }

  const hit = pick(d, p);
  if (hit) {
    sel = hit.id;
    renderInspector();
    // แถวพื้นลากขึ้นลงได้ด้วย จึงต้องจำระยะแนวตั้งจากจุดที่จับไว้ ไม่งั้นแถวจะกระตุกมาอยู่ใต้นิ้ว
    const offY = (hit.t === 'fishRun' || hit.t === 'fishDots') ? p.y - (A.RUN_Y - (hit.rise || 0)) : 0;
    drag = { kind: 'move', id: hit.id, off: p.x - xOf(d, hit), offY, sy: p.y };
    pushUndo();
    return;
  }

  sel = null;
  renderInspector();
  drag = { kind: 'pan', sx: ev.clientX, cam: view.cam };
});

cv.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const d = doc();

  if (drag.kind === 'pan') {
    const r = cv.getBoundingClientRect();
    view.cam = clampCam(drag.cam - (ev.clientX - drag.sx) * (W / r.width));
    return;
  }

  const p = worldAt(ev);
  const it = byId(d, drag.id);
  if (!it) return;

  if (drag.kind === 'move') {
    snapTo(d, it, Math.round(p.x - drag.off));
    // ต้องขยับแนวตั้งเกิน LANE_SNAP ก่อนถึงนับว่าตั้งใจลากขึ้นลง — ลากแนวนอนมือสั่นนิดหน่อยแถวไม่หลุดชั้น
    if (it.t === 'fishRun' && (drag.lifting || Math.abs(p.y - drag.sy) > LANE_SNAP)) {
      drag.lifting = true;
      setRise(it, A.RUN_Y - (p.y - drag.offY));
    }
    // ลายวาดเองเลื่อนขึ้นลงได้ทุกพิกเซล ไม่ดูดเข้าชั้น — ลายต้องอยู่ตรงที่คนวางตั้งใจ
    if (it.t === 'fishDots' && (drag.lifting || Math.abs(p.y - drag.sy) > 6)) {
      drag.lifting = true;
      it.rise = Math.round(A.RUN_Y - (p.y - drag.offY));
    }
    dirty();
    renderInspector();
    return;
  }

  if (drag.kind === 'resize') {
    const left = xOf(d, it);
    if (it.t === 'pit') it.w = Math.max(40, Math.round(p.x - left));
    else if (PLAT_T.has(it.t)) it.w = Math.max(80, Math.round(p.x - left));
    else {
      if (it.runTo) delete it.runTo;
      it.n = Math.max(1, Math.round((p.x - left) / it.gap) + 1);
    }
    dirty();
    renderInspector();
  }
});

function endDrag() {
  if (drag && drag.kind !== 'pan') {
    updateCount();
    // ความกว้างท่อนกับไอคอนบนไทม์ไลน์อาจเปลี่ยน — อัปเดตทีเดียวตอนปล่อยมือ
    // ไม่ใช่ทุกเฟรมระหว่างลาก เพราะมันสร้างปุ่มใหม่ทั้งแถบ
    if (view.mode === 'stage') renderStageUI();
  }
  drag = null;
}

cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);

// ── ลากจากกล่องเครื่องมือ ─────────────────────────────
function wireChip(el, kit) {
  el.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    if (locked()) return;
    let made = null;
    const move = (e) => {
      const r = cv.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) return;
      // docCam ไม่ใช่ view.cam — โหมดทั้งด่านวางเอกสารไว้กลางด่าน ถ้าใช้พิกัดโลก
      // ของที่วางจะไปโผล่ที่ x=2500 ของท่อน ซึ่งอยู่นอกท่อนไปไกล
      const wx = docCam() + (e.clientX - r.left) * (W / r.width);
      if (!made) { made = addItem(kit, wx); return; }
      // ระหว่างลากไม่ผ่าน mutate เพราะไม่อยากได้ก้อนย้อนกลับหนึ่งก้อนต่อหนึ่งเฟรม
      const d = doc();
      snapTo(d, byId(d, made.id), Math.round(wx));
      dirty();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      // กดเฉย ๆ ไม่ได้ลากไปไหน = วางกลางจอให้เลย
      // ต้องเป็น docCam() ไม่ใช่ view.cam ด้วยเหตุผลเดียวกับตอนลาก (ดูใน move)
      if (!made) addItem(kit, Math.round(docCam() + W / 2));
      updateCount();
      renderInspector();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
}

// ── แถบภาพรวมใช้เลื่อนจอ ──────────────────────────────
let stripDrag = false;

function stripSeek(ev) {
  const r = strip.getBoundingClientRect();
  const span = Math.max(scene.width + 240, W + 240);
  const world = ((ev.clientX - r.left) / r.width) * span - 120;
  view.cam = clampCam(world - W / 2);
}

strip.addEventListener('pointerdown', (ev) => { stripDrag = true; strip.setPointerCapture(ev.pointerId); stripSeek(ev); });
strip.addEventListener('pointermove', (ev) => { if (stripDrag) stripSeek(ev); });
strip.addEventListener('pointerup', () => { stripDrag = false; });

// ── ปุ่มลัด ───────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// คีย์ลัดแบบ Blender
//
// ── G / S เป็น "โหมดค้าง" ไม่ใช่การลาก ──
// กด G แล้วของที่เลือกจะเดินตามเมาส์ทันทีโดยไม่ต้องกดค้าง จนกว่าจะคลิกซ้าย/Enter (ยืนยัน)
// หรือคลิกขวา/Esc (ยกเลิก คืนที่เดิมเป๊ะ) ระหว่างนั้นกด X/Y ล็อกแกน พิมพ์ตัวเลขใส่ระยะตรง ๆ ได้
// ทั้งหมดนับเป็นก้าวย้อนกลับก้าวเดียว (Ctrl+Z ทีเดียวกลับที่เดิม)
//
// รายการคีย์ทั้งหมดอยู่ใน KEYS ข้างล่าง — แผง ? กับไฟล์ EDITOR_KEYS.txt สร้างจากชุดเดียวกัน
// เพิ่มคีย์ใหม่ต้องเพิ่มใน KEYS ด้วย ไม่งั้นแผงช่วยจำจะไม่รู้จัก
// ─────────────────────────────────────────────────────────────

/** ตำแหน่งเมาส์ล่าสุดบนสนาม (พิกัดเอกสาร) — G/S ใช้เป็นจุดตั้งต้น */
let lastP = { x: 0, y: 0 };
/** โหมดค้างที่กำลังทำอยู่ (G ย้าย / S ยืด) — null = ไม่มี */
let gmod = null;

const KEYS = [
  ['ย้าย / ยืด (แบบ Blender)', [
    ['G', 'ย้ายชิ้นที่เลือก — ของเดินตามเมาส์เลย ไม่ต้องกดค้าง'],
    ['S', 'ยืด/หด (ความกว้างหลุม-พื้นลอย หรือจำนวนเม็ด/หนาม) ตามระยะเมาส์'],
    ['X · Y', 'ระหว่าง G: ล็อกให้ขยับแนวนอนอย่างเดียว / แนวตั้งอย่างเดียว (กดซ้ำ = ปลดล็อก)'],
    ['พิมพ์ตัวเลข', 'ระหว่าง G: ระยะเป๊ะเป็นพิกเซล เช่น G 40 Enter, G - 1 2 Enter · ระหว่าง S: ตัวคูณ เช่น S 2 Enter'],
    ['Ctrl (ค้าง)', 'ระหว่าง G: ไม่ดูดเข้าจุดกด วางตรงไหนก็อยู่ตรงนั้น'],
    ['Shift (ค้าง)', 'ระหว่าง G/S: ขยับละเอียด ช้าลง 10 เท่า'],
    ['คลิกซ้าย · Enter · Space', 'ยืนยัน'],
    ['คลิกขวา · Esc', 'ยกเลิก คืนที่เดิม'],
  ]],
  ['เลือก / แก้ชิ้น', [
    ['คลิก', 'เลือกชิ้น (คลิกค้างแล้วลากก็ยังได้เหมือนเดิม)'],
    ['Tab · Shift+Tab', 'เลือกชิ้นถัดไป / ก่อนหน้า (เรียงซ้ายไปขวา)'],
    ['Esc', 'เลิกเลือก'],
    ['Shift+D', 'ทำสำเนาแล้วย้ายต่อทันที (เหมือน Blender)'],
    ['Ctrl+D', 'ทำสำเนาวางถัดไปทางขวา 60px'],
    ['X · Delete', 'ลบชิ้นที่เลือก (Ctrl+Z เอาคืนได้)'],
    ['← →', 'ขยับทีละ 1px · Shift = ทีละ 10px'],
  ]],
  ['มุมมอง', [
    ['F · Numpad .', 'เลื่อนจอไปที่ชิ้นที่เลือก'],
    ['Home', 'กลับไปต้นท่อน'],
    ['ลูกกลิ้งเมาส์', 'เลื่อนจอซ้าย-ขวา'],
    ['คลิกกลางค้าง', 'ลากเลื่อนจอ (คลิกค้างที่ที่ว่างก็ได้)'],
    ['Space', 'เล่น / หยุด การวิ่งทดสอบ'],
  ]],
  ['ทั่วไป', [
    ['Ctrl+Z', 'ย้อนกลับ'],
    ['Ctrl+Shift+Z · Ctrl+Y', 'ทำซ้ำ'],
    ['? · F1', 'เปิด/ปิดแผงคีย์ลัดนี้'],
  ]],
];

// ── แถบบอกสถานะระหว่าง G/S (มุมล่างเหมือนแถบสถานะของ Blender) ──
const modalBar = document.createElement('div');
modalBar.className = 'modalbar hidden';
document.body.appendChild(modalBar);

function showModalBar(text) {
  modalBar.innerHTML = text;
  modalBar.classList.remove('hidden');
}

/** ชิ้นนี้ยืดได้ไหม (มีที่จับปลายขวา = ยืดได้) */
function scalable(d, it) {
  return handleX(d, it) !== null && !(it.t === 'fishRun' && it.runTo);
}

/** ชิ้นนี้ขยับขึ้นลงได้ไหม — แถวพื้นกับลายวาดเอง (ของอื่นอยู่ระดับเดียวเสมอ) */
const canLift = (it) => it.t === 'fishRun' || it.t === 'fishDots';

function startModal(kind) {
  const d = doc();
  const it = sel && byId(d, sel);
  if (!it || locked()) return;
  if (kind === 'scale' && !scalable(d, it)) {
    showModalBar('<b>S</b> ชิ้นนี้ยืดไม่ได้ — ยืดได้เฉพาะหลุม พื้นลอย แถวหนาม และแถวของกิน');
    setTimeout(() => { if (!gmod) modalBar.classList.add('hidden'); }, 1800);
    return;
  }
  playing = false;
  pushUndo();
  const left = xOf(d, it);
  gmod = {
    kind,
    id: it.id,
    snap: undoStack[undoStack.length - 1],   // ก้อนที่ pushUndo เพิ่งเก็บ = สถานะก่อนเริ่ม
    startX: left,
    startRise: it.rise || 0,
    startW: it.w,
    startN: it.n,
    startArm: it.arm || 24,
    startP: { ...lastP },
    // เคอร์เซอร์เสมือน: สะสมระยะที่เมาส์ขยับ (คูณ 0.1 ตอนกด Shift) — กด/ปล่อย Shift แล้วของไม่กระโดด
    cur: { ...lastP },
    // ยืด: วัดจากขอบซ้ายของชิ้น เมาส์ห่างขอบซ้ายเท่าเดิม = ขนาดเดิม (แบบ S ของ Blender)
    pivot: left,
    axis: null,
    typed: '',
    free: false,
  };
  updateModal();
}

/** คำนวณตำแหน่ง/ขนาดใหม่จากจุดตั้งต้นทุกครั้ง (ไม่สะสม) — ยกเลิกแล้วจึงกลับที่เดิมเป๊ะ */
function updateModal() {
  const m = gmod;
  const d = doc();
  const it = byId(d, m.id);
  if (!it) { gmod = null; return; }
  const typed = m.typed === '' || m.typed === '-' ? null : Number(m.typed);

  if (m.kind === 'grab') {
    let dx = m.cur.x - m.startP.x;
    let dy = m.cur.y - m.startP.y;
    if (typed !== null && Number.isFinite(typed)) {
      // พิมพ์ตัวเลข = ระยะตรง ๆ ตามแกนที่ล็อก (ไม่ล็อก = แนวนอน) · แนวตั้งนับขึ้นเป็นบวก
      if (m.axis === 'y') { dx = 0; dy = -typed; } else { dx = typed; dy = 0; }
    }
    if (m.axis === 'x') dy = 0;
    if (m.axis === 'y') dx = 0;

    const want = Math.round(m.startX + dx);
    if (m.free) { it.x = want; delete it.link; } else snapTo(d, it, want);

    if (canLift(it)) {
      const rise = m.startRise - dy;
      if (it.t === 'fishRun') {
        if (dy === 0) it.rise = m.startRise; else setRise(it, rise);
      } else it.rise = Math.round(rise);
    }

    const nx = Math.round(xOf(d, it) - m.startX);
    const ny = Math.round((it.rise || 0) - m.startRise);
    const ax = m.axis === 'x' ? ' · <em>ล็อกแนวนอน</em>' : m.axis === 'y' ? ' · <em>ล็อกแนวตั้ง</em>' : '';
    const snapTxt = it.link ? ' · <em>เกาะจุดกด</em>' : '';
    showModalBar(`<b>G ย้าย</b> x ${nx >= 0 ? '+' : ''}${nx}${canLift(it) ? ` · สูง ${ny >= 0 ? '+' : ''}${ny}` : ''}`
      + (m.typed ? ` · พิมพ์: <kbd>${m.typed}</kbd>` : '') + ax + snapTxt
      + '<span>คลิกซ้าย/Enter ยืนยัน · คลิกขวา/Esc ยกเลิก · X/Y ล็อกแกน · Ctrl ไม่ดูด · Shift ละเอียด</span>');
  } else {
    const base = Math.max(40, Math.abs(m.startP.x - m.pivot));
    let f = 1 + (m.cur.x - m.startP.x) / base;
    if (typed !== null && Number.isFinite(typed)) f = typed;
    f = Math.max(0.05, f);

    let label = '';
    if (it.t === 'pit' || PLAT_T.has(it.t)) {
      it.w = Math.max(it.t === 'pit' ? 40 : 80, Math.round(m.startW * f));
      label = `กว้าง ${it.w}px`;
    } else if (it.t === 'fishFlake') {
      it.arm = Math.max(8, Math.min(90, Math.round(m.startArm * f)));
      label = `แขน ${it.arm}px`;
    } else {
      it.n = Math.max(1, Math.round(m.startN * f));
      label = `${it.n} ชิ้น`;
    }
    showModalBar(`<b>S ยืด</b> ×${f.toFixed(2)} · ${label}`
      + (m.typed ? ` · พิมพ์: <kbd>${m.typed}</kbd>` : '')
      + '<span>คลิกซ้าย/Enter ยืนยัน · คลิกขวา/Esc ยกเลิก · พิมพ์ตัวคูณได้ เช่น 2 · Shift ละเอียด</span>');
  }
  dirty();
  renderInspector();
}

function endModal(ok) {
  const m = gmod;
  gmod = null;
  modalBar.classList.add('hidden');
  if (!m) return;
  if (ok) {
    updateCount();
    if (view.mode === 'stage') renderStageUI();
    return;
  }
  // ยกเลิก = คืนสถานะก่อนเริ่ม และถอนก้าวย้อนกลับที่เพิ่งเก็บทิ้ง (ไม่ได้ทำอะไรจริง)
  undoStack.pop();
  syncHistoryBtns();
  applySnapshot(m.snap);
  sel = m.id;
  renderInspector();
}

/** คีย์ระหว่างโหมดค้าง — คืน true ถ้ากินคีย์นี้ไปแล้ว */
function modalKey(ev) {
  if (!gmod) return false;
  const k = ev.key;
  ev.preventDefault();
  if (k === 'Escape') { endModal(false); return true; }
  if (k === 'Enter' || k === ' ') { endModal(true); return true; }
  if (gmod.kind === 'grab' && (k === 'x' || k === 'X' || k === 'y' || k === 'Y')) {
    const a = k.toLowerCase();
    gmod.axis = gmod.axis === a ? null : a;
    updateModal();
    return true;
  }
  if (/^[0-9.]$/.test(k)) { gmod.typed += k; updateModal(); return true; }
  if (k === '-' ) { gmod.typed = gmod.typed.startsWith('-') ? gmod.typed.slice(1) : '-' + gmod.typed; updateModal(); return true; }
  if (k === 'Backspace') { gmod.typed = gmod.typed.slice(0, -1); updateModal(); return true; }
  if (k === 'Control' || k === 'Meta') { gmod.free = true; updateModal(); return true; }
  return true;   // คีย์อื่นระหว่างโหมดค้างไม่ทำอะไร (กันพลาดไปสั่งอย่างอื่น)
}

window.addEventListener('keyup', (ev) => {
  if (gmod && (ev.key === 'Control' || ev.key === 'Meta')) { gmod.free = false; updateModal(); }
});

// ── เมาส์ระหว่างโหมดค้าง ──
// ฟังทั้งหน้าต่าง ไม่ใช่แค่ผ้าใบ — เมาส์หลุดขอบสนามไประหว่าง G ของยังตามอยู่
window.addEventListener('pointermove', (ev) => {
  const p = worldAt(ev);
  if (gmod) {
    const k = ev.shiftKey ? 0.1 : 1;
    gmod.cur.x += (p.x - lastP.x) * k;
    gmod.cur.y += (p.y - lastP.y) * k;
    lastP = p;
    updateModal();
    return;
  }
  lastP = p;
});
// คลิกที่ไหนก็ได้ระหว่างโหมดค้าง = ซ้ายยืนยัน ขวายกเลิก — ดักตั้งแต่ขาลง ไม่ให้คลิกไปเลือกชิ้นอื่นต่อ
window.addEventListener('pointerdown', (ev) => {
  if (!gmod) return;
  ev.preventDefault();
  ev.stopPropagation();
  endModal(ev.button !== 2);
}, true);

/** ชิ้นทั้งหมดเรียงซ้ายไปขวา — Tab เลือกทีละชิ้น */
function itemsInOrder(d) {
  return [...d.items].sort((a, b) => xOf(d, a) - xOf(d, b) || itemBox(d, a).y - itemBox(d, b).y);
}

function frameSelected() {
  const d = doc();
  const it = sel && byId(d, sel);
  if (!it) return;
  const b = itemBox(d, it);
  view.cam = clampCam(editOff() + b.x + b.w / 2 - W / 2);
}

function duplicateSel(offset) {
  const d = doc();
  const src = byId(d, sel);
  if (!src) return null;
  const copy = { ...src, id: uid(), x: Math.round(xOf(d, src)) + offset };
  delete copy.link;
  delete copy.runTo;
  mutate((dd) => dd.items.push(copy));
  sel = copy.id;
  renderInspector();
  return copy;
}

// ── แผงคีย์ลัด (? / F1) ──
const keysPanel = document.createElement('div');
keysPanel.className = 'keyspanel hidden';
keysPanel.innerHTML = `
  <div class="keysbox" role="dialog" aria-gmod="true" aria-labelledby="keysTitle">
    <button type="button" class="xbtn keys-close" id="keysClose" aria-label="ปิด">
      <svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden="true"><path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <h2 id="keysTitle">คีย์ลัด</h2>
    <p class="tip">แบบเดียวกับ Blender · รายการเต็มอยู่ในไฟล์ EDITOR_KEYS.txt</p>
    <div class="keysgrid">
      ${KEYS.map(([title, rows]) => `<section><h3>${title}</h3><dl>${
        rows.map(([k, v]) => `<dt>${k.split(' · ').map((x) => `<kbd>${x}</kbd>`).join(' ')}</dt><dd>${v}</dd>`).join('')
      }</dl></section>`).join('')}
    </div>
  </div>`;
document.body.appendChild(keysPanel);
const toggleKeys = (on = keysPanel.classList.contains('hidden')) => keysPanel.classList.toggle('hidden', !on);
keysPanel.addEventListener('click', (e) => { if (e.target === keysPanel) toggleKeys(false); });
document.getElementById('keysClose').addEventListener('click', () => toggleKeys(false));
document.getElementById('keysBtn')?.addEventListener('click', () => toggleKeys());

window.addEventListener('keydown', (ev) => {
  const tag = ev.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (modalKey(ev)) return;

  const mod = ev.ctrlKey || ev.metaKey;
  const k = ev.key.toLowerCase();

  if (ev.key === '?' || ev.key === 'F1') { ev.preventDefault(); toggleKeys(); return; }
  if (!keysPanel.classList.contains('hidden')) {
    if (ev.key === 'Escape') toggleKeys(false);
    return;
  }

  // Ctrl+Y กับ Ctrl+Shift+Z ใช้ได้ทั้งคู่ — คนละสำนักแต่เจอบ่อยพอกัน
  if (mod && (k === 'y' || (k === 'z' && ev.shiftKey))) { ev.preventDefault(); redo(); return; }
  if (mod && k === 'z') { ev.preventDefault(); undo(); return; }

  // ── มุมมอง (ไม่ต้องเลือกชิ้นก่อน) ──
  if (ev.key === ' ') { ev.preventDefault(); document.getElementById('playBtn').click(); return; }
  if (ev.key === 'Home') { ev.preventDefault(); view.cam = clampCam(editOff() - 40); return; }
  if (ev.key === 'Tab' && !mod) {
    ev.preventDefault();
    if (locked()) return;
    const list = itemsInOrder(doc());
    if (!list.length) return;
    const i = list.findIndex((q) => q.id === sel);
    const next = i < 0 ? (ev.shiftKey ? list.length - 1 : 0) : (i + (ev.shiftKey ? -1 : 1) + list.length) % list.length;
    sel = list[next].id;
    renderInspector();
    frameSelected();
    return;
  }
  if (ev.key === 'Escape') { if (sel) { sel = null; renderInspector(); } return; }

  if (!sel || locked()) return;

  if ((k === 'f' && !mod) || (ev.code === 'NumpadDecimal')) { ev.preventDefault(); frameSelected(); return; }
  if (k === 'g' && !mod) { ev.preventDefault(); startModal('grab'); return; }
  if (k === 's' && !mod) { ev.preventDefault(); startModal('scale'); return; }
  if (k === 'd' && ev.shiftKey && !mod) {
    ev.preventDefault();
    if (duplicateSel(0)) startModal('grab');
    return;
  }
  if (k === 'd' && mod) { ev.preventDefault(); duplicateSel(60); return; }

  if (ev.key === 'Delete' || ev.key === 'Backspace' || (k === 'x' && !mod)) { ev.preventDefault(); delItem(sel); return; }

  if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
    ev.preventDefault();
    const step = (ev.key === 'ArrowLeft' ? -1 : 1) * (ev.shiftKey ? 10 : 1);
    mutate((d) => {
      const it = byId(d, sel);
      if (it.link) { it.x = Math.round(xOf(d, it)); delete it.link; }
      it.x += step;
    });
  }
});

// ลูกกลิ้ง = เลื่อนจอซ้ายขวา (หน้านี้ไม่มีซูม) · คลิกขวาบนสนามไม่เปิดเมนูของเบราว์เซอร์ (ใช้ยกเลิก G/S)
cv.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const r = cv.getBoundingClientRect();
  const delta = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
  view.cam = clampCam(view.cam + delta * (W / r.width) * 0.9);
  if (gmod) updateModal();
}, { passive: false });
cv.addEventListener('contextmenu', (ev) => ev.preventDefault());

// ─────────────────────────────────────────────────────────────
// แผงรายละเอียดชิ้นที่เลือก
// ─────────────────────────────────────────────────────────────
const inspBody = document.getElementById('inspBody');

function renderInspector() {
  if (view.refIdx >= 0) {
    inspBody.innerHTML = '<p class="tip">กำลังดูท่อนที่มีอยู่ในเกม แก้ไม่ได้ — เลือก “—” ในช่องดูของเดิมเพื่อกลับไปแก้ท่อนของตัวเอง</p>' +
      '<button class="btn ghost" id="grabRef">คัดลอกสิ่งกีดขวาง+จุดกดมาเป็นท่อนใหม่</button>';
    document.getElementById('grabRef').onclick = grabRef;
    return;
  }

  const d = doc();
  const it = sel && byId(d, sel);
  if (!it) {
    inspBody.innerHTML = '<p class="tip">ยังไม่ได้เลือกชิ้นไหน — คลิกที่ของในสนาม</p>';
    return;
  }

  const kit = KIT.find((k) => k.t === it.t && (k.rows === undefined || k.rows === it.rows)
    && (k.kind === undefined || k.kind === it.kind));
  const rows = [];
  // ชื่อบนหัวแผงต้องบอกของชิ้นนี้จริง ๆ ไม่ใช่ชื่อชิปที่ลากมา
  // ชิปเดียวกันทำของได้หลายหน้าตา (หนามคู่ยืดเป็นสี่ได้ แถวพื้นโรยกุ้งได้)
  const top = it.top && TOPS.find(([v]) => v === it.top);
  const extra = it.t === 'spikeRow' ? ` ×${it.n}` : top ? ` · ${top[1]}` : '';
  rows.push(`<p class="pill">${kit ? kit.label : it.t}${extra} · x = ${Math.round(xOf(d, it))}</p>`);

  // จุดเกาะ
  const keys = ANCHOR_SET[it.group];
  const jumpList = d.items.filter((q) => q.t === 'jump' && q.id !== it.id);
  if (keys && jumpList.length) {
    const names = jumpNames(d);
    const opts = ['<option value="">— ไม่เกาะ (พิกัดอิสระ) —</option>'];
    for (const j of jumpList) {
      for (const k of keys) {
        const v = `${j.id}|${k}`;
        const on = it.link && it.link.id === j.id && it.link.key === k;
        opts.push(`<option value="${v}"${on ? ' selected' : ''}>${names.get(j.id)} · ${ANCHORS[k].label}</option>`);
      }
    }
    rows.push('<div class="anchorbox"><p class="tip">เกาะจุดกด — เลื่อนจุดกดแล้วชิ้นนี้ตามไปเอง</p>' +
      `<select id="fAnchor" style="width:100%">${opts.join('')}</select></div>`);
  }

  rows.push('<div class="inspgrid">');
  if (!it.link) rows.push(num('fX', 'x', Math.round(it.x), 1));
  if (it.t === 'crate') rows.push(num('fRows', 'จำนวนชั้น', it.rows, 1, 1, 3));
  if (it.t === 'spikeRow') rows.push(num('fN', 'จำนวนหนาม', it.n, 1, 1, 8));
  if (it.t === 'faller') rows.push(num('fWarn', 'เตือนก่อนตก (เฟรม)', warnOf(it), 5, 10, 180));
  if (it.t === 'bee') rows.push(num('fPhase', 'เฟสเริ่มแกว่ง (องศา)', it.phase || 0, 15, 0, 345));
  if (it.t === 'pit') rows.push(num('fW', 'กว้าง', it.w, 2, 40, 600));
  if (PLAT_T.has(it.t)) rows.push(num('fW', 'กว้าง', it.w, 10, 80, 1200));
  if (it.t === 'hill') rows.push(num('fH', 'สูง', it.h, 5, 20, 140));
  if (it.t === 'ledge') rows.push(num('fLift', 'ลอยสูงจากพื้น', it.lift, 5, 40, 260));
  if (it.t === 'fishRun' && it.lane === 'custom') rows.push(num('fRise', 'ยกสูง (px)', it.rise || 0, 5, -20, 260));
  // ลายวาดเองไม่มี "จำนวนเม็ด" ให้ปรับ — จำนวนมาจากตัวลายเอง แก้ที่กล่องวาดลาย
  if (FOOD_T.has(it.t) && it.t !== 'fishDots' && !(it.t === 'fishRun' && it.runTo)) {
    rows.push(num('fN', 'จำนวนเม็ด', it.n, 1, NEEDS_TWO.has(it.t) ? 2 : 1, 40));
  }
  if (it.t === 'fishDots') rows.push(num('fRise', 'ยกสูง (px)', it.rise || 0, 5, -20, 260));
  if (it.gap !== undefined) rows.push(num('fGap', 'ระยะห่าง', it.gap, 1, gapMin(it), 120));
  if (it.humps !== undefined) rows.push(num('fHumps', 'จำนวนลูกคลื่น', it.humps, 1, 1, 8));
  rows.push('</div>');

  if (it.t === 'fishDots') {
    rows.push(`<p class="tip">ลายวาดเอง ${(it.pts || []).length} เม็ด — กดปุ่มข้างล่างเพื่อเพิ่ม/ลบเม็ดทีละเม็ด</p>`);
    rows.push('<button class="btn ghost" id="fArtEdit" style="width:100%">✎ แก้ลายนี้</button>');
  }

  if (it.t === 'bee') {
    rows.push('<p class="tip">0° = กลางวงแกว่งกำลังลง · 90° = ต่ำสุด · 270° = สูงสุด — ตอนตรวจด่านผึ้งเริ่มแกว่งตอนเข้าจอ เหมือนในเกม</p>');
  }
  if (it.t === 'item' && it.kind === 'letter') {
    const opts = [...WORD].map((ch, i) => `<option value="${i}"${(it.letter || 0) === i ? ' selected' : ''}>${ch}</option>`).join('');
    rows.push('<div class="anchorbox"><p class="tip">ตัวที่โชว์ในหน้านี้ — ในเกมจะเป็นตัวถัดไปที่ผู้เล่นยังไม่ได้เก็บเสมอ</p>' +
      `<select id="fLetter" style="width:100%">${opts}</select></div>`);
  }
  if (it.t === 'item' && ITEM_DEFS[it.kind]) {
    rows.push(`<p class="tip">${ITEM_DEFS[it.kind].sub} · ระยะเก็บ ${ITEM_DEFS[it.kind].pickR}px</p>`);
  }

  if (PLAT_T.has(it.t)) {
    if (it.t === 'ledge') {
      rows.push(`<label class="chk" style="margin:4px 0 8px"><input type="checkbox" id="fUnder"${it.under ? ' checked' : ''}> มีหลุมข้างใต้ (บังคับให้กระโดด)</label>`);
      rows.push(`<p class="tip">กระโดดเดี่ยวยกเท้าได้ ${REACH_HOP}px · สองชั้น ${REACH_DBL}px</p>`);
    }
  }

  if (it.t === 'fishRun') {
    const cur = it.lane || 'run';
    const opts = LANES.map(([v, label]) => `<option value="${v}"${cur === v ? ' selected' : ''}>${label}</option>`).join('');
    rows.push('<div class="anchorbox"><p class="tip">ชั้นของแถวนี้ — หรือ <b>ลากแถวขึ้นลงในสนาม</b> ได้เลย ใกล้ชั้นไหนจะดูดเข้าชั้นนั้น</p>' +
      `<select id="fLane" style="width:100%">${opts}</select></div>`);
  }

  if (FOOD_T.has(it.t)) {
    const opts = TOPS.map(([v, label]) =>
      `<option value="${v}"${(it.top || '') === v ? ' selected' : ''}>${label}</option>`).join('');
    rows.push('<div class="anchorbox"><p class="tip">ของหายากในแถวนี้ — ใช้กฎเดียวกับที่เกมโรยให้เอง</p>' +
      `<select id="fTop" style="width:100%">${opts}</select></div>`);
  }

  if (it.t === 'fishRun') {
    const names = jumpNames(d);
    const opts = ['<option value="">— จำนวนเม็ดคงที่ —</option>'];
    for (const j of jumpList) {
      opts.push(`<option value="${j.id}"${it.runTo === j.id ? ' selected' : ''}>ยืดไปจนถึง ${names.get(j.id)}</option>`);
    }
    rows.push('<div class="anchorbox"><p class="tip">ทางวิ่งนำเข้าจุดกด — เม็ดสุดท้ายคือสัญญาณให้กด</p>' +
      `<select id="fRunTo" style="width:100%">${opts.join('')}</select></div>`);
  }

  rows.push('<div class="row"><button class="btn ghost" id="bDup">ทำสำเนา</button>' +
    '<button class="btn ghost danger" id="bDel">ลบชิ้นนี้</button></div>');

  inspBody.innerHTML = rows.join('');

  bind('fX', (v) => mutate((dd) => { byId(dd, it.id).x = v; }));
  bind('fRows', (v) => mutate((dd) => { byId(dd, it.id).rows = Math.max(1, Math.min(3, v)); }));
  bind('fW', (v) => mutate((dd) => { byId(dd, it.id).w = Math.max(PLAT_T.has(it.t) ? 80 : 40, v); }));
  bind('fN', (v) => mutate((dd) => { byId(dd, it.id).n = Math.max(1, v); }));
  bind('fGap', (v) => mutate((dd) => { byId(dd, it.id).gap = Math.max(gapMin(it), v); }));
  bind('fWarn', (v) => mutate((dd) => { byId(dd, it.id).warn = Math.max(10, Math.min(180, v)); }));
  bind('fH', (v) => mutate((dd) => { byId(dd, it.id).h = Math.max(20, Math.min(140, v)); }));
  bind('fPhase', (v) => mutate((dd) => { byId(dd, it.id).phase = ((Math.round(v) % 360) + 360) % 360; }));
  const lt = document.getElementById('fLetter');
  if (lt) lt.onchange = () => mutate((dd) => { byId(dd, it.id).letter = Number(lt.value); });
  bind('fLift', (v) => mutate((dd) => { byId(dd, it.id).lift = Math.max(40, Math.min(260, v)); }));
  bind('fRise', (v) => {
    mutate((dd) => {
      const q = byId(dd, it.id);
      // lane เป็นเรื่องของแถวพื้นเท่านั้น ลายวาดเองยกได้อิสระอยู่แล้วไม่ต้องมีชั้น
      if (q.t === 'fishRun') q.lane = 'custom';
      q.rise = Math.max(-20, Math.min(260, Math.round(v)));
    });
  });

  const ae = document.getElementById('fArtEdit');
  if (ae) ae.onclick = () => artEditItem(it.id);

  const un = document.getElementById('fUnder');
  if (un) un.onchange = () => mutate((dd) => { byId(dd, it.id).under = un.checked; });

  const ln = document.getElementById('fLane');
  if (ln) {
    ln.onchange = () => {
      mutate((dd) => {
        const q = byId(dd, it.id);
        const lane = LANES.find(([v]) => v === ln.value);
        q.lane = ln.value;
        if (lane[2] !== null) q.rise = lane[2];
        // กำหนดเอง: เริ่มจากความสูงที่แถวอยู่ตอนนี้ แล้วให้ปรับต่อด้วยช่องตัวเลขหรือลากในสนาม
        if (ln.value === 'custom') q.rise = q.rise || 0;
        if (ln.value === 'run') { delete q.lane; delete q.rise; }
      });
      renderInspector();
    };
  }
  bind('fHumps', (v) => mutate((dd) => { byId(dd, it.id).humps = Math.max(1, v); }));

  const anc = document.getElementById('fAnchor');
  if (anc) {
    anc.onchange = () => {
      mutate((dd) => {
        const q = byId(dd, it.id);
        if (!anc.value) { q.x = Math.round(xOf(dd, q)); delete q.link; }
        else {
          const [id, key] = anc.value.split('|');
          q.link = { id, key };
        }
      });
      renderInspector();
    };
  }

  const tp = document.getElementById('fTop');
  if (tp) {
    tp.onchange = () => {
      mutate((dd) => {
        const q = byId(dd, it.id);
        if (tp.value) q.top = tp.value;
        else delete q.top;
      });
      renderInspector();
    };
  }

  const rt = document.getElementById('fRunTo');
  if (rt) {
    rt.onchange = () => {
      mutate((dd) => {
        const q = byId(dd, it.id);
        if (!rt.value) { q.n = Math.max(1, countOf(dd, q)); delete q.runTo; }
        else q.runTo = rt.value;
      });
      renderInspector();
    };
  }

  document.getElementById('bDel').onclick = () => { delItem(it.id); renderInspector(); };
  document.getElementById('bDup').onclick = () => {
    const copy = { ...it, id: uid(), x: Math.round(xOf(d, it)) + 60 };
    delete copy.link;
    delete copy.runTo;
    mutate((dd) => dd.items.push(copy));
    sel = copy.id;
    renderInspector();
  };

  /** ระยะห่างต่ำสุดของแต่ละชนิด — หนามกว้าง 32px ถ้าชิดกว่านี้จะซ้อนกันเป็นก้อนเดียว */
  function gapMin(q) {
    return q.t === 'spikeRow' ? spike.w + 2 : 16;
  }

  function num(id, label, val, step, min, max) {
    const a = min === undefined ? '' : ` min="${min}"`;
    const b = max === undefined ? '' : ` max="${max}"`;
    return `<label class="field">${label}<input id="${id}" type="number" step="${step}"${a}${b} value="${val}"></label>`;
  }

  function bind(id, fn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.onchange = () => { const v = Number(el.value); if (Number.isFinite(v)) fn(v); };
  }
}

function jumpNames(d) {
  const js = d.items.filter((q) => q.t === 'jump').slice().sort((a, b) => xOf(d, a) - xOf(d, b));
  const m = new Map();
  js.forEach((j, i) => m.set(j.id, 'j' + (i + 1)));
  return m;
}


// ─────────────────────────────────────────────────────────────
// แปลงท่อนของเกมกลับมาเป็น "เอกสารที่แก้ได้"
//
// ── ปัญหาที่ต้องแก้ ──
// ท่อนในเกมเป็นโค้ด ไม่ใช่ข้อมูล — fishJump(j1, 11) คืนมาเป็นเม็ดปลาสิบเอ็ดเม็ด
// ของแข็งกับจุดกดคัดกลับมาได้ตรง ๆ เพราะมันคือ x/y ล้วน แต่ของกินคัดกลับไม่ได้
// เพราะสิ่งที่หายไปคือ "ความตั้งใจ" (นี่คือแถวโค้งกระโดดที่ออกจากจุดกดนั้น)
// ถ้าปล่อยให้หาย คนแก้ต้องวางปลาใหม่ทั้งท่อนทุกครั้งที่แตะท่อนเดิม = ใช้งานจริงไม่ได้
//
// ── วิธี ──
// เดาย้อนด้วยการ "สร้างแล้วเทียบ": เรียกสูตรเดียวกับที่เกมใช้ ทุกจำนวนเม็ด ทุกจุดกด
// แล้วดูว่าชุดไหนได้ x/y/ชนิด ตรงกับของจริงเป๊ะ — ตรงแปลว่านั่นแหละคือสูตรที่เขาเขียนไว้
// ไม่ใช่การประมาณ เพราะทั้งสองฝั่งมาจากฟังก์ชันตัวเดียวกัน เทียบกันได้ระดับทศนิยม
// เม็ดที่เข้าสูตรไหนไม่ได้จริง ๆ กลายเป็นแถวเม็ดเดียว ยังลากยังลบได้ ไม่มีอะไรหาย
// ─────────────────────────────────────────────────────────────
const ARC_GENS = [
  ['fishJump', A.fishJump],
  ['fishDouble', A.fishDouble],
  ['arcMid', A.arcMid],
  ['arcHigh', A.arcHigh],
];

const LOW_Y = GROUND_Y - BODY.slideH / 2;

function sameFish(gen, list, at) {
  if (!gen.length || at + gen.length > list.length) return false;
  for (let k = 0; k < gen.length; k++) {
    const a = gen[k];
    const b = list[at + k];
    if (Math.abs(a.x - b.x) > 0.02 || Math.abs(a.y - b.y) > 0.02) return false;
    if ((a.kind || 'fish') !== (b.kind || 'fish')) return false;
  }
  return true;
}

/**
 * เทียบแถวหนึ่งกับของจริง โดยลอง "ของหายากที่โรยทับ" ด้วย
 * จำเป็นเพราะ withShrimp ตัดเม็ดข้างกุ้งทิ้ง แถวที่มีกุ้งจึงไม่เท่ากับแถวเปล่าแล้ว
 * make ต้องสร้างชุดใหม่ทุกครั้ง เพราะ topping แก้ของเดิมในที่
 */
function matchRow(make, list, at, tops) {
  for (const top of tops) {
    const g = top ? topping(make(), top) : make();
    if (sameFish(g, list, at)) return { n: g.length, top };
  }
  return null;
}

/** ลองเฉพาะของหายากที่โผล่อยู่แถวนั้นจริง ๆ — ไม่งั้นเสียเวลาไล่ครบหกแบบทุกรอบ */
function topsNear(list, at) {
  const kinds = new Set();
  for (let k = at; k < Math.min(list.length, at + 48); k++) kinds.add(list[k].kind || 'fish');
  const out = [''];
  if (kinds.has('shrimp')) out.push('shrimp', 'shrimpAll');
  if (kinds.has('kibble')) out.push('cluster', 'alternate', 'all');
  return out;
}

function harvestFish(p, jumpItems, push) {
  const list = p.fish || [];
  const MAXN = 44;
  let i = 0;

  while (i < list.length) {
    const hit = bestAt(i);
    if (hit) { push(hit.item); i += hit.n; }
    else {
      // เม็ดที่เข้าสูตรไหนไม่ได้ — เก็บไว้เป็นแถวเม็ดเดียว ดีกว่าทำหาย
      const f = list[i];
      const it = { t: 'fishRun', group: 'free', x: f.x, n: 1, gap: 34 };
      if (Math.abs(f.y - A.RUN_Y) > 0.001) exactRise(it, A.RUN_Y - f.y);
      if (f.kind === 'shrimp') it.top = 'shrimpAll';
      else if (f.kind === 'kibble') it.top = 'all';
      push(it);
      i += 1;
    }
  }

  function bestAt(at) {
    const left = list.length - at;
    const tops = topsNear(list, at);
    let best = null;
    const keep = (n, item) => { if (!best || n > best.n) best = { n, item }; };

    // ── แถวที่เกาะจุดกด: ส่วนโค้ง กับ ช่อเกล็ดหิมะ ──
    jumpItems.forEach((jit) => {
      const j = jit.x;
      for (const [t, fn] of ARC_GENS) {
        for (let n = Math.min(MAXN, left); n >= 2; n--) {
          const m = matchRow(() => fn(j, n), list, at, tops);
          if (m) { keep(m.n, arcItem(t, jit, { n }, m.top)); break; }
        }
      }
      for (let arm = Math.round(A.RUN_REACH); arm >= 6; arm--) {
        const m = matchRow(() => A.fishFlake(j, arm), list, at, tops);
        if (m) { keep(m.n, arcItem('fishFlake', jit, { arm }, m.top)); break; }
      }
    });

    // ── แถวอิสระ: แถวพื้น (ยกชั้นได้) แถวลอดคาน แถวคลื่น ──
    const x0 = list[at].x;
    const rise = A.RUN_Y - list[at].y;
    const d0 = list[at + 1] ? list[at + 1].x - x0 : 34;
    const gaps = [...new Set([d0, d0 / 2, d0 / 3, 34, 32, 56]
      .map((g) => Math.round(g * 1000) / 1000).filter((g) => g > 4))];

    for (const gap of gaps) {
      for (let n = Math.min(MAXN, left); n >= 2; n--) {
        const m = matchRow(() => (rise ? A.lift(A.fishRun(x0, n, gap), rise) : A.fishRun(x0, n, gap)), list, at, tops);
        if (m) { keep(m.n, rowItem('fishRun', x0, { n, gap }, m.top, rise)); break; }
      }
      if (Math.abs(list[at].y - LOW_Y) < 0.5) {
        for (let n = Math.min(MAXN, left); n >= 2; n--) {
          const m = matchRow(() => A.fishLow(x0, n, gap), list, at, tops);
          if (m) { keep(m.n, rowItem('fishLow', x0, { n, gap }, m.top, 0)); break; }
        }
      }
      for (let humps = 1; humps <= 6; humps++) {
        for (let n = Math.min(MAXN, left); n >= 3; n--) {
          const m = matchRow(() => A.fishWave(x0, n, gap, humps), list, at, tops);
          if (m) { keep(m.n, rowItem('fishWave', x0, { n, gap, humps }, m.top, 0)); break; }
        }
      }
    }

    return best;
  }

  function arcItem(t, jit, extra, top) {
    const it = { t, group: 'arc', x: 0, ...extra, link: { id: jit.id, key: 'AT' } };
    if (top) it.top = top;
    return it;
  }

  function rowItem(t, x0, extra, top, rise) {
    const it = { t, group: 'free', x: x0, ...extra };
    if (top) it.top = top;
    if (rise) exactRise(it, rise);
    return it;
  }
}

/**
 * ตั้งชั้นของแถวให้ตรงกับของเดิมเป๊ะ
 * ใช้แทน setRise ตอนแปลงท่อน เพราะ setRise ดูดเข้าชั้นมาตรฐานที่ใกล้ที่สุด (คลาด 8px ได้)
 * ซึ่งเป็นพฤติกรรมที่ถูกตอนคนลากเอง แต่ผิดตอนคัดลอกของเดิม
 */
function exactRise(it, rise) {
  const lane = LANES.find(([, , v]) => v !== null && Math.abs(v - rise) < 0.001);
  if (lane && lane[0] === 'run') return;
  it.lane = lane ? lane[0] : 'custom';
  it.rise = lane ? lane[2] : rise;
}

/**
 * ท่อนของเกมลำดับที่ idx → เอกสารของเราที่หน้าตาเหมือนเดิมทุกเม็ด
 * ใช้ทั้งปุ่ม "คัดลอกมาเป็นท่อนใหม่" และปุ่ม "แก้ท่อนนี้ให้เป็นของฉัน" บนไทม์ไลน์
 */
function docFromPattern(idx, name) {
  const p = PATTERNS[idx](0);
  const d = blankDoc(name || `ท่อน ${idx} (ของฉัน)`);
  d.width = p.width || chunkW;
  d.kind = PATTERN_META[idx].kind;
  d.diff = PATTERN_META[idx].diff;
  if (p.partial) d.partial = true;

  // ── ห้ามปัดเศษตรงนี้ ──
  // ท่อนของเกมคิดพิกัดจากความเร็ววิ่ง (เช่น DOUBLE_AT * SPEED.run) จุดกดจึงเป็นเลขทศนิยม
  // อย่าง 480.79999... ปัดเป็น 481 แล้วทุกอย่างที่เกาะจุดกดนั้นเลื่อนตาม 0.2px
  // ผลคือแถวปลาที่สร้างจากสูตรเดิมไม่ตรงกับของจริงอีกต่อไป แล้วการจับแถวพังทั้งท่อน
  // (วัดแล้ว: ปัดเศษ = 19 ใน 31 ท่อนประกอบกลับไม่ตรง ปลาหลุดเป็นเม็ดเดี่ยว 174 แถว)
  // ค่าทศนิยมอยู่ในเอกสารได้ไม่มีปัญหา พอคนลากแก้เองค่อยกลายเป็นจำนวนเต็มตามปกติ
  const jumpItems = (p.jumps || []).map((x) => ({ id: uid(), t: 'jump', group: 'jump', x }));
  d.items.push(...jumpItems);

  for (const o of p.obs) {
    const base = { id: uid(), group: 'obs', x: o.x };
    if (o.kind === 'spike') d.items.push({ ...base, t: 'spike' });
    else if (o.kind === 'bar') d.items.push({ ...base, t: 'bar' });
    else if (o.kind === 'prop') d.items.push({ ...base, t: 'prop', kind: o.art });
    else d.items.push({ ...base, t: 'crate', rows: o.rows || 1 });
  }
  for (const q of p.pit) d.items.push({ id: uid(), t: 'pit', group: 'obs', x: q.x, w: q.w });
  for (const f of p.fallers || []) {
    d.items.push({ id: uid(), t: 'faller', group: 'sp', x: f.x, warn: f.warn === undefined ? FALLER.warnFrames : f.warn });
  }
  for (const h of p.hazards || []) {
    const it = { id: uid(), t: h.kind, group: 'sp', x: h.x };
    if (h.kind === 'bee' && h.phase) it.phase = (h.phase * 180) / Math.PI;
    d.items.push(it);
  }
  for (const q of p.pickups || []) {
    d.items.push({ id: uid(), t: 'item', group: 'item', kind: q.kind, x: q.x });
  }

  harvestFish(p, jumpItems, (it) => d.items.push({ id: uid(), ...it }));

  // ของที่อยู่ตรงจุดเกาะ "พอดีเป๊ะ" ให้เกาะเลย โค้ดที่ export จะได้อ่านเป็น j1 + HALF เหมือนต้นฉบับ
  // ต้องเป๊ะเท่านั้น (tol 0.05) ไม่ใช่ใกล้ ๆ — ดูเหตุผลที่ snapTo
  for (const it of d.items) if (CENTERED.has(it.group)) snapTo(d, it, it.x, 0.05);
  return d;
}

/** ดึงผังของท่อนเดิมมาเป็นจุดตั้งต้น — ตอนนี้ได้ของกินกลับมาครบด้วย (ดู harvestFish) */
function grabRef() {
  const i = view.refIdx;
  const g = refGate(i);
  if (g) {
    // ท่อนทางเข้าคัดมาได้ครบทั้งของกินและไอเท็ม (ดู gateStarter) ไม่ใช่แค่ของแข็งแบบท่อนปกติ
    const d = blankDoc(`คัดมาจาก ${g.name}`);
    d.gate = g.id;
    d.width = g.layout.length;
    d.kind = 'safe';
    d.diff = 1;
    d.items = gateStarter(g.id);
    pushUndo();
    docs.push(d);
    cur = docs.length - 1;
    view.refIdx = -1;
    document.getElementById('refPick').value = '-1';
    sel = null;
    sim = null;
    save();
    refreshAll();
    return;
  }
  const d = docFromPattern(i, `คัดมาจากท่อน ${i}`);

  pushUndo();
  docs.push(d);
  cur = docs.length - 1;
  view.refIdx = -1;
  document.getElementById('refPick').value = '-1';
  sel = null;
  sim = null;
  save();
  refreshAll();
}

// ─────────────────────────────────────────────────────────────
// ออกเป็นโค้ด
// ─────────────────────────────────────────────────────────────
function toCode(d, idxIn) {
  const names = jumpNames(d);
  const js = d.items.filter((q) => q.t === 'jump').slice().sort((a, b) => xOf(d, a) - xOf(d, b));
  const L = [];
  // ส่งออกทีละท่อนได้เลข "ต่อท้ายคลัง" ส่วนตอนส่งทั้งด่านต้องไล่เลขให้เองจากข้างนอก
  const idx = idxIn === undefined ? PATTERNS.length : idxIn;

  L.push(`  // ${idx} — ${d.name}`);

  const consts = js.map((j) => `    const ${names.get(j.id)} = ${anchorExpr(d, j, names, 'x')};`);
  const body = [];

  const obs = [];
  const pit = [];
  const fish = [];
  const fallers = [];
  const hazards = [];
  const plats = [];
  const pickups = [];

  for (const it of d.items) {
    const e = anchorExpr(d, it, names, 'x');
    // แถวของกินที่โรยของหายากไว้ เขียนเป็นการห่อฟังก์ชันเดิม ไม่ใช่รายการเม็ดดิบ
    const liftable = it.t === 'fishDots' || (it.t === 'fishRun' && it.lane !== 'surface');
    const lifted = (call) => (!liftable || !it.rise ? call : `lift(${call}, ${it.rise})`);
    const wrap = (raw) => {
      const call = lifted(raw);
      return !it.top ? `...${call}`
        : it.top === 'shrimp' ? `...withShrimp(${call})`
          : it.top === 'shrimpAll' ? `...withShrimp(${call}, 'all')`
            : `...withKibble(${call}, '${it.top}')`;
    };

    switch (it.t) {
      case 'spike': obs.push(`groundSpike(${off(e, 'spike.w / 2', it)})`); break;
      case 'spikeRow': {
        const base = off(e, String(itemW(it) / 2), it);
        for (let i = 0; i < it.n; i++) obs.push(`groundSpike(${i ? `${base} + ${i * it.gap}` : base})`);
        break;
      }
      case 'bar': obs.push(`lowBar(${off(e, 'bar.w / 2', it)})`); break;
      case 'crate': obs.push(`crateStack(${off(e, 'crate.w / 2', it)}, ${it.rows})`); break;
      case 'prop': obs.push(`propObs(${off(e, String(itemW(it) / 2), it)}, '${it.kind}')`); break;
      case 'pit': pit.push(`{ x: ${off(e, String(it.w / 2), it)}, w: ${it.w} }`); break;
      case 'fishJump': fish.push(wrap(`fishJump(${e}, ${it.n})`)); break;
      case 'fishDouble': fish.push(wrap(`fishDouble(${e}, ${it.n})`)); break;
      case 'arcMid': fish.push(wrap(`arcMid(${e}, ${it.n})`)); break;
      case 'arcHigh': fish.push(wrap(`arcHigh(${e}, ${it.n})`)); break;
      case 'fishWave': fish.push(wrap(`fishWave(${e}, ${it.n}, ${it.gap}, ${it.humps})`)); break;
      case 'fishFlake': fish.push(wrap(`fishFlake(${e}, ${it.arm})`)); break;
      // ลายวาดเอง: จุดทั้งชุดเขียนติดกันบรรทัดเดียว อ่านไม่เอาแต่แก้ในหน้านี้ได้เสมอ
      case 'fishDots': fish.push(wrap(`fishDots(${e}, ${dotsCode(it.pts)})`)); break;
      case 'fishLow': fish.push(wrap(`fishLow(${e}, ${it.n}, ${it.gap})`)); break;
      case 'fishRun':
        if (it.runTo && names.has(it.runTo)) {
          fish.push(wrap(`fishRunTo(${e}, ${names.get(it.runTo)}${it.gap === 34 ? '' : ', ' + it.gap})`));
        } else {
          fish.push(wrap(`fishRun(${e}, ${countOf(d, it)}, ${it.gap})`));
        }
        break;
      case 'faller': fallers.push(`{ x: ${off(e, 'FALLER.w / 2', it)}, warn: ${warnOf(it)} }`); break;
      case 'bee': hazards.push(`{ kind: 'bee', x: ${off(e, 'HAZARD.bee.w / 2', it)}, phase: ${phaseOf(it).toFixed(3)} }`); break;
      case 'item': pickups.push(`{ kind: '${it.kind}', x: ${e} }`); break;
      case 'ball': hazards.push(`{ kind: 'ball', x: ${off(e, 'HAZARD.ball.r', it)} }`); break;
      // พื้นเหยียบยังไม่มีในเกม — เขียนเป็นหมายเหตุไว้ให้เห็นว่ามีอะไรอยู่ แต่ไม่ให้โค้ดพัง
      case 'hill': plats.push(`{ kind: 'hill', x: ${e}, w: ${it.w}, h: ${it.h} }`); break;
      case 'ledge':
        plats.push(`{ kind: 'ledge', x: ${e}, w: ${it.w}, lift: ${it.lift} }`);
        if (it.under && it.w > 60) pit.push(`{ x: ${e} + 24, w: ${it.w - 48} }`);
        break;
      default: break;
    }
  }

  body.push(`      obs: [${obs.join(', ')}],`);
  body.push(`      pit: [${pit.join(', ')}],`);
  if (fish.length <= 2) body.push(`      fish: [${fish.join(', ')}],`);
  else body.push('      fish: [', ...fish.map((f) => `        ${f},`), '      ],');
  body.push(`      jumps: [${js.map((j) => names.get(j.id)).join(', ')}],`);
  if (fallers.length) body.push(`      fallers: [${fallers.join(', ')}],`);
  if (hazards.length) body.push(`      hazards: [${hazards.join(', ')}],`);
  if (pickups.length) body.push(`      pickups: [${pickups.join(', ')}],`);
  if (plats.length) body.push(`      plats: [${plats.join(', ')}],`);
  if (d.partial) body.push('      partial: true,');
  if (d.width !== chunkW) body.push(`      width: ${d.width},`);

  if (consts.length) {
    L.push('  (x) => {');
    L.push(...consts);
    L.push('    return {');
    L.push(...body.map((s) => '  ' + s.slice(2)));
    L.push('    };');
    L.push('  },');
  } else {
    L.push('  (x) => ({');
    L.push(...body.map((s) => s.slice(2)));
    L.push('  }),');
  }

  const meta = `  { kind: '${d.kind}', diff: ${d.diff} },    // ${idx}  ${d.name}`;

  return { code: L.join('\n'), meta, idx };

  /** จุดของลาย — เขียนสั้นที่สุดเท่าที่ยังอ่านออก */
  function dotsCode(pts) {
    return '[' + (pts || []).map(([dx, dy]) => `[${Math.round(dx)},${Math.round(dy)}]`).join(',') + ']';
  }

  /** พิกัดของชิ้น เขียนเป็นสูตรถ้ามันเกาะจุดกดอยู่ ไม่งั้นเป็นตัวเลขดิบ */
  function anchorExpr(dd, it, nm, root) {
    if (it.link && nm.has(it.link.id)) {
      const a = ANCHORS[it.link.key];
      return a.code ? `${nm.get(it.link.id)} + ${a.code}` : nm.get(it.link.id);
    }
    return `${root} + ${Math.round(it.x)}`;
  }

  /** ของแข็งวางกึ่งกลางจุดเกาะ จึงต้องถอยครึ่งความกว้างเสมอ */
  function off(expr, halfW, it) {
    if (!it.link) return expr;                    // พิกัดอิสระคือขอบซ้ายอยู่แล้ว
    return `${expr} - ${halfW}`;
  }
}

// ─────────────────────────────────────────────────────────────
// หน้าตา / การผูกปุ่ม
// ─────────────────────────────────────────────────────────────
function buildKit() {
  const map = { mark: 'kitMark', obs: 'kitObs', food: 'kitFood', sp: 'kitSpecial', item: 'kitItem', plat: 'kitPlat' };
  for (const key of Object.keys(map)) document.getElementById(map[key]).innerHTML = '';
  const propBox = document.getElementById('kitProps');
  propBox.innerHTML = '';
  const propGroups = {};
  for (const kit of KIT) {
    const el = document.createElement('div');
    el.className = 'chip' + (kit.wide ? ' wide' : '');
    el.innerHTML = `${kit.label}<em>${kit.sub}</em>`;
    el.title = `${kit.label} — ${kit.sub}`;   // โหมดทั้งด่านย่อชิปจนซ่อนคำอธิบาย ต้องมีทูลทิปแทน
    if (kit.pal === 'prop') {
      // ชุดใหม่ 54 ชิ้น — พับเป็นกลุ่มตามด่าน ไม่งั้นกล่องเครื่องมือยาวจนหาอย่างอื่นไม่เจอ
      if (!propGroups[kit.stage]) {
        const st = STAGES.find((x) => x.id === kit.stage);
        const det = document.createElement('details');
        det.className = 'kit-group';
        det.innerHTML = `<summary>${st ? st.name : kit.stage}</summary><div class="kit"></div>`;
        propBox.appendChild(det);
        propGroups[kit.stage] = det.querySelector('.kit');
      }
      propGroups[kit.stage].appendChild(el);
    } else {
      document.getElementById(map[kit.pal]).appendChild(el);
    }
    wireChip(el, kit);
  }
}

function refreshDocPick() {
  const el = document.getElementById('docPick');
  el.innerHTML = docs.map((d, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>${i + 1}. ${esc(d.name)}</option>`).join('');
}

function refreshMeta() {
  const d = doc();
  document.getElementById('docName').value = d.name;
  document.getElementById('docWidth').value = d.width;
  document.getElementById('docKind').value = d.kind;
  document.getElementById('docDiff').value = d.diff;
  document.getElementById('docPartial').checked = !!d.partial;
  document.getElementById('docGate').value = d.gate || '';
  document.getElementById('docWidth').disabled = !!d.gate;
  updateCount();
}

function updateCount() {
  renderItemList();
  const d = doc();
  const sc = build(d);
  const rare = sc.fish.filter((f) => f.kind && f.kind !== 'fish').length;
  const sp = sc.fallers.length + sc.hazards.length;
  document.getElementById('docCount').textContent =
    `จุดกด ${sc.jumps.length} · สิ่งกีดขวาง ${sc.obs.length} · หลุม ${sc.pit.length}` +
    ` · ของกิน ${sc.fish.length} เม็ด${rare ? ` (ของหายาก ${rare})` : ''}` +
    `${sp ? ` · ของพิเศษ ${sp}` : ''}` +
    `${sc.plats.length ? ` · พื้นเหยียบ ${sc.plats.length}` : ''}` +
    `${sc.pickups.length ? ` · ไอเท็ม ${sc.pickups.length}` : ''}`;
}

function refreshAll() {
  refreshDocPick();
  refreshMeta();
  renderInspector();
  renderItemList();
  if (view.mode === 'stage') renderStageUI();
  syncEditClass();
  view.cam = clampCam(view.cam);
}

/**
 * บอก CSS ว่าตอนนี้มีอะไรให้แก้ไหม
 * กล่องเครื่องมือกับแผงรายละเอียดจะได้ไม่ต้องโผล่มาให้กดไม่ได้ตอนที่ยังไม่แปลงท่อน
 */
function syncEditClass() {
  document.body.classList.toggle('can-edit', editing());
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}


// ─────────────────────────────────────────────────────────────
// โหมดทั้งด่าน — ไทม์ไลน์ แถบเลือกท่อน และแผงแก้ท่อน
//
// ── ทำไมต้องมีโหมดนี้ ──
// โหมดท่อนเดี่ยวตอบคำถามว่า "ท่อนนี้เล่นสนุกไหม" ได้ดี แต่ตอบไม่ได้เลยว่า
// "ทั้งด่านมีจังหวะยังไง" — ท่อนยากสามท่อนติดกันจะรู้ก็ต่อเมื่อเห็นทั้งแถว
// หน้านี้จึงเรียงท่อนทั้งหมดให้ดูพร้อมกันแบบแถบตัดคลิป สีบอกชนิด ความกว้างบอกความยาวจริง
// ─────────────────────────────────────────────────────────────
const timelineEl = document.getElementById('timeline');
const slotListEl = document.getElementById('slotList');
const slotEditEl = document.getElementById('slotEdit');
const slotHeadEl = document.getElementById('slotHead');

/** ไอคอนของที่ระบบโรยในท่อนนี้ — เม็ดขนมเก็บเป็นชื่อสไตล์ ไม่ใช่ true/false จึงแยกออกมา */
function slotBadges(s) {
  return (s.kibble ? '●' : '') + SPRINKLE.filter(([k]) => s[k]).map(([, ic]) => ic).join('');
}

function metaOf(p) {
  return PATTERN_META[p] || { kind: 'obstacle', diff: 0 };
}

function renderStageUI() {
  const st = stage();
  const route = routeOf(st);
  const sc = stageScene();
  if (view.slot >= route.length) view.slot = Math.max(0, route.length - 1);

  slotHeadEl.textContent = `${st.name} · ${route.length} ท่อน (ล็อกไว้) · ยาวรวม ${Math.round(sc.width)}px`;

  timelineEl.innerHTML = route.map((s, i) => {
    const m = metaOf(s.p);
    const w = sc.slots[i] ? sc.slots[i].w : chunkW;
    const own = s.d ? docById(s.d) : null;
    return `<button type="button" class="tl k-${m.kind}${i === view.slot ? ' on' : ''}${own ? ' mine' : ''}" data-i="${i}"`
      + ` style="flex-grow:${w}" title="ท่อนที่ ${i + 1} · ${own ? 'ท่อนของฉัน: ' + own.name : 'แพตเทิร์น #' + s.p} · ${KIND_TH[m.kind]} ระดับ ${m.diff} · กว้าง ${Math.round(w)}px">`
      + `<span class="no">${i + 1}</span><span class="pat">${own ? '<span class="mk">✎</span>' : '#' + s.p}</span>`
      // ช่องแคบเกินกว่าจะใส่คำว่า "มีของหลบ" ได้ครบ — ชนิดบอกด้วยสีอยู่แล้ว
      // เหลือที่ให้ความยากซึ่งสีบอกไม่ได้ จุดยิ่งเยอะยิ่งหนัก อ่านเป็นจังหวะของทั้งด่านได้ในแวบเดียว
      + `<span class="kd">${'●'.repeat(m.diff)}</span>`
      + `<span class="bd">${slotBadges(s)}</span></button>`;
  }).join('');

  slotListEl.innerHTML = route.map((s, i) => {
    const m = metaOf(s.p);
    const own = s.d ? docById(s.d) : null;
    return `<button type="button" class="slot k-${m.kind}${i === view.slot ? ' on' : ''}${own ? ' mine' : ''}" data-i="${i}">`
      + `<span class="no">${i + 1}</span><span class="pat">${own ? '<span class="mk">✎</span>' : '#' + s.p}</span>`
      + `<span class="kd">${own ? esc(own.name) : KIND_TH[m.kind] + ' ' + m.diff}</span>`
      + `<span class="bd">${slotBadges(s)}</span></button>`;
  }).join('');

  renderSlotEdit();
  syncEditClass();
  hereAt = -1;      // ให้ markHere ทาสีตัวชี้ใหม่บนปุ่มชุดที่เพิ่งสร้าง
}

/** ตัวเลือกแพตเทิร์น — ของที่ด่านนี้ประกาศไว้ใน pool มาก่อน ที่เหลือตามหลัง */
function patOptions(cur, st) {
  const pool = [...new Set(st.pool || [])];
  const one = (i) => `<option value="${i}"${i === cur ? ' selected' : ''}>#${i} · ${KIND_TH[metaOf(i).kind]} ${metaOf(i).diff}</option>`;
  const inPool = pool.filter((i) => PATTERNS[i]).map(one).join('');
  const rest = PATTERNS.map((_, i) => i).filter((i) => !pool.includes(i)).map(one).join('');
  return (inPool ? `<optgroup label="คลังของด่านนี้">${inPool}</optgroup>` : '')
    + `<optgroup label="ท่อนอื่นทั้งหมด">${rest}</optgroup>`;
}

function renderSlotEdit() {
  const st = stage();
  const route = routeOf(st);
  const i = view.slot;
  const s = route[i];
  if (!s) { slotEditEl.innerHTML = '<p class="tip">ด่านนี้ยังไม่มีลำดับท่อน</p>'; return; }

  const own = s.d ? docById(s.d) : null;
  const m = metaOf(s.p);
  const sl = stageScene().slots[i] || { x: 0, w: chunkW };
  // ท่อนของเรา: ไอเท็มอยู่ในเอกสารแล้ว (ลาก/ลบเองได้) เหลือแต่กุ้งทองซึ่งไปเปลี่ยนชนิด
  // ของเม็ดอาหารที่มีอยู่ ไม่ได้วางไอเท็มเพิ่ม จึงยังเป็นธงระดับท่อนต่อไป
  const ticks = SPRINKLE.filter(([k]) => !own || !OWNABLE.includes(k))
    .map(([k, ic, label]) => `<label class="chk"><input type="checkbox" data-sp="${k}"`
      + `${s[k] ? ' checked' : ''}> ${ic} ${label}</label>`).join('');

  // ── หัวแผง: ท่อนของเกมเลือกแพตเทิร์นได้ ท่อนของเราบอกว่าเป็นของเราและแก้ได้เลย ──
  const head = own
    ? `<p class="tip owned">✎ <b>ท่อนของฉัน</b> — ลากของในสนามได้เลย แก้ชื่อ/ความกว้าง/ชนิด ได้ที่แผง “ท่อนนี้” ข้างล่าง</p>
       <p class="tip">สร้างจากแพตเทิร์น #${s.p} · ${esc(own.name)}</p>
       <button class="btn ghost" id="slotRelease">↩ เปลี่ยนกลับเป็นท่อนของเกม</button>`
    : `<label class="field">แพตเทิร์นที่ใช้<select id="slotPat">${patOptions(s.p, st)}</select></label>
       <p class="tip">ชนิด <b class="kt k-${m.kind}">${KIND_TH[m.kind]}</b> · ความยาก ${m.diff}</p>
       <button class="btn adopt" id="slotAdopt">✎ แก้ท่อนนี้ให้เป็นของฉัน</button>
       <p class="tip">กดแล้วท่อนนี้จะกลายเป็นของเรา ลากแก้ได้ทุกชิ้น — ของกิน ของแข็ง จุดกด มาครบเหมือนเดิมทุกเม็ด</p>`;

  slotEditEl.innerHTML = `
    <p class="tip">ท่อนที่ <b>${i + 1}</b> จาก ${route.length} · กว้าง ${Math.round(sl.w)}px · เริ่มที่ x=${Math.round(sl.x)}</p>
    ${head}
    <div class="row">
      <button class="btn ghost" id="slotLeft">◀ สลับกับท่อนก่อน</button>
      <button class="btn ghost" id="slotRight">สลับกับท่อนถัดไป ▶</button>
    </div>
    <h3>ของที่โรยในท่อนนี้</h3>
    <label class="field">เม็ดขนม<select id="slotKibble">
      <option value="">— ไม่ใส่ —</option>
      <option value="cluster"${s.kibble === 'cluster' ? ' selected' : ''}>cluster — เกาะกลุ่ม</option>
      <option value="alternate"${s.kibble === 'alternate' ? ' selected' : ''}>alternate — สลับเม็ด</option>
    </select></label>
    <div class="sprinkle">${ticks}</div>
    <p class="tip">กุ้งทองเขียนทับเม็ดขนมเสมอ (กติกาของ spawnChunk) ใส่พร้อมกันจะเห็นแค่กุ้ง</p>
    ${own ? '<p class="tip owned">ตัวอักษร หญ้าแมว กระป๋อง โล่ แม่เหล็ก กลายเป็นของในท่อนนี้แล้ว — ลากย้ายหรือกด Delete ลบได้เลย ถ้าจะเพิ่มใหม่ใช้ชิปในกล่อง “ไอเท็มตัวช่วย”</p>' : ''}
    ${own ? '' : '<button class="btn ghost" id="slotGrab">คัดไปเป็นท่อนใหม่ในโหมดท่อนเดี่ยว</button>'}
  `;

  if (own) document.getElementById('slotRelease').onclick = releaseSlot;
  else {
    document.getElementById('slotAdopt').onclick = adoptSlot;
    document.getElementById('slotPat').onchange = (e) => {
      const p = Number(e.target.value);
      mutRoute((r) => { r[i].p = p; });
    };
  }
  document.getElementById('slotKibble').onchange = (e) => {
    const v = e.target.value;
    mutRoute((r) => { if (v) r[i].kibble = v; else delete r[i].kibble; });
  };
  for (const el of slotEditEl.querySelectorAll('[data-sp]')) {
    el.onchange = () => {
      const k = el.dataset.sp;
      mutRoute((r) => { if (el.checked) r[i][k] = true; else delete r[i][k]; });
    };
  }
  document.getElementById('slotLeft').onclick = () => swapSlot(i, i - 1);
  document.getElementById('slotRight').onclick = () => swapSlot(i, i + 1);

  // คัดแพตเทิร์นออกไปเป็นท่อนใหม่ในโหมดท่อนเดี่ยว — คนละอย่างกับ "แก้ท่อนนี้ให้เป็นของฉัน"
  // อันนั้นผูกกับช่องนี้ในด่าน อันนี้ได้ท่อนลอย ๆ ไว้เอาไปใช้ที่ไหนก็ได้
  const grab = document.getElementById('slotGrab');
  if (grab) {
    grab.onclick = () => {
      setMode('chunk');
      view.refIdx = s.p;
      document.getElementById('refPick').value = String(s.p);
      grabRef();
    };
  }
}

function mutRoute(fn) {
  const st = stage();
  const route = routeOf(st);
  pushUndo();
  fn(route, st);
  saveRoutes();
  stageDirty();
  renderStageUI();
}

function swapSlot(a, b) {
  const route = routeOf(stage());
  if (b < 0 || b >= route.length) return;
  view.slot = b;
  mutRoute((r) => { const t = r[a]; r[a] = r[b]; r[b] = t; });
  gotoSlot(b);
}

function pickSlot(i) {
  view.slot = i;
  // ท่อนที่เป็นของเราแล้วแต่ยังมีธงไอเท็มค้างอยู่ (แปลงไว้ก่อนมีระบบนี้) — ดึงมาให้แก้ได้
  materializeSprinkles(i);
  gotoSlot(i);
  renderStageUI();
  const b = timelineEl.querySelector(`.tl[data-i="${i}"]`);
  if (b) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** เลื่อนจอไปที่ต้นท่อน เผื่อที่ว่างข้างหน้านิดหน่อยให้เห็นรอยต่อกับท่อนก่อน */
function gotoSlot(i) {
  const s = stageScene().slots[i];
  if (s) view.cam = clampCam(s.x - 60);
}

timelineEl.onclick = (e) => {
  const b = e.target.closest('.tl');
  if (b) pickSlot(Number(b.dataset.i));
};
slotListEl.onclick = (e) => {
  const b = e.target.closest('.slot');
  if (b) pickSlot(Number(b.dataset.i));
};

/** ตัวชี้บนไทม์ไลน์ว่ากล้องกำลังมองท่อนไหน — แตะ DOM เฉพาะตอนเปลี่ยนท่อนเท่านั้น */
let hereAt = -1;

function markHere(cam) {
  if (!scene.slots) return;
  const mid = cam + W / 2;
  const s = scene.slots.find((q) => mid >= q.x && mid < q.x + q.w);
  const i = s ? s.i : -1;
  if (i === hereAt) return;
  hereAt = i;
  for (const el of timelineEl.children) el.classList.toggle('here', Number(el.dataset.i) === i);

  // ── ท่อนที่กำลังมองอยู่ ต้องเป็นท่อนที่กำลังแก้อยู่เสมอ ──
  // ถ้าปล่อยให้ต่างกันได้ ของที่วางจะไปตกในเอกสารของท่อนที่ "เลือกไว้" แต่ไปวาดตรงที่ "มองอยู่"
  // เจอจริง: เลือกท่อน 5 ไว้แล้วเลื่อนจอมาดูท่อน 1 พอวางลาย ลายไปอยู่ในท่อน 5 ที่ x=-3567
  // แล้วไปโผล่ทับท่อน 1 — หาในรายการของท่อน 1 ไม่เจอ คลิกก็ไม่โดน เพราะคนละเอกสารกัน
  if (i >= 0 && i !== view.slot) {
    view.slot = i;
    materializeSprinkles(i);
    refreshAll();
  }
}

function setMode(m) {
  view.mode = m;
  document.body.classList.toggle('mode-stage', m === 'stage');
  for (const b of document.querySelectorAll('#modeSw .mode')) b.classList.toggle('on', b.dataset.mode === m);

  sel = null;
  sim = null;
  scrubAt = -1;
  const sb = document.getElementById('scrub');
  if (sb) sb.disabled = true;

  if (m === 'stage') {
    // โหมดดูของเดิมเป็นของฝั่งท่อนเดี่ยว ถ้าค้างไว้จะกลับไปเจอสภาพที่งงว่าทำไมแก้ไม่ได้
    view.refIdx = -1;
    document.getElementById('refPick').value = '-1';
    stageDirty();
    renderStageUI();
    gotoSlot(view.slot);
  } else {
    view.cam = -100;
  }
  refreshAll();
}

document.getElementById('modeSw').onclick = (e) => {
  const b = e.target.closest('.mode');
  if (b) setMode(b.dataset.mode);
};

document.getElementById('reRoll').onclick = () => {
  const st = stage();
  if (!window.confirm(`สุ่มลำดับท่อนของ “${st.name}” ใหม่ทั้งด่าน — ที่จัดไว้เองจะหายหมด`)) return;
  rerollRoute(st);
  view.slot = 0;
  renderStageUI();
  gotoSlot(0);
};


// ─────────────────────────────────────────────────────────────
// เทมเพลตของด่าน — เก็บ "ลำดับท่อน + ท่อนที่เราแก้เอง" ไว้ทั้งชุด
//
// ต่างจากการบันทึกท่อนเดี่ยวตรงที่มันเก็บทั้งด่าน ทั้งลำดับ ทั้งของที่โรย
// และเอกสารของทุกท่อนที่แปลงเป็นของเราแล้ว — เปิดขึ้นมาก็ได้ด่านทั้งด่านกลับคืน
// เก็บแยกจากลำดับท่อนที่กำลังแก้อยู่ จะลองมั่ว ๆ แล้วค่อยเรียกของเดิมกลับก็ได้
// ─────────────────────────────────────────────────────────────
const TPL_KEY = 'meowzing:editor:templates';
let tpls = [];

function loadTpls() {
  try { tpls = JSON.parse(localStorage.getItem(TPL_KEY)) || []; } catch { tpls = []; }
  if (!Array.isArray(tpls)) tpls = [];
}

function saveTpls() {
  try { localStorage.setItem(TPL_KEY, JSON.stringify(tpls)); } catch { /* เต็มก็ช่าง */ }
}

/** ท่อนที่เราแก้เองซึ่งลำดับนี้ใช้อยู่ — ต้องติดไปกับเทมเพลตด้วย ไม่งั้นเปิดมาแล้วท่อนหาย */
function ownDocsOf(route) {
  const ids = [...new Set(route.filter((s) => s.d).map((s) => s.d))];
  return ids.map((id) => docById(id)).filter(Boolean);
}

function makeTpl(name) {
  const st = stage();
  const route = routeOf(st);
  return {
    id: uid(),
    name,
    stage: st.id,
    stageName: st.name,
    at: Date.now(),
    route: deep(route),
    docs: deep(ownDocsOf(route)),
  };
}

/**
 * เอาเทมเพลตมาใช้
 * เอกสารในเทมเพลตต้องได้เลขประจำตัวใหม่ทั้งชุด (ทั้งตัวท่อนและของในท่อน)
 * ไม่งั้นมันจะไปทับท่อนที่มีอยู่แล้วซึ่งใช้เลขเดียวกัน แล้วสองด่านจะแก้พร้อมกันโดยไม่ตั้งใจ
 */
function applyTpl(t) {
  const map = new Map();
  for (const src of t.docs || []) {
    const d = deep(src);
    const old = d.id;
    d.id = uid();
    const rm = new Map();
    for (const it of d.items || []) { const n = uid(); rm.set(it.id, n); it.id = n; }
    for (const it of d.items || []) {
      if (it.link) it.link.id = rm.get(it.link.id) || it.link.id;
      if (it.runTo) it.runTo = rm.get(it.runTo) || it.runTo;
    }
    docs.push(d);
    map.set(old, d.id);
  }

  const st = STAGES.find((s) => s.id === t.stage) || stage();
  routes[st.id] = (t.route || []).map((s) => {
    const q = { ...s };
    if (q.d) { if (map.has(q.d)) q.d = map.get(q.d); else delete q.d; }
    return q;
  });

  view.stage = Math.max(0, STAGES.indexOf(st));
  document.getElementById('stagePick').value = String(view.stage);
  view.slot = 0;
  sel = null;
  save();
  saveRoutes();
  stageDirty();
  setMode('stage');
  gotoSlot(0);
}

function refreshTplPick() {
  const el = document.getElementById('tplPick');
  el.innerHTML = '<option value="">— เทมเพลตที่เก็บไว้ —</option>' +
    tpls.map((t) => `<option value="${t.id}">${esc(t.name)} · ${esc(t.stageName || t.stage)}</option>`).join('');
}

document.getElementById('tplPick').onchange = (e) => {
  const t = tpls.find((q) => q.id === e.target.value);
  if (!t) return;
  pushUndo();
  applyTpl(t);
};

document.getElementById('tplSave').onclick = () => {
  const st = stage();
  const name = window.prompt('ตั้งชื่อเทมเพลต', `${st.name} ${new Date().toLocaleDateString('th-TH')}`);
  if (!name) return;
  const t = makeTpl(name.trim());
  // ชื่อซ้ำ = เขียนทับของเดิม ไม่งั้นรายการจะรกด้วยชื่อเดียวกันหลายอัน
  const at = tpls.findIndex((q) => q.name === t.name && q.stage === t.stage);
  if (at >= 0) tpls[at] = t; else tpls.push(t);
  saveTpls();
  refreshTplPick();
  document.getElementById('tplPick').value = t.id;
  flash('เก็บเทมเพลตแล้ว');
};

document.getElementById('tplDel').onclick = () => {
  const el = document.getElementById('tplPick');
  const t = tpls.find((q) => q.id === el.value);
  if (!t) { flash('ยังไม่ได้เลือกเทมเพลต'); return; }
  if (!window.confirm(`ลบเทมเพลต “${t.name}” ทิ้ง?`)) return;
  tpls = tpls.filter((q) => q.id !== t.id);
  saveTpls();
  refreshTplPick();
};


// ─────────────────────────────────────────────────────────────
// ไอเท็มที่ "ระบบโรยให้ทั้งท่อน" → ของในเอกสารที่แก้ได้
//
// ── ปัญหาที่แก้ ──
// route เก็บไอเท็มเป็น "ธง" ระดับท่อน ({ p: 6, shield: true }) แล้วเกมเป็นคนหาที่วางเอง
// ตอนรันจริง (spawnShield/spawnMagnet/spawnLetter/...) ของพวกนี้จึงไม่มีตัวตนในเอกสาร
// ผลคือในหน้าออกแบบ มันโผล่บนสนามให้เห็น แต่คลิกไม่โดน ลบไม่ได้ ย้ายไม่ได้
//
// ── วิธี ──
// พอท่อนกลายเป็น "ท่อนของฉัน" แล้ว ทุกอย่างในท่อนควรเป็นของเรา — ย้ายธงพวกนี้มาเป็น
// ไอเท็มจริงในเอกสาร โดยวางที่ "ตำแหน่งเดิมที่เกมเลือกไว้" ภาพจึงไม่ขยับสักพิกเซล
// แล้วถอดธงออกจาก route ไม่ให้ระบบโรยซ้ำอีกชั้น
//
// ── ทำไมต้องเทียบก่อน-หลัง ไม่ใช่กวาดไอเท็มทั้งช่วงท่อน ──
// ไอเท็มในช่วงนั้นมีสองแหล่ง: ธงของ route กับของที่เอกสารวางเอง (c.pickups)
// ถ้ากวาดทั้งหมดมาใส่เอกสาร ของที่เอกสารมีอยู่แล้วจะถูกใส่ซ้ำเป็นสองชิ้นทับกัน
// จึงประกอบด่านสองรอบ (มีธง / ไม่มีธง) แล้วเอาเฉพาะส่วนต่าง ซึ่งคือของที่ธงเป็นคนวาง
//
// เม็ดขนมกับกุ้งทองไม่อยู่ในนี้ เพราะสองตัวนั้นไม่ได้ "วางไอเท็มเพิ่ม" แต่ไป
// เปลี่ยนชนิดของเม็ดอาหารที่มีอยู่แล้ว (makeKibble/makeShrimp) ซึ่งยังทำงานกับท่อนของเราได้ปกติ
// ─────────────────────────────────────────────────────────────
const OWNABLE = ['letter', 'nip', 'can', 'shield', 'magnet'];

/** ไอเท็มที่อยู่ในช่วงของท่อน i — คืนพิกัดเทียบกับต้นท่อน (พิกัดแบบที่เอกสารใช้) */
function pickupsIn(i) {
  const sc = stageScene();
  const sl = sc.slots[i];
  if (!sl) return [];
  return sc.pickups
    .filter((p) => p.x >= sl.x && p.x < sl.x + sl.w)
    .map((p) => ({ kind: p.kind, x: Math.round(p.x - sl.x), idx: p.idx }));
}

function materializeSprinkles(i) {
  const route = routeOf(stage());
  const s = route[i];
  const d = s && s.d ? docById(s.d) : null;
  if (!d) return false;
  const flags = OWNABLE.filter((k) => s[k]);
  if (!flags.length) return false;

  pushUndo();
  stageCache = null;
  const before = pickupsIn(i);
  for (const k of flags) delete s[k];
  stageCache = null;
  const after = pickupsIn(i);

  const left = after.slice();
  for (const b of before) {
    const k = left.findIndex((a) => a.kind === b.kind && Math.abs(a.x - b.x) < 2);
    if (k >= 0) { left.splice(k, 1); continue; }   // ของที่เอกสารวางเองอยู่แล้ว
    const it = { id: uid(), t: 'item', group: 'item', kind: b.kind, x: b.x };
    if (b.idx !== undefined && b.idx !== null) it.letter = b.idx;
    d.items.push(it);
  }

  save();
  saveRoutes();
  stageCache = null;
  return true;
}

// ─────────────────────────────────────────────────────────────
// แปลงท่อนของเกมให้เป็นท่อนของเรา (และกลับ)
// ─────────────────────────────────────────────────────────────
function adoptSlot() {
  const st = stage();
  const route = routeOf(st);
  const s = route[view.slot];
  if (!s || s.d) return;
  pushUndo();
  const d = docFromPattern(s.p, `${st.name} · ท่อน ${view.slot + 1}`);
  docs.push(d);
  s.d = d.id;
  save();
  saveRoutes();
  stageDirty();
  // ไอเท็มที่ระบบโรยให้ท่อนนี้ ต้องกลายเป็นของในเอกสารด้วย ไม่งั้นมันจะลบไม่ได้ย้ายไม่ได้
  materializeSprinkles(view.slot);
  sel = null;
  renderStageUI();
  refreshAll();
}

/** คืนช่องนี้ให้เป็นแพตเทิร์นของเกม — เอกสารยังอยู่ในช่องท่อน ไม่ได้ถูกลบ */
function releaseSlot() {
  const route = routeOf(stage());
  const s = route[view.slot];
  if (!s || !s.d) return;
  if (!window.confirm('เปลี่ยนช่องนี้กลับไปใช้ท่อนของเกม? ท่อนที่แก้ไว้ยังอยู่ในช่อง “ท่อน” ของโหมดท่อนเดี่ยว')) return;
  pushUndo();
  delete s.d;
  saveRoutes();
  stageDirty();
  sel = null;
  renderStageUI();
  refreshAll();
}

/**
 * โค้ดของทั้งด่าน
 *
 * ท่อนที่เราแก้เองไม่มีเลขในคลัง PATTERNS จึงต้องส่งออกเป็นแพตเทิร์นใหม่ต่อท้ายคลังก่อน
 * แล้ว route ค่อยอ้างเลขใหม่นั้น — ถ้าส่งแต่ route ไป ปลายทางจะไม่มีท่อนให้อ้างถึงเลย
 */
function stageOwnCode(st) {
  const route = routeOf(st);
  const own = ownDocsOf(route);
  if (!own.length) return null;

  const at = new Map();
  own.forEach((d, k) => at.set(d.id, PATTERNS.length + k));
  const parts = own.map((d, k) => toCode(d, PATTERNS.length + k));
  return {
    at,
    code: parts.map((q) => q.code).join('\n'),
    meta: parts.map((q) => q.meta).join('\n'),
    names: own.map((d, k) => `#${PATTERNS.length + k} = ${d.name}`).join(' · '),
  };
}

/** โค้ดลำดับท่อนทั้งด่าน สำหรับวางลง stages.js */
function stageRouteCode(st, at) {
  const route = routeOf(st);
  const lines = route.map((s, i) => {
    const p = s.d && at && at.has(s.d) ? at.get(s.d) : s.p;
    const parts = [`p: ${p}`];
    if (s.kibble) parts.push(`kibble: '${s.kibble}'`);
    if (s.shrimp) parts.push('shrimp: true');
    if (s.shield) parts.push('shield: true');
    if (s.magnet) parts.push('magnet: true');
    if (s.letter) parts.push('letter: true');
    if (s.nip) parts.push('nip: true');
    if (s.can) parts.push('can: true');
    const m = metaOf(s.p);
    const body = `      { ${parts.join(', ')} },`;
    const note = s.d ? 'ท่อนของฉัน' : `${m.kind} ${m.diff}`;
    // ท่อนที่ใส่ของเยอะจนยาวเกินคอลัมน์หมายเหตุ ยังต้องมีช่องว่างคั่นก่อน //
    return (body.length < 64 ? body.padEnd(64) : body + '  ')
      + `// ${String(i + 1).padStart(2)} · ${note}`;
  });
  return `    route: [\n${lines.join('\n')}\n    ],`;
}

// ── แถบบน ────────────────────────────────────────────
document.getElementById('docPick').onchange = (e) => {
  cur = Number(e.target.value);
  sel = null; sim = null; scrubAt = -1;
  refreshAll();
};

document.getElementById('newDoc').onclick = () => {
  pushUndo();
  docs.push(blankDoc('ท่อนใหม่ ' + (docs.length + 1)));
  cur = docs.length - 1;
  sel = null; sim = null;
  save();
  refreshAll();
};

document.getElementById('dupDoc').onclick = () => {
  pushUndo();
  const copy = JSON.parse(JSON.stringify(doc()));
  copy.name = doc().name + ' (สำเนา)';
  // id ต้องไม่ซ้ำกับต้นฉบับ ไม่งั้นการเกาะจุดกดจะข้ามท่อนกันมั่ว
  const remap = new Map();
  for (const it of copy.items) { const n = uid(); remap.set(it.id, n); it.id = n; }
  for (const it of copy.items) {
    if (it.link) it.link.id = remap.get(it.link.id) || it.link.id;
    if (it.runTo) it.runTo = remap.get(it.runTo) || it.runTo;
  }
  docs.push(copy);
  cur = docs.length - 1;
  sel = null; sim = null;
  save();
  refreshAll();
};

document.getElementById('delDoc').onclick = () => {
  if (docs.length === 1) { docs[0] = blankDoc('ท่อนใหม่'); }
  else { pushUndo(); docs.splice(cur, 1); cur = Math.max(0, cur - 1); }
  sel = null; sim = null;
  save();
  refreshAll();
};

document.getElementById('docName').onchange = (e) => { mutate((d) => { d.name = e.target.value; }); refreshDocPick(); };
document.getElementById('docWidth').onchange = (e) => { mutate((d) => { d.width = Math.max(400, Number(e.target.value) || chunkW); }); };
document.getElementById('docKind').onchange = (e) => { mutate((d) => { d.kind = e.target.value; }); };
document.getElementById('docDiff').onchange = (e) => { mutate((d) => { d.diff = Math.max(1, Math.min(5, Number(e.target.value) || 3)); }); };
document.getElementById('docPartial').onchange = (e) => { mutate((d) => { d.partial = e.target.checked; }); };

const stagePick = document.getElementById('stagePick');
stagePick.innerHTML = STAGES.map((s, i) => `<option value="${i}">${s.name}</option>`).join('');
stagePick.onchange = (e) => {
  view.stage = Number(e.target.value);
  if (view.mode !== 'stage') return;
  view.slot = 0;
  stageDirty();
  renderStageUI();
  gotoSlot(0);
};

const refPick = document.getElementById('refPick');
refPick.innerHTML = '<option value="-1">— ท่อนของฉัน —</option>' +
  PATTERNS.map((_, i) => `<option value="${i}">ท่อน ${i} · ${PATTERN_META[i].kind} ${PATTERN_META[i].diff}</option>`).join('') +
  GATE_LIST.map((g, i) => `<option value="${PATTERNS.length + i}">🚪 ${g.name}</option>`).join('');
refPick.onchange = (e) => {
  view.refIdx = Number(e.target.value);
  sel = null; sim = null; scrubAt = -1;
  document.getElementById('scrub').disabled = true;
  view.cam = -100;
  renderInspector();
};

document.getElementById('optArc').onchange = (e) => { view.arcs = e.target.checked; };
document.getElementById('optNext').onchange = (e) => { view.next = e.target.checked; };
document.getElementById('optGrid').onchange = (e) => { view.grid = e.target.checked; };
document.getElementById('optXray').onchange = (e) => { view.xray = e.target.checked; };

// ── ใช้ท่อนนี้เป็นทางเข้าด่าน ──
const docGate = document.getElementById('docGate');
docGate.innerHTML = '<option value="">— ท่อนปกติ (สุ่มในด่าน) —</option>' +
  GATE_LIST.map((g) => `<option value="${g.id}">🚪 ${g.name}</option>`).join('');
docGate.onchange = (e) => {
  const id = e.target.value;
  mutate((d) => {
    if (!id) { delete d.gate; return; }
    d.gate = id;
    // ความยาวทางเข้าคำนวณจากเกม (gates.js) แก้เองไม่ได้ — ตัวอาคารกับจังหวะสลับฉากผูกกับความยาวนี้
    d.width = GATES[id].layout.length;
    if (!d.items.length) d.items = gateStarter(id);
  });
  warmGateArt(GATES[id] || GATE_LIST[0]);
  view.cam = -100;
  refreshMeta();
};

document.getElementById('undoBtn').onclick = undo;
document.getElementById('redoBtn').onclick = redo;

document.getElementById('runCheck').onclick = runCheck;

const scrubEl = document.getElementById('scrub');
scrubEl.oninput = () => {
  if (!sim) return;
  playing = false;
  scrubAt = Number(scrubEl.value);
  updateScrubTxt();
  centerOn(sim.frames[scrubAt].cx);
};

document.getElementById('playBtn').onclick = () => {
  if (!sim) runCheck();
  playing = !playing;
  if (playing) step();
};

function step() {
  if (!playing || !sim) return;
  scrubAt++;
  if (scrubAt >= sim.frames.length) { scrubAt = 0; }
  scrubEl.value = String(scrubAt);
  updateScrubTxt();
  centerOn(sim.frames[scrubAt].cx);
  setTimeout(step, 1000 / 60);
}

// ── ไฟล์ ─────────────────────────────────────────────
document.getElementById('dlJson').onclick = () => {
  const st = stage();
  const whole = view.mode === 'stage';
  const data = whole
    ? { stage: st.id, name: st.name, route: routeOf(st), docs: ownDocsOf(routeOf(st)) }
    : doc();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (whole ? `ลำดับท่อน-${st.id}` : (doc().name || 'chunk')).replace(/[\\/:*?"<>|]/g, '_') + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

document.getElementById('upJson').onclick = () => document.getElementById('fileIn').click();
document.getElementById('fileIn').onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  f.text().then((txt) => {
    try {
      const d = JSON.parse(txt);
      // ไฟล์ลำดับท่อนทั้งด่าน — คนละรูปแบบกับไฟล์ท่อนเดียว แยกที่ชื่อฟิลด์
      if (d && Array.isArray(d.route)) {
        // ไฟล์ทั้งด่านมีหน้าตาเดียวกับเทมเพลต ใช้ทางเดียวกันได้เลย
        pushUndo();
        applyTpl(d);
        return;
      }
      if (!d || !Array.isArray(d.items)) throw new Error('รูปแบบไม่ถูก');
      // id ในไฟล์อาจชนกับที่มีอยู่ ออกเลขใหม่ให้ทั้งชุด
      const remap = new Map();
      for (const it of d.items) { const n = uid(); remap.set(it.id, n); it.id = n; }
      for (const it of d.items) {
        if (it.link) it.link.id = remap.get(it.link.id) || it.link.id;
        if (it.runTo) it.runTo = remap.get(it.runTo) || it.runTo;
      }
      pushUndo();
      docs.push(d);
      cur = docs.length - 1;
      sel = null; sim = null;
      save();
      refreshAll();
    } catch (err) {
      alert('เปิดไฟล์ไม่ได้: ' + err.message);
    }
  });
  e.target.value = '';
};



// ─────────────────────────────────────────────────────────────
// รายการของทุกชิ้นในท่อน — ทางเลือกที่ "กดพลาดไม่ได้"
//
// ── ทำไมต้องมี ──
// การคลิกในสนามต้องเดาว่าของชิ้นไหนอยู่บนสุด ณ จุดนั้น ซึ่งพลาดได้เสมอเมื่อของซ้อนกัน
// (ผู้ใช้เจอจริงกับลายที่วาดเอง: คลิกเท่าไรก็ไปโดนแถวปลาที่ทับอยู่ ลบไม่ได้สักที)
// รายการนี้อ้างถึงของ "ตามตัวตน" ไม่ใช่ตามตำแหน่งบนจอ จึงเลือกผิดไม่ได้เลย
// ─────────────────────────────────────────────────────────────
const itemListEl = document.getElementById('itemList');

/** ชื่อสั้น ๆ ของชิ้นหนึ่ง พร้อมข้อมูลที่ช่วยแยกแยะเมื่อมีของชนิดเดียวกันหลายชิ้น */
function itemLabel(d, it) {
  const kit = KIT.find((k) => k.t === it.t && (k.rows === undefined || k.rows === it.rows)
    && (k.kind === undefined || k.kind === it.kind));
  let name = kit ? kit.label : it.t;
  if (it.t === 'fishDots') name = `ลายวาดเอง ${(it.pts || []).length} เม็ด`;
  else if (it.t === 'jump') name = 'จุดกด';
  else if (FOOD_T.has(it.t) && it.n) name += ` ×${it.n}`;
  return name;
}

/**
 * ของที่หลุดออกนอกท่อนของตัวเอง — ค้นทั้งด่าน ไม่ใช่แค่ท่อนที่เปิดอยู่
 *
 * ของพวกนี้ยังถูกวาดบนจอ (ตามพิกัดของมัน) แต่ไปโผล่คร่อมท่อนอื่น
 * จึงหาไม่เจอในรายการของท่อนที่เห็น และคลิกในสนามก็ไม่โดนเพราะคนละเอกสารกัน
 * ต้องมีทางเก็บกวาดจากที่เดียว ไม่งั้นมันค้างอยู่ตลอดไปโดยลบไม่ได้
 */
function strayItems() {
  if (view.mode !== 'stage') return [];
  const route = routes[stage().id];
  if (!route) return [];
  const out = [];
  route.forEach((s, i) => {
    const dd = s.d && docById(s.d);
    if (!dd) return;
    for (const it of dd.items) {
      const x = Math.round(xOf(dd, it));
      if (x < -20 || x > dd.width + 20) out.push({ slot: i, doc: dd, it, x });
    }
  });
  return out;
}

function renderItemList() {
  if (!itemListEl) return;

  // ── ของที่หลุดไปอยู่ในท่อนอื่น ต้องเห็นเสมอ ──
  // แม้ท่อนที่เปิดอยู่จะยังแก้ไม่ได้ ของพวกนี้ก็ยังวาดทับมันอยู่ดี
  // ถ้าไม่โชว์ตรงนี้จะไม่มีที่ไหนให้เก็บกวาดมันได้เลย
  const mine = view.mode === 'stage' && slotDoc() ? slotDoc().id : (locked() ? null : doc().id);
  const stray = strayItems().filter((q) => q.doc.id !== mine);
  const strayHtml = stray.length
    ? '<p class="tip warnrow">⚠ ของที่หลุดไปอยู่ในท่อนอื่น — มันจะไปวาดทับท่อนที่ไม่ใช่ของมัน</p>'
      + stray.map((q) => `<div class="irow stray" data-stray="${q.doc.id}|${q.it.id}|${q.slot}">`
        + `<span class="nm">${esc(itemLabel(q.doc, q.it))}</span>`
        + `<span class="xx out">ท่อน ${q.slot + 1} · x=${q.x}</span>`
        + `<button type="button" class="del" data-delstray="${q.doc.id}|${q.it.id}" title="ลบชิ้นนี้">✕</button></div>`).join('')
    : '';

  if (locked()) {
    itemListEl.innerHTML = '<p class="tip">ท่อนนี้ยังแก้ไม่ได้ — กด “แก้ท่อนนี้ให้เป็นของฉัน” ก่อน</p>' + strayHtml;
    return;
  }

  const d = doc();
  const list = d.items.slice().sort((a2, b2) => xOf(d, a2) - xOf(d, b2));
  const rowsHtml = list.map((it) => {
    const x = Math.round(xOf(d, it));
    const out = x < -20 || x > d.width + 20;      // เตือนของที่หลุดออกนอกท่อน
    return `<div class="irow${it.id === sel ? ' on' : ''}" data-id="${it.id}">`
      + `<span class="nm">${esc(itemLabel(d, it))}</span>`
      + `<span class="xx${out ? ' out' : ''}">x=${x}</span>`
      + `<button type="button" class="del" data-del="${it.id}" title="ลบชิ้นนี้">✕</button></div>`;
  }).join('');

  itemListEl.innerHTML = (list.length ? rowsHtml : '<p class="tip">ยังไม่มีของในท่อนนี้</p>') + strayHtml;
}

itemListEl.onclick = (e) => {
  const ds = e.target.closest('[data-delstray]');
  if (ds) {
    const [docId, itemId] = ds.dataset.delstray.split('|');
    const dd = docById(docId);
    if (dd) {
      pushUndo();
      dd.items = dd.items.filter((q) => q.id !== itemId);
      dirty();
      renderItemList();
    }
    return;
  }
  const goStray = e.target.closest('[data-stray]');
  if (goStray) {
    // พาไปที่ท่อนเจ้าของ แล้วเลือกชิ้นนั้นให้ จะได้แก้ต่อได้ตามปกติ
    const [, itemId, slot] = goStray.dataset.stray.split('|');
    pickSlot(Number(slot));
    sel = itemId;
    const dd = doc();
    const it = byId(dd, itemId);
    if (it) { const b = itemBox(dd, it); centerOn(editOff() + b.x + b.w / 2); }
    renderInspector();
    renderItemList();
    return;
  }
  const del = e.target.closest('[data-del]');
  if (del) {
    delItem(del.dataset.del);
    renderItemList();
    return;
  }
  const row = e.target.closest('.irow');
  if (!row) return;
  const d = doc();
  const it = byId(d, row.dataset.id);
  if (!it) return;
  sel = it.id;
  // เลื่อนจอไปหาของชิ้นนั้น จะได้เห็นว่ากำลังเลือกอะไรอยู่
  const b = itemBox(d, it);
  centerOn(editOff() + b.x + b.w / 2);
  renderInspector();
  renderItemList();
};

// ─────────────────────────────────────────────────────────────
// วาดลายของกิน — วาดรูปหรือพิมพ์ข้อความ แล้วแปลงเป็นเม็ดอาหารทั้งลาย
//
// ── ทำไมไม่ใช้ฟอนต์แบบจุด (bitmap font) ที่เขียนเอง ──
// เกมนี้เป็นภาษาไทย ซึ่งมีสระบน สระล่าง วรรณยุกต์ซ้อนกันได้สามชั้น
// ฟอนต์จุดที่เขียนเองจะรองรับไม่ครบ และต้องมาไล่เพิ่มทีละตัวตลอดไป
// วิธีที่ใช้คือให้เบราว์เซอร์วาดข้อความด้วยฟอนต์จริงลงผ้าใบซ่อน แล้วค่อย "สุ่มจุด"
// จากพิกเซลที่ทึบ — ได้ทั้งไทย อังกฤษ ตัวเลข อิโมจิ โดยไม่ต้องรู้จักตัวอักษรเลยสักตัว
// การวาดเองก็ใช้ทางเดียวกัน ต่างกันแค่ใครเป็นคนทำให้พิกเซลทึบ
//
// ── กติกาที่ยังต้องรักษา ──
// เม็ดทุกเม็ดต้องเก็บได้จริง ลายจึงถูกจำกัดความสูงไม่ให้เกินเพดานกระโดดสองชั้น
// และมีเส้นบอกเพดานทั้งสองแบบให้เห็นในกล่องนี้ตั้งแต่ตอนวาด ไม่ต้องรอไปตรวจทีหลัง
// ─────────────────────────────────────────────────────────────
const artModal = document.getElementById('artModal');
const artPad = document.getElementById('artPad');
const artCtx = artPad.getContext('2d', { willReadFrequently: true });
const PAD_W = artPad.width;
const PAD_H = artPad.height;

/** เพดานที่เอื้อมถึงจริง วัดจากส่วนโค้งกระโดดของเกม ไม่ได้ตั้งเลขเอง */
const ART_CEIL = REACH_DBL;

const art = {
  mode: 'text',
  strokes: [],          // [[x,y], ...] ต่อหนึ่งเส้น
  drawing: null,
  pts: [],              // ผลลัพธ์ [[dx,dy], ...]
  w: 0,
  gap: 26,              // ระยะห่างที่เม็ดชุดปัจจุบันวางอยู่บนตาราง
  paint: null,          // ระหว่างลากในโหมดแก้เม็ด: 'on' = เติม, 'off' = ลบ
  editId: null,         // แก้ลายเดิมอยู่ = id ของชิ้นนั้น · null = สร้างใหม่
};

/** จุดบนจอของเม็ดที่ช่อง (c, r) — ใช้ร่วมกันทั้งตอนวาดพรีวิวและตอนคลิกแก้ */
const ART_X0 = 12;
function artBaseY() { return PAD_H - 24; }
function artMaxRow(gap) { return Math.floor(ART_CEIL / gap); }

/** ช่องบนตารางที่ตรงกับจุดบนผ้าใบ — คืน null ถ้าอยู่นอกเขตที่วางได้ */
function artCellAt(px, py, gap) {
  const c = Math.round((px - ART_X0) / gap);
  const r = Math.round((artBaseY() - py) / gap);
  if (c < 0 || r < 0 || r > artMaxRow(gap)) return null;
  return [c * gap, r * gap];
}

function artNum(id, dflt) {
  const v = Number(document.getElementById(id).value);
  return Number.isFinite(v) ? v : dflt;
}

/** วาดสิ่งที่ผู้ใช้ป้อนลงผ้าใบ (ทึบ = มีเม็ด) แล้วคืนช่วงที่ใช้จริง */
function artPaintSource(g) {
  g.clearRect(0, 0, PAD_W, PAD_H);
  g.fillStyle = '#FFFFFF';
  if (art.mode === 'text') return;   // ตัวอักษรคิดจุดเองใน artTextDots ไม่ผ่านผ้าใบนี้
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = '#FFFFFF';
  g.lineWidth = Math.max(10, artNum('artGap', 28) * 0.7);
  for (const s of art.strokes) {
    if (s.length < 2) {
      g.beginPath();
      g.arc(s[0][0], s[0][1], g.lineWidth / 2, 0, Math.PI * 2);
      g.fill();
      continue;
    }
    g.beginPath();
    g.moveTo(s[0][0], s[0][1]);
    for (let i = 1; i < s.length; i++) g.lineTo(s[i][0], s[i][1]);
    g.stroke();
  }
}

/**
 * แปลงลายบนผ้าใบเป็นจุดวางเม็ด
 *
 * ── ทำไมต้องวัด "พื้นที่ทึบทั้งช่อง" ไม่ใช่จิ้มทีละพิกเซล ──
 * ของเดิมเช็กพิกเซลเดียวตรงกลางช่อง ซึ่งพลาดง่ายมากกับเส้นบาง ๆ อย่างตัวอักษร
 * วัดจริงแล้ว "แมว" ได้ 7 เม็ด และพอเปลี่ยนระยะห่างเป็น 40 ได้ศูนย์เม็ด
 * เพราะแถวที่สุ่มดันไปตกในช่องว่างระหว่างเส้นพอดี
 * ตอนนี้นับพิกเซลทึบทั้งช่องแล้วดูสัดส่วน ช่องไหนมีหมึกพอก็ลงเม็ด — ไม่มีจุดบอดอีก
 *
 * ── ทำไมต้องปูตารางจาก "กรอบของหมึก" ──
 * ปูจากขอบผ้าใบจะได้แถวบน/ล่างที่ไม่ตรงกับตัวอักษร ลายเลยดูเบี้ยว
 * ปูจากกรอบหมึกแทน แถวล่างสุดจึงอยู่ที่ dy = 0 พอดีเสมอ (ลายนั่งบนเส้นวิ่ง)
 * และแถวบนสุดอยู่ที่ยอดลายพอดี
 *
 * ── ย่อให้พอดีเพดานเอง ──
 * ลายที่สูงเกินเพดานกระโดดสองชั้นจะเก็บไม่ได้ทั้งแถวบน แทนที่จะตัดหัวทิ้ง
 * ให้ย่อทั้งลายตามสัดส่วนลงมา ตัวอักษรจึงยังครบตัว แค่เตี้ยลง
 */
/**
 * ตัวอักษร → จุด
 *
 * ── ทำไมไม่ย่อฟอนต์ใหญ่ลงมา ──
 * เพดานกระโดดกับระยะห่างเม็ดจำกัดให้ลายสูงได้แค่ 5-7 แถว
 * ย่อฟอนต์ 220px ลงเหลือ 6 แถวยังไงก็เบลอ ตัวอักษรติดกันเป็นก้อน (ลองแล้วทั้งถมทึบและลายเส้น)
 *
 * วิธีที่ได้ผลคือเรนเดอร์ตัวอักษรที่ "ขนาดเท่าจำนวนแถว" ตั้งแต่แรก — ฟอนต์ 6px
 * แล้วอ่านทีละพิกเซล หนึ่งพิกเซลคือหนึ่งเม็ด ได้หน้าตาแบบป้ายไฟ LED ซึ่งอ่านออกจริง
 * (ตัวเรนเดอร์ของเบราว์เซอร์จัดการ hinting ให้เองที่ขนาดเล็ก ดีกว่าที่เราย่อเอง)
 *
 * ── ข้อจำกัดที่ต้องยอมรับ ──
 * 6 แถวพอสำหรับตัวพิมพ์ใหญ่อังกฤษกับตัวเลข แต่ภาษาไทยที่มีสระบน-ล่างจะอ่านไม่ออก
 * เป็นข้อจำกัดของ "จำนวนเม็ดที่เอื้อมถึง" ไม่ใช่ของโค้ด
 */
function artTextDots(gap, want) {
  const txt = document.getElementById('artText').value || '';
  if (!txt.trim()) return [];
  const rows = Math.max(3, Math.min(9, Math.floor(want / gap) + 1));

  // ── ค่าสองตัวนี้มาจากการทดลอง ไม่ได้เดา ──
  // ตัวหนา (700) + เกณฑ์ต่ำ (90) ทำให้ตัวอักษรกลายเป็นก้อนทึบติดกันหมด อ่านไม่ออกสักตัว
  // ตัวปกติ (400) + เกณฑ์สูง (160) ตัดขอบที่เบลอทิ้ง เหลือแต่แกนของเส้น ตัวอักษรจึงแยกออกจากกัน
  // และต้องเรนเดอร์ที่ฟอนต์ "ใหญ่กว่าจำนวนแถวราวครึ่งเท่า" แล้วค่อยได้ความสูงเท่าที่ต้องการ
  const WEIGHT = 400;
  const THRESHOLD = 160;

  const read = (fontPx) => {
    const cv = document.createElement('canvas');
    let g = cv.getContext('2d', { willReadFrequently: true });
    const font = `${WEIGHT} ${fontPx}px 'IBM Plex Sans Thai', system-ui, sans-serif`;
    g.font = font;
    cv.width = Math.max(4, Math.ceil(g.measureText(txt).width) + 6);
    cv.height = fontPx * 2 + 6;
    g = cv.getContext('2d', { willReadFrequently: true });
    g.font = font;                     // ตั้งขนาดผ้าใบแล้วค่าเดิมถูกล้าง ต้องตั้งใหม่
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#FFFFFF';
    g.fillText(txt, 3, fontPx * 1.5);

    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    const on = [];
    let y0 = cv.height, y1 = -1, x0 = cv.width;
    for (let y = 0; y < cv.height; y++) {
      for (let x = 0; x < cv.width; x++) {
        if (d[(y * cv.width + x) * 4 + 3] > THRESHOLD) {
          on.push([x, y]);
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
          if (x < x0) x0 = x;
        }
      }
    }
    return { on, y1, x0, h: y1 < 0 ? 0 : (y1 - y0 + 1) };
  };

  // ไล่ขนาดฟอนต์ลงมาจนกว่าจะได้จำนวนแถวที่ไม่เกินเพดาน — ได้รายละเอียดมากที่สุดเท่าที่ใส่ได้
  let best = null;
  for (let fp = Math.round(rows * 1.7); fp >= 5; fp--) {
    const r = read(fp);
    if (!r.on.length) continue;
    best = r;
    if (r.h <= rows) break;
  }
  if (!best || !best.on.length) return [];
  return best.on.map(([x, y]) => [(x - best.x0) * gap, (best.y1 - y) * gap]);
}

function artSample() {
  const gap = Math.min(60, Math.max(20, artNum('artGap', 28)));

  // ── โหมดแก้เม็ดเอง ──
  // ไม่สร้างลายใหม่ ใช้เม็ดชุดที่มีอยู่ตรง ๆ เพราะคนกำลังแก้มันอยู่
  // ถ้าเปลี่ยนระยะห่าง ให้ย้ายเม็ดทั้งชุดไปลงตารางใหม่ ไม่งั้นเม็ดจะหลุดออกนอกช่อง
  if (art.mode === 'edit') {
    if (gap !== art.gap && art.gap > 0) {
      const seen = new Set();
      const moved = [];
      for (const [dx, dy] of art.pts) {
        const k = `${Math.round(dx / art.gap)},${Math.round(dy / art.gap)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        moved.push([Math.round(dx / art.gap) * gap, Math.round(dy / art.gap) * gap]);
      }
      art.pts = moved.filter(([, dy]) => dy <= ART_CEIL);
    }
    art.gap = gap;
    art.w = art.pts.length ? Math.max(...art.pts.map((p) => p[0])) : 0;
    return;
  }
  art.gap = gap;
  const wantH = Math.min(ART_CEIL, Math.max(gap, artNum('artH', 150)));
  if (art.mode === 'text') {
    const pts = artTextDots(gap, wantH);
    art.pts = pts;
    art.w = pts.length ? Math.max(...pts.map((p) => p[0])) : 0;
    return;
  }

  const src = document.createElement('canvas');
  src.width = PAD_W;
  src.height = PAD_H;
  const sg = src.getContext('2d', { willReadFrequently: true });
  artPaintSource(sg);
  const d = sg.getImageData(0, 0, PAD_W, PAD_H).data;
  const A_AT = (x, y) => d[(y * PAD_W + x) * 4 + 3];

  // 1) กรอบของหมึก
  let x0 = PAD_W, x1 = -1, y0 = PAD_H, y1 = -1;
  for (let y = 0; y < PAD_H; y++) {
    for (let x = 0; x < PAD_W; x++) {
      if (A_AT(x, y) > 128) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) { art.pts = []; art.w = 0; return; }

  // 2) ย่อถ้าสูงเกินเพดาน — เก็บสัดส่วนไว้ ลายจึงไม่เบี้ยว
  const inkH = y1 - y0;
  const k = inkH > 0 ? wantH / inkH : 1;
  const cell = gap / k;                       // ขนาดช่องในพิกัดของผ้าใบต้นฉบับ

  const cols = Math.max(1, Math.round((x1 - x0) / cell) + 1);
  const rows = Math.max(1, Math.round(inkH / cell) + 1);

  // 3) ช่องไหนมีหมึกเกิน 28% ของพื้นที่ ถือว่ามีเม็ด
  const out = [];
  const half = cell / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = x0 + c * cell;
      const cy = y1 - r * cell;
      let hit = 0, seen = 0;
      const ax = Math.max(0, Math.round(cx - half));
      const bx = Math.min(PAD_W - 1, Math.round(cx + half));
      const ay = Math.max(0, Math.round(cy - half));
      const by = Math.min(PAD_H - 1, Math.round(cy + half));
      for (let y = ay; y <= by; y += 2) {
        for (let x = ax; x <= bx; x += 2) { seen++; if (A_AT(x, y) > 128) hit++; }
      }
      if (seen && hit / seen > 0.3) out.push([c * gap, r * gap]);
    }
  }

  art.pts = out;
  art.w = out.length ? Math.max(...out.map((p) => p[0])) : 0;
}

/** ภาพตัวอย่าง: โชว์เม็ดจริง ๆ พร้อมเส้นเพดานกระโดด จะได้รู้ตั้งแต่ตอนวาดว่าเอื้อมถึงไหม */
function artDraw() {
  artSample();
  const g = artCtx;
  g.clearRect(0, 0, PAD_W, PAD_H);
  g.fillStyle = '#16121C';
  g.fillRect(0, 0, PAD_W, PAD_H);

  const base = PAD_H - 24;                      // เส้นวิ่ง
  const line = (dy, col, text) => {
    const y = base - dy;
    g.strokeStyle = col;
    g.setLineDash([5, 4]);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, y + 0.5);
    g.lineTo(PAD_W, y + 0.5);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = col;
    g.font = '10px system-ui';
    g.fillText(text, 6, y - 3);
  };
  line(0, 'rgba(255,255,255,.35)', 'เส้นวิ่ง');
  line(REACH_HOP, 'rgba(127,227,218,.55)', 'เพดานกระโดดเดี่ยว');
  line(REACH_DBL, 'rgba(196,164,255,.55)', 'เพดานกระโดดสองชั้น');

  // ตารางช่องวางเม็ด — มีเฉพาะตอนแก้เม็ดเอง จะได้รู้ว่าคลิกตรงไหนเม็ดจะไปลงช่องไหน
  if (art.mode === 'edit') {
    const gap = art.gap;
    g.strokeStyle = 'rgba(255,255,255,.07)';
    g.lineWidth = 1;
    const maxR = artMaxRow(gap);
    for (let c = 0; ART_X0 + c * gap < PAD_W; c++) {
      const x = ART_X0 + c * gap;
      g.beginPath();
      g.moveTo(x + 0.5, base - maxR * gap);
      g.lineTo(x + 0.5, base);
      g.stroke();
    }
    for (let r = 0; r <= maxR; r++) {
      const y = base - r * gap;
      g.beginPath();
      g.moveTo(ART_X0, y + 0.5);
      g.lineTo(PAD_W, y + 0.5);
      g.stroke();
    }
  }

  // ลายที่วาดไว้ (จาง ๆ) ให้เห็นว่าเม็ดเกาะตามอะไร
  if (art.mode === 'draw') {
    g.save();
    g.globalAlpha = 0.16;
    artPaintSource(g);
    g.restore();
  }

  for (const [dx, dy] of art.pts) {
    g.fillStyle = dy > REACH_DBL ? '#FF7A7A' : '#7FE3DA';
    g.beginPath();
    g.arc(ART_X0 + dx, base - dy, LEVEL.fishR * 0.8, 0, Math.PI * 2);
    g.fill();
  }

  const info = document.getElementById('artInfo');
  const hint = art.mode === 'edit' ? ' — คลิกช่องว่างเพื่อเติมเม็ด คลิกเม็ดเพื่อลบ ลากค้างได้' : '';
  info.textContent = art.pts.length
    ? `${art.pts.length} เม็ด · กว้าง ${art.w}px · สูง ${Math.max(...art.pts.map((p) => p[1]))}px`
      + ` (เพดานที่เอื้อมถึง ${ART_CEIL}px)${hint}`
    : (art.mode === 'edit'
      ? 'ตารางว่าง — คลิกในตารางเพื่อวางเม็ดเอง'
      : 'ยังไม่มีลาย — พิมพ์ข้อความ หรือสลับไปโหมด “วาดเอง” แล้วลากในกรอบ');
}

function artSyncMode() {
  document.body.classList.toggle('art-draw', art.mode === 'draw');
  document.body.classList.toggle('art-edit', art.mode === 'edit');
  for (const b of document.querySelectorAll('#artMode .mode')) b.classList.toggle('on', b.dataset.m === art.mode);
  document.getElementById('artPlace').textContent = art.editId ? 'บันทึกลาย' : 'วางลงท่อน';
  artDraw();
}

document.getElementById('openArt').onclick = () => {
  if (locked()) return;
  art.editId = null;
  artModal.classList.remove('hidden');
  artSyncMode();
};

/** เปิดกล่องมาแก้ลายที่วางไว้แล้ว — เข้าโหมดแก้เม็ดพร้อมเม็ดชุดเดิม */
function artEditItem(id) {
  const it = byId(doc(), id);
  if (!it || it.t !== 'fishDots') return;
  art.editId = id;
  art.pts = (it.pts || []).map((p) => p.slice());
  // เดาระยะห่างจากเม็ดจริง — ผู้ใช้อาจเคยตั้งไว้คนละค่ากับช่องในกล่องตอนนี้
  const xs = [...new Set(art.pts.map((p) => p[0]))].sort((a, b) => a - b);
  let g = 0;
  for (let i = 1; i < xs.length; i++) { const d2 = xs[i] - xs[i - 1]; if (d2 > 0 && (!g || d2 < g)) g = d2; }
  art.gap = g || artNum('artGap', 26);
  document.getElementById('artGap').value = art.gap;
  art.mode = 'edit';
  artModal.classList.remove('hidden');
  artSyncMode();
}
document.getElementById('closeArt').onclick = () => artModal.classList.add('hidden');
artModal.onclick = (e) => { if (e.target === artModal) artModal.classList.add('hidden'); };

document.getElementById('artMode').onclick = (e) => {
  const b = e.target.closest('.mode');
  if (!b) return;
  art.mode = b.dataset.m;
  artSyncMode();
};

for (const id of ['artText', 'artH', 'artGap']) {
  document.getElementById(id).oninput = artDraw;
}

document.getElementById('artClear').onclick = () => { art.strokes = []; artDraw(); };
document.getElementById('artWipe').onclick = () => { art.pts = []; artDraw(); };

// ── วาดด้วยเมาส์/นิ้วในกรอบ ──
const artAt = (ev) => {
  const r = artPad.getBoundingClientRect();
  return [(ev.clientX - r.left) * (PAD_W / r.width), (ev.clientY - r.top) * (PAD_H / r.height)];
};
artPad.addEventListener('pointerdown', (ev) => {
  if (art.mode === 'edit') {
    artPad.setPointerCapture(ev.pointerId);
    const cell = artCellAt(...artAt(ev), art.gap);
    if (!cell) return;
    // ช่องแรกที่จิ้มเป็นตัวตัดสินว่าการลากครั้งนี้คือ "เติม" หรือ "ลบ"
    // (แบบเดียวกับโปรแกรมวาดจุดทั่วไป ลากทีเดียวได้ทั้งแถวโดยไม่สลับไปมา)
    art.paint = artHasDot(cell) ? 'off' : 'on';
    artApplyDot(cell);
    return;
  }
  if (art.mode !== 'draw') return;
  artPad.setPointerCapture(ev.pointerId);
  if (document.getElementById('artErase').checked) {
    // ยางลบ: ทิ้งเส้นที่ลากผ่าน ง่ายกว่าและเดาง่ายกว่าการลบทีละพิกเซล
    art.drawing = 'erase';
    artErasePt(artAt(ev));
    return;
  }
  art.drawing = [artAt(ev)];
  art.strokes.push(art.drawing);
  artDraw();
});
artPad.addEventListener('pointermove', (ev) => {
  if (art.paint) {
    const cell = artCellAt(...artAt(ev), art.gap);
    if (cell) artApplyDot(cell);
    return;
  }
  if (!art.drawing) return;
  if (art.drawing === 'erase') { artErasePt(artAt(ev)); return; }
  art.drawing.push(artAt(ev));
  artDraw();
});
const artUp = () => { art.drawing = null; art.paint = null; };

function artHasDot([dx, dy]) {
  return art.pts.some((p) => p[0] === dx && p[1] === dy);
}

function artApplyDot(cell) {
  const has = artHasDot(cell);
  if (art.paint === 'on' && !has) art.pts.push(cell);
  else if (art.paint === 'off' && has) art.pts = art.pts.filter((p) => !(p[0] === cell[0] && p[1] === cell[1]));
  else return;
  artDraw();
}
artPad.addEventListener('pointerup', artUp);
artPad.addEventListener('pointercancel', artUp);

function artErasePt(p) {
  const r = Math.max(14, artNum('artGap', 28) * 0.7);
  const before = art.strokes.length;
  art.strokes = art.strokes.filter((s) => !s.some(([x, y]) => Math.hypot(x - p[0], y - p[1]) < r));
  if (art.strokes.length !== before) artDraw();
}

document.getElementById('artPlace').onclick = () => {
  if (!art.pts.length) { artFlash('ยังไม่มีลายให้วาง'); return; }
  if (locked()) { artFlash('ท่อนนี้แก้ไม่ได้'); return; }

  // กำลังแก้ลายเดิม — เขียนทับเม็ดชุดเดิมของชิ้นนั้น ไม่สร้างชิ้นใหม่
  if (art.editId) {
    const id = art.editId;
    mutate((dd) => {
      const q = byId(dd, id);
      if (q) q.pts = art.pts.map((p) => p.slice());
    });
    renderInspector();
    updateCount();
    artFlash(`บันทึกแล้ว ${art.pts.length} เม็ด`);
    return;
  }

  const it = {
    id: uid(),
    t: 'fishDots',
    group: 'free',
    x: Math.round(docCam() + W / 2 - art.w / 2),
    pts: art.pts.map((p) => p.slice()),
  };
  mutate((d) => { d.items.push(it); });
  sel = it.id;
  renderInspector();
  updateCount();
  artFlash(`วางแล้ว ${art.pts.length} เม็ด`);
};

function artFlash(msg) {
  const el = document.getElementById('artMsg');
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 1800);
}

// ── กล่องโค้ด ────────────────────────────────────────
const modal = document.getElementById('codeModal');

document.getElementById('showCode').onclick = () => {
  // โหมดทั้งด่าน: ส่งออกเป็นลำดับท่อนของฉาก ไม่ใช่ตัวท่อน
  if (view.mode === 'stage') {
    const st = stage();
    const route = routeOf(st);
    const own = stageOwnCode(st);
    const head = own
      ? `// ① ต่อท้าย PATTERNS ใน src/level.js — เรียงตามนี้ ห้ามสลับ เพราะ route ข้างล่างอ้างเลขนี้\n` +
        `${own.code}\n\n` +
        `// ② ต่อท้าย PATTERN_META ใน src/level.js (ต้องยาวเท่ากับ PATTERNS เสมอ)\n${own.meta}\n\n` +
        `// ③ src/stages.js → ในฉาก “${st.name}” (id: '${st.id}')\n` +
        `//    ลบ pool: [...] กับ segments: ${st.segments || route.length} ทิ้งก่อน แล้ววาง route นี้แทน\n` +
        `//    (Level.routeFor อ่าน pool ก่อนเสมอ ถ้า pool ยังอยู่ route จะไม่ถูกใช้เลย)\n`
      : `// src/stages.js → ในฉาก “${st.name}” (id: '${st.id}')\n` +
        `//\n` +
        `// ① ลบ pool: [...] กับ segments: ${st.segments || route.length} ของฉากนี้ทิ้งก่อน\n` +
        `//    Level.routeFor อ่าน pool ก่อนเสมอ ถ้า pool ยังอยู่ ก้อนข้างล่างจะไม่ถูกใช้เลย\n` +
        `// ② วางก้อนนี้แทน — ลำดับท่อนจะตรงกับที่เห็นบนไทม์ไลน์ทุกครั้งที่เล่น ไม่สุ่มอีก\n`;

    document.getElementById('codeOut').value = head + stageRouteCode(st, own && own.at) + '\n';
    document.getElementById('codeHint').textContent =
      `ทั้งด่าน ${route.length} ท่อน · ยาวรวม ${Math.round(stageScene().width)}px` +
      (own ? ` · มีท่อนของฉัน ${own.names}` : '') +
      ' — ปุ่ม “คัดลอกเป็น JSON” ได้ก้อนที่ส่งให้เคลาด์แก้ต่อได้ทันที';
    modal.classList.remove('hidden');
    return;
  }

  const out = toCode(doc());
  const gd = doc().gate && GATES[doc().gate];
  if (gd) {
    // ท่อนทางเข้าไม่ได้ต่อท้าย PATTERNS — แทนที่ chunk ของทางเข้านั้นใน gates.js ตรง ๆ
    const body = out.code.split('\n').slice(1).join('\n').replace(/^ {2}\(x\) =>/, '    chunk: (x) =>');
    document.getElementById('codeOut').value =
      `// ① src/gates.js → ใน GATES.${gd.id} แทนที่ทั้งก้อน chunk: (x) => { ... }, ด้วยก้อนนี้\n${body}\n\n` +
      `// ไม่ต้องแก้ PATTERN_META หรือ pool — ทางเข้าด่านไม่ถูกสุ่มปนกับท่อนปกติ`;
    document.getElementById('codeHint').textContent =
      `ท่อนนี้ใช้เป็น “${gd.name}” — ตำแหน่ง x นับจากจุดเริ่มทางเข้า ความยาวคงที่ ${gd.layout.length}px`;
    modal.classList.remove('hidden');
    return;
  }
  document.getElementById('codeOut').value =
    `// ① ต่อท้าย PATTERNS ใน src/level.js\n${out.code}\n\n` +
    `// ② ต่อท้าย PATTERN_META ใน src/level.js (ต้องยาวเท่ากับ PATTERNS เสมอ)\n${out.meta}\n\n` +
    `// ③ เติมเลข ${out.idx} ลงใน pool ของฉากที่อยากให้ท่อนนี้โผล่ (src/stages.js)`;
  document.getElementById('codeHint').textContent =
    `ท่อนนี้จะเป็นลำดับที่ ${out.idx} — ตัวเลขนี้คิดจากจำนวนท่อนที่มีอยู่ตอนนี้ ถ้าเพิ่มหลายท่อนรวดต้องไล่เลขเอง`;
  modal.classList.remove('hidden');
};

document.getElementById('closeCode').onclick = () => modal.classList.add('hidden');
modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };

document.getElementById('copyCode').onclick = () => {
  navigator.clipboard.writeText(document.getElementById('codeOut').value)
    .then(() => flash('คัดลอกแล้ว'));
};

document.getElementById('copyJson').onclick = () => {
  const st = stage();
  const data = view.mode === 'stage'
    ? { stage: st.id, name: st.name, route: routeOf(st), docs: ownDocsOf(routeOf(st)) }
    : doc();
  navigator.clipboard.writeText(JSON.stringify(data))
    .then(() => flash('คัดลอก JSON แล้ว'));
};

function flash(msg) {
  const el = document.getElementById('copyMsg');
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 1600);
}

// ─────────────────────────────────────────────────────────────
load();
loadRoutes();
loadTpls();
syncHistoryBtns();
refreshTplPick();
buildKit();
refreshAll();
draw();

// Vite แทน import.meta.env.DEV ด้วย false ตอน build จริง ก้อนนี้จึงถูกตัดทิ้งทั้งก้อน
// มีไว้เพื่อตรวจจากนอกว่าโค้ดที่ export ออกไปสร้างท่อนหน้าตาเดียวกับที่เห็นบนหน้าจอจริงหรือไม่
if (import.meta.env.DEV) {
  window.__ed = {
    get docs() { return docs; },
    get cur() { return cur; },
    get view() { return view; },
    get sel() { return sel; },
    xOf, itemBox, docCam, pick, worldAt,
    get sim() { return sim; },
    get routes() { return routes; },
    doc, build, toCode, simulate, staticIssues, joinIssues, runCheck, addItem, KIT, A,
    PATTERNS, PATTERN_META,
    get tpls() { return tpls; },
    artPts: () => art.pts,
    stageScene, routeOf, rerollRoute, setMode, pickSlot, stageRouteCode,
    adoptSlot, releaseSlot, docFromPattern, harvestFish, makeTpl, applyTpl, slotDoc,
  };
}
