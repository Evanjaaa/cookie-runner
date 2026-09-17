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
import { AUTHOR, PATTERNS, PATTERN_META, PICKUPS } from '../level.js';
import { GATES, GATE_LIST, gateMarks } from '../gates.js';
import { gateViewAt, doorOpenAt } from '../gate-run.js';
import { drawGateBack, drawGateFront, warmGateArt } from '../render/gates/index.js';
import { STAGES } from '../stages.js';
import { drawSky, drawHills, drawGround } from '../render/background.js';
import {
  drawObstacles, drawTreats, drawPlayer, drawFallers, drawHazards,
  drawNips, drawCans, drawMagnets, drawShields, drawPotions, drawLetters,
} from '../render/entities.js';
import { SKINS } from '../skins.js';

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

  // ── พื้นเหยียบได้ (ของทดลอง) ──
  // ยังมีแค่ในหน้านี้ เกมจริงยังไม่รู้จัก — ไว้ลองจังหวะให้ลงตัวก่อนค่อยย้ายเข้าเครื่องเกม
  { t: 'hill', group: 'plat', pal: 'plat', label: 'เนินคุกกี้', sub: 'เดินขึ้นได้เลย ไม่ต้องกระโดด', w: 320, h: 70, wide: true },
  { t: 'ledge', group: 'plat', pal: 'plat', label: 'พื้นลอย', sub: 'กระโดดขึ้นไปเหยียบ', w: 200, lift: 90 },
  { t: 'ledge', group: 'plat', pal: 'plat', label: 'พื้นลอยเหนือหลุม', sub: 'ไม่กระโดด = ตก', w: 260, lift: 90, under: true },
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

const FOOD_T = new Set(['fishRun', 'fishJump', 'fishDouble', 'arcMid', 'arcHigh', 'fishWave', 'fishLow']);
const NEEDS_TWO = new Set(['fishJump', 'fishDouble', 'arcMid', 'arcHigh', 'fishWave']);

// ─────────────────────────────────────────────────────────────
// เอกสาร
// ─────────────────────────────────────────────────────────────
const STORE_KEY = 'meowzing:editor:chunks';
let docs = [];
let cur = 0;
let sel = null;         // id ของชิ้นที่เลือก
let undoStack = [];
let nextId = 1;

const view = {
  cam: -100,
  stage: 0,
  refIdx: -1,           // >= 0 = กำลังดูท่อนเดิมของเกม (แก้ไม่ได้)
  arcs: true,
  next: true,
  grid: false,
  xray: true,           // ทางเข้าด่าน: ผนังหน้าอาคารจางไว้ให้เห็นข้างในตอนวางของ
};

function uid() { return 'i' + (nextId++); }

function blankDoc(name) {
  return {
    name: name || 'ท่อนใหม่',
    width: chunkW,
    kind: 'obstacle',
    diff: 3,
    items: [],
  };
}

function doc() { return docs[cur]; }

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
  }
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(docs)); } catch { /* เต็มก็ช่าง */ }
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
  if (it.t === 'pit') return it.w;
  if (it.t === 'faller') return FALLER.w;
  if (it.t === 'bee') return HAZARD.bee.w;
  if (it.t === 'ball') return HAZARD.ball.r * 2;
  if (PLAT_T.has(it.t)) return it.w;
  return 0;
}

// ─────────────────────────────────────────────────────────────
// พื้นเหยียบได้ — รูปทรงผิว
// ─────────────────────────────────────────────────────────────
const LEDGE_THICK = 26;

/** ความยาวทางลาดของเนิน — ยาวอย่างน้อย 2.4 เท่าของความสูง ความชันสูงสุดจึงไม่เกิน ~0.63 */
function hillRamp(p) {
  return Math.min(p.w / 2, Math.max(60, p.h * 2.4));
}

/** y ของผิวชิ้นหนึ่ง ณ x — null ถ้า x ไม่อยู่ในช่วงของชิ้นนั้น */
function platTop(p, x) {
  if (x < p.x || x > p.x + p.w) return null;
  if (p.kind === 'ledge') return p.top;
  const u = x - p.x;
  const ramp = hillRamp(p);
  const t = u < ramp ? u / ramp : u > p.w - ramp ? (p.w - u) / ramp : 1;
  return GROUND_Y - p.h * t * t * (3 - 2 * t);     // smoothstep: ตีนเนินกับยอดเนินไม่มีมุมหัก
}

