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
import { GROUND_Y, VIEW, LEVEL, BODY, SPEED, PLAYER_X, PHYSICS } from '../config.js';
import { AUTHOR, PATTERNS, PATTERN_META } from '../level.js';
import { STAGES } from '../stages.js';
import { drawSky, drawHills, drawGround } from '../render/background.js';
import { drawObstacles, drawTreats, drawPlayer } from '../render/entities.js';
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
  arc:  ['AT'],
  jump: ['DOUBLE', 'JUMP_SPAN', 'DBL_SPAN'],
};

// ─────────────────────────────────────────────────────────────
// กล่องเครื่องมือ
// group บอกว่าชิ้นนั้นเกาะจุดกดแบบไหน และ export เป็นโค้ดท่าไหน
// ─────────────────────────────────────────────────────────────
const KIT = [
  { t: 'jump', group: 'jump', pal: 'mark', label: 'จุดกด', sub: 'กระโดด 1 ครั้ง' },

  { t: 'spike', group: 'obs', pal: 'obs', label: 'หนาม', sub: `${spike.w}×${spike.h}` },
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
  if (it.t === 'bar') return bar.w;
  if (it.t === 'crate') return crate.w;
  if (it.t === 'pit') return it.w;
  return 0;
}

function byId(d, id) { return d.items.find((q) => q.id === id); }