/** ผิวที่สูงที่สุด ณ x (ไม่นับพื้นปกติ) — null ถ้าไม่มีพื้นเหยียบตรงนั้น */
function highestTop(plats, x) {
  let best = null;
  for (const p of plats) {
    const t = platTop(p, x);
    if (t !== null && (best === null || t < best)) best = t;
  }
  return best;
}

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
      case 'pit': pit.push(tag({ x, w: it.w }, it)); break;
      case 'fishJump': made = safeArc(A.fishJump, x, n); break;
      case 'fishDouble': made = safeArc(A.fishDouble, x, n); break;
      case 'arcMid': made = safeArc(A.arcMid, x, n); break;
      case 'arcHigh': made = safeArc(A.arcHigh, x, n); break;
      case 'fishWave': made = safeArc((xx, nn) => A.fishWave(xx, nn, it.gap, it.humps), x, n); break;
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
      if (it.t === 'fishRun') made = laneOf(made, it, plats);
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
      ...p, pickups, fallers: p.fallers || [], hazards: [], plats: [],
      width: p.width || chunkW, partial: !!p.partial, readonly: true, gate: g ? g.id : null,
    };
  }
  const d = doc();
  return { ...build(d), width: d.width, partial: !!d.partial, readonly: false, gate: d.gate || null };
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
  drawGround(ctx, scene.pit, cam, pal);
  const gate = gateView(cam);
  if (gate) drawGateBack(ctx, gate.def, gate.v);
  drawPlats(cam, pal);

  if (view.grid) drawGrid(cam);
  if (view.arcs) drawArcs(cam, scene.jumps);

  drawObstacles(ctx, scene.obs, cam, st.theme);
  drawSpecials(cam, st);
  hideEaten();
  drawTreats(ctx, scene.fish, cam, tick);
  drawItems(cam);

  if (view.next) drawGhost(cam, scene);
  drawBounds(cam, scene.width);
  drawJumpMarks(cam, scene.jumps);
  if (sim) drawSimMarks(cam);
  if (!scene.readonly) drawLaneGuides();
  if (!scene.readonly) drawSelection(cam);
  drawCat(cam);
  if (gate) {
    drawGateFront(ctx, gate.def, gate.v);
    drawGateMarks(cam, gate);
  }

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

/**
 * พื้นเหยียบได้ — วาดด้วยสีชุดเดียวกับพื้นของฉาก จึงกลืนเป็นส่วนหนึ่งของแมพ
 *   เนิน     ก้อนแป้งคุกกี้โผล่ขึ้นจากพื้น มีเปลือกกรอบตามแนวผิวและช็อกชิป
 *   พื้นลอย  แท่งเวเฟอร์ลอย มีไส้ครีมตรงกลาง และเงาบนพื้นบอกว่าลอยอยู่
 */
function drawPlats(cam, pal) {
  const ps = scene.plats || [];
  for (const p of ps) {
    const x0 = p.x - cam;
    if (x0 > W + 20 || x0 + p.w < -20) continue;
    if (p.kind === 'hill') drawHill(p, cam, pal);
    else drawLedge(p, cam, pal);
  }
}

function drawHill(p, cam, pal) {
  const pts = [];
  for (let x = p.x; x < p.x + p.w; x += 6) pts.push([x - cam, platTop(p, x)]);
  pts.push([p.x + p.w - cam, GROUND_Y]);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p.x - cam, GROUND_Y + 8);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(p.x + p.w - cam, GROUND_Y + 8);
  ctx.closePath();
  ctx.fillStyle = pal.ground;
  ctx.fill();
  ctx.clip();

  // เปลือกกรอบสองชั้นวิ่งตามผิว — ท่าเดียวกับแถบผิวของพื้นปกติ (crust / crustTop)
  const trace = (dy, width, color) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + dy) : ctx.moveTo(x, y + dy)));
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.stroke();
  };
  trace(11, 22, pal.crust);
  trace(3, 6, pal.crustTop);

  // ช็อกชิป — ตำแหน่งตายตัวตามพิกัดโลก เลื่อนจอแล้วไม่วิบวับ
  ctx.fillStyle = 'rgba(58,28,16,.75)';
  for (let x = p.x + 30; x < p.x + p.w - 20; x += 46) {
    const top = platTop(p, x);
    const depth = 30 + ((x * 7) % 23);
    if (top + depth > GROUND_Y) continue;
    ctx.beginPath();
    ctx.ellipse(x - cam, top + depth, 5, 4, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLedge(p, cam, pal) {
  const x = p.x - cam;
  const y = p.top;

  // เงาบนพื้น — เห็นแล้วรู้ทันทีว่าแท่งนี้ลอยอยู่ ไม่ได้ตั้งบนพื้น
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath();
  ctx.ellipse(x + p.w / 2, GROUND_Y + 2, p.w * 0.42, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const r = 9;
  const body = () => {
    ctx.beginPath();
    ctx.roundRect(x, y, p.w, LEDGE_THICK, r);
  };
  body();
  ctx.fillStyle = pal.crust;
  ctx.fill();
  ctx.clip();

  // ลายตารางเวเฟอร์
  ctx.strokeStyle = 'rgba(90,40,18,.28)';
  ctx.lineWidth = 1.5;
  for (let gx = x + 14; gx < x + p.w; gx += 16) {
    ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + LEDGE_THICK); ctx.stroke();
  }
  // ไส้ครีมตรงกลาง + ผิวบนที่โดนแสง
  ctx.fillStyle = '#FFF1D6';
  ctx.fillRect(x, y + LEDGE_THICK / 2 - 2, p.w, 4);
  ctx.fillStyle = pal.crustTop;
  ctx.fillRect(x, y, p.w, 6);
  ctx.restore();

  ctx.save();
  body();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(60,24,10,.45)';
  ctx.stroke();
  ctx.restore();
}

/**
 * เส้นบอกชั้น — โผล่เฉพาะตอนเลือกแถวพื้นอยู่ บอกว่าลากขึ้นลงแล้วจะไปดูดเข้าชั้นไหน
 * เส้นของชั้นที่แถวอยู่ตอนนี้เข้มกว่าเส้นอื่น
 */
function drawLaneGuides() {
  const it = sel && view.refIdx < 0 && byId(doc(), sel);
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
  if (!sim || scrubAt < 0 || sim.eatAt.length !== scene.fish.length) return;
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

function drawSelection(cam) {
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

  // ของกิน
  sctx.fillStyle = '#7FE3DA';
  for (const f of sc.fish) {
    const y = gy - (GROUND_Y - f.y) * 0.32;
    sctx.fillRect((f.x + ox) * k - 1, y, 2, 2);
  }

  // สิ่งกีดขวาง
  for (const o of sc.obs) {
    sctx.fillStyle = o.kind === 'bar' ? '#C4A4FF' : '#FFC66B';
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
  return null;
}

// ─────────────────────────────────────────────────────────────
// จำลองการเล่น — ฟิสิกส์ชุดเดียวกับ Player.update เป๊ะ ๆ
//
// นี่คือหัวใจของเครื่องมือ: ไม่ได้เดาว่าด่านผ่านได้ไหม แต่ให้แมวลองวิ่งจริง
// ตาม "เฉลย" ที่ผู้ออกแบบประกาศไว้ (จุดกดทุกอัน) แล้วรายงานว่าเกิดอะไรขึ้น
// ─────────────────────────────────────────────────────────────
function simulate(d) {
  const sc = view.refIdx >= 0 ? active() : { ...build(d), width: d.width, partial: !!d.partial, gate: d.gate || null };
  const bars = sc.obs.filter((o) => o.kind === 'bar');
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

  for (let f = 0; f < 6000 && cx < endX && !death; f++) {
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
      if (o.kind !== 'bar' && box.x < o.x + o.w && o.x < box.x + box.w) {
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

    const stand = footing(sc, cx, y - vy, y, onGround, fx.boost > 0 || fx.big > 0);
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
const STICK = 10;

function footing(sc, cx, prevY, y, wasOnGround, pitsSolid = false) {
  const prevX = cx - SPEED.run;
  let best = null;
  const tryTop = (now, before) => {
    if (now === null) return;
    const from = before === null ? now : before;
    const land = prevY <= from + 0.5 && y >= now;
    const stick = wasOnGround && y < now && now - y <= STICK;
    if ((land || stick) && (best === null || now < best)) best = now;
  };

  // ติดสปีด/ตัวโต วิ่งข้ามปากหลุมได้ (ดู Game.pitsSolid)
  const overPit = !pitsSolid && sc.pit.some((p) => cx > p.x + 6 && cx < p.x + p.w - 6);
  if (!overPit) tryTop(GROUND_Y, GROUND_Y);
  for (const p of sc.plats || []) tryTop(platTop(p, cx), platTop(p, prevX));
  return best;
}

// ─────────────────────────────────────────────────────────────
// ตรวจแบบไม่ต้องวิ่ง — กฎที่ดูจากผังก็รู้ว่าผิด
// ─────────────────────────────────────────────────────────────
function staticIssues(sc) {
  const out = [];
  const bars = sc.obs.filter((o) => o.kind === 'bar');
  const solids = sc.obs.filter((o) => o.kind !== 'bar');

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
        if (o.kind !== 'bar' && o.x < p.x + p.w && p.x < o.x + o.w) {
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

  if (!sc.jumps.length && sc.obs.some((o) => o.kind !== 'bar')) {
    out.push({ bad: false, msg: 'มีของให้ข้ามแต่ไม่ได้ประกาศจุดกดเลย ตรวจด่านจะจำลองไม่ได้' });
  }
  return out;

  function name(k) {
    return k === 'spike' ? 'หนาม' : k === 'crate' ? 'ลัง' : k === 'bar' ? 'คาน' : k;
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
    const bars = all.filter((o) => o.kind === 'bar');
    const solids = all.filter((o) => o.kind !== 'bar');
    return bars.some((b) => solids.some((o) => b.x < o.x + o.w && o.x < b.x + b.w));
  }
}

// ─────────────────────────────────────────────────────────────
// รายงานผล
// ─────────────────────────────────────────────────────────────
const reportEl = document.getElementById('report');

function runCheck() {
  const sc = view.refIdx >= 0 ? active() : { ...build(doc()), width: doc().width, partial: !!doc().partial, gate: doc().gate || null };
  sim = simulate(doc());
  const statics = staticIssues(sc);
  // ท่อนทางเข้าไม่ถูกสุ่มต่อกับท่อนอื่น ไม่ต้องตรวจการต่อท่อน
  const join = sc.gate ? { after: [], before: [], gate: true } : joinIssues(sc);

  const rows = [];
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

  if ((sc.plats || []).length) {
    rows.push('<span class="warn">มีพื้นเหยียบ (ของทดลอง)</span>' +
      ' — จำลองในหน้านี้ได้ครบ แต่เกมจริงยังไม่รองรับ ยังไม่ควรวางท่อนนี้ลงไฟล์เกม');
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
  const w = scene ? scene.width : chunkW;
  return Math.max(-160, Math.min(w + 160 - W, c));
}

// ─────────────────────────────────────────────────────────────
// แก้เอกสาร
// ─────────────────────────────────────────────────────────────
/** มีอะไรเปลี่ยนแล้ว ผลตรวจเดิมใช้ไม่ได้อีก */
function dirty() {
  save();
  sim = null;
  scrubAt = -1;
  const el = document.getElementById('scrub');
  if (el) el.disabled = true;
}

function pushUndo() {
  undoStack.push(JSON.stringify({ cur, docs }));
  if (undoStack.length > 60) undoStack.shift();
}

function undo() {
  const s = undoStack.pop();
  if (!s) return;
  const o = JSON.parse(s);
  docs = o.docs;
  cur = Math.min(o.cur, docs.length - 1);
  sel = null;
  sim = null;
  scrubAt = -1;
  save();
  refreshAll();
}

function mutate(fn) {
  if (view.refIdx >= 0) return;
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
    snapTo(d, it, x);
  });
  sel = it.id;
  return it;
}

/** ดูดเข้าเกาะจุดกดที่ใกล้ที่สุด ถ้าไม่มีอันไหนใกล้พอก็ปล่อยเป็นพิกัดอิสระ */
const SNAP = 12;

function snapTo(d, it, wantX) {
  const keys = ANCHOR_SET[it.group];
  if (!keys) { it.x = Math.round(wantX); delete it.link; return; }

  let best = null;
  for (const j of d.items) {
    if (j.t !== 'jump' || j.id === it.id) continue;
    const base = xOf(d, j);
    for (const key of keys) {
      const a = ANCHORS[key];
      const cand = CENTERED.has(it.group) ? base + a.v - itemW(it) / 2 : base + a.v;
      const dist = Math.abs(cand - wantX);
      if (dist <= SNAP && (!best || dist < best.dist)) best = { dist, id: j.id, key };
    }
  }

  if (best) { it.link = { id: best.id, key: best.key }; }
  else { delete it.link; it.x = Math.round(wantX); }
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
    x: view.cam + (ev.clientX - r.left) * (W / r.width),
    y: (ev.clientY - r.top) * (H / r.height),
  };
}

function pick(d, p) {
  let best = null;
  for (const it of d.items) {
    const b = itemBox(d, it);
    if (p.x < b.x - 4 || p.x > b.x + b.w + 4 || p.y < b.y - 4 || p.y > b.y + b.h + 4) continue;
    const area = b.w * b.h;
    if (!best || area < best.area) best = { it, area };
  }
  return best && best.it;
}

cv.addEventListener('pointerdown', (ev) => {
  cv.setPointerCapture(ev.pointerId);
  const p = worldAt(ev);
  if (view.refIdx >= 0) { drag = { kind: 'pan', sx: ev.clientX, cam: view.cam }; return; }
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
    const offY = hit.t === 'fishRun' ? p.y - (A.RUN_Y - (hit.rise || 0)) : 0;
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
    snapTo(d, it, p.x - drag.off);
    // ต้องขยับแนวตั้งเกิน LANE_SNAP ก่อนถึงนับว่าตั้งใจลากขึ้นลง — ลากแนวนอนมือสั่นนิดหน่อยแถวไม่หลุดชั้น
    if (it.t === 'fishRun' && (drag.lifting || Math.abs(p.y - drag.sy) > LANE_SNAP)) {
      drag.lifting = true;
      setRise(it, A.RUN_Y - (p.y - drag.offY));
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
  if (drag && drag.kind !== 'pan') { updateCount(); }
  drag = null;
}

cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);

// ── ลากจากกล่องเครื่องมือ ─────────────────────────────
function wireChip(el, kit) {
  el.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    if (view.refIdx >= 0) return;
    let made = null;
    const move = (e) => {
      const r = cv.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) return;
      const wx = view.cam + (e.clientX - r.left) * (W / r.width);
      if (!made) { made = addItem(kit, wx); return; }
      // ระหว่างลากไม่ผ่าน mutate เพราะไม่อยากได้ก้อนย้อนกลับหนึ่งก้อนต่อหนึ่งเฟรม
      const d = doc();
      snapTo(d, byId(d, made.id), wx);
      dirty();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      // กดเฉย ๆ ไม่ได้ลากไปไหน = วางกลางจอให้เลย
      if (!made) addItem(kit, Math.round(view.cam + W / 2));
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
window.addEventListener('keydown', (ev) => {
  const tag = ev.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (ev.key === 'z' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); undo(); return; }
  if (!sel || view.refIdx >= 0) return;

  if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); delItem(sel); return; }

  if (ev.key === 'd' && (ev.ctrlKey || ev.metaKey)) {
    ev.preventDefault();
    const d = doc();
    const src = byId(d, sel);
    const copy = { ...src, id: uid(), x: Math.round(xOf(d, src)) + 60 };
    delete copy.link;
    delete copy.runTo;
    mutate((dd) => dd.items.push(copy));
    sel = copy.id;
    renderInspector();
    return;
  }

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
  if (FOOD_T.has(it.t) && !(it.t === 'fishRun' && it.runTo)) {
    rows.push(num('fN', 'จำนวนเม็ด', it.n, 1, NEEDS_TWO.has(it.t) ? 2 : 1, 40));
  }
  if (it.gap !== undefined) rows.push(num('fGap', 'ระยะห่าง', it.gap, 1, gapMin(it), 120));
  if (it.humps !== undefined) rows.push(num('fHumps', 'จำนวนลูกคลื่น', it.humps, 1, 1, 8));
  rows.push('</div>');

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
    rows.push('<p class="tip">ของทดลอง — ลองได้เฉพาะในหน้านี้ เกมจริงยังไม่รองรับ</p>');
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
  bind('fRise', (v) => { mutate((dd) => { const q = byId(dd, it.id); q.lane = 'custom'; q.rise = Math.max(-20, Math.min(260, Math.round(v))); }); });

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

/** ดึงผังของท่อนเดิมมาเป็นจุดตั้งต้น — ได้เฉพาะของแข็งกับจุดกด ของกินต้องวางใหม่ */
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
  const p = PATTERNS[i](0);
  const d = blankDoc(`คัดมาจากท่อน ${i}`);
  d.width = p.width || chunkW;
  d.kind = PATTERN_META[i].kind;
  d.diff = PATTERN_META[i].diff;
  const marks = p.jumps.map((x) => ({ id: uid(), t: 'jump', group: 'jump', x: Math.round(x) }));
  d.items.push(...marks);
  for (const o of p.obs) {
    const base = { id: uid(), group: 'obs', x: Math.round(o.x) };
    if (o.kind === 'spike') d.items.push({ ...base, t: 'spike' });
    else if (o.kind === 'bar') d.items.push({ ...base, t: 'bar' });
    else d.items.push({ ...base, t: 'crate', rows: o.rows || 1 });
  }
  for (const q of p.pit) d.items.push({ id: uid(), t: 'pit', group: 'obs', x: Math.round(q.x), w: Math.round(q.w) });
  for (const f of p.fallers || []) {
    d.items.push({ id: uid(), t: 'faller', group: 'sp', x: Math.round(f.x), warn: f.warn === undefined ? FALLER.warnFrames : f.warn });
  }
  for (const h of p.hazards || []) d.items.push({ id: uid(), t: h.kind, group: 'sp', x: Math.round(h.x) });

  // ของที่บังเอิญอยู่ตรงจุดเกาะพอดี ให้เกาะเลย โค้ดที่ export จะได้อ่านเหมือนต้นฉบับ
  for (const it of d.items) if (CENTERED.has(it.group)) snapTo(d, it, it.x);

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
function toCode(d) {
  const names = jumpNames(d);
  const js = d.items.filter((q) => q.t === 'jump').slice().sort((a, b) => xOf(d, a) - xOf(d, b));
  const L = [];
  const idx = PATTERNS.length;

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
    const lifted = (call) => (it.t !== 'fishRun' || !it.rise || it.lane === 'surface' ? call
      : `lift(${call}, ${it.rise})`);
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
      case 'pit': pit.push(`{ x: ${off(e, String(it.w / 2), it)}, w: ${it.w} }`); break;
      case 'fishJump': fish.push(wrap(`fishJump(${e}, ${it.n})`)); break;
      case 'fishDouble': fish.push(wrap(`fishDouble(${e}, ${it.n})`)); break;
      case 'arcMid': fish.push(wrap(`arcMid(${e}, ${it.n})`)); break;
      case 'arcHigh': fish.push(wrap(`arcHigh(${e}, ${it.n})`)); break;
      case 'fishWave': fish.push(wrap(`fishWave(${e}, ${it.n}, ${it.gap}, ${it.humps})`)); break;
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
  if (plats.length) body.push(`      // (ทดลอง ยังไม่รองรับในเกม) platforms: [${plats.join(', ')}],`);
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

  return { code: L.join('\n'), meta, idx, experimental: plats.length > 0 };

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
  for (const kit of KIT) {
    const el = document.createElement('div');
    el.className = 'chip' + (kit.wide ? ' wide' : '');
    el.innerHTML = `${kit.label}<em>${kit.sub}</em>`;
    document.getElementById(map[kit.pal]).appendChild(el);
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
  view.cam = clampCam(view.cam);
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
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
stagePick.onchange = (e) => { view.stage = Number(e.target.value); };

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
  const blob = new Blob([JSON.stringify(doc(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (doc().name || 'chunk').replace(/[\\/:*?"<>|]/g, '_') + '.json';
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

// ── กล่องโค้ด ────────────────────────────────────────
const modal = document.getElementById('codeModal');

document.getElementById('showCode').onclick = () => {
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
    (out.experimental
      ? '// ⚠ ท่อนนี้มีพื้นเหยียบซึ่งเป็นของทดลอง — เกมจริงยังไม่รองรับ\n' +
        '//   ถ้าวางลงไฟล์ตอนนี้ แมวจะวิ่งทะลุเนิน/พื้นลอย และหลุมใต้พื้นลอยจะกลายเป็นกับดัก\n\n'
      : '') +
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
  navigator.clipboard.writeText(JSON.stringify(doc()))
    .then(() => flash('คัดลอก JSON แล้ว'));
};

function flash(msg) {
  const el = document.getElementById('copyMsg');
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 1600);
}

// ─────────────────────────────────────────────────────────────
load();
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
    get sim() { return sim; },
    doc, build, toCode, simulate, staticIssues, joinIssues, runCheck, addItem, KIT, A,
  };
}