/** x จริงของชิ้นหนึ่ง — ตามจุดเกาะถ้ามี depth กันลูกโซ่วนกลับมาหาตัวเอง */
function xOf(d, it, depth = 0) {
  if (it.link && depth < 4) {
    const j = byId(d, it.link.id);
    if (j && j.t === 'jump') {
      const a = ANCHORS[it.link.key] || ANCHORS.AT;
      const base = xOf(d, j, depth + 1);
      // ของแข็งวาง "กึ่งกลางชิ้น" ตรงจุดเกาะ ส่วนของกินกับจุดกดใช้ขอบซ้าย
      return it.group === 'obs' ? base + a.v - itemW(it) / 2 : base + a.v;
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

  for (const it of d.items) {
    const x = xOf(d, it) + off;
    const n = countOf(d, it);
    let made = null;

    switch (it.t) {
      case 'jump': jumps.push(x); break;
      case 'spike': obs.push(tag(A.groundSpike(x), it)); break;
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
      default: break;
    }

    if (made) for (const f of made) fish.push(tag(f, it));
  }

  jumps.sort((a, b) => a - b);
  return { obs, pit, fish, jumps };
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

function active() {
  // โหมดดูของเดิม: เอาผลจาก PATTERNS ตรง ๆ ไม่ผ่านเอกสาร
  if (view.refIdx >= 0) {
    const p = PATTERNS[view.refIdx](0);
    return { ...p, width: p.width || chunkW, partial: !!p.partial, readonly: true };
  }
  const d = doc();
  return { ...build(d), width: d.width, partial: !!d.partial, readonly: false };
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

  if (view.grid) drawGrid(cam);
  if (view.arcs) drawArcs(cam, scene.jumps);

  drawObstacles(ctx, scene.obs, cam, st.theme);
  hideEaten();
  drawTreats(ctx, scene.fish, cam, tick);

  if (view.next) drawGhost(cam, scene);
  drawBounds(cam, scene.width);
  drawJumpMarks(cam, scene.jumps);
  if (sim) drawSimMarks(cam);
  if (!scene.readonly) drawSelection(cam);
  drawCat(cam);

  drawStrip();
  requestAnimationFrame(draw);
}

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
  const sc = view.refIdx >= 0 ? active() : { ...build(d), width: d.width, partial: !!d.partial };
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

  const frames = [];
  const missedPress = [];
  const clear = new Map();      // ชิ้น → ระยะที่ลอยพ้นน้อยที่สุด
  let death = null;
  const endX = sc.width + 240;

  for (let f = 0; f < 5000 && cx < endX && !death; f++) {
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
    slideHeld = bars.some((b) => cx > b.x - 70 && cx < b.x + b.w + BODY.standW / 2 + 12);
    sliding = slideHeld && onGround;

    const h = sliding ? BODY.slideH : BODY.standH;
    const bw = sliding ? BODY.slideW : BODY.standW;
    const box = { x: cx - bw / 2, y: y - h, w: bw, h };

    frames.push({ cx, y, vy, onGround, sliding });

    // 3) ชนอะไรหรือยัง
    for (const o of solids) {
      if (box.x < o.x + o.w && o.x < box.x + box.w && box.y < o.y + o.h && o.y < box.y + box.h) {
        death = { at: Math.round(cx), what: o.kind, frame: f, box };
        break;
      }
      // ระยะลอยพ้น: นับเฉพาะตอนอยู่เหนือชิ้นนั้นจริง ๆ
      if (o.kind !== 'bar' && box.x < o.x + o.w && o.x < box.x + box.w) {
        const gap = o.y - (box.y + box.h);
        if (gap >= 0) clear.set(o, Math.min(clear.has(o) ? clear.get(o) : Infinity, gap));
      }
    }
    if (death) break;

    if (y > H + 100) { death = { at: Math.round(cx), what: 'pit', frame: f, box }; break; }

    // 4) เดินหน้าหนึ่งเฟรม
    cx += SPEED.run;
    vy += PHYSICS.gravity;
    y += vy;

    const overPit = sc.pit.some((p) => cx > p.x + 6 && cx < p.x + p.w - 6);
    const crossed = y - vy <= GROUND_Y;
    if (!overPit && y >= GROUND_Y && crossed) {
      y = GROUND_Y; vy = 0; onGround = true; jumpsUsed = 0;
    } else {
      onGround = false;
      if (jumpsUsed === 0) jumpsUsed = 1;   // เดินตกหลุม = เสียสิทธิ์กระโดดแรก
    }
  }

  // 5) เก็บของกิน — เดินย้อนทุกเฟรมเทียบกับทุกเม็ด ใช้ระยะเดียวกับในเกม
  //    เก็บ "เฟรมที่เก็บได้" ไว้ด้วย ตอนเลื่อนดูจะได้ซ่อนของที่กินไปแล้วเหมือนเกมจริง
  const missed = [];
  const eatAt = [];
  sc.fish.forEach((t, i) => {
    const pad = t.r + 22;
    const at = frames.findIndex((p) => {
      const hh = p.sliding ? BODY.slideH : BODY.standH;
      return Math.hypot(p.cx - t.x, (p.y - hh / 2) - t.y) < pad;
    });
    eatAt[i] = at < 0 ? Infinity : at;
    if (at < 0) missed.push(t);
  });

  return {
    frames, missed, eatAt, death, missedPress,
    total: sc.fish.length,
    got: sc.fish.length - missed.length,
    clear,
    scene: sc,
  };
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
  const sc = view.refIdx >= 0 ? active() : { ...build(doc()), width: doc().width, partial: !!doc().partial };
  sim = simulate(doc());
  const statics = staticIssues(sc);
  const join = joinIssues(sc);

  const rows = [];
  if (sim.death) {
    const what = sim.death.what === 'pit' ? 'ตกหลุม'
      : sim.death.what === 'bar' ? 'ชนคาน'
        : sim.death.what === 'spike' ? 'ชนหนาม' : 'ชนลัง';
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

  if (sim.missedPress.length) {
    rows.push(`<span class="warn">จุดกดที่ใช้ไม่ได้: x=${sim.missedPress.join(', ')} — กระโดดครบสองครั้งไปแล้วยังไม่แตะพื้น</span>`);
  }

  const bad = statics.filter((s) => s.bad);
  const warn = statics.filter((s) => !s.bad);
  if (bad.length) rows.push('<b class="bad">ผิดกฎ</b><ul>' + bad.map((s) => `<li>${s.msg}</li>`).join('') + '</ul>');
  if (warn.length) rows.push('<b class="warn">ควรดูอีกที</b><ul>' + warn.map((s) => `<li>${s.msg}</li>`).join('') + '</ul>');

  if (join.after.length || join.before.length) {
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
      const cand = it.group === 'obs' ? base + a.v - itemW(it) / 2 : base + a.v;
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
    drag = { kind: 'move', id: hit.id, off: p.x - xOf(d, hit) };
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
    dirty();
    renderInspector();
    return;
  }

  if (drag.kind === 'resize') {
    const left = xOf(d, it);
    if (it.t === 'pit') it.w = Math.max(40, Math.round(p.x - left));
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

  const kit = KIT.find((k) => k.t === it.t && (k.rows === undefined || k.rows === it.rows));
  const rows = [];
  rows.push(`<p class="pill">${kit ? kit.label : it.t} · x = ${Math.round(xOf(d, it))}</p>`);

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
  if (it.t === 'pit') rows.push(num('fW', 'กว้าง', it.w, 2, 40, 600));
  if (FOOD_T.has(it.t) && !(it.t === 'fishRun' && it.runTo)) {
    rows.push(num('fN', 'จำนวนเม็ด', it.n, 1, NEEDS_TWO.has(it.t) ? 2 : 1, 40));
  }
  if (it.gap !== undefined) rows.push(num('fGap', 'ระยะห่าง', it.gap, 1, 16, 80));
  if (it.humps !== undefined) rows.push(num('fHumps', 'จำนวนลูกคลื่น', it.humps, 1, 1, 8));
  rows.push('</div>');

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
  bind('fW', (v) => mutate((dd) => { byId(dd, it.id).w = Math.max(40, v); }));
  bind('fN', (v) => mutate((dd) => { byId(dd, it.id).n = Math.max(1, v); }));
  bind('fGap', (v) => mutate((dd) => { byId(dd, it.id).gap = Math.max(16, v); }));
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

  // ของที่บังเอิญอยู่ตรงจุดเกาะพอดี ให้เกาะเลย โค้ดที่ export จะได้อ่านเหมือนต้นฉบับ
  for (const it of d.items) if (it.group === 'obs') snapTo(d, it, it.x);

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

  for (const it of d.items) {
    const e = anchorExpr(d, it, names, 'x');
    switch (it.t) {
      case 'spike': obs.push(`groundSpike(${off(e, 'spike.w / 2', it)})`); break;
      case 'bar': obs.push(`lowBar(${off(e, 'bar.w / 2', it)})`); break;
      case 'crate': obs.push(`crateStack(${off(e, 'crate.w / 2', it)}, ${it.rows})`); break;
      case 'pit': pit.push(`{ x: ${off(e, String(it.w / 2), it)}, w: ${it.w} }`); break;
      case 'fishJump': fish.push(`...fishJump(${e}, ${it.n})`); break;
      case 'fishDouble': fish.push(`...fishDouble(${e}, ${it.n})`); break;
      case 'arcMid': fish.push(`...arcMid(${e}, ${it.n})`); break;
      case 'arcHigh': fish.push(`...arcHigh(${e}, ${it.n})`); break;
      case 'fishWave': fish.push(`...fishWave(${e}, ${it.n}, ${it.gap}, ${it.humps})`); break;
      case 'fishLow': fish.push(`...fishLow(${e}, ${it.n}, ${it.gap})`); break;
      case 'fishRun':
        if (it.runTo && names.has(it.runTo)) {
          fish.push(`...fishRunTo(${e}, ${names.get(it.runTo)}${it.gap === 34 ? '' : ', ' + it.gap})`);
        } else {
          fish.push(`...fishRun(${e}, ${countOf(d, it)}, ${it.gap})`);
        }
        break;
      default: break;
    }
  }

  body.push(`      obs: [${obs.join(', ')}],`);
  body.push(`      pit: [${pit.join(', ')}],`);
  if (fish.length <= 2) body.push(`      fish: [${fish.join(', ')}],`);
  else body.push('      fish: [', ...fish.map((f) => `        ${f},`), '      ],');
  body.push(`      jumps: [${js.map((j) => names.get(j.id)).join(', ')}],`);
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
  const map = { mark: 'kitMark', obs: 'kitObs', food: 'kitFood' };
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
  updateCount();
}

function updateCount() {
  const d = doc();
  const sc = build(d);
  document.getElementById('docCount').textContent =
    `จุดกด ${sc.jumps.length} · สิ่งกีดขวาง ${sc.obs.length} · หลุม ${sc.pit.length} · ของกิน ${sc.fish.length} เม็ด`;
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
  PATTERNS.map((_, i) => `<option value="${i}">ท่อน ${i} · ${PATTERN_META[i].kind} ${PATTERN_META[i].diff}</option>`).join('');
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
